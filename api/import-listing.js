/* ════════════════════════════════════════════════════════════════
   APATMENTO — /api/import-listing.js
   Import property from Booking.com/Airbnb by URL.
   Extracts: title, description, photos, location, amenities, 
   pricing, rules, type. Then uses Groq AI to enhance the listing.
════════════════════════════════════════════════════════════════ */
export const config = { maxDuration: 45 };

const GROQ_KEY = process.env.GROQ_API_KEY;

// Extract JSON-LD structured data from any listing page
function extractStructuredData(html) {
  const schemas = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try { schemas.push(JSON.parse(m[1].trim())); } catch {}
  }
  return schemas;
}

// Extract Booking.com specific data patterns
function parseBookingCom(html, url) {
  const result = { source: 'booking.com', source_url: url, raw_html_length: html.length };

  // Title
  const titleM = html.match(/<h2[^>]*class="[^"]*hp__hotel-name[^"]*"[^>]*>([\s\S]*?)<\/h2>/i)
               || html.match(/<title>([^|<]+)/i);
  if (titleM) result.title = titleM[1].replace(/<[^>]+>/g,'').trim();

  // Location
  const locM = html.match(/class="[^"]*hp_address[^"]*"[^>]*><[^>]+>([^<]+)/i)
             || html.match(/"addressLocality":"([^"]+)"/i);
  if (locM) result.location = locM[1].trim();

  // Photos — Booking.com photo CDN patterns
  const photoRe = /https:\/\/cf\.bstatic\.com\/xdata\/images\/hotel\/max\d+\/[a-z0-9]+\.jpg/gi;
  result.photos = [...new Set((html.match(photoRe) || []).slice(0, 20))];

  // Description
  const descM = html.match(/class="[^"]*hp_desc_main_content[^"]*"[^>]*>([\s\S]*?)<\/p>/i)
              || html.match(/"description":"([^"]{50,1000})"/i);
  if (descM) result.description = descM[1].replace(/<[^>]+>/g,'').trim().slice(0, 1500);

  // Price
  const priceM = html.match(/data-et-price="(\d+)"/i)
               || html.match(/"price"[^:]*:\s*"?(\d+)"?/i);
  if (priceM) result.price_hint = parseInt(priceM[1]);

  // Amenities from structured data
  const schemas = extractStructuredData(html);
  for (const s of schemas) {
    if (s['@type'] === 'LodgingBusiness' || s['@type'] === 'Hotel') {
      if (s.name && !result.title) result.title = s.name;
      if (s.description && !result.description) result.description = s.description;
      if (s.address) result.location = [s.address.streetAddress, s.address.addressLocality].filter(Boolean).join(', ');
      if (s.geo) { result.latitude = s.geo.latitude; result.longitude = s.geo.longitude; }
      if (s.amenityFeature) result.amenities = s.amenityFeature.map(a => a.name).filter(Boolean).slice(0, 20);
    }
  }

  return result;
}

// Parse Airbnb
function parseAirbnb(html, url) {
  const result = { source: 'airbnb', source_url: url };
  const schemas = extractStructuredData(html);
  
  for (const s of schemas) {
    if (s['@type'] === 'Product' || s['@type'] === 'Accommodation') {
      result.title       = s.name;
      result.description = s.description;
      if (s.image) result.photos = Array.isArray(s.image) ? s.image.slice(0, 20) : [s.image];
      if (s.address) result.location = s.address.addressLocality || s.address.streetAddress;
    }
  }

  // Airbnb bootstrap data
  const bootstrapM = html.match(/"sectionData":\{"[\s\S]*?"title":"([^"]+)"/);
  if (bootstrapM && !result.title) result.title = bootstrapM[1];

  return result;
}

// Use Groq to enhance the imported listing
async function enhanceListing(rawData) {
  if (!GROQ_KEY) return rawData;

  const prompt = `You are a world-class Airbnb copywriter specialising in Kenya properties.
Enhance this imported listing to be irresistible to Nairobi travellers.

ORIGINAL DATA:
Title: ${rawData.title || 'Unknown'}
Location: ${rawData.location || 'Kenya'}
Description: ${(rawData.description || '').slice(0, 500)}
Amenities: ${(rawData.amenities || []).join(', ')}

OUTPUT (JSON only, no markdown):
{
  "title": "compelling 8-10 word title with location and best feature",
  "description": "3-paragraph description: opening hook, detailed features, call to action (total 120-160 words)",
  "highlights": ["top feature 1", "top feature 2", "top feature 3"],
  "seo_tags": ["nairobi apartment", "short stay nairobi", ...3 more relevant tags],
  "suggested_price_note": "brief note on pricing competitiveness"
}`;

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 600,
        response_format: { type: 'json_object' },
      }),
    });
    const data = await r.json();
    const enhanced = JSON.parse(data.choices?.[0]?.message?.content || '{}');
    return { ...rawData, ai_enhanced: enhanced };
  } catch (e) {
    return rawData;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }

  const { url, enhance = true } = body;

  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: 'Valid URL required' });
  }

  // Only allow known property listing platforms
  const allowed = ['booking.com', 'airbnb.com', 'vrbo.com', 'tripadvisor.com', 'expedia.com', 'agoda.com'];
  const isAllowed = allowed.some(d => url.includes(d));
  if (!isAllowed) {
    return res.status(400).json({ error: 'Only Booking.com, Airbnb, VRBO, and similar platforms are supported' });
  }

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 25000);
    const fetchRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: ctrl.signal,
    });
    clearTimeout(t);

    if (!fetchRes.ok) throw new Error(`HTTP ${fetchRes.status}`);
    const html = await fetchRes.text();

    let extracted;
    if (url.includes('booking.com'))      extracted = parseBookingCom(html, url);
    else if (url.includes('airbnb.com'))  extracted = parseAirbnb(html, url);
    else {
      // Generic JSON-LD extraction
      const schemas = extractStructuredData(html);
      extracted = { source: 'generic', source_url: url, schemas: schemas.slice(0, 3) };
    }

    if (enhance && GROQ_KEY) {
      extracted = await enhanceListing(extracted);
    }

    return res.status(200).json({ ok: true, data: extracted });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
