# Cabana alerts: sounds and counts

`cabana-alerts.js` is the one place that decides how Cabana gets attention. It loads itself on any signed-in page (via `apa-push.js`).

## The five chimes

Synthesised in the browser (Web Audio), so there are no audio files to ship. All five sit in D major pentatonic, so they sound like one family and never clash, but each has its own instrument, melodic shape, length and vibration pattern.

| Kind | Name | What you hear | Used for |
| --- | --- | --- | --- |
| `message` | Kalimba Drop | two warm plucks, a rising fourth | new chat message |
| `notification` | Glass Bloom | one glassy bell strike that blooms | bookings, payments, everything general |
| `match` | Sonar Beacon | a radar sweep, then two pings, twice | Cabana Match guest requests and responses |
| `offer` | Sunrise | a golden sparkle climbing over a swell | stay offers, counter-offers |
| `promo` | Marimba Skip | a bouncy three-step skip and a landing | promotions, campaigns, rewards |

`CabanaAlerts.kindFor(notificationRow)` maps a notification to its sound (by `kind`, or `meta.offer_id` / `meta.stay_offer_id` / `meta.campaign_id`). To make a new campaign ring as a promo, send it with `kind: 'promo'`.

Sounds only play while Cabana is open and in front of the person (a browser rule: audio needs a first tap). When the app is closed the phone's own notification sound plays, which web push cannot change; the vibration pattern still differs per kind (`sw.js`).

People can preview and mute the sounds from **Notifications → 🔊 Alert sounds**. The choice is remembered in `localStorage.cabana_alert_sound`.

## The counts

- Bell: unread notifications, excluding chat messages.
- Messages icon (added beside the bell in the signed-in header): unread chat messages.
- The installed app's icon carries the combined total.

Anything can publish a count with `CabanaAlerts.setCount('notifications' | 'messages', n)`.

## Tests

`tests/cabana-alerts.test.mjs` proves the chimes are distinct (instruments, contour, length, vibration), stay in key, map correctly, throttle, and that the counts and labels render.
