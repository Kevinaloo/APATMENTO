/* ═══════════════════════════════════════════════════════════════════
   APATMENTO · Ask APA  — voice + text assistant  v3
   ───────────────────────────────────────────────────────────────────
   WHAT'S NEW IN v3:
     · AUTO-NAVIGATION: APA moves the guest IMMEDIATELY — no button to
       click. When the model returns [[go:route]], the browser navigates
       in 1.4 seconds (enough for the guest to read APA's message).
       Includes URL parameter passing — APA can deep-link into filtered
       search results (area, beds, dates, etc.)
     · SMARTER GREET: context-aware opening line based on page + time.
     · RICHER PERSONA: charismatic, warm, genuinely funny.
     · INTENT DETECTION: client pre-parses obvious nav intent before
       even hitting the API, giving sub-100ms responses for common
       requests like "take me to tours" or "show me apartments".
     · MEMORY: session context (name, preferences) passed to API.
     · NAVIGATION ANNOUNCEMENT: brief animated toast shows where APA
       is taking the guest before the page changes.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.AskAPA) return;

  /* ── Config ──────────────────────────────────────────────────────── */
  var API_ENDPOINT  = '/api/ask-apa';
  var MAX_HISTORY   = 14;
  var VOICE_RATE    = 1.04;
  var VOICE_PITCH   = 1.0;
  var NAV_DELAY_MS  = 1500; // ms to show APA's message before navigating

  /* Route map — ONLY guest-accessible public routes */
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
    home:'Home', stays:'Apartments & Stays', apartments:'Apartments & Stays',
    tours:'Tours & Safaris', food:'Food & Dining', rides:'Rides', events:'Events',
    shopping:'Shopping', roommates:'Roommates', carhire:'Car Hire', flights:'Flights',
    bookings:'My Bookings', 'my-bookings':'My Bookings', profile:'Profile',
    rewards:'Rewards', dashboard:'Dashboard', signin:'Sign in', signup:'Sign up',
    auth:'Sign in', terms:'Terms', privacy:'Privacy'
  };
  var ROUTE_EMOJIS = {
    home:'🏠', stays:'🏠', apartments:'🏠', tours:'🦁', food:'🍽️', rides:'🚗',
    events:'🎟️', shopping:'🛍️', roommates:'🤝', carhire:'🚙', flights:'✈️',
    bookings:'📋', profile:'👤', rewards:'⭐', dashboard:'📊', signin:'🔐',
  };

  /* Quick intent map — common phrases → route (client-side, instant) */
  var QUICK_INTENT = [
    { re: /\b(apartments?|stays?|place|room|accommodation|flat|house|villa|bnb|airbnb)\b/i, route: 'stays' },
    { re: /\b(tour|safari|day.?trip|park|game.?drive|masai.?mara|amboseli|naivasha)\b/i, route: 'tours' },
    { re: /\b(event|ticket|concert|festival|party|show|gig)\b/i, route: 'events' },
    { re: /\b(food|restaurant|eat|delivery|dinner|lunch|breakfast|order)\b/i, route: 'food' },
    { re: /\b(ride|taxi|lift|uber|bolt|driver|airport)\b/i, route: 'rides' },
    { re: /\b(car.?hire|rent.?a.?car|self.?drive|vehicle.?hire)\b/i, route: 'carhire' },
    { re: /\b(roommate|flatmate|housemate|spare.?room|post.?room)\b/i, route: 'roommates' },
    { re: /\b(flight|fly|airline|airport|ticket)\b/i, route: 'flights' },
    { re: /\b(shopping|shop|buy|products|market)\b/i, route: 'shopping' },
    { re: /\b(my.?booking|check.?in|reservation|cancel|refund)\b/i, route: 'bookings' },
    { re: /\b(reward|points|referral|cashback)\b/i, route: 'rewards' },
    { re: /\b(sign.?in|log.?in|sign.?up|register|create.?account)\b/i, route: 'signin' },
  ];

  /* ── State ───────────────────────────────────────────────────────── */
  var history      = [];
  var sessionCtx   = {}; // remembered user context: name, preferences
  var listening    = false;
  var speaking     = false;
  var loading      = false;
  var recognition  = null;
  var panel        = null;
  var fab          = null;
  var open         = false;
  var handsFree    = false;
  var micDenied    = false;
  var wasVoiceTurn = false;
  var navPending   = null; // setTimeout handle for pending navigation

  var voiceOn   = ('SpeechRecognition' in global || 'webkitSpeechRecognition' in global);
  var synthOn   = ('speechSynthesis' in global);
  var secure    = (global.isSecureContext !== false) &&
                  (location.protocol === 'https:' || location.hostname === 'localhost');
  var voiceUsable = voiceOn && secure;

  /* ── Helpers ─────────────────────────────────────────────────────── */
  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function rAF(fn){ (global.requestAnimationFrame || setTimeout)(fn, 0); }
  function pageKey(){ return location.pathname.replace(/^\//,'').replace('.html','') || 'index'; }
  function pageLabel(){
    var map = {'':'Home','index':'Home','apartments':'Apartments','tours':'Tours',
      'food':'Food & Dining','rides':'Rides','events':'Events','shopping':'Shopping',
      'roommates':'Roommates','carhire':'Car Hire','flights':'Flights','my-bookings':'My Bookings',
      'booking-confirm':'Booking Confirmation','profile':'Profile','rewards':'Rewards','dashboard':'Dashboard'};
    return map[pageKey()] || null;
  }

  /* ── CSS ─────────────────────────────────────────────────────────── */
  var style = document.createElement('style');
  style.textContent = [
    '#apa-fab{position:fixed;bottom:calc(24px + env(safe-area-inset-bottom,0px));right:24px;z-index:9000;width:58px;height:58px;border-radius:50%;border:none;cursor:pointer;',
    'background:linear-gradient(135deg,#0D9467 0%,#7B2FF7 100%);box-shadow:0 8px 28px rgba(13,148,103,.38),0 2px 8px rgba(0,0,0,.12);',
    'display:flex;align-items:center;justify-content:center;transition:transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s;outline:none;}',
    '#apa-fab:hover{transform:scale(1.09);box-shadow:0 12px 36px rgba(13,148,103,.45);}',
    '#apa-fab:focus-visible{outline:3px solid #7B2FF7;outline-offset:3px;}',
    '#apa-fab svg{width:26px;height:26px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}',
    '#apa-fab .apa-pulse{position:absolute;inset:-3px;border-radius:50%;border:2px solid rgba(13,148,103,.4);animation:apaPulse 2s ease-out infinite;pointer-events:none;}',
    '@keyframes apaPulse{0%{transform:scale(1);opacity:1;}100%{transform:scale(1.6);opacity:0;}}',

    '#apa-panel{position:fixed;bottom:calc(94px + env(safe-area-inset-bottom,0px));right:24px;z-index:9001;width:380px;max-width:calc(100vw - 32px);',
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

    /* Navigation announcement toast */
    '.apa-nav-toast{align-self:flex-start;display:flex;align-items:center;gap:9px;margin:2px 0;padding:10px 14px;border-radius:14px;',
    'background:linear-gradient(135deg,rgba(13,148,103,.1),rgba(123,47,247,.08));',
    'border:1.5px solid rgba(13,148,103,.2);font:600 13px "Inter",system-ui,sans-serif;color:#0D9467;',
    'animation:apaMsgIn .25s ease,apaNavPulse 1.4s ease-out forwards;}',
    '@keyframes apaNavPulse{0%{border-color:rgba(13,148,103,.2);}50%{border-color:rgba(13,148,103,.7);box-shadow:0 0 0 4px rgba(13,148,103,.08);}100%{border-color:rgba(13,148,103,.2);}}',
    '.apa-nav-toast-ico{font-size:16px;flex-shrink:0;}',
    '.apa-nav-toast-txt{flex:1;}',
    '.apa-nav-toast-sub{font:400 11px "Inter",sans-serif;color:#8E90AD;margin-top:2px;}',
    '.apa-nav-bar{height:3px;border-radius:2px;background:linear-gradient(90deg,#0D9467,#7B2FF7);margin-top:6px;width:0;animation:apaNavBar ' + NAV_DELAY_MS + 'ms linear forwards;}',
    '@keyframes apaNavBar{to{width:100%;}}',

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
    '.apa-wave span:nth-child(1){height:8px;}.apa-wave span:nth-child(2){height:14px;animation-delay:.12s;}',
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

  /* ── Avatar popup styles ──────────────────────────────────────────── */
  var avatarStyle = document.createElement('style');
  avatarStyle.textContent = [
    '#apa-avatar-popup{position:fixed;bottom:calc(88px + env(safe-area-inset-bottom,0px));right:10px;z-index:8999;display:flex;flex-direction:row;align-items:flex-end;gap:0;transition:opacity .5s ease,transform .5s cubic-bezier(.34,1.2,.64,1);max-width:calc(100vw - 20px);}',
    '#apa-avatar-popup.apa-av-hidden{opacity:0;transform:translateY(28px) scale(.93);pointer-events:none;}',
    '#apa-avatar-popup.apa-av-visible{opacity:1;transform:none;pointer-events:all;}',
    '#apa-avatar-img{width:160px;height:auto;max-height:55vh;object-fit:contain;filter:drop-shadow(0 12px 32px rgba(0,0,0,.28));display:block;cursor:pointer;transition:transform .22s;user-select:none;flex-shrink:0;}',
    '#apa-avatar-img:hover{transform:scale(1.03) translateY(-4px);}',
    '#apa-avatar-bubble{background:#fff;border-radius:16px 16px 16px 4px;padding:11px 13px 10px;width:168px;flex-shrink:0;',
    'box-shadow:0 8px 28px rgba(10,10,20,.15),0 2px 6px rgba(0,0,0,.08);margin-bottom:24px;position:relative;}',
    '#apa-avatar-bubble::after{content:"";position:absolute;right:-9px;bottom:16px;border:9px solid transparent;border-left-color:#fff;border-right:0;border-bottom:0;}',
    '#apa-avatar-bubble .av-name{font:700 12.5px/1 "Inter",system-ui,sans-serif;color:#7B2FF7;margin-bottom:2px;}',
    '#apa-avatar-bubble .av-role{font:600 9.5px/1 "Inter",system-ui,sans-serif;color:#0D9467;margin-bottom:7px;text-transform:uppercase;letter-spacing:.04em;}',
    '#apa-avatar-bubble .av-body{font:400 11.5px/1.5 "Inter",system-ui,sans-serif;color:#4A4C66;}',
    '#apa-avatar-bubble .av-actions{display:flex;gap:6px;margin-top:9px;flex-wrap:wrap;}',
    '#apa-avatar-bubble .av-btn{display:inline-flex;align-items:center;gap:4px;padding:6px 10px;border-radius:20px;font:600 10.5px "Inter",system-ui,sans-serif;cursor:pointer;border:none;transition:.16s;white-space:nowrap;}',
    '#apa-avatar-bubble .av-btn-primary{background:linear-gradient(135deg,#0D9467,#7B2FF7);color:#fff;box-shadow:0 3px 10px rgba(13,148,103,.28);}',
    '#apa-avatar-bubble .av-btn-primary:hover{transform:translateY(-1px);box-shadow:0 5px 14px rgba(13,148,103,.38);}',
    '#apa-avatar-bubble .av-btn-secondary{background:#f4f5fb;color:#4A4C66;border:1.5px solid #e5e7ec;}',
    '#apa-avatar-bubble .av-btn-secondary:hover{border-color:#0D9467;color:#0D9467;background:#edfdf6;}',
    '#apa-avatar-bubble .av-btn svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;}',
    '#apa-av-dismiss{position:absolute;top:-10px;left:-10px;width:26px;height:26px;border-radius:50%;background:#1A1B2E;border:none;color:#fff;font-size:15px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,.3);transition:.15s;z-index:10;font-weight:700;}',
    '#apa-av-dismiss:hover{background:#7B2FF7;}',
    '@media(max-width:420px){#apa-avatar-img{width:130px;}#apa-avatar-bubble{width:148px;}#apa-avatar-popup{right:6px;}}',
    '#apa-fab{position:fixed;bottom:24px;right:24px;z-index:9000;width:62px;height:62px;border-radius:50%;border:3px solid rgba(255,255,255,.9);cursor:pointer;overflow:hidden;padding:0;background:linear-gradient(135deg,#0D9467 0%,#7B2FF7 100%);box-shadow:0 8px 28px rgba(13,148,103,.38),0 2px 8px rgba(0,0,0,.12);display:flex;align-items:center;justify-content:center;transition:transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s;outline:none;}',
    '#apa-fab:hover{transform:scale(1.09);box-shadow:0 12px 36px rgba(13,148,103,.45);}',
    '#apa-fab:focus-visible{outline:3px solid #7B2FF7;outline-offset:3px;}',
    '#apa-fab-avatar{width:100%;height:100%;object-fit:cover;object-position:top center;display:block;}',
    '#apa-fab .apa-pulse{position:absolute;inset:-3px;border-radius:50%;border:2px solid rgba(13,148,103,.4);animation:apaPulse 2s ease-out infinite;pointer-events:none;}',
    '.apa-head-av{width:44px;height:44px;border-radius:50%;overflow:hidden;flex:0 0 auto;border:2px solid rgba(255,255,255,.55);}',
    '.apa-head-av img{width:100%;height:100%;object-fit:cover;object-position:top center;display:block;}'
  ].join('');
  document.head.appendChild(avatarStyle);

  /* ── Build UI ────────────────────────────────────────────────────── */
  function build() {
    fab = document.createElement('button');
    fab.id = 'apa-fab';
    fab.setAttribute('aria-label', 'Ask APA — open assistant');
    fab.innerHTML =
      '<div class="apa-pulse"></div>' +
      '<img id="apa-fab-avatar" src="/cabana-avatar.png" alt="APA" />';
    fab.onclick = toggle;
    document.body.appendChild(fab);

    panel = document.createElement('div');
    panel.id = 'apa-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Ask APA assistant');
    panel.innerHTML =
      '<div class="apa-head">' +
        '<div class="apa-head-av"><img src="/cabana-avatar.png" alt="APA" /></div>' +
        '<div class="apa-head-info">' +
          '<div class="apa-head-name">APA</div>' +
          '<div class="apa-head-sub">Apatmento Guide · Online</div>' +
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
        '<button class="apa-talk" id="apa-talk" onclick="AskAPA.toggleHandsFree()" aria-label="Hands-free voice">' +
          '<svg viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3M9 22h6"/></svg>' +
          '<span id="apa-talk-label">Talk to APA</span>' +
        '</button>' +
      '</div>' : '') +
      '<div class="apa-bar">' +
        '<textarea class="apa-input" id="apa-input" rows="1" placeholder="Ask APA anything…" aria-label="Message APA"></textarea>' +
        (voiceUsable ? '<button class="apa-mic" id="apa-mic" aria-label="Voice input" onclick="AskAPA.toggleVoice()"><svg viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3M9 22h6"/></svg></button>' : '') +
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
    if (p === 'apartments') return ['Find me a 2-bed in Kilimani', 'What\u2019s the check-in process?', 'How does the 30% deposit work?'];
    if (p === 'tours')      return ['Show me safaris', 'Day trips near Nairobi', 'What\u2019s included in tours?'];
    if (p === 'events')     return ['What\u2019s on this weekend?', 'How do I get event tickets?'];
    if (p === 'food')       return ['Order food near me', 'Best restaurants in Westlands'];
    if (p === 'rides')      return ['How do rides work?', 'Book a ride to JKIA'];
    if (p === 'carhire')    return ['Self-drive cars', 'What do I need to rent?'];
    if (p === 'roommates')  return ['Find me a flatmate', 'Post my spare room'];
    if (p === 'my-bookings')return ['How do I check in?', 'Cancel a booking', 'I have a problem with my stay'];
    return ['Find me an apartment in Nairobi', 'Plan a weekend getaway', 'Book a safari', 'Take me to tours'];
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
    micDenied = false;
    panel.classList.add('open');
    if (fab) fab.setAttribute('aria-expanded', 'true');
    hideAvatarPopup();
    if (!history.length) greet();
    rAF(function () { var inp = document.getElementById('apa-input'); if (inp) inp.focus(); });
  }

  function close() {
    open = false;
    panel.classList.remove('open');
    if (fab) fab.setAttribute('aria-expanded', 'false');
    handsFree = false; setTalkUI(false);
    stopVoice(); stopSpeech();
    if (navPending) { clearTimeout(navPending); navPending = null; }
  }

  /* ── Smart greeting (context-aware) ──────────────────────────────── */
  function greet() {
    var h = new Date().getHours();
    var g = h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
    var p = pageLabel();

    var openers = [
      g + '! I\u2019m APA \u2014 your personal guide to Nairobi and beyond.',
      g + '! APA here. Think of me as your well-connected Nairobi friend who knows everywhere.',
      g + '! APA \u2014 let\u2019s find you exactly what you need.',
    ];
    var opener = openers[Math.floor(Math.random() * openers.length)];

    var msg = opener + (p ? ' You\u2019re on the ' + p + ' page. ' : ' ');
    msg += 'I can take you directly to stays, tours, rides, food, events and more \u2014 or just help you figure out what you want. What\u2019s the plan?';
    appendMsg('apa', msg);
  }

  /* ── Messages ────────────────────────────────────────────────────── */
  function appendMsg(role, text) {
    var msgs = document.getElementById('apa-msgs');
    if (!msgs) return null;
    var div = document.createElement('div');
    div.className = 'apa-msg ' + role;
    div.innerHTML = linkify(esc(text));
    div.querySelectorAll('a[data-apa-route]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); go(a.getAttribute('data-apa-route'), null, true); });
    });
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function linkify(s) {
    return s.replace(/\/([-a-z]+)\.html(\?[^\s<"']*)?/g, function (m, name, qs) {
      var label = ROUTE_LABELS[name] || '/' + name + '.html';
      return '<a href="/' + name + '.html' + (qs || '') + '" data-apa-route="' + name + '">' + label + '</a>';
    });
  }

  /* ── Navigation announcement toast (auto-navigates after delay) ── */
  function showNavToast(routeKey, params) {
    var msgs = document.getElementById('apa-msgs');
    if (!msgs) return;
    var label = ROUTE_LABELS[routeKey] || routeKey;
    var emoji = ROUTE_EMOJIS[routeKey] || '📍';

    var toast = document.createElement('div');
    toast.className = 'apa-nav-toast';
    toast.innerHTML =
      '<span class="apa-nav-toast-ico">' + emoji + '</span>' +
      '<div class="apa-nav-toast-txt">Taking you to <strong>' + esc(label) + '</strong>' +
        '<div class="apa-nav-toast-sub">Navigating in a moment…</div>' +
        '<div class="apa-nav-bar"></div>' +
      '</div>';
    msgs.appendChild(toast);
    msgs.scrollTop = msgs.scrollHeight;

    // Clear any pending navigation
    if (navPending) { clearTimeout(navPending); navPending = null; }

    navPending = setTimeout(function () {
      navPending = null;
      go(routeKey, params, false);
    }, NAV_DELAY_MS);
  }

  /* ── Execute navigation ──────────────────────────────────────────── */
  function go(routeKey, params, immediate) {
    var key = String(routeKey || '').toLowerCase();
    var baseUrl = ROUTES[key];
    if (!baseUrl) return;

    stopVoice(); stopSpeech();

    // Build final URL — merge base URL's existing params with new params
    var finalUrl = baseUrl;
    if (params && params.length > 1) {
      // params starts with '?' e.g. "?area=Westlands&guests=2"
      var base = baseUrl.split('?')[0];
      finalUrl = base + params;
    }

    // Don't navigate if already on the target page (base path check)
    var here = location.pathname.replace(/^\//,'');
    var target = finalUrl.split('?')[0].replace(/^\//,'');
    if (here === target && !params) return;

    if (immediate) {
      if (navPending) { clearTimeout(navPending); navPending = null; }
      close();
      global.location.href = finalUrl;
    } else {
      close();
      global.location.href = finalUrl;
    }
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

  /* ── Quick intent detection (client-side, instant) ───────────────── */
  function detectQuickIntent(text) {
    var lower = text.toLowerCase();
    // Only fire on clear navigation requests, not questions
    var navVerbs = /\b(take me|go to|show me|open|find|browse|book|i want|i need|let me see|navigate)\b/i;
    if (!navVerbs.test(lower)) return null;
    for (var i = 0; i < QUICK_INTENT.length; i++) {
      if (QUICK_INTENT[i].re.test(lower)) return QUICK_INTENT[i].route;
    }
    return null;
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
    var chips = document.getElementById('apa-chips');
    if (chips) chips.innerHTML = '';
    submit(text);
  }

  function submit(text) {
    if (!text) return;
    stopSpeech();
    if (navPending) { clearTimeout(navPending); navPending = null; }
    appendMsg('user', text);
    var chips = document.getElementById('apa-chips');
    if (chips) chips.innerHTML = '';

    history.push({ role: 'user', content: text });
    if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);

    var typing = showTyping();
    loading = true;
    var btn = document.getElementById('apa-send');
    if (btn) btn.disabled = true;

    // Build user context string from session memory
    var ctxParts = [];
    if (sessionCtx.name)     ctxParts.push('Name: ' + sessionCtx.name);
    if (sessionCtx.prefs)    ctxParts.push('Preferences: ' + sessionCtx.prefs);
    if (sessionCtx.budget)   ctxParts.push('Budget: ' + sessionCtx.budget);
    if (sessionCtx.location) ctxParts.push('Location/area: ' + sessionCtx.location);
    var userCtxStr = ctxParts.length ? ctxParts.join('. ') : null;

    fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: history,
        page: pageKey(),
        userContext: userCtxStr
      })
    })
    .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
    .then(function (res) {
      if (typing) typing.remove();
      loading = false;
      if (btn) btn.disabled = false;

      var data = res.d || {};
      var reply = data.reply || data.error || 'Something went sideways. Try again?';
      var navKey = data.navigate && ROUTES[String(data.navigate).toLowerCase()]
        ? String(data.navigate).toLowerCase() : null;
      var navParams = data.navigateParams || null;

      // Extract session info from response (name, preferences)
      extractSessionCtx(reply);

      history.push({ role: 'assistant', content: reply });
      appendMsg('apa', reply);

      // AUTO-NAVIGATE: show toast → navigate after delay
      if (navKey) {
        showNavToast(navKey, navParams);
      }

      if (synthOn && (speaking || handsFree || wasVoiceTurn)) speak(reply);
      wasVoiceTurn = false;
    })
    .catch(function () {
      if (typing) typing.remove();
      loading = false;
      if (btn) btn.disabled = false;
      appendMsg('apa', 'Nairobi WiFi moment \ud83d\udce1 — give it another shot.');
      wasVoiceTurn = false;
    });
  }

  /* ── Extract session context from conversation ───────────────────── */
  function extractSessionCtx(text) {
    // Pick up on name if mentioned
    var nameMatch = text.match(/(?:you mentioned|your name is|hi\s+)([A-Z][a-z]+)/);
    if (nameMatch && !sessionCtx.name) sessionCtx.name = nameMatch[1];
  }

  /* ── TTS ─────────────────────────────────────────────────────────── */
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
    var clean = text.replace(/\/[-a-z.]+\.html/g,'').replace(/https?:\/\/\S+/g,'')
                    .replace(/[*_#`>]/g,'').replace(/\s{2,}/g,' ').trim();
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

  /* ── STT ─────────────────────────────────────────────────────────── */
  function toggleVoice() { if (!voiceUsable) return explainNoVoice(); listening ? stopVoice() : startVoice(); }
  function toggleHandsFree() {
    if (!voiceUsable) return explainNoVoice();
    handsFree = !handsFree; setTalkUI(handsFree);
    if (handsFree) { stopSpeech(); startVoice(); } else { stopVoice(); }
  }
  function setTalkUI(on) {
    var t = document.getElementById('apa-talk');
    var l = document.getElementById('apa-talk-label');
    if (t) t.classList.toggle('active', on);
    if (l) l.textContent = on ? 'Listening\u2026 tap to stop' : 'Talk to APA';
  }
  function explainNoVoice() {
    if (!voiceOn) appendMsg('apa', 'Voice isn\u2019t supported in this browser, but text works great \u2014 type away.');
    else if (!secure) appendMsg('apa', 'Voice needs https. On the live site it works fine. For now, just type.');
    else if (micDenied) appendMsg('apa', 'Mic access is blocked \u2014 enable it in your browser settings. Or just type, I\u2019m here either way.');
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
      micDenied = false;
      var mic = document.getElementById('apa-mic');
      var vbar = document.getElementById('apa-vbar');
      if (mic) mic.classList.add('on', 'listening');
      if (vbar) vbar.style.display = 'flex';
    };
    recognition.onresult = function (e) {
      var t = '';
      for (var i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript;
      var vt = document.getElementById('apa-vtext');
      if (vt) vt.textContent = t || 'Listening\u2026';
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
        appendMsg('apa', 'Microphone is blocked. Go to Chrome \u2192 Settings \u2192 Site settings \u2192 Microphone \u2192 find apatmento.space and set it to Allow, then try again.');
      } else if (err === 'no-speech') { maybeReopenMic(); }
      else if (err !== 'aborted') { maybeReopenMic(); }
    };
    recognition.onend = function () {
      var mic = document.getElementById('apa-mic');
      var vbar = document.getElementById('apa-vbar');
      if (mic) mic.classList.remove('on', 'listening');
      if (vbar) vbar.style.display = 'none';
      listening = false; recognition = null;
    };
    try { recognition.start(); } catch (_) { listening = false; }
  }

  function stopVoice() {
    if (recognition) { try { recognition.stop(); } catch (_) {} recognition = null; }
    listening = false;
    var mic = document.getElementById('apa-mic');
    var vbar = document.getElementById('apa-vbar');
    var vt = document.getElementById('apa-vtext');
    if (mic) mic.classList.remove('on', 'listening');
    if (vbar) vbar.style.display = 'none';
    if (vt) vt.textContent = 'Listening\u2026';
  }

  /* ── Keyboard ────────────────────────────────────────────────────── */
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) close(); });
  if (synthOn && global.speechSynthesis.onvoiceschanged !== undefined) {
    global.speechSynthesis.onvoiceschanged = function () {};
  }

  /* ── Avatar popup ────────────────────────────────────────────────── */
  var avatarPopup = null;
  var avatarAutoTimer = null;

  function buildAvatarPopup() {
    var popup = document.createElement('div');
    popup.id = 'apa-avatar-popup';
    popup.className = 'apa-av-hidden';
    popup.innerHTML =
      '<div id="apa-avatar-bubble">' +
        '<button id="apa-av-dismiss" aria-label="Dismiss" onclick="dismissAvatar(event)">\xd7</button>' +
        '<div class="av-name">Hey, I\u2019m APA! \ud83d\udc4b</div>' +
        '<div class="av-role">Your Nairobi Travel Guide</div>' +
        '<div class="av-body">Stays, tours, rides, food \u2014 I\u2019ll take you straight there. What do you need?</div>' +
        '<div class="av-actions">' +
          '<button class="av-btn av-btn-primary" onclick="openFromAvatar()">' +
            '<svg viewBox="0 0 24 24"><path d="m22 2-11 11M22 2 15 22l-4-9-9-4 20-7z"/></svg>Chat' +
          '</button>' +
          '<button class="av-btn av-btn-secondary" onclick="openVoiceFromAvatar()">' +
            '<svg viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3M9 22h6"/></svg>Voice' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<img id="apa-avatar-img" src="/cabana-avatar.png" alt="APA" onclick="openFromAvatar()" />';
    document.body.appendChild(popup);
    avatarPopup = popup;

    function maybeShow() {
      if (global.ApaSession) {
        ApaSession.ready(function (state) {
          if (state.status !== 'guest') return;
          setTimeout(function () {
            if (!avatarPopup) return;
            popup.classList.remove('apa-av-hidden');
            popup.classList.add('apa-av-visible');
            avatarAutoTimer = setTimeout(function () { hideAvatarPopup(); }, 8000);
          }, 20000);
        });
      } else { setTimeout(maybeShow, 800); }
    }
    maybeShow();
  }

  function hideAvatarPopup() {
    if (avatarAutoTimer) { clearTimeout(avatarAutoTimer); avatarAutoTimer = null; }
    if (avatarPopup) {
      avatarPopup.classList.remove('apa-av-visible');
      avatarPopup.classList.add('apa-av-hidden');
    }
  }

  global.dismissAvatar    = function (e) { e.stopPropagation(); hideAvatarPopup(); };
  global.openFromAvatar   = function () { hideAvatarPopup(); openPanel(); };
  global.openVoiceFromAvatar = function () {
    hideAvatarPopup(); openPanel();
    setTimeout(function () { if (global.AskAPA) AskAPA.toggleHandsFree(); }, 400);
  };

  /* ── Init ────────────────────────────────────────────────────────── */
  function init() {
    buildAvatarPopup();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
    else build();
  }
  init();

  /* ── Public API ──────────────────────────────────────────────────── */
  global.AskAPA = {
    open: openPanel, close: close, toggle: toggle,
    send: send, quickSend: quickSend,
    toggleVoice: toggleVoice, toggleHandsFree: toggleHandsFree,
    navigate: function(key, params) { go(key, params, true); },
    setContext: function(ctx) { if (ctx && typeof ctx === 'object') Object.assign(sessionCtx, ctx); },
    clearHistory: function () { history = []; sessionCtx = {}; }
  };

})(typeof window !== 'undefined' ? window : this);
