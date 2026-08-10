/* ═══════════════════════════════════════════════════════════════════
   APATMENTO · RAIL  v2. Horizontal carousels
   ───────────────────────────────────────────────────────────────────
   Native CSS scroll-snap does the heavy lifting: momentum, touch,
   accessibility and RTL come free from the browser. JS only adds
   arrows, dots and gentle autoplay on top.

   Nothing here can break layout: if JS fails, the rail degrades to a
   plain scrollable strip that still works with a finger or trackpad.

   Usage:
     <div data-rail data-autoplay="4500">
       <div data-rail-track>  … cards …  </div>
     </div>

   Autoplay pauses on hover, focus, touch, tab-blur and
   prefers-reduced-motion. It never fights the user.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  if (global.ApaRail) return;
  var doc = global.document;

  function safe(fn, l) {
    try { return fn(); } catch (e) { if (global.console) console.warn('[rail:' + (l || '?') + ']', e && e.message); }
  }

  var REDUCE = false;
  safe(function () {
    REDUCE = global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, 'rm');

  /* ═══ STYLE ══════════════════════════════════════════════════════ */
  var CSS = ''
    + '[data-rail]{position:relative;}'

    /* The scroller. overflow-x + snap = the whole carousel. */
    + '[data-rail-track]{'
    + 'display:flex;gap:18px;'
    + 'overflow-x:auto;overflow-y:hidden;'
    + 'scroll-snap-type:x mandatory;'
    + '-webkit-overflow-scrolling:touch;'
    + 'scroll-behavior:smooth;'
    + 'scrollbar-width:none;-ms-overflow-style:none;'
    /* Bleed to the viewport edge on mobile so cards peek past the fold */
    + 'padding:4px 4px 18px;margin:0 -4px;'
    + 'scroll-padding-inline:4px;}'
    + '[data-rail-track]::-webkit-scrollbar{display:none;}'
    + '@media(prefers-reduced-motion:reduce){[data-rail-track]{scroll-behavior:auto;}}'

    /* Direct children become the slides. Author needs no extra class. */
    + '[data-rail-track] > *{'
    + 'scroll-snap-align:start;flex:0 0 auto;'
    + 'width:clamp(250px,78vw,300px);'
    + 'box-sizing:border-box;}'
    + '@media(min-width:700px){[data-rail-track] > *{width:290px;}}'
    + '@media(min-width:1100px){[data-rail-track] > *{width:300px;}}'

    /* Compact variant, used by the services rail */
    + '[data-rail="compact"] [data-rail-track]{gap:12px;}'
    + '[data-rail="compact"] [data-rail-track] > *{width:118px;}'
    + '@media(min-width:700px){[data-rail="compact"] [data-rail-track] > *{width:132px;}}'

    /* Grabbing feel on desktop pointer drag */
    + '[data-rail-track].is-drag{scroll-behavior:auto;cursor:grabbing;'
    + 'scroll-snap-type:none;user-select:none;}'
    + '[data-rail-track].is-drag *{pointer-events:none;}'

    /* ── arrows: desktop only, they'd only crowd a phone ── */
    + '.apa-rail-nav{position:absolute;top:50%;z-index:5;display:none;'
    + 'width:42px;height:42px;border-radius:50%;cursor:pointer;'
    + 'align-items:center;justify-content:center;'
    + 'border:1px solid rgba(10,10,20,.08);background:rgba(255,255,255,.94);'
    + '-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);'
    + 'color:var(--ink,#0A0A14);box-shadow:0 6px 22px rgba(10,10,20,.14);'
    + 'transform:translateY(-50%);'
    + 'transition:opacity .22s,transform .22s,background .22s;}'
    + '.apa-rail-nav:hover{background:#fff;transform:translateY(-50%) scale(1.08);}'
    + '.apa-rail-nav[disabled]{opacity:0;pointer-events:none;}'
    + '.apa-rail-prev{left:-14px;}.apa-rail-next{right:-14px;}'
    /* Hover-reveal keeps the rail clean until intent is shown */
    + '@media(hover:hover) and (min-width:900px){'
    + '.apa-rail-nav{display:flex;opacity:0;}'
    + '[data-rail]:hover .apa-rail-nav:not([disabled]),'
    + '.apa-rail-nav:focus-visible{opacity:1;}}'

    /* ── dots ── */
    + '.apa-rail-dots{display:flex;justify-content:center;gap:7px;margin-top:2px;}'
    + '.apa-rail-dot{width:7px;height:7px;padding:0;border:none;border-radius:100px;cursor:pointer;'
    + 'background:rgba(10,10,20,.16);transition:width .3s cubic-bezier(.22,1,.36,1),background .3s;}'
    + '.apa-rail-dot[aria-current="true"]{width:22px;background:linear-gradient(90deg,#4361FF,#7B2FF7);}'
    + '@media(max-width:520px){.apa-rail-dots{margin-top:0;}}';

  function injectCSS() {
    if (doc.getElementById('apa-rail-css')) return;
    var s = doc.createElement('style');
    s.id = 'apa-rail-css';
    s.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(s);
  }

  var ARROW_L = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
  var ARROW_R = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';

  /* ═══ INSTANCE ═══════════════════════════════════════════════════ */
  function build(root) {
    if (!root || root.__apaRail) return null;
    var track = root.querySelector('[data-rail-track]');
    if (!track) return null;
    root.__apaRail = 1;

    var showDots = root.getAttribute('data-dots') !== 'off';
    var autoMs = parseInt(root.getAttribute('data-autoplay'), 10) || 0;

    /*. Arrows, */
    function mkNav(dir, html, label) {
      var b = doc.createElement('button');
      b.type = 'button';
      b.className = 'apa-rail-nav apa-rail-' + dir;
      b.innerHTML = html;
      b.setAttribute('aria-label', label);
      b.addEventListener('click', function () { pause(); page(dir === 'next' ? 1 : -1); });
      root.appendChild(b);
      return b;
    }
    var prev = mkNav('prev', ARROW_L, 'Previous');
    var next = mkNav('next', ARROW_R, 'Next');

    /*. Dots, */
    var dotsWrap = null;
    if (showDots) {
      dotsWrap = doc.createElement('div');
      dotsWrap.className = 'apa-rail-dots';
      root.appendChild(dotsWrap);
    }

    function slides() {
      return Array.prototype.filter.call(track.children, function (n) {
        return n.nodeType === 1;
      });
    }

    /* Step = width of one slide incl. gap. Measured, never guessed. */
    function step() {
      var s = slides();
      if (s.length < 1) return track.clientWidth || 1;
      if (s.length < 2) return s[0].offsetWidth;
      var d = s[1].offsetLeft - s[0].offsetLeft;
      return d > 0 ? d : s[0].offsetWidth;
    }

    /* How many slides fit, so a "page" advances by a full viewport. */
    function perView() {
      return Math.max(1, Math.round(track.clientWidth / step()));
    }

    function index() {
      return Math.round(track.scrollLeft / step());
    }

    function maxIndex() {
      return Math.max(0, slides().length - perView());
    }

    function goTo(i, smooth) {
      var m = maxIndex();
      i = Math.max(0, Math.min(i, m));
      safe(function () {
        track.scrollTo({
          left: i * step(),
          behavior: (smooth === false || REDUCE) ? 'auto' : 'smooth'
        });
      }, 'goTo');
    }

    function page(dir) {
      var m = maxIndex();
      var i = index() + dir * perView();
      // Wrap around. A carousel that dead-ends feels broken.
      if (i > m) i = 0;
      if (i < 0) i = m;
      goTo(i);
    }

    /*. Sync arrows + dots to scroll position, */
    var raf = 0;
    function sync() {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        safe(function () {
          var m = maxIndex();
          var i = index();
          var scrollable = m > 0;

          prev.disabled = !scrollable;
          next.disabled = !scrollable;

          if (!dotsWrap) return;
          var want = scrollable ? m + 1 : 0;
          if (dotsWrap.childElementCount !== want) {
            dotsWrap.innerHTML = '';
            for (var d = 0; d < want; d++) {
              (function (n) {
                var b = doc.createElement('button');
                b.type = 'button';
                b.className = 'apa-rail-dot';
                b.setAttribute('aria-label', 'Go to slide ' + (n + 1));
                b.addEventListener('click', function () { pause(); goTo(n); });
                dotsWrap.appendChild(b);
              })(d);
            }
          }
          Array.prototype.forEach.call(dotsWrap.children, function (b, n) {
            b.setAttribute('aria-current', n === i ? 'true' : 'false');
          });
        }, 'sync');
      });
    }

    track.addEventListener('scroll', sync, { passive: true });
    global.addEventListener('resize', sync);

    /* Re-sync when cards are injected async (loadStays etc). */
    safe(function () {
      new MutationObserver(sync).observe(track, { childList: true });
    }, 'mo');

    /* ── autoplay ───────────────────────────────────────────────── */
    var timer = 0, paused = false;
    function tick() { if (!paused && !doc.hidden) page(1); }
    function play() {
      if (!autoMs || REDUCE || timer) return;
      timer = setInterval(tick, autoMs);
    }
    function stop() { if (timer) { clearInterval(timer); timer = 0; } }
    function pause() {
      // A user interaction wins. Resume only after they've settled.
      paused = true; stop();
      clearTimeout(pause._t);
      pause._t = setTimeout(function () { paused = false; play(); }, 6000);
    }

    if (autoMs && !REDUCE) {
      ['mouseenter', 'focusin', 'touchstart', 'pointerdown'].forEach(function (ev) {
        root.addEventListener(ev, function () { paused = true; stop(); }, { passive: true });
      });
      ['mouseleave', 'focusout'].forEach(function (ev) {
        root.addEventListener(ev, function () { paused = false; play(); });
      });
      doc.addEventListener('visibilitychange', function () {
        if (doc.hidden) stop(); else play();
      });
      // Only spend cycles while the rail is actually on screen.
      safe(function () {
        new IntersectionObserver(function (en) {
          en.forEach(function (e) { e.isIntersecting ? play() : stop(); });
        }, { threshold: .15 }).observe(root);
      }, 'io') || play();
    }

    /* ── pointer drag (desktop) ─────────────────────────────────── */
    var down = false, sx = 0, sl = 0, moved = 0;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return;   // native touch is better
      if (e.button !== 0) return;
      down = true; moved = 0;
      sx = e.clientX; sl = track.scrollLeft;
      track.classList.add('is-drag');
    });
    track.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - sx;
      moved = Math.max(moved, Math.abs(dx));
      track.scrollLeft = sl - dx;
    });
    function release() {
      if (!down) return;
      down = false;
      track.classList.remove('is-drag');
      if (moved > 6) { pause(); goTo(index()); }   // re-snap
    }
    track.addEventListener('pointerup', release);
    track.addEventListener('pointercancel', release);
    track.addEventListener('pointerleave', release);
    // Swallow the click that ends a drag, so we don't open a card.
    track.addEventListener('click', function (e) {
      if (moved > 6) { e.stopPropagation(); e.preventDefault(); moved = 0; }
    }, true);

    /* ── keyboard ───────────────────────────────────────────────── */
    track.setAttribute('tabindex', '0');
    track.setAttribute('role', 'region');
    if (!track.getAttribute('aria-label')) track.setAttribute('aria-label', 'Carousel');
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); pause(); page(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); pause(); page(-1); }
    });

    sync();
    return { sync: sync, goTo: goTo, page: page, stop: stop, play: play };
  }

  /* ═══ BOOT ═══════════════════════════════════════════════════════ */
  var rails = [];
  function scan() {
    injectCSS();
    safe(function () {
      Array.prototype.forEach.call(doc.querySelectorAll('[data-rail]'), function (r) {
        var inst = build(r);
        if (inst) rails.push(inst);
      });
    }, 'scan');
  }

  function refresh() { rails.forEach(function (r) { safe(r.sync, 'refresh'); }); }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', scan);
  else scan();

  // bfcache restore: geometry can be stale.
  global.addEventListener('pageshow', function (e) { if (e.persisted) refresh(); });

  global.ApaRail = { scan: scan, refresh: refresh };

})(window);
