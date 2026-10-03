# Cabana Tour Engine v3 — build spec

One framework-free engine (three.js r185, TypeScript, esbuild) renders all three Cabana 3D tours:
`jets-nest`, `shikaz-homes`, `kileleshwa-elegant`. It replaces three separate React viewers
(~1 MB JS + ~195 KB CSS each, GTAO post-processing every moving frame, full-scene mirror
re-render every frame, 7 point lights, React re-renders at 12 Hz).

The contract is `src/contract.ts`. Do not change it without a very good reason; if you must,
change it compatibly (add optional fields) and say so in your final report.

Layout:

```
tools/tour-engine/
  build.mjs                 builds every src/tours/<slug>/entry.ts → /tours/_engine/assets + /tours/<slug>/index.html
  src/contract.ts           types shared by engine, UI and tours
  src/engine/*.ts           createTour(host, def, cb): TourController      (ENGINE agent)
  src/ui/*.ts, tour.css     mountTourUI(root, def, createTour)             (UI agent)
  src/tours/<slug>/         index.ts (default export TourDefinition), scene-*.ts, meta.json, entry.ts  (TOUR agents)
  bench/bench.cjs           frame-time benchmark (headless Chromium, SwiftShader)
```

`entry.ts` for every tour is exactly:

```ts
import def from './index';
import { createTour } from '../../engine';
import { mountTourUI } from '../../ui';
mountTourUI(document.getElementById('root')!, def, createTour);
```

`meta.json` for every tour: `{ "title": "...", "description": "...", "cover": <photo id>, "night": "#hex" }`.

Build: `cd tools/tour-engine && node build.mjs`. Serve: `node server.js` from the repo root (port 4173 is
usually already running: `curl -s localhost:4173/tours/kileleshwa-elegant/`). Typecheck:
`npx tsc --noEmit -p .` (tsconfig at the package root).

Chromium for checks: `require('/home/user/APATMENTO/node_modules/playwright')`, `chromium.launch({ executablePath:
'/opt/pw-browsers/chromium', args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] })`.
Software WebGL is slow; compare relative numbers only.

## Non-negotiables

- **Honesty.** Each tour is a photo-based reconstruction with estimated dimensions. Keep that statement in
  About and in a quiet footer line. Lighting is a simulation. The original photographs stay one tap away.
  Never invent rooms, balconies or views that the listing photos do not show.
- **Same scenes.** The furnishing of each apartment is hand-modelled to match its photos. Port the scene code
  faithfully: same furniture, positions, materials, colours. Only performance-motivated changes (segment counts
  under `quality === 'low'`, no merging in the builder) are allowed.
- **No external runtime services** except Cabana's own `/api/utilities?action=weather` (same origin). No CDNs.
- **Accessibility.** Keyboard reachable controls, visible focus, `aria-*` labels, focus trap in dialogs,
  `prefers-reduced-motion` honoured (no head-bob, no auto camera drift, instant room jumps).
- **Embedding.** The tour runs inside an iframe opened by `/cabana-property-tour.js`. Escape (when no dialog is
  open) and the Close button post `{type:'cabana-tour-close'}` to `window.parent` with `location.origin` as the
  target origin, only when `window.parent !== window`. When top-level, Close navigates to
  `/apartments?open=<listing id>`.

## ENGINE (src/engine) — performance first

Target: smooth 60 fps on a mid-range phone; never a long frame on first movement.

1. **Render on demand.** A dirty flag; nothing renders when nothing changed. Hidden tab → no work.
2. **Adaptive resolution governor.** EMA of frame time. Tier table (dpr cap, shadow map size, AO, mirror res):
   `ultra` (min(devicePixelRatio,2), 2048, AO, 512), `high` (1.5, 2048, AO, 512), `balanced` (1.0–1.25, 1024, no AO, 256),
   `battery` (0.75, 1024, no AO, mirror off). Auto mode starts at `high` on desktop and `balanced` on coarse pointers,
   steps the DPR down by 0.15 after ~1 s over 20 ms/frame and up after ~3 s under 12 ms/frame, with hysteresis.
   Report through `onQuality`.
3. **Progressive refinement.** While the camera moves: render straight to the canvas (no EffectComposer).
   When it has been still for 180 ms: render refined frames through the composer with GTAO (ultra/high only),
   fading the AO blend in over ~200 ms (a few frames), at full tier DPR. Moving again drops straight back to the fast path.
4. **Lights.** Never more than: 1 hemisphere, 1 ambient, 1 directional sun (shadow-casting), and **3 lamp proxies**.
   The proxies are a fixed set of 3 PointLights whose positions/intensities track the 3 authored lamps nearest the
   camera (smoothly cross-faded), so the shader light count never changes and the scene never recompiles.
   In dollhouse/plan the proxies sit at the three brightest lamps.
5. **Shadows.** `shadowMap.autoUpdate = false`; update only when the sun direction or mode changes (throttled to
   ≤ 10 Hz during a time-lapse). PCFShadowMap. Walls and ceilings do NOT cast sun shadows (the sun is a simulation
   of window light falling inside); furniture does.
6. **Merge by room.** After `def.build`, merge meshes per (container group, room id from `def.roomAt` of the mesh's
   world-space bounding-box centre, material, castShadow, receiveShadow) in the mesh's parent-local space so the
   root's orientation (including negative scale) still applies. Skip `userData.keep`. Each merged mesh keeps a
   bounding sphere → three's frustum culling works per room. Strip attributes other than position/normal/uv.
7. **Mirror.** If `def.mirror`, a Reflector at tier resolution. Only update it when the mirror is inside the view
   frustum and within 6 m, and at most every 3rd frame while moving. Off in `battery`.
8. **Startup without jank.** Show progress via `onLoad`. Build the scene, then `await renderer.compileAsync(scene,
   camera)` (fall back to `renderer.compile`) before `onReady`, so the first step forward never stalls on shader
   compilation. Yield to the main thread between build stages (`await new Promise(r => setTimeout(r))`).
9. **Navigation.** Grid BFS path planner + collision (port `tools/kileleshwa-source/lib/navigation.ts`, made
   generic over `def.inside`, `model.collisions`, `def.plan.bounds`; player radius .16). Movement uses acceleration
   and damping (feels like walking, not sliding), axis-separated collision so you slide along walls, Shift/`setRun`
   runs. Subtle head-bob proportional to speed (off with reduced motion).
10. **Controls, all of them:**
    - Keyboard: W A S D / arrows move, Q/E turn, Shift run, R/F nudge pitch, `+`/`-` FOV.
    - Mouse: drag to look; wheel changes FOV (35–80°); `setPointerLock(true)` captures the mouse for free look
      (Escape releases; report via onHint).
    - Touch: one-finger drag looks; two-finger pinch changes FOV; the UI's virtual joystick calls `move`.
    - **Tap/click the floor to walk there**: raycast to y = 0 (walk mode). A soft ring "footprint" decal follows the
      cursor over walkable floor (hidden on touch until a tap); a click that isn't a drag walks along the planned path.
      Unreachable → small shake of the ring and `onHint('That spot can’t be reached from here')`.
    - Gyroscope (`setGyro`): DeviceOrientation relative to the moment it was enabled; requests iOS permission when
      `DeviceOrientationEvent.requestPermission` exists. Drag still adds on top.
    - Gamepad (navigator.getGamepads, polled only when one is connected): left stick move, right stick look,
      right trigger run, A = next room in tour order.
11. **Modes.** walk (perspective, walls+ceilings), dollhouse (orbit, walls/ceilings hidden, lowWalls shown,
    smooth fly-out/fly-in camera transition ~0.9 s, reduced motion → instant), plan (orthographic top-down, rooms
    clickable). Orbit via three's OrbitControls with damping.
12. **Guided tour.** Visits `def.rooms` in order: walks the path, dwells ~5 s with a slow look-around (no drift with
    reduced motion), reports `onTour`. Any manual input pauses it.
13. **Live Light — the signature.** `sun.ts`: NOAA solar position (azimuth/elevation) for `def.listing.lat/lng`,
    the chosen date and local hour (`tzOffsetHours`). Map to the directional light with `northDeg`. Above the horizon:
    colour temperature by elevation (warm amber under 15°, neutral white high), intensity ramps from 0 at −2° to full
    by 20°, low sun gets long raking shadows. Below the horizon: sun off, hemisphere goes blue, lamp proxies and the
    `glow` material come up (dusk → night), background colour shifts. `setLive(true)`: hour/date follow the real clock
    at the property (re-evaluated every minute) and the current weather from
    `/api/utilities?action=weather&lat=..&lng=..` (fields: `current.temp`, `current.label`, `current.isDay`,
    `current.condition`, `current.wmoCode`) dims direct sun with cloud and adds a cool cast for rain. `playDay(true)`:
    a ~24 s time-lapse from 05:30 to 22:00 then stops. Report everything through `onLight`.
14. **Ambience.** `setAmbience(true)` (needs a gesture): a quiet procedural WebAudio soundscape that follows the
    simulated hour and weather: dawn birdsong (FM chirps), daytime distant city (filtered brown noise), evening
    crickets (band-passed noise pulses), rain hiss when raining. Louder near walls with windows is not required.
    Master gain ≤ 0.12, fade in/out 1.5 s, suspended with the tab hidden or `setPaused(true)`.
15. **Share.** `getView()`/`setView()` round-trip room, position, yaw, pitch, mode, hour, date. `snapshot()` renders the
    current view at 1600×900 (or the canvas size, whichever is smaller) into an offscreen canvas, adds a slim branded
    caption bar (listing title, area, "Cabana 3D tour" and the hour if not live), returns a JPEG Blob (quality .9).
16. **Dispose** releases renderer, render targets, geometries, materials, textures, audio, listeners and
    `forceContextLoss()`. `webglcontextlost` → `onError`.
17. **Local diagnostics.** On localhost only, expose `host.tourSnapshot()` returning
    `{mode, position, yaw, room, blocked, drawCalls, triangles, dpr, tier, fps, sun}` for tests.

## UI (src/ui) — premium, light, fast

Vanilla TypeScript DOM, no frameworks, inline SVG icons (no icon library). `tour.css` under 30 KB, CSS variables
from `def.theme`. The look: quiet luxury editorial (think a design-hotel lookbook), generous type, glass panels
that never cover the middle of the view, everything collapsible on phones.

- **Welcome**: cover photo backdrop, collection kicker, listing title + tagline, three feature chips, a real loading
  bar driven by `onLoad`, "Enter the apartment" (disabled until ready), "See the original photographs". If
  `?v=` deep link present, the button reads "Step into the shared view".
- **Top bar**: brand + title/area; mode switch (Walk · Dollhouse · Floor plan); actions: Share, Photos, Light,
  Sound, Settings, Fullscreen, Close.
- **Room dock**: photo thumbnails of `def.rooms`, current room highlighted from `onRoom`; on phones a horizontal
  strip that collapses to a pill.
- **Minimap**: SVG of `def.plan` with a live position dot + view cone from `onPose`; rooms clickable; expands to plan.
- **Light panel** ("Live Light"): a sun arc with the sun dot at the current hour, a time scrubber (05:00–22:00),
  date chips (Today, Tomorrow, + a date input — "See it on your check-in day"), Live toggle showing the real local
  time and weather at the property ("Now in Kileleshwa · 24° · Partly cloudy"), "Play the day" button. Presets:
  Morning, Golden hour, Evening.
- **Movement**: desktop — a small key hint chip (WASD · drag · click the floor) and a "Mouse look" toggle
  (pointer lock). Touch — a virtual joystick that appears where the left thumb lands (lower-left half), look by
  dragging elsewhere, a Gyro toggle. A "Run" hold-button on touch.
- **Guided tour**: play/pause with progress; caption card with the room name and `detail` while touring.
- **Share sheet**: "Share this exact view" — builds `/apartments?open=<listing id>&tour=<encoded view>` (absolute
  URL on `location.origin`), shows the postcard preview from `snapshot()`, buttons: Share (Web Share API with the
  image file when `navigator.canShare({files})`), WhatsApp, Copy link, Download postcard. Opening a tour page with
  `?v=<encoded view>` applies it after Enter.
- **Settings popover**: Quality (Auto / Ultra / High / Balanced / Battery, shows live fps + dpr), Eye height
  (Child 1.1 m · Adult 1.6 m · Tall 1.8 m), Field of view slider, Ambience volume on/off.
- **Photos dialog**: room tabs (+ extraPhotos group), large image, arrows, thumbnails, keyboard ←/→, counter.
- **About dialog**: what this is, how to move, `def.accuracyNote`, link to the listing.
- **Hints/toasts**: from `onHint`, bottom-centre, auto-dismiss.
- **Fallback**: on `onError` or no WebGL → photo-first experience (photos dialog becomes the page, with the same
  top bar).
- Escape closes the top dialog/popover first; only then posts the close message to the parent.
- Phones (≤ 760 px wide): top bar collapses actions into a "More" menu except Share and Close; room dock is a strip;
  minimap shrinks to a corner button; nothing covers the centre of the screen.

## TOURS (src/tours/<slug>)

Port from `tools/<slug>-source` (jets-nest → `tools/jets-nest-source`, shikaz-homes → `tools/shikaz-source`,
kileleshwa-elegant → `tools/kileleshwa-source`). Copy the scene files, remove React/UI code, and produce
`index.ts` exporting the `TourDefinition`:

- `build(manager, quality)`: build + furnish exactly as the old viewer did, then orient (scale/position on root and
  collisions mirrored the way the old `createApartment` did). Do NOT call the old `mergeModel`. Under `'low'`, the
  geometry helpers use fewer segments (cylinder 16, sphere 14×9, torus 6×24, tube radial 5, RoundedBox 1 segment).
- `lights.lamps`: the authored PointLight positions and intensities from the old `createApartment` (in world coords).
- `mirror`: the old Reflector placement, in world coords.
- `views`, `start`, `inside`, `roomAt`, `plan` (world coords; derive `plan.rooms` from the old minimap/plan data;
  labels in caps), `rooms` (with photos — take them from the old `page.tsx`), `extraPhotos` if the old viewer had
  amenities.
- `listing.lat/lng`: Jets Nest −1.24945, 36.92630; Shikaz Homes −1.37135, 36.93291; Kileleshwa −1.28535, 36.77497.
  `tzOffsetHours: 3`. `northDeg`: 0 unless the source says otherwise.
- `theme`: keep each tour's identity from its old CSS (Jets Nest deep green, Shikaz its palette, Kileleshwa
  sage/cream/gold).
- `accuracyNote`: from the old README/About copy.
- A `verify.mjs` next to it is welcome: every room view is walkable and every room-to-room path exists.
