# The Jets Nest walkthrough

The property gallery integration is in `cabana-property-tour.js` and `.css`, keyed to listing `65ef1d11-a4e3-4250-bbac-f826c0cd10d2`. It creates a full-screen iframe only after the guest selects Explore in 3D, and removes it on close. Other listings do not show the section.

Editable React/Three.js sources live here. Install this directory's pinned dependencies and run `npm run build` to rebuild the static ESM assets in `tours/jets-nest`. `viewer.css` contains the compiled component styles and custom responsive styles; edit it here and rebuild. The 17 reference photographs are in `tours/jets-nest/photos`.

The scene recreates observed furnishings and user-confirmed room connections. Dimensions, unseen walls, and the complete floor plan are estimates, not a measured survey. Photographs remain available inside the viewer for comparison.

Performance: dynamic scene import, merged static geometry, simplified tiny details, frozen static shadows, idle redraw suppression, hidden-tab suspension, lower phone resolution and no phone ambient-occlusion pass. Room navigation includes furniture/wall collision checks. Closing the iframe destroys the WebGL context and its document.

Validation: `node --test tests/property-tour.test.mjs tests/stays-listing-experience.test.mjs` and `node scripts/check-syntax.mjs` from the repository root.
