/* Fully furnished Elegant 1Bedroom in Kileleshwa — the tour definition.

   Scene, materials, standing points and lamp positions are those of the
   original Kileleshwa viewer; positions here are WORLD coordinates (after
   the root's X mirror), matching what its createApartment produced. */
import type * as T from 'three';
import type { Quality, TourDefinition, TourModel, Vec3 } from '../../contract';
import { buildApartment, orientModel } from './scene-model';
import { furnishRooms } from './scene-details';
import { furnishServices } from './scene-services';
import { insideApartment, planBounds, planRooms, reflectX, roomAt, roomViews } from './data';

function build(_manager: T.LoadingManager, quality: Quality): TourModel {
  const model = buildApartment(quality);
  furnishRooms(model);
  furnishServices(model);
  orientModel(model);
  // Glass (shower screen, windows, oven and washer doors, shelves) stays its own mesh:
  // merged, the shower screen and the shelves behind it would sort as one surface.
  model.root.traverse(o => {
    const mesh = o as T.Mesh;
    if (mesh.isMesh && !Array.isArray(mesh.material) && mesh.material.transparent) mesh.userData.keep = true;
  });
  const { root, contents, walls, ceilings, lowWalls, collisions } = model;
  return { root, contents, walls, ceilings, lowWalls, collisions, materials: { ...model.m } };
}

// The old viewer's fill lights, authored in room coordinates: living chandelier, dining,
// kitchen, bedroom ceiling, bathroom, vanity, laundry.
const lamps: { position: Vec3; intensity: number }[] = ([
  [1.85, 2.38, 4.5, 16], [1.8, 2.5, 1.0, 11], [1.6, 2.4, -1.3, 13], [6.8, 2.5, 2, 13],
  [5.8, 2.5, -1.2, 10], [4.25, 2.5, -.6, 8], [1.8, 2.4, -3.3, 6],
] as const).map(([x, y, z, intensity]) => ({ position: [reflectX(x), y, z], intensity }));

const definition: TourDefinition = {
  slug: 'kileleshwa-elegant',
  listing: {
    id: '2d488e1a-3582-409f-ac3c-5f67adc90c74',
    title: 'Fully furnished Elegant 1Bedroom in Kileleshwa',
    area: 'Kileleshwa', city: 'Nairobi', country: 'Kenya',
    lat: -1.28535, lng: 36.77497, tzOffsetHours: 3,
    guests: 2, bedrooms: 1, bathrooms: 1,
    tagline: 'An elegant stay. A closer look.',
    description: 'Step inside this fully furnished one-bedroom apartment in Kileleshwa. Discover every room, every texture, every considered detail.',
  },
  // The old viewer's identity: brushed gold on cream, with deep sage-forest for night and ink.
  theme: { accent: '#b99858', accentInk: '#183329', night: '#183329', paper: '#fbf9f3', collection: 'THE KILELESHWA COLLECTION' },
  rooms: [
    { id: 'living', name: 'Living room', detail: 'Soft ivory. A little gold.', image: 3, photos: [1, 3, 5, 8] },
    { id: 'dining', name: 'Dining & work', detail: 'Slow mornings. Space to focus.', image: 11, photos: [11, 5, 1] },
    { id: 'kitchen', name: 'Kitchen', detail: 'Pale oak, thoughtfully equipped.', image: 6, photos: [6, 12, 7, 13] },
    { id: 'bedroom', name: 'Bedroom', detail: 'Charcoal velvet. A golden finish.', image: 2, photos: [2, 16, 17] },
    { id: 'bathroom', name: 'Bathroom', detail: 'Marble tones & a glass shower.', image: 9, photos: [9, 14] },
    { id: 'utility', name: 'Laundry', detail: 'The practical details, considered.', image: 10, photos: [10, 6] },
  ],
  // Photos 18, 4 and 15 show the building's shared amenities; they are not modelled as rooms.
  extraPhotos: {
    id: 'amenities', name: 'Shared amenities', detail: 'Beyond your front door.',
    photos: [{ id: 18, name: 'Shared indoor pool' }, { id: 4, name: 'Shared gym' }, { id: 15, name: 'Shared play area' }],
  },
  photoUrl: id => `/tours/kileleshwa-elegant/photos/${id}.jpg`,
  plan: { bounds: planBounds, rooms: planRooms },
  views: roomViews,
  start: 'living',
  northDeg: 0,
  inside: insideApartment,
  roomAt,
  build,
  lights: { lamps, background: '#d7dbd5', exposure: .96, ambient: .46, hemi: 1.05 },
  // The ornate oval mirror above the entry console: a .265 m circle stretched 1.2× in height.
  mirror: { shape: 'circle', size: [.53, .53], position: [reflectX(3.585), 1.76, 1.89], rotationY: Math.PI / 2, scaleY: 1.2, tint: 0xcbd3c7 },
  accuracyNote: 'This is a photo-based 3D reconstruction from the 18 original listing photographs, not a measured floor plan, scan or 360° capture. ' +
    'The furnishings follow what the photographs show; dimensions, concealed surfaces, doorway positions and the connections between rooms are estimates. ' +
    'The shared pool, gym and play area appear only in the photographs and are not modelled. No balcony or outside view has been invented. ' +
    'Lighting is a simulation. The original photographs show the actual property.',
};

export default definition;
