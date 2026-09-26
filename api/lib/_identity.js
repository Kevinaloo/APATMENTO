/* ════════════════════════════════════════════════════════════════════
   CABANA · ONE IDENTITY
   ────────────────────────────────────────────────────────────────────
   One person, one verified identity, recognised everywhere:
     · verify once, and agent KYC, driver onboarding, room bookings,
       payouts and photo uploads all know it;
     · the same person cannot quietly return on a fresh account after
       a ban, or hold two verified accounts.

   Privacy: nothing identifying is stored. Every fingerprint is an
   HMAC-SHA256 under a server-only pepper (IDENTITY_PEPPER), so a hash
   cannot be reversed, guessed from a list of ID numbers, or matched
   by anyone who does not hold the pepper.

   Tone: signals are graded. Only strong evidence (same document, same
   ID number, Didit's own duplicate match) changes what a member sees,
   and even then the message is calm and offers a way forward.
   Shared phones or devices only reach operators.
   ════════════════════════════════════════════════════════════════════ */
import { createHmac } from 'node:crypto';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const first = v => (Array.isArray(v) ? v[0] : v);

export function pepper(env = process.env) {
  if (env.IDENTITY_PEPPER && env.IDENTITY_PEPPER.length >= 16) return env.IDENTITY_PEPPER;
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('identity_pepper_unavailable');
  return createHmac('sha256', env.SUPABASE_SERVICE_ROLE_KEY).update('cabana-identity-v1').digest('hex');
}
export const fp = (key, value) => createHmac('sha256', key).update(value, 'utf8').digest('hex');

const clean = s => String(s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toUpperCase();
const alnum = s => clean(s).replace(/[^A-Z0-9]/g, '');
export const normNumber = s => alnum(s).replace(/^0+(?=\d{5})/, '');
export function normName(first, last) {
  // Token-sorted, so "Kevin Aloo Okoth" and "Okoth Kevin Aloo" agree.
  return clean(`${first || ''} ${last || ''}`).replace(/[^A-Z ]/g, ' ').split(/\s+/).filter(t => t.length > 1).sort().join(' ');
}
function docFamily(type) {
  const t = clean(type);
  if (/PASSPORT/.test(t)) return 'P';
  if (/DRIV/.test(t)) return 'D';
  if (/RESID|PERMIT/.test(t)) return 'R';
  return 'I';
}

/** Keyed fingerprints for one Didit decision. Raw values never leave this function. */
export function fingerprints(decision, key) {
  const idv = first(decision?.id_verifications) || decision?.id_verification || {};
  const country = alnum(idv.issuing_state || idv.nationality || '').slice(0, 3);
  const out = [];
  const add = (kind, value) => { if (value) out.push({ kind, hash: fp(key, `${kind}|${value}`) }); };
  const docNo = normNumber(idv.document_number), personal = normNumber(idv.personal_number || idv.mrz?.optional_data_2);
  if (country && docNo.length >= 5) add('document', `${country}|${docFamily(idv.document_type)}|${docNo}`);
  // National ID numbers are what drivers, agents and payouts type in.
  for (const n of new Set([personal, docFamily(idv.document_type) === 'I' ? docNo : ''].filter(v => v && v.length >= 5))) add('id_number', `${country}|${n}`);
  const name = normName(idv.first_name, idv.last_name) || normName(idv.full_name, '');
  const dob = /^\d{4}-\d{2}-\d{2}$/.test(String(idv.date_of_birth || '')) ? idv.date_of_birth : '';
  if (name && dob) add('name_dob', `${name}|${dob}`);
  for (const ip of (decision?.ip_analyses || [])) {
    const dev = String(ip?.device_fingerprint || '').trim();
    if (dev.length >= 8) add('device', dev);
  }
  const seen = new Set();
  return out.filter(f => (seen.has(f.kind + f.hash) ? false : seen.add(f.kind + f.hash)));
}

/** Other Cabana accounts Didit itself says this document or face was seen on. */
export function diditMatches(decision, self) {
  const found = [];
  const scan = (list, reason) => (list || []).forEach(block => (block?.matches || []).forEach(m => {
    const v = String(m?.vendor_data || '');
    if (UUID.test(v) && v !== self) found.push({ user: v, reason, similarity: m?.similarity_percentage ?? null, blocklisted: !!m?.is_blocklisted });
  }));
  scan(decision?.id_verifications, 'same_document');
  scan(decision?.liveness_checks, 'same_face');
  return found;
}

export function maskEmail(email) {
  const [u, d] = String(email || '').split('@');
  if (!u || !d) return null;
  const vis = u.length <= 2 ? u[0] : u[0] + '•'.repeat(Math.min(8, u.length - 2)) + u[u.length - 1];
  return `${vis}@${d}`;
}

const STRONG = new Set(['same_document', 'same_id_number', 'same_face']);

/**
 * Decide what a fresh approval means for this account.
 *   approve   – nothing of concern
 *   review    – strong link to a restricted account, or the same face on
 *               a different document: an operator looks first
 *   duplicate – the same document already backs another active,
 *               verified account (one person, one verified account)
 */
export async function assess({ db, rpc, userId, sessionRowId, decision, key }) {
  const prints = fingerprints(decision, key);
  // 1 · remember this identity (idempotent)
  if (prints.length) {
    await db('identity_fingerprints?on_conflict=user_id,kind,hash', {
      method: 'POST', prefer: 'resolution=ignore-duplicates',
      body: prints.map(p => ({ user_id: userId, kind: p.kind, hash: p.hash, source: 'didit', session_id: sessionRowId || null })),
    }).catch(() => {});
  }
  // 2 · who else carries it?
  const byKind = k => prints.filter(p => p.kind === k).map(p => p.hash);
  const reasonFor = { document: 'same_document', id_number: 'same_id_number', name_dob: 'same_name_dob', device: 'same_device' };
  const candidates = new Map(); // user → Set(reasons)
  const note = (u, r) => { if (!candidates.has(u)) candidates.set(u, new Set()); candidates.get(u).add(r); };
  for (const kind of Object.keys(reasonFor)) {
    const hashes = byKind(kind);
    if (!hashes.length) continue;
    const rows = await db(`identity_fingerprints?kind=eq.${kind}&hash=in.(${hashes.join(',')})&user_id=neq.${userId}&select=user_id&limit=50`).catch(() => []);
    rows.forEach(r => note(r.user_id, reasonFor[kind]));
  }
  for (const m of diditMatches(decision, userId)) note(m.user, m.reason);
  // A ban outlives the account: the denylist keeps banned identities even after deletion.
  const strongPrints = prints.filter(p => p.kind !== 'device');
  let denied = [];
  if (strongPrints.length) {
    denied = await db(`identity_denylist?lifted_at=is.null&kind=in.(document,id_number,name_dob)&hash=in.(${strongPrints.map(p => p.hash).join(',')})&select=kind,source_user&limit=10`).catch(() => []);
    denied.filter(d => d.source_user && d.source_user !== userId).forEach(d => note(d.source_user, reasonFor[d.kind]));
  }
  if (denied.some(d => d.source_user !== userId) && !candidates.size) return { action: 'review', critical: true, prints: prints.length, links: [] };
  if (!candidates.size) return { action: 'approve', prints: prints.length, links: [] };

  const ids = [...candidates.keys()].filter(u => UUID.test(u));
  const [profiles, statuses, allowed] = await Promise.all([
    db(`profiles?id=in.(${ids.join(',')})&select=id,email,banned,suspended_until,host_status,status`).catch(() => []),
    db(`verification_status?user_id=in.(${ids.join(',')})&identity_state=eq.approved&select=user_id`).catch(() => []),
    db(`identity_links?or=(and(user_a.eq.${userId},user_b.in.(${ids.join(',')})),and(user_b.eq.${userId},user_a.in.(${ids.join(',')})))&status=in.(allowed,same_person,dismissed)&select=user_a,user_b`).catch(() => []),
  ]);
  const cleared = new Set(allowed.map(a => (a.user_a === userId ? a.user_b : a.user_a)));
  const verified = new Set(statuses.map(s => s.user_id));
  const pmap = new Map(profiles.map(p => [p.id, p]));
  const restricted = p => !!p && (p.banned || (p.suspended_until && new Date(p.suspended_until) > new Date()) || ['suspended', 'banned'].includes(p.host_status) || ['suspended', 'banned'].includes(p.status));

  let action = 'approve', hint = null, critical = false;
  const links = [];
  for (const [other, reasons] of candidates) {
    const p = pmap.get(other);
    if (!p) continue; // deleted account
    const isRestricted = restricted(p), isVerified = verified.has(other), isCleared = cleared.has(other);
    const strong = [...reasons].some(r => STRONG.has(r));
    const sameDoc = reasons.has('same_document') || reasons.has('same_id_number');
    for (const reason of reasons) {
      const strength = STRONG.has(reason) ? 'strong' : reason === 'same_name_dob' ? 'medium' : 'weak';
      const severity = isRestricted ? (strength === 'weak' ? 'review' : 'critical') : strength === 'strong' ? 'review' : 'info';
      const why = isRestricted ? 'Linked account is restricted' : isVerified ? 'Other account already verified' : null;
      await rpc('cabana_link_accounts', { p_a: userId, p_b: other, p_reason: reason, p_strength: strength, p_severity: severity, p_note: why }).catch(() => {});
      links.push({ other, reason, strength, severity });
    }
    if (isCleared) continue;
    if (denied.some(d => d.source_user === other)) { action = 'review'; critical = true; continue; }
    if (isRestricted && (strong || reasons.has('same_name_dob'))) { action = 'review'; critical = true; }
    else if (sameDoc && isVerified && action !== 'review') { action = 'duplicate'; hint = maskEmail(p.email); }
    else if (reasons.has('same_face') && !sameDoc && isVerified && action === 'approve') { action = 'review'; }
  }
  return { action, hint, critical, prints: prints.length, links };
}

/* ── contexts: what each part of Cabana needs from you ─────────────── */
export const CONTEXTS = {
  roommate: { need: 'identity', required: true, label: 'Room bookings', why: 'Room hosts share their home, so both sides verify before a key changes hands.' },
  agent: { need: 'identity', required: true, label: 'Agent network', why: 'Hosts trust agents whose identity Cabana has confirmed.' },
  driver: { need: 'identity', required: false, label: 'Cabana Move drivers', why: 'A verified identity speeds up your driver review.' },
  host: { need: 'identity', required: false, label: 'Hosting', why: 'Guests see a purple tick on your listings and book with more confidence.' },
  payout: { need: 'identity', required: false, label: 'Payouts', why: 'Verified accounts are paid out without extra checks.' },
  fleet: { need: 'identity', required: false, label: 'Car hire', why: 'Renters see who owns the fleet they are booking.' },
  photo: { need: 'identity', required: true, label: 'Profile photos', why: 'Only verified people can upload their own photo.' },
};
