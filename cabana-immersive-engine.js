/* ═══════════════════════════════════════════════════════════════════
   CABANA IMMERSIVE · the engine
   ───────────────────────────────────────────────────────────────────
   One fragment shader draws every format Cabana plays: 360° and 180°
   footage, mono or stereo (top-bottom, side-by-side), panoramas, and
   ordinary film on a curved cinema screen. There is no sphere mesh.
   Each pixel asks "which way am I looking?" and reads the texture at
   exactly that longitude and latitude, so the poles do not pinch and
   the seam does not wobble.

   The same pass renders three ways of looking:

     screen  one view, drag / pinch / gyroscope to look around
     visor   two lens-shaped views side by side, barrel-distorted for a
             phone slotted into a VR viewer, with gaze-to-select
     xr      a real headset through WebXR, one view per eye, stereo
             footage split correctly between them

   Hotspots in visor and xr are drawn by the shader, because a headset
   cannot see the page. On a screen they are DOM, drawn by the page
   from project(), because text should be text.

   This file has no dependencies. hls.js is fetched only if a scene is
   a live stream and the browser cannot play HLS itself.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var doc = global.document;
  var DEG = Math.PI / 180;
  var PROJ = { equirect: 0, equirect_tb: 1, equirect_sbs: 2, vr180: 3, vr180_sbs: 4, flat: 5 };
  var HOT_MAX = 12;
  var HLS_SRC = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';
  var REDUCED = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ── 1 · SMALL MATHS ─────────────────────────────────────────────── */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function wrap180(d) { d = ((d + 180) % 360 + 360) % 360 - 180; return d; }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpAngle(a, b, t) { return a + wrap180(b - a) * t; }

  // Quaternions as [x, y, z, w]. Conventions match three.js so the
  // device-orientation maths below is the widely-tested one.
  function qAxis(ax, ay, az, a) { var s = Math.sin(a / 2); return [ax * s, ay * s, az * s, Math.cos(a / 2)]; }
  function qMul(a, b) {
    return [
      a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
      a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
      a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
      a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
    ];
  }
  function qEulerYXZ(x, y, z) {
    var c1 = Math.cos(x / 2), c2 = Math.cos(y / 2), c3 = Math.cos(z / 2);
    var s1 = Math.sin(x / 2), s2 = Math.sin(y / 2), s3 = Math.sin(z / 2);
    return [s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3,
            c1 * c2 * s3 - s1 * s2 * c3, c1 * c2 * c3 + s1 * s2 * s3];
  }
  function qMat3(q, out) {
    var x = q[0], y = q[1], z = q[2], w = q[3];
    var x2 = x + x, y2 = y + y, z2 = z + z;
    var xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2;
    var wx = w * x2, wy = w * y2, wz = w * z2;
    out = out || new Float32Array(9);
    out[0] = 1 - (yy + zz); out[1] = xy + wz; out[2] = xz - wy;
    out[3] = xy - wz; out[4] = 1 - (xx + zz); out[5] = yz + wx;
    out[6] = xz + wy; out[7] = yz - wx; out[8] = 1 - (xx + yy);
    return out;
  }
  function mulM3(m, v) {
    return [m[0] * v[0] + m[3] * v[1] + m[6] * v[2],
            m[1] * v[0] + m[4] * v[1] + m[7] * v[2],
            m[2] * v[0] + m[5] * v[1] + m[8] * v[2]];
  }
  function mulM3T(m, v) {   // transpose: world → view
    return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
            m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
            m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
  }
  function dirOf(yaw, pitch) {
    var y = yaw * DEG, p = pitch * DEG;
    return [Math.cos(p) * Math.sin(y), Math.sin(p), -Math.cos(p) * Math.cos(y)];
  }
  function yawPitchOf(d) {
    return { yaw: Math.atan2(d[0], -d[2]) / DEG, pitch: Math.asin(clamp(d[1], -1, 1)) / DEG };
  }
  function viewQuat(yaw, pitch) { return qMul(qAxis(0, 1, 0, -yaw * DEG), qAxis(1, 0, 0, pitch * DEG)); }
  var Q_BACK = [-Math.SQRT1_2, 0, 0, Math.SQRT1_2];     // −90° about X: the camera looks out of the back of the phone
  function deviceQuat(alpha, beta, gamma, orient) {
    var q = qEulerYXZ(beta * DEG, alpha * DEG, -gamma * DEG);
    q = qMul(q, Q_BACK);
    return qMul(q, qAxis(0, 0, 1, -orient * DEG));
  }

  /* ── 2 · CAPABILITIES ────────────────────────────────────────────── */
  var capsCache = null;
  function caps() {
    if (capsCache) return capsCache;
    var c = { webgl: false, webgl2: false, maxTex: 4096, mobile: false, gyro: false, touch: false, xr: false };
    try {
      var cv = doc.createElement('canvas');
      var gl = cv.getContext('webgl2') || cv.getContext('webgl') || cv.getContext('experimental-webgl');
      if (gl) {
        c.webgl = true;
        c.webgl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
        c.maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
        var lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
      }
    } catch (e) {}
    var coarse = !!(global.matchMedia && global.matchMedia('(pointer: coarse)').matches);
    c.touch = coarse || 'ontouchstart' in global;
    c.mobile = coarse && Math.min(global.screen ? screen.width : 999, global.screen ? screen.height : 999) < 900;
    c.gyro = 'DeviceOrientationEvent' in global && c.touch;
    c.xrApi = !!(global.navigator && navigator.xr && navigator.xr.isSessionSupported);
    capsCache = c;
    return c;
  }
  var xrProbe = null;
  function xrSupported() {
    if (xrProbe) return xrProbe;
    xrProbe = (global.navigator && navigator.xr && navigator.xr.isSessionSupported)
      ? navigator.xr.isSessionSupported('immersive-vr').then(function (ok) { return !!ok; }, function () { return false; })
      : Promise.resolve(false);
    return xrProbe;
  }
  function saveData() {
    try { var n = navigator.connection; return !!(n && (n.saveData || /(^|-)2g$/.test(n.effectiveType || ''))); } catch (e) { return false; }
  }

  /* ── 3 · SHADERS ─────────────────────────────────────────────────── */
  var VERT =
    'attribute vec2 aPos;varying vec2 vNdc;' +
    'void main(){vNdc=aPos;gl_Position=vec4(aPos,0.0,1.0);}';

  var FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'varying vec2 vNdc;',
    'uniform sampler2D uTexA;uniform sampler2D uTexB;uniform sampler2D uPanel;',
    'uniform float uProjA;uniform float uProjB;uniform float uMix;uniform float uEye;',
    'uniform float uAspA;uniform float uAspB;uniform float uOffA;uniform float uOffB;',
    'uniform mat3 uRot;uniform vec4 uFrustum;uniform vec3 uLens;uniform float uLensAsp;',
    'uniform vec4 uHot[' + HOT_MAX + '];uniform float uHotN;uniform float uTime;',
    'uniform float uReticle;uniform vec3 uPanelDir;uniform vec2 uPanelSize;uniform float uPanelOn;',
    'uniform float uFade;uniform float uWarp;',
    'const float PI=3.14159265;',
    'vec3 env(vec3 d){',
    '  float h=d.y;',
    '  vec3 c=mix(vec3(0.0,0.0,0.0),vec3(0.018,0.03,0.042),smoothstep(-0.7,0.9,h));',
    '  return c+vec3(0.02,0.05,0.05)*exp(-abs(h)*9.0)*0.6;',
    '}',
    'vec3 cinema(sampler2D t,float asp,vec3 d){',
    '  vec3 col=env(d);',
    '  if(d.z>-0.05){return col;}',
    '  float halfW=1.25;',
    '  vec2 p=d.xy/-d.z;',
    '  vec2 s=vec2(p.x/halfW,p.y/(halfW/max(asp,0.2)));',
    '  if(abs(s.x)<=1.0&&abs(s.y)<=1.0){',
    '    return texture2D(t,vec2(0.5+s.x*0.5,0.5-s.y*0.5)).rgb;',
    '  }',
    '  vec2 c=clamp(s,-1.0,1.0);',
    '  float dist=length(s-c);',
    '  vec3 edge=texture2D(t,vec2(0.5+c.x*0.49,0.5-c.y*0.49)).rgb;',
    '  col+=edge*0.34*exp(-dist*2.4);',
    '  if(s.y<-1.0&&abs(s.x)<=1.0){',
    '    float ry=-2.0-s.y;',
    '    if(ry>-1.0){col+=texture2D(t,vec2(0.5+s.x*0.5,0.5-ry*0.5)).rgb*0.14*smoothstep(-2.4,-1.0,s.y);}',
    '  }',
    '  return col;',
    '}',
    'vec3 sampleProj(sampler2D t,float proj,float asp,float off,vec3 dw){',
    '  float c=cos(off),s=sin(off);',
    '  vec3 d=vec3(dw.x*c+dw.z*s,dw.y,-dw.x*s+dw.z*c);',
    '  if(proj>4.5){return cinema(t,asp,d);}',
    '  float lon=atan(d.x,-d.z);',
    '  float lat=asin(clamp(d.y,-1.0,1.0));',
    '  float v=0.5-lat/PI;',
    '  if(proj<0.5){return texture2D(t,vec2(0.5+lon/(2.0*PI),v)).rgb;}',
    '  if(proj<1.5){return texture2D(t,vec2(0.5+lon/(2.0*PI),v*0.5+uEye*0.5)).rgb;}',
    '  if(proj<2.5){return texture2D(t,vec2((0.5+lon/(2.0*PI))*0.5+uEye*0.5,v)).rgb;}',
    '  float a=abs(lon);',
    '  vec3 e=env(d);',
    '  if(a>PI*0.5){return e;}',
    '  float u=0.5+lon/PI;',
    '  if(proj>3.5){u=u*0.5+uEye*0.5;}',
    '  vec3 img=texture2D(t,vec2(u,v)).rgb;',
    '  return mix(img,e,smoothstep(PI*0.47,PI*0.5,a));',
    '}',
    'void main(){',
    '  vec2 ndc=vNdc;',
    '  float mask=1.0;',
    '  if(uLens.z>0.5){',
    '    vec2 q=vec2(ndc.x*uLensAsp,ndc.y);',
    '    float r2=dot(q,q);',
    '    ndc*=1.0+uLens.x*r2+uLens.y*r2*r2;',
    '    mask=1.0-smoothstep(0.93,1.0,length(q));',
    '  }',
    '  vec3 dv=normalize(vec3(ndc.x*uFrustum.x+uFrustum.z,ndc.y*uFrustum.y+uFrustum.w,-1.0));',
    '  if(uWarp>0.0){',
    '    float rr=length(dv.xy);',
    '    dv=normalize(vec3(dv.xy*(1.0-uWarp*0.55*rr),dv.z));',
    '  }',
    '  vec3 d=normalize(uRot*dv);',
    '  vec3 col=sampleProj(uTexA,uProjA,uAspA,uOffA,d);',
    '  if(uMix>0.001){col=mix(col,sampleProj(uTexB,uProjB,uAspB,uOffB,d),uMix);}',
    '  for(int i=0;i<' + HOT_MAX + ';i++){',
    '    if(float(i)>=uHotN){break;}',
    '    vec4 h=uHot[i];',
    '    float a=length(d-h.xyz);',
    '    float pulse=0.5+0.5*sin(uTime*2.6+float(i)*1.7);',
    '    float ring=smoothstep(0.047,0.041,a)*smoothstep(0.030,0.036,a);',
    '    float dotc=smoothstep(0.015,0.010,a);',
    '    float halo=smoothstep(0.09,0.035,a)*(0.12+0.18*pulse);',
    '    vec3 hc=vec3(0.37,0.92,0.83);',
    '    col=mix(col,vec3(0.02,0.08,0.09),smoothstep(0.05,0.03,a)*0.45);',
    '    col=mix(col,vec3(1.0),ring*0.95);',
    '    col=mix(col,hc,dotc);',
    '    col+=hc*halo;',
    '    if(h.w>1.0){',
    '      vec3 rt=normalize(cross(h.xyz,vec3(0.0,1.0,0.0)));',
    '      vec3 up=cross(rt,h.xyz);',
    '      vec3 k=d-h.xyz;',
    '      float ang=atan(dot(k,up),dot(k,rt));',
    '      float an=fract(0.25-ang/(2.0*PI));',
    '      float band=smoothstep(0.060,0.056,a)*smoothstep(0.050,0.054,a);',
    '      col=mix(col,vec3(1.0,0.76,0.28),band*step(an,h.w-1.0));',
    '    }',
    '  }',
    '  if(uPanelOn>0.5){',
    '    float f=dot(d,uPanelDir);',
    '    if(f>0.2){',
    '      vec3 rt=normalize(cross(uPanelDir,vec3(0.0,1.0,0.0)));',
    '      vec3 up=cross(rt,uPanelDir);',
    '      vec2 p=vec2(dot(d,rt),dot(d,up))/f;',
    '      vec2 uv=p/uPanelSize*0.5+0.5;',
    '      if(uv.x>=0.0&&uv.x<=1.0&&uv.y>=0.0&&uv.y<=1.0){',
    '        vec4 pc=texture2D(uPanel,vec2(uv.x,1.0-uv.y));',
    '        col=mix(col,pc.rgb,pc.a);',
    '      }',
    '    }',
    '  }',
    '  if(uReticle>0.0){',
    '    float rr=length(dv.xy/-dv.z);',
    '    float ret=smoothstep(0.017,0.013,rr)*smoothstep(0.006,0.009,rr);',
    '    col=mix(col,vec3(1.0),ret*0.9);',
    '  }',
    '  gl_FragColor=vec4(col*mask*(1.0-uFade),1.0);',
    '}'
  ].join('\n');

  /* ── 4 · SCRIPT LOADING (hls.js, on demand) ──────────────────────── */
  var hlsP = null;
  function loadHls() {
    if (global.Hls) return Promise.resolve(global.Hls);
    if (hlsP) return hlsP;
    hlsP = new Promise(function (resolve, reject) {
      var s = doc.createElement('script');
      s.src = HLS_SRC; s.async = true; s.crossOrigin = 'anonymous';
      s.onload = function () { global.Hls ? resolve(global.Hls) : reject(new Error('stream_unsupported')); };
      s.onerror = function () { hlsP = null; reject(new Error('stream_unsupported')); };
      doc.head.appendChild(s);
    });
    return hlsP;
  }

  /* ── 5 · ERRORS, IN WORDS A GUEST CAN USE ────────────────────────── */
  var WHY = {
    no_webgl: 'This device cannot draw 3D, so the experience plays as a flat film instead.',
    network: 'The footage stopped arriving. Check the connection and try again.',
    unsupported: 'This browser cannot decode this footage. Try Chrome, Safari or a newer device.',
    cors: 'The footage host is refusing to share it with this page.',
    too_large: 'This footage is larger than this device can draw.',
    context_lost: 'The display reset. Tap to carry on.',
    stream_unsupported: 'This browser cannot play the live stream.',
    denied: 'This experience needs a Cabana Immersive pass.'
  };
  function err(code, detail) { var e = new Error(WHY[code] || code); e.code = code; e.detail = detail; return e; }

  /* ── 6 · THE ENGINE ──────────────────────────────────────────────── */
  function create(host, opts) {
    opts = opts || {};
    var C = caps();
    if (!C.webgl) throw err('no_webgl');

    var canvas = doc.createElement('canvas');
    canvas.className = 'cim-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    host.appendChild(canvas);

    var ctxOpts = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false,
                    preserveDrawingBuffer: false, powerPreference: 'high-performance' };
    var gl = canvas.getContext('webgl2', ctxOpts) || canvas.getContext('webgl', ctxOpts) || canvas.getContext('experimental-webgl', ctxOpts);
    if (!gl) { canvas.remove(); throw err('no_webgl'); }
    var isGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;

    var prog, loc = {}, quad, texA, texB, texPanel;
    var maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        var log = gl.getShaderInfoLog(s); gl.deleteShader(s);
        throw new Error('shader: ' + log);
      }
      return s;
    }
    function makeTex(unit) {
      var t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, isGL2 && unit < 2 ? gl.REPEAT : gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
      return t;
    }
    function initGL() {
      prog = gl.createProgram();
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.bindAttribLocation(prog, 0, 'aPos');
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      ['uTexA', 'uTexB', 'uPanel', 'uProjA', 'uProjB', 'uMix', 'uEye', 'uAspA', 'uAspB', 'uOffA', 'uOffB', 'uRot',
       'uFrustum', 'uLens', 'uLensAsp', 'uHot', 'uHotN', 'uTime', 'uReticle', 'uPanelDir', 'uPanelSize',
       'uPanelOn', 'uFade', 'uWarp'].forEach(function (n) {
        loc[n] = gl.getUniformLocation(prog, n === 'uHot' ? 'uHot[0]' : n);
      });
      quad = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      texA = makeTex(0); texB = makeTex(1); texPanel = makeTex(2);
      gl.uniform1i(loc.uTexA, 0); gl.uniform1i(loc.uTexB, 1); gl.uniform1i(loc.uPanel, 2);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      slotA.tex = texA; slotB.tex = texB;
      slotA.alloc = slotB.alloc = null;
    }

    /* ── state ── */
    var slotA = { tex: null, media: null, proj: 0, asp: 16 / 9, off: 0, alloc: null, scene: null };
    var slotB = { tex: null, media: null, proj: 0, asp: 16 / 9, off: 0, alloc: null, scene: null };
    var S = {
      mode: 'screen', yaw: 0, pitch: 0, fov: 75, targetFov: null,
      gyroOn: false, gyroQ: null, gyroOff: 0, orient: 0,
      presence: opts.presence !== false && !REDUCED,
      lastInput: 0, vx: 0, vy: 0, dragging: false,
      mix: 0, warp: 0, fade: 0, anim: [],
      hot: [], hotGaze: null, gazeT0: 0, gazeCool: 0,
      panel: null, panelDir: [0, 0, -1], panelSize: [0.5, 0.3], panelOn: 0,
      xr: null, xrRef: null, xrOff: 0, running: true, raf: 0, lost: false,
      w: 1, h: 1, dpr: 1, t0: performance.now(), lastFrame: 0,
      rot: new Float32Array(9), tanX: 1, tanY: 1,
      idleSpin: 0, token: 0
    };
    var hotArr = new Float32Array(HOT_MAX * 4);

    initGL();

    /* ── sizing ── */
    function resize() {
      var r = host.getBoundingClientRect();
      var w = Math.max(1, r.width), h = Math.max(1, r.height);
      var dpr = Math.min(global.devicePixelRatio || 1, C.mobile ? 1.75 : 2);
      if (w * h * dpr * dpr > 5.2e6) dpr = Math.sqrt(5.2e6 / (w * h));
      S.w = w; S.h = h; S.dpr = dpr;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    }
    var ro = null;
    if (global.ResizeObserver) { ro = new ResizeObserver(resize); ro.observe(host); }
    else global.addEventListener('resize', resize);
    resize();

    /* ── camera ── */
    function frustumFor(aspect) {
      var ty = Math.tan(S.fov * DEG / 2);
      if (aspect < 1) ty *= Math.pow(1 / aspect, 0.5);
      ty = Math.min(ty, 2.4);
      return { tx: ty * aspect, ty: ty };
    }
    function currentQuat(t) {
      if (S.gyroOn && S.gyroQ) return qMul(qAxis(0, 1, 0, -S.gyroOff * DEG), S.gyroQ);
      var py = 0, pp = 0;
      if (S.presence && S.mode === 'screen' && !S.dragging) {
        var k = t / 1000;
        py = 0.32 * Math.sin(k * 0.21) + 0.14 * Math.sin(k * 0.53 + 1.3);
        pp = 0.22 * Math.sin(k * 0.29 + 0.7) + 0.08 * Math.sin(k * 1.05);   // a breath, not a bob
      }
      return viewQuat(S.yaw + py, S.pitch + pp);
    }
    function forward(q) { return yawPitchOf(mulM3(qMat3(q), [0, 0, -1])); }

    /* ── media ── */
    function isVideo(m) { return m && m.tagName === 'VIDEO'; }
    function hiddenVideo() {
      var v = doc.createElement('video');
      v.crossOrigin = 'anonymous';
      v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
      v.preload = 'auto';
      v.className = 'cim-src';
      v.setAttribute('aria-hidden', 'true');
      // Some iOS builds only decode frames for a video that is in the document.
      v.style.cssText = 'position:absolute;width:2px;height:2px;opacity:0;pointer-events:none;left:0;top:0;';
      host.appendChild(v);
      return v;
    }
    function downscaled(img) {
      var w = img.naturalWidth || img.videoWidth || img.width, h = img.naturalHeight || img.videoHeight || img.height;
      if (w <= maxTex && h <= maxTex) return img;
      var s = Math.min(maxTex / w, maxTex / h);
      var cv = doc.createElement('canvas');
      cv.width = Math.floor(w * s); cv.height = Math.floor(h * s);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      return cv;
    }
    function upload(slot, src, unit) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, slot.tex);
      var w = src.videoWidth || src.naturalWidth || src.width, h = src.videoHeight || src.naturalHeight || src.height;
      if (!w || !h) return;
      try {
        if (slot.alloc && slot.alloc[0] === w && slot.alloc[1] === h) {
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGB, gl.UNSIGNED_BYTE, src);
        } else {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src);
          slot.alloc = [w, h];
        }
      } catch (e) {
        if (e && e.name === 'SecurityError') { fail(err('cors')); stopVideo(slot.media); }
      }
    }
    function setAspect(slot, w, h, proj) {
      if (!w || !h) return;
      slot.asp = proj === PROJ.flat ? w / h : 2;
    }

    // Video too wide for this GPU and no smaller file: draw each frame
    // through a canvas at the largest size the GPU accepts.
    function throughCanvas(slot) {
      var v = slot.media;
      if (!slot.shrink) {
        var s = Math.min(maxTex / v.videoWidth, maxTex / v.videoHeight, 1);
        slot.shrink = doc.createElement('canvas');
        slot.shrink.width = Math.floor(v.videoWidth * s); slot.shrink.height = Math.floor(v.videoHeight * s);
        slot.shrinkCtx = slot.shrink.getContext('2d');
      }
      slot.shrinkCtx.drawImage(v, 0, 0, slot.shrink.width, slot.shrink.height);
      return slot.shrink;
    }

    function stopVideo(v) {
      if (!v) return;
      try { v.pause(); } catch (e) {}
      if (v._hls) { try { v._hls.destroy(); } catch (e) {} v._hls = null; }
      try { v.removeAttribute('src'); v.load(); } catch (e) {}
      if (v.parentNode) v.parentNode.removeChild(v);
    }
    function stopAudio(a) {
      if (!a) return;
      try { a.pause(); a.removeAttribute('src'); a.load(); } catch (e) {}
    }

    function loadImage(url) {
      return new Promise(function (resolve, reject) {
        if (url && typeof url === 'object' && (url.tagName === 'CANVAS' || url.tagName === 'IMG')) { resolve(url); return; }
        var img = new Image();
        img.crossOrigin = 'anonymous';
        img.decoding = 'async';
        img.onload = function () { resolve(img); };
        img.onerror = function () { reject(err('network')); };
        img.src = url;
      });
    }

    function loadVideo(src, token) {
      return new Promise(function (resolve, reject) {
        var v = hiddenVideo();
        var done = false;
        function ok() { if (done) return; done = true; cleanup(); resolve(v); }
        function bad(code) { if (done) return; done = true; cleanup(); stopVideo(v); reject(err(code)); }
        function onErr() {
          var c = v.error && v.error.code;
          bad(c === 4 ? 'unsupported' : 'network');
        }
        function cleanup() { v.removeEventListener('loadeddata', ok); v.removeEventListener('error', onErr); clearTimeout(timer); }
        v.addEventListener('loadeddata', ok);
        v.addEventListener('error', onErr);
        var timer = setTimeout(function () { if (v.readyState >= 2) ok(); else bad('network'); }, 45000);

        v.loop = src.loop !== false;
        v.muted = !!src.muted;
        if (src.stream) {
          var native = v.canPlayType('application/vnd.apple.mpegurl');
          if (native) { v.src = src.stream; v.load(); }
          else {
            loadHls().then(function (Hls) {
              if (token !== S.token || done) return;
              if (!Hls.isSupported()) { bad('stream_unsupported'); return; }
              var hls = new Hls({ capLevelToPlayerSize: false, maxBufferLength: 20, xhrSetup: function (x) { x.withCredentials = false; } });
              v._hls = hls;
              hls.on(Hls.Events.ERROR, function (e, d) { if (d && d.fatal) bad('network'); });
              hls.loadSource(src.stream);
              hls.attachMedia(v);
            }, function () { bad('stream_unsupported'); });
          }
        } else {
          v.src = src.url;
          v.load();
        }
      });
    }

    function watchVideo(slot) {
      var v = slot.media;
      slot.fresh = true;
      if (v.requestVideoFrameCallback) {
        var cb = function () { if (slot.media !== v) return; slot.fresh = true; v.requestVideoFrameCallback(cb); };
        v.requestVideoFrameCallback(cb);
        slot.rvfc = true;
      }
      var emit = function (extra) { if (slot === slotA && opts.onState) opts.onState(Object.assign(state(), extra || {})); };
      v.addEventListener('waiting', function () { if (slot.media === v) emit({ buffering: true }); });
      v.addEventListener('playing', function () { if (slot.media === v) emit({ buffering: false }); });
      v.addEventListener('pause', function () { if (slot.media === v) emit(); });
      v.addEventListener('play', function () { if (slot.media === v) emit(); });
      v.addEventListener('ended', function () { if (slot.media === v) emit({ ended: true }); });
      v.addEventListener('timeupdate', function () {
        if (slot.media === v && slot === slotA && opts.onTime) opts.onTime(v.currentTime, v.duration || 0);
      });
      v.addEventListener('error', function () {
        if (slot.media !== v) return;
        fail(err(v.error && v.error.code === 4 ? 'unsupported' : 'network'));
      });
    }

    function fail(e) { if (opts.onError) opts.onError(e); }

    /* show(scene, source, o)
       scene   { id, kind, projection, yaw, pitch, fov, loop, hotspots }
       source  { url, fallback, stream, audio, muted }  (already resolved)
       o       { transition: bool, toward: {yaw,pitch} }                */
    function show(scene, source, o) {
      o = o || {};
      var token = ++S.token;
      var proj = PROJ[scene.projection] != null ? PROJ[scene.projection] : 0;
      var small = C.mobile || saveData();
      var first = { url: (small && source.fallback) ? source.fallback : (source.url || source.fallback),
                    stream: source.stream || null, loop: scene.loop !== false, muted: !!source.muted };
      var isVid = scene.kind === 'video';
      var transition = !!(o.transition && slotA.media) && !REDUCED;
      var target = transition ? slotB : slotA;
      var unit = transition ? 1 : 0;

      if (transition && o.toward) {
        // Turn to the doorway, then lean into it while the next place loads.
        tween(460, function (k) {
          S.yaw = lerpAngle(S._fromYaw, o.toward.yaw + slotA.off / DEG, k);
          S.pitch = lerp(S._fromPitch, clamp(o.toward.pitch, -30, 30) * 0.4, k);
        }, function () { S._fromYaw = S.yaw; S._fromPitch = S.pitch; });
        tween(900, function (k) { S.warp = 0.5 * k; });
      }

      var p = isVid ? loadVideo(first, token) : loadImage(first.url);
      // If the large file cannot be decoded here, try the smaller one once.
      p = p.catch(function (e) {
        if (token !== S.token) throw e;
        if (!small && source.fallback && source.fallback !== first.url) {
          first.url = source.fallback;
          return isVid ? loadVideo(first, token) : loadImage(first.url);
        }
        throw e;
      });

      return p.then(function (media) {
        if (token !== S.token) { if (isVideo(media)) stopVideo(media); return; }
        // Past the GPU's limit with a smaller file available: use it.
        if (isVid && media.videoWidth > maxTex && source.fallback && first.url !== source.fallback) {
          stopVideo(media);
          first.url = source.fallback;
          return loadVideo(first, token).then(function (m2) { return settle(m2); });
        }
        return settle(media);
      }).catch(function (e) {
        if (token === S.token) { S.warp = 0; fail(e); }
        throw e;
      });

      function settle(media) {
        if (token !== S.token) { if (isVideo(media)) stopVideo(media); return; }
        var old = target.media;
        if (old && old !== media && isVideo(old)) stopVideo(old);
        if (!transition) { stopAudio(slotB.audio); if (isVideo(slotB.media)) stopVideo(slotB.media); slotB.media = null; slotB.audio = null; S.mix = 0; }
        target.media = isVid ? media : downscaled(media);
        target.proj = proj;
        target.scene = scene;
        target.shrink = null;
        setAspect(target, media.videoWidth || media.naturalWidth || media.width, media.videoHeight || media.naturalHeight || media.height, proj);
        target.alloc = null;
        if (isVid) { watchVideo(target); target.big = media.videoWidth > maxTex || media.videoHeight > maxTex; }
        else target.big = false;
        upload(target, target.big ? throughCanvas(target) : target.media, unit);

        // Ambient bed for stills (and optional over video).
        stopAudio(target.audio);
        target.audio = null;
        if (source.audio) {
          var a = new Audio();
          a.crossOrigin = 'anonymous'; a.loop = true; a.src = source.audio; a.volume = 0;
          target.audio = a;
        }

        if (!transition) {
          target.off = 0;
          S.yaw = scene.yaw || 0; S.pitch = scene.pitch || 0;
          S.fov = scene.fov || S.fov || 75;
          if (S.gyroOn) recalibrate();
          startMedia(target);
          emitView();
          if (opts.onState) opts.onState(state());
          return target;
        }

        // Rotate the arriving scene so its chosen start faces the way we
        // are already looking. Walking through a door should not spin you.
        var facing = forward(currentQuat(performance.now())).yaw;
        target.off = wrap180(facing - (scene.yaw != null ? scene.yaw : facing)) * DEG;
        startMedia(target);
        return new Promise(function (resolve) {
          tween(820, function (k) { S.mix = ease(k); S.warp = 0.5 * (1 - k); }, null, function () {
            var oldA = slotA;
            if (isVideo(oldA.media)) stopVideo(oldA.media);
            fadeAudio(oldA.audio, 0, 500, true);
            // Swap roles so A is always what is on screen.
            var t = slotA; slotA = slotB; slotB = t;
            gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, slotA.tex);
            gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, slotB.tex);
            slotB.media = null; slotB.audio = null; slotB.scene = null;
            S.mix = 0; S.warp = 0;
            emitView();
            if (opts.onState) opts.onState(state());
            resolve(slotA);
          });
        });
      }
    }

    function startMedia(slot) {
      var v = slot.media;
      if (isVideo(v)) {
        var pr = v.play();
        if (pr && pr.catch) pr.catch(function () {
          // Sound was refused. Play silently and let the page offer sound.
          if (!v.muted) { v.muted = true; var p2 = v.play(); if (p2 && p2.catch) p2.catch(function () {}); if (opts.onState) opts.onState(Object.assign(state(), { mutedByBrowser: true })); }
        });
      }
      if (slot.audio) {
        var ap = slot.audio.play();
        if (ap && ap.catch) ap.catch(function () {});
        fadeAudio(slot.audio, S.muted ? 0 : 0.8, 1200);
      }
    }
    function fadeAudio(a, to, ms, stopAfter) {
      if (!a) return;
      var from = a.volume, t0 = performance.now();
      (function step() {
        var k = Math.min(1, (performance.now() - t0) / ms);
        try { a.volume = clamp(from + (to - from) * k, 0, 1); } catch (e) {}
        if (k < 1) requestAnimationFrame(step); else if (stopAfter) stopAudio(a);
      })();
    }

    /* ── animation helpers ── */
    function tween(ms, fn, before, after) {
      if (before) before();
      S.anim.push({ t0: performance.now(), ms: ms, fn: fn, after: after });
    }
    function runAnims(now) {
      if (!S.anim.length) return;
      var list = S.anim;
      S.anim = [];            // an `after` may queue the next step
      for (var i = 0; i < list.length; i++) {
        var a = list[i], k = Math.min(1, (now - a.t0) / a.ms);
        a.fn(ease(k));
        if (k < 1) S.anim.push(a); else if (a.after) a.after();
      }
    }

    /* ── hotspots ── */
    function activeHot() {
      var t = isVideo(slotA.media) ? slotA.media.currentTime : null;
      return S.hot.filter(function (h) {
        if (t == null) return true;
        if (h.t0 != null && t < h.t0) return false;
        if (h.t1 != null && t > h.t1) return false;
        return true;
      });
    }
    function hotWorld(h) { return dirOf((h.yaw || 0) + slotA.off / DEG, h.pitch || 0); }

    function packHot(glMode, centerDir, now) {
      var list = glMode ? activeHot() : [];
      if (list.length > HOT_MAX && centerDir) {
        list = list.slice().sort(function (a, b) {
          var da = hotWorld(a), db = hotWorld(b);
          return -(da[0] * centerDir[0] + da[1] * centerDir[1] + da[2] * centerDir[2]) + (db[0] * centerDir[0] + db[1] * centerDir[1] + db[2] * centerDir[2]);
        });
      }
      var n = Math.min(list.length, HOT_MAX), best = null, bestA = 1;
      for (var i = 0; i < n; i++) {
        var d = hotWorld(list[i]);
        hotArr[i * 4] = d[0]; hotArr[i * 4 + 1] = d[1]; hotArr[i * 4 + 2] = d[2];
        hotArr[i * 4 + 3] = 1;
        if (centerDir) {
          var a = Math.acos(clamp(d[0] * centerDir[0] + d[1] * centerDir[1] + d[2] * centerDir[2], -1, 1));
          if (a < 3.4 * DEG && a < bestA) { best = i; bestA = a; }
        }
      }
      // Gaze: hold the reticle on a hotspot to press it.
      if (glMode && centerDir) {
        var h = best != null ? list[best] : null;
        if (h && now > S.gazeCool) {
          if (S.hotGaze !== h) { S.hotGaze = h; S.gazeT0 = now; }
          var k = (now - S.gazeT0) / 1500;
          hotArr[best * 4 + 3] = 1 + Math.min(k, 1);
          if (k >= 1) {
            S.gazeCool = now + 1400; S.hotGaze = null;
            if (opts.onHotspot) opts.onHotspot(h, 'gaze');
          }
        } else if (!h) { S.hotGaze = null; }
      }
      gl.uniform4fv(loc.uHot, hotArr);
      gl.uniform1f(loc.uHotN, n);
    }

    /* ── draw ── */
    function setCommon(now) {
      gl.uniform1f(loc.uProjA, slotA.proj); gl.uniform1f(loc.uProjB, slotB.proj);
      gl.uniform1f(loc.uAspA, slotA.asp); gl.uniform1f(loc.uAspB, slotB.asp);
      gl.uniform1f(loc.uOffA, slotA.off); gl.uniform1f(loc.uOffB, slotB.off);
      gl.uniform1f(loc.uMix, S.mix);
      gl.uniform1f(loc.uTime, (now - S.t0) / 1000);
      gl.uniform1f(loc.uFade, S.fade);
      gl.uniform1f(loc.uWarp, S.warp);
      gl.uniform1f(loc.uPanelOn, S.panelOn);
      gl.uniform3f(loc.uPanelDir, S.panelDir[0], S.panelDir[1], S.panelDir[2]);
      gl.uniform2f(loc.uPanelSize, S.panelSize[0], S.panelSize[1]);
    }
    function refreshTextures() {
      [[slotA, 0], [slotB, 1]].forEach(function (p) {
        var s = p[0], m = s.media;
        if (!isVideo(m) || m.readyState < 2) return;
        if (s.rvfc ? s.fresh : (!m.paused || s.fresh)) {
          upload(s, s.big ? throughCanvas(s) : m, p[1]);
          s.fresh = false;
        }
      });
    }
    function drawView(x, y, w, h, rot, fr, eye, lens, reticle) {
      gl.viewport(x, y, w, h);
      gl.uniformMatrix3fv(loc.uRot, false, rot);
      gl.uniform4f(loc.uFrustum, fr[0], fr[1], fr[2], fr[3]);
      gl.uniform1f(loc.uEye, eye);
      gl.uniform3f(loc.uLens, lens ? 0.22 : 0, lens ? 0.18 : 0, lens ? 1 : 0);
      gl.uniform1f(loc.uLensAsp, w / h);
      gl.uniform1f(loc.uReticle, reticle ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function tick(now) {
      if (!S.running || S.xr) return;
      S.raf = requestAnimationFrame(tick);
      if (S.lost || doc.hidden) return;
      runAnims(now);
      inertia(now);
      idle(now);
      refreshTextures();

      var q = currentQuat(now);
      qMat3(q, S.rot);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      setCommon(now);

      if (S.mode === 'visor') {
        var W = canvas.width, H = canvas.height, half = Math.floor(W / 2);
        var asp = half / H, ty = Math.tan(48 * DEG);
        var fr = [ty * asp, ty, 0, 0];
        var center = mulM3(S.rot, [0, 0, -1]);
        packHot(true, center, now);
        drawView(0, 0, half, H, S.rot, fr, 0, true, true);
        drawView(half, 0, W - half, H, S.rot, fr, 1, true, true);
      } else {
        var f = frustumFor(S.w / S.h);
        S.tanX = f.tx; S.tanY = f.ty;
        packHot(false, null, now);
        drawView(0, 0, canvas.width, canvas.height, S.rot, [f.tx, f.ty, 0, 0], 0, false, false);
      }
      emitView(true);
    }

    function emitView(fromRot) {
      if (!opts.onFrame) return;
      var f = fromRot ? yawPitchOf(mulM3(S.rot, [0, 0, -1])) : forward(currentQuat(performance.now()));
      opts.onFrame({ yaw: f.yaw, pitch: f.pitch, fov: S.fov, sceneYaw: wrap180(f.yaw - slotA.off / DEG), mode: S.mode });
    }

    /* ── input ── */
    var pointers = {}, lastMove = null, pinch0 = null;
    function degPerPx() { return (2 * Math.atan(S.tanY) / DEG) / Math.max(1, S.h); }
    function touchUI() { S.lastInput = performance.now(); S.idleSpin = 0; }

    function onDown(e) {
      if (S.xr) return;
      if (e.button != null && e.button > 0) return;
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now() };
      S.dragging = true; S.vx = S.vy = 0; touchUI();
      var ids = Object.keys(pointers);
      if (ids.length === 2) {
        var a = pointers[ids[0]], b = pointers[ids[1]];
        pinch0 = { d: Math.hypot(a.x - b.x, a.y - b.y), fov: S.fov };
      }
    }
    function onMove(e) {
      var p = pointers[e.pointerId]; if (!p) return;
      var ids = Object.keys(pointers);
      if (ids.length === 2 && pinch0 && S.mode === 'screen') {
        p.x = e.clientX; p.y = e.clientY;
        var a = pointers[ids[0]], b = pointers[ids[1]];
        var d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch0.d > 10) setFov(pinch0.fov * pinch0.d / d);
        return;
      }
      var dx = e.clientX - p.x, dy = e.clientY - p.y, now = performance.now();
      p.x = e.clientX; p.y = e.clientY;
      var k = degPerPx();
      if (S.gyroOn) { S.gyroOff -= dx * k; }
      else {
        S.yaw = wrap180(S.yaw - dx * k);
        if (S.mode === 'screen') S.pitch = clamp(S.pitch + dy * k, -89, 89);
      }
      var dt = Math.max(1, now - (lastMove ? lastMove.t : now - 16));
      S.vx = -dx * k / dt; S.vy = dy * k / dt;
      lastMove = { t: now };
      touchUI();
    }
    function onUp(e) {
      var p = pointers[e.pointerId];
      delete pointers[e.pointerId];
      if (Object.keys(pointers).length < 2) pinch0 = null;
      if (!Object.keys(pointers).length) {
        S.dragging = false;
        if (performance.now() - (lastMove ? lastMove.t : 0) > 80) { S.vx = S.vy = 0; }
        // A tap, not a drag: let the page decide (hotspot pick, HUD toggle).
        if (p && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 6 && performance.now() - p.t < 400) {
          if (opts.onTap) opts.onTap(pickAt(e.clientX, e.clientY), e);
        }
      }
    }
    function inertia() {
      if (S.dragging || (Math.abs(S.vx) < 0.0004 && Math.abs(S.vy) < 0.0004)) return;
      if (S.gyroOn) S.gyroOff += S.vx * 16; else {
        S.yaw = wrap180(S.yaw + S.vx * 16);
        if (S.mode === 'screen') S.pitch = clamp(S.pitch + S.vy * 16, -89, 89);
      }
      S.vx *= 0.93; S.vy *= 0.93;
    }
    function idle(now) {
      // A still with nobody touching it drifts, slowly, the way your eyes
      // wander a view. Film is left alone: the director chose the frame.
      if (!S.presence || S.mode !== 'screen' || S.gyroOn || S.dragging || isVideo(slotA.media) || !slotA.media) return;
      if (now - S.lastInput < 7000) return;
      S.idleSpin = Math.min(1, S.idleSpin + 0.004);
      S.yaw = wrap180(S.yaw + 0.045 * S.idleSpin);
      S.pitch += (0 - S.pitch) * 0.002;
    }
    function onWheel(e) {
      if (S.mode !== 'screen') return;
      e.preventDefault();
      setFov(S.fov + e.deltaY * 0.04);
      touchUI();
    }
    function setFov(f) { S.fov = clamp(f, 30, 110); }

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.style.touchAction = 'none';

    /* ── gyroscope ── */
    function onOrient(e) {
      if (e.alpha == null) return;
      S.gyroQ = deviceQuat(e.alpha || 0, e.beta || 0, e.gamma || 0, S.orient);
      if (S._calib) { S._calib = false; recalibrate(); }
    }
    function onScreenOrient() {
      S.orient = (global.screen && screen.orientation && screen.orientation.angle) || global.orientation || 0;
    }
    function recalibrate() {
      if (!S.gyroQ) { S._calib = true; return; }
      var dev = forward(S.gyroQ).yaw;
      S.gyroOff = wrap180(S.yaw - dev);
    }
    function setGyro(on) {
      if (!on) {
        if (S.gyroOn && S.gyroQ) { var f = forward(currentQuat(performance.now())); S.yaw = f.yaw; S.pitch = f.pitch; }
        S.gyroOn = false;
        global.removeEventListener('deviceorientation', onOrient);
        return Promise.resolve(false);
      }
      var ask = global.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function'
        ? DeviceOrientationEvent.requestPermission() : Promise.resolve('granted');
      return Promise.resolve(ask).then(function (r) {
        if (r !== 'granted') return false;
        onScreenOrient();
        global.addEventListener('deviceorientation', onOrient);
        S.gyroOn = true; S.gyroQ = null; S._calib = true;
        // A laptop has the API and no sensor. If nothing arrives, give up.
        return new Promise(function (resolve) {
          setTimeout(function () {
            if (!S.gyroQ) { S.gyroOn = false; global.removeEventListener('deviceorientation', onOrient); resolve(false); }
            else resolve(true);
          }, 900);
        });
      }, function () { return false; });
    }
    global.addEventListener('orientationchange', onScreenOrient);
    if (global.screen && screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', onScreenOrient);

    /* ── picking and projection (DOM hotspots, the studio) ── */
    function pickAt(clientX, clientY) {
      var r = canvas.getBoundingClientRect();
      var nx = ((clientX - r.left) / r.width) * 2 - 1, ny = 1 - ((clientY - r.top) / r.height) * 2;
      var dv = [nx * S.tanX, ny * S.tanY, -1];
      var l = Math.hypot(dv[0], dv[1], dv[2]); dv = [dv[0] / l, dv[1] / l, dv[2] / l];
      var w = mulM3(S.rot, dv);
      var yp = yawPitchOf(w);
      return { yaw: wrap180(yp.yaw - slotA.off / DEG), pitch: yp.pitch, worldYaw: yp.yaw };
    }
    function project(yaw, pitch) {
      var w = dirOf(yaw + slotA.off / DEG, pitch);
      var v = mulM3T(S.rot, w);
      if (v[2] > -0.02) return { visible: false, x: 0, y: 0, z: v[2] };
      var nx = (v[0] / -v[2]) / S.tanX, ny = (v[1] / -v[2]) / S.tanY;
      return { visible: Math.abs(nx) < 1.25 && Math.abs(ny) < 1.25, x: (nx + 1) / 2 * S.w, y: (1 - ny) / 2 * S.h, z: v[2] };
    }

    /* ── WebXR ── */
    function enterXR() {
      if (!navigator.xr) return Promise.reject(new Error('xr_unavailable'));
      var ready = gl.makeXRCompatible ? gl.makeXRCompatible() : Promise.resolve();
      return Promise.resolve(ready).then(function () {
        return navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] });
      }).then(function (session) {
        S.xr = session;
        cancelAnimationFrame(S.raf);
        session.updateRenderState({ baseLayer: new global.XRWebGLLayer(session, gl, { antialias: false }) });
        session.addEventListener('end', function () {
          S.xr = null; S.xrRef = null;
          if (opts.onXR) opts.onXR(false);
          if (S.running) S.raf = requestAnimationFrame(tick);
        });
        session.addEventListener('select', function (ev) {
          var h = null;
          try {
            var pose = ev.frame.getPose(ev.inputSource.targetRaySpace, S.xrRef);
            if (pose) {
              var o = pose.transform.orientation;
              var q = qMul(qAxis(0, 1, 0, -S.xrOff * DEG), [o.x, o.y, o.z, o.w]);
              var d = mulM3(qMat3(q), [0, 0, -1]);
              h = nearestHot(d, 6);
            }
          } catch (e) {}
          if (h) { if (opts.onHotspot) opts.onHotspot(h, 'select'); }
          else if (isVideo(slotA.media)) { slotA.media.paused ? slotA.media.play() : slotA.media.pause(); }
        });
        session.addEventListener('squeeze', function () { session.end(); });
        return session.requestReferenceSpace('local').then(function (ref) {
          S.xrRef = ref;
          S.xrOff = null;
          if (opts.onXR) opts.onXR(true);
          session.requestAnimationFrame(xrFrame);
          return true;
        });
      });
    }
    function nearestHot(d, maxDeg) {
      var best = null, bestA = maxDeg * DEG;
      activeHot().forEach(function (h) {
        var w = hotWorld(h);
        var a = Math.acos(clamp(w[0] * d[0] + w[1] * d[1] + w[2] * d[2], -1, 1));
        if (a < bestA) { bestA = a; best = h; }
      });
      return best;
    }
    function xrFrame(now, frame) {
      var session = frame.session;
      if (!S.xr) return;
      session.requestAnimationFrame(xrFrame);
      var pose = frame.getViewerPose(S.xrRef);
      if (!pose) return;
      runAnims(now);
      refreshTextures();
      var layer = session.renderState.baseLayer;
      gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
      // Face the scene's chosen direction when the headset goes on.
      if (S.xrOff == null) {
        var o0 = pose.transform.orientation;
        var headYaw = forward([o0.x, o0.y, o0.z, o0.w]).yaw;
        S.xrOff = wrap180(S.yaw - headYaw);
      }
      setCommon(now);
      var yawQ = qAxis(0, 1, 0, -S.xrOff * DEG);
      var ho = pose.transform.orientation;
      var headRot = qMat3(qMul(yawQ, [ho.x, ho.y, ho.z, ho.w]));
      packHot(true, mulM3(headRot, [0, 0, -1]), now);
      for (var i = 0; i < pose.views.length; i++) {
        var view = pose.views[i], vp = layer.getViewport(view), o = view.transform.orientation, m = view.projectionMatrix;
        var rot = qMat3(qMul(yawQ, [o.x, o.y, o.z, o.w]));
        var fr = [1 / m[0], 1 / m[5], m[8] / m[0], m[9] / m[5]];
        var eye = view.eye === 'right' ? 1 : 0;
        drawView(vp.x, vp.y, vp.width, vp.height, rot, fr, eye, false, true);
      }
    }

    /* ── panels (visor / xr text) ── */
    function showPanel(cv, at) {
      if (!cv) { S.panelOn = 0; return; }
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, texPanel);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
      at = at || {};
      S.panelDir = dirOf((at.yaw || 0) + slotA.off / DEG, clamp(at.pitch || 0, -60, 60));
      var hw = at.w || 0.42;
      S.panelSize = [hw, hw * cv.height / cv.width];
      S.panelOn = 1;
    }

    /* ── context loss ── */
    canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault(); S.lost = true;
      if (S.running) fail(err('context_lost'));      // not when we let it go ourselves
    });
    canvas.addEventListener('webglcontextrestored', function () {
      try {
        initGL(); S.lost = false;
        [[slotA, 0], [slotB, 1]].forEach(function (p) { if (p[0].media) { p[0].alloc = null; upload(p[0], p[0].big ? throughCanvas(p[0]) : p[0].media, p[1]); } });
      } catch (e) { fail(e); }
    });

    function onVis() { if (doc.hidden && isVideo(slotA.media) && !slotA.media.paused) { slotA.media.pause(); S._resume = true; } else if (!doc.hidden && S._resume) { S._resume = false; startMedia(slotA); } }
    doc.addEventListener('visibilitychange', onVis);

    S.raf = requestAnimationFrame(tick);

    /* ── public surface ── */
    function state() {
      var v = isVideo(slotA.media) ? slotA.media : null;
      return {
        video: !!v, playing: !!(v && !v.paused), muted: v ? v.muted : !!S.muted,
        time: v ? v.currentTime : 0, duration: v ? (v.duration || 0) : 0,
        mode: S.mode, gyro: S.gyroOn, xr: !!S.xr, scene: slotA.scene && slotA.scene.id,
        ready: !!slotA.media
      };
    }

    return {
      show: show,
      state: state,
      play: function () { if (isVideo(slotA.media)) startMedia(slotA); },
      pause: function () { if (isVideo(slotA.media)) slotA.media.pause(); },
      toggle: function () { var v = slotA.media; if (!isVideo(v)) return; v.paused ? startMedia(slotA) : v.pause(); },
      seek: function (t) { var v = slotA.media; if (isVideo(v) && isFinite(t)) { v.currentTime = clamp(t, 0, (v.duration || t) - 0.05); slotA.fresh = true; } },
      setMuted: function (m) {
        S.muted = !!m;
        var v = slotA.media; if (isVideo(v)) { v.muted = !!m; if (!m && v.paused) startMedia(slotA); }
        if (slotA.audio) fadeAudio(slotA.audio, m ? 0 : 0.8, 400);
        if (opts.onState) opts.onState(state());
      },
      setMode: function (m) {
        S.mode = m === 'visor' ? 'visor' : 'screen';
        S.vx = S.vy = 0;
        if (S.mode === 'visor') S.pitch = 0;
        if (opts.onState) opts.onState(state());
      },
      setGyro: setGyro,
      recenter: function () { if (S.gyroOn) { S.yaw = (slotA.scene && slotA.scene.yaw) || 0; recalibrate(); } else { S.yaw = (slotA.scene && slotA.scene.yaw) || 0; S.pitch = 0; } },
      look: function (yaw, pitch, animate) {
        yaw = yaw + slotA.off / DEG;          // scene space in, world space on screen
        if (S.gyroOn) { S.gyroOff = wrap180(S.gyroOff + wrap180(yaw - forward(currentQuat(performance.now())).yaw)); return; }
        if (animate && !REDUCED) {
          var fy = S.yaw, fp = S.pitch;
          tween(700, function (k) { S.yaw = lerpAngle(fy, yaw, k); S.pitch = lerp(fp, pitch, k); });
        } else { S.yaw = wrap180(yaw); S.pitch = clamp(pitch, -89, 89); }
        touchUI();
      },
      nudge: function (dy, dp) { S.yaw = wrap180(S.yaw + dy); S.pitch = clamp(S.pitch + dp, -89, 89); touchUI(); },
      zoom: function (d) { setFov(S.fov + d); touchUI(); },
      view: function () { return { yaw: S.yaw, pitch: S.pitch, fov: S.fov, sceneYaw: wrap180(S.yaw - slotA.off / DEG) }; },
      setHotspots: function (list) { S.hot = (list || []).slice(); S.hotGaze = null; },
      activeHotspots: activeHot,
      project: project,
      pick: pickAt,
      setPresence: function (on) { S.presence = !!on && !REDUCED; },
      showPanel: showPanel,
      hidePanel: function () { S.panelOn = 0; },
      fadeTo: function (v, ms) { var f0 = S.fade; return new Promise(function (r) { tween(ms || 400, function (k) { S.fade = lerp(f0, v, k); }, null, r); }); },
      enterXR: enterXR,
      exitXR: function () { if (S.xr) return S.xr.end(); },
      inXR: function () { return !!S.xr; },
      video: function () { return isVideo(slotA.media) ? slotA.media : null; },
      canvas: canvas,
      destroy: function () {
        S.running = false; S.token++;
        cancelAnimationFrame(S.raf);
        if (S.xr) try { S.xr.end(); } catch (e) {}
        [slotA, slotB].forEach(function (s) { if (isVideo(s.media)) stopVideo(s.media); stopAudio(s.audio); s.media = null; });
        global.removeEventListener('deviceorientation', onOrient);
        global.removeEventListener('orientationchange', onScreenOrient);
        if (global.screen && screen.orientation && screen.orientation.removeEventListener) screen.orientation.removeEventListener('change', onScreenOrient);
        doc.removeEventListener('visibilitychange', onVis);
        if (ro) ro.disconnect(); else global.removeEventListener('resize', resize);
        try { var l = gl.getExtension('WEBGL_lose_context'); if (l) l.loseContext(); } catch (e) {}
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    };
  }

  /* ── 7 · THE CALIBRATION WORLD ───────────────────────────────────────
     An illustrated Amboseli dusk, painted here in code as an
     equirectangular panorama. It is what the section shows before any
     real footage exists, and what a first-time guest can use to learn
     the controls. It is labelled as illustrated everywhere it appears;
     nothing about it pretends to be a photograph of a real place.   */
  function paintWorld(width, variant) {
    var night = variant === 'night';
    var W = Math.max(512, width || 2048), H = W / 2;
    var cv = doc.createElement('canvas'); cv.width = W; cv.height = H;
    var g = cv.getContext('2d');
    var horizon = H * 0.515;
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    // Seamless ridge: only whole-number frequencies round the circle.
    function ridge(u, f, amp, ph) {
      var t = u * Math.PI * 2, s = 0;
      for (var i = 0; i < f.length; i++) s += Math.sin(t * f[i] + ph[i]) / (i + 1);
      return s * amp;
    }
    function uOf(yaw) { return ((yaw / 360) + 0.5 + 1) % 1; }

    // Sky
    var sky = g.createLinearGradient(0, 0, 0, horizon);
    if (night) {
      sky.addColorStop(0, '#010208'); sky.addColorStop(0.4, '#060B22'); sky.addColorStop(0.75, '#111B40');
      sky.addColorStop(0.93, '#243463'); sky.addColorStop(1, '#3A4A7A');
    } else {
      sky.addColorStop(0, '#070A1C'); sky.addColorStop(0.28, '#1B1840'); sky.addColorStop(0.55, '#4A2A66');
      sky.addColorStop(0.78, '#B24A5E'); sky.addColorStop(0.92, '#F2874A'); sky.addColorStop(1, '#FFC46B');
    }
    g.fillStyle = sky; g.fillRect(0, 0, W, horizon + 2);

    // Stars, thinning toward the glow
    var starSpan = night ? 0.92 : 0.55;
    for (var i = 0; i < W * (night ? 1.1 : 0.35); i++) {
      var sy = Math.pow(rnd(), night ? 1.1 : 1.8) * horizon * starSpan;
      g.globalAlpha = (1 - sy / (horizon * starSpan)) * (0.35 + rnd() * 0.65);
      g.fillStyle = '#FFFFFF';
      var r = rnd() < 0.06 ? 1.4 : 0.7;
      g.fillRect(rnd() * W, sy, r * (W / 2048) * 1.6, r * (W / 2048));
    }
    g.globalAlpha = 1;

    // Sun low in the west (or the moon, higher, at night), with its glow
    // wrapped across the seam
    var sunU = uOf(34), sunY = night ? horizon - H * 0.2 : horizon - H * 0.035;
    [sunU * W, sunU * W - W, sunU * W + W].forEach(function (sx) {
      var glow = g.createRadialGradient(sx, sunY, 0, sx, sunY, H * (night ? 0.3 : 0.55));
      if (night) {
        glow.addColorStop(0, 'rgba(220,232,255,.55)'); glow.addColorStop(0.1, 'rgba(160,185,255,.2)'); glow.addColorStop(1, 'rgba(120,150,255,0)');
      } else {
        glow.addColorStop(0, 'rgba(255,214,140,.85)'); glow.addColorStop(0.08, 'rgba(255,170,90,.55)');
        glow.addColorStop(0.35, 'rgba(255,110,80,.18)'); glow.addColorStop(1, 'rgba(255,110,80,0)');
      }
      g.fillStyle = glow; g.fillRect(sx - H * 0.6, 0, H * 1.2, horizon + 4);
      g.fillStyle = night ? '#F2F5FF' : '#FFE2A8';
      g.beginPath(); g.ellipse(sx, sunY, H * (night ? 0.018 : 0.026), H * (night ? 0.017 : 0.024), 0, 0, Math.PI * 2); g.fill();
      if (night) {
        g.fillStyle = 'rgba(160,170,200,.35)';
        g.beginPath(); g.arc(sx - H * 0.005, sunY - H * 0.004, H * 0.004, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(sx + H * 0.006, sunY + H * 0.005, H * 0.003, 0, Math.PI * 2); g.fill();
      }
    });

    // Kilimanjaro, south-east: broad, flat-topped, a last light on the snow
    var kU = uOf(-42) * W, kW = W * 0.2, kH = H * 0.13;
    [kU, kU - W, kU + W].forEach(function (kx) {
      g.fillStyle = night ? '#1A2346' : '#3A2F5C';
      g.beginPath();
      g.moveTo(kx - kW, horizon + 2);
      g.bezierCurveTo(kx - kW * 0.55, horizon - kH * 0.25, kx - kW * 0.3, horizon - kH * 0.95, kx - kW * 0.12, horizon - kH);
      g.lineTo(kx + kW * 0.16, horizon - kH * 0.98);
      g.bezierCurveTo(kx + kW * 0.34, horizon - kH * 0.9, kx + kW * 0.6, horizon - kH * 0.22, kx + kW, horizon + 2);
      g.closePath(); g.fill();
      var snow = g.createLinearGradient(0, horizon - kH, 0, horizon - kH * 0.62);
      snow.addColorStop(0, night ? 'rgba(214,226,255,.85)' : 'rgba(255,214,226,.92)'); snow.addColorStop(1, 'rgba(214,226,255,0)');
      g.fillStyle = snow;
      g.beginPath();
      g.moveTo(kx - kW * 0.22, horizon - kH * 0.78);
      g.bezierCurveTo(kx - kW * 0.18, horizon - kH * 0.95, kx - kW * 0.13, horizon - kH * 1.0, kx - kW * 0.1, horizon - kH);
      g.lineTo(kx + kW * 0.15, horizon - kH * 0.985);
      g.bezierCurveTo(kx + kW * 0.22, horizon - kH * 0.95, kx + kW * 0.28, horizon - kH * 0.86, kx + kW * 0.3, horizon - kH * 0.74);
      g.lineTo(kx + kW * 0.12, horizon - kH * 0.8); g.lineTo(kx, horizon - kH * 0.72); g.lineTo(kx - kW * 0.1, horizon - kH * 0.82);
      g.closePath(); g.fill();
    });

    // Three ridgelines, far to near, colder and lighter with distance
    (night ? [['#202A4E', 0.022, [3, 7, 11], 0.9], ['#141B36', 0.016, [5, 9, 17], 2.1], ['#0A0F22', 0.01, [8, 13, 23], 3.3]]
           : [['#4B3462', 0.022, [3, 7, 11], 0.9], ['#2E2140', 0.016, [5, 9, 17], 2.1], ['#1A1426', 0.01, [8, 13, 23], 3.3]]).forEach(function (L, li) {
      var ph = [L[3], L[3] * 1.7, L[3] * 2.3];
      g.fillStyle = L[0];
      g.beginPath(); g.moveTo(0, H);
      for (var x = 0; x <= W; x += 4) {
        var y = horizon - H * (0.004 + li * 0.002) - Math.max(0, ridge(x / W, L[2], H * L[1], ph));
        g.lineTo(x, y);
      }
      g.lineTo(W, H); g.closePath(); g.fill();
    });

    // Ground
    var ground = g.createLinearGradient(0, horizon, 0, H);
    if (night) { ground.addColorStop(0, '#0E1328'); ground.addColorStop(0.18, '#080B18'); ground.addColorStop(1, '#010103'); }
    else { ground.addColorStop(0, '#2A1C14'); ground.addColorStop(0.18, '#18110D'); ground.addColorStop(1, '#040304'); }
    g.fillStyle = ground; g.fillRect(0, horizon + H * 0.008, W, H - horizon);

    // Grass catching the last light
    for (var k = 0; k < W * 1.4; k++) {
      var gx = rnd() * W, depth = Math.pow(rnd(), 2.2), gy = horizon + H * 0.01 + depth * H * 0.2;
      var len = (2 + depth * 14) * (W / 2048);
      g.strokeStyle = night
        ? 'rgba(' + Math.round(70 + 50 * (1 - depth)) + ',' + Math.round(84 + 50 * (1 - depth)) + ',130,' + (0.18 + 0.25 * (1 - depth)) + ')'
        : 'rgba(' + Math.round(120 + 90 * (1 - depth)) + ',' + Math.round(70 + 40 * (1 - depth)) + ',40,' + (0.25 + 0.35 * (1 - depth)) + ')';
      g.lineWidth = Math.max(0.6, depth * 1.6) * (W / 2048);
      g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + (rnd() - 0.5) * len * 0.5, gy - len); g.stroke();
    }

    // Acacias: flat umbrella crowns on thin forked trunks
    function acacia(yaw, scale) {
      var x = uOf(yaw) * W, base = horizon + H * 0.012 * scale, s = (W / 2048) * scale;
      g.fillStyle = '#0B0709'; g.strokeStyle = '#0B0709';
      g.lineWidth = 3.2 * s; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x, base); g.lineTo(x - 2 * s, base - 34 * s); g.lineTo(x - 16 * s, base - 52 * s);
      g.moveTo(x - 2 * s, base - 34 * s); g.lineTo(x + 14 * s, base - 55 * s); g.stroke();
      g.beginPath(); g.ellipse(x - 1 * s, base - 58 * s, 46 * s, 8.5 * s, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(x - 20 * s, base - 55 * s, 22 * s, 6 * s, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(x + 22 * s, base - 56 * s, 20 * s, 5.5 * s, 0, 0, Math.PI * 2); g.fill();
    }
    [[-120, 1.3], [-84, 0.7], [8, 1.0], [62, 1.9], [110, 0.8], [150, 1.2], [-165, 0.9]].forEach(function (a) { acacia(a[0], a[1]); });

    // A small herd walking home, north-east
    function elephant(yaw, scale, flip) {
      var x = uOf(yaw) * W, base = horizon + H * 0.02, s = (W / 2048) * scale * (flip ? -1 : 1), a = Math.abs(s);
      g.fillStyle = '#0D090B';
      g.beginPath(); g.ellipse(x, base - 20 * a, 22 * a, 13 * a, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(x + 20 * s, base - 25 * a, 10 * a, 9 * a, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(x + 16 * s, base - 24 * a, 7 * a, 9 * a, 0.3, 0, Math.PI * 2); g.fill();
      g.lineWidth = 3.4 * a; g.strokeStyle = '#0D090B'; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x + 27 * s, base - 24 * a); g.quadraticCurveTo(x + 32 * s, base - 10 * a, x + 29 * s, base - 2 * a); g.stroke();
      [-14, -6, 8, 15].forEach(function (lx, j) {
        g.lineWidth = 5.4 * a;
        g.beginPath(); g.moveTo(x + lx * s, base - 12 * a); g.lineTo(x + (lx + (j % 2 ? 1.5 : -1.5)) * s, base); g.stroke();
      });
    }
    elephant(96, 1.1, false); elephant(101, 0.85, false); elephant(106, 0.55, false); elephant(92, 0.7, false);

    // Birds heading for the trees
    g.strokeStyle = 'rgba(20,12,24,.8)'; g.lineWidth = 1.4 * (W / 2048);
    [[20, 0.33], [24, 0.3], [27, 0.35], [-10, 0.25], [-6, 0.27]].forEach(function (b) {
      var bx = uOf(b[0]) * W, by = horizon * (1 - b[1]), s = 6 * (W / 2048);
      g.beginPath(); g.moveTo(bx - s, by); g.quadraticCurveTo(bx - s * 0.4, by - s * 0.6, bx, by);
      g.quadraticCurveTo(bx + s * 0.4, by - s * 0.6, bx + s, by); g.stroke();
    });

    // A little haze on the horizon ties the layers together
    var haze = g.createLinearGradient(0, horizon - H * 0.04, 0, horizon + H * 0.03);
    var hz = night ? '120,140,220' : '255,150,110';
    haze.addColorStop(0, 'rgba(' + hz + ',0)'); haze.addColorStop(0.55, 'rgba(' + hz + ',.12)'); haze.addColorStop(1, 'rgba(' + hz + ',0)');
    g.fillStyle = haze; g.fillRect(0, horizon - H * 0.04, W, H * 0.07);
    return cv;
  }

  global.CabanaImmersiveEngine = {
    create: create,
    caps: caps,
    xrSupported: xrSupported,
    paintWorld: paintWorld,
    PROJ: PROJ,
    WHY: WHY,
    _math: { dirOf: dirOf, yawPitchOf: yawPitchOf, viewQuat: viewQuat, qMat3: qMat3, mulM3: mulM3, deviceQuat: deviceQuat, wrap180: wrap180 }
  };
})(window);
