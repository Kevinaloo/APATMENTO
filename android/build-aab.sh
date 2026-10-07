#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
#  CABANA · ANDROID APP BUNDLE
#  ──────────────────────────────────────────────────────────────────
#  Builds the Play Store bundle from android/twa-manifest.json with
#  Bubblewrap, then refuses to hand it over unless it is the bundle we
#  meant to ship:
#
#    · location and notification permissions are declared (location
#      delegation is what makes Android, not Chrome, own the location
#      permission and list it under Apps → Cabana → Permissions)
#    · the version code is the one in twa-manifest.json
#    · it is signed by the Play upload key, not some other keystore
#    · it clears Play Console's pre-launch recommendations: edge-to-edge
#      through android-browser-helper 2.7 instead of the system bar
#      colour APIs Android 15 deprecated, no orientation lock on large
#      screens, R8 optimisation with resource shrinking, and Android
#      Gradle Plugin 9 (see modernize-project.mjs)
#
#  Usage
#    ANDROID_KEYSTORE=/path/to/signing.keystore \
#    BUBBLEWRAP_KEYSTORE_PASSWORD=… BUBBLEWRAP_KEY_PASSWORD=… \
#    android/build-aab.sh [output-dir]
#
#  Optional
#    ANDROID_KEY_ALIAS      default: alias in twa-manifest.json
#    ANDROID_SDK_ROOT_DIR   where to keep the SDK (default ~/.cabana-android-sdk)
#    JAVA_HOME              must be a JDK 17 (Bubblewrap requires it)
#    SKIP_SIGNER_CHECK=1    for test builds signed with a throwaway key
# ════════════════════════════════════════════════════════════════════
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST="$HERE/twa-manifest.json"
OUT="${1:-$HERE/dist}"
BUBBLEWRAP_VERSION="1.25.0"
BUILD_TOOLS="36.1.0"
PLATFORM="android-36"
CMDLINE_TOOLS_ZIP="commandlinetools-linux-13114758_latest.zip"
SDK="${ANDROID_SDK_ROOT_DIR:-$HOME/.cabana-android-sdk}"

die() { echo "✗ $*" >&2; exit 1; }
say() { echo "▸ $*"; }

[ -f "$MANIFEST" ] || die "android/twa-manifest.json is missing"
[ -n "${ANDROID_KEYSTORE:-}" ] && [ -f "$ANDROID_KEYSTORE" ] || die "Set ANDROID_KEYSTORE to the upload keystore (signing.keystore from PWABuilder)"
[ -n "${BUBBLEWRAP_KEYSTORE_PASSWORD:-}" ] && [ -n "${BUBBLEWRAP_KEY_PASSWORD:-}" ] || die "Set BUBBLEWRAP_KEYSTORE_PASSWORD and BUBBLEWRAP_KEY_PASSWORD"

JAVA_HOME="${JAVA_HOME:-}"
if [ -z "$JAVA_HOME" ] || ! grep -q 'JAVA_VERSION="17' "$JAVA_HOME/release" 2>/dev/null; then
  for j in /usr/lib/jvm/java-17-openjdk-amd64 /usr/lib/jvm/temurin-17-jdk-amd64 /usr/lib/jvm/java-17-openjdk; do
    if grep -q 'JAVA_VERSION="17' "$j/release" 2>/dev/null; then JAVA_HOME="$j"; break; fi
  done
fi
grep -q 'JAVA_VERSION="17' "$JAVA_HOME/release" 2>/dev/null || die "Bubblewrap needs JDK 17. Point JAVA_HOME at one."
export JAVA_HOME

read_manifest() { node -e "const m=require(process.argv[1]);console.log(eval('m.'+process.argv[2]) ?? '')" "$MANIFEST" "$1"; }
PACKAGE="$(read_manifest packageId)"
VERSION_CODE="$(read_manifest appVersionCode)"
VERSION_NAME="$(read_manifest appVersionName)"
ALIAS="${ANDROID_KEY_ALIAS:-$(read_manifest signingKey.alias)}"
UPLOAD_SHA256="$(node -e "const m=require(process.argv[1]);const f=(m.fingerprints||[]).find(x=>/upload key/i.test(x.name));console.log(f?f.value:'')" "$MANIFEST")"

# ── Android SDK: command-line tools, one platform, one build-tools ──
if [ ! -x "$SDK/build-tools/$BUILD_TOOLS/aapt2" ] || [ ! -d "$SDK/platforms/$PLATFORM" ]; then
  say "Installing Android SDK into $SDK"
  mkdir -p "$SDK"
  if [ ! -x "$SDK/cmdline-tools/latest/bin/sdkmanager" ]; then
    tmp="$(mktemp -d)"
    curl -fsSL -o "$tmp/clt.zip" "https://dl.google.com/android/repository/$CMDLINE_TOOLS_ZIP"
    unzip -q "$tmp/clt.zip" -d "$tmp"
    mkdir -p "$SDK/cmdline-tools"
    rm -rf "$SDK/cmdline-tools/latest"
    mv "$tmp/cmdline-tools" "$SDK/cmdline-tools/latest"
    rm -rf "$tmp"
  fi
  yes | "$SDK/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$SDK" --licenses >/dev/null || true
  "$SDK/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$SDK" "platforms;$PLATFORM" "build-tools;$BUILD_TOOLS" "platform-tools" >/dev/null
fi
# Bubblewrap looks for the SDK's tools under <sdk>/bin.
ln -sfn cmdline-tools/latest/bin "$SDK/bin"
ln -sfn cmdline-tools/latest/lib "$SDK/lib"

mkdir -p "$HOME/.bubblewrap"
node -e "require('fs').writeFileSync(process.argv[1], JSON.stringify({jdkPath:process.argv[2],androidSdkPath:process.argv[3]}))" \
  "$HOME/.bubblewrap/config.json" "$JAVA_HOME" "$SDK"

# ── Generate and build in a scratch directory ──────────────────────
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
cp "$MANIFEST" "$WORK/twa-manifest.json"
BW=(npx --yes "@bubblewrap/cli@$BUBBLEWRAP_VERSION")

say "Generating the Android project for $PACKAGE $VERSION_NAME ($VERSION_CODE)"
( cd "$WORK" && "${BW[@]}" update --skipVersionUpgrade --manifest=./twa-manifest.json )
node "$HERE/modernize-project.mjs" "$WORK"

say "Building and signing"
( cd "$WORK" && "${BW[@]}" build --skipPwaValidation --manifest=./twa-manifest.json \
    --signingKeyPath="$ANDROID_KEYSTORE" --signingKeyAlias="$ALIAS" )

AAB="$WORK/app-release-bundle.aab"
APK="$WORK/app-release-signed.apk"
[ -f "$AAB" ] && [ -f "$APK" ] || die "Bubblewrap did not produce a bundle"

# ── Release checks ─────────────────────────────────────────────────
AAPT2="$SDK/build-tools/$BUILD_TOOLS/aapt2"
PERMS="$("$AAPT2" dump permissions "$APK")"
for p in android.permission.POST_NOTIFICATIONS android.permission.ACCESS_FINE_LOCATION android.permission.ACCESS_COARSE_LOCATION; do
  grep -q "name='$p'" <<<"$PERMS" || die "The build does not declare $p"
done
BADGING="$("$AAPT2" dump badging "$APK")"
grep -q "package: name='$PACKAGE' versionCode='$VERSION_CODE' versionName='$VERSION_NAME'" <<<"$BADGING" \
  || die "Package or version mismatch: $(head -1 <<<"$BADGING")"
grep -q "targetSdkVersion:'36'" <<<"$BADGING" || die "targetSdkVersion is not 36"
"$AAPT2" dump resources "$APK" | grep -A1 'string/orientation$' | grep -q '"default"' \
  || die "The app locks its orientation. Android 16 ignores that on tablets and foldables; set orientation to default"

META="$WORK/bundle-metadata"
unzip -qo "$AAB" 'BUNDLE-METADATA/*' -d "$META"
grep -q '^androidGradlePluginVersion=9\.' "$META/BUNDLE-METADATA/com.android.tools.build.gradle/app-metadata.properties" \
  || die "The bundle was not built with Android Gradle Plugin 9"
node -e "const o=require(process.argv[1]).options; process.exit(o.isOptimizationsEnabled && o.isShrinkingEnabled ? 0 : 1)" \
  "$META/BUNDLE-METADATA/com.android.tools/r8.json" || die "R8 optimisation or shrinking is off"

SIGNER="$(keytool -printcert -jarfile "$AAB" 2>/dev/null | awk '/SHA256:/{print $2; exit}')"
[ -n "$SIGNER" ] || die "The bundle is not signed"
if [ "${SKIP_SIGNER_CHECK:-0}" != "1" ]; then
  [ "$SIGNER" = "$UPLOAD_SHA256" ] || die "Signed with $SIGNER, but Play expects the upload key $UPLOAD_SHA256"
fi

mkdir -p "$OUT"
cp "$AAB" "$OUT/cabana-$VERSION_NAME-$VERSION_CODE.aab"
cp "$APK" "$OUT/cabana-$VERSION_NAME-$VERSION_CODE.apk"
echo
echo "✓ cabana-$VERSION_NAME-$VERSION_CODE.aab"
echo "  package      $PACKAGE"
echo "  version      $VERSION_NAME ($VERSION_CODE)"
echo "  permissions  notifications, precise + approximate location"
echo "  platform     edge-to-edge, any orientation, R8 optimised, AGP 9"
echo "  signed by    $SIGNER"
echo "  output       $OUT"
