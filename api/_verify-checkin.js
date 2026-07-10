/* ══════════════════════════════════════════════════════════════
   APATMENTO — Verify Check-in  (api/verify-checkin.js)
   ──────────────────────────────────────────────────────────────
   Two codes are exchanged in person. The guest shows theirs; the
   host says theirs aloud. Both must match, and — this is the new
   part — the booking must be settled in full.

   A guest on a deposit cannot check in. Not because we distrust
   them, but because check-in releases the host's payout, and we
   will not release money we have not collected.
══════════════════════════════════════════════════════════════ */

import { one, update, whoami, notify, cors } from './_db.js';

const money = (n) => 'KES ' + Number(n || 0).toLocaleString();
const ALLOWED = ['apartment_bookings', 'tour_bookings', 'event_tickets'];

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const user = await whoami(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });

  const { table, reference, role, code } = req.body || {};
  if (!ALLOWED.includes(table)) return res.status(400).json({ error: 'invalid_table' });
  if (!reference || !code)      return res.status(400).json({ error: 'missing_fields' });

  try {
    const bk = await one(table, `payment_reference=eq.${reference}&select=*`);
    if (!bk) return res.status(404).json({ error: 'booking_not_found' });

    if (bk.guest_id !== user.id && bk.host_id !== user.id) {
      return res.status(403).json({ error: 'not_a_party_to_this_booking' });
    }

    if (bk.cancelled_at)             return res.status(409).json({ error: 'booking_cancelled' });
    if (bk.status === 'checked_in')  return res.status(200).json({ ok: true, already: true });

    /* ── The gate ─────────────────────────────────────────────────
       Deposit taken, balance outstanding. The code is correct and
       still will not work. Tell them exactly what is owed.        */
    if (bk.payment_mode === 'deposit' && !bk.balance_paid) {
      return res.status(402).json({
        ok: false,
        error: 'balance_due',
        balance_amount: Number(bk.balance_amount || 0),
        deposit_paid: Number(bk.deposit_amount || 0),
        message: `${money(bk.balance_amount)} is outstanding. Settle it to confirm check-in.`,
      });
    }

    if (!['paid_pending_checkin', 'deposit_paid'].includes(bk.status)) {
      return res.status(409).json({ error: 'not_payable', status: bk.status });
    }

    /* ── Code check ───────────────────────────────────────────────
       Constant-time compare. The codes are short; a timing oracle
       on six characters is not theoretical.                        */
    const expected = role === 'guest' ? bk.host_code : bk.guest_code;
    const given = String(code).trim().toUpperCase();

    let diff = expected.length ^ given.length;
    for (let i = 0; i < Math.max(expected.length, given.length); i++) {
      diff |= (expected.charCodeAt(i) || 0) ^ (given.charCodeAt(i) || 0);
    }
    if (diff !== 0) {
      return res.status(401).json({ ok: false, error: 'code_mismatch' });
    }

    const now = new Date().toISOString();
    const updated = await update(table, `payment_reference=eq.${reference}`, {
      status: 'checked_in',
      checked_in_at: now,
    });

    await notify(bk.host_id, 'checked_in', 'Guest has checked in',
      `${bk.guest_name || 'Your guest'} is in. Payout of ${money((bk.stay_total || 0))} is released.`,
      { booking_id: bk.id });

    await notify(bk.guest_id, 'checked_in', 'Check-in confirmed',
      'You\'re in. If anything is wrong with the property, you can still report it.',
      { booking_id: bk.id });

    return res.status(200).json({ ok: true, booking: updated, checked_in_at: now });

  } catch (e) {
    console.error('[verify-checkin]', e);
    return res.status(500).json({ error: e.message });
  }
}
