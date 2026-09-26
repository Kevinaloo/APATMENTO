/* ════════════════════════════════════════════════════════════════════
   CABANA · IDENTITY VERIFICATION (Didit)
   ────────────────────────────────────────────────────────────────────
   Didit runs the document scan, liveness and face match on its own
   hosted page. Cabana never receives or stores the ID document, the
   selfie or the ID number. We keep only the outcome and the minimum
   needed to explain it: status, document type and country, and the
   verified first name + last initial (shown to the member, never to
   the public).

   Trust model: a webhook is only a nudge. Whatever arrives, the server
   re-reads the decision from Didit with its own API key, and only for
   a session Cabana itself created. A forged webhook can at most make
   us fetch the truth early.
   ════════════════════════════════════════════════════════════════════ */
import { createHmac, timingSafeEqual } from 'node:crypto';

export const DIDIT_API = 'https://verification.didit.me/v3';
// "Free KYC" (document + passive liveness + face match) on the live app.
export const DEFAULT_WORKFLOW = '152d6d85-a1d1-46bd-abc2-7eca9341c0ab';

export function diditConfigured(env = process.env) { return Boolean(env.DIDIT_API_KEY); }

export function mapStatus(status) {
  switch (String(status || '')) {
    case 'Approved': return 'approved';
    case 'Declined': return 'declined';
    case 'In Review': return 'review';
    case 'Expired': case 'Abandoned': case 'Kyc Expired': return 'expired';
    default: return 'in_progress'; // Not Started, In Progress, Awaiting User, Resubmitted
  }
}
export const TERMINAL = new Set(['approved', 'declined', 'expired']);

export async function createSession({ userId, callback, env = process.env, fetchImpl = fetch }) {
  const r = await fetchImpl(`${DIDIT_API}/session/`, {
    method: 'POST',
    headers: { 'x-api-key': env.DIDIT_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    signal: AbortSignal.timeout(12000),
    body: JSON.stringify({
      workflow_id: env.DIDIT_WORKFLOW_ID || DEFAULT_WORKFLOW,
      vendor_data: userId,
      callback,
      metadata: { source: 'cabana-profile' },
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.session_id || !j.url) {
    throw Object.assign(new Error('Identity check could not start. Please try again in a minute.'), { status: 502, upstream: r.status });
  }
  return { sessionId: String(j.session_id), url: String(j.url), workflowId: String(j.workflow_id || env.DIDIT_WORKFLOW_ID || DEFAULT_WORKFLOW) };
}

export async function fetchDecision(sessionId, { env = process.env, fetchImpl = fetch } = {}) {
  const r = await fetchImpl(`${DIDIT_API}/session/${encodeURIComponent(sessionId)}/decision/`, {
    headers: { 'x-api-key': env.DIDIT_API_KEY, Accept: 'application/json' },
    signal: AbortSignal.timeout(12000),
  });
  if (!r.ok) throw Object.assign(new Error('decision_unavailable'), { status: 502, upstream: r.status });
  return r.json();
}

const first = (v) => Array.isArray(v) ? v[0] : v;

function ageOn(dob, now = new Date()) {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age--;
  return age;
}
function nameCase(s) {
  return String(s || '').trim().toLowerCase().replace(/(^|[\s'-])\p{L}/gu, c => c.toUpperCase());
}

/**
 * Reduce a Didit decision to what Cabana is allowed to keep.
 * Accepts both the v3 plural arrays and the older singular objects.
 */
export function summariseDecision(d, { now = new Date() } = {}) {
  const idv = first(d?.id_verifications) || d?.id_verification || {};
  const features = [];
  const push = (name, v) => { const x = first(v); if (x && x.status) features.push({ feature: name, status: String(x.status) }); };
  push('ID_VERIFICATION', d?.id_verifications || d?.id_verification);
  push('LIVENESS', d?.liveness_checks || d?.liveness);
  push('FACE_MATCH', d?.face_matches || d?.face_match);
  const warnings = [];
  for (const block of [idv, first(d?.liveness_checks || d?.liveness), first(d?.face_matches || d?.face_match)]) {
    for (const w of (block?.warnings || [])) {
      const code = typeof w === 'string' ? w : w?.risk || w?.short_description || w?.code;
      if (code) warnings.push(String(code).slice(0, 60));
    }
  }
  let state = mapStatus(d?.status);
  let declineReason = null;
  const age = idv.date_of_birth ? ageOn(idv.date_of_birth, now) : null;
  if (state === 'approved' && age != null && age < 18) { state = 'declined'; declineReason = 'age'; }
  const expires = idv.expiration_date && !Number.isNaN(new Date(idv.expiration_date).getTime()) ? new Date(idv.expiration_date) : null;
  if (state === 'approved' && expires && expires < now) { state = 'declined'; declineReason = 'document_expired'; }
  if (state === 'declined' && !declineReason) declineReason = warnings[0] ? 'checks_failed' : 'declined';
  const firstName = nameCase(idv.first_name || String(idv.full_name || '').split(/\s+/)[0] || '');
  const lastName = nameCase(idv.last_name || String(idv.full_name || '').split(/\s+/).slice(1).join(' ') || '');
  return {
    state,
    declineReason,
    vendorData: d?.vendor_data ? String(d.vendor_data) : null,
    workflowId: d?.workflow_id ? String(d.workflow_id) : null,
    documentType: idv.document_type ? String(idv.document_type).slice(0, 40) : null,
    documentCountry: idv.issuing_state ? String(idv.issuing_state).slice(0, 3).toUpperCase() : null,
    documentExpires: expires ? expires.toISOString() : null,
    // Shown only to the member themself, as "Verified as Kevin A."
    verifiedName: firstName ? `${firstName}${lastName ? ' ' + lastName[0] + '.' : ''}`.slice(0, 40) : null,
    stored: { status: String(d?.status || ''), features, warnings: [...new Set(warnings)].slice(0, 8), document_type: idv.document_type || null, issuing_state: idv.issuing_state || null },
  };
}

/* ── webhook signatures ─────────────────────────────────────────────── */
function shortenFloats(v) {
  if (Array.isArray(v)) return v.map(shortenFloats);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shortenFloats(x)]));
  if (typeof v === 'number' && !Number.isInteger(v) && v % 1 === 0) return Math.trunc(v);
  return v;
}
function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') return Object.keys(v).sort().reduce((a, k) => { a[k] = sortKeys(v[k]); return a; }, {});
  return v;
}
function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''), 'utf8'), y = Buffer.from(String(b || ''), 'utf8');
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}
export function verifyWebhook({ body, headers, secret, now = Date.now() }) {
  if (!secret) return { ok: false, reason: 'no_secret' };
  const ts = Number(headers['x-timestamp']);
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > 300) return { ok: false, reason: 'stale' };
  const v2 = headers['x-signature-v2'];
  if (v2) {
    const canonical = JSON.stringify(sortKeys(shortenFloats(body)));
    const expected = createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');
    if (safeEqual(expected, v2)) return { ok: true, method: 'v2' };
  }
  const simple = headers['x-signature-simple'];
  if (simple && body) {
    const msg = `${headers['x-timestamp']}:${body.session_id || ''}:${body.status || ''}:${body.webhook_type || ''}`;
    const expected = createHmac('sha256', secret).update(msg, 'utf8').digest('hex');
    if (safeEqual(expected, simple)) return { ok: true, method: 'simple' };
  }
  return { ok: false, reason: 'mismatch' };
}
