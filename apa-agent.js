/* ═══════════════════════════════════════════════════════════════════════
   APATMENTO · AGENT CORE  v1
   ───────────────────────────────────────────────────────────────────────
   The one place that knows how agents work. Loaded by the agent
   dashboard, the host's agent inbox, and the guest-facing referral
   banner. Nothing here reaches into the DOM.

   Design rules, inherited from apa-session.js:
     1. Nothing throws. A failed agent call must never take down a page.
     2. Every read is cached for the life of the tab, and invalidated
        explicitly by the write that would have changed it.
     3. The token comes from ApaSession. We never hold our own.

   Public API:
     ApaAgent.me()                        → { agent, portfolio, referrals, totals }
     ApaAgent.signup(payload)             → agent
     ApaAgent.uploadId(file, docType)     → { kyc_status }
     ApaAgent.request(listingId, pct, msg)
     ApaAgent.availability(listingId)     → [{ checkin, checkout, status }]
     ApaAgent.calendarFor(listingId, days)→ Map<'YYYY-MM-DD', status>
     ApaAgent.link(code, listingId)       → share URL

     ApaAgent.inbox()                     → { pending, active, archived }
     ApaAgent.respond(id, decision, opts)
     ApaAgent.setState(id, state)
     ApaAgent.report(agentId, reason, ...)

     ApaAgent.captureReferral()           → { code, listing } | null
     ApaAgent.pendingReferral()           → same, from storage
     ApaAgent.clearReferral()

     ApaAgent.money(n) · ApaAgent.rateLabel(pct, flat) · ApaAgent.clockTone(days)
   ═══════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  if (global.ApaAgent) return;

  var API      = '/api/agents';
  var SITE     = location.origin;
  var REF_KEY  = 'apa_agent_ref';        // survives the auth round-trip
  var VIS_KEY  = 'apa_visitor_id';

  /* ── never throw ────────────────────────────────────────────────── */
  function warn(label, e) {
    if (global.console) console.warn('[agent:' + label + ']', e && e.message);
  }

  /* ── a stable id for a guest who has not signed in ──────────────── */
  function visitorId() {
    try {
      var v = localStorage.getItem(VIS_KEY);
      if (!v) {
        v = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(VIS_KEY, v);
      }
      return v;
    } catch (e) { return null; }
  }

  /* ── the caller's access token, if any ──────────────────────────── */
  async function token() {
    try {
      var sb = global.ApaSession && global.ApaSession.client && global.ApaSession.client();
      if (!sb) return null;
      var r = await sb.auth.getSession();
      return (r && r.data && r.data.session && r.data.session.access_token) || null;
    } catch (e) { warn('token', e); return null; }
  }

  /* ── fetch wrapper ──────────────────────────────────────────────── */
  async function call(action, opts) {
    opts = opts || {};
    var url = API + '?action=' + action;
    if (opts.query) {
      for (var k in opts.query) {
        if (opts.query[k] != null) url += '&' + k + '=' + encodeURIComponent(opts.query[k]);
      }
    }

    var headers = { 'Content-Type': 'application/json' };
    if (!opts.anon) {
      var t = await token();
      if (t) headers.Authorization = 'Bearer ' + t;
    }

    var r = await fetch(url, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });

    var j = null;
    try { j = await r.json(); } catch (e) { /* empty body */ }

    if (!r.ok) {
      var err = new Error((j && j.error) || 'Something went wrong.');
      err.status = r.status;
      err.code   = j && j.code;
      throw err;
    }
    return j;
  }

  /* ── cache ──────────────────────────────────────────────────────── */
  var _me = null, _inbox = null;
  function invalidate() { _me = null; _inbox = null; }

  /* ══════════════════════════════════════════════════════════════════
     AGENT SIDE
     ══════════════════════════════════════════════════════════════════ */

  async function me(force) {
    if (_me && !force) return _me;
    _me = await call('me');
    return _me;
  }

  async function signup(payload) {
    var r = await call('signup', { method: 'POST', body: payload });
    invalidate();
    return r.agent;
  }

  /* Identity documents go straight to a PRIVATE bucket. The API only
     ever sees the path, never the bytes, never a public URL.        */
  async function uploadId(file, docType) {
    var sb = global.ApaSession.client();
    var s  = await sb.auth.getUser();
    var uid = s && s.data && s.data.user && s.data.user.id;
    if (!uid) throw new Error('Please sign in.');

    if (file.size > 8 * 1024 * 1024) throw new Error('That file is over 8MB. Try a photo instead of a scan.');
    if (!/^image\/|^application\/pdf$/.test(file.type)) throw new Error('Upload a photo or a PDF.');

    var ext  = (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 5);
    var path = uid + '/' + docType + '-' + Date.now() + '.' + ext;

    var up = await sb.storage.from('agent-documents').upload(path, file, {
      cacheControl: '3600', upsert: false, contentType: file.type,
    });
    if (up.error) throw new Error('Upload failed. Check your connection.');

    var r = await call('upload-id', {
      method: 'POST',
      body: { doc_type: docType, storage_path: path, mime_type: file.type, size_bytes: file.size },
    });
    invalidate();
    return r;
  }

  async function request(listingId, pct, message) {
    var r = await call('request', {
      method: 'POST',
      body: { listing_id: String(listingId), requested_pct: Number(pct), message: message || null },
    });
    invalidate();
    return r.partnership;
  }

  async function availability(listingId, from, to) {
    var r = await call('availability', { query: { listing_id: listingId, from: from, to: to } });
    return (r && r.blocked) || [];
  }

  /* Flatten booked ranges into a day → status map. Checkout day is free:
     a guest leaves in the morning, the next arrives in the afternoon.
     Marking it blocked would cost the host a night for no reason.
     The SQL already labels each range 'held' or 'booked'.             */
  async function calendarFor(listingId, days) {
    var blocked = await availability(listingId);
    var map = new Map();
    blocked.forEach(function (b) {
      var d   = new Date(b.checkin);
      var end = new Date(b.checkout);
      while (d < end) {
        map.set(iso(d), b.status);
        d.setDate(d.getDate() + 1);
      }
    });
    return map;
  }

  function iso(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function link(code, listingId) {
    return SITE + '/apartments.html?ref=' + encodeURIComponent(code) +
           '&listing=' + encodeURIComponent(listingId);
  }

  /* ══════════════════════════════════════════════════════════════════
     HOST SIDE
     ══════════════════════════════════════════════════════════════════ */

  async function inbox(force) {
    if (_inbox && !force) return _inbox;
    _inbox = await call('inbox');
    return _inbox;
  }

  async function respond(partnershipId, decision, opts) {
    opts = opts || {};
    var r = await call('respond', {
      method: 'POST',
      body: {
        partnership_id:  partnershipId,
        decision:        decision,
        commission_pct:  opts.pct  != null ? opts.pct  : null,
        commission_flat: opts.flat != null ? opts.flat : null,
        message:         opts.message || null,
      },
    });
    invalidate();
    return r.partnership;
  }

  async function setState(partnershipId, state) {
    var r = await call('set-state', { method: 'POST', body: { partnership_id: partnershipId, state: state } });
    invalidate();
    return r.partnership;
  }

  async function report(agentId, reason, detail, partnershipId) {
    var r = await call('report', {
      method: 'POST',
      body: { agent_id: agentId, reason: reason, detail: detail || null, partnership_id: partnershipId || null },
    });
    invalidate();
    return r;
  }

  /* ══════════════════════════════════════════════════════════════════
     GUEST SIDE · referral capture
     ══════════════════════════════════════════════════════════════════ */

  /* Reads ?ref=CODE&listing=ID, records the click, and remembers it
     across the sign-in round trip. Returns the agent's name so the page
     can say "Referred by Agent Kevin". The guest should always know.  */
  async function captureReferral() {
    var q       = new URLSearchParams(location.search);
    var code    = q.get('ref');
    var listing = q.get('listing');

    if (!code || !listing) return pendingReferral();

    var stored = { code: code, listing: listing, at: Date.now() };
    try { localStorage.setItem(REF_KEY, JSON.stringify(stored)); } catch (e) { warn('store', e); }

    try {
      var r = await call('track', {
        method: 'POST',
        anon: false,
        body: { ref_code: code, listing_id: listing, visitor_id: visitorId() },
      });
      if (r && r.ok && r.referral) {
        stored.agent_name = r.referral.agent_name;
        stored.pct        = r.referral.pct;
        stored.flat       = r.referral.flat;
        try { localStorage.setItem(REF_KEY, JSON.stringify(stored)); } catch (e) { /* noop */ }
        return stored;
      }
    } catch (e) { warn('track', e); }

    // Dead link: the partnership lapsed, or the code is wrong. The guest
    // sees a normal listing page. They never needed to know.
    clearReferral();
    return null;
  }

  function pendingReferral() {
    try {
      var raw = localStorage.getItem(REF_KEY);
      if (!raw) return null;
      var r = JSON.parse(raw);
      // 30 days, matching the ledger.
      if (Date.now() - (r.at || 0) > 30 * 864e5) { clearReferral(); return null; }
      return r;
    } catch (e) { return null; }
  }

  function clearReferral() {
    try { localStorage.removeItem(REF_KEY); } catch (e) { /* noop */ }
  }

  /* ══════════════════════════════════════════════════════════════════
     FORMATTING · shared so three pages cannot drift
     ══════════════════════════════════════════════════════════════════ */

  function money(n) {
    return 'KES ' + Number(n || 0).toLocaleString('en-KE', { maximumFractionDigits: 0 });
  }

  function rateLabel(pct, flat) {
    if (flat != null) return money(flat) + ' per booking';
    if (pct  != null) return pct + '% per booking';
    return ', ';
  }

  /* The verification clock. Colour carries the urgency so copy doesn't
     have to shout. Green for most of the month; it only turns when it
     actually matters.                                                  */
  function clockTone(days) {
    if (days == null)  return { tone: 'verified', label: 'Verified' };
    if (days < 0)      return { tone: 'expired',  label: 'Verification overdue' };
    if (days <= 3)     return { tone: 'urgent',   label: days === 0 ? 'Last day to verify' : days + ' days left' };
    if (days <= 10)    return { tone: 'warn',     label: days + ' days left' };
    return { tone: 'calm', label: days + ' days to verify' };
  }

  function escape(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ── export ─────────────────────────────────────────────────────── */
  global.ApaAgent = {
    me: me, signup: signup, uploadId: uploadId, request: request,
    availability: availability, calendarFor: calendarFor, link: link,

    inbox: inbox, respond: respond, setState: setState, report: report,

    captureReferral: captureReferral, pendingReferral: pendingReferral,
    clearReferral: clearReferral,

    money: money, rateLabel: rateLabel, clockTone: clockTone,
    escape: escape, iso: iso, visitorId: visitorId, invalidate: invalidate,
  };

})(typeof window !== 'undefined' ? window : this);
