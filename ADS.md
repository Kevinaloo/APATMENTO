# Cabana ads — how the system fits together

One registry, one engine, one console room. If you only remember one thing:
**a page redesign must keep the anchors listed in `apa-ad-registry.js`, or
`npm test` fails** (`tests/ads-system.test.mjs`) and the console shows the
placement as *Broken* the same day.

| Piece | File | Job |
|---|---|---|
| Placement registry | `apa-ad-registry.js` | Every page, every slot (`<page>.<name>`), what it accepts, where it hangs, the anti-clutter rules. Read by the site and the console. |
| Ad engine | `showcase.js` (v4) | Loads `ads_bundle(page)`, mounts slots from the registry, enforces the rules, tracks, reports slot health. |
| Secret ads | `apa-shadow.js` (v3) | Behavioural edge cards. Loaded by the engine on surfaces with `shadow: true`. |
| Welcome poster | `apa-interstitial.js` (v4) | Optional full-screen poster when a member lands on the dashboard (`format = 'poster'`). With none live, the Cabana splash runs as before. |
| Console room | `admin-views-ads.js`, `admin-ads.css` | Overview, Placements (live health), Campaigns, Secret ads, Welcome poster, Rules, Rate card, Visitors. |
| Database | `supabase/migrations/20260926090000_ads_v2_bulletproof.sql` | Normalising triggers, `ad_settings`, `ad_slot_health`, `ad_track`, `ad_heartbeat`, `ads_bundle`, guarded `admin_ads_*`. |

## Rules the site enforces (editable in Console → Advertising → Rules)
- First screen of a service page never carries an ad; units open below what the visitor is reading.
- At most `max_units` inline units per page, at least `min_gap` px apart.
- In-results ads start after whole rows, below the rows already on screen, at most `infeed.max`.
- One overlay at a time (corner card, secret ad, poster share a lock).
- Money, sign-in and form pages (`NEVER` list) never load ads.
- If the database is unreachable, the last good bundle (≤ 72 h) is used.

## Adding a placement
1. Add the slot to the surface in `apa-ad-registry.js` (new stable id).
2. Make sure the anchor selector exists in the page HTML.
3. `npm test` — the contract test checks the anchor.
4. It appears in the console automatically, with health, stats and an on/off switch.

## Slot health states (reported by visitors' browsers)
`live` · `house` (Cabana promo filled an unsold spot) · `deferred` (visitor had not reached it — normal) ·
`blocked` (rules held it back) · `empty` · `missing` (anchor gone — fix the page) · `off` · `error`.
