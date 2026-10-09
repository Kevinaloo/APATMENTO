/* Where a guest can stand, and how to get from here to there.

   A 12 cm occupancy grid over the floor plan, planned with breadth-first
   search and then "string-pulled" so the walk follows straight lines
   between the few corners that matter. Ported from the Kileleshwa viewer
   and made generic over the tour's walkable-floor test, its furniture and
   wall footprints, and its plan bounds. */
import type { Obstacle } from '../contract';
import { PLAYER_RADIUS } from './util';

export type Point = [number, number];

export type Navigation = {
  /** True when a guest of PLAYER_RADIUS cannot stand at (x, z). */
  blocked(x: number, z: number): boolean;
  /** Straight segment free of walls and furniture. */
  clear(ax: number, az: number, bx: number, bz: number): boolean;
  /** Straight segment that stays on walkable floor (walls block it, low furniture does not). */
  sightline(ax: number, az: number, bx: number, bz: number): boolean;
  /** Path from → to as corner points (from first, to last), or null when unreachable. */
  path(fx: number, fz: number, tx: number, tz: number): Point[] | null;
  /** The closest free spot within `radius` of (x, z) that can be walked to from it. */
  nearestFree(x: number, z: number, radius?: number): Point | null;
};

export function createNavigation(
  inside: (x: number, z: number) => boolean,
  collisions: Obstacle[],
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
): Navigation {
  const obstacles = collisions.slice();
  const r2 = PLAYER_RADIUS * PLAYER_RADIUS;

  function blocked(x: number, z: number) {
    if (!inside(x, z)) return true;
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      const px = x < o.x1 ? o.x1 : x > o.x2 ? o.x2 : x;
      const pz = z < o.z1 ? o.z1 : z > o.z2 ? o.z2 : z;
      const dx = x - px, dz = z - pz;
      if (dx * dx + dz * dz < r2) return true;
    }
    return false;
  }

  function clear(ax: number, az: number, bx: number, bz: number) {
    const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.045);
    for (let i = 0; i <= n; i++) {
      const t = n ? i / n : 0;
      if (blocked(ax + (bx - ax) * t, az + (bz - az) * t)) return false;
    }
    return true;
  }

  function sightline(ax: number, az: number, bx: number, bz: number) {
    const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.04);
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      if (!inside(ax + (bx - ax) * t, az + (bz - az) * t)) return false;
    }
    return true;
  }

  const step = 0.12;
  const minX = bounds.minX, minZ = bounds.minZ;
  const cols = Math.ceil((bounds.maxX - minX) / step) + 1;
  const rows = Math.ceil((bounds.maxZ - minZ) / step) + 1;
  const cellX = (i: number) => minX + (i % cols) * step;
  const cellZ = (i: number) => minZ + Math.floor(i / cols) * step;
  const cellAt = (x: number, z: number) =>
    Math.max(0, Math.min(rows - 1, Math.round((z - minZ) / step))) * cols + Math.max(0, Math.min(cols - 1, Math.round((x - minX) / step)));
  const free = new Uint8Array(cols * rows);
  for (let i = 0; i < free.length; i++) free[i] = blocked(cellX(i), cellZ(i)) ? 0 : 1;

  /* From a free point the way to the cell must be clear; from a blocked one
     (a click on the sofa, a shared view inside a footprint) it only has to
     stay on the floor, so a wall can never be "escaped" through. */
  function nearestCell(x: number, z: number, radius: number) {
    const reachable = blocked(x, z) ? sightline : clear;
    const at = cellAt(x, z);
    if (free[at] && reachable(x, z, cellX(at), cellZ(at))) return at;
    let best = -1, dist = Infinity;
    const reach = Math.ceil(radius / step) + 1;
    const c0 = at % cols, r0 = Math.floor(at / cols);
    for (let r = Math.max(0, r0 - reach); r <= Math.min(rows - 1, r0 + reach); r++) {
      for (let c = Math.max(0, c0 - reach); c <= Math.min(cols - 1, c0 + reach); c++) {
        const i = r * cols + c;
        if (!free[i]) continue;
        const d = Math.hypot(cellX(i) - x, cellZ(i) - z);
        if (d < dist && d < radius && reachable(x, z, cellX(i), cellZ(i))) { dist = d; best = i; }
      }
    }
    return best;
  }

  function path(fx: number, fz: number, tx: number, tz: number): Point[] | null {
    if (blocked(tx, tz)) return null;
    if (blocked(fx, fz)) {
      // Standing a hair inside a footprint (a shared view, a resized eye) must not strand the guest.
      const escape = nearestCell(fx, fz, 0.5);
      if (escape < 0) return null;
      fx = cellX(escape);
      fz = cellZ(escape);
    }
    if (clear(fx, fz, tx, tz)) return [[fx, fz], [tx, tz]];
    const start = nearestCell(fx, fz, 0.65), end = nearestCell(tx, tz, 0.65);
    if (start < 0 || end < 0) return null;
    const previous = new Int32Array(free.length).fill(-1);
    const queue = new Int32Array(free.length);
    let head = 0, tail = 0;
    queue[tail++] = start;
    previous[start] = start;
    while (head < tail && previous[end] === -1) {
      const k = queue[head++], col = k % cols, row = (k - col) / cols;
      if (col > 0 && free[k - 1] && previous[k - 1] === -1) { previous[k - 1] = k; queue[tail++] = k - 1; }
      if (col < cols - 1 && free[k + 1] && previous[k + 1] === -1) { previous[k + 1] = k; queue[tail++] = k + 1; }
      if (row > 0 && free[k - cols] && previous[k - cols] === -1) { previous[k - cols] = k; queue[tail++] = k - cols; }
      if (row < rows - 1 && free[k + cols] && previous[k + cols] === -1) { previous[k + cols] = k; queue[tail++] = k + cols; }
    }
    if (previous[end] === -1) return null;
    const raw: Point[] = [[tx, tz]];
    for (let at = end; at !== start; at = previous[at]) raw.push([cellX(at), cellZ(at)]);
    raw.push([cellX(start), cellZ(start)], [fx, fz]);
    raw.reverse();
    // Keep only the corners: from each anchor jump to the furthest point still in plain sight.
    const result: Point[] = [raw[0]];
    let anchor = 0;
    while (anchor < raw.length - 1) {
      let furthest = anchor + 1;
      for (let i = raw.length - 1; i > anchor + 1; i--) {
        if (clear(raw[anchor][0], raw[anchor][1], raw[i][0], raw[i][1])) { furthest = i; break; }
      }
      result.push(raw[furthest]);
      anchor = furthest;
    }
    return result;
  }

  function nearestFree(x: number, z: number, radius = 0.65): Point | null {
    if (!blocked(x, z)) return [x, z];
    const i = nearestCell(x, z, radius);
    return i < 0 ? null : [cellX(i), cellZ(i)];
  }

  return { blocked, clear, sightline, path, nearestFree };
}
