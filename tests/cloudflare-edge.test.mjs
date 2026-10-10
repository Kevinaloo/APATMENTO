import test from 'node:test';
import assert from 'node:assert/strict';
import { callAi, generateStructuredJson, __test } from '../api/lib/_ai-gateway.js';
import { cloudflareSpeak, cloudflareConfigured } from '../api/lib/_cloudflare.js';
import { presignPut, r2Configured, newMediaKey, isR2PublicUrl, keyForOwnedUrl, PUBLIC_MEDIA_KINDS } from '../api/lib/_r2.js';

const ACCOUNT = '0123456789abcdef0123456789abcdef';
const OWNER = '11111111-2222-3333-4444-555555555555';
const KEYS = ['GROQ_API_KEY', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_AI_API_TOKEN', 'CLOUDFLARE_AI_MODEL', 'AI_GATEWAY_API_KEY',
  'AI_GATEWAY_ENABLED', 'R2_ACCOUNT_ID', 'GEMINI_API_KEY', 'OPENAI_API_KEY', 'AI_PROVIDER_ORDER', 'AI_HEDGE_MS', 'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL'];

function sandbox(t, env = {}, fetchImpl) {
  const saved = Object.fromEntries(KEYS.map(k => [k, process.env[k]]));
  for (const k of KEYS) delete process.env[k];
  Object.assign(process.env, env);
  const before = global.fetch;
  if (fetchImpl) global.fetch = fetchImpl;
  __test.resetCooldowns();
  t.after(() => {
    global.fetch = before;
    for (const k of KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
  });
}
const json = (body, status = 200) => ({ ok: status < 400, status, headers: new Headers(), text: async () => JSON.stringify(body), json: async () => body });
const chat = (content) => ({ choices: [{ message: { role: 'assistant', content } }] });

test('Cloudflare Workers AI is configured only when both account and token are present', (t) => {
  sandbox(t, { CLOUDFLARE_ACCOUNT_ID: ACCOUNT });
  assert.equal(cloudflareConfigured(), false);
  process.env.CLOUDFLARE_AI_API_TOKEN = 'token';
  assert.equal(cloudflareConfigured(), true);
});

test('Cloudflare answers when Groq is down, over the OpenAI compatible endpoint, with tools', async (t) => {
  const calls = [];
  sandbox(t, { GROQ_API_KEY: 'g', CLOUDFLARE_ACCOUNT_ID: ACCOUNT, CLOUDFLARE_AI_API_TOKEN: 'cf-token' }, async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('groq.com')) return json({ error: 'boom' }, 500);
    return json({ ...chat('Hello from the edge'), model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast' });
  });
  const tools = [{ type: 'function', function: { name: 'search_stays', description: 'x', parameters: { type: 'object', properties: { area: { type: 'string' } }, required: [] } } }];
  const out = await callAi([{ role: 'user', content: 'hi' }], { tools, hedgeMs: 0 });
  assert.equal(out.provider, 'cloudflare');
  assert.equal(out.choices[0].message.content, 'Hello from the edge');
  const cf = calls.find(c => c.url.includes('api.cloudflare.com'));
  assert.equal(cf.url, `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/v1/chat/completions`);
  assert.equal(cf.init.headers.Authorization, 'Bearer cf-token');
  const body = JSON.parse(cf.init.body);
  assert.equal(body.model, '@cf/meta/llama-3.3-70b-instruct-fp8-fast');
  assert.equal(body.tools[0].function.name, 'search_stays');
  assert.deepEqual(out.gateway.attempts.map(a => [a.provider, a.status]), [['groq', 'failed'], ['cloudflare', 'ok']]);
});

test('a slow lead provider is hedged: the next one is raced and the first good answer wins', async (t) => {
  sandbox(t, { GROQ_API_KEY: 'g', CLOUDFLARE_ACCOUNT_ID: ACCOUNT, CLOUDFLARE_AI_API_TOKEN: 'cf' }, (url, init) => {
    if (String(url).includes('groq.com')) {
      return new Promise((resolve, reject) => init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
    }
    return Promise.resolve(json(chat('fast lane')));
  });
  const started = Date.now();
  const out = await callAi([{ role: 'user', content: 'hi' }], { hedgeMs: 30 });
  assert.equal(out.choices[0].message.content, 'fast lane');
  assert.equal(out.provider, 'cloudflare');
  assert.ok(Date.now() - started < 2000, 'did not wait for the slow provider to time out');
});

test('a healthy lead provider is never duplicated', async (t) => {
  let cfCalls = 0;
  sandbox(t, { GROQ_API_KEY: 'g', CLOUDFLARE_ACCOUNT_ID: ACCOUNT, CLOUDFLARE_AI_API_TOKEN: 'cf' }, async (url) => {
    if (String(url).includes('api.cloudflare.com')) cfCalls++;
    return json(chat('groq ok'));
  });
  const out = await callAi([{ role: 'user', content: 'hi' }], { hedgeMs: 200 });
  assert.equal(out.provider, 'groq');
  await new Promise(r => setTimeout(r, 300));
  assert.equal(cfCalls, 0);
});

test('images never go to the text-only Groq or Cloudflare lanes', async (t) => {
  sandbox(t, { GROQ_API_KEY: 'g', CLOUDFLARE_ACCOUNT_ID: ACCOUNT, CLOUDFLARE_AI_API_TOKEN: 'cf' }, async () => json(chat('no')));
  const image = { type: 'image_url', image_url: { url: 'data:image/png;base64,AAAA' } };
  await assert.rejects(callAi([{ role: 'user', content: [{ type: 'text', text: 'look' }, image] }]), /ai_gateway_unconfigured/);
});

test('Cloudflare rate limits cool the lane down without blocking others', async (t) => {
  let cf = 0;
  sandbox(t, { GROQ_API_KEY: 'g', AI_PROVIDER_ORDER: 'cloudflare,groq', CLOUDFLARE_ACCOUNT_ID: ACCOUNT, CLOUDFLARE_AI_API_TOKEN: 'cf' }, async (url) => {
    if (String(url).includes('api.cloudflare.com')) { cf++; return json({ errors: [] }, 429); }
    return json(chat('groq answered'));
  });
  const first = await callAi([{ role: 'user', content: 'a' }], { hedgeMs: 0 });
  const second = await callAi([{ role: 'user', content: 'b' }], { hedgeMs: 0 });
  assert.equal(first.provider, 'groq');
  assert.equal(second.provider, 'groq');
  assert.equal(cf, 1, 'the second request skipped the cooling lane');
  assert.equal(second.gateway.attempts[0].code, 'provider_cooldown');
});

test('structured JSON can come from Cloudflare', async (t) => {
  sandbox(t, { AI_PROVIDER_ORDER: 'cloudflare', CLOUDFLARE_ACCOUNT_ID: ACCOUNT, CLOUDFLARE_AI_API_TOKEN: 'cf' },
    async () => json(chat('{"ok":true,"n":2}')));
  assert.deepEqual(await generateStructuredJson('sys', 'user'), { ok: true, n: 2 });
});

test('a malformed account id is refused rather than interpolated into a URL', async (t) => {
  sandbox(t, { AI_PROVIDER_ORDER: 'cloudflare', CLOUDFLARE_ACCOUNT_ID: '../evil', CLOUDFLARE_AI_API_TOKEN: 'cf' }, async () => { throw new Error('must not be called'); });
  await assert.rejects(callAi([{ role: 'user', content: 'x' }], { hedgeMs: 0 }), /ai_gateway_unavailable/);
});

test('text to speech asks Aura-2 for mp3 with the chosen voice and falls back to Aura-1', async (t) => {
  const seen = [];
  sandbox(t, { CLOUDFLARE_ACCOUNT_ID: ACCOUNT, CLOUDFLARE_AI_API_TOKEN: 'cf' }, async (url, init) => {
    seen.push({ url: String(url), body: JSON.parse(init.body) });
    if (String(url).includes('aura-2')) return { ok: false, status: 500, headers: new Headers() };
    return { ok: true, status: 200, headers: new Headers({ 'content-type': 'audio/mpeg' }), arrayBuffer: async () => new Uint8Array(900).buffer };
  });
  const out = await cloudflareSpeak('Hello there.', { speaker: 'thalia' });
  assert.equal(out.model, '@cf/deepgram/aura-1');
  assert.equal(out.bytes.length, 900);
  assert.equal(out.contentType, 'audio/mpeg');
  assert.deepEqual(seen[0].body, { text: 'Hello there.', speaker: 'thalia', encoding: 'mp3' });
  assert.ok(seen[0].url.endsWith('/ai/run/@cf/deepgram/aura-2-en'));
  assert.deepEqual(seen[1].body, { text: 'Hello there.', encoding: 'mp3' });
  await assert.rejects(cloudflareSpeak('   '), /speak_empty/);
});

/* ── R2 ─────────────────────────────────────────────────────────────── */
const R2ENV = { CLOUDFLARE_ACCOUNT_ID: ACCOUNT, R2_ACCESS_KEY_ID: 'AKIDEXAMPLE', R2_SECRET_ACCESS_KEY: 'SECRETEXAMPLEKEY', R2_BUCKET_NAME: 'cabana-media', R2_PUBLIC_URL: 'https://media.example.com/' };

test('the presigned URL matches botocore\'s SigV4 reference signature byte for byte', (t) => {
  sandbox(t, R2ENV);
  const out = presignPut({ kind: 'listing', ownerId: OWNER, contentType: 'image/jpeg', size: 123456, id: 'abc', now: new Date('2026-10-10T08:30:00Z') });
  assert.equal(out.key, `listings/${OWNER}/abc.jpg`);
  assert.equal(out.publicUrl, `https://media.example.com/listings/${OWNER}/abc.jpg`);
  assert.match(out.uploadUrl, /X-Amz-SignedHeaders=content-length%3Bcontent-type%3Bhost/);
  assert.match(out.uploadUrl, /X-Amz-Signature=d78518218167a884cf8e241c3e70789ae800491a0ee5dc454d780952ab878a28$/);
  assert.deepEqual(out.headers, { 'Content-Type': 'image/jpeg' });
});

test('only public media kinds, image types and sane sizes can be signed', (t) => {
  sandbox(t, R2ENV);
  const base = { kind: 'listing', ownerId: OWNER, contentType: 'image/png', size: 5000 };
  assert.ok(presignPut(base).uploadUrl);
  for (const kind of ['kyc', 'id', 'passport', 'selfie', 'receipt', 'contract', 'private', '../x', '']) {
    assert.throws(() => presignPut({ ...base, kind }), /unsupported_kind/, kind);
  }
  assert.ok(!Object.keys(PUBLIC_MEDIA_KINDS).some(k => /id|kyc|selfie|receipt|doc|contract|passport/.test(k)));
  for (const contentType of ['application/pdf', 'text/html', 'image/svg+xml', 'video/x-msvideo', 'application/octet-stream']) {
    assert.throws(() => presignPut({ ...base, contentType }), /unsupported_type/, contentType);
  }
  assert.throws(() => presignPut({ ...base, size: 11 * 1024 * 1024 }), /bad_size/);
  assert.throws(() => presignPut({ ...base, size: 10 }), /bad_size/);
  assert.throws(() => presignPut({ ...base, size: 'NaN' }), /bad_size/);
});

test('object keys are server-made and bound to the signed-in owner', (t) => {
  sandbox(t, R2ENV);
  assert.throws(() => newMediaKey({ kind: 'listing', ownerId: '../../etc' }), /owner_required/);
  assert.throws(() => newMediaKey({ kind: 'listing', ownerId: '' }), /owner_required/);
  const a = presignPut({ kind: 'tour', ownerId: OWNER, contentType: 'image/webp', size: 4000 });
  const b = presignPut({ kind: 'tour', ownerId: OWNER, contentType: 'image/webp', size: 4000 });
  assert.notEqual(a.key, b.key);
  assert.match(a.key, new RegExp(`^tours/${OWNER}/[0-9a-f-]{36}\\.webp$`));
});

test('R2 is reported unconfigured when any variable is missing or the public URL is not https', (t) => {
  sandbox(t, R2ENV);
  assert.equal(r2Configured(), true);
  process.env.R2_PUBLIC_URL = 'http://insecure.example.com';
  assert.equal(r2Configured(), false);
  process.env.R2_PUBLIC_URL = 'https://media.example.com';
  delete process.env.R2_SECRET_ACCESS_KEY;
  assert.equal(r2Configured(), false);
  assert.throws(() => presignPut({ kind: 'listing', ownerId: OWNER, contentType: 'image/png', size: 5000 }), /r2_not_configured/);
});

test('only URLs under our own R2 public base count as R2 media', (t) => {
  sandbox(t, R2ENV);
  assert.equal(isR2PublicUrl('https://media.example.com/listings/x.jpg'), true);
  assert.equal(isR2PublicUrl('https://media.example.com.evil.io/x.jpg'), false);
  assert.equal(isR2PublicUrl('https://elsewhere.io/x.jpg'), false);
});

test('R2_ACCOUNT_ID is accepted, and unreplaced PASTE_ placeholders count as not configured', (t) => {
  sandbox(t, { ...R2ENV, R2_ACCOUNT_ID: '21129ae699ac62690fff7a4001327802' });
  delete process.env.CLOUDFLARE_ACCOUNT_ID;
  assert.equal(r2Configured(), true);
  const out = presignPut({ kind: 'listing', ownerId: OWNER, contentType: 'image/png', size: 5000 });
  assert.match(out.uploadUrl, /^https:\/\/21129ae699ac62690fff7a4001327802\.r2\.cloudflarestorage\.com\/cabana-media\//);
  process.env.R2_ACCESS_KEY_ID = 'PASTE_YOUR_R2_ACCESS_KEY_ID';
  assert.equal(r2Configured(), false);
  process.env.R2_ACCESS_KEY_ID = 'AKIDEXAMPLE';
  process.env.R2_SECRET_ACCESS_KEY = 'PASTE_YOUR_R2_SECRET_ACCESS_KEY';
  assert.equal(r2Configured(), false);
});

test('short clips are allowed up to 100 MB, but never as an avatar or beyond the cap', (t) => {
  sandbox(t, R2ENV);
  const clip = presignPut({ kind: 'listing', ownerId: OWNER, contentType: 'video/mp4', size: 60 * 1024 * 1024 });
  assert.match(clip.key, /\.mp4$/);
  assert.equal(clip.maxBytes, 100 * 1024 * 1024);
  assert.throws(() => presignPut({ kind: 'listing', ownerId: OWNER, contentType: 'video/mp4', size: 101 * 1024 * 1024 }), /bad_size/);
  assert.throws(() => presignPut({ kind: 'avatar', ownerId: OWNER, contentType: 'video/webm', size: 5000 }), /unsupported_type/);
  assert.ok(presignPut({ kind: 'ad', ownerId: OWNER, contentType: 'image/jpeg', size: 5000 }).key.startsWith('ads/'));
});

test('only your own R2 media can be deleted, and nothing outside the media prefixes', (t) => {
  sandbox(t, R2ENV);
  const mine = `https://media.example.com/listings/${OWNER}/abc.jpg`;
  const theirs = 'https://media.example.com/listings/99999999-2222-3333-4444-555555555555/abc.jpg';
  assert.equal(keyForOwnedUrl(mine, OWNER), `listings/${OWNER}/abc.jpg`);
  assert.equal(keyForOwnedUrl(theirs, OWNER), null);
  assert.equal(keyForOwnedUrl(theirs, OWNER, { admin: true }), 'listings/99999999-2222-3333-4444-555555555555/abc.jpg');
  for (const bad of [
    `https://media.example.com/secret/${OWNER}/abc.jpg`,
    `https://media.example.com/listings/${OWNER}/../x/abc.jpg`,
    `https://media.example.com/listings/${OWNER}/a/b.jpg`,
    `https://media.example.com.evil.io/listings/${OWNER}/abc.jpg`,
    'https://elsewhere.io/x.jpg', '', null,
  ]) assert.equal(keyForOwnedUrl(bad, OWNER, { admin: true }), null, String(bad));
});
