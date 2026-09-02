/* ══════════════════════════════════════════════════════════════════════
   Channel calendar · tests
   ──────────────────────────────────────────────────────────────────────
   Every case here is a real feed shape from a real platform, or a real
   bug the previous implementation shipped. The parser tests in
   particular are regression tests: each one is an event the old
   eleven-line regex silently dropped or misread.
══════════════════════════════════════════════════════════════════════ */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  unfold, parseLine, unescapeText, parseDateValue, parseDuration,
  expandRecurrence, classifyEvent, parseICalendar,
  foldLine, escapeText, buildICalendar, contentFingerprint,
} from '../api/lib/_ical.js';
import {
  PLATFORMS, detectPlatform, normaliseFeedUrl, getPlatform, connectionGuide,
} from '../api/lib/_calendar-platforms.js';
import { isBlockedAddress } from '../api/lib/_calendar-fetch.js';

const ROOT = new URL('..', import.meta.url).pathname;
const read = f => readFileSync(join(ROOT, f), 'utf8');
const ics = (...lines) => ['BEGIN:VCALENDAR', 'VERSION:2.0', ...lines, 'END:VCALENDAR'].join('\r\n');
const TODAY = '2026-03-01';

/* ══ 1 · LINE HANDLING ═══════════════════════════════════════════════ */

test('folded lines are rejoined before anything reads them', () => {
  assert.equal(unfold('DESC:one\r\n two'), 'DESC:onetwo');
  assert.equal(unfold('DESC:one\n\ttwo'), 'DESC:onetwo');
  assert.equal(unfold('﻿BEGIN:VCALENDAR'), 'BEGIN:VCALENDAR');   // Vrbo BOM
  assert.equal(unfold('A:1\rB:2'), 'A:1\nB:2');                       // bare CR
});

test('a quoted parameter may contain a colon', () => {
  // Outlook emits TZID="GMT+03:00"; splitting on the first colon breaks it.
  const line = parseLine('DTSTART;TZID="GMT+03:00":20260315T140000');
  assert.equal(line.name, 'DTSTART');
  assert.equal(line.params.TZID, 'GMT+03:00');
  assert.equal(line.value, '20260315T140000');
});

test('text escapes decode in the right order', () => {
  assert.equal(unescapeText('a\\, b\; c\\nd\\\\e'), 'a, b; c\nd\\e');
  // \\n is an escaped backslash followed by "n", not a newline.
  assert.equal(unescapeText('x\\\\ny'), 'x\\ny');
});

/* ══ 2 · DATES ═══════════════════════════════════════════════════════ */

test('all three DTSTART shapes resolve to a local night', () => {
  assert.equal(parseDateValue('20260315', { VALUE: 'DATE' }).date, '2026-03-15');
  assert.equal(parseDateValue('20260315T140000', { TZID: 'Europe/London' }).date, '2026-03-15');
  assert.equal(parseDateValue('20260315T140000Z', {}, 'Africa/Nairobi').date, '2026-03-15');
  assert.equal(parseDateValue('garbage', {}), null);
});

test('a UTC instant lands on the property day, not the UTC day', () => {
  // 22:30 UTC on the 15th is 01:30 on the 16th in Nairobi (UTC+3).
  assert.equal(parseDateValue('20260315T223000Z', {}, 'Africa/Nairobi').date, '2026-03-16');
  assert.equal(parseDateValue('20260315T223000Z', {}, 'UTC').date, '2026-03-15');
});

test('ISO 8601 durations parse, including weeks and negatives', () => {
  assert.equal(parseDuration('P3D'), 259200);
  assert.equal(parseDuration('P1W'), 604800);
  assert.equal(parseDuration('PT2H30M'), 9000);
  assert.equal(parseDuration('-P1D'), -86400);
  assert.equal(parseDuration('nonsense'), null);
});

/* ══ 3 · PARSING REAL FEEDS ══════════════════════════════════════════ */

test('Airbnb: reservations and blocks are told apart', () => {
  const { events } = parseICalendar(ics(
    'PRODID:-//Airbnb Inc//Hosting Calendar 0.8.8//EN',
    'BEGIN:VEVENT', 'DTSTART;VALUE=DATE:20260315', 'DTEND;VALUE=DATE:20260318',
    'UID:abc@airbnb.com', 'SUMMARY:Reserved', 'END:VEVENT',
    'BEGIN:VEVENT', 'DTSTART;VALUE=DATE:20260320', 'DTEND;VALUE=DATE:20260322',
    'UID:def@airbnb.com', 'SUMMARY:Airbnb (Not available)', 'END:VEVENT',
  ), { today: TODAY });

  assert.equal(events.length, 2);
  assert.equal(events[0].kind, 'reservation');
  assert.equal(events[1].kind, 'blocked');
  // DTEND is exclusive: a guest leaving on the 18th frees the 18th.
  assert.equal(events[0].start, '2026-03-15');
  assert.equal(events[0].end, '2026-03-18');
});

test('VTIMEZONE is never mistaken for an event', () => {
  // The DST anchor DTSTART:19700329T010000 lives inside VTIMEZONE. A flat
  // scan reads it as an event and blocks 1970.
  const { events } = parseICalendar(ics(
    'BEGIN:VTIMEZONE', 'TZID:Europe/London',
    'BEGIN:DAYLIGHT', 'DTSTART:19700329T010000', 'TZOFFSETFROM:+0000',
    'TZOFFSETTO:+0100', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
    'END:VTIMEZONE',
    'BEGIN:VEVENT', 'UID:g@google.com',
    'DTSTART;TZID=Europe/London:20260410T140000',
    'DTEND;TZID=Europe/London:20260412T100000',
    'SUMMARY:Owner stay', 'END:VEVENT',
  ), { today: TODAY });

  assert.equal(events.length, 1);
  assert.equal(events[0].start, '2026-04-10');
  assert.equal(events[0].end, '2026-04-12');
});

test('a folded DESCRIPTION cannot smuggle a fake DTSTART', () => {
  const { events } = parseICalendar(ics(
    'BEGIN:VEVENT', 'UID:f@x', 'DTSTART;VALUE=DATE:20260501', 'DTEND;VALUE=DATE:20260503',
    'SUMMARY:Reserved',
    'DESCRIPTION:link https://example.com/very/long/path?a=b',
    ' &c=d containing DTSTART:19990101 as text',
    'END:VEVENT',
  ), { today: TODAY });

  assert.equal(events.length, 1);
  assert.equal(events[0].start, '2026-05-01');
  assert.match(events[0].description, /DTSTART:19990101/);
});

test('cancelled and transparent events free the nights', () => {
  const { events } = parseICalendar(ics(
    'BEGIN:VEVENT', 'UID:c1@x', 'DTSTART;VALUE=DATE:20260601', 'DTEND;VALUE=DATE:20260605',
    'SUMMARY:Reserved', 'STATUS:CANCELLED', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:c2@x', 'DTSTART;VALUE=DATE:20260610', 'DTEND;VALUE=DATE:20260612',
    'SUMMARY:Reserved', 'TRANSP:TRANSPARENT', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:c3@x', 'DTSTART;VALUE=DATE:20260615', 'DTEND;VALUE=DATE:20260617',
    'SUMMARY:Reserved', 'END:VEVENT',
  ), { today: TODAY });

  assert.deepEqual(events.map(e => e.uid), ['c3@x']);
});

test('DURATION substitutes for a missing DTEND', () => {
  const { events } = parseICalendar(ics(
    'BEGIN:VEVENT', 'UID:d@x', 'DTSTART;VALUE=DATE:20260701', 'DURATION:P3D',
    'SUMMARY:Blocked', 'END:VEVENT',
  ), { today: TODAY });
  assert.equal(events[0].end, '2026-07-04');
});

test('an event with neither DTEND nor DURATION still holds one night', () => {
  const { events } = parseICalendar(ics(
    'BEGIN:VEVENT', 'UID:n@x', 'DTSTART;VALUE=DATE:20260801', 'SUMMARY:Blocked', 'END:VEVENT',
  ), { today: TODAY });
  assert.equal(events[0].start, '2026-08-01');
  assert.equal(events[0].end, '2026-08-02');
});

test('a recurring owner block expands to every occurrence', () => {
  // One VEVENT. Read literally it blocks one Friday and sells the other fifty.
  const { events } = parseICalendar(ics(
    'BEGIN:VEVENT', 'UID:r@x', 'DTSTART;VALUE=DATE:20260306', 'DTEND;VALUE=DATE:20260308',
    'SUMMARY:Owner block', 'RRULE:FREQ=WEEKLY;BYDAY=FR;UNTIL=20260430',
    'EXDATE;VALUE=DATE:20260320', 'END:VEVENT',
  ), { today: TODAY, horizonDays: 120 });

  const starts = events.map(e => e.start).sort();
  assert.ok(events.length >= 6, `expected several Fridays, got ${events.length}`);
  assert.ok(!starts.includes('2026-03-20'), 'EXDATE must be removed');
  assert.ok(starts.every(d => d <= '2026-04-30'), 'UNTIL must be respected');
  assert.equal(new Set(events.map(e => e.uid)).size, events.length, 'UIDs must stay unique');
  assert.ok(events.every(e => e.end > e.start), 'each occurrence keeps its duration');
});

test('an unbounded recurrence cannot run away', () => {
  const out = expandRecurrence('2026-01-01', 'FREQ=DAILY', { until: '2026-03-01' });
  assert.ok(out.length <= 60 && out.length > 50, `bounded to the horizon, got ${out.length}`);
  assert.ok(expandRecurrence('2026-01-01', 'FREQ=DAILY').length <= 750);
});

test('unknown wording is treated as unsellable, not sellable', () => {
  assert.equal(classifyEvent({ summary: 'Blocked' }), 'blocked');
  assert.equal(classifyEvent({ summary: 'Reserved' }), 'reservation');
  assert.equal(classifyEvent({ summary: 'CLOSED - Not available' }), 'blocked');
  assert.equal(classifyEvent({ summary: 'wat' }), 'blocked');
});

test('bare-LF feeds parse the same as CRLF ones', () => {
  const body = ics('BEGIN:VEVENT', 'UID:a@x', 'DTSTART;VALUE=DATE:20260901',
                   'DTEND;VALUE=DATE:20260903', 'SUMMARY:Reserved', 'END:VEVENT');
  assert.equal(parseICalendar(body.replace(/\r\n/g, '\n'), { today: TODAY }).events.length, 1);
});

/* ══ 4 · WHAT WE PUBLISH ═════════════════════════════════════════════ */

const SAMPLE = buildICalendar({
  name: 'Cabana · Test',
  listingId: 'L1',
  events: [
    { uid: 'CBN-1', start: '2026-09-01', end: '2026-09-05', summary: 'Cabana booking', kind: 'reservation' },
    { uid: 'CBN-2', start: '2026-09-10', end: '2026-09-11', summary: 'Blocked; by host, really', kind: 'manual' },
  ],
});

test('the published feed is RFC 5545 clean', () => {
  assert.ok(SAMPLE.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(SAMPLE.trimEnd().endsWith('END:VCALENDAR'));
  assert.ok(!/[^\r]\n/.test(SAMPLE), 'every break must be CRLF');
  // DTSTAMP is REQUIRED. Its absence is the commonest reason a feed
  // imports as empty on the other side.
  assert.equal((SAMPLE.match(/^DTSTAMP:/gm) || []).length, 2);
  assert.equal((SAMPLE.match(/^UID:/gm) || []).length, 2);
  assert.ok(SAMPLE.includes('DTSTART;VALUE=DATE:20260901'));
  assert.ok(SAMPLE.includes('DTEND;VALUE=DATE:20260905'));
  assert.ok(SAMPLE.includes('REFRESH-INTERVAL;VALUE=DURATION:PT1H'));
  assert.ok(SAMPLE.includes('X-PUBLISHED-TTL:PT1H'));
});

test('no published line exceeds 75 octets', () => {
  const over = SAMPLE.split('\r\n').filter(l => new TextEncoder().encode(l).length > 75);
  assert.deepEqual(over, []);
});

test('folding splits on characters, never inside a UTF-8 sequence', () => {
  const line = 'SUMMARY:' + 'Réservation à Abidjan — chambre climatisée 🌴'.repeat(3);
  const folded = foldLine(line);
  assert.equal(unfold(folded.replace(/\r\n/g, '\n')), line);
  assert.ok(folded.split('\r\n').every(l => new TextEncoder().encode(l).length <= 75));
});

test('TEXT values are escaped, semicolons included', () => {
  assert.equal(escapeText('a; b, c\\d\ne'), 'a\\; b\\, c\\\\d\\ne');
  assert.ok(SAMPLE.includes('SUMMARY:Blocked\\; by host\\, really'));
});

test('a bare CR in a guest name cannot inject calendar properties', () => {
  // Everything we publish is derived from a listing title or a guest
  // name, so this is reachable input. A lone \r is not \r\n, so a
  // naive normaliser leaves it in place and every lenient reader on the
  // other side treats it as a line break — arbitrary properties injected
  // into the calendar Airbnb fetches from us.
  const evil = 'Ann\rSUMMARY:INJECTED\rDTSTART;VALUE=DATE:20990101';
  const feed = buildICalendar({
    name: evil,
    events: [{ uid: 'u', start: '2026-01-01', end: '2026-01-02', summary: evil }],
  });
  const { events } = parseICalendar(feed, { today: '2026-01-01' });

  assert.equal(events.length, 1, 'the payload must not become a second event');
  assert.equal(events[0].end, '2026-01-02', 'the payload must not move the dates');
  assert.ok(events[0].summary.startsWith('Ann'), 'the real value survives, inert');
  assert.ok(!/\r(?!\n)/.test(feed), 'no CR outside a CRLF pair may reach the bytes');
});

test('what we publish, we can read back unchanged', () => {
  const { events } = parseICalendar(SAMPLE, { today: '2026-08-01' });
  assert.equal(events.length, 2);
  assert.equal(events[0].start, '2026-09-01');
  assert.equal(events[0].end, '2026-09-05');
});

test('our own feed is recognised as an echo, so a loop cannot form', () => {
  // A channel manager that mirrors calendars sends our bookings back. If
  // those counted as external reservations, every Cabana booking would
  // conflict with itself and block the guest who paid for it.
  const { events } = parseICalendar(SAMPLE, { today: '2026-08-01' });
  assert.ok(events.every(e => e.kind === 'echo'));
});

test('a fingerprint tracks meaning, not bytes', () => {
  // Airbnb rewrites DTSTAMP every request; byte comparison always says
  // "changed" and every poll does a pointless full diff.
  const a = [{ uid: 'x', start: '2026-01-01', end: '2026-01-03', kind: 'reservation' }];
  const b = [{ uid: 'x', start: '2026-01-01', end: '2026-01-03', kind: 'reservation' }];
  const c = [{ uid: 'x', start: '2026-01-01', end: '2026-01-04', kind: 'reservation' }];
  assert.equal(contentFingerprint(a), contentFingerprint(b));
  assert.notEqual(contentFingerprint(a), contentFingerprint(c));
});

/* ══ 5 · PLATFORMS ═══════════════════════════════════════════════════ */

test('feed URLs are matched on host suffix, never substring', () => {
  assert.equal(detectPlatform('https://www.airbnb.com/calendar/ical/1.ics?s=x').key, 'airbnb');
  assert.equal(detectPlatform('https://ical.booking.com/v1/export?t=a').key, 'booking');
  assert.equal(detectPlatform('http://www.vrbo.com/icalendar/a.ics').key, 'vrbo');
  assert.equal(detectPlatform('https://calendar.google.com/calendar/ical/a/private-b/basic.ics').key, 'google');
  assert.equal(detectPlatform('https://www.nightsbridge.co.za/ical/1.ics').key, 'nightsbridge');
  // Spoofing attempts must not inherit a platform's identity.
  assert.equal(detectPlatform('https://evil.example.com/?x=airbnb.com').key, 'other');
  assert.equal(detectPlatform('https://not-airbnb.com/f.ics').key, 'other');
  assert.equal(detectPlatform('nonsense').key, 'other');
});

test('webcal and http links are accepted and upgraded', () => {
  // Every platform puts webcal:// on the clipboard; making a host
  // hand-edit the scheme is a support ticket we can simply not have.
  assert.equal(normaliseFeedUrl('webcal://p01-caldav.icloud.com/published/2/x'),
               'https://p01-caldav.icloud.com/published/2/x');
  assert.equal(normaliseFeedUrl('http://www.vrbo.com/icalendar/a.ics'),
               'https://www.vrbo.com/icalendar/a.ics');
  assert.equal(normaliseFeedUrl('  https://x.com/a.ics  '), 'https://x.com/a.ics');
  assert.equal(normaliseFeedUrl('ftp://x.com/a.ics'), null);
  assert.equal(normaliseFeedUrl('javascript:alert(1)'), null);
  assert.equal(normaliseFeedUrl(''), null);
});

test('the registry covers the platforms hosts actually use', () => {
  const keys = new Set(PLATFORMS.map(p => p.key));
  for (const must of ['airbnb', 'booking', 'vrbo', 'expedia', 'agoda', 'tripadvisor',
                      'google', 'apple', 'outlook', 'guesty', 'hostaway', 'lodgify',
                      'ownerrez', 'smoobu', 'beds24', 'hospitable', 'nightsbridge', 'other']) {
    assert.ok(keys.has(must), `missing platform: ${must}`);
  }
  assert.ok(PLATFORMS.length >= 30, 'a "works with everything" claim needs breadth');
  assert.equal(getPlatform('nope').key, 'other', 'unknown keys fall back, never throw');
});

test('every importable platform tells the host where to click', () => {
  for (const p of connectionGuide('https://cabana.africa/calendar/tok.ics')) {
    if (p.canImport) assert.ok(p.importSteps.length, `${p.key} has no import steps`);
    if (p.canExport) assert.ok(p.exportSteps.length, `${p.key} has no export steps`);
  }
});

test('a listing cannot be connected to its own feed', () => {
  assert.equal(detectPlatform('https://cabana.africa/calendar/abc.ics').key, 'cabana');
  assert.equal(getPlatform('cabana').canImport, false);
});

/* ══ 6 · SSRF ════════════════════════════════════════════════════════ */

test('private and reserved address space is refused', () => {
  for (const ip of ['127.0.0.1', '10.0.0.5', '172.16.0.1', '172.31.255.254',
                    '192.168.1.1', '169.254.169.254',   // cloud metadata
                    '0.0.0.0', '100.64.0.1', '224.0.0.1',
                    '::1', 'fc00::1', 'fe80::1',
                    '::ffff:10.0.0.1',                   // v4 wearing a v6 hat
                    '2002:c0a8:0101::',                  // 6to4
                    'not-an-ip', '']) {
    assert.equal(isBlockedAddress(ip), true, `${ip} must be blocked`);
  }
});

test('the public internet is not over-blocked', () => {
  for (const ip of ['8.8.8.8', '1.1.1.1', '52.94.236.248', '99.86.1.1',
                    '172.32.0.1', '172.15.0.1',          // just outside RFC 1918
                    '2606:4700:4700::1111']) {
    assert.equal(isBlockedAddress(ip), false, `${ip} must be allowed`);
  }
});

/* ══ 7 · ROUTING ═════════════════════════════════════════════════════
   The public feed is the whole feature. If its URL does not resolve, no
   platform on earth can read this calendar — which is exactly the bug
   this work replaces. */

const VERCEL = JSON.parse(read('vercel.json'));
const SERVER = read('server.js');
const ROUTE  = read('api/calendar-sync.js');

test('the public feed URL is routable in production and locally', () => {
  const sources = VERCEL.rewrites.map(r => r.source);
  assert.ok(sources.some(s => s.startsWith('/calendar/') && s.endsWith('.ics')),
            'vercel.json must route /calendar/<token>.ics');
  assert.ok(sources.includes('/api/ical'));
  assert.ok(sources.includes('/api/calendar-cron'));
  assert.match(SERVER, /\/calendar\\\/\(\[A-Za-z0-9_-\]\+\)/, 'server.js must mirror the feed route');
  assert.match(SERVER, /calendar-cron/);
});

test('the feed and the cron are answered before any auth check', () => {
  // requireUser() ahead of these two is the original defect: it made the
  // export return 401 to every platform, forever.
  const feedAt = ROUTE.indexOf("action === 'feed'");
  const cronAt = ROUTE.indexOf("action === 'cron'");
  const authAt = ROUTE.indexOf('await requireUser');
  assert.ok(feedAt > 0 && cronAt > 0 && authAt > 0);
  assert.ok(feedAt < authAt, 'the public feed must not require a session');
  assert.ok(cronAt < authAt, 'the cron must not require a session');
});

test('the deployed function count stays under the Hobby ceiling', () => {
  // Adding a fourteenth api/*.js file breaks the deploy with an error
  // that does not name the file you just added.
  const ignored = new Set(read('.vercelignore').split('\n').map(l => l.trim()).filter(Boolean));
  const fns = readdirSync(join(ROOT, 'api')).filter(f => /\.m?js$/.test(f)).map(f => 'api/' + f);
  assert.ok(fns.filter(f => !ignored.has(f)).length <= 12,
            'fold new routes into an existing function with a rewrite');
});

test('host actions execute as the host, never as the service role', () => {
  // The service key bypasses RLS and makes auth.uid() null, which turns
  // every ownership check in every calendar function into a no-op.
  assert.match(ROUTE, /rpcAsUser/);
  assert.match(ROUTE, /anonKey/);
  for (const fn of ['cabana_calendar_overview', 'cabana_calendar_add_feed',
                    'cabana_calendar_manual_block', 'cabana_calendar_rotate_token']) {
    assert.ok(new RegExp(`rpcAsUser\\(req, '${fn}'`).test(ROUTE), `${fn} must run as the user`);
  }
});

/* ══ 8 · THE MIGRATION'S PROMISES ════════════════════════════════════ */

const SQL = read('supabase/migrations/20260902090000_ical_calendar_sync.sql');

test('availability consults imported blocks, not just paid holds', () => {
  // The defect this fixes: calendar_blocks was written on every import
  // and read by nothing, so a connected channel never closed a night.
  const fn = SQL.slice(SQL.indexOf('function public.cabana_dates_available'),
                       SQL.indexOf('comment on function public.cabana_dates_available'));
  assert.match(fn, /public\.listing_holds/);
  assert.match(fn, /public\.calendar_blocks/);
  assert.match(fn, /block_on_import/);
  assert.match(fn, /turnover_days/);
  assert.match(fn, /kind <> 'echo'/);
});

test('a UID is unique per feed, not globally', () => {
  // A global unique on external_uid collides across listings the moment
  // two hosts import from the same platform.
  assert.match(SQL, /drop constraint if exists calendar_blocks_external_uid_key/);
  assert.match(SQL, /calendar_blocks_uid_per_feed[\s\S]{0,120}\(feed_id, external_uid\)/);
});

test('a sync is a diff: vanished reservations reopen their nights', () => {
  assert.match(SQL, /not \(external_uid = any \(v_seen\)\)/);
  assert.match(SQL, /is_active = false, dropped_at = now\(\)/);
});

test('a 304 or an error never clears a calendar', () => {
  const fn = SQL.slice(SQL.indexOf('function public.cabana_calendar_apply_sync'));
  const unchanged = fn.slice(fn.indexOf("if v_outcome = 'unchanged'"), fn.indexOf('drop table if exists pg_temp._incoming'));
  assert.ok(!/delete from public\.calendar_blocks|is_active = false/.test(unchanged),
            'the unchanged path must not touch blocks');
});

test('imported ranges are never re-exported', () => {
  // Echoing a platform its own bookings is the classic feedback loop.
  const fn = SQL.slice(SQL.indexOf('function public.cabana_calendar_export'),
                       SQL.indexOf('· APPLYING A SYNC'));
  assert.match(fn, /cb\.feed_id is null/);
  assert.match(fn, /cb\.kind in \('manual','maintenance'\)/);
});

test('the export token is the credential and can be rotated', () => {
  assert.match(SQL, /export_token[\s\S]{0,120}gen_random_bytes\(24\)/);
  assert.match(SQL, /function public\.cabana_calendar_rotate_token/);
});

test('service-role-only functions are revoked from anon and authenticated', () => {
  for (const fn of ['cabana_calendar_export', 'cabana_calendar_apply_sync',
                    'cabana_calendar_due_feeds']) {
    assert.ok(new RegExp(`revoke all on function public\\.${fn}[^;]*from public, anon, authenticated`).test(SQL),
              `${fn} must not be callable by anon`);
  }
});

test('the anon key cannot reach a host-only calendar function', () => {
  // Postgres grants EXECUTE to PUBLIC by default and anon is in PUBLIC,
  // so granting to `authenticated` is not the same as taking it away
  // from everyone else. The privilege has to come off PUBLIC.
  for (const fn of ['cabana_calendar_add_feed', 'cabana_calendar_manual_block',
                    'cabana_calendar_rotate_token', 'cabana_calendar_overview',
                    'cabana_calendar_my_listings', 'cabana_calendar_unblock',
                    'cabana_calendar_remove_feed', 'cabana_dates_available']) {
    assert.ok(new RegExp(`revoke execute on function public\\.${fn}\\([^)]*\\)\\s+from public, anon`).test(SQL),
              `${fn} must be revoked from PUBLIC, not merely granted to authenticated`);
  }
  // The one exception, on purpose: public listing pages show busy nights.
  assert.match(SQL, /grant execute on function public\.cabana_listing_calendar\([^)]*\)\s+to anon/);
});

test('every new table has row level security on', () => {
  for (const t of ['listing_calendar_settings', 'calendar_feeds', 'calendar_blocks',
                   'calendar_sync_runs', 'calendar_conflicts']) {
    assert.ok(new RegExp(`alter table public\\.${t}\\s+enable row level security`).test(SQL),
              `${t} needs RLS`);
  }
});

test('the legacy blanket policies on calendar_blocks are dropped', () => {
  // RLS policies are OR'd. "insert calendar blocks" with check (true),
  // granted to PUBLIC, meant the anon key in the page source could block
  // out any listing on the marketplace — and availability now reads this
  // table, so that is a total inventory denial of service.
  for (const legacy of ['read calendar blocks', 'insert calendar blocks', 'update calendar blocks']) {
    assert.ok(new RegExp(`drop policy if exists "${legacy}"\\s+on public\\.calendar_blocks`).test(SQL),
              `the permissive policy "${legacy}" must be dropped`);
  }
  assert.match(SQL, /revoke all on public\.calendar_blocks\s+from anon/);
  assert.match(SQL, /revoke all on public\.listing_calendar_settings from anon/);
});

test('a failing feed backs off instead of hammering the platform', () => {
  assert.match(SQL, /power\(2, least\(consecutive_failures, 4\)\)/);
  assert.match(SQL, /consecutive_failures < 12/);
});

test('the scheduler does not depend on the Hobby cron limit', () => {
  // Vercel Hobby allows two crons, once a day. A daily calendar sync
  // means up to 24 hours of double-booking exposure.
  assert.match(SQL, /cron\.schedule\(\s*'cabana-calendar-sync'/);
  assert.match(SQL, /'\*\/15 \* \* \* \*'/);
  assert.equal(VERCEL.crons.length, 2, 'Hobby ceiling: leave the two existing crons alone');
});

/* ══ 9 · THE HOST PAGE ═══════════════════════════════════════════════ */

const PAGE = read('partner-calendar.html');

test('the calendar page no longer queries a table that does not exist', () => {
  // It read `bookings` — absent from this project — so every host saw an
  // empty calendar and the error was swallowed.
  assert.ok(!PAGE.includes("from('bookings')"));
  assert.match(PAGE, /\/api\/calendar-sync/);
});

test('the page reads everything in one round trip', () => {
  assert.match(PAGE, /api\('overview'/);
  assert.equal((PAGE.match(/api\('overview'/g) || []).length, 1);
});

test('a double-booked night is visually unmistakable', () => {
  assert.match(PAGE, /is-clash/);
  assert.match(PAGE, /repeating-linear-gradient/);   // pattern, not colour alone
  assert.match(PAGE, /DOUBLE BOOKED/);
});
