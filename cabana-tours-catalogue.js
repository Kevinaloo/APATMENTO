/* ═══════════════════════════════════════════════════════════════════
   CABANA TOURS · the full catalogue (/tours-catalogue)
   ───────────────────────────────────────────────────────────────────
   Every live tour, with the filters people actually use: what kind,
   when it leaves (a real departure on a real day, or a day you pick),
   how long, how much, who runs it, where it goes (the places kept in
   the console) and how many of you there are. Every filter lives in
   the address, so a filtered list can be shared or bookmarked and
   opens the same. A place or a kind with nothing listed yet offers
   "tell me when" (tour_alert_set).
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  var doc = global.document;
  function K() { return global.CabanaTours; }
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function el(id) { return doc.getElementById(id); }
  var PAGE = 24;

  var F = { q: '', cat: [], when: 'any', date: '', len: [], price: 'any', op: '', saved: false, vr: false, group: false, sort: 'recommended', shown: PAGE, place: null, pid: '', people: 0 };
  var WHEN = [['any', 'Any time'], ['weekend', 'This weekend'], ['7', 'Next 7 days'], ['30', 'Next 30 days'], ['date', 'Pick a day']];
  var LEN = [['0', 'A few hours'], ['1', 'A full day'], ['2', '2 to 3 days'], ['3', '4 days or more']];
  var PRICE = [['any', 'Any'], ['free', 'Free'], ['u5', 'Under 5K'], ['5-15', '5K–15K'], ['15+', '15K +']];
  var SORT = [['recommended', 'Recommended'], ['soonest', 'Leaving soonest'], ['price-asc', 'Price: low to high'], ['price-desc', 'Price: high to low'], ['short', 'Shortest first'], ['new', 'Newest']];

  /* ── the address is the state ───────────────────────────────────── */
  function readURL() {
    try {
      var p = new URLSearchParams(global.location.search);
      F.q = p.get('q') || p.get('dest') || p.get('destination') || '';
      F.cat = (p.get('cat') || '').split(',').filter(function (c) { return K().CATS[c]; });
      F.when = p.get('when') || (p.get('date') ? 'date' : 'any');
      F.date = p.get('date') || '';
      F.len = (p.get('len') || '').split(',').filter(function (x) { return /^[0-3]$/.test(x); });
      F.price = p.get('price') || 'any';
      F.op = p.get('op') || '';
      F.saved = p.get('saved') === '1';
      F.vr = p.get('vr') === '1';
      F.group = p.get('group') === '1';
      F.sort = p.get('sort') || 'recommended';
      F.pid = /^[a-z0-9][a-z0-9-]{1,47}$/.test(p.get('place') || '') ? p.get('place') : '';
      F.people = Math.max(0, Math.min(60, parseInt(p.get('people') || '0', 10) || 0));
    } catch (e) {}
  }
  function writeURL() {
    try {
      var u = new URL(global.location.href), p = u.searchParams;
      ['q', 'cat', 'when', 'date', 'len', 'price', 'op', 'saved', 'vr', 'group', 'sort', 'dest', 'destination', 'place', 'people'].forEach(function (k) { p.delete(k); });
      if (F.pid) p.set('place', F.pid);
      if (F.people) p.set('people', String(F.people));
      if (F.q) p.set('q', F.q);
      if (F.cat.length) p.set('cat', F.cat.join(','));
      if (F.when !== 'any') p.set('when', F.when);
      if (F.when === 'date' && F.date) p.set('date', F.date);
      if (F.len.length) p.set('len', F.len.join(','));
      if (F.price !== 'any') p.set('price', F.price);
      if (F.op) p.set('op', F.op);
      if (F.saved) p.set('saved', '1');
      if (F.vr) p.set('vr', '1');
      if (F.group) p.set('group', '1');
      if (F.sort !== 'recommended') p.set('sort', F.sort);
      global.history.replaceState(null, '', u.pathname + (p.toString() ? '?' + p.toString() : '') + u.hash);
    } catch (e) {}
  }

  /* ── does a tour run in this window ─────────────────────────────── */
  function inWindow(t) {
    var kit = K(), deps = kit.departures(t.id), now = Date.now();
    var open = deps.filter(function (d) { return !d.closes_at || new Date(d.closes_at).getTime() > now; });
    if (F.when === 'any') return true;
    if (F.when === 'date') {
      if (!F.date) return true;
      if (t.schedule_type === 'on_request' || t.schedule_type === 'daily') return true;
      return open.some(function (d) { return d.departs_on === F.date; });
    }
    if (F.when === 'weekend') {
      var t0 = new Date(kit.today() + 'T12:00:00Z'), dow = t0.getUTCDay();
      var toFri = dow === 6 ? -1 : dow === 0 ? -2 : (5 - dow + 7) % 7;
      var fri = new Date(t0.getTime() + toFri * 864e5).toISOString().slice(0, 10), sun = new Date(t0.getTime() + (toFri + 2) * 864e5).toISOString().slice(0, 10);
      if (t.schedule_type === 'daily') return true;
      return open.some(function (d) { return d.departs_on >= fri && d.departs_on <= sun; });
    }
    var lim = now + Number(F.when) * 864e5;
    if (t.schedule_type === 'daily') return true;
    return open.some(function (d) { return new Date(d.departs_at).getTime() <= lim; });
  }
  function priceOk(t) {
    var p = Number(t.price_kes) || 0;
    if (F.price === 'free') return p === 0;
    if (F.price === 'u5') return p < 5000;
    if (F.price === '5-15') return p >= 5000 && p <= 15000;
    if (F.price === '15+') return p > 15000;
    return true;
  }
  function textOk(t) {
    var q = F.q.trim().toLowerCase(); if (!q) return true;
    var kit = K();
    var hay = [t.title, t.summary, t.destination, t.county, t.country, t.operator_name, (kit.cat(t) || {}).name].concat(kit.arr(t.tags), kit.arr(t.languages)).join(' ').toLowerCase();
    return q.split(/\s+/).every(function (w) { return hay.indexOf(w) !== -1; });
  }
  function list() {
    var kit = K(), vrOn = global.CabanaImmersive && global.CabanaImmersive.forTour;
    var out = kit.get().filter(function (t) {
      if (F.cat.length && F.cat.indexOf(t.category) === -1) return false;
      if (F.len.length && F.len.indexOf(String(kit.reach(t))) === -1) return false;
      if (F.op && String(t.operator_id) !== String(F.op)) return false;
      if (F.saved && !kit.isSaved(t.id)) return false;
      if (F.group && t.price_basis !== 'per_group') return false;
      if (F.vr && !(vrOn && global.CabanaImmersive.forTour(t.id))) return false;
      if (F.pid && t.place_id !== F.pid) return false;
      // A group fits a tour that takes that many (tours with no limit fit anyone).
      if (F.people && Number(t.group_max) > 0 && Number(t.group_max) < F.people) return false;
      return priceOk(t) && inWindow(t) && (F.place ? true : textOk(t));
    });
    if (F.place && global.ApaGeo) {
      var near = global.ApaGeo.nearby(out, F.place, { radiusKm: global.ApaGeo.radiusFor(F.place, 80), latKey: 'latitude', lngKey: 'longitude', min: 1 });
      var unpinned = out.filter(function (t) { return !(isFinite(t.latitude) && isFinite(t.longitude)) && global.ApaGeo.match(t, F.place, { fields: ['destination', 'county'] }); });
      out = near.items.concat(unpinned);
    }
    var soon = function (t) { var d = kit.next(t.id); return d ? new Date(d.departs_at).getTime() : Infinity; };
    var s = F.sort;
    out.sort(function (a, b) {
      if (s === 'price-asc') return (a.price_kes || 0) - (b.price_kes || 0);
      if (s === 'price-desc') return (b.price_kes || 0) - (a.price_kes || 0);
      if (s === 'short') return kit.reach(a) - kit.reach(b) || (a.days || 1) - (b.days || 1);
      if (s === 'soonest') return soon(a) - soon(b);
      if (s === 'new') return new Date(b.published_at || 0) - new Date(a.published_at || 0);
      return (b.featured === true) - (a.featured === true) || (b.sort_weight || 0) - (a.sort_weight || 0) || soon(a) - soon(b);
    });
    return out;
  }

  /* ── painting ────────────────────────────────────────────────────── */
  function opt(group, k, label, on, n, color) {
    return '<button class="ct-opt" type="button" data-g="' + group + '" data-k="' + k + '" aria-pressed="' + on + '">' +
      (color ? '<span class="dot" style="--c:' + color + '"></span>' : '') + K().esc(label) + (n != null ? '<span class="n">' + n + '</span>' : '') + '</button>';
  }
  function paintFilters() {
    var box = el('ct-fbody'), kit = K(); if (!box) return;
    var all = kit.get(), n = {};
    all.forEach(function (t) { n[t.category] = (n[t.category] || 0) + 1; });
    var ops = {};
    all.forEach(function (t) { if (t.operator_id != null) ops[t.operator_id] = t.operator_name; });
    var hasVR = global.CabanaImmersive && global.CabanaImmersive.forTour && all.some(function (t) { return global.CabanaImmersive.forTour(t.id); });
    var pc = {};
    all.forEach(function (t) { if (t.place_id) pc[t.place_id] = (pc[t.place_id] || 0) + 1; });
    var places = kit.places().filter(function (p) { return pc[p.id] || p.id === F.pid; });
    box.innerHTML =
      (places.length ? '<div class="ct-fg"><h4>Where to</h4><div class="ct-fopts">' + places.map(function (p) { return opt('place', p.id, p.name, F.pid === p.id, pc[p.id] || 0); }).join('') + '</div></div>' : '') +
      '<div class="ct-fg"><h4>Kind of tour</h4><div class="ct-fopts">' + Object.keys(kit.CATS).map(function (k) { var c = kit.CATS[k]; return opt('cat', k, c.name, F.cat.indexOf(k) !== -1, n[k] || 0, c.a); }).join('') + '</div></div>' +
      '<div class="ct-fg"><h4>When</h4><div class="ct-fopts">' + WHEN.map(function (w) { return opt('when', w[0], w[1], F.when === w[0]); }).join('') + '</div>' +
        (F.when === 'date' ? '<div class="ct-fdate"><input class="ct-input" type="date" id="ct-fdate" min="' + kit.today() + '" value="' + kit.esc(F.date) + '" aria-label="Day of the tour"/></div>' : '') + '</div>' +
      '<div class="ct-fg"><h4>How long</h4><div class="ct-fopts">' + LEN.map(function (l) { return opt('len', l[0], l[1], F.len.indexOf(l[0]) !== -1); }).join('') + '</div></div>' +
      '<div class="ct-fg"><h4>How many of you</h4><div class="ct-fopts">' + [[0, 'Any size'], [2, '2+'], [4, '4+'], [6, '6+'], [10, '10+']].map(function (x) { return opt('people', String(x[0]), x[1], F.people === x[0]); }).join('') + '</div></div>' +
      '<div class="ct-fg"><h4>Price per person</h4><div class="ct-fopts">' + PRICE.map(function (p) { return opt('price', p[0], p[1], F.price === p[0]); }).join('') + '</div></div>' +
      (Object.keys(ops).length > 1 ? '<div class="ct-fg"><h4>Guide or operator</h4><div class="ct-fopts">' + Object.keys(ops).map(function (id) { return opt('op', id, ops[id] || 'Operator', String(F.op) === String(id)); }).join('') + '</div></div>' : '') +
      '<div class="ct-fg">' +
        '<label class="ct-switch"><span>Only my saved tours</span><input type="checkbox" data-sw="saved"' + (F.saved ? ' checked' : '') + '/></label>' +
        '<label class="ct-switch"><span>Private group price</span><input type="checkbox" data-sw="group"' + (F.group ? ' checked' : '') + '/></label>' +
        (hasVR ? '<label class="ct-switch"><span>Preview in 360° VR</span><input type="checkbox" data-sw="vr"' + (F.vr ? ' checked' : '') + '/></label>' : '') +
      '</div>';
    var d = el('ct-fdate'); if (d) d.addEventListener('change', function () { F.date = d.value; F.shown = PAGE; update(); });
  }
  function activeChips() {
    var kit = K(), chips = [];
    if (F.q) chips.push(['q', '“' + F.q + '”']);
    if (F.pid) { var pl = kit.place(F.pid); chips.push(['pid', pl ? pl.name : 'One place']); }
    if (F.people) chips.push(['people', F.people + (F.people === 1 ? ' person' : ' people')]);
    F.cat.forEach(function (c) { chips.push(['cat:' + c, kit.CATS[c].name]); });
    if (F.when !== 'any') chips.push(['when', F.when === 'date' ? (F.date ? kit.fmtDay(F.date) : 'Pick a day') : WHEN.filter(function (w) { return w[0] === F.when; })[0][1]]);
    F.len.forEach(function (l) { chips.push(['len:' + l, LEN[+l][1]]); });
    if (F.price !== 'any') chips.push(['price', PRICE.filter(function (p) { return p[0] === F.price; })[0][1]]);
    if (F.op) { var t = kit.get().filter(function (x) { return String(x.operator_id) === String(F.op); })[0]; chips.push(['op', t ? t.operator_name : 'One operator']); }
    if (F.saved) chips.push(['saved', 'Saved']);
    if (F.group) chips.push(['group', 'Private groups']);
    if (F.vr) chips.push(['vr', '360° preview']);
    var x = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
    return chips.length ? chips.map(function (c) { return '<button type="button" data-rm="' + kit.esc(c[0]) + '" aria-label="Remove filter ' + kit.esc(c[1]) + '">' + kit.esc(c[1]) + x + '</button>'; }).join('') + '<button type="button" class="clear" data-rm="all">Clear all</button>' : '';
  }
  function paint() {
    var kit = K(), g = el('ct-grid'), n = el('ct-res-n'), act = el('ct-active');
    if (!g) return;
    if (!kit.loaded()) { g.innerHTML = kit.skeletons(8); return; }
    var res = list();
    if (n) n.innerHTML = '<b>' + res.length + '</b>' + (res.length === 1 ? 'tour' : 'tours') + (kit.get().length !== res.length ? ' of ' + kit.get().length : '');
    if (act) act.innerHTML = activeChips();
    var fb = el('ct-fbtn-n'); if (fb) { var c = (act ? act.querySelectorAll('[data-rm]:not([data-rm="all"])').length : 0); fb.textContent = c ? '(' + c + ')' : ''; }
    var go = el('ct-fgo'); if (go) go.textContent = 'Show ' + res.length + (res.length === 1 ? ' tour' : ' tours');
    paintContext(res);
    if (!res.length) {
      var none = !kit.get().length;
      g.innerHTML = '<div class="ct-blank"><div class="ct-blank-mark">' + kit.icon.compass + '</div>' +
        (none ? '<h3>The first tours are on their way</h3><p>Every guide and operator is vetted by our team before their tours go live. New tours appear here as soon as they are approved.</p><div class="ct-blank-acts"><a class="ct-btn ct-btn-sun" href="/list-your-tour">List your tours</a></div>'
              : '<h3>No tours match all of these</h3><p>Try removing a filter. Or message a guide: most will run a private day for your group.</p><div class="ct-blank-acts"><button class="ct-btn ct-btn-ink" type="button" data-rm="all">Clear all filters</button><a class="ct-btn" href="/tour-guides">Message a guide</a></div>') + '</div>';
      return;
    }
    g.innerHTML = res.slice(0, F.shown).map(function (t) { return kit.card(t); }).join('');
    var more = el('ct-more');
    if (more) more.innerHTML = res.length > F.shown ? '<button class="ct-btn ct-btn-ink" type="button" data-more>Show ' + Math.min(PAGE, res.length - F.shown) + ' more</button>' : '';
    kit.reveal(g); kit.paintHearts();
  }
  /* Above the results: the place you picked, and a way to hear first
     about a place or a kind of trip that has little or nothing yet. */
  function paintContext(res) {
    var kit = K(), box = el('tw-context');
    if (!box) { var act = el('ct-active'); if (!act) return; box = doc.createElement('div'); box.id = 'tw-context'; act.parentNode.insertBefore(box, act.nextSibling); }
    var pl = F.pid ? kit.place(F.pid) : null, cat = F.cat.length === 1 ? F.cat[0] : null, html = '';
    if (pl) html += '<div class="tw-place-head">' + (pl.image ? '<img src="' + kit.esc(String(pl.image).replace(/-1400\.webp$/, '-720.webp')) + '" alt=""/>' : '<span></span>') +
      '<div><b>' + kit.esc(pl.name) + '</b><span>' + kit.esc([pl.country, pl.line].filter(Boolean).join(' · ')) + '</span></div></div>';
    var target = pl ? 'place:' + pl.id : cat ? 'cat:' + cat : null;
    if (target && res.length < 4) {
      var name = pl ? pl.name : kit.CATS[cat].name.toLowerCase(), on = kit.isFollowing(pl ? pl.id : null, pl ? null : cat);
      html += '<div class="tw-followbar"><p>' + (res.length ? 'Only ' + res.length + (res.length === 1 ? ' tour' : ' tours') + ' so far. ' : 'Nothing listed yet. ') +
        '<b>Hear first</b> when a guide lists ' + (pl ? 'a tour in ' : 'new ') + kit.esc(name) + '.</p>' +
        '<button class="tw-follow" type="button" data-ct-follow="' + target + '" aria-pressed="' + on + '" data-off="Tell me when" data-on="Following">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>' +
        '<span data-follow-l>' + (on ? 'Following' : 'Tell me when') + '</span></button></div>';
    }
    box.innerHTML = html;
  }
  function update() { writeURL(); paintFilters(); paint(); }

  function wire() {
    var fil = el('ct-filters');
    doc.addEventListener('click', function (e) {
      var o = e.target.closest('.ct-opt[data-g]');
      if (o) {
        var g = o.getAttribute('data-g'), k = o.getAttribute('data-k');
        if (g === 'cat' || g === 'len') { var arr = F[g], i = arr.indexOf(k); if (i === -1) arr.push(k); else arr.splice(i, 1); }
        else if (g === 'when') { F.when = F.when === k && k !== 'any' ? 'any' : k; if (F.when !== 'date') F.date = ''; }
        else if (g === 'price') F.price = F.price === k ? 'any' : k;
        else if (g === 'op') F.op = String(F.op) === String(k) ? '' : k;
        else if (g === 'place') F.pid = F.pid === k ? '' : k;
        else if (g === 'people') F.people = Number(k) || 0;
        F.shown = PAGE; update(); return;
      }
      var rm = e.target.closest('[data-rm]');
      if (rm) {
        var r = rm.getAttribute('data-rm');
        if (r === 'all') { F.q = ''; F.cat = []; F.when = 'any'; F.date = ''; F.len = []; F.price = 'any'; F.op = ''; F.saved = false; F.vr = false; F.group = false; F.place = null; F.pid = ''; F.people = 0; var q = el('ct-q'); if (q) q.value = ''; }
        else if (r === 'pid') F.pid = '';
        else if (r === 'people') F.people = 0;
        else if (r === 'q') { F.q = ''; F.place = null; var qq = el('ct-q'); if (qq) qq.value = ''; }
        else if (r.indexOf('cat:') === 0) F.cat = F.cat.filter(function (c) { return c !== r.slice(4); });
        else if (r.indexOf('len:') === 0) F.len = F.len.filter(function (c) { return c !== r.slice(4); });
        else if (r === 'when') { F.when = 'any'; F.date = ''; }
        else if (r === 'price') F.price = 'any';
        else F[r] = typeof F[r] === 'boolean' ? false : '';
        F.shown = PAGE; update(); return;
      }
      if (e.target.closest('[data-more]')) { F.shown += PAGE; paint(); return; }
      if (e.target.closest('[data-fopen]')) { if (fil) { fil.classList.add('open'); var v = el('ct-veil'); if (v) v.classList.add('open'); } return; }
      if (e.target.closest('[data-fclose]') || (e.target.id === 'ct-veil' && fil && fil.classList.contains('open'))) { if (fil) fil.classList.remove('open'); var v2 = el('ct-veil'); if (v2 && !(el('ct-sheet') && el('ct-sheet').classList.contains('open'))) v2.classList.remove('open'); return; }
    });
    doc.addEventListener('change', function (e) {
      var sw = e.target.closest && e.target.closest('[data-sw]');
      if (sw) { F[sw.getAttribute('data-sw')] = sw.checked; F.shown = PAGE; update(); }
      if (e.target.id === 'ct-sort') { F.sort = e.target.value; update(); }
    });
    var q = el('ct-q'), deb;
    if (q) {
      q.value = F.q;
      q.addEventListener('input', function () { clearTimeout(deb); F.place = null; deb = setTimeout(function () { F.q = q.value.trim(); F.shown = PAGE; writeURL(); paint(); }, 160); });
      var form = q.closest('form'); if (form) form.addEventListener('submit', function (e) { e.preventDefault(); F.q = q.value.trim(); update(); var r = el('ct-results'); if (r) r.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      var geo = function () {
        if (!global.ApaGeo || q.__geo) return; q.__geo = true;
        try { global.ApaGeo.attach('ct-q', { limit: 6, onPick: function (p) { F.place = p; F.q = q.value.trim(); F.shown = PAGE; writeURL(); paint(); } }); } catch (e) {}
      };
      geo(); global.addEventListener('load', geo);
    }
    var sort = el('ct-sort'); if (sort) { sort.innerHTML = SORT.map(function (s) { return '<option value="' + s[0] + '"' + (F.sort === s[0] ? ' selected' : '') + '>' + s[1] + '</option>'; }).join(''); }
  }
  function stats() {
    var kit = K(), box = el('ct-hero-stats'); if (!box || !kit.loaded()) return;
    var all = kit.get(), ops = {}, places = {};
    all.forEach(function (t) { if (t.operator_id != null) ops[t.operator_id] = 1; var p = t.destination || t.county; if (p) places[p] = 1; });
    var soon = kit.upcoming(30).length;
    // Only numbers worth saying: none of these shows as a zero.
    var parts = [[all.length, all.length === 1 ? 'tour' : 'tours'], [Object.keys(ops).length, Object.keys(ops).length === 1 ? 'guide or operator' : 'guides and operators'],
                 [Object.keys(places).length, Object.keys(places).length === 1 ? 'place' : 'places'], [soon, 'leaving in the next 30 days']].filter(function (p) { return p[0] > 0; });
    box.innerHTML = all.length ? parts.map(function (p) { return '<span><b>' + p[0] + '</b>' + p[1] + '</span>'; }).join('') : '';
    box.hidden = !all.length;
  }

  function start() {
    var kit = K(); if (!kit) return;
    readURL(); wire(); paintFilters(); paint();
    kit.on('data', function () { paintFilters(); paint(); stats(); });
    kit.on('places', function () { paintFilters(); paint(); });
    kit.on('follows', function () { kit.paintFollows(); });
    kit.on('saves', function () { if (F.saved) paint(); });
    var bg = $('.ct-art-bg'); if (bg) bg.innerHTML = kit.art('catalogue', 'savanna', { w: 800, h: 800 });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})(window);
