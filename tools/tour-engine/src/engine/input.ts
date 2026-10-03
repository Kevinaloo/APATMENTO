/* Every way a guest can steer: keyboard, mouse (drag, wheel, pointer lock),
   touch (drag, pinch, tap), gyroscope and gamepad.

   Input only records intent and forwards discrete gestures to the engine
   (InputSink). Continuous movement is integrated once per frame by the
   walker, so key repeat rates and event timing never change how fast the
   guest walks. */
import * as T from 'three';
import type { Mode } from '../contract';
import { angleDelta } from './util';

export type InputSink = {
  ready(): boolean;
  paused(): boolean;
  mode(): Mode;
  /** Look by a delta, radians. A manual input: pauses the guided tour. */
  look(dYaw: number, dPitch: number): void;
  fov(): number;
  setFov(deg: number): void;
  hover(clientX: number, clientY: number): void;
  hoverEnd(): void;
  tap(clientX: number, clientY: number, touch: boolean): void;
  /** A drag began: the guest took the view. */
  dragStart(): void;
  /** Movement keys or sticks went live. */
  manual(): void;
  wake(): void;
  lockChanged(locked: boolean): void;
  nextRoom(): void;
};

export type Intents = { strafe: number; forward: number; turn: number; pitch: number; run: boolean };

type Pointer = { x: number; y: number; sx: number; sy: number; t: number; touch: boolean; moved: boolean };

const MOVE: Record<string, [number, number]> = {
  KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
};
const LOOK_KEYS = new Set(['KeyQ', 'KeyE', 'KeyR', 'KeyF']);
const RUN_KEYS = new Set(['ShiftLeft', 'ShiftRight']);
const TEXT_INPUT = /^(text|search|email|url|tel|password|number|date|datetime-local|month|time|week)$/;

/** Typing somewhere: no key is ours. */
function typing(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return true;
  return target.tagName === 'INPUT' && TEXT_INPUT.test((target as HTMLInputElement).type || 'text');
}

/** A focused control that uses the arrow keys itself (sliders, tabs, menus). Letters still walk. */
function arrowWidget(target: EventTarget | null) {
  return target instanceof HTMLElement && !!target.closest('input,select,[role=slider],[role=tab],[role=tablist],[role=radio],[role=radiogroup],[role=menu],[role=menuitem],[role=listbox],[role=option],[role=spinbutton]');
}

const deadzone = (v: number) => (Math.abs(v) < 0.15 ? 0 : (v - Math.sign(v) * 0.15) / 0.85);

export class Input {
  readonly keys = new Set<string>();
  /** Analog movement from the UI's joystick (move()). */
  padX = 0;
  padZ = 0;
  /** Run held from the UI (setRun). */
  runHeld = false;
  locked = false;
  gamepads = 0;
  private readonly pointers = new Map<number, Pointer>();
  private pinch: { d0: number; fov0: number } | null = null;
  private readonly gp = { x: 0, z: 0, lookX: 0, lookY: 0, run: false, a: false, live: false };
  private gyroOn = false;
  private gyroFresh = false;
  private gyroPrimed = false;
  private gyroSeen = false;
  private gyroWaiter: ((ok: boolean) => void) | null = null;
  private readonly orientation = { alpha: 0, beta: 0, gamma: 0 };
  private gyroYaw = 0;
  private gyroPitch = 0;
  private readonly euler = new T.Euler();
  private readonly q = new T.Quaternion();
  private readonly q0 = new T.Quaternion();
  private readonly q1 = new T.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
  private readonly zee = new T.Vector3(0, 0, 1);
  private readonly forward = new T.Vector3();
  private readonly listeners: [EventTarget, string, EventListener, AddEventListenerOptions | undefined][] = [];

  constructor(private readonly canvas: HTMLCanvasElement, private readonly sink: InputSink) {
    const on = (target: EventTarget, type: string, fn: (e: never) => void, options?: AddEventListenerOptions) => {
      target.addEventListener(type, fn as EventListener, options);
      this.listeners.push([target, type, fn as EventListener, options]);
    };
    on(canvas, 'pointerdown', this.down);
    on(canvas, 'pointermove', this.move);
    on(canvas, 'pointerup', this.up);
    on(canvas, 'pointercancel', this.up);
    on(canvas, 'pointerleave', this.leave);
    on(canvas, 'wheel', this.wheel, { passive: false });
    on(canvas, 'contextmenu', (e: Event) => e.preventDefault());
    on(window, 'keydown', this.keydown);
    on(window, 'keyup', this.keyup);
    on(window, 'blur', () => this.clear());
    on(document, 'pointerlockchange', this.lockChange);
    on(document, 'mousemove', this.lockedMove);
    on(window, 'gamepadconnected', this.padsChanged);
    on(window, 'gamepaddisconnected', this.padsChanged);
    this.padsChanged();
  }

  /* Key state is summed when keys change, not per frame, so read() never iterates (or allocates). */
  private held = { strafe: 0, forward: 0, turn: 0, pitch: 0, run: false };

  private recount() {
    const h = this.held;
    h.strafe = h.forward = h.turn = h.pitch = 0;
    h.run = false;
    this.keys.forEach(code => {
      const m = MOVE[code];
      if (m) { h.strafe += m[0]; h.forward += m[1]; }
      else if (code === 'KeyQ') h.turn += 1;
      else if (code === 'KeyE') h.turn -= 1;
      else if (code === 'KeyR') h.pitch += 1;
      else if (code === 'KeyF') h.pitch -= 1;
      else if (RUN_KEYS.has(code)) h.run = true;
    });
  }

  /** Current movement intent, all sources combined. Writes into `out`: no allocation. */
  read(out: Intents) {
    const h = this.held;
    out.strafe = Math.max(-1, Math.min(1, h.strafe + this.padX + this.gp.x));
    out.forward = Math.max(-1, Math.min(1, h.forward + this.padZ + this.gp.z));
    out.turn = h.turn - this.gp.lookX * 1.6;
    out.pitch = h.pitch - this.gp.lookY * 1.1;
    out.run = this.runHeld || this.gp.run || h.run;
    return out;
  }

  /** Anything held that needs frames to keep coming. */
  get active() {
    return this.keys.size > 0 || this.padX !== 0 || this.padZ !== 0 || this.gp.live || this.gamepads > 0 || this.gyroOn;
  }

  clear() {
    this.keys.clear();
    this.recount();
    this.padX = this.padZ = 0;
    this.runHeld = false;
    this.pointers.clear();
    this.pinch = null;
  }

  /* ── pointer ─────────────────────────────────────────────── */

  private down = (e: PointerEvent) => {
    if (!this.sink.ready() || this.sink.paused()) return;
    if (this.locked) {
      // In mouse-look the crosshair is the cursor: a click walks to the middle of the view.
      if (e.button === 0) {
        const r = this.canvas.getBoundingClientRect();
        this.sink.tap(r.left + r.width / 2, r.top + r.height / 2, false);
      }
      return;
    }
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const touch = e.pointerType !== 'mouse';
    // Take focus from whatever UI control had it, so arrow keys walk instead of moving a slider.
    if (!touch) this.canvas.focus({ preventScroll: true });
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), touch, moved: false });
    if (this.sink.mode() !== 'walk') return;
    try { this.canvas.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    if (this.pointers.size === 2) {
      let d = 0, x = 0, y = 0, first = true;
      for (const p of this.pointers.values()) {
        p.moved = true;
        if (first) { x = p.x; y = p.y; first = false; } else d = Math.hypot(p.x - x, p.y - y);
      }
      this.pinch = { d0: Math.max(20, d), fov0: this.sink.fov() };
    }
  };

  private move = (e: PointerEvent) => {
    if (this.locked) return;
    const p = this.pointers.get(e.pointerId);
    if (!p) {
      if (e.pointerType === 'mouse' && this.sink.ready() && !this.sink.paused()) this.sink.hover(e.clientX, e.clientY);
      return;
    }
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (!p.moved && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > (p.touch ? 10 : 5)) {
      p.moved = true;
      if (this.sink.mode() === 'walk') this.sink.dragStart();
    }
    if (this.sink.mode() !== 'walk' || !p.moved) return;
    if (this.pinch && this.pointers.size >= 2) {
      let d = 0, x = 0, y = 0, first = true;
      for (const q of this.pointers.values()) {
        if (first) { x = q.x; y = q.y; first = false; } else d = Math.hypot(q.x - x, q.y - y);
      }
      if (d > 0) this.sink.setFov(this.pinch.fov0 * this.pinch.d0 / d);
      return;
    }
    const fov = this.sink.fov();
    if (p.touch) {
      // Touch grabs the scene: it stays under the finger, like a photo sphere.
      const k = (fov * Math.PI / 180) / Math.max(1, this.canvas.clientHeight);
      this.sink.look(dx * k, dy * k);
    } else {
      // Mouse drags the gaze, as the earlier Cabana viewers did.
      const k = 0.0034 * fov / 60;
      this.sink.look(-dx * k, -dy * k * 0.85);
    }
  };

  private up = (e: PointerEvent) => {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinch = null;
    if (e.type === 'pointerup' && !p.moved && performance.now() - p.t < 700 && !this.sink.paused()) this.sink.tap(e.clientX, e.clientY, p.touch);
  };

  private leave = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && !this.pointers.has(e.pointerId)) this.sink.hoverEnd();
  };

  private wheel = (e: WheelEvent) => {
    if (this.sink.mode() !== 'walk' || !this.sink.ready() || this.sink.paused()) return;
    e.preventDefault();
    const lines = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    this.sink.setFov(this.sink.fov() + e.deltaY * lines * 0.03);
  };

  /* ── keyboard ────────────────────────────────────────────── */

  private keydown = (e: KeyboardEvent) => {
    if (!this.sink.ready() || this.sink.paused() || e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
    if (this.sink.mode() !== 'walk') return;
    const code = e.code;
    if (code.startsWith('Arrow') && arrowWidget(e.target)) return;
    if (MOVE[code] || LOOK_KEYS.has(code) || RUN_KEYS.has(code)) {
      if (!RUN_KEYS.has(code)) e.preventDefault();
      if (!this.keys.has(code)) {
        this.keys.add(code);
        this.recount();
        if (!RUN_KEYS.has(code)) this.sink.manual();
        this.sink.wake();
      }
      return;
    }
    if (e.key === '+' || e.key === '=' || code === 'NumpadAdd') { e.preventDefault(); this.sink.setFov(this.sink.fov() - 5); }
    else if (e.key === '-' || e.key === '_' || code === 'NumpadSubtract') { e.preventDefault(); this.sink.setFov(this.sink.fov() + 5); }
  };

  private keyup = (e: KeyboardEvent) => {
    if (this.keys.delete(e.code)) { this.recount(); this.sink.wake(); }
  };

  /* ── pointer lock ────────────────────────────────────────── */

  requestLock(on: boolean) {
    if (on) {
      if (document.pointerLockElement === this.canvas || !this.canvas.requestPointerLock) return;
      try {
        const result = this.canvas.requestPointerLock() as unknown as Promise<void> | undefined;
        if (result && typeof result.catch === 'function') result.catch(() => this.sink.lockChanged(false));
      } catch { this.sink.lockChanged(false); }
    } else if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }

  private lockChange = () => {
    const locked = document.pointerLockElement === this.canvas;
    if (locked === this.locked) return;
    this.locked = locked;
    this.pointers.clear();
    this.sink.lockChanged(locked);
  };

  private lockedMove = (e: MouseEvent) => {
    if (!this.locked || this.sink.paused()) return;
    const k = 0.0023 * this.sink.fov() / 60;
    this.sink.look(-e.movementX * k, -e.movementY * k);
  };

  /* ── gamepad ─────────────────────────────────────────────── */

  private padsChanged = () => {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let n = 0;
    for (let i = 0; i < pads.length; i++) if (pads[i]) n++;
    this.gamepads = n;
    if (!n) { this.gp.x = this.gp.z = this.gp.lookX = this.gp.lookY = 0; this.gp.run = this.gp.live = false; }
    this.sink.wake();
  };

  /** Polled once per frame, and only while a pad is connected. */
  pollGamepad() {
    if (!this.gamepads || !navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    let pad: Gamepad | null = null;
    for (let i = 0; i < pads.length; i++) { const p = pads[i]; if (p && p.connected) { pad = p; break; } }
    if (!pad || this.sink.paused() || this.sink.mode() !== 'walk') { this.gp.live = false; return; }
    const ax = pad.axes;
    this.gp.x = deadzone(ax[0] || 0);
    this.gp.z = -deadzone(ax[1] || 0);
    this.gp.lookX = deadzone(ax[2] || 0);
    this.gp.lookY = deadzone(ax[3] || 0);
    const trigger = pad.buttons[7];
    this.gp.run = !!trigger && (trigger.pressed || trigger.value > 0.3);
    const live = this.gp.x !== 0 || this.gp.z !== 0 || this.gp.lookX !== 0 || this.gp.lookY !== 0;
    if (live && !this.gp.live) this.sink.manual();
    this.gp.live = live;
    const a = !!pad.buttons[0] && pad.buttons[0].pressed;
    if (a && !this.gp.a) this.sink.nextRoom();
    this.gp.a = a;
  }

  /* ── gyroscope ───────────────────────────────────────────── */

  async enableGyro(): Promise<boolean> {
    type Permission = { requestPermission?: () => Promise<string> };
    const DOE = (window as unknown as { DeviceOrientationEvent?: Permission }).DeviceOrientationEvent;
    if (!DOE) return false;
    if (typeof DOE.requestPermission === 'function') {
      // iOS: must be asked inside the tap that turned the gyro on.
      try { if ((await DOE.requestPermission()) !== 'granted') return false; } catch { return false; }
    }
    this.gyroOn = true;
    this.gyroPrimed = false;
    this.gyroSeen = false;
    window.addEventListener('deviceorientation', this.orient);
    // Desktops expose the event but never fire it with data: wait briefly for a real reading.
    const ok = await new Promise<boolean>(resolve => {
      this.gyroWaiter = resolve;
      setTimeout(() => resolve(this.gyroSeen), 1000);
    });
    this.gyroWaiter = null;
    if (!ok) this.disableGyro();
    return ok;
  }

  disableGyro() {
    this.gyroOn = false;
    window.removeEventListener('deviceorientation', this.orient);
  }

  private orient = (e: DeviceOrientationEvent) => {
    if (e.alpha == null || e.beta == null || e.gamma == null) return;
    this.orientation.alpha = e.alpha;
    this.orientation.beta = e.beta;
    this.orientation.gamma = e.gamma;
    this.gyroFresh = true;
    if (!this.gyroSeen) { this.gyroSeen = true; this.gyroWaiter?.(true); }
    this.sink.wake();
  };

  /**
   * How far the phone turned since the last frame, relative to where it was
   * when the gyro was switched on. Drag keeps adding on top because the
   * engine folds these deltas into the same yaw/pitch the drag moves.
   */
  gyroDelta(out: { yaw: number; pitch: number }) {
    if (!this.gyroOn || !this.gyroFresh) return false;
    this.gyroFresh = false;
    const d = Math.PI / 180, o = this.orientation;
    const screenAngle = (screen.orientation && screen.orientation.angle) || 0;
    this.euler.set(o.beta * d, o.alpha * d, -o.gamma * d, 'YXZ');
    this.q.setFromEuler(this.euler).multiply(this.q1).multiply(this.q0.setFromAxisAngle(this.zee, -screenAngle * d));
    this.forward.set(0, 0, -1).applyQuaternion(this.q);
    const yaw = Math.atan2(this.forward.x, this.forward.z);
    const pitch = Math.asin(Math.max(-1, Math.min(1, this.forward.y)));
    if (!this.gyroPrimed) {
      this.gyroPrimed = true;
      this.gyroYaw = yaw;
      this.gyroPitch = pitch;
      return false;
    }
    out.yaw = angleDelta(this.gyroYaw, yaw);
    out.pitch = pitch - this.gyroPitch;
    this.gyroYaw = yaw;
    this.gyroPitch = pitch;
    return out.yaw !== 0 || out.pitch !== 0;
  }

  dispose() {
    this.disableGyro();
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    for (const [target, type, fn, options] of this.listeners) target.removeEventListener(type, fn, options);
    this.listeners.length = 0;
    this.clear();
  }
}
