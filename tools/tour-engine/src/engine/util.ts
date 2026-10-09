/* Small numeric helpers shared by the engine. Everything here is
   allocation-free so it can run inside the frame loop. */

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function smoothstep(e0: number, e1: number, x: number) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Share of the remaining gap to close this frame, so easing feels the same at 30, 60 or 120 Hz. */
export const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

/** Shortest signed angle from a to b, radians. */
export const angleDelta = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export const mod = (a: number, n: number) => ((a % n) + n) % n;

export const isLocalHost = () => /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

/** Give the browser a turn (input, paint) between expensive startup stages. */
export const nextTask = () => new Promise<void>(resolve => setTimeout(resolve));

export const EYE_DEFAULT = 1.6;
export const PLAYER_RADIUS = 0.16;
