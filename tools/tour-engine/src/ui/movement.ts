/* Getting around.

   Desktop: a key chip whose W A S D caps are real buttons (they light up when
   the physical keys are pressed, and can be held with the mouse), plus the
   Mouse look switch.
   Touch: a joystick that appears wherever the left thumb lands in the lower
   left of the screen, a Run button to hold, and motion look. Dragging
   anywhere else still looks around, which the engine handles itself. */
import { attr, h, isTyping, text } from './dom';
import { icon } from './icons';
import type { Ctx } from './types';

const KEY_DIR: Record<string, [number, number]> = { w: [0, 1], a: [-1, 0], s: [0, -1], d: [1, 0] };
const CODE_KEY: Record<string, string> = { KeyW: 'w', ArrowUp: 'w', KeyA: 'a', ArrowLeft: 'a', KeyS: 's', ArrowDown: 's', KeyD: 'd', ArrowRight: 'd' };

export function mountMovement(ctx: Ctx): HTMLElement[] {
  const { store } = ctx;
  const api = () => ctx.api();

  /* ── Desktop key chip ── */
  const caps = (['w', 'a', 's', 'd'] as const).map(k => {
    const [x, z] = KEY_DIR[k];
    const label = { w: 'Walk forward', a: 'Step left', s: 'Step back', d: 'Step right' }[k];
    const b = h('button', { type: 'button', class: 'key', 'data-k': k, 'aria-label': label }, k.toUpperCase());
    const stop = () => { if (b.classList.contains('is-down')) { b.classList.remove('is-down'); api()?.move(0, 0); } };
    b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); b.classList.add('is-down'); api()?.move(x, z); });
    b.addEventListener('pointerup', stop);
    b.addEventListener('pointercancel', stop);
    b.addEventListener('lostpointercapture', stop);
    b.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); b.classList.add('is-down'); api()?.move(x, z); } });
    b.addEventListener('keyup', e => { if (e.key === 'Enter' || e.key === ' ') stop(); });
    b.addEventListener('blur', stop);
    return b;
  });
  const keysText = h('p', { class: 'kt' });
  const lookLabel = h('span', null, 'Mouse look');
  const look = h('button', { class: 'mlook', type: 'button', 'aria-pressed': 'false', onclick: () => ctx.toggleMouseLook() }, icon('mouse'), lookLabel);
  const keys = h('div', { class: 'keys gl', role: 'group', 'aria-label': 'Walking' },
    h('div', { class: 'pad' }, caps), keysText, look);

  /* The caps mirror the physical keys, so the hint teaches by itself. */
  const lit = (e: KeyboardEvent, on: boolean) => {
    const k = CODE_KEY[e.code];
    if (!k || isTyping(e.target)) return;
    caps.find(c => c.dataset.k === k)?.classList.toggle('is-lit', on);
  };
  window.addEventListener('keydown', e => lit(e, true));
  window.addEventListener('keyup', e => lit(e, false));
  window.addEventListener('blur', () => caps.forEach(c => c.classList.remove('is-lit')));

  /* ── Touch: joystick ── */
  const knob = h('i', { class: 'knob' });
  const stick = h('div', { class: 'stick', 'aria-hidden': 'true' }, knob);
  const zone = h('div', { class: 'zone', 'aria-hidden': 'true' });
  const ghost = h('div', { class: 'ghost', 'aria-hidden': 'true' }, h('i'), h('span', null, 'Hold here', h('br'), 'to walk'));
  const R = 48;
  let active = -1, ox = 0, oy = 0, t0 = 0, travelled = 0, frame = 0, mx = 0, mz = 0;
  const send = () => { frame = 0; api()?.move(mx, mz); };
  zone.addEventListener('pointerdown', e => {
    if (active !== -1) return;
    active = e.pointerId; ox = e.clientX; oy = e.clientY; t0 = performance.now(); travelled = 0;
    zone.setPointerCapture(e.pointerId);
    stick.style.transform = `translate(${ox}px, ${oy}px)`;
    knob.style.transform = '';
    stick.classList.add('is-on');
  });
  zone.addEventListener('pointermove', e => {
    if (e.pointerId !== active) return;
    let dx = e.clientX - ox, dy = e.clientY - oy;
    const dist = Math.hypot(dx, dy);
    travelled = Math.max(travelled, dist);
    if (dist > R) { dx *= R / dist; dy *= R / dist; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    /* A small dead zone so a resting thumb does not creep. */
    const mag = Math.min(1, dist / R), live = mag < 0.14 ? 0 : (mag - 0.14) / 0.86;
    mx = dist ? (dx / Math.min(dist, R)) * live : 0;
    mz = dist ? (-dy / Math.min(dist, R)) * live : 0;
    if (!frame) frame = requestAnimationFrame(send);
    if (travelled > 10 && !ctx.el.classList.contains('stick-used')) {
      ctx.el.classList.add('stick-used');
      /* Once you start walking, the room strip steps out of the way. */
      store.set({ dockOpen: false });
    }
  });
  const release = (e: PointerEvent) => {
    if (e.pointerId !== active) return;
    active = -1;
    stick.classList.remove('is-on');
    if (frame) cancelAnimationFrame(frame);
    frame = 0; mx = mz = 0;
    api()?.move(0, 0);
    /* A quick tap is not a joystick: pass it to the scene so "tap the floor
       to walk there" works here too. */
    if (e.type === 'pointerup' && travelled < 8 && performance.now() - t0 < 320) forwardTap(e.clientX, e.clientY);
  };
  zone.addEventListener('pointerup', release);
  zone.addEventListener('pointercancel', release);

  function forwardTap(x: number, y: number) {
    zone.style.pointerEvents = 'none';
    const target = document.elementFromPoint(x, y);
    zone.style.pointerEvents = '';
    if (!target || !ctx.scene.contains(target)) return;
    const base = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, screenX: x, screenY: y, button: 0, pointerId: 9001, pointerType: 'touch', isPrimary: true };
    target.dispatchEvent(new PointerEvent('pointerdown', { ...base, buttons: 1 }));
    target.dispatchEvent(new PointerEvent('pointerup', { ...base, buttons: 0 }));
    target.dispatchEvent(new MouseEvent('click', base));
  }

  /* ── Touch: run and motion look ── */
  const run = h('button', { class: 'run gl', type: 'button', 'aria-label': 'Hold to run' }, icon('run'), h('span', null, 'Run'));
  const runOff = () => { if (run.classList.contains('is-down')) { run.classList.remove('is-down'); api()?.setRun(false); } };
  run.addEventListener('pointerdown', e => { e.preventDefault(); run.setPointerCapture(e.pointerId); run.classList.add('is-down'); api()?.setRun(true); });
  run.addEventListener('pointerup', runOff);
  run.addEventListener('pointercancel', runOff);
  run.addEventListener('lostpointercapture', runOff);
  run.addEventListener('contextmenu', e => e.preventDefault());
  run.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); run.classList.add('is-down'); api()?.setRun(true); } });
  run.addEventListener('keyup', runOff);

  const gyro = h('button', { class: 'round gl gyro', type: 'button', 'aria-pressed': 'false', 'aria-label': 'Look by moving your phone', onclick: toggleGyro }, icon('gyro'));
  if (!('DeviceOrientationEvent' in window)) gyro.hidden = true;
  let asking = false;
  async function toggleGyro() {
    const a = api();
    if (!a || asking) return;
    const want = !store.get().gyro;
    asking = true;
    let ok = false;
    try { ok = await a.setGyro(want); } catch { ok = false; }
    asking = false;
    store.set({ gyro: want && ok });
    if (want) ctx.toast(ok ? 'Move your phone to look around' : 'Motion look is not available on this device', ok ? 'ok' : 'warn');
  }
  const touchCol = h('div', { class: 'tcol' }, gyro, run);

  store.on((s, c) => {
    if (c.has('mode') || c.has('input')) {
      text(keysText, '');
      keysText.append(...(s.mode === 'walk'
        ? [h('span', null, h('b', null, 'Drag'), ' to look around'), h('span', null, h('b', null, 'Click the floor'), ' to walk there')]
        : [h('span', null, h('b', null, 'Drag'), ' to turn · ', h('b', null, 'scroll'), ' to zoom'), h('span', null, h('b', null, 'Click a room'), ' to step inside')]));
    }
    if (c.has('pointerLock')) { attr(look, 'aria-pressed', s.pointerLock ? 'true' : 'false'); text(lookLabel, s.pointerLock ? 'Esc to release' : 'Mouse look'); }
    if (c.has('gyro')) attr(gyro, 'aria-pressed', s.gyro ? 'true' : 'false');
  });
  return [keys, zone, stick, ghost, touchCol];
}
