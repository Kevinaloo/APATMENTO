/* Shikaz Homes — the tour definition.

   Scene, materials, standing points and lamp positions are those of the
   original Shikaz viewer. That viewer never mirrored or moved its model,
   so the positions authored there are already WORLD coordinates. */
import type * as T from 'three';
import type { Quality, TourDefinition, TourModel, Vec3 } from '../../contract';
import { buildApartment } from './scene-model';
import { furnishRooms } from './scene-details';
import { furnishServices } from './scene-services';
import { insideApartment, planBounds, planRooms, roomAt, roomViews } from './data';

const photoUrl = (id: number) => `/tours/shikaz-homes/photos/${id}.jpg`;

function build(manager: T.LoadingManager, quality: Quality): TourModel {
  const model = buildApartment(manager, quality, photoUrl);
  furnishRooms(model);
  furnishServices(model);
  model.root.traverse(o => {
    const mesh = o as T.Mesh;
    if (!mesh.isMesh) return;
    // The old viewer's merge made every surface receive shadows (tubes, studs and the
    // sheer curtains included); keep that look now that the engine merges instead.
    mesh.receiveShadow = true;
    // Glass (the pedestal vessel, tumblers, oven and washer doors) and the sheers stay their
    // own meshes: merged, they would sort as one surface against what stands behind them.
    if (!Array.isArray(mesh.material) && mesh.material.transparent) mesh.userData.keep = true;
  });
  const { root, contents, walls, ceilings, lowWalls, collisions } = model;
  return { root, contents, walls, ceilings, lowWalls, collisions, materials: { ...model.m } };
}

// The old viewer's fill lights: lounge pendant, kitchen, second bedroom, main bedroom,
// hallway, shower, WC.
const lamps: { position: Vec3; intensity: number }[] = ([
  [2.1, 2.55, 2.7, 12], [2.8, 2.5, 7.1, 8], [-3.1, 2.5, 1.8, 8], [-2.4, 2.5, 8.4, 11],
  [-.8, 2.5, 4.8, 5], [-2.7, 2.4, 4.25, 3], [-2.7, 2.4, 5.65, 3],
] as const).map(([x, y, z, intensity]) => ({ position: [x, y, z], intensity }));

const definition: TourDefinition = {
  slug: 'shikaz-homes',
  listing: {
    id: '20b22953-2c13-4e6c-a5c4-3cbefcc20cae',
    title: 'Shikaz Homes',
    area: 'Syokimau', city: 'Nairobi', country: 'Kenya',
    lat: -1.37135, lng: 36.93291, tzOffsetHours: 3,
    guests: 4, bedrooms: 2, bathrooms: 1,
    tagline: 'Carved gold & tufted ivory. A closer look.',
    description: 'Step inside a two-bedroom apartment with tufted ivory sofas, a timber feature wall, a separate kitchen and a carved gold bedroom, reconstructed from its listing photographs and walkthrough video.',
  },
  // The old viewer's identity: slate-ink panels with warm sand gold for what is active.
  theme: { accent: '#edd6a5', accentInk: '#282934', night: '#232634', paper: '#f7f4ec', collection: 'THE SYOKIMAU COLLECTION' },
  rooms: [
    { id: 'living', name: 'Living room', detail: 'Soft upholstery & a timber feature wall', image: 10, photos: [10, 6, 7, 8] },
    { id: 'dining', name: 'Dining nook', detail: 'A glass table beside the lounge', image: 9, photos: [9, 7] },
    { id: 'kitchen', name: 'Kitchen', detail: 'Timber cabinetry & everyday essentials', image: 12, photos: [12, 11, 13, 14] },
    { id: 'hall', name: 'Hallway', detail: 'The private rooms, connected', image: 16, photos: [16, 15] },
    { id: 'bedroom', name: 'Main bedroom', detail: 'Carved gold, white linen & blue accents', image: 3, photos: [3, 1, 2] },
    { id: 'bedroom2', name: 'Second bedroom', detail: 'White timber & deep blue textiles', image: 4, photos: [4, 5] },
    { id: 'shower', name: 'Shower', detail: 'A separate tiled shower room', image: 17, photos: [17, 16] },
    { id: 'toilet', name: 'Toilet', detail: 'Separate WC beside the hall basin', image: 18, photos: [18, 16, 15] },
  ],
  photoUrl,
  plan: { bounds: planBounds, rooms: planRooms },
  views: roomViews,
  start: 'living',
  northDeg: 0,
  inside: insideApartment,
  roomAt,
  build,
  lights: { lamps, background: '#242936', exposure: .86, ambient: .28, hemi: .68 },
  // The old viewer had no reflective mirror: the dresser mirror is a polished metal panel in the scene.
  accuracyNote: 'This is a photo-based 3D reconstruction from the 18 original listing photographs and the supplied walkthrough video, not a measured floor plan, scan or 360° capture. ' +
    'The furniture, finishes and fixtures follow the photographs: the tufted lounge seating, timber TV wall, dining nook, separate kitchen, two distinct bedrooms, hall basin, shower and toilet. ' +
    'The video establishes the entrance beside the kitchen and the private rooms off the hallway beside the TV wall. ' +
    'Room dimensions, unseen surfaces and exact opening positions are estimates. Lighting is a simulation. The original photographs show the actual property.',
};

export default definition;
