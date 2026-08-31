/* ══════════════════════════════════════════════════════════════════════
   REGRESSION · apa-admin-guard.js path matching under cleanUrls
   ──────────────────────────────────────────────────────────────────────
   vercel.json sets "cleanUrls": true, so the browser is at /auth, never
   /auth.html. The guard's ALLOW list was written in .html and therefore
   matched nothing in production: every operator page — the support desk
   included — was hijacked back to the console. Clicking "Sign in" on the
   support desk gate went to /auth, the guard fired, and the operator was
   dumped on /admin. An endless loop with no way through.

   The fix is that path() canonicalises to an extension-free form. These
   cases pin both halves of the contract: operator surfaces must survive
   BOTH URL spellings, and consumer pages must still be taken over. A
   guard that lets an admin browse /checkout is as broken as one that
   traps them out of the desk.
══════════════════════════════════════════════════════════════════════ */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/* Lift the real functions out of the shipped file rather than restating
   them. A test that carries its own copy of the logic passes forever. */
function loadGuardRouting() {
  const src = readFileSync(new URL('../apa-admin-guard.js', import.meta.url), 'utf8');

  const allowBlock = src.match(/var ALLOW = \[[\s\S]*?\];/);
  const pathFn     = src.match(/function path\(\) \{[\s\S]*?\n {2}\}/);
  const allowedFn  = src.match(/function allowed\(\) \{[\s\S]*?\n {2}\}/);

  assert.ok(allowBlock, 'could not find ALLOW in apa-admin-guard.js');
  assert.ok(pathFn,     'could not find path() in apa-admin-guard.js');
  assert.ok(allowedFn,  'could not find allowed() in apa-admin-guard.js');

  const fakeGlobal = { location: { pathname: '/' } };
  const build = new Function('global', `
    ${allowBlock[0]}
    ${pathFn[0]}
    ${allowedFn[0]}
    return { path: path, allowed: allowed };
  `);
  return { ...build(fakeGlobal), fakeGlobal };
}

const OPERATOR_SURFACES = [
  '/admin', '/auth', '/support-console',
  '/ambassadors', '/ambassador-dashboard', '/offline',
];

const CONSUMER_SURFACES = [
  '/', '/index.html', '/apartments', '/checkout',
  '/dashboard', '/nairobi-apartments', '/rides', '/flights',
];

test('operator surfaces survive the cleanUrls spelling', () => {
  const g = loadGuardRouting();
  for (const p of OPERATOR_SURFACES) {
    g.fakeGlobal.location.pathname = p;
    assert.equal(g.allowed(), true, `${p} must not be hijacked to the console`);
  }
});

test('operator surfaces survive the legacy .html spelling', () => {
  const g = loadGuardRouting();
  for (const p of OPERATOR_SURFACES) {
    g.fakeGlobal.location.pathname = p + '.html';
    assert.equal(g.allowed(), true, `${p}.html must not be hijacked to the console`);
  }
});

test('matching is case-insensitive and tolerates a trailing slash', () => {
  const g = loadGuardRouting();
  for (const p of ['/Auth', '/SUPPORT-CONSOLE', '/support-console/', '/admin/']) {
    g.fakeGlobal.location.pathname = p;
    assert.equal(g.allowed(), true, `${p} must resolve to an allowed operator surface`);
  }
});

test('consumer surfaces are still taken over', () => {
  const g = loadGuardRouting();
  for (const p of CONSUMER_SURFACES) {
    g.fakeGlobal.location.pathname = p;
    assert.equal(g.allowed(), false, `${p} must still bounce an admin to the console`);
  }
});

test('the console target is a clean URL, not a redirect hop', () => {
  const src = readFileSync(new URL('../apa-admin-guard.js', import.meta.url), 'utf8');
  const m = src.match(/var CONSOLE_PAGE = '([^']+)'/);
  assert.ok(m, 'CONSOLE_PAGE not found');
  assert.ok(!m[1].endsWith('.html'),
    'CONSOLE_PAGE ends in .html — cleanUrls will 308 it on every takeover');
});
