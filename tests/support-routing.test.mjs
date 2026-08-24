/* ══════════════════════════════════════════════════════════════════════
   Cabana · support & call routing
   tests/support-routing.test.mjs

   Two doors that must not be left ajar.

   ACCESS. The desk operations read every guest's conversation and the
   bookings behind it. An anonymous caller, or a signed-in guest who
   simply names an agent op, must be refused before any of that is
   touched — not filtered afterwards.

   CORS. The trust router used to stamp `Access-Control-Allow-Origin: *`
   on everything behind it, including the preflight. Support and call
   deliberately restrict themselves to Cabana's own origins, so the
   router now delegates. This pins that it still does.
══════════════════════════════════════════════════════════════════════ */
import assert from 'node:assert/strict';
import test from 'node:test';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'service-test-key';
process.env.SUPABASE_ANON_KEY = 'anon-test-key';

const { default: trust } = await import('../api/trust.js');

function response() {
  return {
    statusCode: 200, payload: undefined, headers: {}, headersSent: false,
    setHeader(n, v) { this.headers[n.toLowerCase()] = v; },
    status(c) { this.statusCode = c; return this; },
    json(v) { this.payload = v; this.headersSent = true; return this; },
    end() { this.headersSent = true; return this; },
  };
}
function request(o = {}) {
  return { method: 'POST', headers: {}, query: {}, body: {}, url: '/api/test', ...o };
}

/* ── Routing ──────────────────────────────────────────────────────── */

test('the support and call routes are reachable through the router', async () => {
  for (const action of ['support', 'call']) {
    const res = response();
    await trust(request({ query: { action }, body: {} }), res);
    assert.notEqual(res.statusCode, 404, `/api/${action} is not wired into the router`);
  }
});

test('an unknown action is a 404, not a guess', async () => {
  const res = response();
  await trust(request({ query: { action: 'nope' }, body: {} }), res);
  assert.equal(res.statusCode, 404);
  assert.equal(res.payload.error, 'unknown_action');
  assert.ok(res.payload.available.includes('support'));
  assert.ok(res.payload.available.includes('call'));
});

/* ── Access ───────────────────────────────────────────────────────── */

test('desk operations refuse an anonymous caller', async () => {
  for (const op of ['agent.queue', 'agent.thread', 'agent.reply', 'agent.resolve', 'agent.assign']) {
    const res = response();
    await trust(request({ query: { action: 'support' }, body: { op } }), res);
    assert.equal(res.statusCode, 401, `${op} did not require authentication`);
    assert.equal(res.payload.error, 'authentication_required');
  }
});

test('a guest key does not open a desk operation', async () => {
  /* The guest path and the agent path are split before identity is even
     resolved, so a guest token cannot reach an agent op by naming one. */
  const res = response();
  await trust(request({
    query: { action: 'support' },
    body: { op: 'agent.queue', guestKey: 'a'.repeat(32) },
  }), res);
  assert.equal(res.statusCode, 401);
});

test('a guest operation still needs to say who is asking', async () => {
  const res = response();
  await trust(request({ query: { action: 'support' }, body: { op: 'bootstrap' } }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.error, 'identify_yourself');
});

test('a malformed guest key is not an identity', async () => {
  for (const key of ['short', 'not-hex-at-all!!', '', 'x'.repeat(200)]) {
    const res = response();
    await trust(request({ query: { action: 'support' }, body: { op: 'bootstrap', guestKey: key } }), res);
    assert.equal(res.statusCode, 400, `"${key.slice(0, 12)}…" was accepted as an identity`);
  }
});

test('call operations refuse an unidentified caller', async () => {
  const res = response();
  await trust(request({ query: { action: 'call' }, body: { op: 'start' } }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.error, 'identify_yourself');
});

test('the desk-only call operations refuse a guest', async () => {
  for (const op of ['incoming', 'agent.call']) {
    const res = response();
    await trust(request({
      query: { action: 'call' },
      body: { op, guestKey: 'b'.repeat(32), threadId: '11111111-2222-3333-4444-555555555555' },
    }), res);
    assert.equal(res.statusCode, 403, `${op} let a guest through`);
    assert.equal(res.payload.error, 'admin_required');
  }
});

/* ── CORS ─────────────────────────────────────────────────────────── */

test('a preflight from an untrusted origin gets no permissive CORS', async () => {
  for (const action of ['support', 'call']) {
    const res = response();
    await trust(request({
      method: 'OPTIONS', query: { action }, headers: { origin: 'https://evil.example' },
    }), res);
    assert.notEqual(res.headers['access-control-allow-origin'], '*',
      `/api/${action} handed a wildcard to an untrusted origin`);
  }
});

test('a preflight from cabana.africa is answered', async () => {
  for (const action of ['support', 'call']) {
    const res = response();
    await trust(request({
      method: 'OPTIONS', query: { action }, headers: { origin: 'https://cabana.africa' },
    }), res);
    assert.equal(res.headers['access-control-allow-origin'], 'https://cabana.africa',
      `/api/${action} did not allow Cabana's own origin`);
    assert.equal(res.statusCode, 204);
  }
});

test('GET is refused: these are POST surfaces', async () => {
  for (const action of ['support', 'call']) {
    const res = response();
    await trust(request({ method: 'GET', query: { action } }), res);
    assert.equal(res.statusCode, 405, `/api/${action} answered a GET`);
  }
});
