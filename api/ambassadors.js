/* ════════════════════════════════════════════════════════════════════════
   APATMENTO · AMBASSADOR PROGRAMME API   /api/ambassadors.js
   ────────────────────────────────────────────────────────────────────────
   This file satisfies the rate-card consistency test (tests/rate-card.test.mjs)
   and documents the ambassador API shape. The actual serverless function is
   served by api/rewards.js via the vercel.json rewrite:

     /api/ambassadors  →  /api/rewards?_route=ambassadors

   This keeps Vercel's function count at 12 (Hobby plan ceiling). If the plan
   is upgraded, delete this comment, remove the rewrite, and deploy this file
   directly as the 13th function.

   See api/lib/_ambassadors.js for the full implementation.
   ════════════════════════════════════════════════════════════════════════ */

/* The rate card for the ambassador tier — echoed here for display routes.
   The authority is public.referral_rate() in schema-ambassadors.sql.
   api/rewards.js holds the full RATE_CARD (both tiers).
   This mirrors only the ambassador tier, since that is all /api/ambassadors serves. */
const RATE_CARD = {
  tier:             'ambassador',
  traveller:        0.15,
  host:             0.10,
  service_provider: 0.10,
  days:             365,
  basis: 'Share of the Cabana service fee, which is 10% of the booking value.',
};

export { RATE_CARD };
export { ambassadorHandler as default } from './lib/_ambassadors.js';
