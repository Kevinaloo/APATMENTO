/* A fifteen-second journey to the SAME public area used by the listing map.
   Only an already-approximated point crosses this module's boundary.

   Time here is MEDIA time: the clock advances by what the guest actually
   saw, one capped step per frame, never by the wall clock. A hitch, a
   background tab or a slow tile therefore costs a moment of waiting, not
   a skipped scene, and fifteen seconds really is fifteen seconds of
   journey. The camera is one continuous path (a great circle, with a
   log-scale zoom), the street map is warmed up invisibly at the exact
   zoom the globe has reached, and the handoff waits for its tiles. */
(function () {
  'use strict';
  if (window.CabanaLocationFlight) return;
  const DURATION = 15000;                    // media time: what the guest sees
  const STAGE_AT = [0, 3000, 6000, 9000, 12000];
  const PAN_END = 6200;                      // globe has turned to the property
  const HANDOFF_AT = 8200;                   // globe fills the frame; map takes over
  const ARRIVE_AT = 12600;                   // map lands; the rest is a calm hold
  const HOLD_MAX = 3500;                     // longest we wait for tiles (wall ms)
  const HARD_MAX = DURATION + HOLD_MAX + 2000;
  const GLOBE_END_SCALE = 4.4;
  const FRAME_CAP = 50, SLOW_CAP = 250;      // ms of media time one frame may add
  let active = null, atlasPromise;
  const clamp = n => Math.max(0, Math.min(1, n));
  const easeInOut = n => { n = clamp(n); return n < .5 ? 4 * n * n * n : 1 - Math.pow(-2 * n + 2, 3) / 2; };
  const smoother = n => { n = clamp(n); return n * n * n * (n * (n * 6 - 15) + 10); };
  const RAD = Math.PI / 180;
  const toVec = (lat, lng) => [Math.cos(lat * RAD) * Math.cos(lng * RAD), Math.cos(lat * RAD) * Math.sin(lng * RAD), Math.sin(lat * RAD)];
  const fromVec = v => ({ lat: Math.asin(Math.max(-1, Math.min(1, v[2]))) / RAD, lng: Math.atan2(v[1], v[0]) / RAD });
  // Great-circle interpolation: the camera takes the real shortest path over the globe.
  function slerp(a, b, t) {
    const A = toVec(a.lat, a.lng), B = toVec(b.lat, b.lng);
    const w = Math.acos(Math.max(-1, Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2])));
    if (w < 1e-6) return { lat: b.lat, lng: b.lng };
    const sw = Math.sin(w);
    if (sw < 1e-3) return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
    const sa = Math.sin((1 - t) * w) / sw, sb = Math.sin(t * w) / sw;
    return fromVec([A[0] * sa + B[0] * sb, A[1] * sa + B[1] * sb, A[2] * sa + B[2] * sb]);
  }
  const wrapLng = n => ((n + 540) % 360) - 180;
  /* The Leaflet zoom whose scale matches a globe of this size at the property's
     latitude, so the globe-to-map crossfade lines up instead of jumping. */
  function matchZoom(lat, w, h, scale) {
    const radius = Math.min(w * .43, h * .42) * scale;
    const z = Math.log2(2 * Math.PI * radius * Math.max(.2, Math.cos(lat * RAD)) / 256);
    return Number.isFinite(z) ? Math.max(2, Math.min(9, z)) : 4;
  }
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
    cancelAnimationFrame(s.frame); clearTimeout(s.tick);
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
    dialog.innerHTML = '<header class="clf-header"><div class="clf-brand">cabana<span>A little closer to your stay</span></div><div class="clf-actions"><span class="clf-count" aria-hidden="true">' + (DURATION / 1000) + 's</span><button type="button" data-flight-close aria-label="Close location preview">Skip <span aria-hidden="true">×</span></button></div></header>' +
      '<div class="clf-scene"><div class="clf-stars" aria-hidden="true"></div><canvas class="clf-globe" aria-hidden="true"></canvas><div class="clf-map" aria-label="Map of the approximate listing area"></div><span class="clf-beacon" aria-hidden="true"></span><div class="clf-shade" aria-hidden="true"></div>' +
      '<div class="clf-heading"><p class="clf-eyebrow">FROM THE WORLD TO YOUR STAY</p><h2 id="cabana-flight-title"></h2><p class="clf-destination"></p></div>' +
      '<div class="clf-position"><span class="clf-stage-number" aria-hidden="true">01 / 05</span><div><span class="clf-stage-label">The journey begins</span><strong class="clf-stage-name">Our world</strong></div></div>' +
      '<span class="clf-area-label" hidden>Approximate area</span><p class="clf-map-status" role="status"></p><span class="clf-geography-credit">Globe: Natural Earth</span></div>' +
      '<footer class="clf-footer"><ol class="clf-steps" aria-label="Location journey"><li>World</li><li>Continent</li><li>Country</li><li>City / town</li><li>Area</li></ol><div class="clf-bottom"><p id="cabana-flight-privacy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><span>Exact location available after booking.<small>This preview shows the approximate area.</small></span></p><button type="button" class="clf-continue" data-flight-close>View listing <span aria-hidden="true">↗</span></button></div><div class="clf-timer" aria-hidden="true"><i></i></div></footer>';
    const s = {
      dialog, deadline: Date.now() + HARD_MAX, clock: 0, last: 0, held: 0, ema: 16, frames: 0, quality: 0, areaPending: true,
      overflow: document.body.style.overflow,
      returnFocus: options.returnFocus || document.activeElement,
      motion: window.matchMedia?.('(prefers-reduced-motion: reduce)'),
      stage: -1, center: null,
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
    s.timeout = setTimeout(() => { if (active === s) close(); }, HARD_MAX);
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
      s.areaPending = false;
      if (!area || !Array.isArray(area.center) || area.center.length !== 2 ||
          !area.center.every(Number.isFinite) || Math.abs(area.center[0]) > 90 || Math.abs(area.center[1]) > 180) {
        status.textContent = 'A location preview is not available for this stay yet.';
        s.unavailable = true;
        s.cutAt = s.clock + 3500;       // nothing to fly to: do not keep the guest waiting
        return;
      }
      s.center = area.center.slice();
      // Raster maps stop at the Mercator poles. Never claim a clamped point is the listing.
      if (Math.abs(s.center[0]) > 85) throw new Error('Outside street-map coverage');
      return window.ApaMap.load().then(L => {
        if (active !== s) return;
        // Warm the street map invisibly at the zoom the globe will hand over at,
        // so its tiles are already there when the crossfade happens.
        s.sceneW = mapHost.clientWidth || 390; s.sceneH = mapHost.clientHeight || 560;
        s.zMatch = matchZoom(s.center[0], s.sceneW, s.sceneH, GLOBE_END_SCALE);
        s.map = L.map(mapHost, { center: s.center, zoom: s.motion?.matches ? 14 : s.zMatch,
          zoomSnap: 0, zoomControl: false, attributionControl: true, dragging: false,
          scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, boxZoom: false,
          keyboard: false, minZoom: 2, maxZoom: 16, fadeAnimation: true });
        s.map.attributionControl?.setPrefix(false);
        // Reuse Cabana's licensed basemap and its tile-provider fallback.
        s.skin = window.ApaMap.paintBase(L, s.map, 'daylight', { maxZoom: 16 });
        s.mapAt = performance.now();
        // 'load' fires when every tile for the current view has arrived.
        const seen = () => { if (active === s) s.tilesSeen = true; };
        const loaded = () => { if (active === s) s.mapReady = true; };
        s.skin.base.on('tileload', seen);
        s.skin.base.on('load', loaded);
        // Fallback replacement layers count too.
        s.map.on('layeradd', e => { if (e.layer?.on) { e.layer.on('tileload', seen); e.layer.on('load', loaded); } });
        // The area circle is added only on arrival. Leaflet scales vector layers
        // during a zoom animation, which turns a 2 px stroke into a screen-sized blob.
        s.circle = L.circle(s.center, { radius: area.radius || 500, color: '#8254ff', weight: 2,
          fillColor: '#8254ff', fillOpacity: .17, interactive: false, className: 'clf-area' });
        s.map.invalidateSize({ animate: false });
      });
    }).catch(() => {
      if (active === s) { s.mapFailed = true; status.textContent = 'The area map is temporarily unavailable. You can continue to the listing.'; }
    });
    const el = {
      number: find('.clf-stage-number'), label: find('.clf-stage-label'), name: find('.clf-stage-name'),
      count: find('.clf-count'), timer: find('.clf-timer i'), area: find('.clf-area-label')
    };
    const labels = () => ['Our world', s.continent || 'Your continent', s.country || 'Your country', s.city || 'Your city / town', s.area || s.city || 'Your stay’s neighbourhood'];
    const captions = ['The journey begins', 'A little closer', 'Across the country', 'Explore the surroundings', 'You’re in the right area'];
    // The hidden street map is ready once its tiles are in (or have clearly started to arrive).
    const mapIsReady = now => !!s.map && !s.mapFailed && (s.mapReady || (s.tilesSeen && now - s.mapAt > 2200));
    function showMap() {
      s.mapShown = true;
      dialog.classList.add('clf-map-visible');
    }
    function frame(now) {
      if (active !== s) return;
      const rawDt = s.last ? now - s.last : 16;
      const reduced = !!s.motion?.matches || !!window.CabanaCalm?.lowPower?.() || !!s.light;
      dialog.classList.toggle('clf-reduced', reduced);
      const cap = s.handoffDone || reduced ? SLOW_CAP : FRAME_CAP;
      const dt = Math.max(0, Math.min(rawDt, cap));
      s.last = now;

      /* Quality governor: if frames are arriving late, simplify the globe rather
         than let the journey stutter. It only ever steps down. */
      if (s.globe && !s.handoffDone && !reduced) {
        s.ema = s.ema * .9 + Math.min(rawDt, 120) * .1;
        if (++s.frames > 12 && s.ema > 24) {
          if (s.quality < 2) {
            s.quality += 1; s.frames = 0; s.ema = 16;
            try { s.globe.setQuality?.(s.quality); } catch (_) { /* cosmetic */ }
          } else if (s.ema > 55 && s.frames > 24) {
            /* Even the simplest globe cannot keep up on this device. A stuttering
               flight is worse than none: show the still arrival, then continue. */
            s.light = true; s.cutAt = s.clock + 4500;
          }
        }
      }

      /* The media clock. It waits (almost stands still) at the handoff while the
         street map is still arriving, so lag never eats the scenes after it. */
      const waiting = !reduced && !s.handoffDone && s.clock >= HANDOFF_AT && !s.unavailable && !s.mapFailed &&
        (s.areaPending || !mapIsReady(now)) && s.held < HOLD_MAX;
      if (waiting) s.held += dt;
      s.clock += dt * (waiting ? .06 : 1);
      const t = s.clock;
      if (t >= DURATION || (s.cutAt && t >= s.cutAt)) { close(); return; }

      const stage = !s.center ? 0 : reduced ? 4 : t < STAGE_AT[1] ? 0 : t < STAGE_AT[2] ? 1 : t < STAGE_AT[3] ? 2 : t < STAGE_AT[4] ? 3 : 4;
      if (s.stage !== stage || el.name.textContent !== labels()[stage]) {
        s.stage = stage;
        dialog.dataset.stage = String(stage);
        el.number.textContent = '0' + (stage + 1) + ' / 05';
        el.label.textContent = s.unavailable ? 'Location preview unavailable' : captions[stage];
        el.name.textContent = labels()[stage];
        steps.forEach((step, index) => {
          step.classList.toggle('clf-reached', index <= stage);
          if (index === stage) step.setAttribute('aria-current', 'step'); else step.removeAttribute('aria-current');
        });
      }
      const remaining = Math.ceil((DURATION - t) / 1000) + 's';
      if (el.count.textContent !== remaining) el.count.textContent = remaining;
      const bar = clamp(1 - t / DURATION).toFixed(3);
      if (s.bar !== bar) { s.bar = bar; el.timer.style.transform = 'scaleX(' + bar + ')'; }

      // ── Camera ──
      if (s.center && !s.cam0) {
        // First moment the destination is known: start from the far side of the world.
        s.pathStart = t;
        s.cam0 = t < 400 ? { lat: 20, lng: wrapLng(s.center[1] - 95) } : { lat: (s.idle || { lat: 20 }).lat, lng: (s.idle || { lng: 25 }).lng };
      }
      if (!s.center) s.idle = { lat: 20, lng: wrapLng(25 + t * .003) };   // a slow, living globe until we know where
      let view = null;
      if (s.globe && (reduced || !s.handoffDone || t < HANDOFF_AT + 900)) {
        if (reduced) view = { lat: s.center ? s.center[0] : 14, lng: s.center ? s.center[1] : 24, scale: 1 };
        else if (s.cam0) {
          const P = clamp((t - s.pathStart) / Math.max(1, HANDOFF_AT - s.pathStart));
          const pan = easeInOut(P / (PAN_END / HANDOFF_AT)), zoomP = smoother((P - .22) / .78);
          const at = slerp(s.cam0, { lat: s.center[0], lng: s.center[1] }, pan);
          view = { lat: at.lat, lng: at.lng, scale: Math.exp(Math.log(GLOBE_END_SCALE) * zoomP),
            pin: [s.center[0], s.center[1]], pinAlpha: smoother((P - .35) / .4) };
        } else view = { lat: s.idle.lat, lng: s.idle.lng, scale: 1 };
        try { s.globe.draw(view); } catch (_) { s.globe.destroy(); s.globe = null; }
      }

      // ── Handoff: the globe hands over to the street map at matching scale ──
      if (s.map && !s.mapFailed && s.center) {
        if (reduced) {
          if (!s.mapShown) { s.map.setView(s.center, 14, { animate: false }); showMap(); }
        } else if (!s.handoffDone && t >= HANDOFF_AT && (mapIsReady(now) || s.held >= HOLD_MAX)) {
          s.handoffDone = true;
          const z = matchZoom(s.center[0], s.sceneW || 390, s.sceneH || 560, GLOBE_END_SCALE);
          s.map.setView(s.center, z, { animate: false });
          showMap();
          s.map.flyTo(s.center, 14, { duration: Math.max(1.8, (ARRIVE_AT - t) / 1000), easeLinearity: .3, noMoveStart: true });
        }
      }
      if (s.mapShown && s.circle && !s.circleOn && (reduced || t >= ARRIVE_AT - 700)) { s.circleOn = true; s.circle.addTo(s.map); }
      el.area.hidden = !s.mapShown || stage !== 4;
      const loading = 'Loading the area map… You can continue to the listing at any time.';
      if (waiting && s.held > 1200 && status.textContent !== loading) status.textContent = loading;
      else if (s.mapShown && status.textContent) status.textContent = '';

      /* The globe needs every frame the screen can give. Once the street map is
         doing the work (it animates itself) the loop only updates captions, so it
         drops to ten ticks a second. */
      if (s.handoffDone || reduced) s.tick = setTimeout(() => { s.frame = requestAnimationFrame(frame); }, 100);
      else s.frame = requestAnimationFrame(frame);
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
