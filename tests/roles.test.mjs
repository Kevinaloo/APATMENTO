/* ═══════════════════════════════════════════════════════════════════════════
   ROLE SWITCHING · one model, every dashboard
   ─────────────────────────────────────────────────────────────────────────
   Switching used to be a handful of one-way links, each written into a
   different dashboard by a different hand. From the partner board you could
   reach the traveller view and nothing else; "switch to agent" did not exist
   anywhere on the site. This test is what stops it drifting back to that.

     node --test tests/roles.test.mjs
   ═══════════════════════════════════════════════════════════════════════════ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(join(ROOT, f), 'utf8');

/* Load apa-roles.js against a DOM stub. It must not need a real browser to
   answer "which role is this page" or "what roles exist". */
function load(pathname = '/dashboard.html', search = '') {
  const document = {
    getElementById: () => null,
    querySelectorAll: () => [],
    querySelector: () => null,
    createElement: () => ({ }),
    head: { appendChild() {} },
    body: { getAttribute: () => null, appendChild() {} },
    documentElement: { getAttribute: () => null, style: {} },
    readyState: 'complete',
    addEventListener() {},
  };
  const win = { document, location: { pathname, search, href: '' }, console };
  globalThis.document = document;
  new Function('window', read('apa-roles.js'))(win);
  delete globalThis.document;
  return win.ApaRoles;
}

const DASHBOARDS = [
  'dashboard.html',
  'agent-dashboard.html',
  'ambassador-dashboard.html',
  'partner-listings.html',
  'partner-bookings.html',
  'partner-calendar.html',
  'partner-earnings.html',
  'partner-analytics.html',
  'partner-reviews.html',
  'partner-settings.html',
  'partner-agents.html',
  'partner-cabana.html',
];

test('every role the product has is in the model', () => {
  const R = load();
  const keys = R.ROLES.map(r => r.key);
  assert.deepEqual(keys, ['traveller', 'partner', 'agent', 'influencer', 'ambassador']);
});

test('a role you do not have shows the way in, not a dead end', () => {
  const R = load();
  for (const role of R.ROLES) {
    if (role.key === 'traveller') continue;      // everyone is already one
    if (role.inviteOnly) continue;               // see the next test
    assert.ok(role.join, `${role.key} must have a join path for someone who is not one yet`);
    assert.ok(role.joinVerb, `${role.key} needs its own join wording — "Become a influencer" is what concatenation gives you`);
  }
});

test('the ambassador programme is never advertised', () => {
  // Invitation-only. Not greyed out, not "request access" — absent. A door
  // that opens for almost nobody generates support mail and teaches people
  // the product is arbitrary.
  const R = load();
  const amb = R.roleFor('ambassador');
  assert.equal(amb.inviteOnly, true, 'ambassador must be marked invitation-only');
  assert.equal(amb.join, null, 'ambassador must have no self-serve join path');

  const src = read('apa-roles.js');
  assert.match(src, /inviteOnly && !st\[r\.key\]/,
    'both the sheet and the menu must filter out an un-invited invitation-only role');
});

test('the current role is derived correctly on every dashboard', () => {
  assert.equal(load('/dashboard.html', '').current(),                    'traveller');
  assert.equal(load('/dashboard.html', '?role=partner').current(),       'partner');
  assert.equal(load('/partner-listings.html', '').current(),             'partner');
  assert.equal(load('/agent-dashboard.html', '').current(),              'agent');
  assert.equal(load('/agent-dashboard.html', '?mode=influencer').current(), 'influencer');
  assert.equal(load('/ambassador-dashboard.html', '').current(),         'ambassador');
});

test('every dashboard can reach every other one', () => {
  for (const page of DASHBOARDS) {
    const html = read(page);
    assert.match(html, /apa-roles\.js/, `${page} must load the role switcher`);
    assert.ok(/data-apa-roles|ApaRoles\.open\(\)/.test(html),
      `${page} must actually mount or open the switcher, not just load it`);
    /* dashboard.html is the one page that serves two roles — traveller and
       partner — off the same URL, so it cannot declare a static one and
       relies on ?role= instead. Every other page is one thing and says so. */
    if (page !== 'dashboard.html') {
      assert.match(html, /data-apa-role=/,
        `${page} must declare which role it is, or it will not mark the right row as current`);
    }
  }
});

test('the agent read is scoped to the caller', () => {
  // The agents SELECT policy also lets a HOST read the agents representing
  // their listings. An unfiltered limit(1) would hand a host somebody else's
  // row and tell them they are an agent.
  const src = read('apa-roles.js');
  assert.match(src, /from\('agents'\)[\s\S]{0,120}\.eq\('id', uid\)/,
    "the agents read must filter on the caller's own id");
});

test('the view preference is written in one place', () => {
  // "Switch to traveller" used to mean three different things depending on
  // which screen you pressed it from, because each wrote its own flags.
  const src = read('apa-roles.js');
  assert.match(src, /apa-last-role/,  'ApaRoles owns the traveller/partner preference');
  assert.match(src, /apa-amb-view/,   'ApaRoles owns the ambassador view preference');

  for (const page of ['dashboard.html', 'ambassador-dashboard.js']) {
    const s = read(page);
    if (!/apa-amb-view/.test(s)) continue;
    assert.match(s, /ApaRoles/,
      `${page} still writes apa-amb-view without deferring to ApaRoles first`);
  }
});
