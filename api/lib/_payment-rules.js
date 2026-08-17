/* ══════════════════════════════════════════════════════════════
   APATMENTO. Payment policy (single source of truth)
   api/lib/_payment-rules.js

   Both the STK initiator and the callback import this so the browser,
   the server and the ledger can never disagree about what is owed.

   THE MODEL
   ─────────
   A guest may pay ANY amount toward a booking, in as many instalments
   as they like. Money is accepted below the deposit threshold, but the
   booking is NOT confirmed until the running total reaches 25% of the
   grand total, and the check-in code is NOT released until the total
   reaches 100%.

     paid = 0                      → pending_payment      (nothing yet)
     0 < paid < deposit_required   → part_paid            (money held, NOT confirmed)
     deposit_required <= paid < total → confirmed_balance_due (confirmed, no code)
     paid >= total                 → paid_pending_checkin (code released)

   If the guest chose "pay in full" that choice is binding: each push
   must clear the entire outstanding balance.
══════════════════════════════════════════════════════════════ */

/* 25% on every stay, regardless of nights. */
export const DEPOSIT_PCT = 0.25;

/* Minimum per TRANSACTION. Unrelated to the deposit threshold.
   PayHero and Safaricom charge a flat fee per transaction, so a KES 1
   push costs more to collect than it brings in. This floor lets a guest
   still pay far below the 25% deposit while keeping each individual
   transaction economic. Tune via MIN_TXN_KES without a code change. */
export const MIN_TXN = Number(process.env.MIN_TXN_KES || 10);

/* Unconfirmed part-payments are a refund liability: the guest's money is
   held but no room is blocked. Surfaced for the sweeper job. */
export const PART_PAYMENT_TTL_HOURS = Number(process.env.PART_PAYMENT_TTL_HOURS || 48);

export function depositRequired(grandTotal) {
  return Math.round(Number(grandTotal || 0) * DEPOSIT_PCT);
}

/* Derive booking status purely from money in. Never set status directly
   anywhere else. This function owns the state machine. */
export function deriveStatus(amountPaid, grandTotal) {
  const paid  = Number(amountPaid || 0);
  const total = Number(grandTotal || 0);
  if (total <= 0)                    return 'pending_payment';
  if (paid <= 0)                     return 'pending_payment';
  if (paid >= total)                 return 'paid_pending_checkin';
  if (paid >= depositRequired(total)) return 'confirmed_balance_due';
  return 'part_paid';
}

export function isConfirmed(amountPaid, grandTotal) {
  return Number(amountPaid || 0) >= depositRequired(grandTotal);
}

export function isFullyPaid(amountPaid, grandTotal) {
  return Number(grandTotal || 0) > 0 &&
         Number(amountPaid || 0) >= Number(grandTotal);
}

/* ══════════════════════════════════════════════════════════════
   HOW MUCH HAS ACTUALLY BEEN COLLECTED

   `amount_paid` is the ledger sum and the only honest answer, but
   only apartment_bookings carries the column. tour_bookings and
   event_tickets were written before the ledger existed and record a
   payment solely by moving `status`. For those, a settled status IS
   the receipt, and anything else is zero.

   Never infer payment from status on a row that HAS amount_paid: a
   KES 10 instalment on a KES 2,300 stay leaves the ledger at 10 and
   that is the number that must win.
══════════════════════════════════════════════════════════════ */
export const SETTLED_STATUSES = ['paid_pending_checkin', 'checked_in', 'completed'];

export function amountPaidOf(booking) {
  if (!booking) return 0;
  if (booking.amount_paid != null) return Number(booking.amount_paid) || 0;
  if (SETTLED_STATUSES.includes(String(booking.status))) {
    return Number(booking.grand_total || 0);
  }
  return 0;
}

/* One object every caller can reason about, so the browser, the
   check-in verifier and the sweeper cannot disagree about a booking. */
export function settlementOf(booking) {
  const total   = Number(booking?.grand_total || 0);
  const paid    = amountPaidOf(booking);
  const deposit = depositRequired(total);
  return {
    total,
    paid,
    deposit,
    outstanding: Math.max(0, Math.round(total - paid)),
    confirmed:   total > 0 && paid >= deposit,
    settled:     total > 0 && paid >= total,
    pct:         total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0,
  };
}

/* ══════════════════════════════════════════════════════════════
   WHERE A BOOKING SITS AGAINST THE CLOCK

   Dates are stored as plain calendar days (`date`, not `timestamptz`)
   and are meant in Kenyan local time. Comparing them against a UTC
   instant shifts the answer by three hours, which between midnight
   and 03:00 is a whole day in the wrong direction. So we compare day
   numbers, never instants.

   A stay is over at the END of its checkout day: someone leaving at
   10am on the 17th should still see their booking on the 17th, and
   not on the 18th.
══════════════════════════════════════════════════════════════ */
function dayNumber(value) {
  if (!value) return null;
  const s = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return Math.floor(Date.parse(s + 'T00:00:00Z') / 86400000);
}

/* Today in Africa/Nairobi (UTC+3, no DST), as a day number. */
export function todayNumber(now = new Date()) {
  return Math.floor((now.getTime() + 3 * 3600000) / 86400000);
}

export function startDayOf(b) {
  return dayNumber(b?.checkin_date || b?.tour_date || b?.event_date || b?.starts_on);
}

export function endDayOf(b) {
  const end = dayNumber(b?.checkout_date || b?.ends_on);
  return end != null ? end : startDayOf(b);
}

/**
 * 'undated' | 'upcoming' | 'starts_today' | 'in_progress' | 'ends_today' | 'ended'
 */
export function stayPhase(booking, now = new Date()) {
  const start = startDayOf(booking);
  if (start == null) return 'undated';
  const end   = endDayOf(booking);
  const today = todayNumber(now);

  if (today <  start) return 'upcoming';
  if (today === start) return 'starts_today';
  if (end != null && today >  end) return 'ended';
  if (end != null && today === end) return 'ends_today';
  return 'in_progress';
}

export function hasEnded(booking, now = new Date()) {
  return stayPhase(booking, now) === 'ended';
}

/* ══════════════════════════════════════════════════════════════
   MAY THE CHECK-IN CODE BE USED?

   Check-in releases the host's payout, so it is the one action that
   must not fail open. Four independent gates, each returning the
   reason rather than a bare false, because a guest standing at a
   door deserves to know which one stopped them.
══════════════════════════════════════════════════════════════ */
export function canReleaseCode(booking, now = new Date()) {
  if (!booking)            return { ok: false, reason: 'no_booking' };
  if (booking.cancelled_at) return { ok: false, reason: 'cancelled' };

  const s = settlementOf(booking);
  if (!s.settled) {
    return {
      ok: false,
      reason: s.paid > 0 ? 'balance_due' : 'unpaid',
      outstanding: s.outstanding,
      paid: s.paid,
      total: s.total,
    };
  }

  if (hasEnded(booking, now)) return { ok: false, reason: 'stay_ended' };

  return { ok: true, settlement: s };
}

/**
 * Validate a requested instalment against the booking.
 * Returns { ok, amount, error, meta }, `amount` is authoritative.
 */
export function validateInstalment({ requested, grandTotal, amountPaid, paymentMode }) {
  const total     = Number(grandTotal || 0);
  const paid      = Number(amountPaid || 0);
  const remaining = Math.max(0, Math.round(total - paid));
  const deposit   = depositRequired(total);

  if (total <= 0)     return { ok: false, error: 'Booking has no payable total' };
  if (remaining <= 0) return { ok: false, error: 'This booking is already paid in full' };

  /* "Pay in full" is binding once chosen. */
  if (paymentMode === 'full') {
    return {
      ok: true, amount: remaining,
      meta: { locked: true, remaining, deposit, shortfallAfter: 0 },
    };
  }

  let amount = Math.round(Number(requested));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: 'Enter a valid amount' };
  }

  /* Never let a guest overpay. Cap at what is actually outstanding. */
  if (amount > remaining) amount = remaining;

  if (amount < MIN_TXN && amount < remaining) {
    return {
      ok: false,
      error: `The smallest single payment is KES ${MIN_TXN.toLocaleString()}. `
           + `You can pay any amount from there upward.`,
    };
  }

  const paidAfter      = paid + amount;
  const shortfallAfter = Math.max(0, deposit - paidAfter);

  return {
    ok: true, amount,
    meta: {
      locked: false, remaining, deposit, paidAfter, shortfallAfter,
      confirmsBooking: paidAfter >= deposit,
      fullySettles:    paidAfter >= total,
    },
  };
}
