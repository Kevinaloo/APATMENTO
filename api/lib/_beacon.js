/* ══════════════════════════════════════════════════════════════════════
   CABANA · BEACON
   api/lib/_beacon.js

   The live half of Cabana's search presence.

   The static half (country guides, city pages, the travel answers) is
   built by seo/ and committed. It is excellent at what does not move and
   useless at what does: a host publishing in Kitengela on a Tuesday
   should not wait for anyone to run a build before a search engine can
   find them. So everything that moves is served from here, from the live
   catalogue, at the moment it is asked for:

     /stay/<slug>-<key>  /tour/…  /event/…  /car/…  /eat/…  /room/…  /shop/…
                                       one page per live thing
     /<place>-apartments  -safaris  -car-hire  -events  -restaurants  -rooms
                                       a hub for any place with live supply
                                       and no hand-built page (the static
                                       page wins whenever one exists)
     /sitemap-live.xml                 every live URL, with its real
                                       last-modified date and its photos
     /llms-live.txt                    the live catalogue for AI assistants
     /badge/<family>/<key>.svg         a "Book me on Cabana" badge hosts put
                                       on their own sites: a backlink per host

   And when anything changes, the database's change feed calls the pulse
   below within a minute, which tells Bing, Yandex, Seznam, Naver and Yep
   (and through Bing, ChatGPT search) exactly which URLs moved.
   ══════════════════════════════════════════════════════════════════════ */
import { select, insert, rpc } from './_db.js';
import { isCronAuthorized, hasInternalSecret } from './_security.js';
import {
  SITE, FAMILY, FAMILY_KIND, KIND_SERVICE, createCatalogue, normalise, parsePath, keyOf, inPlace, placeSupply, priceUsd,
} from './_catalogue.js';
import { hubFor, parseHub, placeById, HUB_SUFFIX } from './_places.js';
import { hubAnchor, vocabulary } from './_search-terms.js';
import {
  renderEntity, renderHub, renderGone, renderMissing, renderSitemap, hubIndexable, SERVICE, money, esc, seoTitle, metaDescription,
} from './_seo-render.js';

/* The one RPC seam. Tests swap it for a fake database; production uses
   the service-role client in _db.js. */
let callRpc = (fn, args) => rpc(fn, args);
export const catalogue = createCatalogue({ rpc: (fn, args) => callRpc(fn, args) });

const HTML = 'text/html; charset=utf-8';
/* Five minutes at the edge, a day of stale-while-revalidate: a crawler
   gets a cached page in milliseconds, and a change is visible within
   minutes without anyone purging anything. */
const CACHE_PAGE = 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400';
const CACHE_SHORT = 'public, max-age=0, s-maxage=60, stale-while-revalidate=600';

const INDEXNOW_KEY = () => String(process.env.INDEXNOW_KEY || 'cabana2026apatmentoindexnow8f4e9b').trim();

function send(res, status, type, body, cache = CACHE_SHORT, extra = {}) {
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', cache);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  for (const [k, v] of Object.entries(extra)) res.setHeader(k, v);
  return res.status(status).send(body);
}

function q(req) {
  if (req.query && Object.keys(req.query).length) return req.query;
  try { return Object.fromEntries(new URL(req.url || '/', 'http://x').searchParams); } catch { return {}; }
}

/* ── Linking: what is near, what is related ───────────────────────── */

/* Every hub that exists for a place and service: static when the atlas
   built one, live when there is supply to fill it. */
function liveHub(place, service, items) {
  const hub = hubFor(place, service);
  if (!hub) return null;
  if (hub.staticPage) return hub;
  const n = items.filter(i => i.service === service && inPlace(i, place.id)).length;
  return n ? hub : null;
}

function nearbyHubs(item, items) {
  const out = [];
  const seen = new Set();
  const add = (path, label) => { if (path && !seen.has(path) && path !== item.path) { seen.add(path); out.push({ path, label }); } };
  const svc = SERVICE[item.service] || SERVICE.stays;
  for (const lvl of [item.place?.area, item.place?.city]) {
    if (!lvl) continue;
    const h = liveHub(lvl, item.service, items);
    if (h) add(h.path, hubAnchor(item.service, lvl));
  }
  const city = item.place?.city;
  if (city) {
    for (const s of Object.keys(HUB_SUFFIX)) {
      if (s === item.service) continue;
      const h = liveHub(city, s, items);
      if (h && !h.staticPage) add(h.path, hubAnchor(s, city));
    }
    if (city.pages?.guide) add(city.pages.guide, `${city.name} travel guide`);
  }
  const country = item.place?.country;
  if (country?.pages?.travel) add(country.pages.travel, `Travelling in ${country.name}`);
  add(svc.hub, `All ${svc.noun.toLowerCase()} on Cabana`);
  return out.slice(0, 8);
}

function related(item, items, n = 6) {
  const same = items.filter(i => i !== item && i.service === item.service);
  const rank = i => (inPlace(i, item.place?.area?.id) ? 3 : 0) + (inPlace(i, item.place?.city?.id) ? 2 : 0) +
                    (inPlace(i, item.place?.country?.id) ? 1 : 0) + i.quality.score / 100;
  return same.sort((a, b) => rank(b) - rank(a)).slice(0, n);
}

/* ── Pages ─────────────────────────────────────────────────────────── */

export async function entityPage(req, res) {
  const p = q(req);
  const family = String(p.family || '').toLowerCase();
  const slug = String(p.slug || '').toLowerCase();
  const parsed = parsePath(`/${family}/${slug}`);
  if (!parsed) return send(res, 404, HTML, renderMissing(FAMILY_KIND[family] || 'stay'), CACHE_SHORT);

  const cat = await catalogue.get();
  let item = cat.byKey.get(parsed.kind + ':' + parsed.key);

  let detail;
  try {
    detail = await callRpc('beacon_entity', { p_kind: parsed.kind, p_key: parsed.key });
  } catch (e) {
    /* The detail call failed but the catalogue knows the thing is live:
       render from the catalogue alone rather than fail a crawler. */
    if (!item) return send(res, 503, HTML, renderMissing(parsed.kind), 'no-store', { 'Retry-After': '120' });
    detail = { state: 'live' };
  }
  const state = detail?.state || (item ? 'live' : 'absent');

  if (state === 'live' && !item && detail?.id) {
    /* Live in the database but newer than the cached catalogue (a host
       published seconds ago). Build it from the detail row. */
    item = normalise({ ...detail, photo_count: (detail.photos || []).length, desc_len: (detail.description || '').length });
  }

  if (state !== 'live' || !item) {
    if (state === 'gone' && detail?.title) {
      const ghost = normalise({ ...detail, kind: parsed.kind });
      const hubs = ghost ? nearbyHubs(ghost, cat.items) : [];
      const rel = ghost ? related(ghost, cat.items, 6) : [];
      /* 410, not 404: "this existed and is gone on purpose" makes search
         engines drop it in days rather than weeks. */
      return send(res, 410, HTML, renderGone({ detail, kind: parsed.kind, hubs, related: rel }), CACHE_SHORT, { 'X-Robots-Tag': 'noindex' });
    }
    return send(res, 404, HTML, renderMissing(parsed.kind), CACHE_SHORT, { 'X-Robots-Tag': 'noindex' });
  }

  /* One URL per thing. A renamed listing's old address, or a mangled
     slug, is moved to the real one permanently. */
  if (`/${family}/${slug}` !== item.path) {
    res.setHeader('Location', item.path);
    res.setHeader('Cache-Control', CACHE_PAGE);
    return res.status(301).send('');
  }

  const html = renderEntity(item, detail, { related: related(item, cat.items), nearbyHubs: nearbyHubs(item, cat.items) });
  return send(res, 200, HTML, html, CACHE_PAGE, { 'Last-Modified': new Date(item.updated_at || Date.now()).toUTCString() });
}

/* Hubs this engine serves (places with no hand-built page). Siblings are
   the other live places under the same parent, so a new neighbourhood is
   linked from its neighbours the moment it has supply. */
export function hubModel(path, items) {
  const h = parseHub(path);
  if (!h) return null;
  const place = placeById(h.placeId) || items.map(i => [i.place?.area, i.place?.city]).flat().find(p => p && p.id === h.placeId);
  if (!place) return null;
  const list = items.filter(i => i.service === h.service && inPlace(i, place.id))
    .sort((a, b) => (b.quality.score + (b.featured ? 20 : 0)) - (a.quality.score + (a.featured ? 20 : 0)));
  const parent = place.parent ? placeById(place.parent) || null : null;
  const siblings = [];
  if (parent) {
    const seen = new Set([place.id]);
    for (const it of items) {
      if (it.service !== h.service) continue;
      const a = it.place?.area;
      if (!a || seen.has(a.id) || (a.parent || '') !== parent.id) continue;
      seen.add(a.id);
      const hub = hubFor(a, h.service);
      if (hub) siblings.push({ path: hub.path, label: hubAnchor(h.service, a) });
    }
    const up = hubFor(parent, h.service);
    if (up) siblings.unshift({ path: up.path, label: `All of ${parent.name}` });
  }
  const parentHub = parent ? (() => { const up = hubFor(parent, h.service); return up ? { name: parent.name, path: up.path } : null; })() : null;
  return { place, service: h.service, items: list, siblings: siblings.slice(0, 12), parentHub, canonicalPath: `/${place.id}-${h.suffix}` };
}

export async function hubPage(req, res) {
  const p = q(req);
  const path = '/' + String(p.hub || '').toLowerCase().replace(/^\/+/, '');
  const cat = await catalogue.get();
  const model = hubModel(path, cat.items);
  if (!model || !model.items.length) {
    const svc = parseHub(path)?.service;
    const kind = Object.entries(KIND_SERVICE).find(([, s]) => s === svc)?.[0] || 'stay';
    return send(res, 404, HTML, renderMissing(kind), CACHE_SHORT, { 'X-Robots-Tag': 'noindex' });
  }
  if (path !== model.canonicalPath) {
    res.setHeader('Location', model.canonicalPath);
    return res.status(301).send('');
  }
  return send(res, 200, HTML, renderHub(model), CACHE_PAGE);
}

/* ── Sitemaps ──────────────────────────────────────────────────────── */

export function sitemapEntries(items) {
  const entries = [];
  for (const it of items) {
    if (!it.quality.indexable) continue;
    entries.push({
      loc: it.url,
      lastmod: (it.updated_at ? new Date(it.updated_at) : new Date()).toISOString().slice(0, 10),
      images: it.photos.slice(0, 6).map(u => ({ loc: u, title: it.title })),
    });
  }
  /* Live hubs: places with supply and no hand-built page. */
  const hubs = new Map();
  for (const it of items) {
    for (const lvl of [it.place?.area, it.place?.city]) {
      if (!lvl) continue;
      const h = hubFor(lvl, it.service);
      if (!h || h.staticPage) continue;
      const k = h.path;
      const cur = hubs.get(k) || { path: k, items: [], last: 0 };
      cur.items.push(it);
      cur.last = Math.max(cur.last, new Date(it.updated_at || 0).getTime());
      hubs.set(k, cur);
    }
  }
  for (const h of hubs.values()) {
    if (!hubIndexable(h.items)) continue;
    entries.push({ loc: SITE + h.path, lastmod: new Date(h.last || Date.now()).toISOString().slice(0, 10) });
  }
  return entries;
}

export async function sitemapLive(req, res) {
  const cat = await catalogue.get();
  return send(res, 200, 'application/xml; charset=utf-8', renderSitemap(sitemapEntries(cat.items)), 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400');
}

/* For ChatGPT, Claude, Perplexity and the rest: what is bookable, where,
   for how much, as plain markdown with links. Assistants cite sources
   that state facts plainly; this is the plainest statement there is. */
export function llmsText(items, at = new Date()) {
  const by = new Map();
  for (const it of items) {
    if (!it.quality.indexable) continue;
    const city = it.place?.city?.name || it.place?.country?.name || 'Elsewhere';
    const k = `${SERVICE[it.service]?.noun || it.service} · ${city}`;
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(it);
  }
  const lines = [
    '# Cabana — live catalogue',
    '',
    `> Everything bookable on Cabana (cabana.africa) right now, generated from the live database at ${at.toISOString()}.`,
    '> Prices are all-in guest prices. Hosts and operators keep 100% of their price; Cabana charges them no commission.',
    '> Brand facts: https://cabana.africa/llms.txt',
    '',
  ];
  for (const [k, list] of [...by.entries()].sort()) {
    lines.push(`## ${k}`, '');
    for (const it of list.slice(0, 200)) {
      const bits = [it.type, it.location, it.price > 0 ? `${money(it.price, it.currency)} per ${it.unit}` : '',
                    it.guests ? `up to ${it.guests} guests` : '', it.amenities.slice(0, 4).join(', ')].filter(Boolean);
      lines.push(`- [${it.title}](${it.url}) — ${bits.join(' · ')}`);
    }
    lines.push('');
  }
  if (by.size === 0) lines.push('Nothing is live this minute. See https://cabana.africa/destinations for the places Cabana covers.');
  return lines.join('\n') + '\n';
}

export async function llmsLive(req, res) {
  const cat = await catalogue.get();
  return send(res, 200, 'text/plain; charset=utf-8', llmsText(cat.items), 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400');
}

/* ── Host badge: one backlink per host ─────────────────────────────── */

export function badgeSvg(item) {
  const title = (item?.title || 'Book on Cabana').slice(0, 34);
  const price = item?.price > 0 ? `${money(item.price, item.currency)} / ${item.unit}` : 'Zero commission';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="64" viewBox="0 0 240 64" role="img" aria-label="Book ${esc(title)} on Cabana">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6D28FF"/><stop offset="1" stop-color="#4F6DFF"/></linearGradient></defs>
<rect width="240" height="64" rx="14" fill="url(#g)"/><text x="16" y="24" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="11" font-weight="600" fill="#E9E4FF" letter-spacing=".8">BOOK DIRECT ON CABANA</text>
<text x="16" y="42" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="14" font-weight="700" fill="#fff">${esc(title)}</text>
<text x="16" y="56" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="10.5" fill="#D9D3FF">${esc(price)}</text></svg>`;
}

export async function badge(req, res) {
  const p = q(req);
  const kind = FAMILY_KIND[String(p.family || '')];
  const key = String(p.key || '').toLowerCase();
  const cat = await catalogue.get();
  const item = kind && /^[0-9a-f]{8}$|^\d{1,15}$/.test(key) ? cat.byKey.get(kind + ':' + key) : null;
  return send(res, 200, 'image/svg+xml; charset=utf-8', badgeSvg(item), 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');
}

export function badgeSnippet(item) {
  return `<a href="${item.url}?utm_source=host_badge" title="Book ${esc(item.title)} on Cabana"><img src="${SITE}/badge/${FAMILY[item.kind]}/${item.key}.svg" alt="Book ${esc(item.title)} on Cabana" width="240" height="64"></a>`;
}

/* ── The pulse: tell search engines what moved ─────────────────────── */

export async function submitIndexNow(urls, { fetchImpl = fetch, reason = 'change' } = {}) {
  const list = [...new Set(urls)].filter(u => u.startsWith(SITE + '/')).slice(0, 10000);
  if (!list.length) return { ok: true, status: 0, urls: 0 };
  const key = INDEXNOW_KEY();
  let status = 0, note = null;
  try {
    const r = await fetchImpl('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: 'cabana.africa', key, keyLocation: `${SITE}/${key}.txt`, urlList: list }),
      signal: AbortSignal.timeout(15000),
    });
    status = r.status;
    if (!r.ok) note = (await r.text().catch(() => '')).slice(0, 300);
  } catch (e) { note = String(e.message || e).slice(0, 300); }
  const ok = status === 200 || status === 202;
  await insert('beacon_pings', { engine: 'indexnow', reason, urls: list.length, status, ok, sample: list.slice(0, 12), note }, false).catch(() => {});
  return { ok, status, urls: list.length, note };
}

/* The URLs one change moves: its own page, its old page if it was renamed
   or moved, and the live hubs it appears on. Static hubs are announced by
   the hourly static rebuild that regenerates them. */
export function urlsForChange(change, items) {
  const out = new Set();
  const key = keyOf(change.entity_id);
  const live = items.find(i => i.kind === change.kind && i.key === key);
  const shapeOf = fields => normalise({ kind: change.kind, id: change.entity_id, ...(fields || {}), title: fields?.title || 'listing' });
  const here = live || shapeOf(change.snapshot);
  if (here) {
    out.add(here.url);
    for (const lvl of [here.place?.area, here.place?.city]) {
      const h = lvl && hubFor(lvl, here.service);
      if (h && !h.staticPage) out.add(SITE + h.path);
    }
  }
  if (change.previous?.title || change.previous?.city || change.previous?.area) {
    const old = shapeOf({ ...change.snapshot, ...change.previous });
    if (old && old.url !== here?.url) out.add(old.url);
  }
  return [...out];
}

/* Static hub pages are gated on supply at build time. When a place goes
   from nothing to something (or back), the static layer is stale until it
   is rebuilt: ask GitHub to rebuild it now rather than at the next hourly
   run. Optional: needs GITHUB_DISPATCH_TOKEN. */
export function staticFlips(before, after) {
  const was = new Map((before || []).map(r => [r.place + '|' + r.service, Number(r.count) || 0]));
  const flips = [];
  for (const r of after) {
    const place = placeById(r.place);
    if (!place?.atlas || !hubFor(place, r.service)?.staticPage) continue;
    const prev = was.get(r.place + '|' + r.service) || 0;
    if ((prev === 0) !== (r.count === 0)) flips.push({ place: r.place, service: r.service, from: prev, to: r.count });
    was.delete(r.place + '|' + r.service);
  }
  for (const [k, prev] of was) {
    const [placeId, service] = k.split('|');
    const place = placeById(placeId);
    if (prev > 0 && place?.atlas && hubFor(place, service)?.staticPage) flips.push({ place: placeId, service, from: prev, to: 0 });
  }
  return flips;
}

async function dispatchRebuild(flips, fetchImpl = fetch) {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token || !flips.length) return { dispatched: false };
  const repo = process.env.GITHUB_REPOSITORY || 'Kevinaloo/APATMENTO';
  try {
    const r = await fetchImpl(`https://api.github.com/repos/${repo}/dispatches`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'cabana-beacon' },
      body: JSON.stringify({ event_type: 'beacon-supply-changed', client_payload: { flips: flips.slice(0, 40) } }),
      signal: AbortSignal.timeout(8000),
    });
    return { dispatched: r.status === 204, status: r.status };
  } catch (e) { return { dispatched: false, error: e.message }; }
}

export async function pulse(req, res) {
  if (!isCronAuthorized(req) && !hasInternalSecret(req)) return res.status(401).json({ error: 'unauthorized' });
  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const force = body.force === true || q(req).force === '1';

  const claimed = await callRpc('beacon_claim', { p_limit: 300 }).catch(e => { console.warn('[beacon:claim]', e.message); return []; }) || [];
  if (!claimed.length && !force) return res.status(200).json({ ok: true, claimed: 0, note: 'nothing to announce' });

  const cat = await catalogue.get({ force: true });
  const urls = new Set();
  for (const c of claimed) for (const u of urlsForChange(c, cat.items)) urls.add(u);
  const ping = urls.size ? await submitIndexNow([...urls], { reason: force ? 'refresh' : 'change' }) : { ok: true, urls: 0 };

  let places = 0, flips = [], dispatch = { dispatched: false };
  try {
    const before = await select('beacon_places', 'select=place,service,count&limit=5000').catch(() => []);
    const rows = placeSupply(cat.items).map(({ synthetic, ...r }) => r);
    places = await callRpc('beacon_places_replace', { p_rows: rows });
    flips = staticFlips(before, rows);
    dispatch = await dispatchRebuild(flips);
  } catch (e) { console.warn('[beacon:places]', e.message); }

  if (claimed.length) {
    await callRpc('beacon_complete', {
      p_ids: claimed.map(c => c.id),
      p_result: { urls: urls.size, indexnow: ping.status || null, ok: ping.ok, flips: flips.length },
    }).catch(e => console.warn('[beacon:complete]', e.message));
  }
  return res.status(200).json({ ok: true, claimed: claimed.length, urls: urls.size, indexnow: ping, places, flips, dispatch, catalogue: cat.items.length });
}

/* Manual "ping everything now" from the console: every live URL. */
export async function pingAll(req, res, user) {
  const cat = await catalogue.get({ force: true });
  const urls = sitemapEntries(cat.items).map(e => e.loc);
  const out = await submitIndexNow(urls, { reason: `manual:${user?.email || 'operator'}` });
  return res.status(200).json({ ok: out.ok, ...out });
}

/* Snippets and previews for the console: how each live thing reads in a
   search result, its badge, its issues. */
export async function consoleReport(req, res) {
  const cat = await catalogue.get();
  return res.status(200).json({
    ok: true,
    version: cat.version, pricing: cat.pricing, at: new Date(cat.fetchedAt || Date.now()).toISOString(),
    items: cat.items.map(it => ({
      kind: it.kind, id: it.id, key: it.key, title: it.title, path: it.path, url: it.url, location: it.location,
      price: it.price, currency: it.currency, unit: it.unit, price_usd: priceUsd(it),
      quality: it.quality, updated_at: it.updated_at, photo: it.photos[0] || null,
      serp: { title: seoTitle(it), description: metaDescription(it) },
      badge: badgeSnippet(it),
    })),
    sitemap: sitemapEntries(cat.items).length,
    vocabulary: vocabulary(),
  });
}

export const __test = {
  nearbyHubs, related, liveHub,
  setRpc(fn) { callRpc = fn; catalogue.reset(); },
};
