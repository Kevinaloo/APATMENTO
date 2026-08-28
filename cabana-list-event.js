/* ═══════════════════════════════════════════════════════════════════
   CABANA · LIST YOUR EVENT
   ───────────────────────────────────────────────────────────────────
   Organiser-facing submission. Writes two rows, both owned by the
   signed-in user, both landing in review:

     event_organisers → status 'pending', verified false, kind 'partner'
     events           → status 'pending', owner_id = auth.uid()

   RLS enforces all of that server-side. Nothing here is a security
   control: an organiser cannot self-publish or self-feature even by
   editing this file, because the policy's WITH CHECK refuses it.

   The one thing worth care is TIME. A datetime-local input has no
   timezone, so new Date(value) reads it in the guest's own zone and
   toISOString converts it to an absolute instant. An organiser in
   Nairobi typing 21:00 gets 21:00 Nairobi, and the countdown is then
   correct for someone watching from anywhere.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var sb = null, user = null, organiser = null, media = null;
  var tiers = [];

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function lines(v) {
    return String(v || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function say(m) { var l = $('le-live'); if (l) l.textContent = m; }
  function mark(input, errId, on) {
    if (input) input.setAttribute('aria-invalid', on ? 'true' : 'false');
    var e = $(errId); if (e) e.classList.toggle('on', !!on);
  }

  function show(id) {
    ['p-gate', 'p-org', 'p-event', 'p-done'].forEach(function (p) {
      var el = $(p); if (el) el.classList.toggle('on', p === id);
    });
    var step = { 'p-gate': 0, 'p-org': 0, 'p-event': 1, 'p-done': 2 }[id];
    var bars = document.querySelectorAll('.le-step');
    Array.prototype.forEach.call(bars, function (b, i) {
      b.classList.toggle('done', i < step);
      b.classList.toggle('now', i === step);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ── tiers ───────────────────────────────────────────────────────── */

  function paintTiers() {
    var host = $('e-tiers');
    if (!host) return;
    host.innerHTML = tiers.map(function (t, i) {
      return '<div class="le-tier">' +
        '<div><label class="le-l" for="tn' + i + '">Name</label>' +
          '<input class="le-i" id="tn' + i + '" data-t="name" data-i="' + i + '" value="' + esc(t.name) + '" placeholder="Early bird"/></div>' +
        '<div><label class="le-l" for="tp' + i + '">Price <span>KES</span></label>' +
          '<input class="le-i" id="tp' + i + '" data-t="price_kes" data-i="' + i + '" type="number" min="0" value="' + esc(t.price_kes) + '"/></div>' +
        '<div><label class="le-l" for="tq' + i + '">Qty <span>blank = ∞</span></label>' +
          '<input class="le-i" id="tq' + i + '" data-t="qty" data-i="' + i + '" type="number" min="1" value="' + esc(t.qty == null ? '' : t.qty) + '"/></div>' +
        (tiers.length > 1
          ? '<button class="rm" type="button" data-rm="' + i + '" aria-label="Remove tier">&times;</button>'
          : '<span></span>') +
      '</div>';
    }).join('');

    Array.prototype.forEach.call(host.querySelectorAll('[data-t]'), function (inp) {
      inp.addEventListener('input', function () {
        var i = Number(inp.getAttribute('data-i'));
        var k = inp.getAttribute('data-t');
        var v = inp.value;
        tiers[i][k] = (k === 'name') ? v : (v === '' ? null : Number(v));
      });
    });
    Array.prototype.forEach.call(host.querySelectorAll('[data-rm]'), function (b) {
      b.addEventListener('click', function () {
        tiers.splice(Number(b.getAttribute('data-rm')), 1);
        paintTiers();
      });
    });
  }

  function cleanTiers() {
    return tiers
      .filter(function (t) { return String(t.name || '').trim(); })
      .map(function (t) {
        var row = { name: String(t.name).trim(), price_kes: Math.max(0, Number(t.price_kes) || 0), sold: 0 };
        if (t.qty != null && Number(t.qty) > 0) row.qty = Number(t.qty);
        return row;
      });
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

    sb.auth.getUser().then(function (r) {
      user = r && r.data && r.data.user;
      if (!user) { show('p-gate'); return; }
      var em = $('o-email');
      if (em && !em.value && user.email) em.value = user.email;
      mountUploader();
      findOrganiser();
    }, function () { show('p-gate'); });
  }

  function mountUploader() {
    var host = $('e-media');
    if (!host || !window.CabanaUploader || media) return;
    media = window.CabanaUploader.mount(host, {
      client: sb,
      bucket: 'events',
      folder: 'draft-' + Date.now().toString(36),
      maxPhotos: 8,
      maxVideos: 2,
      onChange: function (v) {
        var btn = $('e-submit');
        if (!btn) return;
        btn.disabled = !!v.busy;
        btn.textContent = v.busy ? 'Uploading…' : 'Submit for review';
      }
    });
  }

  function findOrganiser() {
    sb.from('event_organisers').select('*').eq('owner_id', user.id).limit(1)
      .then(function (r) {
        organiser = (r && r.data && r.data[0]) || null;
        if (organiser) {
          var h = document.querySelector('#p-event .le-p');
          if (h) {
            h.textContent = organiser.status === 'approved'
              ? 'Listing as ' + organiser.name + '. The date and time drive the countdown guests see.'
              : 'Listing as ' + organiser.name + '. Your organiser profile is still in review \u2014 the event can go in now and both are checked together.';
          }
          show('p-event');
        } else {
          show('p-org');
        }
      }, function () { show('p-org'); });
  }

  /* ── step 1 ──────────────────────────────────────────────────────── */

  function submitOrganiser(e) {
    e.preventDefault();
    var name = $('o-name'), phone = $('o-phone'), email = $('o-email');
    var bad = false;

    mark(name, 'e-o-name', !name.value.trim());   if (!name.value.trim()) bad = true;
    mark(phone, 'e-o-phone', !phone.value.trim()); if (!phone.value.trim()) bad = true;
    var okEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim());
    mark(email, 'e-o-email', !okEmail);            if (!okEmail) bad = true;
    if (bad) { say('Some details are missing.'); return; }

    var btn = e.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

    sb.from('event_organisers').insert({
      owner_id: user.id,
      name: name.value.trim(),
      tagline: $('o-tagline').value.trim() || null,
      phone: phone.value.trim(),
      email: email.value.trim(),
      instagram: $('o-instagram').value.trim() || null,
      city: $('o-city').value.trim() || null,
      kind: 'partner',
      status: 'pending'
    }).select().then(function (r) {
      if (btn) { btn.disabled = false; btn.textContent = 'Continue'; }
      if (r && r.error) { say('Could not save.'); alert('Could not save: ' + r.error.message); return; }
      organiser = (r.data && r.data[0]) || null;
      say('Saved. Now the event.');
      show('p-event');
    }, function (err) {
      if (btn) { btn.disabled = false; btn.textContent = 'Continue'; }
      alert('Could not save: ' + ((err && err.message) || 'unknown error'));
    });
  }

  /* ── step 2 ──────────────────────────────────────────────────────── */

  function submitEvent(e) {
    e.preventDefault();
    var f = {
      title: $('e-title'), description: $('e-description'),
      start: $('e-start'), end: $('e-end'), venue: $('e-venue')
    };
    var bad = false;

    [['title','e-e-title'],['description','e-e-description'],['venue','e-e-venue']].forEach(function (p) {
      var empty = !f[p[0]].value.trim();
      mark(f[p[0]], p[1], empty);
      if (empty) bad = true;
    });

    var startMs = f.start.value ? new Date(f.start.value).getTime() : NaN;
    mark(f.start, 'e-e-start', !f.start.value || isNaN(startMs));
    if (!f.start.value || isNaN(startMs)) bad = true;

    var endMs = f.end.value ? new Date(f.end.value).getTime() : null;
    // An end before the start would make the event read as already
    // finished the moment it is published.
    var endBad = endMs != null && (isNaN(endMs) || endMs <= startMs);
    mark(f.end, 'e-e-end', endBad);
    if (endBad) bad = true;

    if (bad) { say('Some details need fixing.'); return; }
    if (media && media.busy()) { say('Media is still uploading.'); return; }

    var m = media ? media.value() : { photos: [], videos: [], cover: null };
    var btn = $('e-submit');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

    var cap = $('e-capacity').value;
    var age = $('e-age').value;

    /* The address, with the venue's Plus Code appended.
       ------------------------------------------------------------------
       Latitude and longitude already have columns and are saved as
       numbers; this is for the human. "Gate C, Ngong Racecourse ·
       6GCRPQ5M+587" is what a guest can paste into a navigation app on
       the night, and it arrives on the ticket. Kept in the existing
       `address` TEXT column rather than a new one, so this insert cannot
       be rejected whole by a database that has not been migrated —
       which would stop organisers listing anything at all.  */
    function venueAddress() {
      var text = $('e-address').value.trim();
      var plus = (document.getElementById('e-venue-plus') || {}).value || '';
      if (!text && !plus) return null;
      if (!plus) return text || null;
      if (text.indexOf(plus) !== -1) return text;
      return text ? text + ' \u00b7 ' + plus : plus;
    }

    sb.from('events').insert({
      owner_id: user.id,
      organiser_id: organiser ? organiser.id : null,
      title: f.title.value.trim(),
      tagline: $('e-tagline').value.trim() || null,
      description: f.description.value.trim(),
      category: $('e-category').value,
      // datetime-local has no zone; new Date reads it as local and
      // toISOString pins it to an absolute instant.
      starts_at: new Date(f.start.value).toISOString(),
      ends_at: endMs ? new Date(f.end.value).toISOString() : null,
      venue: f.venue.value.trim(),
      latitude: parseFloat(document.getElementById('e-venue-lat')?.value) || null,
      longitude: parseFloat(document.getElementById('e-venue-lng')?.value) || null,
      city: $('e-city').value.trim() || 'Nairobi',
      address: venueAddress(),
      tiers: cleanTiers(),
      capacity: cap === '' ? null : Number(cap),
      age_limit: age === '' ? null : Number(age),
      dress_code: $('e-dress').value.trim() || null,
      lineup: lines($('e-lineup').value),
      refund_policy: $('e-refund').value.trim() || null,
      cover_url: m.cover,
      photos: m.photos,
      videos: m.videos,
      status: 'pending'
    }).select('id').single().then(async function (r) {
      if (btn) { btn.disabled = false; btn.textContent = 'Submit for review'; }
      if (r && r.error) { say('Could not send.'); alert('Could not send: ' + r.error.message); return; }
      if (r.data && r.data.id && window.CabanaLifecycle && window.CabanaLifecycle.listingSubmitted) {
        await window.CabanaLifecycle.listingSubmitted('event', r.data.id);
      }
      var msg = $('le-done-msg');
      if (msg && organiser && organiser.status !== 'approved') {
        msg.textContent = 'We\u2019ll review the event and your organiser details together, then be in ' +
          'touch on ' + (organiser.email || 'your email') + '.';
      }
      say('Sent for review.');
      show('p-done');
    }, function (err) {
      if (btn) { btn.disabled = false; btn.textContent = 'Submit for review'; }
      alert('Could not send: ' + ((err && err.message) || 'unknown error'));
    });
  }

  /* ── wiring ──────────────────────────────────────────────────────── */

  function start() {
    tiers = [{ name: 'General admission', price_kes: 0, qty: null }];
    paintTiers();

    var fo = $('f-org'), fe = $('f-event');
    if (fo) fo.addEventListener('submit', submitOrganiser);
    if (fe) fe.addEventListener('submit', submitEvent);

    var add = $('e-addtier');
    if (add) add.addEventListener('click', function () {
      tiers.push({ name: '', price_kes: 0, qty: null });
      paintTiers();
    });

    var back = $('e-back');
    if (back) back.addEventListener('click', function () {
      if (organiser) { window.location.href = '/events'; return; }
      show('p-org');
    });

    var again = $('le-another');
    if (again) again.addEventListener('click', function () {
      var fe2 = $('f-event');
      if (fe2) fe2.reset();
      tiers = [{ name: 'General admission', price_kes: 0, qty: null }];
      paintTiers();
      if (media) { media.clear(); media.setFolder('draft-' + Date.now().toString(36)); }
      show('p-event');
    });

    ['o-name','o-phone','o-email','e-title','e-description','e-venue','e-start','e-end']
      .forEach(function (id) {
        var el = $(id);
        if (el) el.addEventListener('input', function () { mark(el, 'e-' + id, false); });
      });

    if (window.ApaSession && window.ApaSession.ready) {
      window.ApaSession.ready(boot);
      setTimeout(function () { if (!user && !organiser) boot(); }, 2200);
    } else { boot(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
