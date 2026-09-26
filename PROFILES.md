# Cabana profiles

Individual and organisation profiles, three verification ticks, follows, living avatars and moderated photos.

## The three ticks

| Tick | Colour and shape | Who gets it | How |
| --- | --- | --- | --- |
| Verified identity | Purple, scalloped seal | Individuals | Didit ID + liveness + face-match check, a reviewed agent ID, or a host verified by a Cabana operator |
| Verified organisation | Gold, scalloped seal | Organisation accounts | Registration document reviewed in the console **and** the person running the account holds a purple tick |
| Verified Cabana provider | "Cabana Reef" teal→indigo gradient, cabana-roof shape with a gold ridge and slow sheen | Verified people or organisations who actively offer services | Automatic: a live listing, an approved tour operator or event organiser, a verified fleet, an approved Cabana Move driver, or a host-approved agent partnership |

The provider tick outranks the other two and falls back to purple or gold as soon as the member stops offering services. Ticks are computed on every read by `cabana_people_cards()` and are never stored on a profile, so a member cannot write one. Names containing checkmark or badge symbols, or words like "Cabana", "official" or "verified", are refused. A verified organisation's name is protected: nobody else can take it.

## Avatars

`cabana-avatars.js` draws every character as SVG from a spec of about 120 bytes stored in `member_public_profiles.avatar`.

- **Catalogue:** 38 named people, 12 animal spirits (Simba, Tembo, Twiga…) and 8 organisation emblems.
- **Customisation:**
  - People: skin, hair and headwear (including locs, braids, Bantu knots, headwrap, hijab and kofia), hair and fabric colours, eyes, smile, facial hair, accessories, outfit and backdrop.
  - Animal spirits: colour mood and accessories.
  - Emblems: shape, pattern, palette and symbol.
- **Motion:** Still, Calm or Lively. Breathing, blinking and a gentle sway, each avatar on its own phase. Below 40px only the blink survives. Motion pauses off-screen and in background tabs, and `prefers-reduced-motion` turns it off.
- **Defaults:** members who never choose get a deterministic animal spirit (organisations get an emblem). Cabana never guesses anyone's skin tone or gender.

## Photos

Only purple-tick individuals and gold-tick organisations can upload.

1. The browser crops the photo square, shrinks it to 720px and re-encodes it, which strips GPS/EXIF data. The file goes to the private `profile-pending/<uid>/` folder.
2. `POST /api/people?op=photo` checks it against a written policy using a vision model: AI Gateway, Gemini or OpenAI through `_ai-gateway.js`, then Groq `qwen/qwen3.8-27b` as the free fallback.
3. What happens next depends on the scores:
   - **Every score clear:** the photo is published to the public `profile-photos` bucket.
   - **A confident hit:** the file is deleted and its SHA-256 blocked.
   - **Unsure, or the model is unavailable:** a moderator decides in **Console → Profiles & ticks**.

Other safeguards:
- A child-safety hit also raises a critical operator alert.
- Three rejections in 30 days pause uploads for that account.
- Three members reporting a photo hides it until a moderator decides.

## Privacy

- The only public projection is `cabana_people_cards()` plus the fields the API chooses.
- Email, phone, payments, ID numbers, documents and exact location are never exposed.
- Unpublished travellers are invisible to strangers. People they are already messaging see only their first name and look.
- Hosts, agents and organisations always show a basic card on their listings.
- `/u/:handle` pages are `noindex`.
- The Didit integration keeps only the outcome, document type and country, expiry, and "First L." (shown to the member only). Members under 18 and expired documents are declined.
- Didit webhooks are a nudge only. The server re-reads the decision with its own key, for sessions it created itself.

## Setup

1. Add `DIDIT_API_KEY` in Vercel. Get it from the Didit console: your **live** application → API keys.
2. Optionally set `DIDIT_WEBHOOK_SECRET` from the webhook pointing at `https://cabana.africa/api/didit-webhook`.
3. Photo checks use the AI providers already configured. With none available, every photo waits for a person.

## Files

- **Database:** `supabase/migrations/20260926120000_people_profiles_v2.sql`, `…121000_people_provider_badge.sql` (both applied)
- **API:** `api/lib/_profiles.js`, `_didit.js`, `_moderation.js`, `_avatar-spec.js`, routed through `/api/people`
- **Client:**
  - `cabana-avatars.js`, `cabana-people.js`. Use `data-cp-avatar`, `data-cp-tick`, `data-cp-follow` and `data-cabana-person` on any page.
  - `profile.html` (studio), `person.html` (public page), `admin-views-people.js` (console)
- **Tests:** `tests/people-profiles.test.mjs`, `tests/ui/people-profiles.cjs`
