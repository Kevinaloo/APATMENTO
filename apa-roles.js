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
      join: 'become-agent.html',
      switchVerb: 'Switch to Agent',
      joinVerb: 'Become an agent',
      accent: '#2563EB',
      icon: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'
    },
    {
      key: 'influencer',
      label: 'Influencer',
      tagline: 'Post your links, earn on every booking they bring for 30 days.',
      href: 'agent-dashboard.html?mode=influencer',
      join: 'auth.html?panel=influencer',
      switchVerb: 'Switch to Influencer',
      joinVerb: 'Become an influencer',
      accent: '#FF6B2C',
      icon: '<path d="M12 2 4 6v6c0 5 3.4 9.4 8 10 4.6-.6 8-5 8-10V6z"/><path d="M8.5 12.5 11 15l4.5-4.5"/>'
    },
    {
      key: 'ambassador',
      label: 'Ambassador',
      tagline: 'Your field pipeline, claims and commission.',
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
      safe(function () {
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
      }, 'agents') || finish();

      /* The same authority the ambassador dashboard enforces on arrival, so
         a stale reveal here buys nothing — the page still refuses. Failure
         is silent, and a missing entry is a far better outcome than a
         broken one. */
      safe(function () {
        if (!c.rpc) { finish(); return; }
        c.rpc('ambassador_gate').then(function (r) {
          if (r && r.data && r.data.ok) out.ambassador = true;
          finish();
        }, function () { finish(); });
      }, 'gate') || finish();

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
  function go(key) {
    var role = roleFor(key);
    if (!role) return;

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

    var rows = ROLES.filter(function (r) {
      /* Invitation-only and not invited: not a row, not a greyed-out row,
         nothing. See rule 2 at the top of this file. */
      return !(r.inviteOnly && !st[r.key]);
    }).map(function (r) {
      var have = !!st[r.key];
      var isHere = r.key === here;
      var verb = isHere ? 'You are here'
               : have   ? r.switchVerb
                        : (r.joinVerb || ('Become a ' + r.label.toLowerCase()));

      return '<button class="apa-ri" data-role="' + esc(r.key) + '" data-have="' + have + '"'
        + (isHere ? ' aria-current="true" disabled' : '') + '>'
        +   '<span class="apa-ri-i" style="background:' + esc(r.accent) + '">' + iconSVG(r) + '</span>'
        +   '<span class="apa-ri-b">'
        +     '<span class="apa-ri-t">' + esc(r.label)
        +       (isHere ? '<span class="apa-ri-tag">You are here</span>'
                        : (!have ? '<span class="apa-ri-tag">Not yet</span>' : ''))
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
        if (b.getAttribute('data-have') === 'true') go(key); else join(key);
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
        if (r.key === here) return false;
        if (r.inviteOnly && !st[r.key]) return false;
        return true;
      }).map(function (r) {
        var have = !!st[r.key];
        return '<button class="apa-rm-i" data-role="' + esc(r.key) + '" data-have="' + have + '">'
          + '<span style="color:' + esc(r.accent) + ';display:inline-flex">' + iconSVG(r) + '</span>'
          + esc(have ? r.switchVerb : (r.joinVerb || ('Become a ' + r.label.toLowerCase())))
          + '</button>';
      }).join('') + '</div>';

      host.querySelectorAll('[data-role]').forEach(function (b) {
        b.addEventListener('click', function () {
          var key = b.getAttribute('data-role');
          if (b.getAttribute('data-have') === 'true') go(key); else join(key);
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
    mount: mount,
    refresh: function () { _status = null; return status(); }
  };
})(window);
