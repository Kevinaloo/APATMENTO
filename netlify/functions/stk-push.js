/* ══════════════════════════════════════════════════════════════
   APATMENTO — PayHero STK Push Initiator
   Netlify Function (serverless backend)

   This function receives a payment request from the frontend
   (tours.html, events.html, apartments booking etc.), calls the
   PayHero API to trigger an M-Pesa STK push on the guest's phone,
   and returns the result.

   CREDENTIALS ARE READ FROM NETLIFY ENVIRONMENT VARIABLES — never
   hardcoded here. Set these in:
   Netlify Dashboard → Site configuration → Environment variables

   Required variables:
     PAYHERO_USERNAME       = qFO3bgRatsrwMqx86aIy
     PAYHERO_PASSWORD       = XdvtnVreZXfqvTUILXHCAHOzPrTq7EKIyXVsgXzH
     PAYHERO_CHANNEL_ID     = 5915
     SUPABASE_URL           = https://gfwgbgdvxtocwhilrtdw.supabase.co
     SUPABASE_SERVICE_KEY   = (your Supabase service_role key, NOT the anon key —
                                get this from Supabase → Settings → API → service_role)
══════════════════════════════════════════════════════════════ */

exports.handler = async function (event) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body);
    const { amount, phone, reference, bookingTable, bookingId } = body;

    // ── VALIDATE INPUT ──
    if (!amount || !phone || !reference) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: amount, phone, reference' }),
      };
    }

    // ── NORMALISE PHONE NUMBER to 254XXXXXXXXX format ──
    let normalizedPhone = phone.replace(/\s+/g, '').replace(/^\+/, '');
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '254' + normalizedPhone.slice(1);
    } else if (normalizedPhone.startsWith('7') || normalizedPhone.startsWith('1')) {
      normalizedPhone = '254' + normalizedPhone;
    }
    if (!/^254\d{9}$/.test(normalizedPhone)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid phone number format' }),
      };
    }

    // ── BUILD PAYHERO AUTH ──
    const username = process.env.PAYHERO_USERNAME;
    const password = process.env.PAYHERO_PASSWORD;
    const channelId = process.env.PAYHERO_CHANNEL_ID;

    if (!username || !password || !channelId) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'PayHero credentials not configured on server' }),
      };
    }

    const authToken = Buffer.from(`${username}:${password}`).toString('base64');

    // ── CALLBACK URL — where PayHero will POST the payment result ──
    // This points back to our OWN callback function (stk-callback.js)
    const siteUrl = process.env.URL || `https://${event.headers.host}`;
    const callbackUrl = `${siteUrl}/.netlify/functions/stk-callback`;

    // ── BUILD PAYLOAD ──
    const payload = {
      amount: Math.round(amount), // KES, whole number
      phone_number: normalizedPhone,
      channel_id: parseInt(channelId, 10),
      provider: 'm-pesa',
      external_reference: reference, // our own booking reference, e.g. "TOUR-1-abc123"
      callback_url: callbackUrl,
    };

    // ── CALL PAYHERO API ──
    const response = await fetch('https://backend.payhero.co.ke/api/v2/payments/initiate-stk-push', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'PayHero request failed', details: data }),
      };
    }

    // ── OPTIONAL: record the pending transaction reference against the booking ──
    // (so the callback function can find and update the right row later)
    // We pass bookingTable + bookingId through so the callback knows what to update.
    // PayHero's response usually includes a CheckoutRequestID or reference we should store.

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'STK push sent. Ask the customer to check their phone.',
        payhero_response: data,
        reference,
      }),
    };

  } catch (err) {
    console.error('STK Push error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', details: err.message }),
    };
  }
};
