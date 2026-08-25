/* ════════════════════════════════════════════════════════════════════
   cabana-globe.js — the Cabana world map.

   One map that holds everything Cabana is: 175 destinations across six
   continents, the corridors guests actually travel, and every bookable
   category sitting on the place it belongs to.

   ── WHERE THIS COMES FROM ─────────────────────────────────────────
   The camera behaviour, the label allocator, the sensor skins, the
   scene director and the share-link scheme are ported from God's Eye
   View (github.com/bilawalsidhu/gods-eye-view, MIT). That project is
   Cesium + Vite + a paid photorealistic tile key; Cabana is a static
   site with no build step and no metered map bill, so nothing was
   copied verbatim. What crossed over is the part that mattered — the
   *technique*:

     · a camera that pulls up, translates, then descends, instead of
       teleporting (director.js cameraPath altitude profile)
     · a label allocator that decides which of many overlapping labels
       survive, so a dense map stays readable (overlays/worldOverlay)
     · sensor styles as a first-class control, not a theme toggle
       (styles/*.js — GLSL there, CSS filters here)
     · shots as declarative data, replayable and shareable
       (scenes/recipes.js, sharelink.js)
     · every layer keeps its source and freshness on screen

   See NOTICE-gods-eye-view.md for the licence and a line-by-line map
   of what came from where.

   ── THE RULES ─────────────────────────────────────────────────────
   1. Nothing loads until a globe is mounted. Leaflet, the atlas and
      the tiles are all lazy — a page that never shows a map pays
      nothing for this file beyond its own bytes.

   2. Every place on the map has a real page behind it. The atlas is
      generated from what is on disk (seo/build_world_atlas.py), so
      the map can never advertise a destination that 404s.

   3. A count on screen is a count from the database. Places without
      live inventory show their price band and their page, never a
      fabricated number. Same discipline as the schema pipeline.

   4. Motion is never decoration alone. Every animation either shows
      the guest where they just went or where they could go next.

     CabanaGlobe.mount(el, opts)   → build the world map
     CabanaGlobe.atlas()           → the loaded inventory, as a promise
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  if (window.CabanaGlobe) return;

  var LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  var LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  var ATLAS_URL = '/cabana-world-atlas.json';

  /* Carto's basemaps carry an attribution requirement. It is not
     decoration — dropping it is a licence breach — so it is baked into
     the skin table rather than left to each caller. Same rule apa-map.js
     already follows; the two files must never disagree about this. */
  var ATTRIB =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> ' +
    '&copy; <a href="https://carto.com/attributions">CARTO</a>';

  /* ══ SKINS ═════════════════════════════════════════════════════════

     God's Eye View re-renders the whole planet through a sensor: CRT,
     NVG, FLIR, Noir. It does it in GLSL against a Cesium post-process
     stage, which needs a render pipeline Cabana does not have and does
     not want.

     The insight survives the translation intact: the *optics* are a
     control the guest holds, not a theme an engineer picked. A raster
     basemap plus a CSS filter chain reaches most of the way there for
     none of the cost, and CSS filters are GPU-composited, so a skin
     change is a repaint rather than a reload.

     Each entry below is a real port. `noir` is styles/noir.js's maths
     read back into filter primitives: desaturate → S-curve contrast →
     sepia tint → vignette (the vignette is the overlay element, since
     CSS has no radial term). `nightglass` is what surveillance.js does
     to a night scene. The rest are Cabana's own, invented to give the
     brand its own optics rather than borrowing a spy aesthetic that
     does not belong on a travel product.                               */

  var SKINS = {
    aurora: {
      label: 'Aurora',
      hint: 'Cabana daylight',
      tiles: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      filter: 'saturate(1.06) contrast(1.02)',
      dark: false,
      ink: '#08080F',
      paper: '#EEF0F7',
      accent: '#6D28FF',
      vignette: 'radial-gradient(ellipse at 50% 45%,transparent 55%,rgba(109,40,255,.07) 100%)'
    },
    ivory: {
      label: 'Ivory',
      hint: 'Quiet, for reading',
      tiles: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      filter: 'saturate(.72) brightness(1.03)',
      dark: false,
      ink: '#08080F',
      paper: '#F5F5FC',
      accent: '#4F6DFF',
      vignette: 'none'
    },
    midnight: {
      label: 'Midnight',
      hint: 'The globe after dark',
      tiles: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      filter: 'saturate(1.1) contrast(1.08) brightness(1.04) hue-rotate(-8deg)',
      dark: true,
      ink: '#FCFCFE',
      paper: '#08080F',
      accent: '#8B5CF6',
      vignette: 'radial-gradient(ellipse at 50% 45%,transparent 45%,rgba(4,4,10,.72) 100%)'
    },
    savannah: {
      label: 'Savannah',
      hint: 'Warm, African light',
      tiles: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      filter: 'sepia(.32) saturate(1.28) hue-rotate(-12deg) contrast(1.05) brightness(1.02)',
      dark: false,
      ink: '#2A1B08',
      paper: '#F6EFE2',
      accent: '#D98E0B',
      vignette: 'radial-gradient(ellipse at 50% 45%,transparent 50%,rgba(217,142,11,.14) 100%)'
    },
    /* Direct port of styles/noir.js. The shader desaturates by
       `intensity`, applies a contrast S-curve, mixes 15% sepia for
       warmth and multiplies a vignette. Every one of those has a CSS
       primitive except the vignette, which the overlay supplies. */
    noir: {
      label: 'Noir',
      hint: 'Ported from God’s Eye View',
      tiles: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      filter: 'grayscale(1) contrast(1.2) sepia(.15) brightness(.94)',
      dark: false,
      ink: '#0B0B0B',
      paper: '#E4E4E4',
      accent: '#111111',
      vignette: 'radial-gradient(ellipse at 50% 45%,transparent 34%,rgba(0,0,0,.62) 100%)'
    },
    /* surveillance.js at night: gain, a cyan cast and a heavy falloff.
       Pixelation and scanlines are the parts CSS cannot reach, so they
       are simply not claimed. */
    nightglass: {
      label: 'Nightglass',
      hint: 'Low-light optics',
      tiles: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      filter: 'grayscale(1) brightness(1.5) contrast(1.32) sepia(1) hue-rotate(120deg) saturate(2.4)',
      dark: true,
      ink: '#CFFFF3',
      paper: '#01110D',
      accent: '#4EE0C8',
      vignette: 'radial-gradient(ellipse at 50% 45%,transparent 30%,rgba(0,14,10,.8) 100%)'
    }
  };

  var SKIN_ORDER = ['aurora', 'ivory', 'midnight', 'savannah', 'noir', 'nightglass'];

  /* ══ LEVEL OF DETAIL ═══════════════════════════════════════════════

     God's Eye View caps how many labels a source may paint at once —
     its "cohort limit" — because the alternative on a live globe is a
     wall of overlapping text. Cabana's atlas is smaller but the
     failure mode is identical: 175 pins at world zoom is a smear.

     So altitude decides what exists. Each band names the kinds that
     may appear and the most labels allowed to win a slot. Below the
     cap the allocator decides who survives; above it, nothing is even
     considered.                                                        */

  var LOD = [
    { max: 3.2,      kinds: ['continent'],                                   labels: 8,  dots: 40 },
    { max: 4.6,      kinds: ['continent', 'country'],                        labels: 14, dots: 90 },
    { max: 6.0,      kinds: ['country', 'city'],                             labels: 20, dots: 200 },
    { max: 8.5,      kinds: ['country', 'city', 'beach', 'safari'],          labels: 26, dots: 260 },
    { max: 11.5,     kinds: ['city', 'beach', 'safari', 'district'],         labels: 34, dots: 300 },
    { max: Infinity, kinds: ['city', 'beach', 'safari', 'district'],         labels: 46, dots: 400 }
  ];

  function lodFor(zoom) {
    for (var i = 0; i < LOD.length; i++) if (zoom <= LOD[i].max) return LOD[i];
    return LOD[LOD.length - 1];
  }

  /* ══ MATHS ═════════════════════════════════════════════════════════ */

  var RAD = Math.PI / 180;
  var EARTH_KM = 6371;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  /* Great-circle distance. Used to decide how grand a transit should
     be — a hop across Nairobi and a flight from London to Lagos are
     the same gesture and must not be the same animation. */
  function haversine(a, b) {
    var dLat = (b.lat - a.lat) * RAD;
    var dLng = (b.lng - a.lng) * RAD;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(s)));
  }

  /* Spherical linear interpolation between two points on the globe.
     A straight line in screen space between Accra and New York is a
     lie about the route; this is the path an aircraft actually flies,
     and it is what the corridor arcs are drawn from. */
  function slerp(a, b, t) {
    var φ1 = a.lat * RAD, λ1 = a.lng * RAD;
    var φ2 = b.lat * RAD, λ2 = b.lng * RAD;
    var d = 2 * Math.asin(Math.sqrt(
      Math.pow(Math.sin((φ2 - φ1) / 2), 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.pow(Math.sin((λ2 - λ1) / 2), 2)));
    if (d === 0 || !isFinite(d)) return { lat: a.lat, lng: a.lng };

    var A = Math.sin((1 - t) * d) / Math.sin(d);
    var B = Math.sin(t * d) / Math.sin(d);
    var x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    var y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    var z = A * Math.sin(φ1) + B * Math.sin(φ2);
    return {
      lat: Math.atan2(z, Math.sqrt(x * x + y * y)) / RAD,
      lng: Math.atan2(y, x) / RAD
    };
  }

  /* Cesium's CUBIC_IN_OUT, which every God's Eye View camera move is
     eased with. Leaflet takes `easeLinearity` rather than a function,
     so this is used for the parts Cabana drives frame by frame: the
     arcs, the idle drift and the focus beat. */
  function cubicInOut(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  /* ══ LOADERS ═══════════════════════════════════════════════════════ */

  var _leaflet = null;

  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (_leaflet) return _leaflet;

    _leaflet = new Promise(function (resolve, reject) {
      /* apa-map.js may already have put the stylesheet in. Two copies
         of Leaflet's CSS is harmless but wasteful, and the shared
         marker is the honest way to ask "is it already here?". */
      if (!document.querySelector('link[data-apa-leaflet]')) {
        var css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = LEAFLET_CSS;
        css.setAttribute('data-apa-leaflet', '');
        document.head.appendChild(css);
      }
      var js = document.createElement('script');
      js.src = LEAFLET_JS;
      js.async = true;
      js.onload = function () {
        window.L ? resolve(window.L) : reject(new Error('Leaflet loaded but L is missing'));
      };
      js.onerror = function () { reject(new Error('Leaflet failed to load')); };
      document.head.appendChild(js);
    });

    /* A failed load must not poison the cache — the next caller
       deserves a fresh attempt, not a rejected promise forever. */
    _leaflet.catch(function () { _leaflet = null; });
    return _leaflet;
  }

  var _atlas = null;

  /* The atlas, indexed and cross-linked once. Children are derived
     here rather than stored in the file: a parent id is one fact, and
     the reverse index is a view of it. Storing both would let them
     disagree. */
  function loadAtlas() {
    if (_atlas) return _atlas;

    _atlas = fetch(ATLAS_URL, { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error('atlas ' + r.status);
        return r.json();
      })
      .then(function (raw) {
        var byId = {};
        raw.places.forEach(function (p) {
          p.children = [];
          byId[p.id] = p;
        });
        raw.places.forEach(function (p) {
          var parent = byId[p.parent];
          if (parent) parent.children.push(p.id);
        });

        raw.byId = byId;
        raw.get = function (id) { return byId[id] || null; };
        raw.routeLines = (raw.routes || []).map(function (r) {
          var a = byId[r.from], b = byId[r.to];
          return a && b ? { from: a, to: b, kind: r.kind } : null;
        }).filter(Boolean);
        return raw;
      });

    _atlas.catch(function () { _atlas = null; });
    return _atlas;
  }

  /* ══ CAMERA DIRECTOR ═══════════════════════════════════════════════

     God's Eye View never cuts. Its camera paths (scenes/recipes.js)
     are lists of keyframes carrying an altitude, and the reason every
     move reads as cinematic is that altitude *rises between
     keyframes*: the camera pulls up, translates across the world at
     height, then descends onto the target. `flyToAustin` in camera.js
     is the same idea at its smallest — set high, pause, then fly down
     with CUBIC_IN_OUT.

     Leaflet's flyTo already performs the parabolic pull-up (van Wijk
     and Nuij's smooth zoom-and-pan), so the arc comes free. What it
     does not do is any of the judgement:

       · a 12 km hop and a 6,000 km flight get the same duration,
         which makes the hop feel sluggish and the flight feel like a
         teleport;
       · it arrives at final zoom in one motion, so there is no beat
         where the guest feels the camera *find* the place.

     This supplies both. `transit` scales duration by real distance,
     and every arrival ends with a short descent onto the target — the
     focus beat. It is the single change that separates "the map
     moved" from "the map took me somewhere".                          */

  function Director(map, opts) {
    this.map = map;
    this.opts = opts || {};
    this._token = 0;
    this._idle = null;
    this._idleAt = 0;
    this._journey = null;
    this.reduced = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* Every move takes a token. A guest who clicks Nairobi, changes
     their mind and clicks Lagos must not be dragged back to Nairobi
     when the first flight's timers fire — so a newer move silently
     invalidates every callback the older one had queued. */
  Director.prototype._claim = function () {
    this._token += 1;
    return this._token;
  };

  Director.prototype.cancel = function () {
    this._claim();
    this.stopJourney();
    this.stopIdle();
  };

  /* Duration from distance, in seconds.

     The curve is deliberately shallow — a fourth root, not a linear
     ramp. Distance across the Earth spans four orders of magnitude
     (a 2 km district hop to a 17,000 km antipodal flight) and a
     proportional duration would make the long ones unwatchable. What
     the guest should feel is that a longer journey takes *somewhat*
     longer, not sixty times longer. */
  Director.prototype.durationFor = function (km) {
    if (this.reduced) return 0;
    return clamp(0.72 + Math.pow(Math.max(km, 1), 0.25) * 0.17, 0.85, 3.1);
  };

  /**
   * Fly to a point and then settle onto it.
   *
   * @param {{lat:number,lng:number}} to     destination
   * @param {number} zoom                    final zoom
   * @param {Object} [o]
   * @param {boolean} [o.focus=true]         run the descent beat
   * @param {number}  [o.duration]           override the computed flight
   * @returns {Promise} resolves when the camera has settled, or
   *                    never — if a newer move claimed the camera, the
   *                    promise is abandoned rather than resolved, so
   *                    callers chained onto a superseded flight stop.
   */
  Director.prototype.flyTo = function (to, zoom, o) {
    o = o || {};
    var self = this;
    var map = this.map;
    var token = this._claim();
    var from = map.getCenter();
    var km = haversine({ lat: from.lat, lng: from.lng }, to);
    var focus = o.focus !== false;

    /* The approach stops short of the final zoom so the descent has
       somewhere to go. Skipping it on short hops is deliberate: a
       two-stage move across half a city reads as a stutter, not a
       flourish. */
    var beat = focus && km > 25 && !this.reduced ? 1.5 : 0;
    var approach = clamp(zoom - beat, 1.6, 19);
    var dur = o.duration != null ? o.duration : this.durationFor(km);

    if (this.reduced || dur <= 0) {
      map.setView([to.lat, to.lng], zoom, { animate: false });
      return Promise.resolve();
    }

    return new Promise(function (resolve) {
      map.flyTo([to.lat, to.lng], approach, {
        duration: dur,
        /* Leaflet exposes easing only as this linearity knob. 0.14 is
           the closest it gets to CUBIC_IN_OUT: a long, slow lead-in
           and an equally long settle, with the speed in the middle. */
        easeLinearity: 0.14
      });

      window.setTimeout(function () {
        if (self._token !== token) return;
        if (!beat) { resolve(); return; }

        /* The focus beat. Short, eased hard out, and it is what makes
           the arrival feel like a lens finding focus rather than an
           animation ending. */
        map.flyTo([to.lat, to.lng], zoom, { duration: 0.78, easeLinearity: 0.3 });
        window.setTimeout(function () {
          if (self._token === token) resolve();
        }, 820);
      }, dur * 1000 + 90);
    });
  };

  /** Frame a place from the atlas, at the zoom its kind deserves. */
  Director.prototype.goTo = function (place, o) {
    if (!place) return Promise.resolve();
    o = o || {};
    return this.flyTo(place, o.zoom != null ? o.zoom : place.zoom, o);
  };

  /**
   * Pull back until both places are on screen, then hold.
   *
   * This is the shot God's Eye View opens every recipe with — the
   * establishing frame that says "here is the whole board" before it
   * commits to a target. Cabana uses it when a guest jumps between
   * continents: seeing London and Lagos in one frame for a beat is
   * what makes the corridor between them mean anything.
   */
  Director.prototype.frameBoth = function (a, b, o) {
    o = o || {};
    var L = window.L;
    var self = this;
    var token = this._claim();
    var bounds = L.latLngBounds([[a.lat, a.lng], [b.lat, b.lng]]).pad(0.42);
    var dur = o.duration != null ? o.duration : this.durationFor(haversine(a, b));

    if (this.reduced) {
      this.map.fitBounds(bounds, { animate: false });
      return Promise.resolve();
    }

    return new Promise(function (resolve) {
      self.map.flyToBounds(bounds, { duration: dur, easeLinearity: 0.16 });
      window.setTimeout(function () {
        if (self._token === token) resolve();
      }, dur * 1000 + 80);
    });
  };

  /** The whole plate. `Esc`, the reset control, and the end of a journey. */
  Director.prototype.home = function () {
    return this.flyTo({ lat: 12, lng: 14 }, 2.6, { focus: false, duration: 1.5 });
  };

  /* ── Journeys ────────────────────────────────────────────────────

     scenes/recipes.js is a list of shots: each keyframe carries a
     position, an altitude and a `hold`, and the director walks them
     in order. Cabana's version drops the camera angles it has no
     third dimension for and keeps the structure, because the
     structure is the valuable part: a tour is *data*, so it can be
     authored, linked to, and replayed identically.                    */

  Director.prototype.playJourney = function (journey, hooks) {
    var self = this;
    hooks = hooks || {};
    this.stopJourney();
    this.stopIdle();

    var run = { cancelled: false, id: journey.id };
    this._journey = run;

    var i = -1;
    function step() {
      if (run.cancelled) return;
      i += 1;
      if (i >= journey.stops.length) {
        if (hooks.onEnd) hooks.onEnd(journey);
        self._journey = null;
        return;
      }
      var stop = journey.stops[i];
      if (hooks.onStop) hooks.onStop(stop, i, journey);

      self.flyTo(stop, stop.zoom, { duration: stop.duration })
        .then(function () {
          if (run.cancelled) return;
          window.setTimeout(step, (stop.hold != null ? stop.hold : 1.4) * 1000);
        });
    }
    step();
    return run;
  };

  Director.prototype.stopJourney = function () {
    if (this._journey) {
      this._journey.cancelled = true;
      this._journey = null;
    }
  };

  Director.prototype.isPlaying = function () { return !!this._journey; };

  /* ── Idle drift ──────────────────────────────────────────────────

     A globe left alone should look alive. God's Eye View gets this
     from the world moving underneath a still camera — live aircraft,
     a turning Earth. Cabana's data does not move, so the camera does:
     a slow westward drift at world zoom, roughly one full rotation
     every four minutes.

     It only ever runs when the guest has genuinely stopped: any
     pointer, key or wheel event resets the clock, and the drift is
     abandoned outright the moment a real interaction lands, so it can
     never fight a guest for the camera.                               */

  Director.prototype.startIdle = function (afterMs) {
    var self = this;
    this.stopIdle();
    this._idleAt = Date.now() + (afterMs || 6500);

    var last = 0;
    function frame(now) {
      if (!self._idle) return;
      self._idle.raf = window.requestAnimationFrame(frame);
      if (Date.now() < self._idleAt) { last = now; return; }
      /* A globe drifting in a background tab is a globe that has
         quietly wandered off its opening frame by the time the guest
         comes back. `last` is reset so the resumed frame does not
         apply the whole absence as one jump. */
      if (document.hidden || (self.opts.isVisible && !self.opts.isVisible())) {
        last = 0;
        return;
      }
      if (self.reduced || self._journey) return;
      if (self.map.getZoom() > 4.2) return;

      var dt = last ? Math.min(now - last, 48) : 16;
      last = now;

      var c = self.map.getCenter();
      /* 360° / 240s, expressed per millisecond. Slow enough that it
         reads as the planet turning rather than the map sliding. */
      var lng = c.lng - dt * (360 / 240000);
      self.map.setView([c.lat, ((lng + 540) % 360) - 180], self.map.getZoom(),
        { animate: false });
    }

    this._idle = { raf: window.requestAnimationFrame(frame) };
  };

  Director.prototype.nudgeIdle = function (afterMs) {
    this._idleAt = Date.now() + (afterMs || 14000);
  };

  Director.prototype.stopIdle = function () {
    if (this._idle) {
      window.cancelAnimationFrame(this._idle.raf);
      this._idle = null;
    }
  };

  /* ══ LABEL ALLOCATOR ═══════════════════════════════════════════════

     Ported from overlays/worldOverlay.js.

     The problem it solves is the one every map with more than about
     thirty points eventually hits: labels collide, and the naive
     fixes are all wrong. Hiding labels below a zoom threshold throws
     away the ones that had room. Letting them overlap produces a
     smear. Drawing them all and hoping is how a map looks amateur.

     God's Eye View treats it as an allocation problem — a fixed
     number of slots, competing claimants, and a priority that decides
     who wins — and that is exactly what this is:

       1. Rank every candidate. Selection beats hover beats supply
          beats importance. A place the guest is looking at always
          keeps its name.
       2. Walk the ranked list. For each, try four anchor positions in
          order of preference and take the first that clears every box
          already placed.
       3. When nothing clears, the label loses and only its dot
          paints. The place is still on the map and still clickable —
          it just does not shout.
       4. Stop at the cohort limit for this altitude.

     The result: the map is always exactly as dense as it can be while
     staying readable, at every zoom, with no thresholds to tune.      */

  /* Anchor offsets, in preference order: right of the dot, left,
     above, below. Right first because Latin script reads left-to-
     right, so a label to the right of its dot is the one the eye
     associates with it fastest. */
  var ANCHORS = [
    { dx: 15,  dy: 0,   align: 'left',   cls: 'r' },
    { dx: -15, dy: 0,   align: 'right',  cls: 'l' },
    { dx: 0,   dy: -17, align: 'center', cls: 't' },
    { dx: 0,   dy: 17,  align: 'center', cls: 'b' }
  ];

  function overlaps(a, b) {
    return !(a.x2 <= b.x1 || a.x1 >= b.x2 || a.y2 <= b.y1 || a.y1 >= b.y2);
  }

  /**
   * Decide which labels paint, and where.
   *
   * Pure: it reads candidate geometry and returns placements. Nothing
   * here touches the DOM, which is what makes it testable without a
   * browser — the same reason God's Eye View keeps its allocation
   * maths out of the painter.
   *
   * @param {Array} cands  {id, x, y, w, h, priority}
   * @param {Object} view  {width, height, limit}
   * @returns {Object} id → {x, y, align, cls}
   */
  function allocate(cands, view) {
    var placed = [];
    var out = {};
    var limit = view.limit || 30;

    var ranked = cands.slice().sort(function (a, b) {
      return b.priority - a.priority;
    });

    for (var i = 0; i < ranked.length && placed.length < limit; i++) {
      var c = ranked[i];

      /* Off-screen candidates are not merely invisible — they must not
         consume a slot, or a label just past the edge would silently
         cost a visible place its name. */
      if (c.x < -60 || c.y < -40 || c.x > view.width + 60 || c.y > view.height + 40) {
        continue;
      }

      for (var a = 0; a < ANCHORS.length; a++) {
        var an = ANCHORS[a];
        var x = c.x + an.dx;
        var y = c.y + an.dy;
        var x1 = an.align === 'left' ? x : an.align === 'right' ? x - c.w : x - c.w / 2;
        var box = { x1: x1, y1: y - c.h / 2, x2: x1 + c.w, y2: y + c.h / 2 };

        /* A box that leaves the viewport is a box the guest cannot
           read. Trying the next anchor is nearly always better than
           clipping. */
        if (box.x1 < 2 || box.y1 < 2 ||
            box.x2 > view.width - 2 || box.y2 > view.height - 2) continue;

        var clear = true;
        for (var p = 0; p < placed.length; p++) {
          if (overlaps(box, placed[p])) { clear = false; break; }
        }
        if (!clear) continue;

        placed.push(box);
        out[c.id] = { x: an.dx, y: an.dy, align: an.align, cls: an.cls };
        break;
      }
    }
    return out;
  }

  /* Importance, before the interaction bonuses are added.

     Every term is a real signal, not a taste judgement. A place with
     live inventory outranks one without, because the guest can
     actually book it. A place serving four categories outranks one
     serving a single category, because it is a bigger part of the
     product. `tier` is africa.py's own market ranking. */
  function basePriority(place) {
    var p = 0;
    if (place.kind === 'continent') p += 900;
    else if (place.kind === 'country') p += 600;
    else if (place.kind === 'city') p += 400;
    else p += 200;

    if (place.tier) p += (4 - place.tier) * 60;
    if (place.live) p += 320;
    if (place.indexed) p += 90;
    p += (place.categories || []).length * 34;
    if (place.capital) p += 40;
    return p;
  }

  /* ══ CORRIDOR ARCS ═════════════════════════════════════════════════

     God's Eye View draws a fading trail behind every tracked contact
     (data/trailRenderer.js) — the thing that turns a moving dot into
     a journey you can read at a glance.

     Cabana has no live aircraft, but it does have the corridors its
     guests actually travel: London to Lagos, Nairobi to Diani, Dubai
     to Johannesburg. Those get the same treatment — a great-circle
     path with a pulse running along it, so the map shows not just
     where Cabana operates but how the world moves through it.

     Canvas rather than SVG or DOM: seventeen arcs at sixty-four
     segments each is a thousand line segments a frame, which is
     nothing for a canvas and a great deal of layout work for the
     DOM.                                                              */

  var ARC_KINDS = {
    diaspora: { color: '#8B5CF6', label: 'Diaspora route' },
    trade:    { color: '#4F6DFF', label: 'Trade corridor' },
    safari:   { color: '#F5B12E', label: 'Safari circuit' },
    domestic: { color: '#4EE0C8', label: 'Domestic hop' }
  };

  function ArcLayer(map, routes, opts) {
    this.map = map;
    this.routes = routes;
    this.opts = opts || {};
    this.enabled = true;
    this._t0 = 0;
    this._raf = null;

    var pane = map.createPane('cabanaArcs');
    pane.style.zIndex = 398;              /* under markers, over tiles */
    pane.style.pointerEvents = 'none';

    var cv = document.createElement('canvas');
    cv.className = 'cg-arc-canvas';
    pane.appendChild(cv);
    this.canvas = cv;
    this.ctx = cv.getContext('2d');

    /* Each route is resampled once into a fixed set of great-circle
       waypoints. The path does not change as the camera moves — only
       its projection does — so recomputing slerp every frame would be
       the same trigonometry for the same answer, sixty times a
       second. */
    this.paths = routes.map(function (r) {
      var pts = [];
      for (var i = 0; i <= 64; i++) pts.push(slerp(r.from, r.to, i / 64));
      return { pts: pts, kind: r.kind, from: r.from, to: r.to };
    });

    var self = this;
    this._sync = function () { self.resize(); };
    map.on('move zoom viewreset resize', this._sync);
    this.resize();
    this.start();
  }

  ArcLayer.prototype.resize = function () {
    var size = this.map.getSize();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var cv = this.canvas;

    if (cv.width !== size.x * dpr || cv.height !== size.y * dpr) {
      cv.width = size.x * dpr;
      cv.height = size.y * dpr;
      cv.style.width = size.x + 'px';
      cv.style.height = size.y + 'px';
    }
    /* The pane is positioned in the map's transformed coordinate
       space, so the canvas has to be pushed back to the viewport
       origin every move or it lags a frame behind the tiles. */
    var origin = this.map.containerPointToLayerPoint([0, 0]);
    window.L.DomUtil.setPosition(cv, origin);
    this._dpr = dpr;
    this._size = size;
  };

  ArcLayer.prototype.start = function () {
    var self = this;
    if (this._raf) return;
    function frame(now) {
      self._raf = window.requestAnimationFrame(frame);
      if (!self._t0) self._t0 = now;
      /* A background tab already throttles rAF, but a globe scrolled
         off the page does not — and on the pages that embed the map
         mid-article that is most of the session. Painting arcs nobody
         can see is pure battery. */
      if (self.paused) return;
      self.draw(now - self._t0);
    }
    this._raf = window.requestAnimationFrame(frame);
  };

  /**
   * Watch whether the map is worth animating.
   *
   * Two signals, because they catch different cases: `visibilitychange`
   * for a backgrounded tab, and an IntersectionObserver for a globe
   * that is simply scrolled past. Where the observer is unavailable the
   * map is assumed visible, which is the safe direction to fail —
   * animating too much beats a map that silently stops moving.
   */
  ArcLayer.prototype.watchVisibility = function (host) {
    var self = this;
    this.paused = false;
    this._onScreen = true;

    this._onVis = function () { self._settlePaused(); };
    document.addEventListener('visibilitychange', this._onVis);

    if (typeof IntersectionObserver === 'undefined') return;
    this._io = new IntersectionObserver(function (entries) {
      self._onScreen = entries[entries.length - 1].isIntersecting;
      self._settlePaused();
    }, { threshold: 0 });
    this._io.observe(host);
  };

  ArcLayer.prototype._settlePaused = function () {
    var wasPaused = this.paused;
    this.paused = document.hidden || !this._onScreen;
    /* Coming back from a pause, the clock has kept running — so the
       pulse would jump forward by however long the tab was away.
       Rebasing it makes the return look like a resume, not a skip. */
    if (wasPaused && !this.paused) this._t0 = 0;
  };

  ArcLayer.prototype.stop = function () {
    if (this._raf) window.cancelAnimationFrame(this._raf);
    this._raf = null;
  };

  ArcLayer.prototype.setEnabled = function (on) {
    this.enabled = !!on;
    this.canvas.style.opacity = on ? '1' : '0';
  };

  ArcLayer.prototype.draw = function (ms) {
    var ctx = this.ctx;
    var size = this._size;
    var dpr = this._dpr;
    if (!ctx || !size) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.x, size.y);
    if (!this.enabled) return;

    var map = this.map;
    var zoom = map.getZoom();
    /* Arcs are a world-scale story. Below continental altitude they
       stop describing anything the guest can see and start being
       lines across a city, so they fade out. */
    var fade = clamp((6.4 - zoom) / 2.2, 0, 1);
    if (fade <= 0.01) return;

    for (var r = 0; r < this.paths.length; r++) {
      var path = this.paths[r];
      var kind = ARC_KINDS[path.kind] || ARC_KINDS.trade;
      var pts = [];
      var visible = false;

      for (var i = 0; i < path.pts.length; i++) {
        var pt = map.latLngToContainerPoint([path.pts[i].lat, path.pts[i].lng]);
        pts.push(pt);
        if (pt.x > -220 && pt.x < size.x + 220 && pt.y > -220 && pt.y < size.y + 220) {
          visible = true;
        }
      }
      if (!visible) continue;

      /* Web Mercator wraps: an arc crossing the antimeridian projects
         as a line streaking the full width of the map. Splitting the
         path wherever consecutive points jump more than half the
         world keeps the geometry honest. */
      var runs = [[]];
      for (var j = 0; j < pts.length; j++) {
        if (j > 0 && Math.abs(pts[j].x - pts[j - 1].x) > size.x * 0.72) runs.push([]);
        runs[runs.length - 1].push(pts[j]);
      }

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (var k = 0; k < runs.length; k++) {
        var run = runs[k];
        if (run.length < 2) continue;

        ctx.beginPath();
        ctx.moveTo(run[0].x, run[0].y);
        for (var m = 1; m < run.length; m++) ctx.lineTo(run[m].x, run[m].y);

        ctx.globalAlpha = 0.2 * fade;
        ctx.strokeStyle = kind.color;
        ctx.lineWidth = 1.15;
        ctx.stroke();
      }

      /* The pulse. Each corridor gets its own phase offset so they do
         not all fire on the same beat — a row of synchronised dots
         reads as a loading bar, not as traffic. */
      var phase = ((ms / 5200) + r * 0.137) % 1;
      var idx = Math.floor(phase * (pts.length - 1));
      var head = pts[idx];
      var tail = pts[Math.max(0, idx - 9)];

      if (head && tail && Math.abs(head.x - tail.x) < size.x * 0.72) {
        var grad = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, kind.color);

        ctx.beginPath();
        ctx.moveTo(tail.x, tail.y);
        for (var n = Math.max(0, idx - 9) + 1; n <= idx; n++) {
          ctx.lineTo(pts[n].x, pts[n].y);
        }
        ctx.globalAlpha = 0.92 * fade;
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.1;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(head.x, head.y, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = kind.color;
        ctx.globalAlpha = fade;
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  };

  ArcLayer.prototype.destroy = function () {
    this.stop();
    if (this._onVis) document.removeEventListener('visibilitychange', this._onVis);
    if (this._io) this._io.disconnect();
    this.map.off('move zoom viewreset resize', this._sync);
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
  };

  /* ══ JOURNEYS ══════════════════════════════════════════════════════

     scenes/recipes.js again: a shot is data. Each journey below is a
     list of place ids with a dwell time, resolved against the atlas
     at mount so a journey can never name a destination that is not on
     the map — the same guarantee the atlas builder gives the pages.

     These are chosen to be sales arguments, not scenery. "Zero
     commission, everywhere" is a claim; flying six continents in
     thirty seconds is that claim, demonstrated.                       */

  var JOURNEYS = [
    {
      id: 'grand-tour',
      title: 'The Grand Tour',
      blurb: 'Six continents, one account, zero commission.',
      icon: '🌍',
      stops: [
        { id: 'africa',    zoom: 3.1,  duration: 2.0, hold: 1.4 },
        { id: 'nairobi',   zoom: 9.6,  duration: 2.2, hold: 1.6 },
        { id: 'lagos',     zoom: 9.4,  duration: 2.1, hold: 1.4 },
        { id: 'cape-town', zoom: 9.4,  duration: 2.2, hold: 1.4 },
        { id: 'london',    zoom: 9.2,  duration: 2.3, hold: 1.3 },
        { id: 'dubai',     zoom: 9.2,  duration: 2.1, hold: 1.3 },
        { id: 'tokyo',     zoom: 9.2,  duration: 2.3, hold: 1.3 },
        { id: 'new-york',  zoom: 9.2,  duration: 2.4, hold: 1.3 },
        { id: 'sydney',    zoom: 9.0,  duration: 2.4, hold: 1.4 },
        { id: 'global',    zoom: 2.5,  duration: 2.2, hold: 0.6 }
      ]
    },
    {
      id: 'east-africa',
      title: 'East African Circuit',
      blurb: 'Nairobi to the coast, the way guests actually travel it.',
      icon: '🦁',
      stops: [
        { id: 'kenya',    zoom: 5.4,  duration: 1.9, hold: 1.3 },
        { id: 'nairobi',  zoom: 10.6, duration: 2.0, hold: 1.5 },
        { id: 'kilimani', zoom: 13.2, duration: 1.6, hold: 1.2 },
        { id: 'nakuru',   zoom: 10.2, duration: 1.9, hold: 1.1 },
        { id: 'mombasa',  zoom: 10.4, duration: 2.1, hold: 1.3 },
        { id: 'diani',    zoom: 11.6, duration: 1.8, hold: 1.5 },
        { id: 'zanzibar', zoom: 10.2, duration: 2.0, hold: 1.4 },
        { id: 'kenya',    zoom: 5.2,  duration: 2.0, hold: 0.6 }
      ]
    },
    {
      id: 'west-africa',
      title: 'West African Cities',
      blurb: 'Lagos, Accra, Abidjan, Dakar — the corridor that never sleeps.',
      icon: '🌇',
      stops: [
        { id: 'nigeria',  zoom: 5.4,  duration: 1.9, hold: 1.2 },
        { id: 'lagos',    zoom: 10.4, duration: 2.0, hold: 1.5 },
        { id: 'lekki',    zoom: 12.8, duration: 1.6, hold: 1.1 },
        { id: 'abuja',    zoom: 10.2, duration: 2.0, hold: 1.1 },
        { id: 'accra',    zoom: 10.4, duration: 2.1, hold: 1.4 },
        { id: 'abidjan',  zoom: 10.2, duration: 2.0, hold: 1.2 },
        { id: 'dakar',    zoom: 10.2, duration: 2.1, hold: 1.4 },
        { id: 'africa',   zoom: 3.4,  duration: 2.2, hold: 0.6 }
      ]
    },
    {
      id: 'diaspora',
      title: 'The Diaspora Run',
      blurb: 'The routes home — London, Paris, New York into West Africa.',
      icon: '✈️',
      stops: [
        { id: 'london',   zoom: 8.8,  duration: 2.0, hold: 1.4 },
        { id: 'lagos',    zoom: 9.6,  duration: 2.6, hold: 1.5 },
        { id: 'paris',    zoom: 8.8,  duration: 2.5, hold: 1.2 },
        { id: 'abidjan',  zoom: 9.6,  duration: 2.5, hold: 1.3 },
        { id: 'new-york', zoom: 8.8,  duration: 2.7, hold: 1.2 },
        { id: 'accra',    zoom: 9.6,  duration: 2.7, hold: 1.5 },
        { id: 'africa',   zoom: 3.2,  duration: 2.2, hold: 0.6 }
      ]
    },
    {
      id: 'southern',
      title: 'Southern Sweep',
      blurb: 'Cape Town, the Falls, the Delta, the Namib.',
      icon: '🏜️',
      stops: [
        { id: 'south-africa',  zoom: 5.0,  duration: 2.0, hold: 1.2 },
        { id: 'cape-town',     zoom: 10.4, duration: 2.1, hold: 1.6 },
        { id: 'johannesburg',  zoom: 10.2, duration: 2.1, hold: 1.2 },
        { id: 'victoria-falls',zoom: 11.0, duration: 2.1, hold: 1.6 },
        { id: 'maun',          zoom: 10.0, duration: 2.0, hold: 1.3 },
        { id: 'windhoek',      zoom: 9.8,  duration: 2.1, hold: 1.3 },
        { id: 'africa',        zoom: 3.4,  duration: 2.2, hold: 0.6 }
      ]
    },
    {
      id: 'north',
      title: 'North African Arc',
      blurb: 'Marrakech to Cairo, along the top of the continent.',
      icon: '🕌',
      stops: [
        { id: 'morocco',    zoom: 5.4,  duration: 1.9, hold: 1.2 },
        { id: 'marrakech',  zoom: 10.6, duration: 2.0, hold: 1.5 },
        { id: 'casablanca', zoom: 10.2, duration: 1.9, hold: 1.1 },
        { id: 'tunis',      zoom: 10.2, duration: 2.2, hold: 1.2 },
        { id: 'cairo',      zoom: 10.2, duration: 2.3, hold: 1.5 },
        { id: 'africa',     zoom: 3.4,  duration: 2.2, hold: 0.6 }
      ]
    }
  ];

  /** Bind a journey's stop ids to real atlas places. Unknown ids are
      dropped, so a journey degrades rather than breaking. */
  function resolveJourneys(atlas) {
    return JOURNEYS.map(function (j) {
      var stops = j.stops.map(function (s) {
        var place = atlas.get(s.id);
        if (!place) return null;
        return {
          id: s.id, place: place,
          lat: place.lat, lng: place.lng,
          zoom: s.zoom != null ? s.zoom : place.zoom,
          duration: s.duration, hold: s.hold
        };
      }).filter(Boolean);
      return { id: j.id, title: j.title, blurb: j.blurb, icon: j.icon, stops: stops };
    }).filter(function (j) { return j.stops.length >= 3; });
  }

  /* ══ SHARE LINKS ═══════════════════════════════════════════════════

     sharelink.js serialises camera, style, layers and one tracked
     target into a URL, on the principle that a view worth finding is
     worth sending. Cabana's version is smaller because its state is
     smaller, but it keeps the property that matters: the link is a
     *view*, not a bookmark. Open it and you are standing where the
     sender stood, in the optics they chose, with the same filters on.

     Kept deliberately terse — these end up in WhatsApp messages, and
     a URL that wraps to three lines does not get sent.                */

  var ShareLink = {
    read: function (search) {
      var q = new URLSearchParams(search || window.location.search);
      var state = {};
      if (q.get('at')) state.at = q.get('at');
      if (q.get('z')) state.zoom = parseFloat(q.get('z'));
      if (q.get('skin') && SKINS[q.get('skin')]) state.skin = q.get('skin');
      if (q.get('cat')) {
        state.categories = q.get('cat').split(',').map(function (s) {
          return s.trim();
        }).filter(Boolean);
      }
      if (q.get('ll')) {
        var ll = q.get('ll').split(',');
        var lat = parseFloat(ll[0]), lng = parseFloat(ll[1]);
        if (isFinite(lat) && isFinite(lng)) state.center = { lat: lat, lng: lng };
      }
      if (q.get('arcs') === '0') state.arcs = false;
      if (q.get('tour')) state.tour = q.get('tour');
      return state;
    },

    write: function (state) {
      var q = new URLSearchParams();
      /* A named place beats coordinates: it survives the atlas moving
         a pin by a few metres, and it is legible in the URL bar. Raw
         coordinates are the fallback for a free-roamed camera. */
      if (state.at) q.set('at', state.at);
      else if (state.center) {
        q.set('ll', state.center.lat.toFixed(4) + ',' + state.center.lng.toFixed(4));
      }
      if (state.zoom != null) q.set('z', String(Math.round(state.zoom * 10) / 10));
      if (state.skin && state.skin !== 'aurora') q.set('skin', state.skin);
      if (state.categories && state.categories.length) {
        q.set('cat', state.categories.join(','));
      }
      if (state.arcs === false) q.set('arcs', '0');
      var s = q.toString();
      return window.location.origin + window.location.pathname + (s ? '?' + s : '');
    }
  };

  /* ══ HUD READOUT ═══════════════════════════════════════════════════

     Ported from locationStatus.js.

     Two paths reach this readout and both have to land somewhere
     real: a place selected from the atlas, which carries a full
     record, and a free-text search, which carries only a formatted
     address string. God's Eye View shipped with only the first path
     rendered, so a search left the readout saying "Location: --"
     while the camera sat over the destination. That bug is worth not
     re-introducing, so both paths are handled here from the start.    */

  function addressSegments(label) {
    return String(label == null ? '' : label)
      .split(',')
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
  }

  function miniStatus(input) {
    input = input || {};
    var place = input.place;

    if (place && place.name) {
      var where = place.kind === 'country' ? (place.region || place.country)
        : place.kind === 'continent' ? 'Cabana worldwide'
          : (place.country || '');
      return {
        line1: place.name,
        line2: where || 'On Cabana',
        kind: place.kind
      };
    }

    var seg = addressSegments(input.searchedLabel);
    if (seg.length) {
      return {
        line1: seg[0],
        /* The rest of the address is the place's context. The readout
           ellipsises in CSS, so a long tail is safe; a one-segment
           result has no context to show. */
        line2: seg.length > 1 ? seg.slice(1).join(', ') : 'Searched location',
        kind: 'search'
      };
    }

    return { line1: 'The world', line2: 'Pick anywhere to begin', kind: 'none' };
  }

  /* ══ CHROME ════════════════════════════════════════════════════════ */

  var CSS_HREF = '/cabana-globe.css';

  function ensureCSS() {
    if (document.querySelector('link[data-cabana-globe]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CSS_HREF;
    link.setAttribute('data-cabana-globe', '');
    document.head.appendChild(link);
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  /* Anything that reaches the DOM as markup gets escaped here first.
     Place names and blurbs come from the atlas, which is generated
     from page content — content a host wrote. Trusting it would make
     a listing description an injection vector. */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var CATEGORY_ICON = {
    apartments: '🏠', safaris: '🦁', 'car-hire': '🚗',
    rides: '🛬', events: '🎟️', flights: '✈️'
  };

  var KIND_LABEL = {
    continent: 'Region', country: 'Country', city: 'City',
    district: 'Neighbourhood', beach: 'Beach', safari: 'Safari region'
  };

  /* ══ THE GLOBE ═════════════════════════════════════════════════════ */

  function Globe(host, atlas, opts) {
    this.host = host;
    this.atlas = atlas;
    this.opts = opts || {};
    this.selected = null;
    this.hovered = null;
    this.markers = {};
    this.filters = {};
    this.skin = 'aurora';
    this.arcsOn = true;
    this.labelsOn = true;
    this.journeys = resolveJourneys(atlas);
    this._pending = null;
    this._build();
  }

  Globe.prototype._build = function () {
    var self = this;
    var L = window.L;
    var host = this.host;

    host.classList.add('cg');
    host.innerHTML = '';

    var stage = el('div', 'cg-stage');
    host.appendChild(stage);
    this.stage = stage;

    var vignette = el('div', 'cg-vignette');
    host.appendChild(vignette);
    this.vignetteEl = vignette;

    /* ── The map ─────────────────────────────────────────────────── */
    var map = L.map(stage, {
      zoomControl: false,
      attributionControl: true,
      /* Fractional zoom is what makes the descent beat readable. At
         integer steps the focus move is a jump; at 0.25 it is a
         glide. */
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 110,
      worldCopyJump: true,
      minZoom: 2,
      maxZoom: 18,
      /* Latitude is clamped short of the poles. Mercator stretches
         them to infinity, and there is nothing on Cabana above 71°N
         or below 55°S, so the guest is only ever kept away from empty
         distortion. */
      maxBounds: L.latLngBounds([[-72, -Infinity], [82, Infinity]]),
      maxBoundsViscosity: 0.7
    });
    this.map = map;
    map.attributionControl.setPrefix('');

    this.tiles = L.tileLayer(SKINS.aurora.tiles, {
      subdomains: 'abcd', maxZoom: 19, attribution: ATTRIB,
      /* Keeping a couple of levels of stale tiles alive is what stops
         a long transit from flashing grey mid-flight. */
      keepBuffer: 3, updateWhenZooming: false
    }).addTo(map);
    this._tileUrl = SKINS.aurora.tiles;

    map.setView([12, 14], 2.6);

    this.arcs = new ArcLayer(map, atlasRoutes(this.atlas), {});
    this.arcs.watchVisibility(host);

    /* The director shares the arc layer's answer rather than opening a
       second observer on the same element — one source for "is anyone
       looking at this", so the two loops can never disagree. */
    this.director = new Director(map, Object.assign({}, this.opts, {
      isVisible: function () { return !self.arcs.paused; }
    }));

    /* ── Markers ─────────────────────────────────────────────────── */
    this.markerPane = map.createPane('cabanaPins');
    this.markerPane.style.zIndex = 620;
    this._buildMarkers();

    /* ── Chrome ──────────────────────────────────────────────────── */
    this._buildHud();
    this._buildSkinRail();
    this._paintSkin(this.skin);
    this._buildFilters();
    this._buildJourneys();
    this._buildCard();
    this._buildControls();

    /* ── Wiring ──────────────────────────────────────────────────── */
    var refresh = function () { self._refresh(); };
    map.on('zoomend moveend', refresh);
    map.on('zoom move', function () { self._positionLabels(true); });
    map.on('resize', refresh);

    ['pointerdown', 'wheel', 'keydown', 'touchstart'].forEach(function (ev) {
      host.addEventListener(ev, function () {
        self.director.nudgeIdle();
        /* A guest who touches the map has taken the camera back. A
           journey that kept playing under their fingers would be the
           map fighting them for control. */
        if (self.director.isPlaying()) self.stopJourney();
      }, { passive: true });
    });

    this._buildKeyboard();
    this._refresh();
    this._applyState(ShareLink.read());
  };

  function atlasRoutes(atlas) {
    return (atlas.routeLines || []).map(function (r) {
      return { from: r.from, to: r.to, kind: r.kind };
    });
  }

  /* ── Markers ───────────────────────────────────────────────────── */

  Globe.prototype._buildMarkers = function () {
    var self = this;
    var L = window.L;

    this.atlas.places.forEach(function (place) {
      var icon = L.divIcon({
        className: 'cg-pin-wrap',
        html: '<button class="cg-pin cg-pin-' + place.kind + '" type="button" ' +
              'aria-label="' + esc(place.name) + '">' +
              '<span class="cg-dot"></span>' +
              '<span class="cg-label"><span class="cg-label-in">' +
              esc(place.name) + '</span></span>' +
              '</button>',
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });

      var marker = L.marker([place.lat, place.lng], {
        icon: icon, pane: 'cabanaPins', keyboard: false,
        riseOnHover: true, interactive: true
      });

      marker.on('add', function () {
        var node = marker.getElement();
        if (!node || node._cgBound) return;
        node._cgBound = true;

        var btn = node.querySelector('.cg-pin');
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          self.select(place.id, { fly: true });
        });
        btn.addEventListener('pointerenter', function () { self._hover(place.id); });
        btn.addEventListener('pointerleave', function () { self._hover(null); });
        /* The pins are real buttons inside a divIcon, so focus works
           without extra wiring — but Leaflet's own keyboard handling
           is off for markers, so Enter has to be honoured here. */
        btn.addEventListener('focus', function () { self._hover(place.id); });
        btn.addEventListener('blur', function () { self._hover(null); });
      });

      self.markers[place.id] = {
        marker: marker, place: place, on: false,
        priority: basePriority(place)
      };
    });
  };

  /** Does this place survive the current filters? */
  Globe.prototype._passesFilter = function (place) {
    var active = Object.keys(this.filters).filter(function (k) {
      return this.filters[k];
    }, this);
    if (!active.length) return true;
    /* Continents are wayfinding, not supply. Filtering them out would
       leave the guest at world zoom with nothing to aim at. */
    if (place.kind === 'continent') return true;
    for (var i = 0; i < active.length; i++) {
      if ((place.categories || []).indexOf(active[i]) !== -1) return true;
    }
    return false;
  };

  /**
   * Reconcile what is on the map with what this altitude allows.
   *
   * God's Eye View's cohort limits, applied to a smaller world: the
   * LOD band names the kinds that may exist and the dot budget. What
   * survives is ranked by the same priority the labels use, so the
   * places that drop out at altitude are always the least important
   * ones rather than whichever happened to be last in the file.
   */
  Globe.prototype._refresh = function () {
    var zoom = this.map.getZoom();
    var lod = lodFor(zoom);
    var bounds = this.map.getBounds().pad(0.3);
    var self = this;

    var candidates = [];
    Object.keys(this.markers).forEach(function (id) {
      var rec = self.markers[id];
      var place = rec.place;
      var want = lod.kinds.indexOf(place.kind) !== -1 &&
        self._passesFilter(place) &&
        bounds.contains([place.lat, place.lng]);

      /* Selection outranks altitude. A guest who picked a
         neighbourhood and then zoomed out to see where it sits must
         not have it vanish underneath them. */
      if (id === self.selected) want = true;
      if (want) candidates.push(rec);
      else if (rec.on) { self.map.removeLayer(rec.marker); rec.on = false; }
    });

    candidates.sort(function (a, b) { return b.priority - a.priority; });
    var budget = Math.min(candidates.length, lod.dots);

    for (var i = 0; i < candidates.length; i++) {
      var rec = candidates[i];
      var keep = i < budget || rec.place.id === this.selected;
      if (keep && !rec.on) { rec.marker.addTo(this.map); rec.on = true; }
      else if (!keep && rec.on) { this.map.removeLayer(rec.marker); rec.on = false; }
    }

    this._lod = lod;
    this._positionLabels();
    this._syncCounts();
  };

  /**
   * Run the allocator and apply its verdict to the DOM.
   *
   * @param {boolean} [cheap] during a live pan, only the transforms
   *   are refreshed — re-running allocation every frame of a drag
   *   makes labels flicker as they win and lose slots, which reads as
   *   a bug even though every individual frame is correct.
   */
  Globe.prototype._positionLabels = function (cheap) {
    if (cheap || !this.labelsOn) {
      if (!this.labelsOn) this._clearLabels();
      return;
    }

    var size = this.map.getSize();
    var lod = this._lod || lodFor(this.map.getZoom());
    var cands = [];
    var self = this;

    Object.keys(this.markers).forEach(function (id) {
      var rec = self.markers[id];
      if (!rec.on) return;
      var node = rec.marker.getElement();
      if (!node) return;
      var label = node.querySelector('.cg-label-in');
      if (!label) return;

      var pt = self.map.latLngToContainerPoint([rec.place.lat, rec.place.lng]);
      /* Width is measured from the live element rather than estimated
         from character count: "São Tomé and Príncipe" and "Lagos" are
         not the same box, and a guessed width is a guessed collision. */
      var w = label.offsetWidth || 60;

      var priority = rec.priority;
      if (id === self.selected) priority += 100000;
      else if (id === self.hovered) priority += 50000;

      cands.push({ id: id, x: pt.x, y: pt.y, w: w + 10, h: 20, priority: priority });
    });

    var placement = allocate(cands, {
      width: size.x, height: size.y, limit: lod.labels
    });

    Object.keys(this.markers).forEach(function (id) {
      var rec = self.markers[id];
      if (!rec.on) return;
      var node = rec.marker.getElement();
      if (!node) return;
      var pin = node.querySelector('.cg-pin');
      if (!pin) return;

      var p = placement[id];
      if (p) {
        pin.classList.add('has-label');
        pin.setAttribute('data-anchor', p.cls);
        pin.style.setProperty('--lx', p.x + 'px');
        pin.style.setProperty('--ly', p.y + 'px');
      } else {
        pin.classList.remove('has-label');
      }
    });
  };

  Globe.prototype._clearLabels = function () {
    var self = this;
    Object.keys(this.markers).forEach(function (id) {
      var node = self.markers[id].marker.getElement();
      if (node) {
        var pin = node.querySelector('.cg-pin');
        if (pin) pin.classList.remove('has-label');
      }
    });
  };

  /* ── Selection ─────────────────────────────────────────────────── */

  Globe.prototype._hover = function (id) {
    if (this.hovered === id) return;
    this.hovered = id;
    var self = this;
    Object.keys(this.markers).forEach(function (k) {
      var node = self.markers[k].marker.getElement();
      if (!node) return;
      var pin = node.querySelector('.cg-pin');
      if (pin) pin.classList.toggle('hot', k === id);
    });
    this._positionLabels();
  };

  /**
   * Select a place: frame it, tell the HUD, open its card.
   *
   * @param {string} id
   * @param {Object} [o]
   * @param {boolean} [o.fly=true]  move the camera
   * @param {boolean} [o.push=true] update the shareable URL
   */
  Globe.prototype.select = function (id, o) {
    o = o || {};
    var place = this.atlas.get(id);
    if (!place) return Promise.resolve();

    var previous = this.selected;
    this.selected = id;
    this.director.stopIdle();
    this._paintSelection(previous, id);
    this._setHud(miniStatus({ place: place }));
    this._openCard(place);
    if (o.push !== false) this._pushUrl();

    if (o.fly === false) { this._refresh(); return Promise.resolve(); }

    var self = this;
    return this.director.goTo(place, { zoom: o.zoom }).then(function () {
      self._refresh();
      self.director.startIdle(20000);
    });
  };

  Globe.prototype._paintSelection = function (was, now) {
    [was, now].forEach(function (id) {
      if (!id || !this.markers[id]) return;
      var node = this.markers[id].marker.getElement();
      if (!node) return;
      var pin = node.querySelector('.cg-pin');
      if (pin) pin.classList.toggle('on', id === now);
    }, this);
  };

  Globe.prototype.clearSelection = function () {
    var was = this.selected;
    this.selected = null;
    this._paintSelection(was, null);
    this._setHud(miniStatus({}));
    this._closeCard();
    this._pushUrl();
    this._refresh();
  };

  /* ── HUD ───────────────────────────────────────────────────────── */

  Globe.prototype._buildHud = function () {
    var hud = el('div', 'cg-hud');
    hud.innerHTML =
      '<div class="cg-hud-mark"><span class="cg-hud-pulse"></span></div>' +
      '<div class="cg-hud-text">' +
      '<div class="cg-hud-1">The world</div>' +
      '<div class="cg-hud-2">Pick anywhere to begin</div>' +
      '</div>' +
      '<div class="cg-hud-stat" role="status" aria-live="polite"></div>';
    this.host.appendChild(hud);
    this.hudEl = hud;
    this.hud1 = hud.querySelector('.cg-hud-1');
    this.hud2 = hud.querySelector('.cg-hud-2');
    this.hudStat = hud.querySelector('.cg-hud-stat');
  };

  Globe.prototype._setHud = function (status) {
    this.hud1.textContent = status.line1;
    this.hud2.textContent = status.line2;
    this.hudEl.setAttribute('data-kind', status.kind);
  };

  /**
   * The count strip.
   *
   * Every layer in God's Eye View keeps its source and freshness on
   * screen — partial, delayed, simulated and unavailable are all
   * distinct, visible states. Cabana's equivalent claim is about
   * supply, and it is held to the same standard: this reports how
   * many destinations are *on screen right now*, which is a fact
   * about the current view, and never dresses the catalogue up as
   * live availability. Real bookable counts appear on the card, only
   * where the database put one.
   */
  Globe.prototype._syncCounts = function () {
    var shown = 0, live = 0;
    var self = this;
    Object.keys(this.markers).forEach(function (id) {
      var rec = self.markers[id];
      if (!rec.on || rec.place.kind === 'continent') return;
      shown += 1;
      if (rec.place.live) live += 1;
    });

    var bits = [shown + ' in view'];
    if (live) bits.push(live + ' bookable now');
    this.hudStat.textContent = bits.join(' · ');
  };

  /* ── Skin rail ─────────────────────────────────────────────────── */

  Globe.prototype._buildSkinRail = function () {
    var self = this;
    var rail = el('div', 'cg-skins');
    rail.setAttribute('role', 'group');
    rail.setAttribute('aria-label', 'Map optics');

    SKIN_ORDER.forEach(function (key, i) {
      var skin = SKINS[key];
      var b = el('button', 'cg-skin' + (key === 'aurora' ? ' on' : ''));
      b.type = 'button';
      b.dataset.skin = key;
      b.title = skin.label + ' — ' + skin.hint + '  (' + (i + 1) + ')';
      b.setAttribute('aria-pressed', key === 'aurora' ? 'true' : 'false');
      b.innerHTML = '<span class="cg-swatch" style="background:' +
        skin.accent + '"></span><span class="cg-skin-name">' +
        esc(skin.label) + '</span>';
      b.addEventListener('click', function () { self.setSkin(key); });
      rail.appendChild(b);
    });

    this.host.appendChild(rail);
    this.skinRail = rail;
  };

  /**
   * Paint an optic onto the map and the chrome.
   *
   * Separate from setSkin because the *default* optic has to be
   * painted too. setSkin short-circuits when the key has not changed,
   * which is right for a click and wrong for the first frame — Aurora
   * would otherwise never get its filter, its vignette or its
   * data-skin attribute, and the map would open looking like an
   * unstyled basemap.
   */
  Globe.prototype._paintSkin = function (key) {
    var skin = SKINS[key];

    /* setUrl tears the tile grid down and re-requests it, so it is
       called only when the pixels really differ. Four of the six
       optics share the Voyager basemap and are pure filter changes —
       swapping between them should be a repaint, not a reload. */
    if (this._tileUrl !== skin.tiles) {
      this.tiles.setUrl(skin.tiles);
      this._tileUrl = skin.tiles;
    }

    this.stage.style.filter = skin.filter;
    this.vignetteEl.style.background = skin.vignette;
    this.host.setAttribute('data-skin', key);
    this.host.classList.toggle('cg-dark', !!skin.dark);

    this.skinRail.querySelectorAll('.cg-skin').forEach(function (b) {
      var on = b.dataset.skin === key;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  };

  /** Swap the optics. A repaint, never a reload — the tile URL only
      changes when the new skin needs different pixels. */
  Globe.prototype.setSkin = function (key) {
    var skin = SKINS[key];
    if (!skin || key === this.skin) return;
    this.skin = key;
    this._paintSkin(key);
    this._pushUrl();
  };

  /* ── Category filters ──────────────────────────────────────────── */

  Globe.prototype._buildFilters = function () {
    var self = this;
    var wrap = el('div', 'cg-filters');
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'What to show');

    /* Only categories that actually exist somewhere in the atlas get
       a chip. A filter that can only ever return nothing is a dead
       control, and the atlas already knows which those are. */
    var present = {};
    this.atlas.places.forEach(function (p) {
      (p.categories || []).forEach(function (c) { present[c] = (present[c] || 0) + 1; });
    });

    this.atlas.categories.forEach(function (cat) {
      var n = present[cat.slug];
      if (!n) return;
      var b = el('button', 'cg-chip');
      b.type = 'button';
      b.dataset.cat = cat.slug;
      b.setAttribute('aria-pressed', 'false');
      b.innerHTML = '<span class="cg-chip-i">' + (CATEGORY_ICON[cat.slug] || '📍') +
        '</span><span>' + esc(cat.label) + '</span>' +
        '<span class="cg-chip-n">' + n + '</span>';
      b.addEventListener('click', function () { self.toggleCategory(cat.slug); });
      wrap.appendChild(b);
    });

    this.host.appendChild(wrap);
    this.filterEl = wrap;
  };

  Globe.prototype.toggleCategory = function (slug) {
    this.filters[slug] = !this.filters[slug];
    var b = this.filterEl.querySelector('[data-cat="' + slug + '"]');
    if (b) {
      b.classList.toggle('on', this.filters[slug]);
      b.setAttribute('aria-pressed', this.filters[slug] ? 'true' : 'false');
    }
    this._refresh();
    this._pushUrl();
  };

  Globe.prototype.activeCategories = function () {
    var self = this;
    return Object.keys(this.filters).filter(function (k) { return self.filters[k]; });
  };

  /* ── Journey rail ──────────────────────────────────────────────── */

  Globe.prototype._buildJourneys = function () {
    var self = this;
    var rail = el('div', 'cg-tours');
    rail.innerHTML = '<div class="cg-tours-h">Take a tour</div>';

    var list = el('div', 'cg-tours-list');
    this.journeys.forEach(function (j) {
      var b = el('button', 'cg-tour');
      b.type = 'button';
      b.dataset.tour = j.id;
      b.innerHTML = '<span class="cg-tour-i">' + j.icon + '</span>' +
        '<span class="cg-tour-t">' + esc(j.title) + '</span>' +
        '<span class="cg-tour-b">' + esc(j.blurb) + '</span>' +
        '<span class="cg-tour-n">' + j.stops.length + ' stops</span>';
      b.addEventListener('click', function () {
        if (self._playing === j.id) self.stopJourney();
        else self.playJourney(j.id);
      });
      list.appendChild(b);
    });
    rail.appendChild(list);
    this.host.appendChild(rail);
    this.tourRail = rail;
  };

  Globe.prototype.playJourney = function (id) {
    var self = this;
    var journey = this.journeys.filter(function (j) { return j.id === id; })[0];
    if (!journey) return;

    this._playing = id;
    this.host.classList.add('cg-touring');
    this._paintTourButtons();
    this._closeCard();

    this.director.playJourney(journey, {
      onStop: function (stop) {
        self._setHud(miniStatus({ place: stop.place }));
        self._paintSelection(self.selected, stop.id);
        self.selected = stop.id;
        self._refresh();
      },
      onEnd: function () { self.stopJourney(); }
    });
  };

  Globe.prototype.stopJourney = function () {
    this.director.stopJourney();
    this._playing = null;
    this.host.classList.remove('cg-touring');
    this._paintTourButtons();
  };

  Globe.prototype._paintTourButtons = function () {
    var self = this;
    this.tourRail.querySelectorAll('.cg-tour').forEach(function (b) {
      b.classList.toggle('on', b.dataset.tour === self._playing);
    });
  };

  /* ── Place card ────────────────────────────────────────────────── */

  Globe.prototype._buildCard = function () {
    var self = this;
    var card = el('aside', 'cg-card');
    card.setAttribute('aria-live', 'polite');
    card.hidden = true;
    this.host.appendChild(card);
    this.cardEl = card;

    card.addEventListener('click', function (e) {
      var drill = e.target.closest('[data-goto]');
      if (drill) {
        e.preventDefault();
        self.select(drill.dataset.goto, { fly: true });
        return;
      }
      if (e.target.closest('[data-close]')) self.clearSelection();
    });
  };

  Globe.prototype._openCard = function (place) {
    var atlas = this.atlas;
    var rows = [];

    /* Every bookable category this place has a real page for, with
       the real URL. These are the only links on the card, so it
       cannot send a guest anywhere that does not exist. */
    var links = (place.categories || []).map(function (slug) {
      var cat = atlas.categories.filter(function (c) { return c.slug === slug; })[0];
      return '<a class="cg-go" href="' + esc(place.pages[slug]) + '">' +
        '<span class="cg-go-i">' + (CATEGORY_ICON[slug] || '📍') + '</span>' +
        '<span class="cg-go-t">' + esc(cat ? cat.label : slug) + '</span>' +
        '<span class="cg-go-x">→</span></a>';
    }).join('');

    /* A live count is a claim about the database, so it is only ever
       rendered from `place.live`. Everywhere else the card shows the
       indicative nightly band, clearly labelled as typical — which is
       what it is. */
    if (place.live && place.live.stays && place.live.stays.count) {
      var s = place.live.stays;
      rows.push('<div class="cg-fact cg-fact-live"><b>' + s.count +
        ' live ' + (s.count === 1 ? 'stay' : 'stays') + '</b>' +
        '<span>$' + Math.round(s.lowUSD) + '–$' + Math.round(s.highUSD) +
        ' a night, bookable now</span></div>');
    } else if (place.band) {
      rows.push('<div class="cg-fact"><b>$' + place.band[0] + '–$' + place.band[1] +
        '</b><span>typical nightly range</span></div>');
    }

    if (place.season) {
      rows.push('<div class="cg-fact"><b>Best time</b><span>' +
        esc(place.season) + '</span></div>');
    }
    if (place.currency) {
      rows.push('<div class="cg-fact"><b>' + esc(place.currency) + '</b><span>' +
        (place.airport ? esc(place.airport) + ' · main gateway' : 'local currency') +
        '</span></div>');
    }
    if (place.pay) {
      rows.push('<div class="cg-fact"><b>Paying</b><span>' + esc(place.pay) + '</span></div>');
    }
    if (place.visa) {
      rows.push('<div class="cg-fact"><b>Entry</b><span>' + esc(place.visa) + '</span></div>');
    }

    var highlights = (place.highlights || []).slice(0, 6).map(function (h) {
      return '<li>' + esc(h) + '</li>';
    }).join('');

    /* Children are the drill-down: a country lists its cities, a city
       its neighbourhoods. This is the whole reason the atlas carries
       a parent link — the map becomes something you descend through
       rather than a flat field of pins. */
    var kids = (place.children || [])
      .map(function (id) { return atlas.get(id); })
      .filter(Boolean)
      .sort(function (a, b) { return basePriority(b) - basePriority(a); })
      .slice(0, 12)
      .map(function (c) {
        return '<button type="button" class="cg-kid" data-goto="' + esc(c.id) + '">' +
          esc(c.name) + (c.live ? '<i title="Live inventory"></i>' : '') + '</button>';
      }).join('');

    var parent = atlas.get(place.parent);

    this.cardEl.innerHTML =
      '<button class="cg-card-x" type="button" data-close aria-label="Close">×</button>' +
      '<div class="cg-card-eyebrow">' +
        (KIND_LABEL[place.kind] || 'Place') +
        (parent ? ' · <button type="button" class="cg-up" data-goto="' +
          esc(parent.id) + '">' + esc(parent.name) + '</button>' : '') +
      '</div>' +
      '<h3 class="cg-card-h">' + esc(place.name) + '</h3>' +
      (place.draw ? '<p class="cg-card-draw">' + esc(place.draw) + '</p>'
        : place.blurb ? '<p class="cg-card-draw">' + esc(place.blurb) + '</p>' : '') +
      (rows.length ? '<div class="cg-facts">' + rows.join('') + '</div>' : '') +
      (highlights ? '<ul class="cg-hi">' + highlights + '</ul>' : '') +
      (links ? '<div class="cg-gos">' + links + '</div>' : '') +
      (kids ? '<div class="cg-kids-h">Inside ' + esc(place.name) + '</div>' +
        '<div class="cg-kids">' + kids + '</div>' : '');

    this.cardEl.hidden = false;
    this.cardEl.scrollTop = 0;
    this.host.classList.add('cg-carded');
  };

  Globe.prototype._closeCard = function () {
    this.cardEl.hidden = true;
    this.host.classList.remove('cg-carded');
  };

  /* ── Controls ──────────────────────────────────────────────────── */

  Globe.prototype._buildControls = function () {
    var self = this;
    var bar = el('div', 'cg-controls');

    function ctl(cls, label, title, fn) {
      var b = el('button', 'cg-ctl ' + cls, label);
      b.type = 'button';
      b.title = title;
      b.setAttribute('aria-label', title);
      b.addEventListener('click', fn);
      bar.appendChild(b);
      return b;
    }

    ctl('', '+', 'Zoom in', function () {
      self.map.zoomIn(0.75);
    });
    ctl('', '−', 'Zoom out', function () {
      self.map.zoomOut(0.75);
    });
    this.arcBtn = ctl('cg-ctl-on', '⤳', 'Corridors (A)', function () {
      self.setArcs(!self.arcsOn);
    });
    this.labelBtn = ctl('cg-ctl-on', '⌶', 'Place names (L)', function () {
      self.setLabels(!self.labelsOn);
    });
    ctl('', '⌂', 'Reset the globe (Esc)', function () { self.reset(); });
    this.shareBtn = ctl('cg-ctl-share', '↗', 'Copy a link to this view', function () {
      self.share();
    });

    this.host.appendChild(bar);
    this.controlsEl = bar;
  };

  Globe.prototype.setArcs = function (on) {
    this.arcsOn = !!on;
    this.arcs.setEnabled(this.arcsOn);
    this.arcBtn.classList.toggle('cg-ctl-on', this.arcsOn);
    this._pushUrl();
  };

  Globe.prototype.setLabels = function (on) {
    this.labelsOn = !!on;
    this.labelBtn.classList.toggle('cg-ctl-on', this.labelsOn);
    this._positionLabels();
  };

  Globe.prototype.reset = function () {
    this.stopJourney();
    this.clearSelection();
    var self = this;
    return this.director.home().then(function () {
      self._refresh();
      self.director.startIdle(4000);
    });
  };

  /**
   * Copy a link to exactly this view.
   *
   * Clipboard access can be refused — an insecure origin, a browser
   * that gates it behind a permission, a user who said no — so the
   * URL bar is always updated first. Even when the copy fails the
   * guest has something to copy by hand, which is the difference
   * between a degraded feature and a broken one.
   */
  Globe.prototype.share = function () {
    var url = this._pushUrl();
    var btn = this.shareBtn;
    var done = function (ok) {
      btn.classList.add(ok ? 'cg-ok' : 'cg-warn');
      btn.textContent = ok ? '✓' : '↗';
      btn.title = ok ? 'Link copied' : 'Copy the address bar to share this view';
      window.setTimeout(function () {
        btn.classList.remove('cg-ok', 'cg-warn');
        btn.textContent = '↗';
        btn.title = 'Copy a link to this view';
      }, 2200);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { done(true); },
        function () { done(false); });
    } else {
      done(false);
    }
    return url;
  };

  /** Serialise the current view into the address bar, and return it. */
  Globe.prototype._pushUrl = function () {
    var c = this.map.getCenter();
    var url = ShareLink.write({
      at: this.selected,
      center: { lat: c.lat, lng: c.lng },
      zoom: this.map.getZoom(),
      skin: this.skin,
      categories: this.activeCategories(),
      arcs: this.arcsOn
    });
    try {
      window.history.replaceState(null, '', url);
    } catch (e) {
      /* Some embedded webviews refuse replaceState on a cross-origin
         ancestor. The link is still returned and still correct — only
         the address bar misses out. */
    }
    return url;
  };

  /** Restore a view from a shared link. */
  Globe.prototype._applyState = function (state) {
    var self = this;
    if (state.skin) this.setSkin(state.skin);
    if (state.categories) {
      state.categories.forEach(function (c) {
        if (!self.filters[c]) self.toggleCategory(c);
      });
    }
    if (state.arcs === false) this.setArcs(false);

    if (state.tour) { this.playJourney(state.tour); return; }

    if (state.at && this.atlas.get(state.at)) {
      this.select(state.at, { fly: true, zoom: state.zoom, push: false });
      return;
    }
    if (state.center) {
      this.director.flyTo(state.center, state.zoom || 6, { focus: false });
      return;
    }

    /* Nothing was asked for, so the globe introduces itself: a slow
       descent from orbit onto Africa, then the drift takes over.
       Ported from camera.js's flyToAustin — set high, pause, descend
       with a cubic ease — which is the single cheapest thing that
       makes a map feel authored rather than embedded. */
    if (this.opts.openingShot === false) {
      this.director.startIdle(3000);
      return;
    }
    window.setTimeout(function () {
      self.director.flyTo({ lat: 3.2, lng: 19.4 }, 3.5, { duration: 2.6, focus: false })
        .then(function () {
          self._refresh();
          self.director.startIdle(5000);
        });
    }, 420);
  };

  /* ── Keyboard ──────────────────────────────────────────────────── */

  Globe.prototype._buildKeyboard = function () {
    var self = this;
    this._onKey = function (e) {
      /* Never steal a keystroke from a field. A guest typing "1" into
         the search box means the character, not a skin change. */
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      /* Only while the globe has the guest's attention. A world map
         halfway down a page must not hijack the keyboard of someone
         reading the text above it. */
      if (!self._hasFocus()) return;

      var n = parseInt(e.key, 10);
      if (n >= 1 && n <= SKIN_ORDER.length) {
        self.setSkin(SKIN_ORDER[n - 1]);
        e.preventDefault();
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'escape': self.reset(); e.preventDefault(); break;
        case 'a': self.setArcs(!self.arcsOn); break;
        case 'l': self.setLabels(!self.labelsOn); break;
        case 'h': self.hudEl.classList.toggle('cg-off'); break;
        case 't':
          if (self._playing) self.stopJourney();
          else if (self.journeys.length) self.playJourney(self.journeys[0].id);
          break;
        default: break;
      }
    };
    document.addEventListener('keydown', this._onKey);
  };

  /**
   * Should this globe be answering the keyboard?
   *
   * Two ways to say yes, and the second is the one that matters. A
   * guest who has clicked into the map owns it outright. But on the
   * world page the map IS the page, and requiring a click before `1`
   * or `Esc` does anything is a shortcut nobody discovers.
   *
   * So the second test is dominance: how much of what the guest can
   * actually see is this map. Above 40% of the viewport it is plainly
   * the thing being looked at and the keys are its own; below that it
   * is an illustration inside an article, and stealing `1` from
   * someone reading around it would be the map overreaching.
   *
   * An earlier version tested the map's edges against fixed
   * fractions, which failed whenever the map sat below a tall hero —
   * exactly the layout of the page it was written for.
   */
  Globe.prototype._hasFocus = function () {
    if (this.host.contains(document.activeElement)) return true;

    var vh = window.innerHeight || 800;
    var r = this.host.getBoundingClientRect();
    var visible = Math.min(r.bottom, vh) - Math.max(r.top, 0);
    return visible / vh >= 0.4;
  };

  Globe.prototype.destroy = function () {
    document.removeEventListener('keydown', this._onKey);
    this.director.cancel();
    this.arcs.destroy();
    this.map.remove();
    this.host.innerHTML = '';
    this.host.classList.remove('cg');
  };

  /* ══ PUBLIC API ════════════════════════════════════════════════════ */

  function resolveEl(x) {
    if (typeof x === 'string') return document.getElementById(x.replace(/^#/, ''));
    return x || null;
  }

  var CabanaGlobe = {
    /**
     * Build the world map inside `el`.
     *
     * @param {HTMLElement|string} el
     * @param {Object} [opts]
     * @param {boolean} [opts.openingShot=true] play the descent on load
     * @returns {Promise<Globe>}
     */
    mount: function (el, opts) {
      var host = resolveEl(el);
      if (!host) return Promise.reject(new Error('CabanaGlobe: no host element'));

      ensureCSS();
      host.classList.add('cg', 'cg-booting');
      if (!host.querySelector('.cg-boot')) {
        host.appendChild(Object.assign(document.createElement('div'), {
          className: 'cg-boot',
          innerHTML: '<div class="cg-boot-orb"></div>' +
            '<div class="cg-boot-t">Bringing the world up…</div>'
        }));
      }

      return Promise.all([loadLeaflet(), loadAtlas()])
        .then(function (both) {
          var globe = new Globe(host, both[1], opts || {});
          host.classList.remove('cg-booting');
          var boot = host.querySelector('.cg-boot');
          if (boot && boot.parentNode) boot.parentNode.removeChild(boot);
          window.CabanaGlobe.instance = globe;
          host.dispatchEvent(new CustomEvent('cabana-globe:ready', {
            detail: { globe: globe }, bubbles: true
          }));
          return globe;
        })
        .catch(function (err) {
          host.classList.remove('cg-booting');
          host.innerHTML = '<div class="cg-boot cg-boot-fail">' +
            '<div class="cg-boot-t">The map could not load.</div>' +
            '<div class="cg-boot-s">Every destination is still browsable — ' +
            'try <a href="/apartments">apartments</a> or ' +
            '<a href="/africa-apartments">Africa</a>.</div></div>';
          throw err;
        });
    },

    /** The loaded inventory, for anything else that wants it. */
    atlas: loadAtlas,

    /* Exposed so the unit tests can exercise the ported maths without
       a browser, a map or a network. Everything here is pure. */
    _internals: {
      allocate: allocate,
      basePriority: basePriority,
      miniStatus: miniStatus,
      addressSegments: addressSegments,
      haversine: haversine,
      slerp: slerp,
      cubicInOut: cubicInOut,
      easeOutCubic: easeOutCubic,
      lodFor: lodFor,
      ShareLink: ShareLink,
      SKINS: SKINS,
      SKIN_ORDER: SKIN_ORDER,
      JOURNEYS: JOURNEYS,
      LOD: LOD,
      clamp: clamp
    }
  };

  window.CabanaGlobe = CabanaGlobe;

  if (typeof module !== 'undefined' && module.exports) module.exports = CabanaGlobe;
})();
