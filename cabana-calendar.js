/* ══════════════════════════════════════════════════════════════════════
   CABANA CALENDAR · cabana-calendar.js
   ──────────────────────────────────────────────────────────────────────
   One calendar engine for every calendar in Cabana: a host's stays, a
   car-hire fleet, an agent's view of the listings they sell. Pages give
   it events and actions; it owns everything a person touches.

     VIEWS       Month (bookings drawn as continuous bars across the
                 week, check-in to check-out), Timeline (every listing
                 or car as a row, a Gantt of the whole business), Agenda
                 (what happens next, day by day) and Year (occupancy at
                 a glance, one tap into any month).

     SELECTING   Drag across days with a mouse. On a phone, tap a start
                 and tap an end, or press and hold then slide. Shift-
                 click extends. The picked range lives in a dock at the
                 bottom of a phone screen with its main action one tap
                 away, and in the inspector on a desktop.

     MOVING      Swipe the month sideways, arrow keys, Today, or tap the
                 month title to jump anywhere.

     KEEPING     Notes, tasks and reminders on any day, stored per person
     TRACK       (calendar_agenda), reminded in-page and pushed to the
                 phone by the server. Every change can be undone.

   Dates are local calendar days as 'YYYY-MM-DD'. An event covers the
   days start ≤ d < end. In 'nightly' mode (stays) each day is a night
   and a bar runs from the middle of the check-in day to the middle of
   the check-out day, the way hosts read a calendar. In 'daily' mode
   (cars) each day is a whole hire day.
   ══════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.CabanaCal) return;

  /* ── dates ──────────────────────────────────────────────────────── */
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) { var p = String(s).slice(0, 10).split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12); }
  function add(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return iso(d); }
  function diff(a, b) { return Math.round((parse(b) - parse(a)) / 864e5); }
  function today() { return iso(new Date()); }
  function monthStart(s) { return String(s).slice(0, 8) + '01'; }
  function addMonths(s, n) { var d = parse(monthStart(s)); d.setMonth(d.getMonth() + n); return iso(d); }
  function daysIn(s) { var d = parse(monthStart(s)); return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }
  function dow(s) { return parse(s).getDay(); }
  var LOCALE = 'en-GB';
  function f(s, o) { return parse(s).toLocaleDateString(LOCALE, o); }
  function fShort(s) { return f(s, { day: 'numeric', month: 'short' }); }
  function fDay(s) { return f(s, { weekday: 'short', day: 'numeric', month: 'short' }); }
  function fLong(s) { return f(s, { weekday: 'long', day: 'numeric', month: 'long' }); }
  function monthName(s, short) { return f(s, { month: short ? 'short' : 'long' }); }
  function rel(s) {
    var n = diff(today(), s);
    if (n === 0) return 'Today';
    if (n === 1) return 'Tomorrow';
    if (n === -1) return 'Yesterday';
    if (n > 1 && n < 7) return 'In ' + n + ' days';
    if (n < -1 && n > -7) return (-n) + ' days ago';
    return '';
  }

  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  function initials(s) {
    var w = String(s || '').replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
    if (!w.length) return '·';
    return (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase();
  }

  /* ── icons ──────────────────────────────────────────────────────── */
  var I = {
    left: '<path d="M15 18l-6-6 6-6"/>',
    right: '<path d="M9 18l6-6-6-6"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    month: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 10h18M8 2v4M16 2v4"/>',
    timeline: '<path d="M3 6h10M7 12h12M3 18h8"/><circle cx="17" cy="6" r="1.5"/><circle cx="5" cy="12" r="1.5"/><circle cx="15" cy="18" r="1.5"/>',
    agenda: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
    year: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    unlock: '<rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
    tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
    note: '<path d="M4 4h16v12l-4 4H4z"/><path d="M16 20v-4h4"/>',
    task: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    in: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5M15 12H3"/>',
    out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    car: '<path d="M5 13h14l-1.5-5a2 2 0 0 0-2-1.5h-7a2 2 0 0 0-2 1.5z"/><path d="M4 13h16v4H4z"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    today: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    wand: '<path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>',
    cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
    keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    sync: '<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>'
  };
  function ico(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (I[name] || I.spark) + '</svg>';
  }

  /* ── event types ────────────────────────────────────────────────── */
  var TYPES = {
    booking: { label: 'Booked', rank: 5, cell: 'b', icon: 'user' },
    active: { label: 'In progress', rank: 5, cell: 'b', icon: 'user' },
    done: { label: 'Completed', rank: 4, cell: 'b', icon: 'check' },
    clash: { label: 'Double booked', rank: 9, cell: 'x', icon: 'alert' },
    request: { label: 'Waiting on you', rank: 6, cell: 'r', icon: 'bell' },
    hold: { label: 'Held', rank: 4, cell: 'r', icon: 'lock' },
    channel: { label: 'Other platform', rank: 3, cell: 'c', icon: 'link' },
    block: { label: 'Blocked', rank: 2, cell: 'h', icon: 'lock' },
    maintenance: { label: 'Maintenance', rank: 2, cell: 'h', icon: 'tool' }
  };
  var LEGEND_SWATCH = {
    booking: 'var(--cc-grad)', active: 'linear-gradient(120deg,#0F9F7F,#14B8A6)', done: '#C9CBDA',
    clash: 'repeating-linear-gradient(45deg,#E11D48 0 4px,#F4577B 4px 8px)', request: '#FFF4DB;box-shadow:inset 0 0 0 1.5px #F5B12E',
    hold: '#F5B12E', channel: '#4F6DFF',
    block: '#E7E8F0;background-image:repeating-linear-gradient(135deg,rgba(51,54,79,.22) 0 3px,transparent 3px 6px)',
    maintenance: '#FFEBC7;background-image:repeating-linear-gradient(135deg,rgba(217,119,6,.3) 0 3px,transparent 3px 6px)',
    free: 'var(--cc-sunk);box-shadow:inset 0 0 0 1.5px var(--cc-line-2)'
  };
  var BUSY = function (t) { return t === 'booking' || t === 'active' || t === 'done' || t === 'clash' || t === 'request' || t === 'hold' || t === 'channel'; };

  /* ── toast (one per page, outside any transformed ancestor) ─────── */
  var toastEl = null, toastT = null;
  function toast(msg, opt) {
    opt = opt || {};
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'cc-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.className = 'cc-toast' + (opt.bad ? ' bad' : '');
    toastEl.innerHTML = '<span></span>';
    toastEl.firstChild.textContent = msg;
    if (opt.action) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = opt.actionLabel || 'Undo';
      b.onclick = function () { hide(); opt.action(); };
      toastEl.appendChild(b);
    }
    function hide() { toastEl.classList.remove('on'); }
    requestAnimationFrame(function () { toastEl.classList.add('on'); });
    clearTimeout(toastT);
    toastT = setTimeout(hide, opt.ms || (opt.action ? 6500 : 3600));
    try { if (opt.buzz !== false && navigator.vibrate) navigator.vibrate(12); } catch (e) {}
  }

  /* ══════════════════════════════════════════════════════════════════
     AGENDA STORE · notes, tasks and reminders
     Rows live in calendar_agenda (owner-only RLS). If the table is not
     reachable the store degrades to this browser, and says so, rather
     than losing what the person typed.
     ══════════════════════════════════════════════════════════════════ */
  function agendaStore(o) {
    var client = o.client, local = false, KEY = 'cabana-cal-agenda-v1';
    var st = { scope: o.scope || 'general', subjectId: o.subjectId || null, subjectLabel: o.subjectLabel || null };
    function readLocal() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
    function writeLocal(rows) { try { localStorage.setItem(KEY, JSON.stringify(rows)); } catch (e) {} }
    function missing(err) { return err && /42P01|PGRST20[25]|calendar_agenda|does not exist|schema cache/i.test((err.code || '') + ' ' + (err.message || '')); }
    function keep(r) {
      if (!st.subjectId) return true;
      return !r.subject_id || r.subject_id === st.subjectId || r.scope === 'general';
    }
    return {
      get local() { return local; },
      setSubject: function (id, label, scope) { st.subjectId = id || null; st.subjectLabel = label || null; if (scope) st.scope = scope; },
      subject: function () { return st; },
      list: function (from, to) {
        if (local || !client) return Promise.resolve(readLocal().filter(function (r) { return r.on_date >= from && r.on_date <= to && keep(r); }));
        var q = client.from('calendar_agenda').select('*').gte('on_date', from).lte('on_date', to).order('on_date').order('at_time', { nullsFirst: true }).limit(500);
        if (st.subjectId) q = q.or('subject_id.eq.' + st.subjectId + ',scope.eq.general');
        return q.then(function (r) {
          if (r.error) { if (missing(r.error)) { local = true; return this.list(from, to); } throw r.error; }
          return r.data || [];
        }.bind(this));
      },
      due: function () {
        if (local || !client) {
          var now = Date.now();
          return Promise.resolve(readLocal().filter(function (r) { return r.remind_at && !r.done_at && Date.parse(r.remind_at) > now - 36e5; }));
        }
        return client.from('calendar_agenda').select('*').not('remind_at', 'is', null).is('done_at', null)
          .gte('remind_at', new Date(Date.now() - 36e5).toISOString())
          .lte('remind_at', new Date(Date.now() + 864e5).toISOString()).limit(100)
          .then(function (r) { return r.error ? [] : (r.data || []); });
      },
      save: function (item) {
        var row = {
          kind: item.kind || 'note', title: String(item.title || '').trim().slice(0, 160),
          body: item.body ? String(item.body).slice(0, 2000) : null,
          on_date: item.on_date, at_time: item.at_time || null, remind_at: item.remind_at || null,
          booking_ref: item.booking_ref || null,
          scope: item.scope || st.scope, subject_id: item.subject_id === undefined ? st.subjectId : item.subject_id,
          subject_label: item.subject_label === undefined ? st.subjectLabel : item.subject_label
        };
        if (!row.title) return Promise.reject(new Error('Give it a title first.'));
        if (local || !client) {
          var rows = readLocal();
          if (item.id) rows = rows.map(function (r) { return r.id === item.id ? Object.assign({}, r, row) : r; });
          else rows.push(Object.assign({ id: 'local-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), created_at: new Date().toISOString() }, row));
          writeLocal(rows);
          return Promise.resolve(row);
        }
        var q = item.id ? client.from('calendar_agenda').update(row).eq('id', item.id).select().single()
                        : client.from('calendar_agenda').insert(row).select().single();
        return q.then(function (r) {
          if (r.error) { if (missing(r.error)) { local = true; return this.save(item); } throw r.error; }
          return r.data;
        }.bind(this));
      },
      remove: function (id) {
        if (local || !client || /^local-/.test(id)) { writeLocal(readLocal().filter(function (r) { return r.id !== id; })); return Promise.resolve(); }
        return client.from('calendar_agenda').delete().eq('id', id).then(function (r) { if (r.error) throw r.error; });
      },
      setDone: function (id, done) {
        var at = done ? new Date().toISOString() : null;
        if (local || !client || /^local-/.test(id)) {
          writeLocal(readLocal().map(function (r) { return r.id === id ? Object.assign({}, r, { done_at: at }) : r; }));
          return Promise.resolve();
        }
        return client.from('calendar_agenda').update({ done_at: at }).eq('id', id).then(function (r) { if (r.error) throw r.error; });
      }
    };
  }

  /* ══════════════════════════════════════════════════════════════════
     MOUNT
     ══════════════════════════════════════════════════════════════════ */
  function mount(root, opts) {
    opts = Object.assign({
      mode: 'nightly', views: ['month', 'timeline', 'agenda', 'year'], view: 'month',
      weekStart: 1, readOnly: false, allowPast: false, unit: 'night', units: 'nights',
      resourceNoun: 'listing', resources: [], resource: null, legend: null,
      rangeActions: null, eventView: null, briefing: null, agenda: null,
      emptyHint: null, onResource: null, onView: null, onWindow: null, onEventOpen: null,
      subjectScope: 'stay', title: null, compact: false, onSelect: null
    }, opts || {});
    if (opts.compact) { opts.views = ['month']; opts.readOnly = true; }

    var S = {
      view: opts.views.indexOf(opts.view) >= 0 ? opts.view : opts.views[0],
      cursor: monthStart(opts.date || today()),
      res: opts.resource || (opts.resources[0] && opts.resources[0].id) || null,
      resources: opts.resources.slice(),
      events: [], items: [], sel: null, anchor: null, focus: null,
      mode: 'brief', editor: null, busy: false, acts: [], pop: false, loaded: false
    };
    var nightly = opts.mode !== 'daily';

    root.classList.add('cc');
    if (opts.compact) root.classList.add('cc-compact');
    root.innerHTML =
      '<section class="cc-stage" aria-label="Calendar">' +
        '<div class="cc-tb"></div>' +
        '<div class="cc-stats" aria-label="This month at a glance"></div>' +
        '<div class="cc-view" tabindex="-1"></div>' +
        '<div class="cc-legend"></div>' +
      '</section>' +
      '<aside class="cc-insp" aria-label="Details and actions"><div class="cc-insp-grip" aria-hidden="true"></div><div class="cc-insp-b"></div><div class="cc-insp-f"></div></aside>' +
      '<div class="cc-scrim"></div>' +
      '<div class="cc-dock" role="region" aria-label="Selected dates"></div>' +
      '<button type="button" class="cc-fab" aria-label="Open today’s briefing">' + ico('today') + '<span>Today</span></button>';

    var $tb = root.querySelector('.cc-tb'), $stats = root.querySelector('.cc-stats'),
        $view = root.querySelector('.cc-view'), $legend = root.querySelector('.cc-legend'),
        $insp = root.querySelector('.cc-insp'), $ib = root.querySelector('.cc-insp-b'),
        $if = root.querySelector('.cc-insp-f'), $dock = root.querySelector('.cc-dock'),
        $fab = root.querySelector('.cc-fab'), $stage = root.querySelector('.cc-stage');

    var mqSmall = global.matchMedia ? global.matchMedia('(max-width: 640px)') : { matches: false };
    var mqSheet = global.matchMedia ? global.matchMedia('(max-width: 1120px)') : { matches: false };

    /* ── data helpers ─────────────────────────────────────────────── */
    function resOf(id) { for (var i = 0; i < S.resources.length; i++) if (S.resources[i].id === id) return S.resources[i]; return null; }
    function evFor(res) {
      return S.events.filter(function (e) { return !res || !e.resource || e.resource === res; });
    }
    function dayMap(res, from, to) {
      var m = {};
      evFor(res).forEach(function (e) {
        var s = e.start < from ? from : e.start, end = e.end > to ? to : e.end;
        for (var d = s; d < end; d = add(d, 1)) (m[d] = m[d] || []).push(e);
      });
      return m;
    }
    function itemsOn(d) {
      return S.items.filter(function (it) { return it.on_date === d && (!it.subject_id || !S.res || it.subject_id === S.res || it.scope === 'general'); });
    }
    function topType(list) {
      var best = null;
      (list || []).forEach(function (e) { if (!best || (TYPES[e.type] || {}).rank > (TYPES[best.type] || {}).rank) best = e; });
      return best;
    }
    function isPast(d) { return !opts.allowPast && d < today(); }

    /* ── selection context: everything an action needs to decide ──── */
    function ctx() {
      if (!S.sel) return null;
      var sel = S.sel, from = sel.start, to = add(sel.end, 1);
      var map = dayMap(sel.res, from, to), days = [], free = [], busy = [], hostDays = [];
      for (var d = from; d < to; d = add(d, 1)) {
        days.push(d);
        var on = map[d] || [];
        if (!on.length) free.push(d);
        if (on.some(function (e) { return BUSY(e.type); })) busy.push(d);
        if (on.some(function (e) { return e.type === 'block' || e.type === 'maintenance'; })) hostDays.push(d);
      }
      var evs = evFor(sel.res).filter(function (e) { return e.start < to && e.end > from; });
      return {
        resource: sel.res, resourceInfo: resOf(sel.res), start: from, last: sel.end, end: to,
        count: days.length, days: days, free: free, busy: busy, hostDays: hostDays,
        events: evs, bookings: evs.filter(function (e) { return BUSY(e.type); }),
        blocks: evs.filter(function (e) { return e.type === 'block' || e.type === 'maintenance'; }),
        items: S.items.filter(function (it) { return it.on_date >= from && it.on_date < to; }),
        past: from < today(), nightly: nightly
      };
    }
    function rangeLabel(c) {
      var n = c.count, u = n === 1 ? opts.unit : opts.units;
      if (n === 1) return fDay(c.start) + ' · 1 ' + u;
      if (nightly) return fShort(c.start) + ' → ' + fShort(c.end) + ' · ' + n + ' ' + u;
      return fShort(c.start) + ' – ' + fShort(c.last) + ' · ' + n + ' ' + u;
    }

    /* ── toolbar ──────────────────────────────────────────────────── */
    var VIEWLBL = { month: 'Month', timeline: 'Timeline', agenda: 'Agenda', year: 'Year' };
    function paintToolbar() {
      var c = S.cursor, title;
      if (S.view === 'year') title = '<span>' + parse(c).getFullYear() + '</span>';
      else if (S.view === 'agenda') title = '<span>Up next</span>';
      else title = '<span>' + monthName(c) + '</span> <small>' + parse(c).getFullYear() + '</small>';
      var resSel = '';
      if (S.resources.length > 1 && S.view !== 'timeline') {
        resSel = '<select class="cc-res" aria-label="Choose ' + esc(opts.resourceNoun) + '">' +
          S.resources.map(function (r) { return '<option value="' + esc(r.id) + '"' + (r.id === S.res ? ' selected' : '') + '>' + esc(r.title) + (r.flag ? ' · ' + esc(r.flag) : '') + '</option>'; }).join('') + '</select>';
      }
      $tb.innerHTML =
        (S.view !== 'agenda'
          ? '<div class="cc-nav"><button type="button" data-cc="prev" aria-label="Previous">' + ico('left') + '</button><button type="button" data-cc="next" aria-label="Next">' + ico('right') + '</button></div>' +
            '<button type="button" class="cc-today-btn" data-cc="today">Today</button>'
          : '') +
        '<button type="button" class="cc-title" data-cc="pop" aria-haspopup="dialog" aria-expanded="' + S.pop + '" aria-label="Jump to a month">' + title + (S.view !== 'agenda' ? ico('down') : '') + '</button>' +
        '<span class="cc-tb-sp"></span>' + resSel +
        (opts.views.length > 1
          ? '<div class="cc-seg" role="group" aria-label="View">' + opts.views.map(function (v) {
              return '<button type="button" data-cc="view" data-v="' + v + '" aria-pressed="' + (S.view === v) + '" title="' + VIEWLBL[v] + ' (' + v[0].toUpperCase() + ')">' + ico(v) + '<span>' + VIEWLBL[v] + '</span></button>';
            }).join('') + '</div>'
          : '');
    }

    /* ── stats for the visible month ──────────────────────────────── */
    function monthFacts(res, mStart) {
      var from = mStart, to = addMonths(mStart, 1), map = dayMap(res, from, to);
      var n = diff(from, to), booked = 0, blocked = 0, free = 0, open = 0, arrivals = 0, gaps = 0, tdy = today();
      for (var d = from; d < to; d = add(d, 1)) {
        var on = map[d] || [];
        var b = on.some(function (e) { return BUSY(e.type) && e.type !== 'request'; });
        var h = on.some(function (e) { return e.type === 'block' || e.type === 'maintenance'; });
        if (b) booked++; else if (h) blocked++; else { free++; if (d >= tdy) open++; }
      }
      evFor(res).forEach(function (e) { if (BUSY(e.type) && e.type !== 'channel' && e.start >= from && e.start < to) arrivals++; });
      // Orphan gaps: 1–2 open nights boxed in by bookings. The hardest
      // nights to sell, and the ones worth a discount or a block.
      if (nightly) {
        var run = 0, prevBusy = false;
        for (var g = from; g < to; g = add(g, 1)) {
          var onG = map[g] || [], busyG = onG.length > 0;
          if (!busyG && g >= tdy) run++;
          else { if (run && run <= 2 && prevBusy && busyG) gaps += run; run = 0; prevBusy = busyG; }
          if (busyG) prevBusy = true;
        }
      }
      var sellable = n - blocked;
      return { days: n, booked: booked, blocked: blocked, free: free, open: open, arrivals: arrivals, gaps: gaps,
               occ: sellable > 0 ? Math.round(booked / sellable * 100) : 0 };
    }
    function paintStats() {
      if (S.view !== 'month') { $stats.style.display = 'none'; return; }
      $stats.style.display = '';
      var m = monthFacts(S.res, S.cursor);
      var u = opts.units;
      $stats.innerHTML =
        '<div class="cc-stat"><div class="cc-ring" style="--p:' + m.occ + '"></div><div><b>' + m.occ + '%</b><small>Occupancy</small></div></div>' +
        '<div class="cc-stat"><i style="background:var(--cc-accent-soft);color:var(--cc-accent)">' + ico('user') + '</i><div><b>' + m.booked + '</b><small>' + cap(u) + ' booked</small></div></div>' +
        '<div class="cc-stat"><i style="background:rgba(15,159,127,.1);color:var(--cc-good)">' + ico('unlock') + '</i><div><b>' + m.open + '</b><small>Open to sell</small></div></div>' +
        '<div class="cc-stat"><i style="background:rgba(51,54,79,.08);color:var(--cc-block)">' + ico('lock') + '</i><div><b>' + m.blocked + '</b><small>Blocked</small></div></div>' +
        '<div class="cc-stat"><i style="background:rgba(245,177,46,.14);color:#B47908">' + ico('in') + '</i><div><b>' + m.arrivals + '</b><small>' + (nightly ? 'Arrivals' : 'Hires') + '</small></div></div>' +
        (m.gaps ? '<div class="cc-stat" title="Open nights boxed in by bookings"><i style="background:rgba(225,29,72,.08);color:#BE123C">' + ico('spark') + '</i><div><b>' + m.gaps + '</b><small>Gap ' + u + '</small></div></div>' : '');
    }
    function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

    /* ── legend ───────────────────────────────────────────────────── */
    function paintLegend() {
      var types = opts.legend || ['booking', 'channel', 'block', 'maintenance', 'clash'];
      $legend.innerHTML = types.map(function (t) {
        var label = typeof t === 'object' ? t.label : (TYPES[t] ? TYPES[t].label : t);
        var key = typeof t === 'object' ? t.type : t;
        return '<span class="cc-lg"><i style="background:' + (LEGEND_SWATCH[key] || '#ccc') + '"></i>' + esc(label) + '</span>';
      }).join('') +
      '<span class="cc-lg"><i style="background:' + LEGEND_SWATCH.free + '"></i>Available</span>' +
      (opts.readOnly ? '' : '<span class="cc-lg-hint">Drag to select · <kbd>?</kbd> shortcuts</span>');
    }

    /* ══ MONTH ═════════════════════════════════════════════════════ */
    function gridStart(mStart) {
      var off = (dow(mStart) - opts.weekStart + 7) % 7;
      return add(mStart, -off);
    }
    function maxLanes() { return mqSmall.matches ? 2 : 3; }

    function barHTML(e, x0, x1, lane, cutL, cutR, extra) {
      var t = e.type || 'booking', past = e.end <= today();
      var name = e.title || (TYPES[t] || {}).label || '';
      var width = x1 - x0;
      var cls = 'cc-bar t-' + t + (cutL ? ' cut-l' : '') + (cutR ? ' cut-r' : '') + (past && t !== 'clash' ? ' is-past' : '') + (S.focus === e.id ? ' is-focus' : '') + (extra || '');
      var style = (e.color ? '--ev:' + esc(e.color) + ';' : '');
      var label = width < .9 ? '' :
        '<span class="cc-bl">' + esc(name) + (e.short && width > 2.2 ? ' <span class="cc-bs">' + esc(e.short) + '</span>' : '') + '</span>';
      var av = e.avatar || (t === 'block' || t === 'maintenance' ? '' : initials(name));
      var avHTML = t === 'block' ? '<span class="cc-av">' + ico('lock') + '</span>'
                 : t === 'maintenance' ? '<span class="cc-av">' + ico('tool') + '</span>'
                 : '<span class="cc-av">' + esc(av) + '</span>';
      var aria = (TYPES[t] ? TYPES[t].label : t) + ': ' + name + ', ' + fShort(e.start) + ' to ' + fShort(e.end);
      return { cls: cls, style: style, inner: avHTML + label, aria: aria };
    }

    function paintMonth() {
      var mStart = S.cursor, gs = gridStart(mStart), mEnd = addMonths(mStart, 1);
      var weeks = Math.ceil((diff(gs, mEnd)) / 7);
      var ge = add(gs, weeks * 7);
      var map = dayMap(S.res, gs, ge), tdy = today();
      var names = [];
      for (var k = 0; k < 7; k++) {
        var dd = add(gs, k), wd = dow(dd);
        names.push('<span class="' + (wd === 0 || wd === 6 ? 'we' : '') + '">' + f(dd, { weekday: mqSmall.matches ? 'narrow' : 'short' }) + '</span>');
      }
      var lanesMax = maxLanes();
      var html = '<div class="cc-dow" aria-hidden="true">' + names.join('') + '</div><div class="cc-weeks" role="grid" aria-label="' + esc(monthName(mStart) + ' ' + parse(mStart).getFullYear()) + '">';
      var evs = evFor(S.res).filter(function (e) { return e.end > gs && e.start < ge; })
        .sort(function (a, b) { return a.start < b.start ? -1 : a.start > b.start ? 1 : (diff(b.start, b.end) - diff(a.start, a.end)); });

      for (var w = 0; w < weeks; w++) {
        var ws = add(gs, w * 7), we = add(ws, 7);
        // Lay bars out in lanes, greedy, longest first on ties.
        var segs = [];
        evs.forEach(function (e) {
          if (!(e.end > ws && e.start < (nightly ? add(we, 0) : we))) {
            // nightly bars can also poke into this week on their checkout day
            if (!(nightly && e.end === ws)) return;
          }
          var x0, x1, cutL = false, cutR = false;
          if (nightly) {
            x0 = diff(ws, e.start) + .5; x1 = diff(ws, e.end) + .5;
            if (x0 < 0) { x0 = 0; cutL = true; }
            if (x1 > 7) { x1 = 7; cutR = true; }
            if (x1 - x0 <= .05) return;
          } else {
            x0 = Math.max(0, diff(ws, e.start)); x1 = Math.min(7, diff(ws, e.end));
            cutL = e.start < ws; cutR = e.end > we;
            if (x1 <= x0) return;
          }
          segs.push({ e: e, x0: x0, x1: x1, cutL: cutL, cutR: cutR });
        });
        var laneEnd = [], hidden = {};
        segs.forEach(function (s) {
          var lane = -1;
          for (var l = 0; l < laneEnd.length; l++) if (laneEnd[l] <= s.x0 + .01) { lane = l; break; }
          if (lane < 0) { lane = laneEnd.length; laneEnd.push(0); }
          laneEnd[lane] = s.x1;
          s.lane = lane;
          if (lane >= lanesMax) {
            for (var c = Math.floor(s.x0); c < Math.ceil(s.x1); c++) hidden[c] = (hidden[c] || 0) + 1;
          }
        });

        html += '<div class="cc-week" role="row">';
        html += '<div class="cc-days">';
        for (var i = 0; i < 7; i++) {
          var d = add(ws, i), on = map[d] || [], out = d < mStart || d >= mEnd, past = isPast(d);
          var clash = on.some(function (e) { return e.type === 'clash'; });
          var its = itemsOn(d);
          var inSel = S.sel && S.sel.res === S.res && d >= S.sel.start && d <= S.sel.end;
          var cls = 'cc-day' + (out ? ' is-out' : '') + (past ? ' is-past' : '') + (d === tdy ? ' is-today' : '') +
                    (inSel ? ' is-sel' : '') + (inSel && d === S.sel.start ? ' is-sel-a' : '') + (inSel && d === S.sel.end ? ' is-sel-b' : '') +
                    (clash ? ' is-clash' : '');
          var pips = '';
          var kinds = {};
          its.forEach(function (it) { if (!it.done_at) kinds[it.kind] = 1; });
          ['reminder', 'task', 'note'].forEach(function (k) { if (kinds[k]) pips += '<span class="cc-pip ' + k + '" title="' + k + '">' + ico(k === 'reminder' ? 'bell' : k) + '</span>'; });
          var more = hidden[i] ? '<span class="cc-more">+' + hidden[i] + '</span>' : '';
          var freeTxt = !on.length && !opts.readOnly ? '<span class="cc-free">' + (nightly ? 'Open' : 'Free') + '</span>' : '';
          var desc = fLong(d) + (on.length ? ': ' + on.map(function (e) { return (TYPES[e.type] || {}).label + ' ' + (e.title || ''); }).join(', ') : ': available') +
                     (clash ? '. DOUBLE BOOKED' : '') + (its.length ? '. ' + its.length + ' note' + (its.length > 1 ? 's' : '') : '');
          html += '<button type="button" role="gridcell" class="' + cls + '" data-d="' + d + '" aria-label="' + esc(desc) + '" aria-selected="' + !!inSel + '"' + (d === tdy ? ' aria-current="date"' : '') + ' tabindex="' + (d === (S.kbd || tdy) ? '0' : '-1') + '">' +
                  '<span class="cc-n">' + parse(d).getDate() + '</span><span class="cc-foot">' + pips + more + freeTxt + '</span></button>';
        }
        html += '</div><div class="cc-bars">';
        segs.forEach(function (s) {
          if (s.lane >= lanesMax) return;
          var b = barHTML(s.e, s.x0, s.x1, s.lane, s.cutL, s.cutR);
          var inset = 2;
          html += '<button type="button" class="' + b.cls + '" data-ev="' + esc(s.e.id) + '" aria-label="' + esc(b.aria) + '" style="' + b.style +
            'left:calc(' + (s.x0 / 7 * 100) + '% + ' + (s.cutL ? 0 : inset) + 'px);width:calc(' + ((s.x1 - s.x0) / 7 * 100) + '% - ' + ((s.cutL ? 0 : inset) + (s.cutR ? 0 : inset)) + 'px);' +
            'top:calc(var(--cc-bar-top) + ' + s.lane + ' * (var(--cc-bar) + var(--cc-bar-gap)))">' + b.inner + '</button>';
        });
        html += '</div></div>';
      }
      html += '</div>';
      $view.innerHTML = html;
    }

    /* ══ TIMELINE ══════════════════════════════════════════════════ */
    function tlWindow() {
      // In the current month, start just before today so the weeks ahead
      // are what fills the screen; elsewhere, start on the 1st.
      var from = S.cursor === monthStart(today()) ? add(today(), -3) : S.cursor;
      return { from: from, to: add(from, 42) };
    }
    function paintTimeline() {
      var win = tlWindow(), n = diff(win.from, win.to), tdy = today();
      var list = S.resources.length ? S.resources : [{ id: S.res, title: 'Calendar' }];
      var head = '';
      for (var i = 0; i < n; i++) {
        var d = add(win.from, i), wd = dow(d);
        head += '<div class="cc-tl-hd' + (wd === 0 || wd === 6 ? ' we' : '') + (d === tdy ? ' is-today' : '') + (d.slice(8) === '01' ? ' m1' : '') + '">' +
          (d.slice(8) === '01' || i === 0 ? monthName(d, true) : f(d, { weekday: 'narrow' })) + '<b>' + parse(d).getDate() + '</b></div>';
      }
      var rows = '';
      list.forEach(function (r) {
        var photo = r.photo ? ' style="background-image:url(&quot;' + esc(r.photo) + '&quot;)"' : '';
        var mf = monthFacts(r.id, S.cursor);
        rows += '<button type="button" class="cc-tl-rh" data-res="' + esc(r.id) + '" title="Open ' + esc(r.title) + ' in month view">' +
          '<span class="cc-th"' + photo + '>' + (r.photo ? '' : esc(initials(r.title))) + '</span>' +
          '<span style="min-width:0"><b>' + esc(r.title) + '</b><small>' + esc(r.sub || (mf.occ + '% booked · ' + mf.open + ' open')) + '</small></span></button>';
        rows += '<div class="cc-tl-row" data-res="' + esc(r.id) + '" style="width:calc(' + n + ' * var(--cc-col))">';
        for (var j = 0; j < n; j++) {
          var dd = add(win.from, j), wd2 = dow(dd);
          var inSel = S.sel && S.sel.res === r.id && dd >= S.sel.start && dd <= S.sel.end;
          rows += '<div class="cc-tl-cell' + (wd2 === 0 || wd2 === 6 ? ' we' : '') + (isPast(dd) ? ' is-past' : '') + (dd === tdy ? ' is-today' : '') + (inSel ? ' is-sel' : '') + '" data-d="' + dd + '" data-res="' + esc(r.id) + '" role="gridcell" aria-label="' + esc(r.title + ', ' + fLong(dd)) + '"></div>';
        }
        var evs = S.events.filter(function (e) { return e.resource === r.id && e.end > win.from && e.start < win.to; })
          .sort(function (a, b) { return a.start < b.start ? -1 : 1; });
        var laneEnd = [];
        evs.forEach(function (e) {
          var x0 = diff(win.from, e.start) + (nightly ? .5 : 0), x1 = diff(win.from, e.end) + (nightly ? .5 : 0), cutL = false, cutR = false;
          if (x0 < 0) { x0 = 0; cutL = true; }
          if (x1 > n) { x1 = n; cutR = true; }
          if (x1 - x0 <= .05) return;
          var lane = laneEnd[0] == null || laneEnd[0] <= x0 + .01 ? 0 : 1;
          laneEnd[lane] = x1;
          e._lane = lane;
          var b = barHTML(e, x0, x1, lane, cutL, cutR, ' lane' + lane);
          rows += '<button type="button" class="' + b.cls + '" data-ev="' + esc(e.id) + '" aria-label="' + esc(b.aria) + '" style="' + b.style +
            'left:calc(' + x0 + ' * var(--cc-col) + ' + (cutL ? 0 : 2) + 'px);width:calc(' + (x1 - x0) + ' * var(--cc-col) - ' + ((cutL ? 0 : 2) + (cutR ? 0 : 2)) + 'px)">' + b.inner + '</button>';
        });
        rows += '</div>';
      });
      var now = diff(win.from, tdy);
      var oldSc = $view.querySelector('.cc-tl'), keep = oldSc && S._tlFrom === win.from ? { l: oldSc.scrollLeft, t: oldSc.scrollTop } : null;
      S._tlFrom = win.from;
      $view.innerHTML =
        '<div class="cc-tl" role="grid" aria-label="Timeline">' +
          '<div class="cc-tl-grid">' +
            '<div class="cc-tl-corner">' + esc(cap(opts.resourceNoun)) + 's</div>' +
            '<div class="cc-tl-head" style="width:calc(' + n + ' * var(--cc-col))">' + head + '</div>' +
            rows +
          '</div>' +
        '</div>';
      // Fix up rows that have a second lane so both lanes are visible.
      $view.querySelectorAll('.cc-tl-row').forEach(function (row) {
        if (row.querySelector('.lane1')) row.querySelectorAll('.lane0').forEach(function (b) { b.classList.add('stacked'); });
      });
      if (keep) { var sc0 = $view.querySelector('.cc-tl'); sc0.scrollLeft = keep.l; sc0.scrollTop = keep.t; }
      else if (now >= 0 && now < n && !S._tlScrolled) {
        S._tlScrolled = true;
        var sc = $view.querySelector('.cc-tl');
        requestAnimationFrame(function () {
          var col = sc.querySelector('.cc-tl-hd'), w = col ? col.getBoundingClientRect().width : 50;
          sc.scrollLeft = Math.max(0, (now - 2) * w);
        });
      }
    }

    /* ══ AGENDA ════════════════════════════════════════════════════ */
    function paintAgenda() {
      var tdy = today(), from = tdy, to = add(tdy, 90), days = {};
      function push(d, it) { if (d < from || d > to) return; (days[d] = days[d] || []).push(it); }
      evFor(S.resources.length > 1 && S.view === 'agenda' && opts.agendaAll ? null : S.res).forEach(function (e) {
        var r = resOf(e.resource), where = r && S.resources.length > 1 ? ' · ' + r.title : '';
        var t = e.type;
        if (t === 'block' || t === 'maintenance') {
          push(e.start, { k: t, ev: e, title: (t === 'block' ? 'Blocked' : 'Maintenance') + ' until ' + fShort(nightly ? e.end : add(e.end, -1)), sub: (e.note || '') + where, sort: 3 });
          return;
        }
        var arrive = nightly ? 'Arrives' : 'Pick-up';
        var leave = nightly ? 'Checks out' : 'Return';
        push(e.start, { k: t === 'channel' ? 'channel' : t === 'request' ? 'request' : 'in', ev: e, title: arrive + ' · ' + (e.title || 'Guest'), sub: (e.detail || (diff(e.start, e.end) + ' ' + (diff(e.start, e.end) === 1 ? opts.unit : opts.units))) + where, sort: 1 });
        var outDay = nightly ? e.end : add(e.end, -1);
        if (outDay !== e.start || !nightly) push(outDay, { k: 'out', ev: e, title: leave + ' · ' + (e.title || 'Guest'), sub: (nightly ? 'Turnover day' : 'Car back') + where, sort: 0 });
      });
      S.items.forEach(function (it) {
        push(it.on_date, { k: it.kind, item: it, title: it.title, sub: [it.at_time ? String(it.at_time).slice(0, 5) : '', it.subject_label || '', it.body || ''].filter(Boolean).join(' · '), sort: 2 });
      });
      var keys = Object.keys(days).sort();
      if (!keys.length) {
        $view.innerHTML = '<div class="cc-ag-empty"><b>A clear run ahead</b>Nothing is booked, blocked or noted for the next 90 days.' +
          (opts.readOnly ? '' : '<div style="margin-top:14px"><button type="button" class="cc-btn primary sm" data-cc="new-note">' + ico('plus') + 'Add a note or reminder</button></div>') + '</div>';
        return;
      }
      var icon = { in: 'in', out: 'out', channel: 'link', request: 'bell', block: 'lock', maintenance: 'tool', note: 'note', task: 'task', reminder: 'bell' };
      $view.innerHTML = '<div class="cc-ag">' + keys.map(function (d) {
        var list = days[d].sort(function (a, b) { return a.sort - b.sort; });
        var r = rel(d);
        return '<div class="cc-ag-day' + (d === tdy ? ' is-today' : '') + '"><div class="cc-ag-date"><small>' + f(d, { weekday: 'short' }) + '</small><b>' + parse(d).getDate() + '</b><em>' + (r || monthName(d, true)) + '</em></div>' +
          '<div class="cc-ag-list">' + list.map(function (x) {
            var done = x.item && x.item.done_at;
            var attr = x.ev ? 'data-ev="' + esc(x.ev.id) + '"' : 'data-item="' + esc(x.item.id) + '"';
            var check = x.item && x.item.kind !== 'note' ? '<span class="cc-check' + (done ? ' on' : '') + '" data-done="' + esc(x.item.id) + '" role="checkbox" aria-checked="' + !!done + '" aria-label="Mark done">' + ico('check') + '</span>' : '';
            return '<button type="button" class="cc-ag-it' + (done ? ' is-done' : '') + '" ' + attr + '>' +
              '<span class="cc-ag-ic k-' + x.k + '"' + (x.ev && x.ev.color ? ' style="--ev:' + esc(x.ev.color) + '"' : '') + '>' + ico(icon[x.k] || 'spark') + '</span>' +
              '<span class="cc-ag-tx"><b>' + esc(x.title) + '</b>' + (x.sub ? '<small>' + esc(x.sub) + '</small>' : '') + '</span>' + check +
              '<span class="cc-ag-go">' + ico('right') + '</span></button>';
          }).join('') + '</div></div>';
      }).join('') + '</div>';
    }

    /* ══ YEAR ══════════════════════════════════════════════════════ */
    function paintYear() {
      var y = parse(S.cursor).getFullYear(), tdy = today(), html = '<div class="cc-yr">';
      for (var m = 0; m < 12; m++) {
        var ms = y + '-' + pad(m + 1) + '-01', me = addMonths(ms, 1), map = dayMap(S.res, ms, me);
        var facts = monthFacts(S.res, ms);
        var lead = (dow(ms) - opts.weekStart + 7) % 7, cells = '';
        for (var i = 0; i < lead; i++) cells += '<i class="o"></i>';
        for (var d = ms; d < me; d = add(d, 1)) {
          var top = topType(map[d]);
          var c = top ? (TYPES[top.type] || {}).cell || 'b' : '';
          cells += '<i class="' + c + (d < tdy ? ' p' : '') + (d === tdy ? ' t' : '') + '"></i>';
        }
        html += '<button type="button" class="cc-ym' + (ms === monthStart(tdy) ? ' is-cur' : '') + '" data-month="' + ms + '" aria-label="' + esc(monthName(ms) + ', ' + facts.occ + '% booked') + '">' +
          '<div class="cc-ym-h"><b>' + monthName(ms) + '</b><small>' + facts.occ + '%</small></div>' +
          '<div class="cc-ym-g">' + cells + '</div><div class="cc-ym-bar"><span style="width:' + facts.occ + '%"></span></div></button>';
      }
      $view.innerHTML = html + '</div>';
    }

    /* ── paint everything ─────────────────────────────────────────── */
    function paint(dir) {
      paintToolbar(); paintStats();
      $view.classList.remove('cc-in-l', 'cc-in-r', 'cc-in-f');
      if (S.view === 'month') paintMonth();
      else if (S.view === 'timeline') paintTimeline();
      else if (S.view === 'agenda') paintAgenda();
      else paintYear();
      if (dir) { void $view.offsetWidth; $view.classList.add(dir < 0 ? 'cc-in-l' : dir > 0 ? 'cc-in-r' : 'cc-in-f'); }
      if (S.pop) paintPop();
      root.classList.toggle('has-sel', !!S.sel);
      paintDock();
      paintInspector();
      uiFlag();
    }
    function paintSelOnly() {
      $view.querySelectorAll('[data-d]').forEach(function (el) {
        var d = el.getAttribute('data-d'), r = el.getAttribute('data-res') || S.res;
        var on = S.sel && S.sel.res === r && d >= S.sel.start && d <= S.sel.end;
        el.classList.toggle('is-sel', !!on);
        el.classList.toggle('is-sel-a', !!(on && d === S.sel.start));
        el.classList.toggle('is-sel-b', !!(on && d === S.sel.end));
        if (el.classList.contains('cc-day')) el.setAttribute('aria-selected', !!on);
      });
      root.classList.toggle('has-sel', !!S.sel);
      paintDock();
    }

    /* ── month / year jump popover ─────────────────────────────────── */
    function paintPop() {
      var old = $stage.querySelector('.cc-pop'); if (old) old.remove();
      if (!S.pop || S.view === 'agenda') return;
      var y = S.popYear || parse(S.cursor).getFullYear(), cur = S.cursor, now = monthStart(today());
      var el = document.createElement('div');
      el.className = 'cc-pop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Jump to month');
      var g = '';
      for (var m = 0; m < 12; m++) {
        var ms = y + '-' + pad(m + 1) + '-01';
        g += '<button type="button" data-jump="' + ms + '" aria-current="' + (ms === cur) + '" class="' + (ms === now ? 'is-now' : '') + '">' + monthName(ms, true) + '</button>';
      }
      el.innerHTML = '<div class="cc-pop-h"><button type="button" data-popy="-1" aria-label="Previous year">' + ico('left') + '</button><b>' + y + '</b><button type="button" data-popy="1" aria-label="Next year">' + ico('right') + '</button></div><div class="cc-pop-g">' + g + '</div>';
      $stage.appendChild(el);
    }

    /* ══ INSPECTOR ═════════════════════════════════════════════════ */
    function act(a) { S.acts.push(a); return S.acts.length - 1; }
    function btn(a, cls) {
      var i = act(a);
      if (a.href) return '<a class="cc-btn ' + (cls || a.tone || 'ghost') + (a.wide ? ' wide' : '') + '" href="' + esc(a.href) + '" data-a="' + i + '"' + (a.target ? ' target="' + esc(a.target) + '" rel="noopener"' : '') + '>' + (a.icon ? ico(a.icon) : '') + esc(a.label) + '</a>';
      return '<button type="button" class="cc-btn ' + (cls || a.tone || 'ghost') + (a.wide ? ' wide' : '') + '" data-a="' + i + '"' + (a.disabled ? ' disabled' : '') + (a.title ? ' title="' + esc(a.title) + '"' : '') + '>' + (a.icon ? ico(a.icon) : '') + esc(a.label) + '</button>';
    }
    function itemRow(it) {
      var i = act({ run: function () { openEditor(it); } });
      var k = it.kind || 'note', done = !!it.done_at;
      var when = [it.at_time ? String(it.at_time).slice(0, 5) : '', it.remind_at ? 'reminds ' + new Date(it.remind_at).toLocaleString(LOCALE, { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : ''].filter(Boolean).join(' · ');
      return '<div class="cc-li" style="padding-right:8px">' +
        (k !== 'note' ? '<button type="button" class="cc-check' + (done ? ' on' : '') + '" data-done="' + esc(it.id) + '" aria-label="' + (done ? 'Mark not done' : 'Mark done') + '">' + ico('check') + '</button>'
                      : '<span class="cc-ag-ic k-note">' + ico('note') + '</span>') +
        '<button type="button" class="cc-li-tx" data-a="' + i + '" style="text-align:left"><b' + (done ? ' style="text-decoration:line-through;color:var(--cc-faint)"' : '') + '>' + esc(it.title) + '</b>' +
        '<small>' + esc([fDay(it.on_date), when, it.body || ''].filter(Boolean).join(' · ')) + '</small></button></div>';
    }
    function evRow(e) {
      var i = act({ run: function () { focusEvent(e.id); } });
      var t = e.type, r = resOf(e.resource);
      var span = nightly ? fShort(e.start) + ' → ' + fShort(e.end) : fShort(e.start) + ' – ' + fShort(add(e.end, -1));
      return '<button type="button" class="cc-li" data-a="' + i + '"><span class="cc-ag-ic k-' + (t === 'booking' || t === 'active' || t === 'done' ? 'in' : t) + '"' + (e.color ? ' style="--ev:' + esc(e.color) + '"' : '') + '>' + ico((TYPES[t] || {}).icon || 'user') + '</span>' +
        '<span class="cc-li-tx"><b>' + esc(e.title || (TYPES[t] || {}).label) + '</b><small>' + esc(span + (r && S.resources.length > 1 ? ' · ' + r.title : '') + (e.short ? ' · ' + e.short : '')) + '</small></span>' + ico('right') + '</button>';
    }

    function prepDay(e) {
      var d0 = add(e.start, -1), t0 = today();
      if (d0 >= t0) return d0;
      return e.start >= t0 ? e.start : t0;
    }
    function paintInspector() {
      S.acts = [];
      var close = '<button type="button" class="cc-x" data-cc="close" aria-label="Close">' + ico('x') + '</button>';
      var body = '', foot = '';

      if (S.mode === 'editor' && S.editor) {
        body = editorHTML(S.editor);
        foot = '<div class="cc-btns">' + btn({ label: 'Cancel', run: function () { S.mode = S.editorBack || 'brief'; S.editor = null; paintInspector(); } }, 'ghost') +
               btn({ label: S.editor.id ? 'Save changes' : 'Save', icon: 'check', run: saveEditor }, 'primary') + '</div>' +
               (S.editor.id ? btn({ label: 'Delete', icon: 'trash', wide: true, run: function () { deleteItem(S.editor); } }, 'bad sm') : '');
      } else if (S.mode === 'event' && S.focus) {
        var e = S.events.filter(function (x) { return x.id === S.focus; })[0];
        if (!e) { S.mode = S.sel ? 'range' : 'brief'; S.focus = null; return paintInspector(); }
        var v = opts.eventView ? opts.eventView(e, api) || {} : {};
        var r = resOf(e.resource);
        var span = nightly ? fDay(e.start) + ' → ' + fDay(e.end) : fDay(e.start) + ' – ' + fDay(add(e.end, -1));
        var n = diff(e.start, e.end);
        body = close + '<div class="cc-eyebrow">' + esc(v.eyebrow || (TYPES[e.type] || {}).label || 'Event') + '</div>' +
          '<div class="cc-hero t-' + esc(e.type) + '"' + (e.color ? ' style="--ev:' + esc(e.color) + '"' : '') + '><small>' + esc(r ? r.title : '') + '</small><b>' + esc(v.title || e.title || '') + '</b><p>' + esc(span) + ' · ' + n + ' ' + (n === 1 ? opts.unit : opts.units) + '</p></div>' +
          (v.note ? '<div class="cc-note-box ' + esc(v.noteTone || '') + '">' + v.note + '</div>' : '') +
          (v.rows && v.rows.length ? '<div class="cc-rows">' + v.rows.map(function (row) { return '<div class="cc-row"><span>' + esc(row[0]) + '</span><b>' + (row[2] ? row[1] : esc(row[1])) + '</b></div>'; }).join('') + '</div>' : '');
        var notes = S.items.filter(function (it) { return (e.ref && it.booking_ref === e.ref) || (it.on_date >= e.start && it.on_date < e.end && (!it.subject_id || it.subject_id === e.resource)); });
        body += '<div class="cc-sec"><div class="cc-sec-t">Notes &amp; reminders' + (opts.readOnly ? '' : '<button type="button" data-a="' + act({ run: function () { openEditor({ kind: 'reminder', on_date: prepDay(e), title: (nightly ? 'Prepare for ' : 'Prepare car for ') + (e.title || 'guest'), booking_ref: e.ref, subject_id: e.resource, subject_label: r && r.title, preset: 'morning' }, 'event'); } }) + '">+ Add</button>') + '</div>' +
          (notes.length ? '<div class="cc-list">' + notes.map(itemRow).join('') + '</div>' : '<div class="cc-empty-s">Nothing yet. Add a reminder so nothing about this ' + (nightly ? 'stay' : 'hire') + ' slips.</div>') + '</div>';
        var acts = (v.actions || []);
        if (acts.length) foot = '<div class="cc-btns">' + acts.map(function (a, idx) { return btn(Object.assign({ wide: acts.length % 2 === 1 && idx === 0 }, a), a.tone || (idx === 0 ? 'primary' : 'ghost')); }).join('') + '</div>';
      } else if (S.sel) {
        S.mode = 'range';
        var c = ctx();
        var list = opts.rangeActions && !opts.readOnly ? (opts.rangeActions(c, api) || []) : [];
        var r2 = resOf(c.resource);
        body = close + '<div class="cc-eyebrow">' + (r2 && S.resources.length > 1 ? esc(r2.title) : 'Selected') + '</div>' +
          '<div class="cc-h2">' + esc(c.count === 1 ? fLong(c.start) : (nightly ? fShort(c.start) + ' → ' + fShort(c.end) : fShort(c.start) + ' – ' + fShort(c.last))) + '</div>' +
          '<div class="cc-sub">' + c.count + ' ' + (c.count === 1 ? opts.unit : opts.units) + (nightly && c.count >= 1 ? ' · check-out ' + fDay(c.end) : '') + '</div>' +
          '<div class="cc-chips">' +
            (c.free.length ? '<span class="cc-chip"><i style="background:var(--cc-good)"></i>' + c.free.length + ' open</span>' : '') +
            (c.busy.length ? '<span class="cc-chip"><i style="background:var(--cc-accent)"></i>' + c.busy.length + ' booked</span>' : '') +
            (c.hostDays.length ? '<span class="cc-chip"><i style="background:#8B8EAC"></i>' + c.hostDays.length + ' blocked</span>' : '') +
          '</div>' +
          (S.anchor && c.count === 1 && !opts.readOnly ? '<div class="cc-note-box info" style="margin-top:12px">Tap another day to stretch this into a range, or act on this ' + opts.unit + ' now.</div>' : '');
        var hints = list.filter(function (a) { return a.hint; }).map(function (a) { return a.hint; });
        if (hints.length) body += '<div class="cc-note-box ' + (list.some(function (a) { return a.hintTone === 'bad'; }) ? 'bad' : '') + '">' + hints.map(esc).join('<br>') + '</div>';
        if (c.events.length) body += '<div class="cc-sec"><div class="cc-sec-t">In this range</div><div class="cc-list">' + c.events.map(evRow).join('') + '</div></div>';
        if (opts.agenda) body += '<div class="cc-sec"><div class="cc-sec-t">Notes &amp; reminders<button type="button" data-a="' + act({ run: function () { openEditor({ kind: 'note', on_date: c.start < today() ? today() : c.start, subject_id: c.resource, subject_label: r2 && r2.title }, 'range'); } }) + '">+ Add</button></div>' +
          (c.items.length ? '<div class="cc-list">' + c.items.map(itemRow).join('') + '</div>' : '<div class="cc-empty-s">Pin a note, a task or a reminder to these dates.</div>') + '</div>';
        if (opts.rangeExtra) body += opts.rangeExtra(c, api) || '';
        var prim = list.filter(function (a) { return !a.secondary; }), sec = list.filter(function (a) { return a.secondary; });
        foot = (prim.length ? '<div class="cc-btns">' + prim.map(function (a, idx) { return btn(Object.assign({ wide: prim.length % 2 === 1 && idx === 0 }, a), a.tone || (idx === 0 ? 'primary' : 'ghost')); }).join('') + '</div>' : '') +
               (sec.length ? '<div class="cc-btns">' + sec.map(function (a) { return btn(a, a.tone || 'ghost sm'); }).join('') + '</div>' : '') +
               btn({ label: 'Clear selection', run: function () { clearSel(); } }, 'ghost sm');
      } else {
        S.mode = 'brief';
        body = briefHTML();
      }
      $ib.innerHTML = body;
      $if.innerHTML = foot;
      if (S.mode === 'editor') {
        var t = $ib.querySelector('#cc-e-title'); if (t && !mqSheet.matches) setTimeout(function () { t.focus(); }, 30);
      }
    }

    function briefHTML() {
      var tdy = today(), h = '';
      var r = resOf(S.res);
      var evs = evFor(null);
      var arr = evs.filter(function (e) { return e.start === tdy && BUSY(e.type); });
      var dep = evs.filter(function (e) { return (nightly ? e.end === tdy : add(e.end, -1) === tdy) && BUSY(e.type); });
      var inh = evs.filter(function (e) { return e.start < tdy && e.end > tdy && BUSY(e.type) && e.type !== 'channel'; });
      var next = evs.filter(function (e) { return e.start > tdy && BUSY(e.type); }).sort(function (a, b) { return a.start < b.start ? -1 : 1; })[0];
      var dueItems = S.items.filter(function (it) { return !it.done_at && it.on_date <= add(tdy, 1) && it.on_date >= add(tdy, -7) && it.kind !== 'note'; });
      h += '<div class="cc-eyebrow"><span class="cc-dotlive"></span>' + esc(fLong(tdy)) + '</div>' +
           '<div class="cc-h2">' + (arr.length || dep.length ? (arr.length + dep.length) + ' movement' + (arr.length + dep.length > 1 ? 's' : '') + ' today' : (inh.length ? 'Quiet day, ' + inh.length + ' ' + (nightly ? 'in-house' : 'on the road') : 'A quiet day')) + '</div>' +
           '<div class="cc-sub">' + (next ? 'Next ' + (nightly ? 'arrival' : 'pick-up') + ': ' + esc(next.title || 'guest') + ' · ' + esc(rel(next.start) || fDay(next.start)) : 'Nothing booked ahead yet.') + '</div>';
      h += '<div class="cc-kpis">' +
        '<div class="cc-kpi"><b>' + arr.length + '</b><small>' + (nightly ? 'Arriving' : 'Pick-ups') + '</small></div>' +
        '<div class="cc-kpi"><b>' + dep.length + '</b><small>' + (nightly ? 'Checking out' : 'Returns') + '</small></div>' +
        '<div class="cc-kpi"><b>' + inh.length + '</b><small>' + (nightly ? 'In-house' : 'Out now') + '</small></div>' +
        '<div class="cc-kpi"><b>' + dueItems.length + '</b><small>To-dos due</small></div></div>';
      var moves = arr.concat(dep);
      if (moves.length) h += '<div class="cc-sec"><div class="cc-sec-t">Today</div><div class="cc-list">' + moves.map(evRow).join('') + '</div></div>';
      if (opts.briefing) h += opts.briefing(api) || '';
      if (opts.agenda) {
        h += '<div class="cc-sec"><div class="cc-sec-t">To-dos &amp; reminders<button type="button" data-a="' + act({ run: function () { openEditor({ kind: 'task', on_date: tdy, subject_id: S.res, subject_label: r && r.title }, 'brief'); } }) + '">+ Add</button></div>' +
          (dueItems.length ? '<div class="cc-list">' + dueItems.map(itemRow).join('') + '</div>' : '<div class="cc-empty-s">Nothing due. Tip: select dates on the calendar to pin a note, or open a booking to set a reminder.</div>') + '</div>';
      }
      if (!opts.readOnly) h += '<div class="cc-sec"><div class="cc-sec-t">How it works</div><div class="cc-empty-s" style="border-style:solid">' +
        (mqSheet.matches ? 'Tap a day, then tap another to pick a range. Press and hold, then slide, to paint dates. Swipe sideways to change month.' : 'Drag across days to select. Shift-click extends. ← → change month, T jumps to today, B blocks, O opens, N adds a note.') + '</div></div>';
      return h;
    }

    /* ── editor for notes / tasks / reminders ─────────────────────── */
    var PRESETS = [['none', 'No reminder'], ['attime', 'At the time'], ['1h', '1 hour before'], ['morning', 'That morning, 08:00'], ['eve', 'Evening before, 18:00'], ['2d', '2 days before']];
    function remindAt(date, time, preset) {
      if (!preset || preset === 'none') return null;
      var t = time ? String(time).slice(0, 5) : '09:00', hm = t.split(':');
      var base = parse(date); base.setHours(+hm[0], +hm[1], 0, 0);
      var d = new Date(base);
      if (preset === '1h') d = new Date(base.getTime() - 36e5);
      else if (preset === 'morning') { d = parse(date); d.setHours(8, 0, 0, 0); }
      else if (preset === 'eve') { d = parse(add(date, -1)); d.setHours(18, 0, 0, 0); }
      else if (preset === '2d') { d = parse(add(date, -2)); d.setHours(9, 0, 0, 0); }
      return d.toISOString();
    }
    function guessPreset(it) {
      if (!it.remind_at) return it.id ? 'none' : (it.preset || (it.kind === 'note' ? 'none' : 'morning'));
      var ra = new Date(it.remind_at).getTime();
      for (var i = 1; i < PRESETS.length; i++) if (Math.abs(new Date(remindAt(it.on_date, it.at_time, PRESETS[i][0])).getTime() - ra) < 60000) return PRESETS[i][0];
      return 'custom';
    }
    function openEditor(it, back) {
      if (opts.readOnly || !opts.agenda) return;
      S.editor = Object.assign({ kind: 'note', on_date: today() }, it);
      S.editor.preset = guessPreset(S.editor);
      S.editorBack = back || S.mode;
      S.mode = 'editor';
      openSheet();
      paintInspector();
    }
    function editorHTML(e) {
      var k = e.kind;
      var subj = e.subject_label || (resOf(e.subject_id) || {}).title;
      return '<div class="cc-eyebrow">' + (e.id ? 'Edit' : 'New') + (subj ? ' · ' + esc(subj) : '') + '</div>' +
        '<div class="cc-h2" style="margin-bottom:12px">' + (k === 'note' ? 'Note' : k === 'task' ? 'Task' : 'Reminder') + '</div>' +
        '<div class="cc-kind" role="group" aria-label="Type">' +
          ['note', 'task', 'reminder'].map(function (x) { return '<button type="button" data-kind="' + x + '" aria-pressed="' + (k === x) + '">' + ico(x === 'reminder' ? 'bell' : x) + cap(x) + '</button>'; }).join('') + '</div>' +
        '<label class="cc-field"><span>Title</span><input class="cc-in" id="cc-e-title" maxlength="160" value="' + esc(e.title || '') + '" placeholder="' + (k === 'task' ? 'Deep clean before arrival' : k === 'reminder' ? 'Call the guest about arrival time' : 'Plumber coming at 10') + '"></label>' +
        '<div class="cc-2"><label class="cc-field"><span>Date</span><input class="cc-in" id="cc-e-date" type="date" value="' + esc(e.on_date) + '"></label>' +
        '<label class="cc-field"><span>Time</span><input class="cc-in" id="cc-e-time" type="time" value="' + esc(e.at_time ? String(e.at_time).slice(0, 5) : '') + '"></label></div>' +
        '<label class="cc-field"><span>Details</span><textarea class="cc-in" id="cc-e-body" maxlength="2000" placeholder="Anything worth remembering">' + esc(e.body || '') + '</textarea></label>' +
        '<div class="cc-field"><span>Remind me</span><div class="cc-presets" role="group" aria-label="Reminder">' +
          PRESETS.map(function (p) { return '<button type="button" data-preset="' + p[0] + '" aria-pressed="' + (e.preset === p[0]) + '">' + p[1] + '</button>'; }).join('') +
          '<button type="button" data-preset="custom" aria-pressed="' + (e.preset === 'custom') + '">Pick a time…</button></div>' +
          (e.preset === 'custom' ? '<input class="cc-in" id="cc-e-custom" type="datetime-local" style="margin-top:8px" value="' + esc(e.remind_at ? toLocalInput(e.remind_at) : '') + '">' : '') +
          '<div class="cc-btn-hint" style="text-align:left;margin-top:8px">' + (notifyState()) + '</div></div>';
    }
    function toLocalInput(isoTs) { var d = new Date(isoTs); return iso(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
    function notifyState() {
      if (!('Notification' in global)) return 'Reminders arrive in your Cabana notifications.';
      if (Notification.permission === 'granted') return 'Reminders reach this device as notifications, and your Cabana inbox.';
      return 'Reminders land in your Cabana inbox. <a href="#" data-cc="notify" style="color:var(--cc-accent);font-weight:700">Turn on phone alerts</a> to be pinged even when Cabana is closed.';
    }
    function readEditor() {
      var e = S.editor; if (!e) return;
      var g = function (id) { var el = $ib.querySelector('#' + id); return el ? el.value : undefined; };
      if (g('cc-e-title') !== undefined) e.title = g('cc-e-title');
      if (g('cc-e-date')) e.on_date = g('cc-e-date');
      if (g('cc-e-time') !== undefined) e.at_time = g('cc-e-time') || null;
      if (g('cc-e-body') !== undefined) e.body = g('cc-e-body');
      if (e.preset === 'custom' && g('cc-e-custom')) e.remind_at = new Date(g('cc-e-custom')).toISOString();
    }
    function saveEditor() {
      readEditor();
      var e = S.editor;
      if (!e.title || !e.title.trim()) { toast('Give it a title first.', { bad: true }); var t = $ib.querySelector('#cc-e-title'); if (t) t.focus(); return; }
      if (e.preset !== 'custom') e.remind_at = remindAt(e.on_date, e.at_time, e.preset);
      if (e.remind_at && new Date(e.remind_at).getTime() < Date.now() - 60000 && !e.id) { toast('That reminder time has already passed. Pick a later one.', { bad: true }); return; }
      var store = opts.agenda;
      busy(true);
      store.save(e).then(function () {
        var back = S.editorBack; S.editor = null; S.mode = back === 'event' && S.focus ? 'event' : (S.sel ? 'range' : 'brief');
        toast(e.id ? 'Saved' : (e.remind_at ? 'Reminder set for ' + new Date(e.remind_at).toLocaleString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : cap(e.kind) + ' added') + (store.local ? ' on this device' : ''));
        return reloadItems();
      }).catch(function (err) { toast(err && err.message ? err.message : 'Could not save that. Try again.', { bad: true }); })
        .then(function () { busy(false); });
    }
    function deleteItem(it) {
      if (!confirm('Delete "' + (it.title || 'this') + '"?')) return;
      var copy = Object.assign({}, it); delete copy.id;
      opts.agenda.remove(it.id).then(function () {
        S.editor = null; S.mode = S.sel ? 'range' : 'brief';
        toast('Deleted', { action: function () { opts.agenda.save(copy).then(reloadItems); } });
        return reloadItems();
      }).catch(function () { toast('Could not delete it. Try again.', { bad: true }); });
    }
    function toggleDone(id) {
      var it = S.items.filter(function (x) { return x.id === id; })[0]; if (!it) return;
      var done = !it.done_at;
      it.done_at = done ? new Date().toISOString() : null;
      paint();
      opts.agenda.setDone(id, done).then(function () { if (done) toast('Done. Nice.', { action: function () { toggleDone(id); } }); })
        .catch(function () { it.done_at = done ? null : new Date().toISOString(); paint(); toast('Could not update it.', { bad: true }); });
    }
    function reloadItems() {
      if (!opts.agenda) return Promise.resolve();
      var from = add(monthStart(today()) < S.cursor ? monthStart(today()) : S.cursor, -45), to = add(addMonths(S.cursor, 13), 0);
      return opts.agenda.list(from, to).then(function (rows) { S.items = rows || []; paint(); watchReminders(); }, function () { S.items = S.items || []; paint(); });
    }

    /* In-page reminders, for the tab that is already open. The server
       pushes to the phone as well; this is the gentle in-context nudge. */
    var fired = {};
    try { fired = JSON.parse(sessionStorage.getItem('cc-fired') || '{}'); } catch (e) {}
    function watchReminders() {
      if (!opts.agenda) return;
      var now = Date.now();
      S.items.forEach(function (it) {
        if (!it.remind_at || it.done_at || fired[it.id]) return;
        var t = Date.parse(it.remind_at);
        if (t <= now && t > now - 15 * 60000) {
          fired[it.id] = 1;
          try { sessionStorage.setItem('cc-fired', JSON.stringify(fired)); } catch (e) {}
          toast('⏰ ' + it.title, { ms: 12000, actionLabel: 'Open', action: function () { openEditor(it, 'brief'); } });
        }
      });
    }
    var watchT = setInterval(watchReminders, 30000);

    /* ── selection ────────────────────────────────────────────────── */
    function setSel(res, a, b, keepAnchor) {
      if (a > b) { var t = a; a = b; b = t; }
      S.sel = { res: res || S.res, start: a, end: b };
      S.focus = null;
      if (!keepAnchor) S.anchor = null;
      S.mode = 'range';
    }
    function clearSel() {
      if (opts.onSelect && S.sel) setTimeout(function () { opts.onSelect(null, api); }, 0);
      S.sel = null; S.anchor = null; S.focus = null; S.mode = 'brief';
      closeSheet();
      paint();
    }
    function focusEvent(id) {
      S.focus = id; S.mode = 'event';
      var e = S.events.filter(function (x) { return x.id === id; })[0];
      if (e && opts.onEventOpen) opts.onEventOpen(e);
      openSheet();
      paint();
    }

    /* ── mobile dock ──────────────────────────────────────────────── */
    function paintDock() {
      if (!S.sel || opts.readOnly) { $dock.innerHTML = ''; return; }
      var c = ctx();
      var list = opts.rangeActions ? (opts.rangeActions(c, api) || []) : [];
      var prim = list.filter(function (a) { return !a.secondary && !a.disabled; })[0];
      S.dockAct = prim || null;
      $dock.innerHTML = '<div class="cc-dock-tx"><b>' + esc(rangeLabel(c)) + '</b><small>' +
        esc(S.anchor && c.count === 1 ? 'Tap another day for a range' : [c.free.length ? c.free.length + ' open' : '', c.busy.length ? c.busy.length + ' booked' : '', c.hostDays.length ? c.hostDays.length + ' blocked' : ''].filter(Boolean).join(' · ')) + '</small></div>' +
        (prim ? '<button type="button" class="cc-btn primary" data-cc="dock-prim">' + (prim.icon ? ico(prim.icon) : '') + esc(prim.short || prim.label) + '</button>' : '') +
        '<button type="button" class="cc-btn ghost" data-cc="dock-more" aria-label="More actions">More</button>' +
        '<button type="button" class="cc-btn ghost" data-cc="close" aria-label="Clear selection" style="padding:0 12px">' + ico('x') + '</button>';
    }

    /* ── sheet (phones and tablets) ────────────────────────────────── */
    function openSheet() { if (mqSheet.matches) root.classList.add('is-sheet-open'); uiFlag(); }
    function closeSheet() { root.classList.remove('is-sheet-open'); uiFlag(); }
    function uiFlag() {
      document.documentElement.classList.toggle('cc-busy-ui', mqSheet.matches && (!!S.sel || root.classList.contains('is-sheet-open')));
    }

    /* ── busy state ───────────────────────────────────────────────── */
    function busy(on) {
      S.busy = !!on;
      $view.classList.toggle('cc-loading', !!on);
      root.querySelectorAll('.cc-insp .cc-btn, .cc-dock .cc-btn').forEach(function (b) { if (on) b.setAttribute('disabled', ''); else if (!b.hasAttribute('data-keep-disabled')) b.removeAttribute('disabled'); });
      if (!on) paintInspector();
    }
    function runAction(a) {
      if (!a || a.disabled || S.busy) return;
      if (a.href) { location.href = a.href; return; }
      var c = S.sel ? ctx() : null;
      var out = a.run && a.run(c, api);
      if (out && typeof out.then === 'function') {
        busy(true);
        out.then(function () { busy(false); }, function (err) { busy(false); if (err) toast(err.message || String(err), { bad: true }); });
      }
    }

    /* ── navigation ───────────────────────────────────────────────── */
    function go(n) {
      if (S.view === 'year') S.cursor = addMonths(S.cursor, n * 12);
      else S.cursor = addMonths(S.cursor, n);
      S.pop = false;
      if (S.view === 'timeline') S._tlScrolled = true;
      paint(n);
      if (opts.onWindow) opts.onWindow(windowRange());
      reloadItemsSoon();
    }
    var riT = null;
    function reloadItemsSoon() { clearTimeout(riT); riT = setTimeout(reloadItems, 250); }
    function goToday() {
      var was = S.cursor;
      S.cursor = monthStart(today()); S.pop = false; S._tlScrolled = false;
      paint(was === S.cursor ? 0 : (was > S.cursor ? -1 : 1));
      if (S.view === 'month') { var el = $view.querySelector('.is-today'); if (el) el.focus({ preventScroll: true }); }
      if (opts.onWindow) opts.onWindow(windowRange());
    }
    function setView(v) {
      if (opts.views.indexOf(v) < 0 || S.view === v) return;
      S.view = v; S.pop = false; S._tlScrolled = false;
      if (opts.onView) opts.onView(v);
      paint(0);
    }
    function windowRange() {
      if (S.view === 'timeline') return tlWindow();
      if (S.view === 'year') { var y = parse(S.cursor).getFullYear(); return { from: y + '-01-01', to: (y + 1) + '-01-01' }; }
      var gs = gridStart(S.cursor); return { from: gs, to: add(gs, 42) };
    }

    /* ══ POINTER: select by drag, tap-tap, long-press, and swipe ═══ */
    var P = null;
    function cellAt(x, y) {
      var el = document.elementFromPoint(x, y);
      return el && el.closest ? el.closest('[data-d]') : null;
    }
    $view.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (e.target.closest('[data-ev],[data-done]')) return;
      var cell = e.target.closest('.cc-day,.cc-tl-cell');
      P = { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), type: e.pointerType, cell: cell, drag: false, moved: false, lp: null };
      if (!cell || opts.readOnly && S.view !== 'month' && S.view !== 'timeline') return;
      var d = cell.getAttribute('data-d');
      if (isPast(d)) { P.cell = null; return; }
      if (e.pointerType === 'mouse') {
        if (e.shiftKey && S.sel) { setSel(cell.getAttribute('data-res') || S.sel.res, S.sel.start, d); paint(); P = null; return; }
        P.drag = true; P.res = cell.getAttribute('data-res') || S.res; P.from = d;
        try { $view.setPointerCapture(e.pointerId); } catch (x) {}
      } else {
        // Touch: a press-and-hold turns the finger into a brush.
        P.lp = setTimeout(function () {
          if (!P || P.moved) return;
          P.drag = true; P.first = true; P.res = cell.getAttribute('data-res') || S.res; P.from = d;
          setSel(P.res, d, d); paintSelOnly();
          try { navigator.vibrate && navigator.vibrate(18); } catch (x) {}
        }, 320);
      }
    });
    $view.addEventListener('pointermove', function (e) {
      if (!P || e.pointerId !== P.id) return;
      var dx = e.clientX - P.x, dy = e.clientY - P.y;
      if (!P.moved && (Math.abs(dx) > 7 || Math.abs(dy) > 7)) { P.moved = true; if (!P.drag) clearTimeout(P.lp); }
      if (!P.drag) return;
      var c = cellAt(e.clientX, e.clientY);
      if (!c) return;
      var d = c.getAttribute('data-d'), r = c.getAttribute('data-res') || S.res;
      if (r !== P.res || isPast(d)) return;
      if (!S.sel || S.sel.start !== (d < P.from ? d : P.from) || S.sel.end !== (d < P.from ? P.from : d) || P.first !== true) {
        P.first = true;
        setSel(P.res, P.from, d);
        paintSelOnly();
      }
    });
    function endPointer(e) {
      if (!P || (e && e.pointerId !== P.id)) return;
      clearTimeout(P.lp);
      var p = P; P = null;
      var dx = e ? e.clientX - p.x : 0, dy = e ? e.clientY - p.y : 0;
      // Swipe to change month (month and year views, touch or pen).
      if (!p.drag && p.type !== 'mouse' && (S.view === 'month' || S.view === 'year') && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4 && Date.now() - p.t < 700) {
        go(dx < 0 ? 1 : -1);
        return;
      }
      if (p.drag && p.first) { S.anchor = null; paint(); if (opts.onSelect) opts.onSelect(ctx(), api); return; }
      if (p.moved || !p.cell) return;
      tapDay(p.cell.getAttribute('data-d'), p.cell.getAttribute('data-res') || S.res);
    }
    $view.addEventListener('pointerup', endPointer);
    $view.addEventListener('pointercancel', function (e) { if (P && P.drag && P.first) { S.anchor = null; paint(); } if (P) clearTimeout(P.lp); P = null; });
    // While painting with a finger, the page must not scroll under it.
    $view.addEventListener('touchmove', function (e) { if (P && P.drag) e.preventDefault(); }, { passive: false });

    function tapDay(d, res) {
      if (isPast(d)) return;
      if (S.sel && S.anchor && S.sel.res === res && d !== S.anchor) {
        setSel(res, S.anchor, d);
      } else if (S.sel && S.sel.res === res && S.sel.start === d && S.sel.end === d && !S.anchor) {
        clearSel(); return;
      } else {
        setSel(res, d, d, true);
        S.anchor = d;
      }
      S.kbd = d;
      paint();
      if (opts.onSelect) opts.onSelect(ctx(), api);
    }

    /* ── clicks (delegated) ───────────────────────────────────────── */
    root.addEventListener('click', function (e) {
      var t = e.target;
      var ev = t.closest('[data-ev]');
      if (ev && root.contains(ev)) { e.preventDefault(); if (!opts.compact) focusEvent(ev.getAttribute('data-ev')); return; }
      var dn = t.closest('[data-done]');
      if (dn) { e.preventDefault(); e.stopPropagation(); toggleDone(dn.getAttribute('data-done')); return; }
      var itm = t.closest('[data-item]');
      if (itm) { var it = S.items.filter(function (x) { return x.id === itm.getAttribute('data-item'); })[0]; if (it) openEditor(it, 'brief'); return; }
      var a = t.closest('[data-a]');
      if (a && root.contains(a)) {
        var ac = S.acts[+a.getAttribute('data-a')];
        if (ac && !ac.href) { e.preventDefault(); runAction(ac); }
        return;
      }
      var k = t.closest('[data-kind]');
      if (k && S.editor) { readEditor(); S.editor.kind = k.getAttribute('data-kind'); if (S.editor.kind === 'note' && !S.editor.id) S.editor.preset = 'none'; else if (S.editor.preset === 'none' && !S.editor.id) S.editor.preset = 'morning'; paintInspector(); return; }
      var pr = t.closest('[data-preset]');
      if (pr && S.editor) { readEditor(); S.editor.preset = pr.getAttribute('data-preset'); if (S.editor.preset !== 'custom') S.editor.remind_at = null; paintInspector(); return; }
      var m = t.closest('[data-month]');
      if (m) { var was = S.cursor; S.cursor = m.getAttribute('data-month'); S.view = 'month'; paint(S.cursor < was ? -1 : 1); if (opts.onView) opts.onView('month'); return; }
      var rh = t.closest('.cc-tl-rh');
      if (rh) { S.res = rh.getAttribute('data-res'); if (opts.onResource) opts.onResource(S.res); setView('month'); return; }
      var j = t.closest('[data-jump]');
      if (j) { var w2 = S.cursor; S.cursor = j.getAttribute('data-jump'); S.pop = false; paint(S.cursor < w2 ? -1 : 1); if (opts.onWindow) opts.onWindow(windowRange()); reloadItemsSoon(); return; }
      var py = t.closest('[data-popy]');
      if (py) { S.popYear = (S.popYear || parse(S.cursor).getFullYear()) + (+py.getAttribute('data-popy')); paintPop(); return; }
      var c = t.closest('[data-cc]');
      if (!c) { if (S.pop && !t.closest('.cc-pop')) { S.pop = false; paintPop(); paintToolbar(); } return; }
      var cmd = c.getAttribute('data-cc');
      if (cmd === 'prev') go(-1);
      else if (cmd === 'next') go(1);
      else if (cmd === 'today') goToday();
      else if (cmd === 'view') setView(c.getAttribute('data-v'));
      else if (cmd === 'pop') { S.pop = !S.pop; S.popYear = null; paintToolbar(); paintPop(); }
      else if (cmd === 'close') { if (S.mode === 'event' && S.sel) { S.focus = null; S.mode = 'range'; paint(); } else if (S.mode === 'event') { S.focus = null; S.mode = 'brief'; closeSheet(); paint(); } else clearSel(); }
      else if (cmd === 'dock-prim') runAction(S.dockAct);
      else if (cmd === 'dock-more') { openSheet(); paintInspector(); }
      else if (cmd === 'new-note') openEditor({ kind: 'note', on_date: today(), subject_id: S.res, subject_label: (resOf(S.res) || {}).title }, 'brief');
      else if (cmd === 'notify') { e.preventDefault(); enableAlerts(); }
    });
    root.addEventListener('change', function (e) {
      if (e.target.classList.contains('cc-res')) {
        S.res = e.target.value; S.sel = null; S.focus = null; S.mode = 'brief';
        if (opts.onResource) opts.onResource(S.res);
        paint(0);
      }
    });
    root.querySelector('.cc-scrim').addEventListener('click', function () {
      closeSheet();
      if (S.mode === 'editor') { S.mode = S.sel ? 'range' : 'brief'; S.editor = null; paintInspector(); }
    });
    $fab.addEventListener('click', function () { S.focus = null; S.mode = S.sel ? 'range' : 'brief'; paintInspector(); root.classList.add('is-sheet-open'); uiFlag(); });

    // Drag the sheet down to dismiss it.
    (function () {
      var grip = root.querySelector('.cc-insp-grip'), y0 = null, dy = 0;
      function start(e) { y0 = e.clientY; dy = 0; $insp.style.transition = 'none'; try { grip.setPointerCapture(e.pointerId); } catch (x) {} }
      function move(e) { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); $insp.style.transform = 'translateY(' + dy + 'px)'; }
      function end() { if (y0 == null) return; $insp.style.transition = ''; $insp.style.transform = ''; if (dy > 90) { closeSheet(); if (S.mode === 'event') { S.focus = null; S.mode = S.sel ? 'range' : 'brief'; paint(); } } y0 = null; }
      grip.addEventListener('pointerdown', start); grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', end); grip.addEventListener('pointercancel', end);
    })();

    /* ── keyboard ─────────────────────────────────────────────────── */
    function onKey(e) {
      if (!document.body.contains(root)) { document.removeEventListener('keydown', onKey); return; }
      if (opts.compact && !root.contains(document.activeElement)) return;
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) {
        if (e.key === 'Escape' && S.mode === 'editor') { S.editor = null; S.mode = S.sel ? 'range' : 'brief'; paintInspector(); }
        if (e.key === 'Enter' && S.mode === 'editor' && tag === 'input') { e.preventDefault(); saveEditor(); }
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector('.cc-modal')) { if (e.key === 'Escape' || e.key === '?') document.querySelector('.cc-modal').remove(); return; }
      var k = e.key;
      // Arrow keys move a day at a time while the grid has focus.
      var cell = document.activeElement && document.activeElement.closest && document.activeElement.closest('.cc-day');
      if (cell && root.contains(cell) && /^Arrow/.test(k)) {
        e.preventDefault();
        var step = k === 'ArrowLeft' ? -1 : k === 'ArrowRight' ? 1 : k === 'ArrowUp' ? -7 : 7;
        var nd = add(cell.getAttribute('data-d'), step);
        if (e.shiftKey && S.sel) { setSel(S.res, S.sel.start === cell.getAttribute('data-d') ? S.sel.end : S.sel.start, nd); }
        S.kbd = nd;
        if (nd < gridStart(S.cursor) || nd >= add(gridStart(S.cursor), 42) || monthStart(nd) !== S.cursor) { S.cursor = monthStart(nd); paint(step < 0 ? -1 : 1); }
        else paint();
        var t = $view.querySelector('[data-d="' + nd + '"]'); if (t) t.focus();
        return;
      }
      if (k === 'Enter' && cell && root.contains(cell)) { e.preventDefault(); tapDay(cell.getAttribute('data-d'), S.res); var tt = $view.querySelector('[data-d="' + cell.getAttribute('data-d') + '"]'); if (tt) tt.focus(); return; }
      if (k === 'ArrowLeft') { e.preventDefault(); go(-1); }
      else if (k === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (k === 't' || k === 'T') goToday();
      else if (k === 'm' || k === 'M') setView('month');
      else if (k === 'l' || k === 'L') setView('timeline');
      else if (k === 'a' || k === 'A') setView('agenda');
      else if (k === 'y' || k === 'Y') setView('year');
      else if (k === 'Escape') { if (S.pop) { S.pop = false; paint(); } else if (S.sel || S.focus) clearSel(); else closeSheet(); }
      else if (k === '?') help();
      else if ((k === 'n' || k === 'N') && opts.agenda) { var c0 = ctx(); openEditor({ kind: 'note', on_date: c0 ? (c0.start < today() ? today() : c0.start) : today(), subject_id: c0 ? c0.resource : S.res, subject_label: (resOf(c0 ? c0.resource : S.res) || {}).title }, S.mode); }
      else if ((k === 'b' || k === 'B' || k === 'o' || k === 'O') && S.sel && opts.rangeActions) {
        var want = (k === 'b' || k === 'B') ? 'block' : 'open';
        var a = (opts.rangeActions(ctx(), api) || []).filter(function (x) { return x.key === want; })[0];
        if (a && !a.disabled) runAction(a);
      }
    }
    document.addEventListener('keydown', onKey);

    function help() {
      var m = document.createElement('div');
      m.className = 'cc-modal';
      m.innerHTML = '<div class="cc-modal-in" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts"><h3>Calendar shortcuts</h3><div class="cc-keys">' +
        [['← →', 'Previous / next month'], ['T', 'Jump to today'], ['M L A Y', 'Month, timeline, agenda, year'], ['Drag', 'Select a range of days'],
         ['Shift + click', 'Extend the selection'], ['Arrows', 'Move day by day in the grid (Shift extends)'], ['Enter', 'Select the focused day'], ['B / O', 'Block / open the selection'], ['N', 'New note or reminder'], ['Esc', 'Clear selection, close panels'], ['?', 'This list']]
          .map(function (r) { return '<kbd>' + r[0] + '</kbd><span>' + r[1] + '</span>'; }).join('') +
        '</div><div style="margin-top:18px;text-align:right"><button type="button" class="cc-btn dark sm" style="border:0;cursor:pointer">Got it</button></div></div>';
      m.addEventListener('click', function (e) { if (e.target === m || e.target.closest('button')) m.remove(); });
      document.body.appendChild(m);
      m.querySelector('button').focus();
    }

    /* ── phone alerts ─────────────────────────────────────────────── */
    function enableAlerts() {
      if (!('Notification' in global)) { toast('This browser cannot show notifications. Reminders still land in your Cabana inbox.'); return; }
      function subscribe() {
        var uid = null;
        try { uid = global.ApaSession && ApaSession.get && (ApaSession.get().user || {}).id; } catch (e) {}
        if (global.ApaPush && uid) return ApaPush.ask(uid);
        return Notification.requestPermission().then(function (p) { return p === 'granted'; });
      }
      var ready = global.ApaPush ? Promise.resolve() : new Promise(function (res) {
        var ensureSW = ('serviceWorker' in navigator)
          ? navigator.serviceWorker.getRegistration().then(function (r) { return r || navigator.serviceWorker.register('/sw.js?v=39-people-profiles', { scope: '/' }); }).catch(function () {})
          : Promise.resolve();
        ensureSW.then(function () {
          var s = document.createElement('script'); s.src = '/apa-push.js'; s.onload = res; s.onerror = res; document.head.appendChild(s);
        });
      });
      ready.then(subscribe).then(function (ok) {
        toast(ok ? 'Phone alerts are on. Reminders will reach this device.' : 'Alerts are blocked in this browser’s settings. Reminders still land in your Cabana inbox.', { bad: !ok });
        paintInspector();
      }, function () { toast('Could not turn alerts on here.', { bad: true }); });
    }

    /* ── resize: lanes and sheet behaviour change with width ──────── */
    var rzT = null;
    global.addEventListener('resize', function () { clearTimeout(rzT); rzT = setTimeout(function () { if (!mqSheet.matches) closeSheet(); paint(); }, 150); });

    /* ══ PUBLIC API ════════════════════════════════════════════════ */
    var api = {
      util: UTIL,
      toast: toast,
      setData: function (d) {
        if (d.events) S.events = d.events.filter(function (e) { return e && e.start && e.end && e.end > e.start; });
        if (d.items) S.items = d.items;
        S.loaded = true;
        if (S.focus && !S.events.some(function (e) { return e.id === S.focus; })) { S.focus = null; S.mode = S.sel ? 'range' : 'brief'; }
        paint();
      },
      setResources: function (list, current) {
        S.resources = (list || []).slice();
        if (current) S.res = current;
        if (!resOf(S.res) && S.resources[0]) S.res = S.resources[0].id;
        paint();
      },
      get resource() { return S.res; },
      setResource: function (id) { S.res = id; S.sel = null; S.focus = null; S.mode = 'brief'; paint(0); },
      get view() { return S.view; },
      setView: setView,
      goto: function (d, res) {
        if (res) S.res = res;
        var was = S.cursor; S.cursor = monthStart(d); S.kbd = d;
        paint(S.cursor === was ? 0 : S.cursor < was ? -1 : 1);
      },
      select: function (a, b, res) { setSel(res || S.res, a, b || a); S.cursor = monthStart(a); paint(0); },
      clearSelection: clearSel,
      focusEvent: focusEvent,
      openEditor: openEditor,
      openSheet: function () { openSheet(); },
      busy: busy,
      reloadItems: reloadItems,
      window: windowRange,
      ctx: ctx,
      refresh: function () { paint(); },
      get events() { return S.events; },
      get items() { return S.items; },
      destroy: function () { clearInterval(watchT); document.removeEventListener('keydown', onKey); root.innerHTML = ''; root.classList.remove('cc'); }
    };
    paintLegend();
    paint(0);
    if (opts.agenda) reloadItems();
    return api;
  }

  var UTIL = { iso: iso, parse: parse, add: add, diff: diff, today: today, monthStart: monthStart, addMonths: addMonths,
               fShort: fShort, fDay: fDay, fLong: fLong, rel: rel, esc: esc, initials: initials, ico: ico };

  global.CabanaCal = { mount: mount, agendaStore: agendaStore, toast: toast, util: UTIL, TYPES: TYPES };
})(window);
