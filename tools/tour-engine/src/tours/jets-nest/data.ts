/* The Jets Nest as data: where to stand in each room, the walkable floor,
   which room a point is in, and the floor plan.

   The scene is authored in its own coordinates and mirrored in X by the
   root (see orientModel), so the apartment reads the way the listing
   photographs show it. Everything exported for the engine (views, plan,
   inside, roomAt) is in WORLD coordinates, i.e. after that mirror;
   reflectX converts between the two. */
import type { PlanRoom, Vec3 } from '../../contract';

export const reflectX = (x: number) => 3.6 - x;

// Authored standing points: each frames the room the way its listing photograph does.
const authoredViews: Record<string, { position: Vec3; target: Vec3 }> = {
  living: { position: [2.90, 1.60, .89], target: [1.3, 1.0, 3.55] },
  kitchen: { position: [3.93, 1.60, 1.08], target: [5.1, 1.10, .64] },
  hall: { position: [2.66, 1.60, -.35], target: [3.22, 1.15, -1.75] },
  bedroom: { position: [2.87, 1.60, -2.98], target: [1.80, 1.05, -5.18] },
  bathroom: { position: [1.70, 1.60, -1.45], target: [.48, 1.0, -1.78] },
};
const mirrorPoint = (p: Vec3): Vec3 => [reflectX(p[0]), p[1], p[2]];
export const roomViews: Record<string, { position: Vec3; target: Vec3 }> = Object.fromEntries(
  Object.entries(authoredViews).map(([id, v]) => [id, { position: mirrorPoint(v.position), target: mirrorPoint(v.target) }]),
);

/** Which room a point is in, world coordinates. The hallway is a room of its own here: it holds the basin. */
export function roomAt(x: number, z: number) {
  x = reflectX(x);
  if (z < -2.52) return 'bedroom';
  if (z < -.04) return x < 2.1 ? 'bathroom' : 'hall';
  if (x > 3.63 && z < 2.05) return 'kitchen';
  return 'living';
}

/** Walkable floor, world coordinates: the five room floors, bridged at the doorways. */
export function insideApartment(x: number, z: number) {
  x = reflectX(x);
  return (x > .13 && x < 3.47 && z > -.06 && z < 4.87) || (x > 3.47 && x < 5.32 && z > .22 && z < 1.87) ||
    (x > 2.23 && x < 3.47 && z > -2.60 && z < .12) || (x > .13 && x < 2.25 && z > -2.37 && z < -.13) ||
    (x > .13 && x < 3.47 && z > -5.87 && z < -2.40);
}

/* The old viewer's minimap rectangles (authored coordinates, proportions
   estimated from the photographs), mirrored into world coordinates. */
const sceneRooms = [
  { id: 'living', x: 0, z: 0, w: 3.6, d: 5, label: 'LIVING' },
  { id: 'kitchen', x: 3.6, z: .1, w: 1.85, d: 1.9, label: 'KITCHEN' },
  { id: 'hall', x: 2.1, z: -2.5, w: 1.5, d: 2.5, label: 'HALL' },
  { id: 'bathroom', x: 0, z: -2.5, w: 2.1, d: 2.5, label: 'BATH' },
  { id: 'bedroom', x: 0, z: -6, w: 3.6, d: 3.5, label: 'BEDROOM' },
];
// The hallway has a standing point and a photograph, so it is drawn as a room, not as a quiet corridor.
export const planRooms: PlanRoom[] = sceneRooms.map(r => ({ id: r.id, x: reflectX(r.x + r.w), z: r.z, w: r.w, d: r.d, label: r.label }));
/** The outer walls' centre lines: kitchen wing to the far side of the living room, bedroom to the curtains. */
export const planBounds = { minX: reflectX(5.45), maxX: reflectX(0), minZ: -6, maxZ: 5 };
