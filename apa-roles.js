/* ═══════════════════════════════════════════════════════════════════════════
   CABANA · ROLES
   apa-roles.js

   One person, several ways of using Cabana. A host books holidays. An agent
   owns a flat. An ambassador is a traveller on Saturday. The product has
   always known this and the navigation never did: switching was a handful of
   one-way links, each written into a different dashboard by a different
   hand, so from the partner board you could reach the traveller view and
   nothing else, and "switch to agent" did not exist anywhere at all.

   This file is the whole model, once, so every dashboard offers every other
   one and describes it in the same words.

     traveller    book stays, safaris, rides, events
     partner      list and manage what you sell
     agent        represent other people's listings for commission
     influencer   an agent with an audience — the creator surface
     ambassador   the invited field team

   THREE RULES THAT MATTER
   ───────────────────────
   1. A role you do not have shows the way IN, not an error. "Switch to
      agent" for somebody who is not an agent is a dead end; "Become an
      agent" is a funnel. The only exception is the ambassador programme,
      which is invitation-only —

   2. — so ambassador is HIDDEN, never offered. Not greyed out, not
      "request access". Advertising a door that opens for almost nobody
      generates support mail and teaches people the product is arbitrary.
      It appears once ambassador_gate() says yes and not before.

   3. Nothing here decides access. Each destination re-runs its own gate on
      arrival, because a link is a suggestion and the page is the lock. This
      file getting the answer wrong costs a redirect, never a permission.

   MOUNTING
     <div data-apa-roles></div>            the switcher button, inline
     <div data-apa-roles="menu"></div>     plain links, for a drawer
     ApaRoles.mount(el, opts)              the same, by hand
     ApaRoles.open()                       the sheet, from your own button

   The current role is read from `data-apa-role` on <html> or <body>, or
   from ?role=, or guessed from the filename — so a page that says nothing
   still gets a correct switcher.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.ApaRoles) return;

  var doc = global.document;

  function warn(label, e) {
    if (global.console) console.warn('[roles:' + label + ']', e && e.message);
  }
  function safe(fn, label) { try { return fn(); } catch (e) { warn(label, e); } }

  function client() {
    try {
      if (global.ApaSession && global.ApaSession.client) return global.ApaSession.client();
    } catch (e) { warn('client', e); }
    return global.sb || null;
  }

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  }

  /* ── The roles ────────────────────────────────────────────────────────
     `href` is where you go if you have it. `join` is where you go if you do
     not. `verb` is what the button says in each case, written out rather
     than assembled, because "Become a influencer" is what string
     concatenation gives you.                                             */
  var ROLES = [
    {
      key: 'traveller',
      label: 'Traveller',
      tagline: 'Book stays, safaris, rides, flights and events.',
      href: 'dashboard.html?role=guest&back=1',
      join: null,                       // everyone is already a traveller
      switchVerb: 'Switch to Traveller',
      accent: '#7C3AED',
      icon: '<path d="M3 10.5 12 4l9 6.5"/><path d="M5 9.5V20h14V9.5"/><path d="M9 20v-5a3 3 0 0 1 6 0v5"/>'
    },
    {
      key: 'partner',
      label: 'Partner',
      tagline: 'List a property, tour, car or event and keep 100% of it.',
      href: 'dashboard.html?role=partner&back=1',
      join: 'become-partner.html',
      switchVerb: 'Switch to Partner',
      joinVerb: 'Become a partner',
      accent: '#0D9488',
      icon: '<path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/>'
    },
    {
      key: 'agent',
      label: 'Agent',
      tagline: 'Sell other people’s listings and earn the commission you agreed with them.',
      href: 'agent-dashboard.html',
      join: 'agents.html',
      switchVerb: 'Switch to Agent',
      joinVerb: 'Become an agent',
      accent: '#2563EB',
      icon: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'
    },
    {
      key: 'influencer',
      label: 'Influencer',
      tagline: 'Promote host-approved listings to your audience using tracked links and agreed commission.',
      href: 'agent-dashboard.html?mode=influencer',
      join: 'influencers.html',
      switchVerb: 'Switch to Influencer',
      joinVerb: 'Become an influencer',
      accent: '#FF6B2C',
      icon: '<path d="M12 2 4 6v6c0 5 3.4 9.4 8 10 4.6-.6 8-5 8-10V6z"/><path d="M8.5 12.5 11 15l4.5-4.5"/>'
    },
    {
      key: 'ambassador',
      label: 'Ambassador',
      tagline: 'Help new hosts and travellers join Cabana. Manage your invited field-work pipeline.',
      href: 'ambassador-dashboard.html',
      join: null,                       // invitation only. Never advertised.
      switchVerb: 'Switch to Ambassador',
      inviteOnly: true,
      accent: '#6D28FF',
      icon: '<path d="M12 2 4 6v6c0 5 3.4 9.4 8 10 4.6-.6 8-5 8-10V6z"/><path d="m9 12 2 2 4-4"/>'
    }
  ];

  function roleFor(key) {
    for (var i = 0; i < ROLES.length; i++) if (ROLES[i].key === key) return ROLES[i];
    return null;
  }

  /* ── Which role is this page? ─────────────────────────────────────────
     Declared wins, then the URL, then the filename. The fallback matters:
     it means a page can adopt the switcher with one div and no other
     change, which is the only way this ends up everywhere rather than on
     the three dashboards somebody remembered. */
  function current() {
    var declared = safe(function () {
      return (doc.documentElement.getAttribute('data-apa-role')
           || (doc.body && doc.body.getAttribute('data-apa-role')) || '').trim();
    }, 'declared');
    if (declared && roleFor(declared)) return declared;

    var qs = safe(function () { return new URLSearchParams(global.location.search); }, 'qs');
    var mode = qs && qs.get('mode');
    var role = qs && qs.get('role');
    var path = String(global.location.pathname || '').toLowerCase();

    if (path.indexOf('ambassador-dashboard') > -1) return 'ambassador';
    if (path.indexOf('agent-dashboard') > -1) return mode === 'influencer' ? 'influencer' : 'agent';
    if (path.indexOf('partner-') > -1) return 'partner';
    if (role === 'partner') return 'partner';
    return 'traveller';
  }

  /* ── What can this person actually be? ────────────────────────────────
     One agents read and one gate RPC, cached for the life of the tab. The
     answers only change when somebody signs up for something, and that
     always navigates. */
  var _status = null;

  function status() {
    if (_status) return _status;
    _status = new Promise(function (resolve) {
      var out = {
        traveller:  true,      // everyone
        partner:    true,      // anyone may list; become-partner explains it
        agent:      false,
        influencer: false,
        ambassador: false
      };
      var c = client();
      if (!c) { resolve(out); return; }

      var done = 0;
      function finish() { if (++done === 2) resolve(out); }

      /* An influencer is an agent with an audience — `is_creator` on the
         same row — so both answers come from one read.

         `.eq('id', uid)` is not decoration. The agents SELECT policy also
         lets a HOST read the agents who represent their listings, so an
         unfiltered `limit(1)` would hand a host somebody else's row and
         tell them they are an agent. RLS scoped this read to "rows you may
         see", which is not the same question as "are you one". */
      try {
        var auth = c.auth && c.auth.getUser ? c.auth.getUser() : Promise.resolve(null);
        auth.then(function (u) {
          var uid = u && u.data && u.data.user && u.data.user.id;
          if (!uid) { finish(); return; }
          c.from('agents').select('id,is_creator').eq('id', uid).maybeSingle()
            .then(function (r) {
              var row = r && r.data;
              if (row) { out.agent = true; out.influencer = !!row.is_creator; }
              finish();
            }, function () { finish(); });
        }, function () { finish(); });
      } catch (e) { warn('agents', e); finish(); }

      /* The same authority the ambassador dashboard enforces on arrival, so
         a stale reveal here buys nothing — the page still refuses. Failure
         is silent, and a missing entry is a far better outcome than a
         broken one. */
      /* An invited ambassador who still owes one step (a confirmed email,
         or the identity check the programme now requires) IS an
         ambassador. Hiding the role from them was the bug: they had no
         way to find the door, let alone open it. They see the role with
         what is left to do; the gateway page walks them through it. */
      try {
        if (!c.rpc) { finish(); return; }
        c.rpc('ambassador_gate').then(function (r) {
          var v = r && r.data;
          if (v && v.ok) out.ambassador = true;
          else if (v && (v.reason === 'identity_required' || v.reason === 'email_unconfirmed')) {
            out.ambassador = 'pending';
            out.ambassadorStep = v.reason;
          }
          finish();
        }, function () { finish(); });
      } catch (e) { warn('gate', e); finish(); }

      /* Never hang a menu on a slow network. */
      setTimeout(function () { resolve(out); }, 4000);
    });
    return _status;
  }

  /* ── Going somewhere ──────────────────────────────────────────────────
     Two pieces of stored state decide where a later sign-in LANDS, and
     both are set here rather than in five dashboards:

       apa-last-role  the traveller/partner preference
       apa-amb-view   'guest' while an ambassador prefers the traveller side

     Leaving these to the individual pages is how "switch to traveller"
     came to mean three different things depending on which screen you
     pressed it from. */
  function go(key, st) {
    var role = roleFor(key);
    if (!role) return;
    /* An ambassador with a step left goes to the gateway, which says what
       the step is and starts it, rather than to a dashboard that would
       turn them away. */
    if (key === 'ambassador' && st && st.ambassador === 'pending') {
      global.location.href = 'ambassadors.html';
      return;
    }

    safe(function () {
      if (key === 'traveller' || key === 'partner') {
        localStorage.setItem('apa-last-role', key === 'partner' ? 'partner' : 'guest');
      }
      /* Coming back to the ambassador dashboard clears the preference for
         the traveller view; going anywhere else sets it, so an ambassador
         who prefers another surface is not re-routed here every sign-in. */
      if (key === 'ambassador') localStorage.removeItem('apa-amb-view');
      else if (current() === 'ambassador') localStorage.setItem('apa-amb-view', 'guest');
    }, 'remember');

    global.location.href = role.href;
  }

  function join(key) {
    var role = roleFor(key);
    if (!role || !role.join) return;
    global.location.href = role.join;
  }

  /* ── Styles ───────────────────────────────────────────────────────────
     Self-contained and token-light: this renders on six dashboards with six
     different palettes, and a switcher that inherits one of them looks
     broken on the other five. */
  var CSS_ID = 'apa-roles-css';
  var CSS = ''
  + '.apa-rt{display:inline-flex;align-items:center;gap:7px;padding:8px 14px;border-radius:100px;'
  +   'border:1.5px solid currentColor;background:transparent;color:inherit;cursor:pointer;'
  +   'font-family:inherit;font-size:12.5px;font-weight:700;line-height:1;white-space:nowrap;'
  +   'opacity:.82;transition:opacity .2s,transform .2s}'
  + '.apa-rt:hover{opacity:1;transform:translateY(-1px)}'
  + '.apa-rt svg{width:14px;height:14px;flex:none}'
  + '.apa-rt-dot{width:6px;height:6px;border-radius:50%;flex:none}'

  + '.apa-rs-scrim{position:fixed;inset:0;background:rgba(9,10,20,.5);backdrop-filter:blur(4px);'
  +   'opacity:0;pointer-events:none;transition:opacity .24s;z-index:2400}'
  + '.apa-rs-scrim.on{opacity:1;pointer-events:auto}'
  + '.apa-rs{position:fixed;z-index:2401;left:50%;top:50%;transform:translate(-50%,-46%) scale(.97);'
  +   'width:min(430px,calc(100vw - 32px));max-height:min(86vh,660px);overflow:auto;'
  +   'background:#fff;color:#0C0D1A;border-radius:24px;box-shadow:0 30px 90px rgba(9,10,20,.3);'
  +   'opacity:0;pointer-events:none;transition:opacity .24s,transform .24s cubic-bezier(.22,1,.36,1);'
  +   'font-family:system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}'
  + '.apa-rs.on{opacity:1;pointer-events:auto;transform:translate(-50%,-50%) scale(1)}'
  + '@media (max-width:520px){.apa-rs{top:auto;bottom:0;left:0;width:100%;max-width:none;'
  +   'border-radius:24px 24px 0 0;transform:translateY(14px)}'
  +   '.apa-rs.on{transform:none}}'
  + '@media (prefers-color-scheme:dark){.apa-rs{background:#15161F;color:#F2F3F9}}'
  + '[data-theme="dark"] .apa-rs{background:#15161F;color:#F2F3F9}'

  + '.apa-rs-h{padding:22px 22px 6px}'
  + '.apa-rs-h h2{margin:0 0 5px;font-size:19px;font-weight:800;letter-spacing:-.02em}'
  + '.apa-rs-h p{margin:0;font-size:13px;line-height:1.6;opacity:.62}'
  + '.apa-rs-l{padding:14px;display:grid;gap:6px}'
  + '.apa-ri{display:flex;gap:13px;align-items:center;width:100%;text-align:left;padding:13px 14px;'
  +   'border-radius:16px;border:1.5px solid transparent;background:transparent;color:inherit;'
  +   'cursor:pointer;font-family:inherit;transition:background .18s,border-color .18s}'
  + '.apa-ri:hover{background:rgba(125,125,160,.09)}'
  + '.apa-ri:focus-visible{outline:2px solid currentColor;outline-offset:2px}'
  + '.apa-ri[aria-current="true"]{border-color:rgba(125,125,160,.28);'
  +   'background:rgba(125,125,160,.07);cursor:default}'
  + '.apa-ri-i{width:40px;height:40px;flex:none;border-radius:13px;display:grid;place-items:center;color:#fff}'
  + '.apa-ri-i svg{width:19px;height:19px}'
  + '.apa-ri-b{flex:1;min-width:0}'
  + '.apa-ri-t{font-size:14.5px;font-weight:750;display:flex;align-items:center;gap:7px;margin-bottom:2px}'
  + '.apa-ri-d{font-size:12px;line-height:1.55;opacity:.6}'
  + '.apa-ri-tag{font-size:9.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;'
  +   'padding:3px 7px;border-radius:100px;background:rgba(125,125,160,.16);opacity:.8}'
  + '.apa-ri-tag-step{background:rgba(109,40,255,.14);color:#6D28FF;opacity:1}'
  + '.apa-ri-go{flex:none;opacity:.35}'
  + '.apa-ri-go svg{width:16px;height:16px}'
  + '.apa-rs-f{padding:4px 22px 20px;font-size:11.5px;line-height:1.6;opacity:.5}'
  + '.apa-rs-x{position:absolute;top:16px;right:16px;width:32px;height:32px;border-radius:10px;'
  +   'border:none;background:rgba(125,125,160,.12);color:inherit;cursor:pointer;display:grid;place-items:center}'

  /* Menu form, for a drawer that already has its own link styling. */
  + '.apa-rm{display:grid;gap:2px}'
  + '.apa-rm-i{display:flex;align-items:center;gap:13px;padding:13px 14px;border-radius:14px;'
  +   'font-size:14px;font-weight:500;text-decoration:none;cursor:pointer;color:inherit;'
  +   'background:transparent;border:none;width:100%;text-align:left;font-family:inherit;'
  +   'transition:background .2s}'
  + '.apa-rm-i:hover{background:rgba(125,125,160,.1)}'
  + '.apa-rm-i svg{width:20px;height:20px;flex:none}';

  function injectCSS() {
    safe(function () {
      if (doc.getElementById(CSS_ID)) return;
      var st = doc.createElement('style');
      st.id = CSS_ID; st.textContent = CSS;
      doc.head.appendChild(st);
    }, 'css');
  }

  function iconSVG(role) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
         + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + role.icon + '</svg>';
  }

  /* ── The sheet ────────────────────────────────────────────────────── */
  var _sheet = null;

  function buildSheet() {
    if (_sheet) return _sheet;
    injectCSS();

    var scrim = doc.createElement('div');
    scrim.className = 'apa-rs-scrim';
    scrim.addEventListener('click', close);

    var sheet = doc.createElement('div');
    sheet.className = 'apa-rs';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', 'Switch how you use Cabana');

    doc.body.appendChild(scrim);
    doc.body.appendChild(sheet);
    _sheet = { scrim: scrim, sheet: sheet };
    return _sheet;
  }

  function paint(st) {
    var s = buildSheet();
    var here = current();

    var rows = ROLES.map(function (r) {
      var have = !!st[r.key];
      var pending = st[r.key] === 'pending';
      var isHere = r.key === here;
      var verb = isHere ? 'You are here'
               : pending ? (st.ambassadorStep === 'email_unconfirmed' ? 'Confirm your email to unlock' : 'Verify your ID to unlock')
               : have   ? r.switchVerb
               : r.inviteOnly ? 'By invitation only'
                        : (r.joinVerb || ('Become a ' + r.label.toLowerCase()));

      return '<button class="apa-ri" data-role="' + esc(r.key) + '" data-have="' + have + '"'
        + (isHere ? ' aria-current="true" disabled' : '') + '>'
        +   '<span class="apa-ri-i" style="background:' + esc(r.accent) + '">' + iconSVG(r) + '</span>'
        +   '<span class="apa-ri-b">'
        +     '<span class="apa-ri-t">' + esc(r.label)
        +       (isHere ? '<span class="apa-ri-tag">You are here</span>'
                        : pending ? '<span class="apa-ri-tag apa-ri-tag-step">One step left</span>'
                        : (!have ? '<span class="apa-ri-tag">' + (r.inviteOnly ? 'Invite only' : 'Not yet') + '</span>' : ''))
        +     '</span>'
        +     '<span class="apa-ri-d">' + esc(isHere ? r.tagline : verb + ' · ' + r.tagline) + '</span>'
        +   '</span>'
        +   (isHere ? '' : '<span class="apa-ri-go"><svg viewBox="0 0 24 24" fill="none" '
        +     'stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'
        +     '<path d="M9 18l6-6-6-6"/></svg></span>')
        + '</button>';
    }).join('');

    s.sheet.innerHTML =
        '<button class="apa-rs-x" data-close aria-label="Close">'
      +   '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" '
      +   'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>'
      + '</button>'
      + '<div class="apa-rs-h"><h2>How do you want to use Cabana?</h2>'
      +   '<p>One account, every side of the platform. Switch whenever you like — '
      +   'nothing you have built goes anywhere.</p></div>'
      + '<div class="apa-rs-l">' + rows + '</div>'
      + '<div class="apa-rs-f">Your listings, bookings, earnings and messages stay exactly '
      +   'where they are in every view.</div>';

    s.sheet.querySelectorAll('[data-close]').forEach(function (b) {
      b.addEventListener('click', close);
    });
    s.sheet.querySelectorAll('[data-role]').forEach(function (b) {
      b.addEventListener('click', function () {
        var key = b.getAttribute('data-role');
        if (b.getAttribute('data-have') === 'true') go(key, st);
        else if (key === 'ambassador' && !(st.ambassador === 'pending')) { close(); gate(); }
        else join(key);
      });
    });
  }

  function open() {
    var s = buildSheet();
    /* Paint from whatever is known now, then repaint when the reads land.
       An empty sheet while a gate RPC runs is a sheet people close. */
    paint({ traveller: true, partner: true, agent: false, influencer: false, ambassador: false });
    s.scrim.classList.add('on');
    s.sheet.classList.add('on');
    safe(function () { doc.documentElement.style.overflow = 'hidden'; }, 'lock');
    status().then(function (st) {
      if (s.sheet.classList.contains('on')) paint(st);
      safe(function () { s.sheet.querySelector('.apa-ri:not([disabled])').focus(); }, 'focus');
    });
  }

  function close() {
    if (!_sheet) return;
    _sheet.scrim.classList.remove('on');
    _sheet.sheet.classList.remove('on');
    safe(function () { doc.documentElement.style.overflow = ''; }, 'unlock');
  }

  safe(function () {
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
  }, 'esc');


  /* ── "This account is not part of that" ───────────────────────────────
     Shown instead of a dead end when somebody who has not been invited
     reaches for the Ambassador programme. It says what is true, and gives
     them a real way to ask: a message that arrives in the admin inbox
     (api/contact-admin → Resend), with their account attached so nobody
     has to ask who they are. */
  var GATE_CSS = ''
    + '.apa-g-scrim{position:fixed;inset:0;z-index:2500;background:rgba(9,10,20,.55);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);opacity:0;pointer-events:none;transition:opacity .24s}'
    + '.apa-g-scrim.on{opacity:1;pointer-events:auto}'
    + '.apa-g{position:fixed;z-index:2501;left:50%;top:50%;width:min(440px,calc(100vw - 28px));max-height:calc(100dvh - 32px);overflow:auto;background:#fff;color:#0C0D1A;'
    +   'border-radius:26px;padding:26px 22px 22px;box-shadow:0 30px 90px rgba(9,10,20,.35);opacity:0;pointer-events:none;transform:translate(-50%,-46%) scale(.97);'
    +   'transition:opacity .24s,transform .28s cubic-bezier(.22,1,.36,1);font-family:system-ui,-apple-system,"Segoe UI",Inter,sans-serif;-webkit-font-smoothing:antialiased}'
    + '.apa-g.on{opacity:1;pointer-events:auto;transform:translate(-50%,-50%)}'
    + '@media(max-width:520px){.apa-g{left:0;right:0;top:auto;bottom:0;width:auto;border-radius:26px 26px 0 0;transform:translateY(14px);padding-bottom:calc(22px + env(safe-area-inset-bottom,0px))}.apa-g.on{transform:none}}'
    + '@media(prefers-color-scheme:dark){.apa-g{background:#15161F;color:#F2F3F9}}[data-theme="dark"] .apa-g{background:#15161F;color:#F2F3F9}'
    + '.apa-g-i{width:54px;height:54px;border-radius:18px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#6D28FF,#4F6DFF);margin-bottom:16px;box-shadow:0 12px 28px -10px rgba(109,40,255,.6)}'
    + '.apa-g-i svg{width:26px;height:26px}'
    + '.apa-g h2{margin:0 0 8px;font-size:20px;line-height:1.25;font-weight:800;letter-spacing:-.02em}'
    + '.apa-g p{margin:0 0 18px;font-size:14px;line-height:1.65;opacity:.7}'
    + '.apa-g label{display:block;font-size:12px;font-weight:700;margin:0 0 6px;opacity:.8}'
    + '.apa-g textarea,.apa-g input{width:100%;box-sizing:border-box;border-radius:14px;border:1.5px solid rgba(125,125,160,.35);background:transparent;color:inherit;font:500 15px/1.5 inherit;padding:12px 14px;outline:none;transition:border-color .16s}'
    + '.apa-g textarea{min-height:120px;resize:vertical}'
    + '.apa-g textarea:focus,.apa-g input:focus{border-color:#6D28FF}'
    + '.apa-g-f{margin-bottom:14px}'
    + '.apa-g-r{display:flex;gap:10px;flex-wrap:wrap}'
    + '.apa-g-b{flex:1;min-width:140px;min-height:48px;border-radius:15px;border:1.5px solid rgba(125,125,160,.35);background:transparent;color:inherit;font:700 14.5px inherit;cursor:pointer;transition:transform .16s,opacity .16s}'
    + '.apa-g-b:active{transform:scale(.97)}'
    + '.apa-g-b.p{border-color:transparent;color:#fff;background:linear-gradient(135deg,#6D28FF,#4F6DFF);box-shadow:0 12px 26px -12px rgba(109,40,255,.8)}'
    + '.apa-g-b[disabled]{opacity:.55;cursor:default}'
    + '.apa-g-m{font-size:12.5px;line-height:1.55;margin:10px 0 0;min-height:18px}'
    + '.apa-g-m.e{color:#E11D48}.apa-g-m.ok{color:#059669;font-weight:700}';

  var _gate = null;

  function gateEnsure() {
    if (_gate) return _gate;
    safe(function () {
      if (!doc.getElementById('apa-g-css')) {
        var st = doc.createElement('style'); st.id = 'apa-g-css'; st.textContent = GATE_CSS; doc.head.appendChild(st);
      }
    }, 'gate-css');
    var scrim = doc.createElement('div'); scrim.className = 'apa-g-scrim';
    var box = doc.createElement('div'); box.className = 'apa-g';
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Ambassador access');
    scrim.addEventListener('click', gateClose);
    doc.body.appendChild(scrim); doc.body.appendChild(box);
    _gate = { scrim: scrim, box: box };
    return _gate;
  }

  function gateClose() {
    if (!_gate) return;
    _gate.scrim.classList.remove('on'); _gate.box.classList.remove('on');
    safe(function () { doc.documentElement.style.overflow = ''; }, 'unlock');
  }

  function accountEmail() {
    return new Promise(function (resolve) {
      var c = client();
      if (!c || !c.auth || !c.auth.getSession) { resolve({ email: '', token: '' }); return; }
      c.auth.getSession().then(function (r) {
        var s = r && r.data && r.data.session;
        resolve({ email: (s && s.user && s.user.email) || '', token: (s && s.access_token) || '' });
      }, function () { resolve({ email: '', token: '' }); });
    });
  }

  function gate() {
    var g = gateEnsure();
    accountEmail().then(function (acct) {
      var shield = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 6v6c0 5 3.4 9.4 8 10 4.6-.6 8-5 8-10V6z"/><path d="M12 8v4M12 16h.01"/></svg>';
      g.box.innerHTML =
          '<div class="apa-g-i">' + shield + '</div>'
        + '<h2>This account isn’t part of the Ambassador programme</h2>'
        + '<p>Ambassadors are a hand-picked field team, joined by invitation only'
        + (acct.email ? ', and <b>' + esc(acct.email) + '</b> hasn’t been invited' : ', and this account hasn’t been invited')
        + ' — so this service isn’t available to it. If you think that’s a mistake, or you’d like to be considered, send us a message and we’ll get back to you.</p>'
        + '<div class="apa-g-r"><button type="button" class="apa-g-b p" data-g-contact>Contact support</button>'
        + '<button type="button" class="apa-g-b" data-g-close>Close</button></div>';
      g.box.querySelector('[data-g-close]').addEventListener('click', gateClose);
      g.box.querySelector('[data-g-contact]').addEventListener('click', function () { gateContact(acct); });
      g.scrim.classList.add('on'); g.box.classList.add('on');
      safe(function () { doc.documentElement.style.overflow = 'hidden'; }, 'lock');
      safe(function () { g.box.querySelector('[data-g-contact]').focus(); }, 'focus');
    });
  }

  function gateContact(acct) {
    var g = gateEnsure();
    g.box.innerHTML =
        '<h2>Message our team</h2>'
      + '<p>Tell us who you are and why you’re interested. It goes straight to the Cabana admin team.</p>'
      + (acct.email ? '' : '<div class="apa-g-f"><label for="apa-g-em">Your email</label><input id="apa-g-em" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com"></div>')
      + '<div class="apa-g-f"><label for="apa-g-msg">Your message</label><textarea id="apa-g-msg" maxlength="2000" placeholder="Hi, I’d like to join the Ambassador programme because…"></textarea></div>'
      + '<div class="apa-g-r"><button type="button" class="apa-g-b p" data-g-send>Send message</button><button type="button" class="apa-g-b" data-g-close>Cancel</button></div>'
      + '<p class="apa-g-m" role="status" aria-live="polite"></p>';
    var msg = g.box.querySelector('#apa-g-msg'), em = g.box.querySelector('#apa-g-em');
    var note = g.box.querySelector('.apa-g-m'), send = g.box.querySelector('[data-g-send]');
    g.box.querySelector('[data-g-close]').addEventListener('click', gateClose);
    safe(function () { msg.focus(); }, 'focus');

    send.addEventListener('click', function () {
      var text = msg.value.trim(), mail = acct.email || (em && em.value.trim()) || '';
      note.className = 'apa-g-m e';
      if (text.length < 10) { note.textContent = 'Please write a little more so we can help.'; return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) { note.textContent = 'Add a valid email so we can reply to you.'; return; }
      send.disabled = true; send.textContent = 'Sending…'; note.className = 'apa-g-m'; note.textContent = '';
      var headers = { 'Content-Type': 'application/json' };
      if (acct.token) headers.Authorization = 'Bearer ' + acct.token;
      fetch('/api/contact-admin', {
        method: 'POST', headers: headers,
        body: JSON.stringify({ topic: 'ambassador-access', message: text, email: mail, page: global.location.pathname })
      }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok && j.ok !== false, j: j }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error((res.j && res.j.error) || 'send_failed');
          g.box.innerHTML = '<div class="apa-g-i" style="background:linear-gradient(135deg,#10B981,#2DD4BF)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>'
            + '<h2>Message sent</h2><p>Thank you. We’ll reply to <b>' + esc(mail) + '</b> as soon as we can.</p>'
            + '<div class="apa-g-r"><button type="button" class="apa-g-b p" data-g-close>Done</button></div>';
          g.box.querySelector('[data-g-close]').addEventListener('click', gateClose);
        })
        .catch(function (e) {
          send.disabled = false; send.textContent = 'Send message';
          note.className = 'apa-g-m e';
          note.innerHTML = (e && e.message === 'rate_limit_exceeded' ? 'You’ve sent a few messages already — please wait a minute.' : 'We couldn’t send that just now.')
            + ' You can also email <a href="mailto:connect@cabana.africa?subject=' + encodeURIComponent('Ambassador programme') + '">connect@cabana.africa</a>.';
        });
    });
  }

  safe(function () { doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') gateClose(); }); }, 'gate-esc');

  /* ── Mounting ─────────────────────────────────────────────────────── */

  function mountTrigger(host, opts) {
    opts = opts || {};
    injectCSS();
    var here = roleFor(current()) || ROLES[0];
    host.innerHTML =
        '<button class="apa-rt" type="button" aria-haspopup="dialog">'
      +   '<span class="apa-rt-dot" style="background:' + esc(here.accent) + '"></span>'
      +   esc(opts.label || (here.label + ' view'))
      +   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" '
      +   'stroke-linecap="round" stroke-linejoin="round"><path d="m7 15 5 5 5-5M7 9l5-5 5 5"/></svg>'
      + '</button>';
    host.querySelector('button').addEventListener('click', open);
  }

  /* Plain rows, for a drawer that has already styled its own links. Only
     the roles this person can actually reach, plus the ways in — the same
     invitation-only rule applies. */
  function mountMenu(host) {
    injectCSS();
    var here = current();
    return status().then(function (st) {
      host.innerHTML = '<div class="apa-rm">' + ROLES.filter(function (r) {
        return r.key !== here;
      }).map(function (r) {
        var have = !!st[r.key];
        var pending = st[r.key] === 'pending';
        return '<button class="apa-rm-i" data-role="' + esc(r.key) + '" data-have="' + have + '">'
          + '<span style="color:' + esc(r.accent) + ';display:inline-flex">' + iconSVG(r) + '</span>'
          + esc(pending ? r.switchVerb + ' · one step left' : have ? r.switchVerb
              : r.inviteOnly ? r.label + ' · by invitation' : (r.joinVerb || ('Become a ' + r.label.toLowerCase())))
          + '</button>';
      }).join('') + '</div>';

      host.querySelectorAll('[data-role]').forEach(function (b) {
        b.addEventListener('click', function () {
          var key = b.getAttribute('data-role');
          if (b.getAttribute('data-have') === 'true') go(key, st);
          else if (key === 'ambassador' && st.ambassador !== 'pending') gate();
          else join(key);
        });
      });
      return st;
    });
  }

  function mount(host, opts) {
    if (typeof host === 'string') host = doc.querySelector(host);
    if (!host) return;
    if ((opts && opts.as === 'menu') || host.getAttribute('data-apa-roles') === 'menu') {
      return mountMenu(host);
    }
    return mountTrigger(host, opts);
  }

  function autoMount() {
    safe(function () {
      doc.querySelectorAll('[data-apa-roles]').forEach(function (el) { mount(el); });
    }, 'auto');
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', autoMount);
  else autoMount();

  global.ApaRoles = {
    ROLES: ROLES,
    roleFor: roleFor,
    current: current,
    status: status,
    go: go,
    join: join,
    open: open,
    close: close,
    gate: gate,
    mount: mount,
    refresh: function () { _status = null; return status(); }
  };
})(window);
