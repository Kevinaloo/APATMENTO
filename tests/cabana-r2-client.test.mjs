import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const source = readFileSync(new URL('../cabana-r2.js', import.meta.url), 'utf8');

function boot(t, { enabled = true, signStatus = 200, putStatus = 200 } = {}) {
  const w = new JSDOM('<!doctype html><body></body>', { url: 'https://cabana.africa/', runScripts: 'outside-only' }).window;
  t.after(() => w.close());
  const calls = [];
  w.fetch = async (url, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ url, method: init.method || 'GET', body, auth: init.headers && init.headers.Authorization });
    if (!init.method || init.method === 'GET') return { ok: true, json: async () => ({ enabled, base: 'https://media.cabana.africa' }) };
    if (body && body.op === 'delete') return { ok: true, json: async () => ({ ok: true }) };
    if (signStatus !== 200) return { ok: false, status: signStatus, json: async () => ({}) };
    return { ok: true, json: async () => ({ uploadUrl: 'https://acct.r2.cloudflarestorage.com/cabana-media/listings/u/x.jpg?sig', publicUrl: 'https://media.cabana.africa/listings/u/x.jpg', headers: { 'Content-Type': body.contentType } }) };
  };
  const puts = [];
  w.XMLHttpRequest = class {
    constructor() { this.upload = {}; this.h = {}; }
    open(m, u) { this.m = m; this.u = u; }
    setRequestHeader(k, v) { this.h[k] = v; }
    send(b) { puts.push({ m: this.m, u: this.u, h: this.h, size: b.size }); setTimeout(() => { this.status = putStatus; this.onload(); }, 0); }
  };
  w.eval(source);
  return { w, calls, puts };
}
const file = (w, type, size = 5000) => ({ type, size, name: 'x' });
const sb = { auth: { getSession: async () => ({ data: { session: { access_token: 'jwt' } } }) } };

test('a photo is signed, PUT straight to R2 with its signed headers, and the public URL comes back', async (t) => {
  const { w, calls, puts } = boot(t);
  const url = await w.CabanaR2.put(file(w, 'image/jpeg'), { kind: 'listing', sb });
  assert.equal(url, 'https://media.cabana.africa/listings/u/x.jpg');
  const sign = calls.find(c => c.method === 'POST');
  assert.equal(sign.auth, 'Bearer jwt');
  assert.deepEqual(sign.body, { kind: 'listing', contentType: 'image/jpeg', size: 5000 });
  assert.equal(puts[0].m, 'PUT');
  assert.equal(puts[0].h['Content-Type'], 'image/jpeg');
});

test('clips are accepted; documents and other types are refused before any request', async (t) => {
  const { w, calls } = boot(t);
  assert.ok(await w.CabanaR2.put(file(w, 'video/mp4', 9e6), { kind: 'tour', sb }));
  const before = calls.length;
  for (const type of ['application/pdf', 'image/svg+xml', 'text/html', 'image/heic', '']) {
    await assert.rejects(w.CabanaR2.put(file(w, type), { kind: 'listing', sb }), /unsupported_type/, type);
  }
  assert.equal(calls.length, before);
});

test('putOrNull never throws: R2 off, a refused signature or a failed PUT all give null so callers fall back', async (t) => {
  assert.equal(await boot(t, { enabled: false }).w.CabanaR2.putOrNull(file(null, 'image/png'), { sb }), null);
  assert.equal(await boot(t, { signStatus: 429 }).w.CabanaR2.putOrNull(file(null, 'image/png'), { sb }), null);
  assert.equal(await boot(t, { putStatus: 403 }).w.CabanaR2.putOrNull(file(null, 'image/png'), { sb }), null);
  assert.equal(await boot(t).w.CabanaR2.putOrNull(file(null, 'image/png'), {}), null, 'no session, no upload');
});

test('only R2 URLs are sent for deletion', async (t) => {
  const { w, calls } = boot(t);
  assert.equal(await w.CabanaR2.remove('https://x.supabase.co/storage/v1/object/public/listings/a.jpg', { token: 't' }), false);
  assert.equal(calls.filter(c => c.body && c.body.op === 'delete').length, 0);
  assert.equal(await w.CabanaR2.remove('https://media.cabana.africa/listings/u/x.jpg', { token: 't' }), true);
  assert.equal(calls.filter(c => c.body && c.body.op === 'delete').length, 1);
});
