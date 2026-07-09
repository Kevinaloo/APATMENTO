/* ═══════════════════════════════════════════════════════════════════
   APATMENTO · CHROME  v2
   ───────────────────────────────────────────────────────────────────
   Header controls (SOS · notifications · avatar · partner switch)
   and the guest/user nav swap.

   Why this exists: these controls used to be mutated by whichever
   script happened to run. When one threw, the header froze half-built.

   Now: a SINGLE render(state) function is the only thing that ever
   touches the DOM. It is idempotent, total (handles every state), and
   driven purely by ApaSession. It cannot half-apply, because it never
   branches out of itself early.

   Visibility is expressed with ONE mechanism: a data-attribute on
   <html>. No inline display juggling, no !important wars.
     <html data-auth="guest">  |  <html data-auth="user">
     <html data-role="guest">  |  <html data-role="partner">
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  if (global.ApaChrome) return;
  var doc = global.document;

  function safe(fn, l) {
    try { return fn(); } catch (e) { if (global.console) console.warn('[chrome:' + (l || '?') + ']', e && e.message); }
  }
  function $(id) { return doc.getElementById(id); }
  function txt(el, v) { if (el && el.textContent !== v) el.textContent = v; }

  /* ═══ STYLES ═════════════════════════════════════════════════════
     Single source of truth for chrome visibility. Because these keys
     off <html>, they apply before first paint — no flash of the wrong
     nav, and no dependence on any script having finished.            */
  var CSS = ''
    /* --- auth-gated visibility --- */
    + '[data-auth="user"]  [data-when="guest"]{display:none!important}'
    + '[data-auth="guest"] [data-when="user"]{display:none!important}'
    + '[data-auth="guest"] [data-when="admin"]{display:none!important}'
    + '[data-admin="no"]   [data-when="admin"]{display:none!important}'

    /* --- the header cluster --- */
    + '.apa-nav{display:flex;align-items:center;gap:8px;}'
    + '@media(max-width:640px){.apa-nav{gap:6px;}}'

    /* --- SOS --- */
    + '.apa-sos{display:inline-flex;align-items:center;gap:6px;flex-shrink:0;'
    + 'padding:8px 15px;border-radius:100px;border:none;cursor:pointer;'
    + 'background:linear-gradient(135deg,#FF3B5C,#E11D48);color:#fff;'
    + 'font:600 12px/1 var(--font-body,system-ui);letter-spacing:.04em;'
    + 'box-shadow:0 4px 16px rgba(225,29,72,.3);'
    + 'transition:transform .2s ease,box-shadow .2s ease;}'
    + '.apa-sos:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(225,29,72,.42);}'
    + '.apa-sos:active{transform:translateY(0);}'
    + '.apa-sos svg{flex-shrink:0;}'
    + '@media(prefers-reduced-motion:no-preference){'
    + '.apa-sos{animation:apaSosPulse 2.8s ease-in-out infinite;}}'
    + '@keyframes apaSosPulse{0%,100%{box-shadow:0 4px 16px rgba(225,29,72,.3)}'
    + '50%{box-shadow:0 4px 22px rgba(225,29,72,.55)}}'
    + '@media(max-width:560px){.apa-sos{padding:8px 11px;}.apa-sos .apa-sos-t{display:none;}}'

    /* --- icon buttons (bell) --- */
    + '.apa-ico{position:relative;display:inline-flex;align-items:center;justify-content:center;'
    + 'width:38px;height:38px;flex-shrink:0;border-radius:50%;cursor:pointer;'
    + 'border:1px solid rgba(10,10,20,.09);background:rgba(255,255,255,.7);'
    + 'color:var(--ink,#0A0A14);transition:background .2s,transform .2s,border-color .2s;}'
    + '.apa-ico:hover{background:#fff;transform:translateY(-1px);border-color:rgba(67,97,255,.3);}'
    + '.apa-ico-dot{position:absolute;top:7px;right:8px;width:8px;height:8px;border-radius:50%;'
    + 'background:#FF3B5C;border:2px solid #fff;display:none;}'
    + '.apa-ico[data-unread="1"] .apa-ico-dot{display:block;}'
    + '@media(max-width:560px){.apa-ico{width:34px;height:34px;}}'

    /* --- avatar --- */
    + '.apa-avatar{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;'
    + 'width:38px;height:38px;border-radius:50%;cursor:pointer;border:none;'
    + 'background:linear-gradient(135deg,#4361FF,#7B2FF7);color:#fff;'
    + 'font:700 14px/1 var(--font-body,system-ui);letter-spacing:.01em;'
    + 'box-shadow:0 3px 12px rgba(67,97,255,.32);transition:transform .2s,box-shadow .2s;}'
    + '.apa-avatar:hover{transform:translateY(-1px) scale(1.04);box-shadow:0 6px 18px rgba(67,97,255,.45);}'
    + '@media(max-width:560px){.apa-avatar{width:34px;height:34px;font-size:13px;}}'

    /* --- welcome text: first to go on small screens --- */
    + '.apa-welcome{font:500 13px/1 var(--font-body,system-ui);color:var(--ink-soft,#4a4a5a);'
    + 'white-space:nowrap;max-width:150px;overflow:hidden;text-overflow:ellipsis;}'
    + '@media(max-width:900px){.apa-welcome{display:none;}}'

    /* --- admin chip --- */
    + '.apa-admin{display:inline-flex;align-items:center;gap:5px;flex-shrink:0;'
    + 'padding:7px 11px;border-radius:100px;text-decoration:none;'
    + 'background:rgba(123,47,247,.1);border:1px solid rgba(123,47,247,.3);'
    + 'color:#7B2FF7;font:700 11px/1 var(--font-body,system-ui);letter-spacing:.04em;}'
    + '@media(max-width:760px){.apa-admin span{display:none;}.apa-admin{padding:7px;}}'

    /* ═══ PARTNER SWITCH — permanent, never hidden ═══
       Previously toggled by 3 competing rules. Now: always in flow,
       label swaps with role. Signed-out users get "Become a partner". */
    + '.apa-psc{display:flex!important;align-items:center;justify-content:space-between;gap:14px;'
    + 'width:100%;box-sizing:border-box;padding:16px 20px;margin:0 0 22px;'
    + 'border-radius:20px;cursor:pointer;position:relative;overflow:hidden;'
    + 'background:linear-gradient(135deg,rgba(67,97,255,.08),rgba(123,47,247,.06));'
    + 'border:1.5px solid rgba(67,97,255,.18);'
    + 'transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease;'
    + '-webkit-tap-highlight-color:transparent;text-align:left;font-family:inherit;}'
    + '.apa-psc:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(67,97,255,.15);'
    + 'border-color:rgba(67,97,255,.35);}'
    + '.apa-psc:focus-visible{outline:2px solid #4361FF;outline-offset:2px;}'
    + '.apa-psc-l{display:flex;align-items:center;gap:14px;min-width:0;}'
    + '.apa-psc-i{width:44px;height:44px;flex-shrink:0;border-radius:14px;display:flex;'
    + 'align-items:center;justify-content:center;color:#fff;'
    + 'background:linear-gradient(135deg,#4361FF,#7B2FF7);'
    + 'box-shadow:0 4px 14px rgba(67,97,255,.3);transition:transform .3s;}'
    + '.apa-psc:hover .apa-psc-i{transform:rotate(-8deg) scale(1.05);}'
    + '.apa-psc-tx{min-width:0;display:block;}'
    + '.apa-psc-k,.apa-psc-t,.apa-psc-s{display:block;}'
    + '.apa-psc-k{font:700 10px/1 var(--font-body,system-ui);letter-spacing:.07em;'
    + 'text-transform:uppercase;color:#4361FF;margin-bottom:4px;}'
    + '.apa-psc-t{font:700 15px/1.2 var(--font-body,system-ui);color:var(--ink,#0A0A14);'
    + 'margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}'
    + '.apa-psc-s{font:400 12px/1.3 var(--font-body,system-ui);color:var(--ink-faint,#8a8a99);'
    + 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}'
    + '.apa-psc-a{flex-shrink:0;color:#4361FF;opacity:.5;transition:transform .3s,opacity .3s;}'
    + '.apa-psc:hover .apa-psc-a{opacity:1;transform:translateX(4px);}'
    + '[data-role="partner"] .apa-psc{'
    + 'background:linear-gradient(135deg,rgba(45,212,191,.1),rgba(67,97,255,.06));'
    + 'border-color:rgba(45,212,191,.28);}'
    + '[data-role="partner"] .apa-psc-k{color:#0D9488;}'
    + '[data-role="partner"] .apa-psc-i{background:linear-gradient(135deg,#2DD4BF,#0D9488);'
    + 'box-shadow:0 4px 14px rgba(13,148,136,.3);}'
    + '[data-role="partner"] .apa-psc-a{color:#0D9488;}'
    + '@media(max-width:600px){.apa-psc{padding:13px 15px;border-radius:16px;gap:10px;}'
    + '.apa-psc-i{width:38px;height:38px;border-radius:11px;}'
    + '.apa-psc-s{display:none;}}'

    /* --- modals --- */
    + '.apa-sheet{position:fixed;inset:0;z-index:9999;display:none;'
    + 'align-items:center;justify-content:center;padding:18px;'
    + 'background:rgba(10,10,20,.55);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);}'
    + '.apa-sheet[data-open="1"]{display:flex;}'
    + '.apa-sheet-c{width:100%;max-width:420px;max-height:86vh;overflow-y:auto;'
    + 'background:#fff;border-radius:24px;padding:26px;'
    + 'box-shadow:0 24px 70px rgba(10,10,20,.3);'
    + 'animation:apaPop .32s cubic-bezier(.22,1,.36,1);}'
    + '@keyframes apaPop{from{opacity:0;transform:translateY(18px) scale(.97)}'
    + 'to{opacity:1;transform:none}}'
    + '@media(max-width:520px){.apa-sheet{padding:0;align-items:flex-end;}'
    + '.apa-sheet-c{max-width:none;border-radius:24px 24px 0 0;max-height:88vh;}}'
    + '.apa-sheet-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;}'
    + '.apa-sheet-t{font:700 19px/1.2 var(--font-body,system-ui);color:#0A0A14;}'
    + '.apa-x{width:34px;height:34px;border-radius:50%;border:none;cursor:pointer;'
    + 'background:rgba(10,10,20,.05);color:#0A0A14;font-size:19px;line-height:1;flex-shrink:0;}'
    + '.apa-x:hover{background:rgba(10,10,20,.1);}'
    + '.apa-sos-row{display:flex;align-items:center;gap:13px;width:100%;box-sizing:border-box;'
    + 'padding:14px 16px;margin-bottom:9px;border-radius:15px;text-decoration:none;'
    + 'border:1.5px solid rgba(10,10,20,.08);background:rgba(10,10,20,.02);'
    + 'color:#0A0A14;transition:border-color .2s,transform .2s,background .2s;}'
    + '.apa-sos-row:hover{border-color:#FF3B5C;background:rgba(255,59,92,.05);transform:translateX(3px);}'
    + '.apa-sos-em{font-size:23px;line-height:1;flex-shrink:0;}'
    + '.apa-sos-n{font:700 14px/1.3 var(--font-body,system-ui);}'
    + '.apa-sos-d{font:400 12px/1.3 var(--font-body,system-ui);color:#8a8a99;}'
    + '.apa-empty{text-align:center;padding:40px 16px;color:#8a8a99;}'
    + '.apa-empty-e{font-size:38px;margin-bottom:12px;}'
    /* ══ VIEWPORT SAFETY — applies on every page that loads chrome ══
       Guarantees nothing can push the layout wider than the screen,
       on phones or desktop. Cheap, global, and impossible to regress. */
    + '*,*::before,*::after{box-sizing:border-box;}'
    + 'html,body{max-width:100%;overflow-x:clip;}'
    + '@supports not (overflow:clip){html,body{overflow-x:hidden;}}'
    + 'img,video,svg,canvas,iframe{max-width:100%;}'
    + 'pre,code{overflow-x:auto;max-width:100%;}'
    /* Long unbroken strings (emails, URLs) must wrap, not overflow. */
    + '.apa-welcome,.apa-psc-t,.apa-psc-s,.apa-sos-n{overflow-wrap:anywhere;}'
    /* Respect notches / home indicator on iOS. */
    + '.apa-sheet{padding-bottom:env(safe-area-inset-bottom,0);}'
    ;

  function injectCSS() {
    if ($('apa-chrome-css')) return;
    var s = doc.createElement('style');
    s.id = 'apa-chrome-css';
    s.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(s);
  }

  /* ═══ SVG ════════════════════════════════════════════════════════ */
  var SVG = {
    sos: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 2 19h20z"/><path d="M12 9v4M12 17h.01"/></svg>',
    bell: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="M3.3 16.6c-.6.7-.1 1.8.8 1.8h15.8c.9 0 1.4-1.1.8-1.8C19.5 15 18 13.2 18 8A6 6 0 0 0 6 8c0 5.2-1.5 7-2.7 8.6"/></svg>',
    swap: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4"/></svg>',
    arrow: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>',
    gear: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
  };

  /* ═══ SHEETS (SOS / notifications) ═══════════════════════════════ */
  /* Real Kenyan emergency lines — preserved from the original build. */
  var SOS_CONTACTS = [
    { e: '🚨', n: 'Call 999',          d: 'Police · Fire · Ambulance',   h: '999' },
    { e: '📞', n: 'Call 112',          d: 'Emergency, all networks',     h: '112' },
    { e: '🏥', n: 'Nairobi Hospital',  d: '0800 720 940',                h: '0800720940' },
    { e: '🛡️', n: 'Apatmento Support', d: '24/7 guest safety line',      h: '+254700000000' }
  ];


  function sheet(id, title, body) {
    var el = $(id);
    if (!el) {
      el = doc.createElement('div');
      el.id = id;
      el.className = 'apa-sheet';
      el.innerHTML =
        '<div class="apa-sheet-c" role="dialog" aria-modal="true">' +
        '<div class="apa-sheet-h"><div class="apa-sheet-t"></div>' +
        '<button class="apa-x" aria-label="Close">&times;</button></div>' +
        '<div class="apa-sheet-b"></div></div>';
      doc.body.appendChild(el);

      el.addEventListener('click', function (e) {
        if (e.target === el || (e.target.classList && e.target.classList.contains('apa-x'))) close(id);
      });
    }
    el.querySelector('.apa-sheet-t').textContent = title;
    el.querySelector('.apa-sheet-b').innerHTML = body;
    el.setAttribute('data-open', '1');
    return el;
  }
  function close(id) { var el = $(id); if (el) el.removeAttribute('data-open'); }

  doc.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    safe(function () {
      var o = doc.querySelectorAll('.apa-sheet[data-open="1"]');
      Array.prototype.forEach.call(o, function (n) { n.removeAttribute('data-open'); });
    }, 'esc');
  });

  function openSOS() {
    var rows = SOS_CONTACTS.map(function (c) {
      return '<a class="apa-sos-row" href="tel:' + c.h + '">' +
        '<span class="apa-sos-em">' + c.e + '</span>' +
        '<span><span class="apa-sos-n">' + c.n + '</span><br>' +
        '<span class="apa-sos-d">' + c.d + '</span></span></a>';
    }).join('');
    sheet('apa-sos-sheet', 'Emergency help',
      '<p style="font:400 13px/1.5 system-ui;color:#8a8a99;margin:0 0 16px">' +
      'Apatmento is not an emergency service. Contact local authorities immediately.</p>' + rows);
  }

  function openNotifications() {
    sheet('apa-notif-sheet', 'Notifications',
      '<div class="apa-empty"><div class="apa-empty-e">🔔</div>' +
      '<div style="font:700 14px/1.3 system-ui;color:#0A0A14;margin-bottom:6px">You\'re all caught up</div>' +
      '<div style="font:400 13px/1.4 system-ui">Booking updates and messages will appear here.</div></div>');
  }

  /* ═══ ROLE ═══════════════════════════════════════════════════════ */
  function switchRole() {
    var st = global.ApaSession ? global.ApaSession.get() : { status: 'guest' };
    if (st.status !== 'user') {
      global.location.href = 'auth.html?next=partner';
      return;
    }
    var next = st.role === 'partner' ? 'guest' : 'partner';
    var u = new URL(global.location.href);
    if (next === 'partner') u.searchParams.set('role', 'partner');
    else u.searchParams.delete('role');
    global.location.href = u.toString();
  }

  /* ═══ RENDER — the ONLY function that touches chrome DOM ══════════
     Total, idempotent, non-throwing. Given any state it produces a
     fully consistent header. There is no path where it half-applies. */
  function render(st) {
    st = st || { status: 'guest', role: 'guest' };
    var isUser = st.status === 'user';
    var isPartner = st.role === 'partner';
    var root = doc.documentElement;

    // Flags drive ALL visibility via CSS. No inline display anywhere.
    root.setAttribute('data-auth', isUser ? 'user' : 'guest');
    root.setAttribute('data-role', isPartner ? 'partner' : 'guest');
    root.setAttribute('data-admin', (isUser && st.isAdmin) ? 'yes' : 'no');

    safe(function () {
      txt($('apa-welcome'), isUser ? 'Welcome, ' + st.name : '');
      txt($('apa-avatar'), isUser ? st.initial : '?');

      // Partner switch card — always present, label reflects state.
      var k = $('apa-psc-k'), t = $('apa-psc-t'), s = $('apa-psc-s');
      if (!isUser) {
        txt(k, 'Partner mode');
        txt(t, 'Become a partner');
        txt(s, 'List your space and start earning');
      } else if (isPartner) {
        txt(k, 'Guest mode');
        txt(t, 'Switch to Guest');
        txt(s, 'Browse stays, flights and more');
      } else {
        txt(k, 'Partner mode');
        txt(t, 'Switch to Partner');
        txt(s, 'Manage listings, bookings & earnings');
      }
    }, 'render');
  }

  /* ═══ MOUNT ══════════════════════════════════════════════════════ */
  function mount() {
    injectCSS();

    // Delegated: survives any re-render, needs no re-binding, and
    // cannot be lost when other scripts replace innerHTML.
    if (!doc.__apaChromeBound) {
      doc.__apaChromeBound = 1;
      doc.addEventListener('click', function (e) {
        var el = e.target && e.target.closest ? e.target.closest('[data-apa]') : null;
        if (!el) return;
        var act = el.getAttribute('data-apa');
        if (act === 'sos') { e.preventDefault(); openSOS(); }
        else if (act === 'notif') { e.preventDefault(); openNotifications(); }
        else if (act === 'role') { e.preventDefault(); switchRole(); }
        else if (act === 'signout') { e.preventDefault(); global.ApaSession.signOut(); }
      });
    }

    // Render immediately from whatever we know (usually guest), then
    // on every session change. Never wait — never flash a broken header.
    render(global.ApaSession ? global.ApaSession.get() : null);
    if (global.ApaSession) global.ApaSession.subscribe(render);
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', mount);
  else mount();

  global.ApaChrome = {
    render: render,
    openSOS: openSOS,
    openNotifications: openNotifications,
    switchRole: switchRole,
    closeSheet: close,
    SVG: SVG
  };

  // Back-compat: old inline onclick="openSOS()" handlers keep working.
  global.openSOS = openSOS;
  global.openNotifications = openNotifications;
  global.switchRole = switchRole;

})(window);
