/* ═══════════════════════════════════════════════════════════════════
   CABANA · TOURS — admin module
   ───────────────────────────────────────────────────────────────────
   Runs inside admin.html. Reuses the admin's own components (.card,
   .btn, .tabs, .inp, .pill) so it looks native rather than bolted on.

   Two jobs:
     · moderate what operators submit  (pending → published / rejected)
     · publish Cabana's own tours      (created straight to published)

   Writes are gated by RLS on is_admin(), so a non-admin reaching this
   file gets nothing. The UI gate is a convenience, not the security.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var sb = null;
  var state = { tab: 'pending', tours: [], operators: [], editing: null };
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

    c.from('tours').select('*').order('created_at', { ascending: false })
      .then(function (r) {
        state.tours = (r && r.data) || [];
        render();
      }, function () { render(); });

    c.from('tour_operators').select('*').order('created_at', { ascending: false })
      .then(function (r) { state.operators = (r && r.data) || []; renderOps(); }, function () {});
  }

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
    if (!window.confirm('Delete ' + name + '?\n\nIt comes off the site immediately. The row is retained and recoverable.')) return;

    var M = window.ApaAdmin && window.ApaAdmin.Moderate;
    var done = function (r) {
      if (r && r.ok === false) { toast('Could not delete: ' + r.error); return; }
      toast('Deleted'); load();
    };
    if (M) return M.remove('tours', id, false, 'Deleted from the tours panel', 'tour').then(done, function () { toast('Could not delete'); });

    var c = client(); if (!c) return;
    c.from('tours').update({ status: 'deleted', deleted_at: new Date().toISOString() }).eq('id', id)
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
      '<td><div class="t-main">' + esc(t.title) + (t.featured ? ' <span class="pill p-info">Featured</span>' : '') + '</div>' +
        '<div class="t-sub">' + esc(t.destination || t.county || '—') + ' · ' +
        esc(t.duration_label || (t.days + ' day' + (t.days === 1 ? '' : 's'))) + '</div></td>' +
      '<td>' + (house ? '<span class="pill p-ok">Cabana</span>' :
                esc((op && op.name) || 'Unassigned')) + '</td>' +
      '<td class="mono">' + (Number(t.price_kes) === 0 ? 'Free' : money(t.price_kes)) + '</td>' +
      '<td><span class="pill ' + (STATUS_PILL[t.status] || 'p-mute') + '">' + esc(t.status) + '</span></td>' +
      '<td class="t-act">' + acts + '</td>' +
    '</tr>';
  }

  function render() {
    var host = $('s-tours');
    if (!host) return;
    var c = counts();

    var list = state.tours.filter(function (t) {
      return state.tab === 'all' ? true : t.status === state.tab;
    });

    host.innerHTML =
      '<div class="hd"><div><div class="card-t">Tours</div>' +
        '<div class="card-s">Everything listed on cabana.africa/tours. Operators submit; you decide what goes live.</div></div>' +
        '<div class="hd-act"><button class="btn btn-p" id="tr-new">+ New Cabana tour</button></div>' +
      '</div>' +

      '<div class="tabs" id="tr-tabs">' +
        ['pending','published','paused','draft','rejected','all'].map(function (k) {
          var n = k === 'all' ? state.tours.length : (c[k] || 0);
          return '<button class="tab' + (state.tab === k ? ' on' : '') + '" data-tab="' + k + '">' +
                 k.charAt(0).toUpperCase() + k.slice(1) +
                 ' <span class="mono">' + n + '</span></button>';
        }).join('') +
      '</div>' +

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

    host.querySelectorAll('[data-tab]').forEach(function (b) {
      b.addEventListener('click', function () { state.tab = b.getAttribute('data-tab'); render(); });
    });
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

  function openForm(id) {
    var t = id ? state.tours.filter(function (x) { return String(x.id) === String(id); })[0] : null;
    state.editing = t ? t.id : null;
    var host = $('tr-form');
    if (!host) return;

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
            field('Deposit %', 'deposit_pct', (t && t.deposit_pct) != null ? t.deposit_pct : 30, { type: 'number' }) +
            field('Min group', 'group_min', (t && t.group_min) || 1, { type: 'number' }) +
            field('Max group', 'group_max', (t && t.group_max) || 12, { type: 'number' }) +
          '</div>' +
          '<div class="g3">' +
            field('Schedule', 'schedule_type', t && t.schedule_type, {
              select: [['on_request','On request'],['daily','Runs daily'],['fixed','Fixed departures']] }) +
            field('Next departure', 'next_departure', t && t.next_departure, { type: 'date' }) +
            field('Spots left', 'spots_left', t && t.spots_left, { type: 'number' }) +
          '</div>' +
          '<div class="fld"><label class="fld-l">Photos and video</label>' +
            '<div id="tr-media"></div></div>' +
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
        maxPhotos: 12,
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
      cover_url: null,   // replaced below by whatever was uploaded
      includes_list: arr(g('includes_list')),
      excludes_list: arr(g('excludes_list')),
      highlights: arr(g('highlights')),
      tags: arr(g('tags')),
      cancellation: g('cancellation') || null
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
