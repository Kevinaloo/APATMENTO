/* ═══════════════════════════════════════════════════════════════════════
   CABANA · FLIGHT DESK — admin module
   cabana-flights-admin.js

   Runs inside admin.html. Reuses the console's own components (.card,
   .btn, .inp, .pill, .tabs) so it reads as part of the console rather
   than something bolted to the side.

   THE JOB
   ───────
   An operator opens a request, goes and prices it wherever they price
   it, and comes back here to type in what they found. Everything on this
   screen exists to make that round trip fast:

     · the queue is sorted by what will go cold first, not by recency
     · pasting "KQ310 NBO 0945 DXB 1530" fills a leg
     · typing a net cost fills the sell price from the markup policy,
       and the margin updates as you type
     · publishing is one button and notifies the traveller

   WHAT THE TRAVELLER NEVER SEES
   ─────────────────────────────
   Net cost, margin, supplier reference and desk notes live on this
   screen only. They are not hidden by CSS — they are absent from the
   traveller's API response entirely (schema-flights.sql). This file is
   free to show them because it can only be reached with an admin JWT.

   Writes go through RLS on is_admin(). The UI gate is convenience; the
   database is the security.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var sb = null;
  var atlas = null;

  var state = {
    tab: 'open',
    rows: [],
    stats: null,
    open: null,        // the request being worked
    quotes: [],
    pax: [],
    settings: null,
    draft: null,       // quote being composed
    loaded: false
  };

  /* ── plumbing ──────────────────────────────────────────────────────── */

  function client() {
    if (sb) return sb;
    sb = window.sb || window.__sbClient || null;
    return sb;
  }
  function A() { atlas = atlas || window.FDAtlas; return atlas; }

  function $(id) { return document.getElementById(id); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toast(m) {
    if (typeof window.toast === 'function') { window.toast(m); return; }
    console.log('[flight-desk]', m);
  }
  function num(v) { return Number(v || 0).toLocaleString('en-KE', { maximumFractionDigits: 0 }); }
  function money(v, c) { return (c || 'KES') + ' ' + num(v); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function city(iata) {
    var a = A() && A().airport(iata);
    return a ? a.city : (iata || '—');
  }
  function airlineName(iata) {
    var a = A() && A().airline(iata);
    return a ? a.name : '';
  }

  function ago(iso) {
    var s = Math.round((Date.now() - new Date(iso)) / 1000);
    if (s < 60) return s + 's';
    if (s < 3600) return Math.floor(s / 60) + 'm';
    if (s < 86400) return Math.floor(s / 3600) + 'h';
    return Math.floor(s / 86400) + 'd';
  }

  /* Minutes until the SLA bites, negative once it has. */
  function slaLeft(r) {
    if (!r.sla_due_at) return null;
    return Math.round((new Date(r.sla_due_at) - Date.now()) / 60000);
  }

  var STATUS = {
    new:             ['New', 'p-warn'],
    working:         ['Working', 'p-info'],
    quoted:          ['Quoted', 'p-ok'],
    selected:        ['Chosen', 'p-ok'],
    payment_pending: ['Awaiting payment', 'p-warn'],
    confirmed:       ['Paid', 'p-ok'],
    ticketed:        ['Ticketed', 'p-ok'],
    completed:       ['Flown', 'p-mute'],
    cancelled:       ['Cancelled', 'p-mute'],
    expired:         ['Expired', 'p-mute'],
    unable:          ['No fare', 'p-bad']
  };

  var TABS = [
    ['open',     'Open'],
    ['new',      'New'],
    ['working',  'Working'],
    ['quoted',   'Quoted'],
    ['selected', 'Chosen'],
    ['ticketed', 'Ticketed'],
    ['all',      'Everything']
  ];

  /* ══════════════════════════════════════════════════════════════════════
     LOAD
  ══════════════════════════════════════════════════════════════════════ */

  function load() {
    var c = client();
    if (!c) { render(); return; }

    c.rpc('fd_desk_stats').then(function (r) {
      state.stats = (r && r.data && r.data.ok) ? r.data : null;
      renderStats();
      badge();
    });

    var q = c.from('flight_requests').select('*').order('priority', { ascending: false })
             .order('created_at', { ascending: false }).limit(200);

    if (state.tab === 'open') {
      q = c.from('flight_requests').select('*')
           .in('status', ['new', 'working', 'quoted', 'selected', 'payment_pending', 'confirmed'])
           .order('priority', { ascending: false })
           .order('created_at', { ascending: false }).limit(200);
    } else if (state.tab !== 'all') {
      q = c.from('flight_requests').select('*').eq('status', state.tab)
           .order('created_at', { ascending: false }).limit(200);
    }

    q.then(function (r) {
      if (r.error) { toast('Could not load the desk: ' + r.error.message); return; }
      state.rows = r.data || [];
      state.loaded = true;
      render();
    });

    if (!state.settings) {
      c.from('flight_desk_settings').select('*').eq('id', 1).single().then(function (r) {
        if (r.data) state.settings = r.data;
      });
    }
  }

  /* The sidebar count is the number of requests actually waiting on us,
     not the number of open rows: a quoted request is the traveller's move,
     not ours, and counting it here would keep the badge permanently lit. */
  function badge() {
    var el = document.getElementById('b-flights');
    if (!el) return;
    var s = state.stats;
    var n = s ? (s.new + s.working) : 0;
    el.textContent = n || '';
    el.className = 'nav-b ' + (s && s.overdue ? 'bad' : (n ? 'warn' : ''));
    el.style.display = n ? 'grid' : 'none';
  }

  function renderStats() {
    var el = $('fdx-stats');
    if (!el) return;
    var s = state.stats;
    if (!s) { el.innerHTML = ''; return; }

    function stat(label, value, sub, tone) {
      return '<div class="card"><div class="stat-l">' + esc(label) + '</div>' +
             '<div class="stat-v' + (tone ? ' ' + tone : '') + '">' + value + '</div>' +
             (sub ? '<div class="stat-s">' + esc(sub) + '</div>' : '') + '</div>';
    }

    el.innerHTML = [
      stat('Waiting on us', s.new + s.working, s.overdue ? s.overdue + ' past SLA' : 'all within SLA',
           s.overdue ? 'bad' : ''),
      stat('Quoted, undecided', s.quoted, 'traveller is choosing'),
      stat('Chosen', s.selected, 'ready to ticket'),
      stat('Margin, 30 days', money(s.margin_30d), 'on chosen options'),
      stat('Booked, 30 days', money(s.booked_30d), s.conversion + '% of requests convert')
    ].join('');
  }

  /* ══════════════════════════════════════════════════════════════════════
     QUEUE
  ══════════════════════════════════════════════════════════════════════ */

  function render() {
    var sec = $('s-flights');
    if (!sec) return;

    if (!sec.dataset.built) {
      sec.innerHTML =
        '<div class="hd"><div><h1>Flight <em>desk</em></h1>' +
        '<p>Requests from travellers waiting to be priced. Sorted by what goes cold first, ' +
        'not by what arrived last.</p></div>' +
        '<div class="hd-act">' +
          '<button class="btn btn-g btn-sm" onclick="FDAdmin.syncAtlas()">Sync airport atlas</button>' +
          '<button class="btn btn-g btn-sm" onclick="FDAdmin.settings()">Desk settings</button>' +
          '<button class="btn btn-p btn-sm" onclick="FDAdmin.reload()">Refresh</button>' +
        '</div></div>' +
        '<div class="grid g4" id="fdx-stats" style="margin-bottom:16px"></div>' +
        '<div class="tabs" id="fdx-tabs"></div>' +
        '<div id="fdx-list"></div>' +
        '<div id="fdx-modal"></div>';
      sec.dataset.built = '1';
      renderStats();
    }

    $('fdx-tabs').innerHTML = TABS.map(function (t) {
      return '<button class="tab' + (state.tab === t[0] ? ' on' : '') +
             '" onclick="FDAdmin.tab(\'' + t[0] + '\')">' + esc(t[1]) + '</button>';
    }).join('');

    var list = $('fdx-list');
    if (!state.loaded) {
      list.innerHTML = '<div class="card"><div class="skel" style="height:64px"></div></div>'.repeat(3);
      return;
    }
    if (!state.rows.length) {
      list.innerHTML = '<div class="card"><div class="empty">' +
        '<div class="empty-t">Nothing here</div>' +
        '<div class="empty-s">No requests in this state. When a traveller submits one it lands at the top.</div>' +
        '</div></div>';
      return;
    }

    list.innerHTML = '<div class="card" style="padding:0;overflow:hidden">' +
      state.rows.map(rowHtml).join('') + '</div>';
  }

  function rowHtml(r) {
    var st = STATUS[r.status] || [r.status, 'p-mute'];
    var left = slaLeft(r);
    var late = left !== null && left < 0 && ['new', 'working'].indexOf(r.status) >= 0;
    var pax = r.adults + r.children + r.infants;

    var slaTag = '';
    if (['new', 'working'].indexOf(r.status) >= 0 && left !== null) {
      slaTag = late
        ? '<span class="pill p-bad">' + Math.abs(left) + 'm over</span>'
        : '<span class="pill p-mute">' + left + 'm left</span>';
    }

    return '<div class="fdx-row" onclick="FDAdmin.open(\'' + r.id + '\')" ' +
      'style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-bottom:1px solid var(--line);cursor:pointer' +
      (late ? ';box-shadow:inset 3px 0 0 var(--bad,#FF4D6D)' : '') + '">' +

      '<div style="min-width:96px">' +
        '<div style="font-family:var(--font-data,monospace);font-size:12.5px;font-weight:600">' + esc(r.ref) + '</div>' +
        '<div style="font-size:11px;color:var(--ink-4)">' + esc(ago(r.created_at)) + ' ago</div>' +
      '</div>' +

      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:14px;font-weight:600">' +
          esc(r.origin_iata) + ' &rarr; ' + esc(r.dest_iata || '?') +
          ' <span style="font-weight:400;color:var(--ink-3)">' +
            esc(city(r.origin_iata)) + ' to ' + esc(city(r.dest_iata)) + '</span>' +
        '</div>' +
        '<div style="font-size:11.5px;color:var(--ink-4);margin-top:3px">' +
          esc(r.depart_date) + (r.return_date ? ' &ndash; ' + esc(r.return_date) : ' &middot; one way') +
          ' &middot; ' + pax + ' pax &middot; ' + esc(r.cabin.replace('_', ' ')) +
          (r.date_flex !== 'exact' ? ' &middot; flexible ' + esc(r.date_flex) : '') +
        '</div>' +
      '</div>' +

      '<div style="min-width:150px;font-size:12px;color:var(--ink-3)">' +
        esc(r.contact_name) +
        '<div style="font-size:11px;color:var(--ink-4)">' +
          esc(r.contact_phone || r.contact_email || '') + '</div>' +
      '</div>' +

      '<div style="display:flex;gap:6px;align-items:center;flex-shrink:0">' +
        slaTag + '<span class="pill ' + st[1] + '">' + esc(st[0]) + '</span>' +
      '</div>' +
    '</div>';
  }

  /* ══════════════════════════════════════════════════════════════════════
     THE WORKSPACE
  ══════════════════════════════════════════════════════════════════════ */

  function openRequest(id) {
    var c = client();
    if (!c) return;
    var r = state.rows.filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    state.open = r;

    Promise.all([
      c.from('flight_quotes').select('*').eq('request_id', id).order('sort_order'),
      c.from('flight_passengers').select('*').eq('request_id', id).order('sort_order'),
      c.from('flight_events').select('*').eq('request_id', id).order('created_at', { ascending: false }).limit(30)
    ]).then(function (res) {
      state.quotes = (res[0] && res[0].data) || [];
      state.pax    = (res[1] && res[1].data) || [];
      state.events = (res[2] && res[2].data) || [];
      renderWorkspace();
    });
  }

  function renderWorkspace() {
    var r = state.open;
    if (!r) return;
    var pax = r.adults + r.children + r.infants;
    var st = STATUS[r.status] || [r.status, 'p-mute'];
    var travellerUrl = location.origin + '/flights?ref=' + encodeURIComponent(r.ref) +
                       '&t=' + encodeURIComponent(r.access_token || '');

    var h = '';
    h += '<div class="fdx-ov" onclick="if(event.target===this)FDAdmin.close()" ' +
         'style="position:fixed;inset:0;z-index:400;background:rgba(0,0,0,.6);overflow-y:auto;padding:24px 16px">';
    h += '<div style="max-width:900px;margin:0 auto;background:var(--bg-2,#12172B);border:1px solid var(--line);border-radius:18px;overflow:hidden">';

    /* header */
    h += '<div style="padding:20px 22px;border-bottom:1px solid var(--line);display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap">';
    h += '<div><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
           '<span style="font-family:var(--font-data,monospace);font-size:19px;font-weight:600">' + esc(r.ref) + '</span>' +
           '<span class="pill ' + st[1] + '">' + esc(st[0]) + '</span></div>';
    h += '<div style="font-size:14px;margin-top:8px">' +
           '<b>' + esc(r.origin_iata) + ' &rarr; ' + esc(r.dest_iata || '?') + '</b> &middot; ' +
           esc(city(r.origin_iata)) + ' to ' + esc(city(r.dest_iata)) + '</div>';
    h += '<div style="font-size:12.5px;color:var(--ink-3);margin-top:5px">' +
           esc(r.depart_date) + (r.return_date ? ' &ndash; ' + esc(r.return_date) : ' &middot; one way') +
           ' &middot; ' + r.adults + ' adult' + (r.adults > 1 ? 's' : '') +
           (r.children ? ', ' + r.children + ' child' + (r.children > 1 ? 'ren' : '') : '') +
           (r.infants ? ', ' + r.infants + ' infant' + (r.infants > 1 ? 's' : '') : '') +
           ' &middot; ' + esc(r.cabin.replace('_', ' ')) +
           (r.date_flex !== 'exact' ? ' &middot; flexible ' + esc(r.date_flex) + ' days' : ' &middot; fixed dates') +
         '</div></div>';
    h += '<button class="btn btn-g btn-sm" onclick="FDAdmin.close()">Close</button>';
    h += '</div>';

    /* traveller + brief */
    h += '<div style="padding:18px 22px;border-bottom:1px solid var(--line);display:grid;grid-template-columns:1fr 1fr;gap:18px">';
    h += '<div><div class="stat-l">Traveller</div>' +
         '<div style="font-size:14px;font-weight:600;margin-top:6px">' + esc(r.contact_name) + '</div>' +
         '<div style="font-size:12.5px;color:var(--ink-3);margin-top:4px">' +
           (r.contact_phone ? esc(r.contact_phone) + '<br>' : '') +
           (r.contact_email ? esc(r.contact_email) : '') + '</div>' +
         '<div style="font-size:11.5px;color:var(--ink-4);margin-top:6px">Prefers ' + esc(r.contact_channel) + '</div>';
    if (r.contact_phone) {
      var wa = String(r.contact_phone).replace(/[^0-9]/g, '');
      h += '<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">' +
           '<a class="btn btn-g btn-sm" target="_blank" rel="noopener" href="https://wa.me/' + wa +
             '?text=' + encodeURIComponent('Hello ' + r.contact_name + ', this is the Cabana flight desk about request ' + r.ref + '.') +
             '">WhatsApp</a>' +
           (r.contact_email ? '<a class="btn btn-g btn-sm" href="mailto:' + esc(r.contact_email) +
             '?subject=' + encodeURIComponent('Your flight request ' + r.ref) + '">Email</a>' : '') +
           '</div>';
    }
    h += '</div>';

    h += '<div><div class="stat-l">The brief</div><div style="font-size:12.5px;color:var(--ink-3);margin-top:6px;line-height:1.65">';
    h += 'Bags: ' + (r.baggage_needed === 0 ? 'cabin only' : (r.baggage_needed || 1) + ' checked each') + '<br>';
    h += 'Stops: ' + (r.max_stops === null || r.max_stops === undefined ? 'no preference'
                      : r.max_stops === 0 ? 'non-stop only' : r.max_stops + ' max') + '<br>';
    if (r.budget_max) h += 'Ceiling: ' + money(r.budget_max, r.budget_currency) + '<br>';
    if (r.preferred_airlines && r.preferred_airlines.length) h += 'Prefers: ' + esc(r.preferred_airlines.join(', ')) + '<br>';
    h += '</div>';
    if (r.notes) {
      h += '<div style="margin-top:10px;padding:10px 12px;background:rgba(255,255,255,.04);border-radius:10px;' +
           'font-size:12.5px;line-height:1.6;color:var(--ink-2)">' + esc(r.notes) + '</div>';
    }
    h += '</div></div>';

    /* desk-only notes */
    h += '<div style="padding:18px 22px;border-bottom:1px solid var(--line)">';
    h += '<div class="stat-l">Desk notes <span style="color:var(--ink-4);text-transform:none;letter-spacing:0">' +
         '&middot; internal, never shown to the traveller</span></div>';
    h += '<textarea class="inp" id="fdx-notes" rows="2" style="margin-top:8px;width:100%" ' +
         'placeholder="Where you sourced it, who you spoke to, what to watch for on this itinerary…">' +
         esc(r.desk_notes || '') + '</textarea>';
    h += '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">' +
         '<button class="btn btn-g btn-sm" onclick="FDAdmin.saveNotes()">Save notes</button>' +
         '<button class="btn btn-g btn-sm" onclick="FDAdmin.setStatus(\'working\')">Mark as working</button>' +
         '<button class="btn btn-g btn-sm" onclick="FDAdmin.copyLink()">Copy traveller link</button>' +
         '<button class="btn btn-g btn-sm" onclick="FDAdmin.unable()">No fare found</button>' +
         '</div>';
    h += '<div style="font-size:11px;color:var(--ink-4);margin-top:8px;word-break:break-all">' + esc(travellerUrl) + '</div>';
    h += '</div>';

    /* quotes */
    h += '<div style="padding:18px 22px;border-bottom:1px solid var(--line)">';
    h += '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;flex-wrap:wrap">' +
         '<div class="stat-l" style="margin:0">Options (' + state.quotes.length + ')</div>' +
         '<div style="display:flex;gap:8px">' +
           '<button class="btn btn-g btn-sm" onclick="FDAdmin.newQuote()">Add option</button>' +
           (state.quotes.length ? '<button class="btn btn-p btn-sm" onclick="FDAdmin.publish()">Publish and notify</button>' : '') +
         '</div></div>';

    if (!state.quotes.length) {
      h += '<div style="padding:24px;text-align:center;border:1px dashed var(--line);border-radius:12px;color:var(--ink-4);font-size:13px">' +
           'No options yet. Price the route, then add what you found.</div>';
    } else {
      h += state.quotes.map(function (q) { return quoteRow(q, pax); }).join('');
    }
    h += '<div id="fdx-quote-form"></div>';
    h += '</div>';

    /* passengers, once we have them */
    if (state.pax.length) {
      h += '<div style="padding:18px 22px;border-bottom:1px solid var(--line)">';
      h += '<div class="stat-l">Travel documents (' + state.pax.length + ')</div>';
      h += '<div style="margin-top:10px">' + state.pax.map(function (p) {
        return '<div style="display:flex;gap:12px;padding:9px 0;border-bottom:1px solid var(--line);font-size:12.5px">' +
          '<span style="min-width:60px;color:var(--ink-4)">' + esc(p.pax_type) + '</span>' +
          '<span style="flex:1"><b>' + esc(p.given_name) + ' ' + esc(p.family_name) + '</b>' +
            (p.dob ? ' &middot; ' + esc(p.dob) : '') + (p.nationality ? ' &middot; ' + esc(p.nationality) : '') + '</span>' +
          '<span style="font-family:var(--font-data,monospace);color:var(--ink-3)">' + esc(p.passport_no || '—') + '</span>' +
        '</div>';
      }).join('') + '</div></div>';
    }

    /* ticketing, once an option is chosen */
    if (['selected', 'payment_pending', 'confirmed', 'ticketed'].indexOf(r.status) >= 0) {
      h += ticketPanel(r);
    }

    /* timeline */
    h += '<div style="padding:18px 22px">';
    h += '<div class="stat-l">History</div><div style="margin-top:10px">';
    (state.events || []).forEach(function (e) {
      h += '<div style="display:flex;gap:12px;padding:7px 0;font-size:12px">' +
           '<span style="min-width:64px;color:var(--ink-4)">' + esc(ago(e.created_at)) + ' ago</span>' +
           '<span style="flex:1"><b>' + esc(e.title) + '</b>' +
             (e.detail ? ' <span style="color:var(--ink-3)">' + esc(e.detail) + '</span>' : '') +
             (!e.visible_to_guest ? ' <span class="pill p-mute">internal</span>' : '') + '</span>' +
           '<span style="color:var(--ink-4)">' + esc(e.actor || '') + '</span></div>';
    });
    h += '</div></div>';

    h += '</div></div>';
    $('fdx-modal').innerHTML = h;
    document.body.style.overflow = 'hidden';
  }

  function quoteRow(q, pax) {
    var margin = (q.net_cost != null) ? (Number(q.price) - Number(q.net_cost)) : null;
    var pct = (margin != null && Number(q.net_cost) > 0)
      ? (margin / Number(q.net_cost) * 100).toFixed(1) + '%' : '';
    var legs = (q.outbound || []).concat(q.inbound || []);

    return '<div style="border:1px solid var(--line);border-radius:12px;padding:14px;margin-bottom:10px' +
      (q.status === 'selected' ? ';border-color:var(--ok,#4EE0C8);background:rgba(78,224,200,.05)' : '') + '">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">' +
        '<div style="flex:1;min-width:200px">' +
          '<div style="font-size:14px;font-weight:600">' + esc(q.airline_name) +
            (q.airline_iata ? ' <span style="color:var(--ink-4);font-weight:400">' + esc(q.airline_iata) + '</span>' : '') +
            (q.badge ? ' <span class="pill p-info">' + esc(q.badge.replace('_', ' ')) + '</span>' : '') +
            (q.status === 'selected' ? ' <span class="pill p-ok">chosen</span>' : '') +
            (q.status === 'draft' ? ' <span class="pill p-warn">draft</span>' : '') +
          '</div>' +
          '<div style="font-size:12px;color:var(--ink-3);margin-top:5px">' +
            legs.map(function (l) {
              return esc(l.flight_no || '') + ' ' + esc(l.from || '') + '&rarr;' + esc(l.to || '');
            }).join(' &middot; ') +
          '</div>' +
          '<div style="font-size:11.5px;color:var(--ink-4);margin-top:4px">' +
            (q.stops_out === 0 ? 'non-stop' : q.stops_out + ' stop') +
            (q.baggage_checked ? ' &middot; ' + esc(q.baggage_checked) + ' checked' : '') +
            (q.hold_until ? ' &middot; held to ' + new Date(q.hold_until).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '') +
          '</div>' +
        '</div>' +
        '<div style="text-align:right">' +
          '<div style="font-size:17px;font-weight:700">' + money(q.price, q.currency) + '</div>' +
          (q.net_cost != null
            ? '<div style="font-size:11.5px;color:var(--ink-4);margin-top:3px">net ' + num(q.net_cost) +
              ' &middot; <b style="color:var(--ok,#4EE0C8)">+' + num(margin) + '</b> ' + pct + '</div>'
            : '<div style="font-size:11.5px;color:var(--warn,#F5B12E);margin-top:3px">no net cost recorded</div>') +
          '<div style="font-size:11px;color:var(--ink-4);margin-top:2px">' + num(Math.round(q.price / (pax || 1))) + ' per traveller</div>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">' +
        '<button class="btn btn-g btn-sm" onclick="FDAdmin.editQuote(\'' + q.id + '\')">Edit</button>' +
        '<button class="btn btn-g btn-sm" onclick="FDAdmin.dropQuote(\'' + q.id + '\')">Remove</button>' +
      '</div>' +
    '</div>';
  }

  /* ── ticketing ─────────────────────────────────────────────────────── */

  function ticketPanel(r) {
    var chosen = state.quotes.filter(function (q) { return q.status === 'selected'; })[0];
    return '<div style="padding:18px 22px;border-bottom:1px solid var(--line)">' +
      '<div class="stat-l">Ticketing</div>' +
      (chosen ? '<div style="font-size:12.5px;color:var(--ink-3);margin-top:6px">Chosen: <b>' +
        esc(chosen.airline_name) + '</b> at ' + money(chosen.price, chosen.currency) + '</div>' : '') +
      '<div class="grid g2" style="margin-top:12px;gap:10px">' +
        '<div><label class="stat-l">Airline booking reference (PNR)</label>' +
          '<input class="inp" id="fdx-pnr" placeholder="e.g. 7KM2QX" style="margin-top:6px"></div>' +
        '<div><label class="stat-l">E-ticket numbers, comma separated</label>' +
          '<input class="inp" id="fdx-etkt" placeholder="706-1234567890" style="margin-top:6px"></div>' +
        '<div><label class="stat-l">Ticket PDF link</label>' +
          '<input class="inp" id="fdx-turl" placeholder="https://…" style="margin-top:6px"></div>' +
        '<div><label class="stat-l">Amount received</label>' +
          '<input class="inp" id="fdx-paid" type="number" placeholder="0" style="margin-top:6px"></div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">' +
        '<button class="btn btn-g btn-sm" onclick="FDAdmin.setStatus(\'payment_pending\')">Request payment</button>' +
        '<button class="btn btn-g btn-sm" onclick="FDAdmin.setStatus(\'confirmed\')">Mark paid</button>' +
        '<button class="btn btn-p btn-sm" onclick="FDAdmin.issueTicket()">Issue ticket</button>' +
      '</div></div>';
  }

  /* ══════════════════════════════════════════════════════════════════════
     QUOTE COMPOSER
  ══════════════════════════════════════════════════════════════════════ */

  function quoteForm(q) {
    var r = state.open;
    var s = state.settings || { markup_percent: 7.5, markup_min: 1500, round_to: 100, quote_hold_hours: 12 };
    q = q || {};
    var isEdit = !!q.id;

    var outTxt = legsToText(q.outbound);
    var inTxt  = legsToText(q.inbound);

    return '<div style="border:1px solid var(--acc,#4F6DFF);border-radius:12px;padding:16px;margin-top:12px">' +
      '<div style="font-size:13px;font-weight:600;margin-bottom:4px">' +
        (isEdit ? 'Edit option' : 'New option') + '</div>' +
      '<div style="font-size:11.5px;color:var(--ink-4);margin-bottom:14px">' +
        'One line per flight: <code>KQ310 NBO 0945 DXB 1530</code>. Add <code>+1</code> at the end ' +
        'if it lands the next day.</div>' +

      '<div class="grid g2" style="gap:10px">' +
        '<div><label class="stat-l">Airline</label>' +
          '<input class="inp" id="fdq-air" list="fdq-airlines" placeholder="Kenya Airways" ' +
          'value="' + esc(q.airline_name || '') + '" style="margin-top:6px"></div>' +
        '<div><label class="stat-l">Airline code</label>' +
          '<input class="inp" id="fdq-code" maxlength="2" placeholder="KQ" ' +
          'value="' + esc(q.airline_iata || '') + '" style="margin-top:6px;text-transform:uppercase"></div>' +
      '</div>' +

      '<div style="margin-top:10px"><label class="stat-l">Outbound</label>' +
        '<textarea class="inp" id="fdq-out" rows="2" style="margin-top:6px;font-family:var(--font-data,monospace);font-size:12.5px" ' +
        'placeholder="KQ310 NBO 0945 DXB 1530">' + esc(outTxt) + '</textarea></div>' +

      (r.return_date ? '<div style="margin-top:10px"><label class="stat-l">Return</label>' +
        '<textarea class="inp" id="fdq-in" rows="2" style="margin-top:6px;font-family:var(--font-data,monospace);font-size:12.5px" ' +
        'placeholder="KQ311 DXB 1700 NBO 2105">' + esc(inTxt) + '</textarea></div>' : '') +

      '<div class="grid g3" style="gap:10px;margin-top:10px">' +
        '<div><label class="stat-l">Net cost (what we pay)</label>' +
          '<input class="inp" id="fdq-net" type="number" inputmode="numeric" placeholder="0" ' +
          'value="' + esc(q.net_cost != null ? q.net_cost : '') + '" style="margin-top:6px" ' +
          'oninput="FDAdmin.recalc()"></div>' +
        '<div><label class="stat-l">Sell price (traveller sees)</label>' +
          '<input class="inp" id="fdq-price" type="number" inputmode="numeric" placeholder="0" ' +
          'value="' + esc(q.price != null ? q.price : '') + '" style="margin-top:6px" ' +
          'oninput="FDAdmin.recalc(true)"></div>' +
        '<div><label class="stat-l">Margin</label>' +
          '<div class="inp" id="fdq-margin" style="margin-top:6px;display:flex;align-items:center;color:var(--ok,#4EE0C8);font-weight:600">—</div></div>' +
      '</div>' +
      '<div style="font-size:11px;color:var(--ink-4);margin-top:6px">Policy: +' +
        s.markup_percent + '% or ' + num(s.markup_min) + ' minimum, rounded up to ' + num(s.round_to) + '.</div>' +

      '<div class="grid g3" style="gap:10px;margin-top:12px">' +
        '<div><label class="stat-l">Checked baggage</label>' +
          '<input class="inp" id="fdq-bagc" placeholder="23kg" value="' + esc(q.baggage_checked || '23kg') + '" style="margin-top:6px"></div>' +
        '<div><label class="stat-l">Cabin baggage</label>' +
          '<input class="inp" id="fdq-bagh" placeholder="7kg" value="' + esc(q.baggage_cabin || '7kg') + '" style="margin-top:6px"></div>' +
        '<div><label class="stat-l">Seats left</label>' +
          '<input class="inp" id="fdq-seats" type="number" placeholder="9" value="' + esc(q.seats_left != null ? q.seats_left : '') + '" style="margin-top:6px"></div>' +
      '</div>' +

      '<div class="grid g3" style="gap:10px;margin-top:10px">' +
        '<div><label class="stat-l">Badge</label>' +
          '<select class="inp" id="fdq-badge" style="margin-top:6px">' +
            ['', 'recommended', 'cheapest', 'fastest', 'best_value', 'flexible'].map(function (b) {
              return '<option value="' + b + '"' + (q.badge === b ? ' selected' : '') + '>' +
                     (b ? b.replace('_', ' ') : 'none') + '</option>';
            }).join('') + '</select></div>' +
        '<div><label class="stat-l">Fare brand</label>' +
          '<input class="inp" id="fdq-brand" placeholder="Basic / Flex" value="' + esc(q.fare_brand || '') + '" style="margin-top:6px"></div>' +
        '<div><label class="stat-l">Hold for (hours)</label>' +
          '<input class="inp" id="fdq-hold" type="number" value="' + (s.quote_hold_hours || 12) + '" style="margin-top:6px"></div>' +
      '</div>' +

      '<div style="display:flex;gap:14px;margin-top:12px;flex-wrap:wrap;font-size:12.5px">' +
        '<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="fdq-refund"' +
          (q.refundable ? ' checked' : '') + '> Refundable</label>' +
        '<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="fdq-change"' +
          (q.changeable ? ' checked' : '') + '> Changes allowed</label>' +
      '</div>' +

      '<div style="margin-top:10px"><label class="stat-l">Where you sourced it (internal)</label>' +
        '<input class="inp" id="fdq-src" placeholder="Never shown to the traveller" ' +
        'value="' + esc(q.sourced_via || '') + '" style="margin-top:6px"></div>' +

      '<div style="display:flex;gap:8px;margin-top:14px">' +
        '<button class="btn btn-p btn-sm" onclick="FDAdmin.saveQuote(' + (isEdit ? "'" + q.id + "'" : 'null') + ')">' +
          (isEdit ? 'Save option' : 'Add option') + '</button>' +
        '<button class="btn btn-g btn-sm" onclick="FDAdmin.cancelQuote()">Cancel</button>' +
      '</div>' +

      '<datalist id="fdq-airlines">' +
        (A() ? A().airlines.slice(0, 220).map(function (a) {
          return '<option value="' + esc(a.name) + '" data-iata="' + esc(a.iata) + '">';
        }).join('') : '') +
      '</datalist>' +
    '</div>';
  }

  /* "KQ310 NBO 0945 DXB 1530 +1" is how a human writes a flight down.
     Parsing it beats making an operator fill eight fields per leg. */
  function parseLegs(text, dateISO) {
    var out = [];
    String(text || '').split('\n').forEach(function (line) {
      line = line.trim();
      if (!line) return;
      var m = line.match(
        /^([A-Z0-9]{2}\s?\d{1,4})\s+([A-Z]{3})\s+(\d{1,2}:?\d{2})\s+([A-Z]{3})\s+(\d{1,2}:?\d{2})\s*(\+\d)?/i);
      if (!m) return;
      var t = function (v) {
        v = v.replace(':', '');
        return v.slice(0, v.length - 2).padStart(2, '0') + ':' + v.slice(-2);
      };
      var depT = t(m[3]), arrT = t(m[5]);
      var plus = m[6] ? parseInt(m[6].replace('+', ''), 10) : 0;

      var dep = dateISO + 'T' + depT;
      var arrDate = dateISO;
      if (plus) {
        /* Date-only values must be moved in UTC. Using local midnight and
           then toISOString() loses the added day in UTC+ time zones. */
        var d = new Date(dateISO + 'T00:00:00Z');
        d.setUTCDate(d.getUTCDate() + plus);
        arrDate = d.toISOString().slice(0, 10);
      }
      var arr = arrDate + 'T' + arrT;

      var mins = Math.round((new Date(arr) - new Date(dep)) / 60000);
      out.push({
        flight_no: m[1].replace(/\s/g, '').toUpperCase(),
        from: m[2].toUpperCase(), to: m[4].toUpperCase(),
        dep: dep, arr: arr,
        duration_min: mins > 0 ? mins : null
      });
    });
    return out;
  }

  function legsToText(legs) {
    if (!legs || !legs.length) return '';
    return legs.map(function (l) {
      var d = (l.dep || '').slice(11, 16).replace(':', '');
      var a = (l.arr || '').slice(11, 16).replace(':', '');
      var depDay = Date.parse((l.dep || '').slice(0, 10) + 'T00:00:00Z');
      var arrDay = Date.parse((l.arr || '').slice(0, 10) + 'T00:00:00Z');
      var dayDelta = Number.isFinite(depDay) && Number.isFinite(arrDay)
        ? Math.round((arrDay - depDay) / 86400000) : 0;
      var plus = dayDelta > 0 ? ' +' + dayDelta : '';
      return [l.flight_no, l.from, d, l.to, a].join(' ') + plus;
    }).join('\n');
  }

  /* ══════════════════════════════════════════════════════════════════════
     ACTIONS
  ══════════════════════════════════════════════════════════════════════ */

  var API = {
    tab: function (t) { state.tab = t; state.loaded = false; render(); load(); },
    reload: function () { state.loaded = false; load(); },
    open: openRequest,

    close: function () {
      state.open = null; state.draft = null;
      $('fdx-modal').innerHTML = '';
      document.body.style.overflow = '';
      load();
    },

    copyLink: function () {
      var r = state.open;
      var url = location.origin + '/flights?ref=' + encodeURIComponent(r.ref) +
                '&t=' + encodeURIComponent(r.access_token || '');
      if (navigator.clipboard) navigator.clipboard.writeText(url);
      toast('Traveller link copied');
    },

    saveNotes: function () {
      var c = client(), r = state.open;
      c.from('flight_requests').update({ desk_notes: $('fdx-notes').value })
        .eq('id', r.id).then(function (res) {
          if (res.error) { toast('Could not save: ' + res.error.message); return; }
          r.desk_notes = $('fdx-notes').value;
          toast('Notes saved');
        });
    },

    setStatus: function (st) {
      var c = client(), r = state.open;
      var patch = { status: st };
      if (st === 'working') patch.assigned_to = (window.ADMIN_EMAIL || 'desk');
      c.from('flight_requests').update(patch).eq('id', r.id).then(function (res) {
        if (res.error) { toast('Could not update: ' + res.error.message); return; }
        r.status = st;
        toast('Marked ' + st.replace('_', ' '));
        openRequest(r.id);
      });
    },

    unable: function () {
      var why = prompt('What should the traveller be told? They will see this.',
                       'Nothing on this route met our bar for the dates you gave us.');
      if (why === null) return;
      var c = client(), r = state.open;
      c.from('flight_requests')
        .update({ status: 'unable', close_reason: why, closed_at: new Date().toISOString() })
        .eq('id', r.id).then(function () {
          toast('Closed as no fare found');
          API.close();
        });
    },

    newQuote: function () {
      state.draft = {};
      $('fdx-quote-form').innerHTML = quoteForm({});
      API.recalc();
      $('fdx-quote-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    editQuote: function (id) {
      var q = state.quotes.filter(function (x) { return x.id === id; })[0];
      if (!q) return;
      state.draft = q;
      $('fdx-quote-form').innerHTML = quoteForm(q);
      API.recalc();
      $('fdx-quote-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    cancelQuote: function () { state.draft = null; $('fdx-quote-form').innerHTML = ''; },

    /* Typing a net cost fills the sell price from policy. Typing a sell
       price directly leaves it alone and just reports the margin, because
       an operator overriding the number means it on purpose. */
    recalc: function (manual) {
      var s = state.settings || { markup_percent: 7.5, markup_min: 1500, round_to: 100 };
      var netEl = $('fdq-net'), priceEl = $('fdq-price'), out = $('fdq-margin');
      if (!netEl || !priceEl || !out) return;
      var net = Number(netEl.value || 0);

      if (!manual && net > 0) {
        var uplift = Math.max(Number(s.markup_min), net * Number(s.markup_percent) / 100);
        var rt = Number(s.round_to) || 1;
        priceEl.value = Math.ceil((net + uplift) / rt) * rt;
      }
      var price = Number(priceEl.value || 0);
      if (net > 0 && price > 0) {
        var m = price - net;
        out.textContent = num(m) + '  (' + (m / net * 100).toFixed(1) + '%)';
        out.style.color = m <= 0 ? 'var(--bad,#FF4D6D)' : 'var(--ok,#4EE0C8)';
      } else {
        out.textContent = '—';
      }
    },

    saveQuote: function (id) {
      var c = client(), r = state.open;
      var price = Number($('fdq-price').value || 0);
      if (!price) { toast('A sell price is required'); return; }
      var name = ($('fdq-air').value || '').trim();
      if (!name) { toast('Which airline?'); return; }

      var code = ($('fdq-code').value || '').trim().toUpperCase();
      if (!code && A()) {
        var hit = A().airlines.filter(function (a) {
          return a.name.toLowerCase() === name.toLowerCase();
        })[0];
        if (hit) code = hit.iata;
      }

      var outLegs = parseLegs($('fdq-out') ? $('fdq-out').value : '', r.depart_date);
      var inLegs  = ($('fdq-in') && r.return_date) ? parseLegs($('fdq-in').value, r.return_date) : [];

      var sum = function (legs) {
        if (!legs.length) return null;
        var a = new Date(legs[0].dep), b = new Date(legs[legs.length - 1].arr);
        var m = Math.round((b - a) / 60000);
        return m > 0 ? m : null;
      };

      var hold = Number($('fdq-hold').value || 12);
      var pax = r.adults + r.children + r.infants;

      var row = {
        request_id: r.id,
        airline_name: name,
        airline_iata: code || null,
        outbound: outLegs, inbound: inLegs,
        stops_out: Math.max(0, outLegs.length - 1),
        stops_in: Math.max(0, inLegs.length - 1),
        duration_out: sum(outLegs), duration_in: sum(inLegs),
        cabin: r.cabin,
        fare_brand: $('fdq-brand').value.trim() || null,
        baggage_checked: $('fdq-bagc').value.trim() || null,
        baggage_cabin: $('fdq-bagh').value.trim() || null,
        refundable: $('fdq-refund').checked,
        changeable: $('fdq-change').checked,
        price: price,
        price_per_pax: Math.round(price / (pax || 1)),
        currency: (state.settings && state.settings.default_currency) || 'KES',
        net_cost: $('fdq-net').value ? Number($('fdq-net').value) : null,
        sourced_via: $('fdq-src').value.trim() || null,
        seats_left: $('fdq-seats').value ? Number($('fdq-seats').value) : null,
        badge: $('fdq-badge').value || null,
        hold_until: new Date(Date.now() + hold * 3600000).toISOString(),
        status: 'draft',
        sort_order: state.quotes.length + 1,
        created_by: window.ADMIN_EMAIL || 'desk'
      };

      var p = id
        ? c.from('flight_quotes').update(row).eq('id', id)
        : c.from('flight_quotes').insert(row);

      p.then(function (res) {
        if (res.error) { toast('Could not save: ' + res.error.message); return; }
        toast(id ? 'Option updated' : 'Option added');
        state.draft = null;
        openRequest(r.id);
      });
    },

    dropQuote: function (id) {
      if (!confirm('Remove this option?')) return;
      var c = client(), r = state.open;
      c.from('flight_quotes').delete().eq('id', id).then(function () {
        toast('Option removed');
        openRequest(r.id);
      });
    },

    publish: function () {
      var c = client(), r = state.open;
      c.rpc('fd_publish_quotes', { p_request: r.id }).then(function (res) {
        var d = res && res.data;
        if (!d || !d.ok) { toast('Could not publish: ' + ((d && d.error) || 'unknown')); return; }
        fetch('/api/flight-desk?action=notify-quoted', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ref: r.ref })
        }).catch(function () {});
        toast(d.quotes + ' option(s) published. Traveller notified.');
        openRequest(r.id);
      });
    },

    issueTicket: function () {
      var c = client(), r = state.open;
      var pnr = ($('fdx-pnr').value || '').trim();
      if (!pnr) { toast('A booking reference is required'); return; }
      var chosen = state.quotes.filter(function (q) { return q.status === 'selected'; })[0];
      if (!chosen) { toast('No option has been chosen yet'); return; }

      var tickets = ($('fdx-etkt').value || '').split(',')
                      .map(function (x) { return x.trim(); }).filter(Boolean);
      var paid = Number($('fdx-paid').value || 0);

      c.rpc('fd_new_ref', { p_prefix: 'CBK' }).then(function (rr) {
        var bookingRef = (rr && rr.data) || ('CBK-' + Date.now().toString(36).toUpperCase());
        return c.from('flight_bookings').insert({
          ref: bookingRef, request_id: r.id, quote_id: chosen.id, user_id: r.user_id,
          pnr: pnr, eticket_numbers: tickets.length ? tickets : null,
          ticket_url: ($('fdx-turl').value || '').trim() || null,
          airline_name: chosen.airline_name,
          itinerary: { outbound: chosen.outbound, inbound: chosen.inbound },
          amount: chosen.price, currency: chosen.currency,
          amount_paid: paid,
          payment_status: paid >= Number(chosen.price) ? 'paid' : (paid > 0 ? 'partial' : 'unpaid'),
          status: 'ticketed',
          net_cost: chosen.net_cost,
          issued_at: new Date().toISOString()
        });
      }).then(function (res) {
        if (res && res.error) { toast('Could not save booking: ' + res.error.message); return; }
        return c.from('flight_requests')
          .update({ status: 'ticketed', ticketed_at: new Date().toISOString() })
          .eq('id', r.id);
      }).then(function () {
        fetch('/api/flight-desk?action=notify-ticketed', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ref: r.ref })
        }).catch(function () {});
        toast('Ticket issued and the traveller notified');
        openRequest(r.id);
      });
    },

    /* Reference data refresh. The browser already holds the full atlas,
       so this is just an upsert of what is in memory — no migration, no
       download, and safe to run whenever the atlas file is regenerated. */
    syncAtlas: function () {
      var c = client();
      if (!A()) { toast('Atlas file has not loaded'); return; }
      toast('Syncing reference data…');

      var apBlob = A().airports.map(function (a) {
        return [a.iata, String(a.name).replace(/\|/g, '/'), String(a.city).replace(/\|/g, '/'),
                String(a.country).replace(/\|/g, '/'), a.cc, a.continent,
                a.lat, a.lng, a.rank].join('|');
      }).join('\n');

      var alBlob = A().airlines.map(function (a) {
        return [a.iata, String(a.name).replace(/\|/g, '/'), a.cc || ''].join('|');
      }).join('\n');

      c.rpc('fd_load_airports', { p_blob: apBlob }).then(function (r1) {
        return c.rpc('fd_load_airlines', { p_blob: alBlob }).then(function (r2) {
          var a = (r1 && r1.data) || {}, b = (r2 && r2.data) || {};
          if (a.ok === false || b.ok === false) { toast('Sync refused: admin only'); return; }
          toast('Reference data synced: ' + (a.total || '?') + ' airports, ' + (b.total || '?') + ' airlines');
        });
      });
    },

    settings: function () {
      var c = client();
      var s = state.settings || {};
      var h = '<div class="fdx-ov" onclick="if(event.target===this)FDAdmin.closeSettings()" ' +
        'style="position:fixed;inset:0;z-index:400;background:rgba(0,0,0,.6);overflow-y:auto;padding:24px 16px">' +
        '<div style="max-width:600px;margin:0 auto;background:var(--bg-2,#12172B);border:1px solid var(--line);border-radius:18px;padding:22px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
          '<h2 style="font-size:18px">Desk settings</h2>' +
          '<button class="btn btn-g btn-sm" onclick="FDAdmin.closeSettings()">Close</button></div>' +

        '<label style="display:flex;gap:9px;align-items:center;margin-bottom:16px;font-size:13.5px">' +
          '<input type="checkbox" id="fds-open"' + (s.desk_open ? ' checked' : '') + '> Desk is open and accepting requests</label>' +

        '<div class="grid g2" style="gap:10px">' +
          '<div><label class="stat-l">Response promise (minutes)</label>' +
            '<input class="inp" id="fds-sla" type="number" value="' + (s.sla_minutes || 45) + '" style="margin-top:6px"></div>' +
          '<div><label class="stat-l">Quote hold (hours)</label>' +
            '<input class="inp" id="fds-hold" type="number" value="' + (s.quote_hold_hours || 12) + '" style="margin-top:6px"></div>' +
          '<div><label class="stat-l">Markup percent</label>' +
            '<input class="inp" id="fds-pct" type="number" step="0.1" value="' + (s.markup_percent || 7.5) + '" style="margin-top:6px"></div>' +
          '<div><label class="stat-l">Minimum markup</label>' +
            '<input class="inp" id="fds-min" type="number" value="' + (s.markup_min || 1500) + '" style="margin-top:6px"></div>' +
          '<div><label class="stat-l">Round prices up to</label>' +
            '<input class="inp" id="fds-round" type="number" value="' + (s.round_to || 100) + '" style="margin-top:6px"></div>' +
          '<div><label class="stat-l">Default currency</label>' +
            '<input class="inp" id="fds-ccy" value="' + esc(s.default_currency || 'KES') + '" style="margin-top:6px"></div>' +
        '</div>' +

        '<div style="margin-top:12px"><label class="stat-l">Hours shown on the page</label>' +
          '<input class="inp" id="fds-hours" value="' + esc(s.hours_label || '') + '" style="margin-top:6px"></div>' +

        '<label style="display:flex;gap:9px;align-items:center;margin-top:16px;font-size:13.5px">' +
          '<input type="checkbox" id="fds-aff"' + (s.affiliate_enabled ? ' checked' : '') +
          '> Show the self-service search below the desk</label>' +

        '<div style="font-size:11.5px;color:var(--ink-4);margin-top:14px;line-height:1.6">' +
          'Markup policy is used to suggest a sell price when you enter a net cost. ' +
          'You can always override it per option. None of these figures are readable ' +
          'by a traveller: this table is admin-only at the database level.</div>' +

        '<button class="btn btn-p" style="margin-top:18px;width:100%" onclick="FDAdmin.saveSettings()">Save settings</button>' +
        '</div></div>';
      $('fdx-modal').innerHTML = h;
      document.body.style.overflow = 'hidden';
    },

    closeSettings: function () {
      $('fdx-modal').innerHTML = '';
      document.body.style.overflow = '';
    },

    saveSettings: function () {
      var c = client();
      var patch = {
        desk_open: $('fds-open').checked,
        sla_minutes: Number($('fds-sla').value || 45),
        quote_hold_hours: Number($('fds-hold').value || 12),
        markup_percent: Number($('fds-pct').value || 7.5),
        markup_min: Number($('fds-min').value || 1500),
        round_to: Number($('fds-round').value || 100),
        default_currency: ($('fds-ccy').value || 'KES').toUpperCase(),
        hours_label: $('fds-hours').value,
        affiliate_enabled: $('fds-aff').checked,
        updated_at: new Date().toISOString()
      };
      c.from('flight_desk_settings').update(patch).eq('id', 1).then(function (res) {
        if (res.error) { toast('Could not save: ' + res.error.message); return; }
        state.settings = Object.assign(state.settings || {}, patch);
        toast('Settings saved');
        API.closeSettings();
      });
    }
  };

  window.FDAdmin = API;
  window.flightsLoad = load;

  /* Keep the sidebar count honest without opening the section. Cheap: one
     RPC that returns counts, paused while the tab is hidden. */
  function pollBadge() {
    var c = client();
    if (!c || document.hidden) return;
    c.rpc('fd_desk_stats').then(function (r) {
      if (r && r.data && r.data.ok) { state.stats = r.data; badge(); }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(pollBadge, 1500); });
  } else {
    setTimeout(pollBadge, 1500);
  }
  setInterval(pollBadge, 60000);

  /* Exposed for tests. */
  window.__fdParseLegs = parseLegs;
  window.__fdLegsToText = legsToText;
})();
