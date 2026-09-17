import test from 'node:test';
import assert from 'node:assert/strict';
import { recognition } from '../api/lib/_ambassador-recognition.js';

const now = new Date('2026-09-17T12:00:00Z');
const accepted = (overrides = {}) => ({
  id: 'transfer-1', listing_id: 'listing-1', kind: 'on_behalf', from_user: 'ambassador-1',
  to_user: 'owner-1', to_name: 'Amina', to_contact: 'amina@example.com',
  status: 'accepted', created_at: '2026-09-01T12:00:00Z', accepted_at: '2026-09-03T12:00:00Z',
  ...overrides,
});

test('a listing owner who accepted appears even without a prospect or referral link', () => {
  const result = recognition([], [], now, [accepted()]);
  assert.equal(result.onboarded, 1);
  assert.equal(result.this_month, 1);
  assert.equal(result.listings_claimed, 1);
  assert.equal(result.owners_claimed, 1);
  assert.equal(result.link_registrations, 0);
  assert.equal(result.leads[0].full_name, 'Amina');
  assert.equal(result.leads[0].onboarding_stage, 'listing_claimed');
  assert.equal(result.leads[0].converted_user_id, 'owner-1');
});

test('a saved contact, multiple accepted listings and a referral count one person', () => {
  const lead = { id: 'lead-1', full_name: 'Amina', contact_raw: ' AMINA@EXAMPLE.COM ', status: 'claimed' };
  const result = recognition([lead], [{ referred_id: 'owner-1', created_at: '2026-08-15', referral_type: 'host' }], now,
    [accepted(), accepted({ id: 'transfer-2', listing_id: 'listing-2', accepted_at: '2026-09-12' })]);
  assert.equal(result.onboarded, 1);
  assert.equal(result.this_month, 0, 'an earlier registration must not be counted as a new person this month');
  assert.equal(result.leads.length, 1);
  assert.equal(result.leads[0].id, 'lead-1');
  assert.equal(result.leads[0].listing_claims.length, 2);
  assert.equal(result.owners_claimed, 1);
  assert.equal(result.listings_claimed, 2);
  assert.equal(lead.status, 'claimed', 'reading recognition never mutates stored reservations');
});

test('only a verified acceptance counts; pending, declined, expired and ordinary handovers do not', () => {
  const result = recognition([], [], now, [
    accepted({ id: 'pending', listing_id: 'pending', status: 'pending', to_user: null, accepted_at: null, expires_at: '2026-10-01' }),
    accepted({ id: 'expired', listing_id: 'expired', status: 'pending', to_user: null, accepted_at: null, expires_at: '2026-09-01' }),
    accepted({ id: 'declined', listing_id: 'declined', status: 'declined', to_user: null, accepted_at: null }),
    accepted({ id: 'handover', listing_id: 'handover', kind: 'handover' }),
    accepted({ id: 'unverified', listing_id: 'unverified', to_user: null }),
    accepted({ id: 'self', listing_id: 'self', to_user: 'ambassador-1' }),
  ]);
  assert.equal(result.onboarded, 0);
  assert.equal(result.listings_claimed, 0);
  assert.equal(result.owners_claimed, 0);
  assert.equal(result.awaiting_owner, 1);
  assert.equal(result.leads[0].onboarding_stage, 'awaiting_owner');
  assert.equal(result.leads[0].listing_claims.find(t => t.id === 'expired').status, 'expired');
});

test('legacy phone contacts merge, existing earnings survive, and stale drafts are not joined people', () => {
  const result = recognition([
    { id: 'phone-lead', contact_raw: '0712 345 678', status: 'earning', converted_user_id: 'owner-1', converted_at: '2026-08-02' },
    { id: 'draft-only', contact_raw: 'draft@example.com', status: 'listed', first_listing_id: 'draft-id' },
  ], [], now, [accepted({ to_contact: '+254712345678' })]);
  assert.equal(result.onboarded, 1);
  assert.equal(result.leads[0].status, 'earning');
  assert.equal(result.leads[1].status, 'claimed');
  assert.equal(result.leads[1].onboarding_stage, 'contact_saved');
});

test('rejected reservations are preserved and account identity wins over reused contact', () => {
  const result = recognition([
    { id: 'rejected', contact_raw: 'amina@example.com', status: 'rejected' },
    { id: 'other-account', contact_raw: 'amina@example.com', status: 'signed_up', converted_user_id: 'owner-2', converted_at: '2026-08-01' },
  ], [], now, [accepted()]);
  assert.equal(result.leads[0].status, 'rejected');
  assert.equal(result.leads[1].converted_user_id, 'owner-2');
  assert.equal(result.onboarded, 2);
});

test('duplicate referral records and listing history never inflate recognition', () => {
  const ref = { referred_id: 'owner-1', referral_type: 'host', created_at: '2026-09-01' };
  const result = recognition([], [ref, ref], now, [accepted(), accepted()]);
  assert.equal(result.leads.length, 1);
  assert.equal(result.onboarded, 1);
  assert.equal(result.link_registrations, 1);
  assert.equal(result.listings_claimed, 1);
  assert.equal(result.leads[0].listing_claims.length, 1);
  assert.equal(result.leads[0].attribution_source, 'listing_and_link');
});

process.env.SUPABASE_URL ||= 'https://example.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-key';
process.env.SUPABASE_ANON_KEY ||= 'test-anon-key';
const { ambassadorHandler } = await import('../api/lib/_ambassadors.js');

function response() {
  return { code: 0, data: null, status(n) { this.code = n; return this; }, json(data) { this.data = data; return this; }, setHeader() {}, end() {} };
}
function installDatabase(t, extra = {}) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init = {}) => {
    const parsed = new URL(url);
    calls.push({ url: parsed, ...init });
    let payload;
    if (parsed.pathname.endsWith('/auth/v1/user')) payload = { id: 'ambassador-1', email: 'ambassador@example.com' };
    else if (parsed.pathname.endsWith('/rpc/ambassador_gate')) payload = { ok: true };
    else if (parsed.pathname.endsWith('/rpc/cabana_ambassador_totals')) payload = {};
    else {
      const table = parsed.pathname.split('/').at(-1);
      const records = {
        v_ambassador_me: [{ id: 'ambassador-1', referral_code: 'AMB-ONE', leads_converted: 0 }],
        ambassador_leads: [{ id: 'lead-1', full_name: 'Amina', contact_raw: 'amina@example.com', status: 'claimed' }],
        referrals: [], referral_earnings: [], listing_transfers: [accepted()],
        ambassadors: [{ id: 'ambassador-1', full_name: 'Test Ambassador', region: 'Nairobi', status: 'active' }],
        ...extra,
      };
      assert.ok(table in records, `unexpected request: ${url}`);
      payload = parsed.searchParams.get('offset') && parsed.searchParams.get('offset') !== '0' ? [] : records[table];
    }
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  return calls;
}
const request = action => ({ method: 'GET', url: '/api/ambassadors?action=' + action, query: { action }, headers: { authorization: 'Bearer own-user-token' } });

for (const action of ['me', 'leads']) {
  test(`${action} includes historical accepted listings and queries only the authenticated sender under RLS`, async t => {
    const calls = installDatabase(t), res = response();
    await ambassadorHandler(request(action), res);
    assert.equal(res.code, 200);
    assert.equal(res.data.recognition.owners_claimed, 1);
    assert.equal(res.data.leads[0].onboarding_stage, 'listing_claimed');
    assert.equal(res.data.listing_transfers[0].to_name, 'Amina');
    if (action === 'me') assert.equal(res.data.me.leads_converted, 1);
    for (const call of calls.filter(c => c.url.pathname.endsWith('/listing_transfers'))) {
      assert.equal(call.url.searchParams.get('from_user'), 'eq.ambassador-1');
      assert.equal(call.url.searchParams.get('kind'), 'eq.on_behalf');
      assert.equal(call.headers.Authorization, 'Bearer own-user-token');
      assert.ok(!call.method || call.method === 'GET');
    }
    assert.ok(calls.every(c => c.url.pathname.includes('/rpc/') || !c.method || c.method === 'GET'), 'reading recognition must not change data');
  });
}

test('preparing a draft does not mark its owner as having joined or accepted a listing', async t => {
  const calls = installDatabase(t, { ambassador_listing_drafts: [{ id: 'draft-1', status: 'awaiting_host' }] });
  const req = request('draft-listing');
  req.method = 'POST';
  req.body = { lead_id: 'lead-1', title: 'Amina’s apartment' };
  // The append-only audit request is unrelated to the prospect's lifecycle.
  const realMock = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', async (url, init) => String(url).endsWith('/ambassador_events') ? new Response('null') : realMock(url, init));
  const res = response();
  await ambassadorHandler(req, res);
  assert.equal(res.code, 200);
  assert.equal(res.data.draft.status, 'awaiting_host');
  assert.ok(!calls.some(c => c.url.pathname.endsWith('/ambassador_leads') && c.method === 'PATCH'));
});

test('team standings include owners who accepted without exposing contact or listing records', async t => {
  installDatabase(t);
  const res = response();
  await ambassadorHandler(request('leaderboard'), res);
  assert.equal(res.code, 200);
  assert.equal(res.data.board[0].onboarded, 1);
  assert.ok(!JSON.stringify(res.data).includes('amina@example.com'));
  assert.ok(!JSON.stringify(res.data).includes('listing-1'));
});
