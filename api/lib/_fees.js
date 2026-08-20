/* ══════════════════════════════════════════════════════════════════════════
   CABANA · THE SERVICE FEE SCHEDULE
   api/lib/_fees.js

   Cabana's fee is a FIXED AMOUNT, chosen by a band of the booking value.
   It is not a percentage and it never has been on the money path.

     stays        KES 300  below KES 5,000 · KES 800 at KES 5,000 and above
     tours        KES 0    the operator's own fare, nothing added
     events       KES 0    face value means face value
     everything else, until it has a published band:  KES 0

   WHY THIS FILE EXISTS
   ────────────────────
   The rewards path used to compute the fee as 10% of gross. That number
   was never charged to anyone. On a KES 3,000 stay it invented KES 300
   where KES 300 was in fact charged — coincidence — and on a KES 60,000
   stay it invented KES 6,000 where KES 800 was charged, over-paying
   commission by a factor of seven and a half. Referral commission is a
   share of a fee we actually collected, so it has to be computed from the
   fee we actually collected.

   THE AUTHORITY IS POSTGRES.
   supabase/migrations/20260818170000_secure_stay_booking_integrity.sql
   stamps `service_fee` onto the booking row before it is ever written, and
   the browser cannot influence it. So the order of preference is always:

     1. the `service_fee` stamped on the booking          ← use this
     2. this schedule, from the service and the subtotal  ← only if 1 is absent

   Step 2 exists for rows written before the trigger, and for a caller that
   genuinely has no booking to read. It is a fallback, not a second opinion:
   if the two ever disagree, the booking row is right.

   `tests/service-fee.test.mjs` pins these numbers against the SQL.
   Change the SQL first, then run that test and follow it.
   ══════════════════════════════════════════════════════════════════════════ */

/* Bands are ordered and read top down: the first band whose ceiling the
   subtotal is UNDER wins. `null` is "no ceiling". Expressed as a table so a
   third band is a data change rather than a rewritten conditional. */
export const FEE_SCHEDULE = {
  stays:      [{ under: 5000, fee: 300 }, { under: null, fee: 800 }],
  roommates:  [{ under: 5000, fee: 300 }, { under: null, fee: 800 }],
  tours:      [{ under: null, fee: 0 }],
  events:     [{ under: null, fee: 0 }],
  carhire:    [{ under: null, fee: 0 }],
  rides:      [{ under: null, fee: 0 }],
  food:       [{ under: null, fee: 0 }],
  shopping:   [{ under: null, fee: 0 }],
  flights:    [{ under: null, fee: 0 }],
};

/* An unknown service earns nobody anything rather than quietly earning
   somebody the stays fee. A typo in a service string should cost a
   complaint, not cost Cabana money on every booking until someone notices. */
const NO_FEE = [{ under: null, fee: 0 }];

/** The fixed fee for a subtotal, in whole KES. */
export function serviceFee(service, subtotal) {
  const bands = FEE_SCHEDULE[String(service || '').toLowerCase()] || NO_FEE;
  const value = Number(subtotal || 0);
  for (const band of bands) {
    if (band.under == null || value < band.under) return band.fee;
  }
  return bands[bands.length - 1].fee;
}

/** Every band a service charges, for showing a human the whole ladder. */
export function feeBands(service) {
  return (FEE_SCHEDULE[String(service || '').toLowerCase()] || NO_FEE).slice();
}

/* The fee a commission is a share of.

   `stamped` is the booking's own service_fee. It wins whenever it is a
   real number — including zero, which is a fee we charged and a legitimate
   answer, not a missing value. Only null/undefined/NaN fall through to the
   schedule. Getting that distinction wrong is how a zero-fee tour booking
   would start paying commission off a stays fee. */
export function feeBasis({ stamped, service, subtotal }) {
  const n = stamped == null ? NaN : Number(stamped);
  if (Number.isFinite(n) && n >= 0) return n;
  return serviceFee(service, subtotal);
}

/** 'KES 300' / 'KES 300 or KES 800' — one line a human can read. */
export function feeLabel(service) {
  const bands = feeBands(service);
  const amounts = [...new Set(bands.map(b => b.fee))];
  if (amounts.length === 1) return amounts[0] === 0 ? 'no fee' : `KES ${amounts[0].toLocaleString()}`;
  return amounts.map(a => `KES ${a.toLocaleString()}`).join(' or ');
}
