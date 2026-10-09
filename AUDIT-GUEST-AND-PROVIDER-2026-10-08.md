# Cabana guest and provider journey audit, plus device-heat fixes

Date: 8 October 2026 · Branch `claude/affectionate-mayer-0gjkep`

## How this was tested, and what it does not cover

- The app was run locally (`node server.js`) against the **live production Supabase** project, in headless Chromium at 390×844 (phone, touch) and 1440×900.
- 56 public and role routes were loaded at both sizes. Real taps and typing drove the Stays search, the date and guest wizard, listing detail, and Reserve through to sign-in.
- Every write was blocked or stubbed, so **no booking, payment, application or listing was created**.
- Idle CPU, frame callbacks, running animations and GPS use were measured per page in-browser.
- Read-only schema checks and security advisors were run on the production database.
- **Not covered:** no test account credentials were available, so signed-in guest areas and every provider console (host, tour operator, fleet, driver, restaurant, agent, ambassador) are verified only as far as their **public entry and sign-in gate**. Payments (M-Pesa, PayPal) were not exercised. Android was assessed from source only (it is a Trusted Web Activity, with no native wake locks or services).
- CPU figures come from software-rendered headless Chromium. Use them to compare before and after, not as phone absolutes.

Unit tests: 959 of 959 pass (8 new). Syntax and routing preflight is clean.

---

## 1. Device heat and battery (Google flag) — fixed

| # | Cause found | Fix |
|---|---|---|
| 1 | **Continuous high-accuracy GPS on every page.** After a visitor granted location, `apa-location.js` started a `watchPosition` (`maximumAge: 0`) on page load and kept it for the whole visit. | GPS is now on demand. A passive watch is leased for 40 s and released as soon as a fix of 100 m or better lands. Only an online driver holds a continuous watch, and it is released on going offline. Background tabs release it too. |
| 2 | **Tours spotlight ran two 60 fps animation loops forever**, even off-screen or under an overlay (about 120 frame callbacks per second while idle). | The loop stops when unseen, wakes on visibility events, and is paced at about 30 fps. About 120 → 23 callbacks/s. |
| 3 | **World globe**: arc canvas at 60 fps and a map re-projection every frame, whether visible or not (about 116 callbacks/s). | Both stop when hidden or off-screen. Arcs run at about 30 fps and the drift at about 12 fps. About 116 → 35/s. |
| 4 | **About 70 looping CSS animations on the home page**, many animating repaint-heavy properties (`background-position`, `box-shadow`, `filter`, `text-shadow`, `height`, `left`). | New `cabana-calm.js` on all 391 app pages. Off-screen loops pause. On touch devices, repaint-heavy loops rest after an 8 s welcome. Under battery saver, low charge, Save-Data or very low memory they rest at once. It is event-driven, with no polling. Phone check: 0 repaint-heavy loops were still running after the welcome window, and scrolling the home page took 67 running loops to 2. |
| 5 | Listing "journey" (30 s globe plus map, plays on every shared listing link) was the heaviest screen measured, at about 28% main-thread time. | Frame loop paced, cheaper globe draw, and the still version under battery saver. Gain was modest, so see the remaining items below. |
| 6 | Credit popup countdown and the support launcher did full-rate or hidden-tab work. | Paced the countdown. The launcher no longer re-measures layout while the tab is hidden. |

**Remaining heat risk (product decisions, not changed):**
- The listing journey is still the costliest screen. Consider playing it once per session, or only when the guest taps it, and keep the Skip button prominent.
- The rider trip-safety GPS watch (`cabana-rides.js`) is high accuracy for the life of a trip. It is legitimate and server-terminated, but use `maximumAge` and a coarser accuracy after pickup if Google still flags it.
- Six arrival gates (stays, rides, food, drive, shop, jungle) play once per session with Skip. They do not yet honour battery saver. Treating Save-Data as "reduced" in each gate is a one-line change.

---

## 2. Guest journey findings

### Works well
- No horizontal overflow, broken images or missing alt text on any of the 56 pages at either size.
- Stays: destination autosuggest, guided date → guests → "Done · Get matched" wizard, listing detail with photos, 3D tour and clear "Reserve" bar all work. Booking context (id, dates, guests) is preserved through sign-in via `?next=`.
- Flights ("No account needed"), car hire, rides and roommates load with clear forms. Honest empty states (food) rather than invented content.

### Fixed in this pass
1. **Welcome-gift popup landed on top of the listing a guest was reading**, and its overlay swallowed taps. It now waits for the listing drawer, the location journey, native dialogs and any scroll-locked sheet.
2. **409 error on every repeat page view** (`user_segments`): the upsert did not name which of the table's two unique keys to merge on, so segments were never refreshed. It now sets `on_conflict`.
3. **404 for a non-existent font** on `/list-your-fleet` (`InterVariable.woff2`). Removed. The Inter/system fallback renders the same.

### Needs fixing (not changed)
- **Dead query for a dropped table.** `shopping.html:453` and `apa-categories.js:243` query `scraped_shopping`, which an August migration dropped. Every `/shopping` and dashboard load logs a 404. It degrades silently, but the UI test fixtures still assume the table. Remove both calls and update `tests/ui/dashboard-rails.test.js` together.
- **Stacked overlays on first paint.** `/tours` and `/become-partner` show the APA companion bubble over the hero headline within about 5 s, and on `/tours` an Immersive banner as well. Cap to one overlay per page load.
- **Support orb overlaps controls** (for example the "With driver" toggle on car hire at 390 px).
- **Live inventory is thin.** Stays offers only three areas (Syokimau, Kilimani, Obama estate; all Nairobi). Searching Mombasa autosuggests but finds nothing. Food shows no kitchens at all. This is the largest guest-experience gap, and it is supply, not code.
- **Reserve requires an account**, with no dates asked first. This is a deliberate funnel choice, but guest checkout for stays would likely lift conversion. At minimum, collect dates before the sign-in wall.
- Date inputs on flights and roommates use the native `mm/dd/yyyy` control, which looks out of place beside the custom Stays calendar.
- ~~**Unnamed controls**~~ Corrected: the original count (30+ on `/help`, `/tours-catalogue`) was inflated by hidden elements. Re-measured on visible controls only, the real set was a few icon-only back links and one search button. Fixed in section 7.
- Cold first paint is slow: `/` 3.4 s, `/apartments` 3.2 s, `/food` 3.2 s, `/rides` 3.0 s in this environment (headless, uncached).

---

## 3. Service provider findings (public entry points only)

- Entry pages `/become-partner`, `/list-your-tour`, `/list-your-event`, `/list-your-fleet`, `/become-driver` and `/agents` all load with clear value propositions. Gated pages (`/add-listing`, all `/partner-*`, `/driver`, `/rider`, `/partner-fleet`) send a signed-out visitor to sign-in with the `next` destination preserved, with no data exposed.
- `/become-partner` hero: the APA bubble covers the key "Free / M-Pesa" proof points on first view (see overlays above).
- `/driver` is correct for a driver: sign in, then going online holds GPS continuously and going offline releases it (now enforced and tested).
- **Unverified, needs a test account:** listing creation and photo upload, calendar sync, booking acceptance and decline, payout and earnings, tour and fleet consoles, reviews, driver trip acceptance. **Recommendation:** create four non-production fixture accounts (guest, host, driver, operator) and run the same scripted journeys against staging with payments in sandbox.

---

## 4. Platform checks

- **Security advisors (production):** no errors. Warnings: leaked-password protection is off (enable in Supabase Auth settings), some SECURITY DEFINER functions are executable by `anon` and `authenticated` (confirm each is intended), one extension in the public schema.
- Public tables with RLS enabled but no policy: 1 (info level).

## 5. Regression coverage added

`tests/battery-heat.test.mjs` pins: GPS never starts on load, passive watch lease and release, driver-only continuous watch, frame loops stand down when unseen, paced loops, `cabana-calm.js` rules and its absence of polling, and that every page loading the shared lifecycle script also loads the calm guard.

## 6. Follow-up: location journey (reverted to 30 s by request)

A 15-second rebuild (media-time clock, great-circle camera, matched-zoom handoff, quality governor) was tried and **reverted at the owner's request**: it felt less smooth and zoomed to the location too quickly. The journey is back to the original 30-second timeline (stages at 5.4 / 10.8 / 16.2 / 21.6 s), with only the earlier heat protections kept (frame pacing, still version under battery saver, cheaper globe draw). The rebuild remains in git history (`6ff3429`) if parts are wanted later, for example the arrival-only area circle, which fixes the full-screen violet blob during the zoom.

## 7. Pre-merge fixes (all done, 975 of 975 tests pass)

| Item from section 2/3 | Status |
|---|---|
| Dead `scraped_shopping` query (404 on every shopping and dashboard load) | **Fixed.** Removed from `shopping.html` and `apa-categories.js`; the dashboard UI test now uses a partner-listed product. |
| Stacked overlays on first paint | **Fixed.** The APA greeting now waits for the shared overlay slot, claims it while visible, and releases it on dismiss, on opening support, or after 15 s. Verified order on a fresh phone visit: `/tours` Immersive banner, then credit popup, then APA (never on top of each other); `/become-partner` and `/apartments` show APA first and the credit popup after it clears. |
| Support orb covering controls on phones | **Fixed.** On screens up to 720 px it tucks to the edge after 6 s idle (sliver stays tappable; any touch on it, or scrolling up, restores it). |
| Unnamed controls | **Fixed.** `aria-label` added to every icon-only `.tb-back` link across 6 pages and to the shopping search button. |
| Native `mm/dd/yyyy` date fields on flights and roommates | **Fixed.** New shared `cabana-datepick.js`: the same input and ISO `.value`/`change` contract, with a calendar sheet that matches the Stays picker (dark on flights, light on roommates), a return date that cannot precede departure, keyboard support, and live label updates when page code sets the value. Verified end to end: roommates search wrote `?from=2026-10-17`. |

**Pre-existing failures found while verifying (not caused by this work, confirmed on the original base commit `b1ebe17`):** two checks in `tests/ui/dashboard-rails.test.js` (a manual browser suite, not part of `npm test`) fail on a clean checkout: the credit popup overlays a dashboard card during the test window, and `/events?open=<id>` does not open the tapped event. The second looks like a real deep-link bug worth its own fix.

**Still open (need your decision, or a test account):** Reserve-requires-account funnel, listing-journey frequency, Supabase leaked-password protection, SECURITY DEFINER review, thin inventory, and the provider consoles.
