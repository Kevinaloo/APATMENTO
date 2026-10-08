import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { profiles } from '../api/lib/_profiles.js';
import { buildShare, renderShare } from '../api/lib/_listing-share.js';

const OLD = '691b63f4-7557-4146-b782-b256f5d28abd', NEW = 'a719fff4-697b-4f5a-b879-47fbad376683', OPS = '99999999-9999-4999-8999-999999999999';
const SESSION = '189b6931-6d6d-4abe-a4e3-47e78380ebf5', MOVE = '5a5a5a5a-5a5a-45a5-85a5-5a5a5a5a5a5a', LINK = 'ab964974-868c-4cef-bbef-899ccdb39d6d';
const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

/** A tiny in-memory stand-in for the four tables a move touches. */
function world({ caller, admin = false } = {}) {
  const t = {
    vs: { [OLD]: { user_id: OLD, identity_state: 'approved', identity_at: '2026-09-26', display_name: 'Kevin A.', document_country: 'KEN', document_type: 'Identity Card', cleared_tier: 1, last_session_id: 'x' }, [NEW]: { user_id: NEW, identity_state: 'declined' } },
    moves: [], links: [{ id: LINK, user_a: OLD, user_b: NEW, reason: 'same_document', status: 'open' }, { id: 'l2', user_a: OLD, user_b: NEW, reason: 'same_face', status: 'open' }],
    prints: [{ user_id: OLD, kind: 'document', hash: 'h1' }, { user_id: NEW, kind: 'document', hash: 'h1' }, { user_id: OLD, kind: 'id_number', hash: 'h2' }],
    sessions: { [SESSION]: { id: SESSION, user_id: NEW, state: 'declined', decline_reason: 'duplicate_identity', decision: {} } },
    profiles: { [OLD]: { id: OLD, email: 'unplannedworld@gmail.com', id_verification_status: 'approved' }, [NEW]: { id: NEW, email: 'thekevinaloo@gmail.com', id_verification_status: 'not_started' } },
    notes: [], mails: [], admin: [], audit: [],
  };
  const calls = [];
  const db = async (path, opts = {}) => {
    calls.push({ path, opts }); const m = opts.method || 'GET';
    if (path === 'notifications') { t.notes.push(opts.body); return []; }
    if (path === 'admin_audit_log') { t.audit.push(opts.body); return []; }
    if (path === 'ops_alerts') return [];
    if (path.startsWith('admin_users')) return admin ? [{ id: 'a' }] : [];
    if (path.startsWith('profiles?id=eq.') && m === 'GET') return [t.profiles[path.match(/eq\.([^&]+)/)[1]]].filter(Boolean);
    if (path.startsWith('profiles?id=in.')) return Object.values(t.profiles);
    if (path.startsWith('profiles?id=eq.') && m === 'PATCH') { Object.assign(t.profiles[path.match(/eq\.([^&]+)/)[1]], opts.body); return []; }
    if (path.startsWith('verification_sessions?user_id=eq.') && path.includes('duplicate_identity')) return Object.values(t.sessions).filter(s => s.user_id === path.match(/eq\.([^&]+)/)[1] && s.decline_reason === 'duplicate_identity');
    if (path.startsWith('verification_sessions?id=eq.') && m === 'GET') return [t.sessions[path.match(/eq\.([^&]+)/)[1]]].filter(Boolean);
    if (path.startsWith('verification_sessions?id=eq.') && m === 'PATCH') { Object.assign(t.sessions[path.match(/eq\.([^&]+)/)[1]], opts.body); return []; }
    if (path.startsWith('verification_status?user_id=in.')) return Object.values(t.vs).filter(v => v.identity_state === 'approved' && path.includes(v.user_id));
    if (path.startsWith('verification_status?user_id=eq.') && m === 'GET') return [t.vs[path.match(/eq\.([^&]+)/)[1]]].filter(Boolean);
    if (path.startsWith('verification_status?user_id=eq.') && m === 'PATCH') { Object.assign(t.vs[path.match(/eq\.([^&]+)/)[1]], opts.body); return []; }
    if (path.startsWith('verification_status?on_conflict')) { t.vs[opts.body.user_id] = { ...(t.vs[opts.body.user_id] || {}), ...opts.body }; return []; }
    if (path.startsWith('identity_links?or=(user_a.eq.')) return t.links.filter(l => l.status !== 'dismissed');
    if (path.startsWith('identity_links?id=eq.')) return t.links.filter(l => l.id === path.match(/eq\.([^&]+)/)[1]);
    if (path.startsWith('identity_links?user_a=eq.') && m === 'PATCH') { t.links.forEach(l => { if (!path.includes('status=in.') || ['open', 'same_person'].includes(l.status)) if (!path.includes('status=eq.move_requested') || l.status === 'move_requested') Object.assign(l, opts.body); }); return []; }
    if (path.startsWith('identity_fingerprints?user_id=eq.') && m === 'GET') return t.prints.filter(p => p.user_id === path.match(/eq\.([^&]+)/)[1]);
    if (path.startsWith('identity_fingerprints?on_conflict')) { opts.body.forEach(b => { if (!t.prints.some(p => p.user_id === b.user_id && p.kind === b.kind && p.hash === b.hash)) t.prints.push(b); }); return []; }
    if (path.startsWith('identity_fingerprints?user_id=eq.') && m === 'DELETE') { const u = path.match(/eq\.([^&]+)/)[1]; t.prints = t.prints.filter(p => p.user_id !== u); return []; }
    if (path.startsWith('identity_moves?status=eq.pending&expires_at=lt')) return [];
    if (path.startsWith('identity_moves') && m === 'POST') { const row = { id: MOVE, status: 'pending', requested_at: new Date().toISOString(), ...opts.body }; t.moves.push(row); return [row]; }
    if (path.startsWith('identity_moves?id=eq.') && m === 'PATCH') { const row = t.moves.find(x => path.includes(x.id) && (!path.includes('status=eq.pending') || x.status === 'pending')); if (!row) return []; Object.assign(row, opts.body); return [row]; }
    if (path.startsWith('identity_moves?id=eq.')) return t.moves.filter(x => path.includes(x.id));
    if (path.startsWith('identity_moves?from_user=eq.') && path.includes('to_user=eq.')) return t.moves.filter(x => x.status === 'pending');
    if (path.startsWith('identity_moves?from_user=eq.') && m === 'PATCH') { t.moves.filter(x => x.status === 'pending').forEach(x => Object.assign(x, opts.body)); return []; }
    if (path.startsWith('identity_moves?from_user=eq.')) return t.moves.filter(x => x.from_user === path.match(/eq\.([^&]+)/)[1] && x.status === 'pending');
    if (path.startsWith('identity_moves?to_user=eq.') && m === 'PATCH') { t.moves.filter(x => x.status === 'pending').forEach(x => Object.assign(x, opts.body)); return []; }
    if (path.startsWith('identity_moves?to_user=eq.')) return t.moves.filter(x => x.to_user === path.match(/eq\.([^&]+)/)[1]);
    if (path.startsWith('identity_moves?status=eq.pending&or=')) return t.moves.filter(x => x.status === 'pending');
    return [];
  };
  const deps = { db, session: async () => ({ user: { id: caller }, email: admin ? 'ops@example.test' : 'm@example.test', isAdmin: admin }), env: { SITE_URL: 'https://cabana.africa' },
    notifyAdmins: async (s, x) => { t.admin.push({ s, x }); }, mailTo: async m => { t.mails.push(m); }, didit: { configured: () => false } };
  return { t, calls, deps };
}
const res = () => ({ code: 200, data: null, headers: {}, setHeader() {}, status(c) { this.code = c; return this; }, json(d) { this.data = d; return this; } });
const post = (op, body) => ({ method: 'POST', query: { op }, headers: { authorization: 'Bearer t' }, body });

test('the new account asks, and the OLD account is the one that gets the email and notification', async () => {
  const w = world({ caller: NEW }), r = res();
  await profiles(post('identity-move', {}), r, w.deps);
  assert.equal(r.code, 200); assert.ok(r.data.ok);
  assert.equal(w.t.moves.length, 1);
  assert.deepEqual([w.t.moves[0].from_user, w.t.moves[0].to_user, w.t.moves[0].session_id], [OLD, NEW, SESSION]);
  assert.equal(w.t.mails.length, 1);
  assert.equal(w.t.mails[0].to, 'unplannedworld@gmail.com', 'the email goes to the account that holds the verification');
  assert.match(w.t.mails[0].ctaUrl, /^https:\/\/cabana\.africa\/profile\?move=[\w-]+#verification$/, 'it opens the member profile, not the operator console');
  assert.doesNotMatch(JSON.stringify(w.t.mails[0]), /thekevinaloo@gmail\.com/, 'the full address of the other account is never shown');
  assert.equal(w.t.notes.find(n => n.user_id === OLD).kind, 'profile');
  assert.ok(w.t.links.every(l => l.status === 'move_requested'));
  assert.equal(w.t.admin.length, 1, 'operators are told too, as a fallback');
});

test('asking twice does not create a second request or email', async () => {
  const w = world({ caller: NEW });
  await profiles(post('identity-move', {}), res(), w.deps);
  const r = res(); await profiles(post('identity-move', {}), r, w.deps);
  assert.ok(r.data.already); assert.equal(w.t.moves.length, 1); assert.equal(w.t.mails.length, 1);
});

test('if the other account is no longer verified there is nothing to move and the member is told to verify again', async () => {
  const w = world({ caller: NEW }); w.t.vs[OLD].identity_state = 'moved';
  const r = res(); await profiles(post('identity-move', {}), r, w.deps);
  assert.equal(r.code, 409); assert.equal(r.data.code, 'retry_verification');
});

test('only the account that holds the verification can answer, and approving moves everything', async () => {
  const w = world({ caller: NEW });
  await profiles(post('identity-move', {}), res(), w.deps);
  // the requester cannot approve their own request
  let r = res(); await profiles(post('identity-move-respond', { id: MOVE, decision: 'approve' }), r, w.deps);
  assert.equal(r.code, 404); assert.equal(w.t.vs[NEW].identity_state, 'declined');
  // the holder can
  const owner = world({ caller: OLD }); owner.t.moves = w.t.moves; owner.t.vs = w.t.vs; owner.t.links = w.t.links; owner.t.sessions = w.t.sessions; owner.t.prints = w.t.prints; owner.t.profiles = w.t.profiles;
  r = res(); await profiles(post('identity-move-respond', { id: MOVE, decision: 'approve' }), r, owner.deps);
  assert.equal(r.code, 200); assert.ok(r.data.moved);
  assert.equal(w.t.vs[NEW].identity_state, 'approved'); assert.equal(w.t.vs[NEW].display_name, 'Kevin A.');
  assert.equal(w.t.vs[OLD].identity_state, 'moved');
  assert.equal(w.t.profiles[NEW].id_verification_status, 'approved'); assert.equal(w.t.profiles[OLD].id_verification_status, 'not_started');
  assert.equal(w.t.sessions[SESSION].state, 'approved'); assert.equal(w.t.sessions[SESSION].decline_reason, null);
  assert.ok(owner.t.prints.every(p => p.user_id === NEW), 'fingerprints follow the identity');
  assert.equal(owner.t.prints.filter(p => p.kind === 'document').length, 1, 'no duplicate fingerprint rows');
  assert.ok(w.t.links.every(l => l.status === 'moved'));
  assert.equal(w.t.moves[0].status, 'approved'); assert.equal(w.t.moves[0].decided_via, 'owner');
  // a second tap cannot run it again
  r = res(); await profiles(post('identity-move-respond', { id: MOVE, decision: 'approve' }), r, owner.deps);
  assert.equal(r.code, 409);
});

test('declining keeps the verification where it is and tells operators', async () => {
  const w = world({ caller: NEW });
  await profiles(post('identity-move', {}), res(), w.deps);
  const owner = world({ caller: OLD }); Object.assign(owner.t, { moves: w.t.moves, vs: w.t.vs, links: w.t.links, profiles: w.t.profiles });
  const r = res(); await profiles(post('identity-move-respond', { id: MOVE, decision: 'decline' }), r, owner.deps);
  assert.ok(r.data.declined);
  assert.equal(w.t.vs[OLD].identity_state, 'approved'); assert.equal(w.t.vs[NEW].identity_state, 'declined');
  assert.ok(owner.calls.some(c => c.path === 'ops_alerts'));
  assert.ok(w.t.links.every(l => l.status === 'open'));
});

test('an operator can move it when the owner cannot get in, and members are told', async () => {
  const w = world({ caller: NEW });
  await profiles(post('identity-move', {}), res(), w.deps);
  const ops = world({ caller: OPS, admin: true }); Object.assign(ops.t, { moves: w.t.moves, vs: w.t.vs, links: w.t.links, sessions: w.t.sessions, prints: w.t.prints, profiles: w.t.profiles });
  const r = res(); await profiles(post('admin-link', { id: LINK, decision: 'move' }), r, ops.deps);
  assert.equal(r.code, 200); assert.ok(r.data.moved);
  assert.equal(w.t.vs[NEW].identity_state, 'approved'); assert.equal(w.t.moves[0].decided_via, 'operator');
  assert.equal(ops.t.mails.length, 2, 'both accounts are emailed');
  assert.ok(ops.t.audit.some(a => a.action === 'identity.move_operator'));
  // non-operators cannot
  const nope = world({ caller: NEW }); Object.assign(nope.t, { moves: w.t.moves, vs: w.t.vs, links: w.t.links });
  const r2 = res(); await profiles(post('admin-link', { id: LINK, decision: 'move' }), r2, nope.deps);
  assert.equal(r2.code, 403);
});

test('the console says what each button does and the member flow lives on the profile page', () => {
  const js = read('admin-views-people.js'), pr = read('profile.html');
  assert.match(js, /data-d="move"/); assert.match(js, /Keep both verified/); assert.match(js, /Only records it\. Nothing changes/);
  assert.match(pr, /identity-move-respond/); assert.match(pr, /This request is for a different account/);
  assert.match(pr, /location\.search \+ location\.hash/, 'the ?move= link survives the sign-in round trip');
  assert.match(read('api/agents.js'), /admin\.html#\/profiles\?tab=links/, 'the operator email deep-links to Linked accounts');
});

/* ── share links ─────────────────────────────────────────────────── */
test('a share link unfolds as a real card with the all-in price and lands on the exact listing', async () => {
  const id = '2d488e1a-3582-409f-ac3c-5f67adc90c74';
  const fetchImpl = async url => String(url).includes('rpc/cabana_all_in_prices')
    ? { ok: true, json: async () => [7200] }
    : { ok: true, json: async () => [{ id, title: 'Elegant 1Bedroom <script>', city: 'Nairobi', area: 'Kileleshwa', price_night: 6800, currency: 'KES', photos: ['https://img.example/a.jpg'], service: 'stays' }] };
  const info = await buildShare(id, { env: { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' }, fetchImpl });
  assert.equal(info.dest, `/apartments?open=${id}`);
  assert.match(info.priceLine, /KES 7,200 \/ night/);
  const html = renderShare(info, { id });
  assert.match(html, /og:image" content="https:\/\/img\.example\/a\.jpg"/);
  assert.match(html, /cabana\.africa\/apartments\?open=2d488e1a[^"]*utm_source=share/);
  assert.doesNotMatch(html, /<script>[^<]*Elegant/, 'titles are escaped');
  assert.equal(await buildShare('../etc/passwd', { env: {}, fetchImpl }), null);
  assert.match(renderShare(null, { id }), /location\.replace\("https:\/\/cabana\.africa"\)/, 'an unknown listing still lands on Cabana');
});

test('the support launcher cannot paint before its stylesheet and keeps clear of bars', () => {
  const js = read('cabana-support.js'), css = read('cabana-support.css');
  assert.match(js, /cbn-sup-root:not\(\.cbn-sup--ready\)\{display:none!important\}/);
  assert.match(js, /link\.addEventListener\('load', reveal\)/);
  assert.match(js, /function dockBarTop/); assert.match(js, /function dockScroll/); assert.match(js, /cbn\.support\.dock/);
  assert.match(css, /\.cbn-sup--tucked #cbn-sup-launcher/); assert.match(css, /#cbn-sup-panel[\s\S]*visibility: hidden/);
});
