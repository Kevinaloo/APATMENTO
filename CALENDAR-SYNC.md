# Channel Calendar — two-way iCal sync

Cabana publishes one calendar per stay listing and reads as many as a host
wants to connect. Nights sold anywhere close everywhere, within minutes.

---

## What was broken before this

Two independent defects, each fatal on its own, and both invisible in a demo.

**1. The export required a login.** `/api/calendar-sync?action=export` called
`requireUser()` and answered `401` without a Supabase JWT. Airbnb, Booking.com
and Vrbo fetch an iCal URL anonymously, from a datacentre, with no cookie and
no header we control. Every feed a host ever pasted into Airbnb returned 401,
forever. Nothing was exported to anybody, ever.

**2. The import was never read.** Imported ranges landed in `calendar_blocks`,
and no availability path in the system selected from that table.
`cabana_dates_available()` consulted `listing_holds` alone. A host could
connect Airbnb, watch the blocks arrive on screen, and still take a Cabana
booking on top of an Airbnb guest. The import was a display artefact.

Three smaller ones, fixed along the way:

- `calendar_blocks.external_uid` carried a **global** unique constraint. A UID
  is only unique within the feed that issued it; two listings importing from
  the same platform collide.
- The parser was a regex over raw text. It could not read folded lines, timed
  events, `DURATION`, `RRULE`, or `STATUS:CANCELLED` — and it read the
  `DTSTART` inside `VTIMEZONE` as if it were an event.
- `partner-calendar.html` queried a `bookings` table that does not exist in
  this project, so every host saw an empty calendar and the error was swallowed.

---

## A live hole this closed

While wiring availability to `calendar_blocks`, three policies from the original
implementation turned up on that table, granted to `PUBLIC` — which includes
`anon`, whose key ships in the browser on every page:

```
"read calendar blocks"    SELECT  using (true)
"insert calendar blocks"  INSERT  with check (true)
"update calendar blocks"  UPDATE  using (true)
```

RLS policies are **OR'd**. A restrictive `with check (false)` sitting beside a
permissive `with check (true)` on the same command grants the row. So with a key
anyone can read out of the page source, it was possible to read every host's
calendar, insert an arbitrary block onto any listing, and rewrite any block.

Until now that was cosmetic: `calendar_blocks` was written by imports and read
by nothing. **This release makes it load-bearing** — `cabana_dates_available()`
consults it, which turns "write any row" into "make any listing on the
marketplace unbookable".

Dropped, and the table grants revoked from `anon` on every calendar table so a
future permissive policy cannot re-open it alone. Nothing legitimate depended on
them: writes go through the service role or a security-definer function, reads
through `cabana_calendar_overview`.

Two smaller ones fixed the same way:

- **iCalendar injection.** `escapeText` normalised `\r\n` but not a lone `\r`.
  Everything we publish derives from a listing title or a guest name, so a guest
  called `Ann\rSUMMARY:…` could inject arbitrary properties into the feed Airbnb
  fetches from us. All three line-break forms and the C0 control range are now
  escaped.
- **Grants vs. PUBLIC.** `grant execute … to authenticated` adds a role without
  removing one; Postgres grants EXECUTE to `PUBLIC` by default. Every host-only
  calendar function is now revoked from `PUBLIC` and granted explicitly.

---

## The model

Two layers answer one question.

| Layer | Table | Authority |
|---|---|---|
| Money-backed | `listing_holds` | A Postgres exclusion constraint refuses the second overlapping paid claim. Unchanged by this work. |
| Channel + host | `calendar_blocks` | Cannot refuse anything — a foreign platform's word is not money in our ledger — but **closes availability before a booking can be created**. |

`cabana_dates_available()` reads both, widened by the turnover buffer. Every
existing caller got channel awareness with no code change.

### Tables

| Table | Holds |
|---|---|
| `listing_calendar_settings` | Per-listing policy and the public export token |
| `calendar_feeds` | Subscribed external feeds, HTTP validators, health counters |
| `calendar_blocks` | Every busy range, scoped per feed, range-typed, soft-deleted |
| `calendar_sync_runs` | One row per attempt. "It didn't sync" is answerable |
| `calendar_conflicts` | Overlaps between a channel reservation and a Cabana booking |

---

## The public feed

```
https://cabana.africa/calendar/<48-hex-token>.ics
```

Anonymous by construction: the fetcher cannot authenticate, so the token **is**
the credential. This is what every platform in the industry does. The token is
per listing, revocable, rotatable, and discloses busy ranges only — no guest
names unless the host deliberately turns them on.

Every fetch is counted, so a host can see that Airbnb really is reading their
calendar and when it last did. That evidence is the difference between "I
pasted it and hope" and "Airbnb read this 14 minutes ago".

**Imported ranges are never re-published.** Sending a platform its own
reservations back is the classic channel-manager feedback loop: each poll
re-imports, re-exports and re-confirms until neither side can say who blocked
what. Our own bookings arriving back through a mirroring channel manager are
detected by their `@cabana.africa` UID namespace, stored as `kind='echo'`, and
never counted as a competing reservation.

---

## Reading other calendars

`api/lib/_ical.js` implements RFC 5545 rather than approximating it: line
unfolding, quoted parameters, `DATE` / `DATE-TIME` / `TZID` / UTC, `DURATION`,
`RRULE` expansion with `COUNT`/`UNTIL`/`INTERVAL`/`BYDAY`/`BYMONTHDAY`,
`EXDATE`, `RECURRENCE-ID` overrides, `STATUS:CANCELLED`, `TRANSP:TRANSPARENT`,
and component nesting so `VTIMEZONE` is never read as an event.

**A sync is a diff, not an append.** A feed is a complete statement of the
truth at a moment: a reservation that has *disappeared* was cancelled on the
other platform, and those nights must reopen. The whole run commits in one
transaction — a half-applied calendar is worse than a stale one.

**We compare meaning, not bytes.** Airbnb rewrites `DTSTAMP` on every request,
so a hash of the body always reports "changed". Fingerprinting the parsed
events means a quiet calendar costs a no-op, not a full rewrite.

### SSRF

A host pastes a URL and our server fetches it. That is an SSRF primitive handed
to anyone with a host account.

The previous defence was a six-domain allowlist. It blocked thirty legitimate
platforms while not actually preventing the attack. The control now sits where
it can be enforced:

- **We resolve the name inside the socket's own `lookup` callback** and refuse
  private or reserved addresses there. There is no window between the check and
  the connect, so DNS rebinding has nothing to rebind.
- **Every redirect hop is re-checked.** A public URL that 302s to
  `169.254.169.254` dies on the next hop.
- **Size, time and redirect count are capped** while streaming.
- **HTTPS only**; credentials in the URL are refused.

With that in place, any calendar on the public internet is safe to fetch —
which is what "works with every platform" actually requires.

---

## Platforms

35 in `api/lib/_calendar-platforms.js`, each with detection, quirks, polling
defaults and **step-by-step instructions for both directions**, surfaced in the
UI with the host's own feed URL already spliced in.

- **Booking sites** — Airbnb, Booking.com, Vrbo/HomeAway (+ Abritel,
  Fewo-direkt, Stayz, Bookabach), Expedia, Agoda, Tripadvisor/FlipKey,
  Trip.com, Hostelworld, Homes & Villas by Marriott, Plum Guide, Holidu
- **Africa** — NightsBridge, SafariNow, LekkeSlaap, Travelstart
- **Channel managers / PMS** — Guesty, Hostaway, Lodgify, OwnerRez, Smoobu,
  Beds24, Uplisting, Hospitable, Tokeet, Hostfully, Cloudbeds, eviivo,
  Rentals United, iGMS, Avantio
- **Personal** — Google Calendar, Apple/iCloud, Outlook/Microsoft 365
- **Anything else** — any RFC 5545 feed

The registry labels and tunes. It never decides whether a fetch is allowed:
unknown platforms sync fine.

---

## Scheduling

Vercel Hobby allows **two** cron jobs, firing **once a day**, and `vercel.json`
already spends both. A daily calendar sync is not a slow sync, it is a broken
one — up to 24 hours in which another platform's guest has a night we are still
selling.

So the scheduler is `pg_cron`, every 15 minutes, calling the endpoint through
`pg_net`. Each feed carries its own `sync_interval_minutes` and `next_sync_at`,
so the tick only wakes feeds that are due. A failing feed backs off
exponentially (1×, 2×, 4× its interval, capped at six hours) and stops entirely
after 12 consecutive failures.

### One manual step after deploying

The scheduler deliberately does nothing until it has a secret, so the endpoint
is never called unauthenticated. Using the same value as `CRON_SECRET` on Vercel:

```sql
insert into cabana_ops.cron_config (key, value)
values ('cron_secret', '<your CRON_SECRET>')
on conflict (key) do update set value = excluded.value, updated_at = now();
```

Check it is working:

```sql
select jobname, schedule, active from cron.job where jobname = 'cabana-calendar-sync';
select * from public.calendar_sync_runs order by started_at desc limit 20;
```

---

## API

| Route | Auth | Purpose |
|---|---|---|
| `GET /calendar/<token>.ics` | none — the token | The feed platforms fetch |
| `GET /api/ical?t=<token>` | none — the token | Same, query-string form |
| `GET /api/calendar-cron` | `Bearer CRON_SECRET` | Sync every due feed |
| `POST /api/calendar-sync` | host JWT | Everything below |

Actions: `overview`, `listings`, `guide`, `feed.test`, `feed.add`,
`feed.update`, `feed.remove`, `feed.sync`, `settings.update`, `token.rotate`,
`block.add`, `block.remove`, `conflict.resolve`.

Host actions execute **as that user** (anon key + the user's JWT) against
security-definer functions, so a forged `listingId` is refused by Postgres, not
by a check in the route. The service role is used only for the public feed, the
cron, and applying a sync.

All of it lives in one serverless function: the Hobby ceiling is twelve and we
are at twelve. `scripts/check-syntax.mjs` fails the build if a thirteenth
appears, so new surface goes behind a `vercel.json` rewrite.

---

## Above the market

Things the major platforms do not give hosts:

- **Fetch evidence** — who read your calendar and when. Everywhere else, a
  pasted URL is a black box.
- **Test before save** — the link is validated while the other tab is still
  open, with an error that names the actual mistake ("that returns a web page,
  not a calendar — copy the .ics export link, not the address bar").
- **Conflicts surfaced, never auto-resolved** — a double booking is two people
  arriving at one door. We detect it on the sync that causes it, notify the
  host, stripe the night red on the calendar, and refuse to guess which guest
  loses.
- **Turnover buffer applied in both directions** — cleaning days are held on
  every connected platform, not just ours.
- **Loop prevention** — echo detection stops the mutual-blocking spiral that
  two-channel hosts hit routinely.
- **Health per feed** — healthy / first sync / stale / failing / stopped, with
  the platform's own error text and a backoff that does not hammer them.
- **Co-owners** — a confirmed `listing_partners` co-owner can manage the
  calendar of a building they own half of.

---

## Files

| File | |
|---|---|
| `supabase/migrations/20260902090000_ical_calendar_sync.sql` | Schema, RPCs, RLS, scheduler |
| `api/lib/_ical.js` | RFC 5545 parser and serialiser |
| `api/lib/_calendar-platforms.js` | 35-platform registry and host instructions |
| `api/lib/_calendar-fetch.js` | SSRF-guarded conditional fetch |
| `api/lib/_calendar-sync.js` | Fetch → parse → diff → commit |
| `api/calendar-sync.js` | Public feed, host actions, cron |
| `partner-calendar.html` | Host UI |
| `tests/calendar-sync.test.mjs` | 47 tests |
