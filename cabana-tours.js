/* ═══════════════════════════════════════════════════════════════════
   CABANA · TOURS — the engine
   ───────────────────────────────────────────────────────────────────
   Reads first-party inventory from Supabase (public.tours_public) and
   renders it. Nothing here talks to a third-party domain: the tours
   page used to load its entire catalogue from wildbosses.com, which
   was deleted, so the grid had been rendering empty.

   Two rules this file will not break:

     1. No invented social proof. A listing with no completed Cabana
        bookings shows "New listing", never a star rating borrowed
        from somewhere else.
     2. No hotlinked media. Covers come from the operator's own upload
        or the listing renders its placeholder mark.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var SB_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';

  var sb = null;
  try {
    if (window.supabase && window.supabase.createClient) {
      sb = window.supabase.createClient(SB_URL, SB_KEY);
    }
  } catch (e) { /* handled by the load path below */ }

  /* ── Reach: where a tour sits on the meridian ────────────────────
     This is the one number the signature depends on, so it is
     derived from real fields rather than a hand-set position.
       0 · in the city   1 · day trip   2 · overnight   3 · expedition */
  function reachOf(t) {
    var days = Number(t.days) || 1;
    if (days >= 4) return 3;
    if (days >= 2) return 2;
    var hrs = Number(t.duration_hours) || 0;
    if (!hrs && t.duration_label) {
      var m = String(t.duration_label).match(/(\d+(?:\.\d+)?)\s*h/i);
      if (m) hrs = parseFloat(m[1]);
    }
    // A day trip leaves town; a city tour does not. Six hours is the
    // honest dividing line between the two in Nairobi.
    if (hrs >= 6) return 1;
    var cat = (t.category || '').toLowerCase();
    if (cat === 'day-trip' || cat === 'day-safari') return 1;
    return 0;
  }

  var ZONES = [
    { key: 'city',       name: 'In the city',  sub: 'Under 6 hours' },
    { key: 'day-trip',   name: 'Day trips',    sub: 'Out and back' },
    { key: 'overnight',  name: 'Overnight',    sub: '2–3 days' },
    { key: 'expedition', name: 'Expeditions',  sub: '4 days +' }
  ];

  var FILTERS = [
    { key: 'all',        label: 'Everything' },
    { key: 'city',       label: 'In the city' },
    { key: 'day-trip',   label: 'Day trips' },
    { key: 'overnight',  label: 'Overnight' },
    { key: 'expedition', label: 'Expeditions' }
  ];

  var state = { tours: [], filter: 'all', q: '', sort: 'recommended', loaded: false };

  /* ── helpers ─────────────────────────────────────────────────────── */

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
  function money(kes) {
    var n = Number(kes) || 0;
    return 'KES ' + n.toLocaleString('en-KE');
  }
  function el(id) { return document.getElementById(id); }

  var ICON = {
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m20 6-11 11-5-5"/></svg>',
    cross: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M7 7h10v10"/></svg>',
    verified: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 6v6c0 5 3.4 9.4 8 10 4.6-.6 8-5 8-10V6l-8-4Z"/><path d="m9 12 2 2 4-4"/></svg>',
    compass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'
  };

  /* ── load ────────────────────────────────────────────────────────── */

  function load() {
    if (!sb) { state.loaded = true; renderAll(); return; }
    sb.from('tours_public')
      .select('*')
      .order('featured', { ascending: false })
      .order('sort_weight', { ascending: false })
      .order('published_at', { ascending: false })
      .then(function (res) {
        state.tours = (res && res.data) ? res.data : [];
        state.loaded = true;
        renderAll();
      }, function () {
        state.loaded = true;
        renderAll();
      });
  }

  /* ── filtering ───────────────────────────────────────────────────── */

  function visible() {
    var q = state.q.trim().toLowerCase();
    return state.tours.filter(function (t) {
      if (state.filter !== 'all' && ZONES[reachOf(t)].key !== state.filter) return false;
      if (!q) return true;
      var hay = [t.title, t.summary, t.destination, t.county, t.operator_name]
        .concat(arr(t.tags)).join(' ').toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }

  function sorted(list) {
    var l = list.slice();
    if (state.sort === 'price-asc')  l.sort(function (a, b) { return (a.price_kes || 0) - (b.price_kes || 0); });
    if (state.sort === 'price-desc') l.sort(function (a, b) { return (b.price_kes || 0) - (a.price_kes || 0); });
    if (state.sort === 'duration')   l.sort(function (a, b) { return reachOf(a) - reachOf(b); });
    if (state.sort === 'soonest') {
      l.sort(function (a, b) {
        var x = a.next_departure ? Date.parse(a.next_departure) : Infinity;
        var y = b.next_departure ? Date.parse(b.next_departure) : Infinity;
        return x - y;
      });
    }
    return l;
  }

  /* ── the meridian ────────────────────────────────────────────────── */

  function renderMeridian() {
    var stage = el('ct-mrd');
    if (!stage) return;

    var list = state.tours;
    var pins = '';

    if (list.length) {
      // Spread tours inside their own zone band so two Mara trips do
      // not stack into one unreadable dot.
      var byZone = [[], [], [], []];
      list.forEach(function (t) { byZone[reachOf(t)].push(t); });

      byZone.forEach(function (group, z) {
        var w = 100 / 4;                    // zone width in %
        group.forEach(function (t, i) {
          var slot = (i + 1) / (group.length + 1);
          var left = (z * w) + (slot * w);
          var house = t.operator_kind === 'cabana' ? '1' : '0';
          var price = t.price_kes > 0 ? money(t.price_kes) : 'Free';
          pins += '<button class="ct-pin" data-house="' + house + '" data-id="' + esc(t.id) + '"' +
                  ' style="left:' + left.toFixed(2) + '%"' +
                  ' aria-label="' + esc(t.title) + ' — ' + esc(price) + '">' +
                  '<span class="ct-pin-flag">' + esc(t.title) + ' · <b>' + esc(price) + '</b></span>' +
                  '</button>';
        });
      });
    }

    var empty = list.length ? '' :
      '<div class="ct-mrd-empty"><p>The line is open. No tours on it yet.</p></div>';

    stage.innerHTML =
      '<div class="ct-mrd-line"></div>' +
      '<div class="ct-mrd-rider"></div>' +
      empty + pins +
      '<div class="ct-mrd-zones">' + ZONES.map(function (z) {
        return '<div class="ct-mrd-zone"><div class="ct-mrd-zname">' + z.name + '</div>' +
               '<div class="ct-mrd-zsub">' + z.sub + '</div></div>';
      }).join('') + '</div>';

    Array.prototype.forEach.call(stage.querySelectorAll('.ct-pin'), function (p) {
      p.addEventListener('click', function () {
        var id = p.getAttribute('data-id');
        var card = document.querySelector('.ct-card[data-id="' + id + '"]');
        if (card) {
          if (card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.classList.add('is-lit');
          setTimeout(function () { card.classList.remove('is-lit'); }, 1400);
        } else {
          openSheet(id);
        }
      });
    });
  }

  /* ── chips ───────────────────────────────────────────────────────── */

  function renderChips() {
    var wrap = el('ct-chips');
    if (!wrap) return;
    var counts = { all: state.tours.length };
    ZONES.forEach(function (z) { counts[z.key] = 0; });
    state.tours.forEach(function (t) { counts[ZONES[reachOf(t)].key]++; });

    wrap.innerHTML = FILTERS.map(function (f) {
      var n = counts[f.key] || 0;
      var on = state.filter === f.key;
      // A zone with nothing in it is not offered as a filter.
      if (f.key !== 'all' && n === 0) return '';
      return '<button class="ct-chip" type="button" aria-pressed="' + on + '" data-k="' + f.key + '">' +
             f.label + '<span class="n">' + n + '</span></button>';
    }).join('');

    Array.prototype.forEach.call(wrap.querySelectorAll('.ct-chip'), function (c) {
      c.addEventListener('click', function () {
        state.filter = c.getAttribute('data-k');
        renderChips(); renderGrid();
      });
    });
  }

  /* ── cards ───────────────────────────────────────────────────────── */

  function cardHTML(t) {
    var cover = t.cover_url || (arr(t.photos)[0] || '');
    var free = Number(t.price_kes) === 0;
    var spots = Number(t.spots_left);
    var facts = [];

    if (t.duration_label) facts.push(t.duration_label);
    if (Number(t.days) > 1) facts.push(t.days + ' days');
    if (t.group_max) facts.push('Max ' + t.group_max);
    arr(t.tags).slice(0, 2).forEach(function (x) { facts.push(x); });

    var clip = arr(t.videos)[0] || '';
    var media = cover
      ? '<img src="' + esc(cover) + '" alt="' + esc(t.title) + '" loading="lazy" decoding="async"' +
        ' onerror="this.remove()"/>'
      : '<div class="ct-card-noimg">' + ICON.compass + '</div>';
    // The clip sits over the still and fades in on hover. It is only
    // fetched on intent (preload=none), so a grid of ten tours does not
    // pull ten videos over someone's mobile data.
    if (clip) {
      media += '<video class="ct-card-clip" src="' + esc(clip) + '" muted loop playsinline ' +
               'preload="none" tabindex="-1" aria-hidden="true"></video>' +
               '<span class="ct-clip-dot" aria-hidden="true"></span>';
    }

    var house = t.operator_kind === 'cabana';
    var badge = '<span class="ct-badge" data-kind="' + (house ? 'cabana' : 'partner') + '">' +
                (house ? ICON.verified + 'Cabana' : esc(t.operator_name || 'Local operator')) + '</span>';

    var spotTag = (spots > 0 && spots <= 4)
      ? '<span class="ct-spots">' + spots + ' left</span>' : '';

    var where = [t.destination || t.county || t.country].filter(Boolean).join('');

    return '<button class="ct-card" type="button" data-id="' + esc(t.id) + '">' +
      '<div class="ct-card-media">' + media + badge + spotTag +
        (where ? '<span class="ct-card-where">' + ICON.pin + esc(where) + '</span>' : '') +
      '</div>' +
      '<div class="ct-card-body">' +
        '<div class="ct-card-title">' + esc(t.title) + '</div>' +
        '<div class="ct-card-op">' +
          (house ? 'Run by Cabana' : 'By ' + esc(t.operator_name || 'a local operator')) +
          (t.operator_verified && !house ? '<span class="v" title="Verified operator">' + ICON.verified + '</span>' : '') +
        '</div>' +
        (facts.length ? '<div class="ct-card-facts">' +
          facts.slice(0, 4).map(function (f) { return '<span class="ct-fact">' + esc(f) + '</span>'; }).join('') +
        '</div>' : '') +
        '<div class="ct-card-foot">' +
          '<div class="ct-price" data-free="' + (free ? '1' : '0') + '">' +
            '<span class="v">' + (free ? 'Free' : money(t.price_kes)) + '</span>' +
            '<span class="u">' + (t.price_basis === 'per_group' ? 'per group' : 'per person') + '</span>' +
          '</div>' +
          '<span class="ct-go">' + ICON.arrow + '</span>' +
        '</div>' +
      '</div></button>';
  }

  function blankHTML() {
    var searching = state.q || state.filter !== 'all';
    if (searching) {
      return '<div class="ct-blank">' +
        '<div class="ct-blank-mark">' + ICON.compass + '</div>' +
        '<h3>Nothing on this stretch of the line</h3>' +
        '<p>No tours match that search yet. Clear the filters to see everything currently listed.</p>' +
        '<div class="ct-blank-acts">' +
          '<button class="ct-btn ct-btn-ghost" type="button" id="ct-clear">Clear filters</button>' +
        '</div></div>';
    }
    return '<div class="ct-blank">' +
      '<div class="ct-blank-mark">' + ICON.compass + '</div>' +
      '<h3>The first tour on the line could be yours</h3>' +
      '<p>Cabana Tours is open for listings. Guides and operators keep what they charge — ' +
      'Cabana takes no commission on the tour price. List a tour and it goes live once we have checked it over.</p>' +
      '<div class="ct-blank-acts">' +
        '<a class="ct-btn ct-btn-primary" href="/list-your-tour">' + ICON.plus + 'List a tour</a>' +
        '<a class="ct-btn ct-btn-ghost" target="_blank" rel="noopener" ' +
        'href="https://wa.me/254716206494?text=' +
        encodeURIComponent('Hi Cabana, I run tours and I would like to list them.') +
        '">Talk to us first</a>' +
      '</div></div>';
  }

  function skeletons(n) {
    var s = '';
    for (var i = 0; i < n; i++) {
      s += '<div class="ct-skel"><div class="ct-skel-media"></div>' +
           '<div class="ct-skel-line"></div><div class="ct-skel-line s"></div>' +
           '<div class="ct-skel-line t"></div></div>';
    }
    return s;
  }

  function renderGrid() {
    var g = el('ct-grid');
    if (!g) return;

    if (!state.loaded) { g.innerHTML = skeletons(6); return; }

    var list = sorted(visible());
    var cnt = el('ct-count-n');
    if (cnt) {
      cnt.innerHTML = list.length
        ? '<b>' + list.length + '</b> tour' + (list.length === 1 ? '' : 's') + ' on the line'
        : '<b>0</b> tours on the line';
    }

    if (!list.length) {
      g.innerHTML = blankHTML();
      var clear = el('ct-clear');
      if (clear) clear.addEventListener('click', function () {
        state.q = ''; state.filter = 'all';
        var s = el('ct-q'); if (s) s.value = '';
        renderChips(); renderGrid();
      });
      return;
    }

    g.innerHTML = list.map(cardHTML).join('');

    Array.prototype.forEach.call(g.querySelectorAll('.ct-card'), function (c, i) {
      c.addEventListener('click', function () { openSheet(c.getAttribute('data-id')); });
      var v = c.querySelector('.ct-card-clip');
      if (v) {
        var play = function () { try { v.play(); } catch (e) {} };
        var stop = function () { try { v.pause(); v.currentTime = 0; } catch (e) {} };
        c.addEventListener('mouseenter', play);
        c.addEventListener('mouseleave', stop);
        c.addEventListener('focus', play);
        c.addEventListener('blur', stop);
      }
      setTimeout(function () { c.classList.add('in'); }, Math.min(i, 12) * 45);
    });
  }

  /* ── detail sheet ────────────────────────────────────────────────── */

  function openSheet(id) {
    var t = state.tours.filter(function (x) { return String(x.id) === String(id); })[0];
    if (!t) return;

    var sheet = el('ct-sheet'), veil = el('ct-veil');
    if (!sheet) return;

    var cover = t.cover_url || (arr(t.photos)[0] || '');
    var free = Number(t.price_kes) === 0;
    var inc = arr(t.includes_list), exc = arr(t.excludes_list);
    var itin = arr(t.itinerary), high = arr(t.highlights), bring = arr(t.what_to_bring);

    var facts = [];
    if (t.duration_label) facts.push(t.duration_label);
    if (t.destination) facts.push(t.destination);
    if (t.group_max) facts.push(t.group_min + '–' + t.group_max + ' people');
    if (t.next_departure) {
      facts.push('Next: ' + new Date(t.next_departure)
        .toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }));
    } else if (t.schedule_type === 'on_request') {
      facts.push('On request');
    } else if (t.schedule_type === 'daily') {
      facts.push('Runs daily');
    }

    var html =
      '<button class="ct-sheet-close" type="button" aria-label="Close">' + ICON.cross + '</button>' +
      '<div class="ct-sheet-media">' +
        (arr(t.videos)[0]
          ? '<video src="' + esc(arr(t.videos)[0]) + '" controls playsinline preload="metadata"' +
            (cover ? ' poster="' + esc(cover) + '"' : '') + '></video>'
          : cover ? '<img src="' + esc(cover) + '" alt="' + esc(t.title) + '" onerror="this.remove()"/>'
                  : '<div class="ct-card-noimg">' + ICON.compass + '</div>') +
      '</div>' +
      '<div class="ct-sheet-body">' +
        '<h2 class="ct-sheet-title">' + esc(t.title) + '</h2>' +
        '<div class="ct-card-op" style="margin-bottom:14px;">' +
          (t.operator_kind === 'cabana' ? 'Run by Cabana' : 'By ' + esc(t.operator_name || 'a local operator')) +
          (t.operator_verified ? '<span class="v">' + ICON.verified + '</span>' : '') +
        '</div>' +
        (facts.length ? '<div class="ct-sheet-meta">' +
          facts.map(function (f) { return '<span class="ct-fact">' + esc(f) + '</span>'; }).join('') +
        '</div>' : '') +
        (t.summary ? '<div class="ct-sheet-desc">' + esc(t.summary) + '</div>' : '') +
        (t.description ? '<div class="ct-sheet-desc">' + esc(t.description) + '</div>' : '') +

        (high.length ? '<div class="ct-sec"><div class="ct-sec-h">Highlights</div>' +
          '<div class="ct-inc">' + high.map(function (h) {
            return '<div class="yes">' + ICON.check + '<span>' + esc(h) + '</span></div>';
          }).join('') + '</div></div>' : '') +

        (itin.length ? '<div class="ct-sec"><div class="ct-sec-h">Itinerary</div>' +
          itin.map(function (d, i) {
            return '<div class="ct-day"><div class="ct-day-n">' + (d.day || (i + 1)) + '</div>' +
              '<div><div class="ct-day-t">' + esc(d.title || ('Day ' + (i + 1))) + '</div>' +
              (d.desc ? '<div class="ct-day-d">' + esc(d.desc) + '</div>' : '') + '</div></div>';
          }).join('') + '</div>' : '') +

        ((inc.length || exc.length) ? '<div class="ct-sec"><div class="ct-sec-h">What\u2019s included</div>' +
          '<div class="ct-inc">' +
            inc.map(function (x) { return '<div class="yes">' + ICON.check + '<span>' + esc(x) + '</span></div>'; }).join('') +
            exc.map(function (x) { return '<div class="no">' + ICON.cross + '<span>' + esc(x) + '</span></div>'; }).join('') +
          '</div></div>' : '') +

        (bring.length ? '<div class="ct-sec"><div class="ct-sec-h">Bring with you</div>' +
          '<div class="ct-inc">' + bring.map(function (x) {
            return '<div class="yes">' + ICON.check + '<span>' + esc(x) + '</span></div>';
          }).join('') + '</div></div>' : '') +

        (t.meeting_point ? '<div class="ct-sec"><div class="ct-sec-h">Meeting point</div>' +
          '<div class="ct-day-d">' + esc(t.meeting_point) + '</div></div>' : '') +

        (t.cancellation ? '<div class="ct-sec"><div class="ct-sec-h">Cancellation</div>' +
          '<div class="ct-day-d">' + esc(t.cancellation) + '</div></div>' : '') +

        '<div class="ct-book">' +
          '<div class="ct-book-price">' +
            '<span class="v">' + (free ? 'Free' : money(t.price_kes)) + '</span>' +
            '<span class="u">' + (t.price_basis === 'per_group' ? 'per group' : 'per person') +
            (t.deposit_pct > 0 && !free ? ' · ' + t.deposit_pct + '% deposit to confirm' : '') + '</span>' +
          '</div>' +
          '<button class="ct-btn ct-btn-primary" type="button" data-book="' + esc(t.id) + '">' +
            (free ? 'Reserve a place' : 'Request to book') + '</button>' +
        '</div>' +
      '</div>';

    sheet.innerHTML = html;
    sheet.classList.add('open');
    if (veil) veil.classList.add('open');
    document.body.style.overflow = 'hidden';

    sheet.querySelector('.ct-sheet-close').addEventListener('click', closeSheet);
    var bookBtn = sheet.querySelector('[data-book]');
    if (bookBtn) bookBtn.addEventListener('click', function () { book(t); });
    sheet.scrollTop = 0;
  }

  function closeSheet() {
    var sheet = el('ct-sheet'), veil = el('ct-veil');
    if (sheet) sheet.classList.remove('open');
    if (veil) veil.classList.remove('open');
    document.body.style.overflow = '';
  }

  /* Booking opens the M-Pesa flow in cabana-tour-book.js. If that file
     failed to load, fall back to the operator's own contact route
     rather than silently doing nothing on the page's main action. */
  function book(t) {
    if (window.CabanaTourBook && typeof window.CabanaTourBook.open === 'function') {
      window.CabanaTourBook.open(t);
      return;
    }
    // Contact on this site is a WhatsApp widget, not a page, so the
    // fallback goes to the number rather than a route that 404s.
    window.open('https://wa.me/254716206494?text=' +
      encodeURIComponent('Hi Cabana, I would like to book: ' + (t.title || '')),
      '_blank', 'noopener');
  }

  /* ── wiring ──────────────────────────────────────────────────────── */

  function renderAll() { renderMeridian(); renderChips(); renderGrid(); }

  function start() {
    var q = el('ct-q');
    if (q) {
      var deb;
      q.addEventListener('input', function () {
        clearTimeout(deb);
        deb = setTimeout(function () { state.q = q.value; renderGrid(); }, 140);
      });
    }
    var s = el('ct-sort');
    if (s) s.addEventListener('change', function () { state.sort = s.value; renderGrid(); });

    var veil = el('ct-veil');
    if (veil) veil.addEventListener('click', closeSheet);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });

    renderGrid();   // paints skeletons
    load();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else { start(); }

  window.CabanaTours = {
    reload: load,
    get: function () { return state.tours.slice(); }
  };
})();
