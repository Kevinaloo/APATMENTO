/* ══════════════════════════════════════════════════════════════
   APATMENTO — PayHero STK Push Initiator
   Vercel Serverless Function (api/stk-push.js)

   Env vars:
     PAYHERO_USERNAME / PAYHERO_PASSWORD / PAYHERO_CHANNEL_ID
     PAYHERO_CALLBACK_TOKEN     — proves a callback is genuine
     SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
     MIN_TXN_KES                — optional, default 50

   The guest may name any amount, but the SERVER decides whether it is
   allowed and what actually gets charged (see _payment-rules.js). The
   browser can no longer dictate a price: it proposes, the server
   disposes, and every attempt is written to the booking_payments ledger
   under its own unique reference so instalments can accumulate.
══════════════════════════════════════════════════════════════ */

import { validateInstalment, depositRequired } from './lib/_payment-rules.js';
import { pollPayment } from './lib/_poll-payment.js';

const PAYHERO_URL   = 'https://backend.payhero.co.ke/api/v2/payments';
const FETCH_TIMEOUT = 12000;

const REF_MAP = {
  'APT-':   { table: 'apartment_bookings', col: 'payment_reference' },
  'TOUR-':  { table: 'tour_bookings',      col: 'payment_reference' },
  'EVENT-': { table: 'event_tickets',      col: 'payment_reference' },
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

function sbHeaders(key, extra = {}) {
  return { apikey: key, Authorization: 'Bearer ' + key, ...extra };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  /* Payment status polling lives here rather than in its own file: the
     Hobby plan caps a deployment at 12 Serverless Functions and this
     project is at the ceiling. Same PayHero credentials, same domain,
     so co-locating costs nothing. Reached via GET /api/poll-payment,
     which vercel.json rewrites to /api/stk-push?action=poll. */
  if (req.method === 'GET' || (req.query && req.query.action === 'poll')) {
    return pollPayment(req, res);
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { phone, reference, description, amount: requested } = req.body || {};

    if (!phone || !reference) {
      return res.status(400).json({ error: 'Missing required fields: phone, reference' });
    }

    // ── Phone → 254XXXXXXXXX ────────────────────────────────────────
    let msisdn = String(phone).replace(/[\s\-().+]/g, '');
    if (msisdn.startsWith('254'))    { /* canonical */ }
    else if (msisdn.startsWith('0')) { msisdn = '254' + msisdn.slice(1); }
    else if (/^[71]/.test(msisdn))   { msisdn = '254' + msisdn; }

    if (!/^254[71]\d{8}$/.test(msisdn)) {
      return res.status(400).json({
        error: 'Invalid phone number. Use format: 07XX XXX XXX or 254XXXXXXXXX',
      });
    }

    // ── Config ───────────────────────────────────────────────────────
    const username    = process.env.PAYHERO_USERNAME;
    const password    = process.env.PAYHERO_PASSWORD;
    const channelId   = process.env.PAYHERO_CHANNEL_ID;
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!username || !password || !channelId) {
      console.error('[stk-push] Missing PayHero env vars');
      return res.status(500).json({ error: 'PayHero credentials not configured on server' });
    }
    const parsedChannelId = parseInt(String(channelId).trim(), 10);
    if (isNaN(parsedChannelId)) {
      return res.status(500).json({ error: 'PAYHERO_CHANNEL_ID is not a valid integer' });
    }
    if (!supabaseUrl || !serviceKey) {
      console.error('[stk-push] Supabase not configured; cannot verify amount');
      return res.status(500).json({ error: 'Payment verification unavailable' });
    }

    const bookingRef = String(reference);
    const map        = resolveRef(bookingRef);
    if (!map) {
      console.error('[stk-push] Unrecognised reference prefix:', bookingRef);
      return res.status(400).json({ error: 'Unrecognised payment reference' });
    }

    // ── Load the booking (one retry for read-after-write lag) ────────
    let booking = null;
    for (let i = 0; i < 2 && !booking; i++) {
      if (i) await new Promise(r => setTimeout(r, 600));
      try {
        const r = await fetchWithTimeout(
          `${supabaseUrl}/rest/v1/${map.table}?${map.col}=eq.${encodeURIComponent(bookingRef)}&select=*&limit=1`,
          { headers: sbHeaders(serviceKey) }, 6000);
        if (r.ok) { const rows = await r.json(); booking = rows && rows[0]; }
      } catch (e) { console.error('[stk-push] booking lookup:', e.message); }
    }
    if (!booking) {
      return res.status(404).json({ error: 'No booking matches this reference' });
    }

    // ── Authoritative running total, summed from the ledger ─────────
    let amountPaid = 0;
    try {
      const r = await fetchWithTimeout(
        `${supabaseUrl}/rest/v1/booking_payments`
          + `?booking_ref=eq.${encodeURIComponent(bookingRef)}&status=eq.paid&select=amount`,
        { headers: sbHeaders(serviceKey) }, 6000);
      if (r.ok) {
        const paidRows = await r.json();
        amountPaid = (paidRows || []).reduce((s, p) => s + Number(p.amount || 0), 0);
      }
    } catch (e) { console.warn('[stk-push] ledger sum failed:', e.message); }

    const grandTotal = Number(booking.grand_total || 0);

    // ── Decide what may actually be charged ─────────────────────────
    const verdict = validateInstalment({
      requested,
      grandTotal,
      amountPaid,
      paymentMode: booking.payment_mode,
    });

    if (!verdict.ok) {
      return res.status(422).json({
        error: verdict.error,
        amount_paid: amountPaid,
        grand_total: grandTotal,
        deposit_required: depositRequired(grandTotal),
      });
    }

    const chargeAmount = verdict.amount;

    /* Each instalment needs its own unique reference — PayHero and our
       idempotency both key on it, so reusing the booking reference would
       make the second payment collide with the first. */
    let seq = 1;
    try {
      const r = await fetchWithTimeout(
        `${supabaseUrl}/rest/v1/booking_payments`
          + `?booking_ref=eq.${encodeURIComponent(bookingRef)}&select=id`,
        { headers: sbHeaders(serviceKey) }, 6000);
      if (r.ok) seq = ((await r.json()) || []).length + 1;
    } catch (e) { seq = Date.now() % 100000; }

    const payRef = `${bookingRef}-P${seq}`;

    // ── Write the ledger row BEFORE pushing ─────────────────────────
    const ledgerRes = await fetchWithTimeout(`${supabaseUrl}/rest/v1/booking_payments`, {
      method: 'POST',
      headers: sbHeaders(serviceKey, {
        'Content-Type': 'application/json', Prefer: 'return=representation',
      }),
      body: JSON.stringify({
        booking_table: map.table, booking_ref: bookingRef,
        reference: payRef, amount: chargeAmount,
        status: 'pending', phone: msisdn,
      }),
    });
    if (!ledgerRes.ok) {
      console.error('[stk-push] ledger insert failed:', await ledgerRes.text());
      return res.status(500).json({ error: 'Could not record payment attempt' });
    }

    /* PRIMARY callback → Supabase Edge Function (payhero-callback).
       WHY: All 6 test payments sat at status:pending because the Vercel
       /api/stk-callback was returning 500s and PayHero stops retrying
       after 3 failures. The Edge Function runs on Supabase infrastructure,
       always has the service role key, is co-located with the DB. */
    const supaProject = (supabaseUrl || 'https://gfwgbgdvxtocwhilrtdw.supabase.co')
      .replace('https://', '').split('.')[0];
    const token = process.env.PAYHERO_CALLBACK_TOKEN;
    let callbackUrl = `https://${supaProject}.supabase.co/functions/v1/payhero-callback`;
    if (token) callbackUrl += '?t=' + encodeURIComponent(token);

    console.log('[stk-push] charging', chargeAmount, 'of', grandTotal,
                '(paid so far', amountPaid + ')', 'ref', payRef);

    // ── Call PayHero ─────────────────────────────────────────────────
    let phRes;
    try {
      phRes = await fetchWithTimeout(PAYHERO_URL, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(username + ':' + password).toString('base64'),
          'Content-Type': 'application/json', Accept: 'application/json',
        },
        body: JSON.stringify({
          amount:             chargeAmount,
          phone_number:       msisdn,
          channel_id:         parsedChannelId,
          provider:           'm-pesa',
          external_reference: payRef,
          callback_url:       callbackUrl,
          description:        description || 'Apatmento Booking',
        }),
      });
    } catch (e) {
      await markLedger(supabaseUrl, serviceKey, payRef, 'failed');
      const timedOut = e.name === 'AbortError';
      return res.status(504).json({
        error: timedOut
          ? 'PayHero timed out. If an M-Pesa prompt arrived, do not pay twice — check My Bookings.'
          : 'Could not reach PayHero. Please try again.',
      });
    }

    const rawText = await phRes.text();
    let data;
    try { data = JSON.parse(rawText); }
    catch {
      await markLedger(supabaseUrl, serviceKey, payRef, 'failed');
      return res.status(502).json({ error: 'PayHero returned a non-JSON response', raw: rawText.slice(0, 300) });
    }

    /* 201 Created on success; can also return 2xx with success:false. */
    if (!phRes.ok || data.success === false) {
      await markLedger(supabaseUrl, serviceKey, payRef, 'failed');
      const errMsg = data.message || data.error
        || (Array.isArray(data.errors) ? data.errors.join('; ') : null)
        || ('PayHero request failed (HTTP ' + phRes.status + ')');
      console.error('[stk-push] PayHero error:', errMsg, data);
      return res.status(phRes.ok ? 502 : phRes.status).json({ error: errMsg, details: data });
    }

    /* PayHero returns its OWN reference alongside CheckoutRequestID:
         {"success":true,"status":"QUEUED","reference":"E8UWT7CLUW",
          "CheckoutRequestID":"ws_CO_..."}
       /api/v2/transaction-status is indexed by that `reference`. Querying
       with our external_reference or the CheckoutRequestID both returned
       NOT_FOUND, which is why polling never resolved. Store it. */
    if (data.CheckoutRequestID || data.reference) {
      await markLedger(supabaseUrl, serviceKey, payRef, 'pending',
                       data.CheckoutRequestID, data.reference);
    }

    return res.status(200).json({
      success:          true,
      message:          'STK push sent — check your phone',
      reference:        payRef,
      booking_ref:      bookingRef,
      amount:           chargeAmount,
      amount_paid:      amountPaid,
      grand_total:      grandTotal,
      deposit_required: depositRequired(grandTotal),
      ...verdict.meta,
      payhero_response: data,
    });

  } catch (err) {
    console.error('[stk-push] Unhandled error:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}

async function markLedger(url, key, reference, status, checkoutId, payheroRef) {
  const body = { status };
  if (checkoutId) body.checkout_request_id = checkoutId;
  if (payheroRef) body.payhero_reference   = payheroRef;
  try {
    await fetchWithTimeout(
      `${url}/rest/v1/booking_payments?reference=eq.${encodeURIComponent(reference)}`,
      {
        method: 'PATCH',
        headers: sbHeaders(key, { 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
        body: JSON.stringify(body),
      }, 5000);
  } catch (e) { console.warn('[stk-push] markLedger failed:', e.message); }
}
