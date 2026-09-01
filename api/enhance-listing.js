/* ════════════════════════════════════════════════════════════════
   CABANA, /api/enhance-listing.js
   AI-powered listing optimiser using unified Gemini + Groq AI Gateway.
   Rewrites titles, descriptions, suggests pricing, generates 
   highlights. Host must explicitly approve before saving.
════════════════════════════════════════════════════════════════ */
import { generateStructuredJson } from './lib/_ai-gateway.js';

export const config = { maxDuration: 25 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

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
    description: `Rewrite the description. 3 paragraphs: hook, features, CTA. 120-150 words.
Return JSON: { "description": string, "improvements": string[] }`,
    pricing: `Analyse this listing's pricing relative to the East African market.
Return JSON: { "suggested_price_night": number, "suggested_price_week": number, "suggested_price_month": number, "reasoning": string, "competitive_position": string }`,
  };

  const systemPrompt = `You are an expert travel and hospitality copywriter for Cabana. Return ONLY valid JSON matching the requested structure.`;
  const userPrompt = `${modes[mode] || modes.full}

LISTING DATA:
Title: ${listing.title}
Type: ${listing.type || 'apartment'}
Location: ${listing.city || 'Nairobi'}, ${listing.area || ''}
Beds: ${listing.beds} | Baths: ${listing.baths} | Max guests: ${listing.max_guests}
Price/night: KES ${listing.price_night || 'not set'}
Description: ${(listing.description || '').slice(0, 600)}
Amenities: ${(listing.amenities || []).join(', ')}`;

  try {
    const enhanced = await generateStructuredJson(systemPrompt, userPrompt);
    return res.status(200).json({ ok: true, enhanced });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
