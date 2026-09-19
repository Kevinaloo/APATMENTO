/* ═══════════════════════════════════════════════════════════════════════════
   CABANA · THE LOCAL EFFECT — ENGINE
   ───────────────────────────────────────────────────────────────────────────
     THE RIPPLE FIELD   the hero's warm, slow water: rings spreading from
                        nowhere in particular, and from wherever a pointer
                        touches. Atmosphere, nothing more.

     THE LOCAL EFFECT   the argument of the whole page, made operable. One
                        introduction is dropped on a city; a ripple leaves
                        it, an arc carries it to a listing, and stays appear
                        around the listing. A tally counts what happened. It
                        is an illustration and the page says so twice.

     THE FIELD GUIDE    four stages of the real onboarding journey, each with
                        its own stamp, its own status, and language that does
                        not promise anything the programme does not.

     THE TWO CLOCKS     45 days and 365 days, drawn at the same scale so the
                        difference between them stops being an argument.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var Programme = global.CabanaProgramme;
  if (!Programme) return;

  var AMBER = '255,158,44';
  var GOLD = '255,210,122';
  var CLAY = '224,96,58';

  /* ══ 1 · THE RIPPLE FIELD ═══════════════════════════════════════════════ */
  function ripples() {
    var canvas = document.querySelector('[data-amb-ripples]');
    var context = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    if (!context) return;

    var W = canvas.width, H = canvas.height;
    var rings = [];
    var since = 0;

    function drop(x, y, strength) {
      rings.push({ x: x, y: y, r: 0, life: 0, max: 5.2 + Math.random() * 2.4, strength: strength || 1 });
      if (rings.length > 26) rings.shift();
    }

    canvas.addEventListener('pointermove', function (event) {
      if (!Programme.motion.active()) return;
      var box = canvas.getBoundingClientRect();
      if (Math.random() > 0.08) return;                 // one in twelve moves
      drop((event.clientX - box.left) / box.width * W,
           (event.clientY - box.top) / box.height * H, 0.7);
    });

    Programme.loop(canvas, function (time, dt, still) {
      if (still && !rings.length) { drop(W * 0.3, H * 0.44, 1); drop(W * 0.7, H * 0.6, 0.8); }
      if (!still) {
        since += dt;
        if (since > 1.15) { since = 0; drop(W * (0.12 + Math.random() * 0.76), H * (0.16 + Math.random() * 0.7), 1); }
      }

      context.clearRect(0, 0, W, H);
      for (var i = rings.length - 1; i >= 0; i--) {
        var ring = rings[i];
        if (!still) ring.life += dt;
        var t = ring.life / ring.max;
        if (t >= 1) { rings.splice(i, 1); continue; }
        var radius = 20 + t * 520;
        var alpha = (1 - t) * (1 - t) * 0.5 * ring.strength;
        context.beginPath();
        context.arc(ring.x, ring.y, radius, 0, Math.PI * 2);
        context.strokeStyle = 'rgba(' + (i % 3 === 0 ? GOLD : AMBER) + ',' + alpha + ')';
        context.lineWidth = 1.4;
        context.stroke();
        if (t < 0.36) {
          context.beginPath();
          context.arc(ring.x, ring.y, 3.4, 0, Math.PI * 2);
          context.fillStyle = 'rgba(' + GOLD + ',' + (1 - t / 0.36) * 0.8 + ')';
          context.fill();
        }
      }
    });
  }

  /* ══ 2 · THE LOCAL EFFECT ═══════════════════════════════════════════════
     A deliberately coarse outline: enough of Africa to be recognised at a
     glance, not so much that it pretends to be a map you could navigate by. */
  var AFRICA = [
    [-5.8, 35.9], [3, 36.9], [10, 37.2], [15, 32.4], [20, 32.9], [25, 31.6],
    [30, 31.2], [32.5, 31.2], [34.5, 28], [35.5, 23.5], [37, 21], [38.5, 17.5],
    [39.5, 15.5], [43, 12.7], [43.5, 11.5], [51.4, 11.8], [51, 10], [45.3, 2],
    [41.5, -2], [39.7, -4.1], [39.5, -7], [40.5, -10.5], [40.6, -14], [36.9, -18.5],
    [35, -21], [32.6, -25.9], [31, -29.8], [28, -32.5], [25.6, -34], [18.4, -34.3],
    [17, -32], [14.5, -22.8], [11.8, -18], [13.4, -12.6], [12.2, -6], [12.5, -5.8],
    [9.3, -0.7], [9.5, 4], [8.5, 4.5], [5.5, 4.3], [1, 5.8], [-3, 5],
    [-7.5, 4.4], [-9.4, 6.5], [-13.3, 8.5], [-15, 11], [-17.5, 14.7], [-16.5, 20],
    [-13, 27.7], [-9.6, 30.4], [-7.6, 33.6],
  ];

  /* Madagascar is what makes the silhouette unmistakable at a glance. */
  var MADAGASCAR = [
    [49.4, -12.1], [50.5, -15.4], [49.8, -16.9], [47.1, -24.9], [45.2, -25.6],
    [43.3, -22.3], [43.2, -19.0], [44.5, -16.2], [46.4, -15.7], [48.0, -13.3],
  ];

  var CITIES = [
    { name: 'Nairobi', lon: 36.8, lat: -1.3 },
    { name: 'Lagos', lon: 3.4, lat: 6.5 },
    { name: 'Cape Town', lon: 18.4, lat: -33.9 },
    { name: 'Marrakesh', lon: -8.0, lat: 31.6 },
    { name: 'Accra', lon: -0.2, lat: 5.6 },
    { name: 'Zanzibar', lon: 39.2, lat: -6.2 },
    { name: 'Kigali', lon: 30.1, lat: -1.9 },
    { name: 'Dakar', lon: -17.4, lat: 14.7 },
    { name: 'Cairo', lon: 31.2, lat: 30.0 },
    { name: 'Windhoek', lon: 17.1, lat: -22.6 },
  ];

  function localEffect() {
    var host = document.querySelector('[data-amb-effect]');
    if (!host) return;
    var canvas = host.querySelector('[data-effect-canvas]');
    var context = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    if (!context) return;

    var W = canvas.width, H = canvas.height;
    var PAD = 58;
    var LON0 = -19, LON1 = 53, LAT0 = 38, LAT1 = -36;
    var boxW = W - PAD * 2, boxH = H - PAD * 2;
    var scale = Math.min(boxW / (LON1 - LON0), boxH / (LAT0 - LAT1));
    var offX = (W - (LON1 - LON0) * scale) / 2;
    var offY = (H - (LAT0 - LAT1) * scale) / 2;

    function project(lon, lat) {
      return { x: offX + (lon - LON0) * scale, y: offY + (LAT0 - lat) * scale };
    }

    var shapes = [AFRICA, MADAGASCAR].map(function (shape) {
      return shape.map(function (p) { return project(p[0], p[1]); });
    });
    var cities = CITIES.map(function (c) {
      var p = project(c.lon, c.lat);
      return { name: c.name, x: p.x, y: p.y };
    });

    var pulses = [];     // expanding rings at a city
    var arcs = [];       // an introduction travelling to a listing
    var listings = [];   // listings that have been prepared
    var stays = [];      // sparks around a listing
    var cursor = 0;
    var tally = { intros: 0, listings: 0, stays: 0 };

    var out = {
      intros: host.querySelector('[data-tally-intros]'),
      listings: host.querySelector('[data-tally-listings]'),
      stays: host.querySelector('[data-tally-stays]'),
      city: host.querySelector('[data-effect-city]'),
    };

    function paintTally() {
      Programme.countUp(out.intros, tally.intros, { duration: 420 });
      Programme.countUp(out.listings, tally.listings, { duration: 480 });
      Programme.countUp(out.stays, tally.stays, { duration: 560 });
    }

    function introduce() {
      var city = cities[cursor % cities.length];
      cursor++;
      if (out.city) out.city.textContent = city.name;

      pulses.push({ x: city.x, y: city.y, life: 0, max: 2.8 });
      tally.intros++;

      /* The listing appears a short hop from the city — near enough to read
         as "somewhere they know", far enough to see the arc travel. */
      var angle = Math.random() * Math.PI * 2;
      var distance = 44 + Math.random() * 58;
      var target = {
        x: Math.max(offX + 16, Math.min(W - offX - 16, city.x + Math.cos(angle) * distance)),
        y: Math.max(offY + 16, Math.min(H - offY - 16, city.y + Math.sin(angle) * distance)),
        life: 0,
      };
      arcs.push({ from: city, to: target, life: 0, max: 1.5, target: target });
      paintTally();
    }

    host.querySelectorAll('[data-effect-go]').forEach(function (button) {
      button.addEventListener('click', introduce);
    });
    canvas.addEventListener('click', introduce);

    /* The map arrives with two introductions already settled, so the first
       frame — and any screenshot of it — shows the effect rather than an
       empty continent waiting to be clicked. */
    function seed() {
      for (var n = 0; n < 2; n++) {
        introduce();
        var arc = arcs.pop();
        pulses.pop();
        listings.push(arc.target);
        tally.listings++;
        var count = 3 + n;
        for (var k = 0; k < count; k++) {
          stays.push({
            x: arc.target.x, y: arc.target.y,
            angle: (k / count) * Math.PI * 2 + n,
            radius: 0, reach: 18 + k * 7, delay: 0, life: 2,
          });
        }
        tally.stays += count;
      }
      paintTally();
    }

    var autoplay = 0;
    var seeded = false;

    Programme.loop(canvas, function (time, dt, still) {
      if (!seeded) { seeded = true; seed(); introduce(); }
      if (!still) {
        autoplay += dt;
        /* Keeps moving on its own for anyone who never clicks, but stops
           adding once the map has made its point. */
        if (autoplay > 4.2 && tally.intros < 7) { autoplay = 0; introduce(); }
      }

      context.clearRect(0, 0, W, H);

      /* Landmass. Built once per frame as a path, then used three times:
         as a glow, as a fill, and as a clip for the graticule inside it. */
      function trace() {
        context.beginPath();
        shapes.forEach(function (shape) {
          context.moveTo(shape[0].x, shape[0].y);
          for (var i = 1; i < shape.length; i++) context.lineTo(shape[i].x, shape[i].y);
          context.closePath();
        });
      }

      trace();
      context.save();
      context.shadowColor = 'rgba(' + AMBER + ',0.55)';
      context.shadowBlur = 46;
      context.fillStyle = 'rgba(' + AMBER + ',0.10)';
      context.fill();
      context.restore();

      trace();
      var land = context.createLinearGradient(0, offY, 0, H - offY);
      land.addColorStop(0, 'rgba(255,210,122,0.30)');
      land.addColorStop(.55, 'rgba(255,158,44,0.18)');
      land.addColorStop(1, 'rgba(224,96,58,0.20)');
      context.fillStyle = land;
      context.fill();

      /* A graticule, clipped to the coastline, so the continent reads as a
         chart rather than a silhouette. */
      context.save();
      trace();
      context.clip();
      context.strokeStyle = 'rgba(' + GOLD + ',0.16)';
      context.lineWidth = 1;
      for (var gx = offX; gx < W; gx += 38) {
        context.beginPath(); context.moveTo(gx, 0); context.lineTo(gx, H); context.stroke();
      }
      for (var gy = offY; gy < H; gy += 38) {
        context.beginPath(); context.moveTo(0, gy); context.lineTo(W, gy); context.stroke();
      }
      context.restore();

      trace();
      context.strokeStyle = 'rgba(' + GOLD + ',0.72)';
      context.lineWidth = 2.2;
      context.lineJoin = 'round';
      context.stroke();

      /* Cities. */
      cities.forEach(function (city, index) {
        var live = index < cursor;
        var breathe = still ? 0.5 : (Math.sin(time * 1.4 + index) * 0.5 + 0.5);
        if (live) {
          context.beginPath();
          context.arc(city.x, city.y, 9 + breathe * 4, 0, Math.PI * 2);
          context.strokeStyle = 'rgba(' + GOLD + ',0.34)';
          context.lineWidth = 1.2;
          context.stroke();
        }
        context.beginPath();
        context.arc(city.x, city.y, live ? 5 : 3, 0, Math.PI * 2);
        context.fillStyle = live
          ? 'rgba(255,240,214,' + (0.8 + breathe * 0.2) + ')'
          : 'rgba(' + GOLD + ',0.34)';
        context.fill();
        if (live) {
          context.font = '600 17px "IBM Plex Sans", system-ui, sans-serif';
          context.textAlign = city.x > W * 0.6 ? 'right' : 'left';
          var tx = city.x + (city.x > W * 0.6 ? -14 : 14);
          context.fillStyle = 'rgba(7,22,15,0.7)';
          context.fillText(city.name, tx + 1, city.y + 7);
          context.fillStyle = 'rgba(255,244,227,0.94)';
          context.fillText(city.name, tx, city.y + 6);
        }
      });

      /* Ripples leaving a city. */
      for (var p = pulses.length - 1; p >= 0; p--) {
        var pulse = pulses[p];
        if (!still) pulse.life += dt;
        var pt = pulse.life / pulse.max;
        if (pt >= 1) { pulses.splice(p, 1); continue; }
        for (var ring = 0; ring < 3; ring++) {
          var rt = pt - ring * 0.16;
          if (rt <= 0) continue;
          context.beginPath();
          context.arc(pulse.x, pulse.y, 6 + rt * 130, 0, Math.PI * 2);
          context.strokeStyle = 'rgba(' + AMBER + ',' + (1 - rt) * 0.5 + ')';
          context.lineWidth = 1.4;
          context.stroke();
        }
      }

      /* The introduction in flight. */
      for (var a = arcs.length - 1; a >= 0; a--) {
        var arc = arcs[a];
        if (!still) arc.life += dt;
        var at = Math.min(1, arc.life / arc.max);
        var lift = 46;
        var cx = (arc.from.x + arc.to.x) / 2;
        var cy = (arc.from.y + arc.to.y) / 2 - lift;

        context.beginPath();
        context.moveTo(arc.from.x, arc.from.y);
        var steps = Math.max(2, Math.round(at * 26));
        for (var s = 1; s <= steps; s++) {
          var u = (s / steps) * at;
          var v = 1 - u;
          context.lineTo(
            v * v * arc.from.x + 2 * v * u * cx + u * u * arc.to.x,
            v * v * arc.from.y + 2 * v * u * cy + u * u * arc.to.y
          );
        }
        context.strokeStyle = 'rgba(' + CLAY + ',0.78)';
        context.lineWidth = 2;
        context.stroke();

        if (at >= 1) {
          arcs.splice(a, 1);
          listings.push(arc.target);
          tally.listings++;
          var count = 2 + Math.floor(Math.random() * 4);
          for (var k = 0; k < count; k++) {
            stays.push({
              x: arc.target.x, y: arc.target.y,
              angle: Math.random() * Math.PI * 2,
              radius: 0, reach: 16 + Math.random() * 30,
              delay: k * 0.22, life: 0,
            });
          }
          tally.stays += count;
          paintTally();
        }
      }

      /* Listings, and the stays that gather around them. */
      listings.forEach(function (listing) {
        if (!still) listing.life += dt;
        var glow = context.createRadialGradient(listing.x, listing.y, 0, listing.x, listing.y, 38);
        glow.addColorStop(0, 'rgba(' + CLAY + ',0.5)');
        glow.addColorStop(1, 'rgba(' + CLAY + ',0)');
        context.fillStyle = glow;
        context.beginPath();
        context.arc(listing.x, listing.y, 38, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = 'rgba(255,236,204,0.96)';
        context.beginPath();
        context.arc(listing.x, listing.y, 3.4, 0, Math.PI * 2);
        context.fill();
      });

      stays.forEach(function (spark) {
        if (!still) spark.life += dt;
        var st = Math.max(0, Math.min(1, (spark.life - spark.delay) / 0.9));
        if (st <= 0) return;
        var r = spark.reach * (1 - Math.pow(1 - st, 3));
        context.beginPath();
        context.arc(spark.x + Math.cos(spark.angle) * r, spark.y + Math.sin(spark.angle) * r, 2.2, 0, Math.PI * 2);
        context.fillStyle = 'rgba(' + GOLD + ',' + (0.35 + st * 0.6) + ')';
        context.fill();
      });
    });

    paintTally();
  }

  /* ══ 3 · THE FIELD GUIDE ════════════════════════════════════════════════ */
  var STAGES = [
    {
      mark: '↗', label: 'The first hello', number: '01 / 04',
      title: 'A connection,<br>recorded.',
      copy: 'Reserve your introduction in the dashboard. You have 45 days to help them take the next step.',
      status: 'Reserved · No earnings yet',
    },
    {
      mark: '✳', label: 'The groundwork', number: '02 / 04',
      title: 'A listing,<br>prepared.',
      copy: 'Build the listing alongside its owner — the photographs, the prices, the small local knowledge no form asks for. It stays unpublished until they accept it.',
      status: 'Draft · Waiting on the owner',
    },
    {
      mark: '⌂', label: 'The handover', number: '03 / 04',
      title: 'The keys,<br>handed over.',
      copy: 'The owner signs in and accepts. The listing becomes theirs, and your dashboard records the handover — registration and acceptance are separate milestones.',
      status: 'Accepted · Referral period begins',
    },
    {
      mark: '★', label: 'The long tail', number: '04 / 04',
      title: 'The bookings,<br>and your share.',
      copy: 'Eligible attributed bookings in the 365-day referral period earn a share of Cabana’s service fee, where a fee applies. Your rewards page tracks each one.',
      status: 'Live · Commission on eligible bookings',
    },
  ];

  function fieldGuide() {
    var card = document.getElementById('amb-journey-detail');
    var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-amb-stage]'));
    if (!card || !buttons.length) return;

    var parts = {
      number: document.getElementById('amb-example-number'),
      mark: document.getElementById('amb-example-mark'),
      label: document.getElementById('amb-example-label'),
      title: document.getElementById('amb-example-title'),
      copy: document.getElementById('amb-example-copy'),
      status: document.getElementById('amb-example-status'),
    };

    function show(index) {
      var stage = STAGES[index];
      if (!stage) return;
      card.dataset.activeStage = String(index);
      if (parts.number) parts.number.textContent = stage.number;
      if (parts.mark) parts.mark.textContent = stage.mark;
      if (parts.label) parts.label.textContent = stage.label;
      if (parts.title) parts.title.innerHTML = stage.title;
      if (parts.copy) parts.copy.textContent = stage.copy;
      if (parts.status) parts.status.textContent = stage.status;
      buttons.forEach(function (button, i) {
        button.setAttribute('aria-pressed', String(i === index));
      });
      if (Programme.motion.active()) {
        card.classList.remove('is-changing');
        void card.offsetWidth;
        card.classList.add('is-changing');
      }
    }

    buttons.forEach(function (button, index) {
      button.addEventListener('click', function () { show(index); });
    });
    show(0);
  }

  /* ══ 4 · THE TWO CLOCKS ═════════════════════════════════════════════════ */
  function clocks() {
    var host = document.querySelector('[data-amb-clocks]');
    if (!host) return;

    host.querySelectorAll('[data-clock]').forEach(function (canvas, index) {
      var context = canvas.getContext ? canvas.getContext('2d') : null;
      if (!context) return;
      var days = Number(canvas.dataset.clock) || 45;
      var W = canvas.width, H = canvas.height, C = W / 2, R = W * 0.36;

      Programme.loop(canvas, function (time, dt, still) {
        /* Both dials run the same cycle length, so the 45-day ring visibly
           completes many times while the 365-day ring creeps round once. */
        var cycle = 9;
        var progress = still ? 0.62 : ((time + index * 1.5) % cycle) / cycle;
        var sweep = days === 45 ? (progress * 8) % 1 : progress;

        context.clearRect(0, 0, W, H);
        context.save();
        context.translate(C, C);
        context.rotate(-Math.PI / 2);

        context.lineWidth = 12;
        context.lineCap = 'round';
        context.strokeStyle = 'rgba(255,210,122,0.14)';
        context.beginPath();
        context.arc(0, 0, R, 0, Math.PI * 2);
        context.stroke();

        var gradient = context.createLinearGradient(-R, -R, R, R);
        gradient.addColorStop(0, days === 45 ? '#ffd27a' : '#e0603a');
        gradient.addColorStop(1, days === 45 ? '#ff9e2c' : '#ffd27a');
        context.strokeStyle = gradient;
        context.shadowColor = 'rgba(255,158,44,0.55)';
        context.shadowBlur = 20;
        context.beginPath();
        context.arc(0, 0, R, 0, Math.PI * 2 * Math.max(0.02, sweep));
        context.stroke();
        context.shadowBlur = 0;

        /* Day ticks: 45 of them, or 12 months. */
        var ticks = days === 45 ? 45 : 12;
        for (var t = 0; t < ticks; t++) {
          var angle = (t / ticks) * Math.PI * 2;
          context.save();
          context.rotate(angle);
          context.fillStyle = (t / ticks) < sweep ? 'rgba(255,236,204,0.75)' : 'rgba(255,210,122,0.2)';
          context.fillRect(R + 13, -1, days === 45 ? 5 : 9, 2);
          context.restore();
        }
        context.restore();

        context.textAlign = 'center';
        context.fillStyle = 'rgba(255,236,204,0.96)';
        context.font = '700 58px "Fraunces Variable", Georgia, serif';
        context.fillText(String(days), C, C + 12);
        context.font = '600 15px "IBM Plex Sans", system-ui, sans-serif';
        context.fillStyle = 'rgba(253,244,227,0.6)';
        context.fillText('DAYS', C, C + 42);
      });
    });
  }

  Programme.onReady(function () {
    ripples();
    localEffect();
    fieldGuide();
    clocks();
  });
})(window);
