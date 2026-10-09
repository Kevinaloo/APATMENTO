/* Quality tiers and the adaptive resolution governor.

   A tier fixes the expensive, rarely-changing things (shadow map size,
   ambient occlusion on still frames, mirror resolution). Within a tier the
   governor moves the drawing-buffer pixel ratio in 0.15 steps, which is the
   one knob that scales the cost of every moving frame.

   Frame time is the interval between consecutive rendered frames while the
   view moves. On a 60 Hz screen that interval cannot fall below 16.7 ms,
   so "fast" also counts frames that hold the refresh rate while our own
   per-frame work stays small: that is the headroom a step up spends. A step
   up that is followed by slowness within a few seconds sets a ceiling, so
   the governor settles instead of oscillating. */
import type { Tier } from '../contract';
import { clamp } from './util';

export type TierSpec = {
  /** Pixel ratio of a refined still frame, and the most a moving frame may use. */
  dpr: number;
  /** Below this the governor steps down a whole tier. */
  floor: number;
  shadow: number;
  ao: boolean;
  /** Mirror render-target size in pixels; 0 = live mirror off. */
  mirror: number;
};

export const TIER_ORDER: Tier[] = ['battery', 'balanced', 'high', 'ultra'];

export function tierTable(deviceDpr: number): Record<Tier, TierSpec> {
  const d = Math.max(0.5, deviceDpr || 1);
  return {
    ultra: { dpr: Math.min(d, 2), floor: 1.5, shadow: 2048, ao: true, mirror: 512 },
    high: { dpr: Math.min(d, 1.5), floor: 1, shadow: 2048, ao: true, mirror: 512 },
    balanced: { dpr: clamp(d, 1, 1.25), floor: 0.85, shadow: 1024, ao: false, mirror: 256 },
    battery: { dpr: 0.75, floor: 0.6, shadow: 1024, ao: false, mirror: 0 },
  };
}

const STEP = 0.15;
const round = (v: number) => Math.round(v * 100) / 100;

export class Governor {
  tier: Tier;
  /** Pixel ratio used for moving frames. */
  dpr: number;
  auto = true;
  /** Smoothed interval between moving frames, ms. */
  frameMs = 16.7;
  workMs = 4;
  private slowFor = 0;
  private fastFor = 0;
  private holdUntil = 0;
  private lastUpAt = -1e9;
  private lastUpFromDpr = 0;
  private lastUpFromTier: Tier = 'battery';
  private ceilingDpr = Infinity;
  private ceilingTier = 3;
  readonly table: Record<Tier, TierSpec>;
  private readonly maxTier: number;
  private readonly startTier: Tier;

  constructor(deviceDpr: number, coarse: boolean) {
    this.table = tierTable(deviceDpr);
    // Ultra only means something where the screen is denser than high's cap.
    this.maxTier = deviceDpr > 1.5 && !coarse ? 3 : 2;
    this.startTier = coarse ? 'balanced' : 'high';
    this.tier = this.startTier;
    this.dpr = this.table[this.tier].dpr;
  }

  get spec(): TierSpec { return this.table[this.tier]; }

  /** Manual tier, or back to auto from the device's starting tier (it adapts from there). */
  set(tier: Tier | 'auto') {
    if (tier === 'auto') {
      this.auto = true;
      this.tier = this.startTier;
      this.ceilingDpr = Infinity;
      this.ceilingTier = this.maxTier;
    } else {
      this.auto = false;
      this.tier = tier;
    }
    this.dpr = this.table[this.tier].dpr;
    this.slowFor = this.fastFor = 0;
  }

  /**
   * One moving frame. Returns true when tier or pixel ratio changed.
   * @param interval ms since the previous moving frame
   * @param work     ms our own code spent on this frame (simulation + render submission)
   */
  sample(now: number, interval: number, work: number): boolean {
    if (interval <= 0) return false;
    // A very slow device must still read as slow; one hitch must not weigh like ten frames.
    interval = Math.min(interval, 250);
    this.frameMs += (interval - this.frameMs) * 0.1;
    this.workMs += (work - this.workMs) * 0.1;
    if (!this.auto || now < this.holdUntil) return false;
    if (this.frameMs > 20) {
      this.slowFor += interval;
      this.fastFor = 0;
    } else if (this.frameMs < 12 || (this.frameMs < 18.5 && this.workMs < 6)) {
      this.fastFor += interval;
      this.slowFor = 0;
    } else {
      this.slowFor = Math.max(0, this.slowFor - interval);
      this.fastFor = Math.max(0, this.fastFor - interval);
    }
    if (this.slowFor > 1000) return this.stepDown(now);
    if (this.fastFor > 3000) return this.stepUp(now);
    return false;
  }

  private stepDown(now: number) {
    this.slowFor = this.fastFor = 0;
    this.holdUntil = now + 800;
    if (now - this.lastUpAt < 5000) {
      // The last step up did not hold: never climb past where we came from.
      this.ceilingDpr = this.lastUpFromDpr;
      this.ceilingTier = TIER_ORDER.indexOf(this.lastUpFromTier);
    }
    let dpr = round(this.dpr - STEP);
    let index = TIER_ORDER.indexOf(this.tier);
    if (dpr < this.table[this.tier].floor - 1e-3) {
      if (index === 0) {
        dpr = this.table.battery.floor;
        if (dpr >= this.dpr) return false;
      } else {
        index--;
        dpr = Math.min(dpr, this.table[TIER_ORDER[index]].dpr);
      }
    }
    this.tier = TIER_ORDER[index];
    this.dpr = dpr;
    return true;
  }

  private stepUp(now: number) {
    this.fastFor = 0;
    this.holdUntil = now + 800;
    const spec = this.table[this.tier];
    const index = TIER_ORDER.indexOf(this.tier);
    const fromDpr = this.dpr, fromTier = this.tier;
    const next = round(this.dpr + STEP);
    if (next <= Math.min(spec.dpr, this.ceilingDpr) + 1e-3) this.dpr = next;
    else if (this.dpr < spec.dpr - 1e-3 && spec.dpr <= this.ceilingDpr) this.dpr = spec.dpr;
    else if (index < Math.min(this.maxTier, this.ceilingTier)) this.tier = TIER_ORDER[index + 1];
    else return false;
    this.lastUpAt = now;
    this.lastUpFromDpr = fromDpr;
    this.lastUpFromTier = fromTier;
    return true;
  }
}
