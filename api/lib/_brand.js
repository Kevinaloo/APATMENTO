/* ══════════════════════════════════════════════════════════════════════
   CABANA · BRAND CONSTANTS
   api/lib/_brand.js

   One file every server surface reads its identity from. An address, a
   logo URL or a gradient written twice is an address, a logo URL or a
   gradient that will one day disagree with itself — which is precisely
   how a support answer ends up quoting a phone line nobody answers.

   THE CONTACT SURFACE, stated once:
     · Cabana publishes NO phone number and NO WhatsApp link.
     · Guests reach the team through in-app chat and in-app voice call.
     · connect@cabana.africa     everything guest-facing.
     · partnership@cabana.africa hosts, operators, service providers.
   ══════════════════════════════════════════════════════════════════════ */

export const SITE = process.env.PUBLIC_BASE_URL || 'https://cabana.africa';

/* ── Addresses ─────────────────────────────────────────────────────── */
export const MAIL = {
  /* Guest-facing. Sign-in, notifications, offers, everything ordinary. */
  connect:     `Cabana <connect@cabana.africa>`,
  /* Hosts, operators, service providers. A different voice and a
     different inbox, because a host's question is not a guest's. */
  partnership: `Cabana Partnerships <partnership@cabana.africa>`,
  /* Receipts sit under connect so a guest only ever has one Cabana
     sender in their inbox to trust. */
  bookings:    `Cabana <connect@cabana.africa>`,

  replyToGuest:   'connect@cabana.africa',
  replyToPartner: 'partnership@cabana.africa',
};

export const CONTACT = {
  support:     'connect@cabana.africa',
  partnership: 'partnership@cabana.africa',
  /* Deliberately absent, and named so that a future contributor sees the
     decision rather than an omission. */
  phone:       null,
  whatsapp:    null,
};

/* ── Palette. Mirrors brand.css tokens. ────────────────────────────── */
export const BRAND = {
  ink:        '#08080F',
  ink2:       '#13142A',
  inkSoft:    '#474A66',
  inkFaint:   '#8B8EAC',
  paper:      '#FCFCFE',
  paper2:     '#F5F5FC',
  line:       '#E9EAF4',

  violet:     '#6D28FF',
  electric:   '#4F6DFF',
  mint:       '#4EE0C8',
  gold:       '#F5B12E',
  ember:      '#FF6A3C',
  rose:       '#FF3B5C',

  gradEquator: 'linear-gradient(115deg,#6D28FF 0%,#4F6DFF 32%,#4EE0C8 62%,#F5B12E 100%)',
  gradDusk:    'linear-gradient(135deg,#6D28FF,#FF6A3C)',
  gradReef:    'linear-gradient(135deg,#4F6DFF,#4EE0C8)',
};

export const LOGO = {
  /* The full lockup: emblem plus wordmark. Used at the head of an email. */
  full:     `${SITE}/cabana-full.png`,
  /* Emblem alone, for tight spaces and avatars. */
  mark:     `${SITE}/cabana-emblem.png`,
  icon512:  `${SITE}/cabana-icon-512-v2.png`,
  icon192:  `${SITE}/cabana-icon-192-v2.png`,
  wordmark: `${SITE}/cabana-wordmark-color.png`,
  wordmarkWhite: `${SITE}/cabana-wordmark-white.png`,
  apa:      `${SITE}/cabana-avatar.png`,
};

export const TAGLINE = 'Your World. One App.';
export const PROMISE = 'Zero commission. Always.';

/* ── Routes that actually exist. ────────────────────────────────────
   APA is only allowed to send someone to a page on this list, which is
   the whole reason she cannot invent a destination. Keep it in step with
   the repository; a route removed here is a route APA stops offering. */
export const ROUTES = {
  home:        '/index.html',
  stays:       '/apartments.html',
  apartments:  '/apartments.html',
  roommates:   '/roommates.html',
  tours:       '/tours.html',
  events:      '/events.html',
  food:        '/food.html',
  rides:       '/rides.html',
  carhire:     '/carhire.html',
  flights:     '/flights.html',
  shopping:    '/shopping.html',
  bookings:    '/my-bookings.html',
  'my-bookings': '/my-bookings.html',
  profile:     '/profile.html',
  rewards:     '/rewards.html',
  dashboard:   '/dashboard.html',
  'add-listing': '/add-listing.html',
  signin:      '/auth.html',
  signup:      '/auth.html?mode=signup',
  terms:       '/terms.html',
  privacy:     '/privacy.html',
  help:        '/help.html',
};

export const ROUTE_LABELS = {
  home: 'Home', stays: 'Apartments & Stays', apartments: 'Apartments & Stays',
  roommates: 'Roommates', tours: 'Tours & Safaris', events: 'Events',
  food: 'Food & Dining', rides: 'Rides', carhire: 'Car Hire',
  flights: 'Flights', shopping: 'Shopping', bookings: 'My Bookings',
  'my-bookings': 'My Bookings', profile: 'Profile', rewards: 'Rewards',
  dashboard: 'Dashboard', 'add-listing': 'Add a Listing', signin: 'Sign in',
  signup: 'Create account', terms: 'Terms', privacy: 'Privacy', help: 'Help Centre',
};

export const money = (n) => `KES ${Math.round(Number(n) || 0).toLocaleString('en-KE')}`;

export const prettyDate = (d) => {
  try {
    return new Date(d).toLocaleDateString('en-KE', {
      weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return String(d || ''); }
};
