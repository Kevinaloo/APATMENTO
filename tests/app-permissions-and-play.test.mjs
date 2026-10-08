/* ═══════════════════════════════════════════════════════════════════
   The Android app's permissions, and the Google Play links
   ─────────────────────────────────────────────────────────────────
   Two things the Play launch depends on:

   1. Notifications and location are asked by the app itself, on launch.
      Before, the app opened the website and left the request to Chrome
      to pass back to the app. When any link in that chain broke, no
      Android dialog appeared and the site's gate said "Location is
      unavailable" without ever having asked.
   2. Every visitor can reach the Play listing: the footer of every
      page, the sign-in and sign-up screens, the home page, help.
   ═══════════════════════════════════════════════════════════════════ */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const exists = f => existsSync(new URL(`../${f}`, import.meta.url));
const twa = JSON.parse(read('android/twa-manifest.json'));
const PLAY = 'https://play.google.com/store/apps/details?id=africa.cabana.app';
const pages = readdirSync(new URL('../', import.meta.url)).filter(f => f.endsWith('.html'));

// ── the app asks for itself ─────────────────────────────────────────

test('the app asks Android for notifications and location before the website opens', () => {
  const java = read('android/LauncherActivity.java');
  assert.match(java, /extends\s+com\.google\.androidbrowserhelper\.trusted\.LauncherActivity/);
  assert.match(java, /package __PACKAGE__;/, 'the build fills in the package name');
  assert.match(java, /boolean shouldLaunchImmediately\(\)/, 'the website must wait for the permission step');
  assert.match(java, /launchTwa\(\)/, 'and open once it is done');
  for (const p of ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'POST_NOTIFICATIONS']) {
    assert.match(java, new RegExp(`Manifest\\.permission\\.${p}`), p);
  }
  assert.match(java, /requestPermissions\(/);
  assert.match(java, /onRequestPermissionsResult\(/);
});

test('every dialog the app shows lets the member carry on', () => {
  const java = read('android/LauncherActivity.java');
  // Android stops showing its own dialog after two refusals, so the app
  // must be able to send people to Settings; and the phone's own
  // location switch is a separate thing from the permission.
  assert.match(java, /ACTION_APPLICATION_DETAILS_SETTINGS/);
  assert.match(java, /ACTION_LOCATION_SOURCE_SETTINGS/);
  assert.match(java, /ACTION_APP_NOTIFICATION_SETTINGS/);
  assert.match(java, /isLocationEnabled\(\)/);
  // "Not now" opens the website; the site's gate keeps signed-in members on the last step.
  const notNow = java.match(/"Not now"/g) || [];
  assert.ok(notNow.length >= 4, `every dialog needs a way out (found ${notNow.length})`);
});

test('the build installs the launcher and refuses a bundle without it', () => {
  const mod = read('android/modernize-project.mjs');
  assert.match(mod, /LauncherActivity\.java/);
  assert.match(mod, /__PACKAGE__/);
  assert.match(mod, /android\.hardware\.location\.gps" android:required="false"/, 'GPS must be optional or Play hides the app from some phones');
  const sh = read('android/build-aab.sh');
  assert.match(sh, /cabana_native_permissions/, 'the marker the launcher keeps its state under');
  assert.match(sh, /uses-feature-not-required: name='android\.hardware\.location\.gps'/);
  assert.ok(read('android/LauncherActivity.java').includes('"cabana_native_permissions"'));
  assert.ok(twa.appVersionCode >= 5, 'Play has seen 1 to 4; this release needs a new code');
  assert.equal(twa.appVersion, twa.appVersionName);
});

// ── the website's side ──────────────────────────────────────────────

test('one permission surface at a time on the website', () => {
  const pwa = read('pwa.js');
  assert.doesNotMatch(pwa, /prime\(\{ reason: 'default', required: true \}\)/,
    'pwa.js must not open a second location gate on top of cabana-permit.js');
  assert.match(pwa, /requireNotifications/);

  const loc = read('apa-location.js');
  assert.match(loc, /document\.querySelector\('\.cp'\)\) return Promise\.resolve\(false\)/,
    'the plain location gate stands down while the permissions gate is open');

  const permit = read('cabana-permit.js');
  assert.match(permit, /getElementById\('apa-loc-gate'\)/, 'the permissions gate clears a plain gate that was already open');
  assert.match(permit, /_checking = false/, 'check() must be able to run again once it has finished');
});

test('the location gate says what actually went wrong', () => {
  const loc = read('apa-location.js');
  assert.match(loc, /code === 2/, 'POSITION_UNAVAILABLE is its own case');
  assert.match(loc, /Still looking for you/, 'a timeout is not "unavailable"');
  assert.match(loc, /Settings → Apps → Cabana → Permissions → Location/);
  assert.match(loc, /backFromSettings/, 'it retries by itself when the member returns from Settings');
  const permit = read('cabana-permit.js');
  assert.match(permit, /g === 'slow'/, 'a fix that never arrives gets steps, not the same button again');
});

// ── Google Play on the website ──────────────────────────────────────

test('the badge is Google\'s artwork, hidden where it is no use', () => {
  const svg = read('assets/app/google-play-badge.svg');
  assert.match(svg, /<svg/);
  assert.ok(exists('assets/app/cabana-play-qr.svg'));
  const css = read('cabana-getapp.css');
  assert.match(css, /display-mode:standalone/, 'not inside the installed app');
  assert.match(css, /-webkit-touch-callout:none/, 'not on iPhone, where there is no Android app');
});

test('every standard footer carries the Play badge, once, pointing at the app', () => {
  const footered = pages.filter(f => /<footer class="site-footer"/.test(read(f)));
  assert.ok(footered.length > 300, `expected the full set of footers, found ${footered.length}`);
  for (const f of footered) {
    const html = read(f);
    const marks = html.match(/<!-- CABANA-GETAPP -->/g) || [];
    assert.equal(marks.length, 1, `${f} has ${marks.length} badge blocks`);
    assert.ok(html.includes(`href="${PLAY.replace(/&/g, '&amp;')}&amp;referrer=utm_source%3Dfooter%26utm_medium%3Dweb"`), `${f} links somewhere else`);
    assert.ok(html.includes('/assets/app/google-play-badge.svg'), f);
  }
});

test('the badge generator is idempotent, so seo/run_all.py can run it last', () => {
  const out = execFileSync('python3', ['seo/getapp.py', '--dry'], { cwd: new URL('../', import.meta.url), encoding: 'utf8' });
  assert.match(out, /getapp: 0 footers updated/);
  assert.match(read('seo/run_all.py'), /"getapp\.py"/);
});

test('sign-in, sign-up, the home page and help all offer the app', () => {
  const auth = read('auth.html');
  assert.match(auth, /id="login-getapp"/, 'sign in');
  assert.match(auth, /id="install-step-play"/, 'sign up, where the button is not already a Play button');
  assert.match(auth, /utm_source%3Dsignin/);
  assert.match(auth, /utm_source%3Dsignup/);
  for (const [file, source] of [['index.html', 'home'], ['dashboard.html', 'dashboard'], ['help.html', 'help']]) {
    assert.match(read(file), new RegExp(`utm_source%3D${source}%26`), `${file} (${source})`);
    assert.match(read(file), /\/cabana-getapp\.css/, `${file} loads the badge styles`);
  }
});

test('no Play link on the site points anywhere but the Cabana app', () => {
  for (const f of pages) {
    for (const m of read(f).matchAll(/https:\/\/play\.google\.com\/store\/apps\/details\?id=([a-z0-9._]+)/g)) {
      assert.equal(m[1], 'africa.cabana.app', `${f} links to ${m[1]}`);
    }
  }
});
