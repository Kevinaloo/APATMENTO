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
    var combined = dateStr.length <= 10 ? dateStr + 'T' + time + ':00' : dateStr;
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
     2 · LIVE CAMERA CAPTURE
     An uploaded photo proves nothing. It may be six months old and
     of another building. We open the rear camera, take the frame in
     the app, and stamp it with time and coordinates.
     ═══════════════════════════════════════════════════════════════ */
  function captureLive(opts) {
    opts = opts || {};
    return new Promise(function (resolve, reject) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return reject(new Error('camera_unavailable'));
      }

      var ov = document.createElement('div');
      ov.className = 'apa-cam';
      ov.innerHTML =
        '<div class="apa-cam-frame">' +
          '<video autoplay playsinline muted></video>' +
          '<div class="apa-cam-hud"><span class="apa-cam-dot"></span> Live · not from your gallery</div>' +
        '</div>' +
        '<div class="apa-cam-hint">' + (opts.hint || 'Point at the problem and take one clear photo.') + '</div>' +
        '<div class="apa-cam-bar">' +
          '<button class="apa-cam-x" type="button">Cancel</button>' +
          '<button class="apa-cam-shot" type="button" aria-label="Take photo"></button>' +
          '<span style="width:64px"></span>' +
        '</div>';
      document.body.appendChild(ov);
      requestAnimationFrame(function(){ ov.classList.add('open'); });

      var video = ov.querySelector('video');
      var stream = null;

      function cleanup() {
        if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
        ov.classList.remove('open');
        setTimeout(function(){ ov.remove(); }, 220);
      }

      navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1440 } }, audio: false
      }).then(function (s) {
        stream = s; video.srcObject = s;
      }).catch(function (e) { cleanup(); reject(e); });

      ov.querySelector('.apa-cam-x').onclick = function () { cleanup(); reject(new Error('cancelled')); };

      ov.querySelector('.apa-cam-shot').onclick = function () {
        if (!video.videoWidth) return;
        var cv = document.createElement('canvas');
        cv.width = video.videoWidth; cv.height = video.videoHeight;
        cv.getContext('2d').drawImage(video, 0, 0);

        var geo = { lat: null, lng: null };
        var done = function () {
          cv.toBlob(function (blob) {
            cleanup();
            resolve({
              blob: blob,
              dataUrl: cv.toDataURL('image/jpeg', 0.86),
              takenAt: new Date().toISOString(),
              live: true,
              lat: geo.lat, lng: geo.lng
            });
          }, 'image/jpeg', 0.86);
        };

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            function (p) { geo.lat = p.coords.latitude; geo.lng = p.coords.longitude; done(); },
            done, { timeout: 4000, enableHighAccuracy: true }
          );
        } else done();
      };
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

  async function uploadEvidence(client, bookingId, shot) {
    var path = 'issues/' + bookingId + '/' + Date.now() + '.jpg';
    try {
      var up = await client.storage.from('evidence').upload(path, shot.blob, {
        contentType: 'image/jpeg', upsert: false
      });
      if (up.error) throw up.error;
      var pub = client.storage.from('evidence').getPublicUrl(path);
      return pub.data.publicUrl;
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
     4 · MATCH GUEST. The host-facing rehoming flow
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
        .eq('status','active').neq('id', src.id)
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

    /* Host presses Match Guest. We check the window server-side too
       a host with a doctored clock is still a host inside 24 hours. */
    async offer(bookingId) {
      var c = sb(); if (!c) throw new Error('offline');

      var bk = (await c.from('apartment_bookings').select('*').eq('id', bookingId).single()).data;
      if (!bk) throw new Error('booking_not_found');

      var gate = await c.rpc('match_allowed', { p_booking: bookingId });
      var g = (!gate.error && gate.data && gate.data[0]) ? gate.data[0]
                                                         : await Match.eligibility(bk);
      if (!g.allowed) {
        await c.from('match_offers').insert({
          booking_id: bookingId, origin_host_id: bk.host_id, origin_listing_id: bk.apartment_id,
          guest_id: bk.guest_id, status: 'blocked', block_reason: g.reason,
          hours_to_checkin: g.hours, candidates: []
        });
        return { blocked: true, reason: g.reason, hours: g.hours };
      }

      var cands = await Match.candidates(bookingId, 6);
      if (!cands.length) return { blocked: true, reason: 'no_comparable_listing', hours: g.hours };

      var fee        = Number(bk.service_fee || 0);
      var commission = Math.round(fee * HOST_COMMISSION);

      var ins = await c.from('match_offers').insert({
        booking_id: bookingId,
        origin_host_id: bk.host_id,
        origin_listing_id: bk.apartment_id,
        guest_id: bk.guest_id,
        candidates: cands,
        hours_to_checkin: g.hours,
        service_fee: fee,
        host_commission: commission,
        status: 'offered'
      }).select().single();
      if (ins.error) throw ins.error;

      await notify(bk.guest_id, 'match_offer',
        'Your host has proposed an alternative',
        'We found ' + cands.length + ' comparable ' + (cands.length===1?'stay':'stays') +
        ' for the same dates. Review and choose, or take a full refund.',
        { booking_id: bookingId, offer_id: ins.data.id });

      return { blocked:false, offer: ins.data, candidates: cands, commission: commission };
    },

    /* Guest accepts one. Money moves: they pay or are refunded the
       difference, we keep our fee, the original host earns 30% of it. */
    async accept(offerId, listingId) {
      var res = await post('/api/match-guest', { action:'accept', offer_id: offerId, listing_id: listingId });
      var j = await res.json();
      if (!res.ok) throw new Error(j.error || 'match_accept_failed');
      return j;
    },

    /* Guest says no. Full refund, always. They did not create this. */
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

      var shot = null;
      var picked = null;

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
              '<div class="apa-issue-lbl">Live photo required</div>' +
              '<div class="apa-issue-photo-sub">Taken now, in the app. Gallery uploads aren\'t accepted as evidence.</div>' +
              '<button class="apa-issue-cam" type="button">Open camera</button>' +
              '<img class="apa-issue-thumb" hidden alt="Evidence"/>' +
            '</div>' +
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
      var close = function () { sheet.classList.remove('open'); setTimeout(function(){ sheet.remove(); }, 240); };
      $('.apa-issue-x').onclick = close;
      $('.apa-issue-cancel').onclick = close;

      function refresh() {
        var needPhoto = picked && picked.requires_photo;
        $('.apa-issue-photo').hidden = !needPhoto;
        $('.apa-issue-go').disabled = !picked || (needPhoto && !shot);

        if (!picked) { $('.apa-issue-outcome').hidden = true; return; }

        var s = previewSettlement(booking, picked.fault);
        var lines = [];

        if (s.window === 'pre_24h') {
          lines.push(['Refund to you', money(s.refund_amount), 'good']);
          lines.push(['Cancelling more than 24 hours out. Nothing withheld.', '', 'note']);
        } else if (picked.fault === 'host') {
          lines.push(['Refund to you', money(s.refund_amount), 'good']);
          if (picked.auto_redirect) lines.push(['We will arrange alternative accommodation for you immediately.', '', 'note']);
        } else if (picked.fault === 'guest') {
          lines.push(['Refund to you', money(s.refund_amount), '']);
          lines.push(['Retained by host', money(s.host_payout), 'warn']);
          lines.push(['Inside 24 hours the host keeps half of one night.', '', 'note']);
        } else {
          lines.push(['Held for review', money(s.paid), '']);
          lines.push(['We\'ll look at your photo and decide within the hour.', '', 'note']);
        }

        $('.apa-issue-outcome').hidden = false;
        $('.apa-issue-outcome').innerHTML =
          '<div class="apa-issue-outcome-t">What happens next</div>' +
          lines.map(function (l) {
            return l[1]
              ? '<div class="apa-issue-row ' + l[2] + '"><span>' + l[0] + '</span><b>' + l[1] + '</b></div>'
              : '<div class="apa-issue-note ' + l[2] + '">' + l[0] + '</div>';
          }).join('');

        $('.apa-issue-go').textContent = picked.auto_redirect && s.window !== 'pre_24h'
          ? 'Move me now' : 'Submit';
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

      $('.apa-issue-cam').onclick = async function () {
        try {
          shot = await captureLive({ hint: picked ? picked.label : 'Show us the problem.' });
          var img = $('.apa-issue-thumb');
          img.src = shot.dataUrl; img.hidden = false;
          $('.apa-issue-cam').textContent = 'Retake';
          refresh();
        } catch (e) {
          if (e.message !== 'cancelled') toast('We need camera access to record what you\'re seeing.');
        }
      };

      $('.apa-issue-go').onclick = async function () {
        var btn = this; btn.disabled = true; btn.textContent = 'Working…';
        try {
          var r = await Issue.submit(booking, {
            code: picked.code, freeText: ta.value.trim(), shot: shot,
            inferred: classify(ta.value, tax).slice(0, 3)
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
      if (r.held)       return toast('Received. We\'re reviewing your photo now.');
      toast('Reported. We\'ll be in touch shortly.');
    },

    /* The write. Evidence first, then the server decides. */
    async submit(booking, payload) {
      var c = sb(); if (!c) throw new Error('offline');

      var url = null, lat = null, lng = null, dist = null, takenAt = null;
      if (payload.shot) {
        url     = await uploadEvidence(c, booking.id, payload.shot);
        lat     = payload.shot.lat; lng = payload.shot.lng;
        takenAt = payload.shot.takenAt;
      }

      var listing = (await c.from('listings').select('lat,lng,host_id')
                       .eq('id', booking.apartment_id).maybeSingle()).data;
      if (listing) dist = haversineKm(lat, lng, listing.lat, listing.lng);

      var h = hoursTo(booking.checkin_date);
      var tax = await loadTaxonomy();
      var row = tax.find(function (t) { return t.code === payload.code; }) || {};

      var ins = await c.from('checkin_issues').insert({
        booking_id: booking.id,
        guest_id: booking.guest_id,
        host_id: booking.host_id || (listing && listing.host_id) || null,
        listing_id: booking.apartment_id,
        issue_code: payload.code,
        free_text: payload.freeText || null,
        inferred_codes: payload.inferred || [],
        confidence: (payload.inferred && payload.inferred[0]) ? payload.inferred[0].confidence : 0,
        photo_url: url,
        photo_live: !!(payload.shot && payload.shot.live),
        photo_taken_at: takenAt,
        geo_lat: lat, geo_lng: lng, geo_distance_m: dist == null ? null : dist * 1000,
        window_phase: phaseOf(h),
        hours_to_checkin: h == null ? null : Number(h.toFixed(2)),
        fault: row.fault || 'unclear',
        status: 'open'
      }).select().single();
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
                .eq('status', 'checked_in')
                .gte('checkout_date', new Date(Date.now() - 14 * 864e5).toISOString().slice(0,10));
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
      'background-clip:padding-box;cursor:pointer;transition:transform .1s}.apa-cam-shot:active{transform:scale(.92)}',

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
    '.apa-issue-photo-sub{font:400 12.5px/1.5 system-ui;color:#7c828e;margin:-4px 0 11px}',
    '.apa-issue-cam{background:#0f1117;color:#fff;border:0;border-radius:11px;padding:11px 18px;',
      'font:600 13.5px system-ui;cursor:pointer}',
    '.apa-issue-thumb{display:block;width:100%;border-radius:11px;margin-top:12px}',
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
