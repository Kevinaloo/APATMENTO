/* ════════════════════════════════════════════════════════════════
   CABANA, /api/enhance-listing.js
   AI-powered listing optimiser using unified Gemini + Groq AI Gateway.
   Rewrites titles, descriptions, suggests pricing, generates 
   highlights. Host must explicitly approve before saving.
════════════════════════════════════════════════════════════════ */
import { generateStructuredJson } from './lib/_ai-gateway.js';
import { consumeRateLimit, requireUser, safeErrorMessage, setCors } from './lib/_security.js';

export const config = { maxDuration: 25 };

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const user = await requireUser(req, res);
  if (!user) return;
  if (!consumeRateLimit(req, res, 'enhance-listing', 8, 60_000, user.id)) return;

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }

  const { listing, mode = 'full' } = body; // mode: full | title | description | pricing

  if (!listing?.title) return res.status(400).json({ error: 'Listing required' });

  const modes = {
    full: `Analyse and rewrite this Cabana listing to maximise bookings.
Return JSON: { "title": string, "description": string, "highlights": string[], "host_tips": string[], "seo_tags": string[], "pricing_advice": string, "score_before": number, "score_after": number }`,
    title: `Rewrite just the title of this listing. Make it compelling, specific, 8-10 words.
Return JSON: { "title": string, "reasoning": string }`,
    description: `Write or improve the description in 2-3 short paragraphs, 90-130 words and no more than 900 characters. Use only supplied facts. Do not invent views, distances, amenities, prices, availability, awards or neighbourhood claims. Use warm, natural language and avoid generic hype.
Return JSON: { "description": string, "improvements": string[] }`,
    pricing: `Analyse this listing's pricing relative to the East African market.
Return JSON: { "suggested_price_night": number, "suggested_price_week": number, "suggested_price_month": number, "reasoning": string, "competitive_position": string }`,
  };

  const systemPrompt = `You are APA, Cabana's careful listing editor. Write clear, appealing copy without inventing facts. Return ONLY valid JSON matching the requested structure.`;
  const userPrompt = `${modes[mode] || modes.full}

LISTING DATA:
Title: ${listing.title}
Service: ${listing.service || 'stays'}
Type: ${listing.type || 'property'}
Location: ${[listing.area, listing.city, listing.country].filter(Boolean).join(', ') || 'not provided'}
Beds: ${listing.beds} | Baths: ${listing.baths} | Max guests: ${listing.max_guests}
Size: ${listing.sqm || 'not provided'} square metres
Description: ${(listing.description || '').slice(0, 600)}
Amenities: ${(listing.amenities || []).join(', ')}`;

  try {
    const enhanced = await generateStructuredJson(systemPrompt, userPrompt);
    return res.status(200).json({ ok: true, enhanced });
  } catch (e) {
    return res.status(500).json({ error: safeErrorMessage(e, 'APA could not write the description right now.') });
  }
}
