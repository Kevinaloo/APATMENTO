/* ══════════════════════════════════════════════════════════════
   APATMENTO. Upcoming Trip Strip
   apa-trip-strip.js

   An inline card showing the guest's next confirmed stay, mounted
   above the fold on the dashboard and the stays page.

   DESIGN RULES
   ────────────
   · Renders ONLY when a paid booking exists. No booking, no DOM, no
     layout change whatsoever. The pages look exactly as they do now
     for everyone who has not paid.
   · It is a card in the normal document flow, not an overlay. It
     pushes the content below it down and, when dismissed, that content
     flows straight back up. Nothing floats over anything.
   · Dismissal is per booking and remembered locally, but a booking
     re-announces itself on the day it starts: missing your own check-in
     because you tapped a cross three weeks earlier would be a failure
     of the product, not a preference.
   · States: counts down in days, then "Tomorrow", then "Happening
     today", then it is gone the moment the stay ends.
══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var SUPA_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
  var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';

  /* Statuses that mean money has actually moved. */
  var PAID = ['part_paid', 'confirmed_balance_due', 'paid_pending_checkin',
              'deposit_paid', 'checked_in', 'completed'];

  var DISMISS_KEY = 'apa_trip_strip_dismissed';

  /* ── date helpers: local calendar days, never UTC ──────────────── */
  function midnight(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function parseDay(iso) {
    if (!iso) return null;
    var d = new Date(String(iso).slice(0, 10) + 'T00:00:00');
    return isNaN(d) ? null : d;
  }
  function daysUntil(iso) {
    var d = parseDay(iso); if (!d) return null;
    return Math.round((midnight(d) - midnight(new Date())) / 86400000);
  }
  function fmt(iso) {
    var d = parseDay(iso); if (!d) return '';
    return d.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function getDismissed() {
    try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}'); }
    catch (_) { return {}; }
  }
  function dismiss(id) {
    var m = getDismissed();
    m[id] = Date.now();
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify(m)); } catch (_) {}
  }

  /* ── styles: injected once, only when there is something to show ── */
  function injectCSS() {
    if (document.getElementById('apa-trip-strip-css')) return;
    var s = document.createElement('style');
    s.id = 'apa-trip-strip-css';
    s.textContent = [
      '.apa-trip{position:relative;display:block;margin:0 0 18px;border-radius:22px;',
      '  overflow:hidden;cursor:pointer;border:1px solid rgba(10,10,20,.08);',
      '  background:linear-gradient(135deg,#12101F 0%,#1C1733 46%,#241B3F 100%);',
      '  box-shadow:0 10px 34px rgba(20,10,50,.18);',
      '  animation:apaTripIn .62s cubic-bezier(.16,1,.3,1) both;',
      '  -webkit-tap-highlight-color:transparent;}',
      '@keyframes apaTripIn{from{opacity:0;transform:translateY(-9px) scale(.985);}',
      '  to{opacity:1;transform:none;}}',
      '.apa-trip.apa-trip-out{animation:apaTripOut .34s cubic-bezier(.4,0,1,1) both;}',
      '@keyframes apaTripOut{to{opacity:0;transform:translateY(-8px) scale(.98);',
      '  margin-bottom:-4px;max-height:0;}}',
      '.apa-trip::after{content:"";position:absolute;inset:0;pointer-events:none;',
      '  background:radial-gradient(120% 150% at 88% 8%,rgba(123,47,247,.34),transparent 58%),',
      '  radial-gradient(90% 130% at 6% 96%,rgba(34,211,238,.20),transparent 60%);}',
      '.apa-trip-in{position:relative;z-index:1;display:flex;align-items:center;gap:15px;',
      '  padding:17px 19px;}',
      '.apa-trip-when{flex-shrink:0;width:60px;text-align:center;padding:9px 0;',
      '  border-radius:15px;background:rgba(255,255,255,.10);',
      '  border:1px solid rgba(255,255,255,.17);}',
      '.apa-trip-n{display:block;font-size:23px;font-weight:800;color:#fff;line-height:1;',
      '  letter-spacing:-.02em;}',
      '.apa-trip-u{display:block;font-size:9.5px;font-weight:700;letter-spacing:.13em;',
      '  text-transform:uppercase;color:rgba(255,255,255,.66);margin-top:4px;}',
      '.apa-trip-body{flex:1;min-width:0;}',
      '.apa-trip-kick{display:inline-flex;align-items:center;gap:6px;font-size:9.5px;',
      '  font-weight:800;letter-spacing:.15em;text-transform:uppercase;',
      '  color:rgba(255,255,255,.62);margin-bottom:5px;}',
      '.apa-trip-dot{width:5px;height:5px;border-radius:50%;background:#5EEAD4;',
      '  box-shadow:0 0 0 0 rgba(94,234,212,.75);animation:apaTripPulse 2.1s infinite;}',
      '@keyframes apaTripPulse{70%{box-shadow:0 0 0 7px rgba(94,234,212,0);}',
      '  100%{box-shadow:0 0 0 0 rgba(94,234,212,0);}}',
      '.apa-trip-name{font-size:15.5px;font-weight:750;color:#fff;letter-spacing:-.015em;',
      '  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.apa-trip-meta{font-size:12px;color:rgba(255,255,255,.66);margin-top:3px;',
      '  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.apa-trip-go{flex-shrink:0;width:32px;height:32px;border-radius:50%;',
      '  background:rgba(255,255,255,.11);border:1px solid rgba(255,255,255,.18);',
      '  display:flex;align-items:center;justify-content:center;color:#fff;',
      '  transition:transform .22s ease,background .22s ease;}',
      '.apa-trip:hover .apa-trip-go{transform:translateX(3px);background:rgba(255,255,255,.19);}',
      '.apa-trip-x{position:absolute;top:9px;right:9px;z-index:3;width:26px;height:26px;',
      '  border:none;border-radius:50%;background:rgba(255,255,255,.10);color:rgba(255,255,255,.72);',
      '  font-size:15px;line-height:1;cursor:pointer;display:flex;align-items:center;',
      '  justify-content:center;transition:background .2s ease,color .2s ease;}',
      '.apa-trip-x:hover{background:rgba(255,255,255,.22);color:#fff;}',
      '.apa-trip-today{background:linear-gradient(135deg,#0B2B24 0%,#0F3D31 48%,#12513F 100%);}',
      '.apa-trip-today .apa-trip-when{background:rgba(94,234,212,.17);',
      '  border-color:rgba(94,234,212,.34);}',
      '.apa-trip-today .apa-trip-n{font-size:15px;}',
      '@media(max-width:560px){.apa-trip-in{padding:14px 15px;gap:12px;}',
      '  .apa-trip-when{width:52px;}.apa-trip-name{font-size:14.5px;}}'
    ].join('');
    document.head.appendChild(s);
  }

  /* ── choose the single most relevant booking ───────────────────── */
  function pick(rows) {
    var dis = getDismissed();
    var best = null;

    rows.forEach(function (b) {
      if (PAID.indexOf(String(b.status)) === -1) return;

      var startIn = daysUntil(b.checkin_date);
      var endsIn  = daysUntil(b.checkout_date || b.checkin_date);
      if (startIn === null) return;

      /* Gone the moment the stay is over. */
      if (endsIn !== null && endsIn < 0) return;

      /* Respect a dismissal, except on the day it actually matters
         a cross tapped weeks ago must not hide today's check-in. */
      if (dis[b.id] && startIn > 0) return;

      if (!best || startIn < best._in) { b._in = startIn; b._ends = endsIn; best = b; }
    });

    return best;
  }

  function render(b, mount) {
    injectCSS();

    var today = b._in <= 0;
    var n, u, kick;

    if (b._in > 1)       { n = b._in; u = 'days';  kick = 'Upcoming stay'; }
    else if (b._in === 1){ n = 1;     u = 'day';   kick = 'Tomorrow'; }
    else                 { n = 'NOW'; u = 'today'; kick = 'Happening today'; }

    var el = document.createElement('div');
    el.className = 'apa-trip' + (today ? ' apa-trip-today' : '');
    el.setAttribute('role', 'link');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', 'View your booking at ' + (b.apartment_name || 'your stay'));

    var meta = [
      fmt(b.checkin_date),
      b.checkout_date ? fmt(b.checkout_date) : null
    ].filter(Boolean).join('  \u2192  ');
    if (b.nights) meta += '  \u00b7  ' + b.nights + (b.nights > 1 ? ' nights' : ' night');

    el.innerHTML =
      '<button class="apa-trip-x" aria-label="Dismiss">\u00d7</button>'
      + '<div class="apa-trip-in">'
      + '  <div class="apa-trip-when">'
      + '    <span class="apa-trip-n">' + n + '</span>'
      + '    <span class="apa-trip-u">' + u + '</span>'
      + '  </div>'
      + '  <div class="apa-trip-body">'
      + '    <div class="apa-trip-kick"><span class="apa-trip-dot"></span>' + kick + '</div>'
      + '    <div class="apa-trip-name">' + esc(b.apartment_name || 'Your stay') + '</div>'
      + '    <div class="apa-trip-meta">' + esc(meta) + '</div>'
      + '  </div>'
      + '  <div class="apa-trip-go">'
      + '    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
      + '      stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">'
      + '      <path d="M9 18l6-6-6-6"/></svg>'
      + '  </div>'
      + '</div>';

    function open() { window.location.href = 'my-bookings.html'; }

    el.addEventListener('click', function (e) {
      if (e.target.closest('.apa-trip-x')) return;
      open();
    });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });

    el.querySelector('.apa-trip-x').addEventListener('click', function (e) {
      e.stopPropagation();
      dismiss(b.id);
      /* Collapse rather than vanish, so the cards below glide back up
         instead of snapping. */
      el.style.maxHeight = el.offsetHeight + 'px';
      el.classList.add('apa-trip-out');
      setTimeout(function () { el.remove(); }, 340);
    });

    mount.insertBefore(el, mount.firstChild);
  }

  /* ── boot ──────────────────────────────────────────────────────── */
  async function boot() {
    var mount = document.getElementById('apa-trip-mount');
    if (!mount) return;

    var sb = null;
    try {
      if (!window.supabase || !window.supabase.createClient) return;
      sb = window.supabase.createClient(SUPA_URL, SUPA_KEY);
    } catch (e) { return; }

    try {
      var ses = await sb.auth.getSession();
      var uid = ses && ses.data && ses.data.session && ses.data.session.user
              ? ses.data.session.user.id : null;
      if (!uid) return;                       // signed out. Nothing to show

      /* SELECT * so a schema change can never blank this out. */
      var res = await sb.from('apartment_bookings').select('*').eq('guest_id', uid);
      if (res.error) { console.warn('[trip-strip]', res.error.message); return; }

      var b = pick(res.data || []);
      if (b) render(b, mount);
    } catch (e) {
      console.warn('[trip-strip]', e.message);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
