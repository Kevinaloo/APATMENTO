/* ════════════════════════════════════════════════════════════════
   APATMENTO  ·  Utilities  /api/utilities.js
   Routes: ?action=verify-checkin | ...
   Consolidates small utility handlers into 1 function
════════════════════════════════════════════════════════════════ */
export const config = { maxDuration: 15 };

/* ══════════════════════════════════════
   VERIFY CHECKIN
══════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════
   APATMENTO — Dual Check-In Code Verifier & Payout Release
   Vercel Serverless Function (api/verify-checkin.js)
   Called at: /api/verify-checkin

   POST body: { table, reference, role, code }
   role: 'guest' (submitting host's code) | 'host' (submitting guest's code)
   Once BOTH codes verified → status 'checked_in' → payout to host.
══════════════════════════════════════════════════════════════ */

async function handleVerifyCheckin(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { table, reference, role, code } = req.body;

    const allowedTables = ['apartment_bookings', 'tour_bookings', 'event_tickets'];
    if (!allowedTables.includes(table)) {
      return res.status(400).json({ error: 'Invalid table' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SERVICE_KEY;

    // Fetch the booking
    const fetchRes = await fetch(
      `${supabaseUrl}/rest/v1/${table}?payment_reference=eq.${encodeURIComponent(reference)}&select=*`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    const rows = await fetchRes.json();
    const booking = rows?.[0];

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (booking.status === 'checked_in') {
      return res.status(200).json({ success: true, status: 'already_checked_in' });
    }
    if (booking.status !== 'paid_pending_checkin') {
      return res.status(400).json({ error: 'Booking not in pending check-in state', status: booking.status });
    }

    // ── VERIFY CODE ──
    let updatePayload = {};
    let errorMsg = null;

    if (role === 'guest') {
      if (code.trim().toUpperCase() !== (booking.host_code || '').trim().toUpperCase()) {
        errorMsg = 'Incorrect host code. Please ask your host for their HOST-XXXXXX code.';
      } else {
        updatePayload.guest_verified = true;
      }
    } else if (role === 'host') {
      if (code.trim().toUpperCase() !== (booking.guest_code || '').trim().toUpperCase()) {
        errorMsg = 'Incorrect guest code. Please ask your guest for their GUEST-XXXXXX code.';
      } else {
        updatePayload.host_verified = true;
      }
    } else {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (errorMsg) return res.status(400).json({ error: errorMsg });

    // ── CHECK IF BOTH NOW VERIFIED ──
    const guestNowVerified = role === 'guest' ? true : booking.guest_verified;
    const hostNowVerified  = role === 'host'  ? true : booking.host_verified;
    const bothVerified = guestNowVerified && hostNowVerified;

    if (bothVerified) {
      updatePayload.status        = 'checked_in';
      updatePayload.checked_in_at = new Date().toISOString();
    }

    // ── UPDATE SUPABASE ──
    const updateRes = await fetch(
      `${supabaseUrl}/rest/v1/${table}?payment_reference=eq.${encodeURIComponent(reference)}`,
      {
        method:  'PATCH',
        headers: {
          apikey:         serviceKey,
          Authorization:  `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer:         'return=minimal',
        },
        body: JSON.stringify(updatePayload),
      }
    );

    if (!updateRes.ok) {
      const err = await updateRes.text();
      console.error('Supabase update error:', err);
      return res.status(500).json({ error: 'Failed to update booking' });
    }

    // ── IF BOTH VERIFIED — TRIGGER PAYOUT VIA PAYHERO ──
    if (bothVerified) {
      const netAmount = Number(booking.grand_total || 0) - Number(booking.service_fee || 0);
      const payoutPhone = booking.host_mpesa || booking.contact_phone;

      if (payoutPhone && netAmount > 0 && process.env.PAYHERO_USERNAME) {
        const authToken = Buffer.from(
          `${process.env.PAYHERO_USERNAME}:${process.env.PAYHERO_PASSWORD}`
        ).toString('base64');

        try {
          const payoutRes = await fetch(
            'https://backend.payhero.co.ke/api/v2/payments',
            {
              method:  'POST',
              headers: { Authorization: `Basic ${authToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                amount:             Math.round(netAmount),
                phone_number:       payoutPhone.replace(/^\+/, '').replace(/^0/, '254'),
                channel_id:         String(process.env.PAYHERO_CHANNEL_ID).trim(),
                provider:           'm-pesa',
                external_reference: `PAYOUT-${reference}`,
                callback_url:       `https://${req.headers.host}/api/stk-callback`,
              }),
            }
          );
          const payoutData = await payoutRes.json();
          console.log('Payout initiated:', JSON.stringify(payoutData));
        } catch (payoutErr) {
          console.error('Payout error (booking still checked in):', payoutErr.message);
        }
      }

      return res.status(200).json({
        success: true,
        status: 'checked_in',
        message: 'Both codes verified. Check-in confirmed. Payout released to host.',
        net_payout: netAmount,
      });
    }

    return res.status(200).json({
      success: true,
      status: role === 'guest' ? 'guest_verified' : 'host_verified',
      message: role === 'guest'
        ? 'Your code accepted. Waiting for host to enter your guest code.'
        : 'Guest code accepted. Waiting for guest to enter your host code.',
      waiting_for: role === 'guest' ? 'host_to_verify' : 'guest_to_verify',
    });

  } catch (err) {
    console.error('verify-checkin error:', err);
    return res.status(500).json({ error: err.message });
  }
}


/* ══════════════════════════════════════
   ROUTER
══════════════════════════════════════ */
export default async function handler(req, res) {
  const action = req.query?.action 
    || (typeof req.body === 'object' ? req.body?.action : null)
    || new URL(req.url || '/', 'http://x').searchParams.get('action')
    || '';

  if (action === 'verify-checkin') {
    return handleVerifyCheckin(req, res);
  }

  return res.status(400).json({ error: 'Unknown action. Available: verify-checkin' });
}
