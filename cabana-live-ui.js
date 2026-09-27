/* ═══════════════════════════════════════════════════════════════════
   CABANA LIVE · UI kit
   ───────────────────────────────────────────────────────────────────
   The pieces every tab is built from:

     chrome      the top bar, the tabs and the ink under the active one
     billboard   the hero: slides of images, films or YouTube clips with
                 their own copy, a progress rail, swipe and keys
     rows        horizontal rails with arrows that appear on hover
     cards       event, poster, wide, top-10, track, playlist, artist
     premium     the gold band that carries "Enjoy one month free"

   Nothing here fetches. Views hand it data; it hands back markup and
   small controllers with a destroy().
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var L = global.CabanaLive;
  if (!L) return;
  var u = L.u, esc = u.esc, ic = L.ic, doc = global.document;
  var UI = L.ui = {};

  /* ── the top bar ────────────────────────────────────────────────── */

  var TABS = [
    { k: 'home', label: 'Home' },
    { k: 'events', label: 'Events' },
    { k: 'live', label: 'Live', dot: true },
    { k: 'movies', label: 'Movies' },
    { k: 'shows', label: 'Shows' },
    { k: 'music', label: 'Music' }
  ];

  UI.chrome = function () {
    var top = u.qs('#lv-top');
    if (!top) return;
    top.innerHTML =
      '<a class="lv-back" href="/dashboard?role=guest&back=1" aria-label="Back to Cabana" rel="external">' + ic('back') + '</a>' +
      '<a class="lv-logo" href="' + L.BASE + '" aria-label="Cabana Live home">' +
        '<img src="/cabana-emblem.png" alt="" width="30" height="30"/>' +
        '<span class="lv-logo-w">CABANA <b>LIVE</b><i class="lv-logo-dot" aria-hidden="true"></i></span></a>' +
      '<nav class="lv-tabs" id="lv-tabs" aria-label="Cabana Live sections">' +
        TABS.map(function (t) {
          return '<a class="lv-tab" data-tab="' + t.k + '" href="' + L.href.tab(t.k) + '">' +
            (t.dot ? '<i class="lv-tab-live" hidden></i>' : '') + t.label + '</a>';
        }).join('') +
        '<span class="lv-tabs-ink" aria-hidden="true"></span>' +
      '</nav>' +
      '<div class="lv-top-r">' +
        '<a class="lv-ico" href="' + L.BASE + '/search" aria-label="Search Cabana Live" data-tip="Search">' + ic('search') + '</a>' +
        '<a class="lv-ico" href="' + L.BASE + '/my-list" aria-label="My List: everything you saved" data-tip="My List" id="lv-mylist">' + ic('heart') + '<span class="lv-badge-n" hidden></span></a>' +
        '<button class="lv-prem-chip" type="button" id="lv-prem-chip" data-act="premium">' + ic('crown') + '<span>1 month free</span></button>' +
        '<span id="lv-acct"></span>' +
      '</div>';

    var solid = false;
    function onScroll() {
      var s = (global.scrollY || 0) > 24;
      if (s !== solid) { solid = s; top.classList.toggle('is-solid', s); }
    }
    global.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    global.addEventListener('resize', u.debounce(ink, 120));
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(ink);

    L.on('route', function (r) {
      u.qsa('.lv-tab', top).forEach(function (a) {
        var on = a.getAttribute('data-tab') === r.tab && !r.meta.detail;
        if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
        if (a.getAttribute('data-tab') === r.tab) a.classList.add('is-tab'); else a.classList.remove('is-tab');
      });
      ink();
      var cur = u.qs('.lv-tab.is-tab', top);
      if (cur && cur.scrollIntoView && global.innerWidth < 1080) { try { cur.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); } catch (e) {} }
    });
    L.on('state', paintAccount);
    L.on('saves', paintSaves);
    L.on('data', function (k) { if (k === 'core') paintLiveDot(); });
    paintAccount();
  };

  function ink() {
    var bar = u.qs('#lv-tabs'); if (!bar) return;
    var line = u.qs('.lv-tabs-ink', bar), on = u.qs('.lv-tab.is-tab', bar);
    if (!line) return;
    if (!on) { line.style.opacity = '0'; return; }
    line.style.opacity = '1';
    line.style.left = (on.offsetLeft + 14) + 'px';
    line.style.width = Math.max(10, on.offsetWidth - 28) + 'px';
  }

  function paintLiveDot() {
    var dot = u.qs('.lv-tab-live');
    if (!dot) return;
    var any = L.data.titles.some(function (t) { return t.kind === 'live' && L.titleState(t) === 'live'; });
    dot.hidden = !any;
  }

  var savedCount = null;
  function paintSaves() {
    var n = L.saves.all().length, b = u.qs('#lv-mylist .lv-badge-n'), h = u.qs('#lv-mylist');
    if (!b) return;
    b.hidden = !n; b.textContent = n > 99 ? '99+' : String(n);
    /* The heart answers a save, so it is clear where saved things went. */
    if (savedCount !== null && n > savedCount && h) {
      h.classList.remove('is-pop'); void h.offsetWidth; h.classList.add('is-pop');
    }
    savedCount = n;
  }

  function paintAccount() {
    var chip = u.qs('#lv-prem-chip'), acct = u.qs('#lv-acct');
    var st = L.data.state || {}, s = L.session();
    if (chip) {
      if (st.premium) {
        chip.classList.add('is-on');
        chip.innerHTML = ic('crown') + '<span>Premium</span>';
        chip.setAttribute('aria-label', 'You have Cabana Live Premium');
      } else {
        chip.classList.remove('is-on');
        chip.innerHTML = ic('crown') + '<span>' + (st.trial_used ? 'Go Premium' : (st.trial_days || 30) === 30 ? '1 month free' : (st.trial_days || 30) + ' days free') + '</span>';
        chip.setAttribute('aria-label', 'Enjoy one month free access to Cabana Live Premium');
      }
    }
    if (acct) {
      if (s.status === 'user') {
        acct.innerHTML = '<a class="lv-avatar" href="/profile" rel="external" aria-label="Your account">' + esc((s.initial || (s.name || 'C').charAt(0) || 'C').toUpperCase()) + '</a>';
      } else {
        acct.innerHTML = '<a class="lv-signin" href="' + esc(L.signInUrl()) + '" rel="external">Sign in</a>';
      }
    }
  }
  UI.paintAccount = paintAccount;

  /* ── the brand sting ────────────────────────────────────────────── */

  UI.sting = function () {
    if (u.reduced() || L.store.sget('lv-sting')) return;
    if (/\/(music\/[A-Za-z0-9_-]{11}|watch\/)/.test(location.pathname)) return;
    L.store.sset('lv-sting', '1');
    var s = doc.createElement('div');
    s.className = 'lv-sting';
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = '<div class="lv-sting-mark"><img src="/cabana-emblem.png" alt=""/><span class="lv-sting-word">CABANA <b>LIVE</b></span></div><div class="lv-sting-bar"></div>';
    doc.body.appendChild(s);
    setTimeout(function () { s.classList.add('out'); setTimeout(function () { s.remove(); }, 650); }, 1250);
  };

  /* ── chips & bits ───────────────────────────────────────────────── */

  UI.chip = function (cls, text, icon) {
    return '<span class="lv-chip ' + (cls || '') + '">' + (icon ? ic(icon) : '') + esc(text) + '</span>';
  };
  UI.premChip = function (short) { return UI.chip('lv-chip-prem', short ? 'Premium' : 'Premium · 1 month free', 'crown'); };

  function palette(seed) {
    var P = [['#3b2a6b', '#6b1f4c'], ['#1f3b6b', '#1f6b5a'], ['#6b3b1f', '#6b1f2f'], ['#2a1f6b', '#1f556b'], ['#4c1f6b', '#6b4b1f'], ['#1f6b3a', '#1f2f6b']];
    var h = 0; seed = String(seed || '');
    for (var i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return P[h % P.length];
  }
  UI.ph = function (title, seed) {
    var p = palette(seed || title);
    return '<span class="lv-card-ph" style="--ph-a:' + p[0] + ';--ph-b:' + p[1] + '"><b>' + esc(title) + '</b></span>';
  };

  /* An <img> that never shows a broken frame: on error it removes itself
     and the placeholder underneath shows through. */
  UI.img = function (src, alt, cls, eager) {
    var s = u.safeUrl(src);
    if (!s) return '';
    return '<img src="' + esc(s) + '" alt="' + esc(alt || '') + '"' + (cls ? ' class="' + cls + '"' : '') +
      (eager ? ' fetchpriority="high"' : ' loading="lazy"') + ' decoding="async" onerror="this.remove()"/>';
  };

  /* YouTube's sharpest thumbnail, falling back when the video has none
     (YouTube answers a missing maxres with a 120px grey placeholder). */
  UI.ytImg = function (id, alt, cls, eager) {
    if (!u.ytId(id)) return '';
    return '<img src="' + u.ytThumb(id, 'maxresdefault') + '" alt="' + esc(alt || '') + '"' + (cls ? ' class="' + cls + '"' : '') +
      (eager ? ' fetchpriority="high"' : ' loading="lazy"') + ' decoding="async" data-yt="' + id + '"' +
      ' onload="if(this.naturalWidth<200){this.onload=null;this.src=\'' + u.ytThumb(id, 'hqdefault') + '\'}"' +
      ' onerror="this.onerror=null;this.src=\'' + u.ytThumb(id, 'hqdefault') + '\'"/>';
  };

  /* ── background YouTube frames ──────────────────────────────────
     A muted embed only fades in once YouTube says it is playing. A
     video whose owner blocks embedding answers with an error screen;
     that must never show through a billboard, so on error the frame is
     removed and the poster stays. The embed reports its state by
     postMessage once it is told someone is listening. */
  var ytWatched = [];
  global.addEventListener('message', function (e) {
    if (!/^https:\/\/www\.youtube(-nocookie)?\.com$/.test(e.origin || '')) return;
    var d;
    try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch (x) { return; }
    if (!d || !d.event) return;
    ytWatched = ytWatched.filter(function (w) { return doc.contains(w.el); });
    ytWatched.forEach(function (w) {
      if (w.el.contentWindow !== e.source) return;
      var st = d.event === 'onStateChange' ? d.info : d.info && d.info.playerState;
      if (d.event === 'onError' || (d.info && d.info.videoData && d.info.videoData.errorCode)) { w.fail(); return; }
      if (st === 1 && !w.done) { w.done = true; w.ok(); }
    });
  });
  UI.ytWatch = function (frame, ok, fail) {
    var w = { el: frame, ok: ok || function () { frame.classList.add('is-ready'); }, fail: fail || function () { frame.remove(); }, done: false };
    ytWatched.push(w);
    frame.addEventListener('load', function () {
      var n = 0;
      (function ping() {
        if (w.done || !doc.contains(frame) || n++ > 16) return;
        try { frame.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 'lv' + ytWatched.length, channel: 'widget' }), '*'); } catch (x) {}
        setTimeout(ping, 500);
      })();
    });
    return w;
  };

  /* ── cards ──────────────────────────────────────────────────────── */

  UI.card = {};

  UI.card.event = function (e) {
    var cover = e.cover_url || u.arr(e.photos)[0] || '';
    var t = L.timeTo(e.starts_at, e.ends_at);
    var dm = u.dayMonth(e.starts_at);
    var free = Number(e.price_from) === 0;
    var left = (e.capacity && e.tickets_sold != null) ? Math.max(0, e.capacity - e.tickets_sold) : null;
    var streams = L.data.titles.some(function (x) { return String(x.event_id) === String(e.id); });
    return '<a class="lv-card lv-ev" href="' + L.href.event(e) + '" data-heat="' + t.heat + '" data-id="' + esc(e.id) + '">' +
      '<span class="lv-card-art">' + UI.ph(e.title, e.id) + UI.img(cover, e.title) +
        '<span class="lv-card-shade"></span>' +
        '<span class="lv-card-tags">' +
          (t.live ? UI.chip('lv-chip-live', 'Live now') : '') +
          (e.featured ? UI.chip('lv-chip-new', 'Featured') : '') +
          (streams ? UI.chip('lv-chip-prem', 'Streams live', 'live') : '') +
        '</span>' +
        '<span class="lv-ev-date"><b>' + esc(dm.d) + '</b><small>' + esc(dm.m) + '</small></span>' +
        '<span class="lv-card-in">' +
          '<span class="lv-card-t">' + esc(e.title) + '</span>' +
          '<span class="lv-card-s">' + esc([e.venue, e.city].filter(Boolean).join(' · ') || 'Venue to be announced') + '</span>' +
          '<span class="lv-ev-price"><b class="' + (free ? 'free' : '') + '">' + (free ? 'Free entry' : 'From ' + esc(u.money(e.price_from, e.currency))) + '</b>' +
            (left != null && left > 0 && left <= 25 ? '<span class="lv-low">' + left + ' left</span>' :
             '<span class="lv-ev-cd" data-cd="' + esc(e.starts_at) + '" data-cd-end="' + esc(e.ends_at || '') + '"><i></i><span>' + esc(t.label) + '</span></span>') +
          '</span>' +
        '</span>' +
      '</span></a>';
  };

  function titleMeta(t) {
    var bits = [];
    if (t.year) bits.push(String(t.year));
    if (t.maturity) bits.push('<span class="lv-rating">' + esc(t.maturity) + '</span>');
    if (t.kind === 'movie' && t.runtime_min) bits.push(esc(u.runtime(t.runtime_min)));
    if (t.kind === 'show') bits.push('Series');
    if (t.kind === 'live') bits.push('Live');
    if (t.genres && t.genres[0]) bits.push(esc(t.genres.slice(0, 2).join(' · ')));
    return bits.join(' · ');
  }
  UI.titleMeta = titleMeta;

  function titleChips(t, max) {
    var st = L.titleState(t), out = [];
    if (st === 'live') out.push(UI.chip('lv-chip-live', 'Live'));
    else if (st === 'upcoming') out.push(UI.chip('lv-chip-soon', 'Upcoming'));
    else if (st === 'soon') out.push(UI.chip('lv-chip-soon', 'Coming soon'));
    else if (L.isNew(t)) out.push(UI.chip('lv-chip-new', 'New'));
    if (t.badge) out.push(UI.chip('lv-chip-orig', t.badge));
    if (t.access === 'premium') out.push(UI.chip('lv-chip-prem', 'Premium', 'crown'));
    else out.push(UI.chip('lv-chip-free', 'Free'));
    return out.slice(0, max || 3).join('');
  }
  UI.titleChips = titleChips;

  UI.card.poster = function (t) {
    var saved = L.saves.has('title', t.id);
    return '<div class="lv-card lv-poster" data-id="' + esc(t.id) + '">' +
      '<span class="lv-card-art">' + UI.ph(t.title, t.id) + UI.img(t.poster_url || t.backdrop_url, t.title) +
        '<span class="lv-card-tags">' + titleChips(t, 2) + '</span>' +
        '<span class="lv-poster-pop">' +
          '<span class="acts">' +
            '<button class="lv-round lv-round-sm is-on" type="button" data-act="play" data-id="' + esc(t.id) + '" aria-label="Play ' + esc(t.title) + '">' + ic('play') + '</button>' +
            '<button class="lv-round lv-round-sm' + (saved ? ' is-on' : '') + '" type="button" data-act="save" data-kind="title" data-ref="' + esc(t.id) + '" aria-label="' + (saved ? 'Remove from' : 'Add to') + ' My List">' + ic(saved ? 'check' : 'plus', 2.4) + '</button>' +
          '</span>' +
          '<span class="meta">' + titleMeta(t) + '</span>' +
        '</span>' +
      '</span>' +
      '<a class="lv-card-link" href="' + L.href.title(t) + '" aria-label="' + esc(t.title) + '"></a>' +
    '</div>';
  };

  UI.card.wideTitle = function (t) {
    var st = L.titleState(t);
    var sub = st === 'live' ? 'Live now' : st === 'upcoming' ? u.when(t.live_starts_at) : st === 'soon' ? 'Coming ' + u.when(t.release_at).split(' · ')[0] : (t.tagline || titleMeta(t).replace(/<[^>]+>/g, ''));
    var prog = 0;
    if (st === 'live') {
      var s = Date.parse(t.live_starts_at), e = t.live_ends_at ? Date.parse(t.live_ends_at) : s + 4 * L.HOUR;
      prog = Math.max(2, Math.min(100, (Date.now() - s) / (e - s) * 100));
    }
    return '<a class="lv-card lv-wide" href="' + L.href.title(t) + '" data-id="' + esc(t.id) + '">' +
      '<span class="lv-card-art">' + UI.ph(t.title, t.id) + UI.img(t.backdrop_url || t.poster_url, t.title) +
        '<span class="lv-card-shade"></span>' +
        '<span class="lv-card-tags">' + titleChips(t, 2) + '</span>' +
        '<span class="lv-card-in"><span class="lv-card-t">' + esc(t.title) + '</span><span class="lv-card-s">' + esc(sub) + '</span></span>' +
        (st === 'upcoming' ? '<span class="lv-card-play" style="opacity:1;transform:none;width:auto;padding:0 12px;border-radius:99px;font-size:11px;font-weight:800;font-family:var(--f-mono)" data-cd="' + esc(t.live_starts_at) + '"><span>' + esc(L.timeTo(t.live_starts_at).label) + '</span></span>' : '<span class="lv-card-play">' + ic('play') + '</span>') +
        (st === 'live' ? '<span class="lv-live-bar"><i style="width:' + prog.toFixed(1) + '%"></i></span>' : '') +
      '</span></a>';
  };

  UI.card.track = function (t, opts) {
    var playing = L.music && L.music.current() === t.videoId;
    return '<button class="lv-card lv-wide lv-trackcard' + (playing ? ' is-playing' : '') + '" type="button" data-act="track" data-vid="' + esc(t.videoId) + '" data-queue="' + esc((opts && opts.queue) || '') + '" aria-label="Play ' + esc(u.songOf(t)) + ' by ' + esc(u.artistOf(t)) + '">' +
      '<span class="lv-card-art">' + UI.ytImg(t.videoId, '') +
        '<span class="lv-card-shade"></span>' +
        '<span class="lv-card-tags">' + ((opts && opts.tag) ? UI.chip('', opts.tag) : '') + '</span>' +
        '<span class="lv-card-in"><span class="lv-card-t">' + esc(u.songOf(t)) + '</span><span class="lv-card-s">' + esc(u.artistOf(t)) +
          (t.views ? ' · ' + u.compact(t.views) + ' plays' : '') + '</span></span>' +
        '<span class="lv-card-play">' + (playing ? '<span class="lv-eq"><i></i><i></i><i></i><i></i></span>' : ic('play')) + '</span>' +
      '</span></button>';
  };

  UI.card.top10 = function (t, i, queue) {
    var n = i + 1;
    var playing = L.music && L.music.current() === t.videoId;
    return '<div class="lv-t10' + (n === 10 ? ' n10' : '') + '">' +
      '<span class="lv-t10-n" aria-hidden="true">' + n + '</span>' +
      '<button class="lv-card' + (playing ? ' is-playing' : '') + '" type="button" data-act="track" data-vid="' + esc(t.videoId) + '" data-queue="' + esc(queue || 'chart') + '" aria-label="Number ' + n + ': ' + esc(u.songOf(t)) + ' by ' + esc(u.artistOf(t)) + '">' +
        '<span class="lv-card-art"><img src="' + u.ytThumb(t.videoId, 'hqdefault') + '" alt="" loading="lazy" decoding="async" style="transform:scale(1.34)"/>' +
          '<span class="lv-card-shade"></span>' +
          '<span class="lv-card-in"><span class="lv-card-t">' + esc(u.songOf(t)) + '</span><span class="lv-card-s">' + esc(u.artistOf(t)) + '</span></span>' +
          '<span class="lv-card-play">' + (playing ? '<span class="lv-eq"><i></i><i></i><i></i><i></i></span>' : ic('play')) + '</span>' +
        '</span></button></div>';
  };

  UI.card.playlist = function (p) {
    var art = u.safeUrl(p.cover_url)
      ? UI.img(p.cover_url, '')
      : '<span class="lv-sq-mosaic">' + p.items.slice(0, 4).map(function (it) { return '<img src="' + u.ytThumb(it.videoId, 'hqdefault') + '" alt="" loading="lazy" decoding="async" style="transform:scale(1.34)"/>'; }).join('') + '</span>';
    return '<a class="lv-card lv-sq" href="' + L.href.playlist(p) + '" style="--pl:' + esc(p.accent || '#8B5CFF') + '">' +
      '<span class="lv-card-art">' + art + '<span class="lv-sq-tint"></span>' +
        '<span class="lv-card-tags">' + (p.mood ? UI.chip('', p.mood) : '') + '</span>' +
        '<span class="lv-sq-t">' + esc(p.title) + '</span></span>' +
      '<span class="lv-card-below"><span class="lv-card-s">' + p.items.length + ' tracks' + (p.description ? ' · ' + esc(p.description) : '') + '</span></span></a>';
  };

  UI.card.artist = function (a) {
    var name = u.artistOf({ artist: a.name });
    return '<button class="lv-card lv-artist" type="button" data-act="track" data-vid="' + esc(a.leadVideoId || '') + '" data-queue="artist:' + esc(a.name) + '" aria-label="Play ' + esc(name) + '"' + (a.leadVideoId ? '' : ' disabled') + '>' +
      '<span class="lv-card-art">' + (a.leadVideoId ? '<img src="' + u.ytThumb(a.leadVideoId, 'hqdefault') + '" alt="" loading="lazy" decoding="async" style="transform:scale(1.8)"/>' : UI.ph(name.charAt(0), name)) + '</span>' +
      '<span class="lv-artist-r">' + a.rank + '</span>' +
      '<span class="lv-card-below"><span class="lv-card-t">' + esc(name) + '</span><span class="lv-card-s">' + (a.tracks || 1) + ' on the chart</span></span></button>';
  };

  /* ── rows ───────────────────────────────────────────────────────── */

  UI.row = function (o) {
    if (!o.items || !o.items.length) return '';
    return '<section class="lv-row' + (o.cls ? ' ' + o.cls : '') + '"' + (o.id ? ' id="' + o.id + '"' : '') + '>' +
      '<div class="lv-row-h"><div><h2 class="lv-row-t">' + o.title + '</h2>' + (o.sub ? '<p class="lv-row-s">' + o.sub + '</p>' : '') + '</div>' +
        (o.all ? '<a class="lv-row-all" href="' + o.all + '">See all' + ic('chevR', 2.4) + '</a>' : '') + '</div>' +
      '<div class="lv-rail' + (o.railCls ? ' ' + o.railCls : '') + '" style="--col:' + (o.col || '230px') + '">' + o.items.map(o.render).join('') + '</div>' +
      '<button class="lv-rail-nav prev" type="button" aria-label="Scroll left" hidden>' + ic('chevL', 2.4) + '</button>' +
      '<button class="lv-rail-nav next" type="button" aria-label="Scroll right" hidden>' + ic('chevR', 2.4) + '</button>' +
    '</section>';
  };

  UI.wireRails = function (root) {
    u.qsa('.lv-row', root).forEach(function (row) {
      var rail = u.qs('.lv-rail', row), prev = u.qs('.lv-rail-nav.prev', row), next = u.qs('.lv-rail-nav.next', row);
      if (!rail || !prev || rail._wired) return;
      rail._wired = true;
      function paint() {
        var max = rail.scrollWidth - rail.clientWidth - 4;
        prev.hidden = rail.scrollLeft <= 4;
        next.hidden = rail.scrollLeft >= max;
      }
      prev.addEventListener('click', function () { rail.scrollBy({ left: -rail.clientWidth * .85, behavior: 'smooth' }); });
      next.addEventListener('click', function () { rail.scrollBy({ left: rail.clientWidth * .85, behavior: 'smooth' }); });
      rail.addEventListener('scroll', u.debounce(paint, 60), { passive: true });
      paint();
      setTimeout(paint, 400);
    });
  };

  /* ── the premium band ───────────────────────────────────────────── */

  UI.premium = function () {
    var st = L.data.state || {};
    var days = st.trial_days || 30;
    var name = st.premium_name || 'Cabana Live Premium';
    if (st.premium) {
      var until = st.pass_expires_at ? new Date(st.pass_expires_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'long' }) : '';
      return '<section class="lv-prem is-on" aria-label="' + esc(name) + '">' +
        '<div class="lv-prem-mono">' + ic('crown') + '</div>' +
        '<div><div class="lv-prem-k">' + esc(name) + '</div>' +
          '<h2 class="lv-prem-h">You are <em>in.</em></h2>' +
          '<p class="lv-prem-p">' + (st.open_to_all ? 'Everything on Cabana Live is open to everyone right now.' :
            'Every live show, film, series and concert is yours' + (until ? ' until ' + esc(until) : '') + '.' + (st.pass_source === 'trial' ? ' This is your free month.' : '')) + '</p></div>' +
        '<div class="lv-prem-cta"><a class="lv-btn lv-btn-ghost lv-btn-sm" href="' + L.href.tab('live') + '">Watch live' + ic('arrowR') + '</a></div>' +
      '</section>';
    }
    var used = !!st.trial_used;
    return '<section class="lv-prem" aria-label="' + esc(name) + '">' +
      '<div class="lv-prem-mono">' + ic('crown') + '</div>' +
      '<div><div class="lv-prem-k">' + esc(name) + '</div>' +
        '<h2 class="lv-prem-h">' + (used ? 'Keep the <em>show going</em>' : esc(st.banner_title || 'Enjoy one month free access').replace(/(one month free|free)/i, '<em>$1</em>')) + '</h2>' +
        '<p class="lv-prem-p">' + esc(st.banner_text || 'Live shows, movies, series and concerts on Cabana. Your first month is on us, no card needed.') + '</p>' +
        '<ul class="lv-prem-list"><li>' + ic('check', 2.6) + 'Live concerts and shows</li><li>' + ic('check', 2.6) + 'Movies and series</li><li>' + ic('check', 2.6) + 'Replays and specials</li><li>' + ic('check', 2.6) + 'Watch on any screen</li></ul></div>' +
      '<div class="lv-prem-cta"><button class="lv-btn lv-btn-gold" type="button" data-act="premium">' + ic('crown') + (used ? 'See Premium' : 'Start ' + days + ' days free') + '</button>' +
        '<small>' + (st.price_kes ? 'Then ' + esc(u.money(st.price_kes)) + ' / ' + esc(st.price_period || 'month') : 'No card needed · plans announced soon') + '</small></div>' +
    '</section>';
  };

  /* ── the billboard ──────────────────────────────────────────────── */

  /* slide = { key, title, logo, chips[], meta[], sub, media{kind,src,mobile,poster,pos},
               accent, countdown, acts[], avail, rating, label } */
  UI.billboard = function (host, slides, opts) {
    opts = opts || {};
    if (!host || !slides || !slides.length) return { destroy: function () {} };
    var DUR = 8000;
    var idx = 0, timer = null, paused = false, hidden = false, offscreen = false, destroyed = false;
    var mobile = global.innerWidth < 760;

    host.className = 'lv-bb' + (opts.short ? ' is-short' : '');
    host.setAttribute('role', 'region');
    host.setAttribute('aria-roledescription', 'carousel');
    host.setAttribute('aria-label', opts.label || 'Featured on Cabana Live');
    host.innerHTML = slides.map(slideHTML).join('') +
      (slides.length > 1 ? '<button class="lv-bb-arrow prev" type="button" aria-label="Previous">' + ic('chevL', 2.4) + '</button>' +
        '<button class="lv-bb-arrow next" type="button" aria-label="Next">' + ic('chevR', 2.4) + '</button>' +
        '<div class="lv-bb-dots" role="tablist">' + slides.map(function (s, i) {
          return '<button class="lv-bb-dot" type="button" role="tab" data-i="' + i + '" aria-label="Show ' + esc(s.label || s.title || 'slide ' + (i + 1)) + '"><span>' + esc(s.label || s.title || '') + '</span><i></i></button>';
        }).join('') + '</div>' : '') +
      '<div class="lv-bb-ctrl"><button class="lv-round lv-round-sm" type="button" data-bb-mute hidden aria-label="Turn sound on">' + ic('mute') + '</button>' +
        '<span class="lv-bb-rating" data-bb-rating hidden></span></div>';

    var els = u.qsa('.lv-bb-slide', host), dots = u.qsa('.lv-bb-dot', host);
    var muteBtn = u.qs('[data-bb-mute]', host), ratingEl = u.qs('[data-bb-rating]', host);
    var muted = true;

    function slideHTML(s, i) {
      var m = s.media || {};
      var words = String(s.title || '').split(/\s+/).filter(Boolean);
      var titleHTML = s.logo
        ? '<img class="lv-bb-logo" src="' + esc(s.logo) + '" alt="' + esc(s.title) + '"' + (i === 0 ? ' fetchpriority="high"' : ' loading="lazy"') + ' decoding="async"/>'
        : '<h' + (i === 0 && opts.h1 ? '1' : '2') + ' class="lv-bb-title' + (String(s.title || '').length > 30 ? ' is-long is-xlong' : String(s.title || '').length > 15 ? ' is-long' : '') + '">' +
            words.map(function (w, j) { return '<span class="w"><span style="--i:' + j + '">' + esc(w) + '</span></span>'; }).join(' ') +
          '</h' + (i === 0 && opts.h1 ? '1' : '2') + '>';
      return '<div class="lv-bb-slide' + (i === 0 ? ' is-on' : '') + '" data-i="' + i + '" role="group" aria-roledescription="slide" aria-label="' + (i + 1) + ' of ' + slides.length + '"' +
        ' style="' + (s.accent ? '--bb-accent:' + esc(s.accent) + ';' : '') + (m.pos ? '--bb-pos:' + esc(m.pos) + ';' : '') + '">' +
        '<div class="lv-bb-media"' + (m.bg ? ' style="background:' + m.bg + '"' : '') + '>' + mediaHTML(m, i) + '</div>' +
        '<div class="lv-bb-scrim"></div><div class="lv-bb-glow"></div>' +
        '<div class="lv-bb-copy">' +
          (s.chips && s.chips.length ? '<div class="lv-bb-chips">' + s.chips.join('') + '</div>' : '') +
          titleHTML +
          (s.countdown ? '<div class="lv-bb-clock" data-bb-clock="' + esc(s.countdown) + '" aria-label="Countdown">' +
            ['Days', 'Hrs', 'Min', 'Sec'].map(function (l) { return '<div><b>--</b><small>' + l + '</small></div>'; }).join('') + '</div>' : '') +
          (s.meta && s.meta.length ? '<div class="lv-bb-meta">' + s.meta.map(function (x) {
            return '<span' + (x.hot ? ' class="hot"' : '') + '>' + (x.icon ? ic(x.icon) : '') + x.html + '</span>';
          }).join('') + '</div>' : '') +
          (s.sub ? '<p class="lv-bb-sub">' + esc(s.sub) + '</p>' : '') +
          (s.acts && s.acts.length ? '<div class="lv-bb-acts">' + s.acts.map(actHTML).join('') + '</div>' : '') +
          (s.avail ? '<div class="lv-bb-avail">' + s.avail + '</div>' : '') +
        '</div></div>';
    }

    function mediaHTML(m, i) {
      if (m.kind === 'art') return m.html || '';
      var poster = m.poster || (m.kind === 'youtube' && u.ytId(m.src) ? u.ytThumb(m.src, 'maxresdefault') : m.kind === 'image' ? (mobile && m.mobile ? m.mobile : m.src) : '');
      var img = '';
      if (m.kind === 'youtube' && u.ytId(m.src)) img = UI.ytImg(m.src, '', 'kb', i === 0);
      else if (poster) img = '<img class="kb" src="' + esc(poster) + '" alt=""' + (i === 0 ? ' fetchpriority="high"' : ' loading="lazy"') + ' decoding="async" onerror="this.remove()"/>';
      return img;
    }

    function actHTML(a) {
      var cls = 'lv-btn ' + (a.cls || '');
      var inner = (a.icon ? ic(a.icon, a.icon === 'plus' || a.icon === 'check' ? 2.6 : 2) : '') + esc(a.label || '');
      var data = '';
      Object.keys(a.data || {}).forEach(function (k) { data += ' data-' + k + '="' + esc(a.data[k]) + '"'; });
      if (a.round) return '<button class="lv-round" type="button"' + data + ' aria-label="' + esc(a.label) + '">' + ic(a.icon, 2.4) + '</button>';
      if (a.href) return '<a class="' + cls + '" href="' + esc(a.href) + '"' + data + (a.external ? ' target="_blank" rel="noopener external"' : '') + '>' + inner + '</a>';
      return '<button class="' + cls + '" type="button"' + data + '>' + inner + '</button>';
    }

    /* Moving media only on the slide that is showing, only when the
       guest can see it, and never on a data-saver connection. Sound only
       after a tap. */
    function mount(i) {
      var s = slides[i], m = s.media || {}, box = u.qs('.lv-bb-media', els[i]);
      if (!box || u.reduced() || u.saveData()) return;
      if (m.kind === 'video' && m.src) {
        if (u.qs('video', box)) { var v0 = u.qs('video', box); try { v0.currentTime = 0; v0.play(); } catch (e) {} return; }
        var v = doc.createElement('video');
        v.src = (mobile && m.mobile) ? m.mobile : m.src;
        v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('muted', '');
        v.preload = 'auto';
        v.addEventListener('playing', function () { v.classList.add('is-ready'); });
        box.appendChild(v);
        var p = v.play(); if (p && p.catch) p.catch(function () {});
        muteBtn.hidden = false;
      } else if (m.kind === 'youtube' && u.ytId(m.src) && !mobile) {
        clearTimeout(box._yt);
        box._yt = setTimeout(function () {
          if (destroyed || idx !== i || u.qs('iframe', box)) return;
          var f = doc.createElement('iframe');
          f.className = 'lv-yt-bg';
          f.title = '';
          f.setAttribute('aria-hidden', 'true');
          f.setAttribute('tabindex', '-1');
          f.allow = 'autoplay; encrypted-media';
          f.src = 'https://www.youtube-nocookie.com/embed/' + m.src + '?autoplay=1&mute=1&controls=0&loop=1&playlist=' + m.src +
            '&playsinline=1&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&fs=0&enablejsapi=1' + (m.start ? '&start=' + Number(m.start) : '');
          UI.ytWatch(f, function () { setTimeout(function () { f.classList.add('is-ready'); if (idx === i) muteBtn.hidden = false; }, 350); }, function () { f.remove(); muteBtn.hidden = true; });
          box.appendChild(f);
        }, 1400);
      }
    }
    function unmount(i) {
      var box = u.qs('.lv-bb-media', els[i]);
      if (!box) return;
      clearTimeout(box._yt);
      var f = u.qs('iframe', box); if (f) f.remove();
      var v = u.qs('video', box); if (v) { try { v.pause(); } catch (e) {} }
    }
    function setSound(on) {
      muted = !on;
      var box = u.qs('.lv-bb-media', els[idx]);
      var v = box && u.qs('video', box), f = box && u.qs('iframe', box);
      if (v) v.muted = muted;
      if (f && f.contentWindow) {
        try { f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: muted ? 'mute' : 'unMute', args: [] }), '*'); } catch (e) {}
      }
      if (on && L.music && L.music.isPlaying()) L.music.pause();
      muteBtn.innerHTML = ic(muted ? 'mute' : 'volume');
      muteBtn.setAttribute('aria-label', muted ? 'Turn sound on' : 'Turn sound off');
    }

    function show(i, user) {
      if (destroyed) return;
      i = (i + slides.length) % slides.length;
      if (i === idx && !user) return;
      var was = idx;
      els[was].classList.remove('is-on');
      unmount(was);
      idx = i;
      els[i].classList.add('is-on');
      dots.forEach(function (d, j) {
        d.classList.toggle('is-on', j === i);
        d.classList.toggle('is-done', j < i);
        d.setAttribute('aria-selected', j === i ? 'true' : 'false');
        if (j === i) { var bar = u.qs('i', d); bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; }
      });
      muteBtn.hidden = true;
      if (!muted) setSound(false);
      paintRating();
      mount(i);
      schedule();
    }
    function paintRating() {
      var r = slides[idx].rating;
      ratingEl.hidden = !r;
      if (r) ratingEl.textContent = r;
    }
    function dur() { var s = slides[idx]; return s.dur || ((s.media && (s.media.kind === 'video' || s.media.kind === 'youtube')) ? 16000 : DUR); }
    function schedule() {
      clearTimeout(timer);
      if (slides.length < 2) return;
      host.style.setProperty('--bb-dur', dur() + 'ms');
      if (paused || hidden || offscreen) { host.classList.add('is-paused'); return; }
      host.classList.remove('is-paused');
      var started = Date.now(), remaining = host._remaining && host._remaining.i === idx ? host._remaining.ms : dur();
      host._remaining = null;
      host._started = started; host._left = remaining;
      timer = setTimeout(function () { show(idx + 1); }, remaining);
    }
    function hold(on) {
      if (on === paused) return;
      paused = on;
      if (on && host._started) host._remaining = { i: idx, ms: Math.max(600, host._left - (Date.now() - host._started)) };
      schedule();
    }

    host.addEventListener('click', function (e) {
      var d = e.target.closest('.lv-bb-dot'); if (d) { show(+d.getAttribute('data-i'), true); return; }
      if (e.target.closest('.lv-bb-arrow.prev')) { show(idx - 1, true); return; }
      if (e.target.closest('.lv-bb-arrow.next')) { show(idx + 1, true); return; }
      if (e.target.closest('[data-bb-mute]')) setSound(muted);
    });
    if (u.hover()) {
      host.addEventListener('mouseenter', function () { hold(true); });
      host.addEventListener('mouseleave', function () { hold(false); });
    }
    host.addEventListener('focusin', function () { hold(true); });
    host.addEventListener('focusout', function (e) { if (!host.contains(e.relatedTarget)) hold(false); });
    host.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { show(idx + 1, true); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { show(idx - 1, true); e.preventDefault(); }
    });

    /* Swipe. Horizontal intent only, so vertical page scroll is never
       stolen on a phone. */
    var sx = 0, sy = 0, swiping = false;
    host.addEventListener('touchstart', function (e) { var t = e.touches[0]; sx = t.clientX; sy = t.clientY; swiping = true; }, { passive: true });
    host.addEventListener('touchend', function (e) {
      if (!swiping) return; swiping = false;
      var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) show(idx + (dx < 0 ? 1 : -1), true);
    }, { passive: true });

    function onVis() { hidden = doc.hidden; schedule(); }
    doc.addEventListener('visibilitychange', onVis);
    var io = null;
    if (global.IntersectionObserver) {
      io = new IntersectionObserver(function (en) {
        offscreen = !en[0].isIntersecting;
        if (offscreen) unmount(idx); else mount(idx);
        schedule();
      }, { threshold: .2 });
      io.observe(host);
    }
    var offModal = L.on('overlay', function (open) { hold(!!open); if (open) unmount(idx); else mount(idx); });

    /* Countdown clocks on slides. */
    function tickClocks() {
      u.qsa('[data-bb-clock]', host).forEach(function (c) {
        var t = L.timeTo(c.getAttribute('data-bb-clock'));
        var b = u.qsa('b', c);
        if (t.live) { c.innerHTML = '<div style="min-width:auto;padding:8px 14px"><b style="color:var(--lv-live)">LIVE NOW</b></div>'; return; }
        if (t.over || !b.length) return;
        var v = [String(t.d), u.pad(t.h), u.pad(t.m), u.pad(t.s)];
        b.forEach(function (x, i) { if (x.textContent !== v[i]) x.textContent = v[i]; });
      });
    }
    var clockT = u.qs('[data-bb-clock]', host) ? setInterval(tickClocks, 1000) : null;
    tickClocks();

    dots.length && dots[0].classList.add('is-on');
    paintRating();
    mount(0);
    schedule();

    return {
      destroy: function () {
        destroyed = true;
        clearTimeout(timer); if (clockT) clearInterval(clockT);
        doc.removeEventListener('visibilitychange', onVis);
        if (io) io.disconnect();
        offModal();
        els.forEach(function (_, i) { unmount(i); });
      },
      pause: function () { hold(true); },
      resume: function () { hold(false); }
    };
  };

  /* ── one ticker for every countdown on the page ─────────────────── */

  var tickT = null;
  UI.startTicker = function () {
    if (tickT) return;
    tickT = setInterval(function () {
      u.qsa('[data-cd]').forEach(function (n) {
        var t = L.timeTo(n.getAttribute('data-cd'), n.getAttribute('data-cd-end') || null);
        var out = n.querySelector('span') || n;
        if (out.textContent !== t.label) out.textContent = t.label;
        var card = n.closest('.lv-ev');
        if (card && card.getAttribute('data-heat') !== t.heat) card.setAttribute('data-heat', t.heat);
      });
      u.qsa('[data-clock]').forEach(function (c) {
        var t = L.timeTo(c.getAttribute('data-clock'), c.getAttribute('data-clock-end') || null);
        if (t.live || t.over) {
          if (!c.classList.contains('is-live')) { c.classList.add('is-live'); c.innerHTML = '<div><b>' + (t.live ? 'Happening now' : 'Finished') + '</b></div>'; }
          return;
        }
        var b = u.qsa('b', c), v = [String(t.d), u.pad(t.h), u.pad(t.m), u.pad(t.s)];
        b.forEach(function (x, i) { if (x.textContent !== v[i]) x.textContent = v[i]; });
      });
    }, 1000);
  };

  UI.clock = function (iso, endIso) {
    return '<div class="lv-clock-big" data-clock="' + esc(iso) + '" data-clock-end="' + esc(endIso || '') + '">' +
      ['Days', 'Hours', 'Min', 'Sec'].map(function (l) { return '<div><b>--</b><small>' + l + '</small></div>'; }).join('') + '</div>';
  };

  /* ── empty states ───────────────────────────────────────────────── */

  UI.empty = function (icon, title, text, acts) {
    return '<div class="lv-empty"><div class="lv-empty-ic">' + ic(icon) + '</div><h3>' + esc(title) + '</h3><p>' + text + '</p>' +
      (acts ? '<div class="acts">' + acts + '</div>' : '') + '</div>';
  };

  UI.soonGrid = function () {
    return '<section class="lv-row"><div class="lv-row-h"><div><h2 class="lv-row-t">Coming to Cabana Live ' + UI.chip('lv-chip-prem', '1 month free', 'crown') + '</h2>' +
      '<p class="lv-row-s">Live concerts, films and series are being added now. Your free month opens all of it.</p></div></div>' +
      '<div class="lv-soon-grid">' +
        '<a class="lv-soon" href="' + L.href.tab('live') + '" style="--sa:#FF3355;--sb:#FF8A3D"><span class="lv-soon-ic">' + ic('live') + '</span>' + UI.chip('lv-chip-live', 'Live') + '<h3>Live shows</h3><p>Concerts, comedy and big nights, streamed as they happen. Replays when you miss them.</p></a>' +
        '<a class="lv-soon" href="' + L.href.tab('movies') + '" style="--sa:#FFB23F;--sb:#FF5E3A"><span class="lv-soon-ic">' + ic('film') + '</span>' + UI.chip('lv-chip-orig', 'Movies') + '<h3>Movies</h3><p>African cinema and the films everyone is talking about, in one place.</p></a>' +
        '<a class="lv-soon" href="' + L.href.tab('shows') + '" style="--sa:#33E1FF;--sb:#8B5CFF"><span class="lv-soon-ic">' + ic('tv') + '</span>' + UI.chip('lv-chip-orig', 'Series') + '<h3>Shows</h3><p>Series worth a whole weekend, with new episodes as they land.</p></a>' +
      '</div></section>';
  };

  UI.invite = function () {
    return '<section class="lv-invite ev-invite">' +
      '<div><h2>Putting something on? Put it on Cabana.</h2>' +
        '<p>Promoters, venues, schools, companies and community groups all list here on the same terms. Set your price and keep every shilling of it.</p>' +
        '<a class="lv-btn lv-btn-accent" href="/list-your-event" rel="external">' + ic('plus', 2.6) + 'List an event</a></div>' +
      '<ul><li>' + ic('check', 2.6) + 'Cabana takes no cut of your face value</li><li>' + ic('check', 2.6) + 'Your own tiers, capacity and age limits</li>' +
        '<li>' + ic('check', 2.6) + 'Guests pay by M-Pesa and card, codes checked at the door</li><li>' + ic('check', 2.6) + 'Stream it live to Cabana Premium members</li></ul>' +
    '</section>';
  };
})(window);
