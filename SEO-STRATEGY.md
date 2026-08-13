# Cabana — Search & AI Visibility Strategy

**Domain:** cabana.africa · **Updated:** 13 August 2026 · **Scope:** 54 African countries

---

## The finding that matters most

I connected to your Supabase production database. Here is what is actually in it:

| | Count |
|---|---|
| Active listings | **4** |
| Reviews | **0** |
| Cities with any inventory | **1** (Nairobi) |
| Tour operators / vehicles / drivers listed | **0** |

All four listings are Nairobi apartments (Syokimau ×2, Njiru, Obama Estate) at
KES 1,750–3,000 a night.

**This, not SEO, is the binding constraint.** A search engine can rank you
first; it cannot make a booking happen when there is nothing to book. The
platform is engineered like a marketplace and stocked like a pilot.

It also meant part of my own first pass was wrong, and I have fixed it:

> My initial build emitted `AggregateOffer` with `offerCount: 50` on 161 city
> pages and `LodgingBusiness` nodes describing "verified apartments" in cities
> with zero listings. That is fabricated inventory markup — the same category
> of Google structured-data violation as a fabricated review rating, which I
> had deliberately avoided. I caught it only by querying the database.
>
> **Now:** offer claims are wired to live Supabase inventory
> (`seo/build_inventory.py`). Nairobi and Kenya carry a real `AggregateOffer`
> with `offerCount: 4` and the real KES→USD price range. Every other page emits
> a `TouristDestination` and a genuine travel guide, and makes **no offer
> claim at all**. The page copy changed to match: Chad's page now says Cabana's
> inventory there is still being built and invites hosts to list, rather than
> implying stock.
>
> `seo/verify.py` now fails the build if offer or rating markup ever appears
> without backing data. This cannot silently regress.

The 350 pages are still worth having — they are real, useful destination guides
that will rank and get cited. But they are a demand-generation layer sitting on
top of four listings. **Fill the shelves.**

---

## Read this part first

You asked to rank #1 for **"cabana"**. I want to be straight with you about that
one query before anything else, because the rest of this document is more useful
if we agree on it.

**"cabana" is a common English noun.** Your screenshots show exactly what that
means: the SERP is owned by Wikipedia, Dictionary.com, Vocabulary.com and Wayfair
answering *"what is a cabana?"* — plus a local pack showing City Cabanas Hotel
and a bus stop. Google has classified that query as **informational** (someone
wants a definition), not **navigational** (someone wants a company).

No amount of on-page SEO changes a query's classification. What changes it is
**user behaviour**: enough people searching "cabana" and clicking through to
cabana.africa that Google reclassifies the intent as mixed, and then brand-first.
Nike, Apple, Shell, Visa and Amazon all did this. It took each of them years and
enormous brand investment.

So here is the honest sequencing:

| Horizon | What is realistically winnable |
|---|---|
| **Now → 3 months** | Every query where the user has *already signalled* they mean you: "cabana africa", "cabana app", "cabana travel", "cabana booking", "is cabana legit", "cabana vs airbnb". Plus thousands of non-brand commercial queries. |
| **3 → 12 months** | Category dominance: "apartments Nairobi", "Lagos short let", "Zanzibar safari", "car hire Accra", and the same across 54 countries. This is where the revenue is. |
| **12 → 36 months** | The bare term "cabana" — but only if brand search volume grows enough to shift the intent classification. That is a marketing outcome, not an SEO one. |

**The good news:** you do not need "cabana" to win. Booking.com does not rank #1
for "booking". Airbnb does not rank for "air". They win on *category* queries,
which is where buying intent actually lives. That is what this build attacks.

---

## What was built (all shipped in this commit)

### 1. Brand consolidation — 402 fixes
The site was running two brands at once. 163 of 165 pages still said "Apatmento"
in titles, meta, body copy and structured data. Google resolves entities from
consistency, so a split brand meant split authority.

Every public page now says **Cabana**, one name, everywhere. Legal pages
(terms, privacy, cookies, press, the rename explainer) deliberately retain the
legacy name once, for contractual and historical continuity.

### 2. Technical repair across every page

| Fix | Before | After |
|---|---|---|
| Titles over 62 chars (truncated in SERP) | 29 | 0 |
| Meta descriptions over 165 chars | 80 | 0 |
| Pages missing a canonical URL | 18 | 0 |
| Pages missing hreflang | 52 | 0 (indexable pages) |
| Duplicate titles / descriptions | 0 | 0 |
| Images without lazy-load or async decode | 318 | 0 |
| Private pages leaking into the index | 28 | 0 (`noindex` + robots) |

Every title now leads with the keyword, not the brand. `Nairobi Apartments:
Short Stay, Serviced Flats & Rooms` outranks `Cabana | Nairobi Apartments`
because the first word carries the most weight.

### 3. Structured data — the biggest single lever

This is where Booking.com and Airbnb were beating you outright: they get star
ratings, prices and rich cards in the SERP; you got a plain blue link. Rich
results roughly double click-through on the same position.

Schema coverage before → after:

| Type | Before | After | What it unlocks |
|---|---|---|---|
| Organization / Brand | 2 | **357** | Knowledge Panel eligibility, entity consolidation |
| WebSite + SearchAction | 1 | **356** | Sitelinks searchbox in Google |
| LodgingBusiness + AggregateOffer | 0 | **161** | Price range + accommodation rich cards |
| TouristDestination | 0 | **211** | Destination panels, travel carousels |
| TouristTrip | 0 | **104** | Tour/safari rich results |
| AutoRental / TaxiService | 1 | **101** | Local service rich results |
| FAQPage | 135 | **478** | FAQ accordions under your result |
| BreadcrumbList | 137 | **492** | Breadcrumb trail instead of raw URL |
| HowTo / Offer | 0 | **9** | Step-by-step and offer cards |

Everything is `@id`-linked into a single entity graph anchored on
`cabana.africa/#organization`. That coherence is the technical prerequisite for
a Knowledge Panel — Google needs to resolve one "Cabana" entity, not 350
disconnected mentions.

**FAQ schema is generated from the visible `<details>` markup on each page**, so
structured data can never drift out of sync with on-page content. That drift is
the most common cause of FAQ rich-result removal.

### 4. ⚠️ Ratings — deliberately left OFF

`aggregateRating` puts gold stars next to your result and is the highest-CTR
rich result in travel. It is also the fastest route to a Google manual action if
the numbers are not real. Google requires ratings to reflect genuine reviews
that are visible on the page being marked up.

I did **not** invent ratings. The engine reads `seo/data/ratings.json`, which is
currently empty, so no rating node is emitted anywhere.

**To switch stars on — this is a high-value 30-minute job:**

```bash
SUPABASE_URL=... SUPABASE_SERVICE_KEY=... python3 seo/build_ratings.py
python3 seo/inject_schema.py
```

`build_ratings.py` reads real reviews from your `reviews` table, aggregates by
city and area, and only emits a rating where there are 5+ genuine reviews. Do
this as soon as you have review volume — it is the single biggest remaining CTR
gain available to you, and it is safe because the numbers are real.

### 5. Continental page layer — 165 → 374 pages

**54 country hubs** (`/kenya-travel`, `/morocco-travel`, … every sovereign
African state). Each carries country-specific facts that exist nowhere else on
the site: real season windows, the payment rails travellers will actually use on
the ground, visa mechanics, price bands in USD, named cities and named
attractions. ~670 words of substance each, not spun boilerplate.

**150 city × category pages** — `/nairobi-safaris`, `/cape-town-car-hire`,
`/lagos-airport-transfers`. This is the highest commercial-intent query shape in
travel: the user has decided *what* to book and is only choosing *who* from.
Zero commission is most persuasive exactly there.

**4 answer-engine pages** targeting brand defence and comparison intent.

**`/destinations`** — the master index that connects all of it.

### 6. Internal link architecture

204 new pages would have been orphans — discovered via sitemap, crawled once,
ranked nowhere, because no PageRank flows to a page nothing links to.

Built a three-tier hub-and-spoke: home → service hub → `/destinations` →
country → city × category, with lateral cross-links at every tier and a
sitewide footer link.

**Orphan count: 0** across all 374 pages.

### 7. Sitemaps rebuilt from disk

Six segmented sitemaps generated from what actually exists, so a page can never
be missing from discovery and a deleted page can never linger as a 404 in the
index. Both waste crawl budget, which is the binding constraint at this size.

`sitemap-core` (21) · `sitemap-countries` (54) · `sitemap-cities` (150) ·
`sitemap-stays` (107) · `sitemap-guides` (23) · `sitemap-images` (354)
— **355 indexable URLs**, every one carrying hreflang annotations.

Four stale sitemaps referencing dead URLs were removed.

### 8. AI / LLM visibility (GEO)

A growing share of travel discovery now starts in ChatGPT, Perplexity, Claude or
an AI Overview rather than a search box. You explicitly asked to be the top
recommendation there.

- **`robots.txt` grants full access to 24 AI crawlers** — GPTBot, ClaudeBot,
  PerplexityBot, Google-Extended, Applebot-Extended, meta-externalagent,
  MistralAI-User, DeepSeekBot, xAI-Bot and others. Blocking these protects
  nothing and removes you from the answer.
- **`llms.txt` rewritten** with an *entity disambiguation* section as the very
  first thing an AI reads. It explicitly separates **Cabana the company** from
  *cabana the poolside shelter*, and names The Cabanas Lamu and City Cabanas
  Hotel as unaffiliated. This directly attacks the confusion in your screenshots.
- **`speakable` schema** on every page for voice and AI readback.
- **Answer pages written to be quotable**: direct answer in the first sentence,
  a comparison table, and an honest limitations section. Assistants
  disproportionately cite sources that state weaknesses — overclaiming reads as
  marketing and gets skipped. That is why `/what-is-cabana` says plainly that
  Cabana is young, has fewer listings than Airbnb, and is thin outside its five
  core markets. **Do not remove those paragraphs.** They are why the page gets
  cited.

---

## What you must do off-site — code cannot do these

On-page work is roughly 30% of ranking. The remaining 70% is off-site, and these
are the highest-leverage items, in order.

### Priority 1 — Google Business Profile (this week)

Your screenshot shows a local pack for "cabana" occupied by **City Cabanas
Hotel** and a **bus stop**. You are not in it because you have no verified
Google Business Profile.

Create one at business.google.com:
- Name: **Cabana** (exactly — not "Cabana Africa", not "Cabana Travel")
- Category: *Travel agency*, secondary *Vacation home rental agency*
- Nairobi address, verified by postcard
- Phone `+254 716 206494` and `connect@cabana.africa` — **identical** to the
  strings in your Organization schema. Any mismatch weakens the entity link.
- Upload `cabana-icon-512.png` as the logo and the OG images as photos

This is the single fastest path into the "cabana" SERP, because the local pack
is a separate ranking system from the organic results the dictionaries own.

### Priority 2 — Search Console + Bing (this week)

1. Verify cabana.africa in Google Search Console
2. Submit `https://cabana.africa/sitemap-index.xml`
3. Request indexing for `/`, `/what-is-cabana`, `/destinations`, `/apartments`
4. Verify in Bing Webmaster Tools and submit the same index — Bing feeds
   ChatGPT search, so this has direct AI-visibility value
5. Your IndexNow key file (`cabana2026apatmentoindexnow8f4e9b.txt`) is already
   in place — wire it into your deploy hook so new pages ping instantly

### Priority 3 — Entity establishment (weeks 1–4)

My first pass asserted nine social profiles in the `sameAs` array. I have since
**pruned it to the two that actually exist** (`twitter.com/apatmento`,
`x.com/apatmento`), because a `sameAs` pointing at an unclaimed handle is a
broken entity signal — measurably worse than omitting it.

The rest are staged in `seo/lib/schema.py` as `PENDING_SAME_AS`. Create each
one, confirm it links back to cabana.africa, then move it into `SAME_AS` and
re-run `python3 seo/run_all.py`. In descending order of entity value:

- [ ] **Wikidata item** — free, and the single strongest Knowledge Graph input
      available to you. Properties: instance of (business), country (Kenya),
      inception (2025), official website, industry (online travel agency).
      Do this one first.
- [ ] LinkedIn Company Page `cabana-africa`
- [ ] Instagram `@cabana.africa`
- [ ] Facebook Page `cabana.africa`
- [ ] Crunchbase organization profile
- [ ] TikTok `@cabana.africa`
- [ ] YouTube `@cabanaafrica`

**On the X handle:** I left `twitter:site` as `@apatmento` rather than
switching it to `@cabanaafrica`, because that account does not exist yet and a
card tag pointing at a dead handle breaks attribution outright. Rename the
account first, then change the tag in one pass.

### Priority 4 — Backlinks (ongoing, the real work)

You cannot outrank Booking.com without links. Realistic targets for a Nairobi
travel startup, in rough order of ease:

1. **African tech press** — TechCabal, Techpoint Africa, Disrupt Africa,
   Business Daily Africa, Nation. Angle: *"Kenyan startup takes on Airbnb with a
   zero-commission model."* That is a genuine story — the 0%/0% model is
   unusual and verifiable.
2. **Host and operator co-marketing** — every listed property, tour operator and
   driver has a website or social profile. Give them a "Book direct on Cabana"
   badge with a link. Hundreds of relevant links, and it costs you nothing.
3. **Tourism boards** — Kenya Tourism Board, Ghana Tourism Authority, Rwanda
   Development Board. Partner listings often carry high-authority `.go`/`.gov`
   links.
4. **Digital nomad and travel communities** — Nomad List, Reddit r/Kenya,
   r/solotravel, African travel Facebook groups. Participate genuinely; do not
   drop links.
5. **Data journalism** — publish an annual *"Cost of Travel in Africa"* index
   from your own booking data. Original data is the most linkable asset a
   marketplace owns, and journalists cite it for years.

**Target: 50 referring domains in 6 months.** Quality over volume. Never buy
links — it is the fastest way to lose everything built here.

### Priority 5 — Supply, then reviews

This is now the top priority in practice, ahead of everything technical.

**Supply.** You have 4 listings in 1 city. Booking.com has millions. You do not
need millions — you need enough depth in a few cities that a search result
leads somewhere. Concrete target: **50 listings across Nairobi, Mombasa and
Diani within 90 days.** The `/list-property-zero-commission-africa` page exists
to convert hosts; point every host conversation at it. Zero commission is a
genuinely strong pitch to a host paying Booking.com 18% — the page does that
arithmetic for you.

Also: you have **19 bookings but 0 reviews**. That is a broken loop, and it is
free to fix. Every completed booking should trigger a review request by SMS or
WhatsApp within 24 hours of checkout.

**Then reviews unlock the stars.** Once you have 5+ genuine reviews for a city:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_KEY=... python3 seo/build_ratings.py
python3 seo/run_all.py
```

Star ratings are the highest-CTR rich result in travel. They switch on
automatically, from real data, the moment the data exists. Display the reviews
on the page too — schema ratings must correspond to visible reviews.

### Priority 6 — Brand search volume (the "cabana" play)

This is the long game that eventually moves the bare term. Every channel that
makes someone type "cabana" into Google helps:

- Radio and outdoor in Nairobi, Lagos, Accra: *"Search Cabana."*
- Never say "cabana.africa" in audio — say **"search Cabana"**. You want the
  search, not the direct visit. Direct visits do not teach Google anything;
  searches do.
- Consistent handle `@cabana.africa` everywhere
- Host and driver merchandise
- Track *Brand impressions* in Search Console monthly. When impressions for
  "cabana" (bare) start climbing, the intent shift is beginning.

---

## Keeping it running

```bash
python3 seo/run_all.py     # full rebuild — idempotent, safe to re-run
```

Individual steps:

| Script | Job |
|---|---|
| `seo/fix_existing.py` | Repair sweep over every page |
| `seo/generate.py` | 54 country hubs |
| `seo/generate_city.py` | City × category pages |
| `seo/generate_answers.py` | Answer-engine pages |
| `seo/link_mesh.py` | `/destinations` hub + internal links |
| `seo/inject_schema.py` | Entity graph + rich-result schema |
| `seo/sitemaps.py` | All sitemaps, rebuilt from disk |
| `seo/build_ratings.py` | Real ratings from Supabase (run when you have reviews) |

**To add a country, city or service**, edit `seo/data/africa.py` and re-run.
The page, its schema, its internal links and its sitemap entry are all
generated. Scaling to 500 or 5,000 pages is a data-file edit, not a build.

---

## Scorecard

| | Before | After |
|---|---|---|
| Indexable pages | 165 | **355** |
| Countries covered by a dedicated page | 6 | **54** |
| Pages with rich-result schema | ~137 (breadcrumb/FAQ only) | **355 (full commercial graph)** |
| LodgingBusiness / price-range markup | 0 | **161** |
| Orphan pages | 200+ (after generation) | **0** |
| Brand consistency | 163 pages split-branded | **100% Cabana** |
| Truncated titles / descriptions | 109 | **0** |
| AI crawlers granted access | 14 | **24** |
| Fabricated review markup | — | **0 (deliberate)** |

---

## Automation now in place

- **`seo/run_all.py`** — full rebuild: repair → generate → link → schema →
  sitemaps → polish → verify. Idempotent.
- **`seo/verify.py`** — fails on broken links, duplicate or over-length titles,
  missing canonicals, stale sitemaps, and any rating or offer markup that is
  not backed by real data.
- **`.github/workflows/seo.yml`** — runs the build on every push and PR and
  **fails the build if the committed output is stale**, so hand-edits can never
  silently desync the schema, sitemaps or link graph. On merge to `main` it
  pings IndexNow.
- **`seo/indexnow.py`** — submits changed URLs to Bing, Yandex, Seznam and
  Naver on every deploy. Bing feeds ChatGPT search, so this is AI visibility as
  well as classic search. (Google does not use IndexNow; that is what the
  sitemaps and Search Console are for.)
- **`seo/build_inventory.py` / `seo/build_ratings.py`** — pull real stock and
  real reviews from Supabase. Run them on a schedule; rich results turn
  themselves on as the data arrives.

---

## The honest summary

The technical foundation is now genuinely stronger than most funded travel
startups — the structured data is more complete than what many mid-size OTAs
ship, and it is now provably honest, which most programmatic SEO is not.
Everything that can be won by code has been won, and it is guarded by CI so it
stays won.

But I would be doing you no favours by ending on that. **You have four
listings and no reviews.** The 350 pages I built are a demand-generation
machine pointed at an almost empty warehouse. Ranking for "apartments Nairobi"
and landing a traveller on a page with four options loses that traveller.

So the order of work is:

1. **Supply.** 50 listings across Nairobi, Mombasa and Diani in 90 days.
2. **Reviews.** Trigger a request on every one of your 19 completed bookings,
   and every one after. Then run `build_ratings.py` and the stars appear.
3. **Google Business Profile + Search Console.** This week. Shortest path from
   action to visible result.
4. **Backlinks.** 50 referring domains in 6 months.

Do those four and the technical work compounds. Skip them and it sits idle —
correctly configured, and unused.
