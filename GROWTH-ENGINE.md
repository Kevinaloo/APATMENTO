# Growth engine: Beacon, Compass, search words, APA episodes

Cabana's search visibility, personalisation and assistant memory, built on
one idea: the database already knows the truth about what is for sale, so
everything else should read it live rather than be rebuilt by hand.

- **Beacon** gives every live listing, tour, event and car its own
  search-ready page, and every place with supply its own hub. It announces
  changes to search engines within a minute and retires pages honestly
  when things go.
- **Compass** learns what each visitor is looking for, shows them the
  right things first, and gives the console the demand picture: where
  people search, and where Cabana has nothing to sell them yet.
- **Search words** make every surface speak the way people search: an
  airbnb in Kilimani, a bnb near JKIA, car rental, safari packages, a
  bedsitter in Rongai, a shortlet in Lekki.
- **APA episodes** end a conversation without forgetting the person, so a
  new question gets a fresh conversation.

---

## Go-live checklist

Do these in this order. Steps 1 and 2 belong together: the code reads
functions the migration creates.

1. **Apply the migration** `supabase/migrations/20261009120000_growth_engine.sql`
   to production (project `gfwgbgdvxtocwhilrtdw`). It is idempotent, so a
   second run is harmless. What it creates:
   - the catalogue, entity, change-feed and place functions;
   - the `compass_*`, `beacon_*` and `apa_episodes` tables (RLS on,
     closed to `anon` and `authenticated`);
   - two columns on `support_threads`;
   - a capture trigger on `listings`, `tours`, `events` and `car_fleet`.
     It is wrapped so it can never fail a write: it warns instead.
   - three `pg_cron` jobs: the pulse every minute (it only calls out when
     something changed), an hourly refresh at :23, and a nightly prune.

   Checked against production on 2026-10-09: none of these objects exist
   yet; `car_fleet.chauffeur_uplift_metro` is an integer, as the catalogue
   expects; and `cabana_ops.cron_config` already holds `cron_secret`. The
   migration adds `beacon_pulse_url` itself.
2. **Merge and deploy.** `api/growth.js` is the twelfth and last function
   the Hobby plan allows (see Limits below).
3. **Environment variables** (Vercel). Neither is required to go live:
   - `INDEXNOW_KEY`: optional. Without it, the committed key file
     `cabana2026apatmentoindexnow8f4e9b.txt` is used.
   - `GITHUB_DISPATCH_TOKEN` (with `GITHUB_REPOSITORY`): optional. When a
     place gains or loses all its supply, the pulse asks GitHub to rebuild
     the static pages, so the index gate can promote or hold them.
   - `CABANA_SEO_BRAND_TERMS=off`: only if you want the word "Airbnb" off
     every page (see Search words).
4. **Check it works:**
   - open `/sitemap-live.xml`, one `/stay/...` page and its place hub;
   - open Console, then **Search engine** and **Intelligence**;
   - edit a listing, and within a minute it appears in Search engine,
     under Changes, as announced.
5. **Tell the search engines once.** In Google Search Console and Bing
   Webmaster Tools, submit `https://cabana.africa/sitemap-index.xml`. It
   lists the live sitemap. The Brand tab in the console tracks this.

---

## How a listing reaches Google

```
host publishes / edits / pauses / deletes
        │  trigger (never fails the write)
        ▼
beacon_changes  ──(pg_cron, every minute, only if pending)──►  POST /api/growth?op=pulse
                                                                  │
            ┌─────────────────────────────────────────────────────┤
            ▼                                                     ▼
 catalogue refetch (beacon_version moved)            IndexNow: the page, its hubs,
 → /stay/<slug>-<key> renders from the database      old URLs of a renamed listing
 → hub /<place>-apartments updates                   (Bing, Yandex, Seznam, Naver, Yep)
 → /sitemap-live.xml and /llms-live.txt update       → GitHub rebuild if a place's
                                                       supply flipped (optional)
```

| URL | What it is |
|---|---|
| `/stay/…`, `/room/…`, `/tour/…`, `/event/…`, `/car/…`, `/eat/…`, `/shop/…` | One page per live thing. Slug from title and place; the trailing key decides, so a rename 301s. |
| `/<place>-apartments`, `-safaris`, `-car-hire`, `-events`, `-restaurants`, `-rooms` | Live hubs for places without a hand-built page. Static pages always win. |
| `/sitemap-live.xml` | Every indexable live page and live hub, with images. |
| `/llms-live.txt` | The live catalogue for AI assistants, in plain markdown. |
| `/badge/<family>/<key>.svg` | The "Book direct on Cabana" badge hosts put on their own sites. Each one is a backlink. |

**The pages only say what the data says.** They show no rating unless
real reviews are printed on the page, no amenity the host did not list,
and no street address (the area is public, the door is not). The price is
the all-in price from `cabana_all_in_prices`; if that cannot be read, the
page shows no price rather than a wrong one. A thin page (no photos, no
price, a one-line description) still renders for people but asks not to
be indexed. The console's **Fix list** says what each one needs, and has
a ready message for the host.

A removed listing answers **410** with what is live nearby. An unknown
key answers **404**.

---

## Search words

`api/lib/_search-terms.js` is the single source. It holds the words, the
evidence for them, and every rule below.

**Measured monthly searches** (estimates): "airbnb nairobi", "car hire
nairobi" and "car rental nairobi" are 8,100 each; "safari packages kenya"
1,300; "accommodation nairobi" 1,000; "airbnb kenya" 590 (Serpstat, Kenya).
In Nigeria: "airbnb lagos" 1,000, "shortlet apartment lagos" 880, "short
let lagos" 20 (Semrush). One word, spelled the local way, is the
difference. The console's **Search words** tab shows the full table.

**Where the words go:**

| Surface | Example |
|---|---|
| Listing title | `The Jets Nest, Obama Estate · BnB \| Cabana` · `… · Car hire` · `… · Tickets` |
| Description | `BnB apartment in Obama Estate, Nairobi · 1 bedroom · Sleeps 2. KES 1,500 / night, all-in. Book it like an Airbnb, direct with Jets: zero commission.` |
| Hub title | `Airbnbs, BnBs & Apartments in Kilimani, Nairobi` · `Shortlet Apartments & Airbnbs in Lekki, Lagos` · `Car Hire & Car Rental in Westlands` |
| Hub FAQ | "How much is an Airbnb in Kilimani per night?" · "Can I pay for a BnB in Kilimani with M-Pesa?" · "Is Cabana the same as Airbnb?" |
| Links between hubs | `Airbnbs & BnBs in Kileleshwa` (link text tells Google what the page is about) |
| Static pages | Every stay place page in Kenya, Nigeria, Ghana, South Africa, Tanzania, Uganda and Rwanda, the city pages, and the core service pages |
| Search, APA, Compass | "2 bedroom airbnb in kilimani under 5k for 4" becomes a stay in Kilimani, 2 bedrooms, 4 guests, up to KES 5,000 |

**The rules:**

1. A word that makes a claim is used only when the data makes it true.
   "With a driver" appears only where the operator prices one. "Safari"
   is used only for a safari, "bedsitter" only where one is listed, and a
   lodge is never called a BnB.
2. "Airbnb" is used only as the everyday word for a furnished place booked
   by the night:
   - it is never a label on a listing (listing titles say "BnB", which is
     nobody's trademark);
   - it always sits beside a plain line saying Cabana is independent and
     not affiliated;
   - `CABANA_SEO_BRAND_TERMS=off` removes it everywhere in one step.

   ⚖ Comparative use of a competitor's mark is common practice and is
   written here to be truthful and non-confusing. Even so, it is worth a
   lawyer's glance before a marketing push leans on it.
3. Each word goes once in each place that counts, in a sentence a person
   would write. Never a keyword list, never hidden text.

**Adding a word:** add it to `INTENT` (it only names a service) or `KIND`
(it also describes the thing) in `_search-terms.js`. Add a case to
`tests/search-terms.test.mjs`.

---

## Compass: who people are, what to show them

**Collected:** page and listing views, searches (place, dates, party,
budget), saves, shares, checkout starts and dwell time. Each visitor gets
a random id; signed-in members are linked across devices.

**Derived:**
- interest by service, place, price band and amenity, which halves after
  30 quiet days;
- intent stage and lifecycle;
- origin (local, regional or international, from the country the network
  reports);
- about 26 audience segments.

**Used for:**
- the For-you rails on the home and stays pages;
- APA's sense of who it is talking to;
- the console's Intelligence view: the funnel, the hottest prospects,
  demand against supply ("onboard here"), audiences, and what people type
  into Cabana's own search boxes.

**Limits that are enforced in code:**
- No tracking at all under Do Not Track, Global Privacy Control, or the
  opt-out on the privacy page. Opting out stays off until the person turns
  it back on.
- Anyone can see what Cabana has inferred about them, and erase it, from
  `/privacy#personalisation`.
- Audiences appear in the console as counts, with how many people in each
  have consented to ads. There is no per-person export, and nothing is
  sent to advertisers. The host-prospect lists are internal and never
  shown as an ad audience.
- Search phrases that look like a phone number or an email address are
  never shown in the console.
- Retention: events 400 days, anonymous profiles 400 days after last seen.

⚖ The privacy and cookie pages were rewritten to describe this
truthfully. Have them reviewed against the Kenya Data Protection Act
before advertising uses audience data commercially.

---

## APA: conversations end, the relationship does not

A thread is the whole relationship with a person; an **episode** is one
conversation in it.

**When an episode ends:** after 45 minutes of silence, when the person
taps **New chat**, or when they plainly change the subject.

**When it closes:**
- it is summarised into `apa_episodes`;
- durable facts go to APA's memory;
- a divider marks the start of the next conversation.

**What the next conversation sees:** only its own messages, plus short
dated notes from earlier ones. A new question is never treated as a
continuation, and APA still knows who it is talking to.

**What APA can read live:**
- the catalogue (every service, all-in prices, page links, anything new
  in the last 48 hours);
- one listing in full through `get_listing`, so it answers from the
  host's own data instead of guessing.

**Escalation:**
- Ordinary questions stay with APA ("become an agent", "is it legal to
  drive with a foreign licence?").
- Real requests reach a person: asking for a human, safety, legal,
  billing and fraud.
- When the AI is down, the knowledge base answers before anything is
  escalated.

---

## The static SEO build (and why CI was red)

`python3 seo/run_all.py && git diff --exit-code` is the CI check. It
could not pass, for four reasons that are now fixed:

- **Sitemap dates.** The sitemaps stamped today's date on every URL, so
  the output changed every morning. Each URL's `lastmod` is now the day
  that page's content last changed, remembered by hash in
  `seo/data/lastmod.json`.
- **Templates.** The generator templates carried a newsletter and search
  footer the live pages do not have.
- **Private pages.** The repair sweep un-hid the 404 page, the rider app
  and partner tools. It now keeps a page's own `noindex`.
- **Index gate.** It mislabelled pages it was holding back.

Three consecutive builds are byte-identical. After editing any static page:

```
python3 seo/run_all.py && python3 seo/polish.py
git add -A && git commit
```

---

## Ranking for "Cabana" alone

"cabana" is a dictionary word (a poolside shelter), so on-site work alone
cannot win it. What decides it is Google recognising Cabana as an entity
and people searching for it by name. The console's **Brand** tab tracks
each step:

- Google Business Profile
- Search Console and Bing Webmaster Tools
- a Wikidata item
- LinkedIn, Instagram and Facebook pages (then add them to `sameAs` in
  `seo/lib/schema.py`)
- Crunchbase
- host badges on providers' own sites
- the zero-commission press story

The site already carries the `Organization` graph with `alternateName`
("Cabana Africa", "Cabana Travel", "Cabana App").

---

## Limits and decisions

- **Twelve functions.** Vercel Hobby allows twelve; `api/growth.js` is
  the twelfth. Anything new must be folded into an existing function as an
  `?action`, the way `/api/utilities` does it.
- **One function for all of it.** Beacon and Compass share a function so
  crawler and browser traffic does not share a cold start with payments
  and SOS.
- **Static pages win.** Live hubs exist only where no hand-built page
  does.

## Tests

```
npm test                              # includes the suites below
node --test tests/growth-engine.test.mjs tests/search-terms.test.mjs \
            tests/apa-episodes.test.mjs tests/admin-growth-views.test.mjs \
            tests/seo-build-integrity.test.mjs
./tests/run-growth-sql-tests.sh       # the migration, twice, on a throwaway Postgres
```
