/* The guest's body: position, gaze and how it moves.

   Free movement accelerates and brakes like a person (not a sliding
   camera), with axis-separated collision so walking into a wall at an angle
   slides along it. Path journeys (room jumps, floor clicks, the guided tour)
   follow a speed profile with a gentle start and a stop exactly on the
   mark, looking a little ahead along the path and turning toward the room's
   view on arrival. A subtle head-bob scales with speed. Nothing here
   allocates per frame. */
import * as T from 'three';
import type { Navigation, Point } from './navigation';
import type { Intents } from './input';
import { angleDelta, clamp, damp, smoothstep, EYE_DEFAULT } from './util';

const WALK = 1.35, RUN = 2.5, PATH_WALK = 1.3;
const ACCEL = 1.9, DECEL = 1.5;
const TURN = 1.7, PITCH_RATE = 1.1;
export const PITCH_LIMIT = 1.2;

export type Journey = {
  points: Point[];
  cum: number[];
  length: number;
  s: number;
  v: number;
  seg: number;
  /** Final gaze for room views; null keeps facing the way of travel. */
  yaw: number | null;
  pitch: number | null;
  /** The guest took the gaze mid-walk: stop steering it. */
  freeLook: boolean;
  room: string | null;
  settling: boolean;
};

export class Walker {
  x = 0;
  z = 0;
  yaw = 0;
  pitch = 0;
  eye = EYE_DEFAULT;
  /** Ground speed, m/s. */
  speed = 0;
  journey: Journey | null = null;
  /** Set on the frame a journey ends; the engine reads and clears it. */
  arrived: Journey | null = null;
  private vx = 0;
  private vz = 0;
  private turnV = 0;
  private pitchV = 0;
  private bobPhase = 0;
  private bobAmp = 0;
  private bob = 0;
  private last = { x: NaN, z: NaN, yaw: NaN, pitch: NaN, bob: NaN, eye: NaN };

  place(x: number, z: number, yaw: number, pitch: number) {
    this.x = x;
    this.z = z;
    this.yaw = yaw;
    this.pitch = clamp(pitch, -PITCH_LIMIT, PITCH_LIMIT);
    this.vx = this.vz = this.turnV = this.pitchV = this.speed = 0;
    this.bobAmp = this.bob = 0;
    this.journey = null;
  }

  /** Still settling, walking or turning: frames are needed. */
  get busy() {
    return this.journey !== null || this.speed > 0.001 || this.turnV !== 0 || this.pitchV !== 0 || this.bobAmp > 0.0002;
  }

  walk(points: Point[], yaw: number | null, pitch: number | null, room: string | null) {
    const cum = [0];
    for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
    // Carry the current speed in, so redirecting mid-walk does not stop and restart.
    const v = Math.min(PATH_WALK, Math.hypot(this.vx, this.vz));
    this.journey = { points, cum, length: cum[cum.length - 1], s: 0, v, seg: 0, yaw, pitch, freeLook: false, room, settling: false };
  }

  /** Stop following a path but keep the momentum, so the guest coasts to a stop instead of freezing. */
  cancelJourney() {
    const j = this.journey;
    if (!j) return;
    if (!j.settling && j.v > 0 && j.points.length > 1) {
      const a = j.points[j.seg], b = j.points[Math.min(j.seg + 1, j.points.length - 1)];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      this.vx = (b[0] - a[0]) / len * j.v;
      this.vz = (b[1] - a[1]) / len * j.v;
    }
    this.journey = null;
  }

  /** Advance one frame. Returns true when the pose (or head-bob) changed. */
  step(dt: number, intents: Intents, nav: Navigation, reduced: boolean): boolean {
    if (this.journey) this.followJourney(dt, intents.run);
    else this.moveFree(dt, intents, nav);

    // Turning and pitching keys/sticks ease in and out instead of snapping to full rate.
    const turnTarget = intents.turn * TURN, pitchTarget = intents.pitch * PITCH_RATE;
    this.turnV += (turnTarget - this.turnV) * damp(12, dt);
    this.pitchV += (pitchTarget - this.pitchV) * damp(12, dt);
    if (!turnTarget && Math.abs(this.turnV) < 1e-3) this.turnV = 0;
    if (!pitchTarget && Math.abs(this.pitchV) < 1e-3) this.pitchV = 0;
    this.yaw += this.turnV * dt;
    this.pitch = clamp(this.pitch + this.pitchV * dt, -PITCH_LIMIT, PITCH_LIMIT);

    const ampTarget = reduced ? 0 : Math.min(1.2, this.speed / WALK) * 0.011;
    this.bobAmp += (ampTarget - this.bobAmp) * damp(6, dt);
    if (this.bobAmp < 0.0002 && !ampTarget) this.bobAmp = 0;
    // Two bobs per stride; stride frequency grows with speed like a real walk.
    this.bobPhase = (this.bobPhase + dt * (4.2 + this.speed * 2.2)) % (Math.PI * 2);
    this.bob = Math.sin(this.bobPhase * 2) * this.bobAmp;

    const l = this.last;
    const changed = l.x !== this.x || l.z !== this.z || l.yaw !== this.yaw || l.pitch !== this.pitch || l.bob !== this.bob || l.eye !== this.eye;
    l.x = this.x; l.z = this.z; l.yaw = this.yaw; l.pitch = this.pitch; l.bob = this.bob; l.eye = this.eye;
    return changed;
  }

  apply(camera: T.PerspectiveCamera) {
    camera.position.set(this.x, this.eye + this.bob, this.z);
    camera.rotation.set(this.pitch, this.yaw + Math.PI, 0);
    camera.updateMatrixWorld();
  }

  private moveFree(dt: number, intents: Intents, nav: Navigation) {
    let strafe = intents.strafe, forward = intents.forward;
    const mag = Math.hypot(strafe, forward);
    if (mag > 1) { strafe /= mag; forward /= mag; }
    const vmax = intents.run ? RUN : WALK;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    // Right of the gaze is (−cos yaw, sin yaw); forward is (sin yaw, cos yaw).
    const tvx = (-cos * strafe + sin * forward) * vmax, tvz = (sin * strafe + cos * forward) * vmax;
    const speeding = tvx * tvx + tvz * tvz > this.vx * this.vx + this.vz * this.vz;
    const k = damp(speeding ? 7 : 10, dt);
    this.vx += (tvx - this.vx) * k;
    this.vz += (tvz - this.vz) * k;
    if (!tvx && Math.abs(this.vx) < 0.005) this.vx = 0;
    if (!tvz && Math.abs(this.vz) < 0.005) this.vz = 0;
    if (!this.vx && !this.vz) { this.speed = 0; return; }

    const mx = this.vx * dt, mz = this.vz * dt;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(mx), Math.abs(mz)) / 0.035));
    // Someone placed inside a footprint (eye-height change, shared view) may always walk out.
    const free = nav.blocked(this.x, this.z);
    const x0 = this.x, z0 = this.z;
    for (let i = 0; i < steps; i++) {
      const nx = this.x + mx / steps;
      if (free || !nav.blocked(nx, this.z)) this.x = nx; else this.vx = 0;
      const nz = this.z + mz / steps;
      if (free || !nav.blocked(this.x, nz)) this.z = nz; else this.vz = 0;
    }
    this.speed = Math.hypot(this.x - x0, this.z - z0) / Math.max(dt, 1e-4);
  }

  private followJourney(dt: number, run: boolean) {
    const j = this.journey!;
    if (!j.settling) {
      const remaining = j.length - j.s;
      // Constant braking that lands exactly on the mark; never crawl the last centimetres.
      const brake = Math.max(0.16, Math.sqrt(2 * DECEL * remaining));
      j.v = Math.min(run ? RUN : PATH_WALK, j.v + ACCEL * dt, brake);
      j.s = Math.min(j.length, j.s + j.v * dt);
      this.pointAt(j, j.s);
      this.x = this.tmp[0];
      this.z = this.tmp[1];
      this.speed = j.v;
      this.vx = this.vz = 0;
      if (j.s >= j.length - 1e-4) { j.settling = true; j.v = 0; this.speed = 0; }
    }
    if (!j.freeLook) {
      const remaining = j.length - j.s;
      const arrival = j.yaw === null ? 0 : j.length < 0.3 ? 1 : 1 - smoothstep(0, 1.2, remaining);
      let aim = this.yaw;
      if (!j.settling) {
        this.pointAt(j, Math.min(j.length, j.s + 0.9));
        const ax = this.tmp[0] - this.x, az = this.tmp[1] - this.z;
        if (ax * ax + az * az > 0.0025) aim = Math.atan2(ax, az);
      }
      if (j.yaw !== null) aim += angleDelta(aim, j.yaw) * arrival;
      this.yaw += angleDelta(this.yaw, aim) * damp(j.settling ? 5 : 3.2, dt);
      const pitchAim = j.pitch !== null ? -0.06 + (j.pitch + 0.06) * arrival : -0.06;
      this.pitch += (pitchAim - this.pitch) * damp(j.settling ? 5 : 3, dt);
      if (j.settling && Math.abs(angleDelta(this.yaw, aim)) < 0.002 && Math.abs(pitchAim - this.pitch) < 0.002) {
        this.yaw = aim;
        this.pitch = pitchAim;
        this.finish();
      }
    } else if (j.settling) this.finish();
  }

  private finish() {
    this.arrived = this.journey;
    this.journey = null;
  }

  private readonly tmp: [number, number] = [0, 0];

  private pointAt(j: Journey, s: number) {
    let seg = j.seg;
    while (seg < j.points.length - 2 && j.cum[seg + 1] < s) seg++;
    if (s === j.s) j.seg = seg;
    const a = j.points[seg], b = j.points[Math.min(seg + 1, j.points.length - 1)];
    const span = j.cum[Math.min(seg + 1, j.cum.length - 1)] - j.cum[seg];
    const t = span > 1e-6 ? clamp((s - j.cum[seg]) / span, 0, 1) : 1;
    this.tmp[0] = a[0] + (b[0] - a[0]) * t;
    this.tmp[1] = a[1] + (b[1] - a[1]) * t;
  }
}
