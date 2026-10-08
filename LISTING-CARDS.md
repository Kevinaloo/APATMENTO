# Cabana listing cards

The listing pages now share a gesture and focused-form layer while retaining their existing data models, field IDs, uploads, validation and submission handlers.

## Service coverage

| Service | Journey | Interaction |
| --- | --- | --- |
| Stays, roommates, food, shopping | add-listing.html | Swipe service/type/features; focused details, pricing and photos; explicit ownership and publish |
| Tours | list-your-tour.html | Operator and tour cards; swipe tour category and schedule; review submission |
| Events | list-your-event.html | Organiser and event cards; swipe category; original ticket tiers, media and review |
| Car hire | list-your-fleet.html | Operator, engineering and policy cards; swipe class, drive, transmission and supported boolean options; private application |
| Drivers | become-driver.html | Identity, vehicle and payout cards; swipe PSV status and document availability; explicit declaration and application |

All five listing routes expose **Set it up for me**. Requests use the existing `lazy_requests` table and admin queue. The dialog collects a name, international phone number, optional context and contact consent. Failed requests retain inputs; retries reuse the same UUID so a lost response cannot create a duplicate. No request is sent merely by opening the dialog or starting a listing.

## Interaction rules

- Right accepts a choice; left declines an optional boolean or explores the next categorical option. Colour is accompanied by text and buttons.
- **Back always works.** The Back button in a deck returns to the previous card with exactly the answer it had; on the first card it returns to the previous question. Every step after the first has a "Back to …" control in its header (shortened to the step name on phones). Nobody has to restart.
- **Every option is visible.** A compact strip of chips under the card lists all options in the deck. Tapping a chip jumps to that card without answering it, and Back undoes the jump. Chips show what is chosen, skipped or still unseen. "See all" opens the full grid.
- Back preserves unsaved values before dynamic controls are rebuilt. Each service keeps its own draft, saved locally (`cabana:listing-draft:v2`) and offered back as "Pick up where you left off".
- **Each service is its own experience.** The eight services (stays, roommates, tours, events, food, car hire, rides, shopping) each have their own colours, card face, button wording, stamps and hints (`data-skin` in `cabana-listing-cards.css`, words in `SKINS` in `cabana-listing-cards.js`).
- Dragging is compositor-only (`transform`, one `requestAnimationFrame` per frame), with velocity flicks and the Web Animations API. Nothing reflows during a drag, which removes the lag on low-end phones.
- Inputs, maps, uploads, ownership and submission never respond to swipe. Pointer cancellation, vertical scroll, small movements and overlapping clicks cannot advance a decision.
- Full-form and all-options views remain available. Native fields stay mounted and retain their names, IDs and original service handlers.
- Final publishing, partner declarations, payout decisions and driver/fleet consent remain explicit actions. No auto-publishing is introduced.
- Reduced-motion preferences remove decorative movement. Keyboard arrows and visible buttons provide alternatives to dragging.
- Roommate photo validation now runs on the photo step instead of blocking users before they reach it.

## Location

The location step offers three ways in, side by side: **Search** (address suggestions, with "Type it in" and "Pin on map" always one tap away inside the suggestion list), **Pin on map** (a full-screen picker, `cabana-place-picker.js`, that opens on the street map with satellite and hybrid as options) and **Type it in**. A pinned place shows a small street-map preview with the point centred.

## Pricing the host sees, and the price guests see

When a host types a price, `apa-fees.js` shows what they receive, the Cabana fee added on top, and the one all-in price guests will see. Guests only ever see the all-in price: listing cards, detail pages, booking pages and checkout show no fee line. The fee is charged per unit (night, ticket, person, day), so a week costs seven all-in nights. Food, shopping, rides and roommates carry no fee.

## Day pass

Stays can offer a day pass. Hosts set the window (at least two hours) and the days; the rate must be at least 20% below the cheapest nightly rate, checked as they type, on save, and by the database. Guests pick the hours they will actually be there inside the window, and the host sees those hours on the booking. Listings with a day pass carry a Day Pass badge in search.

## Recommendations while listing

- **ID verification**: recommended on the photos step ("under 2 minutes"). Verified hosts rank higher in search (`listings.host_verified`).
- **Cabana 3D Tour**: an opt-in, clearly marked as a paid upgrade. Ticking it means the team gets in touch with prices and the process; nothing is charged at listing time.

## Design basis

One manageable task at a time reduces how much a person must consider at once; visible progress makes the remaining work clear; reversible choices support exploration. These follow Nielsen Norman Group's [progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) and [user control and freedom](https://www.nngroup.com/articles/user-control-and-freedom/) guidance. Engagement is based on useful feedback and completion rather than artificial urgency or endless swiping. Claims of improved conversion require user testing and measurement.

## Verification

Run `node --test tests/listing-cards.test.mjs tests/listing-overhaul.test.mjs` for interaction regression tests and `node scripts/check-syntax.mjs` for the repository preflight. `listing-overhaul.test.mjs` covers Back and the option strip, the day pass 20% rule, all-in prices, the map preview, four-digit check-in codes, the ambassador role and issue-report photos and video.

`tests/ui/listing-cards.cjs` checks the real pages in a separate headless browser, with authentication and remote services mocked. Set `CABANA_PLAYWRIGHT` to an available Playwright package path when it is not locally installed. `CABANA_BROWSER_CHANNEL` defaults to Chrome. Screenshots go to ignored `artifacts/listing-ui/`.

Browser verification does not establish that a production user can submit to the live database. Deployment, real authentication, uploads, ownership RPCs and receipt of a setup request in the admin queue still require a production smoke check.

The per-unit fee, the day pass rule, four-digit check-in codes and issue videos need `supabase/migrations/20261008100000_all_in_prices_day_pass_codes.sql`. Apply it together with the deploy. Until it is applied the pages fall back to the current fee model, and the server's totals stay authoritative.
