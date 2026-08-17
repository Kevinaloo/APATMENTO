# -*- coding: utf-8 -*-
"""
Cabana - supply-gated indexability.

WHY THIS EXISTS
---------------
A commercial location page makes an implicit promise: that there is something
here to book. "Abuja Apartments" tells a searcher that apartments in Abuja can
be booked, and Google reads the page the same way. When the page is a template
with the city name swapped and no listings behind it, that promise is empty,
and a few hundred of them together are what Google's scaled-content-abuse
policy is written to catch. The penalty lands on the domain, not the page, so
empty pages do not merely fail to rank: they hold down the pages that deserve
to.

seo/build_inventory.py already refuses to emit AggregateOffer for a place with
no listings, on the same reasoning. This module extends that from the offer
claim to the page itself. Inventory decides indexability.

Editorial pages are never gated. A travel guide with no listings is still
honest and still useful, so country guides, city guides, comparisons and answer
pages stay indexable regardless of supply. Only pages that imply bookable
inventory are subject to the gate.

The gate is symmetric. A page promotes itself the day supply crosses the
threshold and demotes itself if supply disappears, so the index reflects what
is actually bookable without anyone maintaining a list.

The on-page robots meta is the single source of truth for indexability:
seo/sitemaps.py and seo/indexnow.py both read it, so a page dropped here
disappears from the sitemaps and from IndexNow submission on the next build,
with no second list to keep in sync.

    python3 seo/index_gate.py            # dry run, prints the transitions
    python3 seo/index_gate.py --apply    # write the robots meta
    python3 seo/index_gate.py --threshold 3

Run before seo/sitemaps.py. Re-run whenever inventory changes.
"""
import os, sys, re, json, glob, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INVENTORY = os.path.join(ROOT, "seo", "data", "inventory.json")
STATE = os.path.join(ROOT, "seo", "data", "index_state.json")

APPLY = "--apply" in sys.argv
THRESHOLD = 1
if "--threshold" in sys.argv:
    THRESHOLD = int(sys.argv[sys.argv.index("--threshold") + 1])

INDEX_META = ('<meta name="robots" content="index, follow, max-snippet:-1, '
              'max-image-preview:large, max-video-preview:-1"/>')
NOINDEX_META = '<meta name="robots" content="noindex, follow"/>'

# Page families that promise bookable inventory, mapped to the service key
# build_inventory.py reads off the listings table. These keys must match the
# `service` column: a mismatch reads as zero supply and demotes the family, so
# the report below prints what each family actually resolved to.
GATED = {
    "-apartments": "stays",
    "-safaris": "tours",
    "-car-hire": "cars",
    "-airport-transfers": "rides",
}

# Never gated. These make no inventory claim, so they stand on their content.
EDITORIAL = ("-travel", "-travel-guide")


def load_inventory():
    if not os.path.exists(INVENTORY):
        sys.exit("inventory.json missing. Run seo/build_inventory.py first.")
    return {k: v for k, v in json.load(open(INVENTORY, encoding="utf-8")).items()
            if not k.startswith("_")}


def supply(inv, place, service):
    """Units of `service` bookable in `place`. Absent means zero, by design."""
    return int(((inv.get(place) or {}).get(service) or {}).get("count") or 0)


def classify(stem):
    """(family_suffix, service, place) for a gated page, else None."""
    for suffix in EDITORIAL:
        if stem.endswith(suffix):
            return None
    for suffix, service in GATED.items():
        if stem.endswith(suffix):
            return suffix, service, stem[: -len(suffix)]
    return None


def current_state(src):
    m = re.search(r'<meta\s+name="robots"\s+content="([^"]*)"', src, re.I)
    if not m:
        return "absent"
    return "noindex" if "noindex" in m.group(1).lower() else "index"


def set_state(src, want):
    meta = NOINDEX_META if want == "noindex" else INDEX_META
    if re.search(r'<meta\s+name="robots"\s+content="[^"]*"\s*/?>', src, re.I):
        return re.sub(r'<meta\s+name="robots"\s+content="[^"]*"\s*/?>', meta, src,
                      count=1, flags=re.I)
    return src.replace("</head>", meta + "\n</head>", 1)


def main():
    inv = load_inventory()
    promote, demote, hold, by_family = [], [], [], collections.defaultdict(
        lambda: {"indexed": 0, "gated": 0})

    for path in sorted(glob.glob(os.path.join(ROOT, "*.html"))):
        stem = os.path.basename(path)[:-5]
        hit = classify(stem)
        if not hit:
            continue
        suffix, service, place = hit
        src = open(path, encoding="utf-8").read()
        now = current_state(src)
        units = supply(inv, place, service)
        want = "index" if units >= THRESHOLD else "noindex"
        by_family[suffix]["indexed" if want == "index" else "gated"] += 1

        if now == want:
            hold.append((stem, units))
            continue
        (promote if want == "index" else demote).append((stem, service, units))
        if APPLY:
            open(path, "w", encoding="utf-8").write(set_state(src, want))

    print(f"{'APPLIED' if APPLY else 'DRY RUN'}   threshold: "
          f"{THRESHOLD}+ live listing(s) to stay indexed\n")
    print(f"{'family':<22}{'indexed':>9}{'gated':>8}   service key")
    for suffix, counts in sorted(by_family.items()):
        print(f"{suffix:<22}{counts['indexed']:>9}{counts['gated']:>8}   "
              f"{GATED[suffix]}")

    print(f"\n  promote to index : {len(promote)}")
    for stem, svc, n in promote[:20]:
        print(f"      {stem}  ({n} {svc})")
    print(f"  demote to noindex: {len(demote)}")
    for stem, svc, n in demote[:20]:
        print(f"      {stem}  ({n} {svc})")
    if len(demote) > 20:
        print(f"      ... and {len(demote) - 20} more")
    print(f"  already correct  : {len(hold)}")

    if APPLY:
        json.dump({"_generated": __import__("datetime").datetime.utcnow()
                   .strftime("%Y-%m-%dT%H:%M:%SZ"),
                   "_note": "Written by seo/index_gate.py. Indexability is derived "
                            "from real inventory, never hand-edited.",
                   "threshold": THRESHOLD,
                   "indexed": sorted(s for s, _ in hold) + sorted(s for s, _, _ in promote),
                   "gated": sorted(s for s, _, _ in demote)},
                  open(STATE, "w", encoding="utf-8"), indent=1)
        print(f"\n  wrote {os.path.relpath(STATE, ROOT)}")
        print("  next: python3 seo/sitemaps.py && python3 seo/indexnow.py --changed")
    else:
        print("\n  nothing written. re-run with --apply to commit these changes.")


if __name__ == "__main__":
    main()
