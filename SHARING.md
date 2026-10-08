# Sharing listings

Every listing card and listing page has a share button (`cabana-share.js`). On a phone it opens the system share sheet; elsewhere a sheet offers WhatsApp, Telegram, X, Facebook, SMS, email and Copy link.

The link people pass on is `https://cabana.africa/s/<listing id>` (`api/lib/_listing-share.js`, routed through `/api/utilities?action=listing-share`; mirrored in `server.js` for local runs). It returns a tiny page whose Open Graph tags carry the listing's own title, place, first photo and **all-in guest price**, so chats and feeds unfold a real card, then redirects to the exact listing:

| Service | Lands on |
| --- | --- |
| Stays | `/apartments?open=<id>` (the page fetches the listing itself if it is not among those already loaded) |
| Food | `/restaurant?id=<id>` |
| Shopping | `/shopping?open=<id>` |
| Rooms | the button passes its own `data-share-url` (`/roommates?room=<id>`) |

Only live, public listings are described; anything else lands on Cabana's home page. Add a button anywhere with `<button data-cbn-share data-share-id="…" data-share-title="…">`.

## The Stays rail on the dashboard

`dashboard.html` shows the same stays as `/apartments`: same live-only filter, same order (featured, then rank with verified hosts first), same all-in price from `apa-fees.js`, same deep link. It re-reads when the tab regains focus, on reconnect and every 90 seconds, so a price change shows without a reload.

## The APA launcher

`cabana-support.js` keeps APA reachable without covering anything: it rides above full-width bottom bars (found by hit-testing, so no page needs its own rule), tucks to the edge while scrolling down and returns on scroll up, steps aside for real modals and the on-screen keyboard, and can be dragged (double-click or double-tap to reset). Its stylesheet is gated so the widget never paints unstyled on load.
