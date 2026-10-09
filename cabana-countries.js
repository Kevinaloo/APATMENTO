/* ═══════════════════════════════════════════════════════════════════════
   CABANA · COUNTRIES, DIAL CODES AND THE PICKER THEY SHARE
   cabana-countries.js

   Two things every form on the platform kept getting wrong:

     PHONE NUMBERS  A single text box that expected "+254 7XX…" typed by
                    hand. Nobody types a country code on a phone, and half
                    the numbers we stored were missing one.
     COUNTRIES      A hand-picked dropdown of 54 (profile) or five (an old
                    listing form). Everyone else was told, in effect, that
                    they do not exist.

   Both are the same problem — choose one of the world's countries quickly
   — so both are the same component: a search-first sheet over every
   country and territory with an ITU calling code, flags included.

   WHAT THIS EXPORTS   window.CabanaCountries
     .all                     [{iso, name, dial, flag, example, region}]
     .byIso(iso) / .name(iso) / .flag(iso)
     .pick({title, mode})     Promise<country|null>  the bare sheet
     .enhancePhone(input)     country-code box + national number field
     .enhanceSelect(select)   searchable country picker over a <select>

   Phone inputs and country selects are upgraded automatically:
     <input type="tel">                 every one, unless data-no-cc
     <select data-country="iso|name">   iso: option values are ISO codes
                                        name: option values are English names

   THE CONTRACT THAT KEEPS EXISTING FORMS WORKING
   ──────────────────────────────────────────────
   An enhanced phone input is still the same element with the same id.
   Its `.value` getter returns the full international number
   ("+254712345678", or "" when empty) and its setter accepts anything a
   database may hold — "+254 712 345678", "254712345678", "0712345678" —
   and shows it correctly. Code that reads and writes `.value` needs no
   change, and what reaches the database is now always E.164.
   ═══════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.CabanaCountries) return;
  var doc = global.document;

  /* ISO 3166-1 alpha-2 → ITU calling code. NANP territories carry their
     area code so "+1 876" is Jamaica, not Canada. Names come from the
     browser's own Intl data (translated, current), with English fallbacks
     below for the few Intl may not know. */
  var DIAL = {
    AD:'376',AE:'971',AF:'93',AG:'1268',AI:'1264',AL:'355',AM:'374',AO:'244',AR:'54',AS:'1684',AT:'43',AU:'61',AW:'297',AX:'35818',AZ:'994',
    BA:'387',BB:'1246',BD:'880',BE:'32',BF:'226',BG:'359',BH:'973',BI:'257',BJ:'229',BL:'590',BM:'1441',BN:'673',BO:'591',BQ:'599',BR:'55',BS:'1242',BT:'975',BW:'267',BY:'375',BZ:'501',
    CA:'1',CC:'61',CD:'243',CF:'236',CG:'242',CH:'41',CI:'225',CK:'682',CL:'56',CM:'237',CN:'86',CO:'57',CR:'506',CU:'53',CV:'238',CW:'599',CX:'61',CY:'357',CZ:'420',
    DE:'49',DJ:'253',DK:'45',DM:'1767',DO:'1809',DZ:'213',EC:'593',EE:'372',EG:'20',EH:'212',ER:'291',ES:'34',ET:'251',
    FI:'358',FJ:'679',FK:'500',FM:'691',FO:'298',FR:'33',GA:'241',GB:'44',GD:'1473',GE:'995',GF:'594',GG:'44',GH:'233',GI:'350',GL:'299',GM:'220',GN:'224',GP:'590',GQ:'240',GR:'30',GT:'502',GU:'1671',GW:'245',GY:'592',
    HK:'852',HN:'504',HR:'385',HT:'509',HU:'36',ID:'62',IE:'353',IL:'972',IM:'44',IN:'91',IO:'246',IQ:'964',IR:'98',IS:'354',IT:'39',
    JE:'44',JM:'1876',JO:'962',JP:'81',KE:'254',KG:'996',KH:'855',KI:'686',KM:'269',KN:'1869',KP:'850',KR:'82',KW:'965',KY:'1345',KZ:'7',
    LA:'856',LB:'961',LC:'1758',LI:'423',LK:'94',LR:'231',LS:'266',LT:'370',LU:'352',LV:'371',LY:'218',
    MA:'212',MC:'377',MD:'373',ME:'382',MF:'590',MG:'261',MH:'692',MK:'389',ML:'223',MM:'95',MN:'976',MO:'853',MP:'1670',MQ:'596',MR:'222',MS:'1664',MT:'356',MU:'230',MV:'960',MW:'265',MX:'52',MY:'60',MZ:'258',
    NA:'264',NC:'687',NE:'227',NF:'672',NG:'234',NI:'505',NL:'31',NO:'47',NP:'977',NR:'674',NU:'683',NZ:'64',OM:'968',
    PA:'507',PE:'51',PF:'689',PG:'675',PH:'63',PK:'92',PL:'48',PM:'508',PR:'1787',PS:'970',PT:'351',PW:'680',PY:'595',QA:'974',
    RE:'262',RO:'40',RS:'381',RU:'7',RW:'250',SA:'966',SB:'677',SC:'248',SD:'249',SE:'46',SG:'65',SH:'290',SI:'386',SJ:'4779',SK:'421',SL:'232',SM:'378',SN:'221',SO:'252',SR:'597',SS:'211',ST:'239',SV:'503',SX:'1721',SY:'963',SZ:'268',
    TC:'1649',TD:'235',TG:'228',TH:'66',TJ:'992',TK:'690',TL:'670',TM:'993',TN:'216',TO:'676',TR:'90',TT:'1868',TV:'688',TW:'886',TZ:'255',
    UA:'380',UG:'256',US:'1',UY:'598',UZ:'998',VA:'379',VC:'1784',VE:'58',VG:'1284',VI:'1340',VN:'84',VU:'678',WF:'681',WS:'685',XK:'383',YE:'967',YT:'262',ZA:'27',ZM:'260',ZW:'263'
  };

  var FALLBACK_NAME = {
    XK: 'Kosovo', CW: 'Curaçao', BQ: 'Caribbean Netherlands', SX: 'Sint Maarten', CD: 'DR Congo', CG: 'Republic of Congo',
    CI: "Côte d'Ivoire", SZ: 'Eswatini', CV: 'Cape Verde', MK: 'North Macedonia', TR: 'Türkiye', PS: 'Palestine', TL: 'Timor-Leste'
  };

  /* Kenya first, then the neighbours — a Kenyan should not scroll, a
     Ugandan should find home within a thumb flick. */
  var PRIORITY = ['KE', 'TZ', 'UG', 'RW', 'ET', 'SS', 'SO', 'BI', 'CD', 'NG', 'GH', 'ZA', 'AE', 'GB', 'US'];

  /* A real national-number shape per country is what turns a placeholder
     into guidance. Where the shape is not known the placeholder is blank
     rather than wrong. */
  var EXAMPLE = {
    KE:'712 345678',TZ:'712 345 678',UG:'712 345678',RW:'722 123 456',ET:'911 234567',SO:'61 2345678',SS:'977 123 456',BI:'79 123456',
    NG:'802 123 4567',GH:'24 123 4567',ZA:'71 123 4567',AE:'50 123 4567',GB:'7400 123456',US:'(201) 555-0123',CA:'(204) 234-5678',IN:'81234 56789',
    CN:'131 2345 6789',FR:'6 12 34 56 78',DE:'1512 3456789',IT:'312 345 6789',ES:'612 34 56 78',NL:'6 12345678',AU:'412 345 678',
    EG:'10 0123 4567',MA:'650 123456',SA:'51 234 5678',QA:'3312 3456',TR:'501 234 56 78',BR:'11 96123-4567',MX:'222 123 4567',
    JP:'90 1234 5678',KR:'10 1234 5678',SG:'8123 4567',PK:'301 2345678',BD:'1812-345678',ZM:'95 5123456',ZW:'71 234 5678',MW:'991 23 45 67',
    MZ:'82 123 4567',RU:'912 345-67-89',CD:'991 234 567',SD:'91 123 4567'
  };

  var dn = null;
  try { dn = new Intl.DisplayNames(['en'], { type: 'region' }); } catch (e) { dn = null; }

  function flagOf(iso) {
    if (!iso || iso.length !== 2) return '🌍';
    var a = 127397;
    return String.fromCodePoint(iso.charCodeAt(0) + a, iso.charCodeAt(1) + a);
  }
  function nameOf(iso) {
    if (FALLBACK_NAME[iso]) return FALLBACK_NAME[iso];
    try { var n = dn && dn.of(iso); if (n && n !== iso) return n; } catch (e) {}
    return iso;
  }

  var ALL = Object.keys(DIAL).map(function (iso) {
    return { iso: iso, name: nameOf(iso), dial: DIAL[iso], flag: flagOf(iso), example: EXAMPLE[iso] || '' };
  });
  var BY_ISO = {};
  ALL.forEach(function (c) { BY_ISO[c.iso] = c; });

  /* The browsable order: priority countries, then A–Z. */
  var ORDERED = (function () {
    var head = PRIORITY.map(function (i) { return BY_ISO[i]; }).filter(Boolean);
    var rest = ALL.filter(function (c) { return PRIORITY.indexOf(c.iso) < 0; })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });
    return { head: head, rest: rest };
  })();

  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9+ ]/g, '').trim();
  }

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ── Parsing what the database may hold ─────────────────────────────
     Longest dial-code prefix wins ("1876…" is Jamaica, "1415…" the US).
     Among countries sharing a code the lowest priority index wins, so a
     bare "+44" is the UK and "+1" the US, not Jersey or Guam. */
  var DIALS_DESC = Object.keys(DIAL).reduce(function (acc, iso) {
    (acc[DIAL[iso]] = acc[DIAL[iso]] || []).push(iso); return acc;
  }, {});
  var DIAL_LENGTHS = Object.keys(DIALS_DESC).map(function (d) { return d.length; })
    .filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return b - a; });

  /* When several countries share a code, the likelier one wins. */
  var TIE = ['US', 'GB', 'RU', 'MA', 'GP', 'NF', 'CW', 'AU', 'KE'];
  function rank(iso) {
    var t = TIE.indexOf(iso); if (t > -1) return t;
    var p = PRIORITY.indexOf(iso); return p > -1 ? 20 + p : 99;
  }

  function bestForDial(d) {
    var isos = DIALS_DESC[d];
    if (!isos) return null;
    var pick = isos.slice().sort(function (a, b) { return rank(a) - rank(b) || a.localeCompare(b); })[0];
    return BY_ISO[pick];
  }

  function splitInternational(digits) {
    for (var i = 0; i < DIAL_LENGTHS.length; i++) {
      var len = DIAL_LENGTHS[i];
      var c = bestForDial(digits.slice(0, len));
      if (c && digits.length > len) return { country: c, national: digits.slice(len) };
    }
    return null;
  }

  var home = (function () {
    try {
      var lang = (navigator.languages && navigator.languages[0]) || navigator.language || '';
      var m = /[-_]([A-Za-z]{2})$/.exec(lang);
      var iso = m && m[1].toUpperCase();
      if (iso && BY_ISO[iso]) return BY_ISO[iso];
    } catch (e) {}
    return BY_ISO.KE;
  })();

  /** Parse any stored phone string into {country, national}. */
  function parsePhone(raw, fallback) {
    var s = String(raw == null ? '' : raw).trim();
    fallback = fallback || home;
    if (!s) return { country: fallback, national: '' };
    var plus = /^\s*(\+|00)/.test(s);
    var digits = s.replace(/\D/g, '');
    if (/^\s*00/.test(s)) digits = digits.replace(/^00/, '');
    if (plus) {
      var sp = splitInternational(digits);
      if (sp) return sp;
    }
    /* "254712345678" with no plus: only trust it when it is clearly too
       long to be a national number. */
    if (!plus && !/^0/.test(digits) && digits.length >= 11) {
      var sp2 = splitInternational(digits);
      if (sp2) return sp2;
    }
    return { country: fallback, national: digits.replace(/^0+/, '') };
  }

  /* ═════════════════════════════════════════════════════════════════
     THE SHEET
     ═════════════════════════════════════════════════════════════════ */
  var CSS_ID = 'cbn-cc-css';
  var CSS = ''
    + '.ccs-scrim{position:fixed;inset:0;z-index:99990;background:rgba(9,10,20,.55);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);opacity:0;transition:opacity .22s}'
    + '.ccs-scrim.on{opacity:1}'
    + '.ccs{position:fixed;z-index:99991;left:50%;top:50%;width:min(440px,calc(100vw - 28px));height:min(620px,calc(100dvh - 48px));display:flex;flex-direction:column;'
    +   'background:#fff;color:#0A0B18;border-radius:24px;box-shadow:0 30px 90px rgba(9,10,20,.35);overflow:hidden;'
    +   'transform:translate(-50%,-46%) scale(.97);opacity:0;transition:transform .28s cubic-bezier(.22,1,.36,1),opacity .2s;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}'
    + '.ccs.on{transform:translate(-50%,-50%);opacity:1}'
    + '@media(max-width:560px){.ccs{left:0;right:0;top:auto;bottom:0;width:auto;height:min(86dvh,640px);border-radius:26px 26px 0 0;transform:translateY(105%)}.ccs.on{transform:none}}'
    + '.ccs-h{padding:14px 16px 10px;border-bottom:1px solid rgba(10,11,24,.07)}'
    + '.ccs-grip{display:none;width:38px;height:4px;border-radius:4px;background:rgba(10,11,24,.16);margin:0 auto 10px}'
    + '@media(max-width:560px){.ccs-grip{display:block}}'
    + '.ccs-t{display:flex;align-items:center;justify-content:space-between;font:800 16px/1.2 Manrope,Inter,sans-serif;letter-spacing:-.02em;margin-bottom:10px}'
    + '.ccs-x{width:34px;height:34px;border-radius:11px;border:0;background:rgba(10,11,24,.06);color:inherit;cursor:pointer;display:grid;place-items:center}'
    + '.ccs-x svg{width:15px;height:15px}'
    + '.ccs-q{display:flex;align-items:center;gap:9px;height:46px;padding:0 14px;border-radius:14px;background:#F2F3F9;border:1.5px solid transparent;transition:border-color .16s,background .16s}'
    + '.ccs-q:focus-within{background:#fff;border-color:#4361FF}'
    + '.ccs-q svg{width:17px;height:17px;flex:none;color:#8E90AD}'
    + '.ccs-q input{flex:1;min-width:0;border:0;outline:0;background:none;font:500 15px Inter,sans-serif;color:inherit}'
    + '.ccs-l{flex:1;overflow-y:auto;overscroll-behavior:contain;padding:6px 8px 12px;-webkit-overflow-scrolling:touch}'
    + '.ccs-sec{font:800 10px/1 Inter,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#8E90AD;padding:14px 10px 6px}'
    + '.ccs-r{display:flex;align-items:center;gap:12px;width:100%;padding:11px 10px;border:0;border-radius:13px;background:none;color:inherit;text-align:left;cursor:pointer;font:600 14.5px/1.25 Inter,sans-serif}'
    + '.ccs-r:hover,.ccs-r.hi{background:#F2F3F9}'
    + '.ccs-r.sel{background:rgba(67,97,255,.09)}'
    + '.ccs-f{font-size:22px;line-height:1;width:28px;text-align:center;flex:none}'
    + '.ccs-n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
    + '.ccs-d{flex:none;color:#6B6E8C;font-weight:700;font-variant-numeric:tabular-nums}'
    + '.ccs-ck{flex:none;width:18px;height:18px;color:#4361FF}'
    + '.ccs-e{padding:44px 20px;text-align:center;color:#6B6E8C;font:500 14px/1.6 Inter,sans-serif}'
    + '@media(prefers-color-scheme:dark){.ccs{background:#15161F;color:#F2F3F9}.ccs-q{background:#1F2130}.ccs-q:focus-within{background:#15161F}.ccs-r:hover,.ccs-r.hi{background:#1F2130}.ccs-x{background:rgba(255,255,255,.09)}.ccs-h{border-color:rgba(255,255,255,.08)}}'
    + '[data-theme="dark"] .ccs{background:#15161F;color:#F2F3F9}[data-theme="dark"] .ccs-q{background:#1F2130}[data-theme="dark"] .ccs-r:hover,[data-theme="dark"] .ccs-r.hi{background:#1F2130}'

    /* phone box */
    + '.ccp{display:flex;align-items:stretch;gap:8px;width:100%}'
    + '.ccp>input{flex:1;min-width:0;width:auto!important}'
    + '.ccp-b{flex:none;display:inline-flex;align-items:center;gap:6px;padding:0 11px;min-height:44px;border-radius:12px;border:1.5px solid rgba(10,11,24,.13);background:#fff;'
    +   'color:#14152E;font:700 14px Inter,system-ui,sans-serif;cursor:pointer;white-space:nowrap;transition:border-color .16s,background .16s;-webkit-tap-highlight-color:transparent}'
    + '.ccp-b:hover{border-color:#4361FF}.ccp-b:focus-visible{outline:2px solid #4361FF;outline-offset:2px}'
    + '.ccp-b .f{font-size:19px;line-height:1}.ccp-b .c{color:#4C4E6A;font-variant-numeric:tabular-nums}'
    + '.ccp-b svg{width:12px;height:12px;opacity:.55}'
    + '@media(prefers-color-scheme:dark){.ccp-b{background:#1B1D2A;color:#F2F3F9;border-color:rgba(255,255,255,.16)}.ccp-b .c{color:#C3C6DC}}'

    /* searchable country select */
    + '.ccsel{display:flex;align-items:center;gap:10px;width:100%;text-align:left;cursor:pointer}'
    + '.ccsel .f{font-size:19px;line-height:1}.ccsel .n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
    + '.ccsel .ph{opacity:.55}.ccsel svg{width:13px;height:13px;opacity:.55;flex:none}'
    + '@media(prefers-reduced-motion:reduce){.ccs,.ccs-scrim{transition:none}}';

  function injectCSS() {
    if (doc.getElementById(CSS_ID)) return;
    var st = doc.createElement('style');
    st.id = CSS_ID; st.textContent = CSS;
    doc.head.appendChild(st);
  }

  var ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  var ICON_Q = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7.5"/><path d="m20 20-3.6-3.6"/></svg>';
  var ICON_OK = '<svg class="ccs-ck" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  var ICON_CARET = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';

  var _open = null;

  /**
   * The picker sheet.
   * @param {Object} o  title, mode ('dial' shows +code, 'country' hides it),
   *                    selected (iso), placeholder
   * @returns {Promise<Object|null>} the chosen country, or null if dismissed
   */
  function pick(o) {
    o = o || {};
    if (_open) return _open;
    injectCSS();
    var showDial = o.mode !== 'country';

    var scrim = doc.createElement('div');
    scrim.className = 'ccs-scrim';
    var box = doc.createElement('div');
    box.className = 'ccs';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', o.title || 'Choose a country');
    box.innerHTML =
        '<div class="ccs-h"><div class="ccs-grip"></div>'
      + '<div class="ccs-t"><span>' + esc(o.title || (showDial ? 'Country code' : 'Choose your country')) + '</span>'
      + '<button type="button" class="ccs-x" aria-label="Close">' + ICON_X + '</button></div>'
      + '<label class="ccs-q">' + ICON_Q
      + '<input type="search" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" '
      + 'placeholder="' + esc(o.placeholder || (showDial ? 'Search country or code, e.g. Kenya or 254' : 'Search countries')) + '" aria-label="Search countries"></label></div>'
      + '<div class="ccs-l" role="listbox"></div>';
    doc.body.appendChild(scrim);
    doc.body.appendChild(box);
    var prevOverflow = doc.documentElement.style.overflow;
    doc.documentElement.style.overflow = 'hidden';
    var lastFocus = doc.activeElement;
    requestAnimationFrame(function () { scrim.classList.add('on'); box.classList.add('on'); });

    var input = box.querySelector('input');
    var list = box.querySelector('.ccs-l');
    var rows = [], hi = -1, done = false;

    function row(c) {
      var on = c.iso === o.selected;
      return '<button type="button" class="ccs-r' + (on ? ' sel' : '') + '" role="option" aria-selected="' + on + '" data-iso="' + c.iso + '">'
        + '<span class="ccs-f" aria-hidden="true">' + c.flag + '</span><span class="ccs-n">' + esc(c.name) + '</span>'
        + (showDial ? '<span class="ccs-d">+' + c.dial + '</span>' : '') + (on ? ICON_OK : '') + '</button>';
    }

    function render(q) {
      q = norm(q);
      var html = '';
      if (!q) {
        html += '<div class="ccs-sec">Popular</div>' + ORDERED.head.map(row).join('')
          + '<div class="ccs-sec">All countries</div>' + ORDERED.rest.map(row).join('');
      } else {
        var digits = q.replace(/[^0-9]/g, '');
        var hits = ALL.filter(function (c) {
          var n = norm(c.name);
          return n.indexOf(q) === 0 || (' ' + n).indexOf(' ' + q) > -1 || c.iso.toLowerCase() === q
            || (showDial && digits && c.dial.indexOf(digits) === 0 && /^[+0-9 ]+$/.test(q));
        }).sort(function (a, b) {
          var an = norm(a.name).indexOf(q) === 0 ? 0 : 1, bn = norm(b.name).indexOf(q) === 0 ? 0 : 1;
          if (an !== bn) return an - bn;
          var pa = PRIORITY.indexOf(a.iso), pb = PRIORITY.indexOf(b.iso);
          pa = pa < 0 ? 99 : pa; pb = pb < 0 ? 99 : pb;
          return pa - pb || a.name.localeCompare(b.name);
        });
        html = hits.length ? hits.map(row).join('')
          : '<div class="ccs-e">No country matches “' + esc(q) + '”.<br>Try the country name or its calling code.</div>';
      }
      list.innerHTML = html;
      rows = [].slice.call(list.querySelectorAll('.ccs-r'));
      hi = -1;
      if (q && rows.length) setHi(0);
    }
    function setHi(i) {
      if (!rows.length) return;
      hi = (i + rows.length) % rows.length;
      rows.forEach(function (r, k) { r.classList.toggle('hi', k === hi); });
      rows[hi].scrollIntoView({ block: 'nearest' });
    }

    var p = new Promise(function (resolve) {
      function finish(c) {
        if (done) return; done = true;
        doc.removeEventListener('keydown', onKey, true);
        scrim.classList.remove('on'); box.classList.remove('on');
        doc.documentElement.style.overflow = prevOverflow;
        setTimeout(function () { scrim.remove(); box.remove(); }, 260);
        _open = null;
        try { lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true }); } catch (e) {}
        resolve(c || null);
      }
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(null); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); setHi(hi + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(hi - 1); }
        else if (e.key === 'Enter' && rows[hi]) { e.preventDefault(); finish(BY_ISO[rows[hi].getAttribute('data-iso')]); }
      }
      doc.addEventListener('keydown', onKey, true);
      scrim.addEventListener('click', function () { finish(null); });
      box.querySelector('.ccs-x').addEventListener('click', function () { finish(null); });
      list.addEventListener('click', function (e) {
        var r = e.target.closest && e.target.closest('.ccs-r');
        if (r) finish(BY_ISO[r.getAttribute('data-iso')]);
      });
      input.addEventListener('input', function () { render(input.value); });
    });
    _open = p;

    render('');
    var sel = list.querySelector('.ccs-r.sel');
    if (sel) setTimeout(function () { sel.scrollIntoView({ block: 'center' }); }, 40);
    setTimeout(function () { try { input.focus({ preventScroll: true }); } catch (e) {} }, 120);
    return p;
  }

  /* ═════════════════════════════════════════════════════════════════
     PHONE
     ═════════════════════════════════════════════════════════════════ */
  var NATIVE = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

  function enhancePhone(input, opts) {
    if (!input || input.__ccp) return input && input.__ccp;
    opts = opts || {};
    injectCSS();

    var country = BY_ISO[(opts.country || input.getAttribute('data-cc-default') || '').toUpperCase()] || home;
    var wrap = doc.createElement('div');
    wrap.className = 'ccp';
    var btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'ccp-b';
    btn.setAttribute('aria-haspopup', 'dialog');
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(btn);
    wrap.appendChild(input);

    input.setAttribute('inputmode', 'tel');
    input.setAttribute('autocomplete', 'tel-national');
    input.__ccp = { get country() { return country; } };

    function nat() { return String(NATIVE.get.call(input)).replace(/\D/g, '').replace(/^0+/, ''); }

    function paint() {
      btn.innerHTML = '<span class="f" aria-hidden="true">' + country.flag + '</span><span class="c">+' + country.dial + '</span>' + ICON_CARET;
      btn.setAttribute('aria-label', 'Country code: ' + country.name + ' plus ' + country.dial + '. Change');
      input.placeholder = country.example || 'Phone number';
    }
    function setCountry(c) { country = c; paint(); }

    /* A pasted or auto-filled full number moves the country with it. */
    function adopt() {
      var raw = String(NATIVE.get.call(input));
      if (/^\s*(\+|00)/.test(raw)) {
        var p = parsePhone(raw, country);
        setCountry(p.country);
        NATIVE.set.call(input, p.national);
      }
    }

    Object.defineProperty(input, 'value', {
      configurable: true,
      get: function () { var n = nat(); return n ? '+' + country.dial + n : ''; },
      set: function (v) {
        var s = String(v == null ? '' : v);
        if (!s.trim()) { NATIVE.set.call(input, ''); return; }
        var p = parsePhone(s, country);
        setCountry(p.country);
        NATIVE.set.call(input, p.national);
      }
    });

    input.addEventListener('input', function () {
      var raw = String(NATIVE.get.call(input));
      if (/^\s*(\+|00)/.test(raw) && raw.replace(/\D/g, '').length > 7) adopt();
    });
    input.addEventListener('blur', adopt);

    btn.addEventListener('click', function () {
      pick({ title: 'Country code', mode: 'dial', selected: country.iso }).then(function (c) {
        if (c) { setCountry(c); input.focus(); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); }
      });
    });

    /* Whatever the page had already put in (or the browser autofilled)
       is read through the new setter, so it lands in the right country. */
    var pre = String(NATIVE.get.call(input));
    paint();
    if (pre.trim()) input.value = pre;
    return input.__ccp;
  }

  /* ═════════════════════════════════════════════════════════════════
     COUNTRY SELECT
     ═════════════════════════════════════════════════════════════════ */
  function enhanceSelect(sel, opts) {
    if (!sel || sel.__ccsel) return;
    opts = opts || {};
    injectCSS();
    var kind = opts.kind || sel.getAttribute('data-country') || 'iso';   /* 'iso' | 'name' */
    var blank = opts.blank || (sel.querySelector('option[value=""]') || {}).textContent || 'Choose your country';
    if (/^\s*(choose|select)\s*…?\s*$/i.test(blank)) blank = 'Choose your country';

    /* Every country, not the curated few the page shipped with. */
    var all = ALL.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    sel.innerHTML = '<option value="">' + esc(blank) + '</option>' + all.map(function (c) {
      return '<option value="' + esc(kind === 'name' ? c.name : c.iso) + '">' + esc(c.name) + '</option>';
    }).join('');

    var btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = (sel.className ? sel.className + ' ' : '') + 'ccsel';
    btn.id = sel.id ? sel.id + '-cc' : '';
    btn.setAttribute('aria-haspopup', 'dialog');
    sel.style.display = 'none';
    sel.parentNode.insertBefore(btn, sel);
    sel.__ccsel = btn;
    /* The label should focus the visible control. */
    if (sel.id) {
      var lbl = doc.querySelector('label[for="' + sel.id + '"]');
      if (lbl && btn.id) lbl.setAttribute('for', btn.id);
    }

    function current() {
      var v = sel.value;
      for (var i = 0; i < all.length; i++) if ((kind === 'name' ? all[i].name : all[i].iso) === v) return all[i];
      /* Stored names can differ from Intl's ("Ivory Coast" vs "Côte d'Ivoire"). */
      if (kind === 'name' && v) {
        var q = norm(v);
        for (var j = 0; j < all.length; j++) if (norm(all[j].name) === q) return all[j];
      }
      return null;
    }
    function paint() {
      var c = current();
      btn.innerHTML = c
        ? '<span class="f" aria-hidden="true">' + c.flag + '</span><span class="n">' + esc(c.name) + '</span>' + ICON_CARET
        : '<span class="n ph">' + esc(blank) + '</span>' + ICON_CARET;
    }

    /* Programmatic `.value =` (profile load, edit mode) must repaint. */
    var d = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    Object.defineProperty(sel, 'value', {
      configurable: true,
      get: function () { return d.get.call(sel); },
      set: function (v) {
        var s = String(v == null ? '' : v);
        if (kind === 'name' && s && !sel.querySelector('option[value="' + s.replace(/"/g, '\\"') + '"]')) {
          var q = norm(s), hit = all.filter(function (c) { return norm(c.name) === q; })[0];
          if (hit) s = hit.name;
        }
        d.set.call(sel, s); paint();
      }
    });
    var ds = sel.getAttribute('data-value');
    if (ds) sel.value = ds;

    btn.addEventListener('click', function () {
      var c = current();
      pick({ title: opts.title || 'Choose your country', mode: 'country', selected: c && c.iso }).then(function (x) {
        if (!x) return;
        d.set.call(sel, kind === 'name' ? x.name : x.iso);
        paint();
        sel.dispatchEvent(new Event('input', { bubbles: true }));
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      });
      btn.blur();
    });
    sel.addEventListener('change', paint);
    /* A page that refills the options later (apa-geo's fillCountrySelect)
       must not leave the visible control describing the old list. */
    if (global.MutationObserver) new MutationObserver(paint).observe(sel, { childList: true });
    paint();
  }

  /* ── Auto-upgrade ──────────────────────────────────────────────────── */
  function autoUpgrade(root) {
    root = root || doc;
    [].forEach.call(root.querySelectorAll('input[type="tel"]:not([data-no-cc])'), function (i) { enhancePhone(i); });
    [].forEach.call(root.querySelectorAll('select[data-country]'), function (s) { enhanceSelect(s); });
  }

  global.CabanaCountries = {
    all: ALL,
    ordered: ORDERED,
    byIso: function (i) { return BY_ISO[String(i || '').toUpperCase()] || null; },
    name: function (i) { var c = BY_ISO[String(i || '').toUpperCase()]; return c ? c.name : (i || ''); },
    flag: flagOf,
    parsePhone: parsePhone,
    pick: pick,
    enhancePhone: enhancePhone,
    enhanceSelect: enhanceSelect,
    upgrade: autoUpgrade
  };

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { autoUpgrade(); });
  else autoUpgrade();
  if (global.MutationObserver) {
    var t = 0;
    new MutationObserver(function () { clearTimeout(t); t = setTimeout(autoUpgrade, 80); })
      .observe(doc.documentElement, { childList: true, subtree: true });
  }
})(window);
