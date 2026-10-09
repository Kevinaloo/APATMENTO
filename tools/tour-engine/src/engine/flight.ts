/* Camera flights between modes: out of the walk and up over the
   dollhouse, down into a room, up to the floor plan.

   The eye travels a cubic Bézier whose handles rise straight up from the
   end that is inside the flat, so the camera leaves (or enters) through the
   ceiling instead of sliding through a wall. The point it looks at moves in
   a straight line, and the field of view eases along with it. */
import * as T from 'three';
import { easeInOutCubic } from './util';

export class Flight {
  active = false;
  private t = 0;
  private duration = 0.9;
  private readonly p0 = new T.Vector3();
  private readonly c0 = new T.Vector3();
  private readonly c1 = new T.Vector3();
  private readonly p1 = new T.Vector3();
  private readonly a0 = new T.Vector3();
  private readonly a1 = new T.Vector3();
  private readonly look = new T.Vector3();
  private fov0 = 60;
  private fov1 = 60;

  /**
   * @param riseFrom metres the path first climbs above the start (leaving a room)
   * @param riseTo   metres the path drops from above the end (entering a room)
   */
  start(fromEye: T.Vector3, fromLook: T.Vector3, fromFov: number, toEye: T.Vector3, toLook: T.Vector3, toFov: number, riseFrom: number, riseTo: number, duration = 0.9) {
    this.p0.copy(fromEye);
    this.p1.copy(toEye);
    this.c0.copy(fromEye).y += riseFrom;
    this.c1.copy(toEye).y += riseTo;
    if (!riseFrom) this.c0.lerpVectors(fromEye, toEye, 0.33);
    if (!riseTo) this.c1.lerpVectors(fromEye, toEye, 0.66);
    this.a0.copy(fromLook);
    this.a1.copy(toLook);
    this.fov0 = fromFov;
    this.fov1 = toFov;
    this.duration = duration;
    this.t = 0;
    this.active = true;
  }

  /** Advance and pose the camera. Returns true on the frame the flight lands. */
  step(dt: number, camera: T.PerspectiveCamera): boolean {
    if (!this.active) return false;
    this.t = Math.min(1, this.t + dt / this.duration);
    const k = easeInOutCubic(this.t), u = 1 - k;
    const b0 = u * u * u, b1 = 3 * u * u * k, b2 = 3 * u * k * k, b3 = k * k * k;
    camera.position.set(
      b0 * this.p0.x + b1 * this.c0.x + b2 * this.c1.x + b3 * this.p1.x,
      b0 * this.p0.y + b1 * this.c0.y + b2 * this.c1.y + b3 * this.p1.y,
      b0 * this.p0.z + b1 * this.c0.z + b2 * this.c1.z + b3 * this.p1.z,
    );
    this.look.lerpVectors(this.a0, this.a1, k);
    camera.lookAt(this.look);
    const fov = this.fov0 + (this.fov1 - this.fov0) * k;
    if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    camera.updateMatrixWorld();
    if (this.t >= 1) { this.active = false; return true; }
    return false;
  }

  cancel() { this.active = false; }
}
