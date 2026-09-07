/* ══════════════════════════════════════════════════════════════
   CABANA. Referral & rehoming-commission lifecycle
   (api/lib/_referral-lifecycle.js)
   ──────────────────────────────────────────────────────────────
   Every commission this platform pays on a STAY passes through here,
   at both ends of its life:

     · pendingCommission()   record it, unrealised, when the money that
                              justifies it first moves (a stay gets
                              paid, or a rehome offer is accepted)
     · releaseOnCheckIn()    make it real, once the stay actually
                              happens
     · voidOnNoShow()        make sure it never becomes real, when the
                              stay is cancelled before that

   Two different commissions share this one lifecycle and one table
   (referral_earnings), distinguished only by `referral_type`:

     'user' | 'host' | 'service_provider'   the ordinary ambassador
       programme — commission on a guest THEY referred, keyed to the
       booking's own reference (or, if the guest is later rehomed, to
       referral_root_ref, which follows them through the move).

     'rehome'   the finder's fee a host earns for sharing a listing
       (their own sweep match, or a direct share) that a stranded guest
       actually moves into — keyed to the REPLACEMENT booking's own
       reference, because that is the specific stay being compensated.

   Why one table: a host who is also somebody's referrer sees both
   kinds of earning in the same dashboard, and withdraw() only ever
   needed to know `status = 'confirmed'` — it does not care why.

   THE RULE
   ────────
   A commission is 'pending_checkin' from the moment it is recorded.
   It becomes 'confirmed' — visible in "total earned", eligible for
   withdrawal after the usual hold — only once the specific booking it
   is keyed to reaches `checked_in`. If that booking is instead
   cancelled without a replacement (the stay is over, for good, and
   nobody stayed anywhere), the pending row is 'reversed' and will
   never be paid.

   A booking that is REHOMED rather than cancelled is not a no-show —
   the referral obligation simply moves with the guest via
   referral_root_ref, and the row keeps waiting.
══════════════════════════════════════════════════════════════ */

import { select, insert, update } from './_db.js';

export const COMMISSION_HOLD_DAYS = Number(process.env.COMMISSION_HOLD_DAYS || 14);

/* Record a commission that is not real yet. Idempotent on booking_ref,
   same as every other earning in this table — a retried call after a
   timeout must not double the entry. */
export async function pendingCommission({
  referrerId, referredId, serviceType, grossAmount, platformFee,
  commissionRate, commissionKes, referrerTier, referralType, bookingRef,
}) {
  if (!bookingRef || !referrerId || !(commissionKes > 0)) return null;

  const existing = await select('referral_earnings',
    `booking_ref=eq.${encodeURIComponent(bookingRef)}&select=id&limit=1`).catch(() => []);
  if (existing.length) return existing[0];

  return insert('referral_earnings', {
    referrer_id:     referrerId,
    referred_id:     referredId,
    service_type:    serviceType,
    gross_amount:    Number(grossAmount) || 0,
    platform_fee:    Number(platformFee) || 0,
    commission_rate: commissionRate,
    commission_kes:  Number(commissionKes.toFixed ? commissionKes.toFixed(2) : commissionKes),
    referrer_tier:   referrerTier || null,
    referral_type:   referralType,
    booking_ref:     bookingRef,
    status:          'pending_checkin',
  }).catch(e => {
    /* Lost a race to another call writing the same booking_ref. That
       call's row is the one that counts; this one is a no-op. */
    if (/duplicate|unique/i.test(e.message)) return null;
    throw e;
  });
}

/* A booking just reached `checked_in`. Release whatever was waiting on
   it — its own pending commission (a rehoming finder's fee is always
   keyed this way), and, if it is carrying a referral chain, the
   ordinary referral commission at the root of that chain. Both calls
   are no-ops when there is nothing pending under that reference, so
   this is safe to call on every check-in, referred guest or not. */
export async function releaseOnCheckIn(booking) {
  const refs = [...new Set([booking.payment_reference, booking.referral_root_ref].filter(Boolean))];
  const released = [];
  for (const ref of refs) {
    const rows = await select('referral_earnings',
      `booking_ref=eq.${encodeURIComponent(ref)}&status=eq.pending_checkin&select=id&limit=1`)
      .catch(() => []);
    if (!rows.length) continue;
    const availableAt = new Date(Date.now() + COMMISSION_HOLD_DAYS * 86400000).toISOString();
    await update('referral_earnings', `id=eq.${rows[0].id}`,
      { status: 'confirmed', available_at: availableAt }).catch(() => {});
    released.push(rows[0].id);
  }
  return released;
}

/* A booking is being cancelled OUTRIGHT — no replacement, the stay is
   simply not happening. Void whatever pending commission was keyed to
   it, so it can never be confirmed later. Never call this on a booking
   that is being REHOMED (a replacement exists): the chain survives the
   move via referral_root_ref, and voiding here would kill a referral
   commission on a guest who is about to complete their stay somewhere
   else through no fault of their own. */
export async function voidOnNoShow(booking, reason) {
  const refs = [...new Set([booking.payment_reference, booking.referral_root_ref].filter(Boolean))];
  const voided = [];
  for (const ref of refs) {
    const rows = await select('referral_earnings',
      `booking_ref=eq.${encodeURIComponent(ref)}&status=in.(pending_checkin,confirmed)&select=id&limit=1`)
      .catch(() => []);
    if (!rows.length) continue;
    await update('referral_earnings', `id=eq.${rows[0].id}`, {
      status: 'reversed', reversed_at: new Date().toISOString(), reversed_reason: reason,
    }).catch(() => {});
    voided.push(rows[0].id);
  }
  return voided;
}

/* What a new booking must carry so releaseOnCheckIn / voidOnNoShow can
   still find the referral chain after a move. Call this wherever a
   replacement booking is built (rehoming, rescue). */
export function referralRootRef(originalBooking) {
  return originalBooking.referral_root_ref || originalBooking.payment_reference || null;
}
