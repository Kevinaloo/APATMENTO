import test from 'node:test';
import assert from 'node:assert/strict';
import { upstreamRequest, retryAfterMs } from '../api/lib/_upstream.js';

function mockFetch(t, fn) {
  const before = globalThis.fetch;
  globalThis.fetch = fn;
  t.after(() => { globalThis.fetch = before; });
}

test('read-only gateway failures retry once; writes never replay', async t => {
  let calls = 0;
  mockFetch(t, async () => {
    calls++;
    return new Response(calls === 1 ? 'Gateway Timeout' : '[1]', { status: calls === 1 ? 504 : 200 });
  });
  assert.deepEqual(await upstreamRequest('https://db.test', {}, { readOnly: true }), [1]);
  assert.equal(calls, 2);
  calls = 0;
  await assert.rejects(upstreamRequest('https://db.test', { method: 'POST' }), { status: 503 });
  assert.equal(calls, 1);
});

test('configuration errors and long Retry-After responses are not retried', async t => {
  let calls = 0;
  mockFetch(t, async () => {
    calls++;
    return new Response('{}', { status: 429, headers: { 'Retry-After': '30' } });
  });
  await assert.rejects(upstreamRequest('https://db.test', {}, { readOnly: true }), { status: 503 });
  assert.equal(calls, 1);
  globalThis.fetch = async () => { calls++; return new Response('{"code":"PGRST202"}', { status: 404 }); };
  await assert.rejects(upstreamRequest('https://db.test', {}, { readOnly: true }), { code: 'PGRST202' });
  assert.equal(calls, 2);
});

test('timeout also bounds slow response bodies', async t => {
  mockFetch(t, async (_url, { signal }) => ({
    ok: true,
    json: () => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))),
  }));
  await assert.rejects(upstreamRequest('https://db.test', {}, { timeoutMs: 10 }), { status: 503, code: 'upstream_timeout' });
});

test('Retry-After accepts seconds and HTTP dates', () => {
  assert.equal(retryAfterMs('15'), 15000);
  assert.equal(retryAfterMs('Wed, 16 Sep 2026 00:01:00 GMT', Date.parse('2026-09-16T00:00:00Z')), 60000);
  assert.equal(retryAfterMs('nonsense'), null);
});
