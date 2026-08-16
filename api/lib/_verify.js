/* ══════════════════════════════════════════════════════════════════════
   APATMENTO. Identity verification via Didit  (api/verify.js)
   ──────────────────────────────────────────────────────────────────────
   Three actions, routed by ?action=

     start    POST  create a Didit session, return the hosted URL
     status   GET   the caller's own verification state
     webhook  POST  Didit calls this when a decision lands

   Why this lives on the server and cannot move to the browser:
   DIDIT_API_KEY authorises session creation and decision reads for the
   whole CABANA organisation. In client JS it would be readable by anyone
   who opens devtools, and could be used to enumerate other partners'
   verification decisions. It stays here.

   The webhook is the ONLY writer of verification_status. The browser is
   never trusted to report its own outcome — a client that could POST
   "I passed" would make the entire control decorative.
══════════════════════════════════════════════════════════════════════ */

import crypto from 'node:crypto';
import { required, optional } from './_env.js';
import { one, insert, update, upsert } from './_db.js';

const DIDIT_BASE = 'https://verification.didit.me';

/* Workflow ids per risk tier. Set these in Vercel env so sandbox and
   production can point at different Didit applications without a deploy. */
function workflows() {
  return {
    identity:     required('DIDIT_WORKFLOW_IDENTITY'),      // Free KYC: OCR + liveness + face match
    identity_aml: required('DIDIT_WORKFLOW_IDENTITY_AML'),  // KYC + AML
    biometric:    required('DIDIT_WORKFLOW_BIOMETRIC')      // liveness + face match re-auth
  };
}

/* Which workflow a given funnel needs. Mirrors required_tier() in SQL.
   Kept in step with the migration deliberately: if these two disagree,
   a partner could be sent through a weaker check than the database will
   later accept, so any change here needs the same change there. */
const CONTEXT_KIND = {
  rides:     'identity_aml',   // plus a biometric re-auth, handled separately
  carhire:   'identity_aml',
  agent:     'identity_aml',
  payout:    'identity_aml',
  stays:     'identity',
  roommates: 'identity',
  tours:     'identity'
};

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

/* Resolve the caller from their Supabase JWT. We never take a user id
   from the request body — that would let anyone start or read a session
   in someone else's name. */
async function callerId(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const r = await fetch(`${required('SUPABASE_URL')}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: required('SUPABASE_ANON_KEY') }
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.id ? u.id : null;
  } catch { return null; }
}

async function didit(path, init = {}) {
  const r = await fetch(`${DIDIT_BASE}${path}`, {
    ...init,
    headers: {
      'x-api-key': required('DIDIT_API_KEY'),
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  });
  const text = await r.text();
  let body; try { body = JSON.parse(text); } catch { body = { raw: text }; }
  if (!r.ok) {
    const e = new Error(`Didit ${path} -> ${r.status}`);
    e.status = r.status === 401 ? 500 : 502;   // our key being wrong is our fault, not the caller's
    e.detail = body;
    throw e;
  }
  return body;
}

/* ── start ─────────────────────────────────────────────────────────── */

async function start(req, res) {
  const uid = await callerId(req);
  if (!uid) return json(res, 401, { error: 'sign_in_required' });

  const { context = 'stays', country = null } = req.body || {};
  const kind = CONTEXT_KIND[context];
  if (!kind) return json(res, 400, { error: 'unknown_context', context });

  /* Already cleared to the level this context needs? Don't charge the
     org for another check or make the partner repeat themselves. */
  const status = await one('verification_status', `user_id=eq.${uid}&select=*`);
  const needed = kind === 'identity_aml' ? 2 : 1;
  if (status && status.cleared_tier >= needed) {
    return json(res, 200, { already_verified: true, cleared_tier: status.cleared_tier });
  }

  /* Reuse a live session rather than stacking new ones. A partner who
     refreshes the page should land back in the same flow. */
  const live = await one(
    'verification_sessions',
    `user_id=eq.${uid}&context=eq.${context}&state=eq.in_progress` +
    `&expires_at=gt.${new Date().toISOString()}&select=*&order=created_at.desc`
  );
  if (live && live.verification_url) {
    return json(res, 200, { url: live.verification_url, session_id: live.didit_session_id, resumed: true });
  }

  const workflow_id = workflows()[kind];
  const created = await didit('/v2/session/', {
    method: 'POST',
    body: JSON.stringify({
      workflow_id,
      vendor_data: uid,                        // echoed back on the webhook
      metadata: { context, declared_country: country },
      callback: `${optional('PUBLIC_BASE_URL', 'https://cabana.africa')}/partner-listings.html?verified=1`
    })
  });

  const sessionId = created.session_id || created.id;
  const url = created.url || created.verification_url;
  if (!sessionId || !url) {
    return json(res, 502, { error: 'didit_response_incomplete' });
  }

  await insert('verification_sessions', {
    user_id: uid,
    didit_session_id: sessionId,
    workflow_id,
    kind,
    context,
    state: 'in_progress',
    verification_url: url,
    declared_country: country
  }, false);

  return json(res, 200, { url, session_id: sessionId, resumed: false });
}

/* ── status ────────────────────────────────────────────────────────── */

async function status(req, res) {
  const uid = await callerId(req);
  if (!uid) return json(res, 401, { error: 'sign_in_required' });

  const s = await one('verification_status', `user_id=eq.${uid}&select=*`);
  if (!s) {
    return json(res, 200, {
      identity_state: 'not_started', aml_state: 'not_started', cleared_tier: 0
    });
  }
  /* Only fields the browser has a use for. document_country and the
     cached name are shown back to the partner; nothing else leaves. */
  return json(res, 200, {
    identity_state: s.identity_state,
    aml_state: s.aml_state,
    cleared_tier: s.cleared_tier,
    display_name: s.display_name,
    document_country: s.document_country,
    document_type: s.document_type,
    identity_expires: s.identity_expires
  });
}

/* ── webhook ───────────────────────────────────────────────────────── */

/* Didit signs each delivery with an HMAC over the raw body. Verifying it
   is what separates a decision from an assertion: without this check any
   caller could POST an approval for any user id. Compared in constant
   time so a timing side channel cannot leak the expected digest. */
function signatureValid(rawBody, header) {
  const secret = optional('DIDIT_WEBHOOK_SECRET', null);
  if (!secret) return false;               // unset means reject, never allow
  if (!header) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(header).replace(/^sha256=/, ''), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function mapState(diditStatus) {
  switch (String(diditStatus || '').toLowerCase()) {
    case 'approved':          return 'approved';
    case 'declined':
    case 'rejected':          return 'declined';
    case 'in review':
    case 'in_review':         return 'review';
    case 'expired':           return 'expired';
    case 'not started':       return 'not_started';
    default:                  return 'pending';
  }
}

async function webhook(req, res) {
  const raw = req.rawBody || JSON.stringify(req.body || {});
  const sig = req.headers['x-signature'] || req.headers['x-didit-signature'];
  if (!signatureValid(raw, sig)) {
    return json(res, 401, { error: 'bad_signature' });
  }

  const ev = req.body || {};
  const sessionId = ev.session_id || ev.id;
  const uid = ev.vendor_data;
  if (!sessionId || !uid) return json(res, 400, { error: 'missing_session_or_vendor_data' });

  const row = await one('verification_sessions', `didit_session_id=eq.${sessionId}&select=*`);
  if (!row) return json(res, 200, { ignored: 'unknown_session' });   // 200: don't make Didit retry forever
  if (row.user_id !== uid) return json(res, 200, { ignored: 'vendor_data_mismatch' });

  const state = mapState(ev.status);
  const decision = ev.decision || {};
  const idData = decision.id_verification || decision.kyc || {};
  const amlData = decision.aml || null;

  await update('verification_sessions', `id=eq.${row.id}`, {
    state,
    decision: {
      // Keep the shape of the decision, not the contents of the document.
      warnings: decision.warnings || [],
      face_match_score: (decision.face_match || {}).score ?? null,
      liveness: (decision.liveness || {}).status ?? null,
      aml_hits: amlData ? (amlData.total_hits ?? null) : null
    },
    decline_reason: state === 'declined' ? (ev.reason || decision.reason || null) : null,
    document_country: idData.issuing_state || idData.country || null,
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  /* Only an approval moves the status row forward. A declined or expired
     attempt leaves any existing clearance alone — someone who verified
     last year should not lose it because a fresh attempt timed out. */
  if (state === 'approved') {
    const first = (idData.first_name || '').trim();
    const lastInitial = (idData.last_name || '').trim().charAt(0);
    const patch = {
      user_id: uid,
      identity_state: 'approved',
      identity_at: new Date().toISOString(),
      identity_expires: idData.expiration_date || null,
      display_name: first ? (lastInitial ? `${first} ${lastInitial}.` : first) : null,
      document_country: idData.issuing_state || idData.country || null,
      document_type: idData.document_type || null,
      last_session_id: row.id
    };
    /* An AML hit must never auto-clear to tier 2. A sanctions or PEP
       match is a judgement call, so it parks in 'review' for a human. */
    if (row.kind === 'identity_aml') {
      const hits = amlData ? (amlData.total_hits ?? 0) : 0;
      patch.aml_state = hits > 0 ? 'review' : 'approved';
      patch.aml_at = new Date().toISOString();
    }
    await upsert('verification_status', patch, 'user_id');
  } else if (state === 'declined' || state === 'review') {
    const existing = await one('verification_status', `user_id=eq.${uid}&select=user_id`);
    if (!existing) {
      await upsert('verification_status', { user_id: uid, identity_state: state }, 'user_id');
    }
  }

  return json(res, 200, { ok: true, state });
}

/* ── router ────────────────────────────────────────────────────────── */

export default async function handler(req, res) {
  const action = (req.query && req.query.action) || '';
  try {
    if (action === 'verify-start'   && req.method === 'POST') return await start(req, res);
    if (action === 'verify-status'  && req.method === 'GET')  return await status(req, res);
    if (action === 'didit-webhook'  && req.method === 'POST') return await webhook(req, res);
    return json(res, 404, { error: 'unknown_action', action });
  } catch (e) {
    // Never echo e.detail to the caller: it can carry Didit request context.
    console.error('[verify]', action, e && e.message, e && e.detail);
    return json(res, e.status || 500, { error: e.code || 'verification_failed' });
  }
}
