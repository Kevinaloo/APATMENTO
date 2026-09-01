/* ═══════════════════════════════════════════════════════════════════════
   CABANA · FLIGHT DESK — page controller
   cabana-flights.js

   Two screens sharing one URL.

     /flights                     the request form
     /flights?ref=CBF-xxxxxx&t=…  the status of a request already made

   The second is the reason the first can stay short. We never ask a
   traveller to create an account before they have seen a price, so the
   only way back to their request is a link — ref plus token — which we
   put in localStorage, in the address bar, and in the confirmation
   email. Any one of the three gets them home.

   EVERYTHING THE DESK KNOWS AND THE TRAVELLER DOES NOT stays server
   side. This file calls five RPCs and renders what comes back. It never
   sees a net cost or a supplier, because those columns are not in the
   response. See schema-flights.sql.

   Depends on: fd-atlas.js (airports/airlines), a Supabase client on
   window.sb, and cabana-flights.css.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── plumbing ──────────────────────────────────────────────────────── */

  var LS_KEY = 'cabana_flight_requests';
  var atlas  = window.FDAtlas;
  var sb     = null;

  function client() {
    if (sb) return sb;
    sb = window.sb || window.__sbClient || null;
    return sb;
  }

  function $(id)  { return document.getElementById(id); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var toastTimer = null;
  function toast(msg, bad) {
    var t = $('fd-toast');
    if (!t) { return; }
    t.textContent = msg;
    t.className = 'fd-toast is-on' + (bad ? ' is-bad' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = 'fd-toast'; }, 4200);
  }

  /* Money. The desk quotes in whole units; cents on an air fare are noise. */
  function money(v, ccy) {
    var n = Number(v || 0);
    return (ccy || 'KES') + ' ' + n.toLocaleString('en-KE', { maximumFractionDigits: 0 });
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* "6h 25m" reads faster than "385 minutes" when you are comparing five
     itineraries on a phone. */
  function dur(min) {
    var m = Number(min || 0);
    if (!m) return '';
    var h = Math.floor(m / 60);
    return h ? h + 'h ' + (m % 60 ? pad(m % 60) + 'm' : '') : m + 'm';
  }

  function hhmm(iso) {
    if (!iso) return '--:--';
    var d = new Date(iso);
    if (isNaN(d)) {
      /* Tolerate a bare "HH:MM" or "2026-09-20T09:45" without a zone. */
      var m = String(iso).match(/(\d{1,2}):(\d{2})/);
      return m ? pad(+m[1]) + ':' + m[2] : '--:--';
    }
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function dayLabel(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  function relTime(iso) {
    var d = new Date(iso), now = new Date();
    if (isNaN(d)) return '';
    var s = Math.round((now - d) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  function todayISO(offsetDays) {
    var d = new Date();
    d.setDate(d.getDate() + (offsetDays || 0));
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  /* ── remembering a request without an account ──────────────────────── */

  function saveLocal(ref, token, summary) {
    try {
      var all = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
      all = all.filter(function (x) { return x.ref !== ref; });
      all.unshift({ ref: ref, token: token, summary: summary, at: Date.now() });
      localStorage.setItem(LS_KEY, JSON.stringify(all.slice(0, 12)));
    } catch (e) { /* private mode. The URL still works. */ }
  }

  function localList() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
    catch (e) { return []; }
  }

  function tokenFor(ref) {
    var hit = localList().filter(function (x) { return x.ref === ref; })[0];
    return hit ? hit.token : null;
  }

  /* ══════════════════════════════════════════════════════════════════════
     STATE
  ══════════════════════════════════════════════════════════════════════ */

  var S = {
    tripType: 'return',
    origin: null,
    dest: null,
    depart: '',
    ret: '',
    adults: 1, children: 0, infants: 0,
    cabin: 'economy',
    flex: 'exact',
    maxStops: '',
    bags: 1,
    budgetMax: '',
    notes: '',
    name: '', email: '', phone: '', channel: 'whatsapp',
    dial: null,        // chosen country calling code
    ccPicking: false,
    picking: null,      // 'origin' | 'dest'
    view: 'form',
    req: null,          // loaded status payload
    ref: null, token: null,
    busy: false
  };

  /* ══════════════════════════════════════════════════════════════════════
     AIRPORT PICKER
     The atlas is inline, so this answers on the first keystroke with no
     network call. Rare airports fall through to the database.
  ══════════════════════════════════════════════════════════════════════ */

  var pickIndex = 0, pickResults = [];

  function openPicker(which) {
    S.picking = which;
    var sheet = $('fd-sheet');
    var input = $('fd-sheet-in');
    $('fd-sheet-title').textContent = which === 'origin' ? 'Flying from' : 'Flying to';
    input.value = '';
    input.placeholder = 'City, airport or code';
    renderPicker(defaultsFor(which));
    sheet.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    /* iOS will not focus an input inside an element that just became
       visible unless we wait for the paint. */
    setTimeout(function () { input.focus(); }, 60);
  }

  function closePicker() {
    $('fd-sheet').classList.remove('is-open');
    document.body.style.overflow = '';
    S.picking = null;
  }

  /* An empty box should still be useful. Show where people actually go. */
  function defaultsFor(which) {
    if (which === 'dest' && S.origin) {
      var near = atlas.airports.filter(function (a) {
        return a.iata !== S.origin.iata && a.continent === 'AF';
      });
      return near.slice(0, 9);
    }
    return atlas.airports.slice(0, 9);
  }

  function renderPicker(list) {
    pickResults = list;
    pickIndex = 0;
    var box = $('fd-sheet-list');
    if (!list.length) {
      box.innerHTML = '<div class="fd-sheet-empty">Nothing matches that. Try a city name or a three-letter code.</div>';
      return;
    }
    box.innerHTML = list.map(function (a, i) {
      return '<button type="button" class="fd-opt' + (i === 0 ? ' is-active' : '') +
        '" data-iata="' + esc(a.iata) + '" role="option">' +
        '<span class="fd-opt-code">' + esc(a.iata) + '</span>' +
        '<span class="fd-opt-main">' +
          '<span class="fd-opt-city">' + esc(a.city) + '</span>' +
          '<span class="fd-opt-name">' + esc(a.name) + '</span>' +
        '</span>' +
        '<span class="fd-opt-cc">' + esc(a.country) + '</span>' +
      '</button>';
    }).join('');
  }

  function highlight(i) {
    var opts = $$('.fd-opt', $('fd-sheet-list'));
    if (!opts.length) return;
    pickIndex = Math.max(0, Math.min(opts.length - 1, i));
    opts.forEach(function (o, n) { o.classList.toggle('is-active', n === pickIndex); });
    opts[pickIndex].scrollIntoView({ block: 'nearest' });
  }

  function choosePort(iata) {
    var a = atlas.airport(iata);
    if (!a) return;
    if (S.picking === 'origin') {
      if (S.dest && S.dest.iata === a.iata) S.dest = null;
      S.origin = a;
    } else {
      if (S.origin && S.origin.iata === a.iata) S.origin = null;
      S.dest = a;
    }
    closePicker();
    renderRoute();
    /* Momentum: having picked an origin, the next thing needed is a
       destination. Open it rather than making them find the tap target. */
    if (S.picking === null && !S.dest && S.origin) {
      setTimeout(function () { openPicker('dest'); }, 240);
    }
  }

  /* Long-tail lookup. Only fires when the inline atlas comes up short. */
  var dbTimer = null;
  function dbSearch(q) {
    clearTimeout(dbTimer);
    dbTimer = setTimeout(function () {
      var c = client();
      if (!c || q.length < 2) return;
      c.from('airports')
        .select('iata,name,city,country,country_code,continent,lat,lng,rank')
        .or('iata.ilike.' + q + '%,city.ilike.%' + q + '%,name.ilike.%' + q + '%')
        .order('rank', { ascending: false })
        .limit(8)
        .then(function (r) {
          if (!r || r.error || !r.data || !r.data.length) return;
          if ($('fd-sheet-in').value.trim().toLowerCase() !== q) return;
          var have = {};
          pickResults.forEach(function (a) { have[a.iata] = 1; });
          var extra = r.data
            .filter(function (a) { return !have[a.iata]; })
            .map(function (a) {
              return { iata: a.iata, city: a.city, name: a.name, country: a.country,
                       cc: a.country_code, continent: a.continent,
                       lat: a.lat, lng: a.lng, rank: a.rank };
            });
          if (extra.length) renderPicker(pickResults.concat(extra).slice(0, 12));
        });
    }, 240);
  }

  /* ══════════════════════════════════════════════════════════════════════
     INTERNATIONAL PHONE

     The dial code is a control, not a hint baked into a placeholder.
     It defaults from locale and timezone, and the number is stored in
     E.164 so the desk can dial or WhatsApp it from anywhere without
     guessing what country a bare "0712..." belongs to.
  ══════════════════════════════════════════════════════════════════════ */

  var ccIndex = 0, ccResults = [];

  function dialData() { return window.FDDial || null; }

  function initDial() {
    var D = dialData();
    if (!D) return;
    S.dial = D.guess() || D.byIso('KE');
    paintDial();
  }

  function paintDial() {
    if (!S.dial) return;
    var f = $('fd-cc-flag'), d = $('fd-cc-dial'), n = $('fd-phone');
    if (f) f.textContent = S.dial.flag;
    if (d) d.textContent = '+' + S.dial.dial;
    /* The placeholder shows this country's real number shape, so nobody
       has to be told the format in prose. */
    if (n) n.placeholder = S.dial.example || '';
  }

  function openCC() {
    var D = dialData();
    if (!D) return;
    S.ccPicking = true;
    var sheet = $('fd-cc-sheet'), input = $('fd-cc-in');
    input.value = '';
    renderCC(D.find('', 14));
    sheet.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { input.focus(); }, 60);
  }

  function closeCC() {
    $('fd-cc-sheet').classList.remove('is-open');
    document.body.style.overflow = '';
    S.ccPicking = false;
  }

  function renderCC(list) {
    ccResults = list;
    ccIndex = 0;
    var box = $('fd-cc-list');
    if (!list.length) {
      box.innerHTML = '<div class="fd-sheet-empty">No country matches that.</div>';
      return;
    }
    box.innerHTML = list.map(function (c, i) {
      return '<button type="button" class="fd-opt' + (i === 0 ? ' is-active' : '') +
        '" data-iso="' + esc(c.iso) + '" role="option">' +
        '<span class="fd-opt-flag">' + c.flag + '</span>' +
        '<span class="fd-opt-main"><span class="fd-opt-city">' + esc(c.name) + '</span></span>' +
        '<span class="fd-opt-dial">+' + esc(c.dial) + '</span>' +
      '</button>';
    }).join('');
  }

  function highlightCC(i) {
    var opts = $$('.fd-opt', $('fd-cc-list'));
    if (!opts.length) return;
    ccIndex = Math.max(0, Math.min(opts.length - 1, i));
    opts.forEach(function (o, n) { o.classList.toggle('is-active', n === ccIndex); });
    opts[ccIndex].scrollIntoView({ block: 'nearest' });
  }

  function chooseCC(iso) {
    var D = dialData();
    if (!D) return;
    var c = D.byIso(iso);
    if (!c) return;
    S.dial = c;
    paintDial();
    closeCC();
    var n = $('fd-phone');
    if (n) n.focus();
    validate();
  }

  /* Assemble E.164: +<dial><national>, with the national part stripped
     of spaces, punctuation and any trunk zero. "0712 345678" in Kenya
     and "712345678" both become +254712345678. */
  function fullPhone() {
    var raw = ($('fd-phone') ? $('fd-phone').value : '').trim();
    if (!raw) return '';
    /* Someone who pasted a full international number already knows their
       code; respect it rather than prefixing a second one. */
    if (raw.charAt(0) === '+') return raw.replace(/[^\d+]/g, '');
    var nat = raw.replace(/\D/g, '').replace(/^0+/, '');
    if (!nat) return '';
    return '+' + (S.dial ? S.dial.dial : '254') + nat;
  }

  /* ══════════════════════════════════════════════════════════════════════
     ROUTE HEADER + THE ARC
  ══════════════════════════════════════════════════════════════════════ */

  function renderRoute() {
    var o = S.origin, d = S.dest;

    $('fd-o-code').textContent = o ? o.iata : '···';
    $('fd-o-code').classList.toggle('is-empty', !o);
    $('fd-o-city').textContent = o ? o.city + ', ' + o.country : 'Choose an airport';

    $('fd-d-code').textContent = d ? d.iata : '···';
    $('fd-d-code').classList.toggle('is-empty', !d);
    $('fd-d-city').textContent = d ? d.city + ', ' + d.country : 'Choose an airport';

    var arc = $('fd-arc');
    var line = $('fd-legline');
    if (o && d) {
      arc.classList.add('is-drawn');
      var km = atlas.distance(o, d);
      /* Block time, roughly: cruise at ~800km/h plus taxi, climb and
         descent. Close enough to set an expectation, and labelled as
         an estimate so it is never mistaken for a schedule. */
      var mins = Math.round(km / 800 * 60) + 35;
      line.innerHTML = '<b>' + km.toLocaleString('en-KE') + ' km</b> · about <b>' +
                       dur(mins) + '</b> in the air · non-stop where it exists';
    } else {
      arc.classList.remove('is-drawn');
      line.textContent = 'Pick both ends and we will take it from there';
    }
    validate();
  }

  function swapPorts() {
    var t = S.origin; S.origin = S.dest; S.dest = t;
    renderRoute();
  }

  /* ══════════════════════════════════════════════════════════════════════
     FORM
  ══════════════════════════════════════════════════════════════════════ */

  function setTrip(t) {
    S.tripType = t;
    $$('#fd-trip button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.trip === t));
    });
    var retField = $('fd-f-return');
    retField.style.display = (t === 'one_way') ? 'none' : '';
    if (t === 'one_way') { S.ret = ''; $('fd-return').value = ''; }
    validate();
  }

  function stepper(kind, delta) {
    var lim = { adults: [1, 9], children: [0, 8], infants: [0, 4] }[kind];
    var next = Math.max(lim[0], Math.min(lim[1], S[kind] + delta));
    /* One lap per adult is the rule every carrier applies. */
    if (kind === 'infants' && next > S.adults) next = S.adults;
    if (kind === 'adults' && S.infants > next) S.infants = next;
    S[kind] = next;
    renderPax();
  }

  function renderPax() {
    ['adults', 'children', 'infants'].forEach(function (k) {
      $('fd-n-' + k).textContent = S[k];
      var dec = $('fd-dec-' + k), inc = $('fd-inc-' + k);
      var lim = { adults: [1, 9], children: [0, 8], infants: [0, 4] }[k];
      dec.disabled = S[k] <= lim[0];
      inc.disabled = S[k] >= lim[1] || (k === 'infants' && S[k] >= S.adults);
    });
    var total = S.adults + S.children + S.infants;
    $('fd-pax-sum').textContent = total + ' traveller' + (total === 1 ? '' : 's');
  }

  function chipGroup(sel, key) {
    $$(sel).forEach(function (b) {
      b.addEventListener('click', function () {
        S[key] = b.dataset.val;
        $$(sel).forEach(function (x) {
          x.setAttribute('aria-pressed', String(x.dataset.val === S[key]));
        });
      });
    });
  }

  function fieldErr(id, msg) {
    var f = $(id);
    if (!f) return;
    f.classList.toggle('has-err', !!msg);
    var e = f.querySelector('.fd-err');
    if (e && msg) e.textContent = msg;
  }

  function validate() {
    var ok = !!(S.origin && S.dest && S.depart && S.name.trim() &&
                (S.email.trim() || fullPhone()));
    if (S.tripType === 'return' && !S.ret) ok = false;
    $('fd-submit').disabled = !ok || S.busy;
    return ok;
  }

  function readContact() {
    S.name  = $('fd-name').value;
    S.email = $('fd-email').value;
    S.phone = fullPhone();
    S.notes = $('fd-notes').value;
    S.budgetMax = $('fd-budget').value;
    S.maxStops  = $('fd-stops').value;
    validate();
  }

  /* ── submit ────────────────────────────────────────────────────────── */

  function collectUTM() {
    var p = new URLSearchParams(location.search), out = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) {
      if (p.get(k)) out[k] = p.get(k);
    });
    return Object.keys(out).length ? out : null;
  }

  function submit() {
    if (!validate() || S.busy) return;
    var c = client();
    if (!c) { toast('Connection is not ready. Reload and try again.', true); return; }

    S.busy = true;
    var btn = $('fd-submit');
    btn.classList.add('is-busy');
    btn.disabled = true;
    $('fd-submit-label').textContent = 'Sending to the desk';

    var payload = {
      trip_type: S.tripType,
      origin_iata: S.origin.iata,
      dest_iata: S.dest.iata,
      depart_date: S.depart,
      return_date: S.tripType === 'one_way' ? null : (S.ret || null),
      adults: S.adults, children: S.children, infants: S.infants,
      cabin: S.cabin,
      date_flex: S.flex,
      max_stops: S.maxStops === '' ? null : Number(S.maxStops),
      baggage_needed: S.bags,
      budget_max: S.budgetMax === '' ? null : Number(S.budgetMax),
      budget_currency: 'KES',
      notes: S.notes,
      contact_name: S.name.trim(),
      contact_email: S.email.trim() || null,
      contact_phone: fullPhone() || null,
      contact_channel: S.channel,
      source: 'web',
      referrer: document.referrer || null,
      utm: collectUTM()
    };

    c.rpc('fd_submit_request', { p: payload }).then(function (r) {
      S.busy = false;
      btn.classList.remove('is-busy');
      $('fd-submit-label').textContent = 'Send to the flight desk';
      validate();

      var res = r && r.data;
      if (r && r.error) { toast(networkMessage(r.error), true); return; }
      if (!res || !res.ok) { toast(submitMessage(res && res.error), true); return; }

      saveLocal(res.ref, res.token, S.origin.iata + ' to ' + S.dest.iata + ', ' + S.depart);
      S.ref = res.ref; S.token = res.token;

      try {
        history.replaceState({}, '',
          location.pathname + '?ref=' + encodeURIComponent(res.ref) + '&t=' + encodeURIComponent(res.token));
      } catch (e) {}

      /* Tell the desk. Fire and forget: a failed notification must never
         cost the traveller their request. */
      fetch('/api/flight-desk?action=notify-new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: res.ref })
      }).catch(function () {});

      if (window.gtag) {
        window.gtag('event', 'flight_request_submitted', {
          route: S.origin.iata + '-' + S.dest.iata, cabin: S.cabin
        });
      }

      showStatus(res.ref, res.token);
      toast('Request ' + res.ref + ' is with the desk.');
    }).catch(function (err) {
      S.busy = false;
      btn.classList.remove('is-busy');
      $('fd-submit-label').textContent = 'Send to the flight desk';
      validate();
      toast(networkMessage(err), true);
    });
  }

  /* Errors explain what happened and what to do, in our own voice. */
  function submitMessage(code) {
    return ({
      desk_closed:          'The desk is closed right now. Try again when it reopens.',
      missing_route:        'We need a departure airport and a date.',
      past_date:            'That date has already passed. Pick a day from today onward.',
      return_before_depart: 'The return date falls before departure.',
      missing_name:         'We need a name to put on the request.',
      missing_contact:      'Add an email or a phone number so we can reach you.',
      too_many_open:        'You already have five open requests. We will clear those first.'
    })[code] || 'That did not go through. Check the details and try again.';
  }

  function networkMessage() {
    return navigator.onLine === false
      ? 'You are offline. The request will need a connection.'
      : 'We could not reach the desk. Try again in a moment.';
  }

  /* ══════════════════════════════════════════════════════════════════════
     STATUS VIEW
  ══════════════════════════════════════════════════════════════════════ */

  var pollTimer = null, etaTimer = null;

  function showStatus(ref, token) {
    S.ref = ref;
    S.token = token || tokenFor(ref);
    S.view = 'status';
    $('fd-form-wrap').classList.add('is-off');
    $('fd-status').classList.add('is-on');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadStatus();
    startPoll();
  }

  function showForm() {
    S.view = 'form';
    stopPoll();
    $('fd-status').classList.remove('is-on');
    $('fd-form-wrap').classList.remove('is-off');
    try { history.replaceState({}, '', location.pathname); } catch (e) {}
  }

  /* Poll rather than subscribe: an anonymous traveller has no RLS view of
     their own row, so realtime would deliver nothing. Polling is also the
     thing that survives a flaky mobile connection. Paused when the tab is
     hidden so we are not burning someone's bundle in the background. */
  function startPoll() {
    stopPoll();
    pollTimer = setInterval(function () {
      if (document.hidden) return;
      loadStatus(true);
    }, 25000);
  }
  function stopPoll() {
    clearInterval(pollTimer); pollTimer = null;
    clearInterval(etaTimer);  etaTimer = null;
  }

  function loadStatus(quiet) {
    var c = client();
    if (!c || !S.ref) return;
    c.rpc('fd_get_request', { p_ref: S.ref, p_token: S.token || null }).then(function (r) {
      var res = r && r.data;
      if (!res || !res.ok) {
        if (!quiet) {
          $('fd-status').innerHTML =
            '<div class="fd-wait"><div class="fd-wait-t">We cannot open that request</div>' +
            '<div class="fd-wait-d">The link may be incomplete. Open it from the email we sent, ' +
            'or <button type="button" class="fd-chip" id="fd-back-new" style="margin-top:14px">start a new request</button></div></div>';
          var b = $('fd-back-new');
          if (b) b.addEventListener('click', showForm);
        }
        return;
      }
      var prevStatus = S.req && S.req.request && S.req.request.status;
      S.req = res;
      renderStatus();
      if (prevStatus && prevStatus !== res.request.status && res.request.status === 'quoted') {
        toast('Your options are ready.');
      }
    });
  }

  var STATUS_PILL = {
    new:             ['With the desk',    'fd-pill-work'],
    working:         ['Searching now',    'fd-pill-work'],
    quoted:          ['Options ready',    'fd-pill-live'],
    selected:        ['Option chosen',    'fd-pill-done'],
    payment_pending: ['Payment due',      'fd-pill-work'],
    confirmed:       ['Paid',             'fd-pill-done'],
    ticketed:        ['Ticketed',         'fd-pill-live'],
    completed:       ['Flown',            'fd-pill-off'],
    cancelled:       ['Cancelled',        'fd-pill-off'],
    expired:         ['Expired',          'fd-pill-off'],
    unable:          ['Nothing suitable', 'fd-pill-bad']
  };

  function renderStatus() {
    var d = S.req, r = d.request;
    var o = atlas.airport(r.origin_iata), t = atlas.airport(r.dest_iata);
    var pill = STATUS_PILL[r.status] || ['Updated', 'fd-pill-off'];
    var pax = r.adults + r.children + r.infants;

    var html = '';

    /* header */
    html += '<div class="fd-ticket">';
    html +=   '<div class="fd-ticket-top">';
    html +=     '<div>';
    html +=       '<div class="fd-ticket-ref">' + esc(r.ref) + '</div>';
    html +=       '<div class="fd-ticket-route"><b>' + esc(r.origin_iata) + '</b> ' +
                    (o ? esc(o.city) : '') + ' &rarr; <b>' + esc(r.dest_iata || '') + '</b> ' +
                    (t ? esc(t.city) : '') + '</div>';
    html +=       '<div class="fd-ticket-route" style="margin-top:4px;font-size:12.5px;color:var(--fd-faint)">' +
                    esc(dayLabel(r.depart_date)) +
                    (r.return_date ? ' &ndash; ' + esc(dayLabel(r.return_date)) : ' &middot; one way') +
                    ' &middot; ' + pax + ' traveller' + (pax === 1 ? '' : 's') +
                    ' &middot; ' + esc(cabinLabel(r.cabin)) + '</div>';
    html +=     '</div>';
    html +=     '<span class="fd-pill ' + pill[1] + '">' + esc(pill[0]) + '</span>';
    html +=   '</div>';

    /* countdown, only while it means something */
    if ((r.status === 'new' || r.status === 'working') && r.sla_due_at) {
      html += '<div class="fd-eta">' +
                '<div class="fd-eta-lab">Options expected within</div>' +
                '<div class="fd-eta-val" id="fd-eta-val">—</div>' +
                '<div class="fd-eta-bar" id="fd-eta-bar"><i style="width:0%"></i></div>' +
              '</div>';
    }

    /* timeline */
    var ev = d.events || [];
    html += '<div class="fd-time"><div class="fd-eta-lab" style="margin-bottom:14px">Progress</div><div class="fd-tl">';
    ev.forEach(function (e, i) {
      html += '<div class="fd-tl-i' + (i === ev.length - 1 ? ' is-now' : '') + '">' +
                '<div class="fd-tl-t">' + esc(e.title) + '</div>' +
                (e.detail ? '<div class="fd-tl-d">' + esc(e.detail) + '</div>' : '') +
                '<div class="fd-tl-at">' + esc(relTime(e.at)) + '</div>' +
              '</div>';
    });
    html += '</div></div></div>';

    /* the options, or the reason there are none yet */
    var quotes = d.quotes || [];
    if (quotes.length) {
      html += '<div class="fd-sec-h" style="font-size:20px;margin:26px 0 6px">' +
                (r.status === 'selected' || r.selected_quote_id ? 'Your chosen flight' : 'Choose your flight') +
              '</div>';
      html += '<p class="fd-sec-s" style="margin-bottom:18px">' +
                (r.selected_quote_id
                  ? 'We are holding this while we confirm. The desk will be in touch about payment and ticketing.'
                  : 'Prices are all-in for ' + pax + ' traveller' + (pax === 1 ? '' : 's') + '. Nothing is added at checkout.') +
              '</p>';
      html += '<div class="fd-quotes">';
      quotes.forEach(function (q) { html += quoteCard(q, r); });
      html += '</div>';
    } else if (r.status === 'unable') {
      html += '<div class="fd-wait">' +
                '<div class="fd-wait-t">We could not find a fare worth putting our name to</div>' +
                '<div class="fd-wait-d">' + esc(r.close_reason || 'Nothing on this route met our bar. You have not been charged.') +
                '</div></div>';
    } else if (r.status === 'cancelled') {
      html += '<div class="fd-wait"><div class="fd-wait-t">This request is closed</div>' +
              '<div class="fd-wait-d">Start a new one whenever you are ready.</div></div>';
    } else if (r.status === 'new' || r.status === 'working') {
      html += '<div class="fd-wait">' +
                '<div class="fd-wait-r"></div>' +
                '<div class="fd-wait-t">The desk is on it</div>' +
                '<div class="fd-wait-d">We are pricing ' + esc(r.origin_iata) + ' to ' + esc(r.dest_iata || '') +
                ' across the carriers that fly it. You can close this page. ' +
                'We will message you' + (r.contact_email ? ' at ' + esc(r.contact_email) : '') +
                ' the moment there is something to look at.</div>' +
              '</div>';
    }

    /* ticket, once issued */
    var b = d.booking;
    if (b && b.pnr) {
      html += '<div class="fd-ticket" style="margin-top:20px"><div class="fd-ticket-top">' +
                '<div><div class="fd-eta-lab">Booking reference</div>' +
                '<div class="fd-ticket-ref" style="margin-top:8px">' + esc(b.pnr) + '</div>' +
                '<div class="fd-ticket-route" style="margin-top:8px">' + esc(b.airline_name || '') + '</div></div>' +
                (b.ticket_url ? '<a class="fd-q-pick" style="text-decoration:none" href="' + esc(b.ticket_url) +
                  '" target="_blank" rel="noopener">Download e-ticket</a>' : '') +
              '</div></div>';
    }

    /* footer actions */
    html += '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:24px">';
    html +=   '<button type="button" class="fd-chip" id="fd-act-new">Request another trip</button>';
    html +=   '<button type="button" class="fd-chip" id="fd-act-copy">Copy my link</button>';
    if (['new', 'working', 'quoted'].indexOf(r.status) >= 0) {
      html += '<button type="button" class="fd-chip" id="fd-act-cancel">Cancel this request</button>';
    }
    html += '</div>';
    html += '<p class="fd-note" style="text-align:left;margin-top:14px">' +
              'Keep <b>' + esc(r.ref) + '</b>. It is how you and the desk refer to this trip.</p>';

    $('fd-status').innerHTML = html;
    wireStatus();
    startEta();
  }

  function cabinLabel(c) {
    return ({ economy: 'Economy', premium_economy: 'Premium economy',
              business: 'Business', first: 'First', any: 'Any cabin' })[c] || 'Economy';
  }

  var BADGE = {
    cheapest:    ['Lowest fare', ''],
    fastest:     ['Fastest', ''],
    best_value:  ['Best value', ''],
    recommended: ['We suggest this', 'is-rec'],
    flexible:    ['Most flexible', '']
  };

  function quoteCard(q, r) {
    var chosen = r.selected_quote_id === q.id || q.status === 'selected';
    var locked = !!r.selected_quote_id;
    var pax = r.adults + r.children + r.infants;
    var bd = BADGE[q.badge];

    var h = '<div class="fd-quote' + (chosen ? ' is-chosen' : '') + '" data-quote="' + esc(q.id) + '">';
    if (bd) h += '<div class="fd-quote-badge ' + bd[1] + '">' + esc(bd[0]) + '</div>';
    h += '<div class="fd-quote-body">';

    h += '<div class="fd-q-air">' +
           '<div class="fd-q-logo">' + esc(q.airline_iata || (q.airline_name || '??').slice(0, 2).toUpperCase()) + '</div>' +
           '<div><div class="fd-q-name">' + esc(q.airline_name) + '</div>' +
           '<div class="fd-q-sub">' + esc(cabinLabel(q.cabin)) +
             (q.fare_brand ? ' &middot; ' + esc(q.fare_brand) : '') +
             (q.operated_by ? ' &middot; operated by ' + esc(q.operated_by) : '') +
           '</div></div>' +
         '</div>';

    h += legStrip(q.outbound, 'Outbound', q.stops_out, q.duration_out);
    if (q.inbound && q.inbound.length) {
      h += legStrip(q.inbound, 'Return', q.stops_in, q.duration_in);
    }

    h += '<div class="fd-q-meta">';
    if (q.baggage_checked) h += '<span class="fd-q-tag is-good">' + esc(q.baggage_checked) + ' checked</span>';
    if (q.baggage_cabin)   h += '<span class="fd-q-tag">' + esc(q.baggage_cabin) + ' cabin</span>';
    if (q.refundable)      h += '<span class="fd-q-tag is-good">Refundable</span>';
    if (q.changeable)      h += '<span class="fd-q-tag is-good">Changes allowed</span>';
    if (q.seats_left && q.seats_left <= 6) {
      h += '<span class="fd-q-tag">' + q.seats_left + ' seats left at this fare</span>';
    }
    h += '</div>';

    h += '<div class="fd-q-foot"><div>' +
           '<div class="fd-q-price"><small>' + esc(q.currency) + '</small>' +
             Number(q.price).toLocaleString('en-KE', { maximumFractionDigits: 0 }) + '</div>' +
           '<div class="fd-q-per">total for ' + pax + ' traveller' + (pax === 1 ? '' : 's') +
             (q.taxes_included ? ', taxes included' : '') + '</div>';
    if (q.hold_until) h += holdLine(q.hold_until);
    h += '</div>';

    if (chosen) {
      h += '<button type="button" class="fd-q-pick is-chosen" disabled>Chosen</button>';
    } else if (locked) {
      h += '<button type="button" class="fd-q-pick" data-pick="' + esc(q.id) + '">Switch to this</button>';
    } else {
      h += '<button type="button" class="fd-q-pick" data-pick="' + esc(q.id) + '">Choose this flight</button>';
    }
    h += '</div></div></div>';
    return h;
  }

  function holdLine(iso) {
    var left = new Date(iso) - new Date();
    if (left <= 0) {
      return '<div class="fd-hold is-gone">' + clockSvg() + 'This fare has expired. Ask the desk to refresh it.</div>';
    }
    var hrs = Math.floor(left / 3600000), mins = Math.round((left % 3600000) / 60000);
    return '<div class="fd-hold">' + clockSvg() + 'Held for ' +
           (hrs ? hrs + 'h ' : '') + mins + 'm</div>';
  }

  function clockSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
           'stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  }

  /* One leg, rendered as a strip timetable: departure, the line with a
     dot per stop, arrival. Reads at a glance on a small screen. */
  function legStrip(legs, label, stops, total) {
    if (!legs || !legs.length) return '';
    var first = legs[0], last = legs[legs.length - 1];
    var nStops = typeof stops === 'number' ? stops : Math.max(0, legs.length - 1);

    var dots = '';
    for (var i = 1; i < legs.length; i++) {
      dots += '<i style="left:' + Math.round(i / legs.length * 100) + '%" title="' +
              esc(legs[i].from || '') + '"></i>';
    }

    var via = legs.slice(0, -1).map(function (l) { return l.to; }).filter(Boolean);

    return '<div class="fd-leg">' +
      '<div class="fd-leg-lab">' + esc(label) +
        (first.dep ? ' &middot; ' + esc(dayLabel(first.dep)) : '') + '</div>' +
      '<div class="fd-leg-row">' +
        '<div class="fd-leg-end">' +
          '<div class="fd-leg-time">' + esc(hhmm(first.dep)) + '</div>' +
          '<div class="fd-leg-port">' + esc(first.from || '') + '</div>' +
        '</div>' +
        '<div class="fd-leg-mid">' +
          '<div class="fd-leg-dur">' + esc(dur(total) || '') + '</div>' +
          '<div class="fd-leg-line">' + dots + '</div>' +
          '<div class="fd-leg-stops' + (nStops === 0 ? ' is-direct' : '') + '">' +
            (nStops === 0 ? 'Non-stop'
              : nStops + ' stop' + (nStops > 1 ? 's' : '') + (via.length ? ' via ' + esc(via.join(', ')) : '')) +
          '</div>' +
        '</div>' +
        '<div class="fd-leg-end">' +
          '<div class="fd-leg-time">' + esc(hhmm(last.arr)) + '</div>' +
          '<div class="fd-leg-port">' + esc(last.to || '') + '</div>' +
        '</div>' +
      '</div></div>';
  }

  function wireStatus() {
    $$('#fd-status [data-pick]').forEach(function (b) {
      b.addEventListener('click', function () { pickQuote(b.dataset.pick, b); });
    });
    var n = $('fd-act-new');    if (n) n.addEventListener('click', showForm);
    var cp = $('fd-act-copy');  if (cp) cp.addEventListener('click', copyLink);
    var cx = $('fd-act-cancel');if (cx) cx.addEventListener('click', cancelRequest);
  }

  function copyLink() {
    var url = location.origin + location.pathname +
              '?ref=' + encodeURIComponent(S.ref) + '&t=' + encodeURIComponent(S.token || '');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(
        function () { toast('Link copied. Keep it to come back to this trip.'); },
        function () { toast(url); }
      );
    } else {
      toast(url);
    }
  }

  function pickQuote(id, btn) {
    var c = client();
    if (!c) return;
    btn.disabled = true;
    btn.textContent = 'Holding…';
    c.rpc('fd_select_quote', { p_ref: S.ref, p_token: S.token || null, p_quote_id: id })
      .then(function (r) {
        var res = r && r.data;
        if (!res || !res.ok) {
          btn.disabled = false;
          btn.textContent = 'Choose this flight';
          toast(res && res.error === 'quote_expired'
            ? 'That fare just expired. The desk will refresh it.'
            : 'We could not hold that one. Try again.', true);
          loadStatus(true);
          return;
        }
        if (window.gtag) window.gtag('event', 'flight_quote_selected', { ref: S.ref });
        fetch('/api/flight-desk?action=notify-selected', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ref: S.ref, quote_id: id })
        }).catch(function () {});
        toast('Locked in. The desk will confirm shortly.');
        loadStatus();
      });
  }

  function cancelRequest() {
    if (!confirm('Cancel this request? The desk will stop working on it.')) return;
    var c = client();
    if (!c) return;
    c.rpc('fd_cancel_request', { p_ref: S.ref, p_token: S.token || null, p_reason: null })
      .then(function () { toast('Request cancelled.'); loadStatus(); });
  }

  /* The countdown runs on its own timer so the whole view is not
     re-rendered once a second. */
  function startEta() {
    clearInterval(etaTimer);
    var val = $('fd-eta-val');
    if (!val || !S.req) return;
    var r = S.req.request;
    var due = new Date(r.sla_due_at), from = new Date(r.created_at);
    var span = Math.max(1, due - from);

    function tick() {
      var left = due - new Date();
      var bar = $('fd-eta-bar');
      if (!val.isConnected) { clearInterval(etaTimer); return; }
      if (left <= 0) {
        val.textContent = 'Any moment now';
        if (bar) { bar.classList.add('is-late'); bar.firstChild.style.width = '100%'; }
        return;
      }
      var m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
      val.textContent = m >= 60
        ? Math.floor(m / 60) + 'h ' + pad(m % 60) + 'm'
        : m + 'm ' + pad(s) + 's';
      if (bar) bar.firstChild.style.width = Math.min(100, (1 - left / span) * 100) + '%';
    }
    tick();
    etaTimer = setInterval(tick, 1000);
  }

  /* ══════════════════════════════════════════════════════════════════════
     DESK STATUS + POPULAR ROUTES
  ══════════════════════════════════════════════════════════════════════ */

  function loadDeskStatus() {
    var c = client();
    if (!c) return;
    c.rpc('fd_desk_status').then(function (r) {
      var d = r && r.data;
      if (!d) return;
      var pill = $('fd-desk-pill');
      var txt  = $('fd-desk-text');
      if (!pill || !txt) return;
      if (d.open) {
        pill.className = 'fd-eyebrow';
        txt.textContent = 'Flight desk open · options in about ' +
          (d.median_response_minutes || d.sla_minutes) + ' min';
      } else {
        pill.className = 'fd-eyebrow is-closed';
        txt.textContent = 'Desk closed · ' + (d.hours_label || 'back in the morning');
        var b = $('fd-submit');
        if (b) { b.disabled = true; $('fd-submit-label').textContent = 'Desk is closed'; }
      }
      var self = $('fd-self');
      if (self && d.affiliate_enabled === false) self.style.display = 'none';
    });
  }

  /* Routes we actually serve, ordered the way people ask for them.
     Tapping one fills the form rather than navigating away. */
  var POPULAR = [
    ['NBO', 'MBA'], ['NBO', 'DXB'], ['NBO', 'ZNZ'], ['NBO', 'LHR'],
    ['NBO', 'JNB'], ['NBO', 'KGL'], ['NBO', 'BOM'], ['NBO', 'IST'],
    ['NBO', 'EBB'], ['NBO', 'DOH'], ['NBO', 'ADD'], ['NBO', 'CDG']
  ];

  function renderPopular() {
    var box = $('fd-popular');
    if (!box) return;
    box.innerHTML = POPULAR.map(function (p) {
      var a = atlas.airport(p[0]), b = atlas.airport(p[1]);
      if (!a || !b) return '';
      var km = atlas.distance(a, b);
      return '<button type="button" class="fd-routecard" data-o="' + p[0] + '" data-d="' + p[1] + '">' +
        '<span><span class="fd-routecard-r">' + p[0] + ' &rarr; ' + p[1] + '</span>' +
        '<span class="fd-routecard-c">' + esc(a.city) + ' to ' + esc(b.city) +
        ' &middot; ' + km.toLocaleString('en-KE') + ' km</span></span>' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M5 12h14M12 5l7 7-7 7"/></svg></button>';
    }).join('');

    $$('.fd-routecard', box).forEach(function (b) {
      b.addEventListener('click', function () {
        S.origin = atlas.airport(b.dataset.o);
        S.dest   = atlas.airport(b.dataset.d);
        renderRoute();
        $('fd-pass').scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (!S.depart) setTimeout(function () { $('fd-depart').focus(); }, 500);
      });
    });
  }

  /* If someone has been here before, offer the way back to their trips. */
  function renderRecent() {
    var list = localList();
    var box = $('fd-recent');
    if (!box || !list.length) return;
    box.style.display = '';
    box.innerHTML = '<div class="fd-lab" style="margin-bottom:9px">Your recent requests</div>' +
      '<div class="fd-chips">' + list.slice(0, 4).map(function (x) {
        return '<button type="button" class="fd-chip" data-ref="' + esc(x.ref) + '">' +
               esc(x.ref) + ' &middot; ' + esc(x.summary || '') + '</button>';
      }).join('') + '</div>';
    $$('[data-ref]', box).forEach(function (b) {
      b.addEventListener('click', function () {
        showStatus(b.dataset.ref, tokenFor(b.dataset.ref));
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════════════
     BOOT
  ══════════════════════════════════════════════════════════════════════ */

  function bindForm() {
    $('fd-o-btn').addEventListener('click', function () { openPicker('origin'); });
    $('fd-d-btn').addEventListener('click', function () { openPicker('dest'); });
    $('fd-swap').addEventListener('click', swapPorts);

    $$('#fd-trip button').forEach(function (b) {
      b.addEventListener('click', function () { setTrip(b.dataset.trip); });
    });

    var dep = $('fd-depart'), ret = $('fd-return');
    dep.min = todayISO(0);
    ret.min = todayISO(0);
    dep.addEventListener('change', function () {
      S.depart = dep.value;
      ret.min = dep.value || todayISO(0);
      /* A return before the departure is a typo, not a preference. */
      if (S.ret && S.ret < S.depart) { S.ret = ''; ret.value = ''; }
      validate();
    });
    ret.addEventListener('change', function () { S.ret = ret.value; validate(); });

    ['adults', 'children', 'infants'].forEach(function (k) {
      $('fd-dec-' + k).addEventListener('click', function () { stepper(k, -1); });
      $('fd-inc-' + k).addEventListener('click', function () { stepper(k, 1); });
    });

    chipGroup('#fd-cabin .fd-chip', 'cabin');
    chipGroup('#fd-flex .fd-chip', 'flex');
    chipGroup('#fd-channel .fd-chip', 'channel');

    $('fd-bags').addEventListener('change', function () { S.bags = Number(this.value); });

    ['fd-name', 'fd-email', 'fd-phone', 'fd-notes', 'fd-budget', 'fd-stops'].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener('input', readContact);
    });

    var more = $('fd-more');
    more.addEventListener('click', function () {
      var open = more.getAttribute('aria-expanded') === 'true';
      more.setAttribute('aria-expanded', String(!open));
      $('fd-fold').classList.toggle('is-open', !open);
      $('fd-more-label').textContent = open ? 'More options' : 'Fewer options';
    });

    $('fd-submit').addEventListener('click', submit);

    /* picker */
    /* country calling code */
    $('fd-cc-btn').addEventListener('click', openCC);
    $('fd-cc-close').addEventListener('click', closeCC);
    $('fd-cc-sheet').addEventListener('click', function (e) {
      if (e.target === $('fd-cc-sheet')) closeCC();
    });
    var cci = $('fd-cc-in');
    cci.addEventListener('input', function () {
      var D = dialData();
      if (D) renderCC(D.find(cci.value, 14));
    });
    cci.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); highlightCC(ccIndex + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); highlightCC(ccIndex - 1); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        var a = $$('.fd-opt', $('fd-cc-list'))[ccIndex];
        if (a) chooseCC(a.dataset.iso);
      } else if (e.key === 'Escape') { closeCC(); }
    });
    $('fd-cc-list').addEventListener('click', function (e) {
      var b = e.target.closest('.fd-opt');
      if (b) chooseCC(b.dataset.iso);
    });

    var si = $('fd-sheet-in');
    si.addEventListener('input', function () {
      var q = si.value.trim();
      var hits = q ? atlas.search(q, 10) : defaultsFor(S.picking);
      renderPicker(hits);
      if (q.length >= 2 && hits.length < 5) dbSearch(q.toLowerCase());
    });
    si.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); highlight(pickIndex + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(pickIndex - 1); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        var a = $$('.fd-opt', $('fd-sheet-list'))[pickIndex];
        if (a) choosePort(a.dataset.iata);
      } else if (e.key === 'Escape') { closePicker(); }
    });
    $('fd-sheet-list').addEventListener('click', function (e) {
      var b = e.target.closest('.fd-opt');
      if (b) choosePort(b.dataset.iata);
    });
    $('fd-sheet').addEventListener('click', function (e) {
      if (e.target === $('fd-sheet')) closePicker();
    });
    $('fd-sheet-close').addEventListener('click', closePicker);
  }

  function boot() {
    if (!atlas) { console.warn('[flight-desk] atlas missing'); return; }

    bindForm();
    initDial();
    renderRoute();
    renderPax();
    renderPopular();
    renderRecent();
    loadDeskStatus();

    /* Sensible starting point for this market, still fully editable. */
    if (!S.origin) { S.origin = atlas.airport('NBO'); renderRoute(); }

    /* Deep link destination support (?to=MBA, ?dest=Mombasa, ?q=Dubai). */
    var p = new URLSearchParams(location.search);
    var dParam = p.get('to') || p.get('dest') || p.get('d') || p.get('q');
    if (dParam && atlas) {
      var matchApt = atlas.airport(dParam.toUpperCase());
      if (!matchApt && atlas.search) {
        var results = atlas.search(dParam, 1);
        if (results && results.length) matchApt = results[0];
      }
      if (matchApt) {
        S.dest = matchApt;
        renderRoute();
      }
    }

    /* Deep link into an existing request. */
    var ref = p.get('ref');
    if (ref) {
      showStatus(ref.toUpperCase(), p.get('t') || tokenFor(ref.toUpperCase()));
    }

    /* Coming back to the tab is the moment to check for news. */
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && S.view === 'status') loadStatus(true);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.CabanaFlights = { showStatus: showStatus, showForm: showForm, state: S,
                           fullPhone: fullPhone };
})();
