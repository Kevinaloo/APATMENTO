/* ═══════════════════════════════════════════════════════════════════
   CABANA KARAOKE · the rooms and the pages
   ───────────────────────────────────────────────────────────────────
     /events/karaoke                  the lobby: sing, start a room,
                                      join with a code, who is live,
                                      open challenges, the week's stars
     /events/karaoke/sing/<video>     one song, solo: practice for free,
                                      or sing for the record
     /events/karaoke/room/<CODE>      a room, two ways:
                                        online   every friend plays the
                                                 track on their own
                                                 device, a beat behind
                                                 the singer, and hears
                                                 the singer's voice on
                                                 that beat
                                        screen   one big screen plays
                                                 the track; phones are
                                                 the microphones and
                                                 score their singer
                                      public rooms can be tuned into
                                      by anyone
     /events/karaoke/p/<id>           a replay: the track, the singer's
                                      own voice, the words they hit
     /events/karaoke/c/<id>           a challenge or a battle, and the
                                      crowd's vote
     /events/karaoke/studio/<video>   the lyric studio: paste the words,
                                      tap them in time, send them in
     /events/karaoke/me               everything you have sung

   Short links: /k/<CODE> is a room (for a QR code or a text message).
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var L = global.CabanaLive;
  if (!L || !L.karaoke) return;
  var KK = L.karaoke, u = L.u, esc = u.esc, ic = L.ic, kic = KK.ic, doc = global.document;
  var K = global.CabanaKaraokeLyrics, KA = global.CabanaKaraokeAudio, V = global.CabanaVisuals;
  var rpc = KK.rpc;
  var views = KK.views = {};
  var REACTIONS = ['🔥', '🙌', '💃', '❤️', '🎉', '🥁', '🎤', '👑'];
  KK.REACTIONS = REACTIONS;
  var ORIGIN = 'https://cabana.africa';

  /* ── a QR code, drawn here ────────────────────────────────────────
     Byte mode, error correction M, versions 1–10 (up to 213 bytes):
     enough for any room link. No library, nothing fetched. */
  var QR = (function () {
    var EC = { /* version: [ec per block, g1 blocks, g1 data, g2 blocks, g2 data] */
      1: [10, 1, 16, 0, 0], 2: [16, 1, 28, 0, 0], 3: [26, 1, 44, 0, 0], 4: [18, 2, 32, 0, 0], 5: [24, 2, 43, 0, 0],
      6: [16, 4, 27, 0, 0], 7: [18, 4, 31, 0, 0], 8: [22, 2, 38, 2, 39], 9: [22, 3, 36, 2, 37], 10: [26, 4, 43, 1, 44]
    };
    var ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50] };
    var EXP = new Array(512), LOG = new Array(256);
    (function () { var x = 1; for (var i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11D; } for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
    function mul(a, b) { return a && b ? EXP[LOG[a] + LOG[b]] : 0; }
    function gen(n) {
      var g = [1];
      for (var i = 0; i < n; i++) {
        var ng = new Array(g.length + 1).fill(0);
        for (var j = 0; j < g.length; j++) { ng[j] ^= g[j]; ng[j + 1] ^= mul(g[j], EXP[i]); }
        g = ng;
      }
      return g;
    }
    function rs(data, n) {
      var g = gen(n), res = data.concat(new Array(n).fill(0));
      for (var i = 0; i < data.length; i++) {
        var c = res[i];
        if (c) for (var j = 0; j < g.length; j++) res[i + j] ^= mul(g[j], c);
      }
      return res.slice(data.length);
    }
    function utf8(s) {
      var out = [];
      s = unescape(encodeURIComponent(s));
      for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
      return out;
    }
    function bch(value, poly) {
      var msb = function (x) { var n = 0; while (x) { n++; x >>>= 1; } return n; };
      var d = value << (msb(poly) - 1);
      while (msb(d) >= msb(poly)) d ^= poly << (msb(d) - msb(poly));
      return (value << (msb(poly) - 1)) | d;
    }
    function encode(text) {
      var bytes = utf8(text), v, cap;
      for (v = 1; v <= 10; v++) {
        var e = EC[v];
        cap = e[1] * e[2] + e[3] * e[4];
        var countBits = v < 10 ? 8 : 16;
        if (4 + countBits + bytes.length * 8 <= cap * 8) break;
      }
      if (v > 10) return null;
      var ec = EC[v], bits = [];
      function put(val, n) { for (var i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
      put(4, 4); put(bytes.length, v < 10 ? 8 : 16);
      bytes.forEach(function (b) { put(b, 8); });
      var total = cap * 8;
      for (var t = 0; t < 4 && bits.length < total; t++) bits.push(0);
      while (bits.length % 8) bits.push(0);
      var data = [];
      for (var i = 0; i < bits.length; i += 8) { var b = 0; for (var j = 0; j < 8; j++) b = (b << 1) | bits[i + j]; data.push(b); }
      for (var p = 0; data.length < cap; p++) data.push(p % 2 ? 0x11 : 0xEC);
      /* blocks, their correction, interleaved */
      var blocks = [], at = 0;
      for (i = 0; i < ec[1]; i++) { blocks.push(data.slice(at, at + ec[2])); at += ec[2]; }
      for (i = 0; i < ec[3]; i++) { blocks.push(data.slice(at, at + ec[4])); at += ec[4]; }
      var eccs = blocks.map(function (bl) { return rs(bl, ec[0]); });
      var seq = [], maxD = Math.max(ec[2], ec[4]);
      for (i = 0; i < maxD; i++) blocks.forEach(function (bl) { if (i < bl.length) seq.push(bl[i]); });
      for (i = 0; i < ec[0]; i++) eccs.forEach(function (e2) { seq.push(e2[i]); });
      return { v: v, seq: seq };
    }
    function matrix(text) {
      var enc = encode(text);
      if (!enc) return null;
      var v = enc.v, size = 17 + 4 * v;
      var m = [], fn = [];
      for (var r = 0; r < size; r++) { m.push(new Array(size).fill(0)); fn.push(new Array(size).fill(false)); }
      function set(r, c, val) { m[r][c] = val ? 1 : 0; fn[r][c] = true; }
      function finder(r0, c0) {
        for (var r = -1; r <= 7; r++) for (var c = -1; c <= 7; c++) {
          var rr = r0 + r, cc = c0 + c;
          if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
          var on = (r >= 0 && r <= 6 && (c === 0 || c === 6)) || (c >= 0 && c <= 6 && (r === 0 || r === 6)) || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          set(rr, cc, on);
        }
      }
      finder(0, 0); finder(0, size - 7); finder(size - 7, 0);
      for (var i = 8; i < size - 8; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
      var al = ALIGN[v];
      for (var a = 0; a < al.length; a++) for (var b = 0; b < al.length; b++) {
        var ar = al[a], ac = al[b], last = al.length - 1;
        if ((a === 0 && b === 0) || (a === 0 && b === last) || (a === last && b === 0)) continue;
        for (r = -2; r <= 2; r++) for (var c = -2; c <= 2; c++) set(ar + r, ac + c, Math.max(Math.abs(r), Math.abs(c)) !== 1);
      }
      set(size - 8, 8, 1);
      /* reserve format and version areas */
      for (i = 0; i < 9; i++) { if (!fn[8][i]) set(8, i, 0); if (!fn[i][8]) set(i, 8, 0); }
      for (i = 0; i < 8; i++) { if (!fn[8][size - 1 - i]) set(8, size - 1 - i, 0); if (!fn[size - 1 - i][8]) set(size - 1 - i, 8, 0); }
      if (v >= 7) for (i = 0; i < 6; i++) for (var j = 0; j < 3; j++) { set(size - 11 + j, i, 0); set(i, size - 11 + j, 0); }
      /* data, zigzag */
      var bits = [];
      enc.seq.forEach(function (byte) { for (var k = 7; k >= 0; k--) bits.push((byte >>> k) & 1); });
      var idx = 0, up = true;
      for (var col = size - 1; col > 0; col -= 2) {
        if (col === 6) col--;
        for (var n = 0; n < size; n++) {
          var row = up ? size - 1 - n : n;
          for (var d = 0; d < 2; d++) {
            var cc2 = col - d;
            if (fn[row][cc2]) continue;
            m[row][cc2] = idx < bits.length ? bits[idx] : 0;
            idx++;
          }
        }
        up = !up;
      }
      /* the mask with the lowest penalty */
      var MASKS = [
        function (r, c) { return (r + c) % 2 === 0; }, function (r) { return r % 2 === 0; }, function (r, c) { return c % 3 === 0; },
        function (r, c) { return (r + c) % 3 === 0; }, function (r, c) { return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0; },
        function (r, c) { return (r * c) % 2 + (r * c) % 3 === 0; }, function (r, c) { return ((r * c) % 2 + (r * c) % 3) % 2 === 0; },
        function (r, c) { return ((r + c) % 2 + (r * c) % 3) % 2 === 0; }
      ];
      function withMask(k) {
        var out = m.map(function (row) { return row.slice(); });
        for (var r = 0; r < size; r++) for (var c = 0; c < size; c++) if (!fn[r][c] && MASKS[k](r, c)) out[r][c] ^= 1;
        /* format: level M (00) and the mask, BCH, then the fixed XOR */
        var f = bch((0 << 3) | k, 0x537) ^ 0x5412;
        for (var i = 0; i <= 5; i++) out[i][8] = (f >>> i) & 1;
        out[7][8] = (f >>> 6) & 1; out[8][8] = (f >>> 7) & 1; out[8][7] = (f >>> 8) & 1;
        for (i = 9; i < 15; i++) out[8][14 - i] = (f >>> i) & 1;
        for (i = 0; i < 8; i++) out[8][size - 1 - i] = (f >>> i) & 1;
        for (i = 8; i < 15; i++) out[size - 15 + i][8] = (f >>> i) & 1;
        out[size - 8][8] = 1;
        if (v >= 7) {
          var vb = bch(v, 0x1F25);
          for (i = 0; i < 18; i++) {
            var bit = (vb >>> i) & 1, a2 = Math.floor(i / 3), b2 = i % 3;
            out[a2][size - 11 + b2] = bit; out[size - 11 + b2][a2] = bit;
          }
        }
        return out;
      }
      function penalty(q) {
        var p = 0, r, c, k;
        for (r = 0; r < size; r++) {
          for (var dir = 0; dir < 2; dir++) {
            var run = 1;
            for (c = 1; c < size; c++) {
              var a3 = dir ? q[c][r] : q[r][c], b3 = dir ? q[c - 1][r] : q[r][c - 1];
              if (a3 === b3) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1;
            }
          }
        }
        for (r = 0; r < size - 1; r++) for (c = 0; c < size - 1; c++) { var s = q[r][c] + q[r + 1][c] + q[r][c + 1] + q[r + 1][c + 1]; if (s === 0 || s === 4) p += 3; }
        var pat = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], pat2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
        for (r = 0; r < size; r++) for (c = 0; c <= size - 11; c++) {
          var h1 = true, h2 = true, v1 = true, v2 = true;
          for (k = 0; k < 11; k++) {
            if (q[r][c + k] !== pat[k]) h1 = false; if (q[r][c + k] !== pat2[k]) h2 = false;
            if (q[c + k][r] !== pat[k]) v1 = false; if (q[c + k][r] !== pat2[k]) v2 = false;
          }
          p += 40 * (h1 + h2 + v1 + v2);
        }
        var dark = 0; for (r = 0; r < size; r++) for (c = 0; c < size; c++) dark += q[r][c];
        p += Math.floor(Math.abs(dark * 100 / (size * size) - 50) / 5) * 10;
        return p;
      }
      var best = null, bestP = Infinity;
      for (var k = 0; k < 8; k++) { var q = withMask(k), pp = penalty(q); if (pp < bestP) { bestP = pp; best = q; } }
      return best;
    }
    function svg(text, opts) {
      var q = matrix(text);
      if (!q) return '';
      var n = q.length, quiet = 4, dim = n + quiet * 2, path = '';
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q[r][c]) path += 'M' + (c + quiet) + ' ' + (r + quiet) + 'h1v1h-1z';
      return '<svg class="' + ((opts && opts.cls) || 'kk-qr') + '" viewBox="0 0 ' + dim + ' ' + dim + '" shape-rendering="crispEdges" role="img" aria-label="QR code">' +
        '<rect width="' + dim + '" height="' + dim + '" fill="#fff" rx="2"/><path d="' + path + '" fill="#0b0912"/></svg>';
    }
    return { matrix: matrix, svg: svg };
  })();
  KK.QR = QR;

  /* ── small pieces ─────────────────────────────────────────────── */

  function signedIn() { return L.signedIn(); }
  function signIn(next, why) {
    var m = L.modal('<div class="lv-prem-mono kk-mono" style="margin:0 auto">' + kic('mic') + '</div><h2>Sign in to sing</h2><p>' + esc(why || 'Your takes, scores, rooms and challenges live on your Cabana account.') + '</p>' +
      '<div class="acts"><a class="lv-btn lv-btn-accent" href="' + esc(L.signInUrl(next || (location.pathname + location.search))) + '" rel="external">' + kic('mic') + 'Sign in</a><button class="lv-btn lv-btn-ghost" type="button" data-close>Not now</button></div>');
    return m;
  }
  function name(stage) { return (stage && (stage.name || (stage.handle ? '@' + stage.handle : ''))) || 'A singer'; }
  function avatar(stage, cls) {
    var photo = stage && u.safeUrl(stage.photo);
    var n = name(stage);
    return '<span class="kk-av ' + (cls || '') + '"' + (stage && stage.guest ? ' data-guest' : '') + '>' + (photo ? '<img src="' + esc(photo) + '" alt="" loading="lazy" onerror="this.remove()"/>' : '') + '<b>' + esc(n.replace(/^@/, '').charAt(0).toUpperCase()) + '</b></span>';
  }
  function chip(tone, text, icon) { return '<span class="kk-chip kk-chip-' + tone + '">' + (icon ? kic(icon) : '') + esc(text) + '</span>'; }
  function songChips(s) {
    var k = KK.KINDS[s.kind] || KK.KINDS.original, l = KK.LYRICS[s.lyrics_status] || KK.LYRICS.pending;
    return chip(k.tone, k.short, s.kind === 'karaoke' ? 'mic' : null) + chip(l.tone, l.short, s.lyrics_status === 'words' || s.lyrics_status === 'synced' ? 'note' : null);
  }
  function thumb(vid, q) { return u.ytThumb(vid, q || 'hqdefault'); }
  function ago(iso) { return u.ago(iso); }
  function shortLink(code) { return ORIGIN + '/k/' + code; }
  function roomHref(code) { return L.BASE + '/karaoke/room/' + encodeURIComponent(code); }
  function perfHref(id) { return L.BASE + '/karaoke/p/' + encodeURIComponent(id); }
  function chHref(id) { return L.BASE + '/karaoke/c/' + encodeURIComponent(id); }
  function singHref(vid, extra) { return L.BASE + '/karaoke/sing/' + encodeURIComponent(vid) + (extra || ''); }
  KK.href = { room: roomHref, perf: perfHref, challenge: chHref, sing: singHref, studio: function (v) { return L.BASE + '/karaoke/studio/' + encodeURIComponent(v); } };
  function reasonText(r) {
    return {
      signin: 'Sign in first.', song: 'That song is not available.', room: 'You need to be a singer in this room.', guest: 'Only the host can sing for a guest.',
      challenge: 'That challenge is closed.', not_found: 'Not found.', state: 'That already happened.', rate: 'Slow down a little and try again.',
      forbidden: 'Only the host can do that.', handle: 'That is not a Cabana username.', no_member: 'Nobody on Cabana has that username.', self: 'That is you.',
      limit: 'You have too many challenges waiting. Let one finish first.', not_scored: 'Only a scored take can do that.', closed: 'Voting has closed.',
      contestant: 'You are in this one: you cannot vote.', invalid: 'Something in the lyrics is not right: at least four lines, and times that only move forward.'
    }[r] || 'That did not work. Try again.';
  }
  KK.reasonText = reasonText;

  function songTile(s, opts) {
    opts = opts || {};
    return '<button class="kk-song" type="button" data-kk-pick="' + esc(s.video_id) + '">' +
      '<span class="kk-song-art"><img src="' + thumb(s.video_id) + '" alt="" loading="lazy" decoding="async"/>' +
        '<span class="kk-song-play">' + kic('mic') + '</span>' +
        (s.best_score != null ? '<span class="kk-song-best">' + kic('crown') + s.best_score + '</span>' : '') + '</span>' +
      '<span class="kk-song-t">' + esc(KK.songName(s)) + '</span>' +
      '<span class="kk-song-a">' + esc(KK.songArtist(s)) + '</span>' +
      '<span class="kk-song-c">' + songChips(s) + (s.sung ? '<span class="kk-song-n">' + u.compact(s.sung) + ' sung</span>' : '') + '</span>' +
      (opts.action ? '<span class="kk-song-go">' + esc(opts.action) + '</span>' : '') +
    '</button>';
  }
  function perfTile(p) {
    var s = p.song || {};
    var g = KK.gradeOf(p.score);
    return '<a class="kk-perf" href="' + perfHref(p.id) + '">' +
      '<span class="kk-perf-art"><img src="' + thumb(s.video_id || p.video_id) + '" alt="" loading="lazy" decoding="async"/><span class="kk-perf-score g-' + g.letter.replace('+', 'p') + '"><b>' + (p.score == null ? '–' : p.score) + '</b><small>' + g.letter + '</small></span></span>' +
      '<span class="kk-perf-who">' + avatar(p.stage) + '<span><b>' + esc(name(p.stage)) + '</b><small>' + esc(KK.songName(s)) + '</small></span></span>' +
      '<span class="kk-perf-meta">' + (p.cheers ? '<span>' + kic('flame') + u.compact(p.cheers) + '</span>' : '') + (p.plays ? '<span>' + ic('play') + u.compact(p.plays) + '</span>' : '') + '<span>' + esc(ago(p.created_at)) + '</span></span>' +
    '</a>';
  }
  function roomTile(r) {
    var s = r.song || {};
    return '<a class="kk-room" href="' + roomHref(r.code) + '">' +
      '<span class="kk-room-art">' + (s.video_id ? '<img src="' + thumb(s.video_id) + '" alt="" loading="lazy"/>' : '<span class="kk-room-ph">' + kic('mic') + '</span>') +
        '<span class="kk-room-live' + (r.status === 'live' ? ' is-live' : '') + '"><i></i>' + (r.status === 'live' ? 'Live' : 'Open') + '</span>' +
        '<span class="kk-room-aud">' + kic('eye') + (r.audience || 0) + '</span></span>' +
      '<span class="kk-room-t">' + esc(r.title) + '</span>' +
      '<span class="kk-room-s">' + avatar(r.host, 'sm') + esc(name(r.host)) + (s.video_id ? ' · ' + esc(KK.songName(s)) : '') + '</span>' +
    '</a>';
  }
  function rail(title, sub, items, cls, all) {
    if (!items) return '';
    return '<section class="lv-row kk-row' + (cls ? ' ' + cls : '') + '"><div class="lv-row-h"><div><h2 class="lv-row-t">' + title + '</h2>' + (sub ? '<p class="lv-row-s">' + sub + '</p>' : '') + '</div>' +
      (all ? '<a class="lv-row-all" href="' + all + '">See all' + ic('chevR', 2.4) + '</a>' : '') + '</div>' +
      '<div class="lv-rail kk-rail">' + items + '</div>' +
      '<button class="lv-rail-nav prev" type="button" aria-label="Scroll left" hidden>' + ic('chevL', 2.4) + '</button>' +
      '<button class="lv-rail-nav next" type="button" aria-label="Scroll right" hidden>' + ic('chevR', 2.4) + '</button></section>';
  }

  function quotaHTML(st) {
    st = st || KK.state || {};
    if (!st.signed_in) return '<span class="kk-quota">' + kic('sparkles') + (st.free_sessions || 5) + ' free songs a month when you sign in · practice is always free</span>';
    if (st.vip) return '<span class="kk-quota is-vip">' + kic('crown') + esc(st.vip_name || 'Karaoke VIP') + ' · unlimited</span>';
    var left = st.remaining == null ? st.free_sessions : st.remaining;
    return '<span class="kk-quota' + (left ? '' : ' is-out') + '">' + kic('mic') + '<b>' + left + '</b> of ' + (st.free_sessions || 5) + ' free songs left this month' + (left ? '' : ' · practice is still free') + '</span>';
  }
  KK.quotaHTML = quotaHTML;

  /* The paid experience, honestly: what it is, and whether it can be
     had yet. */
  KK.vip = function (reason, info) {
    var st = KK.state || {};
    var vipName = st.vip_name || 'Karaoke VIP';
    var reset = info && info.resets_at ? new Date(info.resets_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'long' }) : null;
    var price = st.price_kes ? u.money(st.price_kes) + ' a ' + (st.price_period || 'month') : null;
    var m = L.modal(
      '<div class="lv-prem-mono" style="margin:0 auto">' + kic('crown') + '</div>' +
      '<h2>' + (reason === 'quota' ? 'You have sung every free song this month' : esc(vipName)) + '</h2>' +
      '<p>' + (reason === 'quota' ? 'Your free songs come back' + (reset ? ' on ' + esc(reset) : ' next month') + '. Practice stays free and unlimited in the meantime.' : 'Everything Cabana Karaoke does, without limits.') + '</p>' +
      '<ul class="kk-vip-list"><li>' + ic('check', 2.6) + 'Unlimited songs for the record</li><li>' + ic('check', 2.6) + 'Your takes kept for good, not ' + (st.free_take_days || 30) + ' days</li>' +
        '<li>' + ic('check', 2.6) + 'Up to 30 open challenges at once</li><li>' + ic('check', 2.6) + 'The gold stage and a VIP mark on every take</li></ul>' +
      '<div class="acts">' + (price
        ? '<a class="lv-btn lv-btn-gold" href="/help" data-cbn-support>' + kic('crown') + 'Get ' + esc(vipName) + ' · ' + esc(price) + '</a>'
        : st.waitlisted ? '<button class="lv-btn lv-btn-gold" type="button" disabled>' + ic('check', 2.6) + 'You are on the list</button>'
          : '<button class="lv-btn lv-btn-gold" type="button" data-kk-wait>' + kic('crown') + 'Tell me when it opens</button>') +
        '<button class="lv-btn lv-btn-ghost" type="button" data-close>' + (reason === 'quota' ? 'Practice instead' : 'Close') + '</button></div>' +
      (price ? '' : '<small>' + esc(vipName) + ' is being priced now. Join the list and you hear first.</small>'), { gold: true });
    var w = m.querySelector('[data-kk-wait]');
    if (w) w.addEventListener('click', function () {
      if (!signedIn()) { signIn(); return; }
      w.classList.add('is-busy');
      rpc('karaoke_waitlist_join').then(function () {
        if (KK.state) KK.state.waitlisted = true;
        w.classList.remove('is-busy'); w.disabled = true; w.innerHTML = ic('check', 2.6) + 'You are on the list';
      }, function () { w.classList.remove('is-busy'); L.toast('Could not add you just now.'); });
    });
    return m;
  };

  /* ── the song picker ─────────────────────────────────────────────
     Search Cabana's catalogue and YouTube's karaoke versions, or paste
     a YouTube link. Resolves with a song row. */
  KK.pickSong = function (opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var m = L.modal(
        '<div class="kk-pick">' +
          '<h2>' + esc(opts.title || 'Pick a song') + '</h2>' +
          '<label class="lv-search kk-pick-q">' + ic('search') + '<input type="search" data-q placeholder="Song, artist, or a YouTube link" autocomplete="off" aria-label="Search songs"/></label>' +
          '<p class="kk-pick-tip">' + kic('mic') + 'Karaoke versions (no lead vocal) give the fairest score. Anything with lyrics can be sung.</p>' +
          '<div class="kk-pick-out" data-out></div>' +
        '</div>');
      m.classList.add('kk-modal-wide');
      var q = m.querySelector('[data-q]'), out = m.querySelector('[data-out]'), picked = false;
      function done(s) { if (picked) return; picked = true; L.closeModal(); resolve(s); }
      m.addEventListener('click', function (e) {
        var b = e.target.closest('[data-kk-pick]'); if (!b) return;
        var vid = b.getAttribute('data-kk-pick');
        b.classList.add('is-busy');
        KK.song(vid).then(done, function (err) { b.classList.remove('is-busy'); L.toast(err && err.code === 'video_unavailable' ? 'That video is not available.' : 'Could not open that song.'); });
      });
      var seq = 0;
      function run() {
        var v = q.value.trim();
        var id = ytFrom(v);
        if (id) { out.innerHTML = '<div class="kk-grid">' + songTile({ video_id: id, title: 'From your link', artist: 'YouTube', kind: 'original', lyrics_status: 'pending' }, { action: 'Sing this' }) + '</div>'; return; }
        if (v.length < 2) { popular(); return; }
        var my = ++seq;
        out.innerHTML = '<div class="kk-pick-busy"><span class="kk-spin"></span>Looking for “' + esc(v) + '”…</div>';
        KK.search(v).then(function (d) {
          if (my !== seq) return;
          var list = (d && d.results) || [];
          var note = d && d.unconfigured ? '<p class="kk-pick-note">YouTube search switches on when the key is added; these are songs already sung on Cabana. You can also paste a YouTube link.</p>'
            : d && d.exhausted ? '<p class="kk-pick-note">YouTube search has used today’s allowance. Songs already on Cabana still show, and links still work.</p>' : '';
          out.innerHTML = note + (list.length ? '<div class="kk-grid">' + list.map(function (s) { return songTile(s); }).join('') + '</div>'
            : '<div class="kk-pick-empty">Nothing yet for “' + esc(v) + '”. Try the artist on their own, or paste a YouTube link.</div>');
        }, function () { if (my === seq) out.innerHTML = '<div class="kk-pick-empty">Search did not answer. Try again in a moment.</div>'; });
      }
      function popular() {
        out.innerHTML = '<div class="kk-pick-busy"><span class="kk-spin"></span></div>';
        var c = L.sb();
        if (!c) { out.innerHTML = ''; return; }
        Promise.resolve(c.from('karaoke_songs').select('video_id,title,artist,track,track_artist,kind,lyrics_status,sung,best_score').eq('hidden', false)
          .in('lyrics_status', ['words', 'synced', 'plain']).order('sung', { ascending: false }).limit(18)).then(function (r) {
          var list = (r && r.data) || [];
          out.innerHTML = list.length ? '<h3 class="kk-pick-h">Sung most on Cabana</h3><div class="kk-grid">' + list.map(function (s) { return songTile(s); }).join('') + '</div>'
            : '<div class="kk-pick-empty">Search for any song to start the catalogue.</div>';
        }, function () { out.innerHTML = ''; });
      }
      q.addEventListener('input', u.debounce(run, 320));
      q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); run(); } });
      setTimeout(function () { q.focus(); }, 80);
      popular();
    });
  };
  function ytFrom(v) {
    v = String(v || '').trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(v)) return null;
    var m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(v);
    return m ? m[1] : null;
  }
  KK.ytFrom = ytFrom;

  /* Start and join. */
  KK.startRoom = function () {
    if (!signedIn()) { signIn(L.BASE + '/karaoke?start=room', 'Rooms belong to your Cabana account, so your friends know who invited them.'); return; }
    var m = L.modal(
      '<div class="kk-form"><h2>Start a room</h2>' +
        '<label class="kk-field"><span>Name it</span><input data-f="title" maxlength="60" placeholder="Friday night at mine" value="Karaoke night"/></label>' +
        '<div class="kk-field"><span>Where is everyone?</span><div class="kk-seg" data-f="setup">' +
          '<button type="button" data-v="screen" aria-pressed="true">' + kic('tv') + '<b>Same room</b><small>One big screen plays it. Phones are the microphones.</small></button>' +
          '<button type="button" data-v="online" aria-pressed="false">' + kic('globe') + '<b>Apart</b><small>Everyone plays it on their own device and hears the singer live.</small></button></div></div>' +
        '<div class="kk-field"><span>Who can come?</span><div class="kk-seg is-2" data-f="vis">' +
          '<button type="button" data-v="private" aria-pressed="true">' + kic('lock') + '<b>Friends</b><small>By invitation or the room code.</small></button>' +
          '<button type="button" data-v="public" aria-pressed="false">' + kic('eye') + '<b>Everyone</b><small>Anyone on Cabana can tune in and watch.</small></button></div></div>' +
        '<div class="acts"><button class="lv-btn lv-btn-accent" type="button" data-f="go">' + kic('mic') + 'Open the room</button></div></div>');
    m.classList.add('kk-modal-wide');
    m.addEventListener('click', function (e) {
      var b = e.target.closest('.kk-seg button');
      if (b) { Array.prototype.forEach.call(b.parentNode.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); }); return; }
      var go = e.target.closest('[data-f="go"]');
      if (!go) return;
      var title = m.querySelector('[data-f="title"]').value;
      var setup = m.querySelector('[data-f="setup"] [aria-pressed="true"]').getAttribute('data-v');
      var vis = m.querySelector('[data-f="vis"] [aria-pressed="true"]').getAttribute('data-v');
      go.classList.add('is-busy');
      rpc('karaoke_room_create', { p_title: title, p_setup: setup, p_visibility: vis }).then(function (room) {
        L.closeModal();
        if (setup === 'screen') L.store.sset('kk-screen:' + room.id, '1');
        L.go(roomHref(room.code));
      }, function (err) {
        go.classList.remove('is-busy');
        L.toast(/too_many_rooms/.test(err && err.message) ? 'You have opened a lot of rooms today. Use one you have.' : 'The room could not open. Try again.');
      });
    });
  };
  KK.joinRoom = function () {
    var m = L.modal('<div class="kk-form"><h2>Join a room</h2><p>Type the six-letter code on the big screen, or the one your friend sent.</p>' +
      '<input class="kk-code-in" data-f="code" maxlength="7" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABC234" aria-label="Room code"/>' +
      '<div class="acts"><button class="lv-btn lv-btn-accent" type="button" data-f="go">' + ic('arrowR') + 'Join</button></div></div>');
    var inp = m.querySelector('[data-f="code"]');
    function go() {
      var code = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) { inp.classList.add('is-bad'); L.toast('Room codes are six letters and numbers.'); return; }
      L.closeModal(); L.go(roomHref(code));
    }
    inp.addEventListener('input', function () { inp.classList.remove('is-bad'); inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    m.querySelector('[data-f="go"]').addEventListener('click', go);
    setTimeout(function () { inp.focus(); }, 60);
  };

  /* A full-screen layer on <body>, like the party room: the view is its
     own stacking context and would sit under the top bar. */
  function shell(cls) {
    var stale = doc.querySelector('body > .kk-shell'); if (stale) stale.remove();
    var el = doc.createElement('div');
    el.className = 'kk-shell ' + (cls || '');
    doc.body.appendChild(el);
    doc.documentElement.classList.add('lv-lock', 'kk-on');
    /* the site's own invitations wait until the song is over */
    if (!global.__cabanaOverlay) global.__cabanaOverlay = 'karaoke';
    if (L.music && L.music.isPlaying()) L.music.pause();
    requestAnimationFrame(function () { el.classList.add('is-on'); });
    el.close = function () {
      el.classList.remove('is-on');
      if (!doc.querySelector('body > .kk-shell.is-on')) {
        doc.documentElement.classList.remove('lv-lock', 'kk-on');
        if (global.__cabanaOverlay === 'karaoke') global.__cabanaOverlay = null;
      }
      setTimeout(function () { el.remove(); }, 350);
    };
    return el;
  }
  KK.shell = shell;

  function floater(layer, emoji, mine) {
    if (!layer || layer.childElementCount > 40) return;
    var f = doc.createElement('span');
    f.className = 'lv-floater';
    f.textContent = emoji;
    f.style.left = (mine ? 58 + Math.random() * 30 : 8 + Math.random() * 84) + '%';
    f.style.setProperty('--dx', (Math.random() * 120 - 60).toFixed(0) + 'px');
    f.style.setProperty('--rot', (Math.random() * 50 - 25).toFixed(0) + 'deg');
    f.style.fontSize = (mine ? 38 : 26 + Math.random() * 12).toFixed(0) + 'px';
    layer.appendChild(f);
    setTimeout(function () { f.remove(); }, 2900);
  }
  KK.floater = floater;

  /* ══ THE LOBBY ═════════════════════════════════════════════════ */

  views.lobby = function (ctx) {
    L.setMeta('Karaoke', 'Cabana Karaoke: sing any song with timed lyrics, get scored by an AI judge that actually listens, sing with friends in the same room or across the country, and battle for the crowd’s vote.');
    var D = { rooms: null, leaders: null, songs: null, challenges: null, fresh: null, invites: null };
    var vis = null;
    ctx.el.innerHTML =
      '<section class="kk-hero">' +
        '<div class="kk-hero-bg" data-hero-bg></div>' +
        '<div class="kk-hero-in">' +
          '<div class="kk-kicker"><i class="kk-live-dot"></i>Cabana Karaoke</div>' +
          '<h1 class="kk-h1" data-h1><span class="w">Sing&nbsp;it.</span> <span class="w">Battle&nbsp;it.</span> <em class="w">Go&nbsp;live.</em></h1>' +
          '<p class="kk-hero-p" data-p>Real lyrics that light up as you sing them, scores checked by an AI judge that listens to every word, rooms for friends near and far, and battles the whole of Cabana can vote on.</p>' +
          '<div class="kk-hero-acts">' +
            '<button class="lv-btn lv-btn-accent kk-btn-big" type="button" data-kk="sing">' + kic('mic') + 'Sing a song</button>' +
            '<button class="lv-btn lv-btn-glass" type="button" data-kk="room">' + kic('users') + 'Start a room</button>' +
            '<button class="lv-btn lv-btn-ghost" type="button" data-kk="join">' + kic('qr') + 'Join with a code</button>' +
          '</div>' +
          '<div class="kk-hero-q" data-quota>' + quotaHTML() + '</div>' +
        '</div>' +
        '<div class="kk-hero-mic" aria-hidden="true">' + micArt() + '</div>' +
      '</section>' +
      '<div class="kk-rows" data-rows>' + skeletonRows() + '</div>';
    if (V && !u.reduced()) {
      vis = V.create(ctx.el.querySelector('[data-hero-bg]'), { bpm: 104, scene: 0, calm: 0.25, scale: 0.5 });
      vis.setColors(['#FF4FD8', '#7B61FF', '#FFD978']);
    }
    function paint() {
      var st = KK.state || {};
      var q = ctx.el.querySelector('[data-quota]'); if (q) q.innerHTML = quotaHTML(st);
      if (st.banner_text) { var p = ctx.el.querySelector('[data-p]'); if (p) p.textContent = st.banner_text; }
      var html = '';
      if (D.invites && D.invites.length) html += '<section class="kk-invites">' + D.invites.map(function (i) {
        return '<div class="kk-invite">' + avatar(i.from) + '<div><b>' + esc(name(i.from)) + '</b> invited you to <b>' + esc(i.room.title) + '</b><small>' + (i.room.setup === 'screen' ? 'Same room, big screen' : 'Online') + ' · ' + esc(ago(i.created_at)) + '</small></div>' +
          '<button class="lv-btn lv-btn-accent lv-btn-sm" type="button" data-inv="' + esc(i.id) + '" data-yes="1">Join</button><button class="lv-btn lv-btn-ghost lv-btn-sm" type="button" data-inv="' + esc(i.id) + '">Not now</button></div>';
      }).join('') + '</section>';
      if (D.rooms && D.rooms.length) html += rail('Live now ' + UI().chip('lv-chip-live', 'Live'), 'Public rooms you can tune into', D.rooms.map(roomTile).join(''), 'kk-rooms');
      var chs = (D.challenges || []);
      if (chs.length) html += rail('Challenges ' + '<span class="kk-chip kk-chip-gold">' + kic('swords') + chs.length + '</span>', 'Open sing-offs anyone can answer, and battles waiting for your vote', chs.map(challengeTile).join(''), 'kk-chs');
      if (D.songs && D.songs.length) html += '<section class="lv-row kk-row"><div class="lv-row-h"><div><h2 class="lv-row-t">Sing these</h2><p class="lv-row-s">The songs Cabana sings most, with timed lyrics</p></div><button class="lv-row-all kk-link" type="button" data-kk="sing">Search every song' + ic('chevR', 2.4) + '</button></div>' +
        '<div class="kk-grid kk-grid-lobby">' + D.songs.map(function (s) { return songTile(s); }).join('') + '</div></section>';
      else if (D.songs) html += '<section class="kk-first"><div>' + kic('sparkles') + '</div><h3>Be the first voice here</h3><p>Search any song, pick the karaoke version, and your take opens Cabana’s stage.</p><button class="lv-btn lv-btn-accent" type="button" data-kk="sing">' + kic('mic') + 'Find a song</button></section>';
      if (D.leaders && ((D.leaders.singers || []).length || (D.leaders.performances || []).length)) html += leadersHTML(D.leaders);
      if (D.fresh && D.fresh.length) html += rail('Fresh on the stage', 'Public takes, newest first', D.fresh.map(perfTile).join(''), 'kk-fresh');
      html += howHTML();
      html += vipBand(st);
      html += studioBand();
      ctx.el.querySelector('[data-rows]').innerHTML = html;
      L.ui.wireRails(ctx.el);
    }
    function load() {
      var c = L.sb();
      var jobs = [
        KK.loadState(),
        rpc('karaoke_rooms_live').then(function (r) { D.rooms = r || []; }, function () { D.rooms = []; }),
        rpc('karaoke_leaders', { p_days: 7 }).then(function (r) { D.leaders = r; }, function () { D.leaders = null; }),
        c ? Promise.resolve(c.from('karaoke_songs').select('video_id,title,artist,track,track_artist,kind,lyrics_status,sung,best_score').eq('hidden', false).in('lyrics_status', ['words', 'synced']).order('sung', { ascending: false }).order('updated_at', { ascending: false }).limit(12)).then(function (r) { D.songs = (r && r.data) || []; }, function () { D.songs = []; }) : null,
        c ? Promise.resolve(c.from('karaoke_challenges').select('id,kind,video_id,status,open,is_public,a_stage,b_stage,votes_a,votes_b,voting_ends_at,expires_at,message,created_at').or('and(open.eq.true,status.eq.waiting),and(is_public.eq.true,status.eq.voting)').order('created_at', { ascending: false }).limit(16)).then(function (r) { D.challenges = (r && r.data) || []; }, function () { D.challenges = []; }) : null,
        c ? Promise.resolve(c.from('karaoke_performances').select('id,video_id,score,grade,stage,cheers,plays,created_at').eq('visibility', 'public').eq('status', 'scored').order('created_at', { ascending: false }).limit(16)).then(function (r) {
          D.fresh = (r && r.data) || [];
          return attachSongs(D.fresh);
        }, function () { D.fresh = []; }) : null,
        signedIn() ? rpc('karaoke_invites_mine').then(function (r) { D.invites = r || []; }, function () { D.invites = []; }) : null
      ];
      return Promise.all(jobs).then(function () { if (ctx.alive()) paint(); });
    }
    ctx.el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-kk]');
      if (b) {
        var k = b.getAttribute('data-kk');
        if (k === 'sing') KK.pickSong({ title: 'What are you singing?' }).then(function (s) { L.go(singHref(s.video_id)); });
        else if (k === 'room') KK.startRoom();
        else if (k === 'join') KK.joinRoom();
        else if (k === 'vip') KK.vip('info');
        return;
      }
      var p = e.target.closest('[data-kk-pick]');
      if (p) { e.preventDefault(); L.go(singHref(p.getAttribute('data-kk-pick'))); return; }
      var inv = e.target.closest('[data-inv]');
      if (inv) {
        var yes = inv.getAttribute('data-yes') === '1';
        rpc('karaoke_invite_answer', { p_invite: inv.getAttribute('data-inv'), p_accept: yes }).then(function (r) {
          if (yes && r && r.code) L.go(roomHref(r.code));
          else { D.invites = (D.invites || []).filter(function (x) { return x.id !== inv.getAttribute('data-inv'); }); paint(); }
        }, function () { L.toast('That invitation could not be answered.'); });
      }
    });
    load();
    /* A way in from elsewhere (the home band, a sign-in round trip)
       can ask for the first step straight away. */
    var start = ctx.query.get('start');
    if (start) {
      history.replaceState({ lv: 1 }, '', location.pathname);
      setTimeout(function () {
        if (!ctx.alive()) return;
        if (start === 'room') KK.startRoom();
        else if (start === 'join') KK.joinRoom();
        else if (start === 'sing') KK.pickSong({ title: 'What are you singing?' }).then(function (s) { L.go(singHref(s.video_id)); });
      }, 260);
    }
    var off = L.on('karaoke-state', function () { if (ctx.alive()) { var q = ctx.el.querySelector('[data-quota]'); if (q) q.innerHTML = quotaHTML(); } });
    var t = setInterval(function () { if (!doc.hidden) rpc('karaoke_rooms_live').then(function (r) { D.rooms = r || []; if (ctx.alive()) paint(); }, function () {}); }, 45000);
    ctx.onLeave(function () { off(); clearInterval(t); if (vis) vis.destroy(); });
  };
  function UI() { return L.ui; }

  function attachSongs(list) {
    var ids = []; (list || []).forEach(function (p) { if (p.video_id && ids.indexOf(p.video_id) < 0) ids.push(p.video_id); });
    var c = L.sb();
    if (!ids.length || !c) return Promise.resolve(list);
    return Promise.resolve(c.from('karaoke_songs').select('video_id,title,artist,track,track_artist,kind').in('video_id', ids)).then(function (r) {
      var by = {}; ((r && r.data) || []).forEach(function (s) { by[s.video_id] = s; });
      list.forEach(function (p) { p.song = by[p.video_id] || { video_id: p.video_id }; });
      return list;
    }, function () { return list; });
  }
  KK.attachSongs = attachSongs;

  function challengeTile(c) {
    var voting = c.status === 'voting';
    var ends = voting ? c.voting_ends_at : c.expires_at;
    return '<a class="kk-ch" href="' + chHref(c.id) + '">' +
      '<span class="kk-ch-art"><img src="' + thumb(c.video_id) + '" alt="" loading="lazy"/><span class="kk-ch-vs">' + avatar(c.a_stage) + '<i>VS</i>' + (c.b_stage ? avatar(c.b_stage) : '<span class="kk-av kk-av-q"><b>?</b></span>') + '</span></span>' +
      '<span class="kk-ch-t">' + (voting ? kic('flame') + 'Vote now' : kic('swords') + 'Open challenge') + '</span>' +
      '<span class="kk-ch-s">' + esc(name(c.a_stage)) + (c.b_stage ? ' vs ' + esc(name(c.b_stage)) : ' · anyone can answer') + '</span>' +
      (ends ? '<span class="kk-ch-cd" data-cd="' + esc(ends) + '"><span>' + esc(L.timeTo(ends).label) + '</span></span>' : '') +
    '</a>';
  }
  function leadersHTML(d) {
    var singers = d.singers || [], perfs = d.performances || [];
    var top = singers.slice(0, 3), order = [top[1], top[0], top[2]];
    return '<section class="lv-row kk-row kk-stars"><div class="lv-row-h"><div><h2 class="lv-row-t">' + kic('trophy') + ' This week’s stars</h2><p class="lv-row-s">Verified scores from public, ranked takes. Points are the sum of every score of 50 or more.</p></div></div>' +
      (top.length ? '<div class="kk-podium">' + order.map(function (x, i) {
        if (!x) return '<div></div>';
        var place = [2, 1, 3][i];
        return '<div class="kk-plinth p' + place + '">' + avatar(x.stage, 'lg') + '<b>' + esc(name(x.stage)) + '</b><small>' + x.points + ' pts · best ' + x.best + '</small><span class="kk-plinth-b">' + place + '</span></div>';
      }).join('') + '</div>' : '') +
      (perfs.length ? '<div class="lv-rail kk-rail" style="margin-top:14px">' + perfs.slice(0, 12).map(perfTile).join('') + '</div>' : '') +
    '</section>';
  }
  function howHTML() {
    var steps = [
      ['mic', 'Pick any song', 'Karaoke versions from YouTube, with lyrics timed to the word where they exist.'],
      ['note', 'Sing it', 'The words light up on the beat. Your pitch draws itself over the melody Cabana has learned from other singers.'],
      ['sparkles', 'Get judged', 'An AI judge listens to your recording: every word, your pitch, your timing and your feel.'],
      ['swords', 'Battle', 'Challenge a friend by username or throw it open. The verified score decides, and the crowd has a say.']
    ];
    return '<section class="kk-how"><h2 class="lv-row-t">How it works</h2><div class="kk-how-g">' + steps.map(function (s, i) {
      return '<div class="kk-how-s"><span class="kk-how-n">' + (i + 1) + '</span><span class="kk-how-ic">' + kic(s[0]) + '</span><b>' + s[1] + '</b><p>' + s[2] + '</p></div>';
    }).join('') + '</div></section>';
  }
  function vipBand(st) {
    return '<section class="lv-prem kk-vip"><div class="lv-prem-mono">' + kic('crown') + '</div>' +
      '<div><div class="lv-prem-k">' + esc(st.vip_name || 'Karaoke VIP') + '</div><h2 class="lv-prem-h">' + (st.vip ? 'You have the <em>gold stage</em>' : 'Sing <em>without limits</em>') + '</h2>' +
      '<p class="lv-prem-p">' + (st.vip ? 'Unlimited songs, takes kept for good, and the VIP mark on everything you sing.' : (st.free_sessions || 5) + ' songs a month are free for every member, and practice never counts. VIP opens everything: unlimited takes, kept for good, more challenges, the gold stage.') + '</p></div>' +
      '<div class="lv-prem-cta">' + (st.vip ? '' : '<button class="lv-btn lv-btn-gold" type="button" data-kk="vip">' + kic('crown') + (st.price_kes ? 'Go VIP' : 'Get early access') + '</button><small>' + (st.price_kes ? esc(u.money(st.price_kes)) + ' / ' + esc(st.price_period || 'month') : 'Pricing announced soon') + '</small>') + '</div></section>';
  }
  function studioBand() {
    return '<section class="kk-studio-band"><div class="kk-sb-ic">' + kic('pen') + '</div><div><h2>Your song has no lyrics yet?</h2><p>Most Kenyan and East African songs have no timed lyrics anywhere. Paste the words, tap them in time while the video plays, and once the team approves them, everyone sings your version with your name on it.</p></div>' +
      '<button class="lv-btn lv-btn-glass" type="button" data-kk-studio>' + kic('pen') + 'Open the lyric studio</button></section>';
  }
  function skeletonRows() {
    return '<div class="kk-skel-row"><div class="lv-skel"></div><div class="lv-skel"></div><div class="lv-skel"></div><div class="lv-skel"></div></div>';
  }
  function micArt() {
    return '<svg viewBox="0 0 320 420"><defs>' +
      '<linearGradient id="kkm1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF3C8"/><stop offset=".45" stop-color="#F6C451"/><stop offset="1" stop-color="#9A6A12"/></linearGradient>' +
      '<linearGradient id="kkm2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF4FD8"/><stop offset="1" stop-color="#7B61FF"/></linearGradient>' +
      '<radialGradient id="kkm3" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>' +
      '<g class="kk-waves" fill="none" stroke="url(#kkm2)" stroke-linecap="round"><path d="M60 120a110 110 0 0 1 0 150" stroke-width="6"/><path d="M28 90a150 150 0 0 1 0 210" stroke-width="5" opacity=".6"/><path d="M260 120a110 110 0 0 0 0 150" stroke-width="6"/><path d="M292 90a150 150 0 0 0 0 210" stroke-width="5" opacity=".6"/></g>' +
      '<g class="kk-mic-body"><circle cx="160" cy="130" r="74" fill="url(#kkm2)"/><circle cx="160" cy="130" r="74" fill="url(#kkm3)" opacity=".35"/>' +
      '<g stroke="#fff" stroke-opacity=".35" stroke-width="3"><path d="M100 110h120M96 132h128M100 154h120M160 58v144M130 64v132M190 64v132"/></g>' +
      '<rect x="112" y="200" width="96" height="26" rx="10" fill="url(#kkm1)"/><path d="M122 226h76l-14 150a24 24 0 0 1-48 0z" fill="url(#kkm1)"/>' +
      '<rect x="146" y="250" width="28" height="40" rx="8" fill="#1a1204" opacity=".5"/></g></svg>';
  }

  /* ══ ONE SONG, SOLO ════════════════════════════════════════════ */

  views.sing = function (ctx) {
    var vid = ctx.params[0];
    var challengeId = ctx.query.get('challenge');
    L.setTab('karaoke');
    var el = shell('kk-solo');
    var song = null, mic = null, stage = null, perf = null, record = true, alive = true, settings = loadSettings(), chInfo = null;
    el.innerHTML = '<div class="kk-pre is-loading"><div class="kk-spin kk-spin-lg"></div></div>';

    function loadSettings() { return L.store.get('kk-set', { headphones: false, monitor: false, reverb: 'studio' }); }
    function saveSettings() { L.store.set('kk-set', settings); }

    Promise.all([
      KK.song(vid),
      KK.loadState(),
      challengeId ? rpc('karaoke_challenge', { p_challenge: challengeId }).then(function (r) { chInfo = r && r.ok ? r : null; }, function () {}) : null
    ]).then(function (r) {
      if (!alive) return;
      song = r[0];
      L.setMeta(KK.songName(song) + ' · Karaoke', 'Sing ' + KK.songName(song) + ' by ' + KK.songArtist(song) + ' with timed lyrics on Cabana Karaoke.');
      if (!KK.state || !KK.state.signed_in) record = false;
      /* nothing left to record with this month: practice is the way in */
      else if (!KK.state.vip && KK.state.remaining === 0) record = false;
      pre();
    }, function (err) {
      if (!alive) return;
      el.innerHTML = '<div class="kk-pre"><div class="kk-pre-card is-err">' + kic('micOff') + '<h2>That song will not open</h2><p>' + esc(err && err.code === 'video_unavailable' ? 'The video is private, removed, or not a real YouTube video.' : 'Cabana could not reach the song desk. Try again in a moment.') + '</p>' +
        '<div class="acts"><button class="lv-btn lv-btn-accent" type="button" data-kk-other>' + ic('search') + 'Pick another song</button><a class="lv-btn lv-btn-ghost" href="' + L.BASE + '/karaoke">Back to karaoke</a></div></div></div>';
    });

    function pre() {
      var st = KK.state || {};
      var lyr = KK.LYRICS[song.lyrics_status] || KK.LYRICS.pending, kind = KK.KINDS[song.kind] || KK.KINDS.original;
      var rankable = song.kind === 'karaoke' || (st.ranked_needs_karaoke === false);
      var credit = song.lyrics && song.lyrics.credit;
      var left = st.vip ? null : (st.remaining == null ? st.free_sessions : st.remaining);
      el.innerHTML =
        '<div class="kk-pre">' +
          '<div class="kk-pre-bg" style="background-image:url(' + thumb(song.video_id, 'hqdefault') + ')"></div>' +
          '<button class="lv-round lv-round-sm kk-pre-x" type="button" data-kk-close aria-label="Back">' + ic('back') + '</button>' +
          '<div class="kk-pre-card">' +
            '<div class="kk-pre-art"><img src="' + thumb(song.video_id, 'hqdefault') + '" alt=""/>' + (song.best_score != null ? '<span class="kk-pre-best">' + kic('crown') + 'Song record ' + song.best_score + '</span>' : '') + '</div>' +
            '<div class="kk-pre-info">' +
              (chInfo ? '<div class="kk-pre-ch">' + kic('swords') + 'Answering ' + esc(name(chInfo.challenge.a_stage)) + '’s challenge: beat <b>' + (chInfo.a ? chInfo.a.score : '?') + '</b></div>' : '') +
              '<h1>' + esc(KK.songName(song)) + '</h1><div class="kk-pre-by">' + esc(KK.songArtist(song)) + '</div>' +
              '<div class="kk-pre-chips">' + songChips(song) + (song.sung ? chip('plain', u.compact(song.sung) + ' sung') : '') + '</div>' +
              '<p class="kk-pre-note">' + (song.lyrics_status === 'none' || song.lyrics_status === 'error' ? 'No lyrics for this one yet: you can freestyle it, or <a href="' + KK.href.studio(song.video_id) + '">add them in the studio</a>.'
                : song.lyrics_status === 'plain' ? 'These lyrics are not timed, so they follow your voice as you sing.' : lyr.label + '. They light up in time with the track.') +
                (credit ? ' Timed by <b>' + esc(name(credit)) + '</b>.' : song.lyrics && song.lyrics.source === 'lrclib' ? ' Lyrics from LRCLIB.' : '') +
                (!rankable ? ' <span class="kk-warn">This is not a karaoke track, so the original singer is in it too: your score is for fun, not the leaderboard.</span>' : '') + '</p>' +
              '<div class="kk-mode-pick" role="radiogroup" aria-label="How are you singing?">' +
                '<button type="button" role="radio" data-mode="record" aria-checked="' + record + '">' + kic('rec') + '<b>For the record</b><small>' + (st.signed_in ? (st.vip ? 'Recorded, judged, kept. VIP: unlimited.' : left ? 'Recorded and judged. Uses 1 of your ' + left + ' free song' + (left === 1 ? '' : 's') + ' left this month.' : 'Your free songs are used up this month. VIP sings without limits.') : 'Sign in to record, get judged and share.') + '</small></button>' +
                '<button type="button" role="radio" data-mode="practice" aria-checked="' + (!record) + '">' + kic('sparkles') + '<b>Practice</b><small>Free and unlimited. Nothing is recorded.</small></button>' +
              '</div>' +
              '<div class="kk-setup">' +
                '<label class="kk-toggle"><input type="checkbox" data-set="headphones"' + (settings.headphones ? ' checked' : '') + '/><span></span>' + kic('headphones') + 'I’m wearing headphones</label>' +
                '<label class="kk-toggle' + (settings.headphones ? '' : ' is-off') + '"><input type="checkbox" data-set="monitor"' + (settings.monitor && settings.headphones ? ' checked' : '') + (settings.headphones ? '' : ' disabled') + '/><span></span>' + kic('wave') + '<em class="kk-toggle-t">Hear myself</em>' +
                  '<select data-set="reverb"' + (settings.headphones ? '' : ' disabled') + '>' + ['studio', 'hall', 'stadium'].map(function (r) { return '<option value="' + r + '"' + (settings.reverb === r ? ' selected' : '') + '>' + r + ' reverb</option>'; }).join('') + '</select></label>' +
                '<div class="kk-level" data-level hidden><i></i><span>Say something to check your microphone</span></div>' +
              '</div>' +
              '<div class="kk-pre-acts">' +
                '<button class="lv-btn lv-btn-accent kk-btn-big" type="button" data-kk-go>' + kic('mic') + 'Start singing</button>' +
                '<button class="lv-btn lv-btn-ghost" type="button" data-kk-other>' + ic('search') + 'Another song</button>' +
              '</div>' +
              '<p class="kk-pre-fine">Your voice is recorded only when you sing for the record, and only you see it until you share it. ' + (st.signed_in && !st.vip ? 'Free takes are kept for ' + (st.free_take_days || 30) + ' days.' : '') + ' <a href="' + KK.href.studio(song.video_id) + '">Fix the lyrics</a></p>' +
            '</div>' +
          '</div>' +
        '</div>';
    }

    el.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest('[data-kk-close]')) { exit(); return; }
      if (t.closest('[data-kk-other]')) { KK.pickSong().then(function (s) { L.go(singHref(s.video_id), { replace: true }); }); return; }
      var mode = t.closest('[data-mode]');
      if (mode) {
        var want = mode.getAttribute('data-mode') === 'record';
        if (want && !(KK.state && KK.state.signed_in)) { signIn(location.pathname + location.search, 'Sign in to record your take, get it judged and share it. Practice is free without an account.'); return; }
        if (want && KK.state && !KK.state.vip && KK.state.remaining === 0) { KK.vip('quota', KK.state); return; }
        record = want;
        Array.prototype.forEach.call(el.querySelectorAll('[data-mode]'), function (b) { b.setAttribute('aria-checked', String(b === mode)); });
        return;
      }
      if (t.closest('[data-kk-go]')) { go(t.closest('[data-kk-go]')); return; }
      if (t.closest('[data-kk-studio]')) { L.go(KK.href.studio(vid)); }
    });
    el.addEventListener('change', function (e) {
      var k = e.target.getAttribute('data-set'); if (!k) return;
      if (k === 'reverb') settings.reverb = e.target.value; else settings[k] = !!e.target.checked;
      if (k === 'headphones' && !settings.headphones) settings.monitor = false;
      saveSettings();
      if (k === 'headphones') pre();
    });

    function go(btn) {
      btn.classList.add('is-busy');
      var begin = record ? rpc('karaoke_begin', { p_video: song.video_id, p_challenge: challengeId || null }).then(function (r) {
        if (!r || !r.ok) {
          if (r && r.reason === 'quota') { KK.vip('quota', r); record = false; pre(); throw Object.assign(new Error('quota'), { quiet: true }); }
          if (r && r.reason === 'signin') { signIn(); throw Object.assign(new Error('signin'), { quiet: true }); }
          throw Object.assign(new Error((r && r.reason) || 'begin'), { reason: r && r.reason });
        }
        perf = r;
        if (KK.state && r.remaining != null) KK.state.remaining = r.remaining;
      }) : Promise.resolve();
      begin.then(function () { return openMic(); }).then(function () {
        if (!alive) return;
        sing();
      }).catch(function (err) {
        btn.classList.remove('is-busy');
        if (err && err.quiet) return;
        L.toast(err && err.reason ? reasonText(err.reason) : 'Could not start. Try again.');
      });
    }
    function openMic() {
      if (mic) return Promise.resolve(mic);
      if (!KA.supported()) { L.toast('This browser has no microphone access. Singing without scoring.'); return Promise.resolve(null); }
      var m = new KA.Mic({ headphones: settings.headphones });
      return m.open().then(function () {
        mic = m;
        if (settings.headphones && settings.monitor) mic.setMonitor(true, settings.reverb);
        return mic;
      }, function (err) {
        if (perf) { rpc('karaoke_discard', { p_perf: perf.id }).catch(function () {}); perf = null; }
        record = false;
        var denied = err && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
        L.toast(denied ? 'The microphone is blocked. You can still sing along: nothing is scored.' : 'No microphone was found. Singing along without scoring.');
        return null;
      });
    }
    function sing() {
      el.innerHTML = '';
      var host = doc.createElement('div'); host.className = 'kk-stage-host'; el.appendChild(host);
      var floaters = doc.createElement('div'); floaters.className = 'lv-floaters'; el.appendChild(floaters);
      stage = new KK.Stage({
        host: host, song: song, record: !!(record && mic && perf), perf: perf, mic: mic, video: true,
        onEnd: function (out) { ended(out); },
        onLeave: function () { leaveMidway(); },
        onFail: function (msg) {
          L.toast(msg);
          if (perf) rpc('karaoke_discard', { p_perf: perf.id }).catch(function () {});
          setTimeout(function () { if (alive) { cleanupStage(); pre(); } }, 400);
        }
      });
      stage.start().catch(function () { L.toast('The stage could not start. Try again.'); });
    }
    function leaveMidway() {
      if (!stage || stage.state === 'done') { exit(); return; }
      var m = L.modal('<h2>Leave the stage?</h2><p>' + (perf ? 'This take will not be saved, and it will not count toward your free songs.' : 'The song stops here.') + '</p><div class="acts"><button class="lv-btn lv-btn-accent" type="button" data-close>Keep singing</button><button class="lv-btn lv-btn-ghost" type="button" data-yes>Leave</button></div>');
      m.querySelector('[data-yes]').addEventListener('click', function () {
        L.closeModal();
        if (perf) rpc('karaoke_discard', { p_perf: perf.id }).catch(function () {});
        perf = null;
        exit();
      });
    }
    function ended(out) {
      if (!alive) return;
      if (perf && out.take) {
        if (out.take.duration < 20) {
          rpc('karaoke_discard', { p_perf: perf.id }).catch(function () {});
          L.toast('Under twenty seconds is too short to judge. That one did not count.');
          cleanupStage(); pre();
          return;
        }
        judging(out);
      } else {
        showResults({ result: { score: out.live, parts: out.parts, verified: false }, practice: true, out: out });
      }
    }
    function judging(out) {
      var ov = doc.createElement('div');
      ov.className = 'kk-judging';
      ov.innerHTML = '<div class="kk-judging-in"><div class="kk-eq"><i></i><i></i><i></i><i></i><i></i></div><h2 data-j>Saving your take…</h2>' +
        '<ol class="kk-steps"><li data-s="upload">Saving your voice</li><li data-s="finish">Handing it to the judge</li><li data-s="judge">Listening to every word</li></ol>' +
        '<p>The judge hears the recording itself: the words, the notes, the timing.</p></div>';
      el.appendChild(ov);
      requestAnimationFrame(function () { ov.classList.add('is-on'); });
      var labels = { upload: 'Saving your take…', finish: 'Almost there…', judge: 'The judge is listening…' };
      KK.submit(perf, out.take, function (step) {
        var h = ov.querySelector('[data-j]'); if (h) h.textContent = labels[step] || '';
        Array.prototype.forEach.call(ov.querySelectorAll('[data-s]'), function (li) {
          var order = ['upload', 'finish', 'judge'], i = order.indexOf(li.getAttribute('data-s')), cur = order.indexOf(step);
          li.classList.toggle('is-done', i < cur); li.classList.toggle('is-now', i === cur);
        });
      }).then(function (res) {
        ov.remove();
        if (!alive) return;
        if (!res || res.status !== 'scored') {
          showResults({ result: { score: out.live, parts: out.parts, verified: false }, queued: true, out: out });
          return;
        }
        KK.loadState();
        showResults({ result: res, out: out });
      }, function (err) {
        ov.remove();
        if (!alive) return;
        L.toast(err && err.code === 'upload' ? 'Your take could not be saved. Check your connection.' : 'The judge could not be reached. Your take is safe and will be scored shortly.');
        showResults({ result: { score: out.live, parts: out.parts, verified: false }, queued: true, out: out });
      });
    }
    function showResults(o) {
      var host = el.querySelector('.kk-stage-host') || el;
      var box = KK.results(el, { song: song, result: o.result, live: o.out && o.out.live, practice: o.practice });
      var acts = box.querySelector('[data-r="acts"]');
      var g = KK.gradeOf(o.result.score || 0);
      var bits = [];
      if (o.queued) bits.push('<p class="kk-res-q">' + kic('sparkles') + 'The judge is busy: your verified score will be on <a href="' + perfHref(perf.id) + '">your replay</a> in a few minutes.</p>');
      if (perf && !o.practice) {
        bits.push('<div class="kk-res-row">' +
          '<a class="lv-btn lv-btn-accent" href="' + perfHref(perf.id) + '">' + ic('play') + 'Watch your replay</a>' +
          (o.result.verified ? '<button class="lv-btn lv-btn-glass" type="button" data-r-act="share">' + ic('share') + 'Share your card</button>' : '') + '</div>');
        if (o.result.verified) {
          bits.push('<div class="kk-res-pub"><span>Who can see it?</span><div class="kk-seg is-3" data-r-vis>' +
            [['private', 'lock', 'Only me'], ['link', 'link', 'Anyone with the link'], ['public', 'eye', 'Everyone']].map(function (v) { return '<button type="button" data-v="' + v[0] + '" aria-pressed="' + (v[0] === 'private') + '">' + kic(v[1]) + '<b>' + v[2] + '</b></button>'; }).join('') + '</div></div>');
          bits.push('<div class="kk-res-chal">' + kic('swords') + '<input data-r-h placeholder="@username to challenge" maxlength="30" autocomplete="off"/><button class="lv-btn lv-btn-gold lv-btn-sm" type="button" data-r-act="challenge">Challenge</button><button class="lv-btn lv-btn-ghost lv-btn-sm" type="button" data-r-act="open">Open to anyone</button></div>');
        }
      } else if (o.practice) {
        bits.push('<p class="kk-res-q">A practice score is the page’s own reading. Sing it for the record and the judge listens properly.</p>');
      }
      bits.push('<div class="kk-res-row"><button class="lv-btn lv-btn-glass" type="button" data-r-act="again">' + kic('replay') + 'Sing it again</button><button class="lv-btn lv-btn-ghost" type="button" data-r-act="other">' + ic('search') + 'Another song</button><button class="lv-btn lv-btn-ghost" type="button" data-r-act="done">Done</button></div>');
      acts.innerHTML = bits.join('');
      box.addEventListener('click', function (e) {
        var b = e.target.closest('[data-r-act]');
        var vb = e.target.closest('[data-r-vis] button');
        if (vb) {
          var v = vb.getAttribute('data-v');
          rpc('karaoke_publish', { p_perf: perf.id, p_visibility: v }).then(function (r) {
            if (!r || !r.ok) { L.toast(reasonText(r && r.reason)); return; }
            Array.prototype.forEach.call(vb.parentNode.children, function (x) { x.setAttribute('aria-pressed', String(x === vb)); });
            L.toast(v === 'public' ? 'Your take is on Cabana’s stage.' : v === 'link' ? 'Anyone with the link can watch.' : 'Only you can see it now.');
          });
          return;
        }
        if (!b) return;
        var a = b.getAttribute('data-r-act');
        if (a === 'again') L.go(singHref(song.video_id), { replace: true });
        else if (a === 'other') KK.pickSong().then(function (s) { L.go(singHref(s.video_id), { replace: true }); });
        else if (a === 'done') exit();
        else if (a === 'share') {
          var st = L.session();
          KK.shareCard({ song: KK.songName(song), artist: KK.songArtist(song), score: o.result.score, grade: g.letter, title: g.title, video: song.video_id, name: st && st.name, verified: o.result.verified, link: ORIGIN + perfHref(perf.id), url: 'cabana.africa' + perfHref(perf.id).slice(0, 34) });
        } else if (a === 'challenge' || a === 'open') {
          var handle = a === 'open' ? null : (box.querySelector('[data-r-h]').value || '').trim();
          if (a === 'challenge' && !handle) { L.toast('Type their Cabana username, or open it to anyone.'); return; }
          b.classList.add('is-busy');
          rpc('karaoke_challenge_create', { p_perf: perf.id, p_handle: handle, p_message: null }).then(function (r) {
            b.classList.remove('is-busy');
            if (!r || !r.ok) { L.toast(reasonText(r && r.reason)); return; }
            L.toast(a === 'open' ? 'Your challenge is open. Anyone can answer it.' : 'Challenge sent. They have seven days.');
            L.share('Beat my ' + KK.songName(song) + ' on Cabana Karaoke', 'I scored ' + o.result.score + '. Your turn.', ORIGIN + chHref(r.id));
          }, function () { b.classList.remove('is-busy'); L.toast('The challenge could not be sent.'); });
        }
      });
      void host;
    }
    function cleanupStage() {
      if (stage) { stage.destroy(); stage = null; }
      var host = el.querySelector('.kk-stage-host'); if (host) host.remove();
    }
    function exit() { L.back(L.BASE + '/karaoke'); }
    ctx.onLeave(function () {
      alive = false;
      if (stage && stage.state === 'live' && perf) rpc('karaoke_discard', { p_perf: perf.id }).catch(function () {});
      cleanupStage();
      if (mic) mic.close();
      el.close();
    });
  };

  /* ══ A ROOM ════════════════════════════════════════════════════ */

  views.room = function (ctx) {
    var code = String(ctx.params[0] || '').toUpperCase();
    L.setTab('karaoke');
    var R = {
      room: null, me: KK.me(), alive: true, stage: null, watch: null, mic: null,
      db: null, ch: null, crowd: null, pres: {}, anchor: null, playing: false,
      lastTick: 0, results: null, isScreen: false, busy: false, idleT: null, npKey: ''
    };
    ctx.el.innerHTML = '<div class="kk-page"><div class="kk-room-load"><span class="kk-spin kk-spin-lg"></span><p>Opening room ' + esc(code) + '…</p></div></div>';

    KK.syncClock();
    rpc('karaoke_enter', { p_code: code }).then(function (res) {
      if (!R.alive) return;
      if (!res || !res.ok) return notFound(res && res.reason, res && res.title);
      R.room = res.room;
      R.isScreen = R.room.setup === 'screen' && R.room.host_id === R.me && (L.store.sget('kk-screen:' + R.room.id) === '1' || (R.room.now_playing && R.room.now_playing.screen === KK.device));
      if (R.room.visibility === 'private' && !signedIn()) { needSignin(); return; }
      L.setMeta(R.room.title + ' · Karaoke room', 'Join ' + R.room.title + ' on Cabana Karaoke.');
      if (R.isScreen) claimScreen();
      paint();
      connect();
      react();
    }, function () { notFound('offline'); });

    function notFound(reason, title) {
      ctx.el.innerHTML = '<div class="kk-page">' + L.ui.empty('mic', reason === 'ended' ? 'That room has closed' : reason === 'offline' ? 'Cabana could not be reached' : 'No room with that code',
        reason === 'ended' ? esc(title || 'The room') + ' has finished for the night. Start one of your own.' : reason === 'offline' ? 'Check your connection and try again.' : 'Check the six letters and numbers, and try again.',
        '<button class="lv-btn lv-btn-accent" type="button" data-kk-join>' + kic('qr') + 'Try another code</button><button class="lv-btn lv-btn-ghost" type="button" data-kk-start>' + kic('users') + 'Start a room</button>') + '</div>';
    }
    function needSignin() {
      ctx.el.innerHTML = '<div class="kk-page">' + L.ui.empty('mic', R.room.title, 'This is a private room. Sign in and you are in: the code already opened the door.',
        '<a class="lv-btn lv-btn-accent" href="' + esc(L.signInUrl(location.pathname)) + '" rel="external">' + kic('mic') + 'Sign in to join</a>') + '</div>';
    }
    function isHost() { return R.room && R.room.host_id === R.me; }
    function myRole() { return R.room && R.room.role; }
    function canSing() { var r = myRole(); return r === 'host' || r === 'singer'; }
    function np() { return (R.room && R.room.now_playing) || {}; }
    function claimScreen() {
      L.store.sset('kk-screen:' + R.room.id, '1');
      var cur = np();
      if (cur.screen !== KK.device) update(Object.assign({}, cur, { screen: KK.device }));
    }
    function update(nowPlaying) {
      return rpc('karaoke_room_update', { p_room: R.room.id, p_patch: { now_playing: nowPlaying } }).then(function (room) { if (room) { R.room = room; } return room; }, function (e) { L.toast('The room did not update: ' + ((e && e.message) || 'try again')); });
    }

    /* ── realtime ── */
    function connect() {
      var c = L.sb(); if (!c || !c.channel) return;
      var id = R.room.id;
      var soon = u.debounce(refresh, 250);
      try {
        R.db = c.channel('kk-db:' + id)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'karaoke_rooms', filter: 'id=eq.' + id }, soon)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'karaoke_queue', filter: 'room_id=eq.' + id }, soon)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'karaoke_members', filter: 'room_id=eq.' + id }, soon)
          .subscribe();
      } catch (e) {}
      try {
        R.ch = c.channel('kr:' + id, { config: { private: true, broadcast: { self: false } } })
          .on('broadcast', { event: 'tick' }, function (m) { onTick(m && m.payload); })
          .on('broadcast', { event: 'v' }, function (m) { if (R.watch) R.watch.voice(m && m.payload); })
          .on('broadcast', { event: 'live' }, function (m) { if (R.watch) R.watch.live(m && m.payload); })
          .on('broadcast', { event: 'res' }, function (m) { onResult(m && m.payload); })
          .on('broadcast', { event: 'ctl' }, function (m) { onCtl(m && m.payload); })
          .subscribe();
      } catch (e) {}
      try {
        R.crowd = c.channel('kc:' + id, { config: { private: true, presence: { key: KK.device }, broadcast: { self: false } } })
          .on('presence', { event: 'sync' }, function () { R.pres = R.crowd.presenceState() || {}; paintAudience(); })
          .on('broadcast', { event: 'react' }, function (m) { var e = m && m.payload && m.payload.e; if (REACTIONS.indexOf(e) !== -1) reactFloat(e, false); })
          .subscribe(function (status) {
            if (status !== 'SUBSCRIBED') return;
            var s = L.session();
            try { R.crowd.track({ n: (s && s.name) || 'Guest', r: myRole() || 'viewer', scr: R.isScreen ? 1 : 0, remote: myRole() ? 0 : 1, at: Date.now() }); } catch (e) {}
          });
      } catch (e) {}
    }
    function refresh() {
      if (!R.room) return;
      rpc('karaoke_room_get', { p_room: R.room.id }).then(function (res) {
        if (!R.alive || !res || !res.ok) return;
        R.room = res.room;
        if (R.room.status === 'ended') { L.toast('The host closed the room.'); }
        paint(); react();
      }, function () {});
    }
    function send(ch, event, payload) { try { if (ch) ch.send({ type: 'broadcast', event: event, payload: payload }); } catch (e) {} }
    function listeners() {
      var n = 0;
      Object.keys(R.pres || {}).forEach(function (k) { if (k === KK.device) return; var m = (R.pres[k] || [])[0] || {}; if (R.room.setup === 'online' || m.remote) n++; });
      return n;
    }

    /* ── what is playing, and what this device does about it ── */
    function react() {
      var cur = np();
      var key = [cur.video, cur.perf, cur.state].join('|');
      var changed = key !== R.npKey;
      R.npKey = key;
      /* a new song has a new clock: the last one's beat means nothing */
      if (changed) { R.anchor = null; R.playing = false; R.lastTick = 0; }
      if (!cur.video || cur.state === 'idle' || !cur.state) {
        if (R.watch) { R.watch.close(); R.watch = null; }
        return;
      }
      if (R.stage) return;                         /* this device is singing */
      /* the singer's own microphone has its stage; the big screen (the
         device that plays, while a phone sings) conducts from a watch */
      if (cur.mic === KK.device) return;
      if (!R.watch && changed && cur.state !== 'results') startWatch(cur);
      else if (R.watch) R.watch.update(cur);
    }
    function onTick(p) {
      if (!p || !isFinite(p.a) || !u.ytId(p.v)) return;
      if (np().video && p.v !== np().video) return;       /* a late beat of the last song */
      R.anchor = p.a; R.playing = !!p.p; R.lastTick = Date.now();
      if (R.watch) R.watch.tick(p);
      if (R.stage && R.stage.remoteTick) R.stage.remoteTick(p);
    }
    function onResult(p) {
      if (!p || !isFinite(p.score)) return;
      if (R.watch) R.watch.result(p);
      else if (!R.stage) { L.toast((p.name || 'The singer') + ' scored ' + p.score + '!'); KA.sfx('applause', { power: 0.6 }); }
      setTimeout(refresh, 800);
    }
    function onCtl(p) {
      if (!p || !R.stage || !R.stage.stage) return;
      var st = R.stage.stage;
      if (p.op === 'pause' && st.player) st.player.pause();
      else if (p.op === 'play' && st.player) st.player.play();
      else if (p.op === 'stop') st.finish('host');
    }
    function reactFloat(e, mine) {
      var layer = doc.querySelector('.kk-shell .lv-floaters') || ctx.el.querySelector('.lv-floaters');
      floater(layer, e, mine);
    }
    var sentWindow = [];
    function sendReact(e) {
      if (REACTIONS.indexOf(e) === -1) return;
      reactFloat(e, true);
      if (!signedIn()) { L.toast('Sign in to react.'); return; }
      var now = Date.now();
      sentWindow = sentWindow.filter(function (t) { return now - t < 1000; });
      if (sentWindow.length >= 4) return;
      sentWindow.push(now);
      send(R.crowd, 'react', { e: e });
    }
    KK.sendReact = sendReact;

    /* ── singing in this room ── */
    function singItem(item) {
      if (R.busy) return;
      if (np().video && np().state !== 'idle' && np().state !== 'results') { L.toast('Someone is on stage. You are up next.'); return; }
      R.busy = true;
      var screenMode = R.room.setup === 'screen';
      var here = !screenMode || R.isScreen;              /* this device plays the video */
      var mine = item.singer_id === R.me;
      KK.song(item.video_id).then(function (song) {
        return rpc('karaoke_begin', { p_video: item.video_id, p_room: R.room.id, p_queue: item.id, p_guest: item.guest_name || null, p_song_start: 0 }).then(function (b) {
          if (!b || !b.ok) {
            if (b && b.reason === 'quota') { KK.vip('quota', b); throw Object.assign(new Error('quota'), { quiet: true }); }
            throw Object.assign(new Error('begin'), { reason: b && b.reason });
          }
          return openMic().then(function (mic) { return { song: song, perf: b, mic: mic }; });
        });
      }).then(function (x) {
        var singer = item.guest_name ? { id: null, name: item.guest_name, guest: true } : { id: item.singer_id, name: memberName(item.singer_id) };
        var at = KK.serverNow() + (here ? 3200 : 5200);
        var cur = Object.assign({}, np(), { video: item.video_id, queue: item.id, perf: x.perf.id, singer: singer, state: 'countdown', at: at, dev: here ? KK.device : np().screen || null, mic: KK.device, score: null });
        return update(cur).then(function () { R.busy = false; runStage(x, here, singer); });
      }).catch(function (err) {
        R.busy = false;
        if (err && err.quiet) return;
        L.toast(err && err.reason ? reasonText(err.reason) : 'Could not start that song.');
      });
      void mine;
    }
    function memberName(uid) {
      var m = (R.room.members || []).filter(function (x) { return x.user_id === uid; })[0];
      return m ? name(m.stage) : 'A singer';
    }
    function openMic() {
      if (R.mic) return Promise.resolve(R.mic);
      if (!KA.supported()) return Promise.resolve(null);
      var set = L.store.get('kk-set', { headphones: false });
      var m = new KA.Mic({ headphones: !!set.headphones });
      return m.open().then(function () { R.mic = m; return m; }, function () { L.toast('No microphone: this song is sung along, not scored.'); return null; });
    }
    function runStage(x, here, singer) {
      var el = shell('kk-room-stage');
      var host = doc.createElement('div'); host.className = 'kk-stage-host'; el.appendChild(host);
      var fl = doc.createElement('div'); fl.className = 'lv-floaters'; el.appendChild(fl);
      el.appendChild(reactBar());
      var follow = null;
      if (!here) {
        /* a phone following the big screen's clock */
        follow = function () {
          var a = R.anchor != null ? R.anchor : np().at;
          if (!a) return -3;
          var tvLag = Number(L.store.get('kk-tvlag', 0.12)) || 0.12;
          return (KK.serverNow() - a) / 1000 - tvLag;
        };
      }
      var stage = new KK.Stage({
        host: host, song: x.song, record: !!(x.mic && x.perf), perf: x.perf, mic: x.mic, video: here, follow: follow, room: R.room,
        relay: function (pkt) { if (listeners() > 0) send(R.ch, 'v', pkt); },
        onTick: here ? function (t) { send(R.ch, 'tick', Object.assign({ q: np().queue, c: KK.device }, t)); } : null,
        onLive: function (rd) { send(R.ch, 'live', { s: rd.s, c: rd.c, l: rd.l, m: rd.m, n: singer.name }); },
        onEnd: function (out) { stageEnded(out, x, el, singer); },
        onLeave: function () {
          var m = L.modal('<h2>Leave the stage?</h2><p>The song stops for everyone, and this take is not saved.</p><div class="acts"><button class="lv-btn lv-btn-accent" type="button" data-close>Keep singing</button><button class="lv-btn lv-btn-ghost" type="button" data-yes>Stop</button></div>');
          m.querySelector('[data-yes]').addEventListener('click', function () {
            L.closeModal();
            rpc('karaoke_discard', { p_perf: x.perf.id }).catch(function () {});
            stage.destroy(); el.close(); R.stage = null;
            update(Object.assign({}, np(), { state: 'idle', video: null, perf: null, queue: null, dev: null, mic: null }));
          });
        },
        onFail: function (msg) {
          L.toast(msg);
          rpc('karaoke_discard', { p_perf: x.perf.id }).catch(function () {});
          stage.destroy(); el.close(); R.stage = null;
          update(Object.assign({}, np(), { state: 'idle', video: null }));
        }
      });
      R.stage = { stage: stage, el: el };
      if (!here) R.stage.remoteTick = function () {};
      /* wait for the room's moment, then go */
      var wait = Math.max(0, np().at - KK.serverNow() - 2250);
      setTimeout(function () {
        if (!R.stage) return;
        stage.start().then(function () {
          if (here) update(Object.assign({}, np(), { state: 'playing', at: KK.serverNow() - Math.round((stage.player ? stage.player.exact() : 0) * 1000) }));
        });
      }, here ? wait : 0);
    }
    function stageEnded(out, x, el, singer) {
      var stage = R.stage && R.stage.stage;
      var cur = np();
      update(Object.assign({}, cur, { state: 'results' }));
      if (!out.take || out.take.duration < 20) {
        rpc('karaoke_discard', { p_perf: x.perf.id }).catch(function () {});
        L.toast('Too short to judge, so it did not count.');
        closeStage(el);
        return;
      }
      var ov = doc.createElement('div');
      ov.className = 'kk-judging is-on';
      ov.innerHTML = '<div class="kk-judging-in"><div class="kk-eq"><i></i><i></i><i></i><i></i><i></i></div><h2>The judge is listening…</h2><p>Everyone in the room sees the score the moment it lands.</p></div>';
      el.appendChild(ov);
      KK.submit(x.perf, out.take, function () {}).then(function (res) {
        ov.remove();
        var score = res && res.status === 'scored' ? res.score : out.live;
        var g = KK.gradeOf(score || 0);
        send(R.ch, 'res', { perf: x.perf.id, score: score || 0, grade: g.letter, title: g.title, name: singer.name, verified: !!(res && res.verified) });
        update(Object.assign({}, np(), { state: 'results', score: { v: score || 0, g: g.letter, perf: x.perf.id, name: singer.name } }));
        var box = KK.results(el, { song: x.song, result: res && res.status === 'scored' ? res : { score: out.live, parts: out.parts, verified: false } });
        box.querySelector('[data-r="acts"]').innerHTML = '<div class="kk-res-row"><a class="lv-btn lv-btn-glass" href="' + perfHref(x.perf.id) + '">' + ic('play') + 'Replay</a><button class="lv-btn lv-btn-accent" type="button" data-r-back>' + kic('users') + 'Back to the room</button></div>';
        box.querySelector('[data-r-back]').addEventListener('click', function () { closeStage(el); });
        R.idleT = setTimeout(function () { closeStage(el); }, 25000);
      }, function () {
        ov.remove();
        L.toast('The judge will score it shortly. It will show on your replay.');
        closeStage(el);
      });
      void stage;
    }
    function closeStage(el) {
      clearTimeout(R.idleT);
      if (R.stage) { R.stage.stage.destroy(); R.stage = null; }
      el.close();
      var cur = np();
      if (cur.state !== 'idle') update(Object.assign({}, cur, { state: 'idle', video: null, perf: null, queue: null, dev: null, mic: null }));
      refresh();
    }

    /* ── watching someone sing ── */
    function startWatch(cur) {
      var screenMode = R.room.setup === 'screen';
      var conductor = screenMode && R.isScreen;
      var inRoom = screenMode && !!myRole() && !R.isScreen;      /* a phone in the same room */
      R.watch = Watch({
        room: R.room, np: cur, conductor: conductor, video: !inRoom, delay: conductor || inRoom ? 0 : 1.6,
        anchor: function () { return R.anchor != null ? R.anchor : np().at; },
        playing: function () { return R.playing; },
        onTick: function (t) { send(R.ch, 'tick', Object.assign({ q: np().queue, c: KK.device }, t)); },
        /* the screen closes the song if the singer's phone did not */
        onEnded: function () { var n = np(); if (conductor && n.perf === cur.perf && (n.state === 'countdown' || n.state === 'playing')) update(Object.assign({}, n, { state: 'results' })); },
        react: sendReact,
        onClose: function () { R.watch = null; },
        /* one tap per night, not one per song */
        autoTune: !!R.tuned,
        onTuned: function () { R.tuned = true; },
        isHost: isHost(),
        ctl: function (op) { send(R.ch, 'ctl', { op: op }); }
      });
    }

    /* ── the room page ── */
    function paint() {
      if (!R.room) return;
      var r = R.room, host = isHost(), cur = np();
      var queue = r.queue || [];
      var members = r.members || [];
      var html = '<div class="kk-page kk-roompage">' +
        '<header class="kk-rhead">' +
          '<div class="kk-rhead-l"><div class="kk-kicker">' + (r.setup === 'screen' ? kic('tv') + 'Same room · big screen' : kic('globe') + 'Online room') + ' · ' + (r.visibility === 'public' ? kic('eye') + 'Public' : kic('lock') + 'Friends') + '</div>' +
            '<h1>' + esc(r.title) + '</h1>' +
            '<div class="kk-rhead-meta">' + avatar(r.host, 'sm') + '<span>Hosted by <b>' + esc(name(r.host)) + '</b></span><span class="kk-aud" data-aud>' + kic('eye') + '<b>1</b> here</span></div></div>' +
          '<div class="kk-code-card"><small>Room code</small><button type="button" class="kk-code" data-r="copy" aria-label="Copy the room link">' + esc(r.code) + '</button>' +
            '<div class="kk-code-acts"><button class="lv-btn lv-btn-glass lv-btn-sm" type="button" data-r="share">' + ic('share') + 'Share</button>' +
            (r.setup === 'screen' ? '<button class="lv-btn lv-btn-glass lv-btn-sm" type="button" data-r="qr">' + kic('qr') + 'QR</button>' : '') + '</div></div>' +
        '</header>' +
        (r.status === 'ended' ? '<div class="kk-ended">' + kic('mic') + 'This room has closed.</div>' : '') +
        (host && r.setup === 'screen' && !R.isScreen ? '<div class="kk-screen-hint">' + kic('tv') + '<span>Is this the device on the TV? Make it the big screen: it plays every song and the phones become microphones.</span><button class="lv-btn lv-btn-accent lv-btn-sm" type="button" data-r="be-screen">This is the big screen</button></div>' : '') +
        (R.isScreen ? '<div class="kk-screen-on"><div>' + QR.svg(shortLink(r.code)) + '</div><div><b>Scan to join</b><span>or go to <b>cabana.africa/k/' + esc(r.code) + '</b></span><small>Songs play here. Everyone sings from their phone.</small></div></div>' : '') +
        nowCard(cur) +
        '<div class="kk-rgrid">' +
          '<section class="kk-panel kk-queue"><div class="kk-panel-h"><h2>' + kic('note') + ' Up next</h2>' + (canSing() && r.status !== 'ended' ? '<button class="lv-btn lv-btn-accent lv-btn-sm" type="button" data-r="add">' + ic('plus', 2.6) + 'Add a song</button>' : '') + '</div>' +
            (queue.length ? '<ol class="kk-q">' + queue.map(function (q, i) { return queueRow(q, i, host); }).join('') + '</ol>'
              : '<div class="kk-q-empty">' + kic('mic') + '<b>The stage is empty</b><span>' + (canSing() ? 'Add a song and you are first up.' : 'Singers add songs here. Sit back for now.') + '</span></div>') +
          '</section>' +
          '<aside class="kk-side">' +
            '<section class="kk-panel"><div class="kk-panel-h"><h2>' + kic('users') + ' In the room</h2></div>' +
              '<ul class="kk-members">' + members.map(function (m) { return memberRow(m, host); }).join('') + '</ul>' +
              (r.audience ? '<p class="kk-aud-n">+' + r.audience + ' in the audience</p>' : '') +
              (canSing() && r.status !== 'ended' ? '<div class="kk-inv"><input data-r-inv placeholder="Invite by @username" maxlength="30" autocomplete="off"/><button class="lv-btn lv-btn-glass lv-btn-sm" type="button" data-r="invite">Invite</button></div>' : '') +
            '</section>' +
            '<section class="kk-panel" data-recent><div class="kk-panel-h"><h2>' + kic('trophy') + ' Tonight’s scores</h2></div><div class="kk-recent" data-recent-list><span class="kk-spin"></span></div></section>' +
          '</aside>' +
        '</div>' +
        '<div class="kk-rfoot">' + (host ? '<button class="lv-btn lv-btn-ghost lv-btn-sm" type="button" data-r="settings">' + kic('sliders') + 'Room settings</button>' : '<button class="lv-btn lv-btn-ghost lv-btn-sm" type="button" data-r="leave">Leave the room</button>') +
          '<a class="lv-btn lv-btn-ghost lv-btn-sm" href="' + L.BASE + '/karaoke">' + ic('back') + 'Karaoke</a></div>' +
        '<div class="lv-floaters"></div>' +
      '</div>';
      ctx.el.innerHTML = html;
      paintAudience();
      loadRecent();
    }
    function nowCard(cur) {
      if (!cur.video || cur.state === 'idle') return '';
      var s = cur.singer || {};
      var res = cur.state === 'results' && cur.score;
      return '<section class="kk-now' + (res ? ' is-res' : '') + '"><div class="kk-now-art" style="background-image:url(' + thumb(cur.video) + ')"></div>' +
        '<div class="kk-now-in"><span class="kk-now-k">' + (res ? kic('trophy') + 'Just sang' : '<i class="kk-live-dot"></i>On stage now') + '</span>' +
          '<b>' + esc(s.name || 'A singer') + '</b>' +
          (res ? '<span class="kk-now-score">' + res.v + ' <small>' + esc(res.g) + '</small></span>' : '<button class="lv-btn lv-btn-accent lv-btn-sm" type="button" data-r="watch">' + ic('play') + 'Tune in</button>') +
        '</div></section>';
    }
    function queueRow(q, i, host) {
      var mine = q.singer_id === R.me;
      var who = q.guest_name ? q.guest_name + ' (guest)' : memberName(q.singer_id);
      var busy = np().video && np().state !== 'idle' && np().state !== 'results';
      var canStart = !busy && r0status() && ((mine && canSing()) || (host && (q.guest_name || R.isScreen)));
      return '<li class="kk-qi' + (q.status === 'singing' ? ' is-on' : '') + '">' +
        '<span class="kk-qi-n">' + (i + 1) + '</span>' +
        '<img src="' + thumb(q.video_id, 'mqdefault') + '" alt="" loading="lazy"/>' +
        '<span class="kk-qi-t"><b>' + esc(KK.songName(q)) + '</b><small>' + esc(who) + (q.kind === 'karaoke' ? ' · ' + kic('mic') + 'karaoke' : '') + '</small></span>' +
        '<span class="kk-qi-a">' +
          (canStart ? '<button class="lv-btn lv-btn-accent lv-btn-sm" type="button" data-q-sing="' + esc(q.id) + '">' + kic('mic') + (mine ? 'Sing now' : 'Start') + '</button>' : '') +
          (host && i > 0 ? '<button class="lv-round lv-round-sm" type="button" data-q-next="' + esc(q.id) + '" aria-label="Play next">' + ic('up') + '</button>' : '') +
          (host || mine ? '<button class="lv-round lv-round-sm" type="button" data-q-rm="' + esc(q.id) + '" aria-label="Remove">' + ic('x') + '</button>' : '') +
        '</span></li>';
    }
    function r0status() { return R.room.status !== 'ended'; }
    function memberRow(m, host) {
      var you = m.user_id === R.me;
      return '<li class="kk-mem">' + avatar(m.stage) + '<span><b>' + esc(name(m.stage)) + (you ? ' <small>(you)</small>' : '') + '</b><small>' + (m.role === 'host' ? 'Host' : m.role === 'singer' ? 'Singer' : 'Audience') + '</small></span>' +
        (host && !you && m.role !== 'host' ? '<span class="kk-mem-a">' + (m.role === 'guest' ? '<button class="lv-btn lv-btn-glass lv-btn-sm" type="button" data-m-role="singer" data-m="' + esc(m.user_id) + '">Let them sing</button>' : '') +
          '<button class="lv-round lv-round-sm" type="button" data-m-role="remove" data-m="' + esc(m.user_id) + '" aria-label="Remove">' + ic('x') + '</button></span>' : '') + '</li>';
    }
    function paintAudience() {
      var el = ctx.el.querySelector('[data-aud] b');
      var n = Math.max(1, Object.keys(R.pres || {}).length);
      if (el) el.textContent = String(n);
      var st = doc.querySelector('.kk-shell [data-k="aud"]');
      if (st) st.textContent = n + ' in the room';
      if (R.watch) R.watch.audience(n);
    }
    function loadRecent() {
      var c = L.sb(), box = ctx.el.querySelector('[data-recent-list]');
      if (!c || !box) return;
      Promise.resolve(c.from('karaoke_performances').select('id,video_id,user_id,guest_name,score,grade,status,stage,created_at').eq('room_id', R.room.id).eq('status', 'scored').order('created_at', { ascending: false }).limit(12)).then(function (res) {
        var list = (res && res.data) || [];
        if (!box.isConnected) return;
        if (!list.length) { box.innerHTML = '<p class="kk-muted">Scores land here as people sing.</p>'; return; }
        box.innerHTML = list.map(function (p) {
          var nm = p.guest_name || (p.stage && name(p.stage)) || memberName(p.user_id);
          return '<a class="kk-rec" href="' + perfHref(p.id) + '"><b>' + (p.score == null ? '–' : p.score) + '</b><span>' + esc(nm) + '<small>' + esc(ago(p.created_at)) + '</small></span>' +
            (isHost() ? '<label class="kk-rec-b"><input type="checkbox" data-battle="' + esc(p.id) + '" data-vid="' + esc(p.video_id) + '"/>Battle</label>' : '') + '</a>';
        }).join('') + (isHost() ? '<button class="lv-btn lv-btn-gold lv-btn-sm kk-battle-go" type="button" data-r="battle" hidden>' + kic('swords') + 'Make it a battle</button>' : '');
      }, function () { box.innerHTML = ''; });
    }

    ctx.el.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest('[data-kk-join]')) { KK.joinRoom(); return; }
      if (t.closest('[data-kk-start]')) { KK.startRoom(); return; }
      var sing = t.closest('[data-q-sing]');
      if (sing) { var item = (R.room.queue || []).filter(function (q) { return q.id === sing.getAttribute('data-q-sing'); })[0]; if (item) singItem(item); return; }
      var nx = t.closest('[data-q-next]'); if (nx) { rpc('karaoke_queue_set', { p_item: nx.getAttribute('data-q-next'), p_action: 'next', p_value: null }).then(function (room) { R.room = room; paint(); }); return; }
      var rm = t.closest('[data-q-rm]'); if (rm) { rpc('karaoke_queue_set', { p_item: rm.getAttribute('data-q-rm'), p_action: 'remove', p_value: null }).then(function (room) { R.room = room; paint(); }); return; }
      var mr = t.closest('[data-m-role]');
      if (mr) { rpc('karaoke_member_set', { p_room: R.room.id, p_user: mr.getAttribute('data-m'), p_role: mr.getAttribute('data-m-role') }).then(function (room) { R.room = room; paint(); }, function () { L.toast('That did not work.'); }); return; }
      var cb = t.closest('[data-battle]');
      if (cb) { e.stopPropagation(); var picked = ctx.el.querySelectorAll('[data-battle]:checked'); var go = ctx.el.querySelector('.kk-battle-go'); if (go) go.hidden = picked.length !== 2; if (t.tagName !== 'INPUT') e.preventDefault(); return; }
      var b = t.closest('[data-r]'); if (!b) return;
      var a = b.getAttribute('data-r');
      if (a === 'copy' || a === 'share') L.share(R.room.title + ' · Cabana Karaoke', 'Come sing with me. Room code ' + R.room.code, shortLink(R.room.code));
      else if (a === 'qr') L.modal('<h2>Scan to join</h2>' + QR.svg(shortLink(R.room.code), { cls: 'kk-qr kk-qr-lg' }) + '<p>or open <b>cabana.africa/k/' + esc(R.room.code) + '</b></p>');
      else if (a === 'be-screen') { R.isScreen = true; claimScreen(); paint(); L.toast('This is the big screen now. Songs will play here.'); }
      else if (a === 'add') addSong();
      else if (a === 'invite') invite();
      else if (a === 'watch') { var cur = np(); if (!R.watch) startWatch(cur); else R.watch.show(); }
      else if (a === 'settings') settings();
      else if (a === 'leave') rpc('karaoke_leave', { p_room: R.room.id }).then(function () { L.go(L.BASE + '/karaoke'); });
      else if (a === 'battle') {
        var ids = Array.prototype.map.call(ctx.el.querySelectorAll('[data-battle]:checked'), function (x) { return { id: x.getAttribute('data-battle'), v: x.getAttribute('data-vid') }; });
        if (ids.length !== 2 || ids[0].v !== ids[1].v) { L.toast('Pick two takes of the same song.'); return; }
        rpc('karaoke_battle_open', { p_room: R.room.id, p_a: ids[0].id, p_b: ids[1].id }).then(function (r) {
          if (!r || !r.ok) { L.toast('Those two cannot battle: pick two scored takes of one song.'); return; }
          L.go(chHref(r.id));
        });
      }
    });
    function addSong() {
      var host = isHost();
      KK.pickSong({ title: 'Add a song to the line-up' }).then(function (s) {
        function add(guest) {
          rpc('karaoke_queue_add', { p_room: R.room.id, p_video: s.video_id, p_singer: null, p_guest: guest || null, p_battle: null }).then(function (room) {
            R.room = room; paint(); L.toast('Added. ' + ((room.queue || []).length === 1 ? 'You are up first.' : 'You are number ' + (room.queue || []).length + '.'));
          }, function (err) { L.toast(/queue_full/.test(err && err.message) ? 'The line-up is full.' : 'Could not add that song.'); });
        }
        if (!host || R.room.setup !== 'screen') { add(null); return; }
        var m = L.modal('<div class="kk-form"><h2>Who is singing?</h2><p>A friend without a phone can sing as a guest from the big screen.</p><div class="acts"><button class="lv-btn lv-btn-accent" type="button" data-who="me">Me</button>' +
          '<div class="kk-inv"><input data-guest placeholder="Guest name" maxlength="30"/><button class="lv-btn lv-btn-glass lv-btn-sm" type="button" data-who="guest">Add guest</button></div></div></div>');
        m.addEventListener('click', function (e) {
          var w = e.target.closest('[data-who]'); if (!w) return;
          if (w.getAttribute('data-who') === 'me') { L.closeModal(); add(null); }
          else { var g = m.querySelector('[data-guest]').value.trim(); if (!g) { L.toast('Type their name.'); return; } L.closeModal(); add(g); }
        });
      });
    }
    function invite() {
      var inp = ctx.el.querySelector('[data-r-inv]'), h = inp && inp.value.trim();
      if (!h) { L.toast('Type a Cabana username.'); return; }
      rpc('karaoke_invite', { p_room: R.room.id, p_handle: h }).then(function (r) {
        if (!r || !r.ok) { L.toast(reasonText(r && r.reason)); return; }
        inp.value = '';
        L.toast('Invitation sent to @' + r.member.handle + '.');
      }, function () { L.toast('Could not send that invitation.'); });
    }
    function settings() {
      var r = R.room;
      var m = L.modal('<div class="kk-form"><h2>Room settings</h2>' +
        '<label class="kk-field"><span>Name</span><input data-f="title" maxlength="60" value="' + esc(r.title) + '"/></label>' +
        '<div class="kk-field"><span>Who can come?</span><div class="kk-seg is-2" data-f="vis"><button type="button" data-v="private" aria-pressed="' + (r.visibility === 'private') + '">' + kic('lock') + '<b>Friends</b></button><button type="button" data-v="public" aria-pressed="' + (r.visibility === 'public') + '">' + kic('eye') + '<b>Everyone</b></button></div></div>' +
        '<div class="kk-field"><span>Setup</span><div class="kk-seg is-2" data-f="setup"><button type="button" data-v="screen" aria-pressed="' + (r.setup === 'screen') + '">' + kic('tv') + '<b>Same room</b></button><button type="button" data-v="online" aria-pressed="' + (r.setup === 'online') + '">' + kic('globe') + '<b>Apart</b></button></div></div>' +
        '<div class="acts"><button class="lv-btn lv-btn-accent" type="button" data-f="save">Save</button><button class="lv-btn lv-btn-ghost" type="button" data-f="end">Close the room</button></div></div>');
      m.addEventListener('click', function (e) {
        var b = e.target.closest('.kk-seg button');
        if (b) { Array.prototype.forEach.call(b.parentNode.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); }); return; }
        var f = e.target.closest('[data-f="save"],[data-f="end"]'); if (!f) return;
        var patch = f.getAttribute('data-f') === 'end' ? { status: 'ended' } : {
          title: m.querySelector('[data-f="title"]').value,
          visibility: m.querySelector('[data-f="vis"] [aria-pressed="true"]').getAttribute('data-v'),
          setup: m.querySelector('[data-f="setup"] [aria-pressed="true"]').getAttribute('data-v')
        };
        rpc('karaoke_room_update', { p_room: r.id, p_patch: patch }).then(function (room) { L.closeModal(); R.room = room; paint(); if (patch.status === 'ended') L.toast('The room is closed.'); }, function () { L.toast('Could not save.'); });
      });
    }
    function reactBar() {
      var bar = doc.createElement('div');
      bar.className = 'kk-reacts';
      bar.setAttribute('data-no-light', '');
      bar.innerHTML = REACTIONS.map(function (r) { return '<button type="button" data-react="' + r + '" aria-label="React ' + r + '">' + r + '</button>'; }).join('');
      bar.addEventListener('click', function (e) { var b = e.target.closest('[data-react]'); if (b) sendReact(b.getAttribute('data-react')); });
      return bar;
    }
    KK.reactBar = reactBar;

    var beat = setInterval(function () {
      /* a conductor that fell silent: after 20 seconds, the room is idle */
      var cur = np();
      if (!R.room || R.stage || !cur.video || cur.state === 'idle') return;
      if (isHost() && cur.state === 'playing' && R.lastTick && Date.now() - R.lastTick > 20000 && cur.dev !== KK.device) {
        update(Object.assign({}, cur, { state: 'idle', video: null }));
      }
    }, 5000);

    ctx.onLeave(function () {
      R.alive = false;
      clearInterval(beat); clearTimeout(R.idleT);
      if (R.stage) { try { R.stage.stage.destroy(); R.stage.el.close(); } catch (e) {} R.stage = null; }
      if (R.watch) { R.watch.close(); R.watch = null; }
      if (R.mic) R.mic.close();
      [R.db, R.ch, R.crowd].forEach(function (c) { if (c) { try { if (c === R.crowd) c.untrack(); c.unsubscribe(); } catch (e) {} } });
    });
  };

  /* ── watching a song in a room ────────────────────────────────────
     o.video   this device plays the track (online friends, the big
               screen, remote viewers) or only shows the words (a phone
               in the same room as the big screen)
     o.delay   seconds behind the conductor: remote listeners run a
               beat and a half late so the singer's voice, relayed over
               the internet, lands on the same beat of their own copy
               of the track */
  function Watch(o) {
    var W = { tuned: false };
    var el = shell('kk-watch');
    var s = null, player = null, reel = null, recv = null, actx = null, tl = null, raf = null, vis = null, lastSeek = 0, closed = false;
    var cur = o.np;
    el.innerHTML =
      '<div class="kk-bg" data-bg></div>' +
      '<header class="kk-top"><button class="lv-round lv-round-sm" type="button" data-w="close" aria-label="Back to the room">' + ic('back') + '</button>' +
        '<div class="kk-top-t"><b data-w="song">…</b><span data-w="artist"></span></div><span class="kk-mode is-live"><i class="kk-live-dot"></i>Live</span><span style="flex:1"></span>' +
        '<span class="kk-top-room">' + kic('eye') + '<span data-w="aud">…</span></span>' +
        (o.video ? '<label class="kk-vol" title="Singer volume">' + kic('mic') + '<input type="range" min="0" max="150" value="100" data-w="vv"/></label><label class="kk-vol" title="Track volume">' + kic('note') + '<input type="range" min="0" max="100" value="80" data-w="tv"/></label>' : '') +
      '</header>' +
      '<div class="kk-main' + (o.video ? '' : ' is-remote') + '"><div class="kk-screen">' +
        (o.video ? '<div class="kk-video"><div class="kk-video-in" data-w="video"></div><div class="kk-video-ring"></div></div>' : '<div class="kk-remote-art" data-w="art"><span>' + kic('tv') + 'Playing on the big screen</span></div>') +
        '<div class="kk-singer"><span data-w="av"></span><div><b data-w="who">…</b><small data-w="state">Getting ready</small></div><div class="kk-singer-s"><b data-w="score">–</b><small>live</small></div><div class="kk-singer-lvl"><i data-w="lvl"></i></div></div>' +
      '</div><div class="kk-lyrics" data-w="lyrics"></div></div>' +
      (o.conductor ? '<div class="kk-watch-qr">' + QR.svg(shortLink(o.room.code)) + '<span>cabana.africa/k/<b>' + esc(o.room.code) + '</b></span></div>' : '') +
      '<div class="kk-tune" data-w="tune"><button type="button" data-w="go"><span>' + (o.conductor ? ic('play') : kic('headphones')) + '</span><b>' + (o.conductor ? 'Start the show' : 'Tune in') + '</b><small>' + (o.conductor ? 'Songs play on this screen' : o.video ? 'You will hear the track and the singer, in time' : 'The words follow the big screen') + '</small></button></div>' +
      '<div class="lv-floaters"></div>' +
      '<div class="kk-count" data-w="count" hidden></div>';
    var $ = function (k) { return el.querySelector('[data-w="' + k + '"]'); };
    el.appendChild(KK.reactBar ? KK.reactBar() : doc.createElement('div'));
    if (V) { vis = V.create($('bg') || el.querySelector('.kk-bg'), { calm: 0.5, scene: 1 }); }

    function load() {
      if (!cur || !cur.video) return;
      KK.song(cur.video).then(function (song) {
        if (closed) return;
        s = song;
        $('song').textContent = KK.songName(s); $('artist').textContent = KK.songArtist(s);
        var sg = cur.singer || {};
        $('who').textContent = sg.name || 'A singer';
        $('av').innerHTML = avatar({ name: sg.name });
        var d = s.lyrics && Array.isArray(s.lyrics.lines) ? s.lyrics : null;
        tl = d ? K.timeline({ synced: d.synced, lines: d.lines }, { duration: s.duration_s || 0 }) : { lines: [], tokens: [], synced: false };
        reel = new KK.LyricReel($('lyrics'), tl);
        if (!o.video) { var art = $('art'); if (art) art.style.backgroundImage = 'url(' + thumb(s.video_id) + ')'; }
        if (vis && V) { vis.clock.set(Number(s.bpm) || 100, 0, s.bpm ? 'known' : 'genre'); vis.clock.clock = function () { return now(); }; V.paletteFrom(thumb(s.video_id, 'mqdefault'), ['#FF4FD8', '#7B61FF', '#FFD978']).then(function (p) { if (vis) vis.setColors(p); }); }
        if (o.video) {
          if (player) player.destroy();
          $('video').innerHTML = '';
          player = new KK.KPlayer($('video'), { videoId: s.video_id, volume: 80 });
          player.on('ended', function () { W.ended = true; if (o.onEnded) o.onEnded(); });
          player.on('error', function (c) { L.toast(KK.ytError(c)); });
        }
      });
    }
    /* the song time this device should be at */
    function now() {
      var a = o.anchor();
      if (!a) return null;
      return (KK.serverNow() - a) / 1000 - o.delay;
    }
    function loop() {
      raf = requestAnimationFrame(loop);
      if (!s) return;
      var t = now();
      if (t == null) return;
      /* the big screen conducts: it starts the song on the room's clock */
      /* the song is over on this screen: nothing to start again */
      var over = W.ended || (s.duration_s && t > s.duration_s - 0.3);
      if (player && W.tuned && !over) {
        var pt = player.time();
        if (t < -0.05) {
          if (player.playing()) player.pause();
          var c = $('count'); if (c) { var n = Math.ceil(-t); c.hidden = n > 5; c.innerHTML = '<b>' + n + '</b>'; }
        } else {
          var cnt = $('count'); if (cnt && !cnt.hidden) cnt.hidden = true;
          /* a player that was just told to play is left to start (it can
             buffer for a second or two) before it is told again */
          if (!player.playing() && (o.conductor || o.playing())) { if (Date.now() - lastSeek > 2500) { player.seek(Math.max(0, t)); player.play(); lastSeek = Date.now(); } }
          else if (!o.conductor && !o.playing() && player.playing()) player.pause();
          else if (!o.conductor && player.playing() && Math.abs(pt - t) > 0.35 && Date.now() - lastSeek > 2500) { player.seek(t + 0.12); lastSeek = Date.now(); }
        }
        if (o.conductor && player.playing() && Date.now() - (W.lastTick || 0) > 2000) {
          W.lastTick = Date.now();
          o.onTick({ s: +pt.toFixed(3), a: Math.round(KK.serverNow() - pt * 1000), p: 1, v: s.video_id });
        }
      }
      var lt = (player && player.ready ? player.time() - 0.03 : t) - (Number(s.offset_s) || 0) - KK.nudge();
      if (reel) reel.render(lt);
      if (vis) vis.setPlaying(!!(player ? player.playing() : t > 0));
    }
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-w]'); if (!b) return;
      var k = b.getAttribute('data-w');
      if (k === 'close') { hide(); }
      else if (k === 'go') tuneIn();
    });
    el.addEventListener('input', function (e) {
      var k = e.target.getAttribute('data-w');
      if (k === 'vv' && recv) recv.setVolume(Number(e.target.value) / 100);
      if (k === 'tv' && player) player.setVolume(Number(e.target.value));
    });
    function tuneIn() {
      W.tuned = true;
      $('tune').hidden = true;
      if (o.onTuned) o.onTuned();
      var AC = global.AudioContext || global.webkitAudioContext;
      if (AC && o.video && !o.conductor) {
        try {
          actx = new AC({ latencyHint: 'playback' });
          actx.resume();
          recv = new KA.Receiver(actx, function () { return player && player.ready ? player.time() - (actx.outputLatency || 0.03) : now(); });
        } catch (e) { recv = null; }
      }
      if (player) player.readyP.then(function () { player.play(); if (now() != null && now() < 0) player.pause(); });
    }
    function hide() { el.classList.add('is-min'); el.close(); closed = true; cancelAnimationFrame(raf); if (player) player.destroy(); if (vis) vis.destroy(); if (recv) recv.close(); if (actx) try { actx.close(); } catch (e) {} if (o.onClose) o.onClose(); }
    load();
    loop();
    /* tuned in before tonight, or already tapped this page: no need to ask
       again (a tap is what lets a browser start sound) */
    if (o.autoTune || (o.conductor && global.navigator && navigator.userActivation && navigator.userActivation.hasBeenActive)) tuneIn();
    W.update = function (np) {
      var changedSong = !cur || np.video !== cur.video || np.perf !== cur.perf;
      cur = np;
      if (changedSong) { W.ended = false; load(); }
      if (np.state === 'results' && np.score) W.result({ score: np.score.v, grade: np.score.g, name: np.score.name });
    };
    W.tick = function () {};
    W.voice = function (p) { if (recv && W.tuned) recv.push(p); };
    W.live = function (p) {
      if (!p) return;
      var sc = $('score'); if (sc && p.s != null) sc.textContent = String(p.s);
      var lv = $('lvl'); if (lv && isFinite(p.l)) lv.style.transform = 'scaleX(' + Math.max(0.02, Math.min(1, p.l)) + ')';
      var st = $('state'); if (st) st.textContent = p.c >= 4 ? p.c + ' in a row' : 'Singing';
    };
    W.result = function (p) {
      if (W.shown === p.perf && p.perf) return;
      W.shown = p.perf || p.score;
      var box = doc.createElement('div');
      box.className = 'kk-wres';
      var g = KK.gradeOf(p.score);
      box.innerHTML = '<div class="kk-wres-in"><small>' + esc(p.name || 'The singer') + ' scored</small><b>' + p.score + '</b><span class="kk-grade is-on g-' + g.letter.replace('+', 'p') + '"><b>' + g.letter + '</b><small>' + esc(g.title) + '</small></span>' +
        (p.verified ? '<em>' + kic('sparkles') + 'Checked by the judge</em>' : '') + '</div>';
      el.appendChild(box);
      KA.sfx('crash'); KA.sfx('applause', { power: Math.max(0.3, Math.min(1, (p.score - 50) / 50)) });
      if (p.score >= 85) KK.confetti(el, 100);
      setTimeout(function () { box.classList.add('is-out'); setTimeout(function () { box.remove(); }, 600); }, 7000);
    };
    W.audience = function (n) { var a = $('aud'); if (a) a.textContent = n + ' watching'; };
    W.show = function () {};
    W.close = function () { if (!closed) hide(); };
    return W;
  }

  /* ══ A REPLAY ══════════════════════════════════════════════════ */

  views.replay = function (ctx) {
    var id = ctx.params[0];
    L.setTab('karaoke');
    var P = null, song = null, tl = null, player = null, audio = null, reel = null, raf = null, alive = true, moments = [], shown = {}, played = false, vis = null;
    ctx.el.innerHTML = '<div class="kk-page"><div class="kk-room-load"><span class="kk-spin kk-spin-lg"></span></div></div>';
    rpc('karaoke_performance', { p_perf: id }).then(function (r) {
      if (!alive) return;
      if (!r || !r.ok) { ctx.el.innerHTML = '<div class="kk-page">' + L.ui.empty('mic', 'This take is private or gone', 'The singer may have made it private, or it has passed its keep date.', '<a class="lv-btn lv-btn-accent" href="' + L.BASE + '/karaoke">' + kic('mic') + 'Karaoke</a>') + '</div>'; return; }
      P = r;
      moments = (r.moments || []).slice().sort(function (a, b) { return a.t - b.t; });
      return KK.song(r.performance.video_id).then(function (s) { song = s; paint(); }, function () { song = r.song || { video_id: r.performance.video_id }; paint(); });
    });
    function paint() {
      var p = P.performance, g = KK.gradeOf(p.score), mine = P.mine;
      var st = p.stage || {};
      L.setMeta(name(st) + ' sings ' + KK.songName(song), 'Watch ' + name(st) + ' sing ' + KK.songName(song) + ' on Cabana Karaoke' + (p.score != null ? ': ' + p.score + ' points.' : '.'));
      var parts = p.parts || {};
      ctx.el.innerHTML =
        '<div class="kk-page kk-replay">' +
          '<header class="kk-rp-head"><div class="kk-rp-who">' + avatar(st, 'lg') + '<div><div class="kk-kicker">' + (p.verified ? kic('sparkles') + 'Judged take' : 'Take') + (p.vip ? ' · ' + kic('crown') + 'VIP' : '') + '</div><h1>' + esc(name(st)) + '</h1><p>' + esc(KK.songName(song)) + ' · ' + esc(KK.songArtist(song)) + '</p></div></div>' +
            '<div class="kk-rp-score g-' + g.letter.replace('+', 'p') + '"><b>' + (p.score == null ? '–' : p.score) + '</b><span><b>' + g.letter + '</b><small>' + esc(g.title) + '</small></span></div></header>' +
          '<div class="kk-rp-stage"><div class="kk-rp-bg" data-bg></div>' +
            '<div class="kk-video"><div class="kk-video-in" data-rp="video"></div><div class="kk-video-ring"></div></div>' +
            '<div class="kk-lyrics kk-rp-lyrics" data-rp="lyrics"></div>' +
            '<div class="lv-floaters"></div>' +
          '</div>' +
          '<div class="kk-rp-ctrl">' +
            '<button class="lv-pbtn main" type="button" data-rp="play" aria-label="Play">' + ic('play') + '</button>' +
            '<div class="kk-rp-bar" data-rp="bar"><i data-rp="fill"></i>' + moments.slice(0, 200).map(function (m) { return '<em style="left:' + (song.duration_s ? (m.t / song.duration_s * 100).toFixed(2) : 0) + '%">' + esc(m.e) + '</em>'; }).join('') + '</div>' +
            '<span class="kk-rp-time" data-rp="time">0:00</span>' +
            (p.has_take ? '<label class="kk-vol">' + kic('mic') + '<input type="range" min="0" max="150" value="100" data-rp="vv"/></label><label class="kk-vol">' + kic('note') + '<input type="range" min="0" max="100" value="70" data-rp="tv"/></label>' : '<span class="kk-muted">' + (p.status === 'scored' ? 'The recording has passed its keep date.' : 'Still being judged…') + '</span>') +
          '</div>' +
          '<div class="kk-reacts kk-rp-reacts" data-no-light>' + REACTIONS.map(function (r) { return '<button type="button" data-cheer="' + r + '" aria-label="Cheer ' + r + '">' + r + '</button>'; }).join('') + '<small>Cheer at this moment</small></div>' +
          '<div class="kk-rp-grid">' +
            '<section class="kk-panel"><div class="kk-panel-h"><h2>The judge’s card</h2></div><div class="kk-res-parts">' + ['lyrics', 'pitch', 'timing', 'expression'].map(function (k) {
              var v = parts[k];
              return '<div class="kk-part' + (v == null ? ' is-na' : '') + '"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="19" class="bg"/><circle cx="22" cy="22" r="19" class="fg" style="--v:' + (v == null ? 0 : Math.round(v * 100)) + '"/></svg><b>' + (v == null ? '–' : Math.round(v * 100)) + '</b><small>' + { lyrics: 'Lyrics', pitch: 'Pitch', timing: 'Timing', expression: 'Feel' }[k] + '</small></div>';
            }).join('') + '</div>' +
              (p.verify && p.verify.lines ? '<div class="kk-heat">' + p.verify.lines.map(function (v) { return '<i style="--h:' + (v == null ? 0 : v) + '"' + (v == null ? ' class="na"' : '') + '></i>'; }).join('') + '</div>' : '') +
              '<p class="kk-muted">' + (p.verified ? 'Whisper heard the recording; the words, notes and timing were checked against the song.' : 'Not verified by the judge.') + (p.ranked ? ' Ranked.' : '') + '</p></section>' +
            '<section class="kk-panel"><div class="kk-panel-h"><h2>' + (mine ? 'Your take' : 'Sing it too') + '</h2></div>' +
              (mine ? ownerTools(p) : '') +
              '<div class="kk-res-row"><a class="lv-btn lv-btn-accent" href="' + singHref(song.video_id, P.challenge && P.challenge.status === 'waiting' && !mine ? '?challenge=' + encodeURIComponent(P.challenge.id) : '') + '">' + kic('mic') + (mine ? 'Sing it again' : 'Beat this score') + '</a>' +
              '<button class="lv-btn lv-btn-glass" type="button" data-rp="share">' + ic('share') + 'Share</button></div>' +
              (P.challenge ? '<a class="kk-rp-ch" href="' + chHref(P.challenge.id) + '">' + kic('swords') + (P.challenge.kind === 'battle' ? 'Part of a battle' : 'Part of a challenge') + ' · ' + esc(P.challenge.status) + ic('chevR', 2.4) + '</a>' : '') +
            '</section>' +
          '</div>' +
        '</div>';
      var d = song.lyrics && Array.isArray(song.lyrics.lines) ? song.lyrics : null;
      tl = d ? K.timeline({ synced: d.synced, lines: d.lines }, { duration: song.duration_s || 0 }) : { lines: [], tokens: [], synced: false };
      reel = new KK.LyricReel(ctx.el.querySelector('[data-rp="lyrics"]'), tl);
      /* the judge's words: gold where heard, dim where not */
      var hits = {};
      ((p.verify && p.verify.words) || []).forEach(function (w) { hits[w[0]] = w[1]; });
      if (p.verified) tl.tokens.forEach(function (tk) { if (tk.b || !tk.wt) return; reel.mark(tk.i, hits[tk.i] >= 50 ? 'hit' : hits[tk.i] ? 'voiced' : 'miss'); });
      player = new KK.KPlayer(ctx.el.querySelector('[data-rp="video"]'), { videoId: song.video_id, volume: 70 });
      player.on('state', function (s2) { var b = ctx.el.querySelector('[data-rp="play"]'); if (b) b.innerHTML = ic(s2 === 1 ? 'pause' : 'play'); if (s2 !== 1 && audio) audio.pause(); if (vis) vis.setPlaying(s2 === 1); });
      if (V) { vis = V.create(ctx.el.querySelector('[data-bg]'), { calm: 0.4, scene: 3, bpm: Number(song.bpm) || 100 }); vis.clock.clock = function () { return player ? player.time() : 0; }; }
      if (p.has_take) KK.api('take', { perf: p.id, get: true }).then(function (d2) {
        if (!alive || !d2 || !d2.url) return;
        /* in the page (not a detached object), so it goes when the page does */
        audio = doc.createElement('audio');
        audio.preload = 'auto'; audio.hidden = true; audio.setAttribute('data-rp-audio', '');
        audio.src = d2.url;
        ctx.el.querySelector('.kk-rp-stage').appendChild(audio);
        var vv = ctx.el.querySelector('[data-rp="vv"]'); if (vv) audio.volume = Math.min(1, Number(vv.value) / 100);
      });
      loop();
    }
    function ownerTools(p) {
      return '<div class="kk-res-pub"><span>Who can see it?</span><div class="kk-seg is-3" data-rp-vis>' +
        [['private', 'lock', 'Only me'], ['link', 'link', 'Link'], ['public', 'eye', 'Everyone']].map(function (v) { return '<button type="button" data-v="' + v[0] + '" aria-pressed="' + (p.visibility === v[0]) + '">' + kic(v[1]) + '<b>' + v[2] + '</b></button>'; }).join('') + '</div></div>' +
        (p.status === 'scored' && p.verified ? '<div class="kk-res-chal">' + kic('swords') + '<input data-rp-h placeholder="@username to challenge" maxlength="30"/><button class="lv-btn lv-btn-gold lv-btn-sm" type="button" data-rp="challenge">Challenge</button><button class="lv-btn lv-btn-ghost lv-btn-sm" type="button" data-rp="open">Open to anyone</button></div>' : '') +
        (p.expires_at ? '<p class="kk-muted">Kept until ' + esc(new Date(p.expires_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'long' })) + '. <button class="kk-link" type="button" data-kk-vip>Keep it for good with VIP</button></p>' : '');
    }
    /* take position for a song time, through the anchors */
    function recAt(s) {
      var tm = (P.performance.timemap || []).slice().sort(function (a, b) { return a[0] - b[0]; });
      var best = null;
      for (var i = 0; i < tm.length; i++) if (tm[i][1] <= s + 0.001) best = tm[i];
      if (best) return best[0] + (s - best[1]);
      if (tm.length) return tm[0][0] - (tm[0][1] - s);
      return s - (P.performance.song_start_s || 0);
    }
    function loop() {
      raf = requestAnimationFrame(loop);
      if (!player || !player.ready) return;
      var t = player.time(), d = player.duration() || song.duration_s || 0;
      if (reel) reel.render(t - 0.03 - (Number(song.offset_s) || 0));
      var f = ctx.el.querySelector('[data-rp="fill"]'); if (f && d) f.style.width = (t / d * 100).toFixed(2) + '%';
      var tm = ctx.el.querySelector('[data-rp="time"]'); if (tm) tm.textContent = u.clock(t) + (d ? ' / ' + u.clock(d) : '');
      if (audio && player.playing()) {
        var r = recAt(t);
        if (r >= 0 && (!audio.duration || r < audio.duration)) {
          if (audio.paused) { audio.currentTime = r; audio.play().catch(function () {}); }
          else if (Math.abs(audio.currentTime - r) > 0.15) audio.currentTime = r;
        } else if (!audio.paused) audio.pause();
      }
      /* the crowd's cheers, at their moments */
      if (player.playing()) moments.forEach(function (m, i) {
        if (!shown[i] && m.t <= t && m.t > t - 0.6) { shown[i] = 1; floater(ctx.el.querySelector('.kk-rp-stage .lv-floaters'), m.e, false); }
      });
    }
    ctx.el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-rp]');
      var cheer = e.target.closest('[data-cheer]');
      var vb = e.target.closest('[data-rp-vis] button');
      if (e.target.closest('[data-kk-vip]')) { KK.vip('info'); return; }
      if (vb) {
        rpc('karaoke_publish', { p_perf: P.performance.id, p_visibility: vb.getAttribute('data-v') }).then(function (r) {
          if (!r || !r.ok) { L.toast(reasonText(r && r.reason)); return; }
          Array.prototype.forEach.call(vb.parentNode.children, function (x) { x.setAttribute('aria-pressed', String(x === vb)); });
        });
        return;
      }
      if (cheer) {
        var em = cheer.getAttribute('data-cheer');
        floater(ctx.el.querySelector('.kk-rp-stage .lv-floaters'), em, true);
        if (!signedIn()) { L.toast('Sign in to leave a cheer.'); return; }
        rpc('karaoke_cheer', { p_perf: P.performance.id, p_emoji: em, p_at: player ? player.time() : 0 }).then(function (r) { if (r && !r.ok && r.reason === 'rate') L.toast('That is a lot of cheering. Thank you!'); });
        return;
      }
      if (!b) return;
      var k = b.getAttribute('data-rp');
      if (k === 'play' && player) {
        if (player.playing()) player.pause();
        else {
          player.play();
          /* phones only let a sound start inside a tap: start the voice
             here once, and the clock takes it from there */
          if (audio && !audio.unlocked) { audio.unlocked = true; var pr = audio.play(); if (pr && pr.then) pr.then(function () { if (!player.playing()) audio.pause(); }, function () {}); }
          if (!played) { played = true; rpc('karaoke_play', { p_perf: P.performance.id }).catch(function () {}); }
        }
      } else if (k === 'bar' && player) {
        var rect = b.getBoundingClientRect(), d = player.duration() || song.duration_s;
        if (d) { player.seek(clampN((e.clientX - rect.left) / rect.width, 0, 1) * d); shown = {}; }
      } else if (k === 'share') {
        var g = KK.gradeOf(P.performance.score);
        if (P.mine && P.performance.verified) KK.shareCard({ song: KK.songName(song), artist: KK.songArtist(song), score: P.performance.score, grade: g.letter, title: g.title, video: song.video_id, name: name(P.performance.stage), verified: true, link: location.href, url: 'cabana.africa' + location.pathname.slice(0, 34) });
        else L.share(name(P.performance.stage) + ' sings ' + KK.songName(song), 'On Cabana Karaoke', location.href);
      } else if (k === 'challenge' || k === 'open') {
        var h = k === 'open' ? null : (ctx.el.querySelector('[data-rp-h]').value || '').trim();
        if (k === 'challenge' && !h) { L.toast('Type their Cabana username, or open it to anyone.'); return; }
        rpc('karaoke_challenge_create', { p_perf: P.performance.id, p_handle: h, p_message: null }).then(function (r) {
          if (!r || !r.ok) { L.toast(reasonText(r && r.reason)); return; }
          L.go(chHref(r.id));
        });
      }
    });
    ctx.el.addEventListener('input', function (e) {
      var k = e.target.getAttribute('data-rp');
      if (k === 'vv' && audio) audio.volume = Math.min(1, Number(e.target.value) / 100);
      if (k === 'tv' && player) player.setVolume(Number(e.target.value));
    });
    ctx.onLeave(function () { alive = false; cancelAnimationFrame(raf); if (player) player.destroy(); if (audio) { audio.pause(); audio.src = ''; } if (vis) vis.destroy(); });
  };
  function clampN(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ══ A CHALLENGE ═══════════════════════════════════════════════ */

  views.challenge = function (ctx) {
    var id = ctx.params[0];
    L.setTab('karaoke');
    var C = null, alive = true, t = null;
    ctx.el.innerHTML = '<div class="kk-page"><div class="kk-room-load"><span class="kk-spin kk-spin-lg"></span></div></div>';
    function load() {
      return rpc('karaoke_challenge', { p_challenge: id }).then(function (r) {
        if (!alive) return;
        if (!r || !r.ok) { ctx.el.innerHTML = '<div class="kk-page">' + L.ui.empty('swords', 'No such challenge', 'It may be private, or it never existed.', '<a class="lv-btn lv-btn-accent" href="' + L.BASE + '/karaoke">' + kic('mic') + 'Karaoke</a>') + '</div>'; return; }
        C = r; paint();
      });
    }
    function side(k) {
      var c = C.challenge, stage = c[k + '_stage'], p = C[k], win = c.winner === k, lose = c.winner && c.winner !== k && c.winner !== 'draw';
      var g = p && p.score != null ? KK.gradeOf(p.score) : null;
      var votes = c[k === 'a' ? 'votes_a' : 'votes_b'], total = c.votes_a + c.votes_b;
      return '<div class="kk-vs-side' + (win ? ' is-win' : lose ? ' is-lose' : '') + '">' + (win ? '<span class="kk-vs-crown">' + kic('crown') + '</span>' : '') +
        (stage ? avatar(stage, 'xl') : '<span class="kk-av kk-av-xl kk-av-q"><b>?</b></span>') +
        '<b class="kk-vs-name">' + esc(stage ? name(stage) : (c.open ? 'Anyone' : 'Waiting…')) + '</b>' +
        (p ? '<div class="kk-vs-score">' + (p.score == null ? '–' : p.score) + (g ? '<small>' + g.letter + '</small>' : '') + '</div><a class="lv-btn lv-btn-glass lv-btn-sm" href="' + perfHref(p.id) + '">' + ic('play') + 'Watch</a>'
          : '<div class="kk-vs-score is-q">?</div>') +
        (c.status === 'voting' || c.status === 'done' ? '<div class="kk-vs-votes"><i style="width:' + (total ? Math.round(votes / total * 100) : 0) + '%"></i><span>' + votes + ' vote' + (votes === 1 ? '' : 's') + '</span></div>' : '') +
        (c.status === 'voting' && !c.a_mine && !c.b_mine ? '<button class="lv-btn ' + (C.my_vote === k ? 'lv-btn-gold' : 'lv-btn-accent') + ' lv-btn-sm" type="button" data-vote="' + k + '"' + (C.my_vote ? ' disabled' : '') + '>' + (C.my_vote === k ? ic('check', 2.6) + 'Your vote' : 'Vote') + '</button>' : '') +
      '</div>';
    }
    function paint() {
      var c = C.challenge, song = C.song || {};
      L.setMeta((c.kind === 'battle' ? 'Battle' : 'Challenge') + ': ' + KK.songName(song), 'A sing-off on Cabana Karaoke.');
      var status = c.status === 'waiting' ? 'Waiting for an answer' : c.status === 'voting' ? 'The crowd is voting' : c.status === 'done' ? (c.winner === 'draw' ? 'A draw!' : 'Decided') : c.status === 'declined' ? 'Declined' : 'Expired';
      var until = c.status === 'waiting' ? c.expires_at : c.status === 'voting' ? c.voting_ends_at : null;
      ctx.el.innerHTML = '<div class="kk-page kk-chpage">' +
        '<div class="kk-ch-bg" style="background-image:url(' + thumb(song.video_id) + ')"></div>' +
        '<header class="kk-ch-head"><div class="kk-kicker">' + kic('swords') + (c.kind === 'battle' ? 'Battle' : c.open ? 'Open challenge' : 'Challenge') + ' · ' + esc(status) + '</div>' +
          '<h1>' + esc(KK.songName(song)) + '</h1><p>' + esc(KK.songArtist(song)) + '</p>' +
          (c.message ? '<blockquote>“' + esc(c.message) + '”</blockquote>' : '') +
          (until ? '<div class="kk-ch-until">' + (c.status === 'voting' ? 'Voting closes in ' : 'Open for ') + '<b data-cd="' + esc(until) + '"><span>' + esc(L.timeTo(until).label) + '</span></b></div>' : '') +
        '</header>' +
        '<div class="kk-vs">' + side('a') + '<div class="kk-vs-mid"><span>VS</span></div>' + side('b') + '</div>' +
        (c.status === 'waiting' && c.for_me ? '<div class="kk-ch-acts"><a class="lv-btn lv-btn-accent kk-btn-big" href="' + singHref(c.video_id, '?challenge=' + encodeURIComponent(c.id)) + '">' + kic('mic') + 'Accept and sing</a>' + (c.b_mine ? '<button class="lv-btn lv-btn-ghost" type="button" data-ch="decline">Decline</button>' : '') + '</div>' : '') +
        (c.status === 'waiting' && !signedIn() && c.open ? '<div class="kk-ch-acts"><a class="lv-btn lv-btn-accent" href="' + esc(L.signInUrl(location.pathname)) + '" rel="external">' + kic('mic') + 'Sign in to answer it</a></div>' : '') +
        (c.status === 'voting' && !signedIn() ? '<p class="kk-ch-note">Sign in to vote. The verified scores decide, and the crowd carries up to 30%.</p>' : '<p class="kk-ch-note">The verified scores decide. The crowd carries up to 30%, growing with every vote to the tenth.</p>') +
        '<div class="kk-ch-acts"><button class="lv-btn lv-btn-glass" type="button" data-ch="share">' + ic('share') + 'Share this ' + (c.kind === 'battle' ? 'battle' : 'challenge') + '</button><a class="lv-btn lv-btn-ghost" href="' + L.BASE + '/karaoke">' + kic('mic') + 'Karaoke</a></div>' +
      '</div>';
      if (c.status === 'done' && c.winner && c.winner !== 'draw' && !C._cheered) { C._cheered = true; setTimeout(function () { KK.confetti(ctx.el.querySelector('.kk-chpage'), 90); KA.sfx('applause', { power: 0.8 }); }, 400); }
    }
    ctx.el.addEventListener('click', function (e) {
      var v = e.target.closest('[data-vote]');
      if (v) {
        if (!signedIn()) { signIn(location.pathname, 'Sign in to vote.'); return; }
        v.classList.add('is-busy');
        rpc('karaoke_vote', { p_challenge: id, p_pick: v.getAttribute('data-vote') }).then(function (r) {
          if (!r || !r.ok) { L.toast(reasonText(r && r.reason)); v.classList.remove('is-busy'); return; }
          KA.sfx('pop'); load();
        }, function () { v.classList.remove('is-busy'); L.toast('Your vote did not go through.'); });
        return;
      }
      var b = e.target.closest('[data-ch]'); if (!b) return;
      if (b.getAttribute('data-ch') === 'decline') rpc('karaoke_challenge_decline', { p_challenge: id }).then(load);
      if (b.getAttribute('data-ch') === 'share') L.share('A sing-off on Cabana Karaoke', 'Who sang it better?', location.href);
    });
    load();
    t = setInterval(function () { if (!doc.hidden && C && (C.challenge.status === 'voting' || C.challenge.status === 'waiting')) load(); }, 20000);
    ctx.onLeave(function () { alive = false; clearInterval(t); });
  };

  /* ══ THE LYRIC STUDIO ══════════════════════════════════════════ */

  views.studio = function (ctx) {
    var vid = ctx.params[0];
    L.setTab('karaoke');
    var S = { song: null, draft: null, lines: [], step: 1, at: 0, player: null, reel: null, raf: null, alive: true, rate: 1 };
    ctx.el.innerHTML = '<div class="kk-page"><div class="kk-room-load"><span class="kk-spin kk-spin-lg"></span></div></div>';
    Promise.all([KK.song(vid), signedIn() ? rpc('karaoke_lyrics_mine', { p_video: vid }).catch(function () { return null; }) : null]).then(function (r) {
      if (!S.alive) return;
      S.song = r[0]; S.draft = r[1];
      var src = (S.draft && S.draft.doc && S.draft.doc.lines) || (S.song.lyrics && S.song.lyrics.lines) || [];
      S.text = src.map(function (l) { return l.x; }).join('\n');
      S.lines = src.map(function (l) { return { x: l.x, t: l.t == null ? null : Number(l.t) }; });
      L.setMeta('Lyric studio · ' + KK.songName(S.song));
      paint();
    }, function () { ctx.el.innerHTML = '<div class="kk-page">' + L.ui.empty('pen', 'That song will not open', 'Try again in a moment.', '') + '</div>'; });
    function paint() {
      var s = S.song, d = S.draft;
      ctx.el.innerHTML = '<div class="kk-page kk-studio">' +
        '<header class="kk-st-head"><div><div class="kk-kicker">' + kic('pen') + 'Lyric studio</div><h1>' + esc(KK.songName(s)) + '</h1><p>' + esc(KK.songArtist(s)) + ' · ' + esc((KK.LYRICS[s.lyrics_status] || {}).label || '') + '</p></div>' +
          (d ? '<span class="kk-chip kk-chip-' + (d.status === 'approved' ? 'lime' : d.status === 'rejected' ? 'muted' : 'gold') + '">Your draft: ' + esc(d.status) + '</span>' : '') + '</header>' +
        (d && d.status === 'rejected' && d.note ? '<p class="kk-st-note">' + kic('chat') + 'The team said: ' + esc(d.note) + '</p>' : '') +
        '<ol class="kk-st-steps">' + ['The words', 'Tap them in time', 'Check and send'].map(function (t, i) { return '<li class="' + (S.step === i + 1 ? 'is-on' : S.step > i + 1 ? 'is-done' : '') + '"><b>' + (i + 1) + '</b>' + t + '</li>'; }).join('') + '</ol>' +
        '<div class="kk-st-body" data-st-body></div></div>';
      body();
    }
    function body() {
      var b = ctx.el.querySelector('[data-st-body]');
      if (S.player) { S.player.destroy(); S.player = null; }
      cancelAnimationFrame(S.raf);
      if (S.step === 1) {
        b.innerHTML = '<div class="kk-st-words"><textarea data-st-text rows="18" spellcheck="true" placeholder="Paste the words here, one sung line per line.">' + esc(S.text || '') + '</textarea>' +
          '<aside><h3>A few rules</h3><ul><li>One sung line per line, as it is sung.</li><li>Backing vocals in (brackets): they show, but are never scored.</li><li>No titles, no “Chorus” labels, no artist names.</li><li>Kiswahili, Sheng, English, any language: write it the way it is sung.</li></ul>' +
          '<div class="acts"><button class="lv-btn lv-btn-accent" type="button" data-st="to2">Next: tap them in time' + ic('arrowR') + '</button><button class="lv-btn lv-btn-ghost" type="button" data-st="plain">Send without timing</button></div></aside></div>';
      } else if (S.step === 2) {
        b.innerHTML = '<div class="kk-st-tap"><div class="kk-video"><div class="kk-video-in" data-st-video></div></div>' +
          '<div class="kk-st-lines" data-st-lines>' + S.lines.map(function (l, i) { return '<div class="kk-st-l' + (i === S.at ? ' is-on' : '') + (l.t != null ? ' is-set' : '') + '" data-l="' + i + '"><span class="kk-st-t">' + (l.t == null ? '–:––' : fmt(l.t)) + '</span><span class="kk-st-x">' + esc(l.x) + '</span>' +
            '<span class="kk-st-n"><button type="button" data-nudge="-0.1" data-i="' + i + '">−</button><button type="button" data-nudge="0.1" data-i="' + i + '">+</button></span></div>'; }).join('') + '</div>' +
          '<div class="kk-st-pad"><button class="kk-tap is-idle" type="button" data-st="tap"><b>' + ic('play') + 'PLAY</b><small>start the video, then tap at the first word of each line</small></button>' +
            '<div class="kk-st-row"><button class="lv-btn lv-btn-ghost lv-btn-sm" type="button" data-st="undo">' + ic('back') + 'Undo</button><button class="lv-btn lv-btn-ghost lv-btn-sm" type="button" data-st="slow">' + (S.rate < 1 ? '1× speed' : '0.75× speed') + '</button>' +
            '<button class="lv-btn lv-btn-ghost lv-btn-sm" type="button" data-st="restart">' + kic('replay') + 'From the top</button><button class="lv-btn lv-btn-accent lv-btn-sm" type="button" data-st="to3"' + (S.lines.every(function (l) { return l.t != null; }) ? '' : ' disabled') + '>Check it' + ic('arrowR') + '</button></div></div></div>';
        S.player = new KK.KPlayer(b.querySelector('[data-st-video]'), { videoId: S.song.video_id, controls: true });
        S.player.readyP.then(function () { S.player.setRate(S.rate); });
        /* the pad says what a tap will do: start the video, then time a line */
        S.player.on('state', function (st) {
          var pad = ctx.el.querySelector('[data-st="tap"]'); if (!pad) return;
          pad.classList.toggle('is-idle', st !== 1);
          pad.innerHTML = st === 1 ? '<b>TAP</b><small>at the first word of the highlighted line · or press Space</small>' : '<b>' + ic('play') + 'PLAY</b><small>start the video, then tap at the first word of each line</small>';
        });
      } else {
        b.innerHTML = '<div class="kk-st-check"><div class="kk-video"><div class="kk-video-in" data-st-video></div></div><div class="kk-lyrics" data-st-reel></div>' +
          '<div class="kk-st-row"><button class="lv-btn lv-btn-ghost" type="button" data-st="to2">' + ic('back') + 'Back to timing</button><button class="lv-btn lv-btn-accent" type="button" data-st="send">' + kic('sparkles') + 'Send for review</button></div>' +
          '<p class="kk-muted">The team checks every draft. Once approved, everyone who sings this video sings your timing, with your name on it.</p></div>';
        S.player = new KK.KPlayer(b.querySelector('[data-st-video]'), { videoId: S.song.video_id, controls: true });
        var tl = K.timeline({ synced: true, lines: S.lines.map(function (l) { return { t: l.t, x: l.x }; }) }, { duration: S.song.duration_s || 0 });
        S.reel = new KK.LyricReel(b.querySelector('[data-st-reel]'), tl);
        (function loop() { S.raf = requestAnimationFrame(loop); if (S.player && S.player.ready) S.reel.render(S.player.time() - 0.03); })();
      }
    }
    function fmt(t) { var m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2); }
    function readText() {
      var ta = ctx.el.querySelector('[data-st-text]');
      if (ta) S.text = ta.value;
      var rows = String(S.text || '').split(/\r?\n/).map(function (x) { return x.replace(/\s+/g, ' ').trim(); }).filter(Boolean);
      var old = S.lines;
      S.lines = rows.map(function (x, i) { return { x: x.slice(0, 200), t: old[i] && old[i].x === x ? old[i].t : null }; });
      return rows.length;
    }
    function tap() {
      if (!S.player || !S.player.ready) return;
      if (!S.player.playing()) { S.player.play(); return; }
      if (S.at >= S.lines.length) return;
      var t = Math.max(0, S.player.time() - 0.12);
      var prev = S.at > 0 ? S.lines[S.at - 1].t : -1;
      if (prev != null && t <= prev) t = prev + 0.05;
      S.lines[S.at].t = +t.toFixed(2);
      S.at++;
      paintLines();
    }
    function paintLines() {
      var box = ctx.el.querySelector('[data-st-lines]'); if (!box) return;
      Array.prototype.forEach.call(box.children, function (row, i) {
        row.classList.toggle('is-on', i === S.at); row.classList.toggle('is-set', S.lines[i].t != null);
        row.querySelector('.kk-st-t').textContent = S.lines[i].t == null ? '–:––' : fmt(S.lines[i].t);
      });
      var on = box.children[S.at]; if (on) on.scrollIntoView({ block: 'center', behavior: 'smooth' });
      var go = ctx.el.querySelector('[data-st="to3"]'); if (go) go.disabled = !S.lines.every(function (l) { return l.t != null; });
    }
    function submit(timed) {
      if (!signedIn()) { signIn(location.pathname, 'Sign in to send lyrics: they carry your name.'); return; }
      var lines = S.lines.map(function (l) { return timed ? { t: l.t, x: l.x } : { x: l.x }; });
      rpc('karaoke_lyrics_submit', { p_video: S.song.video_id, p_doc: { lines: lines } }).then(function (r) {
        if (!r || !r.ok) { L.toast(reasonText(r && r.reason)); return; }
        S.draft = { status: r.status };
        L.toast(r.status === 'approved' ? 'Live now for everyone.' : 'Sent. The team will look at it, and you will get a notification.');
        paint();
      }, function () { L.toast('Could not send. Try again.'); });
    }
    ctx.el.addEventListener('click', function (e) {
      var n = e.target.closest('[data-nudge]');
      if (n) { var i = Number(n.getAttribute('data-i')); if (S.lines[i].t != null) { S.lines[i].t = Math.max(0, +(S.lines[i].t + Number(n.getAttribute('data-nudge'))).toFixed(2)); paintLines(); } return; }
      var row = e.target.closest('.kk-st-l');
      if (row && !e.target.closest('button')) { S.at = Number(row.getAttribute('data-l')); if (S.player && S.lines[S.at].t != null) S.player.seek(Math.max(0, S.lines[S.at].t - 2)); paintLines(); return; }
      var b = e.target.closest('[data-st]'); if (!b) return;
      var k = b.getAttribute('data-st');
      if (k === 'to2') { if (S.step === 1 && readText() < 4) { L.toast('At least four lines, please.'); return; } S.step = 2; S.at = Math.max(0, S.lines.findIndex(function (l) { return l.t == null; })); if (S.at < 0) S.at = 0; paint(); }
      else if (k === 'plain') { if (readText() < 4) { L.toast('At least four lines, please.'); return; } submit(false); }
      else if (k === 'tap') tap();
      else if (k === 'undo') { if (S.at > 0) { S.at--; S.lines[S.at].t = null; if (S.player) S.player.seek(Math.max(0, (S.at > 0 ? S.lines[S.at - 1].t : 0) - 1)); paintLines(); } }
      else if (k === 'slow') { S.rate = S.rate < 1 ? 1 : 0.75; if (S.player) S.player.setRate(S.rate); b.textContent = S.rate < 1 ? '1× speed' : '0.75× speed'; }
      else if (k === 'restart') { S.lines.forEach(function (l) { l.t = null; }); S.at = 0; if (S.player) { S.player.seek(0); S.player.play(); } paintLines(); }
      else if (k === 'to3') { S.step = 3; paint(); }
      else if (k === 'send') submit(true);
    });
    function onKey(e) {
      if (S.step !== 2 || /INPUT|TEXTAREA/.test((e.target && e.target.tagName) || '')) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tap(); }
      if (e.key === 'Backspace') { e.preventDefault(); var u2 = ctx.el.querySelector('[data-st="undo"]'); if (u2) u2.click(); }
    }
    doc.addEventListener('keydown', onKey);
    ctx.onLeave(function () { S.alive = false; cancelAnimationFrame(S.raf); if (S.player) S.player.destroy(); doc.removeEventListener('keydown', onKey); });
  };

  /* ══ EVERYTHING YOU HAVE SUNG ══════════════════════════════════ */

  views.me = function (ctx) {
    L.setTab('karaoke');
    L.setMeta('My karaoke');
    if (!signedIn()) { ctx.el.innerHTML = '<div class="kk-page">' + L.ui.empty('mic', 'Your stage, your takes', 'Sign in to see everything you have sung, your challenges and your lyric drafts.', '<a class="lv-btn lv-btn-accent" href="' + esc(L.signInUrl(location.pathname)) + '" rel="external">' + kic('mic') + 'Sign in</a>') + '</div>'; return; }
    var me = KK.me(), c = L.sb();
    ctx.el.innerHTML = '<div class="kk-page"><div class="kk-room-load"><span class="kk-spin kk-spin-lg"></span></div></div>';
    Promise.all([
      KK.loadState(),
      Promise.resolve(c.from('karaoke_performances').select('id,video_id,status,score,grade,visibility,ranked,verified,vip,room_id,created_at,expires_at,cheers,plays').eq('user_id', me).neq('status', 'discarded').order('created_at', { ascending: false }).limit(80)).then(function (r) { return (r && r.data) || []; }),
      Promise.resolve(c.from('karaoke_challenges').select('id,kind,video_id,status,winner,a_user,b_user,a_stage,b_stage,votes_a,votes_b,created_at').or('a_user.eq.' + me + ',b_user.eq.' + me).order('created_at', { ascending: false }).limit(30)).then(function (r) { return (r && r.data) || []; }),
      Promise.resolve(c.from('karaoke_lyric_drafts').select('id,video_id,status,lines,synced,note,created_at').eq('user_id', me).order('created_at', { ascending: false }).limit(30)).then(function (r) { return (r && r.data) || []; }, function () { return []; })
    ]).then(function (r) {
      var perfs = r[1], chs = r[2], drafts = r[3];
      return attachSongs(perfs.concat(chs).concat(drafts)).then(function () {
        var st = KK.state || {};
        var scored = perfs.filter(function (p) { return p.status === 'scored'; });
        var best = scored.reduce(function (m, p) { return Math.max(m, p.score || 0); }, 0);
        var avg = scored.length ? Math.round(scored.reduce(function (s, p) { return s + (p.score || 0); }, 0) / scored.length) : null;
        var wins = chs.filter(function (x) { return x.status === 'done' && ((x.winner === 'a' && x.a_user === me) || (x.winner === 'b' && x.b_user === me)); }).length;
        ctx.el.innerHTML = '<div class="kk-page kk-me">' +
          '<header class="lv-head" style="padding-left:0;padding-right:0"><div class="lv-head-k">Cabana Karaoke</div><h1>My karaoke</h1><p>' + quotaHTML(st) + '</p></header>' +
          '<div class="kk-stats"><div><b>' + scored.length + '</b><small>songs judged</small></div><div><b>' + (best || '–') + '</b><small>best score</small></div><div><b>' + (avg == null ? '–' : avg) + '</b><small>average</small></div><div><b>' + wins + '</b><small>sing-offs won</small></div></div>' +
          '<section class="kk-panel"><div class="kk-panel-h"><h2>' + kic('mic') + ' Your takes</h2><button class="lv-btn lv-btn-accent lv-btn-sm" type="button" data-kk="sing">' + kic('mic') + 'Sing</button></div>' +
            (perfs.length ? '<div class="kk-takes">' + perfs.map(function (p) {
              var g = KK.gradeOf(p.score);
              return '<a class="kk-take" href="' + perfHref(p.id) + '"><img src="' + thumb(p.video_id, 'mqdefault') + '" alt="" loading="lazy"/><span class="kk-take-t"><b>' + esc(KK.songName(p.song || {})) + '</b><small>' + esc(ago(p.created_at)) + ' · ' +
                (p.status === 'scored' ? (p.verified ? 'judged' : 'unverified') : p.status) + ' · ' + (p.visibility === 'public' ? 'public' : p.visibility === 'link' ? 'link' : 'private') + (p.ranked ? ' · ranked' : '') + '</small></span>' +
                '<span class="kk-take-s g-' + g.letter.replace('+', 'p') + '">' + (p.score == null ? '–' : p.score) + '<small>' + (p.score == null ? '' : g.letter) + '</small></span></a>';
            }).join('') + '</div>' : '<p class="kk-muted">Nothing yet. Your first song is one tap away.</p>') + '</section>' +
          (chs.length ? '<section class="kk-panel"><div class="kk-panel-h"><h2>' + kic('swords') + ' Your sing-offs</h2></div><div class="kk-takes">' + chs.map(function (x) {
            var mineA = x.a_user === me, other = mineA ? x.b_stage : x.a_stage;
            var result = x.status === 'done' ? (x.winner === 'draw' ? 'Draw' : ((x.winner === 'a') === mineA ? 'Won' : 'Lost')) : x.status;
            return '<a class="kk-take" href="' + chHref(x.id) + '"><img src="' + thumb(x.video_id, 'mqdefault') + '" alt="" loading="lazy"/><span class="kk-take-t"><b>vs ' + esc(other ? name(other) : 'anyone') + '</b><small>' + esc(KK.songName(x.song || {})) + ' · ' + esc(ago(x.created_at)) + '</small></span><span class="kk-chip kk-chip-' + (result === 'Won' ? 'gold' : 'plain') + '">' + esc(result) + '</span></a>';
          }).join('') + '</div></section>' : '') +
          (drafts.length ? '<section class="kk-panel"><div class="kk-panel-h"><h2>' + kic('pen') + ' Your lyric drafts</h2></div><div class="kk-takes">' + drafts.map(function (d) {
            return '<a class="kk-take" href="' + KK.href.studio(d.video_id) + '"><img src="' + thumb(d.video_id, 'mqdefault') + '" alt="" loading="lazy"/><span class="kk-take-t"><b>' + esc(KK.songName(d.song || {})) + '</b><small>' + d.lines + ' lines' + (d.synced ? ', timed' : '') + ' · ' + esc(ago(d.created_at)) + (d.note ? ' · “' + esc(d.note) + '”' : '') + '</small></span><span class="kk-chip kk-chip-' + (d.status === 'approved' ? 'lime' : d.status === 'pending' ? 'gold' : 'muted') + '">' + esc(d.status) + '</span></a>';
          }).join('') + '</div></section>' : '') +
        '</div>';
      });
    }).catch(function () { ctx.el.innerHTML = '<div class="kk-page">' + L.ui.empty('mic', 'Could not load your karaoke', 'Try again in a moment.', '') + '</div>'; });
    ctx.el.addEventListener('click', function (e) {
      if (e.target.closest('[data-kk="sing"]')) KK.pickSong().then(function (s) { L.go(singHref(s.video_id)); });
    });
  };

  /* Clicks that can come from anywhere on a karaoke page. */
  doc.addEventListener('click', function (e) {
    var s = e.target.closest && e.target.closest('[data-kk-studio]');
    if (s && !s.closest('.kk-solo')) { e.preventDefault(); KK.pickSong({ title: 'Which song needs lyrics?' }).then(function (song) { L.go(KK.href.studio(song.video_id)); }); }
  });

  L.emit('karaoke-views');
})(window);
