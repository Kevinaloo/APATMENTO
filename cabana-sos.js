/* ═══════════════════════════════════════════════════════════════════
   CABANA · SOS
   ───────────────────────────────────────────────────────────────────
   Extracted out of apa-chrome.js so that an emergency button can exist
   on every page.

   Why extraction rather than loading the chrome everywhere: apa-chrome
   also renders header controls, sets data-auth / data-role / data-admin
   on <html>, and injects its own stylesheet. Loading it across 385
   pages to reach one button would change the chrome on all of them.
   This module renders nothing until it is opened.

   What it does that the old flow did not
   ──────────────────────────────────────
   · Files the alert with the server, which pages the safety desk by
     email, admin push and an urgent support thread. The old flow told
     nobody at Cabana anything.
   · Uses ApaLocation, so the fix is high-accuracy and shared rather
     than a stale network guess fetched cold.
   · Picks emergency numbers for the country the caller is actually in.
     Cabana sells in 54 countries; the old list was Nairobi hospitals
     for all of them.

   API
     CabanaSOS.open()      open the flow
     CabanaSOS.raise(cat)  file an alert without the UI (for automations)
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  if (global.CabanaSOS) return;
  var doc = global.document;

  var CATEGORIES = [
    { id: 'medical',  e: '🚑', n: 'Medical emergency',   d: 'Ambulance, hospital, injury' },
    { id: 'police',   e: '🚨', n: 'Police / crime',      d: 'Robbery, assault, theft' },
    { id: 'fire',     e: '🔥', n: 'Fire / rescue',       d: 'Fire, trapped people, floods' },
    { id: 'security', e: '🛡️', n: 'Personal safety',     d: 'Threat, harassment, unsafe place' },
    { id: 'roadside', e: '🚗', n: 'Roadside emergency',  d: 'Accident, breakdown, stranded' },
    { id: 'support',  e: '💬', n: 'Urgent Cabana help',  d: 'Booking, host or payment problem' }
  ];

  /* Emergency numbers by ISO country. Cabana operates across Africa, so
     a Nairobi hospital line is the wrong answer in Lagos or Cairo.
     `all` is the single number that reaches police, fire and ambulance;
     where a country splits them, the specific ones are listed too.
     Every entry here is the state emergency service, not a Cabana line. */
  var EMERGENCY = {
    KE: { all: '999', alt: '112', ambulance: '1199', label: 'Kenya' },
    TZ: { all: '112', alt: '114', label: 'Tanzania' },
    UG: { all: '999', alt: '112', label: 'Uganda' },
    RW: { all: '112', police: '112', ambulance: '912', label: 'Rwanda' },
    ET: { all: '911', police: '991', ambulance: '907', label: 'Ethiopia' },
    NG: { all: '112', alt: '199', label: 'Nigeria' },
    GH: { all: '112', police: '191', ambulance: '193', label: 'Ghana' },
    ZA: { all: '112', police: '10111', ambulance: '10177', label: 'South Africa' },
    EG: { all: '122', ambulance: '123', fire: '180', label: 'Egypt' },
    MA: { all: '19', ambulance: '15', label: 'Morocco' },
    SN: { all: '17', ambulance: '15', label: 'Senegal' },
    CI: { all: '111', ambulance: '185', label: "Côte d'Ivoire" },
    ZM: { all: '999', label: 'Zambia' },
    ZW: { all: '999', alt: '112', label: 'Zimbabwe' },
    BW: { all: '999', ambulance: '997', label: 'Botswana' },
    NA: { all: '112', ambulance: '211111', label: 'Namibia' },
    MZ: { all: '119', ambulance: '117', label: 'Mozambique' },
    MW: { all: '997', alt: '998', label: 'Malawi' },
    MU: { all: '999', alt: '112', label: 'Mauritius' },
    SC: { all: '999', label: 'Seychelles' },
    TN: { all: '197', ambulance: '190', label: 'Tunisia' },
    DZ: { all: '17', ambulance: '14', label: 'Algeria' },
    /* Fallback. 112 is the GSM standard: it reaches an operator from
       almost any handset, on any network, often without a SIM. */
    XX: { all: '112', label: 'your area' }
  };

  function numbersFor(cc) {
    return EMERGENCY[(cc || '').toUpperCase()] || EMERGENCY.XX;
  }

  var _cat = null, _fix = null, _raised = false, _threadId = null, _cc = null;

  /* ── styles. Namespaced, injected once, only when first opened ──── */
  function css() {
    if (doc.getElementById('cbn-sos-css')) return;
    var s = doc.createElement('style');
    s.id = 'cbn-sos-css';
    s.textContent = [
      '.cbn-sos{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:flex-end;justify-content:center;background:rgba(8,8,15,.6);backdrop-filter:blur(8px);opacity:0;transition:opacity .28s;}',
      '.cbn-sos.on{opacity:1;}',
      '.cbn-sos-c{background:#fff;width:100%;max-width:460px;border-radius:22px 22px 0 0;max-height:88vh;display:flex;flex-direction:column;transform:translateY(18px);transition:transform .34s cubic-bezier(.22,1,.36,1);}',
      '.cbn-sos.on .cbn-sos-c{transform:none;}',
      '@media(min-width:560px){.cbn-sos{align-items:center;}.cbn-sos-c{border-radius:22px;}}',
      '.cbn-sos-h{display:flex;align-items:center;gap:10px;padding:16px 18px;border-bottom:1px solid #EEEEF4;}',
      '.cbn-sos-t{font:700 16px/1.2 system-ui;color:#08080F;flex:1;}',
      '.cbn-sos-x{width:32px;height:32px;border:0;border-radius:50%;background:#F2F2F8;color:#474A66;font-size:19px;line-height:1;cursor:pointer;}',
      '.cbn-sos-b{padding:16px 18px 22px;overflow-y:auto;}',
      '.cbn-sos-row{display:flex;align-items:center;gap:12px;padding:13px 12px;border-radius:13px;cursor:pointer;transition:background .15s;}',
      '.cbn-sos-row:hover{background:#F6F6FC;}',
      '.cbn-sos-row+.cbn-sos-row{margin-top:2px;}',
      '.cbn-sos-em{font-size:22px;flex:0 0 auto;}',
      '.cbn-sos-n{font:600 14px/1.3 system-ui;color:#08080F;}',
      '.cbn-sos-d{font:400 12px/1.4 system-ui;color:#8B8EAC;}',
      '.cbn-sos-note{display:flex;gap:9px;align-items:flex-start;padding:11px 13px;border-radius:12px;font:500 12.5px/1.5 system-ui;margin-bottom:11px;border:1px solid;}',
      '.cbn-sos-btn{width:100%;padding:14px;border:0;border-radius:13px;background:#FF1744;color:#fff;font:700 14px/1 system-ui;cursor:pointer;}',
      '.cbn-sos-btn[disabled]{opacity:.65;cursor:default;}',
      '.cbn-sos-btn2{width:100%;padding:13px;margin-top:9px;border:0;border-radius:13px;background:#4361FF;color:#fff;font:700 13px/1 system-ui;cursor:pointer;}',
      '.cbn-sos-res{display:flex;align-items:center;gap:11px;padding:11px 12px;border:1px solid #EEEEF4;border-radius:13px;}',
      '.cbn-sos-res+.cbn-sos-res{margin-top:8px;}',
      '.cbn-sos-res-n{font:600 13.5px/1.3 system-ui;color:#08080F;}',
      '.cbn-sos-res-m{font:400 11.5px/1.4 system-ui;color:#8B8EAC;}',
      '.cbn-sos-go{flex:0 0 auto;padding:8px 13px;border-radius:10px;color:#fff;font:700 12px/1 system-ui;text-decoration:none;white-space:nowrap;}',
      '.cbn-sos-back{background:none;border:0;color:#8B8EAC;font:600 12.5px/1 system-ui;cursor:pointer;padding:0 0 12px;}',
      '.cbn-sos-fine{font:400 11px/1.5 system-ui;color:#B6B8CC;text-align:center;margin:14px 0 0;}'
    ].join('');
    (doc.head || doc.documentElement).appendChild(s);
  }

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function el() { return doc.getElementById('cbn-sos'); }

  function shell(title, body) {
    css();
    var g = el();
    if (!g) {
      g = doc.createElement('div');
      g.className = 'cbn-sos';
      g.id = 'cbn-sos';
      g.innerHTML = '<div class="cbn-sos-c" role="dialog" aria-modal="true" aria-label="Emergency">'
        + '<div class="cbn-sos-h"><div class="cbn-sos-t"></div>'
        + '<button class="cbn-sos-x" aria-label="Close">&times;</button></div>'
        + '<div class="cbn-sos-b"></div></div>';
      doc.body.appendChild(g);
      g.addEventListener('click', function (e) {
        if (e.target === g || (e.target.classList && e.target.classList.contains('cbn-sos-x'))) close();
      });
      doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && el()) close(); });
      requestAnimationFrame(function () { g.classList.add('on'); });
    }
    g.querySelector('.cbn-sos-t').textContent = title;
    g.querySelector('.cbn-sos-b').innerHTML = body;
    return g;
  }

  function close() {
    var g = el();
    if (!g) return;
    g.classList.remove('on');
    setTimeout(function () { if (g.parentNode) g.remove(); }, 320);
  }

  /* ── identity ────────────────────────────────────────────────────── */
  function identity() {
    var st = null;
    try { st = global.ApaSession && ApaSession.get ? ApaSession.get() : null; } catch (e) {}
    var u = (st && st.user) || null;
    var m = (u && u.user_metadata) || {};
    var gk = null;
    try { if (global.CabanaSupport && CabanaSupport.guestKey) gk = CabanaSupport.guestKey(); } catch (e) {}
    if (!gk) {
      try {
        gk = localStorage.getItem('cabana_sos_key');
        if (!gk) {
          gk = 'sos-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
          localStorage.setItem('cabana_sos_key', gk);
        }
      } catch (e) { gk = 'sos-anon'; }
    }
    return {
      user_id: u && u.id ? u.id : null,
      guest_key: gk,
      email: (u && u.email) || m.email || null,
      display_name: (u && u.name) || m.full_name || m.name || null,
      phone: (u && u.phone) || m.phone || null
    };
  }

  /* ── file the alert ──────────────────────────────────────────────── */
  function raise(fix) {
    if (_raised) return Promise.resolve(null);
    _raised = true;
    var id = identity();
    return fetch('/api/sos-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: _cat || 'support',
        user_id: id.user_id,
        guest_key: id.guest_key,
        display_name: id.display_name,
        email: id.email,
        phone: id.phone,
        origin_page: location.pathname + location.search,
        locale: (navigator.language || '').slice(0, 20),
        location: fix ? {
          latitude: fix.latitude, longitude: fix.longitude, accuracy: fix.accuracy,
          altitude: fix.altitude, heading: fix.heading, speed: fix.speed,
          fixed_at: fix.fixed_at, source: fix.source || 'gps'
        } : { source: 'none' }
      }),
      keepalive: true
    })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (o) { if (o && o.thread_id) _threadId = o.thread_id; return o; })
      .catch(function () { _raised = false; return null; });
  }

  /* ── step 1 · what kind of emergency ─────────────────────────────── */
  function open() {
    _cat = null; _fix = null; _raised = false; _threadId = null;
    var rows = CATEGORIES.map(function (c) {
      return '<div class="cbn-sos-row" data-sos-cat="' + c.id + '">'
        + '<span class="cbn-sos-em">' + c.e + '</span>'
        + '<span style="flex:1"><span class="cbn-sos-n">' + esc(c.n) + '</span><br>'
        + '<span class="cbn-sos-d">' + esc(c.d) + '</span></span></div>';
    }).join('');
    var g = shell('What has happened?',
      rows + '<p class="cbn-sos-fine">Cabana is not an emergency service. '
      + 'If life is at risk, call your local emergency number first.</p>');
    g.querySelector('.cbn-sos-b').addEventListener('click', function (e) {
      var r = e.target.closest && e.target.closest('[data-sos-cat]');
      if (r) pick(r.getAttribute('data-sos-cat'));
    });
  }

  /* ── step 2 · location ───────────────────────────────────────────── */
  function pick(id) {
    _cat = id;
    var c = CATEGORIES.filter(function (x) { return x.id === id; })[0] || CATEGORIES[5];
    var g = shell(c.e + '  ' + c.n,
      '<button class="cbn-sos-back" data-sos-back>← Back</button>'
      + '<div class="cbn-sos-note" style="background:rgba(67,97,255,.07);border-color:rgba(67,97,255,.2);color:#2A3FC4">'
      + '<span>Sharing your location lets us send help to the right place, and tells our safety desk exactly where you are.</span></div>'
      + '<button class="cbn-sos-btn" data-sos-locate>📍 Share my location and alert Cabana</button>'
      + '<button class="cbn-sos-btn2" data-sos-skip>Continue without location</button>');
    var b = g.querySelector('.cbn-sos-b');
    b.addEventListener('click', function (e) {
      if (e.target.closest('[data-sos-back]')) return open();
      if (e.target.closest('[data-sos-skip]')) { raise(null); return results(null); }
      if (e.target.closest('[data-sos-locate]')) {
        var btn = e.target.closest('[data-sos-locate]');
        btn.disabled = true; btn.textContent = '⏳ Getting your location…';
        locate();
      }
    });
  }

  function locate() {
    function done(fix) {
      _fix = fix;
      raise(fix);
      results(fix);
      if (fix && global.ApaLocation && ApaLocation.label) {
        ApaLocation.label(fix).then(function (n) {
          var p = doc.getElementById('cbn-sos-place');
          if (p && n) p.textContent = 'Near ' + n;
        }, function () {});
      }
      if (fix) resolveCountry(fix);
    }
    if (global.ApaLocation && ApaLocation.ensure) {
      ApaLocation.ensure({ reason: 'sos', timeout: 9000, maxAge: 15000 }).then(done, function () { done(null); });
      return;
    }
    if (!navigator.geolocation) return done(null);
    navigator.geolocation.getCurrentPosition(
      function (p) {
        var c = p.coords;
        done({
          latitude: c.latitude, longitude: c.longitude, accuracy: c.accuracy,
          altitude: c.altitude, heading: c.heading, speed: c.speed,
          fixed_at: new Date(p.timestamp || Date.now()).toISOString(), source: 'gps'
        });
      },
      function () { done(null); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 9000 }
    );
  }

  /* Which country's emergency services apply. Re-renders the numbers if
     the answer arrives after the list is already on screen. */
  function resolveCountry(fix) {
    if (!global.ApaGeo || !ApaGeo.reverse) return;
    ApaGeo.reverse(fix.latitude, fix.longitude).then(function (p) {
      var cc = p && (p.countryCode || p.country_code || p.cc);
      if (cc && cc !== _cc) { _cc = cc; results(_fix); }
    }, function () {});
  }

  /* ── step 3 · numbers that actually ring, plus the desk ──────────── */
  function results(fix) {
    var c = CATEGORIES.filter(function (x) { return x.id === _cat; })[0] || CATEGORIES[5];
    var n = numbersFor(_cc);

    var acc = fix && fix.accuracy != null ? Math.round(fix.accuracy) : null;
    var accTxt = acc == null ? ''
      : acc <= 50 ? ' · precise to ' + acc + 'm'
      : acc <= 500 ? ' · within ' + acc + 'm'
      : acc <= 5000 ? ' · approximate, ±' + acc + 'm'
      : ' · city-level only, ±' + Math.round(acc / 1000) + 'km';

    var locBox = fix
      ? '<div class="cbn-sos-note" style="background:rgba(16,185,129,.08);border-color:rgba(16,185,129,.25);color:#059669">'
        + '<span>Location sent to our safety desk' + accTxt
        + '<br><span id="cbn-sos-place" style="opacity:.85"></span></span></div>'
      : '<div class="cbn-sos-note" style="background:rgba(245,158,11,.09);border-color:rgba(245,158,11,.28);color:#B45309">'
        + '<span>No location. Tell the desk where you are in the chat.</span></div>';

    var paged = '<div class="cbn-sos-note" style="background:rgba(255,23,68,.07);border-color:rgba(255,23,68,.22);color:#C11136">'
      + '<span><strong>Cabana&rsquo;s safety team has been alerted.</strong> '
      + 'We are notifying the desk by email and push right now.</span></div>';

    /* The state emergency line first, always. It is the one that brings
       an ambulance; we are the one that brings a person who can help
       with everything else. */
    var lines = [];
    if (_cat === 'medical' && n.ambulance) lines.push({ n: 'Ambulance', d: n.label, tel: n.ambulance });
    if (_cat === 'police' && n.police) lines.push({ n: 'Police', d: n.label, tel: n.police });
    if (_cat === 'fire' && n.fire) lines.push({ n: 'Fire and rescue', d: n.label, tel: n.fire });
    lines.push({ n: 'Emergency services', d: n.label + ' · police, fire, ambulance', tel: n.all });
    if (n.alt && n.alt !== n.all) lines.push({ n: 'Emergency (any network)', d: 'Works without a SIM on most handsets', tel: n.alt });

    var rows = lines.map(function (x, i) {
      return '<div class="cbn-sos-res"><span style="font-size:20px">' + (i === 0 ? '⚡' : '📞') + '</span>'
        + '<div style="flex:1;min-width:0"><div class="cbn-sos-res-n">' + esc(x.n) + '</div>'
        + '<div class="cbn-sos-res-m">' + esc(x.d) + '</div></div>'
        + '<a class="cbn-sos-go" style="background:' + (i === 0 ? '#FF1744' : '#4361FF') + '" href="tel:'
        + esc(x.tel) + '">' + (i === 0 ? 'Call ' : '') + esc(x.tel) + '</a></div>';
    }).join('');

    var g = shell(c.e + '  ' + c.n,
      paged + locBox + rows
      + '<button class="cbn-sos-btn2" data-sos-thread style="margin-top:12px">💬 Talk to the safety desk now</button>'
      + '<p class="cbn-sos-fine">Cabana is not an emergency service. '
      + 'If life is at risk, call ' + esc(n.all) + ' first.</p>');

    g.querySelector('.cbn-sos-b').addEventListener('click', function (e) {
      if (e.target.closest('[data-sos-thread]')) {
        try {
          if (global.CabanaSupport && CabanaSupport.open) {
            CabanaSupport.open();
            close();
            return;
          }
        } catch (err) {}
        location.href = '/help.html';
      }
    });
  }

  global.CabanaSOS = { open: open, raise: raise, close: close, CATEGORIES: CATEGORIES, EMERGENCY: EMERGENCY };

  /* Any page can offer SOS with a single attribute: data-cbn-sos */
  if (doc) {
    doc.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('[data-cbn-sos]') : null;
      if (t) { e.preventDefault(); open(); }
    });
  }
})(window);
