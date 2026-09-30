/* ═══════════════════════════════════════════════════════════════════
   CABANA KARAOKE · lyrics
   ───────────────────────────────────────────────────────────────────
   Everything the karaoke stage knows about words, shared by the page
   (live matching while someone sings) and the server (verifying the
   recording afterwards), so both judge a performance by one rulebook.

     parseLRC(text)        [mm:ss.xx] lines, enhanced <mm:ss.xx> words,
                           [offset:] tags, several stamps on one line
     timeline(doc, opts)   lines and tokens with a start and an end for
                           every word. Real word timing when the source
                           has it; otherwise estimated from syllables,
                           the way a karaoke wipe is paced by hand.
     norm / phon / sim     what counts as "the same word" when a speech
                           recogniser hears a singer: spelling variants,
                           numbers, dropped g's, sound-alikes
     StreamMatcher         live: recogniser words → lyric tokens, inside
                           a moving window, never jumping backwards
     align(tokens, heard)  after the song: a banded alignment of every
                           word Whisper heard (with timestamps) against
                           the lyric, which also measures how far the
                           lyric clock was off for this video
     finalScore / grade    the one scoring formula

   Words in parentheses are backing vocals. They are shown, never
   scored. "Oh", "yeah" and friends count for a quarter of a word:
   recognisers rarely write them down and nobody should lose a battle
   over an "ooh".
   ═══════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var K = {};

  function set(s) { var o = {}; s.split(/\s+/).forEach(function (w) { if (w) o[w] = 1; }); return o; }

  var FILLERS = set('oh ooh oooh ohh ah ahh aah uh uhh um umm mm mmm hmm yeah yeh yea yeahh hey whoa woah wo woo woohoo hoo la lala na nana da dum doo ay ayy eh ehh oi yo huh ha haha ye');
  var FUNCTION = set('a an the to of in on at by for and or but is it its i im you youre me my we us our your he she they them his her be am are was were so do did not no yes that this if as with from up down out off all just then than there here what when where who how can will would could should na ya wa kwa ni si za la cha ki vi zi pa ku mu');
  var VARIANTS = {
    gonna: 'going', wanna: 'want', gotta: 'got', gimme: 'give', lemme: 'let', cause: 'because', cuz: 'because', coz: 'because',
    cos: 'because', bc: 'because', til: 'until', till: 'until', tho: 'though', thru: 'through', ya: 'you', yall: 'you', u: 'you',
    lil: 'little', em: 'them', ok: 'okay', okey: 'okay', n: 'and', an: 'and', nothin: 'nothing', somethin: 'something',
    everythin: 'everything', luv: 'love', ur: 'your', r: 'are', imma: 'going', ima: 'going', aint: 'not',
    tryna: 'trying', kinda: 'kind', sorta: 'sort', outta: 'out', dunno: 'know', gon: 'going', finna: 'going', bout: 'about',
    mornin: 'morning', nite: 'night', tonite: 'tonight', thang: 'thing', da: 'the', dat: 'that', dis: 'this', dem: 'them'
  };
  var NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen',
    'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
  var TENS = { 30: 'thirty', 40: 'forty', 50: 'fifty', 60: 'sixty', 70: 'seventy', 80: 'eighty', 90: 'ninety', 100: 'hundred', 1000: 'thousand' };
  var SW = set('na ya wa kwa ni si za la cha nini wewe mimi yeye sisi nyinyi wao nakupenda nataka sana tu hii huyo kama lakini bado mpenzi moyo maisha mungu yesu baba mama nitakupenda sitaki unajua najua sijui leo kesho jana rafiki nyumbani penzi pendo roho mapenzi uko niko yako yangu wangu wako nikupe tena hapa pale sasa kila kitu watu mtu mtoto dunia raha shida nawe nami ndio hapana bwana dada kaka nakuomba nitakuwa tuko twende kuja enda wacha acha');
  var EN = set('the and you i to me my love in it is of that we your all be for on with so baby what dont know just like when no oh yeah can this was up get go one now night heart feel never want time way will make got');

  function strip(s) {
    s = String(s == null ? '' : s);
    try { s = s.normalize('NFKD').replace(/[̀-ͯ]/g, ''); } catch (e) {}
    return s;
  }

  /* One word as a recogniser would spell it. */
  function norm(w) {
    var s = strip(w).toLowerCase();
    s = s.replace(/in['’`]$/, 'ing').replace(/['’`]/g, '').replace(/[^a-z0-9]/g, '');
    if (!s) return '';
    if (/^\d+$/.test(s)) {
      var n = Number(s);
      if (n <= 20) return NUM[n];
      if (TENS[n]) return TENS[n];
      return s;
    }
    if (VARIANTS.hasOwnProperty(s)) return VARIANTS[s];
    return s;
  }
  K.norm = norm;

  /* A sound-alike key, loose on purpose but not careless: a singer's
     "nite" and a recogniser's "night" must meet; "love" and "live",
     "heart" and "hurt" must not. The consonant skeleton carries the
     word and the first vowel's class (a / e-i-y / o-u) keeps the pairs
     that differ only in their vowel apart. */
  function vclass(v) { return v === 'a' ? 'A' : (v === 'o' || v === 'u') ? 'U' : 'I'; }
  function phon(w) {
    var s = norm(w);
    if (!s) return '';
    s = s.replace(/^kn|^gn|^pn/, 'n').replace(/^wr/, 'r').replace(/^wh/, 'w').replace(/^x/, 's')
      .replace(/ph/g, 'f').replace(/gh(?![aeiou])/g, '').replace(/ck/g, 'k').replace(/q/g, 'k')
      .replace(/x/g, 'ks').replace(/dg(?=[eiy])/g, 'j').replace(/tch/g, 'ch').replace(/sch/g, 'sk')
      .replace(/th/g, 't').replace(/sh/g, 's').replace(/ch/g, 'k').replace(/c(?=[eiy])/g, 's').replace(/c/g, 'k')
      .replace(/z/g, 's').replace(/v/g, 'f').replace(/ing$/, 'in')
      .replace(/([^aeiouy])e$/, '$1');
    var head = s.charAt(0), tail = s.slice(1), key;
    if (/[aeiouy]/.test(head)) key = vclass(head) + tail.replace(/[aeiouyhw]/g, '');
    else {
      var fv = /[aeiouy]/.exec(tail);
      key = head + (fv ? vclass(fv[0]) : '') + tail.replace(/[aeiouyhw]/g, '');
    }
    return key.replace(/(.)\1+/g, '$1');
  }
  K.phon = phon;

  function lev(a, b) {
    if (a === b) return 0;
    var m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    var prev = new Array(n + 1), cur = new Array(n + 1), i, j;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur[0] = i;
      var ca = a.charCodeAt(i - 1);
      for (j = 1; j <= n; j++) {
        var c = ca === b.charCodeAt(j - 1) ? 0 : 1;
        var x = prev[j] + 1, y = cur[j - 1] + 1, z = prev[j - 1] + c;
        cur[j] = x < y ? (x < z ? x : z) : (y < z ? y : z);
      }
      var t = prev; prev = cur; cur = t;
    }
    return prev[n];
  }
  K.lev = lev;

  /* How alike two normalised words are, 0..1. The phonetic keys may be
     passed in when the caller already holds them. */
  function sim(a, b, pa, pb) {
    if (!a || !b) return 0;
    if (a === b) return 1;
    var la = a.length, lb = b.length, L = la > lb ? la : lb;
    if (L <= 2) return 0;
    if (pa == null) pa = phon(a);
    if (pb == null) pb = phon(b);
    if (pa && pa === pb && (la >= 3 && lb >= 3)) return 0.86;
    /* Plurals and tense: "dream"/"dreams", "love"/"loved". */
    if ((la >= 4 || lb >= 4) && (a.indexOf(b) === 0 || b.indexOf(a) === 0) && Math.abs(la - lb) <= 2) return 0.8;
    if (Math.abs(la - lb) > 3) return 0;
    var r = 1 - lev(a, b) / L;
    if (r >= 0.8) return 0.78;
    if (r >= 0.66 && L >= 5) return 0.62;
    return 0;
  }
  K.sim = sim;

  function syllables(w) {
    var s = strip(w).toLowerCase().replace(/[^a-z]/g, '');
    if (!s) return 1;
    if (s.length <= 3) return 1;
    var groups = s.match(/[aeiouy]+/g);
    var n = groups ? groups.length : 1;
    if (n > 1 && /[^aeiou]e$/.test(s) && !/le$/.test(s)) n -= 1;
    if (n > 1 && /[^aeiou]es$|[^aeiou]ed$/.test(s) && !/[td]ed$|[sxz]es$|[cs]hes$/.test(s)) n -= 1;
    return Math.max(1, Math.min(8, n));
  }
  K.syllables = syllables;

  function weightOf(n, backing) {
    if (backing || !n) return 0;
    if (FILLERS[n]) return 0.25;
    if (FUNCTION[n] || n.length <= 2) return 0.6;
    return n.length >= 7 ? 1.2 : 1;
  }
  K.weightOf = weightOf;

  /* ── parsing ─────────────────────────────────────────────────────── */

  function stamp(s) {
    var m = /^\s*(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\s*$/.exec(s);
    if (!m) return null;
    var frac = m[3] ? Number(m[3]) / Math.pow(10, m[3].length) : 0;
    return Number(m[1]) * 60 + Number(m[2]) + frac;
  }
  K.stamp = stamp;

  /* LRC → { lines:[{t, x, w?:[{t, x}]}], meta } in seconds, sorted.
     Empty stamped lines are kept as breaks: they end the line before. */
  function parseLRC(text) {
    var meta = {}, out = [];
    String(text || '').split(/\r?\n/).forEach(function (raw) {
      var line = raw.trim();
      if (!line) return;
      var tag = /^\[([a-z#]+):(.*)\]$/i.exec(line);
      if (tag && !/^\d/.test(tag[1])) { meta[tag[1].toLowerCase()] = tag[2].trim(); return; }
      var times = [], m, rx = /\[(\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?)\]/g, last = 0;
      while ((m = rx.exec(line)) && m.index === last) { var t = stamp(m[1]); if (t != null) times.push(t); last = rx.lastIndex; }
      if (!times.length) return;
      var body = line.slice(last).trim();
      var words = null;
      if (/<\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?>/.test(body)) {
        words = [];
        var parts = body.split(/(<\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?>)/), cur = null;
        parts.forEach(function (p) {
          var st = /^<(.+)>$/.exec(p);
          if (st) { cur = stamp(st[1]); return; }
          if (cur == null) return;
          p.split(/(\s+)/).forEach(function (piece) {
            if (!piece || /^\s+$/.test(piece)) return;
            words.push({ t: cur, x: piece });
          });
        });
        body = words.map(function (w) { return w.x; }).join(' ');
      }
      times.forEach(function (t) { out.push({ t: t, x: body, w: words ? words.map(function (w, i) { return { t: w.t - times[0] + t, x: w.x }; }) : null }); });
    });
    var off = Number(meta.offset || 0) / 1000;
    if (off) out.forEach(function (l) { l.t = Math.max(0, l.t - off); if (l.w) l.w.forEach(function (w) { w.t = Math.max(0, w.t - off); }); });
    out.sort(function (a, b) { return a.t - b.t; });
    return { lines: out, meta: meta };
  }
  K.parseLRC = parseLRC;

  /* Plain lyrics with no clock: lines only. The stage can still follow
     a singer through them by voice. */
  function parsePlain(text) {
    return String(text || '').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean).map(function (x) { return { t: null, x: x }; });
  }
  K.parsePlain = parsePlain;

  /* ── the timeline ────────────────────────────────────────────────
     doc = { synced, lines:[{t, e?, x, w?:[{t, e?, x}]}] } (seconds)
     → { lines:[{i, t, e, x, toks:[…]}], tokens:[…], synced, words, lang } */
  /* A hyphenated word ("well-known") is two tokens for scoring, because
     a recogniser writes two words, and one word on screen (j: joined). */
  function splitDash(chunk) {
    var pieces = [], cur = '';
    for (var c = 0; c < chunk.length; c++) {
      var ch = chunk.charAt(c);
      cur += ch;
      if ((ch === '-' || ch === '–' || ch === '—') && cur.length > 1 && c < chunk.length - 1) { pieces.push(cur); cur = ''; }
    }
    if (cur) pieces.push(cur);
    return pieces;
  }
  function tokenize(x) {
    var toks = [], depth = 0;
    String(x || '').replace(/\s+/g, ' ').trim().split(' ').forEach(function (chunk) {
      if (!chunk) return;
      splitDash(chunk).forEach(function (piece, k) {
        var opens = (piece.match(/\(/g) || []).length, closes = (piece.match(/\)/g) || []).length;
        var inside = depth > 0 || opens > 0;
        depth = Math.max(0, depth + opens - closes);
        toks.push({ x: piece, n: norm(piece), b: inside, j: k > 0 });
      });
    });
    return toks;
  }
  K.tokenize = tokenize;

  function timeline(doc, opts) {
    opts = opts || {};
    var src = (doc && doc.lines) || [];
    var synced = !!(doc && doc.synced !== false && src.length && src[0].t != null);
    var words = synced && src.some(function (l) { return l.w && l.w.length; });
    var dur = Number(opts.duration) || 0;
    var lines = [], tokens = [];
    var clean = src.filter(function (l) { return l && (synced ? isFinite(l.t) : true); });

    for (var i = 0; i < clean.length; i++) {
      var l = clean[i];
      var text = String(l.x || '').trim();
      var next = null;
      for (var k = i + 1; k < clean.length; k++) { if (clean[k].t != null) { next = clean[k].t; break; } }
      if (!text) continue;
      var toks = tokenize(text);
      if (!toks.length) continue;
      var start = synced ? Number(l.t) : null, end = null;
      if (synced) {
        var hard = l.e != null ? Number(l.e) : (next != null ? next : (dur ? Math.min(dur, start + 8) : start + 6));
        var syl = toks.reduce(function (s, t) { return s + (t.b ? 0.6 : 1) * syllables(t.x); }, 0);
        var natural = Math.max(0.8, syl * 0.34 + 0.35);
        var avail = Math.max(0.3, hard - start);
        end = l.e != null ? Number(l.e) : start + Math.min(avail * 0.94, Math.max(0.8, natural * 1.15));
        if (words && l.w && l.w.length === toks.length) {
          toks.forEach(function (t, j) {
            t.t = Number(l.w[j].t);
            t.e = l.w[j].e != null ? Number(l.w[j].e) : (j + 1 < toks.length ? Number(l.w[j + 1].t) : end);
          });
        } else if (words && l.w && l.w.length) {
          /* Word stamps that do not tokenise one-to-one: pace by syllables
             inside the real line bounds rather than guess an alignment. */
          end = l.w[l.w.length - 1].e != null ? Number(l.w[l.w.length - 1].e) : end;
          pace(toks, start, end);
        } else {
          pace(toks, start, end);
        }
      }
      var line = { i: lines.length, t: start, e: end, x: text, toks: toks };
      var exactWords = words && l.w && l.w.length === toks.length;
      var firstSung = -1;
      toks.forEach(function (t, j) {
        t.li = line.i; t.i = tokens.length; t.p = phon(t.n); t.wt = weightOf(t.n, t.b);
        if (firstSung < 0 && !t.b) firstSung = j;
        /* q: this token's moment is known, not estimated. Only such
           tokens are trusted to measure the lyric clock's offset. */
        t.q = synced && (exactWords || j === firstSung) ? 1 : 0;
        tokens.push(t);
      });
      lines.push(line);
    }
    return { lines: lines, tokens: tokens, synced: synced, words: words, lang: lang(tokens) };
  }
  function pace(toks, start, end) {
    var weights = toks.map(function (t) { return 0.35 + syllables(t.x) * (t.b ? 0.6 : 1); });
    var total = weights.reduce(function (a, b) { return a + b; }, 0) || 1;
    var span = Math.max(0.2, end - start), at = start;
    toks.forEach(function (t, j) {
      var d = span * weights[j] / total;
      t.t = at; t.e = at + d; at += d;
    });
  }
  K.timeline = timeline;

  function lang(tokens) {
    var sw = 0, en = 0;
    tokens.forEach(function (t) { if (SW[t.n]) sw++; if (EN[t.n]) en++; });
    if (sw + en < 4) return 'en';
    var r = sw / (sw + en);
    return r > 0.62 ? 'sw' : r < 0.38 ? 'en' : 'mixed';
  }
  K.lang = lang;

  /* Where a clock says the singer is: the line and token under t. */
  K.lineAt = function (tl, t) {
    var L = tl.lines, lo = 0, hi = L.length - 1, ans = -1;
    while (lo <= hi) { var mid = (lo + hi) >> 1; if (L[mid].t <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
    return ans;
  };

  /* ── live matching ───────────────────────────────────────────────
     A recogniser reports words late (typically 0.4–1.5 s after they are
     sung) and rewrites its interim guesses. The matcher only ever looks
     for a heard word among lyric tokens around "now", prefers the next
     unsung token, never goes back more than a few words, and treats a
     rewritten interim result as a fresh set of candidates. A token once
     heard stays heard: the verdict that counts comes after the song. */
  function StreamMatcher(tl, opts) {
    this.tl = tl;
    this.o = Object.assign({ back: 7, ahead: 1.6, lag: 0.9, reach: 12 }, opts || {});
    this.hit = new Float32Array(tl.tokens.length);
    this.when = new Float32Array(tl.tokens.length);
    this.cursor = 0;
    this.seen = {};
    this.combo = 0; this.best = 0;
    this.judged = 0;
    this.lastHit = -1;
  }
  StreamMatcher.prototype.feed = function (resultKey, words, songTime) {
    var tl = this.tl, toks = tl.tokens, o = this.o, out = [];
    var used = this.seen[resultKey] || (this.seen[resultKey] = {});
    for (var w = 0; w < words.length; w++) {
      var n = norm(words[w]);
      if (!n) continue;
      if (used[w] && used[w].n === n) continue;
      var p = phon(n), heardAt = songTime - o.lag;
      var from = Math.max(0, this.cursor - 3), best = -1, bestScore = 0;
      for (var i = from; i < toks.length && i < this.cursor + o.reach; i++) {
        var t = toks[i];
        if (t.b || this.hit[i]) continue;
        if (t.t != null && (t.t > heardAt + o.ahead || t.e < heardAt - o.back)) { if (t.t > heardAt + o.ahead) break; continue; }
        var s = sim(n, t.n, p, t.p);
        if (!s) continue;
        if (s < 0.99 && (FILLERS[t.n] || t.n.length <= 2)) continue;
        var dist = i - this.cursor;
        var score = s - (dist < 0 ? 0.08 * -dist : 0.035 * dist);
        if (score > bestScore) { bestScore = score; best = i; }
      }
      if (best >= 0 && bestScore >= 0.5) {
        this.hit[best] = sim(n, toks[best].n, p, toks[best].p);
        this.when[best] = heardAt;
        used[w] = { n: n, i: best };
        if (best >= this.cursor) this.cursor = best + 1;
        out.push(best);
      }
    }
    return out;
  };
  /* Called on the clock: tokens whose moment has clearly passed are
     judged, which is what moves the combo and the running accuracy. */
  StreamMatcher.prototype.judge = function (songTime, all) {
    var toks = this.tl.tokens, changed = [];
    while (this.judged < toks.length) {
      var t = toks[this.judged];
      /* Timed lyrics are judged by the clock; plain lyrics (followed by
         voice alone) once the singer has clearly moved past a word; at
         the end of the song, everything left. */
      if (!all && (t.e == null ? this.judged >= this.cursor - 3 : t.e > songTime - (this.o.lag + 1.4))) break;
      if (!t.b && t.wt >= 0.6) {
        if (this.hit[this.judged]) { this.combo++; if (this.combo > this.best) this.best = this.combo; }
        else this.combo = 0;
      }
      changed.push(this.judged);
      this.judged++;
      if (this.cursor < this.judged - 2 && !this.hit[this.judged - 1]) this.cursor = Math.max(this.cursor, this.judged - 2);
    }
    return changed;
  };
  StreamMatcher.prototype.accuracy = function (upTo) {
    var toks = this.tl.tokens, num = 0, den = 0;
    var end = upTo == null ? this.judged : Math.min(upTo, toks.length);
    for (var i = 0; i < end; i++) { var t = toks[i]; if (!t.wt) continue; den += t.wt; num += t.wt * this.hit[i]; }
    return den ? num / den : null;
  };
  K.StreamMatcher = StreamMatcher;

  /* ── verification alignment ──────────────────────────────────────
     tokens: the timeline's tokens (backing tokens are skipped)
     heard:  [{w, t0, t1}] words with timestamps from Whisper
     1. Estimate the lyric clock's offset for this video from the words
        both sides agree on (distinctive words only), by vote.
     2. Align in order with a band around that offset. A match earns its
        similarity scaled by how close in time it is; skipping a lyric
        word costs its weight; an extra heard word costs a little.
     Returns per-token hits, lyric accuracy, timing and the offset. */
  function align(tokens, heard, opts) {
    opts = opts || {};
    var exp = tokens.filter(function (t) { return !t.b && t.n; });
    var hw = (heard || []).map(function (h) { var n = norm(h.w); return { n: n, p: phon(n), t: Number(h.t0) || 0, e: Number(h.t1) || Number(h.t0) || 0 }; })
      .filter(function (h) { return h.n; })
      .sort(function (a, b) { return a.t - b.t; });
    var result = { hits: {}, accuracy: 0, weight: 0, offset: 0, offsetVotes: 0, timing: null, matched: 0, heard: hw.length, expected: exp.length };
    if (!exp.length) return result;
    var totalW = exp.reduce(function (s, t) { return s + t.wt; }, 0);
    result.weight = totalW;
    if (!hw.length) return result;
    /* Lyrics with no clock at all (plain text) are aligned by order
       alone: every heard word may pair with any lyric word, in sequence,
       and nothing is said about timing or the video's offset. */
    var untimed = exp[0].t == null;

    /* 1 · offset by vote */
    var bins = {}, votes = 0, bw = 0.25, range = untimed ? -1 : (opts.range || 20);
    for (var i = 0; i < exp.length && !untimed; i++) {
      var e = exp[i];
      if (e.n.length < 4 || FILLERS[e.n] || FUNCTION[e.n]) continue;
      for (var j = 0; j < hw.length; j++) {
        var h = hw[j];
        var d = h.t - e.t;
        if (d < -range || d > range) continue;
        if (h.n !== e.n && !(h.p && h.p === e.p && h.n.length >= 4)) continue;
        var b = Math.round(d / bw);
        bins[b] = (bins[b] || 0) + 1; votes++;
      }
    }
    var bestBin = 0, bestN = 0;
    Object.keys(bins).forEach(function (k) {
      var n = (bins[k] || 0) + 0.6 * ((bins[+k - 1] || 0) + (bins[+k + 1] || 0));
      if (n > bestN) { bestN = n; bestBin = +k; }
    });
    var off = untimed ? 0 : bestN >= 3 ? bestBin * bw : (opts.offset || 0);

    /* 2 · banded alignment */
    var n = exp.length, m = hw.length, BAND = opts.band || 6;
    var NEG = -1e9;
    var S = new Float32Array((n + 1) * (m + 1));
    var B = new Uint8Array((n + 1) * (m + 1));
    var W = m + 1;
    var lo = new Int32Array(n + 1), hi = new Int32Array(n + 1);
    for (i = 0; i <= n; i++) {
      if (i === 0 || untimed) { lo[i] = 0; hi[i] = m; continue; }
      var te = exp[i - 1].t + off, a = 0, z = m;
      while (a < m && hw[a].t < te - BAND) a++;
      z = a; while (z < m && hw[z].t <= te + BAND) z++;
      lo[i] = Math.max(0, a); hi[i] = Math.min(m, z);
    }
    for (var c = 0; c < S.length; c++) S[c] = NEG;
    S[0] = 0;
    for (j = 1; j <= m; j++) { S[j] = S[j - 1] - 0.15; B[j] = 2; }
    for (i = 1; i <= n; i++) {
      var ex = exp[i - 1], skipCost = 0.35 * ex.wt + 0.05;
      var rowBase = i * W, prevBase = (i - 1) * W;
      var bandLo = lo[i], bandHi = hi[i];
      S[rowBase] = S[prevBase] - skipCost; B[rowBase] = 1;
      for (j = 1; j <= m; j++) {
        var best = S[prevBase + j] - skipCost, how = 1;
        var left = S[rowBase + j - 1] - 0.15;
        if (left > best) { best = left; how = 2; }
        /* heard word j-1 may only pair with this lyric word inside the band */
        if (j > bandLo && j <= bandHi) {
          var hh = hw[j - 1];
          var s = sim(hh.n, ex.n, hh.p, ex.p);
          if (s > 0 && s < 0.99 && (FILLERS[ex.n] || ex.n.length <= 2)) s = 0;
          if (s > 0) {
            var dt = untimed ? 0 : Math.abs(hh.t - (ex.t + off));
            var tf = dt <= 1.2 ? 1 : dt >= 5 ? 0.25 : 1 - (dt - 1.2) / 3.8 * 0.75;
            var diag = S[prevBase + j - 1] + s * tf * (0.6 + ex.wt);
            if (diag > best) { best = diag; how = 3; }
          }
        }
        S[rowBase + j] = best; B[rowBase + j] = how;
      }
    }
    /* trace back */
    i = n; j = m;
    var hits = {}, dts = [], dtsExact = [], num = 0, matched = 0;
    while (i > 0 || j > 0) {
      var how2 = B[i * W + j];
      if (i > 0 && j > 0 && how2 === 3) {
        var ex2 = exp[i - 1], h2 = hw[j - 1];
        var s2 = sim(h2.n, ex2.n, h2.p, ex2.p);
        var dt2 = untimed ? 0 : h2.t - (ex2.t + off);
        var tf2 = Math.abs(dt2) <= 1.2 ? 1 : Math.abs(dt2) >= 5 ? 0.25 : 1 - (Math.abs(dt2) - 1.2) / 3.8 * 0.75;
        var conf = Math.min(1, s2 * (0.55 + 0.45 * tf2));
        hits[ex2.i] = { c: +conf.toFixed(3), t: +h2.t.toFixed(2) };
        num += ex2.wt * conf; matched++;
        if (!untimed && s2 >= 0.86 && ex2.n.length >= 2) { dts.push(dt2); if (ex2.q) dtsExact.push(dt2); }
        i--; j--;
      } else if (i > 0 && (how2 === 1 || j === 0)) { i--; }
      else { j--; }
    }
    /* Only words whose moment is known measure the clock; estimated word
       positions inside a line would drag the offset towards the pacing. */
    var ref = dtsExact.length >= 3 ? dtsExact : dts;
    ref.sort(function (x, y) { return x - y; });
    var med = ref.length ? ref[ref.length >> 1] : 0;
    var spread = ref.length ? ref.map(function (x) { return Math.abs(x - med); }).sort(function (x, y) { return x - y; })[ref.length >> 1] : null;
    result.hits = hits;
    result.accuracy = totalW ? num / totalW : 0;
    result.matched = matched;
    result.offset = +(off + med).toFixed(2);
    result.offsetVotes = ref.length;
    /* Timing: how tightly the words land around their own moment, once
       the video's offset is accounted for. 0.15 s spread is a pro. */
    result.timing = spread == null ? null : Math.max(0, Math.min(1, 1 - (spread - 0.15) / 0.9));
    return result;
  }
  K.align = align;

  /* ── scoring ─────────────────────────────────────────────────────
     parts: { lyrics, pitch, timing, expression } each 0..1 or null.
     A part that could not be measured drops out and the rest are
     re-weighted, so an unsupported browser is never punished. */
  var WEIGHTS = { lyrics: 0.45, pitch: 0.25, timing: 0.2, expression: 0.1 };
  K.WEIGHTS = WEIGHTS;
  K.finalScore = function (parts) {
    var num = 0, den = 0;
    /* The words are the backbone. When a song has lyrics, pitch, timing
       and feel only count as far as the words were actually sung: a
       lovely hum over the wrong words (or over a song stopped early)
       is not a performance of the song. Freestyle has no gate. */
    var ly = parts && parts.lyrics;
    var gate = ly != null && isFinite(ly) ? Math.max(0.25, Math.min(1, ly / 0.5)) : 1;
    Object.keys(WEIGHTS).forEach(function (k) {
      var v = parts && parts[k];
      if (v == null || !isFinite(v)) return;
      num += WEIGHTS[k] * Math.max(0, Math.min(1, v)) * (k === 'lyrics' ? 1 : gate); den += WEIGHTS[k];
    });
    if (!den) return 0;
    /* A gentle curve: a solid amateur lands in the seventies, and a
       hundred still needs every part near perfect. */
    var raw = num / den;
    var curved = Math.pow(raw, 0.82);
    return Math.max(0, Math.min(100, Math.round(curved * 100)));
  };
  var GRADES = [[97, 'S+', 'Legend'], [90, 'S', 'Headliner'], [80, 'A', 'Showstopper'], [70, 'B', 'Crowd pleaser'], [60, 'C', 'Rising star'], [45, 'D', 'Warming up'], [0, 'E', 'Shower singer']];
  K.GRADES = GRADES;
  K.grade = function (score) {
    for (var i = 0; i < GRADES.length; i++) if (score >= GRADES[i][0]) return { letter: GRADES[i][1], title: GRADES[i][2] };
    return { letter: 'E', title: 'Shower singer' };
  };

  /* ── the voice ───────────────────────────────────────────────────
     A contour is the singer's pitch and loudness, ten frames a second
     of recording time, two bytes a frame:
       pitch   0 = no pitch; otherwise 1 + round((midi − 36) × 4), a
               quarter-semitone ladder from C2 (65 Hz) to D#7
       energy  round((dBFS + 90) × 2.5), 0..255
     A melody is what Cabana has learned a video's tune to be, from
     everyone who sang it well: ten frames a second of song time,
     [1 + pitch class in quarter-semitones (0..47), confidence]. Pitch
     classes, not notes, so a bass and a soprano teach the same tune. */
  var FPS = 10;
  K.FPS = FPS;
  K.pitchCode = function (midi) { if (midi == null || !isFinite(midi)) return 0; var c = 1 + Math.round((midi - 36) * 4); return c < 1 ? 1 : c > 255 ? 255 : c; };
  K.codeMidi = function (code) { return code ? 36 + (code - 1) / 4 : null; };
  K.energyCode = function (db) { var c = Math.round((db + 90) * 2.5); return c < 0 ? 0 : c > 255 ? 255 : c; };
  K.codeDb = function (code) { return code / 2.5 - 90; };

  var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  var B64R = {};
  for (var bi = 0; bi < 64; bi++) B64R[B64.charAt(bi)] = bi;
  K.b64 = function (bytes) {
    var out = '', i = 0, n = bytes.length;
    for (; i + 2 < n; i += 3) {
      var v = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
      out += B64.charAt(v >> 18 & 63) + B64.charAt(v >> 12 & 63) + B64.charAt(v >> 6 & 63) + B64.charAt(v & 63);
    }
    if (i < n) {
      var r = bytes[i] << 16 | (i + 1 < n ? bytes[i + 1] << 8 : 0);
      out += B64.charAt(r >> 18 & 63) + B64.charAt(r >> 12 & 63) + (i + 1 < n ? B64.charAt(r >> 6 & 63) : '=') + '=';
    }
    return out;
  };
  K.unb64 = function (s) {
    s = String(s || '').replace(/[^A-Za-z0-9+/]/g, '');
    var n = Math.floor(s.length * 3 / 4), out = new Uint8Array(n), o = 0;
    for (var i = 0; i < s.length; i += 4) {
      var a = B64R[s.charAt(i)] || 0, b = B64R[s.charAt(i + 1)] || 0, c = B64R[s.charAt(i + 2)], d = B64R[s.charAt(i + 3)];
      var v = (a << 18) | (b << 12) | ((c || 0) << 6) | (d || 0);
      if (o < n) out[o++] = v >> 16 & 255;
      if (c != null && o < n) out[o++] = v >> 8 & 255;
      if (d != null && o < n) out[o++] = v & 255;
    }
    return o === n ? out : out.subarray(0, o);
  };

  /* Recording time → song time, through the anchors the page wrote down
     while the song played ([rec, song] pairs; a pause or a seek adds
     one). */
  K.songTimeAt = function (timemap, rec, songStart) {
    var tm = timemap || [], best = null;
    for (var i = 0; i < tm.length; i++) {
      var e = tm[i];
      if (!e || e.length < 2 || !isFinite(e[0]) || !isFinite(e[1])) continue;
      if (e[0] <= rec && (!best || e[0] >= best[0])) best = e;
    }
    if (best) return best[1] + (rec - best[0]);
    if (tm.length && tm[0] && isFinite(tm[0][0])) return tm[0][1] - (tm[0][0] - rec);
    return (Number(songStart) || 0) + rec;
  };

  /* A contour as frames in song time: [{t, m, e}] (m is null when no
     pitch was heard). Frames under the energy gate carry no pitch. */
  K.frames = function (contour, timemap, songStart, gateDb) {
    var bytes = typeof contour === 'string' ? K.unb64(contour) : (contour || new Uint8Array(0));
    var gate = gateDb == null ? -52 : gateDb, out = [];
    for (var k = 0; k + 1 < bytes.length; k += 2) {
      var rec = (k / 2 + 0.5) / FPS, db = K.codeDb(bytes[k + 1]);
      var m = bytes[k] && db >= gate ? K.codeMidi(bytes[k]) : null;
      out.push({ r: rec, t: K.songTimeAt(timemap, rec, songStart), m: m, e: db });
    }
    return out;
  };

  function stableMask(fr) {
    var s = new Uint8Array(fr.length);
    for (var i = 0; i < fr.length; i++) {
      var m = fr[i].m;
      if (m == null) continue;
      var a = i > 0 ? fr[i - 1].m : null, b = i + 1 < fr.length ? fr[i + 1].m : null;
      if ((a != null && Math.abs(a - m) < 0.5) || (b != null && Math.abs(b - m) < 0.5)) s[i] = 1;
    }
    return s;
  }
  function circ48(a, b) { var d = Math.abs(a - b) % 48; return d > 24 ? 48 - d : d; }
  function pc48(m) { return ((Math.round(m * 4) % 48) + 48) % 48; }

  var MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  var MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
  var SCALE_MAJ = [0, 2, 4, 5, 7, 9, 11], SCALE_MIN = [0, 2, 3, 5, 7, 8, 10];

  /* How well the pitch was carried. Against the learned melody when the
     video has one (pitch class within a quarter tone either way counts
     in full), otherwise by the singer's own tuning and key: notes that
     sit on a semitone once the singer's overall tuning is allowed for,
     and notes that stay inside one key. */
  K.pitchScore = function (fr, melody) {
    var mask = stableMask(fr), voiced = 0, i;
    for (i = 0; i < fr.length; i++) if (fr[i].m != null) voiced++;
    if (voiced < 30) return { score: null, mode: null, voiced: voiced };
    var mel = typeof melody === 'string' ? K.unb64(melody) : melody;
    if (mel && mel.length >= 2) {
      /* The singer's own lag (their ears, their speaker) is searched
         for first, a second either way, so a late device is not heard
         as a wrong note. Each frame may then land two frames early or
         late, the way people phrase. */
      var n = mel.length >> 1, bestLag = 0, bestAt = -1, lag;
      var at = function (lg, full) {
        var sum = 0, cnt = 0;
        for (var q = 0; q < fr.length; q += full ? 1 : 2) {
          var f = fr[q];
          if (f.m == null) continue;
          var idx = Math.round(f.t * FPS) - lg, best = -1;
          for (var d = -2; d <= 2; d++) {
            var j = idx + d;
            if (j < 0 || j >= n || !mel[2 * j] || mel[2 * j + 1] < 2) continue;
            var dist = circ48(mel[2 * j] - 1, pc48(f.m));
            var s = dist <= 2 ? 1 : dist <= 4 ? 0.6 : dist <= 6 ? 0.25 : 0;
            if (s > best) best = s;
          }
          if (best >= 0) { sum += best; cnt++; }
        }
        return { s: cnt ? sum / cnt : 0, n: cnt };
      };
      for (lag = -10; lag <= 10; lag++) {
        var trial = at(lag, false);
        if (trial.n >= 20 && trial.s - Math.abs(lag) * 0.002 > bestAt) { bestAt = trial.s - Math.abs(lag) * 0.002; bestLag = lag; }
      }
      var fin = at(bestLag, true);
      if (fin.n >= 40) return { score: fin.s, mode: 'melody', voiced: voiced, compared: fin.n, lag: bestLag / FPS };
    }
    /* tuning, then how close each held note sits to a semitone */
    var sx = 0, sy = 0, held = 0;
    for (i = 0; i < fr.length; i++) {
      if (!mask[i]) continue;
      var fracA = (fr[i].m - Math.round(fr[i].m)) * 2 * Math.PI;
      sx += Math.cos(fracA); sy += Math.sin(fracA); held++;
    }
    if (held < 30) return { score: null, mode: null, voiced: voiced };
    var tune = Math.atan2(sy, sx) / (2 * Math.PI);
    var tuneSum = 0, hist = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (i = 0; i < fr.length; i++) {
      if (!mask[i]) continue;
      var x = fr[i].m - tune, r = Math.abs(x - Math.round(x));
      tuneSum += Math.max(0, 1 - r / 0.3);
      hist[((Math.round(x) % 12) + 12) % 12]++;
    }
    var inTune = tuneSum / held;
    var bestKey = 0, bestR = -2, bestScale = SCALE_MAJ;
    for (var k = 0; k < 12; k++) {
      [[MAJOR, SCALE_MAJ], [MINOR, SCALE_MIN]].forEach(function (pr) {
        var r2 = corr(hist, pr[0], k);
        if (r2 > bestR) { bestR = r2; bestKey = k; bestScale = pr[1]; }
      });
    }
    var inScale = 0;
    bestScale.forEach(function (st) { inScale += hist[(bestKey + st) % 12]; });
    var inKey = inScale / held;
    var keyScore = Math.max(0, Math.min(1, (inKey - 0.58) / 0.34));
    return { score: 0.6 * inTune + 0.4 * keyScore, mode: 'tune', voiced: voiced, inTune: +inTune.toFixed(3), inKey: +inKey.toFixed(3), key: bestKey };
  };
  function corr(h, prof, rot) {
    var n = 12, mh = 0, mp = 0, i;
    for (i = 0; i < n; i++) { mh += h[i]; mp += prof[i]; }
    mh /= n; mp /= n;
    var num = 0, dh = 0, dp = 0;
    for (i = 0; i < n; i++) {
      var a = h[(i + rot) % n] - mh, b = prof[i] - mp;
      num += a * b; dh += a * a; dp += b * b;
    }
    return dh && dp ? num / Math.sqrt(dh * dp) : -1;
  }

  /* Expression: light and shade (loudness range), notes held rather
     than dropped, and vibrato. The page hears vibrato at a rate a ten
     frame contour cannot; its count is a hint, capped, and the smallest
     part of the smallest weight. */
  K.expressionScore = function (fr, vibHint) {
    var dbs = [], held = 0, voiced = 0, run = 0, i;
    for (i = 0; i < fr.length; i++) {
      var f = fr[i];
      if (f.m == null) { if (run >= 5) held += run; run = 0; continue; }
      voiced++; dbs.push(f.e);
      if (i > 0 && fr[i - 1].m != null && Math.abs(fr[i - 1].m - f.m) < 0.6) run = run ? run + 1 : 2;
      else { if (run >= 5) held += run; run = 0; }
    }
    if (run >= 5) held += run;
    if (voiced < 30) return { score: null };
    dbs.sort(function (a, b) { return a - b; });
    var range = dbs[Math.floor(dbs.length * 0.9)] - dbs[Math.floor(dbs.length * 0.1)];
    var dyn = Math.max(0, Math.min(1, (range - 3) / 9));
    var hold = Math.max(0, Math.min(1, (held / voiced) / 0.35));
    var parts = [[dyn, 0.45], [hold, 0.35]];
    if (vibHint != null && isFinite(vibHint)) parts.push([Math.max(0, Math.min(1, vibHint / 6)), 0.2]);
    var num = 0, den = 0;
    parts.forEach(function (p) { num += p[0] * p[1]; den += p[1]; });
    return { score: num / den, range: +range.toFixed(1), held: +(held / voiced).toFixed(3) };
  };

  /* Teach the melody what one good performance sang. Agreement adds
     confidence; disagreement takes it away, and a frame changes its
     mind only once its confidence runs out. */
  K.mergeMelody = function (melody, fr, weight) {
    var old = typeof melody === 'string' ? K.unb64(melody) : (melody || new Uint8Array(0));
    var w = Math.max(1, Math.min(4, Math.round(weight || 1))), maxIdx = (old.length >> 1) - 1, i;
    var mask = stableMask(fr);
    for (i = 0; i < fr.length; i++) if (mask[i] && fr[i].t >= 0) maxIdx = Math.max(maxIdx, Math.round(fr[i].t * FPS));
    var n = Math.min(15000, maxIdx + 1);
    if (n <= 0) return old;
    var out = new Uint8Array(n * 2);
    out.set(old.subarray(0, Math.min(old.length, n * 2)));
    var done = {};
    for (i = 0; i < fr.length; i++) {
      if (!mask[i] || fr[i].t < 0) continue;
      var idx = Math.round(fr[i].t * FPS);
      if (idx >= n || done[idx]) continue;
      done[idx] = 1;
      var pc = pc48(fr[i].m), cur = out[2 * idx], conf = out[2 * idx + 1];
      if (!cur) { out[2 * idx] = pc + 1; out[2 * idx + 1] = w; continue; }
      if (circ48(cur - 1, pc) <= 2) out[2 * idx + 1] = Math.min(255, conf + w);
      else if (conf - w <= 0) { out[2 * idx] = pc + 1; out[2 * idx + 1] = w; }
      else out[2 * idx + 1] = conf - w;
    }
    return out;
  };

  /* A lyric that can be sent over the wire or stored: seconds rounded,
     nothing but what the stage needs. */
  K.pack = function (lines, synced) {
    return { v: 1, synced: !!synced, lines: lines.map(function (l) {
      var o = { t: l.t == null ? null : +Number(l.t).toFixed(2), x: String(l.x || '') };
      if (l.e != null) o.e = +Number(l.e).toFixed(2);
      if (l.w && l.w.length) o.w = l.w.map(function (w) { var r = { t: +Number(w.t).toFixed(2), x: String(w.x) }; if (w.e != null) r.e = +Number(w.e).toFixed(2); return r; });
      return o;
    }) };
  };

  root.CabanaKaraokeLyrics = K;
})(typeof window !== 'undefined' ? window : globalThis);
