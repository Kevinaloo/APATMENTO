/* ══════════════════════════════════════════════════════════════
   APATMENTO. Verify Check-in  (api/verify-checkin.js)
   ──────────────────────────────────────────────────────────────
   Two codes are exchanged in person. The guest shows theirs; the
   host says theirs aloud. Both must match, and. This is the new
   part. The booking must be settled in full.

   A guest on a deposit cannot check in. Not because we distrust
   them, but because check-in releases the host's payout, and we
   will not release money we have not collected.
══════════════════════════════════════════════════════════════ */

import { one, select, update, whoami, notify, cors } from './_db.js';
import { canReleaseCode, settlementOf, stayPhase } from './_payment-rules.js';

const money = (n) => 'KES ' + Number(n || 0).toLocaleString();
const ALLOWED = ['apartment_bookings', 'tour_bookings', 'event_tickets'];

/* The booking row's amount_paid is a cache of the ledger. Before we
   release a payout we re-sum the ledger itself, because a callback
   that never arrived leaves the cache stale and stale-low is the only
   direction that matters here: it must never read HIGH. */
async function collected(booking, table) {
  const fallback = settlementOf(booking).paid;
  if (!booking.payment_reference) return fallback;
  try {
    const rows = await select('booking_payments',
      `booking_ref=eq.${encodeURIComponent(booking.payment_reference)}`
      + `&status=eq.paid&select=amount`);
    if (!rows.length) return fallback;
    const summed = rows.reduce((s, p) => s + Number(p.amount || 0), 0);
    /* A table with no ledger column keeps its status-derived answer if
       that is the larger of the two: legacy single-shot payments never
       wrote a ledger row at all. */
    return Math.max(summed, table === 'apartment_bookings' ? 0 : fallback);
  } catch (e) {
    console.warn('[verify-checkin] ledger re-sum failed:', e.message);
    return fallback;
  }
}

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
    if (bk.status === 'completed')   return res.status(409).json({ error: 'stay_ended' });

    /* ── The gate ─────────────────────────────────────────────────
       Everything below runs off money re-summed from the ledger, not
       off `status`. A KES 10 instalment on a KES 2,300 stay used to
       arrive here as status 'paid_pending_checkin' via the legacy
       callback path and walk straight through, releasing the host's
       full payout against ten shillings. Status is a cache; the
       ledger is the fact.                                          */
    const paid = await collected(bk, table);
    const gate = canReleaseCode({ ...bk, amount_paid: paid });

    if (!gate.ok && (gate.reason === 'balance_due' || gate.reason === 'unpaid')) {
      return res.status(402).json({
        ok: false,
        error: 'balance_due',
        balance_amount: gate.outstanding,
        amount_paid:    gate.paid,
        grand_total:    gate.total,
        message: gate.paid > 0
          ? `${money(gate.outstanding)} of ${money(gate.total)} is still outstanding. `
            + 'Settle it to confirm check-in.'
          : 'This booking has not been paid for yet.',
      });
    }

    /* A stay whose checkout day has passed cannot be checked into.
       Without this, a code from a trial booking in August still opened
       a payout in December. */
    if (!gate.ok && gate.reason === 'stay_ended') {
      return res.status(409).json({
        ok: false,
        error: 'stay_ended',
        message: 'This booking\'s dates have passed. Contact support if you still need to check in.',
      });
    }

    if (!gate.ok) return res.status(409).json({ error: gate.reason, status: bk.status });

    /* ── Code check ───────────────────────────────────────────────
       Constant-time compare. The codes are short; a timing oracle
       on six characters is not theoretical.                        */
    const expected = String((role === 'guest' ? bk.host_code : bk.guest_code) || '')
      .trim().toUpperCase();
    const given = String(code).trim().toUpperCase();

    /* No code on the row means nothing to match against. Comparing
       against '' would have thrown on .length and 500'd; worse, an
       empty submission would have matched. */
    if (!expected) {
      return res.status(409).json({ ok: false, error: 'no_code_issued' });
    }

    let diff = expected.length ^ given.length;
    for (let i = 0; i < Math.max(expected.length, given.length); i++) {
      diff |= (expected.charCodeAt(i) || 0) ^ (given.charCodeAt(i) || 0);
    }
    if (diff !== 0) {
      return res.status(401).json({ ok: false, error: 'code_mismatch' });
    }

    const now = new Date().toISOString();
    const patch = { status: 'checked_in', checked_in_at: now };
    /* Write the re-summed figure back so the row stops lying to every
       other reader. Only apartment_bookings has the column. */
    if (table === 'apartment_bookings') {
      patch.amount_paid    = paid;
      patch.balance_amount = 0;
      patch.balance_paid   = true;
    }
    const updated = await update(table, `payment_reference=eq.${reference}`, patch);

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
