/* ══════════════════════════════════════════════════════════════
   APATMENTO. Payment Status Poller
   Vercel Serverless Function (api/check-payment-status.js)
   Called at: /api/check-payment-status?table=X&reference=Y
══════════════════════════════════════════════════════════════ */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { table, reference } = req.query;

    if (!table || !reference) {
      return res.status(400).json({ error: 'Missing table or reference parameter' });
    }

    const allowedTables = ['tour_bookings', 'event_tickets', 'apartment_bookings'];
    if (!allowedTables.includes(table)) {
      return res.status(400).json({ error: 'Invalid table' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

    /* Instalment references (…-P1, -P2) live in the booking_payments
       ledger, not on the booking row. A guest paying below the deposit
       leaves the booking at 'part_paid', so polling the booking would
       look like a failure even though their money cleared. */
    if (/-P\d+$/.test(String(reference))) {
      const lr = await fetch(
        `${supabaseUrl}/rest/v1/booking_payments`
          + `?reference=eq.${encodeURIComponent(reference)}&select=status,amount,booking_ref&limit=1`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
      );
      const row = lr.ok ? (await lr.json())[0] : null;
      return res.status(200).json({
        status: row?.status || 'pending',
        amount: row?.amount ?? null,
        booking_ref: row?.booking_ref ?? null,
      });
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/${table}?payment_reference=eq.${reference}&select=status`,
      {
        headers: {
          apikey:        serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      }
    );

    const data   = await response.json();
    const status = data?.[0]?.status || 'pending_payment';

    return res.status(200).json({ status });

  } catch (err) {
    console.error('Check status error:', err);
    return res.status(500).json({ error: err.message });
  }
}
