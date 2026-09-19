/* ═══════════════════════════════════════════════════════════════════════════
   CABANA · PROGRAMME RUNTIME
   The engine the three programme pages share.
   ───────────────────────────────────────────────────────────────────────────
   Everything here answers to one authority: the motion state. A page can run
   half a dozen canvases, a video, a marquee and a dozen reveals, and a single
   click — or a single operating-system preference — has to stop all of it and
   leave the page fully readable. So every moving part registers itself, and
   nothing starts a frame loop of its own.

   Exposed as window.CabanaProgramme for the per-programme engines:

     motion.active()        is motion allowed right now
     motion.onChange(fn)    called whenever that answer changes
     loop(el, draw, opts)   a render loop that runs only while visible and
                            only while motion is allowed
     reveal(root)           wire .pg-reveal elements within root
     splitText(el)          per-character display reveal
     countUp(el, to, opts)  animated number that always lands exactly
     money(n) / round(n)    shared formatting
   ═══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var doc = document;
  var root = doc.documentElement;

  /* ── 1 · MOTION AUTHORITY ───────────────────────────────────────────────
     Two independent inputs: the operating system, and the page control. The
     operating system is not overridable — a visitor who has asked their
     machine for less motion has already answered this question. */
  var reduceQuery = global.matchMedia('(prefers-reduced-motion: reduce)');
  var pagePaused = false;
  try { pagePaused = sessionStorage.getItem('cabana-programme-motion') === 'paused'; } catch (e) {}

  var listeners = [];
  function motionActive() { return !pagePaused && !reduceQuery.matches; }

  function applyMotion() {
    var off = !motionActive();
    root.classList.toggle('pg-no-motion', off);
    /* Force the style recalculation now rather than at the next frame, so
       that by the time this returns the CSS animations have actually been
       torn down (or rebuilt) and anything inspecting them sees the truth. */
    void root.offsetWidth;

    if (off) {
      /* CSS animations are already gone — the stylesheet removes them under
         both .pg-no-motion and the reduced-motion query. What is left are
         script-driven Web Animations, which no stylesheet can reach. */
      if (doc.getAnimations) {
        doc.getAnimations().forEach(function (animation) {
          var target = animation.effect && animation.effect.target;
          if (target && target.closest && target.closest('.programme-page')) animation.cancel();
        });
      }
      doc.querySelectorAll('[data-tilt]').forEach(function (el) { el.style.transform = ''; });
      doc.querySelectorAll('video[data-ambient]').forEach(function (v) { try { v.pause(); } catch (e) {} });
    } else {
      doc.querySelectorAll('video[data-ambient]').forEach(function (v) {
        if (v.dataset.ready === '1') { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      });
    }

    doc.querySelectorAll('[data-motion-toggle]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(pagePaused));
      var label = button.querySelector('[data-motion-label]') || button;
      label.textContent = pagePaused ? 'Enable motion' : 'Pause motion';
    });

    listeners.forEach(function (fn) { try { fn(motionActive()); } catch (e) {} });
  }

  function toggleMotion() {
    pagePaused = !pagePaused;
    try { sessionStorage.setItem('cabana-programme-motion', pagePaused ? 'paused' : 'enabled'); } catch (e) {}
    applyMotion();
  }

  /* A dock is provided for pages that do not ship one, so the control is
     never more than one screen away. */
  function ensureDock() {
    if (doc.querySelector('.pg-motion-dock')) return;
    var control = doc.createElement('button');
    control.type = 'button';
    control.className = 'pg-motion-dock';
    control.setAttribute('data-motion-toggle', '');
    control.textContent = 'Pause motion';
    doc.body.appendChild(control);
  }

  /* ── 2 · FRAME LOOPS ────────────────────────────────────────────────────
     One requestAnimationFrame for the whole page. Loops whose element has
     scrolled away stop costing anything; loops draw one static frame when
     motion is switched off so a paused canvas is still a finished picture. */
  var loops = [];
  var ticking = false;
  var lastTime = 0;

  function frame(now) {
    ticking = false;
    var delta = Math.min(64, now - (lastTime || now));
    lastTime = now;
    var running = false;
    for (var i = 0; i < loops.length; i++) {
      var entry = loops[i];
      if (!entry.visible || !motionActive()) continue;
      entry.time += delta;
      try { entry.draw(entry.time / 1000, delta / 1000, false); } catch (e) { entry.visible = false; }
      running = true;
    }
    if (running) schedule();
  }

  function schedule() {
    if (ticking) return;
    ticking = true;
    global.requestAnimationFrame(frame);
  }

  function loop(el, draw, options) {
    options = options || {};
    var entry = { el: el, draw: draw, visible: false, time: options.start || 0 };
    loops.push(entry);

    function still() { try { draw(entry.time / 1000, 0, true); } catch (e) {} }

    if (global.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (record) {
          entry.visible = record.isIntersecting;
          if (entry.visible) { lastTime = 0; schedule(); still(); }
        });
      }, { rootMargin: '140px' }).observe(el);
    } else {
      entry.visible = true;
      schedule();
    }
    still();
    onMotionChange(function (active) { if (active) { lastTime = 0; schedule(); } else still(); });
    return { stop: function () { entry.visible = false; }, redraw: still };
  }

  function onMotionChange(fn) { listeners.push(fn); return fn; }

  /* ── 3 · REVEALS ────────────────────────────────────────────────────────
     Geometry, not notifications. An IntersectionObserver can miss an element
     that enters and leaves the viewport inside a single frame — which is
     exactly what a fast flick on a phone does — and a missed notification
     here means a heading that stays invisible forever. So the rule is a
     plain one, evaluated against the current scroll position: anything whose
     top edge has come up past the fold is revealed, and anything already
     scrolled past certainly is. The pending list drains to nothing, after
     which this costs one length check per frame.

     A container marked data-stagger cascades its children, so a grid of six
     cards needs one attribute rather than six inline delays. */
  var pending = [];
  var sweepQueued = false;

  function sweep() {
    sweepQueued = false;
    if (!pending.length) return;
    var fold = global.innerHeight * 0.94;
    var rest = [];
    for (var i = 0; i < pending.length; i++) {
      var node = pending[i];
      if (!node.isConnected) continue;
      if (node.getBoundingClientRect().top < fold) node.classList.add('is-visible');
      else rest.push(node);
    }
    pending = rest;
  }

  function queueSweep() {
    if (sweepQueued || !pending.length) return;
    sweepQueued = true;
    global.requestAnimationFrame(sweep);
  }

  function reveal(scope) {
    var nodes = (scope || doc).querySelectorAll('.pg-reveal:not(.is-visible)');
    for (var i = 0; i < nodes.length; i++) {
      if (pending.indexOf(nodes[i]) === -1) pending.push(nodes[i]);
    }
    sweep();
  }

  function applyStagger(scope) {
    (scope || doc).querySelectorAll('[data-stagger]').forEach(function (group) {
      var step = parseInt(group.getAttribute('data-stagger'), 10) || 90;
      var children = group.querySelectorAll(':scope > .pg-reveal');
      children.forEach(function (child, index) {
        child.style.setProperty('--pg-delay', (index * step) + 'ms');
      });
    });
  }

  /* ── 4 · SPLIT TEXT ─────────────────────────────────────────────────────
     Wraps characters for the display reveal while keeping the original
     string in the accessibility tree: the wrapper is aria-hidden and the
     untouched text is restored as a visually hidden sibling. */
  function splitText(el) {
    if (!el || el.dataset.split === 'done') return;
    var source = el.textContent;
    var holder = doc.createElement('span');
    holder.className = 'pg-split';
    holder.setAttribute('aria-hidden', 'true');
    var index = 0;

    function character(text, extra) {
      var span = doc.createElement('span');
      span.className = 'pg-char' + (extra || '');
      span.textContent = text;
      span.style.setProperty('--pg-char-delay', (index * 26) + 'ms');
      index++;
      return span;
    }

    /* Characters are laid out as inline-blocks, and a browser may break a
       line between any two of them. Grouping each word keeps "THING." from
       arriving as "THIN / G." on a narrow screen. */
    source.split(/(\s+)/).forEach(function (chunk) {
      if (!chunk) return;
      if (/^\s+$/.test(chunk)) { holder.appendChild(character(' ', ' pg-char-space')); return; }
      var word = doc.createElement('span');
      word.className = 'pg-word';
      chunk.split('').forEach(function (letter) { word.appendChild(character(letter)); });
      holder.appendChild(word);
    });

    var readable = doc.createElement('span');
    readable.className = 'pg-visually-hidden';
    readable.textContent = source;

    el.textContent = '';
    el.appendChild(holder);
    el.appendChild(readable);
    el.dataset.split = 'done';
  }

  /* ── 5 · NUMBERS ────────────────────────────────────────────────────────
     Eases out and lands exactly on the target. Under reduced motion the
     value simply appears, because the number is the point, not the ticking. */
  function countUp(el, to, options) {
    if (!el) return;
    options = options || {};
    var format = options.format || function (value) { return Math.round(value).toLocaleString('en-KE'); };
    var target = Number(to) || 0;
    var from = Number(options.from != null ? options.from : (el.dataset.countFrom || 0));

    if (!motionActive() || from === target) { el.textContent = format(target); return; }
    if (el._pgCount) global.cancelAnimationFrame(el._pgCount);

    var duration = options.duration || 850;
    var started = null;
    function step(now) {
      if (started === null) started = now;
      var progress = Math.min(1, (now - started) / duration);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = format(from + (target - from) * eased);
      if (progress < 1) el._pgCount = global.requestAnimationFrame(step);
      else { el.textContent = format(target); el._pgCount = null; }
    }
    el.dataset.countFrom = String(target);
    el._pgCount = global.requestAnimationFrame(step);
  }

  var kes = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 });
  function money(value) { return 'KES ' + kes.format(Math.round(Number(value) || 0)); }
  function compact(value) {
    value = Number(value) || 0;
    if (value >= 1e9) return (value / 1e9).toFixed(value >= 1e10 ? 0 : 1).replace(/\.0$/, '') + 'B';
    if (value >= 1e6) return (value / 1e6).toFixed(value >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (value >= 1e3) return (value / 1e3).toFixed(value >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K';
    return kes.format(Math.round(value));
  }

  /* ── 6 · POINTER FLOURISHES ─────────────────────────────────────────────
     Fine pointers only. On a touch screen a tilt is a layout bug, not a
     delight, because there is no hover to leave. */
  var finePointer = global.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function wireTilt() {
    if (!finePointer) return;
    doc.querySelectorAll('[data-tilt]').forEach(function (card) {
      var strength = parseFloat(card.getAttribute('data-tilt')) || 5;
      card.addEventListener('pointermove', function (event) {
        if (!motionActive()) return;
        var bounds = card.getBoundingClientRect();
        var x = (event.clientX - bounds.left) / bounds.width - .5;
        var y = (event.clientY - bounds.top) / bounds.height - .5;
        card.style.transform = 'perspective(1200px) rotateX(' + (-y * strength) +
          'deg) rotateY(' + (x * strength) + 'deg)';
        card.style.setProperty('--pg-pointer-x', (x * 100 + 50).toFixed(1) + '%');
        card.style.setProperty('--pg-pointer-y', (y * 100 + 50).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', function () { card.style.transform = ''; });
    });
  }

  function wireMagnets() {
    if (!finePointer) return;
    doc.querySelectorAll('[data-magnetic]').forEach(function (el) {
      var pull = parseFloat(el.getAttribute('data-magnetic')) || 0.28;
      el.addEventListener('pointermove', function (event) {
        if (!motionActive()) return;
        var bounds = el.getBoundingClientRect();
        var x = event.clientX - bounds.left - bounds.width / 2;
        var y = event.clientY - bounds.top - bounds.height / 2;
        el.style.transform = 'translate(' + (x * pull) + 'px,' + (y * pull) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* ── 7 · CHROME ─────────────────────────────────────────────────────────
     Scroll progress and the navigation's stuck state share one scroll
     handler, throttled to the frame. */
  function wireChrome() {
    var progress = doc.querySelector('.pg-progress');
    var nav = doc.querySelector('.pg-nav');
    if (!progress && !nav) return;
    var queued = false;
    function paint() {
      queued = false;
      var top = global.scrollY || doc.documentElement.scrollTop;
      if (progress) {
        var span = doc.documentElement.scrollHeight - global.innerHeight;
        progress.style.transform = 'scaleX(' + (span > 0 ? Math.min(1, top / span) : 0) + ')';
      }
      if (nav) nav.classList.toggle('is-stuck', top > 18);
    }
    global.addEventListener('scroll', function () {
      if (queued) return;
      queued = true;
      global.requestAnimationFrame(paint);
    }, { passive: true });
    paint();
  }

  function wireReveals() {
    global.addEventListener('scroll', queueSweep, { passive: true });
    global.addEventListener('resize', queueSweep, { passive: true });
    global.addEventListener('load', sweep);
    /* Late layout — a web font landing, an image finally decoding — moves
       things under the fold back above it. */
    if (doc.fonts && doc.fonts.ready && doc.fonts.ready.then) doc.fonts.ready.then(sweep);
  }

  /* Anchor navigation that respects the motion setting and moves focus, so
     a keyboard visitor lands inside the section they asked for. */
  function wireAnchors() {
    doc.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        var id = link.getAttribute('href').slice(1);
        if (!id) return;
        var target = doc.getElementById(id);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: motionActive() ? 'smooth' : 'auto', block: 'start' });
        history.replaceState(null, '', '#' + id);
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      });
    });
  }

  /* Ambient hero video. Deferred until the page is otherwise settled: the
     poster carries the first paint, the loop arrives afterwards, and a
     visitor who has asked for less motion never downloads it at all. */
  function wireAmbient() {
    doc.querySelectorAll('video[data-ambient]').forEach(function (video) {
      var sources = video.querySelectorAll('source[data-src]');
      if (!sources.length) return;
      function load() {
        if (!motionActive()) return;
        sources.forEach(function (source) { source.src = source.dataset.src; });
        video.load();
        video.dataset.ready = '1';
        var played = video.play();
        if (played && played.catch) played.catch(function () {});
        video.addEventListener('loadeddata', function () { video.classList.add('is-live'); }, { once: true });
      }
      if ('requestIdleCallback' in global) global.requestIdleCallback(load, { timeout: 2200 });
      else global.setTimeout(load, 900);
      onMotionChange(function (active) { if (active && video.dataset.ready !== '1') load(); });
    });
  }

  /* Marquees duplicate their own content so the -50% keyframe is seamless
     regardless of how much text the page author wrote. */
  function wireMarquees() {
    doc.querySelectorAll('.pg-marquee').forEach(function (marquee) {
      var track = marquee.querySelector('.pg-marquee-track');
      if (!track || track.dataset.cloned === '1') return;
      var clone = track.firstElementChild.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
      track.dataset.cloned = '1';
    });
  }

  /* ── 8 · BOOT ───────────────────────────────────────────────────────────
     Deferred scripts run with readyState already past 'loading', so this file
     boots the moment it is evaluated — before the per-programme engines below
     it in the document have even been parsed. They therefore cannot rely on
     catching the ready event; onReady() fires immediately for latecomers. */
  var isReady = false;
  var readyQueue = [];
  function onReady(fn) {
    if (isReady) fn();
    else readyQueue.push(fn);
  }

  function boot() {
    root.classList.add('pg-enhanced');
    ensureDock();
    doc.querySelectorAll('[data-motion-toggle]').forEach(function (button) {
      button.addEventListener('click', toggleMotion);
    });
    if (reduceQuery.addEventListener) reduceQuery.addEventListener('change', applyMotion);
    else if (reduceQuery.addListener) reduceQuery.addListener(applyMotion);

    doc.querySelectorAll('[data-split]').forEach(splitText);
    applyStagger(doc);
    wireMarquees();
    wireReveals();
    reveal(doc);
    wireTilt();
    wireMagnets();
    wireChrome();
    wireAnchors();
    wireAmbient();
    applyMotion();

    /* Range inputs paint their own filled track. */
    doc.querySelectorAll('.pg-range').forEach(function (input) {
      function paint() {
        var min = Number(input.min || 0);
        var max = Number(input.max || 100);
        var ratio = max > min ? (Number(input.value) - min) / (max - min) : 0;
        input.style.setProperty('--pg-fill', (ratio * 100).toFixed(2) + '%');
      }
      input.addEventListener('input', paint);
      paint();
    });

    isReady = true;
    readyQueue.splice(0).forEach(function (fn) { try { fn(); } catch (e) {} });
    doc.dispatchEvent(new CustomEvent('cabana:programme-ready'));
  }

  global.CabanaProgramme = {
    motion: { active: motionActive, onChange: onMotionChange, toggle: toggleMotion },
    onReady: onReady,
    loop: loop,
    reveal: reveal,
    splitText: splitText,
    countUp: countUp,
    money: money,
    compact: compact,
    finePointer: finePointer,
  };

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
