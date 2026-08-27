/* ═══════════════════════════════════════════════════════════════════
   CABANA · THE ORDER, ON SCREEN
   ───────────────────────────────────────────────────────────────────
   One drawer, every page. The basket itself lives in cabana-cart.js
   and knows nothing about pixels; this file is the only thing that
   draws it, so the order looks and behaves identically whether you
   opened it from a dish on the food page or from a menu.

   It brings its own colours rather than inheriting the page's, for
   one reason: food.html and restaurant.html are two different dark
   rooms with two different palettes, and an order that changes
   colour when you walk between them reads as two different orders.

   Anything on a page can become a basket button:
     <button data-cart-open>…<span data-cart-count></span></button>
   The count paints itself and hides at zero. Nothing to wire up.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  if (global.CabanaCartUI) return;
  var doc = global.document;
  if (!doc) return;

  function safe(fn, l) {
    try { return fn(); } catch (e) { if (global.console) console.warn('[cart-ui:' + (l || '?') + ']', e && e.message); }
  }

  function ready(fn) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  var Cart = global.CabanaCart;
  if (!Cart) { if (global.console) console.warn('[cart-ui] cabana-cart.js must load first'); return; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function attr(s) { return esc(s).replace(/\n/g, ' '); }

  var CHECKOUT = '/checkout';

  /* ═══════════════════════════════════════════════════════════════
     MARKS. Drawn on one 24 unit grid, hairline, round joins, so the
     drawer never borrows three different vendors' emoji.
     ═══════════════════════════════════════════════════════════════ */
  var M = {
    bag: '<path d="M4.6 7.8h14.8l-1.2 12.2a1.2 1.2 0 0 1-1.2 1H7a1.2 1.2 0 0 1-1.2-1Z"/><path d="M8.8 7.8V6a3.2 3.2 0 0 1 6.4 0v1.8"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    east: '<path d="M4.6 12h14.8M13 5.6 19.4 12 13 18.4"/>',
    bin: '<path d="M3.6 6.4h16.8M8.4 6.4V4.2h7.2v2.2M18.4 6.4l-1 13.4H6.6l-1-13.4"/><path d="M10 10.2v6M14 10.2v6"/>',
    pin: '<path d="M19.4 10.2c0 5.6-7.4 11.2-7.4 11.2S4.6 15.8 4.6 10.2a7.4 7.4 0 0 1 14.8 0Z"/><circle cx="12" cy="10" r="2.6"/>',
    clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 6.8V12l3.4 2.2"/>',
    cloche: '<path d="M3.8 15.6a8.2 8.2 0 0 1 16.4 0Z"/><path d="M1.8 18.6h20.4"/><path d="M12 7.4V5.8"/><circle cx="12" cy="4.5" r="1.3"/>',
    info: '<circle cx="12" cy="12" r="8.6"/><path d="M12 11.2v5M12 8.1h.01"/>',
    scooter: '<circle cx="5.6" cy="17.4" r="2.8"/><circle cx="18.4" cy="17.4" r="2.8"/><path d="M8.4 17.4h7.2M15.6 17.4 13 6.6h-2.6M13.4 9.4h4.2l1.6 5.4"/>',
    hand: '<path d="M7.4 11.2V5.4a1.6 1.6 0 0 1 3.2 0v5M10.6 10.4V4.2a1.6 1.6 0 0 1 3.2 0v6.2M13.8 10.8V6.4a1.6 1.6 0 0 1 3.2 0v8.2c0 3.4-2.4 6-6 6-3.2 0-4.6-1.6-6.2-4.4l-1.4-2.6a1.6 1.6 0 0 1 2.6-1.8l1.4 1.8"/>',
    chair: '<path d="M6.4 3.6h11.2v8.8H6.4Z"/><path d="M4.6 12.4h14.8M7 12.4v7.8M17 12.4v7.8"/>',
    wa: '<path d="M12 2.2a9.7 9.7 0 0 0-8.3 14.7L2.4 21.8l5-1.3A9.7 9.7 0 1 0 12 2.2Z"/><path d="M8.9 7.6c.3 0 .5.2.6.5l.7 1.7c.1.2 0 .4-.1.5l-.6.7c-.1.2-.2.4 0 .6a8 8 0 0 0 3.4 3c.2.1.4 0 .5-.1l.7-.8c.1-.2.3-.2.5-.1l1.7.8c.2.1.4.3.3.6-.2 1.1-1.2 1.8-2.3 1.8a8.6 8.6 0 0 1-7.4-7.4c0-1.1.7-2 1.8-2.2Z"/>',
    phone: '<path d="M21.6 16.8v2.9a2 2 0 0 1-2.2 2 19.6 19.6 0 0 1-8.5-3A19.3 19.3 0 0 1 5 12.6a19.6 19.6 0 0 1-3-8.6 2 2 0 0 1 2-2.2h2.9a2 2 0 0 1 2 1.7 12.6 12.6 0 0 0 .7 2.8 2 2 0 0 1-.5 2.1L8 9.5a15.8 15.8 0 0 0 6.4 6.4l1.1-1.1a2 2 0 0 1 2.1-.5 12.6 12.6 0 0 0 2.8.7 2 2 0 0 1 1.7 2Z"/>',
    check: '<path d="m5 12.6 4.4 4.4L19 7.4"/>'
  };
  function mk(k, w) {
    if (!M[k]) return '';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 1.5) +
      '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + M[k] + '</svg>';
  }

  /* ═══════════════════════════════════════════════════════════════
     STYLE
     ═══════════════════════════════════════════════════════════════ */
  var CSS = ''
    + '.cbnc-scrim{position:fixed;inset:0;z-index:9000;background:rgba(6,3,1,.72);'
    + 'backdrop-filter:blur(8px) saturate(120%);-webkit-backdrop-filter:blur(8px) saturate(120%);'
    + 'opacity:0;visibility:hidden;transition:opacity .34s ease,visibility .34s;}'
    + '.cbnc-scrim.on{opacity:1;visibility:visible;}'

    /* On a phone the order is a sheet you pull up. On a desk it is a
       drawer at the right hand, where a bill is put down. */
    + '.cbnc-panel{position:fixed;z-index:9001;display:flex;flex-direction:column;'
    + 'background:#120A05;color:#F4EADC;border:1px solid rgba(244,234,220,.14);'
    + 'font-family:"Switzer","Inter",system-ui,-apple-system,sans-serif;'
    + 'box-shadow:0 -30px 90px rgba(0,0,0,.7);'
    + 'left:0;right:0;bottom:0;max-height:92vh;border-radius:22px 22px 0 0;border-bottom:none;'
    + 'transform:translateY(102%);transition:transform .48s cubic-bezier(.22,1,.36,1);}'
    + '.cbnc-panel.on{transform:none;}'
    + '@media(min-width:760px){.cbnc-panel{left:auto;top:0;bottom:0;width:min(460px,94vw);max-height:none;'
    + 'border-radius:0;border-right:none;transform:translateX(102%);box-shadow:-30px 0 90px rgba(0,0,0,.7);}}'
    + '@media(prefers-reduced-motion:reduce){.cbnc-panel{transition-duration:.01ms;}.cbnc-scrim{transition-duration:.01ms;}}'

    /* head */
    + '.cbnc-head{display:flex;align-items:center;gap:12px;padding:18px 20px 15px;flex-shrink:0;'
    + 'border-bottom:1px solid rgba(244,234,220,.1);}'
    + '.cbnc-grip{position:absolute;top:7px;left:50%;transform:translateX(-50%);width:38px;height:4px;'
    + 'border-radius:100px;background:rgba(244,234,220,.2);}'
    + '@media(min-width:760px){.cbnc-grip{display:none;}}'
    + '.cbnc-head h2{font-family:"Zodiak","Fraunces",Georgia,serif;font-weight:500;font-size:22px;'
    + 'letter-spacing:-.03em;margin:0;flex:1;min-width:0;}'
    + '.cbnc-head .cbnc-sub{display:block;font-family:"Geist Mono",ui-monospace,monospace;font-size:9.5px;'
    + 'font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:#C99A4E;margin-bottom:6px;}'
    + '.cbnc-close{width:36px;height:36px;border-radius:10px;flex-shrink:0;display:grid;place-items:center;'
    + 'cursor:pointer;border:1px solid rgba(244,234,220,.16);background:transparent;color:rgba(244,234,220,.6);'
    + 'transition:color .25s,border-color .25s,transform .3s;}'
    + '.cbnc-close:hover{color:#F4EADC;border-color:rgba(201,154,78,.4);transform:rotate(90deg);}'
    + '.cbnc-close svg{width:15px;height:15px;}'

    /* body */
    + '.cbnc-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:4px 20px 20px;'
    + 'overscroll-behavior:contain;}'
    + '.cbnc-body::-webkit-scrollbar{width:5px;}'
    + '.cbnc-body::-webkit-scrollbar-thumb{background:rgba(244,234,220,.14);border-radius:100px;}'

    /* one kitchen */
    + '.cbnc-k{margin-top:20px;border:1px solid rgba(244,234,220,.1);border-radius:16px;overflow:hidden;'
    + 'background:rgba(244,234,220,.022);}'
    + '.cbnc-k-head{display:flex;align-items:center;gap:11px;padding:13px 14px;'
    + 'border-bottom:1px solid rgba(244,234,220,.08);}'
    + '.cbnc-k-ph{width:42px;height:42px;border-radius:10px;flex-shrink:0;object-fit:cover;'
    + 'background:#1D120A;border:1px solid rgba(244,234,220,.1);}'
    + '.cbnc-k-ph.ph{display:grid;place-items:center;color:rgba(244,234,220,.22);}'
    + '.cbnc-k-ph.ph svg{width:20px;height:20px;}'
    + '.cbnc-k-id{flex:1;min-width:0;}'
    + '.cbnc-k-n{font-family:"Zodiak","Fraunces",Georgia,serif;font-weight:500;font-size:16px;'
    + 'letter-spacing:-.025em;line-height:1.2;color:#F4EADC;text-decoration:none;display:block;'
    + 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:color .25s;}'
    + 'a.cbnc-k-n:hover{color:#E0B96F;}'
    + '.cbnc-k-w{display:flex;align-items:center;gap:5px;font-size:11.5px;color:rgba(244,234,220,.42);margin-top:3px;}'
    + '.cbnc-k-w svg{width:11px;height:11px;flex-shrink:0;}'
    + '.cbnc-k-w .shut{color:#C9764E;}'
    + '.cbnc-k-w .open{color:#7FA269;}'
    + '.cbnc-k-drop{width:30px;height:30px;border-radius:8px;flex-shrink:0;display:grid;place-items:center;'
    + 'cursor:pointer;border:1px solid transparent;background:transparent;color:rgba(244,234,220,.3);transition:.22s;}'
    + '.cbnc-k-drop:hover{color:#C9424E;border-color:rgba(201,66,78,.35);background:rgba(201,66,78,.08);}'
    + '.cbnc-k-drop svg{width:14px;height:14px;}'

    /* one line */
    + '.cbnc-l{display:flex;align-items:center;gap:11px;padding:11px 14px;'
    + 'border-bottom:1px solid rgba(244,234,220,.06);}'
    + '.cbnc-l:last-of-type{border-bottom:none;}'
    + '.cbnc-l-ph{width:44px;height:44px;border-radius:9px;flex-shrink:0;object-fit:cover;background:#1D120A;}'
    + '.cbnc-l-ph.ph{display:grid;place-items:center;color:rgba(244,234,220,.2);}'
    + '.cbnc-l-ph.ph svg{width:19px;height:19px;}'
    + '.cbnc-l-b{flex:1;min-width:0;}'
    + '.cbnc-l-n{font-size:13.5px;font-weight:600;line-height:1.3;color:#F4EADC;'
    + 'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}'
    + '.cbnc-l-u{font-family:"Geist Mono",ui-monospace,monospace;font-size:11px;'
    + 'color:rgba(244,234,220,.4);margin-top:3px;font-variant-numeric:tabular-nums;}'
    + '.cbnc-l-u s{opacity:.6;margin-right:5px;}'
    + '.cbnc-step{display:flex;align-items:center;gap:2px;flex-shrink:0;border-radius:9px;'
    + 'border:1px solid rgba(244,234,220,.14);overflow:hidden;}'
    + '.cbnc-step button{width:28px;height:30px;border:none;cursor:pointer;background:transparent;'
    + 'color:rgba(244,234,220,.72);font-size:15px;line-height:1;display:grid;place-items:center;transition:.18s;}'
    + '.cbnc-step button:hover{background:rgba(201,154,78,.14);color:#E0B96F;}'
    + '.cbnc-step b{min-width:22px;text-align:center;font-family:"Geist Mono",ui-monospace,monospace;'
    + 'font-size:12.5px;font-weight:500;font-variant-numeric:tabular-nums;}'
    + '.cbnc-l-p{width:76px;text-align:right;flex-shrink:0;font-family:"Geist Mono",ui-monospace,monospace;'
    + 'font-size:12px;font-weight:500;color:#F4EADC;font-variant-numeric:tabular-nums;}'

    /* how they want it */
    + '.cbnc-modes{display:flex;gap:6px;padding:11px 14px 0;}'
    + '.cbnc-mode{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;padding:9px 4px;'
    + 'border-radius:10px;cursor:pointer;border:1px solid rgba(244,234,220,.12);background:transparent;'
    + 'color:rgba(244,234,220,.5);font-family:inherit;font-size:10.5px;font-weight:600;transition:.22s;}'
    + '.cbnc-mode svg{width:16px;height:16px;}'
    + '.cbnc-mode:hover:not(:disabled){border-color:rgba(201,154,78,.4);color:#E0B96F;}'
    + '.cbnc-mode.on{background:rgba(222,82,25,.14);border-color:rgba(222,82,25,.45);color:#F06A2E;}'
    + '.cbnc-mode:disabled{opacity:.28;cursor:not-allowed;}'

    /* a word to the kitchen */
    + '.cbnc-note{width:100%;margin:11px 0 0;padding:10px 12px;border-radius:10px;resize:vertical;'
    + 'min-height:38px;max-height:120px;border:1px solid rgba(244,234,220,.12);background:rgba(244,234,220,.03);'
    + 'color:#F4EADC;font-family:inherit;font-size:12.5px;line-height:1.5;outline:none;transition:border-color .25s;}'
    + '.cbnc-note::placeholder{color:rgba(244,234,220,.28);}'
    + '.cbnc-note:focus{border-color:rgba(201,154,78,.45);background:rgba(244,234,220,.05);}'
    + '.cbnc-k-foot{padding:0 14px 14px;}'

    /* sums */
    + '.cbnc-sum{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:9px 14px;'
    + 'font-size:12.5px;color:rgba(244,234,220,.5);}'
    + '.cbnc-sum b{font-family:"Geist Mono",ui-monospace,monospace;font-size:13px;font-weight:500;'
    + 'color:#F4EADC;font-variant-numeric:tabular-nums;}'
    + '.cbnc-sum.big{padding-top:4px;}'
    + '.cbnc-sum.big span{color:#F4EADC;font-weight:600;font-size:13.5px;}'
    + '.cbnc-sum.big b{font-family:"Zodiak","Fraunces",Georgia,serif;font-size:19px;font-weight:600;'
    + 'letter-spacing:-.03em;color:#F06A2E;}'

    /* an honest warning, never a blocker */
    + '.cbnc-flag{display:flex;align-items:flex-start;gap:8px;margin:0 14px 12px;padding:9px 11px;'
    + 'border-radius:10px;font-size:11.5px;line-height:1.5;'
    + 'background:rgba(201,154,78,.08);border:1px solid rgba(201,154,78,.25);color:#E0B96F;}'
    + '.cbnc-flag svg{width:12px;height:12px;flex-shrink:0;margin-top:2px;}'
    + '.cbnc-flag.cold{background:rgba(201,118,78,.08);border-color:rgba(201,118,78,.28);color:#D9946E;}'

    /* foot */
    + '.cbnc-foot{flex-shrink:0;padding:14px 20px calc(16px + env(safe-area-inset-bottom));'
    + 'border-top:1px solid rgba(244,234,220,.1);background:rgba(10,5,2,.7);'
    + 'backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);}'
    + '.cbnc-tot{display:flex;align-items:baseline;justify-content:space-between;gap:14px;margin-bottom:12px;}'
    + '.cbnc-tot-l{font-family:"Geist Mono",ui-monospace,monospace;font-size:9.5px;font-weight:500;'
    + 'letter-spacing:.18em;text-transform:uppercase;color:rgba(244,234,220,.42);}'
    + '.cbnc-tot-l small{display:block;margin-top:4px;letter-spacing:.04em;text-transform:none;font-size:10.5px;}'
    + '.cbnc-tot-v{font-family:"Zodiak","Fraunces",Georgia,serif;font-weight:600;font-size:26px;'
    + 'letter-spacing:-.035em;color:#F4EADC;font-variant-numeric:tabular-nums;}'
    + '.cbnc-go{width:100%;display:inline-flex;align-items:center;justify-content:center;gap:9px;'
    + 'padding:15px 20px;border-radius:12px;border:none;cursor:pointer;text-decoration:none;'
    + 'background:#DE5219;color:#170A03;font-family:"Geist Mono",ui-monospace,monospace;font-size:11px;'
    + 'font-weight:600;letter-spacing:.16em;text-transform:uppercase;'
    + 'box-shadow:inset 0 1px 0 rgba(255,225,200,.42),0 12px 30px rgba(222,82,25,.3);'
    + 'transition:background .25s,transform .25s,box-shadow .25s;}'
    + '.cbnc-go:hover{background:#F06A2E;transform:translateY(-2px);'
    + 'box-shadow:inset 0 1px 0 rgba(255,235,215,.55),0 18px 40px rgba(222,82,25,.42);}'
    + '.cbnc-go svg{width:14px;height:14px;}'
    + '.cbnc-wipe{display:block;width:100%;margin-top:10px;padding:9px;border:none;background:none;cursor:pointer;'
    + 'color:rgba(244,234,220,.34);font-family:inherit;font-size:11.5px;transition:color .22s;}'
    + '.cbnc-wipe:hover{color:#C9424E;}'

    /* nothing in it yet */
    + '.cbnc-void{text-align:center;padding:52px 24px 44px;}'
    + '.cbnc-void-i{width:56px;height:56px;margin:0 auto 20px;color:rgba(244,234,220,.16);}'
    + '.cbnc-void-i svg{width:100%;height:100%;stroke-width:1;}'
    + '.cbnc-void h3{font-family:"Zodiak","Fraunces",Georgia,serif;font-weight:400;font-size:22px;'
    + 'letter-spacing:-.03em;color:#F4EADC;margin:0 0 10px;}'
    + '.cbnc-void p{font-size:13.5px;line-height:1.65;color:rgba(244,234,220,.45);max-width:30ch;margin:0 auto 22px;}'
    + '.cbnc-void a{display:inline-flex;align-items:center;gap:8px;padding:12px 20px;border-radius:10px;'
    + 'text-decoration:none;background:#DE5219;color:#170A03;font-family:"Geist Mono",ui-monospace,monospace;'
    + 'font-size:10.5px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;}'
    + '.cbnc-void a svg{width:13px;height:13px;}'

    /* the count on whatever button opened this */
    + '[data-cart-count]{display:none;}'
    + '[data-cart-count].on{display:grid;}'

    /* a line just went in. The badge notices. */
    + '@keyframes cbnc-pop{0%{transform:scale(1);}40%{transform:scale(1.32);}100%{transform:scale(1);}}'
    + '.cbnc-pop{animation:cbnc-pop .45s cubic-bezier(.34,1.4,.44,1);}';

  safe(function () {
    var s = doc.createElement('style');
    s.setAttribute('data-cbn-cart', '');
    s.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(s);
  }, 'css');

  /* ═══════════════════════════════════════════════════════════════
     THE PANEL
     ═══════════════════════════════════════════════════════════════ */
  var scrim, panel, body, foot, open = false, lastFocus = null;

  function build() {
    if (panel) return;
    scrim = doc.createElement('div');
    scrim.className = 'cbnc-scrim';
    scrim.addEventListener('click', close);

    panel = doc.createElement('aside');
    panel.className = 'cbnc-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Your order');
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML =
      '<span class="cbnc-grip"></span>'
      + '<header class="cbnc-head">'
      + '<div style="flex:1;min-width:0"><span class="cbnc-sub" id="cbncSub">Your order</span>'
      + '<h2 id="cbncTitle">Nothing yet</h2></div>'
      + '<button class="cbnc-close" type="button" aria-label="Close the order">' + mk('x', 2.2) + '</button>'
      + '</header>'
      + '<div class="cbnc-body" id="cbncBody"></div>'
      + '<footer class="cbnc-foot" id="cbncFoot" hidden></footer>';

    panel.querySelector('.cbnc-close').addEventListener('click', close);
    doc.body.appendChild(scrim);
    doc.body.appendChild(panel);
    body = panel.querySelector('#cbncBody');
    foot = panel.querySelector('#cbncFoot');

    /* Escape closes it, and focus does not wander out of an open drawer */
    doc.addEventListener('keydown', function (e) {
      if (!open) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'Tab') trap(e);
    });

    /* the sheet can be flicked down on a phone */
    var y0 = null, dy = 0;
    panel.addEventListener('touchstart', function (e) {
      if (global.innerWidth >= 760) return;
      if (body.scrollTop > 0) return;
      y0 = e.touches[0].clientY; dy = 0;
    }, { passive: true });
    panel.addEventListener('touchmove', function (e) {
      if (y0 == null) return;
      dy = e.touches[0].clientY - y0;
      if (dy > 0) panel.style.transform = 'translateY(' + dy + 'px)';
    }, { passive: true });
    panel.addEventListener('touchend', function () {
      if (y0 == null) return;
      panel.style.transform = '';
      if (dy > 110) close();
      y0 = null;
    });
  }

  function focusables() {
    return [].slice.call(panel.querySelectorAll(
      'a[href],button:not(:disabled),textarea,input,select,[tabindex]:not([tabindex="-1"])'
    )).filter(function (el) { return el.offsetParent !== null; });
  }
  function trap(e) {
    var f = focusables();
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  var scrollLock = 0;
  function lock() {
    scrollLock = global.scrollY || doc.documentElement.scrollTop || 0;
    doc.body.style.overflow = 'hidden';
  }
  function unlock() {
    doc.body.style.overflow = '';
  }

  function openPanel() {
    build();
    render();
    lastFocus = doc.activeElement;
    open = true;
    lock();
    scrim.classList.add('on');
    panel.classList.add('on');
    panel.setAttribute('aria-hidden', 'false');
    setTimeout(function () {
      var f = focusables();
      if (f.length) f[0].focus();
    }, 90);
  }

  function close() {
    if (!open) return;
    open = false;
    unlock();
    scrim.classList.remove('on');
    panel.classList.remove('on');
    panel.setAttribute('aria-hidden', 'true');
    safe(function () { if (lastFocus && lastFocus.focus) lastFocus.focus(); }, 'refocus');
  }

  /* ═══════════════════════════════════════════════════════════════
     DRAW
     ═══════════════════════════════════════════════════════════════ */
  var MODES = [
    ['delivery', 'Delivery', 'scooter', 'serves_delivery'],
    ['pickup', 'Collect', 'hand', 'serves_pickup'],
    ['dine_in', 'Eat in', 'chair', 'serves_dine_in']
  ];

  function money(n, c) { return Cart.money(n, c); }

  function render() {
    if (!panel) return;
    var groups = Cart.groups();
    var t = Cart.totals();

    panel.querySelector('#cbncTitle').textContent = !t.count
      ? 'Nothing yet'
      : t.count + (t.count === 1 ? ' item' : ' items');
    panel.querySelector('#cbncSub').textContent = !t.count
      ? 'Your order'
      : t.kitchens === 1 ? 'From one kitchen' : 'From ' + t.kitchens + ' kitchens';

    if (!groups.length) {
      body.innerHTML =
        '<div class="cbnc-void">'
        + '<div class="cbnc-void-i">' + mk('cloche', 1) + '</div>'
        + '<h3>Your order is empty</h3>'
        + '<p>Find a dish you want and add it. You can pick from as many kitchens as you like — each one gets its own ticket.</p>'
        + '<a href="/food">Browse the food ' + mk('east', 1.8) + '</a>'
        + '</div>';
      foot.hidden = true;
      return;
    }

    body.innerHTML = groups.map(kitchenBlock).join('');
    wire();

    foot.hidden = false;
    foot.innerHTML =
      '<div class="cbnc-tot">'
      + '<div class="cbnc-tot-l">To pay the kitchens'
      + '<small>' + (t.kitchens === 1 ? 'One kitchen' : t.kitchens + ' separate tickets') + '</small></div>'
      + '<div class="cbnc-tot-v">' + esc(money(t.total, t.currency)) + '</div>'
      + '</div>'
      + '<a class="cbnc-go" href="' + CHECKOUT + '">Go to checkout ' + mk('east', 2) + '</a>'
      + '<button class="cbnc-wipe" type="button" id="cbncWipe">Empty the whole order</button>';

    foot.querySelector('#cbncWipe').addEventListener('click', function () {
      if (global.confirm('Empty your whole order?')) Cart.clear();
    });
  }

  function kitchenBlock(g) {
    var cooking = Cart.cooking(g.id);
    var photo = g.photo
      ? '<img class="cbnc-k-ph" src="' + attr(g.photo) + '" alt="" loading="lazy" decoding="async" onerror="this.replaceWith(CabanaCartUI._ph(\'cbnc-k-ph\'))"/>'
      : '<span class="cbnc-k-ph ph">' + mk('cloche', 1.2) + '</span>';

    var where = [];
    if (cooking === true) where.push('<span class="open">Cooking now</span>');
    else if (cooking === false) where.push('<span class="shut">Closed right now</span>');
    if (g.where) where.push(esc(g.where));

    var h = '<section class="cbnc-k" data-k="' + attr(g.id) + '">';

    h += '<div class="cbnc-k-head">' + photo
      + '<div class="cbnc-k-id">'
      + '<a class="cbnc-k-n" href="/restaurant?id=' + encodeURIComponent(g.id) + '">' + esc(g.name || 'Kitchen') + '</a>'
      + (where.length ? '<div class="cbnc-k-w">' + mk('pin', 1.5) + where.join(' · ') + '</div>' : '')
      + '</div>'
      + '<button class="cbnc-k-drop" type="button" data-drop="' + attr(g.id) + '" '
      + 'aria-label="Remove everything from ' + attr(g.name) + '">' + mk('bin', 1.6) + '</button>'
      + '</div>';

    h += g.items.map(function (i) { return lineRow(g, i); }).join('');

    /* how they want it. A way the kitchen does not do is shown but
       disabled, so the diner learns what is possible rather than
       wondering why an option vanished. */
    h += '<div class="cbnc-modes">' + MODES.map(function (m) {
      var can = g[m[3]] !== false;
      return '<button class="cbnc-mode' + (g.mode === m[0] ? ' on' : '') + '" type="button" '
        + 'data-mode="' + m[0] + '" data-k="' + attr(g.id) + '"' + (can ? '' : ' disabled')
        + ' title="' + (can ? attr(m[1]) : attr(g.name + ' does not do this')) + '">'
        + mk(m[2], 1.5) + '<span>' + esc(m[1]) + '</span></button>';
    }).join('') + '</div>';

    h += '<div class="cbnc-k-foot"><textarea class="cbnc-note" data-note="' + attr(g.id) + '" rows="1" '
      + 'placeholder="Anything the kitchen should know? No chilli, extra sauce, gate code…"'
      + '>' + esc(g.note) + '</textarea></div>';

    h += '<div class="cbnc-sum"><span>Food</span><b>' + esc(money(g.subtotal, g.currency)) + '</b></div>';
    if (g.mode === 'delivery' && g.delivery_fee != null) {
      h += '<div class="cbnc-sum"><span>Delivery</span><b>'
        + (g.delivery_fee === 0 ? 'Free' : esc(money(g.delivery_fee, g.currency))) + '</b></div>';
    }
    h += '<div class="cbnc-sum big"><span>' + esc(g.name || 'Kitchen') + '</span><b>'
      + esc(money(g.total, g.currency)) + '</b></div>';

    if (g.shortBy > 0) {
      h += '<div class="cbnc-flag">' + mk('info', 1.6)
        + '<span>' + esc(g.name) + ' has a minimum of ' + esc(money(g.min_order, g.currency))
        + '. Add ' + esc(money(g.shortBy, g.currency)) + ' more before you send this one.</span></div>';
    }
    if (cooking === false) {
      h += '<div class="cbnc-flag cold">' + mk('clock', 1.6)
        + '<span>This kitchen is closed right now. You can still send the order — they will see it when they open.</span></div>';
    }

    h += '</section>';
    return h;
  }

  function lineRow(g, i) {
    var photo = i.photo
      ? '<img class="cbnc-l-ph" src="' + attr(i.photo) + '" alt="" loading="lazy" decoding="async" onerror="this.replaceWith(CabanaCartUI._ph(\'cbnc-l-ph\'))"/>'
      : '<span class="cbnc-l-ph ph">' + mk('cloche', 1.2) + '</span>';
    var unit = i.promo_price != null
      ? '<s>' + esc(money(i.price, g.currency)) + '</s>' + esc(money(i.promo_price, g.currency))
      : esc(money(i.price, g.currency));

    return '<div class="cbnc-l">' + photo
      + '<div class="cbnc-l-b">'
      + '<div class="cbnc-l-n">' + esc(i.name || 'Dish') + '</div>'
      + '<div class="cbnc-l-u">' + unit + ' each</div>'
      + '</div>'
      + '<div class="cbnc-step">'
      + '<button type="button" data-b="-1" data-k="' + attr(g.id) + '" data-i="' + attr(i.id) + '" '
      + 'aria-label="One fewer ' + attr(i.name) + '">&minus;</button>'
      + '<b>' + i.qty + '</b>'
      + '<button type="button" data-b="1" data-k="' + attr(g.id) + '" data-i="' + attr(i.id) + '" '
      + 'aria-label="One more ' + attr(i.name) + '">+</button>'
      + '</div>'
      + '<div class="cbnc-l-p">' + esc(money(i.line, g.currency)) + '</div>'
      + '</div>';
  }

  /* A photograph that will not load becomes a drawn mark, never a
     browser's broken-image glyph. */
  function ph(cls) {
    var s = doc.createElement('span');
    s.className = cls + ' ph';
    s.innerHTML = mk('cloche', 1.2);
    return s;
  }

  function wire() {
    body.querySelectorAll('[data-b]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        Cart.bump(btn.dataset.k, btn.dataset.i, Number(btn.dataset.b));
      });
    });
    body.querySelectorAll('[data-drop]').forEach(function (btn) {
      btn.addEventListener('click', function () { Cart.clearKitchen(btn.dataset.drop); });
    });
    body.querySelectorAll('[data-mode]').forEach(function (btn) {
      btn.addEventListener('click', function () { Cart.setMode(btn.dataset.k, btn.dataset.mode); });
    });
    /* The note is saved as it is typed, but re-rendering the whole
       drawer on every keystroke would steal the caret. Save quietly,
       repaint only when the field is left. */
    body.querySelectorAll('[data-note]').forEach(function (ta) {
      grow(ta);
      ta.addEventListener('input', function () {
        grow(ta);
        clearTimeout(ta._t);
        ta._t = setTimeout(function () { quietNote(ta.dataset.note, ta.value); }, 260);
      });
      ta.addEventListener('blur', function () { quietNote(ta.dataset.note, ta.value); });
    });
  }
  function grow(ta) {
    ta.style.height = 'auto';
    ta.style.height = Math.min(120, ta.scrollHeight) + 'px';
  }

  /* write the note without triggering a repaint of the field being typed in */
  var muted = false;
  function quietNote(id, v) {
    muted = true;
    Cart.setNote(id, v);
    muted = false;
  }

  /* ═══════════════════════════════════════════════════════════════
     BADGES. Anything with [data-cart-count] paints itself.
     ═══════════════════════════════════════════════════════════════ */
  var lastCount = null;
  function paintBadges(t) {
    var n = t ? t.count : Cart.totals().count;
    doc.querySelectorAll('[data-cart-count]').forEach(function (el) {
      el.textContent = n > 99 ? '99+' : String(n);
      el.classList.toggle('on', n > 0);
      if (lastCount != null && n > lastCount) {
        el.classList.remove('cbnc-pop');
        void el.offsetWidth;
        el.classList.add('cbnc-pop');
      }
    });
    doc.querySelectorAll('[data-cart-total]').forEach(function (el) {
      el.textContent = Cart.money(Cart.totals().total, Cart.totals().currency);
    });
    doc.querySelectorAll('[data-cart-empty]').forEach(function (el) { el.hidden = n > 0; });
    doc.querySelectorAll('[data-cart-any]').forEach(function (el) { el.hidden = n === 0; });
    lastCount = n;
  }

  Cart.onChange(function (t) {
    paintBadges(t);
    if (open && !muted) render();
  });

  /* delegated so a button added after load still opens the drawer */
  doc.addEventListener('click', function (e) {
    var t = e.target && e.target.closest && e.target.closest('[data-cart-open]');
    if (!t) return;
    e.preventDefault();
    openPanel();
  });

  ready(function () { paintBadges(); });

  /* ═══════════════════════════════════════════════════════════════
     A LINE WENT IN. Say so, briefly, near the thumb.
     ═══════════════════════════════════════════════════════════════ */
  var TOAST_CSS = ''
    + '.cbnc-toast{position:fixed;left:50%;bottom:24px;z-index:9200;transform:translateX(-50%) translateY(22px);'
    + 'display:flex;align-items:center;gap:11px;padding:11px 14px 11px 11px;border-radius:14px;'
    + 'background:#1D120A;border:1px solid rgba(244,234,220,.16);color:#F4EADC;'
    + 'font-family:"Switzer","Inter",system-ui,sans-serif;font-size:13px;font-weight:500;'
    + 'box-shadow:0 22px 60px rgba(0,0,0,.6);opacity:0;pointer-events:none;'
    + 'transition:opacity .3s,transform .38s cubic-bezier(.22,1,.36,1);max-width:min(92vw,380px);}'
    + '.cbnc-toast.on{opacity:1;transform:translateX(-50%) translateY(0);pointer-events:auto;}'
    + '.cbnc-toast img,.cbnc-toast .tph{width:38px;height:38px;border-radius:9px;object-fit:cover;'
    + 'flex-shrink:0;background:#2A1A10;}'
    + '.cbnc-toast .tph{display:grid;place-items:center;color:rgba(244,234,220,.3);}'
    + '.cbnc-toast .tph svg{width:17px;height:17px;}'
    + '.cbnc-toast .tb{flex:1;min-width:0;}'
    + '.cbnc-toast .tb b{display:block;font-size:13px;font-weight:600;white-space:nowrap;'
    + 'overflow:hidden;text-overflow:ellipsis;}'
    + '.cbnc-toast .tb small{display:block;font-size:11.5px;color:rgba(244,234,220,.45);margin-top:2px;}'
    + '.cbnc-toast button{flex-shrink:0;padding:9px 13px;border-radius:9px;border:none;cursor:pointer;'
    + 'background:#DE5219;color:#170A03;font-family:"Geist Mono",ui-monospace,monospace;font-size:9.5px;'
    + 'font-weight:600;letter-spacing:.14em;text-transform:uppercase;transition:background .22s;}'
    + '.cbnc-toast button:hover{background:#F06A2E;}'
    + '@media(min-width:760px){.cbnc-toast{left:auto;right:24px;transform:translateY(22px);}'
    + '.cbnc-toast.on{transform:translateY(0);}}';

  safe(function () {
    var s = doc.createElement('style');
    s.textContent = TOAST_CSS;
    (doc.head || doc.documentElement).appendChild(s);
  }, 'toast-css');

  var toastEl = null;
  function toast(item, qty) {
    if (!doc.body) return;
    if (!toastEl) {
      toastEl = doc.createElement('div');
      toastEl.className = 'cbnc-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      doc.body.appendChild(toastEl);
    }
    var pic = item && item.photo
      ? '<img src="' + attr(item.photo) + '" alt="" onerror="this.replaceWith(CabanaCartUI._ph2())"/>'
      : '<span class="tph">' + mk('cloche', 1.2) + '</span>';
    var t = Cart.totals();
    toastEl.innerHTML = pic
      + '<div class="tb"><b>' + (qty > 1 ? qty + ' × ' : '') + esc((item && item.name) || 'Added') + '</b>'
      + '<small>' + t.count + (t.count === 1 ? ' item' : ' items') + ' · ' + esc(Cart.money(t.total, t.currency)) + '</small></div>'
      + '<button type="button" data-cart-open>View</button>';
    toastEl.classList.add('on');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.classList.remove('on'); }, 3600);
  }

  /* ═══════════════════════════════════════════════════════════════
     PUBLIC
     ═══════════════════════════════════════════════════════════════ */
  global.CabanaCartUI = {
    open: openPanel,
    close: close,
    refresh: function () { if (open) render(); paintBadges(); },
    /* add + say so, the one call a page needs for a dish button */
    add: function (restaurant, item, qty) {
      Cart.add(restaurant, item, qty || 1);
      toast(item, qty || 1);
      return Cart.totals();
    },
    toast: toast,
    checkoutUrl: CHECKOUT,
    icon: mk,
    _ph: ph,
    _ph2: function () {
      var s = doc.createElement('span');
      s.className = 'tph';
      s.innerHTML = mk('cloche', 1.2);
      return s;
    }
  };

})(typeof window !== 'undefined' ? window : this);
