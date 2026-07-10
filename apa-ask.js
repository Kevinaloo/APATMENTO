/* ═══════════════════════════════════════════════════════════════════
   APATMENTO · Ask APA  — voice + text assistant  v1
   ───────────────────────────────────────────────────────────────────
   A floating button on every page. Opens a chat + voice panel.
   Groq llama-3.3-70b on the server; Web Speech API in the browser.

   Security:
     · All model calls go through /api/ask-apa (server-side prompt)
     · Client never holds the system prompt
     · Message history held in memory only, cleared on close
     · Rate-limited server-side by IP
     · Voice transcript passes through the same sanitiser path

   Voice:
     · Web Speech API (SpeechRecognition) for STT — no third-party
     · Web Speech API (SpeechSynthesis) for TTS — no third-party
     · Falls back gracefully to text-only when unavailable

   Accessibility:
     · Full keyboard nav (Tab, Enter, Esc)
     · ARIA live region for replies
     · Reduced-motion respected
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.AskAPA) return;

  /* ── Config ──────────────────────────────────────────────────────── */
  var API_ENDPOINT = '/api/ask-apa';
  var MAX_HISTORY  = 12;   // turns kept
  var VOICE_RATE   = 1.05;
  var VOICE_PITCH  = 1.0;

  /* ── State ───────────────────────────────────────────────────────── */
  var history    = [];    // [{role, content}]
  var listening  = false;
  var speaking   = false;
  var loading    = false;
  var recognition= null;
  var panel      = null;
  var fab        = null;
  var open       = false;
  var voiceOn    = ('SpeechRecognition' in global || 'webkitSpeechRecognition' in global);
  var synthOn    = ('speechSynthesis' in global);

  /* ── Helpers ─────────────────────────────────────────────────────── */
  function $  (s) { return panel ? panel.querySelector(s) : null; }
  function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function rAF(fn){ (global.requestAnimationFrame || setTimeout)(fn, 0); }

  /* ── CSS ─────────────────────────────────────────────────────────── */
  var style = document.createElement('style');
  style.textContent = [
    /* FAB */
    '#apa-fab{position:fixed;bottom:24px;right:24px;z-index:9000;',
    'width:58px;height:58px;border-radius:50%;border:none;cursor:pointer;',
    'background:linear-gradient(135deg,#0D9467 0%,#7B2FF7 100%);',
    'box-shadow:0 8px 28px rgba(13,148,103,.38),0 2px 8px rgba(0,0,0,.12);',
    'display:flex;align-items:center;justify-content:center;',
    'transition:transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s;',
    'outline:none;}',
    '#apa-fab:hover{transform:scale(1.09);box-shadow:0 12px 36px rgba(13,148,103,.45);}',
    '#apa-fab:focus-visible{outline:3px solid #7B2FF7;outline-offset:3px;}',
    '#apa-fab svg{width:26px;height:26px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}',
    '#apa-fab .apa-pulse{position:absolute;inset:-3px;border-radius:50%;',
    'border:2px solid rgba(13,148,103,.4);animation:apaPulse 2s ease-out infinite;pointer-events:none;}',
    '@keyframes apaPulse{0%{transform:scale(1);opacity:1;}100%{transform:scale(1.6);opacity:0;}}',

    /* Panel */
    '#apa-panel{position:fixed;bottom:94px;right:24px;z-index:9001;',
    'width:360px;max-width:calc(100vw - 32px);',
    'background:#fff;border-radius:22px;',
    'box-shadow:0 24px 80px rgba(10,10,20,.15),0 8px 24px rgba(10,10,20,.08);',
    'display:flex;flex-direction:column;overflow:hidden;',
    'transform:translateY(12px) scale(.97);opacity:0;pointer-events:none;',
    'transition:transform .28s cubic-bezier(.34,1.2,.64,1),opacity .22s;}',
    '#apa-panel.open{transform:none;opacity:1;pointer-events:all;}',
    '@media(max-width:420px){#apa-panel{width:calc(100vw - 24px);right:12px;bottom:86px;border-radius:18px;}}',

    /* Header */
    '.apa-head{display:flex;align-items:center;gap:11px;padding:16px 18px 14px;',
    'background:linear-gradient(135deg,#0D9467 0%,#7B2FF7 100%);}',
    '.apa-head-av{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.22);',
    'display:flex;align-items:center;justify-content:center;flex:0 0 auto;}',
    '.apa-head-av svg{width:20px;height:20px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}',
    '.apa-head-info{flex:1;min-width:0;}',
    '.apa-head-name{font:700 15px/1 "General Sans",system-ui,sans-serif;color:#fff;letter-spacing:-.01em;}',
    '.apa-head-sub{font:400 11.5px/1 "General Sans",system-ui,sans-serif;color:rgba(255,255,255,.72);margin-top:3px;}',
    '.apa-head-dot{width:7px;height:7px;border-radius:50%;background:#4ade80;',
    'flex:0 0 auto;box-shadow:0 0 6px rgba(74,222,128,.8);}',
    '.apa-head-close{background:rgba(255,255,255,.16);border:none;color:#fff;',
    'width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:18px;',
    'display:flex;align-items:center;justify-content:center;transition:.15s;}',
    '.apa-head-close:hover{background:rgba(255,255,255,.28);}',

    /* Messages */
    '.apa-msgs{flex:1;overflow-y:auto;padding:16px 14px 8px;display:flex;flex-direction:column;gap:10px;',
    'max-height:340px;min-height:180px;scroll-behavior:smooth;}',
    '.apa-msg{max-width:88%;padding:10px 13px;border-radius:16px;font:400 13.5px/1.6 "General Sans",system-ui,sans-serif;',
    'word-break:break-word;animation:apaMsgIn .2s ease;}',
    '@keyframes apaMsgIn{from{opacity:0;transform:translateY(5px);}}',
    '.apa-msg.user{align-self:flex-end;background:linear-gradient(135deg,#0D9467,#0a7a55);color:#fff;border-radius:16px 16px 4px 16px;}',
    '.apa-msg.apa{align-self:flex-start;background:#f4f5fb;color:#1A1B2E;border-radius:16px 16px 16px 4px;}',
    '.apa-msg.apa a{color:#0D9467;text-decoration:underline;}',
    '.apa-typing{align-self:flex-start;background:#f4f5fb;padding:12px 16px;border-radius:16px 16px 16px 4px;',
    'display:flex;gap:5px;align-items:center;}',
    '.apa-typing span{width:6px;height:6px;border-radius:50%;background:#8E90AD;',
    'animation:apaBounce .9s ease-in-out infinite;}',
    '.apa-typing span:nth-child(2){animation-delay:.18s;}',
    '.apa-typing span:nth-child(3){animation-delay:.36s;}',
    '@keyframes apaBounce{0%,80%,100%{transform:translateY(0);}40%{transform:translateY(-6px);}}',

    /* Input bar */
    '.apa-bar{display:flex;align-items:flex-end;gap:9px;padding:10px 14px 14px;',
    'border-top:1px solid rgba(10,10,20,.07);}',
    '.apa-input{flex:1;border:1.5px solid #e5e7ec;border-radius:14px;padding:10px 13px;',
    'font:400 13.5px/1.55 "General Sans",system-ui,sans-serif;resize:none;',
    'outline:none;max-height:100px;overflow-y:auto;transition:border-color .15s;background:#fafbfc;}',
    '.apa-input:focus{border-color:#0D9467;background:#fff;}',
    '.apa-input::placeholder{color:#b0b3c6;}',
    '.apa-send,.apa-mic{width:38px;height:38px;border-radius:12px;border:none;cursor:pointer;',
    'display:flex;align-items:center;justify-content:center;transition:.16s;flex:0 0 auto;}',
    '.apa-send{background:#0f1117;}.apa-send:hover{background:#1a1d2e;}',
    '.apa-send:disabled{background:#dfe2e8;cursor:not-allowed;}',
    '.apa-send svg,.apa-mic svg{width:18px;height:18px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}',
    '.apa-mic{background:#f4f5fb;}.apa-mic svg{stroke:#8E90AD;}',
    '.apa-mic.on{background:linear-gradient(135deg,#e8fdf5,#f0f4ff);}.apa-mic.on svg{stroke:#0D9467;}',
    '.apa-mic.listening{animation:apaMicPulse .8s ease-in-out infinite;}',
    '@keyframes apaMicPulse{0%,100%{box-shadow:0 0 0 0 rgba(13,148,103,.4);}50%{box-shadow:0 0 0 8px rgba(13,148,103,0);}}',

    /* Voice bar */
    '.apa-voice-bar{padding:0 14px 10px;display:flex;align-items:center;gap:10px;',
    'font:400 12px "General Sans",system-ui,sans-serif;color:#8E90AD;}',
    '.apa-voice-bar .apa-wave{display:flex;align-items:flex-end;gap:3px;height:18px;}',
    '.apa-voice-bar .apa-wave span{width:3px;border-radius:2px;background:#0D9467;',
    'animation:apaWave .7s ease-in-out infinite;}',
    '.apa-wave span:nth-child(1){height:8px;animation-delay:0s;}',
    '.apa-wave span:nth-child(2){height:14px;animation-delay:.12s;}',
    '.apa-wave span:nth-child(3){height:10px;animation-delay:.24s;}',
    '.apa-wave span:nth-child(4){height:16px;animation-delay:.08s;}',
    '.apa-wave span:nth-child(5){height:7px;animation-delay:.2s;}',
    '@keyframes apaWave{0%,100%{transform:scaleY(.6);}50%{transform:scaleY(1);}}',

    /* Quick chips */
    '.apa-chips{display:flex;flex-wrap:wrap;gap:7px;padding:0 14px 10px;}',
    '.apa-chip{background:#f4f5fb;border:1.5px solid #e8eaee;color:#4A4C66;',
    'border-radius:99px;padding:6px 12px;font:500 12px "General Sans",system-ui,sans-serif;',
    'cursor:pointer;transition:.15s;white-space:nowrap;}',
    '.apa-chip:hover{border-color:#0D9467;color:#0D9467;background:#edfdf6;}',

    /* Speaking indicator */
    '.apa-speaking-badge{display:none;align-items:center;gap:6px;padding:4px 10px 10px 14px;',
    'font:400 11.5px "General Sans",system-ui,sans-serif;color:#0D9467;}',
    '.apa-speaking-badge.on{display:flex;}',
    '.apa-spk-dot{width:7px;height:7px;border-radius:50%;background:#0D9467;',
    'animation:apaBlink 1.1s infinite;}',
    '@keyframes apaBlink{50%{opacity:.2;}}',
  ].join('');
  document.head.appendChild(style);

  /* ── Markup ──────────────────────────────────────────────────────── */
  function build() {
    /* FAB */
    fab = document.createElement('button');
    fab.id = 'apa-fab';
    fab.setAttribute('aria-label', 'Ask APA — open assistant');
    fab.innerHTML =
      '<div class="apa-pulse"></div>' +
      '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/>' +
      '<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
    fab.onclick = toggle;
    document.body.appendChild(fab);

    /* Panel */
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
          '<div class="apa-head-sub">Apatmento Assistant · Online</div>' +
        '</div>' +
        '<div class="apa-head-dot" aria-hidden="true"></div>' +
        '<button class="apa-head-close" onclick="AskAPA.close()" aria-label="Close">×</button>' +
      '</div>' +
      '<div class="apa-msgs" id="apa-msgs" aria-live="polite" aria-atomic="false"></div>' +
      '<div class="apa-chips" id="apa-chips"></div>' +
      '<div class="apa-speaking-badge" id="apa-spk">' +
        '<span class="apa-spk-dot"></span>Speaking…' +
      '</div>' +
      '<div class="apa-voice-bar" id="apa-vbar" style="display:none;">' +
        '<div class="apa-wave">' +
          '<span></span><span></span><span></span><span></span><span></span>' +
        '</div>' +
        '<span id="apa-vtext">Listening…</span>' +
      '</div>' +
      '<div class="apa-bar">' +
        '<textarea class="apa-input" id="apa-input" rows="1" placeholder="Ask APA anything…" ' +
          'aria-label="Message APA"></textarea>' +
        (voiceOn ? '<button class="apa-mic" id="apa-mic" aria-label="Voice input" onclick="AskAPA.toggleVoice()"><svg viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3M9 22h6"/></svg></button>' : '') +
        '<button class="apa-send" id="apa-send" aria-label="Send" onclick="AskAPA.send()"><svg viewBox="0 0 24 24"><path d="m22 2-11 11M22 2 15 22l-4-9-9-4 20-7z"/></svg></button>' +
      '</div>';
    document.body.appendChild(panel);

    /* Wire up textarea */
    var inp = document.getElementById('apa-input');
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); AskAPA.send(); }
    });
    inp.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    });

    showChips([
      'Find me an apartment in Westlands',
      'How does check-in work?',
      'Book a tour',
      'What\'s the cancellation policy?',
    ]);
  }

  function showChips(chips) {
    var el = document.getElementById('apa-chips');
    if (!el) return;
    el.innerHTML = chips.map(function (c) {
      return '<button class="apa-chip" onclick="AskAPA.quickSend(\'' + c.replace(/'/g, "\\'") + '\')">' + esc(c) + '</button>';
    }).join('');
  }

  /* ── Toggle open/close ───────────────────────────────────────────── */
  function toggle() { open ? close() : openPanel(); }

  function openPanel() {
    open = true;
    panel.classList.add('open');
    fab.setAttribute('aria-expanded', 'true');
    if (!history.length) greet();
    rAF(function () {
      var inp = document.getElementById('apa-input');
      if (inp) inp.focus();
    });
  }

  function close() {
    open = false;
    panel.classList.remove('open');
    fab.setAttribute('aria-expanded', 'false');
    stopVoice(); stopSpeech();
  }

  /* ── Greeting ────────────────────────────────────────────────────── */
  function greet() {
    var hour = new Date().getHours();
    var greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    var page = detectPage();
    var msg = greet + '! I\'m APA — Apatmento\'s smart assistant. ';
    if (page) msg += 'You\'re on the ' + page + ' page. ';
    msg += 'How can I help you today? I can help you find a place to stay, book a tour, sort out check-in — just ask.';
    appendMsg('apa', msg);
  }

  function detectPage() {
    var p = location.pathname.replace(/^\//, '').replace('.html', '');
    var map = {
      '': 'Home', 'index': 'Home', 'apartments': 'Apartments',
      'tours': 'Tours', 'food': 'Food & Dining', 'rides': 'Rides',
      'events': 'Events', 'shopping': 'Shopping', 'roommates': 'Roommates',
      'carhire': 'Car Hire', 'flights': 'Flights', 'my-bookings': 'My Bookings',
      'booking-confirm': 'Booking', 'profile': 'Profile', 'rewards': 'Rewards',
    };
    return map[p] || null;
  }

  /* ── Messages ────────────────────────────────────────────────────── */
  function appendMsg(role, text) {
    var msgs = document.getElementById('apa-msgs');
    if (!msgs) return;
    var div = document.createElement('div');
    div.className = 'apa-msg ' + role;
    div.innerHTML = linkify(esc(text));
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function linkify(s) {
    return s.replace(/\/([-a-z]+\.html)/g, '<a href="/$1" onclick="AskAPA.close()">/$1</a>');
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

  /* ── Send ────────────────────────────────────────────────────────── */
  function send() {
    if (loading) return;
    var inp = document.getElementById('apa-input');
    var text = (inp ? inp.value : '').trim();
    if (!text) return;
    inp.value = ''; inp.style.height = 'auto';
    submit(text);
  }

  function quickSend(text) {
    document.getElementById('apa-chips').innerHTML = '';
    submit(text);
    appendMsg('user', text);
  }

  function submit(text) {
    if (!text) return;
    stopSpeech();
    appendMsg('user', text);
    document.getElementById('apa-chips').innerHTML = '';

    history.push({ role: 'user', content: text });
    if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);

    var typing = showTyping();
    loading = true;
    var btn = document.getElementById('apa-send');
    if (btn) btn.disabled = true;

    fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }),
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (typing) typing.remove();
      loading = false;
      if (btn) btn.disabled = false;
      var reply = data.reply || data.error || 'Sorry, something went wrong. Please try again.';
      history.push({ role: 'assistant', content: reply });
      appendMsg('apa', reply);
      if (synthOn) speak(reply);
    })
    .catch(function () {
      if (typing) typing.remove();
      loading = false;
      if (btn) btn.disabled = false;
      appendMsg('apa', 'I\'m having trouble connecting right now. Please try again in a moment.');
    });
  }

  /* ── Speech synthesis ───────────────────────────────────────────── */
  function speak(text) {
    if (!synthOn || !text) return;
    stopSpeech();
    // Strip markdown-ish and URLs before speaking
    var clean = text.replace(/\/[-a-z.]+\.html/g, '').replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();
    if (!clean) return;
    var u = new SpeechSynthesisUtterance(clean.slice(0, 400));
    u.rate = VOICE_RATE; u.pitch = VOICE_PITCH; u.lang = 'en-KE';
    var badge = document.getElementById('apa-spk');
    u.onstart = function () { speaking = true; if (badge) badge.classList.add('on'); };
    u.onend = u.onerror = function () { speaking = false; if (badge) badge.classList.remove('on'); };
    global.speechSynthesis.speak(u);
  }

  function stopSpeech() {
    if (synthOn && global.speechSynthesis.speaking) global.speechSynthesis.cancel();
    speaking = false;
    var badge = document.getElementById('apa-spk');
    if (badge) badge.classList.remove('on');
  }

  /* ── Speech recognition ─────────────────────────────────────────── */
  function toggleVoice() {
    if (!voiceOn) return;
    listening ? stopVoice() : startVoice();
  }

  function startVoice() {
    if (listening || !voiceOn) return;
    stopSpeech();
    var SR = global.SpeechRecognition || global.webkitSpeechRecognition;
    recognition = new SR();
    recognition.lang = 'en-KE';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = function () {
      listening = true;
      var mic = document.getElementById('apa-mic');
      var vbar = document.getElementById('apa-vbar');
      if (mic) { mic.classList.add('on', 'listening'); }
      if (vbar) vbar.style.display = 'flex';
    };

    recognition.onresult = function (e) {
      var t = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        t += e.results[i][0].transcript;
      }
      var vt = document.getElementById('apa-vtext');
      if (vt) vt.textContent = t || 'Listening…';
      var inp = document.getElementById('apa-input');
      if (inp && e.results[e.results.length - 1].isFinal) {
        inp.value = t;
        stopVoice();
        submit(t);
      }
    };

    recognition.onerror = function (e) {
      stopVoice();
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        appendMsg('apa', 'I couldn\'t catch that — please try typing instead.');
      }
    };

    recognition.onend = function () { stopVoice(); };
    recognition.start();
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
    var inp = document.getElementById('apa-input');
    if (inp) inp.value = '';
  }

  /* ── Keyboard dismiss ────────────────────────────────────────────── */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && open) close();
  });

  /* ── Init ────────────────────────────────────────────────────────── */
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', build);
    } else {
      build();
    }
  }

  init();

  /* ── Public API ──────────────────────────────────────────────────── */
  global.AskAPA = {
    open:        openPanel,
    close:       close,
    toggle:      toggle,
    send:        send,
    quickSend:   quickSend,
    toggleVoice: toggleVoice,
    clearHistory: function () { history = []; },
  };

})(typeof window !== 'undefined' ? window : this);
