/* ═══════════════════════════════════════════════════════════════════
   CABANA · OPERATIONS CONSOLE · core views
   Home · Inbox · Bookings · Listings (+ editor) · Members · Finance
   Every read is an admin_* RPC; every write is an audited RPC or a
   roster-gated table write. Drawers open over whatever you are doing.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  var CX = global.CX; if (!CX) return;
  var html = CX.html, raw = CX.raw, set = CX.set, icon = CX.icon, $ = CX.$, $$ = CX.$$;
  var n = CX.n, num = CX.num, money = CX.money, moneyC = CX.moneyC, compact = CX.compact, ago = CX.ago, fdt = CX.fdt, fdate = CX.fdate, fshort = CX.fshort, human = CX.human;
  var rpc = CX.rpc, toast = CX.toast, confirm = CX.confirm, form = CX.form, drawer = CX.drawer, svc = CX.svc;

  function on(root, sel, ev, fn) { $$(sel, root).forEach(function (el) { el.addEventListener(ev, function (e) { fn(el, e); }); }); }
  function pageHd(eyebrow, title, lede, actions) {
    return html`<div class="page-hd"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${lede ? html`<p class="lede">${lede}</p>` : ''}</div>${actions ? html`<div class="page-act">${actions}</div>` : ''}</div>`;
  }
  function who(p, role, extra) {
    if (!p) return html`<div class="who"><span class="avatar sm" style="background:var(--panel-4)">?</span><div class="grow"><div class="who-n muted">No ${role || 'member'} on record</div></div></div>`;
    return html`<div class="who click" data-person="${p.id}">${CX.avatar(p.name || p.email)}<div class="grow" style="min-width:0">
      <div class="who-n">${p.name || p.email || 'Member'} ${p.verified ? html`<span class="pill p-ok" style="margin-left:4px">${icon('check')}Verified</span>` : ''}</div>
      <div class="who-s">${role ? html`<span class="tag" style="margin-right:6px">${role}</span>` : ''}${[p.email, p.phone].filter(Boolean).join(' · ')}</div>${extra || ''}</div>${icon('chevR')}</div>`;
  }
  function wirePeople(root) { on(root, '[data-person]', 'click', function (el) { CX.open.person(el.getAttribute('data-person')); }); }
  function wireOpeners(root) {
    wirePeople(root);
    on(root, '[data-listing]', 'click', function (el) { CX.open.listing(el.getAttribute('data-listing')); });
    on(root, '[data-booking]', 'click', function (el) { var p = el.getAttribute('data-booking').split(':'); CX.open.booking(p[0], p.slice(1).join(':')); });
    on(root, '[data-go]', 'click', function (el, e) { e.preventDefault(); CX.go(el.getAttribute('data-go')); });
    on(root, '[data-copy]', 'click', function (el, e) { e.stopPropagation(); CX.copy(el.getAttribute('data-copy'), el.getAttribute('data-copy-label') || 'Copied'); });
  }
  function linkTo(hash) {
    var m = String(hash || '').match(/^#\/(listings|people)\/([^/?#]+)/);
    if (m) return function () { (m[1] === 'listings' ? CX.open.listing : CX.open.person)(decodeURIComponent(m[2])); };
    m = String(hash || '').match(/^#\/bookings\/([^/]+)\/([^/?#]+)/);
    if (m) return function () { CX.open.booking(m[1], decodeURIComponent(m[2])); };
    if (/^https?:|^\//.test(hash || '')) return function () { global.open(hash, '_blank', 'noopener'); };
    return function () { CX.go(String(hash || '#/home')); };
  }
  function greeting() {
    var h = +CX.DTF.hour.format(new Date());
    return h < 5 ? 'Working late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }
  function rangeSeg(active) { return CX.seg([[7, '7d'], [30, '30d'], [90, '90d'], [365, '12m']], active, 'data-range'); }
  function wireRange(root, v) {
    on(root, '[data-range]', 'click', function (el) { CX.range = +el.getAttribute('data-range'); CX.store('range', CX.range); v.refresh(); });
  }
  function actBtn(label, ic, kind, attrs) { return html`<button class="btn btn-sm ${kind || ''}" ${raw(attrs || '')}>${ic ? icon(ic) : ''}${label}</button>`; }

  /* Queue catalogue shared by Home and Inbox */
  var QUEUES = {
    sos: { label: 'SOS alerts', icon: 'siren', to: 'safety?tab=sos', g: 'trust', hot: true },
    refunds: { label: 'Refunds owed', icon: 'coins', to: 'finance?tab=refunds', g: 'money', hot: true },
    checkin: { label: 'Check-in issues', icon: 'alert', to: 'safety?tab=checkin', g: 'trust', hot: true },
    support: { label: 'Support threads', icon: 'lifebuoy', href: '/support-console', g: 'trust' },
    withdrawals: { label: 'Payout requests', icon: 'wallet', to: 'finance?tab=payouts', g: 'money' },
    disputes: { label: 'Open disputes', icon: 'flag', to: 'safety?tab=disputes', g: 'trust' },
    listings: { label: 'Listings to review', icon: 'building', to: 'listings?state=review', g: 'listings' },
    kyc: { label: 'Agent ID checks', icon: 'idcard', to: 'agents', g: 'people' },
    tours: { label: 'Tours to publish', icon: 'map', to: 'tours', g: 'listings' },
    operators: { label: 'Tour operators', icon: 'map', to: 'tours', g: 'people' },
    events: { label: 'Events to publish', icon: 'ticket', to: 'events', g: 'listings' },
    uploads: { label: 'Uploads to review', icon: 'image', to: 'safety?tab=uploads', g: 'trust' },
    host_review: { label: 'Hosts under review', icon: 'user', to: 'people?filter=flagged', g: 'people' },
    flights: { label: 'Flight requests', icon: 'plane', to: 'flights', g: 'ops' },
    rides: { label: 'Ride requests', icon: 'route', to: 'move', g: 'ops' },
    leads: { label: 'Listing leads', icon: 'phone', to: 'leads', g: 'people' },
    tour3d: { label: '3D tour requests', icon: 'cube', to: 'listings?state=all', g: 'listings' },
    conflicts: { label: 'Calendar conflicts', icon: 'calendar', to: 'listings?state=live', g: 'listings' },
    ops: { label: 'Ops alerts', icon: 'activity', to: 'health', g: 'ops', hot: true }
  };
  var QORDER = ['sos', 'refunds', 'checkin', 'support', 'withdrawals', 'disputes', 'listings', 'kyc', 'tours', 'operators', 'events', 'uploads', 'host_review', 'flights', 'rides', 'leads', 'tour3d', 'conflicts', 'ops'];
  function queueTiles(counts, filter, cap) {
    var list = QORDER.filter(function (k) { return n(counts[k]) > 0 && (!filter || filter === 'all' || QUEUES[k].g === filter); });
    if (!list.length) return null;
    var more = cap && list.length > cap ? list.length - cap : 0;
    if (more) list = list.slice(0, cap);
    return html`<div class="queue-strip stagger ${cap ? 'capped' : ''}">${list.map(function (k) {
      var qd = QUEUES[k], hot = qd.hot && n(counts[k]) > 0;
      return html`<a class="q-tile ${hot ? 'hot' : ''}" ${qd.href ? raw('href="' + qd.href + '" target="_blank" rel="noopener"') : raw('href="#/' + qd.to + '"')}>
        <span class="li-ic ${hot ? 'bad' : 'brand'}">${icon(qd.icon)}</span><div class="grow"><div class="q-n">${num(counts[k])}</div><div class="q-l">${qd.label}</div></div>${icon(qd.href ? 'external' : 'chevR')}</a>`; })}
      ${more ? html`<a class="q-tile" href="#/inbox"><span class="li-ic">${icon('inbox')}</span><div class="grow"><div class="q-n">+${num(more)}</div><div class="q-l">more queues</div></div>${icon('chevR')}</a>` : ''}</div>`;
  }

  /* ════════════════════════════════════════════════════════════════
     HOME
     ════════════════════════════════════════════════════════════════ */
  CX.view('home', {
    title: 'Overview', chart: true,
    render: function (v) {
      var days = CX.range, me = CX.me || {};
      var first = String(me.name || me.email || '').split(/[\s@]/)[0];
      set(v.el, html`<div class="hello"><div><div class="eyebrow">${CX.DTF.wd.format(new Date())}</div><h1>${greeting()}${first ? ', ' + first : ''}</h1><p class="lede"><span class="skel w-70" style="display:inline-block;width:320px"></span></p></div>
        <div class="page-act">${rangeSeg(days)}</div></div>${CX.skeleton('kpis')}<div class="mt">${CX.skeleton('kpis')}</div>`);
      wireRange(v.el, v);
      return Promise.all([rpc('admin_overview', { p_days: days }), CX.inbox ? Promise.resolve(CX.inbox) : rpc('admin_inbox')]).then(function (r) {
        if (!v.alive()) return;
        var ov = r[0] || {}, ib = r[1] || {}; CX.inbox = ib; CX.counts = ib.counts || CX.counts; CX.paintBadges();
        var k = ov.kpis || {}, t = ov.totals || {}, series = ov.series || [];
        var col = function (key) { return series.map(function (d) { return n(d[key]); }); };
        var total = CX.inboxTotal();
        var lede = num(k.bookings) + ' booking' + (n(k.bookings) === 1 ? '' : 's') + ', ' + money(k.collected) + ' collected and ' + num(k.visitors) + ' visitors in the last ' + (days === 365 ? '12 months' : days + ' days') + '.';
        var tiles = queueTiles(ib.counts || {}, null, 9);
        var kpis = [
          { l: 'Secured GMV', ic: 'trendUp', v: k.gmv, p: k.gmv_prev, f: 'moneyC', s: col('gmv'), m: 'Paid-up bookings' },
          { l: 'Collected', ic: 'coins', v: k.collected, p: k.collected_prev, f: 'moneyC', s: col('collected'), m: 'Cash received', c: 'var(--teal)' },
          { l: 'Cabana revenue', ic: 'wallet', v: k.revenue, p: k.revenue_prev, f: 'moneyC', s: col('revenue'), m: 'Fees on secured bookings', c: 'var(--c3)' },
          { l: 'Bookings', ic: 'calendar', v: k.bookings, p: k.bookings_prev, f: 'num', s: col('bookings'), m: num(k.secured) + ' secured · ' + moneyC(k.demand) + ' demand' },
          { l: 'Visitors', ic: 'globe', v: k.visitors, p: k.visitors_prev, f: 'num', s: col('visitors'), m: 'Unique devices', c: 'var(--info)' },
          { l: 'New members', ic: 'users', v: k.signups, p: k.signups_prev, f: 'num', s: col('signups'), m: num(t.users) + ' in total', c: 'var(--pink)' },
          { l: 'New listings', ic: 'building', v: k.listings_new, p: k.listings_new_prev, f: 'num', m: num(t.live_listings) + ' live of ' + num(t.all_listings) },
          { l: 'Pay-through', ic: 'checkCircle', v: CX.ratio(k.secured, k.bookings), p: CX.ratio(k.secured_prev, k.bookings_prev), f: 'pct', m: 'Bookings that got paid', tone: n(k.bookings) && !n(k.secured) ? 'tone-bad' : '' }
        ];
        set(v.el, html`
          <div class="hello"><div><div class="eyebrow">${CX.DTF.wd.format(new Date())}</div><h1>${greeting()}${first ? ', ' + first : ''}</h1><p class="lede">${lede}</p></div>
            <div class="page-act">${rangeSeg(days)}<button class="btn btn-g" data-preview>${icon('eye')}<span class="hide-s">Preview site</span></button></div></div>
          ${total ? html`<div class="section-t" style="margin-top:4px"><div><h2>Needs you</h2><p>${num(total)} decision${total === 1 ? '' : 's'} waiting across the platform</p></div><a class="btn btn-sm btn-g" href="#/inbox">Open inbox ${icon('arrowR')}</a></div>${tiles}`
            : html`<div class="allclear"><span class="li-ic ok">${icon('checkCircle')}</span><div><div class="strong">All clear</div><div class="muted" style="font-size:12.5px">No queue needs a human right now.</div></div></div>`}
          <div class="grid g4 stagger">${kpis.map(function (x) {
            return html`<div class="card kpi ${x.tone || ''}"><div class="kpi-l">${icon(x.ic)}${x.l}</div>
              <div class="kpi-v" data-count="${n(x.v)}" data-fmt="${x.f}">0</div>
              <div class="kpi-f"><div>${CX.delta(x.v, x.p)}<div class="kpi-m" style="margin-top:6px">${x.m}</div></div>${x.s ? CX.sparkline(x.s, x.c) : ''}</div></div>`; })}</div>
          <div class="split mt">
            <div class="card"><div class="card-hd"><div><div class="card-t">Activity</div><div class="card-s">Daily, Nairobi time</div></div>
              ${CX.seg([['bookings', 'Bookings'], ['collected', 'Cash'], ['visitors', 'Visitors'], ['signups', 'Members']], CX.store('home-metric') || 'bookings', 'data-metric')}</div>
              <div class="chart" id="home-chart"></div><div class="legend mt-s" id="home-legend"></div></div>
            <div class="card"><div class="card-hd"><div><div class="card-t">Conversion funnel</div><div class="card-s">From first visit to paid booking</div></div></div>${CX.funnel(ov.funnel || [])}
              <div class="card-f"><span class="muted">Visitor → paid</span><b class="tnum">${CX.pct(CX.ratio((ov.funnel || [])[4] && ov.funnel[4].value, (ov.funnel || [])[0] && ov.funnel[0].value))}</b></div></div>
          </div>
          <div class="grid g3 mt">
            <div class="card"><div class="card-hd"><div><div class="card-t">By service</div><div class="card-s">Bookings and cash in this period</div></div></div>
              ${(ov.services || []).length ? html`<div class="list">${ov.services.map(function (s) { var m = svc(s.service); return html`
                <div class="li click" data-go="bookings?service=${s.service}"><span class="li-ic">${icon(m.icon)}</span><div class="li-b"><div class="li-t">${m.label}</div><div class="li-s">${num(s.bookings)} bookings · ${num(s.secured)} secured</div></div>
                <div class="li-r"><b>${moneyC(s.collected)}</b>collected</div></div>`; })}</div>` : CX.empty('No bookings in this period', 'Try a longer range.', 'calendar')}</div>
            <div class="card"><div class="card-hd"><div><div class="card-t">Top performers</div><div class="card-s">By secured value, then demand</div></div></div>
              ${(ov.top_listings || []).length ? html`<div class="list">${ov.top_listings.map(function (x, i) { return html`
                <div class="li ${x.service === 'stay' || x.service === 'food' ? 'click' : ''}" ${x.service === 'stay' || x.service === 'food' ? raw('data-listing="' + CX.esc(x.item_id) + '"') : ''}><span class="li-ic brand" style="font:650 13px var(--f-d)">${i + 1}</span>
                <div class="li-b"><div class="li-t">${x.title || 'Untitled'}</div><div class="li-s">${svc(x.service).label} · ${num(x.bookings)} bookings</div></div><div class="li-r"><b>${moneyC(x.gmv)}</b>${moneyC(x.collected)} in</div></div>`; })}</div>` : CX.empty('Nothing ranked yet', '', 'star')}</div>
            <div class="card"><div class="card-hd"><div><div class="card-t">Where visitors come from</div><div class="card-s">Unique devices by source</div></div></div>
              ${CX.hbars((ov.sources || []).map(function (s) { return { label: s.source, value: s.visitors }; }))}
              <div class="divider"></div>${CX.hbars((ov.devices || []).map(function (s) { return { label: s.device, value: s.visitors, color: 'var(--teal)' }; }))}</div>
          </div>
          <div class="split mt">
            <div class="card"><div class="card-hd"><div><div class="card-t">Latest activity</div><div class="card-s">Bookings, sign-ups and new listings as they land</div></div><a class="btn btn-sm btn-q" href="#/audit">Audit log ${icon('arrowR')}</a></div>
              <div class="list">${(ov.recent || []).slice(0, 14).map(function (a) {
                var ic = a.kind === 'booking' ? svc(a.service).icon : a.kind === 'signup' ? 'user' : 'building';
                var tone = a.kind === 'booking' ? (a.stage === 'secured' || a.stage === 'fulfilled' ? 'ok' : a.stage === 'lost' ? '' : 'warn') : a.kind === 'signup' ? 'brand' : 'info';
                var attr = a.kind === 'booking' ? 'data-booking="' + CX.esc(a.service + ':' + a.id) + '"' : a.kind === 'signup' ? 'data-person="' + CX.esc(a.id) + '"' : 'data-listing="' + CX.esc(a.id) + '"';
                return html`<div class="li click" ${raw(attr)}><span class="li-ic ${tone}">${icon(ic)}</span><div class="li-b">
                  <div class="li-t">${a.kind === 'booking' ? (a.title || 'Booking') : a.kind === 'signup' ? a.title + ' joined' : 'New listing · ' + (a.title || 'Untitled')}</div>
                  <div class="li-s">${a.kind === 'booking' ? (a.who || 'Guest') + ' · ' + money(a.amount) : a.who || ''}</div></div>
                  <div class="li-r">${a.kind === 'booking' ? CX.stagePill(a.stage) : ''}<div style="margin-top:4px">${ago(a.at)}</div></div></div>`; })}</div></div>
            <div class="card"><div class="card-hd"><div><div class="card-t">Platform</div><div class="card-s">All-time totals</div></div></div>
              ${CX.kv([['Members', num(t.users)], ['Hosts with listings', num(t.hosts)], ['Live listings', num(t.live_listings) + ' / ' + num(t.all_listings)], ['Live tours', num(t.live_tours)],
                ['Upcoming events', num(t.live_events)], ['Cars in fleet', num(t.fleet)], ['Push subscribers', num(t.push_subscribers)], ['Bookings ever', num(t.bookings_all)], ['Cash ever collected', money(t.collected_all)]])}</div>
          </div>`);
        CX.countUp(v.el);
        wireRange(v.el, v); wireOpeners(v.el);
        on(v.el, '[data-preview]', 'click', function () { CX.preview(); });
        var labels = series.map(function (d) { return d.d; });
        function paintChart(metric) {
          CX.store('home-metric', metric);
          $$('[data-metric]', v.el).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-metric') === metric); });
          var sets = {
            bookings: [{ name: 'Bookings', color: 'var(--c1)', values: col('bookings') }, { name: 'Secured', color: 'var(--ok)', values: col('secured'), fill: false }],
            collected: [{ name: 'Collected', color: 'var(--teal)', values: col('collected'), fmt: money }, { name: 'Secured GMV', color: 'var(--c1)', values: col('gmv'), fmt: money, fill: false, dash: true }],
            visitors: [{ name: 'Visitors', color: 'var(--info)', values: col('visitors') }],
            signups: [{ name: 'New members', color: 'var(--pink)', values: col('signups') }]
          }[metric];
          CX.lineChart($('#home-chart', v.el), { labels: labels, series: sets, height: 250, tickFmt: fshort, tipLabel: function (d) { return CX.fdate(d); }, axis: metric === 'collected' ? compact : compact, label: 'Activity chart' });
          set($('#home-legend', v.el), html`${sets.map(function (s) { return html`<span><i style="background:${raw(s.color)}"></i>${s.name} · <b class="tnum">${metric === 'collected' ? moneyC(s.values.reduce(function (a, b) { return a + b; }, 0)) : num(s.values.reduce(function (a, b) { return a + b; }, 0))}</b></span>`; })}`);
        }
        paintChart(CX.store('home-metric') || 'bookings');
        on(v.el, '[data-metric]', 'click', function (el) { paintChart(el.getAttribute('data-metric')); });
      });
    }
  });

  /* ════════════════════════════════════════════════════════════════
     INBOX
     ════════════════════════════════════════════════════════════════ */
  var GROUPS = [['all', 'Everything'], ['money', 'Money'], ['trust', 'Trust & safety'], ['listings', 'Listings'], ['people', 'People'], ['ops', 'Operations']];
  CX.view('inbox', {
    title: 'Inbox',
    render: function (v) {
      var g = v.q.g || 'all';
      set(v.el, html`${pageHd('Command', 'Inbox', 'Every decision waiting on a human, from every corner of Cabana. Highest severity first.')}${CX.skeleton('list')}`);
      return rpc('admin_inbox').then(function (ib) {
        if (!v.alive()) return;
        CX.inbox = ib; CX.counts = ib.counts || {}; CX.paintBadges();
        var counts = ib.counts || {};
        var gcount = function (gk) { return QORDER.filter(function (k) { return gk === 'all' || QUEUES[k].g === gk; }).reduce(function (s, k) { return s + n(counts[k]); }, 0); };
        var sevRank = { high: 0, med: 1, low: 2 };
        var items = (ib.items || []).filter(function (it) { var qd = QUEUES[it.queue]; return g === 'all' || (qd && qd.g === g); })
          .sort(function (a, b) { var ra = sevRank[a.severity] != null ? sevRank[a.severity] : 3, rb = sevRank[b.severity] != null ? sevRank[b.severity] : 3; return ra - rb || (a.queue === 'sos' ? -1 : 0) - (b.queue === 'sos' ? -1 : 0) || String(a.at).localeCompare(String(b.at)); });
        var total = gcount('all');
        set(v.el, html`${pageHd('Command', 'Inbox', total ? num(total) + ' decision' + (total === 1 ? '' : 's') + ' waiting. The oldest high-severity item is at the top.' : 'Nothing is waiting on you. New work appears here the moment it arrives.',
            html`<button class="btn btn-g" data-reload>${icon('refresh')}Refresh</button>`)}
          <div class="chips mb">${GROUPS.map(function (x) { var cn = gcount(x[0]); return html`<span class="chip ${g === x[0] ? 'on' : ''}" data-g="${x[0]}" role="button" tabindex="0">${x[1]}${cn ? html`<span class="n">${num(cn)}</span>` : ''}</span>`; })}</div>
          ${queueTiles(counts, g) || ''}
          <div class="card flush mt">${items.length ? html`${items.map(function (it, i) {
            var qd = QUEUES[it.queue] || { label: human(it.queue), icon: 'inbox' };
            var quick = '';
            if (it.queue === 'listings') quick = actBtn('Approve', 'check', 'btn-ok', 'data-approve="' + CX.esc(it.id) + '"');
            return html`<div class="inbox-i" data-i="${i}"><span class="sev ${it.severity}" title="${human(it.severity)} severity"></span><span class="li-ic ${it.severity === 'high' ? 'bad' : 'brand'}">${icon(qd.icon)}</span>
              <div style="min-width:0"><div class="li-t" style="white-space:normal">${it.title}</div><div class="li-s" style="white-space:normal">${qd.label} · ${it.sub || ''}</div></div>
              <div class="inbox-age" title="${fdt(it.at)}">${ago(it.at)}</div>
              <div class="t-act">${quick}<button class="btn btn-sm" data-open="${i}">${/^\/|^https?:/.test(it.link || '') ? 'Open desk' : 'Open'} ${icon(/^\/|^https?:/.test(it.link || '') ? 'external' : 'arrowR')}</button></div></div>`; })}`
            : CX.empty(g === 'all' ? 'Inbox zero' : 'Nothing in this lane', g === 'all' ? 'Every queue is clear. Enjoy it.' : 'Other lanes may still have work.', 'checkCircle', true)}</div>`);
        on(v.el, '[data-g]', 'click', function (el) { v.setQ({ g: el.getAttribute('data-g') === 'all' ? null : el.getAttribute('data-g') }); v.refresh(); });
        on(v.el, '[data-reload]', 'click', function () { v.refresh(); });
        on(v.el, '[data-open]', 'click', function (el) { linkTo(items[+el.getAttribute('data-open')].link)(); });
        on(v.el, '[data-approve]', 'click', function (el) {
          var id = el.getAttribute('data-approve');
          CX.busy(el, function () {
            return rpc('admin_listing_action', { p_id: id, p_action: 'approve', p_reason: null, p_payload: {} }).then(function () {
              toast('Listing approved', 'ok'); el.closest('.inbox-i').classList.add('done'); CX.pulseNow(true);
            });
          });
        });
      });
    }
  });

  /* ════════════════════════════════════════════════════════════════
     BOOKINGS
     ════════════════════════════════════════════════════════════════ */
  var STAGES = [['all', 'All'], ['open', 'Open'], ['secured', 'Secured'], ['fulfilled', 'Fulfilled'], ['lost', 'Lost'], ['moved', 'Moved'], ['refund', 'Refund owed']];
  var PAGE = 50;
  CX.view('bookings', {
    title: 'Bookings',
    render: function (v) {
      var qv = v.q, stage = qv.stage || 'all', service = qv.service || 'all', page = Math.max(0, +(qv.page || 0));
      set(v.el, html`${pageHd('Operations', 'Bookings', 'One ledger for every stay, tour, ticket, car, meal, flight and ride booked on Cabana.')}${CX.skeleton('list')}`);
      var args = { p_service: service === 'all' ? null : service, p_stage: stage === 'all' ? null : stage, p_q: qv.q || null,
        p_from: qv.from ? new Date(qv.from + 'T00:00:00+03:00').toISOString() : null, p_to: qv.to ? new Date(qv.to + 'T23:59:59+03:00').toISOString() : null,
        p_limit: PAGE, p_offset: page * PAGE, p_sort: qv.sort || 'created_desc' };
      var calls = [rpc('admin_bookings', args)];
      if (stage !== 'all') calls.push(rpc('admin_bookings', Object.assign({}, args, { p_stage: null, p_limit: 1, p_offset: 0 })));
      if (v.args.length >= 2) CX.open.booking(v.args[0], v.args[1], true);
      return Promise.all(calls).then(function (r) {
        if (!v.alive()) return;
        var d = r[0] || {}, all = r[1] || d, stg = all.stages || {}, rowsB = d.rows || [], sums = d.sums || {};
        var stageCount = function (s) { if (s === 'all') return Object.keys(stg).reduce(function (a, k) { return a + n(stg[k]); }, 0); if (s === 'refund') return null; return n(stg[s]); };
        var services = Object.keys(d.services || {});
        set(v.el, html`${pageHd('Operations', 'Bookings', 'One ledger for every stay, tour, ticket, car, meal, flight and ride booked on Cabana.',
            html`<button class="btn btn-g" data-export>${icon('download')}Export</button>`)}
          ${services.length > 1 ? html`<div class="chips mb"><span class="chip ${service === 'all' ? 'on' : ''}" data-svc="all">All services</span>${services.map(function (s) { return html`<span class="chip ${service === s ? 'on' : ''}" data-svc="${s}">${icon(svc(s).icon)}${svc(s).label}<span class="n">${num(d.services[s])}</span></span>`; })}</div>` : ''}
          ${CX.tabs(STAGES.map(function (s) { return [s[0], s[1], stageCount(s[0]), s[0] === 'refund']; }), stage)}
          <div class="filters"><label class="search wide">${icon('search')}<input class="inp" type="search" placeholder="Reference, guest, email, phone, listing…" value="${qv.q || ''}" data-search aria-label="Search bookings"/></label>
            <input class="inp" type="date" style="width:auto" value="${qv.from || ''}" data-from aria-label="From date" title="Created from"/>
            <input class="inp" type="date" style="width:auto" value="${qv.to || ''}" data-to aria-label="To date" title="Created until"/>
            <select class="inp" style="width:auto" data-sort aria-label="Sort">${[['created_desc', 'Newest first'], ['created_asc', 'Oldest first'], ['total_desc', 'Highest value'], ['starts_asc', 'Soonest start']].map(function (o) { return html`<option value="${o[0]}"${(qv.sort || 'created_desc') === o[0] ? raw(' selected') : ''}>${o[1]}</option>`; })}</select>
            ${qv.q || qv.from || qv.to ? html`<button class="btn btn-q btn-sm" data-clear>${icon('x')}Clear</button>` : ''}</div>
          <div class="grid g4 mb">
            <div class="mini"><div class="mini-l">Bookings</div><div class="mini-v">${num(d.total)}</div></div>
            <div class="mini"><div class="mini-l">Booked value</div><div class="mini-v">${money(sums.total)}</div></div>
            <div class="mini"><div class="mini-l">Collected</div><div class="mini-v">${money(sums.paid)}</div><div class="mini-s">${CX.pct(CX.ratio(sums.paid, sums.total))} of value</div></div>
            <div class="mini"><div class="mini-l">Refunds owed</div><div class="mini-v ${n(sums.refund_due) ? 'bad-t' : ''}">${money(sums.refund_due)}</div></div></div>
          <div class="card flush">${rowsB.length ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Booking</th><th>Guest</th><th class="hide-s">When</th><th class="num">Value</th><th>Stage</th><th class="num hide-s">Created</th></tr></thead><tbody>
            ${rowsB.map(function (b) { var m = svc(b.service); var paidPct = Math.min(100, CX.ratio(b.paid, b.total)); return html`
              <tr class="click" data-booking="${b.service}:${b.id}"><td><div class="cell"><span class="t-thumb">${icon(m.icon)}</span><div><div class="t-main">${b.item_title || m.label}</div><div class="t-sub mono">${String(b.ref || '').slice(0, 26)}${String(b.ref || '').length > 26 ? '…' : ''}</div></div></div></td>
              <td><div class="t-main">${b.guest_name || 'Guest'}</div><div class="t-sub">${b.guest_email || b.guest_phone || ''}</div></td>
              <td class="hide-s"><div class="t-main nowrap">${b.starts_on ? fshort(b.starts_on) : '—'}${b.ends_on && b.ends_on !== b.starts_on ? ' → ' + fshort(b.ends_on) : ''}</div><div class="t-sub">${b.units ? num(b.units) + ' ' + (b.unit_label || '') + (n(b.units) === 1 ? '' : 's') : ''}${b.city ? ' · ' + b.city : ''}</div></td>
              <td class="num"><div class="t-main">${money(b.total, b.currency)}</div><div class="bar-mini" title="${num(paidPct)}% paid"><i style="width:${paidPct.toFixed(0)}%"></i></div>${n(b.refund_due) ? html`<div class="t-sub bad-t">${money(b.refund_due)} owed</div>` : ''}</td>
              <td>${CX.stagePill(b.stage)}<div class="t-sub">${human(b.status)}</div></td>
              <td class="num hide-s t-sub" title="${fdt(b.created_at)}">${ago(b.created_at)}</td></tr>`; })}</tbody></table></div>
            <div class="pager"><span>${num(page * PAGE + 1)}–${num(page * PAGE + rowsB.length)} of ${num(d.total)}</span><div class="btn-row">
              <button class="btn btn-sm btn-g" data-page="${page - 1}"${page ? '' : raw(' disabled')}>${icon('chevL')}Previous</button>
              <button class="btn btn-sm btn-g" data-page="${page + 1}"${(page + 1) * PAGE < n(d.total) ? '' : raw(' disabled')}>Next${icon('chevR')}</button></div></div>`
            : CX.empty('No bookings match', 'Change the filters or clear the search.', 'calendar')}</div>`);
        wireOpeners(v.el);
        on(v.el, '[data-svc]', 'click', function (el) { v.setQ({ service: el.getAttribute('data-svc') === 'all' ? null : el.getAttribute('data-svc'), page: null }); v.refresh(); });
        on(v.el, '[data-tab]', 'click', function (el) { v.setQ({ stage: el.getAttribute('data-tab') === 'all' ? null : el.getAttribute('data-tab'), page: null }); v.refresh(); });
        on(v.el, '[data-page]', 'click', function (el) { v.setQ({ page: +el.getAttribute('data-page') || null }); v.refresh(); });
        on(v.el, '[data-sort]', 'change', function (el) { v.setQ({ sort: el.value === 'created_desc' ? null : el.value, page: null }); v.refresh(); });
        on(v.el, '[data-from]', 'change', function (el) { v.setQ({ from: el.value || null, page: null }); v.refresh(); });
        on(v.el, '[data-to]', 'change', function (el) { v.setQ({ to: el.value || null, page: null }); v.refresh(); });
        on(v.el, '[data-clear]', 'click', function () { v.setQ({ q: null, from: null, to: null, page: null }); v.refresh(); });
        var s = $('[data-search]', v.el);
        s.addEventListener('input', CX.debounce(function () { v.setQ({ q: s.value.trim() || null, page: null }); v.refresh(); }, 380));
        if (qv.q) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
        on(v.el, '[data-export]', 'click', function (el) {
          CX.busy(el, function () {
            return rpc('admin_bookings', Object.assign({}, args, { p_limit: 500, p_offset: 0 })).then(function (x) {
              CX.csv(x.rows || [], [['ref', 'Reference'], ['service', 'Service'], ['item_title', 'Item'], ['guest_name', 'Guest'], ['guest_email', 'Email'], ['guest_phone', 'Phone'],
                ['starts_on', 'Starts'], ['ends_on', 'Ends'], ['total', 'Total'], ['paid', 'Paid'], ['fee', 'Fee'], ['refund_due', 'Refund due'], ['stage', 'Stage'], ['status', 'Status'], ['created_at', 'Created']], 'cabana-bookings.csv');
            });
          });
        });
      });
    },
    update: function (v) { if (v.args.length >= 2) CX.open.booking(v.args[0], v.args[1], true); else if (drawer.isOpen()) drawer.close(false); }
  });

  function bookingDrawer(service, id, fromRoute) {
    drawer.open({
      key: 'booking:' + service + ':' + id, kicker: html`${icon(svc(service).icon)}${svc(service).label} booking`, title: 'Loading…',
      onClose: function (user) { if (user && fromRoute && /^#\/bookings\//.test(location.hash)) CX.setArgs([]); },
      load: function (d) {
        return rpc('admin_booking', { p_service: service, p_id: id }).then(function (x) {
          if (!d.alive()) return;
          if (!x || x.error) { set(d.body, CX.empty('Booking not found', 'It may have been removed.', 'calendar')); return; }
          var b = x.booking || {}, rw = x.raw || {}, cur = b.currency || 'KES';
          d.set(b.item_title || svc(service).label, html`<span class="mono" data-copy="${b.ref}" data-copy-label="Reference" title="Copy reference" style="cursor:copy">${b.ref}</span><span>·</span><span>${fdt(b.created_at)}</span>`,
            html`${icon(svc(service).icon)}${svc(service).label} booking ${CX.stagePill(b.stage)}`);
          var owed = n(b.refund_due), paid = n(b.paid), total = n(b.total);
          var canCancel = b.stage === 'open' || b.stage === 'secured';
          var timeline = [];
          timeline.push(['brand', 'Booked', fdt(b.created_at) + (b.guest_name ? ' by ' + b.guest_name : '')]);
          (x.payments || []).forEach(function (p) { timeline.push([p.status === 'paid' ? 'ok' : p.status === 'failed' ? 'bad' : '', (p.status === 'paid' ? 'Paid ' : human(p.status) + ' payment · ') + money(p.amount, cur), fdt(p.paid_at || p.created_at) + ' · ' + human(p.payment_method || 'mpesa') + (p.mpesa_receipt ? ' · ' + p.mpesa_receipt : '')]); });
          if (b.checked_in_at) timeline.push(['ok', 'Checked in', fdt(b.checked_in_at)]);
          if (b.cancelled_at) timeline.push(['bad', 'Cancelled', fdt(b.cancelled_at) + (rw.cancel_reason ? ' · ' + rw.cancel_reason : '')]);
          if (rw.refunded_at) timeline.push(['ok', 'Refund recorded', fdt(rw.refunded_at) + (rw.refund_amount ? ' · ' + money(rw.refund_amount, cur) : '')]);
          set(d.body, html`
            <div class="stat-row">
              <div class="mini"><div class="mini-l">Total</div><div class="mini-v">${money(total, cur)}</div></div>
              <div class="mini"><div class="mini-l">Paid</div><div class="mini-v ${paid >= total && total ? 'ok-t' : ''}">${money(paid, cur)}</div></div>
              <div class="mini"><div class="mini-l">${b.stage === 'lost' ? 'Fee · not earned' : 'Cabana fee'}</div><div class="mini-v ${b.stage === 'lost' ? 'muted' : ''}">${money(b.fee, cur)}</div></div>
              <div class="mini"><div class="mini-l">${owed ? 'Refund owed' : 'Credit used'}</div><div class="mini-v ${owed ? 'bad-t' : ''}">${money(owed || b.credit, cur)}</div></div></div>
            <div class="meter mt-s ${paid >= total && total ? 'ok' : ''}" title="${num(CX.ratio(paid, total))}% paid"><i style="width:${Math.min(100, CX.ratio(paid, total)).toFixed(1)}%"></i></div>
            ${owed ? html`<div class="callout warn mt">${icon('coins')}<div class="grow"><div class="strong">${money(owed, cur)} is owed back to the guest</div><div class="muted" style="font-size:12.5px;margin-top:3px">${human(rw.refund_reason || 'Refund due')}. Send it by M-Pesa, then record it here — or convert it to Cabana credit.</div>
              <div class="btn-row mt-s"><button class="btn btn-sm btn-ok" data-act="mark_refunded">${icon('check')}Record refund</button>${service === 'stay' ? html`<button class="btn btn-sm btn-v" data-act="refund_to_credit">${icon('coins')}Convert to credit</button>` : ''}</div></div></div>` : ''}
            <div class="dr-sec"><div class="dr-sec-t">Details</div><div class="kvs">${CX.kv([
              ['Dates', b.starts_on ? fdate(b.starts_on) + (b.ends_on && b.ends_on !== b.starts_on ? ' → ' + fdate(b.ends_on) : '') : '—'],
              ['Quantity', b.units ? num(b.units) + ' ' + (b.unit_label || '') + (n(b.units) === 1 ? '' : 's') : '—'],
              rw.num_guests ? ['Guests', num(rw.num_guests)] : null,
              ['Status', human(b.status)], ['Location', b.city || rw.location || '—'],
              rw.payment_mode ? ['Payment plan', human(rw.payment_mode)] : null,
              rw.deposit_required ? ['Deposit required', money(rw.deposit_required, cur)] : null,
              rw.balance_amount != null && b.stage !== 'lost' ? ['Balance', money(rw.balance_amount, cur) + (rw.balance_paid ? ' · paid' : '')] : null,
              rw.guest_code ? ['Guest code', html`<span class="mono">${rw.guest_code}</span>`] : null,
              rw.host_code ? ['Host code', html`<span class="mono">${rw.host_code}</span>`] : null,
              b.checked_in_at ? ['Checked in', fdt(b.checked_in_at)] : null,
              rw.contact_phone ? ['Contact', rw.contact_phone] : null])}</div></div>
            <div class="dr-sec"><div class="dr-sec-t">People</div><div class="col" style="gap:8px">${who(x.guest, 'Guest')}${x.host ? who(x.host, 'Host', x.host.mpesa_number ? html`<div class="who-s">M-Pesa payout ${x.host.mpesa_number}</div>` : '') : ''}</div></div>
            ${x.listing ? html`<div class="dr-sec"><div class="dr-sec-t">Listing</div><div class="who click" data-listing="${x.listing.id}">${x.listing.photo ? html`<img class="t-thumb" src="${CX.safeUrl(x.listing.photo)}" alt="" loading="lazy"/>` : html`<span class="t-thumb">${icon('building')}</span>`}
              <div class="grow"><div class="who-n">${x.listing.title}</div><div class="who-s">${[x.listing.area, x.listing.city].filter(Boolean).join(', ')}${x.listing.checkin_time ? ' · check-in ' + x.listing.checkin_time : ''}</div></div>${CX.pill(x.listing.status)}</div></div>` : ''}
            <div class="dr-sec"><div class="dr-sec-t">Timeline</div><div class="tl">${timeline.map(function (t) { return html`<div class="tl-i ${t[0]}"><div class="tl-t">${t[1]}</div><div class="tl-s">${t[2]}</div></div>`; })}</div></div>
            ${(x.payments || []).length ? html`<div class="dr-sec"><div class="dr-sec-t">Payments</div><div class="card flush"><table class="tbl compact"><thead><tr><th>Reference</th><th>Method</th><th class="num">Amount</th><th>Status</th></tr></thead><tbody>${x.payments.map(function (p) {
              return html`<tr><td><div class="t-main mono" style="font-size:12px">${p.mpesa_receipt || String(p.reference || '').slice(-18)}</div><div class="t-sub">${fdt(p.paid_at || p.created_at)}${p.phone ? ' · ' + p.phone : ''}</div></td><td>${human(p.payment_method || 'mpesa')}</td><td class="num">${money(p.amount, cur)}</td><td>${CX.pill(p.status)}</td></tr>`; })}</tbody></table></div></div>` : ''}
            ${(x.issues || []).length ? html`<div class="dr-sec"><div class="dr-sec-t">Check-in issues</div>${x.issues.map(function (c) { return html`<div class="note ${c.status === 'escalated' ? 'bad' : ''}" style="margin-bottom:8px"><b>${human(c.issue_code)}</b> · ${human(c.status)}${c.fault ? ' · fault: ' + human(c.fault) : ''}<div style="margin-top:4px">${c.free_text || ''}</div></div>`; })}</div>` : ''}
            ${(x.disputes || []).length ? html`<div class="dr-sec"><div class="dr-sec-t">Disputes</div>${x.disputes.map(function (c) { return html`<div class="note" style="margin-bottom:8px"><b>${human(c.category)}</b> · ${human(c.status)}<div style="margin-top:4px">${c.description || ''}</div></div>`; })}</div>` : ''}
            ${(x.credits || []).length ? html`<div class="dr-sec"><div class="dr-sec-t">Credit movements</div>${x.credits.map(function (t) { return html`<div class="kv"><span>${t.description || human(t.type)}</span><span class="${n(t.points) < 0 ? 'bad-t' : 'ok-t'}">${n(t.points) > 0 ? '+' : ''}${num(t.points)} pts</span></div>`; })}</div>` : ''}
            ${(x.commissions || []).length ? html`<div class="dr-sec"><div class="dr-sec-t">Referral commissions</div>${x.commissions.map(function (e) { return html`<div class="kv"><span>${human(e.type)} · ${human(e.status)}</span><span>${money(e.amount)}</span></div>`; })}</div>` : ''}
            ${(x.holds || []).length ? html`<div class="dr-sec"><div class="dr-sec-t">Calendar holds</div>${x.holds.map(function (h) { return html`<div class="kv"><span class="mono">${h.stay}</span><span>${h.released_at ? 'Released ' + ago(h.released_at) : 'Holding'}</span></div>`; })}</div>` : ''}
            <div class="dr-sec"><div class="dr-sec-t">Notes & history <button class="link-btn" data-act="note">${icon('plus')}Add note</button></div>
              ${(x.notes || []).length ? html`<div class="tl">${x.notes.map(function (a) { return html`<div class="tl-i brand"><div class="tl-t">${a.meta && a.meta.note ? a.meta.note : human(String(a.action).replace('booking.', ''))}${a.meta && a.meta.reason ? ' — ' + a.meta.reason : ''}</div><div class="tl-s">${a.by} · ${fdt(a.at)}</div></div>`; })}</div>` : html`<div class="muted" style="font-size:12.5px">No operator notes yet.</div>`}</div>
            <div class="dr-sec"><details class="more"><summary>Raw record</summary><pre class="code">${JSON.stringify(rw, null, 2)}</pre></details></div>`);
          d.actions(html`${canCancel ? html`<button class="btn btn-d" data-act="cancel">${icon('ban')}Cancel booking</button>` : ''}
            ${!owed && paid > 0 && !canCancel && service !== 'food' ? html`<button class="btn btn-g" data-act="mark_refunded">${icon('coins')}Record a refund</button>` : ''}
            <span class="grow"></span><button class="btn btn-g" data-act="note">${icon('note')}Note</button>
            <button class="btn btn-g" data-copy="${b.ref}" data-copy-label="Reference">${icon('copy')}Copy ref</button>`);
          wireOpeners(d.el);
          $$('[data-act]', d.el).forEach(function (btn) {
            btn.onclick = function () {
              var act = btn.getAttribute('data-act');
              if (act === 'note') return form({ title: 'Add a note', sub: 'Visible to every operator on this booking’s history.', icon: 'note', grid: false,
                fields: [{ name: 'note', type: 'textarea', label: 'Note', required: true, placeholder: 'e.g. Called the guest, refund sent via M-Pesa QX12…' }],
                onSubmit: function (f) { return rpc('admin_booking_action', { p_service: service, p_id: id, p_action: 'note', p_reason: f.note, p_amount: null }).then(function () { toast('Note added', 'ok'); d.reload(); }); } });
              if (act === 'cancel') return confirm({ title: 'Cancel this booking?', tone: 'danger', confirm: 'Cancel booking', icon: 'ban',
                body: paid > 0 ? 'The guest has paid ' + money(paid, cur) + '. Say how much goes back — enter 0 if the payment is forfeited. The amount is recorded as owed until you mark it refunded.' : 'It closes immediately and moves to Lost.',
                amount: paid > 0 ? { label: 'Refund owed to guest (' + cur + ')', value: paid, max: paid, required: true, help: 'Up to ' + money(paid, cur) } : null,
                reason: { label: 'Reason', required: true, placeholder: 'Why is Cabana cancelling this?' },
                onConfirm: function (f) { return rpc('admin_booking_action', { p_service: service, p_id: id, p_action: 'cancel', p_reason: f.reason, p_amount: paid > 0 ? n(f.amount) : null }).then(function (r) {
                  toast('Booking cancelled' + (n(r.refund_due) ? ' · ' + money(r.refund_due, cur) + ' owed back' : ''), 'ok'); d.reload(); CX.pulseNow(true); }); } });
              if (act === 'mark_refunded') return confirm({ title: 'Record a refund', tone: 'ok', confirm: 'Record refund', icon: 'coins',
                body: 'This records money already sent back to the guest. It does not send money itself.',
                amount: { label: 'Amount refunded (' + cur + ')', value: owed || paid, required: true },
                reason: { label: 'Reference or note', required: false, placeholder: 'e.g. M-Pesa QX12AB34CD' },
                onConfirm: function (f) { return rpc('admin_booking_action', { p_service: service, p_id: id, p_action: 'mark_refunded', p_reason: f.reason || null, p_amount: n(f.amount) }).then(function () { toast('Refund recorded', 'ok'); d.reload(); CX.pulseNow(true); }); } });
              if (act === 'refund_to_credit') return confirm({ title: 'Convert to Cabana credit?', tone: 'brand', confirm: 'Convert', icon: 'coins',
                body: 'The ' + money(owed, cur) + ' owed becomes credit on the guest’s account, spendable on their next booking.',
                onConfirm: function () { return rpc('admin_booking_action', { p_service: service, p_id: id, p_action: 'refund_to_credit', p_reason: null, p_amount: null }).then(function () { toast('Converted to credit', 'ok'); d.reload(); CX.pulseNow(true); }); } });
            };
          });
        });
      }
    });
  }
  CX.open.booking = function (service, id, fromRoute) { bookingDrawer(service, id, fromRoute); };

  /* ════════════════════════════════════════════════════════════════
     LISTINGS
     ════════════════════════════════════════════════════════════════ */
  var LSTATES = [['review', 'Needs review'], ['live', 'Live'], ['hidden', 'Hidden'], ['pending_owner', 'Awaiting owner'], ['featured', 'Featured'], ['deleted', 'Deleted'], ['all', 'All']];
  var STATE_PILL = { live: ['Live', 'p-ok'], review: ['Needs review', 'p-warn'], hidden: ['Hidden', 'p-mute'], deleted: ['Deleted', 'p-bad'] };
  function lstate(l) {
    if (l.status === 'pending_owner') return html`<span class="pill dot p-info">Awaiting owner</span>`;
    var st = l.needs_review && l.state === 'live' ? ['Live · unreviewed', 'p-warn'] : STATE_PILL[l.state] || [human(l.state), 'p-mute'];
    return html`<span class="pill dot ${st[1]}">${st[0]}</span>`;
  }
  function publicUrl(l) { return (l.service === 'food' ? '/restaurant?id=' : l.service === 'roommates' ? '/roommates?listing=' : '/apartments?listing=') + encodeURIComponent(l.id); }
  function priceLine(l) { var p = n(l.price || l.price_night || l.price_per_night || l.price_month); if (!p) return html`<span class="muted">No price</span>`; return html`${money(p, l.currency)}<small> / ${l.price_unit || (l.price_month && !l.price_night ? 'month' : 'night')}</small>`; }
  CX.view('listings', {
    title: 'Listings',
    render: function (v) {
      var qv = v.q, state = qv.state || 'review', layout = CX.store('l-layout') || 'cards';
      set(v.el, html`${pageHd('Operations', 'Listings', 'Stays, rooms and kitchens. Review what is new, keep the catalogue sharp, and fix anything in one place.')}${CX.skeleton(layout === 'cards' ? 'cards' : 'list')}`);
      if (v.args[0]) CX.open.listing(v.args[0], true);
      if (qv['new']) { v.setQ({ 'new': null }); setTimeout(function () { listingEditor(null); }, 50); }
      return rpc('admin_listings', { p_state: state, p_service: qv.service || null, p_q: qv.q || null, p_limit: 240, p_offset: 0, p_sort: qv.sort || 'created_desc' }).then(function (d) {
        if (!v.alive()) return;
        var st = d.states || {}, list = d.rows || [];
        if (state === 'review' && !qv.state && !n(st.review) && !v._fell) { v._fell = true; v.setQ({ state: 'live' }); return v.refresh(); }
        var services = Object.keys(d.services || {});
        set(v.el, html`${pageHd('Operations', 'Listings', 'Stays, rooms and kitchens. Review what is new, keep the catalogue sharp, and fix anything in one place.',
            html`${CX.seg([['cards', '', 'grid'], ['table', '', 'list']], layout, 'data-layout')}<button class="btn btn-g" data-export>${icon('download')}Export</button><button class="btn btn-p" data-new>${icon('plus')}Add listing</button>`)}
          ${CX.tabs(LSTATES.map(function (s) { return [s[0], s[1], st[s[0]], s[0] === 'review']; }), state)}
          <div class="filters"><label class="search wide">${icon('search')}<input class="inp" type="search" placeholder="Title, area, city, owner…" value="${qv.q || ''}" data-search aria-label="Search listings"/></label>
            ${services.length > 1 ? html`<select class="inp" style="width:auto" data-service aria-label="Service"><option value="">All services</option>${services.map(function (s) { return html`<option value="${s}"${qv.service === s ? raw(' selected') : ''}>${svc(s).label} (${num(d.services[s])})</option>`; })}</select>` : ''}
            <select class="inp" style="width:auto" data-sort aria-label="Sort">${[['created_desc', 'Newest'], ['gmv_desc', 'Top earning'], ['quality_asc', 'Weakest quality'], ['views_desc', 'Most viewed'], ['title_asc', 'A–Z']].map(function (o) { return html`<option value="${o[0]}"${(qv.sort || 'created_desc') === o[0] ? raw(' selected') : ''}>${o[1]}</option>`; })}</select>
            <span class="muted" style="font-size:12.5px;margin-left:auto">${num(d.total)} listing${n(d.total) === 1 ? '' : 's'}</span></div>
          ${!list.length ? html`<div class="card">${CX.empty(state === 'review' ? 'Nothing to review' : 'No listings here', state === 'review' ? 'New and unreviewed listings land here.' : 'Try another tab or clear the search.', state === 'review' ? 'checkCircle' : 'building', state === 'review')}</div>`
            : layout === 'cards' ? html`<div class="lcards stagger">${list.map(function (l) { return html`
              <article class="lcard" data-listing="${l.id}" tabindex="0"><div class="lcard-img">${l.photo ? html`<img src="${CX.safeUrl(l.photo)}" alt="" loading="lazy" decoding="async"/>` : html`<div class="ph">${icon('image')}</div>`}
                <div class="lcard-tags">${lstate(l)}${l.featured ? html`<span class="pill p-brand">${icon('star')}Featured</span>` : ''}</div></div>
                <div class="lcard-b"><div class="lcard-t">${l.title || 'Untitled'}</div><div class="lcard-s">${[l.area, l.city].filter(Boolean).join(', ') || l.location || 'No location'}</div>
                  <div class="lcard-s">${l.owner_name || 'Cabana'}${l.photo_count ? ' · ' + num(l.photo_count) + ' photos' : ''}</div>
                  <div class="lcard-f"><span class="price">${priceLine(l)}</span><span class="qual" title="Listing quality ${l.quality}/100">${CX.ring(l.quality, l.quality)}</span></div></div></article>`; })}</div>`
            : html`<div class="card flush"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Listing</th><th class="hide-s">Owner</th><th class="num">Price</th><th class="num hide-s">Quality</th><th class="num hide-s">Bookings</th><th>State</th></tr></thead><tbody>
              ${list.map(function (l) { return html`<tr class="click" data-listing="${l.id}"><td><div class="cell">${l.photo ? html`<img class="t-thumb" src="${CX.safeUrl(l.photo)}" alt="" loading="lazy"/>` : html`<span class="t-thumb">${icon('image')}</span>`}<div><div class="t-main">${l.title || 'Untitled'}</div><div class="t-sub">${[l.area, l.city].filter(Boolean).join(', ')}</div></div></div></td>
                <td class="hide-s"><div class="t-main">${l.owner_name || 'Cabana'}</div><div class="t-sub">${l.owner_email || ''}</div></td><td class="num nowrap">${priceLine(l)}</td>
                <td class="num hide-s">${l.quality}</td><td class="num hide-s">${num(l.bookings)}<div class="t-sub">${moneyC(l.gmv)}</div></td><td>${lstate(l)}</td></tr>`; })}</tbody></table></div></div>`}`);
        wireOpeners(v.el);
        on(v.el, '.lcard', 'keydown', function (el, e) { if (e.key === 'Enter') CX.open.listing(el.getAttribute('data-listing')); });
        on(v.el, '[data-tab]', 'click', function (el) { v.setQ({ state: el.getAttribute('data-tab') }); v.refresh(); });
        on(v.el, '[data-layout]', 'click', function (el) { CX.store('l-layout', el.getAttribute('data-layout')); v.refresh(); });
        on(v.el, '[data-sort]', 'change', function (el) { v.setQ({ sort: el.value === 'created_desc' ? null : el.value }); v.refresh(); });
        on(v.el, '[data-service]', 'change', function (el) { v.setQ({ service: el.value || null }); v.refresh(); });
        on(v.el, '[data-new]', 'click', function () { listingEditor(null); });
        on(v.el, '[data-export]', 'click', function () {
          CX.csv(list, [['id', 'ID'], ['title', 'Title'], ['service', 'Service'], ['city', 'City'], ['area', 'Area'], ['price', 'Price'], ['price_unit', 'Unit'], ['state', 'State'], ['status', 'Status'], ['featured', 'Featured'],
            ['quality', 'Quality'], ['photo_count', 'Photos'], ['bookings', 'Bookings'], ['gmv', 'GMV'], ['views', 'Views'], ['owner_name', 'Owner'], ['owner_email', 'Owner email'], ['created_at', 'Created']], 'cabana-listings.csv');
        });
        var s = $('[data-search]', v.el);
        s.addEventListener('input', CX.debounce(function () { v.setQ({ q: s.value.trim() || null }); v.refresh(); }, 380));
        if (qv.q) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
      });
    },
    update: function (v) { if (v.args[0]) CX.open.listing(v.args[0], true); else if (drawer.isOpen()) drawer.close(false); }
  });

  function listingAction(id, action, reason, payload) { return rpc('admin_listing_action', { p_id: id, p_action: action, p_reason: reason || null, p_payload: payload || {} }); }
  function afterListing(msg) { toast(msg, 'ok'); CX.pulseNow(true); drawer.reloadIfOpen(); if (CX.$('#view') && location.hash.indexOf('#/listings') === 0) CX.refreshView(); }

  function listingDrawer(id, fromRoute) {
    drawer.open({
      key: 'listing:' + id, wide: true, kicker: 'Listing', title: 'Loading…',
      onClose: function (user) { if (user && fromRoute && /^#\/listings\//.test(location.hash)) CX.setArgs([]); },
      load: function (d) {
        return Promise.all([rpc('admin_listing', { p_id: id }),
          rpc('admin_listings', { p_state: 'all', p_service: null, p_q: id, p_limit: 1, p_offset: 0, p_sort: null }).catch(function () { return {}; }),
          CX.rows(CX.q('calendar_conflicts').select('id,status,platform,overlap,severity,booking_ref,detected_at').eq('listing_id', id).eq('status', 'open').limit(20)).catch(function () { return []; })
        ]).then(function (r) {
          if (!d.alive()) return;
          var x = r[0] || {}; if (x.error) { set(d.body, CX.empty('Listing not found', 'It may have been purged.', 'building')); return; }
          var l = x.listing || {}, row = ((r[1] || {}).rows || [])[0] || {}, conflicts = r[2] || [], st = x.stats || {}, owner = x.owner;
          var photos = (l.photos || []).filter(Boolean), deleted = !!l.deleted_at || l.status === 'deleted' || l.status === 'removed';
          var live = l.status === 'active' && l.is_active && !deleted, needsReview = row.needs_review || (!l.approved_at && !deleted);
          var checks = [
            [photos.length >= 5, photos.length + ' photo' + (photos.length === 1 ? '' : 's') + (photos.length >= 5 ? '' : ' — aim for 5+')],
            [String(l.description || '').length >= 280, 'Description ' + String(l.description || '').length + ' characters' + (String(l.description || '').length >= 280 ? '' : ' — aim for 280+')],
            [n(l.price_night || l.price_per_night || l.price_month) > 0, n(l.price_night || l.price_per_night || l.price_month) > 0 ? 'Price set' : 'No price'],
            [l.latitude != null || l.lat != null, l.latitude != null || l.lat != null ? 'Pinned on the map' : 'No map pin'],
            [(l.amenities || []).length >= 5, (l.amenities || []).length + ' amenities'],
            [!!(l.contact_phone || l.contact_whatsapp), l.contact_phone || l.contact_whatsapp ? 'Contact number on file' : 'No contact number']
          ];
          d.set(l.title || 'Untitled', html`${icon('pin')}${[l.area, l.city, l.country].filter(Boolean).join(', ') || l.location || 'No location'}<span>·</span><span>Added ${fdate(l.created_at)}</span>`,
            html`${svc(l.service || 'stays').label} ${row.state ? lstate(row) : CX.pill(l.status)} ${l.featured ? html`<span class="pill p-brand">${icon('star')}Featured</span>` : ''}`);
          set(d.hdAct, html`<a class="btn btn-sm btn-g" href="${publicUrl(l)}" target="_blank" rel="noopener" title="Open on the live site">${icon('external')}<span class="hide-s">View live</span></a>`);
          set(d.body, html`
            ${photos.length ? html`<div class="dr-hero"><img src="${CX.safeUrl(photos[0])}" alt="" /></div>${photos.length > 1 ? html`<div class="gallery mb">${photos.slice(1, 12).map(function (p) { return html`<img src="${CX.safeUrl(p)}" alt="" loading="lazy"/>`; })}</div>` : ''}` : html`<div class="callout warn mb">${icon('image')}<div>This listing has no photos. It will not convert until it does.</div></div>`}
            ${deleted ? html`<div class="callout bad mb">${icon('trash')}<div class="grow"><div class="strong">Deleted ${l.deleted_at ? ago(l.deleted_at) : ''}</div><div class="muted" style="font-size:12.5px">Off the site and recoverable. Restore it, or purge it for good.</div></div></div>` : ''}
            ${needsReview && !deleted ? html`<div class="callout warn mb">${icon('eye')}<div class="grow"><div class="strong">${live ? 'Live but never reviewed' : 'Waiting for review'}</div><div class="muted" style="font-size:12.5px">Check the photos, price and description, then approve — or reject with a reason the host will see.</div>
              <div class="btn-row mt-s"><button class="btn btn-sm btn-ok" data-la="approve">${icon('check')}Approve</button><button class="btn btn-sm btn-d" data-la="reject">${icon('x')}Reject</button></div></div></div>` : ''}
            ${l.status === 'pending_owner' ? html`<div class="callout info mb">${icon('clock')}<div>Held privately until ${l.held_for_name || 'the owner'} claims it${l.held_for_contact ? ' (' + l.held_for_contact + ')' : ''}.</div></div>` : ''}
            ${l.rejection_reason ? html`<div class="callout bad mb">${icon('x')}<div><div class="strong">Rejected</div><div class="muted" style="font-size:12.5px">${l.rejection_reason}</div></div></div>` : ''}
            <div class="stat-row">
              <div class="mini"><div class="mini-l">Bookings</div><div class="mini-v">${num(st.bookings)}</div><div class="mini-s">${num(st.secured)} secured</div></div>
              <div class="mini"><div class="mini-l">Secured value</div><div class="mini-v">${moneyC(st.gmv)}</div><div class="mini-s">${moneyC(st.collected)} collected</div></div>
              <div class="mini"><div class="mini-l">Views</div><div class="mini-v">${num(l.views)}</div><div class="mini-s">${st.last ? 'Last booked ' + ago(st.last) : 'Never booked'}</div></div>
              <div class="mini"><div class="mini-l">Rating</div><div class="mini-v">${n(l.avg_rating) ? n(l.avg_rating).toFixed(1) : '—'}</div><div class="mini-s">${num(l.review_count)} reviews</div></div></div>
            <div class="split mt" style="gap:18px">
              <div>
                <div class="dr-sec"><div class="dr-sec-t">Quality ${CX.ring(row.quality || 0)}</div><div class="checklist">${checks.map(function (c) { return html`<div class="ck ${c[0] ? 'ok' : 'no'}">${icon(c[0] ? 'check' : 'x')}${c[1]}</div>`; })}</div></div>
                <div class="dr-sec"><div class="dr-sec-t">Details</div>${CX.kv([
                  ['Per night', n(l.price_night || l.price_per_night) ? money(l.price_night || l.price_per_night, l.currency) : null],
                  ['Per week', n(l.price_week) ? money(l.price_week, l.currency) : null], ['Per month', n(l.price_month) ? money(l.price_month, l.currency) : null],
                  ['Deposit', n(l.deposit) ? money(l.deposit, l.currency) : null],
                  ['Bedrooms · baths', (l.bedrooms || l.beds || '—') + ' · ' + (l.bathrooms || l.baths || '—')], ['Max guests', l.max_guests],
                  ['Minimum stay', l.min_nights ? num(l.min_nights) + ' nights' : null], ['Check-in / out', (l.checkin_time || '—') + ' / ' + (l.checkout_time || '—')],
                  ['WhatsApp', l.contact_whatsapp], ['Phone', l.contact_phone], ['Ownership', human(l.ownership_type || 'sole') + (l.created_by_role ? ' · created by ' + human(l.created_by_role) : '')]].filter(function (p) { return p[1] != null && p[1] !== ''; }))}</div>
                ${(l.amenities || []).length ? html`<div class="dr-sec"><div class="dr-sec-t">Amenities</div><div class="chips">${l.amenities.map(function (a) { return html`<span class="pill p-mute">${a}</span>`; })}</div></div>` : ''}
                ${l.description ? html`<div class="dr-sec"><div class="dr-sec-t">Description</div><p style="white-space:pre-wrap;color:var(--ink-2);font-size:13px;line-height:1.65">${l.description}</p></div>` : ''}
              </div>
              <div>
                <div class="dr-sec"><div class="dr-sec-t">Owner</div>${owner ? who(owner, 'Host') : html`<div class="who"><span class="brand-mark" style="width:32px;height:32px"><img src="/cabana-emblem.png" alt=""/></span><div class="grow"><div class="who-n">Cabana house listing</div><div class="who-s">No external owner</div></div></div>`}</div>
                <div class="dr-sec"><div class="dr-sec-t">Calendar</div>
                  ${(x.calendar && x.calendar.feeds || []).length ? x.calendar.feeds.map(function (f) { return html`<div class="kv"><span>${human(f.platform)}${f.label ? ' · ' + f.label : ''}</span><span>${f.failures ? html`<span class="pill p-bad">${num(f.failures)} failing</span>` : f.last_success_at ? 'Synced ' + ago(f.last_success_at) : 'Never synced'}</span></div>`; }) : html`<div class="muted" style="font-size:12.5px">No external calendars connected.</div>`}
                  ${(x.calendar && x.calendar.holds || []).length ? html`<div class="kv"><span>Upcoming holds</span><span>${num(x.calendar.holds.length)}</span></div>` : ''}
                  ${conflicts.length ? html`<div class="mt-s">${conflicts.map(function (c) { return html`<div class="note warn" style="margin-bottom:6px"><div class="row between"><span><b>${c.severity === 'critical' ? 'Double booking' : 'Calendar overlap'}</b> · ${human(c.platform || 'external')} ${c.overlap ? '· ' + c.overlap : ''}${c.booking_ref ? ' · ' + String(c.booking_ref).slice(-10) : ''}</span><span class="btn-row"><button class="btn btn-sm btn-ok" data-conflict="${c.id}" data-res="resolved">Resolved</button><button class="btn btn-sm btn-q" data-conflict="${c.id}" data-res="ignored">Ignore</button></span></div></div>`; })}</div>` : ''}</div>
                <div class="dr-sec"><div class="dr-sec-t">3D tour <button class="link-btn" data-la="set_3d">${icon('edit')}Update</button></div>${CX.kv([['Status', human(l.tour_3d_status || 'none')], ['Link', l.tour_3d_url ? html`<a href="${CX.safeUrl(l.tour_3d_url)}" target="_blank" rel="noopener">Open ${icon('external')}</a>` : null]])}
                  ${(x.tour3d || []).map(function (t) { return html`<div class="note" style="margin-top:8px">Request · ${human(t.status)} · ${ago(t.created_at)}${t.notes ? html`<div>${t.notes}</div>` : ''}</div>`; })}</div>
                ${(x.transfers || []).length ? html`<div class="dr-sec"><div class="dr-sec-t">Ownership transfers</div>${x.transfers.map(function (t) { return html`<div class="kv"><span>${human(t.kind)} → ${t.to_name || t.to_contact || '—'}</span><span>${CX.pill(t.status)}</span></div>`; })}</div>` : ''}
                ${x.restaurant ? html`<div class="dr-sec"><div class="dr-sec-t">Kitchen</div>${CX.kv([['Accepting orders', x.restaurant.accepts_orders ? 'Yes' : 'No'], ['Average main', x.restaurant.avg_price ? money(x.restaurant.avg_price, x.restaurant.currency) : null], ['Order WhatsApp', x.restaurant.order_whatsapp]].filter(function (p) { return p[1] != null; }))}</div>` : ''}
              </div></div>
            ${(x.bookings || []).length ? html`<div class="dr-sec"><div class="dr-sec-t">Recent bookings</div><div class="list">${x.bookings.slice(0, 8).map(function (b) { return html`<div class="li click" data-booking="${b.service}:${b.id}"><span class="li-ic">${icon(svc(b.service).icon)}</span><div class="li-b"><div class="li-t">${b.guest_name || 'Guest'} · ${b.starts_on ? fshort(b.starts_on) : ''}${b.ends_on ? ' → ' + fshort(b.ends_on) : ''}</div><div class="li-s">${money(b.total)} · ${human(b.status)}</div></div><div class="li-r">${CX.stagePill(b.stage)}</div></div>`; })}</div></div>` : ''}
            ${(x.reviews || []).length ? html`<div class="dr-sec"><div class="dr-sec-t">Reviews</div>${x.reviews.map(function (rv) { return html`<div class="note" style="margin-bottom:8px"><div class="row between"><b>${'★'.repeat(Math.round(n(rv.rating)))} ${rv.guest || 'Guest'}</b><button class="btn btn-sm btn-q" data-del-review="${rv.id}">${icon('trash')}</button></div><div style="margin-top:4px">${rv.text || ''}</div>${rv.reply ? html`<div class="muted" style="margin-top:6px">Host: ${rv.reply}</div>` : ''}</div>`; })}</div>` : ''}
            <div class="dr-sec"><div class="dr-sec-t">History</div>${(x.audit || []).length ? html`<div class="tl">${x.audit.map(function (a) { return html`<div class="tl-i ${/delete|reject|purge|pause/.test(a.action) ? 'bad' : /approve|publish/.test(a.action) ? 'ok' : 'brand'}"><div class="tl-t">${human(String(a.action).replace(/^listing\./, ''))}${a.meta && a.meta.reason ? ' — ' + a.meta.reason : ''}</div><div class="tl-s">${a.by} · ${fdt(a.at)}</div></div>`; })}</div>` : html`<div class="muted" style="font-size:12.5px">No operator actions yet.</div>`}</div>`);
          d.actions(html`<button class="btn btn-p" data-la="edit">${icon('edit')}Edit</button>
            ${deleted ? html`<button class="btn btn-ok" data-la="restore">${icon('undo')}Restore</button><button class="btn btn-d" data-la="purge">${icon('trash')}Purge</button>`
              : html`${live ? html`<button class="btn btn-g" data-la="pause">${icon('pause')}Pause</button>` : html`<button class="btn btn-ok" data-la="publish">${icon('play')}Publish</button>`}
                <button class="btn btn-g" data-la="${l.featured ? 'unfeature' : 'feature'}">${icon('star')}${l.featured ? 'Unfeature' : 'Feature'}</button>`}
            <span class="grow"></span>${!deleted ? html`<button class="btn btn-g" data-la="transfer">${icon('swap')}Transfer</button><button class="btn btn-q" data-la="note">${icon('note')}</button><button class="btn btn-d btn-icon" data-la="delete" title="Delete">${icon('trash')}</button>` : ''}`);
          wireOpeners(d.el);
          $$('[data-conflict]', d.el).forEach(function (b) { b.onclick = function () { CX.busy(b, function () { return rpc('admin_safety_action', { p_kind: 'conflict', p_id: b.getAttribute('data-conflict'), p_action: b.getAttribute('data-res'), p_note: null }).then(function () { toast('Conflict ' + b.getAttribute('data-res'), 'ok'); d.reload(); }); }); }; });
          $$('[data-del-review]', d.el).forEach(function (b) { b.onclick = function () { confirm({ title: 'Delete this review?', tone: 'danger', confirm: 'Delete review', body: 'It disappears from the listing. The text is kept in the audit log.', reason: { label: 'Reason', required: true },
            onConfirm: function (f) { return rpc('admin_safety_action', { p_kind: 'review', p_id: b.getAttribute('data-del-review'), p_action: 'delete', p_note: f.reason }).then(function () { toast('Review deleted', 'ok'); d.reload(); }); } }); }; });
          $$('[data-la]', d.el).forEach(function (b) {
            b.onclick = function () {
              var a = b.getAttribute('data-la');
              if (a === 'edit') return listingEditor(l, x.restaurant);
              if (a === 'approve' || a === 'publish' || a === 'pause' || a === 'feature' || a === 'unfeature' || a === 'restore')
                return CX.busy(b, function () { return listingAction(id, a).then(function (r) { afterListing({ approve: 'Approved', publish: 'Published — live on Cabana', pause: 'Paused — hidden from the site', feature: 'Featured', unfeature: 'No longer featured', restore: 'Restored as paused' }[a] + (r && r.held_for_owner ? ' (still held for its owner)' : '')); }); });
              if (a === 'reject') return confirm({ title: 'Reject this listing?', tone: 'danger', confirm: 'Reject', icon: 'x', body: 'It comes off the site. The host sees your reason, so make it specific and fixable.', reason: { label: 'Reason the host will see', required: true, placeholder: 'e.g. Photos are too dark to show the rooms clearly.' },
                onConfirm: function (f) { return listingAction(id, 'reject', f.reason).then(function () { afterListing('Rejected'); }); } });
              if (a === 'delete') return confirm({ title: 'Delete “' + (l.title || 'listing') + '”?', tone: 'danger', confirm: 'Delete', icon: 'trash', body: 'Soft delete: it leaves the site immediately and stays recoverable from the Deleted tab.', reason: { label: 'Reason', required: true },
                onConfirm: function (f) { return listingAction(id, 'delete', f.reason).then(function () { afterListing('Deleted — recoverable'); }); } });
              if (a === 'purge') return confirm({ title: 'Purge permanently?', tone: 'danger', confirm: 'Purge forever', icon: 'alert', body: 'The row is destroyed. Only the audit entry and its snapshot survive. This cannot be undone.', reason: { label: 'Reason', required: true },
                onConfirm: function (f) { return listingAction(id, 'purge', f.reason).then(function () { drawer.close(true); toast('Purged', 'ok'); CX.refreshView(); }); } });
              if (a === 'note') return form({ title: 'Add a note', icon: 'note', grid: false, fields: [{ name: 'note', type: 'textarea', label: 'Note', required: true }],
                onSubmit: function (f) { return listingAction(id, 'note', f.note).then(function () { toast('Note added', 'ok'); d.reload(); }); } });
              if (a === 'set_3d') return form({ title: '3D tour', sub: 'Link a Matterport or similar tour and set where it stands.', icon: 'cube', fields: [
                  { name: 'status', label: 'Status', type: 'select', value: l.tour_3d_status || 'none', options: [['none', 'None'], ['requested', 'Requested'], ['scheduled', 'Shoot scheduled'], ['live', 'Live']], required: true },
                  { name: 'url', label: 'Tour link', type: 'url', value: l.tour_3d_url || '', placeholder: 'https://my.matterport.com/show/?m=…', full: true, help: 'Matterport, Kuula or CloudPano links, or a Cabana-hosted /tours/<name>/ page.' }],
                onSubmit: function (f) { var req = (x.tour3d || [])[0]; var p = { status: f.status, url: f.url || '' }; if (req) { p.request_id = req.id; p.request_status = f.status === 'live' ? 'completed' : f.status === 'scheduled' ? 'scheduled' : f.status === 'requested' ? 'contacted' : req.status; }
                  return listingAction(id, 'set_3d', null, p).then(function () { toast('3D tour updated', 'ok'); d.reload(); }); } });
              if (a === 'transfer') return transferListing(l, d);
            };
          });
        });
      }
    });
  }
  CX.open.listing = function (id, fromRoute) { listingDrawer(id, fromRoute); };

  function pickPerson(title, sub) {
    return new Promise(function (resolve) {
      var chosen = null;
      CX.modal({ title: title, sub: sub, icon: 'users', body: html`<label class="search">${icon('search')}<input class="inp" type="search" placeholder="Name, email or phone" data-pp autofocus aria-label="Find member"/></label><div class="list mt-s" data-ppl style="min-height:120px"></div>`,
        actions: [{ label: 'Cancel', kind: 'btn-q', value: null }, { label: 'Choose', kind: 'btn-p', onClick: function () { if (!chosen) { toast('Pick a member first', 'warn'); return false; } return chosen; } }],
        onOpen: function (wrap) {
          var inp = $('[data-pp]', wrap), box = $('[data-ppl]', wrap);
          set(box, html`<div class="muted" style="padding:20px;text-align:center;font-size:12.5px">Start typing to find a member</div>`);
          inp.addEventListener('input', CX.debounce(function () {
            var qv = inp.value.trim(); if (qv.length < 2) return;
            rpc('admin_people', { p_filter: 'all', p_q: qv, p_limit: 8, p_offset: 0, p_sort: null }).then(function (r) {
              set(box, (r.rows || []).length ? html`${r.rows.map(function (p) { return html`<div class="li click" data-pick="${p.id}">${CX.avatar(p.name || p.email, 'sm')}<div class="li-b"><div class="li-t">${p.name || p.email}</div><div class="li-s">${p.email || ''}${p.phone ? ' · ' + p.phone : ''}</div></div>${(p.roles || []).map(function (x) { return html`<span class="tag">${x}</span>`; })}</div>`; })}` : CX.empty('No member matches', '', 'user'));
              $$('[data-pick]', box).forEach(function (el) { el.onclick = function () { $$('[data-pick]', box).forEach(function (o) { o.style.background = ''; }); el.style.background = 'var(--brand-soft)'; chosen = (r.rows || []).filter(function (p) { return p.id === el.getAttribute('data-pick'); })[0]; }; el.ondblclick = function () { chosen = (r.rows || []).filter(function (p) { return p.id === el.getAttribute('data-pick'); })[0]; $('.md-ft .btn-p', wrap).click(); }; });
            });
          }, 250));
        } }).then(resolve);
    });
  }
  CX.pickPerson = pickPerson;
  function transferListing(l, d) {
    pickPerson('Transfer ownership', 'Move “' + (l.title || 'this listing') + '” to another member. Bookings and history stay with the listing.').then(function (p) {
      if (!p) return;
      confirm({ title: 'Transfer to ' + (p.name || p.email) + '?', tone: 'warn', confirm: 'Transfer', icon: 'swap', body: 'They become the owner and receive future payouts for this listing.', reason: { label: 'Reason', required: true },
        onConfirm: function (f) { return listingAction(l.id, 'transfer', f.reason, { to: p.id }).then(function () { toast('Ownership transferred', 'ok'); d.reload(); }); } });
    });
  }

  /* ── Listing editor ─────────────────────────────────────────────── */
  var KNOWN = ['title', 'type', 'service', 'property_type', 'listing_type', 'location', 'city', 'area', 'country', 'description', 'photos', 'street', 'external_url', 'is_active', 'status', 'featured',
    'amenities', 'tags', 'price_night', 'price_week', 'price_month', 'deposit', 'beds', 'bedrooms', 'baths', 'bathrooms', 'max_guests', 'min_nights', 'checkin_time', 'checkout_time', 'contact_whatsapp',
    'contact_phone', 'house_rules', 'latitude', 'longitude', 'partner_id', 'host_id', 'source', 'currency', 'internal_score', 'approved_at'];
  var KINDS = {
    stays: { label: 'Stay', type: 'apartment', icon: 'bed', amenities: ['WiFi', 'Parking', 'Pool', 'Gym', 'Security', 'DSTV', 'Generator', 'Water', 'AC', 'Kitchen', 'Laundry', 'Balcony', 'Rooftop', 'Pet friendly', 'Instant book', 'Workspace'] },
    roommates: { label: 'Room to rent', type: 'room', icon: 'users', amenities: ['WiFi', 'Security', 'Parking', 'Water 24hr', 'Generator', 'Kitchen', 'Laundry', 'Gym', 'Rooftop'] },
    food: { label: 'Restaurant', type: 'food', icon: 'utensils', amenities: ['Dine-in', 'Takeaway', 'Delivery', 'WiFi', 'Alcohol', 'Outdoor seating', 'AC', 'Kids menu', 'Parking', 'Card payment', 'Live music'] }
  };
  function listingEditor(l, restaurant) {
    var isNew = !l; l = l || {};
    var kind = l.service && KINDS[l.service] ? l.service : 'stays';
    var photos = (l.photos || []).filter(Boolean).slice();
    var owner = null, place = null, uploading = 0;
    drawer.open({
      key: 'edit:' + (l.id || 'new'), wide: true, kicker: isNew ? 'New listing' : 'Edit listing', title: isNew ? 'Add a listing' : (l.title || 'Untitled'),
      sub: isNew ? 'Publish a Cabana house listing, or create one on a member’s behalf.' : 'Changes go live as soon as you save.',
      load: function (d) {
        function paintPhotos() {
          var g = $('[data-photos]', d.body); if (!g) return;
          set(g, html`${photos.map(function (p, i) { return html`<div class="ph-item"><img src="${CX.safeUrl(p)}" alt="" loading="lazy"/>${i === 0 ? html`<span class="pill p-brand cover">Cover</span>` : ''}
            <div class="ph-bar">${i ? html`<button type="button" title="Make cover" data-cover="${i}">${icon('star')}</button>` : ''}<button type="button" title="Move left" data-left="${i}"${i ? '' : raw(' hidden')}>${icon('chevL')}</button><button type="button" title="Remove" data-rm="${i}">${icon('trash')}</button></div></div>`; })}
            ${uploading ? html`<div class="ph-item up"><span class="spinner"></span></div>` : ''}
            <label class="ph-drop" data-drop>${icon('upload')}Add photos<br/><span class="muted">or drop them here</span><input type="file" accept="image/*" multiple hidden data-file/></label>`);
          $$('[data-rm]', g).forEach(function (b) { b.onclick = function () { photos.splice(+b.getAttribute('data-rm'), 1); paintPhotos(); }; });
          $$('[data-cover]', g).forEach(function (b) { b.onclick = function () { var i = +b.getAttribute('data-cover'); photos.unshift(photos.splice(i, 1)[0]); paintPhotos(); }; });
          $$('[data-left]', g).forEach(function (b) { b.onclick = function () { var i = +b.getAttribute('data-left'); var t = photos[i - 1]; photos[i - 1] = photos[i]; photos[i] = t; paintPhotos(); }; });
          var file = $('[data-file]', g), drop = $('[data-drop]', g);
          file.onchange = function () { upload(file.files); };
          drop.ondragover = function (e) { e.preventDefault(); drop.classList.add('over'); };
          drop.ondragleave = function () { drop.classList.remove('over'); };
          drop.ondrop = function (e) { e.preventDefault(); drop.classList.remove('over'); upload(e.dataTransfer.files); };
        }
        function upload(files) {
          files = Array.prototype.slice.call(files || []).filter(function (f) { return /^image\//.test(f.type); });
          if (!files.length) return;
          CX.client().auth.getSession().then(function (s) {
            var uid = (owner && owner.id) || l.partner_id || (s.data.session && s.data.session.user.id) || 'cabana';
            files.forEach(function (f, i) {
              uploading++; paintPhotos();
              var shrink = global.CabanaUploader && global.CabanaUploader.shrink ? global.CabanaUploader.shrink(f) : Promise.resolve(f);
              shrink.then(function (blob) {
                var ext = (blob.type || f.type || 'image/jpeg').split('/')[1].replace('jpeg', 'jpg').replace(/[^a-z0-9]/g, '') || 'jpg';
                var path = uid + '/console-' + Date.now() + '-' + i + '-' + CX.uid() + '.' + ext;
                return CX.client().storage.from('listings').upload(path, blob, { cacheControl: '31536000', contentType: blob.type || f.type, upsert: false }).then(function (r) {
                  if (r.error) throw r.error;
                  photos.push(CX.client().storage.from('listings').getPublicUrl(path).data.publicUrl);
                });
              }).catch(function (e) { toast('Upload failed: ' + CX.friendly(e), 'bad'); }).then(function () { uploading--; paintPhotos(); });
            });
          });
        }
        function paint() {
          var k = KINDS[kind], price = kind === 'roommates' ? 'price_month' : 'price_night';
          set(d.body, html`<form data-lf onsubmit="return false">
            ${isNew ? html`<div class="form-sec">What is it</div><div class="chips mb">${Object.keys(KINDS).map(function (key) { return html`<span class="chip ${kind === key ? 'on' : ''}" data-kind="${key}">${icon(KINDS[key].icon)}${KINDS[key].label}</span>`; })}</div>
              <div class="form-sec">Owner</div><div class="who click mb" data-owner>${owner ? html`${CX.avatar(owner.name || owner.email)}<div class="grow"><div class="who-n">${owner.name || owner.email}</div><div class="who-s">Created on their behalf · they own it and get paid</div></div><span class="btn btn-sm btn-q">Change</span>`
                : html`<span class="brand-mark" style="width:32px;height:32px"><img src="/cabana-emblem.png" alt=""/></span><div class="grow"><div class="who-n">Cabana house listing</div><div class="who-s">Owned and operated by Cabana — tap to assign a member instead</div></div><span class="btn btn-sm btn-q">Assign</span>`}</div>` : ''}
            <div class="form-sec">Basics</div>
            <div class="form-grid">
              ${CX.fieldHTML({ name: 'title', label: 'Title', required: true, value: l.title, full: true, placeholder: kind === 'food' ? 'e.g. Mama Oliech Restaurant' : 'e.g. Sunlit 2-bedroom in Kilimani' })}
              ${CX.fieldHTML({ name: 'location', label: 'Location', required: true, value: l.location || [l.area, l.city].filter(Boolean).join(', '), full: true, placeholder: 'Start typing an area or address', help: 'Pick a suggestion to pin it on the map.' })}
              ${CX.fieldHTML({ name: 'description', label: 'Description', type: 'textarea', rows: 5, value: l.description, placeholder: 'What makes it worth booking. 280+ characters converts best.' })}
            </div>
            <div class="form-sec">Pricing</div><div class="form-grid">
              ${kind === 'food' ? CX.fieldHTML({ name: 'price_night', label: 'Typical main course (KES)', type: 'number', min: 0, value: restaurant && restaurant.avg_price || l.price_night })
                : kind === 'roommates' ? html`${CX.fieldHTML({ name: 'price_month', label: 'Per month (KES)', type: 'number', min: 0, required: true, value: l.price_month })}${CX.fieldHTML({ name: 'deposit', label: 'Deposit (KES)', type: 'number', min: 0, value: l.deposit })}`
                : html`${CX.fieldHTML({ name: 'price_night', label: 'Per night (KES)', type: 'number', min: 0, required: true, value: l.price_night || l.price_per_night })}${CX.fieldHTML({ name: 'price_week', label: 'Per week (KES)', type: 'number', min: 0, value: l.price_week })}
                  ${CX.fieldHTML({ name: 'price_month', label: 'Per month (KES)', type: 'number', min: 0, value: l.price_month })}${CX.fieldHTML({ name: 'deposit', label: 'Deposit (KES)', type: 'number', min: 0, value: l.deposit })}`}</div>
            ${kind !== 'food' ? html`<div class="form-sec">The space</div><div class="form-grid">
              ${CX.fieldHTML({ name: 'bedrooms', label: 'Bedrooms', type: 'number', min: 0, value: l.bedrooms || l.beds })}${CX.fieldHTML({ name: 'bathrooms', label: 'Bathrooms', type: 'number', min: 0, value: l.bathrooms || l.baths })}
              ${kind === 'stays' ? html`${CX.fieldHTML({ name: 'max_guests', label: 'Max guests', type: 'number', min: 1, value: l.max_guests })}${CX.fieldHTML({ name: 'min_nights', label: 'Minimum nights', type: 'number', min: 1, value: l.min_nights || 1 })}
                ${CX.fieldHTML({ name: 'checkin_time', label: 'Check-in from', type: 'time', value: l.checkin_time || '14:00' })}${CX.fieldHTML({ name: 'checkout_time', label: 'Check-out by', type: 'time', value: l.checkout_time || '11:00' })}
                ${CX.fieldHTML({ name: 'house_rules', label: 'House rules', type: 'textarea', rows: 2, value: l.house_rules })}` : ''}</div>` : ''}
            <div class="form-sec">Amenities</div>${CX.fieldHTML({ name: 'amenities', type: 'chips', label: '', options: k.amenities.concat((l.amenities || []).filter(function (a) { return k.amenities.indexOf(a) < 0; })), value: l.amenities || [] })}
            <div class="form-sec">Photos</div><div class="photo-grid" data-photos></div>
            <div class="row mt-s"><input class="inp sm" type="url" placeholder="…or paste an image URL" data-url aria-label="Image URL" style="max-width:420px"/><button type="button" class="btn btn-sm" data-add-url>${icon('plus')}Add</button></div>
            <div class="form-sec">Contact</div><div class="form-grid">
              ${CX.fieldHTML({ name: 'contact_whatsapp', label: 'WhatsApp', type: 'tel', value: l.contact_whatsapp, placeholder: '+2547…' })}${CX.fieldHTML({ name: 'contact_phone', label: 'Phone', type: 'tel', value: l.contact_phone, placeholder: '+2547…' })}</div>
            <div class="form-sec">Visibility</div><div class="form-grid">
              ${CX.fieldHTML({ name: 'is_active', type: 'switch', label: 'Live on Cabana', help: 'Visible to guests as soon as you save', value: isNew ? true : (l.is_active && l.status === 'active') })}
              ${CX.fieldHTML({ name: 'featured', type: 'switch', label: 'Featured', help: 'Pinned to the top of its board', value: !!l.featured })}</div>
          </form>`);
          CX.wireChips(d.body); paintPhotos();
          $$('[data-kind]', d.body).forEach(function (c) { c.onclick = function () { kind = c.getAttribute('data-kind'); keep(); paint(); }; });
          var ow = $('[data-owner]', d.body); if (ow) ow.onclick = function () { pickPerson('Assign an owner', 'They own the listing and receive its payouts.').then(function (p) { if (p) { owner = p; keep(); paint(); } }); };
          $('[data-add-url]', d.body).onclick = function () { var u = CX.safeUrl($('[data-url]', d.body).value); if (!/^https?:/.test(u)) { toast('Paste a full https:// image link', 'warn'); return; } photos.push(u); $('[data-url]', d.body).value = ''; paintPhotos(); };
          var loc = $('[name="location"]', d.body);
          if (global.ApaGeo && loc) { loc.id = loc.id || 'le-loc'; try { global.ApaGeo.attach(loc, { limit: 6, onPick: function (p) { place = p; } }); } catch (e) {} }
        }
        var kept = {};
        function keep() { $$('[name]', d.body).forEach(function (el) { kept[el.name] = el.type === 'checkbox' ? el.checked : el.value; }); Object.keys(kept).forEach(function (k2) { if (k2 !== 'amenities') l[k2] = kept[k2]; }); l.amenities = $$('[data-chips="amenities"] .chip.on', d.body).map(function (c) { return c.getAttribute('data-v'); }); }
        paint();
        d.actions(html`<button class="btn btn-q" data-cancel>Cancel</button><span class="grow"></span><button class="btn btn-p btn-lg" data-save>${icon('check')}${isNew ? 'Create listing' : 'Save changes'}</button>`);
        $('[data-cancel]', d.el).onclick = function () { isNew ? drawer.close(true) : drawer.back(); };
        $('[data-save]', d.el).onclick = function () {
          var btn = this;
          if (uploading) { toast('Photos are still uploading', 'warn'); return; }
          var fields = [{ name: 'title', required: true }, { name: 'location', required: true }, { name: 'description' }, { name: 'price_night', type: 'number' }, { name: 'price_week', type: 'number' }, { name: 'price_month', type: 'number' },
            { name: 'deposit', type: 'number' }, { name: 'bedrooms', type: 'number' }, { name: 'bathrooms', type: 'number' }, { name: 'max_guests', type: 'number' }, { name: 'min_nights', type: 'number' },
            { name: 'checkin_time' }, { name: 'checkout_time' }, { name: 'house_rules' }, { name: 'contact_whatsapp' }, { name: 'contact_phone' }, { name: 'is_active', type: 'switch' }, { name: 'featured', type: 'switch' }, { name: 'amenities', type: 'chips' }];
          var f = CX.readForm(d.body, fields); if (!f) { toast('Fill in the required fields', 'warn'); return; }
          var numOrNull = function (x) { return x === '' || x == null || !isFinite(Number(x)) || Number(x) === 0 ? null : Number(x); };
          var k = KINDS[kind];
          var p = { title: f.title, location: f.location, description: f.description || null, amenities: (f.amenities || []).length ? f.amenities : null, photos: photos,
            contact_whatsapp: f.contact_whatsapp || null, contact_phone: f.contact_phone || null, featured: !!f.featured,
            is_active: !!f.is_active, status: f.is_active ? 'active' : 'paused', service: kind, type: k.type, property_type: k.type, listing_type: k.type };
          if ('price_night' in f) p.price_night = numOrNull(f.price_night);
          if ('price_week' in f) p.price_week = numOrNull(f.price_week);
          if ('price_month' in f) p.price_month = numOrNull(f.price_month);
          if ('deposit' in f) p.deposit = numOrNull(f.deposit);
          if ('bedrooms' in f) { p.bedrooms = numOrNull(f.bedrooms); p.beds = f.bedrooms === '' ? null : String(f.bedrooms); }
          if ('bathrooms' in f) { p.bathrooms = numOrNull(f.bathrooms); p.baths = f.bathrooms === '' ? null : String(f.bathrooms); }
          if ('max_guests' in f) p.max_guests = f.max_guests === '' ? null : String(f.max_guests);
          if ('min_nights' in f) p.min_nights = numOrNull(f.min_nights);
          ['checkin_time', 'checkout_time', 'house_rules'].forEach(function (c) { if (c in f) p[c] = f[c] || null; });
          var norm = global.ApaGeo && global.ApaGeo.normalize ? global.ApaGeo.normalize : function (s) { return String(s || '').toLowerCase(); };
          if (place && norm(f.location).indexOf(norm(place.name)) > -1) { p.city = place.city || f.location; p.area = place.area || place.name || f.location; p.country = place.country || null; p.latitude = place.lat; p.longitude = place.lng; }
          else if (isNew) { p.city = f.location; p.area = f.location; }
          if (kind === 'food') delete p.price_night;
          if (isNew) {
            if (owner) { p.partner_id = owner.id; p.host_id = owner.id; p.source = 'partner'; }
            else { p.source = 'apatmento'; p.internal_score = 50; }
            p.currency = 'KES';
            if (p.is_active) p.approved_at = new Date().toISOString();
          }
          Object.keys(p).forEach(function (c) { if (KNOWN.indexOf(c) < 0) delete p[c]; });
          CX.busy(btn, function () {
            var qy = isNew ? CX.q('listings').insert(p).select('id').single() : CX.q('listings').update(p).eq('id', l.id).select('id').single();
            return CX.rows(qy.then(function (r) { return r.error ? r : { data: [r.data] }; })).then(function (res) {
              var id = isNew ? res[0] && res[0].id : l.id;
              var tasks = [CX.log(isNew ? 'listing.create' : 'listing.edit', 'listing', id, { title: p.title, fields: Object.keys(p), owner: owner ? owner.id : null })];
              if (kind === 'food' && id) {
                var prof = { listing_id: id, currency: 'KES', order_whatsapp: p.contact_whatsapp, order_phone: p.contact_phone, hero_photo: photos[0] || null };
                if (numOrNull(f.price_night)) prof.avg_price = Number(f.price_night);
                tasks.push(CX.q('restaurant_profiles').upsert(prof, { onConflict: 'listing_id' }).then(function (r) { if (r.error) console.warn('[listing] kitchen profile', r.error.message); }));
              }
              return Promise.all(tasks).then(function () {
                toast(isNew ? 'Listing created' + (p.is_active ? ' and live' : '') : 'Changes saved', 'ok');
                CX.pulseNow(true);
                if (id) listingDrawer(id); else drawer.close(true);
                if (location.hash.indexOf('#/listings') === 0) setTimeout(CX.refreshView, 100);
              });
            });
          });
        };
      }
    });
  }
  CX.listingEditor = listingEditor;

  /* ════════════════════════════════════════════════════════════════
     MEMBERS
     ════════════════════════════════════════════════════════════════ */
  var PFILTERS = [['all', 'Everyone'], ['hosts', 'Hosts'], ['guests', 'Guests'], ['agents', 'Agents'], ['ambassadors', 'Ambassadors'], ['drivers', 'Drivers'], ['operators', 'Operators'],
    ['new', 'New this week'], ['unverified', 'Unverified hosts'], ['flagged', 'Flagged'], ['risk', 'Low trust'], ['suspended', 'Suspended'], ['banned', 'Banned']];
  function trustBar(t) { t = n(t); return html`<div class="row" style="gap:8px;min-width:96px"><div class="meter grow ${t >= 70 ? 'ok' : t >= 45 ? 'warn' : 'bad'}"><i style="width:${Math.max(4, t)}%"></i></div><span class="tnum" style="font-size:12px;color:var(--ink-2);width:22px;text-align:right">${t}</span></div>`; }
  function personStatus(p) {
    if (p.banned || p.status === 'banned') return CX.pill('banned');
    if (p.status === 'suspended' || p.host_status === 'suspended') return CX.pill('suspended');
    if (p.host_status === 'under_review') return html`<span class="pill dot p-warn">Under review</span>`;
    if (n(p.flags) || p.reported) return html`<span class="pill dot p-warn">Flagged</span>`;
    return CX.pill('active');
  }
  CX.view('people', {
    title: 'Members',
    render: function (v) {
      var qv = v.q, filter = qv.filter || 'all', page = Math.max(0, +(qv.page || 0));
      set(v.el, html`${pageHd('People', 'Members', 'Everyone with a Cabana account — guests, hosts, agents, drivers and operators.')}${CX.skeleton('list')}`);
      if (v.args[0]) CX.open.person(v.args[0], true);
      return rpc('admin_people', { p_filter: filter, p_q: qv.q || null, p_limit: PAGE, p_offset: page * PAGE, p_sort: qv.sort || 'created_desc' }).then(function (d) {
        if (!v.alive()) return;
        var cn = d.counts || {}, list = d.rows || [];
        set(v.el, html`${pageHd('People', 'Members', num(cn.all) + ' members · ' + num(cn.hosts) + ' hosts · ' + num(cn['new']) + ' joined this week.', html`<button class="btn btn-g" data-export>${icon('download')}Export</button>`)}
          ${CX.tabs(PFILTERS.map(function (f) { return [f[0], f[1], cn[f[0]], ['flagged', 'banned', 'suspended', 'risk'].indexOf(f[0]) > -1]; }).filter(function (f) { return f[0] === 'all' || n(f[2]) || f[0] === filter; }), filter)}
          <div class="filters"><label class="search wide">${icon('search')}<input class="inp" type="search" placeholder="Name, email, phone or ID…" value="${qv.q || ''}" data-search aria-label="Search members"/></label>
            <select class="inp" style="width:auto" data-sort aria-label="Sort">${[['created_desc', 'Newest'], ['seen_desc', 'Recently active'], ['spend_desc', 'Top spenders'], ['gmv_desc', 'Top hosts'], ['trust_asc', 'Lowest trust'], ['name_asc', 'A–Z']].map(function (o) { return html`<option value="${o[0]}"${(qv.sort || 'created_desc') === o[0] ? raw(' selected') : ''}>${o[1]}</option>`; })}</select></div>
          <div class="card flush">${list.length ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Member</th><th class="hide-s">Roles</th><th class="hide-s">Trust</th><th class="num">Activity</th><th>Status</th><th class="num hide-s">Last seen</th></tr></thead><tbody>
            ${list.map(function (p) { return html`<tr class="click" data-person="${p.id}"><td><div class="cell">${CX.avatar(p.name || p.email, 'sm')}<div><div class="t-main">${p.name || '—'} ${p.verified ? icon('checkCircle', 'ok-t') : ''}</div><div class="t-sub">${p.email || p.phone || ''}</div></div></div></td>
              <td class="hide-s">${(p.roles || []).length ? html`<div class="chips" style="gap:4px">${p.roles.map(function (x) { return html`<span class="tag">${x}</span>`; })}</div>` : html`<span class="tag">guest</span>`}</td>
              <td class="hide-s">${trustBar(p.trust)}</td>
              <td class="num"><div class="t-main">${num(p.bookings)} booking${n(p.bookings) === 1 ? '' : 's'}</div><div class="t-sub">${n(p.listings) ? num(p.listings) + ' listing' + (n(p.listings) === 1 ? '' : 's') + ' · ' + moneyC(p.host_gmv) : n(p.spend) ? moneyC(p.spend) + ' spent' : n(p.points) ? num(p.points) + ' pts' : ''}</div></td>
              <td>${personStatus(p)}</td><td class="num hide-s t-sub" title="${fdt(p.last_sign_in_at)}">${p.last_sign_in_at ? ago(p.last_sign_in_at) : 'never'}</td></tr>`; })}</tbody></table></div>
            <div class="pager"><span>${num(page * PAGE + 1)}–${num(page * PAGE + list.length)} of ${num(d.total)}</span><div class="btn-row">
              <button class="btn btn-sm btn-g" data-page="${page - 1}"${page ? '' : raw(' disabled')}>${icon('chevL')}Previous</button><button class="btn btn-sm btn-g" data-page="${page + 1}"${(page + 1) * PAGE < n(d.total) ? '' : raw(' disabled')}>Next${icon('chevR')}</button></div></div>`
            : CX.empty('No members match', 'Try another filter or search.', 'users')}</div>`);
        wireOpeners(v.el);
        on(v.el, '[data-tab]', 'click', function (el) { v.setQ({ filter: el.getAttribute('data-tab') === 'all' ? null : el.getAttribute('data-tab'), page: null }); v.refresh(); });
        on(v.el, '[data-page]', 'click', function (el) { v.setQ({ page: +el.getAttribute('data-page') || null }); v.refresh(); });
        on(v.el, '[data-sort]', 'change', function (el) { v.setQ({ sort: el.value === 'created_desc' ? null : el.value, page: null }); v.refresh(); });
        var s = $('[data-search]', v.el);
        s.addEventListener('input', CX.debounce(function () { v.setQ({ q: s.value.trim() || null, page: null }); v.refresh(); }, 380));
        if (qv.q) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
        on(v.el, '[data-export]', 'click', function (el) {
          CX.busy(el, function () { return rpc('admin_people', { p_filter: filter, p_q: qv.q || null, p_limit: 500, p_offset: 0, p_sort: qv.sort || 'created_desc' }).then(function (x) {
            CX.csv(x.rows || [], [['id', 'ID'], ['name', 'Name'], ['email', 'Email'], ['phone', 'Phone'], [function (r) { return (r.roles || []).join(' '); }, 'Roles'], ['trust', 'Trust'], ['bookings', 'Bookings'], ['spend', 'Spend'],
              ['listings', 'Listings'], ['host_gmv', 'Host GMV'], ['points', 'Points'], ['status', 'Status'], ['verified', 'Verified'], ['created_at', 'Joined'], ['last_sign_in_at', 'Last sign-in']], 'cabana-members.csv'); }); });
        });
      });
    },
    update: function (v) { if (v.args[0]) CX.open.person(v.args[0], true); else if (drawer.isOpen()) drawer.close(false); }
  });

  function personAction(id, action, reason, payload) { return rpc('admin_person_action', { p_id: id, p_action: action, p_reason: reason || null, p_payload: payload || {} }); }
  function personDrawer(id, fromRoute) {
    drawer.open({
      key: 'person:' + id, wide: true, kicker: 'Member', title: 'Loading…',
      onClose: function (user) { if (user && fromRoute && /^#\/people\//.test(location.hash)) CX.setArgs([]); },
      load: function (d) {
        return rpc('admin_person', { p_id: id }).then(function (x) {
          if (!d.alive()) return;
          if (!x || x.error) { set(d.body, CX.empty('Member not found', '', 'user')); return; }
          var p = x.person || {}, pr = x.profile || {}, au = x.auth || {}, pts = x.points || {};
          var banned = p.banned || p.status === 'banned', suspended = p.status === 'suspended' || p.host_status === 'suspended';
          d.set(html`<span class="row" style="gap:12px">${CX.avatar(p.name || p.email, 'lg')}<span style="min-width:0"><span style="display:block">${p.name || p.email}</span></span></span>`,
            html`<span data-copy="${p.email || ''}" style="cursor:copy">${p.email || ''}</span>${p.phone ? html`<span>·</span><span>${p.phone}</span>` : ''}<span>·</span><span>Joined ${fdate(p.created_at)}</span>`,
            html`Member ${personStatus(p)} ${(p.roles || []).map(function (r) { return html`<span class="tag">${r}</span>`; })}`);
          var hb = x.host_bookings || [], gb = x.bookings || [];
          set(d.body, html`
            ${banned ? html`<div class="callout bad mb">${icon('ban')}<div><div class="strong">Banned ${pr.banned_at ? ago(pr.banned_at) : ''}</div><div class="muted" style="font-size:12.5px">${pr.ban_reason || 'No reason recorded'}. Their sign-in is blocked.</div></div></div>`
              : suspended ? html`<div class="callout warn mb">${icon('pause')}<div><div class="strong">Suspended${pr.suspended_until ? ' until ' + fdate(pr.suspended_until) : ''}</div><div class="muted" style="font-size:12.5px">${pr.suspension_reason || 'Under review'} — their listings are hidden.</div></div></div>` : ''}
            ${n(p.flags) || p.reported ? html`<div class="callout warn mb">${icon('flag')}<div class="grow">${num(p.flags)} flag${n(p.flags) === 1 ? '' : 's'}${p.reported ? ' · reported by another member' : ''}</div><button class="btn btn-sm btn-g" data-pa="clear_flags">Clear flags</button></div>` : ''}
            <div class="stat-row">
              <div class="mini"><div class="mini-l">Trust score</div><div class="mini-v">${num(p.trust)}</div><div class="meter mt-s ${n(p.trust) >= 70 ? 'ok' : n(p.trust) >= 45 ? 'warn' : 'bad'}"><i style="width:${Math.max(4, n(p.trust))}%"></i></div></div>
              <div class="mini"><div class="mini-l">As guest</div><div class="mini-v">${num(p.bookings)}</div><div class="mini-s">${money(p.spend)} spent</div></div>
              <div class="mini"><div class="mini-l">As host</div><div class="mini-v">${num(p.listings)}</div><div class="mini-s">${num(p.host_bookings)} bookings · ${moneyC(p.host_gmv)}</div></div>
              <div class="mini"><div class="mini-l">Cabana credit</div><div class="mini-v">${num(pts.available)}</div><div class="mini-s">${num(pts.lifetime)} earned all time</div></div></div>
            <div class="split mt" style="gap:18px"><div>
              <div class="dr-sec"><div class="dr-sec-t">Account</div>${CX.kv([
                ['Sign-in', (au.providers || [au.provider]).filter(Boolean).map(human).join(', ') || '—'], ['Email confirmed', au.email_confirmed_at ? fdate(au.email_confirmed_at) : 'Not confirmed'],
                ['Last sign-in', au.last_sign_in_at ? fdt(au.last_sign_in_at) : 'Never'], ['Phone', pr.phone || au.phone || '—'], ['Phone verified', pr.phone_verified ? 'Yes' : 'No'],
                ['ID verification', human(pr.id_verification_status || 'not started')], ['Host verified', p.verified ? 'Yes · ' + fdate(pr.verified_at) : 'No'],
                ['M-Pesa payout', pr.mpesa_number ? pr.mpesa_number + (pr.mpesa_name ? ' · ' + pr.mpesa_name : '') : '—'], ['Push devices', num(x.push_devices)], ['Member ID', html`<span class="mono" data-copy="${p.id}" data-copy-label="Member ID" style="cursor:copy;font-size:11.5px">${p.id}</span>`]])}</div>
              ${x.agent || x.ambassador || x.driver ? html`<div class="dr-sec"><div class="dr-sec-t">Roles</div>
                ${x.agent ? html`<div class="kv"><span>Agent</span><span>${human(x.agent.kyc_status || 'unverified')}${x.agent.slug ? ' · /' + x.agent.slug : ''}</span></div>` : ''}
                ${x.ambassador ? html`<div class="kv"><span>Ambassador</span><span>${human(x.ambassador.status)} · risk ${num(x.ambassador.risk_score)}</span></div>` : ''}
                ${x.driver ? html`<div class="kv"><span>Driver</span><span>${human(x.driver.status || 'applied')}</span></div>` : ''}</div>` : ''}
              ${(x.point_history || []).length ? html`<div class="dr-sec"><div class="dr-sec-t">Credit history</div>${x.point_history.slice(0, 8).map(function (t) { return html`<div class="kv"><span>${t.description || human(t.type)}<div class="t-sub">${fdt(t.created_at)}</div></span><span class="${n(t.points) < 0 ? 'bad-t' : 'ok-t'}">${n(t.points) > 0 ? '+' : ''}${num(t.points)}</span></div>`; })}</div>` : ''}
              ${(x.earnings || []).length || (x.withdrawals || []).length ? html`<div class="dr-sec"><div class="dr-sec-t">Earnings & payouts</div>
                ${(x.earnings || []).slice(0, 6).map(function (e) { return html`<div class="kv"><span>${human(e.type)} · ${svc(e.service).label}<div class="t-sub">${human(e.status)} · ${fdate(e.at)}</div></span><span>${money(e.amount)}</span></div>`; })}
                ${(x.withdrawals || []).map(function (w) { return html`<div class="kv"><span>Withdrawal to ${w.mpesa_number || 'M-Pesa'}<div class="t-sub">${fdate(w.created_at)}</div></span><span>${money(w.amount_kes)} ${CX.pill(w.status)}</span></div>`; })}</div>` : ''}
            </div><div>
              ${(x.listings || []).length ? html`<div class="dr-sec"><div class="dr-sec-t">Listings</div><div class="list">${x.listings.map(function (l) { return html`<div class="li click" data-listing="${l.id}">${l.photo ? html`<img class="t-thumb" src="${CX.safeUrl(l.photo)}" alt="" loading="lazy"/>` : html`<span class="t-thumb">${icon('building')}</span>`}<div class="li-b"><div class="li-t">${l.title}</div><div class="li-s">${l.city || ''} · ${l.price ? money(l.price) : 'no price'}</div></div>${CX.pill(l.deleted_at ? 'deleted' : l.status)}</div>`; })}</div></div>` : ''}
              ${gb.length ? html`<div class="dr-sec"><div class="dr-sec-t">Bookings as guest</div><div class="list">${gb.slice(0, 6).map(function (b) { return html`<div class="li click" data-booking="${b.service}:${b.id}"><span class="li-ic">${icon(svc(b.service).icon)}</span><div class="li-b"><div class="li-t">${b.item_title || svc(b.service).label}</div><div class="li-s">${money(b.total)} · ${fdate(b.created_at)}</div></div>${CX.stagePill(b.stage)}</div>`; })}</div></div>` : ''}
              ${hb.length ? html`<div class="dr-sec"><div class="dr-sec-t">Bookings as host</div><div class="list">${hb.slice(0, 6).map(function (b) { return html`<div class="li click" data-booking="${b.service}:${b.id}"><span class="li-ic">${icon(svc(b.service).icon)}</span><div class="li-b"><div class="li-t">${b.guest_name || 'Guest'} · ${b.item_title || ''}</div><div class="li-s">${money(b.total)} · ${fdate(b.created_at)}</div></div>${CX.stagePill(b.stage)}</div>`; })}</div></div>` : ''}
              ${(x.support || []).length ? html`<div class="dr-sec"><div class="dr-sec-t">Support <a class="link-btn" href="/support-console" target="_blank" rel="noopener">Open desk ${icon('external')}</a></div>${x.support.slice(0, 5).map(function (t) { return html`<div class="kv"><span>${t.subject || 'Conversation'}<div class="t-sub">${t.last_message ? String(t.last_message).slice(0, 80) : ''}</div></span><span>${CX.pill(t.status)}</span></div>`; })}</div>` : ''}
              ${(x.issues || []).length || (x.sos || []).length || (x.violations || []).length || (x.cards || []).length ? html`<div class="dr-sec"><div class="dr-sec-t">Trust signals</div>
                ${(x.sos || []).map(function (s) { return html`<div class="note bad" style="margin-bottom:6px">${icon('siren')} SOS · ${human(s.category)} · ${human(s.status)} · ${ago(s.at)}</div>`; })}
                ${(x.cards || []).map(function (c) { return html`<div class="note ${c.voided ? '' : 'warn'}" style="margin-bottom:6px">${human(c.card)} card · ${c.reason || ''} ${c.voided ? '(voided)' : ''}</div>`; })}
                ${(x.issues || []).map(function (c) { return html`<div class="kv"><span>Check-in issue as ${c.as} · ${human(c.code)}</span><span>${CX.pill(c.status)}</span></div>`; })}
                ${(x.violations || []).slice(0, 5).map(function (vv) { return html`<div class="kv"><span>Chat: ${(vv.categories || []).join(', ')}<div class="t-sub">“${vv.excerpt || ''}”</div></span><span>${ago(vv.at)}</span></div>`; })}</div>` : ''}
              ${(x.emails || []).length ? html`<div class="dr-sec"><div class="dr-sec-t">Emails sent</div>${x.emails.slice(0, 6).map(function (e) { return html`<div class="kv"><span class="trunc" style="max-width:240px">${e.subject || human(e.template)}</span><span>${e.status === 'sent' ? ago(e.at) : CX.pill(e.status)}</span></div>`; })}</div>` : ''}
            </div></div>
            <div class="dr-sec"><div class="dr-sec-t">Operator history</div>${(x.audit || []).length ? html`<div class="tl">${x.audit.map(function (a) { return html`<div class="tl-i ${/ban|suspend/.test(a.action) ? 'bad' : /verify|reinstate|unban/.test(a.action) ? 'ok' : 'brand'}"><div class="tl-t">${human(String(a.action).replace(/^(person|partner)\./, ''))}${a.meta && a.meta.reason ? ' — ' + a.meta.reason : ''}</div><div class="tl-s">${a.by} · ${fdt(a.at)}</div></div>`; })}</div>` : html`<div class="muted" style="font-size:12.5px">No operator actions yet.</div>`}</div>`);
          var isHost = (p.roles || []).indexOf('host') > -1;
          d.actions(html`${banned ? html`<button class="btn btn-ok" data-pa="unban">${icon('undo')}Lift ban</button>` : suspended ? html`<button class="btn btn-ok" data-pa="reinstate">${icon('undo')}Reinstate</button>` : html`<button class="btn btn-w" data-pa="suspend">${icon('pause')}Suspend</button>`}
            ${isHost ? (p.verified ? html`<button class="btn btn-g" data-pa="unverify">Unverify</button>` : html`<button class="btn btn-ok" data-pa="verify">${icon('shieldCheck')}Verify host</button>`) : ''}
            <button class="btn btn-g" data-pa="grant_credit">${icon('coins')}Credit</button><button class="btn btn-g" data-pa="push">${icon('send')}Message</button>
            <span class="grow"></span><button class="btn btn-q btn-icon" data-more title="More">${icon('more')}</button>`);
          wireOpeners(d.el);
          function run(a) {
            if (a === 'verify' || a === 'unverify' || a === 'clear_flags' || a === 'reinstate' || a === 'unban')
              return personAction(id, a).then(function (r) { toast({ verify: 'Host verified', unverify: 'Verification removed', clear_flags: 'Flags cleared', reinstate: 'Reinstated', unban: 'Ban lifted' }[a] + (n(r.listings_changed) ? ' · ' + num(r.listings_changed) + ' listing(s) back online' : ''), 'ok'); d.reload(); CX.pulseNow(true); });
            if (a === 'suspend') return confirm({ title: 'Suspend ' + (p.name || 'this member') + '?', tone: 'warn', confirm: 'Suspend', icon: 'pause', body: 'Their listings are hidden and hosting is paused. Reversible at any time.',
              reason: { label: 'Reason (on the record)', required: true }, fields: [{ name: 'until', type: 'date', label: 'Until', help: 'Leave empty for an open-ended suspension' }],
              onConfirm: function (f) { return personAction(id, 'suspend', f.reason, f.until ? { until: new Date(f.until + 'T23:59:59+03:00').toISOString() } : {}).then(function (r) { toast('Suspended · ' + num(r.listings_changed) + ' listing(s) hidden', 'ok'); d.reload(); }); } });
            if (a === 'ban') return confirm({ title: 'Ban ' + (p.name || 'this member') + '?', tone: 'danger', confirm: 'Ban member', icon: 'ban', body: 'Signs them out everywhere, blocks sign-in, and removes their listings from the site. Use for fraud, abuse or safety.',
              reason: { label: 'Reason (on the record)', required: true },
              onConfirm: function (f) { return personAction(id, 'ban', f.reason).then(function (r) { toast('Banned · ' + num(r.listings_changed) + ' listing(s) removed', 'ok'); d.reload(); }); } });
            if (a === 'grant_credit') return form({ title: 'Adjust Cabana credit', sub: 'Positive adds points, negative removes them. 1 point = KES 1.', icon: 'coins', fields: [
                { name: 'points', type: 'number', label: 'Points', required: true, placeholder: 'e.g. 500 or -200' }, { name: 'reason', type: 'text', label: 'Reason', required: true, placeholder: 'Goodwill for the late check-in' }],
              onSubmit: function (f) { return personAction(id, 'grant_credit', f.reason, { points: n(f.points) }).then(function () { toast('Credit adjusted by ' + num(f.points) + ' pts', 'ok'); d.reload(); }); } });
            if (a === 'edit') return form({ title: 'Edit profile', icon: 'edit', fields: [
                { name: 'first_name', label: 'First name', value: pr.first_name }, { name: 'last_name', label: 'Last name', value: pr.last_name },
                { name: 'phone', label: 'Phone', value: pr.phone, type: 'tel' }, { name: 'mpesa_number', label: 'M-Pesa payout number', value: pr.mpesa_number, type: 'tel' },
                { name: 'last_role', label: 'Default mode', type: 'select', value: pr.last_role === 'partner' ? 'partner' : 'guest', options: [['guest', 'Guest'], ['partner', 'Host']] },
                { name: 'is_creator', type: 'switch', label: 'Creator', help: 'Shows the creator badge', value: !!pr.is_creator }],
              onSubmit: function (f) { return personAction(id, 'update_profile', null, f).then(function () { toast('Profile updated', 'ok'); d.reload(); }); } });
            if (a === 'revoke_sessions') return confirm({ title: 'Sign them out everywhere?', tone: 'warn', confirm: 'Revoke sessions', icon: 'logout', body: 'Every device is signed out. They can sign back in normally.',
              onConfirm: function () { return personAction(id, 'revoke_sessions').then(function () { toast('All sessions revoked', 'ok'); }); } });
            if (a === 'note') return form({ title: 'Add a note', icon: 'note', grid: false, fields: [{ name: 'note', type: 'textarea', label: 'Note', required: true }], onSubmit: function (f) { return personAction(id, 'note', f.note).then(function () { toast('Note added', 'ok'); d.reload(); }); } });
            if (a === 'push') return form({ title: 'Message ' + (p.name || 'member'), sub: num(x.push_devices) ? 'Delivered as a push notification to ' + num(x.push_devices) + ' device(s) and to their in-app feed.' : 'They have no push devices, so this lands in their in-app feed and by email.', icon: 'send', fields: [
                { name: 'title', label: 'Title', required: true, full: true, placeholder: 'A quick update on your booking' }, { name: 'body', label: 'Message', type: 'textarea', required: true, rows: 3 },
                { name: 'url', label: 'Opens', value: '/', full: true, help: 'A page on Cabana, e.g. /my-bookings' }, { name: 'email_always', type: 'switch', label: 'Also email it', value: !n(x.push_devices) }],
              submit: 'Send', submitIcon: 'send',
              onSubmit: function (f) { return CX.api('/api/push-send?action=admin-send', { body: { to: id, title: f.title, body: f.body, url: f.url || '/', kind: 'general', email_always: !!f.email_always } }).then(function (r) {
                toast(r.sent ? 'Delivered to ' + num(r.sent) + ' device(s)' : r.emailed ? 'Sent by email and in-app' : 'Saved to their in-app feed', 'ok'); }); } });
          }
          $$('[data-pa]', d.el).forEach(function (b) { b.onclick = function () { var r = run(b.getAttribute('data-pa')); if (r && r.then) CX.busy(b, function () { return r; }); }; });
          var more = $('[data-more]', d.el);
          if (more) more.onclick = function () {
            CX.menu(more, [{ label: 'Edit profile', icon: 'edit', fn: function () { run('edit'); } }, { label: 'Add a note', icon: 'note', fn: function () { run('note'); } },
              { label: 'Sign out everywhere', icon: 'logout', fn: function () { run('revoke_sessions'); } }, { label: 'Copy member ID', icon: 'copy', fn: function () { CX.copy(id, 'Member ID'); } },
              '-', banned ? { label: 'Lift ban', icon: 'undo', fn: function () { run('unban'); } } : { label: 'Ban member', icon: 'ban', danger: true, fn: function () { run('ban'); } }]);
          };
        });
      }
    });
  }
  CX.open.person = function (id, fromRoute) { personDrawer(id, fromRoute); };

  /* ════════════════════════════════════════════════════════════════
     FINANCE
     ════════════════════════════════════════════════════════════════ */
  var FTABS = [['overview', 'Overview'], ['payments', 'Payments'], ['refunds', 'Refunds owed'], ['payouts', 'Payouts'], ['credit', 'Credit']];
  CX.view('finance', {
    title: 'Finance', chart: true,
    render: function (v) {
      var tab = v.q.tab || 'overview', days = CX.range;
      set(v.el, html`${pageHd('Money', 'Finance', 'Cash in, money owed, and what Cabana keeps.')}${CX.skeleton('kpis')}`);
      return rpc('admin_finance', { p_days: days }).then(function (f) {
        if (!v.alive()) return;
        var s = f.summary || {}, li = f.liabilities || {}, pay = f.payments || {};
        var pendW = (f.withdrawals || []).filter(function (w) { return w.status === 'pending'; }).length;
        set(v.el, html`${pageHd('Money', 'Finance', 'Cash in, money owed, and what Cabana keeps — over the last ' + (days === 365 ? '12 months' : days + ' days') + '.', rangeSeg(days))}
          ${CX.tabs(FTABS.map(function (t) { return [t[0], t[1], t[0] === 'refunds' ? n(li.refunds_due_count) : t[0] === 'payouts' ? pendW : null, t[0] === 'refunds' || t[0] === 'payouts']; }), tab)}
          <div data-fbody></div>`);
        wireRange(v.el, v);
        on(v.el, '[data-tab]', 'click', function (el) { v.setQ({ tab: el.getAttribute('data-tab') === 'overview' ? null : el.getAttribute('data-tab') }); v.refresh(); });
        var body = $('[data-fbody]', v.el);
        if (tab === 'overview') {
          set(body, html`<div class="grid g4 stagger">
              <div class="card kpi"><div class="kpi-l">${icon('trendUp')}Secured GMV</div><div class="kpi-v" data-count="${n(s.gmv)}" data-fmt="moneyC">0</div><div class="kpi-m mt-s">${num(s.secured)} of ${num(s.bookings)} bookings paid up</div></div>
              <div class="card kpi"><div class="kpi-l">${icon('coins')}Collected</div><div class="kpi-v" data-count="${n(s.collected)}" data-fmt="moneyC">0</div><div class="kpi-m mt-s">${num(pay.paid)} successful payments</div></div>
              <div class="card kpi"><div class="kpi-l">${icon('wallet')}Cabana revenue</div><div class="kpi-v" data-count="${n(s.revenue)}" data-fmt="moneyC">0</div><div class="kpi-m mt-s">Fees on secured bookings</div></div>
              <div class="card kpi ${n(s.outstanding) ? 'tone-warn' : ''}"><div class="kpi-l">${icon('clock')}Outstanding balances</div><div class="kpi-v" data-count="${n(s.outstanding)}" data-fmt="moneyC">0</div><div class="kpi-m mt-s">Secured, not fully paid</div></div></div>
            <div class="split mt">
              <div class="card"><div class="card-hd"><div><div class="card-t">Cash received</div><div class="card-s">Successful payments per day · failed attempts in red</div></div></div><div class="chart" id="fin-chart"></div>
                <div class="legend mt-s"><span><i style="background:var(--teal)"></i>Paid</span><span><i style="background:var(--bad)"></i>Failed attempts</span></div></div>
              <div class="card"><div class="card-hd"><div><div class="card-t">What Cabana owes</div><div class="card-s">Live liabilities, all time</div></div></div>${CX.kv([
                ['Refunds owed', html`<span class="${n(li.refunds_due) ? 'bad-t' : ''}">${money(li.refunds_due)}</span> <span class="muted">· ${num(li.refunds_due_count)}</span>`],
                ['Payout requests', money(li.withdrawals_pending) + ' · ' + num(li.withdrawals_count)], ['Commissions pending', money(li.commissions_pending)], ['Commissions available', money(li.commissions_available)],
                ['Credit outstanding', num(li.credit_points) + ' pts · ' + num(li.credit_holders) + ' members'], ['Float balance', money(li.float_balance)]])}
                <div class="card-f"><a class="link-btn" href="#/finance?tab=refunds">Settle refunds ${icon('arrowR')}</a><a class="link-btn" href="#/finance?tab=payouts">Payouts ${icon('arrowR')}</a></div></div></div>
            <div class="grid g3 mt">
              <div class="card"><div class="card-hd"><div><div class="card-t">By service</div></div></div>${(f.by_service || []).length ? html`<div class="list">${f.by_service.map(function (x) { return html`<div class="li"><span class="li-ic">${icon(svc(x.service).icon)}</span><div class="li-b"><div class="li-t">${svc(x.service).label}</div><div class="li-s">${num(x.bookings)} bookings · ${moneyC(x.gmv)} secured</div></div><div class="li-r"><b>${moneyC(x.collected)}</b>${moneyC(x.revenue)} fees</div></div>`; })}</div>` : CX.empty('No bookings in range')}</div>
              <div class="card"><div class="card-hd"><div><div class="card-t">Payment outcomes</div><div class="card-s">Attempts in range</div></div></div>${CX.hbars([{ label: 'Paid', value: pay.paid, color: 'var(--ok)' }, { label: 'Failed', value: pay.failed, color: 'var(--bad)' }, { label: 'Expired', value: pay.expired, color: 'var(--ink-4)' }, { label: 'Pending', value: pay.pending, color: 'var(--warn)' }])}
                <div class="card-f"><span class="muted">Success rate</span><b class="tnum">${CX.pct(CX.ratio(pay.paid, n(pay.paid) + n(pay.failed) + n(pay.expired)))}</b></div></div>
              <div class="card"><div class="card-hd"><div><div class="card-t">Payment methods</div></div></div>${CX.hbars(Object.keys(pay.methods || {}).map(function (m) { return { label: human(m), value: pay.methods[m] }; }))}
                <div class="card-f"><span class="muted">Booked demand</span><b class="tnum">${money(s.demand)}</b></div></div></div>`);
          CX.countUp(body);
          var cs = f.cash_series || [];
          CX.lineChart($('#fin-chart', body), { bars: true, labels: cs.map(function (d) { return d.d; }), height: 230, tickFmt: fshort, tipLabel: fdate, axis: compact,
            series: [{ name: 'Paid', color: 'var(--teal)', values: cs.map(function (d) { return n(d.paid); }), fmt: money }, { name: 'Failed attempts', color: 'var(--bad)', values: cs.map(function (d) { return n(d.failed); }) }] });
          return;
        }
        if (tab === 'refunds') {
          var rf = f.refunds || [];
          set(body, html`${rf.length ? html`<div class="callout warn mb">${icon('coins')}<div class="grow"><div class="strong">${money(li.refunds_due)} owed to ${num(rf.length)} guest${rf.length === 1 ? '' : 's'}</div><div class="muted" style="font-size:12.5px">Send each refund by M-Pesa, then record it — or convert stay refunds to Cabana credit.</div></div></div>` : ''}
            <div class="card flush">${rf.length ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Booking</th><th>Guest</th><th class="num">Owed</th><th class="hide-s">Why</th><th></th></tr></thead><tbody>${rf.map(function (b) { return html`
              <tr><td class="click" data-booking="${b.service}:${b.id}"><div class="t-main">${b.item_title || svc(b.service).label}</div><div class="t-sub">${svc(b.service).label} · ${fdate(b.created_at)}</div></td>
              <td><div class="t-main">${b.guest_name || 'Guest'}</div><div class="t-sub">${b.guest_phone || b.guest_email || ''}</div></td><td class="num"><b class="bad-t">${money(b.refund_due, b.currency)}</b><div class="t-sub">of ${money(b.paid)} paid</div></td>
              <td class="hide-s t-sub">${human(String(b.status || ''))}</td>
              <td><div class="t-act">${b.guest_phone ? html`<button class="btn btn-sm btn-q" data-copy="${b.guest_phone}" data-copy-label="Phone">${icon('copy')}</button>` : ''}<button class="btn btn-sm btn-ok" data-refund="${b.service}:${b.id}:${n(b.refund_due)}">${icon('check')}Record refund</button>${b.service === 'stay' ? html`<button class="btn btn-sm btn-v" data-credit="${b.id}">To credit</button>` : ''}</div></td></tr>`; })}</tbody></table></div>`
              : CX.empty('No refunds owed', 'Every guest who is owed money has been settled.', 'checkCircle', true)}</div>`);
          wireOpeners(body);
          on(body, '[data-refund]', 'click', function (el) { var p = el.getAttribute('data-refund').split(':'); confirm({ title: 'Record a refund', tone: 'ok', confirm: 'Record refund', icon: 'coins', body: 'Records money already sent back. It does not send money itself.',
            amount: { label: 'Amount refunded (KES)', value: n(p[2]), required: true }, reason: { label: 'M-Pesa reference or note', required: false },
            onConfirm: function (x) { return rpc('admin_booking_action', { p_service: p[0], p_id: p[1], p_action: 'mark_refunded', p_reason: x.reason || null, p_amount: n(x.amount) }).then(function () { toast('Refund recorded', 'ok'); CX.pulseNow(true); v.refresh(); }); } }); });
          on(body, '[data-credit]', 'click', function (el) { confirm({ title: 'Convert to credit?', body: 'The amount owed becomes Cabana credit on the guest’s account.', confirm: 'Convert', icon: 'coins',
            onConfirm: function () { return rpc('admin_booking_action', { p_service: 'stay', p_id: el.getAttribute('data-credit'), p_action: 'refund_to_credit', p_reason: null, p_amount: null }).then(function () { toast('Converted to credit', 'ok'); CX.pulseNow(true); v.refresh(); }); } }); });
          return;
        }
        if (tab === 'payouts') {
          var ws = f.withdrawals || [];
          set(body, html`<div class="card flush">${ws.length ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Member</th><th class="num">Amount</th><th>M-Pesa</th><th>Status</th><th class="hide-s">Requested</th><th></th></tr></thead><tbody>${ws.map(function (w) { return html`
            <tr><td class="click" data-person="${w.user_id}"><div class="cell">${CX.avatar(w.name, 'sm')}<div><div class="t-main">${w.name}</div><div class="t-sub">${w.email || ''}</div></div></div></td><td class="num"><b>${money(w.amount)}</b></td>
            <td><span class="mono">${w.mpesa || '—'}</span>${w.mpesa ? html` <button class="btn btn-sm btn-q btn-icon" data-copy="${w.mpesa}" data-copy-label="Number">${icon('copy')}</button>` : ''}</td><td>${CX.pill(w.status)}${w.notes ? html`<div class="t-sub trunc" style="max-width:220px" title="${w.notes}">${w.notes}</div>` : ''}</td>
            <td class="hide-s t-sub">${fdt(w.created_at)}</td><td><div class="t-act">${w.status === 'pending' ? html`<button class="btn btn-sm btn-ok" data-w="${w.id}" data-wa="paid">${icon('check')}Mark paid</button><button class="btn btn-sm btn-d" data-w="${w.id}" data-wa="rejected">Reject</button>` : ''}</div></td></tr>`; })}</tbody></table></div>`
            : CX.empty('No payout requests', 'Ambassador and referral withdrawals appear here.', 'wallet')}</div>`);
          wireOpeners(body);
          on(body, '[data-w]', 'click', function (el) { var paid = el.getAttribute('data-wa') === 'paid'; confirm({ title: paid ? 'Mark this payout as paid?' : 'Reject this payout?', tone: paid ? 'ok' : 'danger', confirm: paid ? 'Mark paid' : 'Reject', icon: paid ? 'check' : 'x',
            body: paid ? 'Send the M-Pesa transfer first. This records that it went out.' : 'The member keeps their balance and can request again.', reason: { label: paid ? 'M-Pesa reference' : 'Reason', required: !paid },
            onConfirm: function (x) { return rpc('admin_withdrawal_action', { p_id: el.getAttribute('data-w'), p_action: el.getAttribute('data-wa'), p_note: x.reason || null }).then(function () { toast(paid ? 'Marked paid' : 'Rejected', 'ok'); CX.pulseNow(true); v.refresh(); }); } }); });
          return;
        }
        if (tab === 'credit') {
          var ct = f.credit_top || [];
          set(body, html`<div class="grid g3 mb"><div class="mini"><div class="mini-l">Credit outstanding</div><div class="mini-v">${num(li.credit_points)} pts</div><div class="mini-s">≈ ${money(li.credit_points)}</div></div>
              <div class="mini"><div class="mini-l">Members holding credit</div><div class="mini-v">${num(li.credit_holders)}</div></div>
              <div class="mini row between" style="align-items:center"><div><div class="mini-l">Adjust someone’s credit</div><div class="mini-s">Goodwill, corrections, promotions</div></div><button class="btn btn-sm btn-p" data-grant>${icon('plus')}Adjust</button></div></div>
            <div class="card flush">${ct.length ? html`<table class="tbl"><thead><tr><th>Member</th><th class="num">Available</th><th class="num">Lifetime</th></tr></thead><tbody>${ct.map(function (u) { return html`<tr class="click" data-person="${u.user_id}"><td><div class="cell">${CX.avatar(u.name, 'sm')}<div><div class="t-main">${u.name}</div><div class="t-sub">${u.email || ''}</div></div></div></td><td class="num"><b>${num(u.points)}</b> pts</td><td class="num t-sub">${num(u.lifetime)}</td></tr>`; })}</tbody></table>`
              : CX.empty('Nobody holds credit', '', 'coins')}</div>`);
          wireOpeners(body);
          on(body, '[data-grant]', 'click', function () { pickPerson('Adjust credit', 'Choose the member first.').then(function (p) { if (!p) return; form({ title: 'Adjust credit for ' + (p.name || p.email), icon: 'coins', fields: [{ name: 'points', type: 'number', label: 'Points (negative removes)', required: true }, { name: 'reason', label: 'Reason', required: true }],
            onSubmit: function (x) { return personAction(p.id, 'grant_credit', x.reason, { points: n(x.points) }).then(function () { toast('Credit adjusted', 'ok'); v.refresh(); }); } }); }); });
          return;
        }
        /* payments */
        var pst = v.q.status || 'all', page = Math.max(0, +(v.q.page || 0));
        set(body, CX.skeleton('list'));
        return rpc('admin_payments', { p_status: pst === 'all' ? null : pst, p_method: v.q.method || null, p_q: v.q.q || null, p_limit: PAGE, p_offset: page * PAGE }).then(function (pmt) {
          if (!v.alive()) return;
          var bs = pmt.by_status || {};
          set(body, html`<div class="filters">${CX.seg([['all', 'All']].concat(Object.keys(bs).map(function (k) { return [k, human(k) + ' ' + num(bs[k].n)]; })), pst, 'data-pst')}
              <label class="search wide">${icon('search')}<input class="inp" type="search" placeholder="Reference, receipt, phone, guest…" value="${v.q.q || ''}" data-psearch aria-label="Search payments"/></label>
              <span class="muted" style="margin-left:auto;font-size:12.5px">${num(pmt.total)} payments · ${money(pmt.sum)}</span></div>
            <div class="card flush">${(pmt.rows || []).length ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Payment</th><th class="hide-s">For</th><th>Method</th><th class="num">Amount</th><th>Status</th><th class="num hide-s">When</th></tr></thead><tbody>${pmt.rows.map(function (p) { return html`
              <tr class="${p.booking_id ? 'click' : ''}" ${p.booking_id ? raw('data-booking="' + CX.esc(p.service + ':' + p.booking_id) + '"') : ''}><td><div class="t-main mono" style="font-size:12.5px">${p.mpesa_receipt || String(p.reference || '').slice(-22)}</div><div class="t-sub">${p.phone || ''}</div></td>
              <td class="hide-s"><div class="t-main">${p.guest_name || 'Guest'}</div><div class="t-sub">${p.item_title || svc(p.service).label}</div></td><td>${human(p.payment_method || 'mpesa')}</td>
              <td class="num"><b>${money(p.amount)}</b></td><td>${CX.pill(p.status)}</td><td class="num hide-s t-sub" title="${fdt(p.paid_at || p.created_at)}">${ago(p.paid_at || p.created_at)}</td></tr>`; })}</tbody></table></div>
              <div class="pager"><span>Page ${num(page + 1)} of ${num(Math.max(1, Math.ceil(n(pmt.total) / PAGE)))}</span><div class="btn-row"><button class="btn btn-sm btn-g" data-ppage="${page - 1}"${page ? '' : raw(' disabled')}>${icon('chevL')}Previous</button><button class="btn btn-sm btn-g" data-ppage="${page + 1}"${(page + 1) * PAGE < n(pmt.total) ? '' : raw(' disabled')}>Next${icon('chevR')}</button></div></div>`
              : CX.empty('No payments match', '', 'receipt')}</div>`);
          wireOpeners(body);
          on(body, '[data-pst]', 'click', function (el) { v.setQ({ status: el.getAttribute('data-pst') === 'all' ? null : el.getAttribute('data-pst'), page: null }); v.refresh(); });
          on(body, '[data-ppage]', 'click', function (el) { v.setQ({ page: +el.getAttribute('data-ppage') || null }); v.refresh(); });
          var ps = $('[data-psearch]', body);
          ps.addEventListener('input', CX.debounce(function () { v.setQ({ q: ps.value.trim() || null, page: null }); v.refresh(); }, 380));
          if (v.q.q) { ps.focus(); ps.setSelectionRange(ps.value.length, ps.value.length); }
        });
      });
    }
  });

  CX.ops = { who: who, wireOpeners: wireOpeners, pageHd: pageHd, on: on, actBtn: actBtn, QUEUES: QUEUES, personAction: personAction, listingAction: listingAction, trustBar: trustBar, rangeSeg: rangeSeg, wireRange: wireRange };
})(window);
