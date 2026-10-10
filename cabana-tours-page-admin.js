/* ═══════════════════════════════════════════════════════════════════
   CABANA · TOURS — the page editor (console → Tours → Page)
   ───────────────────────────────────────────────────────────────────
   Everything a traveller sees on cabana.africa/tours that is not a
   tour, a departure or a paid slot is written here:

     · the cover (the Marquee with nothing in it) and the search bar:
       words, background photo or film, search hint and quick links
     · Cabana's own Marquee slots: photo or film, badge, device, and a
       button that can open a 360° world
     · every section below it: order, on or off, and its words
     · the categories: name, line, photo, order, visibility
     · collections: rows of tours picked by hand

   Stored in tour_page_blocks (and tour_spotlights for slots). Writes
   are admin-only by RLS; this file is a convenience, not the gate.
   Saving is live: the page reads the table on every visit. Previews
   are drawn by the page's own Marquee (cabana-tours-spotlight.js) with
   the page's own stylesheet, so what you see here is what runs there.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var S = { blocks: null, slides: null, tours: null, ops: null, worlds: null, open: null, slideForm: null, root: null, err: null };
  var KIND = {
    hero: { name: 'Cover and search bar', note: 'The cover shows when nothing is in the Marquee. The search hint and quick links sit in the search bar under it.' },
    departures: { name: 'Departure board', note: 'Fills itself from tour schedules. Hidden when nothing leaves in the next 30 days.' },
    kinds: { name: 'Ways to travel', note: 'The categories, with a “tell me when” button each. Photos and names are under Categories below.' },
    collection: { name: 'Collection', note: 'A row of tours you pick by hand. Hidden until one of its tours is live.' },
    immersive: { name: '360° and VR room', note: 'Cabana Immersive: the worlds, the four ways to watch and the filming line. Hidden while no world is live. Worlds are managed under Immersive.' },
    places: { name: 'Where to (the atlas)', note: 'The map of places and their tours, with “tell me when” for places not listed yet. Places are managed under Tours → Places.' },
    guides: { name: 'Guides', note: 'Approved guides with live tours. Pick who shows first.' },
    catalogue: { name: 'The catalogue', note: 'The newest tours, or your message while there are none.' },
    pitch: { name: 'For guides: Marquee and filming', note: 'Sells slots in the Marquee (prices under Tours → Marquee) and 360° filming. Shows a live preview of a slot.' },
    invite: { name: 'List your tours', note: 'The band inviting guides and operators to list.' }
  };
  var ANCHOR = { departures: 'departures', kinds: 'kinds', immersive: 'immersive', places: 'places', guides: 'guides', catalogue: 'all', pitch: 'featured', invite: 'invite' };
  var CATS = [['day-safari', 'Day safaris'], ['big-safari', 'Multi-day safaris'], ['day-trip', 'Day trips'], ['city-tour', 'City walks'],
              ['adventure', 'Adventure'], ['culture', 'Culture & community'], ['beach', 'Coast & water'], ['expedition', 'Expeditions']];
  var ACCENTS = [['#F2541B', 'Ember'], ['#FFB21E', 'Sun'], ['#13925F', 'Acacia'], ['#0FA3B8', 'Lake'], ['#7457F2', 'Jacaranda'], ['#F24E7A', 'Flamingo']];
  var WORLD_CSS = '/cabana-tours-world.css?v=1';

  /* Field lists per section. [key, label, type, hint] */
  var COPY = [['eyebrow', 'Small label above the title', 'text'], ['title', 'Title', 'title'], ['lede', 'Intro', 'textarea']];
  var SCHEMA = {
    hero: COPY.concat([
      ['image', 'Background photo', 'image', 'Landscape, at least 2000 px wide. Without one, the cover uses Cabana’s plains-at-dusk photo.'],
      ['image_mobile', 'Phone photo', 'image', 'Optional. Portrait crops better on phones.'],
      ['video', 'Background film', 'video', 'Optional. A short, silent loop (MP4, under 20 MB). Plays muted; the photo shows while it loads.'],
      ['focal', 'Keep in view', 'focal', 'Which part of the photo stays on screen when it is cropped.'],
      ['shade', 'Darken the bottom', 'range', 'More shade makes the words easier to read on a busy photo.'],
      ['search_placeholder', 'Hint in the search bar', 'text'],
      ['links', 'Quick links under the search bar', 'links', 'Up to eight. Use links on Cabana, like /tours-catalogue?cat=big-safari.'],
      ['auto_departures', 'When fewer than three paid slots, ads or featured tours are running, add up to two tours leaving soon (only tours with photos).', 'bool']
    ]),
    departures: COPY.concat([['show_clock', 'Show the live Nairobi clock on the board', 'bool']]),
    kinds: COPY.concat([['cta_label', 'Button', 'text'], ['show_empty', 'Also show categories that have no live tours yet (people can ask to hear when one opens)', 'bool']]),
    collection: COPY.concat([
      ['tour_ids', 'Tours in this row', 'tours', 'Only published tours show on the page, in this order.'],
      ['layout', 'Layout', 'select', [['rail', 'Scrolling row'], ['grid', 'Grid']]],
      ['image', 'Banner photo', 'image', 'Optional. Shown above the row.'],
      ['cta_label', 'Button', 'text', 'Optional.'], ['cta_url', 'Button link', 'text', 'A link on Cabana, e.g. /tours-catalogue?when=weekend']
    ]),
    immersive: COPY.slice(),
    places: COPY.concat([
      ['cta_label', 'Button', 'text'],
      ['show_map', 'Show the map (switch off to show only the list of places)', 'bool']
    ]),
    guides: COPY.concat([['cta_label', 'Button', 'text'], ['featured_ids', 'Show these first', 'guides', 'The rest follow automatically. Only guides with live tours appear.']]),
    catalogue: COPY.concat([
      ['cta_label', 'Button', 'text'], ['limit', 'How many tours to show (4 to 24)', 'number'],
      ['empty_title', 'While there are no tours: title', 'text'], ['empty_text', 'While there are no tours: message', 'textarea'],
      ['empty_cta_label', 'While there are no tours: button', 'text'], ['empty_cta_url', 'While there are no tours: button link', 'text']
    ]),
    pitch: COPY.concat([
      ['bullets', 'Points, one per line', 'lines'], ['cta_label', 'Button', 'text'], ['cta_url', 'Button link', 'text'],
      ['film_title', '360° filming: title', 'title'], ['film_text', '360° filming: message', 'textarea'], ['film_cta', '360° filming: button', 'text', 'Opens the 360° tab in the guide’s studio.']
    ]),
    invite: COPY.concat([['bullets', 'Points, one per line', 'lines'], ['cta_label', 'Button', 'text'], ['cta_url', 'Button link', 'text']])
  };

  /* ── small things ────────────────────────────────────────────────── */
  function c() { return window.sb || (window.supabase && window.__sbClient) || null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (x) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[x]; }); }
  function $(sel, r) { return (r || document).querySelector(sel); }
  function $$(sel, r) { return Array.prototype.slice.call((r || document).querySelectorAll(sel)); }
  function toast(m) { if (typeof window.toast === 'function') window.toast(m); else console.log(m); }
  function clone(o) { return JSON.parse(JSON.stringify(o == null ? null : o)); }
  function defaults() { return clone(window.CabanaToursPageDefaults || []); }
  function def(id) { return defaults().filter(function (b) { return b.id === id; })[0] || null; }
  function block(id) { return (S.blocks || []).filter(function (b) { return b.id === id; })[0] || null; }
  function eff(b) {
    // What the page is really showing: stored words over the launch copy.
    var d = def(b.id), base = d ? d.content : {}, out = Object.assign({}, base, b.content || {});
    if (base.items && b.content && b.content.items) {
      out.items = {};
      Object.keys(Object.assign({}, base.items, b.content.items)).forEach(function (k) { out.items[k] = Object.assign({}, base.items[k] || {}, b.content.items[k] || {}); });
    }
    return out;
  }
  function plain(t) { return String(t || '').replace(/\*/g, ''); }
  function internal(u) { var h = String(u || '').trim(); return !h || /^(\/(?!\/)|#)/.test(h) || /^https:\/\/(www\.)?cabana\.africa(\/|$)/i.test(h); }
  function ytId(u) { var m = String(u || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})/); return m ? m[1] : (/^[A-Za-z0-9_-]{11}$/.test(String(u || '').trim()) ? String(u).trim() : ''); }
  function day(iso) { try { return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } }
  function isoDay(d) { var x = new Date(d); return new Date(x.getTime() + 3 * 3600e3).toISOString().slice(0, 10); }

  function styles() {
    // The page's own stylesheet, so previews are drawn exactly as the
    // page draws them. Everything in it is namespaced (tw-, cim-, cs-).
    if (!document.getElementById('tw-world-css')) {
      var ln = document.createElement('link'); ln.id = 'tw-world-css'; ln.rel = 'stylesheet'; ln.href = WORLD_CSS;
      document.head.appendChild(ln);
    }
    if (document.getElementById('tp-css')) return;
    var st = document.createElement('style'); st.id = 'tp-css';
    st.textContent =
      '.tp{display:grid;gap:18px}' +
      '.tp-row{display:grid;grid-template-columns:auto 1fr auto auto;gap:14px;align-items:center;padding:12px 0;border-top:1px solid var(--line)}' +
      '.tp-row:first-of-type{border-top:0}.tp-row.off .tp-name b{color:var(--ink-4)}' +
      '.tp-ord{display:flex;flex-direction:column;gap:4px}.tp-ord button{width:26px;height:20px;border-radius:6px;border:1px solid var(--line-2);background:var(--panel-2);color:var(--ink-3);cursor:pointer;font:600 11px/1 var(--f-b)}' +
      '.tp-ord button:disabled{opacity:.3;cursor:default}' +
      '.tp-name b{display:block;font:600 13.5px/1.3 var(--f-d);color:var(--ink-1)}.tp-name small{display:block;color:var(--ink-4);font-size:12px;margin-top:2px;line-height:1.45}' +
      '.tp-name .tp-copy{color:var(--ink-3);font-size:12.5px;margin-top:4px}' +
      '.tp-ed{margin:6px 0 10px;padding:18px;border-radius:14px;background:var(--panel-2);border:1px solid var(--line)}' +
      '.tp-ed .g2{grid-template-columns:1fr 1fr}@media(max-width:760px){.tp-ed .g2{grid-template-columns:1fr}}' +
      '.tp-act{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}' +
      '.tp-img{display:flex;gap:12px;align-items:center}.tp-img .ph{width:132px;aspect-ratio:16/10;border-radius:10px;overflow:hidden;background:var(--panel-3);border:1px solid var(--line-2);flex:none;display:grid;place-items:center;color:var(--ink-4);font-size:11px}' +
      '.tp-img .ph img,.tp-img .ph video{width:100%;height:100%;object-fit:cover;display:block}' +
      '.tp-sw{display:flex;gap:8px}.tp-sw button{width:26px;height:26px;border-radius:50%;border:2px solid transparent;cursor:pointer}.tp-sw button.on{border-color:var(--ink-1);box-shadow:0 0 0 2px var(--panel)}' +
      '.tp-list{display:grid;gap:6px}.tp-li{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;background:var(--panel);border:1px solid var(--line)}' +
      '.tp-li .t{flex:1;min-width:0;font-size:13px;color:var(--ink-1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tp-li .t small{color:var(--ink-4);margin-left:6px}' +
      '.tp-li button{height:24px;min-width:24px;border-radius:7px;border:1px solid var(--line-2);background:var(--panel-2);color:var(--ink-3);cursor:pointer;font-size:12px}' +
      '.tp-res{max-height:220px;overflow:auto;margin-top:6px;display:grid;gap:4px}' +
      '.tp-cat{display:grid;grid-template-columns:56px 1fr 1.6fr auto auto;gap:10px;align-items:center;padding:10px 0;border-top:1px solid var(--line)}' +
      '.tp-cat:first-of-type{border-top:0}@media(max-width:900px){.tp-cat{grid-template-columns:48px 1fr;}}' +
      '.tp-cat .ph{width:56px;height:42px;border-radius:8px;overflow:hidden;background:var(--panel-3);border:1px solid var(--line-2);display:grid;place-items:center;font-size:10px;color:var(--ink-4);cursor:pointer}' +
      '.tp-cat .ph img{width:100%;height:100%;object-fit:cover}' +
      '.tp-slide{display:grid;grid-template-columns:120px 1fr auto auto;gap:14px;align-items:center;padding:12px 0;border-top:1px solid var(--line)}.tp-slide:first-of-type{border-top:0}' +
      '.tp-slide .th{width:120px;aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:var(--panel-3)}.tp-slide .th img{width:100%;height:100%;object-fit:cover;display:block}' +
      '@media(max-width:760px){.tp-slide{grid-template-columns:90px 1fr}.tp-slide .th{width:90px}}' +
      '.tp-links .row{margin-bottom:6px}.tp-busy{opacity:.55;pointer-events:none}' +
      /* previews: the page's Marquee in a frame */
      '.tp-frame{position:relative;width:100%;max-width:720px;aspect-ratio:16/9;border-radius:20px;overflow:hidden;background:#1C1712}' +
      '.tp-frame.phone{max-width:300px;aspect-ratio:9/17;border-radius:30px;border:6px solid #221C18}' +
      '.tp-frame .tw-mq-stage{position:absolute;inset:0;height:100%;min-height:0;max-height:none;border-radius:inherit}' +
      '.tp-frame .tw-mq-stage .tw-slide-h{font-size:clamp(22px,2.6vw,36px)}.tp-frame.phone .tw-mq-stage .tw-slide-h{font-size:24px;font-stretch:106%}' +
      '.tp-frame .tw-mq-stage .tw-slide-copy{padding:0 20px 20px;gap:9px}.tp-frame .tw-mq-stage .tw-slide-sub{font-size:13px}' +
      '.tp-frame .tw-mq-stage .tw-btn{min-height:38px;padding:0 15px;font-size:12.5px}.tp-frame .tw-mq-top{display:none}' +
      '.tp-frame.phone .tw-slide-acts{flex-wrap:wrap}' +
      /* the console styles headings, links and accents its own way; inside a preview the page's rules win */
      '.cx .tp-frame .tw-slide-h{font:800 clamp(22px,2.6vw,36px)/.98 var(--tw-wide);font-stretch:114%;letter-spacing:-.022em;color:#fff;margin:0}' +
      '.cx .tp-frame.phone .tw-slide-h{font-size:24px;font-stretch:106%}' +
      '.cx .tp-frame .tw-slide-h em{background:none;-webkit-background-clip:border-box;background-clip:border-box;color:var(--acc-lt);font-style:normal}' +
      '.cx .tp-frame a{color:inherit}.cx .tp-frame a:hover{text-decoration:none}' +
      '.cx .tp-frame a.tw-btn-ember,.cx .tp-frame a.tw-btn-glass{color:#fff}.cx .tp-frame a.tw-btn-light{color:var(--tw-ink)}' +
      '.tp-sw button{position:relative}.tp-sw button::after{content:attr(data-name);position:absolute;left:50%;top:calc(100% + 4px);transform:translateX(-50%);font:500 9.5px/1 var(--f-m);color:var(--ink-4);white-space:nowrap;opacity:0;transition:opacity .2s}' +
      '.tp-sw button:hover::after,.tp-sw button.on::after{opacity:1}.tp-sw{padding-bottom:14px}' +
      '.tp-cat .ph .def{position:absolute;left:3px;bottom:3px;padding:2px 4px;border-radius:4px;background:rgba(0,0,0,.6);color:#fff;font:600 8.5px/1 var(--f-m);letter-spacing:.04em}' +
      '.tp-cat .ph{position:relative}' +
      '.tp-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}';
    document.head.appendChild(st);
  }

  /* ── load ────────────────────────────────────────────────────────── */
  function load() {
    var db = c(); if (!db) { S.err = 'Not connected.'; paint(); return; }
    S.err = null;
    db.from('tour_page_blocks').select('*').order('position', { ascending: true }).then(function (r) {
      if (r && r.error) { S.err = r.error.message; S.blocks = []; paint(); return; }
      var rows = (r && r.data) || [];
      // A block missing from the table (a fresh project) starts from the launch copy.
      var ids = rows.map(function (x) { return x.id; });
      defaults().forEach(function (d) { if (ids.indexOf(d.id) === -1) rows.push({ id: d.id, kind: d.kind, position: d.position, enabled: d.enabled, content: {}, _new: true }); });
      S.blocks = rows.sort(function (a, b) { return a.position - b.position; });
      paint();
    }, function () { S.err = 'Could not load the page.'; S.blocks = []; paint(); });
    db.rpc('admin_tour_spotlights').then(function (r) {
      S.slides = ((r && r.data) || []).filter(function (x) { return x.kind === 'house'; });
      paintSlides();
    }, function () { S.slides = []; paintSlides(); });
    db.from('tours').select('id,title,status,destination,county,cover_url,photos').eq('status', 'published').order('title').then(function (r) {
      S.tours = (r && r.data) || []; if (S.open) paintEditor();
    }, function () { S.tours = []; });
    db.rpc('admin_tour_operators').then(function (r) {
      S.ops = ((r && r.data) || []).filter(function (o) { return o.status === 'approved'; }); if (S.open) paintEditor();
    }, function () { S.ops = []; });
    // 360° worlds a Cabana slot can open.
    db.from('immersive_experiences').select('slug,title,status,poster_url,destination,country').order('sort_order', { ascending: true }).then(function (r) {
      S.worlds = (r && !r.error && r.data) || []; if (S.slides) paintSlides();
    }, function () { S.worlds = []; });
  }

  /* ── save ────────────────────────────────────────────────────────── */
  function saveBlock(b, patch, msg) {
    var db = c(); if (!db) return Promise.resolve(false);
    var row = { id: b.id, kind: b.kind, position: b.position, enabled: b.enabled, content: b.content || {} };
    Object.assign(row, patch || {});
    return db.from('tour_page_blocks').upsert(row, { onConflict: 'id' }).select('*').then(function (r) {
      if (r && r.error) { toast('Could not save: ' + r.error.message); return false; }
      var saved = (r && r.data && r.data[0]) || row;
      Object.assign(b, saved); delete b._new;
      if (msg !== false) toast(msg || 'Saved. It is live on /tours.');
      return true;
    }, function () { toast('Could not save'); return false; });
  }
  function move(id, dir) {
    var list = S.blocks.filter(function (b) { return b.kind !== 'hero'; });
    var i = list.findIndex(function (b) { return b.id === id; }), j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    var t = list[i]; list[i] = list[j]; list[j] = t;
    var db = c(), changed = [];
    list.forEach(function (b, k) { var p = (k + 1) * 10; if (b.position !== p) { b.position = p; changed.push(b); } });
    S.blocks.sort(function (a, b) { return a.position - b.position; });
    paint();
    Promise.all(changed.map(function (b) { return saveBlock(b, null, false); })).then(function () { toast('Order saved'); });
  }

  /* ── upload (photos and films into the tours bucket) ─────────────── */
  function loadR2() {
    if (window.CabanaR2) return Promise.resolve(window.CabanaR2);
    return new Promise(function (resolve) {
      var sc = document.createElement('script');
      sc.src = '/cabana-r2.js';
      sc.onload = function () { resolve(window.CabanaR2 || null); };
      sc.onerror = function () { resolve(null); };
      document.head.appendChild(sc);
    });
  }
  function upload(file, kind) {
    var db = c();
    if (!db) return Promise.reject(new Error('Not connected'));
    return db.auth.getUser().then(function (u) {
      var uid = u && u.data && u.data.user && u.data.user.id;
      if (!uid) throw new Error('Sign in again to upload.');
      var shrink = kind === 'image' && window.CabanaUploader && window.CabanaUploader.shrink ? window.CabanaUploader.shrink(file) : Promise.resolve(file);
      return shrink.then(function (f) {
        var ext = (f.name.match(/\.([a-z0-9]+)$/i) || [0, kind === 'image' ? 'jpg' : 'mp4'])[1].toLowerCase();
        var path = uid + '/tours-page/' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
        return loadR2().then(function (R2) {
          return R2 ? R2.putOrNull(f, { kind: 'tour', sb: db }) : null;
        }).then(function (url) {
          if (url) return url;
          return db.storage.from('tours').upload(path, f, { upsert: false, contentType: f.type || undefined, cacheControl: '31536000' }).then(function (r) {
            if (r && r.error) throw new Error(r.error.message);
            return db.storage.from('tours').getPublicUrl(path).data.publicUrl;
          });
        });
      });
    });
  }
  function pickFile(accept, kind, cb) {
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = accept;
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0]; if (!f) return;
      if (kind === 'video' && f.size > 60 * 1048576) { toast('That film is over 60 MB. Trim it to a short loop first.'); return; }
      toast('Uploading…');
      upload(f, kind).then(function (url) { cb(url); toast('Uploaded'); }, function (e) { toast('Upload failed: ' + (e && e.message || 'try again')); });
    });
    inp.click();
  }

  /* ═══ PAINT ════════════════════════════════════════════════════════ */
  function mount(host) {
    styles();
    dropPreview();
    S.root = host;
    host.innerHTML = '<div class="tp">' +
      '<div class="card"><div class="card-t">Sections</div><div class="card-s">Everything below the top of the page, in order. Switch a section off to hide it, or open it to change its words. A section with nothing real to show hides on its own.</div><div id="tp-sections" style="margin-top:10px"></div>' +
        '<div class="tp-act" style="margin-top:12px"><button class="btn btn-g btn-sm" id="tp-add-coll">+ Add a collection</button></div></div>' +
      '<div class="card"><div class="card-t">Cabana’s own Marquee slots</div><div class="card-s">Your own slots in the Marquee at the top of /tours. They play after paid slots, ads, featured tours and the automatic ones (Tours → Marquee decides those). Use real photos or film. With nothing in the Marquee at all, the page opens on the cover.</div><div id="tp-slides" style="margin-top:10px"></div></div>' +
      '<div class="card"><div class="card-t">Categories</div><div class="card-s">The names, lines and photos used for each kind of tour, here and in the catalogue filters. Lower numbers show first.</div><div id="tp-cats" style="margin-top:10px"></div></div>' +
    '</div>';
    $('#tp-add-coll', host).addEventListener('click', addCollection);
    if (S.blocks == null) { $('#tp-sections', host).innerHTML = '<div class="skel" style="height:120px"></div>'; load(); }
    else paint();
  }
  function paint() {
    var host = S.root && $('#tp-sections', S.root); if (!host) return;
    if (S.err) { host.innerHTML = '<div class="callout bad"><div>' + esc(S.err) + '<div class="t-sub">Has the page migration been applied? (tour_page_blocks)</div></div></div>'; return; }
    if (!S.blocks) return;
    var hero = block('hero'), list = S.blocks.filter(function (b) { return b.kind !== 'hero'; });
    host.innerHTML = rowHTML(hero, -1, 0) + '<div style="height:6px"></div>' + list.map(function (b, i) { return rowHTML(b, i, list.length); }).join('');
    $$('[data-mv]', host).forEach(function (btn) { btn.addEventListener('click', function () { move(btn.getAttribute('data-id'), +btn.getAttribute('data-mv')); }); });
    $$('[data-on]', host).forEach(function (inp) {
      inp.addEventListener('change', function () {
        var b = block(inp.getAttribute('data-on')); if (!b) return;
        b.enabled = inp.checked;
        saveBlock(b, null, inp.checked ? KIND[b.kind].name + ' is on' : KIND[b.kind].name + ' is off').then(paint);
      });
    });
    $$('[data-ed]', host).forEach(function (btn) {
      btn.addEventListener('click', function () { var id = btn.getAttribute('data-ed'); S.open = S.open === id ? null : id; paint(); });
    });
    paintEditor();
    paintCats();
  }
  function rowHTML(b, i, n) {
    if (!b) return '';
    var k = KIND[b.kind] || { name: b.kind, note: '' }, e = eff(b);
    var name = b.kind === 'collection' ? (plain(e.title) || 'Untitled collection') : k.name;
    var fixed = b.kind === 'hero';
    return '<div class="tp-row' + (b.enabled ? '' : ' off') + '">' +
      '<div class="tp-ord">' + (fixed ? '<span style="width:26px"></span>' :
        '<button type="button" data-mv="-1" data-id="' + esc(b.id) + '" aria-label="Move up"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
        '<button type="button" data-mv="1" data-id="' + esc(b.id) + '" aria-label="Move down"' + (i === n - 1 ? ' disabled' : '') + '>↓</button>') + '</div>' +
      '<div class="tp-name"><b>' + esc(name) + (b.kind === 'collection' ? ' <span class="pill p-info">Collection</span>' : '') + '</b><small>' + esc(k.note) + '</small>' +
        (e.title && b.kind !== 'collection' ? '<div class="tp-copy">“' + esc(plain(e.title)) + '”</div>' : '') + '</div>' +
      (fixed ? '<span class="pill p-ok">Always first</span>' : '<label class="switch" title="Show on the page"><input type="checkbox" data-on="' + esc(b.id) + '"' + (b.enabled ? ' checked' : '') + '/><span></span></label>') +
      (SCHEMA[b.kind] && SCHEMA[b.kind].length ? '<button class="btn btn-g btn-sm" type="button" data-ed="' + esc(b.id) + '">' + (S.open === b.id ? 'Close' : 'Edit') + '</button>' : '<span></span>') +
    '</div>' + (S.open === b.id ? '<div class="tp-ed" id="tp-ed"></div>' : '');
  }

  /* ── one section's editor ────────────────────────────────────────── */
  var draft = null;
  function paintEditor() {
    var host = S.root && $('#tp-ed', S.root); if (!host) return;
    var b = block(S.open); if (!b) return;
    if (!draft || draft._id !== b.id) { draft = eff(b); draft._id = b.id; }
    var fields = SCHEMA[b.kind] || [];
    host.innerHTML = fields.map(function (f) { return fieldHTML(f, draft); }).join('') +
      (b.kind === 'hero' ? '<div class="fld"><div class="tp-pvbar"><div class="fld-l" style="margin:0">The cover, as the page draws it</div>' +
          '<div class="seg" id="tp-hero-dev"><button type="button" data-dev="desktop" class="' + (S.heroDev === 'phone' ? '' : 'on') + '">Desktop</button><button type="button" data-dev="phone" class="' + (S.heroDev === 'phone' ? 'on' : '') + '">Phone</button></div></div>' +
          '<div class="tp-frame' + (S.heroDev === 'phone' ? ' phone' : '') + '" id="tp-hero-pv"></div>' +
          '<div class="fld-h">Shown whenever nothing is in the Marquee: no paid slots, ads, featured tours or Cabana slots running.</div></div>' : '') +
      '<div class="tp-act"><button class="btn btn-p btn-sm" type="button" id="tp-save">Save</button>' +
        '<button class="btn btn-g btn-sm" type="button" id="tp-reset">Back to the launch copy</button>' +
        (b.kind === 'collection' ? '<button class="btn btn-d btn-sm" type="button" id="tp-del">Delete this collection</button>' : '') +
        '<a class="btn btn-g btn-sm" href="/tours' + (b.kind === 'hero' ? '' : '#' + (ANCHOR[b.kind] || 'c-' + b.id)) + '" target="_blank" rel="noopener">View on the page ↗</a></div>';
    wireFields(host, draft, function () { if (b.kind === 'hero') heroPreview(); });
    if (b.kind === 'hero') {
      $$('[data-dev]', host).forEach(function (btn) { btn.addEventListener('click', function () { S.heroDev = btn.getAttribute('data-dev'); paintEditor(); }); });
      heroPreview();
    }
    $('#tp-save', host).addEventListener('click', function () {
      var content = Object.assign({}, draft); delete content._id;
      var bad = validate(b.kind, content); if (bad) { toast(bad); return; }
      var btn = this; btn.disabled = true;
      saveBlock(b, { content: content }).then(function (ok) { btn.disabled = false; if (ok) { draft = null; paint(); } });
    });
    $('#tp-reset', host).addEventListener('click', function () {
      if (!window.confirm('Put this section back to the launch copy? Your edits to it are replaced.')) return;
      var d = def(b.id); draft = d ? clone(d.content) : {}; draft._id = b.id; paintEditor();
    });
    var del = $('#tp-del', host);
    if (del) del.addEventListener('click', function () {
      if (!window.confirm('Delete this collection from the page?')) return;
      c().from('tour_page_blocks').delete().eq('id', b.id).then(function (r) {
        if (r && r.error) { toast(r.error.message); return; }
        S.blocks = S.blocks.filter(function (x) { return x.id !== b.id; }); S.open = null; draft = null; paint(); toast('Collection deleted');
      });
    });
  }
  function validate(kind, x) {
    if (kind === 'collection' && !plain(x.title).trim()) return 'Give the collection a title.';
    var links = ['cta_url', 'empty_cta_url'].filter(function (k) { return x[k] && !internal(x[k]); });
    if (links.length) return 'Buttons can only link to pages on Cabana.';
    if (Array.isArray(x.links) && x.links.some(function (l) { return l.url && !internal(l.url); })) return 'Quick links can only go to pages on Cabana.';
    if (x.title && String(x.title).length > 120) return 'Keep the title under 120 characters.';
    return '';
  }
  function fieldHTML(f, x) {
    var k = f[0], label = f[1], type = f[2], hint = typeof f[3] === 'string' ? f[3] : '';
    var v = x[k], id = 'tpf-' + k;
    var hintHTML = hint ? '<div class="fld-h">' + esc(hint) + '</div>' : '';
    if (type === 'bool') return '<div class="fld"><label style="display:flex;gap:10px;align-items:center;cursor:pointer"><span class="switch"><input type="checkbox" data-k="' + k + '" data-t="bool"' + (v ? ' checked' : '') + '/><span></span></span><span style="font-size:13px;color:var(--ink-2)">' + esc(label) + '</span></label>' + hintHTML + '</div>';
    var inner = '';
    if (type === 'text' || type === 'title') inner = '<input class="inp" id="' + id + '" data-k="' + k + '" value="' + esc(v == null ? '' : v) + '"' + (type === 'title' ? ' maxlength="120"' : '') + '/>' +
      (type === 'title' ? '<div class="fld-h">Wrap words in *stars* to set them in the section’s accent colour.</div>' : '');
    else if (type === 'textarea') inner = '<textarea class="inp" id="' + id + '" data-k="' + k + '" rows="3" style="height:auto;padding:10px 12px;line-height:1.5">' + esc(v == null ? '' : v) + '</textarea>';
    else if (type === 'lines') inner = '<textarea class="inp" id="' + id + '" data-k="' + k + '" data-t="lines" rows="4" style="height:auto;padding:10px 12px;line-height:1.5">' + esc((Array.isArray(v) ? v : []).join('\n')) + '</textarea>';
    else if (type === 'number') inner = '<input class="inp" type="number" min="4" max="24" id="' + id + '" data-k="' + k + '" data-t="number" value="' + esc(v == null ? '' : v) + '" style="max-width:120px"/>';
    else if (type === 'range') inner = '<input type="range" min="10" max="85" step="5" id="' + id + '" data-k="' + k + '" data-t="number" value="' + esc(v == null ? 55 : v) + '" style="width:260px"/> <span class="mono" data-range="' + k + '">' + esc(v == null ? 55 : v) + '%</span>';
    else if (type === 'select') inner = '<select class="inp" id="' + id + '" data-k="' + k + '" style="max-width:260px">' + f[3].map(function (o) { return '<option value="' + o[0] + '"' + ((v || f[3][0][0]) === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
    else if (type === 'focal') inner = '<select class="inp" id="' + id + '" data-k="' + k + '" style="max-width:260px">' +
      [['50% 50%', 'The middle'], ['50% 20%', 'The top'], ['50% 80%', 'The bottom'], ['25% 50%', 'The left'], ['75% 50%', 'The right']].map(function (o) { return '<option value="' + o[0] + '"' + ((v || '50% 50%') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>';
    else if (type === 'image' || type === 'video') inner = '<div class="tp-img"><div class="ph">' + (v ? (type === 'image' ? '<img src="' + esc(v) + '" alt=""/>' : '<video src="' + esc(v) + '" muted playsinline></video>') : 'None') + '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-g btn-sm" type="button" data-up="' + k + '" data-kind="' + type + '">' + (v ? 'Replace' : 'Upload') + '</button>' + (v ? '<button class="btn btn-g btn-sm" type="button" data-clear="' + k + '">Remove</button>' : '') + '</div></div>';
    else if (type === 'links') inner = '<div class="tp-links">' + (Array.isArray(v) ? v : []).map(function (l, i) {
        return '<div class="row"><input class="inp sm" data-link="' + i + '" data-part="label" placeholder="Label" value="' + esc(l.label || '') + '" style="max-width:200px"/><input class="inp sm" data-link="' + i + '" data-part="url" placeholder="/tours-catalogue?…" value="' + esc(l.url || '') + '"/><button class="btn btn-g btn-sm" type="button" data-link-rm="' + i + '">×</button></div>';
      }).join('') + ((Array.isArray(v) ? v.length : 0) < 8 ? '<button class="btn btn-g btn-sm" type="button" data-link-add>+ Add a link</button>' : '') + '</div>';
    else if (type === 'tours') inner = toursPicker(v);
    else if (type === 'guides') inner = guidesPicker(v);
    return '<div class="fld"><label class="fld-l" for="' + id + '">' + esc(label) + '</label>' + inner + (type === 'title' ? '' : hintHTML) + '</div>';
  }
  function wireFields(host, x, changed) {
    $$('[data-k]', host).forEach(function (inp) {
      var ev = inp.type === 'checkbox' || inp.tagName === 'SELECT' ? 'change' : 'input';
      inp.addEventListener(ev, function () {
        var k = inp.getAttribute('data-k'), t = inp.getAttribute('data-t');
        if (t === 'bool') x[k] = inp.checked;
        else if (t === 'number') { x[k] = inp.value === '' ? null : Number(inp.value); var r = $('[data-range="' + k + '"]', host); if (r) r.textContent = inp.value + '%'; }
        else if (t === 'lines') x[k] = inp.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
        else x[k] = inp.value;
        changed && changed();
      });
    });
    $$('[data-up]', host).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var k = btn.getAttribute('data-up'), kind = btn.getAttribute('data-kind');
        pickFile(kind === 'image' ? 'image/jpeg,image/png,image/webp' : 'video/mp4,video/webm', kind, function (url) { x[k] = url; paintEditor(); });
      });
    });
    $$('[data-clear]', host).forEach(function (btn) { btn.addEventListener('click', function () { x[btn.getAttribute('data-clear')] = null; paintEditor(); }); });
    $$('[data-link]', host).forEach(function (inp) {
      inp.addEventListener('input', function () { var i = +inp.getAttribute('data-link'); x.links = (x.links || []).slice(); x.links[i] = Object.assign({}, x.links[i]); x.links[i][inp.getAttribute('data-part')] = inp.value; changed && changed(); });
    });
    $$('[data-link-rm]', host).forEach(function (b) { b.addEventListener('click', function () { x.links = (x.links || []).filter(function (_, i) { return i !== +b.getAttribute('data-link-rm'); }); paintEditor(); }); });
    var la = $('[data-link-add]', host); if (la) la.addEventListener('click', function () { x.links = (x.links || []).concat([{ label: '', url: '' }]); paintEditor(); });
    wireTours(host, x); wireGuides(host, x);
  }

  /* The cover, drawn by the page's own Marquee code. The photo is only
     redrawn when the photo changes; typing redraws just the words. */
  function heroPreview() {
    var pv = S.root && $('#tp-hero-pv', S.root); if (!pv || !draft) return;
    var SL = window.CabanaMarquee;
    if (!SL || !SL.cover) { pv.innerHTML = '<div class="t-sub" style="padding:18px;color:#fff">The preview could not load. Reload the console to try again.</div>'; return; }
    var c = Object.assign({}, draft), phone = S.heroDev === 'phone';
    if (phone && c.image_mobile) c.image = c.image_mobile;
    c.image_mobile = null;       // the frame decides the crop here, not the window
    var html = SL.cover({ content: c });
    var sig = [c.image, c.video, c.focal, c.shade, phone].join('|');
    var old = pv.__sig === sig && $('.tw-slide-copy', pv);
    if (old) {
      var tmp = document.createElement('div'); tmp.innerHTML = html;
      var nw = $('.tw-slide-copy', tmp); if (nw) { old.innerHTML = nw.innerHTML; return; }
    }
    pv.__sig = sig;
    pv.innerHTML = '<div class="tw-mq-stage is-cover is-single is-preview" aria-label="Cover preview">' + html + '</div>';
  }

  /* tours picker for collections */
  function toursPicker(ids) {
    ids = Array.isArray(ids) ? ids : [];
    var by = {}; (S.tours || []).forEach(function (t) { by[String(t.id)] = t; });
    return '<div class="tp-list" id="tp-picked">' + (ids.length ? ids.map(function (id, i) {
        var t = by[String(id)];
        return '<div class="tp-li"><span class="t">' + esc(t ? t.title : 'Tour #' + id) + (t ? '<small>' + esc(t.destination || t.county || '') + '</small>' : '<small>not published right now</small>') + '</span>' +
          '<button type="button" data-tp-mv="-1" data-i="' + i + '"' + (i ? '' : ' disabled') + '>↑</button><button type="button" data-tp-mv="1" data-i="' + i + '"' + (i === ids.length - 1 ? ' disabled' : '') + '>↓</button><button type="button" data-tp-rm="' + i + '">×</button></div>';
      }).join('') : '<div class="t-sub">No tours yet. Search below and add them in the order they should appear.</div>') + '</div>' +
      '<input class="inp" id="tp-tq" placeholder="Search published tours by name or place" style="margin-top:10px"/><div class="tp-res" id="tp-tres"></div>';
  }
  function wireTours(host, x) {
    var q = $('#tp-tq', host); if (!q) return;
    function res() {
      var box = $('#tp-tres', host), s = q.value.trim().toLowerCase(), have = (x.tour_ids || []).map(String);
      var list = (S.tours || []).filter(function (t) { return have.indexOf(String(t.id)) === -1 && (!s || (t.title + ' ' + (t.destination || '') + ' ' + (t.county || '')).toLowerCase().indexOf(s) !== -1); }).slice(0, 12);
      box.innerHTML = S.tours == null ? '<div class="t-sub">Loading tours…</div>' : list.length ? list.map(function (t) {
        return '<div class="tp-li"><span class="t">' + esc(t.title) + '<small>' + esc(t.destination || t.county || '') + '</small></span><button type="button" data-tp-add="' + t.id + '">Add</button></div>';
      }).join('') : '<div class="t-sub">' + (S.tours.length ? 'No other published tours match.' : 'There are no published tours yet. Collections show once their tours are live.') + '</div>';
      $$('[data-tp-add]', box).forEach(function (b) { b.addEventListener('click', function () { x.tour_ids = (x.tour_ids || []).concat([Number(b.getAttribute('data-tp-add'))]); paintEditor(); }); });
    }
    q.addEventListener('input', res); res();
    $$('[data-tp-rm]', host).forEach(function (b) { b.addEventListener('click', function () { var i = +b.getAttribute('data-tp-rm'); x.tour_ids = (x.tour_ids || []).filter(function (_, j) { return j !== i; }); paintEditor(); }); });
    $$('[data-tp-mv]', host).forEach(function (b) {
      b.addEventListener('click', function () {
        var i = +b.getAttribute('data-i'), j = i + +b.getAttribute('data-tp-mv'), a = (x.tour_ids || []).slice();
        if (j < 0 || j >= a.length) return; var t = a[i]; a[i] = a[j]; a[j] = t; x.tour_ids = a; paintEditor();
      });
    });
  }

  /* guides picker */
  function guidesPicker(ids) {
    ids = (Array.isArray(ids) ? ids : []).map(String);
    if (S.ops == null) return '<div class="t-sub">Loading guides…</div>';
    if (!S.ops.length) return '<div class="t-sub">No approved guides or operators yet.</div>';
    var picked = ids.map(function (id) { return S.ops.filter(function (o) { return String(o.id) === id; })[0]; }).filter(Boolean);
    var rest = S.ops.filter(function (o) { return ids.indexOf(String(o.id)) === -1; });
    return '<div class="tp-list">' + picked.map(function (o, i) {
        return '<div class="tp-li"><span class="t">' + (i + 1) + '. ' + esc(o.name) + '<small>' + esc(o.persona === 'guide' ? 'Guide' : 'Operator') + (o.county ? ' · ' + esc(o.county) : '') + '</small></span><button type="button" data-gp-rm="' + esc(o.id) + '">Remove</button></div>';
      }).join('') + '</div>' +
      (rest.length ? '<select class="inp" id="tp-gadd" style="margin-top:8px;max-width:360px"><option value="">Add a guide to the front…</option>' + rest.map(function (o) { return '<option value="' + esc(o.id) + '">' + esc(o.name) + '</option>'; }).join('') + '</select>' : '');
  }
  function wireGuides(host, x) {
    $$('[data-gp-rm]', host).forEach(function (b) { b.addEventListener('click', function () { var id = b.getAttribute('data-gp-rm'); x.featured_ids = (x.featured_ids || []).filter(function (v) { return String(v) !== id; }); paintEditor(); }); });
    var sel = $('#tp-gadd', host);
    if (sel) sel.addEventListener('change', function () { if (!sel.value) return; x.featured_ids = (x.featured_ids || []).concat([Number(sel.value)]); paintEditor(); });
  }

  /* ── collections ─────────────────────────────────────────────────── */
  function addCollection() {
    if (!S.blocks) return;
    var n = S.blocks.filter(function (b) { return b.kind === 'collection'; }).length + 1;
    var id = 'collection-' + Date.now().toString(36);
    var after = block('kinds'), pos = after ? after.position + 5 : 30;
    var b = { id: id, kind: 'collection', position: pos, enabled: true, content: { eyebrow: 'Collection', title: 'Collection ' + n, lede: '', tour_ids: [], layout: 'rail' } };
    S.blocks.push(b); S.blocks.sort(function (a, x) { return a.position - x.position; });
    saveBlock(b, null, 'Collection added. Pick its tours, then save.').then(function (ok) {
      if (!ok) { S.blocks = S.blocks.filter(function (x) { return x !== b; }); paint(); return; }
      S.open = id; draft = null; paint();
      var ed = $('#tp-ed', S.root); if (ed && ed.scrollIntoView) ed.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /* ── categories ──────────────────────────────────────────────────── */
  var catDraft = null;
  function paintCats() {
    var host = S.root && $('#tp-cats', S.root); if (!host || !S.blocks) return;
    var b = block('kinds'); if (!b) { host.innerHTML = ''; return; }
    if (!catDraft) catDraft = clone(eff(b).items || {});
    host.innerHTML = CATS.map(function (k) {
      var it = catDraft[k[0]] || (catDraft[k[0]] = { name: k[1], blurb: '', image: null, hidden: false, position: 9 });
      return '<div class="tp-cat" data-cat="' + k[0] + '">' +
        '<div class="ph" data-cat-up="' + k[0] + '" title="Upload a photo">' + (it.image ? '<img src="' + esc(it.image) + '" alt=""/>' : '<img src="/assets/tours/kinds/' + k[0] + '-720.webp" alt=""/><span class="def">Default</span>') + '</div>' +
        '<input class="inp sm" data-cat-f="name" value="' + esc(it.name || '') + '" placeholder="' + esc(k[1]) + '"/>' +
        '<input class="inp sm" data-cat-f="blurb" value="' + esc(it.blurb || '') + '" placeholder="One line about this kind of tour"/>' +
        '<input class="inp sm" type="number" min="1" max="20" data-cat-f="position" value="' + esc(it.position || '') + '" style="width:64px" title="Order"/>' +
        '<label class="switch" title="Show this category"><input type="checkbox" data-cat-f="shown"' + (it.hidden ? '' : ' checked') + '/><span></span></label>' +
      '</div>';
    }).join('') + '<div class="tp-act" style="margin-top:12px"><button class="btn btn-p btn-sm" type="button" id="tp-cats-save">Save categories</button>' +
      '<span class="t-sub" style="align-self:center">Click a photo to upload your own. Without one, the page uses Cabana’s default photo for that kind of tour.</span></div>' +
      '<div class="tp-act">' + CATS.filter(function (k) { return catDraft[k[0]] && catDraft[k[0]].image; }).map(function (k) { return '<button class="btn btn-g btn-sm" type="button" data-cat-clear="' + k[0] + '">Back to the default ' + esc(catDraft[k[0]].name || k[1]) + ' photo</button>'; }).join('') + '</div>';
    $$('[data-cat]', host).forEach(function (row) {
      var key = row.getAttribute('data-cat');
      $$('[data-cat-f]', row).forEach(function (inp) {
        inp.addEventListener(inp.type === 'checkbox' ? 'change' : 'input', function () {
          var f = inp.getAttribute('data-cat-f');
          if (f === 'shown') catDraft[key].hidden = !inp.checked;
          else if (f === 'position') catDraft[key].position = Number(inp.value) || 9;
          else catDraft[key][f] = inp.value;
        });
      });
    });
    $$('[data-cat-up]', host).forEach(function (ph) {
      ph.addEventListener('click', function () { var key = ph.getAttribute('data-cat-up'); pickFile('image/jpeg,image/png,image/webp', 'image', function (url) { catDraft[key].image = url; paintCats(); }); });
    });
    $$('[data-cat-clear]', host).forEach(function (btn) { btn.addEventListener('click', function () { catDraft[btn.getAttribute('data-cat-clear')].image = null; paintCats(); }); });
    $('#tp-cats-save', host).addEventListener('click', function () {
      var content = Object.assign({}, b.content || {}, { items: clone(catDraft) });
      saveBlock(b, { content: content }, 'Categories saved').then(function (ok) { if (ok) { catDraft = null; paintCats(); } });
    });
  }

  /* ═══ CABANA'S OWN MARQUEE SLOTS ═══════════════════════════════════
     A slot has a photo or film, words, a badge, the devices it shows on,
     and a button that goes somewhere on Cabana or opens a 360° world. */
  var FOCAL = [['50% 50%', 'The middle'], ['50% 20%', 'The top'], ['50% 80%', 'The bottom'], ['25% 50%', 'The left'], ['75% 50%', 'The right']];
  var DEVICES = [['all', 'Everywhere'], ['phone', 'Phones only'], ['desktop', 'Computers only']];
  function slotState(s) {
    var now = Date.now(), st = new Date(s.starts_at).getTime(), en = new Date(s.ends_at).getTime();
    if (s.status === 'paused') return ['Paused', 'p-warn'];
    if (s.status === 'ended' || s.status === 'cancelled') return ['Ended', 'p-mute'];
    if (s.status !== 'approved') return [s.status, 'p-mute'];
    if (now < st) return ['Starts ' + day(s.starts_at), 'p-info'];
    if (now >= en) return ['Finished', 'p-mute'];
    return ['Live', 'p-ok'];
  }
  function thumb(s) {
    var src = s.media_kind === 'youtube' ? 'https://i.ytimg.com/vi/' + ytId(s.media_url) + '/mqdefault.jpg' : (s.poster_url || (s.media_kind === 'image' ? s.media_url : ''));
    return '<div class="th">' + (src ? '<img src="' + esc(src) + '" alt=""/>' : '') + '</div>';
  }
  function worldName(slug) {
    var w = (S.worlds || []).filter(function (x) { return x.slug === slug; })[0];
    return w ? w.title : slug;
  }
  function paintSlides() {
    var host = S.root && $('#tp-slides', S.root); if (!host) return;
    if (S.slides == null) { host.innerHTML = '<div class="skel" style="height:80px"></div>'; return; }
    var list = S.slides.filter(function (s) { return s.media_kind !== 'art' && s.media_kind !== 'world' && s.status !== 'cancelled'; })
      .sort(function (a, b) { return (b.live - a.live) || (Number(b.priority) || 0) - (Number(a.priority) || 0); });
    var active = list.filter(function (s) { return s.status === 'approved' || s.status === 'paused'; }), old = list.filter(function (s) { return s.status === 'ended'; }).slice(0, 6);
    var paused = active.filter(function (s) { return s.status === 'paused'; }).length;
    host.innerHTML = (paused && paused === active.length ? '<div class="callout" style="margin-bottom:10px"><div>Every Cabana slot is paused, so the Marquee shows only paid slots, ads and featured tours, or the cover. Resume the ones that should run.</div></div>' : '') +
      (active.length ? active.map(slideRow).join('') : '<div class="t-sub">No Cabana slots yet. Add one with a real photo or film.</div>') +
      (old.length ? '<details style="margin-top:10px"><summary class="t-sub" style="cursor:pointer">Ended (' + old.length + ')</summary>' + old.map(slideRow).join('') + '</details>' : '') +
      '<div class="tp-act" style="margin-top:12px"><button class="btn btn-p btn-sm" type="button" id="tp-new-slide">+ New slot</button></div><div id="tp-slide-form"></div>';
    $$('[data-sl-act]', host).forEach(function (btn) { btn.addEventListener('click', function () { slideAct(btn.getAttribute('data-id'), btn.getAttribute('data-sl-act')); }); });
    $('#tp-new-slide', host).addEventListener('click', function () { openSlide(null); });
    if (S.slideForm) paintSlideForm();
  }
  function slideRow(s) {
    var acts = '<button class="btn btn-g btn-sm" data-sl-act="edit" data-id="' + s.id + '">Edit</button>';
    if (s.status === 'approved') acts += '<button class="btn btn-g btn-sm" data-sl-act="pause" data-id="' + s.id + '">Pause</button><button class="btn btn-d btn-sm" data-sl-act="end" data-id="' + s.id + '">End</button>';
    else if (s.status === 'paused') acts += '<button class="btn btn-ok btn-sm" data-sl-act="resume" data-id="' + s.id + '">Resume</button><button class="btn btn-d btn-sm" data-sl-act="end" data-id="' + s.id + '">End</button>';
    else acts += '<button class="btn btn-d btn-sm" data-sl-act="delete" data-id="' + s.id + '">Delete</button>';
    var st = slotState(s), tags = [];
    if (s.label) tags.push('<span class="pill p-brand">' + esc(s.label) + '</span>');
    if (s.world_slug) tags.push('<span class="pill p-info">Opens 360°: ' + esc(worldName(s.world_slug)) + '</span>');
    if (s.device && s.device !== 'all') tags.push('<span class="pill p-mute">' + (s.device === 'phone' ? 'Phones only' : 'Computers only') + '</span>');
    return '<div class="tp-slide">' + thumb(s) +
      '<div><div class="t-main">' + esc(plain(s.headline)) + '</div>' +
        '<div class="t-sub">' + esc(day(s.starts_at)) + ' → ' + esc(day(s.ends_at)) + ' · order ' + esc(s.priority || 0) + ' · ' + (s.impressions || 0) + ' views, ' + (s.clicks || 0) + ' taps</div>' +
        (tags.length ? '<div class="tp-tags">' + tags.join('') + '</div>' : '') + '</div>' +
      '<span class="pill ' + st[1] + '">' + esc(st[0]) + '</span>' +
      '<div class="t-act" style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">' + acts + '</div></div>';
  }
  function slideAct(id, act) {
    var s = (S.slides || []).filter(function (x) { return x.id === id; })[0]; if (!s) return;
    if (act === 'edit') { openSlide(s); return; }
    if (act === 'delete') {
      if (!window.confirm('Delete this slot for good?')) return;
      c().from('tour_spotlights').delete().eq('id', id).eq('kind', 'house').then(function (r) { if (r && r.error) toast(r.error.message); else { toast('Deleted'); reloadSlides(); } });
      return;
    }
    if (act === 'end' && !window.confirm('End this slot now? It leaves the Marquee straight away.')) return;
    c().rpc('admin_tour_spotlight_decide', { p_id: id, p_action: act, p_note: null }).then(function (r) {
      if (r && r.error) { toast(r.error.message); return; }
      toast({ pause: 'Paused. It leaves the Marquee on the next visit.', resume: 'Back in the Marquee', end: 'Ended' }[act] || 'Done'); reloadSlides();
    }, function () { toast('Could not update'); });
  }
  function reloadSlides() {
    c().rpc('admin_tour_spotlights').then(function (r) { S.slides = ((r && r.data) || []).filter(function (x) { return x.kind === 'house'; }); paintSlides(); });
  }
  function openSlide(s) {
    var today = isoDay(Date.now()), later = isoDay(Date.now() + 90 * 864e5);
    S.slideForm = s ? {
      id: s.id, media_kind: s.media_kind === 'youtube' ? 'youtube' : s.media_kind === 'video' ? 'video' : 'image',
      media_url: s.media_url || '', media_mobile_url: s.media_mobile_url || '', poster_url: s.poster_url || '', focal: s.focal || '50% 50%',
      label: s.label || '', kicker: s.kicker || '', headline: s.headline || '', subline: s.subline || '', cta_label: s.cta_label || '', cta_url: s.cta_url || '',
      world_slug: s.world_slug || '', device: s.device || 'all',
      accent: s.accent || '#F2541B', starts: isoDay(s.starts_at), ends: isoDay(s.ends_at), priority: Number(s.priority) || 0
    } : { id: null, media_kind: 'image', media_url: '', media_mobile_url: '', poster_url: '', focal: '50% 50%', label: '', kicker: '', headline: '', subline: '', cta_label: '', cta_url: '/tours-catalogue', world_slug: '', device: 'all', accent: '#F2541B', starts: today, ends: later, priority: 10 };
    paintSlideForm();
    var f = S.root && $('#tp-slide-form', S.root); if (f && f.scrollIntoView) f.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function worldOptions(cur) {
    if (S.worlds == null) return '<option value="">Loading worlds…</option>';
    var live = S.worlds.filter(function (w) { return w.status === 'published'; });
    var out = '<option value="">No, a normal button</option>' + live.map(function (w) {
      return '<option value="' + esc(w.slug) + '"' + (cur === w.slug ? ' selected' : '') + '>' + esc(w.title) + (w.destination || w.country ? ' · ' + esc(w.destination || w.country) : '') + '</option>';
    }).join('');
    if (cur && !live.some(function (w) { return w.slug === cur; })) out += '<option value="' + esc(cur) + '" selected>' + esc(worldName(cur)) + ' (not live: the button falls back to the 360° room)</option>';
    return out;
  }
  function dropPreview() { if (S.slidePv) { try { S.slidePv.destroy(); } catch (e) {} } S.slidePv = null; S.slidePvBox = null; }
  function paintSlideForm() {
    var host = S.root && $('#tp-slide-form', S.root), f = S.slideForm; if (!host || !f) return;
    dropPreview();
    var mk = f.media_kind, dev = S.slideDev === 'phone' ? 'phone' : 'desktop';
    var world = f.world_slug && (S.worlds || []).filter(function (w) { return w.slug === f.world_slug; })[0];
    host.innerHTML = '<div class="tp-ed"><div class="card-t" style="margin-bottom:12px">' + (f.id ? 'Edit slot' : 'New slot') + '</div>' +
      '<div class="g2"><div>' +
        '<div class="fld"><div class="fld-l">Photo or film</div><div class="seg" id="tp-mk">' + [['image', 'Photo'], ['video', 'Film'], ['youtube', 'YouTube']].map(function (o) { return '<button type="button" data-mk="' + o[0] + '" class="' + (mk === o[0] ? 'on' : '') + '">' + o[1] + '</button>'; }).join('') + '</div></div>' +
        (mk === 'youtube'
          ? '<div class="fld"><label class="fld-l" for="tp-yt">YouTube link</label><input class="inp" id="tp-yt" value="' + esc(f.media_url) + '" placeholder="https://youtu.be/…"/><div class="fld-h">Plays muted and looped, from youtube-nocookie.com.</div></div>'
          : '<div class="fld"><div class="fld-l">' + (mk === 'video' ? 'Film (MP4, a short loop)' : 'Photo (landscape, 2000 px or more)') + '</div><div class="tp-img"><div class="ph">' + (f.media_url ? (mk === 'video' ? '<video src="' + esc(f.media_url) + '" muted playsinline></video>' : '<img src="' + esc(f.media_url) + '" alt=""/>') : 'None') + '</div>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-g btn-sm" type="button" data-sf-up="media_url" data-kind="' + mk + '">' + (f.media_url ? 'Replace' : 'Upload') + '</button>' +
            (mk === 'image' && world && world.poster_url && f.media_url !== world.poster_url ? '<button class="btn btn-g btn-sm" type="button" id="tp-sf-wposter">Use the world’s poster</button>' : '') + '</div></div></div>') +
        (mk !== 'youtube' ? '<div class="fld"><div class="fld-l">' + (mk === 'video' ? 'Still frame, shown while the film loads' : 'Phone crop (optional, portrait)') + '</div><div class="tp-img"><div class="ph">' + ((mk === 'video' ? f.poster_url : f.media_mobile_url) ? '<img src="' + esc(mk === 'video' ? f.poster_url : f.media_mobile_url) + '" alt=""/>' : 'None') + '</div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-g btn-sm" type="button" data-sf-up="' + (mk === 'video' ? 'poster_url' : 'media_mobile_url') + '" data-kind="image">Upload</button>' +
          ((mk === 'video' ? f.poster_url : f.media_mobile_url) ? '<button class="btn btn-g btn-sm" type="button" data-sf-clear="' + (mk === 'video' ? 'poster_url' : 'media_mobile_url') + '">Remove</button>' : '') + '</div></div></div>' : '') +
        '<div class="fld"><label class="fld-l" for="tp-sf-focal">Keep in view</label><select class="inp" id="tp-sf-focal" data-sf="focal" style="max-width:220px">' + FOCAL.map(function (o) { return '<option value="' + o[0] + '"' + (f.focal === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' +
        '<div class="g2"><div class="fld"><label class="fld-l" for="tp-sf-b">Badge <span class="opt">optional</span></label><input class="inp" id="tp-sf-b" data-sf="label" maxlength="24" value="' + esc(f.label) + '" placeholder="e.g. New"/><div class="fld-h">Up to 24 characters, in the slot’s colour.</div></div>' +
          '<div class="fld"><label class="fld-l" for="tp-sf-k">Small label <span class="opt">optional</span></label><input class="inp" id="tp-sf-k" data-sf="kicker" maxlength="60" value="' + esc(f.kicker) + '" placeholder="e.g. For guides"/></div></div>' +
        '<div class="fld"><label class="fld-l" for="tp-sf-h">Headline</label><input class="inp" id="tp-sf-h" data-sf="headline" maxlength="70" value="' + esc(f.headline) + '" placeholder="e.g. The Mara, *before the crowds*"/><div class="fld-h">Up to 70 characters. Wrap words in *stars* to set them in the slot’s colour.</div></div>' +
        '<div class="fld"><label class="fld-l" for="tp-sf-s">Line under it <span class="opt">optional</span></label><textarea class="inp" id="tp-sf-s" data-sf="subline" rows="2" maxlength="180" style="height:auto;padding:10px 12px">' + esc(f.subline) + '</textarea></div>' +
        '<div class="fld"><label class="fld-l" for="tp-sf-w">Does the button open a 360° world?</label><select class="inp" id="tp-sf-w" data-sf="world_slug" style="max-width:360px">' + worldOptions(f.world_slug) + '</select>' +
          '<div class="fld-h">' + (f.world_slug ? 'The button opens this world in the 360° player. A link below, if any, becomes a second button.' : 'Worlds are added under Immersive. Only live worlds are listed.') + '</div></div>' +
        '<div class="g2"><div class="fld"><label class="fld-l" for="tp-sf-cl">Button</label><input class="inp" id="tp-sf-cl" data-sf="cta_label" maxlength="30" value="' + esc(f.cta_label) + '" placeholder="' + (f.world_slug ? 'Step inside' : 'e.g. See the tours') + '"/></div>' +
          '<div class="fld"><label class="fld-l" for="tp-sf-cu">' + (f.world_slug ? 'Second button link <span class="opt">optional</span>' : 'Button link') + '</label><input class="inp" id="tp-sf-cu" data-sf="cta_url" value="' + esc(f.cta_url) + '" placeholder="/tours-catalogue?cat=big-safari"/><div class="fld-h">A page on Cabana, or #places, #immersive, #departures on /tours.</div></div></div>' +
        '<div class="fld"><div class="fld-l">Shows on</div><div class="seg" id="tp-dev">' + DEVICES.map(function (o) { return '<button type="button" data-sf-dev="' + o[0] + '" class="' + (f.device === o[0] ? 'on' : '') + '">' + o[1] + '</button>'; }).join('') + '</div></div>' +
        '<div class="fld"><div class="fld-l">Colour</div><div class="tp-sw">' + ACCENTS.map(function (a) { return '<button type="button" data-acc="' + a[0] + '" data-name="' + a[1] + '" class="' + (f.accent === a[0] ? 'on' : '') + '" style="background:' + a[0] + '" aria-label="' + a[1] + '"></button>'; }).join('') + '</div></div>' +
        '<div class="g2"><div class="fld"><label class="fld-l" for="tp-sf-st">Starts</label><input class="inp" type="date" id="tp-sf-st" data-sf="starts" value="' + esc(f.starts) + '"/></div>' +
          '<div class="fld"><label class="fld-l" for="tp-sf-en">Ends</label><input class="inp" type="date" id="tp-sf-en" data-sf="ends" value="' + esc(f.ends) + '"/></div></div>' +
        '<div class="fld"><label class="fld-l" for="tp-sf-p">Order among Cabana slots</label><input class="inp" type="number" min="0" max="100" id="tp-sf-p" data-sf="priority" value="' + esc(f.priority) + '" style="max-width:120px"/><div class="fld-h">Higher numbers play first. Paid slots, ads and featured tours always come before Cabana’s own.</div></div>' +
      '</div><div><div class="fld" style="position:sticky;top:12px"><div class="tp-pvbar"><div class="fld-l" style="margin:0">As it plays</div>' +
          '<div class="seg" id="tp-sl-dev"><button type="button" data-pv-dev="desktop" class="' + (dev === 'desktop' ? 'on' : '') + '">Desktop</button><button type="button" data-pv-dev="phone" class="' + (dev === 'phone' ? 'on' : '') + '">Phone</button></div></div>' +
          '<div class="tp-frame' + (dev === 'phone' ? ' phone' : '') + '" id="tp-sl-frame"><div id="tp-sl-pv"></div></div>' +
          (f.device !== 'all' && f.device !== dev ? '<div class="fld-h">This slot is set to show on ' + (f.device === 'phone' ? 'phones' : 'computers') + ' only, so travellers on ' + (dev === 'phone' ? 'phones' : 'computers') + ' will not see it.</div>' : '') +
      '</div></div></div>' +
      '<div class="tp-act"><button class="btn btn-p btn-sm" type="button" id="tp-sf-save">' + (f.id ? 'Save slot' : 'Publish slot') + '</button><button class="btn btn-g btn-sm" type="button" id="tp-sf-x">Cancel</button></div></div>';
    $$('[data-mk]', host).forEach(function (b) { b.addEventListener('click', function () { if (f.media_kind !== b.getAttribute('data-mk')) { f.media_kind = b.getAttribute('data-mk'); f.media_url = ''; f.poster_url = ''; } paintSlideForm(); }); });
    var yt = $('#tp-yt', host); if (yt) yt.addEventListener('input', function () { f.media_url = yt.value.trim(); slidePreview(); });
    $$('[data-sf]', host).forEach(function (inp) {
      inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', function () {
        var k = inp.getAttribute('data-sf');
        f[k] = inp.type === 'number' ? Number(inp.value) || 0 : inp.value;
        if (k === 'world_slug') { if (f.world_slug && (!f.cta_url || f.cta_url === '/tours-catalogue')) f.cta_url = '#immersive'; paintSlideForm(); return; }
        slidePreview();
      });
    });
    $$('[data-sf-dev]', host).forEach(function (b) { b.addEventListener('click', function () { f.device = b.getAttribute('data-sf-dev'); if (f.device !== 'all') S.slideDev = f.device; paintSlideForm(); }); });
    $$('[data-pv-dev]', host).forEach(function (b) { b.addEventListener('click', function () { S.slideDev = b.getAttribute('data-pv-dev'); paintSlideForm(); }); });
    $$('[data-acc]', host).forEach(function (b) { b.addEventListener('click', function () { f.accent = b.getAttribute('data-acc'); $$('[data-acc]', host).forEach(function (x) { x.classList.toggle('on', x === b); }); slidePreview(); }); });
    $$('[data-sf-up]', host).forEach(function (b) {
      b.addEventListener('click', function () {
        var key = b.getAttribute('data-sf-up'), kind = b.getAttribute('data-kind');
        pickFile(kind === 'video' ? 'video/mp4,video/webm' : 'image/jpeg,image/png,image/webp', kind, function (url) { f[key] = url; paintSlideForm(); });
      });
    });
    $$('[data-sf-clear]', host).forEach(function (b) { b.addEventListener('click', function () { f[b.getAttribute('data-sf-clear')] = ''; paintSlideForm(); }); });
    var wp = $('#tp-sf-wposter', host); if (wp) wp.addEventListener('click', function () { f.media_url = world.poster_url; paintSlideForm(); });
    $('#tp-sf-x', host).addEventListener('click', function () { dropPreview(); S.slideForm = null; host.innerHTML = ''; });
    $('#tp-sf-save', host).addEventListener('click', saveSlide);
    var frame = $('#tp-sl-frame', host);
    frame.addEventListener('click', function (e) { if (e.target.closest('a, [data-sl-act]')) e.preventDefault(); });
    slidePreview();
  }
  /* The slot as the Marquee will play it, drawn by the Marquee itself. */
  function slideFromForm(f, dev) {
    var media = f.media_kind === 'youtube' ? ytId(f.media_url) : f.media_url;
    return {
      id: 'preview', kind: 'house', media_kind: media ? f.media_kind : 'none',
      media_url: f.media_kind === 'image' && dev === 'phone' && f.media_mobile_url ? f.media_mobile_url : media,
      poster_url: f.media_kind === 'video' ? (f.poster_url || null) : null, focal: f.focal || '50% 50%',
      label: f.label, kicker: f.kicker, headline: f.headline || 'Your headline *here*', subline: f.subline,
      cta_label: f.cta_label || (f.world_slug ? 'Step inside' : ''), cta_url: f.cta_url, world_slug: f.world_slug || null, accent: f.accent
    };
  }
  var pvT = 0;
  function slidePreview() {
    clearTimeout(pvT);
    pvT = setTimeout(function () {
      var box = S.root && $('#tp-sl-pv', S.root), f = S.slideForm; if (!box || !f) return;
      var SL = window.CabanaMarquee;
      if (!SL || !SL.create) { box.innerHTML = '<div class="t-sub" style="padding:18px;color:#fff">The preview could not load. Reload the console to try again.</div>'; return; }
      if (!S.slidePv || S.slidePvBox !== box) { S.slidePv = SL.create(box, { preview: true }); S.slidePvBox = box; }
      S.slidePv.set([slideFromForm(f, S.slideDev === 'phone' ? 'phone' : 'desktop')]);
    }, 90);
  }
  function saveSlide() {
    var f = S.slideForm, db = c(); if (!f || !db) return;
    var media = f.media_kind === 'youtube' ? ytId(f.media_url) : f.media_url;
    if (!media) { toast(f.media_kind === 'youtube' ? 'Paste a YouTube link.' : 'Upload a photo or film first.'); return; }
    if (!plain(f.headline).trim()) { toast('Write a headline.'); return; }
    if (f.cta_url && !internal(f.cta_url)) { toast('The button can only link to a page on Cabana.'); return; }
    if (!f.world_slug && f.cta_label.trim() && !f.cta_url.trim()) { toast('Add a link for the button, or clear its label.'); return; }
    if (f.label && f.label.trim().length > 24) { toast('Keep the badge to 24 characters.'); return; }
    if (!f.starts || !f.ends || f.ends <= f.starts) { toast('The end date has to be after the start date.'); return; }
    var row = {
      kind: 'house', media_kind: f.media_kind, media_url: media, media_mobile_url: f.media_kind === 'image' ? (f.media_mobile_url || null) : null,
      poster_url: f.media_kind === 'video' ? (f.poster_url || null) : null, focal: f.focal || '50% 50%', art: null,
      label: f.label.trim() || null, device: f.device || 'all', world_slug: f.world_slug || null,
      kicker: f.kicker.trim() || null, headline: f.headline.trim(), subline: f.subline.trim() || null,
      cta_label: f.cta_label.trim() || null, cta_url: f.cta_url.trim() || null, accent: f.accent || '#F2541B',
      starts_at: new Date(f.starts + 'T00:00:00+03:00').toISOString(), ends_at: new Date(f.ends + 'T23:59:00+03:00').toISOString(),
      priority: Math.max(0, Math.min(100, Number(f.priority) || 0))
    };
    var q = f.id ? db.from('tour_spotlights').update(row).eq('id', f.id).eq('kind', 'house')
                 : db.from('tour_spotlights').insert(Object.assign({ status: 'approved' }, row));
    var btn = $('#tp-sf-save', S.root); if (btn) btn.disabled = true;
    q.then(function (r) {
      if (btn) btn.disabled = false;
      if (r && r.error) { toast('Could not save: ' + r.error.message); return; }
      toast(f.id ? 'Slot saved' : 'Slot published. It runs from ' + day(row.starts_at) + '.');
      dropPreview(); S.slideForm = null; reloadSlides();
    }, function () { if (btn) btn.disabled = false; toast('Could not save'); });
  }

  window.CabanaToursPage = { mount: mount, reload: function () { S.blocks = null; S.slides = null; catDraft = null; draft = null; } };
})();
