import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

/* cabana-countries.js is a browser IIFE; the parts under test are pure, so a
   stub window is enough. */
function load() {
  const win = { navigator: { language: 'en-KE', languages: ['en-KE'] }, MutationObserver: undefined };
  const doc = { readyState: 'complete', querySelectorAll: () => [], createElement: () => ({}), getElementById: () => null, head: { appendChild() {} }, documentElement: {} };
  win.document = doc; win.window = win;
  const ctx = vm.createContext({ ...win, HTMLInputElement: { prototype: { value: 1 } }, Intl, String, Object, Array, Promise, console });
  Object.defineProperty(ctx.HTMLInputElement.prototype, 'value', { get() { return ''; }, set() {}, configurable: true });
  ctx.HTMLSelectElement = { prototype: {} };
  ctx.document = doc; ctx.window = ctx;
  vm.runInContext(readFileSync(new URL('../cabana-countries.js', import.meta.url), 'utf8'), ctx);
  return ctx.CabanaCountries;
}

test('every country and territory with a calling code is offered', () => {
  const C = load();
  assert.ok(C.all.length >= 230, `only ${C.all.length} countries`);
  for (const iso of ['KE', 'TZ', 'NG', 'US', 'JM', 'XK', 'NZ', 'FJ', 'TV', 'ZW']) assert.ok(C.byIso(iso), iso);
  assert.equal(new Set(C.all.map(c => c.iso)).size, C.all.length);
  assert.ok(C.all.every(c => /^\d{1,6}$/.test(c.dial) && c.name && c.flag));
});

test('stored phone numbers parse into the right country and national number', () => {
  const C = load();
  const p = n => { const r = C.parsePhone(n); return [r.country.iso, r.national]; };
  assert.deepEqual(p('+254712345678'), ['KE', '712345678']);
  assert.deepEqual(p('+254 712 345 678'), ['KE', '712345678']);
  assert.deepEqual(p('0712345678'), ['KE', '712345678']);
  assert.deepEqual(p('254712345678'), ['KE', '712345678']);
  assert.deepEqual(p('+447400123456'), ['GB', '7400123456']);
  assert.deepEqual(p('+18761234567'), ['JM', '1234567']);
  assert.deepEqual(p('+14155550123'), ['US', '4155550123']);
  assert.deepEqual(p('00971501234567'), ['AE', '501234567']);
  assert.deepEqual(p(''), ['KE', '']);
});

test('the contact route emails the admin inbox with the sender as reply-to', async () => {
  process.env.RESEND_API_KEY = ''; process.env.ADMIN_NOTIFY_EMAIL = 'admin@example.com';
  const { default: handler, buildMessage, adminRecipient } = await import('../api/lib/_contact-admin.js');
  assert.deepEqual(adminRecipient(), ['admin@example.com']);
  const m = buildMessage({ topic: 'ambassador-access', message: 'Hello <b>team</b>, let me in', email: 'a@b.co', user: { id: 'u1', email: 'a@b.co' }, page: '/x' });
  assert.match(m.subject, /Ambassador access/);
  assert.doesNotMatch(m.html, /<b>team<\/b>/, 'message is escaped');
  const run = (body, method = 'POST') => new Promise(resolve => {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json(j) { resolve({ code: this.code, j }); }, end() { resolve({ code: this.code }); } };
    handler({ method, headers: { 'x-forwarded-for': '9.9.9.' + Math.floor(Math.random() * 250) }, body }, res);
  });
  assert.equal((await run({}, 'GET')).code, 405);
  assert.equal((await run({ message: 'short', email: 'a@b.co' })).code, 400);
  assert.equal((await run({ message: 'a long enough message', email: 'nope' })).code, 400);
  assert.equal((await run({ message: 'a long enough message', email: 'a@b.co' })).code, 503, 'no mail key configured');
});
