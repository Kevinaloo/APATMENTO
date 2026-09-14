# Cabana production-readiness audit

Date: 14 September 2026
System: GitHub `Kevinaloo/APATMENTO`, Supabase `gfwgbgdvxtocwhilrtdw`, Vercel `cabana.africa`

## Scope and evidence

This audit treated the repository, database, authentication, storage, serverless
API and deployed site as one system. It inspected all 389 root HTML pages, 149
JavaScript modules, 322 inline scripts, 28 browser API routes, 12 serverless
entry points, the live Vercel deployment and logs, all public-schema tables,
RLS policies, exposed views/functions, storage buckets and Supabase advisors.

The public guest journey was exercised in a browser at desktop and 390 × 844
mobile sizes. Stays inventory, listing detail and the reservation entry point
loaded real records without console errors. Public and role routes for guests,
hosts, service providers, ambassadors/partners and admins were checked for HTTP
availability. Authorization was verified directly against Supabase using the
four supplied account identities. No booking, payment, payout or application
was submitted because doing so would create false production activity.

## Fixed in this release

### Critical

- **Listing ownership data crossed tenant boundaries.** The
  `v_listing_ownership` security-definer view exposed all eight ownership
  records, including contacts and payout routing, to an ordinary signed-in
  account. The view now invokes underlying RLS and filters to admins,
  operators, listing owners, hosts and active listing partners. Verified
  visibility is admin 8, ambassador/listing owner 2, host 1 and guest 0.
- **Repository and diagnostic source was deployed as public web content.**
  `/server.js`, `/schema-rides.sql` and
  `/tools/diagnose-listings.html` returned HTTP 200. Deployment exclusions
  now remove source, migrations, tests, tools, environment files and audit
  material. The local production mirror returns 404 for these paths.

### High

- The empty legacy `wb_bookings` table allowed anonymous insertion and
  unrestricted reading of guest names, phones, emails and payment references.
  It is now admin/operator only.
- Every authenticated user could read, edit and delete every
  `lazy_requests` lead, including names and phone numbers. Submissions remain
  public by design; management is now admin/operator only.
- The empty `finance-proofs` storage bucket was public and allowed anonymous
  upload/read. It is now private and limited to the signed-in user's folder or
  an admin/operator.
- A duplicate permissive referral policy exposed future referral
  relationships. Participants now see only their own relationship rows.
- `tours_public` ran as its owner and bypassed RLS. It now respects the
  published-tour and approved-operator policies. Supabase reports no remaining
  security-definer-view errors.
- API database helpers silently fell back to process memory when production
  credentials were missing, which could report success for data that vanished
  after the request. Production now fails closed with HTTP 503.
- Internal scheduler, broadcast, expiry, import and trigger functions were
  executable through the public API. Their grants now match their callers:
  service-role only for internal work, authenticated only for the one
  client-facing match function, and no anonymous access to admin flight-desk
  functions. Anonymous executable security-definer findings fell from 35 to
  25 and authenticated findings from 85 to 78; the remaining functions are
  deliberate token, availability, referral or signed-in transactional RPCs.
- Shared advertising, brand and interstitial buckets allowed any signed-in
  account to modify production assets. Writes are now admin/operator only.
  Partner uploads are readable and writable only inside the user's own folder,
  with admin/operator access for support.
- The partner dashboard selected optional listing columns. PostgREST rejected
  the whole query after schema drift, so an established host was shown as
  having no services. It now uses the same resilient listing query as the
  listing manager and reports query failures rather than presenting a false
  empty state.
- Partner pages advertised three conflicting referral terms. They now match
  the existing rewards rate card: 5% of Cabana's service fee for referred
  hosts and 10% for referred travellers, each for 365 days.

### Medium

- Unknown URLs returned the homepage with HTTP 200. A branded, non-indexable
  404 page now returns the correct status.
- The local server maintained a second hand-written API rewrite table that had
  drifted from Vercel. It now reads `vercel.json`, preserves rewrite query
  parameters and refuses nested or unknown API modules.
- Calendar queue polling produced repeated transient Supabase gateway errors.
  The idempotent due-feed read now retries once on 502/503/504; write RPCs are
  never retried.
- The dashboard displayed a fabricated waitlist counter. It was removed. The
  Africa allocation copy now matches the existing legal wording: 10% of net
  revenue.
- All static form controls now expose an accessible label. The scan previously
  found 181 unlabeled controls.
- Overlong rides and car-hire descriptions and two redirect-hop links were
  corrected. SEO verification now reports zero failures and zero warnings.
- Windows path handling in the test and preflight tools was corrected, allowing
  the full suite to run consistently in this workspace.

## Verification

- Full automated suite: **590 passed, 0 failed**.
- Production preflight: **149 modules and 322 inline scripts parsed**; imports
  resolved; 12 API entry points loaded; 28 client API routes reachable.
- Static audit: **389 pages**, zero script syntax errors, missing local assets,
  broken local links, duplicate IDs or unlabeled static controls.
- SEO: **111 indexable pages**, 375 JSON-LD blocks, zero failures and warnings.
- Local HTTP checks: main routes 200; unknown routes, source, SQL and diagnostic
  tools 404.
- Supabase advisor: security-definer-view errors reduced from two to zero.
- Authenticated production journeys: admin console, host listing management,
  host bookings and ambassador dashboard loaded with the expected account
  boundaries. The supplied traveller-account password was rejected, so its
  signed-in journey remains unverified; public guest journeys were tested.

## Remaining prioritized work

### High

- Supabase leaked-password protection remains disabled because the dashboard
  makes it available only on Pro while this project is on Free. Enable it when
  upgrading the project; no billing change was made during this audit.

### Medium

- Five HTML entry pages remain large: apartments (~371 KB), admin (~355 KB),
  dashboard (~236 KB), add-listing (~211 KB) and home (~206 KB). Split
  route-specific JavaScript and defer non-critical panels before a visual
  redesign.
- Supabase performance advisors report 48 unindexed foreign keys, 137 RLS
  `auth.*` initialization-plan findings, 191 unused indexes, 423
  multiple-permissive-policy findings and five duplicate-index findings.
  Address these from measured query plans and production usage; deleting or
  merging them as a batch would risk active flows.
- Vercel emitted a Node `url.parse` deprecation warning from the runtime
  dependency path. Capture a trace in a preview deployment before replacing a
  dependency.

### Operational limits of this audit

- Admin, host and ambassador browser sessions were verified. The traveller
  account requires Google sign-in or a different password before its private
  booking/profile journey can be checked interactively.
- Payment, booking, payout, listing publication, driver application and partner
  application submissions were stopped before the irreversible write or
  payment step to avoid fabricating production records or prices.
