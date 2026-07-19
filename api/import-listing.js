/* ════════════════════════════════════════════════════════════════
   APATMENTO — /api/import-listing.js  v2
   
   WHY URL SCRAPING DOESN'T WORK:
   Booking.com and Airbnb use Cloudflare Bot Management + JS rendering.
   Any server-side fetch() gets a 403 or an empty JS shell — always.
   Even paid scraper services fail 20-40% of the time on these two.
   
   WHAT WORKS 100%:
   User pastes their listing text (copy from browser) or describes
   their property in plain language → Groq AI structures + enhances it
   into a ready-to-publish listing in under 3 seconds.
   
   This is also faster for the partner — no waiting for scrapes,
   no broken imports, no "try again" frustration.
════════════════════════════════════════════════════════════════ */
export const config = { maxDuration: 30 };

const GROQ_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama3-70b-8192', 'gemma2-9b-it'];

async function groq(messages, json = true) {
  if (!GROQ_KEY) throw new Error('GROQ_API_KEY not configured');
  let lastErr;
  for (const model of GROQ_MODELS) {
    try {
      const r = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.5,
          max_tokens: 1200,
          ...(json ? { response_format: { type: 'json_object' } } : {}),
        }),
      });
      if (!r.ok) { lastErr = `${model}: HTTP ${r.status}`; continue; }
      const d = await r.json();
      const text = d.choices?.[0]?.message?.content || '';
      return json ? JSON.parse(text) : text;
    } catch (e) { lastErr = e.message; }
  }
  throw new Error(lastErr || 'All Groq models failed');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }

  const { text, mode = 'paste' } = body;
  // mode: 'paste' = user pasted listing text | 'describe' = user typed freeform description

  if (!text || text.trim().length < 30) {
    return res.status(400).json({ error: 'Please provide at least a brief description of the property.' });
  }

  const SYSTEM = `You are an expert property listing assistant for Apatmento, Kenya's top short-stay platform.
Extract or infer structured listing data from the text provided.
Always respond with valid JSON matching the schema exactly. No markdown, no explanation.
For missing fields use null. Infer sensibly from context (e.g. "2-bed" → bedrooms: 2).
Prices should be in KES unless another currency is clear — convert roughly (1 USD ≈ 130 KES).
amenities must be an array of short strings matching common ones: WiFi, Pool, Parking, Kitchen, AC, Gym, Security, Balcony, Generator, DSTV, Netflix, Washing Machine, Dishwasher, Hot Water, Smart TV, Workspace, Coffee, BBQ Grill, Garden, Elevator, Pet Friendly, Wheelchair Accessible.`;

  const SCHEMA = `{
  "title": "compelling listing title (8-12 words, include location + best feature)",
  "property_type": "Apartment|House|Studio|Penthouse|Villa|Cottage|Serviced|Guesthouse|Lodge|Hostel",
  "city": "city name",
  "area": "neighbourhood or area",
  "country": "Kenya|Tanzania|Uganda|Rwanda (default Kenya)",
  "bedrooms": 1,
  "bathrooms": 1,
  "max_guests": 2,
  "sqm": null,
  "description": "3 vivid paragraphs: hook + features + call to action (130-170 words total)",
  "amenities": ["WiFi", "Kitchen"],
  "price_night": 4500,
  "price_week": null,
  "price_month": null,
  "checkin_time": "14:00",
  "checkout_time": "11:00",
  "min_nights": 1,
  "highlights": ["top selling point 1", "top selling point 2", "top selling point 3"],
  "seo_tags": ["nairobi apartment", "short stay nairobi", "studio westlands"]
}`;

  const userPrompt = mode === 'paste'
    ? `The partner pasted this text from their existing listing on another platform:\n\n${text.slice(0, 4000)}\n\nExtract and enhance all available data into this JSON schema:\n${SCHEMA}`
    : `The partner described their property in their own words:\n\n${text.slice(0, 2000)}\n\nBuild a complete, professional listing from this description using this JSON schema:\n${SCHEMA}`;

  try {
    const result = await groq([
      { role: 'system', content: SYSTEM },
      { role: 'user',   content: userPrompt },
    ]);

    // Sanitise / enforce types
    result.price_night  = result.price_night  ? Math.round(result.price_night)  : null;
    result.price_week   = result.price_week   ? Math.round(result.price_week)   : null;
    result.price_month  = result.price_month  ? Math.round(result.price_month)  : null;
    result.bedrooms     = result.bedrooms     ? parseInt(result.bedrooms)        : 1;
    result.bathrooms    = result.bathrooms    ? parseInt(result.bathrooms)       : 1;
    result.max_guests   = result.max_guests   ? parseInt(result.max_guests)      : 2;
    result.min_nights   = result.min_nights   ? parseInt(result.min_nights)      : 1;
    result.amenities    = Array.isArray(result.amenities) ? result.amenities.slice(0, 20) : [];
    result.highlights   = Array.isArray(result.highlights) ? result.highlights.slice(0, 5) : [];

    return res.status(200).json({ ok: true, data: result });
  } catch (e) {
    return res.status(500).json({ error: `AI import failed: ${e.message}` });
  }
}
