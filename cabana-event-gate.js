/* ═══════════════════════════════════════════════════════════════════
   CABANA · THE DROP — engine
   ───────────────────────────────────────────────────────────────────
   Builds the room, runs the track, and gets out through the drop.

   On structure
   ────────────
   Four phases, and they are the four parts of a track rather than
   four arbitrary stages of an animation:

     intro   2 beats   one line of light, one kick
     build   4 beats   the rig wakes and the room tightens
     hold    1 beat    nothing at all
     drop    ...       everything at once

   The hold is the reason any of this works. A drop is not loud
   because of what happens at the drop, it is loud because of the
   silence immediately before it, and one beat of an empty screen is
   the cheapest and most effective thing in this entire file.

   Every duration lives in beats. BEAT below is the only number with a
   unit, and CSS reads the same value through --beat, so the script and
   the stylesheet cannot drift apart into two slightly different
   tempos.

   On the crowd
   ────────────
   Generated as one path: a baseline, a run of heads, and some raised
   arms. At silhouette scale that is all a crowd is — trying to draw
   people properly would be the same mistake as trying to draw a
   photoreal leaf in vector, and it would cost far more to get wrong.
   Two planes, the back one smaller and dimmer and a half-beat behind,
   because a crowd with no depth reads as a fence.

   On not hurting anyone
   ─────────────────────
   There is no strobe. A club strobe runs well past three flashes per
   second, which is the WCAG 2.3.1 threshold for photosensitive
   seizure risk. The beat is carried by soft blooms — 2.08Hz in the
   intro, 4.16Hz through the build, both low-contrast rather than
   full-frame luminance swings — and there is exactly one hard flash,
   on the drop. Under prefers-reduced-motion the flash does not exist
   at all and nothing moves.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var doc = global.document;
  if (!doc) return;
  if (global.CabanaEventGate) return;

  var ID = 'event-gate';
  var SS_KEY = 'cbn-event-gate-seen';

  /* 125 BPM. Fast enough to feel like a room, slow enough that the
     bloom on each beat is nowhere near a flicker rate. */
  var BEAT = 480;

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function r1(n) { return Math.round(n * 10) / 10; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var COLOURS = ['#8B5CFF', '#22D3EE', '#FF2E93', '#C6FF4D', '#FFD84D'];

  /* ═══ THE RIG ═════════════════════════════════════════════════════
     Six fixtures on a truss. Positions and rest angles are hand-set
     rather than random: they have to point inward and cross near the
     middle of the room, which is what makes a rig look aimed instead
     of scattered. --a is where a beam sits through the build, --a2 is
     where it snaps to on the drop.                                 */

  var RIG = [
    { x: 6,  a: 30,  a2: 46,  w: 210, sw: 8,  sw2: 24, c: 0, o: .34 },
    { x: 27, a: 15,  a2: 26,  w: 320, sw: 11, sw2: 30, c: 1, o: .26 },
    { x: 43, a: 5,   a2: -12, w: 150, sw: 7,  sw2: 21, c: 3, o: .42 },
    { x: 57, a: -5,  a2: 12,  w: 150, sw: 7,  sw2: 21, c: 4, o: .42 },
    { x: 73, a: -15, a2: -26, w: 320, sw: 11, sw2: 30, c: 2, o: .26 },
    { x: 94, a: -30, a2: -46, w: 210, sw: 8,  sw2: 24, c: 0, o: .34 }
  ];

  function rig() {
    var beams = '', lenses = '';
    for (var i = 0; i < RIG.length; i++) {
      var b = RIG[i];
      /* Fixtures come up in pairs from the outside in, a half-beat
         apart, so the rig reads as being switched on rather than
         appearing. */
      var stagger = Math.min(i, RIG.length - 1 - i) * (BEAT / 2);
      var vars = '--x:' + b.x + '%;--w:' + b.w + 'px;--a:' + b.a + 'deg;--a2:' + b.a2 +
                 'deg;--sw:' + b.sw + 'deg;--sw2:' + b.sw2 + 'deg;--o:' + b.o +
                 ';--c:' + COLOURS[b.c] + ';--in:' + stagger + 'ms';
      beams  += '<i class="eg-beam" style="' + vars + '">' +
                  '<i class="eg-beam-c" style="--c:' + COLOURS[b.c] + '"></i></i>';
      lenses += '<i class="eg-lens" style="' + vars + '"></i>';
    }
    return beams + lenses;
  }

  /* ═══ THE CROWD ═══════════════════════════════════════════════════
     Elements, not one stretched path.

     The first pass drew this as a single SVG with
     preserveAspectRatio="none", which squeezed a 1000x210 viewBox
     into a 390x439 box and turned every head into a spike. A crowd is
     a repeating arrangement of upright things, which is what the box
     model is already good at — the same reason the stays facade is
     divs — and it now holds its proportions at every viewport.

     Everything is sized in px against a plane of known height, so a
     head stays a head whether the phone is 360 wide or 430.        */

  function crowd(o) {
    var out = '', hands = '', x = -3;

    while (x < 103) {
      var scale = rnd(o.min, o.max);            /* how near this one is */
      var bw = Math.round(o.body * scale);
      var bh = Math.round(o.tall * scale);
      var hd = Math.round(o.head * scale);

      out += '<i class="eg-p" style="left:' + r1(x) + '%;--w:' + bw + 'px;--h:' +
             bh + 'px;--hd:' + hd + 'px"></i>';

      /* An arm already up, on some of them. These are the difference
         between a crowd and a hedge. */
      if (Math.random() < o.armRate) {
        var side = Math.random() < 0.5 ? -1 : 1;
        out += '<i class="eg-a" style="left:' + r1(x + side * (bw * 0.032)) +
               '%;--from:' + Math.round(bh * 0.72) + 'px;--ah:' +
               Math.round(bh * rnd(0.5, 0.78)) + 'px;--aw:' +
               Math.max(5, Math.round(bw * 0.2)) + 'px;--r:' +
               Math.round(side * rnd(6, 26)) + 'deg"></i>';
      }

      /* And a second set that only comes up on the drop. */
      if (Math.random() < o.dropRate) {
        var s2 = Math.random() < 0.5 ? -1 : 1;
        hands += '<i class="eg-a" style="left:' + r1(x + s2 * (bw * 0.03)) +
                 '%;--from:' + Math.round(bh * 0.74) + 'px;--ah:' +
                 Math.round(bh * rnd(0.72, 1.05)) + 'px;--aw:' +
                 Math.max(5, Math.round(bw * 0.19)) + 'px;--r:' +
                 Math.round(s2 * rnd(2, 18)) + 'deg"></i>';
      }

      x += (bw / o.plane) * 100 * rnd(0.62, 0.95);
    }
    return out + '<i class="eg-hands">' + hands + '</i>';
  }

  function confetti() {
    var out = '';
    for (var i = 0; i < 26; i++) {
      out += '<i class="eg-bit" style="' +
        '--x:' + r1(rnd(4, 96)) + '%;--y:' + r1(rnd(24, 52)) + '%;' +
        '--s:' + r1(rnd(7, 14)) + 'px;' +
        '--c:' + COLOURS[i % COLOURS.length] + ';' +
        '--dx:' + r1(rnd(-120, 120)) + 'px;--dy:' + r1(rnd(46, 88)) + 'vh;' +
        '--r:' + Math.round(rnd(360, 1080)) + 'deg;' +
        '--fall:' + r1(rnd(1.6, 2.8)) + 's;' +
        '--bd:' + Math.round(rnd(0, 260)) + 'ms"></i>';
    }
    return out;
  }

  function build(opts) {
    var g = doc.createElement('div');
    g.id = ID;
    g.setAttribute('role', 'presentation');
    g.setAttribute('aria-hidden', 'true');
    g.style.setProperty('--beat', BEAT + 'ms');

    /* plane is the assumed width the percentages are laid out against;
       it only sets how tightly packed the crowd reads. */
    var front = crowd({ plane: 420, body: 30, tall: 96, head: 21,
                        min: .82, max: 1.18, armRate: .26, dropRate: .5 });
    var back  = crowd({ plane: 420, body: 20, tall: 62, head: 14,
                        min: .8,  max: 1.1,  armRate: .16, dropRate: .34 });

    g.innerHTML =
      '<div class="eg-stage">' +
        '<div class="eg-air"></div>' +
        '<div class="eg-fog"></div>' +
        '<div class="eg-rig">' + rig() + '</div>' +
        '<div class="eg-floor"></div>' +
        '<div class="eg-kick"></div>' +
        '<div class="eg-crowd eg-crowd-back eg-bob">' + back + '</div>' +
        '<div class="eg-crowd eg-bob">' + front + '</div>' +
        '<div class="eg-wash"></div>' +
        '<div class="eg-confetti">' + confetti() + '</div>' +
        '<div class="eg-word">' +
          '<div class="eg-line">' + esc(opts.title || 'Be there') + ' <b>live</b></div>' +
          '<div class="eg-sub">' + esc(opts.sub || 'Events & Tickets') + '</div>' +
        '</div>' +
        '<div class="eg-flash"></div>' +
      '</div>' +
      '<button class="eg-skip" type="button" aria-label="Skip the intro">Skip' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="m9 6 6 6-6 6"/></svg>' +
      '</button>';
    return g;
  }

  /* ═══ THE RUN ═════════════════════════════════════════════════════ */

  var live = null;

  function play(opts) {
    opts = opts || {};
    if (live) return live.promise;

    var reduce = false;
    try {
      reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {}

    var seen = false;
    try { seen = global.sessionStorage.getItem(SS_KEY) === '1'; } catch (e) {}
    var brief = opts.brief != null ? !!opts.brief : seen;
    if (opts.force) brief = false;

    var node = opts.node || doc.getElementById(ID);
    if (!node) {
      node = build(opts);
      (doc.body || doc.documentElement).appendChild(node);
    } else if (!node.querySelector('.eg-stage')) {
      /* A placeholder the page painted before this script arrived.
         Fill it rather than stacking a second gate on top of it. */
      var built = build(opts);
      node.innerHTML = built.innerHTML;
      node.style.setProperty('--beat', BEAT + 'ms');
    }
    if (brief) node.classList.add('eg-brief');

    try { doc.documentElement.classList.add('eg-lock'); } catch (e) {}

    var timers = [], settled = false, resolveFn;
    var promise = new Promise(function (res) { resolveFn = res; });
    function at(ms, fn) { timers.push(global.setTimeout(fn, ms)); }
    function clearAll() { for (var i = 0; i < timers.length; i++) global.clearTimeout(timers[i]); timers = []; }

    function teardown() {
      clearAll();
      try { doc.documentElement.classList.remove('eg-lock'); } catch (e) {}
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
      node.classList.add('eg-out');
      global.setTimeout(teardown, BEAT * 2 + 60);
    }
    /* Skipping still goes through the drop. Cutting straight to the
       page would make the build feel like something taken away. */
    function skip() {
      if (settled) return;
      clearAll();
      node.classList.remove('eg-in', 'eg-build', 'eg-hold');
      node.classList.add('eg-drop');
      at(reduce ? 200 : BEAT, finish);
    }
    function onKey(e) {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); skip(); }
    }
    function onHide() { if (doc.hidden) skip(); }

    node.addEventListener('click', skip);
    doc.addEventListener('keydown', onKey, true);
    doc.addEventListener('visibilitychange', onHide);

    /* In beats, because the track is in beats.

         intro  2   build  4   hold  1   drop  4
       = 11 beats at 125BPM = 5.28s, which lands with flights, tours
       and stays: four arrivals, one pace. */
    var seq = brief
      ? { intro: 0, build: 0,       hold: 0,          drop: 0.5, done: 3 }
      : { intro: 0, build: 2,       hold: 6,          drop: 7,   done: 11 };
    if (reduce) seq = { intro: 0, build: 0, hold: 0, drop: 0.4, done: 2.4 };

    var B = function (beats) { return Math.round(beats * BEAT); };

    at(B(seq.intro), function () { node.classList.add('eg-in'); });
    if (seq.build) at(B(seq.build), function () { node.classList.add('eg-build'); });
    if (seq.hold)  at(B(seq.hold),  function () {
      node.classList.add('eg-hold');
      node.classList.remove('eg-build');
    });
    at(B(seq.drop), function () {
      node.classList.remove('eg-hold', 'eg-build', 'eg-in');
      node.classList.add('eg-drop');
    });
    at(B(seq.done), finish);
    /* Hard ceiling. Nothing above is allowed to be the only thing
       standing between a guest and the page. */
    at(B(seq.done) + 3000, finish);

    live = { promise: promise, skip: skip, finish: finish };
    return promise;
  }

  global.CabanaEventGate = {
    play: play,
    beat: BEAT,
    skip: function () { if (live) live.skip(); },
    curtain: function (o) {
      o = o || {};
      if (doc.getElementById(ID)) return;
      var n = build(o);
      (doc.body || doc.documentElement).appendChild(n);
      try { doc.documentElement.classList.add('eg-lock'); } catch (e) {}
    }
  };

})(typeof window !== 'undefined' ? window : this);
