/* ══════════════════════════════════════════════════════════════════════
   CABANA · /api/calendar-sync.js
   ──────────────────────────────────────────────────────────────────────
   One serverless function, three audiences, and the split between them
   is the fix at the centre of this whole feature.

     PUBLIC   GET /calendar/<token>.ics
              Airbnb's crawler. No cookie, no header, no account. The
              previous version wrapped this in requireUser() and answered
              401 to every platform on earth, which meant the export had
              never once worked. A token in the path is the credential,
              because a datacentre fetcher has no other way to prove
              anything.

     HOST     POST /api/calendar-sync   { action, … }
              A signed-in host managing connections. Every write is
              executed as THAT USER against a security-definer function,
              so a forged listingId is refused by Postgres rather than by
              a check in this file.

     CRON     GET /api/calendar-cron
              Bearer CRON_SECRET. Polls every due feed.

   It stays one function because the Hobby plan ceiling is twelve and we
   are at twelve. scripts/check-syntax.mjs fails the build if a
   fourteenth appears, so new surface goes behind a rewrite, never a new
   file in api/.
══════════════════════════════════════════════════════════════════════ */

export const config = { maxDuration: 60 };

import {
  setCors, requireUser, isCronAuthorized, hasInternalSecret,
  consumeRateLimit, safeErrorMessage,
} from './lib/_security.js';
import { supabase, optional } from './lib/_env.js';
import {
  rpc, publicFeedUrl, renderPublicFeed, previewFeed, syncFeed, syncDueFeeds,
} from './lib/_calendar-sync.js';
import { connectionGuide, detectPlatform, normaliseFeedUrl, getPlatform } from './lib/_calendar-platforms.js';

/* ── Calling Postgres AS THE SIGNED-IN HOST ──────────────────────────
   The service key would bypass RLS and make auth.uid() null, which turns
   every ownership check in every calendar function into a no-op. So user
   actions ride the user's own JWT with the ANON key, exactly as _env.js
   describes, and the database decides. */
async function rpcAsUser(req, fn, args) {
  const { url, anonKey } = supabase();
  const key = anonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '');

  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args || {}),
  });

  const text = await res.text();
  if (!res.ok) {
    /* Postgres raises 'not_your_listing' with SQLSTATE 42501. Surfacing
       it as 403 rather than 500 is the difference between "you do not
       own this" and "we are broken". */
    const denied = /not_your_listing|42501|permission denied/i.test(text);
    throw Object.assign(new Error(denied ? 'not_your_listing' : text.slice(0, 300)),
                        { status: denied ? 403 : 400 });
  }
  return text ? JSON.parse(text) : null;
}

function body(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  return req.body;
}

function query(req) {
  try { return Object.fromEntries(new URL(req.url, 'http://cabana.local').searchParams); }
  catch { return {}; }
}

/* ══ PUBLIC FEED ═════════════════════════════════════════════════════ */

async function servePublicFeed(req, res, token) {
  /* Tokens are 48 hex characters. Rejecting anything else costs a
     database round trip nothing, and makes the endpoint useless as a
     scanning target. */
  if (!/^[a-f0-9]{32,64}$/i.test(String(token || ''))) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(404).send('Calendar not found');
  }
  if (!consumeRateLimit(req, res, 'ical-feed', 120, 60_000)) return;

  let feed;
  try {
    feed = await renderPublicFeed(token, req.headers?.['user-agent']);
  } catch (e) {
    console.error('[calendar] public feed', e.message);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(500).send('Calendar temporarily unavailable');
  }

  if (!feed.ok) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(404).send('Calendar not found');
  }

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `inline; filename="cabana-${feed.listingId}.ics"`);
  /* Platforms poll hourly at best. A short shared cache absorbs the
     duplicate fetches every big OTA makes from several regions at once,
     without ever serving a stale calendar for long enough to matter. */
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=900');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('X-Cabana-Events', String(feed.count));
  return res.status(200).send(feed.ics);
}

/* ══ CRON ════════════════════════════════════════════════════════════ */

async function runCron(req, res) {
  if (!isCronAuthorized(req) && !hasInternalSecret(req)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const q = query(req);
  const out = await syncDueFeeds({
    limit: Math.min(200, parseInt(q.limit, 10) || 60),
    trigger: 'cron',
    budgetMs: 50_000,
  });
  /* Housekeeping rides the same wake-up rather than needing its own cron
     slot, of which Hobby has very few. */
  if (out.remaining === 0) await rpc('cabana_calendar_prune', { p_days: 30 }).catch(() => {});
  return res.status(200).json(out);
}

/* ══ HOST ACTIONS ════════════════════════════════════════════════════ */

const ACTIONS = {
  /* Everything the calendar page needs, in one round trip. */
  async overview(req, { listingId, from, to }) {
    const data = await rpcAsUser(req, 'cabana_calendar_overview', {
      p_listing_id: listingId,
      ...(from ? { p_from: from } : {}),
      ...(to   ? { p_to:   to   } : {}),
    });
    if (data?.settings?.export_token) {
      data.settings.feed_url = publicFeedUrl(data.settings.export_token);
      data.guide = connectionGuide(data.settings.feed_url);
    }
    for (const feed of (data?.feeds || [])) {
      const p = getPlatform(feed.platform);
      feed.platform_name = p.name;
      feed.platform_colour = p.colour;
    }
    return data;
  },

  async listings(req) {
    return { ok: true, listings: await rpcAsUser(req, 'cabana_calendar_my_listings', {}) };
  },

  /* Dry run. A host finds out the link is wrong while the other tab is
     still open, instead of three hours later when nothing has synced. */
  async 'feed.test'(req, { url, timezone }) {
    if (!url) throw Object.assign(new Error('url required'), { status: 400 });
    return previewFeed(url, { timeZone: timezone || 'Africa/Nairobi' });
  },

  async 'feed.add'(req, { listingId, url, platform, label, interval }) {
    const clean = normaliseFeedUrl(url);
    if (!clean) throw Object.assign(new Error('That is not a valid https calendar link'), { status: 400 });

    const detected = detectPlatform(clean);
    if (detected.key === 'cabana') {
      throw Object.assign(
        new Error('That is a Cabana calendar. Connecting a listing to itself would import its own bookings and block them twice.'),
        { status: 400 });
    }

    const chosen = platform && platform !== 'auto' ? getPlatform(platform) : detected;
    const added = await rpcAsUser(req, 'cabana_calendar_add_feed', {
      p_listing_id: listingId,
      p_url: clean,
      p_platform: chosen.key,
      p_label: label || null,
      p_interval: Math.min(1440, Math.max(15, parseInt(interval, 10) || chosen.interval)),
    });

    /* Sync immediately. A connection that shows nothing until the next
       cron feels broken, and the host retries, and now there are two. */
    let first = null;
    if (added?.feed_id) {
      const feeds = await rpc('cabana_calendar_due_feeds', { p_limit: 200 }).catch(() => []);
      const row = (feeds || []).find(f => f.feed_id === added.feed_id);
      if (row) first = await syncFeed(row, { trigger: 'manual' }).catch(e => ({ ok: false, error: e.message }));
    }
    return { ...added, platform: chosen.key, platform_name: chosen.name, first_sync: first };
  },

  async 'feed.update'(req, { feedId, patch }) {
    return rpcAsUser(req, 'cabana_calendar_update_feed', { p_feed_id: feedId, p_patch: patch || {} });
  },

  async 'feed.remove'(req, { feedId }) {
    return rpcAsUser(req, 'cabana_calendar_remove_feed', { p_feed_id: feedId });
  },

  /* Sync now. Ownership is proved through the user-scoped RPC FIRST;
     only then does the service-role sync run. Skipping that order would
     let anyone refresh anyone's feed. */
  async 'feed.sync'(req, { feedId }) {
    await rpcAsUser(req, 'cabana_calendar_update_feed',
                    { p_feed_id: feedId, p_patch: { sync_now: true } });
    const feeds = await rpc('cabana_calendar_due_feeds', { p_limit: 200 });
    const row = (feeds || []).find(f => f.feed_id === feedId);
    if (!row) return { ok: true, outcome: 'skipped', reason: 'feed_inactive_or_missing' };
    return syncFeed(row, { trigger: 'manual' });
  },

  async 'settings.update'(req, { listingId, patch }) {
    const saved = await rpcAsUser(req, 'cabana_calendar_update_settings',
                                  { p_listing_id: listingId, p_patch: patch || {} });
    if (saved?.export_token) saved.feed_url = publicFeedUrl(saved.export_token);
    return { ok: true, settings: saved };
  },

  async 'token.rotate'(req, { listingId }) {
    const token = await rpcAsUser(req, 'cabana_calendar_rotate_token', { p_listing_id: listingId });
    return { ok: true, token, feed_url: publicFeedUrl(token) };
  },

  async 'block.add'(req, { listingId, start, end, note, kind }) {
    return rpcAsUser(req, 'cabana_calendar_manual_block', {
      p_listing_id: listingId, p_start: start, p_end: end,
      p_note: note || null, p_kind: kind === 'maintenance' ? 'maintenance' : 'manual',
    });
  },

  async 'block.remove'(req, { blockId }) {
    return rpcAsUser(req, 'cabana_calendar_unblock', { p_block_id: blockId });
  },

  async 'conflict.resolve'(req, { conflictId, resolution, status }) {
    return rpcAsUser(req, 'cabana_calendar_resolve_conflict', {
      p_conflict_id: conflictId,
      p_resolution: resolution || 'acknowledged',
      p_status: status || 'resolved',
    });
  },

  /* The platform catalogue, with the host's own feed URL already spliced
     into every "paste this" instruction. */
  async guide(req, { listingId }) {
    let feedUrl = null;
    if (listingId) {
      const s = await rpcAsUser(req, 'cabana_calendar_settings', { p_listing_id: listingId })
        .catch(() => null);
      if (s?.export_token) feedUrl = publicFeedUrl(s.export_token);
    }
    return { ok: true, feed_url: feedUrl, platforms: connectionGuide(feedUrl) };
  },
};

/* ══ ENTRYPOINT ══════════════════════════════════════════════════════ */

export default async function handler(req, res) {
  const q = query(req);
  const action = q.action || body(req).action || '';

  /* Order matters: the public feed and the cron must be reachable before
     anything looks for a user session. */
  if (action === 'feed' || action === 'ical') {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    return servePublicFeed(req, res, q.token || q.t);
  }

  if (action === 'cron') return runCron(req, res);

  setCors(req, res, 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  if (!consumeRateLimit(req, res, 'calendar-host', 120, 60_000, user.id)) return;

  const input = { ...q, ...body(req) };
  const run = ACTIONS[action];
  if (!run) {
    return res.status(400).json({
      error: 'unknown_action',
      actions: Object.keys(ACTIONS),
    });
  }

  /* A feed fetch is a network call to somebody else's server, and the
     ones that matter here are exactly the actions a host is watching a
     spinner for. Guard them separately and much more tightly. */
  if (action === 'feed.test' || action === 'feed.sync' || action === 'feed.add') {
    if (!consumeRateLimit(req, res, 'calendar-fetch', 20, 60_000, user.id)) return;
  }

  try {
    const out = await run(req, input);
    return res.status(200).json(out ?? { ok: true });
  } catch (e) {
    const status = e.status || 500;
    if (status >= 500) console.error(`[calendar ${action}]`, e.message);
    return res.status(status).json({
      error: status === 403 ? 'not_your_listing'
           : status >= 500 ? safeErrorMessage(e, 'Calendar request failed')
           : e.message,
    });
  }
}
