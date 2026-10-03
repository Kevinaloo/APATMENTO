/* Lamp proxies: three PointLights stand in for every authored lamp.

   The number of lights is part of every shader, so a tour with seven lamps
   pays for seven lights on every pixel, and switching lamps on or off would
   recompile the scene. Instead a fixed set of three lights follows the three
   authored lamps nearest the guest (in dollhouse and plan: the three
   brightest). When the nearest set changes, the slot giving up its lamp
   fades out, jumps while dark, and fades in on the new one, so nothing pops
   and the light count never changes. */
import * as T from 'three';
import type { Vec3 } from '../contract';

const SLOTS = 3;
const FADE_PER_SECOND = 3.2;
/** A lamp already shown keeps its slot until a rival is this much closer (metres): no flicker on boundaries. */
const STICKY = 0.6;

type Slot = { lamp: number; fade: number };

export class LampProxies {
  readonly lights: T.PointLight[] = [];
  private readonly slots: Slot[] = [];
  private readonly positions: Float32Array;
  private readonly power: Float32Array;
  private readonly wanted = new Int32Array(SLOTS);
  private readonly wantedDist = new Float32Array(SLOTS);
  private readonly brightest = new Int32Array(SLOTS).fill(-1);
  private level = 1;

  constructor(lamps: { position: Vec3; intensity: number }[], parent: T.Object3D) {
    this.positions = new Float32Array(lamps.length * 3);
    this.power = new Float32Array(lamps.length);
    lamps.forEach((lamp, i) => {
      this.positions.set(lamp.position, i * 3);
      this.power[i] = lamp.intensity;
    });
    for (let i = 0; i < SLOTS; i++) {
      // Same colour, range and falloff as the authored lamps of the old viewers.
      const light = new T.PointLight('#fff1d8', 0, 9, 2);
      light.castShadow = false;
      parent.add(light);
      this.lights.push(light);
      this.slots.push({ lamp: -1, fade: 0 });
    }
    // The three brightest, for dollhouse and plan.
    const order = Array.from(this.power.keys()).sort((a, b) => this.power[b] - this.power[a]);
    for (let i = 0; i < SLOTS && i < order.length; i++) this.brightest[i] = order[i];
  }

  /** Sum of all authored lamp power, and the share the proxies currently carry (for ambient compensation). */
  coverage() {
    let all = 0, shown = 0;
    for (let i = 0; i < this.power.length; i++) all += this.power[i];
    for (let i = 0; i < SLOTS; i++) { const s = this.slots[i]; if (s.lamp >= 0) shown += this.power[s.lamp] * s.fade; }
    return all > 0 ? shown / all : 1;
  }

  setLevel(level: number) { this.level = level; }

  setColor(color: T.Color) { for (let i = 0; i < SLOTS; i++) this.lights[i].color.copy(color); }

  /**
   * @param viewer   world position of the guest, or null to use the brightest lamps
   * @param instant  jump without fading (reduced motion, teleports)
   * @returns true while anything changed (the frame must be drawn)
   */
  update(dt: number, viewer: T.Vector3 | null, instant: boolean): boolean {
    const n = this.power.length;
    if (!n) return false;
    if (viewer) this.pickNearest(viewer);
    else for (let i = 0; i < SLOTS; i++) this.wanted[i] = this.brightest[i];

    // Index loops throughout: this runs every moving frame and must not allocate iterators.
    let changed = false;
    for (let i = 0; i < SLOTS; i++) {
      const slot = this.slots[i];
      const keep = slot.lamp >= 0 && this.isWanted(slot.lamp);
      let target = keep ? 1 : 0;
      if (!keep && (slot.fade <= 0.001 || instant)) {
        // Dark (or allowed to cut): take a wanted lamp nobody shows yet.
        const next = this.unassigned();
        if (next !== slot.lamp) { slot.lamp = next; changed = true; }
        target = next >= 0 ? 1 : 0;
        if (instant) slot.fade = 0;
      }
      const step = instant ? 1 : FADE_PER_SECOND * dt;
      const fade = slot.fade < target ? Math.min(target, slot.fade + step) : Math.max(target, slot.fade - step);
      if (fade !== slot.fade) { slot.fade = fade; changed = true; }
    }
    for (let i = 0; i < SLOTS; i++) {
      const slot = this.slots[i], light = this.lights[i];
      const intensity = slot.lamp >= 0 ? this.power[slot.lamp] * this.level * slot.fade : 0;
      if (light.intensity !== intensity) { light.intensity = intensity; changed = true; }
      if (slot.lamp >= 0) {
        const p = slot.lamp * 3;
        light.position.set(this.positions[p], this.positions[p + 1], this.positions[p + 2]);
      }
    }
    return changed;
  }

  private isWanted(lamp: number) {
    for (let i = 0; i < SLOTS; i++) if (this.wanted[i] === lamp) return true;
    return false;
  }

  private unassigned() {
    for (let i = 0; i < SLOTS; i++) {
      const lamp = this.wanted[i];
      if (lamp < 0) continue;
      let taken = false;
      for (let k = 0; k < SLOTS; k++) if (this.slots[k].lamp === lamp) { taken = true; break; }
      if (!taken) return lamp;
    }
    return -1;
  }

  /** The three nearest lamps, with a head start for lamps already shown. Insertion into a fixed array: no allocation. */
  private pickNearest(viewer: T.Vector3) {
    this.wanted.fill(-1);
    this.wantedDist.fill(Infinity);
    for (let i = 0; i < this.power.length; i++) {
      const p = i * 3;
      let d = Math.hypot(this.positions[p] - viewer.x, this.positions[p + 1] - viewer.y, this.positions[p + 2] - viewer.z);
      for (let k = 0; k < SLOTS; k++) if (this.slots[k].lamp === i && this.slots[k].fade > 0) { d -= STICKY; break; }
      for (let k = 0; k < SLOTS; k++) {
        if (d < this.wantedDist[k]) {
          for (let m = SLOTS - 1; m > k; m--) { this.wanted[m] = this.wanted[m - 1]; this.wantedDist[m] = this.wantedDist[m - 1]; }
          this.wanted[k] = i;
          this.wantedDist[k] = d;
          break;
        }
      }
    }
  }
}
