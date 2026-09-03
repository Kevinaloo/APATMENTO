/* ════════════════════════════════════════════════════════════════
   APATMENTO  ·  Utilities  /api/utilities.js
   Routes: ?action=close-bookings | welcome-email | indexnow
           | reconcile-payments | geocode | atlas | sos-alert | carhire-terrain
   Consolidates small utility handlers into 1 function
════════════════════════════════════════════════════════════════ */
export const config = { maxDuration: 15 };

/* ══════════════════════════════════════════════════════════════
   CLOSE BOOKINGS  ·  the sweeper
   ──────────────────────────────────────────────────────────────
   Nothing in this system ever ended a booking. A stay whose dates
   had passed sat at 'paid_pending_checkin' forever, so the trip
   strip kept announcing it as "Happening today" weeks later and its
   check-in code stayed live indefinitely.

   Bookings do not end when someone looks at them. They end because
   the calendar moved. This runs nightly and moves each one to where
   the clock says it already is:

     checked_in            + checkout passed  ->  completed
     paid / part_paid      + checkout passed  ->  expired
     pending_payment       + checkout passed  ->  expired
     part_paid (unconfirmed, older than TTL)  ->  refund_due

   'expired' and 'refund_due' both mean money may be owed back, so
   they are recorded rather than silently deleted. A human settles
   them; this job only stops them pretending to be live.

   NOTE ON api/utilities?action=verify-checkin
   ──────────────────────────────────────────
   A second, older copy of the check-in verifier used to live here.
   It took no auth token, never checked that the caller was party to
   the booking, and never checked that the booking was paid: a POST
   with any known payment reference plus the host code marked a stay
   checked in and fired the M-Pesa payout. The real verifier
   (api/lib/_verify-checkin.js, routed via /api/verify-checkin) does
   all three. The copy is gone rather than patched: two implementations
   of the same money gate is how one of them ends up stale.
══════════════════════════════════════════════════════════════ */

import geocodeHandler from './lib/_geocode.js';
import atlasHandler from './lib/_atlas.js';
import sosHandler from './lib/_sos.js';
import terrainHandler from './lib/_carhire-terrain.js';
import { reconcilePayments } from './lib/_reconcile-payments.js';
import { settlementOf, endDayOf, todayNumber, PART_PAYMENT_TTL_HOURS,
         validateInstalment, depositRequired }
  from './lib/_payment-rules.js';
import { requireUser } from './lib/_security.js';
import { settleView }  from './lib/_poll-payment.js';
import { createOrder, captureOrder, fetchOrder, kesToUsd }
  from './lib/_paypal.js';

const SWEEPABLE = {
  apartment_bookings: 'checkin_date',
  tour_bookings:      'tour_date',
  event_tickets:      null,          /* no date column; skipped */
};

async function handleCloseBookings(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'supabase_not_configured' });
  }

  /* Vercel signs its own cron calls. Anything else needs the secret,
     so this cannot be used to mass-mutate bookings from outside. */
  const isVercelCron = Boolean(req.headers['x-vercel-cron']);
  const secret = req.headers['x-internal-secret'] || req.query?.secret || '';
  if (!isVercelCron && (!process.env.INTERNAL_API_SECRET
      || secret !== process.env.INTERNAL_API_SECRET)) {
    return res.status(403).json({ error: 'forbidden' });
  }

  const H = extra => ({ apikey: serviceKey,
                        Authorization: `Bearer ${serviceKey}`, ...extra });
  const today = todayNumber();
  const out   = {};

  for (const [table, dateCol] of Object.entries(SWEEPABLE)) {
    if (!dateCol) { out[table] = { skipped: 'no date column' }; continue; }

    /* Only rows that could still be open. A window of a year back
       keeps this cheap once the backlog is cleared. */
    const r = await fetch(
      `${supabaseUrl}/rest/v1/${table}`
        + `?status=in.(pending_payment,part_paid,confirmed_balance_due,`
        + `paid_pending_checkin,deposit_paid,checked_in)`
        + `&${dateCol}=not.is.null&select=*&limit=1000`,
      { headers: H() });

    if (!r.ok) { out[table] = { error: await r.text() }; continue; }

    const rows    = await r.json();
    const closed  = [];
    const refunds = [];

    for (const b of rows) {
      if (b.cancelled_at) continue;
      const end = endDayOf(b);
      if (end == null) continue;

      const s = settlementOf(b);

      if (today > end) {
        /* The dates are gone. Where it lands depends on whether the
           guest ever actually arrived. */
        const next = b.status === 'checked_in' ? 'completed' : 'expired';
        closed.push({ ref: b.payment_reference, from: b.status, to: next,
                      paid: s.paid, total: s.total });
        await patch(table, b, {
          status: next,
          closed_at: new Date().toISOString(),
          ...(next === 'expired' && s.paid > 0
              ? { refund_due: s.paid, refund_reason: 'stay_dates_passed_unsettled' }
              : {}),
        }, supabaseUrl, H);
        continue;
      }

      /* Money is being held against a booking that was never
         confirmed. That is a refund liability, not a booking. */
      if (s.paid > 0 && !s.confirmed) {
        const ageH = (Date.now() - Date.parse(b.created_at)) / 3600000;
        if (ageH > PART_PAYMENT_TTL_HOURS) {
          refunds.push({ ref: b.payment_reference, held: s.paid });
          await patch(table, b, {
            refund_due: s.paid,
            refund_reason: 'part_payment_never_confirmed',
          }, supabaseUrl, H);
        }
      }
    }

    out[table] = { scanned: rows.length, closed, refunds_flagged: refunds };
  }

  return res.status(200).json({ ok: true, ran_at: new Date().toISOString(), ...out });
}

/* Columns added by schema-bookings-lifecycle.sql. If that migration
   has not been run yet the write is retried without them, so the
   sweeper still closes bookings on an un-migrated database instead
   of failing outright every night. */
async function patch(table, row, body, supabaseUrl, H) {
  const url = `${supabaseUrl}/rest/v1/${table}?id=eq.${row.id}`;
  const send = payload => fetch(url, {
    method: 'PATCH',
    headers: H({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify(payload),
  });

  let r = await send(body);
  if (r.ok) return;

  const { closed_at, refund_due, refund_reason, ...core } = body;
  if (Object.keys(core).length) {
    r = await send(core);
    if (r.ok) return;
  }
  console.warn(`[close-bookings] ${table} ${row.id}:`, await r.text());
}

/* ══════════════════════════════════════
   WELCOME EMAIL (on registration)
══════════════════════════════════════ */
async function handleWelcomeEmail(req, res) {
  const RESEND_KEY = process.env.RESEND_API_KEY;
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }

  const { email, name = '' } = body || {};
  if (!email || !RESEND_KEY) return res.status(400).json({ error: 'Missing email or key' });

  const firstName = (name || '').split(' ')[0] || 'there';
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F7F8FC;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:linear-gradient(135deg,#4361FF,#7B2FF7);border-radius:20px;padding:40px 32px;text-align:center;margin-bottom:20px;">
      <div style="font-size:44px;margin-bottom:10px;">🎉</div>
      <h1 style="color:#fff;margin:0;font-size:28px;font-weight:800;letter-spacing:-0.5px;">Karibu, ${firstName}!</h1>
      <p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:15px;line-height:1.6;">Welcome to Apatmento. Kenya's zero-commission travel super-app</p>
    </div>
    <div style="background:#fff;border-radius:16px;padding:24px;margin-bottom:16px;">
      <h2 style="margin:0 0 16px;font-size:17px;font-weight:700;color:#0A0A14;">Here's what you can do right now:</h2>
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <div style="font-size:22px;">🏠</div>
          <div><strong style="font-size:14px;color:#0A0A14;">Book stays</strong><br><span style="font-size:13px;color:#636480;">Short-stay apartments across Nairobi &amp; Kenya. Pay only face value</span></div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <div style="font-size:22px;">🦁</div>
          <div><strong style="font-size:14px;color:#0A0A14;">Discover tours &amp; safaris</strong><br><span style="font-size:13px;color:#636480;">From Nairobi National Park to the Mara</span></div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <div style="font-size:22px;">💰</div>
          <div><strong style="font-size:14px;color:#0A0A14;">List &amp; earn 100%</strong><br><span style="font-size:13px;color:#636480;">Hosts keep everything. Zero commission, forever.</span></div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <div style="font-size:22px;">✦</div>
          <div><strong style="font-size:14px;color:#0A0A14;">Meet APA</strong><br><span style="font-size:13px;color:#636480;">Your AI concierge. Books anything in seconds, and cracks jokes while doing it</span></div>
        </div>
      </div>
    </div>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="https://cabana.africa/dashboard.html" style="display:inline-block;background:linear-gradient(135deg,#4361FF,#7B2FF7);color:#fff;text-decoration:none;padding:14px 36px;border-radius:100px;font-weight:700;font-size:15px;">Start Exploring →</a>
    </div>
    <div style="text-align:center;padding-top:16px;border-top:1px solid #E8E9F0;">
      <p style="font-size:12px;color:#8E90AD;margin:0;"><strong>Apatmento</strong>: Your World, One App</p>
    </div>
  </div>
</body></html>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Apatmento <welcome@cabana.africa>',
        to: [email],
        subject: `🎉 Karibu ${firstName}! Welcome to Apatmento`,
        html,
      }),
    });
    const ok = r.ok;
    if (!ok) console.error('Welcome email failed:', r.status, await r.text().catch(()=>''));
    return res.status(200).json({ ok });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

/* ══════════════════════════════════════════════════════════════
   PAYPAL  ·  create-order, capture, webhook
   ──────────────────────────────────────────────────────────────
   PayPal does not support KES. All amounts are converted to USD
   (PAYPAL_KES_TO_USD_RATE env var, default 130) with a 1 % buffer.

   Webhook events are verified by retrieval — we call
   GET /v2/checkout/orders/{id} to confirm the order is COMPLETED
   before marking anything paid. This avoids raw-body signature
   parsing which Vercel's pre-parsed JSON body makes impossible.
══════════════════════════════════════════════════════════════ */

const PP_REF_MAP = {
  'APT-':   { table: 'apartment_bookings', col: 'payment_reference' },
  'TOUR-':  { table: 'tour_bookings',      col: 'payment_reference' },
  'EVENT-': { table: 'event_tickets',      col: 'payment_reference' },
};

function ppResolveRef(ref) {
  const k = Object.keys(PP_REF_MAP).find(p => ref.startsWith(p));
  return k ? PP_REF_MAP[k] : null;
}

function ppHeaders(key, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

async function handlePaypalCreateOrder(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });

  const user = await requireUser(req, res);
  if (!user) return;

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey)
    return res.status(500).json({ error: 'supabase_not_configured' });
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET)
    return res.status(500).json({ error: 'paypal_not_configured' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }

  const { booking_ref, amount: requested } = body || {};
  if (!booking_ref) return res.status(400).json({ error: 'booking_ref required' });

  const bookingRef = String(booking_ref);
  const map = ppResolveRef(bookingRef);
  if (!map) return res.status(400).json({ error: 'Unrecognised booking reference prefix' });

  const H = extra => ppHeaders(serviceKey, extra);

  /* Load booking */
  const br = await fetch(
    `${supabaseUrl}/rest/v1/${map.table}?${map.col}=eq.${encodeURIComponent(bookingRef)}&select=*&limit=1`,
    { headers: H() });
  const booking = br.ok ? (await br.json())[0] : null;
  if (!booking) return res.status(404).json({ error: 'No booking matches this reference' });

  const owner = booking.guest_id || booking.user_id;
  if (!owner || owner !== user.id)
    return res.status(403).json({ error: 'not_your_booking' });

  /* Sum paid instalments */
  const lr = await fetch(
    `${supabaseUrl}/rest/v1/booking_payments?booking_ref=eq.${encodeURIComponent(bookingRef)}&status=eq.paid&select=amount`,
    { headers: H() });
  const amountPaid = lr.ok
    ? (await lr.json()).reduce((s, p) => s + Number(p.amount || 0), 0)
    : 0;

  const verdict = validateInstalment({
    requested,
    grandTotal:  Number(booking.grand_total || 0),
    amountPaid,
    paymentMode: booking.payment_mode,
  });
  if (!verdict.ok) {
    return res.status(422).json({
      error:            verdict.error,
      amount_paid:      amountPaid,
      grand_total:      Number(booking.grand_total || 0),
      deposit_required: depositRequired(Number(booking.grand_total || 0)),
    });
  }

  const chargeKes = verdict.amount;

  /* Create the PayPal order */
  let orderId, amountUsd;
  try {
    ({ orderId, amountUsd } = await createOrder({
      amountKes:   chargeKes,
      bookingRef,
      description: `Cabana Africa – ${bookingRef}`,
    }));
  } catch (e) {
    console.error('[paypal-create-order]', e.message);
    return res.status(502).json({ error: 'PayPal order creation failed', detail: e.message });
  }

  /* Record as pending in booking_payments */
  const payRef = `${bookingRef}-pp-${Date.now()}`;
  const ins = await fetch(`${supabaseUrl}/rest/v1/booking_payments`, {
    method:  'POST',
    headers: H({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify({
      booking_table:   map.table,
      booking_ref:     bookingRef,
      reference:       payRef,
      amount:          chargeKes,
      status:          'pending',
      payment_method:  'paypal',
      paypal_order_id: orderId,
    }),
  });
  if (!ins.ok) {
    const err = await ins.text();
    console.error('[paypal-create-order] ledger insert failed:', err);
    return res.status(500).json({ error: 'Could not record payment attempt' });
  }

  return res.status(200).json({
    ok:         true,
    order_id:   orderId,
    reference:  payRef,
    amount_kes: chargeKes,
    amount_usd: amountUsd,
    rate:       parseFloat(process.env.PAYPAL_KES_TO_USD_RATE || '130'),
  });
}

async function handlePaypalCapture(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });

  const user = await requireUser(req, res);
  if (!user) return;

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey)
    return res.status(500).json({ error: 'supabase_not_configured' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }

  const { order_id, reference } = body || {};
  if (!order_id || !reference)
    return res.status(400).json({ error: 'order_id and reference required' });

  const H = extra => ppHeaders(serviceKey, extra);

  /* Load ledger row */
  const lr = await fetch(
    `${supabaseUrl}/rest/v1/booking_payments?reference=eq.${encodeURIComponent(reference)}&select=*&limit=1`,
    { headers: H() });
  const ledger = lr.ok ? (await lr.json())[0] : null;
  if (!ledger) return res.status(404).json({ error: 'Unknown payment reference' });

  if (ledger.paypal_order_id !== order_id)
    return res.status(400).json({ error: 'order_id does not match this reference' });

  if (ledger.status === 'paid')
    return res.status(200).json({ ok: true, already_paid: true });

  if (ledger.status !== 'pending')
    return res.status(409).json({ error: `Payment is in terminal state: ${ledger.status}` });

  /* Capture the PayPal order */
  let captureData;
  try { captureData = await captureOrder(order_id); }
  catch (e) {
    console.error('[paypal-capture]', e.message);
    return res.status(502).json({ error: 'PayPal capture failed', detail: e.message });
  }

  const captureStatus = captureData.status;
  if (captureStatus !== 'COMPLETED') {
    console.warn('[paypal-capture] unexpected status:', captureStatus, order_id);
    return res.status(402).json({ error: 'Payment not completed', paypal_status: captureStatus });
  }

  const captureId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id || null;

  /* Mark as paid, guarded with status=eq.pending so concurrent writes are safe */
  await fetch(
    `${supabaseUrl}/rest/v1/booking_payments?reference=eq.${encodeURIComponent(reference)}&status=eq.pending`,
    {
      method:  'PATCH',
      headers: H({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
      body: JSON.stringify({
        status:            'paid',
        paypal_capture_id: captureId,
        paid_at:           new Date().toISOString(),
      }),
    });

  /* Update booking status (amount_paid mirrors, derived status, etc.) */
  const view = await settleView(supabaseUrl, H, ledger, { instalment: 'paid' });

  return res.status(200).json({ ok: true, capture_id: captureId, ...view });
}

async function handlePaypalWebhook(req, res) {
  /* Always 200 — PayPal retries on any other status. */
  if (req.method !== 'POST') return res.status(200).end();

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return res.status(200).end();

  let event;
  try { event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(200).end(); }

  const eventType = event?.event_type || '';
  const resource  = event?.resource   || {};

  /* The order ID lives at different paths depending on event type. */
  const orderId =
    resource?.supplementary_data?.related_ids?.order_id ||
    resource?.id ||
    null;

  if (!orderId) return res.status(200).json({ ignored: 'no_order_id' });

  const H = extra => ppHeaders(serviceKey, extra);

  /* Find the ledger row for this PayPal order */
  const lr = await fetch(
    `${supabaseUrl}/rest/v1/booking_payments?paypal_order_id=eq.${encodeURIComponent(orderId)}&select=*&limit=1`,
    { headers: H() });
  const ledger = lr.ok ? (await lr.json())[0] : null;
  if (!ledger) return res.status(200).json({ ignored: 'unknown_order' });

  if (eventType === 'PAYMENT.CAPTURE.DENIED' || eventType === 'CHECKOUT.ORDER.DECLINED') {
    if (ledger.status === 'pending') {
      await fetch(
        `${supabaseUrl}/rest/v1/booking_payments?reference=eq.${encodeURIComponent(ledger.reference)}&status=eq.pending`,
        {
          method:  'PATCH',
          headers: H({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
          body: JSON.stringify({ status: 'failed' }),
        });
    }
    return res.status(200).json({ ok: true, action: 'marked_failed' });
  }

  if (eventType !== 'PAYMENT.CAPTURE.COMPLETED' && eventType !== 'CHECKOUT.ORDER.APPROVED') {
    return res.status(200).json({ ignored: 'unhandled_event', event_type: eventType });
  }

  /* Already settled — idempotent */
  if (ledger.status === 'paid') return res.status(200).json({ ok: true, already_paid: true });

  /* Verify by retrieval — fetch the order from PayPal and confirm COMPLETED */
  let order;
  try { order = await fetchOrder(orderId); }
  catch (e) {
    console.error('[paypal-webhook] fetchOrder failed:', e.message);
    return res.status(200).json({ ok: false, error: 'could_not_verify' });
  }

  if (order.status !== 'COMPLETED') {
    return res.status(200).json({ ignored: 'order_not_completed', order_status: order.status });
  }

  const captureId = order.purchase_units?.[0]?.payments?.captures?.[0]?.id || null;

  await fetch(
    `${supabaseUrl}/rest/v1/booking_payments?reference=eq.${encodeURIComponent(ledger.reference)}&status=eq.pending`,
    {
      method:  'PATCH',
      headers: H({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
      body: JSON.stringify({
        status:            'paid',
        paypal_capture_id: captureId,
        paid_at:           new Date().toISOString(),
      }),
    });

  await settleView(supabaseUrl, H, ledger, {}).catch(e =>
    console.warn('[paypal-webhook] settleView:', e.message));

  return res.status(200).json({ ok: true, capture_id: captureId });
}

/* ══════════════════════════════════════
   ROUTER
══════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   INDEX NOW  (merged from api/indexnow.js to stay under
   Vercel Hobby plan's 12-function limit)
══════════════════════════════════════════════════════════════ */
const INDEXNOW_HOST = 'cabana.africa';

// All sitemaps to ping. Updated to include all location, global, deep and blog sitemaps
const ALL_SITEMAPS = [
  '/sitemap.xml',
  '/sitemap-locations.xml',
  '/sitemap-global.xml',
  '/sitemap-deep.xml',
  '/sitemap-blog.xml',
];

async function handleIndexNow(req, res) {
  try {
    const indexNowKey = String(process.env.INDEXNOW_KEY || '').trim();
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(indexNowKey)) {
      return res.status(503).json({ ok: false, error: 'indexnow_not_configured' });
    }

    let urls;
    const single = req.query?.url ? String(req.query.url) : null;

    if (single) {
      const path = single.startsWith('http') ? new URL(single).pathname : single;
      urls = ['https://' + INDEXNOW_HOST + (path.startsWith('/') ? path : '/' + path)];
    } else {
      // Fetch all sitemaps and collect every URL
      const allUrls = new Set();
      for (const sm_path of ALL_SITEMAPS) {
        try {
          const sm = await fetch('https://' + INDEXNOW_HOST + sm_path);
          if (!sm.ok) continue;
          const xml = await sm.text();
          const found = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
          found.forEach(u => allUrls.add(u));
        } catch(e) { /* skip failed sitemaps */ }
      }
      urls = [...allUrls];
      if (!urls.length) throw new Error('no <loc> entries across all sitemaps');
    }

    // IndexNow supports 10,000 URLs per batch max
    const batch = urls.slice(0, 10000);

    // IndexNow notifies participating search engines such as Bing and Yandex.
    const r = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: INDEXNOW_HOST,
        key: indexNowKey,
        keyLocation: 'https://' + INDEXNOW_HOST + '/' + indexNowKey + '.txt',
        urlList: batch,
      }),
    });

    // Also ping Bing directly for faster indexing
    const bing_ping = await fetch(
      `https://www.bing.com/indexnow?url=https://${INDEXNOW_HOST}/sitemap-index.xml&key=${indexNowKey}`
    ).catch(() => ({ status: 0 }));

    res.status(200).json({
      ok: r.status === 200 || r.status === 202,
      indexnow_status: r.status,
      bing_ping_status: bing_ping.status,
      submitted: batch.length,
      total_found: urls.length,
      sitemaps_checked: ALL_SITEMAPS.length,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err.message || err) });
  }
}

/* ══════════════════════════════════════════════════════════════
   RECONCILE PAYMENTS
   ──────────────────────────────────────────────────────────────
   Closes payment attempts nobody ever closed. See
   lib/_reconcile-payments.js for the rules and the reasoning about
   why a retired prompt cannot come back to life.

   ?dry=1 reports what it would do and writes nothing — run that
   first against the stranded backlog.
══════════════════════════════════════════════════════════════ */
async function handleReconcilePayments(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'supabase_not_configured' });
  }

  /* Same gate as close-bookings: Vercel signs its own cron calls,
     anything else needs the secret. This moves money state. */
  const isVercelCron = Boolean(req.headers['x-vercel-cron']);
  const secret = req.headers['x-internal-secret'] || req.query?.secret || '';
  if (!isVercelCron && (!process.env.INTERNAL_API_SECRET
      || secret !== process.env.INTERNAL_API_SECRET)) {
    return res.status(403).json({ error: 'forbidden' });
  }

  const dryRun = req.query?.dry === '1' || req.query?.dry === 'true';

  try {
    const result = await reconcilePayments({ supabaseUrl, serviceKey, dryRun });
    return res.status(result.error ? 500 : 200).json(result);
  } catch (err) {
    console.error('[reconcile-payments]', err);
    return res.status(500).json({ error: 'reconcile_failed', detail: String(err.message || err) });
  }
}

/* ══════════════════════════════════════════════════════════════
   NEWSLETTER SIGNUP
   Public subscription endpoint for Cabana travel updates and deals
══════════════════════════════════════════════════════════════ */
async function handleSubscribe(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch {
    return res.status(400).json({ ok: false, error: 'invalid_json' });
  }

  const emailRaw = body.email || '';
  const email = String(emailRaw).trim().toLowerCase();

  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  if (!email || !emailRegex.test(email) || email.length > 254) {
    return res.status(400).json({
      ok: false,
      error: 'invalid_email',
      message: 'Please provide a valid email address.'
    });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error('[newsletter] Supabase server credentials are not configured');
    return res.status(503).json({
      ok: false,
      error: 'subscription_unavailable',
      message: 'Subscriptions are temporarily unavailable. Please try again shortly.'
    });
  }

  const source = String(body.source || 'footer')
    .trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 80) || 'footer';
  const now = new Date().toISOString();

  try {
    const dbResponse = await fetch(
      `${supabaseUrl}/rest/v1/newsletter_subscribers?on_conflict=email`,
      {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify({
          email,
          source,
          subscribed_at: now,
          updated_at: now,
          unsubscribed_at: null
        })
      }
    );

    if (!dbResponse.ok) {
      const detail = await dbResponse.text().catch(() => '');
      console.error('[newsletter] Supabase rejected subscription', dbResponse.status, detail.slice(0, 300));
      return res.status(503).json({
        ok: false,
        error: 'subscription_not_saved',
        message: 'We could not save your subscription. Please try again.'
      });
    }
  } catch (err) {
    console.error('[newsletter] Supabase request failed', err?.message || err);
    return res.status(503).json({
      ok: false,
      error: 'subscription_not_saved',
      message: 'We could not save your subscription. Please try again.'
    });
  }

  return res.status(200).json({
    ok: true,
    email,
    message: "You're subscribed! We'll keep you posted on the latest travel updates and deals."
  });
}

export default async function handler(req, res) {
  const action = req.query?.action 
    || (typeof req.body === 'object' ? req.body?.action : null)
    || new URL(req.url || '/', 'http://x').searchParams.get('action')
    || '';

  if (action === 'subscribe' || action === 'newsletter') {
    return handleSubscribe(req, res);
  }

  /* Deliberately gone. /api/verify-checkin (→ api/lib/_verify-checkin.js)
     is the only check-in verifier; see the note above handleCloseBookings.
     A 410 rather than a 404 so any stale caller is told it moved. */
  if (action === 'verify-checkin') {
    return res.status(410).json({
      error: 'moved',
      use: 'POST /api/verify-checkin with an Authorization bearer token',
    });
  }

  /* Geocoder — reads req.query directly (q=, lat=, lng=, health=) so
     it is passed the live req/res unchanged. The ?action=geocode wrapper
     is consumed here before the handler sees the query string. */
  if (action === 'geocode') {
    return geocodeHandler(req, res);
  }

  /* Live map inventory. Public, cacheable, no auth — it says only what
     is already for sale on the site. */
  if (action === 'atlas') {
    return atlasHandler(req, res);
  }

  /* SOS. Highest-priority path in this file: someone pressed the
     emergency button. Handled before any of the housekeeping actions
     below and never cached. */
  if (action === 'sos-alert') {
    return sosHandler(req, res);
  }

  /* Car hire terrain reasoning. Reads req.query directly (lat=, lng=,
     label=, date=), same convention as the geocoder above. */
  if (action === 'carhire-terrain') {
    return terrainHandler(req, res);
  }

  if (action === 'close-bookings') {
    return handleCloseBookings(req, res);
  }

  if (action === 'welcome-email') {
    return handleWelcomeEmail(req, res);
  }

  if (action === 'indexnow') {
    return handleIndexNow(req, res);
  }

  if (action === 'reconcile-payments') {
    return handleReconcilePayments(req, res);
  }

  if (action === 'paypal-create-order') {
    return handlePaypalCreateOrder(req, res);
  }

  if (action === 'paypal-capture') {
    return handlePaypalCapture(req, res);
  }

  if (action === 'paypal-webhook') {
    return handlePaypalWebhook(req, res);
  }

  return res.status(400).json({
    error: 'Unknown action. Available: subscribe, geocode, atlas, sos-alert, carhire-terrain, '
         + 'close-bookings, welcome-email, indexnow, reconcile-payments, paypal-create-order, '
         + 'paypal-capture, paypal-webhook',
  });
}
