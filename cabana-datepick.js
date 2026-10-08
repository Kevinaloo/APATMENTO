/* ═══════════════════════════════════════════════════════════════════
   CABANA DATE PICK · one calendar sheet for every single-date field
   ───────────────────────────────────────────────────────────────────
   Native <input type="date"> shows "mm/dd/yyyy" and a different picker on
   every browser, which looked out of place beside the Stays calendar.
   This upgrades an input IN PLACE: same element, same ISO "YYYY-MM-DD"
   .value, same 'change' event, same .min, so the page code that already
   reads it keeps working untouched.

     <input type="date" id="x" data-cdp="Departing" data-cdp-theme="dark"
            data-cdp-after="other-input-id" data-cdp-placeholder="Add date">

   · The field becomes a read-only text field that shows "Fri 9 Oct 2026".
   · Tap, Enter or Space opens a calendar sheet (bottom sheet on a phone,
     card on a desktop). Days before the input's `min` are disabled.
   · data-cdp-after names another date input: its day is marked as the
     anchor (a return date shows the departure it follows).
   · Setting input.value = '' / 'YYYY-MM-DD' from code updates the label.
   · Keyboard: arrows move by day / week, PageUp / PageDown by month,
     Enter selects, Escape closes and returns focus to the field.
   · No polling, no listeners while closed beyond the field itself.

   API:  CabanaDatePick.attach(input, opts)   CabanaDatePick.scan()
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.CabanaDatePick) return;
  var doc = global.document;
  var ISO = /^\d{4}-\d{2}-\d{2}$/;
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var SHORT_D = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var SHORT_M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); }
  function parse(s) { if (!ISO.test(s || '')) return null; var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function todayISO() { var t = new Date(); return iso(t.getFullYear(), t.getMonth(), t.getDate()); }
  function label(s) { var d = parse(s); return d ? SHORT_D[d.getDay()] + ' ' + d.getDate() + ' ' + SHORT_M[d.getMonth()] + ' ' + d.getFullYear() : ''; }

  var CSS = [
    '.cdp-field{cursor:pointer;caret-color:transparent;}',
    '.cdp-field.cdp-empty{color:var(--cdp-ph,#8b8eac);}',
    '#cdp-root{position:fixed;inset:0;z-index:2147482500;display:none;}',
    '#cdp-root.on{display:block;}',
    '#cdp-scrim{position:absolute;inset:0;background:rgba(8,8,15,.55);opacity:0;transition:opacity .22s;}',
    '#cdp-root.in #cdp-scrim{opacity:1;}',
    '#cdp-sheet{position:absolute;left:0;right:0;bottom:0;max-width:440px;margin:0 auto;background:#fcfcfe;color:#14152b;border-radius:24px 24px 0 0;',
    'padding:10px 18px calc(18px + env(safe-area-inset-bottom,0px));box-shadow:0 -20px 60px rgba(8,8,15,.35);transform:translateY(24px);opacity:0;',
    'transition:transform .28s cubic-bezier(.2,.8,.2,1),opacity .22s;font:14px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;}',
    '#cdp-root.in #cdp-sheet{transform:none;opacity:1;}',
    '#cdp-sheet.dark{background:#12131f;color:#f1f1f8;}',
    '@media(min-width:700px){#cdp-sheet{bottom:auto;top:50%;margin-top:-250px;border-radius:24px;padding-bottom:18px;}}',
    '.cdp-grab{width:38px;height:4px;border-radius:4px;background:rgba(120,120,150,.35);margin:2px auto 12px;}',
    '.cdp-title{font-weight:600;font-size:15px;margin:0 2px 10px;}',
    '.cdp-bar{display:flex;align-items:center;justify-content:space-between;margin:0 0 6px;}',
    '.cdp-month{font-weight:600;font-size:16px;}',
    '.cdp-nav{width:44px;height:44px;border-radius:50%;border:0;background:rgba(120,120,150,.12);color:inherit;font-size:20px;cursor:pointer;}',
    '.cdp-nav:disabled{opacity:.3;cursor:default;}',
    '.cdp-wd,.cdp-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center;}',
    '.cdp-wd span{font-size:11px;font-weight:600;letter-spacing:.04em;opacity:.55;padding:6px 0;}',
    '.cdp-day{height:44px;border:0;border-radius:12px;background:transparent;color:inherit;font:600 15px system-ui,sans-serif;cursor:pointer;position:relative;}',
    '.cdp-day:hover:not(:disabled){background:rgba(123,47,247,.12);}',
    '.cdp-day:disabled{opacity:.28;cursor:default;}',
    '.cdp-day.today{box-shadow:inset 0 0 0 1.5px rgba(123,47,247,.55);}',
    '.cdp-day.anchor{background:rgba(123,47,247,.16);}',
    '.cdp-day.sel{background:linear-gradient(135deg,#6D28FF,#4F6DFF);color:#fff;}',
    '.cdp-day:focus-visible,.cdp-nav:focus-visible,.cdp-act:focus-visible{outline:3px solid #a58cff;outline-offset:2px;}',
    '.cdp-foot{display:flex;justify-content:space-between;gap:10px;margin-top:12px;}',
    '.cdp-act{flex:1;height:44px;border-radius:14px;border:1px solid rgba(120,120,150,.3);background:transparent;color:inherit;font:600 14px system-ui,sans-serif;cursor:pointer;}',
    '@media(prefers-reduced-motion:reduce){#cdp-sheet,#cdp-scrim{transition:none;}}'
  ].join('');

  var root, sheetEl, bar, grid, titleEl, monthEl, prevB, nextB, clearB, todayB;
  var cur = null;                 // { input, opts, view: {y,m}, focusISO, returnTo }
  var cssDone = false;

  function ensureCss() {
    if (cssDone) return; cssDone = true;
    var s = doc.createElement('style'); s.textContent = CSS; (doc.head || doc.documentElement).appendChild(s);
  }

  function build() {
    if (root) return;
    ensureCss();
    root = doc.createElement('div'); root.id = 'cdp-root';
    root.innerHTML = '<div id="cdp-scrim"></div><div id="cdp-sheet" role="dialog" aria-modal="true" aria-labelledby="cdp-title">' +
      '<div class="cdp-grab" aria-hidden="true"></div><p class="cdp-title" id="cdp-title"></p>' +
      '<div class="cdp-bar"><button type="button" class="cdp-nav" data-n="-1" aria-label="Previous month">‹</button>' +
      '<span class="cdp-month" aria-live="polite"></span><button type="button" class="cdp-nav" data-n="1" aria-label="Next month">›</button></div>' +
      '<div class="cdp-wd" aria-hidden="true">' + SHORT_D.map(function (d) { return '<span>' + d.slice(0, 2) + '</span>'; }).join('') + '</div>' +
      '<div class="cdp-grid" role="grid"></div>' +
      '<div class="cdp-foot"><button type="button" class="cdp-act" data-a="clear">Clear</button><button type="button" class="cdp-act" data-a="today">Today</button></div></div>';
    doc.body.appendChild(root);
    sheetEl = root.querySelector('#cdp-sheet'); grid = root.querySelector('.cdp-grid');
    titleEl = root.querySelector('#cdp-title'); monthEl = root.querySelector('.cdp-month');
    prevB = root.querySelector('[data-n="-1"]'); nextB = root.querySelector('[data-n="1"]');
    clearB = root.querySelector('[data-a="clear"]'); todayB = root.querySelector('[data-a="today"]');
    root.querySelector('#cdp-scrim').addEventListener('click', close);
    prevB.addEventListener('click', function () { shift(-1); });
    nextB.addEventListener('click', function () { shift(1); });
    clearB.addEventListener('click', function () { choose(''); });
    todayB.addEventListener('click', function () { var t = todayISO(); if (!disabled(t)) choose(t); });
    grid.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('.cdp-day'); if (b && !b.disabled) choose(b.getAttribute('data-d')); });
    root.addEventListener('keydown', onKey);
  }

  function minISO(input) { var m = input.getAttribute('min'); return ISO.test(m || '') ? m : todayISO(); }
  function maxISO(input) {
    var m = input.getAttribute('max'); if (ISO.test(m || '')) return m;
    var t = new Date(); t.setDate(t.getDate() + 540); return iso(t.getFullYear(), t.getMonth(), t.getDate());
  }
  function disabled(s) { return !cur || s < minISO(cur.input) || s > maxISO(cur.input); }

  function render() {
    var v = cur.view, first = new Date(v.y, v.m, 1), days = new Date(v.y, v.m + 1, 0).getDate();
    var sel = cur.input.value, anchorEl = cur.opts.after && doc.getElementById(cur.opts.after), anchor = anchorEl ? anchorEl.value : '';
    var today = todayISO(), html = '';
    monthEl.textContent = MONTHS[v.m] + ' ' + v.y;
    for (var i = 0; i < first.getDay(); i++) html += '<span></span>';
    for (var d = 1; d <= days; d++) {
      var s = iso(v.y, v.m, d), dt = new Date(v.y, v.m, d);
      html += '<button type="button" class="cdp-day' + (s === sel ? ' sel' : '') + (s === today ? ' today' : '') + (anchor && s === anchor ? ' anchor' : '') + '" data-d="' + s + '"' +
        (disabled(s) ? ' disabled' : '') + ' role="gridcell" aria-label="' + DAYS[dt.getDay()] + ' ' + d + ' ' + MONTHS[v.m] + ' ' + v.y + '"' +
        (s === sel ? ' aria-selected="true"' : '') + ' tabindex="' + (s === cur.focusISO ? '0' : '-1') + '">' + d + '</button>';
    }
    grid.innerHTML = html;
    var minD = parse(minISO(cur.input)), maxD = parse(maxISO(cur.input));
    prevB.disabled = v.y * 12 + v.m <= minD.getFullYear() * 12 + minD.getMonth();
    nextB.disabled = v.y * 12 + v.m >= maxD.getFullYear() * 12 + maxD.getMonth();
    clearB.hidden = !!cur.input.required;
    todayB.hidden = disabled(today);
  }

  function shift(n) {
    var v = cur.view, d = new Date(v.y, v.m + n, 1);
    cur.view = { y: d.getFullYear(), m: d.getMonth() };
    if (!cur.focusISO || cur.focusISO.slice(0, 7) !== iso(d.getFullYear(), d.getMonth(), 1).slice(0, 7)) {
      var f = iso(d.getFullYear(), d.getMonth(), 1);
      var min = minISO(cur.input); cur.focusISO = f < min ? min : f;
    }
    render();
  }

  function focusDay() {
    var b = grid.querySelector('.cdp-day[data-d="' + cur.focusISO + '"]') || grid.querySelector('.cdp-day:not(:disabled)');
    if (b) b.focus({ preventScroll: true });
  }

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key === 'Tab') {
      var f = [].slice.call(sheetEl.querySelectorAll('button:not(:disabled):not([hidden])')).filter(function (b) { return b.tabIndex >= 0 || b.classList.contains('cdp-nav') || b.classList.contains('cdp-act'); });
      if (!f.length) return;
      var i = f.indexOf(doc.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      return;
    }
    var day = e.target.closest && e.target.closest('.cdp-day'); if (!day) return;
    var step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (step !== undefined) {
      e.preventDefault();
      var d = parse(day.getAttribute('data-d')); d.setDate(d.getDate() + step);
      var s = iso(d.getFullYear(), d.getMonth(), d.getDate());
      if (disabled(s)) return;
      cur.focusISO = s; cur.view = { y: d.getFullYear(), m: d.getMonth() }; render(); focusDay();
    } else if (e.key === 'PageDown' || e.key === 'PageUp') {
      e.preventDefault(); shift(e.key === 'PageDown' ? 1 : -1); focusDay();
    }
  }

  function setValue(input, v) {
    var next = ISO.test(v || '') ? v : '';
    if (input.__cdpIso === next) { paint(input); return; }
    input.__cdpIso = next; paint(input);
  }
  function paint(input) {
    var shown = label(input.__cdpIso);
    input.__cdpText.call(input, shown);
    input.classList.toggle('cdp-empty', !shown);
  }

  function choose(v) {
    var input = cur.input; setValue(input, v);
    input.dispatchEvent(new global.Event('input', { bubbles: true }));
    input.dispatchEvent(new global.Event('change', { bubbles: true }));
    close();
  }

  function open(input, opts) {
    build();
    var s = input.__cdpIso, min = minISO(input), start = s || (opts.after && (doc.getElementById(opts.after) || {}).value) || min;
    if (start < min) start = min;
    var d = parse(start);
    cur = { input: input, opts: opts, view: { y: d.getFullYear(), m: d.getMonth() }, focusISO: start, returnTo: input };
    titleEl.textContent = opts.title || 'Choose a date';
    sheetEl.className = opts.theme === 'dark' ? 'dark' : '';
    sheetEl.id = 'cdp-sheet';
    render();
    root.classList.add('on');
    global.requestAnimationFrame(function () { root.classList.add('in'); focusDay(); });
  }

  function close() {
    if (!cur) return;
    var back = cur.returnTo; cur = null;
    root.classList.remove('in');
    setTimeout(function () { if (!cur) root.classList.remove('on'); }, 240);
    if (back && back.focus) try { back.focus({ preventScroll: true }); } catch (e) { /* fine */ }
  }

  function attach(input, opts) {
    if (!input || input.__cdp) return;
    opts = opts || {};
    var proto = global.HTMLInputElement.prototype;
    var desc = Object.getOwnPropertyDescriptor(proto, 'value');
    var initial = ISO.test(input.value || '') ? input.value : '';
    input.__cdp = true;
    input.type = 'text';
    input.readOnly = true;
    input.setAttribute('inputmode', 'none');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('aria-haspopup', 'dialog');
    input.classList.add('cdp-field');
    input.setAttribute('placeholder', opts.placeholder || input.getAttribute('placeholder') || 'Add date');
    input.__cdpText = function (t) { desc.set.call(this, t); };
    input.__cdpIso = initial;
    /* Page code keeps reading and writing the ISO string. */
    Object.defineProperty(input, 'value', {
      configurable: true,
      get: function () { return this.__cdpIso || ''; },
      set: function (v) { setValue(this, v); }
    });
    paint(input);
    var go = function (e) { e.preventDefault(); open(input, opts); };
    input.addEventListener('click', go);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') go(e); });
  }

  function scan() {
    [].slice.call(doc.querySelectorAll('input[data-cdp]')).forEach(function (el) {
      attach(el, {
        title: el.getAttribute('data-cdp') || undefined,
        theme: el.getAttribute('data-cdp-theme') || undefined,
        after: el.getAttribute('data-cdp-after') || undefined,
        placeholder: el.getAttribute('data-cdp-placeholder') || undefined
      });
    });
  }

  global.CabanaDatePick = { attach: attach, scan: scan };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', scan); else scan();
})(window);
