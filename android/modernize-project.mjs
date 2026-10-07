#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════
//  CABANA · MODERNISE THE GENERATED ANDROID PROJECT
//  ──────────────────────────────────────────────────────────────────
//  Bubblewrap 1.25.0 generates a project on Android Gradle Plugin
//  8.9.1 and android-browser-helper 2.6.2, with R8 optimisation and
//  resource shrinking off. Play Console flags all three on every
//  release. Bubblewrap has no setting for any of them, so build-aab.sh
//  runs this between `bubblewrap update` and `bubblewrap build`:
//
//    · android-browser-helper 2.7.4: LauncherActivity calls
//      WindowCompat.enableEdgeToEdge() and the splash screen draws
//      under the system bars with androidx insets protection, instead
//      of Window.setStatusBarColor / setNavigationBarColor, which
//      Android 15 deprecated. The library only calls those on
//      Android 14 and below now.
//    · R8 with optimisation (proguard-android-optimize.txt) and
//      resource shrinking.
//    · Android Gradle Plugin 9 on Gradle 9, with the DSL the template
//      uses but AGP 9 removed (lintOptions, jcenter, buildDir).
//    · Native permissions: android/LauncherActivity.java replaces the
//      generated launcher. It asks Android for notifications and
//      location before the website opens, instead of waiting for Chrome
//      to hand a request to the app (see the file's header). The manifest
//      also marks GPS and location hardware as optional, so Play does not
//      hide the app from phones without them.
//
//  Every edit must find what it replaces. If a Bubblewrap upgrade
//  changes the template, this fails loudly, rather than shipping a
//  bundle that quietly lost the fixes.
//
//  Usage: node android/modernize-project.mjs <generated-project-dir>
// ════════════════════════════════════════════════════════════════════
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const AGP_VERSION = '9.4.1';
export const GRADLE_VERSION = '9.6.1';
export const BROWSER_HELPER_VERSION = '2.7.4';

const dir = process.argv[2];
if (!dir) {
  console.error('Usage: node android/modernize-project.mjs <generated-project-dir>');
  process.exit(1);
}

function patch(file, edits) {
  const path = join(dir, file);
  let text = readFileSync(path, 'utf8');
  for (const [from, to] of edits) {
    const hits = text.split(from).length - 1;
    if (hits === 0) {
      console.error(`✗ ${file}: expected to find ${JSON.stringify(from)}. Has the Bubblewrap template changed?`);
      process.exit(1);
    }
    text = text.split(from).join(to);
  }
  writeFileSync(path, text);
}

// ── native permissions ─────────────────────────────────────────────
const manifestPath = join(dir, 'app/src/main/AndroidManifest.xml');
const packageName = (readFileSync(manifestPath, 'utf8').match(/<manifest[^>]*\spackage="([^"]+)"/) || [])[1];
if (!packageName) {
  console.error('✗ app/src/main/AndroidManifest.xml has no package attribute. Has the Bubblewrap template changed?');
  process.exit(1);
}
const launcherPath = join(dir, 'app/src/main/java', ...packageName.split('.'), 'LauncherActivity.java');
if (!existsSync(launcherPath) ||
    !/extends\s+com\.google\.androidbrowserhelper\.trusted\.LauncherActivity/.test(readFileSync(launcherPath, 'utf8'))) {
  console.error(`✗ ${launcherPath} is not the Bubblewrap LauncherActivity. Has the template changed?`);
  process.exit(1);
}
writeFileSync(launcherPath,
  readFileSync(new URL('./LauncherActivity.java', import.meta.url), 'utf8').replace(/__PACKAGE__/g, packageName));

patch('app/src/main/AndroidManifest.xml', [
  // ACCESS_FINE_LOCATION implies a GPS requirement unless declared optional.
  ['    <application\n', `    <uses-feature android:name="android.hardware.location" android:required="false" />
    <uses-feature android:name="android.hardware.location.gps" android:required="false" />

    <application
`],
]);

patch('build.gradle', [
  ["classpath 'com.android.tools.build:gradle:8.9.1'", `classpath 'com.android.tools.build:gradle:${AGP_VERSION}'`],
  // JCenter is gone; Gradle 9 removed the jcenter() shortcut.
  ['jcenter()', 'mavenCentral()'],
  ['delete rootProject.buildDir', 'delete rootProject.layout.buildDirectory'],
]);

patch('gradle/wrapper/gradle-wrapper.properties', [
  ['gradle-8.11.1-bin.zip', `gradle-${GRADLE_VERSION}-bin.zip`],
]);

patch('app/build.gradle', [
  ["com.google.androidbrowserhelper:androidbrowserhelper:2.6.2",
   `com.google.androidbrowserhelper:androidbrowserhelper:${BROWSER_HELPER_VERSION}`],
  ['compileSdkVersion 36', 'compileSdk 36'],
  ['minSdkVersion ', 'minSdk '],
  ['targetSdkVersion 36', 'targetSdk 36'],
  [`            minifyEnabled true
`, `            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt')
`],
  ['lintOptions {', 'lint {'],
  // AGP 9 turns resValue off by default; the template declares every
  // string, colour and flag the TWA reads with it.
  [`    buildTypes {
`, `    buildFeatures {
        resValues true
    }
    buildTypes {
`],
]);

// Bubblewrap ships a copy of the web manifest as a raw resource that no
// code references, so resource shrinking would drop it.
if (!existsSync(join(dir, 'app/src/main/res/raw/web_app_manifest.json'))) {
  console.error('✗ app/src/main/res/raw/web_app_manifest.json is missing. Is webManifestUrl set in twa-manifest.json?');
  process.exit(1);
}
writeFileSync(join(dir, 'app/src/main/res/raw/keep.xml'),
  '<?xml version="1.0" encoding="utf-8"?>\n' +
  '<resources xmlns:tools="http://schemas.android.com/tools" tools:keep="@raw/web_app_manifest" />\n');

console.log(`▸ Native permission launcher installed for ${packageName}`);
console.log(`▸ Project on AGP ${AGP_VERSION} / Gradle ${GRADLE_VERSION}, android-browser-helper ${BROWSER_HELPER_VERSION}, R8 optimisation and resource shrinking on`);
