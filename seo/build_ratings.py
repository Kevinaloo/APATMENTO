# -*- coding: utf-8 -*-
"""
Cabana — build ratings.json from REAL review data.

aggregateRating is the single highest-CTR rich result in travel search: it
puts gold stars next to the Cabana result. It is also the single fastest way
to earn a Google manual action if the numbers are not real.

Rule: a rating may only be marked up if (a) it is computed from actual guest
reviews and (b) those reviews are visible on the page being marked up.

This script reads real reviews from Supabase and writes seo/data/ratings.json.
Run it on a schedule, then re-run seo/inject_schema.py.

    SUPABASE_URL=... SUPABASE_SERVICE_KEY=... python3 seo/build_ratings.py
"""
import os, json, sys, urllib.request, datetime, collections

URL = os.environ.get("SUPABASE_URL")
KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "ratings.json")

# Minimum real reviews before a rating is eligible for markup.
MIN_REVIEWS = 5


def fetch(table, select):
    req = urllib.request.Request(
        f"{URL}/rest/v1/{table}?select={select}",
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def main():
    if not (URL and KEY):
        print("SUPABASE_URL / SUPABASE_SERVICE_KEY not set — nothing written.")
        print("ratings.json left as-is; rating rich-results stay disabled (safe).")
        return 1
    reviews = fetch("reviews", "rating,listing_id")
    listings = {l["id"]: l for l in fetch("listings", "id,city,area")}
    buckets = collections.defaultdict(list)
    for r in reviews:
        l = listings.get(r.get("listing_id"))
        if not l or r.get("rating") is None:
            continue
        for key in filter(None, [l.get("area"), l.get("city")]):
            buckets[key.strip().lower().replace(" ", "-")].append(float(r["rating"]))
    out = {"_generated": datetime.datetime.utcnow().isoformat() + "Z"}
    for slug, vals in buckets.items():
        if len(vals) < MIN_REVIEWS:
            continue
        out[slug] = {"ratingValue": round(sum(vals) / len(vals), 1),
                     "reviewCount": len(vals)}
    json.dump(out, open(OUT, "w"), indent=1)
    print(f"wrote {len(out) - 1} eligible ratings to {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
