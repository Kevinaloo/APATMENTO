/* ═══════════════════════════════════════════════════════════════════════
   CABANA · CHECKOUT ATELIER (behaviour)
   cabana-checkout.js

   The shared half of every checkout: a sheet that rises into its own
   room (see cabana-checkout.css for the rooms), a total that counts to
   its number, the motif that gives each service its mood, the Cabana Pay
   card, and the single place that decides what a payment is called.

     CabanaCheckout.sheet({ vibe, kicker, title, sub, body })   → handle
     CabanaCheckout.outcome(result, { service, name, when })   → { tone, title, note }
     CabanaCheckout.countTo(el, value)                          animated total
     CabanaCheckout.money(n) · .phone(v) · .icon(name) · .motif(vibe)
     CabanaCheckout.payCard()                                   Cabana Pay, coming soon

   WHY OUTCOME LIVES HERE
   A guest who pays KES 10 toward a KES 9,000 stay must never read
   "You're booked". The words a guest sees after paying are decided once,
   from what the database says the money bought (dates or rooms held,
   seats claimed, paid in full, lost to someone faster), and every service
   uses the same function, so no page can drift into a happier sentence
   than the money supports.
   ═══════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.CabanaCheckout) return;
  var doc = global.document;

  /* ── stylesheet ─────────────────────────────────────────────────── */
  function ensureCss() {
    if (doc.getElementById('cx-css') || doc.querySelector('link[href*="cabana-checkout.css"]')) return;
    var l = doc.createElement('link');
    l.id = 'cx-css'; l.rel = 'stylesheet'; l.href = '/cabana-checkout.css';
    doc.head.appendChild(l);
  }

  /* ── small things ───────────────────────────────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(n, cur) {
    return (cur || 'KES') + ' ' + Math.round(Number(n) || 0).toLocaleString('en-KE');
  }
  function phone(v) {
    var d = String(v || '').replace(/[^\d+]/g, '');
    if (/^\+?254[17]\d{8}$/.test(d)) return d.replace(/^\+/, '');
    if (/^0[17]\d{8}$/.test(d)) return '254' + d.slice(1);
    if (/^[17]\d{8}$/.test(d)) return '254' + d;
    return null;
  }
  function day(iso, opts) {
    try { return new Date(String(iso).slice(0, 10) + 'T00:00:00').toLocaleDateString('en-KE', opts || { weekday: 'short', day: 'numeric', month: 'short' }); }
    catch (e) { return String(iso || ''); }
  }
  function reduced() {
    try { return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  /* ── drawn icons (one stroke family, no icon fonts) ─────────────── */
  var I = {
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2.6"/><path d="M8 10.5V7.6a4 4 0 0 1 8 0v2.9"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2.8" width="10" height="18.4" rx="2.4"/><path d="M11 17.6h2"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.8 4.8 6v5.6c0 4.4 3 8.2 7.2 9.4 4.2-1.2 7.2-5 7.2-9.4V6Z"/><path d="m8.9 12 2.2 2.2 4.1-4.4"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17.5 19.5 7"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.6"/><path d="M12 7.2V12l3.2 2"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.2M12 7.8v.2"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.8 12h14.4M13.2 5.6 19.6 12l-6.4 6.4"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M19.2 12H4.8M10.8 5.6 4.4 12l6.4 6.4"/></svg>',
    key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.6" cy="15.6" r="3.8"/><path d="m10.4 12.8 8.8-8.8M16.4 6.8l2.4 2.4M14 9.2l1.8 1.8"/></svg>',
    bed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18.5V6.5M3 14h18v4.5M21 14v-2.6a3 3 0 0 0-3-3h-7v5.6"/><circle cx="7.2" cy="10.6" r="1.9"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>',
    ticket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3.5 8.2a2 2 0 0 0 0 4v3.4c0 .9.7 1.6 1.6 1.6h13.8c.9 0 1.6-.7 1.6-1.6v-3.4a2 2 0 0 1 0-4V5.6c0-.9-.7-1.6-1.6-1.6H5.1c-.9 0-1.6.7-1.6 1.6Z" transform="translate(0 1.4)"/><path d="M14.6 5.6v12.6" stroke-dasharray="1.6 2"/></svg>',
    car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15.6V12l1.9-4.6a2 2 0 0 1 1.9-1.3h8.4a2 2 0 0 1 1.9 1.3L20 12v3.6"/><path d="M3.4 15.6h17.2v2.6H3.4zM4 12h16"/><circle cx="7.6" cy="15.6" r="1.6"/><circle cx="16.4" cy="15.6" r="1.6"/></svg>',
    door: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5.6 20.6V4.6a1.4 1.4 0 0 1 1.4-1.4h10a1.4 1.4 0 0 1 1.4 1.4v16M3.4 20.6h17.2"/><circle cx="14.6" cy="12.2" r=".9" fill="currentColor"/></svg>',
    route: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8 17.4h6.6a3 3 0 0 0 0-6H9.4a3 3 0 0 1 0-6H16"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17.6h16M5.6 17.6a6.4 6.4 0 0 1 12.8 0M12 8.4V6.6M10.6 6.6h2.8"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2v4.4M12 16.4v4.4M3.2 12h4.4M16.4 12h4.4M6.1 6.1l2.6 2.6M15.3 15.3l2.6 2.6M6.1 17.9l2.6-2.6M15.3 8.7l2.6-2.6"/></svg>'
  };
  function icon(n) { return I[n] || ''; }

  /* ── the motifs: one drawing per room ───────────────────────────── */
  function motif(vibe, o) {
    o = o || {};
    var A = 'style="stroke:var(--cx-accent-2)"', B = 'style="stroke:var(--cx-on-bg-3)"';
    switch (vibe) {
      case 'hotel':
        return '<svg viewBox="0 0 300 220" fill="none" aria-hidden="true">' +
          '<g class="m-float"><rect x="122" y="54" width="150" height="96" rx="14" style="fill:rgba(255,255,255,.06);stroke:var(--cx-accent-2)" stroke-width="1.6"/>' +
          '<rect x="140" y="74" width="26" height="20" rx="4" style="stroke:var(--cx-accent-2)" stroke-width="1.4"/>' +
          '<path d="M140 120h96M140 132h60" ' + B + ' stroke-width="1.4" stroke-linecap="round"/>' +
          '<clipPath id="cxkc"><rect x="122" y="54" width="150" height="96" rx="14"/></clipPath>' +
          '<rect class="m-shine" clip-path="url(#cxkc)" x="122" y="40" width="34" height="130" style="fill:rgba(255,255,255,.16)"/></g>' +
          '<path class="m-draw" d="M60 190h110M78 190a37 37 0 0 1 74 0M115 153v-9M108 144h14" ' + A + ' stroke-width="1.6" stroke-linecap="round"/></svg>';
      case 'daypass':
        return '<svg viewBox="0 0 300 220" fill="none" aria-hidden="true">' +
          '<path id="cxsunp" class="m-draw" d="M40 180 Q150 10 270 180" ' + B + ' stroke-width="1.4" stroke-dasharray="3 5"/>' +
          '<circle r="15" style="fill:var(--cx-accent-2)"><animateMotion dur="9s" repeatCount="indefinite" keyPoints="0;1;0" keyTimes="0;.5;1" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1" path="M40 180 Q150 10 270 180"/></circle>' +
          '<path d="M20 186h270" ' + B + ' stroke-width="1.2"/></svg>';
      case 'tours':
        return '<svg viewBox="0 0 300 220" fill="none" aria-hidden="true"><g class="m-drift" ' + B + ' stroke-width="1.1">' +
          '<path d="M60 160c40-60 120-90 200-40"/><path d="M80 176c40-50 110-74 180-34"/><path d="M100 192c34-40 96-58 156-26"/>' +
          '<path d="M44 140c50-74 150-110 236-50"/><path d="M30 118c60-90 180-130 270-60"/></g>' +
          '<g transform="translate(222 70)"><circle r="30" ' + A + ' stroke-width="1.5"/><path class="m-draw" d="M0-22 7 0 0 22-7 0Z" ' + A + ' stroke-width="1.5"/></g></svg>';
      case 'events':
        return '<svg viewBox="0 0 300 220" fill="none" aria-hidden="true"><g class="m-float">' +
          '<defs><linearGradient id="cxholo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7C3AED" stop-opacity=".55"/><stop offset=".5" stop-color="#22D3EE" stop-opacity=".35"/><stop offset="1" stop-color="#C6FF4D" stop-opacity=".5"/></linearGradient>' +
          '<clipPath id="cxtc"><path d="M116 50h150a10 10 0 0 1 10 10v30a14 14 0 0 0 0 28v30a10 10 0 0 1-10 10H116a10 10 0 0 1-10-10v-30a14 14 0 0 0 0-28V60a10 10 0 0 1 10-10Z"/></clipPath></defs>' +
          '<path d="M116 50h150a10 10 0 0 1 10 10v30a14 14 0 0 0 0 28v30a10 10 0 0 1-10 10H116a10 10 0 0 1-10-10v-30a14 14 0 0 0 0-28V60a10 10 0 0 1 10-10Z" fill="url(#cxholo)" style="stroke:var(--cx-accent-2)" stroke-width="1.4"/>' +
          '<path d="M228 56v102" ' + A + ' stroke-width="1.4" stroke-dasharray="3 5"/>' +
          '<rect class="m-shine" clip-path="url(#cxtc)" x="100" y="36" width="30" height="140" style="fill:rgba(255,255,255,.28)"/></g></svg>';
      case 'carhire':
        return '<svg viewBox="0 0 300 220" fill="none" aria-hidden="true">' +
          '<path d="M180 220 L230 30 M300 220 L250 30" ' + B + ' stroke-width="1.4"/>' +
          '<path class="m-road" d="M240 220 L240 30" ' + A + ' stroke-width="3"/>' +
          '<g transform="translate(70 70)"><rect width="104" height="40" rx="9" style="fill:rgba(0,0,0,.35);stroke:var(--cx-on-bg-3)"/>' +
          '<text x="52" y="27" text-anchor="middle" style="fill:var(--cx-accent-2);font:700 19px \'CX Geist Mono\',monospace;letter-spacing:.14em">' + esc(o.odo || '000 KM') + '</text></g></svg>';
      case 'rooms':
        return '<svg viewBox="0 0 300 220" fill="none" aria-hidden="true"><g class="m-float">' +
          '<defs><linearGradient id="cxfoil" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3D5AFE"/><stop offset=".55" stop-color="#7C3AED"/><stop offset="1" stop-color="#FF8A5B"/></linearGradient>' +
          '<clipPath id="cxmc"><rect x="108" y="46" width="168" height="108" rx="16"/></clipPath></defs>' +
          '<rect x="108" y="46" width="168" height="108" rx="16" fill="url(#cxfoil)"/>' +
          '<text x="126" y="78" style="fill:#fff;font:700 12px \'CX Unbounded\',sans-serif;letter-spacing:.12em">CABANA ROOMS</text>' +
          '<text x="126" y="138" style="fill:rgba(255,255,255,.8);font:600 11px \'CX Geist Mono\',monospace;letter-spacing:.18em">30 DAYS · ALL ROOMS</text>' +
          '<rect class="m-shine" clip-path="url(#cxmc)" x="96" y="30" width="34" height="150" style="fill:rgba(255,255,255,.3)"/></g></svg>';
      case 'remit':
        return '<svg viewBox="0 0 300 220" fill="none" aria-hidden="true">' +
          '<path class="m-draw" d="M70 180c40 0 40-60 90-60s60-70 110-70" ' + A + ' stroke-width="2" stroke-linecap="round"/>' +
          '<circle cx="70" cy="180" r="6" style="fill:var(--cx-accent-2)"/><circle cx="270" cy="50" r="6" style="fill:var(--cx-accent)"/>' +
          '<path d="M30 200h250" ' + B + ' stroke-width="1"/></svg>';
      default: /* stays: a key that draws itself over the horizon */
        return '<svg viewBox="0 0 300 220" fill="none" aria-hidden="true">' +
          '<circle cx="230" cy="62" r="34" style="fill:var(--cx-accent-2);opacity:.22"/>' +
          '<path d="M0 176c70-26 150-26 300 0" ' + B + ' stroke-width="1.2"/>' +
          '<g class="m-draw" ' + A + ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<circle cx="140" cy="122" r="26"/><circle cx="140" cy="122" r="9"/>' +
          '<path d="M164 112 L262 80 M228 91 l7 18 M246 85 l6 14"/></g></svg>';
    }
  }

  /* ── numbers that arrive ────────────────────────────────────────── */
  function countTo(el, to, opts) {
    if (!el) return;
    opts = opts || {};
    to = Math.round(Number(to) || 0);
    var from = Number(el.getAttribute('data-v') || 0);
    el.setAttribute('data-v', to);
    var cur = opts.currency === false ? '' : '<span class="cx-cur">' + esc(opts.currency || 'KES') + '</span>';
    if (reduced() || from === to) { el.innerHTML = cur + to.toLocaleString('en-KE'); return; }
    var t0 = null, dur = Math.min(900, 260 + Math.abs(to - from) / 40);
    function frame(ts) {
      if (!t0) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - k, 4);
      el.innerHTML = cur + Math.round(from + (to - from) * e).toLocaleString('en-KE');
      if (k < 1) global.requestAnimationFrame(frame);
    }
    global.requestAnimationFrame(frame);
    el.classList.remove('is-bump'); void el.offsetWidth; el.classList.add('is-bump');
  }

  /* ── what the money bought, in words ─────────────────────────────── */
  function outcome(r, k) {
    r = r || {}; k = k || {};
    var svc = k.service || 'stays';
    var paid = Number(r.amount_paid || 0), total = Number(r.grand_total || 0);
    var left = Math.max(0, Number(r.outstanding != null ? r.outstanding : total - paid));
    var short = Math.max(0, Number(r.shortfall_to_confirm || 0));
    var lost = r.lost === true || r.dates_lost === true || r.seats_lost === true;
    var full = r.fully_paid === true || /paid_pending_checkin|secured|active/.test(String(r.status || ''));
    var held = r.holds === true || r.holds_dates === true || r.holds_seats === true || r.status === 'confirmed_balance_due';
    var name = k.name ? String(k.name) : '';

    if (lost) {
      var credit = Number(r.credited || paid);
      return { tone: 'lost',
        title: svc === 'events' ? 'That tier sold out first.' : svc === 'tours' ? 'That departure filled first.'
             : svc === 'hotel' ? 'Those rooms just went.' : svc === 'daypass' ? 'That day just went.' : 'Those dates just went.',
        note: (credit > 0 ? 'Someone secured them a moment before you. Your ' + money(credit) + ' is now Cabana credit and never expires.'
                          : 'Someone secured them a moment before you. Nothing was charged.') + ' Pick another time whenever you are ready.' };
    }
    if (full) {
      switch (svc) {
        case 'hotel': return { tone: 'settled', title: 'Your rooms are booked.', note: 'Paid in full. Show your check-in code at the front desk' + (k.when ? ' on ' + k.when : '') + '.' };
        case 'daypass': return { tone: 'settled', title: 'Your day pass is booked.', note: 'Paid in full. Your code is ready' + (k.when ? ' for ' + k.when : '') + '.' };
        case 'tours': return Number(k.balance || r.operator_balance || 0) > 0
          ? { tone: 'settled', title: 'Your place is booked.', note: 'Your online share is paid. ' + money(k.balance || r.operator_balance) + ' goes to the guide on the day.' }
          : { tone: 'settled', title: 'Your place is booked.', note: 'Paid in full' + (k.when ? '. See you ' + k.when : '') + '.' };
        case 'events': return { tone: 'settled', title: 'Your tickets are confirmed.', note: 'Paid in full. Your door code is in My Bookings and on its way to your phone.' };
        case 'carhire': return { tone: 'settled', title: 'Your car is secured.', note: 'Your handover code and the operator’s details are in your booking. Pay the operator for the hire as agreed.' };
        case 'rooms': return { tone: 'settled', title: 'Cabana Rooms, unlocked.', note: 'Every room is open to you' + (r.ends_at ? ' until ' + day(r.ends_at, { day: 'numeric', month: 'long' }) : ' for 30 days') + '. Message hosts and book viewings.' };
        case 'remit': return { tone: 'settled', title: 'Balance cleared.', note: 'Thank you. Trips keep reaching you.' };
        default: return { tone: 'settled', title: 'You’re booked.', note: 'Paid in full. Your check-in code is ready' + (name ? ' for ' + name : '') + '.' };
      }
    }
    if (held) {
      return { tone: 'held',
        title: svc === 'hotel' ? 'Your rooms are booked.' : svc === 'tours' || svc === 'events' ? 'Your place is held.' : 'You’re booked.',
        note: (svc === 'hotel' ? 'Your rooms are held. ' : svc === 'tours' || svc === 'events' ? 'Your seats are held. ' : 'Your dates are held. ')
              + money(left) + ' is still to pay' + (svc === 'stays' || svc === 'hotel' ? ' before check-in. Your code unlocks once it is paid in full.' : ' before the deadline in My Bookings.') };
    }
    if (paid > 0) {
      return { tone: 'open', title: 'Payment received. Not booked yet.',
        note: money(paid) + ' is safely held toward this booking, but ' + (short > 0 ? money(short) + ' more' : 'the rest') +
              ' is needed before ' + (svc === 'hotel' ? 'the rooms are' : svc === 'tours' || svc === 'events' ? 'the seats are' : 'the dates are') +
              ' held for you. Until then someone else can still book them.' };
    }
    return { tone: 'open', title: 'Nothing has been paid yet.', note: 'Your booking is saved. Finish paying from My Bookings to secure it.' };
  }

  /* ── the sheet ──────────────────────────────────────────────────── */
  var open = null;
  function sheet(o) {
    ensureCss();
    o = o || {};
    if (open) open.close(true);
    var scrim = doc.createElement('div');
    scrim.className = 'cx-scrim';
    scrim.innerHTML =
      '<div class="cx cx-sheet" data-cx-vibe="' + esc(o.vibe || 'stays') + '" role="dialog" aria-modal="true" aria-label="' + esc(o.label || o.title || 'Checkout') + '">' +
        '<div class="cx-hero">' +
          '<div class="cx-grab" aria-hidden="true"></div>' +
          '<button class="cx-close" type="button" data-cx-close aria-label="Close">' + I.close + '</button>' +
          '<div class="cx-motif">' + motif(o.vibe, o.motif) + '</div>' +
          (o.kicker ? '<div class="cx-kicker"><i></i>' + esc(o.kicker) + '</div>' : '') +
          '<h2 class="cx-title">' + (o.titleHtml || esc(o.title || '')) + '</h2>' +
          (o.sub ? '<p class="cx-sub">' + esc(o.sub) + '</p>' : '') +
        '</div>' +
        '<div class="cx-body" data-cx-body>' + (o.body || '') + '</div>' +
        (o.payCard !== false ? '<div class="cx-paycard-slot">' + payCardInline() + '</div>' : '') +
      '</div>';
    doc.body.appendChild(scrim);
    doc.body.classList.add('cx-lock');
    var prevOverflow = doc.documentElement.style.overflow;
    doc.documentElement.style.overflow = 'hidden';
    var sh = scrim.querySelector('.cx-sheet'), body = scrim.querySelector('[data-cx-body]');
    var lastFocus = doc.activeElement;
    global.requestAnimationFrame(function () { scrim.classList.add('is-open'); });

    function onKey(e) { if (e.key === 'Escape' && o.dismissible !== false) h.close(); }
    var h = {
      root: scrim, sheet: sh, body: body,
      set: function (html) { body.innerHTML = html; return body; },
      hero: function (title, sub, kicker) {
        var t = sh.querySelector('.cx-title'); if (t && title != null) t.innerHTML = title;
        var s = sh.querySelector('.cx-sub');
        if (sub != null) { if (!s) { s = doc.createElement('p'); s.className = 'cx-sub'; t.after(s); } s.textContent = sub; }
        var k = sh.querySelector('.cx-kicker'); if (k && kicker != null) k.innerHTML = '<i></i>' + esc(kicker);
      },
      close: function (instant) {
        doc.removeEventListener('keydown', onKey);
        if (open === h) open = null;
        var done = function () {
          scrim.remove();
          if (!doc.querySelector('.cx-scrim')) { doc.body.classList.remove('cx-lock'); doc.documentElement.style.overflow = prevOverflow; }
          try { lastFocus && lastFocus.focus && lastFocus.focus(); } catch (e) {}
          if (typeof o.onClose === 'function') o.onClose();
        };
        if (instant) return done();
        sh.classList.add('is-leaving'); scrim.classList.remove('is-open');
        setTimeout(done, 340);
      }
    };
    scrim.addEventListener('click', function (e) {
      if (e.target === scrim && o.dismissible !== false) h.close();
      if (e.target.closest && e.target.closest('[data-cx-close]')) h.close();
    });
    doc.addEventListener('keydown', onKey);
    setTimeout(function () { var f = sh.querySelector('input,button.cx-pay,select'); try { f && f.focus({ preventScroll: true }); } catch (e) {} }, 420);
    open = h;
    if (o.payCard !== false) payCard();
    return h;
  }

  /* An outcome panel, ready to drop into a sheet body. */
  function outcomeHtml(out, extra) {
    extra = extra || {};
    var glyph = out.tone === 'open' ? I.clock : out.tone === 'lost' ? I.info : I.check;
    return '<div class="cx-outcome" data-tone="' + esc(out.tone) + '">' +
      '<div class="cx-stamp">' + glyph + '</div>' +
      '<h3>' + esc(out.title) + '</h3><p>' + esc(out.note) + '</p>' +
      (extra.progress != null ? '<div class="cx-progress" aria-hidden="true"><i style="width:0" data-w="' + Math.max(0, Math.min(100, extra.progress)) + '%"></i></div>' : '') +
      (extra.code ? '<div class="cx-code">' + esc(extra.code) + '</div>' : '') +
      '</div>';
  }
  function animateProgress(root) {
    var bar = root && root.querySelector('.cx-progress i');
    if (bar) setTimeout(function () { bar.style.width = bar.getAttribute('data-w'); }, 120);
  }

  /* ── Cabana Pay, coming soon ────────────────────────────────────── */
  var CURRENCIES = ['KES', 'NGN', 'GHS', 'ZAR', 'UGX', 'TZS', 'RWF', 'ETB', 'XOF', 'XAF', 'EGP', 'MAD', 'ZMW', 'BWP', 'MZN', 'NAD', 'MWK', 'CDF'];
  function payCardInner(track) {
    return '<div class="cxp-in">' +
        '<div class="cxp-top" tabindex="0">' +
          '<span class="cxp-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 5 6v5.4c0 4.3 2.9 8 7 9.1 4.1-1.1 7-4.8 7-9.1V6Z"/><path d="M9.2 12.2h5.6M12 9.4v5.6" opacity=".9"/></svg></span>' +
          '<span class="cxp-name">CABANA PAY</span>' +
          '<span class="cxp-soon">Coming soon</span>' +
          '<button class="cxp-x" type="button" aria-label="Minimise">' + I.close + '</button>' +
        '</div>' +
        '<p class="cxp-tag"><b>Protect your bank cards and payment details.</b> Soon you will pay through Cabana Pay in currencies across Africa, without handing your card to anyone.</p>' +
        '<div class="cxp-fx" aria-hidden="true"><div class="cxp-fx-track">' + track + '</div></div>' +
      '</div>';
  }
  /* Inside a sheet on a phone the floating card would sit over the
     form, so the sheet carries its own copy at the foot instead. */
  function payCardInline() {
    var track = CURRENCIES.concat(CURRENCIES).map(function (c) { return '<span><i></i>' + c + '</span>'; }).join('');
    return '<aside class="cxp is-inline is-in" role="note" aria-label="Cabana Pay, coming soon">' + payCardInner(track) + '</aside>';
  }
  function payCard() {
    ensureCss();
    if (doc.getElementById('cabana-pay-card')) return;
    if (doc.body && doc.body.hasAttribute('data-no-cabana-pay')) return;
    var min = false;
    try { min = global.localStorage.getItem('cabana_pay_card') === 'min'; } catch (e) {}
    var track = CURRENCIES.concat(CURRENCIES).map(function (c) { return '<span><i></i>' + c + '</span>'; }).join('');
    var el = doc.createElement('aside');
    el.id = 'cabana-pay-card';
    el.className = 'cxp' + (min ? ' is-min' : '');
    el.setAttribute('role', 'note');
    el.setAttribute('aria-label', 'Cabana Pay, coming soon');
    el.innerHTML = payCardInner(track);
    doc.body.appendChild(el);
    function set(m) {
      el.classList.toggle('is-min', m);
      try { global.localStorage.setItem('cabana_pay_card', m ? 'min' : 'open'); } catch (e) {}
    }
    el.querySelector('.cxp-x').addEventListener('click', function (e) { e.stopPropagation(); set(true); });
    var top = el.querySelector('.cxp-top');
    top.addEventListener('click', function () { if (el.classList.contains('is-min')) set(false); });
    top.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && el.classList.contains('is-min')) { e.preventDefault(); set(false); } });
    setTimeout(function () { el.classList.add('is-in'); }, 700);
  }

  /* ── the server's fee on one amount (never a schedule) ──────────── */
  function feeQuote(sb, service, subtotal) {
    if (!sb || !sb.rpc) return Promise.resolve(null);
    return sb.rpc('cabana_fee_quote', { p_service: service, p_subtotal: Number(subtotal) || 0 })
      .then(function (r) { return r && !r.error && r.data != null ? Number(r.data) : null; }, function () { return null; });
  }

  global.CabanaCheckout = {
    sheet: sheet, outcome: outcome, outcomeHtml: outcomeHtml, animateProgress: animateProgress,
    countTo: countTo, money: money, phone: phone, day: day, esc: esc, icon: icon, motif: motif,
    payCard: payCard, feeQuote: feeQuote, ensureCss: ensureCss
  };

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', ensureCss); else ensureCss();
})(window);
