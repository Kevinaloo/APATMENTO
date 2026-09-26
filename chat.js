/* ════════════════════════════════════════════════════════════════════════════
   CABANA MESSENGER v6 · chat.js
   ────────────────────────────────────────────────────────────────────────────
   One messenger for guests and hosts: a two-pane inbox on desktop, a stacked
   list → thread on phones, opened from a listing, a booking, the bell, or a
   push notification (?inbox=1&c=<conversation>).

   What the person sees                       Where the truth lives
   ─────────────────────────────────────────  ──────────────────────────────────
   Contact warning before they press send     cabana-chat-guard.js (same rules
                                              as the database copy)
   Withheld messages, private notices         cabana_private.chat_guard_row
   Special offers (host → guest)              cabana_chat_send_offer + the stay
                                              quote the booking trigger trusts
   "Suggest other stays" (can't host)         cabana_chat_suggest (pre-payment)
                                              /api/match-guest (after payment)
   Get help from Cabana / report              /api/support op chat.escalate
   Block, archive, read receipts, trip dates  cabana_chat_set_state / mark_read
                                              / set_trip
   Names, response time, booking context      cabana_chat_inbox / cabana_chat_thread

   Nothing here decides anything that matters. Every rule is re-checked in
   Postgres, so a person editing this file in their browser changes only
   what they see.
   ════════════════════════════════════════════════════════════════════════════ */

const CabanaChat = window.CabanaChat = (() => {
  'use strict';

  /* ── Constants ─────────────────────────────────────────────────────────── */
  const PAGE = 60;
  const POLL_MS = 30_000;
  const TYPING_MS = 4500;
  const REASONS = {
    help:         ['Ask Cabana to step in', 'A specialist reads the conversation and helps you both. The other person is told Cabana is helping.'],
    off_platform: ['They asked me to pay or talk outside Cabana', 'Only you are told. Payments outside Cabana are not protected.'],
    scam:         ['This looks like a scam or a fake listing', 'Only you are told. Our Trust team reviews it first.'],
    harassment:   ['Harassment or inappropriate messages', 'Only you are told. You can also block the conversation.'],
    safety:       ['I feel unsafe', 'Flagged as urgent. If you are in danger, call 999 or 112 first.'],
    payment:      ['A payment or refund problem', 'Our payments team picks it up with your booking details.'],
    listing:      ['The listing is not as described', 'We check the listing and help you decide what to do next.'],
  };
  const GUEST_CHIPS = ['Is it available for my dates?', 'Is there parking?', 'Can I check in early?', 'How reliable is the Wi-Fi?'];
  const HOST_STARTERS = [
    ['Available', 'Yes, it is available for your dates. You can book securely on Cabana and your check-in details unlock as soon as it is paid.'],
    ['Check-in', 'Check-in is from {checkin} and check-out is by {checkout}. Your code and directions appear in your booking once it is paid.'],
    ['Not available', 'Thank you for asking. Those dates are already taken, but I can suggest similar places nearby.'],
    ['Thank you', 'Thank you for booking with us. Let me know here if you need anything before you arrive.'],
  ];

  /* ── State ─────────────────────────────────────────────────────────────── */
  const S = {
    me: null, root: null, open: false,
    inbox: [], filter: 'all', query: '',
    active: null,          // { id, meta, msgs: Map, order: [], hasMore, loadingOlder }
    channel: null, globalChannel: null, typingAt: 0, typingTimer: null,
    readTimer: null, pollTimer: null, inboxTimer: null,
    lastFocus: null, prevOverflow: '', openSeq: 0,
  };

  const sb = () => window.ApaSession?.client?.() || window.sb || null;
  const mq = q => { try { return !!window.matchMedia?.(q).matches; } catch (_) { return false; } };
  const $ = (sel, el = S.root) => el?.querySelector(sel);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => 'KES ' + Math.round(Number(n) || 0).toLocaleString('en-KE');
  const uuid = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));
  const store = {
    get(k) { try { return localStorage.getItem('cbx:' + k); } catch (_) { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem('cbx:' + k) : localStorage.setItem('cbx:' + k, v); } catch (_) {} },
  };

  /* ── Guard (loaded once, used for pre-send warnings only) ─────────────── */
  function loadGuard() {
    if (window.CabanaChatGuard || document.getElementById('cbx-guard-js')) return;
    const s = document.createElement('script');
    s.id = 'cbx-guard-js'; s.src = '/cabana-chat-guard.js?v=7'; s.defer = true;
    document.head.appendChild(s);
  }

  /* ── Auth ──────────────────────────────────────────────────────────────── */
  async function resolveUser() {
    if (window.ApaSession) {
      return new Promise(res => ApaSession.ready(st => {
        if (st?.user) { window.CURRENT_USER = st.user; if (!window.sb && ApaSession.client) window.sb = ApaSession.client(); }
        res(st?.user || null);
      }));
    }
    try { const { data } = await sb().auth.getSession(); return data?.session?.user || null; } catch (_) { return null; }
  }
  async function token() {
    try { if (window.ApaSession?.token) return await ApaSession.token(); } catch (_) {}
    try { const { data } = await sb().auth.getSession(); return data?.session?.access_token || null; } catch (_) { return null; }
  }
  function friendly(e) {
    const m = String(e?.message || e || '');
    if (/row-level security|permission denied|42501/i.test(m)) return 'This conversation is closed.';
    if (/Failed to fetch|NetworkError|network/i.test(m)) return 'You seem to be offline. Try again in a moment.';
    return m.replace(/^rpc \w+: /, '').slice(0, 220) || 'Something went wrong. Please try again.';
  }
  async function rpc(name, args) {
    const { data, error } = await sb().rpc(name, args);
    if (error) throw new Error(error.message);
    return data;
  }

  /* ── Time ──────────────────────────────────────────────────────────────── */
  const DAY = 864e5;
  function clock(iso) { return new Date(iso).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }); }
  function dayLabel(iso) {
    const d = new Date(iso), now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Today';
    if (d.toDateString() === new Date(now - DAY).toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) });
  }
  function ago(iso) {
    if (!iso) return '';
    const m = Math.floor((Date.now() - new Date(iso)) / 6e4);
    if (m < 1) return 'now'; if (m < 60) return m + 'm'; if (m < 1440) return Math.floor(m / 60) + 'h';
    if (m < 10080) return new Date(iso).toLocaleDateString('en-KE', { weekday: 'short' });
    return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
  }
  function range(a, b) {
    if (!a || !b) return '';
    const o = { day: 'numeric', month: 'short' }, A = new Date(a + 'T00:00:00'), B = new Date(b + 'T00:00:00');
    return A.getMonth() === B.getMonth()
      ? A.getDate() + '–' + B.toLocaleDateString('en-KE', o)
      : A.toLocaleDateString('en-KE', o) + ' – ' + B.toLocaleDateString('en-KE', o);
  }
  const nights = (a, b) => Math.max(0, Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / DAY));
  const todayISO = () => new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10); // Nairobi
  function responseLabel(r) {
    if (!r || !r.samples || r.samples < 3 || r.median_minutes == null) return '';
    const m = Number(r.median_minutes);
    return m <= 60 ? 'Usually replies within an hour' : m <= 240 ? 'Usually replies within a few hours' : m <= 1440 ? 'Usually replies within a day' : '';
  }
  const initial = n => esc(String(n || '?').trim().charAt(0).toUpperCase() || '?');

  /* ── Icons ─────────────────────────────────────────────────────────────── */
  const I = (p, s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const IC = {
    back: I('<path d="M15 18l-6-6 6-6"/>'), close: I('<path d="M18 6 6 18M6 6l12 12"/>'),
    send: I('<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/>'), plus: I('<path d="M12 5v14M5 12h14"/>', 20),
    more: I('<circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/>'),
    info: I('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'),
    shield: I('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>', 14), lock: I('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>', 14),
    tag: I('<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.5"/>'),
    home: I('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
    help: I('<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>'),
    cal: I('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
    bolt: I('<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>'), search: I('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', 16),
    check: I('<path d="M20 6 9 17l-5-5"/>', 14), checks: I('<path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/>', 14),
    star: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>',
    verified: '<svg width="14" height="14" viewBox="0 0 24 24" aria-label="Verified" role="img"><path fill="#17C6B0" d="m12 1 2.6 2.2 3.4-.4.9 3.3 3 1.7-1.3 3.2 1.3 3.2-3 1.7-.9 3.3-3.4-.4L12 23l-2.6-2.2-3.4.4-.9-3.3-3-1.7L3.4 13 2.1 9.8l3-1.7.9-3.3 3.4.4z"/><path d="m8 12 3 3 5-6" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    archive: I('<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/>'),
    block: I('<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>'), flag: I('<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>'),
    user: I('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'), reply: I('<path d="M9 17 4 12l5-5"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>'),
  };

  /* ════════════════════════════════════════════════════════════════════════
     STYLES
  ════════════════════════════════════════════════════════════════════════ */
  function injectCSS() {
    if (document.getElementById('cbx-css')) return;
    const s = document.createElement('style');
    s.id = 'cbx-css';
    s.textContent = `
#cbx{--ink:#0A0A14;--ink2:#3A3C55;--ink3:#7D809D;--bg:#F6F7FB;--card:#fff;--line:rgba(10,10,20,.08);--pri:#4361FF;--pri2:#7B2FF7;--grad:linear-gradient(135deg,#3D5BFF,#7B2FF7);--mint:#0FA897;--amber:#B26A00;--red:#C0122A;--f:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
  position:fixed;inset:0;z-index:9000;display:none;font:400 14px/1.5 var(--f);color:var(--ink);-webkit-font-smoothing:antialiased}
#cbx.open{display:block}
#cbx *{box-sizing:border-box}
#cbx button{font:inherit;color:inherit;cursor:pointer}
#cbx svg{flex-shrink:0}
#cbx .scrim{position:absolute;inset:0;background:rgba(10,10,20,.42);backdrop-filter:blur(3px);animation:cbxFade .2s ease}
#cbx .shell{position:absolute;inset:0;display:flex;background:var(--bg);overflow:hidden;animation:cbxIn .32s cubic-bezier(.22,1,.36,1)}
@media(min-width:900px){#cbx .shell{inset:24px;max-width:1240px;margin:0 auto;border-radius:24px;box-shadow:0 40px 100px rgba(10,10,20,.28)}}
@keyframes cbxIn{from{opacity:0;transform:translateY(18px) scale(.985)}to{opacity:1;transform:none}}
@keyframes cbxFade{from{opacity:0}to{opacity:1}}
/* list */
#cbx .list{width:100%;display:flex;flex-direction:column;background:var(--card);min-width:0}
@media(min-width:900px){#cbx .list{width:360px;flex-shrink:0;border-right:1px solid var(--line)}}
#cbx .l-top{display:flex;align-items:center;gap:10px;padding:16px 16px 10px}
#cbx .l-title{flex:1;font:800 22px/1.1 var(--f);letter-spacing:-.03em}
#cbx .ib{width:40px;height:40px;border-radius:12px;border:1px solid var(--line);background:#fff;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s,border-color .15s}
#cbx .ib:hover{background:#F2F3F9;border-color:rgba(67,97,255,.25)}
#cbx .ib:focus-visible,#cbx .chip:focus-visible,#cbx .row:focus-visible,#cbx .btn:focus-visible{outline:2px solid var(--pri);outline-offset:2px}
#cbx .search{margin:0 16px 10px;display:flex;align-items:center;gap:8px;background:#F2F3F8;border-radius:12px;padding:0 12px;border:1px solid transparent}
#cbx .search:focus-within{background:#fff;border-color:rgba(67,97,255,.3)}
#cbx .search input{flex:1;border:0;background:none;outline:0;font:400 14px var(--f);padding:10px 0;color:var(--ink)}
#cbx .tabs{display:flex;gap:6px;padding:0 16px 12px;overflow-x:auto;scrollbar-width:none;border-bottom:1px solid var(--line)}
#cbx .tabs::-webkit-scrollbar{display:none}
#cbx .chip{border:1px solid var(--line);background:#fff;border-radius:999px;padding:7px 13px;font:600 12.5px/1 var(--f);white-space:nowrap;color:var(--ink2)}
#cbx .chip[aria-pressed="true"]{background:var(--ink);border-color:var(--ink);color:#fff}
#cbx .chip .n{margin-left:6px;opacity:.7}
#cbx .rows{flex:1;overflow-y:auto;overscroll-behavior:contain}
#cbx .row{display:flex;gap:12px;align-items:center;padding:12px 16px;border:0;background:none;width:100%;text-align:left;border-bottom:1px solid rgba(10,10,20,.04)}
#cbx .row:hover{background:#F7F8FC}
#cbx .row[aria-current="true"]{background:#EEF1FF}
#cbx .ava{position:relative;width:52px;height:52px;flex-shrink:0}
#cbx .ava img,#cbx .ava .ph{width:52px;height:52px;border-radius:16px;object-fit:cover;background:linear-gradient(135deg,#C4B0FA,#7B2FF7);display:flex;align-items:center;justify-content:center;color:#fff;font:700 18px var(--f)}
#cbx .ava .who{position:absolute;right:-4px;bottom:-4px;width:24px;height:24px;border-radius:50%;background:var(--grad);border:2px solid #fff;color:#fff;font:700 10px/20px var(--f);text-align:center;overflow:hidden}#cbx .ava .who .cpa{width:20px!important;height:20px!important}#cbx .t-ava{overflow:hidden;padding:0}#cbx .t-ava>span{display:flex;width:100%;height:100%;align-items:center;justify-content:center}
#cbx .r-body{flex:1;min-width:0}
#cbx .r-top{display:flex;align-items:baseline;gap:8px}
#cbx .r-name{flex:1;min-width:0;font:700 14.5px/1.3 var(--f);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:4px}
#cbx .r-time{font:500 11.5px var(--f);color:var(--ink3);flex-shrink:0}
#cbx .r-sub{font:500 12px/1.3 var(--f);color:var(--ink3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cbx .r-prev{display:flex;align-items:center;gap:6px;margin-top:2px}
#cbx .r-prev .pv{flex:1;min-width:0;font:400 13px/1.35 var(--f);color:var(--ink3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cbx .row.unread .r-prev .pv{color:var(--ink);font-weight:600}
#cbx .badge{min-width:20px;height:20px;border-radius:10px;background:var(--pri);color:#fff;font:800 10.5px/20px var(--f);text-align:center;padding:0 6px}
#cbx .tagpill{font:700 10px/1 var(--f);letter-spacing:.02em;padding:4px 7px;border-radius:6px;background:#EEF1FF;color:var(--pri);flex-shrink:0}
#cbx .tagpill.ok{background:#E3F8F4;color:var(--mint)}#cbx .tagpill.warn{background:#FFF2DB;color:var(--amber)}
#cbx .empty{padding:48px 28px;text-align:center;color:var(--ink3)}
#cbx .empty b{display:block;color:var(--ink);font:700 17px/1.3 var(--f);margin:12px 0 6px}
#cbx .skel{height:76px;margin:0 16px;border-bottom:1px solid var(--line);background:linear-gradient(90deg,#F2F3F8 0,#FAFBFD 40%,#F2F3F8 80%);background-size:200% 100%;animation:cbxShim 1.3s infinite}
@keyframes cbxShim{to{background-position:-200% 0}}
/* thread */
#cbx .thread{flex:1;min-width:0;display:none;flex-direction:column;background:var(--bg);position:relative}
#cbx.has-thread .thread{display:flex}
@media(max-width:899px){#cbx.has-thread .list{display:none}}
@media(min-width:900px){#cbx .thread{display:flex}}
#cbx .t-top{display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,.94);backdrop-filter:blur(18px);border-bottom:1px solid var(--line);min-height:64px}
@media(min-width:900px){#cbx .t-back{display:none}}
#cbx .t-ava{width:40px;height:40px;border-radius:50%;background:var(--grad);color:#fff;display:flex;align-items:center;justify-content:center;font:700 15px var(--f);flex-shrink:0;border:0}
#cbx .t-who{flex:1;min-width:0}
#cbx .t-name{font:700 15px/1.2 var(--f);display:flex;align-items:center;gap:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cbx .t-sub{font:500 12px/1.3 var(--f);color:var(--ink3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
#cbx .t-sub .typing{color:var(--pri)}
/* context */
#cbx .ctx{display:flex;gap:12px;align-items:center;margin:10px 12px 0;padding:10px;background:#fff;border:1px solid var(--line);border-radius:16px}
#cbx .ctx img,#cbx .ctx .ph{width:56px;height:56px;border-radius:12px;object-fit:cover;background:#E9E6F8;flex-shrink:0}
#cbx .ctx-b{flex:1;min-width:0}
#cbx .ctx-t{font:700 13.5px/1.3 var(--f);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cbx .ctx-s{font:500 12px/1.4 var(--f);color:var(--ink3);display:flex;flex-wrap:wrap;gap:4px 10px;margin-top:3px}
#cbx .ctx-s b{color:var(--ink2);font-weight:600}
#cbx .ctx-s button{border:0;background:none;padding:0;margin-left:8px;color:var(--pri);font:600 12px var(--f)}
#cbx .btn{border:0;border-radius:12px;padding:10px 16px;font:700 13.5px/1 var(--f);background:var(--grad);color:#fff;white-space:nowrap;box-shadow:0 6px 18px rgba(67,97,255,.28);transition:transform .15s,opacity .15s}
#cbx .btn:hover{transform:translateY(-1px)}
#cbx .btn:disabled{opacity:.45;transform:none;cursor:not-allowed;box-shadow:none}
#cbx .btn.ghost{background:#fff;color:var(--ink);border:1px solid var(--line);box-shadow:none}
#cbx .btn.soft{background:#EEF1FF;color:var(--pri);box-shadow:none}
#cbx .btn.danger{background:#FFECEF;color:var(--red);box-shadow:none}
#cbx .btn.sm{padding:8px 12px;font-size:12.5px;border-radius:10px}
#cbx .safety{display:flex;align-items:center;gap:8px;margin:8px 12px 0;padding:8px 12px;border-radius:12px;background:rgba(67,97,255,.06);color:#3448C5;font:500 12px/1.4 var(--f)}
#cbx .safety button{margin-left:auto;border:0;background:none;color:#3448C5;opacity:.7;padding:2px}
/* messages */
#cbx .msgs{flex:1;overflow-y:auto;overscroll-behavior:contain;padding:12px 14px 8px;display:flex;flex-direction:column}
#cbx .older{align-self:center;margin:4px 0 10px}
#cbx .day{align-self:center;margin:14px 0 8px;font:700 10.5px/1 var(--f);letter-spacing:.06em;text-transform:uppercase;color:var(--ink3);background:rgba(255,255,255,.8);padding:6px 10px;border-radius:999px}
#cbx .newline{display:flex;align-items:center;gap:10px;margin:10px 0;color:var(--pri);font:700 11px var(--f);letter-spacing:.04em;text-transform:uppercase}
#cbx .newline:before,#cbx .newline:after{content:"";flex:1;height:1px;background:rgba(67,97,255,.3)}
#cbx .m{display:flex;flex-direction:column;max-width:min(78%,520px);margin-top:2px}
#cbx .m.me{align-self:flex-end;align-items:flex-end}
#cbx .m.them{align-self:flex-start;align-items:flex-start}
#cbx .m.gap{margin-top:12px}
#cbx .b{padding:9px 13px;border-radius:18px;font:400 14.5px/1.5 var(--f);white-space:pre-wrap;word-break:break-word;letter-spacing:-.005em}
#cbx .me .b{background:var(--grad);color:#fff;border-bottom-right-radius:6px}
#cbx .them .b{background:#fff;color:var(--ink);border-bottom-left-radius:6px;box-shadow:0 1px 2px rgba(10,10,20,.06)}
#cbx .m.pending .b{opacity:.65}
#cbx .m.failed .b{background:#FFECEF;color:var(--red)}
#cbx .meta{font:500 11px var(--f);color:var(--ink3);margin:3px 4px 0;display:flex;gap:5px;align-items:center}
#cbx .meta .seen{color:var(--mint);display:inline-flex}
#cbx .meta button{border:0;background:none;color:var(--red);font:700 11px var(--f);padding:0}
#cbx .withheld .b{background:#F1F2F6!important;color:var(--ink3)!important;font-style:italic;display:flex;gap:6px;align-items:flex-start;box-shadow:none}
#cbx .sys{align-self:center;max-width:88%;text-align:center;margin:10px 0;font:500 12.5px/1.5 var(--f);color:var(--ink3)}
#cbx .note{align-self:center;max-width:92%;margin:10px 0;padding:10px 14px;border-radius:14px;font:500 12.5px/1.5 var(--f);display:flex;gap:8px;background:#FFF6E5;color:#7A4B00;border:1px solid #FBE3B5}
#cbx .note.serious{background:#FFECEF;color:var(--red);border-color:#F9C9D1}
#cbx .note.case{background:#EEF1FF;color:#2F3FAE;border-color:#D7DDFF}
#cbx .staff{align-self:flex-start;max-width:min(84%,540px);margin:10px 0;display:flex;gap:8px}
#cbx .staff .cab{width:30px;height:30px;border-radius:50%;background:#0A0A14;color:#fff;font:800 12px/30px var(--f);text-align:center;flex-shrink:0}
#cbx .staff .b{background:#0A0A14;color:#fff;border-radius:6px 18px 18px 18px}
#cbx .staff small{display:block;font:700 11px var(--f);color:var(--ink3);margin:0 0 3px}
#cbx .booked{align-self:center;margin:12px 0;padding:10px 14px;border-radius:14px;background:#E3F8F4;color:#08766A;font:600 13px/1.4 var(--f);display:flex;gap:8px;align-items:center}
#cbx .booked.cancel{background:#F1F2F6;color:var(--ink2)}
#cbx .booked a{color:inherit;font-weight:800}
/* cards */
#cbx .card{width:min(340px,100%);background:#fff;border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 6px 24px rgba(10,10,20,.06)}
#cbx .card .hd{display:flex;align-items:center;gap:8px;padding:10px 14px;font:800 11px/1 var(--f);letter-spacing:.06em;text-transform:uppercase;color:var(--pri);background:#F4F6FF}
#cbx .card .hd .st{margin-left:auto}
#cbx .card .img{height:120px;background:#E9E6F8 center/cover}
#cbx .card .bd{padding:12px 14px 14px}
#cbx .card .ttl{font:700 14px/1.3 var(--f)}
#cbx .price{display:flex;align-items:baseline;gap:8px;margin:8px 0 2px}
#cbx .price b{font:800 22px/1 var(--f);letter-spacing:-.02em}
#cbx .price s{color:var(--ink3);font-size:13px}
#cbx .kv{display:flex;justify-content:space-between;font:500 12.5px/1.8 var(--f);color:var(--ink2)}
#cbx .kv.tot{border-top:1px solid var(--line);margin-top:6px;padding-top:6px;font-weight:800;color:var(--ink)}
#cbx .card .quote{margin:10px 0 0;padding:9px 11px;border-radius:10px;background:#F7F8FC;font:400 13px/1.5 var(--f);color:var(--ink2)}
#cbx .card .acts{display:flex;gap:8px;margin-top:12px}
#cbx .card .acts .btn{flex:1}
#cbx .card .exp{font:600 11.5px var(--f);color:var(--amber);margin-top:8px}
#cbx .picks{display:flex;gap:10px;overflow-x:auto;padding:2px 14px 14px;scrollbar-width:none}
#cbx .pick{flex:0 0 190px;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:#fff}
#cbx .pick .img{height:96px}
#cbx .pick .bd{padding:9px 10px 10px}
#cbx .pick .ttl{font:700 12.5px/1.3 var(--f);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cbx .pick .s{font:500 11.5px/1.5 var(--f);color:var(--ink3)}
#cbx .pick .acts{display:flex;gap:6px;margin-top:8px}
#cbx .pick .acts .btn{flex:1;padding:7px 8px;font-size:11.5px}
/* typing + composer */
#cbx .typing-row{padding:0 18px 4px;height:18px;font:600 11.5px var(--f);color:var(--pri)}
#cbx .dots{display:inline-flex;gap:3px;margin-right:6px;vertical-align:middle}
#cbx .dots i{width:5px;height:5px;border-radius:50%;background:currentColor;animation:cbxDot 1.2s infinite}
#cbx .dots i:nth-child(2){animation-delay:.15s}#cbx .dots i:nth-child(3){animation-delay:.3s}
@keyframes cbxDot{0%,60%,100%{opacity:.25;transform:none}30%{opacity:1;transform:translateY(-2px)}}
#cbx .chips{display:flex;gap:6px;padding:0 12px 8px;overflow-x:auto;scrollbar-width:none}
#cbx .chips::-webkit-scrollbar{display:none}
#cbx .chips .chip{background:#fff;color:var(--pri);border-color:rgba(67,97,255,.25)}
#cbx .warn{margin:0 12px 8px;padding:10px 12px;border-radius:12px;background:#FFF6E5;border:1px solid #FBE3B5;color:#7A4B00;font:500 12.5px/1.45 var(--f);display:flex;gap:8px}
#cbx .warn.bad{background:#FFECEF;border-color:#F9C9D1;color:var(--red)}
#cbx .bar{display:flex;align-items:flex-end;gap:8px;padding:10px 12px;background:#fff;border-top:1px solid var(--line);padding-bottom:max(10px,env(safe-area-inset-bottom))}
#cbx .bar textarea{flex:1;resize:none;border:1px solid var(--line);background:#F5F6FA;border-radius:20px;padding:10px 15px;font:400 15px/1.45 var(--f);max-height:140px;min-height:44px;outline:0;color:var(--ink)}
#cbx .bar textarea:focus{background:#fff;border-color:rgba(67,97,255,.45)}
#cbx .bar .ib{border-radius:50%;width:44px;height:44px}
#cbx .sendb{width:44px;height:44px;border-radius:50%;border:0;background:var(--grad);color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 6px 16px rgba(67,97,255,.35)}
#cbx .sendb:disabled{opacity:.35;box-shadow:none;cursor:not-allowed}
#cbx .closed{padding:14px 16px;background:#fff;border-top:1px solid var(--line);text-align:center;font:500 13px/1.5 var(--f);color:var(--ink3)}
#cbx .closed button{border:0;background:none;color:var(--pri);font-weight:700}
#cbx .jump{position:absolute;right:18px;bottom:96px;width:40px;height:40px;border-radius:50%;border:1px solid var(--line);background:#fff;box-shadow:0 8px 20px rgba(10,10,20,.12);display:none;align-items:center;justify-content:center;transform:rotate(-90deg)}
#cbx .jump.on{display:flex}
#cbx .blank{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:var(--ink3);padding:40px}
#cbx .blank b{color:var(--ink);font:700 18px var(--f);margin:14px 0 6px}
/* sheets */
#cbx .sheet-wrap{position:absolute;inset:0;z-index:5;display:flex;align-items:flex-end;justify-content:center;background:rgba(10,10,20,.35);animation:cbxFade .15s}
@media(min-width:900px){#cbx .sheet-wrap{align-items:center}}
#cbx .sheet{width:100%;max-width:520px;max-height:92%;overflow-y:auto;background:#fff;border-radius:24px 24px 0 0;padding:8px 20px max(20px,env(safe-area-inset-bottom));animation:cbxIn .28s cubic-bezier(.22,1,.36,1)}
@media(min-width:900px){#cbx .sheet{border-radius:24px;padding-bottom:22px}}
#cbx .grab{width:40px;height:4px;border-radius:2px;background:#DADCE6;margin:4px auto 12px}
#cbx .sh-h{display:flex;align-items:center;gap:10px;margin-bottom:6px}
#cbx .sh-h h3{flex:1;margin:0;font:800 19px/1.25 var(--f);letter-spacing:-.02em}
#cbx .sh-p{margin:0 0 14px;font:400 13px/1.55 var(--f);color:var(--ink3)}
#cbx .fld{display:block;margin:0 0 12px}
#cbx .fld>span{display:block;font:700 12px/1 var(--f);color:var(--ink2);margin-bottom:6px}
#cbx .fld input,#cbx .fld textarea,#cbx .fld select{width:100%;border:1px solid var(--line);background:#F7F8FC;border-radius:12px;padding:11px 12px;font:500 15px var(--f);color:var(--ink);outline:0}
#cbx .fld input:focus,#cbx .fld textarea:focus{border-color:rgba(67,97,255,.5);background:#fff}
#cbx .grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
#cbx .seg{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
#cbx .menu{display:flex;flex-direction:column;gap:4px}
#cbx .mi{display:flex;gap:12px;align-items:center;padding:12px;border-radius:14px;border:0;background:none;text-align:left;width:100%}
#cbx .mi:hover{background:#F4F6FB}
#cbx .mi .ic{width:38px;height:38px;border-radius:12px;background:#EEF1FF;color:var(--pri);display:flex;align-items:center;justify-content:center;flex-shrink:0}
#cbx .mi b{display:block;font:700 14px/1.3 var(--f)}
#cbx .mi small{display:block;font:400 12.5px/1.4 var(--f);color:var(--ink3)}
#cbx .mi.danger .ic{background:#FFECEF;color:var(--red)}
#cbx .opt{display:flex;gap:10px;padding:12px;border:1px solid var(--line);border-radius:14px;margin-bottom:8px;cursor:pointer;align-items:flex-start}
#cbx .opt:has(input:checked){border-color:var(--pri);background:#F4F6FF}
#cbx .opt input{margin-top:3px;accent-color:var(--pri)}
#cbx .opt b{display:block;font:700 13.5px/1.35 var(--f)}
#cbx .opt small{display:block;font:400 12px/1.45 var(--f);color:var(--ink3);margin-top:2px}
#cbx .sum{background:#F7F8FC;border-radius:14px;padding:12px 14px;margin:4px 0 14px}
#cbx .err{color:var(--red);font:600 12.5px/1.45 var(--f);margin:-4px 0 12px;min-height:1px}
#cbx .cand{display:flex;gap:10px;align-items:center;padding:10px;border:1px solid var(--line);border-radius:14px;margin-bottom:8px;cursor:pointer}
#cbx .cand:has(input:checked){border-color:var(--pri);background:#F4F6FF}
#cbx .cand img,#cbx .cand .ph{width:54px;height:54px;border-radius:10px;object-fit:cover;background:#E9E6F8;flex-shrink:0}
#cbx .cand .b2{flex:1;min-width:0}
#cbx .cand .t{font:700 13px/1.3 var(--f);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cbx .cand .s{font:500 11.5px/1.5 var(--f);color:var(--ink3)}
#cbx .sticky-go{position:sticky;bottom:-22px;background:#fff;padding:10px 0 22px;margin-bottom:-22px;display:flex;gap:8px;box-shadow:0 -10px 16px -12px rgba(10,10,20,.18)}
#cbx .sticky-go .btn{flex:1;padding:13px}
#cbx .saved{display:flex;gap:8px;align-items:flex-start;padding:10px 12px;border:1px solid var(--line);border-radius:12px;margin-bottom:8px}
#cbx .saved button.use{flex:1;border:0;background:none;text-align:left;padding:0}
#cbx .saved b{display:block;font:700 13px var(--f)}
#cbx .saved span{display:block;font:400 12.5px/1.45 var(--f);color:var(--ink3);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
#cbx .toast{position:absolute;left:50%;bottom:90px;transform:translateX(-50%);z-index:9;background:rgba(10,10,20,.92);color:#fff;padding:11px 18px;border-radius:999px;font:600 13px var(--f);max-width:calc(100% - 32px);text-align:center;animation:cbxIn .2s}
#cbx .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@media(prefers-reduced-motion:reduce){#cbx *{animation:none!important;transition:none!important}}
/* Notification toast (used by the notifications engine below) */
.cbm-toast{position:fixed;bottom:84px;left:50%;transform:translateX(-50%) translateY(16px);background:rgba(10,10,20,.92);backdrop-filter:blur(10px);color:#fff;padding:11px 20px;border-radius:16px;font:600 13px/1.4 Inter,system-ui,sans-serif;z-index:9999;opacity:0;transition:opacity .22s,transform .22s;pointer-events:none;cursor:pointer}
.cbm-toast.show{opacity:1;transform:translateX(-50%) translateY(0);pointer-events:auto}
/* Page chrome: topbar badge + partner nav */
#tb-inbox-badge{position:absolute;top:-4px;right:-4px;min-width:17px;height:17px;border-radius:9px;background:#FF4D6D;color:#fff;font:800 9px/1 Inter,system-ui;display:none;align-items:center;justify-content:center;border:2px solid #FCFCFD;padding:0 3px}
#tb-inbox-badge.on{display:flex}
.cbx-nav-badge{margin-left:auto;min-width:18px;height:18px;border-radius:9px;background:#4361FF;color:#fff;font:800 10px/18px Inter,system-ui;text-align:center;padding:0 5px;display:none}
.cbx-nav-badge.on{display:inline-block}
.mn-item .cbx-nav-badge{position:absolute;top:2px;right:calc(50% - 20px);margin:0}
`;
    document.head.appendChild(s);
  }

  /* ════════════════════════════════════════════════════════════════════════
     SHELL
  ════════════════════════════════════════════════════════════════════════ */
  function build() {
    if (S.root) return;
    injectCSS(); loadGuard();
    const el = document.createElement('div');
    el.id = 'cbx';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Messages');
    el.innerHTML = `
      <div class="scrim" data-act="close"></div>
      <div class="shell">
        <aside class="list" aria-label="Conversations">
          <div class="l-top">
            <div class="l-title">Messages</div>
            <button class="ib" data-act="close" aria-label="Close messages">${IC.close}</button>
          </div>
          <label class="search">${IC.search}<input id="cbx-q" type="search" placeholder="Search people, stays, messages" autocomplete="off" aria-label="Search conversations"></label>
          <div class="tabs" role="toolbar" aria-label="Filter conversations" id="cbx-tabs"></div>
          <div class="rows" id="cbx-rows"></div>
        </aside>
        <section class="thread" id="cbx-thread" aria-label="Conversation">
          <div class="blank">${IC.home}<b>Your conversations</b>Pick a conversation to read it here.</div>
        </section>
      </div>
      <div class="sr" aria-live="polite" id="cbx-live"></div>`;
    document.body.appendChild(el);
    S.root = el;

    el.addEventListener('click', onClick);
    el.addEventListener('keydown', onKey);
    $('#cbx-q').addEventListener('input', e => { S.query = e.target.value.trim().toLowerCase(); renderList(); });
  }

  function show() {
    build();
    if (!S.open) {
      S.lastFocus = document.activeElement;
      S.prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      S.root.classList.add('open');
      S.open = true;
    }
  }

  function close() {
    if (!S.open) return;
    ++S.openSeq;
    closeSheet();
    leaveThread();
    S.root.classList.remove('open', 'has-thread');
    S.open = false;
    document.body.style.overflow = S.prevOverflow;
    try { S.lastFocus?.focus?.(); } catch (_) {}
    clearInterval(S.inboxTimer);
    try {
      const u = new URL(location.href);
      if (u.searchParams.has('inbox') || u.searchParams.has('c')) { u.searchParams.delete('inbox'); u.searchParams.delete('c'); history.replaceState(null, '', u.pathname + u.search + u.hash); }
    } catch (_) {}
  }

  function toast(msg, ms = 3200) {
    if (!S.root) { build(); }
    const t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    (S.open ? S.root : document.body).appendChild(t);
    if (!S.open) Object.assign(t.style, { position: 'fixed', zIndex: 99999, font: '600 13px Inter,system-ui', background: 'rgba(10,10,20,.92)', color: '#fff', padding: '11px 18px', borderRadius: '999px', left: '50%', bottom: '90px', transform: 'translateX(-50%)' });
    setTimeout(() => t.remove(), ms);
  }
  const announce = msg => { const l = $('#cbx-live'); if (l) l.textContent = msg; };

  /* ════════════════════════════════════════════════════════════════════════
     INBOX
  ════════════════════════════════════════════════════════════════════════ */
  async function ensureUser() {
    const u = await resolveUser();
    if (!u) { location.href = 'auth.html?next=' + encodeURIComponent(location.pathname + location.search + location.hash); return null; }
    S.me = u.id;
    return u;
  }

  async function openInbox() {
    if (!(await ensureUser())) return;
    show();
    if (!S.inbox.length) $('#cbx-rows').innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div><div class="skel"></div>';
    await loadInbox();
    subGlobal();
    clearInterval(S.inboxTimer);
    S.inboxTimer = setInterval(() => { if (!document.hidden) loadInbox(); }, POLL_MS);
    if (!S.active && mq('(min-width:900px)')) {
      const first = S.inbox.find(c => !c.archived);
      if (first) openConversation(first.id, { keepList: true });
    } else if (!S.active) $('#cbx-q')?.focus({ preventScroll: true });
  }

  async function loadInbox() {
    try {
      S.inbox = (await rpc('cabana_chat_inbox', { p_limit: 200 })) || [];
      renderList();
      setBell(S.inbox.reduce((n, c) => n + (c.archived ? 0 : (c.unread || 0)), 0));
    } catch (e) {
      if (!S.inbox.length) $('#cbx-rows').innerHTML = `<div class="empty">Messages could not load.<br><button class="btn sm soft" data-act="reload" style="margin-top:12px">Try again</button></div>`;
    }
  }

  function renderList() {
    const rows = $('#cbx-rows'); if (!rows) return;
    const hosting = S.inbox.some(c => c.role === 'host'), travelling = S.inbox.some(c => c.role === 'guest');
    const tabs = [['all', 'All'], ['unread', 'Unread', S.inbox.filter(c => c.unread && !c.archived).length]];
    if (hosting && travelling) tabs.push(['host', 'Hosting'], ['guest', 'Travelling']);
    if (S.inbox.some(c => c.archived)) tabs.push(['archived', 'Archived']);
    if (!tabs.some(t => t[0] === S.filter)) S.filter = 'all';
    $('#cbx-tabs').innerHTML = tabs.map(([k, l, n]) => `<button class="chip" data-act="filter" data-k="${k}" aria-pressed="${S.filter === k}">${l}${n ? `<span class="n">${n}</span>` : ''}</button>`).join('');

    let list = S.inbox.filter(c => S.filter === 'archived' ? c.archived : !c.archived);
    if (S.filter === 'unread') list = list.filter(c => c.unread);
    if (S.filter === 'host' || S.filter === 'guest') list = list.filter(c => c.role === S.filter);
    if (S.query) list = list.filter(c => [c.counterpart?.name, c.listing_title, c.last_message].join(' ').toLowerCase().includes(S.query));

    if (!list.length) {
      rows.innerHTML = S.inbox.length
        ? `<div class="empty">${IC.search}<b>Nothing here</b>${S.query ? 'No conversations match your search.' : 'You are all caught up.'}</div>`
        : `<div class="empty">${IC.home}<b>No messages yet</b>When you ask a host about a stay, or a guest asks about yours, the conversation appears here.<br><br><a class="btn sm" href="apartments.html" style="text-decoration:none;display:inline-block">Find a stay</a></div>`;
      return;
    }
    rows.innerHTML = list.map(c => {
      const who = c.counterpart?.name || (c.role === 'host' ? 'Guest' : 'Host');
      let tag = '';
      if (c.blocked) tag = '<span class="tagpill warn">Closed</span>';
      else if (c.booked) tag = '<span class="tagpill ok">Booked</span>';
      else if (c.offer === 'sent') tag = '<span class="tagpill">Offer</span>';
      else if (c.role === 'host' && c.checkin) tag = `<span class="tagpill">${esc(range(c.checkin, c.checkout))}</span>`;
      const prev = (c.last_from_me ? 'You: ' : '') + (c.last_message || 'Say hello');
      return `<button class="row${c.unread ? ' unread' : ''}" data-act="open" data-id="${esc(c.id)}" aria-current="${S.active?.id === c.id}">
        <span class="ava">${c.photo ? `<img src="${esc(c.photo)}" alt="" loading="lazy" onerror="this.outerHTML='<span class=ph>🏠</span>'">` : '<span class="ph">🏠</span>'}<span class="who"${c.counterpart?.id ? ` data-cp-avatar="${esc(c.counterpart.id)}" data-cp-size="24"` : ''}>${initial(who)}</span></span>
        <span class="r-body">
          <span class="r-top"><span class="r-name">${esc(who)}${c.counterpart?.id ? `<span data-cp-tick="${esc(c.counterpart.id)}" data-cp-size="14"></span>` : (c.counterpart?.verified ? IC.verified : '')}</span><span class="r-time">${esc(ago(c.last_message_at))}</span></span>
          <span class="r-sub">${c.role === 'host' ? 'Guest · ' : ''}${esc(c.listing_title || 'Stay')}</span>
          <span class="r-prev"><span class="pv">${esc(prev)}</span>${tag}${c.unread ? `<span class="badge">${c.unread > 99 ? '99+' : c.unread}</span>` : ''}</span>
        </span>
      </button>`;
    }).join('');
  }

  /* ════════════════════════════════════════════════════════════════════════
     THREAD
  ════════════════════════════════════════════════════════════════════════ */
  async function open(opts = {}) {
    const { listingId, checkin, checkout, guests } = opts;
    if (!listingId) return openInbox();
    if (!(await ensureUser())) return;
    if (opts.hostId && opts.hostId === S.me) { toast('This is your own listing.'); return; }
    show();
    const seq = ++S.openSeq;
    threadLoading(opts.listingTitle);
    try {
      const conv = await rpc('cabana_chat_start', { p_listing: listingId, p_checkin: checkin || null, p_checkout: checkout || null, p_guests: guests || null });
      if (seq !== S.openSeq) return;
      loadInbox();
      await openConversation(conv.id);
      // A suggested first message (e.g. a viewing request); never sent automatically.
      if (opts.draft && seq === S.openSeq) { const ta = $('#cbx-ta'); if (ta && !ta.value) { ta.value = String(opts.draft).slice(0, 600); ta.dispatchEvent(new Event('input', { bubbles: true })); ta.focus(); } }
    } catch (e) {
      if (seq !== S.openSeq) return;
      threadError(friendly(e));
    }
  }

  async function openForBooking(bookingId) {
    if (!(await ensureUser())) return;
    show(); threadLoading();
    try { const id = await rpc('cabana_chat_for_booking', { p_booking: bookingId }); loadInbox(); await openConversation(id); }
    catch (e) { threadError(friendly(e)); }
  }

  function threadLoading(title) {
    S.root.classList.add('has-thread');
    $('#cbx-thread').innerHTML = `<div class="t-top"><button class="ib t-back" data-act="back" aria-label="Back to conversations">${IC.back}</button><div class="t-who"><div class="t-name">${esc(title || 'Opening conversation…')}</div><div class="t-sub">Loading…</div></div></div><div class="blank"><div class="skel" style="width:60%;height:14px;border-radius:7px"></div></div>`;
  }
  function threadError(msg) {
    $('#cbx-thread').innerHTML = `<div class="t-top"><button class="ib t-back" data-act="back" aria-label="Back">${IC.back}</button><div class="t-who"><div class="t-name">Conversation</div></div><button class="ib" data-act="close" aria-label="Close">${IC.close}</button></div><div class="blank">${IC.info}<b>Could not open this conversation</b>${esc(msg)}</div>`;
  }

  async function openConversation(id, { keepList } = {}) {
    if (!id) return;
    if (!S.me && !(await ensureUser())) return;
    show();
    if (!keepList && !S.inbox.length) loadInbox().then(subGlobal);
    const seq = ++S.openSeq;
    leaveThread();
    S.root.classList.add('has-thread');
    S.active = { id, meta: null, msgs: new Map(), order: [], hasMore: false, unreadFrom: null };
    renderList();
    threadLoading(S.inbox.find(c => c.id === id)?.counterpart?.name);
    try {
      const [meta, rows] = await Promise.all([rpc('cabana_chat_thread', { p_conversation: id }), fetchMsgs(id)]);
      if (seq !== S.openSeq) return;
      S.active.meta = meta;
      const c = S.inbox.find(x => x.id === id);
      const firstUnread = c?.unread ? rows.filter(m => m.sender_id !== S.me).slice(-c.unread)[0] : null;
      S.active.unreadFrom = firstUnread?.id || null;
      rows.forEach(addMsg);
      S.active.hasMore = rows.length >= PAGE;
      renderThread();
      subThread(id);
      markRead();
      clearInterval(S.pollTimer);
      S.pollTimer = setInterval(() => { if (!document.hidden) catchUp(); }, POLL_MS);
      try { const u = new URL(location.href); u.searchParams.set('inbox', '1'); u.searchParams.set('c', id); history.replaceState(null, '', u); } catch (_) {}
    } catch (e) {
      if (seq === S.openSeq) threadError(friendly(e));
    }
  }

  function leaveThread() {
    clearInterval(S.pollTimer); clearTimeout(S.readTimer); clearTimeout(S.typingTimer);
    if (S.channel) { try { sb()?.removeChannel(S.channel); } catch (_) {} S.channel = null; }
    saveDraft();
    S.active = null;
  }

  async function fetchMsgs(id, before) {
    let q = sb().from('chat_messages')
      .select('id,conversation_id,sender_id,content,kind,payload,visible_to,is_system,read_at,created_at,client_id')
      .eq('conversation_id', id).order('created_at', { ascending: false }).limit(PAGE);
    if (before) q = q.lt('created_at', before);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).reverse();
  }

  function addMsg(m) {
    const a = S.active; if (!a) return false;
    // A realtime echo of our own optimistic message replaces it in place.
    if (m.client_id) {
      for (const [k, v] of a.msgs) if (v.client_id === m.client_id && k !== m.id) { a.msgs.delete(k); a.order = a.order.filter(x => x !== k); }
    }
    const had = a.msgs.has(m.id);
    a.msgs.set(m.id, { ...(a.msgs.get(m.id) || {}), ...m });
    if (!had) {
      a.order.push(m.id);
      a.order.sort((x, y) => new Date(a.msgs.get(x).created_at) - new Date(a.msgs.get(y).created_at));
    }
    return !had;
  }

  async function catchUp() {
    const a = S.active; if (!a) return;
    try {
      const rows = await fetchMsgs(a.id);
      let fresh = false;
      rows.forEach(m => { fresh = addMsg(m) || fresh; });
      if (fresh) { renderMessages(true); markRead(); }
    } catch (_) {}
  }

  async function loadOlder() {
    const a = S.active; if (!a || a.loadingOlder || !a.hasMore) return;
    a.loadingOlder = true;
    const box = $('#cbx-msgs'); const h = box.scrollHeight;
    try {
      const oldest = a.msgs.get(a.order[0])?.created_at;
      const rows = await fetchMsgs(a.id, oldest);
      rows.forEach(addMsg);
      a.hasMore = rows.length >= PAGE;
      renderMessages(false);
      box.scrollTop = box.scrollHeight - h;
    } catch (_) { toast('Could not load earlier messages.'); }
    a.loadingOlder = false;
  }

  async function refreshMeta() {
    const a = S.active; if (!a) return;
    try { a.meta = await rpc('cabana_chat_thread', { p_conversation: a.id }); renderHeader(); renderContext(); renderComposer(); renderMessages(false); } catch (_) {}
  }

  /* ── Rendering ─────────────────────────────────────────────────────────── */
  function renderThread() {
    const a = S.active; if (!a?.meta) return;
    const draft = store.get('draft:' + a.id) || '';
    $('#cbx-thread').innerHTML = `
      <div class="t-top" id="cbx-head"></div>
      <div id="cbx-ctx"></div>
      <div id="cbx-safety"></div>
      <div class="msgs" id="cbx-msgs" role="log" aria-label="Messages" tabindex="0"></div>
      <button class="jump" id="cbx-jump" data-act="jump" aria-label="Jump to latest">${IC.back}</button>
      <div class="typing-row" id="cbx-typing" aria-live="polite"></div>
      <div id="cbx-foot"></div>`;
    renderHeader(); renderContext(); renderSafety(); renderMessages(true); renderComposer(draft);
    $('#cbx-msgs').addEventListener('scroll', onScroll, { passive: true });
  }

  function renderHeader() {
    const { meta } = S.active, cp = meta.counterpart || {}, l = meta.listing || {};
    const host = meta.role === 'host';
    const sub = host
      ? `Guest · ${esc(l.title || '')}${cp.stays ? ` · ${cp.stays} stay${cp.stays > 1 ? 's' : ''} on Cabana` : ''}`
      : `Host · ${esc(responseLabel(meta.response) || l.title || '')}`;
    $('#cbx-head').innerHTML = `
      <button class="ib t-back" data-act="back" aria-label="Back to conversations">${IC.back}</button>
      <button class="t-ava" data-cabana-person="${esc(cp.id)}" aria-label="View ${esc(cp.name)}'s profile"><span data-cp-avatar="${esc(cp.id)}" data-cp-size="40">${initial(cp.name)}</span></button>
      <div class="t-who"><div class="t-name">${esc(cp.name || 'Member')}${cp.id ? `<span data-cp-tick="${esc(cp.id)}" data-cp-size="15"></span>` : (cp.verified ? IC.verified : '')}</div><div class="t-sub" id="cbx-sub">${sub}</div></div>
      <button class="ib" data-act="details" aria-label="Details">${IC.info}</button>
      <button class="ib" data-act="menu" aria-label="More options">${IC.more}</button>
      <button class="ib" data-act="close" aria-label="Close messages">${IC.close}</button>`;
  }

  function liveOffer() {
    const offers = S.active?.meta?.offers || [];
    return offers.filter(o => o.status === 'sent').slice(-1)[0] || null;
  }

  function renderContext() {
    const { meta } = S.active, c = meta.conversation, l = meta.listing, b = meta.booking, host = meta.role === 'host';
    if (!l) { $('#cbx-ctx').innerHTML = ''; return; }
    const trip = c.checkin ? `${range(c.checkin, c.checkout)} · ${c.guests || 1} guest${(c.guests || 1) > 1 ? 's' : ''}` : '';
    let status = '', cta = '';
    if (b?.paid) status = `<b style="color:var(--mint)">✓ Booked</b>${b.checkin ? ' · ' + esc(range(b.checkin, b.checkout)) : ''}`;
    else if (b) status = '<b style="color:var(--amber)">Awaiting payment</b>';
    else if (trip) status = `<b>${esc(trip)}</b>`;
    if (!host) {
      if (!trip && !b) status += `<button data-act="trip">Add your dates</button>`;
      else if (!b) status += `<button data-act="trip">Change</button>`;
      if (!b?.paid && l.live) {
        const off = liveOffer();
        cta = `<button class="btn sm" data-act="book">${off ? 'Book with offer' : 'Book'}</button>`;
      }
    } else if (!b?.paid && l.live && !meta.blocked) {
      cta = `<button class="btn sm soft" data-act="offer">${IC.tag}&nbsp;Offer</button>`;
    }
    $('#cbx-ctx').innerHTML = `<div class="ctx">
      ${l.photo ? `<img src="${esc(l.photo)}" alt="" loading="lazy">` : '<span class="ph"></span>'}
      <div class="ctx-b"><div class="ctx-t">${esc(l.title)}</div>
        <div class="ctx-s"><span>${l.price ? `<b>${money(l.price)}</b>/night` : ''}${l.rating ? ` · ${IC.star} ${Number(l.rating).toFixed(1)}` : ''}${l.area ? ' · ' + esc(l.area) : ''}</span><span>${status}</span></div>
      </div>${cta}</div>`;
  }

  function renderSafety() {
    const key = 'safety:' + S.active.id, box = $('#cbx-safety');
    if (store.get(key) || S.active.meta.contact_allowed) { box.innerHTML = ''; return; }
    box.innerHTML = `<div class="safety">${IC.shield}<span>Pay and chat only on Cabana. It is what keeps your money and your stay protected.</span><button data-act="safety-ok" aria-label="Dismiss">${IC.close}</button></div>`;
  }

  function renderMessages(stick) {
    const a = S.active, box = $('#cbx-msgs'); if (!a || !box) return;
    const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 140;
    const host = a.meta.role === 'host', cpName = a.meta.counterpart?.name || '';
    let html = a.hasMore ? '<button class="btn sm ghost older" data-act="older">Load earlier messages</button>' : '';
    let lastDay = '', prevSender = null, prevTime = 0;
    const msgs = a.order.map(id => a.msgs.get(id));
    const lastMine = [...msgs].reverse().find(m => m.sender_id === S.me && ['text', 'offer', 'suggestion'].includes(m.kind || 'text'));

    if (!msgs.length) {
      html += `<div class="blank" style="padding:28px 16px">${IC.reply}<b>${host ? 'Say hello' : 'Start the conversation'}</b>${host
        ? 'A quick, warm reply is the biggest reason guests book.'
        : `Ask ${esc(cpName.split(' ')[0] || 'the host')} anything about the stay. Everything stays safely on Cabana.`}</div>`;
    }
    for (const m of msgs) {
      const day = dayLabel(m.created_at);
      if (day !== lastDay) { html += `<div class="day">${esc(day)}</div>`; lastDay = day; prevSender = null; }
      if (a.unreadFrom === m.id) html += '<div class="newline">New</div>';
      const kind = m.kind || (m.is_system ? 'system' : 'text');
      const mine = m.sender_id === S.me;
      const t = new Date(m.created_at).getTime();
      const gap = prevSender !== m.sender_id || t - prevTime > 5 * 6e4;
      prevSender = ['text', 'withheld', 'offer', 'suggestion'].includes(kind) ? m.sender_id : null; prevTime = t;

      if (kind === 'system' && m.payload?.by === 'cabana') {
        html += `<div class="staff"><span class="cab">C</span><div><small>Cabana Support</small><div class="b">${esc(m.content)}</div><div class="meta">${clock(m.created_at)}</div></div></div>`;
      } else if (kind === 'system') {
        html += `<div class="sys">${esc(m.content)}</div>`;
      } else if (kind === 'notice') {
        // Every block names the way forward. A host told only "no" tries again
        // somewhere we cannot see; a host shown "send a private offer" closes
        // the deal here.
        const act = m.payload?.action;
        const cta = act === 'offer' ? `<button class="btn sm soft" data-act="offer" style="margin-top:8px">${IC.tag}&nbsp;Send a private offer</button>`
                  : act === 'book'  ? `<button class="btn sm" data-act="book" style="margin-top:8px">Book on Cabana</button>` : '';
        html += `<div class="note${m.payload?.tone === 'serious' ? ' serious' : ''}">${IC.shield}<span>${esc(m.content)}${cta}</span></div>`;
      } else if (kind === 'case') {
        html += `<div class="note case">${IC.flag}<span>${esc(m.content)} <em style="opacity:.7">Only you can see this.</em></span></div>`;
      } else if (kind === 'booking') {
        const cancel = m.payload?.event === 'cancelled';
        const link = host ? 'partner-bookings.html' : 'my-bookings.html';
        html += `<div class="booked${cancel ? ' cancel' : ''}">${cancel ? IC.close : IC.check}<span>${esc(m.content)}</span>${cancel ? '' : `<a href="${link}">View</a>`}</div>`;
      } else if (kind === 'offer') {
        html += `<div class="m ${mine ? 'me' : 'them'} gap">${offerCard(m, mine)}<div class="meta">${clock(m.created_at)}</div></div>`;
      } else if (kind === 'suggestion') {
        html += `<div class="m ${mine ? 'me' : 'them'} gap">${suggestionCard(m, mine)}<div class="meta">${clock(m.created_at)}</div></div>`;
      } else {
        const withheld = kind === 'withheld';
        const state = m._state === 'sending' ? ' pending' : m._state === 'failed' ? ' failed' : '';
        let meta = '';
        if (m._state === 'failed') meta = `<div class="meta">Not sent · <button data-act="retry" data-id="${esc(m.id)}">Retry</button></div>`;
        else if (m._state === 'sending') meta = '<div class="meta">Sending…</div>';
        else if (lastMine && m.id === lastMine.id) meta = `<div class="meta">${clock(m.created_at)} · ${m.read_at ? `<span class="seen">${IC.checks}</span> Seen` : `${IC.check} Sent`}</div>`;
        html += `<div class="m ${mine ? 'me' : 'them'}${gap ? ' gap' : ''}${withheld ? ' withheld' : ''}${state}" title="${esc(new Date(m.created_at).toLocaleString('en-KE'))}">
          <div class="b">${withheld ? IC.lock + '<span>' + esc(mine ? 'Not delivered. It looked like it contained contact or payment details.' : 'Message withheld. It looked like it contained contact or payment details.') + '</span>' : esc(m.content)}</div>${meta}</div>`;
      }
    }
    box.innerHTML = html;
    if (stick || atBottom) box.scrollTop = box.scrollHeight;
    if (a.unreadFrom && stick) { const nl = box.querySelector('.newline'); if (nl) box.scrollTop = nl.offsetTop - 60; }
  }

  function offerStatus(id) { return (S.active.meta.offers || []).find(o => o.id === id)?.status || 'sent'; }

  function offerCard(m, mine) {
    const p = m.payload || {}, st = offerStatus(p.offer_id);
    const host = S.active.meta.role === 'host';
    const labels = { sent: 'Live', accepted: 'Booked', declined: 'Declined', withdrawn: 'Withdrawn', expired: 'Expired', superseded: 'Replaced' };
    const saving = (p.list_nightly - p.nightly) * p.nights;
    const hrs = Math.max(0, Math.round((new Date(p.expires_at) - Date.now()) / 36e5));
    let acts = '';
    if (st === 'sent') {
      acts = host
        ? `<div class="acts"><button class="btn sm ghost" data-act="offer-withdraw" data-id="${esc(p.offer_id)}">Withdraw</button></div>`
        : `<div class="acts"><button class="btn sm ghost" data-act="offer-decline" data-id="${esc(p.offer_id)}">Decline</button><button class="btn sm" data-act="offer-book" data-in="${esc(p.checkin)}" data-out="${esc(p.checkout)}" data-g="${esc(p.guests)}">Book now</button></div>`;
    }
    return `<div class="card" style="text-align:left">
      <div class="hd">${IC.tag} Special offer<span class="st">${labels[st] || st}</span></div>
      <div class="bd">
        <div class="ttl">${esc(p.title || 'This stay')}</div>
        <div class="price"><b>${money(p.nightly)}</b><span>/ night</span>${p.list_nightly > p.nightly ? `<s>${money(p.list_nightly)}</s>` : ''}</div>
        <div class="kv"><span>${esc(range(p.checkin, p.checkout))} · ${p.nights} night${p.nights > 1 ? 's' : ''}</span><span>${p.guests} guest${p.guests > 1 ? 's' : ''}</span></div>
        <div class="kv"><span>Stay</span><span>${money(p.stay_total)}</span></div>
        <div class="kv"><span>Cabana fee</span><span>${money(p.service_fee)}</span></div>
        <div class="kv tot"><span>Total</span><span>${money(p.grand_total)}</span></div>
        ${saving > 0 && st === 'sent' ? `<div class="kv" style="color:var(--mint);font-weight:700"><span>${host ? 'Guest saves' : 'You save'}</span><span>${money(saving)}</span></div>` : ''}
        ${p.note ? `<div class="quote">“${esc(p.note)}”</div>` : ''}
        ${st === 'sent' ? `<div class="exp">Expires in ${hrs < 1 ? 'under an hour' : hrs + ' hour' + (hrs > 1 ? 's' : '')}</div>` : ''}
        ${acts}
      </div></div>`;
  }

  function suggestionCard(m, mine) {
    const p = m.payload || {}, list = p.listings || [];
    const qs = p.checkin ? `&checkin=${p.checkin}&checkout=${p.checkout}&guests=${p.guests || 1}` : '';
    return `<div class="card" style="text-align:left;width:min(420px,100%)">
      <div class="hd">${IC.home} ${mine ? 'You suggested' : 'Suggested for you'}</div>
      <div class="bd" style="padding-bottom:8px"><div style="font:500 13.5px/1.5 var(--f)">${esc(m.content)}</div>${p.note ? `<div class="quote">“${esc(p.note)}”</div>` : ''}</div>
      <div class="picks">${list.map(x => `<div class="pick">
        <div class="img" style="background-image:url('${esc(String(x.photo || '').replace(/'/g, '%27'))}')"></div>
        <div class="bd"><div class="ttl">${esc(x.title)}</div>
          <div class="s">${x.price ? money(x.price) + '/night' : ''}${x.rating ? ' · ★ ' + Number(x.rating).toFixed(1) : ''}</div>
          <div class="s">${esc(x.area || x.city || '')}${x.available === true ? ' · <b style="color:var(--mint)">Free on your dates</b>' : x.available === false ? ' · Dates taken' : ''}</div>
          <div class="acts"><a class="btn sm ghost" style="text-decoration:none;text-align:center" href="apartments.html?open=${esc(x.id)}${qs}">View</a>${mine ? '' : `<button class="btn sm soft" data-act="ask-host" data-id="${esc(x.id)}">Message</button>`}</div>
        </div></div>`).join('')}</div></div>`;
  }

  function composerChips() {
    const a = S.active, host = a.meta.role === 'host';
    const msgs = a.order.map(id => a.msgs.get(id)).filter(m => ['text', 'offer', 'suggestion'].includes(m.kind || 'text'));
    const last = msgs[msgs.length - 1];
    if (!host && msgs.filter(m => m.sender_id === S.me).length === 0) return GUEST_CHIPS.map(t => ['text', t]);
    if (host && last && last.sender_id !== S.me && !a.meta.booking?.paid) {
      const chips = [['text', 'Yes, it is available ✓']];
      if (a.meta.listing?.live) chips.push(['act:offer', 'Send an offer']);
      chips.push(['act:suggest', 'Suggest another stay'], ['act:saved', 'Saved replies']);
      return chips;
    }
    return [];
  }

  function renderComposer(draft) {
    const a = S.active, foot = $('#cbx-foot'); if (!a || !foot) return;
    if (a.meta.blocked) {
      foot.innerHTML = `<div class="closed">${IC.lock} ${a.meta.blocked_by_me ? 'You blocked this conversation. <button data-act="unblock">Unblock</button>' : 'This conversation is closed.'}</div>`;
      return;
    }
    const hadFocus = document.activeElement?.id === 'cbx-ta';
    const keep = draft ?? $('#cbx-ta')?.value ?? '';
    const chips = keep ? [] : composerChips();
    foot.innerHTML = `
      ${chips.length ? `<div class="chips">${chips.map(([k, t]) => `<button class="chip" data-act="chip" data-k="${esc(k)}" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}
      <div id="cbx-warn"></div>
      <div class="bar">
        <button class="ib" data-act="actions" aria-label="More actions">${IC.plus}</button>
        <textarea id="cbx-ta" rows="1" maxlength="2000" placeholder="Write a message…" aria-label="Message">${esc(keep)}</textarea>
        <button class="sendb" id="cbx-send" data-act="send" aria-label="Send" ${keep.trim() ? '' : 'disabled'}>${IC.send}</button>
      </div>`;
    const ta = $('#cbx-ta');
    grow(ta);
    ta.addEventListener('input', onType);
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && mq('(pointer:fine)')) { e.preventDefault(); send(); }
    });
    if (keep) checkDraft();
    if (hadFocus) ta.focus({ preventScroll: true });
  }

  function grow(ta) { if (!ta) return; ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'; }

  /* ── Pre-send guard ────────────────────────────────────────────────────── */
  /* Words naming this stay, so the browser warns about the same redirect the
     database would withhold. Being warned about one thing and blocked for
     another is worse than either. */
  function anchorsFor(a) {
    const G = window.CabanaChatGuard, l = a?.meta?.listing || {}, c = a?.meta?.conversation || {};
    if (!G || !G.anchorTokens) return [];
    return G.anchorTokens([l.title || c.listing_title, l.area, l.city, a?.meta?.counterpart?.name]);
  }

  function guardCheck(text) {
    const G = window.CabanaChatGuard, a = S.active;
    if (!G || !a) return null;
    const allowed = !!a.meta.contact_allowed;
    const r = G.check(text, { contactAllowed: allowed, anchors: anchorsFor(a) });
    if (!r.ok) return r.reason;
    const since = Date.now() - 30 * 6e4;
    const recent = a.order.map(id => a.msgs.get(id))
      .filter(m => m.sender_id === S.me && (m.kind || 'text') === 'text' && !m._state && new Date(m.created_at) > since)
      .slice(-6).map(m => m.content);
    if (G.spansMessages(recent, text, { contactAllowed: allowed })) return 'Together with your last messages this spells out a phone number, which can’t be shared until the booking is paid.';
    return null;
  }
  let _checkT;
  function checkDraft() {
    clearTimeout(_checkT);
    _checkT = setTimeout(() => {
      const ta = $('#cbx-ta'), w = $('#cbx-warn'); if (!ta || !w) return;
      const why = ta.value.trim() ? guardCheck(ta.value) : null;
      w.innerHTML = why ? `<div class="warn bad" role="alert">${IC.shield}<span><b>This won’t be delivered.</b> ${esc(why)} Once a booking is paid, you can share a number for arrival.</span></div>` : '';
      $('#cbx-send').disabled = !ta.value.trim() || !!why;
    }, 180);
  }

  function onType(e) {
    grow(e.target);
    $('#cbx-send').disabled = !e.target.value.trim();
    checkDraft();
    if (e.target.value && Date.now() - S.typingAt > 2500 && S.channel) {
      S.typingAt = Date.now();
      try { S.channel.send({ type: 'broadcast', event: 'typing', payload: { u: S.me } }); } catch (_) {}
    }
    if (!e.target.value) { const chips = $('#cbx-foot .chips'); if (!chips) renderComposer(''); }
  }

  function saveDraft() {
    const a = S.active, ta = S.root && $('#cbx-ta');
    if (a && ta) store.set('draft:' + a.id, ta.value.trim() ? ta.value : null);
  }

  /* ── Sending ───────────────────────────────────────────────────────────── */
  async function send(textOverride) {
    const a = S.active; if (!a) return;
    const ta = $('#cbx-ta');
    const text = String(textOverride ?? ta?.value ?? '').trim();
    if (!text) return;
    const why = guardCheck(text);
    if (why) { checkDraft(); ta?.focus(); return; }
    const cid = uuid();
    const temp = { id: 'tmp-' + cid, client_id: cid, conversation_id: a.id, sender_id: S.me, content: text, kind: 'text', created_at: new Date().toISOString(), _state: 'sending' };
    addMsg(temp);
    if (ta && textOverride == null) { ta.value = ''; grow(ta); store.set('draft:' + a.id, null); }
    a.unreadFrom = null;
    renderMessages(true); renderComposer('');
    $('#cbx-ta')?.focus();
    await deliver(temp);
  }

  async function deliver(temp) {
    const a = S.active; if (!a) return;
    try {
      const { data, error } = await sb().from('chat_messages')
        .insert({ conversation_id: temp.conversation_id, sender_id: S.me, content: temp.content, client_id: temp.client_id })
        .select('id,conversation_id,sender_id,content,kind,payload,visible_to,is_system,read_at,created_at,client_id').single();
      if (error && error.code !== '23505') throw error;
      if (S.active !== a) return;
      a.msgs.delete(temp.id); a.order = a.order.filter(x => x !== temp.id);
      if (data) addMsg(data); else await catchUp();
      if (data?.kind === 'withheld') catchUp();
      renderMessages(true);
      loadInbox();
    } catch (e) {
      if (S.active !== a) return;
      const m = a.msgs.get(temp.id); if (m) m._state = 'failed';
      renderMessages(true);
      toast(friendly(e));
    }
  }

  /* ── Read receipts ─────────────────────────────────────────────────────── */
  function markRead() {
    clearTimeout(S.readTimer);
    S.readTimer = setTimeout(async () => {
      const a = S.active; if (!a || document.hidden) return;
      try { await rpc('cabana_chat_mark_read', { p_conversation: a.id }); } catch (_) {}
      const c = S.inbox.find(x => x.id === a.id); if (c && c.unread) { c.unread = 0; renderList(); }
      setBell(S.inbox.reduce((n, x) => n + (x.archived ? 0 : (x.unread || 0)), 0));
    }, 600);
  }

  /* ── Realtime ──────────────────────────────────────────────────────────── */
  function subThread(id) {
    const client = sb(); if (!client) return;
    S.channel = client.channel('cbx:' + id, { config: { broadcast: { self: false } } })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${id}` }, ({ new: m }) => {
        if (S.active?.id !== id) return;
        if (addMsg(m)) {
          if (m.sender_id !== S.me) { showTyping(false); announce('New message'); markRead(); }
          renderMessages(m.sender_id === S.me);
          if (['offer', 'booking', 'system', 'suggestion'].includes(m.kind)) refreshMeta();
          else if (!$('#cbx-ta')?.value) renderComposer('');
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${id}` }, ({ new: m }) => {
        if (S.active?.id !== id || !S.active.msgs.has(m.id)) return;
        addMsg(m); renderMessages(false);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_conversations', filter: `id=eq.${id}` }, ({ new: c, old: o }) => {
        if (S.active?.id !== id) return;
        if ((c.blocked_by || null) !== (S.active.meta.conversation.blocked_by || null) || c.checkin !== S.active.meta.conversation.checkin) refreshMeta();
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => { if (payload?.u !== S.me) showTyping(true); })
      .subscribe();
  }

  function showTyping(on) {
    const el = $('#cbx-typing'); if (!el) return;
    clearTimeout(S.typingTimer);
    if (!on) { el.innerHTML = ''; return; }
    const name = (S.active?.meta?.counterpart?.name || 'They').split(' ')[0];
    el.innerHTML = `<span class="dots"><i></i><i></i><i></i></span>${esc(name)} is typing`;
    S.typingTimer = setTimeout(() => { el.innerHTML = ''; }, TYPING_MS);
  }

  function subGlobal() {
    const client = sb(); if (!client || S.globalChannel || !S.me) return;
    let t;
    const bump = () => { clearTimeout(t); t = setTimeout(() => { if (S.open) loadInbox(); else updateBell(); }, 400); };
    S.globalChannel = client.channel('cbx-me:' + S.me)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversations', filter: `guest_id=eq.${S.me}` }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversations', filter: `host_id=eq.${S.me}` }, bump)
      .subscribe();
  }

  /* ════════════════════════════════════════════════════════════════════════
     SHEETS
  ════════════════════════════════════════════════════════════════════════ */
  function sheet(html, onMount) {
    closeSheet();
    const w = document.createElement('div');
    w.className = 'sheet-wrap'; w.id = 'cbx-sheet';
    w.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
    w.addEventListener('click', e => { if (e.target === w) closeSheet(); });
    S.root.appendChild(w);
    const first = w.querySelector('input:not([type=hidden]),textarea,select,button.mi,button.btn');
    setTimeout(() => first?.focus({ preventScroll: true }), 60);
    onMount?.(w.querySelector('.sheet'));
  }
  function closeSheet() { S.root?.querySelector('#cbx-sheet')?.remove(); }
  const sheetHead = (title, sub) => `<div class="sh-h"><h3>${title}</h3><button class="ib" data-act="sheet-close" aria-label="Close">${IC.close}</button></div>${sub ? `<p class="sh-p">${sub}</p>` : ''}`;
  const mi = (act, icon, title, sub, cls = '') => `<button class="mi ${cls}" data-act="${act}"><span class="ic">${icon}</span><span><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span></button>`;

  function actionsSheet() {
    const m = S.active.meta, host = m.role === 'host', paid = m.booking?.paid;
    let items = '';
    if (host) {
      if (m.listing?.live && !paid) items += mi('offer', IC.tag, 'Send a special offer', 'A private price for this guest and their dates. They book it in one tap.');
      items += paid
        ? mi('rehome', IC.home, 'I can’t host this booking', 'Move your guest to another home through Cabana’s rehoming — they keep their price and protection.')
        : mi('suggest', IC.home, 'Suggest other stays', 'Can’t take them? Point them to your other places, or anyone’s on Cabana.');
      items += mi('saved', IC.bolt, 'Saved replies', 'Answer common questions in one tap.');
    } else {
      if (!paid) items += mi('trip', IC.cal, 'Share your dates', 'Hosts answer faster when they know your dates and group size.');
      items += mi('saved', IC.bolt, 'Saved replies', 'Reuse messages you send often.');
    }
    items += mi('help', IC.help, 'Get help from Cabana', 'Ask our team to step in, or report something that isn’t right.');
    sheet(sheetHead('Actions') + `<div class="menu">${items}</div>`);
  }

  function menuSheet() {
    const m = S.active.meta, c = S.inbox.find(x => x.id === S.active.id);
    const l = m.listing;
    let items = '';
    if (l) items += mi('view-listing', IC.home, 'View listing', esc(l.title));
    items += mi('profile', IC.user, 'View profile', esc(m.counterpart?.name));
    items += c?.archived ? mi('unarchive', IC.archive, 'Move back to inbox', '') : mi('archive', IC.archive, 'Archive', 'Hide it until there is a new message.');
    items += m.blocked
      ? (m.blocked_by_me ? mi('unblock', IC.block, 'Unblock', 'Allow messages again.') : '')
      : mi('block', IC.block, 'Block', 'Stop messages from both sides.', 'danger');
    items += mi('help', IC.flag, 'Report or get help', 'Tell our Trust team what happened.', 'danger');
    sheet(sheetHead('Conversation') + `<div class="menu">${items}</div>`);
  }

  function detailsSheet() {
    const m = S.active.meta, cp = m.counterpart || {}, l = m.listing, b = m.booking, host = m.role === 'host';
    const resp = responseLabel(m.response);
    sheet(sheetHead(esc(cp.name || 'Member')) + `
      <div class="sum">
        <div class="kv"><span>${host ? 'Guest' : 'Host'}</span><span>${cp.verified ? 'Verified ✓' : 'Not yet verified'}</span></div>
        <div class="kv"><span>On Cabana since</span><span>${esc(cp.member_since || '')}</span></div>
        ${host ? `<div class="kv"><span>Completed stays</span><span>${cp.stays || 0}</span></div>` : `<div class="kv"><span>Listings</span><span>${cp.listings || 0}</span></div>`}
        ${resp ? `<div class="kv"><span>Responsiveness</span><span>${esc(resp)}</span></div>` : ''}
      </div>
      ${l ? `<div class="sum"><div class="kv"><b>${esc(l.title)}</b></div>
        ${l.price ? `<div class="kv"><span>Nightly</span><span>${money(l.price)}</span></div>` : ''}
        ${l.checkin_time ? `<div class="kv"><span>Check-in / out</span><span>${esc(l.checkin_time)} / ${esc(l.checkout_time || '')}</span></div>` : ''}
        ${l.max_guests ? `<div class="kv"><span>Sleeps</span><span>${l.max_guests}</span></div>` : ''}
        ${l.min_nights > 1 ? `<div class="kv"><span>Minimum stay</span><span>${l.min_nights} nights</span></div>` : ''}</div>` : ''}
      ${b ? `<div class="sum"><div class="kv"><b>Booking</b><span>${b.paid ? 'Paid' : 'Awaiting payment'}</span></div>
        <div class="kv"><span>Dates</span><span>${esc(range(b.checkin, b.checkout))}</span></div>
        <div class="kv"><span>Guests</span><span>${b.guests || 1}</span></div>
        ${b.grand_total ? `<div class="kv"><span>Total</span><span>${money(b.grand_total)}</span></div>` : ''}</div>` : ''}
      <div class="sum" style="background:#EEF1FF;color:#2F3FAE">
        <div style="font:700 13px var(--f);margin-bottom:4px">${IC.shield} Staying safe</div>
        <div style="font:400 12.5px/1.55 var(--f)">Pay only through Cabana — never by till, paybill or bank transfer to a person. Cabana will never ask for your password or M-Pesa PIN. Contact details unlock automatically once a booking is paid.</div>
      </div>
      <div class="sticky-go"><button class="btn ghost" data-act="help">Get help</button>${l ? `<button class="btn" data-act="view-listing">View listing</button>` : ''}</div>`);
  }

  /* ── Offer (host) ──────────────────────────────────────────────────────── */
  function offerSheet() {
    const m = S.active.meta, c = m.conversation, l = m.listing;
    const tIn = c.checkin && c.checkin >= todayISO() ? c.checkin : '', tOut = tIn ? c.checkout : '';
    sheet(sheetHead('Send a special offer', `A private price for ${esc(m.counterpart?.name?.split(' ')[0] || 'this guest')} only. It shows up here as a card, and they can book it at checkout. Your listed price stays the same for everyone else.`) + `
      <div class="grid2">
        <label class="fld"><span>Check-in</span><input type="date" id="of-in" min="${todayISO()}" value="${esc(tIn)}"></label>
        <label class="fld"><span>Check-out</span><input type="date" id="of-out" min="${todayISO()}" value="${esc(tOut)}"></label>
      </div>
      <div class="grid2">
        <label class="fld"><span>Guests</span><input type="number" id="of-g" min="1" max="${l.max_guests || 50}" value="${c.guests || 1}"></label>
        <label class="fld"><span>Offer valid for</span><select id="of-h"><option value="24">24 hours</option><option value="48" selected>48 hours</option><option value="72">3 days</option><option value="168">7 days</option></select></label>
      </div>
      <label class="fld"><span>Your price per night (listed at ${money(l.price)})</span><input type="number" id="of-p" inputmode="numeric" min="1" max="${Math.max(1, l.price - 1)}" value="${Math.round(l.price * 0.9)}"></label>
      <div class="seg">${[5, 10, 15, 20, 25].map(p => `<button class="chip" data-act="of-pct" data-p="${p}">−${p}%</button>`).join('')}</div>
      <div class="sum" id="of-sum"></div>
      <label class="fld"><span>Add a note (optional)</span><textarea id="of-note" rows="2" maxlength="500" placeholder="e.g. A small thank-you for staying a full week."></textarea></label>
      <div class="err" id="of-err" role="alert"></div>
      <div class="sticky-go"><button class="btn ghost" data-act="sheet-close">Cancel</button><button class="btn" id="of-go" data-act="offer-send">Send offer</button></div>`, root => {
      ['of-in', 'of-out', 'of-g', 'of-p', 'of-note'].forEach(id => root.querySelector('#' + id).addEventListener('input', offerSummary));
      offerSummary();
    });
  }
  function offerSummary() {
    const l = S.active.meta.listing, g = id => S.root.querySelector('#' + id);
    const ci = g('of-in').value, co = g('of-out').value, p = Math.round(Number(g('of-p').value) || 0);
    const n = ci && co ? nights(ci, co) : 0, total = p * n, fee = total < 5000 ? 300 : 800;
    let err = '';
    if (ci && co && n <= 0) err = 'Check-out must be after check-in.';
    else if (n && l.min_nights > n) err = `This listing needs at least ${l.min_nights} nights.`;
    else if (p >= l.price) err = `Offer a price below your listed ${money(l.price)}.`;
    else if (p && p < Math.ceil(l.price * 0.2)) err = `That is more than 80% off — the lowest you can offer is ${money(Math.ceil(l.price * 0.2))}.`;
    const note = g('of-note').value;
    const why = note.trim() && window.CabanaChatGuard ? CabanaChatGuard.check(note, { contactAllowed: S.active.meta.contact_allowed, anchors: anchorsFor(S.active) }).reason : null;
    if (why) err = why;
    g('of-err').textContent = err;
    g('of-go').disabled = !!err || !n || !p;
    g('of-sum').innerHTML = n && p ? `
      <div class="kv"><span>${money(p)} × ${n} night${n > 1 ? 's' : ''}</span><span>${money(total)}</span></div>
      <div class="kv"><span>Cabana fee (paid by guest)</span><span>${money(fee)}</span></div>
      <div class="kv tot"><span>Guest pays</span><span>${money(total + fee)}</span></div>
      <div class="kv" style="color:var(--mint);font-weight:700"><span>Guest saves</span><span>${money((l.price - p) * n)}</span></div>
      <div class="kv"><span>You receive</span><span>${money(total)}</span></div>` : '<div class="kv"><span>Choose dates and a price to see the totals.</span></div>';
  }
  async function sendOffer() {
    const g = id => S.root.querySelector('#' + id), btn = g('of-go');
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      await rpc('cabana_chat_send_offer', {
        p_conversation: S.active.id, p_checkin: g('of-in').value, p_checkout: g('of-out').value,
        p_guests: Number(g('of-g').value) || 1, p_nightly: Number(g('of-p').value), p_note: g('of-note').value || null,
        p_valid_hours: Number(g('of-h').value) || 48,
      });
      closeSheet(); toast('Offer sent'); await refreshMeta(); catchUp();
    } catch (e) { g('of-err').textContent = friendly(e); btn.disabled = false; btn.textContent = 'Send offer'; }
  }

  /* ── Suggest / rehome (host) ───────────────────────────────────────────── */
  async function suggestSheet(rehome) {
    const m = S.active.meta;
    sheet(sheetHead(rehome ? 'Find your guest another home' : 'Suggest other stays',
      rehome
        ? 'Your guest has paid, so this goes through Cabana rehoming: same dates, same price to them, and a full refund if nothing suits. Moves are closed inside 24 hours of check-in — at that point please cancel so they are refunded in full.'
        : 'Point your guest to up to three live stays — your own or anyone’s on Cabana. They see them as cards and can book or message straight away.') + `
      ${rehome ? '' : `<div class="seg" id="sg-reason">${[['dates_unavailable', 'Dates taken'], ['cannot_host', 'Can’t host'], ['better_fit', 'Better fit']].map(([k, t], i) => `<button class="chip" data-act="sg-reason" data-k="${k}" aria-pressed="${i === 0}">${t}</button>`).join('')}</div>`}
      <label class="search" style="margin:0 0 10px">${IC.search}<input id="sg-q" type="search" placeholder="Search by name, area or city" autocomplete="off"></label>
      <div id="sg-list"><div class="skel" style="margin:0"></div><div class="skel" style="margin:0"></div></div>
      ${rehome ? '' : '<label class="fld"><span>Add a note (optional)</span><textarea id="sg-note" rows="2" maxlength="500" placeholder="e.g. My other place is two streets away and just as quiet."></textarea></label>'}
      <div class="err" id="sg-err" role="alert"></div>
      <div class="sticky-go">${rehome ? '<button class="btn ghost" data-act="rehome-sweep">Let Cabana find options</button><button class="btn" id="sg-go" data-act="rehome-direct" disabled>Offer this home</button>' : '<button class="btn ghost" data-act="sheet-close">Cancel</button><button class="btn" id="sg-go" data-act="suggest-send" disabled>Send suggestions</button>'}</div>`, root => {
      let t; root.querySelector('#sg-q').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => loadCandidates(e.target.value, rehome), 300); });
      root.addEventListener('change', () => {
        const picked = root.querySelectorAll('input[name=sg]:checked');
        if (!rehome && picked.length > 3) { picked[picked.length - 1].checked = false; toast('You can suggest up to three.'); }
        root.querySelector('#sg-go').disabled = !root.querySelectorAll('input[name=sg]:checked').length;
      });
    });
    loadCandidates('', rehome);
  }
  async function loadCandidates(q, rehome) {
    const box = S.root.querySelector('#sg-list'); if (!box) return;
    try {
      const list = await rpc('cabana_chat_suggest_candidates', { p_conversation: S.active.id, p_query: q || null });
      box.innerHTML = list.length ? list.map(x => `<label class="cand">
        <input type="${rehome ? 'radio' : 'checkbox'}" name="sg" value="${esc(x.id)}" ${x.available === false ? 'disabled' : ''}>
        ${x.photo ? `<img src="${esc(x.photo)}" alt="" loading="lazy">` : '<span class="ph"></span>'}
        <span class="b2"><span class="t">${esc(x.title)}</span>
          <span class="s">${x.own ? '<b style="color:var(--pri)">Yours</b> · ' : ''}${x.price ? money(x.price) + '/night' : ''}${x.area ? ' · ' + esc(x.area) : ''}</span>
          <span class="s">${x.available === true ? '<b style="color:var(--mint)">Free on their dates</b>' : x.available === false ? 'Taken on their dates' : 'Guest hasn’t shared dates'}${x.max_guests ? ' · sleeps ' + x.max_guests : ''}</span></span></label>`).join('')
        : '<div class="empty" style="padding:20px">No live stays match. Try another area.</div>';
    } catch (e) { box.innerHTML = `<div class="err">${esc(friendly(e))}</div>`; }
  }
  async function sendSuggest() {
    const root = S.root.querySelector('#cbx-sheet'), btn = root.querySelector('#sg-go');
    const ids = [...root.querySelectorAll('input[name=sg]:checked')].map(i => i.value);
    const reason = root.querySelector('#sg-reason [aria-pressed=true]')?.dataset.k || 'cannot_host';
    btn.disabled = true;
    try {
      await rpc('cabana_chat_suggest', { p_conversation: S.active.id, p_listings: ids, p_reason: reason, p_note: root.querySelector('#sg-note').value || null });
      closeSheet(); toast('Suggestions sent'); catchUp();
    } catch (e) { root.querySelector('#sg-err').textContent = friendly(e); btn.disabled = false; }
  }
  async function rehome(direct) {
    const root = S.root.querySelector('#cbx-sheet'), b = S.active.meta.booking;
    const listing = direct ? root.querySelector('input[name=sg]:checked')?.value : null;
    if (direct && !listing) return;
    root.querySelectorAll('.sticky-go .btn').forEach(x => { x.disabled = true; });
    try {
      const r = await fetch('/api/match-guest', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (await token()) },
        body: JSON.stringify({ action: direct ? 'offer-direct' : 'offer', booking_id: b.id, listing_id: listing || undefined }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || ({ within_24h: 'Check-in is under 24 hours away, so moving is closed. Cancel the booking from your bookings page to refund your guest in full.', offer_already_open: 'Your guest already has a rehoming offer open.', listing_unavailable: 'That home isn’t free for these dates.', listing_too_small: 'That home is too small for this group.' }[d.error || d.reason] || d.error || 'Could not start rehoming.'));
      closeSheet(); toast('Your guest has been sent their options. They have 6 hours to choose.', 4500);
    } catch (e) {
      root.querySelector('#sg-err').textContent = friendly(e);
      root.querySelectorAll('.sticky-go .btn').forEach(x => { x.disabled = false; });
    }
  }

  /* ── Help / report ─────────────────────────────────────────────────────── */
  function helpSheet(preset) {
    sheet(sheetHead('Get help from Cabana', 'Our team can read this conversation — including anything that was withheld — so you don’t need to repeat yourself.') + `
      <div role="radiogroup">${Object.entries(REASONS).map(([k, [t, s]]) => `<label class="opt"><input type="radio" name="hr" value="${k}" ${k === (preset || 'help') ? 'checked' : ''}><span><b>${esc(t)}</b><small>${esc(s)}</small></span></label>`).join('')}</div>
      <label class="fld"><span>What happened? (optional)</span><textarea id="hr-note" rows="3" maxlength="1200" placeholder="A sentence or two helps us act faster."></textarea></label>
      <div class="err" id="hr-err" role="alert"></div>
      <div class="sticky-go"><button class="btn ghost" data-act="sheet-close">Cancel</button><button class="btn" id="hr-go" data-act="help-send">Send to Cabana</button></div>`);
  }
  async function sendHelp() {
    const root = S.root.querySelector('#cbx-sheet'), btn = root.querySelector('#hr-go');
    const reason = root.querySelector('input[name=hr]:checked')?.value || 'help';
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      const r = await fetch('/api/support', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (await token()) },
        body: JSON.stringify({ op: 'chat.escalate', conversationId: S.active.id, reason, note: root.querySelector('#hr-note').value, page: 'chat' }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error === 'rate_limited' ? 'You have sent a few reports just now. Please wait a minute.' : 'Could not reach the Cabana team. Please try again.');
      closeSheet();
      catchUp();
      const canBlock = ['harassment', 'scam', 'off_platform'].includes(reason) && !S.active.meta.blocked && !S.active.meta.booking?.paid;
      if (canBlock) {
        sheet(sheetHead('Sent to our Trust team', `Case ${esc(d.ref)}. We’ll reply in your Cabana support chat.`) + `<p class="sh-p">Would you also like to block this conversation? Neither of you will be able to send messages until you unblock it.</p><div class="sticky-go"><button class="btn ghost" data-act="sheet-close">Not now</button><button class="btn danger" data-act="block-now">Block</button></div>`);
      } else toast(`Sent to Cabana · case ${d.ref}`, 4000);
    } catch (e) { root.querySelector('#hr-err').textContent = friendly(e); btn.disabled = false; btn.textContent = 'Send to Cabana'; }
  }

  /* ── Trip (guest) ──────────────────────────────────────────────────────── */
  function tripSheet() {
    const c = S.active.meta.conversation, l = S.active.meta.listing || {};
    sheet(sheetHead('Your dates', 'Your host sees these at the top of the conversation, so they can answer and even send you a special offer.') + `
      <div class="grid2">
        <label class="fld"><span>Check-in</span><input type="date" id="tr-in" min="${todayISO()}" value="${esc(c.checkin && c.checkin >= todayISO() ? c.checkin : '')}"></label>
        <label class="fld"><span>Check-out</span><input type="date" id="tr-out" min="${todayISO()}" value="${esc(c.checkin && c.checkin >= todayISO() ? c.checkout : '')}"></label>
      </div>
      <label class="fld"><span>Guests</span><input type="number" id="tr-g" min="1" max="${l.max_guests || 50}" value="${c.guests || 1}"></label>
      <div class="err" id="tr-err" role="alert"></div>
      <div class="sticky-go"><button class="btn ghost" data-act="sheet-close">Cancel</button><button class="btn" data-act="trip-save">Save dates</button></div>`);
  }
  async function saveTrip() {
    const g = id => S.root.querySelector('#' + id);
    try {
      await rpc('cabana_chat_set_trip', { p_conversation: S.active.id, p_checkin: g('tr-in').value || null, p_checkout: g('tr-out').value || null, p_guests: Number(g('tr-g').value) || 1 });
      closeSheet(); await refreshMeta(); catchUp();
    } catch (e) { g('tr-err').textContent = friendly(e); }
  }

  /* ── Saved replies ─────────────────────────────────────────────────────── */
  async function savedSheet() {
    const host = S.active.meta.role === 'host', l = S.active.meta.listing || {};
    sheet(sheetHead('Saved replies', 'Tap one to put it in your message. You can edit it before sending.') + '<div id="sv-list"><div class="skel" style="margin:0"></div></div>' + `
      <details style="margin-top:6px"><summary style="font:700 13px var(--f);cursor:pointer;color:var(--pri);padding:6px 0">Save a new reply</summary>
        <label class="fld" style="margin-top:8px"><span>Name</span><input id="sv-t" maxlength="40" placeholder="e.g. Directions"></label>
        <label class="fld"><span>Message</span><textarea id="sv-b" rows="3" maxlength="1000">${esc($('#cbx-ta')?.value || '')}</textarea></label>
        <div class="err" id="sv-err"></div>
        <button class="btn" data-act="saved-add" style="width:100%">Save reply</button></details>`);
    const fill = s => s.replace('{checkin}', l.checkin_time || '2 PM').replace('{checkout}', l.checkout_time || '10 AM');
    try {
      const { data, error } = await sb().from('chat_saved_replies').select('id,title,body').order('created_at');
      if (error) throw error;
      const starters = (data || []).length ? [] : (host ? HOST_STARTERS : []);
      S.root.querySelector('#sv-list').innerHTML =
        (data || []).map(r => `<div class="saved"><button class="use" data-act="saved-use" data-b="${esc(r.body)}"><b>${esc(r.title)}</b><span>${esc(r.body)}</span></button><button class="ib" style="width:32px;height:32px" data-act="saved-del" data-id="${esc(r.id)}" aria-label="Delete ${esc(r.title)}">${IC.close}</button></div>`).join('')
        + (starters.length ? '<p class="sh-p" style="margin:4px 0 8px">Starters to get you going:</p>' + starters.map(([t, b]) => `<div class="saved"><button class="use" data-act="saved-use" data-b="${esc(fill(b))}"><b>${esc(t)}</b><span>${esc(fill(b))}</span></button></div>`).join('') : '')
        || '<p class="sh-p">No saved replies yet.</p>';
    } catch (_) { S.root.querySelector('#sv-list').innerHTML = '<p class="sh-p">Saved replies could not load.</p>'; }
  }
  async function addSaved() {
    const t = S.root.querySelector('#sv-t').value.trim(), b = S.root.querySelector('#sv-b').value.trim();
    if (!t || !b) { S.root.querySelector('#sv-err').textContent = 'Give it a name and a message.'; return; }
    const { error } = await sb().from('chat_saved_replies').insert({ title: t, body: b });
    if (error) { S.root.querySelector('#sv-err').textContent = friendly(error); return; }
    savedSheet();
  }

  /* ── State changes ─────────────────────────────────────────────────────── */
  async function setState(action) {
    try {
      await rpc('cabana_chat_set_state', { p_conversation: S.active.id, p_action: action });
      closeSheet();
      if (action === 'archive') { toast('Archived'); await loadInbox(); S.root.classList.remove('has-thread'); leaveThread(); renderList(); return; }
      if (action === 'unarchive') toast('Moved back to your inbox');
      await refreshMeta(); await loadInbox(); catchUp();
    } catch (e) {
      if (/Report the conversation/i.test(e.message)) { helpSheet('harassment'); toast(friendly(e), 5000); }
      else toast(friendly(e));
    }
  }

  /* ════════════════════════════════════════════════════════════════════════
     EVENTS
  ════════════════════════════════════════════════════════════════════════ */
  function onScroll(e) {
    const box = e.target;
    const j = $('#cbx-jump');
    if (j) { j.classList.toggle('on', box.scrollHeight - box.scrollTop - box.clientHeight > 400); j.style.bottom = (($('#cbx-foot')?.offsetHeight || 70) + 30) + 'px'; }
    if (box.scrollTop < 60) loadOlder();
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      if (S.root.querySelector('#cbx-sheet')) closeSheet();
      else if (S.root.classList.contains('has-thread') && mq('(max-width:899px)')) back();
      else close();
    }
    if (e.key === 'Tab') {  // keep focus inside the dialog
      const f = [...S.root.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select,[tabindex="0"]')].filter(x => x.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  }

  function back() { saveDraft(); S.root.classList.remove('has-thread'); leaveThread(); renderList(); loadInbox(); }

  function bookUrl(ci, co, g) {
    const l = S.active.meta.listing;
    const p = new URLSearchParams({ id: l.id, name: l.title || '', guests: g || 1 });
    if (ci) p.set('checkin', ci); if (co) p.set('checkout', co);
    return 'booking-confirm.html?' + p;
  }

  function onClick(e) {
    const t = e.target.closest('[data-act]'); if (!t || !S.root.contains(t)) return;
    const act = t.dataset.act, a = S.active;
    switch (act) {
      case 'close': return close();
      case 'reload': return loadInbox();
      case 'filter': S.filter = t.dataset.k; return renderList();
      case 'open': return openConversation(t.dataset.id);
      case 'back': return back();
      case 'jump': { const b = $('#cbx-msgs'); b.scrollTo({ top: b.scrollHeight, behavior: 'smooth' }); return; }
      case 'older': return loadOlder();
      case 'send': return send();
      case 'retry': { const m = a?.msgs.get(t.dataset.id); if (m) { m._state = 'sending'; renderMessages(false); deliver(m); } return; }
      case 'safety-ok': store.set('safety:' + a.id, '1'); return renderSafety();
      case 'chip': {
        const k = t.dataset.k;
        if (k.startsWith('act:')) return ({ offer: offerSheet, suggest: () => suggestSheet(false), saved: savedSheet })[k.slice(4)]?.();
        const ta = $('#cbx-ta'); ta.value = t.dataset.t; grow(ta); $('#cbx-send').disabled = false; checkDraft(); ta.focus(); return;
      }
      case 'actions': return actionsSheet();
      case 'menu': return menuSheet();
      case 'details': return detailsSheet();
      case 'sheet-close': return closeSheet();
      case 'offer': return offerSheet();
      case 'of-pct': { const l = a.meta.listing; S.root.querySelector('#of-p').value = Math.round(l.price * (1 - t.dataset.p / 100)); return offerSummary(); }
      case 'offer-send': return sendOffer();
      case 'offer-withdraw': case 'offer-decline':
        return rpc('cabana_chat_offer_respond', { p_offer: t.dataset.id, p_action: act === 'offer-withdraw' ? 'withdraw' : 'decline' })
          .then(() => { refreshMeta(); catchUp(); }).catch(err => toast(friendly(err)));
      case 'offer-book': location.href = bookUrl(t.dataset.in, t.dataset.out, t.dataset.g); return;
      case 'book': {
        const off = liveOffer(), c = a.meta.conversation;
        const card = off && a.order.map(id => a.msgs.get(id)).find(m => m.kind === 'offer' && m.payload?.offer_id === off.id);
        const p = card?.payload;
        location.href = p ? bookUrl(p.checkin, p.checkout, p.guests) : bookUrl(c.checkin, c.checkout, c.guests); return;
      }
      case 'suggest': return suggestSheet(false);
      case 'rehome': return suggestSheet(true);
      case 'sg-reason': t.parentElement.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c === t))); return;
      case 'suggest-send': return sendSuggest();
      case 'rehome-sweep': return rehome(false);
      case 'rehome-direct': return rehome(true);
      case 'ask-host': close(); return open({ listingId: t.dataset.id, checkin: a?.meta?.conversation?.checkin, checkout: a?.meta?.conversation?.checkout, guests: a?.meta?.conversation?.guests });
      case 'help': return helpSheet();
      case 'help-send': return sendHelp();
      case 'trip': return tripSheet();
      case 'trip-save': return saveTrip();
      case 'saved': return savedSheet();
      case 'saved-use': { closeSheet(); const ta = $('#cbx-ta'); if (ta) { ta.value = t.dataset.b; grow(ta); $('#cbx-send').disabled = false; checkDraft(); ta.focus(); } return; }
      case 'saved-add': return addSaved();
      case 'saved-del': return sb().from('chat_saved_replies').delete().eq('id', t.dataset.id).then(savedSheet);
      case 'archive': case 'unarchive': case 'unblock': return setState(act);
      case 'block':
        return sheet(sheetHead('Block this conversation?', 'Neither of you will be able to send messages here. You can unblock it later. If something is wrong, you can also report it to our Trust team.') + '<div class="sticky-go"><button class="btn ghost" data-act="help">Report instead</button><button class="btn danger" data-act="block-now">Block</button></div>');
      case 'block-now': return setState('block');
      case 'view-listing': { const l = a.meta.listing, c = a.meta.conversation; location.href = `apartments.html?open=${encodeURIComponent(l.id)}${c.checkin ? `&checkin=${c.checkin}&checkout=${c.checkout}` : ''}`; return; }
      case 'profile': { closeSheet(); $('.t-ava')?.click(); return; }
    }
  }

  /* ════════════════════════════════════════════════════════════════════════
     BELL, BADGES, PAGE CHROME
  ════════════════════════════════════════════════════════════════════════ */
  async function getUnread() {
    const client = sb(); if (!client || !S.me) return 0;
    try {
      const { data } = await client.from('chat_conversations').select('host_id,host_unread,guest_unread,host_archived_at,guest_archived_at')
        .or(`host_id.eq.${S.me},guest_id.eq.${S.me}`);
      return (data || []).reduce((n, c) => n + (c.host_id === S.me ? (c.host_archived_at ? 0 : c.host_unread || 0) : (c.guest_archived_at ? 0 : c.guest_unread || 0)), 0);
    } catch (_) { return 0; }
  }
  function setBell(n) {
    document.querySelectorAll('.apa-ico[data-apa="notif"]').forEach(btn => {
      const dot = btn.querySelector('.apa-ico-dot'); if (dot) dot.style.display = n > 0 ? 'block' : 'none';
      btn.setAttribute('data-unread', n > 0 ? '1' : '0');
    });
    const label = n > 99 ? '99+' : String(n);
    document.querySelectorAll('#tb-inbox-badge, .cbx-nav-badge').forEach(b => { b.textContent = label; b.classList.toggle('on', n > 0); });
  }
  async function updateBell() { setBell(await getUnread()); }

  /* Hosts live in the Partner Hub. Give them a Messages entry there, with
     an unread count, instead of sending them to the traveller dashboard. */
  function injectPartnerNav() {
    const after = document.querySelector('.sidebar .sb-link[href="partner-bookings.html"]');
    if (after && !document.querySelector('.sidebar [data-cbx-nav]')) {
      const a = document.createElement('a');
      a.className = 'sb-link'; a.href = '#messages'; a.setAttribute('data-cbx-nav', '');
      a.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Messages<span class="cbx-nav-badge"></span>`;
      after.after(a);
    }
    const mAfter = document.querySelector('.mobile-nav .mn-item[href="partner-bookings.html"]');
    if (mAfter && !document.querySelector('.mobile-nav [data-cbx-nav]')) {
      const a = document.createElement('a');
      a.className = 'mn-item'; a.href = '#messages'; a.style.position = 'relative'; a.setAttribute('data-cbx-nav', '');
      a.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Messages<span class="cbx-nav-badge"></span>`;
      mAfter.after(a);
    }
    document.addEventListener('click', e => {
      const n = e.target.closest?.('[data-cbx-nav],[data-cbx-open]'); if (!n) return;
      e.preventDefault();
      if (n.dataset.cbxBooking) openForBooking(n.dataset.cbxBooking);
      else if (n.dataset.cbxConversation) openConversation(n.dataset.cbxConversation);
      else openInbox();
    });
  }

  let _booted = false;
  function initBell() {
    if (_booted) return; _booted = true;
    resolveUser().then(u => {
      if (!u) { _booted = false; return; }
      S.me = u.id;
      injectCSS(); injectPartnerNav();
      updateBell(); subGlobal();
      setInterval(() => { if (!document.hidden && !S.open) updateBell(); }, POLL_MS);
      try {
        const q = new URLSearchParams(location.search);
        if (q.get('c')) openConversation(q.get('c'));
        else if (q.get('chat_booking')) openForBooking(q.get('chat_booking'));
        else if (q.get('inbox') === '1' || location.hash === '#messages') openInbox();
      } catch (_) {}
    });
  }

  /* ── Compatibility with v5 callers ─────────────────────────────────────── */
  function scrub(raw) {
    const r = window.CabanaChatGuard?.check(raw);
    return { text: r && !r.ok ? '[contact details removed]' : raw, scrubbed: !!(r && !r.ok) };
  }
  function _compat() {
    window.ApatmentoChat = {
      open, openInbox, closeInbox: close, close, send: () => send(), _autosize: grow,
      _inboxSend: () => send(), _inboxOpenConv: openConversation, _inboxBackToList: back,
      _openConvById: openConversation, initFAB: initBell, scrubContactInfo: scrub,
    };
    if (window.ApaChrome) window.ApaChrome.openInbox = openInbox;
  }

  function _init() {
    loadGuard(); _compat();
    if (!window.ApaChrome) { const iv = setInterval(() => { if (window.ApaChrome) { window.ApaChrome.openInbox = openInbox; clearInterval(iv); } }, 250); setTimeout(() => clearInterval(iv), 10000); }
    window.addEventListener('online', () => {
      if (!S.active) return;
      S.active.order.map(id => S.active.msgs.get(id)).filter(m => m._state === 'failed').forEach(m => { m._state = 'sending'; deliver(m); });
      catchUp();
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && S.active) { catchUp(); markRead(); } });
    window.addEventListener('pagehide', saveDraft);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initBell);
    else setTimeout(initBell, 300);
  }
  _init();

  return {
    open, openInbox, openConversation, openForBooking, close, closeInbox: close,
    getUnread, initBell, initFAB: initBell, updateBell, scrub,
    // v5 names kept so nothing that still calls them breaks
    _pSend: () => send(), _tSend: () => send(), _thrBack: back, _openThr: openConversation,
    _filter: q => { S.query = String(q || '').toLowerCase(); renderList(); }, _grow: grow, _goStays: () => { location.href = 'apartments.html'; },
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
    if (n.kind === 'message') playMessageChime();
    // Click opens relevant destination
    t.onclick = () => { t.classList.remove('show'); if (n.url) location.href = n.url; };
  }

  function playMessageChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx(), now = ctx.currentTime;
      [[0, 659.25], [.13, 783.99], [.28, 987.77]].forEach(([delay, frequency]) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = frequency;
        gain.gain.setValueAtTime(.0001, now + delay);
        gain.gain.exponentialRampToValueAtTime(.12, now + delay + .015);
        gain.gain.exponentialRampToValueAtTime(.0001, now + delay + .16);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now + delay); osc.stop(now + delay + .18);
      });
      setTimeout(() => ctx.close().catch(() => {}), 700);
      navigator.vibrate?.([80, 50, 160]);
    } catch (_) { /* browser sound remains best-effort */ }
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
      card.hidden = true;
      card.style.display = 'none';
      return;
    }

    card.hidden = false;
    card.style.display = '';

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
      // Message notifications open the exact conversation.
      const conv = (url.match(/[?&]c=([0-9a-f-]{36})/i) || [])[1];
      if (conv && window.CabanaChat?.openConversation) { CabanaChat.openConversation(conv); return; }
      if (url.includes('inbox')) {
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
