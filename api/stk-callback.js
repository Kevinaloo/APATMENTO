/* ══════════════════════════════════════════════════════════════
   APATMENTO — PayHero Callback Receiver
   Vercel Serverless Function (api/stk-callback.js)
   Called at: /api/stk-callback
   PayHero POSTs here when guest completes/fails M-Pesa payment
══════════════════════════════════════════════════════════════ */

/* Vercel gives us the deployment host. Preferring it over a hard-coded
   domain means preview deployments attribute against themselves rather
   than reaching into production. */
function siteOrigin(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return host ? `${proto}://${host}` : 'https://www.apatmento.space';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const payload = req.body;
    console.log('PayHero callback received:', JSON.stringify(payload));

    const status            = payload.status || payload.response?.ResultCode;
    const externalReference = payload.external_reference || payload.response?.external_reference;
    const isSuccess         = status === 'SUCCESS' || status === 0 || status === '0';

    if (!externalReference) {
      console.warn('No external_reference in callback');
      return res.status(200).json({ received: true });
    }

    let table = null;
    if (externalReference.startsWith('TOUR-'))   table = 'tour_bookings';
    if (externalReference.startsWith('EVENT-'))  table = 'event_tickets';
    if (externalReference.startsWith('APT-'))    table = 'apartment_bookings';
    // Payout callbacks — don't update booking status
    if (externalReference.startsWith('PAYOUT-')) return res.status(200).json({ received: true });

    if (!table) {
      console.warn('Unrecognised reference prefix:', externalReference);
      return res.status(200).json({ received: true });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SERVICE_KEY;
    const newStatus   = isSuccess ? 'paid_pending_checkin' : 'failed';

    /* Ask for the row back. We need it to attribute the booking to an
       agent, and a second round-trip to fetch it would be wasteful and
       would open a window where the row could change under us. */
    const updateRes = await fetch(
      `${supabaseUrl}/rest/v1/${table}?payment_reference=eq.${externalReference}`,
      {
        method:  'PATCH',
        headers: {
          apikey:         serviceKey,
          Authorization:  `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer:         'return=representation',
        },
        body: JSON.stringify({ status: newStatus }),
      }
    );

    let rows = [];
    if (!updateRes.ok) {
      const errText = await updateRes.text();
      console.error('Supabase update failed:', errText);
    } else {
      try { rows = await updateRes.json(); } catch { /* minimal body */ }
    }

    /* ── Agent attribution ────────────────────────────────────────────
       Money has actually moved. Only now does a referral convert.
       Doing this at booking creation would pay commission on abandoned
       carts; doing it here means the agent is paid for a real stay.

       Apartments only — agents represent listings, not tours or events.
       Never throws: a failed attribution must not make PayHero retry a
       callback we have already honoured.                              */
    if (isSuccess && table === 'apartment_bookings' && rows[0]) {
      const b = rows[0];
      try {
        const r = await fetch(`${siteOrigin(req)}/api/agents?action=attribute`, {
          method: 'POST',
          headers: {
            'Content-Type':     'application/json',
            'x-internal-secret': process.env.INTERNAL_API_SECRET || '',
          },
          body: JSON.stringify({
            listing_id:  String(b.apartment_id),
            booking_ref: externalReference,
            gross:       Number(b.grand_total),
            guest_id:    b.guest_id || null,
          }),
        });
        const j = await r.json().catch(() => ({}));
        if (j?.attributed) {
          console.log('[attribute]', externalReference, '→', j.agent_name, j.commission);
        }
      } catch (e) {
        console.error('[attribute] failed, booking is still valid:', e.message);
      }
    }

    return res.status(200).json({ received: true, updated: updateRes.ok, status: newStatus });

  } catch (err) {
    console.error('Callback error:', err);
    return res.status(200).json({ received: true, error: err.message });
  }
}
