/* ══════════════════════════════════════════════════════════════
   APATMENTO — Deposit Balance  (api/deposit-balance.js)
   ──────────────────────────────────────────────────────────────
   A guest may hold a stay with a deposit and settle the rest on
   arrival. The host's acceptance code is inert until they do.

   This endpoint is the only thing that can flip balance_paid.
   It verifies against the payment provider's record, never the
   caller's word — a POST is a claim, not a receipt.
══════════════════════════════════════════════════════════════ */

import { one, update, whoami, notify, cors } from './_db.js';

const money = (n) => 'KES ' + Number(n || 0).toLocaleString();

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const user = await whoami(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });

  const { booking_id, reference } = req.body || {};
  if (!booking_id || !reference) return res.status(400).json({ error: 'missing_fields' });

  try {
    const bk = await one('apartment_bookings', `id=eq.${booking_id}&select=*`);
    if (!bk)                        return res.status(404).json({ error: 'booking_not_found' });
    if (bk.guest_id !== user.id)    return res.status(403).json({ error: 'not_your_booking' });
    if (bk.balance_paid)            return res.status(200).json({ ok: true, already_settled: true });
    if (bk.balance_reference !== reference) return res.status(400).json({ error: 'reference_mismatch' });
    if (bk.cancelled_at)            return res.status(409).json({ error: 'booking_cancelled' });

    /* The callback from PayHero (api/stk-callback.js) is what marks a
       reference settled. We read its verdict; we do not take the
       client's. If it hasn't landed yet, the guest waits a beat. */
    const paid = await one('payments', `reference=eq.${reference}&status=eq.success&select=amount,reference`)
      .catch(() => null);

    if (!paid) {
      return res.status(202).json({
        ok: false, pending: true,
        message: 'Payment not confirmed yet. This usually clears in a few seconds.',
      });
    }

    const due = Number(bk.balance_amount || 0);
    if (Number(paid.amount) + 1 < due) {   // 1 KES tolerance for rounding
      return res.status(409).json({
        ok: false, error: 'underpaid',
        paid: Number(paid.amount), due,
        message: `${money(due - paid.amount)} still outstanding.`,
      });
    }

    const updated = await update('apartment_bookings', `id=eq.${booking_id}`, {
      balance_paid: true,
      balance_paid_at: new Date().toISOString(),
      status: 'paid_pending_checkin',
    });

    await notify(bk.guest_id, 'balance_settled', 'Paid in full',
      'Your stay is settled. Enter your host\'s code to confirm check-in.', { booking_id });

    await notify(bk.host_id, 'balance_settled', 'Guest has paid in full',
      `${bk.guest_name || 'Your guest'} settled the balance. Give them your code on arrival.`,
      { booking_id });

    return res.status(200).json({
      ok: true,
      booking: updated,
      checkin_unlocked: true,
    });

  } catch (e) {
    console.error('[deposit-balance]', e);
    return res.status(500).json({ error: e.message });
  }
}
