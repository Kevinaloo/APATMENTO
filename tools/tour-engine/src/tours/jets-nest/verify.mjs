/* Checks the Jets Nest tour definition in Node, without a browser.

     node src/tours/jets-nest/verify.mjs      (from tools/tour-engine)

   1. Every room's standing point is walkable floor, clear of walls and
      furniture by the guest's radius (.16 m), and lies in its own room.
   2. A 12 cm grid search finds a walk between every pair of rooms, and the
      engine's own planner agrees.
   3. Faithfulness, when the old viewer's source is at hand (tools/jets-nest-source
      on disk, or from git history: see ../old-source.mjs): the scene is the
      old viewer's, part for part — same meshes in the same world positions,
      same materials, same collisions, standing points, lamps, mirror, plan
      and floor tests as its createApartment produced after orientation.
   4. The 'low' build has every part of the 'high' one, only with fewer facets.

   The scene builder paints its textures on canvases and loads photographs
   through an <img>; inert stand-ins replace both here. three itself runs
   fine in Node for geometry. */
import { build } from 'esbuild';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { oldSource } from '../old-source.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const engineRoot = join(here, '..', '..', '..');
const repo = join(engineRoot, '..', '..');
// The old viewer: on disk while it exists, otherwise unpacked from git history.
const source = oldSource(repo, 'jets-nest-source') ?? join(repo, 'tools', 'jets-nest-source');
const engineNav = join(engineRoot, 'src', 'engine', 'navigation.ts');
const RADIUS = 0.16, STEP = 0.12;

const context = new Proxy(
  { getImageData: (_x, _y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), createLinearGradient: () => ({ addColorStop() {} }) },
  { get: (o, key) => (key in o ? o[key] : () => {}) },
);
const requested = [];
globalThis.document = {
  createElement: () => ({ width: 0, height: 0, getContext: () => context }),
  createElementNS: () => ({ style: {}, addEventListener() {}, removeEventListener() {}, set src(url) { requested.push(url); } }),
};

/* One bundle, so the new tour, the old viewer and the engine share one three. */
const withOld = existsSync(join(source, 'lib', 'scene-model.ts'));
const withEngine = existsSync(engineNav);
const rel = p => JSON.stringify(p);
const entry = [
  `import * as T from 'three';`,
  `export { T };`,
  `export { default as def } from ${rel(join(here, 'index.ts'))};`,
  withEngine ? `export { createNavigation } from ${rel(engineNav)};` : `export const createNavigation = null;`,
  withOld ? [
    `import { buildApartment } from ${rel(join(source, 'lib', 'scene-model.ts'))};`,
    `import { furnishRooms } from ${rel(join(source, 'lib', 'scene-details.ts'))};`,
    `export { roomViews as oldViews, roomAt as oldRoomAt, insideApartment as oldInside } from ${rel(join(source, 'lib', 'apartment.ts'))};`,
    // The old createApartment's build, minus its merge, then its orientation step verbatim.
    `export function buildOld(manager) {`,
    `  const model = buildApartment(manager); furnishRooms(model);`,
    `  model.root.scale.x = -1; model.root.position.x = 3.6;`,
    `  for (const o of model.collisions) { const a = o.x1; o.x1 = 3.6 - o.x2; o.x2 = 3.6 - a; }`,
    `  return model;`,
    `}`,
  ].join('\n') : `export const buildOld = null;`,
].join('\n');

const tmp = mkdtempSync(join(tmpdir(), 'jets-nest-verify-'));
const out = join(tmp, 'bundle.mjs');
let mod;
try {
  await build({
    stdin: { contents: entry, resolveDir: here, loader: 'ts' },
    outfile: out, bundle: true, platform: 'node', format: 'esm', logLevel: 'error',
    nodePaths: [join(engineRoot, 'node_modules')],
  });
  mod = await import(pathToFileURL(out).href);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
const { T, def, createNavigation, buildOld } = mod;
let checks = 0;
const ok = (cond, message) => { assert.ok(cond, message); checks++; };

/* ── the scene ───────────────────────────────────────────────────── */
const high = def.build(new T.LoadingManager(), 'high');
const low = def.build(new T.LoadingManager(), 'low');
ok(high.root.scale.x === -1 && high.root.position.x === 3.6, 'root carries the X mirror');
ok(high.materials.glow && high.materials.glow.emissive, 'glow material is exposed for the night lamps');
let lights = 0;
high.root.traverse(o => { if (o.isLight) lights++; });
ok(lights === 0, 'the model contains no lights of its own');
const photoRequests = requested.filter(u => u.includes('/photos/'));
ok(photoRequests.length > 0 && photoRequests.every(u => /^\/tours\/jets-nest\/photos\/\d+\.jpg$/.test(u)), 'framed photographs load from the tour’s own photo folder');

function meshes(model) {
  const list = [];
  model.root.updateMatrixWorld(true);
  for (const [name, group] of [['contents', model.contents], ['walls', model.walls], ['ceilings', model.ceilings], ['lowWalls', model.lowWalls]]) {
    group.traverse(o => {
      if (!o.isMesh) return;
      const box = new T.Box3().setFromObject(o);
      list.push({ group: name, mesh: o, box, geometry: o.geometry.type });
    });
  }
  return list;
}
const materialKey = m => [m.type, m.color?.getHexString(), m.emissive?.getHexString(), m.emissiveIntensity, m.roughness, m.metalness, m.opacity, m.transparent, m.side, !!m.map, !!m.bumpMap, !!m.emissiveMap].join('|');
const near = (a, b, eps) => Math.abs(a - b) <= eps;
const boxNear = (a, b, eps) => ['x', 'y', 'z'].every(k => near(a.min[k], b.min[k], eps) && near(a.max[k], b.max[k], eps));
const newMeshes = meshes(high), lowMeshes = meshes(low);

ok(lowMeshes.length === newMeshes.length, `low build has every part (${lowMeshes.length} vs ${newMeshes.length})`);
let highVerts = 0, lowVerts = 0;
newMeshes.forEach((a, i) => {
  const b = lowMeshes[i];
  highVerts += a.mesh.geometry.attributes.position.count; lowVerts += b.mesh.geometry.attributes.position.count;
  ok(a.group === b.group && a.geometry === b.geometry && materialKey(a.mesh.material) === materialKey(b.mesh.material), `low part ${i} matches`);
  // Fewer facets pull a sphere's, torus's or lathe's extremes in by a few millimetres, never more.
  ok(boxNear(a.box, b.box, 0.02 * Math.max(1, a.box.getSize(new T.Vector3()).length())), `low part ${i} (${a.geometry}) stays in place`);
});
ok(lowVerts < highVerts * 0.8, `low build is lighter (${lowVerts} vs ${highVerts} vertices)`);
ok(JSON.stringify(low.collisions) === JSON.stringify(high.collisions), 'low build has the same collisions');
const glass = newMeshes.filter(m => m.mesh.material.transparent);
ok(glass.length > 0 && glass.every(m => m.mesh.userData.keep), 'transparent glass stays unmerged');
ok(newMeshes.every(m => m.mesh.receiveShadow), 'every surface receives shadows, as after the old merge');

/* ── the old viewer, part for part ───────────────────────────────── */
let faithful = 'skipped (tools/jets-nest-source not on disk or in git history)';
if (buildOld) {
  const old = buildOld(new T.LoadingManager());
  const oldMeshes = meshes(old);
  ok(oldMeshes.length === newMeshes.length, `same number of parts as the old viewer (${newMeshes.length} vs ${oldMeshes.length})`);
  oldMeshes.forEach((a, i) => {
    const b = newMeshes[i];
    ok(a.group === b.group && a.geometry === b.geometry, `part ${i} is the same kind of thing in the same group`);
    ok(boxNear(a.box, b.box, 1e-9), `part ${i} (${a.geometry}) is in the same world position`);
    ok(materialKey(a.mesh.material) === materialKey(b.mesh.material), `part ${i} has the same material`);
    ok(a.mesh.castShadow === b.mesh.castShadow, `part ${i} casts shadows as before`);
    ok(JSON.stringify(a.mesh.geometry.parameters) === JSON.stringify(b.mesh.geometry.parameters) || a.geometry === 'TubeGeometry', `part ${i} has the same geometry at high quality`);
  });
  ok(JSON.stringify(old.collisions) === JSON.stringify(high.collisions), 'collisions match the old viewer exactly');

  // The old viewer kept standing points in authored coordinates and mirrored them in setWalkPose.
  for (const [id, v] of Object.entries(mod.oldViews)) {
    const n = def.views[id];
    ok(n, `${id} keeps its standing point`);
    ok(n.position[0] === 3.6 - v.position[0] && n.position[1] === v.position[1] && n.position[2] === v.position[2], `${id} standing point matches`);
    ok(n.target[0] === 3.6 - v.target[0] && n.target[1] === v.target[1] && n.target[2] === v.target[2], `${id} look target matches`);
    // Same yaw and pitch as the old setWalkPose computed.
    const dx = -(v.target[0] - v.position[0]), dz = v.target[2] - v.position[2];
    const ndx = n.target[0] - n.position[0], ndz = n.target[2] - n.position[2];
    ok(near(Math.atan2(dx, dz), Math.atan2(ndx, ndz), 1e-12), `${id} faces the same way`);
  }
  ok(Object.keys(mod.oldViews).length === Object.keys(def.views).length, 'no standing point invented');
  for (let x = -2.5; x <= 4.5; x += 0.05) for (let z = -6.5; z <= 5.5; z += 0.05) {
    if (def.inside(x, z) !== mod.oldInside(x, z) || def.roomAt(x, z) !== mod.oldRoomAt(x, z)) assert.fail(`floor test differs at ${x.toFixed(2)}, ${z.toFixed(2)}`);
  }
  checks++;

  // Lamps, mirror and minimap lived inline in the old viewer; read them from its source.
  const apartment = readFileSync(join(source, 'lib', 'apartment.ts'), 'utf8');
  const num = s => JSON.parse(s.replace(/(?<![\d])\./g, '0.').replace(/-0\./g, '-0.'));
  const lampSource = num(apartment.match(/for\(const \[x,y,z,power\] of (\[\[.*?\]\])\)/)[1]);
  ok(lampSource.length === def.lights.lamps.length, 'same number of lamps');
  lampSource.forEach(([x, y, z, power], i) => {
    const l = def.lights.lamps[i];
    ok(l.position[0] === 3.6 - x && l.position[1] === y && l.position[2] === z && l.intensity === power, `lamp ${i} matches`);
  });
  const m = apartment.match(/new Reflector\(new T\.PlaneGeometry\(([\d.]+),([\d.]+)\),\{[^}]*color:(0x[0-9a-f]+)[^}]*\}\);mirror\.position\.set\(([-\d.]+),([-\d.]+),([-\d.]+)\);mirror\.rotation\.y=Math\.PI\/2;/);
  const [, w, h, tint, mx, my, mz] = m.map(Number);
  const mirror = def.mirror;
  ok(mirror.shape === 'rect' && mirror.size[0] === w && mirror.size[1] === h, 'mirror size matches');
  // The old Reflector was added straight to the scene, so its position was already in world coordinates.
  // The one deliberate change: the old mirror sat 5 mm behind its frame's face (x .106) and never showed.
  ok(Math.abs(mirror.position[0] - (mx + 0.008)) < 1e-9 && mirror.position[0] > 0.106 && mirror.position[1] === my && mirror.position[2] === mz, 'mirror position matches, moved proud of its frame');
  ok(mirror.rotationY === Math.PI / 2 && mirror.tint === tint && !mirror.scaleY, 'mirror orientation and tint match');
  ok(apartment.includes('scene.background=new T.Color("#263b30")') && def.lights.background === '#263b30', 'daylight background matches');
  ok(apartment.includes('toneMappingExposure=1.04') && def.lights.exposure === 1.04, 'exposure matches');
  ok(apartment.includes('AmbientLight("#fff5df",.62)') && def.lights.ambient === 0.62, 'ambient matches');
  ok(apartment.includes('HemisphereLight("#e9f5ff","#64745e",1.15)') && def.lights.hemi === 1.15, 'hemisphere matches');

  // The minimap drew authored rectangles under a translate(3.6) scale(-1, 1) flip.
  const page = readFileSync(join(source, 'app', 'page.tsx'), 'utf8');
  const rects = [...page.matchAll(/<rect x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)" fill=\{room==="(\w+)"/g)];
  ok(rects.length === def.plan.rooms.length, 'same rooms on the plan');
  for (const [, x, y, w, h, id] of rects) {
    const r = def.plan.rooms.find(p => p.id === id);
    ok(r && near(r.x, 3.6 - (+x + +w), 1e-12) && r.z === +y && r.w === +w && r.d === +h, `plan room ${id} matches`);
  }
  const oldRooms = page.match(/const rooms = (\[[\s\S]*?\]);/)[1];
  for (const r of def.rooms) {
    const line = oldRooms.split('\n').find(l => l.includes(`id:"${r.id}"`));
    ok(line && line.includes(`name:"${r.name}"`) && line.includes(`detail:"${r.detail}"`) && line.includes(`image:${r.image},`) && line.includes(`photos:[${r.photos.join(',')}]`), `room ${r.id} keeps its name, line and photographs`);
  }
  faithful = `${oldMeshes.length} parts, ${old.collisions.length} collisions, ${lampSource.length} lamps, mirror, plan, rooms and floor tests identical`;
}

/* ── standing points ─────────────────────────────────────────────── */
const collisions = high.collisions;
const blocked = (x, z) => !def.inside(x, z) || collisions.some(o => {
  const px = Math.max(o.x1, Math.min(x, o.x2)), pz = Math.max(o.z1, Math.min(z, o.z2));
  return (x - px) ** 2 + (z - pz) ** 2 < RADIUS * RADIUS;
});
const ids = def.rooms.map(r => r.id);
ok(def.views[def.start], 'start room has a view');
const all = new Set();
for (const id of ids) {
  const v = def.views[id];
  ok(v, `${id} has a view`);
  const [x, , z] = v.position;
  ok(def.inside(x, z), `${id} view is on the floor`);
  ok(!blocked(x, z), `${id} view is clear of walls and furniture by ${RADIUS} m`);
  ok(def.roomAt(x, z) === id, `${id} view stands in its own room (roomAt says ${def.roomAt(x, z)})`);
  const b = def.plan.bounds;
  ok(x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ, `${id} view is inside the plan`);
  const p = def.plan.rooms.find(r => r.id === id);
  ok(p && x > p.x && x < p.x + p.w && z > p.z && z < p.z + p.d, `${id} view is inside its plan rectangle`);
  const room = def.rooms.find(r => r.id === id);
  for (const photo of new Set([room.image, ...room.photos])) {
    all.add(photo);
    ok(existsSync(join(repo, 'tours', def.slug, 'photos', `${photo}.jpg`)), `photo ${photo} exists`);
  }
}
ok(all.size === 17, `all 17 listing photographs are reachable from a room (${all.size})`);

/* ── room-to-room walks on a 12 cm grid ──────────────────────────── */
const { minX, maxX, minZ, maxZ } = def.plan.bounds;
const cols = Math.ceil((maxX - minX) / STEP) + 1, rows = Math.ceil((maxZ - minZ) / STEP) + 1;
const at = i => [minX + (i % cols) * STEP, minZ + Math.floor(i / cols) * STEP];
const free = new Uint8Array(cols * rows);
for (let i = 0; i < free.length; i++) free[i] = blocked(...at(i)) ? 0 : 1;
const clear = (a, b) => {
  const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.045);
  for (let i = 0; i <= n; i++) { const t = n ? i / n : 0; if (blocked(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) return false; }
  return true;
};
function snap(p) {
  let best = -1, dist = Infinity;
  for (let i = 0; i < free.length; i++) {
    if (!free[i]) continue;
    const q = at(i), d = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (d < dist && d < 0.65 && clear(p, q)) { dist = d; best = i; }
  }
  return best;
}
function walk(from, to) {
  const start = snap(from), end = snap(to);
  if (start < 0 || end < 0) return null;
  const prev = new Int32Array(free.length).fill(-1), queue = [start];
  prev[start] = start;
  for (let q = 0; q < queue.length && prev[end] === -1; q++) {
    const k = queue[q], c = k % cols, r = Math.floor(k / cols);
    for (const n of [c > 0 ? k - 1 : -1, c < cols - 1 ? k + 1 : -1, r > 0 ? k - cols : -1, r < rows - 1 ? k + cols : -1]) {
      if (n >= 0 && free[n] && prev[n] === -1) { prev[n] = k; queue.push(n); }
    }
  }
  if (prev[end] === -1) return null;
  let cells = 0;
  for (let k = end; k !== start; k = prev[k]) cells++;
  return cells * STEP;
}
const nav = createNavigation ? createNavigation(def.inside, collisions, def.plan.bounds) : null;
let pairs = 0, longest = 0;
for (const a of ids) for (const b of ids) {
  if (a === b) continue;
  const pa = def.views[a].position, pb = def.views[b].position;
  const length = walk([pa[0], pa[2]], [pb[0], pb[2]]);
  ok(length != null, `grid walk ${a} → ${b}`);
  longest = Math.max(longest, length);
  if (nav) {
    const path = nav.path(pa[0], pa[2], pb[0], pb[2]);
    ok(path && path.length >= 2, `engine planner finds ${a} → ${b}`);
    for (let i = 1; i < path.length; i++) ok(clear(path[i - 1], path[i]), `engine path ${a} → ${b} leg ${i} is clear`);
  }
  pairs++;
}
// The planner must still refuse what the old checks refused: outside, a sofa, the bed, the coffee table.
const W = x => 3.6 - x;
ok(blocked(W(-.5), 2) && blocked(W(.52), 2.76) && blocked(W(2.08), -4.76) && blocked(W(1.93), 2.6), 'outside floor, sofa, bed and coffee table block movement');

console.log(`PASS jets-nest: ${checks} checks`);
console.log(`  views     ${ids.length} standing points walkable (radius ${RADIUS} m), each in its own room`);
console.log(`  paths     ${pairs} room-to-room grid walks (longest ${longest.toFixed(1)} m)${nav ? ', engine planner agrees' : ', engine planner not found'}`);
console.log(`  faithful  ${faithful}`);
console.log(`  low       ${lowMeshes.length} parts, same collisions, ${lowVerts} vs ${highVerts} vertices; ${glass.length} glass meshes kept unmerged`);
