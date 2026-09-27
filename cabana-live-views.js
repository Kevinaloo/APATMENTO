/* ═══════════════════════════════════════════════════════════════════
   CABANA LIVE · views
   ───────────────────────────────────────────────────────────────────
   Home, Events, Live, Movies, Shows, one event, one title, My List and
   search. The music room lives in cabana-live-music.js.

   Every tab opens on a billboard. What goes on it is decided in the
   console (live_billboard). When the console has nothing scheduled for
   a tab, the billboard builds itself from what is real right now: a
   show that is live, a featured night, the number one record, and the
   free month. It never shows an empty hero and it never invents one.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var L = global.CabanaLive;
  if (!L) return;
  var u = L.u, esc = u.esc, ic = L.ic, UI = L.ui, D = L.data, doc = global.document;

  var bb = null;
  function killBB() { if (bb) { bb.destroy(); bb = null; } }

  /* ── building billboard slides ──────────────────────────────────── */

  /* Each drawing gets its own gradient ids: a gradient defined inside a
     hidden billboard slide does not paint for a copy elsewhere. */
  var artSeq = 0;
  function premiumArt() {
    var g = 'lvg' + (++artSeq);
    return '<div style="position:absolute;inset:0;background:radial-gradient(60% 80% at 78% 40%,rgba(246,196,81,.35),transparent 60%),radial-gradient(50% 70% at 60% 90%,rgba(255,46,147,.28),transparent 60%),radial-gradient(40% 60% at 90% 10%,rgba(139,92,255,.35),transparent 60%),#0b0810"></div>' +
      '<svg viewBox="0 0 600 600" style="position:absolute;right:-4%;top:50%;width:min(70vh,640px);transform:translateY(-50%);opacity:.9" aria-hidden="true"><defs><linearGradient id="' + g + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF3C8"/><stop offset=".4" stop-color="#F6C451"/><stop offset=".7" stop-color="#B97F17"/><stop offset="1" stop-color="#FFE7A1"/></linearGradient></defs>' +
      '<circle cx="300" cy="300" r="250" fill="none" stroke="url(#' + g + ')" stroke-width="1.5" opacity=".35"/><circle cx="300" cy="300" r="200" fill="none" stroke="url(#' + g + ')" stroke-width="1" opacity=".25"/>' +
      '<path d="m150 250 70 60 80-110 80 110 70-60-35 170H185z" fill="url(#' + g + ')" opacity=".95"/><rect x="185" y="440" width="230" height="22" rx="6" fill="url(#' + g + ')"/></svg>';
  }

  function slideFromEvent(e, kicker) {
    var t = L.timeTo(e.starts_at, e.ends_at);
    var clip = u.arr(e.videos)[0];
    var chips = [];
    if (t.live) chips.push(UI.chip('lv-chip-live', 'Live now'));
    else if (kicker) chips.push(UI.chip('lv-chip-soon', kicker));
    chips.push(UI.chip('lv-chip-date', u.when(e.starts_at)));
    if (L.data.titles.some(function (x) { return String(x.event_id) === String(e.id); })) chips.push(UI.chip('lv-chip-prem', 'Streams live', 'live'));
    var free = Number(e.price_from) === 0;
    return {
      key: 'e' + e.id, label: e.title, title: e.title,
      chips: chips,
      countdown: !t.live && t.ms && t.ms < 14 * L.DAY ? e.starts_at : null,
      meta: [
        { icon: 'pin', html: esc([e.venue, e.city].filter(Boolean).join(', ') || 'Venue to be announced') },
        { icon: 'ticket', html: free ? 'Free entry' : 'From <b>' + esc(u.money(e.price_from, e.currency)) + '</b>', hot: true }
      ],
      sub: e.tagline || e.description,
      media: clip ? { kind: 'video', src: clip, poster: e.cover_url } : { kind: 'image', src: e.cover_url || u.arr(e.photos)[0] || '' },
      acts: [
        { label: free ? 'Reserve a place' : 'Get tickets', icon: 'ticket', cls: '', data: { act: 'book', id: e.id } },
        { label: 'More info', icon: 'info', cls: 'lv-btn-glass', href: L.href.event(e) },
        { label: L.saves.has('event', e.id) ? 'Saved' : 'Remind me', icon: L.saves.has('event', e.id) ? 'check' : 'bell', round: true, data: { act: 'save', kind: 'event', ref: e.id, remind: '1' } }
      ],
      avail: e.organiser_name ? 'Presented by <b>' + esc(e.organiser_name) + '</b>' : ''
    };
  }

  function slideFromTitle(t) {
    var st = L.titleState(t);
    var chips = [];
    if (st === 'live') chips.push(UI.chip('lv-chip-live', 'Live now'));
    else if (st === 'upcoming') chips.push(UI.chip('lv-chip-soon', 'Live ' + u.when(t.live_starts_at).split(' · ')[0]));
    else if (st === 'soon') chips.push(UI.chip('lv-chip-soon', 'Coming soon'));
    else if (L.isNew(t)) chips.push(UI.chip('lv-chip-new', 'New'));
    if (t.badge) chips.push(UI.chip('lv-chip-orig', t.badge));
    chips.push(t.access === 'premium' ? UI.premChip() : UI.chip('lv-chip-free', 'Free to watch'));
    var acts = [];
    if (st === 'soon') acts.push({ label: 'Remind me', icon: 'bell', data: { act: 'save', kind: 'title', ref: t.id, remind: '1' } });
    else if (st === 'upcoming') acts.push({ label: 'Remind me', icon: 'bell', data: { act: 'save', kind: 'title', ref: t.id, remind: '1' } });
    else acts.push({ label: st === 'live' ? 'Watch live' : 'Play', icon: 'play', cls: st === 'live' ? 'lv-btn-live' : '', data: { act: 'play', id: t.id } });
    if (t.trailer_youtube || t.trailer_url) acts.push({ label: 'Trailer', icon: 'film', cls: 'lv-btn-glass', data: { act: 'trailer', id: t.id } });
    acts.push({ label: 'More info', icon: 'info', cls: 'lv-btn-glass', href: L.href.title(t) });
    acts.push({ label: 'My List', icon: L.saves.has('title', t.id) ? 'check' : 'plus', round: true, data: { act: 'save', kind: 'title', ref: t.id } });
    var meta = [];
    var m = UI.titleMeta(t);
    if (m) meta.push({ html: m });
    return {
      key: 't' + t.id, label: t.title, title: t.title, logo: u.safeUrl(t.logo_url),
      chips: chips,
      countdown: st === 'upcoming' ? t.live_starts_at : st === 'soon' ? t.release_at : null,
      meta: meta,
      sub: t.tagline || t.synopsis,
      accent: t.accent,
      rating: t.maturity,
      media: t.trailer_url ? { kind: 'video', src: t.trailer_url, poster: t.backdrop_url }
        : t.trailer_youtube ? { kind: 'youtube', src: t.trailer_youtube, poster: t.backdrop_url }
        : { kind: 'image', src: t.backdrop_url || t.poster_url },
      acts: acts,
      avail: t.available_on ? 'Available on <b>' + esc(t.available_on) + '</b>' : (t.access === 'premium' ? 'Only on <b>Cabana Live Premium</b>' : '')
    };
  }

  function slideFromTrack(tr, kicker) {
    return {
      key: 'm' + tr.videoId, label: u.songOf(tr), title: u.songOf(tr),
      chips: [UI.chip('lv-chip-new', kicker || 'No.1 in Kenya'), UI.chip('', 'Music video', 'music')],
      meta: [{ icon: 'user', html: esc(u.artistOf(tr)), hot: true }, tr.views ? { icon: 'trend', html: u.compact(tr.views) + ' plays' } : null].filter(Boolean),
      sub: 'Straight from YouTube, updated through the day. Press play and the whole platform keeps the music going while you browse.',
      media: { kind: 'youtube', src: tr.videoId, pos: '50% 40%' },
      accent: '#C8FF3D',
      acts: [
        { label: 'Play', icon: 'play', data: { act: 'track', vid: tr.videoId, queue: 'chart' } },
        { label: 'Enter the party', icon: 'party', cls: 'lv-btn-glass', href: L.href.track(tr.videoId) }
      ],
      avail: 'Live from <b>YouTube</b>'
    };
  }

  function premiumSlide() {
    var st = D.state || {};
    if (st.premium) return null;
    return {
      key: 'premium', label: 'Premium', title: st.premium_name || 'Cabana Live Premium',
      chips: [UI.chip('lv-chip-prem', st.trial_used ? 'Premium' : 'Enjoy one month free access', 'crown')],
      meta: [{ icon: 'live', html: 'Live shows' }, { icon: 'film', html: 'Movies' }, { icon: 'tv', html: 'Series' }, { icon: 'music', html: 'Concerts' }],
      sub: st.banner_text || 'Live shows, movies, series and concerts on Cabana. Your first month is on us, no card needed.',
      media: { kind: 'art', html: premiumArt() },
      accent: '#F6C451',
      acts: [
        { label: st.trial_used ? 'See Premium' : 'Start ' + (st.trial_days || 30) + ' days free', icon: 'crown', cls: 'lv-btn-gold', data: { act: 'premium' } },
        { label: 'Browse live', icon: 'arrowR', cls: 'lv-btn-glass', href: L.href.tab('live') }
      ],
      avail: st.price_kes ? 'Then <b>' + esc(u.money(st.price_kes)) + '</b> a ' + esc(st.price_period || 'month') : 'No card needed · cancel any time'
    };
  }

  function eventsSlide() {
    return {
      key: 'events', label: 'Events', title: 'Your next night out',
      chips: [UI.chip('lv-chip-soon', 'Events', 'ticket'), UI.chip('lv-chip-date', 'Tickets at face value')],
      meta: [{ icon: 'music', html: 'Concerts' }, { icon: 'spark', html: 'Festivals' }, { icon: 'mic', html: 'Comedy' }, { icon: 'balloon', html: 'Family days' }],
      sub: 'Concerts, festivals, comedy and family days across Africa, at the organiser’s own price. Pay by M-Pesa or card and show your code at the door.',
      media: { kind: 'art', html: eventsArt() },
      accent: '#FF2E93',
      acts: [
        { label: 'See what’s on', icon: 'ticket', cls: '', href: L.href.tab('events') },
        { label: 'List your event', icon: 'plus', cls: 'lv-btn-glass', href: '/list-your-event' }
      ],
      avail: 'Organisers keep every shilling of the ticket price'
    };
  }

  function eventsArt() {
    return '<div style="position:absolute;inset:0;background:radial-gradient(55% 75% at 75% 35%,rgba(255,46,147,.42),transparent 62%),radial-gradient(45% 65% at 92% 85%,rgba(51,225,255,.28),transparent 60%),radial-gradient(40% 60% at 58% 8%,rgba(139,92,255,.4),transparent 60%),#0a0710"></div>' +
      '<div class="lv-evs-beams" aria-hidden="true"><i></i><i></i><i></i></div>' +
      '<div style="position:absolute;right:4%;top:50%;width:min(60vh,540px);transform:translateY(-50%)">' + ticketArt() + '</div>';
  }

  function slideFromAdmin(b) {
    var base = null;
    if (b.kind === 'event' && b.ref) { var e = L.findEvent(b.ref); if (e) base = slideFromEvent(e, b.kicker); }
    if (b.kind === 'title' && b.ref) { var t = L.findTitle(b.ref); if (t) base = slideFromTitle(t); }
    if (b.kind === 'track' && u.ytId(b.ref)) { var tr = L.findTrack(b.ref) || { videoId: b.ref, title: b.headline || 'Now playing', artist: '' }; base = slideFromTrack(tr, b.kicker); }
    base = base || { acts: [], chips: [], meta: [] };
    var s = {
      key: 'b' + b.id,
      label: b.headline || base.label,
      title: b.headline || base.title || '',
      logo: u.safeUrl(b.logo_url) || base.logo,
      chips: base.chips && base.chips.length && !b.kicker ? base.chips : [],
      meta: base.meta || [],
      sub: b.subline || base.sub,
      accent: b.accent || base.accent,
      countdown: b.when_at && Date.parse(b.when_at) > Date.now() ? b.when_at : base.countdown,
      rating: base.rating,
      media: base.media || {},
      acts: base.acts || [],
      avail: b.available_on ? 'Available on <b>' + esc(b.available_on) + '</b>' : base.avail
    };
    if (b.kicker) {
      var k = b.kicker.toLowerCase();
      s.chips = [UI.chip(/live/.test(k) ? 'lv-chip-live' : /soon|premiere|coming/.test(k) ? 'lv-chip-soon' : /new/.test(k) ? 'lv-chip-new' : '', b.kicker)];
    }
    if (b.premium) s.chips.push(UI.premChip());
    if (b.venue || b.when_at) {
      s.meta = [];
      if (b.venue) s.meta.push({ icon: 'pin', html: esc(b.venue) });
      if (b.when_at) s.meta.push({ icon: 'cal', html: esc(u.when(b.when_at)), hot: true });
    }
    if (b.media_url) {
      s.media = b.media_kind === 'youtube' ? { kind: 'youtube', src: b.media_url, poster: b.poster_url }
        : b.media_kind === 'video' ? { kind: 'video', src: b.media_url, mobile: b.media_mobile_url, poster: b.poster_url }
        : { kind: 'image', src: b.media_url, mobile: b.media_mobile_url };
    }
    if (b.cta_label && b.cta_url) {
      var a1 = { label: b.cta_label, icon: /ticket/i.test(b.cta_label) ? 'ticket' : /watch|play|listen/i.test(b.cta_label) ? 'play' : 'arrowR', href: b.cta_url, external: /^https:/i.test(b.cta_url) };
      s.acts = [a1].concat(b.cta2_label && b.cta2_url ? [{ label: b.cta2_label, icon: 'info', cls: 'lv-btn-glass', href: b.cta2_url, external: /^https:/i.test(b.cta2_url) }] : []);
    }
    return s;
  }

  function adminSlides(place) {
    return D.billboard.filter(function (b) {
      return (b.placements || []).indexOf(place) !== -1;
    }).map(slideFromAdmin).filter(function (s) { return s.title || s.logo; });
  }

  function autoSlides(place) {
    var out = [], titles = D.titles, evs = L.upcomingEvents();
    function add(s) { if (s && !out.some(function (x) { return x.key === s.key; })) out.push(s); }
    var liveNow = titles.filter(function (t) { return L.titleState(t) === 'live'; });
    var featTitles = titles.filter(function (t) { return t.featured; });
    var featEvents = evs.filter(function (e) { return e.featured; });

    if (place === 'home') {
      liveNow.slice(0, 2).forEach(function (t) { add(slideFromTitle(t)); });
      featTitles.slice(0, 2).forEach(function (t) { add(slideFromTitle(t)); });
      (featEvents.length ? featEvents : evs.filter(function (e) { return e.cover_url; })).slice(0, 2).forEach(function (e) { add(slideFromEvent(e, 'Featured night')); });
      if (D.chart.tracks[0]) add(slideFromTrack(D.chart.tracks[0]));
      if (!evs.length) add(eventsSlide());
      add(premiumSlide());
      if (out.length < 3 && D.chart.tracks[1]) add(slideFromTrack(D.chart.tracks[1], 'Trending in Kenya'));
      if (out.length < 3 && D.chart.releases[0]) add(slideFromTrack(D.chart.releases[0], 'Fresh release'));
    } else if (place === 'events') {
      (featEvents.length ? featEvents : []).concat(evs).filter(function (e) { return e.cover_url || u.arr(e.photos)[0]; }).slice(0, 5).forEach(function (e) { add(slideFromEvent(e, e.featured ? 'Featured night' : 'Coming up')); });
    } else {
      var kinds = { live: ['live', 'special'], movies: ['movie'], shows: ['show'] }[place] || [];
      var pool = titles.filter(function (t) { return kinds.indexOf(t.kind) !== -1; });
      pool.filter(function (t) { return L.titleState(t) === 'live'; }).concat(pool.filter(function (t) { return t.featured; }), pool)
        .slice(0, 8).forEach(function (t) { if (out.length < 5) add(slideFromTitle(t)); });
      if (!out.length) add(premiumSlide());
    }
    return out;
  }

  L.slidesFor = function (place) {
    var a = adminSlides(place);
    return a.length ? a : autoSlides(place);
  };

  function mountBB(ctx, place, opts) {
    killBB();
    var host = u.qs('[data-bb]', ctx.el);
    var slides = L.slidesFor(place);
    if (!host) return;
    if (!slides.length) { host.remove(); return; }
    bb = UI.billboard(host, slides, opts);
  }

  /* ── home ───────────────────────────────────────────────────────── */

  function home(ctx) {
    L.setMeta(null, 'Cabana Live: live shows, concerts, movies, series and the Kenya music chart, plus face-value tickets to events across Africa. Enjoy one month free access.');
    paintHome(ctx);
    var off = L.on('data', function () { if (ctx.alive()) paintHome(ctx, true); });
    var off2 = L.on('state', function () { if (ctx.alive()) { paintHomeRows(ctx); } });
    var off3 = L.on('saves', function () { if (ctx.alive()) paintHomeRows(ctx); });
    ctx.onLeave(function () { off(); off2(); off3(); killBB(); });
  }

  function paintHome(ctx, again) {
    if (!again || !u.qs('[data-bb]', ctx.el) || !bb) {
      ctx.el.innerHTML = '<div data-bb></div><div class="lv-rows" data-rows></div>';
      if (!D.loaded.core) { u.qs('[data-bb]', ctx.el).innerHTML = '<div class="lv-skel" style="height:min(92vh,980px);border-radius:0"></div>'; }
      else mountBB(ctx, 'home', { h1: true });
    } else if (D.loaded.core && again && bb && ctx.el._bbKeys !== keysOf(L.slidesFor('home'))) {
      mountBB(ctx, 'home', { h1: true });
    }
    ctx.el._bbKeys = keysOf(L.slidesFor('home'));
    paintHomeRows(ctx);
  }
  function keysOf(s) { return s.map(function (x) { return x.key; }).join('|'); }

  /* The home page is a list of sections the console can reorder and hide
     (live_settings.home_sections, handed over by live_state). Any section
     the setting does not mention keeps its place from this default. */
  var HOME_ORDER = ['live', 'events', 'mylist', 'premium', 'top10', 'new', 'movies', 'series', 'specials', 'soon', 'plan', 'playlists', 'releases', 'artists', 'invite'];
  L.HOME_ORDER = HOME_ORDER;
  function homeLayout() {
    var h = (D.state && D.state.home) || {};
    var hidden = u.arr(h.hidden).map(String);
    var order = u.arr(h.order).map(String).filter(function (k, i, a) { return HOME_ORDER.indexOf(k) !== -1 && a.indexOf(k) === i; });
    HOME_ORDER.forEach(function (k) { if (order.indexOf(k) === -1) order.splice(Math.min(HOME_ORDER.indexOf(k), order.length), 0, k); });
    return order.filter(function (k) { return hidden.indexOf(k) === -1; });
  }

  function paintHomeRows(ctx) {
    var host = u.qs('[data-rows]', ctx.el);
    if (!host) return;
    var titles = D.titles, evs = L.upcomingEvents(), tracks = D.chart.tracks;
    var week = evs.filter(function (e) { return Date.parse(e.starts_at) - Date.now() < 7 * L.DAY; });
    var later = evs.filter(function (e) { return Date.parse(e.starts_at) - Date.now() >= 7 * L.DAY; });

    var S = {
      live: function () {
        var liveRow = titles.filter(function (t) { var s = L.titleState(t); return (t.kind === 'live' || t.kind === 'special') && (s === 'live' || s === 'upcoming'); })
          .sort(function (a, b) { return (L.titleState(a) === 'live' ? 0 : 1) - (L.titleState(b) === 'live' ? 0 : 1) || Date.parse(a.live_starts_at) - Date.parse(b.live_starts_at); });
        return UI.row({ title: 'Live now and coming up ' + (liveRow.some(function (t) { return L.titleState(t) === 'live'; }) ? UI.chip('lv-chip-live', 'Live') : ''), items: liveRow, render: UI.card.wideTitle, col: 'clamp(280px, 30vw, 420px)', all: L.href.tab('live') });
      },
      /* Tickets are what most people arrive for, and the section stands up
         even before anything is listed. */
      events: function () { return eventsBlock(evs, week); },
      mylist: function () {
        var mine = myListItems().slice(0, 16);
        return UI.row({ title: 'My List', sub: 'Everything you saved with the heart', items: mine, render: renderSaved, col: '230px', all: L.BASE + '/my-list' });
      },
      premium: function () { return UI.premium(); },
      top10: function () { return UI.row({ title: 'Top 10 in Kenya today', sub: 'The music chart, live from YouTube', items: tracks.slice(0, 10), render: function (t, i) { return UI.card.top10(t, i, 'chart'); }, railCls: 'lv-top10-rail', col: 'clamp(210px, 19vw, 280px)', all: L.href.tab('music') }); },
      'new': function () { return UI.row({ title: 'New on Cabana', items: titles.filter(function (t) { return L.isNew(t) && L.titleState(t) !== 'soon'; }).slice(0, 18), render: UI.card.poster, col: 'clamp(150px, 13vw, 200px)' }); },
      movies: function () { return UI.row({ title: 'Movies', items: titles.filter(function (t) { return t.kind === 'movie' && L.titleState(t) !== 'soon'; }).slice(0, 18), render: UI.card.poster, col: 'clamp(150px, 13vw, 200px)', all: L.href.tab('movies') }); },
      series: function () { return UI.row({ title: 'Series to binge', items: titles.filter(function (t) { return t.kind === 'show' && L.titleState(t) !== 'soon'; }).slice(0, 18), render: UI.card.poster, col: 'clamp(150px, 13vw, 200px)', all: L.href.tab('shows') }); },
      specials: function () { return UI.row({ title: 'Concerts and specials', items: titles.filter(function (t) { return (t.kind === 'special' || (t.kind === 'live' && L.titleState(t) === 'replay')); }).slice(0, 16), render: UI.card.wideTitle, col: 'clamp(280px, 26vw, 380px)', all: L.href.tab('live') }); },
      soon: function () {
        return UI.row({ title: 'Coming soon', items: titles.filter(function (t) { return L.titleState(t) === 'soon'; }).slice(0, 16), render: UI.card.wideTitle, col: 'clamp(280px, 26vw, 380px)' }) +
          (titles.length ? '' : UI.soonGrid());
      },
      plan: function () { return week.length >= 3 && later.length ? UI.row({ title: 'Plan ahead', items: later.slice(0, 16), render: UI.card.event, col: 'clamp(200px, 17vw, 250px)', all: L.href.tab('events') }) : ''; },
      playlists: function () { return UI.row({ title: 'Playlists for every mood', items: D.playlists.slice(0, 16), render: UI.card.playlist, col: 'clamp(160px, 14vw, 210px)', all: L.href.tab('music') }); },
      releases: function () {
        var rel = D.chart.releases.slice().sort(function (a, b) { return Date.parse(b.published) - Date.parse(a.published); });
        return UI.row({ title: 'Fresh releases', sub: 'New videos from the artists Kenya is playing', items: rel.slice(0, 16), render: function (t) { return UI.card.track(t, { queue: 'releases', tag: u.ago(t.published) }); }, col: 'clamp(260px, 24vw, 340px)', all: L.href.tab('music') });
      },
      artists: function () { return D.chart.artists.length >= 4 ? UI.row({ title: 'Artists on the rise', items: D.chart.artists.slice(0, 14), render: UI.card.artist, col: 'clamp(120px, 10vw, 150px)', all: L.href.tab('music') + '#standings' }) : ''; },
      invite: function () { return UI.invite(); }
    };

    host.innerHTML = homeLayout().map(function (k) {
      try { return S[k](); } catch (e) { if (global.console) console.error('[live:home:' + k + ']', e); return ''; }
    }).join('');
    UI.wireRails(host);
  }

  /* The events zone on the home page: a way in by kind of night, then the
     nights themselves. Before anything is listed it says so plainly and
     offers the one useful thing, listing an event. */
  function eventsBlock(evs, week) {
    var counts = {};
    evs.forEach(function (e) { var c = e.category || 'music'; counts[c] = (counts[c] || 0) + 1; });
    var cats = CATS.filter(function (c) { return c.key !== 'all' && (!evs.length || counts[c.key]); });
    var cities = {};
    evs.forEach(function (e) { if (e.city) cities[e.city] = 1; });
    var sub = evs.length
      ? evs.length + ' coming up' + (Object.keys(cities).length ? ' in ' + Object.keys(cities).slice(0, 3).map(esc).join(', ') + (Object.keys(cities).length > 3 ? ' and more' : '') : '') + ' · the organiser’s price, nothing added'
      : 'Concerts, festivals, comedy, sport and family days across Africa, at the organiser’s own price';
    var html = '<section class="lv-evx" aria-labelledby="lv-evx-h">' +
      '<div class="lv-row-h"><div><div class="lv-evx-k">' + ic('ticket', 2.2) + 'What’s on</div>' +
        '<h2 class="lv-row-t" id="lv-evx-h">Events</h2><p class="lv-row-s">' + sub + '</p></div>' +
        '<a class="lv-row-all" href="' + L.href.tab('events') + '">All events' + ic('chevR', 2.4) + '</a></div>' +
      '<div class="lv-evcats" role="list" style="--cols:' + (cats.length <= 6 ? cats.length : Math.ceil(cats.length / 2)) + '">' + cats.map(function (c) {
        return '<a class="lv-evcat" role="listitem" href="' + L.href.tab('events') + '?cat=' + c.key + '" style="--ca:' + c.a + ';--cb:' + c.b + '">' +
          '<span class="lv-evcat-ic">' + ic(c.icon, 2) + '</span><b>' + esc(c.label) + '</b>' +
          (counts[c.key] ? '<small>' + counts[c.key] + ' event' + (counts[c.key] === 1 ? '' : 's') + '</small>' : '') + '</a>';
      }).join('') + '</div>';
    if (evs.length) {
      var lead = week.length >= 3 ? week : evs;
      html += '<h3 class="lv-evx-sub">' + (week.length >= 3 ? 'Tonight and this week' : 'Coming up') + '</h3>' +
        '<div class="lv-rail lv-evx-rail" style="--col:clamp(200px, 17vw, 250px)">' + lead.slice(0, 16).map(UI.card.event).join('') + '</div>';
    } else {
      html += '<div class="lv-evx-empty">' +
        '<div class="lv-evx-art" aria-hidden="true">' + ticketArt() + '</div>' +
        '<div class="lv-evx-copy">' + UI.chip('lv-chip-soon', 'Tickets opening soon') +
          '<h3>The stage is being set</h3>' +
          '<p>Nothing is on sale yet. Organisers are listing concerts, festivals, comedy nights, school shows and conferences now, each at their own price with nothing added. Pay by M-Pesa or card and show your code at the door.</p>' +
          '<div class="lv-evx-acts"><a class="lv-btn lv-btn-accent" href="/list-your-event" rel="external">' + ic('plus', 2.6) + 'List your event, free</a>' +
          '<a class="lv-btn lv-btn-ghost" href="' + L.href.tab('music') + '">' + ic('music') + 'Play the chart meanwhile</a></div>' +
        '</div></div>';
    }
    return html + '</section>';
  }

  function ticketArt() {
    var g = 'lvtk' + (++artSeq);
    return '<svg viewBox="0 0 320 220" role="presentation"><defs>' +
      '<linearGradient id="' + g + 'a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF2E93"/><stop offset=".55" stop-color="#8B5CFF"/><stop offset="1" stop-color="#33E1FF"/></linearGradient>' +
      '<linearGradient id="' + g + 'b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFE7A1"/><stop offset="1" stop-color="#F6C451"/></linearGradient></defs>' +
      '<g transform="rotate(-8 160 110)"><path d="M40 50h240a10 10 0 0 1 10 10v26a18 18 0 0 0 0 36v26a10 10 0 0 1-10 10H40a10 10 0 0 1-10-10v-26a18 18 0 0 0 0-36V60a10 10 0 0 1 10-10Z" fill="url(#' + g + 'a)"/>' +
      '<path d="M214 58v104" stroke="#fff" stroke-opacity=".55" stroke-width="2" stroke-dasharray="4 6"/>' +
      '<text x="52" y="92" fill="#fff" font-family="Anybody, sans-serif" font-weight="900" font-size="30" letter-spacing="-1">ADMIT ONE</text>' +
      '<text x="52" y="118" fill="#fff" fill-opacity=".85" font-family="Plus Jakarta Sans, sans-serif" font-weight="700" font-size="12" letter-spacing="2">CABANA LIVE</text>' +
      '<rect x="52" y="130" width="112" height="20" rx="5" fill="#fff" fill-opacity=".2"/>' +
      '<text x="60" y="144" fill="#fff" font-family="Plus Jakarta Sans, sans-serif" font-weight="800" font-size="10" letter-spacing="1.6">FACE VALUE</text>' +
      '<circle cx="252" cy="110" r="22" fill="url(#' + g + 'b)"/><path d="m244 110 6 6 11-12" fill="none" stroke="#2A1C00" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></g></svg>';
  }

  /* ── events ─────────────────────────────────────────────────────── */

  var CATS = [
    { key: 'all', label: 'Everything' },
    { key: 'music', label: 'Music', icon: 'music', a: '#FF2E93', b: '#8B5CFF' },
    { key: 'festival', label: 'Festivals', icon: 'spark', a: '#FFB23F', b: '#FF5E3A' },
    { key: 'nightlife', label: 'Nightlife', icon: 'party', a: '#7A3BFF', b: '#33E1FF' },
    { key: 'comedy', label: 'Comedy', icon: 'mic', a: '#FFD23F', b: '#FF7A3D' },
    { key: 'sports', label: 'Sports', icon: 'ball', a: '#22E08A', b: '#0FA3B1' },
    { key: 'art', label: 'Arts', icon: 'palette', a: '#FF5E7E', b: '#B23BFF' },
    { key: 'kids', label: 'Kids', icon: 'balloon', a: '#33E1FF', b: '#3D7BFF' },
    { key: 'corporate', label: 'Business', icon: 'briefcase', a: '#9AA7FF', b: '#4B5BD6' },
    { key: 'community', label: 'Community', icon: 'people', a: '#FF9F43', b: '#EE5A24' },
    { key: 'food', label: 'Food & drink', icon: 'food', a: '#FF6B6B', b: '#FFB23F' }
  ];
  var WHEN = [['all', 'Any time'], ['tonight', 'Tonight'], ['weekend', 'This weekend'], ['week', 'This week'], ['month', 'This month']];
  var AUDS = [['all', 'Anyone'], ['night', 'After dark'], ['family', 'Family'], ['work', 'Business'], ['culture', 'Culture']];
  var AUD_BY_CAT = { nightlife: 'night', music: 'night', festival: 'culture', art: 'culture', kids: 'family', corporate: 'work', community: 'family', comedy: 'night', sports: 'family', food: 'family' };

  /* Who a night is for. A lens, not a filter: it floats a crowd's
     listings up and hides nothing. */
  function audienceOf(e) {
    var hay = [e.title, e.tagline].concat(u.arr(e.tags)).join(' ').toLowerCase();
    if (/\b(kid|kids|children|child|family|toddler|teen|school|matinee|holiday camp)\b/.test(hay)) return 'family';
    if (/\b(conference|summit|expo|corporate|networking|seminar|workshop|keynote|awards|launch|career|b2b)\b/.test(hay)) return 'work';
    if (/\b(rave|club|after ?party|dj|nightclub|all ?night|18\+|21\+)\b/.test(hay)) return 'night';
    if (/\b(cultural|heritage|traditional|exhibition|gallery|theatre|poetry|film|festival)\b/.test(hay)) return 'culture';
    if (Number(e.age_limit) >= 18) return 'night';
    return AUD_BY_CAT[e.category || ''] || 'culture';
  }
  L.audienceOf = audienceOf;

  function inWindow(e, w) {
    if (w === 'all') return true;
    var s = Date.parse(e.starts_at), now = new Date(), t = now.getTime();
    if (isNaN(s)) return false;
    var eod = new Date(now); eod.setHours(23, 59, 59, 999);
    if (w === 'tonight') return s <= eod.getTime() || (s - t < 0);
    if (w === 'week') return s - t < 7 * L.DAY;
    if (w === 'month') return s - t < 31 * L.DAY;
    if (w === 'weekend') {
      var day = now.getDay(), fri = new Date(now);
      fri.setDate(now.getDate() + ((5 - day + 7) % 7)); fri.setHours(17, 0, 0, 0);
      if (day === 6 || day === 0) fri = new Date(t - 1);
      var sun = new Date(fri); sun.setDate(fri.getDate() + (day === 0 ? 0 : day === 6 ? 1 : 2)); sun.setHours(23, 59, 59, 999);
      return s >= Math.min(fri.getTime(), t) && s <= sun.getTime();
    }
    return true;
  }

  function eventsTab(ctx) {
    L.setMeta('Events and tickets', 'Concerts, festivals, comedy, kids shows, conferences and community days across Africa, at the organiser’s own price.');
    var f = { q: ctx.query.get('q') || '', cat: ctx.query.get('cat') || 'all', when: ctx.query.get('when') || 'all', city: ctx.query.get('city') || '', aud: ctx.query.get('for') || 'all', sort: ctx.query.get('sort') || 'soonest' };
    ctx.el.innerHTML = '<div data-bb></div><div data-head></div><div data-filters></div><div class="lv-count" data-count aria-live="polite"></div><div class="lv-grid lv-grid-ev" id="ev-grid" data-grid></div>' + UI.invite();
    function paint() {
      var evs = L.upcomingEvents();
      if (D.loaded.core && evs.some(function (e) { return e.cover_url || u.arr(e.photos)[0]; })) {
        if (!bb) mountBB(ctx, 'events', { label: 'Featured events' });
        u.qs('[data-head]', ctx.el).innerHTML = '';
      } else {
        killBB();
        var h = u.qs('[data-bb]', ctx.el); if (h) h.innerHTML = '';
        u.qs('[data-head]', ctx.el).innerHTML = '<header class="lv-head"><div class="lv-head-k">Tickets at face value</div><h1>What’s on</h1><p>Concerts and club nights beside school shows, conferences and family days. Organisers set the price and keep all of it.</p></header>';
      }
      paintFilters(); paintGrid();
    }
    function sync() {
      var p = new URLSearchParams();
      if (f.q) p.set('q', f.q); if (f.cat !== 'all') p.set('cat', f.cat); if (f.when !== 'all') p.set('when', f.when);
      if (f.city) p.set('city', f.city); if (f.aud !== 'all') p.set('for', f.aud); if (f.sort !== 'soonest') p.set('sort', f.sort);
      history.replaceState({ lv: 1 }, '', location.pathname + (p.toString() ? '?' + p : ''));
    }
    function paintFilters() {
      var evs = L.upcomingEvents(), counts = { all: evs.length }, cities = {};
      evs.forEach(function (e) { counts[e.category || 'music'] = (counts[e.category || 'music'] || 0) + 1; if (e.city) cities[e.city] = (cities[e.city] || 0) + 1; });
      var host = u.qs('[data-filters]', ctx.el);
      host.innerHTML = '<div class="lv-filters">' +
        '<label class="lv-search">' + ic('search') + '<input type="search" data-q placeholder="Search events, venues, artists" value="' + esc(f.q) + '" aria-label="Search events"/></label>' +
        '<select class="lv-select" data-city aria-label="City"><option value="">All cities</option>' + Object.keys(cities).sort().map(function (c) { return '<option value="' + esc(c) + '"' + (f.city === c ? ' selected' : '') + '>' + esc(c) + ' (' + cities[c] + ')</option>'; }).join('') + '</select>' +
        '<select class="lv-select" data-sort aria-label="Sort"><option value="soonest">Soonest first</option><option value="price-asc"' + (f.sort === 'price-asc' ? ' selected' : '') + '>Cheapest first</option><option value="price-desc"' + (f.sort === 'price-desc' ? ' selected' : '') + '>Most premium</option></select>' +
        '<div class="lv-pills" role="group" aria-label="When">' + WHEN.map(function (w) { return '<button class="lv-pill" type="button" data-when="' + w[0] + '" aria-pressed="' + (f.when === w[0]) + '">' + w[1] + '</button>'; }).join('') + '</div>' +
        '<div class="lv-pills" role="group" aria-label="Category">' + CATS.filter(function (c) { return c.key === 'all' || counts[c.key] || c.key === f.cat; }).map(function (c) {
          return '<button class="lv-pill" type="button" data-cat="' + c.key + '" aria-pressed="' + (f.cat === c.key) + '">' + c.label + ' <span class="n">' + (counts[c.key] || 0) + '</span></button>';
        }).join('') + '</div>' +
        '<div class="lv-pills" role="group" aria-label="Who is coming with you">' + AUDS.map(function (a) { return '<button class="lv-pill" type="button" data-aud="' + a[0] + '" aria-pressed="' + (f.aud === a[0]) + '">' + a[1] + '</button>'; }).join('') + '</div>' +
      '</div>';
      var qi = u.qs('[data-q]', host);
      qi.addEventListener('input', u.debounce(function () { f.q = qi.value.trim(); sync(); paintGrid(); }, 160));
      u.qs('[data-city]', host).addEventListener('change', function (e) { f.city = e.target.value; sync(); paintGrid(); });
      u.qs('[data-sort]', host).addEventListener('change', function (e) { f.sort = e.target.value; sync(); paintGrid(); });
      host.addEventListener('click', function (e) {
        var b = e.target.closest('.lv-pill'); if (!b) return;
        if (b.hasAttribute('data-when')) f.when = b.getAttribute('data-when');
        if (b.hasAttribute('data-cat')) f.cat = b.getAttribute('data-cat');
        if (b.hasAttribute('data-aud')) f.aud = b.getAttribute('data-aud');
        sync(); paintFilters(); paintGrid();
      });
    }
    function list() {
      var q = f.q.toLowerCase();
      var l = L.upcomingEvents().filter(function (e) {
        if (f.cat !== 'all' && (e.category || 'music') !== f.cat) return false;
        if (f.city && e.city !== f.city) return false;
        if (!inWindow(e, f.when)) return false;
        if (!q) return true;
        return [e.title, e.tagline, e.venue, e.city, e.organiser_name].concat(u.arr(e.tags), u.arr(e.lineup).map(function (a) { return typeof a === 'string' ? a : a && a.name; })).join(' ').toLowerCase().indexOf(q) !== -1;
      });
      if (f.sort === 'price-asc') l.sort(function (a, b) { return (a.price_from || 0) - (b.price_from || 0); });
      if (f.sort === 'price-desc') l.sort(function (a, b) { return (b.price_from || 0) - (a.price_from || 0); });
      if (f.aud !== 'all') l.sort(function (a, b) { return (audienceOf(a) === f.aud ? 0 : 1) - (audienceOf(b) === f.aud ? 0 : 1); });
      return l;
    }
    function paintGrid() {
      var g = u.qs('[data-grid]', ctx.el), c = u.qs('[data-count]', ctx.el);
      if (!D.loaded.core) {
        g.innerHTML = new Array(8).join('.').split('.').map(function () { return '<div class="lv-skel" style="aspect-ratio:4/5"></div>'; }).join('');
        return;
      }
      var l = list();
      c.innerHTML = '<b>' + l.length + '</b> event' + (l.length === 1 ? '' : 's') + ' coming up';
      if (!l.length) {
        var filtered = L.upcomingEvents().length && (f.q || f.cat !== 'all' || f.when !== 'all' || f.city);
        g.innerHTML = '<div style="grid-column:1/-1">' + (filtered
          ? UI.empty('search', 'Nothing matches that yet', 'Widen the search and the rest of the board comes back.', '<button class="lv-btn lv-btn-ghost" type="button" data-clear>Show everything</button>')
          : UI.empty('ticket', 'The stage is being set', 'No events are on sale right now. Organisers list here every week, from warehouse parties to school concerts. Check back soon, or be the first to put something on.',
              '<a class="lv-btn lv-btn-accent" href="/list-your-event" rel="external">' + ic('plus', 2.6) + 'List an event</a><a class="lv-btn lv-btn-ghost" href="' + L.href.tab('music') + '">' + ic('music') + 'Play the chart meanwhile</a>')) + '</div>';
        var cl = u.qs('[data-clear]', g);
        if (cl) cl.addEventListener('click', function () { f = { q: '', cat: 'all', when: 'all', city: '', aud: 'all', sort: 'soonest' }; sync(); paintFilters(); paintGrid(); });
        return;
      }
      g.innerHTML = l.map(UI.card.event).join('');
    }
    paint();
    var off = L.on('data', function (k) { if (k === 'core' && ctx.alive()) paint(); });
    ctx.onLeave(function () { off(); killBB(); });
  }

  /* ── one event ──────────────────────────────────────────────────── */

  function eventPage(ctx) {
    var key = ctx.params[0];
    function paint() {
      var e = L.findEvent(key);
      if (!e) {
        if (!D.loaded.core) { ctx.el.innerHTML = '<div class="lv-skel" style="height:80vh;border-radius:0"></div>'; return; }
        L.setMeta('Event not found');
        ctx.el.innerHTML = '<div class="lv-page-top">' + UI.empty('ticket', 'This night has moved on', 'The event has finished, or the organiser has taken it down. There is plenty more on the board.',
          '<a class="lv-btn lv-btn-accent" href="' + L.href.tab('events') + '">See what’s on</a>') + '</div>';
        return;
      }
      L.setMeta(e.title, (e.tagline || '') + ' ' + u.when(e.starts_at) + (e.venue ? ' at ' + e.venue : '') + '. Tickets on Cabana.');
      var cover = e.cover_url || u.arr(e.photos)[0] || '';
      var clip = u.arr(e.videos)[0];
      var t = L.timeTo(e.starts_at, e.ends_at);
      var free = Number(e.price_from) === 0;
      var tiers = u.arr(e.tiers), lineup = u.arr(e.lineup).map(function (a) { return typeof a === 'string' ? a : (a && a.name) || ''; }).filter(Boolean);
      var stream = D.titles.filter(function (x) { return String(x.event_id) === String(e.id); })[0];
      var saved = L.saves.has('event', e.id);
      var facts = [];
      if (e.doors_at) facts.push(['clock', 'Doors ' + new Date(e.doors_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: false })]);
      if (e.age_limit) facts.push(['shield', e.age_limit + '+ only']);
      if (e.dress_code) facts.push(['user', e.dress_code]);
      if (e.accessibility) facts.push(['info', e.accessibility]);
      var soundtrack = lineup.length ? D.chart.tracks.concat(D.chart.releases).filter(function (tr) {
        var a = u.artistOf(tr).toLowerCase();
        return lineup.some(function (n) { n = n.toLowerCase(); return n.length > 2 && (a.indexOf(n) !== -1 || n.indexOf(a) !== -1); });
      }).filter(function (tr, i, arr2) { return arr2.findIndex(function (x) { return x.videoId === tr.videoId; }) === i; }).slice(0, 10) : [];
      var mapQ = e.latitude && e.longitude ? e.latitude + ',' + e.longitude : [e.venue, e.address, e.city].filter(Boolean).join(', ');
      var more = L.upcomingEvents().filter(function (x) { return x.id !== e.id; }).sort(function (a, b) { return (a.category === e.category ? 0 : 1) - (b.category === e.category ? 0 : 1); }).slice(0, 12);

      ctx.el.innerHTML =
        '<section class="lv-hero">' +
          '<div class="lv-hero-bg">' + (cover ? UI.img(cover, '', '', true) : premiumArt()) + (clip && !u.saveData() && !u.reduced() ? '<video src="' + esc(clip) + '" muted loop playsinline autoplay preload="metadata"' + (cover ? ' poster="' + esc(cover) + '"' : '') + '></video>' : '') + '</div>' +
          '<div class="lv-hero-in"><div>' +
            '<div class="lv-bb-chips">' + (t.live ? UI.chip('lv-chip-live', 'Happening now') : UI.chip('lv-chip-soon', u.when(e.starts_at))) +
              (e.organiser_verified ? UI.chip('', 'Verified organiser', 'shield') : '') + (stream ? UI.chip('lv-chip-prem', 'Streams live on Cabana', 'live') : '') + '</div>' +
            '<h1>' + esc(e.title) + '</h1>' +
            (e.tagline ? '<p class="tag">' + esc(e.tagline) + '</p>' : '') +
            '<div class="lv-bb-meta"><span>' + ic('cal') + esc(u.when(e.starts_at, { long: true })) + '</span><span>' + ic('pin') + esc([e.venue, e.city].filter(Boolean).join(', ') || 'Venue to be announced') + '</span></div>' +
            '<div class="lv-bb-acts">' +
              '<button class="lv-btn" type="button" data-act="book" data-id="' + esc(e.id) + '">' + ic('ticket') + (free ? 'Reserve a place' : 'Get tickets') + '</button>' +
              (stream ? '<a class="lv-btn lv-btn-gold" href="' + L.href.title(stream) + '">' + ic('live') + 'Watch live</a>' : '') +
              '<button class="lv-round' + (saved ? ' is-on' : '') + '" type="button" data-act="save" data-kind="event" data-ref="' + esc(e.id) + '" data-remind="1" aria-label="' + (saved ? 'Saved' : 'Remind me') + '">' + ic(saved ? 'check' : 'bell', 2.4) + '</button>' +
              '<button class="lv-round" type="button" data-act="ics" data-id="' + esc(e.id) + '" aria-label="Add to calendar">' + ic('cal') + '</button>' +
              '<button class="lv-round" type="button" data-act="share" aria-label="Share">' + ic('share') + '</button>' +
            '</div>' +
          '</div></div>' +
        '</section>' +
        '<div class="lv-body-sec">' +
          '<div>' +
            (e.description ? '<section class="lv-sec"><h2 class="lv-sec-h">About the night</h2><div class="lv-prose">' + esc(e.description) + '</div></section>' : '') +
            (facts.length ? '<section class="lv-sec"><h2 class="lv-sec-h">Good to know</h2><div class="lv-facts">' + facts.map(function (x) { return '<span class="lv-fact">' + ic(x[0]) + esc(x[1]) + '</span>'; }).join('') + '</div></section>' : '') +
            (lineup.length ? '<section class="lv-sec"><h2 class="lv-sec-h">Line-up</h2><div class="lv-lineup">' + lineup.map(function (n) { return '<a class="lv-act" href="' + L.BASE + '/search?q=' + encodeURIComponent(n) + '">' + ic('music') + esc(n) + '</a>'; }).join('') + '</div></section>' : '') +
            (soundtrack.length ? '<section class="lv-sec"><h2 class="lv-sec-h">Warm up for it</h2><div class="lv-chart" style="padding:0">' + soundtrack.map(function (tr, i) { return L.music ? L.music.row(tr, i, 'soundtrack') : ''; }).join('') + '</div></section>' : '') +
            ((e.address || e.venue) ? '<section class="lv-sec"><h2 class="lv-sec-h">Getting there</h2><div class="lv-prose">' + esc([e.venue, e.address, e.city, e.country].filter(Boolean).join('\n')) + '</div>' +
              '<a class="lv-btn lv-btn-ghost lv-btn-sm" style="margin-top:12px" target="_blank" rel="noopener external" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(mapQ) + '">' + ic('pin') + 'Open in Maps</a></section>' : '') +
            (e.refund_policy ? '<section class="lv-sec"><h2 class="lv-sec-h">Refunds</h2><div class="lv-prose">' + esc(e.refund_policy) + '</div></section>' : '') +
          '</div>' +
          '<aside class="lv-side">' +
            '<div class="lv-panel"><div class="lv-panel-h">' + (t.live ? 'On now' : 'Starts in') + '</div>' + UI.clock(e.starts_at, e.ends_at) +
              (tiers.length ? tiers.map(function (x, i) {
                var gone = x.qty != null && x.sold != null && x.sold >= x.qty;
                return '<div class="lv-tier' + (gone ? ' gone' : '') + '"><div><div class="lv-tier-n">' + esc(x.name || 'Tier ' + (i + 1)) + '</div>' + (x.note ? '<div class="lv-tier-note">' + esc(x.note) + '</div>' : '') + (gone ? '<div class="lv-tier-note" style="color:#FF6B81">Sold out</div>' : '') + '</div><div class="lv-tier-p">' + (Number(x.price_kes) === 0 ? 'Free' : esc(u.money(x.price_kes, e.currency))) + '</div></div>';
              }).join('') : '<div class="lv-tier"><div class="lv-tier-n">' + (free ? 'Free entry' : 'Tickets') + '</div><div class="lv-tier-p">' + (free ? 'Free' : 'From ' + esc(u.money(e.price_from, e.currency))) + '</div></div>') +
              '<button class="lv-btn" type="button" data-act="book" data-id="' + esc(e.id) + '" style="width:100%;margin-top:14px">' + ic('ticket') + (free ? 'Reserve a place' : 'Get tickets') + '</button>' +
              '<p style="margin:10px 0 0;font-size:12px;color:var(--lv-ink-3);text-align:center">Face value. Cabana adds nothing to the ticket price.</p>' +
            '</div>' +
            (e.organiser_name ? '<div class="lv-panel"><div class="lv-panel-h">Presented by</div><div class="lv-org">' + (u.safeUrl(e.organiser_logo) ? '<img src="' + esc(e.organiser_logo) + '" alt=""/>' : '<span class="ph">' + esc(e.organiser_name.charAt(0)) + '</span>') +
              '<div><b>' + esc(e.organiser_name) + (e.organiser_verified ? ic('shield') : '') + '</b><small>' + (e.organiser_kind === 'cabana' ? 'A Cabana night' : 'Independent organiser') + '</small></div></div></div>' : '') +
          '</aside>' +
        '</div>' +
        (more.length ? UI.row({ title: 'More nights like this', items: more, render: UI.card.event, col: 'clamp(200px, 17vw, 250px)', all: L.href.tab('events') }) : '') +
        '<div class="lv-bookbar"><div><b>' + (free ? 'Free' : esc(u.money(e.price_from, e.currency))) + '</b><small>' + esc(u.when(e.starts_at)) + '</small></div><button class="lv-btn" type="button" data-act="book" data-id="' + esc(e.id) + '">' + (free ? 'Reserve' : 'Get tickets') + '</button></div>';
      doc.body.classList.add('lv-has-bookbar');
      UI.wireRails(ctx.el);
    }
    paint();
    var off = L.on('data', function (k) { if (ctx.alive() && (k === 'core' || k === 'chart')) paint(); });
    ctx.onLeave(function () { off(); doc.body.classList.remove('lv-has-bookbar'); });
  }

  /* ── live, movies, shows ────────────────────────────────────────── */

  var TAB_COPY = {
    live: { title: 'Live', k: 'Streaming as it happens', meta: 'Live concerts, comedy and big nights streamed on Cabana, with replays.', icon: 'live',
      empty: 'The first live nights are being lined up. When a show goes live it lights up here, with a countdown before and a replay after.' },
    movies: { title: 'Movies', k: 'Cinema at home', meta: 'Films on Cabana Live: African cinema and the films everyone is talking about.', icon: 'film',
      empty: 'The film shelf is being stocked. Start your free month now and every film opens the day it lands.' },
    shows: { title: 'Shows', k: 'Series worth a weekend', meta: 'Series on Cabana Live, with new episodes as they land.', icon: 'tv',
      empty: 'Series are on their way. Your free month covers every episode of everything that arrives.' }
  };

  function shelfTab(kindKey) {
    return function (ctx) {
      var copy = TAB_COPY[kindKey];
      L.setMeta(copy.title, copy.meta);
      var genre = ctx.query.get('genre') || 'all';
      function paint() {
        var kinds = { live: ['live', 'special'], movies: ['movie'], shows: ['show'] }[kindKey];
        var pool = D.titles.filter(function (t) { return kinds.indexOf(t.kind) !== -1; });
        var slides = D.loaded.core ? L.slidesFor(kindKey) : [];
        ctx.el.innerHTML = (slides.length && pool.length ? '<div data-bb></div>' : '<header class="lv-head"><div class="lv-head-k">' + esc(copy.k) + '</div><h1>' + esc(copy.title) + '</h1><p>' + esc(copy.meta) + '</p></header>') +
          '<div class="lv-rows" data-rows' + (slides.length && pool.length ? '' : ' style="margin-top:0"') + '></div>';
        if (slides.length && pool.length) mountBB(ctx, kindKey, { short: false, label: copy.title });
        var rows = u.qs('[data-rows]', ctx.el), html = '';
        if (!D.loaded.core) { rows.innerHTML = '<div class="lv-grid lv-grid-poster">' + new Array(9).join('.').split('.').map(function () { return '<div class="lv-skel" style="aspect-ratio:2/3"></div>'; }).join('') + '</div>'; return; }
        if (!pool.length) {
          rows.innerHTML = UI.premium() + UI.empty(copy.icon, copy.title + ' are coming', copy.empty,
            (L.premium() ? '' : '<button class="lv-btn lv-btn-gold" type="button" data-act="premium">' + ic('crown') + 'Start my free month</button>') +
            '<a class="lv-btn lv-btn-ghost" href="' + L.href.tab('music') + '">' + ic('music') + 'Play the chart</a><a class="lv-btn lv-btn-ghost" href="' + L.href.tab('events') + '">' + ic('ticket') + 'See events</a>') + UI.soonGrid();
          UI.wireRails(rows);
          return;
        }
        if (kindKey === 'live') {
          var on = pool.filter(function (t) { return L.titleState(t) === 'live'; });
          var up = pool.filter(function (t) { return L.titleState(t) === 'upcoming'; }).sort(function (a, b) { return Date.parse(a.live_starts_at) - Date.parse(b.live_starts_at); });
          var rep = pool.filter(function (t) { var s = L.titleState(t); return s === 'replay' || (t.kind === 'special' && s === 'available'); });
          html += UI.row({ title: 'On now ' + (on.length ? UI.chip('lv-chip-live', on.length + ' live') : ''), items: on, render: UI.card.wideTitle, col: 'clamp(300px, 32vw, 460px)' });
          if (!L.premium()) html += UI.premium();
          html += UI.row({ title: 'Starting soon', sub: 'Set a reminder and we will hold your seat', items: up, render: UI.card.wideTitle, col: 'clamp(280px, 28vw, 400px)' });
          html += UI.row({ title: 'Replays and specials', items: rep, render: UI.card.wideTitle, col: 'clamp(280px, 28vw, 400px)' });
        } else {
          var genres = {};
          pool.forEach(function (t) { (t.genres || []).forEach(function (g) { genres[g] = (genres[g] || 0) + 1; }); });
          var gl = Object.keys(genres).sort(function (a, b) { return genres[b] - genres[a]; });
          var avail = pool.filter(function (t) { return L.titleState(t) !== 'soon'; });
          html += UI.row({ title: 'Featured', items: avail.filter(function (t) { return t.featured; }), render: UI.card.poster, col: 'clamp(160px, 14vw, 210px)' });
          if (!L.premium()) html += UI.premium();
          html += UI.row({ title: 'New arrivals', items: avail.filter(L.isNew), render: UI.card.poster, col: 'clamp(160px, 14vw, 210px)' });
          gl.slice(0, 6).forEach(function (g) {
            html += UI.row({ title: esc(g), items: avail.filter(function (t) { return (t.genres || []).indexOf(g) !== -1; }), render: UI.card.poster, col: 'clamp(150px, 13vw, 200px)' });
          });
          html += UI.row({ title: 'Coming soon', items: pool.filter(function (t) { return L.titleState(t) === 'soon'; }), render: UI.card.wideTitle, col: 'clamp(280px, 26vw, 380px)' });
          html += '<section class="lv-row"><div class="lv-row-h"><div><h2 class="lv-row-t">All ' + esc(copy.title.toLowerCase()) + '</h2></div></div>' +
            (gl.length ? '<div class="lv-filters"><div class="lv-pills" role="group" aria-label="Genre">' + ['all'].concat(gl).map(function (g) { return '<button class="lv-pill" type="button" data-genre="' + esc(g) + '" aria-pressed="' + (genre === g) + '">' + (g === 'all' ? 'Everything' : esc(g)) + '</button>'; }).join('') + '</div></div>' : '') +
            '<div class="lv-grid lv-grid-poster" data-all>' + avail.filter(function (t) { return genre === 'all' || (t.genres || []).indexOf(genre) !== -1; }).map(UI.card.poster).join('') + '</div></section>';
        }
        rows.innerHTML = html;
        UI.wireRails(rows);
        rows.addEventListener('click', function (e) {
          var b = e.target.closest('[data-genre]'); if (!b) return;
          genre = b.getAttribute('data-genre');
          history.replaceState({ lv: 1 }, '', location.pathname + (genre !== 'all' ? '?genre=' + encodeURIComponent(genre) : ''));
          paint();
        });
      }
      paint();
      var off = L.on('data', function (k) { if (k === 'core' && ctx.alive()) paint(); });
      var off2 = L.on('state', function () { if (ctx.alive()) paint(); });
      ctx.onLeave(function () { off(); off2(); killBB(); });
    };
  }

  /* ── one title ──────────────────────────────────────────────────── */

  function titlePage(ctx) {
    var key = ctx.params[0];
    var season = null;
    function paint() {
      var t = L.findTitle(key);
      if (!t) {
        if (!D.loaded.core) { ctx.el.innerHTML = '<div class="lv-skel" style="height:86vh;border-radius:0"></div>'; return; }
        L.setMeta('Not found');
        ctx.el.innerHTML = '<div class="lv-page-top">' + UI.empty('film', 'We could not find that', 'It may have left Cabana Live, or the link is not quite right.', '<a class="lv-btn lv-btn-accent" href="' + L.BASE + '">Back to Cabana Live</a>') + '</div>';
        return;
      }
      L.setMeta(t.title, (t.tagline || t.synopsis || '').slice(0, 150));
      L.setTab({ movie: 'movies', show: 'shows', live: 'live', special: 'live' }[t.kind] || 'movies');
      var st = L.titleState(t), saved = L.saves.has('title', t.id);
      var eps = D.episodes[t.id] || null;
      if (t.kind === 'show' && !eps) L.loadEpisodes(t.id).then(function () { if (ctx.alive()) paint(); });
      var seasons = eps ? eps.map(function (e) { return e.season; }).filter(function (s, i, a) { return a.indexOf(s) === i; }) : [];
      if (season == null && seasons.length) season = seasons[0];
      var ev = t.event_id ? L.findEvent(t.event_id) : null;
      var more = D.titles.filter(function (x) { return x.id !== t.id && (x.kind === t.kind || (x.genres || []).some(function (g) { return (t.genres || []).indexOf(g) !== -1; })); }).slice(0, 14);
      var play;
      if (st === 'soon') play = '<button class="lv-btn" type="button" data-act="save" data-kind="title" data-ref="' + esc(t.id) + '" data-remind="1">' + ic('bell') + (saved ? 'Reminder set' : 'Remind me') + '</button>';
      else if (st === 'upcoming') play = '<button class="lv-btn" type="button" data-act="save" data-kind="title" data-ref="' + esc(t.id) + '" data-remind="1">' + ic('bell') + (saved ? 'Reminder set' : 'Remind me') + '</button>';
      else if (st === 'ended') play = '<span class="lv-btn lv-btn-ghost" aria-disabled="true">This stream has ended</span>';
      else play = '<button class="lv-btn' + (st === 'live' ? ' lv-btn-live' : '') + '" type="button" data-act="play" data-id="' + esc(t.id) + '">' + ic('play') + (st === 'live' ? 'Watch live' : st === 'replay' ? 'Watch the replay' : t.kind === 'show' ? 'Play episode 1' : 'Play') + '</button>';
      var cast = (t.cast_list || []).map(function (c) { return typeof c === 'string' ? { name: c } : c; }).filter(function (c) { return c && c.name; });

      ctx.el.innerHTML =
        '<section class="lv-hero" style="' + (t.accent ? '--lv-a1:' + esc(t.accent) + ';' : '') + '">' +
          '<div class="lv-hero-bg" data-hero-bg>' + (t.backdrop_url || t.poster_url ? UI.img(t.backdrop_url || t.poster_url, '', '', true) : premiumArt()) + '</div>' +
          '<div class="lv-hero-in"><div>' +
            '<div class="lv-bb-chips">' + UI.titleChips(t, 4) + '</div>' +
            (u.safeUrl(t.logo_url) ? '<img class="lv-bb-logo" src="' + esc(t.logo_url) + '" alt="' + esc(t.title) + '"/><h1 class="lv-sr">' + esc(t.title) + '</h1>' : '<h1>' + esc(t.title) + '</h1>') +
            (st === 'upcoming' ? '<div class="lv-bb-clock" data-bb-clock="' + esc(t.live_starts_at) + '" style="opacity:1;transform:none">' + ['Days', 'Hrs', 'Min', 'Sec'].map(function (l) { return '<div><b>--</b><small>' + l + '</small></div>'; }).join('') + '</div>' : '') +
            (st === 'soon' ? '<div class="lv-bb-meta" style="margin-bottom:10px"><span class="hot">' + ic('cal') + 'Arrives ' + esc(u.when(t.release_at, { long: true })) + '</span></div>' : '') +
            '<div class="lv-bb-meta">' + UI.titleMeta(t) + (t.language ? ' · ' + esc(t.language) : '') + '</div>' +
            (t.tagline ? '<p class="tag">' + esc(t.tagline) + '</p>' : '') +
            (t.synopsis ? '<p class="syn">' + esc(t.synopsis) + '</p>' : '') +
            '<div class="lv-bb-acts">' + play +
              (t.trailer_youtube || t.trailer_url ? '<button class="lv-btn lv-btn-glass" type="button" data-act="trailer" data-id="' + esc(t.id) + '">' + ic('film') + 'Trailer</button>' : '') +
              '<button class="lv-round' + (saved ? ' is-on' : '') + '" type="button" data-act="save" data-kind="title" data-ref="' + esc(t.id) + '" aria-label="' + (saved ? 'Remove from' : 'Add to') + ' My List">' + ic(saved ? 'check' : 'plus', 2.4) + '</button>' +
              '<button class="lv-round" type="button" data-act="share" aria-label="Share">' + ic('share') + '</button>' +
              (u.safeUrl(t.external_url) ? '<a class="lv-btn lv-btn-ghost" href="' + esc(t.external_url) + '" target="_blank" rel="noopener external">' + ic('ext') + esc(t.external_label || 'Watch on partner') + '</a>' : '') +
            '</div>' +
            (t.available_on ? '<div class="lv-bb-avail" style="opacity:1;transform:none">Available on <b>' + esc(t.available_on) + '</b></div>' : (t.access === 'premium' ? '<div class="lv-bb-avail" style="opacity:1;transform:none">' + (L.premium() ? 'Included with your <b>Premium</b>' : 'Included in <b>Cabana Live Premium</b> · enjoy one month free') + '</div>' : '')) +
          '</div></div>' +
        '</section>' +
        '<div class="lv-body-sec" style="grid-template-columns:minmax(0,1fr)">' +
          '<div>' +
            (t.kind === 'show' ? '<section class="lv-sec"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px"><h2 class="lv-sec-h" style="margin:0">Episodes</h2>' +
              (seasons.length > 1 ? '<select class="lv-select" data-season aria-label="Season">' + seasons.map(function (s) { return '<option value="' + s + '"' + (s === season ? ' selected' : '') + '>Season ' + s + '</option>'; }).join('') + '</select>' : (seasons.length ? '<span class="lv-chip">Season ' + season + '</span>' : '')) + '</div>' +
              (eps ? (eps.length ? '<div class="lv-eps">' + eps.filter(function (e) { return e.season === season; }).map(function (e) {
                return '<button class="lv-ep" type="button" data-act="play" data-id="' + esc(t.id) + '" data-ep="' + esc(e.id) + '"><span class="lv-ep-n">' + e.number + '</span>' +
                  '<span class="lv-ep-art">' + (u.safeUrl(e.still_url || t.backdrop_url) ? '<img src="' + esc(e.still_url || t.backdrop_url) + '" alt="" loading="lazy"/>' : '') + '<span class="lv-card-play">' + ic('play') + '</span></span>' +
                  '<span><span class="lv-ep-t">' + esc(e.name) + ' ' + ((e.access || t.access) === 'free' && t.access === 'premium' ? UI.chip('lv-chip-free', 'Free') : '') + '</span><span class="lv-ep-s">' + esc(e.synopsis || '') + '</span></span>' +
                  '<span class="lv-ep-d">' + esc(u.runtime(e.runtime_min)) + '</span></button>';
              }).join('') + '</div>' : '<p class="lv-prose">Episodes are on their way.</p>') : '<div class="lv-skel" style="height:120px"></div>') + '</section>' : '') +
            (cast.length || t.credits ? '<section class="lv-sec"><h2 class="lv-sec-h">Cast and crew</h2><div class="lv-cast">' + cast.map(function (c) { return '<span><b>' + esc(c.name) + '</b>' + (c.role ? ' · ' + esc(c.role) : '') + '</span>'; }).join('') + '</div>' + (t.credits ? '<p class="lv-prose" style="margin-top:10px">' + esc(t.credits) + '</p>' : '') + '</section>' : '') +
            (ev ? '<section class="lv-sec"><h2 class="lv-sec-h">Be there in person</h2><div style="max-width:260px">' + UI.card.event(ev) + '</div></section>' : '') +
          '</div>' +
        '</div>' +
        (more.length ? UI.row({ title: 'More like this', items: more, render: UI.card.poster, col: 'clamp(150px, 13vw, 200px)' }) : '');

      UI.wireRails(ctx.el);
      var sel = u.qs('[data-season]', ctx.el);
      if (sel) sel.addEventListener('change', function () { season = Number(sel.value); paint(); });
      heroTrailer(t);
      if (ctx.query.get('play') === '1' && !ctx._autoplayed && st !== 'soon' && st !== 'upcoming') {
        ctx._autoplayed = true;
        setTimeout(function () { if (ctx.alive() && L.player) L.player.open(t); }, 250);
      }
    }

    /* The trailer plays silently behind the title after a beat, the way
       a lobby screen does. Desktop only, never on data saver. */
    var trailerT = null;
    function heroTrailer(t) {
      clearTimeout(trailerT);
      if (!t.trailer_youtube || u.saveData() || u.reduced() || global.innerWidth < 900) return;
      trailerT = setTimeout(function () {
        var bg = u.qs('[data-hero-bg]', ctx.el);
        if (!bg || !ctx.alive() || u.qs('iframe', bg)) return;
        var f = doc.createElement('iframe');
        f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1; f.title = '';
        f.allow = 'autoplay; encrypted-media';
        f.src = 'https://www.youtube-nocookie.com/embed/' + t.trailer_youtube + '?autoplay=1&mute=1&controls=0&loop=1&playlist=' + t.trailer_youtube + '&playsinline=1&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&fs=0';
        UI.ytWatch(f, function () { setTimeout(function () { f.classList.add('is-ready'); }, 350); });
        bg.insertBefore(f, bg.firstChild ? bg.firstChild.nextSibling : null);
      }, 2200);
    }

    paint();
    var clockT = setInterval(function () {
      u.qsa('[data-bb-clock]', ctx.el).forEach(function (c) {
        var tt = L.timeTo(c.getAttribute('data-bb-clock'));
        if (tt.live) { paint(); return; }
        var b = u.qsa('b', c), v = [String(tt.d), u.pad(tt.h), u.pad(tt.m), u.pad(tt.s)];
        b.forEach(function (x, i) { x.textContent = v[i]; });
      });
    }, 1000);
    var off = L.on('data', function (k) { if (k === 'core' && ctx.alive()) paint(); });
    var off2 = L.on('saves', function () { if (ctx.alive()) paint(); });
    var off3 = L.on('state', function () { if (ctx.alive()) paint(); });
    ctx.onLeave(function () { off(); off2(); off3(); clearInterval(clockT); clearTimeout(trailerT); });
  }

  /* ── my list ────────────────────────────────────────────────────── */

  function myListItems() {
    return L.saves.all().sort(function (a, b) { return Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0); }).map(function (s) {
      if (s.kind === 'title') { var t = L.findTitle(s.ref); return t ? { kind: 'title', t: t } : null; }
      if (s.kind === 'event') { var e = L.findEvent(s.ref); return e ? { kind: 'event', e: e } : null; }
      if (s.kind === 'track') { var tr = L.findTrack(s.ref) || { videoId: s.ref, title: 'Saved track', artist: '' }; return u.ytId(s.ref) ? { kind: 'track', tr: tr } : null; }
      return null;
    }).filter(Boolean);
  }
  function renderSaved(x) {
    if (x.kind === 'title') return UI.card.poster(x.t);
    if (x.kind === 'event') return UI.card.event(x.e);
    return UI.card.track(x.tr, { queue: 'saved' });
  }

  function myList(ctx) {
    L.setMeta('My List');
    function paint() {
      var items = myListItems();
      var titles = items.filter(function (x) { return x.kind === 'title'; }), evs = items.filter(function (x) { return x.kind === 'event'; }), trs = items.filter(function (x) { return x.kind === 'track'; });
      ctx.el.innerHTML = '<header class="lv-head"><div class="lv-head-k">Saved for later</div><h1>My List</h1><p>Films and shows to watch, events to be reminded about, and songs to come back to. Anything you save with the heart, plus or bell lands here. ' + (L.signedIn() ? 'It is kept on your Cabana account, on every device.' : 'It is kept on this device for now. <a href="' + esc(L.signInUrl()) + '" rel="external" style="color:#fff;font-weight:700">Sign in</a> to keep it everywhere.') + '</p></header>' +
        (!items.length ? UI.empty('heart', 'Nothing saved yet', 'Tap the plus on any film, the bell on any event, or the heart on a record, and it waits for you here.', '<a class="lv-btn lv-btn-accent" href="' + L.BASE + '">Browse Cabana Live</a>') : '') +
        UI.row({ title: 'Films and shows', items: titles, render: renderSaved, col: 'clamp(150px, 13vw, 200px)' }) +
        UI.row({ title: 'Events and reminders', items: evs, render: renderSaved, col: 'clamp(200px, 17vw, 250px)' }) +
        UI.row({ title: 'Saved music', items: trs, render: renderSaved, col: 'clamp(260px, 24vw, 340px)' });
      UI.wireRails(ctx.el);
    }
    paint();
    var off = L.on('saves', function () { if (ctx.alive()) paint(); });
    var off2 = L.on('data', function () { if (ctx.alive()) paint(); });
    ctx.onLeave(function () { off(); off2(); });
  }

  /* ── search ─────────────────────────────────────────────────────── */

  function search(ctx) {
    L.setMeta('Search');
    var q = ctx.query.get('q') || '';
    ctx.el.innerHTML = '<header class="lv-head"><div class="lv-head-k">Everything on Cabana Live</div><h1>Search</h1></header>' +
      '<div class="lv-filters"><label class="lv-search" style="max-width:720px;flex-basis:100%">' + ic('search') + '<input type="search" data-q placeholder="Films, shows, events, venues, artists, songs" value="' + esc(q) + '" aria-label="Search Cabana Live" autocomplete="off"/></label></div>' +
      '<div data-results></div>';
    var input = u.qs('[data-q]', ctx.el);
    setTimeout(function () { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }, 60);
    function paint() {
      var s = q.trim().toLowerCase(), host = u.qs('[data-results]', ctx.el);
      if (s.length < 2) {
        host.innerHTML = UI.row({ title: 'Trending in Kenya', items: D.chart.tracks.slice(0, 12), render: function (t) { return UI.card.track(t, { queue: 'chart' }); }, col: 'clamp(260px, 24vw, 340px)' }) +
          UI.row({ title: 'Coming up', items: L.upcomingEvents().slice(0, 12), render: UI.card.event, col: 'clamp(200px, 17vw, 250px)' });
        UI.wireRails(host);
        return;
      }
      var has = function (arr2) { return arr2.join(' ').toLowerCase().indexOf(s) !== -1; };
      var titles = D.titles.filter(function (t) { return has([t.title, t.tagline, t.synopsis].concat(t.genres || [], (t.cast_list || []).map(function (c) { return c && (c.name || c); }))); });
      var evs = L.upcomingEvents().filter(function (e) { return has([e.title, e.tagline, e.venue, e.city, e.organiser_name].concat(u.arr(e.tags), u.arr(e.lineup).map(function (a) { return typeof a === 'string' ? a : a && a.name; }))); });
      var seen = {}, tracks = D.chart.tracks.concat(D.chart.releases).filter(function (t) { if (seen[t.videoId]) return false; seen[t.videoId] = 1; return has([t.title, t.artist, t.genre || '']); });
      var total = titles.length + evs.length + tracks.length;
      host.innerHTML = '<div class="lv-count"><b>' + total + '</b> result' + (total === 1 ? '' : 's') + ' for “' + esc(q) + '”</div>' +
        UI.row({ title: 'Films, shows and live', items: titles, render: UI.card.poster, col: 'clamp(150px, 13vw, 200px)' }) +
        UI.row({ title: 'Events', items: evs, render: UI.card.event, col: 'clamp(200px, 17vw, 250px)' }) +
        UI.row({ title: 'Music on the chart', items: tracks, render: function (t) { return UI.card.track(t, { queue: 'search' }); }, col: 'clamp(260px, 24vw, 340px)' }) +
        '<div data-yt></div>';
      UI.wireRails(host);
      if (L.music && L.music.searchInto) L.music.searchInto(u.qs('[data-yt]', host), q, !total);
    }
    input.addEventListener('input', u.debounce(function () {
      q = input.value;
      history.replaceState({ lv: 1 }, '', location.pathname + (q.trim() ? '?q=' + encodeURIComponent(q.trim()) : ''));
      paint();
    }, 220));
    paint();
    var off = L.on('data', function () { if (ctx.alive()) paint(); });
    ctx.onLeave(off);
  }

  /* ── actions (one handler for every button on the platform) ─────── */

  doc.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    var act = b.getAttribute('data-act');
    if (act === 'play') {
      e.preventDefault();
      var t = L.findTitle(b.getAttribute('data-id'));
      if (t && L.player) L.player.open(t, b.getAttribute('data-ep') || null);
    } else if (act === 'trailer') {
      e.preventDefault();
      var tt = L.findTitle(b.getAttribute('data-id'));
      if (tt && L.player) L.player.trailer(tt);
    } else if (act === 'save') {
      e.preventDefault();
      var on = L.saves.toggle(b.getAttribute('data-kind'), b.getAttribute('data-ref'), { remind: b.getAttribute('data-remind') === '1' });
      if (b.classList.contains('lv-round')) {
        b.classList.toggle('is-on', on);
        b.innerHTML = ic(on ? 'check' : (b.getAttribute('data-remind') === '1' ? 'bell' : 'plus'), 2.4);
      }
    } else if (act === 'book') {
      e.preventDefault();
      var ev = L.findEvent(b.getAttribute('data-id'));
      if (!ev) return;
      if (global.CabanaEventBook && typeof global.CabanaEventBook.open === 'function') global.CabanaEventBook.open(ev);
      else if (global.CabanaSupport && global.CabanaSupport.ask) global.CabanaSupport.ask('I would like tickets for: ' + (ev.title || ''));
      else location.href = '/help';
    } else if (act === 'premium') {
      e.preventDefault();
      if (L.premium()) { L.toast('You already have Cabana Live Premium.'); return; }
      L.gate(L.signedIn() ? 'premium' : 'signin');
    } else if (act === 'share') {
      e.preventDefault();
      L.share(doc.title, '', location.href);
    } else if (act === 'ics') {
      e.preventDefault();
      var evc = L.findEvent(b.getAttribute('data-id'));
      if (evc) L.ics(evc);
    }
  });

  /* ── routes ─────────────────────────────────────────────────────── */

  L.route(/^\/events$/, home, { tab: 'home' });
  L.route(/^\/events\/whats-on$/, eventsTab, { tab: 'events' });
  L.route(/^\/events\/live$/, shelfTab('live'), { tab: 'live' });
  L.route(/^\/events\/movies$/, shelfTab('movies'), { tab: 'movies' });
  L.route(/^\/events\/shows$/, shelfTab('shows'), { tab: 'shows' });
  L.route(/^\/events\/e\/([^/]+)$/, eventPage, { tab: 'events', detail: true });
  L.route(/^\/events\/watch\/([a-z0-9-]+)$/, titlePage, { tab: 'movies', detail: true, byTitle: true });
  L.route(/^\/events\/my-list$/, myList, { tab: 'home', detail: true });
  L.route(/^\/events\/search$/, search, { tab: 'home', detail: true });
})(window);
