import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { recognition, readAll } from '../api/lib/_ambassador-recognition.js';

test('link-only registrations appear, linked claims count once, and rejected claims do not count', () => {
  const result = recognition([
    { id: 'l1', converted_user_id: 'u1', status: 'listed', converted_at: '2026-09-03' },
    { id: 'l2', status: 'claimed' }, { id: 'l3', status: 'rejected' },
  ], [
    { referred_id: 'u1', referral_type: 'host', created_at: '2026-09-03' },
    { referred_id: 'u2', referral_type: 'user', created_at: '2026-08-01' },
  ], new Date('2026-09-17'));
  assert.equal(result.onboarded, 2);
  assert.equal(result.this_month, 1);
  assert.equal(result.link_registrations, 2);
  assert.equal(result.leads[0].attribution_source, 'claim_and_link');
  assert.equal(result.leads[3].attribution_source, 'referral_link');
  assert.equal(result.leads[3].lead_type, 'traveller');
});

test('pagination continues even when the database caps responses below page size', async () => {
  const paths = [];
  const result = await readAll(async path => { paths.push(path); return paths.length <= 2 ? [{ id: paths.length }] : []; }, 'referrals?select=*');
  assert.equal(result.length, 2);
  assert.match(paths[2], /offset=2$/);
  await assert.rejects(readAll(async () => null, 'referrals?select=*'));
});

const source = readFileSync(new URL('../apa-referral-capture.js', import.meta.url), 'utf8');
function storage() {
  const map = new Map();
  return { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k) };
}
function captureHarness(status = 200) {
  const localStorage = storage(), sessionStorage = storage(), calls = [];
  const window = { location: { search: '' }, ApaSession: { subscribe() {}, client() { return null; } } };
  const context = { window, localStorage, sessionStorage, URLSearchParams, console,
    fetch: async (...args) => { calls.push(args); return { ok: status === 200, status, json: async () => status === 200 ? { ok: true } : { error: 'failure' } }; } };
  vm.runInNewContext(source, context);
  const attribute = async (id, code = 'AMB-TEST') => {
    localStorage.setItem('apt_ref_pending', code);
    window.ApaReferralCapture.attribute({ user: { id }, session: { access_token: 'token-' + id } });
    await new Promise(resolve => setImmediate(resolve));
  };
  return { localStorage, calls, attribute };
}
test('two people on the same field device are both attributed, repeats are skipped', async () => {
  const h = captureHarness();
  h.localStorage.setItem('apt_ref_done', 'AMB-TEST');
  await h.attribute('first'); await h.attribute('second'); await h.attribute('second');
  assert.equal(h.calls.length, 2);
});
for (const status of [401, 429, 500, 503]) {
  test(`HTTP ${status} retains the code for retry`, async () => {
    const h = captureHarness(status); await h.attribute('first');
    assert.equal(h.localStorage.getItem('apt_ref_pending'), 'AMB-TEST');
    assert.equal(h.localStorage.getItem('apt_ref_done:first'), null);
  });
}
