# -*- coding: utf-8 -*-
"""
Cabana — live inventory pipeline.

WHY THIS EXISTS
---------------
schema.org AggregateOffer is a factual claim: it asserts that a given number of
bookable offers exist in a given price range. Emitting it for a city with no
listings is fabricated markup, in exactly the same category as a fabricated
review rating, and carries the same manual-action risk.

So inventory claims are wired to the database, never to the page generator.
A city with real active listings gets LodgingBusiness + AggregateOffer built
from the real count and the real price range. A city without gets a
TouristDestination and a travel guide — accurate, useful, and still fully
indexable — but no offer claim.

Run this before seo/inject_schema.py. Re-run whenever inventory changes.

    SUPABASE_URL=https://<ref>.supabase.co \
    SUPABASE_SERVICE_KEY=<service-role-key> \
    python3 seo/build_inventory.py

Output: seo/data/inventory.json
"""
import os, sys, json, datetime, urllib.request, collections

URL = os.environ.get("SUPABASE_URL")
KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "inventory.json")

# Approximate FX to USD for schema price ranges. Schema prices are indicative
# and must carry a currency; these only need to be right to the nearest few
# percent. Refresh occasionally.
FX_TO_USD = {"KES": 0.0077, "NGN": 0.00065, "GHS": 0.065, "ZAR": 0.055,
             "TZS": 0.00038, "UGX": 0.00027, "RWF": 0.00073, "USD": 1.0,
             "EUR": 1.08, "GBP": 1.27, "MAD": 0.10, "EGP": 0.021,
             "XOF": 0.0016, "XAF": 0.0016}


def slug(s):
    return (s or "").strip().lower().replace(" ", "-").replace("'", "")


def fetch(path):
    req = urllib.request.Request(
        f"{URL}/rest/v1/{path}",
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"})
    with urllib.request.urlopen(req, timeout=45) as r:
        return json.load(r)


def main():
    if not (URL and KEY):
        print("SUPABASE_URL / SUPABASE_SERVICE_KEY not set.")
        print("inventory.json left unchanged — offer claims stay off (safe).")
        return 1

    rows = fetch("listings?select=city,area,country,service,price_night,"
                 "price_per_night,currency,status,is_active,deleted_at")

    buckets = collections.defaultdict(list)
    for r in rows:
        if not (r.get("is_active") and r.get("status") == "active"
                and not r.get("deleted_at")):
            continue
        try:
            price = float(r.get("price_night") or r.get("price_per_night") or 0)
        except (TypeError, ValueError):
            price = 0
        if price <= 0:
            continue
        usd = price * FX_TO_USD.get((r.get("currency") or "USD").upper(), 1.0)
        svc = (r.get("service") or "stays").lower()
        for key in filter(None, [slug(r.get("area")), slug(r.get("city")),
                                 slug(r.get("country"))]):
            buckets[(key, svc)].append(usd)

    out = {"_generated": datetime.datetime.utcnow().isoformat() + "Z",
           "_note": ("Real bookable inventory only. A key absent here means no "
                     "AggregateOffer is emitted for that place — by design.")}
    for (key, svc), prices in buckets.items():
        out.setdefault(key, {})[svc] = {
            "count": len(prices),
            "lowUSD": round(min(prices), 2),
            "highUSD": round(max(prices), 2),
        }

    json.dump(out, open(OUT, "w"), indent=1, sort_keys=True)
    places = len([k for k in out if not k.startswith("_")])
    total = sum(v["count"] for k, d in out.items() if not k.startswith("_")
                for v in d.values())
    print(f"inventory.json written: {places} places, {total} live listing-rows")
    if total == 0:
        print("NOTE: no active listings found. Offer markup stays off everywhere.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
