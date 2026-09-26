/* ═══════════════════════════════════════════════════════════════════
   CABANA · OPERATIONS CONSOLE · core
   ───────────────────────────────────────────────────────────────────
   The frame every view runs inside: sign-in gate, router, sidebar with
   live queue badges, command palette, drawers, modals, toasts, charts,
   formatting, and the thin data layer over the admin_* RPCs.

   Security model: every privileged read and write is a SECURITY DEFINER
   function that re-checks the caller against the admin roster in the
   database. This file is presentation. Hiding a button is never the
   control; the database is.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var doc = global.document;
  var SUPA_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
  var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';
  var TZ = 'Africa/Nairobi';
  var REDUCED = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 1 · DOM + SAFE HTML ─────────────────────────────────────────── */
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return ESC[c]; }); }
  function Safe(s) { this.s = s; }
  Safe.prototype.toString = function () { return this.s; };
  function raw(s) { return new Safe(s == null ? '' : String(s)); }
  function part(v) {
    if (v == null || typeof v === 'boolean') return '';
    if (v instanceof Safe) return v.s;
    if (Array.isArray(v)) return v.map(part).join('');
    return esc(v);
  }
  /* html`<b>${untrusted}</b>` escapes every interpolation unless it is
     already Safe. Arrays are joined. false/null render nothing. */
  function html(strings) {
    var out = strings[0];
    for (var i = 1; i < arguments.length; i++) out += part(arguments[i]) + strings[i];
    return new Safe(out);
  }
  function set(el, content) { if (el) el.innerHTML = part(content); return el; }
  function safeUrl(u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (/^(https?:)?\/\//i.test(u) || u.charAt(0) === '/' || /^data:image\//i.test(u) || /^blob:/i.test(u)) return u;
    return '';
  }
  function uid() { return Math.random().toString(36).slice(2, 10); }
  function debounce(fn, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); }; }
  function store(k, v) {
    try { if (arguments.length > 1) { localStorage.setItem('cx-' + k, JSON.stringify(v)); return v; }
          var r = localStorage.getItem('cx-' + k); return r == null ? undefined : JSON.parse(r); }
    catch (e) { return undefined; }
  }

  /* ── 2 · ICONS ───────────────────────────────────────────────────── */
  var I = {
    home: '<path d="m3 10.2 9-7.2 9 7.2V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1z"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>',
    building: '<path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M9.5 21v-5h5v5"/><path d="M9 10.5h.01M15 10.5h.01"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    shieldCheck: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>',
    plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
    map: '<path d="M14.1 4.5 9.9 2.9a2 2 0 0 0-1.4 0L3.6 4.8A1 1 0 0 0 3 5.7v13.8a1 1 0 0 0 1.4.9l4.1-1.6a2 2 0 0 1 1.4 0l4.2 1.6a2 2 0 0 0 1.4 0l4.9-1.9a1 1 0 0 0 .6-.9V3.8a1 1 0 0 0-1.4-.9l-4.1 1.6a2 2 0 0 1-1.4 0z"/><path d="M15 5.8v15M9 3.2v15"/>',
    ticket: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><path d="M13 5v2M13 17v2M13 11v2"/>',
    car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
    tag: '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    sparkles: '<path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/><path d="M19 2.5v4M21 4.5h-4M5 17v3.5M6.75 18.75h-3.5"/>',
    idcard: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.6-1.2 1.7-2 3-2s2.4.8 3 2M14.5 10h4M14.5 13h3"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 13.2 17 22l-5-3-5 3 1.5-8.8"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    send: '<path d="M14.5 21.7a.5.5 0 0 0 .9 0L22 2.6a.5.5 0 0 0-.6-.6L2.3 8.6a.5.5 0 0 0 0 .9l7.9 3.2a2 2 0 0 1 1.1 1.1z"/><path d="M21.9 2.1 10.9 13.1"/>',
    chart: '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
    activity: '<path d="M22 12h-2.5a2 2 0 0 0-1.9 1.5l-2.4 8.4a.25.25 0 0 1-.5 0L9.2 2.1a.25.25 0 0 0-.5 0l-2.3 8.4A2 2 0 0 1 4.5 12H2"/>',
    scroll: '<path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M15 8h-5M15 12h-5"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
    settings: '<path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.5a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
    external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    eye: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
    chevR: '<path d="m9 18 6-6-6-6"/>', chevL: '<path d="m15 18-6-6 6-6"/>', chevD: '<path d="m6 9 6 6 6-6"/>',
    arrowL: '<path d="M19 12H5M12 19l-7-7 7-7"/>', arrowR: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    plus: '<path d="M5 12h14M12 5v14"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    sidebar: '<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M9 3v18"/>',
    lifebuoy: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><path d="m4.93 4.93 4.24 4.24M14.83 9.17l4.24-4.24M14.83 14.83l4.24 4.24M9.17 14.83l-4.24 4.24"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
    video: '<path d="m16 13 5.2 3.5a.5.5 0 0 0 .8-.4V7.9a.5.5 0 0 0-.8-.4L16 11"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
    trendUp: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    trendDown: '<path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/>',
    cmd: '<path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/>',
    star: '<path d="M11.5 2.3a.5.5 0 0 1 .9 0l2.3 4.7a2 2 0 0 0 1.5 1.1l5.2.8a.5.5 0 0 1 .3.9l-3.8 3.7a2 2 0 0 0-.6 1.8l.9 5.2a.5.5 0 0 1-.8.6l-4.6-2.5a2 2 0 0 0-1.9 0L6.3 21a.5.5 0 0 1-.8-.6l.9-5.2a2 2 0 0 0-.6-1.8L2 9.7a.5.5 0 0 1 .3-.9l5.2-.8a2 2 0 0 0 1.5-1.1z"/>',
    trash: '<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    edit: '<path d="M12 20h9"/><path d="M16.4 3.6a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/>',
    copy: '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
    play: '<path d="m6 3 14 9-14 9z"/>',
    ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
    undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
    coins: '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4M16.71 13.88l.7.71-2.82 2.82"/>',
    receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 17.5v-11"/>',
    message: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/>',
    siren: '<path d="M7 18v-6a5 5 0 1 1 10 0v6"/><path d="M5 21a1 1 0 0 1-1-1v-1a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1z"/><path d="M21 12h1M18.5 4.5 18 5M2 12h1M12 2v1M4.93 4.93l.71.71"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    phoneDevice: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M12 18h.01"/>',
    tablet: '<rect x="4" y="2" width="16" height="20" rx="2.5"/><path d="M12 18h.01"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2.5"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    cube: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
    swap: '<path d="m16 3 4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>',
    zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    layers: '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65M22 12.65l-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    pin: '<path d="M20 10c0 5-5.5 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.5 20.2 4 15 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    store: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/>',
    bed: '<path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>',
    route: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4"/>',
    enter: '<path d="M20 4v7a4 4 0 0 1-4 4H4"/><path d="m9 10-5 5 5 5"/>',
    sort: '<path d="m21 16-4 4-4-4M17 20V4M3 8l4-4 4 4M7 4v16"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2.5"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    note: '<path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M15 3v6h6"/>',
    google: '<path d="M21.35 11.1H12v2.9h5.35c-.23 1.4-1.66 4.1-5.35 4.1a6.1 6.1 0 1 1 0-12.2c1.9 0 3.2.8 3.9 1.5l2.66-2.56A9.3 9.3 0 0 0 12 2.3a9.7 9.7 0 1 0 0 19.4c5.6 0 9.3-3.94 9.3-9.48 0-.64-.07-1.12-.15-1.62z" fill="currentColor" stroke="none"/>'
  };
  function icon(name, cls) {
    return new Safe('<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (I[name] || I.info) + '</svg>');
  }

  /* ── 3 · FORMAT ──────────────────────────────────────────────────── */
  var NF0 = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 });
  var NF1 = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 1 });
  function n(v) { var x = Number(v); return isFinite(x) ? x : 0; }
  function num(v) { return NF0.format(n(v)); }
  function compact(v) {
    var x = n(v), a = Math.abs(x);
    if (a >= 1e9) return NF1.format(x / 1e9) + 'B';
    if (a >= 1e6) return NF1.format(x / 1e6) + 'M';
    if (a >= 1e5) return NF0.format(x / 1e3) + 'k';
    if (a >= 1e3) return NF1.format(x / 1e3) + 'k';
    return NF0.format(x);
  }
  function money(v, cur) { return (cur || 'KES') + ' ' + NF0.format(Math.round(n(v))); }
  function moneyC(v, cur) { return (cur || 'KES') + ' ' + compact(v); }
  function pct(v) { return NF1.format(n(v)) + '%'; }
  function ratio(a, b) { return n(b) ? (n(a) / n(b)) * 100 : 0; }
  function toDate(v) { if (!v) return null; var d = v instanceof Date ? v : new Date(v); return isNaN(d) ? null : d; }
  var DTF = {
    date: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }),
    short: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: TZ }),
    dt: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ }),
    dtY: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ }),
    wd: new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ }),
    hour: new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: TZ })
  };
  function fdate(v) { var d = toDate(v); return d ? DTF.date.format(d) : '—'; }
  function fshort(v) { var d = toDate(v); return d ? DTF.short.format(d) : '—'; }
  function fdt(v) { var d = toDate(v); if (!d) return '—'; return (d.getFullYear() === new Date().getFullYear() ? DTF.dt : DTF.dtY).format(d); }
  function ago(v) {
    var d = toDate(v); if (!d) return '—';
    var s = (Date.now() - d.getTime()) / 1000, fut = s < 0; s = Math.abs(s);
    var out;
    if (s < 45) return fut ? 'in a moment' : 'just now';
    if (s < 3600) out = Math.round(s / 60) + 'm';
    else if (s < 86400) out = Math.round(s / 3600) + 'h';
    else if (s < 86400 * 7) out = Math.round(s / 86400) + 'd';
    else return fshort(d);
    return fut ? 'in ' + out : out + ' ago';
  }
  function dur(mins) { mins = n(mins); if (!mins) return '—'; if (mins < 60) return Math.round(mins) + ' min'; return NF1.format(mins / 60) + ' h'; }
  function bytes(b) { b = n(b); if (b < 1024) return b + ' B'; if (b < 1048576) return NF1.format(b / 1024) + ' KB'; if (b < 1073741824) return NF1.format(b / 1048576) + ' MB'; return NF1.format(b / 1073741824) + ' GB'; }
  function titleCase(s) { return String(s || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }); }
  function human(s) { s = String(s || '').replace(/[_-]+/g, ' ').trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
  function initials(name) {
    var p = String(name || '?').replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
    return ((p[0] || '?').charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '')).toUpperCase();
  }
  var AV = ['linear-gradient(135deg,#7A3BFF,#4C7DFF)', 'linear-gradient(135deg,#FF3E8C,#FF9A3D)', 'linear-gradient(135deg,#0EA5A4,#2DD4BF)',
            'linear-gradient(135deg,#F59E0B,#EF4444)', 'linear-gradient(135deg,#6366F1,#EC4899)', 'linear-gradient(135deg,#14B8A6,#6366F1)'];
  function avatar(name, cls) {
    var s = String(name || ''), h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return html`<span class="avatar ${cls || ''}" style="background:${raw(AV[Math.abs(h) % AV.length])}">${initials(name)}</span>`;
  }
  function delta(cur, prev) {
    cur = n(cur); prev = n(prev);
    if (!prev && !cur) return html`<span class="delta flat">—</span>`;
    if (!prev) return html`<span class="delta up">${icon('trendUp')} new</span>`;
    var d = ((cur - prev) / Math.abs(prev)) * 100;
    var c = d > 0.5 ? 'up' : d < -0.5 ? 'dn' : 'flat';
    return html`<span class="delta ${c}" title="vs previous period">${c === 'up' ? '↑' : c === 'dn' ? '↓' : '→'} ${NF0.format(Math.abs(d))}%</span>`;
  }

  /* ── 4 · SERVICE + STATUS VOCABULARY ─────────────────────────────── */
  var SERVICES = {
    stay: { label: 'Stay', icon: 'bed', color: 'var(--c1)' }, stays: { label: 'Stay', icon: 'bed', color: 'var(--c1)' },
    tour: { label: 'Tour', icon: 'map', color: 'var(--c2)' }, tours: { label: 'Tour', icon: 'map', color: 'var(--c2)' },
    event: { label: 'Event', icon: 'ticket', color: 'var(--c3)' }, events: { label: 'Event', icon: 'ticket', color: 'var(--c3)' },
    car: { label: 'Car hire', icon: 'car', color: 'var(--c4)' }, carhire: { label: 'Car hire', icon: 'car', color: 'var(--c4)' },
    food: { label: 'Food', icon: 'utensils', color: 'var(--c5)' },
    ride: { label: 'Ride', icon: 'route', color: 'var(--c6)' }, rides: { label: 'Ride', icon: 'route', color: 'var(--c6)' },
    flight: { label: 'Flight', icon: 'plane', color: 'var(--info)' }, flights: { label: 'Flight', icon: 'plane', color: 'var(--info)' },
    roommates: { label: 'Room', icon: 'users', color: 'var(--c2)' }, shopping: { label: 'Shopping', icon: 'store', color: 'var(--c3)' }
  };
  function svc(k) { return SERVICES[k] || { label: human(k || 'Other'), icon: 'layers', color: 'var(--ink-4)' }; }
  var STAGE = {
    open: ['Open', 'p-warn'], secured: ['Secured', 'p-ok'], fulfilled: ['Fulfilled', 'p-brand'],
    lost: ['Lost', 'p-mute'], moved: ['Moved', 'p-info']
  };
  function stagePill(s) { var x = STAGE[s] || [human(s || 'unknown'), 'p-mute']; return html`<span class="pill dot ${x[1]}">${x[0]}</span>`; }
  var TONE = {
    active: 'p-ok', live: 'p-ok', published: 'p-ok', paid: 'p-ok', verified: 'p-ok', approved: 'p-ok', completed: 'p-ok', resolved: 'p-ok', sent: 'p-ok', succeeded: 'p-ok', confirmed: 'p-ok', booked: 'p-ok', accepted: 'p-ok', ok: 'p-ok',
    pending: 'p-warn', review: 'p-warn', submitted: 'p-warn', open: 'p-warn', paused: 'p-warn', escalated: 'p-bad', awaiting_payment: 'p-warn', requested: 'p-warn', pending_owner: 'p-info', draft: 'p-mute', new: 'p-info', working: 'p-info', acknowledged: 'p-info', contacted: 'p-info', scheduled: 'p-brand',
    failed: 'p-bad', rejected: 'p-bad', banned: 'p-bad', suspended: 'p-bad', cancelled: 'p-mute', expired: 'p-mute', deleted: 'p-bad', removed: 'p-bad', declined: 'p-bad', hidden: 'p-mute', dismissed: 'p-mute', revoked: 'p-bad', false_alarm: 'p-mute', unverified: 'p-mute', inactive: 'p-mute', archived: 'p-mute', refunded: 'p-info'
  };
  function pill(s, tone, dot) { return html`<span class="pill ${dot === false ? '' : 'dot'} ${tone || TONE[String(s || '').toLowerCase()] || 'p-mute'}">${human(s || '—')}</span>`; }

  /* ── 5 · DATA ────────────────────────────────────────────────────── */
  var sb = null;
  var ERR = {
    admin_required: 'Your account is not on the operator roster.',
    reason_required: 'Add a reason — it goes on the audit record.',
    note_required: 'Write the note first.',
    paid_booking_needs_refund_amount: 'Money was paid on this booking. Say how much goes back (0 if forfeited).',
    already_closed: 'This booking is already closed.',
    nothing_to_refund: 'There is nothing owed on this booking.',
    refund_not_supported_here: 'Refunds for this service are settled on its own desk.',
    cancel_not_supported_here: 'Cancel this one from its own desk.',
    credit_supported_for_stays_only: 'Credit conversion is only available for stays.',
    withdrawal_not_pending: 'That withdrawal was already settled.',
    cannot_ban_an_operator: 'Operators cannot be banned from here. Remove them from the team first.',
    delete_before_purge: 'Delete the listing first; purge is only offered for deleted rows.',
    new_owner_not_found: 'No member with that ID exists.',
    same_owner: 'That member already owns this listing.',
    super_admin_required: 'Only a super admin can change the team.',
    cannot_demote_yourself: 'You cannot demote yourself.',
    cannot_remove_yourself: 'You cannot remove yourself.',
    last_super_admin: 'There must always be at least one super admin.',
    invalid_email: 'That is not a valid email address.',
    invalid_points: 'Enter a non-zero number of points.',
    could_not_revoke_sessions: 'Sessions could not be revoked.',
    unknown_action: 'That action is not available here.',
    listing_not_found: 'That listing no longer exists.',
    booking_not_found: 'That booking no longer exists.',
    person_not_found: 'That member no longer exists.'
  };
  function friendly(e) {
    var m = (e && (e.message || e.error_description || e.error)) || String(e || 'Something went wrong');
    var key = Object.keys(ERR).filter(function (k) { return m.indexOf(k) > -1; })[0];
    if (key) return ERR[key];
    if (/JWT|jwt expired|invalid claim/i.test(m)) return 'Your session expired. Sign in again.';
    if (/Failed to fetch|NetworkError|network/i.test(m)) return 'Network hiccup — check the connection and try again.';
    return m.replace(/^(ERROR:\s*)/, '');
  }
  /* The data layer. Stress testing against the live database showed the
     console could take the database down on its own: rapid navigation
     fired every view's reads in parallel and queued them behind each
     other until they hit the statement timeout. So reads now:
       · share one in-flight request per (function, arguments)
       · are served from a short cache (any write clears it)
       · run at most MAX_LIVE at a time, newest view first
       · retry once on a timeout or a dropped connection
     Writes are never cached, deduplicated or retried. */
  var WRITE_RX = /(_action|_set|_remove|_log|_send|_save|_upsert|_delete)$/;
  var READ_TTL = 12000, MAX_LIVE = 4, live = 0, waiting = [], inflight = {}, cache = {};
  function clean(v) {
    if (typeof v === 'string') return v.replace(/\u0000/g, '');
    if (Array.isArray(v)) return v.map(clean);
    if (v && typeof v === 'object' && !(v instanceof Date)) { var o = {}; Object.keys(v).forEach(function (k) { o[k] = clean(v[k]); }); return o; }
    return v;
  }
  function slot(run) {
    return new Promise(function (resolve, reject) {
      function start() { live++; run().then(resolve, reject).then(done, done); }
      function done() { live--; var nx = waiting.pop(); if (nx) nx(); }
      if (live < MAX_LIVE) start(); else waiting.push(start);
    });
  }
  function transient(err) { return /statement timeout|Failed to fetch|NetworkError|network|timed out|503|502|504|ECONNRESET/i.test((err && (err.message || err.code)) || ''); }
  function callRpc(fn, args) {
    return sb.rpc(fn, args).then(function (r) {
      if (r.error) { var e = new Error(friendly(r.error)); e.raw = r.error; throw e; }
      return r.data;
    });
  }
  function freshen() { cache = {}; }
  function rpc(fn, args, opts) {
    if (!sb) return Promise.reject(new Error('Not connected'));
    args = clean(args || {}); opts = opts || {};
    if (WRITE_RX.test(fn)) return callRpc(fn, args).then(function (d) { freshen(); return d; });
    var key = fn + ':' + JSON.stringify(args), hit = cache[key];
    if (!opts.fresh && hit && Date.now() - hit.at < (opts.ttl || READ_TTL)) return Promise.resolve(hit.data);
    if (inflight[key]) return inflight[key];
    var p = slot(function () {
      return callRpc(fn, args).catch(function (e) {
        if (!transient(e)) throw e;
        return new Promise(function (r) { setTimeout(r, 500 + Math.random() * 700); }).then(function () { return callRpc(fn, args); });
      });
    }).then(function (d) { cache[key] = { at: Date.now(), data: d }; delete inflight[key]; return d; },
            function (e) { delete inflight[key]; throw e; });
    inflight[key] = p;
    return p;
  }
  function q(table) {
    var b = sb.from(table);
    ['insert', 'update', 'upsert', 'delete'].forEach(function (m) {
      var orig = b[m]; if (typeof orig !== 'function') return;
      b[m] = function () { freshen(); return orig.apply(b, arguments); };
    });
    return b;
  }
  function rows(p) { return Promise.resolve(p).then(function (r) { if (r.error) throw new Error(friendly(r.error)); return r.data || []; }); }
  function token() { return sb.auth.getSession().then(function (r) { return (r && r.data && r.data.session && r.data.session.access_token) || ''; }); }
  function api(path, opts) {
    opts = opts || {};
    return token().then(function (t) {
      return fetch(path, {
        method: opts.method || (opts.body ? 'POST' : 'GET'),
        headers: Object.assign({ Authorization: 'Bearer ' + t }, opts.body ? { 'Content-Type': 'application/json' } : {}),
        body: opts.body ? JSON.stringify(opts.body) : undefined
      });
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(friendly(j.error || ('Request failed (' + r.status + ')')));
        return j;
      });
    });
  }
  function log(action, type, id, meta) { return rpc('admin_log', { p_action: action, p_target_type: type, p_target_id: id == null ? null : String(id), p_meta: meta || {} }).catch(function () {}); }

  /* ── 6 · TOASTS ──────────────────────────────────────────────────── */
  var TOAST_IC = { ok: 'check', bad: 'alert', warn: 'alert', info: 'info' };
  function toast(msg, kind, opts) {
    opts = opts || {};
    kind = ({ ok: 'ok', good: 'ok', bad: 'bad', error: 'bad', warn: 'warn', gold: 'info', calm: 'info' })[kind] || 'info';
    var box = $('#toasts'); if (!box) return;
    var ms = opts.ms || (kind === 'bad' ? 6500 : 3800);
    var t = doc.createElement('div');
    t.className = 'toast ' + kind;
    t.setAttribute('role', kind === 'bad' ? 'alert' : 'status');
    set(t, html`<span class="t-ic">${icon(TOAST_IC[kind])}</span><div class="t-b">${msg}</div>
      ${opts.action ? html`<button class="t-a" type="button">${opts.action.label}</button>` : ''}
      <button class="t-x" type="button" aria-label="Dismiss">${icon('x')}</button><i class="t-p" style="animation-duration:${ms}ms"></i>`);
    var gone = false;
    function close() { if (gone) return; gone = true; t.classList.add('out'); setTimeout(function () { t.remove(); }, 300); }
    t.querySelector('.t-x').onclick = close;
    if (opts.action) t.querySelector('.t-a').onclick = function () { close(); opts.action.fn(); };
    box.appendChild(t);
    var timer = setTimeout(close, ms);
    t.addEventListener('mouseenter', function () { clearTimeout(timer); var p = t.querySelector('.t-p'); if (p) p.style.animationPlayState = 'paused'; });
    t.addEventListener('mouseleave', function () { timer = setTimeout(close, 1800); });
    while (box.children.length > 4) box.firstChild.remove();
    return close;
  }

  /* ── 7 · MODALS ──────────────────────────────────────────────────── */
  var modalDepth = 0;
  function modal(o) {
    return new Promise(function (resolve) {
      var wrap = doc.createElement('div'), scrim = doc.createElement('div');
      wrap.className = 'modal-wrap'; scrim.className = 'scrim'; scrim.style.zIndex = 89 + modalDepth * 2;
      wrap.style.zIndex = 90 + modalDepth * 2;
      modalDepth++;
      var id = 'md-' + uid();
      set(wrap, html`<div class="modal ${o.wide ? (o.wide === 'x' ? 'xwide' : 'wide') : ''}" role="dialog" aria-modal="true" aria-labelledby="${id}">
        <div class="md-hd">${o.icon ? html`<span class="md-ic ${o.tone || ''}">${icon(o.icon)}</span>` : ''}
          <div class="grow"><div class="md-t" id="${id}">${o.title}</div>${o.sub ? html`<div class="md-s">${o.sub}</div>` : ''}</div>
          <button class="icon-btn" data-x aria-label="Close" style="margin:-6px -8px 0 0">${icon('x')}</button></div>
        <div class="md-body">${o.body || ''}</div>
        <div class="md-ft">${(o.actions || []).map(function (a, i) {
          return html`<button class="btn ${a.kind || 'btn-g'}" data-a="${i}" type="button">${a.icon ? icon(a.icon) : ''}${a.label}</button>`; })}</div>
      </div>`);
      doc.body.appendChild(scrim); doc.body.appendChild(wrap);
      var prevFocus = doc.activeElement, done = false;
      function close(v) {
        if (done) return; done = true; modalDepth--;
        wrap.classList.remove('on'); scrim.classList.remove('on');
        doc.removeEventListener('keydown', onKey, true);
        setTimeout(function () { wrap.remove(); scrim.remove(); }, 260);
        if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch (e) {}
        resolve(v);
      }
      function onKey(e) {
        if (e.key === 'Escape') { e.stopPropagation(); close(null); }
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { var p = wrap.querySelector('.btn-p,.btn-d,.btn-ok'); if (p) { e.preventDefault(); p.click(); } }
        if (e.key === 'Tab') {
          var f = $$('button,input,select,textarea,[tabindex]:not([tabindex="-1"])', wrap).filter(function (x) { return !x.disabled && x.offsetParent; });
          if (!f.length) return;
          if (e.shiftKey && doc.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
          else if (!e.shiftKey && doc.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
        }
      }
      doc.addEventListener('keydown', onKey, true);
      wrap.addEventListener('mousedown', function (e) { if (e.target === wrap) close(null); });
      wrap.querySelector('[data-x]').onclick = function () { close(null); };
      $$('[data-a]', wrap).forEach(function (b) {
        b.onclick = function () {
          var a = o.actions[+b.getAttribute('data-a')];
          if (!a.onClick) return close(a.value);
          var r = a.onClick(wrap, b);
          if (r && r.then) { b.classList.add('busy'); r.then(function (v) { b.classList.remove('busy'); if (v !== false) close(v === undefined ? a.value : v); }, function (e) { b.classList.remove('busy'); toast(friendly(e), 'bad'); }); }
          else if (r !== false) close(r === undefined ? a.value : r);
        };
      });
      requestAnimationFrame(function () {
        wrap.classList.add('on'); scrim.classList.add('on');
        var f = wrap.querySelector('[autofocus],.md-body input,.md-body textarea,.md-body select') || wrap.querySelector('.md-ft .btn:last-child');
        if (f) setTimeout(function () { f.focus(); }, 60);
      });
      if (o.onOpen) o.onOpen(wrap);
    });
  }
  function fieldHTML(f) {
    var idf = 'f-' + f.name + '-' + uid();
    var v = f.value == null ? '' : f.value;
    var req = f.required ? raw(' required') : '';
    var ctrl;
    if (f.type === 'textarea') ctrl = html`<textarea class="inp" id="${idf}" name="${f.name}" rows="${f.rows || 4}" placeholder="${f.placeholder || ''}"${req}>${v}</textarea>`;
    else if (f.type === 'select') ctrl = html`<select class="inp" id="${idf}" name="${f.name}"${req}>${(f.options || []).map(function (o) {
      var ov = Array.isArray(o) ? o[0] : (o && o.value != null ? o.value : o), ol = Array.isArray(o) ? o[1] : (o && o.label != null ? o.label : o);
      return html`<option value="${ov}"${String(ov) === String(v) ? raw(' selected') : ''}>${ol}</option>`; })}</select>`;
    else if (f.type === 'switch') return html`<label class="check fld ${f.full ? 'full' : ''}"><input type="checkbox" name="${f.name}"${v ? raw(' checked') : ''}/><span>${f.label}${f.help ? html`<small>${f.help}</small>` : ''}</span></label>`;
    else if (f.type === 'html') return html`<div class="fld ${f.full ? 'full' : ''}">${f.html}</div>`;
    else if (f.type === 'chips') ctrl = html`<div class="chips" data-chips="${f.name}">${(f.options || []).map(function (o) {
      var on = (v || []).indexOf(o) > -1; return html`<span class="chip ${on ? 'on' : ''}" data-v="${o}" role="button" tabindex="0">${o}</span>`; })}</div>`;
    else ctrl = html`<input class="inp" id="${idf}" name="${f.name}" type="${f.type || 'text'}" value="${v}" placeholder="${f.placeholder || ''}"${f.min != null ? raw(' min="' + esc(f.min) + '"') : ''}${f.max != null ? raw(' max="' + esc(f.max) + '"') : ''}${f.step ? raw(' step="' + esc(f.step) + '"') : ''}${req}${f.autofocus ? raw(' autofocus') : ''} autocomplete="off"/>`;
    return html`<div class="fld ${f.full || f.type === 'textarea' ? 'full' : ''}"><label class="fld-l" for="${idf}">${f.label}${f.required ? '' : html`<span class="opt">${f.optional === false ? '' : 'optional'}</span>`}</label>${ctrl}${f.help ? html`<div class="fld-h">${f.help}</div>` : ''}</div>`;
  }
  function readForm(root, fields) {
    var out = {}, bad = null;
    fields.forEach(function (f) {
      if (f.type === 'html') return;
      if (f.type === 'chips') { out[f.name] = $$('[data-chips="' + f.name + '"] .chip.on', root).map(function (c) { return c.getAttribute('data-v'); }); return; }
      var el = root.querySelector('[name="' + f.name + '"]'); if (!el) return;
      var v = f.type === 'switch' ? el.checked : el.value.trim();
      if (f.type === 'number' && v !== '') v = Number(v);
      if (f.required && (v === '' || v == null)) { bad = bad || el; el.style.borderColor = 'var(--bad)'; }
      out[f.name] = v;
    });
    if (bad) { bad.focus(); return null; }
    return out;
  }
  function wireChips(root) {
    $$('[data-chips] .chip', root).forEach(function (c) {
      function t() { c.classList.toggle('on'); }
      c.onclick = t; c.onkeydown = function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); t(); } };
    });
  }
  /* form({ title, sub, icon, fields:[...], submit, onSubmit(values) }) → values | null */
  function form(o) {
    var fields = o.fields || [];
    return modal({
      title: o.title, sub: o.sub, icon: o.icon, tone: o.tone, wide: o.wide,
      body: html`<form class="${o.grid === false ? '' : 'form-grid'}" onsubmit="return false">${fields.map(fieldHTML)}</form>${o.foot || ''}`,
      actions: [{ label: o.cancel || 'Cancel', kind: 'btn-q', value: null },
        { label: o.submit || 'Save', kind: o.danger ? 'btn-d' : 'btn-p', icon: o.submitIcon, onClick: function (wrap) {
          var v = readForm(wrap, fields); if (!v) return false;
          if (o.onSubmit) return Promise.resolve(o.onSubmit(v, wrap)).then(function (r) { return r === false ? false : (r === undefined ? v : r); });
          return v;
        } }],
      onOpen: function (wrap) {
        wireChips(wrap);
        $$('input', wrap).forEach(function (i) { i.addEventListener('keydown', function (e) { if (e.key === 'Enter' && i.type !== 'textarea') { e.preventDefault(); var p = wrap.querySelector('.md-ft .btn-p,.md-ft .btn-d'); if (p) p.click(); } }); });
        if (o.onOpen) o.onOpen(wrap);
      }
    });
  }
  /* confirm({ title, body, confirm, tone, reason:{label,required,placeholder}, amount:{...} }) */
  function confirm(o) {
    var fields = [];
    if (o.amount) fields.push(Object.assign({ name: 'amount', type: 'number', label: 'Amount', full: true, min: 0, optional: false }, o.amount));
    if (o.reason) fields.push(Object.assign({ name: 'reason', type: 'textarea', label: 'Reason', rows: 3 }, o.reason, { required: !!o.reason.required }));
    (o.fields || []).forEach(function (f) { fields.push(f); });
    var tone = o.tone || 'brand';
    return modal({
      title: o.title, sub: o.body, icon: o.icon || (tone === 'danger' ? 'alert' : tone === 'ok' ? 'check' : tone === 'warn' ? 'alert' : 'info'),
      tone: tone === 'danger' ? 'bad' : tone === 'brand' ? '' : tone,
      body: fields.length ? html`<form class="form-grid" onsubmit="return false">${fields.map(fieldHTML)}</form>` : '',
      actions: [{ label: o.cancel || 'Cancel', kind: 'btn-q', value: null },
        { label: o.confirm || 'Confirm', kind: tone === 'danger' ? 'btn-d' : tone === 'ok' ? 'btn-ok' : 'btn-p', onClick: function (wrap) {
          var v = fields.length ? readForm(wrap, fields) : {}; if (!v) return false;
          if (o.onConfirm) return Promise.resolve(o.onConfirm(v)).then(function (r) { return r === false ? false : v; });
          return v;
        } }],
      onOpen: wireChips
    });
  }

  /* ── 8 · DRAWER ──────────────────────────────────────────────────── */
  var drawerStack = [];
  var drawerEl, drawerScrim;
  function drawerEnsure() {
    if (drawerEl) return;
    drawerScrim = doc.createElement('div'); drawerScrim.className = 'scrim';
    drawerEl = doc.createElement('aside'); drawerEl.className = 'drawer'; drawerEl.setAttribute('role', 'dialog'); drawerEl.setAttribute('aria-modal', 'true'); drawerEl.tabIndex = -1;
    doc.body.appendChild(drawerScrim); doc.body.appendChild(drawerEl);
    drawerScrim.addEventListener('click', function () { drawer.close(); });
  }
  /* drawer.open({ key, kicker, title, sub, wide, load: async (d) => {...} })
     d.body / d.foot / d.set(title, sub) / d.alive() / d.reload() */
  var drawer = {
    open: function (o) {
      drawerEnsure();
      var top = drawerStack[drawerStack.length - 1];
      if (top && top.key && top.key === o.key) { drawerStack[drawerStack.length - 1] = o; }
      else if (o.replace && top) drawerStack[drawerStack.length - 1] = o;
      else drawerStack.push(o);
      drawer._paint();
      return drawer;
    },
    _paint: function () {
      var o = drawerStack[drawerStack.length - 1]; if (!o) return;
      o._gen = (o._gen || 0) + 1; var gen = o._gen;
      drawerEl.className = 'drawer' + (o.wide ? ' wide' : '');
      set(drawerEl, html`<div class="dr-hd">
          ${drawerStack.length > 1 ? html`<button class="icon-btn" data-back aria-label="Back" style="margin:-4px 0 0 -8px">${icon('arrowL')}</button>` : ''}
          <div class="grow"><div class="dr-k">${o.kicker || ''}</div><div class="dr-t">${o.title || ''}</div><div class="dr-s">${o.sub || ''}</div></div>
          <div class="row gap-s" data-hd-act></div>
          <button class="icon-btn" data-close aria-label="Close (Esc)" title="Close (Esc)" style="margin:-4px -8px 0 0">${icon('x')}</button></div>
        <div class="dr-body"><div class="skel-card"><span class="skel h-xl"></span><span class="skel w-70"></span><span class="skel w-50"></span><span class="skel"></span><span class="skel w-30"></span></div></div>
        <div class="dr-ft hide"></div>`);
      drawerEl.querySelector('[data-close]').onclick = function () { drawer.close(true); };
      var back = drawerEl.querySelector('[data-back]'); if (back) back.onclick = function () { drawer.back(); };
      requestAnimationFrame(function () { drawerEl.classList.add('on'); drawerScrim.classList.add('on'); drawerEl.focus({ preventScroll: true }); });
      var d = {
        el: drawerEl, body: $('.dr-body', drawerEl), foot: $('.dr-ft', drawerEl), hdAct: $('[data-hd-act]', drawerEl),
        alive: function () { return drawerStack[drawerStack.length - 1] === o && o._gen === gen && drawerEl.classList.contains('on'); },
        set: function (t, s, k) {
          if (t != null) { o.title = t; set($('.dr-t', drawerEl), t); }
          if (s != null) { o.sub = s; set($('.dr-s', drawerEl), s); }
          if (k != null) { o.kicker = k; set($('.dr-k', drawerEl), k); }
        },
        actions: function (content) { set(d.foot, content); d.foot.classList.toggle('hide', !String(part(content)).trim()); },
        reload: function () { drawer._paint(); },
        close: function () { drawer.close(true); }
      };
      o._d = d;
      Promise.resolve().then(function () { return o.load(d); }).catch(function (e) {
        if (!d.alive()) return;
        set(d.body, errorBox(e, function () { drawer._paint(); }));
        wireRetry(d.body, function () { drawer._paint(); });
      });
    },
    back: function () { if (drawerStack.length > 1) { drawerStack.pop(); drawer._paint(); } else drawer.close(true); },
    close: function (user) {
      if (!drawerEl || !drawerStack.length) return;
      var closing = drawerStack.slice();
      drawerStack = [];
      drawerEl.classList.remove('on'); drawerScrim.classList.remove('on');
      closing.forEach(function (o) { if (o.onClose) try { o.onClose(user); } catch (e) {} });
    },
    isOpen: function () { return drawerStack.length > 0; },
    current: function () { return drawerStack[drawerStack.length - 1]; },
    reloadIfOpen: function (key) { var t = drawerStack[drawerStack.length - 1]; if (t && (!key || t.key === key)) drawer._paint(); }
  };

  /* ── 9 · SMALL COMPONENTS ────────────────────────────────────────── */
  function empty(title, sub, ic, ok) {
    return html`<div class="empty"><div class="empty-ic ${ok ? 'ok' : ''}">${icon(ic || (ok ? 'checkCircle' : 'inbox'))}</div><div class="empty-t">${title}</div>${sub ? html`<div class="empty-s">${sub}</div>` : ''}</div>`;
  }
  function errorBox(e, retry) {
    return html`<div class="err-box"><div class="empty-ic" style="background:var(--bad-soft);color:var(--bad);border-color:transparent">${icon('alert')}</div>
      <div class="empty-t">Could not load this</div><div class="empty-s">${friendly(e)}</div>${retry ? html`<button class="btn btn-sm" data-retry>${icon('refresh')}Try again</button>` : ''}</div>`;
  }
  function wireRetry(el, fn) { var b = el && el.querySelector('[data-retry]'); if (b) b.onclick = fn; }
  function skeleton(kind) {
    if (kind === 'kpis') return html`<div class="grid g4">${[0, 1, 2, 3].map(function () { return html`<div class="card kpi"><span class="skel w-50"></span><span class="skel h-l w-70" style="margin-top:14px"></span><span class="skel w-30" style="margin-top:12px"></span></div>`; })}</div>`;
    if (kind === 'cards') return html`<div class="lcards">${[0, 1, 2, 3, 4, 5].map(function () { return html`<div class="lcard"><span class="skel" style="height:auto;aspect-ratio:16/10;border-radius:0"></span><div class="lcard-b"><span class="skel w-70"></span><span class="skel w-50"></span></div></div>`; })}</div>`;
    return html`<div class="card flush">${[0, 1, 2, 3, 4, 5, 6].map(function (i) { return html`<div style="display:flex;gap:14px;align-items:center;padding:14px 20px;border-bottom:1px solid var(--line)"><span class="skel" style="width:36px;height:36px;border-radius:10px;flex:none"></span><div style="flex:1;display:flex;flex-direction:column;gap:7px"><span class="skel w-${[50, 70, 30][i % 3]}"></span><span class="skel w-30" style="height:9px"></span></div><span class="skel" style="width:70px"></span></div>`; })}</div>`;
  }
  function tabs(items, active, attr) {
    attr = attr || 'data-tab';
    return html`<div class="tabs" role="tablist">${items.map(function (t) {
      var k = t[0], label = t[1], cnt = t[2], hot = t[3];
      return html`<button class="tab ${k === active ? 'on' : ''}" role="tab" aria-selected="${k === active}" ${raw(attr)}="${k}">${label}${cnt != null && cnt !== '' ? html`<span class="tab-n ${hot && cnt ? 'hot' : ''}">${num(cnt)}</span>` : ''}</button>`; })}</div>`;
  }
  function seg(items, active, attr) {
    attr = attr || 'data-seg';
    return html`<div class="seg" role="group">${items.map(function (t) { return html`<button type="button" class="${String(t[0]) === String(active) ? 'on' : ''}" ${raw(attr)}="${t[0]}">${t[2] ? icon(t[2]) : ''}${t[1]}</button>`; })}</div>`;
  }
  function kv(pairs) { return html`${pairs.filter(Boolean).map(function (p) { return html`<div class="kv"><span>${p[0]}</span><span>${p[1] == null || p[1] === '' ? '—' : p[1]}</span></div>`; })}`; }
  function busy(btn, fn) {
    if (!btn || btn.classList.contains('busy')) return Promise.resolve();
    btn.classList.add('busy');
    return Promise.resolve().then(fn).then(function (v) { btn.classList.remove('busy'); return v; }, function (e) { btn.classList.remove('busy'); toast(friendly(e), 'bad'); throw e; });
  }
  function copy(text, label) {
    var done = function () { toast((label || 'Copied') + ' to clipboard', 'ok', { ms: 2200 }); };
    if (navigator.clipboard) return navigator.clipboard.writeText(String(text)).then(done, function () { fallbackCopy(text); done(); });
    fallbackCopy(text); done();
  }
  function fallbackCopy(text) { var t = doc.createElement('textarea'); t.value = text; doc.body.appendChild(t); t.select(); try { doc.execCommand('copy'); } catch (e) {} t.remove(); }
  function csv(list, cols, filename) {
    if (!list || !list.length) { toast('Nothing to export', 'warn'); return; }
    cols = cols || Object.keys(list[0]);
    var head = cols.map(function (c) { return Array.isArray(c) ? c[1] : c; });
    var lines = [head.join(',')].concat(list.map(function (r) {
      return cols.map(function (c) {
        var v = Array.isArray(c) ? (typeof c[0] === 'function' ? c[0](r) : r[c[0]]) : r[c];
        if (v != null && typeof v === 'object') v = JSON.stringify(v);
        v = v == null ? '' : String(v);
        if (/^[=+\-@]/.test(v)) v = "'" + v;   // spreadsheet formula injection
        return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
      }).join(',');
    }));
    var blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    var a = doc.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename || 'cabana-export.csv';
    doc.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
    toast('Exported ' + num(list.length) + ' rows', 'ok');
  }
  function countUp(root) {
    $$('[data-count]', root || doc).forEach(function (el) {
      var to = Number(el.getAttribute('data-count')), f = el.getAttribute('data-fmt') || 'num', cur = el.getAttribute('data-cur');
      var fmt = function (v) { return f === 'money' ? money(v, cur) : f === 'moneyC' ? moneyC(v, cur) : f === 'compact' ? compact(v) : f === 'pct' ? NF1.format(v) + '%' : num(v); };
      if (REDUCED || !isFinite(to) || to === 0) { el.textContent = fmt(to || 0); return; }
      var t0 = null, D = 900;
      function step(ts) { if (!t0) t0 = ts; var p = Math.min(1, (ts - t0) / D), e = 1 - Math.pow(1 - p, 4); el.textContent = fmt(to * e); if (p < 1) requestAnimationFrame(step); else el.textContent = fmt(to); }
      requestAnimationFrame(step);
    });
  }
  function menu(anchor, items) {
    closeMenus();
    var m = doc.createElement('div'); m.className = 'menu'; m.setAttribute('role', 'menu');
    set(m, html`${items.map(function (it, i) {
      if (it === '-') return html`<div class="sep"></div>`;
      return html`<button type="button" role="menuitem" data-i="${i}" class="${it.danger ? 'danger' : ''}">${it.icon ? icon(it.icon) : ''}${it.label}</button>`; })}`);
    doc.body.appendChild(m);
    var r = anchor.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
    var left = Math.min(global.innerWidth - mw - 8, Math.max(8, r.right - mw));
    var top = r.bottom + 6; if (top + mh > global.innerHeight - 8) top = Math.max(8, r.top - mh - 6);
    m.style.left = left + 'px'; m.style.top = top + 'px';
    $$('[data-i]', m).forEach(function (b) { b.onclick = function () { closeMenus(); items[+b.getAttribute('data-i')].fn(); }; });
    setTimeout(function () { doc.addEventListener('mousedown', outside, true); }, 0);
    function outside(e) { if (!m.contains(e.target)) closeMenus(); }
    m._off = function () { doc.removeEventListener('mousedown', outside, true); };
    return m;
  }
  function closeMenus() { $$('.menu').forEach(function (m) { if (m._off) m._off(); m.remove(); }); }

  /* ── 10 · CHARTS ─────────────────────────────────────────────────── */
  function niceMax(v) {
    if (v <= 0) return 1;
    var e = Math.pow(10, Math.floor(Math.log10(v))), m = v / e;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * e;
  }
  function smooth(pts, lo, hi) {
    var clamp = function (v) { return lo == null ? v : Math.max(lo, Math.min(hi, v)); };
    if (pts.length < 2) return pts.length ? 'M' + pts[0][0] + ',' + pts[0][1] : '';
    var d = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2, t = 0.18;
      var c1x = p1[0] + (p2[0] - p0[0]) * t, c1y = clamp(p1[1] + (p2[1] - p0[1]) * t);
      var c2x = p2[0] - (p3[0] - p1[0]) * t, c2y = clamp(p2[1] - (p3[1] - p1[1]) * t);
      d += ' C' + c1x.toFixed(1) + ',' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ',' + c2y.toFixed(1) + ' ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1);
    }
    return d;
  }
  function sparkline(values, color) {
    values = (values || []).map(n);
    var W = 92, H = 30, max = Math.max.apply(null, values.concat([1])), min = Math.min.apply(null, values.concat([0]));
    if (values.length < 2) return raw('');
    var pts = values.map(function (v, i) { return [i * (W / (values.length - 1)), H - 3 - ((v - min) / ((max - min) || 1)) * (H - 6)]; });
    var gid = 'sg' + uid(), c = color || 'var(--brand)';
    var line = smooth(pts, 1, H - 1);
    return raw('<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c + '" stop-opacity=".32"/><stop offset="1" stop-color="' + c + '" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="' + line + ' L' + W + ',' + H + ' L0,' + H + ' Z" fill="url(#' + gid + ')"/><path d="' + line + '" fill="none" stroke="' + c + '" stroke-width="1.8" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>');
  }
  /* lineChart(el, { labels:[...], series:[{name,color,values,fill}], fmt, height, bars }) */
  function lineChart(el, o) {
    if (!el) return;
    var H = o.height || 240, PAD = { t: 12, r: 12, b: 26, l: 46 };
    function draw() {
      var W = Math.max(280, el.clientWidth || 600);
      var all = []; o.series.forEach(function (s) { all = all.concat(s.values.map(n)); });
      var max = niceMax(Math.max.apply(null, all.concat([0])) * 1.08);
      var N = o.labels.length, iw = W - PAD.l - PAD.r, ih = H - PAD.t - PAD.b;
      var x = function (i) { return PAD.l + (N <= 1 ? iw / 2 : (i * iw) / (N - 1)); };
      var y = function (v) { return PAD.t + ih - (n(v) / max) * ih; };
      var g = '';
      for (var k = 0; k <= 4; k++) {
        var gv = (max / 4) * k, gy = y(gv);
        g += '<line class="grid-l" x1="' + PAD.l + '" x2="' + (W - PAD.r) + '" y1="' + gy + '" y2="' + gy + '"/>';
        g += '<text class="axis-t" x="' + (PAD.l - 10) + '" y="' + (gy + 3.5) + '" text-anchor="end">' + esc((o.axis || compact)(gv)) + '</text>';
      }
      var step = Math.max(1, Math.ceil(N / Math.max(2, Math.floor(iw / 78))));
      for (var i = 0; i < N; i += step) g += '<text class="axis-t" x="' + x(i) + '" y="' + (H - 7) + '" text-anchor="middle">' + esc(o.tickFmt ? o.tickFmt(o.labels[i]) : o.labels[i]) + '</text>';
      var paths = '';
      o.series.forEach(function (s, si) {
        var pts = s.values.map(function (v, i) { return [x(i), y(v)]; });
        if (o.bars) {
          var bw = Math.max(2, Math.min(18, (iw / N) * 0.62 / o.series.length));
          s.values.forEach(function (v, i) { var bx = x(i) - (bw * o.series.length) / 2 + si * bw, by = y(v); paths += '<rect class="bar" x="' + bx.toFixed(1) + '" y="' + by.toFixed(1) + '" width="' + (bw - 1).toFixed(1) + '" height="' + Math.max(0, PAD.t + ih - by).toFixed(1) + '" rx="2" fill="' + s.color + '"/>'; });
          return;
        }
        var d = smooth(pts, PAD.t, PAD.t + ih), gid = 'lg' + uid();
        if (s.fill !== false) paths += '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + s.color + '" stop-opacity=".26"/><stop offset="1" stop-color="' + s.color + '" stop-opacity="0"/></linearGradient></defs>' +
          '<path class="ar" d="' + d + ' L' + x(N - 1) + ',' + (PAD.t + ih) + ' L' + x(0) + ',' + (PAD.t + ih) + ' Z" fill="url(#' + gid + ')"/>';
        paths += '<path class="ln draw" d="' + d + '" stroke="' + s.color + '"' + (s.dash ? ' stroke-dasharray="4 4"' : '') + '/>';
      });
      el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" height="' + H + '" role="img" aria-label="' + esc(o.label || 'Chart') + '">' + g + paths +
        '<line class="cross" y1="' + PAD.t + '" y2="' + (PAD.t + ih) + '" style="display:none"/>' +
        o.series.map(function (s) { return '<circle class="pt" r="4.5" fill="' + s.color + '" style="display:none"/>'; }).join('') + '</svg><div class="tip"></div>';
      $$('.ln.draw', el).forEach(function (p) { try { var L = p.getTotalLength(); p.style.setProperty('--len', L); } catch (e) {} });
      var svg = el.querySelector('svg'), tip = el.querySelector('.tip'), cross = el.querySelector('.cross'), dots = $$('.pt', el);
      function hover(ev) {
        var r = svg.getBoundingClientRect(), mx = (ev.clientX - r.left) * (W / r.width);
        var i = Math.max(0, Math.min(N - 1, Math.round(((mx - PAD.l) / iw) * (N - 1))));
        var cx = x(i);
        cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.style.display = '';
        o.series.forEach(function (s, si) { var dt = dots[si]; if (!dt || o.bars) return; dt.setAttribute('cx', cx); dt.setAttribute('cy', y(s.values[i])); dt.style.display = ''; });
        tip.innerHTML = '<div class="tip-h">' + esc(o.tipLabel ? o.tipLabel(o.labels[i]) : o.labels[i]) + '</div>' + o.series.map(function (s) {
          return '<div class="tip-r"><span><i style="background:' + s.color + '"></i>' + esc(s.name) + '</span><b>' + esc((s.fmt || o.fmt || num)(s.values[i])) + '</b></div>'; }).join('');
        tip.classList.add('on');
        var px = (cx / W) * r.width, tw = tip.offsetWidth;
        tip.style.left = Math.max(0, Math.min(r.width - tw, px + 14 > r.width - tw ? px - tw - 14 : px + 14)) + 'px';
        tip.style.top = '8px';
      }
      svg.addEventListener('mousemove', hover);
      svg.addEventListener('touchstart', function (e) { if (e.touches[0]) hover(e.touches[0]); }, { passive: true });
      svg.addEventListener('mouseleave', function () { tip.classList.remove('on'); cross.style.display = 'none'; dots.forEach(function (d) { d.style.display = 'none'; }); });
    }
    draw();
    if (global.ResizeObserver) {
      var lastW = el.clientWidth;
      var ro = new ResizeObserver(debounce(function () { if (!doc.body.contains(el)) { ro.disconnect(); return; } if (Math.abs(el.clientWidth - lastW) > 8) { lastW = el.clientWidth; draw(); } }, 120));
      ro.observe(el);
    }
  }
  function hbars(items, fmt, color) {
    if (!items || !items.length) return empty('No data yet', 'This fills in as activity arrives.', 'chart');
    var max = Math.max.apply(null, items.map(function (i) { return n(i.value); }).concat([1]));
    return html`${items.map(function (it, k) {
      return html`<div class="hbar" title="${it.label}: ${(fmt || num)(it.value)}"><div class="hbar-l">${it.label}</div>
        <div class="hbar-t"><div class="hbar-f" style="width:${Math.max(1.5, (n(it.value) / max) * 100).toFixed(1)}%;animation-delay:${(k * 0.05).toFixed(2)}s${color || it.color ? ';background:' + (it.color || color) : ''}"></div></div>
        <div class="hbar-v">${(fmt || num)(it.value)}</div></div>`; })}`;
  }
  function funnel(steps) {
    if (!steps || !steps.length) return empty('No funnel yet');
    var top = Math.max(1, n(steps[0].value));
    return html`<div class="funnel">${steps.map(function (s, i) {
      var w = Math.max(3, (n(s.value) / top) * 100), prev = i ? n(steps[i - 1].value) : null;
      var conv = prev ? (n(s.value) / prev) * 100 : null;
      return html`<div class="fn-row"><div class="fn-l">${s.label}</div><div class="fn-t"><div class="fn-f" style="width:${w.toFixed(1)}%;animation-delay:${(i * 0.08).toFixed(2)}s;opacity:${(1 - i * 0.12).toFixed(2)}">${num(s.value)}</div></div>
        <div class="fn-r ${conv != null && conv < 20 ? 'bad' : ''}">${conv == null ? '100%' : NF1.format(conv) + '%'}</div></div>`; })}</div>`;
  }
  function ring(p, label, color) { p = Math.max(0, Math.min(100, n(p))); return html`<span class="ring" style="--p:${p.toFixed(0)};--c:${color || (p >= 70 ? 'var(--ok)' : p >= 45 ? 'var(--warn)' : 'var(--bad)')}"><span>${label != null ? label : Math.round(p)}</span></span>`; }

  /* ── 11 · STATE ──────────────────────────────────────────────────── */
  var CX = {
    me: null, pulse: {}, counts: {}, range: store('range') || 30,
    booted: false
  };

  /* ── 12 · NAVIGATION ─────────────────────────────────────────────── */
  function c(k) { return n(CX.counts[k]); }
  var NAV = [
    { g: 'Command', items: [
      { id: 'home', label: 'Home', icon: 'home', keys: 'g h' },
      { id: 'inbox', label: 'Inbox', icon: 'inbox', keys: 'g i', tone: 'hot', badge: function () { return inboxTotal(); } }
    ] },
    { g: 'Operations', items: [
      { id: 'bookings', label: 'Bookings', icon: 'calendar', keys: 'g b', tone: 'info', badge: function () { return n(CX.pulse.bookings_today); } },
      { id: 'listings', label: 'Listings', icon: 'building', keys: 'g l', tone: 'warn', badge: function () { return c('listings') + c('tour3d') + c('conflicts'); } },
      { id: 'food', label: 'Food orders', icon: 'utensils', tone: 'info', badge: function () { return n(CX.pulse.food_live); } },
      { id: 'flights', label: 'Flight desk', icon: 'plane', tone: 'warn', desk: 's-flights', badge: function () { return c('flights'); } },
      { id: 'tours', label: 'Tours', icon: 'map', tone: 'warn', desk: 's-tours', badge: function () { return c('tours') + c('operators'); } },
      { id: 'events', label: 'Events', icon: 'ticket', tone: 'warn', desk: 's-events', badge: function () { return c('events'); } },
      { id: 'move', label: 'Cabana Move', icon: 'car', tone: 'warn', desk: 's-transport', badge: function () { return c('rides'); } },
      { id: 'offers', label: 'Offers', icon: 'tag', desk: 's-offers' },
      { id: 'match', label: 'Cabana Match', icon: 'sparkles' }
    ] },
    { g: 'People', items: [
      { id: 'people', label: 'Members', icon: 'users', keys: 'g p', tone: 'warn', badge: function () { return c('host_review'); } },
      { id: 'profiles', label: 'Profiles & ticks', icon: 'shieldCheck', tone: 'warn', badge: function () { return c('profiles'); } },
      { id: 'agents', label: 'Agents', icon: 'idcard', tone: 'warn', badge: function () { return c('kyc'); } },
      { id: 'ambassadors', label: 'Ambassadors', icon: 'award' },
      { id: 'leads', label: 'Listing leads', icon: 'phone', tone: 'info', badge: function () { return c('leads'); } }
    ] },
    { g: 'Money', items: [
      { id: 'finance', label: 'Finance', icon: 'wallet', keys: 'g f', tone: 'hot', badge: function () { return c('refunds') + c('withdrawals'); } }
    ] },
    { g: 'Trust', items: [
      { id: 'safety', label: 'Safety', icon: 'shield', keys: 'g s', tone: 'hot', badge: function () { return c('sos') + c('checkin') + c('disputes') + c('uploads'); } },
      { id: 'support', label: 'Support desk', icon: 'lifebuoy', tone: 'warn', href: '/support-console', badge: function () { return c('support'); } }
    ] },
    { g: 'Growth', items: [
      { id: 'ads', label: 'Advertising', icon: 'megaphone' },
      { id: 'comms', label: 'Messaging', icon: 'send', keys: 'g m' },
      { id: 'insights', label: 'Audience', icon: 'chart' }
    ] },
    { g: 'System', items: [
      { id: 'health', label: 'System health', icon: 'activity', tone: 'hot', badge: function () { return c('ops'); } },
      { id: 'audit', label: 'Audit log', icon: 'scroll' },
      { id: 'team', label: 'Team & access', icon: 'key' }
    ] }
  ];
  var NAV_BY = {}; NAV.forEach(function (g) { g.items.forEach(function (i) { i.group = g.g; NAV_BY[i.id] = i; }); });
  var INBOX_KEYS = ['profiles', 'kyc', 'tours', 'events', 'operators', 'checkin', 'support', 'refunds', 'listings', 'withdrawals', 'disputes', 'uploads', 'sos', 'ops', 'tour3d', 'conflicts', 'leads', 'flights', 'rides', 'host_review'];
  function inboxTotal() { return INBOX_KEYS.reduce(function (s, k) { return s + c(k); }, 0); }

  function renderNav() {
    set($('#nav'), html`${NAV.map(function (g) {
      return html`<div class="nav-g"><div class="nav-gl">${g.g}</div>${g.items.map(function (i) {
        return html`<a class="nav-i" href="${i.href || '#/' + i.id}" data-nav="${i.id}" ${i.href ? raw('target="_blank" rel="noopener"') : ''} title="${i.label}${i.keys ? ' (' + i.keys + ')' : ''}">
          ${icon(i.icon)}<span class="nav-l">${i.label}</span>${i.href ? icon('external', 'nav-ext') : ''}<span class="nav-b hide" id="nb-${i.id}"></span></a>`; })}</div>`; })}`);
    $$('#nav [data-nav]').forEach(function (a) { a.addEventListener('click', function () { $('#app').classList.remove('nav-open'); }); });
  }
  var lastBadge = {};
  function paintBadges() {
    NAV.forEach(function (g) { g.items.forEach(function (i) {
      var el = $('#nb-' + i.id); if (!el || !i.badge) return;
      var v = i.badge() || 0;
      el.classList.toggle('hide', !v);
      el.className = 'nav-b ' + (v ? (i.tone || '') : 'hide');
      if (v && lastBadge[i.id] != null && v > lastBadge[i.id]) { el.classList.add('pop'); setTimeout(function () { el.classList.remove('pop'); }, 600); }
      el.textContent = v > 99 ? '99+' : String(v);
      lastBadge[i.id] = v;
    }); });
    var total = inboxTotal();
    var dot = $('#bell-dot'); if (dot) dot.classList.toggle('hide', !total);
    doc.title = (total ? '(' + total + ') ' : '') + 'Cabana Console';
  }
  function markNav(id) { $$('#nav [data-nav]').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-nav') === id); a.setAttribute('aria-current', a.getAttribute('data-nav') === id ? 'page' : 'false'); }); }

  /* ── 13 · ROUTER ─────────────────────────────────────────────────── */
  var VIEWS = {};
  var current = null;   // { name, args, q, gen, def, ctx }
  var gen = 0;
  function view(name, def) { VIEWS[name] = def; }
  function parse() {
    var h = (global.location.hash || '').replace(/^#\/?/, '');
    var i = h.indexOf('?'), path = i > -1 ? h.slice(0, i) : h, qs = i > -1 ? h.slice(i + 1) : '';
    var parts = path.split('/').filter(Boolean).map(function (p) { try { return decodeURIComponent(p); } catch (e) { return p; } });
    var qo = {}; new URLSearchParams(qs).forEach(function (v, k) { qo[k] = v; });
    return { name: parts[0] || 'home', args: parts.slice(1), q: qo };
  }
  function buildHash(name, args, qo) {
    var p = '#/' + [name].concat(args || []).map(encodeURIComponent).join('/');
    var s = new URLSearchParams(); Object.keys(qo || {}).forEach(function (k) { if (qo[k] != null && qo[k] !== '' && qo[k] !== false) s.set(k, qo[k]); });
    var str = s.toString(); return p + (str ? '?' + str : '');
  }
  function go(path) { global.location.hash = path.charAt(0) === '#' ? path : '#/' + path.replace(/^\//, ''); }
  function replaceHash(h) { try { history.replaceState(null, '', h); } catch (e) { global.location.hash = h; } }
  function route() {
    var r = parse();
    if (!CX.booted) return;
    var nav = NAV_BY[r.name];
    if (nav && nav.href) { global.open(nav.href, '_blank', 'noopener'); replaceHash(current ? buildHash(current.name, current.args, current.q) : '#/home'); return; }
    if (current && current.name === r.name && current.def && current.def.update) {
      current.args = r.args; current.q = r.q; current.ctx.args = r.args; current.ctx.q = r.q;
      try { current.def.update(current.ctx); } catch (e) { console.error(e); }
      return;
    }
    /* A click renders at once. A burst (key-repeat through the palette,
       back-button mashing, a script) is coalesced: only the view the
       operator lands on loads, so the ones flashed past cost nothing. */
    var now = Date.now(), burst = now - lastNavAt < 220;
    lastNavAt = now; clearTimeout(navTimer);
    if (burst) { markNav(r.name); navTimer = setTimeout(function () { lastNavAt = 0; route(); }, 160); return; }
    render(r);
  }
  var lastNavAt = 0, navTimer = null;
  function render(r) {
    if (current && current.def && current.def.leave) try { current.def.leave(current.ctx); } catch (e) {}
    drawer.close(false); closeMenus();
    var def = VIEWS[r.name], nav = NAV_BY[r.name];
    if (!def && !(nav && nav.desk)) { def = VIEWS.home; r = { name: 'home', args: [], q: {} }; replaceHash('#/home'); nav = NAV_BY.home; }
    var my = ++gen;
    var host = $('#view'), desks = $('#desks');
    markNav(r.name);
    setCrumb((nav && nav.group) || '', (def && def.title) || (nav && nav.label) || '');
    global.scrollTo(0, 0);
    if (nav && nav.desk) {
      host.classList.add('hide'); desks.classList.remove('hide');
      $$('#desks > section').forEach(function (s) { var on = s.id === nav.desk; s.classList.toggle('hide', !on); s.classList.toggle('on', on); if (on) { s.style.animation = 'none'; void s.offsetWidth; s.style.animation = ''; } });
      current = { name: r.name, args: r.args, q: r.q, gen: my, def: def, ctx: null };
      loadDesk(r.name);
      return;
    }
    desks.classList.add('hide'); host.classList.remove('hide');
    host.className = 'view' + (def.wide ? ' wide' : '');
    host.style.animation = 'none'; void host.offsetWidth; host.style.animation = '';
    host.innerHTML = '';
    var ctx = {
      el: host, name: r.name, args: r.args, q: r.q,
      alive: function () { return gen === my; },
      setQ: function (patch, push) {
        Object.keys(patch).forEach(function (k) { ctx.q[k] = patch[k]; });
        var h = buildHash(ctx.name, ctx.args, ctx.q);
        if (push) global.location.hash = h; else replaceHash(h);
      },
      setArgs: function (args, qo) { ctx.args = args; if (qo) ctx.q = qo; current.args = args; replaceHash(buildHash(ctx.name, args, ctx.q)); },
      refresh: function () { freshen(); render({ name: ctx.name, args: ctx.args, q: ctx.q }); },
      crumb: function (t) { setCrumb((nav && nav.group) || '', t); }
    };
    current = { name: r.name, args: r.args, q: r.q, gen: my, def: def, ctx: ctx };
    Promise.resolve().then(function () { return def.render(ctx); }).catch(function (e) {
      console.error('[console:' + r.name + ']', e);
      if (!ctx.alive()) return;
      set(host, html`<div class="card">${errorBox(e, true)}</div>`);
      wireRetry(host, ctx.refresh);
    });
  }
  function setCrumb(g, t) { set($('#crumbs'), html`<span class="crumb-g">${g}</span>${g ? html`<span class="crumb-g">${icon('chevR')}</span>` : ''}<b>${t}</b>`); }
  function refreshView() {
    if (!current) return;
    freshen();
    if (current.ctx) current.ctx.refresh(); else loadDesk(current.name, true);
    pulseNow(true);
  }
  /* Desk modules load on first visit, not on every sign-in: together they
     are ~300 KB of script the operator may never open in a session. They
     are prefetched once the console is idle, so the first click is warm. */
  var DESK_JS = {
    flights: ['/fd-atlas.js', '/cabana-flights-admin.js'],
    tours: ['/cabana-tours-admin.js'],
    events: ['/cabana-events-admin.js'],
    move: ['/cabana-rides-admin.js?v=3'],
    offers: ['/cabana-offers.js']
  };
  var scriptP = {};
  function loadScript(src) {
    if (!scriptP[src]) scriptP[src] = new Promise(function (resolve, reject) {
      var el = doc.createElement('script'); el.src = src; el.async = false;
      el.onload = resolve;
      el.onerror = function () { delete scriptP[src]; el.remove(); reject(new Error('This desk could not be downloaded. Check the connection and try again.')); };
      doc.head.appendChild(el);
    });
    return scriptP[src];
  }
  function needDesk(name) {
    return (DESK_JS[name] || []).reduce(function (p, src) { return p.then(function () { return loadScript(src); }); }, Promise.resolve());
  }
  function prefetchDesks() {
    var idle = global.requestIdleCallback || function (fn) { return setTimeout(fn, 1200); };
    idle(function () { Object.keys(DESK_JS).forEach(function (k) { needDesk(k).catch(function () {}); }); });
  }
  var deskLoaded = {};
  function deskTarget(name) {
    var sec = $('#' + ((NAV_BY[name] && NAV_BY[name].desk) || ''));
    return sec && (sec.querySelector('#admin-offers, #rides-admin-root') || sec);
  }
  function loadDesk(name, force) {
    var target = deskTarget(name), my = gen;
    var ready = (DESK_JS[name] || []).every(function (src) { return scriptP[src] && scriptP[src].done; });
    if (!ready && target && !target.children.length) { set(target, skeleton()); target.dataset.skel = '1'; }
    needDesk(name).then(function () {
      (DESK_JS[name] || []).forEach(function (src) { scriptP[src].done = true; });
      if (my !== gen) return;               // the operator moved on
      if (target && target.dataset.skel) { delete target.dataset.skel; target.innerHTML = ''; }
      runDesk(name, force);
    }, function (e) {
      if (my !== gen || !target) return;
      delete target.dataset.skel;
      set(target, html`<div class="card">${errorBox(e, true)}</div>`);
      wireRetry(target, function () { target.innerHTML = ''; loadDesk(name, true); });
    });
  }
  function runDesk(name, force) {
    try {
      if (name === 'tours' && global.toursLoad) global.toursLoad();
      if (name === 'events' && global.eventsLoad) global.eventsLoad();
      if (name === 'flights' && global.flightsLoad) global.flightsLoad();
      if (name === 'move' && global.RidesAdmin) global.RidesAdmin.load(!!force || !deskLoaded.move);
      if (name === 'offers' && global.CabanaOffers) {
        if (!deskLoaded.offers || force) global.CabanaOffers.mount({ client: sb, root: $('#admin-offers'), admin: true });
      }
      deskLoaded[name] = true;
    } catch (e) { toast('This desk could not start: ' + friendly(e), 'bad'); }
  }

  /* ── 14 · PULSE ──────────────────────────────────────────────────── */
  var pulseTimer = null, pulseTick = 0, lastPulseAt = 0, prevPulse = null;
  function pulseNow(withInbox) {
    return rpc('admin_pulse', null, { fresh: true }).then(function (p) {
      var before = prevPulse; prevPulse = p; CX.pulse = p || {}; lastPulseAt = Date.now();
      if (before) {
        if (p.latest_booking && before.latest_booking && p.latest_booking > before.latest_booking)
          toast('A new booking just came in', 'ok', { action: { label: 'View', fn: function () { go('bookings'); } } });
        if (p.latest_signup && before.latest_signup && p.latest_signup > before.latest_signup)
          toast('A new member just signed up', 'info', { action: { label: 'View', fn: function () { go('people?filter=new'); } } });
        if (n(p.sos) > n(before.sos)) toast('New SOS alert — someone may need help now', 'bad', { ms: 12000, action: { label: 'Open', fn: function () { go('safety?tab=sos'); } } });
      }
      liveState('on');
      var need = withInbox || pulseTick % 3 === 0;
      return need ? rpc('admin_inbox', null, { fresh: true }).then(function (ib) { CX.inbox = ib; CX.counts = (ib && ib.counts) || CX.counts; }) : null;
    }).then(function () { paintBadges(); }).catch(function (e) {
      liveState(/roster/.test(friendly(e)) ? 'off' : 'stale');
    });
  }
  function liveState(s) {
    var el = $('#live'); if (!el) return;
    el.className = 'live' + (s === 'on' ? '' : ' ' + s);
    el.title = s === 'on' ? 'Live — refreshed ' + ago(lastPulseAt) : s === 'stale' ? 'Reconnecting…' : 'Offline';
    set(el, html`<i></i><span>${s === 'on' ? 'Live' : s === 'stale' ? 'Reconnecting' : 'Offline'}</span>`);
  }
  function startPulse() {
    clearInterval(pulseTimer);
    pulseNow(true);
    pulseTimer = setInterval(function () { if (doc.hidden) return; pulseTick++; pulseNow(false); }, 30000);
    doc.addEventListener('visibilitychange', function () { if (!doc.hidden && Date.now() - lastPulseAt > 25000) pulseNow(true); });
  }

  /* ── 15 · COMMAND PALETTE ────────────────────────────────────────── */
  var pal = null;
  function palette(open) {
    if (open === false) { if (pal) pal.close(); return; }
    if (pal) { pal.input.focus(); return; }
    var wrap = doc.createElement('div'), scrim = doc.createElement('div');
    wrap.className = 'palette-wrap'; scrim.className = 'scrim'; scrim.style.zIndex = 94;
    set(wrap, html`<div class="palette" role="dialog" aria-label="Command palette">
      <div class="pl-in">${icon('search')}<input type="text" placeholder="Search members, listings, bookings — or jump anywhere" aria-label="Search" autocomplete="off" spellcheck="false"/><kbd>esc</kbd></div>
      <div class="pl-list" role="listbox"></div>
      <div class="pl-ft"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>↵</kbd> open</span><span><kbd>?</kbd> shortcuts</span></div></div>`);
    doc.body.appendChild(scrim); doc.body.appendChild(wrap);
    var input = $('input', wrap), list = $('.pl-list', wrap), items = [], sel = 0, reqId = 0;
    pal = { input: input, close: close };
    function close() { if (!pal) return; pal = null; wrap.classList.remove('on'); scrim.classList.remove('on'); setTimeout(function () { wrap.remove(); scrim.remove(); }, 220); }
    scrim.onclick = close; wrap.addEventListener('mousedown', function (e) { if (e.target === wrap) close(); });
    var base = [];
    NAV.forEach(function (g) { g.items.forEach(function (i) { base.push({ g: 'Go to', t: i.label, s: g.g, ic: i.icon, k: i.keys, run: function () { if (i.href) global.open(i.href, '_blank', 'noopener'); else go(i.id); } }); }); });
    base.push({ g: 'Actions', t: 'Refresh data', ic: 'refresh', k: 'r', run: refreshView });
    base.push({ g: 'Actions', t: 'Switch to ' + (theme() === 'dark' ? 'light' : 'dark') + ' theme', ic: theme() === 'dark' ? 'sun' : 'moon', k: 't', run: toggleTheme });
    base.push({ g: 'Actions', t: 'Preview the live site', ic: 'eye', run: preview });
    base.push({ g: 'Actions', t: 'Send a push notification', ic: 'send', run: function () { go('comms'); } });
    base.push({ g: 'Actions', t: 'Add a listing', ic: 'plus', run: function () { go('listings?new=1'); } });
    base.push({ g: 'Actions', t: 'Toggle sidebar', ic: 'sidebar', k: '[', run: toggleSide });
    base.push({ g: 'Actions', t: 'Keyboard shortcuts', ic: 'cmd', k: '?', run: shortcuts });
    base.push({ g: 'Actions', t: 'Sign out', ic: 'logout', run: signOut });
    function paint(extra) {
      var qv = input.value.trim().toLowerCase();
      var nav = base.filter(function (b) { return !qv || (b.t + ' ' + (b.s || '')).toLowerCase().indexOf(qv) > -1; });
      items = (extra || []).concat(nav.slice(0, qv ? 8 : 40));
      sel = Math.min(sel, Math.max(0, items.length - 1));
      var lastG = null;
      set(list, items.length ? html`${items.map(function (it, i) {
        var gh = it.g !== lastG ? html`<div class="pl-g">${it.g}</div>` : ''; lastG = it.g;
        return html`${gh}<div class="pl-i ${i === sel ? 'on' : ''}" role="option" data-i="${i}">${it.img ? html`<img src="${safeUrl(it.img)}" alt="" loading="lazy"/>` : icon(it.ic || 'arrowR')}<span class="pl-t">${it.t}${it.s ? html`<span class="pl-s">${it.s}</span>` : ''}</span>${it.k ? html`<span class="pl-k">${it.k.split(' ').map(function (k) { return html`<kbd>${k}</kbd>`; })}</span>` : ''}</div>`; })}`
        : html`<div class="empty" style="padding:30px">${qv.length < 2 ? 'Type to search' : 'Nothing matches “' + qv + '”'}</div>`);
      $$('.pl-i', list).forEach(function (el) {
        el.onmousemove = function () { var i = +el.getAttribute('data-i'); if (i !== sel) { sel = i; mark(); } };
        el.onclick = function () { run(+el.getAttribute('data-i')); };
      });
    }
    function mark() { $$('.pl-i', list).forEach(function (el) { el.classList.toggle('on', +el.getAttribute('data-i') === sel); }); var on = $('.pl-i.on', list); if (on) on.scrollIntoView({ block: 'nearest' }); }
    function run(i) { var it = items[i]; if (!it) return; close(); setTimeout(it.run, 30); }
    var search = debounce(function () {
      var qv = input.value.trim(); if (qv.length < 2) { paint(); return; }
      var my = ++reqId;
      set(list, html`<div class="empty" style="padding:26px"><span class="spinner"></span></div>`);
      rpc('admin_search', { p_q: qv }).then(function (r) {
        if (my !== reqId || !pal) return;
        var ex = [];
        (r.people || []).forEach(function (p) { ex.push({ g: 'Members', t: p.name || p.email, s: p.email, ic: 'user', run: function () { open.person(p.id); } }); });
        (r.listings || []).forEach(function (l) { ex.push({ g: 'Listings', t: l.title, s: [l.city, human(l.status)].filter(Boolean).join(' · '), img: l.photo, ic: 'building', run: function () { open.listing(l.id); } }); });
        (r.bookings || []).forEach(function (b) { ex.push({ g: 'Bookings', t: (b.title || 'Booking') + ' — ' + (b.who || 'Guest'), s: svc(b.service).label + ' · ' + money(b.total) + ' · ' + (STAGE[b.stage] || [b.stage])[0], ic: svc(b.service).icon, run: function () { open.booking(b.service, b.id); } }); });
        paint(ex);
      }).catch(function () { if (my === reqId) paint(); });
    }, 200);
    input.addEventListener('input', function () { sel = 0; if (input.value.trim().length >= 2) search(); else { reqId++; paint(); } });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(items.length - 1, sel + 1); mark(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); mark(); }
      else if (e.key === 'Enter') { e.preventDefault(); run(sel); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    });
    paint();
    requestAnimationFrame(function () { wrap.classList.add('on'); scrim.classList.add('on'); input.focus(); });
  }
  function shortcuts() {
    var rowsK = [['Command palette', '⌘ K'], ['Search', '/'], ['Refresh', 'r'], ['Theme', 't'], ['Sidebar', '['], ['This sheet', '?'], ['Close overlay', 'esc'],
      ['Home', 'g h'], ['Inbox', 'g i'], ['Bookings', 'g b'], ['Listings', 'g l'], ['Members', 'g p'], ['Finance', 'g f'], ['Safety', 'g s'], ['Messaging', 'g m']];
    modal({ title: 'Keyboard shortcuts', sub: 'Everything in the console is a keystroke away.', icon: 'cmd', wide: true,
      body: html`<div class="shortcuts">${rowsK.map(function (r) { return html`<div class="kv"><span>${r[0]}</span><span>${r[1].split(' ').map(function (k) { return html`<kbd>${k}</kbd>`; })}</span></div>`; })}</div>`,
      actions: [{ label: 'Done', kind: 'btn-p' }] });
  }

  /* ── 16 · KEYBOARD ───────────────────────────────────────────────── */
  var gPending = 0;
  function typing(e) { var t = e.target; return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); }
  function onKey(e) {
    if (!CX.booted) return;
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); palette(); return; }
    if (e.key === 'Escape') { if (pal) { pal.close(); return; } if ($('.menu')) { closeMenus(); return; } if ($('.modal-wrap.on')) return; var fdm = $('#fdx-modal'); if (fdm && fdm.children.length && global.FDAdmin) { global.FDAdmin.close(); return; } if (drawer.isOpen()) { drawer.close(true); return; } if ($('.preview')) { $('.preview').remove(); return; } $('#app').classList.remove('nav-open'); return; }
    if (typing(e) || e.metaKey || e.ctrlKey || e.altKey || $('.modal-wrap.on') || pal) return;
    if (gPending && Date.now() - gPending < 1200) {
      gPending = 0;
      var map = { h: 'home', i: 'inbox', b: 'bookings', l: 'listings', p: 'people', f: 'finance', s: 'safety', m: 'comms', a: 'audit', t: 'team', o: 'food' };
      if (map[e.key]) { e.preventDefault(); go(map[e.key]); }
      return;
    }
    if (e.key === 'g') { gPending = Date.now(); return; }
    if (e.key === '/') { e.preventDefault(); palette(); }
    else if (e.key === '?') { e.preventDefault(); shortcuts(); }
    else if (e.key === 'r') { e.preventDefault(); refreshView(); toast('Refreshed', 'ok', { ms: 1400 }); }
    else if (e.key === 't') { toggleTheme(); }
    else if (e.key === '[') { toggleSide(); }
  }

  /* ── 17 · THEME / SIDEBAR / PREVIEW ──────────────────────────────── */
  function theme() { return doc.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }
  function applyTheme(t) {
    t = t || store('theme') || 'dark';
    doc.documentElement.setAttribute('data-theme', t);
    var b = $('#theme-btn'); if (b) set(b, icon(t === 'dark' ? 'sun' : 'moon'));
    var m = $('meta[name="theme-color"]'); if (m) m.setAttribute('content', t === 'dark' ? '#07080C' : '#F5F6F9');
  }
  function toggleTheme() { var t = theme() === 'dark' ? 'light' : 'dark'; store('theme', t); applyTheme(t); if (current && current.ctx && current.def && current.def.chart) current.ctx.refresh(); }
  function toggleSide() {
    var app = $('#app');
    if (global.innerWidth <= 900) { app.classList.toggle('nav-open'); return; }
    app.classList.toggle('collapsed'); store('collapsed', app.classList.contains('collapsed'));
  }
  var PAGES = [['/', 'Home'], ['/apartments', 'Stays'], ['/tours', 'Tours'], ['/events', 'Events'], ['/flights', 'Flights'], ['/food', 'Food'],
    ['/carhire', 'Car hire'], ['/rides', 'Rides'], ['/roommates', 'Roommates'], ['/shopping', 'Shopping'], ['/cabana', 'Cabana Match'], ['/help', 'Help']];
  var DEVICES = [['desktop', 'monitor', '100%', '100%'], ['tablet', 'tablet', '834px', '1112px'], ['mobile', 'phoneDevice', '390px', '844px']];
  function preview(path) {
    var old = $('.preview'); if (old) old.remove();
    var p = path || '/', dev = store('pv-dev') || 'desktop';
    var el = doc.createElement('div'); el.className = 'preview';
    function src() { return p + (p.indexOf('?') > -1 ? '&' : '?') + 'asguest=1'; }
    set(el, html`<div class="pv-bar"><span class="pill p-brand">${icon('eye')}Guest view</span>
      <select class="inp sm" style="width:auto" aria-label="Page">${PAGES.map(function (x) { return html`<option value="${x[0]}"${x[0] === p ? raw(' selected') : ''}>${x[1]}</option>`; })}</select>
      ${seg(DEVICES.map(function (d) { return [d[0], '', d[1]]; }), dev, 'data-dev')}
      <span class="grow"></span><a class="btn btn-sm btn-g" target="_blank" rel="noopener" data-pv-open>${icon('external')}Open in tab</a>
      <button class="btn btn-sm" data-pv-x>${icon('x')}Close</button></div>
      <div class="pv-stage"><iframe class="pv-frame" title="Guest view of the live site" referrerpolicy="same-origin"></iframe></div>`);
    doc.body.appendChild(el);
    var fr = $('iframe', el), sel = $('select', el), openA = $('[data-pv-open]', el);
    function apply() {
      var d = DEVICES.filter(function (x) { return x[0] === dev; })[0];
      fr.style.width = d[2]; fr.style.height = d[3] === '100%' ? '100%' : 'min(' + d[3] + ',100%)';
      $$('[data-dev]', el).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-dev') === dev); });
      openA.href = src();
    }
    fr.src = src(); apply();
    sel.onchange = function () { p = sel.value; fr.src = src(); openA.href = src(); };
    $$('[data-dev]', el).forEach(function (b) { b.onclick = function () { dev = b.getAttribute('data-dev'); store('pv-dev', dev); apply(); }; });
    $('[data-pv-x]', el).onclick = function () { el.remove(); };
  }

  /* ── 18 · GLOBAL OPENERS (implemented by view files) ─────────────── */
  var open = {
    person: function (id) { go('people/' + id); },
    listing: function (id) { go('listings/' + id); },
    booking: function (service, id) { go('bookings/' + service + '/' + id); }
  };

  /* ── 19 · AUTH + BOOT ────────────────────────────────────────────── */
  function client() {
    if (sb) return sb;
    if (global.__APA_SB__) sb = global.__APA_SB__;
    else if (global.supabase && global.supabase.createClient) sb = global.supabase.createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'apa-auth' } });
    global.sb = sb; global.__sbClient = sb;
    return sb;
  }
  function hideBoot() { var b = $('#boot'); if (b) { b.classList.add('gone'); setTimeout(function () { b.remove(); }, 450); } }
  function showGate(o) {
    o = o || {};
    hideBoot();
    var g = $('#gate'); g.classList.remove('hide'); $('#app').classList.add('hide');
    var form = $('#gate-form'), who = $('#gate-who'), err = $('#gate-err');
    set(err, o.error || '');
    if (o.signedInAs) {
      form.classList.add('hide'); who.classList.remove('hide');
      set(who, html`<div class="gate-who">${avatar(o.signedInAs, 'sm')}<div class="grow"><div class="strong">${o.signedInAs}</div><div class="muted" style="font-size:12px">is signed in, but not on the operator roster</div></div></div>
        <button class="btn btn-g" id="gate-switch" type="button">${icon('logout')}Use a different account</button>
        <a class="btn btn-q" href="/" style="margin-top:8px">Back to Cabana</a>`);
      $('#gate-switch').onclick = function () { sb.auth.signOut().finally(function () { showGate({}); }); };
    } else {
      form.classList.remove('hide'); who.classList.add('hide');
      setTimeout(function () { var e = $('#g-email'); if (e && !e.value) e.focus(); }, 80);
    }
  }
  function wireGate() {
    var form = $('#gate-form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = $('#g-email').value.trim().toLowerCase(), pass = $('#g-pass').value, btn = $('#g-btn'), err = $('#gate-err');
      if (!email || !pass) { set(err, 'Enter your email and password.'); return; }
      set(err, ''); btn.classList.add('busy');
      sb.auth.signInWithPassword({ email: email, password: pass }).then(function (r) {
        if (r.error || !r.data || !r.data.user) throw new Error(/confirm/i.test(r.error && r.error.message || '') ? 'Confirm your email address first.' : 'Those credentials did not work.');
        return enter();
      }).catch(function (e2) { btn.classList.remove('busy'); set(err, friendly(e2)); });
    });
    $('#g-google').addEventListener('click', function () {
      /* The site's own OAuth callback finishes the sign-in; the admin guard
         then brings an operator straight back here. */
      sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: global.location.origin + '/auth?callback=google' } })
        .then(function (r) { if (r.error) set($('#gate-err'), friendly(r.error)); });
    });
    $('#g-show').addEventListener('click', function () { var p = $('#g-pass'); p.type = p.type === 'password' ? 'text' : 'password'; });
  }
  function enter() {
    return rpc('admin_whoami').then(function (me) {
      if (!me || !me.admin) {
        return sb.auth.getSession().then(function (s) {
          var em = (me && me.email) || (s.data.session && s.data.session.user && s.data.session.user.email) || 'This account';
          showGate({ signedInAs: em });
        });
      }
      CX.me = me; store('operator', String(me.email || '').toLowerCase()); boot();
    }).catch(function (e) { showGate({ error: friendly(e) }); });
  }
  function boot() {
    if (CX.booted) { hideBoot(); return; }
    CX.booted = true;
    $('#gate').classList.add('hide'); $('#app').classList.remove('hide');
    if (store('collapsed')) $('#app').classList.add('collapsed');
    renderNav();
    var me = CX.me, name = me.name || String(me.email || '').split('@')[0];
    set($('#me'), html`${avatar(name)}<div class="me-t grow" style="min-width:0"><div class="me-n trunc">${name}</div><div class="me-r">${me.role === 'super_admin' ? 'Super admin' : 'Admin'} · ${num(me.team)} on team</div></div>${icon('more', 'me-t')}`);
    $('#me').onclick = function () {
      menu($('#me'), [
        { label: 'Team & access', icon: 'key', fn: function () { go('team'); } },
        { label: (theme() === 'dark' ? 'Light' : 'Dark') + ' theme', icon: theme() === 'dark' ? 'sun' : 'moon', fn: toggleTheme },
        { label: 'Keyboard shortcuts', icon: 'cmd', fn: shortcuts },
        { label: 'Preview live site', icon: 'eye', fn: function () { preview(); } },
        '-',
        { label: 'Sign out', icon: 'logout', danger: true, fn: signOut }
      ]);
    };
    $('#search-btn').onclick = function () { palette(); };
    $('#theme-btn').onclick = toggleTheme;
    $('#refresh-btn').onclick = function () { var b = $('#refresh-btn'); b.querySelector('.ic').style.animation = 'spin .8s var(--ease)'; setTimeout(function () { b.querySelector('.ic').style.animation = ''; }, 820); refreshView(); };
    $('#preview-btn').onclick = function () { preview(); };
    $('#bell-btn').onclick = function () { go('inbox'); };
    $('#menu-btn').onclick = toggleSide;
    $('#collapse-btn').onclick = toggleSide;
    $('#side-scrim').onclick = function () { $('#app').classList.remove('nav-open'); };
    global.addEventListener('hashchange', route);
    doc.addEventListener('keydown', onKey);
    applyTheme();
    route();
    startPulse();
    hideBoot();
    setTimeout(prefetchDesks, 2500);
    sb.auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_OUT') global.location.reload(); });
  }
  function signOut() {
    confirm({ title: 'Sign out of the console?', body: 'You will need your password or Google to get back in.', confirm: 'Sign out', tone: 'warn', icon: 'logout' })
      .then(function (ok) { if (ok) store('operator', ''); if (ok) sb.auth.signOut().finally(function () { global.location.hash = ''; global.location.reload(); }); });
  }
  function start() {
    applyTheme();
    /* Legacy desk modules call window.toast(message, kind). */
    global.toast = function (m, k, ms) { return toast(m, k, ms ? { ms: ms } : null); };
    client();
    if (!sb) { hideBoot(); showGate({ error: 'The database client failed to load. Refresh the page.' }); return; }
    wireGate();
    sb.auth.getSession().then(function (r) {
      if (r && r.data && r.data.session) return enter();
      showGate({});
    }).catch(function () { showGate({}); });
  }

  /* ── 20 · EXPORT ─────────────────────────────────────────────────── */
  Object.assign(CX, {
    $: $, $$: $$, esc: esc, html: html, raw: raw, set: set, icon: icon, safeUrl: safeUrl, uid: uid, debounce: debounce, store: store,
    n: n, num: num, compact: compact, money: money, moneyC: moneyC, pct: pct, ratio: ratio, fdate: fdate, fshort: fshort, fdt: fdt, ago: ago, dur: dur, bytes: bytes,
    human: human, titleCase: titleCase, initials: initials, avatar: avatar, delta: delta, svc: svc, SERVICES: SERVICES, STAGE: STAGE, stagePill: stagePill, pill: pill, TONE: TONE,
    rpc: rpc, freshen: freshen, q: q, rows: rows, api: api, log: log, token: token, friendly: friendly, client: function () { return sb; },
    toast: toast, modal: modal, form: form, confirm: confirm, drawer: drawer, fieldHTML: fieldHTML, readForm: readForm, wireChips: wireChips,
    empty: empty, errorBox: errorBox, wireRetry: wireRetry, skeleton: skeleton, tabs: tabs, seg: seg, kv: kv, busy: busy, copy: copy, csv: csv, countUp: countUp, menu: menu,
    sparkline: sparkline, lineChart: lineChart, hbars: hbars, funnel: funnel, ring: ring,
    view: view, go: go, replaceHash: replaceHash, setArgs: function (args) { if (current && current.ctx) current.ctx.setArgs(args || []); }, buildHash: buildHash, refreshView: refreshView, open: open, preview: preview,
    pulseNow: pulseNow, paintBadges: paintBadges, inboxTotal: inboxTotal, NAV: NAV, NAV_BY: NAV_BY, theme: theme, DTF: DTF, TZ: TZ
  });
  global.CX = CX;
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { setTimeout(start, 0); });
  else setTimeout(start, 0);
})(window);
