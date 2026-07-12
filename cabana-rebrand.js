/* ═══════════════════════════════════════════════════════════════════
   CABANA · REBRAND ENGINE  v1
   ───────────────────────────────────────────────────────────────────
   The transition layer. Apatmento is becoming Cabana.

   Strategy — "acquired brand" transition (50/50):
     • Apatmento stays the primary, ranked, trusted name (domain/email intact)
     • Cabana is introduced everywhere as "what's next" — visible, not loud
     • One-time announcement bar tells the story, then remembers dismissal
     • A co-brand pill rides beside the Apatmento wordmark in the header
     • The footer carries the lockup + the transition line

   Design rules (inherited from the house style):
     1. Never throw. A broken rebrand element must never take down a page.
     2. No template literals in risky paths — defensive string concat.
     3. Idempotent — safe to run twice; guards against double-injection.
     4. Respect prefers-reduced-motion.
     5. Zero hard dependencies. Pure vanilla, self-contained styles.
   ─────────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  if (global.__CABANA_REBRAND__) return;
  global.__CABANA_REBRAND__ = 1;

  var doc = global.document;
  if (!doc) return;

  var LS_DISMISS = 'cabana-announce-dismissed-v1';
  var REDUCE = false;
  try { REDUCE = global.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  function safe(fn, label) {
    try { return fn(); } catch (e) { if (global.console) console.warn('[cabana:' + (label || '?') + ']', e && e.message); }
  }
  function el(tag, css, html) {
    var n = doc.createElement(tag);
    if (css) n.style.cssText = css;
    if (html != null) n.innerHTML = html;
    return n;
  }

  /* ═══ STYLES ════════════════════════════════════════════════════ */
  function injectCSS() {
    if (doc.getElementById('cabana-rebrand-css')) return;
    var s = doc.createElement('style');
    s.id = 'cabana-rebrand-css';
    s.textContent = [
      /* ── announcement bar — FIXED at top, own layer, never overlaps ── */
      '.cabana-announce{position:fixed;top:0;left:0;right:0;z-index:1300;width:100%;',
      'background:linear-gradient(100deg,#6D28FF 0%,#4F6DFF 34%,#FF6A3C 78%,#F5B12E 100%);',
      'background-size:200% 100%;color:#fff;overflow:hidden;',
      'font-family:var(--font-body,system-ui,-apple-system,sans-serif);}',
      REDUCE ? '' : '.cabana-announce{animation:cabanaShift 14s ease infinite;}',
      '@keyframes cabanaShift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}',
      '.cabana-announce-inner{max-width:1180px;margin:0 auto;padding:8px 46px 8px 18px;',
      'display:flex;align-items:center;justify-content:center;gap:8px;',
      'font-size:13px;font-weight:500;line-height:1.4;text-align:center;flex-wrap:wrap;}',
      '.cabana-announce-inner b{font-weight:700;}',
      '.cabana-announce em{font-style:normal;font-weight:700;letter-spacing:.005em;}',
      '.cabana-announce a{color:#fff;text-decoration:underline;text-underline-offset:2px;',
      'font-weight:600;white-space:nowrap;}',
      '.cabana-announce a:hover{opacity:.85;}',
      '.cabana-chip{display:inline-flex;align-items:center;gap:5px;padding:2px 9px;',
      'border-radius:100px;background:rgba(255,255,255,.18);font-size:10.5px;font-weight:700;',
      'letter-spacing:.09em;text-transform:uppercase;white-space:nowrap;}',
      '.cabana-x{position:absolute;top:50%;right:12px;transform:translateY(-50%);',
      'width:26px;height:26px;border:none;border-radius:50%;cursor:pointer;',
      'background:rgba(255,255,255,.16);color:#fff;display:flex;align-items:center;',
      'justify-content:center;transition:background .2s;padding:0;}',
      '.cabana-x:hover{background:rgba(255,255,255,.3);}',
      /* Reserve space for the fixed bar. --cabana-bar is set live by JS. */
      'body.cabana-has-bar{padding-top:var(--cabana-bar,40px);}',
      '@media(max-width:560px){.cabana-announce-inner{font-size:11.5px;padding:8px 42px 8px 14px;gap:6px;line-height:1.35;}',
      '.cabana-chip{font-size:10px;padding:2px 8px;}}',
      '@media(max-width:380px){.cabana-chip{display:none;}}',

      /* ── header co-brand pill (rides beside Apatmento wordmark) ── */
      '.cabana-becoming{display:inline-flex;align-items:center;gap:5px;margin-left:9px;',
      'padding:3px 9px 3px 7px;border-radius:100px;vertical-align:middle;',
      'background:linear-gradient(120deg,rgba(109,40,255,.12),rgba(79,109,255,.12));',
      'border:1px solid rgba(109,40,255,.22);cursor:pointer;text-decoration:none;',
      'transition:transform .2s var(--ease-out,ease),border-color .2s,background .2s;}',
      '.cabana-becoming:hover{transform:translateY(-1px);border-color:rgba(109,40,255,.4);',
      'background:linear-gradient(120deg,rgba(109,40,255,.2),rgba(79,109,255,.2));}',
      '.cabana-becoming img{height:13px;width:auto;display:block;}',
      '.cabana-becoming .lab{font-size:9.5px;font-weight:700;letter-spacing:.09em;',
      'text-transform:uppercase;color:var(--violet,#6D28FF);white-space:nowrap;}',
      '.nav.on-dark .cabana-becoming{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.2);}',
      '.nav.on-dark .cabana-becoming .lab{color:rgba(255,255,255,.85);}',
      '@media(max-width:600px){.cabana-becoming{margin-left:6px;padding:2px 7px 2px 6px;}',
      '.cabana-becoming .lab{display:none;}.cabana-becoming img{height:12px;}}',

      /* ── footer transition block ── */
      '.cabana-foot{max-width:1180px;margin:0 auto;padding:22px 26px 4px;',
      'display:flex;align-items:center;justify-content:center;gap:13px;flex-wrap:wrap;',
      'text-align:center;font-family:var(--font-body,system-ui,sans-serif);}',
      '.cabana-foot-logos{display:flex;align-items:center;gap:11px;}',
      '.cabana-foot-logos img.apa{height:19px;opacity:.55;}',
      '.cabana-foot-logos img.cab{height:21px;}',
      '.cabana-foot-arrow{color:var(--ink-faint,#8B8EAC);flex-shrink:0;}',
      '.cabana-foot-txt{font-size:12.5px;color:var(--ink-soft,#474A66);line-height:1.5;max-width:420px;}',
      '.cabana-foot-txt b{color:var(--ink,#08080F);font-weight:600;}',
      '.cabana-foot-txt a{color:var(--violet,#6D28FF);text-decoration:none;font-weight:600;}',
      '.cabana-foot-txt a:hover{text-decoration:underline;}'
    ].join('');
    doc.head.appendChild(s);
  }

  /* ═══ FIXED-HEADER OFFSET ═══════════════════════════════════════
     The bar is position:fixed at top:0. We publish its live height as
     the --cabana-bar CSS variable on <html>. body.cabana-has-bar then
     reserves that much top padding (so nothing hides under the bar),
     and every fixed/sticky header is pushed down by the same variable.
     This is deterministic — no per-element measuring races on mobile. */
  function syncBarHeight(bar) {
    safe(function () {
      var h = bar && bar.parentNode ? bar.offsetHeight : 0;
      doc.documentElement.style.setProperty('--cabana-bar', h + 'px');
    }, 'sync');
  }

  function offsetFixedHeaders(bar) {
    safe(function () {
      syncBarHeight(bar);
      var sel = '.nav, .topbar, .cnav';
      var headers = doc.querySelectorAll(sel);
      for (var i = 0; i < headers.length; i++) {
        var node = headers[i];
        var pos = global.getComputedStyle(node).position;
        if (pos === 'fixed' || pos === 'sticky') {
          node.style.top = 'var(--cabana-bar,0px)';
          node.setAttribute('data-cabana-offset', '1');
        }
      }
    }, 'offset');
  }

  function clearFixedHeaderOffset() {
    safe(function () {
      doc.body.classList.remove('cabana-has-bar');
      doc.documentElement.style.setProperty('--cabana-bar', '0px');
      var offset = doc.querySelectorAll('[data-cabana-offset="1"]');
      for (var i = 0; i < offset.length; i++) {
        offset[i].style.top = '';
        offset[i].removeAttribute('data-cabana-offset');
      }
    }, 'clear-offset');
  }

  /* ═══ ANNOUNCEMENT BAR ══════════════════════════════════════════
     Injected at the very top of <body>. Fixed-nav pages: the bar sits
     above the fold and pushes nothing (nav is fixed) — so we only show
     it on the first paint and it scrolls away naturally. We keep it in
     normal flow so it never covers content.                          */
  function mountAnnounce() {
    safe(function () {
      if (doc.getElementById('cabana-announce')) return;
      var dismissed = false;
      try { dismissed = global.localStorage.getItem(LS_DISMISS) === '1'; } catch (e) {}
      if (dismissed) return;

      var bar = el('div', '');
      bar.className = 'cabana-announce';
      bar.id = 'cabana-announce';

      var inner = el('div', '');
      inner.className = 'cabana-announce-inner';
      inner.appendChild(el('span', '', '<span class="cabana-chip">New chapter</span>'));
      inner.appendChild(el('span', '',
        '<b>Apatmento</b> is becoming <em>Cabana</em> — same zero-commission home, a fresh name. ' +
        '<a href="/cabana.html">See what\'s changing &rarr;</a>'));
      bar.appendChild(inner);

      var x = el('button', '');
      x.className = 'cabana-x';
      x.setAttribute('aria-label', 'Dismiss announcement');
      x.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
      x.addEventListener('click', function () {
        try { global.localStorage.setItem(LS_DISMISS, '1'); } catch (e) {}
        clearFixedHeaderOffset();
        bar.style.transition = 'opacity .3s,max-height .35s,padding .35s';
        bar.style.overflow = 'hidden';
        bar.style.maxHeight = bar.offsetHeight + 'px';
        requestAnimationFrame(function () {
          bar.style.maxHeight = '0px';
          bar.style.opacity = '0';
        });
        setTimeout(function () { if (bar.parentNode) bar.parentNode.removeChild(bar); }, 380);
      });
      bar.appendChild(x);

      // Insert as the very first element in body
      if (doc.body.firstChild) doc.body.insertBefore(bar, doc.body.firstChild);
      else doc.body.appendChild(bar);

      // The bar is fixed at top:0. Reserve page space + push fixed headers
      // down by the bar's live height (published as --cabana-bar). Keep it
      // in sync across load, font-swaps and resize; clear on dismiss.
      doc.body.classList.add('cabana-has-bar');
      offsetFixedHeaders(bar);
      var resync = function () { offsetFixedHeaders(bar); };
      var ro;
      try { ro = new global.ResizeObserver(resync); ro.observe(bar); } catch (e) {}
      global.addEventListener('resize', resync, { passive: true });
      global.addEventListener('load', resync, { passive: true });
      // Fonts change line-count → re-measure once webfonts settle.
      try { if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(resync); } catch (e) {}
      setTimeout(resync, 300); setTimeout(resync, 900);
    }, 'announce');
  }

  /* ═══ CABANA WORDMARK — becomes the primary header identity ═══════
     Swaps the text "Apatmento" wordmark for the real Cabana wordmark
     asset, and removes the generic SOS + "zero added fees" chips that
     cluttered the top-right of service pages. Non-destructive & guarded. */
  function swapWordmark() {
    safe(function () {
      var marks = doc.querySelectorAll('.tb-brand, .nav-brand, .tb-title');
      for (var i = 0; i < marks.length; i++) {
        var m = marks[i];
        if (m.getAttribute('data-cabana-wm') === '1') continue;
        // Only swap wordmarks that live in a real page header — never in
        // the side drawer or the footer (those keep their own treatment).
        var inHeader = m.closest && m.closest('.topbar, .nav, .tb-left, .nav-left');
        var inDrawer = m.closest && m.closest('.drawer, footer, .footer');
        if (!inHeader || inDrawer) { m.setAttribute('data-cabana-wm', '1'); continue; }
        var wrap = doc.createElement('a');
        wrap.className = 'cab-wordmark';
        wrap.href = '/cabana.html';
        wrap.setAttribute('aria-label', 'Cabana — home');
        wrap.innerHTML = '<img src="/cabana-wordmark-color.png" alt="Cabana" ' +
          'onerror="this.style.display=\'none\'"/>';
        m.setAttribute('data-cabana-wm', '1');
        m.style.display = 'none';
        if (m.parentNode) m.parentNode.insertBefore(wrap, m.nextSibling);
      }
    }, 'wordmark');
  }

  function cleanChrome() {
    safe(function () {
      // Remove the generic "Zero added fees" / "Zero commission" topbar chips
      var chips = doc.querySelectorAll('.tb-chip');
      for (var i = 0; i < chips.length; i++) {
        var t = (chips[i].textContent || '').toLowerCase();
        if (t.indexOf('zero') !== -1 || t.indexOf('fee') !== -1 || t.indexOf('commission') !== -1) {
          chips[i].parentNode && chips[i].parentNode.removeChild(chips[i]);
        }
      }
      // Remove SOS buttons from the top chrome (kept available in-drawer)
      var sos = doc.querySelectorAll('.tb-right .apa-sos, .topbar .apa-sos, .nav .apa-sos, [data-apa="sos"].apa-sos');
      for (var j = 0; j < sos.length; j++) {
        var inBar = sos[j].closest && sos[j].closest('.tb-right, .topbar, .nav, .apa-nav');
        if (inBar) sos[j].parentNode && sos[j].parentNode.removeChild(sos[j]);
      }
      // The Cabana wordmark is a complete lockup, so hide the small
      // standalone mark beside it in headers to avoid a double logo.
      var logos = doc.querySelectorAll('.tb-logo, .nav-logo');
      for (var k = 0; k < logos.length; k++) {
        var lg = logos[k];
        if (lg.getAttribute('data-cabana-logo') === '1') continue;
        var inHead = lg.closest && lg.closest('.topbar, .nav, .tb-left, .nav-left');
        var inDraw = lg.closest && lg.closest('.drawer, footer, .footer');
        if (inHead && !inDraw) {
          lg.style.display = 'none';
          lg.setAttribute('data-cabana-logo', '1');
        }
      }
    }, 'clean-chrome');
  }

  /* ═══ FOOTER TRANSITION BLOCK ═══════════════════════════════════ */
  function mountFooter() {
    safe(function () {
      var footer = doc.querySelector('footer.footer') || doc.querySelector('footer');
      if (!footer) return;
      if (footer.querySelector('.cabana-foot')) return;

      var block = el('div', '');
      block.className = 'cabana-foot';
      block.innerHTML =
        '<div class="cabana-foot-logos">' +
          '<img class="apa" src="/logo-mark.png" alt="Apatmento" onerror="this.style.display=\'none\'"/>' +
          '<svg class="cabana-foot-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' +
          '<img class="cab" src="/cabana-wordmark-color.png" alt="Cabana" onerror="this.style.display=\'none\'"/>' +
        '</div>' +
        '<div class="cabana-foot-txt"><b>Apatmento is becoming Cabana.</b> ' +
        'Same team, same zero-commission promise, the same home you trust. ' +
        'A brighter name, built to travel the world. <a href="/cabana.html">Read the story</a></div>';

      // Insert just before the copyright line if present, else at end
      var copy = footer.querySelector('.footer-copy');
      if (copy) footer.insertBefore(block, copy);
      else footer.appendChild(block);
    }, 'footer');
  }

  /* ═══ BOOT ══════════════════════════════════════════════════════ */
  function boot() {
    injectCSS();
    mountAnnounce();
    cleanChrome();
    swapWordmark();
    mountFooter();
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Re-run after late chrome injection (index/dashboard swap headers)
  global.addEventListener('load', function () {
    setTimeout(function () {
      safe(cleanChrome, 'clean-late');
      safe(swapWordmark, 'wordmark-late');
      safe(mountFooter, 'footer-late');
    }, 400);
  });

  // Public handle (for debugging / manual re-mount)
  global.CabanaRebrand = {
    remount: boot,
    resetAnnounce: function () { try { global.localStorage.removeItem(LS_DISMISS); } catch (e) {} }
  };

})(typeof window !== 'undefined' ? window : this);
