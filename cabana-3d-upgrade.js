/* ══════════════════════════════════════════════════════════════════════
   CABANA · 3D TOUR UPGRADE
   cabana-3d-upgrade.js

   The paid upgrade a host can ask for while listing a stay, or later from
   their listings board. Nothing is charged here. Ticking the box records a
   lead the team calls back:

     1. tour3d_requests row, written under the host's own RLS. The row is
        the lead, so an email outage can never lose one.
     2. POST /api/email { action: 'tour3d-request', requestId } — the
        server re-reads the row, checks it is the caller's, and emails the
        Cabana team and the host. The browser never names a recipient.

   Once the team captures the space and sets tour_3d_status = 'live', the
   listing gets the 3D TOUR badge, the "Explore in 3D" walkthrough and a
   featured place at the top of Stays. That switch is server-side only;
   a host cannot flip it (see listings_protect_system_fields).

   API
     Cabana3DUpgrade.mount(el, { prefill, onChange })  → controller
     Cabana3DUpgrade.submit(sb, listingId, value, source) → { ok, ... }
     Cabana3DUpgrade.statusHtml(status)                  → string
     Cabana3DUpgrade.openSheet({ sb, listing, prefill, onDone })
   ══════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.Cabana3DUpgrade) return;

  var CUBE = '<svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="m14 3 10 5.7v10.6L14 25 4 19.3V8.7L14 3Z" stroke="currentColor" stroke-width="1.4"/><path d="m4 8.7 10 5.8 10-5.8M14 14.5V25M9 5.8l10 5.8" stroke="currentColor" stroke-width="1.2"/><path d="m22 1 .8 2.2L25 4l-2.2.8L22 7l-.8-2.2L19 4l2.2-.8Z" fill="currentColor" stroke="none"/></svg>';
  var ICONS = {
    top:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    badge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.8L12 3Z"/></svg>',
    walk:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 4l9 6.5V20H3z"/><path d="M9 20v-6h6v6"/></svg>',
    trust: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>'
  };
  var BENEFITS = [
    ['top',   'Featured at the top of Stays', 'Live tours are pinned above standard listings in search.'],
    ['badge', 'The 3D TOUR badge', 'A gold mark on your card that stands out in every list.'],
    ['walk',  'A walkthrough inside your listing', 'Guests explore every room before they pay.'],
    ['trust', 'Guests book with confidence', 'Fewer "send more photos" messages and fewer surprises at the door.']
  ];
  var PREFS = [['call', 'Call me'], ['text', 'Text me'], ['email', 'Email me']];
  var uid = 0;

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function injectStyles() {
    if (document.getElementById('c3d-upgrade-css')) return;
    var s = document.createElement('style');
    s.id = 'c3d-upgrade-css';
    s.textContent = [
      '.c3d{--c3d-gold:#e9cf98;--c3d-gold-2:#d4b274;--c3d-ink:#fff6e6;--c3d-soft:#d6d2e4;position:relative;border-radius:20px;overflow:hidden;color:var(--c3d-ink);background:radial-gradient(ellipse at 0% 0%,#5d457a 0%,transparent 55%),linear-gradient(120deg,#1f2036 0%,#2e2c47 58%,#243954 100%);border:1px solid #d4b36e66;box-shadow:0 14px 40px #1a14302e;font-family:inherit;margin:4px 0 24px}',
      '.c3d:after{content:"";position:absolute;top:0;left:8%;right:8%;height:1px;background:linear-gradient(90deg,transparent,#ebd49d,transparent)}',
      '.c3d *{box-sizing:border-box}',
      '.c3d-head{display:flex;gap:16px;align-items:flex-start;padding:22px 22px 6px}',
      '.c3d-emblem{display:grid;place-items:center;flex:0 0 54px;height:58px;border-radius:16px;color:#f4d694;border:1px solid #e0c59280;background:linear-gradient(140deg,#ffffff14,#b795ca18)}',
      '.c3d-emblem svg{width:36px;height:36px}',
      '.c3d-kicker{display:inline-flex;align-items:center;gap:8px;font-size:10px;font-weight:800;letter-spacing:.17em;text-transform:uppercase;color:var(--c3d-gold);margin-bottom:6px}',
      '.c3d-pill{font-size:9.5px;letter-spacing:.12em;padding:3px 8px;border-radius:100px;background:#e9cf9822;border:1px solid #e9cf9855;color:var(--c3d-gold)}',
      '.c3d-title{font-family:Georgia,"Times New Roman",serif;font-size:25px;line-height:1.15;font-weight:400;letter-spacing:-.02em;margin:0}',
      '.c3d-sub{font-size:13px;line-height:1.55;color:var(--c3d-soft);margin:7px 0 0;max-width:520px}',
      '.c3d-benefits{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:16px 22px 4px;margin:0;list-style:none}',
      '.c3d-benefit{display:flex;gap:11px;align-items:flex-start;padding:12px;border-radius:14px;background:#ffffff0d;border:1px solid #ffffff14}',
      '.c3d-benefit-ico{flex:0 0 30px;height:30px;border-radius:10px;display:grid;place-items:center;color:#282233;background:linear-gradient(135deg,#f3e2bd,#d4b274)}',
      '.c3d-benefit-ico svg{width:16px;height:16px}',
      '.c3d-benefit-txt b{display:block;font-size:13px;line-height:1.35;font-weight:700;color:#fff}',
      '.c3d-benefit-txt span{display:block;font-size:11.5px;line-height:1.5;color:var(--c3d-soft);margin-top:2px}',
      '.c3d-opt{display:flex;align-items:center;gap:14px;margin:16px 22px 0;padding:15px 16px;border-radius:15px;background:#ffffff10;border:1.5px solid #e9cf9855;cursor:pointer;transition:background .2s,border-color .2s}',
      '.c3d-opt:hover{background:#ffffff16;border-color:#e9cf98aa}',
      '.c3d-opt input{position:absolute;opacity:0;width:1px;height:1px}',
      '.c3d-check{flex:0 0 24px;height:24px;border-radius:8px;border:2px solid var(--c3d-gold);display:grid;place-items:center;transition:background .2s}',
      '.c3d-check svg{width:14px;height:14px;color:#282233;opacity:0;transform:scale(.6);transition:opacity .15s,transform .2s}',
      '.c3d-opt input:checked+.c3d-check{background:linear-gradient(135deg,#f3e2bd,#d4b274)}',
      '.c3d-opt input:checked+.c3d-check svg{opacity:1;transform:none}',
      '.c3d-opt input:focus-visible+.c3d-check{outline:3px solid #e3bf74;outline-offset:3px}',
      '.c3d-opt-t{display:block;font-size:14.5px;font-weight:800;color:#fff}',
      '.c3d-opt-d{display:block;font-size:12px;color:var(--c3d-soft);margin-top:2px;line-height:1.45}',
      '.c3d.on .c3d-opt{background:#e9cf981c;border-color:var(--c3d-gold)}',
      '.c3d-form{display:none;padding:16px 22px 4px}',
      '.c3d.on .c3d-form{display:block;animation:c3d-in .28s ease-out}',
      '@keyframes c3d-in{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}',
      '.c3d-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
      '.c3d-field{display:block;margin-bottom:12px}',
      '.c3d-field>span{display:block;font-size:11.5px;font-weight:700;color:#ece6f6;margin-bottom:6px}',
      '.c3d-field>span i{font-style:normal;font-weight:500;color:#aaa4bd}',
      '.c3d-field input,.c3d-field textarea{width:100%;padding:11px 13px;border-radius:11px;border:1.5px solid #ffffff26;background:#ffffff12;color:#fff;font:500 14px/1.4 inherit;font-family:inherit;outline:none;transition:border-color .2s,background .2s}',
      '.c3d-field textarea{min-height:68px;resize:vertical}',
      '.c3d-field input::placeholder,.c3d-field textarea::placeholder{color:#a9a4bb}',
      '.c3d-field input:focus,.c3d-field textarea:focus{border-color:var(--c3d-gold);background:#ffffff1a}',
      '.c3d-field input[aria-invalid=true]{border-color:#ff8a9a}',
      '.c3d-seg{display:flex;gap:8px;flex-wrap:wrap}',
      '.c3d-seg label{position:relative}',
      '.c3d-seg input{position:absolute;opacity:0;width:1px;height:1px}',
      '.c3d-seg span{display:inline-block;padding:9px 14px;border-radius:100px;border:1.5px solid #ffffff2e;font-size:12.5px;font-weight:700;color:#e8e3f3;cursor:pointer;transition:all .18s}',
      '.c3d-seg input:checked+span{background:linear-gradient(135deg,#f3e2bd,#d4b274);color:#282233;border-color:transparent}',
      '.c3d-seg input:focus-visible+span{outline:3px solid #e3bf74;outline-offset:2px}',
      '.c3d-foot{display:flex;gap:10px;align-items:flex-start;margin:6px 22px 20px;padding:12px 14px;border-radius:12px;background:#00000026;font-size:12px;line-height:1.55;color:var(--c3d-soft)}',
      '.c3d-foot svg{flex:0 0 16px;width:16px;height:16px;color:var(--c3d-gold);margin-top:1px}',
      '.c3d-foot b{color:#fff}',
      '.c3d-status{display:flex;gap:14px;align-items:center;padding:18px 22px}',
      '.c3d-status .c3d-emblem{flex-basis:46px;height:48px}',
      '.c3d-status .c3d-emblem svg{width:30px;height:30px}',
      '.c3d-status b{display:block;font-size:14.5px;color:#fff}',
      '.c3d-status span{display:block;font-size:12.5px;color:var(--c3d-soft);margin-top:3px;line-height:1.5}',
      '.c3d-sheet{position:fixed;inset:0;z-index:2147482500;display:flex;align-items:center;justify-content:center;padding:16px;background:#0c0d1a8c;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}',
      '.c3d-sheet-card{width:100%;max-width:640px;max-height:calc(100dvh - 32px);overflow:auto;border-radius:22px}',
      '.c3d-sheet-card .c3d{margin:0}',
      '.c3d-actions{display:flex;gap:10px;justify-content:flex-end;padding:0 22px 22px}',
      '.c3d-btn{min-height:44px;padding:11px 18px;border-radius:12px;font:800 13.5px/1 inherit;font-family:inherit;cursor:pointer;border:1px solid #ffe5b7;background:linear-gradient(135deg,#f3e2bd,#d4b274);color:#282233}',
      '.c3d-btn[disabled]{opacity:.6;cursor:progress}',
      '.c3d-btn.ghost{background:transparent;color:#ece6f6;border-color:#ffffff33}',
      '.c3d-btn:focus-visible{outline:3px solid #e3bf74;outline-offset:3px}',
      '.c3d-err{display:none;margin:0 22px 14px;padding:10px 13px;border-radius:10px;background:#ff5a7026;border:1px solid #ff8a9a66;color:#ffd9df;font-size:12.5px}',
      '.c3d-err.show{display:block}',
      '@media(max-width:600px){.c3d-field input,.c3d-field textarea{font-size:16px}.c3d-head{padding:18px 16px 4px;gap:12px}.c3d-emblem{flex-basis:46px;height:50px}.c3d-emblem svg{width:30px;height:30px}.c3d-title{font-size:22px}.c3d-benefits{grid-template-columns:1fr;padding:14px 16px 2px}.c3d-opt{margin:14px 16px 0}.c3d-form{padding:14px 16px 2px}.c3d-grid{grid-template-columns:1fr;gap:0}.c3d-foot{margin:6px 16px 16px}.c3d-actions{padding:0 16px 16px}.c3d-actions .c3d-btn{flex:1}.c3d-sheet{align-items:flex-end;padding:0}.c3d-sheet-card{border-radius:22px 22px 0 0;max-height:92dvh}}',
      '@media(prefers-reduced-motion:reduce){.c3d.on .c3d-form{animation:none}.c3d-check svg,.c3d-opt{transition:none}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function benefitsHtml() {
    return '<ul class="c3d-benefits">' + BENEFITS.map(function (b) {
      return '<li class="c3d-benefit"><span class="c3d-benefit-ico">' + ICONS[b[0]] + '</span><span class="c3d-benefit-txt"><b>' + esc(b[1]) + '</b><span>' + esc(b[2]) + '</span></span></li>';
    }).join('') + '</ul>';
  }

  function cardHtml(id, opts) {
    var p = opts.prefill || {};
    var checked = opts.checked ? ' checked' : '';
    return '<section class="c3d' + (opts.checked ? ' on' : '') + '" aria-labelledby="' + id + '-title">'
      + '<div class="c3d-head"><div class="c3d-emblem" aria-hidden="true">' + CUBE + '</div><div>'
      +   '<div class="c3d-kicker">Cabana 3D Tour <span class="c3d-pill">Premium · Paid</span></div>'
      +   '<h2 class="c3d-title" id="' + id + '-title">Let guests walk through before they book.</h2>'
      +   '<p class="c3d-sub">Our team visits, captures every room and builds an interactive 3D walkthrough of your ' + esc(opts.noun || 'stay') + ', like the tours already live on Cabana.</p>'
      + '</div></div>'
      + benefitsHtml()
      + '<label class="c3d-opt" for="' + id + '-want"><input type="checkbox" id="' + id + '-want"' + checked + '/>'
      +   '<span class="c3d-check" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>'
      +   '<span><span class="c3d-opt-t">Yes, I want the Cabana 3D Tour</span><span class="c3d-opt-d">We will contact you with the price and a time to visit. Nothing is charged now.</span></span>'
      + '</label>'
      + '<div class="c3d-form" id="' + id + '-form">'
      +   '<div class="c3d-grid">'
      +     '<label class="c3d-field"><span>Your name</span><input id="' + id + '-name" autocomplete="name" maxlength="120" value="' + esc(p.name) + '" placeholder="Full name"/></label>'
      +     '<label class="c3d-field"><span>Phone number</span><input id="' + id + '-phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="40" value="' + esc(p.phone) + '" placeholder="+254 7XX XXX XXX"/></label>'
      +   '</div>'
      +   '<label class="c3d-field"><span>Email</span><input id="' + id + '-email" type="email" inputmode="email" autocomplete="email" maxlength="160" value="' + esc(p.email) + '" placeholder="you@example.com"/></label>'
      +   '<div class="c3d-field" role="radiogroup" aria-label="How should we reach you?"><span>How should we reach you?</span><div class="c3d-seg">'
      +     PREFS.map(function (x, i) { return '<label><input type="radio" name="' + id + '-pref" value="' + x[0] + '"' + (i === 0 ? ' checked' : '') + '/><span>' + x[1] + '</span></label>'; }).join('')
      +   '</div></div>'
      +   '<label class="c3d-field"><span>Best time to reach you <i>(optional)</i></span><input id="' + id + '-time" maxlength="120" placeholder="e.g. Weekdays after 5pm"/></label>'
      +   '<label class="c3d-field"><span>Anything we should know? <i>(optional)</i></span><textarea id="' + id + '-notes" maxlength="1000" placeholder="Number of rooms, access, a preferred visit day…"></textarea></label>'
      + '</div>'
      + '<div class="c3d-foot"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>'
      +   '<span><b>A paid upgrade, priced per property.</b> ' + esc(opts.footNote || 'Your listing publishes as normal either way. The badge and featured placement switch on once your tour is captured and live.') + '</span></div>'
      + '</section>';
  }

  function mount(el, opts) {
    opts = opts || {};
    if (!el) return null;
    injectStyles();
    var id = 'c3d' + (++uid);
    el.innerHTML = cardHtml(id, opts);
    var root = el.querySelector('.c3d');
    var $ = function (s) { return document.getElementById(id + '-' + s); };
    var want = $('want');
    function sync() {
      root.classList.toggle('on', want.checked);
      if (typeof opts.onChange === 'function') opts.onChange(api.value());
    }
    want.addEventListener('change', function () {
      sync();
      if (want.checked) setTimeout(function () { ($('phone').value ? $('name') : $('phone')).focus({ preventScroll: true }); }, 60);
    });
    el.addEventListener('input', function () { if (typeof opts.onChange === 'function') opts.onChange(api.value()); });

    var api = {
      value: function () {
        var pref = root.querySelector('input[name="' + id + '-pref"]:checked');
        return {
          wanted: !!want.checked,
          name: $('name').value.trim(),
          phone: $('phone').value.trim(),
          email: $('email').value.trim(),
          pref: pref ? pref.value : 'call',
          bestTime: $('time').value.trim(),
          notes: $('notes').value.trim()
        };
      },
      prefill: function (p) {
        p = p || {};
        if (p.name && !$('name').value) $('name').value = p.name;
        if (p.phone && !$('phone').value) $('phone').value = p.phone;
        if (p.email && !$('email').value) $('email').value = p.email;
      },
      set: function (v) {
        v = v || {};
        want.checked = !!v.wanted;
        if (v.name != null) $('name').value = v.name;
        if (v.phone != null) $('phone').value = v.phone;
        if (v.email != null) $('email').value = v.email;
        if (v.bestTime != null) $('time').value = v.bestTime;
        if (v.notes != null) $('notes').value = v.notes;
        if (v.pref) { var r = root.querySelector('input[name="' + id + '-pref"][value="' + v.pref + '"]'); if (r) r.checked = true; }
        root.classList.toggle('on', want.checked);
      },
      /* Returns an error message, or null when the answer is usable. */
      validate: function () {
        var v = api.value();
        [$('phone'), $('email')].forEach(function (x) { x.removeAttribute('aria-invalid'); });
        if (!v.wanted) return null;
        var digits = v.phone.replace(/\D/g, '');
        if (v.pref !== 'email' && digits.length < 9) { $('phone').setAttribute('aria-invalid', 'true'); $('phone').focus(); return 'Add a phone number so the 3D Tour team can reach you.'; }
        if (v.pref === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) { $('email').setAttribute('aria-invalid', 'true'); $('email').focus(); return 'Add an email address so the 3D Tour team can reach you.'; }
        if (!digits.length && !v.email) { $('phone').setAttribute('aria-invalid', 'true'); return 'Add a phone number or email for the 3D Tour team.'; }
        return null;
      },
      root: root
    };
    return api;
  }

  async function token(sb) {
    try { var r = await sb.auth.getSession(); return r && r.data && r.data.session ? r.data.session.access_token : null; }
    catch (e) { return null; }
  }

  async function notifyTeam(sb, requestId) {
    var t = await token(sb);
    if (!t) return false;
    for (var attempt = 0; attempt < 2; attempt++) {
      try {
        var r = await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t },
          body: JSON.stringify({ action: 'tour3d-request', requestId: requestId })
        });
        if (r.ok) return true;
        if (r.status < 500) return false;
      } catch (e) { /* network — retry once */ }
      await new Promise(function (res) { setTimeout(res, 900); });
    }
    return false;
  }

  /* Save the lead, then ask the server to email it. Resolves, never throws. */
  async function submit(sb, listingId, value, source) {
    if (!sb || !listingId || !value || !value.wanted) return { ok: false, error: 'nothing_to_send' };
    var row = {
      listing_id: listingId,
      contact_name: (value.name || '').slice(0, 120) || null,
      contact_email: (value.email || '').slice(0, 160) || null,
      contact_phone: (value.phone || '').slice(0, 40) || null,
      contact_pref: ['call', 'text', 'email'].indexOf(value.pref) > -1 ? value.pref : 'call',
      best_time: (value.bestTime || '').slice(0, 120) || null,
      notes: (value.notes || '').slice(0, 1000) || null,
      source: source || 'add_listing'
    };
    try {
      var ses = await sb.auth.getSession();
      var me = ses && ses.data && ses.data.session && ses.data.session.user;
      if (me) row.host_id = me.id;
    } catch (e) { /* the column default fills it */ }

    var requestId = null, existing = false;
    var ins = await sb.from('tour3d_requests').insert(row).select('id').single();
    if (ins.error) {
      /* 23505: an open request already exists for this listing. Same lead. */
      if (ins.error.code === '23505') {
        var ex = await sb.from('tour3d_requests').select('id')
          .eq('listing_id', listingId).in('status', ['new', 'contacted', 'scheduled'])
          .order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (ex.data) { requestId = ex.data.id; existing = true; }
      }
      if (!requestId) return { ok: false, error: ins.error.message || 'save_failed' };
    } else {
      requestId = ins.data && ins.data.id;
    }
    var emailed = existing ? true : await notifyTeam(sb, requestId);
    return { ok: true, requestId: requestId, emailed: emailed, existing: existing };
  }

  var STATUS = {
    requested: ['3D Tour requested', 'Our team will contact you with the price and a time to visit.'],
    scheduled: ['3D capture scheduled', 'Your visit is booked. The tour goes live shortly after.'],
    live:      ['3D Tour is live', 'Your stay shows the 3D TOUR badge and is featured at the top of Stays.']
  };
  function statusHtml(status) {
    var s = STATUS[status];
    if (!s) return '';
    injectStyles();
    return '<section class="c3d"><div class="c3d-status"><div class="c3d-emblem" aria-hidden="true">' + CUBE + '</div>'
      + '<div><div class="c3d-kicker">Cabana 3D Tour</div><b>' + esc(s[0]) + '</b><span>' + esc(s[1]) + '</span></div></div></section>';
  }

  /* For a listing that already exists (the listings board). */
  function openSheet(o) {
    o = o || {};
    injectStyles();
    var ret = document.activeElement;
    var sheet = document.createElement('div');
    sheet.className = 'c3d-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.innerHTML = '<div class="c3d-sheet-card"><div class="c3d-slot"></div></div>';
    document.body.appendChild(sheet);
    var prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    var slot = sheet.querySelector('.c3d-slot');
    var ctl = mount(slot, {
      prefill: o.prefill, checked: true,
      noun: (o.listing && o.listing.title) ? '“' + o.listing.title + '”' : 'stay',
      footNote: 'Nothing is charged now. The badge and featured placement switch on once your tour is captured and live.'
    });
    sheet.setAttribute('aria-labelledby', ctl.root.getAttribute('aria-labelledby'));
    var section = slot.querySelector('.c3d');
    section.insertAdjacentHTML('beforeend',
      '<div class="c3d-err" role="alert"></div><div class="c3d-actions"><button type="button" class="c3d-btn ghost" data-c3d="close">Not now</button><button type="button" class="c3d-btn" data-c3d="send">Request my 3D Tour</button></div>');
    var err = section.querySelector('.c3d-err');
    function close() {
      sheet.remove();
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
      if (ret && ret.focus) ret.focus({ preventScroll: true });
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    sheet.addEventListener('click', function (e) { if (e.target === sheet) close(); });
    section.querySelector('[data-c3d="close"]').addEventListener('click', close);
    section.querySelector('[data-c3d="send"]').addEventListener('click', async function () {
      var btn = this;
      var v = ctl.value();
      if (!v.wanted) { close(); return; }
      var problem = ctl.validate();
      if (problem) { err.textContent = problem; err.classList.add('show'); return; }
      err.classList.remove('show');
      btn.disabled = true; btn.textContent = 'Sending…';
      var r = await submit(o.sb, o.listing && o.listing.id, v, 'listings_board');
      if (!r.ok) {
        btn.disabled = false; btn.textContent = 'Request my 3D Tour';
        err.textContent = 'We could not save your request: ' + (r.error || 'please try again.');
        err.classList.add('show');
        return;
      }
      slot.innerHTML = statusHtml('requested');
      var done = document.createElement('div');
      done.className = 'c3d-actions';
      done.innerHTML = '<button type="button" class="c3d-btn">Done</button>';
      slot.querySelector('.c3d').appendChild(done);
      done.querySelector('button').addEventListener('click', close);
      done.querySelector('button').focus();
      if (typeof o.onDone === 'function') o.onDone(r);
    });
    setTimeout(function () { var f = section.querySelector('input:not([type=checkbox])'); if (f) f.focus({ preventScroll: true }); }, 60);
    return { close: close };
  }

  global.Cabana3DUpgrade = { mount: mount, submit: submit, statusHtml: statusHtml, openSheet: openSheet, benefits: BENEFITS };
})(window);
