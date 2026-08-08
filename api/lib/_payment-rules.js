/* ══════════════════════════════════════════════════════════════
   APATMENTO — Payment policy (single source of truth)
   api/lib/_payment-rules.js

   Both the STK initiator and the callback import this so the browser,
   the server and the ledger can never disagree about what is owed.

   THE MODEL
   ─────────
   A guest may pay ANY amount toward a booking, in as many instalments
   as they like. Money is accepted below the deposit threshold — but the
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

/* Minimum per TRANSACTION — unrelated to the deposit threshold.
   PayHero and Safaricom charge a flat fee per transaction, so a KES 1
   push costs more to collect than it brings in. This floor lets a guest
   still pay far below the 25% deposit while keeping each individual
   transaction economic. Tune via MIN_TXN_KES without a code change. */
export const MIN_TXN = Number(process.env.MIN_TXN_KES || 50);

/* Unconfirmed part-payments are a refund liability: the guest's money is
   held but no room is blocked. Surfaced for the sweeper job. */
export const PART_PAYMENT_TTL_HOURS = Number(process.env.PART_PAYMENT_TTL_HOURS || 48);

export function depositRequired(grandTotal) {
  return Math.round(Number(grandTotal || 0) * DEPOSIT_PCT);
}

/* Derive booking status purely from money in. Never set status directly
   anywhere else — this function owns the state machine. */
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

/**
 * Validate a requested instalment against the booking.
 * Returns { ok, amount, error, meta } — `amount` is authoritative.
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

  /* Never let a guest overpay — cap at what is actually outstanding. */
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
