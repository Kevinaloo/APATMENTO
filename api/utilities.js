/* ════════════════════════════════════════════════════════════════
   APATMENTO  ·  Utilities  /api/utilities.js
   Routes: ?action=close-bookings | welcome-email | indexnow
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
import { settlementOf, endDayOf, todayNumber, PART_PAYMENT_TTL_HOURS }
  from './lib/_payment-rules.js';

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

/* ══════════════════════════════════════
   ROUTER
══════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   INDEX NOW  (merged from api/indexnow.js to stay under
   Vercel Hobby plan's 12-function limit)
══════════════════════════════════════════════════════════════ */
const INDEXNOW_HOST = 'cabana.africa';
const INDEXNOW_KEY  = 'cc18b1bc5dc43435c44f29f125a500f5';

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

    // Ping IndexNow (covers Google, Bing, Yandex simultaneously)
    const r = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: INDEXNOW_HOST,
        key: INDEXNOW_KEY,
        keyLocation: 'https://' + INDEXNOW_HOST + '/' + INDEXNOW_KEY + '.txt',
        urlList: batch,
      }),
    });

    // Also ping Bing directly for faster indexing
    const bing_ping = await fetch(
      `https://www.bing.com/indexnow?url=https://${INDEXNOW_HOST}/sitemap-index.xml&key=${INDEXNOW_KEY}`
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

export default async function handler(req, res) {
  const action = req.query?.action 
    || (typeof req.body === 'object' ? req.body?.action : null)
    || new URL(req.url || '/', 'http://x').searchParams.get('action')
    || '';

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

  if (action === 'close-bookings') {
    return handleCloseBookings(req, res);
  }

  if (action === 'welcome-email') {
    return handleWelcomeEmail(req, res);
  }

  if (action === 'indexnow') {
    return handleIndexNow(req, res);
  }

  return res.status(400).json({
    error: 'Unknown action. Available: geocode, close-bookings, welcome-email, indexnow',
  });
}
