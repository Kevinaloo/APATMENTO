/* ═══════════════════════════════════════════════════════════════════
   CABANA TOUR ENGINE · the contract
   ───────────────────────────────────────────────────────────────────
   One engine renders every Cabana 3D tour. A tour is data plus a scene
   builder (TourDefinition). The engine turns it into a running view
   (TourController). The UI shell talks only to the controller.

     src/tours/<slug>/index.ts   → export default definition: TourDefinition
     src/engine/index.ts         → export function createTour(host, def, cb): TourController
     src/ui/index.ts             → export function mountTourUI(root, def, createTour): void
     src/tours/<slug>/entry.ts   → mountTourUI(document.getElementById('root'), def, createTour)

   Coordinates: metres. +Y up. Floor at y = 0. Eye height 1.6 by default.
   All positions in this file are WORLD coordinates, i.e. after the
   tour's own orientation (several tours mirror X so the model matches
   the photos). Yaw 0 looks toward +Z; yaw increases counter-clockwise
   seen from above (same convention as the existing tours:
   yaw = atan2(dx, dz), camera.rotation.set(pitch, yaw + PI, 0, 'YXZ')).
   ═══════════════════════════════════════════════════════════════════ */
import type * as T from 'three';

export type Vec3 = [number, number, number];
export type Obstacle = { x1: number; x2: number; z1: number; z2: number };

/** A room the guest can visit. Order = guided tour order. */
export type TourRoom = {
  id: string;
  name: string;
  /** One short line, shown under the room name and as the guided-tour caption. */
  detail: string;
  /** Cover photograph id (see photoUrl). */
  image: number;
  /** Photograph ids that show this room. */
  photos: number[];
};

/** Rectangle on the floor plan, world coordinates. */
export type PlanRoom = { id: string; x: number; z: number; w: number; d: number; label: string; hall?: boolean };

export type Quality = 'high' | 'low';

/** What a tour's scene builder hands the engine. */
export type TourModel = {
  /** Parent of everything, ALREADY ORIENTED (root.scale / root.position set as the tour needs). */
  root: T.Group;
  /** Floors and furniture. Always visible. */
  contents: T.Group;
  /** Full-height walls and anything mounted on them. Hidden in dollhouse and plan. */
  walls: T.Group;
  /** Ceilings and ceiling fittings. Hidden in dollhouse and plan. */
  ceilings: T.Group;
  /** Knee-height wall stubs shown in dollhouse and plan instead of walls. */
  lowWalls: T.Group;
  /** Named materials. If `glow` exists it is the emissive lamp material the engine brightens at night. */
  materials: Record<string, T.Material>;
  /** Furniture and wall footprints, WORLD coordinates. */
  collisions: Obstacle[];
  /**
   * The builder must NOT merge geometry. The engine merges by (group, room, material)
   * so each room can be culled on its own. Meshes that must stay separate
   * (animated, transparent, mirrors) set mesh.userData.keep = true.
   */
};

export type TourDefinition = {
  slug: string;                     // 'kileleshwa-elegant' (folder under /tours)
  listing: {
    id: string;                     // Cabana listing UUID
    title: string;
    area: string;                   // 'Kileleshwa'
    city: string;                   // 'Nairobi'
    country: string;                // 'Kenya'
    lat: number;                    // from the listing row
    lng: number;
    tzOffsetHours: number;          // 3 for Nairobi
    guests: number;
    bedrooms: number;
    bathrooms: number;
    tagline: string;                // 'An elegant stay. A closer look.'
    description: string;            // 1–2 sentences for the welcome card
  };
  theme: {
    accent: string;                 // signature colour of this tour
    accentInk: string;              // text on accent
    night: string;                  // deep background for overlays
    paper: string;                  // light panel colour
    collection: string;             // 'THE KILELESHWA COLLECTION'
  };
  rooms: TourRoom[];
  /** Photos that are not rooms inside the unit (shared pool, gym …). */
  extraPhotos?: { id: string; name: string; detail: string; photos: { id: number; name: string }[] };
  photoUrl(id: number): string;     // absolute, '/tours/<slug>/photos/<id>.jpg'
  plan: { bounds: { minX: number; maxX: number; minZ: number; maxZ: number }; rooms: PlanRoom[] };
  /** Where to stand in each room, and what to look at. Key = room id. */
  views: Record<string, { position: Vec3; target: Vec3 }>;
  start: string;                    // room id the walk starts in
  /** Degrees clockwise from true north to world −Z. Used to place the real sun. Default 0. */
  northDeg?: number;
  /** Walkable floor test, world coordinates. */
  inside(x: number, z: number): boolean;
  /** Which room a point is in (a room id, or 'hall'). World coordinates. */
  roomAt(x: number, z: number): string;
  /** Build the scene. Called once. quality 'low' may reduce curve segments; must look the same. */
  build(manager: T.LoadingManager, quality: Quality): TourModel;
  /** Authored interior lighting. Positions in WORLD coordinates. */
  lights: {
    lamps: { position: Vec3; intensity: number }[];
    background: string;             // daylight background colour
    exposure?: number;              // default 1
    ambient?: number;               // default .5
    hemi?: number;                  // default 1
  };
  /** Optional mirror. Rendered by the engine with a budgeted Reflector. */
  mirror?: { shape: 'circle' | 'rect'; size: [number, number]; position: Vec3; rotationY: number; scaleY?: number; tint?: number };
  /** Honest limits shown in About. */
  accuracyNote: string;
};

/* ── What the engine gives the UI ────────────────────────────────── */
export type Mode = 'walk' | 'dollhouse' | 'plan';
export type Pose = { x: number; z: number; yaw: number; pitch: number; room: string };
export type Tier = 'ultra' | 'high' | 'balanced' | 'battery';
export type QualityState = { tier: Tier; auto: boolean; dpr: number; fps: number; ao: boolean };
export type Weather = { temp: number; label: string; cloud: number; rain: boolean; isDay: boolean };
export type LightState = {
  live: boolean;                    // following the real clock at the property
  date: string;                     // 'YYYY-MM-DD' at the property
  hour: number;                     // local decimal hour at the property, 0–24
  sun: { azimuthDeg: number; elevationDeg: number };
  weather: Weather | null;          // only for live, today
  playing: boolean;                 // day time-lapse running
};
export type SharedView = { room: string; x: number; z: number; yaw: number; pitch: number; mode: Mode; hour?: number; date?: string };

export type TourCallbacks = {
  /** 0..1 while the scene builds and shaders compile. */
  onLoad?(progress: number, label: string): void;
  onReady(): void;
  onPose(pose: Pose): void;          // throttled by the engine to ≤ 10 Hz
  onRoom(room: string): void;        // when the current room changes
  onMode(mode: Mode): void;
  onTour(state: { playing: boolean; index: number; progress: number }): void;
  onLight(state: LightState): void;
  onQuality?(state: QualityState): void;
  onHint?(text: string): void;       // short contextual help ("Tap the floor to walk there")
  onError(message: string): void;    // fatal: the UI falls back to photographs
};

export type TourController = {
  /* movement */
  goRoom(id: string): void;                       // walk there along a real path
  walkTo(x: number, z: number): boolean;          // false if unreachable
  move(x: number, z: number): void;               // analog: x strafe, z forward, −1..1, (0,0) stops
  look(dYaw: number, dPitch: number): void;       // radians
  setRun(on: boolean): void;
  setEyeHeight(metres: number): void;             // 1.0 .. 1.9
  setFov(deg: number): void;                      // 35 .. 80
  setPointerLock(on: boolean): void;              // desktop mouse-look
  setGyro(on: boolean): Promise<boolean>;         // phone look-by-moving; call inside a user gesture
  /* views */
  setMode(mode: Mode): void;
  setTour(playing: boolean): void;                // guided tour
  reset(): void;
  /* light */
  setLive(on: boolean): void;
  setDate(isoDate: string): void;
  setHour(hour: number): void;
  playDay(on: boolean): void;                     // sunrise → night time-lapse
  /* sound */
  setAmbience(on: boolean): void;                 // procedural neighbourhood sound, needs a user gesture
  /* quality */
  setQuality(tier: Tier | 'auto'): void;
  quality(): QualityState;
  /* share */
  getView(): SharedView;
  setView(view: SharedView): void;
  snapshot(): Promise<Blob | null>;               // postcard JPEG of the current view, branded
  /* lifecycle */
  setPaused(paused: boolean): void;
  dispose(): void;
};

export type CreateTour = (host: HTMLElement, def: TourDefinition, cb: TourCallbacks) => TourController;
