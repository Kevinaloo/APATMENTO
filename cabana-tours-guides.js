/* ═══════════════════════════════════════════════════════════════════
   CABANA TOURS · the guides (/tour-guides)
   ───────────────────────────────────────────────────────────────────
   Every approved guide and operator, from tour_guides_directory(): what
   they run, where, in which languages, from what price, and a way to
   ask them something. Contact details are never here. A traveller
   messages on Cabana, and numbers unlock only once a booking is paid.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  var doc = global.document;
  function K() { return global.CabanaTours; }
  function el(id) { return doc.getElementById(id); }
  var S = { list: null, q: '', who: 'all', where: '' };

  function load() {
    var kit = K(), c = kit && kit.sb();
    if (!c) { S.list = []; paint(); return; }
    c.rpc('tour_guides_directory').then(function (r) {
      // A guide appears once they have a live tour to book.
      S.list = (r && Array.isArray(r.data) ? r.data : []).filter(function (g) { return Number(g.tours) > 0; }); paint();
    }, function () { S.list = []; paint(); });
  }
  function toursOf(g) { return K().get().filter(function (t) { return String(t.operator_id) === String(g.id); }); }
  function card(g) {
    var kit = K(), esc = kit.esc, I = kit.icon, tours = toursOf(g);
    var av = g.logo ? '<img src="' + esc(g.logo) + '" alt="" loading="lazy"/>' : '<span>' + esc(String(g.name || '?').charAt(0).toUpperCase()) + '</span>';
    var cover = g.cover ? '<img src="' + esc(g.cover) + '" alt="" loading="lazy"/>' : '<div class="ct-art" style="position:absolute;inset:0">' + kit.art('g' + g.id, g.persona === 'guide' ? 'savanna' : 'lake', { w: 480, h: 180 }) + '</div>';
    var langs = (g.languages || []).slice(0, 5);
    return '<article class="ct-guide ct-rv" id="g-' + esc(g.slug || g.id) + '" data-g="' + esc(g.id) + '">' +
      '<div class="ct-guide-cover">' + cover + '</div><div class="ct-guide-av">' + av + '</div>' +
      '<div class="ct-guide-b">' +
        '<span class="ct-guide-role">' + (g.persona === 'guide' ? 'Guide' : 'Tour operator') + (g.county ? ' · ' + esc(g.county) : '') + '</span>' +
        '<h2 class="ct-guide-n">' + esc(g.name) + (g.verified ? '<span style="color:#0C8F86;display:inline-flex" title="Vetted by Cabana">' + I.verified + '</span>' : '') + '</h2>' +
        (g.tagline || g.bio ? '<p class="ct-guide-line" style="-webkit-line-clamp:3">' + esc(g.tagline || g.bio) + '</p>' : '') +
        (langs.length ? '<div class="ct-guide-langs">' + langs.map(function (l) { return '<span>' + esc(l) + '</span>'; }).join('') + '</div>' : '') +
        '<div class="ct-guide-stats"><span><b>' + (g.tours || 0) + '</b>' + (g.tours === 1 ? 'tour' : 'tours') + '</span>' +
          (g.from_kes ? '<span><b>' + kit.money(g.from_kes).replace('KES ', '') + '</b>from KES</span>' : g.free ? '<span><b>Free</b>walks</span>' : '') +
          ((g.places || []).length ? '<span><b>' + g.places.length + '</b>' + (g.places.length === 1 ? 'place' : 'places') + '</span>' : '') +
          (g.since ? '<span><b>' + esc(g.since) + '</b>joined</span>' : '') + '</div>' +
        (tours.length ? '<div class="ct-guide-tours">' + tours.slice(0, 3).map(function (t) {
          var d = kit.next(t.id), p = kit.price(t);
          return '<button class="ct-guide-tour" type="button" data-ct-open="' + esc(t.id) + '"><span class="m">' + kit.cover(t, '') + '</span><span class="t"><b>' + esc(t.title) + '</b><small>' + esc([p.v, d ? 'Next ' + kit.fmtDay(d.departs_on) : (t.schedule_type === 'on_request' ? 'On request' : '')].filter(Boolean).join(' · ')) + '</small></span></button>';
        }).join('') + '</div>' : '') +
        '<div class="ct-guide-acts">' +
          '<a class="ct-btn ct-btn-s" href="/tours-catalogue?op=' + encodeURIComponent(g.id) + '">' + (tours.length ? 'All their tours' : 'Their tours') + '</a>' +
          (tours.length ? '<button class="ct-btn ct-btn-s ct-btn-ink" type="button" data-ct-msg="' + esc(tours[0].id) + '">' + I.chat + 'Message</button>' : '') +
        '</div>' +
      '</div></article>';
  }
  function paint() {
    var box = el('ct-gd'), kit = K(), cnt = el('ct-gd-n'); if (!box || !kit) return;
    if (S.list == null) { box.innerHTML = '<div class="ct-skel" style="height:420px"></div><div class="ct-skel" style="height:420px"></div><div class="ct-skel" style="height:420px"></div>'; return; }
    var counties = {};
    S.list.forEach(function (g) { if (g.county) counties[g.county] = (counties[g.county] || 0) + 1; });
    var wf = el('ct-gd-where');
    if (wf) wf.innerHTML = '<button class="ct-opt" type="button" data-where="" aria-pressed="' + (!S.where) + '">Everywhere</button>' +
      Object.keys(counties).sort().map(function (c) { return '<button class="ct-opt" type="button" data-where="' + kit.esc(c) + '" aria-pressed="' + (S.where === c) + '">' + kit.esc(c) + '<span class="n">' + counties[c] + '</span></button>'; }).join('');
    var q = S.q.toLowerCase();
    var res = S.list.filter(function (g) {
      if (S.who !== 'all' && g.persona !== S.who) return false;
      if (S.where && g.county !== S.where) return false;
      if (!q) return true;
      return [g.name, g.tagline, g.bio, g.county].concat(g.languages || [], g.places || []).join(' ').toLowerCase().indexOf(q) !== -1;
    });
    if (cnt) cnt.innerHTML = '<b>' + res.length + '</b>' + (res.length === 1 ? 'guide or operator' : 'guides and operators');
    box.innerHTML = res.length ? res.map(card).join('')
      : '<div class="ct-blank"><div class="ct-blank-mark">' + kit.icon.users + '</div><h3>' + (S.list.length ? 'No guides match that search' : 'The first guides are on their way') + '</h3><p>' +
        (S.list.length ? 'Try another name, place or language.' : 'Every guide and operator is vetted by our team before they appear here.') + '</p><div class="ct-blank-acts"><a class="ct-btn ct-btn-sun" href="/list-your-tour">List your tours</a></div></div>';
    kit.reveal(box);
    lightFromHash();
  }
  function lightFromHash() {
    var h = global.location.hash; if (!h || h.indexOf('#g-') !== 0) return;
    var n = doc.getElementById(decodeURIComponent(h.slice(1))); if (!n) return;
    n.classList.add('in', 'is-lit');
    setTimeout(function () { var top = el('ct-top'); global.scrollTo({ top: n.getBoundingClientRect().top + global.scrollY - (top ? top.offsetHeight : 0) - 20, behavior: 'smooth' }); }, 120);
    setTimeout(function () { n.classList.remove('is-lit'); }, 3200);
  }
  function start() {
    var kit = K(); if (!kit) return;
    var q = el('ct-gd-q'), deb;
    if (q) q.addEventListener('input', function () { clearTimeout(deb); deb = setTimeout(function () { S.q = q.value.trim(); paint(); }, 140); });
    doc.addEventListener('click', function (e) {
      var w = e.target.closest('[data-who]'); if (w) { S.who = w.getAttribute('data-who'); Array.prototype.forEach.call(doc.querySelectorAll('[data-who]'), function (b) { b.setAttribute('aria-pressed', String(b === w)); }); paint(); return; }
      var wh = e.target.closest('[data-where]'); if (wh) { S.where = wh.getAttribute('data-where'); paint(); }
    });
    global.addEventListener('hashchange', lightFromHash);
    paint(); load();
    kit.on('data', paint);
    var bg = doc.querySelector('.ct-art-bg'); if (bg) bg.innerHTML = kit.art('guides-page', 'lake', { w: 800, h: 800 });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})(window);
