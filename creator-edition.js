/* ═══════════════════════════════════════════════════════════════════════════
   CABANA · THE CREATOR EDITION — ENGINE
   ───────────────────────────────────────────────────────────────────────────
   Three machines live on this page.

     THE REEL     a short film, drawn frame by frame on a canvas rather than
                  shipped as a video: it stays sharp on any display, weighs
                  nothing beyond the photographs already on the page, and can
                  be scrubbed, paused and chaptered like real footage.

     THE ENGINE   an illustration of how an audience becomes attention and
                  attention becomes a stay. Every number on it is derived
                  from the three sliders in front of the visitor, and the
                  page says so plainly — it is a toy, not a forecast.

     THE STUDIO   a live cover and the post behind it, sharing one state so
                  flipping the card never shows two different stories.

   None of them owns a frame loop. They all register with the programme
   runtime, which is the single thing that decides whether anything moves.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var Programme = global.CabanaProgramme;
  if (!Programme) return;

  var ART = '/assets/programmes/';

  /* ══ 1 · THE REEL ═══════════════════════════════════════════════════════ */
  function reel() {
    var host = document.querySelector('[data-creator-reel]');
    if (!host) return;
    var canvas = host.querySelector('[data-reel-canvas]');
    var context = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    if (!context) return;

    var W = canvas.width, H = canvas.height;
    var SHOT = 4.6;                                  // seconds per chapter
    /* `shift` pushes the photograph to the right so the type has clean dark
       space on the left — the frame is composed, not just cropped. */
    var shots = [
      { src: ART + 'influencer-editorial.webp', focus: .20, shift: .21,
        kicker: 'One', line: 'The invitation.', sub: 'A host wants your eye on their place.' },
      { src: ART + 'ambassador-editorial.webp', focus: .26, shift: .17,
        kicker: 'Two', line: 'The place.', sub: 'Somewhere worth the carousel.' },
      { src: ART + 'agent-editorial.webp', focus: .14, shift: .19,
        kicker: 'Three', line: 'The post.', sub: 'Your voice. Your crop. Your call.' },
      { src: ART + 'influencer-editorial.webp', focus: .30, shift: .15,
        kicker: 'Four', line: 'The booking.', sub: 'Someone stays because of you.' },
    ];

    /* The reel needs the full-size photographs, and they are the heaviest
       thing on the page. Nothing is fetched until the reel is within a
       screen of the viewport — the hero must not queue behind a film that
       nobody has scrolled to yet. */
    var warmed = false;
    function warm() {
      if (warmed) return;
      warmed = true;
      shots.forEach(function (shot) {
        var image = new Image();
        image.decoding = 'async';
        image.addEventListener('load', function () {
          shot.image = image;
          if (shot.onload) shot.onload();
        });
        image.src = shot.src;
        shot.tag = image;
      });
    }
    if (global.IntersectionObserver) {
      var watcher = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) { warm(); watcher.disconnect(); }
      }, { rootMargin: '700px' });
      watcher.observe(host);
    } else {
      warm();
    }

    /* A single noise tile, drawn once and then stamped at a random offset
       every frame. Cheaper than per-pixel noise by two orders of magnitude. */
    var grain = document.createElement('canvas');
    grain.width = grain.height = 190;
    (function () {
      var gc = grain.getContext('2d');
      var data = gc.createImageData(190, 190);
      for (var i = 0; i < data.data.length; i += 4) {
        var v = 128 + (Math.random() - .5) * 190;
        data.data[i] = data.data[i + 1] = data.data[i + 2] = v;
        data.data[i + 3] = 26;
      }
      gc.putImageData(data, 0, 0);
    })();

    /* Start mid-chapter so the very first painted frame is a composed shot
       with its title, not the blank half of a cut. */
    var clock = SHOT * 0.4;
    var playing = true;
    var toggle = host.querySelector('[data-reel-toggle]');
    var toggleLabel = host.querySelector('[data-reel-label]');
    var timecode = host.querySelector('[data-reel-timecode]');
    var progress = host.querySelector('[data-reel-progress]');
    var chapters = Array.prototype.slice.call(host.querySelectorAll('[data-reel-seek]'));
    var total = SHOT * shots.length;
    var lastChapter = -1;

    function easeOut(p) { return 1 - Math.pow(1 - p, 3); }

    function drawShot(shot, p, alpha, drift) {
      var image = shot.image;
      if (!image || !image.naturalWidth || alpha <= 0.004) return;
      var scale = 1.24 + p * 0.10;                       // the slow push in
      var ratio = Math.max(W / image.naturalWidth, H / image.naturalHeight) * scale;
      var w = image.naturalWidth * ratio;
      var h = image.naturalHeight * ratio;
      /* Clamped so the photograph always covers the frame: a pan that opens
         a gap at one edge looks like a bug, not a camera move. */
      var x = Math.min(0, Math.max(W - w, (W - w) / 2 + w * shot.shift)) + drift;
      var y = -(h - H) * shot.focus - p * 22;
      context.save();
      context.globalAlpha = alpha;
      context.drawImage(image, x, y, w, h);
      context.restore();
    }

    function type(text, p, x, y, size, weight, colour, spacing) {
      context.save();
      context.font = weight + ' ' + size + 'px "Bodoni Moda Variable", Georgia, serif';
      context.fillStyle = colour;
      context.textBaseline = 'alphabetic';
      var shown = Math.ceil(text.length * Math.max(0, Math.min(1, p)));
      var slice = text.slice(0, shown);
      if (spacing) {
        var cx = x;
        for (var i = 0; i < slice.length; i++) {
          context.fillText(slice[i], cx, y);
          cx += context.measureText(slice[i]).width + spacing;
        }
      } else {
        context.fillText(slice, x, y);
      }
      context.restore();
    }

    function render(_t, dt, still) {
      if (playing && !still) clock = (clock + dt) % total;

      var index = Math.min(shots.length - 1, Math.floor(clock / SHOT));
      var p = (clock - index * SHOT) / SHOT;
      var shot = shots[index];
      var previous = shots[(index + shots.length - 1) % shots.length];

      context.clearRect(0, 0, W, H);
      context.fillStyle = '#07050d';
      context.fillRect(0, 0, W, H);

      /* The cut: the outgoing shot slides left and fades as the incoming one
         arrives from the right. Short, so the frame is never two photographs
         for longer than it takes to read as a cut. */
      var cut = Math.min(1, p / 0.14);
      var cutEase = easeOut(cut);
      if (cut < 1) drawShot(previous, 1, 1 - cutEase, -cutEase * W * 0.20);
      drawShot(shot, p, cutEase, (1 - cutEase) * W * 0.22);

      /* Colour grade: a magenta-to-violet wash, then a deep left-hand
         gradient that gives the typography something to sit on. */
      var wash = context.createLinearGradient(0, 0, W, H);
      wash.addColorStop(0, 'rgba(255,46,147,0.16)');
      wash.addColorStop(.55, 'rgba(8,5,16,0.12)');
      wash.addColorStop(1, 'rgba(123,77,255,0.22)');
      context.fillStyle = wash;
      context.fillRect(0, 0, W, H);

      var shade = context.createLinearGradient(0, 0, W * 0.72, 0);
      shade.addColorStop(0, 'rgba(5,3,10,0.88)');
      shade.addColorStop(.45, 'rgba(5,3,10,0.52)');
      shade.addColorStop(1, 'rgba(5,3,10,0)');
      context.fillStyle = shade;
      context.fillRect(0, 0, W, H);

      var vignette = context.createRadialGradient(W / 2, H / 2, H * 0.30, W / 2, H / 2, H * 0.95);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.68)');
      context.fillStyle = vignette;
      context.fillRect(0, 0, W, H);

      /* Flash on the cut. */
      if (cut < 1) {
        context.fillStyle = 'rgba(255,255,255,' + (0.42 * (1 - cut) * (1 - cut)) + ')';
        context.fillRect(0, 0, W, H);
      }

      /* Kinetic type. */
      var enter = Math.min(1, Math.max(0, (p - 0.08) / 0.20));
      var exit = Math.min(1, Math.max(0, (p - 0.90) / 0.10));
      var alpha = easeOut(enter) * (1 - exit);
      var lift = (1 - easeOut(enter)) * 54;

      context.save();
      context.globalAlpha = alpha;
      context.translate(0, lift);
      context.shadowColor = 'rgba(0,0,0,0.65)';
      context.shadowBlur = 26;
      context.shadowOffsetY = 4;

      context.save();
      context.font = '600 26px "IBM Plex Sans", system-ui, sans-serif';
      context.fillStyle = 'rgba(255,201,74,0.98)';
      var kicker = 'CHAPTER ' + shot.kicker.toUpperCase();
      var kx = 116;
      for (var k = 0; k < kicker.length; k++) {
        context.fillText(kicker[k], kx, 470);
        kx += context.measureText(kicker[k]).width + 8;
      }
      context.restore();

      type(shot.line, (p - 0.06) / 0.15, 112, 600, 104, '800', '#ffffff', 0);

      context.save();
      context.globalAlpha = alpha * .9;
      context.font = '400 28px "IBM Plex Sans", system-ui, sans-serif';
      context.fillStyle = 'rgba(255,255,255,0.88)';
      context.fillText(shot.sub, 116, 664);
      context.restore();

      /* Underline that draws itself across the chapter. */
      context.save();
      context.globalAlpha = alpha;
      context.shadowBlur = 0;
      var rule = context.createLinearGradient(112, 0, 112 + 460 * easeOut(enter), 0);
      rule.addColorStop(0, '#ff2e93');
      rule.addColorStop(1, '#ffc94a');
      context.fillStyle = rule;
      context.fillRect(112, 706, 460 * easeOut(enter), 3);
      context.restore();
      context.restore();

      /* Frame furniture: corner marks, so it reads as footage. */
      context.save();
      context.strokeStyle = 'rgba(255,255,255,0.4)';
      context.lineWidth = 3;
      [[86, 96, 1, 1], [W - 86, 96, -1, 1], [86, H - 96, 1, -1], [W - 86, H - 96, -1, -1]]
        .forEach(function (corner) {
          context.beginPath();
          context.moveTo(corner[0], corner[1] + 34 * corner[3]);
          context.lineTo(corner[0], corner[1]);
          context.lineTo(corner[0] + 34 * corner[2], corner[1]);
          context.stroke();
        });
      context.restore();

      /* Grain, stamped at a random offset. */
      context.save();
      context.globalAlpha = .5;
      context.globalCompositeOperation = 'overlay';
      var ox = -Math.random() * 190, oy = -Math.random() * 190;
      for (var gx = ox; gx < W; gx += 190) {
        for (var gy = oy; gy < H; gy += 190) context.drawImage(grain, gx, gy);
      }
      context.restore();

      /* HUD outside the canvas. */
      if (progress) progress.style.width = ((clock / total) * 100).toFixed(2) + '%';
      if (timecode) {
        var seconds = Math.floor(clock);
        timecode.textContent = String(Math.floor(seconds / 60)).padStart(2, '0') + ':' +
                               String(seconds % 60).padStart(2, '0');
      }
      if (index !== lastChapter) {
        lastChapter = index;
        chapters.forEach(function (button, i) {
          button.setAttribute('aria-pressed', String(i === index));
        });
      }
    }

    var handle = Programme.loop(host, render);

    function setPlaying(next) {
      playing = next;
      if (toggle) toggle.setAttribute('aria-pressed', String(playing));
      if (toggleLabel) toggleLabel.textContent = playing ? 'Pause reel' : 'Play reel';
      handle.redraw();
    }
    if (toggle) toggle.addEventListener('click', function () { setPlaying(!playing); });

    chapters.forEach(function (button) {
      button.addEventListener('click', function () {
        clock = Number(button.getAttribute('data-reel-seek')) * SHOT + 0.001;
        lastChapter = -1;
        handle.redraw();
      });
    });

    /* When the whole page pauses, the reel's own control should agree with
       what the visitor can see. */
    Programme.motion.onChange(function (active) {
      if (toggle) toggle.disabled = !active;
      if (toggleLabel && !active) toggleLabel.textContent = 'Play reel';
      else if (toggleLabel) toggleLabel.textContent = playing ? 'Pause reel' : 'Play reel';
    });

    /* Redraw once each photograph lands, so a slow connection still fills in. */
    shots.forEach(function (shot) { shot.onload = handle.redraw; });
  }

  /* ══ 2 · THE CLOUT ENGINE ═══════════════════════════════════════════════ */
  function cloutEngine() {
    var host = document.querySelector('[data-clout-engine]');
    if (!host) return;
    var canvas = host.querySelector('[data-clout-canvas]');
    var context = canvas && canvas.getContext ? canvas.getContext('2d') : null;

    var audience = host.querySelector('#clout-audience');
    var engagement = host.querySelector('#clout-engagement');
    var collabs = host.querySelector('#clout-collabs');
    if (!audience || !engagement || !collabs) return;

    var out = {
      audience: host.querySelector('[data-clout-audience-label]'),
      engagement: host.querySelector('[data-clout-engagement-label]'),
      collabs: host.querySelector('[data-clout-collabs-label]'),
      reach: host.querySelector('[data-clout-reach]'),
      band: host.querySelector('[data-clout-band]'),
      engaged: host.querySelector('[data-clout-engaged]'),
      bookings: host.querySelector('[data-clout-bookings]'),
      money: host.querySelector('[data-clout-money]'),
    };

    /* Deliberately plain arithmetic. Anyone can check it against the sliders,
       which is the only way a number like this is worth showing at all. */
    var SAMPLE_BOOKING = 20000;   // KES, the figure named in the label
    var SAMPLE_RATE = 0.08;       // 8%, the figure named in the label
    var BOOKING_RATE = 0.0015;    // stays per engaged person, per collaboration

    var BANDS = [
      [0, 'A room that leans in.'],
      [15000, 'A street that stops walking.'],
      [60000, 'A neighbourhood that screenshots.'],
      [200000, 'A city that changes its weekend.'],
      [800000, 'A continent that watches.'],
    ];

    var state = { reach: 0, target: 0, energy: 0.4, pulse: 0 };

    function read() {
      var people = Number(audience.value);
      var rate = Number(engagement.value) / 1000;     // 40 → 0.04
      var runs = Number(collabs.value);

      var engaged = Math.round(people * rate);
      var reach = Math.round(people * (0.4 + rate * 2.2) * runs);
      var bookings = Math.max(0, Math.round(engaged * runs * BOOKING_RATE));
      var money = bookings * SAMPLE_BOOKING * SAMPLE_RATE;

      out.audience.textContent = people.toLocaleString('en-KE');
      out.engagement.textContent = (rate * 100).toFixed(1) + '%';
      out.collabs.textContent = String(runs);

      Programme.countUp(out.engaged, engaged);
      Programme.countUp(out.bookings, bookings);
      Programme.countUp(out.money, money, { format: Programme.money });
      Programme.countUp(out.reach, reach, { format: Programme.compact });

      var band = BANDS[0][1];
      for (var i = 0; i < BANDS.length; i++) if (reach >= BANDS[i][0]) band = BANDS[i][1];
      if (out.band.textContent !== band) {
        out.band.textContent = band;
        out.band.style.animation = 'none';
        void out.band.offsetWidth;
        out.band.style.animation = '';
      }

      state.target = Math.min(1, Math.log10(1 + reach) / 6.2);
      state.energy = 0.35 + rate * 6;
      state.pulse = 1;
    }

    if (context) {
      var W = canvas.width, H = canvas.height, C = W / 2, R = W * 0.38;
      var sparks = [];
      for (var s = 0; s < 46; s++) {
        sparks.push({ a: Math.random() * Math.PI * 2, r: 0.62 + Math.random() * 0.46, v: 0.2 + Math.random() * 0.9, size: 1.4 + Math.random() * 3.4 });
      }

      Programme.loop(canvas, function (t, dt, still) {
        if (!still) {
          state.reach += (state.target - state.reach) * Math.min(1, dt * 3.4);
          state.pulse = Math.max(0, state.pulse - dt * 1.6);
        } else {
          state.reach = state.target;
        }
        context.clearRect(0, 0, W, H);

        /* Tick ring. */
        context.save();
        context.translate(C, C);
        context.rotate(still ? 0 : t * 0.16);
        for (var i = 0; i < 96; i++) {
          var angle = (i / 96) * Math.PI * 2;
          var long = i % 8 === 0;
          context.save();
          context.rotate(angle);
          context.fillStyle = long ? 'rgba(255,201,74,0.6)' : 'rgba(255,255,255,0.17)';
          context.fillRect(R * 1.12, -0.9, long ? 18 : 8, 1.8);
          context.restore();
        }
        context.restore();

        /* Track and progress arc. */
        context.save();
        context.translate(C, C);
        context.lineCap = 'round';
        context.lineWidth = 16;
        context.strokeStyle = 'rgba(255,255,255,0.08)';
        context.beginPath();
        context.arc(0, 0, R, -Math.PI * 0.75, Math.PI * 0.75);
        context.stroke();

        var sweep = -Math.PI * 0.75 + Math.PI * 1.5 * state.reach;
        var arc = context.createLinearGradient(-R, -R, R, R);
        arc.addColorStop(0, '#7b4dff');
        arc.addColorStop(.5, '#ff2e93');
        arc.addColorStop(1, '#ffc94a');
        context.strokeStyle = arc;
        context.shadowColor = 'rgba(255,46,147,0.75)';
        context.shadowBlur = 34;
        context.beginPath();
        context.arc(0, 0, R, -Math.PI * 0.75, sweep);
        context.stroke();
        context.shadowBlur = 0;

        /* The head of the arc, with a bloom that flares when a slider moves. */
        var hx = Math.cos(sweep) * R, hy = Math.sin(sweep) * R;
        var bloom = context.createRadialGradient(hx, hy, 0, hx, hy, 46 + state.pulse * 34);
        bloom.addColorStop(0, 'rgba(255,255,255,0.95)');
        bloom.addColorStop(.35, 'rgba(255,201,74,0.5)');
        bloom.addColorStop(1, 'rgba(255,46,147,0)');
        context.fillStyle = bloom;
        context.beginPath();
        context.arc(hx, hy, 46 + state.pulse * 34, 0, Math.PI * 2);
        context.fill();

        /* Sparks orbiting inside the dial — density follows engagement. */
        var live = Math.round(10 + state.energy * 34);
        for (var j = 0; j < Math.min(live, sparks.length); j++) {
          var spark = sparks[j];
          var a = spark.a + (still ? 0 : t * spark.v * 0.5);
          var rr = R * spark.r * (0.62 + 0.3 * Math.sin(a * 2 + j));
          context.globalAlpha = 0.18 + 0.5 * state.reach;
          context.fillStyle = j % 3 === 0 ? '#ffc94a' : (j % 3 === 1 ? '#ff2e93' : '#ffffff');
          context.beginPath();
          context.arc(Math.cos(a) * rr, Math.sin(a) * rr, spark.size, 0, Math.PI * 2);
          context.fill();
        }
        context.globalAlpha = 1;

        /* Inner glow. */
        var core = context.createRadialGradient(0, 0, 0, 0, 0, R * 0.92);
        core.addColorStop(0, 'rgba(255,46,147,' + (0.10 + state.reach * 0.20) + ')');
        core.addColorStop(1, 'rgba(255,46,147,0)');
        context.fillStyle = core;
        context.beginPath();
        context.arc(0, 0, R * 0.92, 0, Math.PI * 2);
        context.fill();
        context.restore();
      });
    }

    [audience, engagement, collabs].forEach(function (input) {
      input.addEventListener('input', read);
    });
    read();
  }

  /* ══ 3 · CREATOR STUDIO ═════════════════════════════════════════════════ */
  function studio() {
    var host = document.querySelector('[data-creator-demo]');
    if (!host) return;

    var DISCLOSURE = 'I may earn commission when you book through my link.';
    var SETTINGS = {
      coast: {
        title: 'The coast is calling.',
        strap: 'Salt air, slow mornings and a rooftop that knows what it is doing.',
        stem: 'influencer-editorial',
        alt: 'A rooftop above the coast at dusk',
        tag: 'THE COAST / YOUR EDIT',
        story: 'A slower morning. Salt in the air. One more reason to stay.\n\nYour next coastal chapter starts here.',
        guide: 'Save this for your next coastal escape: slow mornings, sea air, and a place to make your own.\n\nCheck the listing for current prices, photos and availability.',
        minimal: 'Salt air. Slow days.\nYour next coastal chapter.',
      },
      city: {
        title: 'A different side of the city.',
        strap: 'An unhurried check-in, and a whole weekend to make it yours.',
        stem: 'agent-editorial',
        alt: 'A sunlit colonnade in the city',
        tag: 'THE CITY / YOUR EDIT',
        story: 'An unhurried check-in. A city full of possibilities. A little space that feels like yours.\n\nMake a weekend of it.',
        guide: 'Your city break starts with the right base. Explore the photos, check the location, and choose the dates that work for you.',
        minimal: 'New city. Your rhythm.\nStay a little longer.',
      },
      wild: {
        title: 'A little closer to nature.',
        strap: 'Open skies, long conversations and a different kind of weekend.',
        stem: 'ambassador-editorial',
        alt: 'A green courtyard under old trees',
        tag: 'THE WILD / YOUR EDIT',
        story: 'Trade the everyday rush for a change of scenery. Open skies, long conversations, and a different kind of weekend.',
        guide: 'Planning a nature escape? Check the listing for its location, what is included, and current availability before you go.',
        minimal: 'More sky. Less hurry.\nFind your next escape.',
      },
    };

    var setting = 'coast';
    var mood = 'story';

    var title = host.querySelector('[data-demo-title]');
    var strap = host.querySelector('[data-demo-strap]');
    var image = host.querySelector('[data-demo-image]');
    var mirror = host.querySelector('[data-demo-mirror]');
    var tag = host.querySelector('[data-demo-tag]');
    var caption = host.querySelector('[data-demo-caption]');
    var status = host.querySelector('[data-copy-status]');
    var card = host.querySelector('[data-studio-card]');
    var flip = host.querySelector('[data-studio-flip]');

    function paint() {
      var content = SETTINGS[setting];
      if (title) title.textContent = content.title;
      if (strap) strap.textContent = content.strap;
      if (tag) tag.textContent = content.tag;
      if (image) {
        image.src = ART + content.stem + '-800.webp';
        image.srcset = ART + content.stem + '-540.webp 540w, ' + ART + content.stem + '-800.webp 800w';
        image.alt = content.alt;
      }
      if (mirror) mirror.src = ART + content.stem + '-540.webp';
      if (caption) caption.textContent = content[mood] + '\n\n' + DISCLOSURE;
      if (status) status.textContent = '';

      host.querySelectorAll('[data-setting]').forEach(function (button) {
        button.setAttribute('aria-pressed', String(button.dataset.setting === setting));
      });
      host.querySelectorAll('[data-mood]').forEach(function (button) {
        button.setAttribute('aria-pressed', String(button.dataset.mood === mood));
      });

      if (card && Programme.motion.active() && card.animate) {
        card.animate(
          [{ opacity: .55, transform: (card.classList.contains('is-flipped') ? 'rotateY(180deg) ' : '') + 'translateY(10px)' },
           { opacity: 1, transform: (card.classList.contains('is-flipped') ? 'rotateY(180deg) ' : '') + 'translateY(0)' }],
          { duration: 340, easing: 'cubic-bezier(.22,1,.36,1)' }
        );
      }
    }

    host.querySelectorAll('[data-setting]').forEach(function (button) {
      button.addEventListener('click', function () { setting = button.dataset.setting; paint(); });
    });
    host.querySelectorAll('[data-mood]').forEach(function (button) {
      button.addEventListener('click', function () { mood = button.dataset.mood; paint(); });
    });

    var flipLabel = host.querySelector('[data-flip-label]');
    function setFlipped(next) {
      if (!card) return;
      card.classList.toggle('is-flipped', next);
      if (flip) flip.setAttribute('aria-pressed', String(next));
      if (flipLabel) flipLabel.textContent = next ? 'Flip to the cover' : 'Flip to the post';
    }
    if (flip) flip.addEventListener('click', function () {
      setFlipped(!card.classList.contains('is-flipped'));
    });
    if (card) card.addEventListener('click', function () {
      setFlipped(!card.classList.contains('is-flipped'));
    });

    /* Copy, with the selection fallback that keeps this usable when the
       clipboard is blocked — on iOS in a cross-origin frame, for instance. */
    var copy = host.querySelector('[data-copy-post]');
    if (copy && caption) {
      copy.addEventListener('click', function () {
        function fallback() {
          var range = document.createRange();
          range.selectNodeContents(caption);
          var selection = global.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          if (status) status.textContent = 'Caption selected. Use your device’s copy command.';
        }
        try {
          navigator.clipboard.writeText(caption.textContent).then(function () {
            if (status) status.textContent = 'Copied. Make it your own before you share it.';
          }).catch(fallback);
        } catch (error) { fallback(); }
      });
    }

    paint();
  }

  /* The runtime boots itself the moment it is evaluated, which is before this
     file exists. onReady therefore fires immediately here rather than waiting
     for an event that has already been and gone. */
  Programme.onReady(function () {
    reel();
    cloutEngine();
    studio();
  });
})(window);
