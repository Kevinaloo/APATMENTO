import assert from 'node:assert/strict';
import test from 'node:test';

process.env.SUPABASE_URL = 'https://example.supabase.co';
Object.assign(process.env, { SUPABASE_SERVICE_ROLE_KEY: 'service-test-key' });
process.env.SUPABASE_ANON_KEY = 'anon-test-key';

const [{ default: callback }, { default: stkPush }, { default: pushSend },
  { default: scrape }, { default: email }, { default: calendarSync }, { default: enhanceListing }] = await Promise.all([
  import('../api/stk-callback.js'),
  import('../api/stk-push.js'),
  import('../api/push-send.js'),
  import('../api/scrape.js'),
  import('../api/email.js'),
  import('../api/calendar-sync.js'),
  import('../api/enhance-listing.js'),
]);

function response() {
  return {
    statusCode: 200,
    payload: undefined,
    headers: {},
    headersSent: false,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.payload = value; this.headersSent = true; return this; },
    send(value) { this.payload = value; this.headersSent = true; return this; },
    end() { this.headersSent = true; return this; },
  };
}

function request(overrides = {}) {
  return {
    method: 'POST',
    headers: {},
    query: {},
    body: {},
    url: '/api/test',
    ...overrides,
  };
}

test('PayHero callback fails closed when its verification secret is absent', async () => {
  const prior = process.env.PAYHERO_CALLBACK_TOKEN;
  delete process.env.PAYHERO_CALLBACK_TOKEN;
  const res = response();
  await callback(request(), res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.payload.error, 'callback_verification_unavailable');
  if (prior !== undefined) process.env.PAYHERO_CALLBACK_TOKEN = prior;
});

test('PayHero callback rejects a bad token before reading payment data', async () => {
  process.env.PAYHERO_CALLBACK_TOKEN = 'correct-long-test-token';
  const res = response();
  await callback(request({
    query: { t: 'wrong-token' },
    body: { status: 'SUCCESS', external_reference: 'APT-anything-P1', amount: 1 },
  }), res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.payload.error, 'unauthorized');
});

test('retired BAL callbacks cannot mark a booking paid', async () => {
  process.env.PAYHERO_CALLBACK_TOKEN = 'correct-long-test-token';
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => { called = true; throw new Error('should not fetch'); };
  try {
    const res = response();
    await callback(request({
      query: { t: 'correct-long-test-token' },
      body: { status: 'SUCCESS', external_reference: 'BAL-legacy-reference', amount: 1 },
    }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.type, 'retired_balance');
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('STK initiation requires an authenticated Supabase session', async () => {
  const res = response();
  await stkPush(request({ body: {
    phone: '0712345678', reference: 'APT-example-1', amount: 100,
  } }), res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.payload.error, 'authentication_required');
});

test('bulk push fails closed when no admin identity or secret is supplied', async () => {
  const res = response();
  await pushSend(request({ body: { user_id: 'target', title: 'test' } }), res);
  assert.equal(res.statusCode, 401);
});

test('scraper cannot be invoked using a caller-controlled cron marker', async () => {
  const res = response();
  await scrape(request({
    method: 'GET',
    headers: { 'x-vercel-cron': '1' },
    query: { service: 'events' },
    url: '/api/scrape?service=events',
  }), res);
  assert.equal(res.statusCode, 401);
});

test('transactional email cannot be sent anonymously', async () => {
  const res = response();
  await email(request({
    query: { action: 'booking' },
    body: { booking: {}, listing: {}, user: { email: 'victim@example.com' } },
  }), res);
  assert.equal(res.statusCode, 401);
});

test('calendar import requires a signed-in listing owner', async () => {
  const res = response();
  await calendarSync(request({
    body: {
      action: 'import',
      listingId: '1d3934cd-cd4b-43ec-922e-e3d24cb5958f',
      calendarUrl: 'https://www.airbnb.com/calendar/ical/example.ics',
    },
  }), res);
  assert.equal(res.statusCode, 401);
});

test('AI listing copy cannot consume provider credits anonymously', async () => {
  const res = response();
  await enhanceListing(request({ body: { mode: 'description', listing: { title: 'Test stay' } } }), res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.payload.error, 'authentication_required');
});

test('untrusted origins do not receive permissive CORS', async () => {
  const res = response();
  await stkPush(request({ method: 'OPTIONS', headers: { origin: 'https://evil.example' } }), res);
  assert.equal(res.headers['access-control-allow-origin'], undefined);
});
