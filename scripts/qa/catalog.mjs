// A journey is counted only after its assertions have run. Contracts and route
// probes are separate evidence classes; they never inflate the journey count.
export const services = [
  ['stays', '/apartments'], ['food', '/food'], ['shopping', '/shopping'],
  ['roommates', '/roommates'], ['carhire', '/carhire'], ['rides', '/rides'],
  ['events', '/events'], ['tours', '/tours'], ['flights', '/flights'],
].map(([id, path]) => ({ id, path }));

export const sharedJourneys = ['signup', 'login', 'password-reset', 'admin-dashboard'];
export const serviceJourneys = [
  'search', 'filters', 'favorites', 'listing-creation', 'photo-upload',
  'photo-ordering', 'claim-listing', 'ownership-transfer', 'checkout',
  'payment-initiation', 'booking', 'cancellation', 'emails', 'host-dashboard',
  'mobile-navigation',
];

export const requiredJourneys = [
  ...sharedJourneys.map(journey => ({ id: `shared.${journey}`, service: 'shared', journey })),
  ...services.flatMap(service => serviceJourneys.map(journey => ({
    id: `${service.id}.${journey}`, service: service.id, journey,
  }))),
];

export const requiredChecks = ['contracts', 'routes', 'browser', 'deployment', 'database-target', 'migrations', 'rls', 'completion'];
export const criticalPaths = [...new Set([
  '/', ...services.map(s => s.path), '/auth', '/dashboard', '/add-listing',
  '/booking-confirm', '/checkout', '/my-bookings', '/partner-cabana',
  '/partner-listings', '/partner-bookings', '/admin', '/list-your-tour',
  '/list-your-event', '/list-your-fleet', '/become-driver', '/profile',
])];

// These existing suites provide regression evidence, not live delivery evidence.
export const contracts = {
  signup: ['security', 'role-programmes'], login: ['security', 'admin-guard-routing'],
  'password-reset': ['security'], search: ['location', 'stay-taxonomy', 'flights', 'rides-africa'],
  filters: ['stay-taxonomy', 'carhire-terrain'], favorites: ['stays-listing-experience'],
  'listing-creation': ['listing-claim', 'listing-cards'], 'photo-upload': ['listing-cards'],
  'photo-ordering': ['stays-listing-experience'], 'claim-listing': ['listing-claim'],
  'ownership-transfer': ['listing-claim', 'role-programmes'], checkout: ['checkout', 'cabana-cart'],
  'payment-initiation': ['security', 'stay-offers'], booking: ['stay-offers', 'booking-receipt'],
  cancellation: ['stay-offers', 'calendar-sync'], emails: ['email', 'notification-delivery'],
  'host-dashboard': ['host-copilot', 'member-experience'],
  'admin-dashboard': ['admin-guard-routing'], 'mobile-navigation': ['contact-surface'],
};
