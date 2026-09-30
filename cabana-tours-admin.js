/* ═══════════════════════════════════════════════════════════════════
   CABANA · TOURS — admin module
   ───────────────────────────────────────────────────────────────────
   Runs inside admin.html. Reuses the admin's own components (.card,
   .btn, .tabs, .inp, .pill) so it looks native rather than bolted on.

   Three jobs:
     · moderate what operators submit  (pending → published / rejected)
     · publish Cabana's own tours      (created straight to published)
     · run the Spotlight at the top of /tours: review paid slides,
       feature tours for free, pause or end anything, set the prices
     · write the page around the tours (Page tab, in
       cabana-tours-page-admin.js): cover, Cabana slides, sections,
       categories and collections

   Writes are gated by RLS on is_admin(), so a non-admin reaching this
   file gets nothing. The UI gate is a convenience, not the security.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var sb = null;
  var state = { tab: 'pending', tours: [], operators: [], editing: null, spots: null, spotSettings: null };
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
    loadSpots();
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
  function paintSpotCount() {
    var b = document.querySelector('#tr-tabs [data-tab="spotlight"] .mono');
    if (b) b.textContent = spotReview().length;
  }
  function spotLive(tourId) {
    return (state.spots || []).some(function (s) {
      return s.live && String(s.tour_id) === String(tourId);
    });
  }
  function spotReview() { return (state.spots || []).filter(function (s) { return s.status === 'in_review'; }); }

  /* ── moderation actions ──────────────────────────────────────────── */

  function setStatus(id, status, note) {
    var c = client(); if (!c) return;
    var patch = { status: status, reviewed_at: new Date().toISOString() };
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

    return '<tr>' +
      '<td><div class="t-main">' + esc(t.title) +
        (t.featured ? ' <span class="pill p-info">Featured</span>' : '') +
        (spotLive(t.id) ? ' <span class="pill p-ok">In Spotlight</span>' : '') + '</div>' +
        '<div class="t-sub">' + esc(t.destination || t.county || '—') + ' · ' +
        esc(t.duration_label || (t.days + ' day' + (t.days === 1 ? '' : 's'))) + '</div></td>' +
      '<td>' + (house ? '<span class="pill p-ok">Cabana</span>' :
                esc((op && op.name) || 'Unassigned')) + '</td>' +
      '<td class="mono">' + (Number(t.price_kes) === 0 ? 'Free' : money(t.price_kes)) + '</td>' +
      '<td><span class="pill ' + (STATUS_PILL[t.status] || 'p-mute') + '">' + esc(t.status) + '</span></td>' +
      '<td class="t-act">' + acts + '</td>' +
    '</tr>';
  }

  var TAB_LABEL = { pending: 'Pending', published: 'Published', paused: 'Paused', draft: 'Draft', rejected: 'Rejected', spotlight: 'Spotlight', page: 'Page', all: 'All' };
  function tabsHTML() {
    var c = counts();
    return '<div class="tabs" id="tr-tabs">' +
      ['pending', 'published', 'paused', 'draft', 'rejected', 'spotlight', 'page', 'all'].map(function (k) {
        var n = k === 'all' ? state.tours.length : k === 'spotlight' ? spotReview().length : k === 'page' ? '' : (c[k] || 0);
        return '<button class="tab' + (state.tab === k ? ' on' : '') + '" data-tab="' + k + '">' + TAB_LABEL[k] +
               (n === '' ? '' : ' <span class="mono">' + n + '</span>') + '</button>';
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
        '<div class="card-s">What travellers see at cabana.africa/tours around the tours themselves: the cover, Cabana’s own Spotlight slides, and every section below. Saving is live.</div></div>' +
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

  /* ── the Spotlight desk ──────────────────────────────────────────── */
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
      '<td><div class="t-main">' + esc(String(s.headline || '').replace(/\*/g, '')) + (s.live ? ' <span class="pill p-ok">Live</span>' : '') + '</div>' +
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
    return '<div class="card" style="margin-top:18px;"><div class="card-t">' + title + ' <span class="mono">' + list.length + '</span></div>' +
      (sub ? '<div class="card-s">' + sub + '</div>' : '') +
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
      '<div class="hd"><div><div class="card-t">The Spotlight</div>' +
        '<div class="card-s">The full-screen slideshow at the top of cabana.africa/tours. Guides and operators pay for sponsored slides, which wait here for a yes or no; approving a late one moves its dates so they lose no days, and refusing a paid one turns the payment into Cabana credit. Cabana’s own slides are made under Page.</div></div>' +
        '<div class="hd-act"><button class="btn btn-p" id="tr-new">+ New Cabana tour</button></div></div>' +
      tabsHTML() +
      (state.spots == null ? '<div class="card"><div class="skel" style="height:64px"></div></div>' :
        spotTable('Waiting for review', 'Paid in full. Check the media, the words and the tour, then decide.', review, 'Nothing waiting. Paid Spotlights land here.') +
        spotTable('Running and paused', '', running, 'Nothing running.') +
        '<div class="card" style="margin-top:18px;"><div class="card-t">Feature a tour for free</div><div class="card-s">Puts a published tour in the Spotlight as a Cabana pick, after any sponsored slides, for 30 days. The tour needs a photo.</div>' +
          '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:10px"><select class="inp" id="sp-tour" style="min-width:280px">' +
          published.map(function (t) { return '<option value="' + t.id + '">' + esc(t.title) + '</option>'; }).join('') + '</select>' +
          '<button class="btn btn-p btn-sm" id="sp-feature"' + (published.length ? '' : ' disabled') + '>Feature it</button></div></div>' +
        '<div class="card" style="margin-top:18px;"><div class="card-t">Prices and limits</div><div class="card-s">What guides and operators pay, and how many sponsored slides may share a day.</div>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-top:10px">' +
            ['day', 'week', 'fortnight', 'month'].map(function (k) { return '<label class="t-sub">' + k + ' (KES)<input class="inp" type="number" min="0" data-price="' + k + '" value="' + esc(P[k] == null ? '' : P[k]) + '"/></label>'; }).join('') +
            '<label class="t-sub">Max sponsored a day<input class="inp" type="number" min="1" max="20" id="sp-max" value="' + esc(st.max_sponsored || 6) + '"/></label>' +
            '<label class="t-sub">Review within (hours)<input class="inp" type="number" min="1" max="168" id="sp-rh" value="' + esc(st.review_hours || 24) + '"/></label>' +
            '<label class="t-sub" style="display:flex;align-items:center;gap:8px;margin-top:18px"><input type="checkbox" id="sp-on"' + (st.enabled === false ? '' : ' checked') + '/> Selling Spotlights</label>' +
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
          toast({ approve: 'Approved: it is in the Spotlight', reject: 'Refused and credited', pause: 'Paused', resume: 'Back on', end: 'Ended' }[act] || 'Done');
          loadSpots();
        }, function () { toast('Could not update'); b.disabled = false; });
      });
    });
    var fb = $('sp-feature');
    if (fb) fb.addEventListener('click', function () {
      var id = $('sp-tour').value, t = state.tours.filter(function (x) { return String(x.id) === String(id); })[0]; if (!t) return;
      var cover = t.cover_url || arr(t.photos)[0] || '';
      if (!cover && !t.showcase_video) { toast('Add a photo to this tour first. The Spotlight never shows a tour without one.'); return; }
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
        review_hours: Math.min(168, Math.max(1, Number($('sp-rh').value) || 24)), enabled: $('sp-on').checked, updated_at: new Date().toISOString()
      }).eq('id', 1).then(function (r) { if (r && r.error) toast(r.error.message); else { toast('Saved'); loadSpots(); } }, function () { toast('Could not save'); });
    });
    var nb = $('tr-new'); if (nb) nb.addEventListener('click', function () { openForm(null); });
    renderOps();
  }

  function renderOps() {
    var host = $('tr-ops');
    if (!host) return;
    var pending = state.operators.filter(function (o) { return o.status === 'pending'; });
    if (!pending.length) { host.innerHTML = ''; return; }

    host.innerHTML = '<div class="card" style="margin-top:18px;">' +
      '<div class="card-t">Operators waiting on approval <span class="pill p-warn">' + pending.length + '</span></div>' +
      '<div class="card-s">An operator must be approved before any of their tours can be published.</div>' +
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
     silently breaks the Spotlight clip. */
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

    /* Media already on the tour, so the Spotlight pickers offer real files
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
          '<div class="g3">' +
            field('Destination', 'destination', t && t.destination, { ph: 'Maasai Mara' }) +
            field('County', 'county', t && t.county, { ph: 'Narok' }) +
            field('Meeting point', 'meeting_point', t && t.meeting_point) +
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

          /* ── Spotlight clip ────────────────────────────────────────
             When this tour runs in the Spotlight at the top of /tours
             (paid, featured free from the Spotlight desk, or as an
             automatic "Departing soon" slide) this is the clip, poster
             and headline it uses. Empty falls back to the cover photo
             and the tour title. */
          '<div class="card" style="margin:18px 0;padding:16px;background:rgba(45,212,191,.05);' +
            'border:1px solid rgba(45,212,191,.22);">' +
            '<div class="card-t" style="font-size:14px;">Spotlight clip</div>' +
            '<div class="card-s" style="margin-bottom:12px;">Used whenever this tour appears in the ' +
              'Spotlight at the top of cabana.africa/tours. Wrap words in *stars* to set them in the ' +
              'italic accent. Leave empty to use the cover photo and title.</div>' +
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

      /* Spotlight clip. Null falls back to the cover photo. The legacy
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
