# Cabana Tours v3

*The tours section of cabana.africa: what a traveller sees, what a guide can
buy and run, what the console controls, and where each rule lives. If the
code and this document disagree, the code is wrong — fix the code.*

---

## In one paragraph

`/tours` reads like a field atlas that happens to book. It opens on the
**Marquee**, the premium slots at the top: paid guide slots, ads booked on
the Marquee, tours Cabana features, the next departures, the newest 360°
world and Cabana's own promotions, one at a time with the queue beside it.
Under it a **search bar** that knows the places, the kinds of trip and the
tours; a **departure board** of everything leaving in the next thirty days;
the **ways to travel**; the **360° and VR room**; an **atlas** of the places
tours run to, where anyone can ask to hear first when a place opens; the
guides; the catalogue; and the offer to guides (a Marquee slot, or 360°
filming). Every section is edited in the console, **the page never invents
a tour**, and a section with nothing real in it stays hidden. Guides run
everything from their studio: bookings, Marquee slots, changes to live
tours, pausing, demand and filming requests.

## The pages

| Page | What it is | Script |
|---|---|---|
| `/tours` | Marquee (or the cover), search bar, departure board, ways to travel, collections, 360° room, atlas, guides, catalogue preview, offer to guides, invite | `cabana-tours-home.js`, `cabana-tours-spotlight.js` |
| `/tours-catalogue` | Every tour, filters in the URL (`q`, `cat`, `place`, `people`, `when`, `date`, `len`, `price`, `op`, `saved`, `vr`, `group`, `sort`); a place or kind with few tours offers "tell me when" | `cabana-tours-catalogue.js` |
| `/tour-guides` | The guides and operators, searchable, with their tours and a Message button | `cabana-tours-guides.js` |
| `/tours-studio` | For guides: Marquee, Bookings, My tours, Demand, 360° (noindex, no ads) | `cabana-tours-studio.js` |
| `/list-your-tour` | Onboarding: guide or company, then the tour and its schedule | `cabana-list-tour.js` |
| Console → Tours | Every desk below | `cabana-tours-admin.js`, `cabana-tours-page-admin.js` |

Every page shares **`cabana-tours.js`** (the kit: data, places, saves,
follows, cards, the tour sheet, countdowns, header, search) and
**`cabana-tours-kit.css`**, with **`cabana-tours-world.css`** on top.

## The look

Warm paper and deep ink, with the colours of the places themselves: ember
`#F2541B` (the action colour), sun `#FFB21E` (paid slots), acacia `#13925F`,
lake `#0FA3B8`, jacaranda `#7457F2` (360°), flamingo `#F24E7A`; paper
`#FAF6EE`, ink `#16120D`; night `#0A0F1F` for the 360° room and the studio.
Colour is always solid, never a gradient poured into text. Type: **Cabana
Wide** (Archivo, set wide, `assets/fonts/archivo-wide-latin.woff2`) for
headlines and place names, **Hanken Grotesk** for everything you read and
tap, **Geist Mono** for clocks, dates and coordinates. `*stars*` in any title
set those words in the section's accent colour.

`body.ct-w` opts a page into the world (tours, catalogue, guides);
`body.ct-wn` is the studio at night. The Marquee classes (`.tw-mq-stage`) need
neither, so the studio and the console preview slots with the same CSS.
The tours pages draw their own brand: `data-brand="own"` on `<html>` and
`window.__APA_BRAND__ = 'cabana-tours'` before `pwa.js`; none loads the site
theme files. Photographs in `assets/tours/` are credited in
`assets/tours/CREDITS.md`.

## The Marquee

`cabana-tours-spotlight.js` · tables `tour_spotlights`, `tour_spotlight_settings` · feed `tour_spotlight_feed()`

**What plays, in order:**

1. **Sponsored** — slots guides and operators paid for. They always fit.
2. **Ads** — campaigns booked on the `tours.marquee` placement in Console →
   Advertising (up to four), marked *Ad*, opening in a new tab with
   `rel="sponsored"`, counted with `ad_track` (impression, viewable, click).
3. **Featured** — tours the console features for free.
4. **Automatic** — up to two tours leaving soonest (only tours with a photo)
   while fewer than three of the above run; and the newest 360° world unless
   a Cabana slot already opens one.
5. **Cabana's own** — made in the page editor: photo, film or YouTube, a
   badge (≤ 24 characters), the devices it shows on, and a button that goes
   somewhere on Cabana or opens a 360° world.

With nothing to play the top is the **cover** (the `hero` block). Console →
Tours → Marquee sets whether the Marquee runs at all, seconds per slot
(4–20), most slots at once (1–16), and whether ads, departures and the world
join; Cabana slots are capped by that number, paid ones never are.

**Behaviour:** each slot is dealt in over the last; the queue beside it shows
every slot with the playing one filling. It holds on hover, on focus and
while anything sits on top (the tour sheet, booking, messages, the 360°
player, a welcome offer), off screen and in a hidden tab. Save-Data gets
stills; **reduced motion** gets stills and waits for a tap. A slot counts as
viewed after 1.2 s on screen (held or not); views and taps go to
`tour_spotlight_track` once per session.

**Buying a slot (studio → Marquee):** pick the tour, the media, the words and
a colour, watching the real Marquee in a desktop or phone frame; pick a
package (prices from `tour_spotlight_settings.prices`, defaults day 1,500 ·
week 7,500 · fortnight 13,500 · month 24,000 KES) and a start date against the
availability calendar; pay in full by M-Pesa (`SPOT-` reference). The
console approves (the window moves forward by the time review took) or
rejects — **a rejected paid slot becomes Cabana credit that never expires**.
Statuses: `pending_payment → in_review → approved ⇄ paused → ended`, or
`rejected`, or `cancelled` (unpaid only).

## Places and "tell me when"

`tour_places` · `tours.place_id` · `tour_alerts`

A place has a name, country, region, a line, a photo and focal point, a map
position, an order, a featured flag and **matching words**. A tour is matched
to a place by the words in its destination, county, start point and title
(`tour_place_guess`, first match wins) unless the console pins it.
**Re-match tours** re-runs the matching after the words change.

The atlas (`assets/tours/atlas-east-africa.json`, Natural Earth) pins every
enabled place; places with tours stand out. Picking one names it, counts its
tours, shows the next departure and price, lists up to three tours and
offers **Tell me when** (`tour_alert_set`). Signed out, that asks for a
sign-in and finishes when they come back (`?follow=place:<id>`). The same
button follows a kind of trip from Ways to travel and the catalogue.
Publishing a tour tells everyone following its place or kind, once per
person per tour (`tour_alerts_notify`). Guides see the counts (`tour_demand`),
the console sees who (`admin_tour_demand`).

## The 360° room

Cabana Immersive (`cabana-immersive.js`, the engine and the worlds are
managed under Console → Immersive). On `/tours` the room shows the worlds and
**four ways to watch** — on this screen, phone in hand, in a VR viewer, in a
headset — each saying whether this device can, with a link to send it to
another device when it cannot. The room hides itself while no world is live.
Guides ask for their tour to be filmed from the studio
(`tour_immersive_request`); the console moves the request on (`new →
scheduled → filmed / declined / closed`) and marking it filmed with a world
links the world to the tour, which puts **Step inside** on its page.

## Running a tour (studio → My tours)

| A tour that is | The guide can |
|---|---|
| Live | View it, put it in the Marquee, **propose changes** (they wait for the console: `tour_change_propose` → `admin_tour_change_decide`), pause it |
| Paused by the guide | Edit it directly, and **resume**: unchanged, it goes straight back live; changed, it goes to review |
| Paused by Cabana | Ask why; only the console resumes it |
| Being checked / needs changes | Ask about it |

`tour_operator_pause` keeps a fingerprint of the tour when a guide pauses it.
The fingerprint belongs to the database (`tour_pause_sig_guard`): only the
pause function or an admin can write it, so a guide cannot resume past
review. Anything the console does to a tour's status clears it.

## The page editor

`cabana-tours-page-admin.js` · table `tour_page_blocks` · launch copy `cabana-tours-page.js`

Each row is one section of `/tours`: `kind`, `position`, `enabled` and
`content`, merged over the launch copy field by field. Previews (the cover
and every Cabana slot) are drawn by the Marquee itself with the page's
stylesheet, desktop or phone.

| Block | What the console sets | Shows when |
|---|---|---|
| `hero` | The cover (photo, phone photo, film, focal point, shade, words); the search hint and quick links; whether departures join the Marquee | Nothing is in the Marquee (cover); always (search) |
| `departures` | Words; the clock | A tour has seats in the next 30 days |
| `kinds` | Words; per category a name, line, photo, order, visibility; show empty kinds | Always with `show_empty`, else a kind has a tour |
| `collection-*` | Words, hand-picked tours, layout, banner | A picked tour is published |
| `immersive` | Words | Switched on and a world is live |
| `places` | Words, button, map on or off | Switched on and a place is enabled |
| `guides` | Words; guides to show first | A guide has a published tour |
| `catalogue` | Words, how many, the "nothing yet" message | Always |
| `pitch` | Words, points, button; the 360° filming line | Switched on (slot prices hide while sales are paused) |
| `invite` | Words, points, button | Switched on |

## The console (Tours)

| Tab | What it does |
|---|---|
| Pending, Published, Paused, Draft, Rejected, All | Moderate and edit tours; pin a tour to a place; pause shows who paused it |
| Changes | Guides' proposed changes, current beside proposed; apply or decline with a note (they are told) |
| Marquee | Paid slots to review, everything running, feature a tour, how the Marquee runs, prices and limits |
| Places | The places, their photos, words, map position, order; re-match tours |
| Demand | Who is waiting for which place or kind, and how many this week |
| 360° filming | Requests from guides: schedule, mark filmed with a world, decline, close |
| Page | The page editor above |

Changes and filming requests join the console inbox (`tour_changes`,
`tour_film`) and the Tours badge.

## The departure board

`tour_departures(p_days, p_tour, p_per_tour)` expands every published tour's
schedule into real dates with seats left. Schedules: `daily`, `weekly`
(`departure_days`), `fixed` (`next_departure` plus ISO dates), `on_request`
(never on the board). The board shows one row per tour (its next departure
with seats), soonest first, never a full one, never more than thirty days
out, with filters for this weekend, next seven days, back the same day,
overnight and under KES 5,000. Clocks tick only while on screen; a row opens
its tour on that date.

## Booking

`cabana-tour-book.js` → `tour_bookings`, reference `TOUR-<tour id>-<ms>`.
Signed out, the modal asks to sign in and brings the traveller back
(`/tours?book=<id>&date=&people=`). Signed in: departure chips (full ones
shown, disabled, never pre-selected) or a date picker; a people stepper
bounded by the group size and seats left; the deposit now and the balance to
the guide on the day; **Cabana fee KES 0**; a private offer from the guide is
applied automatically. Free tours reserve without payment.

## Messages

`chat.js`, the same messenger and server-side guard as stays (`CHAT.md`):
`cabana_chat_start_tour`, `cabana_chat_set_tour_trip`,
`cabana_chat_send_tour_offer`, `cabana_chat_tour_offer_respond`,
`cabana_chat_for_tour_booking`. Saves sync with `tour_saves_sync` once signed
in.

## Privacy

Operator contact details are not readable from the browser: an operator
reads their own row through `tour_operator_me()`, the console through
`admin_tour_operators()`, and a traveller gets the guide's number only on a
paid booking. Demand shown to guides is counts only.

## Payments

| Reference | Table | Recognised in |
|---|---|---|
| `TOUR-…` | `tour_bookings` | `api/stk-push.js`, `payhero-callback`, `api/lib/_poll-payment.js` |
| `SPOT-…` | `tour_spotlights` | the same three; always charged in full |

## Ads

`/tours`, `/tours-catalogue` and `/tour-guides` are ad surfaces in
`apa-ad-registry.js`. On `/tours`: **Marquee** (`tours.marquee`, managed by the
page itself), in the results, after the tours (outside `<main>`, so the page
re-ordering its sections never carries it up) and the corner card. Paid
placements only; `/tours-studio` is on the never list.

## Migrations

| File | What it adds |
|---|---|
| `20260928100000_tours_v2_schedules_and_departures.sql` | weekly schedules, `departure_time`, `persona`, `tour_departures` |
| `20260928101000_tours_v2_saves.sql` | `tour_saves`, `tour_saves_sync`, `tour_popularity` |
| `20260928102000_tours_v2_operator_privacy_and_directory.sql` | `tour_operator_me`, `admin_tour_operators`, `tour_guides_directory`, `tour_operator_bookings` |
| `20260928103000_tours_v2_messenger.sql` | tour conversations, `tour_offers`, the tour chat RPCs |
| `20260928104000_tours_v2_spotlight.sql` | the paid slots: tables, feed, tracking, quote, calendar, create, console desk, payment trigger |
| `20260929090000_tours_page_content.sql` | `tour_page_blocks` |
| `20260930210000_tours_v3_world.sql` | the Marquee settings and badge/device/world slots, places and matching, alerts and demand, 360° filming, change requests, pause and resume, the v3 launch copy and Cabana's four promotions, the inbox queues |
| `20260930220000_tours_v3_pause_guard.sql` | the pause fingerprint belongs to the database |

## Tests

| | |
|---|---|
| Static contract (`npm test`) | `tests/tours-v2.test.mjs` |
| Browser: Marquee, ads, search, board, atlas and follows, 360° room, saves, booking, catalogue, guides, studio, phones | `./tests/ui/run-tours-v2.sh` |
| Database, end to end, rolled back | `tests/tours-v2.sql` |
