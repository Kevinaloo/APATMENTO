/* ═══════════════════════════════════════════════════════════════════
   CABANA PULSE · live music inside Events

   Source: YouTube music activity for region KE. The Edge Function uses
   YouTube mostPopular directly when Cabana's API key is configured, with
   a server-only continuity feed from the original music service. This
   client never writes chart data and never creates a player until a
   visitor explicitly asks to listen.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var SB_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';
  var CHART_URL = SB_URL + '/functions/v1/youtube-sync?action=chart';
  var state = { tracks: [], meta: null, stale: false, filter: 'all', loading: false };
  var sb = null, channel = null, reloadTimer = null, lastFocus = null;

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
    return n.toLocaleString('en-KE');
  }
  function ago(iso) {
    var time = Date.parse(iso || '');
    if (isNaN(time)) return 'waiting for first refresh';
    var mins = Math.max(0, Math.floor((Date.now() - time) / 60000));
    if (mins < 1) return 'updated just now';
    if (mins < 60) return 'updated ' + mins + 'm ago';
    var hours = Math.floor(mins / 60);
    if (hours < 24) return 'updated ' + hours + 'h ago';
    return 'updated ' + Math.floor(hours / 24) + 'd ago';
  }
  function client() {
    if (sb) return sb;
    try {
      if (global.ApaSession && typeof global.ApaSession.client === 'function') {
        sb = global.ApaSession.client();
      }
      if (!sb && global.__APA_SB__) sb = global.__APA_SB__;
      if (!sb && global.supabase && global.supabase.createClient) {
        sb = global.supabase.createClient(SB_URL, SB_KEY);
      }
    } catch (_error) {}
    return sb;
  }

  function fromRow(row) {
    return {
      videoId: row.videoId || row.video_id,
      rank: num(row.rank),
      previousRank: row.previousRank == null
        ? (row.previous_rank == null ? null : num(row.previous_rank))
        : num(row.previousRank),
      title: row.title || 'Untitled',
      artist: row.artist || 'Unknown artist',
      thumb: row.thumb || row.thumbnail_url || '',
      published: row.published || row.published_at || null,
      durationSeconds: row.durationSeconds || row.duration_seconds || null,
      views: num(row.views),
      likes: num(row.likes),
      comments: num(row.comments),
      viewsDelta: num(row.viewsDelta || row.views_delta),
      trendScore: Number(row.trendScore || row.trend_score || 0),
      format: row.format || 'track',
      refreshedAt: row.refreshedAt || row.refreshed_at || null
    };
  }

  function fetchWithTimeout(url, ms) {
    var ctrl = 'AbortController' in global ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, ms) : null;
    return fetch(url, ctrl ? { signal: ctrl.signal } : {}).finally(function () {
      if (timer) clearTimeout(timer);
    });
  }

  function directFallback() {
    var c = client();
    if (!c) return Promise.reject(new Error('chart client unavailable'));
    return Promise.all([
      c.from('music_chart_public').select('*').eq('market', 'KE').order('rank'),
      c.from('music_chart_meta').select('*').eq('market', 'KE').maybeSingle()
    ]).then(function (rows) {
      if (rows[0].error) throw rows[0].error;
      return { tracks: rows[0].data || [], meta: rows[1].data || null, stale: true };
    });
  }

  function load() {
    if (state.loading) return Promise.resolve();
    state.loading = true;
    return fetchWithTimeout(CHART_URL, 18000).then(function (response) {
      if (!response.ok) throw new Error('chart request failed');
      return response.json();
    }).catch(function () {
      return directFallback();
    }).then(function (payload) {
      state.tracks = (payload.tracks || []).map(fromRow)
        .filter(function (track) { return track.videoId && track.rank; })
        .sort(function (a, b) { return a.rank - b.rank; });
      state.meta = payload.meta || null;
      state.stale = !!payload.stale;
      render();
      rerenderEventMixes();
      try {
        document.dispatchEvent(new CustomEvent('cabana:pulse', { detail: getState() }));
      } catch (_error) {}
    }).catch(function () {
      renderError();
    }).finally(function () {
      state.loading = false;
    });
  }

  function formatName(format) {
    return { track: 'Tracks', dj_mix: 'DJ mixes', roots: 'Roots', live: 'Live sets' }[format] || 'Tracks';
  }
  function filtered() {
    if (state.filter === 'all') return state.tracks;
    return state.tracks.filter(function (track) { return track.format === state.filter; });
  }
  function movement(track) {
    if (track.previousRank == null) return '<span class="cbp-move cbp-new">NEW</span>';
    var delta = track.previousRank - track.rank;
    if (delta > 0) return '<span class="cbp-move up">↑ ' + delta + '</span>';
    if (delta < 0) return '<span class="cbp-move down">↓ ' + Math.abs(delta) + '</span>';
    return '<span class="cbp-move">—</span>';
  }

  function renderFilters() {
    var host = el('cbp-filters');
    if (!host) return;
    var formats = ['all', 'track', 'dj_mix', 'roots', 'live'];
    host.innerHTML = formats.map(function (format) {
      var count = format === 'all' ? state.tracks.length : state.tracks.filter(function (t) {
        return t.format === format;
      }).length;
      if (format !== 'all' && !count) return '';
      var label = format === 'all' ? 'Hot now' : formatName(format);
      return '<button class="cbp-filter" type="button" data-cbp-filter="' + format + '" aria-pressed="' +
        (state.filter === format ? 'true' : 'false') + '">' + label + '<span class="n">' + count + '</span></button>';
    }).join('');
    Array.prototype.forEach.call(host.querySelectorAll('[data-cbp-filter]'), function (button) {
      button.addEventListener('click', function () {
        state.filter = button.getAttribute('data-cbp-filter') || 'all';
        renderFilters(); renderChart();
      });
    });
  }

  function renderHero(track) {
    var host = el('cbp-feature');
    if (!host) return;
    if (!track) { host.innerHTML = '<div class="cbp-empty">No tracks in this lane yet.</div>'; return; }
    host.innerHTML = '<button class="cbp-hero" type="button" data-cbp-play="' + esc(track.videoId) + '" aria-label="Play ' + esc(track.title) + '">' +
      (track.thumb ? '<img class="cbp-hero-art" src="' + esc(track.thumb) + '" alt="" decoding="async"/>' : '') +
      '<span class="cbp-hero-shade"></span>' +
      '<span class="cbp-hero-copy">' +
        '<span class="cbp-rank"><b>' + track.rank + '</b>#' + track.rank + ' in Kenya right now</span>' +
        '<span class="cbp-hero-title">' + esc(track.title) + '</span>' +
        '<span class="cbp-hero-artist">' + esc(track.artist) + '</span>' +
        '<span class="cbp-stats">' +
          '<span class="cbp-stat"><b>▶ ' + compact(track.views) + '</b> views</span>' +
          '<span class="cbp-stat">♥ ' + compact(track.likes) + '</span>' +
          (track.viewsDelta ? '<span class="cbp-stat"><b>+' + compact(track.viewsDelta) + '</b> since last chart</span>' : '') +
        '</span>' +
      '</span>' +
      '<span class="cbp-play"><i>▶</i> Play now</span>' +
    '</button>';
    wirePlayers(host);
  }

  function card(track) {
    return '<button class="cbp-card" type="button" data-cbp-play="' + esc(track.videoId) + '" aria-label="Play ' + esc(track.title) + '">' +
      '<span class="cbp-card-art">' +
        (track.thumb ? '<img src="' + esc(track.thumb) + '" alt="" loading="lazy" decoding="async"/>' : '') +
        '<span>' + track.rank + '</span>' +
      '</span>' +
      '<span style="min-width:0">' +
        '<span class="cbp-card-title">' + esc(track.title) + '</span>' +
        '<span class="cbp-card-artist">' + esc(track.artist) + '</span>' +
        '<span class="cbp-card-foot">▶ ' + compact(track.views) + movement(track) + '</span>' +
      '</span>' +
    '</button>';
  }

  function renderChart() {
    var tracks = filtered();
    renderHero(tracks[0]);
    var rail = el('cbp-trackrail');
    if (!rail) return;
    rail.innerHTML = tracks.slice(1, 13).map(card).join('');
    if (tracks.length === 1) rail.innerHTML = card(tracks[0]);
    wirePlayers(rail);
  }

  function render() {
    renderFilters();
    renderChart();
    var fresh = el('cbp-fresh');
    if (fresh) {
      var stamp = state.meta && state.meta.last_refreshed_at;
      fresh.textContent = (state.stale ? 'Cached safely · ' : '● Live · ') + ago(stamp);
      fresh.setAttribute('data-live', state.stale ? '0' : '1');
    }
    var source = el('cbp-source');
    if (source) {
      var direct = state.meta && state.meta.source === 'youtube_most_popular';
      source.innerHTML = (direct ? 'YouTube mostPopular' : 'YouTube-derived Cabana chart') +
        ' · Music · Region KE <span>Cabana adds context, not invented numbers.</span>';
    }
  }

  function renderLoading() {
    var feature = el('cbp-feature'), rail = el('cbp-trackrail');
    if (feature) feature.innerHTML = '<div class="cbp-skeleton"></div>';
    if (rail) rail.innerHTML = '<div class="cbp-skeleton"></div><div class="cbp-skeleton"></div><div class="cbp-skeleton"></div>';
  }
  function renderError() {
    var feature = el('cbp-feature'), rail = el('cbp-trackrail'), fresh = el('cbp-fresh');
    if (feature) feature.innerHTML = '<div class="cbp-empty"><div><b>The Pulse is taking a breath.</b><br/>Events still work normally. The chart will reconnect automatically.</div></div>';
    if (rail) rail.innerHTML = '';
    if (fresh) { fresh.textContent = 'Reconnecting…'; fresh.setAttribute('data-live', '0'); }
  }

  function byVideo(id) {
    return state.tracks.filter(function (track) { return String(track.videoId) === String(id); })[0] || null;
  }
  function wirePlayers(host) {
    Array.prototype.forEach.call(host.querySelectorAll('[data-cbp-play]'), function (button) {
      button.addEventListener('click', function () { openPlayer(byVideo(button.getAttribute('data-cbp-play'))); });
    });
  }

  function playerHost() {
    var host = el('cbp-player');
    if (host) return host;
    host = document.createElement('div');
    host.className = 'cbp-player';
    host.id = 'cbp-player';
    host.setAttribute('role', 'dialog');
    host.setAttribute('aria-modal', 'true');
    host.setAttribute('aria-label', 'Music player');
    host.addEventListener('click', function (event) { if (event.target === host) closePlayer(); });
    document.body.appendChild(host);
    return host;
  }
  function openPlayer(track) {
    if (!track) return;
    lastFocus = document.activeElement;
    var host = playerHost();
    host.innerHTML = '<div class="cbp-player-card">' +
      '<div class="cbp-player-video">' +
        '<iframe title="' + esc(track.title) + '" src="https://www.youtube-nocookie.com/embed/' + esc(track.videoId) +
          '?autoplay=1&amp;rel=0&amp;playsinline=1" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>' +
        '<button class="cbp-player-close" type="button" aria-label="Close player">×</button>' +
      '</div>' +
      '<div class="cbp-player-copy"><div><div class="cbp-player-title">' + esc(track.title) + '</div>' +
        '<div class="cbp-player-artist">' + esc(track.artist) + ' · ' + compact(track.views) + ' views</div></div>' +
        '<div class="cbp-player-rank">KENYA #' + track.rank + '</div></div>' +
    '</div>';
    host.classList.add('open');
    document.body.style.overflow = 'hidden';
    host.querySelector('.cbp-player-close').addEventListener('click', closePlayer);
    host.querySelector('.cbp-player-close').focus();
  }
  function closePlayer() {
    var host = el('cbp-player');
    if (!host) return;
    host.classList.remove('open');
    host.innerHTML = '';
    document.body.style.overflow = '';
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  function normal(value) {
    return String(value || '').toLowerCase()
      .replace(/\b(official|music|vevo|tv|channel|records|entertainment)\b/g, '')
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function lineupNames(lineup) {
    return (Array.isArray(lineup) ? lineup : []).map(function (item) {
      return typeof item === 'string' ? item : (item && item.name) || '';
    }).map(normal).filter(function (name) { return name.length >= 4; });
  }
  function matches(lineup, max) {
    var names = lineupNames(lineup);
    if (!names.length) return [];
    return state.tracks.filter(function (track) {
      var artist = normal(track.artist), title = normal(track.title);
      return names.some(function (name) {
        return artist.indexOf(name) !== -1 || name.indexOf(artist) !== -1 || title.indexOf(name) !== -1;
      });
    }).slice(0, max || 3);
  }
  function renderEventMix(host, lineup, options) {
    if (!host) return;
    host.__cbpLineup = Array.isArray(lineup) ? lineup : [];
    host.__cbpOptions = options || {};
    host.setAttribute('data-cbp-event-mix', '1');
    paintEventMix(host);
  }
  function paintEventMix(host) {
    var lineup = host.__cbpLineup || [];
    var options = host.__cbpOptions || {};
    var found = matches(lineup, 3);
    var exact = found.length > 0;
    if (!found.length && ['music', 'festival', 'nightlife'].indexOf(options.category) !== -1) {
      found = state.tracks.slice(0, 2);
    }
    if (!found.length) { host.innerHTML = ''; return; }

    host.className = 'ev-sec cbp-event-mix';
    host.innerHTML = '<div class="ev-sec-h">' + (exact ? 'Listen to the line-up' : 'Warm up with Cabana Pulse') + '</div>' +
      '<div class="cbp-event-mix-list">' + found.map(function (track) {
        return '<button class="cbp-event-track" type="button" data-cbp-play="' + esc(track.videoId) + '">' +
          (track.thumb ? '<img src="' + esc(track.thumb) + '" alt="" loading="lazy"/>' : '<span></span>') +
          '<span><b>' + esc(track.title) + '</b><span>' + esc(track.artist) + ' · Kenya #' + track.rank + '</span></span>' +
          '<i>▶</i></button>';
      }).join('') + '</div>' +
      '<div class="cbp-event-note">Live chart positions can move as YouTube refreshes.</div>';
    wirePlayers(host);
  }
  function rerenderEventMixes() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-cbp-event-mix]'), paintEventMix);
  }

  function subscribe() {
    var c = client();
    if (!c || !c.channel || channel) return;
    try {
      channel = c.channel('cabana-pulse-ke')
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'music_chart_tracks', filter: 'market=eq.KE'
        }, function () {
          clearTimeout(reloadTimer);
          reloadTimer = setTimeout(load, 900);
        }).subscribe();
    } catch (_error) { channel = null; }
  }

  function getState() {
    return { tracks: state.tracks.slice(), meta: state.meta, stale: state.stale, filter: state.filter };
  }
  function start() {
    if (!el('cabana-pulse')) return;
    renderLoading();
    load();
    subscribe();
    setInterval(function () { if (!document.hidden) load(); }, 5 * 60 * 1000);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && el('cbp-player') && el('cbp-player').classList.contains('open')) closePlayer();
    });
  }

  global.CabanaPulse = {
    reload: load,
    get: getState,
    match: matches,
    open: openPlayer,
    close: closePlayer,
    renderEventMix: renderEventMix
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(window);
