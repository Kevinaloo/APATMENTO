/* The footprint: a soft ring lying on the floor where a click would walk to.

   It is a DOM element projected onto the floor plane with a CSS matrix3d
   built from the camera, not a mesh. Following the cursor therefore costs
   no WebGL frame at all: the refined still frame (with its ambient
   occlusion) stays on screen while the guest hovers around, instead of
   dropping back to the fast path on every mouse move. Only valid floor is
   ever marked (walkable, in plain sight), so the ring never needs depth
   testing against walls. */
import * as T from 'three';

const PX = 160;          // element size in CSS pixels
const SIZE = 0.5;        // ring diameter on the floor, metres
const LIFT = 0.012;      // just above the floor, so it reads as lying on it

class Ring {
  readonly el: HTMLDivElement;
  private readonly face: HTMLDivElement;
  x = 0;
  z = 0;
  shown = false;
  private pulse: Animation | null = null;

  constructor(parent: HTMLElement, accent: string, destination: boolean) {
    this.el = document.createElement('div');
    this.el.style.cssText = `position:absolute;left:0;top:0;width:${PX}px;height:${PX}px;transform-origin:0 0;pointer-events:none;visibility:hidden;will-change:transform`;
    this.face = document.createElement('div');
    const ring = destination ? accent : 'rgba(255,255,255,.95)';
    this.face.style.cssText = 'position:absolute;inset:0;border-radius:50%;opacity:0;transition:opacity .22s ease;'
      + `background:radial-gradient(circle,rgba(255,255,255,${destination ? '.16' : '.1'}) 0 38%,transparent 43%),`
      + `radial-gradient(circle,transparent 0 50%,${ring} 55%,${ring} 58%,transparent 64%),`
      + 'radial-gradient(circle,transparent 0 58%,rgba(0,0,0,.2) 63%,transparent 72%)';
    this.el.appendChild(this.face);
    parent.appendChild(this.el);
  }

  place(x: number, z: number) { this.x = x; this.z = z; }

  show(on: boolean) {
    if (this.shown === on) return;
    this.shown = on;
    this.face.style.opacity = on ? '1' : '0';
    if (on) this.el.style.visibility = 'visible';
  }

  breathe(on: boolean, reduced: boolean) {
    if (on && !this.pulse && !reduced && this.face.animate) {
      this.pulse = this.face.animate([{ transform: 'scale(.86)' }, { transform: 'scale(1.04)' }, { transform: 'scale(.86)' }], { duration: 1400, iterations: Infinity, easing: 'ease-in-out' });
    } else if (!on && this.pulse) {
      this.pulse.cancel();
      this.pulse = null;
    }
  }

  /** A little "no" shake, sideways along the floor. */
  shake(reduced: boolean) {
    if (reduced || !this.el.animate) return;
    this.face.animate([
      { transform: 'translateX(0)' }, { transform: 'translateX(-12%)' }, { transform: 'translateX(10%)' },
      { transform: 'translateX(-6%)' }, { transform: 'translateX(3%)' }, { transform: 'translateX(0)' },
    ], { duration: 420, easing: 'ease-out' });
  }

  hide() { this.el.style.visibility = 'hidden'; }
}

export class Footprint {
  readonly layer: HTMLDivElement;
  /** Follows the cursor (mouse only). */
  readonly cursor: Ring;
  /** Marks where a click-walk is heading. */
  readonly target: Ring;
  private readonly model = new T.Matrix4();
  private readonly m = new T.Matrix4();
  private readonly screen = new T.Matrix4();

  constructor(host: HTMLElement, accent: string) {
    this.layer = document.createElement('div');
    this.layer.setAttribute('aria-hidden', 'true');
    this.layer.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none;contain:strict';
    host.appendChild(this.layer);
    this.cursor = new Ring(this.layer, accent, false);
    this.target = new Ring(this.layer, accent, true);
  }

  get visible() { return this.cursor.shown || this.target.shown; }

  /** Re-project the visible rings for the current camera. Only called when a ring is shown and something moved. */
  update(camera: T.Camera, width: number, height: number) {
    this.project(this.cursor, camera, width, height);
    this.project(this.target, camera, width, height);
  }

  private project(ring: Ring, camera: T.Camera, width: number, height: number) {
    if (!ring.shown) {
      // Let the fade-out finish before taking it out of the layout.
      return;
    }
    const k = SIZE / PX;
    // Element pixels (u, v) → floor (x, z); element z → world y so the matrix stays invertible (CSS hides singular ones).
    this.model.set(
      k, 0, 0, ring.x - SIZE / 2,
      0, 0, 1, LIFT,
      0, k, 0, ring.z - SIZE / 2,
      0, 0, 0, 1,
    );
    this.screen.set(
      width / 2, 0, 0, width / 2,
      0, -height / 2, 0, height / 2,
      0, 0, 1, 0,
      0, 0, 0, 1,
    );
    this.m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(this.model).premultiply(this.screen);
    const e = this.m.elements;
    // Every corner must be in front of the camera, or the projective division flips it.
    if (e[15] < 0.05 || e[3] * PX + e[15] < 0.05 || e[7] * PX + e[15] < 0.05 || (e[3] + e[7]) * PX + e[15] < 0.05) {
      ring.hide();
      return;
    }
    ring.el.style.visibility = 'visible';
    ring.el.style.transform = `matrix3d(${e[0]},${e[1]},${e[2]},${e[3]},${e[4]},${e[5]},${e[6]},${e[7]},${e[8]},${e[9]},${e[10]},${e[11]},${e[12]},${e[13]},${e[14]},${e[15]})`;
  }

  dispose() { this.layer.remove(); }
}
