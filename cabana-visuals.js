/* ═══════════════════════════════════════════════════════════════════
   CABANA LIVE · the light show
   ───────────────────────────────────────────────────────────────────
   One WebGL layer behind the party room and the karaoke stage: six
   scenes of light (aurora, lasers, tunnel, bokeh, kaleidoscope,
   skyline), beat-locked, and alive to the hand.

     BeatClock     where the beat is. Tempo and phase come from the
                   best source on hand, in this order:
                     listen    the microphone hears the room: onsets,
                               tempo by autocorrelation, phase by comb
                     tap       four taps on the Tap button
                     known     the record's tempo (Deezer), phased to
                               the video clock so pauses and seeks
                               stay in step
                     genre     a sensible tempo for the shelf
     Visuals       the renderer. A tap sends a ripple through the
                   light, a drag steers it, a double tap (or V) moves
                   to the next scene. Every sixteen bars it moves on by
                   itself unless someone chose a scene.

   It never strobes. A pulse is a gentle swell with a soft tail, its
   depth is capped, and above 150 BPM it swells on every other beat, so
   it stays under 2.5 a second. Under reduced motion the light holds
   still. It draws at a fraction of the screen's resolution (soft
   light does not need more), caps itself at 30 frames on phones, and
   sleeps whenever the page is hidden.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var doc = global.document;
  var V = global.CabanaVisuals = global.CabanaVisuals || {};
  var SCENES = [
    { k: 'aurora', label: 'Aurora' },
    { k: 'lasers', label: 'Lasers' },
    { k: 'tunnel', label: 'Tunnel' },
    { k: 'bokeh', label: 'Glow' },
    { k: 'kaleido', label: 'Kaleido' },
    { k: 'skyline', label: 'Skyline' }
  ];
  V.SCENES = SCENES;

  function reduced() { try { return global.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function mobile() { try { return global.matchMedia('(pointer: coarse)').matches || global.innerWidth < 760; } catch (e) { return false; } }
  function now() { return (global.performance && performance.now ? performance.now() : Date.now()) / 1000; }

  /* ── the beat ─────────────────────────────────────────────────── */

  function BeatClock(opts) {
    opts = opts || {};
    this.bpm = clampBpm(opts.bpm || 104);
    this.source = opts.source || 'genre';
    this.offset = 0;              /* seconds (song clock) of a known beat */
    this.clock = opts.clock || null; /* () => song seconds, or null for wall time */
    this.taps = [];
    this.listening = null;
    this.energy = 0;
    this.onsetAt = -1;
    this.listeners = [];
  }
  function clampBpm(b) { b = Number(b) || 104; while (b > 200) b /= 2; while (b < 60) b *= 2; return b; }
  BeatClock.prototype.t = function () {
    var s = this.clock ? this.clock() : null;
    return s == null || !isFinite(s) ? now() : s;
  };
  BeatClock.prototype.set = function (bpm, offset, source) {
    this.bpm = clampBpm(bpm);
    if (offset != null && isFinite(offset)) this.offset = offset;
    if (source) this.source = source;
    this.listeners.forEach(function (fn) { try { fn(); } catch (e) {} });
  };
  BeatClock.prototype.onChange = function (fn) { this.listeners.push(fn); };
  /* phase in [0,1) and the beat count at the clock's "now" */
  BeatClock.prototype.read = function () {
    var period = 60 / this.bpm, t = this.t() - this.offset;
    var beats = t / period;
    var b = Math.floor(beats);
    return { phase: beats - b, beat: b, bar: ((b % 4) + 4) % 4, period: period, bpm: this.bpm };
  };
  /* Tap tempo: four taps or more, the last ones decide. */
  BeatClock.prototype.tap = function () {
    var t = this.t(), wall = now();
    this.taps = this.taps.filter(function (x) { return wall - x.w < 3; });
    this.taps.push({ t: t, w: wall });
    if (this.taps.length < 4) return this.taps.length;
    var iv = [];
    for (var i = 1; i < this.taps.length; i++) iv.push(this.taps[i].w - this.taps[i - 1].w);
    iv.sort(function (a, b) { return a - b; });
    var med = iv[iv.length >> 1];
    if (med > 0.25 && med < 1.5) this.set(60 / med, t, 'tap');
    return this.taps.length;
  };

  /* Listening: onsets from the low end and the whole spectrum, tempo by
     autocorrelation of the onset envelope, phase by a comb. The page
     gives it a MediaStream (the microphone, or a shared tab). */
  BeatClock.prototype.listen = function (stream) {
    this.stop();
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC || !stream) return false;
    var self = this;
    var ctx = new AC({ latencyHint: 'interactive' });
    var src = ctx.createMediaStreamSource(stream);
    var an = ctx.createAnalyser();
    an.fftSize = 1024; an.smoothingTimeConstant = 0;
    src.connect(an);
    var bins = an.frequencyBinCount, spec = new Float32Array(bins), prev = new Float32Array(bins);
    var hz = ctx.sampleRate / an.fftSize, lowTop = Math.max(2, Math.round(180 / hz));
    var RATE = 60, LEN = RATE * 8, env = new Float32Array(LEN), at = 0, filled = 0, last = 0, avg = 0, lastEst = 0;
    /* eight log-spaced bands, 60 Hz to 8 kHz, for the skyline */
    var edges = [], bandPeak = new Float32Array(8);
    for (var e = 0; e <= 8; e++) edges.push(Math.max(1, Math.min(bins - 1, Math.round(60 * Math.pow(8000 / 60, e / 8) / hz))));
    self.bands = new Float32Array(8);
    var raf = null, alive = true;
    function frame() {
      if (!alive) return;
      raf = global.requestAnimationFrame(frame);
      var t = now();
      if (t - last < 1 / RATE * 0.85) return;
      last = t;
      an.getFloatFrequencyData(spec);
      var flux = 0, low = 0, level = 0;
      for (var i = 1; i < bins; i++) {
        var v = spec[i] < -140 ? 0 : Math.pow(10, spec[i] / 20);
        var d = v - prev[i];
        if (d > 0) { flux += d; if (i <= lowTop) low += d * 3; }
        level += v;
        prev[i] = v;
      }
      for (var bi = 0; bi < 8; bi++) {
        var bs = 0, bn = 0;
        for (var j = edges[bi]; j < Math.max(edges[bi] + 1, edges[bi + 1]); j++) { bs += spec[j]; bn++; }
        var lv = Math.max(0, Math.min(1, ((bn ? bs / bn : -140) + 90) / 60));
        bandPeak[bi] = Math.max(lv, bandPeak[bi] * 0.9);
        self.bands[bi] = self.bands[bi] * 0.6 + bandPeak[bi] * 0.4;
      }
      var o = flux + low;
      avg = avg * 0.97 + o * 0.03;
      env[at] = Math.max(0, o - avg * 0.9);
      at = (at + 1) % LEN; if (filled < LEN) filled++;
      self.energy = self.energy * 0.85 + Math.min(1, level / bins * 40) * 0.15;
      if (env[(at + LEN - 1) % LEN] > avg * 2.2 && t - self.onsetAt > 0.18) self.onsetAt = t;
      if (filled > RATE * 4 && t - lastEst > 1) { lastEst = t; estimate(); }
    }
    function estimate() {
      /* autocorrelation over 70–180 BPM, weighted toward 120 */
      var n = filled, x = new Float32Array(n), i, k;
      for (i = 0; i < n; i++) x[i] = env[(at - n + i + LEN) % LEN];
      var best = 0, bestLag = 0;
      var minLag = Math.round(RATE * 60 / 180), maxLag = Math.round(RATE * 60 / 70);
      for (var lag = minLag; lag <= maxLag; lag++) {
        var s = 0;
        for (i = lag; i < n; i++) s += x[i] * x[i - lag];
        var bpm = 60 * RATE / lag;
        s *= Math.exp(-Math.pow(Math.log2(bpm / 120), 2) * 0.9);
        if (s > best) { best = s; bestLag = lag; }
      }
      if (!bestLag) return;
      /* phase: the comb that lines up with the most onset energy */
      var bestPh = 0, bestSum = -1;
      for (var ph = 0; ph < bestLag; ph++) {
        var sum = 0;
        for (k = n - 1 - ph; k >= 0; k -= bestLag) sum += x[k] + 0.5 * (x[k - 1] || 0) + 0.5 * (x[k + 1] || 0);
        if (sum > bestSum) { bestSum = sum; bestPh = ph; }
      }
      /* the most recent beat was bestPh frames ago */
      var beatWall = now() - bestPh / RATE;
      var bpmNew = 60 * RATE / bestLag;
      /* map the wall-clock beat onto the clock this BeatClock runs on */
      var offset = self.t() - (now() - beatWall);
      if (self.source !== 'listen' || Math.abs(bpmNew - self.bpm) > 2) self.set(bpmNew, offset, 'listen');
      else {
        /* nudge the phase gently instead of jumping */
        var period = 60 / self.bpm, cur = self.offset, diff = ((offset - cur) % period + period * 1.5) % period - period / 2;
        self.offset = cur + diff * 0.35;
        self.bpm = self.bpm * 0.8 + bpmNew * 0.2;
      }
    }
    frame();
    this.listening = {
      stop: function () { alive = false; if (raf) global.cancelAnimationFrame(raf); try { src.disconnect(); } catch (e) {} try { ctx.close(); } catch (e) {} }
    };
    return true;
  };
  BeatClock.prototype.stop = function () { if (this.listening) { this.listening.stop(); this.listening = null; } };
  V.BeatClock = BeatClock;

  /* ── the palette ──────────────────────────────────────────────────
     Three colours from the video's thumbnail when the browser lets us
     read it; the tab's own light otherwise. */
  function hexToRgb(h) {
    h = String(h || '').trim().replace('#', '');
    if (h.length === 3) h = h.replace(/./g, '$&$&');
    var n = parseInt(h, 16);
    return isNaN(n) ? [0.55, 0.36, 1] : [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }
  V.paletteFrom = function (imgUrl, fallback) {
    return new Promise(function (resolve) {
      var fb = (fallback || ['#8B5CFF', '#FF2E93', '#33E1FF']).map(hexToRgb);
      if (!imgUrl) return resolve(fb);
      var img = new Image();
      img.crossOrigin = 'anonymous';
      var done = false;
      var t = setTimeout(function () { if (!done) { done = true; resolve(fb); } }, 2500);
      img.onload = function () {
        if (done) return; done = true; clearTimeout(t);
        try {
          var c = doc.createElement('canvas'); c.width = 24; c.height = 18;
          var g = c.getContext('2d'); g.drawImage(img, 0, 0, 24, 18);
          var d = g.getImageData(0, 0, 24, 18).data, buckets = {};
          for (var i = 0; i < d.length; i += 4) {
            var r = d[i], gg = d[i + 1], b = d[i + 2];
            var mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), sat = mx ? (mx - mn) / mx : 0;
            if (mx < 40 || sat < 0.25) continue;
            var key = (r >> 5) + '-' + (gg >> 5) + '-' + (b >> 5);
            var e = buckets[key] || (buckets[key] = { n: 0, r: 0, g: 0, b: 0, s: 0 });
            e.n++; e.r += r; e.g += gg; e.b += b; e.s += sat;
          }
          var list = Object.keys(buckets).map(function (k) { var e = buckets[k]; return { c: [e.r / e.n / 255, e.g / e.n / 255, e.b / e.n / 255], w: e.n * (0.5 + e.s / e.n) }; })
            .sort(function (a, b) { return b.w - a.w; });
          var out = [];
          list.forEach(function (x) { if (out.length < 3 && out.every(function (y) { return dist(x.c, y) > 0.28; })) out.push(boost(x.c)); });
          while (out.length < 3) out.push(fb[out.length]);
          resolve(out);
        } catch (e) { resolve(fb); }
      };
      img.onerror = function () { if (!done) { done = true; clearTimeout(t); resolve(fb); } };
      img.src = imgUrl;
    });
  };
  function dist(a, b) { return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2) + Math.pow(a[2] - b[2], 2)); }
  /* Light on a dark room wants saturated, bright colour. */
  function boost(c) {
    var mx = Math.max(c[0], c[1], c[2]) || 1, mn = Math.min(c[0], c[1], c[2]);
    var out = c.map(function (v) { return (v - mn * 0.6) / (mx - mn * 0.6 || 1); });
    return out.map(function (v) { return Math.max(0.05, Math.min(1, v * 0.95 + 0.05)); });
  }
  V.hexToRgb = hexToRgb;

  /* ── the renderer ─────────────────────────────────────────────── */

  var VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform vec2 uRes;uniform float uTime,uPulse,uPhase,uBar,uEnergy,uCalm,uScene,uScene2,uMix,uPointerOn;',
    'uniform vec3 uC1,uC2,uC3;uniform vec2 uPointer;uniform vec4 uRip[4];uniform float uBands[8];',
    'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);',
    ' return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}',
    'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}',
    'vec3 aurora(vec2 uv,float t){vec3 col=vec3(.02,.015,.04);',
    ' for(int i=0;i<3;i++){float fi=float(i);',
    '  float y=uv.y+.16*sin(uv.x*1.4+t*.28+fi*2.1)+.12*fbm(vec2(uv.x*1.1+t*.05*(fi+1.),t*.08+fi*3.));',
    '  float band=exp(-pow((y-(-.18+fi*.2))*5.5,2.));',
    '  vec3 c=fi<.5?uC1:(fi<1.5?uC2:uC3);',
    '  col+=c*band*(.3+.35*uEnergy+.35*uPulse)*(.8+.4*fbm(uv*3.+t*.1));}',
    ' return col;}',
    'vec3 lasers(vec2 uv,float t){vec3 col=vec3(.01,.01,.02)+.06*fbm(uv*2.+t*.05)*uC3;',
    ' for(int i=0;i<6;i++){float fi=float(i);vec2 o=vec2(-.95+fi*.38,-.62);',
    '  float ang=1.5708+.55*sin(t*.35+fi*1.3+uBar*1.5708);vec2 d=vec2(cos(ang),sin(ang));vec2 q=uv-o;',
    '  float along=dot(q,d);float perp=abs(q.x*d.y-q.y*d.x);float on=step(0.,along);',
    '  float beam=exp(-perp*perp*900.)*on*exp(-along*.55);float glow=exp(-perp*16.)*.14*on*exp(-along*.8);',
    '  vec3 c=mod(fi,2.)<1.?uC1:uC2;col+=c*(beam*(.55+.7*uPulse)+glow*(.7+.5*uEnergy));}',
    ' col+=uC2*.08*exp(-abs(uv.y+.62)*8.);return col;}',
    'vec3 tunnel(vec2 uv,float t){vec2 q=abs(uv*vec2(.78,1.));float r=pow(pow(q.x,3.)+pow(q.y,3.),.3333);',
    ' float z=.24/(r+.025)+t*.5+uPhase*.25;float rings=smoothstep(.09,0.,abs(fract(z)-.5)-.41);',
    ' vec3 c=mix(uC1,uC2,.5+.5*sin(z*.6));c=mix(c,uC3,.5+.5*sin(z*.23+1.));',
    ' return c*rings*(.45+.55*uPulse)*smoothstep(0.,.32,r)+vec3(.01,.01,.03);}',
    'vec3 bokeh(vec2 uv,float t){vec3 col=vec3(.015,.01,.03);',
    ' for(int l=0;l<3;l++){float fl=float(l);vec2 p=uv*(2.2+fl*1.6)+vec2(t*.025*(fl+1.),-t*.04*(fl+1.));',
    '  vec2 id=floor(p);vec2 f=fract(p)-.5;float h=hash(id+fl*13.);vec2 off=vec2(hash(id+3.1),hash(id+7.7))-.5;',
    '  float d=length(f-off*.6);float rad=.1+.2*h;float disc=smoothstep(rad,rad-.035,d)*step(.5,h);',
    '  vec3 c=h<.7?uC1:(h<.85?uC2:uC3);col+=c*disc*(.16+.14*uPulse)*(1.-fl*.22);}',
    ' return col;}',
    'vec3 kaleido(vec2 uv,float t){float a=atan(uv.y,uv.x);float r=length(uv);float n=6.;',
    ' a=mod(a,6.2831853/n);a=abs(a-3.14159265/n);vec2 p=vec2(cos(a),sin(a))*r;',
    ' float f=fbm(p*3.+vec2(t*.09,-t*.06)+uPhase*.05);vec3 c=mix(uC1,uC2,f);c=mix(c,uC3,smoothstep(.55,.9,f));',
    ' return c*(.2+.5*f)*(.7+.35*uPulse)*smoothstep(1.35,.15,r);}',
    'vec3 skyline(vec2 uv,float t){vec3 col=vec3(.012,.01,.028);float x=(uv.x+1.)*4.;float i=floor(x);float fx=fract(x);',
    ' float b=0.;for(int k=0;k<8;k++){if(float(k)==mod(i,8.))b=uBands[k];}',
    ' float h=-.62+(.12+.9*b)*(.6+.4*uPulse);float bar=step(uv.y,h)*smoothstep(.02,.08,fx)*smoothstep(.98,.92,fx);',
    ' float cap=exp(-pow((uv.y-h)*60.,2.))*smoothstep(.02,.08,fx)*smoothstep(.98,.92,fx);',
    ' vec3 c=mix(uC1,uC2,fract(i/8.));col+=c*bar*(.25+.25*(uv.y+.62))+uC3*cap*.9;',
    ' col+=c*.05*exp(-abs(uv.y-h)*6.);return col;}',
    'vec3 scene(float id,vec2 uv,float t){if(id<.5)return aurora(uv,t);if(id<1.5)return lasers(uv,t);',
    ' if(id<2.5)return tunnel(uv,t);if(id<3.5)return bokeh(uv,t);if(id<4.5)return kaleido(uv,t);return skyline(uv,t);}',
    'void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;float t=uTime;',
    ' for(int i=0;i<4;i++){vec4 r=uRip[i];float age=t-r.z;if(age<0.||age>3.)continue;',
    '  vec2 d=uv-r.xy;float L=length(d)+1e-4;float w=sin(L*28.-age*10.)*exp(-age*1.8)*exp(-L*2.4)*r.w;uv+=d/L*w*.025;}',
    ' vec3 col=scene(uScene,uv,t);if(uMix>0.)col=mix(col,scene(uScene2,uv,t),uMix);',
    ' if(uPointerOn>0.){float pd=length(uv-uPointer);col+=mix(uC1,uC3,.5)*exp(-pd*pd*18.)*.22*uPointerOn;}',
    ' for(int i=0;i<4;i++){vec4 r=uRip[i];float age=t-r.z;if(age<0.||age>3.)continue;',
    '  float ring=exp(-pow((length(uv-r.xy)-age*.55)*14.,2.))*exp(-age*1.4)*r.w;col+=mix(uC2,vec3(1.),.35)*ring*.35;}',
    ' col*=(.9+.18*uPulse*(1.-.6*uCalm))*(1.-.45*uCalm);',
    ' col*=1.-.35*dot(uv*.8,uv*.8);',
    ' col+=(hash(gl_FragCoord.xy+t)-.5)*.018;',
    ' gl_FragColor=vec4(max(col,0.),1.);}'
  ].join('\n');

  function Visuals(host, opts) {
    this.host = host;
    this.o = Object.assign({ scale: mobile() ? 0.42 : 0.6, fps: mobile() ? 30 : 60, calm: 0, interactive: true, auto: true }, opts || {});
    this.clock = this.o.clock || new BeatClock({ bpm: this.o.bpm || 104 });
    this.scene = typeof this.o.scene === 'number' ? this.o.scene : 0;
    this.scene2 = this.scene; this.mixT = 1;
    this.pinned = false;
    this.colors = [hexToRgb('#8B5CFF'), hexToRgb('#FF2E93'), hexToRgb('#33E1FF')];
    this.target = this.colors.slice();
    this.rips = [];
    this.pointer = [0, 0]; this.pointerOn = 0; this.pointerT = 0;
    this.bands = new Float32Array(8);
    this.playing = true;
    this.alive = true;
    this.lastBarSwitch = null;
    this.onScene = null;
    this.build();
  }

  Visuals.prototype.build = function () {
    var self = this;
    var cv = this.cv = doc.createElement('canvas');
    cv.className = 'cv-gl';
    cv.setAttribute('aria-hidden', 'true');
    this.host.appendChild(cv);
    if (reduced()) { this.still(); return; }
    var gl = null;
    try { gl = cv.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'low-power', preserveDrawingBuffer: false }); } catch (e) {}
    if (!gl) { this.still(); return; }
    this.gl = gl;
    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { var m = gl.getShaderInfoLog(s); gl.deleteShader(s); throw new Error(m); }
      return s;
    }
    try {
      var prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      this.prog = prog;
    } catch (e) {
      if (global.console) console.warn('[visuals] shader', e && e.message);
      this.gl = null; this.still(); return;
    }
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(this.prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var U = this.U = {};
    ['uRes', 'uTime', 'uPulse', 'uPhase', 'uBar', 'uEnergy', 'uCalm', 'uScene', 'uScene2', 'uMix', 'uPointerOn', 'uC1', 'uC2', 'uC3', 'uPointer'].forEach(function (n) { U[n] = gl.getUniformLocation(self.prog, n); });
    U.uRip = [0, 1, 2, 3].map(function (i) { return gl.getUniformLocation(self.prog, 'uRip[' + i + ']'); });
    U.uBands = gl.getUniformLocation(this.prog, 'uBands');
    cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); self.gl = null; self.still(); }, false);

    this.resize = function () {
      var r = self.host.getBoundingClientRect();
      var dpr = Math.min(2, global.devicePixelRatio || 1) * self.o.scale;
      var w = Math.max(64, Math.round(r.width * dpr)), h = Math.max(64, Math.round(r.height * dpr));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; if (self.gl) self.gl.viewport(0, 0, w, h); }
    };
    this.resize();
    global.addEventListener('resize', this.resize);
    if (global.ResizeObserver) { this.ro = new ResizeObserver(this.resize); this.ro.observe(this.host); }
    if (this.o.interactive) this.wire();
    this.t0 = now();
    this.lastFrame = 0;
    var loop = function () {
      if (!self.alive) return;
      self.raf = global.requestAnimationFrame(loop);
      if (doc.hidden) return;
      var t = now();
      if (t - self.lastFrame < 1 / self.o.fps - 0.002) return;
      self.lastFrame = t;
      self.draw(t);
    };
    this.raf = global.requestAnimationFrame(loop);
  };

  /* Reduced motion, or no WebGL: a still wash of the same colours. */
  Visuals.prototype.still = function () {
    this.host.classList.add('cv-still');
    this.paintStill();
  };
  Visuals.prototype.paintStill = function () {
    var c = this.target.map(function (x) { return 'rgb(' + x.map(function (v) { return Math.round(v * 255); }).join(',') + ')'; });
    this.host.style.background = 'radial-gradient(60% 70% at 25% 30%, ' + c[0] + '55, transparent 70%), radial-gradient(55% 65% at 80% 70%, ' + c[1] + '44, transparent 70%), radial-gradient(40% 50% at 60% 10%, ' + c[2] + '33, transparent 70%), #06050b';
  };

  Visuals.prototype.wire = function () {
    var self = this, host = this.host, surface = this.o.surface || host, lastTap = 0, down = null;
    this.surface = surface;
    function at(e) {
      var r = host.getBoundingClientRect();
      var x = ((e.clientX - r.left) - r.width / 2) / r.height, y = -((e.clientY - r.top) - r.height / 2) / r.height;
      return [x, y];
    }
    /* Only the light itself answers: taps on buttons, the video or the
       lyrics are theirs. */
    function mine(e) {
      var el = e.target;
      if (!el || !el.closest) return true;
      return !el.closest('button, a, input, textarea, select, iframe, [data-no-light], .lv-yt, .kk-lyrics, .kk-panel, .lv-party-side, .lv-party-bot, .lv-party-top, .kk-hud, .kk-sheet');
    }
    this.onDown = function (e) {
      if (!mine(e)) return;
      down = { t: now(), p: at(e) };
      self.pointer = down.p; self.pointerOn = 1;
    };
    this.onMove = function (e) {
      if (e.pointerType === 'mouse' && !down) { if (mine(e)) { self.pointer = at(e); self.pointerOn = Math.min(1, self.pointerOn + 0.2); } return; }
      if (!down) return;
      self.pointer = at(e); self.pointerOn = 1;
    };
    this.onUp = function (e) {
      if (!down) return;
      var p = at(e), t = now();
      if (t - down.t < 0.35) {
        self.ripple(p[0], p[1], 1);
        if (t - lastTap < 0.4) { self.next(true); lastTap = 0; }
        else lastTap = t;
      }
      down = null;
    };
    this.onKey = function (e) {
      if (/INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) return;
      if (e.key === 'v' || e.key === 'V') self.next(true);
    };
    surface.addEventListener('pointerdown', this.onDown);
    global.addEventListener('pointermove', this.onMove, { passive: true });
    global.addEventListener('pointerup', this.onUp);
    doc.addEventListener('keydown', this.onKey);
  };

  Visuals.prototype.ripple = function (x, y, strength) {
    this.rips.push([x, y, now() - this.t0, strength == null ? 1 : strength]);
    if (this.rips.length > 4) this.rips.shift();
  };
  Visuals.prototype.setScene = function (i, pinned) {
    i = ((i % SCENES.length) + SCENES.length) % SCENES.length;
    if (i === this.scene && this.mixT >= 1) return;
    this.scene2 = i; this.mixT = 0; this.mixStart = now();
    if (pinned) this.pinned = true;
    if (this.onScene) try { this.onScene(i, SCENES[i]); } catch (e) {}
  };
  Visuals.prototype.next = function (pinned) { this.setScene((this.mixT < 1 ? this.scene2 : this.scene) + 1, pinned); };
  Visuals.prototype.setColors = function (list) {
    if (!list || list.length < 3) return;
    this.target = list.map(function (c) { return typeof c === 'string' ? hexToRgb(c) : c; });
    if (!this.gl) this.paintStill();
  };
  Visuals.prototype.setPlaying = function (on) { this.playing = !!on; };
  Visuals.prototype.setCalm = function (v) { this.o.calm = Math.max(0, Math.min(1, v)); };
  /* Eight bands 0..1, from whatever is listening (the skyline scene). */
  Visuals.prototype.setBands = function (arr) { for (var i = 0; i < 8; i++) this.bands[i] = Math.max(0, Math.min(1, arr[i] || 0)); };

  Visuals.prototype.draw = function (t) {
    var gl = this.gl, U = this.U;
    if (!gl) return;
    var time = t - this.t0;
    var b = this.clock.read();
    /* The swell: above 150 BPM, every other beat. */
    var half = b.bpm > 150;
    var ph = half ? ((b.beat % 2 + 2) % 2 + b.phase) / 2 : b.phase;
    var pulse = this.playing ? Math.exp(-ph * 4.2) * 0.9 : 0.12;
    if (this.clock.onsetAt > 0 && t - this.clock.onsetAt < 0.25 && this.playing) pulse = Math.max(pulse, 0.6 * (1 - (t - this.clock.onsetAt) / 0.25));
    var energy = this.clock.energy || (this.playing ? 0.35 + 0.15 * Math.sin(time * 0.7) : 0.1);
    /* sixteen bars and the light moves on, unless it was chosen */
    if (this.o.auto && !this.pinned && this.playing) {
      var bar16 = Math.floor(b.beat / 64);
      if (this.lastBarSwitch == null) this.lastBarSwitch = bar16;
      else if (bar16 !== this.lastBarSwitch) { this.lastBarSwitch = bar16; this.next(false); }
    }
    /* colours ease toward their target */
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) this.colors[i][j] += (this.target[i][j] - this.colors[i][j]) * 0.03;
    if (this.mixT < 1) {
      this.mixT = Math.min(1, (t - this.mixStart) / 1.6);
      if (this.mixT >= 1) this.scene = this.scene2;
    }
    this.pointerOn *= 0.96;
    gl.uniform2f(U.uRes, this.cv.width, this.cv.height);
    gl.uniform1f(U.uTime, time);
    gl.uniform1f(U.uPulse, pulse);
    gl.uniform1f(U.uPhase, b.beat + b.phase);
    gl.uniform1f(U.uBar, b.bar + b.phase);
    gl.uniform1f(U.uEnergy, energy);
    gl.uniform1f(U.uCalm, this.o.calm);
    gl.uniform1f(U.uScene, this.scene);
    gl.uniform1f(U.uScene2, this.scene2);
    gl.uniform1f(U.uMix, this.mixT < 1 ? smooth(this.mixT) : 0);
    gl.uniform1f(U.uPointerOn, this.pointerOn);
    gl.uniform2f(U.uPointer, this.pointer[0], this.pointer[1]);
    gl.uniform3fv(U.uC1, this.colors[0]); gl.uniform3fv(U.uC2, this.colors[1]); gl.uniform3fv(U.uC3, this.colors[2]);
    for (var r = 0; r < 4; r++) { var rp = this.rips[r] || [0, 0, -99, 0]; gl.uniform4f(U.uRip[r], rp[0], rp[1], rp[2], rp[3]); }
    if (this.scene === 5 || this.scene2 === 5) {
      if (this.clock.listening && this.clock.bands) this.bands.set(this.clock.bands);
      else for (var k = 0; k < 8; k++) this.bands[k] = 0.25 + 0.5 * Math.abs(Math.sin(time * (0.7 + k * 0.23) + k)) * (0.6 + 0.4 * pulse);
      gl.uniform1fv(U.uBands, this.bands);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    /* whatever else on the page breathes with the light */
    if (this.o.onPulse) try { this.o.onPulse(pulse, b); } catch (e) {}
  };
  function smooth(x) { return x * x * (3 - 2 * x); }

  Visuals.prototype.destroy = function () {
    this.alive = false;
    if (this.raf) global.cancelAnimationFrame(this.raf);
    global.removeEventListener('resize', this.resize);
    if (this.ro) this.ro.disconnect();
    if (this.onDown) {
      (this.surface || this.host).removeEventListener('pointerdown', this.onDown);
      global.removeEventListener('pointermove', this.onMove);
      global.removeEventListener('pointerup', this.onUp);
      doc.removeEventListener('keydown', this.onKey);
    }
    if (this.gl) { var ext = this.gl.getExtension('WEBGL_lose_context'); if (ext) try { ext.loseContext(); } catch (e) {} }
    if (this.cv && this.cv.parentNode) this.cv.parentNode.removeChild(this.cv);
    this.host.classList.remove('cv-still');
  };

  V.Visuals = Visuals;
  V.create = function (host, opts) { return new Visuals(host, opts); };

  /* A small control strip every stage can mount: scene picker, tap
     tempo, and "listen" (sync the light to the room's sound). */
  V.controls = function (vis, opts) {
    opts = opts || {};
    var el = doc.createElement('div');
    el.className = 'cv-ctrl';
    el.setAttribute('data-no-light', '');
    el.innerHTML =
      '<button type="button" class="cv-btn" data-cv="scene" aria-label="Change the lights"><span class="cv-dot"></span><span data-cv-name>' + SCENES[vis.scene].label + '</span></button>' +
      '<button type="button" class="cv-btn" data-cv="tap" aria-label="Tap along to the beat"><span data-cv-bpm>' + Math.round(vis.clock.bpm) + '</span><small>BPM · tap</small></button>' +
      (opts.listen !== false && navigator.mediaDevices && navigator.mediaDevices.getUserMedia ?
        '<button type="button" class="cv-btn" data-cv="listen" aria-pressed="false" aria-label="Let the lights listen to the room"><i class="cv-ear"></i><small>Sync to room</small></button>' : '');
    var nameEl = el.querySelector('[data-cv-name]'), bpmEl = el.querySelector('[data-cv-bpm]');
    var prevScene = vis.onScene;
    vis.onScene = function (i, s) { nameEl.textContent = s.label; if (prevScene) try { prevScene(i, s); } catch (e) {} };
    vis.clock.onChange(function () { bpmEl.textContent = Math.round(vis.clock.bpm); el.setAttribute('data-src', vis.clock.source); });
    el.setAttribute('data-src', vis.clock.source);
    var stream = null;
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cv]'); if (!b) return;
      var k = b.getAttribute('data-cv');
      if (k === 'scene') vis.next(true);
      else if (k === 'tap') {
        var n = vis.clock.tap();
        b.classList.remove('is-tap'); void b.offsetWidth; b.classList.add('is-tap');
        if (n < 4) bpmEl.textContent = n + '/4';
      } else if (k === 'listen') {
        if (stream) {
          vis.clock.stop(); stream.getTracks().forEach(function (t) { t.stop(); }); stream = null;
          b.setAttribute('aria-pressed', 'false'); b.classList.remove('is-on');
          if (opts.onListen) opts.onListen(false);
          return;
        }
        navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }).then(function (s) {
          stream = s;
          vis.clock.listen(s);
          b.setAttribute('aria-pressed', 'true'); b.classList.add('is-on');
          if (opts.onListen) opts.onListen(true);
        }, function () { if (opts.toast) opts.toast('The microphone is needed to hear the beat. Tap along instead.'); });
      }
    });
    el.destroy = function () { if (stream) { vis.clock.stop(); stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; } };
    return el;
  };
})(window);
