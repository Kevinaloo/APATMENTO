# Shikaz Homes walkthrough

The shared gallery integration is in `cabana-property-tour.js` and `.css`. Shikaz is keyed to listing `20b22953-2c13-4e6c-a5c4-3cbefcc20cae`. The registry also includes The Jets Nest. Only these exact listing IDs receive the card badge and gallery entry. A full-screen iframe is created on request and destroyed on close. Listing photos and database records are unchanged.

Editable React/Three.js sources live here. Run `pnpm install --frozen-lockfile` and `pnpm build` from this directory to rebuild the static ESM assets in `tours/shikaz-homes`. `viewer.css` contains compiled component styles and custom responsive overrides. The 18 optimized reference photographs and small navigation thumbnails are in `tours/shikaz-homes/photos`. Keep absolute entry and stylesheet URLs: Vercel cleanUrls redirects the index document. No external CDN scripts or runtime API credentials are needed.

The scene uses the supplied photographs and 96-second walkthrough video: lounge and dining at the entrance end, a separate kitchen, private hallway, two different bedrooms, separate shower and WC, and a hallway basin. The gold bed and dresser, blue bedroom accents, tufted sofas, timber feature wall and kitchen appliances follow the references. Dimensions, unseen walls and room proportions remain estimates, not a measured scan or survey. This is a navigable reconstruction, not photogrammetry. The source video was used for reference only; it is not downloaded by guests.

Performance: dynamic scene import, merged static geometry, simplified tiny details, frozen static shadows, idle redraw suppression, hidden-tab suspension, lower phone resolution and no phone ambient-occlusion pass. Room navigation includes furniture/wall collision checks. Closing the iframe destroys the WebGL context and its document.

Validation: `node --test tests/property-tour.test.mjs tests/stays-listing-experience.test.mjs` and `node scripts/check-syntax.mjs` from the repository root.
