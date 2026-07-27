/* ══════════════════════════════════════════════════════════════
   APATMENTO — Server-side Rewards & Referral API
   Vercel Serverless Function (api/rewards.js)
   All commission, points, withdrawal operations run here
   with the service-role key — never in the browser.

   Routes (POST with JSON body { action, ...params }):
     record-referral   — called at signup, idempotent
     award             — called by stk-callback after payment
     redeem-points     — called at checkout
     withdraw          — request M-Pesa payout
     stats             — dashboard totals for the authed user
══════════════════════════════════════════════════════════════ */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

/* Internal secret so only stk-callback can call award without a user token */
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || '';

/* Platform fee rate — 10% of gross for stays/tours/events */
const PLATFORM_FEE_RATE = 0.10;

/* Points: 10 pts per KES 1,000 spent */
const POINTS_PER_KES = 10 / 1000;

/* ── DB helpers (service-role — full trust) ── */
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

/* Atomic points increment via Supabase RPC.
   Falls back to read-then-write if the RPC doesn't exist yet —
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
   Called client-side after signup — idempotent (safe to call twice).
   Auth: user's own bearer token (we verify referredUserId matches token). */
async function actionRecordReferral(body, user) {
  if (!user) return { error: 'Unauthorized', status: 401 };
  const referredUserId = user.id; // always from token, never trust body

  const code = (body.code || '').trim().toUpperCase();
  if (!code) return { error: 'No referral code', status: 400 };

  /* Idempotency: already recorded? */
  const existing = await dbSelect('referrals', `referred_id=eq.${referredUserId}&limit=1`);
  if (existing.length) return { ok: true, skipped: true };

  /* Find referrer */
  const codeRows = await dbSelect('referral_codes', `code=eq.${encodeURIComponent(code)}&select=user_id`);
  if (!codeRows.length) return { error: 'Invalid referral code', status: 404 };
  const referrerId = codeRows[0].user_id;
  if (referrerId === referredUserId) return { error: 'Cannot refer yourself', status: 400 };

  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);

  /* Determine type from body (default user) */
  const referral_type = body.referral_type === 'host' ? 'host' : 'user';

  await dbInsert('referrals', {
    referrer_id:   referrerId,
    referred_id:   referredUserId,
    referral_type,
    code_used:     code,
    expires_at:    expires.toISOString(),
  });

  return { ok: true };
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
      /* Calculate platform fee server-side — never trust client */
      const platform_fee = parseFloat((Number(gross_amount) * PLATFORM_FEE_RATE).toFixed(2));
      const rate         = ref.referral_type === 'host' ? 0.10 : 0.20;
      const commission   = parseFloat((platform_fee * rate).toFixed(2));

      await dbInsert('referral_earnings', {
        referrer_id:     ref.referrer_id,
        referred_id:     guest_id,
        service_type,
        gross_amount:    Number(gross_amount),
        platform_fee,
        commission_rate: rate,
        commission_kes:  commission,
        status:          'confirmed',
        booking_ref,
      });
      console.log(`[rewards] commission KES ${commission} → ${ref.referrer_id} (${booking_ref})`);
    } else {
      console.log(`[rewards] commission already awarded for ${booking_ref}`);
    }
  }

  return { ok: true, points, referred: refs.length > 0 };
}

/* redeem-points
   Auth: user's own bearer token. Atomic deduction via RPC.
   Returns valueKes (how much KES the points are worth) on success.       */
async function actionRedeemPoints(body, user) {
  if (!user) return { error: 'Unauthorized', status: 401 };
  const userId = user.id;
  const service_type = body.service_type || '';
  if (service_type === 'flights') return { error: 'Points cannot be used on flights', status: 400 };

  const pointsToRedeem = Math.floor(Number(body.points_to_redeem));
  const booking_ref    = body.booking_ref || '';
  if (!pointsToRedeem || pointsToRedeem <= 0) return { error: 'Invalid points amount', status: 400 };

  /* Check balance server-side */
  const rows = await dbSelect('user_points', `user_id=eq.${userId}&select=available_points`);
  const available = rows[0]?.available_points || 0;
  if (available < pointsToRedeem) return { error: 'Insufficient points', status: 400 };

  /* Atomic deduct */
  await atomicAddPoints(userId, -pointsToRedeem, false);

  await dbInsert('point_transactions', {
    user_id:      userId,
    type:         'redeem',
    points:       -pointsToRedeem,
    amount_kes:   pointsToRedeem,
    service_type,
    booking_ref,
    description:  `Redeemed ${pointsToRedeem} pts = KES ${pointsToRedeem}`,
  });

  return { ok: true, value_kes: pointsToRedeem, new_balance: available - pointsToRedeem };
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

  /* Compute real available balance: confirmed earnings minus pending/paid withdrawals */
  const [earnings, withdrawals] = await Promise.all([
    dbSelect('referral_earnings', `referrer_id=eq.${userId}&status=eq.confirmed&select=commission_kes`),
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
   Idempotent — create a referral_code row for a user if none exists.
   Auth: user's own bearer token. Ignores body.user_id — always uses token uid. */
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
      /* collision — loop */
    }
  }
  return { error: 'Could not generate a unique code', status: 500 };
}

/* stats
   Auth: user's own bearer token. Returns dashboard totals net of withdrawals. */
async function actionStats(body, user) {
  if (!user) return { error: 'Unauthorized', status: 401 };
  const userId = user.id;

  const [earnings, withdrawals, points, referralCount] = await Promise.all([
    dbSelect('referral_earnings', `referrer_id=eq.${userId}&status=eq.confirmed&select=commission_kes`),
    dbSelect('referral_withdrawals', `user_id=eq.${userId}&status=in.(pending,paid)&select=amount_kes`),
    dbSelect('user_points', `user_id=eq.${userId}&select=available_points,lifetime_points`),
    dbSelect('referrals', `referrer_id=eq.${userId}&select=id`),
  ]);

  const totalEarned    = earnings.reduce((s, e) => s + parseFloat(e.commission_kes || 0), 0);
  const totalWithdrawn = withdrawals.reduce((s, w) => s + parseFloat(w.amount_kes  || 0), 0);

  return {
    ok:              true,
    total_earned_kes: parseFloat(totalEarned.toFixed(2)),
    withdrawn_kes:    parseFloat(totalWithdrawn.toFixed(2)),
    available_kes:    parseFloat((totalEarned - totalWithdrawn).toFixed(2)),
    available_points: points[0]?.available_points  || 0,
    lifetime_points:  points[0]?.lifetime_points   || 0,
    referral_count:   referralCount.length,
  };
}

/* ════════════════════════════════════════════════════════════════
   HANDLER
════════════════════════════════════════════════════════════════ */
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'POST only' });

  try {
    const body   = req.body || {};
    const action = body.action;
    if (!action) return res.status(400).json({ error: 'action required' });

    /* award doesn't need a user token — it's internal-secret-gated */
    const user = action === 'award' ? null : await authedUser(req);

    let result;
    switch (action) {
      case 'record-referral': result = await actionRecordReferral(body, user); break;
      case 'award':           result = await actionAward(body, req);           break;
      case 'redeem-points':   result = await actionRedeemPoints(body, user);   break;
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
