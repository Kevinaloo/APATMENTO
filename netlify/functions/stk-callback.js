/* ══════════════════════════════════════════════════════════════
   APATMENTO — PayHero Callback Receiver
   Vercel Serverless Function (api/stk-callback.js)
   Called at: /api/stk-callback
   PayHero POSTs here when guest completes/fails M-Pesa payment
══════════════════════════════════════════════════════════════ */

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

    const updateRes = await fetch(
      `${supabaseUrl}/rest/v1/${table}?payment_reference=eq.${externalReference}`,
      {
        method:  'PATCH',
        headers: {
          apikey:         serviceKey,
          Authorization:  `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer:         'return=minimal',
        },
        body: JSON.stringify({ status: newStatus }),
      }
    );

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      console.error('Supabase update failed:', errText);
    }

    return res.status(200).json({ received: true, updated: updateRes.ok, status: newStatus });

  } catch (err) {
    console.error('Callback error:', err);
    return res.status(200).json({ received: true, error: err.message });
  }
}
