/* ═══════════════════════════════════════════════════════════════════
   APATMENTO · ADMIN GUARD  v1
   ───────────────────────────────────────────────────────────────────
   Admins do not browse the consumer site. Ever.

   Drop this on EVERY page, before apa-chrome.js. If the signed-in
   email is on the admin roster, the guard performs a hard takeover:
   the consumer page never paints, and the operator lands in the
   console. There is no "extra admin tab". There is only the console.

   Escape hatch: ?asguest=1 lets an operator inspect the live consumer
   surface for QA. It is session-scoped, loud, and never sticky.

   Zero dependencies. Never throws. Runs before first paint.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  if (global.ApaAdminGuard) return;

  var CONSOLE_PAGE = '/admin.html';
  var ADMINS = ['apatmento@gmail.com', 'worlddossy@gmail.com'];

  /* Pages an admin is allowed to load without redirect. */
  /* Pages an admin may load without being bounced to the console.
     The ambassador surfaces are on this list because they are operator
     pages, not consumer ones — the roster console lives on the gateway, so
     bouncing an admin away from it would make the roster unmanageable. */
  var ALLOW = ['/admin.html', '/auth.html', '/offline.html',
               '/ambassadors.html', '/ambassador-dashboard.html',
               /* The support desk is an operator surface. Bouncing an
                  agent off it to the console would mean nobody could
                  ever answer a guest. */
               '/support-console.html'];

  var doc = global.document;

  function safe(fn, label) {
    try { return fn(); }
    catch (e) { if (global.console) console.warn('[guard:' + (label || '?') + ']', e && e.message); }
  }

  function path() {
    var p = global.location.pathname || '/';
    if (p === '/' || p === '') p = '/index.html';
    if (p.charAt(p.length - 1) === '/') p += 'index.html';
    return p.toLowerCase();
  }

  function allowed() {
    var p = path();
    for (var i = 0; i < ALLOW.length; i++) if (p === ALLOW[i]) return true;
    return false;
  }

  function guestMode() {
    var v = false;
    safe(function () {
      var q = new URLSearchParams(global.location.search);
      if (q.get('asguest') === '1') {
        sessionStorage.setItem('apa-admin-asguest', '1');
        v = true;
      } else {
        v = sessionStorage.getItem('apa-admin-asguest') === '1';
      }
    }, 'guestMode');
    return v;
  }

  function exitGuestMode() {
    safe(function () { sessionStorage.removeItem('apa-admin-asguest'); }, 'exitGuest');
    global.location.href = CONSOLE_PAGE;
  }

  /* ── The curtain ──────────────────────────────────────────────
     We paint an opaque cover the instant we suspect an admin, so the
     consumer page never flashes. Removed if the guess was wrong.   */
  var curtainEl = null;
  function curtain() {
    if (curtainEl || !doc.documentElement) return;
    safe(function () {
      var d = doc.createElement('div');
      d.id = 'apa-admin-curtain';
      d.setAttribute('style', [
        'position:fixed', 'inset:0', 'z-index:2147483647',
        'background:#08080F',
        'display:flex', 'align-items:center', 'justify-content:center',
        'font:500 13px/1.4 system-ui,-apple-system,sans-serif',
        'letter-spacing:.14em', 'text-transform:uppercase',
        'color:#8B8EAC'
      ].join(';'));
      d.textContent = 'Opening console';
      (doc.body || doc.documentElement).appendChild(d);
      curtainEl = d;
    }, 'curtain');
  }

  function lift() {
    safe(function () {
      if (curtainEl && curtainEl.parentNode) curtainEl.parentNode.removeChild(curtainEl);
      curtainEl = null;
    }, 'lift');
  }

  /* ── Guest-mode banner ────────────────────────────────────────
     If an operator is deliberately viewing the consumer site, we make
     that impossible to forget.                                     */
  function banner() {
    safe(function () {
      if (doc.getElementById('apa-guest-banner')) return;
      var b = doc.createElement('div');
      b.id = 'apa-guest-banner';
      b.setAttribute('style', [
        'position:fixed', 'left:0', 'right:0', 'bottom:0', 'z-index:2147483000',
        'background:linear-gradient(90deg,#FF6A3C,#F5B12E)',
        'color:#08080F', 'padding:9px 16px',
        'display:flex', 'align-items:center', 'justify-content:center', 'gap:14px',
        'font:600 12px/1 system-ui,-apple-system,sans-serif',
        'letter-spacing:.04em',
        'box-shadow:0 -4px 24px rgba(255,106,60,.34)'
      ].join(';'));

      var span = doc.createElement('span');
      span.textContent = 'ADMIN · viewing consumer site as guest';

      var btn = doc.createElement('button');
      btn.textContent = 'Return to console';
      btn.setAttribute('style', [
        'background:#08080F', 'color:#fff', 'border:0',
        'padding:6px 13px', 'border-radius:99px', 'cursor:pointer',
        'font:600 11px/1 system-ui,sans-serif', 'letter-spacing:.06em'
      ].join(';'));
      btn.addEventListener('click', exitGuestMode);

      b.appendChild(span);
      b.appendChild(btn);
      (doc.body || doc.documentElement).appendChild(b);
    }, 'banner');
  }

  /* ── Fast path: read the cached JWT straight from localStorage ──
     Supabase persists the session under 'apa-auth'. Decoding it here
     means we know the email before any network call, before paint.  */
  function cachedEmail() {
    var email = '';
    safe(function () {
      var raw = localStorage.getItem('apa-auth');
      if (!raw) return;
      var obj = JSON.parse(raw);
      var e = obj && obj.user && obj.user.email;
      if (!e && obj && obj.access_token) {
        var seg = obj.access_token.split('.')[1];
        if (seg) {
          var pad = seg.replace(/-/g, '+').replace(/_/g, '/');
          while (pad.length % 4) pad += '=';
          var claims = JSON.parse(atob(pad));
          e = claims && claims.email;
        }
      }
      email = String(e || '').toLowerCase().trim();
    }, 'cachedEmail');
    return email;
  }

  function isAdminEmail(e) {
    return !!e && ADMINS.indexOf(String(e).toLowerCase().trim()) > -1;
  }

  function takeover() {
    if (allowed()) return;
    curtain();
    safe(function () {
      var from = global.location.pathname + global.location.search;
      global.location.replace(CONSOLE_PAGE + '?from=' + encodeURIComponent(from));
    }, 'takeover');
  }

  /* ── Boot ─────────────────────────────────────────────────────── */
  function evaluate(email) {
    var admin = isAdminEmail(email);

    safe(function () {
      doc.documentElement.setAttribute('data-admin', admin ? 'yes' : 'no');
      doc.documentElement.setAttribute('data-surface', admin ? 'console' : 'consumer');
    }, 'flags');

    if (!admin) { lift(); return; }

    if (guestMode()) {
      lift();
      if (doc.body) banner();
      else doc.addEventListener('DOMContentLoaded', banner);
      return;
    }

    takeover();
  }

  /* Synchronous first pass. The whole point of the guard. */
  var early = cachedEmail();
  if (isAdminEmail(early) && !allowed() && !guestMode()) curtain();
  evaluate(early);

  /* Reconcile with the authoritative session once ApaSession resolves.
     Covers fresh sign-in, token rotation and a cold localStorage.    */
  function attach() {
    if (!global.ApaSession || !global.ApaSession.subscribe) return false;
    global.ApaSession.subscribe(function (st) {
      var e = st && st.user && st.user.email;
      evaluate(String(e || '').toLowerCase().trim());
    });
    return true;
  }

  if (!attach()) {
    var tries = 0;
    var t = setInterval(function () {
      if (attach() || ++tries > 60) clearInterval(t);
    }, 50);
  }

  global.ApaAdminGuard = {
    isAdmin: isAdminEmail,
    admins: ADMINS.slice(),
    exitGuestMode: exitGuestMode,
    inGuestMode: guestMode
  };

})(window);
