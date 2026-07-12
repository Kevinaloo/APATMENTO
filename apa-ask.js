/* ═══════════════════════════════════════════════════════════════════
   APATMENTO · Ask APA  — voice + text assistant  v2
   ───────────────────────────────────────────────────────────────────
   A floating button on every guest page. Opens a chat + voice panel.
   Groq (server) for reasoning; Web Speech API in the browser for STT/TTS.

   WHAT'S NEW IN v2
     · True two-way voice: tap "Talk", speak, APA replies out loud, and
       in hands-free mode the mic re-opens so you can just keep talking.
     · Active navigation: APA can move the guest to any page/section by
       returning a structured action the client executes.
     · Robust voice fallback: when SpeechRecognition is unavailable
       (some mobile browsers, insecure origins, denied mic) the UI says
       exactly why and offers text — never a dead "not available".
     · The assistant only knows guest-accessible site functions. It has
       no access to restricted or sensitive user data.

   SECURITY
     · All model calls go through /api/ask-apa (system prompt server-side)
     · Client never holds the system prompt; history is in memory only
     · Navigation actions are whitelisted client-side — the model cannot
       send the browser anywhere that isn't an approved public route
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.AskAPA) return;

  /* ── Config ──────────────────────────────────────────────────────── */
  var API_ENDPOINT = '/api/ask-apa';
  var MAX_HISTORY  = 12;
  var VOICE_RATE   = 1.04;
  var VOICE_PITCH  = 1.0;

  /* Whitelisted, guest-accessible destinations. The model may ask to
     navigate ONLY to these. Anything else is ignored — this is the
     hard client-side guard against navigation abuse. */
  var ROUTES = {
    home:'/index.html', stays:'/apartments.html', apartments:'/apartments.html',
    tours:'/tours.html', food:'/food.html', rides:'/rides.html', events:'/events.html',
    shopping:'/shopping.html', roommates:'/roommates.html', carhire:'/carhire.html',
    flights:'/flights.html', bookings:'/my-bookings.html', 'my-bookings':'/my-bookings.html',
    profile:'/profile.html', rewards:'/rewards.html', dashboard:'/dashboard.html',
    signin:'/auth.html', signup:'/auth.html?mode=signup', auth:'/auth.html',
    terms:'/terms.html', privacy:'/privacy.html'
  };
  var ROUTE_LABELS = {
    home:'Home', stays:'Apartments', apartments:'Apartments', tours:'Tours',
    food:'Food', rides:'Rides', events:'Events', shopping:'Shopping',
    roommates:'Roommates', carhire:'Car Hire', flights:'Flights',
    bookings:'My Bookings', 'my-bookings':'My Bookings', profile:'Profile',
    rewards:'Rewards', dashboard:'Dashboard', signin:'Sign in', signup:'Sign up',
    auth:'Sign in', terms:'Terms', privacy:'Privacy'
  };

  /* ── State ───────────────────────────────────────────────────────── */
  var history    = [];
  var listening  = false;
  var speaking   = false;
  var loading    = false;
  var recognition= null;
  var panel      = null;
  var fab        = null;
  var open       = false;
  var handsFree  = false;   // when true, mic reopens after APA finishes speaking
  var micDenied  = false;
  var wasVoiceTurn = false; // current turn came from the mic
  var voiceOn    = ('SpeechRecognition' in global || 'webkitSpeechRecognition' in global);
  var synthOn    = ('speechSynthesis' in global);
  var secure     = (global.isSecureContext !== false) &&
                   (location.protocol === 'https:' || location.hostname === 'localhost');
  var voiceUsable= voiceOn && secure;

  /* ── Helpers ─────────────────────────────────────────────────────── */
  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function rAF(fn){ (global.requestAnimationFrame || setTimeout)(fn, 0); }

  /* ── CSS ─────────────────────────────────────────────────────────── */
  var style = document.createElement('style');
  style.textContent = [
    '#apa-fab{position:fixed;bottom:24px;right:24px;z-index:9000;width:58px;height:58px;border-radius:50%;border:none;cursor:pointer;',
    'background:linear-gradient(135deg,#0D9467 0%,#7B2FF7 100%);box-shadow:0 8px 28px rgba(13,148,103,.38),0 2px 8px rgba(0,0,0,.12);',
    'display:flex;align-items:center;justify-content:center;transition:transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s;outline:none;}',
    '#apa-fab:hover{transform:scale(1.09);box-shadow:0 12px 36px rgba(13,148,103,.45);}',
    '#apa-fab:focus-visible{outline:3px solid #7B2FF7;outline-offset:3px;}',
    '#apa-fab svg{width:26px;height:26px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}',
    '#apa-fab .apa-pulse{position:absolute;inset:-3px;border-radius:50%;border:2px solid rgba(13,148,103,.4);animation:apaPulse 2s ease-out infinite;pointer-events:none;}',
    '@keyframes apaPulse{0%{transform:scale(1);opacity:1;}100%{transform:scale(1.6);opacity:0;}}',

    '#apa-panel{position:fixed;bottom:94px;right:24px;z-index:9001;width:372px;max-width:calc(100vw - 32px);',
    'background:#fff;border-radius:22px;box-shadow:0 24px 80px rgba(10,10,20,.15),0 8px 24px rgba(10,10,20,.08);',
    'display:flex;flex-direction:column;overflow:hidden;transform:translateY(12px) scale(.97);opacity:0;pointer-events:none;',
    'transition:transform .28s cubic-bezier(.34,1.2,.64,1),opacity .22s;}',
    '#apa-panel.open{transform:none;opacity:1;pointer-events:all;}',
    '@media(max-width:420px){#apa-panel{width:calc(100vw - 24px);right:12px;bottom:86px;border-radius:18px;}}',

    '.apa-head{display:flex;align-items:center;gap:11px;padding:16px 18px 14px;background:linear-gradient(135deg,#0D9467 0%,#7B2FF7 100%);}',
    '.apa-head-av{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;flex:0 0 auto;}',
    '.apa-head-av svg{width:20px;height:20px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}',
    '.apa-head-info{flex:1;min-width:0;}',
    '.apa-head-name{font:700 15px/1 "Inter",system-ui,sans-serif;color:#fff;letter-spacing:-.01em;}',
    '.apa-head-sub{font:400 11.5px/1 "Inter",system-ui,sans-serif;color:rgba(255,255,255,.72);margin-top:3px;}',
    '.apa-head-dot{width:7px;height:7px;border-radius:50%;background:#4ade80;flex:0 0 auto;box-shadow:0 0 6px rgba(74,222,128,.8);}',
    '.apa-head-close{background:rgba(255,255,255,.16);border:none;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;transition:.15s;}',
    '.apa-head-close:hover{background:rgba(255,255,255,.28);}',

    '.apa-msgs{flex:1;overflow-y:auto;padding:16px 14px 8px;display:flex;flex-direction:column;gap:10px;max-height:344px;min-height:180px;scroll-behavior:smooth;}',
    '.apa-msg{max-width:88%;padding:10px 13px;border-radius:16px;font:400 13.5px/1.6 "Inter",system-ui,sans-serif;word-break:break-word;animation:apaMsgIn .2s ease;}',
    '@keyframes apaMsgIn{from{opacity:0;transform:translateY(5px);}}',
    '.apa-msg.user{align-self:flex-end;background:linear-gradient(135deg,#0D9467,#0a7a55);color:#fff;border-radius:16px 16px 4px 16px;}',
    '.apa-msg.apa{align-self:flex-start;background:#f4f5fb;color:#1A1B2E;border-radius:16px 16px 16px 4px;}',
    '.apa-msg.apa a{color:#0D9467;text-decoration:underline;cursor:pointer;}',
    '.apa-nav-cta{align-self:flex-start;display:inline-flex;align-items:center;gap:8px;margin:-2px 0 2px;padding:9px 15px;border:none;border-radius:12px;background:linear-gradient(135deg,#0D9467,#7B2FF7);color:#fff;font:600 13px "Inter",system-ui,sans-serif;cursor:pointer;box-shadow:0 6px 18px rgba(13,148,103,.28);transition:.16s;animation:apaMsgIn .2s ease;}',
    '.apa-nav-cta:hover{transform:translateY(-1px);box-shadow:0 10px 24px rgba(13,148,103,.36);}',
    '.apa-nav-cta svg{width:15px;height:15px;fill:none;stroke:#fff;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;}',
    '.apa-typing{align-self:flex-start;background:#f4f5fb;padding:12px 16px;border-radius:16px 16px 16px 4px;display:flex;gap:5px;align-items:center;}',
    '.apa-typing span{width:6px;height:6px;border-radius:50%;background:#8E90AD;animation:apaBounce .9s ease-in-out infinite;}',
    '.apa-typing span:nth-child(2){animation-delay:.18s;}.apa-typing span:nth-child(3){animation-delay:.36s;}',
    '@keyframes apaBounce{0%,80%,100%{transform:translateY(0);}40%{transform:translateY(-6px);}}',

    '.apa-bar{display:flex;align-items:flex-end;gap:9px;padding:10px 14px 14px;border-top:1px solid rgba(10,10,20,.07);}',
    '.apa-input{flex:1;border:1.5px solid #e5e7ec;border-radius:14px;padding:10px 13px;font:400 13.5px/1.55 "Inter",system-ui,sans-serif;resize:none;outline:none;max-height:100px;overflow-y:auto;transition:border-color .15s;background:#fafbfc;}',
    '.apa-input:focus{border-color:#0D9467;background:#fff;}',
    '.apa-input::placeholder{color:#b0b3c6;}',
    '.apa-send,.apa-mic{width:38px;height:38px;border-radius:12px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.16s;flex:0 0 auto;}',
    '.apa-send{background:#0f1117;}.apa-send:hover{background:#1a1d2e;}',
    '.apa-send:disabled{background:#dfe2e8;cursor:not-allowed;}',
    '.apa-send svg,.apa-mic svg{width:18px;height:18px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}',
    '.apa-mic{background:#f4f5fb;}.apa-mic svg{stroke:#8E90AD;}',
    '.apa-mic.on{background:linear-gradient(135deg,#e8fdf5,#f0f4ff);}.apa-mic.on svg{stroke:#0D9467;}',
    '.apa-mic.listening{animation:apaMicPulse .8s ease-in-out infinite;}',
    '@keyframes apaMicPulse{0%,100%{box-shadow:0 0 0 0 rgba(13,148,103,.4);}50%{box-shadow:0 0 0 8px rgba(13,148,103,0);}}',

    '.apa-talkrow{display:flex;align-items:center;gap:8px;padding:0 14px 10px;}',
    '.apa-talk{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:11px;border:1.5px solid #e5e7ec;border-radius:13px;background:#fafbfc;color:#4A4C66;font:600 13px "Inter",system-ui,sans-serif;cursor:pointer;transition:.16s;}',
    '.apa-talk:hover{border-color:#0D9467;color:#0D9467;background:#edfdf6;}',
    '.apa-talk.active{background:linear-gradient(135deg,#0D9467,#7B2FF7);color:#fff;border-color:transparent;}',
    '.apa-talk svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}',
    '.apa-talk.active svg{stroke:#fff;}',

    '.apa-voice-bar{padding:0 14px 10px;display:flex;align-items:center;gap:10px;font:400 12px "Inter",system-ui,sans-serif;color:#8E90AD;}',
    '.apa-voice-bar .apa-wave{display:flex;align-items:flex-end;gap:3px;height:18px;}',
    '.apa-voice-bar .apa-wave span{width:3px;border-radius:2px;background:#0D9467;animation:apaWave .7s ease-in-out infinite;}',
    '.apa-wave span:nth-child(1){height:8px;animation-delay:0s;}.apa-wave span:nth-child(2){height:14px;animation-delay:.12s;}',
    '.apa-wave span:nth-child(3){height:10px;animation-delay:.24s;}.apa-wave span:nth-child(4){height:16px;animation-delay:.08s;}',
    '.apa-wave span:nth-child(5){height:7px;animation-delay:.2s;}',
    '@keyframes apaWave{0%,100%{transform:scaleY(.6);}50%{transform:scaleY(1);}}',

    '.apa-chips{display:flex;flex-wrap:wrap;gap:7px;padding:0 14px 10px;}',
    '.apa-chip{background:#f4f5fb;border:1.5px solid #e8eaee;color:#4A4C66;border-radius:99px;padding:6px 12px;font:500 12px "Inter",system-ui,sans-serif;cursor:pointer;transition:.15s;white-space:nowrap;}',
    '.apa-chip:hover{border-color:#0D9467;color:#0D9467;background:#edfdf6;}',

    '.apa-speaking-badge{display:none;align-items:center;gap:6px;padding:4px 10px 10px 14px;font:400 11.5px "Inter",system-ui,sans-serif;color:#0D9467;}',
    '.apa-speaking-badge.on{display:flex;}',
    '.apa-spk-dot{width:7px;height:7px;border-radius:50%;background:#0D9467;animation:apaBlink 1.1s infinite;}',
    '@keyframes apaBlink{50%{opacity:.2;}}',

    '.apa-note{padding:0 14px 10px;font:400 11px "Inter",system-ui,sans-serif;color:#a0a3b5;text-align:center;}'
  ].join('');
  document.head.appendChild(style);

  /* ── Markup ──────────────────────────────────────────────────────── */
  function build() {
    fab = document.createElement('button');
    fab.id = 'apa-fab';
    fab.setAttribute('aria-label', 'Ask APA — open assistant');
    fab.innerHTML =
      '<div class="apa-pulse"></div>' +
      '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/>' +
      '<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
    fab.onclick = toggle;
    document.body.appendChild(fab);

    panel = document.createElement('div');
    panel.id = 'apa-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Ask APA assistant');
    panel.innerHTML =
      '<div class="apa-head">' +
        '<div class="apa-head-av"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/>' +
        '<path d="M6 20c0-3.31 2.69-6 6-6s6 2.69 6 6"/></svg></div>' +
        '<div class="apa-head-info">' +
          '<div class="apa-head-name">APA</div>' +
          '<div class="apa-head-sub">Cabana Assistant · Online</div>' +
        '</div>' +
        '<div class="apa-head-dot" aria-hidden="true"></div>' +
        '<button class="apa-head-close" onclick="AskAPA.close()" aria-label="Close">×</button>' +
      '</div>' +
      '<div class="apa-msgs" id="apa-msgs" aria-live="polite" aria-atomic="false"></div>' +
      '<div class="apa-chips" id="apa-chips"></div>' +
      '<div class="apa-speaking-badge" id="apa-spk"><span class="apa-spk-dot"></span>Speaking…</div>' +
      '<div class="apa-voice-bar" id="apa-vbar" style="display:none;">' +
        '<div class="apa-wave"><span></span><span></span><span></span><span></span><span></span></div>' +
        '<span id="apa-vtext">Listening…</span>' +
      '</div>' +
      (voiceUsable ?
      '<div class="apa-talkrow">' +
        '<button class="apa-talk" id="apa-talk" onclick="AskAPA.toggleHandsFree()" aria-label="Hands-free voice conversation">' +
          '<svg viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3M9 22h6"/></svg>' +
          '<span id="apa-talk-label">Talk to APA</span>' +
        '</button>' +
      '</div>' : '') +
      '<div class="apa-bar">' +
        '<textarea class="apa-input" id="apa-input" rows="1" placeholder="Ask APA anything…" aria-label="Message APA"></textarea>' +
        (voiceUsable ? '<button class="apa-mic" id="apa-mic" aria-label="Voice input (one message)" onclick="AskAPA.toggleVoice()"><svg viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3M9 22h6"/></svg></button>' : '') +
        '<button class="apa-send" id="apa-send" aria-label="Send" onclick="AskAPA.send()"><svg viewBox="0 0 24 24"><path d="m22 2-11 11M22 2 15 22l-4-9-9-4 20-7z"/></svg></button>' +
      '</div>' +
      (voiceOn && !secure ? '<div class="apa-note">Voice needs a secure (https) connection.</div>' :
       (!voiceOn ? '<div class="apa-note">Voice isn\u2019t supported in this browser — text works great.</div>' : ''));
    document.body.appendChild(panel);

    var inp = document.getElementById('apa-input');
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); AskAPA.send(); }
    });
    inp.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    });

    showChips(defaultChips());
    if (synthOn) { try { global.speechSynthesis.getVoices(); } catch (_) {} }
  }

  function defaultChips() {
    var p = pageKey();
    if (p === 'apartments') return ['Find a place in Kilimani under 8k', 'How does check-in work?', 'What\u2019s the refund policy?'];
    if (p === 'tours')      return ['Show me day tours near Nairobi', 'Book a safari', 'What\u2019s included?'];
    if (p === 'events')     return ['What events are on this weekend?', 'How do I get tickets?'];
    if (p === 'food')       return ['Order food near me', 'Which restaurants deliver?'];
    if (p === 'rides')      return ['How do rides work?', 'Book a ride'];
    if (p === 'carhire')    return ['Hire a self-drive car', 'What do I need to rent?'];
    if (p === 'roommates')  return ['Find me a flatmate', 'Post my room'];
    if (p === 'my-bookings')return ['Help me check in', 'Cancel a booking'];
    return ['Find me an apartment', 'Plan a weekend in Nairobi', 'How does booking work?', 'Take me to tours'];
  }

  function showChips(chips) {
    var el = document.getElementById('apa-chips');
    if (!el) return;
    el.innerHTML = chips.map(function (c) {
      return '<button class="apa-chip" onclick="AskAPA.quickSend(\'' + c.replace(/'/g, "\\'") + '\')">' + esc(c) + '</button>';
    }).join('');
  }

  /* ── Open / close ────────────────────────────────────────────────── */
  function toggle() { open ? close() : openPanel(); }

  function openPanel() {
    open = true;
    panel.classList.add('open');
    fab.setAttribute('aria-expanded', 'true');
    if (!history.length) greet();
    rAF(function () { var inp = document.getElementById('apa-input'); if (inp) inp.focus(); });
  }

  function close() {
    open = false;
    panel.classList.remove('open');
    fab.setAttribute('aria-expanded', 'false');
    handsFree = false; setTalkUI(false);
    stopVoice(); stopSpeech();
  }

  /* ── Greeting ────────────────────────────────────────────────────── */
  function greet() {
    var hour = new Date().getHours();
    var g = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    var page = pageLabel();
    var msg = g + '! I\u2019m APA, your Cabana guide. ';
    if (page) msg += 'You\u2019re on the ' + page + ' page. ';
    msg += 'I can help you find and book stays, tours, rides, food, events and more — and take you straight to the right page. What are you after?';
    appendMsg('apa', msg);
  }

  function pageKey() { return location.pathname.replace(/^\//, '').replace('.html', '') || 'index'; }
  function pageLabel() {
    var map = { '':'Home','index':'Home','apartments':'Apartments','tours':'Tours',
      'food':'Food & Dining','rides':'Rides','events':'Events','shopping':'Shopping',
      'roommates':'Roommates','carhire':'Car Hire','flights':'Flights','my-bookings':'My Bookings',
      'booking-confirm':'Booking','profile':'Profile','rewards':'Rewards','dashboard':'Dashboard' };
    return map[pageKey()] || null;
  }

  /* ── Messages ────────────────────────────────────────────────────── */
  function appendMsg(role, text) {
    var msgs = document.getElementById('apa-msgs');
    if (!msgs) return null;
    var div = document.createElement('div');
    div.className = 'apa-msg ' + role;
    div.innerHTML = linkify(esc(text));
    div.querySelectorAll('a[data-apa-route]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); go(a.getAttribute('data-apa-route')); });
    });
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function linkify(s) {
    return s.replace(/\/([-a-z]+)\.html/g, function (m, name) {
      return '<a href="/' + name + '.html" data-apa-route="' + name + '">/' + name + '.html</a>';
    });
  }

  function appendNavCta(routeKey) {
    var msgs = document.getElementById('apa-msgs');
    if (!msgs) return;
    var label = ROUTE_LABELS[routeKey] || 'there';
    var btn = document.createElement('button');
    btn.className = 'apa-nav-cta';
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg> Take me to ' + esc(label);
    btn.onclick = function () { go(routeKey); };
    msgs.appendChild(btn);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function go(routeKey) {
    var url = ROUTES[String(routeKey || '').toLowerCase()];
    if (!url) return;
    stopVoice(); stopSpeech(); close();
    var here = location.pathname.replace(/^\//,'');
    var target = url.replace(/^\//,'').split('?')[0];
    if (here === target || (here === '' && target === 'index.html')) return;
    global.location.href = url;
  }

  function showTyping() {
    var msgs = document.getElementById('apa-msgs');
    if (!msgs) return null;
    var t = document.createElement('div');
    t.className = 'apa-typing';
    t.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(t); msgs.scrollTop = msgs.scrollHeight;
    return t;
  }

  /* ── Send / submit ───────────────────────────────────────────────── */
  function send() {
    if (loading) return;
    var inp = document.getElementById('apa-input');
    var text = (inp ? inp.value : '').trim();
    if (!text) return;
    inp.value = ''; inp.style.height = 'auto';
    submit(text);
  }

  function quickSend(text) {
    var chips = document.getElementById('apa-chips');
    if (chips) chips.innerHTML = '';
    submit(text);
  }

  function submit(text) {
    if (!text) return;
    stopSpeech();
    appendMsg('user', text);
    var chips = document.getElementById('apa-chips');
    if (chips) chips.innerHTML = '';

    history.push({ role: 'user', content: text });
    if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);

    var typing = showTyping();
    loading = true;
    var btn = document.getElementById('apa-send');
    if (btn) btn.disabled = true;

    fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history, page: pageKey() })
    })
    .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
    .then(function (res) {
      if (typing) typing.remove();
      loading = false;
      if (btn) btn.disabled = false;

      var data = res.d || {};
      var reply = data.reply || data.error || 'Sorry, something went wrong. Please try again.';
      var navKey = data.navigate && ROUTES[String(data.navigate).toLowerCase()] ? String(data.navigate).toLowerCase() : null;

      history.push({ role: 'assistant', content: reply });
      appendMsg('apa', reply);
      if (navKey) appendNavCta(navKey);

      if (synthOn && (speaking || handsFree || wasVoiceTurn)) speak(reply);
      wasVoiceTurn = false;
    })
    .catch(function () {
      if (typing) typing.remove();
      loading = false;
      if (btn) btn.disabled = false;
      appendMsg('apa', 'I\u2019m having trouble connecting right now. Please try again in a moment.');
      wasVoiceTurn = false;
    });
  }

  /* ── Speech synthesis (TTS) ──────────────────────────────────────── */
  function pickVoice() {
    if (!synthOn) return null;
    var voices = global.speechSynthesis.getVoices() || [];
    var pref = voices.filter(function (v) { return /en[-_]/i.test(v.lang); });
    return (pref.find(function (v){ return /ke/i.test(v.lang); })
         || pref.find(function (v){ return /gb/i.test(v.lang); })
         || pref[0] || voices[0] || null);
  }

  function speak(text) {
    if (!synthOn || !text) { maybeReopenMic(); return; }
    stopSpeech();
    var clean = text
      .replace(/\/[-a-z.]+\.html/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[*_#`>]/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (!clean) { maybeReopenMic(); return; }

    var u = new SpeechSynthesisUtterance(clean.slice(0, 600));
    var v = pickVoice(); if (v) u.voice = v;
    u.rate = VOICE_RATE; u.pitch = VOICE_PITCH; u.lang = (v && v.lang) || 'en-GB';
    var badge = document.getElementById('apa-spk');
    u.onstart = function () { speaking = true; if (badge) badge.classList.add('on'); };
    u.onend = function () { speaking = false; if (badge) badge.classList.remove('on'); maybeReopenMic(); };
    u.onerror = function () { speaking = false; if (badge) badge.classList.remove('on'); maybeReopenMic(); };
    try { global.speechSynthesis.speak(u); } catch (_) { maybeReopenMic(); }
  }

  function stopSpeech() {
    if (synthOn && global.speechSynthesis.speaking) { try { global.speechSynthesis.cancel(); } catch (_) {} }
    speaking = false;
    var badge = document.getElementById('apa-spk');
    if (badge) badge.classList.remove('on');
  }

  function maybeReopenMic() {
    if (handsFree && open && !micDenied && voiceUsable) {
      setTimeout(function () { if (handsFree && !listening && !speaking) startVoice(); }, 350);
    }
  }

  /* ── Speech recognition (STT) ────────────────────────────────────── */
  function toggleVoice() {
    if (!voiceUsable) return explainNoVoice();
    listening ? stopVoice() : startVoice();
  }

  function toggleHandsFree() {
    if (!voiceUsable) return explainNoVoice();
    handsFree = !handsFree;
    setTalkUI(handsFree);
    if (handsFree) { stopSpeech(); startVoice(); }
    else { stopVoice(); }
  }

  function setTalkUI(on) {
    var t = document.getElementById('apa-talk');
    var l = document.getElementById('apa-talk-label');
    if (t) t.classList.toggle('active', on);
    if (l) l.textContent = on ? 'Listening… tap to stop' : 'Talk to APA';
  }

  function explainNoVoice() {
    if (!voiceOn) appendMsg('apa', 'Voice isn\u2019t supported in this browser, but I\u2019m fully here in text — just type what you need.');
    else if (!secure) appendMsg('apa', 'Voice needs a secure (https) connection. On the live site it works; meanwhile, type away and I\u2019ll help.');
    else if (micDenied) appendMsg('apa', 'Microphone access looks blocked. Enable it in your browser settings to talk, or just type — I\u2019m happy either way.');
  }

  function startVoice() {
    if (listening || !voiceUsable) return;
    stopSpeech();
    var SR = global.SpeechRecognition || global.webkitSpeechRecognition;
    try { recognition = new SR(); } catch (_) { explainNoVoice(); return; }
    recognition.lang = 'en-KE';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = function () {
      listening = true;
      var mic = document.getElementById('apa-mic');
      var vbar = document.getElementById('apa-vbar');
      if (mic) mic.classList.add('on', 'listening');
      if (vbar) vbar.style.display = 'flex';
    };

    recognition.onresult = function (e) {
      var t = '';
      for (var i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript;
      var vt = document.getElementById('apa-vtext');
      if (vt) vt.textContent = t || 'Listening…';
      if (e.results[e.results.length - 1].isFinal) {
        var finalText = t.trim();
        stopVoice();
        if (finalText) { wasVoiceTurn = true; submit(finalText); }
        else maybeReopenMic();
      }
    };

    recognition.onerror = function (e) {
      var err = e && e.error;
      stopVoice();
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        micDenied = true; handsFree = false; setTalkUI(false);
        appendMsg('apa', 'I need microphone permission to hear you. Enable it in your browser\u2019s address-bar settings, or just keep typing.');
      } else if (err === 'no-speech') {
        maybeReopenMic();
      } else if (err !== 'aborted') {
        maybeReopenMic();
      }
    };

    recognition.onend = function () {
      var mic = document.getElementById('apa-mic');
      var vbar = document.getElementById('apa-vbar');
      if (mic) mic.classList.remove('on', 'listening');
      if (vbar) vbar.style.display = 'none';
      listening = false;
      recognition = null;
    };

    try { recognition.start(); } catch (_) { listening = false; }
  }

  function stopVoice() {
    if (recognition) { try { recognition.stop(); } catch (_) {} recognition = null; }
    listening = false;
    var mic  = document.getElementById('apa-mic');
    var vbar = document.getElementById('apa-vbar');
    var vt   = document.getElementById('apa-vtext');
    if (mic) mic.classList.remove('on', 'listening');
    if (vbar) vbar.style.display = 'none';
    if (vt) vt.textContent = 'Listening…';
  }

  /* ── Keyboard dismiss ────────────────────────────────────────────── */
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) close(); });
  if (synthOn && global.speechSynthesis.onvoiceschanged !== undefined) {
    global.speechSynthesis.onvoiceschanged = function () {};
  }

  /* ── Init ────────────────────────────────────────────────────────── */
  function init() {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
    else build();
  }
  init();

  /* ── Public API ──────────────────────────────────────────────────── */
  global.AskAPA = {
    open: openPanel, close: close, toggle: toggle,
    send: send, quickSend: quickSend,
    toggleVoice: toggleVoice, toggleHandsFree: toggleHandsFree,
    navigate: go,
    clearHistory: function () { history = []; }
  };

})(typeof window !== 'undefined' ? window : this);
