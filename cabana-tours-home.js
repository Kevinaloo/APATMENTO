/* ═══════════════════════════════════════════════════════════════════
   CABANA TOURS · /tours, below the Marquee
   ───────────────────────────────────────────────────────────────────
   Every section here is a block the Cabana team edits in the console
   (Tours → Page, stored in tour_page_blocks): its words, its order and
   whether it shows. What fills a section is always real:

     find        where, when and how many, into the catalogue with the
                 filters already set; places, kinds and tours as you type
     departures  the board: tour_departures() in the next 30 days, one
                 row per tour, flap clocks on Nairobi time
     kinds       eight kinds of trip; one with no tours yet offers
                 "tell me when" (tour_alert_set)
     immersive   the 360° room, only when the team switches it on
     places      the atlas: tour_places on a map of East Africa, each
                 with its tours or a "tell me when"
     collection  rows of tours the team picked by hand
     guides      approved guides with live tours, picks first
     catalogue   the latest tours, or how a tour gets onto Cabana
     pitch       a slot in the Marquee, with prices and a live slot,
                 and 360° filming for guides
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
  function esc(s) { return K().esc(s); }
  function I(p, sw) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }
  var IC = {
    check: I('<path d="m20 6-11 11-5-5"/>', 2.4),
    arrow: I('<path d="M7 17 17 7M8 7h9v9"/>', 2.2),
    right: I('<path d="M5 12h14M13 6l6 6-6 6"/>', 2.2),
    bell: I('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>', 2),
    chat: I('<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.7-.8L3 21l1.9-5.1A8.4 8.4 0 0 1 4 11.5 8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5z"/>'),
    pin: I('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'),
    verified: I('<path d="M12 2 4 6v6c0 5 3.4 9.4 8 10 4.6-.6 8-5 8-10V6l-8-4Z"/><path d="m9 12 2 2 4-4"/>'),
    compass: I('<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>', 1.8),
    grid: I('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
    zoomout: I('<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.2-4.2M8 11h6"/>'),
    vr: I('<path d="M3 9.2A2.7 2.7 0 0 1 5.7 6.5h12.6A2.7 2.7 0 0 1 21 9.2v5.1a2.7 2.7 0 0 1-2.7 2.7h-3.1a2 2 0 0 1-1.7-.9l-.8-1.2a.9.9 0 0 0-1.5 0l-.8 1.2a2 2 0 0 1-1.7.9H5.7A2.7 2.7 0 0 1 3 14.3z"/><circle cx="8" cy="11.8" r="1.6"/><circle cx="16" cy="11.8" r="1.6"/>', 1.9)
  };
  function reduced() { var k = K(); return !!(k && k.reduced && k.reduced()); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ── blocks ──────────────────────────────────────────────────────── */
  var SECTION = { departures: 'departures', kinds: 'kinds', immersive: 'immersive', places: 'places', guides: 'guides', catalogue: 'all', pitch: 'featured', invite: 'invite' };
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
      if (k === 'title' || /_title$/.test(k)) n.innerHTML = kit.headline(v); else n.textContent = v;
      var hk = n.getAttribute('data-f-href'); if (hk && c[hk]) n.setAttribute('href', safeHref(c[hk]));
    });
    $$('[data-f-list]', sec).forEach(function (ul) {
      var key = ul.getAttribute('data-f-list');
      var list = (Array.isArray(c[key]) ? c[key] : []).filter(function (x) { return x && String(x).trim(); });
      ul.innerHTML = list.map(function (x) { return '<li>' + IC.check + '<span>' + esc(x) + '</span></li>'; }).join('');
      ul.hidden = !list.length;
    });
    var clock = $('[data-f-clock]', sec); if (clock) clock.hidden = c.show_clock === false;
  }
  /* Sections follow the order set in the console. The Marquee and the
     search never move; everything else is re-appended in order. */
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
    var imm = el('immersive');
    if (imm) {
      imm.hidden = !enabled('immersive'); if (imm.hidden) imm.setAttribute('data-off', '1'); else imm.removeAttribute('data-off');
      var nx = imm.nextElementSibling; while (nx && nx.hidden) nx = nx.nextElementSibling;
      if (nx && nx.classList.contains('tw-places')) imm.setAttribute('data-next', 'band'); else imm.removeAttribute('data-next');
    }
    var inv = el('invite'); if (inv) inv.hidden = !enabled('invite');
    heads();
  }

  /* ── reveal: section heads, rows and tiles ease in as they arrive ── */
  var rio = null;
  function reveal(root) {
    var items = $$('.tw-rv:not(.in), .tw-row:not(.in)', root || doc);
    if (!items.length) return;
    if (!('IntersectionObserver' in global) || reduced()) { items.forEach(function (n) { n.classList.add('in'); }); return; }
    if (!rio) rio = new IntersectionObserver(function (es) {
      var i = 0;
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var n = e.target; rio.unobserve(n);
        setTimeout(function () { n.classList.add('in'); }, Math.min(i++, 8) * 70);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    items.forEach(function (n) { rio.observe(n); });
  }
  function heads() { $$('main .tw-head, main .tw-slotcard, main .tw-filmcard, main .tw-invite-in').forEach(function (h) { h.classList.add('tw-rv'); }); reveal(doc); }

  /* ═══ FIND A TOUR ══════════════════════════════════════════════════ */
  var cmd = { people: 0, idx: -1, items: [], open: false };
  function paintCmd() {
    var c = content('hero'), q = el('tw-q'), quick = el('tw-quick');
    if (q && c.search_placeholder) q.placeholder = c.search_placeholder;
    if (quick) {
      var links = (Array.isArray(c.links) ? c.links : []).filter(function (l) { return l && l.label && l.url; }).slice(0, 8);
      quick.innerHTML = links.map(function (l) { return '<a href="' + esc(safeHref(l.url)) + '">' + esc(l.label) + '</a>'; }).join('');
      quick.hidden = !links.length;
    }
  }
  function paintPeople() {
    var o = el('tw-people-o'), h = el('tw-people');
    if (o) o.textContent = cmd.people ? cmd.people + (cmd.people === 1 ? ' person' : ' people') : 'Any size';
    if (h) { h.value = cmd.people ? String(cmd.people) : ''; h.disabled = !cmd.people; }
    $$('[data-people]').forEach(function (b) {
      var d = Number(b.getAttribute('data-people'));
      b.disabled = d < 0 ? cmd.people <= 0 : cmd.people >= 30;
    });
  }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function small(img) { return String(img || '').replace(/-1400\.webp$/, '-720.webp'); }
  function placeCounts() {
    var kit = K(), n = {};
    kit.get().forEach(function (t) { if (t.place_id) n[t.place_id] = (n[t.place_id] || 0) + 1; });
    return n;
  }
  function paintSugg(raw) {
    var kit = K(), box = el('tw-sugg'), q = el('tw-q'); if (!box || !kit) return;
    var v = norm(raw), items = [], html = '', n = placeCounts();
    var places = kit.places().filter(function (p) {
      if (!v) return true;
      return norm([p.name, p.country, p.region].join(' ')).indexOf(v) !== -1;
    }).sort(function (a, b) { return (n[b.id] || 0) - (n[a.id] || 0) || (b.featured === true) - (a.featured === true) || (a.position || 0) - (b.position || 0); }).slice(0, v ? 5 : 6);
    if (places.length) {
      html += '<div class="tw-sugg-h">' + (v ? 'Places' : 'Popular places') + '</div>';
      places.forEach(function (p) {
        var c = n[p.id] || 0, i = items.push({ type: 'place', id: p.id }) - 1;
        html += '<button class="tw-sugg-i" type="button" role="option" data-i="' + i + '" id="tw-sg-' + i + '" aria-selected="false">' +
          '<span class="m">' + (p.image ? '<img src="' + esc(small(p.image)) + '" alt="" loading="lazy"/>' : IC.pin) + '</span>' +
          '<span><b>' + esc(p.name) + '</b><small>' + esc([p.country, p.line].filter(Boolean).join(' · ')) + '</small></span>' +
          '<span class="n' + (c ? ' on' : '') + '">' + (c ? c + (c === 1 ? ' tour' : ' tours') : 'Soon') + '</span></button>';
      });
    }
    if (v) {
      var kinds = kit.CAT_ORDER.filter(function (k) { var x = kit.CATS[k]; return x && !x.hidden && norm(x.name + ' ' + (x.blurb || '')).indexOf(v) !== -1; }).slice(0, 3);
      if (kinds.length) {
        html += '<div class="tw-sugg-h">Kinds of trip</div>';
        kinds.forEach(function (k) {
          var x = kit.CATS[k], i = items.push({ type: 'cat', id: k }) - 1;
          html += '<button class="tw-sugg-i" type="button" role="option" data-i="' + i + '" id="tw-sg-' + i + '" aria-selected="false"><span class="m">' + IC.compass + '</span><span><b>' + esc(x.name) + '</b><small>' + esc(x.blurb || '') + '</small></span><span class="n"></span></button>';
        });
      }
      if (v.length >= 2) {
        var tours = kit.get().filter(function (t) { return norm([t.title, t.destination, t.county, t.operator_name].join(' ')).indexOf(v) !== -1; }).slice(0, 4);
        if (tours.length) {
          html += '<div class="tw-sugg-h">Tours</div>';
          tours.forEach(function (t) {
            var i = items.push({ type: 'tour', id: t.id }) - 1, p = kit.price(t);
            html += '<button class="tw-sugg-i" type="button" role="option" data-i="' + i + '" id="tw-sg-' + i + '" aria-selected="false"><span class="m">' + kit.cover(t, '') + '</span><span><b>' + esc(t.title) + '</b><small>' + esc([t.destination || t.county, t.operator_name].filter(Boolean).join(' · ')) + '</small></span><span class="n">' + esc(p.v) + '</span></button>';
          });
        }
      }
      var j = items.push({ type: 'q', q: String(raw || '').trim() }) - 1;
      html += '<button class="tw-sugg-i" type="button" role="option" data-i="' + j + '" id="tw-sg-' + j + '" aria-selected="false"><span class="m">' + K().icon.search + '</span><span><b>Search every tour for “' + esc(String(raw).trim()) + '”</b><small>Titles, places, guides and tags</small></span><span class="n"></span></button>';
    }
    cmd.items = items; cmd.idx = -1;
    box.innerHTML = html;
    var show = !!items.length;
    box.hidden = !show; cmd.open = show;
    if (q) { q.setAttribute('aria-expanded', String(show)); q.removeAttribute('aria-activedescendant'); }
  }
  function closeSugg() { var box = el('tw-sugg'), q = el('tw-q'); if (box) box.hidden = true; cmd.open = false; cmd.idx = -1; if (q) q.setAttribute('aria-expanded', 'false'); }
  function markSugg() {
    var q = el('tw-q');
    $$('#tw-sugg .tw-sugg-i').forEach(function (b, i) { b.setAttribute('aria-selected', String(i === cmd.idx)); if (i === cmd.idx) b.scrollIntoView({ block: 'nearest' }); });
    if (q) { if (cmd.idx >= 0) q.setAttribute('aria-activedescendant', 'tw-sg-' + cmd.idx); else q.removeAttribute('aria-activedescendant'); }
  }
  function searchURL(extra) {
    var p = new URLSearchParams();
    Object.keys(extra || {}).forEach(function (k) { if (extra[k]) p.set(k, extra[k]); });
    var w = el('tw-when'), d = el('tw-date');
    if (w && w.value) p.set('when', w.value);
    if (w && w.value === 'date' && d && d.value) p.set('date', d.value);
    if (cmd.people > 0) p.set('people', String(cmd.people));
    var s = p.toString();
    return '/tours-catalogue' + (s ? '?' + s : '');
  }
  function choose(it) {
    if (!it) return;
    if (it.type === 'tour') { closeSugg(); K().open(it.id); return; }
    global.location.href = searchURL(it.type === 'place' ? { place: it.id } : it.type === 'cat' ? { cat: it.id } : { q: it.q });
  }
  function wireCmd() {
    var f = el('tw-cmd'); if (!f || f.__wired) return; f.__wired = true;
    var q = el('tw-q'), when = el('tw-when'), date = el('tw-date'), deb;
    if (when) when.addEventListener('change', function () {
      var on = when.value === 'date';
      date.hidden = !on; date.disabled = !on;
      if (on) { date.min = K().today(); try { date.focus(); if (date.showPicker) date.showPicker(); } catch (e) {} }
    });
    $$('[data-people]', f).forEach(function (b) {
      b.addEventListener('click', function () { cmd.people = clamp(cmd.people + Number(b.getAttribute('data-people')), 0, 30); paintPeople(); });
    });
    if (q) {
      q.addEventListener('input', function () { clearTimeout(deb); deb = setTimeout(function () { paintSugg(q.value); }, 70); });
      q.addEventListener('focus', function () { paintSugg(q.value); });
      q.addEventListener('keydown', function (e) {
        if (!cmd.open) { if (e.key === 'ArrowDown') { paintSugg(q.value); e.preventDefault(); } return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); cmd.idx = Math.min(cmd.items.length - 1, cmd.idx + 1); markSugg(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); cmd.idx = Math.max(-1, cmd.idx - 1); markSugg(); }
        else if (e.key === 'Escape') { closeSugg(); }
      });
    }
    var box = el('tw-sugg');
    if (box) {
      box.addEventListener('mousedown', function (e) { e.preventDefault(); });
      box.addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (b) choose(cmd.items[+b.getAttribute('data-i')]); });
    }
    doc.addEventListener('click', function (e) { if (cmd.open && !e.target.closest('#tw-cmd')) closeSugg(); });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (cmd.open && cmd.idx >= 0) { choose(cmd.items[cmd.idx]); return; }
      var v = q ? q.value.trim() : '';
      // A place typed in full goes to that place, not a text search.
      var hit = v && K().places().filter(function (p) { return norm(p.name) === norm(v); })[0];
      global.location.href = searchURL(hit ? { place: hit.id } : { q: v });
    });
    paintPeople();
  }

  /* ═══ DEPARTURES · the board ═══════════════════════════════════════ */
  var board = { f: 'all', all: false };
  var FILTERS = [
    { k: 'all', l: 'Next 30 days' }, { k: 'weekend', l: 'This weekend' }, { k: 'week', l: 'Next 7 days' },
    { k: 'day', l: 'Back the same day' }, { k: 'multi', l: 'Overnight' }, { k: 'budget', l: 'Under KES 5,000' }
  ];
  var LIMIT = 6;
  function weekendRange() {
    var t = new Date(K().today() + 'T12:00:00Z'), dow = t.getUTCDay();
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
  /* A static flap display, for the time a tour leaves. */
  function flap(str) {
    return '<span class="ct-cd tw-flap" aria-hidden="true"><span class="ct-fl">' + String(str).split('').map(function (ch) {
      return /\d/.test(ch) ? '<span class="ct-fd"><b>' + ch + '</b></span>' : '</span><span class="ct-cd-sep">' + esc(ch) + '</span><span class="ct-fl">';
    }).join('') + '</span></span>';
  }
  function dayWord(iso) {
    var kit = K(), today = kit.today();
    var tmr = new Date(new Date(today + 'T12:00:00Z').getTime() + 864e5).toISOString().slice(0, 10);
    if (iso === today) return 'Today';
    if (iso === tmr) return 'Tomorrow';
    return kit.fmtDay(iso, { weekday: 'short', timeZone: 'UTC' });
  }
  function row(t, d, extra) {
    var kit = K(), p = kit.price(t), left = d.seats_left == null ? null : Number(d.seats_left);
    var closesMs = d.closes_at ? new Date(d.closes_at).getTime() - Date.now() : 0;
    var time = kit.fmtTime(t.departure_time) || kit.nboClock(d.departs_at);
    // The board prints the place short, like a departures screen: "Naivasha", not "Naivasha & Hell's Gate".
    var place = kit.placeOf(t), dest = place ? place.name.split(' & ')[0] : (t.destination || t.county || kit.code(t));
    var vr = global.CabanaImmersive && global.CabanaImmersive.forTour && global.CabanaImmersive.forTour(t.id);
    var seat = left == null ? '' : left <= 3
      ? '<span class="tw-seat low"><i></i>' + (left === 1 ? 'Last seat' : 'Last ' + left + ' seats') + '</span>'
      : '<span class="tw-seat"><i></i>' + left + ' seats left</span>';
    var closing = closesMs > 0 && closesMs < 48 * 3600e3 ? '<span class="tw-seat closing"><i></i>Booking closes in ' + esc(kit.dur(closesMs)) + '</span>' : '';
    var av = t.operator_logo ? '<img src="' + esc(t.operator_logo) + '" alt="" loading="lazy"/>' : esc(String(t.operator_name || 'C').charAt(0).toUpperCase());
    var when = dayWord(d.departs_on) + ' ' + kit.fmtDay(d.departs_on, { day: 'numeric', month: 'short', timeZone: 'UTC' });
    return '<article class="tw-row' + (extra ? ' is-extra' : '') + '" role="listitem" tabindex="0" data-tour="' + esc(t.id) + '" data-date="' + esc(d.departs_on) + '" style="--acc:' + kit.accent(t) + '" aria-label="' + esc(t.title + ', ' + when + ' at ' + time + ', ' + p.v) + '">' +
      '<div class="tw-row-time">' + flap(time) + '<small><b>' + esc(dayWord(d.departs_on)) + '</b> ' + esc(kit.fmtDay(d.departs_on, { day: 'numeric', month: 'short', timeZone: 'UTC' })) + '</small></div>' +
      '<div class="tw-row-dest"><b>' + esc(dest) + '</b><span>' + esc(t.title) + (vr ? '<span class="vr">360°</span>' : '') + '</span></div>' +
      '<div class="tw-row-guide"><span class="av">' + av + '</span><span>' + esc(t.operator_name || 'Local guide') + '</span>' + (t.operator_verified ? IC.verified : '') + '</div>' +
      '<div class="tw-row-status"><span data-cd="' + esc(d.departs_at) + '" data-cd-done="Boarding now"></span>' + (closing || seat) + '</div>' +
      '<div class="tw-row-price' + (p.free ? ' free' : '') + '"><b>' + esc(p.v) + '</b><small>' + esc(p.u) + '</small></div>' +
      '<div class="tw-row-acts">' + kit.heart(t.id) +
        '<button class="tw-ic" type="button" data-ct-msg="' + esc(t.id) + '" data-date="' + esc(d.departs_on) + '" aria-label="Message the guide about ' + esc(t.title) + '">' + IC.chat + '</button>' +
        '<button class="tw-btn tw-btn-ember" type="button" data-ct-book="' + esc(t.id) + '" data-date="' + esc(d.departs_on) + '"' + (left === 0 ? ' disabled' : '') + '>' + (p.free ? 'Reserve' : 'Book') + '</button>' +
      '</div></article>';
  }
  function paintBoard() {
    var kit = K(), sec = el('departures'), rows = el('ct-dep-rail'), chips = el('ct-dep-f'), nav = el('ct-dep-nav');
    if (!rows || !kit || !sec || !kit.loaded() || !pageReady()) return;
    var all = kit.upcoming(30);
    sec.hidden = !(enabled('departures') && all.length);
    if (sec.hidden) { rows.innerHTML = ''; return; }
    if (chips) {
      chips.innerHTML = FILTERS.map(function (f) {
        var n = pick(all, f.k).length;
        if (f.k !== 'all' && !n) return '';
        return '<button class="tw-chip" type="button" data-f="' + f.k + '" aria-pressed="' + (board.f === f.k) + '">' + f.l + '<span class="n">' + n + '</span></button>';
      }).join('');
      chips.hidden = all.length < 3;
    }
    var list = pick(all, board.f);
    if (!list.length) { board.f = 'all'; list = all; }
    rows.innerHTML = list.map(function (u, i) { return row(u.tour, u.dep, i >= LIMIT); }).join('');
    sec.classList.toggle('show-all', board.all);
    var more = $('[data-dep-more]', sec);
    if (more) { more.hidden = list.length <= LIMIT; more.textContent = board.all ? 'Show fewer' : 'Show all ' + list.length + ' departures'; }
    var note = el('tw-dep-note');
    if (note) note.textContent = all.length + (all.length === 1 ? ' departure' : ' departures') + ' with seats · live from the guides';
    if (nav) nav.hidden = false;
    kit.countdowns(rows); reveal(rows); kit.paintHearts();
  }
  function wireBoard() {
    var sec = el('departures'), rows = el('ct-dep-rail'), chips = el('ct-dep-f');
    if (!rows) return;
    if (chips) chips.addEventListener('click', function (e) {
      var b = e.target.closest('[data-f]'); if (!b) return;
      board.f = b.getAttribute('data-f'); board.all = false; paintBoard();
    });
    var more = sec && $('[data-dep-more]', sec);
    if (more) more.addEventListener('click', function () { board.all = !board.all; paintBoard(); if (!board.all) rows.scrollIntoView({ block: 'nearest' }); });
    function openRow(r) { K().open(r.getAttribute('data-tour'), { date: r.getAttribute('data-date') }); }
    rows.addEventListener('click', function (e) {
      if (e.target.closest('button, a')) return;
      var r = e.target.closest('.tw-row'); if (r) openRow(r);
    });
    rows.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('tw-row')) { e.preventDefault(); openRow(e.target); }
    });
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
      var x = kit.CATS[k], cnt = n[k] || 0, big = i < 2;
      var img = x.image || (x.photo ? '/assets/tours/kinds/' + x.photo + (big ? '-1400' : '-720') + '.webp' : '');
      var label = x.name + (cnt ? ', ' + cnt + (cnt === 1 ? ' tour' : ' tours') : ', first tours soon');
      return '<div class="tw-kind tw-rv' + (cnt ? '' : ' is-empty') + '" style="--acc:' + x.a + '">' +
        (img ? '<img src="' + esc(img) + '" alt="" loading="lazy" decoding="async"/>' : '') +
        '<a class="tw-kind-a" href="/tours-catalogue?cat=' + k + '" aria-label="' + esc(label) + '"></a>' +
        (cnt ? '<span class="n tw-badge tw-badge-ad">' + cnt + (cnt === 1 ? ' tour' : ' tours') + '</span><span class="go" aria-hidden="true">' + IC.arrow + '</span>'
             : '<span class="n tw-badge tw-badge-glass">First tours soon</span>' +
               '<button class="tw-follow on-dark" type="button" data-ct-follow="cat:' + k + '" aria-pressed="false" data-off="Tell me" data-on="Following" aria-label="Tell me when ' + esc(x.name.toLowerCase()) + ' open">' + IC.bell + '<span class="lbl" data-follow-l>Tell me</span></button>') +
        '<b>' + esc(x.name) + '</b>' + (x.blurb ? '<span class="l">' + esc(x.blurb) + '</span>' : '') +
      '</div>';
    }).join('');
    kit.paintFollows(); reveal(box);
  }

  /* ═══ PLACES · the atlas ═══════════════════════════════════════════
     A map of East Africa drawn from Natural Earth, with every place the
     team keeps in the console pinned where it is. Choosing a place flies
     the map to it and fills the card beside it with its tours, or with a
     "tell me when". */
  var atlas = { data: null, loading: false, sel: null, z: 1, tx: 0, ty: 0, s: 1, raf: 0, seen: false, userMoved: false };
  function loadAtlas() {
    if (atlas.data !== null || atlas.loading) return;
    atlas.loading = true;
    fetch('/assets/tours/atlas-east-africa.json', { cache: 'force-cache' }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { atlas.data = d && d.w ? d : false; atlas.loading = false; paintPlaces(); }, function () { atlas.data = false; atlas.loading = false; paintPlaces(); });
  }
  function proj(lat, lng) { var d = atlas.data; return [(lng - d.lon0) * d.kx, (d.lat0 - lat) * d.ky]; }
  function dms(v, pos, neg) {
    var a = Math.abs(Number(v) || 0), deg = Math.floor(a), min = Math.round((a - deg) * 60);
    if (min === 60) { deg++; min = 0; }
    return deg + '°' + String(min).padStart(2, '0') + '′' + (v < 0 ? neg : pos);
  }
  function placeStats(id) {
    var kit = K(), tours = kit.get().filter(function (t) { return t.place_id === id; });
    var next = null, from = null;
    tours.forEach(function (t) {
      var d = kit.next(t.id);
      if (d && (!next || new Date(d.departs_at) < new Date(next.departs_at))) next = d;
      var pr = Number(t.price_kes); if (pr > 0 && (from == null || pr < from)) from = pr;
    });
    return { tours: tours, next: next, from: from };
  }
  function defaultPlace(places, n) {
    var withTours = places.filter(function (p) { return n[p.id]; }).sort(function (a, b) { return n[b.id] - n[a.id]; });
    return (withTours[0] || places.filter(function (p) { return p.featured; })[0] || places[0]).id;
  }
  function paintPlaces() {
    var kit = K(), sec = el('places'); if (!sec || !kit) return;
    if (!pageReady() || !kit.placesLoaded()) return;
    var c = content('places'), places = kit.places();
    sec.hidden = !(enabled('places') && places.length);
    if (sec.hidden) return;
    var n = kit.loaded() ? placeCounts() : {};
    if (!atlas.sel || !kit.place(atlas.sel)) atlas.sel = defaultPlace(places, n);
    var map = el('tw-map'), atl = el('tw-atlas');
    var showMap = c.show_map !== false && atlas.data !== false;
    if (map) map.hidden = !showMap;
    if (atl) atl.style.gridTemplateColumns = showMap ? '' : 'minmax(0, 1fr)';
    if (showMap && atlas.data) buildMap(places, n); else if (showMap) { loadAtlasSoon(); }
    paintInspect();
    var idx = el('tw-index');
    if (idx) idx.innerHTML = places.map(function (p) {
      var cnt = n[p.id] || 0;
      return '<button type="button" data-place="' + esc(p.id) + '" aria-pressed="' + (p.id === atlas.sel) + '">' + esc(p.name) + '<span class="n' + (cnt ? '' : ' none') + '">' + (cnt || '·') + '</span></button>';
    }).join('');
  }
  var atlasIO = null;
  function loadAtlasSoon() {
    var sec = el('places'); if (!sec || atlasIO) return;
    if (!('IntersectionObserver' in global)) { loadAtlas(); return; }
    atlasIO = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { atlasIO.disconnect(); loadAtlas(); } }, { rootMargin: '900px 0px' });
    atlasIO.observe(sec);
  }
  function buildMap(places, n) {
    var d = atlas.data, map = el('tw-map'); if (!map || !d) return;
    var W = d.w, H = d.h, kit = K();
    var sig = places.map(function (p) { return p.id + ':' + (n[p.id] || 0); }).join(',');
    if (map.__sig === sig) { selectPin(atlas.sel, false); return; }
    map.__sig = sig;
    var grat = '';
    for (var lon = 25; lon <= 45; lon += 5) { var gx = (lon - d.lon0) * d.kx; grat += 'M' + gx.toFixed(1) + ' 0V' + H; }
    for (var lat = 5; lat >= -15; lat -= 5) { var gy = (d.lat0 - lat) * d.ky; grat += 'M0 ' + gy.toFixed(1) + 'H' + W; }
    var labels = (d.labels || []).map(function (l) {
      var xy = proj(l.lat, l.lon);
      return '<g class="bb" data-x="' + xy[0].toFixed(1) + '" data-y="' + xy[1].toFixed(1) + '"><text class="lbl ' + esc(l.k) + '" text-anchor="middle" y="4">' + esc(l.t) + '</text></g>';
    }).join('');
    var pins = places.filter(function (p) { return isFinite(p.lat) && isFinite(p.lng) && p.lat != null && p.lng != null; }).map(function (p, i) {
      var xy = proj(p.lat, p.lng), cnt = n[p.id] || 0;
      return '<g class="bb tw-pin' + (cnt ? ' has' : '') + '" data-place="' + esc(p.id) + '" data-x="' + xy[0].toFixed(1) + '" data-y="' + xy[1].toFixed(1) + '" style="--pi:' + i + '" tabindex="0" role="button" aria-label="' + esc(p.name + (cnt ? ', ' + cnt + (cnt === 1 ? ' tour' : ' tours') : ', no tours yet')) + '">' +
        '<circle class="halo" r="15"/><circle class="dot" r="' + (cnt ? 7.5 : 6) + '"/>' +
        '<g class="tag"><rect rx="9" height="26" y="-13"/><text x="10" y="4.5">' + esc(p.name) + '</text>' + (cnt ? '<text class="c" y="4.5">' + cnt + '</text>' : '') + '</g></g>';
    }).join('');
    map.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid slice" aria-hidden="false">' +
      '<rect class="sea" width="' + W + '" height="' + H + '"/>' +
      '<g class="world"><path class="grat" d="' + grat + '" vector-effect="non-scaling-stroke"/>' +
        '<path class="land" d="' + d.land + '" vector-effect="non-scaling-stroke"/>' +
        d.focus.map(function (f) { return '<path class="focus" d="' + f.d + '" vector-effect="non-scaling-stroke"><title>' + esc(f.n) + '</title></path>'; }).join('') +
        '<path class="lake" d="' + d.lakes + '"/>' +
        '<path class="cross" vector-effect="non-scaling-stroke" d=""/>' +
      '</g><g class="bbs">' + labels + pins + '</g></svg>' +
      '<div class="tw-map-note" aria-hidden="true"><span><i></i>Tours listed</span><span><i class="none"></i>Coming soon</span></div>' +
      '<button class="tw-map-zoom tw-ic" type="button" data-zoom-out aria-label="Show the whole map" hidden>' + IC.zoomout + '</button>';
    // Tag widths from the real text.
    $$('.tw-pin .tag', map).forEach(function (t) {
      var tx = t.querySelector('text'), c2 = t.querySelector('.c');
      var w = 0; try { w = tx.getComputedTextLength(); } catch (e) { w = tx.textContent.length * 7.4; }
      var cw = 0; if (c2) { try { cw = c2.getComputedTextLength(); } catch (e) { cw = 8; } c2.setAttribute('x', (18 + w).toFixed(1)); }
      var total = 20 + w + (c2 ? cw + 8 : 0);
      t.querySelector('rect').setAttribute('width', total.toFixed(1));
      t.__w = total;
    });
    wireMap(map);
    atlas.s = map.clientWidth / W || 1;
    applyView(atlas.z, atlas.tx, atlas.ty);
    selectPin(atlas.sel, false);
    if (!atlas.seen && 'IntersectionObserver' in global) {
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        io.disconnect(); atlas.seen = true; map.classList.add('in');
        // The map glides in to the chosen place once it is in view.
        if (!atlas.userMoved) setTimeout(function () { flyTo(atlas.sel, zoomFor()); }, reduced() ? 0 : 650);
      }, { threshold: 0.35 });
      io.observe(map);
    } else { map.classList.add('in'); }
  }
  function applyView(z, tx, ty) {
    var map = el('tw-map'); if (!map) return;
    var world = $('.world', map); if (!world) return;
    atlas.z = z; atlas.tx = tx; atlas.ty = ty;
    world.setAttribute('transform', 'translate(' + tx.toFixed(2) + ' ' + ty.toFixed(2) + ') scale(' + z.toFixed(4) + ')');
    var k = 1 / (atlas.s || 1);
    $$('.bb', map).forEach(function (g) {
      var x = Number(g.getAttribute('data-x')) * z + tx, y = Number(g.getAttribute('data-y')) * z + ty;
      g.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + k.toFixed(4) + ')');
    });
    var zb = $('[data-zoom-out]', map); if (zb) zb.hidden = z < 1.2;
  }
  function viewFor(id, z) {
    var d = atlas.data, p = K().place(id);
    if (!d || !p) return { z: 1, tx: 0, ty: 0 };
    var xy = proj(p.lat, p.lng), W = d.w, H = d.h;
    // Keep the chosen place a little left of centre, clear of the card.
    var tx = W * 0.5 - xy[0] * z, ty = H * 0.48 - xy[1] * z;
    tx = Math.min(0, Math.max(W - W * z, tx)); ty = Math.min(0, Math.max(H - H * z, ty));
    return { z: z, tx: tx, ty: ty };
  }
  function tween(to, ms) {
    cancelAnimationFrame(atlas.raf);
    var from = { z: atlas.z, tx: atlas.tx, ty: atlas.ty };
    if (reduced() || !ms) { applyView(to.z, to.tx, to.ty); placeTags(); return; }
    var t0 = performance.now();
    (function step(now) {
      var k = Math.min(1, (now - t0) / ms), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      applyView(from.z + (to.z - from.z) * e, from.tx + (to.tx - from.tx) * e, from.ty + (to.ty - from.ty) * e);
      if (k < 1) atlas.raf = requestAnimationFrame(step); else placeTags();
    })(t0);
  }
  /* Close enough that the Kenyan pins stand apart, closer on a phone. */
  function zoomFor() { var map = el('tw-map'), w = map ? map.clientWidth : 640; return clamp(2.1 * 640 / Math.max(280, w), 2.1, 3.6); }
  function flyTo(id, z) { tween(viewFor(id, z || Math.max(atlas.z, zoomFor())), 900); }
  /* Labels go where they fit: right of the pin, then left, above, below.
     Zoomed out, only the chosen place is named; hovering names the rest. */
  function placeTags() {
    var map = el('tw-map'); if (!map) return;
    var pins = $$('.tw-pin', map), placed = [], k = atlas.s || 1;
    var pos = function (g) { return { x: (Number(g.getAttribute('data-x')) * atlas.z + atlas.tx) * k, y: (Number(g.getAttribute('data-y')) * atlas.z + atlas.ty) * k }; };
    var W = map.clientWidth, H = map.clientHeight;
    // Every pin is an obstacle, so a name never sits on another place.
    var dots = pins.map(function (g) { var p = pos(g); return { x: p.x - 9, y: p.y - 9, w: 18, h: 18, g: g }; });
    // Keep clear of the zoom button and the key.
    dots.push({ x: W - 64, y: 0, w: 64, h: 64 }, { x: 0, y: H - 36, w: 250, h: 36 });
    pins.sort(function (a, b) { return (b.classList.contains('on') - a.classList.contains('on')) || (b.classList.contains('has') - a.classList.contains('has')); });
    pins.forEach(function (g) {
      var tag = g.querySelector('.tag'); if (!tag) return;
      var w = tag.__w || 90, h = 26, p = pos(g), ok = null;
      var cands = [[14, -h / 2], [-14 - w, -h / 2], [-w / 2, -h - 14], [-w / 2, 14], [12, -h - 6], [12, 6], [-12 - w, -h - 6], [-12 - w, 6]];
      for (var i = 0; i < cands.length && !ok; i++) {
        var r = { x: p.x + cands[i][0], y: p.y + cands[i][1], w: w, h: h };
        if (r.x < 4 || r.y < 4 || r.x + r.w > W - 4 || r.y + r.h > H - 4) continue;
        var hit = placed.some(function (q) { return r.x < q.x + q.w + 4 && r.x + r.w + 4 > q.x && r.y < q.y + q.h + 3 && r.y + r.h + 3 > q.y; }) ||
          dots.some(function (d) { return d.g !== g && r.x < d.x + d.w && r.x + r.w > d.x && r.y < d.y + d.h && r.y + r.h > d.y; });
        if (!hit) { ok = cands[i]; placed.push(r); }
      }
      var o = ok || cands[0];
      tag.setAttribute('transform', 'translate(' + o[0].toFixed(1) + ' ' + (o[1] + h / 2).toFixed(1) + ')');
      g.classList.toggle('show', !!ok && (atlas.z >= 1.6 || g.classList.contains('on')));
    });
  }
  function selectPin(id, fly) {
    var map = el('tw-map');
    atlas.sel = id;
    if (map) {
      $$('.tw-pin', map).forEach(function (g) { var on = g.getAttribute('data-place') === id; g.classList.toggle('on', on); if (on) g.parentNode.appendChild(g); });
      var p = K().place(id), cross = $('.cross', map);
      if (cross && p && atlas.data) { var xy = proj(p.lat, p.lng); cross.setAttribute('d', 'M' + xy[0].toFixed(1) + ' -2000V4000M-2000 ' + xy[1].toFixed(1) + 'H4000'); cross.classList.add('on'); }
      placeTags();
    }
    $$('#tw-index [data-place]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-place') === id)); });
    if (fly && atlas.data) flyTo(id);
  }
  function wireMap(map) {
    if (map.__wired) return; map.__wired = true;
    map.addEventListener('click', function (e) {
      if (e.target.closest('[data-zoom-out]')) { atlas.userMoved = true; tween({ z: 1, tx: 0, ty: 0 }, 800); return; }
      var g = e.target.closest('.tw-pin'); if (!g) return;
      atlas.userMoved = true; choosePlace(g.getAttribute('data-place'), true);
    });
    map.addEventListener('keydown', function (e) {
      var g = e.target.closest && e.target.closest('.tw-pin');
      if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); atlas.userMoved = true; choosePlace(g.getAttribute('data-place'), true); }
    });
    var rt;
    global.addEventListener('resize', function () {
      clearTimeout(rt); rt = setTimeout(function () { if (!atlas.data) return; atlas.s = map.clientWidth / atlas.data.w || 1; applyView(atlas.z, atlas.tx, atlas.ty); placeTags(); }, 120);
    }, { passive: true });
  }
  function choosePlace(id, fly) {
    if (!K().place(id)) return;
    selectPin(id, fly);
    paintInspect(true);
  }
  function paintInspect(anim) {
    var kit = K(), box = el('tw-inspect'), p = kit.place(atlas.sel); if (!box || !p) return;
    var st = kit.loaded() ? placeStats(p.id) : { tours: [], next: null, from: null }, cnt = st.tours.length;
    var coords = isFinite(p.lat) && p.lat != null ? dms(p.lat, 'N', 'S') + ' ' + dms(p.lng, 'E', 'W') : '';
    var stats = cnt
      ? '<span><b>' + cnt + '</b> ' + (cnt === 1 ? 'tour' : 'tours') + '</span>' +
        (st.next ? '<span>Next leaves <b>' + esc(kit.fmtDay(st.next.departs_on).replace(',', '')) + '</b></span>' : '') +
        (st.from != null ? '<span>From <b>' + esc(kit.money(st.from)) + '</b></span>' : '<span><b>Free</b> walks</span>')
      : '<span class="none">No tours listed here yet. Guides are being checked all the time.</span>';
    var tours = st.tours.slice().sort(function (a, b) {
      var da = kit.next(a.id), db = kit.next(b.id);
      return (da ? new Date(da.departs_at).getTime() : Infinity) - (db ? new Date(db.departs_at).getTime() : Infinity);
    }).slice(0, 3).map(function (t) {
      var d = kit.next(t.id), pr = kit.price(t);
      return '<div class="tw-inspect-tour" role="button" tabindex="0" data-ct-open="' + esc(t.id) + '"><span class="m">' + kit.cover(t, '') + '</span><span><b>' + esc(t.title) + '</b><small>' +
        esc([d ? 'Next ' + kit.fmtDay(d.departs_on).replace(',', '') : t.schedule_type === 'on_request' ? 'Runs on request' : '', t.operator_name].filter(Boolean).join(' · ')) + '</small></span><span class="p">' + esc(pr.v) + '</span></div>';
    }).join('');
    var off = cnt ? 'Tell me about new tours' : 'Tell me when tours open', fon = kit.isFollowing(p.id, null);
    var follow = '<button class="tw-follow" type="button" data-ct-follow="place:' + esc(p.id) + '" aria-pressed="' + fon + '" data-off="' + off + '" data-on="Following ' + esc(p.name) + '">' + IC.bell + '<span data-follow-l>' + (fon ? 'Following ' + esc(p.name) : off) + '</span></button>';
    box.innerHTML =
      '<div class="tw-inspect-m">' + (p.image ? '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" style="object-position:' + esc(p.focal || '50% 50%') + '"' + (anim ? '' : ' loading="lazy"') + '/>' : '') +
        '<span class="tw-badge ' + (cnt ? 'tw-badge-ad' : 'tw-badge-glass') + '">' + (cnt ? cnt + (cnt === 1 ? ' tour' : ' tours') : 'Coming soon') + '</span></div>' +
      '<div class="tw-inspect-b">' +
        '<div class="tw-inspect-k"><span>' + esc([p.country, p.region].filter(Boolean).join(' · ')) + '</span><span>' + esc(coords) + '</span></div>' +
        '<h3>' + esc(p.name) + '</h3>' +
        (p.line ? '<p>' + esc(p.line) + '</p>' : '') +
        '<div class="tw-inspect-stat">' + stats + '</div>' +
        (tours ? '<div class="tw-inspect-tours">' + tours + '</div>' : '') +
        '<div class="tw-inspect-acts">' +
          (cnt ? '<a class="tw-btn tw-btn-ember" href="/tours-catalogue?place=' + encodeURIComponent(p.id) + '">' + (cnt === 1 ? 'See the tour' : 'See all ' + cnt + ' tours') + IC.right + '</a>' + follow
               : follow + '<a class="tw-btn tw-btn-line tw-btn-s" href="/tours-catalogue">Browse every tour</a>') +
        '</div></div>';
    kit.paintFollows();
  }
  function wirePlaces() {
    var idx = el('tw-index');
    if (idx) idx.addEventListener('click', function (e) {
      var b = e.target.closest('[data-place]'); if (!b) return;
      atlas.userMoved = true; choosePlace(b.getAttribute('data-place'), true);
      var map = el('tw-map');
      if (map && !map.hidden && global.innerWidth < 960) { var r = map.getBoundingClientRect(); if (r.top < 60 || r.bottom > global.innerHeight) map.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' }); }
    });
    var box = el('tw-inspect');
    if (box) box.addEventListener('keydown', function (e) {
      var t = e.target.closest && e.target.closest('.tw-inspect-tour');
      if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); K().open(t.getAttribute('data-ct-open')); }
    });
  }

  /* ═══ COLLECTIONS: rows the team picks ═════════════════════════════ */
  function collSection(b) {
    var id = 'c-' + b.id, sec = el(id);
    if (!sec) {
      sec = doc.createElement('section');
      sec.className = 'tw-sec tw-coll'; sec.id = id; sec.hidden = true;
      sec.setAttribute('data-coll', b.id); sec.setAttribute('aria-labelledby', id + '-h');
      sec.innerHTML = '<div class="ct-wrap"><div class="tw-coll-top"></div><div class="tw-head"><div>' +
        '<span class="tw-eyebrow" data-f="eyebrow"></span><h2 class="tw-h2" id="' + id + '-h" data-f="title"></h2><p class="tw-lede" data-f="lede"></p></div>' +
        '<a class="tw-btn tw-btn-line" data-f="cta_label" data-f-href="cta_url" href="/tours-catalogue"></a></div><div class="ct-coll-list"></div></div>';
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
      var top = $('.tw-coll-top', sec);
      top.innerHTML = c.image ? '<div class="tw-coll-cover"><img src="' + esc(c.image) + '" alt="" loading="lazy" decoding="async"/></div>' : '';
      var list = $('.ct-coll-list', sec), grid = c.layout === 'grid';
      list.className = 'ct-coll-list ' + (grid ? 'ct-grid' : 'ct-rail');
      list.innerHTML = tours.map(function (t) { return kit.card(t); }).join('');
      kit.reveal(list); kit.paintHearts(); heads();
    });
  }

  /* ═══ GUIDES ═══════════════════════════════════════════════════════ */
  var guides = null;
  function loadGuides() {
    var kit = K(), c = kit && kit.sb(); if (!c || !el('ct-guides')) return;
    c.rpc('tour_guides_directory').then(function (r) { guides = r && Array.isArray(r.data) ? r.data : []; paintGuides(); }, function () { guides = []; paintGuides(); });
  }
  function guideCard(g) {
    var kit = K();
    var av = g.logo ? '<img src="' + esc(g.logo) + '" alt="" loading="lazy"/>' : '<span>' + esc(String(g.name || '?').charAt(0).toUpperCase()) + '</span>';
    var cover = g.cover ? '<img src="' + esc(g.cover) + '" alt="" loading="lazy"/>' : '<div class="ct-art" style="position:absolute;inset:0">' + kit.art('g' + g.id, 'savanna', { w: 400, h: 160 }) + '</div>';
    var langs = (g.languages || []).slice(0, 3).join(', ');
    return '<article class="ct-guide ct-rv" id="g-' + esc(g.slug || g.id) + '">' +
      '<div class="ct-guide-cover">' + cover + '</div>' +
      '<div class="ct-guide-av">' + av + '</div>' +
      '<div class="ct-guide-b">' +
        '<span class="ct-guide-role">' + (g.persona === 'guide' ? 'Guide' : 'Tour operator') + (g.county ? ' · ' + esc(g.county) : '') + '</span>' +
        '<h3 class="ct-guide-n">' + esc(g.name) + (g.verified ? '<span style="color:var(--tw-acacia);display:inline-flex" title="Vetted by Cabana">' + kit.icon.verified + '</span>' : '') + '</h3>' +
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

  /* ═══ ALL TOURS, FIRST LOOK ════════════════════════════════════════ */
  function paintGrid() {
    var g = el('ct-grid'), kit = K(), sec = el('all'); if (!g || !kit || !sec) return;
    if (pageReady()) sec.hidden = !enabled('catalogue');
    if (!kit.loaded()) { g.innerHTML = kit.skeletons(4); return; }
    var c = content('catalogue');
    var list = kit.get().slice().sort(function (a, b) {
      return (b.featured === true) - (a.featured === true) ||
        String(b.published_at || '').localeCompare(String(a.published_at || '')) || (Number(b.id) - Number(a.id));
    });
    $$('[data-hide-empty]', sec).forEach(function (n) { n.hidden = !list.length; });
    if (!list.length) {
      var href = safeHref(c.empty_cta_url || '/list-your-tour'), places = enabled('places') && kit.places().length;
      g.innerHTML = '<div class="tw-empty">' +
        '<div><h3>' + esc(c.empty_title || 'The first tours are being checked') + '</h3>' +
          (c.empty_text ? '<p>' + esc(c.empty_text) + '</p>' : '') +
          '<div class="tw-empty-acts">' + (places ? '<a class="tw-btn tw-btn-ink" href="#places" data-jump>' + IC.bell + 'Follow a place</a>' : '') +
            (c.empty_cta_label ? '<a class="tw-btn tw-btn-line" href="' + esc(href) + '">' + esc(c.empty_cta_label) + '</a>' : '') + '</div></div>' +
        '<ol class="tw-steps">' +
          '<li><div><b>A guide applies</b><span>They tell us who they are, where they work and what they run.</span></div></li>' +
          '<li><div><b>Cabana checks them</b><span>The guide or company is verified before anything goes live.</span></div></li>' +
          '<li><div><b>Every tour is reviewed</b><span>Prices, dates and pictures are checked, one tour at a time.</span></div></li>' +
          '<li><div><b>You hear first</b><span>Follow a place and we tell you the moment its first tour opens.</span></div></li>' +
        '</ol></div>';
      return;
    }
    var n = Math.max(4, Math.min(24, Number(c.limit) || 8));
    g.innerHTML = list.slice(0, n).map(function (t) { return kit.card(t); }).join('');
    kit.reveal(g); kit.paintHearts();
  }

  /* ═══ FOR GUIDES: a slot in the Marquee ════════════════════════════ */
  var settings = null, liveSlides = null, demo = null;
  function paintPitch() {
    var kit = K(), sec = el('featured'), box = el('ct-feat-pk'); if (!kit || !sec || !pageReady()) return;
    sec.hidden = !enabled('pitch');
    if (sec.hidden) return;
    var sales = !settings || settings.enabled !== false;
    var card = $('.tw-slotcard', sec), grid = $('.tw-partner-grid', sec);
    if (card) card.hidden = !sales;
    if (grid) grid.style.gridTemplateColumns = sales ? '' : 'minmax(0, 1fr)';
    if (box) {
      var P = settings && settings.prices;
      var rows = [['day', '1 day', 'A launch or one date'], ['week', '7 days', 'Most guides start here'], ['fortnight', '14 days', 'Two weekends'], ['month', '30 days', 'A month at the top']];
      box.innerHTML = P ? rows.filter(function (x) { return P[x[0]] != null; }).map(function (x) {
        return '<a href="/tours-studio?tab=spotlight&amp;package=' + x[0] + '"' + (x[0] === 'week' ? ' class="best"' : '') + '><small>' + x[1] + '</small><b>' + kit.money(P[x[0]]) + '</b><span>' + x[2] + '</span></a>';
      }).join('') : '';
      box.hidden = !P;
    }
    // The demo is a slot running right now, or a drawing of the slot.
    var host = el('ct-feat-sl'), scr = el('ct-feat-screen'); if (!host || !scr) return;
    var real = (liveSlides || []).filter(function (s) { return (s.kind === 'sponsored' || s.kind === 'house') && /^(image|video|youtube)$/.test(s.media_kind) && !s._auto; });
    var one = real.filter(function (s) { return s.kind === 'sponsored'; })[0] || real[0];
    var badge = $('.tw-live', scr);
    if (one && global.CabanaSpotlight) {
      if (!demo) { host.innerHTML = ''; demo = global.CabanaSpotlight.create(host, { preview: true }); }
      demo.set([Object.assign({}, one, { id: 'pv-' + one.id })]);
      if (!badge) scr.insertAdjacentHTML('beforeend', '<span class="tw-badge tw-badge-sun tw-live">Running now</span>');
      var cap = el('tw-slot-cap'); if (cap) cap.textContent = 'Live in the Marquee right now.';
    } else {
      if (demo) { demo.destroy(); demo = null; }
      if (badge) badge.remove();
      host.className = ''; host.removeAttribute('role');
      host.innerHTML = '<div class="tw-wire" aria-hidden="true"><div class="ph">Your photo or film</div><span>Sponsored · your name</span><span class="big">Your headline, in the words you choose</span><span class="btn">Book this tour →</span></div>';
      var cap2 = el('tw-slot-cap'); if (cap2) cap2.textContent = 'How a slot looks in the Marquee.';
    }
  }

  /* ═══ START ═══════════════════════════════════════════════════════ */
  function paintAll() { layout(); paintCmd(); paintBoard(); paintCats(); paintPlaces(); paintColls(); paintGrid(); paintGuides(); paintPitch(); }
  function start() {
    var kit = K(); if (!kit) return;
    /* A search from elsewhere belongs to the full catalogue. */
    try {
      var p = new URLSearchParams(global.location.search), q = p.get('q') || p.get('dest') || p.get('destination');
      if (q) { global.location.replace('/tours-catalogue?q=' + encodeURIComponent(q)); return; }
    } catch (e) {}
    wireCmd(); wireBoard(); wirePlaces();
    paintGrid();
    kit.on('page', paintAll);
    kit.on('data', function () { paintBoard(); paintCats(); paintPlaces(); paintColls(); paintGrid(); });
    kit.on('places', function () { paintPlaces(); paintGrid(); });
    kit.on('saves', function () { kit.paintHearts(); });
    kit.on('follows', function () { kit.paintFollows(); });
    doc.addEventListener('ct:spotlight', function (e) {
      var d = e.detail || {};
      liveSlides = d.slides || []; if (d.settings) settings = d.settings;
      paintPitch();
    });
    doc.addEventListener('click', function (e) {
      var j = e.target.closest && e.target.closest('a[data-jump]'); if (!j) return;
      var t = doc.querySelector(j.getAttribute('href')); if (!t || t.hidden) return;
      e.preventDefault();
      var top = el('ct-top');
      global.scrollTo({ top: t.getBoundingClientRect().top + global.scrollY - (top ? top.offsetHeight : 0) + 1, behavior: reduced() ? 'auto' : 'smooth' });
    });
    loadGuides(); loadAtlasSoon();
    heads();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})(window);
