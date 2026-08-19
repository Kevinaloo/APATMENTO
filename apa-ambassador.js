/* ═══════════════════════════════════════════════════════════════════════════
   CABANA · AMBASSADOR RUNTIME
   ─────────────────────────────────────────────────────────────────────────
   Shared by ambassadors.html and ambassador-dashboard.html.

   Three jobs:
     1. Talk to /api/ambassadors with the caller's real bearer token.
     2. Theme — light / dark / system, remembered, applied before paint.
     3. The motion vocabulary: reveals, count-ups, rings, toasts.

   Rules this file keeps, learned from the rest of the codebase:
     · Nothing here may throw. A broken animation must never take down a
       dashboard someone is trying to get paid from.
     · The gate verdict is never cached. Access can be revoked between two
       page loads, and a cached "yes" is the one thing that must not survive
       a revocation.
     · No template literals in the hot paths that older embedded browsers
       still choke on — matching the convention in brand.js.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (global) {
'use strict';

if (global.ApaAmbassador) return;

var API = '/api/ambassadors';

function safe(fn, label) {
  try { return fn(); }
  catch (e) { if (global.console) console.warn('[amb:' + (label || '?') + ']', e && e.message); }
}

/* ═══ 1 · THEME ═══════════════════════════════════════════════════════════
   Applied by an inline snippet in each page's <head> before first paint —
   see themeBoot() below for the string it inlines. Doing it here alone would
   flash the wrong theme for one frame, which is exactly the kind of detail
   this programme is meant not to have.                                    */
var THEME_KEY = 'apa-amb-theme';

function getTheme() {
  var v = null;
  safe(function () { v = localStorage.getItem(THEME_KEY); }, 'getTheme');
  return v === 'light' || v === 'dark' ? v : 'system';
}

function applyTheme(mode) {
  var root = document.documentElement;
  if (mode === 'light' || mode === 'dark') root.setAttribute('data-theme', mode);
  else root.removeAttribute('data-theme');   /* system: let the media query decide */
  safe(function () {
    if (mode === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, mode);
  }, 'applyTheme');
  safe(function () {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    var dark = mode === 'dark' ||
      (mode === 'system' && global.matchMedia('(prefers-color-scheme: dark)').matches);
    meta.setAttribute('content', dark ? '#07070E' : '#F2F3FA');
  }, 'themeColor');
  document.dispatchEvent(new CustomEvent('apa:theme', { detail: { mode: mode } }));
}

/* Cycles system → dark → light → system. Three states, because "follow my
   OS" is a real preference and a two-way toggle silently discards it. */
function cycleTheme() {
  var order = { system: 'dark', dark: 'light', light: 'system' };
  var next = order[getTheme()] || 'dark';
  applyTheme(next);
  return next;
}

/* ═══ 2 · SESSION ═════════════════════════════════════════════════════════
   Leans on ApaSession, which is already the single Supabase client per tab.
   Creating a second one here would give us two GoTrue instances racing to
   refresh the same token, and intermittent 401s that look like anything but
   their real cause.                                                        */
function session() {
  return new Promise(function (resolve) {
    var done = false;
    function finish(state) {
      if (done) return; done = true; resolve(state || { status: 'guest' });
    }
    if (!global.ApaSession) { setTimeout(function () { finish(null); }, 0); return; }
    safe(function () { global.ApaSession.ready(finish); }, 'session');
    /* ApaSession resolves from localStorage first, so this only fires if the
       script failed to load at all. Better a signed-out page than a hang. */
    setTimeout(function () { finish(null); }, 6000);
  });
}

function token() {
  return session().then(function (s) {
    var t = null;
    safe(function () {
      var c = global.ApaSession && global.ApaSession.client();
      t = (s && s.session && s.session.access_token) || null;
      if (!t && c && c.auth && c.auth.getSession) return c.auth.getSession().then(function (r) {
        return r && r.data && r.data.session ? r.data.session.access_token : null;
      });
    }, 'token');
    if (t) return t;
    var c = global.ApaSession && global.ApaSession.client();
    if (!c || !c.auth || !c.auth.getSession) return null;
    return c.auth.getSession().then(function (r) {
      return (r && r.data && r.data.session && r.data.session.access_token) || null;
    }).catch(function () { return null; });
  });
}

/* ═══ 3 · API ═════════════════════════════════════════════════════════════ */
function call(action, opts) {
  opts = opts || {};
  var method = opts.method || 'GET';
  return token().then(function (tk) {
    if (!tk) return { ok: false, reason: 'not_signed_in', message: 'Please sign in to continue.' };
    var headers = { Authorization: 'Bearer ' + tk };
    if (opts.body) headers['Content-Type'] = 'application/json';
    return fetch(API + '?action=' + encodeURIComponent(action), {
      method: method,
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok && !j.error && !j.reason) j.error = 'Request failed.';
        j.httpStatus = r.status;
        return j;
      });
    });
  }).catch(function (e) {
    return { ok: false, error: 'Network error. Check your connection.', detail: e && e.message };
  });
}

var Api = {
  gate:         function ()  { return call('gate', { method: 'POST' }); },
  enrol:        function (b) { return call('enrol', { method: 'POST', body: b }); },
  me:           function ()  { return call('me'); },
  claimLead:    function (b) { return call('claim-lead', { method: 'POST', body: b }); },
  leads:        function ()  { return call('leads'); },
  draftListing: function (b) { return call('draft-listing', { method: 'POST', body: b }); },
  earnings:     function ()  { return call('earnings'); },
  leaderboard:  function ()  { return call('leaderboard'); },
  roster:       function ()  { return call('roster'); },
  invite:       function (b) { return call('invite', { method: 'POST', body: b }); },
  revoke:       function (b) { return call('revoke', { method: 'POST', body: b }); },
  review:       function (b) { return call('review', { method: 'POST', body: b }); },
};

/* ═══ 4 · FORMAT ══════════════════════════════════════════════════════════ */
function kes(n) {
  var v = Number(n || 0);
  return 'KES ' + Math.round(v).toLocaleString('en-KE');
}

function pct(n) { return Math.round(Number(n || 0) * 100) + '%'; }

/* "3 days ago" beats a timestamp for everything on this dashboard, because
   every question an ambassador asks of a date is about recency. */
function ago(iso) {
  if (!iso) return '';
  var s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  var units = [['min', 60], ['hour', 3600], ['day', 86400], ['week', 604800], ['month', 2629800], ['year', 31557600]];
  for (var i = units.length - 1; i >= 0; i--) {
    var n = Math.floor(s / units[i][1]);
    if (n >= 1) return n + ' ' + units[i][0] + (n > 1 ? 's' : '') + ' ago';
  }
  return 'just now';
}

function daysUntil(iso) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

function initials(name) {
  var p = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!p.length) return 'A';
  return ((p[0][0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

/* Everything user-supplied goes through here before it touches innerHTML.
   Lead names and notes are typed by ambassadors and read by admins, which
   is precisely the shape of a stored-XSS path if it is ever skipped. */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ═══ 5 · MOTION ══════════════════════════════════════════════════════════ */
var REDUCE = false;
safe(function () {
  REDUCE = global.matchMedia('(prefers-reduced-motion: reduce)').matches;
}, 'reduce');

/* Reveal on scroll. Anything already above the fold is released immediately
   so the first screen never animates in after the user is already reading. */
function reveals(root) {
  var els = (root || document).querySelectorAll('.reveal:not(.in)');
  if (!els.length) return;
  if (REDUCE || !global.IntersectionObserver) {
    for (var i = 0; i < els.length; i++) els[i].classList.add('in');
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var d = parseInt(e.target.getAttribute('data-delay') || '0', 10);
      setTimeout(function () { e.target.classList.add('in'); }, d);
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  for (var j = 0; j < els.length; j++) io.observe(els[j]);
}

/* Count-up. Eases out, lands exactly on the target, and skips entirely under
   reduced motion — a number that ticks is decoration, and the value is the
   point. */
function countUp(el, to, opts) {
  if (!el) return;
  opts = opts || {};
  var fmt = opts.format || function (v) { return Math.round(v).toLocaleString(); };
  var target = Number(to || 0);
  if (REDUCE) { el.textContent = fmt(target); return; }

  var from = Number(opts.from || 0);
  var dur = opts.duration || 1100;
  var t0 = null;
  function frame(ts) {
    if (t0 === null) t0 = ts;
    var p = Math.min(1, (ts - t0) / dur);
    var eased = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(from + (target - from) * eased);
    if (p < 1) requestAnimationFrame(frame);
    else el.textContent = fmt(target);
  }
  requestAnimationFrame(frame);
}

/* Progress ring. Writes the circumference into a custom property so the CSS
   transition does the animating. */
function ring(el, value, max) {
  if (!el) return;
  var bar = el.querySelector('.bar');
  var num = el.querySelector('.ring-num');
  if (!bar) return;
  var r = Number(bar.getAttribute('r') || 56);
  var circ = 2 * Math.PI * r;
  var frac = max > 0 ? Math.min(1, Math.max(0, Number(value) / Number(max))) : 0;
  bar.style.setProperty('--circ', circ);
  bar.style.strokeDasharray = circ;
  /* Two frames: one to commit the full-offset start, one to animate from it.
     Setting both in the same frame gives no transition at all. */
  bar.style.strokeDashoffset = circ;
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      bar.style.strokeDashoffset = circ * (1 - frac);
    });
  });
  if (num) countUp(num, Number(value || 0));
}

/* ═══ 6 · TOAST ═══════════════════════════════════════════════════════════ */
var ICONS = {
  ok:   '<path d="M20 6 9 17l-5-5"/>',
  err:  '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/>',
};

function toast(message, kind, ms) {
  kind = kind || 'info';
  var host = document.querySelector('.toasts');
  if (!host) {
    host = document.createElement('div');
    host.className = 'toasts';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }
  var el = document.createElement('div');
  el.className = 'toast toast-' + kind;
  el.innerHTML =
    '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[kind] || ICONS.info) + '</svg>' +
    '<span>' + esc(message) + '</span>';
  host.appendChild(el);

  var life = ms || (kind === 'err' ? 6500 : 4000);
  setTimeout(function () {
    el.classList.add('out');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 320);
  }, life);
  return el;
}

/* ═══ 7 · SMALL UI HELPERS ════════════════════════════════════════════════ */
function busy(btn, on) {
  if (!btn) return;
  btn.classList.toggle('is-loading', !!on);
  btn.disabled = !!on;
}

function copy(text) {
  return new Promise(function (resolve) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { resolve(true); },
                                              function () { resolve(fallbackCopy(text)); });
    } else resolve(fallbackCopy(text));
  });
}

function fallbackCopy(text) {
  var ok = false;
  safe(function () {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    ok = document.execCommand('copy');
    document.body.removeChild(ta);
  }, 'copy');
  return ok;
}

function boot(done) {
  var el = document.querySelector('.boot');
  if (!el) return;
  if (done) {
    el.classList.add('gone');
    setTimeout(function () { el.setAttribute('hidden', ''); }, 420);
  } else {
    el.removeAttribute('hidden');
    el.classList.remove('gone');
  }
}

/* Modal with focus containment. An ambassador filling in a lead on a phone
   with a keyboard attached should not be able to tab out into the page
   behind the dialogue. */
function modal(id, open) {
  var el = typeof id === 'string' ? document.getElementById(id) : id;
  if (!el) return;
  if (open) {
    el.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    var first = el.querySelector('input,select,textarea,button');
    if (first) setTimeout(function () { first.focus(); }, 120);
    el._esc = function (e) { if (e.key === 'Escape') modal(el, false); };
    document.addEventListener('keydown', el._esc);
  } else {
    el.setAttribute('hidden', '');
    document.body.style.overflow = '';
    if (el._esc) document.removeEventListener('keydown', el._esc);
  }
}

/* The inline <head> snippet each page uses to set the theme before first
   paint. Kept here so there is one definition of the rule, even though it is
   pasted as a string into the HTML. */
function themeBoot() {
  return "(function(){try{var t=localStorage.getItem('" + THEME_KEY + "');" +
         "if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}" +
         "document.documentElement.classList.remove('no-js');})();";
}

/* ═══ EXPORT ══════════════════════════════════════════════════════════════ */
global.ApaAmbassador = {
  api: Api,
  session: session,
  token: token,

  theme: { get: getTheme, set: applyTheme, cycle: cycleTheme, bootScript: themeBoot },

  fmt: { kes: kes, pct: pct, ago: ago, daysUntil: daysUntil, initials: initials, esc: esc },

  ui: { toast: toast, busy: busy, copy: copy, boot: boot, modal: modal,
        reveals: reveals, countUp: countUp, ring: ring },

  reduced: function () { return REDUCE; },
};

/* Apply the stored theme on load too, for anything that bypassed the inline
   snippet, and follow the OS if the user is on 'system'. */
applyTheme(getTheme());
safe(function () {
  var mq = global.matchMedia('(prefers-color-scheme: dark)');
  var onChange = function () { if (getTheme() === 'system') applyTheme('system'); };
  if (mq.addEventListener) mq.addEventListener('change', onChange);
  else if (mq.addListener) mq.addListener(onChange);
}, 'mq');

document.addEventListener('DOMContentLoaded', function () { reveals(); });

})(window);
