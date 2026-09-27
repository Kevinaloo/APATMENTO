/* ═══════════════════════════════════════════════════════════════════
   CABANA LIVE · the player
   ───────────────────────────────────────────────────────────────────
   Films, episodes, live streams and trailers, full screen.

   Asking to play goes through live_play() in the database, which is
   where the paywall is. It answers with what to play or why not:
     signin / premium   → the free-month conversation (L.gate)
     coming_soon,
     not_started, ended → said plainly
     ok                 → upload (private storage, signed URL),
                          hls (hls.js unless the browser plays it),
                          mp4, youtube, embed

   The custom controls drive the <video> sources. YouTube and partner
   embeds keep their own controls; Cabana only frames them.

   Where a guest stopped is remembered on the device, and a play is
   logged when it ends so the console can see what is watched.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var L = global.CabanaLive;
  if (!L) return;
  var u = L.u, esc = u.esc, ic = L.ic, doc = global.document;
  var HLS_SRC = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';

  var S = null;           // the open session
  var hlsP = null;

  function loadHls() {
    if (global.Hls) return Promise.resolve(global.Hls);
    if (hlsP) return hlsP;
    hlsP = new Promise(function (resolve, reject) {
      var s = doc.createElement('script');
      s.src = HLS_SRC; s.async = true; s.crossOrigin = 'anonymous';
      s.onload = function () { resolve(global.Hls); };
      s.onerror = function () { hlsP = null; reject(new Error('hls')); };
      doc.head.appendChild(s);
    });
    return hlsP;
  }

  function posKey(id, ep) { return 'lv-pos:' + id + (ep ? ':' + ep : ''); }

  /* ── open ───────────────────────────────────────────────────────── */

  function open(t, epId) {
    var c = L.sb();
    if (!c) { L.toast('Playback is unavailable right now.'); return; }
    if (L.music && L.music.isPlaying()) L.music.pause();
    c.rpc('live_play', { p_title: t.id, p_episode: epId || null }).then(function (r) {
      var res = (r && r.data) || { ok: false, reason: 'error' };
      if (r && r.error) res = { ok: false, reason: 'error' };
      if (!res.ok) return refuse(t, res, epId);
      start(t, res);
    }, function () { L.toast('Could not reach Cabana Live. Check your connection.'); });
  }

  function refuse(t, res, epId) {
    var r = res.reason;
    if (r === 'signin' || r === 'premium') {
      L.gate(r, { title: t.title, onUnlock: function () { open(t, epId); } });
    } else if (r === 'coming_soon') {
      L.toast(t.title + ' arrives ' + u.when(res.release_at).split(' · ')[0] + '. We can remind you.');
    } else if (r === 'not_started') {
      L.toast('The stream opens 15 minutes before it starts, ' + u.when(res.starts_at) + '.');
    } else if (r === 'ended') {
      L.toast('This stream has ended.');
    } else if (r === 'no_media') {
      L.toast('This title is being prepared. Check back very soon.');
    } else {
      L.toast('This could not be played just now. Please try again.');
    }
  }

  function start(t, res, opts) {
    close(true);
    opts = opts || {};
    var ep = res.episode_id || null;
    var epRow = ep && L.data.episodes[t.id] ? L.data.episodes[t.id].filter(function (e) { return e.id === ep; })[0] : null;
    S = { t: t, ep: ep, epRow: epRow, res: res, watched: 0, lastT: 0, logged: false, trailer: !!opts.trailer };

    var el = doc.createElement('div');
    el.className = 'lv-player';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Now playing: ' + t.title);
    var sub = opts.trailer ? 'Trailer' : epRow ? 'S' + epRow.season + ' · E' + epRow.number + ' · ' + epRow.name : (t.kind === 'live' && L.titleState(t) === 'live' ? 'Live' : t.tagline || '');
    var frame = res.source === 'youtube' || res.source === 'embed';
    if (frame) el.classList.add('is-frame');
    el.innerHTML =
      (frame ? '<div class="lv-player-frame"></div>' : '<video playsinline preload="auto"' + (u.safeUrl(t.backdrop_url) ? ' poster="' + esc(t.backdrop_url) + '"' : '') + '></video>') +
      '<div class="lv-player-spin"></div><div class="lv-player-center" aria-hidden="true"></div>' +
      '<div class="lv-player-ui">' +
        '<div class="lv-player-top"><button class="lv-pbtn" type="button" data-p="close" aria-label="Close player">' + ic('back') + '</button>' +
          '<div><div class="t">' + esc(t.title) + (t.kind === 'live' && L.titleState(t) === 'live' && !opts.trailer ? ' ' + L.ui.chip('lv-chip-live', 'Live') : '') + '</div><div class="s">' + esc(sub) + '</div></div></div>' +
        (frame ? '' :
        '<div class="lv-player-bot">' +
          '<div class="lv-seek" data-p="seek" role="slider" aria-label="Seek" tabindex="0"><div class="lv-seek-track"><div class="lv-seek-buf"></div><div class="lv-seek-fill"></div></div></div>' +
          '<div class="lv-player-ctrl">' +
            '<button class="lv-pbtn big" type="button" data-p="toggle" aria-label="Play">' + ic('play') + '</button>' +
            '<button class="lv-pbtn" type="button" data-p="rew" aria-label="Back 10 seconds">' + ic('rew', 1.8) + '</button>' +
            '<button class="lv-pbtn" type="button" data-p="fwd" aria-label="Forward 10 seconds">' + ic('fwd', 1.8) + '</button>' +
            '<button class="lv-pbtn" type="button" data-p="mute" aria-label="Mute">' + ic('volume') + '</button>' +
            '<input class="lv-vol" type="range" min="0" max="1" step="0.05" value="1" data-p="vol" aria-label="Volume"/>' +
            '<span class="time" data-p="time">0:00 / 0:00</span>' +
            '<span class="grow"></span>' +
            '<button class="lv-pbtn" type="button" data-p="next" aria-label="Next episode" hidden>' + ic('next') + '</button>' +
            (doc.pictureInPictureEnabled ? '<button class="lv-pbtn" type="button" data-p="pip" aria-label="Picture in picture">' + ic('pip') + '</button>' : '') +
            '<button class="lv-pbtn" type="button" data-p="full" aria-label="Full screen">' + ic('full') + '</button>' +
          '</div>' +
        '</div>') +
      '</div>';
    doc.body.appendChild(el);
    doc.documentElement.classList.add('lv-lock');
    S.el = el;
    requestAnimationFrame(function () { el.classList.add('is-on'); });
    L.emit('overlay', true);
    try { history.pushState({ lv: 1, lvPlayer: 1 }, '', location.href); S.pushed = true; } catch (e) {}

    if (frame) mountFrame(res); else mountVideo(res);
    wire();
    idle();
  }

  function mountFrame(res) {
    var f = doc.createElement('iframe');
    f.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
    f.allowFullscreen = true;
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    f.title = S.t.title;
    if (res.source === 'youtube') {
      f.src = 'https://www.youtube-nocookie.com/embed/' + u.ytId(res.ref) + '?autoplay=1&playsinline=1&modestbranding=1&rel=0&iv_load_policy=3&fs=1';
    } else {
      f.src = u.safeUrl(res.ref);
    }
    u.qs('.lv-player-frame', S.el).appendChild(f);
    S.frameStart = Date.now();
  }

  function mountVideo(res) {
    var v = u.qs('video', S.el);
    S.v = v;
    S.el.classList.add('is-wait');
    function go(src) {
      if (!S || S.v !== v) return;
      if (res.source === 'hls' && !v.canPlayType('application/vnd.apple.mpegurl')) {
        loadHls().then(function (Hls) {
          if (!S || S.v !== v) return;
          if (!Hls || !Hls.isSupported()) { fail(); return; }
          var h = new Hls({ enableWorker: true, lowLatencyMode: S.t.kind === 'live' });
          S.hls = h;
          h.loadSource(src);
          h.attachMedia(v);
          h.on(Hls.Events.ERROR, function (_e, d) { if (d && d.fatal) fail(); });
          h.on(Hls.Events.MANIFEST_PARSED, function () { playNow(); });
        }, fail);
      } else {
        v.src = src;
        playNow();
      }
    }
    function playNow() {
      var resume = S.trailer ? 0 : Number(L.store.get(posKey(S.t.id, S.ep), 0));
      if (resume > 30 && S.t.kind !== 'live') {
        v.addEventListener('loadedmetadata', function once() {
          v.removeEventListener('loadedmetadata', once);
          if (v.duration && resume < v.duration * .95) { v.currentTime = resume; L.toast('Picking up where you left off'); }
        });
      }
      var p = v.play();
      if (p && p.catch) p.catch(function () { paintToggle(); S.el.classList.remove('is-wait'); });
    }
    if (res.source === 'upload') {
      var c = L.sb();
      c.storage.from('live-media').createSignedUrl(res.ref, 6 * 3600).then(function (r) {
        if (r && r.data && r.data.signedUrl) go(r.data.signedUrl); else fail();
      }, fail);
    } else {
      go(u.safeUrl(res.ref));
    }
  }

  function fail() {
    if (!S) return;
    S.el.classList.remove('is-wait');
    L.toast('This video could not be loaded. Please try again shortly.');
  }

  /* ── controls ───────────────────────────────────────────────────── */

  function wire() {
    var el = S.el, v = S.v;
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-p]');
      if (!b) { if (v && e.target === v) toggle(); return; }
      var p = b.getAttribute('data-p');
      if (p === 'close') close();
      else if (p === 'toggle') toggle();
      else if (p === 'rew') seekBy(-10);
      else if (p === 'fwd') seekBy(10);
      else if (p === 'mute') { v.muted = !v.muted; paintVol(); }
      else if (p === 'full') full();
      else if (p === 'pip') { try { if (doc.pictureInPictureElement) doc.exitPictureInPicture(); else v.requestPictureInPicture(); } catch (x) {} }
      else if (p === 'next') nextEp();
    });
    if (!v) return;
    el.addEventListener('dblclick', function (e) { if (e.target === v) full(); });
    var vol = u.qs('[data-p="vol"]', el);
    vol.addEventListener('input', function () { v.volume = Number(vol.value); v.muted = v.volume === 0; paintVol(); });
    v.addEventListener('play', paintToggle);
    v.addEventListener('pause', function () { paintToggle(); save(); });
    v.addEventListener('waiting', function () { el.classList.add('is-wait'); });
    v.addEventListener('playing', function () { el.classList.remove('is-wait'); });
    v.addEventListener('canplay', function () { el.classList.remove('is-wait'); });
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('progress', paintBuf);
    v.addEventListener('ended', function () { log(true); L.store.set(posKey(S.t.id, S.ep), 0); if (!nextEp()) close(); });
    v.addEventListener('error', fail);

    var seek = u.qs('[data-p="seek"]', el), dragging = false;
    function seekTo(ev) {
      var r = seek.getBoundingClientRect();
      var x = Math.max(0, Math.min(1, ((ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left) / r.width));
      if (v.duration && isFinite(v.duration)) v.currentTime = x * v.duration;
    }
    seek.addEventListener('pointerdown', function (ev) { dragging = true; seek.setPointerCapture(ev.pointerId); seekTo(ev); });
    seek.addEventListener('pointermove', function (ev) { if (dragging) seekTo(ev); });
    seek.addEventListener('pointerup', function () { dragging = false; });
    seek.addEventListener('keydown', function (ev) { if (ev.key === 'ArrowRight') seekBy(5); if (ev.key === 'ArrowLeft') seekBy(-5); });

    var eps = L.data.episodes[S.t.id] || [];
    var nb = u.qs('[data-p="next"]', el);
    if (nb && S.ep) nb.hidden = !nextOf(eps);
  }

  function nextOf(eps) {
    var i = eps.findIndex(function (e) { return e.id === S.ep; });
    return i >= 0 ? eps[i + 1] : null;
  }
  function nextEp() {
    if (!S || !S.ep) return false;
    var n = nextOf(L.data.episodes[S.t.id] || []);
    if (!n) return false;
    var t = S.t;
    close(true, true);
    open(t, n.id);
    return true;
  }

  function toggle() {
    var v = S && S.v; if (!v) return;
    if (v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause();
    flash(v.paused ? 'pause' : 'play');
  }
  function seekBy(d) {
    var v = S && S.v; if (!v || !isFinite(v.duration)) return;
    v.currentTime = Math.max(0, Math.min(v.duration - .5, v.currentTime + d));
    flash(d > 0 ? 'fwd' : 'rew');
  }
  function full() {
    var el = S && S.el; if (!el) return;
    try {
      if (doc.fullscreenElement) doc.exitFullscreen();
      else if (el.requestFullscreen) el.requestFullscreen();
      else if (S.v && S.v.webkitEnterFullscreen) S.v.webkitEnterFullscreen();
    } catch (e) {}
  }
  function flash(name) {
    var c = S && u.qs('.lv-player-center', S.el); if (!c) return;
    c.innerHTML = ic(name, 1.8);
    c.classList.add('is-on');
    clearTimeout(c._t); c._t = setTimeout(function () { c.classList.remove('is-on'); }, 450);
  }
  function paintToggle() {
    var b = S && u.qs('[data-p="toggle"]', S.el); if (!b) return;
    var paused = S.v.paused;
    b.innerHTML = ic(paused ? 'play' : 'pause');
    b.setAttribute('aria-label', paused ? 'Play' : 'Pause');
    S.el.classList.toggle('is-paused', paused);
  }
  function paintVol() {
    var b = S && u.qs('[data-p="mute"]', S.el); if (!b) return;
    b.innerHTML = ic(S.v.muted || S.v.volume === 0 ? 'mute' : 'volume');
    u.qs('[data-p="vol"]', S.el).value = S.v.muted ? 0 : S.v.volume;
  }
  function paintBuf() {
    var v = S && S.v; if (!v || !v.duration || !v.buffered.length) return;
    var b = u.qs('.lv-seek-buf', S.el);
    b.style.width = (v.buffered.end(v.buffered.length - 1) / v.duration * 100).toFixed(2) + '%';
  }
  function onTime() {
    var v = S.v, now = v.currentTime;
    if (!v.paused && now > S.lastT && now - S.lastT < 2) S.watched += now - S.lastT;
    S.lastT = now;
    var dur = isFinite(v.duration) ? v.duration : 0;
    u.qs('.lv-seek-fill', S.el).style.width = (dur ? now / dur * 100 : 0).toFixed(3) + '%';
    u.qs('[data-p="time"]', S.el).textContent = u.clock(now) + (dur ? ' / ' + u.clock(dur) : ' · live');
    if (Math.floor(now) % 5 === 0) save();
  }
  function save() {
    if (!S || !S.v || S.trailer || S.t.kind === 'live') return;
    L.store.set(posKey(S.t.id, S.ep), Math.floor(S.v.currentTime || 0));
  }
  function log(done) {
    if (!S || S.logged || S.trailer) return;
    var secs = S.v ? Math.round(S.watched) : Math.round((Date.now() - (S.frameStart || Date.now())) / 1000);
    if (secs < 5 && !done) return;
    S.logged = true;
    var dur = S.v && isFinite(S.v.duration) ? S.v.duration : 0;
    var c = L.sb();
    if (c) c.rpc('live_log_play', { p_title: S.t.id, p_episode: S.ep, p_seconds: secs, p_completed: !!done || (dur > 0 && S.v.currentTime / dur > .9), p_device: global.innerWidth < 760 ? 'mobile' : 'desktop' }).then(function () {}, function () {});
  }

  /* The controls step back after three still seconds. */
  var idleT = null;
  function idle() {
    if (!S) return;
    function wake() {
      if (!S) return;
      S.el.classList.remove('is-idle');
      clearTimeout(idleT);
      idleT = setTimeout(function () { if (S && S.v && !S.v.paused) S.el.classList.add('is-idle'); }, 3000);
    }
    S.el.addEventListener('mousemove', wake);
    S.el.addEventListener('touchstart', wake, { passive: true });
    S.el.addEventListener('keydown', wake);
    wake();
  }

  doc.addEventListener('keydown', function (e) {
    if (!S) return;
    var tag = (e.target && e.target.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag) && e.target.type !== 'range') return;
    if (e.key === 'Escape' && !doc.fullscreenElement) { close(); return; }
    if (!S.v) return;
    if (e.key === ' ' || e.key === 'k') { e.preventDefault(); toggle(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); seekBy(10); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); seekBy(-10); }
    else if (e.key === 'f') full();
    else if (e.key === 'm') { S.v.muted = !S.v.muted; paintVol(); }
  });

  /* ── close ──────────────────────────────────────────────────────── */

  function close(instant, keepHistory) {
    if (!S) return;
    save();
    log(false);
    var s = S; S = null;
    if (s.v) { try { s.v.pause(); s.v.removeAttribute('src'); s.v.load(); } catch (e) {} }
    if (s.hls) { try { s.hls.destroy(); } catch (e) {} }
    try { if (doc.fullscreenElement) doc.exitFullscreen(); } catch (e) {}
    doc.documentElement.classList.remove('lv-lock');
    clearTimeout(idleT);
    if (instant) s.el.remove();
    else { s.el.classList.remove('is-on'); setTimeout(function () { s.el.remove(); }, 360); }
    L.emit('overlay', false);
    if (s.pushed && !keepHistory && history.state && history.state.lvPlayer) { L._popSkip = true; try { history.back(); } catch (e) { L._popSkip = false; } }
  }

  /* The back gesture closes the player instead of leaving the title. */
  L.overlayBack = function () {
    if (S) { var s = S; s.pushed = false; close(); return true; }
    return false;
  };

  L.player = {
    open: open,
    trailer: function (t) {
      if (L.music && L.music.isPlaying()) L.music.pause();
      if (t.trailer_url) start(t, { source: 'mp4', ref: t.trailer_url }, { trailer: true });
      else if (t.trailer_youtube) start(t, { source: 'youtube', ref: t.trailer_youtube }, { trailer: true });
    },
    close: function () { close(); },
    isOpen: function () { return !!S; }
  };
})(window);
