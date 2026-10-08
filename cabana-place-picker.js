/* ════════════════════════════════════════════════════════════════════
   CABANA · FULL-SCREEN PLACE PICKER  (cabana-place-picker.js)

   A 280px map squeezed between form fields is the wrong tool for
   placing a pin: the thumb covers the target, the page scrolls instead
   of the map, and the free basemaps we use need the host's eye to make
   up for what the geocoder cannot see. So the map now opens the whole
   screen, on the ordinary street map, with the pin fixed in the centre
   and the world moving underneath it. Satellite is one tap away.

     CabanaPlace.open(opts)   → Promise<place|null>   (null = cancelled)
       opts.lat, opts.lng     an existing pin to start from
       opts.fallback          [lat, lng] to open over when there is none
       opts.title / subtitle  what we are asking for
       opts.confirmLabel
     CabanaPlace.preview(el, { lat, lng, zoom })   a static, tile-only
                                                    preview: no Leaflet,
                                                    no scripts, one <div>

   The phone's own back button closes the picker (it pushes one history
   entry and listens for popstate), Escape closes it on a keyboard, and
   the page underneath never scrolls while it is open.
   Depends on ApaMap.picker (apa-map.js), which loads cabana-pinpoint.js.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.CabanaPlace) return;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ICON_GPS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><circle cx="12" cy="12" r="7.5"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3"/></svg>';
  const ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  const ICON_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  const CSS = `
.cpp{position:fixed;inset:0;z-index:12000;display:flex;flex-direction:column;background:#0b0d16;color:#10131f;font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;
  opacity:0;transform:translate3d(0,24px,0);transition:opacity .28s cubic-bezier(.22,1,.36,1),transform .34s cubic-bezier(.22,1,.36,1)}
.cpp.on{opacity:1;transform:none}
.cpp-top{display:flex;align-items:center;gap:10px;padding:calc(10px + env(safe-area-inset-top)) 12px 10px;background:#fff;box-shadow:0 1px 0 rgba(10,12,30,.08),0 8px 24px -18px rgba(10,12,30,.4);position:relative;z-index:2}
.cpp-x{flex:none;width:44px;height:44px;border-radius:14px;border:1px solid #e3e5ef;background:#fff;color:#10131f;display:grid;place-items:center;cursor:pointer}
.cpp-x svg{width:20px;height:20px}
.cpp-tt{flex:1;min-width:0}
.cpp-tt b{display:block;font-size:16px;font-weight:800;letter-spacing:-.02em;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cpp-tt span{display:block;font-size:12.5px;color:#5d6380;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cpp-gps{flex:none;display:inline-flex;align-items:center;gap:7px;height:44px;padding:0 14px;border-radius:14px;border:1px solid #dfe3f3;background:#f5f7ff;color:#1f3fd1;font:700 13.5px Inter,system-ui,sans-serif;cursor:pointer}
.cpp-gps svg{width:18px;height:18px}.cpp-gps.busy svg{animation:cppSpin 1s linear infinite}
@keyframes cppSpin{to{transform:rotate(360deg)}}
.cpp-map{position:relative;flex:1;min-height:0}
.cpp-map .cpin{position:absolute;inset:0;height:auto!important;min-height:0;border-radius:0}
.cpp-bar{position:relative;z-index:2;display:flex;align-items:center;gap:12px;padding:12px 14px calc(12px + env(safe-area-inset-bottom));background:#fff;box-shadow:0 -10px 30px -20px rgba(10,12,30,.5)}
.cpp-tip{flex:1;min-width:0;font-size:13px;line-height:1.45;color:#4a5070}
.cpp-tip b{color:#10131f}
.cpp-ok{flex:none;display:inline-flex;align-items:center;gap:8px;height:52px;padding:0 22px;border:0;border-radius:16px;background:linear-gradient(135deg,var(--cc-accent,#4f46e5),var(--cc-accent-2,#7c3aed));color:#fff;font:800 15px Inter,system-ui,sans-serif;cursor:pointer;box-shadow:0 14px 28px -14px var(--cc-accent,#4f46e5)}
.cpp-ok svg{width:19px;height:19px}.cpp-ok:disabled{opacity:.6}
@media (max-width:560px){.cpp-gps span{display:none}.cpp-gps{width:44px;padding:0;justify-content:center}
  .cpp-bar{flex-direction:column;align-items:stretch;gap:10px}.cpp-ok{justify-content:center;width:100%}.cpp-tip{font-size:12.5px;text-align:center}}
@media (prefers-reduced-motion:reduce){.cpp{transition:none;transform:none}}
.cpp-prev{position:relative;overflow:hidden;border-radius:16px;background:#e8ebf2;height:150px;isolation:isolate}
.cpp-prev-canvas{position:absolute;left:50%;top:50%;width:768px;height:768px;display:grid;grid-template-columns:repeat(3,256px);grid-template-rows:repeat(3,256px);filter:saturate(.8) contrast(1.03)}
.cpp-prev-canvas img{width:256px;height:256px;display:block;user-select:none;-webkit-user-drag:none}
.cpp-prev-pin{position:absolute;left:50%;top:50%;width:30px;height:38px;margin:-38px 0 0 -15px;filter:drop-shadow(0 4px 6px rgba(8,8,15,.4));z-index:2}
.cpp-prev-pin::before{content:'';position:absolute;left:3px;top:0;width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:linear-gradient(140deg,var(--cc-accent,#4f6dff),var(--cc-accent-2,#6d28ff));border:2.5px solid #fff}
.cpp-prev-pin::after{content:'';position:absolute;left:12px;top:9px;width:6px;height:6px;border-radius:50%;background:#fff}
.cpp-prev-pulse{position:absolute;left:50%;top:50%;width:46px;height:18px;margin:-9px 0 0 -23px;border-radius:50%;background:radial-gradient(closest-side,rgba(79,70,229,.35),transparent);z-index:1}
.cpp-prev-credit{position:absolute;right:6px;bottom:4px;z-index:3;font-size:9px;color:#4a4c66;background:rgba(255,255,255,.8);padding:1px 6px;border-radius:5px}`;

  function injectCSS() {
    if (document.getElementById('cpp-css')) return;
    const s = document.createElement('style'); s.id = 'cpp-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ── Static preview: three by three OSM tiles, the point centred ──── */
  function preview(el, o) {
    if (!el || !o || !isFinite(o.lat) || !isFinite(o.lng)) return;
    injectCSS();
    const z = o.zoom || 16;
    const n = Math.pow(2, z);
    const latRad = Math.max(-85.0511, Math.min(85.0511, o.lat)) * Math.PI / 180;
    const x = (o.lng + 180) / 360 * n;
    const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;
    const tx = Math.floor(x), ty = Math.floor(y);
    const ox = (x - (tx - 1)) * 256, oy = (y - (ty - 1)) * 256;
    let tiles = '';
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const xx = ((tx + i) % n + n) % n, yy = ty + j;
      tiles += yy < 0 || yy >= n ? '<span></span>'
        : `<img alt="" loading="lazy" decoding="async" src="https://tile.openstreetmap.org/${z}/${xx}/${yy}.png"/>`;
    }
    el.classList.add('cpp-prev');
    el.innerHTML = `<div class="cpp-prev-canvas" style="margin-left:${-ox.toFixed(1)}px;margin-top:${-oy.toFixed(1)}px">${tiles}</div>` +
      '<span class="cpp-prev-pulse"></span><span class="cpp-prev-pin" aria-hidden="true"></span>' +
      '<span class="cpp-prev-credit">© OpenStreetMap</span>';
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', o.label ? 'Map preview of ' + o.label : 'Map preview of the pinned location');
  }

  /* ── The full-screen picker ─────────────────────────────────────── */
  let openNow = null;

  function open(opts) {
    opts = opts || {};
    if (openNow) return openNow;
    injectCSS();
    const root = document.createElement('div');
    root.className = 'cpp';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'cpp-title');
    root.innerHTML =
      '<header class="cpp-top">' +
        '<button type="button" class="cpp-x" aria-label="Close the map without saving">' + ICON_X + '</button>' +
        '<div class="cpp-tt"><b id="cpp-title">' + esc(opts.title || 'Pin your exact location') + '</b>' +
        '<span>' + esc(opts.subtitle || 'Move the map until the pin sits on your entrance') + '</span></div>' +
        '<button type="button" class="cpp-gps">' + ICON_GPS + '<span>My location</span></button>' +
      '</header>' +
      '<div class="cpp-map"><div class="cpp-mount"></div></div>' +
      '<footer class="cpp-bar">' +
        '<div class="cpp-tip" aria-live="polite">Drag the map to move it under the pin. <b>Zoom right in</b> — the closer you are, the more accurate it is.</div>' +
        '<button type="button" class="cpp-ok">' + ICON_OK + '<span>' + esc(opts.confirmLabel || 'Confirm this spot') + '</span></button>' +
      '</footer>';
    document.body.appendChild(root);
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const lastFocus = document.activeElement;
    requestAnimationFrame(() => root.classList.add('on'));

    const mount = root.querySelector('.cpp-mount');
    const tip = root.querySelector('.cpp-tip');
    const ok = root.querySelector('.cpp-ok');
    const gps = root.querySelector('.cpp-gps');
    let handle = null, latest = null, closed = false;

    /* One history entry, so the phone's back button closes the map
       instead of leaving the listing form. */
    let pushed = false;
    try { history.pushState({ cpp: 1 }, ''); pushed = true; } catch (e) { /* sandboxed */ }

    const promise = new Promise(resolve => {
      function finish(result, fromPop) {
        if (closed) return; closed = true;
        window.removeEventListener('popstate', onPop);
        document.removeEventListener('keydown', onKey, true);
        root.classList.remove('on');
        setTimeout(() => { try { handle && handle.destroy && handle.destroy(); } catch (e) { /* */ } root.remove(); }, 260);
        document.documentElement.style.overflow = prevOverflow;
        if (pushed && !fromPop) { try { history.back(); } catch (e) { /* */ } }
        try { lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true }); } catch (e) { /* */ }
        openNow = null;
        resolve(result);
      }
      function onPop() { finish(null, true); }
      function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); finish(null); } }
      window.addEventListener('popstate', onPop);
      document.addEventListener('keydown', onKey, true);
      root.querySelector('.cpp-x').addEventListener('click', () => finish(null));

      gps.addEventListener('click', () => {
        if (!handle) return;
        gps.classList.add('busy');
        Promise.resolve(handle.locate && handle.locate()).finally(() => gps.classList.remove('busy'));
      });

      ok.addEventListener('click', async () => {
        if (!handle) return;
        ok.disabled = true; ok.querySelector('span').textContent = 'Reading the address…';
        let p = handle.get && handle.get();
        if (!p && handle.pin && handle.pin.map) {
          const c = handle.pin.map.getCenter();
          handle.set(c.lat, c.lng, handle.pin.map.getZoom());
          p = handle.get();
        }
        if (!p) { ok.disabled = false; ok.querySelector('span').textContent = opts.confirmLabel || 'Confirm this spot'; return; }
        /* The coordinates are the answer; the street name is a courtesy
           we wait a moment for, never longer. */
        let address = p.address || (latest && latest.address) || null;
        if (!address && window.ApaGeo && window.ApaGeo.reverse) {
          address = await Promise.race([window.ApaGeo.reverse(p.lat, p.lng).catch(() => null), new Promise(r => setTimeout(() => r(null), 2600))]);
        }
        finish(Object.assign({}, p, { address: address || null, label: p.label || (address && (address.short || address.name)) || null, source: p.source || 'manual' }));
      });
    });
    openNow = promise;

    const start = () => {
      if (!window.ApaMap || !window.ApaMap.picker) {
        if ((start.tries = (start.tries || 0) + 1) < 40) return setTimeout(start, 120);
        tip.textContent = 'The map could not load. Close this and type your address instead.'; ok.disabled = true; return;
      }
      window.ApaMap.picker(mount, {
        lat: isFinite(opts.lat) ? Number(opts.lat) : undefined,
        lng: isFinite(opts.lng) ? Number(opts.lng) : undefined,
        fallback: opts.fallback,
        height: '100%',
        view: 'map',
        crosshair: true,
        searchPlaceholder: opts.searchPlaceholder || 'Search a street, estate or landmark',
        onChange: p => {
          latest = p;
          if (p.pending) return;
          const where = p.label ? '<b>' + esc(p.label) + '</b>' : '<b>' + p.lat.toFixed(5) + ', ' + p.lng.toFixed(5) + '</b>';
          const good = p.precision === 'rooftop' || p.precision === 'parcel';
          tip.innerHTML = where + (good ? ' · looks precise.' : ' · zoom in and move the map onto your entrance for a precise pin.');
        }
      }).then(h => {
        handle = h;
        if (h && h.pin && h.pin.map && h.pin.map.scrollWheelZoom) h.pin.map.scrollWheelZoom.enable();
        if (h && h.pin && h.pin.searchInput && !(isFinite(opts.lat) && isFinite(opts.lng)) && window.matchMedia && matchMedia('(pointer: fine)').matches) {
          setTimeout(() => { try { h.pin.searchInput.focus({ preventScroll: true }); } catch (e) { /* */ } }, 350);
        }
      });
    };
    start();
    setTimeout(() => { try { root.querySelector('.cpp-x').focus({ preventScroll: true }); } catch (e) { /* */ } }, 60);
    return promise;
  }

  window.CabanaPlace = { open, preview };
})();
