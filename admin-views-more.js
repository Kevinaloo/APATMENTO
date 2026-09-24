/* ═══════════════════════════════════════════════════════════════════
   CABANA · OPERATIONS CONSOLE · desks, growth and system views
   Safety · Food · Cabana Match · Agents · Ambassadors · Leads ·
   Advertising · Messaging · Audience · Health · Audit · Team
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  var CX = global.CX; if (!CX || !CX.ops) return;
  var html = CX.html, raw = CX.raw, set = CX.set, icon = CX.icon, $ = CX.$, $$ = CX.$$;
  var n = CX.n, num = CX.num, money = CX.money, moneyC = CX.moneyC, compact = CX.compact, ago = CX.ago, fdt = CX.fdt, fdate = CX.fdate, human = CX.human;
  var rpc = CX.rpc, toast = CX.toast, confirm = CX.confirm, form = CX.form, svc = CX.svc;
  var O = CX.ops, on = O.on, pageHd = O.pageHd, wireOpeners = O.wireOpeners;

  function tabBar(v, list, active) {
    return CX.tabs(list, active);
  }
  function wireTabs(v, fallback) {
    on(v.el, '[data-tab]', 'click', function (el) { var t = el.getAttribute('data-tab'); v.setQ({ tab: t === fallback ? null : t }); v.refresh(); });
  }
  function mapsLink(lat, lng) { return 'https://www.google.com/maps?q=' + encodeURIComponent(lat + ',' + lng); }
  function waLink(phone) {
    var d = String(phone || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.charAt(0) === '0') d = '254' + d.slice(1);
    else if (d.length === 9 && /^[17]/.test(d)) d = '254' + d;
    return 'https://wa.me/' + d;
  }
  CX.waLink = waLink;

  /* ════════════════════════════════════════════════════════════════
     SAFETY
     ════════════════════════════════════════════════════════════════ */
  var STABS = [['sos', 'SOS'], ['checkin', 'Check-in issues'], ['disputes', 'Disputes'], ['uploads', 'Uploads'], ['reviews', 'Reviews'], ['violations', 'Chat safety'], ['cards', 'Host cards']];
  function safetyAct(kind, id, action, note) { return rpc('admin_safety_action', { p_kind: kind, p_id: String(id), p_action: action, p_note: note || null }); }
  CX.view('safety', {
    title: 'Safety',
    render: function (v) {
      var tab = v.q.tab || 'sos';
      set(v.el, html`${pageHd('Trust', 'Safety', 'Emergencies, arrival problems, disputes and content that needs a human decision.')}${CX.skeleton('list')}`);
      return rpc('admin_safety').then(function (s) {
        if (!v.alive()) return;
        var openSos = (s.sos || []).filter(function (x) { return x.status === 'open' || x.status === 'acknowledged'; }).length;
        var openCk = (s.checkin || []).filter(function (x) { return ['resolved', 'dismissed'].indexOf(x.status) < 0; }).length;
        var openDs = (s.disputes || []).filter(function (x) { return ['resolved', 'dismissed'].indexOf(x.status) < 0; }).length;
        var pendUp = (s.uploads || []).filter(function (x) { return x.status === 'pending' || !x.status; }).length;
        var counts = { sos: openSos, checkin: openCk, disputes: openDs, uploads: pendUp, reviews: (s.reviews || []).length, violations: (s.violations || []).length, cards: (s.cards || []).filter(function (c) { return !c.voided; }).length };
        if (!v.q.tab && !openSos) tab = openCk ? 'checkin' : openDs ? 'disputes' : pendUp ? 'uploads' : 'sos';
        set(v.el, html`${pageHd('Trust', 'Safety', openSos ? html`<span class="bad-t strong">${num(openSos)} SOS alert${openSos === 1 ? '' : 's'} open.</span> Someone may need help right now.` : 'Emergencies, arrival problems, disputes and content that needs a human decision.')}
          ${tabBar(v, STABS.map(function (t) { return [t[0], t[1], counts[t[0]], ['sos', 'checkin', 'disputes', 'uploads'].indexOf(t[0]) > -1]; }), tab)}<div data-sbody></div>`);
        wireTabs(v, 'sos');
        var body = $('[data-sbody]', v.el);
        var list, act = function (kind, id, action, prompt, tone) {
          if (!prompt) return safetyAct(kind, id, action).then(function () { toast('Updated', 'ok'); CX.pulseNow(true); v.refresh(); });
          return confirm({ title: prompt, tone: tone || 'brand', confirm: human(action), reason: { label: 'Note for the record', required: /reject|dismiss|false/.test(action) },
            onConfirm: function (f) { return safetyAct(kind, id, action, f.reason).then(function () { toast('Updated', 'ok'); CX.pulseNow(true); v.refresh(); }); } });
        };
        if (tab === 'sos') {
          list = s.sos || [];
          set(body, list.length ? html`<div class="col" style="gap:10px">${list.map(function (a) { var live = a.status === 'open' || a.status === 'acknowledged'; return html`
            <div class="card ${a.status === 'open' ? 'glow' : ''}" style="${a.status === 'open' ? 'border-color:rgba(255,90,124,.4)' : ''}"><div class="row wrap" style="align-items:flex-start;gap:14px">
              <span class="li-ic ${live ? 'bad' : ''}" style="width:42px;height:42px">${icon('siren')}</span>
              <div class="grow"><div class="row wrap"><b style="color:var(--ink-1);font-size:14.5px">${human(a.category)} emergency</b>${CX.pill(a.status, a.status === 'open' ? 'p-bad' : null)}<span class="muted" style="font-size:12px">${fdt(a.created_at)} · ${ago(a.created_at)}</span></div>
                <div class="soft mt-s" style="font-size:13px">${a.display_name || 'Unknown'}${a.phone ? ' · ' + a.phone : ''}${a.email ? ' · ' + a.email : ''}</div>
                ${a.note ? html`<div class="note mt-s">${a.note}</div>` : ''}
                <div class="muted mt-s" style="font-size:12px">${a.place_label ? a.place_label + ' · ' : ''}${a.latitude != null ? html`<a href="${mapsLink(a.latitude, a.longitude)}" target="_blank" rel="noopener">${icon('pin')} Open map</a> (±${num(a.accuracy_m)} m, ${a.location_source})` : 'No location shared'}${a.origin_page ? ' · from ' + a.origin_page : ''}</div>
                ${a.resolution ? html`<div class="muted mt-s" style="font-size:12px">Resolution: ${a.resolution}</div>` : ''}</div>
              <div class="t-act">${a.phone ? html`<a class="btn btn-sm btn-ok" href="tel:${String(a.phone).replace(/[^+\d]/g, '')}">${icon('phone')}Call</a>` : ''}
                ${a.status === 'open' ? html`<button class="btn btn-sm btn-p" data-sos="${a.id}" data-a="acknowledge">Acknowledge</button>` : ''}
                ${live ? html`<button class="btn btn-sm btn-ok" data-sos="${a.id}" data-a="resolved">Resolve</button><button class="btn btn-sm btn-q" data-sos="${a.id}" data-a="false_alarm">False alarm</button>` : ''}
                ${a.user_id ? html`<button class="btn btn-sm btn-g" data-person="${a.user_id}">${icon('user')}</button>` : ''}</div></div></div>`; })}</div>`
            : html`<div class="card">${CX.empty('No SOS alerts', 'When a guest presses SOS it appears here instantly, and the console alerts you.', 'shieldCheck', true)}</div>`);
          on(body, '[data-sos]', 'click', function (el) { var a = el.getAttribute('data-a'); if (a === 'acknowledge') CX.busy(el, function () { return act('sos', el.getAttribute('data-sos'), a); }); else act('sos', el.getAttribute('data-sos'), a, a === 'resolved' ? 'Resolve this alert' : 'Mark as false alarm', a === 'resolved' ? 'ok' : 'warn'); });
        } else if (tab === 'checkin') {
          list = s.checkin || [];
          set(body, list.length ? html`<div class="card flush"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Issue</th><th>Stay</th><th class="hide-s">People</th><th>Status</th><th></th></tr></thead><tbody>${list.map(function (c) { return html`
            <tr><td style="max-width:340px"><div class="t-main">${human(c.code)}</div><div class="t-sub" style="white-space:normal">${c.text || '—'}</div>
              <div class="t-sub">${c.phase ? human(c.phase) + ' · ' : ''}${c.hours != null ? num(c.hours) + 'h to check-in · ' : ''}${c.distance != null ? num(c.distance) + ' m from the door · ' : ''}${c.prefer_refund ? 'wants a refund' : ''}</div>
              ${c.photo ? html`<a href="${CX.safeUrl(c.photo)}" target="_blank" rel="noopener" class="t-sub">${icon('image')} Photo evidence</a>` : ''}</td>
            <td>${c.listing_id ? html`<button class="link-btn" data-listing="${c.listing_id}">${c.listing || 'Listing'}</button>` : '—'}${c.booking_id ? html`<div><button class="link-btn t-sub" data-booking="stay:${c.booking_id}">Open booking</button></div>` : ''}<div class="t-sub">${ago(c.at)}</div></td>
            <td class="hide-s">${c.guest_id ? html`<button class="link-btn" data-person="${c.guest_id}">${c.guest || 'Guest'}</button>` : '—'}<div class="t-sub">host: ${c.host_id ? html`<button class="link-btn" data-person="${c.host_id}">${c.host || 'Host'}</button>` : '—'}</div></td>
            <td>${CX.pill(c.status)}${c.fault ? html`<div class="t-sub">fault: ${human(c.fault)}</div>` : ''}${c.refund ? html`<div class="t-sub">refund ${money(c.refund)}</div>` : ''}</td>
            <td><div class="t-act">${['resolved', 'dismissed'].indexOf(c.status) < 0 ? html`<button class="btn btn-sm btn-ok" data-ck="${c.id}" data-a="resolved">Resolve</button>${c.status !== 'escalated' ? html`<button class="btn btn-sm btn-w" data-ck="${c.id}" data-a="escalated">Escalate</button>` : ''}<button class="btn btn-sm btn-q" data-ck="${c.id}" data-a="dismissed">Dismiss</button>` : ''}</div></td></tr>`; })}</tbody></table></div></div>`
            : html`<div class="card">${CX.empty('No check-in issues', 'Guests who cannot get in, or find the place not as listed, report it here.', 'checkCircle', true)}</div>`);
          on(body, '[data-ck]', 'click', function (el) { var a = el.getAttribute('data-a'); act('checkin', el.getAttribute('data-ck'), a, { resolved: 'Resolve this check-in issue', escalated: 'Escalate this issue', dismissed: 'Dismiss this issue' }[a], a === 'resolved' ? 'ok' : 'warn'); });
        } else if (tab === 'disputes') {
          list = s.disputes || [];
          set(body, list.length ? html`<div class="col" style="gap:10px">${list.map(function (d) { var open = ['resolved', 'dismissed'].indexOf(d.status) < 0; return html`
            <div class="card"><div class="row wrap" style="align-items:flex-start;gap:14px"><span class="li-ic ${open ? 'warn' : ''}">${icon('flag')}</span>
              <div class="grow"><div class="row wrap"><b style="color:var(--ink-1)">${human(d.category)}</b>${CX.pill(d.status)}<span class="muted" style="font-size:12px">${ago(d.at)}</span></div>
                <div class="soft mt-s" style="font-size:13px;white-space:pre-wrap">${d.description || ''}</div>
                <div class="muted mt-s" style="font-size:12px">Raised by ${d.raised_by ? html`<button class="link-btn" data-person="${d.raised_by}">${d.raised_name || 'member'}</button>` : '—'} against ${d.against_id ? html`<button class="link-btn" data-person="${d.against_id}">${d.against_name || 'member'}</button>` : '—'}${d.booking_id ? ' · booking ' + String(d.booking_id).slice(0, 12) : ''}</div>
                ${d.resolution || d.note ? html`<div class="note mt-s">${d.resolution || d.note}</div>` : ''}</div>
              <div class="t-act">${open ? html`<button class="btn btn-sm btn-ok" data-ds="${d.id}" data-a="resolved">Resolve</button><button class="btn btn-sm btn-q" data-ds="${d.id}" data-a="dismissed">Dismiss</button>` : html`<button class="btn btn-sm btn-g" data-ds="${d.id}" data-a="open">Reopen</button>`}</div></div></div>`; })}</div>`
            : html`<div class="card">${CX.empty('No disputes', '', 'flag', true)}</div>`);
          on(body, '[data-ds]', 'click', function (el) { var a = el.getAttribute('data-a'); act('dispute', el.getAttribute('data-ds'), a, { resolved: 'Resolve this dispute', dismissed: 'Dismiss this dispute', open: 'Reopen this dispute' }[a], a === 'resolved' ? 'ok' : 'warn'); });
        } else if (tab === 'uploads') {
          list = s.uploads || [];
          set(body, list.length ? html`<div class="lcards">${list.map(function (u) { var img = /^image\//.test(u.mime_type || '') || /\.(jpe?g|png|webp|gif|avif)$/i.test(u.url || u.path || ''); return html`
            <div class="lcard" style="cursor:default"><div class="lcard-img">${img && u.url ? html`<a href="${CX.safeUrl(u.url)}" target="_blank" rel="noopener"><img src="${CX.safeUrl(u.url)}" alt="" loading="lazy"/></a>` : html`<div class="ph">${icon('note')}</div>`}<div class="lcard-tags">${CX.pill(u.status || 'pending')}</div></div>
              <div class="lcard-b"><div class="lcard-t">${u.filename || 'Upload'}</div><div class="lcard-s">${u.owner_email || ''} · ${CX.bytes(u.size)}</div><div class="lcard-s">${ago(u.created_at)}</div>
              ${u.status === 'pending' || !u.status ? html`<div class="btn-row mt-s"><button class="btn btn-sm btn-ok" data-up="${u.id}" data-a="approved">Approve</button><button class="btn btn-sm btn-d" data-up="${u.id}" data-a="rejected">Reject</button></div>` : u.rejection_reason ? html`<div class="t-sub">${u.rejection_reason}</div>` : ''}</div></div>`; })}</div>`
            : html`<div class="card">${CX.empty('No uploads waiting', 'Documents and media partners upload for review land here.', 'image', true)}</div>`);
          on(body, '[data-up]', 'click', function (el) { var a = el.getAttribute('data-a'); if (a === 'approved') CX.busy(el, function () { return act('upload', el.getAttribute('data-up'), a); }); else act('upload', el.getAttribute('data-up'), a, 'Reject this upload', 'danger'); });
        } else if (tab === 'reviews') {
          list = s.reviews || [];
          set(body, list.length ? html`<div class="col" style="gap:10px">${list.map(function (r) { return html`<div class="card"><div class="row wrap" style="align-items:flex-start">
            <div class="grow"><div class="row wrap"><b style="color:var(--gold)">${'★'.repeat(Math.round(n(r.rating)))}<span class="muted">${'★'.repeat(5 - Math.round(n(r.rating)))}</span></b><b style="color:var(--ink-1)">${r.guest || 'Guest'}</b><span class="muted" style="font-size:12px">on ${r.listing_id ? html`<button class="link-btn" data-listing="${r.listing_id}">${r.listing || 'listing'}</button>` : r.listing || '—'} · ${ago(r.at)}</span></div>
              <div class="soft mt-s" style="font-size:13px">${r.text || html`<span class="muted">No written review</span>`}</div>${r.reply ? html`<div class="note mt-s">Host reply: ${r.reply}</div>` : ''}</div>
            <button class="btn btn-sm btn-d" data-rv="${r.id}">${icon('trash')}Remove</button></div></div>`; })}</div>` : html`<div class="card">${CX.empty('No reviews yet', '', 'star')}</div>`);
          on(body, '[data-rv]', 'click', function (el) { act('review', el.getAttribute('data-rv'), 'delete', 'Remove this review? The text is kept in the audit log.', 'danger'); });
        } else if (tab === 'violations') {
          list = s.violations || [];
          set(body, html`${(s.repeat_offenders || []).length ? html`<div class="callout warn mb">${icon('flag')}<div class="grow"><div class="strong">Repeat offenders, last 30 days</div><div class="chips mt-s">${s.repeat_offenders.map(function (o) { return html`<span class="chip" data-person="${o.user_id}">${o.user || 'member'}<span class="n">${num(o.n)}</span></span>`; })}</div></div></div>` : ''}
            <div class="card flush">${list.length ? html`<table class="tbl"><thead><tr><th>Member</th><th>What was caught</th><th class="num">When</th></tr></thead><tbody>${list.map(function (x) { return html`<tr class="click" data-person="${x.user_id}"><td class="t-main">${x.user || 'Member'}</td><td><div class="chips" style="gap:4px">${(x.categories || []).map(function (c) { return html`<span class="tag">${c}</span>`; })}</div><div class="t-sub">“${x.excerpt || ''}”</div></td><td class="num t-sub">${ago(x.at)}</td></tr>`; })}</tbody></table>`
              : CX.empty('Chat is clean', 'Attempts to take payment or contact off Cabana are caught and logged here.', 'message', true)}</div>`);
        } else {
          list = s.cards || [];
          set(body, list.length ? html`<div class="card flush"><table class="tbl"><thead><tr><th>Host</th><th>Card</th><th>Reason</th><th>Expires</th><th></th></tr></thead><tbody>${list.map(function (c) { return html`<tr><td><button class="link-btn" data-person="${c.host_id}">${c.host || 'Host'}</button></td><td>${CX.pill(c.card, c.card === 'red' ? 'p-bad' : 'p-warn')}</td><td class="t-sub" style="white-space:normal">${c.reason || ''}</td><td class="t-sub">${c.expires_at ? fdate(c.expires_at) : '—'}</td>
            <td><div class="t-act">${c.voided ? html`<span class="pill p-mute">Voided</span>` : html`<button class="btn btn-sm btn-q" data-card="${c.id}">Void</button>`}</div></td></tr>`; })}</tbody></table></div>` : html`<div class="card">${CX.empty('No host cards issued', 'Yellow and red cards for host no-shows and misconduct appear here.', 'flag', true)}</div>`);
          on(body, '[data-card]', 'click', function (el) { act('card', el.getAttribute('data-card'), 'void', 'Void this card', 'warn'); });
        }
        wireOpeners(body);
      });
    }
  });

  /* ════════════════════════════════════════════════════════════════
     FOOD
     ════════════════════════════════════════════════════════════════ */
  var FSTAT = [['live', 'Live now'], ['completed', 'Completed'], ['declined', 'Declined'], ['expired', 'Expired'], ['cancelled', 'Cancelled'], ['all', 'All']];
  CX.view('food', {
    title: 'Food orders',
    render: function (v) {
      var st = v.q.tab || 'live';
      set(v.el, html`${pageHd('Operations', 'Food orders', 'Every order moving through Cabana kitchens, live.')}${CX.skeleton('list')}`);
      return rpc('admin_food', { p_status: st, p_limit: 200 }).then(function (f) {
        if (!v.alive()) return;
        var c = f.counts || {}, td = f.today || {}, sp = f.speed || {};
        var liveN = ['requested', 'awaiting_payment', 'accepted', 'ready', 'on_the_way'].reduce(function (a, k) { return a + n(c[k]); }, 0);
        set(v.el, html`${pageHd('Operations', 'Food orders', 'Every order moving through Cabana kitchens. Live orders refresh with the rest of the console.', html`<button class="btn btn-g" data-reload>${icon('refresh')}Refresh</button>`)}
          <div class="grid g4 mb">
            <div class="mini"><div class="mini-l">Orders today</div><div class="mini-v">${num(td.orders)}</div><div class="mini-s">${num(td.completed)} delivered · ${num(td.declined)} lost</div></div>
            <div class="mini"><div class="mini-l">Value delivered today</div><div class="mini-v">${money(td.value)}</div></div>
            <div class="mini"><div class="mini-l">Kitchen speed · 30 days</div><div class="mini-v">${CX.dur(sp.accept_mins)}</div><div class="mini-s">to accept · ${CX.dur(sp.ready_mins)} to ready · ${CX.dur(sp.deliver_mins)} to deliver</div></div>
            <div class="mini"><div class="mini-l">Diner rating</div><div class="mini-v">${sp.rating ? n(sp.rating).toFixed(2) + ' ★' : '—'}</div></div></div>
          ${tabBar(v, FSTAT.map(function (t) { return [t[0], t[1], t[0] === 'live' ? liveN : t[0] === 'all' ? null : c[t[0]], t[0] === 'live']; }), st)}
          <div class="split"><div class="card flush">${(f.orders || []).length ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Order</th><th>Diner</th><th class="num">Total</th><th>Status</th><th></th></tr></thead><tbody>${f.orders.map(function (o) { return html`
              <tr class="click" data-booking="food:${o.id}"><td><div class="t-main">${o.kitchen || 'Kitchen'}</div><div class="t-sub mono">${o.ref} · ${num(o.items)} item${n(o.items) === 1 ? '' : 's'} · ${human(o.mode)}</div></td>
              <td><div class="t-main">${o.diner || 'Diner'}</div><div class="t-sub">${o.phone || ''}${o.address ? ' · ' + String(o.address).slice(0, 40) : ''}</div></td>
              <td class="num"><b>${money(o.total, o.currency)}</b><div class="t-sub">${human(o.pay)}</div></td>
              <td>${CX.pill(o.status)}<div class="t-sub">${ago(o.requested_at || o.created_at)}${o.eta ? ' · ETA ' + o.eta + 'm' : ''}</div>${o.decline_reason || o.cancel_reason ? html`<div class="t-sub">${o.decline_reason || o.cancel_reason}</div>` : ''}</td>
              <td><div class="t-act">${['requested', 'awaiting_payment', 'accepted', 'ready', 'on_the_way'].indexOf(o.status) > -1 ? html`<button class="btn btn-sm btn-d" data-cancel="${o.id}" data-total="${n(o.total)}" data-pay="${o.pay}">Cancel</button>` : ''}</div></td></tr>`; })}</tbody></table></div>`
              : CX.empty(st === 'live' ? 'No live orders' : 'No orders here', st === 'live' ? 'New orders appear the moment a diner checks out.' : '', 'utensils', st === 'live')}</div>
            <div class="card"><div class="card-hd"><div><div class="card-t">Kitchens</div><div class="card-s">${num((f.kitchens || []).length)} on Cabana</div></div></div>${(f.kitchens || []).length ? html`<div class="list">${f.kitchens.map(function (k) { var paused = k.paused_until && new Date(k.paused_until) > new Date(); return html`
              <div class="li click" data-listing="${k.listing_id}"><span class="li-ic ${k.accepts && !paused ? 'ok' : ''}">${icon('utensils')}</span><div class="li-b"><div class="li-t">${k.title}</div><div class="li-s">${k.city || ''} · ${num(k.completed)} of ${num(k.orders)} completed</div></div>
              ${paused ? html`<span class="pill p-warn">Paused</span>` : k.accepts ? html`<span class="pill dot p-ok">Open</span>` : html`<span class="pill p-mute">Closed</span>`}</div>`; })}</div>` : CX.empty('No kitchens yet', 'Add a restaurant from Listings.', 'utensils')}</div></div>`);
        wireTabs(v, 'live'); wireOpeners(v.el);
        on(v.el, '[data-reload]', 'click', function () { v.refresh(); });
        on(v.el, '[data-cancel]', 'click', function (el, e) {
          e.stopPropagation();
          var paidOnline = el.getAttribute('data-pay') !== 'cash' && el.getAttribute('data-pay') !== 'cod';
          confirm({ title: 'Cancel this order?', tone: 'danger', confirm: 'Cancel order', icon: 'ban', body: 'The kitchen and diner see it cancelled immediately.',
            amount: paidOnline ? { label: 'Refund owed to diner (KES)', value: el.getAttribute('data-total'), required: true, help: 'Enter 0 if nothing was paid.' } : null,
            reason: { label: 'Reason', required: true },
            onConfirm: function (x) { return rpc('admin_booking_action', { p_service: 'food', p_id: el.getAttribute('data-cancel'), p_action: 'cancel', p_reason: x.reason, p_amount: paidOnline ? n(x.amount) : null }).then(function () { toast('Order cancelled', 'ok'); v.refresh(); }); } });
        });
      });
    }
  });

  /* ════════════════════════════════════════════════════════════════
     CABANA MATCH
     ════════════════════════════════════════════════════════════════ */
  CX.view('match', {
    title: 'Cabana Match',
    render: function (v) {
      var tab = v.q.tab || 'requests';
      set(v.el, html`${pageHd('Operations', 'Cabana Match', 'Guests post what they need; opted-in hosts race to answer.')}${CX.skeleton('kpis')}`);
      var head = function (t, f) { var qy = CX.q(t).select('id', { count: 'exact', head: true }); return (f ? f(qy) : qy).then(function (r) { return r.count || 0; }); };
      return Promise.all([
        head('cabana_host_opt_ins', function (q) { return q.eq('opted_in', true); }), head('cabana_match_requests', function (q) { return q.eq('status', 'live'); }),
        head('cabana_match_responses'), head('cabana_interest'),
        tab === 'requests' ? CX.rows(CX.q('cabana_match_requests').select('*').order('created_at', { ascending: false }).limit(150)) :
        tab === 'hosts' ? CX.rows(CX.q('cabana_host_opt_ins').select('*').order('created_at', { ascending: false }).limit(300)) :
          CX.rows(CX.q('cabana_interest').select('id,user_id,email,role,created_at').order('created_at', { ascending: false }).limit(500))
      ]).then(function (r) {
        if (!v.alive()) return;
        var list = r[4] || [];
        var after = tab === 'requests' && list.length ? CX.rows(CX.q('cabana_match_responses').select('request_id').in('request_id', list.map(function (x) { return x.id; }))) : Promise.resolve([]);
        return after.then(function (resp) {
          var rc = {}; resp.forEach(function (x) { rc[x.request_id] = (rc[x.request_id] || 0) + 1; });
          set(v.el, html`${pageHd('Operations', 'Cabana Match', 'Guests post what they need; opted-in hosts race to answer with an offer.', html`<a class="btn btn-g" href="/cabana" target="_blank" rel="noopener">${icon('external')}Open Match</a>`)}
            <div class="grid g4 mb"><div class="mini"><div class="mini-l">Hosts opted in</div><div class="mini-v">${num(r[0])}</div></div><div class="mini"><div class="mini-l">Live requests</div><div class="mini-v">${num(r[1])}</div></div>
              <div class="mini"><div class="mini-l">Host responses</div><div class="mini-v">${num(r[2])}</div></div><div class="mini"><div class="mini-l">Waitlist sign-ups</div><div class="mini-v">${num(r[3])}</div></div></div>
            ${tabBar(v, [['requests', 'Guest requests'], ['hosts', 'Opted-in hosts'], ['interest', 'Waitlist']], tab)}
            <div class="card flush">${!list.length ? CX.empty('Nothing here yet', tab === 'requests' ? 'Requests appear as guests use Cabana Match.' : '', 'sparkles')
              : tab === 'requests' ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Guest</th><th>Where & when</th><th class="num">Budget</th><th class="num">Offers</th><th>Status</th><th></th></tr></thead><tbody>${list.map(function (x) { var left = x.expires_at ? Math.max(0, (new Date(x.expires_at) - Date.now()) / 60000) : 0; return html`
                <tr><td>${x.guest_id ? html`<button class="link-btn" data-person="${x.guest_id}">${x.guest_name || 'Guest'}</button>` : x.guest_name || 'Guest'}<div class="t-sub">${ago(x.created_at)}</div></td>
                <td><div class="t-main">${x.location || '—'}</div><div class="t-sub">${fdate(x.checkin_date)} → ${fdate(x.checkout_date)} · ${num(x.guests)} guest${n(x.guests) === 1 ? '' : 's'}${x.bedrooms ? ' · ' + num(x.bedrooms) + ' bed' : ''}</div></td>
                <td class="num">${x.max_price ? money(x.max_price) : '—'}</td><td class="num"><b>${num(rc[x.id] || 0)}</b></td>
                <td>${CX.pill(x.status)}${x.status === 'live' ? html`<div class="t-sub">${left < 60 ? Math.round(left) + 'm left' : Math.round(left / 60) + 'h left'}</div>` : ''}</td>
                <td><div class="t-act">${x.status === 'live' ? html`<button class="btn btn-sm btn-q" data-expire="${x.id}">Close</button>` : ''}</div></td></tr>`; })}</tbody></table></div>`
              : tab === 'hosts' ? html`<table class="tbl"><thead><tr><th>Listing</th><th>Host</th><th>Since</th><th>Status</th><th></th></tr></thead><tbody>${list.map(function (x) { return html`
                <tr><td>${x.listing_id ? html`<button class="link-btn" data-listing="${x.listing_id}">${x.listing_title || 'Listing'}</button>` : x.listing_title}<div class="t-sub">${human(x.listing_type || 'stay')}</div></td><td>${x.host_id ? html`<button class="link-btn" data-person="${x.host_id}">View host</button>` : '—'}</td>
                <td class="t-sub">${ago(x.opted_in ? x.opted_in_at : x.opted_out_at)}</td><td>${x.opted_in ? html`<span class="pill dot p-ok">In</span>` : html`<span class="pill p-mute">Out</span>`}</td>
                <td><div class="t-act">${x.opted_in ? html`<button class="btn btn-sm btn-q" data-opt="${x.id}" data-on="0">Remove</button>` : html`<button class="btn btn-sm btn-g" data-opt="${x.id}" data-on="1">Restore</button>`}</div></td></tr>`; })}</tbody></table>`
              : html`<table class="tbl"><thead><tr><th>Email</th><th>Role</th><th class="num">Joined</th></tr></thead><tbody>${list.map(function (x) { return html`<tr><td class="t-main">${x.email}</td><td><span class="tag">${x.role || 'guest'}</span></td><td class="num t-sub">${ago(x.created_at)}</td></tr>`; })}</tbody></table>`}</div>
            ${tab === 'interest' && list.length ? html`<div class="row mt"><button class="btn btn-g" data-exp>${icon('download')}Export waitlist</button></div>` : ''}`);
          wireTabs(v, 'requests'); wireOpeners(v.el);
          on(v.el, '[data-exp]', 'click', function () { CX.csv(list, [['email', 'Email'], ['role', 'Role'], ['created_at', 'Joined']], 'cabana-match-waitlist.csv'); });
          on(v.el, '[data-expire]', 'click', function (el) { confirm({ title: 'Close this request?', tone: 'warn', confirm: 'Close request', body: 'Hosts can no longer respond to it.', onConfirm: function () {
            return CX.rows(CX.q('cabana_match_requests').update({ status: 'expired', closed_at: new Date().toISOString() }).eq('id', el.getAttribute('data-expire')).select('id')).then(function () { CX.log('match.expire', 'match_request', el.getAttribute('data-expire')); toast('Request closed', 'ok'); v.refresh(); }); } }); });
          on(v.el, '[data-opt]', 'click', function (el) { var onv = el.getAttribute('data-on') === '1';
            CX.busy(el, function () { return CX.rows(CX.q('cabana_host_opt_ins').update(onv ? { opted_in: true, opted_out_at: null, opted_in_at: new Date().toISOString() } : { opted_in: false, opted_out_at: new Date().toISOString() }).eq('id', el.getAttribute('data-opt')).select('id'))
              .then(function () { CX.log(onv ? 'match.optin_restore' : 'match.optin_remove', 'match_optin', el.getAttribute('data-opt')); toast(onv ? 'Restored' : 'Removed from Match', 'ok'); v.refresh(); }); }); });
        });
      });
    }
  });

  /* ════════════════════════════════════════════════════════════════
     AGENTS
     ════════════════════════════════════════════════════════════════ */
  CX.view('agents', {
    title: 'Agents',
    render: function (v) {
      var st = v.q.tab || 'submitted';
      set(v.el, html`${pageHd('People', 'Agents', 'Agents start working the day they sign up and have 30 days to prove who they are. You confirm the document is genuine; hosts decide whether to work with them.')}${CX.skeleton('list')}`);
      return CX.api('/api/agents?action=kyc-review&status=' + encodeURIComponent(st)).then(function (j) {
        if (!v.alive()) return;
        var list = j.agents || [];
        set(v.el, html`${pageHd('People', 'Agents', 'Agents start working the day they sign up and have 30 days to prove who they are. You confirm the document is genuine; hosts decide whether to work with them.')}
          ${tabBar(v, [['submitted', 'Awaiting review', st === 'submitted' ? list.length : CX.counts.kyc, true], ['unverified', 'Not yet submitted'], ['rejected', 'Rejected'], ['verified', 'Verified']], st)}
          <div class="card flush">${list.length ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Agent</th><th class="hide-s">Contact</th><th>Clock</th><th>Status</th><th></th></tr></thead><tbody>${list.map(function (a) {
            var days = Math.ceil((new Date(a.kyc_deadline) - Date.now()) / 864e5), overdue = days < 0 && a.kyc_status !== 'verified';
            return html`<tr><td><div class="cell">${CX.avatar(a.full_name, 'sm')}<div><button class="link-btn t-main" data-person="${a.id}">${a.full_name || 'Agent'}</button><div class="t-sub">/${a.slug || '—'}${n(a.report_count) ? ' · ' + num(a.report_count) + ' reports' : ''}</div></div></div></td>
              <td class="hide-s"><div class="t-main">${a.email || ''}</div><div class="t-sub">${a.phone || ''}</div></td>
              <td>${a.kyc_status === 'verified' ? html`<span class="pill p-ok">${icon('check')}Verified</span>` : overdue ? html`<span class="pill p-bad">${num(-days)}d overdue</span>` : html`<span class="pill p-info">${num(days)}d left</span>`}</td>
              <td>${CX.pill(a.kyc_status)}${a.suspended ? html` <span class="pill p-bad">Suspended</span>` : ''}${a.kyc_reject_reason ? html`<div class="t-sub" style="white-space:normal;max-width:240px">${a.kyc_reject_reason}</div>` : ''}</td>
              <td><div class="t-act">${a.kyc_status === 'submitted' ? html`<button class="btn btn-sm btn-g" data-doc="${a.id}">${icon('eye')}Document</button><button class="btn btn-sm btn-ok" data-ag="${a.id}" data-d="verify">Verify</button><button class="btn btn-sm btn-d" data-ag="${a.id}" data-d="reject">Reject</button>` : ''}
                ${a.kyc_status !== 'verified' && a.kyc_status !== 'submitted' ? html`<button class="btn btn-sm btn-g" data-ag="${a.id}" data-d="extend">+30 days</button>` : ''}
                ${a.suspended ? html`<button class="btn btn-sm btn-ok" data-ag="${a.id}" data-d="reinstate">Reinstate</button>` : html`<button class="btn btn-sm btn-q" data-ag="${a.id}" data-d="suspend">Suspend</button>`}</div></td></tr>`; })}</tbody></table></div>`
            : CX.empty(st === 'submitted' ? 'No documents waiting' : 'Nobody here', st === 'submitted' ? 'Agents who upload an ID appear here for review.' : '', 'idcard', st === 'submitted')}</div>`);
        wireTabs(v, 'submitted'); wireOpeners(v.el);
        function post(body) { return CX.api('/api/agents?action=kyc-review', { body: body }); }
        on(v.el, '[data-doc]', 'click', function (el) {
          CX.busy(el, function () {
            return CX.rows(CX.q('agent_documents').select('storage_path,doc_type,uploaded_at').eq('agent_id', el.getAttribute('data-doc')).order('uploaded_at', { ascending: false }).limit(1)).then(function (docs) {
              if (!docs.length) { toast('No document on file', 'warn'); return; }
              return CX.client().storage.from('agent-documents').createSignedUrl(docs[0].storage_path, 120).then(function (r) {
                if (r.error) throw r.error;
                CX.log('agent.document_viewed', 'agent', el.getAttribute('data-doc'), { doc_type: docs[0].doc_type });
                global.open(r.data.signedUrl, '_blank', 'noopener');
              });
            });
          });
        });
        on(v.el, '[data-ag]', 'click', function (el) {
          var id = el.getAttribute('data-ag'), d = el.getAttribute('data-d');
          if (d === 'verify') return CX.busy(el, function () { return post({ agent_id: id, decision: 'verify' }).then(function () { toast('Verified — they have been emailed', 'ok'); CX.pulseNow(true); v.refresh(); }); });
          if (d === 'reinstate') return CX.busy(el, function () { return post({ agent_id: id, decision: 'reinstate' }).then(function () { toast('Reinstated', 'ok'); v.refresh(); }); });
          if (d === 'extend') return confirm({ title: 'Give 30 more days?', confirm: 'Extend', icon: 'clock', body: 'Their verification clock is pushed back by 30 days.', onConfirm: function () { return post({ agent_id: id, decision: 'extend', days: 30 }).then(function () { toast('Clock extended', 'ok'); v.refresh(); }); } });
          if (d === 'reject') return confirm({ title: 'Reject this document?', tone: 'danger', confirm: 'Reject', icon: 'x', body: 'Your reason is emailed to them word for word — be specific and kind.',
            reason: { label: 'Reason they will read', required: true, placeholder: 'The photo was too blurred to read the ID number.' }, onConfirm: function (f) { return post({ agent_id: id, decision: 'reject', reason: f.reason }).then(function () { toast('Rejected — they have been told why', 'ok'); CX.pulseNow(true); v.refresh(); }); } });
          if (d === 'suspend') return confirm({ title: 'Suspend this agent?', tone: 'danger', confirm: 'Suspend', icon: 'pause', reason: { label: 'Internal reason', required: true }, onConfirm: function (f) { return post({ agent_id: id, decision: 'suspend', reason: f.reason }).then(function () { toast('Suspended', 'ok'); v.refresh(); }); } });
        });
      });
    }
  });

  /* ════════════════════════════════════════════════════════════════
     AMBASSADORS
     ════════════════════════════════════════════════════════════════ */
  CX.view('ambassadors', {
    title: 'Ambassadors',
    render: function (v) {
      var f = v.q.tab || 'all';
      set(v.el, html`${pageHd('People', 'Ambassadors', 'The roster is the access grant: an email here, confirmed by its owner, opens the ambassador dashboard.')}${CX.skeleton('list')}`);
      function amb(action, body) { return CX.api('/api/ambassadors?action=' + action, body ? { body: body } : {}); }
      return amb('roster').then(function (j) {
        return amb('review', { op: 'signals' }).then(function (s) { return [j, s]; }, function () { return [j, { signals: [] }]; });
      }).then(function (r) {
        if (!v.alive()) return;
        var roster = r[0].roster || [], sigs = r[1].signals || [];
        var live = roster.filter(function (x) { return !x.revoked_at; }), joined = live.filter(function (x) { return x.ambassador; });
        var flagged = joined.filter(function (x) { return x.ambassador.status === 'suspended' || n(x.ambassador.risk_score) >= 40; });
        var match = function (x) { var a = x.ambassador; return f === 'active' ? !x.revoked_at && a && a.status === 'active' : f === 'pending' ? !x.revoked_at && !a : f === 'flagged' ? !x.revoked_at && a && (a.status === 'suspended' || n(a.risk_score) >= 40) : f === 'revoked' ? !!x.revoked_at : true; };
        var list = roster.filter(match);
        set(v.el, html`${pageHd('People', 'Ambassadors', 'The roster is the access grant: an email here, confirmed by its owner, opens the ambassador dashboard.', html`<button class="btn btn-p" data-invite>${icon('plus')}Invite ambassador</button>`)}
          <div class="grid g4 mb"><div class="mini"><div class="mini-l">On the roster</div><div class="mini-v">${num(live.length)}</div></div><div class="mini"><div class="mini-l">Joined</div><div class="mini-v">${num(joined.length)}</div></div>
            <div class="mini"><div class="mini-l">Invited, not joined</div><div class="mini-v">${num(live.length - joined.length)}</div></div><div class="mini"><div class="mini-l">Need a look</div><div class="mini-v ${flagged.length ? 'warn-t' : ''}">${num(flagged.length)}</div></div></div>
          ${tabBar(v, [['all', 'Everyone', roster.length], ['active', 'Active'], ['pending', 'Not joined'], ['flagged', 'Flagged', flagged.length, true], ['revoked', 'Revoked']], f)}
          <div class="card flush">${list.length ? html`<table class="tbl"><thead><tr><th>Ambassador</th><th class="hide-s">Region</th><th>Status</th><th class="hide-s">Joined</th><th></th></tr></thead><tbody>${list.map(function (x) { var a = x.ambassador; return html`
            <tr><td><div class="cell">${CX.avatar(x.full_name || x.email, 'sm')}<div><div class="t-main">${x.full_name || String(x.email).split('@')[0]}</div><div class="t-sub">${x.email}</div></div></div></td>
            <td class="hide-s">${x.region || '—'}${x.monthly_target ? html`<div class="t-sub">target ${num(x.monthly_target)}/mo</div>` : ''}</td>
            <td>${x.revoked_at ? html`<span class="pill p-bad">Revoked</span>${x.revoke_reason ? html`<div class="t-sub">${x.revoke_reason}</div>` : ''}` : !a ? html`<span class="pill p-info">Invited</span>` : a.status === 'suspended' ? html`<span class="pill p-bad">Suspended</span>` : n(a.risk_score) >= 40 ? html`<span class="pill p-warn">Risk ${num(a.risk_score)}</span>` : html`<span class="pill dot p-ok">Active</span>`}</td>
            <td class="hide-s t-sub">${a ? ago(a.enrolled_at) : 'never signed in'}</td>
            <td><div class="t-act">${x.revoked_at ? html`<button class="btn btn-sm btn-ok" data-re="${x.email}">Re-invite</button>` : html`${a ? (a.status === 'suspended' ? html`<button class="btn btn-sm btn-ok" data-sus="${a.id}" data-on="0">Reinstate</button>` : html`<button class="btn btn-sm btn-q" data-sus="${a.id}" data-on="1">Suspend</button>`) : ''}<button class="btn btn-sm btn-d" data-rev="${x.email}">Revoke</button>`}</div></td></tr>`; })}</tbody></table>`
            : CX.empty('Nobody here', 'Invite someone to get started.', 'award')}</div>
          <div class="section-t"><div><h2>Open fraud signals</h2><p>Weighted observations that freeze accrual for review. They never delete a lead or reverse commission.</p></div></div>
          <div class="card flush">${sigs.length ? html`<table class="tbl"><tbody>${sigs.map(function (g) { var who = roster.filter(function (x) { return x.ambassador && x.ambassador.id === g.ambassador_id; })[0]; return html`
            <tr><td><div class="t-main">${g.signal === 'claim_velocity' ? 'Claiming faster than anyone meets people' : human(g.signal)}</div><div class="t-sub">${who ? who.full_name || who.email : g.ambassador_id} · weight ${num(g.weight)} · ${ago(g.created_at)}</div></td><td><div class="t-act"><button class="btn btn-sm btn-g" data-sig="${g.id}">Resolve</button></div></td></tr>`; })}</tbody></table>`
            : CX.empty('Nothing flagged', '', 'shieldCheck', true)}</div>`);
        wireTabs(v, 'all');
        on(v.el, '[data-invite]', 'click', function () {
          form({ title: 'Invite an ambassador', sub: 'They sign in at cabana.africa/ambassadors with exactly this email.', icon: 'award', fields: [
            { name: 'email', type: 'email', label: 'Email', required: true, full: true }, { name: 'full_name', label: 'Full name' }, { name: 'region', label: 'Region', placeholder: 'e.g. Westlands' },
            { name: 'monthly_target', type: 'number', label: 'Monthly target', value: 10 }, { name: 'note', type: 'textarea', label: 'Personal note', rows: 3 }], submit: 'Send invitation', submitIcon: 'send',
            onSubmit: function (x) { return amb('invite', x).then(function (res) { toast(res && res.emailed === false ? x.email + ' is on the roster, but no email went out (' + (res.email_reason || 'send failed') + '). Tell them to sign in at cabana.africa/ambassadors.' : 'Invitation sent to ' + x.email, res && res.emailed === false ? 'warn' : 'ok', { ms: 8000 }); v.refresh(); }); } });
        });
        on(v.el, '[data-re]', 'click', function (el) { CX.busy(el, function () { return amb('invite', { email: el.getAttribute('data-re') }).then(function () { toast('Access restored', 'ok'); v.refresh(); }); }); });
        on(v.el, '[data-rev]', 'click', function (el) { confirm({ title: 'Revoke access for ' + el.getAttribute('data-rev') + '?', tone: 'danger', confirm: 'Revoke', icon: 'ban', body: 'Their dashboard closes and their links stop attributing. Commission already earned is untouched.', reason: { label: 'Reason', required: false },
          onConfirm: function (x) { return amb('revoke', { email: el.getAttribute('data-rev'), reason: x.reason }).then(function () { toast('Access revoked', 'ok'); v.refresh(); }); } }); });
        on(v.el, '[data-sus]', 'click', function (el) { var s1 = el.getAttribute('data-on') === '1';
          if (!s1) return CX.busy(el, function () { return amb('review', { op: 'reinstate', ambassador_id: el.getAttribute('data-sus') }).then(function () { toast('Reinstated', 'ok'); v.refresh(); }); });
          confirm({ title: 'Suspend this ambassador?', tone: 'warn', confirm: 'Suspend', icon: 'pause', body: 'Accrual freezes and links stop attributing. Reversible.', reason: { label: 'Reason', required: true },
            onConfirm: function (x) { return amb('review', { op: 'suspend', ambassador_id: el.getAttribute('data-sus'), reason: x.reason }).then(function () { toast('Suspended', 'ok'); v.refresh(); }); } }); });
        on(v.el, '[data-sig]', 'click', function (el) { confirm({ title: 'Resolve this signal?', body: 'It stops counting toward their risk score.', confirm: 'Resolve', reason: { label: 'Note', required: false },
          onConfirm: function (x) { return amb('review', { op: 'resolve-signal', signal_id: el.getAttribute('data-sig'), note: x.reason }).then(function () { toast('Signal resolved', 'ok'); v.refresh(); }); } }); });
      });
    }
  });

  /* ════════════════════════════════════════════════════════════════
     LISTING LEADS
     ════════════════════════════════════════════════════════════════ */
  CX.view('leads', {
    title: 'Listing leads',
    render: function (v) {
      var st = v.q.tab || 'pending';
      set(v.el, html`${pageHd('People', 'Listing leads', 'Owners who asked Cabana to list their place for them. Call, list, close.')}${CX.skeleton('list')}`);
      return CX.rows(CX.q('lazy_requests').select('*').order('created_at', { ascending: false }).limit(500)).then(function (all) {
        if (!v.alive()) return;
        var c = { pending: 0, contacted: 0, listed: 0, cancelled: 0 }; all.forEach(function (x) { c[x.status || 'pending'] = (c[x.status || 'pending'] || 0) + 1; });
        var list = st === 'all' ? all : all.filter(function (x) { return (x.status || 'pending') === st; });
        set(v.el, html`${pageHd('People', 'Listing leads', 'Owners who asked Cabana to list their place for them. Call, list, close.', html`<button class="btn btn-g" data-exp>${icon('download')}Export</button>`)}
          ${tabBar(v, [['pending', 'New', c.pending, true], ['contacted', 'Contacted', c.contacted], ['listed', 'Listed', c.listed], ['cancelled', 'Closed', c.cancelled], ['all', 'All', all.length]], st)}
          <div class="card flush">${list.length ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Owner</th><th>Wants to list</th><th class="hide-s">Notes</th><th>Status</th><th></th></tr></thead><tbody>${list.map(function (x) { var wa = waLink(x.phone); return html`
            <tr><td><div class="t-main">${x.name || '—'}</div><div class="t-sub">${x.phone ? wa ? html`<a href="${wa}" target="_blank" rel="noopener">${icon('message')} ${x.phone}</a>` : x.phone : ''} · ${ago(x.created_at)}</div></td>
            <td>${human(x.listing_type || 'Not specified')}${x.source ? html`<div class="t-sub">via ${x.source}</div>` : ''}</td><td class="hide-s t-sub" style="white-space:normal;max-width:300px">${x.notes || '—'}</td><td>${CX.pill(x.status || 'pending')}</td>
            <td><div class="t-act">${x.status !== 'contacted' && x.status !== 'listed' ? html`<button class="btn btn-sm btn-g" data-ls="${x.id}" data-s="contacted">Contacted</button>` : ''}${x.status !== 'listed' ? html`<button class="btn btn-sm btn-ok" data-ls="${x.id}" data-s="listed">Listed</button>` : ''}
              ${x.status !== 'cancelled' ? html`<button class="btn btn-sm btn-q btn-icon" title="Close" data-ls="${x.id}" data-s="cancelled">${icon('x')}</button>` : ''}</div></td></tr>`; })}</tbody></table></div>`
            : CX.empty(st === 'pending' ? 'No new leads' : 'Nothing here', st === 'pending' ? 'The “list it for me” form on Cabana feeds this queue.' : '', 'phone', st === 'pending')}</div>`);
        wireTabs(v, 'pending');
        on(v.el, '[data-exp]', 'click', function () { CX.csv(all, [['name', 'Name'], ['phone', 'Phone'], ['listing_type', 'Type'], ['notes', 'Notes'], ['status', 'Status'], ['source', 'Source'], ['created_at', 'Submitted']], 'cabana-listing-leads.csv'); });
        on(v.el, '[data-ls]', 'click', function (el) {
          var s = el.getAttribute('data-s'), id = el.getAttribute('data-ls');
          CX.busy(el, function () { return CX.rows(CX.q('lazy_requests').update({ status: s, updated_at: new Date().toISOString() }).eq('id', id).select('id')).then(function () {
            CX.log('lead.' + s, 'lazy_request', id); CX.pulseNow(true);
            if (s === 'listed') toast('Marked listed', 'ok', { action: { label: 'Create the listing', fn: function () { CX.go('listings?new=1'); } } }); else toast('Updated', 'ok');
            v.refresh(); }); });
        });
      });
    }
  });

  /* ════════════════════════════════════════════════════════════════
     ADVERTISING
     ════════════════════════════════════════════════════════════════ */
  var AUD = null, AUD_AT = 0;
  function audience(force) {
    if (!global.ApaAudience) return Promise.reject(new Error('The audience module did not load.'));
    if (AUD && !force && Date.now() - AUD_AT < 5 * 60000) return Promise.resolve(AUD);
    return global.ApaAudience.build(30).then(function (a) { AUD = a; AUD_AT = Date.now(); return a; });
  }
  var FORMATS = [['window', 'Window hero'], ['video', 'Video hero'], ['carousel', 'Carousel banner'], ['split', 'Split banner'], ['native', 'Native card'], ['sticky', 'Sticky corner']];
  function adStats(a) {
    var by = {};
    (a && a.events || []).forEach(function (e) { if (e.event !== 'ad_viewable' && e.event !== 'ad_click') return; var id = e.props && e.props.campaign_id; if (!id) return; var k = by[id] = by[id] || { v: 0, c: 0 }; if (e.event === 'ad_viewable') k.v++; else k.c++; });
    return by;
  }
  function uploadAd(file, prefix) {
    var shrink = /^image\//.test(file.type) && global.CabanaUploader && global.CabanaUploader.shrink ? global.CabanaUploader.shrink(file) : Promise.resolve(file);
    return shrink.then(function (blob) {
      var ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      var key = prefix + '-' + Date.now() + '-' + CX.uid() + '.' + ext;
      return CX.client().storage.from('ads-media').upload(key, blob, { upsert: false, contentType: blob.type || file.type, cacheControl: '31536000' }).then(function (r) {
        if (r.error) throw r.error; return CX.client().storage.from('ads-media').getPublicUrl(key).data.publicUrl;
      });
    });
  }
  function creativePreview(o) {
    var media = CX.safeUrl(o.media_url);
    return html`<div class="creative" style="background:${raw(CX.esc(o.theme_gradient || 'linear-gradient(135deg,#7A3BFF,#4C7DFF)'))}">${media && /\.(jpe?g|png|webp|avif|gif)(\?|$)/i.test(media) ? html`<img src="${media}" alt=""/>` : media && /\.(mp4|webm|mov)(\?|$)/i.test(media) ? html`<video src="${media}" muted autoplay loop playsinline></video>` : ''}<div class="shade"></div>
      <div class="c-in"><div style="font:600 10px var(--f-d);letter-spacing:.14em;text-transform:uppercase;opacity:.8">${o.advertiser || 'Advertiser'} · Sponsored</div><div style="font:620 20px/1.2 var(--f-d);margin:6px 0 4px;letter-spacing:-.02em">${o.headline || 'Your headline'}</div>
      <div style="font-size:12.5px;opacity:.85">${o.sub_text || ''}</div><div class="row mt-s">${o.cta_text ? html`<span style="background:#fff;color:#0A0A14;padding:7px 14px;border-radius:99px;font:650 12px var(--f-b)">${o.cta_text}</span>` : ''}${o.price_display ? html`<b>${o.price_display}</b>` : ''}</div></div></div>`;
  }
  function campaignEditor(c, a, done) {
    c = c || {}; var isNew = !c.id;
    var slots = {}; (Array.isArray(c.page_targets) ? c.page_targets : []).forEach(function (p) { slots[p] = 1; });
    var surfaces = (global.ApaAudience && global.ApaAudience.SURFACES) || [];
    if ((c.page_targets || []).indexOf('all') > -1) surfaces.forEach(function (s) { slots[s.page] = 1; });
    var fields = [
      { name: 'advertiser', label: 'Advertiser', required: true, value: c.advertiser }, { name: 'format', label: 'Format', type: 'select', value: c.format || 'window', options: FORMATS, required: true },
      { name: 'headline', label: 'Headline', value: c.headline, full: true }, { name: 'sub_text', label: 'Supporting line', value: c.sub_text || c.sub, full: true },
      { name: 'cta_text', label: 'Button text', value: c.cta_text, placeholder: 'Book now' }, { name: 'cta_url', label: 'Button link', value: c.cta_url, type: 'url' },
      { name: 'media_url', label: 'Image or video', value: c.media_url, type: 'url', full: true, help: html`Paste a URL or <button type="button" class="link-btn" data-upmedia>upload a file</button> (images are compressed automatically).<input type="file" accept="image/*,video/mp4,video/webm" hidden data-upfile/>` },
      { name: 'poster_url', label: 'Video poster', value: c.poster_url, type: 'url' }, { name: 'price_display', label: 'Price tag', value: c.price_display, placeholder: 'From KES 4,500' },
      { name: 'theme_gradient', label: 'Background', value: c.theme_gradient, placeholder: 'linear-gradient(135deg,#7A3BFF,#4C7DFF)', full: true },
      { name: 'status', label: 'Status', type: 'select', value: c.status || 'live', options: [['live', 'Live'], ['paused', 'Paused'], ['draft', 'Draft']] }, { name: 'priority', label: 'Priority (1–10)', type: 'number', min: 1, max: 10, value: c.priority || 5 },
      { name: 'budget', label: 'Budget (KES)', type: 'number', min: 0, value: c.budget }, { name: 'start_date', label: 'Starts', type: 'date', value: c.start_date }, { name: 'end_date', label: 'Ends', type: 'date', value: c.end_date },
      { name: 'segs', label: 'Audience segments', type: 'chips', full: true, options: ((a && a.segments) || []).filter(function (s) { return !s.suppress; }).map(function (s) { return s.name; }), value: ((a && a.segments) || []).filter(function (s) { return (c.target_segments || []).indexOf(s.id) > -1; }).map(function (s) { return s.name; }) }
    ];
    return CX.modal({ title: isNew ? 'New campaign' : 'Edit campaign', sub: 'Only surfaces that really carry this format can be selected — an ad aimed at a slot that does not exist never runs.', icon: 'megaphone', wide: 'x',
      body: html`<div class="split" style="gap:22px"><form class="form-grid" onsubmit="return false" data-cf>${fields.map(CX.fieldHTML)}<div class="fld full"><label class="fld-l">Surfaces <span class="opt"><button type="button" class="link-btn" data-all>All</button> · <button type="button" class="link-btn" data-none>None</button></span></label><div class="slot-grid" data-slots></div></div></form>
        <div><div class="dr-sec-t">Preview</div><div data-pv></div><div class="dr-sec-t mt">Projected delivery</div><div data-proj class="muted" style="font-size:12.5px"></div></div></div>`,
      actions: [{ label: 'Cancel', kind: 'btn-q' }, { label: isNew ? 'Create campaign' : 'Save', kind: 'btn-p', onClick: function (wrap) {
        var f = CX.readForm(wrap, fields); if (!f) return false;
        var picked = Object.keys(slots); if (!picked.length) { toast('Pick at least one surface', 'warn'); return false; }
        var all = surfaces.map(function (s) { return s.page; });
        var row = { advertiser: f.advertiser, format: f.format, headline: f.headline, sub_text: f.sub_text, cta_text: f.cta_text, cta_url: f.cta_url, media_url: f.media_url, poster_url: f.poster_url,
          price_display: f.price_display, theme_gradient: f.theme_gradient, status: f.status, active: f.status === 'live', priority: n(f.priority) || 5, budget: n(f.budget) || null,
          start_date: f.start_date || null, end_date: f.end_date || null, page_targets: picked.length === all.length ? ['all'] : picked,
          target_segments: ((a && a.segments) || []).filter(function (s) { return (f.segs || []).indexOf(s.name) > -1; }).map(function (s) { return s.id; }), updated_at: new Date().toISOString() };
        var qy = isNew ? CX.q('ad_campaigns').insert(Object.assign({ campaign_id: 'camp_' + Date.now().toString(36) + '_' + CX.uid().slice(0, 5), created_at: new Date().toISOString() }, row)).select('id') : CX.q('ad_campaigns').update(row).eq('id', c.id).select('id');
        return CX.rows(qy).then(function (r) { CX.log(isNew ? 'campaign.create' : 'campaign.update', 'campaign', (r[0] || {}).id || c.id, { advertiser: row.advertiser, targets: row.page_targets }); toast('Campaign saved', 'ok'); if (done) done(); });
      } }],
      onOpen: function (wrap) {
        CX.wireChips(wrap);
        var fm = $('[name="format"]', wrap);
        function paintSlots() {
          var fmt = fm.value, inv = (a && a.inventory) || [], by = {}; inv.forEach(function (i) { by[i.page + ':' + i.slot] = i; });
          set($('[data-slots]', wrap), html`${surfaces.map(function (s) { var ok = fmt === 'sticky' || fmt === 'native' || s.slots.indexOf(fmt) > -1; if (!ok) delete slots[s.page]; var m = by[s.page + ':' + fmt]; return html`
            <div class="slot ${ok ? '' : 'dead'} ${slots[s.page] ? 'on' : ''}" data-page="${s.page}" title="${ok ? '' : 'No ' + fmt + ' slot on this page'}"><div class="slot-p">${s.label}</div><div class="slot-f">${ok ? (m ? 'KES ' + num(m.cpm) + ' CPM · ' + m.intentBand : fmt) : 'unavailable'}</div></div>`; })}`);
          $$('[data-page]', wrap).forEach(function (el) { if (!el.classList.contains('dead')) el.onclick = function () { var p = el.getAttribute('data-page'); if (slots[p]) delete slots[p]; else slots[p] = 1; el.classList.toggle('on'); proj(); }; });
          proj();
        }
        function proj() {
          var fmt = fm.value, inv = ((a && a.inventory) || []).filter(function (i) { return slots[i.page] && i.slot === fmt; });
          var imp = inv.reduce(function (s, i) { return s + i.monthlyImpressions; }, 0), val = inv.reduce(function (s, i) { return s + i.monthlyValue; }, 0), budget = n($('[name="budget"]', wrap).value);
          set($('[data-proj]', wrap), Object.keys(slots).length ? CX.kv([['Surfaces', num(Object.keys(slots).length)], ['Impressions / month', num(imp)], ['Blended CPM', imp ? 'KES ' + num(val / imp * 1000) : '—'], ['Monthly value', money(val)], budget && val ? ['Budget lasts', num(budget / (val / 30)) + ' days'] : null]) : 'Pick surfaces to see delivery.');
        }
        function pv() { var f = {}; $$('[name]', wrap).forEach(function (el) { f[el.name] = el.value; }); set($('[data-pv]', wrap), creativePreview(f)); }
        fm.addEventListener('change', paintSlots); $$('input,select,textarea', wrap).forEach(function (el) { el.addEventListener('input', CX.debounce(pv, 150)); });
        $('[name="budget"]', wrap).addEventListener('input', proj);
        $('[data-all]', wrap).onclick = function () { surfaces.forEach(function (s) { slots[s.page] = 1; }); paintSlots(); };
        $('[data-none]', wrap).onclick = function () { slots = {}; paintSlots(); };
        var up = $('[data-upfile]', wrap); $('[data-upmedia]', wrap).onclick = function () { up.click(); };
        up.onchange = function () { var file = up.files[0]; if (!file) return; toast('Uploading ' + file.name + '…', 'info'); uploadAd(file, 'campaign').then(function (url) { $('[name="media_url"]', wrap).value = url; pv(); toast('Media uploaded', 'ok'); }, function (e) { toast('Upload failed: ' + CX.friendly(e), 'bad'); }); };
        paintSlots(); pv();
      } });
  }
  var SH_SURF = [['all', 'All services'], ['index', 'Home'], ['apartments', 'Stays'], ['tours', 'Tours'], ['events', 'Events'], ['food', 'Food'], ['shopping', 'Shopping'], ['rides', 'Rides'], ['carhire', 'Car hire'], ['flights', 'Flights'], ['roommates', 'Roommates']];
  var SH_AREAS = ['Westlands', 'Parklands', 'Kilimani', 'Lavington', 'Kileleshwa', 'Hurlingham', 'Upper Hill', 'CBD', 'Karen', 'Langata', 'Runda', 'Gigiri', 'Muthaiga', 'Ruaka', 'Kasarani', 'Thika Road', 'Mombasa', 'Diani', 'Naivasha', 'Nakuru', 'Kisumu'];
  function shadowEditor(a0, done) {
    var a = a0 || {}, isNew = !a.id;
    var surfLabels = SH_SURF.map(function (s) { return s[1]; });
    var fields = [
      { name: 'advertiser', label: 'Advertiser', required: true, value: a.advertiser }, { name: 'title', label: 'Internal name', value: a.title },
      { name: 'headline', label: 'Headline', value: a.headline, full: true }, { name: 'sub_text', label: 'Supporting line', value: a.sub_text, full: true },
      { name: 'cta_text', label: 'Button text', value: a.cta_text || 'View' }, { name: 'cta_url', label: 'Button link', type: 'url', value: a.cta_url },
      { name: 'media_type', label: 'Media', type: 'select', value: a.media_type || 'image', options: [['image', 'Image'], ['video', 'Video']] },
      { name: 'media_url', label: 'Media URL', type: 'url', value: a.media_url, help: html`<button type="button" class="link-btn" data-upmedia>Upload a file</button><input type="file" accept="image/*,video/mp4,video/webm" hidden data-upfile/>` },
      { name: 'theme_gradient', label: 'Background', value: a.theme_gradient || 'linear-gradient(135deg,#7C3AFF,#4F6DFF)' }, { name: 'accent', label: 'Accent colour', value: a.accent || '#7C3AFF' },
      { name: 'surfaces', label: 'Where it can appear', type: 'chips', full: true, options: surfLabels, value: (a.surfaces || ['all']).map(function (k) { var m = SH_SURF.filter(function (s) { return s[0] === k; })[0]; return m ? m[1] : k; }) },
      { name: 'position', label: 'Entrance', type: 'select', value: a.position || 'auto', options: [['auto', 'Auto — least intrusive per device'], ['rise', 'Rise behind the focused card'], ['side', 'Slide in from the side'], ['bottom', 'Slide up from the bottom'], ['top', 'Descend from the top']] },
      { name: 'device', label: 'Devices', type: 'select', value: a.device || 'all', options: [['all', 'All devices'], ['mobile', 'Mobile only'], ['desktop', 'Desktop only'], ['tablet', 'Tablet only']] },
      { name: 'intent_min', label: 'Min intent (0–100)', type: 'number', min: 0, max: 100, value: a.intent_min != null ? a.intent_min : 10 }, { name: 'intent_max', label: 'Max intent', type: 'number', min: 0, max: 100, value: a.intent_max != null ? a.intent_max : 85 },
      { name: 'min_dwell_s', label: 'Min dwell (s)', type: 'number', min: 0, value: a.min_dwell_s != null ? a.min_dwell_s : 6 }, { name: 'min_scroll_pct', label: 'Min scroll (%)', type: 'number', min: 0, max: 100, value: a.min_scroll_pct || 0 },
      { name: 'reading_modes', label: 'Reading modes', type: 'chips', options: ['skim', 'scan', 'browse', 'read'], value: a.reading_modes || ['skim', 'scan', 'browse', 'read'], full: true },
      { name: 'areas', label: 'Areas', type: 'chips', full: true, options: ['All areas'].concat(SH_AREAS), value: (a.areas || ['all']).map(function (x) { return x === 'all' ? 'All areas' : x; }) },
      { name: 'keywords', label: 'Keywords', value: (a.keywords || []).join(', '), full: true, placeholder: 'comma, separated' },
      { name: 'max_per_session', label: 'Max per session', type: 'number', min: 1, value: a.max_per_session || 1 }, { name: 'cooldown_s', label: 'Cooldown (s)', type: 'number', min: 0, value: a.cooldown_s || 90 },
      { name: 'dwell_show_s', label: 'Shown for (s)', type: 'number', min: 1, value: a.dwell_show_s || 7 }, { name: 'priority', label: 'Priority', type: 'number', min: 1, max: 10, value: a.priority || 5 },
      { name: 'status', label: 'Status', type: 'select', value: a.status || 'live', options: [['live', 'Live'], ['paused', 'Paused'], ['draft', 'Draft']] }, { name: 'budget', label: 'Budget (KES)', type: 'number', value: a.budget },
      { name: 'start_date', label: 'Starts', type: 'date', value: a.start_date }, { name: 'end_date', label: 'Ends', type: 'date', value: a.end_date },
      { name: 'apa_enabled', type: 'switch', label: 'Let the Cabana assistant mention it', value: !!a.apa_enabled, full: true }, { name: 'apa_message', label: 'Assistant line', type: 'textarea', rows: 2, value: a.apa_message }
    ];
    return CX.modal({ title: isNew ? 'New shadow ad' : 'Edit shadow ad', sub: 'Behavioural creatives that appear behind content only when attention and intent are right.', icon: 'layers', wide: 'x',
      body: html`<div class="split" style="gap:22px"><form class="form-grid" onsubmit="return false">${fields.map(CX.fieldHTML)}</form><div><div class="dr-sec-t">Preview</div><div data-pv></div></div></div>`,
      actions: [{ label: 'Cancel', kind: 'btn-q' }, { label: isNew ? 'Create' : 'Save', kind: 'btn-p', onClick: function (wrap) {
        var f = CX.readForm(wrap, fields); if (!f) return false;
        var surf = (f.surfaces || []).map(function (l) { return (SH_SURF.filter(function (s) { return s[1] === l; })[0] || [l])[0]; });
        var areas = (f.areas || []).map(function (x) { return x === 'All areas' ? 'all' : x; });
        var row = Object.assign({}, f, { title: f.title || f.advertiser, active: f.status === 'live', surfaces: surf.length ? surf : ['all'], areas: areas.length && areas.indexOf('all') < 0 ? areas : ['all'],
          keywords: String(f.keywords || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean), reading_modes: (f.reading_modes || []).length ? f.reading_modes : ['skim', 'scan', 'browse', 'read'],
          intent_min: n(f.intent_min), intent_max: f.intent_max === '' ? 100 : n(f.intent_max), min_dwell_s: n(f.min_dwell_s), min_scroll_pct: n(f.min_scroll_pct), max_per_session: n(f.max_per_session) || 1,
          cooldown_s: n(f.cooldown_s) || 90, dwell_show_s: n(f.dwell_show_s) || 7, priority: n(f.priority) || 5, budget: n(f.budget) || null, start_date: f.start_date || null, end_date: f.end_date || null,
          apa_message: f.apa_message || null, updated_at: new Date().toISOString() });
        var qy = isNew ? CX.q('shadow_ads').insert(Object.assign({ created_at: new Date().toISOString() }, row)).select('id') : CX.q('shadow_ads').update(row).eq('id', a.id).select('id');
        return CX.rows(qy).then(function (r) { CX.log(isNew ? 'shadow.create' : 'shadow.update', 'shadow_ad', (r[0] || {}).id || a.id, { advertiser: row.advertiser, surfaces: row.surfaces }); toast('Shadow ad saved', 'ok'); if (done) done(); });
      } }],
      onOpen: function (wrap) {
        CX.wireChips(wrap);
        function pv() { var f = {}; $$('[name]', wrap).forEach(function (el) { f[el.name] = el.value; }); set($('[data-pv]', wrap), html`<div style="max-width:320px">${creativePreview(f)}</div>`); }
        $$('input,select,textarea', wrap).forEach(function (el) { el.addEventListener('input', CX.debounce(pv, 150)); });
        var up = $('[data-upfile]', wrap); $('[data-upmedia]', wrap).onclick = function () { up.click(); };
        up.onchange = function () { var file = up.files[0]; if (!file) return; toast('Uploading…', 'info'); uploadAd(file, 'shadow').then(function (url) { $('[name="media_url"]', wrap).value = url; $('[name="media_type"]', wrap).value = /^video/.test(file.type) ? 'video' : 'image'; pv(); toast('Media uploaded', 'ok'); }, function (e) { toast('Upload failed: ' + CX.friendly(e), 'bad'); }); };
        pv();
      } });
  }
  CX.view('ads', {
    title: 'Advertising',
    render: function (v) {
      var tab = v.q.tab || 'campaigns';
      set(v.el, html`${pageHd('Growth', 'Advertising', 'Sell Cabana’s real inventory, priced from measured attention and intent.')}${CX.skeleton('list')}`);
      var need = tab === 'rate' || tab === 'visitors';
      return Promise.all([
        tab === 'campaigns' ? CX.rows(CX.q('ad_campaigns').select('*').order('created_at', { ascending: false }).limit(200)) : tab === 'shadow' ? CX.rows(CX.q('shadow_ads').select('*').order('created_at', { ascending: false }).limit(200)) : Promise.resolve([]),
        need ? audience() : audience().catch(function () { return null; })
      ]).then(function (r) {
        if (!v.alive()) return;
        var list = r[0] || [], a = r[1], st = adStats(a);
        var head = pageHd('Growth', 'Advertising', 'Sell Cabana’s real inventory, priced from measured attention and intent.',
          tab === 'campaigns' ? html`<button class="btn btn-p" data-newc>${icon('plus')}New campaign</button>` : tab === 'shadow' ? html`<button class="btn btn-p" data-news>${icon('plus')}New shadow ad</button>` : tab === 'rate' ? html`<button class="btn btn-g" data-exp>${icon('download')}Rate card CSV</button>` : '');
        var tb = tabBar(v, [['campaigns', 'Campaigns'], ['shadow', 'Shadow ads'], ['rate', 'Rate card'], ['visitors', 'Visitors']], tab);
        if (tab === 'campaigns') {
          var views = list.reduce(function (s, c) { return s + ((st[c.id] || {}).v || 0); }, 0), clicks = list.reduce(function (s, c) { return s + ((st[c.id] || {}).c || 0); }, 0);
          set(v.el, html`${head}${tb}<div class="grid g4 mb"><div class="mini"><div class="mini-l">Live campaigns</div><div class="mini-v">${num(list.filter(function (c) { return (c.status || 'live') === 'live'; }).length)}</div><div class="mini-s">${num(list.length)} total</div></div>
              <div class="mini"><div class="mini-l">Viewable impressions · 30d</div><div class="mini-v">${num(views)}</div></div><div class="mini"><div class="mini-l">Clicks</div><div class="mini-v">${num(clicks)}</div><div class="mini-s">${CX.pct(CX.ratio(clicks, views))} CTR</div></div>
              <div class="mini"><div class="mini-l">Inventory value</div><div class="mini-v">${a ? moneyC(a.monthlyInventoryValue) : '—'}</div><div class="mini-s">per month at current intent</div></div></div>
            ${list.length ? html`<div class="grid auto">${list.map(function (c) { var s0 = c.status || (c.active === false ? 'paused' : 'live'), m = st[c.id] || { v: 0, c: 0 }; return html`
              <div class="card flush"><div style="padding:14px">${creativePreview(c)}</div><div style="padding:0 18px 16px"><div class="row between"><b style="color:var(--ink-1)">${c.advertiser || 'Untitled'}</b>${CX.pill(s0)}</div>
                <div class="muted mt-s" style="font-size:12px">${human(c.format)} · ${(c.page_targets || ['all']).join(', ')}</div>
                <div class="grid g3 mt-s" style="gap:6px"><div class="mini" style="padding:8px 10px"><div class="mini-l">Views</div><div class="mini-v" style="font-size:15px">${num(m.v)}</div></div><div class="mini" style="padding:8px 10px"><div class="mini-l">Clicks</div><div class="mini-v" style="font-size:15px">${num(m.c)}</div></div><div class="mini" style="padding:8px 10px"><div class="mini-l">CTR</div><div class="mini-v" style="font-size:15px">${CX.pct(CX.ratio(m.c, m.v))}</div></div></div>
                <div class="btn-row mt"><button class="btn btn-sm btn-g" data-ec="${c.id}">${icon('edit')}Edit</button><button class="btn btn-sm btn-g" data-tc="${c.id}" data-st="${s0}">${s0 === 'live' ? 'Pause' : 'Go live'}</button><button class="btn btn-sm btn-q btn-icon" data-dc="${c.id}" title="Delete">${icon('trash')}</button></div></div></div>`; })}</div>`
              : html`<div class="card">${CX.empty('No campaigns yet', 'Create one and choose the surfaces it runs on.', 'megaphone')}</div>`}`);
        } else if (tab === 'shadow') {
          var imp = list.reduce(function (s, x) { return s + n(x.impressions); }, 0), clk = list.reduce(function (s, x) { return s + n(x.clicks); }, 0), dis = list.reduce(function (s, x) { return s + n(x.dismissals); }, 0);
          set(v.el, html`${head}${tb}<div class="grid g4 mb"><div class="mini"><div class="mini-l">Live shadow ads</div><div class="mini-v">${num(list.filter(function (x) { return x.status === 'live' && x.active; }).length)}</div></div>
              <div class="mini"><div class="mini-l">Impressions</div><div class="mini-v">${num(imp)}</div></div><div class="mini"><div class="mini-l">Click-through</div><div class="mini-v">${CX.pct(CX.ratio(clk, imp))}</div><div class="mini-s">${num(clk)} clicks</div></div>
              <div class="mini"><div class="mini-l">Dismiss rate</div><div class="mini-v">${CX.pct(CX.ratio(dis, imp))}</div><div class="mini-s">lower is better</div></div></div>
            <div class="card flush">${list.length ? html`<table class="tbl"><thead><tr><th>Creative</th><th class="hide-s">Targeting</th><th class="num">Views</th><th class="num">CTR</th><th>Status</th><th></th></tr></thead><tbody>${list.map(function (x) { return html`
              <tr><td><div class="cell"><span class="t-thumb" style="background:${raw(CX.esc(x.theme_gradient || 'var(--panel-3)'))}">${x.media_url && x.media_type !== 'video' ? html`<img src="${CX.safeUrl(x.media_url)}" alt="" style="width:100%;height:100%;object-fit:cover"/>` : ''}</span><div><div class="t-main">${x.advertiser}</div><div class="t-sub">${x.headline || x.title || ''}</div></div></div></td>
              <td class="hide-s t-sub">${(x.surfaces || ['all']).join(', ')} · intent ${num(x.intent_min)}–${num(x.intent_max)} · ${human(x.position || 'auto')}</td><td class="num">${num(x.impressions)}</td><td class="num">${CX.pct(CX.ratio(x.clicks, x.impressions))}</td><td>${CX.pill(x.status || 'draft')}</td>
              <td><div class="t-act"><button class="btn btn-sm btn-g" data-es="${x.id}">Edit</button><button class="btn btn-sm btn-g" data-ts="${x.id}" data-st="${x.status}">${x.status === 'live' ? 'Pause' : 'Go live'}</button><button class="btn btn-sm btn-q btn-icon" data-ds="${x.id}" title="Delete">${icon('trash')}</button></div></td></tr>`; })}</tbody></table>`
              : CX.empty('No shadow ads yet', '', 'layers')}</div>`);
        } else if (tab === 'rate') {
          var inv = (a && a.inventory) || [];
          set(v.el, html`${head}${tb}<div class="grid g4 mb"><div class="mini"><div class="mini-l">Sellable surfaces</div><div class="mini-v">${num(inv.length)}</div></div><div class="mini"><div class="mini-l">Hot-intent slots</div><div class="mini-v">${num(inv.filter(function (i) { return i.intentBand === 'hot'; }).length)}</div></div>
              <div class="mini"><div class="mini-l">Impressions / month</div><div class="mini-v">${compact(inv.reduce(function (s, i) { return s + i.monthlyImpressions; }, 0))}</div></div><div class="mini"><div class="mini-l">Rate card value</div><div class="mini-v">${moneyC(a && a.monthlyInventoryValue)}</div></div></div>
            <div class="card flush">${inv.length ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Surface</th><th>Slot</th><th class="num">Pageviews</th><th class="num">Viewable</th><th class="num">CTR</th><th>Intent</th><th class="num">CPM</th><th class="num">Monthly value</th></tr></thead><tbody>${inv.map(function (i) { return html`
              <tr><td class="t-main">${i.pageLabel}</td><td><div class="t-main">${i.slotLabel}</div><div class="t-sub">${i.desc}</div></td><td class="num">${num(i.pageviews)}</td><td class="num">${num(i.viewable)}<div class="t-sub">${i.viewRate}%</div></td><td class="num">${i.ctr}%</td>
              <td>${CX.pill(i.intentBand, i.intentBand === 'hot' ? 'p-hot' : i.intentBand === 'warm' ? 'p-warn' : 'p-info')}</td><td class="num">KES ${num(i.cpm)}</td><td class="num"><b>${money(i.monthlyValue)}</b></td></tr>`; })}</tbody></table></div>` : CX.empty('No inventory measured yet', 'It fills in as visitors browse.', 'chart')}</div>`);
        } else {
          var byV = {};
          ((a && a.sessions) || []).forEach(function (s) { var id = s.visitor_id || 'unknown'; var o = byV[id] = byV[id] || { id: id, sessions: 0, intent: 0, mode: '', device: s.device || '', seen: 0, clicks: 0, last: null };
            o.sessions++; o.intent = Math.max(o.intent, n(s.intent_score)); if (s.reading_mode) o.mode = s.reading_mode; o.seen += n(s.ads_viewable); o.clicks += n(s.ads_clicked); var t = s.captured_at || s.created_at; if (t && (!o.last || t > o.last)) o.last = t; });
          var vis = Object.keys(byV).map(function (k) { return byV[k]; }).sort(function (x, y) { return y.intent - x.intent; });
          set(v.el, html`${head}${tb}<div class="grid g4 mb"><div class="mini"><div class="mini-l">Known visitors · 30d</div><div class="mini-v">${num(vis.length)}</div></div><div class="mini"><div class="mini-l">Hot intent (72+)</div><div class="mini-v">${num(vis.filter(function (x) { return x.intent >= 72; }).length)}</div></div>
              <div class="mini"><div class="mini-l">Average intent</div><div class="mini-v">${num(vis.length ? vis.reduce(function (s, x) { return s + x.intent; }, 0) / vis.length : 0)}</div></div><div class="mini"><div class="mini-l">Reached by ads</div><div class="mini-v">${num(vis.filter(function (x) { return x.seen; }).length)}</div></div></div>
            <div class="card flush">${vis.length ? html`<div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Visitor</th><th>Device</th><th class="num">Sessions</th><th class="num">Intent</th><th>Mode</th><th class="num">Ads seen</th><th class="num">Last seen</th></tr></thead><tbody>${vis.slice(0, 200).map(function (x) { return html`
              <tr><td class="mono t-sub">${String(x.id).slice(0, 14)}</td><td>${human(x.device || '—')}</td><td class="num">${num(x.sessions)}</td><td class="num">${CX.pill(String(x.intent), x.intent >= 72 ? 'p-hot' : x.intent >= 45 ? 'p-info' : 'p-mute', false)}</td><td>${human(x.mode || '—')}</td><td class="num">${num(x.seen)}</td><td class="num t-sub">${x.last ? ago(x.last) : '—'}</td></tr>`; })}</tbody></table></div>` : CX.empty('No visitor sessions recorded yet', '', 'users')}</div>`);
        }
        wireTabs(v, 'campaigns');
        var reload = function () { v.refresh(); };
        on(v.el, '[data-newc]', 'click', function () { campaignEditor(null, a, reload); });
        on(v.el, '[data-ec]', 'click', function (el) { campaignEditor(list.filter(function (c) { return String(c.id) === el.getAttribute('data-ec'); })[0], a, reload); });
        on(v.el, '[data-tc]', 'click', function (el) { var next = el.getAttribute('data-st') === 'live' ? 'paused' : 'live'; CX.busy(el, function () { return CX.rows(CX.q('ad_campaigns').update({ status: next, active: next === 'live' }).eq('id', el.getAttribute('data-tc')).select('id')).then(function () { CX.log('campaign.' + next, 'campaign', el.getAttribute('data-tc')); toast('Campaign ' + next, 'ok'); reload(); }); }); });
        on(v.el, '[data-dc]', 'click', function (el) { confirm({ title: 'Delete this campaign?', tone: 'danger', confirm: 'Delete', icon: 'trash', body: 'It comes off every surface immediately.', onConfirm: function () { return CX.rows(CX.q('ad_campaigns').delete().eq('id', el.getAttribute('data-dc')).select('id')).then(function () { CX.log('campaign.delete', 'campaign', el.getAttribute('data-dc')); toast('Deleted', 'ok'); reload(); }); } }); });
        on(v.el, '[data-news]', 'click', function () { shadowEditor(null, reload); });
        on(v.el, '[data-es]', 'click', function (el) { shadowEditor(list.filter(function (c) { return String(c.id) === el.getAttribute('data-es'); })[0], reload); });
        on(v.el, '[data-ts]', 'click', function (el) { var next = el.getAttribute('data-st') === 'live' ? 'paused' : 'live'; CX.busy(el, function () { return CX.rows(CX.q('shadow_ads').update({ status: next, active: next === 'live' }).eq('id', el.getAttribute('data-ts')).select('id')).then(function () { CX.log('shadow.' + next, 'shadow_ad', el.getAttribute('data-ts')); toast('Shadow ad ' + next, 'ok'); reload(); }); }); });
        on(v.el, '[data-ds]', 'click', function (el) { confirm({ title: 'Delete this shadow ad?', tone: 'danger', confirm: 'Delete', icon: 'trash', onConfirm: function () { return CX.rows(CX.q('shadow_ads').delete().eq('id', el.getAttribute('data-ds')).select('id')).then(function () { CX.log('shadow.delete', 'shadow_ad', el.getAttribute('data-ds')); toast('Deleted', 'ok'); reload(); }); } }); });
        on(v.el, '[data-exp]', 'click', function () { CX.csv((a && a.inventory) || [], null, 'cabana-rate-card.csv'); });
      });
    }
  });

  /* ════════════════════════════════════════════════════════════════
     MESSAGING (push · scheduled · splash · email)
     ════════════════════════════════════════════════════════════════ */
  var SPLASH = 'interstitial', SPLASH_CFG = 'splash.json';
  function splashUrl(key) { return CX.client().storage.from(SPLASH).getPublicUrl(key).data.publicUrl; }
  function splashConfig() { return fetch(splashUrl(SPLASH_CFG) + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }
  function saveSplash(cfg) {
    var blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
    return CX.client().storage.from(SPLASH).upload(SPLASH_CFG, blob, { upsert: true, contentType: 'application/json', cacheControl: '0' }).then(function (r) { if (r.error) throw r.error; });
  }
  var KINDS_PUSH = [['general', 'General'], ['promo', 'Promotion'], ['booking', 'Booking'], ['payment', 'Payment'], ['support', 'Support'], ['urgent', 'Urgent']];
  CX.view('comms', {
    title: 'Messaging',
    render: function (v) {
      var tab = v.q.tab || 'push';
      set(v.el, html`${pageHd('Growth', 'Messaging', 'Push notifications, scheduled campaigns, the homepage splash and every email Cabana sends.')}${CX.skeleton('kpis')}`);
      var head = function (t, f) { var qy = CX.q(t).select('id', { count: 'exact', head: true }); return (f ? f(qy) : qy).then(function (r) { return r.count || 0; }); };
      return Promise.all([head('push_subscriptions'), head('notifications', function (q) { return q.gte('created_at', new Date(Date.now() - 864e5).toISOString()); }), head('push_campaigns', function (q) { return q.eq('active', true); })]).then(function (cn) {
        if (!v.alive()) return;
        set(v.el, html`${pageHd('Growth', 'Messaging', 'Push notifications, scheduled campaigns, the homepage splash and every email Cabana sends.')}
          <div class="grid g3 mb"><div class="mini"><div class="mini-l">Push devices</div><div class="mini-v">${num(cn[0])}</div><div class="mini-s">Browsers and phones that accepted notifications</div></div>
            <div class="mini"><div class="mini-l">Notifications · 24h</div><div class="mini-v">${num(cn[1])}</div><div class="mini-s">In-app feed items created</div></div><div class="mini"><div class="mini-l">Scheduled campaigns</div><div class="mini-v">${num(cn[2])}</div><div class="mini-s">Active and waiting to fire</div></div></div>
          ${tabBar(v, [['push', 'Send'], ['scheduled', 'Scheduled', cn[2]], ['splash', 'Homepage splash'], ['email', 'Email log'], ['log', 'Sent notifications']], tab)}<div data-mbody></div>`);
        wireTabs(v, 'push');
        var body = $('[data-mbody]', v.el);
        if (tab === 'push') return pushTab(v, body);
        if (tab === 'scheduled') return scheduledTab(v, body);
        if (tab === 'splash') return splashTab(v, body);
        if (tab === 'email') return emailTab(v, body);
        return logTab(v, body);
      });
    }
  });
  function pushTab(v, body) {
    var fields = [{ name: 'title', label: 'Title', required: true, full: true, placeholder: 'Weekend escapes from KES 3,900' }, { name: 'body', label: 'Message', type: 'textarea', rows: 3, required: true, placeholder: 'Handpicked stays near Nairobi — book before Friday.' },
      { name: 'url', label: 'Opens', value: '/', help: 'Any page on Cabana, e.g. /apartments or /tours' }, { name: 'kind', label: 'Type', type: 'select', value: 'general', options: KINDS_PUSH }];
    set(body, html`<div class="split"><div class="card pad-l"><div class="card-hd"><div><div class="card-t">Compose</div><div class="card-s">One message — to one member, or to a whole audience.</div></div></div>
        <form class="form-grid" onsubmit="return false" data-pf>${fields.map(CX.fieldHTML)}</form>
        <div class="form-sec">Send to</div>${CX.seg([['all', 'Everyone'], ['hosts', 'Hosts'], ['guests', 'Guests'], ['one', 'One member']], 'all', 'data-aud')}
        <div class="mt" data-reach><span class="muted" style="font-size:12.5px">Checking reach…</span></div>
        <div class="btn-row mt"><button class="btn btn-p btn-lg" data-send>${icon('send')}Send now</button><button class="btn btn-g" data-test>Send a test to me</button></div></div>
      <div class="card"><div class="card-hd"><div><div class="card-t">How it lands</div></div></div><div class="note" data-prev style="padding:14px"></div>
        <div class="col mt" style="gap:8px;font-size:12.5px;color:var(--ink-3)"><div>${icon('bell')} Push notification on every device the member allowed.</div><div>${icon('inbox')} A row in their in-app notification feed, so nobody misses it.</div><div>${icon('scroll')} Recorded in the audit log with the delivery counts.</div></div></div></div>`);
    var aud = 'all', target = null;
    function prev() { var f = {}; $$('[name]', body).forEach(function (el) { f[el.name] = el.value; }); set($('[data-prev]', body), html`<div class="row" style="align-items:flex-start"><span class="brand-mark" style="width:36px;height:36px"><img src="/cabana-emblem.png" alt=""/></span><div class="grow"><div class="strong">${f.title || 'Your title'}</div><div style="font-size:12.5px;margin-top:2px">${f.body || 'Your message'}</div><div class="muted" style="font-size:11.5px;margin-top:4px">cabana.africa${f.url && f.url.charAt(0) === '/' ? f.url : ''}</div></div></div>`); }
    function reach() {
      var box = $('[data-reach]', body);
      if (aud === 'one') { set(box, target ? html`<div class="who">${CX.avatar(target.name || target.email, 'sm')}<div class="grow"><div class="who-n">${target.name || target.email}</div><div class="who-s">${target.email || ''}</div></div><button class="btn btn-sm btn-q" data-pick>Change</button></div>` : html`<button class="btn btn-g" data-pick>${icon('user')}Choose a member</button>`);
        $('[data-pick]', box).onclick = function () { CX.pickPerson('Send to one member').then(function (p) { if (p) { target = p; reach(); } }); }; return; }
      set(box, html`<span class="muted" style="font-size:12.5px">Checking reach…</span>`);
      CX.api('/api/push-send?action=admin-broadcast', { body: { audience: aud, dry_run: true, title: 'reach' } }).then(function (r) {
        set(box, html`<div class="grid g3" style="gap:8px"><div class="mini"><div class="mini-l">Members</div><div class="mini-v">${num(r.members)}</div><div class="mini-s">get it in-app</div></div><div class="mini"><div class="mini-l">With push on</div><div class="mini-v">${num(r.subscribers)}</div></div><div class="mini"><div class="mini-l">Devices</div><div class="mini-v">${num(r.devices)}</div></div></div>`);
      }, function (e) { set(box, html`<span class="bad-t" style="font-size:12.5px">${CX.friendly(e)}</span>`); });
    }
    $$('input,textarea,select', body).forEach(function (el) { el.addEventListener('input', prev); });
    $$('[data-aud]', body).forEach(function (b) { b.onclick = function () { aud = b.getAttribute('data-aud'); $$('[data-aud]', body).forEach(function (x) { x.classList.toggle('on', x === b); }); reach(); }; });
    function copy() { return CX.readForm($('[data-pf]', body), fields); }
    $('[data-test]', body).onclick = function () { var f = copy(); if (!f) return; var b = this; CX.busy(b, function () { return CX.api('/api/push-send?action=admin-send', { body: Object.assign({ to: CX.me.email }, f) }).then(function (r) { toast(r.sent ? 'Test delivered to ' + num(r.sent) + ' of your devices' : 'Saved to your feed — this browser has no push subscription yet', r.sent ? 'ok' : 'warn'); }); }); };
    $('[data-send]', body).onclick = function () {
      var f = copy(); if (!f) return;
      if (aud === 'one') { if (!target) { toast('Choose a member first', 'warn'); return; } var b = this; return CX.busy(b, function () { return CX.api('/api/push-send?action=admin-send', { body: Object.assign({ to: target.id }, f) }).then(function (r) { toast(r.sent ? 'Delivered to ' + num(r.sent) + ' device(s)' : 'Saved to their in-app feed' + (r.emailed ? ' and emailed' : ''), 'ok'); }); }); }
      confirm({ title: 'Send to ' + ({ all: 'everyone', hosts: 'all hosts', guests: 'all guests' })[aud] + '?', tone: 'warn', confirm: 'Send broadcast', icon: 'send', body: '“' + f.title + '” goes out now and cannot be recalled.',
        onConfirm: function () { return CX.api('/api/push-send?action=admin-broadcast', { body: Object.assign({ audience: aud }, f) }).then(function (r) { toast('Sent · ' + num(r.delivered) + ' devices reached · ' + num(r.persisted) + ' feeds updated' + (r.pruned ? ' · ' + num(r.pruned) + ' dead devices cleaned up' : ''), 'ok', { ms: 7000 }); }); } });
    };
    prev(); reach();
  }
  function scheduledTab(v, body) {
    set(body, CX.skeleton('list'));
    return CX.rows(CX.q('push_campaigns').select('*').order('send_at', { ascending: true }).limit(100)).then(function (list) {
      if (!v.alive()) return;
      set(body, html`<div class="row between mb"><div class="muted" style="font-size:12.5px">Campaigns fire automatically — the scheduler checks every 10 minutes.</div><button class="btn btn-p" data-new>${icon('plus')}Schedule a campaign</button></div>
        <div class="card flush">${list.length ? html`<table class="tbl"><thead><tr><th>Message</th><th>When</th><th>Audience</th><th>Status</th><th></th></tr></thead><tbody>${list.map(function (c) {
          var stt = !c.active ? ['Paused', 'p-mute'] : c.last_sent_at && c.repeat === 'none' ? ['Sent', 'p-ok'] : ['Scheduled', 'p-brand'];
          return html`<tr><td><div class="t-main">${c.title}</div><div class="t-sub" style="white-space:normal;max-width:360px">${c.body}</div></td><td><div class="t-main nowrap">${fdt(c.send_at)}</div><div class="t-sub">${human(c.repeat === 'none' ? 'once' : c.repeat)}${c.last_sent_at ? ' · last ' + ago(c.last_sent_at) : ''}</div></td>
            <td>${human(c.audience === 'partners' ? 'hosts' : c.audience || 'all')}</td><td><span class="pill dot ${stt[1]}">${stt[0]}</span></td>
            <td><div class="t-act"><button class="btn btn-sm btn-ok" data-fire="${c.id}">Send now</button><button class="btn btn-sm btn-g" data-toggle="${c.id}" data-on="${c.active ? 1 : 0}">${c.active ? 'Pause' : 'Activate'}</button><button class="btn btn-sm btn-q btn-icon" data-del="${c.id}" title="Delete">${icon('trash')}</button></div></td></tr>`; })}</tbody></table>`
          : CX.empty('Nothing scheduled', 'Schedule a one-off or recurring push — weekly deals, monthly host tips.', 'clock')}</div>`);
      $('[data-new]', body).onclick = function () {
        form({ title: 'Schedule a campaign', icon: 'clock', fields: [{ name: 'title', label: 'Title', required: true, full: true }, { name: 'body', label: 'Message', type: 'textarea', rows: 3, required: true },
          { name: 'url', label: 'Opens', value: '/' }, { name: 'kind', label: 'Type', type: 'select', value: 'promo', options: KINDS_PUSH },
          { name: 'send_at', label: 'First send', type: 'datetime-local', required: true }, { name: 'repeat', label: 'Repeat', type: 'select', value: 'none', options: [['none', 'Once'], ['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly']] },
          { name: 'audience', label: 'Audience', type: 'select', value: 'all', options: [['all', 'Everyone'], ['guests', 'Guests'], ['hosts', 'Hosts']] }], submit: 'Schedule',
          onSubmit: function (f) { return CX.rows(CX.q('push_campaigns').insert({ title: f.title, body: f.body, url: f.url || '/', kind: f.kind, repeat: f.repeat, audience: f.audience, active: true, send_at: new Date(f.send_at).toISOString() }).select('id')).then(function (r) { CX.log('push.schedule', 'push_campaign', (r[0] || {}).id, { title: f.title }); toast('Scheduled', 'ok'); v.refresh(); }); } });
      };
      on(body, '[data-toggle]', 'click', function (el) { var onv = el.getAttribute('data-on') !== '1'; CX.busy(el, function () { return CX.rows(CX.q('push_campaigns').update({ active: onv }).eq('id', el.getAttribute('data-toggle')).select('id')).then(function () { toast(onv ? 'Activated' : 'Paused', 'ok'); v.refresh(); }); }); });
      on(body, '[data-del]', 'click', function (el) { confirm({ title: 'Delete this campaign?', tone: 'danger', confirm: 'Delete', onConfirm: function () { return CX.rows(CX.q('push_campaigns').delete().eq('id', el.getAttribute('data-del')).select('id')).then(function () { toast('Deleted', 'ok'); v.refresh(); }); } }); });
      on(body, '[data-fire]', 'click', function (el) {
        var c = list.filter(function (x) { return String(x.id) === el.getAttribute('data-fire'); })[0];
        confirm({ title: 'Send “' + c.title + '” now?', tone: 'warn', confirm: 'Send now', icon: 'send', body: 'It goes to ' + human(c.audience === 'partners' ? 'hosts' : c.audience || 'everyone') + ' immediately.',
          onConfirm: function () { return CX.api('/api/push-send?action=admin-broadcast', { body: { audience: c.audience === 'partners' ? 'hosts' : c.audience || 'all', title: c.title, body: c.body, url: c.url || '/', kind: c.kind || 'general' } }).then(function (r) {
            return CX.q('push_campaigns').update(Object.assign({ last_sent_at: new Date().toISOString() }, c.repeat === 'none' ? { active: false } : {})).eq('id', c.id).then(function () { toast('Sent · ' + num(r.delivered) + ' devices', 'ok'); v.refresh(); }); }); } });
      });
    });
  }
  function splashTab(v, body) {
    set(body, CX.skeleton('kpis'));
    var pending = null;
    return splashConfig().then(function (cfg) {
      if (!v.alive()) return;
      var live = cfg && cfg.active;
      function human2(ms) { ms = n(ms); return ms >= 60000 && ms % 60000 === 0 ? ms / 60000 + ' min' : Math.round(ms / 1000) + 's'; }
      set(body, html`<div class="split"><div class="card pad-l"><div class="card-hd"><div><div class="card-t">Homepage splash</div><div class="card-s">A full-screen video or image the moment someone opens cabana.africa.</div></div>${live ? html`<span class="pill dot p-ok">Live</span>` : html`<span class="pill p-mute">Off</span>`}</div>
          ${live ? html`<div class="note ok mb">Playing a <b>${cfg.type}</b> for <b>${cfg.type === 'image' ? '3s' : human2(cfg.durationMs)}</b>, shown <b>${({ once: 'once per device', daily: 'once a day', always: 'every visit' })[cfg.frequency] || cfg.frequency}</b> · campaign <b>${cfg.campaign || '—'}</b> · updated ${ago(cfg.updatedAt)}.</div>` : html`<div class="note mb">The homepage loads normally. Upload media and publish to switch it on.</div>`}
          <div class="form-grid">
            <div class="fld full"><label class="fld-l">Media</label><label class="ph-drop" style="aspect-ratio:auto;padding:22px" data-drop>${icon('upload')}<b data-fname>${live ? 'Replace the current media' : 'Choose a video or image'}</b><br/><span class="muted">MP4/WebM under ~30 MB plays smoothly on phones</span><input type="file" accept="video/mp4,video/webm,image/*" hidden data-file/></label></div>
            ${CX.fieldHTML({ name: 'campaign', label: 'Campaign name', value: live ? cfg.campaign : '', placeholder: 'december-getaways' })}
            ${CX.fieldHTML({ name: 'frequency', label: 'Show', type: 'select', value: live ? cfg.frequency : 'once', options: [['once', 'Once per device'], ['daily', 'Once a day'], ['always', 'Every visit']] })}
            ${CX.fieldHTML({ name: 'seconds', label: 'Video plays for (seconds)', type: 'number', min: 1, max: 600, value: live && cfg.type === 'video' ? Math.round(n(cfg.durationMs) / 1000) : 15, help: 'Images always show for 3 seconds.' })}
          </div>
          <div class="btn-row mt"><button class="btn btn-p btn-lg" data-pub>${icon('play')}${live ? 'Update splash' : 'Publish splash'}</button>${live ? html`<button class="btn btn-d" data-off>${icon('pause')}Turn off</button>` : ''}<button class="btn btn-g" data-test>${icon('eye')}Test it here</button></div></div>
        <div class="card"><div class="card-t mb">Preview</div><div class="splash-pv" data-pv>${live ? (cfg.type === 'video' ? html`<video src="${CX.safeUrl(cfg.url)}" muted autoplay loop playsinline></video>` : html`<img src="${CX.safeUrl(cfg.url)}" alt=""/>`) : html`<span class="muted">No media</span>`}</div></div></div>`);
      var fileIn = $('[data-file]', body), drop = $('[data-drop]', body);
      function pick(file) {
        if (!file) return; var kind = /^video\//.test(file.type) ? 'video' : /^image\//.test(file.type) ? 'image' : null;
        if (!kind) { toast('Choose a video or an image', 'warn'); return; }
        if (pending && pending.url) URL.revokeObjectURL(pending.url);
        pending = { file: file, kind: kind, url: URL.createObjectURL(file) };
        set($('[data-fname]', body), file.name + ' · ' + CX.bytes(file.size));
        set($('[data-pv]', body), kind === 'video' ? html`<video src="${pending.url}" muted autoplay loop playsinline></video>` : html`<img src="${pending.url}" alt=""/>`);
        if (kind === 'video' && file.size > 60 * 1048576) toast('That video is ' + CX.bytes(file.size) + '. Under ~30 MB loads much faster on phones.', 'warn', { ms: 8000 });
      }
      fileIn.onchange = function () { pick(fileIn.files[0]); };
      drop.ondragover = function (e) { e.preventDefault(); drop.classList.add('over'); }; drop.ondragleave = function () { drop.classList.remove('over'); };
      drop.ondrop = function (e) { e.preventDefault(); drop.classList.remove('over'); pick(e.dataTransfer.files[0]); };
      $('[data-pub]', body).onclick = function () {
        var b = this;
        if (!pending && !live) { toast('Choose media first', 'warn'); return; }
        var camp = ($('[name="campaign"]', body).value.trim() || 'campaign-' + Date.now()).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
        var freq = $('[name="frequency"]', body).value, secs = Math.max(1, n($('[name="seconds"]', body).value) || 15);
        CX.busy(b, function () {
          var media = pending ? CX.client().storage.from(SPLASH).upload('media/' + camp + '-' + Date.now() + '.' + ((pending.file.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '')), pending.file, { upsert: true, contentType: pending.file.type, cacheControl: '31536000' })
            .then(function (r) { if (r.error) throw r.error; return { type: pending.kind, url: splashUrl(r.data.path) }; }) : Promise.resolve({ type: cfg.type, url: cfg.url });
          return media.then(function (m) { return saveSplash({ active: true, type: m.type, url: m.url, durationMs: m.type === 'video' ? secs * 1000 : 3000, frequency: freq, campaign: camp, updatedAt: Date.now() }); })
            .then(function () { CX.log('splash.publish', 'splash', camp, { frequency: freq }); toast('Splash is live', 'ok'); v.refresh(); });
        });
      };
      var off = $('[data-off]', body); if (off) off.onclick = function () { confirm({ title: 'Turn the splash off?', tone: 'warn', confirm: 'Turn off', body: 'The homepage loads normally for everyone.', onConfirm: function () { return saveSplash({ active: false, updatedAt: Date.now() }).then(function () { CX.log('splash.disable', 'splash', cfg.campaign || null); toast('Splash turned off', 'ok'); v.refresh(); }); } }); };
      $('[data-test]', body).onclick = function () {
        var url = pending ? pending.url : live ? cfg.url : null, type = pending ? pending.kind : live ? cfg.type : null;
        if (!url) { toast('Nothing to test yet', 'warn'); return; }
        var ms = type === 'image' ? 3000 : Math.max(1000, (n($('[name="seconds"]', body).value) || 15) * 1000);
        var cover = document.createElement('div'); cover.style.cssText = 'position:fixed;inset:0;z-index:2147483600;background:#07080C;cursor:pointer';
        set(cover, html`${type === 'video' ? html`<video src="${CX.safeUrl(url)}" muted autoplay playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"></video>` : html`<img src="${CX.safeUrl(url)}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"/>`}
          <div style="position:absolute;left:0;bottom:0;height:3px;width:0;background:var(--grad)" data-bar></div><div style="position:absolute;left:50%;bottom:22px;transform:translateX(-50%);font:600 11px var(--f-d);letter-spacing:.18em;color:rgba(255,255,255,.6);text-transform:uppercase">Cabana · preview · tap to close</div>`);
        document.body.appendChild(cover);
        var bar = $('[data-bar]', cover), t0 = Date.now(), done = false;
        function close() { if (done) return; done = true; cover.style.transition = 'opacity .4s'; cover.style.opacity = '0'; setTimeout(function () { cover.remove(); }, 420); }
        cover.onclick = close;
        (function tick() { var p = Math.min(100, (Date.now() - t0) / ms * 100); bar.style.width = p + '%'; if (p < 100 && !done) requestAnimationFrame(tick); else close(); })();
      };
    });
  }
  function emailTab(v, body) {
    set(body, CX.skeleton('list'));
    return rpc('admin_health').then(function (h) {
      if (!v.alive()) return;
      var e = h.email || {};
      set(body, html`<div class="grid g3 mb"><div class="mini"><div class="mini-l">Sent · 7 days</div><div class="mini-v">${num(e.sent_7d)}</div></div><div class="mini"><div class="mini-l">Failed · 7 days</div><div class="mini-v ${n(e.failed_7d) ? 'bad-t' : ''}">${num(e.failed_7d)}</div></div><div class="mini"><div class="mini-l">Skipped / suppressed</div><div class="mini-v">${num(e.skipped_7d)}</div></div></div>
        ${e.last_failure ? html`<div class="callout bad mb">${icon('alert')}<div><div class="strong">Last failure · ${human(e.last_failure.template)} · ${ago(e.last_failure.at)}</div><div class="muted" style="font-size:12.5px">${e.last_failure.error}</div></div></div>` : ''}
        <div class="card flush">${(e.recent || []).length ? html`<div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Email</th><th>To</th><th>Status</th><th class="num">When</th></tr></thead><tbody>${e.recent.map(function (m) { return html`<tr><td><div class="t-main">${m.subject || human(m.template)}</div><div class="t-sub">${human(m.template)}</div></td><td class="t-sub">${m.to}</td><td>${CX.pill(m.status)}${m.error ? html`<div class="t-sub bad-t">${m.error}</div>` : ''}</td><td class="num t-sub" title="${fdt(m.at)}">${ago(m.at)}</td></tr>`; })}</tbody></table></div>` : CX.empty('No emails yet', '', 'mail')}</div>`);
    });
  }
  function logTab(v, body) {
    set(body, CX.skeleton('list'));
    return CX.rows(CX.q('notifications').select('id,user_id,title,body,kind,created_at,read').order('created_at', { ascending: false }).limit(60)).then(function (list) {
      if (!v.alive()) return;
      set(body, html`<div class="card flush">${list.length ? html`<table class="tbl compact"><thead><tr><th>Notification</th><th>Type</th><th>Read</th><th class="num">When</th></tr></thead><tbody>${list.map(function (x) { return html`<tr class="click" data-person="${x.user_id}"><td><div class="t-main">${x.title}</div><div class="t-sub trunc" style="max-width:520px">${x.body || ''}</div></td><td><span class="tag">${x.kind || 'general'}</span></td><td>${x.read ? html`<span class="pill p-ok">Read</span>` : html`<span class="pill p-mute">Unread</span>`}</td><td class="num t-sub">${ago(x.created_at)}</td></tr>`; })}</tbody></table>` : CX.empty('Nothing sent yet', '', 'bell')}</div>`);
      wireOpeners(body);
    });
  }

  /* ════════════════════════════════════════════════════════════════
     AUDIENCE
     ════════════════════════════════════════════════════════════════ */
  CX.view('insights', {
    title: 'Audience', chart: true,
    render: function (v) {
      set(v.el, html`${pageHd('Growth', 'Audience', 'Who visits Cabana, how they behave, and the segments and inventory that makes sellable.')}${CX.skeleton('kpis')}<div class="mt">${CX.skeleton('list')}</div>`);
      return audience(!!v.q.fresh).then(function (a) {
        if (!v.alive()) return;
        var r = a.reach || {}, at = a.attention || {}, fr = a.friction || {};
        var dist = function (arr) { return (arr || []).map(function (d) { return { label: human(d.key), value: d.count }; }); };
        var hourly = a.hourly || [], hmax = Math.max.apply(null, hourly.map(function (h) { return n(h.count != null ? h.count : h); }).concat([1]));
        set(v.el, html`${pageHd('Growth', 'Audience', 'Who visits Cabana, how they behave, and the segments and inventory that makes sellable. Trailing 30 days.',
            html`<button class="btn btn-g" data-kit>${icon('copy')}Copy media kit</button><button class="btn btn-g" data-ds>${icon('download')}Training data</button><button class="btn btn-q btn-icon" data-fresh title="Recompute">${icon('refresh')}</button>`)}
          <div class="grid g4 stagger"><div class="card kpi"><div class="kpi-l">${icon('users')}Unique visitors</div><div class="kpi-v">${num(r.visitors)}</div><div class="kpi-m mt-s">${num(r.sessions)} sessions · ${r.sessionsPerVisitor} per visitor</div></div>
            <div class="card kpi"><div class="kpi-l">${icon('clock')}Attention per session</div><div class="kpi-v">${num(at.avgSeconds)}<small>s</small></div><div class="kpi-m mt-s">${num(at.totalHours)} attentive hours total</div></div>
            <div class="card kpi"><div class="kpi-l">${icon('zap')}Engaged</div><div class="kpi-v">${num(at.engagedRate)}<small>%</small></div><div class="kpi-m mt-s">${num(at.bounceRate)}% bounce</div></div>
            <div class="card kpi ${n(fr.rage) + n(fr.errors) ? 'tone-warn' : ''}"><div class="kpi-l">${icon('alert')}Friction</div><div class="kpi-v">${num(n(fr.rage) + n(fr.dead) + n(fr.errors))}</div><div class="kpi-m mt-s">${num(fr.rage)} rage · ${num(fr.dead)} dead clicks · ${num(fr.errors)} errors</div></div></div>
          <div class="section-t"><div><h2>Addressable segments</h2><p>Audiences an advertiser can buy, sized from real sessions.</p></div></div>
          <div class="card flush"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Segment</th><th class="num">Visitors</th><th class="num">Reach</th><th class="num">Avg intent</th><th class="num">CPM lift</th></tr></thead><tbody>${(a.segments || []).map(function (s) { return html`<tr><td><div class="t-main">${s.name} ${s.suppress ? html`<span class="tag">not sold</span>` : ''}</div><div class="t-sub" style="white-space:normal">${s.why}</div></td><td class="num">${num(s.visitors)}</td><td class="num">${s.reach}%</td><td class="num">${num(s.avgIntent)}</td><td class="num">${s.cpmLift}×</td></tr>`; })}</tbody></table></div></div>
          <div class="grid g3 mt"><div class="card"><div class="card-t mb">Devices</div>${CX.hbars(dist(a.devices))}</div><div class="card"><div class="card-t mb">Reading modes</div>${CX.hbars(dist(a.readingModes), null, 'var(--teal)')}</div><div class="card"><div class="card-t mb">Intent bands</div>${CX.hbars(dist(a.intentBands), null, 'var(--c3)')}</div></div>
          <div class="split mt"><div class="card"><div class="card-hd"><div><div class="card-t">When they browse</div><div class="card-s">Sessions by hour of day</div></div></div>
              <div class="heat">${hourly.map(function (h, i) { var c = n(h.count != null ? h.count : h); return html`<i title="${i}:00 · ${num(c)} sessions" style="opacity:${(0.08 + 0.92 * c / hmax).toFixed(2)}"></i>`; })}</div><div class="row between muted mt-s" style="font-size:11px"><span>00:00</span><span>12:00</span><span>23:00</span></div></div>
            <div class="card"><div class="card-t mb">Top paths</div>${(a.topPaths || []).length ? html`<div class="list">${a.topPaths.slice(0, 8).map(function (p) { return html`<div class="li"><div class="li-b"><div class="li-t mono" style="font-size:12px">${p.path}</div></div><div class="li-r"><b>${num(p.count)}</b></div></div>`; })}</div>` : CX.empty('No paths yet')}</div></div>
          <div class="grid g2 mt"><div class="card"><div class="card-t mb">Entry pages</div>${CX.hbars(dist(a.entryPages).slice(0, 8))}</div><div class="card"><div class="card-t mb">Connections</div>${CX.hbars(dist(a.connections), null, 'var(--info)')}</div></div>`);
        on(v.el, '[data-fresh]', 'click', function () { AUD = null; v.refresh(); });
        on(v.el, '[data-kit]', 'click', function () { CX.copy(global.ApaAudience.mediaKit(a), 'Media kit'); });
        on(v.el, '[data-ds]', 'click', function (el) {
          CX.menu(el, [{ label: 'Sessions as CSV', icon: 'download', fn: function () { dl(global.ApaAudience.datasetCSV(a.sessions), 'cabana-sessions.csv', 'text/csv'); } },
            { label: 'Sessions as JSONL', icon: 'download', fn: function () { dl(global.ApaAudience.datasetJSONL(a.sessions), 'cabana-sessions.jsonl', 'application/x-ndjson'); } }]);
        });
        function dl(text, name, type) { var b = new Blob([text], { type: type }); var x = document.createElement('a'); x.href = URL.createObjectURL(b); x.download = name; document.body.appendChild(x); x.click(); x.remove(); CX.log('audience.export', 'dataset', name); toast('Exported ' + name, 'ok'); }
      });
    }
  });

  /* ════════════════════════════════════════════════════════════════
     SYSTEM HEALTH
     ════════════════════════════════════════════════════════════════ */
  CX.view('health', {
    title: 'System health',
    render: function (v) {
      set(v.el, html`${pageHd('System', 'System health', 'Background jobs, integrations, payments and storage — everything that has to keep running when nobody is looking.')}${CX.skeleton('kpis')}`);
      return rpc('admin_health').then(function (h) {
        if (!v.alive()) return;
        var cron = h.cron || [], cal = h.calendar || {}, em = h.email || {}, pu = h.push || {}, pay = h.payments || {}, ops = h.ops_alerts || [];
        var cronBad = cron.filter(function (j) { return j.error || !j.active || j.last_status === 'failed' || n(j.failures_24h); }).length;
        var openOps = ops.filter(function (o) { return !o.acknowledged_at; });
        var tiles = [
          ['Scheduled jobs', cronBad ? 'bad' : '', cronBad ? num(cronBad) + ' need attention' : num(cron.length) + ' healthy', 'clock'],
          ['Calendar sync', n(cal.failing) ? 'warn' : '', n(cal.failing) ? num(cal.failing) + ' feed(s) failing' : num(cal.feeds) + ' feeds · last run ' + ago(cal.last_run), 'calendar'],
          ['Email', n(em.failed_7d) ? 'warn' : '', num(em.sent_7d) + ' sent · ' + num(em.failed_7d) + ' failed (7d)', 'mail'],
          ['Payments', n(pay.stuck) || n(pay.failed_24h) > 5 ? 'warn' : '', num(pay.failed_24h) + ' failed (24h) · ' + num(pay.stuck) + ' stuck', 'coins'],
          ['Push', '', num(pu.subscribers) + ' members · ' + num(pu.subscriptions) + ' devices', 'bell'],
          ['Ops alerts', openOps.length ? 'bad' : '', openOps.length ? num(openOps.length) + ' unacknowledged' : 'Nothing open', 'activity']
        ];
        var storage = h.storage || {}, tables = h.tables || {};
        set(v.el, html`${pageHd('System', 'System health', 'Background jobs, integrations, payments and storage — everything that has to keep running when nobody is looking.', html`<span class="muted" style="font-size:12.5px">Checked ${fdt(h.at)}</span><button class="btn btn-g" data-reload>${icon('refresh')}Re-check</button>`)}
          <div class="grid g3 stagger">${tiles.map(function (t) { return html`<div class="card"><div class="row"><span class="health-dot ${t[1]}"></span><div class="grow"><div class="strong">${t[0]}</div><div class="muted" style="font-size:12.5px;margin-top:2px">${t[2]}</div></div>${icon(t[3], 'muted')}</div></div>`; })}</div>
          ${openOps.length ? html`<div class="section-t"><div><h2>Ops alerts</h2><p>Raised automatically by payment reconciliation, calendar sync and other watchers.</p></div></div>
            <div class="col" style="gap:8px">${openOps.map(function (o) { return html`<div class="callout ${o.severity === 'critical' || o.severity === 'high' ? 'bad' : 'warn'}">${icon('alert')}<div class="grow"><div class="strong">${o.title}</div><div class="muted" style="font-size:12.5px;margin-top:2px">${o.body || ''} · ${human(o.kind)} · ${ago(o.created_at)}</div></div><button class="btn btn-sm btn-g" data-ack="${o.id}">Acknowledge</button></div>`; })}</div>` : ''}
          <div class="section-t"><div><h2>Scheduled jobs</h2><p>pg_cron inside the database</p></div></div>
          <div class="card flush"><table class="tbl"><thead><tr><th>Job</th><th>Schedule</th><th>Last run</th><th class="num">Runs · 24h</th><th class="num">Failures</th></tr></thead><tbody>${cron.map(function (j) { return html`<tr><td><div class="t-main">${j.name}</div>${j.error ? html`<div class="t-sub bad-t">${j.error}</div>` : j.last_message ? html`<div class="t-sub mono">${j.last_message}</div>` : ''}</td><td class="mono t-sub">${j.schedule || ''}</td>
            <td>${j.last_status ? CX.pill(j.last_status) : ''} <span class="t-sub">${j.last_run ? ago(j.last_run) : 'never'}</span></td><td class="num">${num(j.runs_24h)}</td><td class="num ${n(j.failures_24h) ? 'bad-t' : ''}">${num(j.failures_24h)}</td></tr>`; })}</tbody></table></div>
          <div class="split mt"><div class="card"><div class="card-hd"><div><div class="card-t">Calendar sync</div><div class="card-s">${num(cal.runs_24h)} runs and ${num(cal.errors_24h)} errors in 24h</div></div></div>
              ${(cal.failing_feeds || []).length ? html`${cal.failing_feeds.map(function (f) { return html`<div class="note bad" style="margin-bottom:8px"><b>${f.listing || 'Listing'}</b> · ${human(f.platform)} · ${num(f.failures)} failures<div class="muted" style="font-size:12px;margin-top:3px">${f.error || ''}${f.last_success_at ? ' · last success ' + ago(f.last_success_at) : ''}</div></div>`; })}` : CX.empty('Every feed is syncing', '', 'checkCircle', true)}</div>
            <div class="card"><div class="card-hd"><div><div class="card-t">Database & storage</div><div class="card-s">Postgres ${String((h.database || {}).version || '').split(' ')[0]} · ${CX.bytes((h.database || {}).size_bytes)}</div></div></div>
              ${CX.kv(Object.keys(storage).sort().map(function (k) { return [k, CX.bytes(storage[k].bytes) + ' · ' + num(storage[k].objects) + ' files']; }))}</div></div>
          <details class="more mt"><summary>Row counts</summary><div class="card mt-s"><div class="kvs">${CX.kv(Object.keys(tables).sort().map(function (k) { return [k, num(tables[k])]; }))}</div></div></details>`);
        on(v.el, '[data-reload]', 'click', function () { v.refresh(); });
        on(v.el, '[data-ack]', 'click', function (el) { CX.busy(el, function () { return rpc('admin_safety_action', { p_kind: 'ops', p_id: el.getAttribute('data-ack'), p_action: 'acknowledge', p_note: null }).then(function () { toast('Acknowledged', 'ok'); CX.pulseNow(true); v.refresh(); }); }); });
      });
    }
  });

  /* ════════════════════════════════════════════════════════════════
     AUDIT LOG
     ════════════════════════════════════════════════════════════════ */
  function targetLink(a) {
    var id = a.target_id; if (!id) return '';
    if (a.target_type === 'listing') return html`<button class="link-btn" data-listing="${id}">${String(id).slice(0, 8)}</button>`;
    if (a.target_type === 'profile') return html`<button class="link-btn" data-person="${id}">${String(id).slice(0, 8)}</button>`;
    if (a.target_type === 'booking' && a.meta && a.meta.service) return html`<button class="link-btn" data-booking="${a.meta.service}:${id}">${String(id).slice(0, 8)}</button>`;
    return html`<span class="mono">${String(id).slice(0, 18)}</span>`;
  }
  CX.view('audit', {
    title: 'Audit log',
    render: function (v) {
      var type = v.q.type || 'all', page = Math.max(0, +(v.q.page || 0)), LIM = 60;
      set(v.el, html`${pageHd('System', 'Audit log', 'Every operator action, stamped with who did it — written by the database, not the browser.')}${CX.skeleton('list')}`);
      return rpc('admin_audit', { p_q: v.q.q || null, p_type: type === 'all' ? null : type, p_limit: LIM, p_offset: page * LIM }).then(function (d) {
        if (!v.alive()) return;
        var types = d.types || {};
        set(v.el, html`${pageHd('System', 'Audit log', 'Every operator action, stamped with who did it — written by the database, not the browser.', html`<button class="btn btn-g" data-exp>${icon('download')}Export</button>`)}
          <div class="chips mb"><span class="chip ${type === 'all' ? 'on' : ''}" data-type="all">Everything</span>${Object.keys(types).sort(function (x, y) { return types[y] - types[x]; }).map(function (t) { return html`<span class="chip ${type === t ? 'on' : ''}" data-type="${t}">${human(t)}<span class="n">${num(types[t])}</span></span>`; })}</div>
          <div class="filters"><label class="search wide">${icon('search')}<input class="inp" type="search" placeholder="Action, operator, target or details…" value="${v.q.q || ''}" data-search aria-label="Search audit log"/></label><span class="muted" style="margin-left:auto;font-size:12.5px">${num(d.total)} entries</span></div>
          <div class="card flush">${(d.rows || []).length ? html`<div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>When</th><th>Operator</th><th>Action</th><th>Target</th><th class="hide-s">Details</th></tr></thead><tbody>${d.rows.map(function (a) {
            var meta = a.meta || {}, bad = /ban|purge|delete|reject|suspend|revoke|cancel/.test(a.action), good = /approve|verify|publish|reinstate|refund|paid|restore/.test(a.action);
            var detail = Object.keys(meta).filter(function (k) { return meta[k] != null && meta[k] !== '' && typeof meta[k] !== 'object'; }).slice(0, 4).map(function (k) { return human(k) + ': ' + String(meta[k]).slice(0, 60); }).join(' · ');
            return html`<tr><td class="t-sub nowrap" title="${fdt(a.created_at)}">${ago(a.created_at)}</td><td class="t-main">${String(a.actor_email || '').split('@')[0]}</td>
              <td><span class="pill ${bad ? 'p-bad' : good ? 'p-ok' : 'p-mute'}">${a.action}</span></td><td>${human(a.target_type)} ${targetLink(a)}</td><td class="hide-s t-sub" style="white-space:normal;max-width:420px">${detail}</td></tr>`; })}</tbody></table></div>
            <div class="pager"><span>Page ${num(page + 1)} of ${num(Math.max(1, Math.ceil(n(d.total) / LIM)))}</span><div class="btn-row"><button class="btn btn-sm btn-g" data-page="${page - 1}"${page ? '' : raw(' disabled')}>${icon('chevL')}Newer</button><button class="btn btn-sm btn-g" data-page="${page + 1}"${(page + 1) * LIM < n(d.total) ? '' : raw(' disabled')}>Older${icon('chevR')}</button></div></div>`
            : CX.empty('Nothing recorded', 'Operator actions appear here as they happen.', 'scroll')}</div>`);
        wireOpeners(v.el);
        on(v.el, '[data-type]', 'click', function (el) { v.setQ({ type: el.getAttribute('data-type') === 'all' ? null : el.getAttribute('data-type'), page: null }); v.refresh(); });
        on(v.el, '[data-page]', 'click', function (el) { v.setQ({ page: +el.getAttribute('data-page') || null }); v.refresh(); });
        var s = $('[data-search]', v.el); s.addEventListener('input', CX.debounce(function () { v.setQ({ q: s.value.trim() || null, page: null }); v.refresh(); }, 400));
        if (v.q.q) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
        on(v.el, '[data-exp]', 'click', function (el) { CX.busy(el, function () { return rpc('admin_audit', { p_q: v.q.q || null, p_type: type === 'all' ? null : type, p_limit: 500, p_offset: 0 }).then(function (x) {
          CX.csv(x.rows || [], [['created_at', 'When'], ['actor_email', 'Operator'], ['action', 'Action'], ['target_type', 'Target type'], ['target_id', 'Target'], ['meta', 'Details']], 'cabana-audit-log.csv'); }); }); });
      });
    }
  });

  /* ════════════════════════════════════════════════════════════════
     TEAM & ACCESS
     ════════════════════════════════════════════════════════════════ */
  CX.view('team', {
    title: 'Team & access',
    render: function (v) {
      set(v.el, html`${pageHd('System', 'Team & access', 'Who can open this console. The roster lives in the database and every privileged function checks it.')}${CX.skeleton('list')}`);
      return rpc('admin_team').then(function (t) {
        if (!v.alive()) return;
        var sup = t.my_role === 'super_admin';
        set(v.el, html`${pageHd('System', 'Team & access', 'Who can open this console. The roster lives in the database and every privileged function checks it.', sup ? html`<button class="btn btn-p" data-add>${icon('plus')}Add operator</button>` : '')}
          <div class="card flush"><table class="tbl"><thead><tr><th>Operator</th><th>Role</th><th class="hide-s">Last sign-in</th><th class="num hide-s">Actions · 30d</th><th></th></tr></thead><tbody>${(t.members || []).map(function (m) { var me = String(m.email).toLowerCase() === t.me; return html`
            <tr><td><div class="cell">${CX.avatar(m.name || m.email, 'sm')}<div><div class="t-main">${m.name || String(m.email).split('@')[0]} ${me ? html`<span class="tag">you</span>` : ''}</div><div class="t-sub">${m.email}</div></div></div></td>
            <td>${m.role === 'super_admin' ? html`<span class="pill p-brand">${icon('key')}Super admin</span>` : html`<span class="pill p-mute">Admin</span>`}</td>
            <td class="hide-s t-sub">${m.last_sign_in_at ? ago(m.last_sign_in_at) : 'Never signed in'}</td><td class="num hide-s">${num(m.actions_30d)}</td>
            <td><div class="t-act">${sup && !me ? html`<button class="btn btn-sm btn-g" data-role="${m.email}" data-r="${m.role === 'super_admin' ? 'admin' : 'super_admin'}">${m.role === 'super_admin' ? 'Make admin' : 'Make super admin'}</button><button class="btn btn-sm btn-q btn-icon" data-rm="${m.email}" title="Remove">${icon('trash')}</button>` : ''}</div></td></tr>`; })}</tbody></table></div>
          <div class="grid g2 mt"><div class="card"><div class="card-t">How access works</div><div class="col mt" style="gap:10px;font-size:13px;color:var(--ink-3);line-height:1.55">
              <div>${icon('lock')} Signing in proves who someone is. Being on this roster is what lets them in — checked by the database on every read and write.</div>
              <div>${icon('key')} Super admins can add and remove operators. Admins run everything else.</div>
              <div>${icon('scroll')} Every change here is written to the audit log.</div></div></div>
            <div class="card"><div class="card-t">Your preferences</div><div class="col mt" style="gap:10px">
              <div class="row between"><span>Theme</span>${CX.seg([['dark', 'Dark', 'moon'], ['light', 'Light', 'sun']], CX.theme(), 'data-theme-set')}</div>
              <div class="row between"><span>Default date range</span>${CX.seg([[7, '7d'], [30, '30d'], [90, '90d'], [365, '12m']], CX.range, 'data-range-set')}</div>
              <div class="row between"><span>Keyboard shortcuts</span><button class="btn btn-sm btn-g" data-keys>${icon('cmd')}Show</button></div></div></div></div>`);
        on(v.el, '[data-theme-set]', 'click', function (el) { if (el.getAttribute('data-theme-set') !== CX.theme()) { document.documentElement.setAttribute('data-theme', el.getAttribute('data-theme-set')); CX.store('theme', el.getAttribute('data-theme-set')); v.refresh(); } });
        on(v.el, '[data-range-set]', 'click', function (el) { CX.range = +el.getAttribute('data-range-set'); CX.store('range', CX.range); v.refresh(); });
        on(v.el, '[data-keys]', 'click', function () { document.dispatchEvent(new KeyboardEvent('keydown', { key: '?' })); });
        on(v.el, '[data-add]', 'click', function () { form({ title: 'Add an operator', sub: 'They sign in with this email (password or Google) and get the console straight away.', icon: 'key', fields: [
            { name: 'email', type: 'email', label: 'Email', required: true, full: true }, { name: 'name', label: 'Name' }, { name: 'role', label: 'Role', type: 'select', value: 'admin', options: [['admin', 'Admin'], ['super_admin', 'Super admin']] }], submit: 'Add to roster',
          onSubmit: function (f) { return rpc('admin_team_set', { p_email: f.email, p_role: f.role, p_name: f.name || null }).then(function () { toast(f.email + ' can now open the console', 'ok'); v.refresh(); }); } }); });
        on(v.el, '[data-role]', 'click', function (el) { CX.busy(el, function () { return rpc('admin_team_set', { p_email: el.getAttribute('data-role'), p_role: el.getAttribute('data-r'), p_name: null }).then(function () { toast('Role updated', 'ok'); v.refresh(); }); }); });
        on(v.el, '[data-rm]', 'click', function (el) { confirm({ title: 'Remove ' + el.getAttribute('data-rm') + '?', tone: 'danger', confirm: 'Remove access', icon: 'ban', body: 'They lose console access immediately. Their past actions stay in the audit log.',
          onConfirm: function () { return rpc('admin_team_remove', { p_email: el.getAttribute('data-rm') }).then(function () { toast('Access removed', 'ok'); v.refresh(); }); } }); });
      });
    }
  });
})(window);
