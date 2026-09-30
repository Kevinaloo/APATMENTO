/* ═══════════════════════════════════════════════════════════════════
   CABANA KARAOKE · the microphone
   ───────────────────────────────────────────────────────────────────
     Mic          the singer's microphone: pitch and loudness fifty
                  times a second (cabana-karaoke-worklet.js), the
                  contour kept for the judge, vibrato spotted, the
                  take recorded untouched for Whisper, an optional
                  monitor with a stage reverb for singers wearing
                  headphones, and the voice relay for live rooms
     Recognizer   the browser's own speech recogniser, restarted as
                  often as it gives up, so words light up while they
                  are sung. Best effort: the verdict never depends on
                  it
     adpcm        a 4-bit voice codec for the relay (IMA ADPCM), each
                  packet decodable on its own, so a lost one is a
                  click, not a collapse
     sfx          the room's sounds, synthesised: count-in, combo,
                  applause, the drum roll, the crash, the stamp

   Nothing here decides a score. It measures and it records.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var KA = global.CabanaKaraokeAudio = global.CabanaKaraokeAudio || {};
  var AC = global.AudioContext || global.webkitAudioContext;
  var WORKLET = '/cabana-karaoke-worklet.js?v=1';

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  KA.supported = function () {
    return !!(AC && global.navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  };
  KA.canRecord = function () { return typeof global.MediaRecorder === 'function'; };
  KA.hzToMidi = function (hz) { return hz > 0 ? 69 + 12 * Math.log2(hz / 440) : null; };
  var NOTE = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  KA.noteName = function (midi) { if (midi == null) return ''; var n = Math.round(midi); return NOTE[((n % 12) + 12) % 12] + (Math.floor(n / 12) - 1); };

  /* ── IMA ADPCM ────────────────────────────────────────────────── */
  var STEP = [7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45, 50, 55, 60, 66, 73, 80, 88, 97, 107, 118, 130, 143, 157, 173, 190, 209, 230, 253, 279, 307, 337, 371, 408, 449, 494, 544, 598, 658, 724, 796, 876, 963, 1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499, 2749, 3024, 3327, 3660, 4026, 4428, 4871, 5358, 5894, 6484, 7132, 7845, 8630, 9493, 10442, 11487, 12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794, 32767];
  var IDX = [-1, -1, -1, -1, 2, 4, 6, 8, -1, -1, -1, -1, 2, 4, 6, 8];

  /* pcm: Int16Array → [pred lo, pred hi, index, n lo, n hi, nibbles…] */
  KA.adpcmEncode = function (pcm, state) {
    state = state || { p: 0, i: 0 };
    var n = pcm.length, out = new Uint8Array(5 + ((n + 1) >> 1));
    out[0] = state.p & 255; out[1] = (state.p >> 8) & 255; out[2] = state.i; out[3] = n & 255; out[4] = (n >> 8) & 255;
    var pred = state.p, idx = state.i;
    for (var k = 0; k < n; k++) {
      var step = STEP[idx], diff = pcm[k] - pred, code = 0;
      if (diff < 0) { code = 8; diff = -diff; }
      var vpd = step >> 3;
      if (diff >= step) { code |= 4; diff -= step; vpd += step; }
      step >>= 1;
      if (diff >= step) { code |= 2; diff -= step; vpd += step; }
      step >>= 1;
      if (diff >= step) { code |= 1; vpd += step; }
      pred += (code & 8) ? -vpd : vpd;
      pred = clamp(pred, -32768, 32767);
      idx = clamp(idx + IDX[code], 0, 88);
      if (k & 1) out[5 + (k >> 1)] |= code << 4; else out[5 + (k >> 1)] = code;
    }
    state.p = pred; state.i = idx;
    return out;
  };
  KA.adpcmDecode = function (bytes) {
    if (!bytes || bytes.length < 5) return new Float32Array(0);
    var pred = (bytes[0] | (bytes[1] << 8)); if (pred & 0x8000) pred -= 0x10000;
    var idx = clamp(bytes[2], 0, 88), n = bytes[3] | (bytes[4] << 8);
    n = Math.min(n, (bytes.length - 5) * 2);
    var out = new Float32Array(n);
    for (var k = 0; k < n; k++) {
      var b = bytes[5 + (k >> 1)], code = (k & 1) ? b >> 4 : b & 15;
      var step = STEP[idx], vpd = step >> 3;
      if (code & 4) vpd += step;
      if (code & 2) vpd += step >> 1;
      if (code & 1) vpd += step >> 2;
      pred += (code & 8) ? -vpd : vpd;
      pred = clamp(pred, -32768, 32767);
      idx = clamp(idx + IDX[code], 0, 88);
      out[k] = pred / 32768;
    }
    return out;
  };
  KA.b64 = function (bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return global.btoa(s);
  };
  KA.unb64 = function (str) {
    var s = global.atob(String(str || '')), out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  };

  /* ── the microphone ──────────────────────────────────────────── */

  function Mic(opts) {
    this.o = Object.assign({ headphones: false }, opts || {});
    this.subs = {};
    this.ctx = null; this.stream = null;
    this.level = -100; this.f0 = 0; this.midi = null; this.clarity = 0;
    this.analysisT = 0;
    this.rec = null; this.recording = false; this.recStart = 0; this.chunks = [];
    this.contour = null; this.cN = 0; this.cWin = []; this.cAt = 0;
    this.vib = 0; this.vibVoiced = 0; this.hist = [];
    this.relayState = null; this.relayOn = false; this.relayBatch = [];
    this.monitor = null;
    this.latency = { out: 0.03, in: 0.02 };
  }
  Mic.prototype.on = function (evt, fn) { (this.subs[evt] = this.subs[evt] || []).push(fn); return this; };
  Mic.prototype.emit = function (evt, d) { (this.subs[evt] || []).forEach(function (fn) { try { fn(d); } catch (e) { if (global.console) console.error('[mic:' + evt + ']', e); } }); };

  Mic.prototype.open = function () {
    var self = this;
    if (!KA.supported()) return Promise.reject(Object.assign(new Error('unsupported'), { code: 'unsupported' }));
    var hp = !!this.o.headphones;
    var constraints = { audio: { echoCancellation: !hp, noiseSuppression: false, autoGainControl: !hp, channelCount: 1 } };
    return navigator.mediaDevices.getUserMedia(constraints).catch(function (e) {
      /* some devices refuse the detailed constraints; a plain microphone
         is better than none */
      if (e && (e.name === 'OverconstrainedError' || e.name === 'TypeError')) return navigator.mediaDevices.getUserMedia({ audio: true });
      throw e;
    }).then(function (stream) {
      self.stream = stream;
      self.ctx = new AC({ latencyHint: 'interactive' });
      var track = stream.getAudioTracks()[0];
      try {
        var st = track.getSettings ? track.getSettings() : {};
        if (st && isFinite(st.latency)) self.latency.in = clamp(st.latency, 0, 0.3);
      } catch (e) {}
      self.latency.out = clamp((self.ctx.outputLatency || 0) + (self.ctx.baseLatency || 0) || 0.03, 0.005, 0.6);
      self.src = self.ctx.createMediaStreamSource(stream);
      self.sink = self.ctx.createGain(); self.sink.gain.value = 0; self.sink.connect(self.ctx.destination);
      var ready = self.ctx.audioWorklet && global.AudioWorkletNode
        ? self.ctx.audioWorklet.addModule(WORKLET).then(function () {
          var node = new global.AudioWorkletNode(self.ctx, 'cabana-voice', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
          node.port.onmessage = function (e) { self.onWorklet(e.data); };
          self.src.connect(node); node.connect(self.sink);
          self.node = node;
        })
        : Promise.resolve(self.fallback());
      return ready.catch(function () { return self.fallback(); });
    }).then(function () {
      if (self.ctx.state === 'suspended') self.ctx.resume().catch(function () {});
      var t = self.stream.getAudioTracks()[0];
      if (t) t.addEventListener('ended', function () { self.emit('lost'); });
      return self;
    });
  };

  /* No AudioWorklet (older browsers): the same YIN on the main thread,
     twenty times a second, from an analyser. */
  Mic.prototype.fallback = function () {
    var self = this, an = this.ctx.createAnalyser();
    an.fftSize = 2048;
    this.src.connect(an);
    var buf = new Float32Array(an.fftSize), sr = this.ctx.sampleRate;
    this.fbT = setInterval(function () {
      an.getFloatTimeDomainData(buf);
      var sq = 0; for (var i = 0; i < buf.length; i++) sq += buf[i] * buf[i];
      var db = 20 * Math.log10(Math.sqrt(sq / buf.length) + 1e-9);
      var r = db > -58 ? yinJs(buf, sr) : { f0: 0, c: 0 };
      self.onWorklet({ t: self.ctx.currentTime, f0: r.f0, c: r.c, db: db });
    }, 50);
  };
  function yinJs(x, sr) {
    var W = Math.floor(x.length / 2), tauMax = Math.min(W - 1, Math.ceil(sr / 65)), tauMin = Math.floor(sr / 1100);
    var d = new Float32Array(tauMax + 1), running = 0;
    d[0] = 1;
    for (var tau = 1; tau <= tauMax; tau++) {
      var s = 0;
      for (var j = 0; j < W; j++) { var v = x[j] - x[j + tau]; s += v * v; }
      running += s; d[tau] = running ? s * tau / running : 1;
    }
    for (tau = tauMin; tau <= tauMax; tau++) {
      if (d[tau] < 0.15) {
        while (tau + 1 <= tauMax && d[tau + 1] < d[tau]) tau++;
        var t = tau;
        if (tau > 1 && tau < tauMax) { var a = d[tau - 1], b = d[tau], c = d[tau + 1], den = a + c - 2 * b; if (den) t = tau + (a - c) / (2 * den); }
        var f = sr / t;
        return f >= 65 && f <= 1100 ? { f0: f, c: 1 - d[tau] } : { f0: 0, c: 0 };
      }
    }
    return { f0: 0, c: 0 };
  }

  Mic.prototype.onWorklet = function (m) {
    if (!m) return;
    if (m.pcm) { this.onPcm(m); return; }
    this.level = m.db;
    this.clarity = m.c;
    var voiced = m.f0 > 0 && m.c >= 0.55 && m.db > -52;
    this.f0 = voiced ? m.f0 : 0;
    var midi = voiced ? KA.hzToMidi(m.f0) : null;
    /* a one-frame octave jump is an error, not a leap */
    if (midi != null && this.midi != null && Math.abs(midi - this.midi) > 10 && Math.abs(Math.abs(midi - this.midi) - 12) < 1.2) midi = this.midi;
    this.midi = midi;
    this.analysisT = m.t;
    this.vibrato(midi, m.t);
    if (this.recording) this.contourPush(m.t, midi, m.db);
    this.emit('frame', { t: m.t, midi: midi, hz: this.f0, db: m.db, c: m.c });
  };

  /* Vibrato: half a second of steady singing whose pitch swings 4.5–8
     times a second by a fifth of a semitone to over a semitone. */
  Mic.prototype.vibrato = function (midi, t) {
    var h = this.hist;
    h.push(midi);
    if (h.length > 26) h.shift();
    if (midi != null) this.vibVoiced += 0.02;
    if (h.length < 26 || h.some(function (x) { return x == null; })) return;
    if (t - (this.vibAt || 0) < 0.8) return;
    var mean = h.reduce(function (a, b) { return a + b; }, 0) / h.length;
    if (h.some(function (x) { return Math.abs(x - mean) > 1.6; })) return;
    var cross = 0, mx = -9, mn = 9;
    for (var i = 1; i < h.length; i++) {
      var a = h[i - 1] - mean, b = h[i] - mean;
      if ((a < 0) !== (b < 0)) cross++;
      mx = Math.max(mx, b); mn = Math.min(mn, b);
    }
    var hz = cross / 2 / 0.5, ext = (mx - mn) / 2;
    if (hz >= 4.5 && hz <= 8 && ext >= 0.1 && ext <= 1.2) { this.vib++; this.vibAt = t; this.emit('vibrato', { hz: hz, ext: ext }); }
  };
  Mic.prototype.vibPerMinute = function () { return this.vibVoiced > 10 ? this.vib / (this.vibVoiced / 60) : null; };

  /* The contour for the judge: ten frames a second of recording time,
     each the median pitch of the confident frames inside it and the
     loudest moment. */
  Mic.prototype.contourPush = function (t, midi, db) {
    var rel = t - this.recStart;
    if (rel < 0) return;
    var idx = Math.floor(rel * 10);
    while (this.cAt < idx) this.contourFlush();
    this.cWin.push({ m: midi, db: db });
  };
  Mic.prototype.contourFlush = function () {
    var K = global.CabanaKaraokeLyrics;
    var w = this.cWin, ms = [], db = -140;
    for (var i = 0; i < w.length; i++) { if (w[i].m != null) ms.push(w[i].m); if (w[i].db > db) db = w[i].db; }
    ms.sort(function (a, b) { return a - b; });
    var midi = ms.length >= 2 ? ms[ms.length >> 1] : null;
    if (!this.contour) this.contour = new Uint8Array(4096);
    if (this.cN + 2 > this.contour.length) {
      if (this.contour.length >= 30000) { this.cAt++; this.cWin = []; return; }
      var bigger = new Uint8Array(Math.min(30000, this.contour.length * 2)); bigger.set(this.contour); this.contour = bigger;
    }
    this.contour[this.cN++] = K ? K.pitchCode(midi) : 0;
    this.contour[this.cN++] = K ? K.energyCode(db < -140 ? -140 : db) : 0;
    this.cAt++;
    this.cWin = [];
  };
  Mic.prototype.contourB64 = function () {
    var K = global.CabanaKaraokeLyrics;
    if (!this.contour || !K) return null;
    return K.b64(this.contour.subarray(0, this.cN));
  };

  /* ── recording ────────────────────────────────────────────────── */
  var TYPES = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/aac', 'audio/webm'];
  KA.recordType = function () {
    if (!KA.canRecord()) return null;
    for (var i = 0; i < TYPES.length; i++) { try { if (!MediaRecorder.isTypeSupported || MediaRecorder.isTypeSupported(TYPES[i])) return TYPES[i]; } catch (e) {} }
    return '';
  };
  KA.extFor = function (mime) {
    mime = String(mime || '');
    if (/webm/.test(mime)) return 'webm';
    if (/ogg/.test(mime)) return 'ogg';
    if (/mp4|m4a/.test(mime)) return 'm4a';
    if (/aac/.test(mime)) return 'aac';
    if (/mpeg|mp3/.test(mime)) return 'mp3';
    if (/wav/.test(mime)) return 'wav';
    return 'webm';
  };
  Mic.prototype.startRecording = function () {
    var self = this;
    if (!KA.canRecord() || !this.stream) return Promise.reject(Object.assign(new Error('norec'), { code: 'norec' }));
    var type = KA.recordType();
    var rec;
    try { rec = new MediaRecorder(this.stream, type ? { mimeType: type, audioBitsPerSecond: 64000 } : { audioBitsPerSecond: 64000 }); }
    catch (e) { rec = new MediaRecorder(this.stream); }
    this.rec = rec; this.chunks = [];
    this.contour = null; this.cN = 0; this.cWin = []; this.cAt = 0; this.vib = 0; this.vibVoiced = 0;
    rec.ondataavailable = function (e) { if (e.data && e.data.size) self.chunks.push(e.data); };
    return new Promise(function (resolve) {
      var done = false;
      rec.onstart = function () {
        if (done) return; done = true;
        self.recStart = self.ctx.currentTime;
        self.recording = true;
        resolve(self.recStart);
      };
      rec.start(1000);
      setTimeout(function () { if (!done) { done = true; self.recStart = self.ctx.currentTime; self.recording = true; resolve(self.recStart); } }, 400);
    });
  };
  /* Recording time now (seconds since the take began). */
  Mic.prototype.recTime = function () { return this.recording ? this.ctx.currentTime - this.recStart : 0; };
  Mic.prototype.stopRecording = function () {
    var self = this, rec = this.rec;
    if (!rec) return Promise.resolve(null);
    return new Promise(function (resolve) {
      var dur = self.recTime();
      rec.onstop = function () {
        self.recording = false;
        self.contourFlush();
        var type = rec.mimeType || KA.recordType() || 'audio/webm';
        var blob = new Blob(self.chunks, { type: type });
        self.chunks = [];
        self.rec = null;
        resolve({ blob: blob, mime: type, ext: KA.extFor(type), duration: dur, contour: self.contourB64(), vib: self.vibPerMinute() });
      };
      try { if (rec.state !== 'inactive') rec.stop(); else rec.onstop(); } catch (e) { rec.onstop(); }
    });
  };

  /* ── hearing yourself ─────────────────────────────────────────── */
  function impulse(ctx, secs, decay, pre) {
    var n = Math.round(ctx.sampleRate * secs), buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (var c = 0; c < 2; c++) {
      var d = buf.getChannelData(c);
      for (var i = 0; i < n; i++) {
        var t = i / ctx.sampleRate;
        d[i] = t < (pre || 0) ? 0 : (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
      }
    }
    return buf;
  }
  KA.REVERBS = { studio: { secs: 0.9, decay: 3.2, wet: 0.22 }, hall: { secs: 2.4, decay: 2.4, wet: 0.32 }, stadium: { secs: 3.6, decay: 1.8, wet: 0.4, pre: 0.06 } };
  Mic.prototype.setMonitor = function (on, preset, volume) {
    var ctx = this.ctx;
    if (!ctx) return;
    if (this.monitor) { try { this.monitor.out.disconnect(); this.src.disconnect(this.monitor.hp); } catch (e) {} this.monitor = null; }
    if (!on) return;
    var p = KA.REVERBS[preset] || KA.REVERBS.studio;
    var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 90;
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -24; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.12;
    var dry = ctx.createGain(); dry.gain.value = 1 - p.wet * 0.5;
    var conv = ctx.createConvolver(); conv.buffer = impulse(ctx, p.secs, p.decay, p.pre);
    var wet = ctx.createGain(); wet.gain.value = p.wet;
    var out = ctx.createGain(); out.gain.value = volume == null ? 0.9 : volume;
    this.src.connect(hp); hp.connect(comp); comp.connect(dry); comp.connect(conv); conv.connect(wet);
    dry.connect(out); wet.connect(out); out.connect(ctx.destination);
    this.monitor = { hp: hp, out: out };
  };

  /* ── the relay ────────────────────────────────────────────────────
     40 ms chunks from the worklet, ten to a packet (0.4 s), each packet
     stamped with the song time its first sample belongs to. */
  Mic.prototype.setRelay = function (on, songTimeAt, send) {
    this.relayOn = !!on;
    this.relaySong = songTimeAt;
    this.relaySend = send;
    this.relayState = { p: 0, i: 0 };
    this.relayBatch = [];
    this.relaySeq = 0;
    if (this.node) this.node.port.postMessage({ relay: this.relayOn });
  };
  Mic.prototype.onPcm = function (m) {
    if (!this.relayOn || !this.relaySend) return;
    var start = m.t - m.pcm.length / 12000;
    this.relayBatch.push({ pcm: m.pcm, t: start });
    if (this.relayBatch.length < 10) return;
    var n = 0; this.relayBatch.forEach(function (b) { n += b.pcm.length; });
    var all = new Int16Array(n), o = 0;
    this.relayBatch.forEach(function (b) { all.set(b.pcm, o); o += b.pcm.length; });
    var t0 = this.relayBatch[0].t;
    this.relayBatch = [];
    var song = this.relaySong ? this.relaySong(t0) : null;
    if (song == null) return;
    var bytes = KA.adpcmEncode(all, this.relayState);
    this.relaySend({ q: this.relaySeq++, s: +song.toFixed(3), r: 12000, d: KA.b64(bytes) });
  };

  Mic.prototype.close = function () {
    this.recording = false;
    if (this.fbT) clearInterval(this.fbT);
    try { if (this.rec && this.rec.state !== 'inactive') this.rec.stop(); } catch (e) {}
    this.setMonitor(false);
    if (this.node) { try { this.node.port.onmessage = null; this.node.disconnect(); } catch (e) {} }
    if (this.stream) this.stream.getTracks().forEach(function (t) { try { t.stop(); } catch (e) {} });
    if (this.ctx) { try { this.ctx.close(); } catch (e) {} }
    this.stream = null; this.ctx = null; this.node = null;
    this.subs = {};
  };
  KA.Mic = Mic;

  /* ── the listener's side of the relay ─────────────────────────────
     Each packet is scheduled to sound when this device's own video is
     at the packet's song time, which is how a friend across town hears
     the singer on the beat of the track in front of them. */
  function Receiver(ctx, songNow) {
    this.ctx = ctx; this.songNow = songNow;
    this.gain = ctx.createGain(); this.gain.gain.value = 1;
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 2.5;
    this.gain.connect(comp); comp.connect(ctx.destination);
    this.lastSeq = -1; this.dropped = 0; this.played = 0;
    this.level = 0;
  }
  Receiver.prototype.push = function (pkt) {
    if (!pkt || typeof pkt.d !== 'string' || !isFinite(pkt.s) || pkt.r !== 12000) return;
    if (pkt.d.length > 20000) return;
    var ctx = this.ctx, now = this.songNow();
    if (now == null) return;
    var pcm = KA.adpcmDecode(KA.unb64(pkt.d));
    if (!pcm.length) return;
    var when = ctx.currentTime + (pkt.s - now);
    var dur = pcm.length / 12000;
    if (when + dur < ctx.currentTime + 0.02) { this.dropped++; return; }
    var buf = ctx.createBuffer(1, pcm.length, 12000);
    buf.getChannelData(0).set(pcm);
    var src = ctx.createBufferSource(); src.buffer = buf;
    src.connect(this.gain);
    var offset = 0;
    if (when < ctx.currentTime + 0.01) { offset = ctx.currentTime + 0.01 - when; when = ctx.currentTime + 0.01; }
    try { src.start(when, offset); this.played++; } catch (e) {}
    var peak = 0; for (var i = 0; i < pcm.length; i += 8) peak = Math.max(peak, Math.abs(pcm[i]));
    this.level = this.level * 0.5 + peak * 0.5;
    this.lastSeq = pkt.q;
  };
  Receiver.prototype.setVolume = function (v) { this.gain.gain.value = clamp(v, 0, 2); };
  Receiver.prototype.close = function () { try { this.gain.disconnect(); } catch (e) {} };
  KA.Receiver = Receiver;

  /* ── the recogniser ───────────────────────────────────────────── */
  function Recognizer(lang, onWords, onState) {
    this.SR = global.SpeechRecognition || global.webkitSpeechRecognition || null;
    this.lang = lang || 'en-US';
    this.onWords = onWords; this.onState = onState || function () {};
    this.running = false; this.failures = 0; this.session = 0; this.dead = false;
  }
  Recognizer.supported = function () { return !!(global.SpeechRecognition || global.webkitSpeechRecognition); };
  Recognizer.prototype.start = function () {
    if (!this.SR || this.dead) return false;
    this.running = true;
    this.spawn();
    return true;
  };
  Recognizer.prototype.spawn = function () {
    var self = this;
    if (!this.running || this.dead) return;
    var r;
    try { r = new this.SR(); } catch (e) { this.dead = true; this.onState('unavailable'); return; }
    this.r = r;
    this.session++;
    var sid = this.session;
    r.lang = this.lang; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
    r.onresult = function (e) {
      for (var i = e.resultIndex; i < e.results.length; i++) {
        var res = e.results[i], text = res[0] && res[0].transcript || '';
        var words = text.trim().split(/\s+/).filter(Boolean);
        if (words.length) self.onWords(sid + ':' + i, words, res.isFinal);
      }
      self.failures = 0;
    };
    r.onerror = function (e) {
      var err = e && e.error;
      if (err === 'not-allowed' || err === 'service-not-allowed' || err === 'audio-capture' || err === 'language-not-supported') {
        self.dead = true; self.running = false; self.onState('unavailable', err);
      }
    };
    r.onend = function () {
      if (!self.running || self.dead) return;
      self.failures++;
      /* Chrome ends a session after a pause or a minute; start again,
         backing off if it keeps ending at once. */
      setTimeout(function () { self.spawn(); }, Math.min(3000, 120 * self.failures));
    };
    try { r.start(); this.onState('listening'); } catch (e) { setTimeout(function () { self.spawn(); }, 500); }
  };
  Recognizer.prototype.stop = function () {
    this.running = false;
    if (this.r) { try { this.r.onend = null; this.r.abort(); } catch (e) {} }
    this.r = null;
  };
  KA.Recognizer = Recognizer;
  KA.langTag = function (lang) { return lang === 'sw' ? 'sw-KE' : lang === 'mixed' ? 'en-KE' : 'en-US'; };

  /* ── sounds ───────────────────────────────────────────────────────
     Made on the spot, never downloaded. One quiet context of their
     own, opened on the first tap. */
  var fx = null, fxGain = null, noiseBuf = null;
  function fxCtx() {
    if (!AC) return null;
    if (!fx) {
      try { fx = new AC(); fxGain = fx.createGain(); fxGain.gain.value = 0.7; fxGain.connect(fx.destination); } catch (e) { fx = null; return null; }
    }
    if (fx.state === 'suspended') fx.resume().catch(function () {});
    return fx;
  }
  function noise(ctx) {
    if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
    var n = ctx.sampleRate * 2, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    noiseBuf = b; return b;
  }
  function tone(ctx, at, freq, dur, type, vol, glide) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, at);
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, at + dur);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol || 0.2, at + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(fxGain); o.start(at); o.stop(at + dur + 0.05);
  }
  function burst(ctx, at, dur, freq, q, vol, type) {
    var s = ctx.createBufferSource(); s.buffer = noise(ctx);
    var f = ctx.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    s.connect(f); f.connect(g); g.connect(fxGain);
    s.start(at, Math.random() * 1.5); s.stop(at + dur + 0.05);
  }
  var muted = false;
  KA.mute = function (on) { muted = !!on; if (fxGain) fxGain.gain.value = muted ? 0 : 0.7; };
  KA.sfx = function (name, opts) {
    if (muted) return function () {};
    var ctx = fxCtx(); if (!ctx) return function () {};
    opts = opts || {};
    var t = ctx.currentTime + 0.01, i;
    switch (name) {
      case 'tick': tone(ctx, t, opts.high ? 1320 : 880, 0.09, 'triangle', 0.18); break;
      case 'go': tone(ctx, t, 660, 0.12, 'triangle', 0.16); tone(ctx, t + 0.09, 990, 0.24, 'triangle', 0.18); break;
      case 'hit': tone(ctx, t, 1480 + Math.random() * 200, 0.07, 'sine', 0.05); break;
      case 'combo':
        [0, 4, 7, 12].forEach(function (s, k) { tone(ctx, t + k * 0.055, 523.25 * Math.pow(2, s / 12), 0.18, 'triangle', 0.12); });
        break;
      case 'sparkle':
        for (i = 0; i < 7; i++) tone(ctx, t + i * 0.04, 1800 + Math.random() * 1600, 0.12, 'sine', 0.05);
        break;
      case 'stamp': burst(ctx, t, 0.18, 180, 0.7, 0.9, 'lowpass'); tone(ctx, t, 90, 0.25, 'sine', 0.5, 45); break;
      case 'crash':
        burst(ctx, t, 2.2, 7000, 0.4, 0.5, 'highpass');
        burst(ctx, t, 0.9, 3500, 0.8, 0.35, 'bandpass');
        tone(ctx, t, 110, 0.5, 'sine', 0.4, 55);
        break;
      case 'drumroll': {
        var stop = false, at = t, rate = 10, dur = opts.duration || 2.2, end = t + dur;
        (function sched() {
          if (stop) return;
          while (at < ctx.currentTime + 0.2 && at < end) {
            var p = (at - t) / dur;
            burst(ctx, at, 0.07, 2200, 0.9, 0.12 + 0.28 * p, 'bandpass');
            burst(ctx, at, 0.05, 250, 1, 0.06 + 0.1 * p, 'lowpass');
            rate = 10 + 16 * p;
            at += 1 / rate * (0.85 + Math.random() * 0.3);
          }
          if (at < end) setTimeout(sched, 80);
        })();
        return function () { stop = true; };
      }
      case 'applause': {
        var power = Math.max(0.2, Math.min(1, opts.power == null ? 0.7 : opts.power)), len = opts.duration || (2 + power * 3);
        var n = Math.round(len * (14 + power * 46));
        for (i = 0; i < n; i++) {
          var when = t + Math.pow(Math.random(), 0.8) * len;
          var fade = 1 - (when - t) / len;
          burst(ctx, when, 0.02 + Math.random() * 0.03, 900 + Math.random() * 1900, 1.2, (0.05 + Math.random() * 0.12) * (0.4 + 0.6 * fade) * power, 'bandpass');
        }
        /* the crowd underneath */
        var s = ctx.createBufferSource(); s.buffer = noise(ctx);
        var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1200; f.Q.value = 0.4;
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05 * power, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.6);
        s.connect(f); f.connect(g); g.connect(fxGain); s.start(t); s.stop(t + len + 0.7);
        if (power > 0.75) for (i = 0; i < 3; i++) tone(ctx, t + 0.3 + i * 0.35 + Math.random() * 0.2, 700 + Math.random() * 300, 0.45, 'sawtooth', 0.012, 1100 + Math.random() * 300);
        break;
      }
      case 'whoosh': burst(ctx, t, 0.5, 600, 0.5, 0.25, 'bandpass'); break;
      case 'pop': tone(ctx, t, 520, 0.06, 'sine', 0.12, 900); break;
    }
    return function () {};
  };
})(window);
