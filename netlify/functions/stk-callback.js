/* ══════════════════════════════════════════════════════════════
   APATMENTO — PayHero STK Push Callback Receiver
   Netlify Function (serverless backend)

   PayHero calls THIS endpoint automatically once the customer
   completes (or cancels/fails) the M-Pesa STK push on their phone.

   This function:
   1. Receives the payment result from PayHero
   2. Updates the matching booking row in Supabase to 'paid' or 'failed'

   Required environment variables (same as stk-push.js):
     SUPABASE_URL
     SUPABASE_SERVICE_KEY   (service_role key — has write access, bypasses RLS)
══════════════════════════════════════════════════════════════ */

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const payload = JSON.parse(event.body);
    console.log('PayHero callback received:', JSON.stringify(payload));

    // PayHero's callback payload typically includes a status field and
    // the external_reference we originally sent (our booking reference).
    // Exact field names should be verified against your PayHero dashboard
    // logs on the first real transaction — adjust below if needed.
    const status            = payload.status || payload.response?.ResultCode;
    const externalReference = payload.external_reference || payload.response?.external_reference;
    const isSuccess = status === 'SUCCESS' || status === 0 || status === '0';

    if (!externalReference) {
      console.warn('No external_reference in callback payload');
      return { statusCode: 200, body: JSON.stringify({ received: true }) };
    }

    // ── DETERMINE WHICH TABLE TO UPDATE BASED ON REFERENCE PREFIX ──
    // We prefix references like "TOUR-..." / "EVENT-..." / "APT-..." when
    // initiating the STK push, so we know which table to update here.
    let table = null;
    if (externalReference.startsWith('TOUR-'))  table = 'tour_bookings';
    if (externalReference.startsWith('EVENT-')) table = 'event_tickets';
    if (externalReference.startsWith('APT-'))   table = 'apartment_bookings';

    if (!table) {
      console.warn('Unrecognised reference prefix:', externalReference);
      return { statusCode: 200, body: JSON.stringify({ received: true }) };
    }

    // ── UPDATE SUPABASE via REST API (service role key bypasses RLS) ──
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SERVICE_KEY;

    const newStatus = isSuccess ? 'paid' : 'failed';

    const updateUrl = `${supabaseUrl}/rest/v1/${table}?payment_reference=eq.${externalReference}`;

    const res = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Supabase update failed:', errText);
    }

    // Always return 200 to PayHero so they don't keep retrying
    return {
      statusCode: 200,
      body: JSON.stringify({ received: true, updated: res.ok, status: newStatus }),
    };

  } catch (err) {
    console.error('Callback handler error:', err);
    // Still return 200 — we don't want PayHero retrying indefinitely on our bug
    return { statusCode: 200, body: JSON.stringify({ received: true, error: err.message }) };
  }
};
