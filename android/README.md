# Cabana for Android

The Play Store app (`africa.cabana.app`) is a Trusted Web Activity: Chrome
renders cabana.africa full screen inside an app that Android treats as
Cabana's own. Two things decide whether it feels like a native app:

| What | Where it lives | If it is wrong |
|---|---|---|
| The site vouches for every certificate Play signs the app with | `/.well-known/assetlinks.json` | The app opens with an address bar, like a browser tab |
| The bundle is built with notification **and location** delegation | `android/twa-manifest.json` | Android lists only Notifications under Apps → Cabana → Permissions, and location stays a Chrome permission |

`tests/android-release.test.mjs` keeps the two files in step.

## Why the Play build showed an address bar

Play re-signs every app it delivers with the **app signing key**, not the
upload key the bundle was signed with. Chrome only hides the address bar
when `assetlinks.json` lists the certificate the installed app actually
carries. The site lists the app signing certificates, the hybrid
certificates and the upload key, and Google's Digital Asset Links API
confirms the link:

```
https://digitalassetlinks.googleapis.com/v1/assetlinks:check?source.web.site=https://cabana.africa&relation=delegate_permission/common.handle_all_urls&target.android_app.package_name=africa.cabana.app&target.android_app.certificate.sha256_fingerprint=24:3E:36:4C:FB:5F:AA:6B:F2:79:06:40:5B:D9:F9:12:D4:DC:EE:3E:5B:DC:33:35:2D:53:D9:90:15:D9:3E:CF
→ { "linked": true }
```

The app installed from Chrome is a different thing: a WebAPK that Chrome
signs and verifies itself, which is why it never had the problem.

**Before every release, confirm in Play Console → Test and release →
App integrity → App signing** that the *App signing key certificate*
SHA-256 is one of the fingerprints in `assetlinks.json`. If Play shows a
different one, add it to both `assetlinks.json` and the `fingerprints`
list in `twa-manifest.json`, deploy the site, then release.

## Permissions

| Permission | How Cabana gets it |
|---|---|
| Notifications | Android permission, declared by the app. Asked on first launch with Cabana's explanation first (`cabana-permit.js`). |
| Location (precise and approximate) | Android permission through location delegation. Asked on first launch with the same explanation; the permissions gate keeps signed-in members on it until it is on. |
| Camera, microphone | Asked by Chrome at the moment a page uses them (video calls, scanning). They are browser permissions in a TWA; declaring them in the app would not change who asks. |
| Photos and files | None needed. Upload buttons open Android's own photo and file pickers, which need no permission. Do **not** add `READ_MEDIA_IMAGES` / `READ_MEDIA_VIDEO`: Google Play only allows them for apps whose core purpose is a gallery or editor, and asks for a declaration that would be rejected. |

## Building a release

Bump `appVersionCode` (and `appVersionName`/`appVersion`) in
`twa-manifest.json` for every upload. Play rejects a version code it has
seen before, on any track. Versions 1 to 3 are already on Play (3, `1.1.1`, is in production).

### Option A: GitHub Actions (recommended)

1. Add three repository secrets (Settings → Secrets and variables → Actions):
   - `ANDROID_KEYSTORE_BASE64`: `base64 -w0 signing.keystore` (the
     `signing.keystore` PWABuilder gave you; on macOS `base64 -i signing.keystore`)
   - `ANDROID_KEYSTORE_PASSWORD` and `ANDROID_KEY_PASSWORD`: from
     PWABuilder's `signing-key-info.txt`
2. Actions → **Android app bundle** → Run workflow.
3. Download the `cabana-android-bundle` artifact. It holds
   `cabana-<version>-<code>.aab` for Play and a matching `.apk` for
   sideload testing.

The build fails, rather than producing a bundle, if location or
notification permissions are missing, the version does not match, or the
bundle is not signed with the upload key Play expects.

### Option B: on a computer

Needs Node 22 and JDK 17.

```
ANDROID_KEYSTORE=~/keys/signing.keystore \
BUBBLEWRAP_KEYSTORE_PASSWORD=… BUBBLEWRAP_KEY_PASSWORD=… \
android/build-aab.sh
```

The bundle lands in `android/dist/` (git-ignored).

### Option C: PWABuilder

Package for Android with **the same settings** as `twa-manifest.json`:
package ID `africa.cabana.app`, a version code higher than any already on Play (next: 4), host
`cabana.africa`, start URL `/?utm_source=pwa`, **Notification delegation
on**, **Location delegation on**, monochrome icon
`https://cabana.africa/cabana-badge-96.png`, and *Use mine* for the
signing key with your existing `signing.keystore`. A new key would be
rejected by Play.

PWABuilder cannot apply `modernize-project.mjs`, so its bundle brings
back Play Console's edge-to-edge and R8 warnings. Use it only if
Options A and B are both unavailable.

## Play Console recommendations

Bubblewrap 1.25.0 generates a project that Play Console flags on every
release. `build-aab.sh` runs `modernize-project.mjs` on the generated
project before building, and refuses a bundle that lost any of these
fixes:

| Play Console says | Cause | Fix |
|---|---|---|
| Edge-to-edge may not display for all users | android-browser-helper 2.6.2 never opts in to edge-to-edge | android-browser-helper 2.7.4: `LauncherActivity` calls `WindowCompat.enableEdgeToEdge()` and the splash screen draws under the system bars. The site already pads for the bars with `viewport-fit=cover` and `env(safe-area-inset-*)` |
| Deprecated APIs for edge-to-edge (`setStatusBarColor`, `setNavigationBarColor`, `getStatusBarColor`) | The 2.6.2 splash screen and WebView fallback call them on every Android version | 2.7.4 only calls them on Android 14 and below, where they are not deprecated. Google's own `enableEdgeToEdge()` makes the same calls for those versions, so Play may still list them; that is expected |
| Remove resizability and orientation restrictions (`LauncherActivity.onCreate`) | `orientation: portrait-primary` locked the app to portrait | `orientation: default` in `twa-manifest.json` and `any` in the web manifest. The site is responsive, and the immersive viewer asks for landscape itself |
| R8: optimisation and resource shrinking not enabled | The template sets `minifyEnabled` only | `proguard-android-optimize.txt` and `shrinkResources true`. The bundle drops from 2.8 MB to 2.1 MB |
| Upgrade the Android Gradle plugin to 9.0 or higher | Template pins AGP 8.9.1 on Gradle 8.11 | AGP 9.4.1 on Gradle 9.6.1, with the DSL AGP 9 removed (`lintOptions`, `jcenter()`, `buildDir`, `resValue` off by default) updated |

`minSdkVersion` is 24 (Android 7.0), which android-browser-helper 2.7
requires. Version 3 already declared 24 once its dependencies were
merged, so no phone loses the app.

If a Bubblewrap upgrade changes the template, `modernize-project.mjs`
stops the build and names the line it could not find. Update the
script; do not remove it.

## Releasing on Play

1. Deploy the website first (assetlinks, the Play install buttons and the
   permission flow all live there).
2. Testing → Open testing → Create new release → Upload the `.aab`.
3. Release name: `<version> (<code>)`, for example `1.2.0 (4)`. Release notes, for example:

   ```
   <en-GB>
   • Fills the whole screen, edge to edge, on Android 15 and later
   • Rotates with your phone, tablet or foldable
   • Smaller and faster to start
   </en-GB>
   ```
4. Review the release, then roll out.
5. Play Console → Grow users → Deep links should list `cabana.africa`
   as verified for the new version.

## Checking on a phone

1. Uninstall any Cabana installed from Chrome, and the old test build.
2. Install from the Play testing link.
3. Open Cabana: no address bar, Cabana's explanation, then Android's own
   "Allow Cabana to access this device's location?" and "Allow Cabana to
   send you notifications?" dialogs.
4. Settings → Apps → Cabana → Permissions lists **Location** and
   **Notifications**.
5. Rotate the phone: Cabana turns with it. On Android 15 and later the
   splash screen and pages run under the status and navigation bars
   without anything hidden behind them.
