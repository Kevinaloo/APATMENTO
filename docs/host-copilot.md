# APA host copilot

The host dashboard opens the existing APA conversation. `host_copilot` tools
discover owned listings, review ten listing areas, and prepare title,
description, cover-photo and calendar-block changes. The browser displays the
exact changes and calls `host.apply` only when the host clicks Apply recommendations.

Recommendations carry an HMAC signature, account ID, listing snapshot and
15-minute expiry. Applying rechecks ownership and the snapshot. Calendar blocks
use the existing calendar RPC with the user's JWT. The host reporting migration
adds privacy-preserving funnel counts, photo-review caching, earnings reporting,
and atomic promotion publication. Production uses the configured Supabase service
key to sign recommendations; local development uses a process-local random key.

## Current limits

- Photo reviews inspect up to eight public listing images through the configured
  vision provider. They report visible evidence and model scores, never measured
  engagement. Unsupported, private or unreadable images receive no ranking.
- Search impressions, detail views and checkout starts accumulate from deployment.
  Counts are deduplicated per browser session and day. Reports expose the tracking
  start and label causal suggestions as hypotheses; they do not backfill traffic.
- Monthly earnings recognize entitlement at fully funded verified check-in, add
  recorded cancellation settlements, subtract recorded penalties, and show guest
  cash receipts, refunds and pending value separately. Cabana lacks a bank receipt
  ledger, so bank payouts remain unknown and earnings are not called profit.
- Christmas promotions use the existing `stay_offers` safeguards. APA shows the
  current protected comparison rate and resulting nightly amount, then publishes
  or saves a requested draft through the signed Apply action. APA booking uses the
  same offer-aware quote RPC as search and checkout.
- Calendar blocking uses the installed `cabana_calendar_manual_block` RPC.
  Price, minimum stay, amenities, map pin and cancellation policy can be included
  in the same reviewed change. APA accepts host-confirmed values only.
- Listings are scoped to `partner_id`, with a legacy `host_id` fallback only when
  `partner_id` is null.
- Changed listings invalidate pending recommendations; timestamped rows also
  check `updated_at` during the update. Cards are transient across page reloads;
  ask APA for a fresh recommendation when needed.

Run `node --test tests/host-copilot.test.mjs tests/apa-agent.test.mjs tests/one-apa.test.mjs`
and `node scripts/check-syntax.mjs` for local validation. Production calendar,
model, reporting and publication integrations require authenticated live verification.
