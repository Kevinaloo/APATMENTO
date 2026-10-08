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

- **Catalogue:** 48 named people, 20 animal spirits (including a fennec, red panda, otter, penguin, bushbaby, African wild dog, peacock and dolphin) and 8 organisation emblems. Existing saved character indices are unchanged.
- **Customisation:**
  - People: skin, hair and headwear (including locs, braids, Bantu knots, headwrap, hijab and kofia), hair and fabric colours, eyes, smile, facial hair, accessories, outfit and backdrop.
  - Animal spirits: colour mood and accessories.
  - Emblems: shape, pattern, palette and symbol.
- **Motion:** Still, Calm or Lively, with independent animation phases. Lively characters perform expressive gestures with animated details; small dashboard and message icons keep moving too. Hover, focus or tap brings a reaction; the studio also offers Say hi, Dance and Send love. Motion pauses off-screen and in background tabs, and `prefers-reduced-motion` turns it off. Removed avatars are released from the observer.
- **Studio:** Search by character name or personality, customise with a live preview, and see the result at dashboard, message and profile sizes. Motion choices survive Surprise me and character-type changes. Keyboard users can navigate the tabs with arrow keys; focus stays on a choice after selecting it.
- **Everywhere:** Signed-in dashboard, partner dashboard and homepage icons use the saved avatar and link to `/profile`. The shared member-card renderer supplies listing, message, follow-list and public-profile avatars. Successful saves invalidate the member cache and notify other tabs; sign-out clears the account-scoped cache. Failed saves keep the draft.
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
  - `cabana-avatars.js`, `cabana-people.js`. Use `data-cp-avatar`, `data-cp-tick`, `data-cp-follow` and `data-cabana-person` on any page; `data-cp-self` renders the signed-in member. Call `CabanaPeople.changed(id)` only after a successful profile mutation.
  - `profile.html` (studio), `person.html` (public page), `admin-views-people.js` (console)
- **Tests:** `tests/people-profiles.test.mjs`, `tests/avatar-experience.test.mjs`, `tests/ui/people-profiles.cjs`, `tests/ui/avatar-experience.cjs`. The browser tests use isolated API fixtures and Chrome; they do not edit live member accounts.

## One identity

Verify once, and it counts everywhere:
- **Agents:** a Didit approval marks agent KYC verified. Agents who join after verifying inherit it.
- **Room viewings:** "Request a viewing" uses `CabanaIdentity.ensure('roommate')`. Verified members go straight to the chat with a suggested request.
- **Drivers:** the application shows that the identity carries over. Admins see whether the typed national ID matches the verified document (compared by keyed hash).
- **Partner pages:** a one-line nudge sits under the page title. It hides for 14 days when dismissed, and always shows on Settings.
- After verifying, `/profile?next=/path` sends the member back where they started.

The tick needs something live. Provider (Reef) requires one of: an active listing, a published tour, a published upcoming event, an active fleet vehicle, an approved driver, or an agent partnership on a live listing. An approved operator shell no longer counts.

### Duplicate and returning accounts

- **Fingerprints:** `identity_fingerprints` stores HMAC-SHA256 hashes, keyed with `IDENTITY_PEPPER`, of the document, ID number, name plus date of birth, and verifying device. Nothing is reversible.
- **Links:** `identity_links` connects accounts through those fingerprints, Didit's own duplicate matches (`vendor_data` is our user ID), shared phone numbers and email aliases.
- **Policy** (`api/lib/_identity.js#assess`):

| Evidence | Member sees | Operators |
| --- | --- | --- |
| Same document or face as a banned or suspended account (or on the denylist) | "We're double-checking a few details" | Critical alert, Linked accounts queue |
| Same document as another active verified account | "Already verified on another account (u••••d@gmail.com)", with a move request | Link to review |
| Same face on a different document | Review | Link |
| Shared device, phone or email alias | Nothing | Info or review link only |

- **Denylist:** `identity_denylist` keeps a banned member's fingerprints and SHA-256 phone and email hashes even after the account is deleted.
- **Moving a verification** (`identity_moves`, `/api/people?op=identity-move`):
  1. The new account taps **Move my verification here** on `/profile#verification`.
  2. The account that **holds** the verification is emailed and notified, with a link to `/profile?move=<id>#verification`. They sign in as that account and press **Yes, move it** or **No, that is not me**. The link survives the sign-in round trip, and a visitor signed in as the wrong account is told so and offered *Switch account*.
  3. Approving moves the tick, ID check, fingerprints and links across; the old account is left as `moved` and can verify again with a different ID. Declining keeps everything and raises an operator alert.
  4. Operators are emailed as a fallback only (deep link: `/admin.html#/profiles?tab=links`). If the owner cannot get back in, an operator can press **Move verification** (audited as `identity.move_operator`).
  Requests expire after 14 days, a member can send three a day, and every answer notifies both accounts.
- **Operator controls** (Console → Profiles & ticks → Linked accounts, which shows *who holds the verification* → *who wants it*, plus a Resolved history):
  - **Move verification / Decline the move:** the two decisions that change anything.
  - **Keep both verified:** both accounts may hold a verified ID; re-runs any identity check the link was holding back.
  - **Same person, noted:** only records it. Nothing changes for either account.
  - **Not related:** dismisses the link.
- The Identity panel in every member drawer shows the verification source, Didit warnings, agent and driver status, and linked accounts.
