/* ═══════════════════════════════════════════════════════════════════════
   CABANA · THE SERVICE FEE SCHEDULE (browser mirror)
   apa-fees.js

   The same ladder as api/lib/_fees.js and the same ladder Postgres stamps
   onto every booking. Cabana's fee is a FIXED AMOUNT chosen by a band of
   the booking value — never a percentage.

     stays & rooms   KES 300 below KES 5,000 · KES 800 from KES 5,000
     everything else KES 0

   This file never decides what a guest pays. The database does that, before
   the row is written, and the browser cannot influence it. This exists so
   that every screen which EXPLAINS the fee explains the same fee, from one
   table, instead of four hand-typed sentences drifting apart.

   Idempotent, dependency free, safe to load on any page.

     ApaFees.fee(service, subtotal)   → 300
     ApaFees.bands(service)           → [{ under: 5000, fee: 300 }, …]
     ApaFees.label(service)           → 'KES 300 or KES 800'
     ApaFees.ladder(service)          → 'KES 300 on bookings under KES 5,000, …'
     ApaFees.money(n)                 → 'KES 1,240'
   ═══════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.ApaFees) return;

  var SCHEDULE = {
    stays:     [{ under: 5000, fee: 300 }, { under: null, fee: 800 }],
    roommates: [{ under: 5000, fee: 300 }, { under: null, fee: 800 }],
    tours:     [{ under: null, fee: 0 }],
    events:    [{ under: null, fee: 0 }],
    carhire:   [{ under: null, fee: 0 }],
    rides:     [{ under: null, fee: 0 }],
    food:      [{ under: null, fee: 0 }],
    shopping:  [{ under: null, fee: 0 }],
    flights:   [{ under: null, fee: 0 }]
  };
  var NO_FEE = [{ under: null, fee: 0 }];

  function bandsFor(service) {
    return SCHEDULE[String(service || '').toLowerCase()] || NO_FEE;
  }

  function money(n) {
    return 'KES ' + Math.round(Number(n) || 0).toLocaleString();
  }

  function fee(service, subtotal) {
    var bands = bandsFor(service), v = Number(subtotal) || 0, i;
    for (i = 0; i < bands.length; i++) {
      if (bands[i].under == null || v < bands[i].under) return bands[i].fee;
    }
    return bands[bands.length - 1].fee;
  }

  function label(service) {
    var seen = [], out = [];
    bandsFor(service).forEach(function (b) {
      if (seen.indexOf(b.fee) === -1) { seen.push(b.fee); out.push(b.fee); }
    });
    if (out.length === 1) return out[0] === 0 ? 'no fee' : money(out[0]);
    return out.map(money).join(' or ');
  }

  /* The whole ladder as one sentence, so no screen has to write its own. */
  function ladder(service) {
    var bands = bandsFor(service);
    if (bands.length === 1) {
      return bands[0].fee === 0
        ? 'Cabana adds nothing to the price.'
        : 'A flat ' + money(bands[0].fee) + ' on every booking.';
    }
    return bands.map(function (b, i) {
      if (b.under == null) return money(b.fee) + ' from ' + money(bands[i - 1].under);
      return money(b.fee) + ' on bookings under ' + money(b.under);
    }).join(', ') + '.';
  }

  global.ApaFees = {
    SCHEDULE: SCHEDULE,
    fee: fee,
    bands: function (service) { return bandsFor(service).slice(); },
    label: label,
    ladder: ladder,
    money: money
  };
})(window);
