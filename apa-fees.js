/* ═══════════════════════════════════════════════════════════════════════
   CABANA · FEES IN THE BROWSER
   apa-fees.js

   Cabana's facilitation schedule is internal. It lives in the database
   (cabana_private.fee_bands) and is never shipped to a page, printed in a
   help article or recited by the assistant. A guest sees one number: the
   facilitation on the booking in front of them, quoted by the server at
   checkout, before they pay.

   So this file no longer carries a ladder. It keeps its old surface so a
   page that still calls it degrades quietly instead of throwing:

     ApaFees.quote(service, subtotal) → Promise<number>   (server-quoted)
     ApaFees.money(n)                 → 'KES 1,240'
     ApaFees.bands() / ladder() / label() / fee()   → empty, by design
   ═══════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.ApaFees) return;

  function money(n) {
    return 'KES ' + Math.round(Number(n) || 0).toLocaleString('en-KE');
  }

  function client() {
    try {
      return (global.ApaSession && global.ApaSession.client && global.ApaSession.client()) || global.sb || null;
    } catch (e) { return null; }
  }

  /* The fee on one amount, from the server. Resolves to null when it
     cannot be asked, so a caller shows "calculated at checkout" rather
     than a guess. */
  function quote(service, subtotal) {
    var c = client();
    if (!c || !c.rpc) return Promise.resolve(null);
    return c.rpc('cabana_fee_quote', { p_service: String(service || ''), p_subtotal: Number(subtotal) || 0 })
      .then(function (r) { return r && !r.error && r.data != null ? Number(r.data) : null; },
            function () { return null; });
  }

  global.ApaFees = {
    quote: quote,
    money: money,
    fee: function () { return null; },
    bands: function () { return []; },
    label: function () { return ''; },
    ladder: function () { return ''; }
  };
})(window);
