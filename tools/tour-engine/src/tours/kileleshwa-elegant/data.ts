/* The Kileleshwa residence as data: room rectangles, the walkable floor,
   where to stand in each room, and the floor plan.

   The scene is authored in its own coordinates and mirrored in X by the
   root (see orientModel), so the apartment reads the way the listing
   photographs show it from the entrance. Everything exported for the
   engine (views, plan, inside, roomAt) is in WORLD coordinates, i.e. after
   that mirror; reflectX converts between the two. */
import type { PlanRoom, Vec3 } from '../../contract';

export const reflectX = (x: number) => 8.5 - x;

/** Room rectangles in authored coordinates. Proportions are estimated from the photographs. */
export const sceneRooms = [
  { id: 'living', x: 0, z: 1.8, w: 3.7, d: 4.6 }, { id: 'dining', x: 0, z: 0, w: 3.7, d: 1.8 },
  { id: 'kitchen', x: 0, z: -2.6, w: 3.7, d: 2.6 }, { id: 'utility', x: 0, z: -3.8, w: 3.7, d: 1.2 },
  { id: 'hall', x: 3.7, z: -2.6, w: 1.2, d: 4.4 }, { id: 'bedroom', x: 4.9, z: 0, w: 3.6, d: 4 },
  { id: 'bathroom', x: 4.9, z: -2.6, w: 2.4, d: 2.6 },
];

const LABELS: Record<string, string> = { living: 'LIVING', dining: 'DINING', kitchen: 'KITCHEN', utility: 'LAUNDRY', bedroom: 'BEDROOM', bathroom: 'BATH', hall: 'HALL' };

export const planBounds = { minX: 0, maxX: 8.5, minZ: -3.8, maxZ: 6.4 };
export const planRooms: PlanRoom[] = sceneRooms.map(r => ({
  id: r.id, x: reflectX(r.x + r.w), z: r.z, w: r.w, d: r.d, label: LABELS[r.id],
  ...(r.id === 'hall' ? { hall: true } : {}),
}));

// Authored standing points: each frames the room the way its listing photograph does.
const authoredViews: Record<string, { position: Vec3; target: Vec3 }> = {
  living: { position: [.9, 1.6, 2.25], target: [2.4, 1.25, 5.3] },
  dining: { position: [.7, 1.6, .25], target: [2.6, 1.02, 1.65] },
  kitchen: { position: [1.5, 1.6, -.48], target: [1.5, 1.2, -2.4] },
  bedroom: { position: [7.85, 1.6, .65], target: [6.5, 1.15, 2.8] },
  bathroom: { position: [5.42, 1.6, -1.35], target: [6.8, 1.25, -1.1] },
  utility: { position: [2.6, 1.6, -3.15], target: [.75, .7, -3.4] },
};
const mirrorPoint = (p: Vec3): Vec3 => [reflectX(p[0]), p[1], p[2]];
export const roomViews: Record<string, { position: Vec3; target: Vec3 }> = Object.fromEntries(
  Object.entries(authoredViews).map(([id, v]) => [id, { position: mirrorPoint(v.position), target: mirrorPoint(v.target) }]),
);

/** Walkable floor, world coordinates. */
export function insideApartment(x: number, z: number) {
  x = reflectX(x);
  return sceneRooms.some(r => x > r.x + .055 && x < r.x + r.w - .055 && z > r.z + .055 && z < r.z + r.d - .055) ||
    // Contiguous open floors and door thresholds bridge the small wall-edge margins.
    (x > .07 && x < 3.63 && z > -2.53 && z < 6.33) ||
    (x > 3.55 && x < 5.04 && z > .55 && z < 1.43) ||
    (x > 4.75 && x < 5.10 && z > -1.88 && z < -.92) ||
    (x > 3.01 && x < 3.63 && z > -2.76 && z < -2.44);
}

/** Which room a point is in, world coordinates. */
export function roomAt(x: number, z: number) {
  x = reflectX(x);
  if (x >= 4.9) return z < 0 ? 'bathroom' : 'bedroom';
  if (x >= 3.7) return 'hall';
  if (z < -2.6) return 'utility';
  if (z < 0) return 'kitchen';
  return z < 1.8 ? 'dining' : 'living';
}
