/* ═══════════════════════════════════════════════════════════════════════════
   APATMENTO · REFERRAL ATTRIBUTION
   ─────────────────────────────────────────────────────────────────────────
   Turns a captured ?ref= code into a real `referrals` row, once, when the
   person actually has an account.

   Why this file exists.

   The site has captured ?ref= codes into localStorage for a long time, and
   referral.js has always exposed a recordReferral() to convert them. Nothing
   ever called it. So codes accumulated in browsers, `referrals` stayed empty,
   and no commission was ever payable to anybody — the whole rewards ledger
   was wired up and switched off at the last connector.

   Attribution hooks the session rather than the signup form on purpose:

     · A Google sign-up never touches the email/password signup handler, so
       anything attached there misses every OAuth account — which is most of
       them.
     · Email confirmation means the session frequently arrives on a later page
       load than the signup, sometimes in a different tab.
     · There are three separate signup paths in auth.html. One hook beats
       three, and cannot drift out of step with a fourth added later.

   Safe to run on every page, on every load. The server is idempotent, refuses
   self-referral, and refuses to attribute an account old enough that this is
   clearly not a signup.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (global) {
'use strict';

if (global.__APA_REF_ATTRIB__) return;
global.__APA_REF_ATTRIB__ = 1;

/* Same project the rest of the site talks to. The anon key is public by
   design — it is in every other client file here — and this module only ever
   uses it to READ the caller's own session. */
var SUPA_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';

var PENDING = 'apt_ref_pending';
var SESSION = 'apt_ref';
var DONE    = 'apt_ref_done';

function safe(fn, label) {
  try { return fn(); }
  catch (e) { if (global.console) console.warn('[ref:' + (label || '?') + ']', e && e.message); }
}

/* Capture on landing. referral.js does this too, but it is not on every page
   and this must not depend on load order — a code lost on the landing page
   cannot be recovered later. */
function capture() {
  var code = null;
  safe(function () {
    code = new URLSearchParams(global.location.search).get('ref');
    if (code) {
      var clean = code.trim().toUpperCase().slice(0, 20);
      sessionStorage.setItem(SESSION, clean);
      localStorage.setItem(PENDING, clean);
    }
  }, 'capture');
  return pending();
}

function pending() {
  var v = null;
  safe(function () {
    v = localStorage.getItem(PENDING) || sessionStorage.getItem(SESSION) || null;
  }, 'pending');
  return v;
}

function clear() {
  safe(function () {
    localStorage.removeItem(PENDING);
    sessionStorage.removeItem(SESSION);
  }, 'clear');
}

/* What was referred decides the rate, so it has to be right.

   A host or service provider earns the referrer less than a traveller does,
   because a host generates many bookings from one signup. Reading the role
   from the resolved session rather than from a URL parameter means someone
   cannot pick their own category by editing a link. */
function referralType(state) {
  var role = (state && state.role) || '';
  if (role === 'partner' || role === 'host')  return 'host';
  if (role === 'driver'  || role === 'agent') return 'service_provider';
  return 'user';
}

function attribute(state) {
  var code = pending();
  if (!code) return;

  /* Already attributed in this browser. The server is idempotent anyway, but
     there is no reason to send the request on every page load for a year. */
  var done = null;
  safe(function () { done = localStorage.getItem(DONE); }, 'done');
  if (done === code) { clear(); return; }

  var token = null;
  safe(function () {
    token = state && state.session && state.session.access_token;
  }, 'token');

  var client = (global.ApaSession && global.ApaSession.client()) || global.__APA_SB__ || null;
  var got = token
    ? Promise.resolve(token)
    : (client && client.auth && client.auth.getSession
        ? client.auth.getSession().then(function (r) {
            return r && r.data && r.data.session ? r.data.session.access_token : null;
          }).catch(function () { return null; })
        : Promise.resolve(null));

  got.then(function (tk) {
    if (!tk) return;
    return fetch('/api/rewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk },
      body: JSON.stringify({
        action: 'record-referral',
        code: code,
        referral_type: referralType(state),
      }),
    }).then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (j) {
        /* Clear on any settled answer, success or refusal. A code the server
           has rejected — self-referral, unknown code, account too old — will
           be rejected identically forever, and retrying it on every page load
           for the life of the browser profile helps nobody. */
        if (j && (j.ok || j.error)) {
          safe(function () { localStorage.setItem(DONE, code); }, 'mark');
          clear();
          if (j.ok && !j.skipped && global.console) {
            console.info('[ref] attributed', code, j.tier ? '· ' + j.tier : '');
          }
        }
      });
  }).catch(function () { /* offline. The code stays pending for next time. */ });
}

/* ── Getting hold of a session ────────────────────────────────────────────
   Two routes, because the two halves of the site are built differently.

   ApaSession is the right answer where it exists: one client per tab, and a
   subscription that fires again when the OAuth hand-off or a token refresh
   turns a guest into a user. subscribe, not ready — ready() fires once, on
   the guest state, and would miss the signup that just happened.

   But ApaSession is only on the app pages, and the ?ref= link is most often
   opened on a marketing page that has referral.js and nothing else. So there
   is a fallback that reads the session straight from the Supabase client
   those pages already load. Without it, attribution would depend on the
   visitor happening to land somewhere that carries the session core.       */
function watch() {
  if (global.ApaSession && global.ApaSession.subscribe) {
    safe(function () {
      global.ApaSession.subscribe(function (state) {
        if (state && state.status === 'user') attribute(state);
      });
    }, 'subscribe');
    return;
  }

  /* No session core on this page. Read it once from the shared client.
     `role` is unavailable here, so referralType falls back to 'user' — the
     conservative choice, since a traveller pays the referrer more than a host
     does and we would rather under-claim than over-claim on a guess. */
  safe(function () {
    if (typeof supabase === 'undefined' || !supabase.createClient) return;
    var sb = global.__APA_SB__ || supabase.createClient(SUPA_URL, SUPA_KEY);
    global.__APA_SB__ = sb;
    sb.auth.getSession().then(function (r) {
      var sess = r && r.data && r.data.session;
      if (sess && sess.user) attribute({ status: 'user', session: sess, role: lastRole() });
    }).catch(function () {});
  }, 'fallback');
}

/* apa-session.js persists the last resolved role here. On a page without the
   session core it is the only signal available, and a stale one is still
   better than assuming everybody is a traveller. */
function lastRole() {
  var r = null;
  safe(function () { r = localStorage.getItem('apa-last-role'); }, 'lastRole');
  return r || '';
}

capture();

/* Only reach for a session if there is actually a code waiting. On the vast
   majority of page loads there is not, and this file should cost nothing. */
if (pending()) watch();
else safe(function () {
  if (global.ApaSession && global.ApaSession.subscribe) {
    global.ApaSession.subscribe(function (state) {
      if (state && state.status === 'user' && pending()) attribute(state);
    });
  }
}, 'watch-late');

global.ApaReferralCapture = {
  pending: pending,
  attribute: attribute,
  type: referralType,
};

})(window);
