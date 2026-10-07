# Cabana Android release settings

Moved to [`android/README.md`](../android/README.md). The build
configuration is now checked in as `android/twa-manifest.json` and built
with `android/build-aab.sh` or the **Android app bundle** GitHub Actions
workflow, so every release has notification and location delegation and
is signed with the Play upload key.
