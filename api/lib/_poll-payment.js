/* ══════════════════════════════════════════════════════════════
   APATMENTO — Direct PayHero Transaction Status Poller
   GET /api/poll-payment?ref=APT-xxx-P1

   THE PERMANENT FIX
   ─────────────────
   Every previous approach relied on PayHero calling back our server.
   All 7 payments sat at status:pending because PayHero never posted
   to our callback URL (domain likely not whitelisted, or Vercel env
   vars missing causing 500s on receipt). PayHero silently stops
   retrying after 3 failures.

   This endpoint queries PayHero's OWN transaction status API using
   the CheckoutRequestID stored at push time. The browser polls this
   instead of waiting for a callback that may never come. When PayHero
   confirms success we write the DB ourselves, synchronously.

   No callback dependency. No race condition. No timeout false-negative.
══════════════════════════════════════════════════════════════ */

const PAYHERO_BASE = 'https://backend.payhero.co.ke/api/v2';

export async function pollPayment(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).end();

  const { ref } = req.query;
  if (!ref) return res.status(400).json({ error: 'ref required' });

  const username   = process.env.PAYHERO_USERNAME;
  const password   = process.env.PAYHERO_PASSWORD;
  const supaUrl    = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!username || !password) {
    return res.status(500).json({ error: 'PayHero credentials not configured' });
  }

  const auth = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
  const H    = extra => ({ apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, ...extra });

  try {
    // 1. Load the ledger row to get CheckoutRequestID and booking_ref.
    let ledger = null;
    if (supaUrl && serviceKey) {
      const lr = await fetch(
        `${supaUrl}/rest/v1/booking_payments?reference=eq.${encodeURIComponent(ref)}&select=*&limit=1`,
        { headers: H() }
      );
      ledger = lr.ok ? (await lr.json())[0] : null;
    }

    // Already settled — return cached result immediately.
    if (ledger?.status === 'paid')   return res.json({ status: 'paid',   settled: true });
    if (ledger?.status === 'failed') return res.json({ status: 'failed', settled: true });

    const ckid = ledger?.checkout_request_id;
    if (!ckid) {
      // CheckoutRequestID not stored yet (race on first poll) — return pending.
      return res.json({ status: 'pending', reason: 'no_checkout_id' });
    }

    // 2. Ask PayHero directly.
    const phRes = await fetch(
      `${PAYHERO_BASE}/payments/${encodeURIComponent(ckid)}`,
      { headers: { Authorization: auth, Accept: 'application/json' } }
    );

    let ph = {};
    try { ph = await phRes.json(); } catch (_) {}
    console.log('[poll-payment] PayHero status for', ckid, ':', JSON.stringify(ph).slice(0, 300));

    /* PayHero status field: SUCCESS | FAILED | PENDING */
    const phStatus = String(ph.status || ph.StatusCode || '').toUpperCase();
    const receipt  = ph.MpesaReceiptNumber || ph.mpesa_receipt_number
                  || ph.response?.MpesaReceiptNumber || null;

    const isSuccess = phStatus === 'SUCCESS';
    const isFailed  = phStatus === 'FAILED';

    if (!isSuccess && !isFailed) {
      return res.json({ status: 'pending', payhero_status: phStatus });
    }

    // 3. Write to DB — we own this update now, no callback needed.
    if (supaUrl && serviceKey && ledger) {
      // Update ledger row.
      await fetch(
        `${supaUrl}/rest/v1/booking_payments?reference=eq.${encodeURIComponent(ref)}`,
        {
          method: 'PATCH',
          headers: H({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
          body: JSON.stringify({
            status:        isSuccess ? 'paid' : 'failed',
            paid_at:       isSuccess ? new Date().toISOString() : null,
            mpesa_receipt: receipt,
          }),
        }
      );

      if (isSuccess) {
        // Re-sum all paid instalments for this booking.
        const sr = await fetch(
          `${supaUrl}/rest/v1/booking_payments`
            + `?booking_ref=eq.${encodeURIComponent(ledger.booking_ref)}&status=eq.paid&select=amount`,
          { headers: H() }
        );
        // Include the current payment (status was just updated above).
        const paidRows  = sr.ok ? await sr.json() : [];
        const amountPaid = paidRows.reduce((s, p) => s + Number(p.amount || 0), 0)
                         + Number(ledger.amount || 0); // add current row

        // Load booking for grand_total.
        const br = await fetch(
          `${supaUrl}/rest/v1/apartment_bookings`
            + `?payment_reference=eq.${encodeURIComponent(ledger.booking_ref)}&select=*&limit=1`,
          { headers: H() }
        );
        const booking = br.ok ? (await br.json())[0] : null;
        const total   = Number(booking?.grand_total || 0);
        const deposit = Math.round(total * 0.25);
        const nowFull = amountPaid >= total && total > 0;

        const newStatus = amountPaid <= 0        ? 'pending_payment'
                        : nowFull               ? 'paid_pending_checkin'
                        : amountPaid >= deposit  ? 'confirmed_balance_due'
                        : 'part_paid';

        await fetch(
          `${supaUrl}/rest/v1/apartment_bookings`
            + `?payment_reference=eq.${encodeURIComponent(ledger.booking_ref)}`,
          {
            method: 'PATCH',
            headers: H({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
            body: JSON.stringify({
              amount_paid:      amountPaid,
              deposit_required: deposit,
              status:           newStatus,
              balance_amount:   Math.max(0, total - amountPaid),
              balance_paid:     nowFull,
              ...(nowFull ? { fully_paid_at: new Date().toISOString() } : {}),
            }),
          }
        );

        return res.json({
          status:        newStatus,
          amount_paid:   amountPaid,
          grand_total:   total,
          deposit_required: deposit,
          mpesa_receipt: receipt,
          confirmed:     amountPaid >= deposit,
          fully_paid:    nowFull,
        });
      }
    }

    return res.json({ status: isSuccess ? 'paid' : 'failed', mpesa_receipt: receipt });

  } catch (err) {
    console.error('[poll-payment] error:', err.message);
    return res.status(500).json({ error: err.message, status: 'pending' });
  }
}
