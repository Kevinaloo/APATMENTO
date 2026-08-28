# God's Eye View — attribution and licence

Cabana's world map (`cabana-globe.js`, `cabana-globe.css`) contains work
derived from **God's Eye View** by Bilawal Sidhu, used under the MIT licence.

- Upstream: <https://github.com/bilawalsidhu/gods-eye-view>
- Licence: MIT — full text reproduced at the bottom of this file
- Reviewed against upstream at commit time: 2026-08-25

---

## What was taken, and what was not

God's Eye View is a Cesium + Vite application built on Google's
photorealistic 3D tiles. Cabana is a static site with no build step, no
bundler and no metered map bill. **No upstream file was copied.** Every
line of `cabana-globe.js` was written against Leaflet in Cabana's own
idiom; what crossed over is the design of five subsystems, and it is those
that this notice covers.

| Cabana | Derived from | What was taken |
|---|---|---|
| `Director` — `flyTo`, `durationFor`, the focus beat | `src/camera.js`, `src/scenes/director.js` | The altitude profile that makes a camera move read as cinematic: rise, translate, descend, then settle. `flyToAustin`'s set-high → pause → ease-down structure is the focus beat, one-for-one. |
| `Director.playJourney`, `JOURNEYS` | `src/scenes/recipes.js`, `src/scenes/director.js` | A tour is declarative data — a keyframe list with a dwell per stop — so it can be authored, linked to and replayed identically. Cabana's six journeys are its own; the shape of a `stops` entry is upstream's `cameraPath`. |
| `allocate`, `ANCHORS`, `basePriority` | `src/overlays/worldOverlay.js`, `worldOverlayDraw.js` | Label collision as an allocation problem: rank claimants, walk the ranked list, try anchors in preference order, take the first clear slot, stop at a per-altitude cohort limit. |
| `LOD` bands | upstream cohort limits (`*_OVERLAY_COHORT_LIMIT`) | Altitude decides what may exist, and how many labels may win — rather than a fixed zoom threshold per layer. |
| `SKINS` | `src/styles/*.js` | Optics as a control the viewer holds. `noir` is `styles/noir.js`'s maths read back into CSS filter primitives (desaturate → contrast S-curve → sepia tint → vignette); `nightglass` is `styles/surveillance.js` applied to a night basemap. The GLSL itself does not transfer — CSS has no scanline or pixelation term, and Cabana claims neither. |
| `ShareLink` | `src/sharelink.js` | Camera, optics and filters serialised into a short URL, so a view is a handoff rather than a bookmark. |
| `miniStatus`, `addressSegments` | `src/locationStatus.js` | Two-line "where am I" readout that lands for both a selected record and a free-text search — including the bug upstream documents, where only the first path was rendered. |
| `ArcLayer` | `src/data/trailRenderer.js` | A path with a pulse running along it, drawn to canvas, so movement is readable at a glance. |
| Source-and-freshness discipline | upstream layer-state convention | Every layer keeps its provenance visible. Cabana's equivalent: a count on screen is a count from the database, and the typical price band is labelled as typical. |

### Deliberately not taken

**None of the bundled datasets, and none of the live feeds.** This is a
licensing decision, not an oversight. The upstream MIT grant explicitly
**does not extend to third-party data**, and some of it is incompatible
with a commercial product:

- TeleGeography submarine cables — CC BY-NC-SA 3.0, **NonCommercial**
- Datacenters / dams (OSM extracts) — ODbL 1.0, share-alike on the data
- Live feeds (Google Maps, OpenSky, AISStream, adsb.lol, …) — each
  provider's own terms, several restricting commercial use

Cabana is a commercial platform. Importing any of that would put the
product in breach, so nothing from `src/data/local_data/` or `public/`
was brought across, and no upstream data adapter was ported.

Also skipped as not applicable: Cesium and the 3D tile pipeline, the
aircraft/vessel/satellite tracking layers, CCTV projection, the OpenAI
realtime voice agent, the GLSL post-process stages, and the 3D models
under `public/models/` (separately licensed).

Cabana's maps draw on OpenStreetMap's own raster tiles and on Esri's
world imagery and reference layers. Both are attributed in
`cabana-globe.js` (`OSM_ATTRIB`, `IMAGERY_ATTRIB`), in `apa-map.js`
(`BASEMAPS`) and in `cabana-pinpoint.js` (`VIEWS`), and the credit is
rendered on every map, as those licences require. CARTO's basemaps were
used until they stopped serving anonymously; no CARTO tile is requested
any more and its attribution was removed with the last of them.

---

## MIT License

Copyright (c) 2026 Bilawal Sidhu

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
