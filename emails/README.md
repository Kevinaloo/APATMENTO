# One-off emails

Hand-written emails that are sent manually, once, after approval. They are
not templates: the transactional emails live in `api/lib/_mail.js`.

## kileleshwa-3d-tour-celebration

Celebrates the 3D tour Cabana built for the host of
"Fully furnished Elegant 1Bedroom in Kileleshwa"
(listing `2d488e1a-3582-409f-ac3c-5f67adc90c74`), tells her the listing is
featured, and asks her to explore and share the tour.

- **For:** the host (Mariana). Sent manually by the Cabana team after approval.
- **From:** Cabana Partnerships `<partnership@cabana.africa>` (host-facing inbox, per `api/lib/_brand.js`).
- **Subject:** Mariana, your Kileleshwa home now opens in 3D ✨
- **Preheader:** Guests can now walk through your apartment before they book. It's one of only three homes on Cabana with a 3D tour, and it's featured today.
- **Alternative subjects:**
  - Your home is one of only three on Cabana you can walk through
  - Step inside: we built your apartment in 3D
  - Featured today: your Kileleshwa apartment, in 3D
- **Files:** `kileleshwa-3d-tour-celebration.html` (email-client-safe: tables,
  inline styles, fluid up to 600 px, dark mode, preheader, alt text, no JS or
  web fonts) and `kileleshwa-3d-tour-celebration.txt` (plain-text part).

Send only after the 3D tour engine and sharing release is deployed: the
"Step inside" link (`&tour=1`) and the share link (`/s/<id>`) depend on it.
Photos come from her listing through the Supabase image renderer, so they
are cropped for email without any new hosted files.
