/* Shikaz Homes as data: where to stand in each room, the walkable floor,
   which room a point is in, and the floor plan.

   The old viewer never mirrored or moved its model, so its authored
   coordinates are the world coordinates the engine expects; nothing here
   needs converting. */
import type { PlanRoom, Vec3 } from '../../contract';
import { zones } from './scene-model';

// Authored standing points: each frames the room the way its listing photograph does.
export const roomViews: Record<string, { position: Vec3; target: Vec3 }> = {
  living: { position: [1.14, 1.58, 4.05], target: [2.45, 1.0, 1.05] },
  dining: { position: [1.20, 1.58, 5.26], target: [3.21, .95, 4.94] },
  kitchen: { position: [1.73, 1.58, 7.12], target: [2.91, 1.0, 6.25] },
  hall: { position: [-.65, 1.58, 3.83], target: [-.66, 1.02, 5.59] },
  bedroom2: { position: [-2.03, 1.58, 3.05], target: [-3.64, 1.0, 1.53] },
  bedroom: { position: [-.91, 1.58, 7.85], target: [-2.8, 1.05, 8.95] },
  shower: { position: [-1.99, 1.58, 4.24], target: [-3.52, 1.5, 4.24] },
  toilet: { position: [-1.99, 1.58, 5.58], target: [-3.26, 1.0, 5.65] },
};

/** Which room a point is in. The entry is a passage, not a stop on the tour: it counts as the hallway, as the old viewer showed it. */
export function roomAt(x: number, z: number) {
  const id = zones.find(r => x >= r.x && x <= r.x + r.w && z >= r.z && z <= r.z + r.d)?.id || 'hall';
  return id === 'entry' ? 'hall' : id;
}

/** Walkable floor: the room rectangles, a hair wider so doorways join them. Walls and furniture are collisions. */
export function insideApartment(x: number, z: number) {
  return zones.some(r => x > r.x - .025 && x < r.x + r.w + .025 && z > r.z - .025 && z < r.z + r.d + .025);
}

/* The old viewer's minimap rectangles (proportions estimated from the photographs and the walkthrough video).
   It drew the entry in the hallway's colour; here it is its own quiet passage, so the hallway is one room. */
export const planRooms: PlanRoom[] = [
  { id: 'living', x: 0, z: 0, w: 4.2, d: 4.25, label: 'LIVING' },
  { id: 'dining', x: 0, z: 4.25, w: 4.2, d: 1.55, label: 'DINING' },
  { id: 'kitchen', x: 1.3, z: 5.8, w: 2.9, d: 2.7, label: 'KITCHEN' },
  { id: 'entry', x: 0, z: 5.8, w: 1.3, d: 2.7, label: 'ENTRY', hall: true },
  { id: 'hall', x: -1.55, z: 2.5, w: 1.55, d: 4.2, label: 'HALL' },
  { id: 'bedroom2', x: -4.85, z: .25, w: 3.3, d: 3.3, label: 'BEDROOM 2' },
  { id: 'shower', x: -3.65, z: 3.55, w: 2.1, d: 1.35, label: 'SHOWER' },
  { id: 'toilet', x: -3.65, z: 4.9, w: 2.1, d: 1.5, label: 'TOILET' },
  { id: 'bedroom', x: -4.85, z: 6.7, w: 4.85, d: 3.65, label: 'MAIN BEDROOM' },
];
/** The outer walls' centre lines: the bedrooms' far wall to the lounge's, the lounge window to the main bedroom's headboard wall. */
export const planBounds = { minX: -4.85, maxX: 4.2, minZ: 0, maxZ: 10.35 };
