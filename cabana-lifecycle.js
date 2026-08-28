/* ══════════════════════════════════════════════════════════════════════
   CABANA · LIFECYCLE MAIL
   cabana-lifecycle.js

   The emails that should arrive without anybody deciding to send them.

     · a brand new account gets a welcome, once, ever
     · an existing account signing in from a device we have not seen
       gets a security note naming the device
     · a host publishing their first listing gets the partner welcome,
       from partnership@ rather than connect@

   WHY THIS IS SAFE FROM THE BROWSER
   ─────────────────────────────────
   /api/email pins a browser-triggered send to the caller's OWN verified
   address, and every send here carries a dedupe key that the email_log
   holds a unique index on. So the worst a tampered client can achieve is
   sending itself one email it was going to receive anyway. The "once,
   ever" guarantee is the database's, not this file's — this file only
   decides WHEN to ask.

   Nothing here blocks, retries hard, or throws. A welcome email that
   fails is a welcome email that fails; it is not a broken sign-in.
   ══════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.__cbnLifecycle) return;
  global.__cbnLifecycle = true;

  var LS_DEVICES = 'cbn.devices';     // fingerprints this account has signed in from
  var LS_SENT    = 'cbn.lifecycle';   // local echo of what we have already asked for
  var NEW_ACCOUNT_WINDOW_MS = 10 * 60 * 1000;

  function ls(k, v) {
    try {
      if (v === undefined) return global.localStorage.getItem(k);
      global.localStorage.setItem(k, v); return v;
    } catch (e) { return null; }
  }
  function jsonLs(k) { try { return JSON.parse(ls(k) || '{}'); } catch (e) { return {}; } }

  /* Not a tracking fingerprint — a coarse label so a note can say
     "Chrome on Android" instead of "a device". Deliberately low
     entropy: it identifies a KIND of device, not a person. */
  function deviceLabel() {
    var ua = navigator.userAgent || '';
    var browser = /Edg\//.test(ua) ? 'Edge'
                : /OPR\//.test(ua) ? 'Opera'
                : /Chrome\//.test(ua) && !/Chromium/.test(ua) ? 'Chrome'
                : /Firefox\//.test(ua) ? 'Firefox'
                : /Safari\//.test(ua) ? 'Safari' : 'a browser';
    var os = /Android/.test(ua) ? 'Android'
           : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
           : /Mac OS X/.test(ua) ? 'macOS'
           : /Windows/.test(ua) ? 'Windows'
           : /Linux/.test(ua) ? 'Linux' : 'an unknown system';
    return browser + ' on ' + os;
  }

  function post(action, payload, token) {
    return fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(Object.assign({ action: action }, payload)),
    }).then(function (r) { return r.ok; }, function () { return false; });
  }

  function token() {
    try {
      if (global.ApaSession && global.ApaSession.token) {
        return Promise.resolve(global.ApaSession.token()).catch(function () { return null; });
      }
      var sb = global.sb || (global.ApaSession && global.ApaSession.client && global.ApaSession.client());
      if (sb && sb.auth && sb.auth.getSession) {
        return sb.auth.getSession().then(function (r) {
          return (r && r.data && r.data.session && r.data.session.access_token) || null;
        }, function () { return null; });
      }
    } catch (e) { /* fall through */ }
    return Promise.resolve(null);
  }

  function onSignedIn(user, profile) {
    if (!user || !user.email) return;
    token().then(function (t) {
      if (!t) return;

      var createdAt = user.created_at ? new Date(user.created_at).getTime() : 0;
      var isNew = createdAt && (Date.now() - createdAt) < NEW_ACCOUNT_WINDOW_MS;
      var name = [profile && profile.first_name, profile && profile.last_name]
        .filter(Boolean).join(' ').trim()
        || (user.user_metadata && user.user_metadata.full_name) || '';

      var sent = jsonLs(LS_SENT);

      /* ── Welcome. The server refuses a second one on the same account,
         so the local flag is only there to save a pointless request. ── */
      if (isNew && !sent['welcome:' + user.id]) {
        sent['welcome:' + user.id] = 1;
        ls(LS_SENT, JSON.stringify(sent));
        post('welcome', { email: user.email, name: name, userId: user.id }, t);
        return;   // one email on the way in. Not two.
      }

      /* ── New device. A returning account on a device this browser has
         not recorded before. Not a substitute for real device tracking —
         it is the honest, local half: it can miss, it cannot cry wolf at
         somebody who has been here all along. ── */
      var devices = jsonLs(LS_DEVICES);
      var label = deviceLabel();
      var key = user.id + '|' + label;
      if (!devices[key]) {
        devices[key] = Date.now();
        ls(LS_DEVICES, JSON.stringify(devices));
        /* First ever record for this account in this browser is not news
         — it is just the first time we looked. Only tell them about a
         device that appears AFTER we already knew of another. */
        var known = Object.keys(devices).filter(function (k) { return k.indexOf(user.id + '|') === 0; });
        if (known.length > 1) {
          post('signin-alert', {
            email: user.email, name: name, userId: user.id,
            device: label, when: new Date().toISOString(),
            sessionId: user.id + ':' + Math.floor(Date.now() / 60000),
          }, t);
        }
      }
    });
  }

  /* ── Partner welcome. Fired by whatever publishes a listing, so the
     onboarding email is tied to the act rather than to a page. ── */
  global.CabanaLifecycle = {
    partnerWelcome: function (info) {
      if (!info || !info.email) return;
      token().then(function (t) {
        if (!t) return;
        var sent = jsonLs(LS_SENT);
        var k = 'partner-welcome:' + (info.userId || info.email);
        if (sent[k]) return;
        sent[k] = 1; ls(LS_SENT, JSON.stringify(sent));
        post('partner-welcome', {
          email: info.email, name: info.name || '',
          businessName: info.businessName || '', userId: info.userId || null,
        }, t);
      });
    },

    /* Confirmation for every inventory pipeline. The row id is opaque;
       /api/email re-reads it and proves it belongs to the signed-in user
       before sending to that account's verified address. One retry covers
       a transient provider/network failure, while the server + Resend
       idempotency keys prevent duplicates. */
    listingSubmitted: function (source, id) {
      if (!source || !id) return Promise.resolve({ ok: false, error: 'missing_submission' });
      return token().then(function (t) {
        if (!t) return { ok: false, error: 'signed_out' };
        function attempt() { return post('listing-submitted', { source: source, id: id }, t); }
        return attempt().then(function (ok) {
          if (ok) return { ok: true };
          return new Promise(function (resolve) {
            setTimeout(function () {
              attempt().then(function (again) {
                resolve(again ? { ok: true, retried: true } : { ok: false, error: 'email_delayed' });
              });
            }, 900);
          });
        });
      }).catch(function () { return { ok: false, error: 'email_delayed' }; });
    },
  };

  /* ── Attach. ApaSession is the site's source of truth for auth; if it
     is not present on this page there is nothing to react to. ── */
  function attach(tries) {
    if (!global.ApaSession || !global.ApaSession.subscribe) {
      if ((tries || 0) < 40) return setTimeout(function () { attach((tries || 0) + 1); }, 250);
      return;
    }
    var last = null;
    global.ApaSession.subscribe(function (state) {
      if (!state || state.status !== 'user' || !state.user) { last = null; return; }
      if (last === state.user.id) return;      // subscribe replays; act once
      last = state.user.id;
      try { onSignedIn(state.user, state.profile); }
      catch (e) { if (global.console) console.warn('[lifecycle]', e && e.message); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { attach(0); });
  else attach(0);
})(window);
