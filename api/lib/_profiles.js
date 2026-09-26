/* ════════════════════════════════════════════════════════════════════
   CABANA · PEOPLE API   /api/people  (→ /api/agents?action=people)
   ────────────────────────────────────────────────────────────────────
   One courier for individual and organisation profiles.

   Reads   GET  ?op=cards&ids=…        mini cards for avatars and badges
           GET  ?op=profile&id|handle  one full public profile
           GET  ?op=follows&id&list=followers|following
           GET  ?op=search&q=
           GET  ?op=verify-status      (self) identity check progress
   Writes  POST ?op=save               (self) profile studio
           POST ?op=follow             (self) follow / unfollow
           POST ?op=report             (self) report a profile
           POST ?op=photo              (self, verified) publish a photo
           POST ?op=photo-state        (self) show photo or avatar
           POST ?op=verify-start       (self) open a Didit ID check
           POST ?op=org-submit         (self, verified) request gold
           POST ?op=org-withdraw       (self)
           POST ?action=didit-webhook  Didit → Cabana nudge
   Admin   GET  ?op=admin-queue&kind=photos|orgs|reports|verified
           GET  ?op=admin-file&kind=photo|org&id=
           POST ?op=admin-decide

   Ticks (computed in Postgres, never stored or client-set)
     person        purple  identity verified individual
     organization  gold    verified organisation
     provider      reef    verified person or organisation that
                           actively offers services on Cabana

   Privacy contract
     · The only public projection is cabana_people_cards(): no email,
       phone, payment, ID number, document or exact location exists in
       any response.
     · A traveller who has not published their profile is invisible to
       strangers. People they are already messaging see a first name.
     · Every write binds to the caller's verified session; no body field
       can name who is acting, claim a role or set a badge.
   ════════════════════════════════════════════════════════════════════ */
import { createHash } from 'node:crypto';
import { publicText, hasContact } from './_people.js';
import { cleanAvatar } from './_avatar-spec.js';
import { moderatePhoto } from './_moderation.js';
import * as Didit from './_didit.js';
import * as Identity from './_identity.js';

const SITE = 'https://cabana.africa';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const LANGS = ['en', 'sw', 'fr', 'ar', 'pt', 'am', 'so', 'yo', 'ha', 'ig', 'zu', 'xh', 'af', 'rw', 'lg', 'es', 'de', 'it', 'zh', 'hi'];
export const INTERESTS = ['beaches', 'safari', 'city-breaks', 'food', 'nightlife', 'culture', 'hiking', 'wellness', 'road-trips', 'diving',
  'photography', 'music', 'art', 'family', 'remote-work', 'budget', 'luxury', 'festivals', 'wildlife', 'history'];
export const THEMES = ['equator', 'sunrise', 'ocean', 'savanna', 'night', 'jacaranda', 'reef', 'city', 'kili', 'dunes', 'forest', 'kente'];
export const ORG_KINDS = ['company', 'hotel', 'property_manager', 'tour_operator', 'travel_agency', 'car_hire', 'restaurant',
  'event_organiser', 'ngo', 'government', 'school', 'other'];
export const BADGES = ['person', 'organization', 'provider'];
const REPORT_REASONS = ['impersonation', 'inappropriate_photo', 'offensive_content', 'scam', 'spam', 'other'];

const RESERVED = new Set(['admin', 'administrator', 'root', 'system', 'support', 'help', 'helpdesk', 'official', 'verified', 'verify',
  'staff', 'team', 'security', 'safety', 'trust', 'api', 'www', 'mail', 'me', 'you', 'u', 'profile', 'profiles', 'settings', 'login',
  'logout', 'signup', 'signin', 'auth', 'account', 'about', 'press', 'host', 'hosts', 'agent', 'agents', 'ambassador', 'ambassadors',
  'moderator', 'mod', 'mods', 'everyone', 'here', 'info', 'contact', 'billing', 'payments', 'pay', 'mpesa', 'm-pesa', 'null',
  'undefined', 'anonymous', 'guest', 'member', 'members', 'people', 'person', 'search', 'explore', 'home', 'news', 'blog', 'jobs']);

/* ── text hygiene ─────────────────────────────────────────────────── */
const INVISIBLE = /[​-‏‪-‮⁠-⁯﻿­]/g;
// Glyphs people paste to imitate a verification badge.
const FAKE_BADGE = /[✓✔☑✅☐☒\u{1F7E3}\u{1F7E1}\u{1F49C}\u{1F49B}\u{1F538}\u{1F539}\u{2B50}\u{1F31F}\u{1F451}\u{1F396}\u{1F3C5}\u{1F947}\u{1F6E1}\u{2622}\u{1F512}]/u;
const IMPERSONATE = /\b(cabana|apatmento)\b|\b(official|verified|customer\s*care|support\s*team|admin(istrator)?|moderator)\b/i;

export function clean(value, max) {
  return publicText(String(value ?? '').normalize('NFKC').replace(INVISIBLE, ''), max).replace(/\s{2,}/g, ' ');
}
export function titleName(s) {
  s = clean(s, 60);
  if (!s) return '';
  if (s === s.toUpperCase() || s === s.toLowerCase()) s = s.toLowerCase().replace(/(^|[\s'-])\p{L}/gu, c => c.toUpperCase());
  return s;
}
export function normalizeOrg(s) {
  return String(s || '').normalize('NFKC').toLowerCase()
    .replace(/\b(ltd|limited|inc|incorporated|co|company|plc|llc|llp|group|holdings|the)\b/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}
export function nameProblem(name, { admin = false } = {}) {
  if (!name) return 'Choose a display name.';
  if (FAKE_BADGE.test(name)) return 'Badges are added by Cabana after verification. Remove checkmark or badge symbols from your name.';
  if (!admin && IMPERSONATE.test(name)) return 'Names cannot include “Cabana”, “official”, “verified”, “support” or similar words.';
  if (hasContact(name)) return 'Keep contact details out of your name.';
  return null;
}
export function normalizeHandle(h) {
  return String(h || '').normalize('NFKC').trim().replace(/^@+/, '').toLowerCase();
}
export function handleProblem(h, { admin = false } = {}) {
  if (!/^[a-z0-9][a-z0-9._]{1,22}[a-z0-9]$/.test(h)) return 'Handles are 3–24 letters, numbers, dots or underscores, starting and ending with a letter or number.';
  if (/[._]{2}/.test(h)) return 'Handles cannot contain two dots or underscores in a row.';
  if (RESERVED.has(h)) return 'That handle is reserved.';
  if (!admin && /cabana|apatmento/.test(h)) return 'Handles cannot include “cabana” or “apatmento”.';
  if (/^\d+$/.test(h)) return 'Handles need at least one letter.';
  return null;
}
function slug(s) {
  return String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').replace(/\.{2,}/g, '.').slice(0, 18).replace(/\.+$/, '');
}
function cleanWebsite(v) {
  if (!v) return null;
  let url;
  try { url = new URL(/^https?:\/\//i.test(v) ? v : 'https://' + v); } catch { return undefined; }
  if (!/\./.test(url.hostname) || url.username || url.password) return undefined;
  url.protocol = 'https:'; url.hash = '';
  const out = url.href.replace(/\/$/, '');
  return out.length <= 120 ? out : undefined;
}

/* ── helpers bound to one request ─────────────────────────────────── */
function makeStorage({ env, fetchImpl }) {
  const base = `${env.SUPABASE_URL}/storage/v1`;
  const auth = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
  const enc = p => p.split('/').map(encodeURIComponent).join('/');
  return {
    publicUrl: (bucket, path) => `${base}/object/public/${bucket}/${enc(path)}`,
    async download(bucket, path, max) {
      const r = await fetchImpl(`${base}/object/${bucket}/${enc(path)}`, { headers: auth, signal: AbortSignal.timeout(10000) });
      if (!r.ok) throw Object.assign(new Error('The upload could not be found. Please try again.'), { status: 404 });
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > max) throw Object.assign(new Error('That file is too large.'), { status: 413 });
      return buf;
    },
    async upload(bucket, path, bytes, contentType) {
      const r = await fetchImpl(`${base}/object/${bucket}/${enc(path)}`, {
        method: 'POST', headers: { ...auth, 'Content-Type': contentType, 'x-upsert': 'true', 'Cache-Control': 'max-age=31536000' }, body: bytes,
      });
      if (!r.ok) throw Object.assign(new Error('Photo could not be saved.'), { status: 502 });
    },
    async remove(bucket, paths) {
      const list = paths.filter(Boolean);
      if (!list.length) return;
      await fetchImpl(`${base}/object/${bucket}`, { method: 'DELETE', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: list }) }).catch(() => {});
    },
    async sign(bucket, path, expiresIn = 300) {
      const r = await fetchImpl(`${base}/object/sign/${bucket}/${enc(path)}`, {
        method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn }),
      });
      if (!r.ok) return null;
      const j = await r.json().catch(() => ({}));
      const rel = j.signedURL || j.signedUrl;
      return rel ? `${base}${rel.startsWith('/') ? '' : '/'}${rel}` : null;
    },
  };
}

const bodyOf = req => { const b = req.body; if (typeof b === 'string') { try { return JSON.parse(b); } catch { return {}; } } return b || {}; };
const err = (status, message, extra) => Object.assign(new Error(message), { status, ...extra });

export async function profiles(req, res, deps) {
  const env = deps.env || process.env;
  const fetchImpl = deps.fetchImpl || fetch;
  const db = deps.db;
  const rpc = (fn, args) => db(`rpc/${fn}`, { method: 'POST', body: args });
  const storage = deps.storage || makeStorage({ env, fetchImpl });
  const moderate = deps.moderate || moderatePhoto;
  const didit = deps.didit || { create: o => Didit.createSession({ ...o, env, fetchImpl }), decision: id => Didit.fetchDecision(id, { env, fetchImpl }), configured: () => Didit.diditConfigured(env) };
  const now = () => (deps.now ? deps.now() : new Date());
  const op = String(req.query.action === 'didit-webhook' ? 'webhook' : (req.query.op || ''));

  async function caller(required) {
    if (!req.headers.authorization) { if (required) throw err(401, 'Please sign in.'); return null; }
    try { return await deps.session(req); } catch (e) { if (required) throw e; return null; }
  }
  async function isAdmin(s) {
    if (!s) return false;
    if (s.isAdmin) return true;
    const rows = await db(`admin_users?email=eq.${encodeURIComponent(s.email || '')}&select=id&limit=1`).catch(() => []);
    return rows.length > 0;
  }
  async function notify(userId, title, body, url, kind, meta) {
    await db('notifications', { method: 'POST', body: { user_id: userId, title, body, url, kind, read: false, meta: meta || {} } }).catch(() => {});
  }

  /* ── cards ─────────────────────────────────────────────────────── */
  async function rawCards(ids) {
    if (!ids.length) return new Map();
    const rows = await rpc('cabana_people_cards', { p_ids: ids });
    return new Map((rows || []).map(r => [r.id, r]));
  }
  async function peersOf(callerId, ids) {
    if (!callerId || !ids.length) return new Set();
    const list = ids.filter(i => i !== callerId).join(',');
    if (!list) return new Set();
    const rows = await db(`chat_conversations?or=(and(host_id.eq.${callerId},guest_id.in.(${list})),and(guest_id.eq.${callerId},host_id.in.(${list})))&select=host_id,guest_id&limit=500`).catch(() => []);
    const out = new Set();
    rows.forEach(r => { out.add(r.host_id); out.add(r.guest_id); });
    out.delete(callerId);
    return out;
  }
  function levelFor(row, callerId, peers) {
    if (!row || row.hidden) return null;
    if (callerId && callerId === row.id) return 'self';
    if (row.published) return 'full';
    if (row.professional || row.org_verified) return 'basic';
    if (peers && peers.has(row.id)) return 'peer';
    return null;
  }
  function toCard(row, level) {
    const org = row.account_type === 'organization';
    const first = titleName(row.first_name);
    const chosen = clean(row.display_name, 60);
    const name = (level === 'self' || level === 'full' ? chosen : '') || (org ? chosen : '') || (hasContact(first) ? '' : first) || (org ? 'Cabana organisation' : 'Cabana member');
    return {
      id: row.id, name, level,
      handle: level === 'peer' ? null : row.handle || null,
      type: org ? 'organization' : 'individual',
      avatar: cleanAvatar(row.avatar),
      photo: row.photo_url || null,
      badge: BADGES.includes(row.badge) ? row.badge : null,
      verified_as: row.verified_as === 'organization' || row.verified_as === 'individual' ? row.verified_as : null,
      headline: level === 'self' || level === 'full' ? clean(row.headline, 80) : '',
      org_kind: org && ORG_KINDS.includes(row.org_kind) ? row.org_kind : null,
      can_follow: level !== 'self' && level !== 'peer' && row.allow_follow !== false,
    };
  }
  async function cardsFor(ids, callerId) {
    const map = await rawCards(ids);
    const needsPeer = ids.filter(i => { const r = map.get(i); return r && !r.hidden && !r.published && !r.professional && !r.org_verified && i !== callerId; });
    const peers = await peersOf(callerId, needsPeer);
    const out = {};
    for (const id of ids) {
      const row = map.get(id), level = levelFor(row, callerId, peers);
      out[id] = level ? toCard(row, level) : null;
    }
    return out;
  }

  async function ensureRow(userId) {
    const [row] = await db(`member_public_profiles?user_id=eq.${userId}&select=*`);
    if (row) return row;
    const [p] = await db(`profiles?id=eq.${userId}&select=first_name,last_name`).catch(() => [null]);
    const first = titleName(p?.first_name), last = titleName(p?.last_name);
    const display = (first ? `${first}${last ? ' ' + last[0] + '.' : ''}` : 'Cabana member').slice(0, 60);
    const handle = await suggestHandle(first ? `${first}${last ? '.' + last : ''}` : 'traveller', userId);
    const [created] = await db('member_public_profiles?on_conflict=user_id', {
      method: 'POST', prefer: 'resolution=ignore-duplicates,return=representation',
      body: { user_id: userId, display_name: hasContact(display) ? 'Cabana member' : display, bio: '', published: false, handle, updated_at: now().toISOString() },
    });
    if (created) return created;
    const [again] = await db(`member_public_profiles?user_id=eq.${userId}&select=*`);
    return again;
  }
  async function suggestHandle(seed, userId) {
    let baseH = slug(seed);
    if (baseH.length < 3 || handleProblem(baseH)) baseH = 'traveller';
    const h = createHash('sha256').update(String(userId)).digest();
    const candidates = [baseH, `${baseH}${h[0] % 90 + 10}`, `${baseH}.${h.readUInt16BE(1) % 900 + 100}`, `${baseH}${h.readUInt32BE(3) % 90000 + 10000}`]
      .map(c => c.slice(0, 24)).filter(c => !handleProblem(c));
    const taken = await db(`member_public_profiles?handle=in.(${candidates.map(encodeURIComponent).join(',')})&select=handle`).catch(() => []);
    const used = new Set(taken.map(t => t.handle));
    return candidates.find(c => !used.has(c)) || `member${h.readUInt32BE(7) % 900000 + 100000}`;
  }

  /* ── identity sync ─────────────────────────────────────────────── */
  async function syncSession(row, { force = false } = {}) {
    const decision = await didit.decision(row.didit_session_id);
    const s = Didit.summariseDecision(decision, { now: now() });
    if (s.vendorData && s.vendorData !== row.user_id) {
      console.warn('[people] didit vendor_data mismatch', row.id);
      return row.state;
    }
    // One person, one verified identity. Didit's own duplicate matches and
    // our keyed fingerprints decide whether an approval stands as-is.
    let outcome = { action: 'approve' };
    if (s.state === 'approved' || s.state === 'review') {
      try { outcome = await Identity.assess({ db, rpc, userId: row.user_id, sessionRowId: row.id, decision, key: Identity.pepper(env) }); }
      catch (e) { console.warn('[people] identity assess failed', e.message); }
    }
    let state = s.state, declineReason = s.declineReason;
    if (s.state === 'approved' && outcome.action === 'review') { state = 'review'; declineReason = 'identity_review'; }
    if (s.state === 'approved' && outcome.action === 'duplicate') { state = 'declined'; declineReason = 'duplicate_identity'; }
    if (!force && row.state === state && row.decline_reason === declineReason && Didit.TERMINAL.has(state)) return state;
    const at = now().toISOString();
    await db(`verification_sessions?id=eq.${row.id}`, {
      method: 'PATCH', body: {
        state, decision: { ...s.stored, cabana: { outcome: outcome.action, hint: outcome.hint || null } },
        decline_reason: declineReason, document_country: s.documentCountry,
        updated_at: at, ...(Didit.TERMINAL.has(state) || state === 'review' ? { completed_at: at } : {}),
      },
    });
    const [status] = await db(`verification_status?user_id=eq.${row.user_id}&select=identity_state,identity_at`);
    if (state === 'approved') {
      await db('verification_status?on_conflict=user_id', {
        method: 'POST', prefer: 'resolution=merge-duplicates',
        body: {
          user_id: row.user_id, identity_state: 'approved',
          identity_at: status?.identity_state === 'approved' && status.identity_at ? status.identity_at : at,
          identity_expires: s.documentExpires, display_name: s.verifiedName, document_country: s.documentCountry,
          document_type: s.documentType, last_session_id: row.id,
        },
      });
      await db(`profiles?id=eq.${row.user_id}`, { method: 'PATCH', body: { id_verification_status: 'approved' } }).catch(() => {});
      if (status?.identity_state !== 'approved') {
        await notify(row.user_id, 'You are verified', 'Your purple checkmark is now live on your Cabana profile, listings and messages. Everywhere on Cabana that needs an ID check now knows it is you.', '/profile#verification', 'profile', { event: 'identity_approved' });
      }
    } else if (status?.identity_state !== 'approved') {
      await db('verification_status?on_conflict=user_id', {
        method: 'POST', prefer: 'resolution=merge-duplicates',
        body: { user_id: row.user_id, identity_state: state, last_session_id: row.id, document_country: s.documentCountry, document_type: s.documentType },
      });
      if (state === 'declined' && declineReason === 'duplicate_identity') {
        await notify(row.user_id, 'This ID is already verified on Cabana', `It belongs to another account${outcome.hint ? ' (' + outcome.hint + ')' : ''}. Sign in there, or ask us to move your verification to this account.`, '/profile#verification', 'profile', { event: 'identity_duplicate' });
      } else if (state === 'declined') {
        await notify(row.user_id, 'We could not verify your ID', declineReason === 'age' ? 'Cabana verification is for adults aged 18 and over.' : 'You can try again with a clear photo of a valid, unexpired document.', '/profile#verification', 'profile', { event: 'identity_declined' });
      } else if (state === 'review' && declineReason === 'identity_review') {
        await db('ops_alerts', { method: 'POST', body: { kind: 'identity', severity: outcome.critical ? 'critical' : 'warn',
          title: outcome.critical ? 'Possible return of a restricted member' : 'Identity check needs a look',
          body: 'A new identity check matches another account. Review it in Profiles & ticks → Linked accounts.', meta: { user_id: row.user_id } } }).catch(() => {});
      }
    }
    return state;
  }

  function safeNext(v) {
    const n = String(v || '');
    return /^\/(?!\/)[\w\-./?=&%#]{0,200}$/.test(n) && !/[<>"'\\]/.test(n) ? n : null;
  }
  const ISO3 = { KE: 'KEN', TZ: 'TZA', UG: 'UGA', RW: 'RWA', NG: 'NGA', GH: 'GHA', ZA: 'ZAF', ET: 'ETH', BI: 'BDI', SS: 'SSD' };
  async function identitySummary(uid, { admin }) {
    const [raw, [vs], [latest], [agent], [driver], [orgv], [prof]] = await Promise.all([
      rawCards([uid]),
      db(`verification_status?user_id=eq.${uid}&select=identity_state,identity_at,identity_expires,display_name,document_country,document_type`),
      db(`verification_sessions?user_id=eq.${uid}&select=id,state,decline_reason,decision,created_at,context&order=created_at.desc&limit=1`),
      db(`agents?id=eq.${uid}&select=kyc_status,kyc_verified_at,suspended`).catch(() => []),
      db(`drivers?user_id=eq.${uid}&select=status,national_id,country_code,applied_at`).catch(() => []),
      db(`organization_verifications?user_id=eq.${uid}&select=status,legal_name&order=created_at.desc&limit=1`),
      db(`profiles?id=eq.${uid}&select=verified,verified_at,phone_verified,id_verification_status,email,banned,suspended_until,host_status`),
    ]);
    const c = raw.get(uid) || {};
    const didit = vs?.identity_state === 'approved';
    const source = didit ? 'didit' : agent?.kyc_status === 'verified' ? 'agent_document' : prof?.verified ? 'cabana_operator' : ['approved', 'verified'].includes(prof?.id_verification_status) ? 'legacy' : null;
    const state = c.identity_verified ? 'approved' : (vs?.identity_state || 'not_started');
    let idMatch = null;
    if (driver?.national_id) {
      try {
        const key = Identity.pepper(env), country = vs?.document_country || ISO3[String(driver.country_code || 'KE').toUpperCase()] || 'KEN';
        const h = Identity.fp(key, `id_number|${country}|${Identity.normNumber(driver.national_id)}`);
        const hit = await db(`identity_fingerprints?kind=eq.id_number&hash=eq.${h}&select=user_id&limit=5`);
        const prints = await db(`identity_fingerprints?user_id=eq.${uid}&kind=eq.id_number&select=hash&limit=1`);
        idMatch = prints.length ? hit.some(r => r.user_id === uid) : null;
        if (hit.some(r => r.user_id !== uid)) idMatch = false;
      } catch { idMatch = null; }
    }
    const out = {
      identity: { verified: !!c.identity_verified, state, source, since: didit ? vs.identity_at : prof?.verified_at || agent?.kyc_verified_at || null,
        document_country: vs?.document_country || null, document_type: vs?.document_type || null, verified_as: didit ? vs.display_name : null,
        pending: latest?.state === 'review' ? 'review' : latest?.state === 'in_progress' ? 'in_progress' : null,
        declined: latest?.state === 'declined' ? latest.decline_reason || 'declined' : null,
        duplicate_hint: latest?.decline_reason === 'duplicate_identity' ? latest.decision?.cabana?.hint || null : null },
      badge: c.badge || null,
      facts: [
        { key: 'identity', label: 'Government ID + live selfie', ok: !!c.identity_verified },
        { key: 'email', label: 'Email address', ok: true },
        { key: 'phone', label: 'Phone number', ok: !!prof?.phone_verified },
        ...(orgv ? [{ key: 'organisation', label: 'Organisation registration', ok: orgv.status === 'approved' }] : []),
      ],
      roles: {
        agent: agent ? { kyc_status: agent.kyc_status, satisfied_by_identity: !!c.identity_verified && agent.kyc_status === 'verified' } : null,
        driver: driver ? { status: driver.status, id_number_matches_verified_id: idMatch } : null,
        organisation: orgv ? { status: orgv.status } : null,
      },
    };
    if (admin) {
      const links = await db(`identity_links?or=(user_a.eq.${uid},user_b.eq.${uid})&select=*&order=detected_at.desc&limit=60`);
      const others = [...new Set(links.map(l => (l.user_a === uid ? l.user_b : l.user_a)))];
      const [oc, op] = await Promise.all([rawCards(others), others.length ? db(`profiles?id=in.(${others.join(',')})&select=id,email,banned,suspended_until,host_status,created_at`) : []]);
      const pm = new Map(op.map(p => [p.id, p]));
      const byOther = new Map();
      links.forEach(l => { const o = l.user_a === uid ? l.user_b : l.user_a; const g = byOther.get(o) || { link_id: l.id, other: o, reasons: [], severity: 'info', status: l.status, detected_at: l.detected_at, note: l.note };
        g.reasons.push(`${l.reason}:${l.strength}`); if (l.severity === 'critical' || (l.severity === 'review' && g.severity === 'info')) g.severity = l.severity; byOther.set(o, g); });
      out.links = [...byOther.values()].map(g => { const oc1 = oc.get(g.other), p = pm.get(g.other) || {};
        return { ...g, person: oc1 ? toCard(oc1, 'full') : { id: g.other, name: 'Deleted account' }, email: Identity.maskEmail(p.email),
          restricted: !!(p.banned || (p.suspended_until && new Date(p.suspended_until) > now()) || ['suspended', 'banned'].includes(p.host_status)), identity_verified: !!oc1?.identity_verified }; });
      out.fingerprints = (await db(`identity_fingerprints?user_id=eq.${uid}&select=kind`)).reduce((a, r) => (a[r.kind] = (a[r.kind] || 0) + 1, a), {});
      out.restricted = !!(prof?.banned || (prof?.suspended_until && new Date(prof.suspended_until) > now()) || ['suspended', 'banned'].includes(prof?.host_status));
      out.session = latest ? { state: latest.state, decline_reason: latest.decline_reason, warnings: latest.decision?.warnings || [], outcome: latest.decision?.cabana?.outcome || null, at: latest.created_at, context: latest.context } : null;
      // Backfill: approved before the identity graph existed.
      if (didit && !Object.keys(out.fingerprints).length && latest && didit_ok()) {
        try { const d = await didit.decision((await db(`verification_sessions?id=eq.${latest.id}&select=didit_session_id`))[0].didit_session_id);
          await Identity.assess({ db, rpc, userId: uid, sessionRowId: latest.id, decision: d, key: Identity.pepper(env) }); out.backfilled = true; } catch { /* next view */ }
      }
    }
    return out;
  }
  function didit_ok() { return didit.configured(); }

  /* ── photo publishing ──────────────────────────────────────────── */
  async function publishPhoto(userId, bytes, sha, mime) {
    const ext = mime === 'image/png' ? 'png' : mime === 'image/jpeg' ? 'jpg' : 'webp';
    const path = `${userId}/${sha.slice(0, 24)}.${ext}`;
    await storage.upload('profile-photos', path, bytes, mime);
    const url = storage.publicUrl('profile-photos', path);
    const row = await ensureRow(userId);
    const oldPath = row.photo_url && row.photo_url.includes('/profile-photos/') ? decodeURIComponent(row.photo_url.split('/profile-photos/')[1]) : null;
    await db(`member_public_profiles?user_id=eq.${userId}`, { method: 'PATCH', body: { photo_url: url, photo_status: 'approved', photo_updated_at: now().toISOString(), updated_at: now().toISOString() } });
    if (oldPath && oldPath !== path) await storage.remove('profile-photos', [oldPath]);
    return url;
  }

  switch (op) {
    /* ════════════════════════════════════════════════════════════
       READS
       ════════════════════════════════════════════════════════════ */
    case 'cards': {
      const ids = [...new Set(String(req.query.ids || '').split(',').map(s => s.trim()).filter(s => UUID.test(s)))].slice(0, 60);
      if (!ids.length) return res.status(400).json({ error: 'Choose members to show.' });
      const s = await caller(false);
      res.setHeader('Cache-Control', 'private, max-age=30');
      return res.status(200).json({ cards: await cardsFor(ids, s?.user?.id) });
    }

    case 'profile': {
      res.setHeader('Cache-Control', 'private, no-store');
      const s = await caller(false);
      let id = String(req.query.id || '');
      if (!UUID.test(id)) {
        const h = normalizeHandle(req.query.handle);
        if (!h || handleProblem(h, { admin: true })?.startsWith('Handles are')) return res.status(404).json({ error: 'This profile is not available.' });
        const [hit] = await db(`member_public_profiles?handle=eq.${encodeURIComponent(h)}&select=user_id`);
        if (!hit) return res.status(404).json({ error: 'This profile is not available.' });
        id = hit.user_id;
      }
      const callerId = s?.user?.id || null;
      if (callerId === id) await ensureRow(id);
      const map = await rawCards([id]);
      const row = map.get(id);
      const peers = row && !row.published && !row.professional ? await peersOf(callerId, [id]) : new Set();
      const level = levelFor(row, callerId, peers);
      if (!level) return res.status(404).json({ error: 'This profile is not available.' });
      const card = toCard(row, level);
      const [[mpp], stats, followRow] = await Promise.all([
        db(`member_public_profiles?user_id=eq.${id}&select=*`),
        rpc('cabana_people_stats', { p_id: id }),
        callerId && callerId !== id ? db(`member_follows?follower_id=eq.${callerId}&followee_id=eq.${id}&select=followee_id`) : Promise.resolve([]),
      ]);
      const m = mpp || {};
      const full = level === 'self' || level === 'full';
      const showFollowers = level === 'self' || m.show_followers !== false;
      const profile = {
        ...card,
        bio: full ? clean(m.bio, 240) : '',
        city: full && m.show_location ? clean(m.city, 60) || null : null,
        country_code: full && m.show_location ? m.country_code || null : null,
        languages: full ? (m.languages || []).filter(l => LANGS.includes(l)) : [],
        interests: full ? (m.interests || []).filter(i => INTERESTS.includes(i)) : [],
        theme: THEMES.includes(m.theme) ? m.theme : 'equator',
        roles: Array.isArray(stats?.roles) ? stats.roles : ['traveller'],
        member_since: stats?.member_since || null,
        identity_since: row.identity_verified && card.type === 'individual' ? stats?.identity_since || null : null,
        org_since: row.org_verified ? stats?.org_since || null : null,
        provider: row.provider === true,
        operators: level === 'peer' ? [] : (stats?.operators || []).slice(0, 6),
        website: row.org_verified && m.org_website ? m.org_website : null,
        stats: {
          followers: showFollowers ? Number(stats?.followers || 0) : null,
          following: showFollowers ? Number(stats?.following || 0) : null,
          listings: Number(stats?.listings || 0),
          reviews: Number(stats?.reviews || 0),
          rating: stats?.rating != null ? Number(stats.rating) : null,
        },
        viewer: { signed_in: Boolean(callerId), self: level === 'self', following: followRow.length > 0 },
        listings: [],
      };
      if ((m.show_listings !== false || level === 'self') && profile.stats.listings > 0 && level !== 'peer') {
        const ls = await db(`listings?partner_id=eq.${id}&is_active=eq.true&status=eq.active&deleted_at=is.null&select=id,title,city,area,country,photos,price_night,price_per_night,currency,service,avg_rating,review_count&order=featured.desc.nullslast,created_at.desc&limit=6`).catch(() => []);
        profile.listings = ls.map(l => ({
          id: l.id, title: clean(l.title, 90), place: [l.area, l.city].filter(Boolean).map(v => clean(v, 40)).join(', ') || clean(l.country, 40),
          photo: Array.isArray(l.photos) && typeof l.photos[0] === 'string' && /^https:\/\//.test(l.photos[0]) ? l.photos[0] : null,
          price: Number(l.price_night || l.price_per_night) || null, currency: l.currency || 'KES',
          rating: l.avg_rating != null ? Number(l.avg_rating) : null, reviews: Number(l.review_count || 0),
          url: l.service === 'roommates' ? `/roommates?listing=${l.id}` : `/apartments?open=${l.id}`,
        }));
      }
      if (level === 'self') {
        const [[vs], [session], [orgv], [pending], photosToday] = await Promise.all([
          db(`verification_status?user_id=eq.${id}&select=identity_state,identity_at,identity_expires,display_name,document_country,document_type`),
          db(`verification_sessions?user_id=eq.${id}&select=state,verification_url,expires_at,created_at,decline_reason,decision&order=created_at.desc&limit=1`),
          db(`organization_verifications?user_id=eq.${id}&select=status,legal_name,org_kind,country_code,website,review_note,created_at,reviewed_at&order=created_at.desc&limit=1`),
          db(`profile_photo_reviews?user_id=eq.${id}&status=eq.pending_review&select=created_at&order=created_at.desc&limit=1`),
          db(`profile_photo_reviews?user_id=eq.${id}&status=eq.rejected&created_at=gt.${new Date(now().getTime() - 30 * 864e5).toISOString()}&select=id`),
        ]);
        const identityState = row.identity_verified ? 'approved' : vs?.identity_state || 'not_started';
        profile.settings = {
          display_name: clean(m.display_name, 60), handle: m.handle || null, headline: clean(m.headline, 80), bio: clean(m.bio, 240),
          account_type: m.account_type || 'individual', org_kind: m.org_kind || null, org_website: m.org_website || null,
          city: clean(m.city, 60), country_code: m.country_code || null, show_location: m.show_location === true,
          languages: m.languages || [], interests: m.interests || [], theme: m.theme || 'equator', avatar: cleanAvatar(m.avatar),
          published: m.published === true, show_followers: m.show_followers !== false, allow_follow: m.allow_follow !== false, show_listings: m.show_listings !== false,
          photo_url: m.photo_url || null, photo_status: m.photo_status || 'none', photo_pending: Boolean(pending),
          photo_locked: photosToday.length >= 3,
        };
        profile.verification = {
          identity: {
            state: identityState,
            since: row.identity_verified ? stats?.identity_since || null : null,
            expires: vs?.identity_expires || null,
            verified_as: identityState === 'approved' ? vs?.display_name || null : null,
            document_country: vs?.document_country || null,
            source: row.identity_verified && !vs ? 'cabana_review' : 'didit',
            session: session && session.state === 'in_progress' && new Date(session.expires_at) > now() ? { url: session.verification_url, started: session.created_at } : null,
            last_decline: session?.state === 'declined' ? session.decline_reason || 'declined' : null,
            duplicate_hint: session?.decline_reason === 'duplicate_identity' ? session.decision?.cabana?.hint || null : null,
            under_review: session?.state === 'review',
            available: didit.configured(),
          },
          organization: orgv ? { status: orgv.status, legal_name: orgv.legal_name, org_kind: orgv.org_kind, country_code: orgv.country_code, note: orgv.status === 'rejected' ? orgv.review_note || null : null, submitted: orgv.created_at, reviewed: orgv.reviewed_at } : null,
          can_upload_photo: card.type === 'organization' ? row.org_verified : row.identity_verified,
          provider: row.provider === true,
        };
      }
      return res.status(200).json({ profile });
    }

    case 'follows': {
      res.setHeader('Cache-Control', 'private, no-store');
      const id = String(req.query.id || ''), list = req.query.list === 'following' ? 'following' : 'followers';
      if (!UUID.test(id)) return res.status(400).json({ error: 'Choose a profile.' });
      const s = await caller(false), callerId = s?.user?.id;
      const [row] = [(await rawCards([id])).get(id)];
      const level = levelFor(row, callerId, callerId ? await peersOf(callerId, [id]) : new Set());
      if (!level || level === 'peer') return res.status(404).json({ error: 'This profile is not available.' });
      const [m] = await db(`member_public_profiles?user_id=eq.${id}&select=show_followers`);
      if (level !== 'self' && m?.show_followers === false) return res.status(403).json({ error: 'This member keeps their followers private.' });
      const offset = Math.max(0, Math.min(5000, Number(req.query.offset) || 0));
      const rows = await db(`member_follows?${list === 'followers' ? 'followee_id' : 'follower_id'}=eq.${id}&select=follower_id,followee_id,created_at&order=created_at.desc&limit=40&offset=${offset}`);
      const ids = rows.map(r => list === 'followers' ? r.follower_id : r.followee_id);
      const cards = await cardsFor(ids, callerId);
      return res.status(200).json({ people: ids.map(i => cards[i]).filter(Boolean), next: rows.length === 40 ? offset + 40 : null });
    }

    case 'search': {
      res.setHeader('Cache-Control', 'private, max-age=20');
      const q = clean(req.query.q, 40).replace(/[^\p{L}\p{N} ._-]/gu, '').trim();
      if (q.length < 2) return res.status(200).json({ people: [] });
      const like = encodeURIComponent(`*${q.replace(/\s+/g, '*')}*`);
      const rows = await db(`member_public_profiles?published=eq.true&or=(handle.ilike.${like},display_name.ilike.${like})&select=user_id&limit=24`);
      const s = await caller(false);
      const cards = await cardsFor(rows.map(r => r.user_id), s?.user?.id);
      return res.status(200).json({ people: Object.values(cards).filter(Boolean) });
    }

    case 'verify-status': {
      res.setHeader('Cache-Control', 'private, no-store');
      const s = await caller(true);
      const [latest] = await db(`verification_sessions?user_id=eq.${s.user.id}&select=*&order=created_at.desc&limit=1`);
      let state = latest?.state || 'not_started';
      if (latest && didit.configured() && !Didit.TERMINAL.has(latest.state) && Date.now() - new Date(latest.updated_at).getTime() > 15000) {
        try { state = await syncSession(latest); } catch (e) { console.warn('[people] didit sync failed', e.message); }
      }
      const card = (await rawCards([s.user.id])).get(s.user.id);
      return res.status(200).json({ state: card?.identity_verified ? 'approved' : state, badge: card?.badge || null });
    }

    /* ════════════════════════════════════════════════════════════
       WRITES
       ════════════════════════════════════════════════════════════ */
    case 'save': {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
      const s = await caller(true), uid = s.user.id, b = bodyOf(req), admin = await isAdmin(s);
      const row = await ensureRow(uid);
      const next = {};
      const set = (k, v) => { if (v !== undefined) next[k] = v; };
      const type = b.account_type === undefined ? row.account_type : b.account_type;
      if (!['individual', 'organization'].includes(type)) return res.status(400).json({ error: 'Choose individual or organisation.' });
      set('account_type', b.account_type === undefined ? undefined : type);

      if (b.display_name !== undefined) {
        const name = clean(b.display_name, 60), problem = nameProblem(name, { admin });
        if (problem) return res.status(400).json({ error: problem, field: 'display_name' });
        set('display_name', name);
      }
      const name = next.display_name ?? row.display_name;
      if (b.handle !== undefined) {
        const h = normalizeHandle(b.handle);
        if (!h) return res.status(400).json({ error: 'Choose a handle for your profile link.', field: 'handle' });
        const problem = handleProblem(h, { admin });
        if (problem) return res.status(400).json({ error: problem, field: 'handle' });
        if (h !== row.handle) {
          const taken = await db(`member_public_profiles?handle=eq.${encodeURIComponent(h)}&user_id=neq.${uid}&select=user_id`);
          if (taken.length) return res.status(409).json({ error: 'That handle is taken.', field: 'handle' });
        }
        set('handle', h);
      }
      if (b.headline !== undefined) set('headline', clean(b.headline, 80));
      if (b.bio !== undefined) set('bio', clean(b.bio, 240));
      for (const f of ['headline', 'bio']) if (next[f] && hasContact(next[f])) return res.status(400).json({ error: 'Keep phone numbers, emails, links and payment details out of your profile. Members reach you through Cabana messages.', field: f });
      if (b.city !== undefined) { const c = clean(b.city, 60); if (hasContact(c)) return res.status(400).json({ error: 'Choose a city name.', field: 'city' }); set('city', c || null); }
      if (b.country_code !== undefined) { const c = String(b.country_code || '').toUpperCase(); if (c && !/^[A-Z]{2}$/.test(c)) return res.status(400).json({ error: 'Choose a country.', field: 'country_code' }); set('country_code', c || null); }
      if (b.languages !== undefined) set('languages', [...new Set((Array.isArray(b.languages) ? b.languages : []).filter(l => LANGS.includes(l)))].slice(0, 6));
      if (b.interests !== undefined) set('interests', [...new Set((Array.isArray(b.interests) ? b.interests : []).filter(i => INTERESTS.includes(i)))].slice(0, 8));
      if (b.theme !== undefined) { if (!THEMES.includes(b.theme)) return res.status(400).json({ error: 'Choose a theme.' }); set('theme', b.theme); }
      if (b.avatar !== undefined) {
        if (b.avatar === null) set('avatar', null);
        else { const a = cleanAvatar(b.avatar); if (!a) return res.status(400).json({ error: 'That avatar could not be saved. Pick it again.', field: 'avatar' }); set('avatar', a); }
      }
      for (const k of ['published', 'show_location', 'show_followers', 'allow_follow', 'show_listings']) if (b[k] !== undefined) set(k, b[k] === true);
      if (b.org_kind !== undefined) { if (b.org_kind && !ORG_KINDS.includes(b.org_kind)) return res.status(400).json({ error: 'Choose what kind of organisation this is.', field: 'org_kind' }); set('org_kind', b.org_kind || null); }
      if (b.org_website !== undefined) { const w = cleanWebsite(clean(b.org_website, 140)); if (w === undefined) return res.status(400).json({ error: 'Enter a website address like https://example.com', field: 'org_website' }); set('org_website', w); }

      // Anti-impersonation: a verified organisation owns its name.
      const [approved] = await db(`organization_verifications?user_id=eq.${uid}&status=eq.approved&select=legal_name&limit=1`);
      if (type === 'organization') {
        if (approved && name && normalizeOrg(name) !== normalizeOrg(row.org_name || approved.legal_name) && normalizeOrg(name) !== normalizeOrg(approved.legal_name)) {
          return res.status(409).json({ error: 'Your organisation name is verified. To change it, contact Cabana so we can re-verify it.', field: 'display_name' });
        }
        set('org_name', approved ? (row.org_name || approved.legal_name) : (name && name.length >= 2 ? name : null));
      }
      if (name && next.display_name !== undefined) {
        const golds = await db('organization_verifications?status=eq.approved&select=user_id,legal_name').catch(() => []);
        const n = normalizeOrg(name);
        if (n.length >= 4 && golds.some(g => g.user_id !== uid && normalizeOrg(g.legal_name) === n)) {
          return res.status(409).json({ error: 'A verified organisation already uses this name on Cabana.', field: 'display_name' });
        }
      }
      next.updated_at = now().toISOString();
      const [saved] = await db(`member_public_profiles?user_id=eq.${uid}`, { method: 'PATCH', prefer: 'return=representation', body: next });
      return res.status(200).json({ ok: true, handle: saved?.handle || row.handle });
    }

    case 'follow': {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
      const s = await caller(true), b = bodyOf(req), id = String(b.id || ''), on = b.on !== false;
      if (!UUID.test(id)) return res.status(400).json({ error: 'Choose someone to follow.' });
      if (id === s.user.id) return res.status(400).json({ error: 'You cannot follow yourself.' });
      if (on) {
        const row = (await rawCards([id])).get(id);
        const level = levelFor(row, s.user.id, new Set());
        if (!level) return res.status(404).json({ error: 'This profile is not available.' });
        if (row.allow_follow === false) return res.status(403).json({ error: 'This member is not accepting new followers.' });
      }
      let result;
      try { result = await rpc('cabana_follow', { p_follower: s.user.id, p_followee: id, p_on: on }); }
      catch (e) { if (e.status === 400 || /P0001|followed a lot/i.test(e.message)) return res.status(429).json({ error: e.message }); throw e; }
      if (on && result?.new) {
        const since = new Date(now().getTime() - 7 * 864e5).toISOString();
        const recent = await db(`notifications?user_id=eq.${id}&kind=eq.follow&meta->>follower=eq.${s.user.id}&created_at=gt.${since}&select=id&limit=1`).catch(() => [1]);
        if (!recent.length) {
          const me = (await cardsFor([s.user.id], id))[s.user.id];
          await notify(id, `${me?.name || 'A Cabana member'} started following you`, 'See who is following you on your profile.', me?.handle ? `/u/${me.handle}` : '/profile', 'follow', { follower: s.user.id });
        }
      }
      return res.status(200).json({ following: on, followers: Number(result?.followers || 0) });
    }

    case 'report': {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
      const s = await caller(true), b = bodyOf(req), id = String(b.id || '');
      if (!UUID.test(id) || id === s.user.id) return res.status(400).json({ error: 'Choose a profile to report.' });
      if (!REPORT_REASONS.includes(b.reason)) return res.status(400).json({ error: 'Choose a reason.' });
      const recent = await db(`profile_reports?reporter_id=eq.${s.user.id}&created_at=gt.${new Date(now().getTime() - 864e5).toISOString()}&select=id`);
      if (recent.length >= 20) return res.status(429).json({ error: 'You have sent a lot of reports today. Our team is reviewing them.' });
      await db('profile_reports', { method: 'POST', prefer: 'resolution=ignore-duplicates', body: { reporter_id: s.user.id, target_id: id, reason: b.reason, detail: clean(b.detail, 500) } })
        .catch(e => { if (e.status !== 409) throw e; });
      // Three different people flagging a photo hides it until a moderator decides.
      if (b.reason === 'inappropriate_photo') {
        const flags = await db(`profile_reports?target_id=eq.${id}&reason=eq.inappropriate_photo&status=eq.open&select=reporter_id`);
        if (new Set(flags.map(f => f.reporter_id)).size >= 3) {
          await db(`member_public_profiles?user_id=eq.${id}&photo_status=eq.approved`, { method: 'PATCH', body: { photo_status: 'removed', updated_at: now().toISOString() } });
        }
      }
      return res.status(200).json({ ok: true });
    }

    case 'photo': {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
      const s = await caller(true), uid = s.user.id, b = bodyOf(req), path = String(b.path || '');
      if (!new RegExp(`^${uid}/[a-z0-9-]{8,64}\\.(webp|jpe?g|png)$`, 'i').test(path)) return res.status(400).json({ error: 'Upload the photo again.' });
      const card = (await rawCards([uid])).get(uid);
      const allowed = card?.account_type === 'organization' ? card.org_verified : card?.identity_verified;
      if (!allowed) {
        await storage.remove('profile-pending', [path]);
        return res.status(403).json({ error: card?.account_type === 'organization' ? 'Logo and photo uploads unlock once your organisation is verified.' : 'Photo uploads unlock once you verify your identity. Until then, choose a Cabana avatar.', code: 'verify_first' });
      }
      const since30 = new Date(now().getTime() - 30 * 864e5).toISOString(), since1 = new Date(now().getTime() - 864e5).toISOString();
      const [rejected, today] = await Promise.all([
        db(`profile_photo_reviews?user_id=eq.${uid}&status=eq.rejected&created_at=gt.${since30}&select=id`),
        db(`profile_photo_reviews?user_id=eq.${uid}&created_at=gt.${since1}&select=id`),
      ]);
      if (rejected.length >= 3) { await storage.remove('profile-pending', [path]); return res.status(429).json({ error: 'Photo uploads are paused on your account for now. You can keep using a Cabana avatar.', code: 'locked' }); }
      if (today.length >= 10) { await storage.remove('profile-pending', [path]); return res.status(429).json({ error: 'You have tried a lot of photos today. Try again tomorrow.' }); }
      const bytes = await storage.download('profile-pending', path, 3 * 1024 * 1024);
      const sha = createHash('sha256').update(bytes).digest('hex');
      const known = await db(`profile_photo_reviews?sha256=eq.${sha}&status=eq.rejected&select=id&limit=1`);
      if (known.length) {
        await storage.remove('profile-pending', [path]);
        await db('profile_photo_reviews', { method: 'POST', body: { user_id: uid, sha256: sha, status: 'rejected', source: 'hash', reason: 'Previously rejected image' } });
        return res.status(422).json({ error: 'This photo cannot be used on Cabana.', code: 'rejected' });
      }
      const verdict = await moderate(bytes);
      const mime = (await import('./_moderation.js')).sniffImage(bytes);
      if (verdict.decision === 'approve') {
        const url = await publishPhoto(uid, bytes, sha, mime);
        await storage.remove('profile-pending', [path]);
        await db('profile_photo_reviews', { method: 'POST', body: { user_id: uid, sha256: sha, status: 'approved', source: 'ai', verdict: { ...verdict.verdict, model: verdict.model } } });
        return res.status(200).json({ status: 'approved', photo: url });
      }
      if (verdict.decision === 'reject') {
        await storage.remove('profile-pending', [path]);
        await db('profile_photo_reviews', { method: 'POST', body: { user_id: uid, sha256: sha, status: 'rejected', source: 'ai', reason: verdict.category, verdict: { ...verdict.verdict, model: verdict.model } } });
        if (verdict.severity === 'critical') {
          await db('ops_alerts', { method: 'POST', body: { kind: 'profile_photo', severity: 'critical', title: 'Profile photo blocked for child safety', body: 'An upload was blocked and deleted. Review the account in the operator console.', meta: { user_id: uid, sha256: sha } } }).catch(() => {});
        }
        return res.status(422).json({ error: verdict.reason, code: 'rejected' });
      }
      await db('profile_photo_reviews', { method: 'POST', body: { user_id: uid, storage_path: path, sha256: sha, status: 'pending_review', source: 'ai', reason: verdict.category === 'unavailable' ? 'Automatic check unavailable' : 'Automatic check was not certain', verdict: { ...(verdict.verdict || {}), model: verdict.model } } });
      return res.status(202).json({ status: 'review', message: verdict.reason });
    }

    case 'photo-state': {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
      const s = await caller(true), uid = s.user.id, b = bodyOf(req);
      const [row] = await db(`member_public_profiles?user_id=eq.${uid}&select=photo_url,photo_status`);
      if (b.action === 'delete') {
        if (row?.photo_url?.includes('/profile-photos/')) await storage.remove('profile-photos', [decodeURIComponent(row.photo_url.split('/profile-photos/')[1])]);
        await db(`member_public_profiles?user_id=eq.${uid}`, { method: 'PATCH', body: { photo_url: null, photo_status: 'none', updated_at: now().toISOString() } });
        return res.status(200).json({ ok: true, photo: null });
      }
      if (!row?.photo_url) return res.status(400).json({ error: 'There is no photo to show.' });
      if (b.show === true) {
        if (row.photo_status !== 'removed' && row.photo_status !== 'approved') return res.status(400).json({ error: 'That photo is not available.' });
        const reported = await db(`profile_reports?target_id=eq.${uid}&reason=eq.inappropriate_photo&status=eq.open&select=id`);
        if (new Set(reported.map(r => r.id)).size >= 3) return res.status(409).json({ error: 'Your photo is being reviewed after reports from other members.' });
        await db(`member_public_profiles?user_id=eq.${uid}`, { method: 'PATCH', body: { photo_status: 'approved', updated_at: now().toISOString() } });
        return res.status(200).json({ ok: true, photo: row.photo_url });
      }
      await db(`member_public_profiles?user_id=eq.${uid}`, { method: 'PATCH', body: { photo_status: 'removed', updated_at: now().toISOString() } });
      return res.status(200).json({ ok: true, photo: null });
    }

    case 'verify-start': {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
      const s = await caller(true), uid = s.user.id;
      const card = (await rawCards([uid])).get(uid);
      if (card?.identity_verified) return res.status(200).json({ state: 'approved' });
      if (!didit.configured()) return res.status(503).json({ error: 'Identity checks are being switched on. Please try again soon.', code: 'kyc_unconfigured' });
      const [open] = await db(`verification_sessions?user_id=eq.${uid}&state=eq.in_progress&expires_at=gt.${now().toISOString()}&created_at=gt.${new Date(now().getTime() - 864e5).toISOString()}&select=*&order=created_at.desc&limit=1`);
      if (open?.verification_url) return res.status(200).json({ state: 'in_progress', url: open.verification_url });
      const recent = await db(`verification_sessions?user_id=eq.${uid}&created_at=gt.${new Date(now().getTime() - 864e5).toISOString()}&select=id`);
      if (recent.length >= 3) return res.status(429).json({ error: 'You have started several checks today. Please try again tomorrow.' });
      const b = bodyOf(req), next = safeNext(b.next), context = Identity.CONTEXTS[b.context] ? b.context : 'profile';
      const [latest] = await db(`verification_sessions?user_id=eq.${uid}&select=state,decline_reason&order=created_at.desc&limit=1`);
      if (latest?.state === 'review') return res.status(200).json({ state: 'review' });
      const { sessionId, url, workflowId } = await didit.create({ userId: uid, callback: `${SITE}/profile?verify=return${next ? '&next=' + encodeURIComponent(next) : ''}#verification` });
      const [created] = await db('verification_sessions', {
        method: 'POST', prefer: 'return=representation',
        body: { user_id: uid, didit_session_id: sessionId, workflow_id: workflowId, kind: 'identity', context, state: 'in_progress', verification_url: url, expires_at: new Date(now().getTime() + 7 * 864e5).toISOString() },
      });
      await db('verification_status?on_conflict=user_id', { method: 'POST', prefer: 'resolution=merge-duplicates', body: { user_id: uid, identity_state: 'in_progress', last_session_id: created?.id || null } });
      return res.status(200).json({ state: 'in_progress', url });
    }

    /* ════════════════════════════════════════════════════════════
       ONE IDENTITY
       ════════════════════════════════════════════════════════════ */
    case 'identity': {
      res.setHeader('Cache-Control', 'private, no-store');
      const s = await caller(true);
      const sum = await identitySummary(s.user.id, { admin: false });
      const ctx = Identity.CONTEXTS[req.query.for];
      if (ctx) sum.needs = { context: req.query.for, label: ctx.label, why: ctx.why, required: ctx.required, satisfied: sum.identity.verified,
        action: sum.identity.verified ? null : { label: 'Verify my identity', url: `/profile?next=${encodeURIComponent(safeNext(req.query.next) || '/profile')}#verification` } };
      return res.status(200).json(sum);
    }

    case 'identity-move': {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
      const s = await caller(true), uid = s.user.id;
      const [latest] = await db(`verification_sessions?user_id=eq.${uid}&decline_reason=eq.duplicate_identity&select=id&order=created_at.desc&limit=1`);
      if (!latest) return res.status(400).json({ error: 'There is no verification to move.' });
      const links = await db(`identity_links?or=(user_a.eq.${uid},user_b.eq.${uid})&reason=in.(same_document,same_id_number)&status=eq.open&select=id`);
      if (links.length) await db(`identity_links?id=in.(${links.map(l => l.id).join(',')})`, { method: 'PATCH', body: { status: 'move_requested', severity: 'review', note: 'Member asked to move their verification to this account' } });
      if (deps.notifyAdmins) await deps.notifyAdmins('Verification move requested', 'A member asked to move their verified identity to a newer account. Review it in Profiles & ticks → Linked accounts.').catch(() => {});
      return res.status(200).json({ ok: true });
    }

    case 'admin-identity': {
      const s = await caller(true);
      if (!(await isAdmin(s))) return res.status(403).json({ error: 'Forbidden' });
      res.setHeader('Cache-Control', 'private, no-store');
      const id = String(req.query.id || '');
      if (!UUID.test(id)) return res.status(400).json({ error: 'Choose a member.' });
      return res.status(200).json(await identitySummary(id, { admin: true }));
    }

    case 'admin-link': {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
      const s = await caller(true);
      if (!(await isAdmin(s))) return res.status(403).json({ error: 'Forbidden' });
      const b = bodyOf(req), id = String(b.id || ''), at = now().toISOString();
      if (!UUID.test(id)) return res.status(400).json({ error: 'Choose a link.' });
      const [link] = await db(`identity_links?id=eq.${id}&select=*`);
      if (!link) return res.status(404).json({ error: 'Not found.' });
      const status = { allow: 'allowed', same_person: 'same_person', dismiss: 'dismissed' }[b.decision];
      if (!status) return res.status(400).json({ error: 'Unknown decision.' });
      // One decision covers every signal between the same two accounts.
      await db(`identity_links?user_a=eq.${link.user_a}&user_b=eq.${link.user_b}`, { method: 'PATCH', body: { status, reviewed_by: s.user.id, reviewed_at: at, note: clean(b.note, 300) || link.note } });
      // Allowing re-runs any identity check this link was holding back.
      let rechecked = 0;
      if (status !== 'same_person' || b.move) {
        const held = await db(`verification_sessions?user_id=in.(${link.user_a},${link.user_b})&decline_reason=in.(identity_review,duplicate_identity)&select=*&order=created_at.desc&limit=4`);
        for (const row of held) { try { await syncSession(row, { force: true }); rechecked++; } catch (e) { console.warn('[people] recheck failed', e.message); } }
      }
      await db('admin_audit_log', { method: 'POST', body: { action: `identity.link_${b.decision}`, target_type: 'profile', target_id: link.user_a, meta: { other: link.user_b, reason: link.reason } } }).catch(() => {});
      return res.status(200).json({ ok: true, rechecked });
    }

    case 'webhook': {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
      const b = bodyOf(req);
      const headers = Object.fromEntries(Object.entries(req.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
      if (env.DIDIT_WEBHOOK_SECRET) {
        const check = Didit.verifyWebhook({ body: b, headers, secret: env.DIDIT_WEBHOOK_SECRET });
        if (!check.ok) return res.status(401).json({ error: 'Invalid signature.' });
      }
      const sid = String(b.session_id || '');
      if (!UUID.test(sid) || !didit.configured()) return res.status(200).json({ ok: true, ignored: true });
      const [row] = await db(`verification_sessions?didit_session_id=eq.${sid}&select=*`);
      if (!row) return res.status(200).json({ ok: true, ignored: true });
      const state = await syncSession(row);
      return res.status(200).json({ ok: true, state });
    }

    case 'org-submit': {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
      const s = await caller(true), uid = s.user.id, b = bodyOf(req);
      const card = (await rawCards([uid])).get(uid);
      if (card?.account_type !== 'organization') return res.status(400).json({ error: 'Switch your profile to an organisation first.' });
      if (!card.identity_verified) return res.status(403).json({ error: 'Verify your own identity first. Gold verification needs a verified person behind every organisation.', code: 'verify_first' });
      const legal = clean(b.legal_name, 120), reg = clean(b.registration_number, 60), country = String(b.country_code || '').toUpperCase();
      const kind = ORG_KINDS.includes(b.org_kind) ? b.org_kind : null, website = cleanWebsite(clean(b.website, 140)), doc = String(b.document_path || '');
      if (legal.length < 2) return res.status(400).json({ error: 'Enter the registered name exactly as it appears on your certificate.', field: 'legal_name' });
      if (reg.length < 2) return res.status(400).json({ error: 'Enter the registration or business permit number.', field: 'registration_number' });
      if (!/^[A-Z]{2}$/.test(country)) return res.status(400).json({ error: 'Choose the country of registration.', field: 'country_code' });
      if (!kind) return res.status(400).json({ error: 'Choose what kind of organisation this is.', field: 'org_kind' });
      if (website === undefined) return res.status(400).json({ error: 'Enter a website address like https://example.com', field: 'website' });
      if (!new RegExp(`^${uid}/[a-z0-9-]{8,64}\\.(pdf|jpe?g|png|webp)$`, 'i').test(doc) || !(await storage.sign('org-documents', doc, 30))) {
        return res.status(400).json({ error: 'Attach your registration certificate or business permit.', field: 'document' });
      }
      const [active] = await db(`organization_verifications?user_id=eq.${uid}&status=in.(submitted,approved)&select=status`);
      if (active) return res.status(409).json({ error: active.status === 'approved' ? 'Your organisation is already verified.' : 'Your organisation is already being reviewed.' });
      await db('organization_verifications', { method: 'POST', body: { user_id: uid, legal_name: legal, org_kind: kind, country_code: country, registration_number: reg, website, document_path: doc } });
      await db(`member_public_profiles?user_id=eq.${uid}`, { method: 'PATCH', body: { org_kind: kind, updated_at: now().toISOString() } }).catch(() => {});
      if (deps.notifyAdmins) await deps.notifyAdmins(`Organisation to verify: ${legal}`, `${legal} (${country}, ${kind.replace(/_/g, ' ')}) asked for gold verification.`).catch(() => {});
      return res.status(200).json({ ok: true, status: 'submitted' });
    }

    case 'org-withdraw': {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
      const s = await caller(true);
      await db(`organization_verifications?user_id=eq.${s.user.id}&status=eq.submitted`, { method: 'PATCH', body: { status: 'withdrawn', updated_at: now().toISOString() } });
      return res.status(200).json({ ok: true });
    }

    /* ════════════════════════════════════════════════════════════
       OPERATORS
       ════════════════════════════════════════════════════════════ */
    case 'admin-queue': {
      const s = await caller(true);
      if (!(await isAdmin(s))) return res.status(403).json({ error: 'Forbidden' });
      res.setHeader('Cache-Control', 'private, no-store');
      const kind = String(req.query.kind || 'photos');
      if (kind === 'photos') {
        const rows = await db('profile_photo_reviews?status=eq.pending_review&select=id,user_id,reason,verdict,created_at&order=created_at.asc&limit=50');
        const cards = await cardsFor([...new Set(rows.map(r => r.user_id))], s.user.id);
        return res.status(200).json({ items: rows.map(r => ({ ...r, person: cards[r.user_id] || { id: r.user_id, name: 'Member' } })) });
      }
      if (kind === 'orgs') {
        const st = ['submitted', 'approved', 'rejected', 'revoked'].includes(req.query.status) ? req.query.status : 'submitted';
        const rows = await db(`organization_verifications?status=eq.${st}&select=id,user_id,legal_name,org_kind,country_code,registration_number,website,status,review_note,created_at,reviewed_at&order=created_at.${st === 'submitted' ? 'asc' : 'desc'}&limit=60`);
        const ids = [...new Set(rows.map(r => r.user_id))];
        const [cards, raw] = await Promise.all([cardsFor(ids, s.user.id), rawCards(ids)]);
        const stats = await Promise.all(ids.map(i => rpc('cabana_people_stats', { p_id: i }).catch(() => null)));
        const byId = Object.fromEntries(ids.map((i, n) => [i, stats[n]]));
        return res.status(200).json({ items: rows.map(r => ({ ...r, person: cards[r.user_id], representative_verified: Boolean(raw.get(r.user_id)?.identity_verified), operators: byId[r.user_id]?.operators || [] })) });
      }
      if (kind === 'reports') {
        const rows = await db('profile_reports?status=eq.open&select=id,reporter_id,target_id,reason,detail,created_at&order=created_at.desc&limit=200');
        const groups = new Map();
        rows.forEach(r => { const g = groups.get(r.target_id) || { target_id: r.target_id, reports: [] }; g.reports.push({ reason: r.reason, detail: r.detail, at: r.created_at }); groups.set(r.target_id, g); });
        const ids = [...groups.keys()];
        const raw = await rawCards(ids);
        return res.status(200).json({ items: ids.map(i => { const r = raw.get(i); return { ...groups.get(i), person: r ? toCard(r, 'full') : { id: i, name: 'Member' } }; }) });
      }
      if (kind === 'links') {
        const rows = await db(`identity_links?status=in.(open,move_requested)&severity=neq.info&select=*&order=detected_at.desc&limit=100`);
        const ids = [...new Set(rows.flatMap(r => [r.user_a, r.user_b]))];
        const [cards, profs] = await Promise.all([rawCards(ids), ids.length ? db(`profiles?id=in.(${ids.join(',')})&select=id,email,banned,suspended_until,host_status,created_at`) : []]);
        const pm = new Map(profs.map(p => [p.id, p]));
        const person = u => { const c = cards.get(u), p = pm.get(u) || {}; return { ...(c ? toCard(c, 'full') : { id: u, name: 'Member' }), email: Identity.maskEmail(p.email), restricted: !!(p.banned || (p.suspended_until && new Date(p.suspended_until) > now()) || ['suspended', 'banned'].includes(p.host_status)), joined: p.created_at, identity_verified: !!c?.identity_verified }; };
        const groups = new Map();
        rows.forEach(r => { const k = r.user_a + r.user_b; const g = groups.get(k) || { id: r.id, a: person(r.user_a), b: person(r.user_b), reasons: [], severity: 'info', status: r.status, detected_at: r.detected_at, note: r.note };
          g.reasons.push(r.reason); if (r.severity === 'critical' || (r.severity === 'review' && g.severity === 'info')) g.severity = r.severity; if (r.status === 'move_requested') g.status = r.status; groups.set(k, g); });
        return res.status(200).json({ items: [...groups.values()] });
      }
      if (kind === 'verified') {
        const rows = await db('verification_status?identity_state=eq.approved&select=user_id,identity_at,document_country,document_type&order=identity_at.desc&limit=100');
        const cards = await cardsFor(rows.map(r => r.user_id), s.user.id);
        return res.status(200).json({ items: rows.map(r => ({ ...r, person: cards[r.user_id] })) });
      }
      return res.status(400).json({ error: 'Unknown queue.' });
    }

    case 'admin-file': {
      const s = await caller(true);
      if (!(await isAdmin(s))) return res.status(403).json({ error: 'Forbidden' });
      res.setHeader('Cache-Control', 'no-store');
      const id = String(req.query.id || '');
      if (!UUID.test(id)) return res.status(400).json({ error: 'Choose a file.' });
      const [row] = req.query.kind === 'org'
        ? await db(`organization_verifications?id=eq.${id}&select=document_path`)
        : await db(`profile_photo_reviews?id=eq.${id}&select=storage_path`);
      const path = row?.document_path || row?.storage_path;
      const url = path ? await storage.sign(req.query.kind === 'org' ? 'org-documents' : 'profile-pending', path, 120) : null;
      if (!url) return res.status(404).json({ error: 'That file is no longer available.' });
      await db('admin_audit_log', { method: 'POST', body: { action: `profiles.${req.query.kind === 'org' ? 'org_document' : 'photo'}_viewed`, target_type: 'profile', target_id: id, meta: {} } }).catch(() => {});
      return res.status(200).json({ url });
    }

    case 'admin-decide': {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
      const s = await caller(true);
      if (!(await isAdmin(s))) return res.status(403).json({ error: 'Forbidden' });
      const b = bodyOf(req), id = String(b.id || ''), note = clean(b.note, 500), at = now().toISOString();
      if (b.kind === 'photo') {
        if (!UUID.test(id)) return res.status(400).json({ error: 'Choose a photo.' });
        const [r] = await db(`profile_photo_reviews?id=eq.${id}&status=eq.pending_review&select=*`);
        if (!r) return res.status(404).json({ error: 'Already decided.' });
        if (b.decision === 'approve') {
          const bytes = await storage.download('profile-pending', r.storage_path, 3 * 1024 * 1024);
          const { sniffImage } = await import('./_moderation.js');
          await publishPhoto(r.user_id, bytes, r.sha256, sniffImage(bytes) || 'image/webp');
          await notify(r.user_id, 'Your photo is live', 'A Cabana moderator approved your new profile photo.', '/profile', 'profile', { event: 'photo_approved' });
        } else {
          await notify(r.user_id, 'Your photo was not approved', note || 'It does not meet Cabana community standards. You can choose another photo or an avatar.', '/profile', 'profile', { event: 'photo_rejected' });
        }
        await storage.remove('profile-pending', [r.storage_path]);
        await db(`profile_photo_reviews?id=eq.${id}`, { method: 'PATCH', body: { status: b.decision === 'approve' ? 'approved' : 'rejected', source: 'human', storage_path: null, reviewed_by: s.user.id, reviewed_at: at, reason: note || r.reason } });
        return res.status(200).json({ ok: true });
      }
      if (b.kind === 'org') {
        if (!UUID.test(id)) return res.status(400).json({ error: 'Choose a submission.' });
        const [r] = await db(`organization_verifications?id=eq.${id}&select=*`);
        if (!r) return res.status(404).json({ error: 'Not found.' });
        if (b.decision === 'approve') {
          if (r.status !== 'submitted') return res.status(409).json({ error: 'Already decided.' });
          await db(`organization_verifications?id=eq.${id}`, { method: 'PATCH', body: { status: 'approved', reviewed_by: s.user.id, reviewed_at: at, review_note: null, updated_at: at } });
          await db(`member_public_profiles?user_id=eq.${r.user_id}`, { method: 'PATCH', body: { account_type: 'organization', org_kind: r.org_kind, org_name: r.legal_name, ...(r.website ? { org_website: r.website } : {}), updated_at: at } });
          await notify(r.user_id, 'Your organisation is verified', 'Your gold checkmark is now live. You can also upload your logo or photos.', '/profile#verification', 'profile', { event: 'org_approved' });
        } else if (b.decision === 'reject' || b.decision === 'revoke') {
          if (!note) return res.status(400).json({ error: 'Add a reason the organisation will read.' });
          await db(`organization_verifications?id=eq.${id}`, { method: 'PATCH', body: { status: b.decision === 'revoke' ? 'revoked' : 'rejected', reviewed_by: s.user.id, reviewed_at: at, review_note: note, updated_at: at } });
          await notify(r.user_id, b.decision === 'revoke' ? 'Your organisation badge was removed' : 'We could not verify your organisation', note, '/profile#verification', 'profile', { event: `org_${b.decision}` });
        } else return res.status(400).json({ error: 'Unknown decision.' });
        await db('admin_audit_log', { method: 'POST', body: { action: `profiles.org_${b.decision}`, target_type: 'profile', target_id: r.user_id, meta: { note } } }).catch(() => {});
        return res.status(200).json({ ok: true });
      }
      if (b.kind === 'report') {
        if (!UUID.test(id)) return res.status(400).json({ error: 'Choose a profile.' });
        if (b.decision === 'remove_photo') {
          const [m] = await db(`member_public_profiles?user_id=eq.${id}&select=photo_url`);
          if (m?.photo_url?.includes('/profile-photos/')) await storage.remove('profile-photos', [decodeURIComponent(m.photo_url.split('/profile-photos/')[1])]);
          await db(`member_public_profiles?user_id=eq.${id}`, { method: 'PATCH', body: { photo_url: null, photo_status: 'none', updated_at: at } });
          await notify(id, 'Your profile photo was removed', note || 'It did not meet Cabana community standards.', '/profile', 'profile', { event: 'photo_removed' });
        } else if (b.decision === 'reset_profile') {
          await db(`member_public_profiles?user_id=eq.${id}`, { method: 'PATCH', body: { headline: '', bio: '', published: false, updated_at: at } });
          await notify(id, 'Your public profile was hidden', note || 'Some of its content did not meet Cabana community standards. Edit it and publish again.', '/profile', 'profile', { event: 'profile_reset' });
        } else if (b.decision === 'restore_photo') {
          await db(`member_public_profiles?user_id=eq.${id}&photo_status=eq.removed`, { method: 'PATCH', body: { photo_status: 'approved', updated_at: at } });
        } else if (b.decision !== 'dismiss') return res.status(400).json({ error: 'Unknown decision.' });
        await db(`profile_reports?target_id=eq.${id}&status=eq.open`, { method: 'PATCH', body: { status: b.decision === 'dismiss' || b.decision === 'restore_photo' ? 'dismissed' : 'actioned', resolution: b.decision, reviewed_by: s.user.id, reviewed_at: at } });
        await db('admin_audit_log', { method: 'POST', body: { action: `profiles.report_${b.decision}`, target_type: 'profile', target_id: id, meta: { note } } }).catch(() => {});
        return res.status(200).json({ ok: true });
      }
      return res.status(400).json({ error: 'Unknown decision.' });
    }

    default:
      return res.status(404).json({ error: 'Unknown action' });
  }
}

