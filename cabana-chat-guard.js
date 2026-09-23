/* ════════════════════════════════════════════════════════════════════════════
   CABANA CHAT GUARD  ·  cabana-chat-guard.js
   ────────────────────────────────────────────────────────────────────────────
   Decides whether a chat message is trying to move a guest and a host off
   Cabana before a booking is paid: phone numbers, emails, links, social
   handles, and "pay me directly" requests.

   This file is the readable specification. The authoritative copy runs in
   Postgres (cabana_private.chat_guard, migration 20260920120000) on every
   insert, so a client that skips this file changes nothing. The browser
   uses this copy only to warn the writer BEFORE they press send, so an
   honest person is never surprised by a withheld message.

   Both copies are pinned to the same vectors in tests/chat-guard.vectors.json.
   If you change one, change the other and run both suites.

   Why the old scrubber lost: it looked for a phone number in the shape a
   phone number is written. People who want to leak one write it in any
   other shape — "07then 16then 206then 494", "zero seven one six…",
   "sifuri saba moja sita…", "o7l6 2O6 494", or one fragment per message.
   So instead of matching shapes, this normalises everything back to the
   digits the reader would reconstruct, and asks: could a person dial this?
   ════════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  const WORD_DIGITS = {
    zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9',
    // Kiswahili
    sifuri: '0', moja: '1', mbili: '2', tatu: '3', nne: '4', tano: '5', sita: '6', saba: '7', nane: '8', tisa: '9',
  };
  const WORD_RE = new RegExp('\\b(' + Object.keys(WORD_DIGITS).join('|') + ')\\b', 'g');

  // Words people put between digit fragments so no single run looks like a number.
  const JOINERS = 'then|and|na|kisha|halafu|next|plus|followed by|dash|space|comma|dot|&|\\+';
  const JOIN_RE = new RegExp('(\\d)\\s*(?:' + JOINERS + ')\\s*(?=\\d)', 'g');
  const SEP_RE = /(\d)[\s.\-_/\\|()*#:,~=']{1,3}(?=\d)/g;

  // Months and prices are the honest numbers in a stay conversation. They are
  // shielded only when they stand alone — a "date" glued to more digits is
  // exactly how "07/16/2064 94" would otherwise slip through.
  const DATE = '(?:\\d{1,2}[/.-]\\d{1,2}[/.-](?:\\d{4}|\\d{2})|\\d{4}-\\d{2}-\\d{2})';
  const DATE_UNIT_RE = new RegExp('(?<![\\d.,/:-]|\\d\\s)' + DATE + '(?:\\s*(?:-|–|to|until|till|hadi)\\s*' + DATE + ')?(?![\\s.,/:-]*\\d)', 'g');
  const DATE_ONE_RE = new RegExp(DATE, 'g');
  const TIME_RE = /(?<![\d.,/:-]|\d\s)\d{1,2}:\d{2}(?:\s?(?:am|pm|hrs|h))?(?![\s.,/:-]*\d)/g;
  const PRICE_RE = /(?<![\d.,/:-]|\d\s)(?:(?:kes|ksh|kshs|sh|shs|usd|\$|€|£)\.?\s?[1-9][\d,]{0,8}(?:\.\d{1,2})?k?|[1-9][\d,]{0,8}(?:\.\d{1,2})?\s?(?:k\b|kes\b|ksh\b|kshs\b|bob\b|\/=|shillings\b|dollars\b|usd\b))(?![\s.,/:-]*\d)/g;

  function validDate(s) {
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return +iso[1] >= 2024 && +iso[1] <= 2032 && +iso[2] >= 1 && +iso[2] <= 12 && +iso[3] >= 1 && +iso[3] <= 31;
    const p = s.split(/[/.-]/).map(Number);
    if (p.length !== 3) return false;
    const y = p[2] < 100 ? 2000 + p[2] : p[2];
    if (y < 2024 || y > 2032) return false;
    const dm = p[0] >= 1 && p[0] <= 31 && p[1] >= 1 && p[1] <= 12;
    const md = p[1] >= 1 && p[1] <= 31 && p[0] >= 1 && p[0] <= 12;
    return dm || md;
  }
  function validTime(s) {
    const m = s.match(/^(\d{1,2}):(\d{2})/);
    return !!m && +m[1] <= 23 && +m[2] <= 59;
  }

  function normalise(text) {
    let v = String(text || '');
    try { v = v.normalize('NFKC'); } catch (_) { /* old engines */ }
    v = v.replace(/[\u200B-\u200D\u2060\uFEFF\u00AD\uFE0F\u20E3]/g, '').toLowerCase();
    return v;
  }

  // The digits a reader would reconstruct from the message.
  function numericView(norm) {
    let v = norm.replace(WORD_RE, (_, w) => WORD_DIGITS[w]);
    v = v.replace(/\b(double|triple)\s*(\d)/g, (_, k, d) => d.repeat(k === 'double' ? 2 : 3));
    // o7l6 → 0716 — only inside tokens that are already mostly digits.
    v = v.replace(/[0-9oli|!]{3,}/g, tok => ((tok.match(/\d/g) || []).length >= 2 ? tok.replace(/o/g, '0').replace(/[li|!]/g, '1') : tok));
    v = v.replace(DATE_UNIT_RE, m => ((m.match(DATE_ONE_RE) || []).every(validDate) ? ' ◷ ' : m));
    v = v.replace(TIME_RE, m => (validTime(m) ? ' ◷ ' : m));
    v = v.replace(PRICE_RE, ' ¤ ');
    let prev;
    do { prev = v; v = v.replace(JOIN_RE, '$1'); } while (v !== prev);
    do { prev = v; v = v.replace(SEP_RE, '$1'); } while (v !== prev);
    return v;
  }

  function dialable(run, plus) {
    const n = run.length;
    if (plus && n >= 9 && n <= 15) return true;          // +254 7…, +1 …
    if (n >= 14) return true;                             // card / account length
    if (run.startsWith('00') && n >= 10) return true;     // 00 254 …
    if (run[0] === '0' && n >= 10 && n <= 13) return true; // 07… 01… 080… (NG) 024… (GH)
    if (run[0] === '2' && n >= 11 && n <= 13) return true; // 254… 255… 256… 234… 233… 27…
    if (n === 9 && /^[17]/.test(run)) return true;        // 716206494
    return false;
  }

  function phoneIn(view) {
    const re = /(\+?)(\d+)/g; let m;
    while ((m = re.exec(view))) if (dialable(m[2], !!m[1])) return m[2];
    return null;
  }

  const RULES = [
    ['email', /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/],
    ['email', /[a-z0-9._%+-]{2,}\s*(?:\(at\)|\[at\]|\{at\}|<at>|\sat\s)\s*[a-z0-9-]{2,}\s*(?:\.|\(dot\)|\[dot\]|\sdot\s)\s*(?:com|net|org|co|ke|io|me|info|biz|africa|uk|us|ng|tz|ug|rw|za)\b/],
    ['email', /\b(?:gmail|g-mail|yahoo|ymail|hotmail|outlook|icloud|protonmail)\b/],
    ['link', /\bhttps?:\/\/(?!(?:www\.)?(?:cabana\.africa|apatmento\.))\S+/],
    ['link', /\bwww\.(?!cabana\.africa)\S+/],
    ['link', /\b(?:wa\.me|t\.me|bit\.ly|linktr\.ee|tinyurl\.com|goo\.gl|maps\.app\.goo\.gl|wa\.link)\b/],
    ['link', /\b(?!cabana\.africa\b)[a-z0-9-]{2,}\.(?:com|net|org|io|co\.ke|me|app|ly|link|info|biz|site|online|shop|store|page|xyz)\b/],
    ['social', /\b(?:whats?\s*app?|what'?s\s*app|wh?att?s+\s*app?|wass?app?|wasap|watsap+|wtsp|w\/app|whatsap+|watsapp|wapp)\b/],
    ['social', /\b(?:telegram|tele\s+gram|instagram|insta|facebook|snapchat|tiktok|tik\s+tok|viber|wechat|imo\s+app|signal\s+app|linkedin|twitter|discord|skype|messenger)\b/],
    ['social', /\b(?:ig|fb|snap|tg|x)\s*[:@]\s*[a-z0-9_.]{3,}/],
    // A bare @word is decided in check(): here it usually means "at a place"
    // ("2 Bedroom @JKIA"), not a handle.
    ['payment', /\b(?:till|paybill|pay\s*bill|buy\s*goods|lipa\s*na\s*m-?pesa|account\s*(?:no|number|#))\b[^a-z]{0,6}(?:no\.?|number|#|is|:)?[^a-z]{0,4}\d{4,}/],
    ['payment', /\b(?:till|paybill|pay\s*bill|buy\s*goods)\s*(?:no\.?|number|#)/],
    ['off_platform', /\b(?:pay|send|tuma)\s+(?:me\s+|the\s+|money\s+|pesa\s+)*(?:directly|direct|cash|outside|off\s+(?:the\s+)?(?:app|platform|cabana|site)|via\s+m-?pesa|through\s+m-?pesa|on\s+m-?pesa|to\s+my\s+m-?pesa|kwa\s+m-?pesa)\b/],
    ['off_platform', /\b(?:avoid|skip|save\s+on|without)\s+(?:the\s+)?(?:cabana\s+)?(?:fee|fees|commission|charges|service\s+fee)\b/],
    ['off_platform', /\b(?:book|deal|pay|transact|talk|chat|connect)\s+(?:with\s+me\s+)?(?:directly|outside|off\s*(?:line|the\s+app|the\s+platform))\b/],
    ['off_platform', /\b(?:outside|off)\s+(?:of\s+)?(?:the\s+)?(?:app|platform|cabana)\b/],
    ['off_platform', /\bcash\s+(?:on|at|upon)\s+(?:arrival|check-?in)\b/],
    ['off_platform', /\b(?:cheaper|less|discount)\s+(?:if\s+(?:you|we)\s+)?(?:pay\s+|book\s+|deal\s+)?(?:directly|outside|off\s+the\s+app|in\s+cash)\b/],
    // Sending the other person somewhere else to transact.
    ['rival', /\b(?:book|pay|find|list|listed|cheaper|same|also|available|check)\b[^.!?]{0,40}\b(?:airbnb|air\s?bnb|booking\.?com|agoda|vrbo|expedia|tripadvisor)\b/],
    ['rival', /\b(?:airbnb|air\s?bnb|booking\.?com|agoda|vrbo|expedia|tripadvisor)\b[^.!?]{0,40}\b(?:cheaper|instead|directly|book|pay|there)\b/],
    // "google us" is unambiguous; "find me" needs somewhere to be found,
    // or it eats "can you find me a taxi?".
    ['rival', /\bgoogle\s+(?:for\s+)?(?:us|me|my|our)\b/],
    ['rival', /\b(?:search|find|look)\s+(?:for\s+)?(?:us|me|my|our)\s+(?:up\s+)?(?:on|online|at)\b/],
  ];

  /* ── Redirects ──────────────────────────────────────────────────────────
     A redirect carries no identifier. "come to obama office" and "Ask for
     jets nest" are, together, a complete booking instruction: where to walk
     and what to say at the door. So this reads mood rather than shape — a
     directive, plus something to walk up to. Both halves are required, which
     is what keeps ordinary questions ("Is parking available at the gate?")
     out of it. A guard that eats real questions is worse than none, because
     hosts stop using chat and go where we cannot see them. */
  const VISIT = [
    /\b(?:come|head|drive)\s+(?:on\s+)?(?:over\s+|down\s+|round\s+|straight\s+)?(?:to|by|through)\b/,
    /\b(?:pass|swing|drop|stop)\s+(?:by|in|through|around)\b/,
    /\bwalk[\s-]*in\b/, /\bshow\s+up\b/,
    /\b(?:visit|find|meet|see)\s+(?:me|us)\b/,
    /\bcome\s+(?:see|view|collect|pick|and\s+see)\b/,
    /\b(?:njoo|kuja|fika|pitia|tukutane|nipate)\b/,
  ];
  const ASKFOR = [
    /\bask\s+(?:for|of)\b/, /\btell\s+(?:them|him|her|the)\b/,
    /\bsay\s+(?:you'?re|you\s+are|that\s+you)\b/,
    /\b(?:uliza|ulizia|mwambie|niulize)\b/,
  ];
  // Words that turn a bare @word back into a handle.
  const AT_CONTEXT = /\b(?:follow|dm|add\s+me|my\s+handle|handle\s+is|username|profile|account\s+is|subscribe)\b/;
  const PLACE = /\b(?:office|gate|reception|premises|compound|caretaker|watchman|askari|mlinzi|lango|ofisi|entrance|lobby|front\s+desk|junction|stage|opposite|behind|next\s+to|hapa|hapo|kwetu|kwangu|nyumbani|apartment|flat|unit)\b/;
  // Asking about one's own visit is a question, not an instruction.
  const SELF_Q = [/\b(?:can|could|may|might)\s+(?:i|we)\b/, /\b(?:is|would)\s+it\s+(?:ok|okay|fine|possible)\b/, /\bnaweza\b/];

  /* Words that name THIS stay, so "ask for jets nest" is a bypass in the Jets
     Nest conversation and an ordinary sentence anywhere else. Generic words
     never become anchors — an anchor has to be worth saying out loud at a gate. */
  const ANCHOR_STOP = new Set(('the and for with near from into your yours this that they them ' +
    'room rooms beds bedroom bedrooms bath baths bathroom studio suite suites ' +
    'apartment apartments house houses home homes villa villas flat flats ' +
    'place places stay stays cabana guest guests host hosts property properties ' +
    'luxury modern cosy cozy spacious furnished serviced executive deluxe private ' +
    'estate estates court courts gardens heights towers plaza centre center ' +
    'view views beach city town road street avenue drive lane close park').split(' '));

  function anchorTokens(parts) {
    const seen = new Set();
    for (const p of (parts || [])) {
      for (const w of String(p || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(/\s+/)) {
        if (w.length >= 4 && !/^\d+$/.test(w) && !ANCHOR_STOP.has(w)) seen.add(w);
      }
    }
    return [...seen];
  }

  const SOFT = [
    ['contact_request', /\b(?:call|text|sms|ring|dm|inbox|ping|beep|flash)\s+me\b|\b(?:my|your)\s+(?:number|digits|contacts?|phone\s+number)\b|\bnambari\s+(?:yangu|yako)\b|\bnamba\s+(?:yangu|yako)\b|\bnipigie\b|\bnipe\s+namba\b/],
  ];

  /* The reason shown to the writer, per category. */
  const REASONS = {
    phone: 'Phone numbers can’t be shared until the booking is paid.',
    email: 'Email addresses can’t be shared until the booking is paid.',
    link: 'Outside links aren’t allowed in Cabana chats.',
    social: 'Social handles and messaging apps can’t be shared here.',
    payment: 'Payment details (tills, paybills, accounts) can’t be shared. Pay only through Cabana.',
    off_platform: 'Arranging payment or bookings outside Cabana isn’t allowed. It also removes your protection.',
    meetup: 'Arranging to meet or be paid in person before a booking is paid isn’t allowed — neither of you is covered. Send a private offer instead.',
    rival: 'Pointing somewhere else to book isn’t allowed here.',
  };

  /**
   * @param {string} text           the message
   * @param {object} [opts]
   * @param {boolean} [opts.contactAllowed]  a paid booking exists: phone numbers are allowed
   * @param {string[]} [opts.anchors]        words naming this stay (see anchorTokens)
   * @returns {{hard:string[], soft:string[], phone:string|null, reason:string|null, ok:boolean}}
   */
  function check(text, opts = {}) {
    const norm = normalise(text);
    const view = numericView(norm);
    const hard = new Set(), soft = new Set();
    const phone = phoneIn(view);
    if (phone && !opts.contactAllowed) hard.add('phone');
    for (const [tag, re] of RULES) if (re.test(norm)) hard.add(tag);
    for (const [tag, re] of SOFT) if (re.test(norm)) soft.add(tag);

    // A bare @word is a handle when it carries handle punctuation, when a
    // platform is named beside it, or when someone is asked to follow it.
    // Otherwise it is a place, which is how this market writes an address:
    // "Shikaz Homes 2 Bedroom @JKIA Syokimau".
    const at = norm.match(/(?:^|[\s(])@([a-z0-9_.]{3,30})\b/);
    if (at) {
      if (/[0-9_.]/.test(at[1]) || hard.has('social') || AT_CONTEXT.test(norm)) hard.add('social');
      else soft.add('handle');
    }

    if (!opts.contactAllowed) {
      const anchors = opts.anchors || [];
      const visit  = VISIT.some(re => re.test(norm));
      const askfor = ASKFOR.some(re => re.test(norm));
      const place  = PLACE.test(norm);
      const anchor = anchors.some(a => a && new RegExp('\\b' + a + '\\b').test(norm));
      if ((visit && (place || anchor)) || (askfor && anchor)) {
        if (SELF_Q.some(re => re.test(norm))) soft.add('meetup'); else hard.add('meetup');
      } else if (askfor && place) {
        soft.add('meetup'); // "ask for the caretaker" — recorded, never withheld
      }
    }

    const list = [...hard];
    return { ok: !list.length, hard: list, soft: [...soft], phone, reason: list.length ? REASONS[list[0]] : null };
  }

  /* Digits a message contributes to a number being spelled across several
     messages. Only short, mostly-numeric messages contribute: a long message
     with a price and a date in it is a sentence, not a fragment. */
  function fragmentDigits(text) {
    const norm = normalise(text);
    const view = numericView(norm);
    const letters = view.replace(/[^a-z]/g, '').length;
    const digits = view.replace(/\D/g, '');
    if (!digits || digits.length > 13 || norm.length > 48 || letters > 18) return '';
    return digits;
  }

  /** Would these recent fragments (oldest first) plus this one spell a number? */
  function spansMessages(previous, text, opts = {}) {
    if (opts.contactAllowed) return false;
    const mine = fragmentDigits(text);
    if (!mine) return false;
    let joined = mine;
    for (let i = previous.length - 1; i >= 0 && joined.length < 16; i--) {
      const d = fragmentDigits(previous[i]);
      if (!d) break;
      joined = d + joined;
      if (phoneIn(joined)) return true;
    }
    return false;
  }

  const api = { check, spansMessages, anchorTokens, normalise, numericView, fragmentDigits, REASONS, version: 7 };
  root.CabanaChatGuard = api;
})(typeof window !== 'undefined' ? window : globalThis);
