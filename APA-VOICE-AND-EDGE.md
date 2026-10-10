# APA on the edge: Cloudflare AI, voice, security and R2 media

## What runs where

| Concern | Provider | Code |
| --- | --- | --- |
| Chat (fast lane 1) | Groq | `api/lib/_ai-gateway.js` |
| Chat (fast lane 2, independent) | Cloudflare Workers AI | `api/lib/_cloudflare.js` |
| Chat (premium cascade) | Vercel AI Gateway, Gemini, OpenAI | `api/lib/_ai-gateway.js` |
| Voice out | Cloudflare Workers AI, Deepgram Aura-2 (`thalia` by default) | `op: "speak"` in `api/lib/_support.js` |
| Voice in | Browser speech recognition | `cabana-support.js` |
| Public photos | Cloudflare R2 `cabana-media` | `api/lib/_r2.js`, `api/lib/_media-sign.js` |
| Private files (ids, selfies, receipts) | Supabase storage with RLS | unchanged |

Default order: `gateway, groq, cloudflare, gemini, openai`. A lane that is not
configured is skipped; a lane returning 401/402/403/429 cools down; a lane that
has not answered within `AI_HEDGE_MS` (2.5 s) is **raced** against the next one
and the first good answer wins. Images skip the text-only Groq and Cloudflare
lanes.

## Environment

Server only, in Vercel (Production and Preview):
`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_AI_API_TOKEN`, `R2_ACCOUNT_ID` (optional, falls back to the former), `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`.
Optional: `CLOUDFLARE_AI_MODEL`, `APA_VOICE_SPEAKER`, `AI_HEDGE_MS`.

The API token needs the **Workers AI** permission. The R2 key needs
**Object Read & Write** on `cabana-media` only.

## R2 one-time bucket setup (dashboard only)

1. **Public access.** Bucket, Settings, *Custom Domains*, add e.g.
   `media.cabana.africa`; set `R2_PUBLIC_URL=https://media.cabana.africa`.
   (`r2.dev` works for testing but is rate limited and not for production.)
2. **CORS**, so browsers can `PUT` to a presigned URL. Bucket, Settings,
   *CORS Policy*:

```json
[
  {
    "AllowedOrigins": ["https://cabana.africa", "https://www.cabana.africa"],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

Until both are done, uploads quietly fall back to Supabase storage; nothing breaks.

### What goes to R2, and what stays in Supabase

**Rule: anything that is fine for everyone to see goes to R2; Supabase storage is for private data.**

Routed to R2 (Supabase only as a fallback if R2 is off or fails), all through
`cabana-r2.js` and `/api/media-sign`:

| Upload | Kind |
| --- | --- |
| Stays, roommates and every other listing photo (add-listing, admin console) | `listing` / `food` / `shop` / `car` / `tour` / `event` |
| Food menu dish photos (partner-menu) | `food` |
| Photos collected by APA in chat | `listing` |
| Tours, events and places: photos **and video clips** (shared uploader, tours page admin) | `tour` / `event` / `place` |
| Ad creatives | `ad` |

Images up to 10 MB and clips (mp4, webm, mov) up to 100 MB. Deleting a photo
in the uploader also deletes it from R2 (`op: "delete"`, owner or admin only).

Stays in Supabase on purpose: identity documents, selfies, receipts, KYC,
organisation documents, agent documents, evidence, pending profile photos
(held for moderation), karaoke recordings and private immersive/live media.

Not yet moved (public but written by server-side or resumable pipelines):
profile avatars after moderation, immersive/live admin media. Existing files
keep working from Supabase; nothing is migrated automatically.

The database accepts R2 URLs where it validates photo hosts
(`spotlight_media_ok`, `hotel_room_type_save`; migration
`20261010100000_r2_public_media_urls.sql`, additive: the Supabase host is still accepted).

Object keys are generated on the server (`<kind>/<user-id>/<uuid>.<ext>`), the
URL expires in 5 minutes, and content type and size are part of the signature.
Never add a kind for documents, selfies, receipts or contracts.

## Voice

* One tap on the mic starts a conversation: listen, send, APA answers out loud,
  and the microphone **reopens by itself** with a soft cue.
* Silence: one quiet re-listen, then a spoken "Still there?", then the
  conversation steps back. Saying "that's all", "stop" or "bye" ends it, as does
  APA's own `[[end]]`.
* Tapping the mic while APA talks cuts her off and gives you the floor; typing
  does the same.
* Replies carry a server-built **spoken form** (`speech`): no emoji, markdown,
  links or directives, currency in words, split into short sentences that are
  synthesised in parallel so the first sentence starts quickly. If the neural
  voice is slow (over 4.2 s to the first sentence) or down, the best on-device
  voice finishes the reply. Swahili, French and Spanish go to the device voice.
* In voice mode the model is told to answer like a person on a call: one to
  three short sentences, no lists, one natural follow-up question.

## Security layers (`api/lib/_apa-shield.js`)

1. **Input.** Normalised (Unicode tricks, homoglyphs, leetspeak, spaced letters)
   and scored against override, persona, extraction, secrets, fake-authority,
   encoding and tool-abuse patterns in several languages. A clear attack never
   reaches a model: it gets a fixed, friendly deflection. Five blocked attempts
   in ten minutes shuts the door for that caller.
2. **Data.** Listings, KB rows and tool results are defused of instruction-shaped
   text before the model reads them.
3. **Prompt.** An explicit security block says what is untrusted and what never
   changes; a suspicious-but-not-blocked message adds a caution for that turn.
4. **Output.** A canary plus prompt fingerprints catch a leaked prompt (the reply
   is replaced); keys, tokens, numbers and internal routes are stripped.
5. **Authority.** Tools validate every argument and scope every query to the
   caller, so even a fully jailbroken model cannot read or move anyone else's
   data or money.

The speech endpoint is rate limited (90/min, 240/hour per caller) and caps text
at 420 characters, so it cannot be used as a free general text-to-speech.
