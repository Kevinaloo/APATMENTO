/* ════════════════════════════════════════════════════════════════════
   CABANA · GROWTH   /api/growth.js
   ────────────────────────────────────────────────────────────────────
   Beacon (live search visibility) and Compass (who people are and what
   to show them), in one deliberately small function.

   WHY THIS IS ITS OWN FUNCTION
   ────────────────────────────
   It is the twelfth and last function Vercel's Hobby plan allows, and it
   earns it. Every visitor's browser calls Compass a few times a session,
   and every crawler that follows a listing link lands here. Folded into
   /api/utilities, that traffic would share a cold start (≈380 ms of
   imports: payments, karaoke, scraping) and a concurrency pool with the
   SOS button. Here it imports four small modules and nothing else.
   Anything new after this must be folded into an existing function as an
   ?action, the way /api/utilities does it.

   Routes (all reached through vercel.json rewrites):
     GET  /stay/<slug>-<key> … /car/…        op=page
     GET  /<place>-apartments …              op=hub
     GET  /sitemap-live.xml                  op=sitemap
     GET  /llms-live.txt                     op=llms
     GET  /badge/<family>/<key>.svg          op=badge
     POST /api/growth?op=pulse               cron secret: announce changes
     POST /api/growth?op=ping-all            operator: announce everything
     GET  /api/growth?op=report              operator: SEO report per page
     POST /api/growth?op=compass             browser: behaviour events
     GET  /api/growth?op=foryou              browser: personalised picks
     GET  /api/growth?op=profile             browser: what Cabana inferred
     POST /api/growth?op=forget              browser: erase it
     GET  /api/growth?op=segments            what each audience means
   ════════════════════════════════════════════════════════════════════ */
import { catalogue, entityPage, hubPage, sitemapLive, llmsLive, badge, pulse, pingAll, consoleReport } from './lib/_beacon.js';
import { ingest, forYou, ownProfile, forget, SEGMENTS } from './lib/_compass.js';
import { requireAdmin } from './lib/_security.js';

export const config = { maxDuration: 30 };

function op(req) {
  const fromQuery = req.query?.op;
  if (fromQuery) return String(fromQuery);
  try { return new URL(req.url || '/', 'http://x').searchParams.get('op') || ''; } catch { return ''; }
}

export default async function handler(req, res) {
  const name = op(req);
  try {
    switch (name) {
      case 'page': return await entityPage(req, res);
      case 'hub': return await hubPage(req, res);
      case 'sitemap': return await sitemapLive(req, res);
      case 'llms': return await llmsLive(req, res);
      case 'badge': return await badge(req, res);
      case 'pulse': return await pulse(req, res);
      case 'compass': return await ingest(req, res, { catalogue });
      case 'foryou': return await forYou(req, res, { catalogue });
      case 'profile': return await ownProfile(req, res);
      case 'forget': return await forget(req, res);
      case 'segments':
        /* What each audience means. Public: definitions, not members. */
        res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
        return res.status(200).json({ segments: SEGMENTS.map(({ test, ...meta }) => meta) });
      case 'ping-all': {
        const user = await requireAdmin(req, res);
        if (!user) return;
        return await pingAll(req, res, user);
      }
      case 'report': {
        const user = await requireAdmin(req, res);
        if (!user) return;
        return await consoleReport(req, res);
      }
      default:
        return res.status(404).json({ error: 'unknown_op' });
    }
  } catch (e) {
    console.error('[growth]', name, e);
    if (res.headersSent) return;
    /* A page request that fails must not be cached as a page. */
    res.setHeader('Cache-Control', 'no-store');
    if (['page', 'hub'].includes(name)) {
      res.setHeader('Retry-After', '60');
      return res.status(503).send('<!doctype html><title>Cabana</title><meta name="robots" content="noindex"><p>Back in a moment.</p>');
    }
    return res.status(500).json({ error: 'growth_failed' });
  }
}
