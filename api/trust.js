/* ══════════════════════════════════════════════════════════════
   APATMENTO — Trust Router  (api/trust.js)
   ──────────────────────────────────────────────────────────────
   Vercel counts files, not endpoints. Five handlers that each
   wake up, read a booking and go back to sleep do not need five
   lambdas — they need one door and a hallway.

   The modules behind this router are prefixed with `_`, which
   Vercel treats as private. They are ordinary handlers with
   ordinary signatures; nothing about them knows it is being
   dispatched to. Each remains independently testable.

   Public paths are preserved by rewrites in vercel.json, so no
   client anywhere had to learn a new URL:

     /api/match-guest          → /api/trust?action=match-guest
     /api/checkin-issue        → /api/trust?action=checkin-issue
     /api/deposit-balance      → /api/trust?action=deposit-balance
     /api/verify-checkin       → /api/trust?action=verify-checkin
     /api/check-payment-status → /api/trust?action=check-payment-status
══════════════════════════════════════════════════════════════ */

import matchGuest         from './_match-guest.js';
import checkinIssue       from './_checkin-issue.js';
import depositBalance     from './_deposit-balance.js';
import verifyCheckin      from './_verify-checkin.js';
import checkPaymentStatus from './_check-payment-status.js';

const ROUTES = {
  'match-guest':          matchGuest,
  'checkin-issue':        checkinIssue,
  'deposit-balance':      depositBalance,
  'verify-checkin':       verifyCheckin,
  'check-payment-status': checkPaymentStatus,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  /* The rewrite supplies `action`. A direct caller may too. Anything
     else is a 404 — we do not guess at intent. */
  const action = req.query?.action;
  const route = ROUTES[action];

  if (!route) {
    return res.status(404).json({
      error: 'unknown_action',
      action: action || null,
      available: Object.keys(ROUTES),
    });
  }

  try {
    return await route(req, res);
  } catch (e) {
    /* A handler that threw after writing headers has already had its
       say; stepping on it turns a bad response into a broken one. */
    console.error(`[trust:${action}]`, e);
    if (res.headersSent) return;
    return res.status(500).json({ error: e.message });
  }
}
