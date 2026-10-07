/* ═══════════════════════════════════════════════════════════════════
   Android app · contracts the Play Store build depends on
   ─────────────────────────────────────────────────────────────────
   The Play app is a Trusted Web Activity. It opens full screen only if
   cabana.africa vouches for every certificate Play signs it with, and
   Android lists location under the app's permissions only if the
   bundle is built with location delegation. Both fail silently: the
   app still opens, just with an address bar and Chrome's permissions.
   ═══════════════════════════════════════════════════════════════════ */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const read = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const exists = f => existsSync(new URL(`../${f}`, import.meta.url));
const twa = JSON.parse(read('android/twa-manifest.json'));
const web = JSON.parse(read('manifest.json'));
const links = JSON.parse(read('.well-known/assetlinks.json'));

test('the bundle is the Cabana app, with notification and location delegation', () => {
  assert.equal(twa.packageId, 'africa.cabana.app');
  assert.equal(twa.host, 'cabana.africa');
  assert.equal(twa.startUrl, web.start_url, 'the app must launch the same start URL the web manifest declares');
  assert.equal(twa.enableNotifications, true);
  assert.equal(twa.features?.locationDelegation?.enabled, true, 'without it Android never lists location under the app');
  assert.equal(twa.fallbackType, 'customtabs');
  assert.ok(Number.isInteger(twa.appVersionCode) && twa.appVersionCode >= 2, 'version 1 is already on Play');
  assert.equal(twa.appVersion, twa.appVersionName);
});

test('every icon the bundle is built from is served by the site', () => {
  for (const key of ['iconUrl', 'maskableIconUrl', 'monochromeIconUrl']) {
    const u = new URL(twa[key]);
    assert.equal(u.host, 'cabana.africa', key);
    assert.ok(exists(u.pathname.slice(1)), `${key} ${u.pathname} is not in the site`);
  }
  for (const s of twa.shortcuts) {
    assert.ok(exists(new URL(s.url).pathname.slice(1)), `shortcut ${s.url}`);
    assert.ok(exists(new URL(s.chosenIconUrl).pathname.slice(1)), `shortcut icon ${s.chosenIconUrl}`);
  }
});

test('assetlinks.json vouches for every certificate the bundle lists', () => {
  const stmt = links.find(l => l.target?.namespace === 'android_app' && l.target.package_name === twa.packageId);
  assert.ok(stmt, 'assetlinks.json has no statement for the app');
  assert.deepEqual(stmt.relation, ['delegate_permission/common.handle_all_urls']);
  const served = new Set(stmt.target.sha256_cert_fingerprints);
  for (const f of twa.fingerprints) {
    assert.match(f.value, /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/, f.name);
    assert.ok(served.has(f.value), `${f.name} is missing from assetlinks.json`);
  }
  assert.ok(twa.fingerprints.some(f => /upload key/i.test(f.name)), 'the build script checks the signer against the upload key');
  assert.ok(twa.fingerprints.some(f => /play app signing/i.test(f.name)), 'Play-installed apps are signed with the app signing key');
});

test('the build refuses a bundle without the permissions or with the wrong signer', () => {
  const sh = read('android/build-aab.sh');
  for (const p of ['POST_NOTIFICATIONS', 'ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION']) assert.match(sh, new RegExp(p));
  assert.match(sh, /Play expects the upload key/);
  assert.match(read('.github/workflows/android-bundle.yml'), /workflow_dispatch/);
  assert.match(read('.gitignore'), /^\*\.keystore$/m);
  assert.match(read('.vercelignore'), /^android\/$/m);
});

test('Android installs go to Google Play, not a second Chrome-installed app', () => {
  const pwa = read('pwa.js');
  assert.match(pwa, /window\.CabanaPWA = window\.ApatmentoPWA/, 'the install buttons call CabanaPWA');
  assert.match(pwa, /openPlayStore: openPlayStore/);
  assert.match(pwa, /scheme=market;package=com\.android\.vending/);
  assert.match(read('index.html'), /isAndroid && window\.CabanaPWA && window\.CabanaPWA\.openPlayStore/);
  assert.match(read('auth.html'), /env\.isAndroid && window\.CabanaPWA && window\.CabanaPWA\.openPlayStore/);
});

test('every profile is public, with no switch to make it private', () => {
  const page = read('profile.html'), api = read('api/lib/_profiles.js');
  assert.doesNotMatch(page, /data-pref="published"/);
  assert.doesNotMatch(page, /'avatar', 'published'/, 'the studio must not send published');
  assert.doesNotMatch(page, /togglePref/, 'notification rows must not pretend to save');
  assert.match(api, /set\('published', true\)/);
  assert.match(api, /bio: '', published: true, handle/);
  const sql = readdirSync(new URL('../supabase/migrations/', import.meta.url))
    .filter(f => f.endsWith('.sql')).sort().map(f => read('supabase/migrations/' + f));
  const lastCards = sql.filter(s => /function public\.cabana_people_cards/.test(s)).pop();
  assert.match(lastCards, /coalesce\(m\.published, true\)/);
  assert.match(lastCards, /alter column published set default true/);
});
