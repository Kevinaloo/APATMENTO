/* ═══════════════════════════════════════════════════════════════════
   CABANA · LIST YOUR TOUR
   ───────────────────────────────────────────────────────────────────
   Operator-facing submission. Writes two rows, both owned by the
   signed-in user and both landing in review:

     tour_operators  → status 'pending', verified false, kind 'partner'
     tours           → status 'pending', owner_id = auth.uid()

   RLS enforces every one of those on the server. Nothing here is a
   security control — an operator cannot self-publish or self-verify
   even if they edit this file, because the policy's WITH CHECK
   clause refuses the write.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var sb = null, user = null, operator = null, media = null;

  function $(id) { return document.getElementById(id); }
  function show(id) {
    ['p-gate', 'p-op', 'p-tour', 'p-done'].forEach(function (p) {
      var el = $(p); if (el) el.classList.toggle('on', p === id);
    });
    var step = { 'p-gate': 0, 'p-op': 0, 'p-tour': 1, 'p-done': 2 }[id];
    var bars = document.querySelectorAll('.lt-step');
    Array.prototype.forEach.call(bars, function (b, i) {
      b.classList.toggle('done', i < step);
      b.classList.toggle('now', i === step);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function say(msg) { var l = $('lt-live'); if (l) l.textContent = msg; }

  function lines(v) {
    return String(v || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function markError(input, errId, on) {
    if (input) input.setAttribute('aria-invalid', on ? 'true' : 'false');
    var e = $(errId); if (e) e.classList.toggle('on', !!on);
  }

  /* ── boot ────────────────────────────────────────────────────────── */

  function boot() {
    sb = (window.ApaSession && window.ApaSession.client && window.ApaSession.client()) || null;
    if (!sb && window.supabase && window.supabase.createClient) {
      sb = window.supabase.createClient(
        'https://gfwgbgdvxtocwhilrtdw.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw');
    }
    if (!sb) { show('p-gate'); return; }

    sb.auth.getUser().then(function (res) {
      user = res && res.data && res.data.user;
      if (!user) { show('p-gate'); return; }
      var em = $('o-email');
      if (em && !em.value && user.email) em.value = user.email;
      mountUploader();
      findOperator();
    }, function () { show('p-gate'); });
  }

  /* If they've listed before, skip straight to the tour form. */
  function findOperator() {
    sb.from('tour_operators').select('*').eq('owner_id', user.id).limit(1)
      .then(function (r) {
        operator = (r && r.data && r.data[0]) || null;
        if (operator) {
          var h = document.querySelector('#p-tour .lt-p');
          if (h) {
            h.textContent = operator.status === 'approved'
              ? 'Listing as ' + operator.name + '. Describe the tour the way you would to someone on the phone.'
              : 'Listing as ' + operator.name + '. Your operator profile is still in review — that\u2019s fine, the tour can go in now and both are checked together.';
          }
          show('p-tour');
        } else {
          show('p-op');
        }
      }, function () { show('p-op'); });
  }

  /* Media lives under <uid>/<folder>/, and the folder is a per-draft id
     so two tours submitted in one sitting never share a directory. */
  function mountUploader() {
    var host = $('t-media');
    if (!host || !window.CabanaUploader || media) return;
    media = window.CabanaUploader.mount(host, {
      client: sb,
      folder: 'draft-' + Date.now().toString(36),
      maxPhotos: 10,
      maxVideos: 2,
      onChange: function (v) {
        var btn = $('t-submit');
        if (!btn) return;
        // Submitting mid-upload would save a tour with half its photos.
        btn.disabled = !!v.busy;
        btn.textContent = v.busy ? 'Uploading photos…' : 'Submit for review';
      }
    });
  }

  /* ── step 1 · operator ───────────────────────────────────────────── */

  function submitOperator(e) {
    e.preventDefault();
    var name = $('o-name'), phone = $('o-phone'), email = $('o-email');
    var bad = false;

    markError(name, 'e-o-name', !name.value.trim());
    if (!name.value.trim()) bad = true;

    markError(phone, 'e-o-phone', !phone.value.trim());
    if (!phone.value.trim()) bad = true;

    var okEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim());
    markError(email, 'e-o-email', !okEmail);
    if (!okEmail) bad = true;

    if (bad) { say('Some details are missing.'); return; }

    var btn = e.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

    sb.from('tour_operators').insert({
      owner_id: user.id,
      name: name.value.trim(),
      tagline: $('o-tagline').value.trim() || null,
      phone: phone.value.trim(),
      whatsapp: $('o-whatsapp').value.trim() || null,
      email: email.value.trim(),
      county: $('o-county').value.trim() || null,
      bio: $('o-bio').value.trim() || null,
      kind: 'partner',
      status: 'pending'
    }).select().then(function (r) {
      if (btn) { btn.disabled = false; btn.textContent = 'Continue'; }
      if (r && r.error) { say('Could not save: ' + r.error.message); alert('Could not save: ' + r.error.message); return; }
      operator = (r.data && r.data[0]) || null;
      say('Saved. Now the tour.');
      show('p-tour');
    }, function (err) {
      if (btn) { btn.disabled = false; btn.textContent = 'Continue'; }
      say('Could not save.');
      alert('Could not save: ' + ((err && err.message) || 'unknown error'));
    });
  }

  /* ── step 2 · the tour ───────────────────────────────────────────── */

  function submitTour(e) {
    e.preventDefault();
    var f = {
      title: $('t-title'), summary: $('t-summary'), description: $('t-description'),
      destination: $('t-destination'), price: $('t-price')
    };
    var bad = false;
    [['title', 'e-t-title'], ['summary', 'e-t-summary'], ['description', 'e-t-description'],
     ['destination', 'e-t-destination']].forEach(function (p) {
      var empty = !f[p[0]].value.trim();
      markError(f[p[0]], p[1], empty);
      if (empty) bad = true;
    });
    var priceBad = f.price.value === '' || Number(f.price.value) < 0 || isNaN(Number(f.price.value));
    markError(f.price, 'e-t-price', priceBad);
    if (priceBad) bad = true;

    if (bad) { say('Some details are missing.'); return; }

    if (media && media.busy()) { say('Photos are still uploading.'); return; }
    var m = media ? media.value() : { photos: [], videos: [], cover: null };

    var btn = $('t-submit');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

    var days = Math.max(1, Number($('t-days').value) || 1);
    var row = {
      owner_id: user.id,
      operator_id: operator ? operator.id : null,
      title: f.title.value.trim(),
      summary: f.summary.value.trim(),
      description: f.description.value.trim(),
      destination: f.destination.value.trim(),
      latitude: parseFloat(document.getElementById('t-dest-lat')?.value) || null,
      longitude: parseFloat(document.getElementById('t-dest-lng')?.value) || null,
      county: $('t-county').value.trim() || null,
      category: $('t-category').value,
      days: days,
      duration_label: $('t-duration').value.trim() || (days + ' day' + (days === 1 ? '' : 's')),
      price_kes: Math.round(Number(f.price.value) || 0),
      group_min: Math.max(1, Number($('t-min').value) || 1),
      group_max: Math.max(1, Number($('t-max').value) || 12),
      schedule_type: $('t-schedule').value,
      next_departure: $('t-next').value || null,
      meeting_point: $('t-meeting').value.trim() || null,
      includes_list: lines($('t-inc').value),
      excludes_list: lines($('t-exc').value),
      cover_url: m.cover,
      photos: m.photos,
      videos: m.videos,
      status: 'pending'
    };

    sb.from('tours').insert(row).then(function (r) {
      if (btn) { btn.disabled = false; btn.textContent = 'Submit for review'; }
      if (r && r.error) { say('Could not send.'); alert('Could not send: ' + r.error.message); return; }
      var msg = $('lt-done-msg');
      if (msg && operator && operator.status !== 'approved') {
        msg.textContent = 'We\u2019ll review the tour and your operator details together, then be in ' +
          'touch on ' + (operator.email || 'your email') + '. Once approved it appears on the tours page.';
      }
      say('Sent for review.');
      show('p-done');
    }, function (err) {
      if (btn) { btn.disabled = false; btn.textContent = 'Submit for review'; }
      say('Could not send.');
      alert('Could not send: ' + ((err && err.message) || 'unknown error'));
    });
  }

  /* ── wiring ──────────────────────────────────────────────────────── */

  function start() {
    var fo = $('f-op'), ft = $('f-tour');
    if (fo) fo.addEventListener('submit', submitOperator);
    if (ft) ft.addEventListener('submit', submitTour);

    var back = $('t-back');
    if (back) back.addEventListener('click', function () {
      // A returning operator skipped the profile step, so there is no
      // previous panel to go back to — Back means leave.
      if (operator) { window.location.href = '/tours'; return; }
      show('p-op');
    });

    var again = $('lt-another');
    if (again) again.addEventListener('click', function () {
      var ft2 = $('f-tour');
      if (ft2) ft2.reset();
      if (media) {
        media.clear();
        media.setFolder('draft-' + Date.now().toString(36));
      }
      show('p-tour');
    });

    // Clear an error the moment the field is touched.
    ['o-name','o-phone','o-email','t-title','t-summary','t-description','t-destination','t-price']
      .forEach(function (id) {
        var el = $(id);
        if (el) el.addEventListener('input', function () {
          markError(el, 'e-' + id, false);
        });
      });

    if (window.ApaSession && window.ApaSession.ready) {
      window.ApaSession.ready(boot);
      setTimeout(function () { if (!user && !operator) boot(); }, 2200);
    } else {
      boot();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else { start(); }
})();
