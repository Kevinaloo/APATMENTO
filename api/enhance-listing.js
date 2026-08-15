/* ════════════════════════════════════════════════════════════════
   APATMENTO, /api/enhance-listing.js
   AI-powered listing optimiser using Groq.
   Rewrites titles, descriptions, suggests pricing, generates 
   highlights. Host must explicitly approve before saving.
════════════════════════════════════════════════════════════════ */
export const config = { maxDuration: 20 };
const GROQ_KEY = process.env.GROQ_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }

  const { listing, mode = 'full' } = body; // mode: full | title | description | pricing

  if (!listing?.title) return res.status(400).json({ error: 'Listing required' });
  if (!GROQ_KEY) return res.status(503).json({ error: 'AI service unavailable' });

  const modes = {
    full: `Analyse and rewrite this Apatmento listing to maximise bookings.
Return JSON: { title, description, highlights: [], host_tips: [], seo_tags: [], pricing_advice, score_before: number, score_after: number }`,
    title: `Rewrite just the title of this listing. Make it compelling, specific, 8-10 words.
Return JSON: { title, reasoning }`,
    description: `Rewrite the description. 3 paragraphs: hook, features, CTA. 120-150 words.
Return JSON: { description, improvements: [] }`,
    pricing: `Analyse this listing's pricing relative to the Nairobi market.
Return JSON: { suggested_price_night, suggested_price_week, suggested_price_month, reasoning, competitive_position }`,
  };

  const prompt = `${modes[mode] || modes.full}

LISTING DATA:
Title: ${listing.title}
Type: ${listing.type || 'apartment'}
Location: ${listing.city || 'Nairobi'}, ${listing.area || ''}
Beds: ${listing.beds} | Baths: ${listing.baths} | Max guests: ${listing.max_guests}
Price/night: KES ${listing.price_night || 'not set'}
Description: ${(listing.description || '').slice(0, 600)}
Amenities: ${(listing.amenities || []).join(', ')}

Respond ONLY with valid JSON. No markdown, no explanation outside the JSON.`;

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.65,
        max_tokens: 700,
        response_format: { type: 'json_object' },
      }),
    });
    const data = await r.json();
    const raw = data.choices?.[0]?.message?.content || '{}';
    const enhanced = JSON.parse(raw.replace(/^```json|```$/g,'').trim());
    return res.status(200).json({ ok: true, enhanced, model: 'openai/gpt-oss-120b' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
