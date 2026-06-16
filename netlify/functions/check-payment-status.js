/* ══════════════════════════════════════════════════════════════
   APATMENTO — Check Payment Status
   Netlify Function

   The frontend polls THIS endpoint every few seconds after showing
   the STK push popup, to find out if the guest has completed payment
   yet (the callback above updates Supabase asynchronously).
══════════════════════════════════════════════════════════════ */

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { table, reference } = event.queryStringParameters || {};
    if (!table || !reference) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing table or reference parameter' }) };
    }

    const allowedTables = ['tour_bookings', 'event_tickets', 'apartment_bookings'];
    if (!allowedTables.includes(table)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid table' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SERVICE_KEY;

    const url = `${supabaseUrl}/rest/v1/${table}?payment_reference=eq.${reference}&select=status`;

    const res = await fetch(url, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });

    const data = await res.json();
    const status = data?.[0]?.status || 'pending_payment';

    return {
      statusCode: 200,
      body: JSON.stringify({ status }),
    };

  } catch (err) {
    console.error('Check status error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
