import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

process.env.SUPABASE_URL = 'https://db.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only';
const { default: handler } = await import('../api/rewards.js');
const uid = '00000000-0000-4000-8000-000000000001';
const response = () => ({ headers: {}, setHeader(k,v) { this.headers[k] = v; }, status(v) { this.code = v; return this; }, json(v) { this.body = v; return this; } });

test('welcome uses one atomic grant and verified identity, retaining celebration', async t => {
  const before = globalThis.fetch;
  t.after(() => { globalThis.fetch = before; });
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push(url);
    if (url.endsWith('/auth/v1/user')) return new Response(JSON.stringify({ id: uid }));
    if (url.endsWith('/rpc/cabana_claim_welcome_credit')) {
      assert.deepEqual(JSON.parse(init.body), { p_user: uid, p_points: 200, p_from: '2026-08-17' });
      return new Response(JSON.stringify({ ok: true, already: true, points: 200, balance: 120 }));
    }
    assert.ok(url.endsWith('/rpc/claim_welcome_celebration'));
    return new Response('true');
  };
  const res = response();
  await handler({ method: 'POST', headers: { authorization: 'Bearer test' }, body: { action: 'claim-welcome', user_id: 'forged', points: 9999, celebrate: true } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.balance, 120);
  assert.equal(res.body.celebrate, true);
  assert.equal(calls.length, 3);
});

test('ambiguous welcome write returns safe 503 without balance fallback or replay', async t => {
  const before = globalThis.fetch;
  t.after(() => { globalThis.fetch = before; });
  const calls = [];
  globalThis.fetch = async url => {
    calls.push(url);
    if (url.endsWith('/auth/v1/user')) return new Response(JSON.stringify({ id: uid }));
    return new Response('<html>sensitive upstream detail</html>', { status: 504 });
  };
  const res = response();
  await handler({ method: 'POST', headers: { authorization: 'Bearer test' }, body: { action: 'claim-welcome' } }, res);
  assert.equal(res.code, 503);
  assert.deepEqual(res.body, { error: 'rewards_temporarily_unavailable' });
  assert.equal(calls.length, 2);
});

test('profile repair is additive and atomic welcome is service-only', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20260916073134_production_reliability_and_atomic_welcome.sql', import.meta.url), 'utf8');
  assert.match(sql, /on conflict \(id\) do nothing/);
  assert.doesNotMatch(sql, /raw_user_meta_data|update public\.profiles/i);
  assert.match(sql, /for update/);
  assert.match(sql, /revoke all on function public\.cabana_claim_welcome_credit.*from public, anon, authenticated/);
  assert.ok(sql.indexOf('insert into public.point_transactions') < sql.indexOf('perform public.add_user_points'));
});
