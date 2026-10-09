/* ═══════════════════════════════════════════════════════════════════
   CABANA · OPERATIONS CONSOLE · Search engine and Intelligence
   ───────────────────────────────────────────────────────────────────
   SEARCH ENGINE (Beacon): every live page Cabana serves to search
   engines, how each one reads in a result, what is holding any of them
   back (and the message to send the host), every change announced to
   search engines, the places with supply, and the off-site checklist
   that decides whether "Cabana" on its own finds us.

   INTELLIGENCE (Compass + APA): who is on Cabana and what they want,
   where demand has no supply yet (the onboarding list), the audiences
   advertisers can buy (sized, never itemised), and what APA's
   conversations are about and how they end.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  var CX = global.CX; if (!CX || !CX.ops) return;
  var html = CX.html, raw = CX.raw, set = CX.set, icon = CX.icon;
  var n = CX.n, num = CX.num, ago = CX.ago, fdt = CX.fdt, human = CX.human;
  var rpc = CX.rpc, toast = CX.toast;
  var O = CX.ops, on = O.on, pageHd = O.pageHd;

  function wireTabs(v, fallback) {
    on(v.el, '[data-tab]', 'click', function (el) { var t = el.getAttribute('data-tab'); v.setQ({ tab: t === fallback ? null : t }); v.refresh(); });
  }
  function usd(x) { return x == null ? '—' : 'US$' + (Math.round(Number(x) * 100) / 100).toLocaleString('en-KE'); }
  function kpi(ic, label, value, sub, tone) {
    return html`<div class="card kpi ${tone ? 'tone-' + tone : ''}"><div class="kpi-l">${icon(ic)}${label}</div><div class="kpi-v">${value}</div>${sub ? html`<div class="kpi-m mt-s">${sub}</div>` : ''}</div>`;
  }

  /* ════════════════════════════════════════════════════════════════
     SEARCH ENGINE
     ════════════════════════════════════════════════════════════════ */
  var KIND_LABEL = { stay: 'Stay', room: 'Room', food: 'Food', shop: 'Shop', tour: 'Tour', event: 'Event', car: 'Car' };

  /* The off-site work that decides whether the bare word "Cabana" ever
     finds us. Code cannot do these; the console keeps score. */
  var BRAND = [
    ['gbp', 'Google Business Profile', 'Name exactly "Cabana", category Travel agency, Nairobi address verified. The fastest route into the local pack for "cabana".', 'https://business.google.com/'],
    ['gsc', 'Google Search Console', 'Verify cabana.africa and submit /sitemap-index.xml (it lists the live sitemap).', 'https://search.google.com/search-console'],
    ['bing', 'Bing Webmaster Tools', 'Verify and submit the same index. Bing feeds ChatGPT search; IndexNow is already wired.', 'https://www.bing.com/webmasters'],
    ['wikidata', 'Wikidata item', 'The single strongest free Knowledge Graph input. Instance of: business; official website: cabana.africa.', 'https://www.wikidata.org/wiki/Special:NewItem'],
    ['linkedin', 'LinkedIn company page', 'Handle cabana-africa, linking back to cabana.africa. Then add it to sameAs in seo/lib/schema.py.', 'https://www.linkedin.com/company/setup/new/'],
    ['instagram', 'Instagram @cabana.africa', 'Bio link to cabana.africa. Then add to sameAs.', 'https://www.instagram.com/'],
    ['facebook', 'Facebook page', 'Name "Cabana", link to cabana.africa. Then add to sameAs.', 'https://www.facebook.com/pages/create'],
    ['crunchbase', 'Crunchbase profile', 'A citation journalists and AI assistants both read.', 'https://www.crunchbase.com/'],
    ['badges', 'Host badges', 'Every host and operator puts the "Book direct on Cabana" badge on their own site. One backlink per provider, at onboarding.', null],
    ['press', 'Press: zero-commission story', 'TechCabal, Techpoint, Disrupt Africa, Business Daily. "Kenyan startup takes on Airbnb with zero commission".', null],
  ];

  function serp(it) {
    return html`<div style="max-width:600px"><div style="font-size:12px;color:#188038">cabana.africa${it.path.replace(/-[0-9a-f]{8}$|-\d+$/, '…')}</div>
      <div style="font-size:16px;color:#1a0dab;line-height:1.3;margin:2px 0">${it.serp.title}</div>
      <div style="font-size:13px;color:var(--ink-2);line-height:1.45">${it.serp.description}</div></div>`;
  }

  function hostAsk(it) {
    var fixes = (it.quality.issues || []).map(function (i) {
      return { 'no photos': 'add at least 5 clear photos (the first one is what appears in Google)',
        'fewer than 3 photos': 'add a few more photos, 5 or more if you can',
        'short description': 'write 3 or 4 sentences about the place: who it suits, what is nearby, what makes it good',
        'no price': 'set a price', 'no city': 'set the city and area', 'no map pin': 'drop the map pin (only the area is ever shown publicly)',
        'few amenities listed': 'tick every amenity you have (Wi-Fi, parking, hot water, backup power…)' }[i] || i;
    });
    return 'Hi' + (it.host ? '' : '') + ', your listing "' + it.title + '" is live on Cabana and has its own page on Google: ' + it.url +
      '\n\nIt will show up for more searches if you ' + fixes.join('; ') + '.\n\nYou can do it in a minute from your Cabana dashboard, or just reply with the details and APA will add them for you. Thank you!';
  }

  CX.view('search', {
    title: 'Search engine', wide: true,
    render: function (v) {
      var tab = v.q.tab || 'pages';
      set(v.el, html`${pageHd('Growth', 'Search engine', 'Every live page Cabana serves to Google, Bing and AI assistants, built from the database the moment a host publishes.')}${CX.skeleton('kpis')}<div class="mt">${CX.skeleton('list')}</div>`);
      return Promise.all([
        rpc('admin_beacon_overview', {}, { fresh: !!v.q.fresh }),
        CX.api('/api/growth?op=report').catch(function (e) { return { items: [], error: e.message }; }),
      ]).then(function (r) {
        if (!v.alive()) return;
        var o = r[0] || {}, rep = r[1] || {}, items = rep.items || [];
        var live = o.live || {}, totalLive = Object.keys(live).reduce(function (s, k) { return s + n(live[k]); }, 0);
        var indexable = items.filter(function (i) { return i.quality && i.quality.indexable; }).length;
        var fixes = items.filter(function (i) { return i.quality && i.quality.issues && i.quality.issues.length; })
          .sort(function (a, b) { return (a.quality.indexable ? 1 : 0) - (b.quality.indexable ? 1 : 0) || b.quality.issues.length - a.quality.issues.length; });
        var p7 = o.pings_7d || {}, ver = o.version || {};
        var settings = o.settings || {};
        var brandDone = BRAND.filter(function (b) { return settings['growth.brand.' + b[0]] === 'done'; }).length;

        var head = html`${pageHd('Growth', 'Search engine', 'Every live page Cabana serves to Google, Bing and AI assistants, built from the database the moment a host publishes.',
          html`<a class="btn btn-g" href="/sitemap-live.xml" target="_blank" rel="noopener">${icon('external')}Live sitemap</a><a class="btn btn-g" href="/llms-live.txt" target="_blank" rel="noopener">${icon('external')}AI catalogue</a><button class="btn btn-p" data-ping>${icon('send')}Announce everything now</button><button class="btn btn-q btn-icon" data-fresh title="Refresh">${icon('refresh')}</button>`)}
          <div class="grid g4 stagger">
            ${kpi('globe', 'Live pages', num(totalLive), Object.keys(live).map(function (k) { return num(live[k]) + ' ' + (KIND_LABEL[k] || k).toLowerCase(); }).join(' · ') || 'Nothing live yet')}
            ${kpi('search', 'In the sitemap', num(rep.sitemap), num(indexable) + ' pages + live hubs · ' + num(items.length - indexable) + ' held back', items.length - indexable ? 'warn' : '')}
            ${kpi('zap', 'Announced (7 days)', num(p7.urls), num(p7.ok) + ' of ' + num(p7.runs) + ' IndexNow runs accepted', n(p7.runs) && n(p7.ok) < n(p7.runs) ? 'warn' : '')}
            ${kpi('flag', 'Brand checklist', brandDone + ' / ' + BRAND.length, 'What decides if "Cabana" alone finds us', brandDone < 4 ? 'warn' : '')}
          </div>
          ${n(ver.pending) ? html`<div class="callout warn mt">${icon('clock')}<div class="grow">${num(ver.pending)} change(s) waiting to be announced. The scheduler sends them within a minute.</div></div>` : ''}
          ${rep.error ? html`<div class="callout bad mt">${icon('alert')}<div class="grow">The page report could not load: ${rep.error}</div></div>` : ''}
          <div class="mt">${CX.tabs([['pages', 'Pages', items.length], ['fix', 'Fix list', fixes.length, true], ['changes', 'Changes', (o.changes || []).length], ['places', 'Places', (o.places || []).length], ['brand', 'Brand', BRAND.length - brandDone, true]], tab)}</div>`;

        var body;
        if (tab === 'fix') {
          body = fixes.length ? html`<p class="muted mt-s" style="font-size:13px">Pages held back from Google first, then everything that would rank better with one more thing from the host. Copy the message and send it; or let APA collect it in the host's chat.</p>
            <div class="col mt" style="gap:10px">${fixes.map(function (it) {
              return html`<div class="card"><div class="row between" style="gap:14px;align-items:flex-start"><div class="grow" style="min-width:0">
                <div class="row" style="gap:8px">${CX.pill(it.quality.indexable ? 'live' : 'held back', it.quality.indexable ? 'p-info' : 'p-warn')}<b>${it.title}</b><span class="muted">${KIND_LABEL[it.kind]} · ${it.location || ''}</span></div>
                <div class="mt-s" style="display:flex;flex-wrap:wrap;gap:6px">${it.quality.issues.map(function (i) { return html`<span class="tag">${i}</span>`; })}</div></div>
                <div class="row" style="gap:6px;flex:none"><a class="btn btn-sm btn-g" href="${it.path}" target="_blank" rel="noopener">${icon('external')}Page</a><button class="btn btn-sm btn-p" data-ask="${it.key}">${icon('copy')}Message for host</button></div></div></div>`;
            })}</div>` : CX.empty('Every live page has what it needs', 'Photos, a description, a price and a pin on every one.', 'checkCircle', true);
        } else if (tab === 'changes') {
          body = html`<div class="split mt"><div class="card flush"><div class="card-hd" style="padding:14px 18px"><div><div class="card-t">Change feed</div><div class="card-s">Written by the database the moment anything public changes</div></div></div>
              <table class="tbl"><thead><tr><th>Change</th><th>What</th><th>When</th><th>Announced</th></tr></thead><tbody>${(o.changes || []).map(function (c) {
                var res = c.result || {};
                return html`<tr><td>${CX.pill(c.change, { created: 'p-ok', activated: 'p-ok', updated: 'p-info', deactivated: 'p-warn', deleted: 'p-bad' }[c.change])}</td>
                  <td><div class="t-main">${(c.snapshot && c.snapshot.title) || c.entity_id}</div><div class="t-sub">${KIND_LABEL[c.kind] || c.kind} · ${(c.snapshot && (c.snapshot.area || c.snapshot.city)) || ''}</div></td>
                  <td class="t-sub">${ago(c.created_at)}</td><td class="t-sub">${c.processed_at ? html`${res.ok === false ? CX.pill('failed', 'p-bad') : CX.pill('sent', 'p-ok')} ${num(res.urls)} URL(s)` : c.claimed_at ? 'sending…' : 'queued'}</td></tr>`;
              })}</tbody></table>${(o.changes || []).length ? '' : CX.empty('No changes yet')}</div>
            <div class="card flush"><div class="card-hd" style="padding:14px 18px"><div><div class="card-t">IndexNow</div><div class="card-s">Bing, Yandex, Seznam, Naver and Yep. Google reads the sitemaps.</div></div></div>
              <table class="tbl"><thead><tr><th>When</th><th>Why</th><th class="num">URLs</th><th>Result</th></tr></thead><tbody>${(o.pings || []).map(function (p) {
                return html`<tr><td class="t-sub">${ago(p.created_at)}</td><td class="t-sub">${p.reason || ''}</td><td class="num">${num(p.urls)}</td><td>${p.ok ? CX.pill('accepted ' + p.status, 'p-ok') : html`${CX.pill(p.status ? 'HTTP ' + p.status : 'failed', 'p-bad')}<div class="t-sub">${p.note || ''}</div>`}</td></tr>`;
              })}</tbody></table>${(o.pings || []).length ? '' : CX.empty('Nothing announced yet')}</div></div>`;
        } else if (tab === 'places') {
          var places = o.places || [];
          body = places.length ? html`<div class="card flush mt"><table class="tbl"><thead><tr><th>Place</th><th>Service</th><th class="num">Live</th><th class="num">From</th><th class="num">To</th><th>Hub page</th></tr></thead><tbody>${places.map(function (p) {
            var suffix = { stays: 'apartments', tours: 'safaris', carhire: 'car-hire', events: 'events', food: 'restaurants', roommates: 'rooms' }[p.service];
            return html`<tr><td><div class="t-main">${p.name || human(p.place)}</div><div class="t-sub">${human(p.kind || '')}${p.country ? ' · ' + p.country : ''}</div></td><td>${human(p.service)}</td><td class="num"><b>${num(p.count)}</b></td><td class="num">${usd(p.low_usd)}</td><td class="num">${usd(p.high_usd)}</td>
              <td>${suffix && p.kind !== 'country' ? html`<a class="link-btn" href="/${p.place}-${suffix}" target="_blank" rel="noopener">/${p.place}-${suffix}</a>` : '—'}</td></tr>`;
          })}</tbody></table></div>` : CX.empty('No place supply yet', 'Filled by the scheduler from the live catalogue.', 'map');
        } else if (tab === 'brand') {
          body = html`<p class="muted mt-s" style="font-size:13px;max-width:780px">"cabana" on its own is a dictionary word, so Google reads it as a question about poolside shelters. What moves it is a verified business entity and people searching for Cabana by name. Tick each item as it is done; the console keeps the count.</p>
            <div class="col mt" style="gap:10px">${BRAND.map(function (b) {
              var done = settings['growth.brand.' + b[0]] === 'done';
              return html`<div class="card"><div class="row between" style="gap:14px"><div class="row grow" style="gap:12px;align-items:flex-start"><span class="health-dot ${done ? '' : 'warn'}" style="margin-top:6px"></span><div><div class="strong">${b[1]}</div><div class="muted" style="font-size:12.5px;margin-top:3px">${b[2]}</div></div></div>
                <div class="row" style="gap:6px;flex:none">${b[3] ? html`<a class="btn btn-sm btn-g" href="${b[3]}" target="_blank" rel="noopener">${icon('external')}Open</a>` : ''}<button class="btn btn-sm ${done ? 'btn-g' : 'btn-p'}" data-brand="${b[0]}" data-done="${done ? '1' : ''}">${done ? 'Done ✓' : 'Mark done'}</button></div></div></div>`;
            })}</div>`;
        } else {
          body = items.length ? html`<div class="card flush mt"><table class="tbl"><thead><tr><th>How it reads in Google</th><th>Status</th><th>Price</th><th></th></tr></thead><tbody>${items.map(function (it) {
            return html`<tr><td>${serp(it)}</td><td>${it.quality.indexable ? CX.pill('indexed', 'p-ok') : CX.pill('held back', 'p-warn')}<div class="t-sub mt-s">Updated ${ago(it.updated_at)}</div></td>
              <td class="t-sub">${it.price ? it.currency + ' ' + num(it.price) + ' / ' + it.unit : '—'}</td>
              <td><div class="row" style="gap:6px;justify-content:flex-end"><a class="btn btn-sm btn-g" href="${it.path}" target="_blank" rel="noopener">${icon('external')}Open</a><button class="btn btn-sm btn-g" data-badge="${it.key}" title="Copy the host's backlink badge">${icon('link')}Badge</button></div></td></tr>`;
          })}</tbody></table></div>` : CX.empty('No live pages yet', 'Each listing, tour, event and car gets its own page here the moment it goes live.', 'globe');
        }
        set(v.el, html`${head}${body}`);
        wireTabs(v, 'pages');
        on(v.el, '[data-fresh]', 'click', function () { v.setQ({ fresh: 1 }); v.refresh(); });
        on(v.el, '[data-ping]', 'click', function (el) {
          CX.busy(el, function () {
            return CX.api('/api/growth?op=ping-all', { method: 'POST', body: {} }).then(function (r) {
              toast(r.ok ? 'Announced ' + num(r.urls) + ' URLs to search engines' : 'IndexNow refused it: ' + (r.note || r.status), r.ok ? 'ok' : 'bad');
              CX.log('beacon.ping_all', 'site', 'cabana.africa', { urls: r.urls, status: r.status });
            });
          });
        });
        var byKey = {}; items.forEach(function (i) { byKey[i.key] = i; });
        on(v.el, '[data-ask]', 'click', function (el) { var it = byKey[el.getAttribute('data-ask')]; if (it) CX.copy(hostAsk(it), 'Message for the host'); });
        on(v.el, '[data-badge]', 'click', function (el) { var it = byKey[el.getAttribute('data-badge')]; if (it) CX.copy(it.badge, 'Badge HTML'); });
        on(v.el, '[data-brand]', 'click', function (el) {
          var key = el.getAttribute('data-brand'), done = !!el.getAttribute('data-done');
          CX.busy(el, function () {
            return rpc('admin_growth_setting', { p_key: 'growth.brand.' + key, p_value: done ? '' : 'done' }).then(function () { CX.freshen(); v.setQ({ fresh: 1 }); v.refresh(); });
          });
        });
      });
    }
  });

  /* ════════════════════════════════════════════════════════════════
     INTELLIGENCE
     ════════════════════════════════════════════════════════════════ */
  var LIFECYCLE = [['new', 'New'], ['exploring', 'Exploring'], ['considering', 'Considering'], ['ready', 'Ready to book'], ['customer', 'Customer'], ['loyal', 'Loyal'], ['lapsed-customer', 'Lapsed']];
  var SEGMENT_META = null;
  function segmentsMeta() {
    if (SEGMENT_META) return Promise.resolve(SEGMENT_META);
    return fetch('/api/growth?op=segments').then(function (r) { return r.json(); }).then(function (j) { SEGMENT_META = {}; (j.segments || []).forEach(function (s) { SEGMENT_META[s.id] = s; }); return SEGMENT_META; }).catch(function () { return {}; });
  }
  function dist(arr) { return (arr || []).map(function (d) { return { label: human(d.key || 'unknown'), value: d.count }; }); }
  function objDist(o) { return Object.keys(o || {}).map(function (k) { return { label: human(k), value: o[k] }; }).sort(function (a, b) { return b.value - a.value; }); }

  CX.view('intelligence', {
    title: 'Intelligence', wide: true,
    render: function (v) {
      var tab = v.q.tab || 'people', days = Number(v.q.days) || 30;
      set(v.el, html`${pageHd('Growth', 'Intelligence', 'Who is on Cabana, what they want, where supply is missing, and what APA is hearing.')}${CX.skeleton('kpis')}<div class="mt">${CX.skeleton('list')}</div>`);
      return Promise.all([rpc('admin_compass_overview', { p_days: days }), rpc('admin_apa_overview', { p_days: days }), segmentsMeta()]).then(function (r) {
        if (!v.alive()) return;
        var c = r[0] || {}, a = r[1] || {}, meta = r[2] || {}, t = c.totals || {};
        var lifecycle = c.lifecycle || {};
        var demand = c.demand || [];
        var gaps = demand.filter(function (d) { return n(d.supply) === 0 && d.service !== 'hosting' && d.service !== 'any'; });
        var head = html`${pageHd('Growth', 'Intelligence', 'Who is on Cabana, what they want, where supply is missing, and what APA is hearing.',
          html`${CX.seg([[7, '7 days'], [30, '30 days'], [90, '90 days']], days, 'data-days')}<button class="btn btn-g" data-kit>${icon('copy')}Audience media kit</button>`)}
          <div class="grid g4 stagger">
            ${kpi('users', 'People profiled', num(t.active), num(t.profiles) + ' all time · ' + num(t.active_7d) + ' this week')}
            ${kpi('idcard', 'Signed-in members', t.active ? Math.round(n(t.members) / Math.max(1, n(t.profiles)) * 100) + '%' : '—', num(t.members) + ' profiles linked to accounts')}
            ${kpi('zap', 'Ready to book', num(t.high_intent), 'High intent in the last 7 days', n(t.high_intent) ? 'ok' : '')}
            ${kpi('map', 'Unmet demand', num(gaps.length), 'Places people want with nothing live yet', gaps.length ? 'warn' : '')}
          </div>
          <div class="mt">${CX.tabs([['people', 'People'], ['demand', 'Demand vs supply', gaps.length, true], ['audiences', 'Audiences', (c.segments || []).length], ['apa', 'APA conversations', a.episodes]], tab)}</div>`;

        var body;
        if (tab === 'demand') {
          body = html`<p class="muted mt-s" style="font-size:13px;max-width:820px">Unique people searching for or viewing each place, against what is live there. Rows with nothing live are where to onboard next: the demand is already there, and each new provider gets a page that ranks the day they publish.</p>
            <div class="card flush mt"><table class="tbl"><thead><tr><th>Place</th><th>Service</th><th class="num">People</th><th class="num">Searches</th><th class="num">Views</th><th class="num">Live supply</th><th></th></tr></thead><tbody>${demand.map(function (d) {
              var gap = n(d.supply) === 0;
              return html`<tr><td><b>${human(d.place)}</b></td><td>${human(d.service)}</td><td class="num"><b>${num(d.people)}</b></td><td class="num">${num(d.searches)}</td><td class="num">${num(d.views)}</td>
                <td class="num ${gap ? 'bad-t' : ''}">${gap ? 'none' : num(d.supply)}</td><td>${gap ? CX.pill('onboard here', 'p-warn') : ''}</td></tr>`;
            })}</tbody></table>${demand.length ? '' : CX.empty('No demand recorded yet', 'Fills as people search and browse.', 'map')}</div>`;
        } else if (tab === 'audiences') {
          var segs = (c.segments || []).filter(function (s) { return !(meta[s.id] && meta[s.id].internal); });
          var internal = (c.segments || []).filter(function (s) { return meta[s.id] && meta[s.id].internal; });
          body = html`<p class="muted mt-s" style="font-size:13px;max-width:820px">Audiences advertisers can buy, sized from real behaviour in the window. "Ad-ready" counts only people whose choices allow advertising use. Advertisers see these counts and descriptions, never who is in them.</p>
            <div class="card flush mt"><table class="tbl"><thead><tr><th>Audience</th><th class="num">People</th><th class="num">Ad-ready</th></tr></thead><tbody>${segs.map(function (s) {
              var m = meta[s.id] || {};
              return html`<tr><td><div class="t-main">${m.label || human(s.id)} <span class="tag">${m.category || ''}</span></div><div class="t-sub" style="white-space:normal">${m.why || ''}</div></td><td class="num"><b>${num(s.people)}</b></td><td class="num">${num(s.ads_ready)}</td></tr>`;
            })}</tbody></table>${segs.length ? '' : CX.empty('No audiences yet')}</div>
            ${internal.length ? html`<div class="section-t"><div><h2>For the partner team</h2><p>Not sold. People who looked at listing and hosting pages: the warmest onboarding leads Cabana has.</p></div></div>
              <div class="grid g3">${internal.map(function (s) { return kpi('building', (meta[s.id] || {}).label || human(s.id), num(s.people), (meta[s.id] || {}).why || ''); })}</div>` : ''}`;
        } else if (tab === 'apa') {
          var th = a.threads || {};
          body = html`<div class="grid g4 mt">${kpi('message', 'Conversations', num(a.episodes), 'Finished in the window')}
              ${kpi('checkCircle', 'Solved by APA', th.total ? Math.round(n(th.apa_resolved) / n(th.total) * 100) + '%' : '—', num(th.apa_resolved) + ' of ' + num(th.total) + ' threads')}
              ${kpi('lifebuoy', 'Handed to the team', th.total ? Math.round(n(th.escalated) / n(th.total) * 100) + '%' : '—', num(th.escalated) + ' escalations', n(th.escalated) / Math.max(1, n(th.total)) > 0.3 ? 'warn' : '')}
              ${kpi('star', 'Satisfaction', th.csat_avg ? th.csat_avg + ' / 5' : '—', 'From guests who rated')}</div>
            <div class="split mt"><div class="card"><div class="card-t mb">What they talk about</div>${CX.hbars(dist(a.topics))}</div><div class="card"><div class="card-t mb">How conversations end</div>${CX.hbars(objDist(a.outcomes), null, 'var(--teal)')}</div></div>
            <div class="section-t"><div><h2>Latest conversations</h2><p>APA's own note at the end of each one. The full transcripts are in the support desk.</p></div></div>
            <div class="list card flush">${(a.recent || []).map(function (e) {
              return html`<div class="li"><div class="li-b"><div class="li-t">${e.summary || '—'}</div><div class="li-s">${e.topic || 'general'} · ${num(e.turns)} message(s) · ${e.member ? 'member' : 'visitor'} · ${ago(e.ended_at)}</div></div><div class="li-r">${CX.pill(e.outcome || 'open')}</div></div>`;
            })}${(a.recent || []).length ? '' : CX.empty('No finished conversations yet')}</div>`;
        } else {
          var funnelSteps = LIFECYCLE.map(function (l) { return { label: l[1], value: n(lifecycle[l[0]]) }; }).filter(function (s, i) { return i < 4 || s.value; });
          var hours = c.hours || [], hmax = Math.max.apply(null, hours.map(function (h) { return n(h.count); }).concat([1]));
          var byH = {}; hours.forEach(function (h) { byH[h.h] = n(h.count); });
          body = html`<div class="split mt"><div class="card"><div class="card-t mb">Where people are in the journey</div>${CX.funnel(funnelSteps)}</div>
              <div class="card"><div class="card-t mb">Where they browse from</div>${CX.hbars(objDist(c.origin))}<div class="mt">${CX.hbars(dist(c.countries).slice(0, 8), null, 'var(--info)')}</div></div></div>
            <div class="grid g3 mt"><div class="card"><div class="card-t mb">What they want</div>${CX.hbars(dist(c.services))}</div><div class="card"><div class="card-t mb">Budget per night</div>${CX.hbars(dist(c.budget), null, 'var(--c3)')}</div><div class="card"><div class="card-t mb">Trip type</div>${CX.hbars(dist(c.purpose), null, 'var(--teal)')}</div></div>
            <div class="card mt"><div class="card-hd"><div><div class="card-t">When they are on Cabana</div><div class="card-s">Activity by hour, Nairobi time</div></div></div>
              <div class="heat">${Array.from({ length: 24 }, function (_, i) { var x = byH[i] || 0; return html`<i title="${i}:00 · ${num(x)}" style="opacity:${(0.08 + 0.92 * x / hmax).toFixed(2)}"></i>`; })}</div></div>
            <div class="section-t"><div><h2>Closest to booking</h2><p>Anonymous unless they have signed in. Open one to see the whole picture.</p></div></div>
            <div class="card flush"><table class="tbl"><thead><tr><th>Who</th><th>Wants</th><th>Stage</th><th class="num">Intent</th><th>Seen</th></tr></thead><tbody>${(c.hot || []).map(function (h) {
              return html`<tr class="click" data-profile="${h.id}"><td><div class="t-main">${h.member ? 'Member' : 'Visitor'} · ${h.city || h.country || 'unknown'}</div><div class="t-sub">${h.device || ''} · ${String(h.id).slice(0, 8)}</div></td>
                <td><div class="t-main">${human(h.top_service || '—')}${h.top_place ? ' in ' + human(h.top_place) : ''}</div><div class="t-sub">${h.budget ? human(h.budget) + ' a night' : ''}</div></td>
                <td>${CX.pill(h.lifecycle)}</td><td class="num"><b>${num(h.intent)}</b></td><td class="t-sub">${ago(h.last_seen)}</td></tr>`;
            })}</tbody></table>${(c.hot || []).length ? '' : CX.empty('Nobody near booking right now')}</div>`;
        }
        set(v.el, html`${head}${body}`);
        wireTabs(v, 'people');
        on(v.el, '[data-days]', 'click', function (el) { v.setQ({ days: el.getAttribute('data-days') === '30' ? null : el.getAttribute('data-days') }); v.refresh(); });
        on(v.el, '[data-profile]', 'click', function (el) { openProfile(el.getAttribute('data-profile'), meta); });
        on(v.el, '[data-kit]', 'click', function () { CX.copy(mediaKit(c, meta, days), 'Audience media kit'); });
      });
    }
  });

  function mediaKit(c, meta, days) {
    var t = c.totals || {};
    var lines = ['CABANA AUDIENCES · last ' + days + ' days', '', 'People active: ' + num(t.active) + ' · signed-in members: ' + num(t.members), ''];
    (c.segments || []).filter(function (s) { return !(meta[s.id] && meta[s.id].internal); }).forEach(function (s) {
      var m = meta[s.id] || {};
      lines.push('• ' + (m.label || s.id) + ': ' + num(s.ads_ready) + ' ad-ready (' + num(s.people) + ' total). ' + (m.why || ''));
    });
    lines.push('', 'Where they browse from: ' + Object.keys(c.origin || {}).map(function (k) { return human(k) + ' ' + num(c.origin[k]); }).join(', '));
    lines.push('Top countries: ' + (c.countries || []).slice(0, 6).map(function (x) { return x.key + ' ' + num(x.count); }).join(', '));
    lines.push('', 'Audiences are sized from first-party behaviour on cabana.africa. Individuals are never shared.');
    return lines.join('\n');
  }

  function openProfile(id, meta) {
    CX.drawer.open({ key: 'compass:' + id, kicker: 'Intelligence', title: 'Profile', sub: String(id).slice(0, 8), wide: true, load: function (d) {
      return rpc('admin_compass_profile', { p_id: id }).then(function (r) {
        if (!d.alive()) return;
        var p = (r && r.profile) || {}, tr = p.traits || {};
        var segs = (p.segments || []).map(function (s) { return (meta[s] || {}).label || human(s); });
        d.set(p.user_id ? 'Member profile' : 'Visitor profile', [p.city, p.country].filter(Boolean).join(', ') || String(id).slice(0, 8));
        set(d.body, html`<div class="grid g2">${kpi('zap', 'Intent', num(p.intent), human(p.lifecycle || ''))}${kpi('clock', 'Sessions', num(p.sessions), 'Since ' + fdt(p.first_seen))}</div>
          <div class="card mt"><div class="card-t mb">What their browsing shows</div>${CX.kv([
            ['Looking for', (tr.services || []).map(human).join(', ')], ['Places', (tr.places || tr.cities || []).map(human).join(', ')],
            ['Budget', tr.budget_usd ? 'about US$' + Math.round(tr.budget_usd) + ' a night' : null], ['Party', tr.party ? tr.party + ' people' : null],
            ['Trip type', tr.purpose ? human(tr.purpose) : null], ['From', [p.city, p.country].filter(Boolean).join(', ') + (tr.origin ? ' (' + tr.origin + ')' : '')],
            ['Plans', tr.planner ? human(tr.planner) : null], ['Rhythm', tr.rhythm ? human(tr.rhythm) : null], ['Device', [p.device, p.os, p.browser].filter(Boolean).join(' · ')],
            ['Advertising', p.consent && p.consent.ads ? 'allowed' : 'not allowed'], ['Audiences', segs.join(', ')]])}</div>
          <div class="card mt"><div class="card-t mb">Recently</div>${(p.recent || []).length ? html`<div class="list">${p.recent.slice(0, 10).map(function (x) { return html`<div class="li"><div class="li-b"><div class="li-t">${x.t || x.id}</div><div class="li-s">${human(x.type || '')} · ${ago(x.at)}</div></div>${x.path ? html`<a class="link-btn" href="${x.path}" target="_blank" rel="noopener">${icon('external')}</a>` : ''}</div>`; })}</div>` : CX.empty('Nothing yet')}</div>
          <div class="card mt"><div class="card-t mb">APA conversations</div>${((r && r.episodes) || []).length ? html`<div class="list">${r.episodes.map(function (e) { return html`<div class="li"><div class="li-b"><div class="li-t">${e.summary || '—'}</div><div class="li-s">${ago(e.ended_at)} · ${e.outcome || ''}</div></div></div>`; })}</div>` : CX.empty('No conversations')}</div>
          <details class="more mt"><summary>Events</summary><div class="card mt-s flush"><table class="tbl"><tbody>${((r && r.events) || []).map(function (e) { return html`<tr><td class="t-sub">${fdt(e.created_at)}</td><td>${human(e.type)}</td><td class="t-sub">${[e.service, e.place].filter(Boolean).map(human).join(' · ')}</td></tr>`; })}</tbody></table></div></details>`);
      });
    } });
  }
})(window);
