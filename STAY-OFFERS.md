# Stay offers and seasonal campaigns

Hosts open **Partner Hub → My Listings → Explore offers**, or **Offers** on a stay card. Admins use **Offers & campaigns** in the existing admin navigation. These are embedded sections, using the existing fonts, colours and layout.

## Host controls

Create an offer in three steps: choose a stay and an offer idea; set the discount and stay dates; review and publish or save as a draft. The price panel shows the host amount, Cabana fee and guest total for one eligible night. Minimum rates and detailed eligibility are under More options. Activate immediately or schedule the booking window. Optional rules cover minimum/maximum nights, advance booking, eligible weekdays and excluded nights. Every occupied night must qualify; the checkout date is not an occupied night. Pause or end an offer at any time for future bookings.

Quieter weekdays, longer stays, advance booking and last-minute presets populate conditions without publishing anything. Joining a seasonal campaign creates a host-owned offer at the host's chosen discount. Hosts may use stricter dates and conditions than the campaign.

## Honest pricing

- One lowest eligible stay total wins. Offers do not stack or purchase a ranking boost.
- The calculation uses the lowest of the current nightly rate, the reference locked when the offer was created, and relevant recorded rates from the previous 30 days. Increasing a nightly rate cannot increase an existing offer's protected reference.
- A host's minimum rate can reduce the effective percentage. The preview shows the effective percentage, and guest savings use actual amounts, never the requested headline percentage.
- Repeated or overlapping promotions and campaigns longer than 30 days do not receive verified comparison claims based on ordinary-rate history alone. Guests still receive the best offer price.
- History begins when deployed. No backdated evidence is invented. Until 30 continuous days support the comparison, a guest sees the offer price without a verified savings claim.
- A change to stay terms prevents an existing offer from applying. The host must create an offer for the new terms. An ownership transfer also prevents the previous host's offers from applying.
- Booking windows use explicit timestamps displayed and entered in the browser's local time zone. Unedited existing timestamps are preserved exactly. The offer's named time zone controls advance-booking days. Stay windows use calendar dates, including latest checkout.

## Admin campaigns

Create a draft with a booking window, stay window, country eligibility and discount bounds. Publish to invite participation in the Partner Hub; no host is automatically enrolled and no promotional messages are sent. Once hosts have joined, campaign dates and economic terms are locked. Pause/end the campaign, or create a new one if terms need changing. Admins may stop a host offer but cannot choose discounts on behalf of another host.

Offer and campaign changes are written to an append-only audit table accessible to admins. There are no fabricated campaign participation or conversion counts.

## Guest checkout

Date-specific stay cards show the total including Cabana's existing fixed fee. Search price comparisons use the payable nightly equivalent. Without dates, cards show the host's ordinary nightly rate and ask for dates to calculate the total.

The quote RPC and booking trigger use the same calculation. Checkout no longer trusts a price in its URL. Dates and guest count pass from search into checkout. A changed quote requires the guest to review the new total and press pay again. The booking stores the applied offer and its savings snapshot; changes to offers cannot rewrite that receipt. Credits, payment verification, deposit rules and inventory settlement continue through their existing paths.

## Current coverage and deliberate limits

This release covers claimed **stay listings with KES nightly pricing**, matching the existing secure stay checkout. It does not silently extend that settlement model to tours, food, rides, external partner inventory or other currencies. It uses the flat nightly rate currently enforced by the stay booking trigger; it does not add a new bedroom-tier or per-date rate engine. Quotes are prices, not inventory reservations. Existing inventory checks and payment settlement still control availability.

The existing KES 300 / 800 fixed fee is unchanged. It is now disclosed consistently on date-specific stay results instead of the previous contradictory “No fees” label. History evidence measures rates recorded on Cabana, not independently verified competitor prices or completed sales.

## Database and verification

`schema-stay-offers.sql` and `schema-stay-offers-booking.sql` are applied through Supabase migrations `stay_offers_price_history_and_campaigns` and `stay_offer_preview_and_authoritative_booking_quote` respectively. `schema-stay-offers-evidence.sql` applies the conservative repeated-offer evidence check and numeric price bounds. No campaigns/offers are seeded.

Run `node --test tests/offer-editor.test.mjs tests/stay-offers.test.mjs tests/booking-receipt.test.mjs tests/stays-listing-experience.test.mjs`. Run `tests/stay-offers.sql` and `tests/stay-campaigns.sql` with the Supabase SQL tool; both use disposable fixtures and roll back every change. SQL tests require existing host, guest and admin identities for role-policy simulation; they do not send messages or collect payments.

Checked: anti-inflation, best offer, floors, no unsupported savings claims, exclusions, minimum nights, advance windows, schedules, owner isolation, anonymous quote/private history boundary, immutable booking receipt, stale quote rejection, campaign bounds/consent/pausing, and client quote races. Existing receipt and stay-photo/favourites regressions pass. Local dependency installation and full browser preview were unavailable in the agent environment; deployment build results must be checked separately. No live payment is made as part of verification.

## Release status — 8 September 2026

Frontend and Node regression tests were committed to main at `4e6e4edb5e5746505aab72006316c7af01205f5d`. All four Supabase migrations were applied, including `stay_offer_repeated_promotion_evidence` and `stay_offer_evidence_lookup_indexes`.

The interface is not deployed: Vercel rejected the existing hourly `expire-match-offers` cron because the project uses Hobby. Its frequency was not weakened. Moving that existing maintenance task to a compatible scheduler or upgrading the hosting plan is required.

The full GitHub quality run passed 548 of 549 tests. The sole failure is the pre-existing calendar scheduler assertion (three Vercel crons where the test expects two), confirmed on the parent commit. The separate SEO output-sync gate also fails; its generation and verification steps complete, then detect stale generated pages. The 14 targeted client/receipt/listing tests and both transactional database suites pass.

The user approved direct publication of the remaining migration and SQL test files to main. These files document migrations already installed in Supabase.

## Offer editor refresh — 10 September 2026

The host editor uses progressive steps, an always-visible desktop price panel, local booking times, explicit Publish/Save as draft actions and inline validation. Existing offers keep their status and hidden conditions unless changed. The overview has real live/scheduled/draft counts and campaign invitation cards. Guest search prices label eligible offers without inventing percentage savings. No new backend, scheduled task or dependency is introduced. The 11 editor interaction tests and 8 existing quote tests pass; authenticated visual verification requires a host session.
