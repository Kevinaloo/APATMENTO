/* ══════════════════════════════════════════════════════════════
   APATMENTO — Deposit Balance  (api/_deposit-balance.js)
   ──────────────────────────────────────────────────────────────
   stk-callback.js writes its verdict directly onto the booking row
   (status = 'paid_pending_checkin' | 'failed'). There is no separate
   payments table. So we verify here by checking whether stk-callback
   already flipped the balance booking to paid — not by reading a
   third table that doesn't exist.

   Flow:
     1. Guest pays the balance via ApatmentoPay (M-Pesa STK push)
     2. stk-callback fires, sees reference starts with 'BAL-', patches
        the booking: balance_paid=true, status='paid_pending_checkin'
     3. Guest's UI calls this endpoint to confirm and get a clean response
     4. We read the booking, check balance_paid, done.
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
    if (bk.cancelled_at)            return res.status(409).json({ error: 'booking_cancelled' });
    if (bk.balance_reference !== reference) return res.status(400).json({ error: 'reference_mismatch' });

    // Already settled — stk-callback did its job
    if (bk.balance_paid && bk.status === 'paid_pending_checkin') {
      return res.status(200).json({ ok: true, already_settled: true, checkin_unlocked: true });
    }

    // stk-callback hasn't fired yet — tell the guest to wait a beat
    if (!bk.balance_paid) {
      return res.status(202).json({
        ok: false, pending: true,
        message: 'Payment is being confirmed — this usually takes a few seconds. Try again shortly.',
      });
    }

    // balance_paid = true but status not yet updated (edge case — fix it)
    const updated = await update('apartment_bookings', `id=eq.${booking_id}`, {
      status: 'paid_pending_checkin',
      balance_paid_at: bk.balance_paid_at || new Date().toISOString(),
    });

    await notify(bk.guest_id, 'balance_settled', 'Paid in full',
      'Your stay is settled. Enter your host\'s code to confirm check-in.', { booking_id });

    await notify(bk.host_id, 'balance_settled', 'Guest has paid in full',
      `${bk.guest_name || 'Your guest'} settled the balance. Give them your code on arrival.`,
      { booking_id });

    return res.status(200).json({ ok: true, booking: updated, checkin_unlocked: true });

  } catch (e) {
    console.error('[deposit-balance]', e);
    return res.status(500).json({ error: e.message });
  }
}
