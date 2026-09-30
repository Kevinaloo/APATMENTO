/* ═══════════════════════════════════════════════════════════════════
   CABANA TOURS · /tours, below the top of the page
   ───────────────────────────────────────────────────────────────────
   Every section here is a block the Cabana team edits in the console
   (Tours → Page, stored in tour_page_blocks): its words, its order and
   whether it shows. What fills a section is always real:

     departures  tour_departures(): a weekly tour on its weekdays, a
                 fixed tour on its dates, nothing once booking closes
     kinds       categories that have live tours (or all of them, if
                 the team asks), with the team's own names and photos
     collection  rows of tours the team picked by hand
     immersive   the 360° room, only when the team switches it on
     guides      approved guides with live tours, picks first
     catalogue   the latest tours, or the team's "nothing yet" message
     pitch       the Spotlight offer, with a slide that is running now
     invite      the band for guides and operators

   A block with nothing real in it hides. Nothing on this page is a
   placeholder standing in for content that does not exist yet.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  var doc = global.document;
  function K() { return global.CabanaTours; }
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function el(id) { return doc.getElementById(id); }
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m20 6-11 11-5-5"/></svg>';
  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';

  /* ── blocks ──────────────────────────────────────────────────────── */
  var SECTION = { departures: 'departures', kinds: 'kinds', immersive: 'immersive', guides: 'guides', catalogue: 'all', pitch: 'featured', invite: 'invite' };
  function blk(id) { var kit = K(); return kit && kit.block ? kit.block(id) : null; }
  function content(id) { var b = blk(id); return (b && b.content) || {}; }
  function enabled(id) { var b = blk(id); return !!(b && b.enabled); }
  function pageReady() { var kit = K(); return !!(kit && kit.pageLoaded && kit.pageLoaded()); }
  function safeHref(u) {
    var h = String(u || '').trim();
    if (/^(\/(?!\/)|#)/.test(h)) return h;
    var m = h.match(/^https:\/\/(www\.)?cabana\.africa(\/[^\s]*)?$/i);
    return m ? (m[2] || '/') : '/tours';
  }
  /* Words, links and lists from a block into its section. An empty field
     hides its element rather than leaving the launch copy behind. */
  function fill(sec, c) {
    if (!sec) return;
    var kit = K();
    $$('[data-f]', sec).forEach(function (n) {
      var k = n.getAttribute('data-f'), v = c[k];
      if (v == null || String(v).trim() === '') { n.hidden = true; return; }
      n.hidden = false;
      if (k === 'title') n.innerHTML = kit.headline(v); else n.textContent = v;
      var hk = n.getAttribute('data-f-href'); if (hk && c[hk]) n.setAttribute('href', safeHref(c[hk]));
    });
    $$('[data-f-list]', sec).forEach(function (ul) {
      var list = (Array.isArray(c[ul.getAttribute('data-f-list')]) ? c[ul.getAttribute('data-f-list')] : []).filter(function (x) { return x && String(x).trim(); });
      ul.innerHTML = list.map(function (x) { return '<li>' + CHECK + '<span>' + kit.esc(x) + '</span></li>'; }).join('');
      ul.hidden = !list.length;
    });
    var clock = $('[data-f-clock]', sec); if (clock) clock.hidden = c.show_clock === false;
  }

  /* Sections follow the order set in the console. The top of the page
     never moves; everything else is re-appended in position order. */
  function layout() {
    var kit = K(), main = el('main'); if (!kit || !main) return;
    var blocks = kit.page().filter(function (b) { return b.kind !== 'hero'; })
      .sort(function (a, b) { return (a.position || 0) - (b.position || 0); });
    var keep = {};
    blocks.forEach(function (b) {
      var sec = b.kind === 'collection' ? collSection(b) : el(SECTION[b.kind]);
      if (!sec) return;
      keep[sec.id] = true;
      main.appendChild(sec);
      if (b.kind !== 'collection') fill(sec, b.content || {});
    });
    $$('section[data-coll]', main).forEach(function (s) { if (!keep[s.id]) s.remove(); });
    var imm = el('immersive'); if (imm) { imm.hidden = !enabled('immersive'); if (imm.hidden) imm.setAttribute('data-off', '1'); else imm.removeAttribute('data-off'); }
    var inv = el('invite'); if (inv) inv.hidden = !enabled('invite');
  }

  /* ═══ THE DEPARTURE BOARD ══════════════════════════════════════════ */
  var board = { f: 'all', auto: 0, held: false, visible: false };
  var FILTERS = [
    { k: 'all', l: 'Next 30 days' }, { k: 'weekend', l: 'This weekend' }, { k: 'week', l: 'Next 7 days' },
    { k: 'day', l: 'Back the same day' }, { k: 'multi', l: 'Overnight' }, { k: 'budget', l: 'Under KES 5,000' }
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
    var kit = K(), sec = el('departures'), rail = el('ct-dep-rail'), chips = el('ct-dep-f'), nav = el('ct-dep-nav');
    if (!rail || !kit || !sec) return;
    if (!kit.loaded() || !pageReady()) return;
    var all = kit.upcoming(30);
    sec.hidden = !(enabled('departures') && all.length);
    if (sec.hidden) { rail.innerHTML = ''; return; }
    if (chips) {
      chips.innerHTML = FILTERS.map(function (f) {
        var n = pick(all, f.k).length;
        if (f.k !== 'all' && !n) return '';
        return '<button class="ct-chip" type="button" data-f="' + f.k + '" aria-pressed="' + (board.f === f.k) + '">' + f.l + '<span class="n">' + n + '</span></button>';
      }).join('');
      chips.hidden = all.length < 3;
    }
    var list = pick(all, board.f);
    if (!list.length) { board.f = 'all'; list = all; }
    if (nav) nav.hidden = list.length < 2;
    rail.innerHTML = list.map(function (u) { return kit.pass(u.tour, u.dep); }).join('');
    kit.countdowns(rail); kit.reveal(rail); kit.paintHearts();
    rail.scrollLeft = 0; progress();
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
    var rail = el('ct-dep-rail'), chips = el('ct-dep-f');
    if (!rail) return;
    if (chips) chips.addEventListener('click', function (e) {
      var b = e.target.closest('[data-f]'); if (!b) return;
      board.f = b.getAttribute('data-f'); paintBoard();
    });
    $$('#ct-dep-nav [data-step]').forEach(function (b) { b.addEventListener('click', function () { board.held = true; step(+b.getAttribute('data-step')); setTimeout(function () { board.held = false; }, 9000); }); });
    rail.addEventListener('scroll', function () { requestAnimationFrame(progress); }, { passive: true });
    ['pointerenter', 'touchstart', 'focusin'].forEach(function (ev) { rail.addEventListener(ev, function () { board.held = true; }, { passive: true }); });
    ['pointerleave', 'touchend', 'focusout'].forEach(function (ev) { rail.addEventListener(ev, function () { setTimeout(function () { board.held = false; }, 4000); }, { passive: true }); });
    if ('IntersectionObserver' in global) new IntersectionObserver(function (es) { board.visible = es[0].isIntersecting; }, { threshold: 0.35 }).observe(rail);
    // The board moves on by one card at a time while someone is looking at it.
    board.auto = setInterval(function () {
      if (!board.visible || board.held || doc.hidden || K().reduced()) return;
      if (rail.scrollWidth <= rail.clientWidth + 8) return;
      step(1);
    }, 5200);
  }

  /* ═══ WAYS TO TRAVEL ═══════════════════════════════════════════════ */
  function paintCats() {
    var kit = K(), sec = el('kinds'), box = el('ct-cats'); if (!box || !kit || !sec) return;
    if (!kit.loaded() || !pageReady()) return;
    var c = content('kinds'), n = {};
    kit.get().forEach(function (t) { n[t.category] = (n[t.category] || 0) + 1; });
    var keys = kit.CAT_ORDER.slice().filter(function (k) { var x = kit.CATS[k]; return x && !x.hidden && (n[k] || c.show_empty); })
      .sort(function (a, b) { return (kit.CATS[a].position || 99) - (kit.CATS[b].position || 99); });
    sec.hidden = !(enabled('kinds') && keys.length);
    if (sec.hidden) { box.innerHTML = ''; return; }
    box.innerHTML = keys.map(function (k, i) {
      var x = kit.CATS[k];
      var bg = x.image ? '<img src="' + kit.esc(x.image) + '" alt="" loading="lazy" decoding="async"/>' : '<div class="ct-art">' + kit.art('cat-' + k, x.scene, { w: 600, h: 600 }) + '</div>';
      return '<a class="ct-cat ct-rv ct-rv-d' + (i % 4) + '" href="/tours-catalogue?cat=' + k + '" style="--a:' + x.a + ';--b:' + x.b + '">' +
        '<span class="ct-cat-bg" aria-hidden="true">' + bg + '</span>' +
        (n[k] ? '<span class="n">' + n[k] + (n[k] === 1 ? ' tour' : ' tours') + '</span>' : '') +
        '<span class="go" aria-hidden="true">' + ARROW + '</span>' +
        '<b>' + kit.esc(x.name) + '</b>' + (x.blurb ? '<span>' + kit.esc(x.blurb) + '</span>' : '') + '</a>';
    }).join('');
    kit.reveal(box);
  }

  /* ═══ COLLECTIONS: rows the team picks ═════════════════════════════ */
  function collSection(b) {
    var id = 'c-' + b.id, sec = el(id);
    if (!sec) {
      sec = doc.createElement('section');
      sec.className = 'ct-sec ct-coll'; sec.id = id; sec.hidden = true;
      sec.setAttribute('data-coll', b.id); sec.setAttribute('aria-labelledby', id + '-h');
      sec.innerHTML = '<div class="ct-wrap"><div class="ct-coll-top"></div><div class="ct-sec-head"><div>' +
        '<span class="ct-eyebrow" data-f="eyebrow"></span><h2 class="ct-h2" id="' + id + '-h" data-f="title"></h2><p class="ct-lede" data-f="lede"></p></div>' +
        '<a class="ct-btn" data-f="cta_label" data-f-href="cta_url" href="/tours-catalogue"></a></div><div class="ct-coll-list"></div></div>';
    }
    return sec;
  }
  function paintColls() {
    var kit = K(); if (!kit || !kit.loaded() || !pageReady()) return;
    kit.page().filter(function (b) { return b.kind === 'collection'; }).forEach(function (b) {
      var sec = collSection(b), c = b.content || {};
      var tours = (Array.isArray(c.tour_ids) ? c.tour_ids : []).map(function (id) { return kit.tour(id); }).filter(Boolean);
      sec.hidden = !(b.enabled && tours.length);
      if (sec.hidden) return;
      fill(sec, c);
      var top = $('.ct-coll-top', sec);
      top.innerHTML = c.image ? '<div class="ct-coll-cover"><img src="' + kit.esc(c.image) + '" alt="" loading="lazy" decoding="async"/></div>' : '';
      var list = $('.ct-coll-list', sec), grid = c.layout === 'grid';
      list.className = 'ct-coll-list ' + (grid ? 'ct-grid' : 'ct-rail');
      list.innerHTML = tours.map(function (t) { return kit.card(t); }).join('');
      kit.reveal(list); kit.paintHearts();
    });
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
    var cover = g.cover ? '<img src="' + esc(g.cover) + '" alt="" loading="lazy"/>' : '<div class="ct-art" style="position:absolute;inset:0">' + kit.art('g' + g.id, 'lake', { w: 400, h: 160 }) + '</div>';
    var langs = (g.languages || []).slice(0, 3).join(', ');
    return '<article class="ct-guide ct-rv" id="g-' + esc(g.slug || g.id) + '">' +
      '<div class="ct-guide-cover">' + cover + '</div>' +
      '<div class="ct-guide-av">' + av + '</div>' +
      '<div class="ct-guide-b">' +
        '<span class="ct-guide-role">' + (g.persona === 'guide' ? 'Guide' : 'Tour operator') + (g.county ? ' · ' + esc(g.county) : '') + '</span>' +
        '<h3 class="ct-guide-n">' + esc(g.name) + (g.verified ? '<span style="color:var(--ct-turq);display:inline-flex" title="Vetted by Cabana">' + kit.icon.verified + '</span>' : '') + '</h3>' +
        '<p class="ct-guide-line">' + esc(g.tagline || g.bio || (langs ? 'Guides in ' + langs + '.' : '')) + '</p>' +
        '<div class="ct-guide-stats"><span><b>' + (g.tours || 0) + '</b>' + (g.tours === 1 ? 'tour' : 'tours') + '</span>' +
          (g.from_kes ? '<span><b>' + (g.from_kes >= 1000 ? Math.round(g.from_kes / 1000) + 'K' : Math.round(g.from_kes)) + '</b>from KES</span>' : g.free ? '<span><b>Free</b>walks</span>' : '') +
          (g.since ? '<span><b>' + esc(g.since) + '</b>joined</span>' : '') + '</div>' +
        '<div class="ct-guide-acts"><a class="ct-btn ct-btn-s" href="/tours-catalogue?op=' + encodeURIComponent(g.id) + '">Their tours</a><a class="ct-btn ct-btn-s ct-btn-sweep" href="/tour-guides#g-' + encodeURIComponent(g.slug || g.id) + '">Profile</a></div>' +
      '</div></article>';
  }
  function paintGuides() {
    var box = el('ct-guides'), sec = el('guides'); if (!box || !sec || !pageReady() || guides == null) return;
    var picks = (content('guides').featured_ids || []).map(String);
    var list = guides.filter(function (g) { return Number(g.tours) > 0; });
    list.sort(function (a, b) {
      var ia = picks.indexOf(String(a.id)), ib = picks.indexOf(String(b.id));
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    });
    sec.hidden = !(enabled('guides') && list.length);
    if (sec.hidden) { box.innerHTML = ''; return; }
    box.innerHTML = list.slice(0, 12).map(guideCard).join('');
    K().reveal(box);
  }

  /* ═══ THE CATALOGUE, FIRST LOOK ════════════════════════════════════ */
  function paintGrid() {
    var g = el('ct-grid'), kit = K(), sec = el('all'); if (!g || !kit || !sec) return;
    if (pageReady()) sec.hidden = !enabled('catalogue');
    if (!kit.loaded()) { g.innerHTML = kit.skeletons(4); return; }
    var c = content('catalogue');
    var list = kit.get().slice().sort(function (a, b) {
      return (b.featured === true) - (a.featured === true) ||
        String(b.published_at || '').localeCompare(String(a.published_at || '')) || (Number(b.id) - Number(a.id));
    });
    $$('[data-hide-empty]', sec).forEach(function (n) { if (!list.length) n.hidden = true; });
    if (!list.length) {
      var href = safeHref(c.empty_cta_url || '/list-your-tour');
      g.innerHTML = '<div class="ct-blank"><div class="ct-blank-mark">' + kit.icon.compass + '</div>' +
        '<h3>' + kit.esc(c.empty_title || 'The first tours are on their way') + '</h3>' +
        (c.empty_text ? '<p>' + kit.esc(c.empty_text) + '</p>' : '') +
        (c.empty_cta_label ? '<div class="ct-blank-acts"><a class="ct-btn ct-btn-sun" href="' + kit.esc(href) + '">' + kit.esc(c.empty_cta_label) + '</a></div>' : '') + '</div>';
      return;
    }
    var n = Math.max(4, Math.min(24, Number(c.limit) || 8));
    g.innerHTML = list.slice(0, n).map(function (t) { return kit.card(t); }).join('');
    kit.reveal(g); kit.paintHearts();
  }

  /* ═══ THE SPOTLIGHT, FOR GUIDES ════════════════════════════════════ */
  var settings = null, liveSlides = null;
  function paintPitch() {
    var kit = K(), sec = el('featured'), box = el('ct-feat-pk'); if (!kit || !sec || !pageReady()) return;
    var sales = !settings || settings.enabled !== false;
    sec.hidden = !(enabled('pitch') && sales);
    if (sec.hidden) return;
    if (box && settings && settings.prices) {
      var P = settings.prices, rows = [['day', '1 day', 'A launch or a one-off date'], ['week', '7 days', 'Most guides start here'], ['fortnight', '14 days', 'Covers two weekends'], ['month', '30 days', 'A full month at the top']];
      box.innerHTML = rows.filter(function (x) { return P[x[0]] != null; }).map(function (x) {
        return '<a href="/tours-studio?tab=spotlight&package=' + x[0] + '"' + (x[0] === 'week' ? ' class="best"' : '') + '><small>' + x[1] + '</small><b>' + kit.money(P[x[0]]) + '</b><span>' + x[2] + '</span></a>';
      }).join('');
    }
    // The preview is a slide that is running right now, or nothing.
    var scr = el('ct-feat-screen'), host = el('ct-feat-sl'), inner = $('.ct-feat-in', sec);
    var real = (liveSlides || []).filter(function (s) { return s.media_kind === 'image' || s.media_kind === 'video' || s.media_kind === 'youtube'; });
    var pickOne = real.filter(function (s) { return s.kind === 'sponsored'; })[0] || real.filter(function (s) { return s.kind === 'house'; })[0] || real[0];
    if (scr) scr.hidden = !pickOne;
    if (inner) inner.classList.toggle('solo', !pickOne);
    if (pickOne && host && global.CabanaSpotlight) {
      if (!host.__sl) host.__sl = global.CabanaSpotlight.create(host, { preview: true });
      host.__sl.set([Object.assign({}, pickOne, { id: 'pv-' + pickOne.id })]);
    }
  }
  function loadSettings() {
    var kit = K(), c = kit && kit.sb(); if (!c) return;
    c.from('tour_spotlight_settings').select('prices,enabled,max_sponsored').limit(1).then(function (r) {
      settings = (r && r.data && r.data[0]) || null; paintPitch();
    }, function () {});
  }

  /* ═══ START ═══════════════════════════════════════════════════════ */
  function paintAll() { layout(); paintBoard(); paintCats(); paintColls(); paintGrid(); paintGuides(); paintPitch(); }
  function start() {
    var kit = K(); if (!kit) return;
    /* A search from elsewhere belongs to the full catalogue. */
    try {
      var p = new URLSearchParams(global.location.search), q = p.get('q') || p.get('dest') || p.get('destination');
      if (q) { global.location.replace('/tours-catalogue?q=' + encodeURIComponent(q)); return; }
    } catch (e) {}
    wireBoard();
    paintGrid();
    kit.on('page', paintAll);
    kit.on('data', function () { paintBoard(); paintCats(); paintColls(); paintGrid(); });
    kit.on('saves', function () { kit.paintHearts(); });
    doc.addEventListener('ct:spotlight', function (e) { liveSlides = (e.detail && e.detail.slides) || []; paintPitch(); });
    loadGuides(); loadSettings();
    kit.reveal(doc);
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})(window);
