/* ══════════════════════════════════════════════════════════════
   CABANA · CHECK-IN CODES  (api/lib/_codes.js)
   Four digits, read out loud at a door. Drawn from the operating
   system's CSPRNG, never Math.random: a code that releases a payout
   must not be predictable from the last one. The database draws its
   own the same way (cabana_private.checkin_code); this is for the
   few bookings the API writes directly (a rehome, a rescue).
   Guessing is stopped by the lock in _verify-checkin.js, not by
   length.
══════════════════════════════════════════════════════════════ */
import { randomInt } from 'node:crypto';

export function checkinCode(avoid) {
  let c;
  do { c = String(randomInt(0, 10000)).padStart(4, '0'); } while (avoid != null && c === String(avoid));
  return c;
}
