# -*- coding: utf-8 -*-
"""
Cabana — client gazetteer builder.

Compiles seo/data/places.py and seo/data/africa.py into the SEED table
inside apa-geo.js, between the GAZETTEER:BEGIN / GAZETTEER:END markers.

Why generate it rather than fetch it:

  A network geocode takes 200-600ms on a good connection and sometimes
  never lands at all. The search box cannot wait for it — the first
  keystroke has to put something on screen. This table is what answers
  that keystroke, offline, in under a millisecond.

  Generating it from the SEO place graph rather than hand-writing a list
  means the two can never drift. Every city with a landing page is a city
  guests can search for, by construction, forever. Add a country to
  africa.py, re-run this, and the search box knows about it.

Everything past this seed still comes from the live geocoder — this is
the floor, not the ceiling.

    python3 -m seo.build_gazetteer          # from the repo root

Idempotent. Run it as often as you like; it rewrites one block.
"""

import io
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TARGET = os.path.join(ROOT, "apa-geo.js")

BEGIN = "/* GAZETTEER:BEGIN"
END = "/* GAZETTEER:END */"

sys.path.insert(0, ROOT)

from seo.data.places import PLACES          # noqa: E402
from seo.data.africa import COUNTRIES       # noqa: E402


# The place graph tags things for schema.org, which is a different
# vocabulary from the one the search box ranks on. Map it once.
KIND_FROM_SCHEMA = {
    "Neighborhood": "neighbourhood",
    "Beach": "poi",
    "SafariRegion": "region",
    "City": "city",
    "Continent": "region",
}

# ISO2 for the non-African countries places.py reaches into. Africa's
# codes come from africa.py itself, so only the rest of the world is
# listed here.
ISO2 = {
    "United Kingdom": "gb", "France": "fr", "Netherlands": "nl", "Germany": "de",
    "Spain": "es", "Portugal": "pt", "Italy": "it", "Greece": "gr",
    "Austria": "at", "Czechia": "cz", "Hungary": "hu", "Denmark": "dk",
    "Croatia": "hr", "Türkiye": "tr", "United Arab Emirates": "ae",
    "Japan": "jp", "South Korea": "kr", "Singapore": "sg", "Thailand": "th",
    "Indonesia": "id", "Malaysia": "my", "United States": "us", "Mexico": "mx",
    "Colombia": "co", "Argentina": "ar", "Brazil": "br", "Australia": "au",
}

# Airports and transport hubs travellers name directly. A guest lands at
# JKIA and searches for JKIA; no amount of city data answers that, and a
# geocoder that has to round-trip for it is a geocoder that felt slow.
HUBS = [
    ("Jomo Kenyatta International Airport", "Nairobi", "Kenya", "ke", -1.3192, 36.9278, "airport"),
    ("Wilson Airport", "Nairobi", "Kenya", "ke", -1.3218, 36.8148, "airport"),
    ("Moi International Airport", "Mombasa", "Kenya", "ke", -4.0348, 39.5942, "airport"),
    ("Nairobi Terminus (SGR)", "Nairobi", "Kenya", "ke", -1.3810, 36.9160, "transport"),
    ("Julius Nyerere International Airport", "Dar es Salaam", "Tanzania", "tz", -6.8781, 39.2026, "airport"),
    ("Kilimanjaro International Airport", "Arusha", "Tanzania", "tz", -3.4294, 37.0745, "airport"),
    ("Abeid Amani Karume International Airport", "Zanzibar", "Tanzania", "tz", -6.2220, 39.2249, "airport"),
    ("Entebbe International Airport", "Kampala", "Uganda", "ug", 0.0424, 32.4435, "airport"),
    ("Kigali International Airport", "Kigali", "Rwanda", "rw", -1.9686, 30.1395, "airport"),
    ("Bole International Airport", "Addis Ababa", "Ethiopia", "et", 8.9779, 38.7993, "airport"),
    ("Murtala Muhammed International Airport", "Lagos", "Nigeria", "ng", 6.5774, 3.3212, "airport"),
    ("Kotoka International Airport", "Accra", "Ghana", "gh", 5.6052, -0.1668, "airport"),
    ("O. R. Tambo International Airport", "Johannesburg", "South Africa", "za", -26.1367, 28.2411, "airport"),
    ("Cape Town International Airport", "Cape Town", "South Africa", "za", -33.9715, 18.6021, "airport"),
    ("Cairo International Airport", "Cairo", "Egypt", "eg", 30.1219, 31.4056, "airport"),
    ("Mohammed V International Airport", "Casablanca", "Morocco", "ma", 33.3675, -7.5899, "airport"),
    ("Dubai International Airport", "Dubai", "United Arab Emirates", "ae", 25.2532, 55.3657, "airport"),
]


COORDS_FILE = os.path.join(HERE, "data", "city_coords.json")


def coord_key(city, country):
    return "%s|%s" % (city.strip().lower(), country.strip().lower())


def load_coords_raw():
    """Everything on disk, including the `null` misses."""
    if not os.path.exists(COORDS_FILE):
        return {}
    with io.open(COORDS_FILE, encoding="utf-8") as fh:
        raw = json.load(fh)
    return {k: (tuple(v) if v else None) for k, v in raw.items() if k[:1] != "_"}


def load_coords():
    """Only the hits. A `null` records a name OSM has no match for, so
    the next resolve run does not retry it — it is a known miss, not a
    coordinate, and the gazetteer must not carry it."""
    return {k: v for k, v in load_coords_raw().items() if v}


COORDS = load_coords()


def resolve_cities(force=False):
    """Fill in coordinates for the city names africa.py lists but does not
    place, and write them to seo/data/city_coords.json.

    This is the only part of the build that touches the network, and it
    is deliberately a separate step: `python3 -m seo.build_gazetteer
    --resolve`. The cache is committed, so an ordinary build — and CI,
    and a laptop on a plane — never makes a request.

    OSM is asked politely: one request at a time, a second apart, with a
    User-Agent that says who we are. 221 cities is about four minutes,
    once, ever.
    """
    import json as _json
    import time
    import urllib.parse
    import urllib.request

    coords = load_coords_raw()
    todo = []
    queued = set()
    for c in COUNTRIES:
        # The capital is resolved alongside the city list, and often is
        # not in it — Yamoussoukro, Dodoma, Gitega are capitals whose
        # countries list a different city as the one travellers name.
        for city in list(c.get("cities") or []) + [c.get("capital")]:
            if not city:
                continue
            key = coord_key(city, c["name"])
            if key in queued:
                continue
            if force or key not in coords:
                queued.add(key)
                todo.append((city, c["name"], key))

    if not todo:
        print("city coords: nothing to resolve, %d cached" % len(coords))
        return coords

    print("city coords: resolving %d (%d cached)" % (len(todo), len(coords)))
    ua = "CabanaGazetteerBuild/1.0 (+https://cabana.africa; ops@cabana.africa)"

    for i, (city, country, key) in enumerate(todo, 1):
        url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({
            "q": "%s, %s" % (city, country),
            "format": "jsonv2",
            "limit": "1",
        })
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": ua, "Accept-Language": "en",
            })
            with urllib.request.urlopen(req, timeout=20) as fh:
                data = _json.loads(fh.read().decode("utf-8"))
            if data:
                coords[key] = (round(float(data[0]["lat"]), 4),
                               round(float(data[0]["lon"]), 4))
                print("  %3d/%d  %-28s %s" % (i, len(todo), city, coords[key]))
            else:
                # Recorded as a miss so the next run does not retry a name
                # OSM genuinely does not have.
                coords[key] = None
                print("  %3d/%d  %-28s not found" % (i, len(todo), city))
        except Exception as exc:                       # noqa: BLE001
            # A transient failure is left uncached on purpose — the next
            # run should try it again rather than bake in an outage.
            print("  %3d/%d  %-28s failed: %s" % (i, len(todo), city, exc))
        time.sleep(1.1)

    payload = {"_note": "Built by seo/build_gazetteer.py --resolve from OpenStreetMap. "
                        "null means OSM has no match for that name."}
    payload.update({k: (list(v) if v else None) for k, v in sorted(coords.items())})
    with io.open(COORDS_FILE, "w", encoding="utf-8") as fh:
        fh.write(_json.dumps(payload, indent=1, ensure_ascii=False))

    return {k: v for k, v in coords.items() if v}


def rows():
    """(name, parent, country, iso2, lat, lng, kind), deduplicated."""
    out = []
    seen = set()

    def add(name, parent, country, cc, lat, lng, kind):
        name = (name or "").strip()
        if not name or lat is None or lng is None:
            return
        key = name.lower()
        if key in seen:
            return
        seen.add(key)
        out.append((name, (parent or "").strip(), (country or "").strip(),
                    (cc or "").lower(), round(float(lat), 4), round(float(lng), 4), kind))

    # 1. African countries, their capitals and their named cities. This is
    #    where the bulk of the coverage comes from: 54 states, each with a
    #    capital and a list of cities Cabana actually sells in.
    for c in COUNTRIES:
        cc = (c.get("iso") or "").lower()
        name = c.get("name")
        lat, lng = c.get("lat"), c.get("lng")
        add(name, "", name, cc, lat, lng, "country")

        # The capital is resolved by name like any other city. It must
        # NOT inherit the country record's coordinates: africa.py's
        # lat/lng is the country's main gateway, which is frequently not
        # the capital. Nigeria's is Lagos, so letting Abuja inherit it
        # put the capital 500km away, in the wrong city, silently.
        capital = c.get("capital")
        if capital:
            pt = COORDS.get(coord_key(capital, name))
            if pt:
                add(capital, "", name, cc, pt[0], pt[1], "city")

        # The `cities` lists carry no coordinates of their own. They are
        # resolved once, at build time, into seo/data/city_coords.json —
        # see resolve_cities() below — so that Mombasa, Kumasi and Stone
        # Town are in the box on the first keystroke like everything else.
        for city in c.get("cities") or []:
            pt = COORDS.get(coord_key(city, name))
            if pt:
                add(city, "", name, cc, pt[0], pt[1], "city")

    # 2. Neighbourhoods, beaches, safari regions and the global cities
    #    Cabana already has pages for.
    for key, v in PLACES.items():
        name, parent, country, lat, lng = v[0], v[1], v[2], v[3], v[4]
        schema = v[7] if len(v) > 7 else "City"
        if schema == "Continent":
            continue  # "Worldwide" is not somewhere a guest can stay
        cc = ISO2.get(country, "")
        if not cc:
            for c in COUNTRIES:
                if c.get("name") == country:
                    cc = (c.get("iso") or "").lower()
                    break
        add(name, parent, country, cc, lat, lng, KIND_FROM_SCHEMA.get(schema, "city"))

    # 3. Airports and terminals.
    for h in HUBS:
        add(*h)

    # Cities first, then neighbourhoods, then the rest: the order the
    # client scans in, so the common answer is found soonest.
    weight = {"city": 0, "neighbourhood": 1, "airport": 2, "transport": 3,
              "poi": 4, "region": 5, "country": 6}
    out.sort(key=lambda r: (weight.get(r[6], 9), r[0]))
    return out


def js_literal(data):
    def s(v):
        return "'" + str(v).replace("\\", "\\\\").replace("'", "\\'") + "'"

    lines = ["  var SEED = ["]
    for name, parent, country, cc, lat, lng, kind in data:
        lines.append("    [%s,%s,%s,%s,%s,%s,%s]," % (
            s(name), s(parent), s(country), s(cc), lat, lng, s(kind)))
    # Trailing commas in array literals are legal but read as a mistake.
    lines[-1] = lines[-1].rstrip(",")
    lines.append("  ];")
    return "\n".join(lines)


def main():
    global COORDS
    if "--resolve" in sys.argv:
        COORDS = resolve_cities(force="--force" in sys.argv)

    data = rows()
    src = io.open(TARGET, encoding="utf-8").read()

    start = src.find(BEGIN)
    stop = src.find(END)
    if start < 0 or stop < 0:
        raise SystemExit(
            "apa-geo.js is missing the GAZETTEER:BEGIN / GAZETTEER:END markers. "
            "Nothing was written."
        )

    head = src[:start]
    tail = src[stop:]
    block = (
        BEGIN + " — generated by seo/build_gazetteer.py, do not hand-edit */\n"
        + js_literal(data) + "\n  "
    )

    out = head + block + tail
    if out != src:
        io.open(TARGET, "w", encoding="utf-8").write(out)

    print("gazetteer: %d places -> %s" % (len(data), os.path.relpath(TARGET, ROOT)))


if __name__ == "__main__":
    main()
