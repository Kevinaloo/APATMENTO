/* ══════════════════════════════════════════════════════════════════════
   CABANA · Calendar sync orchestration  (api/lib/_calendar-sync.js)
   ──────────────────────────────────────────────────────────────────────
   Fetch → parse → diff → commit, plus the public feed we publish.

   Two decisions in here carry most of the weight.

   1. A SYNC IS A DIFF, NOT AN APPEND.
      A feed is a complete statement of the truth at a moment. A
      reservation that has DISAPPEARED from it was cancelled on the other
      platform, and those nights must open again. Appending — which is
      what the previous implementation did, with a bare upsert and no
      reconciliation — means a calendar that only ever grows: every
      cancelled Airbnb booking blocks our calendar permanently, and the
      host has no way to clear it. The diff lives in the database, in one
      transaction, so a half-applied calendar cannot exist.

   2. WE COMPARE MEANING, NOT BYTES.
      Airbnb rewrites DTSTAMP on every request, so the body is never
      byte-identical and a content hash over the raw text always reports
      "changed". Fingerprinting the parsed events instead means a quiet
      calendar costs one 304-shaped no-op an hour rather than a full
      rewrite of every row.
══════════════════════════════════════════════════════════════════════ */

import { serviceHeaders, supabase, publicOrigin } from './_env.js';
import { fetchCalendar } from './_calendar-fetch.js';
import { detectPlatform, getPlatform, normaliseFeedUrl } from './_calendar-platforms.js';
import { parseICalendar, buildICalendar, contentFingerprint, LIMITS } from './_ical.js';

/* ── Supabase, service role ─────────────────────────────────────────── */

async function rpc(fn, args = {}) {
  const { url } = supabase();
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: serviceHeaders(),
    body: JSON.stringify(args),
  });
  const text = await res.text();
  if (!res.ok) {
    throw Object.assign(new Error(`rpc ${fn}: ${text.slice(0, 300)}`),
                        { status: res.status === 403 ? 403 : 500, rpc: fn });
  }
  return text ? JSON.parse(text) : null;
}

export { rpc };

/* The URL we hand a host to paste into Airbnb. A capability token in a
   path, because several platforms mangle or drop query strings when
   storing an import URL, and a path segment survives all of them. */
export function publicFeedUrl(token) {
  return `${publicOrigin()}/calendar/${token}.ics`;
}

/* ══ 1 · THE PUBLIC FEED ═════════════════════════════════════════════ */

export async function renderPublicFeed(token, userAgent) {
  const payload = await rpc('cabana_calendar_export', {
    p_token: String(token || '').trim(),
    p_agent: String(userAgent || '').slice(0, 200) || null,
  });

  if (!payload?.ok) return { ok: false, error: payload?.error || 'unknown_token' };

  const events = (payload.events || []).map(e => ({
    uid: e.uid,
    start: e.start,
    end: e.end,
    kind: e.kind,
    /* Deliberately generic. The other platform needs to know the night
       is gone, not who is in the bed; a guest name in a feed a whole
       channel can read is a privacy leak with no upside. Hosts who want
       names can switch them on per listing. */
    summary: e.guest
      ? `Cabana · ${e.guest}`
      : e.kind === 'reservation' ? 'Cabana booking'
      : e.kind === 'maintenance' ? 'Maintenance'
      : 'Blocked',
    description: e.kind === 'reservation'
      ? `Booked through Cabana. Reference ${e.ref || ''}`.trim()
      : 'Blocked by the host on Cabana.',
    created: e.made,
  }));

  return {
    ok: true,
    listingId: payload.listing_id,
    ics: buildICalendar({
      name: `Cabana · ${payload.title}`,
      timezone: payload.timezone || 'Africa/Nairobi',
      listingId: payload.listing_id,
      url: publicFeedUrl(token),
      events,
      ttlHours: 1,
    }),
    count: events.length,
  };
}

/* ══ 2 · READING SOMEBODY ELSE'S FEED ════════════════════════════════ */

/**
 * Fetch and parse without writing anything. Powers the "Test this link"
 * button, so a host learns the URL is wrong while they still have the
 * other tab open, rather than three hours later when nothing synced.
 */
export async function previewFeed(rawUrl, { timeZone = 'Africa/Nairobi' } = {}) {
  const url = normaliseFeedUrl(rawUrl);
  if (!url) return { ok: false, error: 'That link is not a valid https calendar URL.' };

  const platform = detectPlatform(url);
  const started = Date.now();

  let res;
  try {
    res = await fetchCalendar(url);
  } catch (e) {
    return { ok: false, error: e.message, status: e.status || 502, platform: platform.key };
  }

  const looksLikeCalendar = /BEGIN:VCALENDAR/i.test(res.body);
  if (!looksLikeCalendar) {
    /* Overwhelmingly the commonest mistake: the host copied the address
       bar instead of the export link, so we get an HTML login page with
       a 200 status. Saying exactly that saves a support round trip. */
    const looksLikeHtml = /^\s*<(?:!doctype|html)/i.test(res.body);
    return {
      ok: false,
      platform: platform.key,
      error: looksLikeHtml
        ? 'That link returns a web page, not a calendar. Copy the .ics export link from the calendar or sync section rather than the address bar.'
        : 'That link did not return a calendar file. Check you copied the iCal export link.',
    };
  }

  const parsed = parseICalendar(res.body, { timeZone });
  const events = parsed.events;

  return {
    ok: true,
    platform: platform.key,
    platformName: platform.name,
    detected: platform.key !== 'other',
    events: events.length,
    reservations: events.filter(e => e.kind === 'reservation').length,
    blocks:       events.filter(e => e.kind === 'blocked').length,
    echoes:       events.filter(e => e.kind === 'echo').length,
    firstDate: events.length ? events.map(e => e.start).sort()[0] : null,
    lastDate:  events.length ? events.map(e => e.end).sort().slice(-1)[0] : null,
    calendarName: parsed.calendar.name,
    producer: parsed.calendar.prodid,
    warnings: parsed.warnings.slice(0, 5),
    ms: Date.now() - started,
    sample: events.slice(0, 8).map(e => ({
      start: e.start, end: e.end, kind: e.kind, summary: e.summary,
    })),
  };
}

/**
 * Sync one feed and commit the result.
 * Never throws for an ordinary failure: a broken feed is recorded as a
 * failed run so the host can see it, and the cron moves to the next one.
 */
export async function syncFeed(feed, { trigger = 'cron', timeZone = 'Africa/Nairobi' } = {}) {
  const started = Date.now();
  const feedId = feed.feed_id || feed.id;

  const commit = (events, meta) =>
    rpc('cabana_calendar_apply_sync', {
      p_feed_id: feedId,
      p_events: events,
      p_meta: { trigger, duration_ms: Date.now() - started, ...meta },
    });

  let res;
  try {
    res = await fetchCalendar(feed.url, {
      etag: feed.etag || null,
      lastModified: feed.last_modified || null,
    });
  } catch (e) {
    await commit([], { outcome: 'error', error: e.message, http_status: e.status || 0 })
      .catch(() => {});
    return { feed_id: feedId, ok: false, outcome: 'error', error: e.message };
  }

  /* The cheap path, and on a healthy calendar it is most of them. */
  if (res.notModified) {
    await commit([], { outcome: 'unchanged', http_status: 304 }).catch(() => {});
    return { feed_id: feedId, ok: true, outcome: 'unchanged' };
  }

  if (!/BEGIN:VCALENDAR/i.test(res.body)) {
    const error = /^\s*<(?:!doctype|html)/i.test(res.body)
      ? 'The link now returns a web page instead of a calendar. Re-copy the .ics export link.'
      : 'The link did not return a calendar file.';
    await commit([], { outcome: 'error', error, http_status: res.status }).catch(() => {});
    return { feed_id: feedId, ok: false, outcome: 'error', error };
  }

  let parsed;
  try {
    parsed = parseICalendar(res.body, { timeZone });
  } catch (e) {
    const error = `Could not read the calendar: ${e.message}`;
    await commit([], { outcome: 'error', error, http_status: res.status }).catch(() => {});
    return { feed_id: feedId, ok: false, outcome: 'error', error };
  }

  const fingerprint = contentFingerprint(parsed.events);

  /* Byte-identical is rare; meaning-identical is the common case. Both
     end here, and neither touches a single calendar_blocks row. */
  if (feed.content_hash && feed.content_hash === fingerprint) {
    await commit([], {
      outcome: 'unchanged', http_status: res.status,
      etag: res.etag, last_modified: res.lastModified,
    }).catch(() => {});
    return { feed_id: feedId, ok: true, outcome: 'unchanged', reason: 'identical_content' };
  }

  /* An echo is our own booking arriving back through a channel manager
     that mirrors calendars. Stored — the host should see that the loop
     exists — but never counted as a competing reservation and never
     re-exported, which is what stops two systems blocking each other
     forever over one guest. */
  const events = parsed.events
    .filter(e => e.end > e.start)
    .slice(0, LIMITS.maxEvents)
    .map(e => ({
      uid: String(e.uid).slice(0, 400),
      start_date: e.start,
      end_date: e.end,
      kind: e.kind,
      summary: e.summary || null,
      description: (e.description || '').slice(0, 1000) || null,
      guest_label: e.guest || null,
    }));

  const applied = await commit(events, {
    outcome: 'ok',
    http_status: res.status,
    etag: res.etag,
    last_modified: res.lastModified,
    content_hash: fingerprint,
    bytes: res.bytes,
  });

  return {
    feed_id: feedId,
    ok: applied?.ok !== false,
    outcome: applied?.outcome || 'ok',
    parsed: applied?.parsed ?? events.length,
    created: applied?.created ?? 0,
    updated: applied?.updated ?? 0,
    dropped: applied?.dropped ?? 0,
    conflicts: applied?.conflicts ?? 0,
    platform: feed.platform,
  };
}

/**
 * The cron pass. Feeds are synced with bounded concurrency: serial is too
 * slow for a serverless timeout once a few dozen hosts connect, and
 * unbounded would open a hundred sockets at once and get us rate-limited
 * by the very platforms we depend on.
 */
export async function syncDueFeeds({ limit = 40, concurrency = 6, trigger = 'cron', budgetMs = 50000 } = {}) {
  const started = Date.now();
  const due = await rpc('cabana_calendar_due_feeds', { p_limit: limit });
  const queue = Array.isArray(due) ? [...due] : [];
  const results = [];

  const worker = async () => {
    while (queue.length) {
      /* Stop cleanly before the platform kills the function mid-write.
         Whatever is left is still due, and the next run picks it up. */
      if (Date.now() - started > budgetMs) return;
      const feed = queue.shift();
      if (!feed) return;
      try {
        results.push(await syncFeed(feed, { trigger }));
      } catch (e) {
        results.push({ feed_id: feed.feed_id, ok: false, outcome: 'error', error: e.message });
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, queue.length)) }, worker));

  return {
    ok: true,
    considered: Array.isArray(due) ? due.length : 0,
    synced: results.length,
    remaining: queue.length,
    changed:   results.filter(r => r.outcome === 'ok').length,
    unchanged: results.filter(r => r.outcome === 'unchanged').length,
    failed:    results.filter(r => !r.ok).length,
    conflicts: results.reduce((n, r) => n + (r.conflicts || 0), 0),
    ms: Date.now() - started,
    results,
  };
}

export { detectPlatform, getPlatform, normaliseFeedUrl };
export default { rpc, publicFeedUrl, renderPublicFeed, previewFeed, syncFeed, syncDueFeeds };
