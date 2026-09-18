/* A ten-second journey to the SAME public area used by the listing map.
   Only an already-approximated point crosses this module's boundary. */
(function () {
  'use strict';
  if (window.CabanaLocationFlight) return;
  const DURATION = 10000;
  let active = null, atlasPromise;
  const clamp = n => Math.max(0, Math.min(1, n));
  const ease = n => { n = clamp(n); return n * n * (3 - 2 * n); };
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  function atlas() {
    if (!atlasPromise) atlasPromise = fetch('/cabana-world-atlas.json').then(r => {
      if (!r.ok) throw new Error('Atlas unavailable');
      return r.json();
    }).catch(() => { atlasPromise = null; return null; });
    return atlasPromise;
  }
  function close() {
    const s = active;
    if (!s) return;
    active = null;
    clearTimeout(s.timeout);
    cancelAnimationFrame(s.frame);
    document.removeEventListener('visibilitychange', s.visibility);
    s.motion?.removeEventListener?.('change', s.motionChange);
    s.observer?.disconnect();
    s.globe?.destroy();
    s.skin?.destroy();
    s.map?.remove();
    s.dialog.close();
    s.dialog.remove();
    document.body.style.overflow = s.overflow;
    if (s.returnFocus?.isConnected) s.returnFocus.focus({ preventScroll: true });
  }
  function open(options = {}) {
    close();
    const dialog = document.createElement('dialog');
    dialog.className = 'cabana-location-flight';
    dialog.setAttribute('aria-labelledby', 'cabana-flight-title');
    dialog.setAttribute('aria-describedby', 'cabana-flight-privacy');
    dialog.innerHTML = '<header class="clf-header"><div class="clf-brand">cabana<span>A little closer to your stay</span></div><div class="clf-actions"><span class="clf-count" aria-hidden="true">10s</span><button type="button" data-flight-close aria-label="Close location preview">Skip <span aria-hidden="true">×</span></button></div></header>' +
      '<div class="clf-scene"><div class="clf-stars" aria-hidden="true"></div><canvas class="clf-globe" aria-hidden="true"></canvas><div class="clf-map" aria-label="Map of the approximate listing area"></div><div class="clf-shade" aria-hidden="true"></div>' +
      '<div class="clf-heading"><p class="clf-eyebrow">FROM THE WORLD TO YOUR STAY</p><h2 id="cabana-flight-title"></h2><p class="clf-destination"></p></div>' +
      '<div class="clf-position"><span class="clf-stage-number" aria-hidden="true">01 / 05</span><div><span class="clf-stage-label">The journey begins</span><strong class="clf-stage-name">Our world</strong></div></div>' +
      '<span class="clf-area-label" hidden>Approximate area</span><p class="clf-map-status" role="status"></p><span class="clf-geography-credit">Globe: Natural Earth</span></div>' +
      '<footer class="clf-footer"><ol class="clf-steps" aria-label="Location journey"><li>World</li><li>Continent</li><li>Country</li><li>City / town</li><li>Area</li></ol><div class="clf-bottom"><p id="cabana-flight-privacy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><span>Exact location available after booking.<small>This preview shows the approximate area.</small></span></p><button type="button" class="clf-continue" data-flight-close>View listing <span aria-hidden="true">↗</span></button></div><div class="clf-timer" aria-hidden="true"><i></i></div></footer>';
    const s = {
      dialog, start: performance.now(), deadline: Date.now() + DURATION,
      overflow: document.body.style.overflow,
      returnFocus: options.returnFocus || document.activeElement,
      motion: window.matchMedia?.('(prefers-reduced-motion: reduce)'),
      stage: -1, mapStage: -1, center: null, tilesReady: false,
      country: String(options.country || ''), city: String(options.city || ''),
      area: String(options.area || ''), continent: ''
    };
    active = s;
    const find = selector => dialog.querySelector(selector);
    find('h2').textContent = String(options.name || 'Your next stay');
    find('.clf-destination').textContent = [s.city, s.country].filter(Boolean).join(', ');
    const canvas = find('canvas'), mapHost = find('.clf-map'), status = find('.clf-map-status');
    const steps = Array.from(dialog.querySelectorAll('.clf-steps li'));
    dialog.querySelectorAll('[data-flight-close]').forEach(button => button.addEventListener('click', close));
    dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
    // Do not let Escape also close the underlying listing/map.
    dialog.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      if (e.key === 'Tab') {
        const controls = Array.from(dialog.querySelectorAll('button:not([disabled]), a[href]')).filter(el =>
          el.getClientRects().length && (!el.closest('.clf-map') || dialog.classList.contains('clf-map-visible')));
        if (!controls.length) return;
        e.preventDefault(); e.stopPropagation();
        const index = controls.indexOf(document.activeElement);
        controls[(index + (e.shiftKey ? -1 : 1) + controls.length) % controls.length].focus();
      }
    });
    dialog.addEventListener('click', e => { if (e.target === dialog) close(); });
    document.body.appendChild(dialog);
    document.body.style.overflow = 'hidden';
    // No network, map, or canvas dependency can extend this deadline.
    s.timeout = setTimeout(() => { if (active === s) close(); }, DURATION);
    try { dialog.showModal(); } catch (_) { close(); return; }
    find('[data-flight-close]').focus({ preventScroll: true });
    s.visibility = () => { if (active === s && Date.now() >= s.deadline) close(); };
    document.addEventListener('visibilitychange', s.visibility);
    s.motionChange = () => { s.mapStage = -1; s.map?.stop(); };
    s.motion?.addEventListener?.('change', s.motionChange);
    if (window.ResizeObserver) {
      s.observer = new ResizeObserver(() => { if (active === s) s.map?.invalidateSize({ animate: false }); });
      s.observer.observe(mapHost);
    }
    Promise.resolve().then(() => window.CabanaLocationGlobe?.create(canvas)).then(globe => {
      if (active !== s) { globe?.destroy(); return; }
      s.globe = globe;
    }).catch(() => { if (active === s) dialog.classList.add('clf-no-globe'); });
    atlas().then(data => {
      if (active !== s || !data?.places) return;
      let country = normalize(s.country);
      if (/^[a-z]{2}$/.test(country)) {
        try { country = normalize(new Intl.DisplayNames(['en'], { type: 'region' }).of(country.toUpperCase())); } catch (_) { /* use stored name */ }
      }
      const place = data.places.find(p => country && normalize(p.country) === country && normalize(p.name) === normalize(s.city)) ||
        data.places.find(p => country && normalize(p.country) === country);
      const names = { africa: 'Africa', europe: 'Europe', asia: 'Asia', americas: 'The Americas', oceania: 'Oceania' };
      s.continent = names[place?.continent] || '';
    });
    Promise.resolve(options.areaPromise).then(area => {
      if (active !== s) return;
      if (!area || !Array.isArray(area.center) || area.center.length !== 2 ||
          !area.center.every(Number.isFinite) || Math.abs(area.center[0]) > 90 || Math.abs(area.center[1]) > 180) {
        status.textContent = 'A location preview is not available for this stay yet.';
        s.unavailable = true;
        return;
      }
      s.center = area.center.slice();
      // Raster maps stop at the Mercator poles. Never claim a clamped point is the listing.
      if (Math.abs(s.center[0]) > 85) throw new Error('Outside street-map coverage');
      return window.ApaMap.load().then(L => {
        if (active !== s) return;
        s.map = L.map(mapHost, { center: s.center, zoom: s.motion?.matches ? 14 : 3,
          zoomSnap: 0, zoomControl: false, attributionControl: true, dragging: false,
          scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, boxZoom: false,
          keyboard: false, minZoom: 2, maxZoom: 16, fadeAnimation: true });
        s.map.attributionControl?.setPrefix(false);
        // Reuse Cabana's licensed basemap and its tile-provider fallback.
        s.skin = window.ApaMap.paintBase(L, s.map, 'daylight', { maxZoom: 16 });
        const ready = () => { if (active === s) s.tilesReady = true; };
        s.skin.base.on('tileload', ready);
        // Fallback replacement layers also count as ready.
        s.map.on('layeradd', e => { if (e.layer?.on) e.layer.on('tileload', ready); });
        L.circle(s.center, { radius: area.radius || 500, color: '#8254ff', weight: 2,
          fillColor: '#8254ff', fillOpacity: .17, interactive: false }).addTo(s.map);
        s.map.invalidateSize({ animate: false });
      });
    }).catch(() => {
      if (active === s) { s.mapFailed = true; status.textContent = 'The area map is temporarily unavailable. You can continue to the listing.'; }
    });
    function frame() {
      if (active !== s) return;
      const elapsed = Math.max(performance.now() - s.start, DURATION - (s.deadline - Date.now()));
      if (elapsed >= DURATION) { close(); return; }
      const reduced = !!s.motion?.matches;
      dialog.classList.toggle('clf-reduced', reduced);
      const stage = !s.center ? 0 : reduced ? 4 : elapsed < 1800 ? 0 : elapsed < 3500 ? 1 : elapsed < 5200 ? 2 : elapsed < 6900 ? 3 : 4;
      const labels = ['Our world', s.continent || 'Your continent', s.country || 'Your country', s.city || 'Your city / town', s.area || s.city || 'Your stay’s neighbourhood'];
      const captions = ['The journey begins', 'A little closer', 'Across the country', 'Explore the surroundings', 'You’re in the right area'];
      if (s.stage !== stage || find('.clf-stage-name').textContent !== labels[stage]) {
        s.stage = stage;
        dialog.dataset.stage = String(stage);
        find('.clf-stage-number').textContent = '0' + (stage + 1) + ' / 05';
        find('.clf-stage-label').textContent = s.unavailable ? 'Location preview unavailable' : captions[stage];
        find('.clf-stage-name').textContent = labels[stage];
        steps.forEach((step, index) => {
          step.classList.toggle('clf-reached', index <= stage);
          if (index === stage) step.setAttribute('aria-current', 'step'); else step.removeAttribute('aria-current');
        });
      }
      const remaining = Math.ceil((DURATION - elapsed) / 1000) + 's';
      if (find('.clf-count').textContent !== remaining) find('.clf-count').textContent = remaining;
      find('.clf-timer i').style.transform = 'scaleX(' + clamp(1 - elapsed / DURATION) + ')';
      if (s.globe && (reduced || elapsed < 4600 || !s.tilesReady)) {
        const turn = ease(elapsed / 2500), zoom = ease((elapsed - 2200) / 1900);
        const lat = s.center ? s.center[0] : 14, lng = s.center ? s.center[1] : 24;
        try {
          s.globe.draw({ lat: reduced ? lat : 14 + (lat - 14) * turn,
            lng: reduced ? lng : lng - 145 * (1 - turn), scale: reduced ? 1 : 1 + 3.2 * zoom });
        } catch (_) { s.globe.destroy(); s.globe = null; }
      }
      if (s.map && !s.mapFailed && s.center && s.mapStage !== stage) {
        s.mapStage = stage;
        const zoom = [3, 3, 6, 10.5, 14][stage];
        if (reduced || elapsed > 8500) s.map.setView(s.center, 14, { animate: false });
        else s.map.flyTo(s.center, zoom, { duration: stage === 4 ? 1.25 : 1.35, easeLinearity: .25 });
      }
      const mapVisible = !!s.map && !s.mapFailed && s.tilesReady && (reduced || elapsed >= 3500);
      dialog.classList.toggle('clf-map-visible', mapVisible);
      find('.clf-area-label').hidden = !mapVisible || stage !== 4;
      const loading = 'Loading the area map… You can continue to the listing at any time.';
      if (elapsed > 6500 && !s.tilesReady && s.center && !s.mapFailed && status.textContent !== loading) status.textContent = loading;
      else if (mapVisible && status.textContent) status.textContent = '';
      s.frame = requestAnimationFrame(frame);
    }
    s.frame = requestAnimationFrame(frame);
  }
  window.addEventListener('pagehide', close);
  window.CabanaLocationFlight = { open, close };
  // Start only after the page is usable; this keeps the first click cinematic.
  const warm = () => { atlas(); window.CabanaLocationGlobe?.preload?.().catch(() => {}); };
  if (window.requestIdleCallback) window.requestIdleCallback(warm, { timeout: 2500 });
  else setTimeout(warm, 1200);
})();
