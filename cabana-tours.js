/* ═══════════════════════════════════════════════════════════════════
   CABANA TOURS · the kit
   ───────────────────────────────────────────────────────────────────
   Shared by /tours, /tours-catalogue, /tour-guides and /tours-studio.
   Owns: the catalogue in memory, real departures, saved tours (synced
   to the account, merged from this device on sign-in), the header
   (tabs, saved, messages, search), the tour sheet, countdowns and the
   illustrated covers that stand in for a missing photo.

   Rules this file keeps:
     · No invented numbers. A countdown is to a departure the database
       returned; a save count shows only once it is real and worth it.
     · No hotlinked media. Covers are the operator's own uploads; a tour
       without one gets a drawing made here, not someone else's photo.
     · Nothing here decides money or access. Prices, offers, seats and
       contact rules are re-checked by Postgres on every write.

   window.CabanaTours keeps the names Cabana Immersive and the dashboard
   already call: reload, open, get, reel.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var doc = global.document;
  var SB_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';

  /* One Supabase client per tab. apa-session.js owns it; a second client on
     the same storage key races the first and silently drops the session. */
  var _own = null;
  function sb() {
    try { var c = global.ApaSession && global.ApaSession.client && global.ApaSession.client(); if (c) return c; } catch (e) {}
    if (global.sb && global.sb.from) return global.sb;
    if (!_own && global.supabase && global.supabase.createClient) {
      try { _own = global.supabase.createClient(SB_URL, SB_KEY); } catch (e) { _own = null; }
    }
    return _own;
  }

  /* ── small things ────────────────────────────────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function arr(v) {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') { try { var p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch (e) { return []; } }
    return [];
  }
  function money(n) { return 'KES ' + Math.round(Number(n) || 0).toLocaleString('en-KE'); }
  function $(sel, root) { return (root || doc).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }
  function el(id) { return doc.getElementById(id); }
  function safe(fn) { try { return fn(); } catch (e) { if (global.console) console.warn('[tours]', e); } }
  function hash(s) { s = String(s); var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var x = hash(seed) || 1; return function () { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 10000) / 10000; }; }
  var store = {
    get: function (k) { try { return global.localStorage.getItem('ct:' + k); } catch (e) { return null; } },
    set: function (k, v) { try { if (v == null) global.localStorage.removeItem('ct:' + k); else global.localStorage.setItem('ct:' + k, v); } catch (e) {} }
  };
  function reduced() { try { return global.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function thrifty() {
    var save = false, slow = false;
    try { var c = global.navigator.connection; save = !!(c && c.saveData); slow = !!(c && /^(slow-)?2g$/.test(c.effectiveType || '')); } catch (e) {}
    return { still: save || slow || reduced(), noVideo: save || slow };
  }

  /* Nairobi is UTC+3 all year. Dates in the database are Nairobi days. */
  var NBO = 3 * 3600e3;
  function nboToday() { return new Date(Date.now() + NBO).toISOString().slice(0, 10); }
  function dayOf(iso) { var d = new Date(String(iso).slice(0, 10) + 'T12:00:00Z'); return d; }
  function fmtDay(iso, o) {
    if (!iso) return '';
    try { return dayOf(iso).toLocaleDateString('en-KE', o || { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }); } catch (e) { return String(iso).slice(0, 10); }
  }
  function fmtTime(t) {
    if (!t) return '';
    var m = String(t).match(/^(\d{1,2}):(\d{2})/); if (!m) return '';
    return (m[1].length === 1 ? '0' : '') + m[1] + ':' + m[2];
  }
  function nboClock(ts) {
    var d = new Date(new Date(ts).getTime() + NBO);
    return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0');
  }
  function dur(ms) {
    if (ms <= 0) return 'now';
    var m = Math.floor(ms / 6e4), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
    if (d > 0) return d + 'd ' + h + 'h';
    if (h > 0) return h + 'h ' + String(mm).padStart(2, '0') + 'm';
    return mm + 'm';
  }

  /* ── icons ───────────────────────────────────────────────────────── */
  function I(p, sw) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }
  var ICON = {
    pin: I('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'),
    heart: I('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.8 1-1.1a5.5 5.5 0 0 0 0-7.7Z"/>'),
    chat: I('<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.7-.8L3 21l1.9-5.1A8.4 8.4 0 0 1 4 11.5 8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5z"/>'),
    search: I('<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.2-4.2"/>'),
    close: I('<path d="M18 6 6 18M6 6l12 12"/>'),
    arrow: I('<path d="M7 17 17 7M8 7h9v9"/>', 2.2),
    right: I('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    left: I('<path d="M19 12H5M11 18l-6-6 6-6"/>'),
    prev: I('<path d="M15 18l-6-6 6-6"/>', 2.2), next: I('<path d="M9 18l6-6-6-6"/>', 2.2),
    check: I('<path d="m20 6-11 11-5-5"/>', 2.4), cross: I('<path d="M18 6 6 18M6 6l12 12"/>', 2.2),
    verified: I('<path d="M12 2 4 6v6c0 5 3.4 9.4 8 10 4.6-.6 8-5 8-10V6l-8-4Z"/><path d="m9 12 2 2 4-4"/>'),
    clock: I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    users: I('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>'),
    cal: I('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
    compass: I('<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>', 1.7),
    plus: I('<path d="M12 5v14M5 12h14"/>', 2.4),
    play: I('<path d="M7 4v16l13-8z"/>'), pause: I('<path d="M8 5v14M16 5v14"/>', 2.6),
    sound: I('<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>'),
    mute: I('<path d="M11 5 6 9H2v6h4l5 4z"/><path d="m23 9-6 6M17 9l6 6"/>'),
    vr: I('<path d="M3 9.2A2.7 2.7 0 0 1 5.7 6.5h12.6A2.7 2.7 0 0 1 21 9.2v5.1a2.7 2.7 0 0 1-2.7 2.7h-3.1a2 2 0 0 1-1.7-.9l-.8-1.2a.9.9 0 0 0-1.5 0l-.8 1.2a2 2 0 0 1-1.7.9H5.7A2.7 2.7 0 0 1 3 14.3z"/><circle cx="8" cy="11.8" r="1.6"/><circle cx="16" cy="11.8" r="1.6"/>', 1.9),
    bolt: I('<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>'),
    shield: I('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'),
    star: I('<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>'),
    sun: I('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    ticket: I('<path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4Z"/><path d="M13 6v2M13 11v2M13 16v2"/>'),
    globe: I('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>')
  };

  /* ── what kind of tour is this ───────────────────────────────────── */
  var CATS = {
    'day-safari': { name: 'Day safaris', blurb: 'Out at dawn, back by dark', a: '#FFB020', b: '#FF5A36', scene: 'savanna' },
    'big-safari': { name: 'Multi-day safaris', blurb: 'Camps, crossings, the long light', a: '#FF6FA8', b: '#6A2BD8', scene: 'savanna' },
    'day-trip': { name: 'Day trips', blurb: 'Lakes, gorges, out and back', a: '#12E0D0', b: '#1B7CF0', scene: 'lake' },
    'city-tour': { name: 'City walks', blurb: 'Streets, with the people who live on them', a: '#3B5BFF', b: '#B98CFF', scene: 'city' },
    'adventure': { name: 'Adventure', blurb: 'Hikes, climbs and the Rift', a: '#3EE08F', b: '#0B6E63', scene: 'peaks' },
    'culture': { name: 'Culture & community', blurb: 'Markets, music, craft, history', a: '#B98CFF', b: '#FF6FA8', scene: 'culture' },
    'beach': { name: 'Coast & water', blurb: 'Dhows, reefs and island light', a: '#12E0D0', b: '#3B5BFF', scene: 'coast' },
    'expedition': { name: 'Expeditions', blurb: 'Four days and further', a: '#FF5A36', b: '#3B1C4A', scene: 'peaks' }
  };
  var ACCENTS = ['#12E0D0', '#3B5BFF', '#B98CFF', '#FF6FA8', '#FFB020', '#3EE08F'];
  function accentOf(t) { return ACCENTS[hash((t && t.id) || 'x') % ACCENTS.length]; }
  function catOf(t) { return CATS[t && t.category] || null; }
  /* Where a tour sits by how far it carries you: 0 city, 1 day, 2 overnight, 3 expedition. */
  function reachOf(t) {
    var days = Number(t.days) || 1;
    if (days >= 4) return 3;
    if (days >= 2) return 2;
    var hrs = Number(t.duration_hours) || 0;
    if (!hrs && t.duration_label) { var m = String(t.duration_label).match(/(\d+(?:\.\d+)?)\s*h/i); if (m) hrs = parseFloat(m[1]); }
    if (hrs >= 6) return 1;
    var c = String(t.category || '');
    if (c === 'day-trip' || c === 'day-safari') return 1;
    if (c === 'big-safari' || c === 'expedition') return 2;
    return 0;
  }
  var GENERIC = /^(national|park|reserve|game|the|lake|mount|mt|city|county|town|forest|island|beach|conservancy|and|of|&|walking|tour|hills?|valley|river|falls)$/i;
  function codeOf(t) {
    var src = String(t.destination || t.county || t.country || t.title || 'TOUR').replace(/[^A-Za-z' \-]/g, ' ');
    var words = src.split(/[\s\-]+/).filter(function (w) { return w && !GENERIC.test(w); });
    var pick = words.length ? words[words.length - 1] : (src.split(/\s+/)[0] || 'TOUR');
    if (pick.length < 4 && words.length > 1) pick = words[0];
    return pick.replace(/'/g, '').toUpperCase().slice(0, 8) || 'TOUR';
  }
  function priceOf(t) {
    var free = Number(t.price_kes) === 0;
    return { free: free, v: free ? 'Free' : money(t.price_kes), u: free ? 'pay what you like' : (t.price_basis === 'per_group' ? 'per group' : 'per person') };
  }
  function coverOf(t) { return t.cover_url || arr(t.photos)[0] || ''; }
  function whoOf(t) {
    if (t.operator_kind === 'cabana') return 'Run by Cabana';
    var p = t.operator_persona === 'guide' ? 'Guide' : 'By';
    return (p === 'Guide' ? 'Guided by ' : 'By ') + (t.operator_name || 'a local operator');
  }

  /* ═══ ILLUSTRATED COVERS ════════════════════════════════════════════
     A tour without a photo still gets a picture of the kind of place it
     goes: savanna, lake, city, peaks, coast or a patterned culture
     scene, coloured and composed from its own id so no two match. */
  function art(seed, scene, o) {
    o = o || {};
    var r = rng(seed + ':' + scene), W = o.w || 400, H = o.h || 500, id = 'a' + (hash(seed + scene) % 1e8);
    var pal = {
      savanna: ['#2B1140', '#8C2F5C', '#FF7A3A', '#FFC15E', '#1A0D24', '#3A1733'],
      lake: ['#0B1C3F', '#1F5FA8', '#46D6D0', '#FFD08A', '#08142B', '#0E2E55'],
      city: ['#0B0918', '#28206A', '#6A4BFF', '#12E0D0', '#07061A', '#1A1545'],
      peaks: ['#130F33', '#3C2F8F', '#B98CFF', '#FFE6C2', '#0C0A22', '#231C55'],
      coast: ['#16134A', '#FF6FA8', '#FFB020', '#12E0D0', '#0B2B4C', '#1270A0'],
      culture: ['#1D0B2E', '#7A2BD8', '#FF6FA8', '#FFB020', '#12E0D0', '#3B5BFF']
    }[scene] || ['#0B0918', '#3B5BFF', '#B98CFF', '#FFB020', '#07061A', '#1A1545'];
    var sky = '<linearGradient id="' + id + 's" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + pal[0] + '"/><stop offset=".55" stop-color="' + pal[1] + '"/><stop offset="1" stop-color="' + pal[2] + '"/></linearGradient>';
    var sunG = '<radialGradient id="' + id + 'g"><stop offset="0" stop-color="#FFF4D6"/><stop offset=".45" stop-color="' + pal[3] + '"/><stop offset="1" stop-color="' + pal[3] + '" stop-opacity="0"/></radialGradient>';
    var sx = W * (0.25 + r() * 0.5), sy = H * (0.36 + r() * 0.12), sr = W * (0.12 + r() * 0.08);
    var body = '<rect width="' + W + '" height="' + H + '" fill="url(#' + id + 's)"/>';
    function ridge(base, amp, col, n, cls) {
      var d = 'M0 ' + H + ' L0 ' + base;
      for (var i = 0; i <= n; i++) { var x = (i / n) * W, y = base - Math.sin(i * 1.3 + r() * 2) * amp * (0.4 + r() * 0.6); d += ' Q' + (x - W / n / 2) + ' ' + (y - amp * r()) + ' ' + x + ' ' + y; }
      return '<path class="' + (cls || '') + '" d="' + d + ' L' + W + ' ' + H + ' Z" fill="' + col + '"/>';
    }
    function stars(n) { var s = ''; for (var i = 0; i < n; i++) s += '<circle class="twinkle" style="animation-delay:' + (r() * 3).toFixed(2) + 's" cx="' + (r() * W).toFixed(1) + '" cy="' + (r() * H * 0.45).toFixed(1) + '" r="' + (0.6 + r() * 1.3).toFixed(2) + '" fill="#FFF6E0"/>'; return s; }
    function acacia(x, y, s, col) {
      return '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + s.toFixed(2) + ')" fill="' + col + '">' +
        '<path d="M-2 0 L-1 -40 Q-14 -52 -30 -56 L-26 -60 Q-8 -56 0 -46 Q6 -58 26 -62 L28 -58 Q10 -52 2 -40 L3 0 Z"/>' +
        '<ellipse cx="0" cy="-62" rx="58" ry="11"/><ellipse cx="-22" cy="-66" rx="30" ry="8"/><ellipse cx="24" cy="-67" rx="28" ry="7"/></g>';
    }
    function birds(n, col) { var s = '<g class="fly" style="animation-duration:' + (18 + r() * 12).toFixed(1) + 's">'; for (var i = 0; i < n; i++) { var bx = r() * W * 0.4, by = H * (0.16 + r() * 0.18); s += '<path d="M' + bx + ' ' + by + ' q6 -6 12 0 q6 -6 12 0" fill="none" stroke="' + col + '" stroke-width="1.6" stroke-linecap="round"/>'; } return s + '</g>'; }

    if (scene === 'city') {
      body += stars(40) + '<circle cx="' + sx + '" cy="' + (sy - 40) + '" r="' + (sr * 0.55) + '" fill="#FFF3D1" opacity=".9"/>';
      var x = 0, sky2 = '';
      while (x < W) {
        var bw = 22 + r() * 46, bh = H * (0.18 + r() * 0.34), top = H - bh;
        sky2 += '<rect x="' + x.toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + bh.toFixed(1) + '" fill="' + (r() > .5 ? pal[4] : pal[5]) + '"/>';
        for (var wy = top + 10; wy < H - 10; wy += 13) for (var wx = x + 5; wx < x + bw - 6; wx += 9) if (r() > .72) sky2 += '<rect class="twinkle" style="animation-delay:' + (r() * 3).toFixed(2) + 's;animation-duration:' + (3 + r() * 5).toFixed(1) + 's" x="' + wx.toFixed(1) + '" y="' + wy.toFixed(1) + '" width="4" height="6" fill="' + (r() > .5 ? pal[3] : '#FFD27A') + '"/>';
        x += bw + 2;
      }
      body += sky2 + '<rect y="' + (H * .93) + '" width="' + W + '" height="' + (H * .07) + '" fill="' + pal[4] + '"/>';
    } else if (scene === 'coast') {
      body += '<circle cx="' + sx + '" cy="' + (sy + 20) + '" r="' + sr * 2.2 + '" fill="url(#' + id + 'g)"/>' + '<circle cx="' + sx + '" cy="' + (sy + 20) + '" r="' + sr * 0.8 + '" fill="#FFF1C9"/>';
      var sea = H * 0.62;
      body += '<rect y="' + sea + '" width="' + W + '" height="' + (H - sea) + '" fill="' + pal[4] + '"/>';
      for (var i = 0; i < 9; i++) body += '<rect class="drift" x="' + (sx - 80 + r() * 60) + '" y="' + (sea + 8 + i * 14) + '" width="' + (60 + r() * 100) + '" height="2.4" rx="1.2" fill="#FFD9A0" opacity="' + (0.7 - i * 0.07).toFixed(2) + '"/>';
      body += '<g class="drift-2"><path d="M' + (W * .18) + ' ' + (sea + 6) + ' l40 0 l-6 10 l-28 0 Z" fill="#150F2E"/><path d="M' + (W * .2 + 12) + ' ' + (sea + 4) + ' L' + (W * .2 + 12) + ' ' + (sea - 50) + ' L' + (W * .2 + 40) + ' ' + (sea - 4) + ' Z" fill="#150F2E"/></g>';
      body += '<path d="M' + (W * .82) + ' ' + H + ' q-6 -120 14 -210" fill="none" stroke="#120C26" stroke-width="7" stroke-linecap="round"/>';
      for (var p = 0; p < 6; p++) { var a = -2.6 + p * 0.55; body += '<path d="M' + (W * .82 + 14) + ' ' + (H - 210) + ' q' + (Math.cos(a) * 50) + ' ' + (Math.sin(a) * 30 - 10) + ' ' + (Math.cos(a) * 80) + ' ' + (Math.sin(a) * 40 + 30) + '" fill="none" stroke="#120C26" stroke-width="6" stroke-linecap="round"/>'; }
      body += birds(3, '#2A1646');
    } else if (scene === 'culture') {
      body = '<rect width="' + W + '" height="' + H + '" fill="' + pal[0] + '"/><circle cx="' + sx + '" cy="' + sy + '" r="' + (W * .7) + '" fill="url(#' + id + 'g)" opacity=".35"/>';
      var cols = [pal[1], pal[2], pal[3], pal[4], pal[5]];
      for (var row = 0; row < 7; row++) for (var c = 0; c < 5; c++) {
        var cx = c * (W / 4), cy = row * (H / 6), rr = W / 7 + r() * 16, col = cols[Math.floor(r() * cols.length)];
        body += '<circle class="drift" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + rr.toFixed(1) + '" fill="none" stroke="' + col + '" stroke-width="' + (8 + r() * 10).toFixed(1) + '" opacity=".5"/>';
        if (r() > .55) body += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + (rr * .35).toFixed(1) + '" fill="' + cols[Math.floor(r() * cols.length)] + '" opacity=".72"/>';
      }
    } else {
      body += (scene === 'peaks' ? stars(30) : '') + '<circle class="rise" cx="' + sx + '" cy="' + sy + '" r="' + sr * 2.4 + '" fill="url(#' + id + 'g)"/><circle class="rise" cx="' + sx + '" cy="' + sy + '" r="' + sr * .78 + '" fill="#FFF1C9"/>';
      if (scene === 'peaks') {
        var pk = 'M0 ' + H * .75, n = 5;
        for (var k = 0; k <= n; k++) { var px = (k / n) * W; pk += ' L' + (px - W / n / 2) + ' ' + (H * (.32 + r() * .2)) + ' L' + px + ' ' + (H * (.62 + r() * .1)); }
        body += '<path d="' + pk + ' L' + W + ' ' + H + ' L0 ' + H + ' Z" fill="' + pal[5] + '"/>';
        body += ridge(H * .8, 24, pal[4], 6);
      } else {
        body += ridge(H * .66, 26, pal[5], 5, 'drift-2') + ridge(H * .76, 18, pal[4], 7);
        if (scene === 'lake') {
          body += '<rect y="' + (H * .8) + '" width="' + W + '" height="' + (H * .2) + '" fill="' + pal[1] + '" opacity=".55"/>';
          for (var l = 0; l < 6; l++) body += '<rect class="drift" x="' + (sx - 60 + r() * 40) + '" y="' + (H * .82 + l * 10) + '" width="' + (50 + r() * 80) + '" height="2" fill="#FFE0A8" opacity="' + (0.6 - l * 0.08).toFixed(2) + '"/>';
          body += birds(4, '#101B3A');
        } else {
          body += acacia(W * (.2 + r() * .15), H * .82, .9 + r() * .5, pal[4]) + acacia(W * (.66 + r() * .2), H * .8, .6 + r() * .4, pal[4]);
          body += birds(3, '#1A0D24');
        }
      }
    }
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid slice" role="img" aria-label="' + esc(o.label || 'Illustration') + '"><defs>' + sky + sunG + '</defs>' + body + '</svg>';
  }
  function tourArt(t) { var c = catOf(t); return '<div class="ct-art" aria-hidden="true">' + art(String(t.id), c ? c.scene : 'savanna', { label: t.title }) + '</div>'; }
  function coverHTML(t, alt) {
    var src = coverOf(t);
    return src
      ? '<img src="' + esc(src) + '" alt="' + esc(alt == null ? t.title : alt) + '" loading="lazy" decoding="async" data-ct-tid="' + esc(t.id) + '" data-ct-scene="' + esc((catOf(t) || { scene: 'savanna' }).scene) + '" onerror="window.CabanaTours&&CabanaTours._fallback(this)"/>'
      : tourArt(t);
  }
  /* A cover that fails to load becomes its drawing, never a broken frame. */
  function fallback(img) {
    if (!img || !img.parentNode) return;
    var id = img.getAttribute('data-ct-tid') || 'x', t = st.byId[id] || { id: id, category: null };
    var wrap = doc.createElement('div');
    wrap.innerHTML = '<div class="ct-art" aria-hidden="true">' + art(String(id), img.getAttribute('data-ct-scene') || 'savanna', { label: t.title || '' }) + '</div>';
    img.parentNode.replaceChild(wrap.firstChild, img);
  }

  /* ═══ STATE ════════════════════════════════════════════════════════ */
  var st = {
    tours: [], byId: {}, deps: {}, pop: {}, loaded: false, depsLoaded: false,
    user: null, saves: [], listeners: { data: [], saves: [], user: [] }
  };
  function emit(k) { (st.listeners[k] || []).forEach(function (fn) { safe(function () { fn(api); }); }); }
  function on(k, fn) {
    if (!st.listeners[k]) st.listeners[k] = [];
    st.listeners[k].push(fn);
    if (k === 'data' && st.loaded) safe(function () { fn(api); });
    if (k === 'saves') safe(function () { fn(api); });
    if (k === 'user' && st.userKnown) safe(function () { fn(api); });
  }

  function load() {
    var c = sb();
    if (!c) { st.loaded = true; st.depsLoaded = true; emit('data'); afterLoad(); return Promise.resolve(); }
    var q1 = c.from('tours_public').select('*')
      .order('featured', { ascending: false }).order('sort_weight', { ascending: false }).order('published_at', { ascending: false });
    var q2 = c.rpc('tour_departures', { p_days: 90, p_tour: null, p_per_tour: 8 });
    var q3 = c.rpc('tour_popularity');
    return Promise.all([
      q1.then(function (r) { return r; }, function () { return {}; }),
      q2.then(function (r) { return r; }, function () { return {}; }),
      q3.then(function (r) { return r; }, function () { return {}; })
    ]).then(function (res) {
      st.tours = Array.isArray(res[0] && res[0].data) ? res[0].data : [];
      st.byId = {};
      st.tours.forEach(function (t) { st.byId[String(t.id)] = t; });
      st.deps = {};
      (Array.isArray(res[1] && res[1].data) ? res[1].data : []).forEach(function (d) {
        var k = String(d.tour_id); if (!st.byId[k]) return;
        (st.deps[k] = st.deps[k] || []).push(d);
      });
      st.pop = {};
      (Array.isArray(res[2] && res[2].data) ? res[2].data : []).forEach(function (p) { st.pop[String(p.tour_id)] = Number(p.saves) || 0; });
      st.loaded = true; st.depsLoaded = true;
      emit('data');
      afterLoad();
    });
  }
  function tour(id) { return st.byId[String(id)] || null; }
  function departures(id) { return (st.deps[String(id)] || []).slice(); }
  function nextDep(id) {
    var list = st.deps[String(id)] || [];
    var now = Date.now();
    // The next departure a traveller can still get on: open for booking, not full.
    for (var i = 0; i < list.length; i++) if (new Date(list[i].closes_at).getTime() > now && list[i].seats_left !== 0) return list[i];
    var t = tour(id);
    if (t && t.next_departure && t.schedule_type === 'fixed' && t.next_departure >= nboToday()) return { tour_id: t.id, departs_on: t.next_departure, departs_at: t.next_departure + 'T' + (fmtTime(t.departure_time) || '00:00') + ':00+03:00', closes_at: null, seats_left: t.spots_left, seats_total: t.spots_total };
    return null;
  }
  function upcoming(days) {
    var lim = Date.now() + (days || 30) * 864e5, out = [];
    st.tours.forEach(function (t) {
      var d = nextDep(t.id);
      if (d && new Date(d.departs_at).getTime() <= lim) out.push({ tour: t, dep: d });
    });
    return out.sort(function (a, b) { return new Date(a.dep.departs_at) - new Date(b.dep.departs_at); });
  }

  /* ═══ USER & SAVES ═════════════════════════════════════════════════ */
  function readLocalSaves() { return arr(store.get('saves')).map(String); }
  function writeLocalSaves(list) { store.set('saves', JSON.stringify(list.slice(0, 300))); }
  st.saves = readLocalSaves();
  function numericIds(list) { return list.filter(function (x) { return /^\d+$/.test(String(x)); }).map(Number); }

  function initUser() {
    var S = global.ApaSession;
    if (!S || !S.ready) { st.userKnown = true; emit('user'); return; }
    S.ready(function (s) {
      st.user = (s && s.user) || null; st.userKnown = true;
      emit('user');
      if (st.user) syncSaves(numericIds(st.saves), []);
    });
    if (S.subscribe) safe(function () {
      S.subscribe(function (s) {
        var u = (s && s.user) || null;
        if ((u && u.id) === (st.user && st.user.id)) return;
        st.user = u; emit('user');
        if (u) syncSaves(numericIds(st.saves), []);
      });
    });
  }
  function syncSaves(add, remove) {
    var c = sb(); if (!c || !st.user) return Promise.resolve();
    return c.rpc('tour_saves_sync', { p_add: add || [], p_remove: remove || [] }).then(function (r) {
      if (r && Array.isArray(r.data)) {
        var local = readLocalSaves().filter(function (x) { return !/^\d+$/.test(x); });
        st.saves = r.data.map(String).concat(local);
        writeLocalSaves(st.saves);
        paintHearts(); emit('saves');
      }
    }, function () {});
  }
  function isSaved(id) { return st.saves.indexOf(String(id)) !== -1; }
  function toggleSave(id, btn) {
    id = String(id);
    var was = isSaved(id);
    st.saves = was ? st.saves.filter(function (x) { return x !== id; }) : [id].concat(st.saves);
    writeLocalSaves(st.saves);
    if (!was) st.pop[id] = (st.pop[id] || 0) + 1; else if (st.pop[id]) st.pop[id]--;
    paintHearts();
    if (btn) { btn.classList.remove('pop'); void btn.offsetWidth; if (!was) btn.classList.add('pop'); }
    emit('saves');
    if (st.user && /^\d+$/.test(id)) syncSaves(was ? [] : [Number(id)], was ? [Number(id)] : []);
    else if (!was && !store.get('saves-hint')) { store.set('saves-hint', '1'); toast('Saved on this device. Sign in and it follows you everywhere.'); }
    else toast(was ? 'Removed from saved' : 'Saved');
    return !was;
  }
  function heart(id, extra) {
    var on = isSaved(id);
    return '<button class="ct-heart' + (extra ? ' ' + extra : '') + '" type="button" data-ct-save="' + esc(id) + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Remove from saved' : 'Save this tour') + '">' + ICON.heart + '</button>';
  }
  function paintHearts() {
    $$('[data-ct-save]').forEach(function (b) {
      var on = isSaved(b.getAttribute('data-ct-save'));
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', on ? 'Remove from saved' : 'Save this tour');
    });
    var live = st.saves.filter(function (x) { return !st.loaded || st.byId[x]; }).length;
    $$('[data-ct-saved-n]').forEach(function (n) { n.textContent = live > 99 ? '99+' : String(live); n.classList.toggle('on', live > 0); });
  }

  /* ═══ COUNTDOWNS & THE CLOCK ═══════════════════════════════════════
     [data-cd="<ISO>"] counts down in flap digits; [data-now] is the time
     in Nairobi. One ticker for the page, and only what is on screen is
     repainted. */
  var cd = { els: [], vis: typeof WeakSet === 'function' ? new WeakSet() : null, io: null, timer: 0 };
  function cdIO() {
    if (cd.io || !('IntersectionObserver' in global) || !cd.vis) return;
    cd.io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) cd.vis.add(e.target); else cd.vis.delete(e.target); }); }, { rootMargin: '80px' });
  }
  var LBL = { d: 'days', h: 'hrs', m: 'min', s: 'sec' };
  function cdParts(ms, units) {
    var s = Math.max(0, Math.floor(ms / 1000)), out = {};
    out.d = Math.floor(s / 86400); out.h = Math.floor((s % 86400) / 3600); out.m = Math.floor((s % 3600) / 60); out.s = s % 60;
    if (units.indexOf('d') === -1) out.h += out.d * 24;
    return out;
  }
  function paintCd(node, force) {
    var now = node.hasAttribute('data-now');
    var units = (node.getAttribute('data-cd-units') || (now ? 'hms' : 'dhms')).split('');
    var vals = {};
    if (now) {
      var d = new Date(Date.now() + NBO);
      vals = { h: d.getUTCHours(), m: d.getUTCMinutes(), s: d.getUTCSeconds() };
    } else {
      var ms = new Date(node.getAttribute('data-cd')).getTime() - Date.now();
      if (!(ms > 0)) {
        if (!node.__done) { node.__done = true; node.innerHTML = '<span class="ct-cd-done">' + esc(node.getAttribute('data-cd-done') || 'Boarding now') + '</span>'; }
        return;
      }
      vals = cdParts(ms, units);
    }
    var labels = node.getAttribute('data-cd-labels') !== '0';
    var strs = units.map(function (u) { var v = String(vals[u]); return v.length < 2 ? '0' + v : v; });
    var sig = strs.map(function (x) { return x.length; }).join(',');
    if (force || node.__sig !== sig) {
      node.__sig = sig; node.classList.add('ct-cd');
      node.innerHTML = units.map(function (u, i) {
        return (i && !labels ? '<span class="ct-cd-sep">:</span>' : '') +
          '<span class="ct-cd-u"><span class="ct-fl">' + strs[i].split('').map(function (ch) { return '<span class="ct-fd"><b>' + ch + '</b></span>'; }).join('') + '</span>' +
          (labels ? '<i>' + LBL[u] + '</i>' : '') + '</span>';
      }).join('');
      node.__digits = strs.join('');
      return;
    }
    var next = strs.join(''), prev = node.__digits || '';
    if (next === prev) return;
    var cells = node.querySelectorAll('.ct-fd');
    for (var i = 0; i < next.length; i++) {
      if (next[i] !== prev[i] && cells[i]) cells[i].innerHTML = '<b class="in">' + next[i] + '</b>';
    }
    node.__digits = next;
  }
  function mountCountdowns(root) {
    cdIO();
    $$('[data-cd],[data-now]', root).forEach(function (n) {
      if (n.__cd) return;
      n.__cd = true; cd.els.push(n);
      if (cd.io) cd.io.observe(n); else if (cd.vis) cd.vis.add(n);
      paintCd(n, true);
      if (!n.hasAttribute('aria-label') && !n.hasAttribute('data-now')) {
        var ms = new Date(n.getAttribute('data-cd')).getTime() - Date.now();
        n.setAttribute('aria-label', ms > 0 ? 'Departs in ' + dur(ms) : 'Departing now');
      }
      n.setAttribute('role', n.getAttribute('role') || 'timer');
    });
    if (!cd.timer) cd.timer = setInterval(function () {
      if (doc.hidden) return;
      cd.els = cd.els.filter(function (n) { return n.isConnected; });
      cd.els.forEach(function (n) { if (!cd.vis || cd.vis.has(n)) paintCd(n, false); });
    }, 1000);
  }

  /* ═══ TOAST ════════════════════════════════════════════════════════ */
  var _toastT;
  function toast(msg, ms) {
    var t = el('ct-toast');
    if (!t) { t = doc.createElement('div'); t.id = 'ct-toast'; t.className = 'ct-toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); doc.body.appendChild(t); }
    t.textContent = msg;
    clearTimeout(_toastT);
    requestAnimationFrame(function () { t.classList.add('show'); });
    _toastT = setTimeout(function () { t.classList.remove('show'); }, ms || 2800);
  }

  /* ═══ CARDS ════════════════════════════════════════════════════════ */
  function card(t, o) {
    o = o || {};
    var p = priceOf(t), dep = nextDep(t.id), c = catOf(t);
    var where = t.destination || t.county || t.country || '';
    var facts = [];
    if (t.duration_label) facts.push(t.duration_label); else if (Number(t.days) > 1) facts.push(t.days + ' days');
    if (t.group_max) facts.push('Up to ' + t.group_max);
    arr(t.languages).slice(0, 1).forEach(function (l) { facts.push(l); });
    var tag = t.operator_kind === 'cabana' ? '<span class="ct-tag ct-tag-sweep">' + ICON.verified + 'Cabana</span>'
      : c ? '<span class="ct-tag">' + esc(c.name) + '</span>' : '<span class="ct-tag">Tour</span>';
    var pop = st.pop[String(t.id)] || 0;
    return '<article class="ct-card" data-id="' + esc(t.id) + '" style="--acc:' + accentOf(t) + '" tabindex="0" role="button" aria-label="' + esc(t.title + (where ? ', ' + where : '') + ', ' + p.v) + '">' +
      '<div class="ct-card-media">' + coverHTML(t, '') +
        '<div class="ct-card-top">' + tag + heart(t.id) + '</div>' +
        '<div class="ct-card-where">' +
          (where ? '<span class="d">' + ICON.pin + esc(where) + '</span>' : '') +
          (dep ? '<span class="next">Next <b>' + esc(fmtDay(dep.departs_on).toUpperCase()) + '</b>' + (t.departure_time ? ' · ' + esc(fmtTime(t.departure_time)) : '') + '</span>'
               : t.schedule_type === 'on_request' ? '<span class="next">Any day <b>ON REQUEST</b></span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="ct-card-body">' +
        '<h3 class="ct-card-title">' + esc(t.title) + '</h3>' +
        '<div class="ct-card-op">' + (t.operator_verified ? ICON.verified : '') + '<span>' + esc(whoOf(t)) + '</span></div>' +
        (facts.length ? '<div class="ct-card-facts">' + facts.slice(0, 3).map(function (f) { return '<span class="ct-fact">' + esc(f) + '</span>'; }).join('') + (pop >= 3 ? '<span class="ct-fact">♥ ' + pop + '</span>' : '') + '</div>' : '') +
        '<div class="ct-card-foot"><div class="ct-price' + (p.free ? ' free' : '') + '"><b>' + esc(p.v) + '</b><small>' + esc(p.u) + '</small></div><span class="ct-card-go">' + ICON.arrow + '</span></div>' +
      '</div>' +
    '</article>';
  }
  function skeletonCards(n) { var s = ''; for (var i = 0; i < n; i++) s += '<div class="ct-skel ct-skel-card"></div>'; return s; }

  /* The boarding pass: one departure, counting down. */
  function pass(t, d) {
    var p = priceOf(t), total = Number(d.seats_total) || Number(t.group_max) || 0, left = d.seats_left == null ? null : Number(d.seats_left);
    var pct = total && left != null ? Math.max(4, Math.min(100, Math.round((1 - left / total) * 100))) : 0;
    var closesMs = d.closes_at ? new Date(d.closes_at).getTime() - Date.now() : 0;
    var vr = global.CabanaImmersive && global.CabanaImmersive.forTour && global.CabanaImmersive.forTour(t.id);
    return '<article class="ct-pass" data-tour="' + esc(t.id) + '" data-date="' + esc(d.departs_on) + '" style="--acc:' + accentOf(t) + '">' +
      '<div class="ct-pass-media" data-ct-open="' + esc(t.id) + '">' + coverHTML(t, '') +
        (vr ? '<span class="ct-tag ct-tag-sweep">' + ICON.vr + '360°</span>' : (t.operator_kind === 'cabana' ? '<span class="ct-tag ct-tag-sweep">Cabana</span>' : '')) +
        heart(t.id) +
        '<div class="ct-pass-code"><small>' + esc((catOf(t) || { name: 'Tour' }).name) + '</small>' + esc(codeOf(t)) + '</div>' +
      '</div>' +
      '<div class="ct-pass-body">' +
        '<h3 class="ct-pass-t" data-ct-open="' + esc(t.id) + '">' + esc(t.title) + '</h3>' +
        '<div class="ct-pass-op">' + (t.operator_verified ? ICON.verified : '') + esc(whoOf(t)) + '</div>' +
        '<div class="ct-pass-grid">' +
          '<div><small>Departs</small><b>' + esc(fmtDay(d.departs_on).toUpperCase()) + '</b></div>' +
          '<div><small>Time</small><b>' + esc(t.departure_time ? fmtTime(t.departure_time) : 'TBC') + '</b></div>' +
          '<div><small>Seats</small><b>' + (left == null ? '—' : left > 0 ? esc(left + ' left') : 'FULL') + '</b></div>' +
        '</div>' +
        (pct ? '<div class="ct-seats' + (left != null && left <= 3 ? ' low' : '') + '" title="' + esc((total - left) + ' of ' + total + ' seats taken') + '"><i style="width:' + pct + '%"></i></div>' : '') +
        '<div class="ct-pass-tear" aria-hidden="true"></div>' +
        '<div class="ct-pass-count"><span class="lbl">Departs<br>in</span><span data-cd="' + esc(d.departs_at) + '" data-cd-done="Departing"></span></div>' +
        (closesMs > 0 && closesMs < 72 * 3600e3 ? '<span class="ct-closes">' + ICON.clock + 'Booking closes in ' + esc(dur(closesMs)) + '</span>' : '') +
        '<div class="ct-pass-foot"><div class="ct-price' + (p.free ? ' free' : '') + '"><b>' + esc(p.v) + '</b><small>' + esc(p.u) + '</small></div>' +
          '<button class="ct-icon-b" type="button" data-ct-msg="' + esc(t.id) + '" data-date="' + esc(d.departs_on) + '" aria-label="Message the guide about ' + esc(t.title) + '">' + ICON.chat + '</button>' +
          '<button class="ct-btn ct-btn-sun ct-btn-s" type="button" data-ct-book="' + esc(t.id) + '" data-date="' + esc(d.departs_on) + '"' + (left === 0 ? ' disabled' : '') + '>' + (p.free ? 'Reserve' : 'Book') + '</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  /* ═══ REVEAL ═══════════════════════════════════════════════════════ */
  var _rio = null;
  function reveal(root) {
    var items = $$('.ct-rv:not(.in),.ct-card:not(.in),.ct-pass:not(.in)', root);
    if (!items.length) return;
    if (!('IntersectionObserver' in global) || reduced()) { items.forEach(function (n) { n.classList.add('in'); }); return; }
    if (!_rio) _rio = new IntersectionObserver(function (es) {
      es.forEach(function (e, i) {
        if (!e.isIntersecting) return;
        var n = e.target; _rio.unobserve(n);
        setTimeout(function () { n.classList.add('in'); }, Math.min(i, 8) * 60);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    items.forEach(function (n) { _rio.observe(n); });
  }

  /* ═══ DELEGATED ACTIONS ════════════════════════════════════════════ */
  function onDocClick(e) {
    var t = e.target;
    var save = t.closest && t.closest('[data-ct-save]');
    if (save) { e.preventDefault(); e.stopPropagation(); toggleSave(save.getAttribute('data-ct-save'), save); return; }
    var msg = t.closest && t.closest('[data-ct-msg]');
    if (msg) { e.preventDefault(); e.stopPropagation(); message(msg.getAttribute('data-ct-msg'), { date: msg.getAttribute('data-date') || null }); return; }
    var bk = t.closest && t.closest('[data-ct-book]');
    if (bk) { e.preventDefault(); e.stopPropagation(); book(bk.getAttribute('data-ct-book'), { date: bk.getAttribute('data-date') || null }); return; }
    var op = t.closest && t.closest('[data-ct-open]');
    if (op) { e.preventDefault(); openSheet(op.getAttribute('data-ct-open')); return; }
    var cardEl = t.closest && t.closest('.ct-card[data-id]');
    if (cardEl) { e.preventDefault(); openSheet(cardEl.getAttribute('data-id')); return; }
    if (t.closest && t.closest('[data-ct-saved]')) { e.preventDefault(); openDrawer(); return; }
    if (t.closest && t.closest('[data-ct-inbox]')) { e.preventDefault(); openInbox(); return; }
    if (t.closest && t.closest('[data-ct-search]')) { e.preventDefault(); openSearch(); return; }
  }
  function onDocKey(e) {
    if (e.key === 'Escape') { closeSheet(); closeDrawer(); closeSearch(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.matches && e.target.matches('.ct-card[data-id]')) {
      e.preventDefault(); openSheet(e.target.getAttribute('data-id'));
    }
    if (e.key === '/' && !/input|textarea|select/i.test((e.target && e.target.tagName) || '') && !e.target.isContentEditable) { e.preventDefault(); openSearch(); }
  }

  /* ═══ MESSAGES & BOOKING ═══════════════════════════════════════════ */
  function openInbox() {
    if (global.CabanaChat && global.CabanaChat.openInbox) { global.CabanaChat.openInbox(); return; }
    signIn();
  }
  function signIn(next) {
    global.location.href = '/auth.html?next=' + encodeURIComponent(next || (global.location.pathname + global.location.search + global.location.hash));
  }
  function message(id, o) {
    o = o || {};
    var t = tour(id);
    if (global.CabanaChat && global.CabanaChat.openTour) {
      global.CabanaChat.openTour({ tourId: /^\d+$/.test(String(id)) ? Number(id) : id, date: o.date || null, people: o.people || null, title: t ? t.title : '', draft: o.draft || null });
      return;
    }
    if (!st.user) { signIn(); return; }
    toast('Messages are still loading. Try again in a moment.');
  }
  function book(id, o) {
    var t = tour(id);
    if (!t) { toast('This tour is not taking bookings right now.'); return; }
    if (global.CabanaTourBook && global.CabanaTourBook.open) { global.CabanaTourBook.open(t, o || {}); return; }
    if (global.CabanaSupport && global.CabanaSupport.ask) { global.CabanaSupport.ask('I would like to book this tour: ' + t.title); return; }
    global.location.href = '/help.html';
  }

  /* ═══ THE SHEET ════════════════════════════════════════════════════ */
  var sheetState = { id: null, date: null, lastFocus: null };
  function ensureSheet() {
    var sheet = el('ct-sheet'), veil = el('ct-veil');
    if (!veil) { veil = doc.createElement('div'); veil.id = 'ct-veil'; veil.className = 'ct-veil'; doc.body.appendChild(veil); }
    if (!sheet) { sheet = doc.createElement('aside'); sheet.id = 'ct-sheet'; sheet.className = 'ct-sheet'; sheet.setAttribute('aria-label', 'Tour details'); doc.body.appendChild(sheet); }
    if (!sheet.classList.contains('ct-sheet')) sheet.classList.add('ct-sheet');
    if (!veil.classList.contains('ct-veil')) veil.classList.add('ct-veil');
    if (!veil.__wired) { veil.__wired = true; veil.addEventListener('click', function () { closeSheet(); closeDrawer(); }); }
    return { sheet: sheet, veil: veil };
  }
  function openSheet(id, o) {
    o = o || {};
    var t = tour(id);
    if (!t) return false;
    var parts = ensureSheet(), sheet = parts.sheet, veil = parts.veil;
    sheetState.id = String(t.id); sheetState.lastFocus = doc.activeElement;
    var deps = departures(t.id).filter(function (d) { return new Date(d.closes_at).getTime() > Date.now(); });
    var firstOpen = deps.filter(function (d) { return d.seats_left !== 0; })[0];
    sheetState.date = o.date || (firstOpen && firstOpen.departs_on) || null;
    var p = priceOf(t), c = catOf(t);
    var media = [];
    var vids = arr(t.videos), photos = arr(t.photos);
    var cover = coverOf(t);
    if (vids[0]) media.push('<video src="' + esc(vids[0]) + '" controls playsinline preload="metadata"' + (cover ? ' poster="' + esc(cover) + '"' : '') + '></video>');
    if (cover) media.push('<img src="' + esc(cover) + '" alt="' + esc(t.title) + '" decoding="async"/>');
    photos.forEach(function (ph) { if (ph && ph !== cover && media.length < 10) media.push('<img src="' + esc(ph) + '" alt="" loading="lazy" decoding="async"/>'); });
    if (!media.length) media.push(tourArt(t));
    var facts = [];
    if (t.duration_label) facts.push(t.duration_label); else if (Number(t.days) > 1) facts.push(t.days + ' days');
    if (t.destination) facts.push(t.destination);
    if (t.group_max) facts.push((t.group_min || 1) + '–' + t.group_max + ' people');
    if (t.schedule_type === 'daily') facts.push('Runs daily');
    else if (t.schedule_type === 'weekly') facts.push('Weekly: ' + arr(t.departure_days).map(function (d) { return String(d).slice(0, 3).replace(/^./, function (x) { return x.toUpperCase(); }); }).join(', '));
    else if (t.schedule_type === 'on_request') facts.push('Any day, on request');
    if (t.departure_time) facts.push('Leaves ' + fmtTime(t.departure_time));
    arr(t.languages).slice(0, 3).forEach(function (l) { facts.push(l); });
    var inc = arr(t.includes_list), exc = arr(t.excludes_list), itin = arr(t.itinerary), high = arr(t.highlights), bring = arr(t.what_to_bring);
    var av = t.operator_logo ? '<img src="' + esc(t.operator_logo) + '" alt="" loading="lazy"/>' : '<span>' + esc(String(t.operator_name || 'C').charAt(0).toUpperCase()) + '</span>';
    function list(items, cls, ic) { return items.map(function (x) { return '<div class="' + cls + '">' + ic + '<span>' + esc(x) + '</span></div>'; }).join(''); }

    sheet.innerHTML =
      '<span class="ct-sheet-grab" aria-hidden="true"></span>' +
      '<button class="ct-sheet-close" type="button" aria-label="Close">' + ICON.close + '</button>' +
      '<div class="ct-sheet-scroll">' +
        '<div class="ct-gal"><div class="ct-gal-track">' + media.join('') + '</div>' +
          (media.length > 1 ? '<div class="ct-gal-dots">' + media.map(function (_, i) { return '<i' + (i ? '' : ' class="on"') + '></i>'; }).join('') + '</div>' : '') + '</div>' +
        '<div class="ct-sheet-body" style="--acc:' + accentOf(t) + '">' +
          '<div class="ct-sheet-kick">' + (c ? '<span class="ct-tag">' + esc(c.name) + '</span>' : '') + (t.operator_kind === 'cabana' ? '<span class="ct-tag ct-tag-sweep">' + ICON.verified + 'Run by Cabana</span>' : '') + '</div>' +
          '<h2 class="ct-sheet-title">' + esc(t.title) + '</h2>' +
          '<div class="ct-sheet-meta">' + facts.map(function (f) { return '<span class="ct-fact">' + esc(f) + '</span>'; }).join('') + '</div>' +
          '<div class="ct-sheet-op"><span class="av">' + av + '</span><div class="who"><b>' + esc(t.operator_name || 'Local operator') + (t.operator_verified ? ICON.verified : '') + '</b><small>' +
            esc([t.operator_persona === 'guide' ? 'Local guide' : 'Tour operator', t.operator_county, t.operator_tagline].filter(Boolean).join(' · ')) + '</small></div>' +
            '<button class="ct-btn ct-btn-s" type="button" data-ct-msg="' + esc(t.id) + '">' + ICON.chat + 'Message</button></div>' +
          (deps.length ? '<div class="ct-sheet-deps"><div class="ct-sec-h" style="margin-top:6px">Next departures</div><div class="ct-dates" role="group" aria-label="Choose a departure">' +
            deps.slice(0, 12).map(function (d) {
              var left = d.seats_left == null ? null : Number(d.seats_left);
              return '<button class="ct-date' + (left != null && left <= 3 ? ' low' : '') + '" type="button" data-date="' + esc(d.departs_on) + '" aria-pressed="' + (d.departs_on === sheetState.date) + '"' + (left === 0 ? ' disabled' : '') + '>' +
                '<small>' + esc(fmtDay(d.departs_on, { weekday: 'short', timeZone: 'UTC' })) + '</small><b>' + esc(fmtDay(d.departs_on, { day: 'numeric', timeZone: 'UTC' })) + '</b><span>' + (left == null ? esc(fmtDay(d.departs_on, { month: 'short', timeZone: 'UTC' })) : left === 0 ? 'Full' : left + ' left') + '</span></button>';
            }).join('') + '</div>' +
            '<div class="ct-clock" style="--acc:' + accentOf(t) + '"><span class="ct-clock-l">Departs in</span><span id="ct-sheet-cd" data-cd="' + esc(deps[0].departs_at) + '"></span></div></div>' : '') +
          (t.summary ? '<p class="ct-sheet-desc">' + esc(t.summary) + '</p>' : '') +
          (t.description ? '<p class="ct-sheet-desc">' + esc(t.description) + '</p>' : '') +
          (high.length ? '<div class="ct-sec-h">Highlights</div><div class="ct-inc">' + list(high, 'yes', ICON.star) + '</div>' : '') +
          (itin.length ? '<div class="ct-sec-h">The day, step by step</div><div class="ct-itin">' + itin.map(function (d, i) {
            return '<div class="ct-day"><div class="ct-day-t"><small>' + esc(d.time || ('DAY ' + (d.day || i + 1))) + '</small>' + esc(d.title || '') + '</div>' + (d.desc ? '<div class="ct-day-d">' + esc(d.desc) + '</div>' : '') + '</div>';
          }).join('') + '</div>' : '') +
          ((inc.length || exc.length) ? '<div class="ct-sec-h">What’s included</div><div class="ct-inc">' + list(inc, 'yes', ICON.check) + list(exc, 'no', ICON.cross) + '</div>' : '') +
          (bring.length ? '<div class="ct-sec-h">Bring with you</div><div class="ct-inc">' + list(bring, 'yes', ICON.check) + '</div>' : '') +
          (t.meeting_point ? '<div class="ct-sec-h">Where you meet</div><div class="ct-day-d">' + esc(t.meeting_point) + '</div>' : '') +
          (t.accessibility ? '<div class="ct-sec-h">Access</div><div class="ct-day-d">' + esc(t.accessibility) + '</div>' : '') +
          (t.cancellation ? '<div class="ct-sec-h">If plans change</div><div class="ct-day-d">' + esc(t.cancellation) + '</div>' : '') +
          '<div class="ct-note" style="margin-top:26px">' + ICON.shield + '<span>Pay and chat on Cabana. The guide’s number and the meeting details unlock the moment your booking is paid' + (Number(t.deposit_pct) > 0 && Number(t.deposit_pct) < 100 && !p.free ? ', and you pay the balance on the day' : '') + '.</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="ct-sheet-bar">' +
        '<div class="ct-price' + (p.free ? ' free' : '') + '"><b>' + esc(p.v) + '</b><small>' + esc(p.u) + (Number(t.deposit_pct) > 0 && Number(t.deposit_pct) < 100 && !p.free ? ' · ' + t.deposit_pct + '% to confirm' : '') + '</small></div>' +
        heart(t.id) +
        '<button class="ct-icon-b" type="button" data-ct-msg="' + esc(t.id) + '" aria-label="Message the guide">' + ICON.chat + '</button>' +
        '<button class="ct-btn ct-btn-sun" type="button" data-book="' + esc(t.id) + '" data-ct-book="' + esc(t.id) + '">' + (p.free ? 'Reserve a place' : 'Book') + '</button>' +
      '</div>';

    sheet.classList.add('open'); veil.classList.add('open');
    doc.documentElement.style.overflow = 'hidden';
    sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true');
    $('.ct-sheet-close', sheet).addEventListener('click', closeSheet);
    $('.ct-sheet-scroll', sheet).scrollTop = 0;
    // Chosen date follows the guest to booking and messaging.
    $$('.ct-date', sheet).forEach(function (b) {
      b.addEventListener('click', function () {
        sheetState.date = b.getAttribute('data-date');
        $$('.ct-date', sheet).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        $$('[data-ct-book],[data-ct-msg]', sheet).forEach(function (x) { x.setAttribute('data-date', sheetState.date); });
        var d = deps.filter(function (x) { return x.departs_on === sheetState.date; })[0], cdn = el('ct-sheet-cd');
        if (d && cdn) { cdn.setAttribute('data-cd', d.departs_at); cdn.__done = false; paintCd(cdn, true); }
      });
    });
    if (sheetState.date) $$('[data-ct-book],[data-ct-msg]', sheet).forEach(function (x) { x.setAttribute('data-date', sheetState.date); });
    var track = $('.ct-gal-track', sheet), dots = $$('.ct-gal-dots i', sheet);
    if (track && dots.length) track.addEventListener('scroll', function () {
      var i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      dots.forEach(function (d, j) { d.classList.toggle('on', i === j); });
    }, { passive: true });
    mountCountdowns(sheet);
    setTimeout(function () { var x = $('.ct-sheet-close', sheet); if (x) x.focus({ preventScroll: true }); }, 60);
    try { var u = new URL(global.location.href); u.searchParams.set('open', t.id); global.history.replaceState(null, '', u); } catch (e) {}
    safe(function () { if (global.gtag) global.gtag('event', 'view_item', { item_id: String(t.id), item_name: t.title, item_category: 'tour' }); });
    return true;
  }
  function closeSheet() {
    var sheet = el('ct-sheet'), veil = el('ct-veil');
    if (!sheet || !sheet.classList.contains('open')) return;
    sheet.classList.remove('open');
    if (veil && !(el('ct-drawer') && el('ct-drawer').classList.contains('open'))) veil.classList.remove('open');
    doc.documentElement.style.overflow = '';
    $$('video', sheet).forEach(function (v) { try { v.pause(); } catch (e) {} });
    try { var u = new URL(global.location.href); if (u.searchParams.has('open')) { u.searchParams.delete('open'); global.history.replaceState(null, '', u.pathname + (u.search || '') + u.hash); } } catch (e) {}
    try { if (sheetState.lastFocus && sheetState.lastFocus.focus) sheetState.lastFocus.focus({ preventScroll: true }); } catch (e) {}
  }

  /* ═══ SAVED DRAWER ═════════════════════════════════════════════════ */
  function openDrawer() {
    var d = el('ct-drawer');
    if (!d) {
      d = doc.createElement('aside'); d.id = 'ct-drawer'; d.className = 'ct-drawer';
      d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', 'Saved tours');
      doc.body.appendChild(d);
      on('saves', function () { if (d.classList.contains('open')) paintDrawer(); });
    }
    paintDrawer();
    ensureSheet().veil.classList.add('open');
    d.classList.add('open');
    doc.documentElement.style.overflow = 'hidden';
    setTimeout(function () { var x = $('.ct-sheet-close', d); if (x) x.focus(); }, 60);
  }
  function paintDrawer() {
    var d = el('ct-drawer'); if (!d) return;
    var list = st.saves.map(function (id) { return st.byId[id]; }).filter(Boolean);
    d.innerHTML = '<div class="ct-drawer-h"><div><h3>Saved tours</h3><small>' +
      (st.user ? 'On every device you sign in to.' : 'On this device. <a href="#" data-ct-signin style="color:var(--ct-turq)">Sign in</a> to keep them everywhere.') +
      '</small></div><button class="ct-sheet-close" style="position:static" type="button" aria-label="Close">' + ICON.close + '</button></div>' +
      '<div class="ct-drawer-b">' + (list.length ? list.map(function (t) {
        var p = priceOf(t), dep = nextDep(t.id);
        return '<div class="ct-mini" role="button" tabindex="0" data-ct-open="' + esc(t.id) + '"><span class="ct-mini-m">' + coverHTML(t, '') + '</span><span class="ct-mini-b"><b>' + esc(t.title) + '</b><small>' +
          esc([t.destination, dep ? 'Next ' + fmtDay(dep.departs_on) : ''].filter(Boolean).join(' · ')) + '</small><span class="p">' + esc(p.v) + '</span></span>' + heart(t.id) + '</div>';
      }).join('') : '<div class="ct-blank" style="border-style:dashed"><div class="ct-blank-mark">' + ICON.heart + '</div><h3>Nothing saved yet</h3><p>Tap the heart on any tour and it waits for you here.</p><div class="ct-blank-acts"><a class="ct-btn ct-btn-sun" href="/tours-catalogue">Browse tours</a></div></div>') + '</div>';
    $('.ct-sheet-close', d).addEventListener('click', closeDrawer);
    var si = $('[data-ct-signin]', d); if (si) si.addEventListener('click', function (e) { e.preventDefault(); signIn(); });
    $$('[data-ct-open]', d).forEach(function (n) { n.addEventListener('click', function () { closeDrawer(true); }, true); });
  }
  function closeDrawer(keepVeil) {
    var d = el('ct-drawer'); if (!d || !d.classList.contains('open')) return;
    d.classList.remove('open');
    if (!keepVeil) { var v = el('ct-veil'); if (v && !(el('ct-sheet') && el('ct-sheet').classList.contains('open'))) v.classList.remove('open'); doc.documentElement.style.overflow = ''; }
  }

  /* ═══ SEARCH ═══════════════════════════════════════════════════════ */
  function openSearch() {
    var o = el('ct-search');
    if (!o) {
      o = doc.createElement('div'); o.id = 'ct-search'; o.className = 'ct-search-ov';
      o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-label', 'Search tours');
      o.innerHTML = '<button class="ct-sheet-close ct-search-x" type="button" aria-label="Close search">' + ICON.close + '</button>' +
        '<form class="ct-search-box" role="search" action="/tours-catalogue">' + ICON.search +
          '<input name="q" type="search" placeholder="Where to? A place, a kind of tour, a guide" autocomplete="off" aria-label="Search tours"/>' +
          '<button class="ct-btn ct-btn-ink ct-btn-s" type="submit">Search</button></form>' +
        '<div class="ct-search-sug" id="ct-search-sug"></div><div class="ct-search-res" id="ct-search-res"></div>';
      doc.body.appendChild(o);
      $('.ct-search-x', o).addEventListener('click', closeSearch);
      o.addEventListener('click', function (e) { if (e.target === o) closeSearch(); });
      var inp = $('input', o), deb;
      inp.addEventListener('input', function () { clearTimeout(deb); deb = setTimeout(function () { paintSearch(inp.value); }, 90); });
      $$('.ct-search-res', o).forEach(function (r) { r.addEventListener('click', function (e) { if (e.target.closest('[data-ct-open]')) closeSearch(); }, true); });
    }
    paintSearch('');
    o.classList.add('open');
    doc.documentElement.style.overflow = 'hidden';
    setTimeout(function () { var i = $('input', o); if (i) i.focus(); }, 80);
  }
  function paintSearch(q) {
    var sug = el('ct-search-sug'), res = el('ct-search-res'); if (!sug || !res) return;
    var places = {}, list = st.tours;
    list.forEach(function (t) { var p = t.destination || t.county; if (p) places[p] = (places[p] || 0) + 1; });
    var top = Object.keys(places).sort(function (a, b) { return places[b] - places[a]; }).slice(0, 6);
    ['Masai Mara', 'Nairobi', 'Naivasha', 'Diani', 'Amboseli'].forEach(function (x) { if (top.length < 8 && top.indexOf(x) === -1) top.push(x); });
    sug.innerHTML = top.map(function (p) { return '<a class="ct-chip" href="/tours-catalogue?q=' + encodeURIComponent(p) + '">' + ICON.pin.replace('<svg', '<svg width="14" height="14"') + esc(p) + '</a>'; }).join('') +
      Object.keys(CATS).slice(0, 4).map(function (k) { return '<a class="ct-chip" href="/tours-catalogue?cat=' + k + '">' + esc(CATS[k].name) + '</a>'; }).join('');
    q = String(q || '').trim().toLowerCase();
    if (!q) { res.innerHTML = ''; return; }
    var hits = list.filter(function (t) { return [t.title, t.destination, t.county, t.operator_name, t.summary].concat(arr(t.tags)).join(' ').toLowerCase().indexOf(q) !== -1; }).slice(0, 6);
    res.innerHTML = hits.length ? hits.map(function (t) {
      var p = priceOf(t);
      return '<div class="ct-mini" role="button" tabindex="0" data-ct-open="' + esc(t.id) + '"><span class="ct-mini-m">' + coverHTML(t, '') + '</span><span class="ct-mini-b"><b>' + esc(t.title) + '</b><small>' + esc([t.destination, t.operator_name].filter(Boolean).join(' · ')) + '</small><span class="p">' + esc(p.v) + '</span></span></div>';
    }).join('') : '<p style="color:var(--ct-cream-3);font:500 14px var(--ct-f);margin:6px 4px">Nothing listed matches “' + esc(q) + '” yet. Press Search to look across the whole catalogue.</p>';
  }
  function closeSearch() {
    var o = el('ct-search'); if (!o || !o.classList.contains('open')) return;
    o.classList.remove('open'); doc.documentElement.style.overflow = '';
  }

  /* ═══ HEADER ═══════════════════════════════════════════════════════ */
  function mountHeader() {
    var top = el('ct-top'); if (!top) return;
    var tabs = $('.ct-tabs', top), ink = $('.ct-tab-ink', top);
    function place(tab) {
      if (!ink || !tabs) return;
      if (!tab) { ink.classList.remove('on'); return; }
      $$('.ct-tab', tabs).forEach(function (x) { x.classList.toggle('is-on', x === tab); });
      tabs.classList.add('has-ink');
      ink.style.width = tab.offsetWidth + 'px';
      ink.style.transform = 'translateX(' + tab.offsetLeft + 'px)';
      ink.classList.add('on');
    }
    var current = $('.ct-tab[aria-current="page"]', top);
    var spied = $$('.ct-tab[data-spy]', top).map(function (tb) { return { tab: tb, sec: $(tb.getAttribute('data-spy')) }; }).filter(function (x) { return x.sec; });
    place(current);
    global.addEventListener('resize', function () { place($('.ct-tab.is-on', top) || current); }, { passive: true });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { place($('.ct-tab.is-on', top) || current); });
    if (spied.length && 'IntersectionObserver' in global) {
      var vis = {};
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { vis[e.target.id] = e.isIntersecting ? e.intersectionRatio : 0; });
        var best = null, br = 0;
        spied.forEach(function (x) { var r = vis[x.sec.id] || 0; if (r > br) { br = r; best = x.tab; } });
        place(best && br > 0.12 ? best : current);
        var on = best && br > 0.12 ? best : current;
        if (on && tabs.scrollWidth > tabs.clientWidth) {
          var pad = parseFloat(global.getComputedStyle(tabs).paddingLeft) || 0;
          tabs.scrollTo({ left: Math.max(0, on.offsetLeft - pad - 2), behavior: 'smooth' });
        }
      }, { threshold: [0, 0.12, 0.3, 0.6] });
      spied.forEach(function (x) { io.observe(x.sec); });
    }
    // In-page tabs scroll there, clear of the sticky header.
    $$('.ct-tab[href*="#"]', top).forEach(function (a) {
      a.addEventListener('click', function (e) {
        var u; try { u = new URL(a.href, global.location.href); } catch (x) { return; }
        if (u.pathname.replace(/\.html$/, '') !== global.location.pathname.replace(/\.html$/, '')) return;
        var target = u.hash && doc.querySelector(u.hash); if (!target) return;
        e.preventDefault();
        global.scrollTo({ top: target.getBoundingClientRect().top + global.scrollY - top.offsetHeight + 1, behavior: reduced() ? 'auto' : 'smooth' });
        try { global.history.replaceState(null, '', u.hash); } catch (x) {}
      });
    });
    var raf = 0;
    global.addEventListener('scroll', function () {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        var h = doc.documentElement.scrollHeight - global.innerHeight;
        top.style.setProperty('--ct-read', h > 0 ? Math.min(1, global.scrollY / h).toFixed(3) : '0');
      });
    }, { passive: true });
    paintHearts();
  }

  /* ═══ DEEP LINKS ═══════════════════════════════════════════════════ */
  var _linked = false;
  function afterLoad() {
    paintHearts();
    if (_linked) return; _linked = true;
    safe(function () {
      var p = new URLSearchParams(global.location.search);
      var open = p.get('open'), bk = p.get('book');
      if (bk && tour(bk)) book(bk, { date: p.get('date'), people: Number(p.get('people')) || null });
      else if (open) openSheet(open, { date: p.get('date') });
      if (p.get('saved') === '1') openDrawer();
    });
  }

  function start() {
    doc.addEventListener('click', onDocClick);
    doc.addEventListener('keydown', onDocKey);
    mountHeader();
    initUser();
    mountCountdowns(doc);
    load();
    // A tab brought back after hours should not show yesterday's board.
    var hiddenAt = 0;
    doc.addEventListener('visibilitychange', function () {
      if (doc.hidden) { hiddenAt = Date.now(); return; }
      if (hiddenAt && Date.now() - hiddenAt > 10 * 60e3) load();
    });
  }

  var api = {
    // the contract other files already use
    reload: load, open: openSheet, get: function () { return st.tours.slice(); }, reel: function () { return []; },
    // everything else
    close: closeSheet, tour: tour, departures: departures, next: nextDep, upcoming: upcoming,
    on: on, user: function () { return st.user; }, loaded: function () { return st.loaded; },
    saved: function () { return st.saves.slice(); }, isSaved: isSaved, toggleSave: toggleSave, heart: heart, paintHearts: paintHearts,
    card: card, pass: pass, skeletons: skeletonCards, reveal: reveal, countdowns: mountCountdowns,
    message: message, book: book, inbox: openInbox, signIn: signIn, toast: toast, drawer: openDrawer, search: openSearch,
    art: art, tourArt: tourArt, cover: coverHTML, accent: accentOf, cat: catOf, CATS: CATS, reach: reachOf, code: codeOf, price: priceOf,
    popularity: function (id) { return st.pop[String(id)] || 0; },
    sb: sb, esc: esc, arr: arr, money: money, fmtDay: fmtDay, fmtTime: fmtTime, nboClock: nboClock, dur: dur, today: nboToday,
    icon: ICON, thrifty: thrifty, reduced: reduced, hash: hash, _fallback: fallback
  };
  global.CabanaTours = api;

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})(window);
