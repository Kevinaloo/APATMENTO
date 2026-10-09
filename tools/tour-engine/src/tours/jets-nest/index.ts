/* The Jets Nest — the tour definition.

   Scene, materials, standing points and lamp positions are those of the
   original Jets Nest viewer; positions here are WORLD coordinates (after
   the root's X mirror), matching what its createApartment produced. */
import type * as T from 'three';
import type { Quality, TourDefinition, TourModel, Vec3 } from '../../contract';
import { buildApartment, orientModel } from './scene-model';
import { furnishRooms } from './scene-details';
import { insideApartment, planBounds, planRooms, reflectX, roomAt, roomViews } from './data';

const photoUrl = (id: number) => `/tours/jets-nest/photos/${id}.jpg`;

function build(manager: T.LoadingManager, quality: Quality): TourModel {
  const model = buildApartment(manager, quality, photoUrl);
  furnishRooms(model);
  orientModel(model);
  model.root.traverse(o => {
    const mesh = o as T.Mesh;
    if (!mesh.isMesh) return;
    // The old viewer's merge made every surface receive shadows (tubes, rings and the
    // framed photographs included); keep that look now that the engine merges instead.
    mesh.receiveShadow = true;
    // The glass vase and blender jug stay their own meshes, so they sort behind what they hold.
    if (!Array.isArray(mesh.material) && mesh.material.transparent) mesh.userData.keep = true;
  });
  const { root, contents, walls, ceilings, lowWalls, collisions } = model;
  return { root, contents, walls, ceilings, lowWalls, collisions, materials: { ...model.m } };
}

// The old viewer's fill lights, authored in room coordinates: living pendant, bedroom,
// kitchen, hall basin, bathroom.
const lamps: { position: Vec3; intensity: number }[] = ([
  [1.8, 2.47, 2.6, 18], [1.9, 2.5, -4.3, 15], [4.5, 2.5, 1.05, 10], [2.8, 2.5, -1.2, 8], [1, 2.5, -1.2, 9],
] as const).map(([x, y, z, intensity]) => ({ position: [reflectX(x), y, z], intensity }));

const definition: TourDefinition = {
  slug: 'jets-nest',
  listing: {
    id: '65ef1d11-a4e3-4250-bbac-f826c0cd10d2',
    title: 'The Jets Nest',
    area: 'Obama Estate', city: 'Nairobi', country: 'Kenya',
    lat: -1.24945, lng: 36.9263, tzOffsetHours: 3,
    guests: 2, bedrooms: 1, bathrooms: 1,
    tagline: 'Mint, velvet & gold. A closer look.',
    description: 'Step inside a one-bedroom stay with beige velvet sofas, gold curtains, a compact kitchen and a warm timber bedroom, reconstructed from its listing photographs.',
  },
  // The old viewer's identity: deep forest green throughout, champagne gold for what is active.
  theme: { accent: '#e8d49f', accentInk: '#213329', night: '#17251e', paper: '#f6f4ec', collection: 'THE OBAMA ESTATE COLLECTION' },
  rooms: [
    { id: 'living', name: 'Living room', detail: 'Mint, velvet & gold', image: 15, photos: [15, 16, 17, 14, 12, 13] },
    { id: 'kitchen', name: 'Kitchen', detail: 'A compact cooking space', image: 11, photos: [11, 4] },
    { id: 'hall', name: 'Hallway', detail: 'Connecting the rooms', image: 6, photos: [6, 17] },
    { id: 'bedroom', name: 'Bedroom', detail: 'Warm timber & soft linen', image: 8, photos: [8, 7, 10, 1] },
    { id: 'bathroom', name: 'Bathroom', detail: 'Combined shower & toilet', image: 3, photos: [3, 2, 5, 9] },
  ],
  photoUrl,
  plan: { bounds: planBounds, rooms: planRooms },
  views: roomViews,
  start: 'living',
  northDeg: 0,
  inside: insideApartment,
  roomAt,
  build,
  lights: { lamps, background: '#263b30', exposure: 1.04, ambient: .62, hemi: 1.15 },
  // The rectangular mirror above the hall basin, facing into the hallway. The old viewer placed it at
  // x .101, 5 mm behind the face of its own chrome frame (which spans x .082–.106), so the frame hid it
  // and the hall showed a blank grey panel; it now sits 3 mm proud of the frame, as the photographs show.
  mirror: { shape: 'rect', size: [.55, .43], position: [.109, 1.70, -1.66], rotationY: Math.PI / 2, tint: 0xb6c7bd },
  accuracyNote: 'This is a photo-based 3D reconstruction from the 17 original listing photographs and the host’s description of how the rooms connect, not a measured floor plan, scan or 360° capture. ' +
    'The furniture, colours, finishes and visible fixtures follow the photographs: the two beige sofas, gold curtains, white coffee table, kitchenette, upholstered bed, timber wardrobe and combined bathroom. ' +
    'The bedroom opens beside the hall basin, the bathroom sits opposite that basin, and the kitchen is next to the main entrance. ' +
    'Room dimensions, unseen surfaces and exact opening positions are estimates. Lighting is a simulation. The original photographs show the actual property.',
};

export default definition;
