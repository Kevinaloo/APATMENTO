/* A stand-in engine for developing the UI before the real one exists.

   It honours the whole TourController contract with a 2D canvas: walk mode
   paints the current room's listing photograph (panned by yaw, zoomed by FOV,
   graded by the simulated sun), dollhouse draws the plan as an extruded
   model, plan draws it from above. Timers drive every callback the way the
   engine will: loading progress, poses at ≤ 10 Hz, room changes along a walk,
   the guided tour, Live Light, the quality governor, hints.

   URL switches for screenshots and tests:
     ?fake-load=<ms>   how long "loading" takes (default 1800)
     ?fake-hold=<0..1> stop loading at that progress and never become ready
     ?fail=load|late|throw   simulate the engine failing                    */
import type { CreateTour, LightState, Mode, QualityState, SharedView, Tier, TourController } from '../../contract';
import { propertyNow, sunAt } from '../sun-path';

const TIER_DPR: Record<Tier, number> = { ultra: 2, high: 1.5, balanced: 1.1, battery: 0.75 };
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export const createFakeTour: CreateTour = (host, def, cb) => {
  const q = new URLSearchParams(location.search);
  if (q.get('fail') === 'throw') throw new Error('Simulated: WebGL could not start');
  const place = { lat: def.listing.lat, lng: def.listing.lng, tz: def.listing.tzOffsetHours };

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'display:block;width:100%;height:100%';
  host.appendChild(canvas);
  const g = canvas.getContext('2d')!;

  const viewOf = (id: string) => {
    const v = def.views[id] || Object.values(def.views)[0];
    const [px, py, pz] = v.position, [tx, ty, tz] = v.target;
    return { x: px, z: pz, yaw: Math.atan2(tx - px, tz - pz), pitch: Math.atan2(ty - py, Math.hypot(tx - px, tz - pz)) };
  };

  /* ── State ── */
  let { x, z, yaw, pitch } = viewOf(def.start);
  let mode: Mode = 'walk', room = def.start, photoRoom = def.start, fov = 61, run = false, paused = false, disposed = false;
  let mvx = 0, mvz = 0, orbit = 0.7;
  let walk: { fx: number; fz: number; fyaw: number; tx: number; tz: number; tyaw: number; tpitch: number; t: number; dur: number; done?: () => void } | null = null;
  const tour = { playing: false, index: 0, progress: 0 };
  let dwell = 0;
  const now = propertyNow(place.tz);
  const light: LightState = { live: true, date: now.date, hour: now.hour, sun: sunAt(place, now.date, now.hour), weather: null, playing: false };
  let tier: Tier = matchMedia('(pointer: coarse)').matches ? 'balanced' : 'high', auto = true;
  let frames = 0, lastFpsAt = performance.now(), fps = 60;

  const photos = new Map<string, HTMLImageElement>();
  for (const r of def.rooms) { const im = new Image(); im.src = def.photoUrl(r.image); photos.set(r.id, im); }
  let fade = 1, prevPhoto: HTMLImageElement | null = null;

  /* ── Callbacks, throttled the way the engine promises ── */
  let lastPoseAt = 0, poseKey = '';
  const pose = (force = false) => {
    const t = performance.now();
    const key = `${x.toFixed(2)}|${z.toFixed(2)}|${yaw.toFixed(3)}|${pitch.toFixed(3)}`;
    if (!force && (key === poseKey || t - lastPoseAt < 100)) return;
    poseKey = key; lastPoseAt = t;
    cb.onPose({ x, z, yaw, pitch, room });
  };
  const checkRoom = () => {
    const r = def.roomAt(x, z);
    if (r !== room) { room = r; cb.onRoom(r); if (def.rooms.some(d => d.id === r) && r !== photoRoom) { prevPhoto = photos.get(photoRoom) || null; photoRoom = r; fade = 0; } }
  };
  const emitLight = () => { light.sun = sunAt(place, light.date, light.hour); cb.onLight({ ...light, sun: { ...light.sun } }); };
  const qstate = (): QualityState => ({ tier, auto, dpr: Math.min(devicePixelRatio || 1, TIER_DPR[tier]), fps, ao: tier === 'ultra' || tier === 'high' });
  const emitTour = () => cb.onTour({ ...tour });

  /* ── Loading ── */
  const total = Number(q.get('fake-load') || 1800), hold = q.has('fake-hold') ? Number(q.get('fake-hold')) : 2;
  const steps: [string, number][] = [['Laying the floors', 0.12], ['Furnishing the rooms', 0.36], ['Hanging the lamps', 0.52], ['Merging by room', 0.68], ['Compiling materials', 0.86], ['Letting the light in', 1]];
  cb.onLoad?.(0, 'Preparing your private viewing');
  steps.forEach(([label, p], i) => setTimeout(() => {
    if (disposed || p > hold) return;
    cb.onLoad?.(p, label);
    if (q.get('fail') === 'load' && p > 0.6) { cb.onError('Simulated: WebGL context lost while loading'); return; }
    if (p === 1) setTimeout(ready, 120);
  }, (total * (i + 1)) / steps.length));
  let isReady = false;
  function ready() {
    if (disposed || (q.get('fail') === 'load')) return;
    isReady = true;
    cb.onReady();
    cb.onRoom(room);
    cb.onMode(mode);
    emitTour();
    emitLight();
    cb.onQuality?.(qstate());
    pose(true);
    setTimeout(() => { if (light.live) { light.weather = { temp: 24, label: 'Partly cloudy', cloud: 0.35, rain: false, isDay: light.sun.elevationDeg > 0 }; emitLight(); } }, 500);
    if (q.get('fail') === 'late') setTimeout(() => cb.onError('Simulated: WebGL context lost'), 3000);
  }

  /* ── Movement ── */
  function stopTour() { if (tour.playing) { tour.playing = false; walk = null; emitTour(); } }
  function walkTo(tx: number, tz: number, tyaw?: number, tpitch?: number, done?: () => void): boolean {
    if (!def.inside(tx, tz)) return false;
    const d = Math.hypot(tx - x, tz - z);
    walk = { fx: x, fz: z, fyaw: yaw, tx, tz, tyaw: tyaw ?? Math.atan2(tx - x, tz - z), tpitch: tpitch ?? -0.05, t: 0, dur: Math.max(0.7, d / 1.5), done };
    return true;
  }
  function goRoom(id: string, done?: () => void) {
    const v = viewOf(id);
    walkTo(v.x, v.z, v.yaw, v.pitch, done);
  }
  function tourStep() {
    if (!tour.playing) return;
    const r = def.rooms[tour.index];
    goRoom(r.id, () => { dwell = 0; });
  }

  /* ── Input on the canvas (the real engine does all of this itself) ── */
  let drag: { id: number; x: number; y: number; moved: number } | null = null;
  let hover: { x: number; y: number } | null = null, hinted = false;
  canvas.addEventListener('pointerdown', e => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 }; });
  canvas.addEventListener('pointermove', e => {
    hover = e.pointerType === 'mouse' ? { x: e.offsetX, y: e.offsetY } : null;
    if (document.pointerLockElement === canvas) { ctl.look(-e.movementX * 0.003, -e.movementY * 0.003); return; }
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY;
    if (mode === 'dollhouse') orbit += dx * 0.006;
    else if (mode === 'walk') ctl.look(dx * 0.004, dy * 0.003);
  });
  canvas.addEventListener('pointerleave', () => { hover = null; });
  canvas.addEventListener('pointerup', e => {
    if (!drag || drag.id !== e.pointerId) { drag = null; return; }
    const tap = drag.moved < 6; drag = null;
    if (!tap) return;
    const r = canvas.getBoundingClientRect();
    if (mode === 'plan') {
      const [wx, wz] = planInverse(e.clientX - r.left, e.clientY - r.top);
      const hit = def.plan.rooms.find(p => !p.hall && wx >= p.x && wx <= p.x + p.w && wz >= p.z && wz <= p.z + p.d);
      if (hit) { ctl.setMode('walk'); ctl.goRoom(hit.id); }
      return;
    }
    if (mode !== 'walk' || e.clientY - r.top < r.height * 0.5) return;
    /* Pretend to raycast: lower on screen is nearer. */
    const depth = 0.6 + (1 - (e.clientY - r.top - r.height * 0.5) / (r.height * 0.5)) * 2.4;
    const side = ((e.clientX - r.left) / r.width - 0.5) * 1.6;
    const tx = x + Math.sin(yaw) * depth + Math.cos(yaw) * side, tz = z + Math.cos(yaw) * depth - Math.sin(yaw) * side;
    stopTour();
    if (!ctl.walkTo(tx, tz)) cb.onHint?.('That spot can’t be reached from here');
  });
  canvas.addEventListener('wheel', e => { e.preventDefault(); ctl.setFov(fov + Math.sign(e.deltaY) * 3); }, { passive: false });
  const keys = new Set<string>();
  const onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    const down = e.type === 'keydown';
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyQ', 'KeyE'].includes(e.code)) {
      if (down) keys.add(e.code); else keys.delete(e.code);
      stopTour();
    }
    if (e.key === 'Shift') run = down;
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);

  /* ── Drawing ── */
  function size() {
    const dpr = Math.min(devicePixelRatio || 1, TIER_DPR[tier]);
    const w = Math.max(1, Math.round(host.clientWidth * dpr)), h = Math.max(1, Math.round(host.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    return { w, h, dpr };
  }

  function drawPhoto(img: HTMLImageElement | null | undefined, w: number, h: number, alpha: number) {
    if (!img || !img.complete || !img.naturalWidth) return;
    const v = viewOf(photoRoom);
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight) * 1.18 * (61 / fov);
    const iw = img.naturalWidth * s, ih = img.naturalHeight * s;
    const dx = Math.max(w - iw, Math.min(0, (w - iw) / 2 - wrap(yaw - v.yaw) * w * 0.45));
    const dy = Math.max(h - ih, Math.min(0, (h - ih) / 2 + (pitch - v.pitch) * h * 0.7));
    g.globalAlpha = alpha;
    g.drawImage(img, dx, dy, iw, ih);
    g.globalAlpha = 1;
  }

  /* Grade the photograph by the simulated sun so Live Light visibly does something. */
  function grade(w: number, h: number) {
    const el = light.sun.elevationDeg;
    if (el < 12) {
      const warm = el > 0 ? 1 - el / 12 : Math.max(0, 1 + el / 4);
      if (warm > 0) { g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgba(255,196,140,${0.55 * warm})`; g.fillRect(0, 0, w, h); }
    }
    if (el < 2) {
      const night = Math.min(1, (2 - el) / 9);
      g.globalCompositeOperation = 'multiply';
      g.fillStyle = `rgba(40,52,92,${0.72 * night})`;
      g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'screen';
      for (const [fx, fy, r] of [[0.32, 0.18, 0.42], [0.74, 0.22, 0.34], [0.55, 0.62, 0.5]]) {
        const grad = g.createRadialGradient(w * fx, h * fy, 0, w * fx, h * fy, w * r);
        grad.addColorStop(0, `rgba(255,186,110,${0.42 * night})`);
        grad.addColorStop(1, 'rgba(255,186,110,0)');
        g.fillStyle = grad; g.fillRect(0, 0, w, h);
      }
    }
    if (light.weather && light.live && light.weather.cloud > 0) { g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgba(200,205,212,${0.25 * light.weather.cloud})`; g.fillRect(0, 0, w, h); }
    g.globalCompositeOperation = 'source-over';
  }

  /* Plan drawing shared by dollhouse (projected) and plan (top-down). */
  const b = def.plan.bounds, pw = b.maxX - b.minX, pd = b.maxZ - b.minZ;
  let planXf = { s: 1, ox: 0, oy: 0 };
  function planInverse(px: number, py: number): [number, number] {
    const d = devicePixelRatio ? Math.min(devicePixelRatio, TIER_DPR[tier]) : 1;
    return [(px * d - planXf.ox) / planXf.s, (py * d - planXf.oy) / planXf.s];
  }
  function drawPlan(w: number, h: number, dpr: number, iso: boolean) {
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, def.theme.night); bg.addColorStop(1, '#0b1310');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const cx = b.minX + pw / 2, cz = b.minZ + pd / 2;
    const s = Math.min(w / (pw * (iso ? 2.1 : 1.6)), h / (pd * (iso ? 2.3 : 1.7)));
    planXf = { s, ox: w / 2 - cx * s, oy: h / 2 - cz * s };
    const P = (px: number, pz: number, py = 0): [number, number] => {
      if (!iso) return [planXf.ox + px * s, planXf.oy + pz * s];
      const rx = (px - cx) * Math.cos(orbit) - (pz - cz) * Math.sin(orbit), rz = (px - cx) * Math.sin(orbit) + (pz - cz) * Math.cos(orbit);
      return [w / 2 + rx * s * 0.95, h * 0.56 + rz * s * 0.5 - py * s * 0.9];
    };
    const poly = (pts: [number, number][]) => { g.beginPath(); pts.forEach(([a, c], i) => (i ? g.lineTo(a, c) : g.moveTo(a, c))); g.closePath(); };
    for (const r of def.plan.rooms) {
      const corners: [number, number][] = [[r.x, r.z], [r.x + r.w, r.z], [r.x + r.w, r.z + r.d], [r.x, r.z + r.d]];
      if (iso) {
        for (let i = 0; i < 4; i++) {
          const [a, c] = corners[i], [a2, c2] = corners[(i + 1) % 4];
          poly([P(a, c), P(a2, c2), P(a2, c2, 0.5), P(a, c, 0.5)]);
          g.fillStyle = 'rgba(232,226,212,.16)'; g.fill();
        }
      }
      poly(corners.map(([a, c]) => P(a, c)));
      g.fillStyle = r.id === room ? 'rgba(214,196,150,.55)' : r.hall ? 'rgba(220,214,200,.22)' : 'rgba(236,230,216,.38)';
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.2 * dpr; g.stroke();
      const [lx, ly] = P(r.x + r.w / 2, r.z + r.d / 2);
      g.fillStyle = 'rgba(255,255,255,.8)'; g.font = `600 ${11 * dpr}px Arial`; g.textAlign = 'center'; g.fillText(r.label, lx, ly);
    }
    const [mx, my] = P(x, z);
    g.fillStyle = '#e8c98a'; g.beginPath(); g.arc(mx, my, 6 * dpr, 0, Math.PI * 2); g.fill();
  }

  function frame(t: number) {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    if (paused || document.hidden) { lastT = t; return; }
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
    lastT = t;
    step(dt);
    const { w, h, dpr } = size();
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (mode === 'walk') {
      g.fillStyle = def.lights.background; g.fillRect(0, 0, w, h);
      fade = Math.min(1, fade + dt * 2.5);
      if (fade < 1) drawPhoto(prevPhoto, w, h, 1);
      drawPhoto(photos.get(photoRoom), w, h, fade);
      grade(w, h);
      if (hover && hover.y * dpr > h * 0.5) {
        /* The engine's footprint ring, following the cursor over the floor. */
        g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2 * dpr;
        g.beginPath(); g.ellipse(hover.x * dpr, hover.y * dpr, 26 * dpr, 11 * dpr, 0, 0, Math.PI * 2); g.stroke();
      }
    } else drawPlan(w, h, dpr, mode === 'dollhouse');
    frames++;
    if (t - lastFpsAt > 1000) {
      fps = Math.min(60, (frames * 1000) / (t - lastFpsAt)); frames = 0; lastFpsAt = t;
      cb.onQuality?.(qstate());
    }
  }

  function step(dt: number) {
    let mx = mvx, mz = mvz, turn = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) mz += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) mz -= 1;
    if (keys.has('KeyA')) mx -= 1;
    if (keys.has('KeyD')) mx += 1;
    if (keys.has('ArrowLeft') || keys.has('KeyQ')) turn += 1;
    if (keys.has('ArrowRight') || keys.has('KeyE')) turn -= 1;
    if (turn) yaw = wrap(yaw + turn * dt * 1.6);
    if (mode === 'walk' && (mx || mz)) {
      walk = null;
      const sp = (run ? 2.8 : 1.4) * dt;
      const nx = x + (Math.sin(yaw) * mz - Math.cos(yaw) * mx) * sp, nz = z + (Math.cos(yaw) * mz + Math.sin(yaw) * mx) * sp;
      if (def.inside(nx, z)) x = nx;
      if (def.inside(x, nz)) z = nz;
      if (!hinted) { hinted = true; setTimeout(() => cb.onHint?.(matchMedia('(pointer: coarse)').matches ? 'Tap the floor to walk there' : 'Click the floor to walk there'), 900); }
    }
    if (walk) {
      walk.t = Math.min(1, walk.t + dt / walk.dur);
      const e = walk.t < 0.5 ? 2 * walk.t * walk.t : 1 - (-2 * walk.t + 2) ** 2 / 2;
      x = walk.fx + (walk.tx - walk.fx) * e; z = walk.fz + (walk.tz - walk.fz) * e;
      yaw = wrap(walk.fyaw + wrap(walk.tyaw - walk.fyaw) * Math.min(1, e * 1.4));
      pitch += (walk.tpitch - pitch) * Math.min(1, dt * 4);
      if (walk.t >= 1) { const done = walk.done; walk = null; done?.(); }
    }
    if (tour.playing) {
      const n = def.rooms.length;
      if (!walk) {
        dwell += dt;
        if (!matchMedia('(prefers-reduced-motion: reduce)').matches) yaw = wrap(yaw + Math.sin(dwell * 0.8) * dt * 0.12);
        if (dwell > 3.2) {
          if (tour.index + 1 >= n) { tour.playing = false; tour.progress = 1; emitTour(); }
          else { tour.index++; dwell = 0; tourStep(); }
        }
      }
      if (tour.playing) {
        const seg = walk ? walk.t * 0.6 : 0.6 + Math.min(0.4, (dwell / 3.2) * 0.4);
        const p = Math.min(1, (tour.index + seg) / n);
        if (Math.abs(p - tour.progress) > 0.004) { tour.progress = p; emitTour(); }
      }
    }
    if (light.playing) {
      light.hour += dt * (16.5 / 24);
      if (light.hour >= 22) { light.hour = 22; light.playing = false; }
      emitLight();
    }
    checkRoom();
    pose();
  }

  let raf = requestAnimationFrame(frame), lastT = performance.now();
  const minute = setInterval(() => { if (light.live) { const n = propertyNow(place.tz); light.date = n.date; light.hour = n.hour; emitLight(); } }, 60000);

  const ctl: TourController = {
    goRoom(id) { stopTour(); goRoom(id); },
    walkTo(tx, tz) { return walkTo(tx, tz); },
    move(ax, az) { mvx = ax; mvz = az; if (ax || az) stopTour(); },
    look(dy, dp) { stopTour(); walk = null; yaw = wrap(yaw - dy); pitch = Math.max(-1.2, Math.min(1.2, pitch - dp)); },
    setRun(on) { run = on; },
    setEyeHeight() { /* a photograph has one eye height */ },
    setFov(deg) { fov = Math.max(35, Math.min(80, deg)); },
    setPointerLock(on) {
      if (on) { canvas.requestPointerLock?.(); cb.onHint?.('Move the mouse to look · Esc releases it'); }
      else if (document.pointerLockElement) document.exitPointerLock();
    },
    async setGyro(on) { return on ? matchMedia('(pointer: coarse)').matches && 'DeviceOrientationEvent' in window : false; },
    setMode(m) { if (m === mode) return; stopTour(); mode = m; cb.onMode(m); },
    setTour(on) {
      if (on === tour.playing) return;
      if (!on) { stopTour(); return; }
      mode = 'walk'; cb.onMode(mode);
      tour.playing = true; tour.progress = 0; dwell = 0;
      tour.index = Math.max(0, def.rooms.findIndex(r => r.id === room));
      if (tour.index >= def.rooms.length - 1) tour.index = 0;
      emitTour(); tourStep();
    },
    reset() { stopTour(); mode = 'walk'; cb.onMode(mode); ({ x, z, yaw, pitch } = viewOf(def.start)); checkRoom(); pose(true); },
    setLive(on) {
      light.live = on; light.playing = false;
      if (on) {
        const n = propertyNow(place.tz); light.date = n.date; light.hour = n.hour;
        setTimeout(() => { if (light.live) { light.weather = { temp: 24, label: 'Partly cloudy', cloud: 0.35, rain: false, isDay: light.sun.elevationDeg > 0 }; emitLight(); } }, 400);
      } else light.weather = null;
      emitLight();
    },
    setDate(iso) { light.live = false; light.weather = null; light.date = iso; emitLight(); },
    setHour(hour) { light.live = false; light.weather = null; light.playing = false; light.hour = Math.max(0, Math.min(24, hour)); emitLight(); },
    playDay(on) { light.playing = on; if (on) { light.live = false; light.weather = null; if (light.hour >= 21.9 || light.hour < 5.5) light.hour = 5.5; } emitLight(); },
    setAmbience() { /* silent stand-in */ },
    setQuality(t) { auto = t === 'auto'; tier = t === 'auto' ? (matchMedia('(pointer: coarse)').matches ? 'balanced' : 'high') : t; cb.onQuality?.(qstate()); },
    quality: qstate,
    getView(): SharedView { return { room, x, z, yaw, pitch, mode, ...(light.live ? {} : { hour: light.hour, date: light.date }) }; },
    setView(v) {
      ({ x, z, yaw, pitch } = v); mode = v.mode; cb.onMode(mode);
      if (v.hour != null) { light.live = false; light.weather = null; light.hour = v.hour; }
      if (v.date) { light.live = false; light.date = v.date; }
      emitLight(); checkRoom(); pose(true);
    },
    async snapshot() {
      if (!isReady) return null;
      const w = Math.min(1600, canvas.width), h = Math.min(900, canvas.height);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const x2 = c.getContext('2d')!;
      const s = Math.max(w / canvas.width, h / canvas.height);
      x2.drawImage(canvas, (w - canvas.width * s) / 2, (h - canvas.height * s) / 2, canvas.width * s, canvas.height * s);
      const bar = Math.round(h * 0.085);
      x2.fillStyle = def.theme.night; x2.fillRect(0, h - bar, w, bar);
      x2.fillStyle = '#fff'; x2.font = `${Math.round(bar * 0.36)}px Georgia, serif`; x2.textBaseline = 'middle';
      x2.fillText(`${def.listing.title} · ${def.listing.area}`, bar * 0.5, h - bar / 2);
      x2.textAlign = 'right'; x2.font = `600 ${Math.round(bar * 0.26)}px Arial`; x2.fillStyle = def.theme.accent;
      const hh = Math.floor(light.hour), mm = Math.round((light.hour - hh) * 60);
      x2.fillText(`CABANA 3D TOUR${light.live ? '' : ` · ${String(hh).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`}`, w - bar * 0.5, h - bar / 2);
      return new Promise<Blob | null>(res => c.toBlob(res, 'image/jpeg', 0.9));
    },
    setPaused(p) { paused = p; },
    dispose() {
      disposed = true; cancelAnimationFrame(raf); clearInterval(minute);
      window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey);
      canvas.remove();
    },
  };
  (window as unknown as { __tour: TourController }).__tour = ctl;
  return ctl;
};
