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
import { releaseOnCheckIn } from './_referral-lifecycle.js';

const money = (n) => 'KES ' + Number(n || 0).toLocaleString();
const MAX_CODE_ATTEMPTS = 6;

/* "48 21", "4821" and "guest-1a2b3c4d" all mean what the person meant.
   Four-digit codes compare as digits; the older prefixed codes compare
   as upper-case text with spaces removed. */
export function normaliseCode(v) {
  const raw = String(v == null ? '' : v).trim().toUpperCase();
  if (/^[\d\s-]+$/.test(raw)) return raw.replace(/\D/g, '');
  return raw.replace(/\s+/g, '');
}
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
    const bk = await one(table, `payment_reference=eq.${encodeURIComponent(String(reference))}&select=*`);
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

    /* ── Lock ─────────────────────────────────────────────────────
       Codes are four digits now, said out loud at a door. Four digits
       are 10,000 possibilities, which a script exhausts in minutes, so
       six wrong tries on a booking freeze check-in until a person looks.
       Either party guessing the other's code releases a payout without
       the stay having started; that is what this stops.            */
    if (bk.checkin_locked_at) {
      return res.status(423).json({
        ok: false, error: 'code_locked',
        message: 'Check-in is paused on this booking after too many wrong codes. Our team has been told and will help you now.',
      });
    }

    /* ── Code check ───────────────────────────────────────────────
       Constant-time compare. The codes are short; a timing oracle
       on four characters is not theoretical.                       */
    const expected = normaliseCode((role === 'guest' ? bk.host_code : bk.guest_code) || '');
    const given = normaliseCode(code);

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
      const tries = (Number(bk.checkin_attempts) || 0) + 1;
      const locked = tries >= MAX_CODE_ATTEMPTS;
      /* Best effort: a database without the counter (before the
         20261008 migration) still refuses the wrong code. */
      try {
        await update(table, `payment_reference=eq.${encodeURIComponent(String(reference))}`,
          locked ? { checkin_attempts: tries, checkin_locked_at: new Date().toISOString() } : { checkin_attempts: tries });
      } catch (e) { console.warn('[verify-checkin] attempt counter:', e.message); }
      if (locked) {
        await notify(bk.guest_id, 'checkin_locked', 'Check-in paused',
          'Too many wrong codes were entered on your booking, so check-in is paused. Our team will contact you now.', { booking_id: bk.id }).catch(() => {});
        await notify(bk.host_id, 'checkin_locked', 'Check-in paused',
          'Too many wrong codes were entered on a booking, so check-in is paused. Our team will contact you now.', { booking_id: bk.id }).catch(() => {});
        return res.status(423).json({ ok: false, error: 'code_locked',
          message: 'Too many wrong codes. Check-in is paused on this booking and our team has been told.' });
      }
      return res.status(401).json({ ok: false, error: 'code_mismatch', attempts_left: MAX_CODE_ATTEMPTS - tries });
    }

    const now = new Date().toISOString();
    const patch = { status: 'checked_in', checked_in_at: now };
    if ('checkin_attempts' in bk) patch.checkin_attempts = 0;
    /* Write the re-summed figure back so the row stops lying to every
       other reader. Only apartment_bookings has the column. */
    if (table === 'apartment_bookings') {
      patch.amount_paid    = paid;
      patch.balance_amount = 0;
      patch.balance_paid   = true;
    }
    const updated = await update(table, `payment_reference=eq.${encodeURIComponent(String(reference))}`, patch);

    /* ── The stay just happened. Whatever commission was waiting on it
       becomes real ─────────────────────────────────────────────────
       Two kinds share this one moment: the rehoming host's finder's fee
       (keyed to THIS booking's own reference, since it is compensation
       on this specific replacement) and the ordinary referral
       commission for whoever brought this guest to Cabana (keyed to
       referral_root_ref, which follows a guest through any number of
       rehomes). Both were written as 'pending_checkin' — real enough to
       show, not real enough to withdraw — and only this call, only on
       apartment_bookings, flips them to 'confirmed'. A tour or an event
       ticket has no check-in step and never carried a pending row to
       begin with, so this is a no-op for them. */
    if (table === 'apartment_bookings') {
      await releaseOnCheckIn(updated || bk).catch(e =>
        console.warn('[verify-checkin] commission release:', e.message));
    }

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
