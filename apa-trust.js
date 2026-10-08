/* ═══════════════════════════════════════════════════════════════════
   APATMENTO · TRUST ENGINE  v1
   ───────────────────────────────────────────────────────────────────
   One module, four responsibilities:

     ApaTrust.match. Host cannot host; find the guest a home
     ApaTrust.deposit. Split payment; the check-in gate
     ApaTrust.issue. Arrival problems; live evidence; triage
     ApaTrust.review. Private two-way ratings

   Rules, stated once, enforced everywhere:
     · Stays cancel free up to 24h before check-in.
     · Inside 24h, guest fault → host keeps half of one night.
     · Inside 24h, host fault  → guest whole, guest moved, host carded.
     · Inside 24h a host may not use Match. That is the point of it.
     · Photos must be captured live. An upload is not evidence.

   Nothing here throws. A broken classifier must never strand a guest
   standing outside a door at midnight.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.ApaTrust) return;

  var CANCEL_WINDOW_H = 24;
  var HOST_COMMISSION = 0.30;   // of our service fee, when a Match is accepted
  var RESCUE_BASE     = 150;    // KES, ride base
  var RESCUE_PER_KM   = 60;

  function sb() {
    return (global.ApaSession && global.ApaSession.client && global.ApaSession.client()) || global.__sb || null;
  }
  function safe(fn, label, fallback) {
    try { return fn(); }
    catch (e) { if (global.console) console.warn('[trust:' + (label || '?') + ']', e && e.message); return fallback; }
  }
  function toast(msg) {
    if (global.showToast) return global.showToast(msg);
    if (global.ApaChrome && global.ApaChrome.toast) return global.ApaChrome.toast(msg);
    console.log('[trust]', msg);
  }
  function money(n) { return 'KES ' + Number(n || 0).toLocaleString(); }

  /* Every server write carries a bearer token. The body states what
     the caller wants; the header states who they are. We never let
     the first stand in for the second. */
  async function post(url, body) {
    var c = sb();
    var tok = '';
    if (c) { try { tok = (await c.auth.getSession()).data.session.access_token; } catch (_) {} }
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
      body: JSON.stringify(body)
    });
  }

  /* ── Time ──────────────────────────────────────────────────────────
     Client clocks lie. We compute locally for instant UI, then let the
     server's compute_settlement() have the final word before any money
     moves. The two should agree; when they don't, the server wins.     */
  /* The 24-hour window is measured from the host's actual check-in time,
     not midnight, not noon. A 3 PM check-in that is 26 hours away gives
     the host two more hours than a noon check-in on the same calendar day.
     Pass checkinTime as 'HH:MM' (e.g. '15:00') from the listing.          */
  function hoursTo(dateStr, checkinTime) {
    if (!dateStr) return null;
    var time = checkinTime || '14:00';
    /* Nairobi is UTC+3 year-round (no DST). Listing check-in times are
       entered and shown as Nairobi wall-clock. Composing the string
       without an explicit offset let the browser apply ITS OWN
       timezone instead — a guest viewing this from London or Dubai
       would see a different "hours to check-in" than one in Nairobi,
       for the exact same booking. Pin the offset so every viewer, and
       the server, compute the same instant. */
    var combined = dateStr.length <= 10 ? dateStr + 'T' + time + ':00+03:00' : dateStr;
    return (new Date(combined).getTime() - Date.now()) / 3600000;
  }
  function phaseOf(h) {
    if (h == null) return 'unknown';
    if (h >= CANCEL_WINDOW_H) return 'pre_24h';
    if (h >= 2)  return 'within_24h';
    if (h >= -6) return 'at_checkin';
    return 'post_checkin';
  }

  /* ═══════════════════════════════════════════════════════════════
     1 · ISSUE CLASSIFIER
     A guest types "the place is filthy and nobody is answering the
     door". That is two problems, one of them critical. We rank both.
     Keyword scoring, not a black box. A host disputing a card is
     entitled to see exactly which words triggered it.
     ═══════════════════════════════════════════════════════════════ */
  var TAXONOMY = null;

  var FALLBACK_TAXONOMY = [
    { code:'not_as_listed',   label:'Not what you booked',              category:'property', fault:'host', severity:4, auto_redirect:true,  requires_photo:true,  keywords:['different','not as described','photos','misleading','smaller','wrong room','nothing like'] },
    { code:'hygiene',         label:'Hygiene / cleanliness',            category:'property', fault:'host', severity:4, auto_redirect:true,  requires_photo:true,  keywords:['dirty','filthy','smell','mould','mold','bedbugs','roaches','cockroach','stained','unclean','disgusting'] },
    { code:'no_access',       label:'Cannot get in / host unreachable', category:'access',   fault:'host', severity:5, auto_redirect:true,  requires_photo:false, keywords:['locked','no key','no answer','unreachable','nobody','no one here','cannot reach','not picking'] },
    { code:'wrong_address',   label:'Wrong or non-existent address',    category:'fraud',    fault:'host', severity:5, auto_redirect:true,  requires_photo:false, keywords:['does not exist','doesn\'t exist','wrong place','no such','empty lot','fake address','wrong address'] },
    { code:'fake_listing',    label:'Listing appears fake',             category:'fraud',    fault:'host', severity:5, auto_redirect:true,  requires_photo:true,  keywords:['fake','scam','fraud','not real','conned'] },
    { code:'occupied',        label:'Property already occupied',        category:'access',   fault:'host', severity:5, auto_redirect:true,  requires_photo:true,  keywords:['someone inside','occupied','double booked','another guest','people living'] },
    { code:'unsafe',          label:'Safety concern',                   category:'safety',   fault:'host', severity:5, auto_redirect:true,  requires_photo:true,  keywords:['unsafe','dangerous','no lock','broken door','gas leak','exposed wiring','not safe','scared'] },
    { code:'utilities',       label:'No power / water / internet',      category:'property', fault:'host', severity:3, auto_redirect:false, requires_photo:true,  keywords:['no power','no water','blackout','no wifi','no internet','no electricity'] },
    { code:'amenity_missing', label:'Promised amenity missing',         category:'property', fault:'host', severity:2, auto_redirect:false, requires_photo:true,  keywords:['no ac','no kitchen','no parking','missing','not provided','no hot water'] },
    { code:'noise',           label:'Noise or disturbance',             category:'property', fault:'host', severity:2, auto_redirect:false, requires_photo:false, keywords:['noise','loud','construction','music','party'] },
    { code:'changed_plans',   label:'My plans changed',                 category:'guest',    fault:'guest',severity:1, auto_redirect:false, requires_photo:false, keywords:['changed my mind','plans changed','cannot make it','no longer'] },
    { code:'arrived_late',    label:'I arrived outside check-in hours', category:'guest',    fault:'guest',severity:1, auto_redirect:false, requires_photo:false, keywords:['late','missed','flight delayed','delayed'] },
    { code:'other',           label:'Something else',                   category:'property', fault:'unclear', severity:3, auto_redirect:false, requires_photo:true, keywords:[] }
  ];

  function loadTaxonomy() {
    if (TAXONOMY) return Promise.resolve(TAXONOMY);
    var c = sb();
    if (!c) { TAXONOMY = FALLBACK_TAXONOMY; return Promise.resolve(TAXONOMY); }
    return c.from('issue_taxonomy').select('*').then(function (r) {
      TAXONOMY = (r.data && r.data.length) ? r.data : FALLBACK_TAXONOMY;
      return TAXONOMY;
    }).catch(function () { TAXONOMY = FALLBACK_TAXONOMY; return TAXONOMY; });
  }

  /* Free text → ranked codes. Longer phrase matches outweigh single
     words, because "no water" is a fact and "no" is noise. */
  function classify(text, taxonomy) {
    var t = String(text || '').toLowerCase();
    if (!t.trim()) return [];
    var out = [];

    (taxonomy || FALLBACK_TAXONOMY).forEach(function (row) {
      var kws = row.keywords || [];
      var hits = 0, weight = 0;
      kws.forEach(function (k) {
        if (!k) return;
        if (t.indexOf(String(k).toLowerCase()) !== -1) {
          hits++;
          weight += String(k).indexOf(' ') !== -1 ? 2.2 : 1;  // phrases carry more
        }
      });
      if (!hits) return;
      var conf = Math.min(0.97, (weight / (kws.length * 0.6 + 1)) + row.severity * 0.06);
      out.push({ code: row.code, label: row.label, fault: row.fault, severity: row.severity,
                 auto_redirect: row.auto_redirect, requires_photo: row.requires_photo,
                 hits: hits, confidence: Number(conf.toFixed(2)) });
    });

    // Severity breaks ties. A safety issue outranks a confident noise complaint.
    out.sort(function (a, b) {
      return (b.severity - a.severity) || (b.confidence - a.confidence);
    });
    return out;
  }

  /* ═══════════════════════════════════════════════════════════════
     2 · LIVE CAMERA CAPTURE · PHOTO AND VIDEO
     An uploaded photo proves nothing. It may be six months old and
     of another building. We open the rear camera, take the frame or
     a short clip in the app, and stamp it with time and coordinates.

     Video is the honest answer to most arrival problems: a dripping
     ceiling, a door that will not open, noise through a wall. Up to
     30 seconds, recorded here, never picked from a gallery.

     When the browser cannot open the camera (permission refused, an
     old WebView) the phone's own camera app is offered instead, via a
     capture input. That still takes a fresh picture; it is marked as
     not-in-app so the adjudicator weighs it accordingly.
     ═══════════════════════════════════════════════════════════════ */
  var MAX_CLIP_S = 30;
  function clipMime() {
    var R = global.MediaRecorder;
    if (!R || !R.isTypeSupported) return '';
    var list = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    for (var i = 0; i < list.length; i++) if (R.isTypeSupported(list[i])) return list[i];
    return '';
  }
  function canRecord() { return !!(global.MediaRecorder && clipMime()); }

  function stampGeo() {
    return new Promise(function (resolve) {
      var geo = { lat: null, lng: null };
      if (window.ApaLocation && ApaLocation.ensure) {
        ApaLocation.ensure({ reason: 'default', timeout: 4000, maxAge: 15000, requireLive: true }).then(
          function (fix) { if (fix) { geo.lat = fix.latitude; geo.lng = fix.longitude; } resolve(geo); },
          function () { resolve(geo); }
        );
      } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          function (p) { geo.lat = p.coords.latitude; geo.lng = p.coords.longitude; resolve(geo); },
          function () { resolve(geo); }, { timeout: 4000, enableHighAccuracy: true }
        );
      } else resolve(geo);
    });
  }

  /* The phone's own camera app, for when the in-app camera cannot open. */
  function captureFallback(kind) {
    return new Promise(function (resolve, reject) {
      var inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = kind === 'video' ? 'video/*' : 'image/*';
      inp.setAttribute('capture', 'environment');
      inp.style.cssText = 'position:fixed;left:-9999px;opacity:0';
      document.body.appendChild(inp);
      var done = false;
      inp.onchange = function () {
        done = true;
        var f = inp.files && inp.files[0];
        inp.remove();
        if (!f) return reject(new Error('cancelled'));
        if (kind === 'video' && f.size > 60 * 1024 * 1024) return reject(new Error('too_big'));
        stampGeo().then(function (geo) {
          var shot = { blob: f, kind: kind, mime: f.type || (kind === 'video' ? 'video/mp4' : 'image/jpeg'),
                       takenAt: new Date().toISOString(), live: false, lat: geo.lat, lng: geo.lng };
          if (kind === 'video') { shot.url = URL.createObjectURL(f); resolve(shot); }
          else {
            var r = new FileReader();
            r.onload = function () { shot.dataUrl = r.result; resolve(shot); };
            r.onerror = function () { resolve(shot); };
            r.readAsDataURL(f);
          }
        });
      };
      setTimeout(function () { if (!done && inp.isConnected) { /* still waiting for the camera app */ } }, 0);
      inp.click();
    });
  }

  function captureLive(opts) {
    opts = opts || {};
    var mode = opts.mode === 'video' && canRecord() ? 'video' : 'photo';
    return new Promise(function (resolve, reject) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return reject(new Error('camera_unavailable'));
      }

      var ov = document.createElement('div');
      ov.className = 'apa-cam';
      ov.setAttribute('role', 'dialog');
      ov.setAttribute('aria-modal', 'true');
      ov.setAttribute('aria-label', 'Camera');
      ov.innerHTML =
        '<div class="apa-cam-frame">' +
          '<video autoplay playsinline muted></video>' +
          '<div class="apa-cam-hud"><span class="apa-cam-dot"></span><span class="apa-cam-hud-t">Live · not from your gallery</span></div>' +
          '<button class="apa-cam-flip" type="button" aria-label="Switch camera">' +
            '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="apa-cam-hint">' + (opts.hint || 'Point at the problem.') + '</div>' +
        (canRecord() ? '<div class="apa-cam-modes" role="radiogroup" aria-label="Photo or video">' +
          '<button type="button" role="radio" data-mode="photo">Photo</button>' +
          '<button type="button" role="radio" data-mode="video">Video</button></div>' : '') +
        '<div class="apa-cam-bar">' +
          '<button class="apa-cam-x" type="button">Cancel</button>' +
          '<button class="apa-cam-shot" type="button" aria-label="Take photo"><i></i></button>' +
          '<span class="apa-cam-time" aria-live="polite"></span>' +
        '</div>';
      document.body.appendChild(ov);
      requestAnimationFrame(function () { ov.classList.add('open'); });

      var video = ov.querySelector('video');
      var shotBtn = ov.querySelector('.apa-cam-shot');
      var timeEl = ov.querySelector('.apa-cam-time');
      var stream = null, rec = null, chunks = [], recT = 0, recStart = 0, facing = 'environment', finished = false;

      function paintMode() {
        ov.classList.toggle('is-video', mode === 'video');
        shotBtn.setAttribute('aria-label', mode === 'video' ? (rec ? 'Stop recording' : 'Start recording') : 'Take photo');
        ov.querySelectorAll('[data-mode]').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.mode === mode)); });
        timeEl.textContent = mode === 'video' && !rec ? 'Up to ' + MAX_CLIP_S + 's' : '';
      }
      function stopStream() { if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
      function cleanup() {
        clearInterval(recT);
        stopStream();
        ov.classList.remove('open');
        setTimeout(function () { ov.remove(); }, 220);
      }
      function finish(result, err) {
        if (finished) return; finished = true;
        cleanup();
        if (err) reject(err); else resolve(result);
      }
      function open() {
        stopStream();
        navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: mode === 'video'
        }).catch(function (e) {
          /* No microphone, or it was refused: a silent clip is still evidence. */
          if (mode === 'video') return navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing } }, audio: false });
          throw e;
        }).then(function (s) {
          stream = s; video.srcObject = s;
          var p = video.play && video.play(); if (p && p.catch) p.catch(function () {});
        }).catch(function (e) { finish(null, e); });
      }

      ov.querySelectorAll('[data-mode]').forEach(function (b) {
        b.addEventListener('click', function () {
          if (rec || b.dataset.mode === mode) return;
          mode = b.dataset.mode; paintMode(); open();
        });
      });
      ov.querySelector('.apa-cam-flip').addEventListener('click', function () {
        if (rec) return;
        facing = facing === 'environment' ? 'user' : 'environment'; open();
      });
      ov.querySelector('.apa-cam-x').onclick = function () {
        if (rec) { try { rec.onstop = null; rec.stop(); } catch (e) {} rec = null; }
        finish(null, new Error('cancelled'));
      };
      document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape' && ov.isConnected) { document.removeEventListener('keydown', esc); ov.querySelector('.apa-cam-x').click(); }
      });

      function takePhoto() {
        if (!video.videoWidth) return;
        var cv = document.createElement('canvas');
        cv.width = video.videoWidth; cv.height = video.videoHeight;
        cv.getContext('2d').drawImage(video, 0, 0);
        shotBtn.disabled = true;
        stampGeo().then(function (geo) {
          cv.toBlob(function (blob) {
            finish({ blob: blob, kind: 'photo', mime: 'image/jpeg', dataUrl: cv.toDataURL('image/jpeg', 0.86),
                     takenAt: new Date().toISOString(), live: true, lat: geo.lat, lng: geo.lng });
          }, 'image/jpeg', 0.86);
        });
      }
      function startClip() {
        if (!stream) return;
        var mime = clipMime();
        try { rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 1500000 }); }
        catch (e) { try { rec = new MediaRecorder(stream); } catch (x) { rec = null; return; } }
        chunks = [];
        rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        rec.onstop = function () {
          var secs = Math.round((Date.now() - recStart) / 100) / 10;
          var type = (rec && rec.mimeType) || mime || 'video/webm';
          var blob = new Blob(chunks, { type: type.split(';')[0] });
          rec = null;
          stampGeo().then(function (geo) {
            finish({ blob: blob, kind: 'video', mime: type.split(';')[0], url: URL.createObjectURL(blob), seconds: secs,
                     takenAt: new Date(recStart).toISOString(), live: true, lat: geo.lat, lng: geo.lng });
          });
        };
        rec.start(1000);
        recStart = Date.now();
        ov.classList.add('is-rec');
        paintMode();
        recT = setInterval(function () {
          var s = Math.floor((Date.now() - recStart) / 1000);
          timeEl.textContent = '0:' + String(s).padStart(2, '0') + ' / 0:' + MAX_CLIP_S;
          if (s >= MAX_CLIP_S) stopClip();
        }, 250);
      }
      function stopClip() {
        clearInterval(recT);
        ov.classList.remove('is-rec');
        if (rec && rec.state !== 'inactive') { shotBtn.disabled = true; timeEl.textContent = 'Saving…'; rec.stop(); }
      }
      shotBtn.onclick = function () {
        if (mode === 'photo') return takePhoto();
        if (rec) stopClip(); else startClip();
      };

      paintMode();
      open();
    });
  }
  function haversineKm(a, b, c, d) {
    if ([a,b,c,d].some(function(v){ return v == null; })) return null;
    var R = 6371, r = Math.PI / 180;
    var dLat = (c - a) * r, dLng = (d - b) * r;
    var s = Math.sin(dLat/2)*Math.sin(dLat/2) +
            Math.cos(a*r)*Math.cos(c*r)*Math.sin(dLng/2)*Math.sin(dLng/2);
    return Number((2 * R * Math.asin(Math.sqrt(s))).toFixed(2));
  }

  /* The evidence bucket is private and owner-foldered: a file must sit
     under <uid>/ or storage refuses it. The old path (issues/<booking>/)
     was refused every time, so no issue photo ever reached the team.
     The stored value is the object path; the team reads it with a
     signed URL. */
  async function uploadEvidence(client, bookingId, shot, uid) {
    var ext = shot.kind === 'video' ? (/mp4/.test(shot.mime || '') ? 'mp4' : 'webm') : 'jpg';
    var path = uid + '/issues/' + bookingId + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) + '.' + ext;
    try {
      var up = await client.storage.from('evidence').upload(path, shot.blob, {
        contentType: shot.mime || (shot.kind === 'video' ? 'video/webm' : 'image/jpeg'), upsert: false
      });
      if (up.error) throw up.error;
      return path;
    } catch (e) {
      console.warn('[trust:upload]', e.message);
      return null;   // never block a distressed guest on a storage hiccup
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     3 · SETTLEMENT
     Local preview. The server recomputes before anything is paid.
     ═══════════════════════════════════════════════════════════════ */
  function previewSettlement(booking, fault) {
    var h       = hoursTo(booking.checkin_date);
    var nights  = Math.max(1, Number(booking.nights || 1));
    var nightly = Number(booking.stay_total || 0) / nights;
    var paid    = booking.payment_mode === 'deposit' && !booking.balance_paid
                    ? Number(booking.deposit_amount || 0)
                    : Number(booking.grand_total || 0);

    var refund = paid, hostPayout = 0, penalty = 0;

    if (h >= CANCEL_WINDOW_H) {
      refund = paid;
    } else if (fault === 'guest') {
      hostPayout = Math.round(nightly / 2);
      refund = Math.max(0, paid - hostPayout);
    } else if (fault === 'host') {
      refund = paid;
      penalty = Math.round(nightly / 2);
    }

    return {
      hours: h == null ? null : Number(h.toFixed(2)),
      window: phaseOf(h),
      fault: fault,
      paid: paid,
      nightly: Math.round(nightly),
      refund_amount: refund,
      host_payout: hostPayout,
      host_penalty: penalty,
      auto_redirect: fault === 'host' && h < CANCEL_WINDOW_H,
      match_allowed: h >= CANCEL_WINDOW_H
    };
  }

  /* ═══════════════════════════════════════════════════════════════
     4 · REHOMING. One system, two doors
     ───────────────────────────────────────────────────────────────
     A guest has paid for a bed on a given night and something has gone
     wrong with that bed. Rehoming is how they end up in another one
     without losing money, the night, or an argument.

       offer()   the HOST says they cannot host. Gated at 24 hours; the
                 host keeps 30% of our fee if the guest takes one of the
                 homes we find.
       request() the GUEST asks to be moved. Same machinery, started
                 from the other end, because the hosts who strand people
                 are exactly the hosts who never press the first button.

     Every number lives on the server (api/lib/_match-guest.js). This
     file is a set of doorbells — it decides nothing about money, and
     it can no longer write an offer row, which is the whole reason
     the commission on one used to be worth forging.
     ═══════════════════════════════════════════════════════════════ */
  var Match = {

    /* Called before the button is even drawn. A host inside the window
       should not see a door they cannot open. */
    async eligibility(booking) {
      var h = hoursTo(booking.checkin_date);
      if (h == null)              return { allowed:false, reason:'no_date',   hours:null };
      if (booking.cancelled_at)   return { allowed:false, reason:'cancelled', hours:h };
      if (booking.status === 'checked_in') return { allowed:false, reason:'checked_in', hours:h };
      if (h < CANCEL_WINDOW_H)    return { allowed:false, reason:'within_24h', hours:h };
      return { allowed:true, reason:'ok', hours:h };
    },

    /* Ranked comparables. Server-side scoring when available. It can
       see availability and every host's standing. Client fallback keeps
       the feature alive when the RPC is missing. */
    async candidates(bookingId, limit) {
      var c = sb(); if (!c) return [];
      var r = await c.rpc('find_match_candidates', { p_booking: bookingId, p_limit: limit || 6 });
      if (!r.error && r.data) return r.data;
      console.warn('[trust:match] rpc unavailable, falling back');
      return await Match._clientRank(bookingId, limit || 6);
    },

    async _clientRank(bookingId, limit) {
      var c = sb();
      var bk = (await c.from('apartment_bookings').select('*').eq('id', bookingId).single()).data;
      if (!bk) return [];
      var src = (await c.from('listings').select('*').eq('id', bk.apartment_id).single()).data;
      if (!src) return [];

      var lo = src.price_night * 0.75, hi = src.price_night * 1.25;
      var pool = (await c.from('listings').select('*')
        .eq('status','active').neq('id', src.id).neq('type','room')
        .gte('price_night', lo).lte('price_night', hi)
        .gte('max_guests', bk.num_guests || 1).limit(60)).data || [];

      return pool.map(function (l) {
        var priceScore = 35 * Math.max(0, 1 - Math.abs(l.price_night - src.price_night) / (src.price_night || 1));
        var locScore   = 25 * (l.city === src.city ? 1 : 0.35);
        var capScore   = 15 * (l.max_guests >= (bk.num_guests||1)
                              ? Math.max(0, 1 - (l.max_guests - (bk.num_guests||1)) / 6) : 0);
        var typeScore  = 13 * (l.property_type === src.property_type ? 1 : 0);
        var bedScore   = 7  * (src.beds == null || l.beds == null ? 0.5
                              : Math.max(0, 1 - Math.abs(l.beds - src.beds) / 4));
        var qualScore  = 5  * ((l.internal_score == null ? 50 : l.internal_score) / 100);
        return Object.assign({}, l, {
          listing_id: l.id,
          price_delta: Number((l.price_night - src.price_night).toFixed(2)),
          distance_km: haversineKm(src.lat, src.lng, l.lat, l.lng),
          score: Number((priceScore+locScore+capScore+typeScore+bedScore+qualScore).toFixed(2))
        });
      }).sort(function (a,b) { return b.score - a.score; }).slice(0, limit);
    },

    /* Host presses "I can't host this booking".
       ─────────────────────────────────────────────────────────────
       This used to build the offer here, in the browser, and INSERT it
       straight into match_offers. Two things were wrong with that, and
       both were expensive:

         · `service_fee` on that row decides the host's 30% commission,
           and `candidates` decides which listings the platform will
           absorb a price gap to. Both were written by the client. A
           host could name their own commission and their own list.
         · RLS cannot call match_allowed(), so the 24-hour gate — the
           one law of this whole feature — was enforced only by the
           browser that wanted to get past it.

       The row is now written by the server, which reads every number
       off the booking and the listing itself. The RLS policy that
       allowed the old insert is gone, so this is not merely the
       preferred path: it is the only one that works. */
    async offer(bookingId, reason) {
      var res = await post('/api/match-guest',
        { action: 'offer', booking_id: bookingId, reason: reason || null });
      var j = await res.json();
      if (!res.ok && !j.blocked) throw new Error(j.error || 'match_offer_failed');
      return j;
    },

    /* ── The guest's own door ──────────────────────────────────────
       "Find me another home". The same machinery, started from the
       other end, because the hosts who strand people are exactly the
       hosts who never press the button above.

       The server decides everything that matters: whether this booking
       can move at all, whose fault it is, and therefore what it costs.
       `reason` is recorded and read by a person; it never sets terms.
       See api/lib/_match-guest.js for the policy in full. */
    async request(bookingId, reason) {
      var res = await post('/api/match-guest',
        { action: 'guest-request', booking_id: bookingId, reason: reason || null });
      var j = await res.json();
      if (!res.ok) { var e = new Error(j.error || 'rehome_request_failed'); e.detail = j; throw e; }
      return j;
    },

    /* A host who already knows where the guest should go — their own
       other property, a friend's, anyone's on the platform — shares it
       directly rather than waiting on the sweep. Same 24-hour gate,
       same server-side arithmetic; see api/lib/_match-guest.js for why
       sharing your OWN listing here earns no commission while sharing
       someone else's earns the same 10% as an automatic match. */
    async offerDirect(bookingId, listingId, reason) {
      var res = await post('/api/match-guest',
        { action: 'offer-direct', booking_id: bookingId, listing_id: listingId, reason: reason || null });
      var j = await res.json();
      if (!res.ok && !j.blocked) throw new Error(j.error || 'direct_share_failed');
      return j;
    },

    /* What the guest's screen asks before drawing the button, so nobody
       is offered a door that will not open. */
    async guestEligibility(bookingId) {
      var res = await post('/api/match-guest',
        { action: 'eligibility', booking_id: bookingId });
      var j = await res.json();
      if (!res.ok) throw new Error(j.error || 'eligibility_failed');
      return j;
    },

    /* Guest accepts one. Money moves on the server, from the booking
       and the listing — never from the offer row. A guest who is being
       moved through no fault of their own pays exactly what they
       already agreed, and the commission (30% of our fee) is paid only
       when it was the host who opened the door. */
    async accept(offerId, listingId) {
      var res = await post('/api/match-guest', { action:'accept', offer_id: offerId, listing_id: listingId });
      var j = await res.json();
      if (!res.ok) throw new Error(j.error || 'match_accept_failed');
      return j;
    },

    /* Guest says no.
       Through the host's door that means the stay is over either way,
       so it is a full refund. Through the guest's own door it means
       "I looked and I'll stay put" — the shortlist closes and their
       booking is untouched. The server knows which; the response says
       so in `booking_unchanged`, and the UI must not assume. */
    async decline(offerId) {
      var res = await post('/api/match-guest', { action:'decline', offer_id: offerId });
      var j = await res.json();
      if (!res.ok) throw new Error(j.error || 'match_decline_failed');
      return j;
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     5 · DEPOSIT. Pay part now, the rest before you hold the keys
     ═══════════════════════════════════════════════════════════════ */
  var Deposit = {
    /* Deposit rules:
       1 night  → half of that night (50%)
       2+ nights → 25% of grand total
       Always at least 1 KES; never more than the full amount.    */
    depositPct: function (nights) { return nights <= 1 ? 0.50 : 0.25; },

    split: function (grandTotal, nights) {
      var pct = Deposit.depositPct(nights || 1);
      var deposit = Math.round(grandTotal * pct);
      return { deposit: deposit, balance: Math.max(0, grandTotal - deposit), pct: pct };
    },

    /* The gate. Everything else in the check-in UI defers to this. */
    canCheckIn: function (booking) {
      if (!booking) return { ok:false, reason:'no_booking' };
      if (booking.cancelled_at) return { ok:false, reason:'cancelled' };
      if (booking.payment_mode === 'deposit' && !booking.balance_paid) {
        return { ok:false, reason:'balance_due', amount: Number(booking.balance_amount || 0) };
      }
      if (!['paid_pending_checkin','deposit_paid'].includes(booking.status)) {
        return { ok:false, reason:'not_paid' };
      }
      return { ok:true };
    },

    /* Guest settles on arrival. Only then does the host code do anything. */
    payBalance: function (booking, onDone) {
      var gate = Deposit.canCheckIn(booking);
      if (gate.ok) { toast('Nothing left to pay.'); return; }
      if (gate.reason !== 'balance_due') { toast('This booking is not payable.'); return; }

      var ref = 'BAL-' + booking.id.slice(0, 8) + '-' + Date.now();
      var c = sb();

      c.from('apartment_bookings').update({ balance_reference: ref }).eq('id', booking.id)
       .then(function () {
        global.ApatmentoPay.start({
          amount: gate.amount,
          phone: booking.contact_phone,
          reference: ref,
          table: 'apartment_bookings',
          description: 'Balance · ' + (booking.apartment_name || 'your stay'),
          onSuccess: async function () {
            await post('/api/deposit-balance', { booking_id: booking.id, reference: ref }).catch(function(){});
            toast('Paid in full. You can now confirm check-in.');
            if (onDone) onDone();
          },
          onFailure: function () { toast('Balance not settled. Check-in stays locked.'); }
        });
      });
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     6 · ISSUE, "Can't stay here"
     ═══════════════════════════════════════════════════════════════ */
  var Issue = {
    classify: classify,
    captureLive: captureLive,
    taxonomy: loadTaxonomy,

    /* Open the sheet. It reads the clock and changes what it offers:
       two days out this is a cancellation; standing at the door it is
       a rescue. */
    async open(booking, onResolved) {
      var tax = await loadTaxonomy();
      var h   = hoursTo(booking.checkin_date);
      var ph  = phaseOf(h);

      var media = [];          // { kind, blob, dataUrl|url, live, ... } · up to 4 photos and 1 clip
      var picked = null;
      var MAX_PHOTOS = 4;

      var relevant = tax.filter(function (t) {
        if (ph === 'pre_24h' || ph === 'within_24h') return t.category !== 'access' || t.code === 'no_access';
        return true;
      });

      var sheet = document.createElement('div');
      sheet.className = 'apa-issue';
      sheet.innerHTML =
        '<div class="apa-issue-card">' +
          '<button class="apa-issue-x" type="button" aria-label="Close">&times;</button>' +
          '<div class="apa-issue-head">' +
            '<div class="apa-issue-title">Can\'t stay here?</div>' +
            '<div class="apa-issue-sub">' + Issue._contextLine(ph, h) + '</div>' +
          '</div>' +
          '<div class="apa-issue-body">' +
            '<label class="apa-issue-lbl">Tell us in your own words</label>' +
            '<textarea class="apa-issue-text" rows="3" placeholder="e.g. The photos showed a one-bedroom but this is a shared room, and it hasn\'t been cleaned."></textarea>' +
            '<div class="apa-issue-suggest" hidden></div>' +
            '<label class="apa-issue-lbl">Or pick what fits</label>' +
            '<div class="apa-issue-grid">' +
              relevant.map(function (t) {
                return '<button class="apa-issue-chip" type="button" data-code="' + t.code + '" ' +
                       'data-fault="' + t.fault + '" data-photo="' + !!t.requires_photo + '" ' +
                       'data-sev="' + t.severity + '">' +
                       '<span class="apa-issue-chip-dot sev-' + t.severity + '"></span>' + t.label +
                       '</button>';
              }).join('') +
            '</div>' +
            '<div class="apa-issue-photo" hidden>' +
              '<div class="apa-issue-lbl apa-issue-ev-t">Show us</div>' +
              '<div class="apa-issue-photo-sub">Taken now, in the app. Gallery uploads aren\'t accepted as evidence.</div>' +
              '<div class="apa-issue-ev-btns">' +
                '<button class="apa-issue-cam" type="button" data-kind="photo">' +
                  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>' +
                  '<span class="apa-issue-cam-t"><span>Take a photo</span><small>Live, in the app</small></span></button>' +
                '<button class="apa-issue-cam" type="button" data-kind="video">' +
                  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="m16 10 5-3v10l-5-3z"/></svg>' +
                  '<span class="apa-issue-cam-t"><span>Record a video</span><small>Up to ' + MAX_CLIP_S + ' seconds</small></span></button>' +
              '</div>' +
              '<div class="apa-issue-ev-alt" hidden></div>' +
              '<div class="apa-issue-ev" aria-live="polite"></div>' +
            '</div>' +
            /* Only shown once a host-fault, auto-redirect issue is
               picked — the one case where we would otherwise move them
               automatically. Unchecked by default: being moved is the
               faster fix for most people. This never appears, and
               never matters, for anything we would not have redirected
               anyway. */
            '<label class="apa-issue-refund-pref" hidden>' +
              '<input type="checkbox" class="apa-issue-refund-cb"/>' +
              '<span><b>I\'d rather have a refund than be moved.</b> If this turns out to be your ' +
              'host\'s fault, refund me instead of finding me somewhere else to stay.</span>' +
            '</label>' +
            '<div class="apa-issue-outcome" hidden></div>' +
          '</div>' +
          '<div class="apa-issue-foot">' +
            '<button class="apa-issue-cancel" type="button">Back</button>' +
            '<button class="apa-issue-go" type="button" disabled>Continue</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(sheet);
      requestAnimationFrame(function(){ sheet.classList.add('open'); });

      var $ = function (s) { return sheet.querySelector(s); };
      var close = function () {
        sheet.classList.remove('open');
        media.forEach(function (m) { if (m.url) try { URL.revokeObjectURL(m.url); } catch (e) {} });
        setTimeout(function(){ sheet.remove(); }, 240);
      };
      $('.apa-issue-x').onclick = close;
      $('.apa-issue-cancel').onclick = close;

      function refresh() {
        var needPhoto = !!(picked && picked.requires_photo);
        /* Evidence is offered for every issue and required where the
           taxonomy says so. Even where it is optional, a clip or photo
           is what lets us decide in minutes rather than hours. */
        $('.apa-issue-photo').hidden = !picked;
        $('.apa-issue-photo').classList.toggle('is-required', needPhoto);
        $('.apa-issue-ev-t').textContent = needPhoto ? 'A live photo or video is needed' : 'Add a photo or video · optional';
        paintEvidence();

        /* The choice only makes sense where it would otherwise change
           anything: a host-fault issue we would auto-redirect, and
           only once we are past the point of a clean pre-24h refund
           (that path refunds regardless, redirect or not). */
        var showPref = picked && picked.fault === 'host' && picked.auto_redirect
          && previewSettlement(booking, picked.fault).window !== 'pre_24h';
        var prefEl = $('.apa-issue-refund-pref');
        prefEl.hidden = !showPref;
        if (!showPref) $('.apa-issue-refund-cb').checked = false;

        $('.apa-issue-go').disabled = !picked || (needPhoto && !media.length);

        if (!picked) { $('.apa-issue-outcome').hidden = true; return; }

        var s = previewSettlement(booking, picked.fault);
        var lines = [];
        var preferRefund = showPref && $('.apa-issue-refund-cb').checked;

        if (s.window === 'pre_24h') {
          lines.push(['Refund to you', money(s.refund_amount), 'good']);
          lines.push(['Cancelling more than 24 hours out. Nothing withheld.', '', 'note']);
        } else if (picked.fault === 'host') {
          lines.push(['Refund to you', money(s.refund_amount), 'good']);
          if (picked.auto_redirect && !preferRefund) {
            lines.push(['We will arrange alternative accommodation for you immediately.', '', 'note']);
          } else if (picked.auto_redirect && preferRefund) {
            lines.push(['You asked for a refund instead — we won\'t book you anywhere else.', '', 'note']);
          }
        } else if (picked.fault === 'guest') {
          lines.push(['Refund to you', money(s.refund_amount), '']);
          lines.push(['Retained by host', money(s.host_payout), 'warn']);
          lines.push(['Inside 24 hours the host keeps half of one night.', '', 'note']);
        } else {
          lines.push(['Held for review', money(s.paid), '']);
          lines.push([media.some(function (m) { return m.kind === 'video'; }) ? 'We\'ll look at your video and decide within the hour.'
            : 'We\'ll look at what you\'ve shown us and decide within the hour.', '', 'note']);
        }

        $('.apa-issue-outcome').hidden = false;
        $('.apa-issue-outcome').innerHTML =
          '<div class="apa-issue-outcome-t">What happens next</div>' +
          lines.map(function (l) {
            return l[1]
              ? '<div class="apa-issue-row ' + l[2] + '"><span>' + l[0] + '</span><b>' + l[1] + '</b></div>'
              : '<div class="apa-issue-note ' + l[2] + '">' + l[0] + '</div>';
          }).join('');

        $('.apa-issue-go').textContent = !picked.auto_redirect || s.window === 'pre_24h' ? 'Submit'
          : preferRefund ? 'Refund me' : 'Move me now';
      }

      function select(code) {
        picked = tax.find(function (t) { return t.code === code; }) || null;
        sheet.querySelectorAll('.apa-issue-chip').forEach(function (b) {
          b.classList.toggle('on', b.dataset.code === code);
        });
        refresh();
      }

      sheet.querySelectorAll('.apa-issue-chip').forEach(function (b) {
        b.onclick = function () { select(b.dataset.code); };
      });

      $('.apa-issue-refund-cb').onchange = refresh;

      // Live suggestion as they type. We show our reasoning, not a verdict.
      var ta = $('.apa-issue-text'), tmr = null;
      ta.oninput = function () {
        clearTimeout(tmr);
        tmr = setTimeout(function () {
          var ranked = classify(ta.value, tax);
          var box = $('.apa-issue-suggest');
          if (!ranked.length) { box.hidden = true; return; }
          box.hidden = false;
          box.innerHTML = '<span class="apa-issue-suggest-l">Sounds like</span>' +
            ranked.slice(0, 3).map(function (r) {
              return '<button type="button" class="apa-issue-sg" data-code="' + r.code + '">' +
                     r.label + '<i>' + Math.round(r.confidence * 100) + '%</i></button>';
            }).join('');
          box.querySelectorAll('.apa-issue-sg').forEach(function (b) {
            b.onclick = function () { select(b.dataset.code); };
          });
        }, 220);
      };

      /* ── evidence: photos and one clip ─────────────────────────── */
      function photos() { return media.filter(function (m) { return m.kind === 'photo'; }); }
      function clip() { return media.filter(function (m) { return m.kind === 'video'; })[0] || null; }
      function addShot(shotIn) {
        if (shotIn.kind === 'video') {
          var old = clip(); if (old) { drop(media.indexOf(old)); }
        } else if (photos().length >= MAX_PHOTOS) {
          drop(media.indexOf(photos()[0]));
        }
        media.push(shotIn);
        $('.apa-issue-ev-alt').hidden = true;
        refresh();
      }
      function drop(i) {
        var m = media[i]; if (!m) return;
        if (m.url) try { URL.revokeObjectURL(m.url); } catch (e) {}
        media.splice(i, 1);
      }
      function paintEvidence() {
        var box = $('.apa-issue-ev');
        var p = photos().length, v = clip();
        sheet.querySelector('.apa-issue-cam[data-kind="photo"] .apa-issue-cam-t span').textContent = p ? (p >= MAX_PHOTOS ? 'Replace a photo' : 'Another photo') : 'Take a photo';
        sheet.querySelector('.apa-issue-cam[data-kind="photo"] small').textContent = p ? p + ' of ' + MAX_PHOTOS + ' taken' : 'Live, in the app';
        sheet.querySelector('.apa-issue-cam[data-kind="video"] .apa-issue-cam-t span').textContent = v ? 'Record again' : 'Record a video';
        sheet.querySelector('.apa-issue-cam[data-kind="video"] small').textContent = v ? 'Replaces this clip' : 'Up to ' + MAX_CLIP_S + ' seconds';
        box.innerHTML = media.map(function (m, i) {
          var tag = m.live ? 'Live' : 'Phone camera';
          return '<figure class="apa-issue-ev-item' + (m.kind === 'video' ? ' is-video' : '') + '">' +
            (m.kind === 'video'
              ? '<video src="' + m.url + '" muted playsinline preload="metadata"></video>' +
                '<button type="button" class="apa-issue-ev-play" aria-label="Play this video"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg></button>' +
                (m.seconds ? '<span class="apa-issue-ev-dur">' + Math.max(1, Math.round(m.seconds)) + 's</span>' : '')
              : '<img src="' + (m.dataUrl || '') + '" alt="Photo ' + (i + 1) + '"/>') +
            '<figcaption>' + tag + '</figcaption>' +
            '<button type="button" class="apa-issue-ev-x" data-i="' + i + '" aria-label="Remove this ' + (m.kind === 'video' ? 'video' : 'photo') + '">&times;</button>' +
          '</figure>';
        }).join('');
        box.querySelectorAll('.apa-issue-ev-x').forEach(function (b) {
          b.onclick = function () { drop(+b.dataset.i); refresh(); };
        });
        /* A quick look back at the clip before sending it, with sound. */
        box.querySelectorAll('.apa-issue-ev-play').forEach(function (b) {
          var fig = b.parentNode, vid = fig.querySelector('video');
          function paint() { fig.classList.toggle('is-playing', !vid.paused); b.setAttribute('aria-label', vid.paused ? 'Play this video' : 'Pause this video'); }
          b.onclick = function () {
            if (vid.paused) { vid.muted = false; var pr = vid.play(); if (pr && pr.catch) pr.catch(function () {}); } else vid.pause();
          };
          vid.onplay = vid.onpause = vid.onended = paint;
        });
      }
      /* The in-app camera could not open (permission refused, an older
         WebView, no camera on this device). Offer the phone's own camera
         app, on a fresh tap so the browser allows it to open. */
      function offerFallback(kind, err) {
        var alt = $('.apa-issue-ev-alt');
        var denied = err && /NotAllowed|Permission|denied/i.test((err.name || '') + ' ' + (err.message || ''));
        alt.hidden = false;
        alt.innerHTML = '<span>' + (denied ? 'Camera access is off for this site.' : 'We couldn\'t open the camera here.') +
          ' Use your phone\'s camera instead.</span>' +
          '<button type="button" class="apa-issue-ev-alt-go">' + (kind === 'video' ? 'Open video camera' : 'Open camera') + '</button>';
        alt.querySelector('.apa-issue-ev-alt-go').onclick = function () {
          captureFallback(kind).then(addShot, function (e) {
            if (e && e.message === 'too_big') toast('That clip is too long. Keep it under ' + MAX_CLIP_S + ' seconds.');
          });
        };
      }
      sheet.querySelectorAll('.apa-issue-cam').forEach(function (b) {
        b.onclick = async function () {
          var kind = b.dataset.kind;
          var hint = picked ? picked.label + (kind === 'video' ? ' · show it as it happens.' : '') : 'Show us the problem.';
          /* No recorder in this browser: the phone's camera app records instead. */
          if (kind === 'video' && !canRecord()) {
            try { addShot(await captureFallback('video')); }
            catch (e) { if (e && e.message === 'too_big') toast('That clip is too long. Keep it under ' + MAX_CLIP_S + ' seconds.'); }
            return;
          }
          try {
            addShot(await captureLive({ mode: kind, hint: hint }));
          } catch (e) {
            if (e && e.message === 'cancelled') return;
            offerFallback(kind, e);
          }
        };
      });

      $('.apa-issue-go').onclick = async function () {
        var btn = this; btn.disabled = true; btn.textContent = 'Working…';
        try {
          var r = await Issue.submit(booking, {
            code: picked.code, freeText: ta.value.trim(), media: media.slice(),
            inferred: classify(ta.value, tax).slice(0, 3),
            preferRefund: !$('.apa-issue-refund-pref').hidden && $('.apa-issue-refund-cb').checked
          });
          close();
          Issue._outcomeToast(r);
          if (onResolved) onResolved(r);
        } catch (e) {
          btn.disabled = false; btn.textContent = 'Submit';
          toast(e.message === 'offline' ? 'You appear to be offline.' : 'Something went wrong. Try again.');
        }
      };
    },

    _contextLine: function (phase, h) {
      if (phase === 'pre_24h')
        return 'You\'re ' + Math.floor(h / 24) + '+ day' + (h >= 48 ? 's' : '') +
               ' from check-in. Cancel now and you\'re refunded in full.';
      if (phase === 'within_24h')
        return 'Check-in is in ' + Math.max(1, Math.round(h)) + ' hour' + (Math.round(h) === 1 ? '' : 's') +
               '. What we do next depends on what\'s wrong, and whose fault it is.';
      if (phase === 'at_checkin')
        return 'You should be arriving now. If the property isn\'t right, we\'ll move you.';
      return 'Your stay has begun. Tell us what happened.';
    },

    _outcomeToast: function (r) {
      if (r.redirect)   return toast('We\'re arranging alternative accommodation. Our team will contact you shortly.');
      if (r.refunded)   return toast('Refunded ' + money(r.refund_amount) + '. It\'s on its way back to you.');
      if (r.held)       return toast('Received. We\'re reviewing what you sent now.');
      toast('Reported. We\'ll be in touch shortly.');
    },

    /* The write. Evidence first, then the server decides. */
    async submit(booking, payload) {
      var c = sb(); if (!c) throw new Error('offline');

      var items = (payload.media || (payload.shot ? [payload.shot] : [])).filter(function (m) { return m && m.blob; });
      var uid = null;
      if (items.length) {
        try { uid = ((await c.auth.getUser()).data.user || {}).id || null; } catch (e) { uid = null; }
      }
      var stored = [];
      if (uid) {
        /* In parallel: a 30-second clip and three photos on a weak signal
           should not take four round trips in a row. */
        var paths = await Promise.all(items.map(function (m) { return uploadEvidence(c, booking.id, m, uid); }));
        items.forEach(function (m, i) {
          if (paths[i]) stored.push({ kind: m.kind, path: paths[i], live: !!m.live, taken_at: m.takenAt || null,
                                      seconds: m.seconds || null, lat: m.lat, lng: m.lng });
        });
      }
      var firstPhoto = stored.filter(function (m) { return m.kind === 'photo'; })[0] || null;
      var theClip = stored.filter(function (m) { return m.kind === 'video'; })[0] || null;
      var located = items.filter(function (m) { return m.lat != null && m.lng != null; })[0] || {};
      var lat = located.lat == null ? null : located.lat;
      var lng = located.lng == null ? null : located.lng;
      var takenAt = (firstPhoto && firstPhoto.taken_at) || (theClip && theClip.taken_at) || null;
      var dist = null;

      var listing = (await c.from('listings').select('latitude,longitude,lat,lng,host_id')
                       .eq('id', booking.apartment_id).maybeSingle()).data;
      if (listing) dist = haversineKm(lat, lng, listing.latitude != null ? listing.latitude : listing.lat,
                                      listing.longitude != null ? listing.longitude : listing.lng);

      var h = hoursTo(booking.checkin_date);
      var tax = await loadTaxonomy();
      var row = tax.find(function (t) { return t.code === payload.code; }) || {};

      var row0 = {
        booking_id: booking.id,
        guest_id: booking.guest_id,
        host_id: booking.host_id || (listing && listing.host_id) || null,
        listing_id: booking.apartment_id,
        issue_code: payload.code,
        free_text: payload.freeText || null,
        inferred_codes: payload.inferred || [],
        confidence: (payload.inferred && payload.inferred[0]) ? payload.inferred[0].confidence : 0,
        photo_url: firstPhoto ? firstPhoto.path : null,
        photo_live: !!(firstPhoto && stored.filter(function (m) { return m.kind === 'photo'; }).every(function (m) { return m.live; })),
        photo_taken_at: takenAt,
        geo_lat: lat, geo_lng: lng, geo_distance_m: dist == null ? null : dist * 1000,
        window_phase: phaseOf(h),
        hours_to_checkin: h == null ? null : Number(h.toFixed(2)),
        fault: row.fault || 'unclear',
        status: 'open',
        /* Stated now, before anyone knows whose fault this is. It
           changes nothing about fault or about what a guest at fault
           owes — it only tells the adjudicator not to auto-redirect
           THIS guest if the host turns out to be the one who caused it. */
        prefer_refund: !!payload.preferRefund,
        video_url: theClip ? theClip.path : null,
        video_live: !!(theClip && theClip.live),
        video_seconds: theClip ? theClip.seconds : null,
        media: stored
      };
      var ins = await c.from('checkin_issues').insert(row0).select().single();
      /* Before the video columns exist the report must still go through:
         the first photo is kept, the clip waits in storage for the team. */
      if (ins.error && /PGRST204|42703/.test(String(ins.error.code || '') + ' ' + String(ins.error.message || ''))) {
        var row1 = Object.assign({}, row0);
        delete row1.video_url; delete row1.video_live; delete row1.video_seconds; delete row1.media;
        if (!row1.photo_url && theClip) { row1.photo_url = theClip.path; row1.photo_live = !!theClip.live; }
        ins = await c.from('checkin_issues').insert(row1).select().single();
      }
      if (ins.error) throw ins.error;

      // Server adjudicates: refunds, cards, redirect, rescue ride, float.
      var res = await post('/api/checkin-issue', { issue_id: ins.data.id, booking_id: booking.id });
      var j = await res.json();
      if (!res.ok) throw new Error(j.error || 'adjudication_failed');
      return j;
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     7 · PRIVATE REVIEWS
     Both sides write blind. Both are revealed together, to each other
     and to us, never to the public. The rating still moves the listing.
     ═══════════════════════════════════════════════════════════════ */
  var Review = {
    async submit(booking, direction, data) {
      var c = sb(); if (!c) throw new Error('offline');
      var me = (await c.auth.getUser()).data.user;
      var subject = direction === 'guest_to_host' ? booking.host_id : booking.guest_id;

      var ins = await c.from('private_reviews').insert({
        booking_id: booking.id,
        listing_id: booking.apartment_id,
        author_id: me.id,
        subject_id: subject,
        direction: direction,
        rating: data.rating,
        cleanliness: data.cleanliness || null,
        accuracy: data.accuracy || null,
        communication: data.communication || null,
        value_rating: data.value || null,
        body: data.body || null
      }).select().single();
      if (ins.error) throw ins.error;

      await c.rpc('try_reveal_reviews', { p_booking: booking.id }).catch(function(){});
      return ins.data;
    },

    /* Only what the caller is entitled to see. RLS is the real guard;
       this is the polite version of it. */
    async forBooking(bookingId) {
      var c = sb(); if (!c) return [];
      var r = await c.from('private_reviews').select('*').eq('booking_id', bookingId);
      return r.data || [];
    },

    async pending(userId) {
      var c = sb(); if (!c) return [];
      var b = await c.from('apartment_bookings').select('*')
                .or('guest_id.eq.' + userId + ',host_id.eq.' + userId)
                .in('status', ['checked_in', 'completed'])
                .is('cancelled_at', null)
                .gte('checkout_date', new Date(Date.now() - 30 * 864e5).toISOString().slice(0,10));
      var rows = b.data || [];
      if (!rows.length) return [];
      var ids = rows.map(function (x) { return x.id; });
      var mine = (await c.from('private_reviews').select('booking_id')
                    .in('booking_id', ids).eq('author_id', userId)).data || [];
      var done = new Set(mine.map(function (x) { return x.booking_id; }));
      return rows.filter(function (x) { return !done.has(x.id); });
    }
  };

  /* ── notifications ─────────────────────────────────────────────── */
  async function notify(userId, kind, title, body, meta) {
    if (!userId) return;
    var c = sb(); if (!c) return;
    await safe(function () {
      return c.from('notifications').insert({
        user_id: userId, kind: kind, title: title, body: body, meta: meta || {}
      });
    }, 'notify');
    await fetch('/api/push-send', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ user_id: userId, title: title, body: body, url: '/my-bookings.html' })
    }).catch(function(){});
  }

  /* ── styles ────────────────────────────────────────────────────── */
  var css = document.createElement('style');
  css.textContent = [
    '.apa-cam{position:fixed;inset:0;z-index:9999;background:#000;display:flex;flex-direction:column;',
      'opacity:0;transition:opacity .2s}.apa-cam.open{opacity:1}',
    '.apa-cam-frame{flex:1;position:relative;overflow:hidden}',
    '.apa-cam-frame video{width:100%;height:100%;object-fit:cover}',
    '.apa-cam-hud{position:absolute;top:16px;left:50%;transform:translateX(-50%);display:flex;align-items:center;',
      'gap:7px;background:rgba(0,0,0,.55);backdrop-filter:blur(8px);color:#fff;font:600 12px/1 system-ui;',
      'padding:8px 13px;border-radius:99px}',
    '.apa-cam-dot{width:7px;height:7px;border-radius:50%;background:#ff3b30;animation:apaBlink 1.1s infinite}',
    '@keyframes apaBlink{50%{opacity:.25}}',
    '.apa-cam-hint{color:#c9ccd4;font:400 13px/1.5 system-ui;text-align:center;padding:14px 26px 4px}',
    '.apa-cam-bar{display:flex;align-items:center;justify-content:space-between;padding:14px 22px calc(24px + env(safe-area-inset-bottom))}',
    '.apa-cam-x{background:none;border:0;color:#9aa0ab;font:500 15px system-ui;width:64px;text-align:left;cursor:pointer}',
    '.apa-cam-shot{width:70px;height:70px;border-radius:50%;background:#fff;border:4px solid rgba(255,255,255,.28);',
      'background-clip:padding-box;cursor:pointer;transition:transform .1s;display:grid;place-items:center;padding:0}',
    '.apa-cam-shot:active{transform:scale(.92)}.apa-cam-shot:disabled{opacity:.5}',
    '.apa-cam-shot i{display:block;width:100%;height:100%;border-radius:50%;background:#fff;transition:all .2s cubic-bezier(.22,1,.36,1)}',
    '.apa-cam.is-video .apa-cam-shot i{background:#ff3b30;width:54px;height:54px}',
    '.apa-cam.is-rec .apa-cam-shot i{width:26px;height:26px;border-radius:7px}',
    '.apa-cam.is-rec .apa-cam-frame{box-shadow:inset 0 0 0 3px #ff3b30}',
    '.apa-cam-time{width:64px;text-align:right;color:#fff;font:600 12.5px/1.2 system-ui;font-variant-numeric:tabular-nums}',
    '.apa-cam.is-rec .apa-cam-time{color:#ff6b62}',
    '.apa-cam-flip{position:absolute;top:12px;right:14px;width:42px;height:42px;border-radius:50%;border:0;',
      'background:rgba(0,0,0,.5);backdrop-filter:blur(8px);color:#fff;display:grid;place-items:center;cursor:pointer}',
    '.apa-cam.is-rec .apa-cam-flip,.apa-cam.is-rec .apa-cam-modes{opacity:.35;pointer-events:none}',
    '.apa-cam-modes{display:flex;justify-content:center;gap:4px;margin:8px auto 0;padding:3px;border-radius:99px;',
      'background:rgba(255,255,255,.1)}',
    '.apa-cam-modes button{border:0;background:none;color:#c9ccd4;font:600 12.5px/1 system-ui;letter-spacing:.06em;',
      'text-transform:uppercase;padding:8px 16px;border-radius:99px;cursor:pointer;transition:.18s}',
    '.apa-cam-modes button[aria-checked="true"]{background:#fff;color:#0f1117}',
    '.apa-cam.is-video .apa-cam-modes button[aria-checked="true"]{color:#c4271d}',
    '@media(prefers-reduced-motion:reduce){.apa-cam-dot{animation:none}.apa-cam-shot i{transition:none}}',

    '.apa-issue{position:fixed;inset:0;z-index:960;background:rgba(12,14,20,.72);backdrop-filter:blur(7px);',
      'display:flex;align-items:flex-end;justify-content:center;opacity:0;pointer-events:none;transition:opacity .26s}',
    '@media(min-width:640px){.apa-issue{align-items:center}}',
    '.apa-issue.open{opacity:1;pointer-events:all}',
    '.apa-issue-card{width:100%;max-width:520px;max-height:92vh;overflow:auto;background:#fff;',
      'border-radius:24px 24px 0 0;transform:translateY(24px);transition:transform .3s cubic-bezier(.22,1,.36,1);position:relative}',
    '@media(min-width:640px){.apa-issue-card{border-radius:24px}}',
    '.apa-issue.open .apa-issue-card{transform:none}',
    '.apa-issue-x{position:absolute;top:14px;right:16px;background:none;border:0;font-size:26px;line-height:1;',
      'color:#9aa0ab;cursor:pointer}',
    '.apa-issue-head{padding:28px 24px 6px}',
    '.apa-issue-title{font:700 21px/1.25 system-ui;color:#0f1117;letter-spacing:-.02em}',
    '.apa-issue-sub{font:400 13.5px/1.55 system-ui;color:#666d7a;margin-top:7px;padding-right:20px}',
    '.apa-issue-body{padding:16px 24px 4px}',
    '.apa-issue-lbl{display:block;font:600 12px/1 system-ui;color:#8a909c;letter-spacing:.04em;',
      'text-transform:uppercase;margin:16px 0 9px}',
    '.apa-issue-text{width:100%;border:1.5px solid #e5e7ec;border-radius:13px;padding:12px 14px;',
      'font:400 14.5px/1.55 system-ui;resize:vertical;outline:none;transition:border-color .15s}',
    '.apa-issue-text:focus{border-color:#0D9467}',
    '.apa-issue-suggest{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:10px}',
    '.apa-issue-suggest-l{font:500 11.5px system-ui;color:#9aa0ab}',
    '.apa-issue-sg{background:#f1f8f5;border:1px solid #cfe8dd;color:#0a6d4c;border-radius:99px;',
      'padding:5px 10px;font:600 12px system-ui;cursor:pointer;display:flex;gap:5px;align-items:center}',
    '.apa-issue-sg i{font-style:normal;opacity:.55;font-weight:500}',
    '.apa-issue-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '@media(max-width:420px){.apa-issue-grid{grid-template-columns:1fr}}',
    '.apa-issue-chip{display:flex;align-items:center;gap:9px;text-align:left;background:#fafbfc;',
      'border:1.5px solid #e8eaee;border-radius:13px;padding:12px 13px;font:500 13.5px/1.3 system-ui;',
      'color:#242830;cursor:pointer;transition:.15s}',
    '.apa-issue-chip:hover{border-color:#cdd2da}',
    '.apa-issue-chip.on{border-color:#0D9467;background:#f2fbf7;color:#08322a}',
    '.apa-issue-chip-dot{width:7px;height:7px;border-radius:50%;flex:0 0 auto;background:#c9ccd4}',
    '.sev-3{background:#f0a13a}.sev-4{background:#ef6c3d}.sev-5{background:#e0473c}',
    '.apa-issue-photo{margin-top:18px;padding:15px;border:1.5px dashed #dfe2e8;border-radius:15px;background:#fcfcfd}',
    '.apa-issue-photo.is-required{border-color:#f3c9a6;background:#fffaf5}',
    '.apa-issue-photo .apa-issue-lbl{margin-top:2px}',
    '.apa-issue-photo-sub{font:400 12.5px/1.5 system-ui;color:#7c828e;margin:-4px 0 11px}',
    '.apa-issue-ev-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '.apa-issue-cam{display:flex;align-items:center;gap:10px;background:#0f1117;text-align:left;',
      'color:#fff;border:0;border-radius:12px;padding:11px 13px;font:600 13.5px/1.2 system-ui;cursor:pointer;',
      'transition:transform .12s,background .15s;min-height:54px;min-width:0}',
    '.apa-issue-cam svg{flex:0 0 auto}',
    '.apa-issue-cam-t{display:flex;flex-direction:column;gap:3px;min-width:0}',
    '.apa-issue-cam-t span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.apa-issue-cam:hover{background:#262a33}.apa-issue-cam:active{transform:scale(.97)}',
    '.apa-issue-cam[data-kind="video"]{background:#fff;color:#0f1117;box-shadow:inset 0 0 0 1.5px #dfe2e8}',
    '.apa-issue-cam[data-kind="video"]:hover{box-shadow:inset 0 0 0 1.5px #0f1117}',
    '.apa-issue-cam[data-kind="video"] svg{color:#e0473c}',
    '.apa-issue-cam small{font:500 11px/1.2 system-ui;opacity:.62;white-space:nowrap}',
    '@media(max-width:360px){.apa-issue-ev-btns{grid-template-columns:1fr}}',
    '.apa-issue-ev-alt{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;',
      'margin-top:10px;padding:10px 12px;border-radius:11px;background:#fff4ec;color:#7a3a12;font:500 12.5px/1.45 system-ui}',
    '.apa-issue-ev-alt[hidden]{display:none}',
    '.apa-issue-ev-alt-go{border:0;background:#b3541e;color:#fff;border-radius:9px;padding:8px 12px;font:600 12.5px system-ui;cursor:pointer}',
    '.apa-issue-ev{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px}',
    '.apa-issue-ev:not(:empty){margin-top:12px}',
    '.apa-issue-ev-item{position:relative;margin:0;aspect-ratio:1;border-radius:12px;overflow:hidden;background:#0f1117;',
      'animation:apaEvIn .28s cubic-bezier(.22,1,.36,1)}',
    '.apa-issue-ev-item.is-video{grid-column:span 2;aspect-ratio:auto;min-height:96px}',
    '.apa-issue-ev-item img,.apa-issue-ev-item video{width:100%;height:100%;object-fit:cover;display:block}',
    '.apa-issue-ev-item figcaption{position:absolute;left:6px;bottom:6px;pointer-events:none;background:rgba(0,0,0,.6);',
      'color:#fff;font:600 10.5px/1 system-ui;padding:4px 7px;border-radius:99px}',
    '.apa-issue-ev-dur{position:absolute;right:6px;bottom:6px;background:#e0473c;color:#fff;font:700 10.5px/1 system-ui;',
      'padding:4px 7px;border-radius:99px;pointer-events:none}',
    '.apa-issue-ev-play{position:absolute;left:50%;top:50%;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;',
      'border:0;background:rgba(255,255,255,.92);color:#0f1117;display:grid;place-items:center;cursor:pointer;padding:0 0 0 2px;',
      'box-shadow:0 6px 18px rgba(0,0,0,.3);transition:opacity .2s,transform .12s}',
    '.apa-issue-ev-play:active{transform:scale(.92)}',
    '.apa-issue-ev-item.is-playing .apa-issue-ev-play{opacity:0}',
    '.apa-issue-ev-item.is-playing:hover .apa-issue-ev-play{opacity:.85}',
    '.apa-issue-ev-x{position:absolute;top:5px;right:5px;width:26px;height:26px;border-radius:50%;border:0;',
      'background:rgba(0,0,0,.62);color:#fff;font:400 18px/1 system-ui;cursor:pointer;display:grid;place-items:center;padding:0}',
    '@keyframes apaEvIn{from{opacity:0;transform:scale(.92)}}',
    '@media(prefers-reduced-motion:reduce){.apa-issue-ev-item{animation:none}}',
    '.apa-issue-refund-pref{display:flex;gap:10px;align-items:flex-start;margin-top:16px;',
      'padding:13px 14px;border-radius:14px;border:1.5px solid #e7e2f9;background:#faf8ff;',
      'cursor:pointer}',
    '.apa-issue-refund-pref input{margin-top:2px;flex:0 0 auto;width:17px;height:17px;accent-color:#6b3fd9}',
    '.apa-issue-refund-pref span{font:400 12.5px/1.5 system-ui;color:#4a4c66}',
    '.apa-issue-refund-pref b{color:#1c1830;font-weight:650}',
    '.apa-issue-outcome{margin:18px 0 4px;background:#f7f8fa;border-radius:15px;padding:15px 16px}',
    '.apa-issue-outcome-t{font:700 12px system-ui;letter-spacing:.04em;text-transform:uppercase;',
      'color:#8a909c;margin-bottom:11px}',
    '.apa-issue-row{display:flex;justify-content:space-between;gap:12px;font:400 13.5px/1.5 system-ui;',
      'color:#3a3f49;padding:4px 0}.apa-issue-row b{font-weight:650;color:#0f1117;white-space:nowrap}',
    '.apa-issue-row.good b{color:#0a6d4c}.apa-issue-row.warn b{color:#b3541e}',
    '.apa-issue-note{font:400 12.5px/1.55 system-ui;color:#7c828e;padding:5px 0}',
    '.apa-issue-note.warn{color:#b3541e}',
    '.apa-issue-foot{position:sticky;bottom:0;display:flex;gap:10px;padding:16px 24px calc(20px + env(safe-area-inset-bottom));',
      'background:linear-gradient(180deg,rgba(255,255,255,0),#fff 26%)}',
    '.apa-issue-cancel{flex:0 0 auto;background:none;border:1.5px solid #e5e7ec;border-radius:12px;',
      'padding:13px 20px;font:600 14px system-ui;color:#555b66;cursor:pointer}',
    '.apa-issue-go{flex:1;background:#0f1117;color:#fff;border:0;border-radius:12px;padding:13px;',
      'font:650 14.5px system-ui;cursor:pointer;transition:.15s}',
    '.apa-issue-go:disabled{background:#dfe2e8;color:#a3a8b2;cursor:not-allowed}'
  ].join('');
  document.head.appendChild(css);

  /* ── public surface ────────────────────────────────────────────── */
  global.ApaTrust = {
    CANCEL_WINDOW_H: CANCEL_WINDOW_H,
    HOST_COMMISSION: HOST_COMMISSION,
    match: Match,
    deposit: Deposit,
    issue: Issue,
    review: Review,
    hoursTo: hoursTo,
    phaseOf: phaseOf,
    previewSettlement: previewSettlement,
    haversineKm: haversineKm,
    rescueFare: function (km) { return Math.round(RESCUE_BASE + RESCUE_PER_KM * (km || 0)); }
  };

})(typeof window !== 'undefined' ? window : this);
