# Cabana Immersive

VR and 360° experiences on `/tours`. A guest steps inside a safari, a reef or a
city before booking it, or instead of going. It works on a phone, a laptop, a
phone slotted into a cardboard-style VR viewer, and a real headset (Meta Quest,
Apple Vision Pro, anything with WebXR).

It is a paid product that launches as a **free trial**. Who may watch is
decided by the database, and switching from the trial to paid is one setting in
the console.

---

## What a guest sees

**The band on `/tours`**, between the meridian and the reel. A dark section with
a headset whose lenses already show the featured world, panning, with a HUD that
reads the heading it is showing. It tilts toward the pointer on desktop.

- **Step inside** opens the featured world. Clicking the headset does the same.
- **How do you want to watch?** Screen, Fullscreen, VR viewer, Headset. Modes the
  device cannot do stay visible but disabled, with the reason (a laptop is told a
  headset works too). The choice is remembered. On a headset browser, Headset is
  preselected.
- **Worlds to step into**: a rail of cards with format (360°, 180°, 3D, Cinema),
  interactive badge, length, scene count, and a lock or a *Free trial* chip.
- Tour cards in the listings get a **360°** badge when a world is linked to
  them, and the tour sheet gets a **Step inside before you book** button.

**The free-trial banner.** A holographic pass that drops in once the page's
entry animation is done, says *Enjoy a free trial*, and dismisses itself after 9
seconds (hover or focus pauses it; swipe up or ✕ closes it). It shows at most
once every 12 hours per visitor, only while the trial is running, and waits its
turn behind the welcome gift and referral popups using the platform's shared
`window.__cabanaOverlay` flag.

**The player.**

1. *Headset on*: two lens rings draw in, calibration lines tick off against the
   real load, then the iris opens onto the scene and the world comes into focus.
2. Look around: drag, scroll or pinch; on a phone, move the phone (the motion
   permission is asked for inside the tap, as iOS requires).
3. *Presence motion*: a slow breath in the view, and a drift on stills when
   nobody is touching them. Turned off for anyone whose device asks for reduced
   motion, and switchable in the console.
4. HUD: compass strip with marker dots, a radar with the field-of-view cone,
   scene counter, timeline with marker ticks, and a **Book it** card when a tour
   is linked. It fades after a few seconds and returns on movement or a tap.
5. Markers: info cards, *walk to* another scene (the camera turns toward the
   doorway and leans in while the next scene fades up, arriving facing the same
   way), *book the tour*, *jump in the film*, *open a link*. On video a marker can
   appear only between two moments.
6. **Fullscreen** is a toggle everywhere. On desktop, Screen mode is a framed
   window over the page, so the toggle is a visible change. iPhone Safari cannot
   put a page element fullscreen; the player is already edge to edge there and
   suggests adding Cabana to the Home Screen once.
7. **VR viewer**: a "slot your phone in" screen (or "turn it sideways"), then two
   barrel-distorted lens views with a gaze reticle. Look at a marker for 1.5
   seconds to press it; info appears as a panel drawn in the world. Tap to leave.
8. **Headset**: opens a WebXR session. Stereo footage is split correctly per
   eye; markers are drawn in the world; trigger to press, grip to leave.
9. End card for films that do not loop: *Book it*, *Watch again*, *Next world*.
10. Back button closes the player. Links like `/tours?vr=<slug>` open a world
    directly; the boot screen asks for one tap so sound and motion are allowed.

With no footage published yet, the band still works: it offers **Amboseli at
dusk**, an illustrated two-scene world painted in code (Kilimanjaro, a herd, a
moonlit nightfall), labelled *Illustrated* everywhere, never counted in
analytics. A "New worlds are being filmed" card says honestly that more is
coming.

## What an operator does

Console → **Operations → Immersive**.

**Worlds**: KPIs (live, plays, time inside, pass requests), cards with status,
format, featured and pass flags, per-world plays / average time / finish rate,
publish/unpublish, reorder, feature, open on /tours, copy share link, archive,
delete (removes every file uploaded for it).

**The studio** (New world, or Edit):

- **Preview**: the same engine guests use. *Add marker* then click to place;
  drag markers to move them; *Set start view* records where guests arrive facing.
  Video gets a scrubber so markers can be timed.
- **Scene strip**: add, reorder, delete, choose the start scene.
- **World tab**: title, web address (auto from the title), one line, description,
  place, credits, **linked tour** (drives Book it and the listing badge),
  **access** (Free, or Pass), order, length, featured, poster (made
  automatically, from the current view, or uploaded).
- **Scene tab**: drop the file. Big files are fine: uploads are **resumable**
  (Supabase TUS, 6 MB chunks) with pause, resume, cancel, speed and time left,
  and they retry through dropped connections. On drop the studio:
  - reads the dimensions and guesses the projection (2:1 → 360° mono, 1:1 → 360°
    top-bottom 3D, 4:1 → 360° side-by-side 3D, `180` in the name → VR180, anything
    else → flat cinema), always overridable;
  - warns if the browser cannot decode it (HEVC, ProRes, 10-bit) or if it is too
    wide for phones;
  - makes a poster from the left eye and, for panoramas wider than 4096 px, a
    phone-sized copy automatically.
  Optional: a **phone version** of a video, an **HLS stream** link, a direct link
  instead of an upload, **ambient sound** under a still, loop on/off.
- **Markers tab**: type, label, card text, target scene / seconds / link, exact
  yaw and pitch, time window with *from now* / *until now*, look at it, move to
  view centre, delete.
- Save checks everything in words before the round trip. Files taken off a scene
  are deleted only after the next successful save. A new world abandoned before
  its first save deletes its own uploads.

**Access & trial**: one switch between **Free trial** (with an optional end
date), **Open to all**, and **Pass holders**; the banner's headline and line with
a live preview; presence motion; pass price and length. Pass requests from locked
worlds appear here and in the console inbox (with a nav badge): grant by email
(any length, or never expiring), close, revoke.

**Insights**: plays per day, how people watch (screen, fullscreen, viewer,
headset), average time, finish rate, per-world table.

## Who may watch

| Mode | Worlds marked **Free** | Worlds marked **Pass** |
|---|---|---|
| Free trial, before its end date | open | open |
| Free trial, after its end date | open | pass holders only |
| Open to all | open | open |
| Pass holders | open | pass holders only |

Admins can always watch everything, including drafts.

This is enforced by storage, not by the page:

- Scene media lives in the **private** bucket `immersive` under
  `exp/<world id>/…`. A signed URL is only issued when the storage policy calls
  `immersive_object_readable(name)` → `immersive_can_watch(world)` and it says
  yes. The page asks for signed URLs when the player opens; a lapsed trial fails
  there and shows the pass screen.
- A world may only reference private media in **its own folder** (the
  `immersive_media_outside_folder` trigger check), so a pass world cannot borrow
  a free world's gate.
- Posters live in the **public** bucket `immersive-public`, because a locked
  world still has to be shown to be sold.
- External links and HLS streams are not paywalled; the studio says so.

**Paying for a pass** is arranged by the team for now: the pass screen collects
a request (phone or WhatsApp), which lands in the console and inbox; an operator
grants the pass by email. Nothing is charged on the page. Self-serve M-Pesa
checkout is the natural next step: insert into `immersive_passes` with
`source = 'purchase'` from the payment callback.

## Footage that plays everywhere

| | Recommended |
|---|---|
| Container / codec | MP4, H.264 High, AAC audio, `+faststart` |
| 360° mono master | 5760×2880 or 7680×3840 for desktop and headsets |
| Phone version | 3840×1920 or 4096×2048 (most phones will not decode wider) |
| 360° 3D top-bottom | master 5760×5760; phone version 2880×2880 |
| VR180 3D | 5760×2880 side-by-side; phone version 3840×1920 |
| Panoramas | JPEG 2:1, any size; a 4096 px phone copy is made for you |
| Long or live footage | HLS on Mux, Cloudflare Stream or Bunny, CORS open to cabana.africa |

A phone version, from any master:

```sh
ffmpeg -i master.mp4 -vf scale=3840:1920 -c:v libx264 -profile:v high -preset slow \
  -crf 20 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 160k phone.mp4
```

The player picks the phone version on phones and on Save-Data or 2G, falls back
to it if the big file fails to decode or is wider than the GPU allows, and as a
last resort draws an oversized frame through a canvas at the GPU's limit.

**Storage upload limit.** The `immersive` bucket allows 5 GB per file, but
Supabase also has a project-wide cap under *Storage → Settings → Upload file size
limit*. If an upload is refused as too large, raise that cap (Pro plan) or export
a smaller file; the studio shows this message.

## Engineering notes

**Files**

| File | What |
|---|---|
| `cabana-immersive-engine.js` | WebGL renderer, controls, gyro, visor, WebXR, the illustrated world |
| `cabana-immersive.js` / `.css` | the band, banner, player, pass screen, analytics |
| `admin-views-immersive.js` / `admin-immersive.css` | the console view and studio, TUS uploader |
| `supabase/migrations/20260926170000_cabana_immersive.sql` | tables, rules, buckets, policies, console RPCs, inbox queue |
| `tests/immersive.test.mjs` | maths, security contract, page wiring, guest behaviour |

**The renderer** is one full-screen fragment shader with no sphere mesh: every
pixel computes its ray and reads the texture at that exact longitude and
latitude, so poles do not pinch. The same pass draws equirect mono / top-bottom /
side-by-side, VR180 mono / side-by-side, and flat film on a lit cinema screen
with a floor reflection; cross-fades two scenes; draws markers, a gaze reticle
and text panels in-world for the viewer and headset; applies barrel distortion
per lens in viewer mode. WebXR views pass their own projection matrices, so
asymmetric headset frusta are exact. Video frames are uploaded only when new
(`requestVideoFrameCallback`), the loop pauses when the tab is hidden, and a lost
GL context is restored with its textures. With no WebGL at all, video plays flat
and panoramas pan as a strip.

**Data**

- `immersive_experiences`: the world, with `scenes` as JSON validated by
  `immersive_scenes_valid` (shape, projections, https or own-folder media, up to
  40 scenes and 60 markers each, marker targets that exist). A trigger derives
  `format`, `media`, `stereo`, `interactive`, `scene_count`, `start_scene` and
  `published_at`, and refuses to publish an empty world.
- `immersive_settings` (one row): mode, trial end, banner, price, pass length,
  presence motion.
- `immersive_passes`, `immersive_pass_requests`, `immersive_plays`.
- Guest RPCs: `immersive_state()`, `immersive_log_play(...)` (under two seconds
  is not a play), `immersive_request_pass(...)` (signed-in only). Console RPCs:
  `admin_immersive_overview`, `admin_immersive_passes`,
  `admin_immersive_pass_action`, each behind `cabana_admin.guard()`.
- `admin_inbox` gains an `immersive_requests` queue through an idempotent patch
  in the migration rather than a forked copy of that function.

**Testing**

```sh
node --test tests/immersive.test.mjs   # 19 tests
npm test && npm run check:syntax
```

The browser checks behind this release were run in headless Chromium with
software WebGL: every projection rendered from labelled test media (left eye
really gets the top half), video textures streaming, the full player flow on
desktop and phone including viewer mode, and the studio against a mocked backend
that speaks the TUS protocol. The studio's saved payload was then inserted into
the live database as an admin inside a rolled-back transaction to prove the
constraints accept it.

**Next steps worth doing**

- Self-serve pass checkout through the existing M-Pesa flow.
- Adaptive streaming for long films (upload to Mux or Cloudflare Stream from the
  studio instead of pasting a link).
- Spatial (ambisonic) audio for 360° video.
- A `north` offset per scene so the compass reads true north.
