/* Device heat and battery.
   Google flagged the app for battery/thermal load. These tests pin the
   fixes so they cannot quietly regress: GPS is never left running on a
   browsing guest, frame loops stand down when nobody can see them, and
   repaint-heavy decoration rests on phones. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(join(root, f), 'utf8');

test('GPS is not started just because a page loaded', () => {
  const loc = read('apa-location.js');
  const probe = loc.slice(loc.indexOf('function probe()'), loc.indexOf('function ready()'));
  assert.doesNotMatch(probe, /\bstart\(\)/, 'permission probing must not start a watch');
});

test('a passive location watch is leased and released once a usable fix lands', () => {
  const loc = read('apa-location.js');
  assert.match(loc, /LEASE_MS\s*=\s*40 \* 1000/);
  assert.match(loc, /SETTLED_M\s*=\s*100/);
  assert.match(loc, /if \(!_continuous && fix\.accuracy != null && fix\.accuracy <= SETTLED_M\) halt\(\)/);
  assert.match(loc, /maximumAge: _continuous \? 5000 : 15000/, 'no more maximumAge:0 on a passive watch');
  const watch = loc.slice(loc.indexOf('watchPosition('), loc.indexOf('function halt()'));
  assert.doesNotMatch(watch, /maximumAge: 0/);
});

test('only an online driver holds a continuous watch, and releases it offline', () => {
  const d = read('driver.html');
  assert.match(d, /ApaLocation\.start\(\{ continuous:true \}\)/);
  const off = d.slice(d.indexOf('function goOffline()'));
  assert.match(off.slice(0, 600), /ApaLocation\.stop\(\)/);
});

test('hiding the tab releases GPS but a live driver resumes on return', () => {
  const loc = read('apa-location.js');
  assert.match(loc, /visibilityState === 'hidden'\) halt\(\)/);
  assert.match(loc, /_continuous && permission\(\) === 'granted'\) start\(\{ continuous: true \}\)/);
});

test('frame loops stop scheduling frames when nobody can see them', () => {
  const sp = read('cabana-tours-spotlight.js');
  assert.match(sp, /function wake\(\)/);
  assert.match(sp, /if \(!seeing\(\)\) \{/);
  const globe = read('cabana-globe.js');
  assert.match(globe, /hidden \? 1000 : 400/, 'the idle drift polls slowly while hidden');
  assert.match(globe, /if \(self\.paused\) \{ self\._raf = 0; return; \}/);
});

test('decorative loops are paced to ~30 fps with a timer gap, not a 60 fps rAF', () => {
  assert.match(read('cabana-tours-spotlight.js'), /setTimeout\(function \(\) \{ S\.slow = 0; if \(!S\.dead\) S\.raf = requestAnimationFrame\(loop\); \}, 20\)/);
  assert.match(read('cabana-globe.js'), /\}, 20\);\n    \}\n    this\._raf = window\.requestAnimationFrame\(frame\)/);
  assert.match(read('cabana-credit.js'), /setTimeout\(function \(\) \{ requestAnimationFrame\(tick\); \}, 50\)/);
});

test('cabana-calm.js pauses off-screen and repaint-heavy infinite animations, with no polling', () => {
  const c = read('cabana-calm.js');
  assert.match(c, /iterations === Infinity/);
  assert.match(c, /SAFE = \/\^\(transform\|translate\|rotate\|scale\|opacity/);
  assert.match(c, /\(pointer: coarse\)/);
  assert.match(c, /animationstart/);
  assert.doesNotMatch(c, /setInterval|requestAnimationFrame/, 'the guard itself must not loop');
});

test('every page that ships the shared lifecycle script also ships the calm guard', () => {
  const missing = readdirSync(root).filter(f => f.endsWith('.html'))
    .filter(f => { const h = read(f); return h.includes('src="/cabana-lifecycle.js') && !h.includes('src="/cabana-calm.js'); });
  assert.deepEqual(missing, []);
});
