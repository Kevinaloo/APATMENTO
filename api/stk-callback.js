/* ══════════════════════════════════════════════════════════════
   APATMENTO — PayHero Callback Receiver
   Vercel Serverless Function (api/stk-callback.js)
   Called at: /api/stk-callback
   PayHero POSTs here when guest completes/fails M-Pesa payment

   FIX (2025-08): supabaseUrl / serviceKey moved to top of try{}
   so BAL- handler can use them without a TDZ ReferenceError.
══════════════════════════════════════════════════════════════ */

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

    // ── Normalise PayHero's response shape ──────────────────────────
    // PayHero sends: { status, external_reference, ... }
    // Some versions nest under response: { response: { ResultCode, ... } }
    const status            = payload.status   || payload.response?.ResultCode;
    const externalReference = payload.external_reference
                           || payload.response?.external_reference
                           || payload.CheckoutRequestID; // safety fallback
    const isSuccess         = status === 'SUCCESS' || status === 0 || status === '0';

    if (!externalReference) {
      console.warn('No external_reference in callback payload:', JSON.stringify(payload));
      return res.status(200).json({ received: true });
    }

    // ── Declare Supabase creds at top of try{} ──────────────────────
    // CRITICAL: must be declared before any branch that uses them
    // (previously declared after the BAL- block → TDZ ReferenceError)
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      console.error('[stk-callback] Supabase env vars missing');
      return res.status(200).json({ received: true, error: 'config_missing' });
    }

    // ── Route by reference prefix ────────────────────────────────────
    let table = null;
    if (externalReference.startsWith('TOUR-'))   table = 'tour_bookings';
    if (externalReference.startsWith('EVENT-'))  table = 'event_tickets';
    if (externalReference.startsWith('APT-'))    table = 'apartment_bookings';

    // Payout callbacks — not a booking, nothing to update
    if (externalReference.startsWith('PAYOUT-')) {
      console.log('[stk-callback] Payout callback received — ignoring');
      return res.status(200).json({ received: true, type: 'payout' });
    }

    // ── Balance payment (BAL- prefix) ───────────────────────────────
    // Guest is paying the remaining balance on an existing booking
    if (externalReference.startsWith('BAL-')) {
      if (isSuccess) {
        const balRes = await fetch(
          `${supabaseUrl}/rest/v1/apartment_bookings?balance_reference=eq.${externalReference}`,
          {
            method: 'PATCH',
            headers: {
              apikey:         serviceKey,
              Authorization:  `Bearer ${serviceKey}`,
              'Content-Type': 'application/json',
              Prefer:         'return=representation',
            },
            body: JSON.stringify({
              balance_paid:    true,
              balance_paid_at: new Date().toISOString(),
              status:          'paid_pending_checkin',
            }),
          }
        );
        const balRows = balRes.ok ? (await balRes.json().catch(() => [])) : [];
        if (balRows[0]?.guest_id) {
          fetch(`${siteOrigin(req)}/api/push-send`, {
            method:  'POST',
            headers: {
              'Content-Type':   'application/json',
              'x-admin-secret': process.env.PUSH_ADMIN_SECRET || '',
            },
            body: JSON.stringify({
              user_id: balRows[0].guest_id,
              persist: true,
              title:   'Balance paid! ✅',
              body:    'Your balance payment is confirmed. You\'re all set for check-in.',
              url:     '/my-bookings.html',
              kind:    'booking',
            }),
          }).catch(e => console.warn('[notif] balance push failed (non-fatal):', e.message));
        }
      }
      return res.status(200).json({ received: true, type: 'balance', success: isSuccess });
    }

    if (!table) {
      console.warn('[stk-callback] Unrecognised reference prefix:', externalReference);
      return res.status(200).json({ received: true });
    }

    const newStatus = isSuccess ? 'paid_pending_checkin' : 'failed';

    // ── Update booking status ────────────────────────────────────────
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
      console.error('[stk-callback] Supabase update failed:', errText);
    } else {
      try { rows = await updateRes.json(); } catch { /* empty body */ }
    }

    // ── Guest push notification ──────────────────────────────────────
    if (rows[0]?.guest_id) {
      const guestId = rows[0].guest_id;
      const origin  = siteOrigin(req);

      const serviceLabel = table === 'apartment_bookings' ? 'stay'
                         : table === 'tour_bookings'      ? 'tour'
                         : 'ticket';

      const notifPayload = isSuccess ? {
        title: 'Booking confirmed! 🎉',
        body:  `Your ${serviceLabel} is locked in. Your check-in code is ready.`,
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
          'Content-Type':   'application/json',
          'x-admin-secret': process.env.PUSH_ADMIN_SECRET || '',
        },
        body: JSON.stringify({ user_id: guestId, persist: true, ...notifPayload }),
      }).catch(e => console.warn('[notif] push failed (non-fatal):', e.message));
    }

    // ── Rewards: points + referral commission ────────────────────────
    if (isSuccess && rows[0]?.guest_id) {
      const b           = rows[0];
      const serviceType = table === 'apartment_bookings' ? 'stays'
                        : table === 'tour_bookings'      ? 'tours'
                        : 'events';
      const grossAmount = Number(b.grand_total || b.total_amount || b.amount || 0);

      fetch(`${siteOrigin(req)}/api/rewards`, {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-internal-secret': process.env.INTERNAL_API_SECRET || '',
        },
        body: JSON.stringify({
          action:       'award',
          booking_ref:  externalReference,
          guest_id:     b.guest_id,
          service_type: serviceType,
          gross_amount: grossAmount,
        }),
      }).then(r => r.json())
        .then(j => console.log('[rewards] award:', j))
        .catch(e => console.warn('[rewards] award failed (non-fatal):', e.message));
    }

    // ── Agent attribution (apartments only) ─────────────────────────
    if (isSuccess && table === 'apartment_bookings' && rows[0]) {
      const b = rows[0];
      try {
        const r = await fetch(`${siteOrigin(req)}/api/agents?action=attribute`, {
          method: 'POST',
          headers: {
            'Content-Type':      'application/json',
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

    // ── Host notification ────────────────────────────────────────────
    if (isSuccess && table === 'apartment_bookings' && rows[0]?.apartment_id) {
      const b      = rows[0];
      const origin = siteOrigin(req);
      try {
        const lRes = await fetch(
          `${supabaseUrl}/rest/v1/listings?id=eq.${b.listing_id || b.apartment_id}&select=partner_id,title`,
          { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
        );
        const listings = lRes.ok ? await lRes.json() : [];
        if (listings[0]?.partner_id) {
          fetch(`${origin}/api/push-send`, {
            method:  'POST',
            headers: {
              'Content-Type':   'application/json',
              'x-admin-secret': process.env.PUSH_ADMIN_SECRET || '',
            },
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
    console.error('[stk-callback] Unhandled error:', err);
    // Always 200 to PayHero — never trigger a retry on our error
    return res.status(200).json({ received: true, error: err.message });
  }
}
