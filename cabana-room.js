/* ═══════════════════════════════════════════════════════════════════
   CABANA PULSE · THE ROOM — the engine

   One module owns the chart. It feeds two surfaces:

     the strip   a single row on the events page, showing whatever sits
                 at number one and offering a way in
     the room    a full screen with its own address, its own back
                 button and its own scroll

   The room is opened, not navigated to. Pushing state means the phone
   back gesture closes it and the address can be shared, without the
   events page ever unmounting or the board reloading behind it.

   NOTHING PLAYS UNTIL SOMEBODY ASKS.
   The wall behind the masthead runs the current number one on mute,
   because that is the room's light and a muted autoplay is permitted
   everywhere. Sound only ever starts from a tap, and one tap stops it.

   DATA
   Tracks, artist standings and titles all come from the Edge Function
   in a single call, which also nudges a refresh when the board is
   stale. If that call fails the module reads the same rows straight
   out of Postgres through the anon key, because the views are public
   and a failed function should not silence the music.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var SB_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';
  var CHART_URL = SB_URL + '/functions/v1/youtube-sync?action=chart';
  var REST = SB_URL + '/rest/v1/';
  var SEARCH_URL = '/api/music-search?q=';
  var TOP_N = 20;

  var state = {
    tracks: [], artists: [], awards: [], meta: null,
    shelf: 'all', results: null, query: '',
    playing: null, open: false, built: false, loading: false
  };

  var node = null;
  var refs = {};
  var lastFocus = null;
  var podiumWatcher = null;

  /* ── small helpers ──────────────────────────────────────────────── */

  function el(id) { return document.getElementById(id); }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function num(value) {
    var n = Number(value || 0);
    return isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }

  function compact(value) {
    var n = num(value);
    if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'K';
    return String(n);
  }

  function clock(seconds) {
    var s = num(seconds);
    if (!s) return '';
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  function ago(iso) {
    var time = Date.parse(iso || '');
    if (isNaN(time)) return 'waiting for the first refresh';
    var mins = Math.max(0, Math.floor((Date.now() - time) / 60000));
    if (mins < 1) return 'updated just now';
    if (mins < 60) return 'updated ' + mins + 'm ago';
    var hours = Math.floor(mins / 60);
    if (hours < 24) return 'updated ' + hours + 'h ago';
    return 'updated ' + Math.floor(hours / 24) + 'd ago';
  }

  /* YouTube titles carry the artist, the feature credits and often the
     word "Official Video". The chart shows the record, so the noise is
     trimmed for display only; the stored title is never altered. */
  function songOf(track) {
    var title = String(track.title || '').trim();
    title = title
      .replace(/\s*[([][^)\]]*(official|video|audio|lyric|visualizer|hd|4k|mp3)[^)\]]*[)\]]/gi, '')
      .replace(/\s*[|]\s*official.*$/i, '')
      .trim();
    var artist = String(track.artist || '').trim();
    var head = artist.replace(/\s*\b(official|vevo|tv|music)\b\s*/gi, ' ').trim();
    if (head && title.toLowerCase().indexOf(head.toLowerCase() + ' - ') === 0) {
      title = title.slice(head.length + 3).trim();
    }
    return title || track.title || 'Untitled';
  }

  var SHELVES = [
    { key: 'all', label: 'Everything' },
    { key: 'gengetone', label: 'Gengetone' },
    { key: 'afrobeat', label: 'Afrobeat' },
    { key: 'bongo', label: 'Bongo' },
    { key: 'drill', label: 'Drill' },
    { key: 'amapiano', label: 'Amapiano' },
    { key: 'gospel', label: 'Gospel' },
    { key: 'reggae', label: 'Reggae' },
    { key: 'hiphop', label: 'Hip hop' },
    { key: 'rnb', label: 'R&B' },
    { key: 'tribal', label: 'Tribal' }
  ];

  /* ── loading ────────────────────────────────────────────────────── */

  function timed(url, ms) {
    var controller = null;
    var timer = null;
    try {
      controller = new AbortController();
      timer = setTimeout(function () { controller.abort(); }, ms);
    } catch (_error) {}
    return fetch(url, controller ? { signal: controller.signal } : {})
      .finally(function () { if (timer) clearTimeout(timer); });
  }

  function restRead(path) {
    return fetch(REST + path, {
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
    }).then(function (response) {
      if (!response.ok) throw new Error('rest_' + response.status);
      return response.json();
    });
  }

  /* The function call is preferred because it also refreshes a stale
     board. Postgres is the floor beneath it, never the other way round. */
  function loadChart() {
    if (state.loading) return Promise.resolve();
    state.loading = true;

    return timed(CHART_URL, 18000)
      .then(function (response) {
        if (!response.ok) throw new Error('chart_' + response.status);
        return response.json();
      })
      .then(function (payload) {
        if (payload && payload.error) throw new Error(payload.error);
        return payload;
      })
      .catch(function () {
        return Promise.all([
          restRead('music_chart_public?market=eq.KE&order=rank.asc'),
          restRead('music_artists_public?market=eq.KE&order=rank.asc&limit=20'),
          restRead('music_chart_awards?market=eq.KE&order=period_start.desc'),
          restRead('music_chart_meta?market=eq.KE&limit=1')
        ]).then(function (parts) {
          return {
            tracks: (parts[0] || []).map(fromRow),
            artists: (parts[1] || []).map(fromArtistRow),
            awards: (parts[2] || []).map(fromAwardRow),
            meta: (parts[3] || [])[0] || null
          };
        });
      })
      .then(function (payload) {
        state.tracks = Array.isArray(payload.tracks) ? payload.tracks.map(normalise) : [];
        state.artists = Array.isArray(payload.artists) ? payload.artists : [];
        state.awards = Array.isArray(payload.awards) ? payload.awards : [];
        state.meta = payload.meta || null;
        paintStrip();
        if (state.built) paintRoom();

        /* An older deployment of the sync function answers with tracks
           and nothing else. Standings and titles are computed in the
           database either way, so they are simply read directly rather
           than the podium sitting empty waiting on a redeploy. */
        if (!state.artists.length) return topUp();
      })
      .catch(function () {
        paintStrip();
        if (state.built) paintRoom();
      })
      .finally(function () { state.loading = false; });
  }

  function topUp() {
    return Promise.all([
      restRead('music_artists_public?market=eq.KE&order=rank.asc&limit=20'),
      restRead('music_chart_awards?market=eq.KE&order=period_start.desc')
    ]).then(function (parts) {
      var artists = (parts[0] || []).map(fromArtistRow);
      var awards = (parts[1] || []).map(fromAwardRow);
      if (!artists.length && !awards.length) return;
      state.artists = artists;
      state.awards = awards;
      if (state.built) { paintPodium(); paintTitles(); }
    }).catch(function () { /* the board still plays without a podium */ });
  }

  function normalise(track) {
    return {
      videoId: track.videoId || track.video_id,
      rank: num(track.rank),
      previousRank: track.previousRank == null ? null : num(track.previousRank),
      title: track.title || 'Untitled',
      artist: track.artist || 'Unknown artist',
      thumb: track.thumb || track.thumbnail_url || '',
      durationSeconds: track.durationSeconds || track.duration_seconds || null,
      views: num(track.views),
      likes: num(track.likes),
      viewsDelta: num(track.viewsDelta || track.views_delta),
      genre: track.genre || 'other',
      culture: track.culture || null,
      format: track.format || 'track'
    };
  }

  function fromRow(row) { return normalise(row); }

  function fromArtistRow(row) {
    return {
      key: row.artist_key, name: row.artist,
      rank: num(row.rank),
      previousRank: row.previous_rank == null ? null : num(row.previous_rank),
      score: Number(row.score || 0),
      tracks: num(row.tracks_count),
      bestRank: row.best_rank == null ? null : num(row.best_rank),
      views: num(row.total_views),
      viewsDelta: num(row.views_delta),
      leadVideoId: row.lead_video_id,
      leadTitle: row.lead_title,
      thumb: row.thumbnail_url,
      genre: row.genre || 'other',
      culture: row.culture || null
    };
  }

  function fromAwardRow(row) {
    return {
      period: row.period, periodStart: row.period_start,
      name: row.artist, key: row.artist_key,
      viewsDelta: num(row.views_delta),
      days: num(row.days_counted),
      thumb: row.thumbnail_url,
      leadVideoId: row.lead_video_id,
      leadTitle: row.lead_title
    };
  }

  /* ── the strip on the events page ───────────────────────────────── */

  function paintStrip() {
    var strip = el('ev-pulse');
    if (!strip) return;

    var lead = state.tracks[0];
    if (!lead) {
      strip.innerHTML =
        '<button class="ev-pulse-in" type="button" data-room-open>' +
          '<span class="ev-pulse-art"></span>' +
          '<span class="ev-pulse-txt">' +
            '<span class="ev-pulse-kick"><i></i>Cabana Pulse</span>' +
            '<span class="ev-pulse-name">The chart is warming up</span>' +
            '<span class="ev-pulse-sub">Kenya\u2019s top 20, artist standings and the podium</span>' +
          '</span>' +
          '<span class="ev-pulse-go">' + arrow() + '<span>Open</span></span>' +
        '</button>';
      return;
    }

    strip.innerHTML =
      '<button class="ev-pulse-in" type="button" data-room-open ' +
        'aria-label="Open Cabana Pulse. Number one right now is ' + esc(songOf(lead)) + ' by ' + esc(lead.artist) + '">' +
        '<span class="ev-pulse-art">' +
          (lead.thumb ? '<img src="' + esc(lead.thumb) + '" alt="" loading="lazy" decoding="async"/>' : '') +
          '<span class="ev-eqbar"><i></i><i></i><i></i><i></i><i></i></span>' +
        '</span>' +
        '<span class="ev-pulse-txt">' +
          '<span class="ev-pulse-kick"><i></i>No.1 in Kenya</span>' +
          '<span class="ev-pulse-name">' + esc(songOf(lead)) + '</span>' +
          '<span class="ev-pulse-sub">' + esc(lead.artist) + ' \u00b7 top 20, standings and the podium</span>' +
        '</span>' +
        '<span class="ev-pulse-go">' + arrow() + '<span>Open the room</span></span>' +
      '</button>';
  }

  function arrow() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M5 12h13M13 6l6 6-6 6"/></svg>';
  }

  function icon(path, width) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (width || 2.2) +
      '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>';
  }

  /* ── the room shell ─────────────────────────────────────────────── */

  function build() {
    if (state.built) return;

    node = document.createElement('div');
    node.className = 'cbr';
    node.id = 'cabana-room';
    node.setAttribute('role', 'dialog');
    node.setAttribute('aria-modal', 'true');
    node.setAttribute('aria-label', 'Cabana Pulse, the Kenya music chart');
    node.innerHTML =
      '<div class="cbr-stage">' +
        '<div class="cbr-screen" id="cbr-screen"></div>' +
        '<div class="cbr-top">' +
          '<div class="cbr-mark"><i></i>Cabana Pulse <span id="cbr-fresh">connecting</span></div>' +
          '<button class="cbr-shut" type="button" id="cbr-shut">' +
            icon('<path d="M18 6 6 18M6 6l12 12"/>', 2.4) + 'Back to events</button>' +
        '</div>' +
        '<div class="cbr-hero" id="cbr-hero"></div>' +
      '</div>' +

      '<div class="cbr-wrap">' +

        '<section class="cbr-sec" aria-labelledby="cbr-podium-h">' +
          '<div class="cbr-sec-h"><div>' +
            '<h2 id="cbr-podium-h">Who is standing where</h2>' +
            '<p>Ranked across every record an artist holds on the board, not off a single hit. ' +
              'Momentum counts for more than lifetime plays.</p>' +
          '</div></div>' +
          '<div class="cbr-podium" id="cbr-podium"></div>' +
          '<div class="cbr-rest" id="cbr-rest"></div>' +
        '</section>' +

        '<section class="cbr-sec" aria-labelledby="cbr-titles-h">' +
          '<div class="cbr-sec-h"><div>' +
            '<h2 id="cbr-titles-h">The titles</h2>' +
            '<p>Decided over a whole window from daily standings, so one loud afternoon cannot buy a year.</p>' +
          '</div></div>' +
          '<div class="cbr-titles" id="cbr-titles"></div>' +
        '</section>' +

        '<section class="cbr-sec" aria-labelledby="cbr-find-h">' +
          '<div class="cbr-sec-h"><div>' +
            '<h2 id="cbr-find-h">Play anything</h2>' +
            '<p>Name a song and it plays here. Or pick a shelf and read the board through it.</p>' +
          '</div></div>' +
          '<div class="cbr-find">' +
            icon('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>') +
            '<input id="cbr-q" type="search" placeholder="Search a song or an artist" ' +
              'aria-label="Search for a song" autocomplete="off"/>' +
            '<button type="button" id="cbr-go">Find it</button>' +
          '</div>' +
          '<div class="cbr-shelves" id="cbr-shelves" role="group" aria-label="Filter the board by shelf"></div>' +
          '<div class="cbr-note" id="cbr-note" role="status"></div>' +
        '</section>' +

        '<section class="cbr-sec" aria-labelledby="cbr-board-h">' +
          '<div class="cbr-sec-h"><div>' +
            '<h2 id="cbr-board-h">The Cabana Top 20</h2>' +
            '<p id="cbr-board-sub">What Kenya is playing on YouTube right now.</p>' +
          '</div></div>' +
          '<div class="cbr-board" id="cbr-board">' +
            '<div class="cbr-load"><i></i><i></i><i></i><i></i></div>' +
          '</div>' +
          '<div class="cbr-foot">' +
            '<span>Compiled from YouTube music activity for Kenya. Positions move as the numbers move.</span>' +
            '<span>Cabana adds context, not invented numbers.</span>' +
          '</div>' +
        '</section>' +

      '</div>' +

      '<div class="cbr-player" id="cbr-player">' +
        '<div class="cbr-player-in">' +
          '<div class="cbr-player-art" id="cbr-player-art"></div>' +
          '<div class="cbr-player-txt">' +
            '<div class="cbr-player-t" id="cbr-player-t"></div>' +
            '<div class="cbr-player-a" id="cbr-player-a"></div>' +
          '</div>' +
          '<div class="cbr-player-acts">' +
            '<button class="cbr-ctl" type="button" id="cbr-prev" aria-label="Previous track">' +
              icon('<path d="M19 20 9 12l10-8zM5 19V5"/>') + '</button>' +
            '<button class="cbr-ctl" type="button" id="cbr-next" aria-label="Next track">' +
              icon('<path d="m5 4 10 8-10 8zM19 5v14"/>') + '</button>' +
            '<button class="cbr-ctl wide lead" type="button" id="cbr-stop" aria-label="Stop playing">' +
              icon('<rect x="6" y="6" width="12" height="12" rx="2"/>') + '<span>Stop</span></button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(node);

    refs = {
      screen: el('cbr-screen'), hero: el('cbr-hero'), fresh: el('cbr-fresh'),
      podium: el('cbr-podium'), rest: el('cbr-rest'), titles: el('cbr-titles'),
      shelves: el('cbr-shelves'), board: el('cbr-board'), boardSub: el('cbr-board-sub'),
      note: el('cbr-note'), query: el('cbr-q'), player: el('cbr-player'),
      playerArt: el('cbr-player-art'), playerT: el('cbr-player-t'), playerA: el('cbr-player-a')
    };

    wire();
    state.built = true;
    paintRoom();
  }

  function wire() {
    el('cbr-shut').addEventListener('click', function () { close(true); });
    el('cbr-go').addEventListener('click', runSearch);
    el('cbr-stop').addEventListener('click', stop);
    el('cbr-next').addEventListener('click', function () { step(1); });
    el('cbr-prev').addEventListener('click', function () { step(-1); });

    refs.query.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') { event.preventDefault(); runSearch(); }
    });
    refs.query.addEventListener('search', function () {
      if (!refs.query.value.trim()) { state.results = null; state.query = ''; paintBoard(); note(''); }
    });

    refs.shelves.addEventListener('click', function (event) {
      var button = event.target.closest('[data-shelf]');
      if (!button) return;
      state.shelf = button.getAttribute('data-shelf');
      state.results = null;
      state.query = '';
      if (refs.query) refs.query.value = '';
      note('');
      paintShelves();
      paintBoard();
    });

    refs.board.addEventListener('click', function (event) {
      var row = event.target.closest('[data-vid]');
      if (row) play(row.getAttribute('data-vid'));
    });

    node.addEventListener('click', function (event) {
      var who = event.target.closest('[data-artist-play]');
      if (who) play(who.getAttribute('data-artist-play'));
    });

    node.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') close(true);
    });
  }

  /* ── painting ───────────────────────────────────────────────────── */

  function paintRoom() {
    if (!state.built) return;
    paintWall();
    paintHero();
    paintPodium();
    paintTitles();
    paintShelves();
    paintBoard();
    if (refs.fresh) {
      refs.fresh.textContent = state.tracks.length
        ? '\u00b7 Kenya \u00b7 ' + ago(state.meta && (state.meta.last_refreshed_at || state.meta.lastRefreshedAt))
        : '\u00b7 waiting for the board';
    }
  }

  /* The wall runs the current number one on mute. A muted, inline,
     looping embed is allowed to autoplay in every current browser, so
     this never demands a gesture and never makes noise. */
  function paintWall() {
    if (!refs.screen) return;
    var lead = state.tracks[0];
    if (!lead) { refs.screen.innerHTML = ''; return; }

    var reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      refs.screen.innerHTML = lead.thumb
        ? '<img src="' + esc(lead.thumb) + '" alt="" decoding="async"/>' : '';
      return;
    }
    if (refs.screen.getAttribute('data-vid') === lead.videoId) return;
    refs.screen.setAttribute('data-vid', lead.videoId);
    refs.screen.innerHTML =
      '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(lead.videoId) +
        '?autoplay=1&mute=1&controls=0&loop=1&playlist=' + encodeURIComponent(lead.videoId) +
        '&playsinline=1&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&fs=0" ' +
        'title="" tabindex="-1" aria-hidden="true" ' +
        'allow="autoplay; encrypted-media" referrerpolicy="strict-origin-when-cross-origin" ' +
        'loading="lazy"></iframe>';
  }

  function paintHero() {
    if (!refs.hero) return;
    var lead = state.tracks[0];
    if (!lead) {
      refs.hero.innerHTML =
        '<div class="cbr-hero-kick">Cabana Pulse</div>' +
        '<h1>The board is being compiled.</h1>' +
        '<p class="cbr-hero-by">Positions appear as soon as the first refresh lands.</p>';
      return;
    }

    var climbed = lead.previousRank && lead.previousRank > 1;
    refs.hero.innerHTML =
      '<div class="cbr-hero-kick">Number one in Kenya</div>' +
      '<h1>' + esc(songOf(lead)) + '</h1>' +
      '<p class="cbr-hero-by">' + esc(lead.artist) +
        (lead.durationSeconds ? ' \u00b7 ' + clock(lead.durationSeconds) : '') + '</p>' +
      '<div class="cbr-hero-acts">' +
        '<button class="cbr-ctl wide lead" type="button" data-artist-play="' + esc(lead.videoId) + '">' +
          icon('<path d="m6 4 13 8-13 8z"/>', 1.6) + '<span>Play it</span></button>' +
        '<span class="cbr-stat"><b>' + compact(lead.views) + '</b> plays</span>' +
        (lead.viewsDelta
          ? '<span class="cbr-stat up"><b>+' + compact(lead.viewsDelta) + '</b> since the last chart</span>'
          : '') +
        (climbed ? '<span class="cbr-stat up">up from ' + lead.previousRank + '</span>' : '') +
      '</div>';
  }

  /* A cup with a bowl, a stem, a base and two handles. Drawn rather
     than borrowed so the three metals can differ. */
  function cup() {
    return '<svg viewBox="0 0 64 72" fill="none" aria-hidden="true">' +
      '<path d="M18 8h28v18a14 14 0 0 1-28 0z" fill="var(--metal)"/>' +
      '<path d="M18 8h28v6H18z" fill="var(--metal-lit)"/>' +
      '<path d="M18 12h-7a7 7 0 0 0 7 12M46 12h7a7 7 0 0 1-7 12" stroke="var(--metal)" ' +
        'stroke-width="3.4" stroke-linecap="round"/>' +
      '<path d="M29 40h6v10h-6z" fill="var(--metal)"/>' +
      '<path d="M20 50h24l3 8H17z" fill="var(--metal)"/>' +
      '<path d="M14 58h36v6H14z" rx="2" fill="var(--metal-lit)"/>' +
      '<path d="M25 16h4v10h-4z" fill="var(--metal-lit)" opacity=".55"/>' +
      '</svg>';
  }

  function paintPodium() {
    if (!refs.podium) return;
    var top = state.artists.slice(0, 3);

    if (!top.length) {
      refs.podium.innerHTML =
        '<div class="cbr-empty" style="grid-column:1/-1">Standings appear once the board has ' +
        'been refreshed. Nobody is on the podium yet.</div>';
      refs.rest.innerHTML = '';
      return;
    }

    /* Second, first, third across the stage, so the tallest block is in
       the middle where a podium puts it. */
    var order = [top[1], top[0], top[2]];
    refs.podium.innerHTML = order.map(function (artist) {
      if (!artist) return '<div></div>';
      var place = artist.rank;
      return '<button class="cbr-plinth" type="button" data-place="' + place + '" ' +
          (artist.leadVideoId ? 'data-artist-play="' + esc(artist.leadVideoId) + '" ' : '') +
          'aria-label="Number ' + place + ', ' + esc(artist.name) + '">' +
          '<span class="cbr-beam"></span>' +
          '<span class="cbr-cup">' + cup() + '</span>' +
          (artist.thumb
            ? '<span class="cbr-face"><img src="' + esc(artist.thumb) + '" alt="" loading="lazy" decoding="async"/></span>'
            : '') +
          '<span class="cbr-who">' + esc(artist.name) + '</span>' +
          '<span class="cbr-what"><b>' + artist.tracks + '</b> on the board' +
            (artist.viewsDelta ? ' \u00b7 <b>+' + compact(artist.viewsDelta) + '</b>' : '') + '</span>' +
          '<span class="cbr-block"><span class="cbr-place">' + place + '</span></span>' +
        '</button>';
    }).join('');

    watchPodium();

    var rest = state.artists.slice(3, 10);
    refs.rest.innerHTML = rest.map(function (artist) {
      return '<button class="cbr-row" type="button" ' +
          (artist.leadVideoId ? 'data-artist-play="' + esc(artist.leadVideoId) + '" ' : '') +
          'aria-label="Number ' + artist.rank + ', ' + esc(artist.name) + '">' +
          '<span class="cbr-rank">' + artist.rank + '</span>' +
          (artist.thumb
            ? '<span class="cbr-thumb"><img src="' + esc(artist.thumb) + '" alt="" loading="lazy" decoding="async"/></span>'
            : '<span class="cbr-thumb"></span>') +
          '<span class="cbr-row-txt">' +
            '<span class="cbr-row-n">' + esc(artist.name) + '</span>' +
            '<span class="cbr-row-s">' + artist.tracks + ' on the board' +
              (artist.bestRank ? ' \u00b7 best at ' + artist.bestRank : '') + '</span>' +
          '</span>' +
          movement(artist.rank, artist.previousRank) +
        '</button>';
    }).join('');
  }

  function movement(rank, previous) {
    if (previous == null) return '<span class="cbr-move new">new</span>';
    var shift = previous - rank;
    if (!shift) return '<span class="cbr-move">\u2014</span>';
    var up = shift > 0;
    return '<span class="cbr-move ' + (up ? 'up' : 'down') + '">' +
      icon(up ? '<path d="m6 15 6-6 6 6"/>' : '<path d="m6 9 6 6 6-6"/>', 2.6) +
      Math.abs(shift) + '</span>';
  }

  /* The stage assembles when it comes into view, not on load. Building
     a podium nobody is looking at wastes the only moment it has. */
  function watchPodium() {
    if (!refs.podium || !global.IntersectionObserver) {
      if (refs.podium) refs.podium.classList.add('lit');
      return;
    }
    if (podiumWatcher) podiumWatcher.disconnect();
    refs.podium.classList.remove('lit');
    podiumWatcher = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('lit');
          podiumWatcher.unobserve(entry.target);
        }
      });
    }, { threshold: 0.32 });
    podiumWatcher.observe(refs.podium);
  }

  var PERIODS = [
    { key: 'week', label: 'Artist of the week', wait: 'Seven days of standings decides this one.' },
    { key: 'month', label: 'Artist of the month', wait: 'Thirty days of standings decides this one.' },
    { key: 'year', label: 'Artist of the year', wait: 'A full year of standings decides this one.' }
  ];

  function paintTitles() {
    if (!refs.titles) return;
    var held = {};
    state.awards.forEach(function (award) {
      if (!held[award.period]) held[award.period] = award;
    });

    refs.titles.innerHTML = PERIODS.map(function (period) {
      var award = held[period.key];
      if (!award) {
        return '<div class="cbr-title" data-period="' + period.key + '">' +
          '<div class="cbr-title-face"></div>' +
          '<div class="cbr-title-txt">' +
            '<div class="cbr-title-k">' + period.label + '</div>' +
            '<div class="cbr-title-wait">' + period.wait + '</div>' +
          '</div></div>';
      }
      return '<' + (award.leadVideoId ? 'button' : 'div') + ' class="cbr-title" data-period="' + period.key + '"' +
          (award.leadVideoId ? ' type="button" data-artist-play="' + esc(award.leadVideoId) + '"' : '') + '>' +
          '<div class="cbr-title-face">' +
            (award.thumb ? '<img src="' + esc(award.thumb) + '" alt="" loading="lazy" decoding="async"/>' : '') +
          '</div>' +
          '<div class="cbr-title-txt">' +
            '<div class="cbr-title-k">' + period.label + '</div>' +
            '<div class="cbr-title-n">' + esc(award.name) + '</div>' +
            '<div class="cbr-title-s">' + (award.days || 1) + ' day' + (award.days === 1 ? '' : 's') +
              ' counted' + (award.viewsDelta ? ' \u00b7 +' + compact(award.viewsDelta) + ' plays' : '') + '</div>' +
          '</div>' +
        '</' + (award.leadVideoId ? 'button' : 'div') + '>';
    }).join('');
  }

  function paintShelves() {
    if (!refs.shelves) return;
    var counts = {};
    state.tracks.forEach(function (track) {
      counts[track.genre] = (counts[track.genre] || 0) + 1;
    });

    refs.shelves.innerHTML = SHELVES.filter(function (shelf) {
      return shelf.key === 'all' || shelf.key === 'tribal' || counts[shelf.key];
    }).map(function (shelf) {
      var on = state.shelf === shelf.key;
      return '<button class="cbr-shelf" type="button" data-shelf="' + shelf.key + '" ' +
        'aria-pressed="' + on + '">' + esc(shelf.label) + '</button>';
    }).join('');
  }

  function shown() {
    if (state.results) return state.results;
    if (state.shelf === 'all') return state.tracks.slice(0, TOP_N);
    return state.tracks.filter(function (track) { return track.genre === state.shelf; });
  }

  function paintBoard() {
    if (!refs.board) return;
    var list = shown();

    if (refs.boardSub) {
      refs.boardSub.textContent = state.results
        ? 'Results for \u201c' + state.query + '\u201d. Tap any of them to play.'
        : state.shelf === 'all'
          ? 'What Kenya is playing on YouTube right now.'
          : 'The board, read through one shelf.';
    }

    if (!list.length) {
      refs.board.innerHTML = '<div class="cbr-empty">' +
        (state.results
          ? 'Nothing came back for that. Try the artist name on its own.'
          : state.shelf === 'tribal'
            ? 'No records in a mother tongue are on the board at the moment. ' +
              'The shelf stays here, because they come and go.'
            : 'Nothing on this shelf right now.') +
        '</div>';
      return;
    }

    refs.board.innerHTML = list.map(function (track, index) {
      var rank = state.results ? index + 1 : track.rank || index + 1;
      var playing = state.playing === track.videoId;
      return '<button class="cbr-track' + (playing ? ' playing' : '') + '" type="button" ' +
          'data-vid="' + esc(track.videoId) + '" ' +
          'aria-label="Play ' + esc(songOf(track)) + ' by ' + esc(track.artist) + '">' +
          '<span class="cbr-track-r">' + rank + '</span>' +
          '<span class="cbr-track-art">' +
            (track.thumb ? '<img src="' + esc(track.thumb) + '" alt="" loading="lazy" decoding="async"/>' : '') +
            '<span class="cbr-play">' + icon('<path d="m6 4 13 8-13 8z"/>', 1.6) + '</span>' +
          '</span>' +
          '<span class="cbr-track-txt">' +
            '<span class="cbr-track-t">' + esc(songOf(track)) + '</span>' +
            '<span class="cbr-track-a">' + esc(track.artist) + '</span>' +
          '</span>' +
          '<span class="cbr-track-m">' +
            (track.culture
              ? '<span class="cbr-tag tribal">' + esc(track.culture) + '</span>'
              : '<span class="cbr-tag">' + esc(track.genre === 'other' ? 'music' : track.genre) + '</span>') +
            (track.views ? '<span class="hide-s">' + compact(track.views) + '</span>' : '') +
            (track.durationSeconds ? '<span class="hide-s">' + clock(track.durationSeconds) + '</span>' : '') +
          '</span>' +
        '</button>';
    }).join('');
  }

  function note(message) {
    if (refs.note) refs.note.textContent = message || '';
  }

  /* ── search ─────────────────────────────────────────────────────── */

  function runSearch() {
    var query = (refs.query.value || '').trim();
    if (query.length < 2) { note('Type at least two characters.'); return; }

    var button = el('cbr-go');
    button.disabled = true;
    button.textContent = 'Looking';
    note('');

    timed(SEARCH_URL + encodeURIComponent(query), 12000)
      .then(function (response) { return response.json(); })
      .then(function (payload) {
        if (payload.unconfigured) {
          note('Search is not switched on yet. The board below still plays.');
          return;
        }
        if (payload.exhausted) {
          note('Search has used up today\u2019s allowance. The board below is unaffected.');
          return;
        }
        if (payload.error) {
          note('Could not reach YouTube just now. Try again shortly.');
          return;
        }
        var results = (payload.results || []).map(normalise);
        state.results = results;
        state.query = query;
        state.shelf = 'all';
        paintShelves();
        paintBoard();
        note(results.length
          ? results.length + ' found. Tap one to play it.'
          : 'Nothing came back for that.');
      })
      .catch(function () { note('Search did not answer. Try again shortly.'); })
      .finally(function () {
        button.disabled = false;
        button.textContent = 'Find it';
      });
  }

  /* ── playing ────────────────────────────────────────────────────── */

  function find(videoId) {
    var pool = state.results || state.tracks;
    for (var i = 0; i < pool.length; i += 1) {
      if (pool[i].videoId === videoId) return pool[i];
    }
    for (var j = 0; j < state.tracks.length; j += 1) {
      if (state.tracks[j].videoId === videoId) return state.tracks[j];
    }
    return null;
  }

  function play(videoId) {
    var track = find(videoId);
    if (!track) return;

    state.playing = videoId;

    /* The wall keeps running muted behind the room. Two audio sources
       would fight, so the wall is stilled while a track has sound. */
    if (refs.screen) refs.screen.style.opacity = '.32';

    refs.playerArt.innerHTML =
      '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(videoId) +
        '?autoplay=1&playsinline=1&modestbranding=1&rel=0&iv_load_policy=3&enablejsapi=1" ' +
        'title="' + esc(songOf(track)) + '" allow="autoplay; encrypted-media" ' +
        'referrerpolicy="strict-origin-when-cross-origin"></iframe>';
    refs.playerT.textContent = songOf(track);
    refs.playerA.textContent = track.artist;
    refs.player.classList.add('on');

    paintBoard();

    if (global.CabanaTelemetry && typeof global.CabanaTelemetry.track === 'function') {
      try { global.CabanaTelemetry.track('pulse_play', { videoId: videoId }); } catch (_error) {}
    }
  }

  function stop() {
    state.playing = null;
    refs.playerArt.innerHTML = '';
    refs.player.classList.remove('on');
    if (refs.screen) refs.screen.style.opacity = '';
    paintBoard();
  }

  function step(direction) {
    var pool = shown();
    if (!pool.length) return;
    var at = -1;
    for (var i = 0; i < pool.length; i += 1) {
      if (pool[i].videoId === state.playing) { at = i; break; }
    }
    var next = pool[(at + direction + pool.length) % pool.length];
    if (next) play(next.videoId);
  }

  /* ── opening and closing ────────────────────────────────────────── */

  function open(fromHistory) {
    build();
    if (state.open) return;
    state.open = true;
    lastFocus = document.activeElement;

    document.documentElement.classList.add('cbr-lock');
    /* One frame between mount and class so the transition has a start. */
    requestAnimationFrame(function () {
      node.classList.add('on');
      node.scrollTop = 0;
    });

    if (!fromHistory) {
      try {
        history.pushState({ cabanaRoom: 1 }, '', '?room=music');
      } catch (_error) {}
    }

    var shut = el('cbr-shut');
    if (shut) setTimeout(function () { shut.focus(); }, 240);

    if (!state.tracks.length) loadChart();
    else paintRoom();
  }

  function close(pop) {
    if (!state.open) return;
    state.open = false;
    stop();
    node.classList.remove('on');
    document.documentElement.classList.remove('cbr-lock');

    if (pop && history.state && history.state.cabanaRoom) {
      try { history.back(); return; } catch (_error) {}
    }
    if (pop) {
      try { history.replaceState({}, '', location.pathname); } catch (_error) {}
    }
    if (lastFocus && lastFocus.focus) {
      try { lastFocus.focus(); } catch (_error) {}
    }
  }

  /* ── boot ───────────────────────────────────────────────────────── */

  function boot() {
    document.addEventListener('click', function (event) {
      var trigger = event.target.closest('[data-room-open]');
      if (!trigger) return;
      event.preventDefault();
      open(false);
    });

    global.addEventListener('popstate', function () {
      var wants = /[?&]room=music\b/.test(location.search);
      if (wants && !state.open) open(true);
      else if (!wants && state.open) close(false);
    });

    loadChart().then(function () {
      if (/[?&]room=music\b/.test(location.search)) open(true);
    });

    /* A stale board is worse than a slow one. Re-read when the tab
       comes back after being away for more than ten minutes. */
    var left = 0;
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { left = Date.now(); return; }
      if (left && Date.now() - left > 600000) loadChart();
      left = 0;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  global.CabanaRoom = {
    open: function () { open(false); },
    close: function () { close(true); },
    reload: loadChart,
    state: function () {
      return { tracks: state.tracks.length, artists: state.artists.length, open: state.open };
    }
  };
})(window);
