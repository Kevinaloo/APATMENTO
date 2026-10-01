/* ═══════════════════════════════════════════════════════════════════
   CABANA · TOURS — admin module
   ───────────────────────────────────────────────────────────────────
   Runs inside admin.html. Reuses the admin's own components (.card,
   .btn, .tabs, .inp, .pill) so it looks native rather than bolted on.

   The jobs:
     · moderate what operators submit  (pending → published / rejected)
     · publish Cabana's own tours      (created straight to published)
     · apply or decline changes guides propose to live tours
     · run the Marquee at the top of /tours: review paid slots, feature
       tours for free, pause or end anything, set prices, rotation,
       how many slots and which automatic sources run
     · keep the places (photo, words, map position, matching words) and
       re-match tours to them
     · see where travellers are waiting (alerts), and handle requests
       to film tours in 360°
     · write the page around the tours (Page tab, in
       cabana-tours-page-admin.js): cover, Cabana slots, sections,
       categories and collections

   Writes are gated by RLS on is_admin(), so a non-admin reaching this
   file gets nothing. The UI gate is a convenience, not the security.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var sb = null;
  var state = { tab: 'pending', tours: [], operators: [], editing: null, spots: null, spotSettings: null,
    places: null, changes: null, films: null, demand: null, worlds: null, placeEdit: null };
  var adminMedia = null;

  function client() {
    if (sb) return sb;
    sb = window.sb || (window.supabase && window.__sbClient) || null;
    return sb;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(id) { return document.getElementById(id); }
  function arr(v) {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string' && v.trim()) {
      try { var p = JSON.parse(v); if (Array.isArray(p)) return p; } catch (e) {}
      return v.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
    }
    return [];
  }
  function money(n) { return 'KES ' + (Number(n) || 0).toLocaleString('en-KE'); }
  function toast(m) {
    if (typeof window.toast === 'function') { window.toast(m); return; }
    var t = $('toast'); if (!t) { console.log(m); return; }
    t.textContent = m; t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 2800);
  }

  var STATUS_PILL = {
    pending:   'p-warn',
    published: 'p-ok',
    draft:     'p-mute',
    rejected:  'p-bad',
    paused:    'p-info',
    archived:  'p-mute'
  };

  /* ── load ────────────────────────────────────────────────────────── */

  function load() {
    var c = client();
    if (!c) { render(); return; }
    var hostEl = document.getElementById('s-tours');
    if (hostEl && !hostEl.dataset.ready) {
      hostEl.innerHTML = '<div class="hd"><div><div class="skel" style="height:26px;width:180px"></div>' +
        '<div class="skel" style="height:14px;width:360px;margin-top:10px"></div></div></div>' +
        '<div class="card"><div class="skel" style="height:64px"></div></div>'.repeat(3);
    }

    c.from('tours').select('*').order('created_at', { ascending: false })
      .then(function (r) {
        if (r && r.error && hostEl && !hostEl.dataset.ready) {
          hostEl.innerHTML = '<div class="card"><div class="empty"><div class="empty-t">Could not load this desk</div>' +
            '<div class="empty-s">' + String(r.error.message || '').replace(/[&<>"']/g, '') + '</div></div></div>';
          return;
        }
        state.tours = (r && r.data) || [];
        if (hostEl) hostEl.dataset.ready = '1';
        render();
      }, function () { render(); });

    /* Operator contacts are not readable column by column any more; the
       console reads them through its own guarded function. */
    c.rpc('admin_tour_operators')
      .then(function (r) { state.operators = (r && r.data) || []; renderOps(); }, function () {});
    loadSpots(); loadPlaces(); loadChanges(); loadFilms();
  }
  function loadPlaces() {
    var c = client(); if (!c) return;
    c.from('tour_places').select('*').order('position', { ascending: true }).then(function (r) {
      state.places = (r && r.data) || [];
      if (state.tab === 'places') render(); else paintTabCounts();
    }, function () { state.places = []; });
  }
  function loadChanges() {
    var c = client(); if (!c) return;
    c.rpc('admin_tour_changes').then(function (r) {
      state.changes = (r && r.data) || [];
      if (state.tab === 'changes') render(); else paintTabCounts();
    }, function () { state.changes = []; });
  }
  function loadFilms() {
    var c = client(); if (!c) return;
    c.rpc('admin_tour_immersive_requests').then(function (r) {
      state.films = (r && r.data) || [];
      if (state.tab === 'film') render(); else paintTabCounts();
    }, function () { state.films = []; });
  }
  function loadDemand() {
    var c = client(); if (!c) return;
    c.rpc('admin_tour_demand').then(function (r) {
      state.demand = (r && r.data) || { places: [], kinds: [], recent: [], total: 0 };
      if (state.tab === 'demand') render();
    }, function () { state.demand = { places: [], kinds: [], recent: [], total: 0 }; if (state.tab === 'demand') render(); });
  }
  function loadWorlds() {
    var c = client(); if (!c || state.worlds) return;
    c.from('immersive_experiences').select('id,slug,title,status,tour_id').order('created_at', { ascending: false }).limit(200).then(function (r) {
      state.worlds = (r && r.data) || [];
      if (state.tab === 'film') render();
    }, function () { state.worlds = []; });
  }
  function paintTabCounts() {
    var tabs = document.getElementById('tr-tabs'); if (!tabs) return;
    var n = tabCount();
    tabs.querySelectorAll('[data-tab]').forEach(function (b) {
      var k = b.getAttribute('data-tab'), m = b.querySelector('.mono');
      if (m && n[k] !== undefined && n[k] !== '') m.textContent = n[k];
    });
  }
  function loadSpots() {
    var c = client(); if (!c) return;
    c.rpc('admin_tour_spotlights').then(function (r) {
      state.spots = (r && r.data) || [];
      if (state.tab === 'spotlight') render(); else paintSpotCount();
    }, function () { state.spots = []; });
    c.from('tour_spotlight_settings').select('*').limit(1).then(function (r) {
      state.spotSettings = r && r.data && r.data[0];
      if (state.tab === 'spotlight') render();
    }, function () {});
  }
  function paintSpotCount() { paintTabCounts(); }
  function spotLive(tourId) {
    return (state.spots || []).some(function (s) {
      return s.live && String(s.tour_id) === String(tourId);
    });
  }
  function spotReview() { return (state.spots || []).filter(function (s) { return s.status === 'in_review'; }); }

  /* ── moderation actions ──────────────────────────────────────────── */

  function setStatus(id, status, note) {
    var c = client(); if (!c) return;
    // pause_sig marks a pause the guide made (and can undo). Anything the
    // console does clears it: a tour Cabana pauses stays paused until
    // Cabana says otherwise.
    var patch = { status: status, reviewed_at: new Date().toISOString(), pause_sig: null };
    if (note != null) patch.review_note = note;

    c.from('tours').update(patch).eq('id', id).then(function (r) {
      if (r && r.error) { toast('Could not update: ' + r.error.message); return; }
      toast(status === 'published' ? 'Published' :
            status === 'rejected'  ? 'Rejected' :
            status === 'paused'    ? 'Paused' : 'Updated');
      load();
    }, function (e) { toast('Could not update: ' + (e && e.message || 'unknown')); });
  }

  /* Delete is a soft delete: the row keeps its evidence and stops being
     served. Purging for good is done from the service catalogue, which
     is the one place that asks for a written reason first. */
  function remove(id) {
    var t = state.tours.filter(function (x) { return String(x.id) === String(id); })[0];
    var name = (t && t.title) || 'this tour';
    if (!window.confirm('Delete ' + name + '?\n\nIt comes off the site immediately and is archived, so it stays recoverable.')) return;

    var M = window.ApaAdmin && window.ApaAdmin.Moderate;
    var done = function (r) {
      if (r && r.ok === false) { toast('Could not delete: ' + r.error); return; }
      toast('Deleted'); load();
    };
    if (M) return M.remove('tours', id, false, 'Deleted from the tours panel', 'tour', null,
                           { deletedStatus: 'archived', hasDeletedAt: false })
             .then(done, function () { toast('Could not delete'); });

    var c = client(); if (!c) return;
    c.from('tours').update({ status: 'archived' }).eq('id', id)
      .then(function (r) { done(r && r.error ? { ok: false, error: r.error.message } : { ok: true }); },
            function () { toast('Could not delete'); });
  }

  function toggleFeatured(id, on) {
    var c = client(); if (!c) return;
    c.from('tours').update({ featured: !!on }).eq('id', id).then(function () {
      toast(on ? 'Featured' : 'Unfeatured'); load();
    }, function () { toast('Could not update'); });
  }

  function approveOperator(id, approve) {
    var c = client(); if (!c) return;
    c.from('tour_operators')
      .update({ status: approve ? 'approved' : 'rejected',
                verified: !!approve,
                verified_at: approve ? new Date().toISOString() : null })
      .eq('id', id)
      .then(function () { toast(approve ? 'Operator approved' : 'Operator rejected'); load(); },
            function () { toast('Could not update operator'); });
  }

  /* ── list ────────────────────────────────────────────────────────── */

  function counts() {
    var c = { pending: 0, published: 0, draft: 0, rejected: 0, paused: 0 };
    state.tours.forEach(function (t) { if (c[t.status] != null) c[t.status]++; });
    return c;
  }

  function rowHTML(t) {
    var op = state.operators.filter(function (o) { return o.id === t.operator_id; })[0];
    var house = op && op.kind === 'cabana';
    var acts = '';

    if (t.status === 'pending' || t.status === 'draft') {
      acts += '<button class="btn btn-ok btn-sm" data-act="publish" data-id="' + t.id + '">Publish</button>' +
              '<button class="btn btn-d btn-sm" data-act="reject" data-id="' + t.id + '">Reject</button>';
    } else if (t.status === 'published') {
      acts += '<button class="btn btn-g btn-sm" data-act="pause" data-id="' + t.id + '">Pause</button>' +
              '<button class="btn btn-g btn-sm" data-act="feature" data-id="' + t.id + '">' +
              (t.featured ? 'Unfeature' : 'Feature') + '</button>';
    } else if (t.status === 'paused' || t.status === 'rejected') {
      acts += '<button class="btn btn-ok btn-sm" data-act="publish" data-id="' + t.id + '">Publish</button>';
    }
    acts += '<button class="btn btn-g btn-sm" data-act="edit" data-id="' + t.id + '">Edit</button>';
    acts += '<button class="btn btn-d btn-sm" data-act="delete" data-id="' + t.id + '">Delete</button>';

    var place = (state.places || []).filter(function (p) { return p.id === t.place_id; })[0];
    return '<tr>' +
      '<td><div class="t-main">' + esc(t.title) +
        (t.featured ? ' <span class="pill p-info">Featured</span>' : '') +
        (spotLive(t.id) ? ' <span class="pill p-ok">In the Marquee</span>' : '') +
        (t.status === 'paused' ? ' <span class="pill p-mute">' + (t.pause_sig ? 'Paused by the guide' : 'Paused by Cabana') + '</span>' : '') + '</div>' +
        '<div class="t-sub">' + esc(t.destination || t.county || '—') + ' · ' +
        esc(t.duration_label || (t.days + ' day' + (t.days === 1 ? '' : 's'))) +
        (place ? ' · ' + esc(place.name) + (t.place_auto === false ? ' (pinned)' : '') : ' · no place') + '</div></td>' +
      '<td>' + (house ? '<span class="pill p-ok">Cabana</span>' :
                esc((op && op.name) || 'Unassigned')) + '</td>' +
      '<td class="mono">' + (Number(t.price_kes) === 0 ? 'Free' : money(t.price_kes)) + '</td>' +
      '<td><span class="pill ' + (STATUS_PILL[t.status] || 'p-mute') + '">' + esc(t.status) + '</span></td>' +
      '<td class="t-act">' + acts + '</td>' +
    '</tr>';
  }

  var TAB_LABEL = { pending: 'Pending', published: 'Published', paused: 'Paused', draft: 'Draft', rejected: 'Rejected', changes: 'Changes',
    spotlight: 'Marquee', places: 'Places', demand: 'Demand', film: '360° filming', page: 'Page', all: 'All' };
  var TAB_ORDER = ['pending', 'changes', 'published', 'paused', 'draft', 'rejected', 'spotlight', 'places', 'demand', 'film', 'page', 'all'];
  function tabCount() {
    var c = counts();
    return {
      pending: c.pending || 0, published: c.published || 0, paused: c.paused || 0, draft: c.draft || 0, rejected: c.rejected || 0,
      changes: (state.changes || []).length, spotlight: spotReview().length,
      places: state.places ? state.places.length : '', demand: '', page: '', all: state.tours.length,
      film: (state.films || []).filter(function (f) { return f.status === 'new'; }).length
    };
  }
  function tabsHTML() {
    var n = tabCount();
    return '<div class="tabs" id="tr-tabs">' +
      TAB_ORDER.map(function (k) {
        return '<button class="tab' + (state.tab === k ? ' on' : '') + '" data-tab="' + k + '">' + TAB_LABEL[k] +
               (n[k] === '' || n[k] == null ? '' : ' <span class="mono">' + n[k] + '</span>') + '</button>';
      }).join('') + '</div>';
  }
  function wireTabs(host) {
    host.querySelectorAll('[data-tab]').forEach(function (b) {
      b.addEventListener('click', function () { state.tab = b.getAttribute('data-tab'); render(); });
    });
  }

  /* The page itself: cover, Cabana's slides, sections, categories and
     collections. The editor lives in cabana-tours-page-admin.js. */
  function renderPageTab() {
    var host = $('s-tours'); if (!host) return;
    host.innerHTML =
      '<div class="hd"><div><div class="card-t">The tours page</div>' +
        '<div class="card-s">What travellers see at cabana.africa/tours around the tours themselves: the cover and search bar, Cabana’s own Marquee slots, and every section below. Saving is live.</div></div>' +
        '<div class="hd-act"><a class="btn btn-g" href="/tours" target="_blank" rel="noopener">Open the page ↗</a></div></div>' +
      tabsHTML() + '<div id="tp-root"></div>';
    wireTabs(host);
    if (window.CabanaToursPage) window.CabanaToursPage.mount($('tp-root'));
    else $('tp-root').innerHTML = '<div class="card"><div class="empty"><div class="empty-t">The page editor did not load</div><div class="empty-s">Reload the console and try again.</div></div></div>';
  }

  function render() {
    var host = $('s-tours');
    if (!host) return;

    if (state.tab === 'spotlight') { renderSpotTab(); return; }
    if (state.tab === 'page') { renderPageTab(); return; }
    if (state.tab === 'places') { renderPlacesTab(); return; }
    if (state.tab === 'changes') { renderChangesTab(); return; }
    if (state.tab === 'demand') { renderDemandTab(); if (state.demand == null) loadDemand(); return; }
    if (state.tab === 'film') { renderFilmTab(); loadWorlds(); return; }

    var list = state.tours.filter(function (t) {
      return state.tab === 'all' ? true : t.status === state.tab;
    });

    host.innerHTML =
      '<div class="hd"><div><div class="card-t">Tours</div>' +
        '<div class="card-s">Everything listed on cabana.africa/tours. Operators submit; you decide what goes live.</div></div>' +
        '<div class="hd-act"><button class="btn btn-p" id="tr-new">+ New Cabana tour</button></div>' +
      '</div>' +

      tabsHTML() +

      '<div class="card"><table class="tbl"><thead><tr>' +
        '<th>Tour</th><th>Operator</th><th>Price</th><th>Status</th><th></th>' +
      '</tr></thead><tbody>' +
        (list.length ? list.map(rowHTML).join('') :
          '<tr><td colspan="5"><div class="empty"><div class="empty-t">Nothing ' +
          esc(state.tab === 'all' ? 'listed yet' : state.tab) + '</div>' +
          '<div class="empty-s">' +
          (state.tab === 'pending'
            ? 'Submissions from operators land here for review.'
            : 'Use “New Cabana tour” to publish one of your own.') +
          '</div></div></td></tr>') +
      '</tbody></table></div>' +

      '<div id="tr-ops"></div>' +
      '<div id="tr-form"></div>';

    wireTabs(host);
    host.querySelectorAll('[data-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-id'), act = b.getAttribute('data-act');
        if (act === 'publish') setStatus(id, 'published');
        if (act === 'pause')   setStatus(id, 'paused');
        if (act === 'reject') {
          var why = window.prompt('Why is this being rejected? The operator will see this.');
          if (why !== null) setStatus(id, 'rejected', why);
        }
        if (act === 'feature') {
          var t = state.tours.filter(function (x) { return String(x.id) === String(id); })[0];
          toggleFeatured(id, !(t && t.featured));
        }
        if (act === 'edit') openForm(id);
        if (act === 'delete') remove(id);
      });
    });
    var nb = $('tr-new');
    if (nb) nb.addEventListener('click', function () { openForm(null); });

    renderOps();
  }

  /* ── the Marquee desk ────────────────────────────────────────────── */
  var SPOT_PILL = { in_review: 'p-warn', approved: 'p-ok', paused: 'p-info', pending_payment: 'p-mute', rejected: 'p-bad', ended: 'p-mute', draft: 'p-mute' };
  function when(iso) { try { return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }); } catch (e) { return ''; } }
  function spotThumb(s) {
    var src = s.media_kind === 'youtube' ? 'https://i.ytimg.com/vi/' + s.media_url + '/mqdefault.jpg' : (s.poster_url || (s.media_kind === 'image' ? s.media_url : ''));
    if (!src) return '<div style="width:112px;height:64px;border-radius:10px;background:linear-gradient(115deg,#12E0D0,#3B5BFF,#B98CFF,#FF6FA8);display:flex;align-items:center;justify-content:center;color:#07061A;font:700 10px Inter;text-transform:uppercase;letter-spacing:.1em">' + esc(s.art || s.media_kind) + '</div>';
    return '<a href="' + esc(s.media_kind === 'youtube' ? 'https://youtu.be/' + s.media_url : s.media_url) + '" target="_blank" rel="noopener"><img src="' + esc(src) + '" alt="" style="width:112px;height:64px;object-fit:cover;border-radius:10px;display:block"/></a>';
  }
  function spotRow(s) {
    var acts = '';
    if (s.status === 'in_review') acts = '<button class="btn btn-ok btn-sm" data-spa="approve" data-id="' + s.id + '">Approve</button><button class="btn btn-d btn-sm" data-spa="reject" data-id="' + s.id + '">Reject</button>';
    else if (s.status === 'approved') acts = '<button class="btn btn-g btn-sm" data-spa="pause" data-id="' + s.id + '">Pause</button><button class="btn btn-d btn-sm" data-spa="end" data-id="' + s.id + '">End</button>';
    else if (s.status === 'paused') acts = '<button class="btn btn-ok btn-sm" data-spa="resume" data-id="' + s.id + '">Resume</button><button class="btn btn-d btn-sm" data-spa="end" data-id="' + s.id + '">End</button>';
    else if (s.status === 'rejected') acts = '<button class="btn btn-g btn-sm" data-spa="approve" data-id="' + s.id + '">Approve after all</button>';
    var ctr = s.impressions ? (Math.round(s.clicks / s.impressions * 1000) / 10) + '%' : '—';
    return '<tr><td style="width:128px">' + spotThumb(s) + '</td>' +
      '<td><div class="t-main">' + esc(String(s.headline || '').replace(/\*/g, '')) + (s.live ? ' <span class="pill p-ok">Live</span>' : '') +
          (s.label ? ' <span class="pill p-info">' + esc(s.label) + '</span>' : '') +
          (s.device && s.device !== 'all' ? ' <span class="pill p-mute">' + (s.device === 'phone' ? 'Phones only' : 'Computers only') + '</span>' : '') +
          (s.world_slug ? ' <span class="pill p-mute">360° · ' + esc(s.world_slug) + '</span>' : '') + '</div>' +
        '<div class="t-sub">' + esc([s.kind === 'sponsored' ? (s.operator || s.buyer || 'Sponsored') : s.kind === 'tour' ? 'Featured by Cabana' : 'Cabana', s.tour, s.kicker].filter(Boolean).join(' · ')) + '</div>' +
        (s.subline ? '<div class="t-sub" style="max-width:560px">' + esc(s.subline) + '</div>' : '') +
        (s.review_note ? '<div class="t-sub" style="color:#B26A00">Note: ' + esc(s.review_note) + '</div>' : '') + '</td>' +
      '<td><div class="mono">' + esc(when(s.starts_at)) + ' → ' + esc(when(s.ends_at)) + '</div><div class="t-sub">' + esc(s.package || s.kind) + '</div></td>' +
      '<td class="mono">' + (s.kind === 'sponsored' ? money(s.amount_paid) + ' / ' + money(s.grand_total) + (Number(s.credited) > 0 ? '<div class="t-sub">' + money(s.credited) + ' credited</div>' : '') : '—') + '</td>' +
      '<td class="mono">' + (s.impressions || 0) + ' · ' + (s.clicks || 0) + '<div class="t-sub">tap rate ' + ctr + '</div></td>' +
      '<td><span class="pill ' + (SPOT_PILL[s.status] || 'p-mute') + '">' + esc(String(s.status).replace('_', ' ')) + '</span></td>' +
      '<td class="t-act">' + acts + '</td></tr>';
  }
  function spotTable(title, sub, list, empty) {
    return '<div class="card flush" style="margin-top:18px;"><div class="card-hd"><div><div class="card-t">' + title + ' <span class="mono">' + list.length + '</span></div>' +
      (sub ? '<div class="card-s">' + sub + '</div>' : '') + '</div></div>' +
      '<table class="tbl"><thead><tr><th></th><th>Slide</th><th>Window</th><th>Paid</th><th>Views · taps</th><th>Status</th><th></th></tr></thead><tbody>' +
      (list.length ? list.map(spotRow).join('') : '<tr><td colspan="7"><div class="empty"><div class="empty-s">' + empty + '</div></div></td></tr>') +
      '</tbody></table></div>';
  }
  function renderSpotTab() {
    var host = $('s-tours'); if (!host) return;
    var all = state.spots || [], st = state.spotSettings || {}, P = st.prices || {};
    var review = all.filter(function (s) { return s.status === 'in_review'; });
    var running = all.filter(function (s) { return s.status === 'approved' || s.status === 'paused'; });
    var other = all.filter(function (s) { return ['rejected', 'ended', 'pending_payment'].indexOf(s.status) !== -1; }).slice(0, 30);
    var published = state.tours.filter(function (t) { return t.status === 'published'; });
    host.innerHTML =
      '<div class="hd"><div><div class="card-t">The Marquee</div>' +
        '<div class="card-s">The premium slots at the top of cabana.africa/tours. In order: sponsored slots guides and operators paid for (they wait here for a yes or no; approving a late one moves its dates so they lose no days, and refusing a paid one turns the payment into Cabana credit), ads booked on the tours.marquee placement in Advertising, tours Cabana features, departures leaving soonest, the newest 360° world, then Cabana’s own slots, made under Page.</div></div>' +
        '<div class="hd-act"><button class="btn btn-p" id="tr-new">+ New Cabana tour</button></div></div>' +
      tabsHTML() +
      (state.spots == null ? '<div class="card"><div class="skel" style="height:64px"></div></div>' :
        spotTable('Waiting for review', 'Paid in full. Check the media, the words and the tour, then decide.', review, 'Nothing waiting. Paid slots land here.') +
        spotTable('Running and paused', '', running, 'Nothing running.') +
        '<div class="card" style="margin-top:18px;"><div class="card-t">Feature a tour for free</div><div class="card-s">Puts a published tour in the Marquee as a Cabana pick, after sponsored slots and ads, for 30 days. The tour needs a photo.</div>' +
          '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:10px"><select class="inp" id="sp-tour" style="min-width:280px">' +
          published.map(function (t) { return '<option value="' + t.id + '">' + esc(t.title) + '</option>'; }).join('') + '</select>' +
          '<button class="btn btn-p btn-sm" id="sp-feature"' + (published.length ? '' : ' disabled') + '>Feature it</button></div></div>' +
        '<div class="card" style="margin-top:18px;"><div class="card-t">How the Marquee runs</div><div class="card-s">Switching the Marquee off shows the cover instead; paid slots keep their days and come back when it is on again. Selling slots is separate: pausing sales never takes a paid slot down.</div>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px;margin-top:10px">' +
            '<label class="t-sub" style="display:flex;align-items:center;gap:8px;margin-top:18px"><input type="checkbox" id="mq-on"' + (st.marquee_on === false ? '' : ' checked') + '/> Marquee on</label>' +
            '<label class="t-sub">Seconds per slot<input class="inp" type="number" min="4" max="20" id="mq-rot" value="' + esc(Math.round((st.rotate_ms || 7000) / 1000)) + '"/></label>' +
            '<label class="t-sub">Most slots at once<input class="inp" type="number" min="1" max="16" id="mq-max" value="' + esc(st.max_slides || 10) + '"/></label>' +
            '<label class="t-sub" style="display:flex;align-items:center;gap:8px;margin-top:18px"><input type="checkbox" id="mq-ads"' + (st.show_ads === false ? '' : ' checked') + '/> Ads booked on tours.marquee</label>' +
            '<label class="t-sub" style="display:flex;align-items:center;gap:8px;margin-top:18px"><input type="checkbox" id="mq-dep"' + (st.auto_departures === false ? '' : ' checked') + '/> Departures leaving soon</label>' +
            '<label class="t-sub" style="display:flex;align-items:center;gap:8px;margin-top:18px"><input type="checkbox" id="mq-world"' + (st.auto_world === false ? '' : ' checked') + '/> The newest 360° world</label>' +
          '</div></div>' +
        '<div class="card" style="margin-top:18px;"><div class="card-t">Prices and limits</div><div class="card-s">What guides and operators pay for a slot, and how many sponsored slots may share a day.</div>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-top:10px">' +
            ['day', 'week', 'fortnight', 'month'].map(function (k) { return '<label class="t-sub">' + k + ' (KES)<input class="inp" type="number" min="0" data-price="' + k + '" value="' + esc(P[k] == null ? '' : P[k]) + '"/></label>'; }).join('') +
            '<label class="t-sub">Max sponsored a day<input class="inp" type="number" min="1" max="20" id="sp-max" value="' + esc(st.max_sponsored || 6) + '"/></label>' +
            '<label class="t-sub">Review within (hours)<input class="inp" type="number" min="1" max="168" id="sp-rh" value="' + esc(st.review_hours || 24) + '"/></label>' +
            '<label class="t-sub" style="display:flex;align-items:center;gap:8px;margin-top:18px"><input type="checkbox" id="sp-on"' + (st.enabled === false ? '' : ' checked') + '/> Selling slots</label>' +
          '</div><button class="btn btn-g btn-sm" id="sp-save" style="margin-top:12px">Save</button></div>' +
        spotTable('Recent history', 'Unpaid checkouts, refusals and ended slides.', other, 'Nothing yet.')) +
      '<div id="tr-ops"></div><div id="tr-form"></div>';
    wireTabs(host);
    host.querySelectorAll('[data-spa]').forEach(function (b) {
      b.addEventListener('click', function () {
        var act = b.getAttribute('data-spa'), note = null;
        if (act === 'reject') { note = window.prompt('What should they change? They will see this, and a paid slide becomes Cabana credit.'); if (note === null) return; }
        if (act === 'end' && !window.confirm('End this slide now?')) return;
        b.disabled = true;
        client().rpc('admin_tour_spotlight_decide', { p_id: b.getAttribute('data-id'), p_action: act, p_note: note }).then(function (r) {
          if (r && r.error) { toast(r.error.message); b.disabled = false; return; }
          toast({ approve: 'Approved: it is in the Marquee', reject: 'Refused and credited', pause: 'Paused', resume: 'Back on', end: 'Ended' }[act] || 'Done');
          loadSpots();
        }, function () { toast('Could not update'); b.disabled = false; });
      });
    });
    var fb = $('sp-feature');
    if (fb) fb.addEventListener('click', function () {
      var id = $('sp-tour').value, t = state.tours.filter(function (x) { return String(x.id) === String(id); })[0]; if (!t) return;
      var cover = t.cover_url || arr(t.photos)[0] || '';
      if (!cover && !t.showcase_video) { toast('Add a photo to this tour first. The Marquee never shows a tour without one.'); return; }
      fb.disabled = true;
      client().from('tour_spotlights').insert({
        kind: 'tour', status: 'approved', tour_id: t.id, operator_id: t.operator_id || null,
        media_kind: t.showcase_video ? 'video' : 'image', media_url: t.showcase_video || cover, poster_url: t.video_poster || cover || null,
        kicker: 'Featured by Cabana', headline: t.showcase_headline || t.title, subline: t.summary || null,
        starts_at: new Date().toISOString(), ends_at: new Date(Date.now() + 30 * 864e5).toISOString(), priority: 5
      }).then(function (r) { fb.disabled = false; if (r && r.error) toast(r.error.message); else { toast('Featured for 30 days'); loadSpots(); } }, function () { fb.disabled = false; toast('Could not feature'); });
    });
    var sv = $('sp-save');
    if (sv) sv.addEventListener('click', function () {
      var prices = {};
      host.querySelectorAll('[data-price]').forEach(function (i) { if (i.value !== '') prices[i.getAttribute('data-price')] = Math.max(0, Math.round(Number(i.value) || 0)); });
      client().from('tour_spotlight_settings').update({
        prices: prices, max_sponsored: Math.min(20, Math.max(1, Number($('sp-max').value) || 6)),
        review_hours: Math.min(168, Math.max(1, Number($('sp-rh').value) || 24)), enabled: $('sp-on').checked,
        marquee_on: $('mq-on').checked, rotate_ms: Math.min(20000, Math.max(4000, Math.round(Number($('mq-rot').value) || 7) * 1000)),
        max_slides: Math.min(16, Math.max(1, Number($('mq-max').value) || 10)), show_ads: $('mq-ads').checked,
        auto_departures: $('mq-dep').checked, auto_world: $('mq-world').checked, updated_at: new Date().toISOString()
      }).eq('id', 1).then(function (r) { if (r && r.error) toast(r.error.message); else { toast('Saved'); loadSpots(); } }, function () { toast('Could not save'); });
    });
    var nb = $('tr-new'); if (nb) nb.addEventListener('click', function () { openForm(null); });
    renderOps();
  }

  /* ── PLACES ─────────────────────────────────────────────────────────
     The destinations on /tours: photo, words, map position, and the
     words that tie a tour to them. Tours are matched automatically
     unless someone pins a place on the tour itself. */
  function placeCount(id) { return state.tours.filter(function (t) { return t.place_id === id && t.status === 'published'; }).length; }
  function renderPlacesTab() {
    var host = $('s-tours'); if (!host) return;
    var list = state.places || [];
    host.innerHTML =
      '<div class="hd"><div><div class="card-t">Places</div>' +
        '<div class="card-s">The destinations on the map at cabana.africa/tours. Each tour is matched to a place by the words in its destination, county, start point and title, first match wins; pin a place on a tour to override. Travellers can follow any enabled place and hear first when a tour opens there.</div></div>' +
        '<div class="hd-act"><button class="btn btn-g" id="pl-rematch">Re-match tours</button><button class="btn btn-p" id="pl-new">+ New place</button></div></div>' +
      tabsHTML() +
      '<div id="pl-form"></div>' +
      '<div class="card"><table class="tbl"><thead><tr><th></th><th>Place</th><th>Matching words</th><th>Map</th><th>Live tours</th><th>Status</th><th></th></tr></thead><tbody>' +
      (state.places == null ? '<tr><td colspan="7"><div class="skel" style="height:48px"></div></td></tr>' :
        list.length ? list.map(function (p) {
          return '<tr><td style="width:96px">' + (p.image ? '<img src="' + esc(p.image) + '" alt="" style="width:84px;height:56px;object-fit:cover;border-radius:10px;display:block"/>' : '') + '</td>' +
            '<td><div class="t-main">' + esc(p.name) + (p.featured ? ' <span class="pill p-info">Featured</span>' : '') + '</div><div class="t-sub">' + esc([p.country, p.region].filter(Boolean).join(' · ')) + '</div>' +
              (p.line ? '<div class="t-sub" style="max-width:420px">' + esc(p.line) + '</div>' : '') + '</td>' +
            '<td class="t-sub" style="max-width:260px">' + esc((p.terms || []).join(', ')) + '</td>' +
            '<td class="mono">' + (p.lat != null ? Number(p.lat).toFixed(3) + ', ' + Number(p.lng).toFixed(3) : '—') + '<div class="t-sub">position ' + esc(p.position) + '</div></td>' +
            '<td class="mono">' + placeCount(p.id) + '</td>' +
            '<td><span class="pill ' + (p.enabled ? 'p-ok' : 'p-mute') + '">' + (p.enabled ? 'On the page' : 'Hidden') + '</span></td>' +
            '<td class="t-act"><button class="btn btn-g btn-sm" data-pl="edit" data-id="' + esc(p.id) + '">Edit</button>' +
              '<button class="btn btn-g btn-sm" data-pl="toggle" data-id="' + esc(p.id) + '">' + (p.enabled ? 'Hide' : 'Show') + '</button></td></tr>';
        }).join('') : '<tr><td colspan="7"><div class="empty"><div class="empty-t">No places yet</div><div class="empty-s">Add the first one.</div></div></td></tr>') +
      '</tbody></table></div>';
    wireTabs(host);
    $('pl-new').addEventListener('click', function () { placeForm(null); });
    $('pl-rematch').addEventListener('click', function () {
      var b = this; b.disabled = true;
      client().rpc('admin_tour_places_rematch').then(function (r) {
        b.disabled = false;
        if (r && r.error) { toast(r.error.message); return; }
        toast((r.data && r.data.updated) ? r.data.updated + ' tours moved to a better place' : 'Every tour was already in the right place');
        load();
      }, function () { b.disabled = false; toast('Could not re-match'); });
    });
    host.querySelectorAll('[data-pl]').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = list.filter(function (x) { return x.id === b.getAttribute('data-id'); })[0]; if (!p) return;
        if (b.getAttribute('data-pl') === 'edit') { placeForm(p); return; }
        client().from('tour_places').update({ enabled: !p.enabled }).eq('id', p.id).then(function (r) {
          if (r && r.error) toast(r.error.message); else { toast(p.enabled ? 'Hidden from the page' : 'Back on the page'); loadPlaces(); }
        });
      });
    });
    if (state.placeEdit !== null) placeForm(state.placeEdit === 'new' ? null : list.filter(function (x) { return x.id === state.placeEdit; })[0] || null);
  }
  var placeMedia = null;
  function placeForm(p) {
    var host = $('pl-form'); if (!host) return;
    state.placeEdit = p ? p.id : 'new';
    host.innerHTML = '<div class="card" style="margin-bottom:18px" id="pl-card"><div class="card-t">' + (p ? 'Edit ' + esc(p.name) : 'New place') + '</div>' +
      '<div class="card-s">Words in the line are shown on the map card. Matching words are lower-case and whole words: "mara" matches "Maasai Mara", not "Tamarind".</div>' +
      '<form id="pl-f">' +
        '<div class="g4">' +
          field('Id (for links)', 'id', p && p.id, { ph: 'maasai-mara', hint: p ? 'fixed' : 'lower-case, dashes' }) +
          field('Name', 'name', p && p.name, { ph: 'Maasai Mara' }) +
          field('Country', 'country', p && p.country, { ph: 'Kenya' }) +
          field('Region', 'region', p && p.region, { ph: 'Narok' }) +
        '</div>' +
        field('Line (up to 180 characters)', 'line', p && p.line, { ph: 'The great migration from July to October…' }) +
        '<div class="g4">' +
          field('Latitude', 'lat', p && p.lat, { type: 'number', ph: '-1.4061' }) +
          field('Longitude', 'lng', p && p.lng, { type: 'number', ph: '35.0081' }) +
          field('Order on the page', 'position', p ? p.position : ((state.places || []).length + 1) * 10, { type: 'number' }) +
          field('Photo focus', 'focal', (p && p.focal) || '50% 50%', { ph: '50% 50%' }) +
        '</div>' +
        field('Matching words, comma separated', 'terms', p ? (p.terms || []).join(', ') : '', { ph: 'maasai mara, masai mara, mara, narok' }) +
        field('Photo', 'image', p && p.image, { ph: '/assets/tours/places/maasai-mara-1400.webp or https://…', hint: 'or upload below' }) +
        '<div class="fld"><div id="pl-media"></div></div>' +
        '<div class="g2">' + check('Featured', 'featured', p ? p.featured : false, 'shown first') + check('On the page', 'enabled', p ? p.enabled : true) + '</div>' +
        '<div class="hd-act" style="margin-top:12px"><button class="btn btn-p" type="submit">' + (p ? 'Save' : 'Add the place') + '</button><button class="btn btn-g" type="button" id="pl-cancel">Cancel</button></div>' +
      '</form></div>';
    if (p) host.querySelector('[name="id"]').readOnly = true;
    var mh = $('pl-media');
    placeMedia = mh && window.CabanaUploader ? window.CabanaUploader.mount(mh, { client: client(), folder: 'places', maxVideos: 0 }) : null;
    $('pl-cancel').addEventListener('click', function () { state.placeEdit = null; host.innerHTML = ''; placeMedia = null; });
    $('pl-f').addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(e.target), g = function (k) { var v = fd.get(k); return v == null ? '' : String(v).trim(); };
      var id = (p ? p.id : g('id').toLowerCase()).replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      if (!/^[a-z0-9][a-z0-9-]{1,47}$/.test(id)) { toast('The id needs letters or numbers, with dashes between words'); return; }
      if (g('name').length < 2) { toast('Give the place a name'); return; }
      if (placeMedia && placeMedia.busy && placeMedia.busy()) { toast('The photo is still uploading'); return; }
      var up = placeMedia && placeMedia.value ? placeMedia.value() : null;
      var num = function (k) { var v = g(k); return v === '' ? null : Number(v); };
      var row = {
        id: id, name: g('name'), country: g('country') || null, region: g('region') || null, line: g('line').slice(0, 180) || null,
        image: (up && (up.cover || (up.photos || [])[0])) || g('image') || null, focal: /^\d{1,3}% \d{1,3}%$/.test(g('focal')) ? g('focal') : '50% 50%',
        terms: g('terms').split(',').map(function (x) { return x.trim().toLowerCase(); }).filter(function (x) { return x.length >= 3; }),
        lat: num('lat'), lng: num('lng'), position: Math.round(num('position') || 100), featured: fd.get('featured') === '1', enabled: fd.get('enabled') === '1'
      };
      client().from('tour_places').upsert(row, { onConflict: 'id' }).then(function (r) {
        if (r && r.error) { toast(r.error.message); return; }
        toast(p ? 'Saved' : 'Added. Re-match tours to pull in any that belong here.');
        state.placeEdit = null; placeMedia = null; loadPlaces();
      }, function () { toast('Could not save'); });
    });
    var card = $('pl-card'); if (card && card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ── CHANGES TO LIVE TOURS ─────────────────────────────────────────
     A guide proposes; the tour stays exactly as it is until someone
     here applies the change. */
  var FIELD_LABEL = { title: 'Title', summary: 'Summary', description: 'Description', price_kes: 'Price', child_price_kes: 'Child price', deposit_pct: 'Deposit %',
    group_min: 'Smallest group', group_max: 'Largest group', duration_label: 'Length', days: 'Days', departure_time: 'Leaves at', departure_days: 'Days it runs',
    highlights: 'Highlights', includes_list: 'Included', excludes_list: 'Not included', cover_url: 'Cover', photos: 'Photos', itinerary: 'Itinerary', meeting_point: 'Meeting point' };
  function showVal(v) {
    if (v == null || v === '') return '<span class="t-sub">empty</span>';
    if (Array.isArray(v)) return v.length ? esc(v.map(function (x) { return typeof x === 'object' ? JSON.stringify(x) : x; }).join(' · ')) : '<span class="t-sub">empty</span>';
    if (typeof v === 'object') return esc(JSON.stringify(v));
    if (/^https?:\/\//.test(String(v))) return '<a href="' + esc(v) + '" target="_blank" rel="noopener">' + esc(String(v).split('/').pop()) + '</a>';
    return esc(v);
  }
  function renderChangesTab() {
    var host = $('s-tours'); if (!host) return;
    var list = state.changes || [];
    host.innerHTML =
      '<div class="hd"><div><div class="card-t">Changes to live tours</div>' +
        '<div class="card-s">Guides can’t edit a live tour directly. What they propose waits here; applying it updates the tour and tells them, declining tells them why.</div></div></div>' +
      tabsHTML() +
      (state.changes == null ? '<div class="card"><div class="skel" style="height:64px"></div></div>' :
        list.length ? list.map(function (c) {
          var keys = Object.keys(c.patch || {});
          return '<div class="card flush" style="margin-bottom:14px"><div class="card-hd"><div><div class="card-t">' + esc(c.tour || 'Tour') + '</div>' +
            '<div class="card-s">' + esc([c.operator, c.who, when(c.created_at)].filter(Boolean).join(' · ')) + (c.note ? ' · “' + esc(c.note) + '”' : '') + '</div></div></div>' +
            '<table class="tbl"><thead><tr><th>Field</th><th>Now</th><th>Proposed</th></tr></thead><tbody>' +
              keys.map(function (k) { return '<tr><td class="t-main">' + esc(FIELD_LABEL[k] || k) + '</td><td>' + showVal((c.current || {})[k]) + '</td><td><b>' + showVal(c.patch[k]) + '</b></td></tr>'; }).join('') +
            '</tbody></table>' +
            '<div class="card-f"><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-ok btn-sm" data-ch="apply" data-id="' + esc(c.id) + '">Apply</button>' +
              '<button class="btn btn-d btn-sm" data-ch="decline" data-id="' + esc(c.id) + '">Decline</button></div>' +
              '<a class="btn btn-g btn-sm" href="/tours?open=' + esc(c.tour_id) + '" target="_blank" rel="noopener">Open the tour ↗</a></div></div>';
        }).join('') : '<div class="card"><div class="empty"><div class="empty-t">Nothing waiting</div><div class="empty-s">When a guide proposes a change to a live tour, it lands here.</div></div></div>');
    wireTabs(host);
    host.querySelectorAll('[data-ch]').forEach(function (b) {
      b.addEventListener('click', function () {
        var act = b.getAttribute('data-ch'), note = null;
        if (act === 'decline') { note = window.prompt('Why not? The guide will see this.'); if (note === null) return; }
        b.disabled = true;
        client().rpc('admin_tour_change_decide', { p_id: b.getAttribute('data-id'), p_action: act, p_note: note }).then(function (r) {
          if (r && r.error) { toast(r.error.message); b.disabled = false; return; }
          toast(act === 'apply' ? 'Applied. The guide has been told.' : 'Declined. The guide has been told.');
          loadChanges(); load();
        }, function () { b.disabled = false; toast('Could not update'); });
      });
    });
  }

  /* ── DEMAND ─────────────────────────────────────────────────────── */
  var KIND_NAME = { 'day-safari': 'Day safaris', 'big-safari': 'Multi-day safaris', 'day-trip': 'Day trips', 'city-tour': 'City walks', 'adventure': 'Adventure', 'culture': 'Culture & community', 'beach': 'Coast & water', 'expedition': 'Expeditions' };
  function renderDemandTab() {
    var host = $('s-tours'); if (!host) return;
    var d = state.demand;
    function table(rows, name) {
      return '<table class="tbl"><thead><tr><th></th><th>Waiting</th><th>This week</th><th>Live tours</th></tr></thead><tbody>' +
        (rows.length ? rows.map(function (x) { return '<tr><td class="t-main">' + esc(name(x)) + '</td><td class="mono">' + x.waiting + '</td><td class="mono">' + (x.week || 0) + '</td><td class="mono">' + (x.tours || 0) + (x.tours ? '' : ' <span class="pill p-warn">none yet</span>') + '</td></tr>'; }).join('')
          : '<tr><td colspan="4"><div class="empty"><div class="empty-s">Nobody yet.</div></div></td></tr>') + '</tbody></table>';
    }
    host.innerHTML =
      '<div class="hd"><div><div class="card-t">Demand</div>' +
        '<div class="card-s">Travellers who asked to hear first when a tour opens in a place or a kind of trip. When a matching tour is published, each of them is told once. Guides see these counts, never the names.</div></div>' +
        '<div class="hd-act"><button class="btn btn-g" id="dm-refresh">Refresh</button></div></div>' +
      tabsHTML() +
      (d == null ? '<div class="card"><div class="skel" style="height:64px"></div></div>' :
        '<div class="card"><div class="card-t">' + (d.total || 0) + ' travellers waiting</div></div>' +
        '<div class="g2" style="margin-top:14px"><div class="card flush"><div class="card-hd"><div class="card-t">By place</div></div>' + table(d.places || [], function (x) { return x.name + (x.country ? ', ' + x.country : ''); }) + '</div>' +
          '<div class="card flush"><div class="card-hd"><div class="card-t">By kind of trip</div></div>' + table(d.kinds || [], function (x) { return KIND_NAME[x.category] || x.category; }) + '</div></div>' +
        '<div class="card flush" style="margin-top:14px"><div class="card-hd"><div class="card-t">Latest</div></div><table class="tbl"><thead><tr><th>Who</th><th>Waiting for</th><th>Note</th><th>Asked</th><th>Told</th></tr></thead><tbody>' +
          ((d.recent || []).length ? d.recent.map(function (a) {
            return '<tr><td class="t-main">' + esc(a.who || 'Member') + '</td><td>' + esc(a.place || KIND_NAME[a.category] || a.category || '') + '</td><td class="t-sub">' + esc(a.note || '') + '</td><td class="mono">' + esc(when(a.created_at)) + '</td><td class="mono">' + (a.notified_at ? esc(when(a.notified_at)) : '—') + '</td></tr>';
          }).join('') : '<tr><td colspan="5"><div class="empty"><div class="empty-s">Nobody yet.</div></div></td></tr>') +
        '</tbody></table></div>');
    wireTabs(host);
    var rf = $('dm-refresh'); if (rf) rf.addEventListener('click', function () { state.demand = null; renderDemandTab(); loadDemand(); });
  }

  /* ── 360° FILMING ───────────────────────────────────────────────── */
  var FILM_PILL = { 'new': 'p-warn', scheduled: 'p-info', filmed: 'p-ok', declined: 'p-bad', closed: 'p-mute' };
  function renderFilmTab() {
    var host = $('s-tours'); if (!host) return;
    var list = state.films || [], worlds = state.worlds || [];
    host.innerHTML =
      '<div class="hd"><div><div class="card-t">360° filming</div>' +
        '<div class="card-s">Guides ask from their studio. Move a request on and they are told each time. Marking one filmed with a world links that world to the tour, which puts a Step inside button on its page. Worlds themselves are made on the Immersive desk.</div></div></div>' +
      tabsHTML() +
      '<div class="card"><table class="tbl"><thead><tr><th>Guide</th><th>Tour</th><th>Their note</th><th>Asked</th><th>Status</th><th></th></tr></thead><tbody>' +
      (state.films == null ? '<tr><td colspan="6"><div class="skel" style="height:48px"></div></td></tr>' :
        list.length ? list.map(function (f) {
          return '<tr><td class="t-main">' + esc(f.operator || f.who || 'Guide') + '<div class="t-sub">' + esc(f.who || '') + '</div></td>' +
            '<td>' + esc(f.tour || 'The company in general') + '<div class="t-sub">' + esc(f.place || '') + '</div></td>' +
            '<td class="t-sub" style="max-width:320px">' + esc(f.note || '') + (f.admin_note ? '<div style="color:#0E6F62">Us: ' + esc(f.admin_note) + '</div>' : '') + '</td>' +
            '<td class="mono">' + esc(when(f.created_at)) + '</td>' +
            '<td><span class="pill ' + (FILM_PILL[f.status] || 'p-mute') + '">' + esc(f.status) + '</span>' + (f.world ? '<div class="t-sub">' + esc(f.world) + '</div>' : '') + '</td>' +
            '<td class="t-act">' +
              (f.status === 'new' ? '<button class="btn btn-g btn-sm" data-fm="scheduled" data-id="' + esc(f.id) + '">Schedule</button>' : '') +
              (f.status === 'new' || f.status === 'scheduled' ? '<select class="inp" data-fw="' + esc(f.id) + '" style="max-width:180px"><option value="">World…</option>' +
                worlds.map(function (w) { return '<option value="' + esc(w.id) + '">' + esc(w.title) + (w.status !== 'published' ? ' (' + esc(w.status) + ')' : '') + '</option>'; }).join('') + '</select>' +
                '<button class="btn btn-ok btn-sm" data-fm="filmed" data-id="' + esc(f.id) + '">Filmed</button>' +
                '<button class="btn btn-d btn-sm" data-fm="declined" data-id="' + esc(f.id) + '">Decline</button>' : '') +
              (f.status === 'filmed' || f.status === 'declined' ? '<button class="btn btn-g btn-sm" data-fm="closed" data-id="' + esc(f.id) + '">Close</button>' : '') +
            '</td></tr>';
        }).join('') : '<tr><td colspan="6"><div class="empty"><div class="empty-t">No requests yet</div><div class="empty-s">Guides ask for filming from the 360° tab in their studio.</div></div></td></tr>') +
      '</tbody></table></div>';
    wireTabs(host);
    host.querySelectorAll('[data-fm]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-id'), to = b.getAttribute('data-fm'), sel = host.querySelector('[data-fw="' + id + '"]');
        var world = sel && sel.value ? sel.value : null;
        var note = window.prompt(to === 'scheduled' ? 'When? The guide will see this.' : to === 'filmed' ? 'Anything to tell the guide? (optional)' : to === 'declined' ? 'Why not? The guide will see this.' : 'A note for the guide (optional)', '');
        if (note === null) return;
        if (to === 'filmed' && !world && !window.confirm('Mark as filmed without linking a world? The tour will not get a Step inside button until one is linked.')) return;
        b.disabled = true;
        client().rpc('admin_tour_immersive_request_set', { p_id: id, p_status: to, p_note: note || null, p_world: world }).then(function (r) {
          if (r && r.error) { toast(r.error.message); b.disabled = false; return; }
          toast('Updated. The guide has been told.'); loadFilms();
        }, function () { b.disabled = false; toast('Could not update'); });
      });
    });
  }

  function renderOps() {
    var host = $('tr-ops');
    if (!host) return;
    var pending = state.operators.filter(function (o) { return o.status === 'pending'; });
    if (!pending.length) { host.innerHTML = ''; return; }

    host.innerHTML = '<div class="card flush" style="margin-top:18px;"><div class="card-hd"><div>' +
      '<div class="card-t">Operators waiting on approval <span class="pill p-warn">' + pending.length + '</span></div>' +
      '<div class="card-s">An operator must be approved before any of their tours can be published.</div></div></div>' +
      '<table class="tbl"><tbody>' +
      pending.map(function (o) {
        return '<tr><td><div class="t-main">' + esc(o.name) + '</div>' +
          '<div class="t-sub">' + esc(o.email || '') + ' · ' + esc(o.phone || '') +
          (o.county ? ' · ' + esc(o.county) : '') + '</div></td>' +
          '<td class="t-act">' +
            '<button class="btn btn-ok btn-sm" data-op="1" data-id="' + o.id + '">Approve</button>' +
            '<button class="btn btn-d btn-sm" data-op="0" data-id="' + o.id + '">Reject</button>' +
          '</td></tr>';
      }).join('') +
      '</tbody></table></div>';

    host.querySelectorAll('[data-op]').forEach(function (b) {
      b.addEventListener('click', function () {
        approveOperator(b.getAttribute('data-id'), b.getAttribute('data-op') === '1');
      });
    });
  }

  /* ── create / edit ───────────────────────────────────────────────── */

  function field(label, name, val, opts) {
    opts = opts || {};
    var v = esc(val == null ? '' : val);
    var input = opts.textarea
      ? '<textarea class="inp" name="' + name + '" rows="' + (opts.rows || 3) + '" placeholder="' +
        esc(opts.ph || '') + '">' + v + '</textarea>'
      : opts.select
        ? '<select class="inp" name="' + name + '">' + opts.select.map(function (o) {
            return '<option value="' + esc(o[0]) + '"' + (String(val) === String(o[0]) ? ' selected' : '') +
                   '>' + esc(o[1]) + '</option>';
          }).join('') + '</select>'
        : '<input class="inp" name="' + name + '" type="' + (opts.type || 'text') +
          '" value="' + v + '" placeholder="' + esc(opts.ph || '') + '"/>';
    return '<div class="fld"><label class="fld-l">' + esc(label) +
           (opts.hint ? ' <span class="note">' + esc(opts.hint) + '</span>' : '') +
           '</label>' + input + '</div>';
  }

  function check(label, name, on, hint) {
    return '<div class="fld"><label class="fld-l" style="display:flex;align-items:center;gap:9px;cursor:pointer;">' +
      '<input type="checkbox" name="' + name + '" value="1"' + (on ? ' checked' : '') +
      ' style="width:16px;height:16px;accent-color:#0E9384;"/>' + esc(label) +
      (hint ? ' <span class="note">' + esc(hint) + '</span>' : '') +
      '</label></div>';
  }
  /* A picker over media the tour already has, rather than a URL box.
     Asking an admin to paste a storage URL is asking for a typo that
     silently breaks the Marquee clip. */
  function pick(label, name, options, val, hint) {
    var opts = [['', '— none —']].concat(options.map(function (u, i) {
      var short = String(u).split('/').pop();
      return [u, (i + 1) + ' · ' + (short.length > 30 ? short.slice(0, 30) + '…' : short)];
    }));
    return field(label, name, val, { select: opts, hint: hint });
  }

  function openForm(id) {
    var t = id ? state.tours.filter(function (x) { return String(x.id) === String(id); })[0] : null;
    state.editing = t ? t.id : null;
    var host = $('tr-form');
    if (!host) return;

    /* Media already on the tour, so the Marquee pickers offer real files
       rather than a URL box to paste into. */
    var vids = arr(t && t.videos);
    var pics = arr(t && t.photos);
    if (t && t.cover_url && pics.indexOf(t.cover_url) === -1) pics = [t.cover_url].concat(pics);

    var opOpts = [['', '— choose —']].concat(state.operators
      .filter(function (o) { return o.status === 'approved'; })
      .map(function (o) { return [o.id, o.name + (o.kind === 'cabana' ? ' (in-house)' : '')]; }));

    host.innerHTML =
      '<div class="card" style="margin-top:18px;" id="tr-card">' +
        '<div class="card-t">' + (t ? 'Edit tour' : 'New Cabana tour') + '</div>' +
        '<div class="card-s">' + (t ? esc(t.title) :
          'Published straight away. Operator submissions come in as pending instead.') + '</div>' +
        '<form id="tr-f">' +
          '<div class="g2">' +
            field('Title', 'title', t && t.title, { ph: 'Maasai Mara, three days' }) +
            field('Operator', 'operator_id', t && t.operator_id, { select: opOpts }) +
          '</div>' +
          field('Summary', 'summary', t && t.summary, { ph: 'One line the card will show' }) +
          field('Description', 'description', t && t.description, { textarea: true, rows: 5 }) +
          '<div class="g4">' +
            field('Destination', 'destination', t && t.destination, { ph: 'Maasai Mara' }) +
            field('County', 'county', t && t.county, { ph: 'Narok' }) +
            field('Meeting point', 'meeting_point', t && t.meeting_point) +
            field('Place on /tours', 'place_id', t && t.place_auto === false ? t.place_id : '', {
              select: [['', 'Guess from the destination' + (t && t.place_id && t.place_auto !== false ? ' (now: ' + (((state.places || []).filter(function (p) { return p.id === t.place_id; })[0] || {}).name || t.place_id) + ')' : '')]]
                .concat((state.places || []).map(function (p) { return [p.id, p.name + (p.enabled ? '' : ' (hidden)')]; })),
              hint: 'pins it' }) +
          '</div>' +
          '<div class="g4">' +
            field('Duration label', 'duration_label', t && t.duration_label, { ph: '3 days' }) +
            field('Hours', 'duration_hours', t && t.duration_hours, { type: 'number', hint: 'for day tours' }) +
            field('Days', 'days', (t && t.days) || 1, { type: 'number' }) +
            field('Category', 'category', t && t.category, {
              select: [['city-tour','City tour'],['day-safari','Day safari'],['day-trip','Day trip'],
                       ['big-safari','Multi-day safari'],['adventure','Adventure'],
                       ['culture','Culture'],['beach','Beach'],['expedition','Expedition']] }) +
          '</div>' +
          '<div class="g4">' +
            field('Price (KES)', 'price_kes', (t && t.price_kes) || 0, { type: 'number' }) +
            field('Charged', 'price_basis', (t && t.price_basis) || 'per_person', {
              select: [['per_person', 'Per person'], ['per_group', 'Per group']] }) +
            field('Child price (KES)', 'child_price_kes', t && t.child_price_kes, { type: 'number' }) +
            field('Deposit %', 'deposit_pct', (t && t.deposit_pct) != null ? t.deposit_pct : 30, { type: 'number' }) +
          '</div>' +
          '<div class="g4">' +
            field('Min group', 'group_min', (t && t.group_min) || 1, { type: 'number' }) +
            field('Max group', 'group_max', (t && t.group_max) || 12, { type: 'number' }) +
            field('Latitude', 'latitude', t && t.latitude, { type: 'number', hint: 'for map + radius search' }) +
            field('Longitude', 'longitude', t && t.longitude, { type: 'number' }) +
          '</div>' +
          '<div class="g3">' +
            field('Schedule', 'schedule_type', t && t.schedule_type, {
              select: [['on_request','On request'],['daily','Runs daily'],['fixed','Fixed departures']] }) +
            field('Next departure', 'next_departure', t && t.next_departure, { type: 'date' }) +
            field('Spots left', 'spots_left', t && t.spots_left, { type: 'number' }) +
          '</div>' +
          '<div class="fld"><label class="fld-l">Photos and video</label>' +
            '<div id="tr-media"></div></div>' +

          /* ── Marquee clip ──────────────────────────────────────────
             When this tour runs in the Marquee at the top of /tours
             (paid, featured free from the Marquee desk, or as an
             automatic "Leaving soon" slot) this is the clip, poster
             and headline it uses. Empty falls back to the cover photo
             and the tour title. */
          '<div class="card" style="margin:18px 0;padding:16px;background:rgba(45,212,191,.05);' +
            'border:1px solid rgba(45,212,191,.22);">' +
            '<div class="card-t" style="font-size:14px;">Marquee clip</div>' +
            '<div class="card-s" style="margin-bottom:12px;">Used whenever this tour appears in the ' +
              'Marquee at the top of cabana.africa/tours. Wrap words in *stars* to set them in the ' +
              'slot’s accent colour. Leave empty to use the cover photo and title.</div>' +
            '<div class="g2">' +
              pick('Clip to play', 'showcase_video', vids, t && t.showcase_video,
                   vids.length ? 'optional' : 'upload a video to choose one') +
              pick('Poster frame', 'video_poster', pics, t && t.video_poster,
                   'shown before it plays') +
            '</div>' +
            field('Headline', 'showcase_headline', t && t.showcase_headline,
                  { ph: 'Falls back to the tour title' }) +
            '<input type="hidden" name="showcase" value="' + (t && t.showcase ? '1' : '') + '">' +
            '<input type="hidden" name="showcase_rank" value="' + ((t && t.showcase_rank) || 0) + '">' +
          '</div>' +
          '<div class="g2">' +
            field('Included — one per line', 'includes_list', arr(t && t.includes_list).join('\n'),
                  { textarea: true, rows: 4 }) +
            field('Not included — one per line', 'excludes_list', arr(t && t.excludes_list).join('\n'),
                  { textarea: true, rows: 4 }) +
          '</div>' +
          '<div class="g2">' +
            field('Highlights — one per line', 'highlights', arr(t && t.highlights).join('\n'),
                  { textarea: true, rows: 4 }) +
            field('Tags — one per line', 'tags', arr(t && t.tags).join('\n'), { textarea: true, rows: 4 }) +
          '</div>' +
          field('Cancellation policy', 'cancellation', t && t.cancellation, { textarea: true, rows: 2 }) +
          '<div class="hd-act" style="margin-top:16px;">' +
            '<button class="btn btn-p" type="submit">' + (t ? 'Save changes' : 'Publish tour') + '</button>' +
            '<button class="btn btn-g" type="button" id="tr-cancel">Cancel</button>' +
          '</div>' +
        '</form>' +
      '</div>';

    // Existing media is left in place on edit; the uploader adds to it.
    var mediaHost = $('tr-media');
    if (mediaHost && window.CabanaUploader) {
      adminMedia = window.CabanaUploader.mount(mediaHost, {
        client: client(),
        folder: 'cabana-' + (t ? t.id : Date.now().toString(36)),
        maxVideos: 3,
        onChange: function (v) {
          var btn = host.querySelector('button[type="submit"]');
          if (btn) btn.disabled = !!v.busy;
        }
      });
    } else { adminMedia = null; }

    $('tr-cancel').addEventListener('click', function () { host.innerHTML = ''; adminMedia = null; });
    $('tr-f').addEventListener('submit', function (e) { e.preventDefault(); save(new FormData(e.target)); });
    var card = $('tr-card');
    if (card && card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function save(fd) {
    var c = client(); if (!c) { toast('Not connected'); return; }
    var g = function (k) { var v = fd.get(k); return v == null ? '' : String(v).trim(); };
    var num = function (k, d) { var v = g(k); return v === '' ? (d == null ? null : d) : Number(v); };

    if (!g('title')) { toast('A title is required'); return; }
    if (!g('operator_id')) { toast('Choose an operator'); return; }

    var row = {
      title: g('title'),
      operator_id: Number(g('operator_id')),
      summary: g('summary') || null,
      description: g('description') || null,
      destination: g('destination') || null,
      county: g('county') || null,
      meeting_point: g('meeting_point') || null,
      duration_label: g('duration_label') || null,
      duration_hours: num('duration_hours'),
      days: num('days', 1),
      category: g('category') || 'day-safari',
      price_kes: num('price_kes', 0),
      deposit_pct: num('deposit_pct', 30),
      group_min: num('group_min', 1),
      group_max: num('group_max', 12),
      schedule_type: g('schedule_type') || 'on_request',
      next_departure: g('next_departure') || null,
      spots_left: num('spots_left'),
      price_basis: g('price_basis') || 'per_person',
      child_price_kes: num('child_price_kes'),
      latitude: num('latitude'),
      longitude: num('longitude'),
      cover_url: null,   // replaced below by whatever was uploaded
      includes_list: arr(g('includes_list')),
      excludes_list: arr(g('excludes_list')),
      highlights: arr(g('highlights')),
      tags: arr(g('tags')),
      cancellation: g('cancellation') || null,
      /* Empty hands the place back to the database's guess. */
      place_id: g('place_id') || null,

      /* Marquee clip. Null falls back to the cover photo. The legacy
         reel flag and rank ride along unchanged in hidden fields. */
      showcase: fd.get('showcase') === '1',
      showcase_video: g('showcase_video') || null,
      video_poster: g('video_poster') || null,
      showcase_rank: num('showcase_rank', 0),
      showcase_headline: g('showcase_headline') || null
    };

    if (adminMedia && adminMedia.busy()) { toast('Photos are still uploading.'); return; }

    if (adminMedia) {
      var m = adminMedia.value();
      var prev = state.editing
        ? (state.tours.filter(function (x) { return String(x.id) === String(state.editing); })[0] || {})
        : {};
      // Keep anything already on the tour and append the new uploads.
      row.photos = arr(prev.photos).concat(m.photos);
      row.videos = arr(prev.videos).concat(m.videos);
      row.cover_url = prev.cover_url || m.cover || null;
    }

    var q;
    if (state.editing) {
      q = c.from('tours').update(row).eq('id', state.editing);
    } else {
      row.status = 'published';       // admin-created goes live immediately
      q = c.from('tours').insert(row);
    }

    q.then(function (r) {
      if (r && r.error) { toast('Could not save: ' + r.error.message); return; }
      toast(state.editing ? 'Saved' : 'Published');
      state.editing = null;
      var f = $('tr-form'); if (f) f.innerHTML = '';
      load();
    }, function (e) { toast('Could not save: ' + (e && e.message || 'unknown')); });
  }

  window.toursLoad = load;
  window.CabanaToursAdmin = { load: load, render: render };
})();
