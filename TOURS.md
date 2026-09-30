# Cabana Tours v2

*The tours section of cabana.africa: what a traveller sees, what a guide can
buy, how a booking and a conversation move, and where each rule lives. If the
code and this document disagree, the code is wrong — fix the code.*

---

## In one paragraph

`/tours` used to open on a line of text and a reel that only ran when an admin
had tagged two tours with a video. It now opens on the **Spotlight**, a paid,
full-bleed slideshow that guides and operators buy from their own studio;
under it a **departure board** of every tour leaving in the next thirty days,
each with a clock counting to a real departure; then categories, the
team's curated collections, the guides, a preview of the catalogue and the
pitch to get featured. Every section below the Spotlight is edited in the
console (Tours → Page), and **the page never invents content**: a section
with nothing real in it stays hidden until something real arrives. The full catalogue and the guides directory have pages of their
own, the header carries Saved and Messages on every tours page, and the
messenger that stays use now speaks tours: dates, group sizes and private
offers a guide can send and a traveller can book in one tap.

## The pages

| Page | What it is | Script |
|---|---|---|
| `/tours` | Spotlight (or the cover), departure board, categories, collections, Immersive (off by default), guides, grid preview, "get featured", invite | `cabana-tours-home.js` |
| `/tours-catalogue` | Every tour, with filters that live in the URL (`q`, `cat`, `when`, `len`, `price`, `op`, `saved`, `vr`, `group`, `sort`) | `cabana-tours-catalogue.js` |
| `/tour-guides` | The guides and operators, searchable, with their tours and a Message button | `cabana-tours-guides.js` |
| `/tours-studio` | For guides: buy a Spotlight, see bookings, feature a tour (noindex, no ads) | `cabana-tours-studio.js` |
| `/list-your-tour` | Onboarding: guide or company, then the tour and its schedule | `cabana-list-tour.js` |
| Console → Tours | Moderation, operators, the **Spotlight desk** and the **Page** editor | `cabana-tours-admin.js`, `cabana-tours-page-admin.js` |

Every page shares **`cabana-tours.js`** (the kit: data, saves, cards, the
tour sheet, countdowns, header, search, the contour plates that stand in for
a missing photo) and
**`cabana-tours-kit.css`**. The catalogue, guides and studio pages are built
from `tours.html`'s header and footer so the four cannot drift apart; if you
change the header, change it in `tours.html` and rebuild the other three the
same way.

The tours pages draw their own brand. Each sets `data-brand="own"` on
`<html>` and `window.__APA_BRAND__ = 'cabana-tours'` **before** `pwa.js`, and
none loads `brand.css`, `brand.js`, `cabana-rebrand.js` or `cabana-ds.css`.
The palette is the lilac-breasted roller: night `#0B0918`, turquoise
`#12E0D0`, ultramarine `#3B5BFF`, lilac `#B98CFF`, flamingo `#FF6FA8`, sun
`#FFB020`, ember `#FF5A36`. Type is the rest of Cabana's: **Cabana Display**
(Fraunces, `SOFT` axis at 100, upright and italic, `/fonts/`) for headlines
and the italic accent, **Geist** for everything you read and tap, and **Geist
Mono** for clocks and references. Tokens: `--ct-display`, `--ct-f`,
`--ct-flap`, `--ct-soft`. All are self-hosted with their OFL licences.

## The page editor

`cabana-tours-page-admin.js` · table `tour_page_blocks` · launch copy `cabana-tours-page.js`

Each row is one section of `/tours`: `kind`, `position`, `enabled` and its
`content`. The page reads the table (public read, admin write) and merges
each block over the launch copy field by field, so a half-filled block never
blanks a section. `*stars*` in any title set those words in the italic accent.

| Block | What the console sets | Shows when |
|---|---|---|
| `hero` | The **cover**: photo (desktop and phone), film, focal point, shade, words, search placeholder, quick links; whether "Departing soon" slides run | No Spotlight slide is live |
| `departures` | Words; the clock on or off | A scheduled tour has seats in the next 30 days |
| `kinds` | Words; per category a name, line, photo, order and visibility; show empty categories or not | At least one category has a tour |
| `collection-*` | Words and hand-picked tours (add as many as you like) | At least one picked tour is published |
| `immersive` | On or off | Switched on (off at launch) |
| `guides` | Words; optional hand-picked guides first | A guide has a published tour |
| `catalogue` | Words, how many to show, the "nothing yet" message | Always (the message when empty) |
| `pitch` | Words, points, button | Spotlight sales are on |
| `invite` | Words, points, button | Switched on |

Sections move with ↑↓ and switch on and off from the list. **Cabana
Spotlight slides** (the team's own, kind `house`) are made in the same
editor from real photos or film and can be paused, resumed, ended or
deleted. Uploads go to the public `tours` bucket under
`<uid>/tours-page/`. The launch copy in `cabana-tours-page.js` and the seed
in the migration are kept identical by the tests.

## The Spotlight

`cabana-tours-spotlight.js` · table `tour_spotlights` · settings `tour_spotlight_settings`

**What plays, in order:** paid Spotlights → tours the console features for
free → up to two automatic "Departing soon" slides when fewer than three of
those are running (only tours with a photo; switchable) → Cabana's own
slides, made in the page editor from real media. With nothing to play, the
top of the page is the **cover** from the `hero` block: a photo or film,
the headline, search and quick links. Nothing illustrated stands in for a
real slide.

**Media:** a photo, an uploaded video or a YouTube film (played from
`youtube-nocookie.com`). Photos and videos must be uploaded through the
studio into the buyer's own folder, so nothing is hotlinked and nothing can
change after review. Headlines up to 70 characters; words wrapped in
`*stars*` are set in the italic accent.

**Behaviour:** one slide at a time with a sun that travels the horizon line
as a progress bar; the next slide opens as a circle from where the sun is.
Pauses on hover, on focus, while the tour sheet, booking modal or messenger
is open, and whenever it is off screen or the tab is hidden. Save-Data and
slow connections get stills. **Reduced motion** gets stills *and* waits for
a tap instead of rotating. Views count after 1.5 s on screen, clicks on the
call to action, once per session each (`tour_spotlight_track`).

**Buying one (studio → Spotlight):**

1. Pick the tour it sends people to, the media, the words and an accent.
   The preview on the right is the real engine in preview mode, desktop or
   phone.
2. Pick a package — prices come from `tour_spotlight_settings.prices`
   (defaults: day 1,500 · week 7,500 · fortnight 13,500 · month 24,000
   KES) — and a start date. The calendar shows how many of the
   `max_sponsored` places are free on each of the next sixty days.
3. `tour_spotlight_create` checks all of it again on the server (approved
   operator, published tour, own media, headline length, package on sale,
   start within four months, a free place on every day of the window),
   cancels any earlier unpaid checkout, and returns a `SPOT-XXXXXX-<ms>`
   reference.
4. Payment is M-Pesa through `cabana-pay.js` in full. When the money lands
   (PayHero callback, or the poller), the `booking_payment_spotlight`
   trigger moves it to **in review** and it joins the console inbox.
5. The console approves (the window moves forward by however long review
   took, so review time is never the buyer's loss) or rejects. **A rejected
   paid Spotlight becomes Cabana credit that never expires**, and the buyer
   is told why.

Statuses: `pending_payment → in_review → approved ⇄ paused → ended`, or
`rejected`, or `cancelled` (unpaid only).

## The departure board

`tour_departures(p_days, p_tour, p_per_tour)` expands every published tour's
schedule into real dates, soonest first, only those whose booking window is
still open, with seats left from `cabana_seats_left`. Schedules:

| `schedule_type` | Runs on |
|---|---|
| `daily` | every day |
| `weekly` | the weekday codes in `departure_days` (`mon`…`sun`) |
| `fixed` | `next_departure`, plus any ISO dates in `departure_days` |
| `on_request` | whatever day the traveller asks for — never on the board |

`departure_time` is the Nairobi time a tour leaves; it is for display and the
countdown only. The booking cut-off runs from midnight. The board shows one
card per tour (its next departure with seats), never a full one, never an
on-request tour, never anything more than thirty days out. Filters: this
weekend, next seven days, back the same day, overnight, under KES 5,000.
Clocks tick only while on screen.

## Booking

`cabana-tour-book.js` → `tour_bookings`, reference `TOUR-<tour id>-<ms>`.

Signed out, the modal asks to sign in and brings the traveller back to the
same tour (`/tours?book=<id>&date=&people=`). Signed in: departure chips
(full ones shown, disabled, never pre-selected) or a date picker for daily
and on-request tours; a people stepper bounded by the group size and the
seats left; the deposit and the balance paid to the guide on the day;
**Cabana fee KES 0**. If the guide has sent this traveller a private offer
for that date and group, it is applied automatically. Free tours reserve
without payment. After paying, "Message your guide" opens the booking's
thread, and the guide's number unlocks.

## Messages

`chat.js`, the same messenger and the same server-side guard as stays (see
`CHAT.md`), with tour-specific pieces:

| | |
|---|---|
| Start or reopen a conversation about a tour | `cabana_chat_start_tour(p_tour, p_date, p_people)` |
| Traveller changes the date or group | `cabana_chat_set_tour_trip` |
| Guide sends a private price | `cabana_chat_send_tour_offer(p_conversation, p_date, p_people, p_price, p_note, p_valid_hours)` — checks the tour runs that day, the window is open and the group fits |
| Traveller accepts or declines | `cabana_chat_tour_offer_respond(p_offer, p_action)` — accepting opens the booking modal with the offer applied |
| From a booking to its thread | `cabana_chat_for_tour_booking(p_booking)` · `?chat_tour_booking=<id>` |

The header's Messages icon opens the inbox on every tours page; Saved opens
the saved drawer. Saves are kept locally and, once signed in, synced with
`tour_saves_sync` so they follow the traveller between devices.

## Privacy

Operator contact details (phone, WhatsApp, email) are not readable from the
browser. The public tables expose only `id, owner_id, slug, name, tagline,
bio, logo_url, county, kind, status, verified, verified_at, created_at,
updated_at, persona`; an operator reads their own full row through
`tour_operator_me()`, the console through `admin_tour_operators()`, and a
traveller gets the guide's number only on a paid booking.

## Payments

| Reference | Table | Where it is recognised |
|---|---|---|
| `TOUR-…` | `tour_bookings` | `api/stk-push.js`, `payhero-callback`, `api/lib/_poll-payment.js` |
| `SPOT-…` | `tour_spotlights` | the same three; always charged in full |

## Ads

`/tours`, `/tours-catalogue` and `/tour-guides` are ad surfaces in
`apa-ad-registry.js` (in the results grid, before the closing band, corner
card). They carry paid placements only: Cabana's own house ads are off
(`house: false`) so nothing on the page is filler. `/tours-studio` is on the never list and does not load the ad engine.

## Migrations

| File | What it adds |
|---|---|
| `20260928100000_tours_v2_schedules_and_departures.sql` | weekly schedules, `departure_time`, operator `persona`, `tour_departures` |
| `20260928101000_tours_v2_saves.sql` | `tour_saves`, `tour_saves_sync`, `tour_popularity` |
| `20260928102000_tours_v2_operator_privacy_and_directory.sql` | `tour_operator_me`, `admin_tour_operators`, `tour_guides_directory`, `tour_operator_bookings` |
| `20260928103000_tours_v2_messenger.sql` | tour conversations, `tour_offers`, the tour chat RPCs |
| `20260928104000_tours_v2_spotlight.sql` | the Spotlight: tables, feed, tracking, quote, calendar, create, cancel, console desk, inbox queue, payment trigger, house slides |
| `20260929090000_tours_page_content.sql` | `tour_page_blocks` and the launch copy; retires the illustrated house slides |

## Tests

| | |
|---|---|
| Static contract (runs with `npm test`) | `tests/tours-v2.test.mjs` |
| Browser: Spotlight, board, saves, booking, catalogue, guides, studio, phones | `./tests/ui/run-tours-v2.sh` |
| Database, end to end, rolled back | `tests/tours-v2.sql` |
