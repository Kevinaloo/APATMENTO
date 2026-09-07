/* ═══════════════════════════════════════════════════════════════════════════
   WELCOME CREDIT · REHOMING · RESCUE RIDE
   ─────────────────────────────────────────────────────────────────────────
   Three promises, and the specific ways each one used to be breakable.

     1. The 200-credit congratulations shows ONCE PER ACCOUNT. Not once per
        device — the old reveal keyed off localStorage, so it re-fired on
        every new phone a long-standing user signed in on.

     2. Credits are good on five named services and nowhere else. The old
        rule was a blacklist (['flights']), which made every service we have
        not launched yet eligible by default.

     3. A rehome offer is written by the server. The old RLS let a host
        INSERT one from the browser carrying its own `service_fee` — the
        number the 30% commission is computed from — and its own
        `candidates`, the list the platform absorbs a price gap to.

   These are source-level tests on purpose. They need no database, no env
   vars and no network, so they run in CI and they fail the moment someone
   re-opens one of the holes rather than the moment a guest finds it.

     node --test tests/welcome-rehome-rescue.test.mjs
   ═══════════════════════════════════════════════════════════════════════════ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(join(ROOT, f), 'utf8');
/* Assertions about what the CODE does must not trip over what the
   comments SAY about it — several comments here quote the very calls
   they exist to warn against. */
const code = f => read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* The migration that carries all three, found by name so a later rename
   fails loudly here rather than silently skipping every SQL assertion. */
const MIGRATION = (() => {
  const dir = join(ROOT, 'supabase', 'migrations');
  const hit = readdirSync(dir).find(f => /welcome_celebration_rehome_and_rescue_integrity/.test(f));
  assert.ok(hit, 'the welcome/rehome/rescue migration must exist in supabase/migrations');
  return readFileSync(join(dir, hit), 'utf8');
})();

/* ═══ 1 · WHERE THE CREDITS ARE GOOD ══════════════════════════════════════ */

const ELIGIBLE = ['stays', 'roommates', 'tours', 'events', 'carhire'];
const INELIGIBLE = ['flights', 'food', 'shopping', 'rides'];

test('the credit rule is an allowlist, not a blacklist', () => {
  const src = read('api/rewards.js');

  assert.match(src, /const CREDIT_ELIGIBLE = \[[^\]]*\]/,
    'rewards.js must declare CREDIT_ELIGIBLE');
  assert.ok(!/CREDIT_EXCLUDED/.test(src),
    'the old CREDIT_EXCLUDED blacklist must be gone — a blacklist makes every unlaunched ' +
    'service eligible by default');

  const list = src.match(/const CREDIT_ELIGIBLE = \[([^\]]*)\]/)[1];
  for (const s of ELIGIBLE) {
    assert.match(list, new RegExp(`'${s}'`), `${s} must accept credits`);
  }
  for (const s of INELIGIBLE) {
    assert.ok(!new RegExp(`'${s}'`).test(list), `${s} must NOT accept credits`);
  }
});

test('redeem-points refuses an unknown or missing service outright', () => {
  const src = read('api/rewards.js');
  const fn = src.slice(src.indexOf('async function actionRedeemPoints'),
                       src.indexOf('/* refund-credit'));

  assert.match(fn, /normaliseService\(body\.service_type\)/,
    'the service name must be normalised before it is checked, or "car hire" walks past ' +
    'a check for "carhire"');
  assert.match(fn, /if \(!creditsAllowedOn\(service_type\)\)/,
    'the allowlist must be applied, and applied as a refusal by default');
});

test('aliases fold onto the canonical names before the check', () => {
  const src = read('api/rewards.js');
  const table = src.slice(src.indexOf('const SERVICE_ALIASES'),
                          src.indexOf('function normaliseService'));

  /* Every spelling a real caller has used, and the one it must become. */
  const mustFold = {
    apartment: 'stays', apartments: 'stays', stay: 'stays',
    room: 'roommates', rooms: 'roommates',
    safari: 'tours', safaris: 'tours',
    "'car hire'": 'carhire', vehicle: 'carhire',
    tickets: 'events',
  };
  for (const [from, to] of Object.entries(mustFold)) {
    assert.match(table, new RegExp(`${from}:\\s*'${to}'`),
      `"${from}" must normalise to "${to}"`);
  }

  /* And the ones that must survive normalisation as themselves, so they
     are still refused rather than accidentally folded onto an eligible
     name. */
  for (const s of INELIGIBLE) {
    assert.match(table, new RegExp(`${s}:\\s*'${s}'`),
      `"${s}" must normalise to itself and stay refused`);
  }
});

test('the copy everywhere names the same five services', () => {
  const credit = read('cabana-credit.js');
  assert.match(credit, /Valid on stays, tours, events, roommates and car hire\./,
    'the client copy must state the scope');
  assert.ok(!/Not valid on flights/.test(credit),
    'the old "not valid on flights" line implies everything else IS valid, which is no ' +
    'longer true — food, shopping and rides are out too');
});

test('a redeemed booking reference cannot be replayed for a free discount', () => {
  const src = read('api/rewards.js');
  const fn = src.slice(src.indexOf('async function actionRedeemPoints'),
                       src.indexOf('/* refund-credit'));

  assert.match(fn, /String\(prior\[0\]\.user_id\) !== String\(userId\)/,
    'a reference belonging to someone else must be refused, not answered with a value — ' +
    'booking_ref is generated in the browser, so any ref ever redeemed against used to ' +
    'answer "already, worth N" to anybody who asked');
  assert.match(fn, /booking_ref=eq\.\$\{encodeURIComponent\('REFUND-' \+ booking_ref\)\}&user_id=eq\.\$\{userId\}/,
    'a reference whose credits were handed back must not read as a completed deduction — ' +
    'otherwise: spend, get refunded, re-use the ref, and the checkout takes the discount ' +
    'off again with nothing deducted');

  /* And the retry that this whole branch exists for must still work. */
  assert.match(fn, /return \{ ok: true, already: true, value_kes: already/,
    'a genuine double-tap on Pay must still be idempotent rather than charged twice');
});

test('a credit reversal is looked up as the caller\'s own', () => {
  const src = read('api/rewards.js');
  const fn = src.slice(src.indexOf('async function actionRefundCredit'));
  assert.match(fn, /booking_ref=eq\.\$\{encodeURIComponent\(reversalRef\)\}&user_id=eq\.\$\{userId\}/,
    'the reversal check must be scoped to the user, like the deduction it reverses');
});

/* ═══ 2 · THE CONGRATULATIONS, ONCE PER ACCOUNT ═══════════════════════════ */

test('the once-ever decision is a single atomic UPDATE in Postgres', () => {
  assert.match(MIGRATION, /add column if not exists welcome_celebrated_at timestamptz/,
    'the flag must live on user_points, not in a browser');

  const fn = MIGRATION.slice(MIGRATION.indexOf('function public.claim_welcome_celebration'),
                             MIGRATION.indexOf('revoke all on function public.claim_welcome_celebration'));

  assert.match(fn, /update public\.user_points/, 'the claim must be an UPDATE…');
  assert.match(fn, /and welcome_celebrated_at is null/,
    '…guarded on the column being unset, so two tabs racing produce one celebration');
  assert.match(fn, /returning user_id into hit/,
    'the UPDATE must report whether it actually matched a row — a separate SELECT then ' +
    'UPDATE has a window in which both callers win');
  assert.ok(!/select .* from public\.user_points[\s\S]*update public\.user_points/i.test(fn),
    'read-then-write would reintroduce the race the atomic update exists to close');
});

test('existing accounts are stamped so shipping this does not spam everyone', () => {
  assert.match(MIGRATION,
    /update public\.user_points\s+set welcome_celebrated_at = coalesce\(welcome_celebrated_at, updated_at, now\(\)\)/,
    'every account that predates the feature must be backfilled as already celebrated');
});

test('the celebration RPC is service-role only', () => {
  assert.match(MIGRATION,
    /revoke all on function public\.claim_welcome_celebration\(uuid\) from public, anon, authenticated/,
    'a browser that can call this directly can spend, or re-spend, its own moment');
  assert.match(MIGRATION,
    /grant execute on function public\.claim_welcome_celebration\(uuid\) to service_role/);
});

test('the server spends the moment only when the client asks to draw it', () => {
  const src = read('api/rewards.js');
  const fn = src.slice(src.indexOf('async function actionClaimWelcome'),
                       src.indexOf('/* redeem-points'));

  assert.match(fn, /body\?\.celebrate === true/,
    'a background claim must not burn the one celebration');
  assert.match(fn, /claim_welcome_celebration/, 'the decision comes from the database');

  /* All three exits of claim-welcome must carry the flag, or whether you
     are congratulated depends on which branch your signup happened to
     take — granted, already-granted, or lost-the-insert-race. */
  const exits = fn.match(/celebrate: await celebrateIfDue\(\)/g) || [];
  assert.equal(exits.length, 3,
    'every return path from claim-welcome must answer the celebration question');
});

test('the client asks only when it can actually draw, and never trusts localStorage', () => {
  const src = read('cabana-credit.js');

  assert.match(src, /function celebDrawable\(\)/,
    'there must be a guard that checks the screen is free BEFORE asking');
  assert.match(src, /if \(!celebDrawable\(\)\)[\s\S]{0,400}?setTimeout\(attempt/,
    'a busy screen must be waited on, not asked through — asking is what spends the moment');

  const fn = src.slice(src.indexOf('function celebrateIfDue'), src.indexOf('async function init'));
  assert.match(fn, /if \(!r \|\| !r\.celebrate\)/,
    'the server, not the browser, decides whether to celebrate');
  assert.match(fn, /if \(r && \(r\.already \|\| r\.granted\)\)/,
    'the local hint must only be set once the server has confirmed the account holds ' +
    'credits, or a brand-new account whose grant is a beat behind caches away its own moment');
});

test('the claim no longer hides behind a page having a credit mount', () => {
  const src = read('cabana-credit.js');
  const from = src.indexOf('async function init()');
  const init = src.slice(from, src.indexOf('global.CabanaCredit =', from));

  const claimAt = init.indexOf('celebrateIfDue(token)');
  const bailAt  = init.indexOf("if (!mounts.length) return;");
  assert.ok(claimAt > -1 && bailAt > -1, 'both the claim and the mount bail must be present');
  assert.ok(claimAt < bailAt,
    'the welcome claim must run BEFORE the "no mount, nothing to draw" return — otherwise a ' +
    'Google signup that lands on a page without a credit card never claims at all');
});

test('both signup doors run through the same funnel', () => {
  const auth = read('auth.html');
  const fn = auth.slice(auth.indexOf('async function goDashboard(user)'),
                        auth.indexOf('async function goDashboard(user)') + 4000);

  assert.match(fn, /action: 'claim-welcome'/,
    'goDashboard is the one funnel BOTH email signup and Google OAuth return through');
  assert.match(fn, /localStorage\.removeItem\('cabana_welcome_celebrated'\)/,
    'clearing the hint asks the destination page to CHECK with the server');

  /* And the Google path must genuinely arrive here. */
  assert.match(auth, /await goDashboard\(session\.user\)/,
    'oauthReturn must hand off to goDashboard');
});

/* ═══ 3 · REHOMING ════════════════════════════════════════════════════════ */

test('no browser may write a match offer any more', () => {
  assert.match(MIGRATION, /drop policy if exists match_write\s+on public\.match_offers/,
    'the insert policy that let a host write their own offer must be dropped');
  assert.match(MIGRATION, /drop policy if exists match_update on public\.match_offers/,
    'the update policy let a guest reset an accepted offer back to "offered" and take a ' +
    'second replacement booking');

  assert.match(MIGRATION,
    /create policy match_ops_write on public\.match_offers for insert to authenticated\s+with check \(public\.is_operator\(\)\)/,
    'inserts are operators only; the service role bypasses RLS and does the real work');
  assert.match(MIGRATION,
    /create policy match_ops_update on public\.match_offers for update to authenticated\s+using \(public\.is_operator\(\)\)/);

  /* Reading your own offer is still fine and must stay fine. */
  assert.match(MIGRATION, /create policy match_read on public\.match_offers for select/);
});

test('the client no longer inserts offers, it rings a doorbell', () => {
  const src = read('apa-trust.js');
  assert.ok(!/from\('match_offers'\)\s*\.insert/.test(src),
    'apa-trust.js must not INSERT into match_offers — RLS refuses it, and the numbers on ' +
    'that row decide commission and what the platform absorbs');
  assert.match(src, /async offer\(bookingId, reason\) \{[\s\S]{0,300}?post\('\/api\/match-guest'/,
    'the host offer must go through the server');
  assert.match(src, /async request\(bookingId, reason\)/,
    'the guest must have their own door');
});

test('commission is computed from the booking, at offer time, by the server alone', () => {
  const src = read('api/lib/_match-guest.js');

  /* Both doors compute it once, when the offer is written — never a
     client-supplied number. */
  const offerBlock = src.slice(src.indexOf("action === 'offer' || action === 'offer-direct'"),
                               src.indexOf("if (action === 'guest-request')"));
  const feeFromBooking = (offerBlock.match(/const fee = num\(bk\.service_fee\);/g) || []).length;
  const commissionFromFee = (offerBlock.match(/fee \* COMMISSION_RATE/g) || []).length;
  assert.ok(feeFromBooking >= 2 && commissionFromFee >= 2,
    'both offer (sweep) and offer-direct must compute commission from the booking\'s own fee');

  /* At accept time it is read off the offer row, not recomputed — and
     that is safe only because match_offers can no longer be written by
     a browser at all (RLS: insert/update are operator-only). Reading
     bk.service_fee again here would be redundant, not wrong; reading
     it from the offer would be wrong only if the offer could still be
     forged, which the migration's RLS closes. */
  const accept = src.slice(src.indexOf("if (action === 'accept')"),
                           src.indexOf("if (action === 'decline')"));
  assert.match(accept, /num\(offer\.host_commission\)/,
    'accept must trust the offer\'s own commission — safe now that offers are server-only');
  assert.match(accept, /const listing = await one\('listings'/,
    'the chosen listing must be re-read from the database, not taken from the offer JSON');
});

test('a host earns nothing for sharing their own other listing', () => {
  const src = read('api/lib/_match-guest.js');
  const direct = src.slice(src.indexOf("if (action === 'offer-direct')"),
                           src.indexOf("/* ── 'offer': the automatic sweep"));
  assert.match(direct, /const sameHost = String\(target\.host_id\) === String\(bk\.host_id\)/);
  assert.match(direct, /const commission = sameHost \? 0 : Math\.round/,
    'sharing your own other property must earn no finder\'s fee — the exact "commission by ' +
    'shuffling your own inventory" the same-host exclusion exists to prevent');
});

test('commission is held until the replacement booking actually checks in', () => {
  const src = read('api/lib/_match-guest.js');
  const accept = src.slice(src.indexOf("if (action === 'accept')"),
                           src.indexOf("if (action === 'decline')"));

  assert.ok(!/insert\('platform_float', \{\s*direction: 'debit', amount: commission/.test(accept),
    'commission must not be debited from the float the instant the guest accepts — the stay ' +
    'has not happened yet');
  assert.match(accept, /commission_paid: false/,
    'match_offers must not claim the commission is paid at acceptance');
  assert.match(accept, /await pendingCommission\(/,
    'it must be recorded as pending, released only at check-in');
  assert.match(accept, /referralType: 'rehome'/);

  const verify = read('api/lib/_verify-checkin.js');
  assert.match(verify, /import \{ releaseOnCheckIn \} from '\.\/_referral-lifecycle\.js'/);
  assert.match(verify, /await releaseOnCheckIn\(/,
    'check-in must be the one event that turns a pending rehoming commission real');
});

test('a cancelled rehome voids its pending commission, a moved one does not', () => {
  const src = read('api/lib/_match-guest.js');

  const decline = src.slice(src.indexOf("if (action === 'decline')"));
  assert.match(decline, /await voidOnNoShow\(bk, 'guest_declined_match'\)/,
    'declining a host-initiated offer ends the stay for good — the referral chain must void');

  const sweeper = src.slice(src.indexOf('export async function expireStaleMatchOffers'));
  assert.match(sweeper, /await voidOnNoShow\(bk, 'match_offer_unanswered'\)/,
    'an unanswered host offer auto-refunds and must void the same way');

  const accept = src.slice(src.indexOf("if (action === 'accept')"),
                           src.indexOf("if (action === 'decline')"));
  assert.ok(!/voidOnNoShow/.test(accept),
    'accepting is a MOVE, not a no-show — the referral chain must survive it via referral_root_ref, ' +
    'never be voided here');
});

test('the referral chain survives a rehome via referral_root_ref', () => {
  const src = read('api/lib/_match-guest.js');
  assert.match(src, /import \{ pendingCommission, voidOnNoShow, referralRootRef \} from '\.\/_referral-lifecycle\.js'/);

  const carry = src.slice(src.indexOf('function carryOver'), src.indexOf('export default'));
  assert.match(carry, /referral_root_ref: referralRootRef\(bk\)/,
    'every replacement booking must carry the root reference forward, or a rehomed guest\'s ' +
    'referrer is paid nothing for a stay that did, in the end, happen');
});

test('a guest moving by choice can only go sideways or down', () => {
  const src = read('api/lib/_match-guest.js');

  assert.match(src, /capAtOriginalPrice: !blameless/,
    'the sweep must cap the price band for a guest-initiated move');
  const accept = src.slice(src.indexOf("if (action === 'accept')"),
                           src.indexOf("if (action === 'decline')"));
  assert.match(accept, /if \(!terms\.blameless && delta > 0\)[\s\S]{0,200}?costs_more_than_original/,
    'and the money path must lock it again — a filter in the search is not a rule');
});

test('a guest we failed pays exactly what they agreed', () => {
  const src = read('api/lib/_match-guest.js');
  const accept = src.slice(src.indexOf("if (action === 'accept')"),
                           src.indexOf("if (action === 'decline')"));

  assert.match(accept, /const absorbed\s+= terms\.absorbIncrease && delta > 0 \? delta : 0/,
    'a price rise on a blameless move is the platform\'s');
  assert.match(accept, /const stayTotal\s+= terms\.blameless \? oldStay : newStay/,
    'a blameless guest carries their original price to the new home');
});

test('the replacement booking carries the money already paid', () => {
  const src = read('api/lib/_match-guest.js');
  const carry = src.slice(src.indexOf('function carryOver'), src.indexOf('export default'));

  assert.match(carry, /amount_paid:\s+amountPaid\(bk\)/,
    'without this the rehomed guest reads as unpaid and their check-in code stays locked — ' +
    'at a door, in another neighbourhood, at night');
  assert.match(carry, /fully_paid_at:\s+bk\.fully_paid_at/);
  assert.match(carry, /guest_code:\s+bk\.guest_code/);
});

test('a guest is never rehomed to the same host', () => {
  assert.match(MIGRATION, /and l\.host_id is distinct from b\.host_id/,
    'the SQL sweep must exclude the origin host');
  const src = read('api/lib/_match-guest.js');
  assert.match(src, /l\.host_id !== booking\.host_id/,
    'and so must the fallback ranking');
  const accept = src.slice(src.indexOf("if (action === 'accept')"),
                           src.indexOf("if (action === 'decline')"));
  assert.match(accept, /same_host_not_allowed/,
    'and the accept path must refuse it even from an older offer row');
});

test('the degraded sweep enforces the same exclusions as the database one', () => {
  const src = read('api/lib/_match-guest.js');
  const fn = src.slice(src.indexOf('async function sweep('), src.indexOf('async function determineFault'));

  assert.match(fn, /const barred = new Set\(\)/,
    'the fallback ranking must check host standing too — the day the RPC is unavailable is ' +
    'exactly the day we would otherwise route stranded guests into suspended hosts\' listings');
  assert.match(fn, /p\.banned \|\| \(p\.host_status && p\.host_status !== 'active'\)/);
  assert.match(fn, /!barred\.has\(l\.host_id\)/);
  assert.match(fn, /!busy\.has\(String\(l\.id\)\)/, 'and availability');
  assert.match(fn, /l\.host_id !== booking\.host_id/, 'and the origin host');
  assert.match(fn, /distance_km: haversineKm/,
    'and it must carry distance, which is the field a guest decides on');
});

test('fault comes from the record, never from what the guest typed', () => {
  const src = read('api/lib/_match-guest.js');
  const fn = src.slice(src.indexOf('async function determineFault'),
                       src.indexOf('function termsFor'));

  assert.match(fn, /async function determineFault\(bk\)/,
    'determineFault must take only the booking — the guest\'s words are not an argument to it');
  const bare = fn.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/request_reason|req\.body|body\./.test(bare),
    'determineFault must never read the free text the guest typed; a text box that sets the ' +
    'refund policy is a text box that will be filled in accordingly');
  for (const signal of ['match_offers', 'checkin_issues', 'cancel_reason', 'profiles', 'listings']) {
    assert.ok(fn.includes(signal), `fault must consider ${signal}`);
  }
});

test('declining means two different things and the server says which', () => {
  const src = read('api/lib/_match-guest.js');
  const dec = src.slice(src.indexOf("if (action === 'decline')"));

  assert.match(dec, /if \(\(offer\.initiated_by \|\| 'host'\) === 'guest'\)[\s\S]{0,1800}?booking_unchanged: true/,
    'a guest who asked to look and did not like the list must keep their booking');
  assert.match(dec, /cancel_reason: 'guest_declined_match'/,
    'a host-initiated decline is still a full refund');

  const ui = read('my-bookings.html');
  assert.match(ui, /r\.booking_unchanged/,
    'the UI must not announce a refund on a booking that is still standing');
});

test('an unanswered guest shortlist does not cancel their stay', () => {
  const src = read('api/lib/_match-guest.js');
  const sweeper = src.slice(src.indexOf('export async function expireStaleMatchOffers'));

  assert.match(sweeper, /if \(\(offer\.initiated_by \|\| 'host'\) === 'guest'\)[\s\S]{0,400}?closed_guest_request/,
    'a lapsed guest shortlist closes quietly — nobody said they could not stay');
  assert.match(sweeper, /cancel_reason: 'match_offer_unanswered'/,
    'a lapsed HOST offer is still treated as a decline and refunded in full');
});

test('the sweep widens rather than returning nothing', () => {
  const src = read('api/lib/_match-guest.js');
  assert.match(src, /const BAND_LADDER = \[0\.10, 0\.20, 0\.35, 0\.60\]/,
    'start tight and loosen only when tight comes back empty');
  assert.match(src, /find_rehome_candidates/, 'the banded sweep must be used');
  assert.match(src, /find_match_candidates/, 'with the original as a fallback');
});

test('one open shortlist at a time, on either door', () => {
  const src = read('api/lib/_match-guest.js');
  const hits = src.match(/status=eq\.offered&select=id/g) || [];
  assert.ok(hits.length >= 2,
    'both doors must refuse to open a second live shortlist — two lists is two sets of held ' +
    'rooms and two ways to accept');
});

/* ═══ 4 · THE RESCUE RIDE ═════════════════════════════════════════════════ */

test('the ride needs a stay paid in full', () => {
  assert.match(MIGRATION, /create or replace function public\.booking_fully_paid/,
    'one definition of "paid in full", used everywhere');
  assert.match(MIGRATION, /paid := coalesce\(b\.amount_paid, 0\)/,
    'amount_paid only moves when money cleared; balance_paid is a flag someone can set');

  const fn = MIGRATION.slice(MIGRATION.indexOf('function public.dispatch_rescue_ride'));
  assert.match(fn, /paid_full := public\.booking_fully_paid\(p_booking\)/);
  assert.match(fn, /reason := 'not_paid_in_full'/);
});

test('the ride is once per guest, for life, and the index says so', () => {
  assert.match(MIGRATION,
    /create unique index if not exists uq_rescue_ride_one_per_guest\s+on public\.rescue_rides \(guest_id\)\s+where covered_by = 'platform_float'/,
    'enforced by a constraint, not by remembering to check');

  const fn = MIGRATION.slice(MIGRATION.indexOf('function public.dispatch_rescue_ride'));
  assert.match(fn, /reason := 'already_used_lifetime_ride'/);
  assert.match(fn, /where guest_id = p_guest and covered_by = 'platform_float'/);
});

test('a refused ride still leaves a record and reaches a human', () => {
  const fn = MIGRATION.slice(MIGRATION.indexOf('function public.dispatch_rescue_ride'));
  assert.match(fn, /insert into public\.rescue_rides[\s\S]{0,900}?'needs_review'/,
    'the guest we could not carry must still exist in the record');
  assert.match(fn, /insert into public\.ops_alerts[\s\S]{0,600}?rescue_ride_declined/,
    'and ops must be told');
});

test('being moved is never conditional on the ride', () => {
  const src = read('api/lib/_checkin-issue.js');
  const refugeAt = src.indexOf('const refuge = preferRefund ? null : await findRefuge(bk);');
  const rideAt   = src.indexOf('rideEligibility.paidInFull');
  assert.ok(refugeAt > -1 && rideAt > -1 && refugeAt < rideAt,
    'the guest is re-homed BEFORE any question about the ride is asked');
  assert.match(src, /result\.rescue_ride = \{ covered: false, eligible: false/,
    'an ineligible ride reports itself as such rather than failing silently');
});

test('a guest can ask to be refunded instead of rehomed, before fault is even known', () => {
  const src = read('api/lib/_checkin-issue.js');

  assert.match(src, /const preferRefund = issue\.prefer_refund === true;/,
    'the preference must be read off the issue row, filed before adjudication');
  assert.match(src, /const refuge = preferRefund \? null : await findRefuge\(bk\);/,
    'when set, the refuge search must simply not run — everything downstream (the card, the ' +
    'ledger, the review) already handles replacement === null correctly');

  assert.match(src, /await voidOnNoShow\(bk, preferRefund \? 'guest_preferred_refund' : 'no_comparable_listing'\)/,
    'skipping the rehome because the guest asked to is still a no-show — any pending referral ' +
    'commission on this chain must void, same as when nothing comparable existed');

  /* The preference must never leak into fault or into what a guest AT
     fault owes — it only ever gates the refuge search in the host-fault
     branch. */
  const guestFaultBranch = src.slice(src.indexOf("fault === 'guest' && hours < 24"),
                                     src.indexOf('Clean cancellation'));
  assert.ok(!/preferRefund/.test(guestFaultBranch),
    'prefer_refund must not touch the guest-at-fault branch');
});

test('the guest is told the truth about the car', () => {
  const src = read('api/lib/_checkin-issue.js');
  assert.match(src, /const rideLine =/,
    'the redirect message must say what actually happened to the ride');
  assert.match(src, /Your ride there is booked and paid for by us/);
  assert.match(src, /the covered ride goes to guests[\s\S]{0,80}?who have paid a stay in full, once each/);
});

/* ═══ 5 · EVIDENCE AND ALERTS ═════════════════════════════════════════════ */

test('the guest cannot grade their own evidence', () => {
  assert.match(MIGRATION, /create or replace function public\.trg_checkin_issue_geo/,
    'geo_distance_m decides 0.55 of a point of confidence — enough on its own to turn ' +
    '"unclear" into "host at fault" — and it used to arrive from the browser');
  assert.match(MIGRATION, /new\.geo_distance_m := round\(\(6371000 \* acos/,
    'it must be computed from the listing\'s own coordinates');
  assert.match(MIGRATION, /new\.hours_to_checkin := public\.hours_to_checkin\(new\.booking_id\)/,
    'and the guest does not get to say how long is left before their own check-in');
  assert.match(MIGRATION,
    /create trigger checkin_issue_geo\s+before insert or update of geo_lat, geo_lng, listing_id/,
    'BEFORE, so a claimed value is overwritten rather than merely audited');
});

test('ops alerts land somewhere a person can see them', () => {
  assert.match(MIGRATION, /create table if not exists public\.ops_alerts/,
    'notifications.user_id is NOT NULL, so notify(null, "ops_alert", …) reached nobody');

  for (const f of ['api/lib/_match-guest.js', 'api/lib/_checkin-issue.js']) {
    const src = code(f);
    assert.ok(!/notify\(null,/.test(src),
      `${f} must not call notify(null, …) — it is a silent no-op`);
    assert.match(read(f), /async function alertOps/, `${f} must write to ops_alerts instead`);
  }
});

test('a promised refund is written down, not only announced', () => {
  const src = read('api/lib/_match-guest.js');
  const accept = src.slice(src.indexOf("if (action === 'accept')"),
                           src.indexOf("if (action === 'decline')"));
  assert.match(accept, /refund_due:\s+refundDue \|\| null/,
    'the amount owed must land on the booking row');
  assert.match(accept, /rehome_refund_due/,
    'and raise an alert, because a refund stated only in a notification does not happen');
});

/* ═══ 6 · COMMISSION HELD TO CHECK-IN, ACROSS BOTH PROGRAMMES ════════════ */

const MIGRATION2 = (() => {
  const dir = join(ROOT, 'supabase', 'migrations');
  const hit = readdirSync(dir).find(f => /hold_commission_to_checkin_and_direct_share/.test(f));
  assert.ok(hit, 'the commission-hold migration must exist in supabase/migrations');
  return readFileSync(join(dir, hit), 'utf8');
})();

test('the rehoming finder\'s fee is 10%, not 30%', () => {
  const src = read('api/lib/_match-guest.js');
  assert.match(src, /const COMMISSION_RATE = 0\.10;/);
  assert.ok(!/COMMISSION_RATE = 0\.30/.test(src), 'the old 30% rate must be gone entirely');
  assert.ok(!/30% of our service fee/.test(src),
    'no notification text may still promise the old rate');

  for (const f of ['partner-bookings.html', 'apa-trust.js']) {
    assert.ok(!/30% of our service fee/.test(read(f)), `${f} must not still quote 30%`);
  }
});

test('a referral_earnings row shares one lifecycle module for both programmes', () => {
  const src = read('api/lib/_referral-lifecycle.js');
  assert.match(src, /export async function pendingCommission/);
  assert.match(src, /export async function releaseOnCheckIn/);
  assert.match(src, /export async function voidOnNoShow/);
  assert.match(src, /export function referralRootRef/);

  /* Idempotent on booking_ref, like every other write to this table. */
  const pending = src.slice(src.indexOf('export async function pendingCommission'),
                            src.indexOf('export async function releaseOnCheckIn'));
  assert.match(pending, /select\('referral_earnings',/);
  assert.match(pending, /if \(existing\.length\) return existing\[0\];/);
  assert.match(pending, /status:\s+'pending_checkin'/);
});

test('an ordinary stays referral commission is held to check-in too', () => {
  const src = read('api/rewards.js');
  const award = src.slice(src.indexOf('async function actionAward'), src.indexOf('/* refund-credit') > -1
    ? src.indexOf('/* refund-credit') : src.length);

  assert.match(award, /const isStay\s+= service_type === 'stays';/);
  assert.match(award, /status:\s+isStay \? 'pending_checkin' : 'confirmed'/,
    'a stay must not be recorded as confirmed the instant it is paid — the guest can still ' +
    'arrive, find nothing there, decline to be rehomed, and be refunded');
  assert.match(award, /available_at:\s+isStay \? null : availableAt\.toISOString\(\)/,
    'a pending row must not carry a withdrawal-eligible date until it is actually confirmed');
});

test('stats separates pending commission from confirmed, so nobody is shown money they might not get', () => {
  const src = read('api/rewards.js');
  const stats = src.slice(src.indexOf('async function actionStats'));
  assert.match(stats, /status=eq\.pending_checkin&select=commission_kes/);
  assert.match(stats, /pending_kes:\s+parseFloat\(totalPending\.toFixed\(2\)\)/);
});

test('the migration carries a referral chain pointer and a reversal reason', () => {
  assert.match(MIGRATION2, /alter table public\.apartment_bookings\s+add column if not exists referral_root_ref text/);
  assert.match(MIGRATION2, /alter table public\.referral_earnings\s+add column if not exists reversed_reason text/);
});

test('direct-share is recorded as its own share_mode, distinct from the sweep', () => {
  assert.match(MIGRATION2, /add column if not exists share_mode text not null default 'sweep'/);
  assert.match(MIGRATION2, /check \(share_mode in \('sweep', 'direct'\)\)/);

  const src = read('api/lib/_match-guest.js');
  assert.match(src, /share_mode: 'direct'/);
  assert.match(src, /share_mode: action === 'offer-direct' \? 'direct' : 'sweep'/);
});

test('offer-direct re-reads the target listing and never trusts the request', () => {
  const src = read('api/lib/_match-guest.js');
  const direct = src.slice(src.indexOf("if (action === 'offer-direct')"),
                           src.indexOf("/* ── 'offer': the automatic sweep"));

  assert.match(direct, /const target = await one\('listings', `id=eq\.\$\{listing_id\}&select=\*`\);/,
    'price, capacity and host_id must all come from a fresh read of the listing');
  assert.match(direct, /if \(!target \|\| target\.status !== 'active'\)/);
  assert.match(direct, /String\(listing_id\) === String\(bk\.apartment_id\)/,
    'a host must not be able to "share" the same listing the guest already booked');
  assert.match(direct, /apartment_id=eq\.\$\{listing_id\}/,
    'availability must be checked fresh, exactly as the sweep does');
});

test('a same-host direct share still moves the guest but skips the broadcast noise', () => {
  const src = read('api/lib/_match-guest.js');
  const direct = src.slice(src.indexOf("if (action === 'offer-direct')"),
                           src.indexOf("/* ── 'offer': the automatic sweep"));
  assert.match(direct, /const reached = sameHost \? 0 : await broadcast/,
    'a host sharing their own property does not need to be told about their own property');
});

/* ═══ 7 · THE AMBASSADOR CONSOLE HAD THE SAME BUG ════════════════════════ */

test('the ambassador earnings ledger does not count a pending stay as available', () => {
  const src = read('api/lib/_ambassadors.js');
  const fn = src.slice(src.indexOf('async function handleEarnings'),
                       src.indexOf('async function handleLeaderboard'));

  assert.match(fn, /const live\s+= rows\.filter\(r => r\.status === 'confirmed'\)/,
    '"live" must mean confirmed, not merely "not reversed" — a pending row is neither');
  assert.match(fn, /const pending = rows\.filter\(r => r\.status === 'pending_checkin'\)/);
  assert.match(fn, /pending:\s+sum\(pending\)/,
    'a pending stay must be shown, but shown as its own bucket, never folded into "available"');
});

test('the ambassador dashboard view counts only confirmed earnings', () => {
  assert.ok(MIGRATION2.includes('create or replace view public.v_ambassador_me'),
    'the migration must recreate the view');
  const view = MIGRATION2.slice(MIGRATION2.indexOf('create or replace view public.v_ambassador_me'));
  assert.match(view, /where e\.referrer_id = a\.id and e\.status = 'confirmed'\), 0\)\s+as earned_total/,
    'earned_total must require status = confirmed, not merely status <> reversed');
  assert.match(view, /as earned_pending_checkin/,
    'a stay awaiting check-in must be visible as its own figure, distinct from earned_pending ' +
    '(which means "confirmed but still inside its withdrawal hold")');
});

/* ═══ 8 · A SECOND "amount_paid LOST ON REHOME" SITE ═════════════════════
   The rehoming path (_match-guest.js carryOver) already carried
   amount_paid across a move. The check-in-issue path builds its OWN
   replacement booking with a separate insert that never went through
   carryOver, and had exactly the same gap: a guest paid in full, moved
   automatically after reporting a problem at the door, and would have
   found their new check-in code locked behind "unlocks once paid in
   full" — the code reading amount_paid = 0 on a booking that was never
   given the chance to say otherwise. */

test('the check-in-issue rescue booking also carries the money and the referral chain', () => {
  const src = read('api/lib/_checkin-issue.js');
  const insertBlock = src.slice(src.indexOf("replacement = await insert('apartment_bookings'"),
                                src.indexOf('// Any price gap is ours'));

  assert.match(insertBlock, /amount_paid:\s+amountPaidOf\(bk\)/,
    'the rescue replacement must carry amount_paid, or the guest is locked out of their own ' +
    'check-in code immediately after being moved');
  assert.match(insertBlock, /referral_root_ref:\s+referralRootRef\(bk\)/,
    'and it must carry the referral chain forward, exactly like the rehoming path does');

  assert.match(src, /function amountPaidOf\(bk\)/,
    'a shared helper, not a third copy of the same inline arithmetic');
});
