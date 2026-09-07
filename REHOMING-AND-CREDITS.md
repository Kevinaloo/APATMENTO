# Rehoming, the rescue ride, and the 200 credits

*The three policies that used to live in five files and one person's memory.
This is the whole of each one. If the code and this document disagree, the
code is wrong — fix the code.*

---

## Part 1 · Rehoming — one system, two doors

A guest has paid for a bed on a given night, and something has gone wrong with
that bed. Rehoming is how they end up in another one without losing money,
losing the night, or having to argue for either.

There is **one** matching engine. It can be started from two places.

### Door 1 — the host says they cannot host

**Where:** the host's bookings page → *Match guest*, or *Share a specific
listing instead*.
**Code:** `POST /api/match-guest { action: 'offer' }` (the sweep)
or `{ action: 'offer-direct', listing_id }` (a chosen listing)

1. We check the clock **on our server**, from the listing's own check-in time,
   in Nairobi wall-clock.
2. Either we sweep the inventory and rank the results, **or** the host already
   knows where the guest should go — their own other property, a friend's,
   anyone's on the platform — and shares it directly.
3. The guest gets a shortlist (one listing, for a direct share) that holds for
   **6 hours**, and a refund button of exactly equal weight.
4. Every host on that shortlist is told a matched guest is looking at their
   place, so the room is not given away while the guest reads — unless the
   host shared their *own* other property, in which case they already know.

**The one law: a host inside 24 hours of check-in may not use either door.**
At that point it is not a rescheduling, it is a stranding. They cancel, the
guest is refunded in full, and the host takes a yellow card.

| What happens | Who pays |
|---|---|
| Guest picks one of the alternatives | Same dates, **same price to the guest**. A price rise is ours; a fall comes back to them. |
| The original host's reward | **10% of our service fee** — not of the booking. On a KES 800 fee that is KES 80. **Held, not paid**, until the guest has paid the new stay in full *and actually checked into it* — see "Commission is held to check-in" below. |
| Host shares their **own** other property | **No commission at all.** A finder's fee for moving a guest between two rooms you already own is the exact "commission by shuffling your own inventory" this system exists to prevent, so direct-sharing your own listing is a real convenience with no money attached. Sharing someone else's — a friend's, anyone's — earns the same 10% as a sweep match. |
| Guest declines | **Full refund.** They did not create this. |
| Guest never answers, offer lapses | Treated exactly as a decline: **full refund**, automatically, without them having to ask. |

Why pay the host anything at all? Because a host who can see the problem
coming and tells us early is worth more than a refund and a lost guest — and
10% of a fixed fee is cheap next to that. It is payment for solving a problem,
which is why it is **not** paid when they did not solve it (see door 2), and
**not** paid for solving it with their own spare room (see the table above).

#### Commission is held to check-in, not paid on acceptance

This used to debit the platform float the instant the guest accepted — a
commission on a stay that had not happened yet. The guest could still be
turned away at the *new* place too, or simply never show up.

The commission is now written as `pending_checkin` in the same ledger the
ordinary ambassador programme uses (`referral_earnings`, with
`referral_type = 'rehome'`), and only becomes real — counted, withdrawable
after the usual hold — the moment the **replacement booking itself** reaches
`checked_in` (`api/lib/_verify-checkin.js`). If that booking is instead
cancelled before check-in, the pending row is voided and the host is paid
nothing for a stay nobody had.

### Door 2 — the guest asks to be moved

**Where:** the guest's bookings page → **Find me another home**.
**Code:** `POST /api/match-guest { action: 'guest-request' }`

This door exists because door 1 depends on a host pressing a button, and **the
hosts who strand people are exactly the hosts who never press it.**

1. The guest picks a reason and can add a note.
2. The server sweeps every active listing for their dates, starting at **±10%**
   of what they paid a night and widening (±20%, ±35%, ±60%) only if the tight
   band comes back empty. It never returns "nothing" while something comparable
   exists.
3. Every host on the shortlist gets the broadcast.
4. The guest chooses through the ordinary flow, or closes the list.

#### Who decides whose fault it is

**Not the guest.** The reason they type is recorded and read by a person; it
never sets the terms. A text box that changes a refund is a text box that will
be filled in to change a refund.

Fault is read from the record, in this order:

| Signal | Fault |
|---|---|
| The host already opened a Match offer on this booking (accepted, declined, expired, or blocked at the 24h gate) | **host** |
| A check-in issue on this booking was adjudicated against the host | **host** |
| The booking carries a host-side cancellation | **host** |
| The host is banned, suspended, or their host status is not active | **host** |
| The listing has been deleted or is no longer active | **platform** |
| None of the above | **guest_choice** |

#### Terms, which follow fault and nothing else

**Fault = host or platform** — *we failed them.*
- Same dates, **same price**. A rise is ours to absorb; a fall comes back.
- No fee, no penalty, **no limit** on how many times we will move someone we failed.
- Works at any hour, including inside 24 hours.
- The original host earns **nothing** — they did not open this door.

**Fault = guest_choice** — *nothing went wrong, they want to move.*
- We only show homes **at or below what they already paid**, and refund the
  difference. Enforced twice: the sweep filters for it, and the money path
  refuses it again.
- **Two requests per booking.**
- **Closed inside 24 hours of check-in.** At that point a move is not a change
  of plan, it is an arrival problem — that is the *There's an issue* door, and
  it acts immediately.

Why cap it downwards? Because an unbounded "move me" button on a paid booking
is a way to shop the entire inventory from inside a booking, and one that can
move you *upwards* is a way to buy a cheap night and trade up for free. A guest
who genuinely wants somewhere dearer cancels under the ordinary policy and books
it — the same deal, honestly named.

#### Declining means two different things

- Through **door 1**: the stay is over either way → **full refund**.
- Through **door 2**: they looked and will stay put → **the booking is
  untouched**, the shortlist closes, and the hosts we alerted are told the
  dates are free again.

The API says which in `booking_unchanged`. The UI must never guess.

### Never, under either door

- **Never back to the same host — through the automatic sweep or door 2.**
  Whatever went wrong is a fact about the host, not only the unit, and it
  would let them earn the rehoming fee by shuffling their own inventory.
  Enforced in the SQL sweep, in the fallback ranking, and again at the moment
  of acceptance. **The one deliberate exception is a direct share**: a host
  may point at their own other property on purpose, and it is allowed —
  it simply earns no commission (see the table above), which closes the same
  loophole through money instead of through a hard block.
- **Never into a suspended or banned host's listing.**
- **Never into a room already booked for those dates.** Availability is
  re-checked at the instant of acceptance, not just when the list was built —
  six hours is long enough for someone else to take the bed.
- **Never without carrying the money across.** The replacement booking
  inherits `amount_paid`, `fully_paid_at` and the guest's check-in code. *(This
  was broken: the replacement was created without `amount_paid`, so a guest who
  had paid in full was moved and then found their check-in code locked behind
  "unlocks the moment this booking is paid in full" — at a door, in another
  neighbourhood, at night.)*
- **Never loses a referral relationship to a move.** If this guest was
  referred by someone, the replacement booking carries `referral_root_ref`
  forward — the payment reference of the *first* booking in the chain, which
  is what the referral commission is actually keyed to. A guest can be
  rehomed any number of times; the referrer is still paid once the guest
  finally checks in somewhere.

### The guest can ask for a refund instead of being moved

A host-fault issue used to auto-redirect the guest with no way to say
*"no — just refund me, I'll find my own way."* A guest whose listing does not
exist, or is unsafe, may not want another Cabana booking pushed at them at
all.

When a guest files a check-in issue (*"There's an issue"*, not the rehoming
button — this is the adjudicated, at-the-door path in `_checkin-issue.js`),
they can check **"I'd rather have a refund than be moved."** This is stated
**before** anyone knows whose fault it is, and it changes **nothing** about
fault or about what a guest who turns out to be at fault owes. It only
removes the automatic refuge search from the one branch where the guest would
otherwise be handed a replacement booking:

| | Rehoming happens | Refund only, no rehoming |
|---|---|---|
| Host at fault, guest did not ask for a refund | ✅ auto-redirected, ride offered if eligible | |
| Host at fault, guest checked **"I'd rather have a refund"** | | ✅ full refund, host still carded, no replacement booking created |
| Guest at fault, or pre-24h clean cancellation | *(unaffected — refund rules unchanged)* | |

Either way the host is still adjudicated and still carded if at fault, and any
pending referral commission on that chain is voided — the stay never
happened, however it ended.

---

## Part 2 · The rescue ride (the taxi)

**Being moved is not conditional on anything.** A guest standing at a door that
will not open gets moved — deposit or no deposit, first time or fifth. That is
not negotiable and it is not what follows.

**The ride between the two doors is a separate promise, and a bounded one.**

> We pay for the taxi for guests who paid their stay **in full**, **once each,
> for life.**

- **Paid in full**, because the ride is compensation on a completed
  transaction. A part-payment has not yet bought the thing being compensated
  for — and "report a problem, collect a fare" against a 25% deposit is a taxi
  service with a booking form attached.
- **Once per guest**, because the second one is not compensation, it is a
  pattern — and a pattern is a conversation with a human, not an automatic
  payment.

Both halves are enforced inside `dispatch_rescue_ride()` in Postgres, under a
unique index (`uq_rescue_ride_one_per_guest`). No caller — API, admin console,
or psql — can hand out a second one by accident.

When the ride is refused, three things happen and none of them is silence:
1. The guest is **still moved**.
2. The refusal is written to `rescue_rides` with a reason, so the guest we
   could not carry still exists in the record.
3. An **ops alert** is raised so a person can choose to carry them anyway.

The guest is told the truth in the same message that moves them. Not *"your
ride is booked"* when it isn't.

**Fare:** KES 150 base + KES 60/km, paid from `platform_float`. A dry float
never strands anyone — the guest moves regardless and the shortfall is a
critical ops alert.

**We arrange and pay for it directly — always.** The ride is booked and
funded by the platform (`platform_float`, via `dispatch_rescue_ride()`); a
host is never told ride logistics and never asked to arrange or front one.
That was already true, and nothing about the changes here weakens it.

---

## Part 3 · Commission is held to check-in, everywhere on the platform

Two different commissions share one rule now: **a commission on a STAY is not
real until the guest actually checks in.**

- The rehoming host's 10% finder's fee (Part 1).
- The ordinary ambassador/referral commission on a guest someone referred.

Both used to become real — `status = 'confirmed'`, counted in "total earned,"
eligible for withdrawal after the usual hold — the instant the underlying
payment cleared. That is also the instant a stay can still fall apart: the
guest arrives, the property does not exist or is not what they booked, they
decline to be rehomed and take a refund instead. Under the old rule, whoever
was owed a commission on that stay had already been credited for it.

### The rule

A `referral_earnings` row for a **stay** is written as `status = 'pending_checkin'`
the moment the money that justifies it moves — a referred guest's booking
settles, or a rehoming host's offer is accepted. It is:

- **shown**, so a host or ambassador can see it coming (`pending_kes` in
  `/api/rewards` `stats`, a `pending` figure in the ambassador earnings
  ledger, `earned_pending_checkin` in the ambassador dashboard view);
- **not counted** in "total earned";
- **not withdrawable**, under any circumstance.

It becomes `confirmed` — real, counted, withdrawable after the usual 14-day
hold — the moment the specific booking it is keyed to reaches `checked_in`
(`api/lib/_verify-checkin.js`, `releaseOnCheckIn()`).

If that booking is instead **cancelled outright** — no replacement, the stay
is simply not happening — the pending row is `reversed` (`voidOnNoShow()`)
and will never be paid. If the booking is **rehomed** rather than cancelled,
nothing is voided: the referral relationship survives the move via
`referral_root_ref`, and the row keeps waiting for wherever the guest actually
ends up checking in.

Every other service type — tours, events, food, shopping, car hire,
roommates-as-a-standalone-listing — has no check-in step and keeps the old,
immediate rule: a settled booking for one of those either happened or it
would not have settled.

One shared module, `api/lib/_referral-lifecycle.js`, is the only place that
writes, releases, or voids one of these rows — both commissions go through it,
so the rule cannot drift between the two programmes.

---

## Part 4 · The 200 welcome credits

**Every new account opens with 200 credits. One credit is one shilling off the
total.**

### Where they are good

**Stays · Tours · Events · Roommates · Car hire.** Nowhere else.

This is an **allowlist**, and the direction matters more than the contents. It
used to be a blacklist (`['flights']`), which meant every service we had not
launched yet, and every typo, and every booking surface built next quarter, was
eligible by default. A promotion whose scope grows on its own is a promotion
nobody is controlling.

| Excluded | Why |
|---|---|
| Flights | Sold at cost. There is no margin to discount against. |
| Food | Third-party goods, at or near cost, often settled with the vendor. |
| Shopping | Same. |
| Rides | A driver's fare. Discounting it either shorts the driver or costs us the whole fare — neither is a promotion. |

The list lives in `CREDIT_ELIGIBLE` in `api/rewards.js` and is enforced at
redemption, on a normalised name, so *"car hire"*, *"apartment"* and *"safari"*
cannot walk past it on a spelling. Every page reads the list from the server
rather than hard-coding it.

### The congratulations

A full-screen moment: the number counting up, the five services named, and a
way straight into the site. It fires **once per account, ever** — for a Google
signup and an email signup alike, because the flag lives on the **account**,
not on the device.

- The decision is a single atomic `UPDATE` on `user_points.welcome_celebrated_at`
  in Postgres (`claim_welcome_celebration`). Two tabs racing produce one
  celebration and one no-op.
- A new phone, a cleared cache, a private window, a reinstall — **none of them
  bring it back.** *(The old reveal keyed off `localStorage`, so it re-fired on
  every new device a long-standing user signed in on. A gift you are
  congratulated for receiving four times stops reading as a gift.)*
- The moment is spent by **asking**, so the client only asks when it can
  actually draw: tab visible, nothing else over the screen, DOM ready. It waits
  up to 25 seconds for a busy screen and gives up without asking if it never
  clears.
- Existing accounts were stamped as already-celebrated by the migration, so
  shipping this did not fire a popup at every user we already have.

### Eligibility for the grant itself

`WELCOME_CREDIT_FROM` (default `2026-08-17`) bounds the offer by account age,
read from the auth record and never from anything the client sends. Without it,
shipping the grant would have handed 200 credits to every account that has ever
existed, the moment each one next opened the site.

---

## Part 5 · What was closed while doing this

These were live. Each one is now shut in the database as well as in the code,
and pinned by a test in `tests/welcome-rehome-rescue.test.mjs`.

| # | The hole | What it was worth |
|---|---|---|
| 1 | **A host could write their own rehome offer from the browser.** RLS allowed `insert` where `origin_host_id = auth.uid()`. `service_fee` on that row is the number the commission is computed from, and `candidates` is the list the platform absorbs a price gap to. Both were client-supplied. | Unbounded. Name a KES 1,000,000 fee, collect a cut of it. Or list an expensive property and have the platform absorb the difference. |
| 2 | **The 24-hour gate was enforced only in the browser.** RLS cannot call `match_allowed()`, so a direct insert skipped it. | The one law of the feature, optional. |
| 3 | **A guest could `update` their own `match_offers` row.** Reset an accepted offer back to `offered` and accept it again. | A second replacement booking and a second refund, repeatable. |
| 4 | **`geo_distance_m` arrived from the browser.** It is worth 0.55 of a point of the confidence score — enough on its own to turn *unclear* into *host at fault*, and so into a full refund, a free move and a yellow card against a real person. | Claim you are on the doorstep; card an innocent host and collect. |
| 5 | **`redeem-points` matched on `booking_ref` alone** and answered `ok, worth N` without deducting. Refs are client-generated. | Spend credits → get refunded → re-use the ref → the checkout takes the discount off again with nothing deducted. Repeatable, and it worked on other people's refs too. |
| 6 | **The rescue ride had no gates at all.** Any host-fault issue booked a paid taxi from the float. | A taxi service with a booking form attached. |
| 7 | **The rehomed booking lost `amount_paid`.** | A guest who had paid in full was moved and then locked out of their own check-in code. |
| 8 | **`notify(null, 'ops_alert', …)` was a silent no-op** — `notifications.user_id` is `NOT NULL` and the helper returns early on a null id. | Every "a guest may be stranded, look now" alert reached nobody. Now `ops_alerts`. |
| 9 | **A refund promised in a notification was written nowhere.** | "KES 4,000 is coming back to you" — and nothing was recorded that would ever send it. Now carried on the booking as `refund_due` plus an ops alert. |
| 10 | **Two `SECURITY DEFINER` functions were callable over REST** by `authenticated` and `anon`. | Small, but not theirs to read. Now service-role only. |
| 11 | **Every commission on a stay was paid the instant money cleared** — rehoming (30% then, 10% now) and the ordinary referral programme alike. A guest could pay, be refunded because the host was at fault, and the commission had already been booked as earned. | Real money credited on a stay that never happened. |
| 12 | **The ambassador dashboard's own view (`v_ambassador_me`) had the identical bug**, independently: `earned_available` treated a null `available_at` as already matured, which is exactly what a pending stay commission looks like. A pending row would have shown as earned *and* available on an ambassador's own screen the moment a stay was paid for. | Not a withdrawal risk (the actual withdraw endpoint always required `status = confirmed`) but a real "why does my dashboard lie to me" support ticket waiting to happen. |
| 13 | **A host could not point directly at a specific listing.** Only the automatic sweep existed, so a host who already knew where to send a stranded guest — their own other property, a friend's — had no faster path than waiting on a ranking algorithm. | Added as `action: 'offer-direct'`, with the same-host case earning no commission by design. |
| 14 | **A guest at the door of a fake or unsafe listing had no way to simply ask for their money back.** Host-fault issues always tried to auto-redirect them into another Cabana booking, whether they wanted that or not. | Added `prefer_refund`, stated before fault is even known, honoured only in the branch where it matters. |
| 15 | **The check-in-issue rescue path had its own, separate copy of the "replacement booking loses `amount_paid`" bug** — it builds its replacement with its own `insert()`, which never went through the fix already made in the rehoming path's `carryOver()`. A guest moved automatically after reporting a problem at the door would have been locked out of their own new check-in code. | Fixed with a shared `amountPaidOf()` helper; also now carries `referral_root_ref` forward, which this path never did either. |

---

## Where each thing lives

| | |
|---|---|
| Rehoming engine, both doors, both share modes | `api/lib/_match-guest.js` |
| Check-in adjudicator, the ride, `prefer_refund` | `api/lib/_checkin-issue.js` |
| Check-in itself; releases pending commission | `api/lib/_verify-checkin.js` |
| The shared commission lifecycle (pending / release / void) | `api/lib/_referral-lifecycle.js` |
| Credits, the grant, the celebration flag, the referral award | `api/rewards.js` |
| Ambassador dashboard and earnings ledger | `api/lib/_ambassadors.js` |
| The celebration and the credit cards | `cabana-credit.js` |
| Guest UI: the button, the sheet, the shortlist | `my-bookings.html` |
| Host UI: *Match guest*, *Share a specific listing instead* | `partner-bookings.html` |
| Client doorbells, the issue-report sheet's refund toggle | `apa-trust.js` |
| Schema, RLS, the sweep, the ride gates | `supabase/migrations/20260906140000_welcome_celebration_rehome_and_rescue_integrity.sql` |
| Commission hold, direct-share, `prefer_refund`, ambassador view fix | `supabase/migrations/20260907120000_hold_commission_to_checkin_and_direct_share.sql` |
| The tests that keep all of it shut | `tests/welcome-rehome-rescue.test.mjs` |
