# Apatmento. Real-Time Push Notifications & PWA

Apatmento now installs as a real app and delivers real-time notifications.
No APK, no store review, no forced updates. You deploy, users get it instantly.

---

## 1. Run the database migration

In **Supabase → SQL Editor**, paste and run `schema-push.sql`.

Creates:
- `push_subscriptions`. One row per browser/device, keyed on endpoint
- `notifications`. The in-app feed, published to Supabase Realtime

Then confirm Realtime is on for the table:
**Database → Replication → `supabase_realtime`** → `notifications` should be checked.

---

## 2. Set environment variables

In **Vercel → Project → Settings → Environment Variables**, add:

| Name | Value |
|---|---|
| `VAPID_PUBLIC_KEY` | `BIteWNc_QXpcPP2rj0BDVOzFZYUs7mFpys-QdUwwFbtqGANd2l59OOplmMKjQ8X5i2F0SsDn3v4F9S-8XSMSXT8` |
| `VAPID_PRIVATE_KEY` | `DfconNBBV9h8e8I44JGIoa4J9JUVwjAu5CE1iuX5RE0` |
| `VAPID_SUBJECT` | `mailto:apatmento@gmail.com` |
| `SUPABASE_SERVICE_ROLE_KEY` | *(Supabase → Settings → API → `service_role`)* |
| `PUSH_ADMIN_SECRET` | *(any long random string you invent)* |
| `PUBLIC_BASE_URL` | `https://www.apatmento.space` |

> **The private key is a secret.** It's in this file only so you can copy it
> into Vercel once. It must never appear in client-side code, and it is not
> referenced by any file the browser downloads. If it ever leaks, regenerate
> the pair and update both `pwa.js` and `apa-push.js` with the new public key.

---

## 3. Sending a notification

From any API route:

```js
import { Notify } from './_notify.js';

await Notify.bookingConfirmed(booking.guest_id, listing.title);
await Notify.paymentReceived(user.id, 4500);
```

Or fully custom:

```js
import { notify } from './_notify.js';

await notify({
  user_id: someUserId,
  title: 'Your driver is here',
  body:  'Toyota Axio · KDA 123X · arriving now',
  url:   '/rides.html',
  kind:  'general',        // booking | payment | message | general
});
```

Good places to wire this in: `api/stk-callback.js` (payment confirmed),
and wherever a booking row flips to `confirmed`.

### Test it by hand

```bash
curl -X POST https://www.apatmento.space/api/push-send \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: YOUR_PUSH_ADMIN_SECRET" \
  -d '{"user_id":"<a-real-user-uuid>","title":"Hello","body":"It works","url":"/"}'
```

---

## How the two channels fit together

Every notification is written to the `notifications` table **first**, then
pushed. That ordering is deliberate:

- **Tab open** → Supabase Realtime fires an `INSERT` event → in-app toast.
- **Tab closed** → the service worker's `push` handler shows an OS notification.
- **Push blocked or subscription dead** → the row still exists, so the bell
  badge and dashboard feed are correct on next load.

Nothing is silently lost, and the user never sees the same alert twice
`apa-push.js` suppresses the toast when the page is hidden, because the
service worker is already handling it.

Dead subscriptions (HTTP 404/410 from the push service) are pruned
automatically on the next send.

---

## Why a PWA and not an APK

This was the right call for where the product is:

- **Ship instantly.** Push a commit, every user has it on next load. No store
  review, no version fragmentation, no users stuck on a build from March.
- **One codebase.** Android, iOS, and desktop from the same source.
- **Installable.** Home-screen icon, splash screen, full-screen, offline
  users can't tell the difference in normal use.
- **Real notifications.** Web Push works on Android/Chrome/Edge/Firefox, and
  on iOS 16.4+ **once the user adds it to the Home Screen**.

### The one caveat worth knowing

iOS only permits Web Push for sites installed to the Home Screen. On iOS the
"Get the App" button therefore shows *"Add to Home Screen"* and explains the
Share-sheet steps, because Safari exposes no programmatic install API.
Android and desktop Chrome get the native one-tap install dialog.

If you later need Play Store presence, the same PWA wraps into a
[Trusted Web Activity](https://developer.chrome.com/docs/android/trusted-web-activity/)
with no rewrite. The store listing becomes a thin shell over this code, and
you keep instant updates.

---

## Files

| File | Role |
|---|---|
| `schema-push.sql` | Tables, indexes, RLS policies |
| `api/push-send.js` | VAPID + RFC 8291 encryption, delivery, pruning |
| `api/_notify.js` | Ergonomic wrapper + message presets |
| `apa-push.js` | Client: subscribe, realtime feed, toasts, bell badge |
| `pwa.js` | Install prompt, SW registration, permission flow |
| `sw.js` | `push` / `notificationclick` / `SKIP_WAITING` handlers |

The encryption in `push-send.js` was validated byte-for-byte against the
official RFC 8291 §5 test vector, and round-tripped through a simulated
browser decrypt. It is not approximate.
