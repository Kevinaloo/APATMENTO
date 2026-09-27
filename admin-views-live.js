/* ═══════════════════════════════════════════════════════════════════
   CABANA · OPERATIONS CONSOLE · Cabana Live
   ───────────────────────────────────────────────────────────────────
   The studio behind /events.

     Titles     movies, series, live shows and specials: the art, the
                trailer, who may watch, and what actually plays. Films
                go to the PRIVATE live-media bucket through the same
                resumable uploader as Immersive; posters and trailers
                to the public live-public bucket.
     Billboard  the hero slides on each tab: an event, a title, a
                record, or anything at all, scheduled in and out.
     Music      the chart's health, the YouTube channels and playlists
                the room follows, and curated playlists.
     Premium    the free month, the price for later, and the passes.

   The database checks everything again (constraints, RLS on
   is_admin()). The checks here exist to say what is wrong in words.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  var CX = global.CX; if (!CX || !CX.ops) return;
  var html = CX.html, raw = CX.raw, set = CX.set, icon = CX.icon, $ = CX.$, $$ = CX.$$;
  var n = CX.n, num = CX.num, fdate = CX.fdate, ago = CX.ago;
  var rpc = CX.rpc, toast = CX.toast, confirm = CX.confirm, form = CX.form;
  var O = CX.ops, on = O.on, pageHd = O.pageHd;

  var SB_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
  var FN = SB_URL + '/functions/v1/youtube-sync';
  var PUB = 'live-public', PRIV = 'live-media';
  var SLUG_RX = /^[a-z0-9][a-z0-9-]{0,78}[a-z0-9]$/;
  var YT_RX = /^[A-Za-z0-9_-]{11}$/;

  var TABS = [['titles', 'Titles'], ['billboard', 'Billboard'], ['music', 'Music'], ['premium', 'Premium']];
  var KINDS = [['movie', 'Movie'], ['show', 'Series'], ['live', 'Live show'], ['special', 'Special']];
  var PLACES = [['home', 'Home'], ['events', 'Events'], ['live', 'Live'], ['movies', 'Movies'], ['shows', 'Shows'], ['music', 'Music']];
  var SOURCES = [['upload', 'Upload a file (private)'], ['hls', 'HLS stream (.m3u8)'], ['mp4', 'MP4 link'], ['youtube', 'YouTube video'], ['embed', 'Partner player (embed URL)']];

  function sb() { return CX.client(); }
  function noop() {}
  function slugify(s) { return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80); }
  function pubUrl(path) { return SB_URL + '/storage/v1/object/public/' + PUB + '/' + path; }
  function extOf(name) { var m = String(name || '').toLowerCase().match(/\.([a-z0-9]{2,5})$/); return m ? m[1] : 'bin'; }
  function uuid() { return global.crypto && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }); }
  function ytFrom(v) {
    v = String(v || '').trim();
    if (YT_RX.test(v)) return v;
    var m = v.match(/(?:v=|youtu\.be\/|\/shorts\/|\/embed\/|\/live\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : '';
  }
  function localInput(iso) {
    if (!iso) return '';
    var d = new Date(iso); if (isNaN(d.getTime())) return '';
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
  function fromLocal(v) { if (!v) return null; var d = new Date(v); return isNaN(d.getTime()) ? null : d.toISOString(); }
  function friendly(e) {
    var m = String((e && e.message) || e || '');
    if (/live_titles_slug_key|duplicate key.*slug/i.test(m)) return 'That web address is already used. Change the slug.';
    if (/slug_check|slug/i.test(m) && /check/i.test(m)) return 'The web address can only use lowercase letters, numbers and dashes.';
    if (/live_titles_live_needs_start/i.test(m)) return 'A live show needs a start time before it can be published.';
    if (/live_titles_live_window/i.test(m)) return 'The live show must end after it starts.';
    if (/live_media_upload_path/i.test(m)) return 'The uploaded file belongs to another title. Upload it again from this one.';
    if (/live_media_url|live_url_ok|_url_check|link_ok/i.test(m)) return 'One of the links is not a valid https address.';
    if (/live_media_youtube|youtube_check/i.test(m)) return 'That is not a YouTube video id or link.';
    if (/live_billboard_media/i.test(m)) return 'The slide media must be an https link, or an 11-character YouTube id for a YouTube slide.';
    if (/live_episodes_title_id_season_number_key/i.test(m)) return 'That season already has an episode with this number.';
    if (/music_playlists_slug_key/i.test(m)) return 'Another playlist already uses that web address.';
    return CX.friendly ? CX.friendly(e) : m;
  }
  function must(r) { if (r && r.error) throw new Error(friendly(r.error)); return r ? r.data : null; }
  function see(path) { if (CX.preview) CX.preview(path); else global.open(path, '_blank', 'noopener'); }

  /* ── uploads ─────────────────────────────────────────────────────── */

  /* Public art: small images in one request, anything bigger resumable.
     Private films: always resumable, into the title's own folder, which
     is the only folder live_media accepts for it. */
  function upload(bucket, path, file, onProgress) {
    var U = CX.uploads;
    var type = (U && U.mimeOf) ? U.mimeOf(file) : file.type;
    if (bucket === PUB && file.size < 6 * 1024 * 1024 && U && U.putSmall) {
      if (onProgress) onProgress(0, file.size);
      return U.putSmall(bucket, path, file, type).then(function (p) { if (onProgress) onProgress(file.size, file.size); return p; });
    }
    if (!U || !U.tus) return Promise.reject(new Error('The uploader has not loaded. Refresh the console.'));
    var ctl = U.tus({ bucket: bucket, path: path, file: file, contentType: type, onProgress: onProgress });
    return ctl.promise.then(function () { return path; });
  }

  /* A field that holds a URL, with an upload button beside it. */
  function mediaField(name, label, value, o) {
    o = o || {};
    return html`<div class="fld ${o.full ? 'full' : ''} lvx-media" data-media="${name}">
      <label class="fld-l">${label}${o.help ? html`<span class="opt">${o.help}</span>` : ''}</label>
      <div class="lvx-media-row">
        <span class="lvx-media-prev ${o.ratio || ''}">${value ? (/\.(mp4|webm|mov)(\?|$)/i.test(value) ? html`<video src="${CX.safeUrl(value)}" muted playsinline preload="metadata"></video>` : html`<img src="${CX.safeUrl(value)}" alt=""/>`) : icon(o.video ? 'video' : 'image')}</span>
        <input class="inp" name="${name}" value="${value || ''}" placeholder="${o.placeholder || 'https://… or upload'}" autocomplete="off"/>
        <label class="btn btn-g btn-sm lvx-up">${icon('upload')}Upload<input type="file" accept="${o.accept || 'image/*'}" hidden/></label>
      </div>
      <div class="lvx-prog" hidden><i></i><span></span></div>
    </div>`;
  }
  function wireMedia(root, folder) {
    $$('.lvx-media', root).forEach(function (box) {
      var input = $('input.inp', box), file = $('input[type=file]', box), prev = $('.lvx-media-prev', box), prog = $('.lvx-prog', box);
      function paint() {
        var v = input.value.trim();
        if (!v) return;
        set(prev, /\.(mp4|webm|mov)(\?|$)/i.test(v) ? html`<video src="${CX.safeUrl(v)}" muted playsinline preload="metadata"></video>` : html`<img src="${CX.safeUrl(v)}" alt=""/>`);
      }
      input.addEventListener('change', paint);
      file.addEventListener('change', function () {
        var f = file.files && file.files[0]; if (!f) return;
        var path = folder() + '/' + box.getAttribute('data-media') + '-' + Date.now().toString(36) + '.' + extOf(f.name);
        prog.hidden = false; box.classList.add('busy');
        upload(PUB, path, f, function (l, t) {
          $('i', prog).style.width = (t ? l / t * 100 : 0).toFixed(1) + '%';
          set($('span', prog), (t ? Math.round(l / t * 100) : 0) + '%');
        }).then(function () {
          input.value = pubUrl(path); paint(); toast('Uploaded', 'ok', { ms: 1800 });
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }, function (e) { toast(friendly(e), 'bad'); })
          .then(function () { prog.hidden = true; box.classList.remove('busy'); file.value = ''; });
      });
    });
  }

  /* ── data ────────────────────────────────────────────────────────── */

  function titles() { return CX.rows(CX.q('live_titles').select('*').order('updated_at', { ascending: false })); }
  function slides() { return CX.rows(CX.q('live_billboard').select('*').order('sort_order', { ascending: false }).order('created_at', { ascending: false })); }
  function events() { return CX.rows(CX.q('events').select('id,title,starts_at,status,cover_url').order('starts_at', { ascending: false }).limit(200)); }

  /* ── the view ────────────────────────────────────────────────────── */

  CX.view('live', {
    title: 'Cabana Live',
    render: function (v) {
      var tab = v.q.tab || 'titles';
      set(v.el, html`${pageHd('Operations', 'Cabana Live', 'Events, live shows, movies, series and music on /events.')}${CX.skeleton('cards')}`);
      return rpc('admin_live_overview', null, { fresh: true }).then(function (ov) {
        if (!v.alive()) return;
        ov = ov || {};
        var c = ov.counts || {};
        set(v.el, html`${pageHd('Operations', 'Cabana Live', html`The streaming and events platform on <a href="/events" target="_blank" rel="noopener">/events</a>. ${n(c.live_now) ? html`<b class="lvx-live">${num(c.live_now)} live now</b>` : ''}`,
            html`<button class="btn btn-g" data-see>${icon('eye')}See it live</button>${tab === 'titles' ? html`<button class="btn btn-p" data-new-title>${icon('plus')}New title</button>` : tab === 'billboard' ? html`<button class="btn btn-p" data-new-slide>${icon('plus')}New slide</button>` : ''}`)}
          <div class="grid g4 lvx-kpis">
            <div class="mini"><div class="mini-l">Published titles</div><div class="mini-v">${num(c.published)}</div><div class="mini-s">${num(c.draft)} draft · ${num(c.movie)} films · ${num(c.show)} series · ${num(c.live)} live</div></div>
            <div class="mini"><div class="mini-l">Plays · 30 days</div><div class="mini-v">${num(ov.plays_30)}</div><div class="mini-s">${num(ov.viewers_30)} signed-in viewers · ${Math.round(n(ov.seconds_30) / 3600)} h watched</div></div>
            <div class="mini"><div class="mini-l">Premium</div><div class="mini-v">${num(ov.passes_active)}</div><div class="mini-s">active passes · ${num(ov.trials_claimed)} free months claimed</div></div>
            <div class="mini"><div class="mini-l">Music chart</div><div class="mini-v">${num(ov.chart_tracks)}</div><div class="mini-s">${ov.music && ov.music.last_refreshed_at ? 'refreshed ' + ago(ov.music.last_refreshed_at) : 'waiting for a refresh'} · ${num(c.sources)} channels</div></div>
          </div>
          ${CX.tabs(TABS.map(function (t) { return [t[0], t[1], t[0] === 'titles' ? n(c.published) + n(c.draft) : t[0] === 'billboard' ? c.billboard : t[0] === 'music' ? c.playlists : null]; }), tab)}
          <div data-body></div>`);
        on(v.el, '[data-tab]', 'click', function (el) { var t = el.getAttribute('data-tab'); v.setQ({ tab: t === 'titles' ? null : t }); v.refresh(); });
        on(v.el, '[data-see]', 'click', function () { see('/events'); });
        on(v.el, '[data-new-title]', 'click', function () { newTitle(v); });
        on(v.el, '[data-new-slide]', 'click', function () { slideEditor(null, v); });
        var body = $('[data-body]', v.el);
        if (tab === 'billboard') return renderBillboard(body, v);
        if (tab === 'music') return renderMusic(body, v, ov);
        if (tab === 'premium') return renderPremium(body, v, ov);
        return renderTitles(body, v, ov);
      });
    },
    leave: function () { if (CX.drawer.isOpen()) CX.drawer.close(false); }
  });

  /* ════════════════════════════════════════════════════════════════
     TITLES
     ════════════════════════════════════════════════════════════════ */

  function renderTitles(body, v, ov) {
    var kind = v.q.kind || 'all';
    set(body, CX.skeleton('cards'));
    return titles().then(function (list) {
      if (!v.alive()) return;
      var by = ov.by_title || {};
      var shown = list.filter(function (t) { return kind === 'all' || t.kind === kind; });
      set(body, html`
        <div class="filters mb">${CX.seg([['all', 'Everything']].concat(KINDS), kind, 'data-kind')}</div>
        ${!list.length ? html`<div class="callout info mb">${icon('info')}<div class="grow"><div class="strong">Nothing on Cabana Live yet</div><div class="muted" style="font-size:12.5px">Add a film, a series or a live show. Until then /events leads with events, the music chart and the free month.</div></div></div>` : ''}
        <div class="lvx-grid">
          <button class="lvx-new" type="button" data-new-title>${icon('plus')}<b>New title</b><span>A film, a series, a live show or a special</span></button>
          ${shown.map(function (t) {
            var s = by[t.id] || {};
            var st = t.status === 'published' ? 'ok' : t.status === 'draft' ? 'warn' : '';
            var live = t.kind === 'live' && t.live_starts_at && Date.parse(t.live_starts_at) <= Date.now() && (!t.live_ends_at || Date.parse(t.live_ends_at) > Date.now());
            return html`<div class="lvx-card">
              <div class="lvx-card-img" data-edit="${t.id}">${t.backdrop_url || t.poster_url ? html`<img src="${CX.safeUrl(t.backdrop_url || t.poster_url)}" alt="" loading="lazy"/>` : html`<div class="ph">${icon(t.kind === 'live' ? 'video' : 'image')}</div>`}
                <div class="lvx-tags"><span class="imx-chip ${st}">${t.status}</span><span class="imx-chip">${(KINDS.filter(function (k) { return k[0] === t.kind; })[0] || [0, t.kind])[1]}</span>
                  ${t.access === 'premium' ? html`<span class="imx-chip lvx-gold">${icon('star')}Premium</span>` : html`<span class="imx-chip">Free</span>`}
                  ${t.featured ? html`<span class="imx-chip brand">Featured</span>` : ''}${live ? html`<span class="imx-chip lvx-red">Live now</span>` : ''}
                  ${t.release_at && Date.parse(t.release_at) > Date.now() ? html`<span class="imx-chip">Coming ${fdate(t.release_at)}</span>` : ''}</div></div>
              <div class="lvx-card-b"><div class="lvx-card-t">${t.title}</div>
                <div class="lvx-card-s">${[t.year, (t.genres || []).slice(0, 2).join(', '), t.kind === 'live' && t.live_starts_at ? 'Live ' + fdate(t.live_starts_at) : ''].filter(Boolean).join(' · ') || '/' + t.slug}</div>
                <div class="lvx-card-stats"><span>${num(s.plays)} plays</span><span>${Math.round(n(s.seconds) / 60)} min watched</span></div></div>
              <div class="lvx-card-f">
                <button class="btn btn-sm btn-p" data-edit="${t.id}">${icon('edit')}Edit</button>
                ${t.status === 'published' ? html`<button class="btn btn-sm btn-g" data-status="draft" data-id="${t.id}">Unpublish</button>` : html`<button class="btn btn-sm btn-ok" data-status="published" data-id="${t.id}">Publish</button>`}
                <span class="grow"></span>
                <button class="icon-btn" data-more="${t.id}" aria-label="More">${icon('more')}</button>
              </div></div>`;
          })}
        </div>`);
      on(body, '[data-kind]', 'click', function (el) { v.setQ({ kind: el.getAttribute('data-kind') === 'all' ? null : el.getAttribute('data-kind') }); v.refresh(); });
      on(body, '[data-new-title]', 'click', function () { newTitle(v); });
      on(body, '[data-edit]', 'click', function (el) { var t = list.filter(function (x) { return x.id === el.getAttribute('data-edit'); })[0]; if (t) titleEditor(t, v); });
      on(body, '[data-status]', 'click', function (el) {
        CX.busy(el, function () {
          return CX.q('live_titles').update({ status: el.getAttribute('data-status') }).eq('id', el.getAttribute('data-id')).then(must).then(function () {
            toast(el.getAttribute('data-status') === 'published' ? 'Live on /events' : 'Taken off /events', 'ok'); v.refresh();
          });
        }).catch(noop);
      });
      on(body, '[data-more]', 'click', function (el) {
        var t = list.filter(function (x) { return x.id === el.getAttribute('data-more'); })[0]; if (!t) return;
        CX.menu(el, [
          { label: 'View on /events', icon: 'eye', fn: function () { see('/events/watch/' + t.slug); } },
          { label: t.featured ? 'Stop featuring' : 'Feature on the billboard', icon: 'star', fn: function () { CX.q('live_titles').update({ featured: !t.featured }).eq('id', t.id).then(must).then(function () { v.refresh(); }, function (e) { toast(friendly(e), 'bad'); }); } },
          { label: 'Archive', icon: 'scroll', fn: function () { CX.q('live_titles').update({ status: 'archived' }).eq('id', t.id).then(must).then(function () { toast('Archived', 'ok'); v.refresh(); }, function (e) { toast(friendly(e), 'bad'); }); } },
          '-',
          { label: 'Delete for good', icon: 'trash', danger: true, fn: function () { removeTitle(t, v); } }
        ]);
      });
    });
  }

  function newTitle(v) {
    form({
      title: 'New title', sub: 'It starts as a draft. Nothing shows on /events until you publish.', icon: 'plus',
      fields: [
        { name: 'kind', label: 'What is it', type: 'select', options: KINDS, value: 'movie', required: true, full: true },
        { name: 'title', label: 'Title', required: true, full: true, autofocus: true, placeholder: 'e.g. Nairobi Nights' }
      ],
      submit: 'Create and open', submitIcon: 'arrowL',
      onSubmit: function (val) {
        var slug = slugify(val.title) || 'title-' + Date.now().toString(36);
        return CX.q('live_titles').insert({ kind: val.kind, title: val.title, slug: slug, status: 'draft', access: 'premium' }).select().single()
          .then(function (r) {
            if (r.error && /slug/i.test(r.error.message || '')) return CX.q('live_titles').insert({ kind: val.kind, title: val.title, slug: slug + '-' + Date.now().toString(36).slice(-4), status: 'draft', access: 'premium' }).select().single();
            return r;
          }).then(must).then(function (row) {
            CX.log('live_title_create', 'live_title', row.id, { title: row.title });
            setTimeout(function () { titleEditor(row, v); }, 60);
            return row;
          });
      }
    });
  }

  function removeTitle(t, v) {
    confirm({ title: 'Delete ' + t.title + '?', body: 'The title, its episodes, what plays and its play history are removed. Uploaded files are deleted too. This cannot be undone.', tone: 'danger', confirm: 'Delete for good',
      onConfirm: function () {
        return sb().storage.from(PRIV).list('t/' + t.id, { limit: 1000 }).then(function (r) {
          var files = ((r && r.data) || []).filter(function (f) { return f.id; }).map(function (f) { return 't/' + t.id + '/' + f.name; });
          return files.length ? sb().storage.from(PRIV).remove(files) : null;
        }).catch(noop).then(function () {
          return CX.q('live_titles').delete().eq('id', t.id).then(must);
        }).then(function () { CX.log('live_title_delete', 'live_title', t.id, { title: t.title }); toast('Deleted', 'ok'); v.refresh(); });
      } }).catch(noop);
  }

  /* ── the title editor ───────────────────────────────────────────── */

  var FIELDS_BASIC = function (t) {
    return [
      { name: 'title', label: 'Title', value: t.title, required: true },
      { name: 'slug', label: 'Web address', value: t.slug, required: true, help: 'cabana.africa/events/watch/…' },
      { name: 'kind', label: 'Kind', type: 'select', options: KINDS, value: t.kind, required: true },
      { name: 'tagline', label: 'Tagline', value: t.tagline, placeholder: 'One line that sells it' },
      { name: 'synopsis', label: 'Synopsis', type: 'textarea', rows: 4, value: t.synopsis },
      { name: 'genres', label: 'Genres', value: (t.genres || []).join(', '), placeholder: 'Drama, Comedy', help: 'comma separated' },
      { name: 'maturity', label: 'Age rating', type: 'select', options: [['', 'Not rated'], ['G', 'G'], ['PG', 'PG'], ['13+', '13+'], ['16+', '16+'], ['18+', '18+']], value: t.maturity || '' },
      { name: 'year', label: 'Year', type: 'number', value: t.year, min: 1900, max: 2100 },
      { name: 'runtime_min', label: 'Runtime (minutes)', type: 'number', value: t.runtime_min, min: 1 },
      { name: 'language', label: 'Language', value: t.language, placeholder: 'English, Swahili' },
      { name: 'country', label: 'Country', value: t.country },
      { name: 'cast', label: 'Cast', type: 'textarea', rows: 3, value: (t.cast_list || []).map(function (c) { return typeof c === 'string' ? c : [c.name, c.role].filter(Boolean).join(' | '); }).join('\n'), placeholder: 'Name | Role, one per line' },
      { name: 'credits', label: 'Credits', value: t.credits, placeholder: 'Directed by …' }
    ];
  };
  var FIELDS_AVAIL = function (t) {
    return [
      { name: 'access', label: 'Who can watch', type: 'select', options: [['premium', 'Premium (free month, then paid)'], ['free', 'Free for everyone']], value: t.access, required: true },
      { name: 'badge', label: 'Badge', value: t.badge, placeholder: 'Cabana Original, New season, Exclusive' },
      { name: 'available_on', label: 'Available on', value: t.available_on, placeholder: 'Only on Cabana' },
      { name: 'release_at', label: 'Coming soon until', type: 'datetime-local', value: localInput(t.release_at), help: 'shown as Coming soon, locked until then' },
      { name: 'external_url', label: 'Watch on (partner link)', value: t.external_url, placeholder: 'https://…' },
      { name: 'external_label', label: 'Partner button label', value: t.external_label, placeholder: 'Watch on Showmax' },
      { name: 'sort_order', label: 'Sort weight', type: 'number', value: t.sort_order || 0, help: 'higher shows first' },
      { name: 'accent', label: 'Accent colour', value: t.accent || '', placeholder: '#FF2E93' },
      { name: 'featured', label: 'Feature it', type: 'switch', value: t.featured, help: 'Puts it on the billboard of its tab and on Home' }
    ];
  };
  var FIELDS_LIVE = function (t, evs) {
    return [
      { name: 'live_starts_at', label: 'Goes live', type: 'datetime-local', value: localInput(t.live_starts_at), required: t.kind === 'live' },
      { name: 'live_ends_at', label: 'Ends', type: 'datetime-local', value: localInput(t.live_ends_at) },
      { name: 'event_id', label: 'Linked event (tickets)', type: 'select', options: [['', 'None']].concat(evs.map(function (e) { return [String(e.id), e.title + ' · ' + fdate(e.starts_at)]; })), value: t.event_id == null ? '' : String(t.event_id) },
      { name: 'replay', label: 'Keep a replay after it ends', type: 'switch', value: t.replay !== false }
    ];
  };

  function titleEditor(t, v) {
    var state = { t: t, media: null, eps: [], evs: [] };
    CX.drawer.open({
      key: 'live-title-' + t.id, wide: true, kicker: 'Cabana Live · ' + ((KINDS.filter(function (k) { return k[0] === t.kind; })[0] || [0, t.kind])[1]), title: t.title, sub: '/events/watch/' + t.slug,
      load: function (d) {
        return Promise.all([
          CX.rows(CX.q('live_media').select('*').eq('title_id', t.id)),
          CX.rows(CX.q('live_episodes').select('*').eq('title_id', t.id).order('season').order('number')),
          events().catch(function () { return []; })
        ]).then(function (r) {
          if (!d.alive()) return;
          state.media = r[0].filter(function (m) { return !m.episode_id; })[0] || null;
          state.allMedia = r[0];
          state.eps = r[1]; state.evs = r[2];
          paint(d);
        });
      }
    });

    function paint(d) {
      var tt = state.t, m = state.media || {};
      var basic = FIELDS_BASIC(tt), avail = FIELDS_AVAIL(tt), live = FIELDS_LIVE(tt, state.evs);
      set(d.body, html`
        <div class="lvx-ed">
          <section class="lvx-sec"><h3>The basics</h3><form class="form-grid" data-f="basic" onsubmit="return false">${basic.map(CX.fieldHTML)}</form></section>
          <section class="lvx-sec"><h3>Art and trailer</h3><p class="muted">The poster is the 2:3 card, the backdrop is the 16:9 hero, the logo is a transparent PNG title treatment that replaces the text title.</p>
            <form class="form-grid" data-f="art" onsubmit="return false">
              ${mediaField('poster_url', 'Poster (2:3)', tt.poster_url, { ratio: 'r23' })}
              ${mediaField('backdrop_url', 'Backdrop (16:9)', tt.backdrop_url, { ratio: 'r169' })}
              ${mediaField('logo_url', 'Title logo (PNG)', tt.logo_url, { help: 'optional', accept: 'image/png,image/webp' })}
              ${mediaField('trailer_url', 'Trailer file (MP4)', tt.trailer_url, { video: true, accept: 'video/mp4,video/webm', help: 'plays muted on the billboard', ratio: 'r169' })}
              ${CX.fieldHTML({ name: 'trailer_youtube', label: 'Or a YouTube trailer', value: tt.trailer_youtube || '', placeholder: 'YouTube link or id' })}
            </form></section>
          <section class="lvx-sec"><h3>Who can watch, and when</h3><form class="form-grid" data-f="avail" onsubmit="return false">${avail.map(CX.fieldHTML)}</form></section>
          ${tt.kind === 'live' || tt.kind === 'special' ? html`<section class="lvx-sec"><h3>The live window</h3><form class="form-grid" data-f="live" onsubmit="return false">${live.map(CX.fieldHTML)}</form></section>` : ''}
          ${tt.kind === 'show' ? episodesHTML() : html`<section class="lvx-sec"><h3>What plays</h3><p class="muted">Premium files are stored privately and only handed to people with access. A stream or partner link is only revealed after the same check.</p>${sourceHTML(m, 'main')}</section>`}
        </div>`);
      d.actions(html`<button class="btn btn-g" data-view>${icon('eye')}View</button><span class="grow"></span>
        <button class="btn btn-q" data-save>Save</button>
        ${tt.status === 'published' ? html`<button class="btn btn-g" data-draft>Unpublish</button>` : html`<button class="btn btn-ok" data-publish>${icon('check')}Save and publish</button>`}`);
      wireMedia(d.body, function () { return 't/' + tt.id; });
      wireSource(d.body, tt, null);
      var ti = $('[data-f="basic"] [name="title"]', d.body), si = $('[data-f="basic"] [name="slug"]', d.body);
      var slugTouched = tt.slug !== slugify(tt.title);
      si.addEventListener('input', function () { slugTouched = true; });
      ti.addEventListener('input', function () { if (!slugTouched) si.value = slugify(ti.value); });
      on(d.foot, '[data-view]', 'click', function () { see('/events/watch/' + (si.value || tt.slug)); });
      on(d.foot, '[data-save]', 'click', function (el) { save(d, el, null); });
      on(d.foot, '[data-publish]', 'click', function (el) { save(d, el, 'published'); });
      on(d.foot, '[data-draft]', 'click', function (el) { save(d, el, 'draft'); });
      on(d.body, '[data-ep-new]', 'click', function () { episodeEditor(tt, null, d); });
      on(d.body, '[data-ep]', 'click', function (el) { var e = state.eps.filter(function (x) { return x.id === el.getAttribute('data-ep'); })[0]; if (e) episodeEditor(tt, e, d); });
    }

    function episodesHTML() {
      var mediaOf = {};
      (state.allMedia || []).forEach(function (m) { if (m.episode_id) mediaOf[m.episode_id] = m; });
      return html`<section class="lvx-sec"><div class="row" style="justify-content:space-between;align-items:center"><h3>Episodes</h3><button class="btn btn-sm btn-p" data-ep-new>${icon('plus')}Add episode</button></div>
        ${state.eps.length ? html`<div class="lvx-eps">${state.eps.map(function (e) {
          var m = mediaOf[e.id];
          return html`<button class="lvx-ep" type="button" data-ep="${e.id}"><span class="lvx-ep-n">S${e.season} · E${e.number}</span><span class="grow"><b>${e.name}</b><small>${[e.runtime_min ? e.runtime_min + ' min' : '', e.access ? (e.access === 'free' ? 'Free episode' : 'Premium') : '', e.status === 'draft' ? 'Draft' : ''].filter(Boolean).join(' · ') || 'Inherits the series access'}</small></span>
            <span class="pill ${m ? 'p-ok' : 'p-warn'}">${m ? m.source : 'No video yet'}</span>${icon('chevR')}</button>`;
        })}</div>` : html`<p class="muted">No episodes yet. The first one is often set to free, as a taste.</p>`}</section>`;
    }

    function collect(d) {
      var get = function (f, fields) { var el = $('[data-f="' + f + '"]', d.body); return el ? CX.readForm(el, fields) : {}; };
      var b = get('basic', FIELDS_BASIC(state.t)); if (!b) return null;
      var a = get('avail', FIELDS_AVAIL(state.t)); if (!a) return null;
      var l = (state.t.kind === 'live' || state.t.kind === 'special') ? get('live', FIELDS_LIVE(state.t, state.evs)) : {};
      if (!l) return null;
      var art = {};
      $$('[data-f="art"] .lvx-media input.inp', d.body).forEach(function (i) { art[i.name] = i.value.trim() || null; });
      var ytT = $('[data-f="art"] [name="trailer_youtube"]', d.body).value.trim();
      if (!SLUG_RX.test(b.slug)) { toast('The web address can only use lowercase letters, numbers and dashes.', 'bad'); return null; }
      if (ytT && !ytFrom(ytT)) { toast('The YouTube trailer is not a link or id YouTube recognises.', 'bad'); return null; }
      if (a.accent && !/^#[0-9a-fA-F]{6}$/.test(a.accent)) { toast('The accent colour must look like #FF2E93.', 'bad'); return null; }
      var cast = String(b.cast || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean).map(function (x) { var p = x.split('|'); return { name: p[0].trim(), role: (p[1] || '').trim() || undefined }; });
      return {
        title: b.title, slug: b.slug, kind: b.kind, tagline: b.tagline || null, synopsis: b.synopsis || null,
        genres: String(b.genres || '').split(',').map(function (g) { return g.trim(); }).filter(Boolean).slice(0, 8),
        maturity: b.maturity || null, year: b.year === '' ? null : b.year, runtime_min: b.runtime_min === '' ? null : b.runtime_min,
        language: b.language || null, country: b.country || null, cast_list: cast, credits: b.credits || null,
        poster_url: art.poster_url, backdrop_url: art.backdrop_url, logo_url: art.logo_url, trailer_url: art.trailer_url, trailer_youtube: ytFrom(ytT) || null,
        access: a.access, badge: a.badge || null, available_on: a.available_on || null, release_at: fromLocal(a.release_at),
        external_url: a.external_url || null, external_label: a.external_label || null, sort_order: a.sort_order === '' ? 0 : a.sort_order,
        accent: a.accent || null, featured: !!a.featured,
        live_starts_at: l.live_starts_at !== undefined ? fromLocal(l.live_starts_at) : state.t.live_starts_at,
        live_ends_at: l.live_ends_at !== undefined ? fromLocal(l.live_ends_at) : state.t.live_ends_at,
        event_id: l.event_id !== undefined ? (l.event_id ? Number(l.event_id) : null) : state.t.event_id,
        replay: l.replay !== undefined ? !!l.replay : state.t.replay
      };
    }

    function save(d, btn, status) {
      var body = collect(d); if (!body) return;
      if (status) body.status = status;
      var src = readSource(d.body, 'main');
      if (src === false) return;
      if (body.status === 'published' || (status === 'published')) {
        if (!body.backdrop_url && !body.poster_url) { toast('Add a poster or a backdrop before publishing. The billboard and the rows need art.', 'warn'); return; }
        if (body.kind === 'live' && !body.live_starts_at) { toast('A live show needs a start time.', 'warn'); return; }
      }
      CX.busy(btn, function () {
        return CX.q('live_titles').update(body).eq('id', state.t.id).select().single().then(must).then(function (row) {
          state.t = row;
          if (row.kind === 'show' || src == null) return row;
          return saveMedia(row.id, null, src).then(function (m) { state.media = m; return row; });
        }).then(function (row) {
          CX.log('live_title_save', 'live_title', row.id, { title: row.title, status: row.status });
          toast(row.status === 'published' ? 'Saved · live on /events' : 'Saved as draft', 'ok');
          d.set(row.title, '/events/watch/' + row.slug);
          paint(d);
          if (v && v.refresh && status) v.refresh();
        });
      }).catch(noop);
    }
  }

  /* What plays: one row in live_media per film, or per episode. */
  function sourceHTML(m, key) {
    m = m || {};
    return html`<div class="lvx-src" data-src="${key}">
      <div class="form-grid">
        ${CX.fieldHTML({ name: 'source', label: 'Source', type: 'select', options: [['', 'Nothing yet']].concat(SOURCES), value: m.source || '' })}
        ${CX.fieldHTML({ name: 'duration_min', label: 'Length (minutes)', type: 'number', value: m.duration_s ? Math.round(m.duration_s / 60) : '', min: 0 })}
        ${CX.fieldHTML({ name: 'ref', label: 'Link, id or file', value: m.ref || '', full: true, placeholder: 'https://…/master.m3u8, a YouTube link, or upload below' })}
      </div>
      <div class="lvx-src-up"><label class="btn btn-g btn-sm">${icon('upload')}Upload the film<input type="file" accept="video/mp4,video/webm,video/quicktime" hidden/></label>
        <span class="muted">MP4 (H.264/AAC) plays everywhere. Uploads resume if the connection drops. Up to 5 GB.</span></div>
      <div class="lvx-prog" hidden><i></i><span></span></div>
    </div>`;
  }
  function wireSource(root, t, epId) {
    $$('.lvx-src', root).forEach(function (box) {
      var file = $('input[type=file]', box), sel = $('[name="source"]', box), ref = $('[name="ref"]', box), prog = $('.lvx-prog', box);
      if (!file) return;
      file.addEventListener('change', function () {
        var f = file.files && file.files[0]; if (!f) return;
        var path = 't/' + t.id + (epId ? '/e/' + epId : '') + '/' + (epId ? 'episode' : 'film') + '-' + Date.now().toString(36) + '.' + extOf(f.name);
        prog.hidden = false;
        var started = Date.now();
        upload(PRIV, path, f, function (l, tot) {
          var pct = tot ? l / tot * 100 : 0, secs = (Date.now() - started) / 1000, rate = l / Math.max(1, secs);
          $('i', prog).style.width = pct.toFixed(1) + '%';
          set($('span', prog), Math.round(pct) + '% · ' + (CX.uploads && CX.uploads.mb ? CX.uploads.mb(l) + ' of ' + CX.uploads.mb(tot) : '') + (rate && pct < 100 ? ' · about ' + Math.max(1, Math.round((tot - l) / rate / 60)) + ' min left' : ''));
        }).then(function () {
          sel.value = 'upload'; ref.value = path;
          var probe = document.createElement('video'); probe.preload = 'metadata'; probe.src = URL.createObjectURL(f);
          probe.onloadedmetadata = function () { var dm = $('[name="duration_min"]', box); if (dm && !dm.value && probe.duration) dm.value = Math.round(probe.duration / 60); };
          toast('Uploaded. Save to attach it.', 'ok');
        }, function (e) { toast(friendly(e), 'bad'); }).then(function () { file.value = ''; setTimeout(function () { prog.hidden = true; }, 1200); });
      });
    });
  }
  function readSource(root, key) {
    var box = $('[data-src="' + key + '"]', root);
    if (!box) return null;
    var source = $('[name="source"]', box).value, ref = $('[name="ref"]', box).value.trim(), dm = $('[name="duration_min"]', box).value;
    if (!source) return null;
    if (source === 'youtube') { ref = ytFrom(ref); if (!ref) { toast('That YouTube link is not one YouTube recognises.', 'bad'); return false; } }
    else if (source !== 'upload' && !/^https:\/\//i.test(ref)) { toast('Streams, files and partner players need an https link.', 'bad'); return false; }
    else if (source === 'upload' && !ref) { toast('Upload the film first, or choose another source.', 'bad'); return false; }
    return { source: source, ref: ref, duration_s: dm ? Math.round(Number(dm) * 60) : null };
  }
  function saveMedia(titleId, epId, src) {
    var qb = CX.q('live_media').select('id').eq('title_id', titleId);
    qb = epId ? qb.eq('episode_id', epId) : qb.is('episode_id', null);
    return CX.rows(qb).then(function (rows) {
      var row = { title_id: titleId, episode_id: epId || null, source: src.source, ref: src.ref, duration_s: src.duration_s };
      return rows[0] ? CX.q('live_media').update(row).eq('id', rows[0].id).select().single().then(must)
        : CX.q('live_media').insert(row).select().single().then(must);
    });
  }

  function episodeEditor(t, e, d) {
    var isNew = !e;
    e = e || { id: uuid(), season: 1, number: 1, name: '', status: 'published' };
    var fields = [
      { name: 'season', label: 'Season', type: 'number', value: e.season, min: 1, max: 99, required: true },
      { name: 'number', label: 'Episode', type: 'number', value: e.number, min: 1, max: 999, required: true },
      { name: 'name', label: 'Episode title', value: e.name, required: true, full: true },
      { name: 'synopsis', label: 'Synopsis', type: 'textarea', rows: 3, value: e.synopsis },
      { name: 'runtime_min', label: 'Runtime (minutes)', type: 'number', value: e.runtime_min, min: 1 },
      { name: 'access', label: 'Access', type: 'select', options: [['', 'Same as the series'], ['free', 'Free episode'], ['premium', 'Premium']], value: e.access || '' },
      { name: 'air_at', label: 'Air date', type: 'datetime-local', value: localInput(e.air_at) },
      { name: 'status', label: 'Status', type: 'select', options: [['published', 'Published'], ['draft', 'Draft']], value: e.status }
    ];
    var mediaRow = null;
    CX.modal({
      title: isNew ? 'New episode' : 'S' + e.season + ' · E' + e.number + ' · ' + e.name, icon: 'video', wide: true,
      body: html`<form class="form-grid" data-f="ep" onsubmit="return false">${fields.map(CX.fieldHTML)}${mediaField('still_url', 'Still (16:9)', e.still_url, { ratio: 'r169', full: true })}</form>
        <h4 style="margin:18px 0 8px">What plays</h4><div data-epsrc>${sourceHTML(null, 'ep')}</div>`,
      actions: [
        isNew ? null : { label: 'Delete', kind: 'btn-d', icon: 'trash', onClick: function () {
          return CX.q('live_episodes').delete().eq('id', e.id).then(must).then(function () { toast('Episode deleted', 'ok'); d.reload(); return true; });
        } },
        { label: 'Cancel', kind: 'btn-q', value: null },
        { label: 'Save episode', kind: 'btn-p', onClick: function (wrap) {
          var val = CX.readForm($('[data-f="ep"]', wrap), fields); if (!val) return false;
          var src = readSource(wrap, 'ep'); if (src === false) return false;
          var row = { id: e.id, title_id: t.id, season: val.season, number: val.number, name: val.name, synopsis: val.synopsis || null,
            runtime_min: val.runtime_min === '' ? null : val.runtime_min, access: val.access || null, air_at: fromLocal(val.air_at), status: val.status,
            still_url: $('[data-f="ep"] [name="still_url"]', wrap).value.trim() || null };
          return CX.q('live_episodes').upsert(row).select().single().then(must).then(function (saved) {
            return src ? saveMedia(t.id, saved.id, src) : null;
          }).then(function () { toast('Episode saved', 'ok'); d.reload(); return true; }).catch(function (x) { throw new Error(friendly(x)); });
        } }
      ].filter(Boolean),
      onOpen: function (wrap) {
        wireMedia(wrap, function () { return 't/' + t.id + '/e/' + e.id; });
        wireSource(wrap, t, e.id);
        if (!isNew) CX.rows(CX.q('live_media').select('*').eq('title_id', t.id).eq('episode_id', e.id)).then(function (r) {
          mediaRow = r[0]; if (!mediaRow) return;
          set($('[data-epsrc]', wrap), sourceHTML(mediaRow, 'ep'));
          wireSource(wrap, t, e.id);
        }).catch(noop);
      }
    });
  }

  /* ════════════════════════════════════════════════════════════════
     BILLBOARD
     ════════════════════════════════════════════════════════════════ */

  function slideState(s) {
    var now = Date.now();
    if (s.status !== 'published') return ['draft', 'warn'];
    if (s.starts_at && Date.parse(s.starts_at) > now) return ['scheduled', 'info'];
    if (s.ends_at && Date.parse(s.ends_at) <= now) return ['ended', ''];
    return ['showing', 'ok'];
  }

  function renderBillboard(body, v) {
    set(body, CX.skeleton('cards'));
    return slides().then(function (list) {
      if (!v.alive()) return;
      set(body, html`
        <div class="callout info mb">${icon('info')}<div class="grow"><div class="strong">When a tab has no slides, its billboard builds itself</div><div class="muted" style="font-size:12.5px">from a show that is live, featured titles and events, the number one record and the free month. Slides here take over that tab completely while they are showing.</div></div></div>
        <div class="lvx-slides">
          <button class="lvx-new" type="button" data-new-slide>${icon('plus')}<b>New slide</b><span>An event, a title, a record, or anything at all</span></button>
          ${list.map(function (s, i) {
            var st = slideState(s);
            var media = s.media_kind === 'youtube' && YT_RX.test(s.media_url || '') ? 'https://i.ytimg.com/vi/' + s.media_url + '/hqdefault.jpg' : s.media_kind === 'image' ? s.media_url : s.poster_url;
            return html`<div class="lvx-slide">
              <div class="lvx-slide-img" data-edit-slide="${s.id}">${media ? html`<img src="${CX.safeUrl(media)}" alt="" loading="lazy"/>` : html`<div class="ph">${icon(s.media_kind === 'image' ? 'image' : 'video')}</div>`}
                <div class="lvx-slide-copy">${s.kicker ? html`<span class="lvx-kick">${s.kicker}</span>` : ''}<b>${s.headline || '(from the ' + s.kind + ')'}</b></div>
                <div class="lvx-tags"><span class="imx-chip ${st[1]}">${st[0]}</span><span class="imx-chip">${s.kind}</span>${s.premium ? html`<span class="imx-chip lvx-gold">Premium</span>` : ''}</div></div>
              <div class="lvx-card-b"><div class="lvx-card-s">${(s.placements || []).map(function (p) { return (PLACES.filter(function (x) { return x[0] === p; })[0] || [0, p])[1]; }).join(' · ')}</div>
                <div class="lvx-card-s">${s.starts_at || s.ends_at ? (s.starts_at ? 'from ' + fdate(s.starts_at) : '') + (s.ends_at ? ' until ' + fdate(s.ends_at) : '') : 'No schedule, shows while published'}</div></div>
              <div class="lvx-card-f">
                <button class="btn btn-sm btn-p" data-edit-slide="${s.id}">${icon('edit')}Edit</button>
                ${s.status === 'published' ? html`<button class="btn btn-sm btn-g" data-slide-status="draft" data-id="${s.id}">Take down</button>` : html`<button class="btn btn-sm btn-ok" data-slide-status="published" data-id="${s.id}">Publish</button>`}
                <span class="grow"></span>
                <button class="icon-btn" data-up="${i}" aria-label="Earlier" ${i === 0 ? raw('disabled') : ''}>${icon('chevR')}</button>
                <button class="icon-btn" data-del-slide="${s.id}" aria-label="Delete">${icon('trash')}</button>
              </div></div>`;
          })}
        </div>`);
      on(body, '[data-new-slide]', 'click', function () { slideEditor(null, v); });
      on(body, '[data-edit-slide]', 'click', function (el) { var s = list.filter(function (x) { return x.id === el.getAttribute('data-edit-slide'); })[0]; if (s) slideEditor(s, v); });
      on(body, '[data-slide-status]', 'click', function (el) {
        CX.busy(el, function () { return CX.q('live_billboard').update({ status: el.getAttribute('data-slide-status') }).eq('id', el.getAttribute('data-id')).then(must).then(function () { v.refresh(); }); }).catch(noop);
      });
      on(body, '[data-del-slide]', 'click', function (el) {
        confirm({ title: 'Delete this slide?', tone: 'danger', confirm: 'Delete', onConfirm: function () { return CX.q('live_billboard').delete().eq('id', el.getAttribute('data-del-slide')).then(must).then(function () { v.refresh(); }); } }).catch(noop);
      });
      on(body, '[data-up]', 'click', function (el) {
        var i = +el.getAttribute('data-up'); if (i < 1) return;
        var a = list[i], b = list[i - 1];
        var top = Math.max(n(a.sort_order), n(b.sort_order)) + 1;
        Promise.all([CX.q('live_billboard').update({ sort_order: top }).eq('id', a.id), CX.q('live_billboard').update({ sort_order: top - 1 }).eq('id', b.id)])
          .then(function (r) { r.forEach(must); v.refresh(); }, function (e) { toast(friendly(e), 'bad'); });
      });
    });
  }

  function slideEditor(s, v) {
    var isNew = !s;
    s = s || { id: uuid(), placements: ['home'], kind: 'custom', media_kind: 'image', status: 'draft', sort_order: 0, premium: false };
    CX.drawer.open({
      key: 'live-slide-' + s.id, wide: true, kicker: 'Cabana Live · Billboard', title: isNew ? 'New slide' : (s.headline || 'Slide'), sub: 'Hero slide',
      load: function (d) {
        return Promise.all([titles().catch(function () { return []; }), events().catch(function () { return []; })]).then(function (r) {
          if (!d.alive()) return;
          var ts = r[0], evs = r[1];
          var fields = [
            { name: 'kind', label: 'This slide is about', type: 'select', options: [['custom', 'Anything (custom)'], ['event', 'An event'], ['title', 'A film, series or live show'], ['track', 'A music video']], value: s.kind },
            { name: 'ref_event', label: 'Event', type: 'select', options: [['', 'Choose…']].concat(evs.map(function (e) { return [String(e.id), e.title + ' · ' + fdate(e.starts_at) + (e.status !== 'published' ? ' (' + e.status + ')' : '')]; })), value: s.kind === 'event' ? s.ref : '' },
            { name: 'ref_title', label: 'Title', type: 'select', options: [['', 'Choose…']].concat(ts.map(function (t) { return [t.id, t.title + (t.status !== 'published' ? ' (' + t.status + ')' : '')]; })), value: s.kind === 'title' ? s.ref : '' },
            { name: 'ref_track', label: 'YouTube video', value: s.kind === 'track' ? s.ref : '', placeholder: 'YouTube link or id' },
            { name: 'kicker', label: 'Kicker', value: s.kicker, placeholder: 'Coming soon · Live now · Only on Cabana · Premiere' },
            { name: 'headline', label: 'Headline', value: s.headline, placeholder: 'Leave empty to use the event or title name' },
            { name: 'subline', label: 'Line under it', type: 'textarea', rows: 2, value: s.subline },
            { name: 'venue', label: 'Venue', value: s.venue },
            { name: 'when_at', label: 'Date (adds a countdown)', type: 'datetime-local', value: localInput(s.when_at) },
            { name: 'available_on', label: 'Available on', value: s.available_on, placeholder: 'Cabana Live Premium' },
            { name: 'media_kind', label: 'Background', type: 'select', options: [['image', 'Image'], ['video', 'Video file (plays muted)'], ['youtube', 'YouTube clip (plays muted)']], value: s.media_kind },
            { name: 'cta_label', label: 'Button', value: s.cta_label, placeholder: 'Get tickets' },
            { name: 'cta_url', label: 'Button link', value: s.cta_url, placeholder: '/events/e/… or https://…' },
            { name: 'cta2_label', label: 'Second button', value: s.cta2_label, placeholder: 'Watch trailer' },
            { name: 'cta2_url', label: 'Second link', value: s.cta2_url },
            { name: 'accent', label: 'Accent colour', value: s.accent || '', placeholder: '#FF2E93' },
            { name: 'starts_at', label: 'Show from', type: 'datetime-local', value: localInput(s.starts_at) },
            { name: 'ends_at', label: 'Show until', type: 'datetime-local', value: localInput(s.ends_at) },
            { name: 'sort_order', label: 'Order weight', type: 'number', value: s.sort_order || 0, help: 'higher shows first' },
            { name: 'placements', label: 'Show on', type: 'chips', options: PLACES.map(function (p) { return p[1]; }), value: (s.placements || []).map(function (k) { return (PLACES.filter(function (p) { return p[0] === k; })[0] || [0, k])[1]; }), full: true },
            { name: 'premium', label: 'Show the Premium badge', type: 'switch', value: s.premium }
          ];
          set(d.body, html`<div class="lvx-slide-ed">
            <div class="lvx-prev" data-prev><div class="lvx-prev-media"></div><div class="lvx-prev-copy"><span class="lvx-kick" data-p-kick></span><b data-p-head></b><p data-p-sub></p><div class="lvx-prev-btns" data-p-btns></div></div></div>
            <form class="form-grid" data-f="slide" onsubmit="return false">${fields.map(CX.fieldHTML)}
              ${mediaField('media_url', 'Background media', s.media_kind === 'youtube' ? '' : s.media_url, { full: true, accept: 'image/*,video/mp4,video/webm', ratio: 'r169' })}
              ${mediaField('media_mobile_url', 'Phone version', s.media_mobile_url, { help: 'optional, portrait works best', accept: 'image/*,video/mp4', ratio: 'r916' })}
              ${mediaField('poster_url', 'Poster frame for video', s.poster_url, { help: 'optional', ratio: 'r169' })}
              ${mediaField('logo_url', 'Title logo (PNG)', s.logo_url, { help: 'optional', accept: 'image/png,image/webp' })}
              ${CX.fieldHTML({ name: 'yt_media', label: 'YouTube clip', value: s.media_kind === 'youtube' ? s.media_url : '', placeholder: 'YouTube link or id', full: true })}
            </form></div>`);
          CX.wireChips(d.body);
          wireMedia(d.body, function () { return 'b/' + s.id; });
          var f = $('[data-f="slide"]', d.body);
          function showRefs() {
            var k = $('[name="kind"]', f).value, mk = $('[name="media_kind"]', f).value;
            [['ref_event', 'event'], ['ref_title', 'title'], ['ref_track', 'track']].forEach(function (p) { var el = $('[name="' + p[0] + '"]', f); if (el) el.closest('.fld').style.display = k === p[1] ? '' : 'none'; });
            $('[name="yt_media"]', f).closest('.fld').style.display = mk === 'youtube' ? '' : 'none';
            $('[data-media="media_url"]', f).style.display = mk === 'youtube' ? 'none' : '';
          }
          function preview() {
            var val = function (nm) { var el = $('[name="' + nm + '"]', f); return el ? el.value.trim() : ''; };
            var k = val('kind'), mk = val('media_kind'), head = val('headline');
            if (!head && k === 'event') { var e = evs.filter(function (x) { return String(x.id) === val('ref_event'); })[0]; head = e ? e.title : ''; }
            if (!head && k === 'title') { var t = ts.filter(function (x) { return x.id === val('ref_title'); })[0]; head = t ? t.title : ''; }
            var bg = mk === 'youtube' ? (ytFrom(val('yt_media')) ? 'https://i.ytimg.com/vi/' + ytFrom(val('yt_media')) + '/hqdefault.jpg' : '') : mk === 'image' ? val('media_url') : (val('poster_url') || '');
            var box = $('.lvx-prev-media', d.body);
            if (mk === 'video' && val('media_url') && !bg) set(box, html`<video src="${CX.safeUrl(val('media_url'))}" muted autoplay loop playsinline></video>`);
            else set(box, bg ? html`<img src="${CX.safeUrl(bg)}" alt=""/>` : '');
            $('[data-prev]', d.body).style.setProperty('--acc', /^#[0-9a-f]{6}$/i.test(val('accent')) ? val('accent') : '#8B5CFF');
            set($('[data-p-kick]', d.body), val('kicker'));
            set($('[data-p-head]', d.body), head || 'Your headline');
            set($('[data-p-sub]', d.body), val('subline'));
            set($('[data-p-btns]', d.body), html`${val('cta_label') ? html`<span class="a">${val('cta_label')}</span>` : ''}${val('cta2_label') ? html`<span class="b">${val('cta2_label')}</span>` : ''}`);
          }
          f.addEventListener('input', preview); f.addEventListener('change', function () { showRefs(); preview(); });
          showRefs(); preview();

          d.actions(html`<span class="grow"></span><button class="btn btn-q" data-save>Save</button>${s.status === 'published' ? html`<button class="btn btn-g" data-draft>Take down</button>` : html`<button class="btn btn-ok" data-publish>${icon('check')}Save and publish</button>`}`);
          function saveSlide(btn, status) {
            var val = CX.readForm(f, fields); if (!val) return;
            var place = PLACES.filter(function (p) { return (val.placements || []).indexOf(p[1]) !== -1; }).map(function (p) { return p[0]; });
            if (!place.length) { toast('Choose at least one tab to show it on.', 'bad'); return; }
            var ref = val.kind === 'event' ? val.ref_event : val.kind === 'title' ? val.ref_title : val.kind === 'track' ? ytFrom(val.ref_track) : null;
            if (val.kind !== 'custom' && !ref) { toast('Choose what this slide is about.', 'bad'); return; }
            var media = val.media_kind === 'youtube' ? ytFrom($('[name="yt_media"]', f).value) : $('[data-media="media_url"] input.inp', f).value.trim();
            if (val.media_kind === 'youtube' && $('[name="yt_media"]', f).value.trim() && !media) { toast('That YouTube link is not one YouTube recognises.', 'bad'); return; }
            if (val.kind === 'custom' && !val.headline && !$('[data-media="logo_url"] input.inp', f).value.trim()) { toast('A custom slide needs a headline or a logo.', 'bad'); return; }
            if (val.accent && !/^#[0-9a-fA-F]{6}$/.test(val.accent)) { toast('The accent colour must look like #FF2E93.', 'bad'); return; }
            var row = {
              id: s.id, placements: place, kind: val.kind, ref: ref || null, kicker: val.kicker || null, headline: val.headline || null, subline: val.subline || null,
              logo_url: $('[data-media="logo_url"] input.inp', f).value.trim() || null, media_kind: val.media_kind, media_url: media || null,
              media_mobile_url: $('[data-media="media_mobile_url"] input.inp', f).value.trim() || null, poster_url: $('[data-media="poster_url"] input.inp', f).value.trim() || null,
              venue: val.venue || null, when_at: fromLocal(val.when_at), available_on: val.available_on || null,
              cta_label: val.cta_label || null, cta_url: val.cta_url || null, cta2_label: val.cta2_label || null, cta2_url: val.cta2_url || null,
              accent: val.accent || null, premium: !!val.premium, starts_at: fromLocal(val.starts_at), ends_at: fromLocal(val.ends_at),
              sort_order: val.sort_order === '' ? 0 : val.sort_order, status: status || s.status || 'draft'
            };
            CX.busy(btn, function () {
              return CX.q('live_billboard').upsert(row).select().single().then(must).then(function (saved) {
                s = saved; isNew = false;
                CX.log('live_slide_save', 'live_billboard', saved.id, { status: saved.status });
                toast(saved.status === 'published' ? 'Saved · on the billboard' : 'Saved as draft', 'ok');
                CX.drawer.close(true); v.refresh();
              });
            }).catch(noop);
          }
          on(d.foot, '[data-save]', 'click', function (el) { saveSlide(el, null); });
          on(d.foot, '[data-publish]', 'click', function (el) { saveSlide(el, 'published'); });
          on(d.foot, '[data-draft]', 'click', function (el) { saveSlide(el, 'draft'); });
        });
      }
    });
  }

  /* ════════════════════════════════════════════════════════════════
     MUSIC
     ════════════════════════════════════════════════════════════════ */

  function resolve(q) {
    return fetch(FN + '?action=resolve&q=' + encodeURIComponent(q)).then(function (r) {
      return r.json().then(function (j) { if (!r.ok) throw new Error(j.error === 'not_found' ? 'YouTube has nothing at that link.' : 'YouTube could not be reached just now.'); return j; });
    });
  }

  function renderMusic(body, v, ov) {
    set(body, CX.skeleton());
    return Promise.all([
      CX.rows(CX.q('music_sources').select('*').order('auto').order('label')),
      CX.rows(CX.q('music_playlists').select('*').order('sort_order', { ascending: false }).order('created_at', { ascending: false })),
      CX.rows(CX.q('music_playlist_items').select('playlist_id,video_id'))
    ]).then(function (r) {
      if (!v.alive()) return;
      var src = r[0], pls = r[1], counts = {};
      r[2].forEach(function (it) { counts[it.playlist_id] = (counts[it.playlist_id] || 0) + 1; });
      var m = ov.music || {};
      var feedFirst = /feeds/.test(m.source || '');
      set(body, html`
        <div class="card mb"><div class="card-hd"><div><div class="card-t">The chart</div><div class="card-s">Kenya's Top 50 from YouTube, refreshed every 10 minutes by the database scheduler.</div></div>
          <div class="row gap-s"><button class="btn btn-g btn-sm" data-see-music>${icon('eye')}Music room</button><button class="btn btn-p btn-sm" data-refresh>${icon('refresh')}Refresh now</button></div></div>
          <div class="grid g4" style="padding:0 20px 18px">
            <div class="mini"><div class="mini-l">Source</div><div class="mini-v" style="font-size:15px">${m.source === 'youtube_most_popular' ? 'YouTube chart' : m.source === 'youtube_most_popular+feeds' ? 'YouTube chart + feeds' : feedFirst ? 'Followed channels' : m.source || '—'}</div><div class="mini-s">${/most_popular/.test(m.source || '') ? 'API key connected' : 'No API key: chart built from followed channels'}</div></div>
            <div class="mini"><div class="mini-l">Last refresh</div><div class="mini-v" style="font-size:15px">${m.last_refreshed_at ? ago(m.last_refreshed_at) : '—'}</div><div class="mini-s">${m.last_error ? html`<span class="bad-t">${m.last_error}</span>` : 'no errors'}</div></div>
            <div class="mini"><div class="mini-l">On the chart</div><div class="mini-v">${num(ov.chart_tracks)}</div><div class="mini-s">${num(ov.releases)} fresh releases tracked</div></div>
            <div class="mini"><div class="mini-l">Following</div><div class="mini-v">${num(src.filter(function (x) { return x.active; }).length)}</div><div class="mini-s">${num(src.filter(function (x) { return x.auto; }).length)} followed automatically</div></div>
          </div>
          ${!/most_popular/.test(m.source || '') ? html`<div class="callout warn" style="margin:0 20px 18px">${icon('key')}<div class="grow"><div class="strong">Connect the YouTube API key for the full official chart</div><div class="muted" style="font-size:12.5px">Add YOUTUBE_API_KEY under Supabase → Edge Functions → Secrets (the chart) and in Vercel environment variables (song search). Until then the chart is built from the channels below.</div></div></div>` : ''}
        </div>

        <div class="card mb"><div class="card-hd"><div><div class="card-t">Playlists</div><div class="card-s">Curated by Cabana. Published playlists appear on Home and in the music room.</div></div><button class="btn btn-p btn-sm" data-new-pl>${icon('plus')}New playlist</button></div>
          ${pls.length ? html`<div class="lvx-pls">${pls.map(function (p) {
            return html`<button class="lvx-pl" type="button" data-pl="${p.id}" style="--pl:${p.accent || '#8B5CFF'}"><span class="lvx-pl-art">${p.cover_url ? html`<img src="${CX.safeUrl(p.cover_url)}" alt=""/>` : icon('play')}</span>
              <span class="grow"><b>${p.title}</b><small>${num(counts[p.id] || 0)} tracks · ${p.status}${p.featured ? ' · featured' : ''}</small></span>${icon('chevR')}</button>`;
          })}</div>` : CX.empty('No playlists yet', 'Build one from the chart or from any YouTube link: a Friday warm-up, a gospel Sunday, an amapiano party.', 'play')}
        </div>

        <div class="card"><div class="card-hd"><div><div class="card-t">Channels and playlists the room follows</div><div class="card-s">Their new uploads become Fresh releases, and fill the chart when YouTube's own is short. Artists who chart are followed automatically.</div></div><button class="btn btn-p btn-sm" data-follow>${icon('plus')}Follow</button></div>
          <div class="table-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Kind</th><th>Uploads seen</th><th>Last read</th><th></th></tr></thead><tbody>
          ${src.map(function (x) {
            return html`<tr><td><div class="strong">${x.label || x.external_id}</div><div class="muted" style="font:500 11px var(--f-m)">${x.external_id}${x.auto ? ' · automatic' : ''}</div></td>
              <td>${x.kind}</td><td>${num(x.items_count)}</td><td>${x.last_synced_at ? ago(x.last_synced_at) : '—'}${x.last_error ? html`<div class="bad-t" style="font-size:11px">${x.last_error}</div>` : ''}</td>
              <td style="text-align:right;white-space:nowrap"><button class="btn btn-sm ${x.active ? 'btn-g' : 'btn-ok'}" data-src-toggle="${x.id}" data-on="${x.active ? '1' : ''}">${x.active ? 'Pause' : 'Resume'}</button>
                <button class="icon-btn" data-src-del="${x.id}" aria-label="Stop following">${icon('trash')}</button></td></tr>`;
          })}
          </tbody></table></div></div>`);
      on(body, '[data-see-music]', 'click', function () { see('/events/music'); });
      on(body, '[data-refresh]', 'click', function (el) {
        CX.busy(el, function () {
          return rpc('admin_music_refresh').then(function () { return fetch(FN + '?action=chart'); }).then(function (r) { return r.json(); }).then(function (p) {
            toast(p && p.tracks ? 'Chart refreshed · ' + p.tracks.length + ' tracks' : 'Refresh requested', 'ok'); v.refresh();
          });
        }).catch(noop);
      });
      on(body, '[data-follow]', 'click', function () {
        form({ title: 'Follow a channel or playlist', sub: 'Paste a YouTube channel link, an @handle, or a playlist link.', icon: 'plus',
          fields: [{ name: 'q', label: 'YouTube link', required: true, full: true, placeholder: 'https://www.youtube.com/@SautiSol' }],
          submit: 'Find it', onSubmit: function (val) {
            return resolve(val.q).then(function (x) {
              if (x.kind === 'video') throw new Error('That is a single video. Paste the artist’s channel or a playlist.');
              return CX.q('music_sources').insert({ kind: x.kind, external_id: x.id, label: x.title, market: 'KE', auto: false }).then(function (r) {
                if (r.error && /duplicate/i.test(r.error.message || '')) throw new Error('Already following ' + x.title + '.');
                must(r); toast('Following ' + x.title + ' · ' + x.items + ' recent uploads', 'ok'); v.refresh();
              });
            });
          } }).catch(noop);
      });
      on(body, '[data-src-toggle]', 'click', function (el) {
        CX.q('music_sources').update({ active: !el.getAttribute('data-on') }).eq('id', el.getAttribute('data-src-toggle')).then(must).then(function () { v.refresh(); }, function (e) { toast(friendly(e), 'bad'); });
      });
      on(body, '[data-src-del]', 'click', function (el) {
        confirm({ title: 'Stop following?', body: 'Its uploads already on the chart stay until the next refresh.', tone: 'danger', confirm: 'Stop following',
          onConfirm: function () { return CX.q('music_sources').delete().eq('id', el.getAttribute('data-src-del')).then(must).then(function () { v.refresh(); }); } }).catch(noop);
      });
      on(body, '[data-new-pl]', 'click', function () { playlistEditor(null, v); });
      on(body, '[data-pl]', 'click', function (el) { var p = pls.filter(function (x) { return x.id === el.getAttribute('data-pl'); })[0]; if (p) playlistEditor(p, v); });
    });
  }

  function playlistEditor(p, v) {
    var isNew = !p;
    p = p || { id: uuid(), title: '', slug: '', kind: 'editorial', status: 'draft', featured: false, sort_order: 0, accent: '#8B5CFF' };
    var items = [];
    CX.drawer.open({
      key: 'live-pl-' + p.id, wide: true, kicker: 'Cabana Live · Playlist', title: isNew ? 'New playlist' : p.title, sub: isNew ? '' : '/events/music/playlist/' + p.slug,
      load: function (d) {
        return (isNew ? Promise.resolve([]) : CX.rows(CX.q('music_playlist_items').select('*').eq('playlist_id', p.id).order('position'))).then(function (rows) {
          if (!d.alive()) return;
          items = rows.map(function (r) { return { video_id: r.video_id, title: r.title, artist: r.artist, thumbnail_url: r.thumbnail_url, duration_seconds: r.duration_seconds }; });
          paint(d);
        });
      }
    });
    var fields = function () {
      return [
        { name: 'title', label: 'Title', value: p.title, required: true },
        { name: 'slug', label: 'Web address', value: p.slug, required: true, help: '/events/music/playlist/…' },
        { name: 'description', label: 'Description', value: p.description, full: true },
        { name: 'mood', label: 'Mood tag', value: p.mood, placeholder: 'Party, Chill, Sunday' },
        { name: 'kind', label: 'Kind', type: 'select', options: [['editorial', 'Editorial'], ['mood', 'Mood'], ['party', 'Party'], ['genre', 'Genre'], ['artist', 'Artist']], value: p.kind },
        { name: 'accent', label: 'Accent colour', value: p.accent || '', placeholder: '#8B5CFF' },
        { name: 'sort_order', label: 'Order weight', type: 'number', value: p.sort_order || 0 },
        { name: 'featured', label: 'Feature it', type: 'switch', value: p.featured }
      ];
    };
    function paint(d) {
      set(d.body, html`<form class="form-grid" data-f="pl" onsubmit="return false">${fields().map(CX.fieldHTML)}${mediaField('cover_url', 'Cover (square)', p.cover_url, { help: 'optional: a mosaic of the first four videos otherwise', ratio: 'r11' })}</form>
        <div class="row" style="justify-content:space-between;align-items:center;margin:20px 0 10px"><h3 style="margin:0">Tracks <span class="muted">(${items.length})</span></h3>
          <div class="row gap-s"><button class="btn btn-g btn-sm" data-from-chart>${icon('trendUp')}Add from the chart</button><button class="btn btn-p btn-sm" data-add-link>${icon('plus')}Add a YouTube link</button></div></div>
        ${items.length ? html`<div class="lvx-tracks">${items.map(function (it, i) {
          return html`<div class="lvx-track"><span class="lvx-track-n">${i + 1}</span><img src="https://i.ytimg.com/vi/${it.video_id}/default.jpg" alt=""/><span class="grow"><b>${it.title}</b><small>${it.artist || ''}</small></span>
            <button class="icon-btn" data-mv="${i}" data-d="-1" aria-label="Move up" ${i === 0 ? raw('disabled') : ''}>${icon('chevR')}</button>
            <button class="icon-btn" data-rm="${i}" aria-label="Remove">${icon('x')}</button></div>`;
        })}</div>` : CX.empty('No tracks yet', 'Add from the chart, or paste any YouTube link.', 'play')}`);
      wireMedia(d.body, function () { return 'p/' + p.id; });
      var f = $('[data-f="pl"]', d.body), ti = $('[name="title"]', f), si = $('[name="slug"]', f), touched = !!p.slug;
      si.addEventListener('input', function () { touched = true; });
      ti.addEventListener('input', function () { if (!touched) si.value = slugify(ti.value); });
      on(d.body, '[data-rm]', 'click', function (el) { keep(d); items.splice(+el.getAttribute('data-rm'), 1); paint(d); });
      on(d.body, '[data-mv]', 'click', function (el) { keep(d); var i = +el.getAttribute('data-mv'); var x = items[i]; items.splice(i, 1); items.splice(i - 1, 0, x); paint(d); });
      on(d.body, '[data-add-link]', 'click', function () {
        keep(d);
        form({ title: 'Add a track', icon: 'plus', fields: [{ name: 'q', label: 'YouTube link or id', required: true, full: true }], submit: 'Add',
          onSubmit: function (val) {
            var id = ytFrom(val.q); if (!id) throw new Error('That is not a YouTube video link.');
            if (items.some(function (x) { return x.video_id === id; })) throw new Error('Already on this playlist.');
            return resolve(id).then(function (x) {
              items.push({ video_id: id, title: String(x.title || 'Untitled').slice(0, 200), artist: String(x.artist || '').slice(0, 120), thumbnail_url: 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg' });
              paint(d);
            });
          } }).catch(noop);
      });
      on(d.body, '[data-from-chart]', 'click', function () {
        keep(d);
        CX.rows(CX.q('music_chart_public').select('video_id,title,artist,thumbnail_url,duration_seconds,rank').eq('market', 'KE').order('rank')).then(function (chart) {
          CX.modal({ title: 'Add from the chart', icon: 'trendUp', wide: true,
            body: html`<div class="lvx-pick">${chart.map(function (c) {
              var had = items.some(function (x) { return x.video_id === c.video_id; });
              return html`<label class="lvx-pick-row"><input type="checkbox" value="${c.video_id}" ${had ? raw('checked disabled') : ''}/><span class="lvx-track-n">${c.rank}</span><img src="https://i.ytimg.com/vi/${c.video_id}/default.jpg" alt=""/><span class="grow"><b>${c.title}</b><small>${c.artist}</small></span></label>`;
            })}</div>`,
            actions: [{ label: 'Cancel', kind: 'btn-q', value: null }, { label: 'Add selected', kind: 'btn-p', onClick: function (wrap) {
              $$('input:checked:not(:disabled)', wrap).forEach(function (cb) {
                var c = chart.filter(function (x) { return x.video_id === cb.value; })[0];
                if (c) items.push({ video_id: c.video_id, title: String(c.title).slice(0, 200), artist: String(c.artist || '').slice(0, 120), thumbnail_url: c.thumbnail_url, duration_seconds: c.duration_seconds });
              });
              paint(d);
            } }]
          });
        }, function (e) { toast(friendly(e), 'bad'); });
      });
      d.actions(html`${isNew ? '' : html`<button class="btn btn-d" data-del>${icon('trash')}Delete</button>`}<span class="grow"></span><button class="btn btn-q" data-save>Save</button>
        ${p.status === 'published' ? html`<button class="btn btn-g" data-draft>Unpublish</button>` : html`<button class="btn btn-ok" data-publish>${icon('check')}Save and publish</button>`}`);
      on(d.foot, '[data-save]', 'click', function (el) { savePl(d, el, null); });
      on(d.foot, '[data-publish]', 'click', function (el) { savePl(d, el, 'published'); });
      on(d.foot, '[data-draft]', 'click', function (el) { savePl(d, el, 'draft'); });
      on(d.foot, '[data-del]', 'click', function () {
        confirm({ title: 'Delete ' + p.title + '?', tone: 'danger', confirm: 'Delete', onConfirm: function () { return CX.q('music_playlists').delete().eq('id', p.id).then(must).then(function () { CX.drawer.close(true); v.refresh(); }); } }).catch(noop);
      });
    }
    /* Typing is kept across repaints of the track list. */
    function keep(d) {
      var f = $('[data-f="pl"]', d.body); if (!f) return;
      var val = CX.readForm(f, fields().map(function (x) { return Object.assign({}, x, { required: false }); })) || {};
      Object.keys(val).forEach(function (k) { p[k] = val[k]; });
      p.cover_url = $('[data-media="cover_url"] input.inp', f).value.trim() || null;
    }
    function savePl(d, btn, status) {
      var f = $('[data-f="pl"]', d.body);
      var val = CX.readForm(f, fields()); if (!val) return;
      if (!SLUG_RX.test(val.slug)) { toast('The web address can only use lowercase letters, numbers and dashes.', 'bad'); return; }
      if (val.accent && !/^#[0-9a-fA-F]{6}$/.test(val.accent)) { toast('The accent colour must look like #8B5CFF.', 'bad'); return; }
      if ((status || p.status) === 'published' && !items.length) { toast('Add at least one track before publishing.', 'warn'); return; }
      var row = { id: p.id, title: val.title, slug: val.slug, description: val.description || null, mood: val.mood || null, kind: val.kind,
        accent: val.accent || null, sort_order: val.sort_order === '' ? 0 : val.sort_order, featured: !!val.featured, status: status || p.status || 'draft',
        cover_url: $('[data-media="cover_url"] input.inp', f).value.trim() || null };
      CX.busy(btn, function () {
        return CX.q('music_playlists').upsert(row).select().single().then(must).then(function (saved) {
          p = saved; isNew = false;
          return CX.q('music_playlist_items').delete().eq('playlist_id', saved.id).then(must).then(function () {
            if (!items.length) return null;
            return CX.q('music_playlist_items').insert(items.map(function (it, i) {
              return { playlist_id: saved.id, video_id: it.video_id, title: it.title || 'Untitled', artist: it.artist || null, thumbnail_url: it.thumbnail_url || null, duration_seconds: it.duration_seconds || null, position: i };
            })).then(must);
          });
        }).then(function () {
          CX.log('live_playlist_save', 'music_playlist', p.id, { title: p.title, tracks: items.length });
          toast(p.status === 'published' ? 'Saved · live in the music room' : 'Saved as draft', 'ok');
          CX.drawer.close(true); v.refresh();
        });
      }).catch(noop);
    }
  }

  /* ════════════════════════════════════════════════════════════════
     PREMIUM
     ════════════════════════════════════════════════════════════════ */

  function renderPremium(body, v, ov) {
    set(body, CX.skeleton());
    return Promise.all([CX.rows(CX.q('live_settings').select('*').eq('id', 1)), rpc('admin_live_passes', null, { fresh: true })]).then(function (r) {
      if (!v.alive()) return;
      var st = r[0][0] || {}, passes = (r[1] && r[1].passes) || [];
      var fields = [
        { name: 'premium_name', label: 'Name', value: st.premium_name, required: true },
        { name: 'trial_enabled', label: 'Offer the free month', type: 'switch', value: st.trial_enabled !== false, help: 'Each member can claim it once' },
        { name: 'trial_days', label: 'Free days', type: 'number', value: st.trial_days || 30, min: 1, max: 365, required: true },
        { name: 'open_to_all', label: 'Open everything to everyone', type: 'switch', value: st.open_to_all, help: 'A launch weekend, a promotion. No pass needed while on.' },
        { name: 'price_kes', label: 'Price (KES)', type: 'number', value: st.price_kes == null ? '' : st.price_kes, min: 0, help: 'leave empty until pricing is set' },
        { name: 'price_period', label: 'Per', type: 'select', options: [['week', 'Week'], ['month', 'Month'], ['year', 'Year']], value: st.price_period || 'month' },
        { name: 'banner_title', label: 'Banner headline', value: st.banner_title, required: true, full: true },
        { name: 'banner_text', label: 'Banner text', type: 'textarea', rows: 2, value: st.banner_text, required: true }
      ];
      set(body, html`
        <div class="grid g2 mb" style="align-items:start">
          <div class="card"><div class="card-hd"><div><div class="card-t">The offer</div><div class="card-s">What guests see on the gold band, the billboard and the paywall.</div></div></div>
            <form class="form-grid" data-f="prem" onsubmit="return false" style="padding:0 20px 18px">${fields.map(CX.fieldHTML)}</form>
            <div class="row" style="padding:0 20px 18px;justify-content:flex-end"><button class="btn btn-p" data-save-prem>${icon('check')}Save the offer</button></div></div>
          <div class="card"><div class="card-hd"><div><div class="card-t">Give someone Premium</div><div class="card-s">A partner, a press pass, a make-good. They need a Cabana account.</div></div></div>
            <form class="form-grid" data-f="grant" onsubmit="return false" style="padding:0 20px 8px">
              ${CX.fieldHTML({ name: 'email', label: 'Member email', required: true, full: true, type: 'email' })}
              ${CX.fieldHTML({ name: 'days', label: 'Days', type: 'number', value: 30, min: 0, help: '0 = no end date' })}
              ${CX.fieldHTML({ name: 'note', label: 'Note', placeholder: 'Why' })}
            </form>
            <div class="row" style="padding:0 20px 18px;justify-content:flex-end"><button class="btn btn-ok" data-grant>${icon('star')}Grant Premium</button></div>
            <div class="grid g2" style="padding:0 20px 18px">
              <div class="mini"><div class="mini-l">Active passes</div><div class="mini-v">${num(ov.passes_active)}</div></div>
              <div class="mini"><div class="mini-l">Free months · 30 days</div><div class="mini-v">${num(ov.trials_30)}</div><div class="mini-s">${num(ov.trials_claimed)} all time</div></div>
            </div></div>
        </div>
        <div class="card"><div class="card-hd"><div><div class="card-t">Passes</div><div class="card-s">Newest first.</div></div><button class="btn btn-g btn-sm" data-csv>${icon('download')}Export</button></div>
          ${passes.length ? html`<div class="table-wrap"><table class="tbl"><thead><tr><th>Member</th><th>Source</th><th>Started</th><th>Ends</th><th>Status</th><th></th></tr></thead><tbody>
            ${passes.map(function (p) {
              return html`<tr><td><div class="strong">${p.email || p.user_id}</div>${p.note ? html`<div class="muted" style="font-size:11.5px">${p.note}</div>` : ''}</td>
                <td>${p.source === 'trial' ? 'Free month' : p.source}</td><td>${fdate(p.starts_at)}</td><td>${p.expires_at ? fdate(p.expires_at) : 'No end'}</td>
                <td>${p.active ? html`<span class="pill p-ok">Active</span>` : p.revoked_at ? html`<span class="pill p-bad">Revoked</span>` : html`<span class="pill p-mute">Ended</span>`}</td>
                <td style="text-align:right;white-space:nowrap">${p.revoked_at ? '' : html`<button class="btn btn-sm btn-g" data-extend="${p.id}">+30 days</button><button class="btn btn-sm btn-q" data-revoke="${p.id}">Revoke</button>`}</td></tr>`;
            })}</tbody></table></div>` : CX.empty('No passes yet', 'Passes appear as members start their free month.', 'star')}</div>`);
      on(body, '[data-save-prem]', 'click', function (el) {
        var val = CX.readForm($('[data-f="prem"]', body), fields); if (!val) return;
        CX.busy(el, function () {
          return CX.q('live_settings').update({ premium_name: val.premium_name, trial_enabled: !!val.trial_enabled, trial_days: val.trial_days, open_to_all: !!val.open_to_all,
            price_kes: val.price_kes === '' ? null : val.price_kes, price_period: val.price_period, banner_title: val.banner_title, banner_text: val.banner_text }).eq('id', 1).then(must)
            .then(function () { CX.log('live_settings_save', 'live_settings', '1', val); toast('Saved · live on /events', 'ok'); });
        }).catch(noop);
      });
      on(body, '[data-grant]', 'click', function (el) {
        var f = [{ name: 'email', required: true }, { name: 'days', type: 'number' }, { name: 'note' }];
        var val = CX.readForm($('[data-f="grant"]', body), f); if (!val) return;
        CX.busy(el, function () { return rpc('admin_live_pass_action', { p_action: 'grant', p_email: val.email, p_days: val.days === '' ? 30 : val.days, p_note: val.note || null }).then(function () { toast('Premium granted to ' + val.email, 'ok'); v.refresh(); }); }).catch(noop);
      });
      on(body, '[data-extend]', 'click', function (el) { CX.busy(el, function () { return rpc('admin_live_pass_action', { p_action: 'extend', p_pass: el.getAttribute('data-extend'), p_days: 30 }).then(function () { toast('Extended by 30 days', 'ok'); v.refresh(); }); }).catch(noop); });
      on(body, '[data-revoke]', 'click', function (el) {
        confirm({ title: 'Revoke this pass?', body: 'Premium stops for them straight away.', tone: 'danger', confirm: 'Revoke',
          onConfirm: function () { return rpc('admin_live_pass_action', { p_action: 'revoke', p_pass: el.getAttribute('data-revoke') }).then(function () { v.refresh(); }); } }).catch(noop);
      });
      on(body, '[data-csv]', 'click', function () { CX.csv(passes, ['email', 'source', 'starts_at', 'expires_at', 'active', 'note'], 'cabana-live-passes.csv'); });
    });
  }
})(window);
