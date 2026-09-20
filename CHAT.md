# Cabana Messenger v6

*How guests and hosts talk on Cabana, what keeps that conversation on
Cabana, and what each side can do from inside it. If the code and this
document disagree, the code is wrong — fix the code.*

---

## What changed, in one paragraph

The old messenger checked messages only in the browser, so anything posted
straight to the API went through untouched, and the browser's own patterns
missed the exact message a host sent a guest: `Use 07then 16then 206then 494`.
v6 moves every rule into Postgres, normalises a message back to the digits a
reader would reconstruct before deciding anything, looks across a sender's
recent messages for numbers spelled out one fragment at a time, and gives
both sides the tools that make leaving Cabana pointless: private offers,
"try these instead" suggestions, rehoming, and a direct line to the Cabana
team.

## The guard

| | |
|---|---|
| Readable spec (runs in the browser, warns before send) | `cabana-chat-guard.js` |
| Authoritative copy (runs on every insert) | `cabana_private.chat_guard` — `supabase/migrations/20260920120000_chat_v6_guard.sql` |
| Shared test vectors | `tests/chat-guard.vectors.json` |
| Browser test | `node --test tests/chat-guard.test.mjs` |
| Postgres test | `node scripts/chat-guard-sql.mjs` → run the printed query; any row is a disagreement |

**What it catches:** phone numbers in any shape (spaced, dotted, joined with
"then"/"and"/"na"/"kisha", written in English or Kiswahili number words,
`o7l6`-style letter swaps, full-width digits, zero-width characters, split
across up to six messages); emails (including `at … dot …`); outside links;
WhatsApp/Telegram/Instagram and other handles; tills, paybills and account
numbers; and "pay me directly", "avoid the fees", "cash on arrival".

**What it leaves alone:** dates, date ranges, times and prices — but only
when they stand on their own. A "date" glued to more digits is exactly how a
number would otherwise slip through, so it is not protected.

**What happens:** the browser warns before the message is sent. If it is
sent anyway (or posted directly), the database stores the original in
`content_raw` (never readable by members), delivers *"Message withheld"* to
both sides, records a `chat_violations` row, and shows the sender a private
explanation. At three in 30 days the conversation is flagged for the Trust
team and an `ops_alerts` row is raised; at five in 24 hours sending pauses.

**After payment:** once a booking between the two is paid, a phone number is
allowed (people need to meet at a door). Payment detours never are.

Seeded on 20 Sep 2026 against all production messages: it caught the three
leaked numbers and none of the fifteen ordinary messages. Those three are
now withheld (`20260920123000_chat_v6_withhold_leaked_history.sql`).

## What each side can do

**Guests** — ask with their dates attached, change dates, book (or book with
an offer) from the top of the chat, decline an offer, get help or report.

**Hosts** — reply, use saved replies, send a **special offer**, **suggest
other stays** when they can't host, **rehome** a paid guest, get help or
report. Hosts now have *Messages* in every Partner Hub page and a *Message*
button on every booking.

Both — archive, block, see read receipts and typing, and are notified with a
deep link to the exact conversation.

### Special offers (host → one guest)

`cabana_chat_send_offer`. A private nightly price for one guest, one set of
dates, valid 1 hour to 7 days. Must be below the listed price and not more
than 80% off (typo guard). The dates must be free. The note passes the guard.

The price is honoured by the **same** `cabana_private.stay_quote` that
checkout and the booking trigger already trust: when the person quoting is
that guest, for exactly those dates, the offer competes with public offers
and the lowest wins. Nobody else ever sees it. When the booking is paid the
offer is marked accepted and a "Booking confirmed" line appears in the chat.

### "I can't host you" — two paths, one rule

| Situation | What the host gets | Why |
|---|---|---|
| **No paid booking** | *Suggest other stays*: up to three live Cabana listings — their own or anyone's — as cards the guest can open or message | No money has moved, so there is nothing to protect and no commission to game. |
| **Paid booking** | *I can't host this booking* → `/api/match-guest` (`offer` sweep or `offer-direct`) | Only the rehoming engine carries the 24-hour law, the same-price promise and the full-refund fallback (see `REHOMING-AND-CREDITS.md`). `cabana_chat_suggest` refuses a paid pair on purpose. |

### Get help from Cabana

`/api/support` op `chat.escalate`. Seven reasons. *Ask Cabana to step in*,
payment and listing problems are shown to both people; scam, harassment,
off-platform requests and safety are shown only to the reporter (telling the
other person invites retaliation). Safety is urgent. Every case opens one
queued support thread linked to the conversation; the desk can open the full
transcript — withheld originals included — and **reply inside the chat as
Cabana Support** (`agent.chat_post`), which both people see and are notified
about.

## Other holes closed in the same change

| Hole | Fix |
|---|---|
| Anyone, even signed out, could insert a notification for any user with any link | Insert policies dropped; members may only mark their own as read |
| Members could set their own `verified`, `banned`, `suspended_until`, `host_status`, `trust_score` | `profile_guard` trigger (invoker) restores them for non-operators |
| A guest chose the conversation title a host saw | Title, type and host come from the listing row |
| No rate limits | 20 messages/minute, 500/day, 25 new conversations/day |
| Private lines leaked into previews and unread counts | `visible_to` respected by the summary and notification triggers |
| The desk's "Platform chats" tab was always empty (it selected two columns that never existed) | Query fixed; flagged chats sort first |
| The desk's booking context for a user was always empty (wrong column names) | Aliased to the real columns |
| Cabana Match started conversations with a client upsert the policies had already blocked | Uses `cabana_chat_start` |

## A trap worth remembering

A `SECURITY DEFINER` trigger sees `current_user` as the function's owner, so
it cannot tell a member's insert from one of our own functions. The first
version of the guard branched on `current_user` inside a definer trigger and
therefore never ran — caught by `tests/chat-v6.sql` before release. Trigger
**gates** are `SECURITY INVOKER`; the privileged work happens in a definer
worker (`chat_guard_row`) that re-checks `auth.uid()`.

## Tests

- `node --test tests/*.test.mjs` — includes `chat-guard`, `chat-v6` and the
  rewritten messenger tests in `member-experience`.
- `tests/chat-v6.sql` — end to end in Postgres with real identities, inside a
  transaction that always rolls back (it ends by raising `ALL_PASSED`).
