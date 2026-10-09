/* ═══════════════════════════════════════════════════════════════════
   CABANA TOUR ENGINE
   ───────────────────────────────────────────────────────────────────
   createTour(host, def, cb) turns a TourDefinition into a running 3D
   view and returns the controller the UI talks to (see ../contract).

   Performance is the design brief. In order of impact:
     · render on demand: no frame is drawn unless something changed, and
       the loop itself stops when nothing is animating;
     · moving frames go straight to the canvas at the governed pixel ratio;
       ambient occlusion is computed once when the view settles and faded
       in by re-compositing (refine.ts);
     · the scene is merged per room so each room culls on its own;
     · a fixed light rig (3 lamp proxies) so nothing ever recompiles;
     · shadows re-render only when the sun moves;
     · the mirror re-renders on a budget;
     · every shader and buffer is compiled and uploaded before onReady, so
       the first step forward never stalls.
   ═══════════════════════════════════════════════════════════════════ */
import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type {
  CreateTour, LightState, Mode, QualityState, SharedView, Tier, TourCallbacks, TourController,
  TourDefinition, TourModel, Weather, Quality,
} from '../contract';
import { Ambience } from './ambience';
import { Flight } from './flight';
import { Footprint } from './footprint';
import { Input, type InputSink, type Intents } from './input';
import { LightRig } from './lighting';
import { mergeByRoom } from './merge';
import { BudgetMirror } from './mirror';
import { createNavigation, type Navigation } from './navigation';
import { Governor } from './quality';
import { Refiner } from './refine';
import { renderPostcard } from './snapshot';
import { julianDay, solarPosition, type SunPosition } from './sun';
import { clamp, isLocalHost, nextTask, smoothstep } from './util';
import { PITCH_LIMIT, Walker, type Journey } from './walker';
import { fetchWeather } from './weather';

const STILL_MS = 180;
const AO_FADE_MS = 200;
/** Edge of the occlusion buffers while warming up shaders: big enough to run every pass, small enough to be free. */
const WARM_SIZE = 128;
const DAY_START = 5.5, DAY_END = 22, DAY_SECONDS = 24;
const FOV_MIN = 35, FOV_MAX = 80;
const DOLLHOUSE_FOV = 45, PLAN_FOV = 40;
/** Share of the canvas height the shell's glass covers in plan: title and mode switch above, room strip below. */
const PLAN_INSET_TOP = 0.12, PLAN_INSET_BOTTOM = 0.21;
const UNREACHABLE = 'That spot can’t be reached from here';

export const createTour: CreateTour = (host, def, cb) => {
  let renderer: T.WebGLRenderer;
  try {
    renderer = new T.WebGLRenderer({ antialias: true, alpha: false, stencil: false, powerPreference: 'high-performance' });
  } catch {
    setTimeout(() => cb.onError('This device could not start the 3D view. The original photographs are all here.'));
    return inertController(def);
  }
  return startTour(host, def, cb, renderer);
};

function startTour(host: HTMLElement, def: TourDefinition, cb: TourCallbacks, renderer: T.WebGLRenderer): TourController {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = motionQuery.matches;
  const local = isLocalHost();
  const tz = def.listing.tzOffsetHours;
  const northDeg = def.northDeg ?? 0;

  /* ── lifecycle state ───────────────────────────────────────────── */
  let disposed = false, failed = false, ready = false, announced = false, paused = false, hidden = document.hidden;
  let raf = 0, inFrame = false, continuous = false, lastFrame = 0, frameNo = 0, prevRendered = false, prevRenderAt = 0;
  let dirty = true, lastChange = 0, shadowsDirty = true, lastShadowAt = 0, lastLightChange = 0, lampsMoving = false;
  let refine: 'idle' | 'pending' | 'fading' = 'idle', fadeStart = 0, fadeK = 0;
  const stats = { calls: 0, triangles: 0 };

  /* ── renderer, scene, cameras ──────────────────────────────────── */
  const governor = new Governor(window.devicePixelRatio || 1, coarse);
  const canvas = renderer.domElement;
  renderer.setPixelRatio(governor.dpr);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = def.lights.exposure ?? 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.info.autoReset = false;
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent';
  canvas.className = 'tour-canvas';
  installFocusStyle(def.theme.accent);
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'application');
  canvas.setAttribute('aria-roledescription', '3D tour');
  canvas.setAttribute('aria-label', `${def.listing.title}, 3D view. Move with W A S D or the arrow keys, turn with Q and E, drag to look, click the floor to walk there.`);
  host.appendChild(canvas);

  let width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
  renderer.setSize(width, height, false);
  const scene = new T.Scene();
  scene.matrixWorldAutoUpdate = true;
  let walkFov = width / height < 0.8 ? 70 : 62;
  const persp = new T.PerspectiveCamera(walkFov, width / height, 0.05, 80);
  persp.rotation.order = 'YXZ';
  const ortho = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  ortho.up.set(0, 0, -1);
  let active: T.PerspectiveCamera | T.OrthographicCamera = persp;

  const b = def.plan.bounds;
  const centreX = (b.minX + b.maxX) / 2, centreZ = (b.minZ + b.maxZ) / 2;
  const halfDiagonal = Math.hypot(b.maxX - b.minX, b.maxZ - b.minZ) / 2;

  const orbit = new OrbitControls(persp, canvas);
  orbit.enabled = false;
  orbit.enableDamping = !reduced;
  orbit.dampingFactor = 0.085;
  orbit.rotateSpeed = 0.75;
  orbit.minPolarAngle = 0.12;
  orbit.maxPolarAngle = Math.PI / 2 - 0.1;
  orbit.screenSpacePanning = true;
  const planOrbit = new OrbitControls(ortho, canvas);
  planOrbit.enabled = false;
  planOrbit.enableRotate = false;
  planOrbit.enableDamping = false;
  planOrbit.minZoom = 0.8;
  planOrbit.maxZoom = 4;
  planOrbit.screenSpacePanning = true;
  const onOrbitChange = () => { if (!flight.active) markDirty(); };
  orbit.addEventListener('change', onOrbitChange);
  planOrbit.addEventListener('change', onOrbitChange);
  orbit.addEventListener('start', wakeForOrbit);
  planOrbit.addEventListener('start', wakeForOrbit);

  /* ── world (built in boot) ─────────────────────────────────────── */
  let model: TourModel | null = null;
  let nav: Navigation | null = null;
  let rig: LightRig | null = null;
  let mirror: BudgetMirror | null = null;
  let refiner: Refiner | null = null;
  let envTarget: T.WebGLRenderTarget | null = null;
  let ceilingY = 2.6;

  /* ── guest, modes, tour ────────────────────────────────────────── */
  const walker = new Walker();
  const saved = { x: 0, z: 0, yaw: 0, pitch: 0 };
  let mode: Mode = 'walk';
  let landing: Mode | null = null;
  let wallsShown = true;
  const flight = new Flight();
  const tour = { playing: false, index: 0, phase: 'walk' as 'walk' | 'dwell', dwell: 0, baseYaw: 0, progress: 0, dirty: false, lastAt: 0 };
  let room = def.start;
  let poseDirty = true, lastPoseAt = 0;
  let instantLamps = true;
  const intents: Intents = { strafe: 0, forward: 0, turn: 0, pitch: 0, run: false };
  const gyro = { yaw: 0, pitch: 0 };
  const pending: { view?: SharedView; mode?: Mode; room?: string; tour?: boolean } = {};

  /* ── light ─────────────────────────────────────────────────────── */
  const sunPos: SunPosition = { azimuthDeg: 0, elevationDeg: 0 };
  const light = { live: false, date: propertyDate(), hour: 10.5, jd0: 0, weather: null as Weather | null, playing: false };
  light.jd0 = julianDay(light.date);
  let lightDirty = true, lastLightAt = 0, lastSoundAt = 0;
  let liveTimer = 0, weatherTimer = 0;
  let weatherAbort: AbortController | null = null;
  const ambience = new Ambience();
  let ambienceOn = false;

  /* ── overlays and input ────────────────────────────────────────── */
  const footprint = new Footprint(host, def.theme.accent);
  const raycaster = new T.Raycaster();
  const ndc = new T.Vector2();
  const floorPlane = new T.Plane(new T.Vector3(0, 1, 0), 0);
  const hit = new T.Vector3();
  const v1 = new T.Vector3(), v2 = new T.Vector3();
  /** Mouse position for the cursor ring; `quiet` hides it during a click-walk until the mouse moves again. */
  const hover = { on: false, x: 0, y: 0, quiet: false };

  const sink: InputSink = {
    ready: () => ready && !failed,
    paused: () => paused,
    mode: () => (flight.active ? (landing ?? mode) : mode),
    look(dYaw, dPitch) {
      if (mode !== 'walk' || flight.active) return;
      walker.yaw += dYaw;
      walker.pitch = clamp(walker.pitch + dPitch, -PITCH_LIMIT, PITCH_LIMIT);
      tookGaze();
      markDirty();
    },
    fov: () => walkFov,
    setFov: deg => api.setFov(deg),
    hover: (x, y) => { hover.on = true; hover.quiet = false; hover.x = x; hover.y = y; updateHover(); },
    hoverEnd: () => { hover.on = false; footprint.cursor.show(false); canvas.style.cursor = ''; },
    tap,
    dragStart: () => { footprint.cursor.show(false); tookGaze(); },
    manual: () => { stopTourByGuest(); walker.cancelJourney(); footprint.target.show(false); },
    wake,
    lockChanged(locked) {
      cb.onHint?.(locked ? 'Mouse look on · press Esc to release' : 'Mouse look off');
      hover.on = false;
      footprint.cursor.show(false);
      if (locked) markDirty();
    },
    nextRoom() {
      const order = def.rooms.map(r => r.id);
      const at = order.indexOf(currentRoom());
      api.goRoom(order[(at + 1) % order.length]);
    },
  };
  const input = new Input(canvas, sink);

  /* ── frame loop ────────────────────────────────────────────────── */

  /** Start the loop if it is asleep. Inside a frame the end-of-frame check decides instead, so a frame is never queued twice. */
  function wake() {
    if (raf || inFrame || !ready || disposed || failed || hidden) return;
    continuous = false;
    raf = requestAnimationFrame(frame);
  }
  function wakeForOrbit() { wake(); }
  function markDirty() { dirty = true; wake(); }

  function frame(now: number) {
    raf = 0;
    if (disposed || failed || hidden) return;
    inFrame = true;
    try {
      step(now);
    } catch (err) {
      if (local) console.error(err);
      fail('The 3D view stopped unexpectedly. Reopen the tour, or browse the original photographs.');
    } finally {
      inFrame = false;
    }
  }

  function step(now: number) {
    // Real elapsed time when the loop ran on from the previous frame (however slow the device);
    // one nominal frame after waking from idle, so a long sleep is not replayed as one huge step.
    const consecutive = continuous;
    const dt = consecutive ? Math.min(0.1, Math.max(0, now - lastFrame) / 1000) : 1 / 60;
    lastFrame = now;
    frameNo++;
    const t0 = performance.now();
    let moved = false;

    if (ready) {
      if (!paused) {
        input.pollGamepad();
        if (input.gyroDelta(gyro) && mode === 'walk' && !flight.active) {
          walker.yaw += gyro.yaw;
          walker.pitch = clamp(walker.pitch + gyro.pitch, -PITCH_LIMIT, PITCH_LIMIT);
          moved = true;
        }
        if (flight.active) {
          const landed = flight.step(dt, persp);
          moved = true;
          if (landing === 'walk' && !wallsShown && persp.position.y < ceilingY - 0.05) setWalls(true);
          if (landed) land();
        } else if (mode === 'walk') {
          input.read(intents);
          if (walker.step(dt, intents, nav!, reduced)) moved = true;
          if (walker.arrived) arrive(walker.arrived);
          if (stepTour(dt)) moved = true;
        } else if (mode === 'dollhouse') {
          if (orbit.update()) moved = true;
          clampOrbitTarget();
        } else if (planOrbit.update()) moved = true;
        if (light.playing) stepDay(dt, now);
      }
      if (moved) afterMove();
      const viewer = mode === 'walk' && !flight.active ? persp.position : null;
      lampsMoving = rig!.lamps.update(dt, viewer, instantLamps || reduced);
      if (lampsMoving) {
        rig!.compensate(rig!.lamps.coverage(), mode !== 'walk');
        dirty = true;
      }
      instantLamps = false;
      // A shadow update deferred by the 10 Hz throttle still has to land.
      if (shadowsDirty && now - lastShadowAt >= 100) dirty = true;
    }
    if (moved) dirty = true;

    let rendered = false;
    if (dirty && ready) {
      renderMoving(now);
      rendered = true;
      dirty = false;
      lastChange = now;
      refine = 'pending';
      if (!announced) { announced = true; cb.onReady(); }
    } else if (refine !== 'idle' && ready) refineStep(now);

    if (rendered) {
      if (prevRendered && consecutive && governor.sample(now, now - prevRenderAt, performance.now() - t0)) applyTier();
      prevRenderAt = now;
      if (governor.auto && frameNo % 60 === 0) reportQuality();
    }
    prevRendered = rendered;

    reportPose(now, false);
    reportTour(now, false);
    reportLight(now, false);

    const busy = dirty || refine !== 'idle' || flight.active || (mode === 'walk' && walker.busy) || tour.playing
      || light.playing || input.active || lampsMoving || shadowsDirty;
    if (busy && !(paused && !dirty && refine === 'idle' && !flight.active)) {
      continuous = true;
      raf = requestAnimationFrame(frame);
    } else {
      // Going idle: make sure the UI has the final state.
      reportPose(now, true);
      reportTour(now, true);
      reportLight(now, true);
    }
  }

  function afterMove() {
    if (mode === 'walk' && !flight.active) {
      walker.apply(persp);
      poseDirty = true;
      const r = def.roomAt(walker.x, walker.z);
      if (r !== room) { room = r; cb.onRoom(r); }
    }
    if (footprint.visible || hover.on) {
      if ((hover.on && !hover.quiet) || input.locked) updateHover();
      footprint.update(active, width, height);
    }
  }

  function setDpr(dpr: number) {
    if (Math.abs(renderer.getPixelRatio() - dpr) > 1e-3) renderer.setPixelRatio(dpr);
  }

  function renderMoving(now: number) {
    const spec = governor.spec;
    setDpr(governor.auto ? Math.min(governor.dpr, spec.dpr) : spec.dpr);
    const scrubbing = light.playing || now - lastLightChange < 120;
    if (shadowsDirty && (!scrubbing || now - lastShadowAt >= 100)) {
      // During a time-lapse (or a scrub of the hour) the sun moves every frame; its shadows follow at 10 Hz.
      renderer.shadowMap.needsUpdate = true;
      shadowsDirty = false;
      lastShadowAt = now;
    }
    renderer.setRenderTarget(null);
    renderer.setClearColor(rig!.background, 1);
    renderer.info.reset();
    mirror?.arm(active, true, frameNo);
    renderer.render(scene, active);
    mirror?.disarm();
    stats.calls = renderer.info.render.calls;
    stats.triangles = renderer.info.render.triangles;
  }

  /** Still for STILL_MS: draw once at full tier resolution, with occlusion where the tier has it, then fade it in. */
  function refineStep(now: number) {
    if (refine === 'pending') {
      if (now - lastChange < STILL_MS) return;
      const spec = governor.spec;
      const ao = spec.ao && mode !== 'plan' && !flight.active;
      if (ao) {
        setDpr(spec.dpr);
        ensureRefiner();
        if (shadowsDirty) { renderer.shadowMap.needsUpdate = true; shadowsDirty = false; }
        refiner!.renderScene(renderer, active, () => mirror?.arm(active, false, frameNo), () => mirror?.disarm());
        fadeK = reduced ? 1 : 0.25;
        refiner!.composite(renderer, fadeK, rig!.background, null);
        fadeStart = now;
        refine = fadeK >= 1 ? 'idle' : 'fading';
      } else {
        if (Math.abs(renderer.getPixelRatio() - spec.dpr) > 1e-3) {
          setDpr(spec.dpr);
          renderer.setRenderTarget(null);
          renderer.setClearColor(rig!.background, 1);
          mirror?.arm(active, false, frameNo);
          renderer.render(scene, active);
          mirror?.disarm();
        }
        refine = 'idle';
      }
      return;
    }
    if (!refiner) { refine = 'idle'; return; }
    const k = Math.min(1, 0.25 + 0.75 * (now - fadeStart) / AO_FADE_MS);
    if (k - fadeK >= 0.18 || k >= 1) {
      fadeK = k;
      refiner!.composite(renderer, k, rig!.background, null);
    }
    if (k >= 1) refine = 'idle';
  }

  function ensureRefiner() {
    const spec = governor.spec;
    const w = Math.floor(width * spec.dpr), h = Math.floor(height * spec.dpr);
    if (!refiner) refiner = new Refiner(scene, persp, w, h, { samples: 2, ao: true });
    else if (refiner.target.width !== w || refiner.target.height !== h) refiner.setSize(w, h);
  }

  /* ── quality ───────────────────────────────────────────────────── */

  function applyTier() {
    const spec = governor.spec;
    if (rig) { rig.setShadowSize(spec.shadow); shadowsDirty = true; }
    mirror?.setResolution(spec.mirror);
    // Below the AO tiers keep the (tiny) refiner so its compiled programs survive for the next step up.
    if (!spec.ao && refiner) refiner.setSize(WARM_SIZE, WARM_SIZE);
    else if (refiner) ensureRefiner();
    reportQuality();
    markDirty();
  }

  function qualityState(): QualityState {
    const spec = governor.spec;
    return {
      tier: governor.tier, auto: governor.auto,
      dpr: governor.auto ? Math.min(governor.dpr, spec.dpr) : spec.dpr,
      fps: Math.round(1000 / Math.max(1, governor.frameMs)), ao: spec.ao,
    };
  }
  function reportQuality() { cb.onQuality?.(qualityState()); }

  /* ── walls, modes, flights ─────────────────────────────────────── */

  function setWalls(on: boolean) {
    wallsShown = on;
    if (!model) return;
    model.walls.visible = on;
    model.ceilings.visible = on;
    model.lowWalls.visible = !on;
    mirror?.setVisible(on);
  }

  function saveWalk() {
    saved.x = walker.x; saved.z = walker.z; saved.yaw = walker.yaw; saved.pitch = walker.pitch;
  }

  /** Eye and look point of the dollhouse overview, behind the guest so it faces the way they did. */
  function overviewPose(yaw: number, eye: T.Vector3, look: T.Vector3) {
    const vfov = DOLLHOUSE_FOV * Math.PI / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * persp.aspect);
    const distance = halfDiagonal / Math.sin(Math.min(vfov, hfov) / 2) * 1.02;
    const polar = 52 * Math.PI / 180;
    look.set(centreX, 0.35, centreZ);
    eye.set(
      centreX - Math.sin(yaw) * Math.sin(polar) * distance,
      0.35 + Math.cos(polar) * distance,
      centreZ - Math.cos(yaw) * Math.sin(polar) * distance,
    );
    return distance;
  }

  /** The perspective pose that frames exactly what the plan's orthographic camera shows. */
  function topDownPose(eye: T.Vector3, look: T.Vector3) {
    const halfHeight = (ortho.top - ortho.bottom) / 2 / ortho.zoom;
    const h = halfHeight / Math.tan((PLAN_FOV / 2) * Math.PI / 180);
    // The plan's frustum is lifted off-centre (see updatePlanFrustum); aim at what sits mid-canvas, south of the target.
    const tx = planOrbit.target.x, tz = planOrbit.target.z - (ortho.top + ortho.bottom) / 2 / ortho.zoom;
    look.set(tx, 0, tz);
    // A hair south of straight down keeps lookAt well-defined and puts north at the top.
    eye.set(tx, h, tz + h * 1e-4);
  }

  function walkLook(x: number, z: number, yaw: number, pitch: number, out: T.Vector3) {
    return out.set(x + Math.sin(yaw) * Math.cos(pitch) * 2, walker.eye + Math.sin(pitch) * 2, z + Math.cos(yaw) * Math.cos(pitch) * 2);
  }

  /** Fits the plan into the band between the shell's top bar and room strip, so no room hides under glass. */
  function updatePlanFrustum() {
    const halfW = (b.maxX - b.minX) / 2 * 1.1 + 0.3, halfD = (b.maxZ - b.minZ) / 2 * 1.1 + 0.3;
    const aspect = width / height;
    const top = Math.max(halfD / (1 - PLAN_INSET_TOP - PLAN_INSET_BOTTOM), halfW / aspect);
    // Shift the frustum so the target lands at the band's centre rather than the canvas centre (in NDC, +y is up).
    const shift = PLAN_INSET_BOTTOM - PLAN_INSET_TOP;
    ortho.top = top * (1 - shift); ortho.bottom = -top * (1 + shift);
    ortho.right = top * aspect; ortho.left = -top * aspect;
    ortho.updateProjectionMatrix();
  }

  function setMode(next: Mode, options: { instant?: boolean; walkTo?: { x: number; z: number; yaw: number; pitch: number } } = {}) {
    if (!ready) { pending.mode = next; return; }
    const from = flight.active ? (landing ?? mode) : mode;
    if (next === from && !options.walkTo) return;
    if (from === 'walk' && !flight.active) saveWalk();
    if (options.walkTo) Object.assign(saved, options.walkTo);
    walker.cancelJourney();
    input.clear();
    if (input.locked && next !== 'walk') input.requestLock(false);
    footprint.cursor.show(false);
    footprint.target.show(false);
    orbit.enabled = planOrbit.enabled = false;
    shadowsDirty = true;
    const instant = options.instant || reduced;

    // Where the flight starts.
    if (active === ortho) {
      topDownPose(v1, v2);
      persp.position.copy(v1);
      persp.lookAt(v2);
      persp.fov = PLAN_FOV;
      persp.updateProjectionMatrix();
      active = persp;
    } else if (flight.active) {
      v2.set(0, 0, -1).applyQuaternion(persp.quaternion).add(persp.position);
    } else if (mode === 'walk') walkLook(walker.x, walker.z, walker.yaw, walker.pitch, v2);
    else v2.copy(orbit.target);
    const fromEye = v1.copy(persp.position), fromLook = v2, fromFov = persp.fov;

    // Where it lands.
    const toEye = new T.Vector3(), toLook = new T.Vector3();
    let toFov = walkFov, riseTo = 0;
    if (next === 'walk') {
      toEye.set(saved.x, walker.eye, saved.z);
      walkLook(saved.x, saved.z, saved.yaw, saved.pitch, toLook);
      riseTo = 2.4;
    } else if (next === 'dollhouse') {
      const distance = overviewPose(saved.yaw, toEye, toLook);
      orbit.minDistance = distance * 0.45;
      orbit.maxDistance = distance * 1.7;
      toFov = DOLLHOUSE_FOV;
    } else {
      planOrbit.target.set(centreX, 0, centreZ);
      ortho.zoom = 1;
      updatePlanFrustum();
      topDownPose(toEye, toLook);
      toFov = PLAN_FOV;
    }
    const leavingRoom = from === 'walk';
    if (leavingRoom) setWalls(false);
    mode = next;
    landing = next;
    cb.onMode(next);
    if (instant) {
      flight.cancel();
      persp.position.copy(toEye);
      persp.lookAt(toLook);
      land();
    } else {
      flight.start(fromEye, fromLook, fromFov, toEye, toLook, toFov, leavingRoom ? 2.4 : 0, riseTo, 0.9);
    }
    markDirty();
  }

  /** The flight ended (or the mode changed instantly): hand the camera to the mode's controls. */
  function land() {
    const next = landing ?? mode;
    landing = null;
    if (next === 'walk') {
      walker.place(saved.x, saved.z, saved.yaw, saved.pitch);
      persp.fov = walkFov;
      persp.updateProjectionMatrix();
      walker.apply(persp);
      setWalls(true);
      active = persp;
      instantLamps = true;
      poseDirty = true;
      const r = def.roomAt(walker.x, walker.z);
      if (r !== room) { room = r; cb.onRoom(r); }
      if (tour.playing && tour.phase === 'walk') { tour.phase = 'dwell'; tour.dwell = 0; tour.baseYaw = walker.yaw; }
    } else if (next === 'dollhouse') {
      setWalls(false);
      persp.fov = DOLLHOUSE_FOV;
      persp.updateProjectionMatrix();
      overviewPose(saved.yaw, v1, v2);
      orbit.target.copy(v2);
      if (!flight.active) persp.position.copy(v1);
      orbit.update();
      orbit.enabled = !paused;
      active = persp;
      instantLamps = true;
    } else {
      setWalls(false);
      ortho.position.set(planOrbit.target.x, 40, planOrbit.target.z);
      ortho.lookAt(planOrbit.target.x, 0, planOrbit.target.z);
      ortho.updateProjectionMatrix();
      planOrbit.update();
      planOrbit.enabled = !paused;
      active = ortho;
      instantLamps = true;
    }
    shadowsDirty = true;
    markDirty();
  }

  function clampOrbitTarget() {
    const t = orbit.target;
    const x = clamp(t.x, b.minX, b.maxX), z = clamp(t.z, b.minZ, b.maxZ), y = clamp(t.y, 0, 2);
    if (x !== t.x || y !== t.y || z !== t.z) { t.set(x, y, z); orbit.update(); }
  }

  /* ── walking: rooms, floor clicks, the guided tour ─────────────── */

  function viewPose(id: string) {
    const view = def.views[id];
    const [x, , z] = view.position, [tx, ty, tz] = view.target;
    return { x, z, yaw: Math.atan2(tx - x, tz - z), pitch: Math.atan2(ty - walker.eye, Math.hypot(tx - x, tz - z)) };
  }

  function currentRoom() {
    return mode === 'walk' && !flight.active ? def.roomAt(walker.x, walker.z) : def.roomAt(saved.x, saved.z);
  }

  /** Walk to a room's authored view along a real path (or fly in from the overview). */
  function navigateRoom(id: string) {
    if (!def.views[id] || !nav) return;
    const pose = viewPose(id);
    if (mode !== 'walk' || flight.active) { setMode('walk', { walkTo: pose }); return; }
    footprint.target.show(false);
    const path = reduced ? null : nav.path(walker.x, walker.z, pose.x, pose.z);
    if (!path) {
      // Reduced motion asks for instant jumps; an unplannable route (should not happen) also cuts.
      walker.place(pose.x, pose.z, pose.yaw, pose.pitch);
      instantLamps = true;
      walker.arrived = { room: id } as Journey;
    } else walker.walk(path, pose.yaw, pose.pitch, id);
    markDirty();
  }

  function arrive(j: Journey) {
    walker.arrived = null;
    if (!j.room) { footprint.target.show(false); footprint.target.breathe(false, reduced); }
    if (tour.playing && tour.phase === 'walk') { tour.phase = 'dwell'; tour.dwell = 0; tour.baseYaw = walker.yaw; }
    poseDirty = true;
  }

  /** Returns true when it turned the guest's head (the slow look-around). */
  function stepTour(dt: number) {
    if (!tour.playing) return false;
    const n = def.rooms.length;
    let turned = false;
    if (tour.phase === 'walk') {
      const j = walker.journey;
      tour.progress = (tour.index + (j ? 0.6 * (j.length ? j.s / j.length : 1) : 0)) / n;
      // A room with no authored view (or a cut instead of a walk) must not stall the tour.
      if (!j && !flight.active && !walker.arrived) { tour.phase = 'dwell'; tour.dwell = 0; tour.baseYaw = walker.yaw; }
    } else {
      tour.dwell += dt;
      // A slow look around the room; none with reduced motion.
      if (!reduced) { walker.yaw = tour.baseYaw + Math.sin(tour.dwell * 0.42) * 0.17 * smoothstep(0, 1.5, tour.dwell); turned = true; }
      tour.progress = (tour.index + 0.6 + 0.4 * Math.min(1, tour.dwell / 5)) / n;
      if (tour.dwell > 5) {
        tour.index++;
        if (tour.index >= n) {
          tour.playing = false;
          tour.progress = 1;
        } else {
          tour.phase = 'walk';
          navigateRoom(def.rooms[tour.index].id);
        }
      }
    }
    tour.dirty = true;
    return turned;
  }

  function stopTourByGuest() {
    if (!tour.playing) return;
    tour.playing = false;
    // Play resumes where the guest left off: the room being walked to, or the one after the room they were looking at.
    if (tour.phase === 'dwell') tour.index = Math.min(def.rooms.length - 1, tour.index + 1);
    tour.dirty = true;
    reportTour(performance.now(), true);
  }

  /** The guest moved the gaze: the tour pauses; a click-walk keeps walking but stops steering the view. */
  function tookGaze() {
    const j = walker.journey;
    if (tour.playing) { stopTourByGuest(); walker.cancelJourney(); }
    else if (j) j.freeLook = true;
  }

  function floorAt(clientX: number, clientY: number, out: T.Vector3) {
    const rect = canvas.getBoundingClientRect();
    ndc.set((clientX - rect.left) / rect.width * 2 - 1, 1 - (clientY - rect.top) / rect.height * 2);
    raycaster.setFromCamera(ndc, active);
    return raycaster.ray.intersectPlane(floorPlane, out) !== null;
  }

  /** A floor point the guest can see and could stand on. */
  function walkable(x: number, z: number) {
    return !!nav && Math.hypot(x - walker.x, z - walker.z) < 12 && !nav.blocked(x, z) && nav.sightline(walker.x, walker.z, x, z);
  }

  function updateHover() {
    if (!ready || paused || flight.active) return;
    if (mode !== 'walk') {
      const over = hover.on && floorAt(hover.x, hover.y, hit) && def.inside(hit.x, hit.z) && !!def.views[def.roomAt(hit.x, hit.z)];
      canvas.style.cursor = over ? 'pointer' : '';
      return;
    }
    let x = hover.x, y = hover.y;
    if (input.locked) {
      const rect = canvas.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }
    const ok = floorAt(x, y, hit) && walkable(hit.x, hit.z);
    if (ok) footprint.cursor.place(hit.x, hit.z);
    footprint.cursor.show(ok);
    if (!input.locked) canvas.style.cursor = ok ? 'pointer' : 'grab';
    if (ok) footprint.update(active, width, height);
  }

  function tap(clientX: number, clientY: number, touch: boolean) {
    if (!ready || paused || flight.active || !nav) return;
    if (!floorAt(clientX, clientY, hit)) return;
    if (mode !== 'walk') {
      if (!def.inside(hit.x, hit.z)) return;
      const id = def.roomAt(hit.x, hit.z);
      stopTourByGuest();
      if (def.views[id]) navigateRoom(id);
      else if (!nav.blocked(hit.x, hit.z)) setMode('walk', { walkTo: { x: hit.x, z: hit.z, yaw: saved.yaw, pitch: 0 } });
      return;
    }
    stopTourByGuest();
    if (Math.hypot(hit.x - walker.x, hit.z - walker.z) > 14 || !nav.sightline(walker.x, walker.z, hit.x, hit.z)) {
      cb.onHint?.(UNREACHABLE);
      return;
    }
    const spot = nav.blocked(hit.x, hit.z) ? nav.nearestFree(hit.x, hit.z, 0.6) : [hit.x, hit.z] as [number, number];
    const path = spot && nav.path(walker.x, walker.z, spot[0], spot[1]);
    const ring = footprint.target;
    if (!spot || !path) {
      ring.place(hit.x, hit.z);
      ring.show(true);
      footprint.update(active, width, height);
      ring.shake(reduced);
      setTimeout(() => { if (!walker.journey) ring.show(false); }, 650);
      cb.onHint?.(UNREACHABLE);
      return;
    }
    ring.place(spot[0], spot[1]);
    ring.show(true);
    ring.breathe(true, reduced);
    footprint.update(active, width, height);
    // One ring is enough while walking: the cursor ring comes back when the mouse moves.
    footprint.cursor.show(false);
    hover.quiet = !touch;
    if (reduced) {
      walker.place(spot[0], spot[1], walker.yaw, walker.pitch);
      instantLamps = true;
      walker.arrived = { room: null } as Journey;
    } else walker.walk(path, null, null, null);
    markDirty();
  }

  /* ── light ─────────────────────────────────────────────────────── */

  function propertyClock() {
    const t = new Date(Date.now() + tz * 3600000);
    return { date: t.toISOString().slice(0, 10), hour: t.getUTCHours() + t.getUTCMinutes() / 60 };
  }
  function propertyDate() { return new Date(Date.now() + def.listing.tzOffsetHours * 3600000).toISOString().slice(0, 10); }

  function applyLight() {
    lastLightChange = performance.now();
    solarPosition(light.jd0, light.hour, tz, def.listing.lat, def.listing.lng, sunPos);
    if (rig) {
      if (rig.apply(sunPos, light.live ? light.weather : null, northDeg, renderer, scene)) shadowsDirty = true;
      rig.compensate(rig.lamps.coverage(), mode !== 'walk');
      dirty = true;
    }
    lightDirty = true;
    const now = performance.now();
    if (ambienceOn && (!light.playing || now - lastSoundAt > 250)) {
      lastSoundAt = now;
      ambience.setScene({ hour: light.hour, elevation: sunPos.elevationDeg, rain: light.live && !!light.weather?.rain });
    }
    wake();
  }

  function lightState(): LightState {
    return {
      live: light.live, date: light.date, hour: light.hour,
      sun: { azimuthDeg: sunPos.azimuthDeg, elevationDeg: sunPos.elevationDeg },
      weather: light.live ? light.weather : null, playing: light.playing,
    };
  }

  function stepDay(dt: number, now: number) {
    light.hour = Math.min(DAY_END, light.hour + dt * (DAY_END - DAY_START) / DAY_SECONDS);
    if (light.hour >= DAY_END) {
      light.playing = false;
      shadowsDirty = true;
      lastShadowAt = 0;
    }
    applyLight();
    if (!light.playing) reportLight(now, true);
  }

  function syncClock() {
    const c = propertyClock();
    if (c.date !== light.date) { light.date = c.date; light.jd0 = julianDay(c.date); }
    light.hour = c.hour;
  }

  function refreshWeather() {
    weatherAbort?.abort();
    const abort = new AbortController();
    weatherAbort = abort;
    fetchWeather(def.listing.lat, def.listing.lng, abort.signal)
      .then(w => { if (!disposed && light.live && w) { light.weather = w; applyLight(); } })
      .catch(() => { /* offline or the endpoint is down: the light simply ignores weather */ });
  }

  function startLive() {
    stopLive();
    syncClock();
    // Tick on the minute boundary, then every minute.
    const toMinute = 60000 - (Date.now() % 60000) + 50;
    liveTimer = window.setTimeout(function tick() {
      if (!light.live || disposed) return;
      syncClock();
      applyLight();
      liveTimer = window.setTimeout(tick, 60000 - (Date.now() % 60000) + 50);
    }, toMinute);
    refreshWeather();
    weatherTimer = window.setInterval(refreshWeather, 15 * 60000);
  }

  function stopLive() {
    clearTimeout(liveTimer);
    clearInterval(weatherTimer);
    liveTimer = weatherTimer = 0;
    weatherAbort?.abort();
    weatherAbort = null;
  }

  /* ── reporting (throttled) ─────────────────────────────────────── */

  function reportPose(now: number, force: boolean) {
    if (!poseDirty || !ready || (!force && now - lastPoseAt < 100)) return;
    poseDirty = false;
    lastPoseAt = now;
    cb.onPose({ x: walker.x, z: walker.z, yaw: walker.yaw, pitch: walker.pitch, room: def.roomAt(walker.x, walker.z) });
  }

  function reportTour(now: number, force: boolean) {
    if (!tour.dirty || (!force && now - tour.lastAt < 100)) return;
    tour.dirty = false;
    tour.lastAt = now;
    cb.onTour({ playing: tour.playing, index: Math.min(tour.index, def.rooms.length - 1), progress: tour.progress });
  }

  function reportLight(now: number, force: boolean) {
    if (!lightDirty || (!force && light.playing && now - lastLightAt < 100)) return;
    lightDirty = false;
    lastLightAt = now;
    cb.onLight(lightState());
  }

  /* ── resize, visibility, context loss ──────────────────────────── */

  function resize() {
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
    if (w === width && h === height) return;
    width = w;
    height = h;
    renderer.setSize(w, h, false);
    persp.aspect = w / h;
    persp.updateProjectionMatrix();
    updatePlanFrustum();
    if (refiner && governor.spec.ao) ensureRefiner();
    if (mode === 'plan' && !flight.active) planOrbit.update();
    markDirty();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);

  const onVisibility = () => {
    hidden = document.hidden;
    ambience.setHeld(paused || hidden);
    if (hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      input.clear();
    } else {
      if (light.live) { syncClock(); applyLight(); }
      markDirty();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  const onMotionPreference = (e: MediaQueryListEvent) => { reduced = e.matches; orbit.enableDamping = !reduced; };
  motionQuery.addEventListener?.('change', onMotionPreference);

  const onContextLost = (e: Event) => {
    e.preventDefault();
    fail('The browser paused the 3D view to save memory. Reopen the tour, or browse the original photographs.');
  };
  canvas.addEventListener('webglcontextlost', onContextLost);

  function fail(message: string) {
    if (failed || disposed) return;
    failed = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    input.clear();
    ambience.setHeld(true);
    cb.onError(message);
  }

  /** Progress only ever moves forward, even when texture callbacks arrive late. */
  let loadProgress = 0;
  function load(progress: number, label: string) {
    if (disposed || progress < loadProgress) return;
    loadProgress = progress;
    cb.onLoad?.(progress, label);
  }

  /* ── boot ──────────────────────────────────────────────────────── */

  async function boot() {
    load(0.03, 'Preparing the 3D view');
    await nextTask();
    if (disposed) return;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    const quality: Quality = coarse || memory <= 4 ? 'low' : 'high';

    // Textures the builder queues (reference images) finish loading before shaders compile.
    const manager = new T.LoadingManager();
    let queued = 0, loaded = false;
    let texturesDone: () => void = () => {};
    const texturesReady = new Promise<void>(resolve => { texturesDone = resolve; });
    manager.onStart = () => { queued++; };
    manager.onLoad = () => { loaded = true; texturesDone(); };
    manager.onProgress = (_url, done, total) => load(0.6 + 0.08 * (done / Math.max(1, total)), 'Loading surfaces');
    manager.onError = url => { if (local) console.warn('Tour texture failed to load:', url); };

    load(0.08, 'Building the apartment');
    await nextTask();
    if (disposed) return;
    const m = def.build(manager, quality);
    model = m;
    // The engine owns lighting: a stray light in the model would change the shader light count.
    const strays: T.Object3D[] = [];
    m.root.traverse(o => { if ((o as T.Light).isLight) strays.push(o); });
    strays.forEach(o => o.removeFromParent());
    if (strays.length && local) console.warn(`Tour model contained ${strays.length} light(s); the engine removed them.`);
    // The sun stands in for window light falling inside: walls and ceilings never block it.
    for (const g of [m.walls, m.ceilings, m.lowWalls]) g.traverse(o => { o.castShadow = false; });
    scene.add(m.root);
    if (disposed) return;

    load(0.32, 'Arranging the rooms');
    await nextTask();
    const containers = [m.contents, m.walls, m.ceilings, m.lowWalls];
    let before = 0, after = 0;
    for (let i = 0; i < containers.length; i++) {
      const s = mergeByRoom([containers[i]], def.roomAt);
      before += s.meshesBefore;
      after += s.meshesAfter;
      load(0.32 + 0.06 * (i + 1), 'Arranging the rooms');
      await nextTask();
      if (disposed) return;
    }
    if (local) console.info(`Tour merge: ${before} meshes → ${after}`);
    m.root.updateMatrixWorld(true);
    // Nothing static moves again: skip recomposing its matrices every frame.
    for (const o of [m.root, ...containers]) o.matrixAutoUpdate = false;

    load(0.56, 'Mapping the floor');
    await nextTask();
    nav = createNavigation(def.inside, m.collisions, def.plan.bounds);
    const ceilingBox = new T.Box3().setFromObject(m.ceilings);
    if (!ceilingBox.isEmpty() && ceilingBox.min.y > 1.8) ceilingY = ceilingBox.min.y;
    const apartment = new T.Box3(new T.Vector3(b.minX, 0, b.minZ), new T.Vector3(b.maxX, ceilingY + 0.15, b.maxZ));

    load(0.6, 'Lighting the rooms');
    await nextTask();
    const pmrem = new T.PMREMGenerator(renderer);
    const roomEnvironment = new RoomEnvironment();
    envTarget = pmrem.fromScene(roomEnvironment, 0.04);
    scene.environment = envTarget.texture;
    roomEnvironment.dispose();
    pmrem.dispose();
    rig = new LightRig(scene, def, m, apartment);
    if (def.mirror) {
      mirror = new BudgetMirror(def.mirror, governor.spec.mirror);
      scene.add(mirror.group);
    }
    rig.setShadowSize(governor.spec.shadow);
    applyLight();
    m.lowWalls.visible = false;

    const start = def.views[def.start] ? def.start : Object.keys(def.views)[0];
    const pose = viewPose(start);
    walker.place(pose.x, pose.z, pose.yaw, pose.pitch);
    saveWalk();
    walker.apply(persp);
    room = def.roomAt(walker.x, walker.z);
    updatePlanFrustum();

    if (queued && !loaded) await Promise.race([texturesReady, new Promise(r => setTimeout(r, 10000))]);
    if (disposed) return;

    load(0.7, 'Preparing shaders');
    await warmup();
    if (disposed || failed) return;

    ready = true;
    load(1, 'Ready');
    rig.lamps.update(0, persp.position, true);
    cb.onRoom(room);
    cb.onMode(mode);
    reportQuality();
    applyPending();
    lightDirty = poseDirty = tour.dirty = true;
    markDirty();
  }

  /**
   * Compile every program the session can need and upload every buffer and
   * texture, with everything visible and nothing culled, before the guest
   * can move. Two output paths exist (tone-mapped sRGB to the canvas; linear
   * HDR into render targets for refined frames and the mirror), so both are
   * compiled.
   */
  async function warmup() {
    const m = model!;
    const groups = [m.walls, m.ceilings, m.lowWalls];
    const visible = groups.map(g => g.visible);
    groups.forEach(g => { g.visible = true; });
    mirror?.warmup(true);
    const culled: T.Object3D[] = [];
    scene.traverse(o => { if (o.frustumCulled) { culled.push(o); o.frustumCulled = false; } });
    const probe = new T.WebGLRenderTarget(64, 64, { type: T.HalfFloatType });
    try {
      renderer.setRenderTarget(null);
      await compile();
      load(0.8, 'Preparing shaders');
      renderer.setRenderTarget(probe);
      await compile();
      load(0.88, 'Warming up');
      await nextTask();
      if (disposed) return;
      renderer.shadowMap.needsUpdate = true;
      shadowsDirty = false;
      renderer.setRenderTarget(probe);
      renderer.setClearColor(0x000000, 0);
      mirror?.force();
      renderer.render(scene, persp);
      mirror?.disarm();
      renderer.setRenderTarget(null);
      renderer.setClearColor(rig!.background, 1);
      renderer.render(scene, persp);
      await nextTask();
      {
        // Warmed whatever the starting tier: phones start on balanced and the governor steps them up to high
        // mid-walk, which would otherwise compile the AO/composite programs in front of the guest. Only the programs matter here, not the pixels. Occlusion at canvas size is the most expensive pass
        // the engine has (seconds under software GL) and would hold the loading bar for nothing; the first
        // refined frame grows the buffers to the canvas, which is a reallocation, not a recompile.
        if (!refiner) refiner = new Refiner(scene, persp, WARM_SIZE, WARM_SIZE, { samples: 2, ao: true });
        else refiner.setSize(WARM_SIZE, WARM_SIZE);
        refiner.renderScene(renderer, persp, () => {}, () => {});
        refiner!.composite(renderer, 1, rig!.background, null);
      }
      load(0.96, 'Warming up');
    } finally {
      probe.dispose();
      culled.forEach(o => { o.frustumCulled = true; });
      groups.forEach((g, i) => { g.visible = visible[i]; });
      mirror?.warmup(false);
      if (mirror) mirror.stale = true;
      renderer.setRenderTarget(null);
    }
    await nextTask();
  }

  async function compile() {
    try { await renderer.compileAsync(scene, persp); } catch { renderer.compile(scene, persp); }
  }

  function applyPending() {
    if (pending.view) { const v = pending.view; pending.view = undefined; api.setView(v); }
    if (pending.room) { const r = pending.room; pending.room = undefined; const p = viewPose(r); walker.place(p.x, p.z, p.yaw, p.pitch); walker.apply(persp); saveWalk(); }
    if (pending.mode) { const md = pending.mode; pending.mode = undefined; setMode(md, { instant: true }); }
    if (pending.tour) { pending.tour = undefined; api.setTour(true); }
  }

  /* ── the controller ────────────────────────────────────────────── */

  const api: TourController = {
    goRoom(id) {
      if (!def.views[id]) return;
      if (!ready) { pending.room = id; return; }
      stopTourByGuest();
      navigateRoom(id);
    },
    walkTo(x, z) {
      if (!ready || !nav || paused) return false;
      const spot = nav.nearestFree(x, z, 0.8);
      const path = spot && nav.path(walker.x, walker.z, spot[0], spot[1]);
      if (!spot || !path) return false;
      stopTourByGuest();
      if (mode !== 'walk' || flight.active) { setMode('walk', { walkTo: { x: spot[0], z: spot[1], yaw: saved.yaw, pitch: 0 } }); return true; }
      footprint.target.place(spot[0], spot[1]);
      footprint.target.show(true);
      footprint.target.breathe(true, reduced);
      footprint.update(active, width, height);
      if (reduced) { walker.place(spot[0], spot[1], walker.yaw, walker.pitch); walker.arrived = { room: null } as Journey; }
      else walker.walk(path, null, null, null);
      markDirty();
      return true;
    },
    move(x, z) {
      x = clamp(x || 0, -1, 1);
      z = clamp(z || 0, -1, 1);
      if ((x || z) && !input.padX && !input.padZ) sink.manual();
      input.padX = x;
      input.padZ = z;
      wake();
    },
    look(dYaw, dPitch) { if (ready && !paused) sink.look(dYaw, dPitch); },
    setRun(on) { input.runHeld = on; wake(); },
    setEyeHeight(metres) {
      walker.eye = clamp(metres, 1, 1.9);
      if (mode === 'walk' && !flight.active && ready) { walker.apply(persp); markDirty(); }
    },
    setFov(deg) {
      walkFov = clamp(deg, FOV_MIN, FOV_MAX);
      if (mode === 'walk' && !flight.active) {
        persp.fov = walkFov;
        persp.updateProjectionMatrix();
        if (footprint.visible) footprint.update(active, width, height);
        markDirty();
      }
    },
    setPointerLock(on) {
      if (on && (mode !== 'walk' || !ready)) return;
      input.requestLock(on);
    },
    async setGyro(on) {
      if (!on) { input.disableGyro(); return false; }
      const ok = await input.enableGyro();
      if (!ok) cb.onHint?.('Motion sensors aren’t available on this device');
      wake();
      return ok;
    },
    setMode(next) {
      stopTourByGuest();
      setMode(next);
    },
    setTour(playing) {
      if (!ready) { pending.tour = playing; return; }
      if (!playing) { stopTourByGuest(); return; }
      if (tour.index >= def.rooms.length || tour.progress >= 1) tour.index = 0;
      tour.playing = true;
      tour.phase = 'walk';
      tour.dirty = true;
      navigateRoom(def.rooms[tour.index].id);
      reportTour(performance.now(), true);
      wake();
    },
    reset() {
      if (!ready) { pending.view = undefined; pending.mode = undefined; pending.room = undefined; return; }
      tour.playing = false; tour.index = 0; tour.progress = 0; tour.dirty = true;
      walker.cancelJourney();
      flight.cancel();
      const p = viewPose(def.views[def.start] ? def.start : Object.keys(def.views)[0]);
      setMode('walk', { instant: true, walkTo: p });
      reportTour(performance.now(), true);
    },
    setLive(on) {
      light.live = on;
      if (on) { light.playing = false; startLive(); } else { stopLive(); light.weather = null; }
      applyLight();
      reportLight(performance.now(), true);
    },
    setDate(iso) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || !Number.isFinite(julianDay(iso))) return;
      if (light.live) { light.live = false; stopLive(); light.weather = null; }
      light.date = iso;
      light.jd0 = julianDay(iso);
      applyLight();
      reportLight(performance.now(), true);
    },
    setHour(hour) {
      if (!Number.isFinite(hour)) return;
      if (light.live) { light.live = false; stopLive(); light.weather = null; }
      light.playing = false;
      light.hour = clamp(hour, 0, 24);
      applyLight();
      reportLight(performance.now(), true);
    },
    playDay(on) {
      if (on) {
        if (light.live) { light.live = false; stopLive(); light.weather = null; }
        light.hour = DAY_START;
        light.playing = true;
      } else light.playing = false;
      shadowsDirty = true;
      applyLight();
      reportLight(performance.now(), true);
    },
    setAmbience(on) {
      ambienceOn = on;
      if (on) ambience.setScene({ hour: light.hour, elevation: sunPos.elevationDeg, rain: light.live && !!light.weather?.rain });
      ambience.setOn(on);
      ambience.setHeld(paused || hidden);
    },
    setQuality(tier: Tier | 'auto') {
      governor.set(tier);
      applyTier();
    },
    quality: qualityState,
    getView() {
      const inWalk = mode === 'walk' && !flight.active;
      const p = inWalk ? walker : saved;
      const view: SharedView = { room: def.roomAt(p.x, p.z), x: p.x, z: p.z, yaw: p.yaw, pitch: p.pitch, mode };
      if (!light.live) { view.hour = light.hour; view.date = light.date; }
      return view;
    },
    setView(view) {
      if (!ready || !nav) { pending.view = view; return; }
      let x = Number(view.x), z = Number(view.z);
      if (!Number.isFinite(x) || !Number.isFinite(z) || nav.blocked(x, z)) {
        const spot = Number.isFinite(x) && Number.isFinite(z) ? nav.nearestFree(x, z, 0.6) : null;
        if (spot) [x, z] = spot;
        else {
          const p = viewPose(def.views[view.room] ? view.room : def.start);
          x = p.x; z = p.z;
        }
      }
      const pose = { x, z, yaw: Number(view.yaw) || 0, pitch: clamp(Number(view.pitch) || 0, -PITCH_LIMIT, PITCH_LIMIT) };
      if (view.date && /^\d{4}-\d{2}-\d{2}$/.test(view.date)) api.setDate(view.date);
      if (view.hour != null && Number.isFinite(view.hour)) api.setHour(view.hour);
      tour.playing = false;
      tour.dirty = true;
      walker.cancelJourney();
      flight.cancel();
      landing = null;
      // Land in walk at the shared pose first, so a dollhouse or plan view still remembers where to come back to.
      if (mode !== 'walk') setMode('walk', { instant: true, walkTo: pose });
      else { walker.place(pose.x, pose.z, pose.yaw, pose.pitch); saveWalk(); instantLamps = true; afterMove(); }
      const target = view.mode === 'dollhouse' || view.mode === 'plan' ? view.mode : 'walk';
      if (target !== 'walk') { saveWalk(); setMode(target, { instant: true }); }
      markDirty();
    },
    async snapshot() {
      if (!ready || failed || disposed || !rig) return null;
      if (shadowsDirty) { renderer.shadowMap.needsUpdate = true; shadowsDirty = false; }
      active.updateMatrixWorld();
      const h = Math.floor(light.hour), mm = Math.round((light.hour - h) * 60);
      const hourLabel = `${String(mm === 60 ? h + 1 : h).padStart(2, '0')}:${String(mm === 60 ? 0 : mm).padStart(2, '0')}`;
      try {
        return await renderPostcard({
          renderer, scene, camera: active,
          screenWidth: width * (window.devicePixelRatio || 1),
          ao: governor.spec.ao && mode !== 'plan',
          background: rig.background, mirror,
          caption: {
            title: def.listing.title, area: def.listing.area, hour: light.live ? null : hourLabel,
            accent: def.theme.accent, night: def.theme.night, paper: def.theme.paper,
          },
        });
      } catch (err) {
        if (local) console.warn('Postcard failed', err);
        return null;
      } finally {
        markDirty();
      }
    },
    setPaused(value) {
      if (paused === value) return;
      paused = value;
      input.clear();
      if (value && input.locked) input.requestLock(false);
      orbit.enabled = !value && mode === 'dollhouse' && !flight.active;
      planOrbit.enabled = !value && mode === 'plan' && !flight.active;
      ambience.setHeld(paused || hidden);
      markDirty();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      stopLive();
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      motionQuery.removeEventListener?.('change', onMotionPreference);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      input.dispose();
      orbit.removeEventListener('change', onOrbitChange);
      planOrbit.removeEventListener('change', onOrbitChange);
      orbit.removeEventListener('start', wakeForOrbit);
      planOrbit.removeEventListener('start', wakeForOrbit);
      orbit.dispose();
      planOrbit.dispose();
      footprint.dispose();
      ambience.dispose();
      refiner?.dispose();
      mirror?.dispose();
      rig?.sun.shadow.dispose();
      const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>(), textures = new Set<T.Texture>();
      scene.traverse(o => {
        const mesh = o as T.Mesh;
        if (!mesh.isMesh) return;
        geometries.add(mesh.geometry);
        (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(mat => materials.add(mat));
      });
      if (model) Object.values(model.materials).forEach(mat => materials.add(mat));
      materials.forEach(mat => {
        for (const value of Object.values(mat)) if (value instanceof T.Texture) textures.add(value);
        mat.dispose();
      });
      geometries.forEach(g => g.dispose());
      textures.forEach(t => t.dispose());
      envTarget?.dispose();
      scene.clear();
      renderer.renderLists.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      if (local) delete (host as unknown as Record<string, unknown>).tourSnapshot;
    },
  };

  // Local previews get a read-only probe for scripted checks (geometry, performance, state).
  if (local) {
    Object.defineProperty(host, 'tourSnapshot', {
      configurable: true,
      value: () => ({
        mode, ready, paused,
        position: { x: active.position.x, y: active.position.y, z: active.position.z },
        walker: { x: walker.x, z: walker.z }, yaw: walker.yaw, pitch: walker.pitch, eye: walker.eye, fov: walkFov,
        room: currentRoom(), blocked: nav ? nav.blocked(walker.x, walker.z) : false,
        drawCalls: stats.calls, triangles: stats.triangles, programs: renderer.info.programs?.length ?? 0,
        dpr: renderer.getPixelRatio(), tier: governor.tier, auto: governor.auto, fps: Math.round(1000 / Math.max(1, governor.frameMs)),
        sun: { azimuthDeg: sunPos.azimuthDeg, elevationDeg: sunPos.elevationDeg },
        light: { live: light.live, hour: light.hour, date: light.date, playing: light.playing },
        refine, flying: flight.active, journey: walker.journey ? { length: walker.journey.length, s: walker.journey.s } : null,
        touring: tour.playing, tourIndex: tour.index, looping: raf !== 0,
        lamps: rig ? rig.lamps.lights.map(l => +l.intensity.toFixed(2)) : [],
        footprint: { cursor: footprint.cursor.shown, target: footprint.target.shown },
        audio: ambience.state, pointerLock: input.locked,
      }),
    });
  }

  boot().catch(err => {
    if (local) console.error(err);
    fail('The 3D view could not be built on this device. The original photographs are all here.');
  });
  // Keep the controller usable while the scene builds; movement simply waits for ready.
  return api;
}

/**
 * Keyboard focus on the 3D view shows as a quiet inset ring in the tour's accent;
 * a click or tap that focuses it (so arrow keys stop going to a slider) shows none.
 */
function installFocusStyle(accent: string) {
  if (document.getElementById('tour-engine-style')) return;
  const c = new T.Color(accent);
  const style = document.createElement('style');
  style.id = 'tour-engine-style';
  style.textContent = `.tour-canvas:focus{outline:none}.tour-canvas:focus-visible{outline:2px solid rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},.75);outline-offset:-2px}`;
  document.head.appendChild(style);
}

/** A controller that does nothing, for devices without WebGL: the UI falls back to photographs. */
function inertController(def: TourDefinition): TourController {
  const view = def.views[def.start];
  return {
    goRoom() {}, walkTo: () => false, move() {}, look() {}, setRun() {}, setEyeHeight() {}, setFov() {},
    setPointerLock() {}, setGyro: async () => false, setMode() {}, setTour() {}, reset() {},
    setLive() {}, setDate() {}, setHour() {}, playDay() {}, setAmbience() {},
    setQuality() {}, quality: () => ({ tier: 'battery', auto: true, dpr: 1, fps: 0, ao: false }),
    getView: () => ({ room: def.start, x: view ? view.position[0] : 0, z: view ? view.position[2] : 0, yaw: 0, pitch: 0, mode: 'walk' }),
    setView() {}, snapshot: async () => null, setPaused() {}, dispose() {},
  };
}
