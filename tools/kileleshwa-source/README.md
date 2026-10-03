# Elegant Kileleshwa residence

Photo-based 3D walkthrough for listing `2d488e1a-3582-409f-ac3c-5f67adc90c74`, **Fully furnished Elegant 1Bedroom in Kileleshwa**. Static output lives in `tours/kileleshwa-elegant`; Cabana's existing property-tour registry opens it in a lazy-loaded iframe.

Install the pinned dependencies with `npm ci` in this directory and run `npm run build`. Serve the Cabana repository with `node server.js`, then open `/tours/kileleshwa-elegant/index.html`. All assets, original photos and fonts use same-origin paths. No external 3D service, CDN or runtime API key is required.

## Experience

- Free walking with collision checks, mouse/touch look and keyboard/on-screen movement.
- Smooth room navigation follows reachable paths through door openings rather than crossing walls or furnishings.
- A guided tour visits the six modeled spaces; direct movement takes control back immediately.
- Orbiting furnished dollhouse, true orthographic floor plan and a shared-coordinate interactive minimap.
- Daylight, golden hour and evening lighting; procedural fabrics, marble, oak, detailed furnishings and a live mirror.
- Room-specific original photographs, with shared pool, gym and play area separated from the apartment rooms.
- Reduced-motion support, native modal focus containment, photo fallback and responsive mobile controls.

## Source and accuracy

The 18 photos are the original public listing images, retrieved October 3, 2026. The cream sectional, zebra cushions, oak TV panels, black/gold furniture, charcoal bed, yellow throw, kitchen, shower room, separate vanity and laundry follow visible references. Source photo numbers 4, 15 and 18 show shared building amenities and are **not** modeled as rooms inside the unit. Kitchen references include 6, 7, 12 and 13; bedroom references include 2, 16 and 17.

Dimensions, concealed surfaces, doorway positions and inter-room connections are estimated. This is not a measured floor plan, photogrammetric scan or 360-degree capture. The viewer states these limits and keeps all originals available for comparison. Lighting modes are artistic simulations. No fabricated balcony or external skyline is included.

## Verification

`node verify-model.cjs` checks every landing and all 36 room-to-room paths against the furnished collision model. From the Cabana root, run `node --test tests/property-tour.test.mjs tests/stays-listing-experience.test.mjs` and `node scripts/check-syntax.mjs`. `node tools/kileleshwa-source/verify-browser.cjs` runs desktop, mobile, reduced-motion, gallery and WebGL fallback checks against the local server.

Static geometry is batched by material; heavy scene code is dynamically imported. Shadows update on view/light changes, idle views avoid redraws, hidden tabs suspend movement, phone rendering uses a lower pixel ratio without ambient occlusion, and disposal releases renderer, textures, geometry and event handlers.

Creating these assets and registering this UUID does not modify the live database or deploy production. Deploy the repository through the existing Cabana release process to publish the tour.
