# Cabana listing cards

The listing pages now share a gesture and focused-form layer while retaining their existing data models, field IDs, uploads, validation and submission handlers.

## Service coverage

| Service | Journey | Interaction |
| --- | --- | --- |
| Stays, roommates, food, shopping | add-listing.html | Swipe service/type/features; focused details, pricing and photos; explicit ownership and publish |
| Tours | list-your-tour.html | Operator and tour cards; swipe tour category and schedule; review submission |
| Events | list-your-event.html | Organiser and event cards; swipe category; original ticket tiers, media and review |
| Car hire | list-your-fleet.html | Operator, engineering and policy cards; swipe class, drive, transmission and supported boolean options; private application |
| Drivers | become-driver.html | Identity, vehicle and payout cards; swipe PSV status and document availability; explicit declaration and application |

All five listing routes expose **Set it up for me**. Requests use the existing `lazy_requests` table and admin queue. The dialog collects a name, international phone number, optional context and contact consent. Failed requests retain inputs; retries reuse the same UUID so a lost response cannot create a duplicate. No request is sent merely by opening the dialog or starting a listing.

## Interaction rules

- Right accepts a choice; left declines an optional boolean or explores the next categorical option. Colour is accompanied by text and buttons.
- Undo restores the exact preceding answer in the current choice deck. Back preserves unsaved values before dynamic controls are rebuilt. Service drafts are independent in memory for the current page session.
- Inputs, maps, uploads, ownership and submission never respond to swipe. Pointer cancellation, vertical scroll, small movements and overlapping clicks cannot advance a decision.
- Full-form and all-options views remain available. Native fields stay mounted and retain their names, IDs and original service handlers.
- Final publishing, partner declarations, payout decisions and driver/fleet consent remain explicit actions. No auto-publishing is introduced.
- Reduced-motion preferences remove decorative movement. Keyboard arrows and visible buttons provide alternatives to dragging.
- Roommate photo validation now runs on the photo step instead of blocking users before they reach it.

## Design basis

One manageable task at a time reduces how much a person must consider at once; visible progress makes the remaining work clear; reversible choices support exploration. These follow Nielsen Norman Group's [progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) and [user control and freedom](https://www.nngroup.com/articles/user-control-and-freedom/) guidance. Engagement is based on useful feedback and completion rather than artificial urgency or endless swiping. Claims of improved conversion require user testing and measurement.

## Verification

Run `node --test tests/listing-cards.test.mjs` for interaction regression tests and `node scripts/check-syntax.mjs` for the repository preflight.

`tests/ui/listing-cards.cjs` checks the real pages in a separate headless browser, with authentication and remote services mocked. Set `CABANA_PLAYWRIGHT` to an available Playwright package path when it is not locally installed. `CABANA_BROWSER_CHANNEL` defaults to Chrome. Screenshots go to ignored `artifacts/listing-ui/`.

Browser verification does not establish that a production user can submit to the live database. Deployment, real authentication, uploads, ownership RPCs and receipt of a setup request in the admin queue still require a production smoke check. No schema or access policies are changed by this patch.
