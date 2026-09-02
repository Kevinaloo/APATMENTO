/* ══════════════════════════════════════════════════════════════════════
   CABANA · Channel registry  (api/lib/_calendar-platforms.js)
   ──────────────────────────────────────────────────────────────────────
   Who we sync with, what they call things, and — the part that decides
   whether a host ever finishes the job — exactly where the button is on
   their side.

   A NOTE ON THE ALLOWLIST WE DELETED
   ──────────────────────────────────
   The previous implementation refused any feed URL outside six hardcoded
   domains. It was described as a security control. It was not: it was a
   compatibility ceiling. A host on Lodgify, Guesty, Hostaway, OwnerRez,
   Smoobu, NightsBridge or any of the thirty other systems in this file
   simply could not connect, and the error said "Unsupported calendar
   source", which reads as "your platform is not good enough" rather than
   "we have not listed it".

   Meanwhile the allowlist did not actually prevent the attack it looked
   like it was preventing. SSRF is defended at the network layer — by
   refusing to connect to private address space, by re-checking every
   redirect hop, by capping size and time — and _calendar-sync.js does
   all of that, on every URL, including the six that used to be trusted
   blindly.

   So this registry does what a registry should: it RECOGNISES a URL to
   label it, tune its polling and tell the host what to expect. It never
   decides whether a fetch is allowed. Unknown platforms sync fine and
   are labelled "Other calendar".
══════════════════════════════════════════════════════════════════════ */

/* Quirks worth encoding, because each one is a real defect if missed:
     dtendExclusive  · false means the platform sends the LAST occupied
                       night rather than the checkout day, and we must
                       add one to get a half-open range.
     httpOnly        · publishes http:// links. We upgrade to https.
     weakValidators  · sends no ETag, or rewrites DTSTAMP on every
                       request, so byte comparison is useless and only a
                       semantic fingerprint detects a real change.
     mirrors         · re-publishes calendars it imported, so our own
                       bookings come back to us. Echo detection matters
                       most here. */

const P = (key, o) => ({
  key,
  name: o.name,
  category: o.category || 'ota',
  colour: o.colour || '#6D28FF',
  hosts: o.hosts || [],
  urlHint: o.urlHint || null,
  canImport: o.canImport !== false,   // we can read their feed
  canExport: o.canExport !== false,   // they can read ours
  interval: o.interval || 60,
  dtendExclusive: o.dtendExclusive !== false,
  httpOnly: !!o.httpOnly,
  weakValidators: !!o.weakValidators,
  mirrors: !!o.mirrors,
  note: o.note || null,
  importSteps: o.importSteps || [],
  exportSteps: o.exportSteps || [],
});

export const PLATFORMS = [
  /* ── The big marketplaces ─────────────────────────────────────────── */
  P('airbnb', {
    name: 'Airbnb', colour: '#FF5A5F', category: 'ota', interval: 60,
    hosts: ['airbnb.com', 'airbnb.co.uk', 'airbnb.ca', 'airbnb.com.au', 'airbnb.de',
            'airbnb.fr', 'airbnb.es', 'airbnb.it', 'airbnb.co.za', 'airbnb.co.in',
            'airbnb.com.br', 'airbnb.mx', 'airbnb.ie', 'airbnb.nl', 'airbnb.pt'],
    urlHint: 'https://www.airbnb.com/calendar/ical/12345678.ics?s=…',
    weakValidators: true,
    note: 'Airbnb rewrites DTSTAMP on every request, so the bytes always look new. We compare meaning, not bytes.',
    importSteps: [
      'Open Airbnb → Menu → Calendar and pick this listing.',
      'In the right-hand panel open Availability → Connect to another website.',
      'Under "Export calendar", copy the link Airbnb shows.',
      'Paste it here. Airbnb refreshes roughly every 2–4 hours on their side.',
    ],
    exportSteps: [
      'Copy your Cabana calendar link above.',
      'In Airbnb → Calendar → Availability → Connect to another website, choose "Import calendar".',
      'Paste the Cabana link and name it "Cabana".',
      'Airbnb will block those dates automatically from its next refresh.',
    ],
  }),

  P('booking', {
    name: 'Booking.com', colour: '#003580', category: 'ota', interval: 60,
    hosts: ['booking.com', 'ical.booking.com', 'admin.booking.com'],
    urlHint: 'https://ical.booking.com/v1/export?t=…',
    note: 'Booking.com only offers iCal on properties set up as apartments/homes. Hotel-model properties sync through their extranet instead.',
    importSteps: [
      'Open the Booking.com Extranet → Rates & Availability → Calendar sync.',
      'Under "Export calendar", copy the iCal link for this room type.',
      'Paste it here. One feed per room type, not per property.',
    ],
    exportSteps: [
      'Copy your Cabana calendar link above.',
      'Extranet → Rates & Availability → Calendar sync → Import calendar.',
      'Paste the link, name it "Cabana", and save.',
    ],
  }),

  P('vrbo', {
    name: 'Vrbo / HomeAway', colour: '#1668E3', category: 'ota', interval: 60,
    hosts: ['vrbo.com', 'homeaway.com', 'homeaway.co.uk', 'abritel.fr',
            'fewo-direkt.de', 'stayz.com.au', 'bookabach.co.nz', 'vrbo.ca'],
    urlHint: 'https://www.vrbo.com/icalendar/abc123….ics',
    httpOnly: true,
    note: 'Vrbo still publishes some links as http://. We upgrade them to https automatically.',
    importSteps: [
      'Open Vrbo → Calendar → Import/Export.',
      'Copy the link under "Export calendar".',
      'Paste it here.',
    ],
    exportSteps: [
      'Copy your Cabana calendar link above.',
      'Vrbo → Calendar → Import/Export → Import Calendar.',
      'Paste the link, label it "Cabana", and save.',
    ],
  }),

  P('expedia', {
    name: 'Expedia', colour: '#FFC94D', category: 'ota',
    hosts: ['expedia.com', 'expediapartnercentral.com', 'expedia.co.uk', 'hotels.com'],
    importSteps: [
      'Open Expedia Partner Central → Property → Rates & Availability.',
      'Open Calendar sync and copy the export (iCal) link.',
      'Paste it here.',
    ],
    exportSteps: [
      'Copy your Cabana calendar link above.',
      'Partner Central → Rates & Availability → Calendar sync → add an import URL.',
    ],
  }),

  P('agoda', {
    name: 'Agoda', colour: '#E31C5F', category: 'ota',
    hosts: ['agoda.com', 'ycs.agoda.com'],
    importSteps: [
      'Open Agoda YCS → Calendar → Sync calendars.',
      'Copy the export link for this room.',
      'Paste it here.',
    ],
    exportSteps: [
      'Copy your Cabana calendar link above.',
      'YCS → Calendar → Sync calendars → Add calendar, and paste it.',
    ],
  }),

  P('tripadvisor', {
    name: 'Tripadvisor / FlipKey', colour: '#34E0A1', category: 'ota',
    hosts: ['tripadvisor.com', 'flipkey.com', 'holidaylettings.co.uk', 'tripadvisor.co.uk'],
    importSteps: [
      'Open the Tripadvisor Rentals owner dashboard → Calendar.',
      'Choose Import/Export and copy the export link.',
      'Paste it here.',
    ],
    exportSteps: [
      'Copy your Cabana calendar link above.',
      'Owner dashboard → Calendar → Import calendar, and paste it.',
    ],
  }),

  P('trip_com', {
    name: 'Trip.com', colour: '#287DFA', category: 'ota',
    hosts: ['trip.com', 'ctrip.com', 'ebooking.trip.com'],
    importSteps: ['Open Trip.com eBooking → Calendar → iCal sync and copy the export link.'],
    exportSteps: ['Paste your Cabana link into Trip.com eBooking → Calendar → iCal sync → Import.'],
  }),

  P('hostelworld', {
    name: 'Hostelworld', colour: '#F04E36', category: 'ota',
    hosts: ['hostelworld.com', 'inbox.hostelworld.com'],
    importSteps: ['Open Hostelworld Inbox → Availability → Calendar sync and copy the export link.'],
    exportSteps: ['Add your Cabana link under Hostelworld Inbox → Availability → Calendar sync.'],
  }),

  P('marriott_hv', {
    name: 'Homes & Villas by Marriott', colour: '#A6192E', category: 'ota',
    hosts: ['homes-and-villas.marriott.com', 'marriott.com'],
    note: 'Marriott onboards most homes through a connected property manager rather than a direct iCal link.',
    importSteps: ['Ask your Marriott account manager for the property iCal export link.'],
    exportSteps: ['Send your Cabana link to your Marriott account manager to add as an import.'],
  }),

  P('plum_guide', {
    name: 'Plum Guide', colour: '#0E1B33', category: 'ota',
    hosts: ['plumguide.com'],
    importSteps: ['Open Plum Guide host dashboard → Calendar → Sync and copy the export link.'],
    exportSteps: ['Add your Cabana link under Plum Guide → Calendar → Sync → Import.'],
  }),

  P('holidu', {
    name: 'Holidu', colour: '#00A0DF', category: 'ota',
    hosts: ['holidu.com', 'holidu.de', 'bookiply.com'],
    importSteps: ['Open Bookiply/Holidu → Calendar → Synchronisation and copy the export link.'],
    exportSteps: ['Add your Cabana link under Bookiply → Calendar → Synchronisation.'],
  }),

  /* ── Africa. The channels that actually matter here and that most
       international tools quietly omit. ───────────────────────────────── */
  P('nightsbridge', {
    name: 'NightsBridge', colour: '#00539B', category: 'ota',
    hosts: ['nightsbridge.co.za', 'nightsbridge.com'],
    note: 'The dominant booking system in Southern Africa. Full iCal in and out.',
    importSteps: [
      'Open the NightsBridge BridgeIT dashboard → Calendar → iCal.',
      'Copy the export link for this room type.',
      'Paste it here.',
    ],
    exportSteps: ['Add your Cabana link under BridgeIT → Calendar → iCal → Import.'],
  }),

  P('safarinow', {
    name: 'SafariNow', colour: '#F5A623', category: 'ota',
    hosts: ['safarinow.com'],
    importSteps: ['Open SafariNow supplier console → Availability → Calendar sync.'],
    exportSteps: ['Add your Cabana link under SafariNow → Availability → Calendar sync.'],
  }),

  P('lekkeslaap', {
    name: 'LekkeSlaap', colour: '#009B4D', category: 'ota',
    hosts: ['lekkeslaap.co.za'],
    importSteps: ['Open LekkeSlaap establishment admin → Calendar → iCal feeds.'],
    exportSteps: ['Add your Cabana link under LekkeSlaap → Calendar → iCal feeds.'],
  }),

  P('jumia_travel', {
    name: 'Travelstart / regional OTA', colour: '#F68B1E', category: 'ota',
    hosts: ['travelstart.com', 'travelstart.co.za'],
    importSteps: ['Ask your account manager for the property iCal export link.'],
    exportSteps: ['Send your Cabana link to your account manager to add as an import.'],
  }),

  /* ── Channel managers and property-management systems ───────────────
       A host on one of these usually wants a SINGLE connection here and
       lets the manager fan out to every OTA. That is the cheapest, most
       reliable setup and the UI recommends it. */
  P('guesty', {
    name: 'Guesty', colour: '#00C8B4', category: 'pms', interval: 30, mirrors: true,
    hosts: ['guesty.com', 'app.guesty.com', 'ical.guesty.com'],
    importSteps: [
      'Open Guesty → Listings → this listing → Calendar → iCal sync.',
      'Copy the "Export" link.',
      'Paste it here.',
    ],
    exportSteps: ['Guesty → Listing → Calendar → iCal sync → Import, and paste your Cabana link.'],
  }),
  P('hostaway', {
    name: 'Hostaway', colour: '#1FB6FF', category: 'pms', interval: 30, mirrors: true,
    hosts: ['hostaway.com', 'dashboard.hostaway.com'],
    importSteps: ['Hostaway → Listings → Channels → iCal, and copy the export link.'],
    exportSteps: ['Hostaway → Listings → Channels → iCal → Add, and paste your Cabana link.'],
  }),
  P('lodgify', {
    name: 'Lodgify', colour: '#FF6B35', category: 'pms', interval: 30, mirrors: true,
    hosts: ['lodgify.com', 'app.lodgify.com'],
    importSteps: ['Lodgify → Calendar → Sync calendars → Export, and copy the link.'],
    exportSteps: ['Lodgify → Calendar → Sync calendars → Import, and paste your Cabana link.'],
  }),
  P('ownerrez', {
    name: 'OwnerRez', colour: '#2E5E8C', category: 'pms', interval: 30, mirrors: true,
    hosts: ['ownerrez.com', 'app.ownerrez.com', 'ical.ownerrez.com'],
    importSteps: ['OwnerRez → Calendars → iCal Export, and copy the link for this property.'],
    exportSteps: ['OwnerRez → Calendars → iCal Import → Add, and paste your Cabana link.'],
  }),
  P('smoobu', {
    name: 'Smoobu', colour: '#00B2A9', category: 'pms', interval: 30, mirrors: true,
    hosts: ['smoobu.com', 'login.smoobu.com'],
    importSteps: ['Smoobu → Apartment → Channel manager → iCal, and copy the export link.'],
    exportSteps: ['Smoobu → Apartment → Channel manager → iCal → Add connection.'],
  }),
  P('beds24', {
    name: 'Beds24', colour: '#4A90D9', category: 'pms', interval: 30, mirrors: true,
    hosts: ['beds24.com'],
    importSteps: ['Beds24 → Settings → Channel Manager → iCal → Export, and copy the link.'],
    exportSteps: ['Beds24 → Settings → Channel Manager → iCal → Import, and paste your Cabana link.'],
  }),
  P('uplisting', {
    name: 'Uplisting', colour: '#5B4DF5', category: 'pms', interval: 30, mirrors: true,
    hosts: ['uplisting.io'],
    importSteps: ['Uplisting → Property → Calendar sync, and copy the export link.'],
    exportSteps: ['Uplisting → Property → Calendar sync → Add calendar.'],
  }),
  P('hospitable', {
    name: 'Hospitable', colour: '#0F172A', category: 'pms', interval: 30, mirrors: true,
    hosts: ['hospitable.com', 'my.hospitable.com'],
    importSteps: ['Hospitable → Properties → Calendar → iCal links, and copy the export link.'],
    exportSteps: ['Hospitable → Properties → Calendar → iCal links → Import.'],
  }),
  P('tokeet', {
    name: 'Tokeet', colour: '#F26722', category: 'pms', interval: 30, mirrors: true,
    hosts: ['tokeet.com', 'app.tokeet.com'],
    importSteps: ['Tokeet → Rentals → Calendar → iCal feeds, and copy the export link.'],
    exportSteps: ['Tokeet → Rentals → Calendar → iCal feeds → Import.'],
  }),
  P('hostfully', {
    name: 'Hostfully', colour: '#1B9AAA', category: 'pms', interval: 30, mirrors: true,
    hosts: ['hostfully.com', 'platform.hostfully.com'],
    importSteps: ['Hostfully → Property → Calendar → iCal, and copy the export link.'],
    exportSteps: ['Hostfully → Property → Calendar → iCal → Add external calendar.'],
  }),
  P('cloudbeds', {
    name: 'Cloudbeds', colour: '#00A5E0', category: 'pms', interval: 30, mirrors: true,
    hosts: ['cloudbeds.com', 'hotels.cloudbeds.com'],
    importSteps: ['Cloudbeds → Manage → Channels → iCal, and copy the export link.'],
    exportSteps: ['Cloudbeds → Manage → Channels → iCal → Import calendar.'],
  }),
  P('eviivo', {
    name: 'eviivo', colour: '#E5006D', category: 'pms', interval: 30, mirrors: true,
    hosts: ['eviivo.com', 'suite.eviivo.com'],
    importSteps: ['eviivo suite → Diary → Calendar sync, and copy the export link.'],
    exportSteps: ['eviivo suite → Diary → Calendar sync → Add calendar.'],
  }),
  P('rentals_united', {
    name: 'Rentals United', colour: '#00587C', category: 'pms', interval: 30, mirrors: true,
    hosts: ['rentalsunited.com'],
    importSteps: ['Rentals United → Property → Calendar → iCal export.'],
    exportSteps: ['Rentals United → Property → Calendar → iCal import.'],
  }),
  P('igms', {
    name: 'iGMS', colour: '#2DC5A0', category: 'pms', interval: 30, mirrors: true,
    hosts: ['igms.com', 'app.igms.com'],
    importSteps: ['iGMS → Properties → Calendar → iCal, and copy the export link.'],
    exportSteps: ['iGMS → Properties → Calendar → iCal → Import.'],
  }),
  P('avantio', {
    name: 'Avantio', colour: '#F7941E', category: 'pms', interval: 30, mirrors: true,
    hosts: ['avantio.com'],
    importSteps: ['Avantio → Accommodation → Calendar → iCal synchronisation.'],
    exportSteps: ['Avantio → Accommodation → Calendar → iCal synchronisation → Import.'],
  }),

  /* ── Personal calendars. How a host blocks their own family holiday
       without opening our app at all. ─────────────────────────────────── */
  P('google', {
    name: 'Google Calendar', colour: '#4285F4', category: 'personal', interval: 60,
    hosts: ['calendar.google.com', 'google.com'],
    urlHint: 'https://calendar.google.com/calendar/ical/…/private-…/basic.ics',
    note: 'Use the SECRET address in iCal format. The public address only works if the whole calendar is public.',
    importSteps: [
      'Open Google Calendar on a computer.',
      'Hover the calendar in the left list → ⋮ → Settings and sharing.',
      'Scroll to "Integrate calendar" and copy the "Secret address in iCal format".',
      'Paste it here. Google refreshes its published feed slowly — allow a few hours.',
    ],
    exportSteps: [
      'Copy your Cabana calendar link above.',
      'Google Calendar → Other calendars → + → From URL.',
      'Paste the link and click "Add calendar". It appears read-only, which is correct.',
    ],
  }),
  P('apple', {
    name: 'Apple Calendar / iCloud', colour: '#333333', category: 'personal',
    hosts: ['icloud.com', 'p01-caldav.icloud.com', 'p02-caldav.icloud.com'],
    note: 'iCloud hands out webcal:// links. We convert them to https:// for you.',
    importSteps: [
      'On iCloud.com open Calendar and click the ◉ beside the calendar name.',
      'Tick "Public Calendar" and copy the webcal:// link.',
      'Paste it here — we handle the webcal:// prefix.',
    ],
    exportSteps: [
      'Copy your Cabana calendar link above.',
      'In Apple Calendar choose File → New Calendar Subscription and paste it.',
    ],
  }),
  P('outlook', {
    name: 'Outlook / Microsoft 365', colour: '#0078D4', category: 'personal',
    hosts: ['outlook.office365.com', 'outlook.live.com', 'outlook.com', 'office365.com'],
    importSteps: [
      'Outlook on the web → Settings → Calendar → Shared calendars.',
      'Under "Publish a calendar" choose the calendar, pick "Can view all details", and Publish.',
      'Copy the ICS link (not the HTML one) and paste it here.',
    ],
    exportSteps: [
      'Copy your Cabana calendar link above.',
      'Outlook → Add calendar → Subscribe from web, and paste it.',
    ],
  }),

  P('cabana', {
    name: 'Cabana', colour: '#6D28FF', category: 'internal',
    hosts: ['cabana.africa', 'www.cabana.africa'],
    canImport: false,
    note: 'Your own feed. Connecting a listing to itself would import its own bookings and block them twice.',
    importSteps: [], exportSteps: [],
  }),

  P('other', {
    name: 'Other calendar', colour: '#8B8EAC', category: 'other',
    hosts: [],
    note: 'Any standards-compliant .ics feed works. If your platform is not listed, paste the link anyway.',
    importSteps: [
      'Find the calendar export, iCal or "sync" section of your platform.',
      'Copy the .ics link it gives you.',
      'Paste it here — any RFC 5545 feed is supported.',
    ],
    exportSteps: [
      'Copy your Cabana calendar link above.',
      'Paste it into your platform’s "import calendar" or "add external calendar" field.',
    ],
  }),
];

export const PLATFORM_BY_KEY = Object.fromEntries(PLATFORMS.map(p => [p.key, p]));

export function getPlatform(key) {
  return PLATFORM_BY_KEY[String(key || '').toLowerCase()] || PLATFORM_BY_KEY.other;
}

/* Recognise a pasted URL. Host suffix matching, never substring: a URL
   like https://evil.example.com/?x=airbnb.com must not be labelled
   Airbnb, and https://not-airbnb.com must not match airbnb.com. */
export function detectPlatform(rawUrl) {
  let host;
  try {
    host = new URL(String(rawUrl).replace(/^webcal:/i, 'https:')).hostname.toLowerCase();
  } catch {
    return PLATFORM_BY_KEY.other;
  }
  for (const p of PLATFORMS) {
    for (const domain of p.hosts) {
      if (host === domain || host.endsWith(`.${domain}`)) return p;
    }
  }
  return PLATFORM_BY_KEY.other;
}

/* webcal:// is the scheme most platforms put on the clipboard. It is
   https with a different name, and making a host hand-edit it is a
   support ticket we can simply not have. */
export function normaliseFeedUrl(rawUrl) {
  const trimmed = String(rawUrl || '').trim().replace(/^["'<]|[">']$/g, '');
  if (!trimmed) return null;
  const upgraded = trimmed
    .replace(/^webcal:\/\//i, 'https://')
    .replace(/^http:\/\//i,  'https://');   // Vrbo still publishes http links
  try {
    const url = new URL(upgraded);
    if (url.protocol !== 'https:') return null;
    return url.href;
  } catch {
    return null;
  }
}

/* Everything a host needs to finish the job, in one payload the UI can
   render without knowing anything about any platform. */
export function connectionGuide(publicFeedUrl) {
  return PLATFORMS
    .filter(p => p.key !== 'cabana')
    .map(p => ({
      key: p.key, name: p.name, colour: p.colour, category: p.category,
      canImport: p.canImport, canExport: p.canExport,
      urlHint: p.urlHint, note: p.note,
      interval: p.interval,
      importSteps: p.importSteps,
      exportSteps: p.exportSteps.map(s =>
        publicFeedUrl ? s.replace('the link above', publicFeedUrl) : s),
    }));
}

export default { PLATFORMS, PLATFORM_BY_KEY, getPlatform, detectPlatform, normaliseFeedUrl, connectionGuide };
