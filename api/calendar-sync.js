/* ════════════════════════════════════════════════════════════════
   APATMENTO — /api/calendar-sync.js
   Bidirectional iCal calendar sync.
   Imports blocked dates from Airbnb/Booking.com/VRBO iCal feeds.
   Exports Apatmento bookings as iCal for external platforms.
   Prevents double bookings automatically.
════════════════════════════════════════════════════════════════ */
export const config = { maxDuration: 30 };

const SUPA_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Parse iCal VEVENT blocks
function parseICal(icalText) {
  const events = [];
  const blocks = icalText.split('BEGIN:VEVENT');
  for (let i = 1; i < blocks.length; i++) {
    const b = blocks[i];
    const dtstart = b.match(/DTSTART(?:;VALUE=DATE)?:(\d{8})/)?.[1];
    const dtend   = b.match(/DTEND(?:;VALUE=DATE)?:(\d{8})/)?.[1];
    const summary = b.match(/SUMMARY:(.+)/)?.[1]?.trim();
    const uid     = b.match(/UID:(.+)/)?.[1]?.trim();
    if (dtstart && dtend) {
      events.push({
        uid: uid || `${dtstart}-${dtend}`,
        start: `${dtstart.slice(0,4)}-${dtstart.slice(4,6)}-${dtstart.slice(6,8)}`,
        end: `${dtend.slice(0,4)}-${dtend.slice(4,6)}-${dtend.slice(6,8)}`,
        summary: summary || 'Blocked',
        source: 'external',
      });
    }
  }
  return events;
}

// Generate iCal for Apatmento bookings (for export to Airbnb etc.)
function generateICal(listingId, bookings) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Apatmento//Apatmento Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Apatmento - ${listingId}`,
    'X-WR-TIMEZONE:Africa/Nairobi',
  ];

  for (const b of bookings) {
    const checkin  = b.checkin_date?.replace(/-/g,'');
    const checkout = b.checkout_date?.replace(/-/g,'');
    if (!checkin || !checkout) continue;
    lines.push(
      'BEGIN:VEVENT',
      `DTSTART;VALUE=DATE:${checkin}`,
      `DTEND;VALUE=DATE:${checkout}`,
      `SUMMARY:Apatmento Booking - ${b.guest_code || 'Reserved'}`,
      `UID:apatmento-${b.id}@apatmento.space`,
      `DESCRIPTION:Booking ref: ${b.payment_reference || b.id}`,
      'STATUS:CONFIRMED',
      `CREATED:${new Date().toISOString().replace(/[-:]/g,'').split('.')[0]}Z`,
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

async function db(method, path, body) {
  const opts = {
    method,
    headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' }
  };
  if (method === 'POST') opts.headers.Prefer = 'resolution=merge-duplicates,return=minimal';
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, opts);
  if (!r.ok) throw new Error(`DB ${r.status}: ${await r.text().catch(()=>'')}`);
  return method === 'GET' ? r.json() : null;
}

export default async function handler(req, res) {
  const { action, listingId, calendarUrl, source } = 
    req.method === 'GET' 
      ? Object.fromEntries(new URL(req.url, 'http://x').searchParams)
      : (typeof req.body === 'string' ? JSON.parse(req.body) : req.body);

  // ── EXPORT: /api/calendar-sync?action=export&listingId=xxx ──
  if (action === 'export') {
    if (!listingId) return res.status(400).json({ error: 'listingId required' });
    try {
      const bookings = await db('GET', `apartment_bookings?listing_id=eq.${listingId}&status=eq.confirmed&select=id,checkin_date,checkout_date,guest_code,payment_reference`);
      const ical = generateICal(listingId, bookings || []);
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="apatmento-${listingId}.ics"`);
      return res.status(200).send(ical);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── IMPORT: sync external calendar feed ──
  if (action === 'import') {
    if (!listingId || !calendarUrl) return res.status(400).json({ error: 'listingId and calendarUrl required' });
    
    const allowed = ['airbnb.com', 'booking.com', 'vrbo.com', 'homeaway.com', 'expedia.com', 'google.com/calendar'];
    if (!allowed.some(d => calendarUrl.includes(d))) {
      return res.status(400).json({ error: 'Unsupported calendar source' });
    }

    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 20000);
      const r = await fetch(calendarUrl, { 
        signal: ctrl.signal,
        headers: { 'User-Agent': 'Apatmento Calendar Sync/1.0' }
      });
      if (!r.ok) throw new Error(`Calendar fetch failed: ${r.status}`);
      const icalText = await r.text();
      const events = parseICal(icalText);

      // Save blocked dates to Supabase
      const rows = events.map(e => ({
        listing_id: listingId,
        external_uid: e.uid,
        start_date: e.start,
        end_date: e.end,
        source: source || 'external',
        calendar_url: calendarUrl,
        synced_at: new Date().toISOString(),
      }));

      if (rows.length > 0) {
        await db('POST', 'calendar_blocks?on_conflict=external_uid', rows);
      }

      return res.status(200).json({ ok: true, imported: rows.length, events });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(400).json({ error: 'action must be export or import' });
}
