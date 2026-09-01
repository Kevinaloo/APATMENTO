/* ════════════════════════════════════════════════════════════════════════════
   CABANA MESSENGER  v5. Chat.js
   ────────────────────────────────────────────────────────────────────────────
   Two-sided real-time messaging (guest ↔ host), premium design.
   • Guest messages: right side, violet-blue gradient
   • Host messages:  left side, light card bg, like WhatsApp / iMessage
   • Day dividers (clean line, no em-dash)
   • Inter font throughout, loaded via Google Fonts
   • Fortress-level contact bypass detection (100+ patterns)
   • Bell badge wired to dashboard + stays topbar
   ════════════════════════════════════════════════════════════════════════════ */

const CabanaChat = (() => {
  'use strict';

  /* ── Constants ─────────────────────────────────────────────────────────── */
  const TYPE_ICONS = {
    apartment:'🏠', roommate:'🤝', tour:'🦁', event:'🎟',
    carhire:'🚗', food:'🍽', shopping:'🛍', stays:'🏠',
  };
  const POLL_MS  = 30_000;
  const MSG_LIMIT = 200;

  /* ── State ─────────────────────────────────────────────────────────────── */
  let _uid       = null;   // current user id
  let _conv      = null;   // active conversation row
  let _panSub    = null;   // realtime: floating panel
  let _thrSub    = null;   // realtime: inbox thread
  let _glbSub    = null;   // realtime: global unread
  let _pollTimer = null;
  let _ibView    = 'list'; // 'list' | 'thread'
  let _allConvs  = [];

  const sb = () => window.sb || null;

  /* ════════════════════════════════════════════════════════════════════════
     FORTRESS SCRUBBER
     Multi-layered detection: digit sequences, word-coded numbers,
     leet-speak replacements, location keywords, platform names.
  ════════════════════════════════════════════════════════════════════════ */
  const SCRUB = [
    /* ── Phone numbers ─────────────────────────────────────────────────── */
    // Kenyan mobile: 07xx / 01xx / +2547xx / +2541xx
    { re:/(?:\+?254|0)[\s\-._()]*[17][\s\-._()]*\d[\s\-._()]*\d[\s\-._()]*\d[\s\-._()]*\d[\s\-._()]*\d[\s\-._()]*\d[\s\-._()]*\d/g, tag:'phone' },
    // Generic international
    { re:/(?:\+\d{1,3}[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}/g, tag:'phone' },
    // Raw 10+ digit strings
    { re:/\b\d{10}\b/g, tag:'phone' },
    // Digits separated by punctuation / spaces (e.g. 07 16 206 494)
    { re:/\b0[\s._\-]*[17][\s._\-]*\d[\s._\-]*\d[\s._\-]*\d[\s._\-]*\d[\s._\-]*\d[\s._\-]*\d[\s._\-]*\d\b/g, tag:'phone' },
    // Digit groups spaced out (e.g. 07 16 206)
    { re:/\b\d{2,4}[\s._]+\d{3,4}[\s._]+\d{3,4}\b/g, tag:'phone' },

    /* ── Word-coded numbers (bypass: "zero seven one six…") ────────────── */
    {
      re:/\b(?:zero|oh|one|two|three|four|five|six|seven|eight|nine)(?:[\s\-_,]+(?:zero|oh|one|two|three|four|five|six|seven|eight|nine)){4}\b/gi,
      tag:'phone'
    },
    // Mixed word+digit bypass ("07 one six 206")
    {
      re:/\b(?:\d+|zero|oh|one|two|three|four|five|six|seven|eight|nine)(?:[\s\-_,]+(?:\d+|zero|oh|one|two|three|four|five|six|seven|eight|nine)){4}\b/gi,
      tag:'phone'
    },
    // Ordinal / coded ("first digit is 0, second is 7…")
    { re:/(?:first|second|third|fourth|fifth)\s+(?:digit|number|no\.?)\s+is\s+\d/gi, tag:'phone' },
    // "07then16then206then494" style
    { re:/\d{2}(?:then|and|plus|next)\d{2,3}(?:then|and|plus|next)\d{2,3}/gi, tag:'phone' },
    // Leet substitutions for digits: 0→o, 1→l/i, 3→e, 4→a, 5→s, 7→t
    { re:/\b[0oOiIlL][7tT][1iIlL][6bB][zZ2][0oO][6bB]\b/g, tag:'phone' },

    /* ── Email ─────────────────────────────────────────────────────────── */
    { re:/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2}/g, tag:'email' },
    // Obfuscated: "name [at] domain [dot] com"
    { re:/[a-zA-Z0-9._%+\-]+\s*[\[({]?\s*at\s*[\])}]?\s*[a-zA-Z0-9.\-]+\s*[\[({]?\s*dot\s*[\])}]?\s*[a-zA-Z]{2}/gi, tag:'email' },
    // "name at domain"
    { re:/\b\w[\w.+\-]*\s+at\s+\w[\w.\-]*\.[a-zA-Z]{2}\b/gi, tag:'email' },

    /* ── WhatsApp ───────────────────────────────────────────────────────── */
    { re:/wh?a?ts?[\s._\-]*a?pp?/gi, tag:'WhatsApp' },
    { re:/\bwa[\s._\-]?me\b/gi, tag:'WhatsApp' },
    { re:/wa\.me\/\S+/gi, tag:'WhatsApp link' },

    /* ── Direct contact requests ──────────────────────────────────────── */
    { re:/\b(?:text|call|ring|ping|msg|message)\s+me\b/gi, tag:'direct contact' },
    { re:/\b(?:dm|pm)\s+me\b/gi, tag:'direct contact' },
    { re:/\breach\s+me\s+(?:on|at|via|through)\b/gi, tag:'direct contact' },
    { re:/\bcontact\s+me\s+(?:on|at|via|through|directly)\b/gi, tag:'direct contact' },
    { re:/\bhit\s+me\s+up\b/gi, tag:'direct contact' },
    { re:/\bmy\s+(?:number|num|no\.?|digits|contact)\s+is\b/gi, tag:'phone' },
    { re:/\bmy\s+(?:phone|cell|mobile|line)\b/gi, tag:'phone' },
    { re:/\b(?:give|send|drop)\s+(?:me|you|your|us)\s+(?:your|my|a)?\s*(?:number|num|no\.?|digits|pin|contact)/gi, tag:'contact' },
    { re:/\bI(?:'?ll|'?m going to)\s+(?:call|text|ring|message)\s+you\b/gi, tag:'direct contact' },
    { re:/\byou\s+can\s+(?:call|text|ring|reach|contact|find)\s+me\b/gi, tag:'direct contact' },
    { re:/\blet(?:'s| us)\s+(?:talk|chat|connect)\s+(?:outside|off|elsewhere|privately)\b/gi, tag:'direct contact' },

    /* ── Location bypass ("I'm in Kilimani, house no 14B") ─────────────── */
    { re:/(?:house|flat|apt|apartment|unit|plot|road|street|lane|close|crescent|avenue|blvd)\s+(?:no\.?|number|#)?\s*\d+[a-zA-Z]?\b/gi, tag:'address' },
    { re:/(?:gate|door|entry)\s+(?:code|pin|number|no\.?)?\s*:?\s*\d{3,6}/gi, tag:'access code' },

    /* ── Social handles & platforms ─────────────────────────────────────── */
    { re:/@[a-zA-Z0-9_.]{2,30}\b(?!\s*(?:apatmento|cabana|gmail|yahoo))/g, tag:'social handle' },
    { re:/(?:instagram|insta|ig|twitter|x\.com|facebook|fb|telegram|tg|tiktok|tt|snapchat|snap|sc|linkedin|li|discord|viber|signal|imo|skype|wechat|line|kakao)[\s:/_]+[a-zA-Z0-9_.]{2,30}/gi, tag:'social' },
    // "find me on instagram"
    { re:/find\s+me\s+on\s+(?:instagram|insta|ig|twitter|facebook|fb|telegram|tiktok|snapchat|discord|viber|signal|skype)/gi, tag:'social' },

    /* ── URLs & websites ────────────────────────────────────────────────── */
    { re:/https?:\/\/[^\s]+/gi, tag:'link' },
    { re:/(?:www\.)[a-zA-Z0-9\-]+\.[a-zA-Z]{2}(?:\/\S*)?/gi, tag:'website' },
    { re:/\b[a-zA-Z0-9\-]{3}\.(?:com|co\.ke|ke|org|net|me|io|app|mobi|info|biz|tv|ng|tz|ug|rw)\b/gi, tag:'website' },

    /* ── Referral to offline ────────────────────────────────────────────── */
    { re:/\b(?:meet|see|come|visit)\s+(?:me|us)\s+(?:at|in|near|around|by)\b/gi, tag:'offline meet' },
    { re:/\b(?:outside|offline|elsewhere|elsewhere|in person|face[\s\-]to[\s\-]face)\b/gi, tag:'offline' },
    { re:/\bI(?:'?ll|'?m going to)?\s+(?:send|share|give)\s+(?:you|my|the)\s+(?:location|address|directions|pin|maps link)/gi, tag:'address' },
    { re:/(?:google|apple|waze)\s+maps?\s+(?:link|pin|location|directions)/gi, tag:'location link' },
  ];

  function scrub(raw) {
    let text = raw;
    let dirty = false;
    for (const { re, tag } of SCRUB) {
      const next = text.replace(re, `[${tag} removed]`);
      if (next !== text) { dirty = true; text = next; }
    }
    // Collapse consecutive removed-tags
    text = text.replace(/(\[[\w\s]+ removed\][\s,;]*){2}/g, m => m.split(']')[0] + ' removed]');
    return { text, scrubbed: dirty };
  }

  /* ── Validation: reject message if entirely scrubbed ───────────────── */
  function isEffectivelyEmpty(clean) {
    return clean.replace(/\[[\w\s]+ removed\]/g, '').replace(/[\s,;.!?]+/g, '').length < 2;
  }

  /* ════════════════════════════════════════════════════════════════════════
     FONT INJECTION. Inter from Google Fonts
  ════════════════════════════════════════════════════════════════════════ */
  function injectFont() {
    if (document.getElementById('cbm-font-link')) return;
    const l = document.createElement('link');
    l.id = 'cbm-font-link';
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(l);
  }

  /* ════════════════════════════════════════════════════════════════════════
     AUTH
  ════════════════════════════════════════════════════════════════════════ */
  async function resolveUser() {
    if (window.CURRENT_USER) return window.CURRENT_USER;
    if (window.ApaSession) {
      return new Promise(res => {
        ApaSession.ready(st => {
          if (st?.user) {
            window.CURRENT_USER = st.user;
            if (!window.sb && ApaSession.client) window.sb = ApaSession.client();
          }
          res(window.CURRENT_USER || null);
        });
      });
    }
    try {
      const s = sb();
      if (s) {
        const { data: { session } } = await s.auth.getSession();
        if (session?.user) { window.CURRENT_USER = session.user; return session.user; }
      }
    } catch (_) {}
    return null;
  }

  /* ════════════════════════════════════════════════════════════════════════
     TIME
  ════════════════════════════════════════════════════════════════════════ */
  function fmtMsg(iso) {
    const d = new Date(iso), now = new Date();
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString('en-KE', { hour:'2-digit', minute:'2-digit' });
    return d.toLocaleDateString('en-KE', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
  }
  function fmtDay(iso) {
    const d = new Date(iso), now = new Date();
    const y = d.getFullYear(), ny = now.getFullYear();
    if (d.toDateString() === now.toDateString()) return 'Today';
    const yest = new Date(now); yest.setDate(now.getDate() - 1);
    if (d.toDateString() === yest.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-KE', { weekday:'long', day:'numeric', month:'long', ...(y !== ny ? { year:'numeric' } : {}) });
  }
  function fmtList(iso) {
    const d = new Date(iso), now = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 1)    return 'Now';
    if (diff < 60)   return diff + 'm';
    if (diff < 1440) return Math.floor(diff / 60) + 'h';
    if (diff < 10080) return d.toLocaleDateString('en-KE', { weekday:'short' });
    return d.toLocaleDateString('en-KE', { month:'short', day:'numeric' });
  }

  /* ════════════════════════════════════════════════════════════════════════
     CSS. Premium, Inter-first, two-sided bubbles, no em-dash dividers
  ════════════════════════════════════════════════════════════════════════ */
  function injectCSS() {
    if (document.getElementById('cbm-css')) return;
    const s = document.createElement('style');
    s.id = 'cbm-css';
    s.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

/* ── Tokens ─────────────────────────────────────────────────────────────── */
:root{
  --cbm-ink:#0A0A14;
  --cbm-ink2:#3A3C55;
  --cbm-ink3:#8E90AD;
  --cbm-bg:#F7F8FC;
  --cbm-card:#fff;
  --cbm-line:rgba(10,10,20,.07);
  --cbm-pri:#4361FF;
  --cbm-pri2:#7B2FF7;
  --cbm-teal:#17C6B0;
  --cbm-danger:#FF4D6D;
  --cbm-r:24px;
  --cbm-shadow:0 32px 80px rgba(10,10,20,.18),0 4px 18px rgba(10,10,20,.07);
  --cbm-f:'Inter',-apple-system,system-ui,sans-serif;
}

/* ── Floating panel wrap ─────────────────────────────────────────────────── */
#cbm-panel-wrap{
  position:fixed;inset:0;z-index:8800;
  display:flex;align-items:flex-end;justify-content:flex-end;
  padding:16px;pointer-events:none;
}
#cbm-panel-wrap.open{pointer-events:all;}
#cbm-panel{
  width:400px;max-width:calc(100vw - 20px);
  height:min(660px,93vh);
  background:var(--cbm-card);
  border-radius:var(--cbm-r);
  box-shadow:var(--cbm-shadow);
  display:flex;flex-direction:column;overflow:hidden;
  transform:translateY(28px) scale(.96);opacity:0;
  transition:transform .4s cubic-bezier(.22,1,.36,1),opacity .3s;
  pointer-events:none;
}
#cbm-panel-wrap.open #cbm-panel{
  transform:translateY(0) scale(1);opacity:1;pointer-events:all;
}
@media(max-width:480px){
  #cbm-panel-wrap{padding:0;align-items:flex-end;}
  #cbm-panel{width:100%;max-width:100%;height:90vh;border-radius:22px 22px 0 0;}
}

/* ── Panel header ────────────────────────────────────────────────────────── */
.cbm-head{
  height:64px;padding:0 16px;flex-shrink:0;
  background:linear-gradient(135deg,#3D5BFF 0%,#7B2FF7 100%);
  display:flex;align-items:center;gap:11px;
}
.cbm-head-ava{
  width:40px;height:40px;border-radius:50%;
  background:rgba(255,255,255,.18);
  display:flex;align-items:center;justify-content:center;
  font-size:19px;flex-shrink:0;
}
.cbm-head-info{flex:1;min-width:0;}
.cbm-head-name{
  font:700 14px/1.2 var(--cbm-f);color:#fff;letter-spacing:-.01em;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.cbm-head-sub{font:400 11px/1 var(--cbm-f);color:rgba(255,255,255,.65);margin-top:3px;}
.cbm-head-lock{
  display:flex;align-items:center;gap:4px;
  font:600 11px/1 var(--cbm-f);color:rgba(255,255,255,.7);flex-shrink:0;
}
.cbm-lock-dot{width:6px;height:6px;border-radius:50%;background:#17C6B0;flex-shrink:0;}
.cbm-head-x{
  width:30px;height:30px;border-radius:50%;
  background:rgba(255,255,255,.14);border:none;cursor:pointer;
  display:flex;align-items:center;justify-content:center;color:#fff;
  flex-shrink:0;transition:background .18s;margin-left:4px;
}
.cbm-head-x:hover{background:rgba(255,255,255,.26);}

/* ── Security notice ─────────────────────────────────────────────────────── */
.cbm-notice{
  padding:8px 14px;flex-shrink:0;
  background:rgba(67,97,255,.05);
  border-bottom:1px solid rgba(67,97,255,.09);
  display:flex;align-items:center;gap:7px;
  font:500 11px/1.4 var(--cbm-f);color:#4361FF;
}
.cbm-notice svg{flex-shrink:0;opacity:.75;}

/* ── Messages area ───────────────────────────────────────────────────────── */
.cbm-msgs{
  flex:1;overflow-y:auto;
  padding:16px 14px 12px;
  display:flex;flex-direction:column;
  gap:0;
  scroll-behavior:smooth;
  background:var(--cbm-bg);
}
.cbm-msgs::-webkit-scrollbar{width:3px;}
.cbm-msgs::-webkit-scrollbar-thumb{background:rgba(10,10,20,.1);border-radius:2px;}

/* Day divider. Clean line, no em-dash */
.cbm-day{
  display:flex;align-items:center;gap:10px;
  margin:14px 0 10px;align-self:stretch;
}
.cbm-day-line{flex:1;height:1px;background:rgba(10,10,20,.08);}
.cbm-day-label{
  font:600 10px/1 var(--cbm-f);color:var(--cbm-ink3);
  letter-spacing:.05em;text-transform:uppercase;
  white-space:nowrap;
}

/* Message row. Wraps avatar + bubble */
.cbm-row{display:flex;align-items:flex-end;gap:8px;margin-bottom:3px;}
.cbm-row.me{flex-direction:row-reverse;}
.cbm-row.sys{justify-content:center;}

/* Sender avatar (host side only) */
.cbm-sender-ava{
  width:28px;height:28px;border-radius:50%;flex-shrink:0;
  background:linear-gradient(135deg,#B8A4F4,#7B2FF7);
  display:flex;align-items:center;justify-content:center;
  font:700 11px/1 var(--cbm-f);color:#fff;
  /* hidden for me + consecutive them messages (toggled via JS) */
}
.cbm-sender-ava.hidden{visibility:hidden;}

/* Bubble column */
.cbm-col{display:flex;flex-direction:column;max-width:75%;}
.cbm-row.me .cbm-col{align-items:flex-end;}
.cbm-row.them .cbm-col{align-items:flex-start;}
.cbm-row.sys .cbm-col{align-items:center;max-width:88%;}

/* Sender name label (host, shown on first message in group) */
.cbm-sender-name{
  font:600 10px/1 var(--cbm-f);color:var(--cbm-ink3);
  margin-bottom:3px;padding:0 3px;letter-spacing:.01em;
}

/* Bubble */
.cbm-bubble{
  padding:10px 13px;
  font:400 14px/1.55 var(--cbm-f);
  word-break:break-word;
  letter-spacing:-.01em;
}
/* GUEST (me), right, violet gradient */
.cbm-row.me .cbm-bubble{
  background:linear-gradient(135deg,#3D5BFF,#7B2FF7);
  color:#fff;
  border-radius:18px 18px 4px 18px;
}
/* HOST (them). Left, white card */
.cbm-row.them .cbm-bubble{
  background:#fff;
  color:var(--cbm-ink);
  border-radius:18px 18px 18px 4px;
  box-shadow:0 1px 4px rgba(10,10,20,.07);
}
/* System */
.cbm-row.sys .cbm-bubble{
  background:rgba(67,97,255,.06);
  border:1px solid rgba(67,97,255,.12);
  color:#4361FF;
  font-size:12px;
  border-radius:10px;
  text-align:center;
}
/* Warning */
.cbm-row.warn .cbm-bubble{
  background:rgba(255,77,109,.06);
  border:1px solid rgba(255,77,109,.15);
  color:#C0122A;
  font-size:12px;
  border-radius:10px;
  text-align:center;
}

/* Scrubbed tag */
.cbm-scrub{
  display:inline-flex;align-items:center;gap:3px;
  padding:1px 6px 1px 5px;border-radius:5px;
  background:rgba(255,77,109,.1);color:#B81025;
  font:700 10px/1.4 var(--cbm-f);vertical-align:middle;
  letter-spacing:.01em;
}

/* Timestamp row */
.cbm-time-row{
  display:flex;align-items:center;gap:5px;
  font:400 10px/1 var(--cbm-f);color:var(--cbm-ink3);
  padding:2px 3px 6px;
}
.cbm-row.me .cbm-time-row{flex-direction:row-reverse;}
.cbm-tick{color:var(--cbm-teal);display:inline-flex;margin-top:1px;}
.cbm-scrub-warn{color:#B81025;font-weight:600;font-size:9px;letter-spacing:.02em;}

/* Empty state */
.cbm-empty{
  flex:1;display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  gap:12px;padding:32px 22px;text-align:center;
}
.cbm-empty-ico{font-size:46px;line-height:1;}
.cbm-empty-ttl{font:700 16px/1.3 var(--cbm-f);color:var(--cbm-ink);letter-spacing:-.02em;}
.cbm-empty-sub{font:400 13px/1.65 var(--cbm-f);color:var(--cbm-ink3);max-width:220px;}

/* ── Input bar ───────────────────────────────────────────────────────────── */
.cbm-bar{
  padding:10px 12px;border-top:1px solid var(--cbm-line);
  display:flex;align-items:flex-end;gap:9px;flex-shrink:0;
  background:var(--cbm-card);
}
.cbm-ta{
  flex:1;border:1.5px solid rgba(10,10,20,.09);
  border-radius:20px;padding:10px 15px;
  font:400 14px/1.45 var(--cbm-f);
  resize:none;outline:none;max-height:110px;min-height:42px;
  overflow-y:auto;background:#F5F6FA;color:var(--cbm-ink);
  transition:border-color .2s,background .2s;letter-spacing:-.01em;
}
.cbm-ta:focus{border-color:var(--cbm-pri);background:#fff;}
.cbm-ta::placeholder{color:var(--cbm-ink3);}
.cbm-send-btn{
  width:42px;height:42px;border-radius:50%;flex-shrink:0;
  background:linear-gradient(135deg,#4361FF,#7B2FF7);
  border:none;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  color:#fff;box-shadow:0 4px 14px rgba(67,97,255,.38);
  transition:transform .18s,box-shadow .18s,opacity .15s;
}
.cbm-send-btn:hover{transform:scale(1.08);box-shadow:0 6px 20px rgba(67,97,255,.52);}
.cbm-send-btn:active{transform:scale(.93);}
.cbm-send-btn:disabled{opacity:.38;transform:none;cursor:not-allowed;box-shadow:none;}

/* ═══ FULL-SCREEN INBOX ══════════════════════════════════════════════════ */
#cbm-inbox{
  position:fixed;inset:0;z-index:8900;
  background:var(--cbm-bg);
  display:flex;flex-direction:column;
  transform:translateX(100%);
  transition:transform .42s cubic-bezier(.22,1,.36,1);
  will-change:transform;font-family:var(--cbm-f);
}
#cbm-inbox.open{transform:translateX(0);}

/* Topbar */
.cbm-ib-bar{
  height:62px;display:flex;align-items:center;gap:11px;
  padding:0 16px;flex-shrink:0;
  background:rgba(252,252,253,.95);
  -webkit-backdrop-filter:blur(22px);backdrop-filter:blur(22px);
  border-bottom:1px solid var(--cbm-line);
}
.cbm-ib-back,.cbm-ib-new{
  width:38px;height:38px;border-radius:12px;flex-shrink:0;
  border:1.5px solid var(--cbm-line);background:rgba(255,255,255,.85);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:var(--cbm-ink);
  transition:border-color .18s,color .18s,background .18s;
}
.cbm-ib-back:hover{border-color:var(--cbm-pri);color:var(--cbm-pri);}
.cbm-ib-new{color:var(--cbm-pri);}
.cbm-ib-new:hover{border-color:var(--cbm-pri);background:rgba(67,97,255,.06);}
.cbm-ib-titles{flex:1;min-width:0;}
.cbm-ib-title{font:700 18px/1.1 var(--cbm-f);color:var(--cbm-ink);letter-spacing:-.02em;}
.cbm-ib-sub{font:400 11px/1 var(--cbm-f);color:var(--cbm-ink3);margin-top:3px;}

/* Search */
.cbm-search-wrap{padding:10px 14px 9px;flex-shrink:0;border-bottom:1px solid var(--cbm-line);background:rgba(252,252,253,.95);}
.cbm-search{
  display:flex;align-items:center;gap:8px;
  background:rgba(10,10,20,.05);border-radius:12px;
  padding:9px 13px;border:1.5px solid transparent;
  transition:border-color .18s,background .18s;
}
.cbm-search:focus-within{background:#fff;border-color:rgba(67,97,255,.22);}
.cbm-search svg{color:var(--cbm-ink3);flex-shrink:0;}
.cbm-search-input{
  flex:1;border:none;background:none;outline:none;
  font:400 14px/1 var(--cbm-f);color:var(--cbm-ink);
}
.cbm-search-input::placeholder{color:var(--cbm-ink3);}

/* Conv list */
#cbm-ib-list{flex:1;overflow-y:auto;display:flex;flex-direction:column;}
#cbm-ib-list::-webkit-scrollbar{width:3px;}
#cbm-ib-list::-webkit-scrollbar-thumb{background:rgba(10,10,20,.09);border-radius:2px;}

.cbm-sec-head{
  padding:7px 16px 5px;
  font:700 10px/1 var(--cbm-f);letter-spacing:.07em;text-transform:uppercase;
  color:var(--cbm-ink3);background:var(--cbm-bg);
  border-bottom:1px solid var(--cbm-line);flex-shrink:0;
}

.cbm-conv{
  display:flex;align-items:center;gap:13px;
  padding:13px 16px;cursor:pointer;
  border-bottom:1px solid rgba(10,10,20,.04);
  transition:background .12s;-webkit-tap-highlight-color:transparent;
}
.cbm-conv:hover{background:rgba(67,97,255,.04);}
.cbm-conv-ava{
  width:52px;height:52px;border-radius:50%;flex-shrink:0;
  background:linear-gradient(135deg,#C4B0FA,#7B2FF7);
  display:flex;align-items:center;justify-content:center;
  font-size:22px;position:relative;
}
.cbm-conv-udot{
  position:absolute;top:1px;right:1px;
  min-width:18px;height:18px;border-radius:9px;
  background:var(--cbm-pri);color:#fff;
  font:800 9px/1 var(--cbm-f);
  display:flex;align-items:center;justify-content:center;
  padding:0 4px;border:2px solid var(--cbm-bg);
}
.cbm-conv-body{flex:1;min-width:0;}
.cbm-conv-name{
  font:700 14px/1.3 var(--cbm-f);color:var(--cbm-ink);letter-spacing:-.01em;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px;
}
.cbm-conv-prev{
  font:400 13px/1.3 var(--cbm-f);color:var(--cbm-ink3);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.cbm-conv.unread .cbm-conv-prev{color:var(--cbm-ink2);font-weight:500;}
.cbm-conv-meta{display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0;}
.cbm-conv-time{font:400 11px/1 var(--cbm-f);color:var(--cbm-ink3);}
.cbm-conv-pill{
  min-width:19px;height:19px;border-radius:10px;
  background:var(--cbm-pri);color:#fff;
  font:800 9px/1 var(--cbm-f);
  display:flex;align-items:center;justify-content:center;padding:0 4px;
}

/* Thread */
#cbm-thread{
  position:absolute;inset:0;
  background:var(--cbm-bg);
  display:flex;flex-direction:column;
  transform:translateX(100%);
  transition:transform .38s cubic-bezier(.22,1,.36,1);
  z-index:1;
}
#cbm-thread.open{transform:translateX(0);}
.cbm-thr-bar{
  height:62px;display:flex;align-items:center;gap:10px;
  padding:0 14px;flex-shrink:0;
  background:rgba(252,252,253,.95);
  -webkit-backdrop-filter:blur(22px);backdrop-filter:blur(22px);
  border-bottom:1px solid var(--cbm-line);
}
.cbm-thr-back{
  width:36px;height:36px;border-radius:11px;flex-shrink:0;
  border:1.5px solid var(--cbm-line);background:rgba(255,255,255,.85);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:var(--cbm-ink);
  transition:border-color .18s,color .18s;
}
.cbm-thr-back:hover{border-color:var(--cbm-pri);color:var(--cbm-pri);}
.cbm-thr-ava{
  width:36px;height:36px;border-radius:50%;flex-shrink:0;
  background:linear-gradient(135deg,#C4B0FA,#7B2FF7);
  display:flex;align-items:center;justify-content:center;font-size:17px;
}
.cbm-thr-info{flex:1;min-width:0;}
.cbm-thr-name{
  font:700 14px/1.2 var(--cbm-f);color:var(--cbm-ink);letter-spacing:-.01em;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.cbm-thr-sub{font:400 11px/1 var(--cbm-f);color:var(--cbm-ink3);margin-top:2px;}

/* Inbox empty */
.cbm-ib-empty{
  flex:1;display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  gap:14px;padding:40px 28px;text-align:center;
}
.cbm-ib-empty-ico{font-size:58px;line-height:1;}
.cbm-ib-empty-ttl{font:700 19px/1.3 var(--cbm-f);color:var(--cbm-ink);letter-spacing:-.02em;}
.cbm-ib-empty-sub{font:400 13px/1.65 var(--cbm-f);color:var(--cbm-ink3);max-width:250px;}

/* Skeleton */
.cbm-skel{flex:1;padding:14px 16px;display:flex;flex-direction:column;gap:14px;overflow:hidden;}
.cbm-skel-row{display:flex;align-items:center;gap:13px;}
.cbm-skel-ava{width:52px;height:52px;border-radius:50%;background:rgba(10,10,20,.07);flex-shrink:0;}
.cbm-skel-body{flex:1;display:flex;flex-direction:column;gap:8px;}
.cbm-skel-l,.cbm-skel-s{border-radius:7px;background:rgba(10,10,20,.07);}
.cbm-skel-l{height:13px;}
.cbm-skel-s{height:11px;width:65%;}
@keyframes cbmShim{0%,100%{opacity:1}50%{opacity:.45}}
.cbm-skel-ava,.cbm-skel-l,.cbm-skel-s{animation:cbmShim 1.7s ease-in-out infinite;}

/* Bell badge */
.cbm-bell-dot{
  position:absolute;top:6px;right:6px;
  width:9px;height:9px;border-radius:50%;
  background:var(--cbm-danger);border:2px solid #fff;display:none;
}
.cbm-bell-dot.on{display:block;}

/* Toast */
.cbm-toast{
  position:fixed;bottom:84px;left:50%;transform:translateX(-50%) translateY(16px);
  background:rgba(10,10,20,.9);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);
  color:#fff;padding:11px 20px;border-radius:100px;
  font:600 13px/1 var(--cbm-f);z-index:9999;pointer-events:none;
  opacity:0;transition:opacity .22s,transform .22s;white-space:nowrap;
}
.cbm-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}

/* Safe-area */
@supports(padding:env(safe-area-inset-bottom)){
  .cbm-bar{padding-bottom:max(10px,env(safe-area-inset-bottom));}
  #cbm-inbox{padding-bottom:env(safe-area-inset-bottom);}
}

/* ── Premium topbar inbox button (apartments.html) ────────────────────────── */
#tb-inbox-btn{
  position:relative;width:40px;height:40px;border-radius:13px;
  border:1.5px solid rgba(10,10,20,.09);
  background:rgba(255,255,255,.7);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:rgba(10,10,20,.55);
  transition:border-color .2s,color .2s,background .2s,transform .2s;
  -webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);
}
#tb-inbox-btn:hover{
  border-color:rgba(67,97,255,.4);color:#4361FF;
  background:rgba(255,255,255,.95);transform:translateY(-1px);
}
#tb-inbox-badge{
  position:absolute;top:-4px;right:-4px;
  min-width:17px;height:17px;border-radius:9px;
  background:#FF4D6D;color:#fff;
  font:800 9px/1 var(--cbm-f);
  display:none;align-items:center;justify-content:center;
  border:2px solid #FCFCFD;padding:0 3px;
}
#tb-inbox-badge.on{display:flex;}
    `;
    document.head.appendChild(s);
  }

  /* ════════════════════════════════════════════════════════════════════════
     DOM. Floating panel
  ════════════════════════════════════════════════════════════════════════ */
  function buildPanel() {
    if (document.getElementById('cbm-panel-wrap')) return;
    const w = document.createElement('div');
    w.id = 'cbm-panel-wrap';
    w.innerHTML = `
      <div id="cbm-panel" role="dialog" aria-label="Chat with host" aria-modal="true">
        <div class="cbm-head">
          <div class="cbm-head-ava" id="cbm-head-ava">🏠</div>
          <div class="cbm-head-info">
            <div class="cbm-head-name" id="cbm-head-name">Chat with Host</div>
            <div class="cbm-head-sub" id="cbm-head-sub">Secure in-app messaging</div>
          </div>
          <div class="cbm-head-lock">
            <span class="cbm-lock-dot"></span>Encrypted
          </div>
          <button class="cbm-head-x" onclick="CabanaChat.close()" aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="cbm-notice">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Sharing contact info isn't permitted. Keep all communication here.
        </div>
        <div id="cbm-panel-msgs" class="cbm-msgs"></div>
        <div class="cbm-bar">
          <textarea class="cbm-ta" id="cbm-panel-input" placeholder="Type a message…" rows="1"
            aria-label="Message"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();CabanaChat._pSend();}"
            oninput="CabanaChat._grow(this)"></textarea>
          <button class="cbm-send-btn" id="cbm-panel-send" onclick="CabanaChat._pSend()" aria-label="Send">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7z"/></svg>
          </button>
        </div>
      </div>`;
    document.body.appendChild(w);
  }

  /* ════════════════════════════════════════════════════════════════════════
     DOM. Full inbox
  ════════════════════════════════════════════════════════════════════════ */
  function buildInbox() {
    if (document.getElementById('cbm-inbox')) return;
    const el = document.createElement('div');
    el.id = 'cbm-inbox';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Messages');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML = `
      <div class="cbm-ib-bar">
        <button class="cbm-ib-back" onclick="CabanaChat.closeInbox()" aria-label="Close">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div class="cbm-ib-titles">
          <div class="cbm-ib-title">Messages</div>
          <div class="cbm-ib-sub" id="cbm-ib-sub">Loading…</div>
        </div>
        <button class="cbm-ib-new" onclick="CabanaChat._goStays()" aria-label="New conversation" title="Find a stay to message">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
      <div class="cbm-search-wrap">
        <div class="cbm-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input class="cbm-search-input" id="cbm-search" placeholder="Search messages…" oninput="CabanaChat._filter(this.value)" autocomplete="off"/>
        </div>
      </div>
      <div id="cbm-ib-list"></div>
      <div id="cbm-thread">
        <div class="cbm-thr-bar">
          <button class="cbm-thr-back" onclick="CabanaChat._thrBack()" aria-label="Back">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div class="cbm-thr-ava" id="cbm-thr-ava">🏠</div>
          <div class="cbm-thr-info">
            <div class="cbm-thr-name" id="cbm-thr-name">Conversation</div>
            <div class="cbm-thr-sub" id="cbm-thr-sub">Secure messaging</div>
          </div>
        </div>
        <div class="cbm-notice">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Sharing contact info isn't permitted. Keep all communication here.
        </div>
        <div id="cbm-thr-msgs" class="cbm-msgs"></div>
        <div class="cbm-bar">
          <textarea class="cbm-ta" id="cbm-thr-input" placeholder="Type a message…" rows="1"
            aria-label="Message"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();CabanaChat._tSend();}"
            oninput="CabanaChat._grow(this)"></textarea>
          <button class="cbm-send-btn" id="cbm-thr-send" onclick="CabanaChat._tSend()" aria-label="Send">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7z"/></svg>
          </button>
        </div>
      </div>`;
    document.body.appendChild(el);
  }

  /* ════════════════════════════════════════════════════════════════════════
     TOAST
  ════════════════════════════════════════════════════════════════════════ */
  let _toastT;
  function toast(msg) {
    let t = document.getElementById('cbm-toast');
    if (!t) { t = Object.assign(document.createElement('div'), { id:'cbm-toast', className:'cbm-toast' }); document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(_toastT);
    _toastT = setTimeout(() => t.classList.remove('show'), 3000);
  }

  /* ════════════════════════════════════════════════════════════════════════
     RENDER MESSAGES. Two-sided, grouped, no em-dash
  ════════════════════════════════════════════════════════════════════════ */
  function esc(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function renderMsgs(msgs, el) {
    if (!el) return;
    if (!msgs.length) {
      el.innerHTML = `<div class="cbm-empty">
        <div class="cbm-empty-ico">👋</div>
        <div class="cbm-empty-ttl">Start the conversation</div>
        <div class="cbm-empty-sub">Ask about availability, check-in, amenities. Everything stays safely in-app.</div>
      </div>`;
      return;
    }

    let html = '';
    let lastDay = '';
    let lastSenderId = null;
    let lastIsMe = null;

    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i];
      const isMe = m.sender_id === _uid;
      const isSys = !!m.is_system;
      const isThem = !isMe && !isSys;

      // Day divider
      const day = fmtDay(m.created_at);
      if (day !== lastDay) {
        html += `<div class="cbm-day"><div class="cbm-day-line"></div><div class="cbm-day-label">${esc(day)}</div><div class="cbm-day-line"></div></div>`;
        lastDay = day;
        lastSenderId = null;
        lastIsMe = null;
      }

      // Group: is this a new sender from last message?
      const newSender = m.sender_id !== lastSenderId;
      // Next message: is it from same sender?
      const nextSameSender = i < msgs.length - 1 && msgs[i+1].sender_id === m.sender_id && !msgs[i+1].is_system;
      const isLastInGroup = !nextSameSender;

      if (isSys) {
        const content = highlightScrub(m.content || '');
        html += `<div class="cbm-row sys"><div class="cbm-col"><div class="cbm-bubble">${content}</div></div></div>`;
        lastSenderId = null; lastIsMe = null;
        continue;
      }

      const rowCls = isMe ? 'me' : 'them';

      // Sender avatar. Host side only, visible on last in group
      const avaHtml = isThem
        ? `<div class="cbm-sender-ava${isLastInGroup ? '' : ' hidden'}">${getInitial(m)}</div>`
        : '';

      // Sender name label, only first in group for host
      const nameHtml = (isThem && newSender)
        ? `<div class="cbm-sender-name">Host</div>`
        : '';

      const content = highlightScrub(m.content || '');

      // Timestamp
      const scrubNote = m.was_scrubbed ? `<span class="cbm-scrub-warn">Contact info removed</span>` : '';
      const tick = isMe ? `<span class="cbm-tick"><svg width="13" height="9" viewBox="0 0 16 10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 5l4 4L15 1"/></svg></span>` : '';
      const timeHtml = isLastInGroup
        ? `<div class="cbm-time-row">${fmtMsg(m.created_at)}${scrubNote}${tick}</div>`
        : '';

      html += `<div class="cbm-row ${rowCls}">
        ${avaHtml}
        <div class="cbm-col">
          ${nameHtml}
          <div class="cbm-bubble">${content}</div>
          ${timeHtml}
        </div>
      </div>`;

      lastSenderId = m.sender_id;
      lastIsMe = isMe;
    }

    el.innerHTML = html;
    el.scrollTop = el.scrollHeight;
  }

  function highlightScrub(text) {
    return esc(text).replace(
      /\[(phone|email|link|website|WhatsApp link|WhatsApp|social handle|social|direct contact|contact|address|access code|offline meet|offline|location link|number) removed\]/gi,
      (_, tag) => `<span class="cbm-scrub">⚠ ${tag} removed</span>`
    );
  }

  function getInitial(m) {
    // Try to get host initial from conversation; fallback to "H"
    if (_conv && _conv.host_initial) return esc(_conv.host_initial);
    return 'H';
  }

  /* ════════════════════════════════════════════════════════════════════════
     DATA LAYER
  ════════════════════════════════════════════════════════════════════════ */
  async function loadMsgs(convId) {
    const s = sb(); if (!s) return [];
    const { data } = await s.from('chat_messages')
      .select('*').eq('conversation_id', convId)
      .order('created_at', { ascending:true }).limit(MSG_LIMIT);
    return data || [];
  }

  async function getOrCreate({ listingId, listingType, listingTitle, hostId }) {
    const s = sb(); if (!s) return null;
    const { data: ex } = await s.from('chat_conversations')
      .select('*').eq('listing_id', listingId).eq('guest_id', _uid).maybeSingle();
    if (ex) return ex;

    const { data: c, error } = await s.from('chat_conversations').insert({
      listing_id:    listingId,
      listing_type:  listingType,
      listing_title: listingTitle,
      host_id:       hostId,
      guest_id:      _uid,
    }).select().maybeSingle();
    if (error || !c) return null;

    // Opening message from guest
    const opener = `Hi! I'm interested in "${listingTitle}". Is it available and could you share more details?`;
    await s.from('chat_messages').insert({
      conversation_id: c.id, sender_id: _uid,
      content: opener, is_system: false,
    });
    await s.from('chat_conversations').update({
      last_message: opener.slice(0, 60),
      last_message_at: new Date().toISOString(),
      last_sender_id: _uid, host_unread: 1,
    }).eq('id', c.id);
    return c;
  }

  async function markRead(conv) {
    if (!conv || !_uid) return;
    const s = sb(); if (!s) return;
    const field = _uid === conv.host_id ? 'host_unread' : 'guest_unread';
    await s.from('chat_conversations').update({ [field]: 0 }).eq('id', conv.id);
  }

  async function doSend(convId, raw, btnId, inputId, msgsId) {
    const s = sb(); if (!s || !convId || !raw.trim()) return;
    // Block sending if conversation is locked
    if (_conv && _conv.status === 'locked') {
      const el = document.getElementById(msgsId);
      if (el) {
        el.insertAdjacentHTML('beforeend',
          `<div class="cbm-row warn"><div class="cbm-col"><div class="cbm-bubble">This conversation is closed and no longer accepting messages.</div></div></div>`);
        el.scrollTop = el.scrollHeight;
      }
      return;
    }
    const { text: clean, scrubbed } = scrub(raw.trim());

    // Block purely-contact messages
    if (isEffectivelyEmpty(clean)) {
      const el = document.getElementById(msgsId);
      if (el) {
        el.insertAdjacentHTML('beforeend',
          `<div class="cbm-row warn"><div class="cbm-col"><div class="cbm-bubble">Your message was blocked. It contained only contact information, which is not allowed. Please use this chat to communicate everything.</div></div></div>`);
        el.scrollTop = el.scrollHeight;
      }
      const inp = document.getElementById(inputId);
      if (inp) { inp.value = ''; inp.style.height = ''; }
      toast('Message blocked: contact info not permitted.');
      return;
    }

    const btn = document.getElementById(btnId);
    const inp = document.getElementById(inputId);
    if (btn) btn.disabled = true;
    if (inp) { inp.value = ''; inp.style.height = ''; }

    try {
      await s.from('chat_messages').insert({
        conversation_id: convId, sender_id: _uid,
        content: clean,
        content_raw: scrubbed ? raw : null,
        was_scrubbed: scrubbed,
      });
      const { data: cv } = await s.from('chat_conversations')
        .select('host_id,host_unread,guest_unread').eq('id', convId).maybeSingle();
      if (cv) {
        const other = _uid === cv.host_id ? 'guest_unread' : 'host_unread';
        await s.from('chat_conversations').update({
          last_message:    clean.length > 60 ? clean.slice(0,60)+'…' : clean,
          last_message_at: new Date().toISOString(),
          last_sender_id:  _uid,
          [other]:         (cv[other]||0) + 1,
        }).eq('id', convId);
      }
      if (scrubbed) toast('Some contact info was removed from your message.');
    } catch (e) {
      toast('Failed to send. Please try again.');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  /* ════════════════════════════════════════════════════════════════════════
     REALTIME
  ════════════════════════════════════════════════════════════════════════ */
  function clearSub(sub) {
    try { if (sub) sub.unsubscribe(); } catch(_) {} return null;
  }

  function subPanel(convId) {
    const s = sb(); if (!s || _panSub) return;
    _panSub = s.channel('cbm-p-' + convId)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'chat_messages', filter:`conversation_id=eq.${convId}` },
        async () => {
          renderMsgs(await loadMsgs(convId), document.getElementById('cbm-panel-msgs'));
          await markRead(_conv);
        })
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'chat_conversations', filter:`id=eq.${convId}` },
        async (payload) => {
          const updated = payload.new;
          if (_conv) Object.assign(_conv, updated);
          // If just locked, apply lock UI live
          if (updated.status === 'locked' && window.CabanaNotif) {
            const msgsEl = document.getElementById('cbm-panel-msgs');
            const inputBar = document.querySelector('#cbm-panel .cbm-bar');
            CabanaNotif.applyConvLock(updated, msgsEl, inputBar);
            const pBtn = document.getElementById('cbm-panel-send');
            const pInp = document.getElementById('cbm-panel-input');
            if (pBtn) pBtn.disabled = true;
            if (pInp) { pInp.disabled = true; pInp.placeholder = 'This conversation is closed.'; }
          }
          // If contact just released, show banner
          if (updated.contact_released && !(_conv?.contact_released) && window.CabanaNotif) {
            const msgsEl = document.getElementById('cbm-panel-msgs');
            CabanaNotif.insertContactBanner(updated, msgsEl, {});
            renderMsgs(await loadMsgs(convId), msgsEl);
          }
        })
      .subscribe();
  }

  function subThread(convId) {
    const s = sb(); if (!s) return;
    _thrSub = clearSub(_thrSub);
    _thrSub = s.channel('cbm-t-' + convId)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'chat_messages', filter:`conversation_id=eq.${convId}` },
        async () => {
          renderMsgs(await loadMsgs(convId), document.getElementById('cbm-thr-msgs'));
          await markRead(_conv);
          updateBell();
        })
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'chat_conversations', filter:`id=eq.${convId}` },
        async (payload) => {
          const updated = payload.new;
          if (_conv) Object.assign(_conv, updated);
          if (updated.status === 'locked' && window.CabanaNotif) {
            const msgsEl = document.getElementById('cbm-thr-msgs');
            const inputBar = document.querySelector('#cbm-thread .cbm-bar');
            CabanaNotif.applyConvLock(updated, msgsEl, inputBar);
            const tBtn = document.getElementById('cbm-thr-send');
            const tInp = document.getElementById('cbm-thr-input');
            if (tBtn) tBtn.disabled = true;
            if (tInp) { tInp.disabled = true; tInp.placeholder = 'This conversation is closed.'; }
          }
          if (updated.contact_released && window.CabanaNotif) {
            const msgsEl = document.getElementById('cbm-thr-msgs');
            if (msgsEl) {
              renderMsgs(await loadMsgs(convId), msgsEl);
              CabanaNotif.insertContactBanner(updated, msgsEl, {});
            }
          }
        })
      .subscribe();
  }

  function subGlobal() {
    const s = sb(); if (!s || _glbSub || !_uid) return;
    _glbSub = s.channel('cbm-g-' + _uid)
      .on('postgres_changes', { event:'*', schema:'public', table:'chat_conversations', filter:`guest_id=eq.${_uid}` }, () => updateBell())
      .on('postgres_changes', { event:'*', schema:'public', table:'chat_conversations', filter:`host_id=eq.${_uid}` }, () => updateBell())
      .subscribe();
  }

  /* ════════════════════════════════════════════════════════════════════════
     BELL / BADGE
  ════════════════════════════════════════════════════════════════════════ */
  async function getUnread() {
    const s = sb(); if (!s || !_uid) return 0;
    try {
      const { data } = await s.from('chat_conversations')
        .select('host_id,host_unread,guest_unread')
        .or(`host_id.eq.${_uid},guest_id.eq.${_uid}`);
      if (!data) return 0;
      return data.reduce((sum, c) => sum + (c.host_id === _uid ? (c.host_unread||0) : (c.guest_unread||0)), 0);
    } catch (_) { return 0; }
  }

  function setBell(n) {
    // Chrome bell dot
    document.querySelectorAll('.apa-ico[data-apa="notif"]').forEach(btn => {
      const dot = btn.querySelector('.apa-ico-dot');
      if (dot) dot.style.display = n > 0 ? 'block' : 'none';
      btn.setAttribute('data-unread', n > 0 ? '1' : '0');
    });
    // Stays topbar badge
    const tb = document.getElementById('tb-inbox-badge');
    if (tb) {
      if (n > 0) { tb.textContent = n > 99 ? '99+' : String(n); tb.classList.add('on'); }
      else { tb.classList.remove('on'); }
    }
  }

  async function updateBell() {
    setBell(await getUnread());
  }

  function initBell() {
    resolveUser().then(u => {
      if (!u) return;
      _uid = u.id;
      updateBell();
      subGlobal();
      clearInterval(_pollTimer);
      _pollTimer = setInterval(updateBell, POLL_MS);
    });
  }

  /* ════════════════════════════════════════════════════════════════════════
     OPEN HOST PANEL
  ════════════════════════════════════════════════════════════════════════ */
  async function open({ listingId, listingType, listingTitle, hostId }) {
    const user = await resolveUser();
    if (!user) { location.href = 'auth.html?next=' + encodeURIComponent(location.href); return; }
    if (user.id === hostId) { toast("You can't message your own listing."); return; }
    _uid = user.id;

    injectCSS();
    buildPanel();

    const ico = TYPE_ICONS[listingType] || '💬';
    document.getElementById('cbm-head-ava').textContent = ico;
    document.getElementById('cbm-head-name').textContent = listingTitle || 'Chat with Host';
    document.getElementById('cbm-head-sub').textContent = (listingType
      ? listingType.charAt(0).toUpperCase() + listingType.slice(1)
      : 'Listing') + ' · Secure';

    const msgsEl = document.getElementById('cbm-panel-msgs');
    msgsEl.innerHTML = `<div class="cbm-empty"><div class="cbm-empty-ico">⏳</div><div class="cbm-empty-ttl">Loading…</div></div>`;
    document.getElementById('cbm-panel-wrap').classList.add('open');
    document.body.style.overflow = 'hidden';

    const s = sb();
    if (!s) {
      msgsEl.innerHTML = `<div class="cbm-empty"><div class="cbm-empty-ico">⚠️</div><div class="cbm-empty-ttl">Connection error</div><div class="cbm-empty-sub">Please refresh and try again.</div></div>`;
      return;
    }
    _panSub = clearSub(_panSub);

    const cv = await getOrCreate({ listingId, listingType, listingTitle, hostId });
    if (!cv) {
      msgsEl.innerHTML = `<div class="cbm-empty"><div class="cbm-empty-ico">⚠️</div><div class="cbm-empty-ttl">Could not start conversation</div><div class="cbm-empty-sub">Please try again.</div></div>`;
      return;
    }
    _conv = cv;
    await markRead(cv);
    renderMsgs(await loadMsgs(cv.id), msgsEl);
    subPanel(cv.id);
    updateBell();

    // Apply lock UI if conversation is locked
    if (cv.status === 'locked') {
      const inputBar = document.querySelector('#cbm-panel .cbm-bar');
      if (window.CabanaNotif) CabanaNotif.applyConvLock(cv, msgsEl, inputBar);
      const pBtn = document.getElementById('cbm-panel-send');
      const pInp = document.getElementById('cbm-panel-input');
      if (pBtn) pBtn.disabled = true;
      if (pInp) { pInp.disabled = true; pInp.placeholder = 'This conversation is closed.'; }
    }
    // Show contact release banner
    if (cv.contact_released && window.CabanaNotif) {
      CabanaNotif.insertContactBanner(cv, msgsEl, { address: null, phone: null });
    }
  }

  async function _pSend() {
    const inp = document.getElementById('cbm-panel-input');
    const txt = inp?.value || '';
    if (!txt.trim() || !_conv) return;
    await doSend(_conv.id, txt, 'cbm-panel-send', 'cbm-panel-input', 'cbm-panel-msgs');
    renderMsgs(await loadMsgs(_conv.id), document.getElementById('cbm-panel-msgs'));
  }

  function close() {
    document.getElementById('cbm-panel-wrap')?.classList.remove('open');
    document.body.style.overflow = '';
    _panSub = clearSub(_panSub);
    _conv = null;
  }

  /* ════════════════════════════════════════════════════════════════════════
     INBOX
  ════════════════════════════════════════════════════════════════════════ */
  async function openInbox() {
    const user = await resolveUser();
    if (!user) { location.href = 'auth.html?next=' + encodeURIComponent(location.href); return; }
    _uid = user.id;

    injectCSS();
    buildInbox();

    document.getElementById('cbm-thread').classList.remove('open');
    _ibView = 'list';
    document.getElementById('cbm-inbox').classList.add('open');
    document.body.style.overflow = 'hidden';

    const list = document.getElementById('cbm-ib-list');
    list.innerHTML = skelHTML();
    document.getElementById('cbm-ib-sub').textContent = 'Loading…';

    const si = document.getElementById('cbm-search');
    if (si) si.value = '';

    await loadList();
    subGlobal();
  }

  function skelHTML() {
    let h = '<div class="cbm-skel">';
    for (let i = 0; i < 6; i++)
      h += `<div class="cbm-skel-row"><div class="cbm-skel-ava"></div><div class="cbm-skel-body"><div class="cbm-skel-l" style="width:${50+Math.random()*35}%"></div><div class="cbm-skel-s"></div></div></div>`;
    return h + '</div>';
  }

  async function loadList() {
    const s = sb(); if (!s) return;
    const { data } = await s.from('chat_conversations')
      .select('*')
      .or(`host_id.eq.${_uid},guest_id.eq.${_uid}`)
      .order('last_message_at', { ascending:false, nullsFirst:false })
      .limit(200);
    _allConvs = data || [];
    renderList(_allConvs);
  }

  function renderList(convs) {
    const list = document.getElementById('cbm-ib-list');
    const sub  = document.getElementById('cbm-ib-sub');
    if (!list) return;

    if (!convs.length) {
      list.innerHTML = `<div class="cbm-ib-empty">
        <div class="cbm-ib-empty-ico">📭</div>
        <div class="cbm-ib-empty-ttl">No messages yet</div>
        <div class="cbm-ib-empty-sub">Enquire about a listing to start a conversation.</div>
      </div>`;
      if (sub) sub.textContent = 'No conversations';
      return;
    }

    const unread = convs.filter(c => (c.host_id===_uid ? c.host_unread : c.guest_unread) > 0);
    const read   = convs.filter(c => (c.host_id===_uid ? c.host_unread : c.guest_unread) === 0);

    if (sub) {
      const u = unread.length;
      sub.textContent = u > 0 ? `${u} unread · ${convs.length} total` : `${convs.length} conversation${convs.length!==1?'s':''}`;
    }

    let html = '';
    if (unread.length) { html += `<div class="cbm-sec-head">Unread</div>`; html += unread.map(convRow).join(''); }
    if (read.length)   { if (unread.length) html += `<div class="cbm-sec-head">All Messages</div>`; html += read.map(convRow).join(''); }
    list.innerHTML = html;
  }

  function convRow(c) {
    const u    = c.host_id===_uid ? (c.host_unread||0) : (c.guest_unread||0);
    const ico  = TYPE_ICONS[c.listing_type] || '💬';
    const time = c.last_message_at ? fmtList(c.last_message_at) : '';
    const prev = c.last_message || 'No messages yet';
    return `<div class="cbm-conv${u>0?' unread':''}" onclick="CabanaChat._openThr('${c.id}')" role="button" tabindex="0">
      <div class="cbm-conv-ava">${ico}${u>0?`<div class="cbm-conv-udot">${u>99?'99+':u}</div>`:''}</div>
      <div class="cbm-conv-body">
        <div class="cbm-conv-name">${esc(c.listing_title||'Conversation')}</div>
        <div class="cbm-conv-prev">${esc(prev)}</div>
      </div>
      <div class="cbm-conv-meta">
        <div class="cbm-conv-time">${time}</div>
        ${u>0?`<div class="cbm-conv-pill">${u>99?'99+':u}</div>`:''}
      </div>
    </div>`;
  }

  function _filter(q) {
    if (!q.trim()) { renderList(_allConvs); return; }
    const lq = q.toLowerCase();
    renderList(_allConvs.filter(c =>
      (c.listing_title||'').toLowerCase().includes(lq) ||
      (c.last_message||'').toLowerCase().includes(lq)
    ));
  }

  async function _openThr(convId) {
    const s = sb(); if (!s) return;
    const { data: cv } = await s.from('chat_conversations').select('*').eq('id', convId).maybeSingle();
    if (!cv) return;
    _conv = cv;

    const ico = TYPE_ICONS[cv.listing_type] || '💬';
    document.getElementById('cbm-thr-ava').textContent  = ico;
    document.getElementById('cbm-thr-name').textContent = cv.listing_title || 'Conversation';
    document.getElementById('cbm-thr-sub').textContent  =
      (cv.listing_type ? cv.listing_type.charAt(0).toUpperCase() + cv.listing_type.slice(1) : 'Listing') + ' · Secure';

    const msgsEl = document.getElementById('cbm-thr-msgs');
    msgsEl.innerHTML = `<div class="cbm-empty"><div class="cbm-empty-ico">⏳</div><div class="cbm-empty-ttl">Loading…</div></div>`;

    document.getElementById('cbm-thread').classList.add('open');
    _ibView = 'thread';

    renderMsgs(await loadMsgs(convId), msgsEl);
    await markRead(cv);
    subThread(convId);
    updateBell();
    loadList(); // background refresh

    // Apply lock UI if conversation is locked
    if (cv.status === 'locked') {
      const inputBar = document.querySelector('#cbm-thread .cbm-bar');
      if (window.CabanaNotif) CabanaNotif.applyConvLock(cv, msgsEl, inputBar);
      // Disable send button and textarea
      const tBtn = document.getElementById('cbm-thr-send');
      const tInp = document.getElementById('cbm-thr-input');
      if (tBtn) tBtn.disabled = true;
      if (tInp) { tInp.disabled = true; tInp.placeholder = 'This conversation is closed.'; }
    }
    // Show contact release banner if applicable
    if (cv.contact_released && window.CabanaNotif) {
      // Load contact data for banner
      const s = sb();
      if (s) {
        const { data: bk } = await s.from('apartment_bookings')
          .select('exact_address, apartment_id')
          .eq('id', cv.booking_id || '00000000-0000-0000-0000-000000000000')
          .maybeSingle();
        CabanaNotif.insertContactBanner(cv, msgsEl, {
          address: bk?.exact_address,
          phone: null, // shown in system message already
        });
      }
    }
  }

  async function _tSend() {
    const inp = document.getElementById('cbm-thr-input');
    const txt = inp?.value || '';
    if (!txt.trim() || !_conv) return;
    await doSend(_conv.id, txt, 'cbm-thr-send', 'cbm-thr-input', 'cbm-thr-msgs');
    renderMsgs(await loadMsgs(_conv.id), document.getElementById('cbm-thr-msgs'));
  }

  function _thrBack() {
    _thrSub = clearSub(_thrSub);
    _conv = null;
    document.getElementById('cbm-thread').classList.remove('open');
    _ibView = 'list';
    loadList();
  }

  function _goStays() { closeInbox(); location.href = 'apartments.html'; }

  function closeInbox() {
    document.getElementById('cbm-inbox')?.classList.remove('open');
    document.body.style.overflow = '';
    _thrSub = clearSub(_thrSub);
    _conv = null;
    _ibView = 'list';
  }

  /* ─── Utility ──────────────────────────────────────────────────────────── */
  function _grow(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 110) + 'px';
  }

  /* ════════════════════════════════════════════════════════════════════════
     HOOK APA-CHROME BELL → opens inbox
  ════════════════════════════════════════════════════════════════════════ */
  function _hookChrome() {
    if (window.ApaChrome) {
      window.ApaChrome.openNotifications = openInbox;
      window.ApaChrome.openInbox = openInbox;
    }
  }

  /* ════════════════════════════════════════════════════════════════════════
     BACKWARD COMPAT SHIM
  ════════════════════════════════════════════════════════════════════════ */
  function _compat() {
    window.ApatmentoChat = {
      open, openInbox, closeInbox, close,
      send: _pSend, _autosize: _grow,
      _inboxSend: _tSend, _inboxOpenConv: _openThr,
      _inboxBackToList: _thrBack, _openConvById: _openThr,
      initFAB: initBell, scrubContactInfo: scrub,
    };
  }

  /* ════════════════════════════════════════════════════════════════════════
     INIT
  ════════════════════════════════════════════════════════════════════════ */
  function _init() {
    injectFont();
    injectCSS();
    _compat();

    _hookChrome();
    if (!window.ApaChrome) {
      const iv = setInterval(() => { if (window.ApaChrome) { _hookChrome(); clearInterval(iv); } }, 200);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initBell);
    else setTimeout(initBell, 600);

    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (_ibView === 'thread') { _thrBack(); return; }
      if (document.getElementById('cbm-inbox')?.classList.contains('open')) { closeInbox(); return; }
      if (document.getElementById('cbm-panel-wrap')?.classList.contains('open')) { close(); return; }
    });
  }

  _init();

  return {
    open, openInbox, closeInbox, close,
    getUnread, initBell, initFAB: initBell, updateBell, scrub,
    _pSend, _tSend, _thrBack, _openThr, _filter, _grow, _goStays,
  };
})();

/* ════════════════════════════════════════════════════════════════════════════
   CABANA NOTIFICATIONS ENGINE. Appended to chat.js
   ────────────────────────────────────────────────────────────────────────────
   Powers:
     1. Dashboard "ring" card notification feed (replaces static bell sheet)
     2. Real-time toast for incoming notifications
     3. Conversation locking UI (locked banner + disable input)
     4. Contact release banner inside thread
   Requires: window.sb, CabanaChat already initialised above
   ════════════════════════════════════════════════════════════════════════════ */

const CabanaNotif = (() => {
  'use strict';

  const SUPA_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
  const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';

  let _uid       = null;
  let _notifSub  = null;
  let _feed      = [];      // cached notifications
  const sb = () => window.sb || null;

  /* ── KIND → icon map ────────────────────────────────────────────────── */
  const KIND_ICO = {
    booking: '📅', payment: '💰', message: '💬',
    general: '🔔', alert: '⚠️', checkin: '🔑',
  };

  /* ── CSS ────────────────────────────────────────────────────────────── */
  function injectNotifCSS() {
    if (document.getElementById('cbn-css')) return;
    const s = document.createElement('style');
    s.id = 'cbn-css';
    s.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
:root{
  --cbn-f:'Inter',-apple-system,system-ui,sans-serif;
  --cbn-ink:#0A0A14;--cbn-ink3:#8E90AD;--cbn-bg:#FCFCFD;
  --cbn-line:rgba(10,10,20,.07);--cbn-pri:#4361FF;--cbn-danger:#FF4D6D;
}

/* ── Notification ring card ── */
#cbn-ring-card{
  position:relative;border-radius:18px;overflow:visible;
  cursor:pointer;margin-bottom:16px;display:block;
  transition:transform .2s;
}
#cbn-ring-card:hover{transform:translateY(-1px);}
.cbn-ring{
  position:absolute;inset:-2px;border-radius:20px;
  background:conic-gradient(from var(--cbn-angle,0deg),#FF6B6B,#FFD93D,#6BCB77,#4D96FF,#C77DFF,#FF6B6B);
  animation:cbnRingSpin 3s linear infinite;z-index:0;
}
@property --cbn-angle{syntax:'<angle>';inherits:false;initial-value:0deg;}
@keyframes cbnRingSpin{to{--cbn-angle:360deg;}}
.cbn-ring-inner{
  position:relative;z-index:1;
  background:#fff;border-radius:16px;
  overflow:hidden;
}
.cbn-ring-head{
  padding:14px 16px 10px;
  display:flex;align-items:center;gap:10px;
  border-bottom:1px solid var(--cbn-line);
}
.cbn-ring-ico{
  width:38px;height:38px;border-radius:12px;flex-shrink:0;
  background:linear-gradient(135deg,#3D5BFF,#7B2FF7);
  display:flex;align-items:center;justify-content:center;font-size:18px;
}
.cbn-ring-title{
  flex:1;font:700 14px/1.2 var(--cbn-f);color:var(--cbn-ink);letter-spacing:-.01em;
}
.cbn-ring-badge{
  min-width:20px;height:20px;border-radius:10px;
  background:var(--cbn-danger);color:#fff;
  font:800 10px/1 var(--cbn-f);
  display:flex;align-items:center;justify-content:center;padding:0 5px;
}
.cbn-ring-badge.hidden{display:none;}
.cbn-ring-mark-all{
  font:600 11px/1 var(--cbn-f);color:var(--cbn-pri);
  background:none;border:none;cursor:pointer;padding:0;
  flex-shrink:0;
}
.cbn-ring-mark-all:hover{text-decoration:underline;}

/* Notification rows */
.cbn-feed{max-height:340px;overflow-y:auto;}
.cbn-feed::-webkit-scrollbar{width:3px;}
.cbn-feed::-webkit-scrollbar-thumb{background:rgba(10,10,20,.1);border-radius:2px;}
.cbn-item{
  display:flex;align-items:flex-start;gap:11px;
  padding:12px 16px;
  border-bottom:1px solid rgba(10,10,20,.04);
  cursor:pointer;transition:background .12s;
  -webkit-tap-highlight-color:transparent;
}
.cbn-item:last-child{border-bottom:none;}
.cbn-item:hover{background:rgba(67,97,255,.04);}
.cbn-item.unread{background:rgba(67,97,255,.03);}
.cbn-item-ico{
  width:36px;height:36px;border-radius:50%;flex-shrink:0;
  background:rgba(67,97,255,.08);
  display:flex;align-items:center;justify-content:center;font-size:17px;
  position:relative;
}
.cbn-item-dot{
  position:absolute;top:0;right:0;
  width:9px;height:9px;border-radius:50%;
  background:var(--cbn-pri);border:2px solid #fff;
}
.cbn-item-body{flex:1;min-width:0;}
.cbn-item-title{
  font:600 13px/1.3 var(--cbn-f);color:var(--cbn-ink);letter-spacing:-.01em;
  margin-bottom:3px;
}
.cbn-item.unread .cbn-item-title{font-weight:700;}
.cbn-item-body-txt{
  font:400 12px/1.45 var(--cbn-f);color:var(--cbn-ink3);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.cbn-item-time{
  font:400 10px/1 var(--cbn-f);color:var(--cbn-ink3);flex-shrink:0;
  margin-top:1px;
}
.cbn-feed-empty{
  padding:28px 16px;text-align:center;
  font:400 13px/1.5 var(--cbn-f);color:var(--cbn-ink3);
}
.cbn-feed-foot{
  padding:10px 16px;text-align:center;
  border-top:1px solid var(--cbn-line);
}
.cbn-feed-foot a{
  font:600 12px/1 var(--cbn-f);color:var(--cbn-pri);
  text-decoration:none;cursor:pointer;
}
.cbn-feed-foot a:hover{text-decoration:underline;}

/* ── Locked conversation banner ── */
.cbm-locked-banner{
  margin:0;padding:13px 16px;
  background:rgba(255,77,109,.05);
  border-top:1px solid rgba(255,77,109,.12);
  border-bottom:1px solid rgba(255,77,109,.12);
  display:flex;align-items:center;gap:9px;flex-shrink:0;
}
.cbm-locked-banner svg{flex-shrink:0;color:#FF4D6D;}
.cbm-locked-text{font:500 12px/1.45 var(--cbn-f);color:#C0122A;}
.cbm-locked-text strong{font-weight:700;}
.cbm-input-locked{
  opacity:.45;pointer-events:none;user-select:none;
}

/* ── Contact released banner ── */
.cbm-contact-banner{
  margin:10px 14px;padding:14px 16px;
  background:rgba(23,198,176,.06);
  border:1px solid rgba(23,198,176,.2);
  border-radius:14px;
}
.cbm-contact-banner-head{
  display:flex;align-items:center;gap:8px;
  font:700 13px/1.2 var(--cbn-f);color:#0E7A6D;
  margin-bottom:8px;
}
.cbm-contact-banner-body{
  font:400 12px/1.6 var(--cbn-f);color:#1A5C55;
}
.cbm-contact-row{
  display:flex;align-items:center;gap:7px;
  font:600 13px/1.3 var(--cbn-f);color:#0A0A14;
  margin-top:6px;
}
.cbm-contact-row svg{color:#17C6B0;flex-shrink:0;}

/* ── Toast (override for wider notif toasts) ── */
.cbn-toast-wide{
  max-width:calc(100vw - 32px);white-space:normal;
  text-align:left;padding:13px 18px;
  line-height:1.45;
}

/* Bell dot. Match chrome */
.apa-ico[data-apa="notif"] .apa-ico-dot{
  display:none;
}
.apa-ico[data-apa="notif"][data-unread="1"] .apa-ico-dot{
  display:block;
}
    `;
    document.head.appendChild(s);
  }

  /* ── Time formatting ─────────────────────────────────────────────────── */
  function fmtAge(iso) {
    const d = new Date(iso), now = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 1)     return 'Just now';
    if (diff < 60)    return diff + 'm ago';
    if (diff < 1440)  return Math.floor(diff/60) + 'h ago';
    if (diff < 10080) return d.toLocaleDateString('en-KE', { weekday:'short' });
    return d.toLocaleDateString('en-KE', { month:'short', day:'numeric' });
  }

  /* ── Load notifications ──────────────────────────────────────────────── */
  async function loadNotifs(limit = 30) {
    const s = sb(); if (!s || !_uid) return [];
    try {
      const { data } = await s.from('notifications')
        .select('*')
        .eq('user_id', _uid)
        .order('created_at', { ascending:false })
        .limit(limit);
      _feed = data || [];
      return _feed;
    } catch (_) { return []; }
  }

  /* ── Unread count ────────────────────────────────────────────────────── */
  async function getUnreadNotifCount() {
    const s = sb(); if (!s || !_uid) return 0;
    try {
      const { count } = await s.from('notifications')
        .select('id', { count:'exact', head:true })
        .eq('user_id', _uid).eq('read', false);
      return count || 0;
    } catch (_) { return 0; }
  }

  /* ── Mark all read ───────────────────────────────────────────────────── */
  async function markAllRead() {
    const s = sb(); if (!s || !_uid) return;
    await s.from('notifications')
      .update({ read:true })
      .eq('user_id', _uid).eq('read', false);
    _feed = _feed.map(n => ({ ...n, read:true }));
    renderRingCard();
    updateAllBadges(0);
  }

  async function markOneRead(id) {
    const s = sb(); if (!s) return;
    await s.from('notifications').update({ read:true }).eq('id', id);
    _feed = _feed.map(n => n.id === id ? { ...n, read:true } : n);
    await syncBadges();
  }

  /* ── Badge sync. Messages + notifications combined ─────────────────── */
  async function syncBadges() {
    const [msgs, notifs] = await Promise.all([
      CabanaChat.getUnread ? CabanaChat.getUnread() : 0,
      getUnreadNotifCount(),
    ]);
    const total = msgs + notifs;
    updateAllBadges(total, msgs, notifs);
    return total;
  }

  function updateAllBadges(total, msgs, notifs) {
    // Chrome bell dot
    document.querySelectorAll('.apa-ico[data-apa="notif"]').forEach(btn => {
      const dot = btn.querySelector('.apa-ico-dot');
      if (dot) dot.style.display = total > 0 ? 'block' : 'none';
      btn.setAttribute('data-unread', total > 0 ? '1' : '0');
    });
    // Stays topbar inbox badge (msgs only)
    const tb = document.getElementById('tb-inbox-badge');
    if (tb) {
      if ((msgs||0) > 0) { tb.textContent = msgs > 99 ? '99+' : String(msgs); tb.classList.add('on'); }
      else tb.classList.remove('on');
    }
    // Ring card badge
    const rb = document.getElementById('cbn-ring-badge');
    if (rb) {
      if (total > 0) { rb.textContent = total > 99 ? '99+' : String(total); rb.classList.remove('hidden'); }
      else rb.classList.add('hidden');
    }
  }

  /* ── Realtime subscription for new notifications ─────────────────────── */
  function subNotifs() {
    const s = sb(); if (!s || _notifSub || !_uid) return;
    _notifSub = s.channel('cbn-notif-' + _uid)
      .on('postgres_changes', {
        event:'INSERT', schema:'public', table:'notifications',
        filter:`user_id=eq.${_uid}`,
      }, async (payload) => {
        const n = payload.new;
        _feed.unshift(n);
        renderRingCard();
        syncBadges();
        showNotifToast(n);
      })
      .subscribe();
  }

  /* ── Toast for new incoming notification ─────────────────────────────── */
  function showNotifToast(n) {
    const ico = KIND_ICO[n.kind] || '🔔';
    let t = document.getElementById('cbm-toast');
    if (!t) { t = Object.assign(document.createElement('div'), { id:'cbm-toast', className:'cbm-toast' }); document.body.appendChild(t); }
    t.className = 'cbm-toast cbn-toast-wide show';
    t.innerHTML = `<span style="margin-right:7px">${ico}</span><strong>${escHtml(n.title)}</strong>${n.body ? '<br><span style="font-weight:400;font-size:12px">' + escHtml(n.body) + '</span>' : ''}`;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 5000);
    // Click opens relevant destination
    t.onclick = () => { t.classList.remove('show'); if (n.url) location.href = n.url; };
  }

  function escHtml(str) {
    return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  /* ── Render the ring card (dashboard) ───────────────────────────────── */
  function renderRingCard() {
    const card = document.getElementById('cbn-ring-card');
    if (!card) return;

    const unread = _feed.filter(n => !n.read).length;
    const badge  = card.querySelector('#cbn-ring-badge');
    if (badge) {
      if (unread > 0) { badge.textContent = unread > 99 ? '99+' : String(unread); badge.classList.remove('hidden'); }
      else badge.classList.add('hidden');
    }

    const feed = card.querySelector('.cbn-feed');
    if (!feed) return;

    if (!_feed.length) {
      feed.innerHTML = '<div class="cbn-feed-empty">You\'re all caught up 🎉</div>';
      return;
    }

    feed.innerHTML = _feed.slice(0, 15).map(n => {
      const ico = KIND_ICO[n.kind] || '🔔';
      return `<div class="cbn-item${n.read?'':' unread'}" onclick="CabanaNotif._handleNotifClick('${n.id}','${escHtml(n.url||'')}')">
        <div class="cbn-item-ico">${ico}${!n.read?'<span class="cbn-item-dot"></span>':''}</div>
        <div class="cbn-item-body">
          <div class="cbn-item-title">${escHtml(n.title)}</div>
          <div class="cbn-item-body-txt">${escHtml(n.body||'')}</div>
        </div>
        <div class="cbn-item-time">${fmtAge(n.created_at)}</div>
      </div>`;
    }).join('');
  }

  /* ── Build the ring card DOM (called once on dashboard) ─────────────── */
  function buildRingCard(containerSelector) {
    const container = document.querySelector(containerSelector || '#cbn-ring-slot');
    if (!container) return;
    if (document.getElementById('cbn-ring-card')) return;

    const card = document.createElement('div');
    card.id = 'cbn-ring-card';
    card.innerHTML = `
      <div class="cbn-ring"></div>
      <div class="cbn-ring-inner">
        <div class="cbn-ring-head">
          <div class="cbn-ring-ico">🔔</div>
          <div class="cbn-ring-title">Notifications</div>
          <span class="cbn-ring-badge hidden" id="cbn-ring-badge">0</span>
          <button class="cbn-ring-mark-all" onclick="CabanaNotif.markAllRead()" title="Mark all as read">Mark all read</button>
        </div>
        <div class="cbn-feed" id="cbn-feed">
          <div class="cbn-feed-empty">Loading…</div>
        </div>
        <div class="cbn-feed-foot">
          <a onclick="CabanaNotif.loadMore()">View all notifications</a>
        </div>
      </div>`;
    container.appendChild(card);
  }

  /* ── Handle notification click ───────────────────────────────────────── */
  async function _handleNotifClick(id, url) {
    await markOneRead(id);
    renderRingCard();
    if (url && url !== 'undefined') {
      // If it's a message notification, open messenger
      if (url.includes('dashboard') || url.includes('inbox')) {
        if (window.CabanaChat) { CabanaChat.openInbox(); return; }
      }
      location.href = url;
    }
  }

  async function loadMore() {
    _feed = await loadNotifs(100);
    renderRingCard();
  }

  /* ── CONVERSATION LOCK UI ────────────────────────────────────────────── */
  function applyConvLock(conv, msgsEl, inputBarEl) {
    if (!conv || conv.status !== 'locked') return;

    const reason = conv.locked_reason;
    let msg = '';
    if (reason === '24h_no_booking') {
      msg = '<strong>Chat closed.</strong> No booking was made within 24 hours. Enquire again from the listing page to restart.';
    } else if (reason === 'stay_ended') {
      msg = '<strong>Stay complete.</strong> This conversation has been closed as the stay period ended.';
    } else {
      msg = '<strong>Conversation closed.</strong> This chat is no longer active.';
    }

    // Insert locked banner before input bar
    if (inputBarEl && !inputBarEl.previousElementSibling?.classList.contains('cbm-locked-banner')) {
      const banner = document.createElement('div');
      banner.className = 'cbm-locked-banner';
      banner.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><span class="cbm-locked-text">${msg}</span>`;
      inputBarEl.parentNode.insertBefore(banner, inputBarEl);
    }

    // Disable input
    if (inputBarEl) inputBarEl.classList.add('cbm-input-locked');
  }

  /* ── CONTACT RELEASED BANNER ─────────────────────────────────────────── */
  function insertContactBanner(conv, msgsEl, contactData) {
    if (!conv?.contact_released || !msgsEl) return;
    if (msgsEl.querySelector('.cbm-contact-banner')) return; // already shown

    const { phone, address } = contactData || {};
    const banner = document.createElement('div');
    banner.className = 'cbm-contact-banner';
    banner.innerHTML = `
      <div class="cbm-contact-banner-head">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12.11 19.79 19.79 0 0 1 1.56 3.5 2 2 0 0 1 3.55 1.32h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.18 6.18l1.76-1.76a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        Contact Details Released
      </div>
      <div class="cbm-contact-banner-body">
        Your booking is confirmed. Contact details have been shared.
        ${address ? `<div class="cbm-contact-row"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${escHtml(address)}</div>` : ''}
        ${phone  ? `<div class="cbm-contact-row"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12.11"/></svg>${escHtml(phone)}</div>` : ''}
        <div class="cbm-contact-row" style="margin-top:10px;color:#C0122A;font-size:11px">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <strong>Check-in code:</strong>&nbsp;Share this face-to-face upon arrival only. Never send it over chat.
        </div>
      </div>`;
    msgsEl.prepend(banner);
  }

  /* ── INIT ────────────────────────────────────────────────────────────── */
  async function init() {
    injectNotifCSS();

    // Resolve user
    const user = await (window.CabanaChat
      ? (async () => {
          if (window.CURRENT_USER) return window.CURRENT_USER;
          if (window.ApaSession) return new Promise(res => ApaSession.ready(st => res(st?.user||null)));
          return null;
        })()
      : Promise.resolve(null));

    if (!user) return;
    _uid = user.id;

    // Build ring card if slot exists on dashboard
    buildRingCard('#cbn-ring-slot');

    // Load notifications
    await loadNotifs();
    renderRingCard();
    await syncBadges();

    // Start realtime subscription
    subNotifs();

    // Poll every 60s as fallback
    setInterval(async () => {
      await loadNotifs();
      renderRingCard();
      syncBadges();
    }, 60_000);
  }

  // Auto-init with delay to let session boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 800));
  } else {
    setTimeout(init, 800);
  }

  /* ── Public API ──────────────────────────────────────────────────────── */
  window.CabanaNotif = {
    init, loadNotifs, markAllRead, markOneRead, syncBadges,
    buildRingCard, renderRingCard, showNotifToast, loadMore,
    applyConvLock, insertContactBanner,
    _handleNotifClick,
  };
  return window.CabanaNotif;
})();
