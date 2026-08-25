# -*- coding: utf-8 -*-
"""
Cabana — world atlas builder.

WHY THIS EXISTS
---------------
Cabana's map used to be four small maps bolted to four pages, each one told
about a single point by whatever page happened to be rendering it. Nothing in
the product ever held the answer to "where is Cabana?" — the honest answer was
scattered across 300-odd landing pages, two Python datasets and a database.

This compiles that answer into one file. `cabana-world-atlas.json` is the
single inventory the globe, the search box and any future surface read from:
every place Cabana covers, worldwide, with its coordinates, its parent, its
price band, the categories that are actually bookable there, and the real
page URLs that back each one.

THE ONE RULE
------------
A place is in the atlas because a page for it EXISTS ON DISK. Not because
someone typed it into a list. The builder walks the repo, reads the JSON-LD
each page already emits about itself, and takes that as truth. Delete a page
and the place leaves the atlas on the next build; add one and it arrives.
The map can therefore never advertise a destination that 404s, which is the
failure mode every hand-maintained "where we operate" list eventually hits.

Enrichment (region, currency, season, highlights, neighbourhoods) comes from
seo/data/africa.py and seo/data/places.py. Live bookable counts come from
seo/data/inventory.json, which is itself wired to the database — so the atlas
inherits the same discipline: a claim about real inventory is only ever made
where real inventory exists.

    python3 -m seo.build_world_atlas          # from the repo root

Idempotent. Output: cabana-world-atlas.json
"""

import datetime
import html
import unicodedata
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "cabana-world-atlas.json")

sys.path.insert(0, ROOT)

from seo.data.africa import CATEGORIES, CITIES, COUNTRIES   # noqa: E402
from seo.data.places import PLACES                          # noqa: E402


# ── Page suffix → category ──────────────────────────────────────────────
#
# The suffix a page carries IS its category. `nairobi-safaris.html` is the
# safari page for Nairobi; there is no second place that fact is recorded,
# and no way for it to drift.
#
# Order matters: `-car-hire` and `-airport-transfers` both end in strings
# that would otherwise be matched by shorter suffixes, so the table is
# consumed longest-first below.
PAGE_CATEGORY = {
    "-airport-transfers": "rides",
    "-apartments": "apartments",
    "-car-hire": "car-hire",
    "-safaris": "safaris",
    "-travel-guide": "guide",
    "-travel": "travel",
}

# Categories the globe can filter on. `travel` and `guide` are editorial
# surfaces rather than bookable inventory, so they are carried on the place
# but never counted as supply.
BOOKABLE = ("apartments", "safaris", "car-hire", "rides", "events", "flights")

# How close the camera settles when a place is framed. A district wants a
# street-level frame; a continent wants the whole plate. These are Leaflet
# zoom levels, and they are the difference between "the map moved" and "the
# map took me somewhere".
ZOOM = {
    "continent": 3.4,
    "country": 5.6,
    "city": 10.8,
    "district": 13.4,
    "safari": 8.6,
    "beach": 12.2,
}

# Kind, as places.py spells it in schema.org vocabulary, mapped to the
# atlas's own vocabulary. Keep this total: an unmapped kind is a silent
# hole in the map, so the builder fails loudly instead (see place_kind).
KIND_FROM_SCHEMA = {
    "Neighborhood": "district",
    "Beach": "beach",
    "SafariRegion": "safari",
    "City": "city",
    "Continent": "continent",
}

# Continent for every non-African country Cabana lists in. Africa is derived
# from africa.py and never appears here — one source per fact.
CONTINENT_BY_COUNTRY = {
    "United Kingdom": "europe", "France": "europe", "Netherlands": "europe",
    "Germany": "europe", "Spain": "europe", "Portugal": "europe",
    "Italy": "europe", "Greece": "europe", "Austria": "europe",
    "Czechia": "europe", "Hungary": "europe", "Denmark": "europe",
    "Croatia": "europe", "Türkiye": "europe",
    "United Arab Emirates": "asia", "Japan": "asia", "South Korea": "asia",
    "Singapore": "asia", "Thailand": "asia", "Indonesia": "asia",
    "Malaysia": "asia",
    "United States": "americas", "Mexico": "americas", "Colombia": "americas",
    "Argentina": "americas", "Brazil": "americas",
    "Australia": "oceania", "New Zealand": "oceania", "Fiji": "oceania",
}

JSONLD_LAT = re.compile(r'"latitude"\s*:\s*(-?\d+(?:\.\d+)?)')
JSONLD_LNG = re.compile(r'"longitude"\s*:\s*(-?\d+(?:\.\d+)?)')
JSONLD_LOCALITY = re.compile(r'"addressLocality"\s*:\s*"([^"]+)"')
JSONLD_COUNTRY = re.compile(r'"addressCountry"\s*:\s*"([^"]+)"')
META_DESC = re.compile(
    r'<meta\s+name="description"\s+content="([^"]*)"', re.I)


def slug(s):
    """Page-slug form of a display name.

    Accents are FOLDED to their ASCII base rather than dropped. This
    looks like a detail and is not: "Cote d'Ivoire" has a circumflex,
    and stripping it produced "c-te-divoire" while the country's real
    page — and africa.py's own hand-written slug — is "cote-divoire".
    Every derived key for an accented place therefore pointed at a
    place that does not exist, so live inventory in Abidjan could never
    match the map. Turkiye had the same hole ("t-rkiye"), as did Sao
    Tome and Principe.

    api/lib/_atlas.js folds identically. The two functions key the same
    map, and a test asserts they agree.
    """
    s = (s or "").strip().lower()
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.replace("'", "").replace("’", "")
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def read(path):
    with open(path, encoding="utf-8", errors="ignore") as f:
        return f.read()


def category_of(page_slug):
    """(place slug, category) for a destination page, or (None, None)."""
    for suffix in sorted(PAGE_CATEGORY, key=len, reverse=True):
        if page_slug.endswith(suffix):
            return page_slug[: -len(suffix)], PAGE_CATEGORY[suffix]
    return None, None


def scan_pages():
    """Every destination page on disk, grouped by the place it is about.

    Returns {place_slug: {"pages": {category: url}, "geo": (lat, lng),
                          "locality": str, "country": str, "blurb": str}}

    Geo is taken from the JSON-LD the page already publishes — the same
    coordinates Google reads. If the map and the structured data ever
    disagreed, the map would be pointing somewhere the search engine has
    never heard of, so they are made the same number by construction.
    """
    found = {}
    for name in sorted(os.listdir(ROOT)):
        if not name.endswith(".html"):
            continue
        place, category = category_of(name[: -len(".html")])
        if not place:
            continue

        body = read(os.path.join(ROOT, name))
        rec = found.setdefault(place, {
            "pages": {}, "geo": None, "locality": "",
            "country": "", "blurb": "",
        })
        rec["pages"][category] = "/" + name[: -len(".html")]

        if rec["geo"] is None:
            lat, lng = JSONLD_LAT.search(body), JSONLD_LNG.search(body)
            if lat and lng:
                rec["geo"] = (round(float(lat.group(1)), 5),
                              round(float(lng.group(1)), 5))
        if not rec["locality"]:
            m = JSONLD_LOCALITY.search(body)
            if m:
                rec["locality"] = html.unescape(m.group(1))
        if not rec["country"]:
            m = JSONLD_COUNTRY.search(body)
            if m:
                rec["country"] = html.unescape(m.group(1))
        # The apartments page is the flagship for any place that has one,
        # so its description is the one worth carrying onto the map card.
        if category == "apartments" or not rec["blurb"]:
            m = META_DESC.search(body)
            if m:
                # The meta tag is HTML-escaped because it lives in an
                # attribute. The map renders into textContent, where an
                # escaped apostrophe would show up as "Kenya&#x27;s".
                rec["blurb"] = html.unescape(m.group(1)).strip()
    return found


def load_json(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def place_kind(place, africa_cities, africa_countries):
    """Classify a place. Every branch is reachable and none guesses."""
    if place in africa_countries:
        return "country"
    if place in africa_cities:
        return "city"
    key = place.replace("-", " ")
    if key in PLACES:
        schema = PLACES[key][7]
        if schema not in KIND_FROM_SCHEMA:
            raise SystemExit(
                f"places.py gives {place!r} the kind {schema!r}, which the "
                "atlas has no mapping for. Add it to KIND_FROM_SCHEMA.")
        return KIND_FROM_SCHEMA[schema]
    return "city"


def build():
    pages = scan_pages()
    inventory = load_json(os.path.join(HERE, "data", "inventory.json"), {})
    index_state = load_json(os.path.join(HERE, "data", "index_state.json"), {})
    indexed = set(index_state.get("indexed", []))

    africa_countries = {c["slug"]: c for c in COUNTRIES}
    africa_cities = {}
    for name, country_slug, lat, lng, band, blurb, areas in CITIES:
        africa_cities[slug(name)] = {
            "name": name, "country": country_slug, "lat": lat, "lng": lng,
            "band": band, "blurb": blurb, "areas": areas,
        }

    # A district's parent is the city that claims it. Built once, from the
    # city records, so a neighbourhood can never be orphaned by a typo in a
    # second list.
    parent_of_area = {}
    for city_slug, city in africa_cities.items():
        for area in city["areas"]:
            parent_of_area[slug(area)] = city_slug

    places = []
    for place_slug in sorted(pages):
        page = pages[place_slug]
        kind = place_kind(place_slug, africa_cities, africa_countries)
        key = place_slug.replace("-", " ")
        supplement = PLACES.get(key)
        country_rec = africa_countries.get(place_slug)
        city_rec = africa_cities.get(place_slug)

        # ── Name ────────────────────────────────────────────────────────
        if country_rec:
            name = country_rec["name"]
        elif city_rec:
            name = city_rec["name"]
        elif supplement:
            name = supplement[0]
        else:
            name = page["locality"] or place_slug.replace("-", " ").title()

        # ── Position ────────────────────────────────────────────────────
        # The page's own JSON-LD wins; the datasets are the fallback for the
        # handful of pages that publish no geo block (travel guides).
        if page["geo"]:
            lat, lng = page["geo"]
        elif country_rec:
            lat, lng = country_rec["lat"], country_rec["lng"]
        elif city_rec:
            lat, lng = city_rec["lat"], city_rec["lng"]
        elif supplement:
            lat, lng = supplement[3], supplement[4]
        else:
            # No coordinates anywhere. A place the map cannot put on the
            # globe is worse than absent — it would be a filter entry that
            # goes nowhere — so it is skipped and reported.
            print(f"  · skipped {place_slug}: no coordinates in page or data")
            continue

        # ── Country and continent ───────────────────────────────────────
        if country_rec:
            country_name = country_rec["name"]
            country_slug = country_rec["slug"]
            continent = "africa"
        elif city_rec:
            country_name = africa_countries[city_rec["country"]]["name"]
            country_slug = city_rec["country"]
            continent = "africa"
        else:
            country_name = (supplement[2] if supplement else "") or page["country"]
            country_slug = slug(country_name)
            if country_slug in africa_countries:
                continent = "africa"
            elif kind == "continent":
                continent = place_slug
            else:
                continent = CONTINENT_BY_COUNTRY.get(country_name, "")
                if not continent:
                    print(f"  · {place_slug}: no continent for "
                          f"{country_name!r} — add it to CONTINENT_BY_COUNTRY")

        # ── Parent, for the drill-down hierarchy ────────────────────────
        if kind == "continent":
            parent = ""
        elif kind == "country":
            parent = continent
        elif kind in ("district", "beach"):
            parent = parent_of_area.get(place_slug, "")
            if not parent and supplement and supplement[1]:
                parent = slug(supplement[1])
        else:
            parent = country_slug

        # ── Price band ──────────────────────────────────────────────────
        if city_rec:
            band = list(city_rec["band"])
        elif country_rec:
            band = list(country_rec["band"])
        elif supplement:
            band = [supplement[5], supplement[6]]
        else:
            band = None

        # ── Aliases ─────────────────────────────────────────────────
        #
        # A place's id comes from its FILENAME, and a listing row
        # carries its DISPLAY NAME. Those are usually the same slug and
        # sometimes are not: the Nairobi CBD page is "cbd", Upper Hill's
        # is "upperhill", Ongata Rongai's is "rongai", and Accra's
        # Airport Residential is "airport-residential-accra".
        #
        # A live count keyed on the display name therefore lands on a
        # key the map has never heard of. It does not error — it simply
        # never appears, which is the worst kind of bug: a host
        # publishes in Upper Hill and the map keeps saying nothing is
        # there.
        #
        # So every other name this place might be keyed under is
        # recorded here, generated rather than hand-listed, and the
        # client resolves through them.
        aliases = {slug(name)}
        if city_rec:
            aliases.add(slug(city_rec["name"]))
        if supplement:
            aliases.add(slug(supplement[0]))
            aliases.add(slug(key))
        if country_rec:
            aliases.add(slug(country_rec["name"]))
        aliases.discard(place_slug)
        aliases.discard("")

        record = {
            "id": place_slug,
            "name": name,
            "kind": kind,
            "lat": lat,
            "lng": lng,
            "zoom": ZOOM[kind],
            "continent": continent,
            "country": country_name,
            "countrySlug": country_slug,
            "parent": parent,
            "pages": page["pages"],
            "categories": sorted(c for c in page["pages"] if c in BOOKABLE),
        }
        if band:
            record["band"] = band
        if page["blurb"]:
            record["blurb"] = page["blurb"]
        if aliases:
            record["aliases"] = sorted(aliases)

        # ── Africa's deep metadata ──────────────────────────────────────
        if country_rec:
            record.update({
                "iso": country_rec["iso"],
                "region": country_rec["region"],
                "capital": country_rec["capital"],
                "currency": country_rec["currency"],
                "languages": country_rec["langs"],
                "airport": country_rec["airport"],
                "season": country_rec["season"],
                "tier": country_rec["tier"],
                "draw": country_rec["draw"],
                "highlights": country_rec["highlights"],
                "pay": country_rec["pay"],
                "visa": country_rec["visa"],
            })
        elif city_rec:
            parent_country = africa_countries[city_rec["country"]]
            record.update({
                "region": parent_country["region"],
                "currency": parent_country["currency"],
                "airport": parent_country["airport"],
                "season": parent_country["season"],
                "draw": city_rec["blurb"],
                "areas": [slug(a) for a in city_rec["areas"]],
            })

        # ── Real, bookable supply ───────────────────────────────────────
        # Absent means absent. The map shows a live count only where the
        # database put one, exactly as the schema pipeline does.
        live = inventory.get(place_slug)
        if isinstance(live, dict):
            record["live"] = live
        record["indexed"] = place_slug in indexed

        places.append(record)

    # ── Repair dangling parents ─────────────────────────────────────
    #
    # A city's natural parent is its country, but Cabana only has
    # country pages where it has country pages: Amsterdam is on the map
    # and the Netherlands is not. Left alone, that leaves a parent id
    # pointing at nothing — the drill-up control renders for a place
    # the guest can never reach, and the atlas tells a lie about its
    # own shape.
    #
    # The fix is a pass rather than a guess at build time, because the
    # set of places that exist is only known once all of them are
    # built. Anything unresolvable falls back to its continent, which
    # always exists and is always the honest answer to "what is this
    # inside?".
    # An alias claimed by two places would silently hand one of them the
    # other's inventory, so a collision is a build failure rather than a
    # warning nobody reads.
    claimed = {}
    for record in places:
        for alias in record.get("aliases", []):
            if alias in claimed and claimed[alias] != record["id"]:
                raise SystemExit(
                    f"alias {alias!r} is claimed by both {claimed[alias]!r} "
                    f"and {record['id']!r} — one of them must lose it")
            claimed[alias] = record["id"]

    ids = {p["id"] for p in places}
    for record in places:
        # An alias that IS another place's id would shadow it.
        record["aliases"] = [a for a in record.get("aliases", []) if a not in ids]
        if not record["aliases"]:
            record.pop("aliases", None)

    known = {p["id"] for p in places}
    repaired = 0
    for record in places:
        parent = record["parent"]
        if not parent or parent in known:
            continue
        fallback = record["continent"]
        record["parent"] = fallback if fallback in known else ""
        repaired += 1
    if repaired:
        print(f"  · {repaired} places re-parented onto their continent")

    return places, index_state


def build_routes(places):
    """Corridors between the hubs, for the map's animated arcs.

    These are the journeys Cabana actually joins up — a guest landing in
    Nairobi and going on to the Mara, a diaspora traveller flying London to
    Lagos. Each arc is a real pair of places already in the atlas, so an arc
    can never point at a destination the product does not serve.
    """
    have = {p["id"] for p in places}
    corridors = [
        ("london", "nairobi", "diaspora"),
        ("london", "lagos", "diaspora"),
        ("london", "accra", "diaspora"),
        ("paris", "abidjan", "diaspora"),
        ("paris", "dakar", "diaspora"),
        ("new-york", "accra", "diaspora"),
        ("new-york", "lagos", "diaspora"),
        ("dubai", "nairobi", "trade"),
        ("dubai", "johannesburg", "trade"),
        ("amsterdam", "kigali", "trade"),
        ("istanbul", "mogadishu", "trade"),
        ("nairobi", "masai-mara", "safari"),
        ("nairobi", "diani", "safari"),
        ("nairobi", "mombasa", "safari"),
        ("arusha", "serengeti", "safari"),
        ("zanzibar", "dar-es-salaam", "safari"),
        ("cape-town", "johannesburg", "domestic"),
        ("lagos", "abuja", "domestic"),
        ("accra", "kumasi", "domestic"),
        ("cairo", "luxor", "domestic"),
        ("marrakech", "casablanca", "domestic"),
    ]
    return [{"from": a, "to": b, "kind": k}
            for a, b, k in corridors if a in have and b in have]



# ══ THE CRAWLABLE INDEX ══════════════════════════════════════════════
#
# The globe is JavaScript. A crawler that runs none of it, a reader
# mode, a text browser and a guest on a connection too slow to fetch
# Leaflet must all still be able to reach every destination — so the
# atlas is also written into world.html as plain links, generated from
# the same records the map reads.
#
# Generated rather than hand-written for the reason every other block
# in this pipeline is: two lists of 175 places maintained separately
# will disagree within a month, and the one that goes stale is always
# the one nobody looks at.

CONTINENT_ORDER = ["africa", "europe", "asia", "americas", "oceania", "global"]

CONTINENT_COPY = {
    "africa":   ("Africa", "Home. 54 countries, coast to coast."),
    "europe":   ("Europe", "City stays from Lisbon to Istanbul."),
    "asia":     ("Asia", "Tokyo to Bali, plus the Gulf."),
    "americas": ("The Americas", "North, Central and South."),
    "oceania":  ("Oceania", "Australia and the Pacific."),
    "global":   ("Worldwide", "The hub for everywhere else."),
}

CATEGORY_SHORT = {
    "apartments": "Stays", "safaris": "Safaris", "car-hire": "Car hire",
    "rides": "Transfers", "events": "Events", "flights": "Flights",
}

MARKERS = [
    ("<!-- STATS:BEGIN -->", "<!-- STATS:END -->", "render_stats"),
    ("<!-- ATLAS:BEGIN -->", "<!-- ATLAS:END -->", "render_atlas"),
    ("<!-- SCHEMA:BEGIN -->", "<!-- SCHEMA:END -->", "render_schema"),
]

SITE = "https://cabana.africa"


def esc(s):
    """HTML-escape. Place names and blurbs are page-derived content."""
    return (str(s or "")
            .replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace('"', "&quot;").replace("'", "&#39;"))


def render_stats(places, stats):
    """The figures above the map. Each one is counted, never claimed."""
    bookable = sum(1 for p in places if p.get("live"))
    cities = stats["byKind"].get("city", 0) + stats["byKind"].get("district", 0)
    pages = sum(stats["pages"].values())

    tiles = [
        (stats["places"], "destinations on the map"),
        (stats["byKind"].get("country", 0), "countries covered"),
        (cities, "cities and neighbourhoods"),
        (pages, "destination pages behind them"),
        ("0%", "commission, everywhere"),
    ]
    # A live count is only shown when there is one. A "0 bookable now"
    # tile would be an own goal dressed up as transparency.
    if bookable:
        tiles.insert(3, (bookable, "with live inventory today"))

    cells = "".join(
        f'<div class="wstat"><b>{esc(v)}</b><span>{esc(label)}</span></div>'
        for v, label in tiles)
    return f'<div class="wstats">{cells}</div>'


def render_atlas(places, stats):
    """Every destination, grouped by continent, as plain links."""
    by_continent = {}
    for p in places:
        by_continent.setdefault(p["continent"], []).append(p)

    blocks = []
    for cont in CONTINENT_ORDER:
        rows = by_continent.get(cont, [])
        if not rows:
            continue
        title, note = CONTINENT_COPY.get(cont, (cont.title(), ""))

        # Countries first, then cities, then neighbourhoods; each group
        # alphabetical. A guest scanning for "Ghana" should not have to
        # know it sits between two cities.
        rank = {"continent": 0, "country": 1, "city": 2,
                "safari": 3, "beach": 3, "district": 4}
        rows = sorted(rows, key=lambda p: (rank.get(p["kind"], 5), p["name"]))

        hub = by_continent.get(cont, [])
        hub_link = next((p["pages"].get("apartments") for p in hub
                         if p["kind"] == "continent"), None)

        cards = []
        for p in rows:
            if p["kind"] == "continent":
                continue
            # The primary link is the flagship page for the place —
            # stays where there are stays, otherwise whatever it does
            # have. A card that links nowhere is never emitted.
            href = (p["pages"].get("apartments") or p["pages"].get("safaris")
                    or p["pages"].get("car-hire") or p["pages"].get("rides")
                    or p["pages"].get("travel") or p["pages"].get("guide"))
            if not href:
                continue

            tags = []
            if p.get("live"):
                tags.append('<i class="live">Live</i>')
            for slug in p["categories"]:
                tags.append(f'<i>{esc(CATEGORY_SHORT.get(slug, slug))}</i>')

            if p["kind"] == "country":
                sub = p.get("region", "") or "Country"
            elif p["kind"] == "district":
                parent = next((q for q in places if q["id"] == p["parent"]), None)
                sub = f"{parent['name']}, {p['country']}" if parent else p["country"]
            else:
                sub = p["country"]

            cards.append(
                f'<a class="wcard" href="{esc(href)}">'
                f'<b>{esc(p["name"])}</b><em>{esc(sub)}</em>'
                f'<u>{"".join(tags)}</u></a>')

        if not cards:
            continue

        head = (f'<div class="wcont-h"><h3>{esc(title)}</h3>'
                f'<span>{len(cards)} destinations · {esc(note)}</span>'
                + (f'<a href="{esc(hub_link)}">All of {esc(title)} →</a>'
                   if hub_link else '') +
                '</div>')
        blocks.append(f'<div class="wcont">{head}'
                      f'<div class="wgrid">{"".join(cards)}</div></div>')

    intro = ('<h2>Every destination on the map</h2>'
             '<p>The full contents of the globe, as plain links. This list is '
             'generated from the same inventory the map reads, so the two can '
             'never drift apart. A <b>Live</b> tag means real bookable stays '
             'in that place today.</p>')
    return (f'<section class="sec watlas">{intro}'
            f'{"".join(blocks)}</section>')



def render_schema(places, stats):
    """Structured data for the world map page.

    Only facts the atlas can prove: the page's identity, its place in
    the site, and an ItemList naming the continent hubs. Deliberately
    no AggregateOffer — that claim belongs on the pages with real
    inventory behind them, which seo/inject_schema.py already handles
    from the database. A map is not a shop window.
    """
    hubs = []
    position = 0
    for cont in CONTINENT_ORDER:
        hub = next((p for p in places
                    if p["kind"] == "continent" and p["id"] == cont), None)
        if not hub:
            continue
        href = hub["pages"].get("apartments")
        if not href:
            continue
        position += 1
        hubs.append({
            "@type": "ListItem",
            "position": position,
            "name": hub["name"],
            "url": SITE + href,
        })

    blocks = [
        {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "@id": SITE + "/world#page",
            "url": SITE + "/world",
            "name": "The Cabana World Map",
            "description": (
                f"Every Cabana destination on one interactive globe — "
                f"{stats['places']} places across "
                f"{stats['byKind'].get('country', 0)} countries, with "
                "apartments, safaris, car hire and airport transfers."),
            "isPartOf": {"@type": "WebSite", "@id": SITE + "/#website",
                         "name": "Cabana", "url": SITE + "/"},
            "inLanguage": "en",
            "primaryImageOfPage": {"@type": "ImageObject",
                                   "url": SITE + "/og-stays.jpg"},
        },
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Cabana",
                 "item": SITE + "/"},
                {"@type": "ListItem", "position": 2, "name": "World map",
                 "item": SITE + "/world"},
            ],
        },
        {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "Cabana destination hubs",
            "numberOfItems": len(hubs),
            "itemListElement": hubs,
        },
    ]

    return "".join(
        '<script type="application/ld+json">'
        + json.dumps(b, ensure_ascii=False, separators=(",", ":"))
        + "</script>"
        for b in blocks)


def inject(path, places, stats):
    """Rewrite the generated blocks inside a page. Idempotent."""
    if not os.path.exists(path):
        print(f"  · {os.path.basename(path)} not found — nothing injected")
        return False

    body = read(path)
    changed = False
    for begin, end, fn in MARKERS:
        i, j = body.find(begin), body.find(end)
        if i == -1 or j == -1 or j < i:
            continue
        rendered = globals()[fn](places, stats)
        body = body[:i + len(begin)] + rendered + body[j:]
        changed = True

    if changed:
        with open(path, "w", encoding="utf-8") as f:
            f.write(body)
    return changed


def main():
    print("Cabana world atlas")
    print("─" * 60)
    places, index_state = build()
    routes = build_routes(places)

    by_kind = {}
    by_continent = {}
    for p in places:
        by_kind[p["kind"]] = by_kind.get(p["kind"], 0) + 1
        if p["continent"]:
            by_continent[p["continent"]] = by_continent.get(p["continent"], 0) + 1

    category_pages = {}
    for p in places:
        for c in p["pages"]:
            category_pages[c] = category_pages.get(c, 0) + 1

    atlas = {
        "_generated": datetime.datetime.now(datetime.timezone.utc)
                              .strftime("%Y-%m-%dT%H:%M:%SZ"),
        "_note": ("Built by seo/build_world_atlas.py from the pages that exist "
                  "on disk. Every place here has a real page behind it. "
                  "Never hand-edit — re-run the builder."),
        "version": 1,
        "categories": [
            {"slug": c["slug"], "label": c["label"], "noun": c["noun"],
             "hub": c["hub"], "intent": c["intent"], "blurb": c["blurb"]}
            for c in CATEGORIES
        ],
        "stats": {
            "places": len(places),
            "byKind": by_kind,
            "byContinent": by_continent,
            "pages": category_pages,
            "countries": by_kind.get("country", 0),
            "indexed": len(index_state.get("indexed", [])),
        },
        "routes": routes,
        "places": places,
    }

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(atlas, f, ensure_ascii=False, indent=1, sort_keys=False)
        f.write("\n")

    for page in ("world.html",):
        if inject(os.path.join(ROOT, page), places, atlas["stats"]):
            print(f"  ↻ {page}")

    print(f"  {len(places)} places")
    for kind, n in sorted(by_kind.items(), key=lambda x: -x[1]):
        print(f"    {kind:10} {n}")
    print(f"  {len(routes)} corridors")
    print(f"  → {os.path.relpath(OUT, ROOT)} "
          f"({os.path.getsize(OUT) / 1024:.0f} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
