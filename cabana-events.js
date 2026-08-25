/* ═══════════════════════════════════════════════════════════════════
   CABANA · EVENTS — the engine
   ───────────────────────────────────────────────────────────────────
   First-party inventory from public.events_public. The old page read
   scraped_events — 103 rows lifted from Eventbrite, Ticketsasa and
   TipsiTickets, of which 99 had already happened — and then filtered
   to rows with photos, so it rendered almost nothing.

   The centre of this file is the clock.

   ONE ticker drives every countdown on the page. A page with thirty
   events gets one setInterval, not thirty. Each tick recomputes the
   remaining time and, more importantly, the HEAT: a card two weeks
   out looks calm, one inside the hour burns, one that has started
   goes live. Nobody edits that — it falls out of starts_at.

   Time is handled as absolute instants. starts_at is timestamptz and
   Date.parse gives us epoch ms, so the countdown is correct for a
   visitor in Nairobi and one in London without special-casing either.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var SB_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';

  var sb = null;
  try {
    if (window.supabase && window.supabase.createClient) sb = window.supabase.createClient(SB_URL, SB_KEY);
  } catch (e) {}

  var MIN = 60000, HOUR = 3600000, DAY = 86400000;

  var CATS = [
    { key: 'all',       label: 'Everything' },
    { key: 'music',     label: 'Music' },
    { key: 'festival',  label: 'Festivals' },
    { key: 'nightlife', label: 'Nightlife' },
    { key: 'comedy',    label: 'Comedy' },
    { key: 'sports',    label: 'Sports' },
    { key: 'art',       label: 'Arts' },
    { key: 'food',      label: 'Food & drink' }
  ];

  var state = { events: [], filter: 'all', q: '', sort: 'soonest', loaded: false, lastSec: -1,
               locPlace: null, liveChannel: null, reloadTimer: null };
  var clockTimer = null;

  /* ── helpers ─────────────────────────────────────────────────────── */

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
  function money(n) { return 'KES ' + (Number(n) || 0).toLocaleString('en-KE'); }
  function el(id) { return document.getElementById(id); }
  function pad(n) { return n < 10 ? '0' + n : String(n); }

  /* ── the clock ───────────────────────────────────────────────────── */

  /* Remaining time plus the heat band it falls in. Everything visual
     downstream keys off .heat, so there is exactly one definition of
     "is this soon" in the whole page. */
  function timeTo(ev, now) {
    var start = Date.parse(ev.starts_at);
    if (isNaN(start)) return { heat: 'done', label: 'Date to be confirmed', ms: 0 };

    var end = ev.ends_at ? Date.parse(ev.ends_at) : start + 6 * HOUR;
    var ms = start - now;

    if (now >= start && now < end) {
      return { heat: 'live', label: 'HAPPENING NOW', ms: 0, live: true };
    }
    if (now >= end) return { heat: 'done', label: 'Finished', ms: 0, over: true };

    var d = Math.floor(ms / DAY);
    var h = Math.floor((ms % DAY) / HOUR);
    var m = Math.floor((ms % HOUR) / MIN);
    var s = Math.floor((ms % MIN) / 1000);

    var heat = ms < HOUR ? 'final'
             : ms < DAY  ? 'today'
             : ms < 7 * DAY ? 'soon'
             : 'calm';

    // Below a day, seconds matter. Above it, they are noise.
    var label = d > 0 ? d + 'd ' + pad(h) + 'h ' + pad(m) + 'm'
              : h > 0 ? pad(h) + ':' + pad(m) + ':' + pad(s)
              :         pad(m) + ':' + pad(s);

    return { heat: heat, label: label, ms: ms, d: d, h: h, m: m, s: s };
  }

  function whenLabel(ev) {
    var t = Date.parse(ev.starts_at);
    if (isNaN(t)) return 'Date TBC';
    var dt = new Date(t);
    return dt.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' }) +
           ' · ' + dt.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  /* One interval for the entire page. */
  function startClock() {
    tick();
    if (!clockTimer) clockTimer = setInterval(tick, 1000);
  }

  function tick() {
    var now = Date.now();

    // per-card chips
    var chips = document.querySelectorAll('[data-cd]');
    Array.prototype.forEach.call(chips, function (node) {
      var ev = byId(node.getAttribute('data-cd'));
      if (!ev) return;
      var t = timeTo(ev, now);
      var card = node.closest('.ev-card');
      if (card && card.getAttribute('data-heat') !== t.heat) card.setAttribute('data-heat', t.heat);
      var out = node.querySelector('.v');
      if (out && out.textContent !== t.label) out.textContent = t.label;
    });

    // Hero and detail-sheet clocks can be visible at the same time.  The old
    // markup gave both the same id, so only the first clock ever moved.
    Array.prototype.forEach.call(document.querySelectorAll('.ev-clock[data-id]'), function (clock) {
      var ev = byId(clock.getAttribute('data-id'));
      if (!ev) return;
      var t = timeTo(ev, now);
      if (t.live || t.over) {
        clock.innerHTML = '<div class="ev-unit" style="min-width:auto">' +
          '<span class="ev-unit-v" style="font-size:clamp(26px,4.4vw,44px)">' +
          (t.live ? 'DOORS OPEN' : 'FINISHED') + '</span></div>';
        return;
      }
      setUnit(clock, 'd', t.d); setUnit(clock, 'h', t.h);
      setUnit(clock, 'm', t.m); setUnit(clock, 's', t.s);
      var sec = clock.querySelector('.ev-unit.sec');
      if (sec && t.s !== state.lastSec) {
        sec.classList.remove('tick');
        void sec.offsetWidth;          // restart the animation
        sec.classList.add('tick');
      }
      state.lastSec = t.s;
    });
  }

  function setUnit(host, key, val) {
    var n = host.querySelector('[data-u="' + key + '"] .ev-unit-v');
    if (n) {
      var v = key === 'd' ? String(val) : pad(val);
      if (n.textContent !== v) n.textContent = v;
    }
  }

  function byId(id) {
    for (var i = 0; i < state.events.length; i++) {
      if (String(state.events[i].id) === String(id)) return state.events[i];
    }
    return null;
  }

  var ICON = {
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M7 7h10v10"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m20 6-11 11-5-5"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 6v6c0 5 3.4 9.4 8 10 4.6-.6 8-5 8-10V6l-8-4Z"/><path d="m9 12 2 2 4-4"/></svg>',
    cross: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    ticket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9a2 2 0 0 0 0 6v2a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-2a2 2 0 0 0 0-6V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z"/><path d="M14 6v12" stroke-dasharray="2 2.5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'
  };

  /* ── load ────────────────────────────────────────────────────────── */

  function load() {
    if (!sb) { state.loaded = true; renderAll(); return; }
    sb.from('events_public').select('*').order('starts_at', { ascending: true })
      .then(function (r) {
        state.events = (r && r.data) ? r.data : [];
        state.loaded = true;
        renderAll();
        startClock();
        openFromQuery();
      }, function () { state.loaded = true; renderAll(); });
  }

  /* Published events can be approved, paused or sell down while this page is
     open.  Listen to the protected base table, then re-read the public view so
     the UI always reflects the same RLS-filtered catalogue as a fresh visit. */
  function subscribeLive() {
    if (!sb || !sb.channel || state.liveChannel) return;
    try {
      state.liveChannel = sb.channel('cabana-events-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, function () {
          clearTimeout(state.reloadTimer);
          state.reloadTimer = setTimeout(load, 500);
        }).subscribe();
    } catch (e) { state.liveChannel = null; }
  }

  /* ── arriving on one event ───────────────────────────────────────
     A dashboard rail card links here as events.html?back=1&open=<id>.
     The catalogue must be in memory before a sheet can be built, so
     this hangs off the load. An event that has since finished is no
     longer in `state.events`, so the sheet simply does not open and
     the guest lands on a live grid instead of an expired listing. */
  var _deepLinked = false;
  function openFromQuery() {
    if (_deepLinked) return;
    try {
      var id = new URLSearchParams(location.search).get('open');
      if (!id) return;
      _deepLinked = true;
      openSheet(id);
    } catch (e) { /* never block the grid */ }
  }

  function upcoming() {
    var now = Date.now();
    return state.events.filter(function (e) {
      var end = e.ends_at ? Date.parse(e.ends_at) : Date.parse(e.starts_at) + 6 * HOUR;
      return !isNaN(end) && end > now;
    });
  }

  function visible() {
    var q = state.q.trim().toLowerCase();
    var list = upcoming().filter(function (e) {
      if (state.filter !== 'all' && (e.category || '') !== state.filter) return false;
      if (!q) return true;
      var hay = [e.title, e.tagline, e.venue, e.city, e.organiser_name]
        .concat(arr(e.tags)).concat(arr(e.lineup)).join(' ').toLowerCase();
      return hay.indexOf(q) !== -1;
    });

    /* Upgrade to radius search when a place was picked from the typeahead */
    if (state.locPlace && window.ApaGeo) {
      var near = ApaGeo.nearby(list, state.locPlace, {
        radiusKm: ApaGeo.radiusFor(state.locPlace, 50),
        latKey: 'latitude', lngKey: 'longitude', min: 1
      });
      var unpinned = list.filter(function (e) {
        return !(isFinite(e.latitude) && isFinite(e.longitude)) &&
               ApaGeo.match(e, state.locPlace, { fields: ['venue', 'city'] });
      });
      list = near.items.concat(unpinned);
    }
    return list;
  }

  function sorted(list) {
    var l = list.slice();
    if (state.sort === 'soonest')    l.sort(function (a, b) { return Date.parse(a.starts_at) - Date.parse(b.starts_at); });
    if (state.sort === 'price-asc')  l.sort(function (a, b) { return (a.price_from || 0) - (b.price_from || 0); });
    if (state.sort === 'price-desc') l.sort(function (a, b) { return (b.price_from || 0) - (a.price_from || 0); });
    return l;
  }

  /* ── hero ────────────────────────────────────────────────────────── */

  function renderHero() {
    var host = el('ev-next');
    if (!host) return;
    var list = sorted(upcoming());
    // Featured wins, otherwise whatever is nearest.
    var feat = list.filter(function (e) { return e.featured; })[0];
    var ev = feat || list[0];

    if (!ev) { host.innerHTML = ''; host.style.display = 'none'; return; }
    host.style.display = '';

    var cover = ev.cover_url || arr(ev.photos)[0] || '';
    host.innerHTML =
      '<div class="ev-next-in">' +
        (cover ? '<div class="ev-next-art" style="background-image:url(' + JSON.stringify(cover) + ')"></div>' : '') +
        '<div class="ev-next-copy">' +
          '<div class="ev-next-kicker">' + (feat ? 'Featured night' : 'Next up') + '</div>' +
          '<div class="ev-next-name">' + esc(ev.title) + '</div>' +
          '<div class="ev-next-where">' + ICON.pin + esc([ev.venue, ev.city].filter(Boolean).join(', ')) +
            ' · ' + esc(whenLabel(ev)) + '</div>' +
          '<button class="ev-btn ev-btn-primary" type="button" data-open="' + esc(ev.id) + '" style="margin-top:20px;">' +
            ICON.ticket + 'Get tickets</button>' +
        '</div>' +
        '<div class="ev-clock" data-id="' + esc(ev.id) + '">' +
          unitHTML('d', 'Days') + unitHTML('h', 'Hrs') + unitHTML('m', 'Min') + unitHTML('s', 'Sec', true) +
        '</div>' +
      '</div>';

    var b = host.querySelector('[data-open]');
    if (b) b.addEventListener('click', function () { openSheet(ev.id); });
  }

  function unitHTML(k, label, isSec) {
    return '<div class="ev-unit' + (isSec ? ' sec' : '') + '" data-u="' + k + '">' +
           '<span class="ev-unit-v">--</span><span class="ev-unit-l">' + label + '</span></div>';
  }

  /* ── ticker ──────────────────────────────────────────────────────── */

  function renderTicker() {
    var host = el('ev-ticker');
    if (!host) return;
    var list = sorted(upcoming()).slice(0, 12);
    if (!list.length) { host.style.display = 'none'; return; }
    host.style.display = '';

    var run = list.map(function (e) {
      return '<span class="ev-tick"><i></i><b>' + esc(e.title) + '</b> · ' +
             esc(whenLabel(e)) + (e.venue ? ' · ' + esc(e.venue) : '') + '</span>';
    }).join('');
    // duplicated so the -50% translate loops without a seam
    host.innerHTML = '<div class="ev-ticker-run">' + run + run + '</div>';
  }

  /* ── chips ───────────────────────────────────────────────────────── */

  function renderChips() {
    var wrap = el('ev-chips');
    if (!wrap) return;
    var up = upcoming();
    var counts = { all: up.length };
    up.forEach(function (e) {
      var c = e.category || 'music';
      counts[c] = (counts[c] || 0) + 1;
    });

    wrap.innerHTML = CATS.map(function (c) {
      var n = counts[c.key] || 0;
      if (c.key !== 'all' && n === 0) return '';
      return '<button class="ev-chip" type="button" aria-pressed="' + (state.filter === c.key) +
             '" data-k="' + c.key + '">' + c.label + '<span class="n">' + n + '</span></button>';
    }).join('');

    Array.prototype.forEach.call(wrap.querySelectorAll('.ev-chip'), function (b) {
      b.addEventListener('click', function () {
        state.filter = b.getAttribute('data-k');
        renderChips(); renderGrid();
      });
    });
  }

  /* ── cards ───────────────────────────────────────────────────────── */

  function cardHTML(e) {
    var cover = e.cover_url || arr(e.photos)[0] || '';
    var clip = arr(e.videos)[0] || '';
    var free = Number(e.price_from) === 0;
    var house = e.organiser_kind === 'cabana';
    var t = timeTo(e, Date.now());

    var left = (e.capacity && e.tickets_sold != null)
      ? Math.max(0, e.capacity - e.tickets_sold) : null;
    var lowTag = (left != null && left > 0 && left <= 20)
      ? '<span class="ev-low">' + left + ' left</span>' : '';

    var media = cover
      ? '<img src="' + esc(cover) + '" alt="' + esc(e.title) + '" loading="lazy" decoding="async" onerror="this.remove()"/>'
      : '<div class="ev-noimg">' + ICON.ticket + '</div>';
    if (clip) {
      media += '<video class="ev-card-clip" src="' + esc(clip) + '" muted loop playsinline preload="none" aria-hidden="true"></video>';
    }

    return '<button class="ev-card" type="button" data-id="' + esc(e.id) + '" data-heat="' + t.heat + '">' +
      '<div class="ev-card-media">' + media +
        '<span class="ev-badge" data-kind="' + (house ? 'cabana' : 'partner') + '">' +
          (house ? ICON.star + 'Cabana' : esc(e.organiser_name || 'Independent')) + '</span>' +
        lowTag +
        '<span class="ev-cd" data-cd="' + esc(e.id) + '">' +
          '<i></i><span class="ev-eq"><span></span><span></span><span></span><span></span></span>' +
          '<span class="v">' + esc(t.label) + '</span></span>' +
      '</div>' +
      '<div class="ev-card-body">' +
        '<div class="ev-card-when">' + esc(whenLabel(e)) + '</div>' +
        '<div class="ev-card-title">' + esc(e.title) + '</div>' +
        (e.venue ? '<div class="ev-card-venue">' + ICON.pin + esc([e.venue, e.city].filter(Boolean).join(', ')) + '</div>' : '') +
        '<div class="ev-card-foot">' +
          '<div class="ev-price" data-free="' + (free ? '1' : '0') + '">' +
            '<span class="v">' + (free ? 'Free' : money(e.price_from)) + '</span>' +
            '<span class="u">' + (free ? 'entry' : 'from') + '</span>' +
          '</div>' +
          '<span class="ev-go">' + ICON.arrow + '</span>' +
        '</div>' +
      '</div></button>';
  }

  function blankHTML() {
    if (state.q || state.filter !== 'all') {
      return '<div class="ev-blank"><div class="ev-blank-mark">' + ICON.ticket + '</div>' +
        '<h3>Nothing on that night</h3>' +
        '<p>No events match. Clear the filters to see everything coming up.</p>' +
        '<div class="ev-blank-acts"><button class="ev-btn ev-btn-ghost" type="button" id="ev-clear">Clear filters</button></div></div>';
    }
    return '<div class="ev-blank"><div class="ev-blank-mark">' + ICON.ticket + '</div>' +
      '<h3>The calendar is empty. Somebody has to go first.</h3>' +
      '<p>Cabana Events is open for listings. Organisers keep the ticket price — ' +
      'Cabana takes no cut of the face value. List a night and it goes live once we have checked it.</p>' +
      '<div class="ev-blank-acts">' +
        '<a class="ev-btn ev-btn-primary" href="/list-your-event">' + ICON.plus + 'List an event</a>' +
        '<a href="/help.html" data-cbn-support class="ev-btn ev-btn-ghost"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.7-.8L3 21l1.9-5.1A8.4 8.4 0 0 1 4 11.5 8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5z"/></svg> Talk to us first</a>' +
      '</div></div>';
  }

  function skeletons(n) {
    var s = '';
    for (var i = 0; i < n; i++) {
      s += '<div class="ev-skel"><div class="ev-skel-media"></div><div class="ev-skel-line"></div>' +
           '<div class="ev-skel-line s"></div><div class="ev-skel-line t"></div></div>';
    }
    return s;
  }

  function renderGrid() {
    var g = el('ev-grid');
    if (!g) return;
    if (!state.loaded) { g.innerHTML = skeletons(6); return; }

    var list = sorted(visible());
    var cnt = el('ev-count-n');
    if (cnt) {
      cnt.innerHTML = '<b>' + list.length + '</b> event' + (list.length === 1 ? '' : 's') + ' coming up';
    }

    if (!list.length) {
      g.innerHTML = blankHTML();
      var c = el('ev-clear');
      if (c) c.addEventListener('click', function () {
        state.q = ''; state.filter = 'all';
        var s = el('ev-q'); if (s) s.value = '';
        renderChips(); renderGrid();
      });
      return;
    }

    g.innerHTML = list.map(cardHTML).join('');

    Array.prototype.forEach.call(g.querySelectorAll('.ev-card'), function (card, i) {
      card.style.animationDelay = Math.min(i, 12) * 55 + 'ms';
      card.classList.add('in');
      card.addEventListener('click', function () { openSheet(card.getAttribute('data-id')); });

      var v = card.querySelector('.ev-card-clip');
      if (v) {
        card.addEventListener('mouseenter', function () { try { v.play(); } catch (e) {} });
        card.addEventListener('mouseleave', function () { try { v.pause(); v.currentTime = 0; } catch (e) {} });
      }
      tilt(card);
    });
  }

  /* Pointer tilt. Skipped entirely on touch, where there is no hover
     and the transform would just fight the scroll. */
  function tilt(card) {
    if (!window.matchMedia || !window.matchMedia('(hover:hover)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;
    card.addEventListener('mousemove', function (e) {
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - .5;
      var py = (e.clientY - r.top) / r.height - .5;
      card.style.transform = 'translateY(-6px) rotateX(' + (-py * 6).toFixed(2) +
                             'deg) rotateY(' + (px * 7).toFixed(2) + 'deg)';
    });
    card.addEventListener('mouseleave', function () { card.style.transform = ''; });
  }

  /* ── sheet ───────────────────────────────────────────────────────── */

  function openSheet(id) {
    var e = byId(id);
    if (!e) return;
    var sheet = el('ev-sheet'), veil = el('ev-veil');
    if (!sheet) return;

    var cover = e.cover_url || arr(e.photos)[0] || '';
    var clip = arr(e.videos)[0] || '';
    var tiers = arr(e.tiers);
    var lineup = arr(e.lineup);
    var free = Number(e.price_from) === 0;

    var facts = [];
    if (e.doors_at) {
      facts.push('Doors ' + new Date(e.doors_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: false }));
    }
    if (e.age_limit) facts.push(e.age_limit + '+');
    if (e.dress_code) facts.push(e.dress_code);
    if (e.city) facts.push(e.city);

    sheet.innerHTML =
      '<button class="ev-sheet-close" type="button" aria-label="Close">' + ICON.cross + '</button>' +
      '<div class="ev-sheet-media">' +
        (clip ? '<video src="' + esc(clip) + '" controls playsinline preload="metadata"' +
                (cover ? ' poster="' + esc(cover) + '"' : '') + '></video>'
              : cover ? '<img src="' + esc(cover) + '" alt="' + esc(e.title) + '" onerror="this.remove()"/>'
                      : '<div class="ev-noimg">' + ICON.ticket + '</div>') +
      '</div>' +
      '<div class="ev-sheet-body">' +
        '<h2 class="ev-sheet-title">' + esc(e.title) + '</h2>' +
        (e.tagline ? '<div style="color:var(--ev-violet);font-weight:600;margin-bottom:12px;">' + esc(e.tagline) + '</div>' : '') +
        '<div class="ev-card-venue" style="margin-bottom:6px;">' + ICON.pin +
          esc([e.venue, e.city].filter(Boolean).join(', ')) + '</div>' +
        '<div style="color:var(--ev-soft);font-size:13.5px;">' + esc(whenLabel(e)) + '</div>' +

        '<div class="ev-clock ev-sheet-clock" data-id="' + esc(e.id) + '">' +
          unitHTML('d', 'Days') + unitHTML('h', 'Hrs') + unitHTML('m', 'Min') + unitHTML('s', 'Sec', true) +
        '</div>' +

        (facts.length ? '<div class="ev-sheet-meta">' +
          facts.map(function (f) { return '<span class="ev-fact">' + esc(f) + '</span>'; }).join('') + '</div>' : '') +

        (e.description ? '<div class="ev-sheet-desc">' + esc(e.description) + '</div>' : '') +

        (lineup.length ? '<div class="ev-sec"><div class="ev-sec-h">Line-up</div>' +
          '<div class="ev-lineup">' + lineup.map(function (a) {
            return '<span class="ev-act">' + esc(typeof a === 'string' ? a : (a.name || '')) + '</span>';
          }).join('') + '</div></div>' : '') +

        ((lineup.length || ['music','festival','nightlife'].indexOf(e.category) !== -1)
          ? '<div id="ev-pulse-mix"></div>' : '') +

        (tiers.length ? '<div class="ev-sec"><div class="ev-sec-h">Tickets</div>' +
          tiers.map(function (t, i) {
            var gone = t.qty != null && t.sold != null && t.sold >= t.qty;
            return '<div class="ev-tier' + (gone ? ' gone' : '') + '">' +
              '<div><div class="ev-tier-n">' + esc(t.name || ('Tier ' + (i + 1))) + '</div>' +
              (t.note ? '<div class="ev-tier-note">' + esc(t.note) + '</div>' : '') +
              (gone ? '<div class="ev-tier-sold">Sold out</div>' : '') + '</div>' +
              '<div class="ev-tier-p">' + (Number(t.price_kes) === 0 ? 'Free' : money(t.price_kes)) + '</div>' +
            '</div>';
          }).join('') + '</div>' : '') +

        (e.address ? '<div class="ev-sec"><div class="ev-sec-h">Where</div>' +
          '<div style="color:var(--ev-soft);font-size:13.5px;line-height:1.6;">' + esc(e.address) + '</div></div>' : '') +

        (e.refund_policy ? '<div class="ev-sec"><div class="ev-sec-h">Refunds</div>' +
          '<div style="color:var(--ev-soft);font-size:13.5px;line-height:1.6;">' + esc(e.refund_policy) + '</div></div>' : '') +

        '<div class="ev-book">' +
          '<div class="ev-book-p"><span class="v">' + (free ? 'Free' : money(e.price_from)) + '</span>' +
          '<span class="u">' + (free ? 'entry' : 'from · no booking fee on face value') + '</span></div>' +
          '<button class="ev-btn ev-btn-primary" type="button" data-book="' + esc(e.id) + '">' +
            (free ? 'Reserve a place' : 'Get tickets') + '</button>' +
        '</div>' +
      '</div>';

    sheet.classList.add('open');
    if (veil) veil.classList.add('open');
    document.body.style.overflow = 'hidden';
    sheet.querySelector('.ev-sheet-close').addEventListener('click', closeSheet);
    var bk = sheet.querySelector('[data-book]');
    if (bk) bk.addEventListener('click', function () { book(e); });
    var mix = sheet.querySelector('#ev-pulse-mix');
    if (mix && window.CabanaPulse && typeof window.CabanaPulse.renderEventMix === 'function') {
      window.CabanaPulse.renderEventMix(mix, lineup, { category: e.category });
    }
    sheet.scrollTop = 0;
    tick();
  }

  function closeSheet() {
    var sheet = el('ev-sheet'), veil = el('ev-veil');
    if (sheet) { sheet.classList.remove('open'); sheet.innerHTML = ''; }
    if (veil) veil.classList.remove('open');
    document.body.style.overflow = '';
  }

  function book(e) {
    if (window.CabanaEventBook && typeof window.CabanaEventBook.open === 'function') {
      window.CabanaEventBook.open(e);
      return;
    }
    /* Same reasoning as tours: hand it to support with the event named
       instead of dead-ending on a page that cannot take the booking. */
    if (window.CabanaSupport) {
      window.CabanaSupport.ask('I would like tickets for: ' + (e.title || ''));
      return;
    }
    window.location.href = '/help.html';
  }

  /* ── wiring ──────────────────────────────────────────────────────── */

  function renderAll() { renderHero(); renderTicker(); renderChips(); renderGrid(); }

  function start() {
    var q = el('ev-q');
    if (q) {
      var deb;
      q.addEventListener('input', function () {
        clearTimeout(deb);
        state.locPlace = null;
        var latEl = el('ev-loc-lat'), lngEl = el('ev-loc-lng');
        if (latEl) latEl.value = '';
        if (lngEl) lngEl.value = '';
        deb = setTimeout(function () { state.q = q.value; renderGrid(); }, 140);
      });

      function wireGeo() {
        if (!window.ApaGeo) return;
        ApaGeo.attach('ev-q', {
          limit: 6,
          onPick: function (p) {
            state.locPlace = p;
            state.q = q.value;
            var latEl = el('ev-loc-lat'), lngEl = el('ev-loc-lng');
            if (latEl) latEl.value = isFinite(p.lat) ? p.lat : '';
            if (lngEl) lngEl.value = isFinite(p.lng) ? p.lng : '';
            renderGrid();
          }
        });
      }
      if (window.ApaGeo) wireGeo();
      else window.addEventListener('load', wireGeo);
    }
    var s = el('ev-sort');
    if (s) s.addEventListener('change', function () { state.sort = s.value; renderGrid(); });
    var veil = el('ev-veil');
    if (veil) veil.addEventListener('click', closeSheet);
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') closeSheet(); });

    renderGrid();
    load();
    subscribeLive();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  window.CabanaEvents = {
    reload: load,
    get: function () { return state.events.slice(); },
    timeTo: timeTo
  };
})();
