/* ═══════════════════════════════════════════════════════════════════════
   CABANA · FEES IN THE BROWSER
   apa-fees.js

   Cabana's facilitation schedule is internal. It lives in the database
   (cabana_private.fee_bands) and is never shipped to a page, printed in a
   help article or recited by the assistant.

   ONE PRICE FOR GUESTS
   Guests see a single all-in price everywhere: the host's price with
   Cabana's fee already inside it. No fee line, no surprise at checkout.
   The fee is per unit (a night, a person, a ticket, a day, a pass), so
   "KES 4,800 a night" is what three nights cost three times over.

   THE BREAKDOWN IS FOR HOSTS ONLY
   While a host types a price they see what they receive, Cabana's fee
   and what guests will see. Nothing else on the platform shows a split.

     ApaFees.allIn(service, amount, units?)  → Promise<{base, fee, total}|null>
     ApaFees.allInMany(service, amounts[])   → Promise<Map<amount, total>>
     ApaFees.guestPrice(service, amount)     → Promise<number>  (falls back to amount)
     ApaFees.attach(input, opts)             → live host breakdown under an input
     ApaFees.autoWire(root)                  → attach to every [data-apa-fee]
     ApaFees.quote(service, subtotal)        → Promise<number|null> (server fee, legacy)
     ApaFees.money(n)                        → 'KES 1,240'

   Every number comes from the server: cabana_all_in_prices() when it is
   there, cabana_fee_quote() per amount when it is not. Results are cached
   for the tab, so a page of forty stays costs one round trip.
   ═══════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.ApaFees) return;

  /* Services that carry no guest fee at all. This is public (help and
     terms say so); the amounts of the others are not. */
  var NO_FEE = { food: 1, shopping: 1, rides: 1, roommates: 1, flights: 1 };
  var ALIAS = { hotel: 'stays', day_pass: 'stays', daypass: 'stays', apartment: 'stays', stay: 'stays',
                tour: 'tours', event: 'events', car: 'carhire', car_hire: 'carhire', room: 'roommates' };
  var UNIT = { stays: 'night', tours: 'person', events: 'ticket', carhire: 'day', roommates: 'month' };

  function svc(s) { s = String(s || '').toLowerCase(); return ALIAS[s] || s; }
  function money(n, cur) {
    return (cur || 'KES') + ' ' + Math.round(Number(n) || 0).toLocaleString('en-KE');
  }
  function client() {
    try {
      return (global.ApaSession && global.ApaSession.client && global.ApaSession.client()) || global.sb || null;
    } catch (e) { return null; }
  }

  /* ── cache ─────────────────────────────────────────────────────────── */
  var CACHE = new Map();                 // 'stays|4500' → total
  var STORE = 'apa-allin-v1';
  try {
    var saved = JSON.parse(sessionStorage.getItem(STORE) || '{}');
    Object.keys(saved).forEach(function (k) { CACHE.set(k, saved[k]); });
  } catch (e) { /* private mode */ }
  var persistT = 0;
  function persist() {
    clearTimeout(persistT);
    persistT = setTimeout(function () {
      try {
        var o = {}, n = 0;
        CACHE.forEach(function (v, k) { if (n++ < 600) o[k] = v; });
        sessionStorage.setItem(STORE, JSON.stringify(o));
      } catch (e) { /* full or private */ }
    }, 400);
  }
  function key(s, a) { return s + '|' + Math.round(a * 100) / 100; }

  /* The fee on one amount, from the server. Resolves to null when it
     cannot be asked. */
  function quote(service, subtotal) {
    var c = client();
    if (!c || !c.rpc) return Promise.resolve(null);
    return c.rpc('cabana_fee_quote', { p_service: String(service || ''), p_subtotal: Number(subtotal) || 0 })
      .then(function (r) { return r && !r.error && r.data != null ? Number(r.data) : null; },
            function () { return null; });
  }

  var batchMissing = false;
  var inflight = new Map();

  /* Totals for many amounts, one round trip when the batch RPC exists. */
  function allInMany(service, amounts) {
    var s = svc(service);
    var out = new Map();
    var need = [];
    (amounts || []).forEach(function (a) {
      a = Number(a);
      if (!(a > 0)) return;
      if (NO_FEE[s]) { out.set(a, a); return; }
      var k = key(s, a);
      if (CACHE.has(k)) out.set(a, CACHE.get(k));
      else if (need.indexOf(a) < 0) need.push(a);
    });
    if (!need.length) return Promise.resolve(out);
    var c = client();
    if (!c || !c.rpc) return Promise.resolve(out);

    var viaBatch = batchMissing ? Promise.resolve(null)
      : c.rpc('cabana_all_in_prices', { p_service: s, p_amounts: need }).then(function (r) {
          if (r && r.error) {
            if (/function|does not exist|PGRST202|404/i.test((r.error.code || '') + ' ' + (r.error.message || ''))) batchMissing = true;
            return null;
          }
          return Array.isArray(r && r.data) ? r.data : null;
        }, function () { return null; });

    return viaBatch.then(function (totals) {
      if (totals && totals.length === need.length) {
        need.forEach(function (a, i) { var t = Number(totals[i]); if (t >= a) { CACHE.set(key(s, a), t); out.set(a, t); } });
        persist();
        return out;
      }
      /* Older database: one small question per distinct amount, six at
         a time. Distinct prices on a page are far fewer than listings. */
      var queue = need.slice(), workers = [];
      function next() {
        if (!queue.length) return Promise.resolve();
        var a = queue.shift(), k = key(s, a);
        var p = inflight.get(k) || quote(s, a).then(function (fee) {
          inflight.delete(k);
          if (fee == null) return null;
          var t = a + fee; CACHE.set(k, t); return t;
        });
        inflight.set(k, p);
        return p.then(function (t) { if (t != null) out.set(a, t); return next(); });
      }
      for (var w = 0; w < Math.min(6, queue.length); w++) workers.push(next());
      return Promise.all(workers).then(function () { persist(); return out; });
    });
  }

  /* One amount, optionally over several units (a week is seven nights):
     the fee is charged per unit, on the average unit price. */
  function allIn(service, amount, units) {
    var s = svc(service), a = Number(amount) || 0, u = Math.max(1, Math.round(Number(units) || 1));
    if (!(a > 0)) return Promise.resolve(null);
    if (NO_FEE[s]) return Promise.resolve({ base: a, fee: 0, total: a, units: u });
    var per = Math.round((a / u) * 100) / 100;
    return allInMany(s, [per]).then(function (m) {
      if (!m.has(per)) return null;
      var feeUnit = Math.max(0, m.get(per) - per);
      var fee = Math.round(feeUnit * u);
      return { base: a, fee: fee, total: a + fee, units: u };
    });
  }
  /* Does the database charge per unit yet? The batch RPC ships in the
     same migration that moves the fee onto each unit, so its presence is
     the answer. Until then a booking's fee is banded on its total, and an
     estimate made here has to match what the server will charge. */
  var unitMode = null;
  function perUnit() {
    if (unitMode !== null) return Promise.resolve(unitMode);
    if (batchMissing) { unitMode = false; return Promise.resolve(false); }
    var c = client();
    if (!c || !c.rpc) return Promise.resolve(true);
    return c.rpc('cabana_all_in_prices', { p_service: 'stays', p_amounts: [1000] }).then(function (r) {
      unitMode = !(r && r.error);
      if (!unitMode) batchMissing = true;
      return unitMode;
    }, function () { return true; });
  }
  /* The fee a booking of `units` at `unitPrice` will carry, the way the
     server will charge it. */
  function bookingFee(service, unitPrice, units) {
    var s = svc(service), per = Number(unitPrice) || 0, u = Math.max(1, Math.round(Number(units) || 1));
    if (!(per > 0) || NO_FEE[s]) return Promise.resolve(0);
    return perUnit().then(function (yes) {
      if (yes) return allIn(s, per * u, u).then(function (r) { return r ? r.fee : null; });
      return quote(s, per * u);
    });
  }

  function guestPrice(service, amount, units) {
    return allIn(service, amount, units).then(function (r) { return r ? r.total : Number(amount) || 0; });
  }

  /* ── The host breakdown ───────────────────────────────────────────── */
  var CSS = ''
    + '.apf{margin:10px 0 2px;border-radius:16px;border:1px solid rgba(20,24,60,.1);background:linear-gradient(160deg,#fff,#f7f8ff);overflow:hidden;font-family:inherit;color:#121628;box-shadow:0 10px 26px -22px rgba(20,24,60,.6);animation:apfIn .3s cubic-bezier(.22,1,.36,1)}'
    + '@keyframes apfIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}'
    + '.apf[hidden]{display:none}'
    + '.apf-rows{padding:11px 14px 4px}'
    + '.apf-row{display:flex;justify-content:space-between;align-items:baseline;gap:10px;font-size:13px;color:#5a6178;padding:3px 0}'
    + '.apf-row b{font-variant-numeric:tabular-nums;color:#121628;font-weight:700}'
    + '.apf-row.fee b{color:#5a6178;font-weight:650}'
    + '.apf-total{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:11px 14px;margin-top:6px;border-top:1px dashed rgba(20,24,60,.14);background:color-mix(in srgb,var(--cc-accent,#4f46e5) 7%,#fff)}'
    + '.apf-total span{font-size:12.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--cc-accent,#4f46e5)}'
    + '.apf-total b{font-size:20px;font-weight:850;letter-spacing:-.02em;font-variant-numeric:tabular-nums;color:#0c0f22}'
    + '.apf-total small{font-size:12px;font-weight:600;color:#5a6178;margin-left:3px}'
    + '.apf-note{padding:0 14px 11px;font-size:11.5px;line-height:1.5;color:#7a8098}'
    + '.apf.busy .apf-total b{opacity:.45}'
    + '.apf-mini{display:inline-flex;align-items:center;gap:6px;margin-top:6px;padding:5px 10px;border-radius:999px;background:color-mix(in srgb,var(--cc-accent,#4f46e5) 9%,#fff);color:#121628;font-size:12px;font-weight:650}'
    + '.apf-mini b{font-variant-numeric:tabular-nums}'
    + '.apf-mini[hidden]{display:none}';
  function injectCSS() {
    if (document.getElementById('apf-css')) return;
    var st = document.createElement('style'); st.id = 'apf-css'; st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  /**
   * Attach a live breakdown under a price input.
   *   opts.service   stays | tours | events | carhire | roommates | food | shopping
   *   opts.unit      'night' | 'person' | ... (defaults by service)
   *   opts.units     how many units the amount covers (7 for a weekly price)
   *   opts.currency  'KES' (defaults to the input's data-currency or KES)
   *   opts.compact   a one-line pill instead of the card
   *   opts.mount     where to render (defaults to just after the input's field)
   */
  function attach(input, opts) {
    if (typeof input === 'string') input = document.getElementById(input);
    if (!input || input._apf) return input && input._apf;
    opts = opts || {};
    injectCSS();
    var s = svc(opts.service || input.getAttribute('data-apa-fee') || 'stays');
    var unit = opts.unit || input.getAttribute('data-apa-fee-unit') || UNIT[s] || '';
    var units = opts.units || Number(input.getAttribute('data-apa-fee-units')) || 1;
    var compact = opts.compact != null ? opts.compact : input.hasAttribute('data-apa-fee-compact');
    var box = document.createElement('div');
    box.className = compact ? 'apf-mini' : 'apf';
    box.hidden = true;
    box.setAttribute('aria-live', 'polite');
    var mount = opts.mount || (input.closest && (input.closest('.field,.lt-field,.le-field,.fl,.f,label,.tier-field-price') || input.parentNode));
    if (opts.mount) opts.mount.appendChild(box);
    else if (mount && mount.parentNode && mount !== input.parentNode) mount.appendChild(box);
    else input.insertAdjacentElement('afterend', box);

    var seq = 0, t = 0;
    function cur() { return opts.currency || input.getAttribute('data-currency') || (document.getElementById('f-cur') && document.getElementById('f-cur').value) || 'KES'; }
    function per() { return unit ? ' / ' + unit : ''; }
    function paint(r, busy) {
      var c = cur();
      if (!r) { box.hidden = true; return; }
      box.hidden = false;
      box.classList.toggle('busy', !!busy);
      if (compact) {
        box.innerHTML = 'Guests see <b>' + money(r.total, c) + '</b>' + per();
        return;
      }
      var none = r.fee === 0;
      box.innerHTML =
        '<div class="apf-rows">'
        + '<div class="apf-row"><span>You receive</span><b>' + money(r.base, c) + per() + '</b></div>'
        + '<div class="apf-row fee"><span>Cabana fee' + (none ? '' : ', added for guests') + '</span><b>' + (none ? 'None' : '+ ' + money(r.fee, c)) + '</b></div>'
        + '</div>'
        + '<div class="apf-total"><span>Guests see</span><b>' + money(r.total, c) + '<small>' + per() + '</small></b></div>'
        + '<div class="apf-note">' + (opts.note || (none
            ? 'There is no Cabana fee on this. Guests see exactly your price.'
            : 'Guests only ever see the all-in price, everywhere on Cabana. You keep 100% of your price.')) + '</div>';
    }
    function update() {
      var a = Number(String(input.value || '').replace(/[^\d.]/g, ''));
      var c = cur();
      if (!(a > 0)) { paint(null); return; }
      if (c !== 'KES' && !NO_FEE[s]) {
        box.hidden = false; box.className = compact ? 'apf-mini' : 'apf';
        box.innerHTML = compact ? 'Online checkout is in KES'
          : '<div class="apf-note" style="padding:11px 14px">Online checkout runs in KES. Switch the currency to KES to see the all-in price guests pay.</div>';
        return;
      }
      var mine = ++seq;
      var cached = allInSync(s, a, units);
      if (cached) { paint(cached); return; }
      paint({ base: a, fee: 0, total: a }, true);
      allIn(s, a, units).then(function (r) {
        if (mine !== seq) return;
        if (r) paint(r);
        else {
          box.hidden = false;
          box.innerHTML = compact ? 'Guests see your price plus a small Cabana fee'
            : '<div class="apf-note" style="padding:11px 14px">Guests will see your price with a small Cabana fee already included, as one total. Reconnect to see the exact figure.</div>';
        }
      });
    }
    function schedule() { clearTimeout(t); t = setTimeout(update, 220); }
    input.addEventListener('input', schedule);
    input.addEventListener('change', update);
    var fc = document.getElementById('f-cur'); if (fc && !opts.currency) fc.addEventListener('change', update);
    update();
    input._apf = {
      update: update, box: box,
      setUnits: function (u) { units = u; update(); },
      reconfig: function (o) {
        o = o || {};
        if (o.service) s = svc(o.service);
        if (o.unit != null) unit = o.unit;
        if (o.units) units = o.units;
        if (o.note != null) opts.note = o.note;
        update();
      }
    };
    return input._apf;
  }

  function allInSync(s, a, units) {
    var u = Math.max(1, units || 1);
    if (NO_FEE[s]) return { base: a, fee: 0, total: a, units: u };
    var p = Math.round((a / u) * 100) / 100, k = key(s, p);
    if (!CACHE.has(k)) return null;
    var fee = Math.round(Math.max(0, CACHE.get(k) - p) * u);
    return { base: a, fee: fee, total: a + fee, units: u };
  }

  function autoWire(root) {
    (root || document).querySelectorAll('input[data-apa-fee]').forEach(function (el) { attach(el); });
  }
  /* Inputs drawn later (a modal, a tier added on the fly) wire
     themselves the first time someone touches them. */
  document.addEventListener('focusin', function (e) {
    var el = e.target;
    if (el && el.matches && el.matches('input[data-apa-fee]') && !el._apf) attach(el);
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { autoWire(); });
  else autoWire();

  global.ApaFees = {
    quote: quote,
    money: money,
    allIn: allIn,
    allInMany: allInMany,
    allInSync: function (service, amount, units) { var a = Number(amount) || 0; return a > 0 ? allInSync(svc(service), a, units) : null; },
    guestPrice: guestPrice,
    perUnit: perUnit,
    bookingFee: bookingFee,
    attach: attach,
    autoWire: autoWire,
    service: svc,
    charges: function (service) { return !NO_FEE[svc(service)]; },
    /* Kept so older pages degrade quietly: there is no public ladder. */
    fee: function () { return null; },
    bands: function () { return []; },
    label: function () { return ''; },
    ladder: function () { return ''; }
  };
})(window);
