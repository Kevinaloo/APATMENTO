/* A tour definition for developing the UI shell against the fake engine.
   Data are the Kileleshwa apartment's (world coordinates, X already mirrored
   to match the photographs), trimmed to four rooms. There is no scene: the
   fake engine paints the listing photographs instead. Remove before release. */
import type { PlanRoom, TourDefinition } from '../../contract';

const plan: PlanRoom[] = [
  { id: 'living', x: 4.8, z: 1.8, w: 3.7, d: 4.6, label: 'LIVING' },
  { id: 'dining', x: 4.8, z: 0, w: 3.7, d: 1.8, label: 'DINING' },
  { id: 'kitchen', x: 4.8, z: -2.6, w: 3.7, d: 2.6, label: 'KITCHEN' },
  { id: 'utility', x: 4.8, z: -3.8, w: 3.7, d: 1.2, label: 'LAUNDRY' },
  { id: 'hall', x: 3.6, z: -2.6, w: 1.2, d: 4.4, label: 'HALL', hall: true },
  { id: 'bedroom', x: 0, z: 0, w: 3.6, d: 4, label: 'BEDROOM' },
  { id: 'bathroom', x: 1.2, z: -2.6, w: 2.4, d: 2.6, label: 'BATH' },
];

const M = 0.16;
const within = (r: PlanRoom, x: number, z: number, m = 0) => x >= r.x + m && x <= r.x + r.w - m && z >= r.z + m && z <= r.z + r.d - m;

const definition: TourDefinition = {
  slug: '_ui-test',
  listing: {
    id: '2d488e1a-3582-409f-ac3c-5f67adc90c74',
    title: 'Fully furnished Elegant 1Bedroom in Kileleshwa',
    area: 'Kileleshwa', city: 'Nairobi', country: 'Kenya',
    lat: -1.28535, lng: 36.77497, tzOffsetHours: 3,
    guests: 2, bedrooms: 1, bathrooms: 1,
    tagline: 'An elegant stay. A closer look.',
    description: 'Step inside this fully furnished one-bedroom apartment in Kileleshwa. Every room, every texture, every considered detail.',
  },
  theme: { accent: '#c2a46d', accentInk: '#1b2620', night: '#15241f', paper: '#f7f3ea', collection: 'THE KILELESHWA COLLECTION' },
  rooms: [
    { id: 'living', name: 'Living room', detail: 'Soft ivory. A little gold.', image: 3, photos: [3, 1, 5, 8] },
    { id: 'dining', name: 'Dining & work', detail: 'Slow mornings. Space to focus.', image: 11, photos: [11, 5, 1] },
    { id: 'kitchen', name: 'Kitchen', detail: 'Pale oak, thoughtfully equipped.', image: 6, photos: [6, 12, 7, 13] },
    { id: 'bedroom', name: 'Bedroom', detail: 'Charcoal velvet. A golden finish.', image: 2, photos: [2, 16, 17] },
  ],
  extraPhotos: {
    id: 'amenities', name: 'Shared amenities', detail: 'Beyond your front door.',
    photos: [{ id: 18, name: 'Shared indoor pool' }, { id: 4, name: 'Shared gym' }, { id: 15, name: 'Shared play area' }],
  },
  photoUrl: id => `/tours/kileleshwa-elegant/photos/${id}.jpg`,
  plan: { bounds: { minX: 0, maxX: 8.5, minZ: -3.8, maxZ: 6.4 }, rooms: plan },
  views: {
    living: { position: [7.6, 1.6, 2.25], target: [6.1, 1.25, 5.3] },
    dining: { position: [7.8, 1.6, 0.25], target: [5.9, 1.02, 1.65] },
    kitchen: { position: [7.0, 1.6, -0.48], target: [7.0, 1.2, -2.4] },
    bedroom: { position: [0.65, 1.6, 0.65], target: [2.0, 1.15, 2.8] },
  },
  start: 'living',
  inside: (x, z) => plan.some(r => within(r, x, z, M)) || plan.some(r => r.hall && within(r, x, z)),
  roomAt: (x, z) => plan.find(r => !r.hall && within(r, x, z))?.id ?? 'hall',
  build() { throw new Error('The UI test tour has no scene; it runs on the fake engine.'); },
  lights: { lamps: [], background: '#d7dbd5' },
  accuracyNote: 'This is a photo-based 3D reconstruction, not a measured scan. Dimensions, room connections and unseen details are estimates. The original photographs show the actual property.',
};

export default definition;
