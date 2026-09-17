import test from 'node:test';
import assert from 'node:assert/strict';

function response() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.payload = value; return this; },
  };
}

test('calendar cron retries its read once and reports a bounded 503', async t => {
  const env = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
  };
  const originalFetch = globalThis.fetch;
  process.env.SUPABASE_URL = 'https://db.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-test-key';
  process.env.CRON_SECRET = 'cron-test-secret';
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response('<html>upstream detail</html>', { status: 504 });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const { default: handler } = await import('../api/calendar-sync.js');
  const res = response();
  await handler({
    method: 'GET',
    headers: { authorization: 'Bearer cron-test-secret' },
    query: { action: 'cron' },
    url: '/api/calendar-sync?action=cron',
  }, res);

  assert.equal(calls, 2);
  assert.equal(res.statusCode, 503);
  assert.deepEqual(res.payload, { error: 'calendar_temporarily_unavailable' });
  assert.equal(res.headers['cache-control'], 'no-store');
  assert.doesNotMatch(JSON.stringify(res.payload), /upstream detail/);
});
