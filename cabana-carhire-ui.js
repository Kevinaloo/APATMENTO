/* ═══════════════════════════════════════════════════════════════════
   CABANA DRIVE · the renter's app
   ───────────────────────────────────────────────────────────────────
   One page, four doors:

     browse   the live fleet near a pickup, for real dates, each car
              checked against the road you will drive (trip check)
     book     a car sheet that prices the hire on the server from the
              operator's own rates, then books it (car_booking_place)
     request  no car where you need one? post what you need; operators
              and the Cabana desk answer with offers (car_request_place)
     track    the hire or request as it moves: confirmation, the
              handover code, how to pay the operator, the return

   Money is the operator's. Every figure shown before booking comes from
   car_quote(); the card prices are the operator's day rate × days,
   labelled as such. Cabana's line is zero and says so.

   Needs: cabana-carhire-core.js (window.CabanaCarHire), apa-geo.js,
   apa-session.js, cabana-motion.js. Server contract:
   supabase/migrations/20260925140000_cabana_drive_bookings.sql
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var doc = global.document;
  var E = global.CabanaCarHire;
  var M = global.CabanaMotion || null;
  if (!E) return;

  /* ── 0 · words ───────────────────────────────────────────────────── */
  var ERR = {
    vehicle_unavailable: 'This car is no longer available. Pick another.',
    operator_unavailable: 'This operator is not taking bookings right now.',
    operator_paused: 'This operator has paused bookings for now.',
    request_malformed: 'Part of the booking could not be read. Please try again.',
    dates_invalid: 'Choose a pickup and a return time.',
    pickup_too_soon: 'Pickup must be at least 2 hours from now.',
    pickup_too_far: 'You can book up to a year ahead.',
    return_too_soon: 'A hire is at least 4 hours long.',
    hire_too_long: 'Hires run up to 90 days. For longer, send a car request.',
    name_required: 'Add the renter’s name.',
    phone_required: 'Add a phone number the operator can call.',
    email_invalid: 'That email does not look right.',
    driver_too_young: 'The driver is below this car’s minimum age.',
    licence_too_new: 'This car needs a licence held for longer.',
    vehicle_booked: 'Someone just booked this car for those dates. Try other dates or another car.',
    too_many_open: 'You have several hire requests waiting. Wait for answers or cancel one.',
    too_many_requests: 'Too many requests from this number. Try again later.',
    min_days: 'This car has a minimum hire length.',
    chauffeur_unavailable: 'This operator does not offer a driver with this car.',
    delivery_unavailable: 'This operator does not deliver this car.',
    delivery_address_required: 'Choose the delivery address.',
    delivery_too_far: 'That address is outside the operator’s delivery area.',
    extra_unknown: 'One of the extras is no longer offered.',
    cross_border_unavailable: 'This car cannot cross borders.',
    booking_not_found: 'We could not find that hire on this device.',
    too_late_to_cancel: 'This hire can no longer be cancelled here. Call the operator.',
    rate_after_hire: 'You can rate once the car is back.',
    already_rated: 'You already rated this hire. Thank you.',
    rating_invalid: 'Choose one to five stars.',
    country_invalid: 'Car requests are for pickups in Africa.',
    pickup_required: 'Choose where you want the car.',
    request_not_found: 'We could not find that request on this device.',
    request_closed: 'This request is closed.',
    offer_gone: 'That offer was withdrawn.',
    offer_expired: 'That offer expired.'
  };

  var CLASS_LABEL = { economy: 'Economy', compact: 'Saloon', crossover: 'Crossover', suv4x4: '4×4', safari: 'Safari 4×4', luxury: 'Executive', van: 'Van', pickup: 'Pickup' };
  var CLASS_BODY = { economy: 'hatchback', compact: 'sedan', crossover: 'suv', suv4x4: 'suv', safari: 'safari', luxury: 'luxury', van: 'van', pickup: 'pickup' };
  var CLASS_PAINT = { economy: '#f7c948', compact: '#2e6be6', crossover: '#16c5b8', suv4x4: '#1e252b', safari: '#d9c7a5', luxury: '#0b1f2a', van: '#f4f7f8', pickup: '#c4cdd3' };
  var PAINT = [
    ['white', '#f4f7f8'], ['pearl', '#f4f7f8'], ['black', '#1e252b'], ['silver', '#c4cdd3'], ['grey', '#7e8a94'], ['gray', '#7e8a94'],
    ['blue', '#2e6be6'], ['navy', '#1b2f6b'], ['red', '#e23a4e'], ['maroon', '#7d2233'], ['green', '#27a36b'], ['beige', '#d9c7a5'],
    ['sand', '#d9c7a5'], ['brown', '#7a5230'], ['gold', '#d4a94a'], ['orange', '#ff8a2a'], ['yellow', '#f7c948'], ['purple', '#6b3fa0']
  ];
  var ROUTES = [
    ['Nairobi', -1.2864, 36.8172, 'Masai Mara', -1.4931, 35.1439, 'KE'], ['Nairobi', -1.2864, 36.8172, 'Amboseli', -2.6527, 37.2606, 'KE'],
    ['Nairobi', -1.2864, 36.8172, 'Naivasha', -0.7170, 36.4310, 'KE'], ['Mombasa', -4.0435, 39.6682, 'Diani', -4.2796, 39.5947, 'KE'],
    ['Nairobi', -1.2864, 36.8172, 'Nanyuki', 0.0064, 37.0722, 'KE'], ['Arusha', -3.3869, 36.6830, 'Serengeti', -2.3333, 34.8333, 'TZ'],
    ['Kigali', -1.9441, 30.0619, 'Volcanoes NP', -1.4833, 29.5333, 'RW'], ['Cape Town', -33.9249, 18.4241, 'Hermanus', -34.4187, 19.2345, 'ZA'],
    ['Windhoek', -22.5609, 17.0658, 'Sossusvlei', -24.7275, 15.2917, 'NA'], ['Marrakech', 31.6295, -7.9811, 'Atlas Mountains', 31.0600, -7.9150, 'MA']
  ];

  /* ── 1 · helpers ─────────────────────────────────────────────────── */
  function $(id) { return doc.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  /* Car hire stores hundredths of the operator's currency (car_money). */
  function money(minor, cur) { return E.formatMoney(Number(minor || 0) / 100, cur || 'KES'); }
  function moneyMajor(v, cur) { return E.formatMoney(v, cur || 'KES'); }
  function moneyHTML(minor, cur) {
    var m = money(minor, cur), c = String(cur || 'KES').toUpperCase();
    if (m.indexOf(c + ' ') !== 0) return esc(m);
    return '<span class="dv-cur">' + esc(c) + '</span>' + esc(m.slice(c.length + 1));
  }
  function digits(s) { return String(s || '').replace(/\D+/g, ''); }
  function icon(name) {
    var P = {
      pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
      locate: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7.5"/>',
      plane: '<path d="M2.5 13.5 21 6.5l-2.2 7.2-7.4 1.6-3.6 4.2-.7-4-4.6-2Z"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
      x: '<path d="M6 6l12 12M18 6 6 18"/>',
      check: '<path d="M20 6 9 17l-5-5"/>',
      seat: '<path d="M7 4v9a2 2 0 0 0 2 2h7l2 5"/><path d="M7 13h9"/>',
      gear: '<circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M6 8v8M18 8v3a1 1 0 0 1-1 1H6"/>',
      fuel: '<path d="M4 20V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v14M4 12h10M14 9h2.5a1.5 1.5 0 0 1 1.5 1.5V17a1.5 1.5 0 0 0 3 0V8l-3-3"/>',
      drive: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2"/><path d="M4 10.5c5.3 1.2 10.7 1.2 16 0M12 14v6.5"/>',
      mount: '<path d="m3 20 6.5-11 4 6 2.5-3.5L21 20Z"/>',
      road: '<path d="M8 3 4 21M16 3l4 18M12 4v3M12 11v2M12 17v3"/>',
      shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
      warn: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
      star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z"/>',
      bolt: '<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12Z"/>',
      truck: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
      globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
      phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
      chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12Z"/>',
      nav: '<path d="m3 11 18-8-8 18-2-8Z"/>',
      cash: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.8"/><path d="M6 9.5v5M18 9.5v5"/>',
      mpesa: '<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M10 18.5h4M9 7h6M9 10.5h6M9 14h3"/>',
      card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/>',
      info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
      arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
      verified: '<path d="M12 2.5 14.6 5l3.5-.4.4 3.5 2.5 2.6-2.5 2.6-.4 3.5-3.5-.4L12 21.5 9.4 19l-3.5.4-.4-3.5L3 12.8l2.5-2.6.4-3.5 3.5.4Z"/><path d="m8.8 12 2.2 2.2 4.3-4.4"/>',
      key: '<path d="M15 7a4 4 0 1 1-3.9 5H4v3h3v2h3v-2h1.1A4 4 0 0 1 15 7Z"/><circle cx="16" cy="11" r="1"/>',
      desk: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3ZM3 19a2 2 0 0 0 2 2h1v-6H3Z"/>',
      users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>',
      minus: '<path d="M6 12h12"/>', plus: '<path d="M12 6v12M6 12h12"/>',
      flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'
    };
    return '<svg class="dv-i" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (P[name] || '') + '</svg>';
  }
  function haptic(k) { if (M) M.haptic(k); }
  function store(k, v) {
    try {
      if (v === undefined) return JSON.parse(global.localStorage.getItem(k) || 'null');
      global.localStorage.setItem(k, JSON.stringify(v));
    } catch (e) { return null; }
  }
  var toastT = 0;
  function toast(msg, kind) {
    var t = $('dv-toast');
    t.className = 'dv-toast' + (kind ? ' is-' + kind : '');
    t.textContent = msg;
    requestAnimationFrame(function () { t.classList.add('is-on'); });
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove('is-on'); }, kind === 'bad' ? 4800 : 3200);
  }
  function hireDays(a, b) {
    if (!a || !b) return 0;
    return Math.max(1, Math.ceil(((b - a) / 36e5 - 1) / 24));
  }
  function fmtDate(d, withTime) {
    if (!d) return '';
    var s = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    return withTime ? s + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : s;
  }
  function ymd(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function paintFor(v) {
    var c = String(v && (v.colour || v.color) || '').toLowerCase();
    for (var i = 0; i < PAINT.length; i++) if (c.indexOf(PAINT[i][0]) > -1) return PAINT[i][1];
    return CLASS_PAINT[v && v['class']] || '#16c5b8';
  }
  function bodyFor(v) {
    var b = String(v && v.body || '').toLowerCase();
    if (b === 'minivan' || b === 'van') return 'van';
    if (b === 'wagon') return 'sedan';
    if (b === 'hatchback' || b === 'sedan' || b === 'suv' || b === 'safari' || b === 'pickup') {
      return v['class'] === 'luxury' && b === 'sedan' ? 'luxury' : b;
    }
    return CLASS_BODY[v && v['class']] || 'suv';
  }
  function shade(hex, k) {
    var n = parseInt(String(hex).slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function f(x) { return Math.max(0, Math.min(255, Math.round(k < 0 ? x * (1 + k) : x + (255 - x) * k))); }
    return '#' + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
  }

  /* ── 2 · the cars, drawn ─────────────────────────────────────────── */
  var BODIES = {
    suv: { d: 'M20 100C20 88 26 82 38 80L60 78L80 52C84 47 90 44 97 44H208C218 44 226 48 232 54L256 76L286 82C296 84 302 90 302 98V104C302 108 299 110 295 110H28C23 110 20 107 20 103Z',
      w: ['M88 74L101 53C103 50 106 48 109 48H160V74Z', 'M166 48H205C212 48 218 51 222 56L238 74H166Z'],
      g: ['M122 48h11l-16 26h-11Z', 'M188 48h14l-16 26h-14Z'], wh: [[84, 108, 22], [252, 108, 22]], door: 'M163 76V104',
      shine: 'M40 86C120 83 200 83 290 88', head: [288, 88, 12, 5], tail: [20, 86, 7, 7], extra: '<path d="M104 41H204" stroke="#26343c" stroke-width="3" stroke-linecap="round"/><path d="M226 72h9v6h-7Z" fill="#26343c"/>' },
    sedan: { d: 'M14 102C14 93 20 87 30 86L70 82L98 60C104 55 111 52 119 52H196C206 52 214 56 220 62L242 82L290 88C300 90 306 96 306 104C306 108 303 110 299 110H22C17 110 14 107 14 103Z',
      w: ['M104 80L118 60C120 57 123 56 126 56H162V80Z', 'M168 56H194C201 56 207 59 211 64L227 80H168Z'],
      g: ['M134 56h10l-14 24h-10Z', 'M186 56h12l-14 24h-12Z'], wh: [[78, 108, 21], [254, 108, 21]], door: 'M165 80V104',
      shine: 'M36 91C120 88 210 88 296 93', head: [293, 92, 11, 5], tail: [14, 90, 7, 6], extra: '<path d="M232 78h9v6h-7Z" fill="#26343c"/>' },
    luxury: { d: 'M8 102C8 93 14 88 24 87L72 83L102 62C108 57 116 55 124 55H200C210 55 218 58 224 64L248 83L296 89C306 91 312 96 312 104C312 108 309 110 305 110H16C11 110 8 107 8 103Z',
      w: ['M110 81L122 63C124 60 127 59 130 59H166V81Z', 'M172 59H198C205 59 211 62 215 67L231 81H172Z'],
      g: ['M140 59h10l-14 22h-10Z', 'M190 59h12l-14 22h-12Z'], wh: [[76, 108, 21], [258, 108, 21]], door: 'M169 81V104',
      shine: 'M30 92C120 89 210 89 302 94', head: [299, 92, 11, 5], tail: [8, 90, 7, 6],
      extra: '<path d="M24 97H302" stroke="#dfe7ea" stroke-width="1.6" opacity=".8"/><path d="M236 80h9v6h-7Z" fill="#26343c"/>' },
    hatchback: { d: 'M30 100C30 90 36 84 46 82L72 80L96 56C101 51 107 48 114 48H200C208 48 215 52 219 58L238 82L276 87C286 89 292 95 292 102V104C292 108 289 110 285 110H38C33 110 30 107 30 103Z',
      w: ['M100 78L114 56C116 53 118 52 121 52H160V78Z', 'M166 52H198C204 52 209 55 212 59L226 78H166Z'],
      g: ['M130 52h10l-15 26h-10Z', 'M184 52h12l-15 26h-12Z'], wh: [[86, 108, 20], [240, 108, 20]], door: 'M163 78V104',
      shine: 'M52 88C120 85 200 85 282 90', head: [278, 90, 11, 5], tail: [30, 88, 7, 7], extra: '<path d="M224 76h8v6h-6Z" fill="#26343c"/>' },
    van: { d: 'M18 102V52C18 40 26 32 38 31L200 28C212 28 222 34 228 44L252 76L290 84C298 86 304 92 304 100V104C304 108 301 110 297 110H26C21 110 18 107 18 102Z',
      w: ['M32 40C32 37 34 36 37 36L78 35V64H32Z', 'M86 35L150 34V64H86Z', 'M158 34L200 33C208 33 214 37 218 43L236 66H158Z'],
      g: ['M52 36h10l-12 28h-10Z', 'M110 35h12l-12 29h-12Z', 'M180 33h12l-13 33h-12Z'], wh: [[74, 108, 21], [250, 108, 21]], door: 'M154 66V104',
      shine: 'M24 74C120 72 220 72 244 76', head: [290, 90, 11, 6], tail: [18, 80, 6, 10], extra: '<path d="M238 70h9v6h-7Z" fill="#26343c"/>' },
    safari: { d: 'M20 100C20 88 26 82 38 81L56 80L64 48C66 42 71 38 78 38H214C222 38 228 42 231 48L246 76L288 82C298 84 304 90 304 98V104C304 108 301 110 297 110H28C23 110 20 107 20 102Z',
      w: ['M72 72L78 46C79 44 81 43 83 43H146V72Z', 'M152 43H212C217 43 221 45 223 49L236 72H152Z'],
      g: ['M100 43h10l-10 29h-10Z', 'M176 43h14l-12 29h-14Z'], wh: [[86, 108, 24], [248, 108, 24]], door: 'M149 74V104',
      shine: 'M40 86C120 83 200 83 292 88', head: [290, 88, 11, 6], tail: [20, 86, 6, 8],
      extra: '<path d="M70 30H222" stroke="#26343c" stroke-width="3.2" stroke-linecap="round"/><path d="M84 30v8M124 30v8M164 30v8M204 30v8" stroke="#26343c" stroke-width="2.4"/>' +
        '<rect x="96" y="20" width="26" height="10" rx="2" fill="#3b4a52"/><rect x="128" y="22" width="40" height="8" rx="2" fill="#56666f"/>' +
        '<path d="M244 76V44h8" stroke="#26343c" stroke-width="4.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<circle cx="18" cy="78" r="15" fill="#111a20"/><circle cx="18" cy="78" r="8" fill="#9fb0b8"/>' },
    pickup: { d: 'M16 100C16 90 22 84 32 83L118 82V48C118 44 121 42 125 42H200C208 42 214 45 218 50L240 78L288 84C298 86 304 92 304 100V104C304 108 301 110 297 110H24C19 110 16 107 16 102Z',
      w: ['M126 74V48C126 46 127 46 129 46H162V74Z', 'M168 46H198C204 46 209 48 212 53L228 74H168Z'],
      g: ['M140 46h9l-9 28h-9Z', 'M184 46h12l-13 28h-12Z'], wh: [[78, 108, 22], [252, 108, 22]], door: 'M165 76V104',
      shine: 'M30 90C120 87 200 87 294 92', head: [290, 90, 11, 6], tail: [16, 88, 6, 8],
      extra: '<path d="M22 82H118" stroke="#000" stroke-opacity=".22" stroke-width="2"/><path d="M24 86V104" stroke="#000" stroke-opacity=".18" stroke-width="1.6"/><path d="M230 76h8v6h-6Z" fill="#26343c"/>' }
  };
  function wheelSVG(c, spin) {
    var x = c[0], y = c[1], r = c[2], sp = '';
    for (var i = 0; i < 5; i++) {
      var a = (i * 72 - 90) * Math.PI / 180;
      sp += '<path d="M' + (x + Math.cos(a) * r * 0.18).toFixed(1) + ' ' + (y + Math.sin(a) * r * 0.18).toFixed(1) +
        'L' + (x + Math.cos(a) * r * 0.56).toFixed(1) + ' ' + (y + Math.sin(a) * r * 0.56).toFixed(1) + '" stroke="#8b9ba4" stroke-width="3.2" stroke-linecap="round"/>';
    }
    return '<g class="wh"' + (spin ? '' : '') + '><circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#111a20"/>' +
      '<circle cx="' + x + '" cy="' + y + '" r="' + (r * 0.64).toFixed(1) + '" fill="#d5dee2"/>' + sp +
      '<circle cx="' + x + '" cy="' + y + '" r="' + (r * 0.17).toFixed(1) + '" fill="#6d7b83"/></g>';
  }
  function carArt(v, opts) {
    opts = opts || {};
    var kind = opts.body || bodyFor(v || {}), B = BODIES[kind] || BODIES.suv;
    var paint = opts.paint || paintFor(v || {});
    var dark = shade(paint, -0.38), light = paint.toLowerCase() === '#f4f7f8';
    var arches = B.wh.map(function (c) {
      var r = c[2] + 4;
      return '<path d="M' + (c[0] - r) + ' 110A' + r + ' ' + r + ' 0 0 1 ' + (c[0] + r) + ' 110Z" fill="' + dark + '"/>';
    }).join('');
    var h = B.head, t = B.tail;
    return '<svg viewBox="0 0 320 140" aria-hidden="true" focusable="false"' + (opts.cls ? ' class="' + opts.cls + '"' : '') + '>' +
      '<ellipse cx="160" cy="130" rx="146" ry="7" fill="#0b1f2a" opacity=".16"/>' +
      (B.extra && kind === 'safari' ? B.extra : '') +
      '<path d="' + B.d + '" fill="' + paint + '"' + (light ? ' stroke="#0b1f2a" stroke-opacity=".14" stroke-width="1.5"' : '') + '/>' +
      '<path d="M26 100H298" stroke="' + dark + '" stroke-opacity=".35" stroke-width="7"/>' +
      B.w.map(function (w) { return '<path d="' + w + '" fill="#1b2f3b"/>'; }).join('') +
      B.g.map(function (g) { return '<path d="' + g + '" fill="#fff" opacity=".16"/>'; }).join('') +
      '<path d="' + B.shine + '" stroke="#fff" stroke-opacity="' + (light ? '.9' : '.45') + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
      '<path d="' + B.door + '" stroke="' + dark + '" stroke-opacity=".45" stroke-width="1.4"/>' +
      '<rect x="' + h[0] + '" y="' + h[1] + '" width="' + h[2] + '" height="' + h[3] + '" rx="2.5" fill="#fff6d2"/>' +
      '<rect x="' + t[0] + '" y="' + t[1] + '" width="' + t[2] + '" height="' + t[3] + '" rx="2.5" fill="#ff4b5c"/>' +
      (B.extra && kind !== 'safari' ? B.extra : '') +
      arches + B.wh.map(function (c) { return wheelSVG(c); }).join('') +
      '</svg>';
  }
  /* The hero: a safari-ready 4×4 in the page's own paint. One instance,
     so it may use a gradient safely. */
  function heroArt() {
    var B = BODIES.safari;
    return '<svg viewBox="0 0 320 140" aria-hidden="true">' +
      '<defs><linearGradient id="dv-paint" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2ef2d0"/><stop offset=".5" stop-color="#12c6e8"/><stop offset="1" stop-color="#3d7bff"/></linearGradient>' +
      '<linearGradient id="dv-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a4a5c"/><stop offset="1" stop-color="#0d1f29"/></linearGradient></defs>' +
      '<ellipse cx="160" cy="131" rx="150" ry="7" fill="#0b1f2a" opacity=".2"/>' + B.extra +
      '<path d="' + B.d + '" fill="url(#dv-paint)"/>' +
      '<path d="M26 100H298" stroke="#0b3d4a" stroke-opacity=".35" stroke-width="7"/>' +
      B.w.map(function (w) { return '<path d="' + w + '" fill="url(#dv-glass)"/>'; }).join('') +
      B.g.map(function (g) { return '<path d="' + g + '" fill="#fff" opacity=".2"/>'; }).join('') +
      '<path d="' + B.shine + '" stroke="#fff" stroke-opacity=".6" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
      '<path d="' + B.door + '" stroke="#0b3d4a" stroke-opacity=".4" stroke-width="1.4"/>' +
      '<rect x="290" y="88" width="11" height="6" rx="2.5" fill="#fff6d2"/><rect x="20" y="86" width="6" height="8" rx="2.5" fill="#ff4b5c"/>' +
      B.wh.map(function (c) { var r = c[2] + 4; return '<path d="M' + (c[0] - r) + ' 110A' + r + ' ' + r + ' 0 0 1 ' + (c[0] + r) + ' 110Z" fill="#0b3d4a"/>'; }).join('') +
      B.wh.map(function (c) { return wheelSVG(c); }).join('') + '</svg>';
  }

  /* ── 3 · state ───────────────────────────────────────────────────── */
  var HIRES_KEY = 'cabana-drive-hires', CONTACT_KEY = 'cabana-drive-contact';
  function defaultStart() {
    var d = new Date(Date.now() + 864e5);
    d.setHours(10, 0, 0, 0);
    return d;
  }
  var S = {
    place: null, start: defaultStart(), end: null, driver: 'self',
    dest: null, profile: null, filter: 'all', auto: false, delivery: false, instant: false, sort: 'fit',
    fleet: [], operators: {}, loading: false, source: '',
    v: null, op: null, quote: null, quoteSeq: 0, extras: {}, chauffeur: false, deliver: false, deliverPlace: null, cross: false, pay: 'mpesa',
    contact: { name: '', phone: '', email: '', age: '', years: '', country: '' },
    track: null, trackKind: null, trackRef: null, trackToken: null, pollT: 0, rating: 0
  };
  S.end = new Date(S.start.getTime() + 3 * 864e5);

  function hires() { var h = store(HIRES_KEY); return Array.isArray(h) ? h : []; }
  function rememberHire(kind, ref, token) {
    var list = hires().filter(function (x) { return x.ref !== ref; });
    list.unshift({ kind: kind, ref: ref, token: token, at: new Date().toISOString() });
    store(HIRES_KEY, list.slice(0, 40));
  }
  function tokenFor(ref) { var h = hires().filter(function (x) { return x.ref === ref; })[0]; return h ? h.token : null; }

  /* ── 4 · Cabana ──────────────────────────────────────────────────── */
  var sb = null;
  function client() {
    if (sb) return sb;
    try { sb = (global.ApaSession && global.ApaSession.client && global.ApaSession.client()) || null; } catch (e) { sb = null; }
    return sb;
  }
  function rpc(name, args) {
    var c = client();
    if (!c) return Promise.reject(new Error('offline'));
    return c.rpc(name, args || {}).then(function (r) {
      if (r.error) { var e = new Error(r.error.message || 'error'); e.code = r.error.message; e.detail = r.error.details; throw e; }
      return r.data;
    });
  }
  function friendly(e) {
    var code = e && (e.code || e.message);
    if (code && ERR[code]) return ERR[code];
    if (code === 'offline' || /fetch|network|Failed/i.test(String(e && e.message))) return 'You seem to be offline. Check your connection and try again.';
    return 'Something went wrong. Please try again.';
  }
  function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }

  /* ── 5 · sheets ──────────────────────────────────────────────────── */
  var openSheets = [];
  function sheetShell(id, title, body, foot) {
    var el = $(id);
    el.innerHTML = '<div class="dv-scrim" data-close></div><div class="dv-panel" role="document">' +
      '<div class="dv-grip" data-grip><i></i></div>' +
      '<div class="dv-panel-head"><h2 class="dv-h3" id="' + id + '-title">' + title + '</h2><button class="dv-x" type="button" data-close aria-label="Close">' + icon('x') + '</button></div>' +
      '<div class="dv-panel-body">' + body + '</div>' + (foot ? '<div class="dv-panel-foot">' + foot + '</div>' : '') + '</div>';
    return el;
  }
  function openSheet(id) {
    var el = $(id);
    if (!el.hidden && el.classList.contains('is-open')) return el;
    el.hidden = false;
    el.classList.remove('is-closing');
    el.getBoundingClientRect();
    el.classList.add('is-open');
    if (openSheets.indexOf(id) === -1) openSheets.push(id);
    doc.body.classList.add('dv-locked');
    wireDrag(el, id);
    var f = el.querySelector('.dv-x');
    if (f) setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) {} }, 80);
    return el;
  }
  function closeSheet(id, silent) {
    var el = $(id);
    if (!el || el.hidden) return;
    el.classList.add('is-closing');
    el.classList.remove('is-open');
    var panel = el.querySelector('.dv-panel');
    if (panel) panel.style.transform = '';
    openSheets = openSheets.filter(function (x) { return x !== id; });
    setTimeout(function () { el.hidden = true; el.classList.remove('is-closing'); }, 360);
    if (!openSheets.length) doc.body.classList.remove('dv-locked');
    if (id === 'dv-track') { clearTimeout(S.pollT); S.track = null; }
    if (!silent) cleanUrl();
  }
  function cleanUrl() {
    try {
      var u = new URL(global.location.href);
      ['open', 'booking', 'request'].forEach(function (k) { u.searchParams.delete(k); });
      history.replaceState(null, '', u.pathname + (u.search ? u.search : ''));
    } catch (e) {}
  }
  /* Drag the grip or the header down to dismiss, like any native sheet.
     The body keeps its own scroll; a pull at the very top also works. */
  function wireDrag(el, id) {
    var panel = el.querySelector('.dv-panel');
    if (!panel || panel.__wired) return;
    panel.__wired = true;
    var body = panel.querySelector('.dv-panel-body');
    var y0 = 0, dy = 0, active = false, t0 = 0, fromBody = false;
    function isDesk() { return global.matchMedia && global.matchMedia('(min-width: 860px)').matches; }
    function start(y, target) {
      if (isDesk()) return false;
      var onHead = target.closest('[data-grip], .dv-panel-head');
      fromBody = !onHead && body && body.contains(target);
      if (!onHead && !(fromBody && body.scrollTop <= 0)) return false;
      if (target.closest('input, textarea, select, .cm-swipe, button:not([data-grip])') && !onHead) return false;
      y0 = y; dy = 0; active = true; t0 = Date.now();
      return true;
    }
    function move(y, ev) {
      if (!active) return;
      dy = Math.max(0, y - y0);
      if (fromBody && dy < 6) return;
      if (fromBody && body.scrollTop > 0) { active = false; return; }
      if (ev && ev.cancelable) ev.preventDefault();
      panel.style.transition = 'none';
      panel.style.transform = 'translate3d(0,' + (dy < 0 ? 0 : dy) + 'px,0)';
    }
    function end() {
      if (!active) return;
      active = false;
      var v = dy / Math.max(1, Date.now() - t0);
      panel.style.transition = '';
      if (dy > 140 || v > 0.9) { haptic('tick'); closeSheet(id); }
      else panel.style.transform = '';
    }
    panel.addEventListener('touchstart', function (e) { if (e.touches[0]) start(e.touches[0].clientY, e.target); }, { passive: true });
    panel.addEventListener('touchmove', function (e) { if (e.touches[0]) move(e.touches[0].clientY, e); }, { passive: false });
    panel.addEventListener('touchend', end);
    panel.addEventListener('touchcancel', end);
    var grip = panel.querySelector('[data-grip]');
    if (grip) {
      grip.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse' && start(e.clientY, e.target)) { grip.setPointerCapture(e.pointerId); } });
      grip.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') move(e.clientY); });
      grip.addEventListener('pointerup', function (e) { if (e.pointerType === 'mouse') end(); });
    }
  }
  doc.addEventListener('click', function (e) {
    var c = e.target.closest && e.target.closest('[data-close]');
    if (!c) return;
    var sh = c.closest('.dv-sheet, .dv-modal');
    if (!sh) return;
    if (sh.classList.contains('dv-modal')) { sh.hidden = true; return; }
    closeSheet(sh.id);
  });
  doc.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var modals = [].slice.call(doc.querySelectorAll('.dv-modal:not([hidden])'));
    if (modals.length) { modals[modals.length - 1].hidden = true; return; }
    if (openSheets.length) closeSheet(openSheets[openSheets.length - 1]);
  });

  /* ── 6 · the search card ─────────────────────────────────────────── */
  function paintSearch() {
    var w = $('dv-where'), wl = $('dv-where-label');
    if (S.place) { w.classList.remove('is-empty'); wl.textContent = S.place.title || S.place.short || S.place.label; }
    else { w.classList.add('is-empty'); wl.textContent = 'City, airport or address'; }
    var days = hireDays(S.start, S.end);
    $('dv-when-small').textContent = days ? days + (days === 1 ? ' day' : ' days') : 'Dates';
    $('dv-when-label').textContent = S.start && S.end ? fmtDate(S.start, true) + ' → ' + fmtDate(S.end, true) : 'Pick your dates';
    var seg = $('dv-driver');
    seg.classList.toggle('is-right', S.driver === 'chauffeur');
    seg.querySelectorAll('[data-driver]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-driver') === S.driver); });
  }

  /* ── 7 · place search ────────────────────────────────────────────── */
  var placeCb = null, placeSeq = 0, placeT = 0, placeRows = [];
  var HUBS = [
    { title: 'JKIA, Nairobi', lat: -1.3192, lng: 36.9278, cc: 'KE', city: 'Nairobi', kind: 'airport' },
    { title: 'Nairobi CBD', lat: -1.2864, lng: 36.8230, cc: 'KE', city: 'Nairobi' },
    { title: 'Moi International, Mombasa', lat: -4.0348, lng: 39.5942, cc: 'KE', city: 'Mombasa', kind: 'airport' },
    { title: 'Kigali', lat: -1.9441, lng: 30.0619, cc: 'RW', city: 'Kigali' },
    { title: 'Kilimanjaro International', lat: -3.4294, lng: 37.0745, cc: 'TZ', city: 'Arusha', kind: 'airport' },
    { title: 'Entebbe International', lat: 0.0424, lng: 32.4435, cc: 'UG', city: 'Entebbe', kind: 'airport' },
    { title: 'Lagos, Victoria Island', lat: 6.4281, lng: 3.4219, cc: 'NG', city: 'Lagos' },
    { title: 'Accra', lat: 5.6037, lng: -0.1870, cc: 'GH', city: 'Accra' },
    { title: 'Cape Town International', lat: -33.9715, lng: 18.6021, cc: 'ZA', city: 'Cape Town', kind: 'airport' },
    { title: 'Marrakech', lat: 31.6295, lng: -7.9811, cc: 'MA', city: 'Marrakech' }
  ];
  function openPlace(title, cb, opts) {
    opts = opts || {};
    placeCb = cb;
    var m = $('dv-place');
    m.innerHTML = '<div class="dv-scrim" data-close></div><div class="dv-modal-card">' +
      '<div class="dv-mhead"><h2 class="dv-h3" id="dv-place-title">' + esc(title) + '</h2><button class="dv-x" type="button" data-close aria-label="Close">' + icon('x') + '</button></div>' +
      '<div class="dv-searchbox">' + icon('search') + '<label class="sr-only" for="dv-place-q">Search a place</label>' +
      '<input id="dv-place-q" type="search" enterkeyhint="search" autocomplete="off" placeholder="' + esc(opts.placeholder || 'City, airport, hotel or address') + '"></div>' +
      '<div class="dv-mbody" id="dv-place-list"></div></div>';
    m.hidden = false;
    var q = $('dv-place-q');
    renderPlaces([], '', opts);
    q.addEventListener('input', function () { searchPlaces(q.value, opts); });
    q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); var first = $('dv-place-list').querySelector('[data-i]'); if (first) pickPlace(+first.getAttribute('data-i')); } });
    $('dv-place-list').onclick = function (e) { var b = e.target.closest('[data-i]'); if (b) pickPlace(+b.getAttribute('data-i')); };
    setTimeout(function () { q.focus(); }, 60);
  }
  function renderPlaces(rows, q, opts) {
    var all = [];
    if (!q) {
      if (!opts || opts.locate !== false) all.push({ special: 'locate', title: 'Use my current location', sub: 'Pickup near where you are' });
      var rec = [];
      try { rec = (global.ApaGeo && global.ApaGeo.recents && global.ApaGeo.recents()) || []; } catch (e) {}
      rec.slice(0, 4).forEach(function (p) { all.push({ place: p, title: p.short || p.label, sub: 'Recent', ic: 'clock' }); });
      HUBS.forEach(function (h) { all.push({ place: { label: h.title, short: h.title, title: h.title, lat: h.lat, lng: h.lng, countryCode: h.cc.toLowerCase(), city: h.city, kind: h.kind || 'city' }, title: h.title, sub: 'Popular pickup', ic: h.kind === 'airport' ? 'plane' : 'pin' }); });
    }
    rows.forEach(function (p) { all.push({ place: p, title: p.name || p.short || p.label, sub: p.label, ic: p.kind === 'airport' ? 'plane' : 'pin' }); });
    placeRows = all;
    var html = all.map(function (r, i) {
      var t = esc(r.title);
      if (q && r.place) {
        var ix = String(r.title).toLowerCase().indexOf(q.toLowerCase());
        if (ix > -1) t = esc(r.title.slice(0, ix)) + '<mark>' + esc(r.title.slice(ix, ix + q.length)) + '</mark>' + esc(r.title.slice(ix + q.length));
      }
      return (i === 1 && !q && all[0].special ? '<div class="dv-res-sec">Suggestions</div>' : '') +
        '<button class="dv-result' + (r.special ? ' is-special' : '') + '" type="button" data-i="' + i + '"><i>' + icon(r.special ? 'locate' : r.ic) + '</i><span><b>' + t + '</b><small>' + esc(r.sub || '') + '</small></span></button>';
    }).join('');
    $('dv-place-list').innerHTML = html || '<p class="dv-help" style="padding:12px">No match yet. Try a town, an estate or a landmark.</p>';
  }
  function searchPlaces(q, opts) {
    q = String(q || '').trim();
    clearTimeout(placeT);
    if (q.length < 2) { renderPlaces([], '', opts); return; }
    var seq = ++placeSeq;
    placeT = setTimeout(function () {
      if (!global.ApaGeo) return;
      global.ApaGeo.search(q, { limit: 8, near: S.place || undefined }).then(function (rows) { if (seq === placeSeq) renderPlaces(rows || [], q, opts); });
    }, 170);
  }
  function pickPlace(i) {
    var r = placeRows[i];
    if (!r) return;
    haptic('tick');
    if (r.special === 'locate') {
      if (!global.ApaGeo || !global.ApaGeo.locate) { toast('Location is not available on this device.', 'bad'); return; }
      toast('Finding you…');
      global.ApaGeo.locate({ reason: 'car hire pickup', timeout: 12000 }).then(function (p) {
        p.title = 'Near you · ' + String(p.short || p.label || '').split(',')[0];
        $('dv-place').hidden = true;
        if (placeCb) placeCb(p);
      }, function (e) { toast((e && e.message) || 'Could not read your location.', 'bad'); });
      return;
    }
    $('dv-place').hidden = true;
    if (r.place && global.ApaGeo && global.ApaGeo.remember) { try { global.ApaGeo.remember(r.place); } catch (e) {} }
    if (placeCb) placeCb(r.place);
  }

  /* ── 8 · dates ───────────────────────────────────────────────────── */
  var D = { start: null, end: null, phase: 'start', st: '10:00', et: '10:00', cb: null };
  function timeOptions(sel) {
    var out = '';
    for (var m = 0; m < 24 * 60; m += 30) {
      var v = String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
      out += '<option value="' + v + '"' + (v === sel ? ' selected' : '') + '>' + v + '</option>';
    }
    return out;
  }
  function hm(d) { return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes() >= 30 ? 30 : 0).padStart(2, '0'); }
  function openDates(cb) {
    D.cb = cb || null;
    D.start = S.start ? new Date(S.start.getFullYear(), S.start.getMonth(), S.start.getDate()) : null;
    D.end = S.end ? new Date(S.end.getFullYear(), S.end.getMonth(), S.end.getDate()) : null;
    D.st = S.start ? hm(S.start) : '10:00';
    D.et = S.end ? hm(S.end) : '10:00';
    D.phase = 'start';
    var m = $('dv-dates');
    var months = '';
    var base = new Date(); base.setDate(1); base.setHours(0, 0, 0, 0);
    for (var i = 0; i < 12; i++) {
      var mo = new Date(base.getFullYear(), base.getMonth() + i, 1);
      months += '<div class="dv-month"><h4>' + mo.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) + '</h4><div class="dv-days" data-month="' + mo.getTime() + '"></div></div>';
    }
    m.innerHTML = '<div class="dv-scrim" data-close></div><div class="dv-modal-card">' +
      '<div class="dv-mhead"><h2 class="dv-h3" id="dv-dates-title">When do you need it?</h2><button class="dv-x" type="button" data-close aria-label="Close">' + icon('x') + '</button></div>' +
      '<div class="dv-cal-sum"><div id="dv-sum-a"><small>Pick up</small><b></b></div><div id="dv-sum-b"><small>Return</small><b></b></div></div>' +
      '<div class="dv-wd"><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span></div>' +
      '<div class="dv-mbody" id="dv-cal">' + months + '</div>' +
      '<div class="dv-mfoot"><div class="dv-times"><label><span class="dv-help" style="margin:0 2px 4px;display:block">Pick-up time</span><select class="dv-input" id="dv-st">' + timeOptions(D.st) + '</select></label>' +
      '<label><span class="dv-help" style="margin:0 2px 4px;display:block">Return time</span><select class="dv-input" id="dv-et">' + timeOptions(D.et) + '</select></label></div>' +
      '<div class="dv-row" style="margin-top:10px"><button class="dv-btn is-ghost is-sm" type="button" id="dv-dates-clear">Reset</button><button class="dv-btn is-sm" type="button" id="dv-dates-ok">Apply</button></div></div></div>';
    m.hidden = false;
    paintCal();
    $('dv-cal').onclick = function (e) {
      var b = e.target.closest('[data-day]');
      if (!b || b.disabled) return;
      var d = new Date(+b.getAttribute('data-day'));
      haptic('tick');
      if (D.phase === 'start' || !D.start || d < D.start) { D.start = d; D.end = null; D.phase = 'end'; }
      else { D.end = d; D.phase = 'start'; }
      paintCal();
    };
    $('dv-st').onchange = function () { D.st = this.value; paintCal(); };
    $('dv-et').onchange = function () { D.et = this.value; paintCal(); };
    $('dv-dates-clear').onclick = function () { D.start = null; D.end = null; D.phase = 'start'; paintCal(); };
    $('dv-dates-ok').onclick = function () {
      if (!D.start || !D.end) { toast('Pick a pickup day and a return day.', 'bad'); return; }
      var a = at(D.start, D.st), b = at(D.end, D.et);
      if (a.getTime() < Date.now() + 2 * 36e5) { toast('Pickup must be at least 2 hours from now.', 'bad'); return; }
      if (b.getTime() < a.getTime() + 4 * 36e5) { toast('A hire is at least 4 hours long.', 'bad'); return; }
      if (b.getTime() > a.getTime() + 90 * 864e5) { toast('Hires run up to 90 days. For longer, send a car request.', 'bad'); return; }
      S.start = a; S.end = b;
      m.hidden = true;
      haptic('confirm');
      paintSearch();
      if (D.cb) D.cb(); else loadFleet();
    };
    var sel = $('dv-cal').querySelector('.is-start') || $('dv-cal').querySelector('.dv-day:not(:disabled)');
    if (sel) setTimeout(function () { sel.scrollIntoView({ block: 'center' }); }, 30);
  }
  function at(day, t) { var p = String(t).split(':'); var d = new Date(day); d.setHours(+p[0] || 0, +p[1] || 0, 0, 0); return d; }
  function paintCal() {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    doc.querySelectorAll('#dv-cal [data-month]').forEach(function (grid) {
      var first = new Date(+grid.getAttribute('data-month'));
      var lead = (first.getDay() + 6) % 7, n = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
      var out = '';
      for (var i = 0; i < lead; i++) out += '<span></span>';
      for (var d = 1; d <= n; d++) {
        var day = new Date(first.getFullYear(), first.getMonth(), d), t = day.getTime();
        var cls = 'dv-day';
        if (t === today.getTime()) cls += ' is-today';
        if (D.start && t === D.start.getTime()) cls += ' is-start';
        if (D.end && t === D.end.getTime()) cls += ' is-end';
        if (D.start && D.end && t > D.start.getTime() && t < D.end.getTime()) cls += ' is-in';
        out += '<button class="' + cls + '" type="button" data-day="' + t + '"' + (t < today.getTime() ? ' disabled' : '') + ' aria-label="' + day.toDateString() + '">' + d + '</button>';
      }
      grid.innerHTML = out;
    });
    var a = $('dv-sum-a'), b = $('dv-sum-b');
    a.querySelector('b').textContent = D.start ? fmtDate(at(D.start, D.st), true) : 'Choose a day';
    b.querySelector('b').textContent = D.end ? fmtDate(at(D.end, D.et), true) + ' · ' + hireDays(at(D.start, D.st), at(D.end, D.et)) + 'd' : 'Choose a day';
    a.classList.toggle('is-on', D.phase === 'start');
    b.classList.toggle('is-on', D.phase === 'end');
  }

  /* ── 9 · the fleet ───────────────────────────────────────────────── */
  /* A remembered place (the geo bias, a pin) can arrive without a
     country. The nearest town in the gazetteer settles it. */
  function nearestTown(lat, lng) {
    var G = global.ApaGeo && global.ApaGeo.GAZETTEER;
    if (!G || !isFinite(lat) || !isFinite(lng)) return null;
    var best = null, bd = 1e9;
    for (var i = 0; i < G.length; i++) {
      var r = G[i]; if (!r || !isFinite(r[4])) continue;
      var dy = r[4] - lat, dx = (r[5] - lng) * Math.cos(lat * Math.PI / 180), d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = r; }
    }
    return best && Math.sqrt(bd) * 111 < 450 ? { cc: String(best[3] || '').toUpperCase(), city: best[0] } : null;
  }
  function countryOf(p) {
    if (!p) return '';
    var cc = String(p.cc || p.countryCode || p.country_code || '').toUpperCase();
    if (cc) return cc;
    var t = nearestTown(Number(p.lat), Number(p.lng));
    if (t && t.cc) { p.cc = t.cc; if (!p.city) p.city = t.city; return t.cc; }
    return '';
  }
  function loadFleet() {
    var c = client();
    S.loading = true;
    renderGrid();
    var f = {};
    if (S.start && S.end) { f.start = ymd(S.start); f.end = ymd(S.end); }
    if (S.place) { f.countryCode = countryOf(S.place) || 'KE'; f.city = S.place.city || null; f.lat = S.place.lat; f.lng = S.place.lng; f.radiusKm = 300; }
    return E.loadFleet(c, f).then(function (r) {
      S.loading = false;
      S.source = r.source;
      S.fleet = (r.fleet || []).map(function (v) { v.currency = v.currency || null; return v; });
      S.operators = {};
      (r.operators || []).forEach(function (o) { S.operators[o.id] = o; });
      S.fleet.forEach(function (v) { var o = S.operators[v.operator_id]; v.currency = (o && o.currency_code) || E.currencyFor(o && o.country_code) || 'KES'; });
      renderGrid();
    });
  }
  function grade(v) {
    if (!S.profile) return null;
    try { return E.grade(v, S.profile, S.start || new Date()); } catch (e) { return null; }
  }
  function estimateMinor(v) {
    var days = hireDays(S.start, S.end) || 1;
    var rate = Number(v.day_rate || 0) * 100;
    var total = rate * days;
    if (days >= 28 && v.monthly_discount_pct > 0) total -= Math.round(total * v.monthly_discount_pct / 100);
    else if (days >= 7 && v.weekly_discount_pct > 0) total -= Math.round(total * v.weekly_discount_pct / 100);
    if (S.driver === 'chauffeur' && v.chauffeur_metro > 0) total += Math.round(v.chauffeur_metro * 100) * days;
    return { rate: rate, total: total, days: days };
  }
  function visibleFleet() {
    var list = S.fleet.filter(function (v) {
      if (S.filter !== 'all' && v['class'] !== S.filter) return false;
      if (S.auto && String(v.transmission).toLowerCase() !== 'automatic') return false;
      if (S.delivery && !v.delivery_ok) return false;
      if (S.instant && !v.instant_book) return false;
      if (S.driver === 'chauffeur' && !(Number(v.chauffeur_metro) > 0)) return false;
      return true;
    });
    var rank = { cleared: 0, caution: 1, blocked: 2 };
    list.forEach(function (v) { v.__grade = grade(v); v.__est = estimateMinor(v); });
    list.sort(function (a, b) {
      if (S.sort === 'price') return a.__est.total - b.__est.total;
      if (S.sort === 'near') return (a.operator_distance_km == null ? 1e9 : a.operator_distance_km) - (b.operator_distance_km == null ? 1e9 : b.operator_distance_km);
      if (S.sort === 'rating') return ((S.operators[b.operator_id] || {}).rating || 0) - ((S.operators[a.operator_id] || {}).rating || 0);
      var ga = a.__grade ? rank[a.__grade.verdict] : 0, gb = b.__grade ? rank[b.__grade.verdict] : 0;
      if (ga !== gb) return ga - gb;
      if (!!b.instant_book !== !!a.instant_book) return b.instant_book ? 1 : -1;
      return a.__est.total - b.__est.total;
    });
    return list;
  }
  function renderFilters() {
    var chips = E.CLASSES.map(function (c) {
      return '<button class="dv-chip" type="button" data-class="' + c.key + '" aria-pressed="' + (S.filter === c.key) + '">' + esc(c.key === 'all' ? 'All cars' : (CLASS_LABEL[c.key] || c.label)) + '</button>';
    }).join('');
    chips += '<button class="dv-chip" type="button" data-toggle="auto" aria-pressed="' + S.auto + '">' + icon('gear') + 'Automatic</button>';
    chips += '<button class="dv-chip" type="button" data-toggle="delivery" aria-pressed="' + S.delivery + '">' + icon('truck') + 'Delivered to you</button>';
    chips += '<button class="dv-chip is-amber" type="button" data-toggle="instant" aria-pressed="' + S.instant + '">' + icon('bolt') + 'Instant book</button>';
    $('dv-filters').innerHTML = chips;
  }
  function gradeFlag(g) {
    if (!g) return '';
    if (g.verdict === 'cleared') return '<span class="dv-flag is-ok">' + icon('check') + 'Fits your trip</span>';
    if (g.verdict === 'caution') return '<span class="dv-flag is-warn">' + icon('warn') + 'Check the road</span>';
    return '<span class="dv-flag is-no">' + icon('x') + 'Not for this road</span>';
  }
  function cardHTML(v, i) {
    var o = S.operators[v.operator_id] || {}, est = v.__est || estimateMinor(v), cur = v.currency || 'KES';
    var photo = Array.isArray(v.photos) && v.photos[0];
    var specs = [
      [icon('seat'), (v.seats || 5) + ' seats'],
      [icon('gear'), String(v.transmission || '').toLowerCase() === 'manual' ? 'Manual' : 'Automatic'],
      [icon('drive'), String(v.drive || '2wd').toUpperCase().replace('4WD_LOW', '4×4 LOW').replace('4WD', '4×4')]
    ];
    if (v.clearance_mm) specs.push([icon('mount'), v.clearance_mm + ' mm']);
    return '<button class="dv-car" type="button" data-vehicle="' + esc(v.id) + '" style="animation-delay:' + Math.min(i, 8) * 45 + 'ms">' +
      '<div class="dv-car-stage">' + (photo ? '<img src="' + esc(photo) + '" alt="" loading="lazy" decoding="async">' : carArt(v)) +
      '<div class="dv-car-flags"><span>' + (v.instant_book ? '<span class="dv-flag is-instant">' + icon('bolt') + 'Instant</span>' : '') + '</span>' + gradeFlag(v.__grade) + '</div></div>' +
      '<div class="dv-car-body"><div class="dv-car-title"><div><b>' + esc([v.make, v.model].filter(Boolean).join(' ')) + '</b><small>' + esc([v.year, CLASS_LABEL[v['class']] || v['class']].filter(Boolean).join(' · ')) + '</small></div></div>' +
      '<div class="dv-specs">' + specs.map(function (s) { return '<span class="dv-spec">' + s[0] + esc(s[1]) + '</span>'; }).join('') + '</div>' +
      '<div class="dv-op">' + icon('verified').replace('dv-i', 'dv-i dv-ver') + '<b>' + esc(o.name || 'Verified operator') + '</b>' +
      (o.rating ? '<span>★ ' + Number(o.rating).toFixed(1) + '</span>' : '') + (v.operator_distance_km != null ? '<span>· ' + Math.round(v.operator_distance_km) + ' km</span>' : '') + '</div>' +
      '<div class="dv-price-row"><div class="dv-price"><b>' + moneyHTML(est.rate, cur) + '</b><small> /day</small>' +
      '<em>' + esc(money(est.total, cur)) + ' for ' + est.days + (est.days === 1 ? ' day' : ' days') + (S.driver === 'chauffeur' ? ' with driver' : '') + '</em></div>' +
      '<span class="dv-arrow">' + icon('arrow') + '</span></div></div></button>';
  }
  function emptyHTML() {
    var where = S.place ? (S.place.city || String(S.place.title || S.place.label || '').split(',')[0]) : 'your city';
    return '<div class="dv-empty"><div class="dv-empty-art">' + carArt({ 'class': 'suv4x4' }, { paint: '#12c6e8', body: 'safari' }) + '</div>' +
      '<h3 class="dv-h2">' + (S.source === 'error' ? 'The fleet is catching its breath' : 'Let operators come to you') + '</h3>' +
      '<p>' + (S.source === 'error' ? 'We could not load cars just now. You can still post what you need and operators will answer.' :
        'No listed car matches ' + esc(where) + ' for these dates yet. Tell us what you need and verified operators nearby, plus the Cabana desk, send you priced offers. Usually within the hour.') + '</p>' +
      '<button class="dv-btn" type="button" data-act="request" data-press>' + icon('key') + 'Request a car</button>' +
      '<div class="dv-points"><span>' + icon('check') + 'Free to post</span><span>' + icon('check') + 'Offers in writing</span><span>' + icon('check') + 'Pay the operator directly</span></div></div>';
  }
  function renderGrid() {
    var g = $('dv-grid');
    if (S.loading) {
      var sk = '';
      for (var i = 0; i < 3; i++) sk += '<div class="dv-car is-skel"><div class="dv-car-stage"></div><div class="dv-car-body"><span class="dv-skel" style="height:20px;width:60%"></span><span class="dv-skel" style="height:14px;width:40%"></span><span class="dv-skel" style="height:28px;width:90%"></span><span class="dv-skel" style="height:26px;width:50%;margin-top:12px"></span></div></div>';
      g.innerHTML = sk;
      return;
    }
    var list = visibleFleet();
    var where = S.place ? (S.place.city || String(S.place.title || S.place.label || '').split(',')[0]) : '';
    $('dv-results-title').textContent = list.length ? (list.length + (list.length === 1 ? ' car' : ' cars') + (where ? ' near ' + where : ' ready')) : (where ? 'Cars near ' + where : 'Cars near you');
    $('dv-results-sub').textContent = S.profile ? 'Checked against ' + (S.profile.label || 'your trip') + '.' :
      S.start && S.end ? fmtDate(S.start) + ' → ' + fmtDate(S.end) + ' · prices are the operator’s own rates.' : 'Live from verified operators.';
    if (!list.length) { g.innerHTML = emptyHTML(); return; }
    g.innerHTML = list.map(cardHTML).join('') +
      '<div class="dv-empty" style="padding:18px"><p style="margin:0 auto 12px">Not quite right? Post exactly what you need and operators will send offers.</p><button class="dv-btn is-ink is-sm" type="button" data-act="request" style="max-width:280px;margin:0 auto">Request a car</button></div>';
  }

  /* ── 10 · trip check ─────────────────────────────────────────────── */
  function renderRoutes() {
    $('dv-routes').innerHTML = ROUTES.map(function (r, i) {
      return '<button class="dv-route-chip" type="button" data-route="' + i + '">' + icon('road') + esc(r[0]) + ' → ' + esc(r[3]) + '</button>';
    }).join('');
  }
  function setDest(p, from) {
    S.dest = p;
    var b = $('dv-dest'), l = $('dv-dest-label');
    if (!p) { b.classList.add('is-empty'); l.textContent = 'Destination, park or town'; S.profile = null; $('dv-verdict').innerHTML = ''; renderGrid(); return; }
    b.classList.remove('is-empty');
    l.textContent = p.title || p.short || p.label;
    var a = from || S.place;
    if (!a) {
      toast('Set a pickup first so we can check the road.', 'bad');
      openPlace('Where do you collect the car?', function (pl) { S.place = pl; paintSearch(); loadFleet(); setDest(p); });
      return;
    }
    $('dv-verdict').innerHTML = '<div class="dv-verdict"><div class="dv-verdict-top">' + icon('road') + '<div><b>Reading the road…</b><small>' + esc(String(a.title || a.short || a.label).split(',')[0]) + ' → ' + esc(String(p.title || p.short || p.label).split(',')[0]) + '</small></div></div></div>';
    var q = 'fromLat=' + a.lat + '&fromLng=' + a.lng + '&toLat=' + p.lat + '&toLng=' + p.lng +
      '&fromLabel=' + encodeURIComponent(a.title || a.short || a.label || '') + '&toLabel=' + encodeURIComponent(p.title || p.short || p.label || '') +
      '&fromCountry=' + countryOf(a) + '&toCountry=' + countryOf(p) + '&date=' + encodeURIComponent((S.start || new Date()).toISOString());
    fetch('/api/carhire-terrain?' + q).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (prof) {
      if (!prof || !prof.drive) { $('dv-verdict').innerHTML = '<div class="dv-verdict"><div class="dv-verdict-top">' + icon('warn') + '<div><b>We could not read that road just now</b><small>Try again, or ask the operator about the route.</small></div></div></div>'; return; }
      S.profile = prof;
      paintVerdict();
      renderGrid();
      haptic('tick');
    });
  }
  function paintVerdict() {
    var p = S.profile;
    if (!p) return;
    var rec = E.recommendVehicle(p);
    var mix = p.surface_mix || { paved: 80, gravel: 15, unsealed: 5 };
    var dur = E.formatDuration(p.duration_minutes);
    $('dv-verdict').innerHTML = '<div class="dv-verdict"><button class="dv-trip-clear" type="button" data-act="clear-trip" aria-label="Clear trip">' + icon('x') + '</button>' +
      '<div class="dv-verdict-top">' + icon(p.drive === '2wd' ? 'check' : 'mount') + '<div><b>' + esc(rec.label) + '</b><small>' + esc(p.label || '') + ' · ' + (p.km ? Math.round(p.km) + ' km' : '') + (dur && dur !== '—' ? ' · ' + dur : '') + '</small></div></div>' +
      '<div class="dv-mix" aria-hidden="true"><i style="width:' + mix.paved + '%;background:#7ff5e1"></i><i style="width:' + mix.gravel + '%;background:#ffcf6b"></i><i style="width:' + mix.unsealed + '%;background:#ff8a7a"></i></div>' +
      '<div class="dv-mix-legend"><span style="--c:#7ff5e1">Tarmac ' + mix.paved + '%</span><span style="--c:#ffcf6b">Gravel ' + mix.gravel + '%</span><span style="--c:#ff8a7a">Unsealed ' + mix.unsealed + '%</span></div>' +
      '<div class="dv-need"><span>' + esc(E.DRIVE_LABEL[p.drive] || p.drive) + '</span><span>' + p.clearance_mm + ' mm+ clearance</span>' + (p.range_km ? '<span>' + p.range_km + ' km fuel range</span>' : '') + '</div>' +
      '<small style="color:rgba(255,255,255,.7);font-size:12.5px">' + esc(rec.why) + ' ' + esc(p.note || '') + '</small></div>';
  }

  /* ── 11 · the car sheet ──────────────────────────────────────────── */
  function normaliseVehicle(row) {
    return Object.assign({}, row, {
      clearance_mm: row.clearance_mm != null ? row.clearance_mm : row.ground_clearance_mm,
      day_rate: row.day_rate > 100000 && !row.__major ? row.day_rate / 100 : row.day_rate,
      deposit: row.deposit != null && !row.__major ? row.deposit / 100 : row.deposit,
      chauffeur_metro: row.chauffeur_metro != null ? row.chauffeur_metro : (row.chauffeur_uplift_metro || 0) / 100,
      chauffeur_upcountry: row.chauffeur_upcountry != null ? row.chauffeur_upcountry : (row.chauffeur_uplift_upcountry || 0) / 100,
      __major: true
    });
  }
  function openVehicle(id) {
    var v = S.fleet.filter(function (x) { return String(x.id) === String(id); })[0];
    if (v) { showVehicle(v, S.operators[v.operator_id] || null); return; }
    var c = client();
    if (!c) { toast('You seem to be offline.', 'bad'); return; }
    c.from('car_fleet').select('*').eq('id', id).limit(1).then(function (r) {
      var row = r && Array.isArray(r.data) ? r.data.filter(function (x) { return String(x.id) === String(id); })[0] || null : null;
      if (!row || (row.status && row.status !== 'active')) { toast('That car is no longer listed. Here is what is available.', 'bad'); cleanUrl(); return; }
      var veh = normaliseVehicle({
        id: row.id, operator_id: row.operator_id, make: row.make, model: row.model, variant: row.variant, year: row.year, 'class': row['class'], body: row.body,
        seats: row.seats, ground_clearance_mm: row.ground_clearance_mm, drive: row.drive, transmission: row.transmission, fuel: row.fuel,
        tank_litres: row.tank_litres, consumption_kmpl: row.consumption_kmpl, day_rate: Number(row.day_rate || 0) / 100, deposit: Number(row.deposit || 0) / 100,
        chauffeur_uplift_metro: row.chauffeur_uplift_metro, chauffeur_uplift_upcountry: row.chauffeur_uplift_upcountry, extras: row.extras, photos: row.photos,
        min_hire_days: row.min_hire_days, min_driver_age: row.min_driver_age, min_licence_years: row.min_licence_years, fuel_policy: row.fuel_policy,
        mileage_cap_km: row.mileage_cap_km, cross_border_ok: row.cross_border_ok, instant_book: row.instant_book, delivery_ok: row.delivery_ok,
        colour: row.colour, description: row.description, features: row.features, weekly_discount_pct: row.weekly_discount_pct, monthly_discount_pct: row.monthly_discount_pct
      });
      veh.__major = true;
      c.from('car_operators_public').select('*').eq('id', row.operator_id).limit(1).then(function (o) {
        var op = o && Array.isArray(o.data) ? o.data[0] || null : null;
        veh.currency = (op && op.currency_code) || 'KES';
        showVehicle(veh, op);
      }, function () { veh.currency = 'KES'; showVehicle(veh, null); });
    }, function () { toast('We could not open that car just now.', 'bad'); });
  }
  function showVehicle(v, op) {
    S.v = v; S.op = op || {}; S.quote = null; S.extras = {}; S.chauffeur = S.driver === 'chauffeur' && Number(v.chauffeur_metro) > 0;
    S.deliver = false; S.deliverPlace = null; S.cross = false; S.rating = 0;
    if (!S.start || !S.end) { S.start = defaultStart(); S.end = new Date(S.start.getTime() + 3 * 864e5); paintSearch(); }
    var saved = store(CONTACT_KEY);
    if (saved) S.contact = Object.assign(S.contact, saved);
    if (S.op.accepts_card === false && S.pay === 'card') S.pay = 'mpesa';
    renderVehicle();
    openSheet('ch-sheet');
    try { var u = new URL(global.location.href); u.searchParams.set('open', v.id); history.replaceState(null, '', u.pathname + '?' + u.searchParams.toString()); } catch (e) {}
    requestQuote();
  }
  function specCells(v) {
    var fuel = String(v.fuel || 'petrol');
    var eff = E.efficiency(v, S.profile || null);
    var cells = [
      ['seat', (v.seats || 5) + ' seats', 'Capacity'],
      ['gear', String(v.transmission || '').toLowerCase() === 'manual' ? 'Manual' : 'Automatic', 'Gearbox'],
      ['fuel', fuel.charAt(0).toUpperCase() + fuel.slice(1), eff ? eff.kmpl + ' km/l' : 'Fuel'],
      ['drive', E.DRIVE_LABEL[v.drive] ? E.DRIVE_LABEL[v.drive].replace('two-wheel drive', '2WD').replace('all-wheel drive', 'AWD').replace('four-wheel drive', '4×4').replace('low-range 4×4', '4×4 low') : '2WD', 'Drive'],
      ['mount', v.clearance_mm ? v.clearance_mm + ' mm' : '—', 'Clearance'],
      ['road', v.mileage_cap_km ? v.mileage_cap_km + ' km/day' : 'Unlimited', 'Mileage']
    ];
    return '<div class="dv-spec-grid">' + cells.map(function (c) { return '<div class="dv-spec-cell">' + icon(c[0]) + '<b>' + esc(c[1]) + '</b><small>' + esc(c[2]) + '</small></div>'; }).join('') + '</div>';
  }
  function fitHTML(v) {
    var g = grade(v);
    if (!g) return '';
    var cls = g.verdict === 'cleared' ? 'is-cleared' : g.verdict === 'caution' ? 'is-caution' : 'is-blocked';
    var title = g.verdict === 'cleared' ? 'Right car for ' + (S.profile.label || 'your trip') : g.verdict === 'caution' ? 'Workable, with care' : 'Not the car for this road';
    var items = (g.blockers || []).concat(g.reasons || []).slice(0, 4);
    return '<div class="dv-fit ' + cls + '">' + icon(g.verdict === 'cleared' ? 'shield' : 'warn') + '<div><b>' + esc(title) + '</b>' +
      (items.length ? '<ul>' + items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') + '</div></div>';
  }
  function renderVehicle() {
    var v = S.v, op = S.op || {}, cur = v.currency || 'KES';
    var photos = Array.isArray(v.photos) ? v.photos.filter(Boolean) : [];
    var gallery = photos.length ? '<div class="dv-gallery"><div class="dv-shots">' + photos.slice(0, 8).map(function (p) { return '<img src="' + esc(p) + '" alt="" loading="lazy" decoding="async">'; }).join('') + '</div>' +
      (photos.length > 1 ? '<div class="dv-dots">' + photos.slice(0, 8).map(function (_, i) { return '<i class="' + (i ? '' : 'is-on') + '"></i>'; }).join('') + '</div>' : '') + '</div>'
      : '<div class="dv-gallery">' + carArt(v) + '</div>';
    var chauffeurOK = Number(v.chauffeur_metro) > 0;
    var deliverOK = !!op.delivers && v.delivery_ok !== false;
    var extras = Array.isArray(v.extras) ? v.extras : [];
    var body =
      gallery +
      '<div class="dv-v-title"><b>' + esc([v.make, v.model].filter(Boolean).join(' ')) + '</b><small>' + esc([v.variant, v.year, CLASS_LABEL[v['class']], v.colour].filter(Boolean).join(' · ')) + '</small></div>' +
      '<div class="dv-specs" style="margin-top:10px">' + (v.instant_book ? '<span class="dv-flag is-instant">' + icon('bolt') + 'Instant book</span>' : '<span class="dv-spec">' + icon('clock') + 'Operator confirms' + (op.respond_window_mins ? ' in ' + Math.round(op.respond_window_mins / 60 * 10) / 10 + 'h' : '') + '</span>') +
        (deliverOK ? '<span class="dv-spec">' + icon('truck') + 'Delivers</span>' : '') + (v.cross_border_ok ? '<span class="dv-spec">' + icon('globe') + 'Cross-border OK</span>' : '') + '</div>' +
      specCells(v) + fitHTML(v) +
      (v.description ? '<p class="dv-help" style="font-size:14px;color:var(--ink-2);margin-top:12px">' + esc(v.description) + '</p>' : '') +
      '<div class="dv-opcard"><div class="dv-av">' + (op.logo_url ? '<img src="' + esc(op.logo_url) + '" alt="">' : esc(String(op.name || 'O').charAt(0))) + '</div><div><b>' + esc(op.name || 'Verified operator') + icon('verified') + '</b>' +
        '<small>' + [op.rating ? '★ ' + Number(op.rating).toFixed(1) : 'New on Cabana', op.completed_hires ? op.completed_hires + ' hires' : '', op.city || ''].filter(Boolean).map(esc).join(' · ') + '</small>' +
        '<small>Pay them by ' + ['M-Pesa', op.accepts_cash === false ? '' : 'cash', op.accepts_card ? 'card' : ''].filter(Boolean).join(', ') + '</small></div></div>' +

      '<div class="dv-label"><span>Your hire</span><small>Prices from the operator’s own rates</small></div>' +
      '<div class="dv-card">' +
        '<button class="dv-line" type="button" data-act="dates" style="width:100%;text-align:left">' + icon('cal') + '<span class="dv-line-body"><b>' + esc(fmtDate(S.start, true)) + ' → ' + esc(fmtDate(S.end, true)) + '</b><small>' + hireDays(S.start, S.end) + ' days · tap to change</small></span>' + icon('arrow') + '</button>' +
        (chauffeurOK ? '<label class="dv-line">' + icon('users') + '<span class="dv-line-body"><b>Add a driver</b><small>' + esc(moneyMajor(v.chauffeur_metro, cur)) + ' a day in town' + (v.chauffeur_upcountry > 0 ? ', ' + esc(moneyMajor(v.chauffeur_upcountry, cur)) + ' out of town' : '') + '</small></span><span class="dv-switch"><input type="checkbox" id="dv-chauffeur"' + (S.chauffeur ? ' checked' : '') + '><i></i></span></label>' : '') +
        (deliverOK ? '<label class="dv-line">' + icon('truck') + '<span class="dv-line-body"><b>Deliver and collect</b><small id="dv-deliver-sub">' + (S.deliverPlace ? esc(S.deliverPlace.title || S.deliverPlace.short || S.deliverPlace.label) : 'To your hotel, home or the airport') + '</small></span><span class="dv-switch"><input type="checkbox" id="dv-deliver"' + (S.deliver ? ' checked' : '') + '><i></i></span></label>' : '') +
        (v.cross_border_ok ? '<label class="dv-line">' + icon('globe') + '<span class="dv-line-body"><b>Crossing a border</b><small>Needs the operator’s written permission</small></span><span class="dv-switch"><input type="checkbox" id="dv-cross"' + (S.cross ? ' checked' : '') + '><i></i></span></label>' : '') +
      '</div>' +
      (extras.length ? '<div class="dv-label"><span>Extras</span><small>Set by the operator</small></div><div class="dv-card dv-extras">' + extras.map(function (x) {
        var q = S.extras[x.key] || 0, max = Math.max(1, Number(x.max) || 1);
        return '<div class="dv-line">' + icon('plus') + '<span class="dv-line-body"><b>' + esc(x.label || x.key) + '</b><small>' + esc(money(x.price_minor, cur)) + (x.per === 'hire' ? ' per hire' : ' a day') + '</small></span>' +
          '<div class="dv-stepper"><button type="button" data-extra="' + esc(x.key) + '" data-d="-1" aria-label="Fewer"' + (q <= 0 ? ' disabled' : '') + '>' + icon('minus') + '</button><output>' + q + '</output>' +
          '<button type="button" data-extra="' + esc(x.key) + '" data-d="1" aria-label="More"' + (q >= max ? ' disabled' : '') + '>' + icon('plus') + '</button></div></div>';
      }).join('') + '</div>' : '') +
      '<div class="dv-label"><span>The price</span><small>Cabana adds nothing</small></div><div class="dv-quote" id="dv-quote">' + quoteHTML() + '</div>' +

      '<div class="dv-label"><span>Who is renting</span><small>Shared with the operator only</small></div>' +
      '<div class="dv-fields"><input class="dv-input" id="dv-name" autocomplete="name" placeholder="Full name (as on the licence)" value="' + esc(S.contact.name) + '">' +
        '<input class="dv-input" id="dv-phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="Phone, e.g. +254 712 345 678" value="' + esc(S.contact.phone) + '">' +
        '<input class="dv-input" id="dv-email" type="email" inputmode="email" autocomplete="email" placeholder="Email for your confirmation (optional)" value="' + esc(S.contact.email) + '">' +
        '<div class="dv-fields-2" id="dv-licence"' + (S.chauffeur ? ' hidden' : '') + '><input class="dv-input" id="dv-age" inputmode="numeric" placeholder="Driver age" value="' + esc(S.contact.age) + '">' +
        '<input class="dv-input" id="dv-years" inputmode="numeric" placeholder="Years licensed" value="' + esc(S.contact.years) + '"></div>' +
        '<p class="dv-help" id="dv-licence-help"' + (S.chauffeur ? ' hidden' : '') + '>Driver ' + (v.min_driver_age || 23) + '+ with a licence held ' + (v.min_licence_years || 2) + '+ years. Bring it to collection.</p></div>' +
      '<div class="dv-label"><span>How you pay the operator</span><small>Directly, at collection</small></div>' +
      '<div class="dv-pay"><button type="button" data-pay="mpesa" aria-pressed="' + (S.pay === 'mpesa') + '">' + icon('mpesa') + 'M-Pesa</button>' +
        '<button type="button" data-pay="cash" aria-pressed="' + (S.pay === 'cash') + '"' + (op.accepts_cash === false ? ' disabled' : '') + '>' + icon('cash') + 'Cash</button>' +
        '<button type="button" data-pay="card" aria-pressed="' + (S.pay === 'card') + '"' + (op.accepts_card ? '' : ' disabled') + '>' + icon('card') + 'Card</button></div>' +
      '<div class="dv-note">' + icon('info') + '<span>Nothing is charged by Cabana. Once confirmed you get the operator’s number, pickup point and payment details, and a handover code for collection.</span></div>' +
      '<textarea class="dv-input" id="dv-notes" style="margin-top:12px" maxlength="600" placeholder="Flight number, child seat size, anything the operator should know">' + esc(S.notes || '') + '</textarea>' +
      '<p class="dv-err" id="dv-book-err" role="alert"></p>';
    var foot = '<div class="cm-swipe" id="dv-swipe"><span class="cm-swipe-label" id="dv-swipe-label">' + swipeLabel() + '</span><button class="cm-swipe-knob" type="button">' +
      '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></div>';
    sheetShell('ch-sheet', esc([v.make, v.model].filter(Boolean).join(' ')), body, foot);
    var sw = $('dv-swipe');
    if (M) M.swipe(sw, { onConfirm: book }); else sw.querySelector('.cm-swipe-knob').onclick = book;
    var shots = $('ch-sheet').querySelector('.dv-shots');
    if (shots) shots.addEventListener('scroll', function () {
      var i = Math.round(shots.scrollLeft / Math.max(1, shots.clientWidth));
      $('ch-sheet').querySelectorAll('.dv-dots i').forEach(function (d, k) { d.classList.toggle('is-on', k === i); });
    }, { passive: true });
  }
  function swipeLabel() {
    var cur = (S.v && S.v.currency) || 'KES';
    var instant = S.v && (S.v.instant_book || (S.op && S.op.instant_confirm));
    var total = S.quote && isObj(S.quote) && S.quote.total != null ? money(S.quote.total, S.quote.currency || cur) : null;
    return (instant ? 'Slide to book' : 'Slide to request') + '<small>' + (total ? esc(total) + ' · ' : '') + (instant ? 'confirmed straight away' : 'the operator confirms') + '</small>';
  }
  function quotePayload() {
    return {
      vehicle_id: S.v.id, pickup_at: S.start.toISOString(), return_at: S.end.toISOString(), chauffeur: S.chauffeur,
      upcountry: S.profile ? !['metro', 'highway', 'coast'].includes(S.profile.key) : false, trip_km: S.profile && S.profile.km ? S.profile.km : null,
      delivery: S.deliver && !!S.deliverPlace, delivery_label: S.deliverPlace ? (S.deliverPlace.label || S.deliverPlace.title) : null,
      delivery_lat: S.deliverPlace ? S.deliverPlace.lat : null, delivery_lng: S.deliverPlace ? S.deliverPlace.lng : null,
      extras: Object.keys(S.extras).filter(function (k) { return S.extras[k] > 0; }).map(function (k) { return { key: k, qty: S.extras[k] }; }),
      cross_border: S.cross
    };
  }
  var quoteT = 0;
  function requestQuote() {
    clearTimeout(quoteT);
    var seq = ++S.quoteSeq;
    var box = $('dv-quote');
    if (box) box.style.opacity = '.55';
    quoteT = setTimeout(function () {
      rpc('car_quote', { p: quotePayload() }).then(function (q) {
        if (seq !== S.quoteSeq) return;
        S.quote = isObj(q) ? q : { local: true };
        S.quoteErr = null;
        paintQuote();
      }, function (e) {
        if (seq !== S.quoteSeq) return;
        S.quote = { local: true };
        S.quoteErr = e && ERR[e.code] ? ERR[e.code] : null;
        paintQuote();
      });
    }, 220);
  }
  function localQuote() {
    var v = S.v, days = hireDays(S.start, S.end), cur = v.currency || 'KES';
    var q = E.quote({ vehicle: v, days: days, chauffeur: S.chauffeur, route: S.profile || 'metro', currency: cur, extras: [] });
    return { currency: cur, days: days, total: Math.round(q.total * 100), deposit: Math.round(Number(v.deposit || 0) * 100),
      lines: q.lines.filter(function (l) { return l.key !== 'insurance'; }).map(function (l) { return { key: l.key, label: l.label, detail: l.detail, amount: Math.round(l.amount * 100), good: l.good }; }), local: true };
  }
  function quoteHTML() {
    if (!S.v) return '';
    var q = S.quote && !S.quote.local ? S.quote : (S.quote ? localQuote() : null);
    if (!q) return '<span class="dv-skel" style="display:block;height:18px;width:70%;margin:6px 0"></span><span class="dv-skel" style="display:block;height:18px;width:50%;margin:10px 0"></span><span class="dv-skel" style="display:block;height:30px;width:40%;margin:16px 0 4px auto"></span>';
    var cur = q.currency || S.v.currency || 'KES';
    var lines = (q.lines || []).map(function (l) {
      return '<div class="dv-q-line' + (l.good ? ' is-good' : '') + '"><span>' + esc(l.label) + (l.detail ? '<small>' + esc(l.detail) + '</small>' : '') + '</span><b>' + (l.amount < 0 ? '−' : '') + esc(money(Math.abs(l.amount), cur)) + '</b></div>';
    }).join('');
    var warn = q.available === false ? '<div class="dv-fit is-blocked" style="margin:0 0 8px">' + icon('warn') + '<div><b>Booked for part of these dates</b>Try other dates, or request a similar car.</div></div>' : '';
    var err = S.quoteErr ? '<div class="dv-fit is-caution" style="margin:0 0 8px">' + icon('warn') + '<div><b>' + esc(S.quoteErr) + '</b></div></div>' : '';
    return warn + err + lines +
      '<div class="dv-q-total"><span>' + q.days + (q.days === 1 ? ' day' : ' days') + ' total</span><b>' + moneyHTML(q.total, cur) + '</b></div>' +
      '<div class="dv-q-note">+ refundable deposit ' + esc(money(q.deposit || 0, cur)) + ', held by the operator' + (q.local ? '. Estimate; the operator’s system confirms the exact figure when you book.' : '.') + '</div>';
  }
  function paintQuote() {
    var box = $('dv-quote');
    if (box) { box.innerHTML = quoteHTML(); box.style.opacity = ''; }
    var l = $('dv-swipe-label');
    if (l) l.innerHTML = swipeLabel();
  }
  function readContact() {
    ['name', 'phone', 'email', 'age', 'years'].forEach(function (k) { var el = $('dv-' + k); if (el) S.contact[k] = el.value.trim(); });
    var n = $('dv-notes'); if (n) S.notes = n.value.trim();
  }
  function bookErr(msg, field) {
    var e = $('dv-book-err');
    if (e) e.textContent = msg;
    haptic('warn');
    if (field) {
      var el = $(field);
      if (el) {
        el.classList.add('is-bad');
        el.addEventListener('input', function once() { el.classList.remove('is-bad'); el.removeEventListener('input', once); });
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setTimeout(function () { try { el.focus({ preventScroll: true }); } catch (x) {} }, 250);
      }
    }
    return Promise.resolve(false);
  }
  function book() {
    readContact();
    var c = S.contact, v = S.v;
    if (c.name.length < 2) return bookErr('Add the renter’s full name.', 'dv-name');
    var d = digits(c.phone);
    if (d.length < 9 || d.length > 15) return bookErr('Add a phone number the operator can call.', 'dv-phone');
    if (c.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) return bookErr('That email does not look right.', 'dv-email');
    if (!S.chauffeur) {
      if (!(Number(c.age) >= (v.min_driver_age || 23))) return bookErr('This car needs a driver aged ' + (v.min_driver_age || 23) + ' or over.', 'dv-age');
      if (!(Number(c.years) >= (v.min_licence_years || 0))) return bookErr('This car needs a licence held ' + (v.min_licence_years || 0) + '+ years.', 'dv-years');
    }
    if (S.deliver && !S.deliverPlace) return bookErr('Choose where the car should be delivered.', null);
    store(CONTACT_KEY, { name: c.name, phone: c.phone, email: c.email, age: c.age, years: c.years });
    var p = quotePayload();
    Object.assign(p, {
      name: c.name, phone: c.phone, email: c.email || null, driver_age: S.chauffeur ? null : Number(c.age), licence_years: S.chauffeur ? null : Number(c.years),
      notes: S.notes || null, pay_method: S.pay, trip_label: S.profile ? S.profile.label : null,
      route_key: S.profile ? S.profile.key : null, route_verdict: S.profile ? ((grade(v) || {}).verdict || null) : null
    });
    return rpc('car_booking_place', { p: p }).then(function (r) {
      if (!isObj(r) || !r.ref) throw new Error('offline');
      rememberHire('booking', r.ref, r.token);
      haptic('confirm');
      closeSheet('ch-sheet', true);
      toast(r.status === 'confirmed' ? 'Booked. The car is yours.' : 'Sent. The operator will confirm shortly.', 'good');
      openTrack('booking', r.ref, r.token);
      updateBadge();
      return true;
    }, function (e) {
      var msg = friendly(e);
      bookErr(msg, e.code === 'name_required' ? 'dv-name' : e.code === 'phone_required' ? 'dv-phone' : e.code === 'driver_too_young' ? 'dv-age' : e.code === 'licence_too_new' ? 'dv-years' : null);
      toast(msg, 'bad');
      if (e.code === 'vehicle_booked') requestQuote();
      return false;
    });
  }

  /* ── 12 · request a car ──────────────────────────────────────────── */
  var RQ = { cls: null, seats: 1, trans: 'any' };
  function openRequest() {
    var saved = store(CONTACT_KEY);
    if (saved) S.contact = Object.assign(S.contact, saved);
    var classes = ['economy', 'compact', 'crossover', 'suv4x4', 'safari', 'van', 'pickup', 'luxury'];
    var body =
      '<p class="dv-help" style="font-size:14px;margin:0 2px 4px;color:var(--ink-2)">Operators in range and the Cabana desk see this and answer with a priced offer. Accept one and it becomes a confirmed hire.</p>' +
      '<div class="dv-card" style="margin-top:12px">' +
        '<button class="dv-line" type="button" data-act="rq-where" style="width:100%;text-align:left">' + icon('pin') + '<span class="dv-line-body"><b id="dv-rq-where">' + esc(S.place ? (S.place.title || S.place.short || S.place.label) : 'Where do you want the car?') + '</b><small>Pick up</small></span>' + icon('arrow') + '</button>' +
        '<button class="dv-line" type="button" data-act="rq-dates" style="width:100%;text-align:left">' + icon('cal') + '<span class="dv-line-body"><b id="dv-rq-dates">' + esc(fmtDate(S.start, true)) + ' → ' + esc(fmtDate(S.end, true)) + '</b><small>' + hireDays(S.start, S.end) + ' days</small></span>' + icon('arrow') + '</button>' +
      '</div>' +
      '<div class="dv-label"><span>What kind of car</span><small>Optional</small></div><div class="dv-filters" style="margin:0 -16px;flex-wrap:wrap;overflow:visible">' +
        classes.map(function (k) { return '<button class="dv-chip" type="button" data-rq-class="' + k + '" aria-pressed="' + (RQ.cls === k) + '">' + esc(CLASS_LABEL[k]) + '</button>'; }).join('') + '</div>' +
      '<div class="dv-card" style="margin-top:10px">' +
        '<div class="dv-line">' + icon('seat') + '<span class="dv-line-body"><b>Seats at least</b></span><div class="dv-stepper"><button type="button" data-rq-seats="-1" aria-label="Fewer">' + icon('minus') + '</button><output id="dv-rq-seats">' + RQ.seats + '</output><button type="button" data-rq-seats="1" aria-label="More">' + icon('plus') + '</button></div></div>' +
        '<div class="dv-line">' + icon('gear') + '<span class="dv-line-body"><b>Gearbox</b></span><select class="dv-input" id="dv-rq-trans" style="width:150px;height:44px"><option value="any">Any</option><option value="automatic"' + (RQ.trans === 'automatic' ? ' selected' : '') + '>Automatic</option><option value="manual"' + (RQ.trans === 'manual' ? ' selected' : '') + '>Manual</option></select></div>' +
        '<label class="dv-line">' + icon('users') + '<span class="dv-line-body"><b>With a driver</b><small>Operator adds their driver rate</small></span><span class="dv-switch"><input type="checkbox" id="dv-rq-chauffeur"' + (S.driver === 'chauffeur' ? ' checked' : '') + '><i></i></span></label>' +
        '<label class="dv-line">' + icon('truck') + '<span class="dv-line-body"><b>Deliver it to me</b><small>To the pickup point above</small></span><span class="dv-switch"><input type="checkbox" id="dv-rq-delivery"><i></i></span></label>' +
      '</div>' +
      '<div class="dv-label"><span>Budget per day</span><small>Optional · helps operators answer</small></div><input class="dv-input" id="dv-rq-budget" inputmode="decimal" placeholder="e.g. 6000">' +
      '<div class="dv-label"><span>Where you are headed</span></div><input class="dv-input" id="dv-rq-trip" placeholder="e.g. Masai Mara for 3 nights" value="' + esc(S.profile ? S.profile.label : '') + '">' +
      '<textarea class="dv-input" id="dv-rq-notes" style="margin-top:8px" maxlength="600" placeholder="Anything else: roof tent, child seats, flight number"></textarea>' +
      '<div class="dv-label"><span>Your details</span><small>Shared with operators who answer</small></div>' +
      '<div class="dv-fields"><input class="dv-input" id="dv-rq-name" autocomplete="name" placeholder="Full name" value="' + esc(S.contact.name) + '">' +
        '<input class="dv-input" id="dv-rq-phone" type="tel" autocomplete="tel" placeholder="Phone" value="' + esc(S.contact.phone) + '">' +
        '<input class="dv-input" id="dv-rq-email" type="email" autocomplete="email" placeholder="Email (optional)" value="' + esc(S.contact.email) + '">' +
        '<div class="dv-fields-2"><input class="dv-input" id="dv-rq-age" inputmode="numeric" placeholder="Driver age" value="' + esc(S.contact.age) + '"><input class="dv-input" id="dv-rq-years" inputmode="numeric" placeholder="Years licensed" value="' + esc(S.contact.years) + '"></div></div>' +
      '<p class="dv-err" id="dv-rq-err" role="alert"></p>';
    var foot = '<div class="cm-swipe" id="dv-rq-swipe"><span class="cm-swipe-label">Slide to send request<small>Free · operators answer with offers</small></span><button class="cm-swipe-knob" type="button"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></div>';
    sheetShell('dv-request', 'Request a car', body, foot);
    openSheet('dv-request');
    var sw = $('dv-rq-swipe');
    if (M) M.swipe(sw, { onConfirm: sendRequest }); else sw.querySelector('.cm-swipe-knob').onclick = sendRequest;
  }
  function rqErr(msg, field) {
    $('dv-rq-err').textContent = msg;
    haptic('warn');
    if (field) { var el = $(field); if (el) { el.classList.add('is-bad'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.addEventListener('input', function once() { el.classList.remove('is-bad'); el.removeEventListener('input', once); }); } }
    return Promise.resolve(false);
  }
  function sendRequest() {
    var val = function (id) { var el = $(id); return el ? el.value.trim() : ''; };
    var name = val('dv-rq-name'), phone = val('dv-rq-phone'), email = val('dv-rq-email');
    if (!S.place) return rqErr('Choose where you want the car.', null);
    if (!S.start || !S.end) return rqErr('Choose your dates.', null);
    if (name.length < 2) return rqErr('Add your full name.', 'dv-rq-name');
    var d = digits(phone);
    if (d.length < 9 || d.length > 15) return rqErr('Add a phone number operators can call.', 'dv-rq-phone');
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return rqErr('That email does not look right.', 'dv-rq-email');
    var cc = countryOf(S.place);
    if (!cc) return rqErr('Choose a pickup in Africa.', null);
    S.contact = Object.assign(S.contact, { name: name, phone: phone, email: email, age: val('dv-rq-age'), years: val('dv-rq-years') });
    store(CONTACT_KEY, S.contact);
    var budget = Number(String(val('dv-rq-budget')).replace(/[^\d.]/g, ''));
    var p = {
      country_code: cc, city: S.place.city || null, pickup_label: S.place.label || S.place.title, pickup_lat: S.place.lat, pickup_lng: S.place.lng,
      pickup_at: S.start.toISOString(), return_at: S.end.toISOString(), 'class': RQ.cls, seats_min: RQ.seats, transmission: val('dv-rq-trans') || 'any',
      chauffeur: !!($('dv-rq-chauffeur') && $('dv-rq-chauffeur').checked), delivery: !!($('dv-rq-delivery') && $('dv-rq-delivery').checked),
      budget_day_minor: budget > 0 ? Math.round(budget * 100) : null, trip_label: val('dv-rq-trip') || null, notes: val('dv-rq-notes') || null,
      name: name, phone: phone, email: email || null, driver_age: val('dv-rq-age') ? Number(val('dv-rq-age')) : null, licence_years: val('dv-rq-years') ? Number(val('dv-rq-years')) : null
    };
    return rpc('car_request_place', { p: p }).then(function (r) {
      if (!isObj(r) || !r.ref) throw new Error('offline');
      rememberHire('request', r.ref, r.token);
      haptic('confirm');
      closeSheet('dv-request', true);
      toast(r.operators_notified ? 'Sent to ' + r.operators_notified + ' operator' + (r.operators_notified === 1 ? '' : 's') + ' and the Cabana desk.' : 'Sent. The Cabana desk is finding you a car.', 'good');
      openTrack('request', r.ref, r.token);
      updateBadge();
      return true;
    }, function (e) { var msg = friendly(e); rqErr(msg, e.code === 'name_required' ? 'dv-rq-name' : e.code === 'phone_required' ? 'dv-rq-phone' : null); toast(msg, 'bad'); return false; });
  }

  /* ── 13 · tracking a hire or a request ───────────────────────────── */
  function openTrack(kind, ref, token) {
    S.trackKind = kind; S.trackRef = ref; S.trackToken = token || tokenFor(ref); S.track = null; S.rating = 0; S.trackSig = '';
    sheetShell('dv-track', kind === 'booking' ? 'Your hire' : 'Your car request',
      '<div class="dv-status"><div class="dv-eyebrow">' + esc(ref) + '</div><h3>Opening…</h3><p>&nbsp;</p></div>', null);
    openSheet('dv-track');
    try { var u = new URL(global.location.href); u.searchParams.delete('open'); u.searchParams.set(kind, ref); history.replaceState(null, '', u.pathname + '?' + u.searchParams.toString()); } catch (e) {}
    pollTrack();
  }
  function pollTrack() {
    clearTimeout(S.pollT);
    if (!S.trackRef || $('dv-track').hidden) return;
    var fn = S.trackKind === 'booking' ? 'car_booking_track' : 'car_request_track';
    rpc(fn, { p_ref: S.trackRef, p_token: S.trackToken }).then(function (t) {
      if (!isObj(t)) throw Object.assign(new Error('offline'), { code: 'offline' });
      S.track = t;
      renderTrack();
      var st = t.status, ms = 0;
      if (S.trackKind === 'booking') ms = st === 'requested' ? 9000 : st === 'confirmed' || st === 'active' ? 30000 : 0;
      else ms = st === 'open' ? 10000 : 0;
      if (ms) S.pollT = setTimeout(pollTrack, doc.hidden ? ms * 3 : ms);
    }, function (e) {
      var body = $('dv-track').querySelector('.dv-panel-body');
      if (body) body.innerHTML = '<div class="dv-status"><div class="dv-eyebrow">' + esc(S.trackRef) + '</div><h3>We could not open this</h3><p>' +
        esc(e && (e.code === 'booking_not_found' || e.code === 'request_not_found') ? 'Open it on the device you booked from, or sign in with the same account.' : friendly(e)) + '</p></div>';
    });
  }
  function statusCopy(t) {
    var op = (t.operator && t.operator.name) || 'the operator';
    return {
      requested: ['Waiting for ' + op, 'They usually answer within ' + ((t.operator && t.operator.respond_window_mins) ? Math.round(t.operator.respond_window_mins / 60 * 10) / 10 + ' hours' : 'a couple of hours') + '. Nothing is charged meanwhile.'],
      confirmed: ['Confirmed. It is yours.', 'Collect on ' + fmtDate(new Date(t.pickup_at), true) + '. Give your handover code when you take the keys.'],
      active: ['Enjoy the drive', 'Return by ' + fmtDate(new Date(t.return_at), true) + '. Call ' + op + ' if anything comes up on the road.'],
      completed: ['Hire complete', 'Thanks for driving with Cabana.'],
      declined: [op.charAt(0).toUpperCase() + op.slice(1) + ' could not take it', t.decline_reason || 'Choose another car for the same dates in one tap.'],
      expired: ['No answer in time', 'The operator did not answer. Nothing was charged. Try another car or post a request.'],
      cancelled: ['Hire cancelled', t.cancel_reason || 'Nothing is owed.'],
      no_show: ['Marked as not collected', 'Talk to the operator if this is wrong.']
    }[t.status] || [t.status, ''];
  }
  function renderTrack() {
    var t = S.track;
    if (!t) return;
    var sig = JSON.stringify([S.trackKind, t.status, (t.offers || []).map(function (o) { return o.id + o.total; }), t.rating, t.paid_at, t.desk]);
    if (sig === S.trackSig) return;
    S.trackSig = sig;
    var body = $('dv-track').querySelector('.dv-panel-body');
    if (!body) return;
    body.innerHTML = S.trackKind === 'booking' ? bookingHTML(t) : requestHTML(t);
    if (M) M.press(body);
  }
  function bookingHTML(t) {
    var cur = t.currency || 'KES', copy = statusCopy(t), op = t.operator || {}, v = t.vehicle || {};
    var steps = ['requested', 'confirmed', 'active', 'completed'], i = steps.indexOf(t.status);
    var tl = i > -1 ? '<div class="dv-timeline">' + steps.map(function (s, n) { return '<i class="' + (n < i || t.status === 'completed' ? 'is-done' : n === i ? 'is-now' : '') + '"></i>'; }).join('') + '</div>' +
      '<div class="dv-tl-labels"><span>Sent</span><span>Confirmed</span><span>On the road</span><span>Returned</span></div>' : '';
    var html = '<div class="dv-status"><div class="dv-eyebrow">Hire ' + esc(t.ref) + '</div><h3>' + esc(copy[0]) + '</h3><p>' + esc(copy[1]) + '</p>' + tl + '</div>';
    html += '<div class="dv-opcard"><div style="width:110px;flex:none">' + carArt({ make: v.make, model: v.model, 'class': v['class'], body: v.body, colour: v.colour }) + '</div><div><b>' + esc([v.make, v.model].filter(Boolean).join(' ') || 'Your car') + '</b>' +
      '<small>' + esc(fmtDate(new Date(t.pickup_at), true)) + ' → ' + esc(fmtDate(new Date(t.return_at), true)) + '</small><small>' + esc(op.name || '') + (t.with_chauffeur ? ' · with driver' : '') + '</small></div></div>';
    if ((t.status === 'confirmed' || t.status === 'active') && t.handover_code) {
      html += '<div class="dv-code"><div><b>' + (t.status === 'active' ? 'Handover done' : 'Your handover code') + '</b><small>' + (t.status === 'active' ? 'The hire is running.' : 'Give it to the operator only when you take the keys.') + '</small></div>' +
        '<div class="dv-digits" aria-label="Handover code ' + esc(String(t.handover_code).split('').join(' ')) + '">' + String(t.handover_code).split('').map(function (d) { return '<i>' + esc(d) + '</i>'; }).join('') + '</div></div>';
    }
    if (t.status === 'confirmed' || t.status === 'active' || t.status === 'completed') {
      var phone = digits(op.phone || op.whatsapp || '');
      var nav = op.lat != null ? 'https://www.google.com/maps/dir/?api=1&destination=' + op.lat + ',' + op.lng : op.pickup_address ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(op.pickup_address) : '';
      if (t.delivery && t.delivery_label) nav = '';
      html += '<div class="dv-contact"><a href="' + (phone ? 'tel:+' + phone : '#') + '"' + (phone ? '' : ' aria-disabled="true"') + '><i>' + icon('phone') + '</i>Call</a>' +
        '<a href="' + (phone ? 'https://wa.me/' + digits(op.whatsapp || op.phone) + '?text=' + encodeURIComponent('Hi, this is ' + (t.customer_name || '') + ' about Cabana hire ' + t.ref + '.') : '#') + '" target="_blank" rel="noopener"><i>' + icon('chat') + '</i>WhatsApp</a>' +
        '<a href="' + (nav || '#') + '" target="_blank" rel="noopener"><i>' + icon('nav') + '</i>' + (t.delivery ? 'Delivered' : 'Directions') + '</a></div>';
      html += '<div class="dv-card" style="margin-top:12px">' +
        '<div class="dv-line">' + icon('pin') + '<span class="dv-line-body"><b>' + esc(t.delivery ? (t.delivery_label || 'Delivered to you') : (op.pickup_address || op.city || 'Operator depot')) + '</b><small>' + (t.delivery ? 'Delivery and collection' : 'Collect here') + '</small></span></div>' +
        '<div class="dv-line">' + icon(t.pay_method === 'card' ? 'card' : t.pay_method === 'cash' ? 'cash' : 'mpesa') + '<span class="dv-line-body"><b>Pay ' + esc(op.name || 'the operator') + ' ' + esc(money(t.total, cur)) + '</b><small>' +
          (t.pay_method === 'mpesa' ? (op.mpesa_till ? 'M-Pesa till ' + esc(op.mpesa_till) : op.mpesa_paybill ? 'Paybill ' + esc(op.mpesa_paybill) + (op.mpesa_account ? ', account ' + esc(op.mpesa_account) : '') : 'By M-Pesa at collection') : t.pay_method === 'card' ? 'By card at collection' : 'In cash at collection') +
          ' · deposit ' + esc(money(t.deposit || 0, cur)) + (t.paid_at ? ' · marked paid' : '') + '</small></span></div></div>';
    }
    if (t.lines && t.lines.length) {
      html += '<div class="dv-label"><span>The price</span><small>' + (t.days || '') + ' days</small></div><div class="dv-quote">' + t.lines.map(function (l) {
        return '<div class="dv-q-line' + (l.good ? ' is-good' : '') + '"><span>' + esc(l.label) + (l.detail ? '<small>' + esc(l.detail) + '</small>' : '') + '</span><b>' + (l.amount < 0 ? '−' : '') + esc(money(Math.abs(l.amount), cur)) + '</b></div>';
      }).join('') + '<div class="dv-q-total"><span>Total</span><b>' + moneyHTML(t.total, cur) + '</b></div></div>';
    }
    if (t.status === 'completed' && !t.rating) {
      html += '<div style="text-align:center;margin-top:18px"><h3 class="dv-h3">How was ' + esc(op.name || 'the operator') + '?</h3><div class="dv-stars" role="radiogroup" aria-label="Rating">' +
        [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" role="radio" data-star="' + n + '" aria-label="' + n + ' stars" aria-checked="false"><svg viewBox="0 0 24 24"><path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9Z"/></svg></button>'; }).join('') + '</div>' +
        '<textarea class="dv-input" id="dv-review" maxlength="600" placeholder="The car, the handover, the return (optional)"></textarea>' +
        '<button class="dv-btn" type="button" data-act="rate" style="margin-top:10px" disabled>Send rating</button></div>';
    } else if (t.rating) {
      html += '<p class="dv-help" style="text-align:center;margin-top:16px">You rated this hire ' + t.rating + '★. Thank you.</p>';
    }
    var acts = '';
    if (t.status === 'requested' || t.status === 'confirmed') acts += '<button class="dv-btn is-danger is-sm" type="button" data-act="cancel-hire">Cancel hire</button>';
    if (t.status === 'declined' || t.status === 'expired' || t.status === 'cancelled') acts += '<button class="dv-btn is-sm" type="button" data-act="browse">Find another car</button><button class="dv-btn is-ink is-sm" type="button" data-act="request">Request a car</button>';
    if (acts) html += '<div class="dv-row" style="margin-top:14px">' + acts + '</div>';
    html += '<p class="dv-help" style="text-align:center;margin-top:14px">Cabana takes 0%. <button class="dv-link" type="button" data-act="help">Need help with this hire?</button></p>';
    return html;
  }
  function requestHTML(t) {
    var cur = t.currency || 'KES';
    var offers = t.offers || [];
    var head = t.status === 'open' ? (offers.length ? offers.length + (offers.length === 1 ? ' offer' : ' offers') + ' for you' : 'Finding you a car') :
      t.status === 'matched' ? 'You chose a car' : t.status === 'cancelled' ? 'Request cancelled' : 'Request closed';
    var sub = t.status === 'open' ? (offers.length ? 'Compare and accept the one you want. It becomes a confirmed hire.' : (t.desk ? 'The Cabana desk is calling partner operators for you.' : 'Operators nearby have your request. Offers appear here, and we notify you.')) :
      t.status === 'matched' ? 'Your hire is confirmed. Open it for the handover code and how to pay.' : 'No offer was accepted.';
    var html = '<div class="dv-status"><div class="dv-eyebrow">Request ' + esc(t.ref) + '</div><h3>' + esc(head) + '</h3><p>' + esc(sub) + '</p>' +
      '<p style="margin-top:10px;font-size:13px">' + esc(t.pickup_label || '') + ' · ' + esc(fmtDate(new Date(t.pickup_at))) + ' → ' + esc(fmtDate(new Date(t.return_at))) + ' · ' + (t.days || '') + ' days' + (t['class'] ? ' · ' + esc(CLASS_LABEL[t['class']] || t['class']) : '') + '</p></div>';
    if (t.status === 'matched' && t.booking) {
      html += '<button class="dv-btn" type="button" data-open-booking="' + esc(t.booking.ref) + '" data-token="' + esc(t.booking_token || '') + '" style="margin-top:12px">Open my hire ' + esc(t.booking.ref) + '</button>';
    }
    if (t.status === 'open') {
      if (!offers.length) {
        html += '<div class="dv-empty" style="margin-top:12px"><div class="dv-empty-art" style="width:200px">' + carArt({ 'class': t['class'] || 'suv4x4' }, { paint: '#12c6e8' }) + '</div>' +
          '<p style="margin:0 auto">Most requests get their first offer within the hour. Keep this page, or come back from “Your hires”.</p></div>';
      } else {
        html += '<div style="margin-top:12px">' + offers.map(function (o) {
          return '<div class="dv-offer"><div class="dv-offer-top">' + carArt({ 'class': o['class'] || t['class'] || 'suv4x4', make: o.vehicle_label }, { cls: 'car' }) +
            '<div><b>' + esc(o.vehicle_label || 'Vehicle') + '</b><small>' + esc(o.operator || 'Operator') + (o.verified ? ' · verified' : o.source === 'desk' ? ' · via Cabana desk' : '') + (o.rating ? ' · ★ ' + Number(o.rating).toFixed(1) : '') + '</small>' +
            '<small>' + [o.seats ? o.seats + ' seats' : '', o.transmission ? o.transmission : '', o.year || ''].filter(Boolean).map(esc).join(' · ') + '</small></div>' +
            '<div class="dv-offer-price"><b>' + moneyHTML(o.total, o.currency || cur) + '</b><small>' + esc(money(o.day_rate, o.currency || cur)) + '/day · deposit ' + esc(money(o.deposit || 0, o.currency || cur)) + '</small></div></div>' +
            (o.note ? '<p>“' + esc(o.note) + '”</p>' : '') +
            '<button class="dv-btn" type="button" data-accept="' + esc(o.id) + '" data-press>Accept · ' + esc(money(o.total, o.currency || cur)) + '</button></div>';
        }).join('') + '</div>';
      }
      html += '<div class="dv-row" style="margin-top:14px"><button class="dv-btn is-danger is-sm" type="button" data-act="cancel-request">Cancel request</button></div>';
    }
    html += '<p class="dv-help" style="text-align:center;margin-top:14px"><button class="dv-link" type="button" data-act="help">Questions? Talk to Cabana</button></p>';
    return html;
  }
  function confirmModal(title, text, okLabel, onOk) {
    var m = $('dv-place');
    m.innerHTML = '<div class="dv-scrim" data-close></div><div class="dv-modal-card"><div class="dv-mhead"><h2 class="dv-h3">' + esc(title) + '</h2></div>' +
      '<div class="dv-mbody"><p style="margin:0;color:var(--ink-2)">' + esc(text) + '</p></div><div class="dv-mfoot"><div class="dv-row"><button class="dv-btn is-ghost is-sm" type="button" data-close>Keep it</button>' +
      '<button class="dv-btn is-sm" type="button" id="dv-confirm-ok" style="background:var(--danger)">' + esc(okLabel) + '</button></div></div></div>';
    m.hidden = false;
    $('dv-confirm-ok').onclick = function () { var b = this; b.classList.add('is-busy'); onOk(function () { m.hidden = true; }, function () { b.classList.remove('is-busy'); }); };
  }

  /* ── 14 · your hires ─────────────────────────────────────────────── */
  function listHires() {
    var pairs = hires().map(function (h) { return { ref: h.ref, token: h.token }; });
    return rpc('car_hires_list', { p_pairs: pairs }).then(function (r) { return isObj(r) ? r : { bookings: [], requests: [] }; }, function () { return { bookings: [], requests: [] }; });
  }
  function pill(st) {
    var m = { requested: ['Waiting', 'is-wait'], confirmed: ['Confirmed', 'is-ok'], active: ['On the road', 'is-live'], completed: ['Completed', ''], declined: ['Declined', 'is-no'],
      expired: ['Expired', 'is-no'], cancelled: ['Cancelled', 'is-no'], no_show: ['No show', 'is-no'], open: ['Open', 'is-live'], matched: ['Matched', 'is-ok'] }[st] || [st, ''];
    return '<span class="dv-pill ' + m[1] + '">' + esc(m[0]) + '</span>';
  }
  function openHires() {
    sheetShell('dv-hires', 'Your hires', '<p class="dv-help">Loading…</p>', null);
    openSheet('dv-hires');
    listHires().then(function (r) {
      var b = r.bookings || [], q = r.requests || [];
      var body = $('dv-hires').querySelector('.dv-panel-body');
      if (!b.length && !q.length) {
        body.innerHTML = '<div class="dv-empty"><div class="dv-empty-art" style="width:220px">' + carArt({ 'class': 'crossover' }) + '</div><h3 class="dv-h3">No hires yet</h3><p>Hires and requests from this device, or your signed-in account, show up here with live status.</p><button class="dv-btn is-sm" type="button" data-close style="max-width:240px;margin:0 auto">Browse cars</button></div>';
        return;
      }
      var html = '';
      if (q.length) html += '<div class="dv-label"><span>Car requests</span></div>' + q.map(function (x) {
        return '<button class="dv-hire-row" type="button" data-track="request" data-ref="' + esc(x.ref) + '" data-token="' + esc(x.token || '') + '">' + carArt({ 'class': x['class'] || 'suv4x4' }, { cls: 'car' }) +
          '<div><b>' + esc(x.pickup_label || 'Car request') + '</b><small>' + esc(fmtDate(new Date(x.pickup_at))) + ' → ' + esc(fmtDate(new Date(x.return_at))) + (x.offers ? ' · ' + x.offers + ' offer' + (x.offers === 1 ? '' : 's') : '') + '</small></div>' + pill(x.status) + '</button>';
      }).join('');
      if (b.length) html += '<div class="dv-label"><span>Hires</span></div>' + b.map(function (x) {
        return '<button class="dv-hire-row" type="button" data-track="booking" data-ref="' + esc(x.ref) + '" data-token="' + esc(x.token || '') + '">' + carArt({ make: x.vehicle }, { cls: 'car' }) +
          '<div><b>' + esc(String(x.vehicle || 'Car').trim() || 'Car') + '</b><small>' + esc(fmtDate(new Date(x.pickup_at))) + ' → ' + esc(fmtDate(new Date(x.return_at))) + ' · ' + esc(money(x.total, x.currency)) + '</small></div>' + pill(x.status) + '</button>';
      }).join('');
      body.innerHTML = html;
    });
  }
  function updateBadge() {
    listHires().then(function (r) {
      var n = (r.bookings || []).filter(function (x) { return x.status === 'requested' || x.status === 'confirmed' || x.status === 'active'; }).length +
        (r.requests || []).filter(function (x) { return x.status === 'open'; }).length;
      var b = $('dv-hires-badge');
      if (b) { b.hidden = !n; b.textContent = n; }
    });
  }

  /* ── 15 · events ─────────────────────────────────────────────────── */
  function wire() {
    $('dv-where').onclick = function () { openPlace('Where do you collect the car?', function (p) { S.place = p; paintSearch(); loadFleet(); if (S.dest) setDest(S.dest); }); };
    $('dv-when').onclick = function () { openDates(); };
    $('dv-driver').onclick = function (e) { var b = e.target.closest('[data-driver]'); if (!b) return; S.driver = b.getAttribute('data-driver'); haptic('tick'); paintSearch(); renderGrid(); };
    $('dv-go').onclick = function () {
      haptic('tick');
      if (!S.place) { openPlace('Where do you collect the car?', function (p) { S.place = p; paintSearch(); loadFleet().then(scrollToResults); }); return; }
      loadFleet().then(scrollToResults);
    };
    $('dv-hires-btn').onclick = openHires;
    $('dv-dest').onclick = function () { openPlace('Where will you drive?', function (p) { setDest(p); }, { locate: false, placeholder: 'Park, town, beach or border' }); };
    $('dv-routes').onclick = function (e) {
      var b = e.target.closest('[data-route]'); if (!b) return;
      var r = ROUTES[+b.getAttribute('data-route')];
      haptic('tick');
      var from = { title: r[0], label: r[0], lat: r[1], lng: r[2], cc: r[6], countryCode: r[6].toLowerCase(), city: r[0] };
      if (!S.place || Math.abs(S.place.lat - r[1]) > 0.6 || Math.abs(S.place.lng - r[2]) > 0.6) { S.place = from; paintSearch(); loadFleet(); }
      setDest({ title: r[3], label: r[3], lat: r[4], lng: r[5], cc: r[6], countryCode: r[6].toLowerCase() }, S.place);
    };
    $('dv-filters').onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      haptic('tick');
      if (b.hasAttribute('data-class')) S.filter = b.getAttribute('data-class');
      if (b.getAttribute('data-toggle') === 'auto') S.auto = !S.auto;
      if (b.getAttribute('data-toggle') === 'delivery') S.delivery = !S.delivery;
      if (b.getAttribute('data-toggle') === 'instant') S.instant = !S.instant;
      renderFilters(); renderGrid();
    };
    $('dv-sort').onchange = function () { S.sort = this.value; renderGrid(); };
    $('dv-grid').onclick = function (e) {
      var c = e.target.closest('[data-vehicle]'); if (c) { haptic('tick'); openVehicle(c.getAttribute('data-vehicle')); }
    };

    doc.addEventListener('click', function (e) {
      var t = e.target;
      var act = t.closest && t.closest('[data-act]');
      if (act) {
        var a = act.getAttribute('data-act');
        if (a === 'request') { openRequest(); return; }
        if (a === 'clear-trip') { setDest(null); return; }
        if (a === 'dates') { readContact(); openDates(function () { renderVehicle(); requestQuote(); paintSearch(); loadFleet(); }); return; }
        if (a === 'rq-where') { openPlace('Where do you want the car?', function (p) { S.place = p; paintSearch(); var el = $('dv-rq-where'); if (el) el.textContent = p.title || p.short || p.label; }); return; }
        if (a === 'rq-dates') { openDates(function () { var el = $('dv-rq-dates'); if (el) el.textContent = fmtDate(S.start, true) + ' → ' + fmtDate(S.end, true); loadFleet(); }); return; }
        if (a === 'browse') { closeSheet('dv-track'); scrollToResults(); return; }
        if (a === 'help') { if (global.CabanaSupport && global.CabanaSupport.open) global.CabanaSupport.open('I need help with Cabana Drive ' + (S.trackRef || '') + '. '); else global.location.href = '/help'; return; }
        if (a === 'cancel-hire') {
          confirmModal('Cancel this hire?', 'The operator is told straight away and the car is freed for those dates.', 'Cancel hire', function (done, fail) {
            rpc('car_booking_cancel', { p_ref: S.trackRef, p_token: S.trackToken, p_reason: null }).then(function (b) { done(); S.track = b; S.trackSig = ''; renderTrack(); updateBadge(); toast('Hire cancelled.', 'good'); },
              function (er) { fail(); toast(friendly(er), 'bad'); });
          });
          return;
        }
        if (a === 'cancel-request') {
          confirmModal('Cancel this request?', 'Operators stop seeing it and any offers lapse.', 'Cancel request', function (done, fail) {
            rpc('car_request_cancel', { p_ref: S.trackRef, p_token: S.trackToken }).then(function (q) { done(); S.track = q; S.trackSig = ''; renderTrack(); updateBadge(); },
              function (er) { fail(); toast(friendly(er), 'bad'); });
          });
          return;
        }
        if (a === 'rate') {
          var rv = $('dv-review'); act.classList.add('is-busy');
          rpc('car_booking_rate', { p_ref: S.trackRef, p_token: S.trackToken, p_rating: S.rating, p_review: rv ? rv.value.trim() || null : null }).then(function (b) {
            S.track = b; S.trackSig = ''; renderTrack(); toast('Thank you. Your rating is in.', 'good'); haptic('confirm');
          }, function (er) { act.classList.remove('is-busy'); toast(friendly(er), 'bad'); });
          return;
        }
      }
      var ex = t.closest && t.closest('[data-extra]');
      if (ex && S.v) {
        var key = ex.getAttribute('data-extra'), d = +ex.getAttribute('data-d');
        var x = (S.v.extras || []).filter(function (y) { return y.key === key; })[0];
        var max = Math.max(1, Number(x && x.max) || 1);
        S.extras[key] = Math.max(0, Math.min(max, (S.extras[key] || 0) + d));
        var row = ex.closest('.dv-stepper');
        row.querySelector('output').textContent = S.extras[key];
        row.querySelectorAll('button')[0].disabled = S.extras[key] <= 0;
        row.querySelectorAll('button')[1].disabled = S.extras[key] >= max;
        haptic('tick'); requestQuote(); return;
      }
      var pay = t.closest && t.closest('[data-pay]');
      if (pay && !pay.disabled) {
        S.pay = pay.getAttribute('data-pay');
        doc.querySelectorAll('[data-pay]').forEach(function (b) { b.setAttribute('aria-pressed', b === pay); });
        haptic('tick'); return;
      }
      var rqc = t.closest && t.closest('[data-rq-class]');
      if (rqc) {
        var k = rqc.getAttribute('data-rq-class'); RQ.cls = RQ.cls === k ? null : k;
        doc.querySelectorAll('[data-rq-class]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-rq-class') === RQ.cls); });
        haptic('tick'); return;
      }
      var rqs = t.closest && t.closest('[data-rq-seats]');
      if (rqs) { RQ.seats = Math.max(1, Math.min(60, RQ.seats + +rqs.getAttribute('data-rq-seats'))); $('dv-rq-seats').textContent = RQ.seats; haptic('tick'); return; }
      var acc = t.closest && t.closest('[data-accept]');
      if (acc) {
        acc.classList.add('is-busy');
        rpc('car_request_accept', { p_ref: S.trackRef, p_token: S.trackToken, p_offer: acc.getAttribute('data-accept') }).then(function (r) {
          haptic('confirm'); confetti();
          rememberHire('booking', r.booking_ref, r.token);
          toast('Done. Your hire is confirmed.', 'good');
          openTrack('booking', r.booking_ref, r.token);
          updateBadge();
        }, function (er) { acc.classList.remove('is-busy'); toast(friendly(er), 'bad'); pollTrack(); });
        return;
      }
      var ob = t.closest && t.closest('[data-open-booking]');
      if (ob) { openTrack('booking', ob.getAttribute('data-open-booking'), ob.getAttribute('data-token') || tokenFor(ob.getAttribute('data-open-booking'))); return; }
      var tr = t.closest && t.closest('[data-track]');
      if (tr) { closeSheet('dv-hires', true); openTrack(tr.getAttribute('data-track'), tr.getAttribute('data-ref'), tr.getAttribute('data-token') || tokenFor(tr.getAttribute('data-ref'))); return; }
      var star = t.closest && t.closest('[data-star]');
      if (star) {
        S.rating = +star.getAttribute('data-star'); haptic('tick');
        doc.querySelectorAll('#dv-track [data-star]').forEach(function (b) { var n = +b.getAttribute('data-star'); b.classList.toggle('is-on', n <= S.rating); b.setAttribute('aria-checked', n === S.rating); });
        var rb = doc.querySelector('#dv-track [data-act="rate"]'); if (rb) rb.disabled = false;
      }
    });
    doc.addEventListener('change', function (e) {
      var id = e.target.id;
      if (id === 'dv-chauffeur') {
        readContact(); S.chauffeur = e.target.checked;
        var lic = $('dv-licence'), help = $('dv-licence-help');
        if (lic) lic.hidden = S.chauffeur; if (help) help.hidden = S.chauffeur;
        requestQuote();
      }
      if (id === 'dv-deliver') {
        S.deliver = e.target.checked;
        if (S.deliver && !S.deliverPlace) {
          openPlace('Deliver the car to…', function (p) {
            S.deliverPlace = p; var sub = $('dv-deliver-sub'); if (sub) sub.textContent = p.title || p.short || p.label; requestQuote();
          }, { placeholder: 'Hotel, home or airport' });
        } else requestQuote();
      }
      if (id === 'dv-cross') { S.cross = e.target.checked; requestQuote(); }
    });
    doc.addEventListener('visibilitychange', function () { if (!doc.hidden && S.trackRef && !$('dv-track').hidden) pollTrack(); });
    var top = $('dv-top');
    global.addEventListener('scroll', function () { top.classList.toggle('is-solid', global.scrollY > 24); }, { passive: true });
  }
  function scrollToResults() {
    var r = $('dv-results');
    if (r) global.scrollTo({ top: r.getBoundingClientRect().top + global.scrollY - 70, behavior: M && M.reduced() ? 'auto' : 'smooth' });
  }
  function confetti() {
    if (M && M.reduced()) return;
    var box = doc.createElement('div');
    box.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:300;overflow:hidden';
    var colours = ['#2ef2d0', '#12c6e8', '#3d7bff', '#ffb020', '#ff5c7a'];
    for (var i = 0; i < 40; i++) {
      var p = doc.createElement('i');
      p.style.cssText = 'position:absolute;top:-12px;width:9px;height:14px;border-radius:2px;left:' + (Math.random() * 100) + '%;background:' + colours[i % 5];
      p.animate([{ transform: 'translate3d(0,0,0) rotate(0)', opacity: 1 }, { transform: 'translate3d(' + (Math.random() * 160 - 80) + 'px,105vh,0) rotate(' + (Math.random() * 720 - 360) + 'deg)', opacity: 0 }],
        { duration: 1600 + Math.random() * 500, delay: Math.random() * 300, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
      box.appendChild(p);
    }
    doc.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 2600);
  }

  /* ── 16 · boot ───────────────────────────────────────────────────── */
  function boot() {
    $('dv-hero-car').innerHTML = heroArt();
    renderFilters();
    renderRoutes();
    paintSearch();
    wire();
    if (M) { M.reveal(doc); M.press(doc); }

    var saved = store(CONTACT_KEY);
    if (saved) S.contact = Object.assign(S.contact, saved);
    if (global.ApaSession && global.ApaSession.ready) {
      global.ApaSession.ready(function (st) {
        if (!st || st.status !== 'user') return;
        var prof = st.profile || {};
        if (!S.contact.name) S.contact.name = prof.full_name || st.name || '';
        if (!S.contact.email) S.contact.email = (st.user && st.user.email) || '';
        if (!S.contact.phone) S.contact.phone = prof.phone || '';
        updateBadge();
      });
    }

    var q = new URLSearchParams(global.location.search);
    var openId = q.get('open'), bref = q.get('booking'), rref = q.get('request'), city = q.get('q') || q.get('city');
    try {
      var b = global.ApaGeo && global.ApaGeo.bias && global.ApaGeo.bias();
      if (b && isFinite(b.lat) && !city) S.place = { title: b.short || b.label || b.name || 'Near you', label: b.label || b.name, lat: b.lat, lng: b.lng, countryCode: b.countryCode, city: b.city };
    } catch (e) {}
    paintSearch();
    if (city && global.ApaGeo) {
      global.ApaGeo.search(city, { limit: 1 }).then(function (rows) {
        if (rows && rows[0]) { S.place = rows[0]; S.place.title = rows[0].short || rows[0].label; }
        paintSearch(); loadFleet();
      }, function () { loadFleet(); });
    } else {
      loadFleet();
    }
    if (openId) openVehicle(openId);
    else if (bref) openTrack('booking', bref.toUpperCase(), tokenFor(bref.toUpperCase()));
    else if (rref) openTrack('request', rref.toUpperCase(), tokenFor(rref.toUpperCase()));
    updateBadge();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();

  global.CabanaDrive = { state: S, carArt: carArt, money: money, hireDays: hireDays, openVehicle: openVehicle, openRequest: openRequest, openTrack: openTrack, _render: renderGrid };
})(window);
