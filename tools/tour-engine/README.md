# Cabana Tour Engine

One framework-free engine renders every Cabana 3D tour (three.js r185,
TypeScript, esbuild). It replaced three separate React viewers, one per
apartment, that each shipped their own ~1 MB bundle, re-rendered ambient
occlusion and a full-scene mirror on every moving frame and re-rendered React
twelve times a second. A tour is now data plus a scene builder; the engine and
the UI shell are shared, so a guest who opens a second tour downloads only that
apartment's scene.

The live tours:

| Slug | Listing | Rooms |
|---|---|---|
| `jets-nest` | The Jets Nest, Obama Estate | 5 |
| `shikaz-homes` | Shikaz Homes, Syokimau | 8 |
| `kileleshwa-elegant` | Elegant 1-bedroom, Kileleshwa | 6 |

`ENGINE-SPEC.md` is the original build brief (what each part must do and
why); `src/contract.ts` is the source of truth for the types.

## Architecture

```
tools/tour-engine/
  src/contract.ts           TourDefinition (a tour) · TourController (the running view) · callbacks
  src/share-code.ts         the "exact view" token shared by the tour and /apartments
  src/engine/               createTour(host, def, cb) → TourController
  src/ui/                   mountTourUI(root, def, createTour): the shell (vanilla DOM + tour.css)
  src/tours/<slug>/         index.ts (the TourDefinition), scene-*.ts, data.ts, entry.ts, meta.json, verify.mjs
  src/tours/old-source.mjs  where verify.mjs finds the old React viewer (disk or git history)
  build.mjs                 builds every tour → /tours/_engine/assets + /tours/<slug>/index.html
  bench/bench.cjs           frame-time benchmark in headless Chromium
```

Three layers, each knowing only the one below through the contract:

- **Tour** (`src/tours/<slug>`): the apartment. `build(manager, quality)`
  constructs the hand-modelled scene (walls, ceilings, knee-high walls for
  the dollhouse, furniture, collisions) already oriented in world coordinates;
  the rest is data: rooms and their photographs, standing points, the floor
  plan, `inside`/`roomAt` floor tests, authored lamps, the optional mirror,
  the listing (location for the real sun), theme colours and the honest
  accuracy note shown in About. Under `quality === 'low'` (coarse pointers)
  the shape helpers use fewer segments; every part is still there.
- **Engine** (`src/engine`): performance first. Renders on demand only;
  moving frames go straight to the canvas at a governed pixel ratio
  (`quality.ts`: tiers ultra/high/balanced/battery and an adaptive governor);
  ambient occlusion is computed once when the view settles and faded in
  (`refine.ts`); the scene is merged per room so each room culls on its own
  (`merge.ts`); a fixed light rig with three lamp proxies so no shader ever
  recompiles (`lamps.ts`, `lighting.ts`); shadows re-render only when the sun
  moves; the mirror re-renders on a budget (`mirror.ts`); every program is
  compiled before `onReady`. Also: walking with a grid path planner
  (`navigation.ts`, `walker.ts`), every input device (`input.ts`),
  click-the-floor footprint, dollhouse and plan flights, guided tour, Live
  Light from the NOAA sun position plus Cabana's weather endpoint (`sun.ts`,
  `weather.ts`), procedural ambience, the branded postcard (`snapshot.ts`).
  On localhost the host element gets `tourSnapshot()`, a read-only probe for
  scripted checks (mode, position, room, draw calls, tier, sun …).
- **UI** (`src/ui`): the shell. Welcome with a real loading bar, top bar,
  room dock, minimap, Live Light panel, share sheet, settings, photographs
  and About dialogs, toasts, and the photo-first fallback when WebGL is
  missing or the engine fails. It talks to the engine only through
  `TourController`. `tour.css` stays under 30 KB.

The built page runs inside the iframe that `/cabana-property-tour.js` opens
from the listing drawer. Escape (with nothing open) and Close post
`{type:'cabana-tour-close'}` to the parent; top-level, Close goes to
`/apartments?open=<listing id>`. A shared view arrives as
`/apartments?open=<id>&tour=<token>` (the listing page passes it on as
`?v=<token>`) and is applied after Enter.

## Build

```
cd tools/tour-engine
npm install              # once: three, esbuild, typescript
npx tsc --noEmit -p .    # typecheck engine, UI and tours
node build.mjs           # every tour; replaces /tours/_engine/assets
node build.mjs jets-nest # one tour; adds to /tours/_engine/assets
```

The output is committed: `/tours/_engine/assets/` (one shared chunk with
three, the engine and the UI, one small entry per tour, one stylesheet, all
content-hashed) and `/tours/<slug>/index.html` (boot screen with the cover
photograph, module preloads). Photographs stay in `/tours/<slug>/photos/`.
Always finish with a full build so no stale hashed files are left behind.

Serve with `node server.js` from the repo root and open
`http://localhost:4173/tours/<slug>/`.

## Add a tour

1. Create `src/tours/<slug>/` with `index.ts` (default export a
   `TourDefinition`), the scene files it needs, `meta.json`
   (`{"title", "description", "cover": <photo id>, "night": "#hex"}`) and an
   `entry.ts` that is exactly:
   ```ts
   import def from './index';
   import { createTour } from '../../engine';
   import { mountTourUI } from '../../ui';
   mountTourUI(document.getElementById('root')!, def, createTour);
   ```
2. Put the listing photographs in `/tours/<slug>/photos/<n>.jpg`.
3. Model only what the photographs show. Do not merge geometry in the
   builder (the engine merges by room); mark transparent, animated or mirror
   meshes `userData.keep = true`. Walls and anything fixed to them go in
   `walls`, so the dollhouse can lift them off.
4. Write a `verify.mjs` like the existing ones: every standing point is
   walkable and in its own room, every room-to-room path exists.
5. `node build.mjs`, then register the tour: the listing id → URL map in
   `/cabana-property-tour.js`, the two `/tours/<slug>` rewrites in
   `/vercel.json`, and the slug in `tests/property-tour.test.mjs`.

## Verify

```
node src/tours/<slug>/verify.mjs
```

Runs in Node in about a second. Besides walkability and paths it checks the
port is faithful: it rebuilds the old React viewer's scene from its source and
compares part for part (mesh order, kind, world position, material, shadow
flags, collisions, standing points, lamps, mirror, plan, floor tests). The old
sources (`tools/jets-nest-source`, `tools/shikaz-source`,
`tools/kileleshwa-source`) are not needed on disk: `old-source.mjs` unpacks
them from git history into a temporary folder. The one deliberate difference
is the Jets Nest hall mirror, moved 8 mm forward so it sits in front of its
chrome frame instead of 5 mm behind it.

Repo tests that cover the tours: `npm test` (from the root) includes
`tests/property-tour.test.mjs` (pages reference only files that exist, under
`/tours/<slug>/` or `/tours/_engine/`) and `tests/listing-share.test.mjs`
(the share token).

## Benchmark

```
node bench/bench.cjs <slug>          # desktop 1280×800
node bench/bench.cjs <slug> mobile   # 390×844, touch, DPR 2
TOUR_BASE=http://localhost:4174 node bench/bench.cjs <slug>   # another server
```

It opens the tour in headless Chromium with SwiftShader (software WebGL),
waits for the Enter button (`[data-tour-enter]`, or the old viewers'
`button.enter-button`), enters, then holds W while drag-turning for about six
seconds and prints time to ready, average and p95 frame time and the bytes
loaded from `/tours/`. Software rendering is slow and noisy: compare relative
numbers from the same machine, never absolute ones, and run each case more
than once.

To compare against the old React viewers, check them out of git history and
serve them on another port:

```
mkdir -p /tmp/oldtours
git --work-tree=/tmp/oldtours checkout <commit before the engine> -- tours
git reset -q -- tours            # put the index back
# serve /tmp/oldtours as the web root on :4174, then
TOUR_BASE=http://localhost:4174 node bench/bench.cjs kileleshwa-elegant
```

<!-- RESULTS -->
