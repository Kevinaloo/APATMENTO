/* ═══════════════════════════════════════════════════════════════════
   CABANA FX · the price in your money
   ───────────────────────────────────────────────────────────────────
   Hosts price in their own currency and guests pay in it. What a guest
   in Lagos or London needs is a fair sense of what that number means to
   them, without ever being told something the checkout will not honour.

   So this module only ever DISPLAYS. It converts for reading, rounds to
   a figure a person would say out loud, and marks every converted
   number as approximate. Amounts that go anywhere near the database are
   converted back to KES first by the caller (toKes).

     CabanaFX.code()            the display currency ('KES', 'USD', …)
     CabanaFX.set(code)         change it everywhere, remembered
     CabanaFX.format(kes, o)    'KES 2,500' or '≈ $19'
     CabanaFX.toLocal(kes)      number in the display currency
     CabanaFX.toKes(amount)     back to KES, for filters and requests
     CabanaFX.picker(anchor)    the currency chooser
     CabanaFX.info()            where today's rates came from

   Fires `cabana:currency` on window when the choice changes and
   `cabana:fx-rates` when fresher rates land.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.CabanaFX) return;
  var D = global.document;

  var KEY = 'cabana_currency';
  var RATES_KEY = 'cabana_fx_rates_v1';
  var API = '/api/utilities?action=fx';
  var DIRECT = 'https://open.er-api.com/v6/latest/KES';

  /* s: symbol, n: name, g: group, w: symbol is a word (needs a space) */
  var META = {
    KES: { s: 'KES', n: 'Kenyan shilling', g: 'africa', w: 1 },
    USD: { s: '$', n: 'US dollar', g: 'major' },
    EUR: { s: '€', n: 'Euro', g: 'major' },
    GBP: { s: '£', n: 'British pound', g: 'major' },
    NGN: { s: '₦', n: 'Nigerian naira', g: 'africa' },
    GHS: { s: 'GH₵', n: 'Ghanaian cedi', g: 'africa' },
    ZAR: { s: 'R', n: 'South African rand', g: 'africa' },
    TZS: { s: 'TSh', n: 'Tanzanian shilling', g: 'africa', w: 1 },
    UGX: { s: 'USh', n: 'Ugandan shilling', g: 'africa', w: 1 },
    RWF: { s: 'RWF', n: 'Rwandan franc', g: 'africa', w: 1 },
    ETB: { s: 'Br', n: 'Ethiopian birr', g: 'africa', w: 1 },
    EGP: { s: 'E£', n: 'Egyptian pound', g: 'africa' },
    MAD: { s: 'MAD', n: 'Moroccan dirham', g: 'africa', w: 1 },
    XOF: { s: 'CFA', n: 'West African CFA franc', g: 'africa', w: 1 },
    XAF: { s: 'FCFA', n: 'Central African CFA franc', g: 'africa', w: 1 },
    ZMW: { s: 'ZK', n: 'Zambian kwacha', g: 'africa', w: 1 },
    BWP: { s: 'P', n: 'Botswana pula', g: 'africa' },
    MUR: { s: 'Rs', n: 'Mauritian rupee', g: 'africa', w: 1 },
    AED: { s: 'AED', n: 'UAE dirham', g: 'world', w: 1 },
    SAR: { s: 'SAR', n: 'Saudi riyal', g: 'world', w: 1 },
    CAD: { s: 'C$', n: 'Canadian dollar', g: 'world' },
    AUD: { s: 'A$', n: 'Australian dollar', g: 'world' },
    CHF: { s: 'CHF', n: 'Swiss franc', g: 'world', w: 1 },
    CNY: { s: 'CN¥', n: 'Chinese yuan', g: 'world' },
    INR: { s: '₹', n: 'Indian rupee', g: 'world' },
    JPY: { s: 'JP¥', n: 'Japanese yen', g: 'world' }
  };

  /* Reference rates, units per 1 KES. Used only until live rates arrive,
     and labelled approximate exactly like live ones are. */
  var REFERENCE = {
    KES: 1, USD: 0.00772, EUR: 0.00677, GBP: 0.0058, NGN: 10.27, GHS: 0.0895, ZAR: 0.1265,
    TZS: 20.44, UGX: 30.4, RWF: 11.41, ETB: 1.245, EGP: 0.402, MAD: 0.0761, XOF: 4.483,
    XAF: 4.483, ZMW: 0.152, BWP: 0.1093, MUR: 0.3688, AED: 0.02833, SAR: 0.02893,
    CAD: 0.01087, AUD: 0.01095, CHF: 0.00639, CNY: 0.0517, INR: 0.7416, JPY: 1.219
  };

  /* A sensible first guess from the device's time zone. Never from an IP:
     a wrong guess there is just irritating. Anything unknown stays KES,
     the currency every stay is actually priced in. */
  var TZ_CUR = {
    'Africa/Nairobi': 'KES', 'Africa/Lagos': 'NGN', 'Africa/Accra': 'GHS', 'Africa/Johannesburg': 'ZAR',
    'Africa/Dar_es_Salaam': 'TZS', 'Africa/Kampala': 'UGX', 'Africa/Kigali': 'RWF', 'Africa/Addis_Ababa': 'ETB',
    'Africa/Cairo': 'EGP', 'Africa/Casablanca': 'MAD', 'Africa/Dakar': 'XOF', 'Africa/Abidjan': 'XOF',
    'Africa/Douala': 'XAF', 'Africa/Lusaka': 'ZMW', 'Africa/Gaborone': 'BWP', 'Indian/Mauritius': 'MUR',
    'Europe/London': 'GBP', 'Europe/Zurich': 'CHF', 'Asia/Dubai': 'AED', 'Asia/Riyadh': 'SAR',
    'America/Toronto': 'CAD', 'America/Vancouver': 'CAD', 'Asia/Kolkata': 'INR', 'Asia/Calcutta': 'INR',
    'Asia/Shanghai': 'CNY', 'Asia/Tokyo': 'JPY'
  };
  function guess() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (TZ_CUR[tz]) return TZ_CUR[tz];
      if (/^Europe\//.test(tz)) return 'EUR';
      if (/^America\//.test(tz)) return 'USD';
      if (/^Australia\//.test(tz)) return 'AUD';
    } catch (e) {}
    return 'KES';
  }

  function lsGet(k) { try { var r = localStorage.getItem(k); return r == null ? null : JSON.parse(r); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var stored = lsGet(RATES_KEY);
  var S = {
    code: null,
    rates: stored && stored.rates && Date.now() - (stored.at || 0) < 7 * 864e5 ? stored.rates : REFERENCE,
    updated: stored && stored.updated || null,
    source: stored && stored.source || 'reference',
    live: !!(stored && stored.rates && Date.now() - (stored.at || 0) < 12 * 3600e3)
  };
  (function () {
    var c = lsGet(KEY);
    S.code = typeof c === 'string' && META[c] ? c : guess();
  })();

  function code() { return S.code; }
  function rate(c) { var r = Number(S.rates[c || S.code]); return r > 0 ? r : (REFERENCE[c || S.code] || 1); }
  function toLocal(kes, c) { return Number(kes) * rate(c); }
  function toKes(amount, c) { return Number(amount) / rate(c); }
  function sym(c) { return (META[c || S.code] || META.KES).s; }

  /* A converted price is an estimate, so it is rounded the way a person
     would say it. KES is the real price and is never rounded beyond the
     shilling. */
  function nice(v, c) {
    if (c === 'KES') return Math.round(v);
    var a = Math.abs(v);
    if (a >= 100000) return Math.round(v / 1000) * 1000;
    if (a >= 10000) return Math.round(v / 100) * 100;
    if (a >= 1000) return Math.round(v / 10) * 10;
    return Math.round(v);
  }
  function compactNum(v) {
    var a = Math.abs(v);
    if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (a >= 1e3) return (v / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K';
    return String(Math.round(v));
  }
  function withSym(c, numText) {
    var m = META[c] || META.KES;
    return m.w ? m.s + ' ' + numText : m.s + numText;
  }

  /* format(kes, { code, compact, approx, bare })
       approx: show '≈' on converted numbers (default true)
       bare:   number only, no symbol */
  function format(kes, o) {
    o = o || {};
    var c = o.code || S.code;
    var n = Number(kes);
    if (!isFinite(n)) return '';
    var v = nice(toLocal(n, c), c);
    var txt = o.compact ? compactNum(v) : v.toLocaleString('en-US');
    var out = o.bare ? txt : withSym(c, txt);
    return (c !== 'KES' && o.approx !== false ? '≈ ' : '') + out;
  }
  /* An amount already in the display currency. */
  function formatLocal(v, o) {
    o = o || {};
    var c = o.code || S.code;
    var txt = o.compact ? compactNum(v) : nice(v, c).toLocaleString('en-US');
    return o.bare ? txt : withSym(c, txt);
  }
  /* A slider step that lands on round numbers in any currency. */
  function niceStep(kesStep, c) {
    var raw = toLocal(kesStep || 250, c);
    var p = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-9))));
    var m = raw / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }

  function fire(name, detail) {
    try { global.dispatchEvent(new CustomEvent(name, { detail: detail })); } catch (e) {}
  }
  function set(c) {
    if (!META[c] || c === S.code) return;
    S.code = c;
    lsSet(KEY, c);
    fire('cabana:currency', { code: c });
  }
  global.addEventListener('storage', function (e) {
    if (e.key === KEY) {
      var c = lsGet(KEY);
      if (META[c] && c !== S.code) { S.code = c; fire('cabana:currency', { code: c }); }
    }
  });

  /* ── live rates ──────────────────────────────────────────────────── */
  var _ready = null;
  function fetchJSON(url, ms) {
    return new Promise(function (resolve, reject) {
      var ctl = global.AbortController ? new AbortController() : null;
      var t = setTimeout(function () { if (ctl) ctl.abort(); reject(new Error('timeout')); }, ms);
      fetch(url, ctl ? { signal: ctl.signal } : {}).then(function (r) {
        clearTimeout(t);
        if (!r.ok) return reject(new Error('http ' + r.status));
        r.json().then(resolve, reject);
      }, function (e) { clearTimeout(t); reject(e); });
    });
  }
  function accept(rates, updated, source) {
    var clean = {}, n = 0;
    Object.keys(META).forEach(function (c) {
      var v = Number(rates && rates[c]);
      if (v > 0 && isFinite(v)) { clean[c] = v; n++; }
    });
    if (n < 6) return false;
    clean.KES = 1;
    S.rates = clean; S.updated = updated || Date.now(); S.source = source; S.live = true;
    lsSet(RATES_KEY, { rates: clean, updated: S.updated, source: source, at: Date.now() });
    fire('cabana:fx-rates', info());
    return true;
  }
  function refresh() {
    if (_ready) return _ready;
    if (S.live) { _ready = Promise.resolve(info()); return _ready; }
    _ready = fetchJSON(API, 4500).then(function (d) {
      if (!d || !d.ok || !accept(d.rates, d.updated, d.source)) throw new Error('bad');
      return info();
    }).catch(function () {
      return fetchJSON(DIRECT, 4500).then(function (d) {
        if (!d || d.result !== 'success' || !accept(d.rates, Number(d.time_last_update_unix) * 1000, 'open.er-api.com')) throw new Error('bad');
        return info();
      });
    }).catch(function () { return info(); });
    return _ready;
  }
  function info() {
    return { code: S.code, live: S.live, source: S.source, updated: S.updated, rate: rate(S.code) };
  }
  function ago(ts) {
    if (!ts) return '';
    var m = Math.round((Date.now() - ts) / 60000);
    if (m < 2) return 'just now';
    if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60);
    if (h < 36) return h + ' h ago';
    return Math.round(h / 24) + ' days ago';
  }

  /* ── the chooser ─────────────────────────────────────────────────── */
  var CSS = [
    '.cfx-scrim{position:fixed;inset:0;z-index:2147482500;background:rgba(10,8,30,.36);opacity:0;transition:opacity .25s cubic-bezier(.22,1,.36,1);}',
    '.cfx-scrim.on{opacity:1;}',
    '.cfx{position:fixed;z-index:2147482501;width:min(380px,calc(100vw - 24px));max-height:min(560px,calc(100vh - 40px));display:flex;flex-direction:column;',
    'background:#fff;color:#120F2B;border-radius:22px;border:1px solid rgba(18,15,43,.08);box-shadow:0 4px 14px rgba(18,15,43,.08),0 30px 80px rgba(20,10,60,.24);',
    "font-family:'Geist','Inter',system-ui,-apple-system,sans-serif;opacity:0;transform:translateY(-6px) scale(.985);transition:opacity .22s cubic-bezier(.22,1,.36,1),transform .3s cubic-bezier(.22,1,.36,1);overflow:hidden;}",
    '.cfx.on{opacity:1;transform:none;}',
    '@media(max-width:640px){.cfx{left:0!important;right:0;top:auto!important;bottom:0;width:100%;max-height:82vh;border-radius:24px 24px 0 0;transform:translateY(30px);padding-bottom:env(safe-area-inset-bottom,0);}.cfx.on{transform:none;}}',
    '.cfx-head{padding:16px 18px 10px;display:flex;align-items:flex-start;gap:12px;}',
    '.cfx-head h2{margin:0;font-size:16px;font-weight:700;letter-spacing:-.015em;}',
    '.cfx-head p{margin:3px 0 0;font-size:12px;line-height:1.45;color:#8C89A6;}',
    '.cfx-x{margin-left:auto;flex-shrink:0;width:32px;height:32px;border-radius:50%;border:0;background:rgba(18,15,43,.06);color:#4B4867;display:grid;place-items:center;cursor:pointer;}',
    '.cfx-x svg{width:14px;height:14px;}',
    '.cfx-find{margin:0 14px 8px;position:relative;}',
    '.cfx-find input{width:100%;box-sizing:border-box;height:40px;border-radius:12px;border:1px solid rgba(18,15,43,.1);background:#F6F4FD;padding:0 12px 0 36px;font:500 14px/1 inherit;color:#120F2B;outline:none;}',
    '.cfx-find input:focus{border-color:rgba(123,47,247,.45);box-shadow:0 0 0 3px rgba(123,47,247,.1);background:#fff;}',
    '.cfx-find svg{position:absolute;left:12px;top:50%;width:15px;height:15px;transform:translateY(-50%);color:#8C89A6;}',
    '.cfx-list{overflow-y:auto;overscroll-behavior:contain;padding:2px 8px 8px;}',
    '.cfx-g{font-size:9.5px;font-weight:750;letter-spacing:.15em;text-transform:uppercase;color:#8C89A6;padding:10px 10px 5px;}',
    '.cfx-row{display:flex;align-items:center;gap:11px;width:100%;border:0;background:none;padding:9px 10px;border-radius:12px;cursor:pointer;text-align:left;font:inherit;color:inherit;}',
    '.cfx-row:hover,.cfx-row:focus-visible{background:rgba(123,47,247,.06);outline:none;}',
    '.cfx-row[aria-checked=true]{background:rgba(123,47,247,.09);}',
    '.cfx-code{flex-shrink:0;min-width:46px;height:30px;padding:0 6px;border-radius:9px;display:grid;place-items:center;font-size:11.5px;font-weight:800;letter-spacing:.04em;background:rgba(18,15,43,.05);color:#4B4867;}',
    '.cfx-row[aria-checked=true] .cfx-code{background:linear-gradient(135deg,#7B2FF7,#4D96FF);color:#fff;}',
    '.cfx-name{flex:1;min-width:0;display:flex;flex-direction:column;}',
    '.cfx-name b{font-size:13.5px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.cfx-name span{font-size:11.5px;color:#8C89A6;margin-top:1px;font-variant-numeric:tabular-nums;}',
    '.cfx-tick{width:16px;height:16px;color:#7B2FF7;opacity:0;}',
    '.cfx-row[aria-checked=true] .cfx-tick{opacity:1;}',
    '.cfx-foot{border-top:1px solid rgba(18,15,43,.07);padding:10px 16px 12px;font-size:11.5px;line-height:1.5;color:#8C89A6;display:flex;gap:8px;align-items:flex-start;}',
    '.cfx-foot svg{width:14px;height:14px;flex-shrink:0;margin-top:1px;color:#0E9384;}',
    '.cfx-foot b{color:#4B4867;font-weight:650;}',
    '.cfx-none{padding:18px;text-align:center;font-size:12.5px;color:#8C89A6;}'
  ].join('');
  function ensureCSS() {
    if (D.getElementById('cfx-css')) return;
    var st = D.createElement('style');
    st.id = 'cfx-css';
    st.textContent = CSS;
    (D.head || D.documentElement).appendChild(st);
  }

  var P = null;
  function closePicker() {
    if (!P) return;
    var p = P; P = null;
    p.el.classList.remove('on'); p.scrim.classList.remove('on');
    D.removeEventListener('keydown', p.key, true);
    global.removeEventListener('resize', p.place);
    setTimeout(function () { p.el.remove(); p.scrim.remove(); }, 260);
    try { if (p.anchor && D.contains(p.anchor)) p.anchor.focus({ preventScroll: true }); } catch (e) {}
  }

  function rowsHTML(filter) {
    var q = String(filter || '').trim().toLowerCase();
    var cur = S.code, local = guess();
    var groups = [
      { t: 'Suggested', list: [cur, 'KES', local, 'USD', 'EUR', 'GBP'] },
      { t: 'Across Africa', list: Object.keys(META).filter(function (c) { return META[c].g === 'africa'; }) },
      { t: 'Rest of the world', list: Object.keys(META).filter(function (c) { return META[c].g !== 'africa'; }) }
    ];
    var shown = {}, html = '', any = false;
    var sample = 2500;
    groups.forEach(function (g) {
      var items = g.list.filter(function (c, i, a) {
        if (!META[c] || a.indexOf(c) !== i) return false;
        if (q) return c.toLowerCase().indexOf(q) > -1 || META[c].n.toLowerCase().indexOf(q) > -1;
        return !shown[c];
      });
      if (q) items = items.filter(function (c) { return !shown[c]; });
      if (!items.length) return;
      html += '<div class="cfx-g">' + esc(g.t) + '</div>';
      items.forEach(function (c) {
        shown[c] = 1; any = true;
        var eg = c === 'KES' ? 'Hosts price in KES' : 'KES 2,500 ≈ ' + format(sample, { code: c, approx: false });
        html += '<button type="button" class="cfx-row" role="menuitemradio" data-c="' + c + '" aria-checked="' + (c === cur) + '">' +
          '<span class="cfx-code">' + c + '</span>' +
          '<span class="cfx-name"><b>' + esc(META[c].n) + '</b><span>' + esc(eg) + '</span></span>' +
          '<svg class="cfx-tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' +
          '</button>';
      });
    });
    return any ? html : '<div class="cfx-none">No currency by that name.</div>';
  }

  function footHTML() {
    var src = S.live ? 'Live rates from ' + esc(S.source) + (S.updated ? ', updated ' + ago(S.updated) : '') : 'Reference rates while live ones load';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>' +
      '<span><b>You always pay the host’s price, in KES.</b> Other currencies are a guide, converted at today’s rate. ' + src + '.</span>';
  }

  /* picker(anchor, { onPick }) */
  function picker(anchor, o) {
    o = o || {};
    if (P) { closePicker(); return; }
    ensureCSS();
    refresh().then(function () {
      if (!P) return;
      P.list.innerHTML = rowsHTML(P.input.value);
      P.foot.innerHTML = footHTML();
    });
    var scrim = D.createElement('div');
    scrim.className = 'cfx-scrim';
    var el = D.createElement('div');
    el.className = 'cfx';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Choose a currency');
    el.innerHTML = '<div class="cfx-head"><div><h2>Show prices in</h2><p>Choose the currency you think in. Every stay still shows its real price.</p></div>' +
      '<button type="button" class="cfx-x" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>' +
      '<div class="cfx-find"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.2-4.2"/></svg>' +
      '<input type="search" placeholder="Search currencies" aria-label="Search currencies" autocomplete="off"></div>' +
      '<div class="cfx-list" role="menu"></div><div class="cfx-foot"></div>';
    D.body.appendChild(scrim);
    D.body.appendChild(el);
    var input = el.querySelector('input'), list = el.querySelector('.cfx-list'), foot = el.querySelector('.cfx-foot');
    list.innerHTML = rowsHTML('');
    foot.innerHTML = footHTML();

    function place() {
      if (global.innerWidth <= 640 || !anchor) { el.style.left = ''; el.style.top = ''; return; }
      var b = anchor.getBoundingClientRect(), w = el.offsetWidth || 380, h = el.offsetHeight || 480;
      var left = Math.min(Math.max(12, b.right - w), global.innerWidth - w - 12);
      var top = b.bottom + 8;
      if (top + h > global.innerHeight - 12) top = Math.max(12, b.top - h - 8);
      el.style.left = Math.round(left) + 'px';
      el.style.top = Math.round(top) + 'px';
    }
    function key(e) {
      if (e.key === 'Escape') { e.preventDefault(); closePicker(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        var rows = Array.prototype.slice.call(list.querySelectorAll('.cfx-row'));
        if (!rows.length) return;
        e.preventDefault();
        var i = rows.indexOf(D.activeElement);
        i = e.key === 'ArrowDown' ? Math.min(rows.length - 1, i + 1) : Math.max(0, i - 1);
        rows[i].focus();
      }
    }
    P = { el: el, scrim: scrim, anchor: anchor, input: input, list: list, foot: foot, key: key, place: place };
    place();
    D.addEventListener('keydown', key, true);
    global.addEventListener('resize', place);
    scrim.addEventListener('click', closePicker);
    el.querySelector('.cfx-x').addEventListener('click', closePicker);
    input.addEventListener('input', function () { list.innerHTML = rowsHTML(input.value); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { var first = list.querySelector('.cfx-row'); if (first) first.click(); }
    });
    list.addEventListener('click', function (e) {
      var b = e.target.closest('.cfx-row');
      if (!b) return;
      set(b.getAttribute('data-c'));
      if (o.onPick) { try { o.onPick(S.code); } catch (x) {} }
      closePicker();
    });
    requestAnimationFrame(function () {
      el.classList.add('on'); scrim.classList.add('on');
      place();
      var on = list.querySelector('[aria-checked=true]');
      try { (global.innerWidth > 640 ? input : (on || input)).focus({ preventScroll: true }); } catch (e) {}
      if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest' });
    });
  }

  global.CabanaFX = {
    code: code, set: set, rate: rate, toLocal: toLocal, toKes: toKes, symbol: sym,
    format: format, formatLocal: formatLocal, nice: nice, compact: compactNum, niceStep: niceStep,
    meta: function (c) { return META[c || S.code] || null; },
    list: function () { return Object.keys(META); },
    info: info, ready: refresh, picker: picker, closePicker: closePicker, ago: ago
  };
  refresh();
})(window);
