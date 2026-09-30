/* ═══════════════════════════════════════════════════════════════════
   CABANA TOURS · the Spotlight
   ───────────────────────────────────────────────────────────────────
   The first thing on /tours: a full-bleed slideshow of film and photos
   with words laid over them, and a horizon along the bottom where a
   sun travels across each slide as it plays. When the slide changes,
   the next one opens from wherever the sun is.

   What fills it, in order:
     1. Sponsored slides guides and operators bought (tour_spotlight_feed,
        marked Sponsored, always first)
     2. Tours the Cabana team chose to feature
     3. Up to two real departures leaving soonest, when the reel is
        short (only tours with a photo; switchable in the console)
     4. Cabana's own slides, made in the console with real photos or film
   With nothing to show, it is not a slideshow at all: it is the cover
   the team wrote in the console (Tours → Page → Cover), with search.
   Nothing here draws a pretend place.

   Nothing plays that is not on screen. Save-Data and reduced motion get
   stills, and reduced motion also waits for a tap instead of rotating.
   The studio and the console reuse this file to preview a slide before
   it runs: CabanaSpotlight.create(root, { preview: true }).
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  var doc = global.document;
  function K() { return global.CabanaTours; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function I(p, sw) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }
  var IC = {
    prev: I('<path d="M15 18l-6-6 6-6"/>', 2.2), next: I('<path d="M9 18l6-6-6-6"/>', 2.2),
    pause: I('<path d="M8 5v14M16 5v14"/>', 2.6), play: I('<path d="M7 4v16l13-8z"/>'),
    sound: I('<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>'),
    mute: I('<path d="M11 5 6 9H2v6h4l5 4z"/><path d="m23 9-6 6M17 9l6 6"/>'),
    chat: I('<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.7-.8L3 21l1.9-5.1A8.4 8.4 0 0 1 4 11.5 8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5z"/>'),
    vr: I('<path d="M3 9.2A2.7 2.7 0 0 1 5.7 6.5h12.6A2.7 2.7 0 0 1 21 9.2v5.1a2.7 2.7 0 0 1-2.7 2.7h-3.1a2 2 0 0 1-1.7-.9l-.8-1.2a.9.9 0 0 0-1.5 0l-.8 1.2a2 2 0 0 1-1.7.9H5.7A2.7 2.7 0 0 1 3 14.3z"/><circle cx="8" cy="11.8" r="1.6"/><circle cx="16" cy="11.8" r="1.6"/>', 1.9),
    pin: I('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'),
    clock: I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    verified: I('<path d="M12 2 4 6v6c0 5 3.4 9.4 8 10 4.6-.6 8-5 8-10V6l-8-4Z"/><path d="m9 12 2 2 4-4"/>'),
    arrow: I('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    heart: I('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.8 1-1.1a5.5 5.5 0 0 0 0-7.7Z"/>')
  };

  /* ── headline: *these words* are set in the serif ────────────────── */
  function headlineHTML(h) {
    var out = [], wi = 0, parts = String(h || '').split('*');
    parts.forEach(function (seg, i) {
      var words = seg.split(/\s+/).filter(Boolean);
      if (!words.length) return;
      if (i % 2 === 1) out.push('<em class="w" style="--wi:' + (wi++) + '">' + esc(words.join(' ')) + '</em>');
      else words.forEach(function (w) { out.push('<span class="w" style="--wi:' + (wi++) + '">' + esc(w) + '</span>'); });
    });
    return out.join(' ');
  }
  function plain(h) { return String(h || '').replace(/\*/g, ''); }

  /* ── one slide ───────────────────────────────────────────────────── */
  function ytId(u) { var m = String(u || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/); return m ? m[1] : (/^[A-Za-z0-9_-]{11}$/.test(String(u || '')) ? String(u) : ''); }
  function plate(seed, w, h) { return '<div class="ct-art">' + (K() ? K().art(String(seed), 'city', { w: w, h: h }) : '') + '</div>'; }
  function mediaHTML(s, mode) {
    var k = s.media_kind, focal = esc(s.focal || '50% 50%');
    // Only a preview with nothing chosen yet gets here without media.
    if (k === 'art') return plate(s.id, 1600, 900);
    if (k === 'youtube') {
      var id = ytId(s.media_url);
      var poster = s.poster_url || (id ? 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg' : '');
      return '<div class="ct-yt" data-yt="' + esc(id) + '"><div class="ct-yt-poster" style="background-image:url(\'' + esc(poster).replace(/'/g, '%27') + '\')"></div></div>';
    }
    if (k === 'video' && !mode.noVideo) {
      return '<video muted loop playsinline preload="none" data-src="' + esc(s.media_url) + '"' + (s.poster_url ? ' poster="' + esc(s.poster_url) + '"' : '') + ' style="object-position:' + focal + ';--focal:' + focal + '" aria-hidden="true" tabindex="-1"></video>';
    }
    var src = k === 'video' ? (s.poster_url || (s.tour && s.tour.cover) || '') : s.media_url;
    if (!src && s.tour && s.tour.cover) src = s.tour.cover;
    if (!src) return plate(s.id, 1600, 900);
    return (s.media_mobile_url ? '<picture><source media="(max-width: 700px)" srcset="' + esc(s.media_mobile_url) + '"/>' : '') +
      '<img src="' + esc(src) + '" alt="" decoding="async" style="object-position:' + focal + ';--focal:' + focal + '"' + (s._first ? ' fetchpriority="high"' : ' loading="lazy"') + '/>' +
      (s.media_mobile_url ? '</picture>' : '');
  }
  function slideHTML(s, i, n, mode) {
    var t = s.tour || null, op = s.operator || null, kit = K();
    var acc = /^#[0-9A-Fa-f]{6}$/.test(s.accent || '') ? s.accent : (t && kit ? kit.accent({ id: t.id }) : '#12E0D0');
    var kick = '';
    if (s.kind === 'sponsored') kick += '<span class="ct-tag ct-tag-sun" title="A guide or operator paid to show this here">Sponsored</span>';
    else if (s._auto) kick += '<span class="ct-tag ct-tag-live">Departing soon</span>';
    else if (s.kind === 'tour') kick += '<span class="ct-tag ct-tag-sweep">Featured</span>';
    if (s.kicker) kick += '<span class="k">' + esc(s.kicker) + '</span>';
    var meta = [];
    if (op && op.name) meta.push('<span class="op">' + (op.logo ? '<img src="' + esc(op.logo) + '" alt="" loading="lazy"/>' : '<span class="av">' + esc(op.name.charAt(0).toUpperCase()) + '</span>') + esc(op.name) + (op.verified ? '<span style="color:var(--ct-turq);display:inline-flex">' + IC.verified.replace('<svg', '<svg width="15" height="15"') + '</span>' : '') + '</span>');
    if (t && t.destination) meta.push('<span>' + IC.pin + esc(t.destination) + '</span>');
    if (t && t.duration) meta.push('<span>' + IC.clock + esc(t.duration) + '</span>');
    if (t && t.price != null) meta.push('<span class="price">' + (Number(t.price) === 0 ? '<b>Free</b>' : 'From <b>' + esc((kit ? kit.money(t.price) : 'KES ' + t.price)) + '</b>' + (t.price_basis === 'per_group' ? ' a group' : ' pp')) + '</span>');
    var clock = t && t.next_departure && new Date(t.next_departure).getTime() > Date.now()
      ? '<div class="ct-clock"><span class="ct-clock-l">Leaves in</span><span data-cd="' + esc(t.next_departure) + '" data-cd-done="Departing now"></span></div>' : '';
    var acts = '';
    if (t) {
      acts = '<button class="ct-btn ct-btn-sun" type="button" data-sl-act="book" data-tour="' + esc(t.id) + '">' + esc(s.cta_label || (Number(t.price) === 0 ? 'Reserve a place' : 'Book this tour')) + IC.arrow + '</button>' +
        '<button class="ct-btn ct-btn-glass" type="button" data-sl-act="msg" data-tour="' + esc(t.id) + '">' + IC.chat + '<span>Message <span class="lbl-long">the guide</span></span></button>' +
        (kit && !mode.preview ? kit.heart(t.id) : '');
    } else if (s.kind === 'sponsored' && op) {
      acts = '<a class="ct-btn ct-btn-sun" href="/tours-catalogue?op=' + encodeURIComponent(op.id) + '" data-sl-act="link">' + esc(s.cta_label || 'See their tours') + IC.arrow + '</a>';
    } else if (s.cta_url) {
      acts = '<a class="ct-btn ct-btn-sun" href="' + esc(safeHref(s.cta_url)) + '" data-sl-act="link">' + esc(s.cta_label || 'Find out more') + IC.arrow + '</a>';
    }
    return '<article class="ct-slide" data-i="' + i + '" data-id="' + esc(s.id) + '" data-kind="' + esc(s.kind) + '" data-media="' + esc(s.media_kind) + '" style="--acc:' + acc + '" role="group" aria-roledescription="slide" aria-label="' + (i + 1) + ' of ' + n + ': ' + esc(plain(s.headline)) + '"' + (i ? ' aria-hidden="true"' : '') + '>' +
      '<div class="ct-slide-media">' + mediaHTML(s, mode) + '</div><div class="ct-slide-wash"></div>' +
      '<div class="ct-slide-copy">' +
        (kick ? '<div class="ct-slide-kick">' + kick + '</div>' : '') +
        '<h2 class="ct-slide-h">' + headlineHTML(s.headline) + '</h2>' +
        (s.subline ? '<p class="ct-slide-sub">' + esc(s.subline) + '</p>' : '') +
        (meta.length ? '<div class="ct-slide-meta">' + meta.join('') + '</div>' : '') +
        clock +
        (acts ? '<div class="ct-slide-acts">' + acts + '</div>' : '') +
      '</div></article>';
  }
  /* Cabana's own slides may point anywhere on Cabana, never off it. */
  function safeHref(u) {
    var h = String(u || '').trim();
    if (/^(\/(?!\/)|#)/.test(h)) return h;
    var m = h.match(/^https:\/\/(www\.)?cabana\.africa(\/[^\s]*)?$/i);
    return m ? (m[2] || '/') : '/tours';
  }
  function thumbHTML(s) {
    if (s.media_kind === 'image' && s.media_url) return '<img src="' + esc(s.media_url) + '" alt="" loading="lazy"/>';
    if ((s.media_kind === 'video' || s.media_kind === 'youtube') && (s.poster_url || ytId(s.media_url))) return '<img src="' + esc(s.poster_url || ('https://i.ytimg.com/vi/' + ytId(s.media_url) + '/mqdefault.jpg')) + '" alt="" loading="lazy"/>';
    if (s.tour && s.tour.cover) return '<img src="' + esc(s.tour.cover) + '" alt="" loading="lazy"/>';
    return plate(s.id, 400, 300);
  }
  function short(s) {
    if (s.kind === 'sponsored') return (s.operator && s.operator.name) || plain(s.headline);
    if (s.kind === 'house') return s.kicker || plain(s.headline);
    return (s.tour && s.tour.destination) || plain(s.headline);
  }

  /* ═══ THE ENGINE ═══════════════════════════════════════════════════ */
  function create(root, opts) {
    opts = opts || {};
    var kit = K();
    var mode = kit ? kit.thrifty() : { still: false, noVideo: false };
    if (opts.preview) mode = { still: false, noVideo: false, preview: true };
    var offs = [];
    function listen(target, ev, fn, o) { target.addEventListener(ev, fn, o); offs.push(function () { target.removeEventListener(ev, fn, o); }); }
    var S = { slides: [], i: 0, t0: 0, elapsed: 0, paused: false, hover: false, visible: true, raf: 0, muted: true, gated: !opts.preview, seen: {}, dwell: 0, userPaused: false };
    var DUR = { image: 7600, art: 7200, video: 11000, youtube: 12000 };
    if (mode.still) root.classList.add('ct-still');

    root.innerHTML =
      '<div class="ct-sl-stage"></div><div class="ct-sl-grain" aria-hidden="true"></div>' +
      '<div class="ct-sl-ui"><div class="ct-sl-bar">' +
        '<button class="ct-sl-up" type="button" data-sl="upnext" aria-label="Next slide"></button>' +
        '<div class="ct-sl-ctrl">' +
          '<button class="ct-sl-b" type="button" data-sl="prev" aria-label="Previous slide">' + IC.prev + '</button>' +
          '<button class="ct-sl-b" type="button" data-sl="sound" aria-label="Turn sound on" hidden>' + IC.mute + '</button>' +
          '<button class="ct-sl-b" type="button" data-sl="pause" aria-label="Pause the slideshow">' + IC.pause + '</button>' +
          '<button class="ct-sl-b" type="button" data-sl="next" aria-label="Next slide">' + IC.next + '</button>' +
        '</div>' +
        '<div class="ct-sl-count" aria-hidden="true"><b data-sl-i>01</b><span>/</span><span data-sl-n>01</span></div>' +
      '</div></div>' +
      '<div class="ct-hz"><div class="ct-hz-in"><span class="ct-hz-glow"></span><div class="ct-hz-line" role="tablist" aria-label="Choose a slide"></div><span class="ct-hz-sun" aria-hidden="true"></span></div></div>' +
      '<div class="ct-sr" aria-live="polite" data-sl-live></div>';
    var stage = $('.ct-sl-stage', root), line = $('.ct-hz-line', root), sun = $('.ct-hz-sun', root), glow = $('.ct-hz-glow', root);
    /* Asked for less motion: the slides wait to be moved rather than
       rotating on their own. Play is one tap away. */
    if (!opts.preview && kit && kit.reduced && kit.reduced()) {
      S.userPaused = true; root.classList.add('is-paused');
      var pb0 = $('[data-sl="pause"]', root);
      if (pb0) { pb0.innerHTML = IC.play; pb0.setAttribute('aria-label', 'Play the slideshow'); }
    }

    function set(slides) {
      var keep = S.slides[S.i] && S.slides[S.i].id;
      S.slides = (slides || []).slice(0, 12);
      var n = S.slides.length;
      S.slides.forEach(function (s, i) { s._first = i === 0; });
      stage.innerHTML = S.slides.map(function (s, i) { return slideHTML(s, i, n, mode); }).join('');
      line.innerHTML = S.slides.map(function (s, i) {
        return '<button class="ct-hz-seg" type="button" role="tab" data-go="' + i + '" aria-label="Slide ' + (i + 1) + ': ' + esc(plain(s.headline)) + '"><span class="ct-hz-fill"></span><span class="t">' + esc(short(s)) + '</span></button>';
      }).join('');
      $('[data-sl-n]', root).textContent = String(n).padStart(2, '0');
      var ctrl = $('.ct-sl-ctrl', root);
      if (ctrl) ctrl.style.display = n > 1 || opts.preview ? '' : 'none';
      root.classList.toggle('ct-sl-single', n < 2);
      var at = 0;
      if (keep) S.slides.forEach(function (s, i) { if (s.id === keep) at = i; });
      S.i = -1;
      show(at, { instant: true });
      if (kit) { kit.countdowns(stage); kit.paintHearts(); }
    }

    function slideEl(i) { return stage.children[i] || null; }
    function sunXY(i, p) {
      var segs = line.children; if (!segs[i]) return { x: 0, y: 0 };
      var lr = line.getBoundingClientRect(), sr = segs[i].getBoundingClientRect(), rr = root.getBoundingClientRect();
      var x = sr.left - lr.left + sr.width * p;
      var arc = Math.min(46, rr.height * 0.06);
      var y = -Math.sin(Math.PI * p) * arc;
      return { x: x, y: y, px: sr.left - rr.left + sr.width * p, py: lr.top - rr.top + 12 + y };
    }
    function paintSun(p) {
      var xy = sunXY(S.i, p);
      var lineLeft = line.offsetLeft;
      sun.style.transform = 'translate3d(' + (xy.x + lineLeft).toFixed(1) + 'px,' + xy.y.toFixed(1) + 'px,0)';
      glow.style.transform = 'translate3d(' + (xy.x + lineLeft).toFixed(1) + 'px,0,0)';
      var f = line.children[S.i] && line.children[S.i].querySelector('.ct-hz-fill');
      if (f) f.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      return xy;
    }
    function durOf(s) { return opts.preview ? 6000 : (DUR[s.media_kind] || 7600); }

    function show(i, o) {
      o = o || {};
      var n = S.slides.length; if (!n) return;
      i = ((i % n) + n) % n;
      if (i === S.i && !o.force) return;
      var prev = S.i, from = slideEl(prev), to = slideEl(i);
      var origin = prev >= 0 ? sunXY(prev, Math.min(1, S.elapsed / durOf(S.slides[prev] || {}))) : null;
      stopMedia(from);
      $$('.ct-slide.is-was', stage).forEach(function (x) { if (x !== from) x.classList.remove('is-was'); });
      if (from) { from.classList.remove('is-on'); from.classList.add('is-was'); from.setAttribute('aria-hidden', 'true'); }
      if (to) {
        if (origin) { to.style.setProperty('--ox', origin.px.toFixed(0) + 'px'); to.style.setProperty('--oy', origin.py.toFixed(0) + 'px'); }
        if (o.instant || mode.still) to.classList.add('is-instant');
        if (!S.gated) activate(to);
        to.setAttribute('aria-hidden', 'false');
        setTimeout(function () { if (from && from !== slideEl(S.i)) from.classList.remove('is-was'); if (to) to.classList.remove('is-instant'); }, 1400);
      }
      S.i = i; S.elapsed = 0; S.t0 = performance.now(); S.dwell = 0;
      $$('.ct-hz-seg', line).forEach(function (b, j) {
        b.classList.toggle('on', j === i); b.classList.toggle('done', j < i);
        b.setAttribute('aria-selected', String(j === i));
        var f = b.querySelector('.ct-hz-fill'); if (f && j !== i) f.style.transform = '';
      });
      $('[data-sl-i]', root).textContent = String(i + 1).padStart(2, '0');
      var live = $('[data-sl-live]', root); if (live && !o.instant) live.textContent = 'Slide ' + (i + 1) + ' of ' + n + ': ' + plain(S.slides[i].headline);
      var up = $('.ct-sl-up', root), nx = S.slides[(i + 1) % n];
      if (up) { if (n > 1 && nx) { up.style.display = ''; up.innerHTML = '<span class="ct-sl-up-m">' + thumbHTML(nx) + '</span><span><small>Up next</small><b>' + esc(plain(nx.headline)) + '</b></span>'; } else up.style.display = 'none'; }
      var snd = $('[data-sl="sound"]', root), cur = S.slides[i];
      if (snd) snd.hidden = !(cur && (cur.media_kind === 'video' || cur.media_kind === 'youtube') && !mode.noVideo);
      paintSun(0);
    }
    function activate(to) {
      if (!to) return;
      to.classList.add('is-on');
      startMedia(to);
    }
    function startMedia(sl) {
      if (!sl || mode.noVideo) return;
      var v = $('video', sl);
      if (v) {
        if (!v.src && v.getAttribute('data-src')) v.src = v.getAttribute('data-src');
        v.muted = S.muted;
        var p = v.play(); if (p && p.catch) p.catch(function () {});
      }
      var yt = $('.ct-yt', sl);
      if (yt && !$('iframe', yt) && yt.getAttribute('data-yt') && !mode.still) {
        var id = yt.getAttribute('data-yt');
        var f = doc.createElement('iframe');
        f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&mute=1&controls=0&loop=1&playlist=' + id + '&playsinline=1&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&enablejsapi=1&origin=' + encodeURIComponent(global.location.origin);
        f.allow = 'autoplay; encrypted-media; picture-in-picture';
        f.setAttribute('tabindex', '-1'); f.setAttribute('aria-hidden', 'true'); f.title = '';
        f.addEventListener('load', function () { setTimeout(function () { yt.classList.add('is-playing'); if (!S.muted) ytCmd(f, 'unMute'); }, 900); });
        yt.appendChild(f);
      }
    }
    function stopMedia(sl) {
      if (!sl) return;
      var v = $('video', sl); if (v) { try { v.pause(); } catch (e) {} }
      var f = $('.ct-yt iframe', sl); if (f) { f.remove(); var yt = $('.ct-yt', sl); if (yt) yt.classList.remove('is-playing'); }
    }
    function ytCmd(f, fn) { try { f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: fn, args: [] }), '*'); } catch (e) {} }

    /* the clock that moves the sun */
    function running() { return !S.paused && !S.userPaused && !S.hover && S.visible && !doc.hidden && !S.gated && !blocked(); }
    function blocked() {
      if (opts.preview) return false;
      var sh = doc.getElementById('ct-sheet'), bk = doc.querySelector('.ct-bk.open'), cx = doc.querySelector('#cbx.open'), im = doc.querySelector('.cim-viewer.open, .cim-player.open');
      return !!((sh && sh.classList.contains('open')) || bk || cx || im);
    }
    var last = 0;
    function loop(now) {
      if (S.dead) return;
      S.raf = requestAnimationFrame(loop);
      var dt = last ? Math.min(100, now - last) : 16; last = now;
      if (!S.slides.length) return;
      var s = S.slides[S.i];
      if (running() && S.slides.length > 1) {
        S.elapsed += dt;
        var p = Math.min(1, S.elapsed / durOf(s));
        paintSun(mode.still ? p : easeSun(p));
        if (p >= 1) next();
      }
      if (running() && !opts.preview && s && !S.seen[s.id] && !/^auto-/.test(s.id)) {
        S.dwell += dt;
        if (S.dwell > 1500) { S.seen[s.id] = true; track(s.id, 'view'); }
      }
    }
    function easeSun(p) { return p; }
    function next() { show(S.i + 1); }
    function prev() { show(S.i - 1); }

    /* impressions: once per slide per visit; clicks when acted on */
    function track(id, ev) {
      if (opts.preview || !/^[0-9a-f-]{36}$/i.test(String(id))) return;
      var key = 'ct-sl:' + ev + ':' + id;
      try { if (ev === 'view' && global.sessionStorage.getItem(key)) return; global.sessionStorage.setItem(key, '1'); } catch (e) {}
      var c = kit && kit.sb(); if (!c) return;
      c.rpc('tour_spotlight_track', { p_id: id, p_event: ev }).then(function () {}, function () {});
    }

    /* input */
    listen(root, 'click', function (e) {
      var b = e.target.closest('[data-sl]'), go = e.target.closest('[data-go]'), act = e.target.closest('[data-sl-act]');
      if (go) { show(+go.getAttribute('data-go')); return; }
      if (b) {
        var k = b.getAttribute('data-sl');
        if (k === 'next' || k === 'upnext') next();
        else if (k === 'prev') prev();
        else if (k === 'pause') { S.userPaused = !S.userPaused; b.innerHTML = S.userPaused ? IC.play : IC.pause; b.setAttribute('aria-label', S.userPaused ? 'Play the slideshow' : 'Pause the slideshow'); root.classList.toggle('is-paused', S.userPaused); }
        else if (k === 'sound') {
          S.muted = !S.muted; b.innerHTML = S.muted ? IC.mute : IC.sound; b.setAttribute('aria-label', S.muted ? 'Turn sound on' : 'Turn sound off');
          var cur = slideEl(S.i), v = cur && $('video', cur), f = cur && $('.ct-yt iframe', cur);
          if (v) v.muted = S.muted; if (f) ytCmd(f, S.muted ? 'mute' : 'unMute');
          if (!S.muted) { S.userPaused = true; var pb = $('[data-sl="pause"]', root); if (pb) { pb.innerHTML = IC.play; pb.setAttribute('aria-label', 'Play the slideshow'); } }
        }
        return;
      }
      if (act) {
        var s = S.slides[S.i] || {};
        var a = act.getAttribute('data-sl-act'), tid = act.getAttribute('data-tour');
        if (opts.preview) { e.preventDefault(); return; }
        track(s.id, 'click');
        if (a === 'book') { e.preventDefault(); kitReady(function () { if (K().tour(tid)) K().book(tid); else K().toast('This tour is not taking bookings right now.'); }); }
        else if (a === 'msg') { e.preventDefault(); K() && K().message(tid); }
        else if (a === 'link') {
          var href = act.getAttribute('href') || '';
          if (href.charAt(0) === '#') {
            var target = doc.querySelector(href);
            if (target) { e.preventDefault(); var top = doc.getElementById('ct-top'); global.scrollTo({ top: target.getBoundingClientRect().top + global.scrollY - (top ? top.offsetHeight : 0) + 1, behavior: 'smooth' }); }
          }
        }
      }
    });
    function kitReady(fn) { if (K() && K().loaded()) fn(); else if (K()) K().on('data', function once() { fn(); }); }
    if (global.matchMedia && global.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      var copy = function (e) { return e.target.closest && (e.target.closest('.ct-slide-copy') || e.target.closest('.ct-sl-ui')); };
      listen(root, 'mouseover', function (e) { S.hover = !!copy(e); });
      listen(root, 'mouseleave', function () { S.hover = false; });
    }
    listen(root, 'focusin', function (e) { if (e.target.closest('.ct-slide-copy')) S.paused = true; });
    listen(root, 'focusout', function () { S.paused = false; });
    root.setAttribute('tabindex', root.getAttribute('tabindex') || '-1');
    listen(root, 'keydown', function (e) {
      if (/input|textarea/i.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); } else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    });
    /* swipe */
    var sx = 0, sy = 0, st0 = 0, swiping = false;
    listen(root, 'pointerdown', function (e) { if (e.pointerType === 'mouse') return; sx = e.clientX; sy = e.clientY; st0 = Date.now(); swiping = true; }, { passive: true });
    listen(root, 'pointerup', function (e) {
      if (!swiping) return; swiping = false;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4 && Date.now() - st0 < 800) { if (dx < 0) next(); else prev(); }
    }, { passive: true });
    listen(root, 'pointercancel', function () { swiping = false; }, { passive: true });
    if ('IntersectionObserver' in global) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          S.visible = e.isIntersecting && e.intersectionRatio > 0.2;
          var cur = slideEl(S.i);
          if (!S.visible) stopMedia(cur); else if (!S.gated && cur) startMedia(cur);
        });
      }, { threshold: [0, 0.2, 0.5] });
      io.observe(root); offs.push(function () { io.disconnect(); });
    }
    listen(doc, 'visibilitychange', function () { var cur = slideEl(S.i); if (doc.hidden) stopMedia(cur); else if (S.visible && !S.gated) startMedia(cur); });
    listen(global, 'resize', function () { paintSun(Math.min(1, S.elapsed / durOf(S.slides[S.i] || {}))); }, { passive: true });

    /* The page opens behind the jungle gate. The first slide performs when
       the gate lifts, not while nobody can see it. */
    function ungate() {
      if (!S.gated) return;
      S.gated = false; S.t0 = performance.now(); S.elapsed = 0;
      activate(slideEl(S.i));
    }
    if (S.gated) {
      var waited = 0;
      (function wait() {
        var covered = doc.getElementById('jungle-gate') || doc.documentElement.classList.contains('jg-lock');
        if (!covered || waited > 11000) { setTimeout(ungate, covered ? 0 : 180); return; }
        waited += 150; setTimeout(wait, 150);
      })();
    }
    S.raf = requestAnimationFrame(loop);

    return {
      set: set,
      go: show, next: next, prev: prev,
      pause: function (v) { S.userPaused = v !== false; },
      slides: function () { return S.slides.slice(); },
      destroy: function () {
        S.dead = true; cancelAnimationFrame(S.raf); stopMedia(slideEl(S.i));
        offs.forEach(function (f) { try { f(); } catch (e) {} }); offs = [];
        root.innerHTML = '';
      }
    };
  }

  /* ═══ THE COVER: what the top of /tours is when nothing is playing ═ */
  function coverHTML(h) {
    var kit = K(), c = (h && h.content) || {};
    var shade = Math.max(0, Math.min(90, Number(c.shade == null ? 55 : c.shade))) / 100;
    var focal = esc(c.focal || '50% 50%'), media = '';
    if (c.video && !(kit && kit.thrifty().noVideo)) {
      media = '<video muted loop playsinline autoplay preload="metadata" src="' + esc(c.video) + '"' + (c.image ? ' poster="' + esc(c.image) + '"' : '') + ' style="object-position:' + focal + '" aria-hidden="true" tabindex="-1"></video>';
    } else if (c.image) {
      media = (c.image_mobile ? '<picture><source media="(max-width: 700px)" srcset="' + esc(c.image_mobile) + '"/>' : '') +
        '<img src="' + esc(c.image) + '" alt="" fetchpriority="high" decoding="async" style="object-position:' + focal + '"/>' + (c.image_mobile ? '</picture>' : '');
    }
    var links = (Array.isArray(c.links) ? c.links : []).filter(function (l) { return l && l.label && l.url; }).slice(0, 6);
    return '<div class="ct-cover' + (media ? ' has-media' : '') + '" style="--shade:' + shade + '">' +
      '<div class="ct-cover-media">' + (media || '<div class="ct-cover-sky" aria-hidden="true"></div>' + plate('cover', 1600, 900)) + '</div><div class="ct-cover-wash"></div>' +
      '<div class="ct-wrap ct-cover-in">' +
        (c.eyebrow ? '<span class="ct-eyebrow">' + esc(c.eyebrow) + '</span>' : '') +
        '<h2 class="ct-cover-h">' + (kit ? kit.headline(c.title) : esc(plain(c.title))) + '</h2>' +
        (c.lede ? '<p class="ct-cover-lede">' + esc(c.lede) + '</p>' : '') +
        '<form class="ct-cover-q" action="/tours-catalogue" method="get" role="search">' + IC.pin +
          '<input name="q" type="search" autocomplete="off" enterkeyhint="search" placeholder="' + esc(c.search_placeholder || 'Where do you want to go?') + '" aria-label="Search tours by place"/>' +
          '<button class="ct-btn ct-btn-sun" type="submit">Search</button></form>' +
        (links.length ? '<nav class="ct-cover-links" aria-label="Quick searches">' + links.map(function (l) { return '<a href="' + esc(safeHref(l.url)) + '">' + esc(l.label) + '</a>'; }).join('') + '</nav>' : '') +
        '<ul class="ct-cover-trust"><li>' + IC.verified + 'Guides vetted by Cabana</li><li>' + IC.clock + 'Deposit by M-Pesa, balance on the day</li><li>' + IC.chat + 'Message the guide before you book</li></ul>' +
      '</div></div>';
  }

  /* ═══ /tours: fetch, merge with real departures, show ══════════════ */
  var live = [];
  function boot() {
    var root = doc.getElementById('ct-spotlight');
    if (!root || root.__booted) return;
    root.__booted = true;
    var sl = null, feed = null, fed = false, mode = '';
    function cover() {
      var kit = K(), h = kit && kit.block ? kit.block('hero') : null;
      if (sl) { sl.destroy(); sl = null; root.__sl = null; }
      root.classList.remove('ct-sl-single', 'is-paused', 'ct-still');
      root.classList.add('is-cover');
      root.setAttribute('aria-roledescription', 'banner'); root.setAttribute('aria-label', 'Cabana Tours');
      root.innerHTML = coverHTML(h);
      mode = 'cover';
    }
    function slides(list) {
      if (mode !== 'slides' || !sl) {
        root.classList.remove('is-cover'); root.innerHTML = '';
        root.setAttribute('aria-roledescription', 'carousel'); root.setAttribute('aria-label', 'Spotlight');
        sl = root.__sl = create(root, {});
        mode = 'slides';
      }
      sl.set(list);
    }
    function merge() {
      var kit = K();
      var list = (feed || []).map(function (x) { return Object.assign({}, x); });
      var paid = list.filter(function (x) { return x.kind === 'sponsored'; });
      var feat = list.filter(function (x) { return x.kind === 'tour'; });
      var house = list.filter(function (x) { return x.kind === 'house' && x.media_kind !== 'art' && x.media_kind !== 'world'; });
      var hero = kit && kit.block ? kit.block('hero') : null;
      var autoOn = !hero || !hero.content || hero.content.auto_departures !== false;
      var auto = [];
      if (autoOn && kit && kit.loaded() && paid.length + feat.length < 3) {
        var have = {};
        paid.concat(feat).forEach(function (x) { if (x.tour) have[String(x.tour.id)] = true; });
        kit.upcoming(30).filter(function (u) { return !have[String(u.tour.id)] && (kit.arr(u.tour.photos)[0] || u.tour.cover_url); }).slice(0, 2).forEach(function (u) {
          var t = u.tour, c = kit.cat(t), cover = kit.arr(t.photos)[0] || t.cover_url;
          auto.push({
            id: 'auto-' + t.id, kind: 'tour', _auto: true, media_kind: t.showcase_video && !kit.thrifty().noVideo ? 'video' : 'image',
            media_url: t.showcase_video || cover, poster_url: t.video_poster || cover, focal: '50% 50%',
            accent: kit.accent(t), kicker: (c ? c.name : 'Tour') + (t.destination ? ' · ' + t.destination : ''),
            headline: t.showcase_headline || t.title, subline: t.summary || '',
            tour: { id: t.id, title: t.title, destination: t.destination || t.county, price: t.price_kes, price_basis: t.price_basis, deposit_pct: t.deposit_pct,
                    duration: t.duration_label || (t.days > 1 ? t.days + ' days' : ''), cover: cover, next_departure: u.dep.departs_at },
            operator: t.operator_name ? { id: t.operator_id, name: t.operator_name, verified: t.operator_verified, logo: t.operator_logo } : null
          });
        });
      }
      live = paid.concat(feat, auto, house);
      if (live.length) slides(live); else cover();
      try { doc.dispatchEvent(new CustomEvent('ct:spotlight', { detail: { slides: live.slice() } })); } catch (e) {}
    }
    var kit = K(), c = kit && kit.sb();
    // The cover paints at once; the slideshow takes over if the feed has anything.
    cover();
    if (c) c.rpc('tour_spotlight_feed').then(function (r) {
      feed = r && Array.isArray(r.data) ? r.data : []; fed = true; merge();
    }, function () { feed = []; fed = true; merge(); });
    if (kit) {
      kit.on('data', function () { if (fed) merge(); });
      kit.on('page', function () { if (mode === 'cover') cover(); else if (fed) merge(); });
    }
  }

  global.CabanaSpotlight = { create: create, headline: headlineHTML, live: function () { return live.slice(); } };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})(window);
