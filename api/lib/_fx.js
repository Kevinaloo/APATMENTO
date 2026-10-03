/* ══════════════════════════════════════════════════════════════════════
   Cabana · exchange rates   (GET /api/utilities?action=fx)
   ──────────────────────────────────────────────────────────────────────
   Every price on Cabana is set, quoted and paid in the listing's own
   currency, which today is almost always KES. A guest planning from
   Lagos, London or Johannesburg still wants to know what "KES 2,500 a
   night" means to them. This route answers that one question:

     how many units of each display currency is one KES worth, today?

   It never changes what anyone pays. The browser uses it to show an
   approximate conversion beside the real price ("≈ $19"), and says so.

   PROVIDERS
   ─────────
   open.er-api.com (ExchangeRate-API's open endpoint, daily, no key),
   then the Frankfurter/ECB feed as a second opinion for the majors.
   Answers are cached here for six hours and at the edge for the same,
   so a busy day costs the provider a handful of calls.

   If both are down the route says so with 503 and the browser keeps
   the last rates it saw, or its built-in reference table, and labels
   the conversion as approximate either way.
   ══════════════════════════════════════════════════════════════════════ */

import { upstreamRequest } from './_upstream.js';

/* The display currencies the stays page offers. KES is the base. */
export const FX_CODES = [
  'KES', 'USD', 'EUR', 'GBP', 'NGN', 'GHS', 'ZAR', 'TZS', 'UGX', 'RWF',
  'ETB', 'EGP', 'MAD', 'XOF', 'XAF', 'ZMW', 'BWP', 'MUR', 'AED', 'CAD',
  'AUD', 'CHF', 'CNY', 'INR', 'JPY', 'SAR',
];

const TTL_MS = 6 * 60 * 60 * 1000;      // fresh for six hours
const STALE_MS = 72 * 60 * 60 * 1000;   // usable, flagged, for three days
let cache = null;                        // { at, body }
let inflight = null;

function pick(rates) {
  const out = {};
  for (const code of FX_CODES) {
    const v = Number(rates?.[code]);
    if (Number.isFinite(v) && v > 0) out[code] = v;
  }
  out.KES = 1;
  return out;
}

/* KES-based table from open.er-api. */
async function fromErApi() {
  const data = await upstreamRequest('https://open.er-api.com/v6/latest/KES', {
    headers: { 'User-Agent': 'Cabana/1.0 (+https://cabana.africa)' },
  }, { readOnly: true, timeoutMs: 3500 });
  if (data?.result !== 'success' || !data.rates) throw new Error('fx_bad_payload');
  const rates = pick(data.rates);
  if (Object.keys(rates).length < 6) throw new Error('fx_thin_payload');
  return {
    base: 'KES', rates, source: 'open.er-api.com',
    updated: Number(data.time_last_update_unix) * 1000 || Date.now(),
  };
}

/* ECB reference rates through Frankfurter. KES is not an ECB currency,
   so this is only used to keep the majors honest when the first
   provider is down and we still hold an older KES/USD cross. */
async function fromFrankfurter(prev) {
  const usdKes = prev?.rates?.USD ? 1 / prev.rates.USD : null;
  if (!usdKes) throw new Error('fx_no_cross');
  const data = await upstreamRequest('https://api.frankfurter.app/latest?from=USD', {}, {
    readOnly: true, timeoutMs: 3500,
  });
  if (!data?.rates) throw new Error('fx_bad_payload');
  const rates = { ...prev.rates };
  for (const [code, perUsd] of Object.entries(data.rates)) {
    if (FX_CODES.includes(code) && Number(perUsd) > 0) rates[code] = Number(perUsd) / usdKes;
  }
  rates.USD = 1 / usdKes;
  return { base: 'KES', rates: pick(rates), source: 'frankfurter.app', updated: Date.now() };
}

async function load() {
  if (inflight) return inflight;
  inflight = (async () => {
    try { return await fromErApi(); }
    catch (first) {
      if (cache) return await fromFrankfurter(cache.body);
      throw first;
    }
  })().finally(() => { inflight = null; });
  return inflight;
}

export const __test = { reset: () => { cache = null; inflight = null; }, pick };

export default async function fxHandler(req, res) {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) {
    res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json({ ok: true, ...cache.body, stale: false });
  }
  try {
    const body = await load();
    cache = { at: now, body };
    res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json({ ok: true, ...body, stale: false });
  } catch (e) {
    if (cache && now - cache.at < STALE_MS) {
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.status(200).json({ ok: true, ...cache.body, stale: true });
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ ok: false, error: 'fx_temporarily_unavailable' });
  }
}
