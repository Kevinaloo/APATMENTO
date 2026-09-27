/* ═══════════════════════════════════════════════════════════════════
   CABANA LIVE · the music room
   ───────────────────────────────────────────────────────────────────
   Three surfaces, one player.

     /events/music                 the room: the chart, playlists, new
                                   releases, who is standing where
     /events/music/<videoId>       the party: the video on a stage, the
                                   light moving with the tempo, everyone
                                   else in the room reacting with you
     /events/music/playlist/<s>    a curated playlist

   ONE YouTube player serves the whole platform. It sits in the dock at
   the bottom while you browse and grows onto the party stage when you
   go in, moved by geometry rather than re-parented, so the song never
   restarts. Nothing makes a sound until somebody presses play.

   The party room is shared. Everyone on the same record is in the same
   Supabase Realtime channel: the count is presence, the reactions are
   broadcast. Neither touches the database.

   The light show never strobes. The ring breathes on the beat and the
   beat is clamped to 2.5 per second, well under the three-flashes rule.
   Under reduced motion it holds still.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var L = global.CabanaLive;
  if (!L) return;
  var u = L.u, esc = u.esc, ic = L.ic, UI = L.ui, D = L.data, doc = global.document;
  var M = L.music = {};

  var BPM = { amapiano: 112, afrobeat: 104, afropop: 104, gengetone: 100, drill: 142, bongo: 98, gospel: 92, reggae: 84, hiphop: 92, rnb: 78, tribal: 110, other: 104 };
  var SHELVES = [['all', 'Everything'], ['afrobeat', 'Afrobeats'], ['afropop', 'Afropop'], ['amapiano', 'Amapiano'], ['gengetone', 'Gengetone'], ['drill', 'Drill'], ['bongo', 'Bongo'], ['hiphop', 'Hip hop'], ['rnb', 'R&B'], ['gospel', 'Gospel'], ['reggae', 'Reggae'], ['tribal', 'Mother tongue']];
  var REACTIONS = ['🔥', '🙌', '💃', '❤️', '🎉', '🥁'];

  var P = { api: null, apiP: null, yt: null, ready: false, queue: [], qname: '', idx: -1, track: null, playing: false, stage: false, progT: null, pending: null };
  var els = {};
  var searchResults = [];
  var ctxQueues = {};

  /* ── queues ─────────────────────────────────────────────────────── */

  function queueFor(name) {
    name = name || 'chart';
    if (ctxQueues[name]) return ctxQueues[name];
    if (name === 'chart') return D.chart.tracks;
    if (name === 'releases') return D.chart.releases.slice().sort(function (a, b) { return Date.parse(b.published) - Date.parse(a.published); });
    if (name === 'fastest') return D.chart.releases.slice().sort(function (a, b) { return (b.velocity || 0) - (a.velocity || 0); });
    if (name === 'search') return searchResults;
    if (name === 'saved') return L.saves.all().filter(function (s) { return s.kind === 'track'; }).map(function (s) { return L.findTrack(s.ref) || { videoId: s.ref, title: 'Saved track', artist: '' }; });
    if (name.indexOf('playlist:') === 0) { var p = D.playlists.filter(function (x) { return x.slug === name.slice(9); })[0]; return p ? p.items : []; }
    if (name.indexOf('genre:') === 0) { var g = name.slice(6); return pool().filter(function (t) { return t.genre === g; }); }
    if (name.indexOf('artist:') === 0) { var a = name.slice(7).toLowerCase(); return pool().filter(function (t) { return u.artistOf(t).toLowerCase() === a || String(t.artist || '').toLowerCase() === a; }); }
    return D.chart.tracks;
  }
  function pool() {
    var seen = {};
    return D.chart.tracks.concat(D.chart.releases).filter(function (t) { if (seen[t.videoId]) return false; seen[t.videoId] = 1; return true; });
  }
  M.setQueue = function (name, list) { ctxQueues[name] = list; };

  /* ── the YouTube player ─────────────────────────────────────────── */

  function api() {
    if (global.YT && global.YT.Player) return Promise.resolve(global.YT);
    if (P.apiP) return P.apiP;
    P.apiP = new Promise(function (resolve, reject) {
      var prev = global.onYouTubeIframeAPIReady;
      global.onYouTubeIframeAPIReady = function () { if (prev) try { prev(); } catch (e) {} resolve(global.YT); };
      var s = doc.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      s.onerror = function () { P.apiP = null; reject(new Error('yt')); };
      doc.head.appendChild(s);
    });
    return P.apiP;
  }

  function buildDock() {
    if (els.dock) return;
    var dock = doc.createElement('div');
    dock.className = 'lv-dock';
    dock.id = 'lv-dock';
    dock.setAttribute('role', 'region');
    dock.setAttribute('aria-label', 'Now playing');
    dock.innerHTML =
      '<div class="lv-dock-prog" data-m="seek" role="slider" aria-label="Seek"><i></i></div>' +
      '<div class="lv-dock-video" data-m="slot"></div>' +
      '<div class="lv-dock-info" data-m="party-open" role="button" tabindex="0" aria-label="Open the party room"><div class="lv-dock-t"></div><div class="lv-dock-a"></div></div>' +
      '<span class="lv-dock-time">0:00 / 0:00</span>' +
      '<div class="lv-dock-ctrl">' +
        '<button class="lv-pbtn prev" type="button" data-m="prev" aria-label="Previous">' + ic('prev') + '</button>' +
        '<button class="lv-pbtn main" type="button" data-m="toggle" aria-label="Pause">' + ic('pause') + '</button>' +
        '<button class="lv-pbtn" type="button" data-m="next" aria-label="Next">' + ic('next') + '</button>' +
      '</div>' +
      '<button class="lv-dock-party" type="button" data-m="party-open">' + ic('party') + '<span>Party</span></button>' +
      '<button class="lv-pbtn" type="button" data-m="close" aria-label="Stop and close">' + ic('x') + '</button>';
    doc.body.appendChild(dock);
    var yt = doc.createElement('div');
    yt.className = 'lv-yt';
    yt.id = 'lv-yt';
    yt.innerHTML = '<div id="lv-yt-host"></div>';
    doc.body.appendChild(yt);
    els.dock = dock; els.yt = yt;
    els.slot = u.qs('[data-m="slot"]', dock);
    els.t = u.qs('.lv-dock-t', dock); els.a = u.qs('.lv-dock-a', dock);
    els.time = u.qs('.lv-dock-time', dock); els.bar = u.qs('.lv-dock-prog i', dock);
    els.toggle = u.qs('[data-m="toggle"]', dock);

    dock.addEventListener('click', function (e) {
      var b = e.target.closest('[data-m]'); if (!b) return;
      var m = b.getAttribute('data-m');
      if (m === 'toggle') M.toggle();
      else if (m === 'next') M.next();
      else if (m === 'prev') M.prev();
      else if (m === 'close') M.stop();
      else if (m === 'party-open' && P.track) L.go(L.href.track(P.track.videoId));
      else if (m === 'seek') seekFrac(e, b);
    });
    dock.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.getAttribute('data-m') === 'party-open' && P.track) L.go(L.href.track(P.track.videoId)); });
    dock.addEventListener('transitionend', layout);
    global.addEventListener('resize', u.debounce(layout, 60));
    if (global.ResizeObserver) new ResizeObserver(function () { layout(); }).observe(doc.body);
  }

  function seekFrac(e, bar) {
    if (!P.yt || !P.ready) return;
    var r = bar.getBoundingClientRect();
    var d = P.yt.getDuration ? P.yt.getDuration() : 0;
    if (d) P.yt.seekTo(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * d, true);
  }

  /* Put the one frame over whichever box it belongs to. */
  function layout() {
    var yt = els.yt;
    if (!yt) return;
    if (!P.track) { yt.classList.remove('is-on'); return; }
    var box;
    if (P.stage) {
      var stage = u.qs('.lv-party-stage');
      if (stage) {
        var sr = stage.getBoundingClientRect();
        var w = Math.min(sr.width, sr.height * 16 / 9, 1400), h = w * 9 / 16;
        box = { left: sr.left + (sr.width - w) / 2, top: sr.top + (sr.height - h) / 2, width: w, height: h };
        var slot = u.qs('.lv-party-slot');
        if (slot) { slot.style.width = w + 'px'; slot.style.height = h + 'px'; }
      }
    }
    if (!box && els.slot) box = els.slot.getBoundingClientRect();
    if (!box) return;
    yt.style.left = box.left + 'px'; yt.style.top = box.top + 'px';
    yt.style.width = box.width + 'px'; yt.style.height = box.height + 'px';
    yt.classList.toggle('is-stage', !!P.stage);
    yt.classList.add('is-on');
  }
  M.layout = layout;

  function create(vid) {
    return api().then(function (YT) {
      if (P.yt) return P.yt;
      return new Promise(function (resolve) {
        P.yt = new YT.Player('lv-yt-host', {
          host: 'https://www.youtube-nocookie.com',
          videoId: vid,
          width: '100%', height: '100%',
          playerVars: { autoplay: 1, controls: u.hover() ? 0 : 1, playsinline: 1, rel: 0, modestbranding: 1, iv_load_policy: 3, disablekb: 1, fs: 0, origin: location.origin },
          events: {
            onReady: function () { P.ready = true; try { P.yt.playVideo(); } catch (e) {} resolve(P.yt); },
            onStateChange: onState,
            onError: onError
          }
        });
      });
    });
  }

  function onState(e) {
    var s = e.data;
    if (s === 1) { P.playing = true; failures = 0; tick(true); }
    else if (s === 2 || s === -1 || s === 5) { P.playing = false; tick(false); }
    else if (s === 0) { P.playing = false; tick(false); M.next(true); }
    paintState();
  }
  /* One blocked video is skipped. Four in a row means YouTube is not
     playing here at all (a network that blocks it, an extension), and
     cycling through the whole queue would help nobody. */
  var failures = 0;
  function onError(e) {
    var code = e && e.data;
    failures += 1;
    if (failures >= 4) {
      failures = 0;
      L.toast('YouTube is not playing on this connection right now. Try again shortly, or open it on YouTube.');
      P.playing = false; paintState();
      return;
    }
    L.toast(code === 101 || code === 150 ? 'The artist does not allow this video to play outside YouTube. Skipping.' : 'This video could not play. Skipping.');
    setTimeout(function () { M.next(true); }, 1400);
  }

  function tick(on) {
    clearInterval(P.progT);
    if (!on) return;
    P.progT = setInterval(function () {
      if (!P.yt || !P.ready || !P.yt.getCurrentTime) return;
      var t = P.yt.getCurrentTime() || 0, d = P.yt.getDuration() || 0;
      if (els.bar) els.bar.style.width = (d ? t / d * 100 : 0).toFixed(2) + '%';
      if (els.time) els.time.textContent = u.clock(t) + ' / ' + u.clock(d);
      var pb = u.qs('.lv-party-prog i'); if (pb) pb.style.width = (d ? t / d * 100 : 0).toFixed(2) + '%';
      var pt = u.qs('.lv-party-time'); if (pt) pt.textContent = u.clock(t) + ' / ' + u.clock(d);
      if ('mediaSession' in navigator && d && navigator.mediaSession.setPositionState) {
        try { navigator.mediaSession.setPositionState({ duration: d, position: Math.min(t, d), playbackRate: 1 }); } catch (x) {}
      }
    }, 500);
  }

  /* ── playing ────────────────────────────────────────────────────── */

  M.play = function (vid, qname, opts) {
    vid = u.ytId(vid);
    if (!vid) return;
    if (P.track && P.track.videoId === vid && P.ready) { M.toggle(); return; }
    var q = queueFor(qname).filter(function (t) { return u.ytId(t.videoId); });
    var idx = q.findIndex(function (t) { return t.videoId === vid; });
    if (idx < 0) {
      var one = L.findTrack(vid) || (opts && opts.track) || { videoId: vid, title: 'Loading…', artist: '' };
      q = [one].concat(q); idx = 0;
    }
    P.queue = q; P.qname = qname || 'chart'; P.idx = idx;
    load(q[idx]);
  };

  function load(track) {
    buildDock();
    P.track = track;
    doc.body.classList.add('lv-docked');
    els.dock.classList.add('is-on');
    paintNow();
    layout();
    setTimeout(layout, 520);
    if (P.yt && P.ready) { try { P.yt.loadVideoById(track.videoId); } catch (e) {} }
    else create(track.videoId).catch(function () { L.toast('YouTube could not be reached. Check your connection.'); });
    session(track);
    L.emit('music', { track: track });
    paintPlaying();
    try { if (global.CabanaTelemetry) global.CabanaTelemetry.track('live_music_play', { videoId: track.videoId }); } catch (e) {}
    if (!track.title || track.title === 'Loading…') resolveMeta(track.videoId).then(function (m) {
      if (m && P.track && P.track.videoId === track.videoId) { track.title = m.title; track.artist = m.artist; paintNow(); session(track); L.emit('music', { track: track }); }
    });
  }

  M.toggle = function () {
    if (!P.yt || !P.ready) return;
    if (P.playing) P.yt.pauseVideo(); else P.yt.playVideo();
  };
  M.pause = function () { if (P.yt && P.ready && P.playing) P.yt.pauseVideo(); };
  M.next = function (auto) {
    if (!P.queue.length) return;
    P.idx = (P.idx + 1) % P.queue.length;
    load(P.queue[P.idx]);
    if (P.stage) L.go(L.href.track(P.queue[P.idx].videoId), { replace: true, keepScroll: true });
  };
  M.prev = function () {
    if (!P.queue.length) return;
    if (P.yt && P.ready && P.yt.getCurrentTime && P.yt.getCurrentTime() > 4) { P.yt.seekTo(0, true); return; }
    P.idx = (P.idx - 1 + P.queue.length) % P.queue.length;
    load(P.queue[P.idx]);
    if (P.stage) L.go(L.href.track(P.queue[P.idx].videoId), { replace: true, keepScroll: true });
  };
  M.stop = function () {
    if (P.yt && P.ready) { try { P.yt.stopVideo(); } catch (e) {} }
    P.track = null; P.playing = false; tick(false);
    if (els.dock) els.dock.classList.remove('is-on');
    doc.body.classList.remove('lv-docked');
    layout();
    paintPlaying();
    L.emit('music', { track: null });
  };
  M.current = function () { return P.track ? P.track.videoId : null; };
  M.isPlaying = function () { return !!P.playing; };

  function paintNow() {
    var t = P.track; if (!t || !els.t) return;
    els.t.innerHTML = (P.playing ? '<span class="lv-eq"><i></i><i></i><i></i><i></i></span>' : '') + esc(u.songOf(t));
    els.a.textContent = u.artistOf(t) + (P.qname === 'chart' && t.rank ? ' · No.' + t.rank + ' in Kenya' : '');
    var pt = u.qs('.lv-party-now .t'), pa = u.qs('.lv-party-now .a');
    if (pt) pt.textContent = u.songOf(t);
    if (pa) pa.textContent = u.artistOf(t);
  }
  function paintState() {
    if (els.toggle) { els.toggle.innerHTML = ic(P.playing ? 'pause' : 'play'); els.toggle.setAttribute('aria-label', P.playing ? 'Pause' : 'Play'); }
    var pp = u.qs('[data-party="toggle"]'); if (pp) pp.innerHTML = ic(P.playing ? 'pause' : 'play');
    var party = u.qs('.lv-party'); if (party) party.classList.toggle('is-playing', P.playing);
    doc.body.classList.toggle('is-paused-all', !P.playing);
    paintNow();
    paintPlaying();
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = P.playing ? 'playing' : 'paused';
  }

  /* Every tile and row for the playing record lights up; the rest dim. */
  function paintPlaying() {
    var cur = M.current();
    u.qsa('[data-act="track"]').forEach(function (b) {
      var on = !!cur && b.getAttribute('data-vid') === cur;
      if (b.classList.contains('is-playing') === on && !on) return;
      b.classList.toggle('is-playing', on);
      var play = u.qs('.lv-card-play', b) || u.qs('.lv-trk-art .ov', b);
      if (play) play.innerHTML = on && P.playing ? '<span class="lv-eq"><i></i><i></i><i></i><i></i></span>' : ic(on && P.playing ? 'pause' : 'play');
    });
  }
  M.paintPlaying = paintPlaying;

  function session(t) {
    if (!('mediaSession' in navigator) || !global.MediaMetadata) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: u.songOf(t), artist: u.artistOf(t), album: 'Cabana Live',
        artwork: [{ src: u.ytThumb(t.videoId, 'hqdefault'), sizes: '480x360', type: 'image/jpeg' }]
      });
      navigator.mediaSession.setActionHandler('play', function () { M.toggle(); });
      navigator.mediaSession.setActionHandler('pause', function () { M.pause(); });
      navigator.mediaSession.setActionHandler('nexttrack', function () { M.next(); });
      navigator.mediaSession.setActionHandler('previoustrack', function () { M.prev(); });
    } catch (e) {}
  }

  var metaCache = {};
  function resolveMeta(vid) {
    if (metaCache[vid]) return Promise.resolve(metaCache[vid]);
    return fetch(L.FN + '?action=resolve&q=' + encodeURIComponent(vid)).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (m) { if (m && m.kind === 'video') { metaCache[vid] = m; return m; } return null; }, function () { return null; });
  }

  /* Any tile anywhere with data-act="track" plays. */
  doc.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-act="track"]');
    if (!b || b.disabled) return;
    e.preventDefault();
    M.play(b.getAttribute('data-vid'), b.getAttribute('data-queue') || 'chart');
  });

  /* ── rows ───────────────────────────────────────────────────────── */

  function movement(t) {
    if (t.previousRank == null) return t.rank ? '<span class="lv-mv new">NEW</span>' : '<span class="lv-mv"></span>';
    var d = t.previousRank - t.rank;
    if (!d) return '<span class="lv-mv">–</span>';
    return '<span class="lv-mv ' + (d > 0 ? 'up' : 'down') + '">' + ic(d > 0 ? 'up' : 'down', 3) + Math.abs(d) + '</span>';
  }
  M.row = function (t, i, qname) {
    var on = M.current() === t.videoId;
    return '<button class="lv-trk' + (on ? ' is-playing' : '') + '" type="button" data-act="track" data-vid="' + esc(t.videoId) + '" data-queue="' + esc(qname || 'chart') + '" aria-label="Play ' + esc(u.songOf(t)) + ' by ' + esc(u.artistOf(t)) + '">' +
      '<span class="lv-trk-r">' + (qname === 'chart' && t.rank ? t.rank : i + 1) + '</span>' +
      movement(t) +
      '<span class="lv-trk-art"><img src="' + u.ytThumb(t.videoId, 'hqdefault') + '" alt="" loading="lazy" decoding="async"/><span class="ov">' + (on && P.playing ? '<span class="lv-eq"><i></i><i></i><i></i><i></i></span>' : ic('play')) + '</span></span>' +
      '<span class="lv-trk-meta" style="min-width:0"><span class="lv-trk-t" style="display:block">' + esc(u.songOf(t)) + '</span><span class="lv-trk-a" style="display:block">' + esc(u.artistOf(t)) + '</span></span>' +
      '<span class="lv-trk-g">' + (t.culture ? '<span>' + esc(t.culture) + '</span>' : t.genre && t.genre !== 'other' ? '<span>' + esc(shelfName(t.genre)) + '</span>' : '') + '</span>' +
      '<span class="lv-trk-v">' + (t.views ? u.compact(t.views) : '') + '</span>' +
      '<span class="lv-trk-d">' + (t.durationSeconds ? u.clock(t.durationSeconds) : '') + '</span>' +
    '</button>';
  };
  function shelfName(g) { var s = SHELVES.filter(function (x) { return x[0] === g; })[0]; return s ? s[1] : g; }

  /* ── search (YouTube, through the server) ───────────────────────── */

  M.searchInto = function (host, q, auto) {
    if (!host) return;
    q = String(q || '').trim();
    if (q.length < 2) { host.innerHTML = ''; return; }
    function run() {
      host.innerHTML = '<div class="lv-count">Searching YouTube for “' + esc(q) + '”…</div>';
      var viaFn = fetch(L.FN + '?action=search&q=' + encodeURIComponent(q)).then(function (r) { return r.json(); });
      viaFn.then(function (p) {
        if (p && p.unconfigured) return fetch('/api/music-search?q=' + encodeURIComponent(q)).then(function (r) { return r.json(); });
        return p;
      }).then(function (p) {
        if (!p || p.unconfigured) { host.innerHTML = '<div class="lv-count">Song search switches on once the YouTube key is connected. The chart plays in the meantime.</div>'; return; }
        if (p.exhausted) { host.innerHTML = '<div class="lv-count">Search has used today’s allowance. Try again tomorrow; the chart still plays.</div>'; return; }
        var res = u.arr(p.results).filter(function (t) { return u.ytId(t.videoId); });
        searchResults = res;
        host.innerHTML = res.length ? '<section class="lv-row"><div class="lv-row-h"><div><h2 class="lv-row-t">From YouTube</h2><p class="lv-row-s">Tap any of them to play</p></div></div><div class="lv-chart">' + res.map(function (t, i) { return M.row(t, i, 'search'); }).join('') + '</div></section>'
          : '<div class="lv-count">Nothing on YouTube for that. Try the artist on their own.</div>';
      }).catch(function () { host.innerHTML = '<div class="lv-count">Search did not answer. Try again in a moment.</div>'; });
    }
    if (auto) run();
    else {
      host.innerHTML = '<div style="padding:0 var(--gutter)"><button class="lv-btn lv-btn-glass lv-btn-sm" type="button" data-yt-go>' + ic('search') + 'Search YouTube for “' + esc(q) + '”</button></div>';
      u.qs('[data-yt-go]', host).addEventListener('click', run);
    }
  };

  /* ── the music room ─────────────────────────────────────────────── */

  var musicBB = null;
  function musicTab(ctx) {
    L.setMeta('Music', 'The Kenya music chart live from YouTube: the Top 50, new releases, playlists and who is standing where. Press play and step into the party room.');
    var shelf = ctx.query.get('shelf') || 'all';
    function paint() {
      var tracks = D.chart.tracks, lead = tracks[0];
      var admin = D.billboard.filter(function (b) { return (b.placements || []).indexOf('music') !== -1; });
      var html = '';
      if (admin.length) html += '<div data-bb></div>';
      else if (lead) {
        html += '<section class="lv-mhero">' +
          '<div class="lv-mhero-bg">' + UI.ytImg(lead.videoId, '', '', true) + '</div><div class="lv-mhero-beams"></div>' +
          '<div class="lv-mhero-in"><div class="lv-mhero-cover"><img src="' + u.ytThumb(lead.videoId, 'hqdefault') + '" alt=""/></div><div>' +
            '<div class="lv-bb-chips" style="opacity:1;transform:none">' + UI.chip('lv-chip-new', 'No.1 in Kenya') + UI.chip('', 'Live from YouTube', 'trend') + '</div>' +
            '<h1>' + esc(u.songOf(lead)) + '</h1><div class="by">' + esc(u.artistOf(lead)) + '</div>' +
            '<div class="stats">' + (lead.views ? '<span><b>' + u.compact(lead.views) + '</b> plays</span>' : '') + (lead.viewsDelta ? '<span class="up">+' + u.compact(lead.viewsDelta) + ' since the last chart</span>' : '') +
              (lead.previousRank && lead.previousRank > 1 ? '<span class="up">up from ' + lead.previousRank + '</span>' : '') + '<span>' + tracks.length + ' on the chart</span></div>' +
            '<div class="lv-bb-acts" style="opacity:1;transform:none;margin-top:22px">' +
              '<button class="lv-btn lv-btn-accent" type="button" data-act="track" data-vid="' + esc(lead.videoId) + '" data-queue="chart">' + ic('play') + 'Play the Top 50</button>' +
              '<a class="lv-btn lv-btn-glass" href="' + L.href.track(lead.videoId) + '">' + ic('party') + 'Enter the party</a>' +
              '<button class="lv-round" type="button" data-m-shuffle aria-label="Shuffle the chart">' + ic('shuffle') + '</button>' +
            '</div></div></div></section>';
      } else {
        html += '<header class="lv-head"><div class="lv-head-k">Cabana Music</div><h1>The chart is warming up</h1><p>Kenya’s top 50 from YouTube lands here within minutes.</p></header>';
      }
      html += '<div class="lv-rows" style="margin-top:' + (admin.length ? 'clamp(-90px,-9vh,-40px)' : '0') + '">';
      html += UI.row({ title: 'Top 10 in Kenya today', items: tracks.slice(0, 10), render: function (t, i) { return UI.card.top10(t, i, 'chart'); }, railCls: 'lv-top10-rail', col: 'clamp(210px, 19vw, 280px)' });

      var counts = {};
      pool().forEach(function (t) { counts[t.genre] = (counts[t.genre] || 0) + 1; });
      var shown = shelf === 'all' ? tracks : pool().filter(function (t) { return t.genre === shelf; });
      html += '<section class="lv-row" id="chart"><div class="lv-row-h"><div><h2 class="lv-row-t">The Cabana Top ' + (tracks.length >= 50 ? 50 : tracks.length || '') + '</h2>' +
        '<p class="lv-row-s">What Kenya is playing on YouTube' + (D.chart.meta && D.chart.meta.last_refreshed_at ? ', updated ' + esc(u.ago(D.chart.meta.last_refreshed_at)) : '') + '</p></div></div>' +
        '<div class="lv-filters" style="margin-bottom:10px"><div class="lv-pills" role="group" aria-label="Shelf">' + SHELVES.filter(function (s) { return s[0] === 'all' || counts[s[0]]; }).map(function (s) {
          return '<button class="lv-pill" type="button" data-shelf="' + s[0] + '" aria-pressed="' + (shelf === s[0]) + '">' + s[1] + (s[0] !== 'all' ? ' <span class="n">' + counts[s[0]] + '</span>' : '') + '</button>';
        }).join('') + '</div>' +
        '<label class="lv-search">' + ic('search') + '<input type="search" data-msearch placeholder="Play anything: a song or an artist" aria-label="Search for a song"/></label></div>' +
        '<div data-msearch-out></div>' +
        '<div class="lv-chart">' + (shown.length ? shown.slice(0, 50).map(function (t, i) { return M.row(t, i, shelf === 'all' ? 'chart' : 'genre:' + shelf); }).join('') : '<p class="lv-count">Nothing on this shelf right now. It fills as the chart moves.</p>') + '</div></section>';

      if (D.playlists.length) html += UI.row({ title: 'Playlists', sub: 'Put together by Cabana', items: D.playlists, render: UI.card.playlist, col: 'clamp(170px, 15vw, 220px)' });
      var rel = queueFor('releases');
      html += UI.row({ title: 'Fresh releases', sub: 'New videos from the artists Kenya is playing', items: rel.slice(0, 20), render: function (t) { return UI.card.track(t, { queue: 'releases', tag: u.ago(t.published) }); }, col: 'clamp(260px, 24vw, 340px)' });
      var fast = queueFor('fastest').filter(function (t) { return (t.velocity || 0) > 50; });
      html += UI.row({ title: 'Moving fastest ' + UI.chip('lv-chip-new', 'Trending'), sub: 'Plays per hour, right now', items: fast.slice(0, 16), render: function (t) { return UI.card.track(t, { queue: 'fastest', tag: u.compact(t.velocity) + '/hr' }); }, col: 'clamp(260px, 24vw, 340px)' });

      html += standings();

      SHELVES.slice(1).forEach(function (s) {
        var list = pool().filter(function (t) { return t.genre === s[0]; });
        if (list.length >= 4) html += UI.row({ title: s[1], items: list.slice(0, 16), render: function (t) { return UI.card.track(t, { queue: 'genre:' + s[0] }); }, col: 'clamp(240px, 22vw, 320px)' });
      });

      html += '<p class="lv-count" style="margin-top:24px">' + ic('trend') + ' Compiled from YouTube for Kenya. Positions move as the numbers move; Cabana adds context, never invented numbers.</p>';
      html += '</div>';
      ctx.el.innerHTML = html;
      if (admin.length) { if (musicBB) musicBB.destroy(); musicBB = UI.billboard(u.qs('[data-bb]', ctx.el), L.slidesFor('music'), { label: 'Music' }); }
      UI.wireRails(ctx.el);
      litPodium(ctx.el);

      u.qsa('[data-shelf]', ctx.el).forEach(function (b) {
        b.addEventListener('click', function () {
          shelf = b.getAttribute('data-shelf');
          history.replaceState({ lv: 1 }, '', location.pathname + (shelf !== 'all' ? '?shelf=' + shelf : '') + '#chart');
          paint();
          var c = u.qs('#chart', ctx.el); if (c) c.scrollIntoView({ block: 'start' });
        });
      });
      var si = u.qs('[data-msearch]', ctx.el), so = u.qs('[data-msearch-out]', ctx.el);
      si.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); M.searchInto(so, si.value, true); } });
      si.addEventListener('search', function () { if (!si.value.trim()) so.innerHTML = ''; });
      var sh = u.qs('[data-m-shuffle]', ctx.el);
      if (sh) sh.addEventListener('click', function () {
        var q = tracks.slice().sort(function () { return Math.random() - .5; });
        M.setQueue('shuffle', q);
        M.play(q[0].videoId, 'shuffle');
      });
      if (location.hash && u.qs(location.hash, ctx.el)) setTimeout(function () { var h = u.qs(location.hash, ctx.el); if (h) h.scrollIntoView({ block: 'start' }); }, 60);
    }
    paint();
    var off = L.on('data', function (k) { if ((k === 'chart' || k === 'playlists' || k === 'core') && ctx.alive()) paint(); });
    ctx.onLeave(function () { off(); if (musicBB) { musicBB.destroy(); musicBB = null; } });
  }

  function standings() {
    var a = D.chart.artists;
    if (!a.length) return '';
    var top = [a[1], a[0], a[2]];
    var held = {};
    D.chart.awards.forEach(function (x) { if (!held[x.period]) held[x.period] = x; });
    return '<section class="lv-row" id="standings"><div class="lv-row-h"><div><h2 class="lv-row-t">Who is standing where</h2><p class="lv-row-s">Ranked across every record an artist holds on the chart. Momentum counts for more than lifetime plays.</p></div></div>' +
      '<div class="lv-podium" data-podium>' + top.map(function (x) {
        if (!x) return '<div></div>';
        return '<button class="lv-plinth" type="button" data-place="' + x.rank + '" data-act="track" data-vid="' + esc(x.leadVideoId || '') + '" data-queue="artist:' + esc(x.name) + '" aria-label="Number ' + x.rank + ', ' + esc(x.name) + '">' +
          '<span class="face">' + (x.leadVideoId ? '<img src="' + u.ytThumb(x.leadVideoId, 'hqdefault') + '" alt="" loading="lazy"/>' : '') + '</span>' +
          '<span class="who">' + esc(u.artistOf({ artist: x.name })) + '</span><span class="what">' + (x.tracks || 1) + ' on the chart' + (x.viewsDelta ? ' · +' + u.compact(x.viewsDelta) : '') + '</span>' +
          '<span class="block">' + x.rank + '</span></button>';
      }).join('') + '</div>' +
      UI.row({ title: 'The rest of the top 20', items: a.slice(3, 20), render: UI.card.artist, col: 'clamp(120px, 10vw, 150px)' }) +
      '<div class="lv-titles">' + [['week', 'Artist of the week', 'Seven days of standings decides this.'], ['month', 'Artist of the month', 'Thirty days of standings decides this.'], ['year', 'Artist of the year', 'A full year of standings decides this.']].map(function (p) {
        var w = held[p[0]];
        return '<button class="lv-title-card" type="button"' + (w && w.leadVideoId ? ' data-act="track" data-vid="' + esc(w.leadVideoId) + '" data-queue="artist:' + esc(w.name) + '"' : ' disabled') + '>' +
          '<span class="f">' + (w && w.leadVideoId ? '<img src="' + u.ytThumb(w.leadVideoId, 'hqdefault') + '" alt="" loading="lazy"/>' : '') + '</span>' +
          '<span><span class="k" style="display:block">' + p[1] + '</span><span class="n" style="display:block">' + (w ? esc(w.name) : 'To be decided') + '</span><span class="s" style="display:block">' + (w ? (w.days || 1) + ' day' + (w.days === 1 ? '' : 's') + ' counted' + (w.viewsDelta ? ' · +' + u.compact(w.viewsDelta) + ' plays' : '') : p[2]) + '</span></span></button>';
      }).join('') + '</div></section>';
  }

  function litPodium(root) {
    var p = u.qs('[data-podium]', root);
    if (!p) return;
    if (!global.IntersectionObserver) { p.classList.add('lit'); return; }
    var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { p.classList.add('lit'); io.disconnect(); } }, { threshold: .3 });
    io.observe(p);
  }

  /* ── a playlist ─────────────────────────────────────────────────── */

  function playlistPage(ctx) {
    function paint() {
      var p = D.playlists.filter(function (x) { return x.slug === ctx.params[0]; })[0];
      if (!p) {
        if (!D.loaded.playlists) { ctx.el.innerHTML = '<div class="lv-skel" style="height:60vh;border-radius:0"></div>'; return; }
        ctx.el.innerHTML = '<div class="lv-page-top">' + UI.empty('music', 'Playlist not found', 'It may have been taken down or renamed.', '<a class="lv-btn lv-btn-accent" href="' + L.href.tab('music') + '">Back to music</a>') + '</div>';
        return;
      }
      L.setMeta(p.title + ' · Playlist', p.description || '');
      var secs = p.items.reduce(function (s, t) { return s + (t.durationSeconds || 0); }, 0);
      var qn = 'playlist:' + p.slug;
      var cover = u.safeUrl(p.cover_url) ? '<img src="' + esc(p.cover_url) + '" alt=""/>' : '<span class="lv-sq-mosaic">' + p.items.slice(0, 4).map(function (it) { return '<img src="' + u.ytThumb(it.videoId, 'hqdefault') + '" alt="" style="transform:scale(1.34)"/>'; }).join('') + '</span>';
      ctx.el.innerHTML =
        '<section class="lv-mhero" style="min-height:auto;--lv-a1:' + esc(p.accent || '#C8FF3D') + '">' +
          '<div class="lv-mhero-bg" style="background:radial-gradient(90% 120% at 20% 0%,' + esc(p.accent || '#8B5CFF') + ',transparent 60%),#0b0912"></div>' +
          '<div class="lv-mhero-in"><div class="lv-mhero-cover" style="position:relative">' + cover + '</div><div>' +
            '<div class="lv-bb-chips" style="opacity:1;transform:none">' + UI.chip('', 'Playlist', 'list') + (p.mood ? UI.chip('lv-chip-new', p.mood) : '') + '</div>' +
            '<h1>' + esc(p.title) + '</h1>' + (p.description ? '<div class="by">' + esc(p.description) + '</div>' : '') +
            '<div class="stats"><span><b>' + p.items.length + '</b> tracks</span>' + (secs ? '<span>' + Math.round(secs / 60) + ' min</span>' : '') + '<span>Curated by Cabana</span></div>' +
            '<div class="lv-bb-acts" style="opacity:1;transform:none;margin-top:22px">' +
              '<button class="lv-btn lv-btn-accent" type="button" data-act="track" data-vid="' + esc(p.items[0].videoId) + '" data-queue="' + esc(qn) + '">' + ic('play') + 'Play</button>' +
              '<button class="lv-btn lv-btn-glass" type="button" data-pl-shuffle>' + ic('shuffle') + 'Shuffle</button>' +
              '<a class="lv-round" href="' + L.href.track(p.items[0].videoId) + '" aria-label="Party mode" data-pl-party>' + ic('party') + '</a>' +
            '</div></div></div></section>' +
        '<div class="lv-chart" style="margin-top:20px">' + p.items.map(function (t, i) { return M.row(t, i, qn); }).join('') + '</div>';
      u.qs('[data-pl-shuffle]', ctx.el).addEventListener('click', function () {
        var q = p.items.slice().sort(function () { return Math.random() - .5; });
        M.setQueue('shuffle', q); M.play(q[0].videoId, 'shuffle');
      });
      u.qs('[data-pl-party]', ctx.el).addEventListener('click', function () { M.play(p.items[0].videoId, qn); });
    }
    paint();
    L.loadPlaylists();
    var off = L.on('data', function (k) { if (k === 'playlists' && ctx.alive()) paint(); });
    ctx.onLeave(off);
  }

  /* ── the party ──────────────────────────────────────────────────── */

  var room = null, roomVid = null, canvasT = null;

  function partyPage(ctx) {
    var vid = ctx.params[0];
    var t = L.findTrack(vid) || (P.track && P.track.videoId === vid ? P.track : null) || { videoId: vid, title: '', artist: '' };
    var queueName = P.track && P.qname ? P.qname : 'chart';
    L.setTab('music');
    L.setMeta((t.title ? u.songOf(t) + ' · ' : '') + 'Party room', 'Watch it, feel it, react with everyone else in the room. The Cabana party room.');
    var already = P.track && P.track.videoId === vid;
    var bpm = Math.min(150, BPM[t.genre] || BPM.other);
    var beat = Math.max(.4, 60 / bpm);

    ctx.el.innerHTML = '';
    var el = doc.createElement('div');
    el.className = 'lv-party' + (P.playing && already ? ' is-playing' : '');
    el.style.setProperty('--beat', beat.toFixed(3) + 's');
    el.innerHTML =
      '<div class="lv-party-wash" style="background-image:url(' + u.ytThumb(vid, 'hqdefault') + ')"></div>' +
      '<div class="lv-party-beams"></div><div class="lv-party-floor"></div><canvas class="lv-party-canvas"></canvas>' +
      '<div class="lv-floaters"></div>' +
      '<div class="lv-party-top">' +
        '<button class="lv-round lv-round-sm" type="button" data-party="back" aria-label="Leave the party">' + ic('back') + '</button>' +
        '<span class="lv-party-live"><i></i><span data-party="count">Party room</span></span>' +
        '<span style="flex:1"></span>' +
        '<button class="lv-round lv-round-sm' + (L.saves.has('track', vid) ? ' is-on' : '') + '" type="button" data-act="save" data-kind="track" data-ref="' + esc(vid) + '" aria-label="Save this track">' + ic(L.saves.has('track', vid) ? 'check' : 'heart', 2.2) + '</button>' +
        '<button class="lv-round lv-round-sm" type="button" data-act="share" aria-label="Invite friends">' + ic('share') + '</button>' +
        '<button class="lv-round lv-round-sm" type="button" data-party="full" aria-label="Full screen">' + ic('full') + '</button>' +
      '</div>' +
      '<div class="lv-party-mid">' +
        '<div class="lv-party-stage"><div class="lv-party-slot"><div class="lv-party-ring"></div>' +
          (already ? '' : '<div class="lv-party-gate"><button type="button" data-party="enter"><span>' + ic('play') + '</span><span>Enter the party</span></button></div>') +
        '</div></div>' +
        '<aside class="lv-party-side"><h3>Up next</h3><div class="lv-party-q" data-party="queue"></div></aside>' +
      '</div>' +
      '<div class="lv-party-bot">' +
        '<div class="lv-party-now"><div class="t">' + esc(t.title ? u.songOf(t) : 'Loading the room…') + '</div><div class="a">' + esc(t.artist ? u.artistOf(t) : '') + '</div>' +
          '<div class="lv-dock-prog lv-party-prog" style="position:relative;top:auto;margin-top:12px;border-radius:3px;height:4px"><i></i></div><div class="lv-party-time" style="margin-top:6px;font-family:var(--f-mono);font-size:12px;color:var(--lv-ink-3)"></div></div>' +
        '<div class="lv-react" role="group" aria-label="React">' + REACTIONS.map(function (r) { return '<button type="button" data-react="' + r + '" aria-label="React ' + r + '">' + r + '</button>'; }).join('') + '</div>' +
        '<div class="lv-party-ctrl">' +
          '<button class="lv-pbtn" type="button" data-party="prev" aria-label="Previous">' + ic('prev') + '</button>' +
          '<button class="lv-pbtn main" type="button" data-party="toggle" aria-label="Play or pause">' + ic(P.playing && already ? 'pause' : 'play') + '</button>' +
          '<button class="lv-pbtn" type="button" data-party="next" aria-label="Next">' + ic('next') + '</button>' +
        '</div>' +
      '</div>';
    /* On <body>, not inside the view: the view is its own stacking
       context and would put the room under the top bar. */
    var stale = u.qs('body > .lv-party'); if (stale) stale.remove();
    doc.body.appendChild(el);
    doc.documentElement.classList.add('lv-lock', 'lv-party-on');
    requestAnimationFrame(function () { el.classList.add('is-on'); });
    P.stage = true;
    layout();
    setTimeout(layout, 60);

    function paintQueue() {
      var q = P.queue.length ? P.queue : queueFor(queueName);
      var host = u.qs('[data-party="queue"]', el); if (!host) return;
      var at = Math.max(0, q.findIndex(function (x) { return x.videoId === (M.current() || vid); }));
      host.innerHTML = q.slice(at, at + 30).map(function (x, i) { return M.row(x, at + i, P.qname || queueName); }).join('') || '<p class="lv-count">The queue fills from the chart.</p>';
    }
    paintQueue();

    if (!t.title) resolveMeta(vid).then(function (m) {
      if (!m || !ctx.alive()) return;
      u.qs('.lv-party-now .t', el).textContent = u.songOf(m);
      u.qs('.lv-party-now .a', el).textContent = u.artistOf(m);
      L.setMeta(u.songOf(m) + ' · Party room');
    });

    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-party]');
      var r = e.target.closest('[data-react]');
      if (r) { react(r.getAttribute('data-react'), true); return; }
      if (!b) return;
      var a = b.getAttribute('data-party');
      if (a === 'enter') { b.closest('.lv-party-gate').remove(); M.play(vid, queueName, { track: t }); }
      else if (a === 'toggle') { if (!P.track) M.play(vid, queueName, { track: t }); else M.toggle(); }
      else if (a === 'next') M.next();
      else if (a === 'prev') M.prev();
      else if (a === 'back') { if (history.length > 1 && document.referrer.indexOf(location.host) !== -1) history.back(); else L.go(L.href.tab('music')); }
      else if (a === 'full') { try { if (doc.fullscreenElement) doc.exitFullscreen(); else doc.documentElement.requestFullscreen(); } catch (x) {} setTimeout(layout, 300); }
    });

    joinRoom(vid);
    startCanvas(el, bpm);
    var off = L.on('music', function () { if (ctx.alive()) { paintQueue(); } });
    function onKey(e) {
      if (/INPUT|TEXTAREA/.test((e.target && e.target.tagName) || '')) return;
      if (e.key === ' ') { e.preventDefault(); if (P.track) M.toggle(); }
      if (e.key === 'ArrowRight' && e.shiftKey) M.next();
      if (e.key === 'ArrowLeft' && e.shiftKey) M.prev();
      if (e.key === 'Escape' && !doc.fullscreenElement) L.go(L.href.tab('music'));
    }
    doc.addEventListener('keydown', onKey);
    ctx.onLeave(function () {
      off();
      doc.removeEventListener('keydown', onKey);
      el.remove();
      P.stage = false;
      doc.documentElement.classList.remove('lv-lock', 'lv-party-on');
      leaveRoom();
      stopCanvas();
      try { if (doc.fullscreenElement) doc.exitFullscreen(); } catch (x) {}
      /* Deferred a tick: moving to the next record re-enters the party,
         and the frame should stay on the stage rather than dip. */
      setTimeout(layout, 0);
    });
  }

  /* Presence is the count; broadcast is the reactions. Received emoji
     are checked against the six this room offers, because anything that
     arrives over a public channel is somebody else's input. */
  function joinRoom(vid) {
    if (roomVid === vid && room) return;
    leaveRoom();
    var c = L.sb();
    if (!c || !c.channel) return;
    var me = Math.random().toString(36).slice(2, 10);
    roomVid = vid;
    try {
      room = c.channel('party:' + vid, { config: { presence: { key: me }, broadcast: { self: false } } });
      room.on('presence', { event: 'sync' }, function () {
        var n = Object.keys(room.presenceState() || {}).length;
        var el = u.qs('[data-party="count"]');
        if (el) el.textContent = n > 1 ? n + ' people in the room' : 'You started this party';
      }).on('broadcast', { event: 'react' }, function (msg) {
        var e = msg && msg.payload && msg.payload.e;
        if (REACTIONS.indexOf(e) !== -1) react(e, false);
      }).subscribe(function (status) {
        if (status === 'SUBSCRIBED') { try { room.track({ at: Date.now() }); } catch (e) {} }
      });
    } catch (e) { room = null; }
  }
  function leaveRoom() {
    if (room) { try { room.untrack(); room.unsubscribe(); } catch (e) {} }
    room = null; roomVid = null;
  }

  var lastSend = 0, sentWindow = [];
  function react(emoji, mine) {
    var layer = u.qs('.lv-floaters');
    if (!layer || u.qsa('.lv-floater', layer).length > 40) return;
    var f = doc.createElement('span');
    f.className = 'lv-floater';
    f.textContent = emoji;
    f.style.left = (mine ? 55 + Math.random() * 30 : 8 + Math.random() * 84) + '%';
    f.style.setProperty('--dx', (Math.random() * 120 - 60).toFixed(0) + 'px');
    f.style.setProperty('--rot', (Math.random() * 50 - 25).toFixed(0) + 'deg');
    f.style.fontSize = (mine ? 38 : 26 + Math.random() * 12).toFixed(0) + 'px';
    layer.appendChild(f);
    setTimeout(function () { f.remove(); }, 2900);
    if (mine && room) {
      var now = Date.now();
      sentWindow = sentWindow.filter(function (t) { return now - t < 1000; });
      if (sentWindow.length < 4 && now - lastSend > 120) {
        sentWindow.push(now); lastSend = now;
        try { room.send({ type: 'broadcast', event: 'react', payload: { e: emoji } }); } catch (e) {}
      }
    }
  }

  /* Soft light rising through the room, breathing on the tempo. */
  function startCanvas(el, bpm) {
    stopCanvas();
    var cv = u.qs('.lv-party-canvas', el);
    if (!cv || u.reduced()) return;
    var ctx2 = cv.getContext('2d');
    var dpr = Math.min(2, global.devicePixelRatio || 1);
    var W = 0, H = 0, parts = [];
    var cs = getComputedStyle(u.qs('.lv') || doc.body);
    var a1 = (cs.getPropertyValue('--lv-a1') || '#C8FF3D').trim(), a2 = (cs.getPropertyValue('--lv-a2') || '#2EF2D0').trim();
    function size() { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx2.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size();
    for (var i = 0; i < 70; i++) parts.push({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 3.2, s: .15 + Math.random() * .6, c: Math.random() < .5 ? a1 : Math.random() < .6 ? a2 : '#ffffff', o: .2 + Math.random() * .5, w: Math.random() * Math.PI * 2 });
    var t0 = performance.now();
    function frame(now) {
      canvasT = requestAnimationFrame(frame);
      if (doc.hidden) return;
      var playing = P.playing && P.stage;
      var t = (now - t0) / 1000, beatPhase = playing ? (Math.sin(t * Math.PI * 2 * (bpm / 60)) + 1) / 2 : .3;
      ctx2.clearRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.y -= (playing ? p.s * 1.6 : p.s * .35) / H * 60;
        p.x += Math.sin(t * .6 + p.w) * .0004;
        if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
        var r = p.r * (1 + beatPhase * .5);
        ctx2.globalAlpha = p.o * (.55 + beatPhase * .45);
        ctx2.fillStyle = p.c;
        ctx2.beginPath(); ctx2.arc(p.x * W, p.y * H, r, 0, Math.PI * 2); ctx2.fill();
      }
      ctx2.globalAlpha = 1;
    }
    canvasT = requestAnimationFrame(frame);
    global.addEventListener('resize', size);
    stopCanvas._off = function () { global.removeEventListener('resize', size); };
  }
  function stopCanvas() { if (canvasT) cancelAnimationFrame(canvasT); canvasT = null; if (stopCanvas._off) { stopCanvas._off(); stopCanvas._off = null; } }

  L.on('music', function () { setTimeout(paintPlaying, 0); });
  L.on('data', function (k) { if (k === 'chart' && P.track && P.qname === 'chart') { /* keep the queue fresh */ P.queue = D.chart.tracks.length ? D.chart.tracks : P.queue; P.idx = Math.max(0, P.queue.findIndex(function (x) { return x.videoId === P.track.videoId; })); } });
  L.on('overlay', function (open) { if (open) M.pause(); });

  L.route(/^\/events\/music$/, musicTab, { tab: 'music' });
  L.route(/^\/events\/music\/playlist\/([a-z0-9-]+)$/, playlistPage, { tab: 'music', detail: true });
  L.route(/^\/events\/music\/([A-Za-z0-9_-]{11})$/, partyPage, { tab: 'music', detail: true, party: true });
})(window);
