/* ═══════════════════════════════════════════════════════════════════
   CABANA KARAOKE · the stage
   ───────────────────────────────────────────────────────────────────
   Everything that happens while someone sings:

     KPlayer     a YouTube player of the stage's own, whose clock is
                 smoothed to the frame, so a word lights up on the
                 syllable, not a quarter second late
     LyricReel   the words: the line being sung large and centred, each
                 word wiped in time (word by word when the lyric has
                 word timing, paced by syllables when it has line
                 timing, followed by voice when it has none), breaths
                 counted down, instrumentals shown as instrumentals
     PitchLane   the notes: the melody Cabana has learned from earlier
                 singers as bars ahead of you, your own voice as a line
                 of light drawn onto them
     LiveJudge   the running reading: words heard by the browser's
                 recogniser, words voiced on their moment, the combo,
                 pitch, and a lyric clock that corrects itself when
                 the singer is clearly early or late throughout
     Stage       the performance itself, solo or in a room: count-in,
                 recording, anchors between the recording's clock and
                 the song's, the relay to a room, the finish
     results     the reveal, once the judge (api/karaoke) has listened

   The lyric sits beside and below the video, never over it: the
   YouTube player is always shown whole.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var L = global.CabanaLive;
  if (!L) return;
  var u = L.u, esc = u.esc, ic = L.ic, doc = global.document;
  var K = global.CabanaKaraokeLyrics, KA = global.CabanaKaraokeAudio, V = global.CabanaVisuals;
  var KK = L.karaoke = L.karaoke || {};

  KK.FN = L.SB_URL + '/functions/v1/karaoke';
  KK.API = '/api/karaoke';
  KK.BUCKET = 'karaoke-takes';

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function nowS() { return (global.performance ? performance.now() : Date.now()) / 1000; }
  KK.clamp = clamp;

  /* ── icons of its own ─────────────────────────────────────────── */
  var KP = {
    mic: '<rect x="9" y="2.5" width="6" height="11.5" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>',
    micOff: '<path d="M9 9V5.5a3 3 0 0 1 5.7-1.3M15 10v1a3 3 0 0 1-4.3 2.7M5.5 11a6.5 6.5 0 0 0 10.4 5.2M18.5 11a6.4 6.4 0 0 1-.6 2.7M12 17.5V21M8.5 21h7M3 3l18 18"/>',
    headphones: '<path d="M3.5 14v-2a8.5 8.5 0 0 1 17 0v2"/><rect x="3" y="14" width="4.5" height="6.5" rx="2"/><rect x="16.5" y="14" width="4.5" height="6.5" rx="2"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3a3 3 0 0 1-3 4M7 5H4a3 3 0 0 0 3 4"/>',
    swords: '<path d="m14.5 17.5 6-6V4h-7.5l-6 6"/><path d="m5 13 6 6M8 16l-4 4M3 21l1-1M9.5 4.5 3 11v7.5h7.5l6.5-6.5"/>',
    bolt: '<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z" fill="currentColor" stroke="none"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor" stroke="none"/>',
    rec: '<circle cx="12" cy="12" r="6.5" fill="currentColor" stroke="none"/>',
    stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" stroke="none"/>',
    wave: '<path d="M3 12h2M7 8v8M11 5v14M15 8v8M19 10v4M21 12h0"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
    link: '<path d="M10 13.5a4.5 4.5 0 0 0 6.4.4l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2"/><path d="M14 10.5a4.5 4.5 0 0 0-6.4-.4l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/>',
    qr: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><path d="M14 14h2.5v2.5H14zM18 18h2.5v2.5H18zM18 14h2.5M14 18v2.5"/>',
    sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    pen: '<path d="M4 20h4L19.5 8.5a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    tv: '<rect x="2.5" y="4.5" width="19" height="13" rx="2.5"/><path d="M8 21h8"/>',
    phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    globe: '<circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5a14.5 14.5 0 0 1 0 19M12 2.5a14.5 14.5 0 0 0 0 19"/>',
    users: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="16.8" cy="9.2" r="2.6"/><path d="M15.6 14.6c2.3-.3 4.3 1.2 4.9 4.4"/>',
    flame: '<path d="M12 21.5c4 0 7-2.8 7-6.7 0-4.1-3.3-6.3-4.2-10.3-2.3 1.4-3.3 3.8-3.2 6-1.4-.8-2.3-2.2-2.5-3.7C7.1 8.6 5 11.4 5 14.8c0 3.9 3 6.7 7 6.7Z"/>',
    sparkles: '<path d="M11 3 12.6 7.4 17 9l-4.4 1.6L11 15l-1.6-4.4L5 9l4.4-1.6zM18.5 14l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" fill="currentColor" stroke="none"/>',
    note: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    replay: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
    trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    crown: '<path d="m3 8 4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="currentColor" stroke="none"/>',
    chat: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.7-.8L3 21l1.9-5.1A8.4 8.4 0 0 1 4 11.5 8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5z"/>'
  };
  KK.ic = function (name, sw) {
    if (!KP[name]) return ic(name, sw);
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 2) +
      '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + KP[name] + '</svg>';
  };
  var kic = KK.ic;

  /* ── talking to Cabana ───────────────────────────────────────── */

  function rpc(fn, args) {
    var c = L.sb();
    if (!c || !c.rpc) return Promise.reject(Object.assign(new Error('offline'), { code: 'offline' }));
    return Promise.resolve(c.rpc(fn, args || {})).then(function (r) {
      if (r && r.error) throw Object.assign(new Error(r.error.message || 'rpc'), { code: r.error.code, msg: r.error.message });
      return r ? r.data : null;
    });
  }
  KK.rpc = rpc;
  function token() {
    if (global.ApaSession && global.ApaSession.token) return global.ApaSession.token().catch(function () { return null; });
    var c = L.sb();
    if (!c || !c.auth) return Promise.resolve(null);
    return c.auth.getSession().then(function (r) { return r && r.data && r.data.session ? r.data.session.access_token : null; }, function () { return null; });
  }
  KK.token = token;
  function api(op, body) {
    return token().then(function (t) {
      var h = { 'Content-Type': 'application/json' };
      if (t) h.Authorization = 'Bearer ' + t;
      return fetch(KK.API + '?op=' + encodeURIComponent(op) + (body && body.perf && !body.post ? '&perf=' + encodeURIComponent(body.perf) : ''), {
        method: body && body.get ? 'GET' : 'POST', headers: h, body: body && !body.get ? JSON.stringify(body) : undefined
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) { d = d || {}; d._status = r.status; return d; });
      });
    });
  }
  KK.api = api;
  KK.me = function () { var s = L.session(); return s && s.user ? s.user.id : null; };

  var songCache = {};
  KK.song = function (vid, dur, fresh) {
    if (!u.ytId(vid)) return Promise.reject(new Error('bad video'));
    if (songCache[vid] && !fresh) return songCache[vid];
    var p = fetch(KK.FN + '?action=song&v=' + encodeURIComponent(vid) + (dur ? '&d=' + Math.round(dur) : ''))
      .then(function (r) { return r.json().then(function (d) { if (!r.ok || !d || !d.song) throw Object.assign(new Error((d && d.error) || 'song'), { code: (d && d.error) || 'song' }); return d.song; }); });
    songCache[vid] = p;
    p.catch(function () { delete songCache[vid]; });
    return p;
  };
  KK.search = function (q) {
    return fetch(KK.FN + '?action=search&q=' + encodeURIComponent(q)).then(function (r) { return r.json(); });
  };
  KK.meta = function (vid) {
    return fetch(KK.FN + '?action=meta&v=' + encodeURIComponent(vid)).then(function (r) { return r.ok ? r.json() : null; }, function () { return null; });
  };

  /* The member's karaoke standing: allowance, VIP, settings. */
  KK.state = null;
  KK.loadState = function () {
    return rpc('karaoke_state').then(function (s) { KK.state = s; L.emit('karaoke-state', s); return s; }, function () { return KK.state; });
  };

  /* One clock for a room: the server's. Five pings, the fastest round
     trip wins, and the offset is kept for the session. */
  var clockP = null;
  KK.clockOffset = 0;
  KK.syncClock = function (force) {
    if (clockP && !force) return clockP;
    var best = null, n = 0;
    clockP = new Promise(function (resolve) {
      (function ping() {
        var t0 = Date.now();
        rpc('karaoke_now').then(function (iso) {
          var t1 = Date.now(), srv = Date.parse(iso);
          if (!isNaN(srv)) {
            var rtt = t1 - t0, off = srv - (t0 + rtt / 2);
            if (!best || rtt < best.rtt) best = { rtt: rtt, off: off };
          }
        }, function () {}).then(function () {
          if (++n < 5) setTimeout(ping, 120);
          else { if (best) KK.clockOffset = best.off; KK.rtt = best ? best.rtt : null; resolve(KK.clockOffset); }
        });
      })();
    });
    return clockP;
  };
  KK.serverNow = function () { return Date.now() + KK.clockOffset; };

  /* A device id for this tab: who is conducting a room. */
  KK.device = (function () { try { return (global.crypto && crypto.randomUUID) ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10); } catch (e) { return Math.random().toString(36).slice(2, 10); } })();

  /* Per-device lyric timing nudge (Bluetooth speakers, slow TVs). */
  KK.nudge = function (v) {
    if (v != null) { L.store.set('kk-nudge', clamp(Math.round(v * 20) / 20, -1.5, 1.5)); }
    return Number(L.store.get('kk-nudge', 0)) || 0;
  };

  KK.songName = function (s) { return (s && (s.track || '')) || u.songOf({ title: (s && s.title) || '', artist: (s && s.artist) || '' }); };
  /* "Name, Name" (a lyric source repeating itself) reads as one name */
  function oneEach(list) {
    var seen = {};
    return String(list || '').split(/\s*,\s*/).filter(function (x) { var k = x.toLowerCase(); if (!x || seen[k]) return false; seen[k] = 1; return true; }).join(', ');
  }
  KK.songArtist = function (s) { return oneEach(s && s.track_artist) || u.artistOf({ artist: (s && s.artist) || '' }); };
  KK.KINDS = {
    karaoke: { label: 'Karaoke track', short: 'Karaoke', tone: 'gold' },
    lyric: { label: 'Lyric video', short: 'Lyric video', tone: 'cyan' },
    original: { label: 'Original video', short: 'Original', tone: 'plain' },
    live: { label: 'Live version', short: 'Live', tone: 'plain' }
  };
  KK.LYRICS = {
    words: { label: 'Word-by-word lyrics', short: 'Word sync', tone: 'lime' },
    synced: { label: 'Timed lyrics', short: 'Synced', tone: 'lime' },
    plain: { label: 'Lyrics, not timed', short: 'Lyrics', tone: 'plain' },
    none: { label: 'No lyrics yet', short: 'Freestyle', tone: 'muted' },
    pending: { label: 'Finding lyrics', short: 'Lyrics…', tone: 'muted' },
    error: { label: 'Lyrics unavailable', short: 'Freestyle', tone: 'muted' }
  };

  /* ── the YouTube player ──────────────────────────────────────── */

  function KPlayer(host, opts) {
    this.host = host;
    this.o = opts || {};
    this.vid = this.o.videoId;
    this.state = -1; this.ready = false; this.rate = 1;
    this.raw = 0; this.rawAt = 0; this.disp = 0; this.dispAt = 0;
    this.subs = {};
    var self = this;
    var slot = doc.createElement('div');
    slot.className = 'kk-yt-slot';
    host.appendChild(slot);
    this.readyP = (L.music && L.music.api ? L.music.api() : Promise.reject(new Error('yt'))).then(function (YT) {
      return new Promise(function (resolve) {
        self.yt = new YT.Player(slot, {
          host: 'https://www.youtube-nocookie.com',
          videoId: self.vid,
          width: '100%', height: '100%',
          playerVars: { autoplay: 0, controls: self.o.controls ? 1 : 0, playsinline: 1, rel: 0, modestbranding: 1, iv_load_policy: 3, disablekb: 1, fs: 0, cc_load_policy: 0, origin: location.origin, start: Math.floor(self.o.start || 0) },
          events: {
            onReady: function () {
              self.ready = true;
              try { if (self.o.mute) self.yt.mute(); if (self.o.volume != null) self.yt.setVolume(self.o.volume); } catch (e) {}
              resolve(self); self.emit('ready');
            },
            onStateChange: function (e) {
              self.state = e.data;
              self.base = null;
              if (e.data === 1) { self.raw = self.yt.getCurrentTime() || 0; self.rawAt = nowS(); self.sample(); }
              self.emit('state', e.data);
              if (e.data === 0) self.emit('ended');
            },
            onError: function (e) { self.emit('error', e && e.data); }
          }
        });
      });
    });
  }
  KPlayer.prototype.on = function (evt, fn) { (this.subs[evt] = this.subs[evt] || []).push(fn); return this; };
  KPlayer.prototype.emit = function (evt, d) { (this.subs[evt] || []).forEach(function (fn) { try { fn(d); } catch (e) { if (global.console) console.error('[kplayer]', e); } }); };
  /* The clock. YouTube reports its time in steps, and each report is
     already a little old when it is read. While the video plays, every
     report is a lower bound on where the video really is: the freshest
     one (the one that puts the video furthest along) is the truth, so
     the clock keeps the best offset between the video and the page's
     own clock, forgets it slowly (a player can run a hair slow, or
     stall), and starts again on a seek, a pause or a stall.
       exact()  the best estimate, for pinning the recording and for
                a room's conductor
       time()   the same, eased, for drawing: a correction glides in
                rather than jumping a word */
  KPlayer.prototype.sample = function () {
    if (!this.ready || !this.yt || !this.yt.getCurrentTime) return;
    var t = nowS(), raw;
    try { raw = this.yt.getCurrentTime() || 0; } catch (e) { return; }
    if (!isFinite(raw)) return;
    var playing = this.state === 1;
    if (raw !== this.raw || !playing) {
      var c = raw - t * this.rate;
      if (!playing || this.base == null || Math.abs(c - this.base) > 0.35) this.base = c;
      else if (c > this.base) this.base = c;
      else this.base = Math.max(c, this.base - 0.004);
      this.raw = raw; this.rawAt = t;
    }
    this.sampledAt = t;
  };
  KPlayer.prototype.exact = function () {
    this.sample();
    if (this.base == null) return this.raw || 0;
    return this.state === 1 ? nowS() * this.rate + this.base : this.raw;
  };
  KPlayer.prototype.time = function () {
    if (!this.ready || !this.yt || !this.yt.getCurrentTime) return this.disp;
    var est = this.exact(), t = nowS();
    if (this.state !== 1) { this.disp = est; this.dispAt = t; return est; }
    var next = this.disp + (t - this.dispAt) * this.rate;
    var err = est - next;
    this.disp = Math.abs(err) > 0.3 ? est : next + err * 0.15;
    this.dispAt = t;
    return this.disp;
  };
  KPlayer.prototype.duration = function () { try { return this.yt && this.yt.getDuration ? this.yt.getDuration() || 0 : 0; } catch (e) { return 0; } };
  KPlayer.prototype.play = function () { try { this.yt.playVideo(); } catch (e) {} };
  KPlayer.prototype.pause = function () { try { this.yt.pauseVideo(); } catch (e) {} };
  KPlayer.prototype.seek = function (t) { try { this.yt.seekTo(Math.max(0, t), true); this.raw = t; this.rawAt = nowS(); this.disp = t; this.dispAt = nowS(); this.base = this.state === 1 ? t - nowS() * this.rate : null; } catch (e) {} };
  KPlayer.prototype.setRate = function (r) { try { this.yt.setPlaybackRate(r); } catch (e) {} this.rate = r; this.base = null; };
  KPlayer.prototype.setVolume = function (v) { try { this.yt.setVolume(clamp(Math.round(v), 0, 100)); } catch (e) {} };
  KPlayer.prototype.mute = function (on) { try { if (on) this.yt.mute(); else this.yt.unMute(); } catch (e) {} };
  KPlayer.prototype.playing = function () { return this.state === 1; };
  KPlayer.prototype.destroy = function () { try { if (this.yt && this.yt.destroy) this.yt.destroy(); } catch (e) {} this.subs = {}; };
  KK.KPlayer = KPlayer;
  KK.ytError = function (code) {
    return code === 101 || code === 150 ? 'The owner of this video does not allow it to play outside YouTube. Pick another version.'
      : code === 100 ? 'This video has been removed or made private.'
      : code === 5 ? 'This video cannot play in this browser.' : 'This video could not play.';
  };

  /* ── the lyric reel ──────────────────────────────────────────── */

  function LyricReel(host, tl, opts) {
    this.host = host;
    this.tl = tl;
    this.o = Object.assign({ lead: 0.12 }, opts || {});
    this.active = -2; this.word = -1;
    this.follow = !tl.synced;
    this.build();
  }
  LyricReel.prototype.build = function () {
    var tl = this.tl, h = '';
    if (!tl.lines.length) {
      this.host.innerHTML = '<div class="kk-reel is-free"><div class="kk-free"><span class="kk-free-ic">' + kic('mic') + '</span><b>Freestyle</b><small>No lyrics for this one yet. Sing it your way: pitch, timing and feel are still heard.</small></div></div>';
      this.lines = []; return;
    }
    h += '<div class="kk-reel' + (tl.synced ? '' : ' is-follow') + '"><div class="kk-track">';
    h += '<div class="kk-line kk-intro" data-l="-1"><span class="kk-dots"><i></i><i></i><i></i></span></div>';
    tl.lines.forEach(function (l) {
      h += '<div class="kk-line" data-l="' + l.i + '">' + l.toks.map(function (t) {
        return (t.j ? '' : ' ') + '<span class="kk-w' + (t.b ? ' is-bk' : '') + '" data-i="' + t.i + '">' + esc(t.x) + '</span>';
      }).join('').trim() + '</div>';
    });
    h += '<div class="kk-line kk-outro" data-l="999"><span>' + kic('sparkles') + '</span></div>';
    h += '</div><div class="kk-gap" hidden><span class="kk-gap-k">' + kic('note') + ' Instrumental</span><span class="kk-gap-bar"><i></i></span></div></div>';
    this.host.innerHTML = h;
    this.reel = this.host.querySelector('.kk-reel');
    this.track = this.host.querySelector('.kk-track');
    this.gapEl = this.host.querySelector('.kk-gap');
    this.gapBar = this.host.querySelector('.kk-gap-bar i');
    this.lines = Array.prototype.slice.call(this.host.querySelectorAll('.kk-line'));
    this.byLine = {};
    var self = this;
    this.lines.forEach(function (el) { self.byLine[el.getAttribute('data-l')] = el; });
    this.words = Array.prototype.slice.call(this.host.querySelectorAll('.kk-w'));
    this.intro = this.byLine['-1'];
  };
  LyricReel.prototype.lineAt = function (t) {
    var L2 = this.tl.lines, lo = 0, hi = L2.length - 1, ans = -1;
    while (lo <= hi) { var mid = (lo + hi) >> 1; if (L2[mid].t <= t + this.o.lead) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
    return ans;
  };
  LyricReel.prototype.center = function (idx) {
    var el = this.byLine[String(idx)] || this.intro;
    if (!el || !this.track) return;
    var box = this.reel.getBoundingClientRect();
    var y = el.offsetTop + el.offsetHeight / 2 - box.height * 0.42;
    this.track.style.transform = 'translate3d(0,' + (-y).toFixed(1) + 'px,0)';
  };
  LyricReel.prototype.setActive = function (idx) {
    if (idx === this.active) return;
    var prev = this.active;
    this.active = idx;
    var self = this;
    this.lines.forEach(function (el) {
      var l = Number(el.getAttribute('data-l'));
      var d = l - idx;
      el.classList.toggle('is-now', d === 0);
      el.classList.toggle('is-next', d === 1);
      el.classList.toggle('is-past', d < 0);
      el.classList.toggle('is-far', Math.abs(d) > 2);
    });
    if (idx > prev && prev >= 0) {
      /* everything before this line is finished */
      var start = this.tl.lines[prev] ? this.tl.lines[prev].toks[0].i : 0;
      var end = this.tl.lines[idx] ? this.tl.lines[idx].toks[0].i : this.words.length;
      for (var i = start; i < end && i < this.words.length; i++) { this.words[i].classList.add('is-sung'); this.words[i].style.removeProperty('--p'); }
    }
    this.center(idx);
    void self;
  };
  /* t is the song time the singer hears. */
  LyricReel.prototype.render = function (t) {
    if (!this.lines.length || this.follow) return;
    var tl = this.tl, li = this.lineAt(t);
    var first = tl.lines[0];
    if (li < 0) {
      this.setActive(-1);
      /* count-in dots over the last 2.4 seconds before the first line */
      var left = first.t - t;
      if (this.intro) this.intro.setAttribute('data-n', left > 2.4 ? 3 : Math.max(0, Math.ceil(left / 0.8)));
      this.gap(false);
      return;
    }
    var line = tl.lines[li];
    var next = tl.lines[li + 1];
    /* a long instrumental after this line: show it as one */
    if (line.e != null && t > line.e + 0.6 && next && next.t - line.e > 5) {
      this.setActive(li);
      var span = next.t - line.e, p = clamp((t - line.e) / span, 0, 1);
      this.gap(true, p, next.t - t);
      this.paintWords(line, t);
      return;
    }
    if (!next && line.e != null && t > line.e + 2) { this.setActive(999); this.gap(false); return; }
    this.gap(false);
    this.setActive(li);
    this.paintWords(line, t);
  };
  LyricReel.prototype.paintWords = function (line, t) {
    for (var k = 0; k < line.toks.length; k++) {
      var tk = line.toks[k], el = this.words[tk.i];
      if (!el) continue;
      if (tk.e != null && t >= tk.e) { if (!el.classList.contains('is-sung')) { el.classList.add('is-sung'); el.style.removeProperty('--p'); } }
      else if (tk.t != null && t >= tk.t) { el.classList.remove('is-sung'); el.style.setProperty('--p', (clamp((t - tk.t) / Math.max(0.05, tk.e - tk.t), 0, 1) * 100).toFixed(1) + '%'); }
      else { if (el.classList.contains('is-sung')) el.classList.remove('is-sung'); el.style.removeProperty('--p'); }
    }
  };
  LyricReel.prototype.gap = function (on, p, left) {
    if (!this.gapEl) return;
    if (!on) { if (!this.gapEl.hidden) this.gapEl.hidden = true; return; }
    this.gapEl.hidden = false;
    this.gapBar.style.width = (p * 100).toFixed(1) + '%';
    this.gapEl.classList.toggle('is-soon', left < 2.6);
  };
  /* Plain lyrics: the voice decides where we are. */
  LyricReel.prototype.followTo = function (tokenIdx) {
    if (!this.follow || !this.lines.length) return;
    var tok = this.tl.tokens[Math.min(tokenIdx, this.tl.tokens.length - 1)];
    if (!tok) return;
    this.setActive(tok.li);
    for (var i = 0; i < this.words.length; i++) this.words[i].classList.toggle('is-sung', i < tokenIdx);
  };
  LyricReel.prototype.mark = function (i, how) {
    var el = this.words[i];
    if (!el) return;
    if (how === 'hit') { el.classList.add('is-hit'); el.classList.remove('is-miss', 'is-voiced'); }
    else if (how === 'voiced') { if (!el.classList.contains('is-hit')) el.classList.add('is-voiced'); }
    else if (how === 'miss') { if (!el.classList.contains('is-hit') && !el.classList.contains('is-voiced')) el.classList.add('is-miss'); }
  };
  LyricReel.prototype.relayout = function () { if (this.active > -2) this.center(this.active); };
  KK.LyricReel = LyricReel;

  /* ── the pitch lane ──────────────────────────────────────────── */

  function PitchLane(canvas, opts) {
    this.cv = canvas;
    this.o = Object.assign({ past: 2.2, ahead: 4, span: 16 }, opts || {});
    this.trail = [];
    this.center = 60;
    this.melody = null;
    this.bars = null;
    this.ctx = canvas.getContext('2d');
    this.dpr = Math.min(2, global.devicePixelRatio || 1);
  }
  PitchLane.prototype.setMelody = function (b64) {
    if (!b64 || !K) { this.melody = null; this.bars = null; return; }
    var m = K.unb64(b64), bars = [], cur = null;
    for (var i = 0; i < m.length >> 1; i++) {
      var pc = m[2 * i], conf = m[2 * i + 1];
      if (!pc || conf < 2) { cur = null; continue; }
      var q = pc - 1;
      if (cur && Math.abs(cur.q - q) <= 1 && i === cur.end + 1) { cur.end = i; cur.conf = Math.max(cur.conf, conf); }
      else { cur = { q: q, start: i, end: i, conf: conf }; bars.push(cur); }
    }
    this.melody = m;
    this.bars = bars.filter(function (b) { return b.end - b.start >= 1; });
  };
  PitchLane.prototype.push = function (t, midi) {
    this.trail.push({ t: t, m: midi });
    if (this.trail.length > 400) this.trail.splice(0, this.trail.length - 400);
    if (midi != null) this.center += (midi - this.center) * 0.02;
  };
  PitchLane.prototype.resize = function () {
    var r = this.cv.getBoundingClientRect();
    var w = Math.max(10, Math.round(r.width * this.dpr)), h = Math.max(10, Math.round(r.height * this.dpr));
    if (this.cv.width !== w || this.cv.height !== h) { this.cv.width = w; this.cv.height = h; }
  };
  PitchLane.prototype.render = function (t, hits) {
    var c = this.ctx, W = this.cv.width, H = this.cv.height, o = this.o;
    if (!W || !H) return;
    c.clearRect(0, 0, W, H);
    var nowX = W * 0.28, pps = (W - nowX) / o.ahead;
    var lo = this.center - o.span / 2, ppn = H / o.span;
    function y(m) { return H - (m - lo) * ppn; }
    function x(tt) { return nowX + (tt - t) * pps; }
    /* semitone rails, C a little brighter */
    for (var n = Math.ceil(lo); n <= lo + o.span; n++) {
      c.fillStyle = ((n % 12) + 12) % 12 === 0 ? 'rgba(255,255,255,.10)' : 'rgba(255,255,255,.035)';
      c.fillRect(0, Math.round(y(n)), W, 1);
    }
    /* the learned melody, placed in the octave nearest the singer */
    if (this.bars) {
      var from = (t - o.past) * K.FPS, to = (t + o.ahead) * K.FPS;
      for (var i = 0; i < this.bars.length; i++) {
        var b = this.bars[i];
        if (b.end < from) continue;
        if (b.start > to) break;
        var m = b.q / 4, oct = Math.round((this.center - m) / 12);
        var mm = m + oct * 12;
        var x0 = x(b.start / K.FPS), x1 = x((b.end + 1) / K.FPS), yy = y(mm);
        var hit = hits && hits(b);
        c.fillStyle = hit ? 'rgba(255,217,120,.9)' : 'rgba(255,255,255,' + (0.12 + Math.min(0.25, b.conf / 60)).toFixed(3) + ')';
        roundRect(c, x0, yy - ppn * 0.42, Math.max(3, x1 - x0 - 2), ppn * 0.84, Math.min(6, ppn * 0.42));
      }
    }
    /* your voice */
    c.lineWidth = Math.max(2, 3 * this.dpr);
    c.lineCap = 'round'; c.lineJoin = 'round';
    var grad = c.createLinearGradient(0, 0, nowX, 0);
    grad.addColorStop(0, 'rgba(255,79,216,0)'); grad.addColorStop(1, 'rgba(255,79,216,.95)');
    c.strokeStyle = grad;
    c.beginPath();
    var pen = false;
    for (var k = 0; k < this.trail.length; k++) {
      var p = this.trail[k];
      if (p.t < t - o.past || p.m == null) { pen = false; continue; }
      var px = x(p.t), py = y(p.m);
      if (!pen) { c.moveTo(px, py); pen = true; } else c.lineTo(px, py);
    }
    c.stroke();
    /* the now line and the head */
    c.fillStyle = 'rgba(255,255,255,.25)';
    c.fillRect(Math.round(nowX), 0, Math.max(1, this.dpr), H);
    var last = this.trail[this.trail.length - 1];
    if (last && last.m != null && t - last.t < 0.25) {
      var hy = y(last.m);
      c.fillStyle = '#fff';
      c.shadowColor = 'rgba(255,79,216,.9)'; c.shadowBlur = 16 * this.dpr;
      c.beginPath(); c.arc(nowX, hy, 5 * this.dpr, 0, Math.PI * 2); c.fill();
      c.shadowBlur = 0;
    }
  };
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
    c.fill();
  }
  KK.PitchLane = PitchLane;

  /* ── the live reading ────────────────────────────────────────────
     Two clocks come in: the lyric clock (the video's time less the
     learned offset) for words, and the song clock (the video's own
     time) for the melody, which was learned on the song clock. */

  function LiveJudge(tl, song) {
    this.tl = tl;
    this.song = song || {};
    this.m = tl.tokens.length ? new K.StreamMatcher(tl, {}) : null;
    this.voiced = new Float32Array(tl.tokens.length);
    this.state = new Uint8Array(tl.tokens.length);  /* 0 open, 1 heard, 2 voiced, 3 missed */
    this.judged = 0;
    this.combo = 0; this.best = 0;
    this.recognizing = false;
    this.shift = 0;               /* seconds the singer is consistently late (+) or early (-) */
    this.votes = {}; this.voteN = 0;
    this.seen = {};
    this.pitchSum = 0; this.pitchN = 0;
    this.mel = song && song.melody && song.melody_n >= 3 ? K.unb64(song.melody) : null;
    this.hitW = 0; this.voiceW = 0; this.totalW = 0;
    this.heard = 0;
  }
  /* Words from the recogniser. Each word's moment is when it first
     appeared (interim results arrive within a second of the singing;
     the final one can come many seconds later). */
  LiveJudge.prototype.words = function (key, words, lyricClock, isFinal) {
    if (!this.m) return [];
    this.recognizing = true;
    var seen = this.seen[key] || (this.seen[key] = []);
    for (var w = 0; w < words.length; w++) {
      var n = K.norm(words[w]);
      if (!seen[w] || seen[w].n !== n) seen[w] = { n: n, t: lyricClock };
    }
    var hits = this.m.feed(key, words, lyricClock - this.shift);
    var self = this;
    hits.forEach(function (i) { if (self.state[i] !== 1) { self.state[i] = 1; self.heard++; } });
    if (isFinal) { this.autoSync(seen); delete this.seen[key]; }
    return hits;
  };
  /* The lyric clock corrects itself when the singer is clearly and
     consistently ahead of or behind it: every distinctive word heard
     votes for how far off the clock is, and five agreeing votes move
     it. */
  LiveJudge.prototype.autoSync = function (seen) {
    if (!this.tl.synced || !this.tl.tokens.length) return;
    var toks = this.tl.tokens;
    for (var w = 0; w < seen.length; w++) {
      var s = seen[w];
      if (!s || s.n.length < 4 || K.weightOf(s.n, false) < 1) continue;
      var heardAt = s.t - 0.7;
      for (var i = 0; i < toks.length; i++) {
        var tk = toks[i];
        if (tk.b || tk.t == null || tk.n !== s.n) continue;
        var d = heardAt - tk.t;
        if (d > -20 && d < 20) this.vote(d);
      }
    }
  };
  LiveJudge.prototype.vote = function (d) {
    var b = Math.round(d / 0.25);
    this.votes[b] = (this.votes[b] || 0) + 1;
    this.voteN++;
    if (this.voteN < 5) return;
    var best = 0, bestN = 0, total = 0, v = this.votes;
    Object.keys(v).forEach(function (k) { total += v[k]; });
    Object.keys(v).forEach(function (k) {
      var n = v[k] + 0.6 * ((v[+k - 1] || 0) + (v[+k + 1] || 0));
      if (n > bestN) { bestN = n; best = +k; }
    });
    var off = best * 0.25;
    /* A recogniser hears late by its own half second to a second and a
       half, depending on the network: an offset inside that says nothing
       about the lyric. A big, agreed one (a karaoke cut with a longer
       intro than the lyric was timed to) moves the words. */
    var target = Math.abs(off) >= 1.25 ? off : 0;
    if (bestN >= 4 && bestN / total > 0.4 && Math.abs(target - this.shift) > 0.45 && Math.abs(target) < 15) {
      this.shift = target;
      if (this.onShift) this.onShift(target);
    }
  };
  /* The microphone, fifty times a second. */
  LiveJudge.prototype.voice = function (lyricClock, songClock, midi, db) {
    if (midi != null) {
      if (this.mel) {
        var idx = Math.round(songClock * K.FPS), n = this.mel.length >> 1, best = -1;
        for (var d = -2; d <= 2; d++) {
          var j = idx + d;
          if (j < 0 || j >= n || !this.mel[2 * j] || this.mel[2 * j + 1] < 2) continue;
          var q = this.mel[2 * j] - 1, p = ((Math.round(midi * 4) % 48) + 48) % 48, dd = Math.abs(q - p) % 48;
          if (dd > 24) dd = 48 - dd;
          var s = dd <= 2 ? 1 : dd <= 4 ? 0.6 : dd <= 6 ? 0.25 : 0;
          if (s > best) best = s;
        }
        if (best >= 0) { this.pitchSum += best; this.pitchN++; }
      } else {
        var r = Math.abs(midi - Math.round(midi));
        this.pitchSum += Math.max(0, 1 - r / 0.35); this.pitchN++;
      }
    }
    if (!this.tl.tokens.length || !this.tl.synced) return;
    /* voice on a word's moment counts toward that word */
    var st = lyricClock - this.shift, toks = this.tl.tokens;
    for (var i = Math.max(0, this.judged - 2); i < toks.length && i < this.judged + 14; i++) {
      var tk = toks[i];
      if (tk.t == null || st < tk.t - 0.15) break;
      if (st <= tk.e + 0.35 && (midi != null || db > -42)) this.voiced[i] += 0.02;
    }
  };
  /* On the clock: words whose moment has passed are judged. */
  LiveJudge.prototype.tick = function (lyricClock, all) {
    var out = [], self = this;
    if (!this.m) return out;
    var st = lyricClock - this.shift;
    function judged(i, how) {
      var tk = self.tl.tokens[i];
      if (tk.b || !tk.wt) return;
      self.totalW += tk.wt;
      if (how === 'hit') { self.hitW += tk.wt; self.combo++; }
      else if (how === 'voiced') { self.voiceW += tk.wt; if (!self.recognizing) self.combo++; }
      else if (tk.wt >= 0.6) self.combo = 0;
      if (self.combo > self.best) self.best = self.combo;
      out.push([i, how]);
    }
    if (this.tl.synced) {
      var toks = this.tl.tokens;
      while (this.judged < toks.length) {
        var tk = toks[this.judged];
        if (tk.e > st - 1.6) break;
        var i = this.judged++;
        var dur = Math.max(0.12, tk.e - tk.t);
        if (this.state[i] === 1) judged(i, 'hit');
        else if (this.voiced[i] / dur >= 0.35) { this.state[i] = 2; judged(i, 'voiced'); }
        else { this.state[i] = 3; judged(i, 'miss'); }
      }
    } else {
      /* plain lyrics: the matcher's cursor is the judge */
      this.m.judge(st, all).forEach(function (i) { judged(i, self.state[i] === 1 ? 'hit' : 'miss'); });
    }
    return out;
  };
  LiveJudge.prototype.parts = function () {
    var lyrics = null;
    if (this.totalW > 0) {
      lyrics = this.recognizing ? (this.hitW + 0.45 * this.voiceW) / this.totalW : 0.82 * (this.hitW + this.voiceW) / this.totalW;
      lyrics = clamp(lyrics, 0, 1);
    }
    var pitch = this.pitchN >= 25 ? this.pitchSum / this.pitchN : null;
    return { lyrics: lyrics, pitch: pitch, timing: null, expression: null };
  };
  LiveJudge.prototype.score = function () {
    var p = this.parts();
    if (p.lyrics == null && p.pitch == null) return null;
    return K.finalScore(p);
  };
  KK.LiveJudge = LiveJudge;

  /* ── the performance ─────────────────────────────────────────────
     opts:
       host      the element the stage fills
       song      the song row (with lyrics)
       record    sing for the record (a performance from karaoke_begin)
       perf      { id, folder, ranked, vip, remaining }
       video     true: this device plays the video; false: it follows
                 a room's clock (a phone used as a microphone)
       follow    () => song time this device should treat as "now"
                 (remote microphone mode)
       mic       an open KA.Mic, or null to sing without one
       relay     (packet) => send the voice to a room
       onTick    (clock) => a conductor's heartbeat for a room
       onLive    (reading) => four times a second, for a room's screen
       onEnd     ({take, reason}) => the song is over
       room      the room, for the header */
  function Stage(opts) {
    this.o = opts;
    this.song = opts.song;
    var doc0 = this.song.lyrics && Array.isArray(this.song.lyrics.lines) ? this.song.lyrics : null;
    this.tl = doc0 ? K.timeline({ synced: doc0.synced, lines: doc0.lines }, { duration: this.song.duration_s || 0 }) : { lines: [], tokens: [], synced: false };
    this.judge = new LiveJudge(this.tl, this.song);
    this.offset = (Number(this.song.offset_s) || 0) + KK.nudge();
    this.timemap = [];
    this.lastAnchor = -99;
    this.alive = true;
    this.state = 'ready';
    this.lastLive = 0;
    this.lastTick = 0;
    this.effects = [];
  }
  KK.Stage = Stage;

  Stage.prototype.mount = function () {
    var s = this.song, o = this.o, self = this;
    var host = this.host = o.host;
    host.classList.add('kk-stage');
    host.innerHTML =
      '<div class="kk-bg" aria-hidden="true"></div>' +
      '<header class="kk-top">' +
        '<button class="lv-round lv-round-sm" type="button" data-k="leave" aria-label="Leave the stage">' + ic('back') + '</button>' +
        '<div class="kk-top-t"><b>' + esc(KK.songName(s)) + '</b><span>' + esc(KK.songArtist(s)) + '</span></div>' +
        '<span class="kk-mode ' + (o.record ? 'is-rec' : 'is-practice') + '">' + (o.record ? '<i class="kk-rec-dot"></i>' + (o.perf && o.perf.ranked ? 'Ranked take' : 'Recording') : kic('sparkles') + 'Practice') + '</span>' +
        '<span style="flex:1"></span>' +
        (o.room ? '<span class="kk-top-room">' + kic('users') + '<span data-k="aud">' + esc(o.room.title || 'Room') + '</span></span>' : '') +
        '<button class="lv-round lv-round-sm" type="button" data-k="sync" aria-label="Lyric timing">' + kic('sliders') + '</button>' +
      '</header>' +
      '<div class="kk-main' + (o.video === false ? ' is-remote' : '') + '">' +
        '<div class="kk-screen">' +
          (o.video === false ? '<div class="kk-remote-art" style="background-image:url(' + u.ytThumb(s.video_id, 'hqdefault') + ')"><span>' + kic('tv') + 'Playing on the big screen</span></div>'
            : '<div class="kk-video"><div class="kk-video-in" data-k="video"></div><div class="kk-video-ring"></div></div>') +
          '<div class="kk-lane-wrap"><canvas class="kk-lane"></canvas><span class="kk-note" data-k="note"></span></div>' +
        '</div>' +
        '<div class="kk-lyrics" data-k="lyrics"></div>' +
      '</div>' +
      '<footer class="kk-hud">' +
        '<div class="kk-meter"><span class="kk-mic-ring" data-k="ring">' + kic('mic') + '</span><div><b data-k="live">–</b><small>Live score</small></div></div>' +
        '<div class="kk-combo" data-k="combo" hidden><b>0</b><small>combo</small></div>' +
        '<div class="kk-prog"><div class="kk-prog-bar"><i data-k="prog"></i></div><span data-k="time">0:00</span></div>' +
        '<div class="kk-hud-r">' +
          '<button class="lv-pbtn" type="button" data-k="pause" aria-label="Pause">' + ic('pause') + '</button>' +
          '<button class="kk-finish" type="button" data-k="finish">' + kic('stop') + '<span>Finish</span></button>' +
        '</div>' +
      '</footer>' +
      '<div class="kk-count" data-k="count" hidden></div>' +
      '<div class="kk-shift" data-k="shift" hidden></div>';
    this.$ = function (k) { return host.querySelector('[data-k="' + k + '"]'); };
    this.reel = new LyricReel(this.$('lyrics'), this.tl);
    this.judge.onShift = function (off) {
      var el = self.$('shift');
      el.textContent = off > 0 ? 'Lyrics moved ' + off.toFixed(1) + 's later to follow you' : 'Lyrics moved ' + (-off).toFixed(1) + 's earlier to follow you';
      el.hidden = false; el.classList.remove('is-on'); void el.offsetWidth; el.classList.add('is-on');
      setTimeout(function () { el.hidden = true; }, 3200);
    };
    var cv = host.querySelector('.kk-lane');
    this.lane = new PitchLane(cv);
    if (s.melody && s.melody_n >= 3) this.lane.setMelody(s.melody);
    this.lane.resize();
    /* the light behind it all */
    if (V) {
      var bpm = Number(s.bpm) || 100;
      this.vis = V.create(this.$('bg') || host.querySelector('.kk-bg'), { bpm: bpm, calm: 0.45, scene: 3 });
      if (this.vis && this.vis.clock) {
        this.vis.clock.clock = function () { return self.songTime(); };
        this.vis.clock.source = s.bpm ? 'known' : 'genre';
      }
      V.paletteFrom(u.ytThumb(s.video_id, 'mqdefault'), ['#FF4FD8', '#7B61FF', '#FFD978']).then(function (pal) { if (self.vis) self.vis.setColors(pal); });
    }
    host.addEventListener('click', function (e) {
      var b = e.target.closest('[data-k]'); if (!b) return;
      var k = b.getAttribute('data-k');
      if (k === 'pause') self.togglePause();
      else if (k === 'finish') self.finish('user');
      else if (k === 'leave') { if (self.o.onLeave) self.o.onLeave(); }
      else if (k === 'sync') self.syncPanel();
    });
    this.onResize = function () { self.lane.resize(); self.reel.relayout(); };
    global.addEventListener('resize', this.onResize);
    this.onKey = function (e) {
      if (/INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) return;
      if (e.key === ' ' && self.o.video !== false) { e.preventDefault(); self.togglePause(); }
    };
    doc.addEventListener('keydown', this.onKey);
    return this;
  };

  /* The time the singer hears, on the lyric's clock. */
  Stage.prototype.songTime = function () {
    if (this.o.video === false) return this.o.follow ? this.o.follow() : 0;
    if (!this.player) return 0;
    var lat = this.o.mic ? this.o.mic.latency.out : 0.03;
    return this.player.time() - lat;
  };
  /* The same moment, unsmoothed: what the recording is pinned to. */
  Stage.prototype.songExact = function () {
    if (this.o.video === false) return this.o.follow ? this.o.follow() : 0;
    if (!this.player) return 0;
    var lat = this.o.mic ? this.o.mic.latency.out : 0.03;
    return this.player.exact() - lat;
  };
  /* The lyric's clock: the song less what this video's lyric is known
     to be off by (and this device's own nudge). The reel also allows
     for the singer's own lateness once the judge has measured it. */
  Stage.prototype.lyricClock = function () { return this.songTime() - this.offset; };
  Stage.prototype.lyricTime = function () { return this.lyricClock() - this.judge.shift; };

  Stage.prototype.start = function () {
    var self = this, o = this.o;
    this.mount();
    var ready;
    if (o.video !== false) {
      this.player = new KPlayer(this.$('video'), { videoId: this.song.video_id, start: o.start || 0 });
      this.player.on('state', function (st) { self.onPlayerState(st); });
      this.player.on('ended', function () { self.finish('ended'); });
      this.player.on('error', function (code) { self.fail(KK.ytError(code), code); });
      ready = this.player.readyP;
    } else ready = Promise.resolve();
    if (o.mic) {
      o.mic.on('frame', function (f) { self.onFrame(f); });
      o.mic.on('lost', function () { L.toast('The microphone stopped. Your take so far is kept.'); });
    }
    return ready.then(function () { return self.countIn(); }).then(function () {
      if (!self.alive) return;
      if (o.video !== false) self.player.play();
      return self.startRecording();
    }).then(function () {
      if (!self.alive) return;
      self.state = 'live';
      if (o.mic && global.CabanaKaraokeAudio.Recognizer.supported() && self.tl.tokens.length) {
        self.rec = new KA.Recognizer(KA.langTag(self.song.lang), function (key, words, isFinal) {
          var hits = self.judge.words(key, words, self.lyricClock(), isFinal);
          hits.forEach(function (i) { self.reel.mark(i, 'hit'); });
          if (!self.tl.synced && self.judge.m) self.reel.followTo(self.judge.m.cursor);
        }, function (st) { self.host.classList.toggle('is-asr', st === 'listening'); });
        self.rec.start();
      }
      self.loop();
    });
  };

  Stage.prototype.countIn = function () {
    var self = this, el = this.$('count');
    if (!el) return Promise.resolve();
    var n = 3;
    el.hidden = false;
    return new Promise(function (resolve) {
      (function step(k) {
        if (!self.alive) return resolve();
        if (k === 0) {
          el.innerHTML = '<b class="is-go">Sing!</b>';
          KA.sfx('go');
          setTimeout(function () { el.hidden = true; resolve(); }, 450);
          return;
        }
        el.innerHTML = '<b>' + k + '</b>';
        KA.sfx('tick', { high: k === 1 });
        setTimeout(function () { step(k - 1); }, 750);
      })(n);
    });
  };

  Stage.prototype.startRecording = function () {
    var self = this, o = this.o;
    if (!o.record || !o.mic) return Promise.resolve();
    return o.mic.startRecording().then(function () {
      self.anchor(true);
      if (o.relay) o.mic.setRelay(true, function (ctxTime) { return self.songAtCtx(ctxTime); }, o.relay);
    }, function () {
      L.toast('This browser cannot record here. You are singing in practice mode.');
      o.record = false;
    });
  };
  /* song time for an audio-context time on the microphone's clock */
  Stage.prototype.songAtCtx = function (ctxTime) {
    var mic = this.o.mic;
    if (!mic || !mic.ctx) return null;
    return this.songExact() - (mic.ctx.currentTime - ctxTime) - mic.latency.in;
  };
  /* An anchor: this moment of the recording is this moment of the song. */
  Stage.prototype.anchor = function (force) {
    var mic = this.o.mic;
    if (!mic || !mic.recording) return;
    var rec = mic.recTime(), song = this.songExact() - mic.latency.in;
    if (!force && rec - this.lastAnchor < 5) return;
    this.lastAnchor = rec;
    var e = [+rec.toFixed(3), +song.toFixed(3)];
    if (this.timemap.length >= 58) {
      /* keep the ones that matter: drop a middle anchor that its
         neighbours already predict */
      for (var i = 1; i < this.timemap.length - 1; i++) {
        var a = this.timemap[i - 1], b = this.timemap[i];
        if (Math.abs((b[1] - a[1]) - (b[0] - a[0])) < 0.05) { this.timemap.splice(i, 1); break; }
      }
      if (this.timemap.length >= 58) this.timemap.splice(1, 1);
    }
    this.timemap.push(e);
  };

  Stage.prototype.onPlayerState = function (st) {
    var pause = this.$('pause');
    if (pause) pause.innerHTML = ic(st === 1 ? 'pause' : 'play');
    if (this.vis) this.vis.setPlaying(st === 1);
    this.host.classList.toggle('is-paused', st === 2);
    /* play, pause and the end are exact moments of the song: the
       recording is pinned to them */
    if (st === 1 || st === 2 || st === 0) this.anchor(true);
    if (st === 0) this.endedAt = true;
    if (this.o.onTick) this.tick(true);
  };
  Stage.prototype.togglePause = function () {
    if (!this.player || this.state !== 'live') return;
    if (this.player.playing()) this.player.pause(); else this.player.play();
  };

  Stage.prototype.onFrame = function (f) {
    if (this.state !== 'live') return;
    var song = this.songTime();
    this.judge.voice(song - this.offset, song, f.midi, f.db);
    this.lane.push(song, f.midi);
    var ring = this.ringEl || (this.ringEl = this.$('ring'));
    if (ring) ring.style.setProperty('--lvl', clamp((f.db + 60) / 50, 0, 1).toFixed(2));
    if (f.midi != null) {
      var note = this.noteEl || (this.noteEl = this.$('note'));
      if (note && (!this.lastNote || nowS() - this.lastNote > 0.12)) { note.textContent = KA.noteName(f.midi); this.lastNote = nowS(); }
    }
  };

  Stage.prototype.loop = function () {
    var self = this;
    var last = 0;
    (function frame() {
      if (!self.alive) return;
      self.raf = global.requestAnimationFrame(frame);
      self.reel.render(self.lyricTime());
      self.lane.render(self.songTime(), null);
      var n = nowS();
      if (n - last > 0.1) {
        last = n;
        var changed = self.judge.tick(self.lyricClock());
        changed.forEach(function (c) { self.reel.mark(c[0], c[1]); });
        self.hud(changed);
        self.anchor(false);
        if (self.o.onTick) self.tick(false);
        if (self.o.onLive && n - self.lastLive > 0.5) { self.lastLive = n; self.o.onLive(self.reading()); }
      }
    })();
  };
  Stage.prototype.reading = function () {
    var j = this.judge, mic = this.o.mic;
    return { s: j.score(), c: j.combo, b: j.best, m: mic ? mic.midi : null, l: mic ? +clamp((mic.level + 60) / 50, 0, 1).toFixed(2) : 0, h: j.heard, t: +this.songTime().toFixed(2) };
  };
  Stage.prototype.tick = function (force) {
    var n = nowS();
    if (!force && n - this.lastTick < 2) return;
    this.lastTick = n;
    if (!this.player) return;
    var t = this.player.exact();
    this.o.onTick({ s: +t.toFixed(3), a: Math.round(KK.serverNow() - t * 1000), p: this.player.playing() ? 1 : 0, v: this.song.video_id });
  };
  Stage.prototype.hud = function (changed) {
    var j = this.judge, sc = j.score();
    var live = this.$('live');
    if (live) live.textContent = sc == null ? '–' : String(sc);
    var cb = this.$('combo');
    if (cb) {
      cb.hidden = j.combo < 4;
      var b = cb.querySelector('b');
      if (b && b.textContent !== String(j.combo)) {
        b.textContent = String(j.combo);
        if (j.combo && j.combo % 10 === 0) { cb.classList.remove('is-pop'); void cb.offsetWidth; cb.classList.add('is-pop'); KA.sfx('combo'); if (this.vis) this.vis.ripple(0, -0.2, 0.8); }
      }
    }
    var d = this.player ? this.player.duration() : (this.song.duration_s || 0);
    var st = this.o.video === false ? this.songTime() : (this.player ? this.player.time() : 0);
    var p = this.$('prog'); if (p && d) p.style.width = clamp(st / d * 100, 0, 100).toFixed(2) + '%';
    var tm = this.$('time'); if (tm) tm.textContent = u.clock(st) + (d ? ' / ' + u.clock(d) : '');
    if (changed && changed.some(function (c) { return c[1] === 'hit'; }) && Math.random() < 0.35) KA.sfx('hit');
    /* a remote microphone ends when the room's song does */
    if (this.o.video === false && d && st > d - 0.2 && this.state === 'live') this.finish('ended');
  };

  Stage.prototype.syncPanel = function () {
    var self = this;
    var m = L.modal('<div class="kk-syncp"><h2>Lyric timing</h2><p>If the words light up before or after you hear them (Bluetooth speakers, a slow TV), move them here. It is remembered on this device.</p>' +
      '<div class="kk-syncp-row"><button class="lv-btn lv-btn-ghost lv-btn-sm" type="button" data-n="-0.1">Earlier</button><b data-n-v>' + (KK.nudge() >= 0 ? '+' : '') + KK.nudge().toFixed(2) + 's</b><button class="lv-btn lv-btn-ghost lv-btn-sm" type="button" data-n="0.1">Later</button></div>' +
      '<div class="acts"><button class="lv-btn lv-btn-ghost lv-btn-sm" type="button" data-n="reset">Reset</button><button class="lv-btn lv-btn-accent" type="button" data-close>Done</button></div></div>');
    m.addEventListener('click', function (e) {
      var b = e.target.closest('[data-n]'); if (!b) return;
      var v = b.getAttribute('data-n');
      var nv = v === 'reset' ? 0 : KK.nudge() + Number(v);
      KK.nudge(nv);
      self.offset = (Number(self.song.offset_s) || 0) + KK.nudge();
      m.querySelector('[data-n-v]').textContent = (KK.nudge() >= 0 ? '+' : '') + KK.nudge().toFixed(2) + 's';
    });
  };

  Stage.prototype.fail = function (msg, code) {
    if (!this.alive) return;
    this.state = 'failed';
    if (this.o.onFail) this.o.onFail(msg, code);
    else L.toast(msg);
  };

  Stage.prototype.finish = function (reason) {
    var self = this, o = this.o;
    if (this.state === 'done' || this.state === 'finishing') return Promise.resolve();
    var wasLive = this.state === 'live';
    this.state = 'finishing';
    if (this.rec) this.rec.stop();
    if (this.player) this.player.pause();
    if (o.mic) o.mic.setRelay(false);
    /* after the video's own end the song clock stands still: the end
       anchor was taken the moment it ended */
    if (!this.endedAt) this.anchor(true);
    var j = this.judge;
    /* judge whatever remains */
    var rest = j.tick(1e9, true);
    rest.forEach(function (c) { self.reel.mark(c[0], c[1]); });
    var reading = { acc: j.totalW ? +((j.hitW + (j.recognizing ? 0.45 : 1) * j.voiceW) / j.totalW).toFixed(3) : null, pitch: j.parts().pitch, combo: j.best, heard: j.heard, asr: j.recognizing, shift: j.shift };
    var takeP = o.record && o.mic && o.mic.recording ? o.mic.stopRecording() : Promise.resolve(null);
    return takeP.then(function (take) {
      self.state = 'done';
      if (take) {
        take.timemap = self.timemap;
        take.live = { acc: reading.acc, pitch: reading.pitch, combo: reading.combo, heard: reading.heard, asr: reading.asr, vib: take.vib, shift: reading.shift };
        take.latOut = o.mic.latency.out; take.latIn = o.mic.latency.in; take.headphones = !!o.mic.o.headphones;
      }
      var out = { reason: reason, take: take, reading: reading, live: j.score(), parts: j.parts(), wasLive: wasLive, duration: self.player ? self.player.time() : null };
      if (o.onEnd) o.onEnd(out);
      return out;
    });
  };

  Stage.prototype.destroy = function () {
    this.alive = false;
    if (this.raf) global.cancelAnimationFrame(this.raf);
    if (this.rec) this.rec.stop();
    if (this.player) this.player.destroy();
    if (this.vis) this.vis.destroy();
    global.removeEventListener('resize', this.onResize);
    doc.removeEventListener('keydown', this.onKey);
  };

  /* ── handing a take to the judge ─────────────────────────────── */

  KK.submit = function (perf, take, progress) {
    progress = progress || function () {};
    var c = L.sb();
    if (!c || !take || !take.blob) return Promise.reject(Object.assign(new Error('no take'), { code: 'no_take' }));
    var path = perf.folder + '/' + perf.id + '.' + take.ext;
    progress('upload');
    var mic = take;
    return c.storage.from(KK.BUCKET).upload(path, take.blob, { contentType: take.mime || 'audio/webm', upsert: true, cacheControl: '3600' }).then(function (r) {
      if (r && r.error) throw Object.assign(new Error(r.error.message || 'upload'), { code: 'upload' });
      progress('finish');
      var device = { out: Math.round((mic.latOut || 0) * 1000), in: Math.round((mic.latIn || 0) * 1000), hp: !!mic.headphones, ua: /iPhone|iPad|Android|Mobile/.test(navigator.userAgent) ? 'mobile' : 'desktop' };
      return rpc('karaoke_finish', {
        p_perf: perf.id, p_ext: take.ext, p_mime: (take.mime || '').slice(0, 60), p_bytes: take.blob.size, p_duration: take.duration,
        p_timemap: take.timemap || [], p_device: device, p_live: take.live || {}, p_contour: take.contour || null
      });
    }).then(function (fin) {
      if (!fin || !fin.ok) throw Object.assign(new Error((fin && fin.reason) || 'finish'), { code: (fin && fin.reason) || 'finish' });
      progress('judge');
      return KK.verify(perf.id);
    });
  };
  /* The judge answers in a few seconds; when it cannot (busy, a lost
     connection), the verdict arrives on the performance row and the
     sweep finishes it. */
  KK.verify = function (perfId) {
    return api('verify', { perf: perfId, post: true }).then(function (d) {
      if (d && d.status === 'scored') return d;
      return KK.awaitScore(perfId, 90000);
    }, function () { return KK.awaitScore(perfId, 90000); });
  };
  KK.awaitScore = function (perfId, ms) {
    return new Promise(function (resolve) {
      var done = false, t0 = Date.now(), ch = null;
      function finish(d) { if (done) return; done = true; try { if (ch) ch.unsubscribe(); } catch (e) {} resolve(d); }
      function poll() {
        if (done) return;
        rpc('karaoke_performance', { p_perf: perfId }).then(function (r) {
          var p = r && r.performance;
          if (p && p.status === 'scored') finish({ ok: true, status: 'scored', score: p.score, grade: p.grade, parts: p.parts, verified: p.verified, lines: p.verify && p.verify.lines, flags: p.verify && p.verify.flags });
          else if (Date.now() - t0 > ms) finish({ ok: false, status: 'queued' });
          else setTimeout(poll, Date.now() - t0 < 20000 ? 3000 : 8000);
        }, function () { if (Date.now() - t0 > ms) finish({ ok: false, status: 'queued' }); else setTimeout(poll, 5000); });
      }
      try {
        var c = L.sb();
        ch = c.channel('kk-perf:' + perfId).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'karaoke_performances', filter: 'id=eq.' + perfId }, function (m) {
          var p = m && m.new;
          if (p && p.status === 'scored') finish({ ok: true, status: 'scored', score: p.score, grade: p.grade, parts: p.parts, verified: p.verified, lines: p.verify && p.verify.lines, flags: p.verify && p.verify.flags });
        }).subscribe();
      } catch (e) {}
      setTimeout(poll, 2500);
    });
  };

  /* ── the reveal ──────────────────────────────────────────────── */

  var PART_NAMES = { lyrics: 'Lyrics', pitch: 'Pitch', timing: 'Timing', expression: 'Feel' };
  KK.gradeOf = function (score) { return K.grade(score || 0); };

  /* opts: { song, result, perf, live, onAgain, onClose, replayHref, practice, tl } */
  KK.results = function (host, opts) {
    var r = opts.result || {}, s = opts.song || {};
    var score = r.score == null ? (opts.live || 0) : r.score;
    var g = K.grade(score);
    var best = s.best_score != null && score > s.best_score && r.verified;
    var parts = r.parts || {};
    var el = doc.createElement('div');
    el.className = 'kk-res';
    el.innerHTML =
      '<div class="kk-res-card">' +
        '<div class="kk-res-k">' + (opts.practice ? 'Practice round' : r.verified ? kic('sparkles') + 'Checked by Cabana’s judge' : 'Your score') + '</div>' +
        '<div class="kk-res-song"><b>' + esc(KK.songName(s)) + '</b><span>' + esc(KK.songArtist(s)) + '</span></div>' +
        '<div class="kk-res-score"><div class="kk-res-num" data-r="num">0</div>' +
          '<div class="kk-grade g-' + g.letter.replace('+', 'p') + '" data-r="grade"><b>' + g.letter + '</b><small>' + esc(g.title) + '</small></div></div>' +
        (best ? '<div class="kk-res-badge">' + kic('crown') + 'New song record</div>' : '') +
        '<div class="kk-res-parts">' + Object.keys(PART_NAMES).map(function (k) {
          var v = parts[k];
          return '<div class="kk-part' + (v == null ? ' is-na' : '') + '"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="19" class="bg"/><circle cx="22" cy="22" r="19" class="fg" style="--v:' + (v == null ? 0 : Math.round(v * 100)) + '"/></svg>' +
            '<b>' + (v == null ? '–' : Math.round(v * 100)) + '</b><small>' + PART_NAMES[k] + '</small></div>';
        }).join('') + '</div>' +
        (r.lines && r.lines.length ? '<div class="kk-heat" aria-label="Line by line">' + r.lines.map(function (v) { return '<i style="--h:' + (v == null ? 0 : v) + '"' + (v == null ? ' class="na"' : '') + '></i>'; }).join('') + '</div><div class="kk-heat-k"><span>First line</span><span>Line by line</span><span>Last line</span></div>' : '') +
        '<div class="kk-res-acts" data-r="acts"></div>' +
      '</div>';
    host.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-on'); });
    /* the count-up, a drum roll under it */
    var numEl = el.querySelector('[data-r="num"]'), gEl = el.querySelector('[data-r="grade"]');
    var stopRoll = KA.sfx('drumroll', { duration: 1.9 });
    var t0 = nowS(), D = u.reduced() ? 0.01 : 1.9;
    (function count() {
      var p = clamp((nowS() - t0) / D, 0, 1), e = 1 - Math.pow(1 - p, 3);
      numEl.textContent = String(Math.round(score * e));
      if (p < 1) return requestAnimationFrame(count);
      stopRoll();
      KA.sfx('crash');
      KA.sfx('stamp');
      gEl.classList.add('is-on');
      el.classList.add('is-done');
      if (score >= 70) KA.sfx('applause', { power: clamp((score - 55) / 45, 0.3, 1) });
      if (score >= 80) confetti(el, score >= 90 ? 140 : 70);
    })();
    return el;
  };

  function confetti(host, n) {
    if (u.reduced()) return;
    var cv = doc.createElement('canvas');
    cv.className = 'kk-confetti';
    host.appendChild(cv);
    var dpr = Math.min(2, global.devicePixelRatio || 1);
    var W = cv.width = host.clientWidth * dpr, H = cv.height = host.clientHeight * dpr;
    var c = cv.getContext('2d'), cols = ['#FFD978', '#FF4FD8', '#7B61FF', '#33E1FF', '#C8FF3D', '#ffffff'];
    var ps = [];
    for (var i = 0; i < n; i++) ps.push({ x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.35, vx: (Math.random() - 0.5) * 16 * dpr, vy: (-Math.random() * 16 - 6) * dpr, r: (3 + Math.random() * 5) * dpr, c: cols[i % cols.length], a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4 });
    var t0 = nowS();
    (function f() {
      var t = nowS() - t0;
      if (t > 3.2 || !cv.parentNode) { if (cv.parentNode) cv.parentNode.removeChild(cv); return; }
      requestAnimationFrame(f);
      c.clearRect(0, 0, W, H);
      ps.forEach(function (p) {
        p.vy += 0.45 * dpr; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va;
        c.save(); c.translate(p.x, p.y); c.rotate(p.a); c.globalAlpha = clamp(1.6 - t / 2, 0, 1);
        c.fillStyle = p.c; c.fillRect(-p.r, -p.r * 0.45, p.r * 2, p.r * 0.9); c.restore();
      });
    })();
  }
  KK.confetti = confetti;

  /* ── a share card ─────────────────────────────────────────────── */
  function drawCard(o, img) {
    var W = 1080, H = 1350;
    var cv = doc.createElement('canvas'); cv.width = W; cv.height = H;
    var c = cv.getContext('2d');
    var g = c.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#1a0b2e'); g.addColorStop(0.55, '#0b0714'); g.addColorStop(1, '#2a0a24');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    [[W * 0.2, H * 0.18, 520, 'rgba(255,79,216,.35)'], [W * 0.9, H * 0.55, 600, 'rgba(123,97,255,.35)'], [W * 0.4, H * 0.95, 500, 'rgba(255,217,120,.18)']].forEach(function (b) {
      var rg = c.createRadialGradient(b[0], b[1], 0, b[0], b[1], b[2]); rg.addColorStop(0, b[3]); rg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = rg; c.fillRect(0, 0, W, H);
    });
    var artH = (W - 180) * 9 / 16;
    if (img) {
      c.save(); c.beginPath(); roundPath(c, 90, 150, W - 180, artH, 36); c.clip();
      c.drawImage(img, 90, 150, W - 180, artH);
      var sh = c.createLinearGradient(0, 150, 0, 150 + artH); sh.addColorStop(0.5, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.65)');
      c.fillStyle = sh; c.fillRect(90, 150, W - 180, artH);
      c.restore();
    } else {
      c.save(); c.beginPath(); roundPath(c, 90, 150, W - 180, artH, 36); c.clip();
      var ag = c.createLinearGradient(90, 150, W - 90, 150 + artH); ag.addColorStop(0, '#FF4FD8'); ag.addColorStop(1, '#7B61FF');
      c.fillStyle = ag; c.fillRect(90, 150, W - 180, artH);
      c.fillStyle = 'rgba(255,255,255,.18)';
      for (var k = 0; k < 24; k++) { var bh = 40 + Math.abs(Math.sin(k * 1.7)) * (artH * 0.55); c.fillRect(120 + k * 36, 150 + artH - bh - 30, 20, bh); }
      c.restore();
    }
    c.fillStyle = '#fff';
    c.font = '800 44px "Unbounded", "Anybody", sans-serif';
    c.fillText('CABANA', 90, 100);
    var wm = c.measureText('CABANA ').width;
    var gg = c.createLinearGradient(90 + wm, 0, 90 + wm + 330, 0); gg.addColorStop(0, '#FF4FD8'); gg.addColorStop(1, '#7B61FF');
    c.fillStyle = gg; c.fillText('KARAOKE', 90 + wm, 100);
    var y0 = 150 + artH + 90;
    c.fillStyle = '#fff'; c.font = '900 64px "Anybody", sans-serif';
    wrap(c, String(o.song || '').toUpperCase(), 90, y0, W - 180, 70, 2);
    c.fillStyle = 'rgba(255,255,255,.7)'; c.font = '600 36px "Plus Jakarta Sans", sans-serif';
    c.fillText(o.artist || '', 90, y0 + 150);
    var sy = H - 330;
    var sg = c.createLinearGradient(90, sy - 200, 520, sy); sg.addColorStop(0, '#FFF3C8'); sg.addColorStop(0.5, '#F6C451'); sg.addColorStop(1, '#C98F24');
    c.fillStyle = sg; c.font = '900 260px "Unbounded", "Anybody", sans-serif';
    c.fillText(String(o.score), 80, sy + 40);
    c.fillStyle = '#fff'; c.font = '900 120px "Unbounded", sans-serif';
    c.fillText(o.grade || '', W - 330, sy - 20);
    c.fillStyle = 'rgba(255,255,255,.75)'; c.font = '700 34px "Plus Jakarta Sans", sans-serif';
    c.fillText(o.title || '', W - 330, sy + 40);
    c.fillStyle = 'rgba(255,255,255,.9)'; c.font = '700 38px "Plus Jakarta Sans", sans-serif';
    c.fillText((o.name ? o.name + ' · ' : '') + (o.verified ? 'Checked by Cabana’s judge' : 'Cabana Karaoke'), 90, H - 170);
    c.fillStyle = 'rgba(255,255,255,.55)'; c.font = '600 32px "JetBrains Mono", monospace';
    c.fillText(o.url || 'cabana.africa/events/karaoke', 90, H - 110);
    return new Promise(function (resolve) {
      try { cv.toBlob(function (b) { resolve(b); }, 'image/png'); } catch (e) { resolve(null); }
    });
  }
  /* A 4:5 card with the video's art when the browser lets it be drawn;
     a canvas the art has tainted cannot be exported, so then it is
     drawn again without. */
  KK.card = function (o) {
    function plain() { return drawCard(o, null); }
    if (!o.video) return plain();
    return new Promise(function (resolve) {
      var img = new Image(); img.crossOrigin = 'anonymous';
      var done = false;
      function go(withImg) { if (done) return; done = true; drawCard(o, withImg ? img : null).then(function (b) { resolve(b || plain()); }, function () { resolve(plain()); }); }
      img.onload = function () { go(true); };
      img.onerror = function () { go(false); };
      setTimeout(function () { go(false); }, 2500);
      img.src = u.ytThumb(o.video, 'hqdefault');
    });
  };
  function roundPath(c, x, y, w, h, r) { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function wrap(c, text, x, y, maxW, lh, maxLines) {
    var words = String(text).split(' '), line = '', n = 0;
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (c.measureText(test).width > maxW && line) {
        c.fillText(n === maxLines - 1 ? line + '…' : line, x, y + n * lh);
        n++; line = words[i];
        if (n >= maxLines) return;
      } else line = test;
    }
    if (line && n < maxLines) c.fillText(line, x, y + n * lh);
  }
  KK.shareCard = function (o) {
    return KK.card(o).then(function (blob) {
      if (!blob) { L.share(o.song + ' · Cabana Karaoke', 'I scored ' + o.score, o.link); return; }
      var file = null;
      try { file = new File([blob], 'cabana-karaoke-' + o.score + '.png', { type: 'image/png' }); } catch (e) {}
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], title: 'Cabana Karaoke', text: 'I scored ' + o.score + ' on ' + o.song + '. Can you beat it? ' + (o.link || '') }).catch(function () {});
      }
      var a = doc.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'cabana-karaoke-' + o.score + '.png';
      doc.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      L.toast('Your score card is saved. Share it anywhere.');
    });
  };

  KK.ready = true;
  L.emit('karaoke-ready');
})(window);
