/* ═══════════════════════════════════════════════════════════════════
   CABANA TOURS · the Marquee
   ───────────────────────────────────────────────────────────────────
   The premium slots at the top of /tours. One stage plays one slot at
   a time; beside it, the queue shows everything in rotation with the
   playing slot lit and filling. Each new slot slides in over the last
   like a card dealt onto the table.

   What fills it, in order (Console → Tours → Marquee decides the rest):
     1. Sponsored   slots guides and operators bought (tour_spotlight_feed)
     2. Ads         campaigns booked on the tours.marquee placement in
                    Console → Advertising (ads_bundle, tracked by ad_track)
     3. Featured    tours Cabana features for free
     4. Automatic   up to two departures leaving soonest (tours with a
                    photo) and the newest 360° world, each switchable
     5. House       Cabana's own promotions, with a badge, a device
                    target and a button that can open a 360° world
   With nothing to show it is the cover the team writes in the console
   (Tours → Page → Cover). Nothing here draws a pretend place.

   Nothing plays that is not on screen. Save-Data gets stills; reduced
   motion gets stills and waits for a tap instead of rotating.
   The studio and the console reuse the stage to preview a slot before
   it runs: CabanaSpotlight.create(root, { preview: true }), and the
   console draws the cover with CabanaSpotlight.cover({ content }).
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  var doc = global.document;
  function K() { return global.CabanaTours; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function pad(n) { return String(n).padStart(2, '0'); }
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
    out: I('<path d="M7 17 17 7M8 7h9v9"/>', 2.2),
    search: I('<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.2-4.2"/>', 2.2)
  };
  var DEFAULT_COVER = '/assets/tours/promo/plains-dusk-1800.webp';
  var PHONE = '(max-width: 700px)';

  /* ── words ───────────────────────────────────────────────────────── */
  /* Every word in its own mask so the headline rises line by line;
     *these words* take the slot's accent. */
  function headlineHTML(h) {
    var out = [], wi = 0;
    String(h || '').split('*').forEach(function (seg, i) {
      seg.split(/\s+/).filter(Boolean).forEach(function (w) {
        out.push('<span class="w" style="--wi:' + (wi++) + '">' + (i % 2 ? '<em>' + esc(w) + '</em>' : '<span>' + esc(w) + '</span>') + '</span>');
      });
    });
    return out.join(' ');
  }
  function plain(h) { return String(h || '').replace(/\*/g, '').replace(/\s+/g, ' ').trim(); }
  function hex(v) { return /^#[0-9A-Fa-f]{6}$/.test(String(v || '')) ? String(v) : null; }
  function tint(h, k) {
    var m = /^#([0-9a-f]{6})$/i.exec(h || ''); if (!m) return '#FFC4A8';
    var n = parseInt(m[1], 16), c = [n >> 16 & 255, n >> 8 & 255, n & 255].map(function (x) { return Math.round(x + (255 - x) * k); });
    return 'rgb(' + c.join(',') + ')';
  }
  /* Cabana's own slots may point anywhere on Cabana, never off it. */
  function safeHref(u) {
    var h = String(u || '').trim();
    if (/^(\/(?!\/)|#)/.test(h)) return h;
    var m = h.match(/^https:\/\/(www\.)?cabana\.africa(\/[^\s]*)?$/i);
    return m ? (m[2] || '/') : '/tours';
  }
  /* An advertiser's link: theirs to choose, but only http(s) or a path. */
  function adHref(u) {
    u = String(u == null ? '' : u).trim();
    if (!u || u === '#') return '';
    if (/^\/\//.test(u)) return 'https:' + u;
    if (/^https?:\/\//i.test(u)) return u;
    if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return '';
    return u.charAt(0) === '/' ? u : '/' + u.replace(/^\.\//, '');
  }
  function mediaUrl(u) { u = String(u || '').trim(); return /^(https?:\/\/|\/(?!\/))/i.test(u) && !/youtu\.?be/i.test(u) ? u : ''; }
  function ytId(u) { var m = String(u || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/); return m ? m[1] : (/^[A-Za-z0-9_-]{11}$/.test(String(u || '')) ? String(u) : ''); }
  function money(n) { var k = K(); return k ? k.money(n) : 'KES ' + Math.round(Number(n) || 0).toLocaleString('en-KE'); }

  /* ── one slot ────────────────────────────────────────────────────── */
  var WORLD_ACC = '#7457F2';
  function accOf(s) {
    var a = hex(s.accent); if (a) return a;
    if (s.kind === 'sponsored') return '#FFB21E';
    if (s._auto === 'world') return WORLD_ACC;
    if (s.tour && K()) return K().accent({ id: s.tour.id });
    return '#F2541B';
  }
  function badgeHTML(s) {
    if (s.kind === 'sponsored') return '<span class="tw-badge tw-badge-sun" title="A guide or operator paid for this slot">Sponsored</span>';
    if (s.kind === 'ad') return '<span class="tw-badge tw-badge-ad" title="An advertisement">Ad</span>';
    if (s._auto === 'departure') return '<span class="tw-badge tw-badge-glass tw-badge-live">Leaving soon</span>';
    if (s._auto === 'world') return '<span class="tw-badge tw-badge-jac">' + IC.vr + 'VR · 360°</span>';
    if (s.kind === 'tour') return '<span class="tw-badge tw-badge-green">Featured</span>';
    if (s.label) return '<span class="tw-badge tw-badge-acc">' + esc(s.label) + '</span>';
    return '';
  }
  function byline(s) {
    if (s.kind === 'ad') return s.kicker || 'Advertiser';
    if (s.operator && s.operator.name) return s.operator.name;
    if (s.tour && s.tour.destination) return s.tour.destination;
    if (s._auto === 'world') return 'Cabana Immersive';
    return s.kicker || 'Cabana Tours';
  }
  function mediaHTML(s, mode, first) {
    var k = s.media_kind, focal = esc(s.focal || '50% 50%'), load = first ? ' fetchpriority="high"' : ' loading="lazy"';
    if (k === 'art' || k === 'none') return '';
    if (k === 'youtube') {
      var id = ytId(s.media_url);
      var poster = s.poster_url || (id ? 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg' : '');
      return '<div class="tw-yt" data-yt="' + esc(id) + '"><div class="tw-yt-poster" style="background-image:url(\'' + esc(poster).replace(/'/g, '%27') + '\')"></div></div>';
    }
    if (k === 'video' && !mode.noVideo && s.media_url) {
      return '<video muted loop playsinline preload="none" data-src="' + esc(s.media_url) + '"' + (s.poster_url ? ' poster="' + esc(s.poster_url) + '"' : '') +
        ' style="object-position:' + focal + '" aria-hidden="true" tabindex="-1"></video>';
    }
    var src = k === 'video' ? (s.poster_url || (s.tour && s.tour.cover) || '') : s.media_url;
    if (!src && s.tour && s.tour.cover) src = s.tour.cover;
    if (!src) return '';
    return (s.media_mobile_url ? '<picture><source media="' + PHONE + '" srcset="' + esc(s.media_mobile_url) + '"/>' : '') +
      '<img src="' + esc(src) + '" alt="" decoding="async"' + load + ' style="object-position:' + focal + ';--focal:' + focal + '"/>' +
      (s.media_mobile_url ? '</picture>' : '');
  }
  function thumbHTML(s) {
    var src = '';
    if (s.media_kind === 'image') src = s.media_url;
    else if (s.media_kind === 'video') src = s.poster_url || (s.tour && s.tour.cover) || '';
    else if (s.media_kind === 'youtube') src = s.poster_url || (ytId(s.media_url) ? 'https://i.ytimg.com/vi/' + ytId(s.media_url) + '/mqdefault.jpg' : '');
    if (!src && s.tour && s.tour.cover) src = s.tour.cover;
    return src ? '<img src="' + esc(src) + '" alt="" loading="lazy" decoding="async"/>' : '';
  }
  function slideHTML(s, i, n, mode) {
    var t = s.tour || null, op = s.operator || null, kit = K(), acc = accOf(s);
    var kick = badgeHTML(s) + (s.kicker && s.kind !== 'ad' ? '<span class="tw-kick">' + esc(s.kicker) + '</span>' : '') +
      (s.kind === 'ad' && s.kicker ? '<span class="tw-kick">' + esc(s.kicker) + '</span>' : '');
    var meta = [];
    if (op && op.name && s.kind !== 'ad') meta.push('<span class="op">' + (op.logo ? '<img src="' + esc(op.logo) + '" alt="" loading="lazy"/>' : '<span class="av">' + esc(op.name.charAt(0).toUpperCase()) + '</span>') + esc(op.name) + (op.verified ? '<span class="ok" title="Vetted by Cabana">' + IC.verified + '</span>' : '') + '</span>');
    if (t && t.destination) meta.push('<span>' + IC.pin + esc(t.destination) + '</span>');
    if (t && t.duration) meta.push('<span>' + IC.clock + esc(t.duration) + '</span>');
    if (t && t.price != null) meta.push('<span class="price">' + (Number(t.price) === 0 ? '<b>Free</b> · pay what you like' : 'From <b>' + esc(money(t.price)) + '</b>' + (t.price_basis === 'per_group' ? ' a group' : ' pp')) + '</span>');
    var clock = t && t.next_departure && new Date(t.next_departure).getTime() > Date.now()
      ? '<div class="tw-slide-clock"><small>Leaves<br>in</small><span data-cd="' + esc(t.next_departure) + '" data-cd-done="Departing now"></span></div>' : '';
    var acts = '';
    if (s.kind === 'ad') {
      var ah = adHref(s.cta_url);
      if (ah) acts = '<a class="tw-btn tw-btn-ember" href="' + esc(ah) + '" data-sl-act="ad"' + (/^https?:/i.test(ah) ? ' target="_blank" rel="noopener sponsored"' : '') + '>' + esc(s.cta_label || 'Find out more') + IC.out + '</a>';
    } else if (t) {
      acts = '<button class="tw-btn tw-btn-ember" type="button" data-sl-act="book" data-tour="' + esc(t.id) + '">' + esc(s.cta_label || (Number(t.price) === 0 ? 'Reserve a place' : 'Book this tour')) + IC.arrow + '</button>' +
        '<button class="tw-btn tw-btn-glass" type="button" data-sl-act="msg" data-tour="' + esc(t.id) + '">' + IC.chat + '<span>Message <span class="lbl-long">the guide</span></span></button>' +
        (kit && !mode.preview ? kit.heart(t.id) : '');
    } else if (s.world_slug) {
      acts = '<button class="tw-btn tw-btn-light" type="button" data-sl-act="world" data-world="' + esc(s.world_slug) + '">' + IC.vr + esc(s.cta_label || 'Step inside') + '</button>' +
        (s.cta_url && s.cta_url !== '#immersive' ? '<a class="tw-btn tw-btn-glass" href="' + esc(safeHref(s.cta_url)) + '" data-sl-act="link">Find out more</a>' : '');
    } else if (s.kind === 'sponsored' && op) {
      acts = '<a class="tw-btn tw-btn-ember" href="/tours-catalogue?op=' + encodeURIComponent(op.id) + '" data-sl-act="link">' + esc(s.cta_label || 'See their tours') + IC.arrow + '</a>';
    } else if (s.cta_url) {
      acts = '<a class="tw-btn tw-btn-ember" href="' + esc(safeHref(s.cta_url)) + '" data-sl-act="link">' + esc(s.cta_label || 'Find out more') + IC.arrow + '</a>';
    }
    var media = mediaHTML(s, mode, i === 0);
    var bg = s.kind === 'ad' && !media && s.bg ? ' style="--tw-bgfill:' + esc(String(s.bg).replace(/[;{}<>]/g, '')) + '"' : '';
    if (!media && mode.preview) media = '<div class="tw-wire" aria-hidden="true"><div class="ph">Your photo or film</div></div>';
    return '<article class="tw-slide" data-i="' + i + '" data-id="' + esc(s.id) + '" data-kind="' + esc(s.kind) + '" data-media="' + esc(s.media_kind) + '" style="--acc:' + acc + ';--acc-lt:' + tint(acc, .5) + '" role="group" aria-roledescription="slide" aria-label="' + (i + 1) + ' of ' + n + ': ' + esc(plain(s.headline)) + '"' + (i ? ' aria-hidden="true"' : '') + '>' +
      '<div class="tw-slide-media"' + bg + '>' + media + '</div><div class="tw-slide-shade"></div>' +
      '<div class="tw-slide-copy">' +
        (kick ? '<div class="tw-slide-kick">' + kick + '</div>' : '') +
        '<h2 class="tw-slide-h">' + headlineHTML(s.headline) + '</h2>' +
        (s.subline ? '<p class="tw-slide-sub">' + esc(s.subline) + '</p>' : '') +
        (meta.length ? '<div class="tw-slide-meta">' + meta.join('') + '</div>' : '') +
        clock +
        (acts ? '<div class="tw-slide-acts">' + acts + '</div>' : '') +
      '</div></article>';
  }

  /* ═══ THE STAGE ═══════════════════════════════════════════════════
     create(root, { preview, queue, rotate, onView, onClick, onChange }) */
  function create(root, opts) {
    opts = opts || {};
    var kit = K();
    var mode = kit ? kit.thrifty() : { still: false, noVideo: false };
    if (opts.preview) mode = { still: false, noVideo: false, preview: true };
    var reduced = !opts.preview && !!(kit && kit.reduced && kit.reduced());
    var offs = [];
    function listen(target, ev, fn, o) { target.addEventListener(ev, fn, o); offs.push(function () { target.removeEventListener(ev, fn, o); }); }
    var S = { slides: [], i: -1, elapsed: 0, userPaused: reduced, hover: false, focus: false, visible: true, raf: 0, muted: true, seen: {}, dwell: 0, dead: false, rotate: clampRotate(opts.rotate) };
    root.classList.add('tw-mq-stage');
    root.classList.toggle('is-preview', !!opts.preview);
    root.classList.toggle('is-still', !!mode.still);
    root.setAttribute('role', 'region'); root.setAttribute('aria-roledescription', 'carousel'); root.setAttribute('aria-label', opts.preview ? 'Slot preview' : 'The Marquee');
    root.innerHTML =
      '<div class="tw-mq-slides"></div>' +
      '<div class="tw-mq-top"><div class="tw-mq-segs" role="tablist" aria-label="Choose a slot"></div>' +
        '<div class="tw-mq-ctl"><span class="tw-mq-n" aria-hidden="true"><b data-sl-i>01</b> / <span data-sl-n>01</span></span>' +
          '<button class="tw-ic" type="button" data-sl="sound" aria-label="Turn sound on" hidden>' + IC.mute + '</button>' +
          '<button class="tw-ic" type="button" data-sl="pause" aria-label="Pause the Marquee">' + IC.pause + '</button></div></div>' +
      '<div class="tw-mq-arrows"><button class="tw-ic" type="button" data-sl="prev" aria-label="Previous slot">' + IC.prev + '</button>' +
        '<button class="tw-ic" type="button" data-sl="next" aria-label="Next slot">' + IC.next + '</button></div>' +
      '<div class="ct-sr" aria-live="polite" data-sl-live></div>';
    var stage = $('.tw-mq-slides', root), segs = $('.tw-mq-segs', root), queue = opts.queue || null;
    function setPauseBtn(paused) {
      var b = $('[data-sl="pause"]', root); if (!b) return;
      b.innerHTML = paused ? IC.play : IC.pause;
      b.setAttribute('aria-label', paused ? 'Play the Marquee' : 'Pause the Marquee');
      root.classList.toggle('is-paused', paused);
    }
    if (S.userPaused) setPauseBtn(true);

    function durOf(s) {
      if (opts.preview) return 6000;
      var d = S.rotate;
      if (s && (s.media_kind === 'video' || s.media_kind === 'youtube') && !mode.noVideo) d = Math.max(d, 11000);
      return d;
    }
    function set(slides, so) {
      so = so || {};
      var keep = S.slides[S.i] && S.slides[S.i].id, kept = S.elapsed, first = !S.slides.length;
      S.slides = (slides || []).slice(0, 16);
      var n = S.slides.length;
      stage.innerHTML = S.slides.map(function (s, i) { return slideHTML(s, i, n, mode); }).join('');
      S.slides.forEach(function (s, i) { var e = stage.children[i]; if (e) e.style.setProperty('--dur', (durOf(s) + 1200) + 'ms'); });
      segs.innerHTML = n > 1 ? S.slides.map(function (s, i) {
        return '<button class="tw-seg" type="button" role="tab" data-go="' + i + '" aria-label="' + esc('Slot ' + (i + 1) + ': ' + plain(s.headline)) + '"><i></i></button>';
      }).join('') : '';
      root.classList.toggle('is-single', n < 2);
      $('[data-sl-n]', root).textContent = pad(n);
      if (queue) paintQueue();
      var at = 0, same = false;
      if (keep) S.slides.forEach(function (s, i) { if (s.id === keep) { at = i; same = true; } });
      S.i = -1;
      // The first time, the slot performs its entrance. After that (more
      // slots arriving), the one playing carries on where it was.
      var deal = !!so.deal && !reduced && !mode.still;
      show(at, { instant: !deal, enter: first && !opts.preview, elapsed: same ? kept : 0 });
      if (kit) { kit.countdowns(stage); kit.paintHearts(); }
    }
    function paintQueue() {
      var n = S.slides.length;
      queue.innerHTML = '<div class="tw-q-h"><span>In the Marquee</span><b>' + n + (n === 1 ? ' slot' : ' slots') + '</b></div>' +
        '<ol class="tw-q-list">' + S.slides.map(function (s, i) {
          return '<li><button class="tw-q" type="button" data-go="' + i + '" aria-current="false" style="--acc:' + accOf(s) + '">' +
            '<span class="tw-q-m">' + thumbHTML(s) + '</span>' +
            '<span class="tw-q-b">' + badgeHTML(s) + '<b>' + esc(plain(s.headline)) + '</b><small>' + esc(byline(s)) + '</small></span>' +
            '<i class="tw-q-p" aria-hidden="true"></i></button></li>';
        }).join('') + '</ol>';
    }
    function slideEl(i) { return i >= 0 ? stage.children[i] || null : null; }
    function show(i, o) {
      o = o || {};
      var n = S.slides.length; if (!n) return;
      i = ((i % n) + n) % n;
      if (i === S.i && !o.force) return;
      var prev = S.i, from = slideEl(prev), to = slideEl(i);
      stopMedia(from);
      $$('.tw-slide.is-was', stage).forEach(function (x) { if (x !== from) x.classList.remove('is-was'); });
      if (from) { from.classList.remove('is-on', 'is-instant'); from.classList.add('is-was'); from.setAttribute('aria-hidden', 'true'); }
      if (to) {
        to.classList.remove('is-was');
        to.classList.toggle('is-back', !!o.back);
        if (o.instant || mode.still) to.classList.add('is-instant');
        if (o.elapsed) to.style.setProperty('--delay', (-o.elapsed) + 'ms'); else to.style.removeProperty('--delay');
        if (o.enter) requestAnimationFrame(function () { requestAnimationFrame(function () { if (S.slides[S.i] && slideEl(S.i) === to) to.classList.add('is-on'); }); });
        else to.classList.add('is-on');
        to.setAttribute('aria-hidden', 'false');
        startMedia(to);
        clearTimeout(S.wasT);
        S.wasT = setTimeout(function () { $$('.tw-slide.is-was', stage).forEach(function (x) { x.classList.remove('is-was'); }); }, 1100);
      }
      S.i = i; S.elapsed = o.elapsed || 0; S.dwell = 0;
      $$('.tw-seg', segs).forEach(function (b, j) {
        b.classList.toggle('on', j === i); b.classList.toggle('done', j < i);
        b.setAttribute('aria-selected', String(j === i));
        var bar = b.firstChild; if (bar) bar.style.setProperty('--p', j < i ? 1 : 0);
      });
      if (queue) $$('.tw-q', queue).forEach(function (q, j) {
        q.setAttribute('aria-current', String(j === i));
        var p = q.querySelector('.tw-q-p'); if (p) p.style.setProperty('--p', 0);
        if (j === i && !o.instant) {
          var list = q.closest('.tw-q-list');
          if (list && (q.offsetTop < list.scrollTop || q.offsetTop + q.offsetHeight > list.scrollTop + list.clientHeight)) list.scrollTo({ top: q.offsetTop - 8, behavior: reduced ? 'auto' : 'smooth' });
        }
      });
      $('[data-sl-i]', root).textContent = pad(i + 1);
      var live = $('[data-sl-live]', root); if (live && !o.instant) live.textContent = 'Slot ' + (i + 1) + ' of ' + n + ': ' + plain(S.slides[i].headline);
      var snd = $('[data-sl="sound"]', root), cur = S.slides[i];
      if (snd) snd.hidden = !(cur && (cur.media_kind === 'video' || cur.media_kind === 'youtube') && !mode.noVideo);
      if (opts.onChange) try { opts.onChange(cur, i); } catch (e) {}
    }
    function paintProgress(p) {
      var seg = segs.children[S.i], bar = seg && seg.firstChild;
      if (bar) bar.style.setProperty('--p', p.toFixed(4));
      if (queue) { var q = queue.querySelectorAll('.tw-q-p')[S.i]; if (q) q.style.setProperty('--p', p.toFixed(4)); }
    }
    function startMedia(sl) {
      if (!sl || mode.noVideo || !S.visible) return;
      var v = $('video', sl);
      if (v) {
        if (!v.src && v.getAttribute('data-src')) v.src = v.getAttribute('data-src');
        v.muted = S.muted;
        var p = v.play(); if (p && p.catch) p.catch(function () {});
      }
      var yt = $('.tw-yt', sl);
      if (yt && !$('iframe', yt) && yt.getAttribute('data-yt') && !mode.still) {
        var id = yt.getAttribute('data-yt'), f = doc.createElement('iframe');
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
      var f = $('.tw-yt iframe', sl); if (f) { f.remove(); var yt = $('.tw-yt', sl); if (yt) yt.classList.remove('is-playing'); }
    }
    function ytCmd(f, fn) { try { f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: fn, args: [] }), '*'); } catch (e) {} }

    /* the clock: only while someone can see it and nothing sits on top */
    function blocked() {
      if (opts.preview) return false;
      var sh = doc.getElementById('ct-sheet');
      // Nothing is spent while something sits on top of the page: the tour
      // sheet, booking, messages, the 360° player, or a welcome offer.
      return !!((sh && sh.classList.contains('open')) || doc.querySelector('.ct-bk.open, #cbx.open, .cim-player, .ct-search-ov.open, .ct-drawer.open, .ccp-wrap, .cw-wrap, #apt-ref-popup'));
    }
    /* Seen: on screen with nothing on top. Running: seen, and nobody is
       holding it (a pause, a hover, keyboard focus). A slot counts as
       viewed after 1.2 s seen, held or not; only rotation waits. */
    function seeing() { return S.visible && !doc.hidden && !blocked(); }
    function running() { return !S.userPaused && !S.hover && !S.focus && seeing(); }
    var last = 0;
    function loop(now) {
      if (S.dead) return;
      S.raf = requestAnimationFrame(loop);
      var dt = last ? Math.min(100, now - last) : 16; last = now;
      var n = S.slides.length; if (!n) return;
      var s = S.slides[S.i];
      if (!seeing()) return;
      if (!opts.preview && s && !S.seen[s.id]) {
        S.dwell += dt;
        if (S.dwell > 1200) { S.seen[s.id] = true; if (opts.onView) try { opts.onView(s); } catch (e) {} }
      }
      if (!running() || n < 2) return;
      S.elapsed += dt;
      var p = Math.min(1, S.elapsed / durOf(s));
      paintProgress(p);
      if (p >= 1) next();
    }
    function next() { show(S.i + 1); }
    function prev() { show(S.i - 1, { back: true }); }

    /* input */
    function onClick(e) {
      var go = e.target.closest('[data-go]'), b = e.target.closest('[data-sl]'), act = e.target.closest('[data-sl-act]');
      if (go) { var gi = +go.getAttribute('data-go'); show(gi, { back: gi < S.i }); return; }
      if (b) {
        var k = b.getAttribute('data-sl');
        if (k === 'next') next();
        else if (k === 'prev') prev();
        else if (k === 'pause') { S.userPaused = !S.userPaused; setPauseBtn(S.userPaused); }
        else if (k === 'sound') {
          S.muted = !S.muted; b.innerHTML = S.muted ? IC.mute : IC.sound; b.setAttribute('aria-label', S.muted ? 'Turn sound on' : 'Turn sound off');
          var cur = slideEl(S.i), v = cur && $('video', cur), f = cur && $('.tw-yt iframe', cur);
          if (v) v.muted = S.muted; if (f) ytCmd(f, S.muted ? 'mute' : 'unMute');
          // Someone listening wants the slot to stay.
          if (!S.muted) { S.userPaused = true; setPauseBtn(true); }
        }
        return;
      }
      if (act) {
        var s = S.slides[S.i] || {};
        if (opts.preview) { e.preventDefault(); return; }
        if (opts.onClick) try { opts.onClick(s, act.getAttribute('data-sl-act'), act, e); } catch (x) {}
      }
    }
    listen(root, 'click', onClick);
    if (queue) listen(queue, 'click', onClick);
    if (global.matchMedia && global.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      listen(root, 'mouseover', function (e) { S.hover = !!(e.target.closest && e.target.closest('.tw-slide-copy, .tw-mq-top, .tw-mq-arrows')); });
      listen(root, 'mouseleave', function () { S.hover = false; });
    }
    listen(root, 'focusin', function (e) { if (e.target.closest('.tw-slide-copy')) S.focus = true; });
    listen(root, 'focusout', function () { S.focus = false; });
    if (!root.hasAttribute('tabindex')) root.setAttribute('tabindex', '-1');
    listen(root, 'keydown', function (e) {
      if (/input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); } else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    });
    var sx = 0, sy = 0, st0 = 0, swiping = false;
    listen(root, 'pointerdown', function (e) { if (e.pointerType === 'mouse') return; sx = e.clientX; sy = e.clientY; st0 = Date.now(); swiping = true; }, { passive: true });
    listen(root, 'pointerup', function (e) {
      if (!swiping) return; swiping = false;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4 && Date.now() - st0 < 800) { if (dx < 0) next(); else prev(); }
    }, { passive: true });
    listen(root, 'pointercancel', function () { swiping = false; }, { passive: true });
    if ('IntersectionObserver' in global) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          S.visible = e.isIntersecting && e.intersectionRatio > 0.2;
          var cur = slideEl(S.i);
          if (!S.visible) stopMedia(cur); else startMedia(cur);
        });
      }, { threshold: [0, 0.2, 0.5] });
      io.observe(root); offs.push(function () { io.disconnect(); });
    }
    listen(doc, 'visibilitychange', function () { var cur = slideEl(S.i); if (doc.hidden) stopMedia(cur); else if (S.visible) startMedia(cur); });
    S.raf = requestAnimationFrame(loop);

    return {
      set: set,
      go: function (i) { show(i); }, next: next, prev: prev,
      pause: function (v) { S.userPaused = v !== false; setPauseBtn(S.userPaused); },
      rotate: function (ms) { S.rotate = clampRotate(ms); S.slides.forEach(function (s, i) { var e = stage.children[i]; if (e) e.style.setProperty('--dur', (durOf(s) + 1200) + 'ms'); }); },
      slides: function () { return S.slides.slice(); },
      current: function () { return S.slides[S.i] || null; },
      destroy: function () {
        S.dead = true; cancelAnimationFrame(S.raf); stopMedia(slideEl(S.i)); clearTimeout(S.wasT);
        offs.forEach(function (f) { try { f(); } catch (e) {} }); offs = [];
        root.innerHTML = ''; root.classList.remove('is-single', 'is-paused', 'is-preview', 'is-still');
      }
    };
  }
  function clampRotate(ms) { ms = Number(ms) || 7000; return Math.max(4000, Math.min(20000, ms)); }

  /* ═══ THE COVER: the Marquee with nothing booked into it ══════════ */
  function coverHTML(h) {
    var kit = K(), c = (h && h.content) || {};
    var shade = Math.max(0, Math.min(90, Number(c.shade == null ? 45 : c.shade))) / 100;
    var focal = esc(c.focal || '50% 50%'), media;
    if (c.video && !(kit && kit.thrifty().noVideo)) {
      media = '<video muted loop playsinline autoplay preload="metadata" src="' + esc(c.video) + '"' + (c.image ? ' poster="' + esc(c.image) + '"' : '') + ' style="object-position:' + focal + '" aria-hidden="true" tabindex="-1"></video>';
    } else {
      var img = c.image || DEFAULT_COVER;
      media = (c.image_mobile ? '<picture><source media="' + PHONE + '" srcset="' + esc(c.image_mobile) + '"/>' : '') +
        '<img src="' + esc(img) + '" alt="" fetchpriority="high" decoding="async" style="object-position:' + focal + ';--focal:' + focal + '"/>' + (c.image_mobile ? '</picture>' : '');
    }
    return '<div class="tw-mq-slides"><article class="tw-slide tw-cover is-on is-instant" style="--acc:#F2541B;--acc-lt:#FFC4A8;--shade-b:' + (0.55 + shade * 0.45).toFixed(2) + ';--dur:30s">' +
      '<div class="tw-slide-media">' + media + '</div><div class="tw-slide-shade"></div>' +
      '<div class="tw-slide-copy">' +
        (c.eyebrow ? '<div class="tw-slide-kick"><span class="tw-kick">' + esc(c.eyebrow) + '</span></div>' : '') +
        '<h2 class="tw-slide-h">' + headlineHTML(c.title || 'Cabana Tours') + '</h2>' +
        (c.lede ? '<p class="tw-slide-sub">' + esc(c.lede) + '</p>' : '') +
        '<div class="tw-slide-acts"><a class="tw-btn tw-btn-ember" href="#find" data-sl-act="find">' + IC.search + 'Find a tour</a>' +
          '<a class="tw-btn tw-btn-glass" href="/tours-catalogue">Open the catalogue</a></div>' +
      '</div></article></div>';
  }

  /* ═══ /tours: fetch every source, merge, show ═════════════════════ */
  var live = [];
  var DEVICE = /iPad|Tablet/i.test(navigator.userAgent) ? 'tablet' : /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
  function visitor() {
    try {
      var v = global.localStorage.getItem('apt_vid');
      if (!v) { v = 'V' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); global.localStorage.setItem('apt_vid', v); }
      return v;
    } catch (e) { return 'V0'; }
  }
  function isPhone() { try { return global.matchMedia(PHONE).matches; } catch (e) { return false; } }
  function deviceOk(s) { var d = s.device || 'all'; return d === 'all' || (d === 'phone' ? isPhone() : !isPhone()); }
  function scrollToEl(target) {
    var top = doc.getElementById('ct-top');
    var reduce = K() && K().reduced && K().reduced();
    global.scrollTo({ top: target.getBoundingClientRect().top + global.scrollY - (top ? top.offsetHeight : 0) + 1, behavior: reduce ? 'auto' : 'smooth' });
  }

  function boot() {
    var root = doc.getElementById('ct-spotlight');
    if (!root || root.__booted) return;
    root.__booted = true;
    var kit = K();
    root.innerHTML = '<div class="ct-wrap"><div class="tw-mq-grid is-solo">' +
      '<div class="tw-mq-host" data-stage></div>' +
      '<aside class="tw-mq-queue" aria-label="Slots in the Marquee" hidden><div class="tw-q-wrap" data-q></div>' +
        '<a class="tw-q-ad" href="/tours-studio?tab=spotlight" data-q-ad hidden><span><small>For guides and operators</small><b data-q-ad-t>Put your tour in the Marquee</b></span>' + IC.arrow + '</a></aside>' +
      '</div></div>';
    var grid = $('.tw-mq-grid', root), host = $('[data-stage]', root), qbox = $('.tw-mq-queue', root), qlist = $('[data-q]', root);
    var sl = null, feed = null, ads = null, settings = null, fed = false, shown = '';
    var VID = visitor(), sentAd = {};

    function trackFeed(s, ev) {
      if (!/^[0-9a-f-]{36}$/i.test(String(s.id))) return;
      var key = 'ct-sl:' + ev + ':' + s.id;
      try { if (ev === 'view' && global.sessionStorage.getItem(key)) return; global.sessionStorage.setItem(key, '1'); } catch (e) {}
      var c = kit && kit.sb(); if (c) c.rpc('tour_spotlight_track', { p_id: s.id, p_event: ev }).then(function () {}, function () {});
    }
    function trackAd(s, ev) {
      var cmp = s._campaign; if (!cmp) return;
      var key = ev + '|' + cmp.id; if (ev !== 'click' && sentAd[key]) return; sentAd[key] = 1;
      var c = kit && kit.sb(); if (!c) return;
      c.rpc('ad_track', { p_campaign: String(cmp.id), p_event: ev, p_page: 'tours', p_slot: 'tours.marquee', p_visitor: VID, p_device: DEVICE }).then(function () {}, function () {});
      try { if (global.gtag) global.gtag('event', 'ad_' + ev, { campaign_id: cmp.campaign_id || cmp.id, advertiser: cmp.advertiser, slot: 'tours.marquee', page: 'tours' }); } catch (e) {}
    }
    function onView(s) {
      if (s.kind === 'ad') { trackAd(s, 'impression'); setTimeout(function () { var cur = sl && sl.current(); if (cur && cur.id === s.id) trackAd(s, 'viewable'); }, 1000); }
      else trackFeed(s, 'view');
    }
    function kitReady(fn) { if (K() && K().loaded()) fn(); else if (K()) K().on('data', function () { fn(); }); }
    function onClick(s, a, btn, e) {
      if (a === 'ad') { trackAd(s, 'click'); return; }
      if (a !== 'find') trackFeed(s, 'click');
      var tid = btn.getAttribute('data-tour');
      if (a === 'book') { e.preventDefault(); kitReady(function () { if (K().tour(tid)) K().book(tid); else K().toast('This tour is not taking bookings right now.'); }); }
      else if (a === 'msg') { e.preventDefault(); if (K()) K().message(tid); }
      else if (a === 'world') {
        e.preventDefault();
        var slug = btn.getAttribute('data-world'), I2 = global.CabanaImmersive;
        var has = I2 && I2.list && I2.list().some(function (w) { return w.slug === slug; });
        if (has) I2.open(slug, { from: btn });
        else { var sec = doc.getElementById('immersive'); if (sec && !sec.hidden) scrollToEl(sec); }
      } else if (a === 'find' || a === 'link') {
        var href = btn.getAttribute('href') || '';
        if (href.charAt(0) === '#') {
          var target = doc.querySelector(href);
          if (target && !target.hidden) {
            e.preventDefault(); scrollToEl(target);
            if (a === 'find') { var q = doc.getElementById('tw-q'); if (q) setTimeout(function () { try { q.focus({ preventScroll: true }); } catch (x) {} }, 450); }
          }
        }
      }
    }

    function cover() {
      var h = kit && kit.block ? kit.block('hero') : null;
      if (sl) { sl.destroy(); sl = null; root.__sl = null; }
      grid.classList.add('is-solo'); qbox.hidden = true;
      host.className = 'tw-mq-host tw-mq-stage is-cover is-single';
      host.setAttribute('role', 'region'); host.setAttribute('aria-label', 'Cabana Tours');
      host.innerHTML = coverHTML(h);
      if (!host.__coverWired) {
        host.__coverWired = true;
        host.addEventListener('click', function (e) { var a = e.target.closest('[data-sl-act]'); if (a && shown === 'cover') onClick({}, a.getAttribute('data-sl-act'), a, e); });
      }
      shown = 'cover';
    }
    var lastSig = '';
    function slides(list) {
      var sig = list.map(function (s) { return s.id + '~' + (s.media_url || '') + '~' + s.headline + '~' + (s.tour && s.tour.next_departure || ''); }).join('|');
      if (shown === 'slides' && sl && sig === lastSig) return;
      lastSig = sig;
      var under = null, deal = false;
      if (shown !== 'slides' || !sl) {
        // The cover stays underneath while the first slot is dealt over it.
        under = shown === 'cover' ? host.querySelector('.tw-mq-slides') : null;
        if (under) under.parentNode.removeChild(under);
        host.className = 'tw-mq-host'; host.innerHTML = '';
        sl = root.__sl = create(host, { queue: qlist, rotate: settings && settings.rotate_ms, onView: onView, onClick: onClick });
        shown = 'slides'; deal = !!under;
        if (under) { under.classList.add('tw-under'); under.setAttribute('aria-hidden', 'true'); host.insertBefore(under, host.firstChild); setTimeout(function () { if (under.parentNode) under.parentNode.removeChild(under); }, 1400); }
      }
      var many = list.length > 1;
      grid.classList.toggle('is-solo', !many); qbox.hidden = !many;
      sl.set(list, { deal: deal });
    }
    function adSlides() {
      var b = ads; if (!b || !Array.isArray(b.campaigns)) return [];
      var st = b.settings || {};
      if (st.enabled === false || (Array.isArray(st.disabled_slots) && st.disabled_slots.indexOf('tours.marquee') !== -1)) return [];
      var FMT = { window: 1, video: 1, split: 1, native: 1 };
      return b.campaigns.filter(function (c) {
        return c && FMT[c.format] && Array.isArray(c.slots) && c.slots.indexOf('tours.marquee') !== -1 && (c.headline || c.advertiser);
      }).slice(0, 4).map(function (c) {
        var m = mediaUrl(c.media_url), vid = c.media_kind ? c.media_kind === 'video' : /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(m);
        return {
          id: 'ad-' + c.id, kind: 'ad', _campaign: c, media_kind: m ? (vid ? 'video' : 'image') : 'none', media_url: m,
          poster_url: mediaUrl(c.poster_url), focal: '50% 50%', accent: '#F2541B', kicker: c.advertiser || '',
          headline: String(c.headline || c.advertiser || '').replace(/<[^>]*>/g, ''), subline: String(c.sub_text || c.sub || '').replace(/<[^>]*>/g, ''),
          cta_label: c.cta_text || 'Find out more', cta_url: c.cta_url, bg: c.theme_gradient || ''
        };
      });
    }
    function autoDepartures(have) {
      var out = [];
      kit.upcoming(30).filter(function (u) { return !have[String(u.tour.id)] && (kit.arr(u.tour.photos)[0] || u.tour.cover_url); }).slice(0, 2).forEach(function (u) {
        var t = u.tour, c = kit.cat(t), cover = t.cover_url || kit.arr(t.photos)[0];
        out.push({
          id: 'auto-' + t.id, kind: 'tour', _auto: 'departure', media_kind: t.showcase_video && !kit.thrifty().noVideo ? 'video' : 'image',
          media_url: t.showcase_video || cover, poster_url: t.video_poster || cover, focal: '50% 50%',
          accent: kit.accent(t), kicker: (c ? c.name : 'Tour') + (t.destination ? ' · ' + t.destination : ''),
          headline: t.showcase_headline || t.title, subline: t.summary || '',
          tour: { id: t.id, title: t.title, destination: t.destination || t.county, price: t.price_kes, price_basis: t.price_basis, deposit_pct: t.deposit_pct,
                  duration: t.duration_label || (t.days > 1 ? t.days + ' days' : ''), cover: cover, next_departure: u.dep.departs_at },
          operator: t.operator_name ? { id: t.operator_id, name: t.operator_name, verified: t.operator_verified, logo: t.operator_logo } : null
        });
      });
      return out;
    }
    function autoWorld(house) {
      var I2 = global.CabanaImmersive; if (!I2 || !I2.list) return null;
      if (house.some(function (h) { return h.world_slug; })) return null;
      var w = I2.list().filter(function (x) { return x && x.slug && x.poster_url; })[0]; if (!w) return null;
      return {
        id: 'auto-world-' + w.slug, kind: 'house', _auto: 'world', media_kind: 'image', media_url: w.poster_url, focal: '50% 50%', accent: WORLD_ACC,
        kicker: [w.destination, w.country].filter(Boolean).join(', ') || 'Cabana Immersive',
        headline: 'Step inside *' + plain(w.title) + '*', subline: (w.tagline ? w.tagline.replace(/\.?$/, '. ') : '') + 'Look around in 360° on your phone, in a VR viewer or in a headset.',
        cta_label: 'Step inside', world_slug: w.slug
      };
    }
    /* The first paint waits (briefly) for the feed, the settings and the
       tours, so the Marquee is dealt once instead of reshuffling. */
    var gateOpen = false;
    setTimeout(function () { gateOpen = true; merge(); }, 2600);
    function merge() {
      if (!fed) return;
      if (!gateOpen) {
        if (settings === null || !(kit && kit.loaded())) return;
        gateOpen = true;
      }
      var set = settings || {};
      if (set.marquee_on === false) { live = []; lastSig = ''; if (shown !== 'cover') cover(); announce(); return; }
      var list = (feed || []).map(function (x) { return Object.assign({}, x); }).filter(deviceOk);
      var paid = list.filter(function (x) { return x.kind === 'sponsored'; });
      var feat = list.filter(function (x) { return x.kind === 'tour'; });
      var house = list.filter(function (x) { return x.kind === 'house' && /^(image|video|youtube)$/.test(x.media_kind); });
      var adl = set.show_ads === false ? [] : adSlides();
      var hero = kit && kit.block ? kit.block('hero') : null;
      var autoOn = set.auto_departures !== false && !(hero && hero.content && hero.content.auto_departures === false);
      var auto = [];
      if (autoOn && kit && kit.loaded() && paid.length + feat.length + adl.length < 3) {
        var have = {};
        paid.concat(feat).forEach(function (x) { if (x.tour) have[String(x.tour.id)] = true; });
        auto = autoDepartures(have);
      }
      var world = set.auto_world === false ? null : autoWorld(house);
      var rest = adl.concat(feat, auto, world ? [world] : [], house);
      var max = Math.max(1, Math.min(16, Number(set.max_slides) || 10));
      live = paid.concat(rest.slice(0, Math.max(0, max - paid.length)));
      if (live.length) slides(live); else { lastSig = ''; if (shown !== 'cover') cover(); }
      announce();
    }
    function announce() { try { doc.dispatchEvent(new CustomEvent('ct:spotlight', { detail: { slides: live.slice(), settings: settings } })); } catch (e) {} }
    function paintAdLink() {
      var a = $('[data-q-ad]', root), t = $('[data-q-ad-t]', root); if (!a) return;
      var P = settings && settings.prices, sales = settings && settings.enabled !== false;
      a.hidden = !sales;
      if (t && P && P.day != null) t.textContent = 'Your tour here from ' + money(P.day) + ' a day';
    }

    cover();
    var c = kit && kit.sb();
    if (c) {
      c.rpc('tour_spotlight_feed').then(function (r) { feed = r && Array.isArray(r.data) ? r.data : []; fed = true; merge(); }, function () { feed = []; fed = true; merge(); });
      var COLS = 'prices,enabled,marquee_on,rotate_ms,max_slides,show_ads,auto_departures,auto_world';
      c.from('tour_spotlight_settings').select(COLS).limit(1).then(function (r) {
        if (r && r.error) return c.from('tour_spotlight_settings').select('prices,enabled').limit(1);
        return r;
      }).then(function (r) {
        settings = (r && r.data && r.data[0]) || {};
        if (sl && settings.rotate_ms) sl.rotate(settings.rotate_ms);
        paintAdLink(); merge();
      }, function () { settings = {}; merge(); });
      // Ads booked on the Marquee, from the same bundle the ad engine reads
      // (and the same three-minute cache).
      var cached = null;
      try { cached = JSON.parse(global.localStorage.getItem('cads:v4:tours') || 'null'); } catch (e) {}
      if (cached && cached.data && Date.now() - cached.at < 180000) { ads = cached.data; }
      else c.rpc('ads_bundle', { p_page: 'tours' }).then(function (r) {
        if (r && r.data && typeof r.data === 'object') {
          ads = r.data;
          try { global.localStorage.setItem('cads:v4:tours', JSON.stringify({ at: Date.now(), data: r.data })); } catch (e) {}
          merge();
        }
      }, function () {});
    } else { feed = []; fed = true; merge(); }
    if (kit) {
      kit.on('data', function () { if (fed) merge(); });
      kit.on('page', function () { if (shown === 'cover') cover(); else if (fed) merge(); });
    }
    doc.addEventListener('cim:state', function () { if (fed) merge(); });
    var mq = global.matchMedia && global.matchMedia(PHONE);
    if (mq && mq.addEventListener) mq.addEventListener('change', function () { if (fed) merge(); });
  }

  // CabanaMarquee is the same thing under a name no other Cabana script
  // uses (the ambassador dashboards have their own CabanaSpotlight).
  global.CabanaMarquee = global.CabanaSpotlight = { create: create, cover: coverHTML, headline: headlineHTML, live: function () { return live.slice(); } };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})(window);
