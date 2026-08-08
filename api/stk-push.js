/* ══════════════════════════════════════════════════════════════
   APATMENTO — PayHero STK Push Initiator
   Vercel Serverless Function (api/stk-push.js)
   Called at: /api/stk-push

   Environment variables required (set in Vercel Dashboard):
     PAYHERO_USERNAME          — API username from PayHero
     PAYHERO_PASSWORD          — API password from PayHero
     PAYHERO_CHANNEL_ID        — Channel ID from PayHero dashboard
     PAYHERO_CALLBACK_TOKEN    — random secret; proves a callback is genuine
     SUPABASE_URL              — required for server-side amount authority
     SUPABASE_SERVICE_ROLE_KEY

   SECURITY MODEL
   ──────────────
   The amount is NEVER taken from the client. The browser sends only a
   reference; the server looks up the booking row that reference points
   at and charges what the database says is owed. This closes two holes:

     1. A guest editing the request could otherwise pay KES 1 for a
        KES 3,000 stay — the callback would still have marked it paid.
     2. An unknown reference is now rejected outright, so this endpoint
        can no longer be used to blast STK prompts at arbitrary numbers.
        That matters: PayHero blocks a phone for 24h after 10 successive
        failed pushes, and throttles the account after 50 within 6h.
══════════════════════════════════════════════════════════════ */

const PAYHERO_URL   = 'https://backend.payhero.co.ke/api/v2/payments';
const FETCH_TIMEOUT = 12000;

/* Which table/column a reference prefix resolves to, and how the
   authoritative amount is derived from that row. */
const REF_MAP = {
  'APT-':   { table: 'apartment_bookings', col: 'payment_reference',
              amount: r => Number(r.payment_mode === 'deposit' ? r.deposit_amount : r.grand_total) },
  'BAL-':   { table: 'apartment_bookings', col: 'balance_reference',
              amount: r => Number(r.balance_amount) },
  'TOUR-':  { table: 'tour_bookings',      col: 'payment_reference',
              amount: r => Number(r.grand_total ?? r.total_amount ?? r.amount) },
  'EVENT-': { table: 'event_tickets',      col: 'payment_reference',
              amount: r => Number(r.grand_total ?? r.total_amount ?? r.amount) },
};

function resolveRef(reference) {
  const key = Object.keys(REF_MAP).find(p => reference.startsWith(p));
  return key ? REF_MAP[key] : null;
}

async function fetchWithTimeout(url, opts = {}, ms = FETCH_TIMEOUT) {
  const ac = new AbortController();
  const t  = setTimeout(() => ac.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ac.signal }); }
  finally { clearTimeout(t); }
}

/* Look up the booking this reference belongs to. One retry absorbs any
   read-after-write lag between the browser's INSERT and this call. */
async function loadBooking(map, reference, supabaseUrl, serviceKey) {
  const url = supabaseUrl + '/rest/v1/' + map.table
            + '?' + map.col + '=eq.' + encodeURIComponent(reference) + '&select=*&limit=1';
  const headers = { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey };

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, 600));
    try {
      const r = await fetchWithTimeout(url, { headers }, 6000);
      if (!r.ok) { console.error('[stk-push] booking lookup HTTP', r.status); continue; }
      const rows = await r.json();
      if (rows && rows[0]) return rows[0];
    } catch (e) {
      console.error('[stk-push] booking lookup error:', e.message);
    }
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { phone, reference, description } = req.body || {};
    const clientAmount = req.body ? req.body.amount : null;

    if (!phone || !reference) {
      return res.status(400).json({ error: 'Missing required fields: phone, reference' });
    }

    // ── Normalise phone → 254XXXXXXXXX ──────────────────────────────
    let normalizedPhone = String(phone).replace(/[\s\-().+]/g, '');
    if (normalizedPhone.startsWith('254'))    { /* already canonical */ }
    else if (normalizedPhone.startsWith('0')) { normalizedPhone = '254' + normalizedPhone.slice(1); }
    else if (/^[71]/.test(normalizedPhone))   { normalizedPhone = '254' + normalizedPhone; }

    if (!/^254[71]\d{8}$/.test(normalizedPhone)) {
      return res.status(400).json({
        error: 'Invalid phone number. Use format: 07XX XXX XXX or 254XXXXXXXXX',
      });
    }

    // ── Credentials ──────────────────────────────────────────────────
    const username  = process.env.PAYHERO_USERNAME;
    const password  = process.env.PAYHERO_PASSWORD;
    const channelId = process.env.PAYHERO_CHANNEL_ID;

    if (!username || !password || !channelId) {
      console.error('[stk-push] Missing PayHero env vars:', {
        hasUsername: !!username, hasPassword: !!password, hasChannelId: !!channelId,
      });
      return res.status(500).json({ error: 'PayHero credentials not configured on server' });
    }

    const parsedChannelId = parseInt(String(channelId).trim(), 10);
    if (isNaN(parsedChannelId)) {
      return res.status(500).json({ error: 'PAYHERO_CHANNEL_ID is not a valid integer' });
    }

    // ── Amount: the database decides, never the browser ──────────────
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const map         = resolveRef(String(reference));

    if (!map) {
      console.error('[stk-push] Unrecognised reference prefix:', reference);
      return res.status(400).json({ error: 'Unrecognised payment reference' });
    }

    if (!supabaseUrl || !serviceKey) {
      // Degraded mode — cannot verify. Refuse rather than trust the client.
      console.error('[stk-push] Supabase not configured; cannot verify amount');
      return res.status(500).json({ error: 'Payment verification unavailable' });
    }

    const booking = await loadBooking(map, String(reference), supabaseUrl, serviceKey);
    if (!booking) {
      console.error('[stk-push] No booking found for reference:', reference);
      return res.status(404).json({ error: 'No pending booking matches this reference' });
    }

    // Don't re-charge something already settled.
    if (['paid_pending_checkin', 'paid', 'completed'].indexOf(String(booking.status)) !== -1) {
      return res.status(409).json({ error: 'This booking is already paid' });
    }

    const parsedAmount = Math.round(map.amount(booking));
    if (!Number.isFinite(parsedAmount) || parsedAmount < 1) {
      console.error('[stk-push] Booking has no usable amount:', reference, booking.status);
      return res.status(422).json({ error: 'Booking amount is missing or invalid' });
    }

    if (clientAmount != null && Math.round(Number(clientAmount)) !== parsedAmount) {
      console.warn('[stk-push] AMOUNT MISMATCH — client said', clientAmount,
                   'but DB says', parsedAmount, 'for', reference, '· charging DB value');
    }

    // ── Callback URL (pinned + secret) ───────────────────────────────
    /* PayHero policy: production callbacks must point at a verified
       domain — *.vercel.app previews risk suspension. So this is pinned
       rather than derived from req.headers.host.
       The token makes the callback unforgeable: PayHero echoes back the
       exact URL registered here, so only genuine callbacks carry it. */
    const PRODUCTION_ORIGIN = process.env.PUBLIC_BASE_URL || 'https://www.apatmento.space';
    const callbackToken     = process.env.PAYHERO_CALLBACK_TOKEN;
    let   callbackUrl       = PRODUCTION_ORIGIN.replace(/\/+$/, '') + '/api/stk-callback';

    if (callbackToken) callbackUrl += '?t=' + encodeURIComponent(callbackToken);
    else console.warn('[stk-push] PAYHERO_CALLBACK_TOKEN unset — callbacks are UNAUTHENTICATED');

    if (/vercel\.app|ngrok|localhost|127\.0\.0\.1/i.test(callbackUrl)) {
      console.error('[stk-push] Refusing non-production callback URL:', callbackUrl);
      return res.status(500).json({
        error: 'Payment callback misconfigured. Set PUBLIC_BASE_URL to the production domain.',
      });
    }

    const payload = {
      amount:             parsedAmount,
      phone_number:       normalizedPhone,
      channel_id:         parsedChannelId,
      provider:           'm-pesa',
      external_reference: String(reference),
      callback_url:       callbackUrl,
      description:        description || 'Apatmento Booking',
    };

    console.log('[stk-push] Initiating payment:', {
      amount: parsedAmount, phone: normalizedPhone,
      reference: String(reference), channel: parsedChannelId,
    });

    // ── Call PayHero API ─────────────────────────────────────────────
    let payheroRes;
    try {
      payheroRes = await fetchWithTimeout(PAYHERO_URL, {
        method:  'POST',
        headers: {
          Authorization:  'Basic ' + Buffer.from(username + ':' + password).toString('base64'),
          'Content-Type': 'application/json',
          Accept:         'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      const timedOut = e.name === 'AbortError';
      console.error('[stk-push] PayHero unreachable:', e.message);
      return res.status(504).json({
        error: timedOut
          ? 'PayHero timed out. If an M-Pesa prompt arrived, do not pay twice — check My Bookings.'
          : 'Could not reach PayHero. Please try again.',
      });
    }

    const rawText = await payheroRes.text();
    console.log('[stk-push] PayHero status:', payheroRes.status, 'body:', rawText.slice(0, 500));

    let data;
    try { data = JSON.parse(rawText); }
    catch (e) {
      return res.status(502).json({
        error:       'PayHero returned a non-JSON response',
        raw:         rawText.slice(0, 300),
        http_status: payheroRes.status,
      });
    }

    /* PayHero returns 201 Created on success (res.ok covers 200–299),
       and can return 2xx with success:false — treat both as failure. */
    if (!payheroRes.ok || data.success === false) {
      const errMsg = data.message || data.error
        || (Array.isArray(data.errors) ? data.errors.join('; ') : null)
        || ('PayHero request failed (HTTP ' + payheroRes.status + ')');
      console.error('[stk-push] PayHero error:', errMsg, data);
      return res.status(payheroRes.ok ? 502 : payheroRes.status)
                .json({ error: errMsg, details: data, http_status: payheroRes.status });
    }

    /* Store the CheckoutRequestID for reconciliation. Fire-and-forget:
       if the column is absent this is a harmless no-op and payment is
       unaffected. */
    if (data.CheckoutRequestID) {
      fetchWithTimeout(
        supabaseUrl + '/rest/v1/' + map.table + '?' + map.col + '=eq.' + encodeURIComponent(reference),
        {
          method: 'PATCH',
          headers: {
            apikey: serviceKey, Authorization: 'Bearer ' + serviceKey,
            'Content-Type': 'application/json', Prefer: 'return=minimal',
          },
          body: JSON.stringify({ checkout_request_id: data.CheckoutRequestID }),
        }, 5000
      ).catch(e => console.warn('[stk-push] CheckoutRequestID not stored (non-fatal):', e.message));
    }

    return res.status(200).json({
      success:          true,
      message:          'STK push sent — check your phone',
      reference:        reference,
      amount:           parsedAmount,
      payhero_response: data,
    });

  } catch (err) {
    console.error('[stk-push] Unhandled error:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}
