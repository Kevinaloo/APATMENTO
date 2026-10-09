/* ═══════════════════════════════════════════════════════════════════
   CABANA LIVE · core
   ───────────────────────────────────────────────────────────────────
   The platform under /events: one document, real addresses.

     /events                     home
     /events/whats-on            ticketed events
     /events/live                live shows and concerts
     /events/movies              films
     /events/shows               series
     /events/music               the music room
     /events/e/<id>              one event
     /events/watch/<slug>        one film, series or live show
     /events/music/<videoId>     the party room for one record
     /events/music/playlist/<s>  a curated playlist
     /events/my-list             saved titles, events and tracks
     /events/search?q=           everything at once

   It is one document on purpose. The music dock keeps playing while a
   guest moves between tabs, and a tab change is a change of light, not
   a page load. Every address still works cold, from a shared link.

   Loaded before the views, the UI kit, the player and the music room;
   they all hang off window.CabanaLive.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var L = global.CabanaLive = global.CabanaLive || {};
  var doc = global.document;

  L.SB_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
  L.SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';
  L.FN = L.SB_URL + '/functions/v1/youtube-sync';
  L.BASE = '/events';

  var MIN = 60000, HOUR = 3600000, DAY = 86400000;
  L.MIN = MIN; L.HOUR = HOUR; L.DAY = DAY;

  /* ── small helpers ──────────────────────────────────────────────── */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function arr(v) {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') { try { var p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch (e) {} }
    return [];
  }
  function num(v) { var n = Number(v || 0); return isFinite(n) && n > 0 ? n : 0; }
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function compact(v) {
    var n = Math.floor(num(v));
    if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1).replace(/\.0$/, '') + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K';
    return String(n);
  }
  function clock(sec) {
    var s = Math.max(0, Math.floor(num(sec)));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    return (h ? h + ':' + pad(m) : m) + ':' + pad(r);
  }
  function money(n, cur) {
    return (cur || 'KES') + ' ' + (Number(n) || 0).toLocaleString('en-KE');
  }
  function runtime(min) {
    min = Math.round(num(min));
    if (!min) return '';
    return min < 60 ? min + 'm' : Math.floor(min / 60) + 'h ' + (min % 60 ? (min % 60) + 'm' : '');
  }
  function when(iso, opts) {
    var t = Date.parse(iso);
    if (isNaN(t)) return 'Date to be confirmed';
    var d = new Date(t);
    var day = d.toLocaleDateString('en-KE', opts && opts.long
      ? { weekday: 'long', day: 'numeric', month: 'long' }
      : { weekday: 'short', day: 'numeric', month: 'short' });
    return day + ' · ' + d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  function dayMonth(iso) {
    var d = new Date(Date.parse(iso));
    if (isNaN(d.getTime())) return { d: '—', m: 'TBC' };
    return { d: String(d.getDate()), m: d.toLocaleDateString('en-KE', { month: 'short' }).toUpperCase() };
  }
  function ago(iso) {
    var t = Date.parse(iso || '');
    if (isNaN(t)) return '';
    var m = Math.max(0, Math.floor((Date.now() - t) / MIN));
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
    var h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    var d = Math.floor(h / 24);
    if (d < 30) return d + 'd ago';
    return new Date(t).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
  }
  function slug(s) {
    return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  }
  function debounce(fn, ms) {
    var t;
    return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); };
  }
  function qs(sel, root) { return (root || doc).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }
  function mm(q) { try { return global.matchMedia && global.matchMedia(q).matches; } catch (e) { return false; } }
  function reduced() { return mm('(prefers-reduced-motion: reduce)'); }
  function saveData() {
    try { var c = navigator.connection; return !!(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))); } catch (e) { return false; }
  }
  function hover() { return mm('(hover: hover) and (pointer: fine)'); }
  function safeUrl(u) {
    u = String(u || '');
    return /^https:\/\/[^\s"'<>\\]+$/i.test(u) || /^\/[^\s"'<>\\]*$/.test(u) ? u : '';
  }
  function ytId(v) { return /^[A-Za-z0-9_-]{11}$/.test(String(v || '')) ? String(v) : ''; }
  /* hqdefault exists for every video and, cropped to 16:9, loses exactly
     its letterbox bars. maxresdefault is sharper but missing for some
     uploads, so it is only used where the image is checked on load. */
  function ytThumb(id, q) { return 'https://i.ytimg.com/vi/' + ytId(id) + '/' + (q || 'hqdefault') + '.jpg'; }

  /* YouTube titles carry the artist, the feature credits and often the
     words "Official Video". The display trims the noise; data is never
     altered. */
  function songOf(track) {
    var title = String((track && track.title) || '').trim();
    title = title
      .replace(/\s*[([][^)\]]*(official|video|audio|lyric|visuali[sz]er|hd|4k|mp3|music video)[^)\]]*[)\]]/gi, '')
      .replace(/\s*[|]\s*(official|vevo|spotify|live).*$/i, '')
      .replace(/\s+official (music )?video\s*$/i, '')
      .replace(/"/g, '')
      .trim();
    var artist = artistOf(track);
    if (artist && title.toLowerCase().indexOf(artist.toLowerCase() + ' - ') === 0) title = title.slice(artist.length + 3).trim();
    var dash = title.indexOf(' - ');
    if (dash > 0 && dash < 40 && title.toLowerCase().indexOf(artist.toLowerCase().split(' ')[0]) === 0) title = title.slice(dash + 3).trim();
    return title || (track && track.title) || 'Untitled';
  }
  function artistOf(track) {
    return String((track && track.artist) || '').replace(/\s*(VEVO|\bOfficial\b|#\S+|\bTV\b)\s*/gi, ' ').replace(/\s+/g, ' ').trim() || 'Unknown artist';
  }

  L.u = {
    esc: esc, arr: arr, num: num, pad: pad, compact: compact, clock: clock, money: money, runtime: runtime,
    when: when, dayMonth: dayMonth, ago: ago, slug: slug, debounce: debounce, qs: qs, qsa: qsa,
    reduced: reduced, saveData: saveData, hover: hover, safeUrl: safeUrl, ytId: ytId, ytThumb: ytThumb,
    songOf: songOf, artistOf: artistOf
  };

  /* ── icons ──────────────────────────────────────────────────────── */

  var P = {
    play: '<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" fill="currentColor" stroke="none"/>',
    pause: '<rect x="6" y="4" width="4.2" height="16" rx="1.2" fill="currentColor" stroke="none"/><rect x="13.8" y="4" width="4.2" height="16" rx="1.2" fill="currentColor" stroke="none"/>',
    next: '<path d="M5 5.5v13l9.5-6.5z" fill="currentColor" stroke="none"/><rect x="16" y="5" width="3" height="14" rx="1" fill="currentColor" stroke="none"/>',
    prev: '<path d="M19 5.5v13L9.5 12z" fill="currentColor" stroke="none"/><rect x="5" y="5" width="3" height="14" rx="1" fill="currentColor" stroke="none"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    arrowR: '<path d="M5 12h14M13 5l7 7-7 7"/>',
    chevR: '<path d="m9 5 7 7-7 7"/>',
    chevL: '<path d="m15 5-7 7 7 7"/>',
    chevD: '<path d="m6 9 6 6 6-6"/>',
    up: '<path d="m6 15 6-6 6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.2-4.2"/>',
    info: '<circle cx="12" cy="12" r="9.5"/><path d="M12 11v6M12 7.5v.5"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    ticket: '<path d="M3 9a2 2 0 0 0 0 6v2a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-2a2 2 0 0 0 0-6V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z"/><path d="M14 6v12" stroke-dasharray="2 2.5"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    share: '<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="m16 6-4-4-4 4M12 2v14"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.3l7.8-7.8 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
    crown: '<path d="m3 8 4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="currentColor" stroke="none"/>',
    live: '<circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/>',
    film: '<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M7 3v18M17 3v18M3 8h4M3 12h4M3 16h4M17 8h4M17 12h4M17 16h4"/>',
    tv: '<rect x="2.5" y="5" width="19" height="13" rx="2.5"/><path d="m8 21h8M9 2.5l3 2.5 3-2.5"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    home: '<path d="m3 11 9-8 9 8v9a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H4.5A1.5 1.5 0 0 1 3 20z"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
    party: '<path d="M4 20 9.5 7.5l7 7z"/><path d="M13 5.5c1-1.5 2.8-1.8 3.5-.5M18.5 10c1.5-.6 2.8.2 2.5 1.6M14.5 3l.5-1.5M20 7l1.5-.5"/>',
    volume: '<path d="M4 9.5v5h3.5L12 19V5L7.5 9.5z" fill="currentColor" stroke="none"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
    mute: '<path d="M4 9.5v5h3.5L12 19V5L7.5 9.5z" fill="currentColor" stroke="none"/><path d="m16 9 5 6M21 9l-5 6"/>',
    full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    pip: '<rect x="2.5" y="4.5" width="19" height="15" rx="2"/><rect x="12" y="11.5" width="7" height="5.5" rx="1" fill="currentColor" stroke="none"/>',
    rew: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><text x="12" y="15.5" font-size="7.5" text-anchor="middle" fill="currentColor" stroke="none" font-family="sans-serif" font-weight="700">10</text>',
    fwd: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/><text x="12" y="15.5" font-size="7.5" text-anchor="middle" fill="currentColor" stroke="none" font-family="sans-serif" font-weight="700">10</text>',
    shield: '<path d="M12 2.5 4 6v6c0 5 3.4 9.4 8 10 4.6-.6 8-5 8-10V6z"/><path d="m8.5 12 2.5 2.5 4.5-4.5"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    shuffle: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    globe: '<circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5a14.5 14.5 0 0 1 0 19M12 2.5a14.5 14.5 0 0 0 0 19"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>',
    ball: '<circle cx="12" cy="12" r="8.5"/><path d="m12 7.4 3.4 2.5-1.3 4H9.9l-1.3-4zM12 3.5v3.9M20.3 10.2l-4.9-.3M16.9 19.1l-2.8-5.2M7.1 19.1l2.8-5.2M3.7 10.2l4.9-.3"/>',
    palette: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.3 0 2-.9 2-1.9 0-1.3-1-1.6-1-2.8 0-1 .8-1.8 1.8-1.8H17a3.5 3.5 0 0 0 3.5-3.5c0-4-3.8-7-8.5-7Z"/><circle cx="7.8" cy="11" r="1.1" fill="currentColor" stroke="none"/><circle cx="10.5" cy="7.4" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="7.8" r="1.1" fill="currentColor" stroke="none"/>',
    balloon: '<path d="M12 3.5c3 0 5.5 2.6 5.5 5.9 0 3.5-2.8 6.6-5.5 6.6s-5.5-3.1-5.5-6.6c0-3.3 2.5-5.9 5.5-5.9Z"/><path d="m11 16-.6 1.4h3.2L13 16M12 17.5c0 2-1.5 2.2-1.5 4"/>',
    briefcase: '<rect x="3.5" y="7" width="17" height="12.5" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3.5 12.5h17"/>',
    people: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="16.8" cy="9.2" r="2.6"/><path d="M15.6 14.6c2.3-.3 4.3 1.2 4.9 4.4"/>',
    food: '<path d="M7 3.5v7.5M4.5 3.5v5a2.5 2.5 0 0 0 5 0v-5M7 11v9.5M16.5 20.5v-17c-2.2 1.2-3.5 3.7-3.5 6.8v3.7h3.5"/>'
  };
  L.ic = function (name, sw) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 2) +
      '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || '') + '</svg>';
  };

  /* ── events bus ─────────────────────────────────────────────────── */

  var subs = {};
  L.on = function (evt, fn) { (subs[evt] = subs[evt] || []).push(fn); return function () { L.off(evt, fn); }; };
  L.off = function (evt, fn) { subs[evt] = (subs[evt] || []).filter(function (f) { return f !== fn; }); };
  L.emit = function (evt, data) {
    (subs[evt] || []).slice().forEach(function (fn) { try { fn(data); } catch (e) { if (global.console) console.error('[live:' + evt + ']', e); } });
  };

  /* ── storage (a convenience, never the source of truth) ─────────── */

  L.store = {
    get: function (k, d) { try { var v = global.localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { global.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    sget: function (k) { try { return global.sessionStorage.getItem(k); } catch (e) { return null; } },
    sset: function (k, v) { try { global.sessionStorage.setItem(k, v); } catch (e) {} }
  };

  /* ── the one Supabase client ────────────────────────────────────── */

  var client = null;
  L.sb = function () {
    if (client) return client;
    try {
      if (global.ApaSession && global.ApaSession.client) client = global.ApaSession.client();
      if (!client && global.supabase && global.supabase.createClient) client = global.supabase.createClient(L.SB_URL, L.SB_KEY);
    } catch (e) { client = null; }
    return client;
  };

  L.session = function () {
    try { return (global.ApaSession && global.ApaSession.get && global.ApaSession.get()) || { status: 'guest' }; }
    catch (e) { return { status: 'guest' }; }
  };
  L.signedIn = function () { return L.session().status === 'user'; };
  L.signInUrl = function (next) { return '/auth?next=' + encodeURIComponent(next || (location.pathname + location.search)); };

  /* ── data ───────────────────────────────────────────────────────── */

  var D = L.data = {
    events: [], titles: [], billboard: [], playlists: [], episodes: {},
    chart: { tracks: [], artists: [], awards: [], releases: [], meta: null },
    state: null, loaded: { core: false, chart: false, playlists: false }
  };

  function q(table, build) {
    var c = L.sb();
    if (!c) return Promise.resolve([]);
    var query = build(c.from(table));
    return Promise.resolve(query).then(function (r) { return (r && r.data) || []; }, function () { return []; });
  }

  L.loadCore = function () {
    return Promise.all([
      q('events_public', function (t) { return t.select('*').order('starts_at', { ascending: true }); }),
      q('live_titles', function (t) { return t.select('*').eq('status', 'published').order('featured', { ascending: false }).order('sort_order', { ascending: false }).order('published_at', { ascending: false }); }),
      q('live_billboard', function (t) { return t.select('*').eq('status', 'published').order('sort_order', { ascending: false }).order('created_at', { ascending: false }); })
    ]).then(function (r) {
      D.events = r[0];
      D.titles = r[1].map(normTitle);
      D.billboard = r[2];
      /* Ticket prices are shown all-in (Cabana's fee inside). Warm the
         answers before painting, but never hold the page for them. */
      var prices = [];
      D.events.forEach(function (e) {
        if (Number(e.price_from) > 0) prices.push(Number(e.price_from));
        arr(e.tiers || e.ticket_tiers).forEach(function (x) { if (Number(x.price_kes) > 0) prices.push(Number(x.price_kes)); });
      });
      var warm = prices.length && window.ApaFees ? window.ApaFees.allInMany('events', prices) : Promise.resolve();
      return Promise.race([warm, new Promise(function (res) { setTimeout(res, 1500); })]).then(function () {
        D.loaded.core = true;
        L.emit('data', 'core');
        Promise.resolve(warm).then(function () { if (D._allInPainted !== true) { D._allInPainted = true; L.emit('data', 'core'); } });
      });
    });
  };
  /* The price a guest sees for one ticket at this face value. */
  L.allIn = function (price) {
    var p = Number(price) || 0;
    var r = p > 0 && window.ApaFees && window.ApaFees.allInSync ? window.ApaFees.allInSync('events', p) : null;
    return r ? r.total : p;
  };

  function normTitle(t) {
    t.genres = arr(t.genres);
    t.cast_list = arr(t.cast_list);
    return t;
  }

  /* The chart paints from the public views straight away, and the sync
     function's answer upgrades it when it lands. The function can take
     seconds when the board is due a refresh; nobody waits on that. */
  function setChart(p, from) {
    var tracks = arr(p.tracks).filter(function (t) { return ytId(t.videoId); });
    if (!tracks.length && D.chart.tracks.length) return;
    if (from === 'rest' && D._chartFrom === 'fn') return;
    D.chart = {
      tracks: tracks,
      artists: arr(p.artists),
      awards: arr(p.awards),
      releases: arr(p.releases).filter(function (t) { return ytId(t.videoId); }),
      meta: p.meta || D.chart.meta || null
    };
    D._chartFrom = from;
    D.loaded.chart = true;
    L.emit('data', 'chart');
  }

  function chartFromRest() {
    function rest(path) {
      return fetch(L.SB_URL + '/rest/v1/' + path, { headers: { apikey: L.SB_KEY, Authorization: 'Bearer ' + L.SB_KEY } })
        .then(function (r) { if (!r.ok) throw new Error('rest'); return r.json(); });
    }
    return Promise.all([
      rest('music_chart_public?market=eq.KE&order=rank.asc'),
      rest('music_artists_public?market=eq.KE&order=rank.asc&limit=20'),
      rest('music_chart_awards?market=eq.KE&order=period_start.desc'),
      rest('music_releases_public?order=published_at.desc&limit=40'),
      rest('music_chart_meta?market=eq.KE&select=last_refreshed_at,source&limit=1').catch(function () { return []; })
    ]).then(function (p) {
      return {
        tracks: p[0].map(function (x) { return { videoId: x.video_id, rank: x.rank, previousRank: x.previous_rank, title: x.title, artist: x.artist, thumb: x.thumbnail_url, views: x.views, likes: x.likes, viewsDelta: x.views_delta, durationSeconds: x.duration_seconds, genre: x.genre, culture: x.culture, format: x.format, published: x.published_at }; }),
        artists: p[1].map(function (x) { return { key: x.artist_key, name: x.artist, rank: x.rank, previousRank: x.previous_rank, tracks: x.tracks_count, bestRank: x.best_rank, views: x.total_views, viewsDelta: x.views_delta, leadVideoId: x.lead_video_id, thumb: x.thumbnail_url, genre: x.genre }; }),
        awards: p[2].map(function (x) { return { period: x.period, name: x.artist, key: x.artist_key, viewsDelta: x.views_delta, days: x.days_counted, thumb: x.thumbnail_url, leadVideoId: x.lead_video_id }; }),
        releases: p[3].map(function (x) { return { videoId: x.video_id, title: x.title, artist: x.artist, thumb: x.thumbnail_url, published: x.published_at, views: x.views, likes: x.likes, velocity: x.velocity, genre: x.genre, culture: x.culture }; }),
        meta: p[4][0] || null
      };
    });
  }

  L.loadChart = function (force) {
    if (D._chartP && !force) return D._chartP;
    var rest = chartFromRest().then(function (p) { setChart(p, 'rest'); return p; }, function () { return null; });
    var ctrl = null, timer = null;
    try { ctrl = new AbortController(); timer = setTimeout(function () { ctrl.abort(); }, 30000); } catch (e) {}
    var fn = fetch(L.FN + '?action=chart', ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) { if (!r.ok) throw new Error('chart_' + r.status); return r.json(); })
      .then(function (p) { if (timer) clearTimeout(timer); if (!p || p.error) throw new Error('chart'); setChart(p, 'fn'); return p; })
      .catch(function () { return null; });
    D._chartP = Promise.race([
      rest.then(function (p) { return p || fn; }),
      fn.then(function (p) { return p || rest; })
    ]).then(function () { return D.chart; });
    return D._chartP;
  };

  L.loadPlaylists = function () {
    if (D._plP) return D._plP;
    D._plP = Promise.all([
      q('music_playlists', function (t) { return t.select('*').eq('status', 'published').order('featured', { ascending: false }).order('sort_order', { ascending: false }); }),
      q('music_playlist_items', function (t) { return t.select('*').order('position', { ascending: true }); })
    ]).then(function (r) {
      var items = {};
      r[1].forEach(function (it) { (items[it.playlist_id] = items[it.playlist_id] || []).push(it); });
      D.playlists = r[0].map(function (p) {
        p.items = (items[p.id] || []).map(function (it) {
          return { videoId: it.video_id, title: it.title, artist: it.artist || '', thumb: it.thumbnail_url || ytThumb(it.video_id), durationSeconds: it.duration_seconds };
        });
        return p;
      }).filter(function (p) { return p.items.length; });
      D.loaded.playlists = true;
      L.emit('data', 'playlists');
      return D.playlists;
    });
    return D._plP;
  };

  L.loadEpisodes = function (titleId) {
    if (D.episodes[titleId]) return Promise.resolve(D.episodes[titleId]);
    return q('live_episodes', function (t) {
      return t.select('*').eq('title_id', titleId).eq('status', 'published').order('season', { ascending: true }).order('number', { ascending: true });
    }).then(function (rows) { D.episodes[titleId] = rows; return rows; });
  };

  /* Published rows can change while the page is open: a show goes live,
     a slide is scheduled in, an event sells down. */
  var live = null, reloadT = null;
  L.subscribe = function () {
    var c = L.sb();
    if (!c || !c.channel || live) return;
    function soon() { clearTimeout(reloadT); reloadT = setTimeout(function () { L.loadCore(); }, 700); }
    try {
      live = c.channel('cabana-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'live_titles' }, soon)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'live_billboard' }, soon)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, soon)
        .subscribe();
    } catch (e) { live = null; }
  };

  /* ── time ───────────────────────────────────────────────────────── */

  /* One definition of "is this soon" for the whole platform. */
  L.timeTo = function (startIso, endIso, now) {
    now = now || Date.now();
    var start = Date.parse(startIso);
    if (isNaN(start)) return { heat: 'tbc', label: 'Date TBC', ms: 0 };
    var end = endIso ? Date.parse(endIso) : start + 6 * HOUR;
    if (now >= start && now < end) return { heat: 'live', label: 'Happening now', live: true, ms: 0 };
    if (now >= end) return { heat: 'done', label: 'Finished', over: true, ms: 0 };
    var ms = start - now;
    var d = Math.floor(ms / DAY), h = Math.floor((ms % DAY) / HOUR), m = Math.floor((ms % HOUR) / MIN), s = Math.floor((ms % MIN) / 1000);
    var heat = ms < HOUR ? 'final' : ms < DAY ? 'today' : ms < 7 * DAY ? 'soon' : 'calm';
    var label = d > 0 ? d + 'd ' + pad(h) + 'h' : h > 0 ? h + 'h ' + pad(m) + 'm' : pad(m) + ':' + pad(s);
    return { heat: heat, label: label, ms: ms, d: d, h: h, m: m, s: s };
  };

  L.upcomingEvents = function () {
    var now = Date.now();
    return D.events.filter(function (e) {
      var end = e.ends_at ? Date.parse(e.ends_at) : Date.parse(e.starts_at) + 6 * HOUR;
      return !isNaN(end) && end > now;
    }).sort(function (a, b) { return Date.parse(a.starts_at) - Date.parse(b.starts_at); });
  };

  L.titleState = function (t, now) {
    now = now || Date.now();
    if (t.release_at && Date.parse(t.release_at) > now) return 'soon';
    if (t.kind === 'live') {
      var s = Date.parse(t.live_starts_at), e = t.live_ends_at ? Date.parse(t.live_ends_at) : s + 4 * HOUR;
      if (!isNaN(s) && now < s) return 'upcoming';
      if (!isNaN(s) && now >= s && now < e) return 'live';
      return t.replay ? 'replay' : 'ended';
    }
    return 'available';
  };
  L.isNew = function (t) { var p = Date.parse(t.published_at || t.created_at); return !isNaN(p) && Date.now() - p < 21 * DAY; };

  /* One place builds each kind of address. */
  L.href = {
    event: function (e) { return L.BASE + '/e/' + encodeURIComponent(e.slug || e.id); },
    title: function (t) { return L.BASE + '/watch/' + encodeURIComponent(t.slug); },
    track: function (id) { return L.BASE + '/music/' + encodeURIComponent(id); },
    playlist: function (p) { return L.BASE + '/music/playlist/' + encodeURIComponent(p.slug); },
    tab: function (k) { return k === 'home' ? L.BASE : L.BASE + '/' + ({ events: 'whats-on' }[k] || k); }
  };

  L.findEvent = function (key) {
    key = String(key);
    for (var i = 0; i < D.events.length; i++) {
      if (String(D.events[i].id) === key || (D.events[i].slug && D.events[i].slug === key)) return D.events[i];
    }
    return null;
  };
  L.findTitle = function (key) {
    for (var i = 0; i < D.titles.length; i++) if (D.titles[i].slug === key || D.titles[i].id === key) return D.titles[i];
    return null;
  };
  L.findTrack = function (id) {
    var pools = [D.chart.tracks, D.chart.releases];
    D.playlists.forEach(function (p) { pools.push(p.items); });
    for (var i = 0; i < pools.length; i++) {
      for (var j = 0; j < pools[i].length; j++) if (pools[i][j].videoId === id) return pools[i][j];
    }
    return null;
  };

  /* ── premium ────────────────────────────────────────────────────── */

  L.loadState = function () {
    var c = L.sb();
    if (!c || !c.rpc) return Promise.resolve(null);
    return c.rpc('live_state').then(function (r) {
      if (r && r.data) { D.state = r.data; L.emit('state', D.state); }
      return D.state;
    }, function () { return null; });
  };
  L.premium = function () { return !!(D.state && D.state.premium); };
  L.trialDays = function () { return (D.state && D.state.trial_days) || 30; };

  /* Claim the free month. Signs in first when needed; returns true once
     the member holds premium. */
  L.claimTrial = function () {
    if (!L.signedIn()) { location.href = L.signInUrl(location.pathname + location.search + (location.search ? '&' : '?') + 'claim=1'); return Promise.resolve(false); }
    var c = L.sb();
    if (!c) return Promise.resolve(false);
    return c.rpc('live_start_trial').then(function (r) {
      if (r.error) throw r.error;
      D.state = r.data;
      L.emit('state', D.state);
      if (r.data && r.data.started) {
        L.toast('Your free month has started. Enjoy Cabana Live Premium.');
        try { if (global.CabanaTelemetry) global.CabanaTelemetry.track('live_trial_start', {}); } catch (e) {}
      } else if (r.data && r.data.reason === 'trial_used') {
        L.toast('Your free month has already been used on this account.');
      }
      return !!(r.data && r.data.premium);
    }).catch(function () { L.toast('Could not start your free month just now. Please try again.'); return false; });
  };

  /* ── My List ────────────────────────────────────────────────────── */

  var LOCAL_SAVES = 'cabana-live-saves';
  var saves = {};
  function skey(kind, ref) { return kind + ':' + ref; }
  L.saves = {
    has: function (kind, ref) { return !!saves[skey(kind, ref)]; },
    all: function () { return Object.keys(saves).map(function (k) { return saves[k]; }); },
    load: function () {
      saves = {};
      L.store.get(LOCAL_SAVES, []).forEach(function (s) { if (s && s.kind && s.ref) saves[skey(s.kind, s.ref)] = s; });
      var c = L.sb();
      if (!L.signedIn() || !c) { L.emit('saves'); return Promise.resolve(); }
      return c.from('live_saves').select('kind,ref,remind,created_at').then(function (r) {
        var remote = (r && r.data) || [];
        /* Anything saved while signed out is carried into the account. */
        var local = L.store.get(LOCAL_SAVES, []);
        var missing = local.filter(function (s) { return !remote.some(function (x) { return x.kind === s.kind && x.ref === s.ref; }); });
        if (missing.length) {
          c.from('live_saves').upsert(missing.map(function (s) { return { kind: s.kind, ref: String(s.ref), remind: !!s.remind }; }), { onConflict: 'user_id,kind,ref' }).then(function () {}, function () {});
        }
        remote.concat(missing).forEach(function (s) { saves[skey(s.kind, s.ref)] = s; });
        L.store.set(LOCAL_SAVES, []);
        L.emit('saves');
      }, function () { L.emit('saves'); });
    },
    toggle: function (kind, ref, opts) {
      ref = String(ref);
      var k = skey(kind, ref), on = !saves[k];
      if (on) saves[k] = { kind: kind, ref: ref, remind: !!(opts && opts.remind), created_at: new Date().toISOString() };
      else delete saves[k];
      var c = L.sb();
      if (L.signedIn() && c) {
        var p = on
          ? c.from('live_saves').upsert({ kind: kind, ref: ref, remind: !!(opts && opts.remind) }, { onConflict: 'user_id,kind,ref' })
          : c.from('live_saves').delete().eq('kind', kind).eq('ref', ref);
        Promise.resolve(p).then(function () {}, function () {});
      } else {
        L.store.set(LOCAL_SAVES, L.saves.all());
      }
      L.emit('saves');
      L.toast(on ? (opts && opts.remind ? 'We will remind you. Saved to My List, under the heart at the top.' : 'Saved to My List. Find it under the heart at the top.') : 'Removed from My List');
      return on;
    }
  };

  /* ── on-demand modules ────────────────────────────────────────────
     Karaoke, the light show and their styles are fetched the first
     time they are needed, so the platform's first paint carries none
     of them. Each file is requested once; order is kept. */
  var fetched = {};
  L.loadScript = function (src) {
    if (fetched[src]) return fetched[src];
    fetched[src] = new Promise(function (resolve, reject) {
      var s = doc.createElement('script');
      s.src = src; s.async = false;
      s.onload = function () { resolve(); };
      s.onerror = function () { delete fetched[src]; reject(new Error('load ' + src)); };
      doc.head.appendChild(s);
    });
    return fetched[src];
  };
  L.loadStyle = function (href) {
    if (fetched[href]) return fetched[href];
    fetched[href] = new Promise(function (resolve) {
      var l = doc.createElement('link');
      l.rel = 'stylesheet'; l.href = href;
      l.onload = function () { resolve(); };
      l.onerror = function () { delete fetched[href]; resolve(); };
      doc.head.appendChild(l);
      setTimeout(resolve, 2500);
    });
    return fetched[href];
  };

  /* ── toast ──────────────────────────────────────────────────────── */

  var toastEl = null, toastT = null;
  L.toast = function (msg) {
    if (!toastEl) { toastEl = doc.createElement('div'); toastEl.className = 'lv-toast'; toastEl.setAttribute('role', 'status'); doc.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2800);
  };

  /* ── modal ──────────────────────────────────────────────────────── */

  var modalEl = null, modalFocus = null;
  L.modal = function (html, opts) {
    L.closeModal(true);
    modalFocus = doc.activeElement;
    modalEl = doc.createElement('div');
    modalEl.className = 'lv-modal-veil';
    modalEl.innerHTML = '<div class="lv-modal' + (opts && opts.gold ? ' is-gold' : '') + '" role="dialog" aria-modal="true" tabindex="-1">' +
      '<button class="lv-modal-x" type="button" aria-label="Close">' + L.ic('x') + '</button>' + html + '</div>';
    doc.body.appendChild(modalEl);
    doc.documentElement.classList.add('lv-lock');
    requestAnimationFrame(function () { if (modalEl) { modalEl.classList.add('is-on'); modalEl.querySelector('.lv-modal').focus(); } });
    modalEl.addEventListener('click', function (e) {
      if (e.target === modalEl || e.target.closest('.lv-modal-x') || e.target.closest('[data-close]')) L.closeModal();
    });
    return modalEl.querySelector('.lv-modal');
  };
  L.closeModal = function (instant) {
    if (!modalEl) return;
    var m = modalEl; modalEl = null;
    doc.documentElement.classList.remove('lv-lock');
    if (instant) m.remove();
    else { m.classList.remove('is-on'); setTimeout(function () { m.remove(); }, 320); }
    if (modalFocus && modalFocus.focus) try { modalFocus.focus(); } catch (e) {}
  };
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modalEl) L.closeModal(); });

  /* The paywall conversation, in one place. reason comes from live_play:
     signin, premium. */
  L.gate = function (reason, opts) {
    opts = opts || {};
    var st = D.state || {};
    var days = st.trial_days || 30;
    var name = st.premium_name || 'Cabana Live Premium';
    var title = opts.title ? '<b>' + esc(opts.title) + '</b> is part of ' + esc(name) + '. ' : '';
    var trial = st.trial_enabled !== false && !st.trial_used;
    var body;
    if (reason === 'signin' || !L.signedIn()) {
      body = '<div class="lv-prem-mono" style="margin:0 auto">' + L.ic('crown') + '</div>' +
        '<h2>Enjoy one month free</h2>' +
        '<p>' + title + 'Sign in and your first ' + days + ' days of live shows, movies, series and concerts are on us. No card needed.</p>' +
        '<div class="acts"><a class="lv-btn lv-btn-gold" href="' + esc(L.signInUrl(location.pathname + location.search + (location.search ? '&' : '?') + 'claim=1')) + '">' + L.ic('crown') + 'Sign in to start free</a>' +
        '<button class="lv-btn lv-btn-ghost" type="button" data-close>Not now</button></div>';
    } else if (trial) {
      body = '<div class="lv-prem-mono" style="margin:0 auto">' + L.ic('crown') + '</div>' +
        '<h2>Your first month is free</h2>' +
        '<p>' + title + 'Start your ' + days + '-day free access now. Everything on Cabana Live opens straight away.</p>' +
        '<div class="acts"><button class="lv-btn lv-btn-gold" type="button" data-claim>' + L.ic('crown') + 'Start my free month</button>' +
        '<button class="lv-btn lv-btn-ghost" type="button" data-close>Maybe later</button></div>' +
        '<small>' + (st.price_kes ? 'Then ' + money(st.price_kes) + ' a ' + (st.price_period || 'month') + '. Cancel any time.' : 'Plans and pricing will be announced before your free month ends.') + '</small>';
    } else {
      body = '<div class="lv-prem-mono" style="margin:0 auto">' + L.ic('crown') + '</div>' +
        '<h2>' + esc(name) + '</h2>' +
        '<p>' + title + 'Your free month has been used on this account. ' +
        (st.price_kes ? 'Continue for ' + money(st.price_kes) + ' a ' + (st.price_period || 'month') + '.' : 'Premium plans are launching soon, and we will let you know the moment they do.') + '</p>' +
        '<div class="acts"><a class="lv-btn lv-btn-gold" href="/help" data-cbn-support>' + L.ic('crown') + 'Talk to us about access</a>' +
        '<button class="lv-btn lv-btn-ghost" type="button" data-close>Close</button></div>';
    }
    var m = L.modal(body, { gold: true });
    var claim = m.querySelector('[data-claim]');
    if (claim) claim.addEventListener('click', function () {
      claim.classList.add('is-busy');
      L.claimTrial().then(function (ok) {
        claim.classList.remove('is-busy');
        if (ok) { L.closeModal(); if (opts.onUnlock) opts.onUnlock(); }
      });
    });
  };

  /* ── share and calendar ─────────────────────────────────────────── */

  L.share = function (title, text, url) {
    url = url || location.href;
    /* The site-wide sheet when it is on the page: the same choices on a
       desktop as a phone gets, and a QR code for the one on the desk. */
    if (global.CabanaShare) { global.CabanaShare.share({ title: title, text: text, url: url, heading: 'Share this event' }); return; }
    if (navigator.share) { navigator.share({ title: title, text: text, url: url }).catch(function () {}); return; }
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { L.toast('Link copied'); }, function () { L.toast(url); });
    else L.toast(url);
  };

  L.ics = function (e) {
    function stamp(iso) { return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
    var start = Date.parse(e.starts_at);
    if (isNaN(start)) return;
    var end = e.ends_at ? e.ends_at : new Date(start + 4 * HOUR).toISOString();
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cabana//Cabana Live//EN', 'BEGIN:VEVENT',
      'UID:cabana-event-' + e.id + '@cabana.africa', 'DTSTAMP:' + stamp(new Date().toISOString()),
      'DTSTART:' + stamp(e.starts_at), 'DTEND:' + stamp(end),
      'SUMMARY:' + String(e.title || '').replace(/[,;\n]/g, ' '),
      'LOCATION:' + [e.venue, e.address, e.city].filter(Boolean).join(', ').replace(/[;\n]/g, ' '),
      'URL:https://cabana.africa' + L.href.event(e),
      'DESCRIPTION:' + String(e.tagline || 'Tickets on Cabana').replace(/[;\n]/g, ' '),
      'END:VEVENT', 'END:VCALENDAR'];
    var blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    var a = doc.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = slug(e.title || 'event') + '.ics';
    doc.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
  };

  /* ── the router ─────────────────────────────────────────────────── */

  var routes = [];
  var current = null;
  L.route = function (pattern, handler, meta) { routes.push({ rx: pattern, fn: handler, meta: meta || {} }); };

  function match(path) {
    for (var i = 0; i < routes.length; i++) {
      var m = routes[i].rx.exec(path);
      if (m) return { r: routes[i], params: m.slice(1).map(function (x) { try { return decodeURIComponent(x); } catch (e) { return x; } }) };
    }
    return null;
  }

  function scrollKey() { return 'lvscroll:' + location.pathname + location.search; }

  L.go = function (url, opts) {
    opts = opts || {};
    var u;
    try { u = new URL(url, location.href); } catch (e) { location.href = url; return; }
    if (u.origin !== location.origin || !isOurs(u.pathname)) { location.href = u.href; return; }
    L.store.sset(scrollKey(), String(global.scrollY || 0));
    /* d counts the steps taken inside Cabana Live, so a page's own back
       button knows whether going back stays here or leaves the site */
    var d = (history.state && history.state.d) || 0;
    if (opts.replace) history.replaceState({ lv: 1, d: d }, '', u.pathname + u.search + u.hash);
    else history.pushState({ lv: 1, d: d + 1 }, '', u.pathname + u.search + u.hash);
    render({ fresh: !opts.keepScroll });
  };

  function isOurs(p) { return p === L.BASE || p === L.BASE + '/' || p.indexOf(L.BASE + '/') === 0 || p === '/events.html'; }

  var painted = 0;
  function render(opts) {
    var path = location.pathname.replace(/\/+$/, '').replace(/^\/events\.html$/, L.BASE) || L.BASE;
    var hit = match(path) || match(L.BASE);
    var view = qs('#lv-view');
    if (!view || !hit) return;

    if (current && current.leave) { try { current.leave(); } catch (e) {} }
    L.closeModal(true);
    var ctx = { params: hit.params, query: new URLSearchParams(location.search), el: view, meta: hit.r.meta, alive: null };
    var token = {};
    ctx.alive = function () { return current && current.token === token; };
    current = { token: token, leave: null, ctx: ctx };
    ctx.onLeave = function (fn) { current.leave = fn; };

    var tab = hit.r.meta.tab || 'home';
    var root = qs('.lv');
    if (root) root.setAttribute('data-tab', tab);
    L.emit('route', { tab: tab, path: path, meta: hit.r.meta });

    function paint() {
      view.classList.remove('is-entering');
      void view.offsetWidth;
      view.classList.add('is-entering');
      try { hit.r.fn(ctx); } catch (e) {
        if (global.console) console.error('[live:route]', e);
        view.innerHTML = '<div class="lv-page-top"><div class="lv-empty"><h3>Something went wrong</h3><p>This page could not be drawn. Try again in a moment.</p><div class="acts"><a class="lv-btn" href="' + L.BASE + '" data-link>Back to Cabana Live</a></div></div></div>';
      }
      if (opts && opts.fresh) global.scrollTo(0, 0);
      else {
        var y = Number(L.store.sget(scrollKey()) || 0);
        requestAnimationFrame(function () { global.scrollTo(0, y); });
      }
      // Site scripts that hang on page elements (the ad engine's in-results
      // slot) look again when the view changes.
      try { global.dispatchEvent(new global.CustomEvent('cabana:navigate', { detail: { tab: tab, path: path, initial: !painted++ } })); } catch (e) {}
    }
    if (doc.startViewTransition && !reduced() && opts && opts.transition) doc.startViewTransition(paint);
    else paint();
  }
  L.rerender = function () { render({ keepScroll: true }); };
  /* Back inside Cabana Live when there is somewhere to go back to;
     otherwise to the given page. */
  L.back = function (fallback) {
    if (history.state && history.state.d > 0) history.back();
    else L.go(fallback || L.BASE, { replace: true });
  };

  /* A detail page learns its tab only once its data is known (a series
     belongs under Shows, a live show under Live). */
  L.setTab = function (tab) {
    var root = qs('.lv');
    if (root && root.getAttribute('data-tab') !== tab) root.setAttribute('data-tab', tab);
    L.emit('route', { tab: tab, path: location.pathname, meta: { detail: true } });
  };

  L.setMeta = function (title, description) {
    doc.title = title ? title + ' | Cabana Live' : 'Cabana Live · Events, Live Shows, Movies & Music | Cabana';
    if (description) {
      var m = qs('meta[name="description"]');
      if (m) m.setAttribute('content', description);
    }
  };

  /* Listened for on window in the capture phase, so Cabana Live's own links
     are handled before any site-wide script can turn them into a reload.
     A button inside a link (save, play) still gets its own click. */
  function onClick(e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download') || a.getAttribute('rel') === 'external') return;
    var inner = e.target.closest('button,[data-act],input,select,textarea');
    if (inner && inner !== a && a.contains(inner)) return;
    var raw = a.getAttribute('href');
    /* The page has <base href="/">, so an in-page #anchor is resolved here
       rather than by the browser (which would leave for the homepage). */
    if (raw.charAt(0) === '#') {
      e.preventDefault();
      var target = raw.length > 1 && doc.getElementById(raw.slice(1));
      if (target) {
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        target.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
      }
      return;
    }
    var u;
    try { u = new URL(raw, location.href); } catch (x) { return; }
    if (u.origin !== location.origin || !isOurs(u.pathname)) return;
    e.preventDefault();
    if (u.pathname === location.pathname && u.search === location.search) {
      if (u.hash) { var h = doc.getElementById(u.hash.slice(1)); if (h) h.scrollIntoView({ behavior: 'smooth' }); }
      else global.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
      return;
    }
    L.go(u.pathname + u.search + u.hash);
  }

  L.start = function () {
    /* Addresses from the old page keep working. */
    var qp = new URLSearchParams(location.search);
    if (qp.get('open')) history.replaceState({ lv: 1 }, '', L.BASE + '/e/' + encodeURIComponent(qp.get('open')));
    else if (qp.get('room') === 'music') history.replaceState({ lv: 1 }, '', L.BASE + '/music');
    else if (location.pathname === '/events.html') history.replaceState({ lv: 1 }, '', L.BASE + location.search);

    try { history.scrollRestoration = 'manual'; } catch (e) {}
    global.addEventListener('click', onClick, true);
    global.addEventListener('popstate', function () {
      /* A closing overlay steps back through its own history entry; that
         pop is not a navigation. A back gesture with an overlay open
         closes the overlay instead of leaving the page. */
      if (L._popSkip) { L._popSkip = false; return; }
      if (L.overlayBack && L.overlayBack()) return;
      render({ fresh: false });
    });
    render({ fresh: true });
  };

  /* ── boot ───────────────────────────────────────────────────────
     Every module is a deferred script, and deferred scripts all run
     before DOMContentLoaded. So the platform starts here, once the
     views, the player and the music room have registered. */
  function boot() {
    if (L._booted) return;
    L._booted = true;
    if (L.ui) { L.ui.chrome(); L.ui.sting(); L.ui.startTicker(); }
    L.start();
    L.loadCore();
    L.loadChart();
    L.loadPlaylists();
    L.subscribe();

    var lastStatus = null;
    function onSession(st) {
      var status = (st && st.status) || 'guest';
      if (status === lastStatus) return;
      lastStatus = status;
      L.loadState().then(function () { if (L.ui) L.ui.paintAccount(); L.navDone(); });
      L.saves.load();
    }
    if (global.ApaSession && global.ApaSession.subscribe) {
      try { global.ApaSession.subscribe(onSession); } catch (e) { onSession({ status: 'guest' }); }
    } else onSession({ status: 'guest' });

    /* A stale board is worse than a slow one. */
    var away = 0;
    doc.addEventListener('visibilitychange', function () {
      if (doc.hidden) { away = Date.now(); return; }
      if (away && Date.now() - away > 10 * MIN) { L.loadCore(); L.loadChart(true); L.loadState(); }
      away = 0;
    });
  }
  /* Deferred scripts execute while readyState is already "interactive",
     so readyState cannot tell us the other modules have run; only
     DOMContentLoaded can. load is the backstop for a late injection. */
  if (doc.readyState === 'complete') setTimeout(boot, 0);
  else {
    doc.addEventListener('DOMContentLoaded', boot);
    global.addEventListener('load', boot);
  }

  L.navDone = function () {
    /* Claim flow comes back from sign-in with ?claim=1. */
    var qp = new URLSearchParams(location.search);
    if (qp.get('claim') === '1' && L.signedIn()) {
      qp.delete('claim');
      history.replaceState({ lv: 1 }, '', location.pathname + (qp.toString() ? '?' + qp : ''));
      if (!L.premium()) L.gate('premium');
    }
  };
})(window);
