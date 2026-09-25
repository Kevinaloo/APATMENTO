/* ═══════════════════════════════════════════════════════════════════
   CABANA MOTION · the feel shared by Move and Drive
   ───────────────────────────────────────────────────────────────────
   Small, dependency-free physics for the two transport pages. Nothing
   here decides what a page looks like; it decides how things move when
   a thumb touches them.

     CabanaMotion.spring(opts)          → a critically-tuned spring
     CabanaMotion.sheet(el, opts)       → a draggable bottom sheet
     CabanaMotion.swipe(el, opts)       → slide-to-confirm
     CabanaMotion.ticker(el, value, fmt)→ numbers that roll, not jump
     CabanaMotion.reveal(root)          → staggered entrances on scroll
     CabanaMotion.haptic(kind)          → a tick the hand can feel
     CabanaMotion.reduced()             → the user asked for stillness

   Rules the whole file keeps:
     · transform and opacity only; nothing that forces layout per frame
     · every gesture has a keyboard equivalent
     · prefers-reduced-motion turns springs into cuts, never into
       broken states
     · no listener is left behind: every builder returns destroy()
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.CabanaMotion) return;
  var doc = global.document;

  function reduced() {
    try { return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (e) { return false; }
  }
  var raf = global.requestAnimationFrame ? global.requestAnimationFrame.bind(global) : function (fn) { return setTimeout(function () { fn(Date.now()); }, 16); };
  var caf = global.cancelAnimationFrame ? global.cancelAnimationFrame.bind(global) : clearTimeout;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ── spring ──────────────────────────────────────────────────────
     Semi-implicit Euler at a fixed 120 Hz sub-step, so the feel does
     not change between a 60 Hz phone and a 144 Hz monitor. */
  function spring(o) {
    o = o || {};
    var k = o.stiffness || 380, c = o.damping || 34, m = o.mass || 1;
    var x = o.from || 0, v = o.velocity || 0, to = o.to || 0;
    var onUpdate = o.onUpdate || function () {}, onDone = o.onDone || function () {};
    var id = null, last = 0, stopped = false;
    if (reduced() || o.instant) { onUpdate(to); onDone(to); return { stop: function () {}, set: function () {} }; }
    function step(now) {
      if (stopped) return;
      if (!last) last = now;
      var dt = Math.min(0.064, (now - last) / 1000); last = now;
      var steps = Math.max(1, Math.round(dt * 120)), h = dt / steps;
      for (var i = 0; i < steps; i++) {
        var a = (-k * (x - to) - c * v) / m;
        v += a * h; x += v * h;
      }
      if (Math.abs(v) < (o.restVelocity || 0.02) && Math.abs(x - to) < (o.restDelta || 0.05)) {
        x = to; onUpdate(x); stopped = true; onDone(x); return;
      }
      onUpdate(x);
      id = raf(step);
    }
    id = raf(step);
    return {
      stop: function () { stopped = true; if (id) caf(id); return { x: x, v: v }; },
      set: function (t) { to = t; },
      value: function () { return x; },
      velocity: function () { return v; }
    };
  }

  /* ── haptics ─────────────────────────────────────────────────────── */
  var HAPTIC = { tick: 6, snap: 10, confirm: [12, 40, 18], warn: [20, 50, 20] };
  function haptic(kind) {
    try { if (navigator.vibrate && !reduced()) navigator.vibrate(HAPTIC[kind] || 6); } catch (e) {}
  }

  /* ── bottom sheet ────────────────────────────────────────────────
     el        the sheet; positioned by the page (fixed, bottom:0), moved
               here with translate3d only
     opts.snaps()   → array of visible heights in px, smallest first
     opts.handle    element(s) that always start a drag
     opts.scroller  the inner scroll area: a drag that starts there only
                    moves the sheet when it is scrolled to the top and the
                    finger goes down, or the sheet is not yet fully open
     opts.onSnap(i, height)   after a settle
     opts.onMove(height)      every frame (for parallax on the map)
     opts.disabled()          → true on layouts where the sheet is a panel */
  function sheet(el, opts) {
    opts = opts || {};
    var snaps = [], index = opts.start || 0, height = 0, anim = null;
    var drag = null, listeners = [], lastDragEnd = 0;
    var disabled = opts.disabled || function () { return false; };

    function maxH() { return snaps.length ? snaps[snaps.length - 1] : el.offsetHeight; }
    function measure() {
      var s = (opts.snaps ? opts.snaps() : [el.offsetHeight]) || [];
      snaps = s.map(function (n) { return Math.max(0, Math.round(n)); }).sort(function (a, b) { return a - b; });
      if (index > snaps.length - 1) index = snaps.length - 1;
    }
    function apply(h) {
      height = h;
      if (disabled()) { el.style.transform = ''; return; }
      var full = el.offsetHeight || maxH();
      var y = full - h;
      el.style.transform = 'translate3d(0,' + y.toFixed(2) + 'px,0)';
      el.style.setProperty('--sheet-h', h.toFixed(1) + 'px');
      if (opts.onMove) opts.onMove(h, snaps);
    }
    function settle(i, velocity) {
      measure();
      index = clamp(i, 0, snaps.length - 1);
      var target = snaps[index];
      if (anim) anim.stop();
      el.classList.toggle('is-full', index === snaps.length - 1);
      el.setAttribute('data-snap', String(index));
      anim = spring({ from: height, to: target, velocity: velocity || 0, stiffness: 420, damping: 38,
        onUpdate: apply,
        onDone: function () { anim = null; if (opts.onSnap) opts.onSnap(index, target); } });
    }
    function nearest(h, v) {
      /* Throw a little further in the direction of travel: a flick of
         the thumb means "open" even if it only moved 40px. */
      var projected = h + v * 0.18;
      var best = 0, bd = Infinity;
      for (var i = 0; i < snaps.length; i++) {
        var d = Math.abs(snaps[i] - projected);
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    }

    function isHandle(t) {
      var hs = opts.handle ? [].concat(opts.handle) : [];
      for (var i = 0; i < hs.length; i++) if (hs[i] && hs[i].contains(t)) return true;
      return false;
    }
    function blockedTarget(t) {
      return t && t.closest && t.closest('input,textarea,select,[contenteditable],[data-no-drag],.cm-swipe');
    }

    /* Two input paths share one drag model.
       Pointer events drive the sheet from its chrome, and from the
       content while the sheet is not fully open (the page sets
       touch-action:none there, so the browser never claims the
       gesture). Once fully open the content scrolls natively, and a
       touch listener takes over only for the one gesture native
       scrolling cannot mean: pulling down while already at the top. */
    function begin(y, x, id, handle, fromScroller) {
      drag = { id: id, y0: y, x0: x, h0: height, t: [{ y: y, at: performance.now() }],
               handle: handle, live: false, fromScroller: fromScroller };
    }
    function track(y, x, cancelable) {
      var dy = y - drag.y0, dx = x - drag.x0;
      if (!drag.live) {
        if (Math.abs(dy) < 6 || Math.abs(dx) > Math.abs(dy)) return false;
        drag.live = true;
        if (anim) { anim.stop(); anim = null; }
        el.classList.add('is-dragging');
      }
      var h = drag.h0 - dy;
      var lo = snaps[0], hi = maxH();
      /* Rubber band past either end. */
      if (h > hi) h = hi + (h - hi) * 0.22;
      if (h < lo) h = lo - (lo - h) * 0.35;
      apply(h);
      drag.t.push({ y: y, at: performance.now() });
      if (drag.t.length > 6) drag.t.shift();
      return true;
    }
    function release() {
      var d = drag; drag = null;
      el.classList.remove('is-dragging');
      if (!d || !d.live) return;
      lastDragEnd = Date.now();
      var a = d.t[0], b = d.t[d.t.length - 1];
      var dt = Math.max(16, b.at - a.at);
      var v = -(b.y - a.y) / dt * 1000;           // px/s, positive = opening
      var target = nearest(height, v);
      if (target !== index) haptic('snap');
      settle(target, v);
    }

    function down(e) {
      if (disabled() || e.button > 0 || drag) return;
      if (blockedTarget(e.target)) return;
      var handle = isHandle(e.target);
      var sc = opts.scroller;
      var inScroller = !handle && sc && sc.contains(e.target);
      if (inScroller && index === snaps.length - 1 && e.pointerType === 'touch') return; // touch path owns it
      begin(e.clientY, e.clientX, e.pointerId, handle, inScroller);
    }
    function move(e) {
      if (!drag || drag.id !== e.pointerId) return;
      if (drag.fromScroller && index === snaps.length - 1 && !drag.live) {
        var dy0 = e.clientY - drag.y0;
        if (!(opts.scroller.scrollTop <= 0 && dy0 > 0)) { if (Math.abs(dy0) > 6) drag = null; return; }
      }
      if (track(e.clientY, e.clientX)) {
        e.preventDefault();
        try { el.setPointerCapture(e.pointerId); } catch (_) {}
      }
    }
    function up(e) { if (drag && drag.id === e.pointerId) release(); }

    function tStart(e) {
      if (disabled() || drag || index !== snaps.length - 1) return;
      var t = e.touches[0];
      if (!t || blockedTarget(e.target)) return;
      begin(t.clientY, t.clientX, 'touch', false, true);
      drag.top = opts.scroller.scrollTop <= 0;
    }
    function tMove(e) {
      if (!drag || drag.id !== 'touch') return;
      var t = e.touches[0];
      if (!t) return;
      var dy = t.clientY - drag.y0;
      if (!drag.live && !(drag.top && opts.scroller.scrollTop <= 0 && dy > 0)) {
        if (Math.abs(dy) > 6) drag = null;
        return;
      }
      if (track(t.clientY, t.clientX) && e.cancelable) e.preventDefault();
    }
    function tEnd() { if (drag && drag.id === 'touch') release(); }

    function on(t, n, f, o2) { t.addEventListener(n, f, o2); listeners.push([t, n, f, o2]); }
    on(el, 'pointerdown', down, { passive: true });
    on(global, 'pointermove', move, { passive: false });
    on(global, 'pointerup', up);
    on(global, 'pointercancel', up);
    if (opts.scroller) {
      on(opts.scroller, 'touchstart', tStart, { passive: true });
      on(opts.scroller, 'touchmove', tMove, { passive: false });
      on(opts.scroller, 'touchend', tEnd);
      on(opts.scroller, 'touchcancel', tEnd);
    }

    /* Keyboard: the handle is a button that cycles the sheet. */
    [].concat(opts.handle || []).forEach(function (h) {
      if (!h) return;
      h.setAttribute('role', 'button');
      h.setAttribute('tabindex', '0');
      h.setAttribute('aria-label', h.getAttribute('aria-label') || 'Resize panel');
      on(h, 'keydown', function (e) {
        if (e.key === 'ArrowUp') { e.preventDefault(); settle(index + 1); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); settle(index - 1); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); settle(index === snaps.length - 1 ? 0 : index + 1); }
      });
      on(h, 'click', function () {
        if (drag || Date.now() - lastDragEnd < 320) return;   // the click that ends a drag is not a tap
        settle(index === snaps.length - 1 ? Math.max(0, snaps.length - 2) : index + 1);
      });
    });

    var ro = null;
    function relayout() { measure(); if (disabled()) { el.style.transform = ''; return; } apply(snaps[index] || 0); }
    if (global.ResizeObserver) { ro = new ResizeObserver(function () { if (!anim && !drag) relayout(); }); ro.observe(doc.documentElement); }
    on(global, 'orientationchange', relayout);

    measure();
    height = snaps[index] || 0;
    apply(height);
    el.setAttribute('data-snap', String(index));

    return {
      snapTo: function (i, v) { settle(i, v); },
      index: function () { return index; },
      height: function () { return height; },
      count: function () { return snaps.length; },
      refresh: function (keep) { measure(); if (keep === false) { apply(snaps[index]); } else { settle(index); } },
      destroy: function () {
        listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); });
        if (ro) ro.disconnect();
        if (anim) anim.stop();
      }
    };
  }

  /* ── slide to confirm ────────────────────────────────────────────
     <div class="cm-swipe"><span class="cm-swipe-label">Slide to request</span>
       <button class="cm-swipe-knob" type="button"></button></div>
     Enter or Space on the knob confirms, for anyone not dragging. */
  function swipe(el, opts) {
    opts = opts || {};
    var knob = el.querySelector('.cm-swipe-knob');
    var label = el.querySelector('.cm-swipe-label');
    if (!knob) return { reset: function () {}, destroy: function () {} };
    var x = 0, max = 0, drag = null, done = false, anim = null, listeners = [];
    function measure() { max = Math.max(0, el.clientWidth - knob.offsetWidth - 8); }
    function paint(v) {
      x = v;
      knob.style.transform = 'translate3d(' + v.toFixed(1) + 'px,0,0)';
      var p = max ? v / max : 0;
      el.style.setProperty('--p', p.toFixed(3));
      if (label) label.style.opacity = String(Math.max(0, 1 - p * 1.6));
    }
    function back() {
      if (anim) anim.stop();
      anim = spring({ from: x, to: 0, stiffness: 520, damping: 34, onUpdate: paint });
    }
    function confirm() {
      if (done || el.classList.contains('is-disabled')) return;
      done = true;
      measure();
      if (anim) anim.stop();
      anim = spring({ from: x, to: max, stiffness: 600, damping: 40, onUpdate: paint });
      el.classList.add('is-done');
      haptic('confirm');
      var r = opts.onConfirm && opts.onConfirm();
      if (r && typeof r.then === 'function') {
        el.classList.add('is-busy');
        r.then(function (ok) { el.classList.remove('is-busy'); if (ok === false) reset(); },
               function () { el.classList.remove('is-busy'); reset(); });
      }
    }
    function reset() { done = false; el.classList.remove('is-done', 'is-busy'); back(); }
    function down(e) {
      if (done || el.classList.contains('is-disabled')) return;
      measure();
      drag = { id: e.pointerId, x0: e.clientX - x };
      try { knob.setPointerCapture(e.pointerId); } catch (_) {}
      if (anim) anim.stop();
      el.classList.add('is-dragging');
    }
    function move(e) {
      if (!drag || e.pointerId !== drag.id) return;
      e.preventDefault();
      var v = clamp(e.clientX - drag.x0, 0, max);
      paint(v);
    }
    function up(e) {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      el.classList.remove('is-dragging');
      if (x >= max * 0.86) confirm(); else { if (x > 8) haptic('tick'); back(); }
    }
    function on(t, n, f, o2) { t.addEventListener(n, f, o2); listeners.push([t, n, f, o2]); }
    on(knob, 'pointerdown', down);
    on(knob, 'pointermove', move, { passive: false });
    on(knob, 'pointerup', up);
    on(knob, 'pointercancel', up);
    on(knob, 'keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); confirm(); } });
    /* A tap on the track nudges the knob: the gesture explains itself. */
    on(el, 'click', function (e) {
      if (done || e.target === knob || knob.contains(e.target)) return;
      measure();
      if (anim) anim.stop();
      anim = spring({ from: x, to: Math.min(max, 46), stiffness: 300, damping: 14, onUpdate: paint, onDone: back });
    });
    knob.setAttribute('aria-label', opts.ariaLabel || (label ? label.textContent + '. Press Enter to confirm.' : 'Confirm'));
    return {
      reset: reset,
      confirm: confirm,
      disable: function (v) { el.classList.toggle('is-disabled', !!v); knob.disabled = !!v; },
      destroy: function () { listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); }); }
    };
  }

  /* ── ticker ──────────────────────────────────────────────────────
     Rolls a number to its new value. The element keeps its last value
     on itself so repeated calls continue from wherever it was. */
  function ticker(el, value, fmt, ms) {
    if (!el) return;
    fmt = fmt || function (n) { return String(Math.round(n)); };
    var from = typeof el.__tick === 'number' ? el.__tick : value;
    if (el.__tickId) caf(el.__tickId);
    el.__tick = value;
    if (reduced() || from === value || !isFinite(from)) { el.textContent = fmt(value); return; }
    var dur = ms || 520, t0 = 0;
    function ease(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }
    function step(now) {
      if (!t0) t0 = now;
      var t = Math.min(1, (now - t0) / dur);
      el.textContent = fmt(from + (value - from) * ease(t));
      if (t < 1) el.__tickId = raf(step); else el.__tickId = 0;
    }
    el.__tickId = raf(step);
  }

  /* ── reveal ──────────────────────────────────────────────────────
     [data-reveal] children fade and rise into place as they enter the
     viewport, in order, 40ms apart. */
  function reveal(root) {
    root = root || doc;
    var items = [].slice.call(root.querySelectorAll('[data-reveal]:not(.is-in)'));
    if (!items.length) return;
    if (reduced() || !global.IntersectionObserver) { items.forEach(function (n) { n.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      var shown = 0;
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var n = en.target;
        n.style.transitionDelay = (shown++ * 40) + 'ms';
        n.classList.add('is-in');
        io.unobserve(n);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
    items.forEach(function (n) { io.observe(n); });
  }

  /* ── press ───────────────────────────────────────────────────────
     A ripple where the finger landed, on anything marked [data-press]. */
  function press(root) {
    (root || doc).addEventListener('pointerdown', function (e) {
      var t = e.target && e.target.closest && e.target.closest('[data-press]');
      if (!t || reduced()) return;
      var r = t.getBoundingClientRect();
      var s = doc.createElement('span');
      s.className = 'cm-ripple';
      var d = Math.max(r.width, r.height) * 1.2;
      s.style.width = s.style.height = d + 'px';
      s.style.left = (e.clientX - r.left - d / 2) + 'px';
      s.style.top = (e.clientY - r.top - d / 2) + 'px';
      t.appendChild(s);
      setTimeout(function () { s.remove(); }, 620);
    }, { passive: true });
  }

  global.CabanaMotion = {
    spring: spring, sheet: sheet, swipe: swipe, ticker: ticker,
    reveal: reveal, press: press, haptic: haptic, reduced: reduced, clamp: clamp
  };
})(typeof window !== 'undefined' ? window : this);
