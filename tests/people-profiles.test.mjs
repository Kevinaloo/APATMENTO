import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createHmac } from 'node:crypto';
import { profiles, nameProblem, handleProblem, normalizeOrg } from '../api/lib/_profiles.js';
import { AVATAR_RANGES, cleanAvatar } from '../api/lib/_avatar-spec.js';
import { decide, moderatePhoto, sniffImage } from '../api/lib/_moderation.js';
import { summariseDecision, verifyWebhook, mapStatus } from '../api/lib/_didit.js';

const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const ME = '11111111-1111-4111-8111-111111111111', HOST = '22222222-2222-4222-8222-222222222222', TRAVELLER = '33333333-3333-4333-8333-333333333333', ORG = '44444444-4444-4444-8444-444444444444';

function loadAvatars() {
  const ctx = { console };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(read('cabana-avatars.js'), ctx);
  return ctx.CabanaAvatars;
}

/* ── avatars ─────────────────────────────────────────────────────── */
test('the browser and server agree on every avatar option range', () => {
  const AV = loadAvatars();
  assert.deepEqual(JSON.parse(JSON.stringify(AV.RANGES)), JSON.parse(JSON.stringify(AVATAR_RANGES)));
});

test('every catalogue character is valid and renders as self-contained SVG', () => {
  const AV = loadAvatars(), C = AV.catalogue();
  const all = [...C.people, ...C.spirits, ...C.emblems];
  assert.ok(C.people.length >= 30 && C.spirits.length === 12 && C.emblems.length >= 8);
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'unique ids');
  for (const p of all) {
    assert.deepEqual(cleanAvatar(p.spec), JSON.parse(JSON.stringify(AV.validate(p.spec))), p.id);
    const svg = AV.render(p.spec, { size: 64, name: 'Safari Nest' });
    assert.match(svg, /^<svg class="cav/);
    assert.doesNotMatch(svg, /<script|javascript:|href=|NaN|undefined/, p.id);
  }
  for (let i = 0; i < 300; i++) for (const k of ['p', 'a', 'e']) assert.ok(cleanAvatar(AV.surprise(k, i)), `surprise ${k} ${i}`);
});

test('a default avatar is never a guessed human face', () => {
  const AV = loadAvatars();
  for (let i = 0; i < 50; i++) assert.equal(AV.defaultFor('user-' + i, 'individual').k, 'a');
  assert.equal(AV.defaultFor('x', 'organization').k, 'e');
});

test('avatar specs are clamped to known values and nothing else survives', () => {
  assert.equal(cleanAvatar({ k: 'p', s: 99 }), null);
  assert.equal(cleanAvatar({ k: 'z' }), null);
  assert.equal(cleanAvatar('<svg>'), null);
  const ok = cleanAvatar({ k: 'a', a: 3, t: 0, x: 0, b: 1, mo: 1, n: 'milia', onload: 'x', href: 'javascript:alert(1)' });
  assert.deepEqual(ok, { v: 1, k: 'a', a: 3, t: 0, x: 0, b: 1, mo: 1, n: 'milia' });
  assert.equal(cleanAvatar({ k: 'a', a: 3, t: 0, x: 0, b: 1, mo: 1, n: '<b>' }).n, undefined);
});

/* ── names and handles ───────────────────────────────────────────── */
test('names cannot fake a tick, impersonate Cabana or carry contact details', () => {
  for (const bad of ['Amani ✓', 'Amani ✔️', 'Amani ☑', 'Amani 💜', 'Cabana Support', 'Official Mara Tours', 'Verified Host', 'Call 0712 345 678', 'amani@mail.com'])
    assert.ok(nameProblem(bad), bad);
  for (const good of ['Amani Otieno', 'Zawadi W.', 'Mara Trails Ltd', 'Nyumba ya Bahari', 'Ọlá Adébáyọ̀'])
    assert.equal(nameProblem(good), null, good);
  assert.equal(nameProblem('Cabana Support', { admin: true }), null);
});

test('handles are shaped, and reserved words are refused', () => {
  assert.ok(handleProblem('admin'));
  assert.ok(handleProblem('cabana.help'));
  assert.ok(handleProblem('a'));
  assert.ok(handleProblem('amani..o'));
  assert.ok(handleProblem('123456'));
  assert.equal(handleProblem('amani.o'), null);
  assert.equal(normalizeOrg('The Mara Trails Ltd.'), normalizeOrg('mara trails limited'));
});

/* ── moderation ──────────────────────────────────────────────────── */
const zero = { nudity: 0, sexual: 0, minor_at_risk: 0, violence: 0, weapons: 0, hate: 0, drugs: 0, self_harm: 0, contact_info: 0, shock: 0 };
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)]);
test('photo decisions publish only when every score is low', () => {
  assert.equal(decide({ scores: zero }).decision, 'approve');
  assert.equal(decide({ scores: { ...zero, nudity: 0.9 } }).decision, 'reject');
  assert.equal(decide({ scores: { ...zero, minor_at_risk: 0.25 } }).severity, 'critical');
  assert.equal(decide({ scores: { ...zero, contact_info: 0.8 } }).decision, 'reject');
  assert.equal(decide({ scores: { ...zero, sexual: 0.35 } }).decision, 'review');
  assert.equal(decide({ scores: { ...zero, weapons: 0.5 } }).decision, 'review');
});
test('a moderation outage sends the photo to a person, never straight to the profile', async () => {
  const down = async () => { throw new Error('down'); };
  const r = await moderatePhoto(jpeg, { ai: down, groq: down });
  assert.equal(r.decision, 'review');
  const garbage = await moderatePhoto(jpeg, { ai: async () => ({ choices: [{ message: { content: 'looks fine to me' } }] }), groq: down });
  assert.equal(garbage.decision, 'review');
  const fine = await moderatePhoto(jpeg, { ai: async () => ({ model: 't', choices: [{ message: { content: '```json\n' + JSON.stringify({ ...zero, people: 1, summary: 'portrait' }) + '\n```' } }] }), groq: down });
  assert.equal(fine.decision, 'approve');
  assert.equal((await moderatePhoto(Buffer.from('GIF89a' + 'x'.repeat(40)))).decision, 'reject');
  assert.equal(sniffImage(jpeg), 'image/jpeg');
});

/* ── identity ────────────────────────────────────────────────────── */
test('Didit results reduce to an outcome; minors and expired documents are declined', () => {
  const now = new Date('2026-09-26T00:00:00Z');
  const base = { status: 'Approved', vendor_data: ME, id_verifications: [{ status: 'Approved', first_name: 'KEVIN', last_name: 'ALOO OKOTH', date_of_birth: '1995-04-02', document_type: 'Identity Card', issuing_state: 'KEN', expiration_date: '2031-01-01', document_number: '12345678', address: 'secret' }] };
  const ok = summariseDecision(base, { now });
  assert.equal(ok.state, 'approved');
  assert.equal(ok.verifiedName, 'Kevin A.');
  assert.equal(ok.documentCountry, 'KEN');
  assert.doesNotMatch(JSON.stringify(ok), /12345678|secret|1995/, 'no ID number, address or birth date is kept');
  assert.equal(summariseDecision({ ...base, id_verifications: [{ ...base.id_verifications[0], date_of_birth: '2010-01-01' }] }, { now }).state, 'declined');
  assert.equal(summariseDecision({ ...base, id_verifications: [{ ...base.id_verifications[0], expiration_date: '2025-01-01' }] }, { now }).declineReason, 'document_expired');
  assert.equal(mapStatus('In Review'), 'review');
  assert.equal(mapStatus('Abandoned'), 'expired');
});
test('Didit webhooks must be signed and fresh', () => {
  const body = { session_id: 'abc', status: 'Approved', webhook_type: 'status.updated', decision: { score: 100.0, b: 1 } };
  const secret = 's3cret', ts = String(Math.floor(Date.now() / 1000));
  const canonical = JSON.stringify({ decision: { b: 1, score: 100 }, session_id: 'abc', status: 'Approved', webhook_type: 'status.updated' });
  const sig = createHmac('sha256', secret).update(canonical).digest('hex');
  assert.equal(verifyWebhook({ body, secret, headers: { 'x-timestamp': ts, 'x-signature-v2': sig } }).ok, true);
  assert.equal(verifyWebhook({ body, secret, headers: { 'x-timestamp': ts, 'x-signature-v2': 'f'.repeat(64) } }).ok, false);
  assert.equal(verifyWebhook({ body, secret, headers: { 'x-timestamp': String(Number(ts) - 900), 'x-signature-v2': sig } }).reason, 'stale');
});

/* ── the API ─────────────────────────────────────────────────────── */
const rows = {
  [ME]: { id: ME, first_name: 'amani', display_name: 'Amani O.', published: false, handle: 'amani.o', account_type: 'individual', avatar: null, photo_url: null, headline: '', org_kind: null, identity_verified: false, org_verified: false, provider: false, badge: null, verified_as: null, professional: false, allow_follow: true, hidden: false },
  [HOST]: { id: HOST, first_name: 'Jets', display_name: 'Jets Nest', published: true, handle: 'jets.nest', account_type: 'individual', avatar: { k: 'a', a: 0, t: 0, x: 0, b: 3, mo: 1 }, photo_url: null, headline: 'Kilimani stays', org_kind: null, identity_verified: true, org_verified: false, provider: true, badge: 'provider', verified_as: 'individual', professional: true, allow_follow: true, hidden: false },
  [TRAVELLER]: { id: TRAVELLER, first_name: 'Neema', display_name: 'Secret Name', published: false, handle: 'neema', account_type: 'individual', avatar: null, photo_url: null, headline: 'hidden', org_kind: null, identity_verified: false, org_verified: false, provider: false, badge: null, verified_as: null, professional: false, allow_follow: true, hidden: false },
  [ORG]: { id: ORG, first_name: 'Mara', display_name: 'Mara Trails Ltd', published: true, handle: 'maratrails', account_type: 'organization', avatar: null, photo_url: null, headline: '', org_kind: 'tour_operator', identity_verified: true, org_verified: true, provider: false, badge: 'organization', verified_as: 'organization', professional: false, allow_follow: true, hidden: false },
};
function harness({ peers = [], caller = ME, admin = false } = {}) {
  const calls = [];
  const mpp = { user_id: ME, display_name: 'Amani O.', bio: '', published: false, handle: 'amani.o', account_type: 'individual', headline: '', theme: 'equator', languages: [], interests: [], show_followers: true, allow_follow: true, show_listings: true, photo_status: 'none' };
  const db = async (path, opts = {}) => {
    calls.push({ path, opts });
    if (path === 'rpc/cabana_people_cards') return opts.body.p_ids.map(i => rows[i]).filter(Boolean);
    if (path === 'rpc/cabana_people_stats') return { followers: 3, following: 1, listings: 0, reviews: 0, rating: null, roles: ['traveller'], member_since: '2026-01', operators: [] };
    if (path === 'rpc/cabana_follow') return { following: opts.body.p_on, new: true, followers: 4 };
    if (path.startsWith('chat_conversations')) return peers.length ? [{ host_id: caller, guest_id: peers[0] }] : [];
    if (path.startsWith('member_public_profiles?user_id=eq.' + ME) && (!opts.method || opts.method === 'GET')) return [mpp];
    if (path.startsWith('member_public_profiles?handle=eq.')) return path.includes('taken.name') ? [{ user_id: TRAVELLER }] : [];
    if (path.startsWith('member_public_profiles') && opts.method === 'PATCH') return [{ ...mpp, ...opts.body }];
    if (path.startsWith('member_public_profiles')) return [];
    if (path.startsWith('organization_verifications?status=eq.approved')) return [{ user_id: ORG, legal_name: 'Mara Trails Ltd' }];
    if (path.startsWith('admin_users')) return admin ? [{ id: 'a' }] : [];
    return [];
  };
  const session = async () => ({ user: { id: caller }, email: 'qa@example.test', isAdmin: false });
  const storage = { remove: async () => {}, download: async () => jpeg, upload: async () => {}, publicUrl: () => 'https://x/p.webp', sign: async () => 'https://signed' };
  return { calls, deps: { db, session, storage, env: {}, moderate: async () => ({ decision: 'approve' }), didit: { configured: () => false } } };
}
function res() { return { code: 200, data: null, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json(d) { this.data = d; return this; } }; }
const get = (q, auth = true) => ({ method: 'GET', query: q, headers: auth ? { authorization: 'Bearer t' } : {} });
const post = (op, body) => ({ method: 'POST', query: { op }, headers: { authorization: 'Bearer t' }, body });

test('cards reveal hosts and organisations, hide private travellers from strangers, and show peers a first name only', async () => {
  const h = harness(), r = res();
  await profiles(get({ op: 'cards', ids: [HOST, TRAVELLER, ORG].join(',') }, false), r, h.deps);
  assert.equal(r.data.cards[HOST].badge, 'provider');
  assert.equal(r.data.cards[ORG].badge, 'organization');
  assert.equal(r.data.cards[TRAVELLER], null);
  const text = JSON.stringify(r.data);
  assert.doesNotMatch(text, /email|phone|mpesa|identity_verified|professional|hidden/);
  const p = harness({ peers: [TRAVELLER] }), r2 = res();
  await profiles(get({ op: 'cards', ids: TRAVELLER }), r2, p.deps);
  assert.equal(r2.data.cards[TRAVELLER].name, 'Neema');
  assert.equal(r2.data.cards[TRAVELLER].headline, '');
  assert.equal(r2.data.cards[TRAVELLER].handle, null);
});

test('profile saves reject spoofed ticks, contact details and taken handles, and never accept badges', async () => {
  const h = harness();
  let r = res(); await profiles(post('save', { display_name: 'Amani ✓' }), r, h.deps);
  assert.equal(r.code, 400); assert.equal(r.data.field, 'display_name');
  r = res(); await profiles(post('save', { bio: 'WhatsApp me on +254 712 345 678' }), r, h.deps);
  assert.equal(r.code, 400);
  r = res(); await profiles(post('save', { handle: 'taken.name' }), r, h.deps);
  assert.equal(r.code, 409);
  r = res(); await profiles(post('save', { display_name: 'Mara Trails Limited' }), r, h.deps);
  assert.equal(r.code, 409, 'a verified organisation owns its name');
  r = res(); await profiles(post('save', { display_name: 'Amani Otieno', badge: 'provider', identity_verified: true, photo_url: 'https://evil', published: true }), r, h.deps);
  assert.equal(r.code, 200);
  const patch = h.calls.find(c => c.opts.method === 'PATCH' && c.path.startsWith('member_public_profiles'));
  assert.deepEqual(Object.keys(patch.opts.body).sort(), ['display_name', 'published', 'updated_at']);
});

test('only verified members can publish photos; follows and reports bind to the session', async () => {
  const h = harness();
  let r = res(); await profiles(post('photo', { path: `${ME}/12345678-aaaa.webp` }), r, h.deps);
  assert.equal(r.code, 403); assert.equal(r.data.code, 'verify_first');
  r = res(); await profiles(post('photo', { path: `${HOST}/12345678-aaaa.webp` }), r, h.deps);
  assert.equal(r.code, 400, 'cannot point at someone else’s upload');
  r = res(); await profiles(post('follow', { id: ME }), r, h.deps);
  assert.equal(r.code, 400);
  r = res(); await profiles(post('follow', { id: HOST, on: true }), r, h.deps);
  assert.equal(r.data.following, true);
  const rpc = h.calls.find(c => c.path === 'rpc/cabana_follow');
  assert.equal(rpc.opts.body.p_follower, ME);
  r = res(); await profiles(post('report', { id: HOST, reason: 'made_up' }), r, h.deps);
  assert.equal(r.code, 400);
});

test('operator queues are closed to members', async () => {
  const h = harness(), r = res();
  await profiles(get({ op: 'admin-queue', kind: 'photos' }), r, h.deps);
  assert.equal(r.code, 403);
  const r2 = res();
  await profiles(post('admin-decide', { kind: 'org', id: ORG, decision: 'approve' }), r2, h.deps);
  assert.equal(r2.code, 403);
});

test('an unsigned Didit webhook is refused when a secret is configured', async () => {
  const h = harness(), r = res();
  h.deps.env = { DIDIT_WEBHOOK_SECRET: 'x' };
  await profiles({ method: 'POST', query: { action: 'didit-webhook' }, headers: {}, body: { session_id: ME, status: 'Approved' } }, r, h.deps);
  assert.equal(r.code, 401);
});

/* ── wiring ──────────────────────────────────────────────────────── */
test('routes, rewrites and migrations are in place', () => {
  const vercel = JSON.parse(read('vercel.json'));
  const has = s => vercel.rewrites.find(r => r.source === s);
  assert.equal(has('/api/people').destination, '/api/agents?action=people');
  assert.equal(has('/api/didit-webhook').destination, '/api/agents?action=didit-webhook');
  assert.ok(has('/u/:handle([A-Za-z0-9._]{3,24})'));
  assert.match(read('api/agents.js'), /a === 'people' \|\| a === 'didit-webhook'/);
  const sql = read('supabase/migrations/20260926121000_people_provider_badge.sql');
  assert.match(sql, /then 'provider'/);
  assert.match(sql, /security definer set search_path = ''/);
  assert.match(read('supabase/migrations/20260926120000_people_profiles_v2.sql'), /revoke insert, update, delete on public\.id_verifications/);
  for (const f of ['apartments.html', 'roommates.html', 'chat.js']) assert.match(read(f), /data-cp-tick/, f);
});
