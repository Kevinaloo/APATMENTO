/* ══════════════════════════════════════════════════════════════════════
   REGRESSION · /api/ambassadors reaches the ambassador handler
   ──────────────────────────────────────────────────────────────────────
   api/ambassadors.js is in .vercelignore — the Hobby plan counts every
   top-level api/*.js with a default export, and we sit exactly on the
   ceiling of 12. The route is served instead by a vercel.json rewrite
   onto api/rewards.js, which proxies anything carrying _route=ambassadors.

   That rewrite was described in api/ambassadors.js, in api/rewards.js and
   in api/lib/_ambassadors.js, and existed in none of them. Every call to
   /api/ambassadors 404'd at the edge, and the admin console reported its
   generic "Request failed" — which is what an admin saw when they tried
   to invite an ambassador.

   Two things are pinned here.

   The config: the rewrite must exist, because a comment is not a route.

   The behaviour: the proxy must recognise the ambassador route however
   the request arrives. Vercel is expected to merge the caller's query
   with the destination's, but this handler is two hops from the URL the
   browser typed, and a proxy that only works when every hop behaves
   perfectly is a proxy that will 404 again. Each case below reaches the
   ambassador handler and is refused for the RIGHT reason — 401 for a
   missing bearer token, not 404 "Unknown action" and not 405 from the
   rewards POST guard.
══════════════════════════════════════════════════════════════════════ */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

process.env.SUPABASE_URL              ||= 'https://example.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-key';
process.env.SUPABASE_ANON_KEY         ||= 'test-anon-key';

const { default: rewardsHandler } =
  await import(new URL('../api/rewards.js', import.meta.url).href);

function mockRes() {
  const r = { _status: 0, _json: null };
  r.status    = c => { r._status = c; return r; };
  r.json      = b => { r._json = b;   return r; };
  r.end       = () => r;
  r.setHeader = () => {};
  return r;
}

test('vercel.json actually carries the /api/ambassadors rewrite', () => {
  const vc = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const hit = (vc.rewrites || []).find(r => r.source === '/api/ambassadors');
  assert.ok(hit, '/api/ambassadors has no rewrite — every ambassador call will 404');
  assert.match(hit.destination, /_route=ambassadors/,
    'the rewrite must tag the request so api/rewards.js proxies it');
});

test('api/ambassadors.js stays out of the deployed function count', () => {
  const ignored = readFileSync(new URL('../.vercelignore', import.meta.url), 'utf8')
    .split('\n').map(l => l.trim());
  assert.ok(ignored.includes('api/ambassadors.js'),
    'un-ignoring this file pushes the project to 13 functions and the deploy fails');
});

const ARRIVALS = [
  ['query merged, as Vercel normally does', {
    method: 'GET', url: '/api/rewards?_route=ambassadors&action=roster',
    query: { _route: 'ambassadors', action: 'roster' }, headers: {},
  }],
  ['query not merged — _route readable only from the raw URL', {
    method: 'GET', url: '/api/rewards?_route=ambassadors&action=roster',
    query: {}, headers: {},
  }],
  ['the public path survives to the function, no query object at all', {
    method: 'GET', url: '/api/ambassadors?action=roster',
    query: {}, headers: {},
  }],
  ['the invite POST the admin console sends', {
    method: 'POST', url: '/api/rewards?_route=ambassadors&action=invite',
    query: { _route: 'ambassadors', action: 'invite' }, headers: {},
    body: { email: 'someone@example.com', full_name: 'Someone', region: 'Kenya' },
  }],
];

for (const [label, req] of ARRIVALS) {
  test(`ambassador route recognised: ${label}`, async () => {
    const res = mockRes();
    await rewardsHandler(req, res);

    assert.equal(res._status, 401,
      `expected 401 from the ambassador handler; got ${res._status}. ` +
      `405 means it fell through to the rewards POST guard, ` +
      `404 means ?action= never arrived.`);
    assert.match(String(res._json?.error || ''), /sign in/i);
  });
}

test('a genuine rewards call is not swallowed by the proxy', async () => {
  const res = mockRes();
  await rewardsHandler(
    { method: 'POST', url: '/api/rewards', query: {}, headers: {}, body: {} },
    res,
  );
  assert.equal(res._status, 400, 'a rewards POST with no action should be a 400');
  assert.match(String(res._json?.error || ''), /action required/i);
});
