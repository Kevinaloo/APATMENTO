# The Ambassador Programme

A small, hand-picked field team who bring hosts, service providers and
travellers onto Cabana, and earn a share of what those people go on to do for
a full year.

This is not the agent network. `/api/agents.js` is deliberately self-serve,
because a host is the right judge of whether to trust an agent. An ambassador
speaks *for Cabana*, so Cabana picks them — one email at a time, typed in by
an admin.

---

## The rate card

Commission is a share of **Cabana's service fee**, not of the booking — and
that fee is a **fixed amount banded by booking value**, not a percentage:

| Booking | Cabana's fee |
|---|---|
| stay under KES 5,000 | **KES 300** |
| stay from KES 5,000 | **KES 800** |
| tours, events, everything else | **KES 0** |

So the rate card is a share of KES 300 or KES 800:

| | traveller | host / service provider |
|---|---|---|
| **ambassador** | **15%** | **10%** |
| ordinary user | 10% | 5% |

Both tiers earn for **365 days** from the day the referral lands. Ordinary
users were previously on 20% / 10%; halving them is what makes the ambassador
tier worth being picked for.

Worked example: a traveller an ambassador brought books a KES 10,000 stay.
Cabana's fee is KES 800. The ambassador earns **KES 120**. The same traveller
books a KES 4,000 stay: the fee is KES 300 and the ambassador earns KES 45.
Every booking that person makes, for a year.

**The fee does not scale with the booking, so neither does the commission.**
A KES 400,000 villa pays the same KES 120 as a KES 5,000 room. This was
previously written down everywhere as "the fee is 10% of booking value", which
was never true on the money path and made a large booking look seven times
more valuable to an ambassador than it is. It is corrected in the code, in the
SQL and in every screen; do not let it drift back.

Volume is what pays here, which is the whole point of the programme — an
ambassador is measured on how many people they bring, not on how expensive
those people's holidays are. That is also why commission is only one part of
what an ambassador earns; see **What an ambassador actually earns** below.

### Where the numbers live

The rate card, in four copies, because each is needed at a different moment:

| Where | What it does |
|---|---|
| `schema-ambassadors.sql` → `public.referral_rate()` | **the authority** |
| `api/rewards.js` → `RATE_CARD` | stamps the rate onto the referral |
| `api/ambassadors.js` → `RATE_CARD` | echoed to the dashboard for display |
| `ambassador-dashboard.html` | shown to a signed-in ambassador |

The fee ladder, in three:

| Where | What it does |
|---|---|
| `cabana_secure_apartment_booking()` in `supabase/migrations/20260818170000_…sql` | **the authority** — stamps `service_fee` on the booking |
| `api/lib/_fees.js` | the fallback and the basis used by the payout path |
| `apa-fees.js` | the browser mirror, so every screen explains one ladder |

`tests/rate-card.test.mjs` fails if any of them drift. **Change a rate in the
SQL first, then run that test and follow it.**

### What an ambassador actually earns

Commission is the part that runs automatically, so it is the part with a rate
card. It is not the whole package, and the dashboard says so:

- **Commission** — the rate card above, for 365 days per person brought.
- **Milestone incentives** — paid for hitting onboarding targets.
- **Allowances** — airtime, transport and data for field work.
- **Equipment and materials** — whatever the work needs.
- **A route to employment** — the field team is where we hire from, on a
  salary, and ambassadors are the first people considered.

Only the commission rate is mechanical. The rest is set case by case with the
programme lead, which is exactly why the dashboard describes them without
inventing numbers for them. **Never publish a figure for any of them that has
not been agreed.**

### What the public may see

The rate card is **not public**. `ambassadors.html` is a gateway anyone can
open — a competitor, a prospective host, an ordinary user on the 10%/5% card
— and what an ambassador earns is between Cabana and that ambassador.

So the public page states that the programme is paid, that commission runs for
365 days, and that there is more to it than commission. The numbers appear
only after `ambassador_gate()` has said yes. `tests/rate-card.test.mjs` asserts
both halves of that: the dashboard must show the numbers, the gateway must not.

---

## How access works

Three conditions, all checked in Postgres by `public.ambassador_gate()`:

1. The signed-in email is on `ambassador_allowlist` with `revoked_at IS NULL`.
2. `auth.users.email_confirmed_at` is set.
3. The ambassador is not suspended.

**Condition 2 is the load-bearing one.** Supabase will hold an unconfirmed
address on a fresh account, so without it, knowing an ambassador's email would
be the same as being one: sign up as them, never confirm, walk in.

The dashboard's own check is a courtesy that saves a redirect. It is not the
lock. Every route re-derives the caller from `auth.uid()` and re-runs the gate.

### Inviting someone

Open the admin console → **Revenue → Ambassadors**. Add the email; they are
sent an invitation.

They must then sign in with **that exact address** and confirm it.

That screen is also where you suspend, reinstate, revoke, re-invite, and
resolve fraud signals. Suspension and revocation are both reversible and
neither touches commission already earned.

### Revoking

Revocation is a timestamp, never a delete, and it never touches earnings
already accrued. You want to be able to answer "who had access on the day that
booking was attributed" a year later, and someone who did the work before
leaving is still owed for it.

---

## The anti-fraud model

The single most important property: **nothing pays for a signup. It pays when
the person you brought actually earns.** A fake host is worth exactly nothing,
so there is no reason to invent one, and the most common way these programmes
rot never starts.

On top of that:

| Vector | What stops it |
|---|---|
| Claiming hosts already on the platform | `ambassador_claim_lead` refuses a contact matching an existing account or listing |
| Poaching a teammate's prospect | One live claim per normalised contact, enforced by a partial unique index |
| Sitting on a phone book | Claims lapse after 45 days; 8/hour and 25/day velocity caps |
| Farming the existing user base with a ref link | Attribution refused for accounts older than 48 hours |
| Self-referral | DB check constraint plus an API check |
| Book-now-refund-later loops | Commission is held `COMMISSION_HOLD_DAYS` (default 14) before it is withdrawable |
| Retroactive repricing | The rate is stamped at referral creation and never recomputed |

Velocity breaches raise a weighted row in `ambassador_fraud_signals`, which
drives `ambassadors.risk_score` (a 45-day decayed sum). Crossing a threshold is
a prompt for a human, not an automatic ban. An automated system that can
destroy someone's earnings on a heuristic will eventually do it to your best
ambassador on a Friday night.

---

## Onboarding a host on their behalf

A host who has never used Cabana will not finish an eight-step form on a phone
in a matatu. The ambassador sitting next to them will.

**Build their listing** on any claimed or signed-up lead opens the ordinary
listing form — the same one every host sees — with the ownership step locked
to *on behalf of* and filled in from the claim. There is no separate
ambassador form. There used to be, and it meant every field added to a listing
had to be added twice; the second copy was always behind.

Two properties hold it together, and both are easy to lose in a refactor:

- **The listing is never the ambassador's.** `listing_declare_ownership()`
  marks it `on_behalf` and opens a `listing_transfers` row addressed to the
  lead's own contact in the same statement. When they sign in with that
  address or number and accept, `partner_id`, `host_id` and `owner_id` move
  to them atomically and the ambassador loses access.

- **It does not publish until they say yes.** The listing is created with
  `is_active = false`, `status = 'pending_owner'` and `activate_on_claim`, and
  `listing_transfer_accept()` switches it on. Putting somebody's property,
  address and phone number on a public website because a third party filled in
  a form is not a thing to get wrong once.

`created_by` and `created_by_role` record who built it, and survive the
handover, so an onboarding stays creditable after the listing stops being
theirs. Neither column is ever read for permissions — that is precisely the
distinction this model exists to draw.

**Listings you have built** on the dashboard shows what is still waiting to be
claimed, and against whose contact. An ambassador who fills in a form on a
Tuesday needs to know on Friday whether it landed; without that the work
vanishes at submit and the only way to chase it is to remember.

### The older draft table

`ambassador_listing_drafts` and the `draft-listing` API route predate this and
still exist, read-only, for drafts written before the handover model. Nothing
new should be written there: a draft that can never become a listing is a
promise to a host that we cannot keep.

---

## Deploying

### 1 · Database

```bash
psql "$DATABASE_URL" -f schema-ambassadors.sql
```

Idempotent and additive — safe to re-run. It creates six tables and widens
`referrals` / `referral_earnings` with a tier, a stamped rate and a hold
timestamp.

One behaviour change to be aware of: it **drops the `DEFAULT 0.20` on
`referral_earnings.commission_rate`**. That default was the retired top rate,
and any insert omitting the column was silently paying it. After this, an
omission fails loudly instead of expensively.

### 2 · Environment

Everything already used by `/api/rewards.js`, plus two optional tunables:

| Variable | Default | What it does |
|---|---|---|
| `COMMISSION_HOLD_DAYS` | `14` | Days before commission is withdrawable |
| `REFERRAL_ATTRIBUTION_HOURS` | `48` | How long after signup a ref code still attributes |

`RESEND_API_KEY` is what sends invitations. Without it, invites are created
silently and you have to tell people yourself.

### 3 · Files

Static, so a normal deploy picks them up:

```
admin.html                    roster console (Revenue → Ambassadors)
ambassadors.html              the gateway
ambassador-dashboard.html     the dashboard
ambassadors-page.js           gateway logic
ambassador-dashboard.js       dashboard logic
apa-ambassador.css            shared design system (light/dark/system)
apa-ambassador.js             shared runtime (API, theme, motion)
apa-referral-capture.js       referral attribution
api/ambassadors.js            the API
```

---

## Tests

```bash
./tests/run-ambassador-tests.sh     # 47 · SQL gate, claims, velocity, RLS
node --test tests/rate-card.test.mjs #  6 · the six numbers agree everywhere
./tests/ui/run-ambassador-ui.sh     # 55 · real Chromium, both themes, phone,
                                    #      plus the admin roster console
```

The SQL suite spins a throwaway Postgres, applies the migration twice to prove
idempotency, and tears it down. The UI suite installs Playwright into a scratch
directory rather than the repo, because this is a static site with no
`package.json` dependencies and adding one would change how it deploys.

---

## Things worth not undoing

- **The confirmed-email check in `ambassador_gate()`.** Remove it and the
  allowlist becomes decorative.
- **No `UPDATE` policy on `ambassadors`.** Grant one and a suspended
  ambassador can set their own status back to active.
- **No `INSERT` policy on `ambassador_leads`.** Writes go through
  `ambassador_claim_lead()`, which is where dedupe, velocity and the
  already-on-platform check live. A direct insert skips all three.
- **The stamped rate.** If payout ever looks the rate up again instead of
  reading `referrals.commission_rate`, a rate change silently reprices
  history.
- **`rpcAsUser` passing the user's JWT.** Using the service key there makes
  `auth.uid()` null and disarms every ownership check in the schema at once.
