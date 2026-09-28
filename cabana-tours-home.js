/* ═══════════════════════════════════════════════════════════════════
   CABANA TOURS · /tours, below the Spotlight
   ───────────────────────────────────────────────────────────────────
   The departure board (every real departure in the next 30 days, one
   pass per tour, each counting down), the kinds of tour, the guides,
   a first look at the catalogue and the pitch for the Spotlight.

   The board shows only what tour_departures() returned: a weekly tour
   on its weekdays, a fixed tour on its dates, and nothing once booking
   has closed. If nothing is leaving, the board says so in its own flaps
   and offers the next best thing, never a filler card.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  var doc = global.document;
  function K() { return global.CabanaTours; }
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function el(id) { return doc.getElementById(id); }

  /* ── line-art for the kinds of tour ──────────────────────────────── */
  function G(p) { return '<svg class="glyph" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }
  var GLYPH = {
    'day-safari': G('<circle cx="84" cy="34" r="14"/><path d="M58 100V64M58 64c-10-8-24-10-38-9M58 64c8-9 22-12 40-10M20 55c10-7 30-10 38-6 10-5 30-4 40 3"/><path d="M8 100h104"/>'),
    'big-safari': G('<path d="M16 96 60 30l44 66Z"/><path d="M60 30v66M46 96l14-22 14 22"/><path d="M92 22a10 10 0 1 1-12-12 12 12 0 0 0 12 12Z"/><path d="M8 100h104"/>'),
    'day-trip': G('<path d="M8 62c14-18 28-18 40-4 12-22 34-26 64-4"/><path d="M10 80c8 4 16 4 24 0s16-4 24 0 16 4 24 0 16-4 24 0"/><path d="M10 94c8 4 16 4 24 0s16-4 24 0 16 4 24 0 16-4 24 0"/>'),
    'city-tour': G('<path d="M10 100V60h18v40M28 100V36h20v64M48 100V52h16v48M64 100V24h22v76M86 100V58h24v42"/><path d="M34 46h8M34 58h8M70 36h10M70 50h10M70 64h10M92 68h10"/>'),
    'beach': G('<path d="M20 78h80l-10 14H30Z"/><path d="M58 78V18l34 52H58"/><path d="M58 30 32 70h26"/><path d="M8 104c8 4 16 4 24 0s16-4 24 0 16 4 24 0 16-4 24 0"/>'),
    'adventure': G('<path d="M6 100 44 36l20 30 14-18 36 52Z"/><path d="M44 36V14l16 7-16 7"/><path d="M34 54l10 8 10-8"/>'),
    'culture': G('<ellipse cx="60" cy="30" rx="30" ry="10"/><path d="M30 30v50c0 6 14 10 30 10s30-4 30-10V30"/><path d="M30 50l30 10 30-10M30 70l30 10 30-10"/><path d="M40 18l-8-10M80 18l8-10"/>'),
    'expedition': G('<circle cx="60" cy="60" r="44"/><path d="m78 42-10 26-26 10 10-26Z"/><path d="M60 10v10M60 100v10M10 60h10M100 60h10"/>')
  };
  var CAT_ORDER = ['day-safari', 'big-safari', 'day-trip', 'city-tour', 'beach', 'adventure', 'culture', 'expedition'];

  /* ═══ THE DEPARTURE BOARD ══════════════════════════════════════════ */
  var board = { f: 'all', auto: 0, held: false, visible: false };
  var FILTERS = [
    { k: 'all', l: 'All 30 days' }, { k: 'weekend', l: 'This weekend' }, { k: 'week', l: 'Next 7 days' },
    { k: 'day', l: 'Back same day' }, { k: 'multi', l: 'Overnight +' }, { k: 'budget', l: 'Under KES 5,000' }
  ];
  function weekendRange() {
    var t = new Date(K().today() + 'T12:00:00Z'), dow = t.getUTCDay(); // 0 Sun
    var toFri = (5 - dow + 7) % 7; if (dow === 6) toFri = -1; if (dow === 0) toFri = -2;
    var fri = new Date(t.getTime() + toFri * 864e5), sun = new Date(fri.getTime() + 2 * 864e5);
    return [fri.toISOString().slice(0, 10), sun.toISOString().slice(0, 10)];
  }
  function pick(list, f) {
    var kit = K();
    if (f === 'weekend') { var w = weekendRange(); return list.filter(function (u) { return u.dep.departs_on >= w[0] && u.dep.departs_on <= w[1]; }); }
    if (f === 'week') { var lim = Date.now() + 7 * 864e5; return list.filter(function (u) { return new Date(u.dep.departs_at).getTime() <= lim; }); }
    if (f === 'day') return list.filter(function (u) { return kit.reach(u.tour) <= 1; });
    if (f === 'multi') return list.filter(function (u) { return kit.reach(u.tour) >= 2; });
    if (f === 'budget') return list.filter(function (u) { return Number(u.tour.price_kes) < 5000; });
    return list;
  }
  function paintBoard() {
    var kit = K(), rail = el('ct-dep-rail'), chips = el('ct-dep-f'), nav = el('ct-dep-nav');
    if (!rail || !kit) return;
    if (!kit.loaded()) { rail.innerHTML = '<div class="ct-skel ct-skel-pass"></div><div class="ct-skel ct-skel-pass"></div><div class="ct-skel ct-skel-pass"></div><div class="ct-skel ct-skel-pass"></div>'; return; }
    var all = kit.upcoming(30);
    var sub = el('ct-dep-sub');
    if (sub) sub.textContent = all.length
      ? all.length + (all.length === 1 ? ' tour departs' : ' tours depart') + ' in the next 30 days. Every clock is counting to a real departure.'
      : 'Every departure in the next 30 days lands here the moment a guide schedules it.';
    if (chips) {
      chips.innerHTML = FILTERS.map(function (f) {
        var n = pick(all, f.k).length;
        if (f.k !== 'all' && !n) return '';
        return '<button class="ct-chip" type="button" data-f="' + f.k + '" aria-pressed="' + (board.f === f.k) + '">' + f.l + '<span class="n">' + n + '</span></button>';
      }).join('');
      chips.hidden = !all.length;
    }
    var list = pick(all, board.f);
    if (!all.length) {
      rail.classList.remove('ct-rail'); rail.innerHTML = emptyBoard();
      if (nav) nav.hidden = true;
      flapIn(rail);
      return;
    }
    rail.classList.add('ct-rail');
    if (nav) nav.hidden = list.length < 2;
    rail.innerHTML = list.map(function (u) { return kit.pass(u.tour, u.dep); }).join('');
    kit.countdowns(rail); kit.reveal(rail); kit.paintHearts();
    rail.scrollLeft = 0; progress();
  }
  function emptyBoard() {
    var rows = ['NEW DEPARTURES', 'BOARDING SOON'];
    return '<div class="ct-board-empty ct-rv"><div class="rows" aria-hidden="true">' + rows.map(function (r) {
      return '<div class="row">' + r.split('').map(function (ch) { return '<span class="ct-fd' + (ch === ' ' ? ' dim' : '') + '" data-ch="' + (ch === ' ' ? '·' : ch) + '"><b>' + (ch === ' ' ? '·' : ch) + '</b></span>'; }).join('') + '</div>';
    }).join('') + '</div>' +
    '<div><h3>The board fills up as guides schedule.</h3><p>Every departure in the next thirty days appears here with its own clock, the moment an operator puts a date on it. Until then, browse what runs on request, or step into a safari in 360°.</p>' +
    '<div class="acts"><a class="ct-btn ct-btn-sun" href="/tours-catalogue">Browse all tours</a><a class="ct-btn" href="#immersive" data-ct-jump>Step inside in VR</a><a class="ct-btn" href="/list-your-tour">Schedule a departure</a></div></div></div>';
  }
  /* Airport-board arrival: every flap riffles through letters, then lands. */
  function flapIn(root) {
    var cells = $$('.ct-fd[data-ch]', root); if (!cells.length) return;
    K().reveal(root);
    if (K().reduced()) return;
    var A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var go = function () {
      cells.forEach(function (c, i) {
        var final = c.getAttribute('data-ch'), n = 5 + (i % 7), k = 0;
        var tick = setInterval(function () {
          k++;
          c.innerHTML = '<b class="in">' + (k >= n ? final : A.charAt(Math.floor(Math.random() * A.length))) + '</b>';
          if (k >= n) clearInterval(tick);
        }, 70);
      });
    };
    if ('IntersectionObserver' in global) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); go(); } }, { threshold: 0.3 });
      io.observe(root);
    } else go();
  }
  function step(dir) {
    var rail = el('ct-dep-rail'); if (!rail) return;
    var card = rail.querySelector('.ct-pass'); if (!card) return;
    var w = card.getBoundingClientRect().width + 18;
    var max = rail.scrollWidth - rail.clientWidth - 4;
    var to = rail.scrollLeft + dir * w;
    if (dir > 0 && rail.scrollLeft >= max) to = 0;
    if (dir < 0 && rail.scrollLeft <= 4) to = max;
    rail.scrollTo({ left: to, behavior: K().reduced() ? 'auto' : 'smooth' });
  }
  function progress() {
    var rail = el('ct-dep-rail'), bar = $('#ct-dep-nav .ct-rail-prog i'); if (!rail || !bar) return;
    var vis = rail.clientWidth / Math.max(rail.scrollWidth, 1), max = Math.max(1, rail.scrollWidth - rail.clientWidth);
    bar.style.width = Math.max(12, vis * 100) + '%';
    bar.style.transform = 'translateX(' + ((rail.scrollLeft / max) * (100 / Math.max(vis, .12) - 100)).toFixed(1) + '%)';
  }
  function wireBoard() {
    var sec = el('departures'), rail = el('ct-dep-rail'), chips = el('ct-dep-f');
    if (!sec || !rail) return;
    if (chips) chips.addEventListener('click', function (e) {
      var b = e.target.closest('[data-f]'); if (!b) return;
      board.f = b.getAttribute('data-f'); paintBoard();
    });
    $$('#ct-dep-nav [data-step]').forEach(function (b) { b.addEventListener('click', function () { board.held = true; step(+b.getAttribute('data-step')); setTimeout(function () { board.held = false; }, 9000); }); });
    rail.addEventListener('scroll', function () { requestAnimationFrame(progress); }, { passive: true });
    ['pointerenter', 'touchstart', 'focusin'].forEach(function (ev) { rail.addEventListener(ev, function () { board.held = true; }, { passive: true }); });
    ['pointerleave', 'touchend', 'focusout'].forEach(function (ev) { rail.addEventListener(ev, function () { setTimeout(function () { board.held = false; }, 4000); }, { passive: true }); });
    if ('IntersectionObserver' in global) new IntersectionObserver(function (es) { board.visible = es[0].isIntersecting; }, { threshold: 0.35 }).observe(rail);
    // The board advances on its own, one pass at a time, while you watch it.
    board.auto = setInterval(function () {
      if (!board.visible || board.held || doc.hidden || K().reduced()) return;
      if (rail.scrollWidth <= rail.clientWidth + 8) return;
      step(1);
    }, 5200);
    sec.addEventListener('click', function (e) {
      var j = e.target.closest('[data-ct-jump]'); if (!j) return;
      var t = doc.querySelector(j.getAttribute('href')); if (!t) return;
      e.preventDefault(); var top = el('ct-top');
      global.scrollTo({ top: t.getBoundingClientRect().top + global.scrollY - (top ? top.offsetHeight : 0) + 1, behavior: 'smooth' });
    });
  }

  /* ═══ KINDS OF TOUR ════════════════════════════════════════════════ */
  function paintCats() {
    var box = el('ct-cats'), kit = K(); if (!box || !kit) return;
    var n = {}; kit.get().forEach(function (t) { n[t.category] = (n[t.category] || 0) + 1; });
    box.innerHTML = CAT_ORDER.map(function (k, i) {
      var c = kit.CATS[k];
      return '<a class="ct-cat ct-rv ct-rv-d' + (i % 4) + '" href="/tours-catalogue?cat=' + k + '" style="--a:' + c.a + ';--b:' + c.b + '">' + GLYPH[k] +
        '<span class="n">' + (n[k] ? n[k] + (n[k] === 1 ? ' TOUR' : ' TOURS') : 'SOON') + '</span><b>' + kit.esc(c.name) + '</b><span>' + kit.esc(c.blurb) + '</span></a>';
    }).join('');
    kit.reveal(box);
  }

  /* ═══ GUIDES ═══════════════════════════════════════════════════════ */
  var guides = null;
  function loadGuides() {
    var kit = K(), c = kit && kit.sb(); if (!c || !el('ct-guides')) return;
    c.rpc('tour_guides_directory').then(function (r) { guides = r && Array.isArray(r.data) ? r.data : []; paintGuides(); }, function () { guides = []; paintGuides(); });
  }
  function guideCard(g) {
    var kit = K(), esc = kit.esc;
    var av = g.logo ? '<img src="' + esc(g.logo) + '" alt="" loading="lazy"/>' : '<span>' + esc(String(g.name || '?').charAt(0).toUpperCase()) + '</span>';
    var cover = g.cover ? '<img src="' + esc(g.cover) + '" alt="" loading="lazy"/>' : '<div class="ct-art" style="position:absolute;inset:0">' + kit.art('g' + g.id, 'savanna', { w: 400, h: 160 }) + '</div>';
    var langs = (g.languages || []).slice(0, 3).join(' · ');
    return '<article class="ct-guide ct-rv" id="g-' + esc(g.slug || g.id) + '">' +
      '<div class="ct-guide-cover">' + cover + '</div>' +
      '<div class="ct-guide-av">' + av + '</div>' +
      '<div class="ct-guide-b">' +
        '<span class="ct-guide-role">' + (g.persona === 'guide' ? 'Local guide' : 'Tour operator') + (g.county ? ' · ' + esc(g.county) : '') + '</span>' +
        '<h3 class="ct-guide-n">' + esc(g.name) + (g.verified ? '<span style="color:var(--ct-turq);display:inline-flex" title="Verified by Cabana">' + kit.icon.verified + '</span>' : '') + '</h3>' +
        '<p class="ct-guide-line">' + esc(g.tagline || g.bio || (langs ? 'Speaks ' + langs : 'New on Cabana Tours.')) + '</p>' +
        '<div class="ct-guide-stats"><span><b>' + (g.tours || 0) + '</b>' + (g.tours === 1 ? 'tour' : 'tours') + '</span>' +
          (g.from_kes ? '<span><b>' + (g.from_kes >= 1000 ? Math.round(g.from_kes / 1000) + 'K' : Math.round(g.from_kes)) + '</b>from KES</span>' : g.free ? '<span><b>FREE</b>walks</span>' : '') +
          (g.since ? '<span><b>' + esc(g.since) + '</b>on Cabana</span>' : '') + '</div>' +
        '<div class="ct-guide-acts"><a class="ct-btn ct-btn-s" href="/tours-catalogue?op=' + encodeURIComponent(g.id) + '">See tours</a><a class="ct-btn ct-btn-s ct-btn-sweep" href="/tour-guides#g-' + encodeURIComponent(g.slug || g.id) + '">Profile</a></div>' +
      '</div></article>';
  }
  function paintGuides() {
    var box = el('ct-guides'), sec = el('guides'); if (!box) return;
    if (!guides || !guides.length) { if (sec) sec.hidden = true; return; }
    if (sec) sec.hidden = false;
    box.innerHTML = guides.slice(0, 12).map(guideCard).join('');
    K().reveal(box);
  }

  /* ═══ A FIRST LOOK AT THE CATALOGUE ════════════════════════════════ */
  function paintGrid() {
    var g = el('ct-grid'), kit = K(), cnt = el('ct-grid-n'); if (!g || !kit) return;
    if (!kit.loaded()) { g.innerHTML = kit.skeletons(4); return; }
    var list = kit.get().slice().sort(function (a, b) {
      var da = kit.next(a.id), db = kit.next(b.id);
      return (b.featured === true) - (a.featured === true) || (da ? new Date(da.departs_at) : Infinity) - (db ? new Date(db.departs_at) : Infinity);
    });
    if (cnt) cnt.textContent = list.length ? list.length + (list.length === 1 ? ' tour' : ' tours') + ' listed' : '';
    if (!list.length) {
      g.innerHTML = '<div class="ct-blank"><div class="ct-blank-mark">' + kit.icon.compass + '</div><h3>The first tour here could be yours</h3>' +
        '<p>Cabana Tours is open for listings. Guides and operators keep what they charge: no commission on the tour price. Every listing is checked before it goes live.</p>' +
        '<div class="ct-blank-acts"><a class="ct-btn ct-btn-sun" href="/list-your-tour">' + kit.icon.plus + 'List a tour</a><a class="ct-btn" href="/help" data-cbn-support>Talk to us first</a></div></div>';
      return;
    }
    g.innerHTML = list.slice(0, 8).map(function (t) { return kit.card(t); }).join('');
    kit.reveal(g); kit.paintHearts();
  }

  /* ═══ THE SPOTLIGHT, FOR SALE ══════════════════════════════════════ */
  function paintFeatured() {
    var kit = K(), c = kit && kit.sb(), box = el('ct-feat-pk');
    if (box && c) c.from('tour_spotlight_settings').select('prices,enabled,max_sponsored').limit(1).then(function (r) {
      var s = r && r.data && r.data[0]; if (!s || !s.prices) return;
      var P = s.prices, rows = [['day', '1 day', 'A launch, a flash departure'], ['week', '7 days', 'The one most guides pick'], ['fortnight', '14 days', 'Two weekends of travellers'], ['month', '30 days', 'A whole season up front']];
      box.innerHTML = rows.filter(function (x) { return P[x[0]] != null; }).map(function (x) {
        return '<a href="/tours-studio?tab=spotlight&package=' + x[0] + '"' + (x[0] === 'week' ? ' class="best"' : '') + '><small>' + x[1] + '</small><b>' + kit.money(P[x[0]]).replace('KES ', 'KES ') + '</b><span>' + x[2] + '</span></a>';
      }).join('');
      var cap = el('ct-feat-cap'); if (cap && s.max_sponsored) cap.textContent = 'At most ' + s.max_sponsored + ' sponsored slides share the Spotlight on any day, so yours is never lost in a crowd.';
    }, function () {});
    var scr = el('ct-feat-sl');
    if (scr && global.CabanaSpotlight && !scr.__sl) {
      var sl = scr.__sl = global.CabanaSpotlight.create(scr, { preview: true });
      sl.set([
        { id: 'ex-1', kind: 'sponsored', media_kind: 'art', art: 'savanna', accent: '#FFB020', kicker: 'Day safari · Nairobi National Park',
          headline: 'Dawn with the *lions*', subline: 'Your film or photos here, your words over them, and a Book button on every screen.',
          tour: { id: 'example', destination: 'Nairobi National Park', price: 8500, price_basis: 'per_person', duration: '6 hours' }, operator: { name: 'Your company', verified: true } },
        { id: 'ex-2', kind: 'house', media_kind: 'art', art: 'featured', accent: '#FFB020', kicker: 'For guides and operators', headline: 'This could be *your tour*', subline: '', cta_label: 'Get featured', cta_url: '/tours-studio?tab=spotlight' }
      ]);
    }
  }

  function start() {
    var kit = K(); if (!kit) return;
    /* A search from elsewhere belongs to the full catalogue. */
    try {
      var p = new URLSearchParams(global.location.search), q = p.get('q') || p.get('dest') || p.get('destination');
      if (q) { global.location.replace('/tours-catalogue?q=' + encodeURIComponent(q)); return; }
    } catch (e) {}
    wireBoard();
    paintBoard(); paintCats(); paintGrid();
    kit.on('data', function () { paintBoard(); paintCats(); paintGrid(); });
    kit.on('saves', function () { kit.paintHearts(); });
    loadGuides(); paintFeatured();
    kit.reveal(doc);
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})(window);
