/* Engine test tour: a two-room flat built from boxes, for scripted engine
   checks while the real tours are ported. Like several real tours it is
   authored in its own coordinates and mirrored in X by the root, so merging,
   collisions and the mirror are exercised with a negative scale.
   Not shipped; the integrator removes this folder. */
import * as T from 'three';
import type { Obstacle, TourDefinition, TourModel, Vec3 } from '../../contract';

const W = 8.5, D = 4, H = 2.8, PART = 5;
const flip = (x: number) => W - x;

function woodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#c4a677';
  c.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 2) {
    c.strokeStyle = `rgba(70,45,20,${0.04 + ((x * 7919) % 13) / 100})`;
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x + Math.sin(x) * 3, 256); c.stroke();
  }
  c.strokeStyle = '#8f7a5c';
  for (let x = 0; x < 256; x += 64) c.strokeRect(x, 0, 64, 256);
  const t = new T.CanvasTexture(canvas);
  t.colorSpace = T.SRGBColorSpace;
  t.wrapS = t.wrapT = T.RepeatWrapping;
  return t;
}

function build(_manager: T.LoadingManager, quality: 'high' | 'low'): TourModel {
  const root = new T.Group(), contents = new T.Group(), walls = new T.Group(), ceilings = new T.Group(), lowWalls = new T.Group();
  root.add(contents, walls, ceilings, lowWalls);
  const seg = quality === 'low' ? 16 : 32;
  const m = {
    plaster: new T.MeshStandardMaterial({ color: '#e5e3db', roughness: 0.94 }),
    oak: new T.MeshStandardMaterial({ color: '#d8c39b', roughness: 0.5 }),
    floor: new T.MeshStandardMaterial({ map: woodTexture(), roughness: 0.55 }),
    cream: new T.MeshStandardMaterial({ color: '#c5beaf', roughness: 0.9 }),
    velvet: new T.MeshStandardMaterial({ color: '#1d2428', roughness: 0.85 }),
    black: new T.MeshStandardMaterial({ color: '#141919', roughness: 0.4 }),
    white: new T.MeshStandardMaterial({ color: '#efeee4', roughness: 0.35 }),
    gold: new T.MeshStandardMaterial({ color: '#cfad53', roughness: 0.26, metalness: 0.82 }),
    rug: new T.MeshStandardMaterial({ color: '#a39d90', roughness: 1 }),
    glass: new T.MeshPhysicalMaterial({ color: '#b8d2d0', transparent: true, opacity: 0.25, roughness: 0.1, depthWrite: false }),
    glow: new T.MeshStandardMaterial({ color: '#fff1cd', emissive: '#ffe3a2', emissiveIntensity: 2.2, roughness: 0.24 }),
  };
  const collisions: Obstacle[] = [];
  const box = (g: T.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, mat: T.Material) => {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    g.add(mesh);
    return mesh;
  };
  const cyl = (g: T.Object3D, r: number, h: number, x: number, y: number, z: number, mat: T.Material) => {
    const mesh = new T.Mesh(new T.CylinderGeometry(r, r, h, seg), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    g.add(mesh);
    return mesh;
  };
  const sphere = (g: T.Object3D, r: number, x: number, y: number, z: number, mat: T.Material) => {
    const mesh = new T.Mesh(new T.SphereGeometry(r, seg, Math.round(seg * 0.6)), mat);
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  };
  const obstacle = (x: number, z: number, w: number, d: number) => collisions.push({ x1: x - w / 2, x2: x + w / 2, z1: z - d / 2, z2: z + d / 2 });
  const wall = (x1: number, z1: number, x2: number, z2: number) => {
    const len = Math.hypot(x2 - x1, z2 - z1), x = (x1 + x2) / 2, z = (z1 + z2) / 2, a = -Math.atan2(z2 - z1, x2 - x1);
    box(walls, len + 0.1, H, 0.1, x, H / 2, z, m.plaster).rotation.y = a;
    box(lowWalls, len + 0.1, 0.2, 0.11, x, 0.1, z, m.plaster).rotation.y = a;
    collisions.push({ x1: Math.min(x1, x2) - 0.05, x2: Math.max(x1, x2) + 0.05, z1: Math.min(z1, z2) - 0.05, z2: Math.max(z1, z2) + 0.05 });
  };

  // Floors and ceilings, one per room.
  for (const [x0, x1] of [[0, PART], [PART, W]]) {
    const floor = new T.Mesh(new T.PlaneGeometry(x1 - x0, D), m.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((x0 + x1) / 2, 0.002, D / 2);
    floor.receiveShadow = true;
    contents.add(floor);
    box(ceilings, x1 - x0, 0.06, D, (x0 + x1) / 2, H + 0.03, D / 2, m.plaster);
  }
  // Shell, with a door in the partition.
  wall(0, 0, W, 0); wall(0, D, W, D); wall(0, 0, 0, D); wall(W, 0, W, D);
  wall(PART, 0, PART, 1.4); wall(PART, 2.4, PART, D);
  box(walls, 0.1, H - 2.1, 1.0, PART, 2.1 + (H - 2.1) / 2, 1.9, m.plaster);

  // Living room: sofa, coffee table, rug, dining for two, floor lamp, ceiling lamp.
  const sofa = new T.Group();
  sofa.position.set(1.6, 0, 3.45);
  contents.add(sofa);
  box(sofa, 2.2, 0.42, 0.9, 0, 0.21, 0, m.cream);
  box(sofa, 2.2, 0.5, 0.2, 0, 0.65, 0.35, m.cream);
  for (const s of [-1, 1]) box(sofa, 0.18, 0.6, 0.9, s * 1.1, 0.3, 0, m.cream);
  obstacle(1.6, 3.45, 2.4, 0.95);
  box(contents, 1.1, 0.06, 0.6, 1.6, 0.42, 2.35, m.oak);
  for (const [dx, dz] of [[-0.48, -0.24], [0.48, -0.24], [-0.48, 0.24], [0.48, 0.24]]) box(contents, 0.05, 0.4, 0.05, 1.6 + dx, 0.2, 2.35 + dz, m.black);
  obstacle(1.6, 2.35, 1.1, 0.6);
  box(contents, 2.6, 0.012, 1.8, 1.6, 0.008, 2.6, m.rug);
  box(contents, 1.2, 0.04, 0.8, 3.7, 0.74, 3.0, m.white);
  cyl(contents, 0.05, 0.72, 3.7, 0.36, 3.0, m.gold);
  obstacle(3.7, 3.0, 1.2, 0.8);
  for (const s of [-1, 1]) {
    box(contents, 0.44, 0.06, 0.44, 3.7, 0.46, 3.0 + s * 0.62, m.velvet);
    box(contents, 0.44, 0.45, 0.05, 3.7, 0.7, 3.0 + s * 0.82, m.velvet);
    obstacle(3.7, 3.0 + s * 0.62, 0.44, 0.44);
  }
  cyl(contents, 0.015, 1.4, 0.4, 0.7, 3.6, m.gold);
  sphere(contents, 0.17, 0.4, 1.5, 3.6, m.glow);
  obstacle(0.4, 3.6, 0.3, 0.3);
  sphere(ceilings, 0.22, 2.5, 2.5, 2.0, m.glow);
  cyl(ceilings, 0.01, 0.3, 2.5, 2.65, 2.0, m.black);
  box(walls, 0.05, 0.7, 1.25, 0.06, 1.5, 1.6, m.black);
  // A transparent vase that must stay its own mesh (userData.keep).
  const vase = cyl(contents, 0.08, 0.3, 3.7, 0.92, 3.0, m.glass);
  vase.castShadow = false;
  vase.userData.keep = true;

  // Bedroom: bed, side table with lamp, wardrobe, pendant.
  box(contents, 1.8, 0.45, 2.0, 7.3, 0.23, 2.4, m.white);
  box(contents, 1.7, 0.18, 1.9, 7.3, 0.54, 2.35, m.velvet);
  box(contents, 0.12, 1.1, 2.0, 8.3, 0.55, 2.4, m.oak);
  obstacle(7.3, 2.4, 1.85, 2.05);
  box(contents, 0.45, 0.5, 0.4, 8.1, 0.25, 0.95, m.oak);
  sphere(contents, 0.12, 8.1, 0.7, 0.95, m.glow);
  obstacle(8.1, 0.95, 0.45, 0.4);
  box(contents, 1.4, 2.2, 0.6, 6.2, 1.1, 0.35, m.oak);
  obstacle(6.2, 0.35, 1.4, 0.6);
  sphere(ceilings, 0.18, 6.75, 2.45, 2.2, m.glow);

  // Orient: the photos show this flat mirrored.
  root.scale.x = -1;
  root.position.x = W;
  for (const o of collisions) { const x1 = o.x1; o.x1 = flip(o.x2); o.x2 = flip(x1); }
  return { root, contents, walls, ceilings, lowWalls, materials: m, collisions };
}

const lamp = (x: number, y: number, z: number, intensity: number) => ({ position: [flip(x), y, z] as Vec3, intensity });
const view = (p: Vec3, t: Vec3) => ({ position: [flip(p[0]), p[1], p[2]] as Vec3, target: [flip(t[0]), t[1], t[2]] as Vec3 });

const def: TourDefinition = {
  slug: '_engine-test',
  listing: {
    id: '00000000-0000-0000-0000-000000000000', title: 'Engine test flat', area: 'Kileleshwa', city: 'Nairobi', country: 'Kenya',
    lat: -1.28535, lng: 36.77497, tzOffsetHours: 3, guests: 2, bedrooms: 1, bathrooms: 1,
    tagline: 'A box model for engine checks.', description: 'Two rooms, a few boxes of furniture.',
  },
  theme: { accent: '#c9a24a', accentInk: '#1c1a14', night: '#1d2420', paper: '#f6f2e8', collection: 'ENGINE TEST' },
  rooms: [
    { id: 'living', name: 'Living room', detail: 'Sofa, dining for two.', image: 1, photos: [1] },
    { id: 'bedroom', name: 'Bedroom', detail: 'Bed, wardrobe, mirror.', image: 2, photos: [2] },
  ],
  photoUrl: id => `/tours/_engine-test/photos/${id}.jpg`,
  plan: {
    bounds: { minX: 0, maxX: W, minZ: 0, maxZ: D },
    rooms: [
      { id: 'living', x: flip(PART), z: 0, w: PART, d: D, label: 'LIVING' },
      { id: 'bedroom', x: 0, z: 0, w: W - PART, d: D, label: 'BEDROOM' },
    ],
  },
  views: {
    living: view([4.2, 1.6, 0.8], [1.6, 1.0, 3.2]),
    bedroom: view([5.75, 1.6, 3.3], [7.4, 0.9, 2.2]),
  },
  start: 'living',
  inside(x, z) {
    const a = flip(x);
    return (a > 0.06 && a < PART - 0.06 && z > 0.06 && z < D - 0.06)
      || (a > PART + 0.06 && a < W - 0.06 && z > 0.06 && z < D - 0.06)
      || (a > PART - 0.1 && a < PART + 0.1 && z > 1.45 && z < 2.35);
  },
  roomAt: (x, _z) => (flip(x) < PART ? 'living' : 'bedroom'),
  build,
  lights: {
    lamps: [lamp(2.5, 2.4, 2.0, 14), lamp(0.4, 1.5, 3.6, 6), lamp(3.7, 2.3, 3.0, 8), lamp(6.75, 2.3, 2.2, 12), lamp(8.1, 0.9, 0.95, 4)],
    background: '#d7dbd5', exposure: 0.98, ambient: 0.46, hemi: 1.05,
  },
  mirror: { shape: 'circle', size: [0.6, 0.6], position: [flip(PART + 0.06), 1.55, 3.2], rotationY: -Math.PI / 2, scaleY: 1.3, tint: 0xcbd3c7 },
  accuracyNote: 'A test model, not a real apartment.',
};

export default def;
