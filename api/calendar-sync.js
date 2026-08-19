/* ════════════════════════════════════════════════════════════════
   APATMENTO, /api/calendar-sync.js
   Bidirectional iCal calendar sync.
   Imports blocked dates from Airbnb/Booking.com/VRBO iCal feeds.
   Exports Apatmento bookings as iCal for external platforms.
   Prevents double bookings automatically.
════════════════════════════════════════════════════════════════ */
export const config = { maxDuration: 30 };

import { requireUser, setCors } from './lib/_security.js';

const SUPA_URL = process.env.SUPABASE_URL;
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
      `UID:apatmento-${b.id}@cabana.africa`,
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

function trustedCalendarUrl(value) {
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  const host = url.hostname.toLowerCase();
  const allowed = [
    'airbnb.com', 'booking.com', 'vrbo.com', 'homeaway.com', 'expedia.com',
    'calendar.google.com',
  ];
  return allowed.some(domain => host === domain || host.endsWith(`.${domain}`)) ? url : null;
}

async function fetchCalendar(value) {
  let url = trustedCalendarUrl(value);
  if (!url) throw Object.assign(new Error('Unsupported calendar source'), { status: 400 });

  for (let hop = 0; hop < 4; hop += 1) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    let response;
    try {
      response = await fetch(url, {
        signal: ctrl.signal,
        redirect: 'manual',
        headers: { 'User-Agent': 'Cabana Calendar Sync/1.0' },
      });
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 300 && response.status < 400) {
      const next = trustedCalendarUrl(new URL(response.headers.get('location') || '', url).href);
      if (!next) throw Object.assign(new Error('Calendar redirected to an unsupported source'), { status: 400 });
      url = next;
      continue;
    }
    return response;
  }
  throw Object.assign(new Error('Too many calendar redirects'), { status: 400 });
}

async function requireListingOwner(res, listingId, user) {
  const rows = await db('GET', `listings?id=eq.${encodeURIComponent(listingId)}&select=*&limit=1`);
  const listing = rows?.[0];
  if (!listing) {
    res.status(404).json({ error: 'listing_not_found' });
    return null;
  }
  const ownerId = listing.partner_id || listing.host_id || listing.user_id || listing.owner_id;
  if (!ownerId || ownerId !== user.id) {
    res.status(403).json({ error: 'not_your_listing' });
    return null;
  }
  return listing;
}

export default async function handler(req, res) {
  setCors(req, res, 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireUser(req, res);
  if (!user) return;

  const { action, listingId, calendarUrl, source } = 
    req.method === 'GET' 
      ? Object.fromEntries(new URL(req.url, 'http://x').searchParams)
      : (typeof req.body === 'string' ? JSON.parse(req.body) : req.body);

  // ── EXPORT: /api/calendar-sync?action=export&listingId=xxx ──
  if (action === 'export') {
    if (!listingId) return res.status(400).json({ error: 'listingId required' });
    try {
      if (!(await requireListingOwner(res, listingId, user))) return;
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
    if (!trustedCalendarUrl(calendarUrl)) {
      return res.status(400).json({ error: 'Unsupported calendar source' });
    }

    try {
      if (!(await requireListingOwner(res, listingId, user))) return;
      const r = await fetchCalendar(calendarUrl);
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
      return res.status(e.status || 500).json({ error: e.message });
    }
  }

  return res.status(400).json({ error: 'action must be export or import' });
}
