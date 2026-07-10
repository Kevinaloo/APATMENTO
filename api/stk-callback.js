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

    // Balance payment: BAL-{booking_id_slice}-{timestamp}
    // We patch balance_paid=true on the booking and stk-callback handles the rest
    if (externalReference.startsWith('BAL-')) {
      if (isSuccess) {
        await fetch(
          `${supabaseUrl}/rest/v1/apartment_bookings?balance_reference=eq.${externalReference}`,
          {
            method: 'PATCH',
            headers: {
              apikey: serviceKey, Authorization: `Bearer ${serviceKey}`,
              'Content-Type': 'application/json', Prefer: 'return=minimal',
            },
            body: JSON.stringify({
              balance_paid: true,
              balance_paid_at: new Date().toISOString(),
              status: 'paid_pending_checkin',
            }),
          }
        );
      }
      return res.status(200).json({ received: true, type: 'balance' });
    }

    if (!table) {
      console.warn('Unrecognised reference prefix:', externalReference);
      return res.status(200).json({ received: true });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
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

    /* ── Push / Realtime notifications ───────────────────────────────
       Fire after the DB write so the guest sees the final state.
       Fire-and-forget: a failed notification must never make PayHero
       think the callback failed and retry it.                        */
    if (rows[0]?.guest_id) {
      const guestId = rows[0].guest_id;
      const origin  = siteOrigin(req);

      const notifPayload = isSuccess ? {
        title: 'Booking confirmed! 🎉',
        body:  `Your ${table === 'apartment_bookings' ? 'stay'
               : table === 'tour_bookings' ? 'tour'
               : 'ticket'} is locked in. Your check-in code is ready.`,
        url:   '/my-bookings.html',
        kind:  'booking',
      } : {
        title: 'Payment failed',
        body:  'Your M-Pesa payment was not completed. Please try again.',
        url:   '/my-bookings.html',
        kind:  'general',
      };

      fetch(`${origin}/api/push-send`, {
        method:  'POST',
        headers: {
          'Content-Type':    'application/json',
          'x-admin-secret':  process.env.PUSH_ADMIN_SECRET || '',
        },
        body: JSON.stringify({ user_id: guestId, persist: true, ...notifPayload }),
      }).catch(e => console.warn('[notif] push failed (non-fatal):', e.message));
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

    /* ── Host notification for new confirmed bookings ─────────────────
       Look up the listing's partner_id and notify them. Only for
       apartment bookings where we know the listing_id.               */
    if (isSuccess && table === 'apartment_bookings' && rows[0]?.apartment_id) {
      const b        = rows[0];
      const supaUrl  = process.env.SUPABASE_URL;
      const svcKey   = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const origin   = siteOrigin(req);

      try {
        const lRes = await fetch(
          `${supaUrl}/rest/v1/listings?id=eq.${b.listing_id || b.apartment_id}&select=partner_id,title`,
          { headers: { apikey: svcKey, Authorization: `Bearer ${svcKey}` } }
        );
        const listings = lRes.ok ? await lRes.json() : [];
        if (listings[0]?.partner_id) {
          fetch(`${origin}/api/push-send`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-secret': process.env.PUSH_ADMIN_SECRET || '' },
            body: JSON.stringify({
              user_id: listings[0].partner_id,
              persist: true,
              title:   'New booking! 🏠',
              body:    `${b.guest_name || 'A guest'} just booked ${listings[0].title || 'your property'}`,
              url:     '/partner-bookings.html',
              kind:    'booking',
            }),
          }).catch(e => console.warn('[host-notif] non-fatal:', e.message));
        }
      } catch (e) {
        console.warn('[host-notif] lookup failed (non-fatal):', e.message);
      }
    }

    return res.status(200).json({ received: true, updated: updateRes.ok, status: newStatus });

  } catch (err) {
    console.error('Callback error:', err);
    return res.status(200).json({ received: true, error: err.message });
  }
}
