/* ══════════════════════════════════════════════════════════════
   CABANA · BOOKING STATE
   cabana-booking-state.js

   One answer to "where is this booking?", shared by every surface
   that draws one: my-bookings, the trip strip, the dashboard.

   This exists because those surfaces each had their own opinion.
   The trip strip counted 'part_paid' as paid and announced a KES 10
   trial as "Happening today" the week after it ended. my-bookings
   read the same row and showed "Pending check-in". Both were reading
   `status`, which is a cache of two facts it cannot hold at once:
   how much money arrived, and where the calendar is.

   So nothing here reads status alone. There are two axes.

     MONEY   settlement(b)  → what the ledger says was collected
     TIME    phase(b)       → where the dates sit against today

   Everything else is derived from those two. It mirrors
   api/lib/_payment-rules.js exactly, deliberately: the server decides,
   the browser predicts, and when they disagree the server wins. Keep
   them in step.
══════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  if (global.CabanaBooking) return;

  /* 25% confirms the dates. 100% releases the code. */
  var DEPOSIT_PCT = 0.25;

  /* Statuses that, on a table with no amount_paid column
     (tour_bookings, event_tickets), are themselves the receipt. */
  var SETTLED_STATUSES = ['paid_pending_checkin', 'checked_in', 'completed'];

  var num = function (v) { return Number(v || 0) || 0; };

  /* ── MONEY ──────────────────────────────────────────────────────
     A row that HAS amount_paid is believed, always. Only a row
     without the column falls back to reading its status, and then
     only because there is nothing else to read. */
  function amountPaid(b) {
    if (!b) return 0;
    if (b.amount_paid != null) return num(b.amount_paid);
    if (SETTLED_STATUSES.indexOf(String(b.status)) > -1) return num(b.grand_total);
    return 0;
  }

  function settlement(b) {
    var total   = num(b && b.grand_total);
    var paid    = amountPaid(b);
    var deposit = Math.round(total * DEPOSIT_PCT);
    return {
      total:       total,
      paid:        paid,
      deposit:     deposit,
      outstanding: Math.max(0, Math.round(total - paid)),
      confirmed:   total > 0 && paid >= deposit,
      settled:     total > 0 && paid >= total,
      pct:         total > 0 ? Math.min(100, Math.round(paid / total * 100)) : 0
    };
  }

  /* ── TIME ───────────────────────────────────────────────────────
     Booking dates are plain calendar days meant in Kenyan local time.
     Comparing them to a UTC instant is wrong by three hours, which
     between midnight and 03:00 is a whole day in the wrong direction:
     a stay starting today reads as "upcoming" to anyone browsing at
     1am. So compare day numbers, never instants, and pin the offset
     to Nairobi rather than to the device, which may be anywhere. */
  var NAIROBI_OFFSET_MS = 3 * 3600000;

  function dayNumber(value) {
    if (!value) return null;
    var s = String(value).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    return Math.floor(Date.parse(s + 'T00:00:00Z') / 86400000);
  }

  function today(now) {
    return Math.floor(((now || new Date()).getTime() + NAIROBI_OFFSET_MS) / 86400000);
  }

  function startDay(b) {
    return dayNumber(b && (b.checkin_date || b.tour_date || b.event_date || b.starts_on));
  }
  function endDay(b) {
    var e = dayNumber(b && (b.checkout_date || b.ends_on));
    return e != null ? e : startDay(b);
  }

  /* 'undated' | 'upcoming' | 'starts_today' | 'in_progress'
     | 'ends_today' | 'ended'                                     */
  function phase(b, now) {
    var s = startDay(b);
    if (s == null) return 'undated';
    var e = endDay(b), t = today(now);
    if (t <  s) return 'upcoming';
    if (t === s) return 'starts_today';
    if (e != null && t >  e) return 'ended';
    if (e != null && t === e) return 'ends_today';
    return 'in_progress';
  }

  function nightsLeft(b, now) {
    var e = endDay(b);
    return e == null ? null : e - today(now);
  }
  function daysUntilStart(b, now) {
    var s = startDay(b);
    return s == null ? null : s - today(now);
  }

  /* ── THE CHECK-IN CODE ──────────────────────────────────────────
     The code is not a receipt for having started to pay. It is the
     thing that releases the host's payout, so it appears only when
     the stay is paid for in full and the dates have not passed.

     The server enforces this too (api/lib/_verify-checkin.js). This
     copy exists so the guest is never shown a code that would be
     refused at the door.                                          */
  function codeState(b, now) {
    if (!b)             return { show: false, reason: 'no_booking' };
    if (b.cancelled_at) return { show: false, reason: 'cancelled' };

    var s = settlement(b);
    if (!s.settled) {
      return {
        show: false,
        reason: s.paid > 0 ? 'balance_due' : 'unpaid',
        outstanding: s.outstanding,
        settlement: s
      };
    }
    if (phase(b, now) === 'ended') return { show: false, reason: 'stay_ended' };
    if (!b.guest_code)             return { show: false, reason: 'no_code_issued' };

    return { show: true, code: b.guest_code, settlement: s };
  }

  /* ── ONE LABEL FOR THE WHOLE THING ──────────────────────────────
     Ordered by precedence. Cancellation beats money, money beats the
     calendar, and "this is over" beats everything that reads as live.
     `bucket` is what the Upcoming / Past tabs filter on.           */
  function lifecycle(b, now) {
    var s  = settlement(b);
    var ph = phase(b, now);
    var st = String(b && b.status || '');

    var made = function (key, label, note, tone, bucket) {
      return { key: key, label: label, note: note, tone: tone, bucket: bucket,
               phase: ph, settlement: s };
    };

    if (b && b.cancelled_at)
      return made('cancelled', 'Cancelled',
        b.cancel_reason || 'This booking was cancelled', 'muted', 'past');

    if (st === 'refunded')
      return made('refunded', 'Refunded', 'Money returned in full', 'muted', 'past');

    /* Closed by the nightly sweeper, or simply out of time. Either way
       it is history, and history does not get a live check-in code. */
    if (st === 'completed')
      return made('completed', 'Completed', 'Stay finished', 'good', 'past');

    if (st === 'expired' || ph === 'ended') {
      if (st === 'checked_in')
        return made('completed', 'Completed', 'Stay finished', 'good', 'past');
      return made('expired', 'Expired',
        s.paid > 0 ? 'Dates passed without check-in · KES ' + s.paid.toLocaleString()
                   + ' may be refundable'
                   : 'These dates have passed', 'muted', 'past');
    }

    if (st === 'checked_in')
      return made('checked_in', 'Checked in',
        ph === 'ends_today' ? 'Checking out today' : 'You’re in', 'good', 'upcoming');

    if (st === 'failed')
      return made('failed', 'Payment failed', 'No money was taken', 'bad', 'upcoming');

    /* Money states, cheapest first. */
    if (s.paid <= 0)
      return made('unpaid', 'Awaiting payment',
        'Nothing has been paid yet', 'warn', 'upcoming');

    if (!s.confirmed)
      return made('part_paid', 'Not confirmed',
        'KES ' + s.paid.toLocaleString() + ' held · KES '
        + Math.max(0, s.deposit - s.paid).toLocaleString()
        + ' more confirms these dates', 'warn', 'upcoming');

    if (!s.settled)
      return made('balance_due', 'Dates held',
        'KES ' + s.outstanding.toLocaleString()
        + ' left before your check-in code unlocks', 'warn', 'upcoming');

    /* Settled. Now the calendar decides what to say. */
    if (ph === 'starts_today')
      return made('today', 'Check in today', 'Your code is ready', 'live', 'upcoming');
    if (ph === 'in_progress' || ph === 'ends_today')
      return made('staying', 'Staying now',
        ph === 'ends_today' ? 'Checking out today' : 'Enjoy it', 'live', 'upcoming');

    return made('confirmed', 'Confirmed', 'Paid in full', 'good', 'upcoming');
  }

  /* ── formatting shared by every surface ─────────────────────────── */
  function money(n) { return 'KES ' + Math.round(num(n)).toLocaleString(); }

  function fmtDay(iso) {
    if (!iso) return '';
    var d = new Date(String(iso).slice(0, 10) + 'T00:00:00');
    if (isNaN(d)) return '';
    return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
  }

  function fmtRange(a, b) {
    if (!a) return '';
    var one = fmtDay(a);
    return b ? one + ' → ' + fmtDay(b) : one;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  }

  /* The human name of a booking, whatever table it came from.
     my-bookings read `listing_name` for apartments, a column that is
     usually null, so every stay rendered as the word "Booking". */
  function title(b) {
    return (b && (b.apartment_name || b.listing_name || b.tour_name
                  || b.event_name || b.vehicle_name)) || 'Booking';
  }

  global.CabanaBooking = {
    settlement: settlement,
    amountPaid: amountPaid,
    phase: phase,
    lifecycle: lifecycle,
    codeState: codeState,
    daysUntilStart: daysUntilStart,
    nightsLeft: nightsLeft,
    startDay: startDay,
    endDay: endDay,
    today: today,
    money: money,
    fmtDay: fmtDay,
    fmtRange: fmtRange,
    title: title,
    esc: esc,
    DEPOSIT_PCT: DEPOSIT_PCT
  };

})(typeof window !== 'undefined' ? window : globalThis);
