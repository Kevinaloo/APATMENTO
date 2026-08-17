/* ══════════════════════════════════════════════════════════════
   APATMENTO. Payment Status Poller
   Vercel Serverless Function (api/check-payment-status.js)
   Called at: /api/check-payment-status?table=X&reference=Y
══════════════════════════════════════════════════════════════ */

import { settlementOf } from './_payment-rules.js';

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
    const H = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

    if (/-P\d+$/.test(String(reference))) {
      const lr = await fetch(
        `${supabaseUrl}/rest/v1/booking_payments`
          + `?reference=eq.${encodeURIComponent(reference)}&select=status,amount,booking_ref&limit=1`,
        { headers: H }
      );
      const row = lr.ok ? (await lr.json())[0] : null;

      /* An instalment clearing is not the same event as a booking being
         paid for, and callers kept conflating the two. Report both, and
         name them so they cannot be mistaken for each other again. */
      const settled = row?.booking_ref
        ? await bookingSettlement(supabaseUrl, H, table, row.booking_ref)
        : {};

      return res.status(200).json({
        status:      row?.status || 'pending',   /* this instalment */
        instalment:  row?.status || 'pending',
        amount:      row?.amount ?? null,
        booking_ref: row?.booking_ref ?? null,
        ...settled,                              /* the booking itself */
      });
    }

    const settled = await bookingSettlement(supabaseUrl, H, table, reference);
    return res.status(200).json({
      status: settled.booking_status || 'pending_payment',
      ...settled,
    });

  } catch (err) {
    console.error('Check status error:', err);
    return res.status(500).json({ error: err.message });
  }
}

/* What the BOOKING is worth, summed from the ledger. `fully_paid` is
   the single field any client should consult before showing a
   check-in code. */
async function bookingSettlement(supabaseUrl, H, table, bookingRef) {
  try {
    const br = await fetch(
      `${supabaseUrl}/rest/v1/${table}`
        + `?payment_reference=eq.${encodeURIComponent(bookingRef)}&select=*&limit=1`,
      { headers: H });
    const booking = br.ok ? (await br.json())[0] : null;
    if (!booking) return {};

    const lr = await fetch(
      `${supabaseUrl}/rest/v1/booking_payments`
        + `?booking_ref=eq.${encodeURIComponent(bookingRef)}&status=eq.paid&select=amount`,
      { headers: H });
    const ledgerSum = (lr.ok ? await lr.json() : [])
      .reduce((s, p) => s + Number(p.amount || 0), 0);

    const s = settlementOf(
      ledgerSum > 0 ? { ...booking, amount_paid: ledgerSum } : booking);

    return {
      booking_status: booking.status,
      amount_paid:    s.paid,
      grand_total:    s.total,
      outstanding:    s.outstanding,
      percent_paid:   s.pct,
      confirmed:      s.confirmed,
      fully_paid:     s.settled,
    };
  } catch (e) {
    console.warn('[check-payment-status] settlement:', e.message);
    return {};
  }
}
