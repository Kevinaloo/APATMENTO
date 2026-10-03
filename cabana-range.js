/* ═══════════════════════════════════════════════════════════════════
   CABANA RANGE · one track, two handles, the real prices behind it
   ───────────────────────────────────────────────────────────────────
   The price filter used to be two separate sliders, "no less than" and
   "no more than", that could cross each other and gave no hint of where
   the stays actually sat. This is the control people expect: one track,
   two handles that can never pass, a histogram of the live prices so a
   guest can see where the stock is, and two boxes to type an exact
   figure into.

     var r = CabanaRange.mount(host, {
       min, max, step,             in display units
       values: [lo, hi],
       hist: [n, n, …],            counts per equal-width bucket
       format: v => 'KES 2,500',
       openTop: true,              the top handle at max means "any"
       onInput(lo, hi), onChange(lo, hi)
     });
     r.set(lo, hi); r.update({ min, max, step, hist, format }); r.values();
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.CabanaRange) return;
  var D = global.document;

  var CSS = [
    '.crg{position:relative;padding:4px 2px 0;user-select:none;-webkit-user-select:none;}',
    '.crg-hist{display:flex;align-items:flex-end;gap:2px;height:56px;padding:0 11px;}',
    '.crg-bar{flex:1;min-width:0;border-radius:3px 3px 1px 1px;background:rgba(18,15,43,.1);transition:background .2s,height .45s cubic-bezier(.22,1,.36,1);}',
    '.crg-bar.in{background:linear-gradient(180deg,#9B5CFF,#7B2FF7);}',
    '.crg-track{position:relative;height:28px;margin:0 11px;touch-action:none;cursor:pointer;}',
    '.crg-rail{position:absolute;left:0;right:0;top:50%;height:4px;margin-top:-2px;border-radius:4px;background:rgba(18,15,43,.1);}',
    '.crg-fill{position:absolute;top:50%;height:4px;margin-top:-2px;border-radius:4px;background:linear-gradient(90deg,#7B2FF7,#4D96FF);}',
    '.crg-thumb{position:absolute;top:50%;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;border:0;padding:0;cursor:grab;',
    'background:#fff;box-shadow:0 0 0 1px rgba(18,15,43,.14),0 2px 8px rgba(18,15,43,.18);transition:box-shadow .2s,transform .18s cubic-bezier(.34,1.56,.64,1);touch-action:none;}',
    '.crg-thumb::after{content:"";position:absolute;inset:8px;border-radius:50%;background:#7B2FF7;}',
    '.crg-thumb:hover{box-shadow:0 0 0 1px rgba(123,47,247,.45),0 2px 10px rgba(123,47,247,.28);}',
    '.crg-thumb:focus-visible{outline:none;box-shadow:0 0 0 4px rgba(123,47,247,.22),0 0 0 1px rgba(123,47,247,.6),0 2px 10px rgba(123,47,247,.3);}',
    '.crg-thumb.drag{cursor:grabbing;transform:scale(1.12);box-shadow:0 0 0 6px rgba(123,47,247,.14),0 0 0 1px rgba(123,47,247,.6),0 4px 14px rgba(123,47,247,.35);}',
    '.crg-tip{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translate(-50%,4px);white-space:nowrap;padding:5px 8px;border-radius:8px;',
    'background:#120F2B;color:#fff;font:700 11.5px/1 inherit;font-variant-numeric:tabular-nums;opacity:0;pointer-events:none;transition:opacity .15s,transform .2s;}',
    '.crg-thumb.drag .crg-tip,.crg-thumb:focus-visible .crg-tip{opacity:1;transform:translate(-50%,0);}',
    '.crg-boxes{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:10px;margin-top:12px;}',
    '.crg-box{display:flex;flex-direction:column;gap:3px;min-width:0;padding:8px 12px;border-radius:13px;border:1px solid rgba(18,15,43,.12);background:#fff;transition:border-color .2s,box-shadow .2s;cursor:text;}',
    '.crg-box:focus-within{border-color:rgba(123,47,247,.5);box-shadow:0 0 0 3px rgba(123,47,247,.1);}',
    '.crg-box span{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#8C89A6;}',
    '.crg-box div{display:flex;align-items:baseline;gap:5px;min-width:0;}',
    '.crg-box em{font-style:normal;font-size:13px;font-weight:600;color:#4B4867;}',
    '.crg-box input{flex:1;min-width:0;border:0;outline:none;background:none;padding:0;font:650 15px/1.2 inherit;color:#120F2B;font-variant-numeric:tabular-nums;}',
    '.crg-dash{width:10px;height:1.5px;background:rgba(18,15,43,.25);}'
  ].join('');
  function ensureCSS() {
    if (D.getElementById('crg-css')) return;
    var st = D.createElement('style');
    st.id = 'crg-css'; st.textContent = CSS;
    (D.head || D.documentElement).appendChild(st);
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function mount(host, o) {
    ensureCSS();
    o = o || {};
    var st = {
      min: +o.min || 0, max: +o.max || 100, step: +o.step || 1,
      lo: 0, hi: 0, hist: o.hist || [], format: o.format || String,
      prefix: o.prefix || '', openTop: o.openTop !== false
    };
    st.lo = clamp(o.values ? +o.values[0] : st.min, st.min, st.max);
    st.hi = clamp(o.values ? +o.values[1] : st.max, st.min, st.max);

    host.innerHTML =
      '<div class="crg">' +
        '<div class="crg-hist" aria-hidden="true"></div>' +
        '<div class="crg-track"><div class="crg-rail"></div><div class="crg-fill"></div>' +
          '<button type="button" class="crg-thumb" data-h="lo" role="slider" aria-label="' + (o.loLabel || 'Minimum') + '"><span class="crg-tip"></span></button>' +
          '<button type="button" class="crg-thumb" data-h="hi" role="slider" aria-label="' + (o.hiLabel || 'Maximum') + '"><span class="crg-tip"></span></button>' +
        '</div>' +
        '<div class="crg-boxes">' +
          '<label class="crg-box"><span>Minimum</span><div><em class="crg-cur"></em><input inputmode="numeric" data-h="lo" aria-label="Minimum amount"></div></label>' +
          '<i class="crg-dash" aria-hidden="true"></i>' +
          '<label class="crg-box"><span>Maximum</span><div><em class="crg-cur"></em><input inputmode="numeric" data-h="hi" aria-label="Maximum amount"></div></label>' +
        '</div>' +
      '</div>';
    var root = host.firstChild;
    var track = root.querySelector('.crg-track');
    var fill = root.querySelector('.crg-fill');
    var hist = root.querySelector('.crg-hist');
    var th = { lo: root.querySelector('[data-h=lo].crg-thumb'), hi: root.querySelector('[data-h=hi].crg-thumb') };
    var box = { lo: root.querySelector('input[data-h=lo]'), hi: root.querySelector('input[data-h=hi]') };

    function pct(v) { return st.max > st.min ? (v - st.min) / (st.max - st.min) * 100 : 0; }
    function snap(v) { return clamp(Math.round((v - st.min) / st.step) * st.step + st.min, st.min, st.max); }
    function label(h) {
      var v = h === 'lo' ? st.lo : st.hi;
      if (h === 'hi' && st.openTop && v >= st.max) return st.format(v) + '+';
      return st.format(v);
    }
    function drawHist() {
      var n = st.hist.length;
      if (!n) { hist.innerHTML = ''; hist.style.display = 'none'; return; }
      hist.style.display = '';
      var top = Math.max.apply(null, st.hist.concat([1]));
      if (hist.children.length !== n) {
        hist.innerHTML = st.hist.map(function () { return '<i class="crg-bar"></i>'; }).join('');
      }
      Array.prototype.forEach.call(hist.children, function (b, i) {
        var c = st.hist[i] || 0;
        b.style.height = (c ? Math.max(8, c / top * 100) : 3) + '%';
        var a = st.min + (st.max - st.min) * i / n, z = st.min + (st.max - st.min) * (i + 1) / n;
        b.classList.toggle('in', c > 0 && z > st.lo && a < st.hi);
      });
    }
    function paint(skipBoxes) {
      var a = pct(st.lo), b = pct(st.hi);
      th.lo.style.left = a + '%'; th.hi.style.left = b + '%';
      fill.style.left = a + '%'; fill.style.width = Math.max(0, b - a) + '%';
      th.lo.querySelector('.crg-tip').textContent = label('lo');
      th.hi.querySelector('.crg-tip').textContent = label('hi');
      ['lo', 'hi'].forEach(function (h) {
        var t = th[h];
        t.setAttribute('aria-valuemin', st.min); t.setAttribute('aria-valuemax', st.max);
        t.setAttribute('aria-valuenow', h === 'lo' ? st.lo : st.hi);
        t.setAttribute('aria-valuetext', label(h));
      });
      /* The handle you can still move sits on top when they meet. */
      th.lo.style.zIndex = st.lo >= st.max - st.step ? 3 : 2;
      th.hi.style.zIndex = st.lo >= st.max - st.step ? 2 : 3;
      if (!skipBoxes) {
        if (D.activeElement !== box.lo) box.lo.value = st.format(st.lo, true);
        if (D.activeElement !== box.hi) box.hi.value = st.openTop && st.hi >= st.max ? st.format(st.hi, true) + '+' : st.format(st.hi, true);
      }
      root.querySelectorAll('.crg-cur').forEach(function (e) { e.textContent = st.prefix; });
      drawHist();
    }
    function setVal(h, v, emit) {
      v = snap(v);
      if (h === 'lo') st.lo = Math.min(v, st.hi - (st.hi > st.min ? st.step : 0));
      else st.hi = Math.max(v, st.lo + (st.lo < st.max ? st.step : 0));
      st.lo = clamp(st.lo, st.min, st.max); st.hi = clamp(st.hi, st.min, st.max);
      paint();
      if (emit && o.onInput) o.onInput(st.lo, st.hi);
    }
    function commit() { if (o.onChange) o.onChange(st.lo, st.hi); }

    /* Dragging. Pressing the track jumps the nearer handle there and
       keeps dragging it, which is how every good range control behaves. */
    var drag = null;
    function valueAt(x) {
      var r = track.getBoundingClientRect();
      return st.min + clamp((x - r.left) / r.width, 0, 1) * (st.max - st.min);
    }
    track.addEventListener('pointerdown', function (e) {
      if (e.button != null && e.button !== 0) return;
      var v = valueAt(e.clientX);
      var h = e.target.closest('.crg-thumb') ? e.target.closest('.crg-thumb').getAttribute('data-h')
        : (Math.abs(v - st.lo) <= Math.abs(v - st.hi) && !(v > st.hi) ? 'lo' : 'hi');
      if (st.lo === st.hi) h = v < st.lo ? 'lo' : 'hi';
      drag = { h: h, id: e.pointerId };
      th[h].classList.add('drag');
      try { track.setPointerCapture(e.pointerId); } catch (x) {}
      try { th[h].focus({ preventScroll: true }); } catch (x) {}
      setVal(h, v, true);
      e.preventDefault();
    });
    track.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      setVal(drag.h, valueAt(e.clientX), true);
    });
    function end(e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      th[drag.h].classList.remove('drag');
      drag = null;
      commit();
    }
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);
    track.addEventListener('lostpointercapture', end);

    ['lo', 'hi'].forEach(function (h) {
      th[h].addEventListener('keydown', function (e) {
        var v = h === 'lo' ? st.lo : st.hi, big = st.step * 10, n = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') n = v + st.step;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') n = v - st.step;
        else if (e.key === 'PageUp') n = v + big;
        else if (e.key === 'PageDown') n = v - big;
        else if (e.key === 'Home') n = st.min;
        else if (e.key === 'End') n = st.max;
        if (n == null) return;
        e.preventDefault();
        setVal(h, n, true);
        clearTimeout(th[h]._t);
        th[h]._t = setTimeout(commit, 260);
      });
      var inp = box[h];
      inp.addEventListener('focus', function () {
        var v = h === 'lo' ? st.lo : st.hi;
        inp.value = String(Math.round(v));
        setTimeout(function () { try { inp.select(); } catch (x) {} }, 0);
      });
      function fromBox() {
        var raw = String(inp.value).replace(/[^\d.]/g, '');
        if (raw === '') { setVal(h, h === 'lo' ? st.min : st.max, true); }
        else setVal(h, parseFloat(raw), true);
        commit();
      }
      inp.addEventListener('change', fromBox);
      inp.addEventListener('blur', function () { paint(); });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); fromBox(); inp.blur(); } });
    });

    paint();
    return {
      el: root,
      values: function () { return [st.lo, st.hi]; },
      set: function (lo, hi) {
        st.lo = clamp(snap(lo), st.min, st.max);
        st.hi = clamp(snap(hi), st.min, st.max);
        if (st.hi < st.lo) st.hi = st.lo;
        paint();
      },
      update: function (u) {
        u = u || {};
        if (u.min != null) st.min = +u.min;
        if (u.max != null) st.max = +u.max;
        if (u.step != null) st.step = +u.step || 1;
        if (u.hist) st.hist = u.hist;
        if (u.format) st.format = u.format;
        if (u.prefix != null) st.prefix = u.prefix;
        if (u.values) { st.lo = +u.values[0]; st.hi = +u.values[1]; }
        st.lo = clamp(st.lo, st.min, st.max); st.hi = clamp(st.hi, st.min, st.max);
        paint();
      },
      atBounds: function () { return { low: st.lo <= st.min, high: st.hi >= st.max }; }
    };
  }

  global.CabanaRange = { mount: mount };
})(window);
