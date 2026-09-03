/* ══════════════════════════════════════════════════════════════════════
   CABANA · SUPPORT CONSOLE
   cabana-support.js

   The one place a guest talks to Cabana. APA answers, a human takes over
   when she should not be the one answering, and either of them can be on
   a voice call in two taps — with no phone number anywhere in it.

   THE PROBLEM THIS SOLVES
   ───────────────────────
   Support widgets forget you. You explain the booking, they send you to
   the bookings page, and the widget on that page opens empty. So the
   conversation here is not owned by the page. It is a thread on the
   server, mirrored into localStorage, and re-hydrated on every load:

     · the panel reopens itself if it was open when you navigated
     · the transcript paints instantly from cache, then reconciles
     · APA moving you to another page is a continuation, not a restart —
       she says what she is doing, you land, and her next line is already
       there
     · signing in mid-conversation ADOPTS the anonymous thread onto the
       account instead of starting a second one

   IDENTITY
   ────────
   A signed-in guest is their account. Everyone else gets an opaque
   random key, minted once and kept in localStorage. It is the only thing
   that identifies an anonymous conversation, which is why a thread id
   alone is never enough to read one.

   RELIABILITY
   ───────────
   Every network call has a timeout and a fallback sentence. A message
   that fails to send is kept and retried rather than silently lost, and
   the composer says so. Nothing in here can leave the panel in a state
   the guest cannot get out of.
   ══════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.CabanaSupport) return;

  var doc = global.document;
  var API = '/api/support';

  var LS_KEY     = 'cbn.support.key';      // the anonymous identity
  var LS_CACHE   = 'cbn.support.cache';    // last transcript, for instant paint
  var LS_USED    = 'cbn.support.used';     // has this person opened it before
  var SS_OPEN    = 'cbn.support.open';     // was it open when we navigated
  var SS_PENDING = 'cbn.support.pending';  // a line to show on arrival

  var FETCH_TIMEOUT = 25000;
  var POLL_ACTIVE   = 4000;   // a human is on the thread
  var POLL_IDLE     = 15000;  // APA has it; nothing arrives unprompted
  var NAV_DELAY     = 1400;   // long enough to read the line before the page turns
  var CACHE_MAX     = 60;

  /* ── State ──────────────────────────────────────────────────────── */
  var el = {};
  var open = false;
  var booted = false;
  var thread = null;
  var messages = [];
  var suggestions = [];
  var signedIn = false;
  var callerName = null;
  var sending = false;
  var pollTimer = null;
  var lastAt = null;
  var unread = 0;
  var navTimer = null;
  var outbox = [];       // messages the network refused; retried on the next send
  var callActive = false;

  /* ══════════════════════════════════════════════════════════════════
     STORAGE. Every access is guarded: Safari private mode throws on
     localStorage, and a support widget must not be what breaks a page.
  ══════════════════════════════════════════════════════════════════ */
  function ls(k, v) {
    try {
      if (v === undefined) return global.localStorage.getItem(k);
      if (v === null) { global.localStorage.removeItem(k); return null; }
      global.localStorage.setItem(k, v); return v;
    } catch (e) { return null; }
  }
  function ss(k, v) {
    try {
      if (v === undefined) return global.sessionStorage.getItem(k);
      if (v === null) { global.sessionStorage.removeItem(k); return null; }
      global.sessionStorage.setItem(k, v); return v;
    } catch (e) { return null; }
  }

  function guestKey() {
    var k = ls(LS_KEY);
    if (k && /^[a-f0-9]{24,64}$/i.test(k)) return k;
    var bytes = new Uint8Array(16);
    if (global.crypto && global.crypto.getRandomValues) global.crypto.getRandomValues(bytes);
    else for (var i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
    k = Array.prototype.map.call(bytes, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    ls(LS_KEY, k);
    return k;
  }

  /* Cache ownership is part of the cache key. A shared browser must never
     flash one account's support transcript after sign-out or an account
     switch while the server is still reconciling. peekSession() is a
     synchronous hint only; every API request is still authenticated and
     authorised by the server. */
  function identityHint() {
    try {
      if (global.ApaSession) {
        var st = global.ApaSession.get && global.ApaSession.get();
        if (st && st.user && st.user.id) return 'user:' + st.user.id;
        var persisted = global.ApaSession.peekSession && global.ApaSession.peekSession();
        if (persisted && persisted.user && persisted.user.id) return 'user:' + persisted.user.id;
      }
    } catch (e) { /* guest identity remains safe */ }
    return 'guest:' + guestKey();
  }

  function cacheWrite() {
    try {
      ls(LS_CACHE, JSON.stringify({
        owner: identityHint(),
        threadId: thread && thread.id,
        status: thread && thread.status,
        messages: messages.slice(-CACHE_MAX),
        at: Date.now(),
      }));
    } catch (e) { /* a full quota costs us the instant paint, nothing more */ }
  }
  function cacheRead() {
    try {
      var raw = ls(LS_CACHE);
      if (!raw) return null;
      var d = JSON.parse(raw);
      /* Legacy entries had no owner. Treat them as unsafe rather than
         guessing whose conversation they contain. */
      if (!d || !d.owner || d.owner !== identityHint()) {
        ls(LS_CACHE, null);
        return null;
      }
      /* A day-old transcript is history, not context. Let the server
         speak for anything older. */
      if (Date.now() - (d.at || 0) > 86400000) return null;
      return d;
    } catch (e) { return null; }
  }

  /* ══════════════════════════════════════════════════════════════════
     TRANSPORT
  ══════════════════════════════════════════════════════════════════ */
  function authHeader() {
    return authToken().then(function (t) {
      return t ? { Authorization: 'Bearer ' + t } : {};
    });
  }

  function api(op, payload) {
    var ctrl = global.AbortController ? new AbortController() : null;
    return authHeader().then(function (auth) {
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, FETCH_TIMEOUT);
      return fetch(API, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, auth),
        body: JSON.stringify(Object.assign({ op: op, guestKey: guestKey() }, payload || {})),
        signal: ctrl ? ctrl.signal : undefined,
      }).then(function (r) {
        clearTimeout(timer);
        return r.json().catch(function () { return {}; }).then(function (d) {
          if (!r.ok) { var e = new Error(d.error || ('http_' + r.status)); e.data = d; e.status = r.status; throw e; }
          return d;
        });
      }, function (e) { clearTimeout(timer); throw e; });
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     MARKUP
  ══════════════════════════════════════════════════════════════════ */
  var SVG = {
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="3.2"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1A19.5 19.5 0 0 1 4.7 12a19.8 19.8 0 0 1-3.1-8.6A2 2 0 0 1 3.6 1.2h3a2 2 0 0 1 2 1.7 12.8 12.8 0 0 0 .7 2.8 2 2 0 0 1-.5 2.1L7.9 8.4a16 16 0 0 0 7.7 7.7l1.7-.9a2 2 0 0 1 2.1.5 12.8 12.8 0 0 0 2.8.7 2 2 0 0 1 1.8 2z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    send:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
    mic:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3"/></svg>',
    micOff:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 2l20 20M9 9v2a3 3 0 0 0 4.6 2.5M15 10V5a3 3 0 0 0-5.7-1.3M5 10a7 7 0 0 0 10.7 6M19 10a7 7 0 0 1-.6 2.8M12 19v3"/></svg>',
    end:   '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 9c-1.9 0-3.7.3-5.4.9v3.6c0 .5-.3.9-.7 1.1-1.2.6-2.3 1.4-3.3 2.3-.2.2-.5.3-.8.3s-.6-.1-.8-.3l-1.6-1.6a1 1 0 0 1 0-1.5C2.9 10.7 7.2 9 12 9s9.1 1.7 12.6 4.8a1 1 0 0 1 0 1.5L23 16.9c-.2.2-.5.3-.8.3s-.6-.1-.8-.3c-1-.9-2.1-1.7-3.3-2.3a1.2 1.2 0 0 1-.7-1.1V9.9C15.7 9.3 13.9 9 12 9z"/></svg>',
    person:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    sos:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7.5 3.2v5.4c0 4.6-3.1 8.8-7.5 10.1-4.4-1.3-7.5-5.5-7.5-10.1V6.2L12 3Z"/><path d="M12 8.6v4"/><path d="M12 15.8h.01"/></svg>',
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ══════════════════════════════════════════════════════════════════
     VOICE
     Dictation, not a separate voice assistant. What you say becomes a
     message in the same thread, so speaking and typing are the same
     conversation — and the transcript a human inherits on escalation
     reads identically either way.

     Speech recognition needs a secure context to be offered at all;
     browsers that do not have it simply never see the button.
  ══════════════════════════════════════════════════════════════════ */
  var SR = global.SpeechRecognition || global.webkitSpeechRecognition || null;
  var SECURE = (global.isSecureContext !== false) &&
               (global.location.protocol === 'https:' || global.location.hostname === 'localhost');
  var VOICE_IN  = !!SR && SECURE;
  var VOICE_OUT = 'speechSynthesis' in global;

  var recog = null;
  var listening = false;
  var spokeLast = false;   // only read a reply aloud if the ask was spoken
  var handsFree = false;   // the continuous loop: listen → send → speak → listen
  var speaking  = false;
  var restartTimer = null;

  function speechLang() {
    try { return (global.navigator.language || 'en-KE'); } catch (e) { return 'en-KE'; }
  }

  function micState() {
    if (!el.mic) return;
    el.mic.setAttribute('data-on', listening ? '1' : '0');
    el.mic.setAttribute('data-hf', handsFree ? '1' : '0');
    el.mic.setAttribute('aria-pressed', handsFree ? 'true' : 'false');
    el.mic.setAttribute('title', handsFree
      ? 'Hands-free is on — tap to stop'
      : 'Tap to speak · hold, or double-tap, for hands-free');
  }

  function stopListening() {
    listening = false;
    micState();
    if (recog) { try { recog.abort ? recog.abort() : recog.stop(); } catch (e) { /* already stopped */ } }
  }

  /* ── Hands-free ─────────────────────────────────────────────────
     The loop is: listen until they stop talking, send, speak the reply,
     then listen again. Two things make it survivable rather than
     maddening:

       · APA never listens while she is talking. Recognition is stopped
         for the duration of the utterance and resumed after, so she
         does not hear herself and answer her own sentence.
       · Barge-in. Speaking or typing while she talks cuts her off
         immediately, because waiting politely for a wrong answer to
         finish is the worst part of every voice assistant ever built.
  ── */
  function startHandsFree() {
    if (!VOICE_IN) { toast('This browser cannot listen. Type instead.', '🎙'); return; }
    handsFree = true;
    micState();
    toast('Hands-free on. Just talk — tap the mic to stop.', '🎧');
    listen();
  }

  function stopHandsFree(quiet) {
    handsFree = false;
    clearTimeout(restartTimer);
    stopListening();
    try { if (VOICE_OUT) global.speechSynthesis.cancel(); } catch (e) { /* nothing playing */ }
    speaking = false;
    micState();
    if (!quiet) toast('Hands-free off.', '🎙');
  }

  function listen() {
    if (!VOICE_IN || listening || speaking || sending) return;
    try { recog = new SR(); } catch (e) { toast('Dictation is not available here.', '🎙'); return; }

    recog.lang = speechLang();
    recog.interimResults = true;
    recog.continuous = false;
    recog.maxAlternatives = 1;

    var finalText = '';

    recog.onresult = function (ev) {
      var interim = '';
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        var r = ev.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      /* Show it landing as they speak, so they can see what was heard
         and correct it before it goes. */
      if (el.input) {
        el.input.value = (finalText + interim).replace(/^\s+/, '');
        autosize();
        if (el.send) el.send.disabled = !el.input.value.trim();
      }
    };

    recog.onerror = function (ev) {
      var why = ev && ev.error;
      listening = false;
      micState();
      if (why === 'not-allowed' || why === 'service-not-allowed') {
        stopHandsFree(true);
        toast('Microphone blocked. Allow it in the address bar, or type.', '🎙');
        return;
      }
      /* Silence is not a failure in hands-free — it is a pause. Go
         round again rather than dropping them out of the mode. */
      if (handsFree && why !== 'aborted') restartTimer = setTimeout(listen, 700);
    };

    recog.onend = function () {
      listening = false;
      micState();
      var said = String(finalText || '').trim();
      if (said) {
        spokeLast = true;
        if (el.input) { el.input.value = ''; autosize(); }
        submit(said);
        return;   /* the reply handler resumes listening once she has spoken */
      }
      if (handsFree) restartTimer = setTimeout(listen, 600);
    };

    try {
      recog.start();
      listening = true;
      micState();
      if (el.input) { el.input.value = ''; autosize(); }
    } catch (e) {
      listening = false;
      micState();
      if (handsFree) restartTimer = setTimeout(listen, 900);
    }
  }

  function toggleListen() {
    if (!VOICE_IN) return;
    if (handsFree) { stopHandsFree(); return; }
    if (listening) { stopListening(); return; }
    listen();
  }

  /* Read a reply aloud when the guest spoke to us, or whenever
     hands-free is running. Volunteering audio to someone typing quietly
     in an office is a bug; withholding it in hands-free is a broken
     feature. */
  function say(text, onDone) {
    var wanted = spokeLast || handsFree;
    spokeLast = false;
    if (!VOICE_OUT || !wanted) { if (onDone) onDone(); return; }

    var clean = String(text || '')
      .replace(/\[([^\]]{1,80})\]\([^)]*\)/g, '$1')   // link text only
      .replace(/[*_`#>]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 600);
    if (!clean) { if (onDone) onDone(); return; }

    try {
      global.speechSynthesis.cancel();
      var u = new global.SpeechSynthesisUtterance(clean);
      u.lang = speechLang();
      u.rate = 1.04;
      u.pitch = 1.0;
      speaking = true;
      if (el.root) el.root.classList.add('cbn-sup--speaking');
      var finish = function () {
        if (!speaking) return;
        speaking = false;
        if (el.root) el.root.classList.remove('cbn-sup--speaking');
        if (onDone) onDone();
      };
      u.onend = finish;
      u.onerror = finish;
      global.speechSynthesis.speak(u);
      /* Some mobile engines never fire onend. A ceiling derived from
         the text length keeps the loop alive rather than stranding it
         mid-conversation. */
      setTimeout(finish, Math.min(30000, 2500 + clean.length * 70));
    } catch (e) {
      speaking = false;
      if (el.root) el.root.classList.remove('cbn-sup--speaking');
      if (onDone) onDone();
    }
  }

  /* Cut her off. Called when the guest starts typing or talking over
     her — their input always outranks her sentence. */
  function bargeIn() {
    if (!speaking) return;
    try { if (VOICE_OUT) global.speechSynthesis.cancel(); } catch (e) { /* nothing playing */ }
    speaking = false;
    if (el.root) el.root.classList.remove('cbn-sup--speaking');
  }

  /* After she has finished a reply: keep the loop turning. */
  function afterReply(text) {
    say(text, function () {
      if (handsFree && !sending) restartTimer = setTimeout(listen, 350);
    });
  }

  function hushVoice() {
    stopHandsFree(true);
  }

  /* Markdown, deliberately tiny: bold, inline code, and links that must
     be relative or https. Anything else stays literal text. */
  function render(text) {
    var s = esc(text);
    s = s.replace(/\[([^\]]{1,80})\]\((\/[A-Za-z0-9\-._~/?#=&%]{0,180}|https:\/\/[^\s)]{1,180})\)/g,
      function (_, label, href) {
        var ext = /^https:/.test(href);
        return '<a href="' + href + '"' + (ext ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + label + '</a>';
      });
    s = s.replace(/\*\*([^*]{1,120})\*\*/g, '<strong>$1</strong>');
    s = s.replace(/`([^`]{1,120})`/g, '<code>$1</code>');
    return s;
  }

  function clockOf(iso) {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
  }

  function build() {
    var root = doc.createElement('div');
    root.className = 'cbn-sup';
    root.id = 'cbn-sup-root';
    if (ls(LS_USED)) root.classList.add('cbn-sup--used');

    root.innerHTML =
      '<button id="cbn-sup-launcher" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="cbn-sup-panel" aria-label="Cabana support">'
      +   '<span class="cbn-sup-hint">Need a hand? <b>Ask APA</b></span>'
      +   '<span class="cbn-sup-orb">'
      +     '<span class="cbn-sup-ring"></span>'
      +     '<img src="/cabana-emblem.png" alt="" width="34" height="34" onerror="this.remove()">'
      +     '<span class="cbn-sup-badge" id="cbn-sup-badge">0</span>'
      +   '</span>'
      + '</button>'

      + '<section id="cbn-sup-panel" role="dialog" aria-modal="false" aria-label="Cabana support" tabindex="-1">'
      +   '<header class="cbn-sup-head">'
      +     '<div class="cbn-sup-head-row">'
      +       '<div class="cbn-sup-ava"><img src="/cabana-emblem.png" alt="" onerror="this.parentNode.innerHTML=\'✦\'"></div>'
      +       '<div class="cbn-sup-who">'
      +         '<div class="cbn-sup-name" id="cbn-sup-name">Cabana Support</div>'
      +         '<div class="cbn-sup-status"><span class="cbn-sup-dot" id="cbn-sup-dot" data-tone="live"></span><span id="cbn-sup-statustext">APA is here, right now</span></div>'
      +       '</div>'
      +       '<div class="cbn-sup-acts">'
      +         '<button class="cbn-sup-ico cbn-sup-sos" id="cbn-sup-sos" type="button" data-cbn-sos aria-label="Emergency help" title="Emergency">' + SVG.sos + '</button>'
      +         '<button class="cbn-sup-ico" id="cbn-sup-call" type="button" aria-label="Call the Cabana team in-app" title="Call us in the app">' + SVG.phone + '</button>'
      +         '<button class="cbn-sup-ico" id="cbn-sup-close" type="button" aria-label="Close support">' + SVG.close + '</button>'
      +       '</div>'
      +     '</div>'
      +   '</header>'

      +   '<div class="cbn-sup-body" id="cbn-sup-body" role="log" aria-live="polite" aria-relevant="additions"></div>'

      +   '<footer class="cbn-sup-foot">'
      +     '<form class="cbn-sup-form" id="cbn-sup-form">'
      +       '<textarea id="cbn-sup-input" rows="1" placeholder="Ask anything, or tell us what went wrong…" aria-label="Message Cabana support" maxlength="3000"></textarea>'
      +       (VOICE_IN ? '<button class="cbn-sup-mic" id="cbn-sup-mic" type="button" aria-label="Dictate a message" title="Speak instead of typing">' + SVG.mic + '</button>' : '')
      +       '<button class="cbn-sup-send" id="cbn-sup-send" type="submit" aria-label="Send" disabled>' + SVG.send + '</button>'
      +     '</form>'
      +     '<div class="cbn-sup-legal">APA answers instantly · <button type="button" id="cbn-sup-human">talk to a person</button></div>'
      +   '</footer>'

      +   '<div class="cbn-call" id="cbn-sup-call-ui" data-phase="idle" aria-hidden="true">'
      +     '<div class="cbn-call-ava"><span class="cbn-call-level" id="cbn-call-level"></span><img src="/cabana-emblem.png" alt="" onerror="this.remove()"></div>'
      +     '<div class="cbn-call-name" id="cbn-call-name">Cabana</div>'
      +     '<div class="cbn-call-sub" id="cbn-call-sub">Connecting…</div>'
      +     '<div class="cbn-call-timer" id="cbn-call-timer"></div>'
      +     '<div class="cbn-call-btns">'
      +       '<button class="cbn-call-btn" id="cbn-call-mute" type="button" aria-label="Mute">' + SVG.mic + '</button>'
      +       '<button class="cbn-call-btn" data-kind="end" id="cbn-call-end" type="button" aria-label="End call">' + SVG.end + '</button>'
      +     '</div>'
      +     '<div class="cbn-call-note">Runs over the internet, inside Cabana. No phone numbers, on either side.</div>'
      +   '</div>'
      + '</section>'

      + '<div id="cbn-sup-toast" role="status" aria-live="polite"></div>';

    doc.body.appendChild(root);

    el.root    = root;
    el.launch  = doc.getElementById('cbn-sup-launcher');
    el.panel   = doc.getElementById('cbn-sup-panel');
    el.body    = doc.getElementById('cbn-sup-body');
    el.form    = doc.getElementById('cbn-sup-form');
    el.input   = doc.getElementById('cbn-sup-input');
    el.send    = doc.getElementById('cbn-sup-send');
    el.close   = doc.getElementById('cbn-sup-close');
    el.callBtn = doc.getElementById('cbn-sup-call');
    el.human   = doc.getElementById('cbn-sup-human');
    el.badge   = doc.getElementById('cbn-sup-badge');
    el.status  = doc.getElementById('cbn-sup-statustext');
    el.dot     = doc.getElementById('cbn-sup-dot');
    el.name    = doc.getElementById('cbn-sup-name');
    el.toast   = doc.getElementById('cbn-sup-toast');
    el.callUI  = doc.getElementById('cbn-sup-call-ui');
    el.callName = doc.getElementById('cbn-call-name');
    el.callSub  = doc.getElementById('cbn-call-sub');
    el.callTimer = doc.getElementById('cbn-call-timer');
    el.callLevel = doc.getElementById('cbn-call-level');
    el.callMute = doc.getElementById('cbn-call-mute');
    el.callEnd  = doc.getElementById('cbn-call-end');
    el.mic      = doc.getElementById('cbn-sup-mic');

    wire();
  }

  function ensureStyles() {
    if (doc.getElementById('cbn-sup-css')) return;
    var link = doc.createElement('link');
    link.id = 'cbn-sup-css';
    link.rel = 'stylesheet';
    link.href = '/cabana-support.css';
    doc.head.appendChild(link);
  }

  /* ══════════════════════════════════════════════════════════════════
     PAINTING
  ══════════════════════════════════════════════════════════════════ */
  function atBottom() {
    if (!el.body) return true;
    return el.body.scrollHeight - el.body.scrollTop - el.body.clientHeight < 90;
  }
  function toBottom(smooth) {
    if (!el.body) return;
    try { el.body.scrollTo({ top: el.body.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }); }
    catch (e) { el.body.scrollTop = el.body.scrollHeight; }
  }

  function paint(keepScroll) {
    if (!el.body) return;
    var stick = keepScroll ? atBottom() : true;

    if (!messages.length) { paintIntro(); return; }

    var html = '';
    var lastDay = '';
    messages.forEach(function (m) {
      var day = '';
      try { day = new Date(m.at).toDateString(); } catch (e) { /* undated */ }
      if (day && day !== lastDay) {
        lastDay = day;
        var today = new Date().toDateString();
        var label = day === today ? 'Today' : new Date(m.at).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
        html += '<div class="cbn-sup-day">' + esc(label) + '</div>';
      }
      html += messageHtml(m);
    });
    el.body.innerHTML = html;

    /* Chips belong to the newest APA line only. Older ones are history. */
    var last = messages[messages.length - 1];
    if (last && last.role === 'apa' && last.meta && last.meta.chips && last.meta.chips.length) {
      paintChips(last.meta.chips);
    }
    if (stick) toBottom(false);
  }

  function messageHtml(m) {
    var who = m.role === 'agent' ? (m.name || 'Cabana team')
            : m.role === 'apa' ? 'APA'
            : null;
    return '<div class="cbn-msg" data-role="' + esc(m.role) + '">'
      + '<div>'
      + (who ? '<div class="cbn-msg-from">' + esc(who) + '</div>' : '')
      + '<div class="cbn-msg-b">' + render(m.body) + '</div>'
      + (m.at && m.role !== 'system' ? '<div class="cbn-msg-time">' + esc(clockOf(m.at)) + (m.pending ? ' · sending…' : '') + '</div>' : '')
      + '</div></div>';
  }

  /* The opening line reads the clock and the page, because "Good evening"
     on the tours page at 8pm is a different conversation from "Hi there"
     on the booking-confirm page at noon — and APA is one assistant who
     notices where you are, not a widget with a fixed greeting. */
  function greeting() {
    var h = new Date().getHours();
    var part = h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 22 ? 'Good evening' : 'Up late';
    var who = signedIn && callerName ? ', ' + callerName.split(' ')[0] : '';
    return part + who + '.';
  }

  var PAGE_OPENER = {
    tours:            'Looking at tours — want me to find one that fits your dates?',
    apartments:       'Browsing stays. Tell me the area and budget and I’ll narrow it down.',
    stays:            'Browsing stays. Tell me the area and budget and I’ll narrow it down.',
    events:           'Events. Say the night you’re free and I’ll tell you what’s on.',
    food:             'Hungry? Tell me the area and what you’re after.',
    rides:            'Need a ride? Tell me where and when.',
    carhire:          'Car hire — self-drive or with a driver?',
    flights:          'Flights. Where from, where to, and roughly when?',
    roommates:        'Looking for a roommate or listing a room?',
    'my-bookings':    'This is your bookings page — ask me anything about any of them.',
    'booking-confirm':'Something up with this booking? I can see it.',
    rewards:          'Your points, and what they’re actually worth. Ask away.',
    dashboard:        'What are we sorting today?',
  };

  function paintIntro() {
    var opener = PAGE_OPENER[pageKey()] || 'What do you need?';
    var html = '<div class="cbn-sup-intro">'
      + '<h3>' + esc(greeting()) + ' ' + esc(opener) + '</h3>'
      + '<p>I’m APA — the same one that plans your trip and the one that fixes it when something breaks. I can see live prices, your bookings and what’s actually available, so you get the real answer, not a help article. If it needs a person, I hand you over without you starting again.</p>'
      + '<div class="cbn-sup-sugs">';
    suggestions.forEach(function (s) {
      html += '<button class="cbn-sug" type="button" data-q="' + esc(s.question) + '">'
        + '<span>' + esc(s.question) + '</span>' + SVG.arrow + '</button>';
    });
    html += '</div>';
    /* Offered, not imposed. Someone who wants to talk should not have to
       discover a long-press on a microphone to find out they can. */
    if (VOICE_IN) {
      html += '<button class="cbn-sup-talkcta" type="button" data-cbn-talk-inline>'
        + SVG.mic + '<span>Or just talk to me — hands-free</span></button>';
    }
    html += '</div>';
    el.body.innerHTML = html;
  }

  function paintChips(chips) {
    var wrap = doc.createElement('div');
    wrap.className = 'cbn-sup-chips';
    chips.slice(0, 3).forEach(function (c, i) {
      var b = doc.createElement('button');
      b.type = 'button'; b.className = 'cbn-chip'; b.textContent = c;
      b.style.animationDelay = (i * 0.06) + 's';
      b.addEventListener('click', function () { wrap.remove(); submit(c); });
      wrap.appendChild(b);
    });
    el.body.appendChild(wrap);
  }

  function appendLocal(m) {
    messages.push(m);
    if (messages.length > 200) messages = messages.slice(-200);
    if (!el.body) return;
    if (el.body.querySelector('.cbn-sup-intro')) el.body.innerHTML = '';
    var old = el.body.querySelector('.cbn-sup-chips');
    if (old) old.remove();
    el.body.insertAdjacentHTML('beforeend', messageHtml(m));
    toBottom(true);
    cacheWrite();
  }

  function typing(on) {
    var existing = doc.getElementById('cbn-sup-typing');
    if (!on) { if (existing) existing.remove(); return; }
    if (existing || !el.body) return;
    el.body.insertAdjacentHTML('beforeend',
      '<div class="cbn-msg" data-role="apa" id="cbn-sup-typing"><div><div class="cbn-msg-b">'
      + '<div class="cbn-typing"><i></i><i></i><i></i></div></div></div></div>');
    toBottom(true);
  }

  function setStatus(text, tone) {
    if (el.status) el.status.textContent = text;
    if (el.dot) el.dot.setAttribute('data-tone', tone || 'live');
  }

  function setUnread(n) {
    unread = Math.max(0, n | 0);
    if (el.root) el.root.setAttribute('data-unread', String(unread));
    if (el.badge) el.badge.textContent = unread > 9 ? '9+' : String(unread);
  }

  var toastTimer = null;
  function toast(text, icon) {
    if (!el.toast) return;
    el.toast.innerHTML = '<span class="cbn-toast-ico">' + (icon || '✦') + '</span><span>' + esc(text) + '</span>';
    el.toast.setAttribute('data-on', '1');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.removeAttribute('data-on'); }, 4200);
  }

  /* ══════════════════════════════════════════════════════════════════
     OPEN / CLOSE
  ══════════════════════════════════════════════════════════════════ */
  function openPanel(focus) {
    if (open) return;
    open = true;
    ls(LS_USED, '1');
    ss(SS_OPEN, '1');
    el.root.classList.add('cbn-sup--open', 'cbn-sup--used');
    el.launch.setAttribute('aria-expanded', 'true');
    setUnread(0);
    if (!booted) boot();
    else { paint(false); schedulePoll(true); }
    if (focus !== false) setTimeout(function () { try { el.input.focus(); } catch (e) {} }, 340);
  }

  function closePanel() {
    if (!open) return;
    open = false;
    hushVoice();   /* nothing should still be talking to a closed panel */
    ss(SS_OPEN, null);
    el.root.classList.remove('cbn-sup--open');
    el.launch.setAttribute('aria-expanded', 'false');
    clearTimeout(pollTimer);
    /* Keep polling while a human is mid-conversation: a reply arriving
       to a closed panel should light the badge, not vanish. */
    if (thread && ['queued', 'assigned', 'waiting'].indexOf(thread.status) >= 0) schedulePoll(false);
    try { el.launch.focus(); } catch (e) {}
  }

  function autosize() {
    if (!el.input) return;
    el.input.style.height = 'auto';
    el.input.style.height = Math.min(108, el.input.scrollHeight) + 'px';
  }

  function wire() {
    el.launch.addEventListener('click', function () { open ? closePanel() : openPanel(); });
    el.close.addEventListener('click', closePanel);

    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open && !callActive) closePanel();
    });

    el.form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = (el.input.value || '').trim();
      if (!text) return;
      el.input.value = '';
      el.input.style.height = 'auto';
      el.send.disabled = true;
      submit(text);
    });

    el.input.addEventListener('input', function () {
      el.send.disabled = !el.input.value.trim();
      autosize();
      /* Typing outranks whatever she is saying. */
      bargeIn();
    });

    if (el.mic) {
      /* One tap dictates. A long press or a double tap turns on the
         continuous loop — discoverable by trying, and reversible by
         the same button, so nobody gets stuck in a mode. */
      var held = null;
      el.mic.addEventListener('click', function (e) {
        if (el.mic.getAttribute('data-longpress') === '1') {
          el.mic.removeAttribute('data-longpress');
          return;                     /* the press already acted */
        }
        if (e.detail >= 2) { bargeIn(); startHandsFree(); return; }
        bargeIn();
        toggleListen();
      });
      var beginHold = function () {
        clearTimeout(held);
        held = setTimeout(function () {
          el.mic.setAttribute('data-longpress', '1');
          bargeIn();
          if (handsFree) stopHandsFree(); else startHandsFree();
        }, 550);
      };
      var endHold = function () { clearTimeout(held); };
      el.mic.addEventListener('pointerdown', beginHold);
      el.mic.addEventListener('pointerup', endHold);
      el.mic.addEventListener('pointerleave', endHold);
      el.mic.addEventListener('pointercancel', endHold);
    }

    el.input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (el.input.value.trim()) el.form.requestSubmit ? el.form.requestSubmit() : el.form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    });

    el.body.addEventListener('click', function (e) {
      if (!e.target.closest) return;
      var sug = e.target.closest('.cbn-sug');
      if (sug) { submit(sug.getAttribute('data-q')); return; }
      if (e.target.closest('[data-cbn-talk-inline]')) startHandsFree();
    });

    el.human.addEventListener('click', requestHuman);
    el.callBtn.addEventListener('click', startCall);
    el.callEnd.addEventListener('click', function () {
      if (global.CabanaCall) global.CabanaCall.hangup('hung_up');
    });
    el.callMute.addEventListener('click', function () {
      if (!global.CabanaCall) return;
      var m = global.CabanaCall.toggleMute();
      el.callMute.innerHTML = m ? SVG.micOff : SVG.mic;
      el.callMute.setAttribute('data-on', m ? '1' : '0');
      el.callMute.setAttribute('aria-label', m ? 'Unmute' : 'Mute');
    });

    /* Coming back to the tab after a while: reconcile immediately rather
       than waiting out the poll interval. */
    doc.addEventListener('visibilitychange', function () {
      if (!doc.hidden && thread) { clearTimeout(pollTimer); poll(); }
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     BOOT & CONTINUITY
  ══════════════════════════════════════════════════════════════════ */
  function boot() {
    if (booted) return Promise.resolve();
    booted = true;

    /* Paint from cache first. The panel is never empty while the network
       decides how it feels — this is the whole trick behind continuity
       feeling instant rather than merely being correct. */
    var cached = cacheRead();
    if (cached && cached.messages && cached.messages.length) {
      messages = cached.messages;
      if (cached.threadId) thread = { id: cached.threadId, status: cached.status || 'apa' };
      paint(false);
    }

    return api('bootstrap', { page: pageKey(), adoptGuestKey: guestKey() })
      .then(function (d) {
        signedIn = !!(d.caller && d.caller.signedIn);
        callerName = d.caller && d.caller.name;
        suggestions = d.suggestions || [];

        /* ── Reconciliation, deliberately conservative ────────────────
           The server is authoritative about a thread it can see. It is
           NOT authoritative about one it cannot: a thread created
           moments ago, a read that raced a write, an anonymous key the
           adopt step is still catching up with. In every one of those
           cases the guest is looking at a real conversation, and
           replacing it with an empty panel is the precise failure this
           whole feature exists to prevent. So we only ever REPLACE what
           is on screen with something the server actually returned. */
        if (d.thread) {
          thread = d.thread;
          if (d.messages && d.messages.length) messages = d.messages;
          else if (!cached || cached.threadId !== d.thread.id) messages = [];
          /* else: the server knows the thread but returned no messages
             for it. Keep what we have rather than blanking the screen. */
        } else if (!messages.length) {
          thread = null;
          messages = [];
        }
        /* else: no thread from the server but a live transcript here.
           Keep both, and let the next send resume the cached thread. */

        lastAt = messages.length ? messages[messages.length - 1].at : null;

        paint(false);
        reflectStatus();
        cacheWrite();
        flushPending();
        schedulePoll(true);
      })
      .catch(function (e) {
        console.warn('[support:boot]', e && e.message);
        /* Offline or the API is down. The panel still opens, still shows
           the cached conversation, and says the true thing. */
        if (!messages.length) {
          suggestions = [];
          paintIntro();
        }
        setStatus('Reconnecting…', 'queue');
        setTimeout(function () { booted = false; if (open) boot(); }, 6000);
      });
  }

  /* A line APA left for us on the page she sent us to. */
  function flushPending() {
    var raw = ss(SS_PENDING);
    if (!raw) return;
    ss(SS_PENDING, null);
    try {
      var d = JSON.parse(raw);
      if (!d) return;
      if (d.text) {
        /* Only if the server has not already given us that line back. */
        var already = messages.some(function (m) { return m.role === 'apa' && m.body === d.text; });
        if (!already) appendLocal({ role: 'apa', name: 'APA', body: d.text, at: new Date().toISOString(), meta: d.meta || {} });
      }
      if (d.meta && d.meta.chips && d.meta.chips.length) paintChips(d.meta.chips);
    } catch (e) { /* a malformed handoff is simply not shown */ }
  }

  function reflectStatus() {
    if (!thread) { setStatus('APA is here, right now', 'live'); el.name.textContent = 'Cabana Support'; return; }
    if (thread.status === 'assigned' || thread.status === 'waiting') {
      setStatus('A person from the team has this', 'live');
      el.name.textContent = 'Cabana Support';
    } else if (thread.status === 'queued') {
      setStatus('In the queue — someone is coming', 'queue');
    } else if (thread.status === 'resolved' || thread.status === 'closed') {
      setStatus('Resolved · reply to reopen', 'queue');
    } else {
      setStatus('APA is here, right now', 'live');
    }
  }

  function pageKey() {
    return (global.location.pathname || '').replace(/^\//, '').replace(/\.html$/, '') || 'index';
  }

  /* ══════════════════════════════════════════════════════════════════
     SENDING
  ══════════════════════════════════════════════════════════════════ */
  function submit(text, clientData) {
    text = String(text || '').trim();
    if (!text || sending) return;
    if (!open) openPanel(false);
    if (navTimer) { clearTimeout(navTimer); navTimer = null; }
    bargeIn();

    var local = { role: 'user', body: text, at: new Date().toISOString(), meta: {} };
    appendLocal(local);

    sending = true;
    typing(true);
    setStatus('APA is thinking…', 'live');

    var queued = outbox.splice(0);
    var payload = {
      text: queued.length ? queued.concat([text]).join('\n\n') : text,
      threadId: thread && thread.id,
      page: pageKey(),
      /* Photos and coordinates the page gathered. Validated server-side
         before it reaches a row — the browser proposes, the server
         decides, same as everywhere else. */
      clientData: clientData || undefined,
    };

    api('send', payload)
      .then(function (d) {
        typing(false);
        sending = false;
        el.send.disabled = !el.input.value.trim();

        if (d.threadId) thread = Object.assign(thread || {}, { id: d.threadId, status: d.status || 'apa' });

        if (d.handedOver) {
          reflectStatus();
          appendLocal({
            role: 'system',
            body: d.status === 'assigned'
              ? 'Sent to the team member on this conversation.'
              : 'Sent. You are in the queue and someone is picking this up.',
            at: new Date().toISOString(), meta: {},
          });
          schedulePoll(true);
          return;
        }

        var meta = {};
        if (d.chips && d.chips.length) meta.chips = d.chips;
        if (d.reply) {
          appendLocal({ role: 'apa', name: 'APA', body: d.reply, at: new Date().toISOString(), meta: meta });
          afterReply(d.reply);
        }
        if (meta.chips) paintChips(meta.chips);

        /* Something only the browser can do — raise the M-Pesa prompt,
           open the picker, ask for GPS. It comes from a server tool, not
           from the model's text, so there is no sentence a guest can
           write that conjures one. */
        if (d.action) runAction(d.action);

        if (d.escalated) {
          if (thread) thread.status = 'queued';
          reflectStatus();
          if (d.degraded) toast('Put you through to a person', '🤝');
        } else {
          reflectStatus();
        }

        /* ── The handoff to another page. Everything the guest needs to
           carry across goes into sessionStorage BEFORE we navigate, so
           the panel on the next page reopens mid-sentence. ── */
        if (d.route) navigateWith(d.route, d.routeParams, d.reply, meta);

        schedulePoll(true);
      })
      .catch(function (e) {
        typing(false);
        sending = false;
        el.send.disabled = !el.input.value.trim();
        /* Hold the text rather than lose it. The next send carries it. */
        outbox.push(text);
        appendLocal({
          role: 'system',
          body: 'That did not reach us — your connection dropped. It is saved; send anything and it goes with it.',
          at: new Date().toISOString(), meta: {},
        });
        setStatus('Reconnecting…', 'queue');
        console.warn('[support:send]', e && e.message);
        /* A dropped send must not silently end hands-free: the guest is
           still sitting there talking to a microphone that stopped
           listening. Say it, then keep the loop turning. */
        afterReply('That did not reach us. Your connection dropped — say it again when you are ready.');
      });
  }

  function navigateWith(route, params, replyText, meta) {
    var ROUTES = {
      home: '/index.html', stays: '/apartments.html', apartments: '/apartments.html',
      roommates: '/roommates.html', tours: '/tours.html', events: '/events.html',
      food: '/food.html', rides: '/rides.html', carhire: '/carhire.html',
      flights: '/flights.html', shopping: '/shopping.html', bookings: '/my-bookings.html',
      'my-bookings': '/my-bookings.html', profile: '/profile.html', rewards: '/rewards.html',
      dashboard: '/dashboard.html', 'add-listing': '/add-listing.html',
      signin: '/auth.html', signup: '/auth.html?mode=signup',
      terms: '/terms.html', privacy: '/privacy.html', help: '/help.html',
    };
    var target = ROUTES[String(route).toLowerCase()];
    if (!target) return;
    /* Never "navigate" someone to where they already are. */
    if (target.split('?')[0].replace(/^\//, '').replace(/\.html$/, '') === pageKey()) return;

    var url = target + (params ? (target.indexOf('?') >= 0 ? '&' + params.replace(/^\?/, '') : params) : '');

    ss(SS_OPEN, '1');
    /* The reply is already on screen here; the pending line exists for
       the case where the server has not yet flushed it into the thread
       the next page will read. */
    ss(SS_PENDING, JSON.stringify({ text: '', meta: meta || {} }));

    toast('Taking you there — this chat comes with you', '→');
    navTimer = setTimeout(function () { global.location.href = url; }, NAV_DELAY);
  }

  function requestHuman() {
    if (thread && ['queued', 'assigned', 'waiting'].indexOf(thread.status) >= 0) {
      toast('The team already has this one', '✓');
      return;
    }
    if (!open) openPanel(false);
    appendLocal({ role: 'user', body: 'I’d like to talk to a person.', at: new Date().toISOString(), meta: {} });
    typing(true);
    api('escalate', { threadId: thread && thread.id, reason: 'Guest asked for a person.', page: pageKey() })
      .then(function (d) {
        typing(false);
        thread = Object.assign(thread || {}, { id: d.threadId, status: 'queued' });
        reflectStatus();
        schedulePoll(true);
      })
      .catch(function () {
        typing(false);
        appendLocal({
          role: 'system',
          body: 'Could not reach the desk just now. Try again, or write to connect@cabana.africa and we will pick it up there.',
          at: new Date().toISOString(), meta: {},
        });
      });
  }

  /* ══════════════════════════════════════════════════════════════════
     POLLING
  ══════════════════════════════════════════════════════════════════ */
  function schedulePoll(immediate) {
    clearTimeout(pollTimer);
    if (!thread || !thread.id) return;
    var live = ['queued', 'assigned', 'waiting'].indexOf(thread.status) >= 0;
    if (!live && !open) return;
    pollTimer = setTimeout(poll, immediate ? 1200 : (live ? POLL_ACTIVE : POLL_IDLE));
  }

  function poll() {
    if (!thread || !thread.id) return;
    if (doc.hidden && !(['queued', 'assigned', 'waiting'].indexOf(thread.status) >= 0)) {
      schedulePoll(false); return;
    }
    api('poll', { threadId: thread.id, since: lastAt })
      .then(function (d) {
        thread.status = d.status || thread.status;
        reflectStatus();

        var fresh = (d.messages || []).filter(function (m) {
          return !messages.some(function (x) { return x.id && x.id === m.id; });
        });

        fresh.forEach(function (m) {
          lastAt = m.at;
          /* Our own echo is already on screen (user sends) or was appended
             optimistically from the send response (apa/agent replies). */
          var echoRole = m.role === 'user' || m.role === 'apa' || m.role === 'agent' || m.role === 'system';
          if (echoRole) {
            var dupe = messages.some(function (x) { return !x.id && x.role === m.role && x.body === m.body; });
            if (dupe) {
              /* Stamp the id onto the local copy so future polls won't re-add it. */
              for (var i = messages.length - 1; i >= 0; i--) {
                if (!messages[i].id && messages[i].role === m.role && messages[i].body === m.body) { messages[i].id = m.id; break; }
              }
              return;
            }
          }
          appendLocal(m);
          if (!open && (m.role === 'agent' || m.role === 'apa')) {
            setUnread(unread + 1);
            if (m.role === 'agent') toast((m.name || 'Cabana') + ' replied', '💬');
          }
          /* The desk ringing us shows up here as a system line. Offer to
             pick it up rather than making them find a button. */
          if (m.role === 'system' && m.meta && m.meta.event === 'incoming_call' && m.meta.call_id) {
            offerIncoming(m.meta.call_id);
          }
        });

        schedulePoll(false);
      })
      .catch(function (e) {
        if (e && e.status === 404) { thread = null; return; }
        schedulePoll(false);
      });
  }

  /* ══════════════════════════════════════════════════════════════════
     ACTIONS
     The three things a conversation cannot do by itself. Each one is
     issued by a server tool, arrives as structured data, and is
     performed here with the guest's own hardware and their own consent.

     None of them completes anything on its own: the payment prompt is
     approved on the handset, the picker is chosen from by hand, the
     location dialog is the browser's. APA sets them in motion and then
     waits, like anyone else would.
  ══════════════════════════════════════════════════════════════════ */
  function runAction(action) {
    if (!action || typeof action !== 'object') return;
    if (action.type === 'payment_prompt')  return payViaMpesa(action);
    if (action.type === 'collect_photos')  return collectPhotos(action);
    if (action.type === 'collect_location') return collectLocation(action);
  }

  function payViaMpesa(a) {
    var ref = String(a.reference || '');
    var amount = Number(a.amount || 0);
    if (!ref || !(amount > 0)) return;

    systemLine('Sending an M-Pesa request for ' + kes(amount) + '…');

    authToken().then(function (token) {
      if (!token) { systemLine('You need to be signed in to pay. Sign in and say "pay now".'); return; }
      return fetch('/api/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ reference: ref, phone: a.phone, amount: amount, description: a.label || 'Cabana booking' }),
      }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok || res.j.error) {
            /* The server refused. Its reason is the true one — never
               paper over it, and never retry a refused amount. */
            systemLine('That payment request did not go through: ' + (res.j.error || 'unknown reason') + '. Tell me and I will sort it.');
            return;
          }
          systemLine('Check your phone — approve the M-Pesa prompt for ' + kes(amount) + '. I will tell you the moment it lands.');
          watchPayment(ref);
        });
    }).catch(function () {
      systemLine('I could not raise the payment prompt just now. Say "try again" and I will retry.');
    });
  }

  /* Poll until the money is seen, then say so. Bounded, because a guest
     who walked away should not leave a timer running forever. */
  function watchPayment(ref) {
    var tries = 0;
    (function tick() {
      if (++tries > 40) return;                        /* ~3 minutes */
      setTimeout(function () {
        authToken().then(function (token) {
          if (!token) return;
          return fetch('/api/poll-payment?reference=' + encodeURIComponent(ref), {
            headers: { Authorization: 'Bearer ' + token },
          }).then(function (r) { return r.json(); }).then(function (j) {
            if (j && (j.paid || j.status === 'success' || j.settled)) {
              var line = 'Payment received. You are confirmed.';
              systemLine(line);
              afterReply(line);
              return;
            }
            if (j && (j.status === 'failed' || j.status === 'cancelled')) {
              systemLine('That prompt was declined or timed out. Want me to send it again?');
              return;
            }
            tick();
          });
        }).catch(tick);
      }, 4500);
    })();
  }

  function collectPhotos(a) {
    var input = doc.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px;';
    doc.body.appendChild(input);

    input.addEventListener('change', function () {
      var files = Array.prototype.slice.call(input.files || []).slice(0, Number(a.max) || 12);
      input.remove();
      if (!files.length) { systemLine('No photos picked — say "photos" when you are ready.'); return; }
      systemLine('Uploading ' + files.length + ' photo' + (files.length === 1 ? '' : 's') + '…');
      uploadPhotos(files).then(function (urls) {
        if (!urls.length) { systemLine('Those did not upload. Try smaller images, or a different set.'); return; }
        /* The URLs go back through the normal send path as clientData,
           so the server validates them and APA's next sentence already
           knows they arrived. */
        submit('Here are the photos.', { photos: urls });
      });
    });

    /* A picker the guest never interacted with leaves an orphan input.
       Clean it up when they come back to the page. */
    global.addEventListener('focus', function once() {
      global.removeEventListener('focus', once);
      setTimeout(function () { if (input.isConnected && !(input.files || []).length) input.remove(); }, 1500);
    });

    try { input.click(); } catch (e) { input.remove(); systemLine('I could not open the picker here.'); }
  }

  function uploadPhotos(files) {
    var sb = supa();
    if (!sb) return Promise.resolve([]);
    var bucket = 'listings';
    return Promise.all(files.map(function (f) {
      var ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      var path = 'apa/' + Date.now() + '-' + Math.random().toString(36).slice(2, 10) + '.' + ext;
      return sb.storage.from(bucket).upload(path, f, { cacheControl: '3600', upsert: false })
        .then(function (r) {
          if (r.error) return null;
          var pub = sb.storage.from(bucket).getPublicUrl(path);
          return (pub && pub.data && pub.data.publicUrl) || null;
        })
        .catch(function () { return null; });
    })).then(function (urls) { return urls.filter(Boolean); });
  }

  function collectLocation() {
    if (!global.navigator || !global.navigator.geolocation) {
      systemLine('This browser will not share a location. Just tell me the area and street instead.');
      return;
    }
    systemLine('Asking your browser for the location…');
    global.navigator.geolocation.getCurrentPosition(function (pos) {
      submit('That is the spot.', {
        location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
      });
    }, function () {
      systemLine('Location was declined — no problem. Tell me the area and street and I will use that.');
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  }

  /* A line from the console itself, not from APA and not from the
     guest. Local only: the server transcript records the real events. */
  function systemLine(body) {
    appendLocal({ role: 'system', body: body, at: new Date().toISOString(), meta: {} });
  }

  function kes(n) {
    try { return 'KES ' + Number(n).toLocaleString('en-KE'); }
    catch (e) { return 'KES ' + n; }
  }

  function supa() {
    try {
      if (global.ApaSession && global.ApaSession.client) return global.ApaSession.client();
      if (global.supabaseClient) return global.supabaseClient;
      if (global.sb) return global.sb;
    } catch (e) { /* no client on this page */ }
    return null;
  }

  function authToken() {
    var fallback = null;
    try {
      if (global.ApaSession && global.ApaSession.peekSession) {
        var persisted = global.ApaSession.peekSession();
        fallback = persisted && persisted.access_token || null;
      }
      if (global.ApaSession && global.ApaSession.token) {
        return new Promise(function (resolve) {
          var settled = false;
          var finish = function (v) { if (!settled) { settled = true; resolve(v || fallback || null); } };
          var timer = setTimeout(function () { finish(fallback); }, 3500);
          Promise.resolve(global.ApaSession.token()).then(function (v) {
            clearTimeout(timer); finish(v);
          }, function () { clearTimeout(timer); finish(fallback); });
        });
      }
      var sb = supa();
      if (sb && sb.auth && sb.auth.getSession) {
        return new Promise(function (resolve) {
          var settled = false;
          var finish = function (v) { if (!settled) { settled = true; resolve(v || fallback || null); } };
          var timer = setTimeout(function () { finish(fallback); }, 3500);
          sb.auth.getSession().then(function (r) {
            clearTimeout(timer);
            finish((r && r.data && r.data.session && r.data.session.access_token) || null);
          }, function () {
            clearTimeout(timer); finish(fallback);
          });
        });
      }
    } catch (e) { /* fall through */ }
    return Promise.resolve(fallback);
  }

  function offerIncoming(callId) {
    if (callActive || !global.CabanaCall) return;
    openPanel(false);
    toast('Cabana is calling you — answering…', '📞');
    global.CabanaCall.answer(callId).catch(function () { /* the overlay reports why */ });
  }

  /* ══════════════════════════════════════════════════════════════════
     CALLING
  ══════════════════════════════════════════════════════════════════ */
  function startCall() {
    if (!global.CabanaCall) { toast('Calling is still loading — one moment', '⏳'); return; }
    if (callActive) { global.CabanaCall.hangup('hung_up'); return; }
    if (!global.CabanaCall.supported) {
      toast('This browser cannot make calls. Message us instead.', '⚠️');
      return;
    }
    openPanel(false);
    global.CabanaCall.start({ threadId: thread && thread.id, page: pageKey() })
      .catch(function () { /* state events carry the reason */ });
  }

  function bindCall() {
    if (!global.CabanaCall) return;
    var C = global.CabanaCall;

    C.setGuestKeyProvider(guestKey);

    C.on('state', function (s) {
      var phase = s.state;
      callActive = ['requesting_mic', 'dialling', 'ringing', 'connecting', 'active', 'reconnecting'].indexOf(phase) >= 0;

      el.callUI.setAttribute('data-phase', phase);
      el.callUI.setAttribute('data-on', callActive ? '1' : '0');
      el.callUI.setAttribute('aria-hidden', callActive ? 'false' : 'true');
      el.callBtn.setAttribute('data-live', callActive ? '1' : '0');
      el.callBtn.setAttribute('aria-label', callActive ? 'End the call' : 'Call the Cabana team in-app');

      var copy = {
        requesting_mic: 'Asking for your microphone…',
        dialling: 'Connecting you…',
        ringing: 'Ringing the Cabana team…',
        connecting: 'Connecting the audio…',
        active: 'Connected',
        reconnecting: 'Connection wobbled — holding on…',
      };
      if (el.callSub) el.callSub.textContent = copy[phase] || '';
      if (el.callName) {
        el.callName.textContent = (s.call && s.call.callee_name) || 'Cabana Support';
      }

      if (phase === 'ended') {
        var reason = s.detail && s.detail.reason;
        var secs = (s.detail && s.detail.seconds) || 0;
        if (el.callTimer) el.callTimer.textContent = '';
        if (reason && reason !== 'local_hangup' && reason !== 'remote_hangup') {
          toast(C.message(reason), '📞');
          if (reason === 'no_answer' && thread) {
            appendLocal({
              role: 'system',
              body: 'Nobody was free to take the call. Type it here instead — the team picks these up fast and everything above goes with it.',
              at: new Date().toISOString(), meta: {},
            });
          }
        } else if (secs > 0) {
          toast('Call ended · ' + fmtDuration(secs), '✓');
        }
        if (el.callMute) { el.callMute.innerHTML = SVG.mic; el.callMute.setAttribute('data-on', '0'); }
        /* A call always leaves the thread fresher than it found it. */
        clearTimeout(pollTimer); schedulePoll(true);
      }
    });

    C.on('tick', function (secs) {
      if (el.callTimer) el.callTimer.textContent = fmtDuration(secs);
    });

    C.on('level', function (v) {
      if (el.callLevel) el.callLevel.style.transform = 'scale(' + (1 + Math.min(0.28, v * 0.34)) + ')';
    });

    C.on('error', function (e) {
      if (e.code === 'autoplay_blocked') toast(C.message(e.code), '🔊');
    });
  }

  function fmtDuration(s) {
    var m = Math.floor(s / 60), r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  /* ══════════════════════════════════════════════════════════════════
     AUTH CHANGES
     Signing in mid-conversation must not cost the conversation.
  ══════════════════════════════════════════════════════════════════ */
  function watchAuth() {
    /* Prefer the shared session core. It already combines storage restore,
       auth events and bfcache recovery, so APA follows the exact identity
       the rest of the page is rendering. */
    if (global.ApaSession && global.ApaSession.subscribe) {
      var previous = null;
      global.ApaSession.subscribe(function (st) {
        var next = st && st.user && st.user.id ? 'user:' + st.user.id : 'guest';
        if (previous === null) { previous = next; return; }
        if (next === previous) {
          if (st && st.status === 'user' && st.name) callerName = st.name;
          return;
        }
        previous = next;

        /* Authentication changed underneath an already-painted widget.
           Discard identity-bound state, then bootstrap again. A guest
           conversation is adopted by the server during that bootstrap. */
        clearTimeout(pollTimer);
        booted = false;
        thread = null;
        messages = [];
        suggestions = [];
        lastAt = null;
        outbox = [];
        signedIn = !!(st && st.status === 'user');
        callerName = st && st.name || null;
        ls(LS_CACHE, null);
        setUnread(0);
        if (open) { paintIntro(); setTimeout(boot, 0); }
      });
      return;
    }

    /* Compatibility path for an old cached page without ApaSession. */
    var tries = 0;
    (function attach() {
      var sb = supa();
      if (!sb || !sb.auth || !sb.auth.onAuthStateChange) {
        if (tries++ < 40) return setTimeout(attach, 250);
        return;
      }
      sb.auth.onAuthStateChange(function (event) {
        if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT') return;
        setTimeout(function () {
          booted = false;
          thread = null;
          messages = [];
          ls(LS_CACHE, null);
          if (open) boot();
        }, 0);
      });
    })();
  }

  /* ══════════════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════════════ */
  /* ── Delegation ───────────────────────────────────────────────────
     Any element on the site, present now or rendered later:

       data-cbn-support                     open the console
       data-cbn-support + data-cbn-prefill  open it and send that message
       data-cbn-call                        start an in-app voice call
       data-cbn-talk                        open it in hands-free voice

     Every such element also carries a real href to /help.html, so the
     link works with JavaScript off, in a new tab, and for a crawler. ── */
  function delegate() {
    doc.addEventListener('click', function (e) {
      var t = e.target && e.target.closest
        ? e.target.closest('[data-cbn-support],[data-cbn-call],[data-cbn-talk]')
        : null;
      if (!t) return;
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;  // let a new tab be a new tab
      e.preventDefault();
      if (t.hasAttribute('data-cbn-call')) { startCall(); return; }
      if (t.hasAttribute('data-cbn-talk')) { openPanel(false); startHandsFree(); return; }
      var prefill = t.getAttribute('data-cbn-prefill');
      openPanel(!prefill);
      if (prefill) setTimeout(function () { submit(prefill); }, 360);
    });
  }

  function init() {
    if (doc.getElementById('cbn-sup-root')) return;
    ensureStyles();
    build();
    delegate();
    bindCall();
    watchAuth();

    /* ── Continuity. Three ways in, all of them resuming rather than
       starting: the panel was open when we navigated, a link asked for a
       specific thread, or a notification deep-linked a call. ── */
    var params = new URLSearchParams(global.location.search || '');
    var wantsThread = params.get('thread');
    var wantsCall = params.get('call');
    var csat = params.get('csat');

    if (ss(SS_OPEN) === '1' || wantsThread || wantsCall) {
      /* A beat, so the panel arrives after the page has painted rather
         than fighting it. */
      setTimeout(function () { openPanel(false); }, 420);
    } else if (cacheRead()) {
      /* Not opening, but there IS a conversation. Boot quietly so an
         unread reply lights the badge. */
      setTimeout(function () { boot(); }, 1500);
    }

    if (wantsCall && global.CabanaCall) {
      setTimeout(function () { offerIncoming(wantsCall); }, 1200);
    }

    if (csat && /^[1-5]$/.test(csat)) {
      setTimeout(function () {
        boot().then(function () {
          if (!thread) return;
          api('csat', { threadId: thread.id, score: parseInt(csat, 10) })
            .then(function () { toast('Thanks — that genuinely helps.', '💛'); })
            .catch(function () {});
        });
      }, 900);
    }
  }

  /* ══════════════════════════════════════════════════════════════════
     PUBLIC SURFACE
     Other scripts open support rather than reimplementing it.
  ══════════════════════════════════════════════════════════════════ */
  global.CabanaSupport = {
    open: function (prefill) {
      openPanel();
      if (prefill) setTimeout(function () { submit(prefill); }, 400);
    },
    close: closePanel,
    ask: function (text) { openPanel(false); submit(text); },
    human: function () { openPanel(false); requestHuman(); },
    call: startCall,
    guestKey: guestKey,

    /* Hands-free, for a page that wants to offer it directly — a "talk
       to APA" button on a listing, say. */
    talk: function () { openPanel(false); startHandsFree(); },
    stopTalking: function () { stopHandsFree(true); },
    get handsFree() { return handsFree; },
    get voiceSupported() { return VOICE_IN; },

    get thread() { return thread; },
    get isOpen() { return open; },
  };

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
