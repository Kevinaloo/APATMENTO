# Cabana's location system

Every box on the platform where a human types a place — the search bar on
apartments, the address step of a listing, a ride's pick-up, an event venue, a
tour's meeting point, a roommate search, the admin listing form — now resolves
through one layer.

Before, each surface had invented its own answer:

| Surface | What it used to be |
|---|---|
| `apartments.html` search | 36 hardcoded cities, plus a Google Places call gated behind a `window.GOOGLE_MAPS_KEY` that was never set anywhere |
| `add-listing.html` | Country was a five-option select: Kenya, Tanzania, Uganda, Rwanda, Ethiopia |
| `rides.html` | A Nairobi-only gazetteer — a pick-up outside the city could not be typed |
| `roommates.html` | A 14-option dropdown of Nairobi suburbs and three coastal towns |
| `partner-settings.html` | Six Kenyan cities and "Other" |
| `admin.html` | One free-text string written into `location`, `city` and `area` alike, with no coordinates |
| `list-your-tour` / `list-your-event` | Free text, so the same place arrived spelled four ways |

Search was a substring test against `location + city + name`. That is why
searching **Diani** returned nothing for a listing filed under **Ukunda**, and
why **"Karen, Nairobi"** and **"Karen"** were different searches.

---

## The pieces

### `api/geocode.js` — the server route

```
GET /api/geocode?q=westgate mall nairobi     forward search
GET /api/geocode?lat=-1.267&lng=36.806       reverse lookup
GET /api/geocode?health=1                    which providers are live
```

Providers are tried in order; the first with a usable answer wins. All of them
are optional — **with no keys set at all the free tier answers worldwide**, which
is why this ships working rather than pending procurement.

| Provider | Env var | Notes |
|---|---|---|
| `google` | `GOOGLE_MAPS_API_KEY` | Places Text Search (New) — one call returns coordinates, so no billed Place Details round trip |
| `mapbox` | `MAPBOX_TOKEN` | Geocoding v6 |
| `locationiq` | `LOCATIONIQ_KEY` | Nominatim data with an SLA |
| `photon` | — | Komoot's OSM index, built for prefix matching |
| `nominatim` | — | OSM canonical, rate-limited to 1 req/s |

Optional: `GEOCODER_ORDER="mapbox,photon"` overrides the chain.
`GEOCODER_CONTACT` sets the address in the `User-Agent` OSM sees.

**Why this is a server route and not a browser call.** Nominatim's usage policy
requires an identifying `User-Agent`, and a browser is forbidden from setting
one — every direct-from-browser OSM lookup the platform used to make was
technically in breach. A key in a static HTML page is a key you have given away.
And a geocode is the most cacheable request in the product: the answer is cached
in the lambda, then again at Vercel's edge for a day, so the ten-thousandth guest
who types Westlands costs nobody a provider call.

### `apa-geo.js` — the client layer

```js
ApaGeo.search(q, o)          // → Promise<Place[]>
ApaGeo.reverse(lat, lng)     // → Promise<Place|null>
ApaGeo.attach(input, o)      // typeahead on any input
ApaGeo.autoWire(root)        // attach to every [data-apa-geo]
ApaGeo.locate()              // the device's own fix, reverse-coded
ApaGeo.distance(a, b)        // kilometres
ApaGeo.nearby(items, c, o)   // what is close, and how close
ApaGeo.match(item, place, o) // does this listing satisfy this search
ApaGeo.fillCountrySelect(el) // every country, named in the visitor's language
```

Adding a worldwide address box to a new page takes one attribute:

```html
<input data-apa-geo data-geo-lat="f-lat" data-geo-lng="f-lng">
```

### `seo/build_gazetteer.py` — the offline seed

Compiles `seo/data/places.py` and `seo/data/africa.py` into a 360-entry table
inside `apa-geo.js`. This is what answers the **first keystroke**, offline, in
under a millisecond, while the network geocode is still in flight.

Generating it from the SEO place graph rather than hand-writing a list means the
two can never drift: every city with a landing page is a city guests can search
for, by construction.

```bash
python3 -m seo.build_gazetteer             # offline, uses the committed cache
python3 -m seo.build_gazetteer --resolve   # network: fills seo/data/city_coords.json
```

`run_all.py` runs the offline form. Run `--resolve` by hand after adding places
to `africa.py`; it asks OSM politely, one request a second, and commits the
result so nobody has to do it again.

---

## Four properties the design guarantees

**1. An answer on the first keystroke, always.** The gazetteer replies instantly
and the network result merges in when it lands. The box is never empty and never
blocks.

**2. Coordinates, not strings.** A picked place carries lat/lng from the box to
the database. Once a search has a point, matching is arithmetic. This is what
makes a Diani search find the Ukunda listing.

**3. Nothing is ever a dead end.** No exact match widens the radius rather than
showing nothing — a guest who searches Nanyuki and sees "no results" leaves; one
who sees *"7 stays within 75km of Nanyuki"* books. The result label says plainly
when results are not in the place searched. A provider outage falls back to the
next provider, then to the gazetteer. A refused location permission falls back to
typing.

**4. The pin is dropped the moment the text stops describing it.** A guest picks
"Westlands, Nairobi", edits the box to read "Mombasa" and searches. Sending
Westlands' coordinates with Mombasa's label is the single most common bug in every
location widget ever shipped. Editing after a pick clears the pin.

### Where the gazetteer earns its place

OpenStreetMap has no feature named exactly "Diani" in Kenya — it has "Diani
Beach" and "Ukunda". Ask any provider for `diani` and the top results are a
village in Papua New Guinea and six rivers in Guinea. Both Photon and Nominatim
agree, and neither is wrong; the colloquial name simply is not in the data.

Because Cabana's own place graph is merged *first*, a guest typing `diani` gets
Kenya's Diani at the top regardless. The platform is the authority on the places
it sells.

---

## Deliberately left alone

Three dropdowns are still fixed lists, because their constraint is inventory
rather than geography — turning them into worldwide search would let people ask
for something that does not exist:

- `carhire.html` `#ch-city` — cars are physically parked in specific cities
- `become-driver.html` `#a-area` — Nairobi dispatch zones
- `add-listing.html` service-area fields tied to fleet coverage

## Known gap

`list-your-tour.html` and `list-your-event.html` get the resolved place for
autocomplete, spelling consistency and auto-filled city/county — but their
tables have no `latitude`/`longitude` columns, so the coordinates are not
persisted. Adding those columns would let tours and events join the same radius
search stays already use. Nothing else is blocking it.
