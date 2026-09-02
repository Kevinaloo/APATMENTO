/* ═══════════════════════════════════════════════════════════════════
   CABANA · THE CANOPY GATE — engine
   ───────────────────────────────────────────────────────────────────
   Builds the forest, runs the sequence, and gets out of the way.

   On the artwork
   ──────────────
   Monstera and banana blades are hand-authored, because their
   silhouettes are the two shapes a person actually recognises as
   "jungle" and a generator would only round them off. Palms and ferns
   are generated, because they are radial and pinnate respectively —
   maths describes them better than a hand does, and generating them
   means every frond has its own segment count and droop instead of
   being the same stamp rotated.

   Placement is not random. A random canopy looks random. Every leaf
   below is positioned by hand so that the two curtains close on a
   readable seam down the centre, the heaviest mass sits low where a
   real understory is heavy, and nothing important is behind the word.

   On colour through a leaf
   ────────────────────────
   A leaf in sunlight is not one green. It is dark where it is thick
   near the midrib, bright where it is thin at the margin, and it
   glows at the very edge where light comes through rather than off.
   Each blade is therefore drawn four times: lamina gradient, specular
   sheen, veins, then a translucent rim. That fourth pass is the one
   that stops it looking like paper.

   On never trapping anyone
   ────────────────────────
   Six independent ways out: the sequence finishing, window load, a
   tap anywhere, the Escape key, a hard wall-clock ceiling, and the
   page being hidden. Any one of them removes the gate and unlocks the
   scroll. An arrival animation that can strand a visitor is not a
   nice touch, it is an outage.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var doc = global.document;
  if (!doc) return;
  if (global.CabanaJungleGate) return;

  var ID = 'jungle-gate';
  var SS_KEY = 'cbn-gate-seen';

  /* ── deterministic noise ────────────────────────────────────────────
     Seeded so the forest is the same forest on every load. A canopy
     that reshuffles between visits reads as a screensaver. */
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }
  function r2(n, dp) { return Number(n.toFixed(dp == null ? 2 : dp)); }

  /* ═══ GEOMETRY ════════════════════════════════════════════════════

     The lighting model is the important decision here, not the paths.
     Every blade is backlit: the lamina is nearly black, and what you
     actually read is the rim where light comes around the edge and the
     thin wash where it comes through the leaf. Vector shapes stop
     reading as vector shapes in that condition, because in that
     condition an eye stops hunting for surface texture and starts
     reading silhouette. It is also simply what a forest looks like at
     the hour this scene is set.                                       */

  /* A leaf is not symmetric about its middle: it widens fast off the
     petiole, holds, then falls to a tip blunter than its base. sin()
     cannot express that. Two exponents can. */
  function envelope(a, b) {
    var peak = a / (a + b);
    var norm = Math.pow(peak, a) * Math.pow(1 - peak, b);
    return function (t) {
      t = Math.min(Math.max(t, 0.0001), 0.9999);
      return Math.pow(t, a) * Math.pow(1 - t, b) / norm;
    };
  }

  /* One generator for both hero leaves. Walk the margin base→tip and
     back, detouring in toward the spine wherever a cut belongs. The
     result is a single closed path: no mask, no overlapping subpaths,
     no fill-rule tricks. That matters because this shape is instanced
     forty-odd times and painted four times each.

       monstera · five deep cuts with wide mouths
       banana   · four shallow ragged tears from the wind             */
  function cutBlade(o) {
    var cx = o.cx, yBase = o.yBase, yTip = o.yTip, wMax = o.wMax;
    var H = yBase - yTip, E = envelope(o.a || 0.95, o.b || 0.62);
    var rand = rng(o.seed || 7);
    function yAt(t) { return yBase - H * t; }
    function env(t) { return wMax * E(t); }

    function cuts() {
      var out = [], n = o.cuts | 0, i;
      for (i = 0; i < n; i++) {
        out.push({
          t: o.from + (i / (n - 1 || 1)) * (o.to - o.from) + (rand() - 0.5) * (o.scatter || 0.02),
          depth: Math.min(0.94, (o.depth || 0.82) * (1 - (o.dj || 0) / 2 + rand() * (o.dj || 0))),
          width: (o.gap || 0.07) * (0.72 + rand() * 0.6)
        });
      }
      out.sort(function (x, y) { return x.t - y.t; });
      /* Two cuts that overlap would carve the blade into loose shards.
         Push each one clear of the last rather than dropping it, so the
         requested number of cuts is the number you get. */
      for (i = 1; i < out.length; i++) {
        var minT = out[i - 1].t + out[i - 1].width * 0.8 + 0.03;
        if (out[i].t < minT) out[i].t = minT;
      }
      return out.filter(function (c) { return c.t + c.width < 0.94; });
    }

    /* Walk the margin strictly forward. An earlier version resumed
       sampling from the loop counter after cutting, which sat behind
       the cut's far edge and folded the outline back on itself.

       Each point carries an optional control point. Cut walls are
       curved rather than ruled, because a leaf cut by wind or growth
       does not have straight edges, and straight edges everywhere is
       what made the first pass read as cut glass. */
    function side(sign, cs) {
      var pts = [], N = o.samples || 48, step = 1 / N, ci = 0, t = 0, guard = 0;
      function M(tt) { return [cx + sign * env(tt), yAt(tt)]; }
      while (t <= 1.0001 && guard++ < 600) {
        if (ci < cs.length && t >= cs[ci].t) {
          var c = cs[ci];
          /* The sinus points down and in: lobes radiate up and out, so
             the gap between two of them narrows toward the base. */
          var tIn  = Math.max(0.02, c.t - c.width * 0.14);
          var tOut = Math.min(1, c.t + c.width * 0.72);
          var A = M(c.t);
          var B = [cx + sign * env(tIn) * (1 - c.depth), yAt(tIn)];
          var C = M(tOut);
          pts.push([A[0], A[1], true, null]);
          pts.push([B[0], B[1], true,
                    [A[0] + (B[0] - A[0]) * 0.45 - sign * c.width * H * 0.06,
                     A[1] + (B[1] - A[1]) * 0.62]]);
          pts.push([C[0], C[1], true,
                    [B[0] + (C[0] - B[0]) * 0.55 - sign * c.width * H * 0.04,
                     B[1] + (C[1] - B[1]) * 0.38]]);
          t = tOut + step * 0.5;
          ci++;
          continue;
        }
        var P = M(t);
        pts.push([P[0], P[1], false, null]);
        t += step;
      }
      var E1 = M(1);
      pts.push([E1[0], E1[1], false, null]);
      return pts;
    }

    var all = side(-1, cuts()).concat(side(1, cuts()).reverse());
    var d = 'M' + r2(all[0][0]) + ' ' + r2(all[0][1]);
    for (var i = 1; i < all.length; i++) {
      var p = all[i - 1], q = all[i];
      if (q[3]) {
        d += 'Q' + r2(q[3][0]) + ' ' + r2(q[3][1]) + ' ' + r2(q[0]) + ' ' + r2(q[1]);
      } else if (p[2] || q[2]) {
        d += 'L' + r2(q[0]) + ' ' + r2(q[1]);
      } else {
        /* quadratic through midpoints: the margin stays smooth without
           needing a control point stored for every sample */
        d += 'Q' + r2(p[0]) + ' ' + r2(p[1]) + ' ' +
             r2((p[0] + q[0]) / 2) + ' ' + r2((p[1] + q[1]) / 2);
      }
    }
    return d + 'Z';
  }

  function veinsFor(o) {
    var cx = o.cx, H = o.yBase - o.yTip;
    var E = envelope(o.a || 0.95, o.b || 0.62);
    var d = 'M' + cx + ' ' + r2(o.yBase) + 'L' + cx + ' ' + r2(o.yTip);
    var n = o.veins || 7;
    for (var i = 1; i <= n; i++) {
      var t = i / (n + 1), y = o.yBase - H * t, e = o.wMax * E(t) * 0.78;
      d += 'M' + cx + ' ' + r2(y) + 'Q' + r2(cx - e * 0.55) + ' ' + r2(y - H * 0.02) + ' ' + r2(cx - e) + ' ' + r2(y - H * 0.07);
      d += 'M' + cx + ' ' + r2(y) + 'Q' + r2(cx + e * 0.55) + ' ' + r2(y - H * 0.02) + ' ' + r2(cx + e) + ' ' + r2(y - H * 0.07);
    }
    return d;
  }

  var MO_SPEC = { cx:100, yBase:224, yTip:12, wMax:98, a:0.95, b:0.62,
                  cuts:6, from:0.16, to:0.86, depth:0.80, dj:0.18,
                  gap:0.16, scatter:0.025, veins:6 };
  var BA_SPEC = { cx:80,  yBase:294, yTip:10, wMax:60, a:0.75, b:0.42,
                  cuts:4, from:0.22, to:0.78, depth:0.42, dj:0.9,
                  gap:0.032, scatter:0.05, veins:13 };
  function spec(base, over) {
    var o = {}, k;
    for (k in base) if (base.hasOwnProperty(k)) o[k] = base[k];
    for (k in over) if (over.hasOwnProperty(k)) o[k] = over[k];
    return o;
  }

  /* A fan palm: segments radiating from one point, each with the split
     tip a real Livistona has. Generated so no two fans repeat. */
  function fanPalm(seed) {
    var rand = rng(seed);
    var segs = 11 + Math.floor(rand() * 4);
    var cx = 120, cy = 198;
    var spread = 138 + rand() * 26;
    var d = '';
    for (var i = 0; i < segs; i++) {
      var t = segs === 1 ? .5 : i / (segs - 1);
      var a = (-90 - spread / 2 + spread * t) * Math.PI / 180;
      /* Outer segments are shorter. That curve is what makes the
         silhouette a fan rather than a starburst. */
      var len = (86 + rand() * 16) * (0.62 + 0.38 * Math.sin(Math.PI * t));
      var half = 4.6 + rand() * 1.8;
      var nx = Math.cos(a), ny = Math.sin(a);
      var px = -ny, py = nx;
      var notch = 0.80 + rand() * 0.08;
      d += 'M' + r2(cx + px * half) + ' ' + r2(cy + py * half) +
           'L' + r2(cx + nx * len * notch + px * half * .8) + ' ' + r2(cy + ny * len * notch + py * half * .8) +
           'L' + r2(cx + nx * len) + ' ' + r2(cy + ny * len) +
           'L' + r2(cx + nx * len * notch - px * half * .8) + ' ' + r2(cy + ny * len * notch - py * half * .8) +
           'L' + r2(cx - px * half) + ' ' + r2(cy - py * half) + 'Z';
    }
    return d;
  }

  /* A fern frond: a rachis with paired pinnae that shorten toward the
     tip and droop further from the base. */
  function fernFrond(seed) {
    var rand = rng(seed);
    var pairs = 13 + Math.floor(rand() * 4);
    var bx = 60, by = 276, tipY = 16;
    var d = '';
    for (var i = 0; i < pairs; i++) {
      var t = (i + 1) / (pairs + 1);
      var y = by + (tipY - by) * t;
      /* Widest a third of the way up, not at the base. */
      var env = Math.sin(Math.pow(t, .72) * Math.PI);
      var len = (34 + rand() * 9) * env;
      var droop = 10 + 16 * t;
      for (var s = -1; s <= 1; s += 2) {
        var ex = bx + s * len, ey = y + droop * .55;
        d += 'M' + r2(bx) + ' ' + r2(y) +
             'Q' + r2(bx + s * len * .58) + ' ' + r2(y - 5) + ' ' + r2(ex) + ' ' + r2(ey) +
             'Q' + r2(bx + s * len * .5) + ' ' + r2(y + 7) + ' ' + r2(bx) + ' ' + r2(y + 8) + 'Z';
      }
    }
    d += 'M' + (bx - 2.6) + ' ' + by + 'L' + (bx - 1.2) + ' ' + tipY +
         'L' + (bx + 1.2) + ' ' + tipY + 'L' + (bx + 2.6) + ' ' + by + 'Z';
    return d;
  }

  /* ═══ DEFS ════════════════════════════════════════════════════════ */

  function defs() {
    /* Four lamina gradients, all nearly black. They differ by how much
       light is getting round the edge, not by hue — which is what
       distance actually does to a backlit leaf. */
    function lam(id, a, b, c) {
      return '<linearGradient id="' + id + '" x1="0" y1="1" x2=".3" y2="0">' +
             '<stop offset="0" stop-color="' + a + '"/>' +
             '<stop offset=".56" stop-color="' + b + '"/>' +
             '<stop offset="1" stop-color="' + c + '"/></linearGradient>';
    }
    return '<defs>' +
      lam('jg-lit',   '#01100D', '#04201A', '#0A4034') +
      lam('jg-mid',   '#010B0A', '#031A17', '#07332B') +
      lam('jg-shade', '#010807', '#021312', '#05241F') +
      lam('jg-deep',  '#000504', '#010C0B', '#031714') +
      /* Light coming THROUGH the blade, pooling where it is thinnest. */
      '<radialGradient id="jg-thru" cx=".5" cy=".78" r=".8">' +
        '<stop offset="0" stop-color="#F5B12E" stop-opacity="0"/>' +
        '<stop offset=".66" stop-color="#2DD4BF" stop-opacity=".05"/>' +
        '<stop offset="1" stop-color="#7BE0C4" stop-opacity=".15"/>' +
      '</radialGradient>' +
    '</defs>';
  }

  /* One blade. Lamina, transmitted light, veins, then the rim — mint
     doing the work and a little gold under it, because the light in
     this scene is warm and a purely cool rim would float off it. */
  function blade(id, box, d, vd) {
    return '<symbol id="' + id + '" viewBox="' + box + '" overflow="visible">' +
      '<path d="' + d + '" style="fill:var(--lam,url(#jg-mid))"/>' +
      '<path d="' + d + '" fill="url(#jg-thru)"/>' +
      (vd ? '<path d="' + vd + '" fill="none" stroke="#0E5C4A" ' +
            'stroke-width="1.2" stroke-linecap="round" opacity=".26"/>' : '') +
      '<path d="' + d + '" fill="none" style="stroke:var(--rim,#8FFFE0)" ' +
        'stroke-width="1.4" stroke-linejoin="round" opacity=".22"/>' +
    '</symbol>';
  }

  function symbols() {
    return defs() +
      blade('jg-mo',  '0 0 200 230', cutBlade(spec(MO_SPEC, { seed:0x31 })), veinsFor(MO_SPEC)) +
      blade('jg-mo2', '0 0 200 230', cutBlade(spec(MO_SPEC, { seed:0x9A, cuts:6, wMax:92 })), veinsFor(MO_SPEC)) +
      blade('jg-ba',  '0 0 140 300', cutBlade(spec(BA_SPEC, { seed:0xA3 })), veinsFor(BA_SPEC)) +
      blade('jg-ba2', '0 0 140 300', cutBlade(spec(BA_SPEC, { seed:0x5C, cuts:5, wMax:54 })), veinsFor(BA_SPEC)) +
      blade('jg-fp1', '0 0 240 210', fanPalm(0x51F3), null) +
      blade('jg-fp2', '0 0 240 210', fanPalm(0x9A17), null) +
      blade('jg-fn1', '0 0 120 280', fernFrond(0x2C4B), null) +
      blade('jg-fn2', '0 0 120 280', fernFrond(0x7E09), null);
  }

  /* ═══ COMPOSITION ═════════════════════════════════════════════════
     [sym, x, y, w, rot, tone]  — hand-placed, in a 0…1000 square.
     Tone indexes the four lamina gradients: 0 lit … 3 deepest.        */

  var TONE = ['jg-lit', 'jg-mid', 'jg-shade', 'jg-deep'];
  var VEIN = ['#0B4A38', '#093B33', '#062B31', '#03201F'];

  /* Far: a silhouette. Read as mass and depth, never as individual
     leaves — it is blurred to nothing in CSS anyway. */
  var FAR_L = [
    ['jg-ba', -60, 120, 300, -18, 3], ['jg-mo', -110, 420, 420, -26, 3],
    ['jg-fp1', -90, 640, 520, -14, 3], ['jg-ba', 60, 500, 340, -8, 3],
    ['jg-fn1', 40, 180, 300, -30, 3], ['jg-mo', 120, 760, 400, 12, 3]
  ];
  var FAR_R = [
    ['jg-ba', 800, 120, 300, 18, 3], ['jg-mo', 690, 420, 420, 26, 3],
    ['jg-fp2', 570, 640, 520, 14, 3], ['jg-ba', 620, 500, 340, 8, 3],
    ['jg-fn2', 660, 180, 300, 30, 3], ['jg-mo', 500, 760, 400, -12, 3]
  ];

  /* Mid: the layer in focus, and the one that owns the seam. Blades
     lean inward so the two sides meet along the centre line. */
  var MID_L = [
    ['jg-mo', -140, 40, 430, -34, 1], ['jg-ba', -40, -40, 250, -22, 0],
    ['jg-fp1', -170, 250, 560, -22, 2], ['jg-mo', 40, 300, 380, -12, 0],
    ['jg-ba', -100, 430, 300, -30, 1], ['jg-fn1', 120, 420, 330, -18, 2],
    ['jg-mo', -190, 600, 520, -8, 1], ['jg-ba', 90, 640, 340, -14, 0],
    ['jg-fp2', -60, 800, 600, -6, 2], ['jg-fn2', 200, 780, 360, -24, 1],
    ['jg-mo', 130, 900, 420, 6, 2]
  ];
  var MID_R = [
    ['jg-mo', 710, 40, 430, 34, 1], ['jg-ba', 790, -40, 250, 22, 0],
    ['jg-fp2', 610, 250, 560, 22, 2], ['jg-mo', 580, 300, 380, 12, 0],
    ['jg-ba', 800, 430, 300, 30, 1], ['jg-fn2', 550, 420, 330, 18, 2],
    ['jg-mo', 670, 600, 520, 8, 1], ['jg-ba', 570, 640, 340, 14, 0],
    ['jg-fp1', 460, 800, 600, 6, 2], ['jg-fn1', 440, 780, 360, 24, 1],
    ['jg-mo', 450, 900, 420, -6, 2]
  ];

  /* Near: few, large, cropped by the frame. These are the ones that
     travel furthest when the canopy parts, so they carry the parallax
     on their own. Anything more than a handful and the seam clutters. */
  var NEAR_L = [
    ['jg-mo', -260, -80, 620, -40, 0], ['jg-ba', -150, 330, 420, -34, 1],
    ['jg-fp1', -300, 620, 780, -18, 1], ['jg-mo', -120, 820, 560, -4, 0]
  ];
  var NEAR_R = [
    ['jg-mo', 640, -80, 620, 40, 0], ['jg-ba', 730, 330, 420, 34, 1],
    ['jg-fp2', 520, 620, 780, 18, 1], ['jg-mo', 560, 820, 560, 4, 0]
  ];

  /* Fore: out of focus, close enough to be almost abstract. Sits in
     front of the word, which is what sells "you are inside this". */
  var FORE = [
    ['jg-mo', -220, 560, 760, -22, 3], ['jg-ba', 760, 380, 520, 26, 3],
    ['jg-fp1', 300, 880, 700, 4, 3], ['jg-mo', 600, -140, 560, 34, 3]
  ];

  function useTag(l) {
    var sym = l[0], x = l[1], y = l[2], w = l[3], rot = l[4], tone = l[5];
    /* Aspect is carried by the symbol's own viewBox, so height is
       derived rather than guessed. */
    /* Aspect comes from the symbol's own viewBox rather than being
       guessed at the call site, so a leaf can never be stretched. */
    var ratio = sym.indexOf('jg-mo') === 0 ? 230 / 200
              : sym.indexOf('jg-ba') === 0 ? 300 / 140
              : sym.indexOf('jg-fp') === 0 ? 210 / 240
              : 280 / 120;
    var h = w * ratio;
    var cx = x + w / 2, cy = y + h / 2;
    return '<use href="#' + sym + '" xlink:href="#' + sym + '" x="' + x + '" y="' + y +
      '" width="' + w + '" height="' + r2(h) + '"' +
      ' transform="rotate(' + rot + ' ' + r2(cx) + ' ' + r2(cy) + ')"' +
      ' style="--lam:url(#' + TONE[tone] + ');--vein:' + VEIN[tone] + '"/>';
  }

  /* Leaves are swayed in clusters, not one by one. Ten animated groups
     instead of forty, and a cluster moving together is closer to how a
     branch actually behaves than every leaf having its own weather. */
  /* Three nested elements per plane, and the nesting is the whole
     performance story.

       .jg-plane   transform · the parting
         .jg-sway  transform · the idle breath
           .jg-blur  filter  · static content, never re-rendered

     The first version animated sway on <g> elements INSIDE the filtered
     SVG. That invalidates the filter every frame, so a full-viewport
     blur was being recomputed at 60Hz across four planes. Measured 3.3
     fps. Moving every animation outside the filtered subtree lets the
     browser cache one texture per plane and merely transform it. */
  function plane(cls, leaves, seed, opts) {
    opts = opts || {};
    var rand = rng(seed);
    /* Alternate between the two cuts of each species. Repeating one
       stamp forty times is what makes generated foliage look
       generated, and the fix costs one line. */
    leaves = leaves.map(function (l, n) {
      if (n % 2 === 0) return l;
      var v = l.slice();
      if (v[0] === 'jg-mo') v[0] = 'jg-mo2';
      else if (v[0] === 'jg-ba') v[0] = 'jg-ba2';
      return v;
    });
    if (opts.thin) leaves = leaves.filter(function (_, n) { return n % 3 !== 2; });

    var a = (0.4 + rand() * 0.6).toFixed(2);
    var dur = (6.5 + rand() * 3.5).toFixed(1);
    var del = (rand() * 2.6).toFixed(1);
    var sy = -(2 + rand() * 4).toFixed(1);

    return '<div class="jg-plane ' + cls + '">' +
      '<div class="jg-sway" style="--a1:-' + a + 'deg;--a2:' + a + 'deg;' +
        '--sway:' + dur + 's;--swd:' + del + 's;--sy:' + sy + 'px">' +
        '<div class="jg-blur ' + (opts.depth || '') + '">' +
          '<svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" ' +
          'xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
          'aria-hidden="true" focusable="false">' +
          leaves.map(useTag).join('') +
          '</svg>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function rays() {
    var spec = [
      { l: '6%',  w: '9%',  r: '13deg', b: '16px', o: '.42' },
      { l: '24%', w: '5%',  r: '11deg', b: '7px',  o: '.72' },
      { l: '40%', w: '13%', r: '15deg', b: '22px', o: '.34' },
      { l: '58%', w: '4%',  r: '9deg',  b: '5px',  o: '.85' },
      { l: '71%', w: '10%', r: '17deg', b: '18px', o: '.5'  },
      { l: '87%', w: '6%',  r: '12deg', b: '9px',  o: '.6'  }
    ];
    return '<div class="jg-rays">' + spec.map(function (s) {
      return '<div class="jg-ray" style="left:' + s.l + ';--w:' + s.w +
             ';--r:' + s.r + ';--b:' + s.b + ';--o:' + s.o + '"></div>';
    }).join('') + '</div>';
  }

  function motes() {
    var rand = rng(0x1E5F), out = '';
    for (var i = 0; i < 16; i++) {
      /* Motes only where a shaft is. Dust in shadow is invisible, and
         scattering them evenly is the tell that they are decoration. */
      var lanes = [8, 26, 44, 60, 73, 88];
      var x = lanes[i % lanes.length] + (rand() * 8 - 4);
      out += '<i class="jg-mote" style="--x:' + r2(x) + '%;--y:' + r2(48 + rand() * 54) + '%;' +
             '--s:' + r2(1.8 + rand() * 3.2) + 'px;--d:' + r2(7 + rand() * 8, 1) + 's;' +
             '--dl:' + r2(rand() * 7, 1) + 's;--dx:' + r2(rand() * 60 - 24) + 'px;' +
             '--dy:-' + r2(150 + rand() * 190) + 'px;--o:' + r2(.4 + rand() * .5) + '"></i>';
    }
    return '<div class="jg-motes">' + out + '</div>';
  }

  /* ═══ THE GATE ════════════════════════════════════════════════════ */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function build(opts) {
    var g = doc.createElement('div');
    g.id = ID;
    g.setAttribute('role', 'presentation');
    g.setAttribute('aria-hidden', 'true');
    g.innerHTML =
      '<div class="jg-stage">' +
        '<div class="jg-air"></div>' +
        '<div class="jg-sun"></div>' +
        rays() +
        '<div class="jg-haze"></div>' +
        '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">' +
          symbols() +
        '</svg>' +
        plane('jg-L-far',  FAR_L,  0x0A11, { depth:'jg-far',  thin:true }) +
        plane('jg-R-far',  FAR_R,  0x0B22, { depth:'jg-far',  thin:true }) +
        plane('jg-L-mid',  MID_L,  0x1C33, { depth:'jg-mid' }) +
        plane('jg-R-mid',  MID_R,  0x1D44, { depth:'jg-mid' }) +
        plane('jg-L-near', NEAR_L, 0x2E55, { depth:'jg-near' }) +
        plane('jg-R-near', NEAR_R, 0x2F66, { depth:'jg-near' }) +
        motes() +
        '<div class="jg-word">' +
          '<div class="jg-title">' + esc(opts.title || 'Tours') + '</div>' +
          '<div class="jg-sub">' + esc(opts.sub || 'Run by guides who live here') + '</div>' +
          '<div class="jg-rule"></div>' +
        '</div>' +
        plane('jg-fore', FORE, 0x3A77, { depth:'jg-foreblur', thin:true }) +
        '<div class="jg-flood"></div>' +
      '</div>' +
      '<button class="jg-skip" type="button" aria-label="Skip the intro">' +
        'Skip' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="m9 6 6 6-6 6"/></svg>' +
      '</button>';
    return g;
  }

  /* ── the run ───────────────────────────────────────────────────── */

  var live = null;

  function play(opts) {
    opts = opts || {};
    if (live) return live.promise;

    var reduce = false;
    try {
      reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {}

    /* Full sequence once per session. After that the same forest opens
       almost at once — a welcome the second time is a toll. */
    var seen = false;
    try { seen = global.sessionStorage.getItem(SS_KEY) === '1'; } catch (e) {}
    var brief = opts.brief != null ? !!opts.brief : seen;
    if (opts.force) brief = false;

    var node = opts.node || doc.getElementById(ID);
    if (!node) {
      node = build(opts);
      (doc.body || doc.documentElement).appendChild(node);
    } else if (!node.querySelector('.jg-stage')) {
      /* An inline placeholder painted by the page before this script
         arrived. Fill it in rather than stacking a second gate. */
      var built = build(opts);
      node.innerHTML = built.innerHTML;
    }
    if (brief) node.classList.add('jg-brief');

    try { doc.documentElement.classList.add('jg-lock'); } catch (e) {}

    var timers = [];
    var settled = false;
    var resolveFn;
    var promise = new Promise(function (res) { resolveFn = res; });

    function at(ms, fn) { timers.push(global.setTimeout(fn, ms)); }
    function clearAll() { for (var i = 0; i < timers.length; i++) global.clearTimeout(timers[i]); timers = []; }

    function teardown() {
      clearAll();
      try { doc.documentElement.classList.remove('jg-lock'); } catch (e) {}
      if (node && node.parentNode) node.parentNode.removeChild(node);
      doc.removeEventListener('keydown', onKey, true);
      doc.removeEventListener('visibilitychange', onHide);
      live = null;
    }

    function finish() {
      if (settled) return;
      settled = true;
      try { global.sessionStorage.setItem(SS_KEY, '1'); } catch (e) {}
      if (typeof opts.onDone === 'function') { try { opts.onDone(); } catch (e) {} }
      resolveFn();
      node.classList.add('jg-gone');
      global.setTimeout(teardown, 520);
    }

    /* Skipping should still feel like leaving the forest, not like a
       modal being dismissed — so it runs the opening, just fast. */
    function skip() {
      if (settled) return;
      clearAll();
      node.classList.add('jg-brief', 'jg-open');
      at(reduce ? 260 : 620, finish);
    }
    function onKey(e) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); skip(); } }
    function onHide() { if (doc.hidden) skip(); }

    node.addEventListener('click', skip);
    doc.addEventListener('keydown', onKey, true);
    doc.addEventListener('visibilitychange', onHide);

    /* ── timeline ──────────────────────────────────────────────────
       Named so the numbers are arguable rather than magic.           */
    var T = brief
      ? { lit: 0,  say: -1,  open: 200,  done: 1000 }
      : { lit: 40, say: 620, open: 1750, done: 3400 };
    if (reduce) T = { lit: 0, say: 0, open: 520, done: 1000 };

    at(T.lit, function () { node.classList.add('jg-lit'); });
    if (T.say >= 0) at(T.say, function () { node.classList.add('jg-say'); });
    at(T.open, function () { node.classList.add('jg-open'); });
    at(T.done, finish);

    /* Hard ceiling. Nothing above this line is allowed to be the only
       thing standing between a visitor and the page. */
    at(T.done + 2600, finish);

    live = { promise: promise, skip: skip, finish: finish };
    return promise;
  }

  global.CabanaJungleGate = {
    play: play,
    skip: function () { if (live) live.skip(); },
    /* For the dashboard hand-off: paint the forest instantly, without
       running the sequence, so the page behind can be swapped. */
    curtain: function (opts) {
      opts = opts || {};
      if (doc.getElementById(ID)) return;
      var n = build(opts);
      n.classList.add('jg-lit');
      (doc.body || doc.documentElement).appendChild(n);
      try { doc.documentElement.classList.add('jg-lock'); } catch (e) {}
    }
  };

})(typeof window !== 'undefined' ? window : this);
