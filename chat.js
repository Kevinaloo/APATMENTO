/* ════════════════════════════════════════════════════════════════════════════
   CABANA MESSENGER  v4  —  chat.js
   ────────────────────────────────────────────────────────────────────────────
   World-class in-app messaging for Cabana (Apatmento).

   ARCHITECTURE
   ────────────
   • Two surfaces:
       1. Host Chat Panel  — floats from listing card ("Message the host")
       2. Full-screen Inbox — slides in from notification bell / topbar icon

   • Realtime via Supabase Realtime channels (postgres_changes + presence)
   • Contact-info scrubbing: phones, emails, WhatsApp, socials, URLs
     enforced client-side; server-side additive via Supabase functions

   • Notification bell integration:
       – On load, polls unread count every 30 s
       – On new message, bell badge updates instantly via realtime
       – ApaChrome.bell() is called to set/clear the dot
       – dashboard.html bell (data-apa="notif") opens inbox via openNotifications()
         which is overridden here to open the full messenger

   PUBLIC API
   ──────────
   CabanaChat.open({ listingId, listingType, listingTitle, hostId })
   CabanaChat.openInbox()
   CabanaChat.closeInbox()
   CabanaChat.close()
   CabanaChat.getUnreadCount()   → Promise<number>
   CabanaChat.initBell()         → starts unread polling + realtime badge

   Requires: window.sb (Supabase client), window.CURRENT_USER or ApaSession
   ════════════════════════════════════════════════════════════════════════════ */

const CabanaChat = (() => {
  'use strict';

  /* ── Constants ──────────────────────────────────────────────────────────── */
  const SUPA_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
  const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';

  const TYPE_ICONS = {
    apartment: '🏠', roommate: '🤝', tour: '🦁', event: '🎟',
    carhire: '🚗', food: '🍽', shopping: '🛍', stays: '🏠',
  };
  const POLL_INTERVAL_MS = 30_000;
  const MSG_LIMIT        = 200;

  /* ── State ──────────────────────────────────────────────────────────────── */
  let _userId        = null;
  let _activeConv    = null;   // current conversation object
  let _panelSub      = null;   // realtime sub for floating panel
  let _inboxSub      = null;   // realtime sub for inbox thread
  let _globalSub     = null;   // realtime sub for unread badge
  let _pollTimer     = null;
  let _bellEl        = null;   // cached bell button element
  let _inboxView     = 'list'; // 'list' | 'thread'

  /* ── Supabase client accessor ───────────────────────────────────────────── */
  function sb() { return window.sb || null; }

  /* ════════════════════════════════════════════════════════════════════════
     CONTACT-INFO SCRUBBER
     Scans outbound messages for phone numbers, emails, socials, URLs.
     Enforced before insert; warning shown inline on scrub.
  ════════════════════════════════════════════════════════════════════════ */
  const SCRUB_PATTERNS = [
    // Kenyan phone numbers
    { re: /(?:\+?254|0)[\s\-.]?[17]\d{2}[\s\-.]?\d{3}[\s\-.]?\d{3}/g,      tag: 'phone' },
    { re: /\b0[17]\d{8}\b/g,                                                  tag: 'phone' },
    // International numbers
    { re: /(?:\+?\d{1,3}[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}/g, tag: 'phone' },
    // Email
    { re: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,             tag: 'email' },
    // WhatsApp / direct contact hints
    { re: /wh?a?ts?a?pp?[\s:]*/gi,                                            tag: 'WhatsApp' },
    { re: /\btext\s+me\b/gi,                                                   tag: 'direct contact' },
    { re: /\bcall\s+me\b/gi,                                                   tag: 'direct contact' },
    { re: /\bdm\s+me\b/gi,                                                     tag: 'direct contact' },
    { re: /\breach\s+me\s+(?:on|at|via)\b/gi,                                 tag: 'direct contact' },
    // Social handles & platforms
    { re: /@[a-zA-Z0-9_.]{2,30}\b(?!\s*(?:apatmento|cabana))/g,              tag: 'social handle' },
    { re: /(?:instagram|twitter|facebook|telegram|tiktok|snapchat|linkedin)[\s:/]+[a-zA-Z0-9_.]+/gi, tag: 'social' },
    // URLs
    { re: /https?:\/\/[^\s]+/gi,                                              tag: 'link' },
    { re: /[a-zA-Z0-9\-]+\.(?:com|co\.ke|ke|org|net|me|io|app)\b/gi,         tag: 'website' },
    // Spelled-out / obfuscated numbers
    { re: /\b(?:zero|one|two|three|four|five|six|seven|eight|nine)[\s\-]+(?:zero|one|two|three|four|five|six|seven|eight|nine)/gi, tag: 'number' },
    { re: /\b\d[\s.\-]{1,2}\d[\s.\-]{1,2}\d[\s.\-]{1,2}\d[\s.\-]{1,2}\d[\s.\-]{1,2}\d/g, tag: 'phone' },
  ];

  function scrub(text) {
    let result = text, dirty = false;
    for (const { re, tag } of SCRUB_PATTERNS) {
      const next = result.replace(re, `[${tag} removed]`);
      if (next !== result) { dirty = true; result = next; }
    }
    return { text: result, scrubbed: dirty };
  }

  /* ════════════════════════════════════════════════════════════════════════
     AUTH RESOLUTION — works before or after ApaSession fires
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
     TIME FORMATTING
  ════════════════════════════════════════════════════════════════════════ */
  function fmtMsg(iso) {
    const d = new Date(iso), now = new Date();
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  function fmtList(iso) {
    const d = new Date(iso), now = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 1)    return 'Now';
    if (diff < 60)   return diff + 'm';
    if (diff < 1440) return Math.floor(diff / 60) + 'h';
    if (diff < 10080) return d.toLocaleDateString('en-KE', { weekday: 'short' });
    return d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
  }

  /* ════════════════════════════════════════════════════════════════════════
     CSS INJECTION
  ════════════════════════════════════════════════════════════════════════ */
  function injectCSS() {
    if (document.getElementById('cbm-css')) return;
    const s = document.createElement('style');
    s.id = 'cbm-css';
    s.textContent = `
/* ═══ CABANA MESSENGER ═══════════════════════════════════════════════════ */
:root{
  --cbm-ink:#0A0A14;
  --cbm-ink2:#4A4C66;
  --cbm-ink3:#8E90AD;
  --cbm-bg:#FCFCFD;
  --cbm-card:#fff;
  --cbm-line:rgba(10,10,20,.08);
  --cbm-pri:#4361FF;
  --cbm-pri2:#7B2FF7;
  --cbm-teal:#2DD4BF;
  --cbm-danger:#FF4D6D;
  --cbm-warn:#F59E0B;
  --cbm-radius:24px;
  --cbm-shadow:0 24px 72px rgba(10,10,20,.2),0 4px 16px rgba(10,10,20,.08);
  --cbm-font:'Inter',system-ui,-apple-system,sans-serif;
  --cbm-font-d:'Geist','Inter',sans-serif;
}

/* ─── HOST CHAT PANEL (floating, corner) ──────────────────────────────── */
#cbm-panel-wrap{
  position:fixed;inset:0;z-index:8800;
  display:flex;align-items:flex-end;justify-content:flex-end;
  padding:16px;pointer-events:none;
}
#cbm-panel-wrap.open{pointer-events:all;}
#cbm-panel{
  width:390px;max-width:calc(100vw - 24px);
  height:min(640px,92vh);
  background:var(--cbm-card);
  border-radius:var(--cbm-radius);
  box-shadow:var(--cbm-shadow);
  display:flex;flex-direction:column;overflow:hidden;
  transform:translateY(24px) scale(.97);opacity:0;
  transition:transform .38s cubic-bezier(.22,1,.36,1),opacity .28s;
  pointer-events:none;
}
#cbm-panel-wrap.open #cbm-panel{
  transform:translateY(0) scale(1);opacity:1;pointer-events:all;
}
@media(max-width:480px){
  #cbm-panel-wrap{padding:0;align-items:flex-end;}
  #cbm-panel{width:100%;max-width:100%;height:88vh;border-radius:22px 22px 0 0;}
}

/* ─── Panel header ───────────────────────────────────────────────────── */
.cbm-head{
  padding:0 16px;height:66px;flex-shrink:0;
  background:linear-gradient(135deg,var(--cbm-pri),var(--cbm-pri2));
  display:flex;align-items:center;gap:12px;position:relative;
}
.cbm-head-ava{
  width:40px;height:40px;border-radius:50%;
  background:rgba(255,255,255,.2);
  display:flex;align-items:center;justify-content:center;
  font-size:20px;flex-shrink:0;
}
.cbm-head-info{flex:1;min-width:0;}
.cbm-head-name{font:700 15px/1.2 var(--cbm-font-d);color:#fff;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cbm-head-sub{font:500 11px/1 var(--cbm-font);color:rgba(255,255,255,.72);margin-top:3px;}
.cbm-head-status{
  display:flex;align-items:center;gap:5px;
  font:500 11px/1 var(--cbm-font);color:rgba(255,255,255,.72);
  flex-shrink:0;
}
.cbm-online-dot{width:7px;height:7px;border-radius:50%;background:#2DD4BF;flex-shrink:0;}
.cbm-head-close{
  width:32px;height:32px;border-radius:50%;
  background:rgba(255,255,255,.15);border:none;cursor:pointer;
  display:flex;align-items:center;justify-content:center;color:#fff;
  flex-shrink:0;transition:background .2s;
}
.cbm-head-close:hover{background:rgba(255,255,255,.28);}

/* ─── Security notice banner ─────────────────────────────────────────── */
.cbm-notice{
  padding:9px 14px;font:500 11px/1.45 var(--cbm-font);
  background:rgba(67,97,255,.06);border-bottom:1px solid rgba(67,97,255,.1);
  color:#4361FF;display:flex;align-items:center;gap:7px;flex-shrink:0;
}
.cbm-notice svg{flex-shrink:0;opacity:.8;}

/* ─── Scrubbed badge (in messages) ──────────────────────────────────── */
.cbm-scrub{
  display:inline-flex;align-items:center;gap:3px;
  padding:1px 6px;border-radius:5px;
  background:rgba(255,77,109,.1);color:#CC2233;
  font-size:10px;font-weight:700;vertical-align:middle;
}

/* ─── Messages area ──────────────────────────────────────────────────── */
.cbm-msgs{
  flex:1;overflow-y:auto;padding:14px 14px 10px;
  display:flex;flex-direction:column;gap:10px;
  scroll-behavior:smooth;
}
.cbm-msgs::-webkit-scrollbar{width:3px;}
.cbm-msgs::-webkit-scrollbar-thumb{background:rgba(10,10,20,.1);border-radius:2px;}

/* Message bubbles */
.cbm-msg{display:flex;flex-direction:column;max-width:80%;gap:4px;}
.cbm-msg.me{align-self:flex-end;align-items:flex-end;}
.cbm-msg.them{align-self:flex-start;align-items:flex-start;}
.cbm-msg.sys{align-self:center;max-width:90%;}

.cbm-bubble{
  padding:10px 14px;border-radius:18px;
  font:400 14px/1.5 var(--cbm-font);word-break:break-word;
}
.cbm-msg.me .cbm-bubble{
  background:linear-gradient(135deg,#4361FF,#7B2FF7);color:#fff;
  border-bottom-right-radius:4px;
}
.cbm-msg.them .cbm-bubble{
  background:#F1F2F8;color:var(--cbm-ink);
  border-bottom-left-radius:4px;
}
.cbm-msg.sys .cbm-bubble{
  background:rgba(243,249,255,.9);border:1px solid rgba(67,97,255,.15);
  color:#4361FF;font-size:12px;text-align:center;border-radius:10px;
  padding:8px 14px;
}
.cbm-msg.warn .cbm-bubble{
  background:rgba(255,168,0,.08);border:1px solid rgba(255,168,0,.2);
  color:#92600A;font-size:12px;text-align:center;border-radius:10px;
}
.cbm-time{
  font:400 10px/1 var(--cbm-font);color:rgba(10,10,20,.35);
  padding:0 3px;display:flex;align-items:center;gap:6px;
}
.cbm-tick{color:var(--cbm-teal);display:inline-flex;}

/* Typing indicator */
.cbm-typing{display:flex;gap:4px;align-items:center;padding:10px 14px;
  background:#F1F2F8;border-radius:18px;border-bottom-left-radius:4px;
  width:fit-content;align-self:flex-start;}
.cbm-dot{width:7px;height:7px;border-radius:50%;background:var(--cbm-ink3);
  animation:cbmBounce 1.2s ease-in-out infinite;}
.cbm-dot:nth-child(2){animation-delay:.2s;}
.cbm-dot:nth-child(3){animation-delay:.4s;}
@keyframes cbmBounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}

/* Day divider */
.cbm-divider{
  display:flex;align-items:center;gap:10px;
  font:600 10px/1 var(--cbm-font);color:var(--cbm-ink3);
  letter-spacing:.06em;text-transform:uppercase;margin:6px 0;align-self:stretch;
}
.cbm-divider::before,.cbm-divider::after{
  content:'';flex:1;height:1px;background:var(--cbm-line);
}

/* Empty state */
.cbm-empty{
  flex:1;display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  gap:12px;padding:30px 20px;text-align:center;
}
.cbm-empty-ico{font-size:48px;}
.cbm-empty-ttl{font:700 16px/1.3 var(--cbm-font-d);color:var(--cbm-ink);}
.cbm-empty-sub{font:400 13px/1.6 var(--cbm-font);color:var(--cbm-ink3);max-width:230px;}

/* ─── Input bar ──────────────────────────────────────────────────────── */
.cbm-input-bar{
  padding:10px 12px 12px;border-top:1px solid var(--cbm-line);
  display:flex;align-items:flex-end;gap:9px;flex-shrink:0;
  background:var(--cbm-card);
}
.cbm-input{
  flex:1;border:1.5px solid rgba(10,10,20,.1);border-radius:22px;
  padding:10px 15px;font:400 14px/1.4 var(--cbm-font);
  resize:none;outline:none;max-height:110px;min-height:42px;
  overflow-y:auto;background:#F8F9FF;color:var(--cbm-ink);
  transition:border-color .2s,background .2s;
}
.cbm-input:focus{border-color:var(--cbm-pri);background:#fff;}
.cbm-input::placeholder{color:var(--cbm-ink3);}
.cbm-send{
  width:42px;height:42px;border-radius:50%;flex-shrink:0;
  background:linear-gradient(135deg,#4361FF,#7B2FF7);
  border:none;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  color:#fff;box-shadow:0 4px 16px rgba(67,97,255,.35);
  transition:transform .18s,box-shadow .18s,opacity .15s;
}
.cbm-send:hover{transform:scale(1.1);box-shadow:0 6px 22px rgba(67,97,255,.5);}
.cbm-send:active{transform:scale(.94);}
.cbm-send:disabled{opacity:.4;transform:none;cursor:not-allowed;box-shadow:none;}

/* ═══ FULL-SCREEN INBOX ═══════════════════════════════════════════════════ */
#cbm-inbox{
  position:fixed;inset:0;z-index:8900;
  background:var(--cbm-bg);
  display:flex;flex-direction:column;
  transform:translateX(100%);
  transition:transform .4s cubic-bezier(.22,1,.36,1);
  will-change:transform;
}
#cbm-inbox.open{transform:translateX(0);}

/* Inbox topbar */
.cbm-ib-bar{
  height:64px;display:flex;align-items:center;gap:12px;
  padding:0 18px;flex-shrink:0;
  background:rgba(252,252,253,.94);
  -webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);
  border-bottom:1px solid var(--cbm-line);position:relative;z-index:2;
}
.cbm-ib-back{
  width:40px;height:40px;border-radius:14px;flex-shrink:0;
  border:1.5px solid var(--cbm-line);background:rgba(255,255,255,.8);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:var(--cbm-ink);transition:border-color .2s,color .2s;
}
.cbm-ib-back:hover{border-color:var(--cbm-pri);color:var(--cbm-pri);}
.cbm-ib-titles{flex:1;min-width:0;}
.cbm-ib-title{font:700 19px/1.1 var(--cbm-font-d);color:var(--cbm-ink);}
.cbm-ib-sub{font:400 12px/1 var(--cbm-font);color:var(--cbm-ink3);margin-top:3px;}
.cbm-ib-compose{
  width:40px;height:40px;border-radius:14px;flex-shrink:0;
  border:1.5px solid var(--cbm-line);background:rgba(255,255,255,.8);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:var(--cbm-pri);transition:border-color .2s,background .2s;
}
.cbm-ib-compose:hover{border-color:var(--cbm-pri);background:rgba(67,97,255,.06);}

/* Search bar */
.cbm-search-wrap{padding:10px 16px 8px;flex-shrink:0;border-bottom:1px solid var(--cbm-line);}
.cbm-search{
  display:flex;align-items:center;gap:9px;
  background:#F1F2F8;border-radius:13px;padding:9px 14px;
  border:1.5px solid transparent;transition:border-color .2s,background .2s;
}
.cbm-search:focus-within{background:#fff;border-color:rgba(67,97,255,.25);}
.cbm-search svg{color:var(--cbm-ink3);flex-shrink:0;}
.cbm-search-input{
  flex:1;border:none;background:none;outline:none;
  font:400 14px/1 var(--cbm-font);color:var(--cbm-ink);
}
.cbm-search-input::placeholder{color:var(--cbm-ink3);}

/* List view */
#cbm-ib-list{flex:1;overflow-y:auto;display:flex;flex-direction:column;}
#cbm-ib-list::-webkit-scrollbar{width:3px;}
#cbm-ib-list::-webkit-scrollbar-thumb{background:rgba(10,10,20,.1);border-radius:2px;}

/* Conversation row */
.cbm-conv{
  display:flex;align-items:center;gap:14px;
  padding:15px 18px;cursor:pointer;
  border-bottom:1px solid rgba(10,10,20,.04);
  transition:background .14s;-webkit-tap-highlight-color:transparent;
  position:relative;
}
.cbm-conv:active,.cbm-conv:hover{background:rgba(67,97,255,.04);}
.cbm-conv-ava{
  width:54px;height:54px;border-radius:50%;flex-shrink:0;
  background:linear-gradient(135deg,#B8A4F4,#7B2FF7);
  display:flex;align-items:center;justify-content:center;
  font-size:24px;position:relative;
}
.cbm-conv-badge{
  position:absolute;top:0;right:0;
  min-width:20px;height:20px;border-radius:10px;
  background:var(--cbm-pri);color:#fff;
  font:800 10px/1 var(--cbm-font);
  display:flex;align-items:center;justify-content:center;
  padding:0 5px;border:2.5px solid var(--cbm-bg);
}
.cbm-conv-body{flex:1;min-width:0;}
.cbm-conv-name{
  font:700 14px/1.3 var(--cbm-font-d);color:var(--cbm-ink);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  margin-bottom:4px;
}
.cbm-conv-prev{
  font:400 13px/1.3 var(--cbm-font);color:var(--cbm-ink3);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.cbm-conv.unread .cbm-conv-prev{color:var(--cbm-ink2);font-weight:500;}
.cbm-conv-meta{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;}
.cbm-conv-time{font:400 11px/1 var(--cbm-font);color:var(--cbm-ink3);}
.cbm-conv-unread-pill{
  min-width:20px;height:20px;border-radius:10px;
  background:var(--cbm-pri);color:#fff;
  font:800 10px/1 var(--cbm-font);
  display:flex;align-items:center;justify-content:center;padding:0 5px;
}

/* Section headers in list */
.cbm-section-head{
  padding:8px 18px 5px;
  font:700 10px/1 var(--cbm-font);letter-spacing:.08em;text-transform:uppercase;
  color:var(--cbm-ink3);background:var(--cbm-bg);
  border-bottom:1px solid var(--cbm-line);flex-shrink:0;
}

/* Thread view */
#cbm-thread{
  position:absolute;inset:0;
  background:var(--cbm-bg);
  display:flex;flex-direction:column;
  transform:translateX(100%);
  transition:transform .36s cubic-bezier(.22,1,.36,1);
  z-index:1;
}
#cbm-thread.open{transform:translateX(0);}

.cbm-thread-bar{
  height:64px;display:flex;align-items:center;gap:12px;
  padding:0 16px;flex-shrink:0;
  background:rgba(252,252,253,.94);
  -webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);
  border-bottom:1px solid var(--cbm-line);
}
.cbm-thread-back{
  width:38px;height:38px;border-radius:12px;flex-shrink:0;
  border:1.5px solid var(--cbm-line);background:rgba(255,255,255,.8);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:var(--cbm-ink);transition:border-color .2s,color .2s;
}
.cbm-thread-back:hover{border-color:var(--cbm-pri);color:var(--cbm-pri);}
.cbm-thread-ava{
  width:38px;height:38px;border-radius:50%;
  background:linear-gradient(135deg,#B8A4F4,#7B2FF7);
  display:flex;align-items:center;justify-content:center;
  font-size:18px;flex-shrink:0;
}
.cbm-thread-info{flex:1;min-width:0;}
.cbm-thread-name{
  font:700 15px/1.2 var(--cbm-font-d);color:var(--cbm-ink);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.cbm-thread-sub{font:400 11px/1 var(--cbm-font);color:var(--cbm-ink3);margin-top:2px;}

/* Inbox empty */
.cbm-ib-empty{
  flex:1;display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  gap:14px;padding:40px 28px;text-align:center;
}
.cbm-ib-empty-ico{font-size:60px;}
.cbm-ib-empty-ttl{font:700 20px/1.3 var(--cbm-font-d);color:var(--cbm-ink);}
.cbm-ib-empty-sub{font:400 14px/1.6 var(--cbm-font);color:var(--cbm-ink3);max-width:260px;}

/* Loading skeleton */
.cbm-skeleton{
  flex:1;padding:12px 18px;display:flex;flex-direction:column;gap:16px;overflow:hidden;
}
.cbm-skel-row{display:flex;align-items:center;gap:14px;}
.cbm-skel-ava{width:54px;height:54px;border-radius:50%;background:#F1F2F8;flex-shrink:0;}
.cbm-skel-body{flex:1;display:flex;flex-direction:column;gap:8px;}
.cbm-skel-l{height:13px;border-radius:7px;background:#F1F2F8;}
.cbm-skel-s{height:11px;border-radius:6px;background:#F1F2F8;width:70%;}
@keyframes cbmShim{0%{opacity:1}50%{opacity:.5}100%{opacity:1}}
.cbm-skel-ava,.cbm-skel-l,.cbm-skel-s{animation:cbmShim 1.6s ease-in-out infinite;}

/* ─── Bell badge integration ──────────────────────────────────────────── */
.cbm-bell-badge{
  position:absolute;top:6px;right:6px;
  width:10px;height:10px;border-radius:50%;
  background:var(--cbm-danger);border:2.5px solid #fff;
  display:none;
}
.cbm-bell-badge.on{display:block;}
.cbm-bell-count{
  position:absolute;top:-4px;right:-5px;
  min-width:18px;height:18px;border-radius:9px;
  background:var(--cbm-danger);color:#fff;
  font:800 9px/1 var(--cbm-font);
  display:none;align-items:center;justify-content:center;
  padding:0 4px;border:2px solid var(--cbm-bg);
}
.cbm-bell-count.on{display:flex;}

/* Toast */
.cbm-toast{
  position:fixed;bottom:90px;left:50%;transform:translateX(-50%) translateY(20px);
  background:rgba(10,10,20,.92);color:#fff;
  padding:11px 22px;border-radius:100px;
  font:600 13px/1 var(--cbm-font);
  z-index:9999;pointer-events:none;
  opacity:0;transition:opacity .25s,transform .25s;
  white-space:nowrap;
}
.cbm-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}

/* Safe-area padding */
@supports(padding:env(safe-area-inset-bottom)){
  .cbm-input-bar{padding-bottom:max(12px,env(safe-area-inset-bottom));}
  #cbm-inbox{padding-bottom:env(safe-area-inset-bottom);}
}
    `;
    document.head.appendChild(s);
  }

  /* ════════════════════════════════════════════════════════════════════════
     DOM BUILDERS
  ════════════════════════════════════════════════════════════════════════ */

  /* ── Floating host panel ─────────────────────────────────────────────── */
  function buildPanel() {
    if (document.getElementById('cbm-panel-wrap')) return;
    const w = document.createElement('div');
    w.id = 'cbm-panel-wrap';
    w.innerHTML = `
      <div id="cbm-panel" role="dialog" aria-label="Chat with host" aria-modal="true">
        <div class="cbm-head">
          <div class="cbm-head-ava" id="cbm-head-ava">💬</div>
          <div class="cbm-head-info">
            <div class="cbm-head-name" id="cbm-head-name">Chat with Host</div>
            <div class="cbm-head-sub" id="cbm-head-sub">Secure in-app messaging</div>
          </div>
          <div class="cbm-head-status" id="cbm-head-status">
            <span class="cbm-online-dot"></span> Secure
          </div>
          <button class="cbm-head-close" onclick="CabanaChat.close()" aria-label="Close chat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="cbm-notice">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Contact info sharing isn't allowed — keep all communication here for your safety.
        </div>
        <div id="cbm-panel-msgs" class="cbm-msgs"></div>
        <div class="cbm-input-bar">
          <textarea class="cbm-input" id="cbm-panel-input"
            placeholder="Type a message…" rows="1" aria-label="Message"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();CabanaChat._panelSend();}"
            oninput="CabanaChat._grow(this)"></textarea>
          <button class="cbm-send" id="cbm-panel-send" onclick="CabanaChat._panelSend()" aria-label="Send message" title="Send">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7z"/></svg>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(w);
  }

  /* ── Full inbox overlay ──────────────────────────────────────────────── */
  function buildInbox() {
    if (document.getElementById('cbm-inbox')) return;
    const el = document.createElement('div');
    el.id = 'cbm-inbox';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Messages');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML = `
      <!-- INBOX BAR -->
      <div class="cbm-ib-bar">
        <button class="cbm-ib-back" onclick="CabanaChat.closeInbox()" aria-label="Close messages">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div class="cbm-ib-titles">
          <div class="cbm-ib-title">Messages</div>
          <div class="cbm-ib-sub" id="cbm-ib-sub">Loading…</div>
        </div>
        <button class="cbm-ib-compose" onclick="CabanaChat._goToStays()" aria-label="New message" title="Browse stays to message a host">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>

      <!-- SEARCH -->
      <div class="cbm-search-wrap">
        <div class="cbm-search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input class="cbm-search-input" id="cbm-search" placeholder="Search conversations…" oninput="CabanaChat._filterConvs(this.value)" autocomplete="off"/>
        </div>
      </div>

      <!-- CONVERSATION LIST -->
      <div id="cbm-ib-list"></div>

      <!-- THREAD VIEW (slides over list) -->
      <div id="cbm-thread">
        <div class="cbm-thread-bar">
          <button class="cbm-thread-back" onclick="CabanaChat._threadBack()" aria-label="Back to inbox">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div class="cbm-thread-ava" id="cbm-thread-ava">🏠</div>
          <div class="cbm-thread-info">
            <div class="cbm-thread-name" id="cbm-thread-name">Conversation</div>
            <div class="cbm-thread-sub" id="cbm-thread-sub">Secure messaging</div>
          </div>
        </div>
        <div class="cbm-notice">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Contact info sharing isn't allowed — keep all communication here for your safety.
        </div>
        <div id="cbm-thread-msgs" class="cbm-msgs"></div>
        <div class="cbm-input-bar">
          <textarea class="cbm-input" id="cbm-thread-input"
            placeholder="Type a message…" rows="1" aria-label="Message"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();CabanaChat._threadSend();}"
            oninput="CabanaChat._grow(this)"></textarea>
          <button class="cbm-send" id="cbm-thread-send" onclick="CabanaChat._threadSend()" aria-label="Send message" title="Send">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7z"/></svg>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(el);
  }

  /* ── Toast ───────────────────────────────────────────────────────────── */
  let _toastTimer;
  function toast(msg) {
    let t = document.getElementById('cbm-toast');
    if (!t) { t = document.createElement('div'); t.id = 'cbm-toast'; t.className = 'cbm-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ════════════════════════════════════════════════════════════════════════
     MESSAGE RENDERING
  ════════════════════════════════════════════════════════════════════════ */
  function renderMsgs(msgs, el) {
    if (!el) return;
    if (!msgs.length) {
      el.innerHTML = `<div class="cbm-empty">
        <div class="cbm-empty-ico">👋</div>
        <div class="cbm-empty-ttl">Start the conversation</div>
        <div class="cbm-empty-sub">Ask about availability, check-in details, house rules — everything stays safely in-app.</div>
      </div>`;
      return;
    }

    let html = '';
    let lastDay = '';
    for (const m of msgs) {
      const day = new Date(m.created_at).toLocaleDateString('en-KE', { weekday: 'long', month: 'long', day: 'numeric' });
      if (day !== lastDay) {
        html += `<div class="cbm-divider">${day}</div>`;
        lastDay = day;
      }
      const isMe = m.sender_id === _userId;
      const cls = m.is_system ? 'sys' : isMe ? 'me' : 'them';
      const content = (m.content || '').replace(
        /\[(phone|email|link|website|WhatsApp|social|social handle|social media|direct contact|number) removed\]/gi,
        '<span class="cbm-scrub">⚠ $1 removed</span>'
      );
      const timeHtml = `<div class="cbm-time">${fmtMsg(m.created_at)}${m.was_scrubbed ? ' · <span style="color:#CC2233;font-size:9px;font-weight:700;">Contact info removed</span>' : ''}${isMe && !m.is_system ? `<span class="cbm-tick"><svg width="13" height="9" viewBox="0 0 16 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 5l4 4L15 1"/>${m.is_read ? '<path d="M6 5l4 4"/>' : ''}</svg></span>` : ''}</div>`;
      html += `<div class="cbm-msg ${cls}"><div class="cbm-bubble">${content}</div>${m.is_system ? '' : timeHtml}</div>`;
    }
    el.innerHTML = html;
    el.scrollTop = el.scrollHeight;
  }

  /* ════════════════════════════════════════════════════════════════════════
     DATA LAYER
  ════════════════════════════════════════════════════════════════════════ */
  async function loadMsgs(convId) {
    const s = sb();
    if (!s) return [];
    const { data } = await s.from('chat_messages')
      .select('*').eq('conversation_id', convId)
      .order('created_at', { ascending: true }).limit(MSG_LIMIT);
    return data || [];
  }

  async function getOrCreateConv({ listingId, listingType, listingTitle, hostId }) {
    const s = sb();
    if (!s) return null;
    const { data: existing } = await s.from('chat_conversations')
      .select('*').eq('listing_id', listingId).eq('guest_id', _userId).maybeSingle();
    if (existing) return existing;

    const { data: created, error } = await s.from('chat_conversations').insert({
      listing_id:    listingId,
      listing_type:  listingType,
      listing_title: listingTitle,
      host_id:       hostId,
      guest_id:      _userId,
    }).select().maybeSingle();

    if (error || !created) return null;

    // Auto-open message
    await s.from('chat_messages').insert({
      conversation_id: created.id,
      sender_id:       _userId,
      content:         `Hi! I'm interested in "${listingTitle}". Is it available and could you share more details?`,
      is_system:       false,
    });
    await s.from('chat_conversations').update({
      last_message:    `Hi! I'm interested in "${listingTitle}".`,
      last_message_at: new Date().toISOString(),
      last_sender_id:  _userId,
      host_unread:     1,
    }).eq('id', created.id);

    return created;
  }

  async function markRead(conv) {
    if (!conv || !_userId) return;
    const s = sb();
    if (!s) return;
    const field = _userId === conv.host_id ? 'host_unread' : 'guest_unread';
    await s.from('chat_conversations').update({ [field]: 0 }).eq('id', conv.id);
  }

  async function sendMessage(convId, text, sendBtnId, inputId, msgsElId) {
    const s = sb();
    if (!s || !convId || !text.trim()) return;

    const { text: clean, scrubbed } = scrub(text.trim());

    // Block all-contact messages
    const cleanContent = clean.replace(/\[.*? removed\]/g, '').trim();
    if (cleanContent.length < 2) {
      const el = document.getElementById(msgsElId);
      if (el) {
        el.insertAdjacentHTML('beforeend', '<div class="cbm-msg warn"><div class="cbm-bubble">⚠️ Your message contained only contact info. Sharing contact details is not permitted — please keep communication in-app.</div></div>');
        el.scrollTop = el.scrollHeight;
      }
      const inp = document.getElementById(inputId);
      if (inp) { inp.value = ''; inp.style.height = ''; }
      return;
    }

    const sendBtn = document.getElementById(sendBtnId);
    const inp     = document.getElementById(inputId);
    if (sendBtn) sendBtn.disabled = true;
    if (inp) { inp.value = ''; inp.style.height = ''; }

    try {
      await s.from('chat_messages').insert({
        conversation_id: convId,
        sender_id:       _userId,
        content:         clean,
        content_raw:     scrubbed ? text : null,
        was_scrubbed:    scrubbed,
      });
      const { data: conv } = await s.from('chat_conversations').select('host_id,host_unread,guest_unread').eq('id', convId).maybeSingle();
      if (conv) {
        const otherField = _userId === conv.host_id ? 'guest_unread' : 'host_unread';
        const preview    = clean.length > 60 ? clean.slice(0, 60) + '…' : clean;
        await s.from('chat_conversations').update({
          last_message:    preview,
          last_message_at: new Date().toISOString(),
          last_sender_id:  _userId,
          [otherField]:    (conv[otherField] || 0) + 1,
        }).eq('id', convId);
      }
      if (scrubbed) toast('Some contact info was removed from your message.');
    } catch (err) {
      toast('Message failed to send. Please try again.');
    } finally {
      if (sendBtn) sendBtn.disabled = false;
    }
  }

  /* ════════════════════════════════════════════════════════════════════════
     REALTIME SUBSCRIPTIONS
  ════════════════════════════════════════════════════════════════════════ */
  function subPanel(convId) {
    const s = sb();
    if (!s || _panelSub) return;
    _panelSub = s.channel('cbm-panel-' + convId)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `conversation_id=eq.${convId}`,
      }, async () => {
        const msgs = await loadMsgs(convId);
        renderMsgs(msgs, document.getElementById('cbm-panel-msgs'));
        await markRead(_activeConv);
      })
      .subscribe();
  }

  function subThread(convId) {
    const s = sb();
    if (!s) return;
    if (_inboxSub) { _inboxSub.unsubscribe(); _inboxSub = null; }
    _inboxSub = s.channel('cbm-thread-' + convId)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `conversation_id=eq.${convId}`,
      }, async () => {
        const msgs = await loadMsgs(convId);
        renderMsgs(msgs, document.getElementById('cbm-thread-msgs'));
        await markRead(_activeConv);
        updateBell();
      })
      .subscribe();
  }

  function subGlobal() {
    const s = sb();
    if (!s || _globalSub || !_userId) return;
    _globalSub = s.channel('cbm-global-' + _userId)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'chat_conversations',
        filter: `guest_id=eq.${_userId}`,
      }, () => { updateBell(); })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'chat_conversations',
        filter: `host_id=eq.${_userId}`,
      }, () => { updateBell(); })
      .subscribe();
  }

  function clearSub(subRef) {
    try { if (subRef) subRef.unsubscribe(); } catch(_) {}
    return null;
  }

  /* ════════════════════════════════════════════════════════════════════════
     BELL / UNREAD BADGE
     Works with:
       • apa-chrome.js bell:  .apa-ico[data-apa="notif"]  +  .apa-ico-dot
       • apartments.html: #tb-inbox-btn  +  #tb-inbox-badge
       • dashboard.html:  .apa-ico[data-apa="notif"]  +  .apa-ico-dot
  ════════════════════════════════════════════════════════════════════════ */
  async function getUnreadCount() {
    const s = sb();
    if (!s || !_userId) return 0;
    try {
      const { data } = await s.from('chat_conversations')
        .select('host_id,host_unread,guest_unread')
        .or(`host_id.eq.${_userId},guest_id.eq.${_userId}`);
      if (!data) return 0;
      return data.reduce((sum, c) => {
        const u = c.host_id === _userId ? (c.host_unread || 0) : (c.guest_unread || 0);
        return sum + u;
      }, 0);
    } catch (_) { return 0; }
  }

  function setBellCount(n) {
    // 1. apa-chrome bell dot (.apa-ico[data-apa="notif"] .apa-ico-dot)
    const chromeBells = document.querySelectorAll('.apa-ico[data-apa="notif"]');
    chromeBells.forEach(btn => {
      const dot = btn.querySelector('.apa-ico-dot');
      if (dot) dot.style.display = n > 0 ? 'block' : 'none';
      btn.setAttribute('data-unread', n > 0 ? '1' : '0');
    });

    // 2. apartments.html topbar inbox badge (#tb-inbox-badge)
    const tbBadge = document.getElementById('tb-inbox-badge');
    if (tbBadge) {
      if (n > 0) {
        tbBadge.textContent = n > 99 ? '99+' : n;
        tbBadge.style.display = 'flex';
      } else {
        tbBadge.style.display = 'none';
      }
    }

    // 3. Any element with id="cbm-bell-count"
    const countEl = document.getElementById('cbm-bell-count');
    if (countEl) {
      countEl.textContent = n > 99 ? '99+' : n;
      countEl.classList.toggle('on', n > 0);
    }
  }

  async function updateBell() {
    const n = await getUnreadCount();
    setBellCount(n);
    return n;
  }

  function initBell() {
    // Resolve user first, then start polling
    resolveUser().then(user => {
      if (!user) return;
      _userId = user.id;
      updateBell();
      subGlobal();
      clearInterval(_pollTimer);
      _pollTimer = setInterval(updateBell, POLL_INTERVAL_MS);
    });
  }

  /* ════════════════════════════════════════════════════════════════════════
     OPEN HOST CHAT (from listing card "Message the host")
  ════════════════════════════════════════════════════════════════════════ */
  async function open({ listingId, listingType, listingTitle, hostId }) {
    const user = await resolveUser();
    if (!user) { window.location.href = 'auth.html?next=' + encodeURIComponent(location.href); return; }
    if (user.id === hostId) { toast("You can't message your own listing."); return; }

    _userId = user.id;
    injectCSS();
    buildPanel();

    // Populate header
    const ico = TYPE_ICONS[listingType] || '💬';
    document.getElementById('cbm-head-ava').textContent = ico;
    document.getElementById('cbm-head-name').textContent = listingTitle || 'Chat with Host';
    document.getElementById('cbm-head-sub').textContent  = (listingType ? listingType.charAt(0).toUpperCase() + listingType.slice(1) : 'Listing') + ' · Secure messaging';

    // Show panel immediately with loading state
    const msgsEl = document.getElementById('cbm-panel-msgs');
    msgsEl.innerHTML = `<div class="cbm-empty"><div class="cbm-empty-ico">⏳</div><div class="cbm-empty-ttl">Loading…</div></div>`;
    document.getElementById('cbm-panel-wrap').classList.add('open');
    document.body.style.overflow = 'hidden';

    const s = sb();
    if (!s) { msgsEl.innerHTML = `<div class="cbm-empty"><div class="cbm-empty-ico">⚠️</div><div class="cbm-empty-ttl">Connection error</div><div class="cbm-empty-sub">Please refresh the page and try again.</div></div>`; return; }

    // Unsubscribe old sub
    _panelSub = clearSub(_panelSub);

    // Get or create conversation
    const conv = await getOrCreateConv({ listingId, listingType, listingTitle, hostId });
    if (!conv) {
      msgsEl.innerHTML = `<div class="cbm-empty"><div class="cbm-empty-ico">⚠️</div><div class="cbm-empty-ttl">Could not start conversation</div><div class="cbm-empty-sub">Please try again or contact support.</div></div>`;
      return;
    }

    _activeConv = conv;
    await markRead(conv);
    const msgs = await loadMsgs(conv.id);
    renderMsgs(msgs, msgsEl);
    subPanel(conv.id);
    updateBell();
  }

  /* ── Send from floating panel ─────────────────────────────────────────── */
  async function _panelSend() {
    const inp = document.getElementById('cbm-panel-input');
    const txt = inp?.value || '';
    if (!txt.trim() || !_activeConv) return;
    await sendMessage(_activeConv.id, txt, 'cbm-panel-send', 'cbm-panel-input', 'cbm-panel-msgs');
    const msgs = await loadMsgs(_activeConv.id);
    renderMsgs(msgs, document.getElementById('cbm-panel-msgs'));
  }

  /* ── Close floating panel ────────────────────────────────────────────── */
  function close() {
    const w = document.getElementById('cbm-panel-wrap');
    if (w) w.classList.remove('open');
    document.body.style.overflow = '';
    _panelSub = clearSub(_panelSub);
    _activeConv = null;
  }

  /* ════════════════════════════════════════════════════════════════════════
     FULL-SCREEN INBOX
  ════════════════════════════════════════════════════════════════════════ */
  let _allConvs  = [];   // cached for search filtering

  async function openInbox() {
    const user = await resolveUser();
    if (!user) { window.location.href = 'auth.html?next=' + encodeURIComponent(location.href); return; }
    _userId = user.id;

    injectCSS();
    buildInbox();

    const inbox = document.getElementById('cbm-inbox');
    const list  = document.getElementById('cbm-ib-list');
    const thread = document.getElementById('cbm-thread');

    // Reset to list view
    thread.classList.remove('open');
    _inboxView = 'list';
    inbox.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Loading skeleton
    list.innerHTML = skeletonHTML();
    document.getElementById('cbm-ib-sub').textContent = 'Loading…';

    // Clear search
    const si = document.getElementById('cbm-search');
    if (si) si.value = '';

    await loadConvList();
    subGlobal();
  }

  function skeletonHTML() {
    let h = '<div class="cbm-skeleton">';
    for (let i = 0; i < 5; i++) {
      h += `<div class="cbm-skel-row">
        <div class="cbm-skel-ava"></div>
        <div class="cbm-skel-body">
          <div class="cbm-skel-l" style="width:${55+Math.random()*30}%"></div>
          <div class="cbm-skel-s" style="width:${40+Math.random()*30}%"></div>
        </div>
      </div>`;
    }
    return h + '</div>';
  }

  async function loadConvList() {
    const s = sb();
    if (!s) return;
    const list = document.getElementById('cbm-ib-list');
    if (!list) return;

    const { data: convs } = await s.from('chat_conversations')
      .select('*')
      .or(`host_id.eq.${_userId},guest_id.eq.${_userId}`)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(200);

    _allConvs = convs || [];
    renderConvList(_allConvs);
  }

  function renderConvList(convs) {
    const list = document.getElementById('cbm-ib-list');
    if (!list) return;
    const sub  = document.getElementById('cbm-ib-sub');

    if (!convs.length) {
      list.innerHTML = `<div class="cbm-ib-empty">
        <div class="cbm-ib-empty-ico">📭</div>
        <div class="cbm-ib-empty-ttl">No messages yet</div>
        <div class="cbm-ib-empty-sub">When you enquire about a listing or a guest contacts you, conversations appear here.</div>
      </div>`;
      if (sub) sub.textContent = 'No conversations yet';
      return;
    }

    const unread = convs.filter(c => {
      const u = c.host_id === _userId ? (c.host_unread||0) : (c.guest_unread||0);
      return u > 0;
    });
    const read   = convs.filter(c => {
      const u = c.host_id === _userId ? (c.host_unread||0) : (c.guest_unread||0);
      return u === 0;
    });

    if (sub) {
      const total  = convs.length;
      const unreadC = unread.length;
      sub.textContent = unreadC > 0 ? `${unreadC} unread · ${total} total` : `${total} conversation${total !== 1 ? 's' : ''}`;
    }

    let html = '';
    if (unread.length) {
      html += `<div class="cbm-section-head">Unread</div>`;
      html += unread.map(c => convRow(c)).join('');
    }
    if (read.length) {
      if (unread.length) html += `<div class="cbm-section-head">All Messages</div>`;
      html += read.map(c => convRow(c)).join('');
    }
    list.innerHTML = html;
  }

  function convRow(c) {
    const isHost = c.host_id === _userId;
    const unread = isHost ? (c.host_unread || 0) : (c.guest_unread || 0);
    const ico    = TYPE_ICONS[c.listing_type] || '💬';
    const time   = c.last_message_at ? fmtList(c.last_message_at) : '';
    const preview = c.last_message || 'No messages yet';
    return `<div class="cbm-conv${unread > 0 ? ' unread' : ''}" onclick="CabanaChat._openThread('${c.id}')" role="button" tabindex="0">
      <div class="cbm-conv-ava">${ico}${unread > 0 ? `<div class="cbm-conv-badge">${unread > 99 ? '99+' : unread}</div>` : ''}</div>
      <div class="cbm-conv-body">
        <div class="cbm-conv-name">${esc(c.listing_title || 'Conversation')}</div>
        <div class="cbm-conv-prev">${esc(preview)}</div>
      </div>
      <div class="cbm-conv-meta">
        <div class="cbm-conv-time">${time}</div>
        ${unread > 0 ? `<div class="cbm-conv-unread-pill">${unread > 99 ? '99+' : unread}</div>` : ''}
      </div>
    </div>`;
  }

  function esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Search / filter ────────────────────────────────────────────────── */
  function _filterConvs(q) {
    if (!q.trim()) { renderConvList(_allConvs); return; }
    const lq = q.toLowerCase();
    const filtered = _allConvs.filter(c =>
      (c.listing_title || '').toLowerCase().includes(lq) ||
      (c.last_message  || '').toLowerCase().includes(lq)
    );
    renderConvList(filtered);
  }

  /* ── Open a thread ──────────────────────────────────────────────────── */
  async function _openThread(convId) {
    const s = sb();
    if (!s) return;
    const { data: conv } = await s.from('chat_conversations').select('*').eq('id', convId).maybeSingle();
    if (!conv) return;

    _activeConv = conv;
    const ico = TYPE_ICONS[conv.listing_type] || '💬';

    // Slide in thread view
    document.getElementById('cbm-thread-ava').textContent  = ico;
    document.getElementById('cbm-thread-name').textContent = conv.listing_title || 'Conversation';
    document.getElementById('cbm-thread-sub').textContent  =
      (conv.listing_type ? conv.listing_type.charAt(0).toUpperCase() + conv.listing_type.slice(1) : 'Listing') + ' · Secure messaging';

    const msgsEl = document.getElementById('cbm-thread-msgs');
    msgsEl.innerHTML = `<div class="cbm-empty"><div class="cbm-empty-ico">⏳</div><div class="cbm-empty-ttl">Loading…</div></div>`;

    const thread = document.getElementById('cbm-thread');
    thread.classList.add('open');
    _inboxView = 'thread';

    const msgs = await loadMsgs(convId);
    renderMsgs(msgs, msgsEl);

    await markRead(conv);
    subThread(convId);
    updateBell();
    // Refresh list in background
    loadConvList();
  }

  /* ── Send from thread ───────────────────────────────────────────────── */
  async function _threadSend() {
    const inp = document.getElementById('cbm-thread-input');
    const txt = inp?.value || '';
    if (!txt.trim() || !_activeConv) return;
    await sendMessage(_activeConv.id, txt, 'cbm-thread-send', 'cbm-thread-input', 'cbm-thread-msgs');
    const msgs = await loadMsgs(_activeConv.id);
    renderMsgs(msgs, document.getElementById('cbm-thread-msgs'));
  }

  /* ── Back to list ───────────────────────────────────────────────────── */
  function _threadBack() {
    _inboxSub = clearSub(_inboxSub);
    _activeConv = null;
    document.getElementById('cbm-thread').classList.remove('open');
    _inboxView = 'list';
    loadConvList(); // refresh unread counts
  }

  /* ── Navigate to stays (compose new) ───────────────────────────────── */
  function _goToStays() {
    closeInbox();
    window.location.href = 'apartments.html';
  }

  /* ── Close inbox ────────────────────────────────────────────────────── */
  function closeInbox() {
    const inbox = document.getElementById('cbm-inbox');
    if (inbox) inbox.classList.remove('open');
    document.body.style.overflow = '';
    _inboxSub = clearSub(_inboxSub);
    _activeConv = null;
    _inboxView = 'list';
  }

  /* ════════════════════════════════════════════════════════════════════════
     UTILITY
  ════════════════════════════════════════════════════════════════════════ */
  function _grow(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 110) + 'px';
  }

  /* ════════════════════════════════════════════════════════════════════════
     OVERRIDE APA-CHROME NOTIFICATIONS
     When apa-chrome.js calls openNotifications(), we intercept and open inbox.
     This wires the dashboard bell → Cabana Messenger.
  ════════════════════════════════════════════════════════════════════════ */
  function _hookChrome() {
    if (window.ApaChrome) {
      window.ApaChrome.openNotifications = openInbox;
      window.ApaChrome.openInbox         = openInbox;
    }
  }

  /* ════════════════════════════════════════════════════════════════════════
     BACKWARD COMPAT — keep old ApatmentoChat API alive
  ════════════════════════════════════════════════════════════════════════ */
  function _legacyCompat() {
    window.ApatmentoChat = {
      open:         open,
      openInbox:    openInbox,
      closeInbox:   closeInbox,
      close:        close,
      send:         _panelSend,
      _autosize:    _grow,
      _inboxSend:   _threadSend,
      _inboxOpenConv: _openThread,
      _inboxBackToList: _threadBack,
      _openConvById:  _openThread,
      initFAB:      initBell,
      scrubContactInfo: scrub,
    };
  }

  /* ════════════════════════════════════════════════════════════════════════
     INIT
  ════════════════════════════════════════════════════════════════════════ */
  function _init() {
    injectCSS();
    _legacyCompat();

    // Hook ApaChrome if already loaded, or watch for it
    _hookChrome();
    if (!window.ApaChrome) {
      const iv = setInterval(() => {
        if (window.ApaChrome) { _hookChrome(); clearInterval(iv); }
      }, 200);
    }

    // Start bell polling once session is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initBell);
    } else {
      // Slight delay to let ApaSession boot
      setTimeout(initBell, 600);
    }

    // Keyboard: Escape closes panel / inbox
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (_inboxView === 'thread') { _threadBack(); return; }
      if (document.getElementById('cbm-inbox')?.classList.contains('open')) { closeInbox(); return; }
      if (document.getElementById('cbm-panel-wrap')?.classList.contains('open')) { close(); return; }
    });
  }

  _init();

  /* ── Public API ──────────────────────────────────────────────────────── */
  return {
    open,
    openInbox,
    closeInbox,
    close,
    getUnreadCount,
    initBell,
    updateBell,
    scrub,
    _panelSend,
    _threadSend,
    _threadBack,
    _openThread,
    _filterConvs,
    _grow,
    _goToStays,
  };

})();

/* ────────────────────────────────────────────────────────────────────────────
   NAMED EXPORT for pages that call openInboxFromTopbar()  (apartments.html)
   and messageHost()  (apartments.html, dashboard.html)
   These are defined in the HTML files themselves and call CabanaChat.open /
   CabanaChat.openInbox — so no changes needed in the HTML.
   ────────────────────────────────────────────────────────────────────────── */
