/* ══════════════════════════════════════════════════════════════════════
   CABANA · iCalendar engine  (api/lib/_ical.js)
   ──────────────────────────────────────────────────────────────────────
   RFC 5545, implemented rather than approximated.

   The version this replaces was eleven lines of regex:

     const dtstart = b.match(/DTSTART(?:;VALUE=DATE)?:(\d{8})/)?.[1];

   Every one of the following breaks it, and every one of them is
   something a major platform actually sends:

     · FOLDED LINES.  RFC 5545 wraps at 75 octets and continues with a
       leading space. Google Calendar folds long SUMMARY and DESCRIPTION
       lines constantly. Unfolded, a URL in a description can contain the
       literal text "DTSTART:" and be read as a date.
     · TIMED EVENTS.  DTSTART;TZID=Europe/London:20260315T140000 has no
       eight-digit run after the colon in the shape the regex wanted, so
       the event vanished. Google, Outlook and most channel managers emit
       these.
     · DURATION.  An event may carry DURATION instead of DTEND. With no
       DTEND the old parser dropped the event entirely.
     · RRULE.  A recurring owner block ("every weekend") is ONE VEVENT.
       Read literally it blocks one weekend and leaves fifty open.
     · CANCELLED.  STATUS:CANCELLED and METHOD:CANCEL mean the nights are
       FREE. Treated as a block, a cancellation closed the calendar.
     · TRANSP:TRANSPARENT.  Explicitly "this does not occupy time".
     · UTF-8.  Folding counts OCTETS, not characters. Splitting a fold at
       a character boundary corrupts any non-ASCII property name.

   Nothing here is imported from npm: this file is the dependency, and it
   is pure functions over strings so it can be tested without a network,
   a database or a clock.
══════════════════════════════════════════════════════════════════════ */

/* ── LIMITS ───────────────────────────────────────────────────────────
   A calendar feed is attacker-adjacent input: a host pastes a URL, and
   whatever answers it lands in our parser. Every loop below is bounded. */
export const LIMITS = {
  maxBytes:        6 * 1024 * 1024,  // 6 MB. A 2-year busy calendar is ~80 KB.
  maxEvents:       20000,
  maxRecurrence:   750,              // expansions per recurring rule
  maxHorizonDays:  1095,             // 3 years forward
  maxHistoryDays:  400,
};

/* ══ 1 · UNFOLDING ═══════════════════════════════════════════════════
   The single most skipped step in every naive iCal reader. A content
   line is split at 75 octets and resumed on the next line with one
   leading space or tab. Both must be handled, and CRLF, bare LF and bare
   CR all appear in the wild (Booking.com has shipped bare LF for years). */
export function unfold(text) {
  return String(text || '')
    .replace(/^﻿/, '')                 // Vrbo prepends a BOM
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n[ \t]/g, '');
}

/* ══ 2 · CONTENT LINES ═══════════════════════════════════════════════
   name;PARAM=value;PARAM="quoted:value":the actual value

   The parameter section may contain a quoted string, and that string may
   contain a colon — TZID="GMT+03:00" is legal and common in Outlook
   exports. So the name/value split cannot be `indexOf(':')`; it has to
   respect quoting. */
export function parseLine(line) {
  let i = 0, inQuotes = false, colon = -1;
  for (; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (c === ':' && !inQuotes) { colon = i; break; }
  }
  if (colon === -1) return null;

  const head  = line.slice(0, colon);
  const value = line.slice(colon + 1);

  const parts = [];
  let buf = '', quoted = false;
  for (const c of head) {
    if (c === '"') { quoted = !quoted; continue; }
    if (c === ';' && !quoted) { parts.push(buf); buf = ''; continue; }
    buf += c;
  }
  parts.push(buf);

  const name = (parts.shift() || '').trim().toUpperCase();
  const params = {};
  for (const p of parts) {
    const eq = p.indexOf('=');
    if (eq === -1) continue;
    params[p.slice(0, eq).trim().toUpperCase()] = p.slice(eq + 1).trim();
  }
  return { name, params, value };
}

/* TEXT values escape backslash, semicolon, comma and newline. Order
   matters: unescaping \\ first would turn \\n into a newline. */
export function unescapeText(value) {
  let out = '';
  for (let i = 0; i < value.length; i++) {
    if (value[i] !== '\\') { out += value[i]; continue; }
    const next = value[++i];
    if (next === 'n' || next === 'N') out += '\n';
    else if (next === undefined)      out += '\\';
    else                              out += next;   // \\  \;  \,  \"
  }
  return out;
}

/* ══ 3 · DATES ═══════════════════════════════════════════════════════
   Three shapes, and the difference between them decides which NIGHT a
   guest occupies:

     20260315                  DATE       · already local, already a night
     20260315T140000Z          UTC        · convert to the property's day
     20260315T140000 +TZID     zoned      · already the right wall clock

   A stay is nights, not instants, so everything collapses to a local
   calendar date in the property's timezone. Getting this wrong by one
   hour moves a check-in across midnight and blocks the wrong night. */

const pad = n => String(n).padStart(2, '0');

export function toISODate(y, m, d) { return `${y}-${pad(m)}-${pad(d)}`; }

/* IANA conversion with no dependency: Intl carries the whole tz database
   in Node, so this is exact for every zone and every DST transition. */
function utcToZonedDate(date, timeZone) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(date);
    const get = t => parts.find(p => p.type === t)?.value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  } catch {
    return date.toISOString().slice(0, 10);   // unknown zone → UTC day
  }
}

/**
 * @returns {{date:string, isDateOnly:boolean, atMidnight:boolean}|null}
 */
export function parseDateValue(value, params = {}, timeZone = 'UTC') {
  const raw = String(value || '').trim();

  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(raw);
  if (dateOnly && (params.VALUE === 'DATE' || raw.length === 8)) {
    return {
      date: toISODate(+dateOnly[1], +dateOnly[2], +dateOnly[3]),
      isDateOnly: true,
      atMidnight: true,
    };
  }

  const dt = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(raw);
  if (!dt) return null;

  const [, Y, M, D, h, m, s, zulu] = dt;
  const atMidnight = h === '00' && m === '00' && s === '00';

  /* A floating time (no Z, no TZID) is by definition already in the
     observer's zone, which for a property calendar is the property. */
  if (!zulu && !params.TZID) {
    return { date: toISODate(+Y, +M, +D), isDateOnly: false, atMidnight };
  }

  /* TZID names the wall clock directly, so the date is already correct.
     Re-projecting it through UTC would be a round trip that can only
     lose. */
  if (params.TZID) {
    return { date: toISODate(+Y, +M, +D), isDateOnly: false, atMidnight };
  }

  const instant = new Date(Date.UTC(+Y, +M - 1, +D, +h, +m, +s));
  return {
    date: utcToZonedDate(instant, timeZone),
    isDateOnly: false,
    atMidnight,
  };
}

/* ISO 8601 duration, the RFC 5545 subset: P[n]W | P[n]D[T[n]H[n]M[n]S] */
export function parseDuration(value) {
  const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/
    .exec(String(value || '').trim());
  if (!m) return null;
  const sign = m[1] === '-' ? -1 : 1;
  const secs = (+(m[2] || 0) * 604800) + (+(m[3] || 0) * 86400)
             + (+(m[4] || 0) * 3600)   + (+(m[5] || 0) * 60) + (+(m[6] || 0));
  return sign * secs;
}

export function addDays(isoDate, days) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function daysBetween(a, b) {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

/* ══ 4 · RECURRENCE ══════════════════════════════════════════════════
   A host who blocks "every Friday and Saturday" on Google Calendar sends
   ONE VEVENT with an RRULE. Read literally, fifty-one of those weekends
   are sold out from under them.

   Deliberately a subset: FREQ, INTERVAL, COUNT, UNTIL, BYDAY, BYMONTHDAY
   and BYMONTH — which between them cover every owner-block pattern a
   calendar UI can produce. BYSETPOS, BYWEEKNO and BYYEARDAY are absent
   because no property calendar emits them, and a wrong expansion blocks
   nights nobody asked to block. Unknown parts fall back to the single
   base occurrence, which errs toward selling a night we could have held
   rather than holding one we could have sold. */
const WEEKDAY = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

export function parseRRule(value) {
  const out = {};
  for (const part of String(value || '').split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    out[part.slice(0, eq).trim().toUpperCase()] = part.slice(eq + 1).trim();
  }
  return out;
}

export function expandRecurrence(startISO, rrule, { until: horizon, limit = LIMITS.maxRecurrence } = {}) {
  const rule = typeof rrule === 'string' ? parseRRule(rrule) : (rrule || {});
  const freq = String(rule.FREQ || '').toUpperCase();
  if (!['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(freq)) return [startISO];

  const interval = Math.max(1, parseInt(rule.INTERVAL, 10) || 1);
  const count    = rule.COUNT ? Math.max(1, parseInt(rule.COUNT, 10)) : null;

  let untilISO = horizon;
  if (rule.UNTIL) {
    const u = parseDateValue(rule.UNTIL, {}, 'UTC');
    if (u && (!untilISO || u.date < untilISO)) untilISO = u.date;
  }

  const byDay = (rule.BYDAY || '')
    .split(',')
    .map(t => WEEKDAY[t.replace(/^[+-]?\d+/, '').toUpperCase()])
    .filter(n => n !== undefined);
  const byMonthDay = (rule.BYMONTHDAY || '').split(',')
    .map(n => parseInt(n, 10)).filter(Number.isFinite);
  const byMonth = (rule.BYMONTH || '').split(',')
    .map(n => parseInt(n, 10)).filter(Number.isFinite);

  const [sy, sm, sd] = startISO.split('-').map(Number);
  const cursor = new Date(Date.UTC(sy, sm - 1, sd));
  const dates = [];
  let iterations = 0;

  const emit = iso => {
    if (byMonth.length && !byMonth.includes(+iso.slice(5, 7))) return;
    if (untilISO && iso > untilISO) return;
    if (iso < startISO) return;
    if (!dates.includes(iso)) dates.push(iso);
  };

  while (dates.length < limit && iterations < limit * 8) {
    iterations++;
    const iso = cursor.toISOString().slice(0, 10);
    if (untilISO && iso > untilISO) break;
    if (count && dates.length >= count) break;

    if (freq === 'WEEKLY' && byDay.length) {
      /* Walk the whole week the cursor sits in, so BYDAY=FR,SA yields
         both nights of every selected week rather than one. */
      const weekStart = new Date(cursor);
      weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
      for (const wd of byDay) {
        const day = new Date(weekStart);
        day.setUTCDate(day.getUTCDate() + wd);
        emit(day.toISOString().slice(0, 10));
        if (count && dates.length >= count) break;
      }
    } else if (freq === 'MONTHLY' && byMonthDay.length) {
      for (const md of byMonthDay) {
        const day = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), md));
        if (day.getUTCMonth() === cursor.getUTCMonth()) emit(day.toISOString().slice(0, 10));
        if (count && dates.length >= count) break;
      }
    } else if ((freq === 'MONTHLY' || freq === 'YEARLY') && byDay.length) {
      const monthEnd = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0));
      for (let d = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1));
           d <= monthEnd; d.setUTCDate(d.getUTCDate() + 1)) {
        if (byDay.includes(d.getUTCDay())) emit(d.toISOString().slice(0, 10));
      }
    } else {
      emit(iso);
    }

    if (freq === 'DAILY')        cursor.setUTCDate(cursor.getUTCDate() + interval);
    else if (freq === 'WEEKLY')  cursor.setUTCDate(cursor.getUTCDate() + 7 * interval);
    else if (freq === 'MONTHLY') cursor.setUTCMonth(cursor.getUTCMonth() + interval);
    else                         cursor.setUTCFullYear(cursor.getUTCFullYear() + interval);

    /* No UNTIL and no COUNT is an infinite rule. The horizon is the only
       thing that stops it, and if the caller gave none, stop anyway. */
    if (!untilISO && !count && dates.length >= Math.min(limit, 400)) break;
  }

  const sorted = dates.sort();
  return count ? sorted.slice(0, count) : sorted;
}


/* ══ 5 · CLASSIFICATION ══════════════════════════════════════════════
   Every platform says "these nights are gone" in its own words, and the
   difference between a guest and an owner block changes what we show the
   host and whether an overlap is an emergency.

   Order matters. "Airbnb (Not available)" contains both a platform name
   and a blocked phrase, and it is a block, not a reservation. */
const BLOCKED_PHRASES = [
  'not available', 'unavailable', 'blocked', 'block', 'closed',
  'owner stay', 'owner block', 'maintenance', 'do not book',
  'external', 'busy', 'geschlossen', 'nicht verfügbar', 'no disponible',
];
const RESERVED_PHRASES = [
  'reserved', 'reservation', 'booked', 'booking', 'guest', 'stay',
  'confirmed', 'occupied',
];

export function classifyEvent({ summary = '', description = '', uid = '' }) {
  const hay = `${summary} ${description}`.toLowerCase();

  /* Our own feed, read back through a channel that mirrors calendars.
     Recognised so it is never counted twice and never re-exported. */
  if (/@cabana\.africa$/i.test(uid) || /x-cabana/i.test(description)) return 'echo';

  if (BLOCKED_PHRASES.some(p => hay.includes(p)))  return 'blocked';
  if (RESERVED_PHRASES.some(p => hay.includes(p))) return 'reservation';
  return 'blocked';   // unknown wording is unsellable, not sellable
}

/* ══ 6 · THE PARSER ══════════════════════════════════════════════════ */

/**
 * @param {string} text  raw .ics body
 * @param {object} opts  { timeZone, today, horizonDays, historyDays }
 * @returns {{events:Array, calendar:object, warnings:string[]}}
 */
export function parseICalendar(text, opts = {}) {
  const timeZone    = opts.timeZone || 'UTC';
  const today       = opts.today || new Date().toISOString().slice(0, 10);
  const horizon     = addDays(today,  Math.min(opts.horizonDays ?? 540, LIMITS.maxHorizonDays));
  const floor       = addDays(today, -Math.min(opts.historyDays ?? 60, LIMITS.maxHistoryDays));

  const warnings = [];
  const calendar = { prodid: null, name: null, method: null, timezone: null, refresh: null };
  const events   = [];
  const overrides = new Map();     // `${uid}::${recurrenceDate}` → event

  const lines = unfold(text).split('\n');

  /* The component stack is not decoration. VTIMEZONE contains its own
     DTSTART (19700329T020000, the DST rule anchor) and a flat scan reads
     it as an event starting in 1970. Every naive parser blocks the
     entire 1970s exactly once and nobody notices, because the dates are
     in the past. Then somebody's STANDARD rule anchors in 2026. */
  const stack = [];
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('BEGIN:')) {
      const comp = line.slice(6).toUpperCase();
      stack.push(comp);
      if (comp === 'VEVENT' && stack.filter(c => c === 'VEVENT').length === 1) {
        current = { props: {}, params: {}, multi: {} };
      }
      continue;
    }

    if (line.startsWith('END:')) {
      const comp = line.slice(4).toUpperCase();
      if (comp === 'VEVENT' && current) {
        if (events.length < LIMITS.maxEvents) {
          const built = buildEventsFrom(current, { timeZone, horizon, floor, warnings });
          for (const e of built) {
            if (e.recurrenceId) overrides.set(`${e.uid}::${e.recurrenceId}`, e);
            else events.push(e);
          }
        }
        current = null;
      }
      stack.pop();
      continue;
    }

    const parsed = parseLine(line);
    if (!parsed) continue;

    /* Calendar-level properties, only while no component is open. */
    if (!current && stack.length <= 1) {
      if (parsed.name === 'PRODID')        calendar.prodid   = unescapeText(parsed.value);
      else if (parsed.name === 'METHOD')   calendar.method   = parsed.value.trim().toUpperCase();
      else if (parsed.name === 'X-WR-CALNAME')  calendar.name     = unescapeText(parsed.value);
      else if (parsed.name === 'X-WR-TIMEZONE') calendar.timezone = parsed.value.trim();
      else if (parsed.name === 'REFRESH-INTERVAL' || parsed.name === 'X-PUBLISHED-TTL') {
        calendar.refresh = parsed.value.trim();
      }
      continue;
    }

    if (!current) continue;                       // inside VTIMEZONE etc.

    if (parsed.name === 'EXDATE' || parsed.name === 'RDATE') {
      (current.multi[parsed.name] ||= []).push({ value: parsed.value, params: parsed.params });
    } else {
      current.props[parsed.name]  = parsed.value;
      current.params[parsed.name] = parsed.params;
    }
  }

  /* A RECURRENCE-ID replaces one instance of its series. Applied after
     the whole file is read, because the override may appear before the
     series it modifies. */
  if (overrides.size) {
    for (let i = 0; i < events.length; i++) {
      const key = `${events[i].uid}::${events[i].start}`;
      if (overrides.has(key)) { events[i] = overrides.get(key); overrides.delete(key); }
    }
    for (const leftover of overrides.values()) events.push(leftover);
  }

  return { events, calendar, warnings };
}

function buildEventsFrom(node, { timeZone, horizon, floor, warnings }) {
  const p = node.props;
  const uidRaw = (p.UID || '').trim();
  const summary     = unescapeText(p.SUMMARY || '');
  const description = unescapeText(p.DESCRIPTION || '');

  /* A cancellation is the platform telling us the nights are FREE. Read
     as a block it does the exact opposite of what it says. */
  const status = (p.STATUS || '').trim().toUpperCase();
  if (status === 'CANCELLED') return [];
  if ((p.TRANSP || '').trim().toUpperCase() === 'TRANSPARENT') return [];

  const zone = node.params.DTSTART?.TZID || timeZone;
  const start = parseDateValue(p.DTSTART, node.params.DTSTART || {}, zone);
  if (!start) {
    if (uidRaw) warnings.push(`event ${uidRaw.slice(0, 60)} has no usable DTSTART`);
    return [];
  }

  /* END, three ways, in the order the RFC prefers them. */
  let endDate = null;
  if (p.DTEND) {
    const end = parseDateValue(p.DTEND, node.params.DTEND || {}, zone);
    if (end) endDate = end.date;
  } else if (p.DURATION) {
    const secs = parseDuration(p.DURATION);
    if (secs !== null) endDate = addDays(start.date, Math.max(1, Math.ceil(secs / 86400)));
  }

  /* Absent both, RFC 5545 gives a DATE event one day and a DATE-TIME
     event zero. Zero nights is not a thing a calendar can hold, so the
     floor everywhere is one night. */
  if (!endDate || endDate <= start.date) endDate = addDays(start.date, 1);

  const uid  = uidRaw || `cabana-derived-${start.date}-${endDate}-${hashString(summary)}`;
  const kind = classifyEvent({ summary, description, uid });
  const nights = daysBetween(start.date, endDate);

  const recurrenceId = p['RECURRENCE-ID']
    ? parseDateValue(p['RECURRENCE-ID'], node.params['RECURRENCE-ID'] || {}, zone)?.date
    : null;

  const base = {
    uid, kind, summary, description,
    guest: guestFrom(summary, description),
    start: start.date,
    end: endDate,
    recurrenceId,
    sequence: parseInt(p.SEQUENCE, 10) || 0,
  };

  if (!p.RRULE) {
    return withinWindow(base, floor, horizon) ? [base] : [];
  }

  /* Recurring. Each occurrence keeps the original duration and gets a
     UID that is unique per date — two occurrences sharing one UID would
     collapse into a single row and blank most of the series. */
  const excluded = new Set();
  for (const ex of (node.multi.EXDATE || [])) {
    for (const one of String(ex.value).split(',')) {
      const d = parseDateValue(one.trim(), ex.params || {}, zone);
      if (d) excluded.add(d.date);
    }
  }

  const occurrences = expandRecurrence(start.date, p.RRULE, { until: horizon });
  const out = [];
  for (const day of occurrences) {
    if (excluded.has(day)) continue;
    const occ = {
      ...base,
      uid:   `${uid}::${day}`,
      start: day,
      end:   addDays(day, nights),
      recurrenceId: null,
    };
    if (withinWindow(occ, floor, horizon)) out.push(occ);
  }

  for (const rd of (node.multi.RDATE || [])) {
    for (const one of String(rd.value).split(',')) {
      const d = parseDateValue(one.trim().split('/')[0], rd.params || {}, zone);
      if (!d || excluded.has(d.date)) continue;
      const occ = { ...base, uid: `${uid}::${d.date}`, start: d.date,
                    end: addDays(d.date, nights), recurrenceId: null };
      if (withinWindow(occ, floor, horizon)) out.push(occ);
    }
  }

  return out;
}

function withinWindow(event, floor, horizon) {
  return event.end > floor && event.start < horizon;
}

/* Airbnb hides the reservation URL and a masked phone number in
   DESCRIPTION; Booking.com and Vrbo put a name straight in SUMMARY.
   Nothing here is required for blocking a night — it is only ever shown
   back to the host who owns the listing. */
function guestFrom(summary, description) {
  const named = /(?:^|\n)\s*(?:guest|name|reserved by)\s*[:\-]\s*(.+)$/im.exec(description);
  if (named) return named[1].trim().slice(0, 120);
  const s = summary.trim();
  if (!s) return null;
  if (/^(reserved|blocked|busy|closed|not available|unavailable)$/i.test(s)) return null;
  return s.replace(/^(reserved|booking|reservation)\s*[:\-]\s*/i, '').slice(0, 120) || null;
}

function hashString(s) {
  let h = 0;
  for (let i = 0; i < String(s).length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}


/* ══ 7 · SERIALISING ═════════════════════════════════════════════════
   What Airbnb, Booking.com, Vrbo and Google actually fetch. Every rule
   below exists because some reader in this list rejects the file, or
   silently drops events, without it.

     · CRLF line endings. RFC 5545 says MUST. Google tolerates LF;
       Outlook and several channel managers do not.
     · DTSTAMP on every VEVENT. Required. Its absence is the most common
       reason a hand-rolled feed imports as empty.
     · Folding at 75 OCTETS. A long property name plus a UTF-8 title
       overruns, and readers that enforce the limit truncate the line.
     · VALUE=DATE on both DTSTART and DTEND. A stay is nights, not
       instants: sending times drags the block across a timezone edge and
       blocks the wrong night on the other platform.
     · DTEND is EXCLUSIVE. A guest leaving on the 18th frees the 18th.
       Off by one here double-blocks every turnover day in the calendar. */

/* Fold on octets, break on characters. Slicing a UTF-8 sequence in half
   produces a line neither side can decode. */
export function foldLine(line) {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const out = [];
  let chunk = '', bytes = 0, limit = 75;
  for (const ch of line) {                       // iterates code points
    const size = encoder.encode(ch).length;
    if (bytes + size > limit) {
      out.push(chunk);
      chunk = ch; bytes = size;
      limit = 74;                                // the continuation space costs one
    } else {
      chunk += ch; bytes += size;
    }
  }
  if (chunk) out.push(chunk);
  return out.join('\r\n ');
}

export function escapeText(value) {
  return String(value ?? '')
    /* Control characters first, and ALL THREE line-break forms. A lone CR
       is the one that bites: it is not \r\n, so a naive normaliser leaves
       it in place, and every lenient reader on the other side — ours
       included — treats it as a line break. A guest called
       "Ann\rSUMMARY:…" would then inject arbitrary properties into the
       calendar we publish to Airbnb. Everything below is derived from a
       listing title or a guest name, so this is reachable input. */
    .replace(/\r\n|\r|\n/g, '\u0000')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, m => (m === '\u0000' ? '\u0000' : ''))
    .replace(/\\/g, '\\\\')
    .replace(/;/g,  '\\;')
    .replace(/,/g,  '\\,')
    .replace(/\u0000/g, '\\n');
}

const compact = iso => String(iso || '').replace(/-/g, '');

export function icalTimestamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Build a complete, standards-clean VCALENDAR.
 *
 * @param {object} o
 * @param {string} o.name        X-WR-CALNAME, what the host sees in the other UI
 * @param {Array}  o.events      { uid, start, end, summary, description, kind, created }
 * @param {string} [o.timezone]
 * @param {string} [o.domain]    UID namespace
 * @param {number} [o.ttlHours]  how often we invite the reader to poll
 */
export function buildICalendar({
  name,
  events = [],
  timezone = 'Africa/Nairobi',
  domain = 'cabana.africa',
  url = null,
  ttlHours = 1,
  listingId = null,
  now = new Date(),
} = {}) {
  const stamp = icalTimestamp(now);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cabana//Cabana Channel Calendar 2.0//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(name || 'Cabana calendar')}`,
    `X-WR-TIMEZONE:${escapeText(timezone)}`,
    `X-WR-CALDESC:${escapeText('Busy dates published by Cabana. Times are nights; DTEND is the checkout day and is not occupied.')}`,
    /* Both spellings: REFRESH-INTERVAL is RFC 7986, X-PUBLISHED-TTL is
       what Microsoft and several channel managers actually read. */
    `REFRESH-INTERVAL;VALUE=DURATION:PT${Math.max(1, ttlHours)}H`,
    `X-PUBLISHED-TTL:PT${Math.max(1, ttlHours)}H`,
  ];
  if (url) lines.push(`SOURCE;VALUE=URI:${url}`);
  if (listingId) lines.push(`X-CABANA-LISTING:${escapeText(listingId)}`);

  for (const e of events) {
    if (!e?.start || !e?.end || e.end <= e.start) continue;

    /* Every UID is namespaced to us. That is what lets a Cabana booking
       arriving back through a third channel be recognised as our own
       echo instead of counted as a second, competing reservation. */
    const uid = `${String(e.uid || `${e.start}-${e.end}`).replace(/[^\w.:@-]/g, '-')}@${domain}`;

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(e.start)}`,
      `DTEND;VALUE=DATE:${compact(e.end)}`,
      `SUMMARY:${escapeText(e.summary || 'Cabana booking')}`,
    );
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    lines.push(
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      `SEQUENCE:${Number.isFinite(e.sequence) ? e.sequence : 0}`,
      `CREATED:${e.created ? icalTimestamp(new Date(e.created)) : stamp}`,
      `LAST-MODIFIED:${stamp}`,
      `X-CABANA-KIND:${escapeText(e.kind || 'reservation')}`,
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

/* A cheap, stable fingerprint of a feed's MEANING rather than its bytes.
   Airbnb rewrites DTSTAMP on every request, so byte comparison always
   reports "changed" and every poll does a full diff for nothing. */
export function contentFingerprint(events) {
  const norm = (events || [])
    .map(e => `${e.uid}|${e.start}|${e.end}|${e.kind}`)
    .sort()
    .join('\n');
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < norm.length; i++) {
    h1 = (h1 ^ norm.charCodeAt(i)) >>> 0;
    h1 = (h1 * 16777619) >>> 0;
    h2 = (h2 + norm.charCodeAt(i) * (i + 1)) >>> 0;
  }
  return `${h1.toString(16)}${h2.toString(16)}`;
}

export default {
  LIMITS, unfold, parseLine, unescapeText, parseDateValue, parseDuration,
  addDays, daysBetween, parseRRule, expandRecurrence, classifyEvent,
  parseICalendar, foldLine, escapeText, buildICalendar, icalTimestamp,
  contentFingerprint,
};
