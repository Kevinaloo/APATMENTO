/* ══════════════════════════════════════════════════════════════
   APATMENTO. Server-side Rewards & Referral API
   Vercel Serverless Function (api/rewards.js)
   All commission, points, withdrawal operations run here
   with the service-role key, never in the browser.

   Routes (POST with JSON body { action, ...params }):
     record-referral. Called at signup, idempotent
     award. Called by stk-callback after payment
     claim-welcome. 200 credits for a new account, idempotent
     redeem-points. Called at checkout, idempotent per booking_ref
     refund-credit. Returns credits when a booking does not complete
     withdraw. Request M-Pesa payout
     stats. Dashboard totals for the authed user

   Also serves /api/ambassadors (via vercel.json rewrite ?_route=ambassadors)
   to stay within the 12-serverless-function limit on Vercel Hobby.
   All ambassador logic lives in api/lib/_ambassadors.js; this file
   is a transparent proxy for those routes — no ambassador logic here.
══════════════════════════════════════════════════════════════ */

import { ambassadorHandler } from './lib/_ambassadors.js';
import { feeBasis } from './lib/_fees.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

/* Internal secret so only stk-callback can call award without a user token */
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || '';

/* Cabana's fee is a FIXED amount banded by booking value — KES 300 on a
   stay under KES 5,000, KES 800 at or above it, nothing at all on a tour or
   an event. It is never a percentage. The ladder lives in api/lib/_fees.js
   and the authority is the Postgres trigger that stamps `service_fee` onto
   the booking before it is written.

   This used to read `PLATFORM_FEE_RATE = 0.10` and multiply it by gross. No
   guest has ever been charged that. On a KES 60,000 stay it invented a
   KES 6,000 fee where KES 800 was collected, and paid commission on the
   difference. Commission is a share of a fee we actually took, so it is now
   computed from the fee we actually took. */

/* ══════════════════════════════════════════════════════════════
   THE RATE CARD
   ──────────────────────────────────────────────────────────────
   Commission is a share of CABANA'S FEE, not of the booking, and
   that fee is a fixed amount — KES 300 or KES 800 on a stay, zero
   on a tour or an event. So an ambassador on a traveller earns 15%
   of KES 300 or of KES 800: KES 45 or KES 120 per booking, whether
   the stay cost KES 4,000 or KES 400,000.

   Say that plainly wherever it is displayed. A programme that lets
   people believe they earn 15% of a booking will be accused of
   lying, and correctly — and one that implies the fee scales with
   the booking will be accused of it twice.

                      │ traveller │ host / service provider
     ─────────────────┼───────────┼────────────────────────
      ambassador      │    15%    │          10%
      ordinary user   │    10%    │           5%

   Both tiers earn for 365 days from the day the referral lands.

   This mirrors public.referral_rate() in schema-ambassadors.sql,
   which is the authority. The mirror exists so the payout path
   does not need a round trip; tests/ambassadors.test.sql pins the
   SQL side, and RATE_CARD below is asserted against the same six
   numbers. If you change one, change both.

   Unknown tiers fall to the ordinary card deliberately. A typo in
   a tier string should cost someone a complaint, not cost Cabana
   money on every booking until a human notices.                */
const RATE_CARD = {
  ambassador: { user: 0.15, host: 0.10, service_provider: 0.10 },
  user:       { user: 0.10, host: 0.05, service_provider: 0.05 },
};

function rateFor(tier, referralType) {
  const row = RATE_CARD[tier] || RATE_CARD.user;
  return row[referralType] ?? row.user;
}

/* Commission is booked on payment but not withdrawable immediately.
   A booking can still be cancelled or refunded after the money
   lands, and a programme that pays out before the cancellation
   window closes is a programme with a book-refund-repeat loop in
   it. Fourteen days covers the stay plus the dispute window. */
const COMMISSION_HOLD_DAYS = Number(process.env.COMMISSION_HOLD_DAYS || 14);

/* How long after account creation a referral code may still be attributed.
   See actionRecordReferral for why this bound has to exist at all. */
const REFERRAL_ATTRIBUTION_HOURS = Number(process.env.REFERRAL_ATTRIBUTION_HOURS || 48);

/* Points: 10 pts per KES 1,000 spent */
const POINTS_PER_KES = 10 / 1000;

/* ══════════════════════════════════════════════════════════════
   WELCOME CREDIT
   ──────────────────────────────────────────────────────────────
   Every new account opens with 200 credits. One credit is one
   shilling off the total, on anything except flights.

   Two things make this safe to expose to the browser:

   1. The amount is decided here, never sent by the client.
   2. `WELCOME_FROM` bounds who is eligible by account age. Without
      it, shipping this would hand 200 credits to every account that
      has ever existed the moment each one next opened the site,
      which is a real liability, not a marketing spend. Accounts
      created before the promo launched are simply not eligible.

   Move WELCOME_CREDIT_FROM in Vercel's env to re-open the offer to
   an earlier cohort, or set WELCOME_CREDIT_POINTS to change the
   amount. Neither needs a deploy.
══════════════════════════════════════════════════════════════ */
const WELCOME_POINTS = Number(process.env.WELCOME_CREDIT_POINTS || 200);
const WELCOME_FROM   = process.env.WELCOME_CREDIT_FROM || '2026-08-17';

/* ══════════════════════════════════════════════════════════════
   WHERE THE CREDITS ARE GOOD
   ──────────────────────────────────────────────────────────────
   Five services, named: stays, tours, events, roommates, car hire.

   This is an ALLOWLIST, and the direction matters more than the
   contents. It used to be a blacklist — ['flights'] — which meant
   every service we have not launched yet, and every typo, and every
   new booking surface someone builds next quarter, was silently
   eligible by default. A promotion whose scope grows on its own is a
   promotion nobody is controlling.

   Now the default is no. A service that wants to accept credits has
   to be written on this line, deliberately, by someone who has
   thought about the margin on it.

   Why these five and not the rest:
     stays, roommates, tours, events, carhire → we take a fee, so
       there is a margin to discount against, and the booking is
       ours end to end.
     flights  → sold at cost. There is nothing to discount.
     food, shopping → third-party goods at cost or near it, often
       settled directly with the vendor.
     rides    → a driver's fare. Discounting it either shorts the
       driver or costs us the whole fare, and neither is a promotion.

   The names are the canonical service keys used across the platform
   (see normaliseService in api/lib/_support.js). Aliases are folded
   in before the check so 'car hire', 'apartment' and 'safari' cannot
   sneak past it by spelling.
══════════════════════════════════════════════════════════════ */
const CREDIT_ELIGIBLE = ['stays', 'roommates', 'tours', 'events', 'carhire'];

const SERVICE_ALIASES = {
  stay: 'stays', stays: 'stays', apartment: 'stays', apartments: 'stays',
  accommodation: 'stays', apt: 'stays',
  room: 'roommates', rooms: 'roommates', roommate: 'roommates', roommates: 'roommates',
  tour: 'tours', tours: 'tours', safari: 'tours', safaris: 'tours',
  event: 'events', events: 'events', ticket: 'events', tickets: 'events',
  'car hire': 'carhire', carhire: 'carhire', 'car-hire': 'carhire',
  vehicle: 'carhire', vehicles: 'carhire', car: 'carhire',
  ride: 'rides', rides: 'rides', taxi: 'rides',
  food: 'food', restaurant: 'food', restaurants: 'food',
  shop: 'shopping', shopping: 'shopping', product: 'shopping', products: 'shopping',
  flight: 'flights', flights: 'flights',
};

function normaliseService(value) {
  const raw = String(value || '').trim().toLowerCase()
    .replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
    .replace(/^(?:a|an|the)\s+/, '');
  return SERVICE_ALIASES[raw] || raw.replace(/\s/g, '');
}

function creditsAllowedOn(serviceType) {
  return CREDIT_ELIGIBLE.includes(normaliseService(serviceType));
}

/* For the copy, so the UI never has to hard-code the list and then
   drift from it. */
const CREDIT_ELIGIBLE_LABEL = 'stays, tours, events, roommates and car hire';

const welcomeRef = uid => 'WELCOME-' + uid;

/* ── DB helpers (service-role. Full trust) ── */
async function dbSelect(table, query = '') {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });
  if (!r.ok) throw new Error(`select ${table}: ${await r.text()}`);
  return r.json();
}

async function dbInsert(table, row, { upsert = false, onConflict = '' } = {}) {
  const prefer = upsert
    ? `resolution=merge-duplicates,return=representation`
    : `return=representation`;
  const url = upsert && onConflict
    ? `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`
    : `${SUPABASE_URL}/rest/v1/${table}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: prefer,
    },
    body: JSON.stringify(row),
  });
  if (!r.ok) throw new Error(`insert ${table}: ${await r.text()}`);
  const txt = await r.text();
  return txt ? JSON.parse(txt) : null;
}

async function dbPatch(table, query, patch) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error(`patch ${table}: ${await r.text()}`);
  const rows = await r.json();
  return rows[0] || null;
}

/* Call a Postgres function with the service key. Returns null rather
   than throwing when the function is not deployed yet, so a missing
   migration degrades a feature instead of breaking a signup. */
async function dbRpc(fn, args = {}) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });
    if (!r.ok) { console.warn(`[rewards] rpc ${fn}:`, await r.text()); return null; }
    const txt = await r.text();
    return txt ? JSON.parse(txt) : null;
  } catch (e) {
    console.warn(`[rewards] rpc ${fn}:`, e.message);
    return null;
  }
}

/* Atomic points increment via Supabase RPC.
   Falls back to read-then-write if the RPC doesn't exist yet
   the SQL migration creates it.  */
async function atomicAddPoints(userId, delta, lifetime = false) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/add_user_points`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_user_id: userId, p_delta: delta, p_add_lifetime: lifetime }),
  });
  if (r.ok) return;
  /* Fallback: non-atomic but at least server-side */
  console.warn('[rewards] RPC add_user_points not available, falling back');
  const rows = await dbSelect('user_points', `user_id=eq.${userId}&select=available_points,lifetime_points`);
  const av = (rows[0]?.available_points || 0) + delta;
  const lt = (rows[0]?.lifetime_points  || 0) + (lifetime ? delta : 0);
  if (rows.length) {
    await dbPatch('user_points', `user_id=eq.${userId}`, {
      available_points: av, lifetime_points: lt, updated_at: new Date().toISOString(),
    });
  } else {
    await dbInsert('user_points', { user_id: userId, available_points: av, lifetime_points: lt });
  }
}

/* ── Who is calling? Validate bearer token via Supabase auth/v1/user ── */
async function authedUser(req) {
  const auth = req.headers.authorization || req.headers.Authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  return r.json();
}

/* ── CORS ── */
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-internal-secret');
}

/* ════════════════════════════════════════════════════════════════
   ACTIONS
════════════════════════════════════════════════════════════════ */

/* record-referral
   Called client-side after signup. Idempotent (safe to call twice).
   Auth: user's own bearer token (we verify referredUserId matches token). */
async function actionRecordReferral(body, user) {
  if (!user) return { error: 'Unauthorized', status: 401 };
  const referredUserId = user.id; // always from token, never trust body

  const code = (body.code || '').trim().toUpperCase();
  if (!code) return { error: 'No referral code', status: 400 };

  /* Idempotency: already recorded? */
  const existing = await dbSelect('referrals', `referred_id=eq.${referredUserId}&limit=1`);
  if (existing.length) return { ok: true, skipped: true };

  /* Attribution belongs to a SIGNUP, not to a click.

     Without this, anyone could send a referral link to the existing user
     base and collect a year of commission on people the platform already
     had — the cheapest possible way to farm a referral programme, and the
     one that costs the most, because those users were already booking.

     The window is generous on purpose: email confirmation, an OAuth
     round-trip, or simply finishing signup on a laptop after starting on a
     phone can all put real distance between account creation and the first
     page load that carries a token. Two days covers all of it and still
     excludes anybody who has been here a while. */
  const createdAt = user.created_at || user.createdAt;
  if (createdAt) {
    const ageHours = (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
    if (ageHours > REFERRAL_ATTRIBUTION_HOURS) {
      return { ok: true, skipped: 'account_too_old' };
    }
  }

  /* Find referrer */
  const codeRows = await dbSelect('referral_codes', `code=eq.${encodeURIComponent(code)}&select=user_id`);
  if (!codeRows.length) return { error: 'Invalid referral code', status: 404 };
  const referrerId = codeRows[0].user_id;
  if (referrerId === referredUserId) return { error: 'Cannot refer yourself', status: 400 };

  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);

  /* What was referred: a traveller, a host, or a service provider. */
  const REF_TYPES = ['user', 'host', 'service_provider'];
  const referral_type = REF_TYPES.includes(body.referral_type) ? body.referral_type : 'user';

  /* Who did the referring — resolved from OUR tables, never from the
     body. The client asking to be treated as an ambassador is exactly
     the request we must not honour. */
  const ambRows = await dbSelect('ambassadors',
    `id=eq.${referrerId}&status=neq.suspended&select=id`);
  const referrer_tier = ambRows.length ? 'ambassador' : 'user';

  /* Stamp the rate now. Never recompute it at payout.

     Two reasons, both about money. A rate promised at 15% stays 15%
     even if the person later leaves the programme, which is simple
     honesty. And nobody can farm referrals as an ordinary user, get
     added to the roster, and have their whole back catalogue silently
     reprice upward — a rate that floats is a rate you can game by
     waiting. */
  const commission_rate = rateFor(referrer_tier, referral_type);

  await dbInsert('referrals', {
    referrer_id:   referrerId,
    referred_id:   referredUserId,
    referral_type,
    referrer_tier,
    commission_rate,
    code_used:     code,
    expires_at:    expires.toISOString(),
  });

  return { ok: true, tier: referrer_tier, rate: commission_rate };
}

/* award
   Called ONLY by stk-callback (internal secret) after confirmed payment.
   Awards points to the booker AND commission to their referrer.
   Fully idempotent via booking_ref unique index on both tables.           */
async function actionAward(body, req) {
  const secret = req.headers['x-internal-secret'] || '';
  if (!INTERNAL_SECRET || secret !== INTERNAL_SECRET) {
    return { error: 'Forbidden', status: 403 };
  }

  const { booking_ref, guest_id, service_type, gross_amount } = body;
  if (!booking_ref || !guest_id || !service_type || !gross_amount) {
    return { error: 'Missing required fields', status: 400 };
  }
  if (service_type === 'flights') return { ok: true, skipped: 'flights excluded' };

  /* The fee this booking actually carried. The caller reads it off the
     booking row, where Postgres stamped it; `service_fee` may legitimately
     be 0 (tours, events) which is why feeBasis checks for a finite number
     rather than a truthy one. Absent, we fall back to the published
     ladder — never to a percentage. */
  const platform_fee_basis = feeBasis({
    stamped:  body.service_fee,
    service:  service_type,
    subtotal: Number(gross_amount),
  });

  /* ── 1. Award points to booker (10 pts per KES 1,000) ── */
  const points = Math.floor(Number(gross_amount) * POINTS_PER_KES);
  if (points > 0) {
    /* Idempotency: check if already awarded for this booking_ref */
    const ptCheck = await dbSelect('point_transactions', `booking_ref=eq.${encodeURIComponent(booking_ref)}&type=eq.earn&limit=1`);
    if (!ptCheck.length) {
      await atomicAddPoints(guest_id, points, true /* add to lifetime too */);
      await dbInsert('point_transactions', {
        user_id:      guest_id,
        type:         'earn',
        points,
        amount_kes:   Number(gross_amount),
        service_type,
        booking_ref,
        description:  `Earned ${points} pts on ${service_type} booking`,
      });
      console.log(`[rewards] +${points} pts → ${guest_id} (${booking_ref})`);
    } else {
      console.log(`[rewards] points already awarded for ${booking_ref}`);
    }
  }

  /* ── 2. Award commission to referrer (if this guest was referred) ── */
  const now = new Date().toISOString();
  const refs = await dbSelect('referrals', `referred_id=eq.${guest_id}&expires_at=gte.${now}&order=created_at.desc&limit=1`);
  if (refs.length) {
    const ref  = refs[0];
    /* Idempotency check */
    const earningsCheck = await dbSelect('referral_earnings', `booking_ref=eq.${encodeURIComponent(booking_ref)}&limit=1`);
    if (!earningsCheck.length) {
      /* The fee, server-side, from the booking rather than from the body's
         idea of it. A zero-fee booking books a zero commission and no row
         is skipped: the referral still shows up in the ledger at KES 0,
         because "you earned nothing on this one" is information and a
         missing row is a support ticket. */
      const platform_fee = parseFloat(Number(platform_fee_basis).toFixed(2));

      /* Honour the rate stamped when the referral was created. The
         fallback covers rows written before tiers existed, and reads
         the same card rather than reintroducing a magic number. */
      const tier = ref.referrer_tier || 'user';
      const rate = ref.commission_rate != null
        ? Number(ref.commission_rate)
        : rateFor(tier, ref.referral_type || 'user');
      const commission = parseFloat((platform_fee * rate).toFixed(2));

      /* ── Held to check-in, on a stay ────────────────────────────────
         A stay can be paid for and never happen: the guest arrives to
         a property that does not exist, declines to be rehomed, and is
         refunded in full. Under the old rule the referrer had already
         been paid a commission on a stay that was reversed underneath
         them the same afternoon — real money, out the door, on nothing.

         So a STAYS commission is written as 'pending_checkin' — real
         enough to show as pending, not real enough to withdraw or to
         count in the confirmed total — and is only flipped to
         'confirmed' by releaseOnCheckIn() the moment the guest actually
         checks in (api/lib/_verify-checkin.js). If the booking is
         cancelled first, voidOnNoShow() reverses it and it is never
         paid. Every other service type has no check-in to hold
         against — a tour or an event either happened or the booking
         would not have settled — so they keep the old, immediate rule. */
      const isStay      = service_type === 'stays';
      const availableAt = new Date(Date.now() + COMMISSION_HOLD_DAYS * 86400000);

      await dbInsert('referral_earnings', {
        referrer_id:     ref.referrer_id,
        referred_id:     guest_id,
        service_type,
        gross_amount:    Number(gross_amount),
        platform_fee,
        commission_rate: rate,
        commission_kes:  commission,
        referrer_tier:   tier,
        referral_type:   ref.referral_type || 'user',
        available_at:    isStay ? null : availableAt.toISOString(),
        status:          isStay ? 'pending_checkin' : 'confirmed',
        booking_ref,
      });
      console.log(`[rewards] commission KES ${commission} → ${ref.referrer_id} (${booking_ref})`);
    } else {
      console.log(`[rewards] commission already awarded for ${booking_ref}`);
    }
  }

  return { ok: true, points, referred: refs.length > 0 };
}

/* claim-welcome
   Auth: user's own bearer token. Idempotent, and idempotent at the
   DB level rather than only in this function: point_transactions has
   a unique index on (booking_ref, type) for type='earn', so two calls
   racing each other produce one grant and one duplicate-key error, not
   two grants. The client may therefore call this on every page load
   without co-ordination.                                              */
async function actionClaimWelcome(body, user) {
  if (!user) return { error: 'Unauthorized', status: 401 };
  const userId = user.id;
  const ref    = welcomeRef(userId);

  const balanceOf = async () => {
    const rows = await dbSelect('user_points', `user_id=eq.${userId}&select=available_points`);
    return rows[0]?.available_points || 0;
  };

  /* ── The one-time congratulations ────────────────────────────────
     `celebrate: true` comes back from exactly one call, ever, for a
     given account. The decision is a single atomic UPDATE in Postgres
     (claim_welcome_celebration) that stamps user_points, so:

       · two tabs racing produce one celebration and one no-op
       · a new phone, a cleared cache, a different browser, a
         reinstall — none of them bring it back
       · Google sign-up and email sign-up land in the same place,
         because the flag is on the account, not on the flow

     The old behaviour was a localStorage key, which meant the reveal
     re-fired on every new device an existing user ever signed in on.
     A gift you are congratulated for receiving three times stops
     reading as a gift.

     The stamp is only spent when the client asks for it —
     `celebrate: true` in the body — so a background call that renders
     nothing does not silently burn someone's one moment. */
  const wantsCelebration = body?.celebrate === true;
  const celebrateIfDue = async () => {
    if (!wantsCelebration) return false;
    const v = await dbRpc('claim_welcome_celebration', { p_user: userId });
    /* PostgREST returns the scalar itself for a scalar function. */
    return v === true || v === 'true';
  };

  /* Already granted? Say so plainly, and hand back the balance so the
     UI can render without a second round trip. */
  const existing = await dbSelect('point_transactions',
    `booking_ref=eq.${encodeURIComponent(ref)}&type=eq.earn&limit=1`);
  if (existing.length) {
    return {
      ok: true, already: true, points: WELCOME_POINTS,
      balance: await balanceOf(),
      celebrate: await celebrateIfDue(),
      eligible_services: CREDIT_ELIGIBLE,
      eligible_label: CREDIT_ELIGIBLE_LABEL,
    };
  }

  /* Eligibility is account age, taken from the auth record, never from
     anything the caller sends. */
  const createdAt = user.created_at || user.createdAt;
  if (createdAt && new Date(createdAt) < new Date(WELCOME_FROM)) {
    return { ok: false, eligible: false, reason: 'account_predates_offer',
             balance: await balanceOf() };
  }

  try {
    await atomicAddPoints(userId, WELCOME_POINTS, true);
    await dbInsert('point_transactions', {
      user_id:      userId,
      type:         'earn',
      points:       WELCOME_POINTS,
      amount_kes:   WELCOME_POINTS,
      service_type: 'welcome',
      booking_ref:  ref,
      description:  `Welcome credit · ${WELCOME_POINTS} credits`,
    });
  } catch (e) {
    /* Lost the race against another tab. The other one granted it. */
    if (/duplicate|unique/i.test(e.message)) {
      return {
        ok: true, already: true, points: WELCOME_POINTS,
        balance: await balanceOf(),
        celebrate: await celebrateIfDue(),
        eligible_services: CREDIT_ELIGIBLE,
        eligible_label: CREDIT_ELIGIBLE_LABEL,
      };
    }
    throw e;
  }

  return {
    ok: true, granted: true, points: WELCOME_POINTS,
    balance: await balanceOf(),
    celebrate: await celebrateIfDue(),
    eligible_services: CREDIT_ELIGIBLE,
    eligible_label: CREDIT_ELIGIBLE_LABEL,
  };
}

/* redeem-points
   Auth: user's own bearer token. Atomic deduction via RPC.
   Returns value_kes (how much KES the points are worth) on success.     */
async function actionRedeemPoints(body, user) {
  if (!user) return { error: 'Unauthorized', status: 401 };
  const userId = user.id;
  /* The allowlist, applied to a normalised name. An unknown or missing
     service_type is refused rather than waved through: a booking surface
     that forgets to say what it is does not get to spend credits by
     omission. */
  const service_type = normaliseService(body.service_type);
  if (!creditsAllowedOn(service_type)) {
    return {
      error: `Credits are valid on ${CREDIT_ELIGIBLE_LABEL}.`,
      status: 400,
      eligible_services: CREDIT_ELIGIBLE,
    };
  }

  const pointsToRedeem = Math.floor(Number(body.points_to_redeem));
  const booking_ref    = body.booking_ref || '';
  if (!pointsToRedeem || pointsToRedeem <= 0) return { error: 'Invalid points amount', status: 400 };

  /* ── Idempotent per booking, per person, and only once ────────────
     Checkout can retry a failed insert and a guest can double-tap Pay;
     neither must spend the credit twice. But "I have seen this
     booking_ref before, so here is a free discount" is a different
     sentence from "I have already deducted for it", and the earlier
     version said the first while meaning the second. It matched on
     booking_ref alone, and answered `ok: true` with a value_kes the
     checkout then subtracted from the total — WITHOUT deducting
     anything.

     Two ways that paid out:

       · Replay your own. Book with credits at ref R (200 deducted),
         have the booking fall through, collect the credits back via
         refund-credit — then book again reusing ref R. The old redeem
         row is still there, so the call returns "already, worth 200",
         the checkout takes 200 off, and the balance is untouched.
         Repeat as often as you like.
       · Replay someone else's. booking_ref is client-generated
         (`APT-<listing>-<timestamp>`), so any ref that has ever been
         redeemed against answers the same way to anybody.

     The fix is to make the key what it always should have been — this
     user, this booking, and not since reversed — and to refuse rather
     than report success in every case that is not a genuine retry. */
  if (booking_ref) {
    const ref = encodeURIComponent(booking_ref);

    const prior = await dbSelect('point_transactions',
      `booking_ref=eq.${ref}&type=eq.redeem&limit=1`);

    if (prior.length) {
      /* Somebody else's reference. Never answer this with a value. */
      if (String(prior[0].user_id) !== String(userId)) {
        return { error: 'That booking reference is already in use.', status: 409 };
      }

      /* Ours, but has it since been handed back? refund-credit writes
         the reversal under REFUND-<ref>, so its presence means the
         deduction no longer stands and this is a re-use, not a retry. */
      const reversed = await dbSelect('point_transactions',
        `booking_ref=eq.${encodeURIComponent('REFUND-' + booking_ref)}&user_id=eq.${userId}&limit=1`);
      if (reversed.length) {
        return { error: 'Those credits were already returned to you. Start a new booking.',
                 status: 409 };
      }

      const already = Math.abs(Number(prior[0].points || 0));
      const rows = await dbSelect('user_points', `user_id=eq.${userId}&select=available_points`);
      return { ok: true, already: true, value_kes: already,
               new_balance: rows[0]?.available_points || 0 };
    }
  }

  /* Check balance server-side */
  const rows = await dbSelect('user_points', `user_id=eq.${userId}&select=available_points`);
  const available = rows[0]?.available_points || 0;
  if (available < pointsToRedeem) {
    return { error: 'Insufficient credits', status: 400, available };
  }

  /* Atomic deduct */
  await atomicAddPoints(userId, -pointsToRedeem, false);

  await dbInsert('point_transactions', {
    user_id:      userId,
    type:         'redeem',
    points:       -pointsToRedeem,
    amount_kes:   pointsToRedeem,
    service_type,
    booking_ref,
    description:  `Redeemed ${pointsToRedeem} credits = KES ${pointsToRedeem}`,
  });

  return { ok: true, value_kes: pointsToRedeem, new_balance: available - pointsToRedeem };
}

/* refund-credit
   Auth: user's own bearer token. Returns credits spent against a
   booking that never happened. Without this, a guest whose booking
   insert failed, or who was refunded, silently loses the credit they
   applied. Idempotent on booking_ref.                                  */
async function actionRefundCredit(body, user) {
  if (!user) return { error: 'Unauthorized', status: 401 };
  const userId      = user.id;
  const booking_ref = body.booking_ref || '';
  if (!booking_ref) return { error: 'booking_ref required', status: 400 };

  const spent = await dbSelect('point_transactions',
    `booking_ref=eq.${encodeURIComponent(booking_ref)}&type=eq.redeem`
    + `&user_id=eq.${userId}&limit=1`);
  if (!spent.length) return { ok: true, nothing_to_refund: true };

  /* Already given back? The reversal is written as its own row with a
     distinct ref, so its presence is the idempotency key. */
  const reversalRef = 'REFUND-' + booking_ref;
  const prior = await dbSelect('point_transactions',
    `booking_ref=eq.${encodeURIComponent(reversalRef)}&user_id=eq.${userId}&limit=1`);
  if (prior.length) return { ok: true, already: true };

  const points = Math.abs(Number(spent[0].points || 0));
  if (points <= 0) return { ok: true, nothing_to_refund: true };

  await atomicAddPoints(userId, points, false);
  await dbInsert('point_transactions', {
    user_id:      userId,
    type:         'earn',
    points,
    amount_kes:   points,
    service_type: spent[0].service_type || null,
    booking_ref:  reversalRef,
    description:  `Credits returned · booking ${booking_ref} did not complete`,
  });

  return { ok: true, refunded: points };
}

/* withdraw
   Auth: user's own bearer token.
   Server-side computes the actual available balance (earnings minus
   already-pending withdrawals) before allowing the request.              */
async function actionWithdraw(body, user) {
  if (!user) return { error: 'Unauthorized', status: 401 };
  const userId = user.id;

  const amount_kes   = parseFloat(body.amount_kes);
  const mpesa_number = (body.mpesa_number || '').trim();

  if (!amount_kes || amount_kes < 50) return { error: 'Minimum withdrawal is KES 50', status: 400 };
  if (!mpesa_number)                  return { error: 'M-Pesa number required', status: 400 };
  if (!/^(?:254|0)\d{9}$/.test(mpesa_number.replace(/\s/g, ''))) {
    return { error: 'Invalid M-Pesa number format', status: 400 };
  }

  /* Compute real available balance: MATURED confirmed earnings, minus
     pending or paid withdrawals.

     `available_at` is the load-bearing filter. Commission is booked the
     moment payment confirms, but a booking can still be cancelled or
     refunded afterwards. Paying out before that window closes leaves a
     book-refund-repeat loop wide open, and the money is gone by the time
     the reversal lands. Rows written before the hold existed have a null
     available_at and are treated as matured, which is correct: they are
     long past any window. */
  const nowIso = new Date().toISOString();
  const [earnings, withdrawals] = await Promise.all([
    dbSelect('referral_earnings',
      `referrer_id=eq.${userId}&status=eq.confirmed` +
      `&or=(available_at.is.null,available_at.lte.${nowIso})` +
      `&select=commission_kes`),
    dbSelect('referral_withdrawals', `user_id=eq.${userId}&status=in.(pending,paid)&select=amount_kes`),
  ]);
  const totalEarned    = earnings.reduce((s, e) => s + parseFloat(e.commission_kes || 0), 0);
  const totalWithdrawn = withdrawals.reduce((s, w) => s + parseFloat(w.amount_kes  || 0), 0);
  const available      = parseFloat((totalEarned - totalWithdrawn).toFixed(2));

  if (amount_kes > available) {
    return { error: `Amount exceeds available balance of KES ${available.toFixed(0)}`, status: 400 };
  }

  await dbInsert('referral_withdrawals', {
    user_id:      userId,
    amount_kes,
    mpesa_number: mpesa_number.replace(/\s/g, ''),
    status:       'pending',
  });

  return { ok: true, available_after: parseFloat((available - amount_kes).toFixed(2)) };
}

/* ensure-code
   Idempotent. Create a referral_code row for a user if none exists.
   Auth: user's own bearer token. Ignores body.user_id, always uses token uid. */
async function actionEnsureCode(body, user) {
  if (!user) return { error: 'Unauthorized', status: 401 };
  const userId = user.id;
  const code   = (body.code || '').trim().toUpperCase().slice(0, 20);
  if (!code) return { error: 'code required', status: 400 };

  /* Check existing */
  const rows = await dbSelect('referral_codes', `user_id=eq.${userId}&select=code`);
  if (rows.length) return { ok: true, code: rows[0].code, existed: true };

  /* Retry on collision (up to 3 attempts with a numeric suffix) */
  for (let attempt = 0; attempt < 3; attempt++) {
    const tryCode = attempt === 0 ? code : `${code.split('-')[0]}-${code.split('-')[1]}${attempt}`;
    try {
      await dbInsert('referral_codes', { user_id: userId, code: tryCode });
      return { ok: true, code: tryCode };
    } catch (e) {
      if (!e.message.includes('unique') && !e.message.includes('duplicate')) throw e;
      /* collision. Loop */
    }
  }
  return { error: 'Could not generate a unique code', status: 500 };
}

/* stats
   Auth: user's own bearer token. Returns dashboard totals net of withdrawals. */
async function actionStats(body, user) {
  if (!user) return { error: 'Unauthorized', status: 401 };
  const userId = user.id;

  const [earnings, pending, withdrawals, points, referralCount] = await Promise.all([
    dbSelect('referral_earnings', `referrer_id=eq.${userId}&status=eq.confirmed&select=commission_kes`),
    /* Real money, not yet real: a stay someone booked through this
       person, held until the guest checks in. Shown separately so
       nobody reads "total earned" as bigger than it safely is, and so
       a commission that later reverses was never presented as theirs
       to begin with. */
    dbSelect('referral_earnings', `referrer_id=eq.${userId}&status=eq.pending_checkin&select=commission_kes`),
    dbSelect('referral_withdrawals', `user_id=eq.${userId}&status=in.(pending,paid)&select=amount_kes`),
    dbSelect('user_points', `user_id=eq.${userId}&select=available_points,lifetime_points`),
    dbSelect('referrals', `referrer_id=eq.${userId}&select=id`),
  ]);

  const totalEarned    = earnings.reduce((s, e) => s + parseFloat(e.commission_kes || 0), 0);
  const totalPending    = pending.reduce((s, e) => s + parseFloat(e.commission_kes || 0), 0);
  const totalWithdrawn = withdrawals.reduce((s, w) => s + parseFloat(w.amount_kes  || 0), 0);

  return {
    ok:              true,
    total_earned_kes: parseFloat(totalEarned.toFixed(2)),
    pending_kes:      parseFloat(totalPending.toFixed(2)),
    withdrawn_kes:    parseFloat(totalWithdrawn.toFixed(2)),
    available_kes:    parseFloat((totalEarned - totalWithdrawn).toFixed(2)),
    available_points: points[0]?.available_points  || 0,
    lifetime_points:  points[0]?.lifetime_points   || 0,
    referral_count:   referralCount.length,
    /* One credit is one shilling. Named explicitly so the UI never has
       to hard-code the conversion. */
    credit_kes:       points[0]?.available_points  || 0,
    welcome_points:   WELCOME_POINTS,
    /* Named here so no page has to hard-code where credits are good
       and then drift from the server that enforces it. */
    eligible_services: CREDIT_ELIGIBLE,
    eligible_label:    CREDIT_ELIGIBLE_LABEL,
  };
}

/* ════════════════════════════════════════════════════════════════
   HANDLER
════════════════════════════════════════════════════════════════ */

/* True when this invocation is really a call to /api/ambassadors.
   Belt and braces: the query param set by the vercel.json rewrite, the
   same param read off the raw URL, or the original public path surviving
   on req.url. Any one of the three is enough. */
function isAmbassadorRoute(req) {
  if (req.query && req.query._route === 'ambassadors') return true;
  const url = String(req.url || '');
  if (/[?&]_route=ambassadors(?:&|$)/.test(url)) return true;
  if (/^\/api\/ambassadors(?:[/?]|$)/.test(url.split('?')[0])) return true;
  return false;
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  /* Transparent proxy for /api/ambassadors (vercel.json rewrite adds _route=ambassadors).
     The ambassador handler speaks the same GET/POST + ?action= protocol as the admin console.

     Detected two ways on purpose. req.query is the normal path, but it only
     carries _route if the rewrite is present AND Vercel merges the query as
     expected; the raw URL is checked as a backstop so a routing-config
     regression degrades into "still works" rather than a 400 on every
     ambassador call. This route was 404ing in production for exactly that
     reason — the rewrite was documented in three files and present in none. */
  if (isAmbassadorRoute(req)) return ambassadorHandler(req, res);

  if (req.method !== 'POST')   return res.status(405).json({ error: 'POST only' });

  try {
    const body   = req.body || {};
    const action = body.action;
    if (!action) return res.status(400).json({ error: 'action required' });

    /* award doesn't need a user token. It's internal-secret-gated */
    const user = action === 'award' ? null : await authedUser(req);

    let result;
    switch (action) {
      case 'record-referral': result = await actionRecordReferral(body, user); break;
      case 'award':           result = await actionAward(body, req);           break;
      case 'claim-welcome':   result = await actionClaimWelcome(body, user);   break;
      case 'redeem-points':   result = await actionRedeemPoints(body, user);   break;
      case 'refund-credit':   result = await actionRefundCredit(body, user);   break;
      case 'withdraw':        result = await actionWithdraw(body, user);       break;
      case 'stats':           result = await actionStats(body, user);          break;
      case 'ensure-code':     result = await actionEnsureCode(body, user);     break;
      default: return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    const status = result.status || 200;
    const { status: _s, ...payload } = result;
    return res.status(status).json(payload);

  } catch (err) {
    console.error('[rewards] handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
