/* ═══════════════════════════════════════════════════════════════════
   CABANA · EVENTS — admin module
   ───────────────────────────────────────────────────────────────────
   Runs inside admin.html. Reuses the admin's own components (.card,
   .btn, .tabs, .inp, .pill) so it looks native rather than bolted on.

   Two jobs:
     · moderate what organisers submit (pending → published / rejected)
     · publish Cabana's own nights     (created straight to published)

   Writes are gated by RLS on is_admin(), so a non-admin reaching this
   file gets nothing. The UI gate is a convenience, not the security.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var sb = null;
  var state = { tab: 'pending', events: [], organisers: [], editing: null };
  var evAdminMedia = null;

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

  /* datetime-local needs local wall-clock "YYYY-MM-DDTHH:mm".
     Slicing the ISO string would silently shift the time by the UTC
     offset, so the offset is subtracted first. */
  function dtLocal(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  /* Tiers are edited as plain text so the admin form stays one screen:
       Early bird | 3500 | 100
       Gate | 5000                                                  */
  function tierText(v) {
    return arr(v).map(function (t) {
      return [t.name, t.price_kes, t.qty].filter(function (x) { return x != null && x !== ''; }).join(' | ');
    }).join('\n');
  }

  function parseTiers(txt) {
    return String(txt || '').split('\n').map(function (l) { return l.trim(); })
      .filter(Boolean).map(function (l) {
        var p = l.split('|').map(function (x) { return x.trim(); });
        var row = { name: p[0] || 'General admission', price_kes: Math.max(0, Number(p[1]) || 0), sold: 0 };
        if (p[2] && Number(p[2]) > 0) row.qty = Number(p[2]);
        return row;
      });
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

    c.from('events').select('*').order('created_at', { ascending: false })
      .then(function (r) {
        state.events = (r && r.data) || [];
        render();
      }, function () { render(); });

    c.from('event_organisers').select('*').order('created_at', { ascending: false })
      .then(function (r) { state.organisers = (r && r.data) || []; renderOps(); }, function () {});
  }

  /* ── moderation actions ──────────────────────────────────────────── */

  function setStatus(id, status, note) {
    var c = client(); if (!c) return;
    var patch = { status: status, reviewed_at: new Date().toISOString() };
    if (note != null) patch.review_note = note;

    c.from('events').update(patch).eq('id', id).then(function (r) {
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
    var e = state.events.filter(function (x) { return String(x.id) === String(id); })[0];
    var name = (e && e.title) || 'this event';
    if (!window.confirm('Delete ' + name + '?\n\nIt comes off the site immediately. The row is retained and recoverable.')) return;

    var M = window.ApaAdmin && window.ApaAdmin.Moderate;
    var done = function (r) {
      if (r && r.ok === false) { toast('Could not delete: ' + r.error); return; }
      toast('Deleted'); load();
    };
    if (M) return M.remove('events', id, false, 'Deleted from the events panel', 'event').then(done, function () { toast('Could not delete'); });

    var c = client(); if (!c) return;
    c.from('events').update({ status: 'deleted', deleted_at: new Date().toISOString() }).eq('id', id)
      .then(function (r) { done(r && r.error ? { ok: false, error: r.error.message } : { ok: true }); },
            function () { toast('Could not delete'); });
  }

  function toggleFeatured(id, on) {
    var c = client(); if (!c) return;
    c.from('events').update({ featured: !!on }).eq('id', id).then(function () {
      toast(on ? 'Featured' : 'Unfeatured'); load();
    }, function () { toast('Could not update'); });
  }

  function approveOperator(id, approve) {
    var c = client(); if (!c) return;
    c.from('event_organisers')
      .update({ status: approve ? 'approved' : 'rejected',
                verified: !!approve,
                verified_at: approve ? new Date().toISOString() : null })
      .eq('id', id)
      .then(function () { toast(approve ? 'Organiser approved' : 'Organiser rejected'); load(); },
            function () { toast('Could not update organiser'); });
  }

  /* ── list ────────────────────────────────────────────────────────── */

  function counts() {
    var c = { pending: 0, published: 0, draft: 0, rejected: 0, paused: 0 };
    state.events.forEach(function (t) { if (c[t.status] != null) c[t.status]++; });
    return c;
  }

  function rowHTML(t) {
    var op = state.organisers.filter(function (o) { return o.id === t.organiser_id; })[0];
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
        '<div class="t-sub">' + esc([t.venue, t.city].filter(Boolean).join(', ') || '—') +
        (Number(t.price_from) ? ' · from ' + money(t.price_from) : '') + '</div></td>' +
      '<td>' + (house ? '<span class="pill p-ok">Cabana</span>' :
                esc((op && op.name) || 'Unassigned')) + '</td>' +
      '<td class="mono">' + (t.starts_at
          ? new Date(t.starts_at).toLocaleString('en-KE',
              { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', hour12:false })
          : '\u2014') + '</td>' +
      '<td><span class="pill ' + (STATUS_PILL[t.status] || 'p-mute') + '">' + esc(t.status) + '</span></td>' +
      '<td class="t-act">' + acts + '</td>' +
    '</tr>';
  }

  function render() {
    var host = $('s-events');
    if (!host) return;
    var c = counts();

    var list = state.events.filter(function (t) {
      return state.tab === 'all' ? true : t.status === state.tab;
    });

    host.innerHTML =
      '<div class="hd"><div><div class="card-t">Events</div>' +
        '<div class="card-s">Everything on cabana.africa/events. Organisers submit; you decide what goes live.</div></div>' +
        '<div class="hd-act"><button class="btn btn-p" id="ev-adm-new">+ New Cabana event</button></div>' +
      '</div>' +

      '<div class="tabs" id="ev-adm-tabs">' +
        ['pending','published','paused','draft','rejected','all'].map(function (k) {
          var n = k === 'all' ? state.events.length : (c[k] || 0);
          return '<button class="tab' + (state.tab === k ? ' on' : '') + '" data-tab="' + k + '">' +
                 k.charAt(0).toUpperCase() + k.slice(1) +
                 ' <span class="mono">' + n + '</span></button>';
        }).join('') +
      '</div>' +

      '<div class="card"><table class="tbl"><thead><tr>' +
        '<th>Event</th><th>Organiser</th><th>Starts</th><th>Status</th><th></th>' +
      '</tr></thead><tbody>' +
        (list.length ? list.map(rowHTML).join('') :
          '<tr><td colspan="5"><div class="empty"><div class="empty-t">Nothing ' +
          esc(state.tab === 'all' ? 'listed yet' : state.tab) + '</div>' +
          '<div class="empty-s">' +
          (state.tab === 'pending'
            ? 'Submissions from organisers land here for review.'
            : 'Use “New Cabana event” to publish one of your own.') +
          '</div></div></td></tr>') +
      '</tbody></table></div>' +

      '<div id="ev-adm-ops"></div>' +
      '<div id="ev-adm-form"></div>';

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
          var t = state.events.filter(function (x) { return String(x.id) === String(id); })[0];
          toggleFeatured(id, !(t && t.featured));
        }
        if (act === 'edit') openForm(id);
        if (act === 'delete') remove(id);
      });
    });
    var nb = $('ev-adm-new');
    if (nb) nb.addEventListener('click', function () { openForm(null); });

    renderOps();
  }

  function renderOps() {
    var host = $('ev-adm-ops');
    if (!host) return;
    var pending = state.organisers.filter(function (o) { return o.status === 'pending'; });
    if (!pending.length) { host.innerHTML = ''; return; }

    host.innerHTML = '<div class="card" style="margin-top:18px;">' +
      '<div class="card-t">Organisers waiting on approval <span class="pill p-warn">' + pending.length + '</span></div>' +
      '<div class="card-s">An organiser must be approved before any of their events can be published.</div>' +
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
    var t = id ? state.events.filter(function (x) { return String(x.id) === String(id); })[0] : null;
    state.editing = t ? t.id : null;
    var host = $('ev-adm-form');
    if (!host) return;

    var opOpts = [['', '— choose —']].concat(state.organisers
      .filter(function (o) { return o.status === 'approved'; })
      .map(function (o) { return [o.id, o.name + (o.kind === 'cabana' ? ' (in-house)' : '')]; }));

    host.innerHTML =
      '<div class="card" style="margin-top:18px;" id="ev-adm-card">' +
        '<div class="card-t">' + (t ? 'Edit event' : 'New Cabana event') + '</div>' +
        '<div class="card-s">' + (t ? esc(t.title) :
          'Published straight away. Organiser submissions come in as pending instead.') + '</div>' +
        '<form id="ev-adm-f">' +
          '<div class="g2">' +
            field('Title', 'title', t && t.title, { ph: 'Blankets & Wine October Edition' }) +
            field('Organiser', 'organiser_id', t && t.organiser_id, { select: opOpts }) +
          '</div>' +
          field('Tagline', 'tagline', t && t.tagline, { ph: 'One line under the name' }) +
          field('Description', 'description', t && t.description, { textarea: true, rows: 5 }) +
          '<div class="g2">' +
            field('Starts', 'starts_at', dtLocal(t && t.starts_at),
                  { type: 'datetime-local', hint: 'drives the countdown' }) +
            field('Ends', 'ends_at', dtLocal(t && t.ends_at), { type: 'datetime-local' }) +
          '</div>' +
          '<div class="g3">' +
            field('Venue', 'venue', t && t.venue, { ph: 'Ngong Racecourse' }) +
            field('City', 'city', (t && t.city) || 'Nairobi') +
            field('Category', 'category', t && t.category, {
              select: [['music','Music'],['festival','Festival'],['nightlife','Nightlife'],
                       ['comedy','Comedy'],['sports','Sports'],['art','Arts'],['food','Food & drink']] }) +
          '</div>' +
          field('Address', 'address', t && t.address) +
          '<div class="g4">' +
            field('Capacity', 'capacity', t && t.capacity, { type: 'number' }) +
            field('Tickets sold', 'tickets_sold', (t && t.tickets_sold) || 0, { type: 'number' }) +
            field('Age limit', 'age_limit', t && t.age_limit, { type: 'number' }) +
            field('Dress code', 'dress_code', t && t.dress_code) +
          '</div>' +
          field('Ticket tiers', 'tiers', tierText(t && t.tiers),
                { textarea: true, rows: 4,
                  hint: 'one per line \u2014 Name | price | qty   (qty optional)' }) +
          field('Line-up', 'lineup', arr(t && t.lineup).join('\n'), { textarea: true, rows: 3 }) +
          field('Tags', 'tags', arr(t && t.tags).join('\n'), { textarea: true, rows: 2 }) +
          '<div class="fld"><label class="fld-l">Photos and video</label>' +
            '<div id="ev-adm-media"></div></div>' +
          field('Refund policy', 'refund_policy', t && t.refund_policy, { textarea: true, rows: 2 }) +
          '<div class="hd-act" style="margin-top:16px;">' +
            '<button class="btn btn-p" type="submit">' + (t ? 'Save changes' : 'Publish event') + '</button>' +
            '<button class="btn btn-g" type="button" id="ev-adm-cancel">Cancel</button>' +
          '</div>' +
        '</form>' +
      '</div>';

    // Existing media is left in place on edit; the uploader adds to it.
    var mediaHost = $('ev-adm-media');
    if (mediaHost && window.CabanaUploader) {
      evAdminMedia = window.CabanaUploader.mount(mediaHost, {
        client: client(),
        bucket: 'events',
        folder: 'cabana-' + (t ? t.id : Date.now().toString(36)),
        maxPhotos: 12,
        maxVideos: 3,
        onChange: function (v) {
          var btn = host.querySelector('button[type="submit"]');
          if (btn) btn.disabled = !!v.busy;
        }
      });
    } else { evAdminMedia = null; }

    $('ev-adm-cancel').addEventListener('click', function () { host.innerHTML = ''; evAdminMedia = null; });
    $('ev-adm-f').addEventListener('submit', function (e) { e.preventDefault(); save(new FormData(e.target)); });
    var card = $('ev-adm-card');
    if (card && card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function save(fd) {
    var c = client(); if (!c) { toast('Not connected'); return; }
    var g = function (k) { var v = fd.get(k); return v == null ? '' : String(v).trim(); };
    var num = function (k, d) { var v = g(k); return v === '' ? (d == null ? null : d) : Number(v); };

    if (!g('title')) { toast('A title is required'); return; }
    if (!g('organiser_id')) { toast('Choose an organiser'); return; }

    var row = {
      title: g('title'),
      organiser_id: Number(g('organiser_id')),
      tagline: g('tagline') || null,
      description: g('description') || null,
      category: g('category') || 'music',
      starts_at: g('starts_at') ? new Date(g('starts_at')).toISOString() : null,
      ends_at:   g('ends_at')   ? new Date(g('ends_at')).toISOString()   : null,
      venue: g('venue') || null,
      city: g('city') || 'Nairobi',
      address: g('address') || null,
      capacity: num('capacity'),
      tickets_sold: num('tickets_sold', 0),
      age_limit: num('age_limit'),
      dress_code: g('dress_code') || null,
      tiers: parseTiers(g('tiers')),
      lineup: arr(g('lineup')),
      tags: arr(g('tags')),
      refund_policy: g('refund_policy') || null,
      cover_url: null
    };

    if (!row.starts_at) { toast('An event needs a start date and time'); return; }
    if (row.ends_at && Date.parse(row.ends_at) <= Date.parse(row.starts_at)) {
      toast('The end time has to be after the start'); return;
    }

    if (evAdminMedia && evAdminMedia.busy()) { toast('Photos are still uploading.'); return; }
    if (evAdminMedia) {
      var m = evAdminMedia.value();
      var prev = state.editing
        ? (state.events.filter(function (x) { return String(x.id) === String(state.editing); })[0] || {})
        : {};
      // Keep anything already on the tour and append the new uploads.
      row.photos = arr(prev.photos).concat(m.photos);
      row.videos = arr(prev.videos).concat(m.videos);
      row.cover_url = prev.cover_url || m.cover || null;
    }

    var q;
    if (state.editing) {
      q = c.from('events').update(row).eq('id', state.editing);
    } else {
      row.status = 'published';       // admin-created goes live immediately
      q = c.from('events').insert(row);
    }

    q.then(function (r) {
      if (r && r.error) { toast('Could not save: ' + r.error.message); return; }
      toast(state.editing ? 'Saved' : 'Published');
      state.editing = null;
      var f = $('ev-adm-form'); if (f) f.innerHTML = '';
      load();
    }, function (e) { toast('Could not save: ' + (e && e.message || 'unknown')); });
  }

  window.eventsLoad = load;
  window.CabanaEventsAdmin = { load: load, render: render };
})();
