# Stays audit: listing, search, booking, hosting

Date: 20 September 2026
Scope: everything a Stay touches, from the host's listing form to search and
the listing page, then booking, payment, check-in, reviews, and the host
dashboards. I read the code and checked it against the live Supabase schema,
policies and triggers. Each fix below was tested with role-simulated SQL in
rolled-back transactions, or in a real browser against real listing rows.

## New: Cabana 3D Tour (paid upgrade)

- **Where hosts see it:** the listing form offers it on the Photos step, as its
  own card, for stays only. Hosts can also request it for an existing stay
  from the listings board ("Add 3D Tour").
- **What the offer says:** it is labelled *Premium · Paid*. It lists four
  benefits: a featured place at the top of Stays, the 3D TOUR badge, a
  walkthrough inside the listing, and guests who book with more confidence.
  It also says clearly that nothing is charged now and that the listing
  publishes normally either way.
- **What ticking the box does:**
  1. It saves a row in `tour3d_requests` under the host's own RLS. That row
     is the lead, so an email failure can't lose one.
  2. It calls `POST /api/email {action:'tour3d-request'}`. The server
     re-reads the request, checks that it belongs to the caller, then emails:
     - the Cabana team at `TOUR3D_TEAM_EMAIL` (default `apatmento@gmail.com`),
       with name, phone, email, preferred contact method, best time, notes and
       the property details;
     - the host, with a confirmation of the request.
- **Making a tour live:** set `listings.tour_3d_status = 'live'` and
  `tour_3d_url` (`/tours/<slug>/index.html`, or a Matterport, Kuula or
  CloudPano URL). The listing is then featured automatically and gets the
  badge and the "Explore in 3D" section. No code change is needed. Only an
  operator or the service role can set these fields.
- **Lead statuses:** `tour3d_requests.status` runs `new → contacted →
  scheduled → completed` (or `declined` / `cancelled`). Moving it keeps
  the listing's status in step.
- The Jets Nest and Shikaz Homes are now `live` and featured.

## Fixed

### Critical

| Issue | Effect | Fix |
|---|---|---|
| Hosts could write `featured`, `internal_score`, `avg_rating`, `review_count` on their own listing | Any host could rank first with a fake 4.9★ (120) and an "In demand" tag, which also made the paid featured placement worthless | `listings_protect_system_fields` trigger. A host also can't re-activate a listing Cabana rejected or removed |
| Stored XSS on the listing page | The title, location and description were written into the page as raw HTML, so a host could run script in every guest's browser | All host text is escaped. The "Show more" button no longer breaks on apostrophes |
| Double bookings | `listing_holds` and `cabana_settle_booking()` existed but were never called, and no booking insert checked availability | New bookings on held or iCal-blocked nights are refused. Crossing the deposit claims the hold, and the loser of a race gets credit, as designed |
| Check-in code mismatch | The guest was shown a code made in the browser, but the database stores its own. At the door the codes never matched, so check-in failed and the host's payout never released | The confirmation screen shows the code the database issued |
| Hosts couldn't see their bookings | The host pages queried a `bookings` table that doesn't exist, and RLS hid `apartment_bookings` from hosts. Hosts saw "No bookings", KES 0 earned, and never their HOST code | New `host_stay_bookings()` RPC with safe columns (never the guest's code). The bookings page now has "Confirm check-in"; earnings use real payouts |

### High

- **Guest booking edits.** Guests could edit `refund_due`, `cancelled_at`,
  `num_guests`, `host_penalty` and other fields on their own booking, and
  could delete paid bookings. These fields are now locked, and only unpaid
  attempts can be deleted.
- **Fake private reviews.** Anyone could post a "private review" about
  anyone, for any booking, and make it visible immediately. Reviews now need a
  started stay: one per side, revealed together or 14 days after checkout
  (a nightly job handles the second case). Revealed guest ratings now update
  the listing's rating, which previously never moved.
- **Legacy `reviews` table.** Any account could post a rating to it, and hosts
  could rewrite a guest's stars. Posting now needs a stay, and hosts can only
  write a reply.
- **Host reviews page.** It queried columns that don't exist, so it always
  showed "No reviews". It now reads real revealed reviews.
- **Moderation didn't hide listings.** Rejected, paused or removed listings
  stayed visible because only `status` changed, not `is_active`. "Approve"
  set `status = 'live'`, which search showed but `stay_quote` refused, so the
  listing appeared but couldn't be booked. Admin actions now keep both fields
  consistent, and search only shows `active` stays.
- **Stays could drop off search.** The query took any 60 active rows before
  filtering to stays, so as other services grew, real stays disappeared. It
  now filters to stays and ranks in the query.
- **No host email for new bookings.** The `host-booking` email was never sent,
  and the push notification pointed to the empty bookings page. Hosts now get
  an email and a push when a booking reaches its deposit.

### Medium

- **"Good to know" was hard-coded.** Every stay showed 2 PM / 11 AM / no
  smoking. It now shows the host's actual check-in and checkout times, pets,
  smoking, children, house rules and space arrangement.
- **Fake payout form.** "Request payout" said *submitted* and sent nothing.
  It now routes the request to the partner desk.
- **Unescaped text on the host listings board.**
- **Filter injection.** The direct-share search on the host bookings page
  passed raw text into a PostgREST filter.
- **Unencoded reference.** The booking reference in check-in verification is
  now URL-encoded.
- **Empty cards in the listing form.** The "one card at a time" layer showed
  empty cards for sections a service doesn't use. It now skips them.

## Still open (recommended next)

1. **PayPal capture never writes booking state.** A guest who pays by PayPal
   isn't recorded as paid. The payment needs to go into `booking_payments`,
   and the booking then needs settling.
2. **No automated payout rail.** Payouts are released at check-in on paper, but
   no B2C transfer exists yet.
3. **Admin screen for 3D leads.** `tour3d_requests` can be managed in Supabase
   today. A small admin panel for it would help.
4. **Guests can read the host's code.** A guest can read `host_code` from
   their own booking row, so they could confirm check-in alone. That only
   releases the host's money, but it weakens the two-code handshake.
