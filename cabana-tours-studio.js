/* ═══════════════════════════════════════════════════════════════════
   CABANA TOURS · the studio (/tours-studio)
   ───────────────────────────────────────────────────────────────────
   Where a guide or operator runs their side of Cabana Tours:

     Marquee     build a slot for the top of /tours (the Spotlight
                 system underneath), see it exactly as travellers will,
                 pick dates against real availability, pay by M-Pesa,
                 then watch views and taps day by day
     Bookings    who is coming, when, how much is paid and what is due on
                 the day; contact and host codes appear once paid
     My tours    what is live, in review or paused; pause and resume a
                 live tour; propose changes to a live tour for review
                 (tour_change_propose), and see what happened to them
     Demand      where travellers are waiting for tours, as counts only
                 (tour_demand), so a guide knows what to list next
     360°        ask Cabana to film a tour in 360° and follow the request
                 until the world is linked to the tour

   Nothing here is trusted by the server: tour_spotlight_create checks
   ownership, media, words and inventory; payment settles through the
   same ledger as every booking; contact release is decided in SQL.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  var doc = global.document;
  function K() { return global.CabanaTours; }
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function el(id) { return doc.getElementById(id); }
  function friendly(e) {
    var m = String((e && (e.message || e.details)) || e || '');
    if (/Failed to fetch|NetworkError/i.test(m)) return 'You seem to be offline. Try again in a moment.';
    /* Tours go live only for a verified operator. Offer the check right
       there; it is the same one used everywhere on Cabana. */
    if (/Verify your identity/i.test(m) && global.CabanaIdentity && global.CabanaIdentity.ensure) {
      setTimeout(function () { global.CabanaIdentity.ensure('tour_operator', { title: 'Verify once to publish tours' }).catch(function () {}); }, 600);
    }
    return m.slice(0, 240) || 'Something went wrong. Please try again.';
  }

  var PK = [['day', '1 day', 'A launch or a one-off date'], ['week', '7 days', 'Most guides start here'], ['fortnight', '14 days', 'Covers two weekends'], ['month', '30 days', 'A full month at the top']];
  var SW = ['#F2541B', '#FFB21E', '#13925F', '#0FA3B8', '#7457F2', '#F24E7A'];
  var S = {
    tab: 'spotlight', user: null, op: null, opLoaded: false, tours: [], spots: null, bookings: null, scope: 'upcoming',
    changes: null, demand: null, films: null, editing: null,
    settings: null, cal: null, quote: null, busy: false,
    f: { tour: '', kind: 'image', media: '', poster: '', yt: '', focal: '50% 50%', kicker: '', headline: '', subline: '', cta: '', accent: '#F2541B', pkg: 'week', start: '' },
    uploader: null, preview: null, device: 'desktop'
  };

  /* ═══ LOADING ══════════════════════════════════════════════════════ */
  function loadAll() {
    var kit = K(), c = kit.sb(), u = kit.user();
    S.user = u;
    if (!u || !c) { paint(); return; }
    c.rpc('tour_operator_me').then(function (r) {
      S.op = r && r.data ? r.data : null; S.opLoaded = true;
      paint();
      if (!S.op) return;
      c.from('tours').select('id,title,summary,status,category,destination,county,cover_url,photos,price_kes,child_price_kes,price_basis,deposit_pct,group_min,group_max,duration_label,days,highlights,schedule_type,next_departure,departure_days,departure_time,published_at,pause_sig,place_id')
        .eq('owner_id', u.id).order('created_at', { ascending: false }).limit(100)
        .then(function (t) { S.tours = (t && t.data) || []; toursLoaded(); }, function () {});
      loadSpots(); loadBookings(); loadChanges();
      c.from('tour_spotlight_settings').select('prices,enabled,max_sponsored,review_hours').limit(1).then(function (s) { S.settings = s && s.data && s.data[0]; paintSpot(); }, function () {});
      c.rpc('tour_spotlight_calendar', { p_days: 60 }).then(function (x) { S.cal = (x && x.data) || []; paintCal(); }, function () {});
    }, function () { S.opLoaded = true; paint(); });
  }
  /* New tours fill the picker in place: re-rendering the whole studio would
     throw away an upload in progress. */
  function toursLoaded() {
    var sel = el('cs-tour'), kit = K();
    if (sel) {
      var mine = S.tours.filter(function (t) { return t.status === 'published'; });
      var nl = el('cs-nolive'); if (nl) nl.hidden = mine.length > 0;
      sel.innerHTML = '<option value="">My company (no single tour)</option>' + mine.map(function (t) { return '<option value="' + kit.esc(t.id) + '"' + (String(S.f.tour) === String(t.id) ? ' selected' : '') + '>' + kit.esc(t.title) + '</option>'; }).join('');
      schedulePreview();
    }
    if (S.tab === 'tours') paintTours();
  }
  function loadChanges() { var c = K().sb(); c.rpc('tour_changes_mine').then(function (r) { S.changes = (r && r.data) || []; if (S.tab === 'tours') paintTours(); paintTabs(); }, function () { S.changes = []; }); }
  function loadDemand() { var c = K().sb(); c.rpc('tour_demand').then(function (r) { S.demand = (r && r.data) || { places: [], kinds: [], total: 0 }; if (S.tab === 'demand') paintDemand(); }, function () { S.demand = { places: [], kinds: [], total: 0 }; if (S.tab === 'demand') paintDemand(); }); }
  function loadFilms() { var c = K().sb(); c.rpc('tour_immersive_requests_mine').then(function (r) { S.films = (r && r.data) || []; if (S.tab === 'immersive') paintFilms(); }, function () { S.films = []; if (S.tab === 'immersive') paintFilms(); }); }
  function loadSpots() { var c = K().sb(); c.rpc('tour_spotlights_mine').then(function (r) { S.spots = (r && r.data) || []; paintSpotList(); paintTabs(); }, function () { S.spots = []; paintSpotList(); }); }
  function loadBookings() { var c = K().sb(); c.rpc('tour_operator_bookings', { p_scope: S.scope }).then(function (r) { S.bookings = (r && r.data) || []; if (S.tab === 'bookings') paintBookings(); paintTabs(); }, function () { S.bookings = []; if (S.tab === 'bookings') paintBookings(); }); }

  /* ═══ FRAME ════════════════════════════════════════════════════════ */
  function paint() {
    var kit = K(), esc = kit.esc, I = kit.icon, root = el('cs-root'); if (!root) return;
    if (!S.user) {
      root.innerHTML = '<div class="cs-gate"><h2>The studio for guides and operators</h2><p>Sign in with the account you list your tours with to see your bookings, manage your tours and put a tour in the Marquee at the top of Cabana Tours.</p><div class="acts"><button class="ct-btn ct-btn-sun" type="button" data-signin>Sign in</button><a class="ct-btn" href="/list-your-tour">List your first tour</a></div></div>';
      $('[data-signin]', root).addEventListener('click', function () { kit.signIn(); });
      return;
    }
    if (!S.opLoaded) { root.innerHTML = '<div class="ct-wrap"><div class="ct-skel" style="height:420px;margin-top:20px"></div></div>'; return; }
    if (!S.op) {
      root.innerHTML = '<div class="cs-gate"><h2>List your first tour to open the studio</h2><p>Tell us who you are and what you run. Once our team has checked your profile, this is where you see bookings, reply to travellers, send private prices and buy a slot in the Marquee.</p><div class="acts"><a class="ct-btn ct-btn-sun" href="/list-your-tour">List a tour</a><a class="ct-btn" href="/help" data-cbn-support>Talk to us</a></div></div>';
      return;
    }
    var op = S.op;
    var av = op.logo_url ? '<img src="' + esc(op.logo_url) + '" alt=""/>' : '<span>' + esc(String(op.name || '?').charAt(0).toUpperCase()) + '</span>';
    var status = op.status === 'approved' ? (op.verified ? 'Verified by Cabana' : 'Approved') : op.status === 'pending' ? 'Being checked by Cabana' : op.status;
    root.innerHTML =
      '<section class="cs-hero"><div class="ct-wrap">' +
        '<span class="ct-eyebrow">The studio</span>' +
        '<h1 class="ct-h1">Run your tours <em>from one place.</em></h1>' +
        '<div class="cs-who"><span class="av">' + av + '</span><div><b>' + esc(op.name) + (op.verified ? I.verified : '') + '</b><small>' + esc([op.persona === 'guide' ? 'Local guide' : 'Tour operator', op.county, status].filter(Boolean).join(' · ')) + '</small></div>' +
          '<a class="ct-btn ct-btn-s" href="/tour-guides#g-' + encodeURIComponent(op.slug || op.id) + '" style="margin-left:auto">Your public profile</a><a class="ct-btn ct-btn-s ct-btn-sweep" href="/list-your-tour">' + I.plus + 'New tour</a></div>' +
        (op.status !== 'approved' ? '<div class="ct-note warn" style="margin-top:18px">' + I.clock + '<span>Your profile is being checked. You can prepare a Marquee slot now; paying for it opens once you are approved.</span></div>' : '') +
        '<div class="cs-tabs" role="tablist" id="cs-tabs"></div>' +
      '</div></section>' +
      '<div class="ct-wrap cs-panel" id="cs-panel" role="tabpanel"></div>';
    paintTabs(); paintPanel();
  }
  function paintTabs() {
    var box = el('cs-tabs'); if (!box) return;
    var I = K().icon;
    var review = (S.spots || []).filter(function (s) { return s.status === 'pending_payment'; }).length;
    var soon = (S.bookings || []).filter(function (b) { return b.paid && !b.cancelled; }).length;
    var inReview = (S.changes || []).filter(function (c) { return c.status === 'pending'; }).length;
    box.innerHTML = [['spotlight', I.sun, 'Marquee', review], ['bookings', I.ticket, 'Bookings', S.scope === 'upcoming' ? soon : 0], ['tours', I.compass, 'My tours', inReview],
      ['demand', I.users, 'Demand', 0], ['immersive', I.vr, '360°', 0]].map(function (t) {
      return '<button class="cs-tab" type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (S.tab === t[0]) + '">' + t[1] + t[2] + (t[3] ? '<span class="n">' + t[3] + '</span>' : '') + '</button>';
    }).join('');
  }
  function paintPanel() {
    if (S.tab === 'spotlight') paintSpot();
    else if (S.tab === 'bookings') paintBookings();
    else if (S.tab === 'demand') { paintDemand(); if (S.demand == null) loadDemand(); }
    else if (S.tab === 'immersive') { paintFilms(); if (S.films == null) loadFilms(); }
    else paintTours();
    try { var u = new URL(global.location.href); u.searchParams.set('tab', S.tab); global.history.replaceState(null, '', u); } catch (e) {}
  }

  /* ═══ SPOTLIGHT BUILDER ════════════════════════════════════════════ */
  function price(pkg) { var P = (S.settings && S.settings.prices) || { day: 1500, week: 7500, fortnight: 13500, month: 24000 }; return Number(P[pkg]) || 0; }
  function ytId(u) { var m = String(u || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/); return m ? m[1] : (/^[A-Za-z0-9_-]{11}$/.test(String(u || '').trim()) ? String(u).trim() : ''); }
  function paintSpot() {
    var panel = el('cs-panel'); if (!panel || S.tab !== 'spotlight') return;
    var kit = K(), esc = kit.esc, I = kit.icon, f = S.f;
    if (!f.start) f.start = kit.today();
    var mine = S.tours.filter(function (t) { return t.status === 'published'; });
    if (!panel.querySelector('#cs-form')) {
      panel.innerHTML =
        '<div class="cs-grid">' +
          '<div id="cs-form">' +
            '<div class="cs-card"><div class="cs-step"><i>1</i>What travellers see first</div>' +
              '<p class="cs-hint">A departure, a whole tour, or your company. With a tour, the slide carries its price, its next departure counting down, a Book button and a Message button.</p>' +
              '<label class="cs-f"><span>Feature</span><select class="ct-input" id="cs-tour"><option value="">My company (no single tour)</option>' +
                mine.map(function (t) { return '<option value="' + esc(t.id) + '"' + (String(f.tour) === String(t.id) ? ' selected' : '') + '>' + esc(t.title) + '</option>'; }).join('') + '</select></label>' +
              '<p class="cs-hint" id="cs-nolive" style="margin:10px 0 0"' + (mine.length ? ' hidden' : '') + '>None of your tours is live yet, so this slide will point to your profile. You can come back and feature a tour once it is published.</p>' +
            '</div>' +
            '<div class="cs-card"><div class="cs-step"><i>2</i>Film or photo</div>' +
              '<div class="cs-seg" role="group" aria-label="Media">' +
                '<button type="button" data-kind="image" aria-pressed="' + (f.kind === 'image') + '">' + I.sun + 'Photo</button>' +
                '<button type="button" data-kind="video" aria-pressed="' + (f.kind === 'video') + '">' + I.play + 'Video</button>' +
                '<button type="button" data-kind="youtube" aria-pressed="' + (f.kind === 'youtube') + '">' + I.play + 'YouTube</button></div>' +
              '<div id="cs-media" style="margin-top:14px"></div>' +
            '</div>' +
            '<div class="cs-card"><div class="cs-step"><i>3</i>Your words</div>' +
              '<p class="cs-hint">Wrap words in *stars* to set them in your accent colour. No phone numbers, links or handles: travellers reach you through Cabana.</p>' +
              field('kicker', 'Small line above', 40, 'Day safari · Nairobi National Park') +
              field('headline', 'Headline', 70, 'Lions at *first light*') +
              field('subline', 'One or two sentences', 160, 'Out through the gate as the park wakes, back in town by lunch.', true) +
              field('cta', 'Button', 24, 'Book a dawn drive') +
              '<div class="cs-f"><span>Accent colour</span><div class="cs-sw">' + SW.map(function (c) { return '<button type="button" data-sw="' + c + '" style="--c:' + c + '" aria-pressed="' + (f.accent === c) + '" aria-label="Accent ' + c + '"></button>'; }).join('') + '</div></div>' +
              '<div class="ct-err" id="cs-words-err" style="margin-top:10px"></div>' +
            '</div>' +
            '<div class="cs-card"><div class="cs-step"><i>4</i>How long, and from when</div>' +
              '<div class="cs-pk" id="cs-pk"></div>' +
              '<label class="cs-f"><span>Starts</span><input class="ct-input" type="date" id="cs-start" min="' + kit.today() + '" value="' + esc(f.start) + '"/></label>' +
              '<div class="cs-cal" id="cs-cal" aria-label="Availability over the next 60 days"></div>' +
              '<div class="cs-legend"><span><i style="background:rgba(62,224,143,.55)"></i>Room</span><span><i style="background:rgba(255,176,32,.7)"></i>Filling up</span><span><i style="background:rgba(255,111,168,.35)"></i>Fully booked</span></div>' +
              '<div class="ct-note" id="cs-quote" style="margin-top:14px"></div>' +
            '</div>' +
            '<div class="cs-card cs-pay"><div class="cs-step"><i>5</i>Pay and send for review</div>' +
              '<label class="cs-f"><span>M-Pesa number</span><input class="ct-input" id="cs-phone" inputmode="tel" autocomplete="tel" placeholder="07XX XXX XXX"/></label>' +
              '<div class="ct-sum" id="cs-sum"></div>' +
              '<div class="ct-err" id="cs-err"></div>' +
              '<button class="ct-btn ct-btn-sun ct-btn-block" type="button" id="cs-go">Pay and send for review</button>' +
              '<p class="cs-hint" style="margin:0">Our team checks every slot before it goes live, usually within a day. If it is not approved, the full amount comes back to you as Cabana credit. Review time is never taken from your days.</p>' +
            '</div>' +
          '</div>' +
          '<div class="cs-preview">' +
            '<div class="cs-pv-bar"><b>Live preview</b><div class="cs-seg" role="group" aria-label="Preview size"><button type="button" data-dev="desktop" aria-pressed="true">Desktop</button><button type="button" data-dev="phone" aria-pressed="false">Phone</button></div></div>' +
            '<div class="cs-frame" id="cs-frame"><div id="cs-sl"></div></div>' +
            '<div class="cs-card" style="margin-top:16px"><div class="cs-step" style="margin-bottom:10px">Your Marquee slots</div><div class="cs-list" id="cs-list"></div></div>' +
          '</div>' +
        '</div>';
      wireForm(panel);
    }
    paintMedia(); paintPk(); paintCal(); paintQuote(); paintSum(); paintPreview(); paintSpotList();
    try { var ph = el('cs-phone'); if (ph && !ph.value) ph.value = global.localStorage.getItem('ct:phone') || ''; } catch (e) {}
  }
  function field(k, label, max, ph, area) {
    var v = K().esc(S.f[k] || '');
    return '<label class="cs-f"><span>' + label + '<em data-count="' + k + '">' + (S.f[k] || '').length + ' / ' + max + '</em></span>' +
      (area ? '<textarea class="ct-input" data-f="' + k + '" maxlength="' + max + '" placeholder="' + ph + '">' + v + '</textarea>'
            : '<input class="ct-input" data-f="' + k + '" maxlength="' + max + '" placeholder="' + ph + '" value="' + v + '"/>') + '</label>';
  }
  function wireForm(panel) {
    var kit = K();
    panel.addEventListener('input', function (e) {
      var k = e.target.getAttribute('data-f');
      if (k) {
        S.f[k] = e.target.value;
        var cnt = $('[data-count="' + k + '"]', panel), max = Number(e.target.getAttribute('maxlength'));
        if (cnt) { cnt.textContent = e.target.value.length + ' / ' + max; cnt.classList.toggle('over', e.target.value.length >= max); }
        wordsCheck(); schedulePreview(); paintSum();
      }
      if (e.target.id === 'cs-yt') { S.f.yt = e.target.value; paintYtThumb(); schedulePreview(); }
    });
    panel.addEventListener('change', function (e) {
      if (e.target.id === 'cs-tour') { S.f.tour = e.target.value; schedulePreview(); }
      if (e.target.id === 'cs-start') { S.f.start = e.target.value || kit.today(); paintCal(); paintQuote(); }
    });
    panel.addEventListener('click', function (e) {
      var k = e.target.closest('[data-kind]'); if (k) { S.f.kind = k.getAttribute('data-kind'); $$('[data-kind]', panel).forEach(function (b) { b.setAttribute('aria-pressed', String(b === k)); }); paintMedia(); schedulePreview(); return; }
      var sw = e.target.closest('[data-sw]'); if (sw) { S.f.accent = sw.getAttribute('data-sw'); $$('[data-sw]', panel).forEach(function (b) { b.setAttribute('aria-pressed', String(b === sw)); }); schedulePreview(); return; }
      var pk = e.target.closest('[data-pk]'); if (pk) { S.f.pkg = pk.getAttribute('data-pk'); paintPk(); paintCal(); paintQuote(); paintSum(); return; }
      var day = e.target.closest('.cs-cal i[data-day]'); if (day && !day.classList.contains('full')) { S.f.start = day.getAttribute('data-day'); var si = el('cs-start'); if (si) si.value = S.f.start; paintCal(); paintQuote(); return; }
      var dev = e.target.closest('[data-dev]'); if (dev) { S.device = dev.getAttribute('data-dev'); $$('[data-dev]', panel).forEach(function (b) { b.setAttribute('aria-pressed', String(b === dev)); }); var fr = el('cs-frame'); if (fr) fr.classList.toggle('phone', S.device === 'phone'); return; }
      var fo = e.target.closest('.cs-focal'); if (fo) { var r = fo.getBoundingClientRect(); S.f.focal = Math.round((e.clientX - r.left) / r.width * 100) + '% ' + Math.round((e.clientY - r.top) / r.height * 100) + '%'; paintFocal(); schedulePreview(); return; }
      if (e.target.closest('#cs-go')) { submit(); return; }
      var act = e.target.closest('[data-sp]'); if (act) spotAction(act.getAttribute('data-sp'), act.getAttribute('data-id'));
    });
  }
  function paintMedia() {
    var box = el('cs-media'); if (!box) return;
    var kit = K(), f = S.f;
    if (f.kind === 'youtube') {
      S.uploader = null;
      box.innerHTML = '<label class="cs-f" style="margin-top:0"><span>YouTube link</span><input class="ct-input" id="cs-yt" placeholder="https://youtu.be/…" value="' + kit.esc(f.yt) + '"/></label><div id="cs-ytp"></div>' +
        '<p class="cs-hint" style="margin:10px 0 0">It plays muted in the background, the way travellers scroll. They can turn the sound on.</p>';
      paintYtThumb();
      return;
    }
    box.innerHTML = '<div class="cs-up' + (f.kind === 'image' ? ' cs-up-photo' : '') + '"><div id="cs-up"></div></div><div id="cs-focal"></div>' +
      '<p class="cs-hint" style="margin:10px 0 0">' + (f.kind === 'video' ? 'A short clip (up to 50 MB) plays muted on a loop. Add a photo too: it shows while the clip loads and on phones saving data.' : 'Wide and bright works best: at least 1600 pixels across. Tap the picture below to set the point that must stay in frame.') + '</p>';
    if (!global.CabanaUploader) { box.innerHTML = '<div class="ct-note warn">' + kit.icon.clock + '<span>The uploader is still loading. Give it a moment.</span></div>'; setTimeout(paintMedia, 800); return; }
    S.uploader = global.CabanaUploader.mount(el('cs-up'), {
      client: kit.sb(), folder: 'spotlight', maxPhotos: 1, maxVideos: f.kind === 'video' ? 1 : 0,
      onChange: function (v) {
        v = v || (S.uploader && S.uploader.value()) || {};
        if (f.kind === 'video') { f.media = (v.videos || [])[0] || ''; f.poster = (v.photos || [])[0] || ''; }
        else { f.media = (v.photos || [])[0] || ''; f.poster = ''; }
        paintFocal(); schedulePreview(); paintSum();
      }
    });
    paintFocal();
  }
  function paintFocal() {
    var box = el('cs-focal'); if (!box) return;
    var src = S.f.kind === 'image' ? S.f.media : S.f.poster;
    if (!src) { box.innerHTML = ''; return; }
    var p = S.f.focal.split(' ');
    box.innerHTML = '<div class="cs-focal" title="Tap to set the focus"><img src="' + K().esc(src) + '" alt=""/><span class="dot" style="left:' + p[0] + ';top:' + p[1] + '"></span><small>Tap the part that must stay in view</small></div>';
  }
  function paintYtThumb() {
    var box = el('cs-ytp'); if (!box) return;
    var id = ytId(S.f.yt);
    box.innerHTML = id ? '<div class="cs-yt-thumb" style="background-image:url(\'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg\')"></div>' : (S.f.yt ? '<div class="ct-err" style="margin-top:8px">That does not look like a YouTube link yet.</div>' : '');
  }
  function paintPk() {
    var box = el('cs-pk'); if (!box) return;
    var kit = K();
    box.innerHTML = PK.map(function (p) { return '<button type="button" data-pk="' + p[0] + '" aria-pressed="' + (S.f.pkg === p[0]) + '"><small>' + p[1] + '</small><b>' + kit.money(price(p[0])).replace('KES ', 'KES ') + '</b><span>' + p[2] + '</span></button>'; }).join('');
  }
  function paintCal() {
    var box = el('cs-cal'); if (!box) return;
    if (!S.cal) { box.innerHTML = ''; return; }
    var days = { day: 1, week: 7, fortnight: 14, month: 30 }[S.f.pkg] || 7, start = S.f.start, max = (S.settings && S.settings.max_sponsored) || 6;
    var end = new Date(new Date(start + 'T12:00:00Z').getTime() + (days - 1) * 864e5).toISOString().slice(0, 10);
    box.innerHTML = S.cal.map(function (d, i) {
      var free = Number(d.free), cls = free <= 0 ? 'full' : free <= Math.max(1, Math.floor(max / 3)) ? 'low' : '';
      var inside = d.day >= start && d.day <= end;
      var date = new Date(d.day + 'T12:00:00Z');
      return '<i data-day="' + d.day + '" class="' + cls + (inside ? ' in' : '') + (date.getUTCDate() === 1 || i === 0 ? ' first' : '') + '" data-d="' + date.getUTCDate() + '" title="' + K().fmtDay(d.day) + ': ' + (free <= 0 ? 'fully booked' : free + ' of ' + max + ' free') + '"></i>';
    }).join('');
  }
  var _qt;
  function paintQuote() {
    clearTimeout(_qt);
    _qt = setTimeout(function () {
      var box = el('cs-quote'), kit = K(), c = kit.sb(); if (!box || !c) return;
      c.rpc('tour_spotlight_quote', { p_package: S.f.pkg, p_start: S.f.start }).then(function (r) {
        var q = S.quote = r && r.data; if (!q) return;
        var from = new Date(new Date(q.starts_at).getTime() + 3 * 3600e3).toISOString().slice(0, 10), to = new Date(new Date(q.ends_at).getTime() + 3 * 3600e3 - 1000).toISOString().slice(0, 10);
        box.className = 'ct-note' + (q.free_slots > 0 ? '' : ' warn');
        box.innerHTML = kit.icon.cal + '<span>' + (q.enabled === false ? '<b>New Marquee slots are paused right now.</b> Check back soon.'
          : q.free_slots > 0 ? '<b>' + kit.fmtDay(from) + ' to ' + kit.fmtDay(to) + '.</b> ' + q.free_slots + ' of ' + q.max + ' sponsored places free across those days.'
          : '<b>Those days are fully booked.</b> Pick a later start on the calendar.') + '</span>';
        paintSum();
      }, function () {});
    }, 220);
  }
  function paintSum() {
    var box = el('cs-sum'), kit = K(); if (!box) return;
    var p = price(S.f.pkg), go = el('cs-go');
    box.innerHTML = '<div class="kv"><span>Marquee slot · ' + (PK.filter(function (x) { return x[0] === S.f.pkg; })[0] || ['', ''])[1] + '</span><b>' + kit.money(p) + '</b></div><div class="kv"><span>Commission on your bookings</span><b>KES 0</b></div><div class="kv tot"><span>Pay now</span><b>' + kit.money(p) + '</b></div>';
    if (go) {
      var ready = ready_();
      go.disabled = !ready.ok || S.busy || (S.quote && S.quote.free_slots <= 0) || (S.op && S.op.status !== 'approved');
      go.textContent = S.op && S.op.status !== 'approved' ? 'Opens once your profile is approved' : ready.ok ? 'Pay ' + kit.money(p) + ' and send for review' : ready.why;
    }
  }
  function ready_() {
    var f = S.f;
    if (f.kind === 'youtube' && !ytId(f.yt)) return { ok: false, why: 'Add a YouTube link' };
    if (f.kind !== 'youtube' && !f.media) return { ok: false, why: f.kind === 'video' ? 'Upload a clip' : 'Upload a photo' };
    if (S.uploader && S.uploader.busy && S.uploader.busy()) return { ok: false, why: 'Uploading…' };
    if (String(f.headline || '').replace(/\*/g, '').trim().length < 3) return { ok: false, why: 'Write a headline' };
    return { ok: true };
  }
  function wordsCheck() {
    var box = el('cs-words-err'), G = global.CabanaChatGuard; if (!box) return;
    var txt = [S.f.headline, S.f.kicker, S.f.subline, S.f.cta].join(' · ');
    var r = G && G.check ? G.check(txt, { contactAllowed: false }) : null;
    box.textContent = r && !r.ok ? (r.reason || 'Remove contact details, links or handles: travellers reach you through Cabana.') : '';
  }
  var _pt;
  function schedulePreview() { clearTimeout(_pt); _pt = setTimeout(paintPreview, 160); }
  function slideFromForm() {
    var f = S.f, kit = K(), op = S.op || {};
    var t = S.tours.filter(function (x) { return String(x.id) === String(f.tour); })[0];
    var live = t && kit.tour(t.id);
    var dep = t ? kit.next(t.id) : null;
    return {
      id: 'preview', kind: 'sponsored', media_kind: f.kind === 'youtube' ? 'youtube' : (f.media ? f.kind : 'art'),
      media_url: f.kind === 'youtube' ? ytId(f.yt) : f.media, poster_url: f.poster, focal: f.focal, art: 'savanna', accent: f.accent,
      kicker: f.kicker, headline: f.headline || 'Your headline *here*', subline: f.subline, cta_label: f.cta,
      tour: t ? { id: t.id, title: t.title, destination: t.destination || t.county, price: t.price_kes, price_basis: t.price_basis, duration: live ? live.duration_label : '', cover: t.cover_url, next_departure: dep ? dep.departs_at : null } : null,
      operator: { id: op.id, name: op.name, verified: op.verified, logo: op.logo_url }
    };
  }
  function paintPreview() {
    var box = el('cs-sl'); if (!box || !global.CabanaSpotlight) return;
    if (!S.preview || S.previewBox !== box) { S.preview = global.CabanaSpotlight.create(box, { preview: true }); S.previewBox = box; }
    S.preview.set([slideFromForm()]);
  }

  function submit() {
    var kit = K(), c = kit.sb(), f = S.f, err = el('cs-err'), go = el('cs-go');
    var r = ready_(); if (!r.ok) { err.textContent = r.why + '.'; return; }
    var phoneRaw = (el('cs-phone') || {}).value || '';
    var phone = global.CabanaTourBook && global.CabanaTourBook.normalisePhone ? global.CabanaTourBook.normalisePhone(phoneRaw) : phoneRaw;
    if (!phone) { err.textContent = 'Enter the Safaricom number that should get the M-Pesa prompt.'; return; }
    try { global.localStorage.setItem('ct:phone', phoneRaw.trim()); } catch (e) {}
    S.busy = true; err.textContent = ''; go.disabled = true; go.innerHTML = '<span class="ct-spin"></span>Saving your slot…';
    var payload = {
      package: f.pkg, start: f.start, media_kind: f.kind, media_url: f.kind === 'youtube' ? f.yt : f.media,
      poster_url: f.poster || null, focal: f.focal, kicker: f.kicker, headline: f.headline, subline: f.subline, cta_label: f.cta, accent: f.accent
    };
    if (f.tour) payload.tour_id = f.tour;
    c.rpc('tour_spotlight_create', { p: payload }).then(function (res) {
      S.busy = false;
      if (res.error || !res.data) { err.textContent = friendly(res.error); paintSum(); return; }
      pay(res.data, phone);
    }, function (e) { S.busy = false; err.textContent = friendly(e); paintSum(); });
  }
  function pay(sp, phone) {
    var kit = K();
    if (!global.ApatmentoPay) { kit.toast('Saved. Pay for it from the list below.'); loadSpots(); paintSum(); return; }
    var from = kit.fmtDay(new Date(new Date(sp.starts_at).getTime() + 3 * 3600e3).toISOString().slice(0, 10));
    global.ApatmentoPay.start({
      amount: Number(sp.grand_total), phone: phone, reference: sp.payment_reference,
      description: 'Cabana Tours Marquee slot · ' + (sp.days || '') + ' days',
      trip: { property: String(sp.headline || 'Your Marquee slot').replace(/\*/g, ''), location: 'Cabana Tours · the Marquee', whenText: 'From ' + from + ' · ' + sp.days + (sp.days === 1 ? ' day' : ' days') },
      success: { spotlight: true, title: 'Your slot is in review.', note: 'Paid · live after a quick check, usually within a day' },
      onSuccess: function () { loadSpots(); kit.toast('Paid. We will let you know the moment it is live.', 4200); },
      onFailure: function () { loadSpots(); }
    });
    loadSpots(); paintSum();
  }
  function spotAction(a, id) {
    var kit = K(), c = kit.sb(), sp = (S.spots || []).filter(function (x) { return x.id === id; })[0]; if (!sp) return;
    if (a === 'pay') {
      var phoneRaw = (el('cs-phone') || {}).value || (function () { try { return global.localStorage.getItem('ct:phone') || ''; } catch (e) { return ''; } })();
      var phone = global.CabanaTourBook ? global.CabanaTourBook.normalisePhone(phoneRaw) : phoneRaw;
      if (!phone) { kit.toast('Add your M-Pesa number in step 5 first.'); var p = el('cs-phone'); if (p) p.focus(); return; }
      pay(sp, phone);
    } else if (a === 'cancel') {
      c.rpc('tour_spotlight_cancel', { p_id: id }).then(function (r) { if (r.error) kit.toast(friendly(r.error)); else { kit.toast('Cancelled. Nothing was charged.'); loadSpots(); } });
    } else if (a === 'again') {
      Object.assign(S.f, { tour: sp.tour_id ? String(sp.tour_id) : '', kicker: sp.kicker || '', headline: sp.headline || '', subline: sp.subline || '', cta: sp.cta_label || '', accent: sp.accent || S.f.accent, kind: sp.media_kind === 'youtube' ? 'youtube' : S.f.kind, yt: sp.media_kind === 'youtube' ? sp.media_url : S.f.yt });
      switchTab('spotlight'); global.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  function spotStatus(sp) {
    var now = Date.now();
    if (sp.status === 'approved') return new Date(sp.starts_at).getTime() > now ? ['ok', 'Scheduled'] : sp.live ? ['live', 'Live now'] : ['', 'Ended'];
    return ({ pending_payment: ['warn', 'Awaiting payment'], in_review: ['ok', 'In review'], paused: ['warn', 'Paused'], rejected: ['bad', 'Needs changes'], ended: ['', 'Ended'], draft: ['', 'Draft'] })[sp.status] || ['', sp.status];
  }
  function paintSpotList() {
    var box = el('cs-list'); if (!box) return;
    var kit = K(), esc = kit.esc;
    if (S.spots == null) { box.innerHTML = '<div class="ct-skel" style="height:96px"></div>'; return; }
    if (!S.spots.length) { box.innerHTML = '<p class="cs-hint" style="margin:0">Nothing yet. Your first slot appears here with its views and taps, day by day.</p>'; return; }
    box.innerHTML = S.spots.map(function (sp) {
      var st = spotStatus(sp), ctr = sp.impressions ? Math.round(sp.clicks / sp.impressions * 1000) / 10 : 0;
      var thumb = sp.media_kind === 'youtube' ? '<img src="https://i.ytimg.com/vi/' + esc(sp.media_url) + '/mqdefault.jpg" alt=""/>' : (sp.poster_url || (sp.media_kind === 'image' && sp.media_url)) ? '<img src="' + esc(sp.poster_url || sp.media_url) + '" alt=""/>' : '<div class="ct-art">' + kit.art(sp.id, 'savanna', { w: 320, h: 200 }) + '</div>';
      var daily = sp.daily || [], max = Math.max.apply(null, daily.map(function (d) { return d.views; }).concat([1]));
      var from = new Date(new Date(sp.starts_at).getTime() + 3 * 3600e3).toISOString().slice(0, 10), to = new Date(new Date(sp.ends_at).getTime() + 3 * 3600e3 - 1000).toISOString().slice(0, 10);
      var acts = sp.status === 'pending_payment' ? '<button class="ct-btn ct-btn-s ct-btn-sun" type="button" data-sp="pay" data-id="' + esc(sp.id) + '">Pay ' + kit.money(sp.grand_total) + '</button><button class="ct-btn ct-btn-s" type="button" data-sp="cancel" data-id="' + esc(sp.id) + '">Cancel</button>'
        : sp.status === 'rejected' || sp.status === 'ended' ? '<button class="ct-btn ct-btn-s" type="button" data-sp="again" data-id="' + esc(sp.id) + '">Use again</button>' : '';
      return '<div class="cs-sp"><div class="m">' + thumb + '</div><div><span class="cs-pill ' + st[0] + '">' + st[1] + '</span><h4>' + esc(String(sp.headline || '').replace(/\*/g, '')) + '</h4>' +
        '<small>' + esc([kit.fmtDay(from) + ' – ' + kit.fmtDay(to), sp.tour || 'Your company', kit.money(sp.grand_total)].join(' · ')) + '</small>' +
        (sp.review_note ? '<div class="cs-note">' + esc(sp.review_note) + (Number(sp.credited) > 0 ? ' · ' + kit.money(sp.credited) + ' is now Cabana credit.' : '') + '</div>' : '') +
        (sp.status === 'approved' || sp.impressions ? '<div class="stats"><span><b>' + (sp.impressions || 0).toLocaleString('en-KE') + '</b>views</span><span><b>' + (sp.clicks || 0).toLocaleString('en-KE') + '</b>taps</span><span><b>' + ctr + '%</b>tap rate</span></div>' +
          (daily.length > 1 ? '<div class="cs-spark" aria-hidden="true">' + daily.slice(-30).map(function (d) { return '<i style="height:' + Math.max(8, Math.round(d.views / max * 100)) + '%"></i>'; }).join('') + '</div>' : '') : '') +
        '</div><div class="acts">' + acts + '</div></div>';
    }).join('');
  }

  /* ═══ BOOKINGS ═════════════════════════════════════════════════════ */
  function paintBookings() {
    var panel = el('cs-panel'); if (!panel) return;
    var kit = K(), esc = kit.esc, I = kit.icon;
    var head = '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><div class="cs-seg" role="group" aria-label="Which bookings"><button type="button" data-scope="upcoming" aria-pressed="' + (S.scope === 'upcoming') + '">Coming up</button><button type="button" data-scope="past" aria-pressed="' + (S.scope === 'past') + '">Past and cancelled</button></div><button class="ct-btn ct-btn-s" type="button" data-ct-inbox>' + I.chat + 'All messages</button></div>';
    if (S.bookings == null) { panel.innerHTML = head + '<div class="ct-skel" style="height:220px;margin-top:20px"></div>'; wireBookings(panel); return; }
    if (!S.bookings.length) {
      panel.innerHTML = head + '<div class="cs-empty" style="margin-top:20px"><h3>' + (S.scope === 'upcoming' ? 'No bookings coming up yet' : 'Nothing here yet') + '</h3><p>' + (S.scope === 'upcoming' ? 'When a traveller books, they appear here the moment they pay, with their group size, what is due on the day and a way to message them. A slot in the Marquee is the fastest way to be seen.' : 'Finished and cancelled bookings collect here.') + '</p><button class="ct-btn ct-btn-sun" type="button" data-tab="spotlight">Get featured</button></div>';
      wireBookings(panel); return;
    }
    var byDay = {};
    S.bookings.forEach(function (b) { (byDay[b.tour_date] = byDay[b.tour_date] || []).push(b); });
    panel.innerHTML = head + Object.keys(byDay).sort(S.scope === 'past' ? function (a, b) { return a < b ? 1 : -1; } : undefined).map(function (d) {
      var list = byDay[d], people = list.filter(function (b) { return b.paid && !b.cancelled; }).reduce(function (n, b) { return n + (b.people || 0); }, 0);
      return '<div class="cs-day">' + esc(kit.fmtDay(d, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })) + (people ? ' · ' + people + (people === 1 ? ' person' : ' people') : '') + '</div>' +
        list.map(function (b) {
          var st = b.cancelled ? ['bad', 'Cancelled'] : b.paid ? ['live', 'Paid'] : ['warn', 'Awaiting payment'];
          var ct = b.contact ? [b.contact.phone && '<a href="tel:+' + esc(String(b.contact.phone).replace(/\D/g, '')) + '">' + esc(b.contact.phone) + '</a>', b.contact.whatsapp && '<a href="https://wa.me/' + esc(String(b.contact.whatsapp).replace(/\D/g, '')) + '" target="_blank" rel="noopener">WhatsApp</a>', b.contact.email && '<a href="mailto:' + esc(b.contact.email) + '">' + esc(b.contact.email) + '</a>'].filter(Boolean).join(' · ') : '';
          return '<div class="cs-bk"><div><span class="cs-pill ' + st[0] + '">' + st[1] + '</span><b style="display:block;margin-top:8px">' + esc(b.guest && b.guest.name || 'Traveller') + ' · ' + b.people + (b.people === 1 ? ' person' : ' people') + '</b><small>' + esc(b.tour) + '</small>' +
            (ct ? '<small class="contact">' + ct + '</small>' : '<small>Contact details appear once the booking is paid.</small>') + '</div>' +
            '<div><small>Paid on Cabana</small><b>' + kit.money(b.amount_paid || 0) + '</b>' + (Number(b.balance_on_day) > 0 ? '<small>' + kit.money(b.balance_on_day) + ' to collect on the day</small>' : '') + (b.host_code ? '<small>Check-in code <span class="code">' + esc(b.host_code) + '</span></small>' : '') + '</div>' +
            '<div><button class="ct-btn ct-btn-s" type="button" data-bk-conv="' + esc(b.conversation || '') + '" data-bk-id="' + esc(b.id) + '">' + I.chat + 'Message</button></div></div>';
        }).join('');
    }).join('');
    wireBookings(panel);
  }
  function wireBookings(panel) {
    if (panel.__bk) return; panel.__bk = true;
    panel.addEventListener('click', function (e) {
      if (S.tab !== 'bookings') return;
      var sc = e.target.closest('[data-scope]'); if (sc) { S.scope = sc.getAttribute('data-scope'); S.bookings = null; paintBookings(); loadBookings(); return; }
      var m = e.target.closest('[data-bk-id]');
      if (m && global.CabanaChat) {
        var conv = m.getAttribute('data-bk-conv');
        if (conv) global.CabanaChat.openConversation(conv); else if (global.CabanaChat.openForTourBooking) global.CabanaChat.openForTourBooking(m.getAttribute('data-bk-id'));
      }
    });
  }

  /* ═══ MY TOURS ═════════════════════════════════════════════════════
     A live tour can be paused (it leaves the site at once) and resumed:
     unchanged, it goes straight back live; changed while paused, it goes
     back through review. Changes to a live tour are proposed, and the
     tour stays exactly as it is until the Cabana team applies them. */
  var ST = { published: ['live', 'Live'], pending: ['ok', 'Being checked'], draft: ['', 'Draft'], paused: ['warn', 'Paused'], rejected: ['bad', 'Needs changes'], archived: ['', 'Archived'] };
  var NAMES = { title: 'title', summary: 'summary', description: 'description', price_kes: 'price', child_price_kes: 'child price', deposit_pct: 'deposit',
    group_min: 'smallest group', group_max: 'largest group', duration_label: 'length', days: 'days', departure_time: 'departure time', departure_days: 'days it runs',
    highlights: 'highlights', cover_url: 'cover', photos: 'photos', itinerary: 'itinerary', includes_list: 'what is included', meeting_point: 'meeting point' };
  var DAYS = [['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'], ['fri', 'Fri'], ['sat', 'Sat'], ['sun', 'Sun']];
  function fieldList(keys) { return (keys || []).map(function (k) { return NAMES[k] || String(k).replace(/_/g, ' '); }).join(', '); }
  function changeNote(t) {
    var kit = K(), esc = kit.esc, I = kit.icon;
    var c = (S.changes || []).filter(function (x) { return String(x.tour_id) === String(t.id); })[0];
    if (!c) return '';
    var when = kit.fmtDay(String(c.reviewed_at || c.created_at).slice(0, 10));
    var what = fieldList(c.fields || Object.keys(c.patch || {}));
    var lead = what ? 'Changes to the ' + what : 'Your changes';
    if (c.status === 'pending') return '<div class="ct-note" style="margin-top:10px">' + I.clock + '<span>' + esc(lead) + ' are with our team (sent ' + esc(when) + '). The tour stays as it is until they are applied.</span></div>';
    if (c.status === 'applied') return '<div class="ct-note" style="margin-top:10px">' + I.check + '<span>' + esc(what ? 'Your changes to the ' + what : 'Your changes') + ' went live ' + esc(when) + '.</span></div>';
    if (c.status === 'declined') return '<div class="ct-note warn" style="margin-top:10px">' + I.cross + '<span>' + esc(lead) + ' were not applied' + (c.review_note ? ': ' + esc(c.review_note) : '.') + '</span></div>';
    return '';
  }
  function editForm(t) {
    var kit = K(), esc = kit.esc, direct = t.status === 'paused';
    var hl = kit.arr(t.highlights).join('\n'), days = kit.arr(t.departure_days);
    function num(name, label, v, min, max) { return '<label class="cs-f"><span>' + label + '</span><input class="ct-input" type="number" inputmode="numeric" name="' + name + '" min="' + min + '" max="' + max + '" value="' + (v == null ? '' : esc(v)) + '"/></label>'; }
    return '<form class="cs-edit" data-edit-form="' + esc(t.id) + '" novalidate>' +
      '<p class="cs-hint" style="margin:0">' + (direct ? 'The tour is paused, so these save straight to it. When you resume, it goes back through review because it changed.' : 'Your tour stays live exactly as it is while we check these, usually within a day.') + '</p>' +
      '<label class="cs-f"><span>Title</span><input class="ct-input" name="title" maxlength="90" value="' + esc(t.title || '') + '"/></label>' +
      '<label class="cs-f"><span>Summary</span><textarea class="ct-input" name="summary" rows="3" maxlength="280">' + esc(t.summary || '') + '</textarea></label>' +
      '<div class="cs-two">' + num('price_kes', 'Price (KES)', t.price_kes, 0, 5000000) + num('child_price_kes', 'Child price (KES)', t.child_price_kes, 0, 5000000) + '</div>' +
      '<div class="cs-two">' + num('deposit_pct', 'Deposit to confirm (%)', t.deposit_pct, 0, 100) + num('group_max', 'Largest group', t.group_max, 1, 500) + '</div>' +
      '<div class="cs-two"><label class="cs-f"><span>How long</span><input class="ct-input" name="duration_label" maxlength="40" value="' + esc(t.duration_label || '') + '"/></label>' +
        '<label class="cs-f"><span>Leaves at</span><input class="ct-input" type="time" name="departure_time" value="' + esc(kit.fmtTime(t.departure_time) || '') + '"/></label></div>' +
      (t.schedule_type === 'weekly' ? '<div class="cs-f"><span>Days it runs</span><div class="cs-seg" role="group" aria-label="Days it runs">' + DAYS.map(function (d) { return '<button type="button" data-day="' + d[0] + '" aria-pressed="' + (days.indexOf(d[0]) !== -1) + '">' + d[1] + '</button>'; }).join('') + '</div></div>' : '') +
      '<label class="cs-f"><span>Highlights, one per line</span><textarea class="ct-input" name="highlights" rows="4" maxlength="1200">' + esc(hl) + '</textarea></label>' +
      (direct ? '' : '<label class="cs-f"><span>A note for our reviewer (optional)</span><textarea class="ct-input" name="note" rows="2" maxlength="500" placeholder="What changed and why"></textarea></label>') +
      '<div class="ct-err" data-edit-err></div>' +
      '<div class="acts" style="display:flex;gap:8px;flex-wrap:wrap"><button class="ct-btn ct-btn-sun" type="submit">' + (direct ? 'Save changes' : 'Send for review') + '</button><button class="ct-btn" type="button" data-edit-cancel>Cancel</button></div>' +
    '</form>';
  }
  function readPatch(form, t) {
    var kit = K(), patch = {};
    function val(n) { var e = form.elements[n]; return e ? e.value : undefined; }
    function numOrNull(v) { v = String(v == null ? '' : v).trim(); return v === '' ? null : Math.round(Number(v)); }
    var title = String(val('title') || '').trim(); if (title && title !== (t.title || '')) patch.title = title;
    var sum = String(val('summary') || '').trim(); if (sum !== (t.summary || '')) patch.summary = sum || null;
    [['price_kes'], ['child_price_kes'], ['deposit_pct'], ['group_max']].forEach(function (k) {
      var v = numOrNull(val(k[0])); if (v !== (t[k[0]] == null ? null : Number(t[k[0]]))) patch[k[0]] = v;
    });
    var dl = String(val('duration_label') || '').trim(); if (dl !== (t.duration_label || '')) patch.duration_label = dl || null;
    var tm = String(val('departure_time') || '').trim(); if (tm !== (kit.fmtTime(t.departure_time) || '')) patch.departure_time = tm ? tm + ':00' : null;
    var picked = $$('[data-day][aria-pressed="true"]', form).map(function (b) { return b.getAttribute('data-day'); });
    if ($('[data-day]', form) && picked.join(',') !== kit.arr(t.departure_days).join(',')) patch.departure_days = picked;
    var hl = String(val('highlights') || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 12);
    if (hl.join('\n') !== kit.arr(t.highlights).join('\n')) patch.highlights = hl;
    return patch;
  }
  function paintTours() {
    var panel = el('cs-panel'); if (!panel) return;
    var kit = K(), esc = kit.esc;
    if (!S.tours.length) { panel.innerHTML = '<div class="cs-empty"><h3>No tours yet</h3><p>List what you already run. A person at Cabana checks it, usually within a day, and then it is on the board.</p><a class="ct-btn ct-btn-sun" href="/list-your-tour">List a tour</a></div>'; return; }
    panel.innerHTML = '<div class="cs-tours">' + S.tours.map(function (t) {
      var st = ST[t.status] || ['', t.status], d = kit.next(t.id), p = kit.price(t), acts = [];
      if (t.status === 'published') {
        acts.push('<a class="ct-btn ct-btn-s" href="/tours?open=' + esc(t.id) + '">View</a>');
        acts.push('<button class="ct-btn ct-btn-s ct-btn-sun" type="button" data-feature="' + esc(t.id) + '">Put it in the Marquee</button>');
        acts.push('<button class="ct-btn ct-btn-s" type="button" data-edit="' + esc(t.id) + '">Propose changes</button>');
        acts.push('<button class="ct-btn ct-btn-s" type="button" data-pause="' + esc(t.id) + '">Pause</button>');
      } else if (t.status === 'paused') {
        if (t.pause_sig) {
          acts.push('<button class="ct-btn ct-btn-s ct-btn-sun" type="button" data-resume="' + esc(t.id) + '">Resume</button>');
          acts.push('<button class="ct-btn ct-btn-s" type="button" data-edit="' + esc(t.id) + '">Edit while paused</button>');
        } else acts.push('<a class="ct-btn ct-btn-s" href="/help" data-cbn-support>Paused by Cabana: ask why</a>');
      } else acts.push('<a class="ct-btn ct-btn-s" href="/help" data-cbn-support>Ask about it</a>');
      return '<div class="cs-tour"><div class="m">' + kit.cover(t, '') + '<span class="cs-pill ' + st[0] + '">' + st[1] + '</span></div><div class="b"><h4>' + esc(t.title) + '</h4>' +
        '<small style="color:var(--ct-cream-3);font:500 12.5px var(--ct-f)">' + esc([p.v, t.destination || t.county, d ? 'Next ' + kit.fmtDay(d.departs_on) : (t.schedule_type === 'on_request' ? 'On request' : '')].filter(Boolean).join(' · ')) + '</small>' +
        changeNote(t) +
        '<div class="acts">' + acts.join('') + '</div>' +
        (String(S.editing) === String(t.id) ? editForm(t) : '') + '</div></div>';
    }).join('') + '</div>';
    if (panel.__tw) return; panel.__tw = true;
    panel.addEventListener('click', function (e) {
      if (S.tab !== 'tours') return;
      var f = e.target.closest('[data-feature]'); if (f) { S.f.tour = f.getAttribute('data-feature'); switchTab('spotlight'); return; }
      var ed = e.target.closest('[data-edit]'); if (ed) { S.editing = ed.getAttribute('data-edit'); paintTours(); var fm = $('[data-edit-form]', el('cs-panel')); if (fm) fm.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
      if (e.target.closest('[data-edit-cancel]')) { S.editing = null; paintTours(); return; }
      var dy = e.target.closest('[data-day]'); if (dy) { dy.setAttribute('aria-pressed', String(dy.getAttribute('aria-pressed') !== 'true')); return; }
      var pa = e.target.closest('[data-pause]'), re = e.target.closest('[data-resume]');
      if (pa || re) pauseTour((pa || re).getAttribute(pa ? 'data-pause' : 'data-resume'), !!pa, pa || re);
    });
    panel.addEventListener('submit', function (e) {
      var form = e.target.closest('[data-edit-form]'); if (!form) return;
      e.preventDefault(); sendChanges(form);
    });
  }
  function tourById(id) { return S.tours.filter(function (x) { return String(x.id) === String(id); })[0] || null; }
  function pauseTour(id, pause, btn) {
    var kit = K(), c = kit.sb(), t = tourById(id); if (!t || !c) return;
    if (pause && !global.confirm('Pause ' + t.title + '? It leaves the catalogue and the board at once. Resume it any time: if nothing changed, it goes straight back live.')) return;
    btn.disabled = true;
    c.rpc('tour_operator_pause', { p_tour: Number(id), p_pause: pause }).then(function (r) {
      btn.disabled = false;
      if (r.error) { kit.toast(friendly(r.error), 4200); return; }
      var to = r.data && r.data.status;
      t.status = to || t.status; t.pause_sig = pause ? 'set' : null;
      kit.toast(pause ? 'Paused. It is off the site until you resume it.' : to === 'published' ? 'Live again.' : 'It changed while paused, so it is back with our team for a quick check.', 4200);
      paintTours(); if (kit.reload) kit.reload();
    }, function (e) { btn.disabled = false; kit.toast(friendly(e)); });
  }
  function sendChanges(form) {
    var kit = K(), c = kit.sb(), id = form.getAttribute('data-edit-form'), t = tourById(id), err = $('[data-edit-err]', form);
    if (!t || !c) return;
    var patch = readPatch(form, t);
    if (!Object.keys(patch).length) { err.textContent = 'Nothing has changed yet.'; return; }
    var go = $('button[type="submit"]', form); go.disabled = true; err.textContent = '';
    if (t.status === 'paused') {
      c.from('tours').update(patch).eq('id', Number(id)).select('id').then(function (r) {
        go.disabled = false;
        if (r.error || !r.data || !r.data.length) { err.textContent = r.error ? friendly(r.error) : 'That did not save. Try again.'; return; }
        Object.keys(patch).forEach(function (k) { t[k] = patch[k]; });
        S.editing = null; paintTours();
        kit.toast('Saved. When you resume, the tour goes to our team for a quick check first.', 4600);
      }, function (e) { go.disabled = false; err.textContent = friendly(e); });
      return;
    }
    var note = form.elements.note ? form.elements.note.value.trim() : '';
    c.rpc('tour_change_propose', { p_tour: Number(id), p_patch: patch, p_note: note || null }).then(function (r) {
      go.disabled = false;
      if (r.error) { err.textContent = friendly(r.error); return; }
      S.editing = null; loadChanges();
      kit.toast('Sent for review. Your tour stays live as it is until we apply the changes.', 4600);
    }, function (e) { go.disabled = false; err.textContent = friendly(e); });
  }

  /* ═══ DEMAND ═══════════════════════════════════════════════════════
     Where travellers asked to hear first: counts only, never who. */
  function paintDemand() {
    var panel = el('cs-panel'); if (!panel) return;
    var kit = K(), esc = kit.esc, d = S.demand;
    if (d == null) { panel.innerHTML = '<div class="ct-skel" style="height:260px"></div>'; return; }
    var places = d.places || [], kinds = d.kinds || [];
    var intro = '<div class="cs-card"><div class="cs-step"><i>' + kit.icon.users + '</i>Where travellers are waiting</div><p class="cs-hint" style="margin-bottom:0">People who asked Cabana to tell them the moment a tour opens in a place or a kind of trip. Counts only: nobody’s details are shared. ' +
      (d.total ? '<b style="color:#fff">' + d.total + (d.total === 1 ? ' traveller is' : ' travellers are') + ' waiting</b> right now.' : '') + '</p></div>';
    if (!places.length && !kinds.length) {
      panel.innerHTML = intro + '<div class="cs-empty" style="margin-top:16px"><h3>No one is waiting yet</h3><p>Travellers can follow a place or a kind of trip on Cabana Tours. As they do, this shows where they are waiting, so you know what to list next.</p><a class="ct-btn ct-btn-sun" href="/tours#places">See the places</a></div>';
      return;
    }
    function cards(list, name) {
      var max = Math.max.apply(null, list.map(function (x) { return Number(x.waiting) || 0; }).concat([1]));
      return '<div class="cs-demand">' + list.map(function (x) {
        var w = Number(x.waiting) || 0;
        return '<div class="cs-dm"><b>' + esc(name(x)) + '</b><span class="big">' + w + '</span><small>' + (w === 1 ? 'traveller waiting' : 'travellers waiting') +
          (x.week ? ' · ' + x.week + ' this week' : '') + ' · ' + (x.tours ? x.tours + (x.tours === 1 ? ' tour live' : ' tours live') : 'no tours live yet') + '</small>' +
          '<span class="bar"><i style="width:' + Math.max(6, Math.round(w / max * 100)) + '%"></i></span>' +
          '<a class="ct-btn ct-btn-s' + (x.tours ? '' : ' ct-btn-sun') + '" href="/list-your-tour">List a tour ' + (x.id ? 'here' : 'like this') + '</a></div>';
      }).join('') + '</div>';
    }
    panel.innerHTML = intro +
      (places.length ? '<div class="cs-step" style="margin:26px 0 12px">Places</div>' + cards(places, function (x) { return x.name + (x.country ? ', ' + x.country : ''); }) : '') +
      (kinds.length ? '<div class="cs-step" style="margin:26px 0 12px">Kinds of trip</div>' + cards(kinds, function (x) { return (kit.CATS[x.category] || { name: x.category }).name; }) : '');
  }

  /* ═══ 360° FILMING ═════════════════════════════════════════════════ */
  var FILM = { 'new': ['ok', 'Asked'], scheduled: ['live', 'Scheduled'], filmed: ['live', 'Filmed'], declined: ['bad', 'Not this time'], closed: ['', 'Closed'] };
  function paintFilms() {
    var panel = el('cs-panel'); if (!panel) return;
    var kit = K(), esc = kit.esc, op = S.op || {}, ok = op.status === 'approved';
    if (!panel.querySelector('#cs-film-go')) {
      panel.innerHTML = '<div class="cs-grid">' +
        '<div class="cs-card"><div class="cs-step"><i>1</i>Ask us to film a tour in 360°</div>' +
          '<p class="cs-hint">We ride along on a real departure with a 360° camera, cut a world travellers can look around on a phone, in a VR viewer or in a headset, and link it to your tour, so its page gets a Step inside button.</p>' +
          '<label class="cs-f"><span>Which tour</span><select class="ct-input" id="cs-film-tour"><option value="">My company in general</option>' +
            S.tours.map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(t.title) + '</option>'; }).join('') + '</select></label>' +
          '<label class="cs-f"><span>When it runs, and anything we should know</span><textarea class="ct-input" id="cs-film-note" rows="4" maxlength="600" placeholder="Saturdays from Nairobi at 7. The best view is at the crater rim after lunch."></textarea></label>' +
          (ok ? '' : '<div class="ct-note warn">' + kit.icon.clock + '<span>Filming requests open once your profile is approved.</span></div>') +
          '<div class="ct-err" id="cs-film-err"></div>' +
          '<button class="ct-btn ct-btn-sun" type="button" id="cs-film-go"' + (ok ? '' : ' disabled') + '>Send the request</button>' +
        '</div>' +
        '<div class="cs-card"><div class="cs-step"><i>2</i>Your requests</div><div class="cs-rows" id="cs-film-list"></div></div>' +
      '</div>';
      $('#cs-film-go', panel).addEventListener('click', function () {
        var c = kit.sb(), btn = this, err = el('cs-film-err'), tour = el('cs-film-tour').value, note = el('cs-film-note').value.trim();
        btn.disabled = true; err.textContent = '';
        c.rpc('tour_immersive_request', { p_tour: tour ? Number(tour) : null, p_note: note || null }).then(function (r) {
          btn.disabled = false;
          if (r.error) { err.textContent = friendly(r.error); return; }
          el('cs-film-note').value = '';
          kit.toast('Sent. Our team will be in touch to plan the day.', 4200);
          loadFilms();
        }, function (e) { btn.disabled = false; err.textContent = friendly(e); });
      });
    }
    var list = el('cs-film-list'); if (!list) return;
    if (S.films == null) { list.innerHTML = '<div class="ct-skel" style="height:90px"></div>'; return; }
    list.innerHTML = S.films.length ? S.films.map(function (f) {
      var st = FILM[f.status] || ['', f.status];
      return '<div class="cs-row"><div><span class="cs-pill ' + st[0] + '">' + st[1] + '</span><b style="display:block;margin-top:8px">' + esc(f.tour || 'My company in general') + '</b>' +
        '<small>Asked ' + esc(kit.fmtDay(String(f.created_at).slice(0, 10))) + (f.admin_note ? ' · ' + esc(f.admin_note) : '') + '</small></div>' +
        (f.world ? '<a class="ct-btn ct-btn-s ct-btn-sun" href="/tours?vr=' + encodeURIComponent(f.world) + '">Step inside</a>' : '') + '</div>';
    }).join('') : '<p class="cs-hint" style="margin:0">Nothing asked yet.</p>';
  }

  function switchTab(t) {
    S.tab = t;
    var panel = el('cs-panel'); if (panel) { panel.innerHTML = ''; panel.__bk = false; panel.__tw = false; var np = panel.cloneNode(false); panel.parentNode.replaceChild(np, panel); }
    S.preview = null;
    paintTabs(); paintPanel();
    if (t === 'bookings' && S.bookings == null) loadBookings();
  }

  function start() {
    var kit = K(); if (!kit) return;
    try {
      var p = new URLSearchParams(global.location.search);
      if (/^(spotlight|bookings|tours|demand|immersive)$/.test(p.get('tab') || '')) S.tab = p.get('tab');
      if (/^(day|week|fortnight|month)$/.test(p.get('package') || '')) S.f.pkg = p.get('package');
      if (p.get('tour')) S.f.tour = p.get('tour');
    } catch (e) {}
    doc.addEventListener('click', function (e) { var t = e.target.closest('#cs-tabs [data-tab], .cs-empty [data-tab]'); if (t) switchTab(t.getAttribute('data-tab')); });
    paint();
    kit.on('user', function () { if ((kit.user() && kit.user().id) !== (S.user && S.user.id) || !S.opLoaded) loadAll(); });
    kit.on('data', function () { if (S.tab === 'spotlight') schedulePreview(); if (S.tab === 'tours') paintTours(); });
    if (!global.CabanaChatGuard && !doc.getElementById('cbx-guard-js')) { var s = doc.createElement('script'); s.src = '/cabana-chat-guard.js?v=7'; s.defer = true; s.id = 'cbx-guard-js'; doc.head.appendChild(s); }
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})(window);
