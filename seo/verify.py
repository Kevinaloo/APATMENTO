# -*- coding: utf-8 -*-
"""
Cabana — SEO verification suite.

Fails loudly on the regressions that actually cost rankings, and on the two
integrity failures that can cost the whole domain:

  * fabricated review ratings
  * fabricated inventory / offer claims

Both are Google structured-data policy violations and both are easy to
reintroduce by accident, so they are checked mechanically on every push.

    python3 seo/verify.py        # exit 1 on any failure
"""
import os, re, sys, glob, json, html
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HERE = os.path.dirname(os.path.abspath(__file__))

fails, warns = [], []


def load(name):
    try:
        d = json.load(open(os.path.join(HERE, "data", name)))
        return {k: v for k, v in d.items() if not k.startswith("_")}
    except Exception:
        return {}


RATINGS, INVENTORY = load("ratings.json"), load("inventory.json")

HUB_SERVICES = {
    "apartments.html": "stays", "tours.html": "tours",
    "flights.html": "flights", "events.html": "events",
    "carhire.html": "carhire", "rides.html": "rides",
    "food.html": "food", "shopping.html": "shopping",
    "roommates.html": "roommates", "rewards.html": "rewards",
}


def main():
    pages = sorted(glob.glob(os.path.join(ROOT, "*.html")))
    stems = {os.path.basename(f)[:-5] for f in pages}
    titles, descs, indexable = Counter(), Counter(), 0
    ld_blocks = 0

    for f in pages:
        name = os.path.basename(f)
        src = open(f, encoding="utf-8").read()
        noindex = bool(re.search(r'name="robots"\s+content="[^"]*noindex', src))

        # ── JSON-LD must parse ──
        for b in re.findall(r'<script type="application/ld\+json">(.*?)</script>',
                            src, re.S):
            ld_blocks += 1
            try:
                json.loads(b)
            except Exception as e:
                fails.append(f"{name}: invalid JSON-LD ({str(e)[:60]})")

        # ── integrity: no rating without real review data ──
        if "aggregateRating" in src and os.path.basename(f)[:-5] not in RATINGS:
            if not RATINGS:
                fails.append(f"{name}: aggregateRating emitted but ratings.json is empty. "
                             "Fabricated review markup — run seo/build_ratings.py.")
            else:
                warns.append(f"{name}: aggregateRating without a ratings.json entry")

        # ── integrity: no offer claim without real inventory ──
        if "AggregateOffer" in src and not INVENTORY:
            fails.append(f"{name}: AggregateOffer emitted but inventory.json is empty. "
                         "Fabricated stock — run seo/build_inventory.py.")
        hub_service = HUB_SERVICES.get(name)
        if "AggregateOffer" in src and hub_service:
            available = sum(int((services.get(hub_service) or {}).get("count") or 0)
                            for services in INVENTORY.values())
            if available == 0:
                fails.append(f"{name}: AggregateOffer emitted with no {hub_service} inventory")

        if noindex:
            continue
        indexable += 1

        # ── on-page basics ──
        title_tags = re.findall(r"<title\b[^>]*>(.*?)</title>", src, re.S | re.I)
        desc_tags = re.findall(
            r'<meta\b(?=[^>]*\bname=["\']description["\'])[^>]*\bcontent=["\'](.*?)["\'][^>]*>',
            src, re.S | re.I)
        if len(title_tags) != 1:
            fails.append(f"{name}: {len(title_tags)} <title> tags (must be exactly 1)")
        if len(desc_tags) != 1:
            fails.append(f"{name}: {len(desc_tags)} meta descriptions (must be exactly 1)")
        t = title_tags[0] if title_tags else None
        d = desc_tags[0] if desc_tags else None
        if not t:
            fails.append(f"{name}: no <title>")
        else:
            tt = html.unescape(t).strip()
            titles[tt] += 1
            if len(tt) > 62:
                fails.append(f"{name}: title {len(tt)} chars (max 62)")
        if not d:
            fails.append(f"{name}: no meta description")
        else:
            dd = html.unescape(d).strip()
            descs[dd] += 1
            if len(dd) > 165:
                fails.append(f"{name}: description {len(dd)} chars (max 165)")
        if 'rel="canonical"' not in src:
            fails.append(f"{name}: no canonical")
        if len(re.findall(r"<h1\b", src)) != 1:
            warns.append(f"{name}: {len(re.findall(r'<h1\b', src))} h1 tags")

        # ── links: no 404s, no redirect chains ──
        for target in set(re.findall(r'href="/([a-z0-9\-]+)(?:\.html)?"', src)):
            if target not in stems:
                fails.append(f"{name}: broken internal link -> /{target}")
        if re.search(r'href="/[a-z0-9\-]+\.html"', src):
            warns.append(f"{name}: .html link (308 redirect hop — run seo/polish.py)")

    for t, c in titles.items():
        if c > 1:
            fails.append(f"duplicate title x{c}: {t[:60]}")
    for d, c in descs.items():
        if c > 1:
            fails.append(f"duplicate description x{c}: {d[:60]}")

    # ── sitemaps must exist and match reality ──
    idx = os.path.join(ROOT, "sitemap-index.xml")
    if not os.path.exists(idx):
        fails.append("sitemap-index.xml missing")
    else:
        listed = set()
        for sm in glob.glob(os.path.join(ROOT, "sitemap-*.xml")):
            if sm.endswith(("index.xml", "images.xml")):
                continue
            for loc in re.findall(r"<loc>https://cabana\.africa/?([^<]*)</loc>",
                                  open(sm, encoding="utf-8").read()):
                listed.add(loc or "index")
        if abs(len(listed) - indexable) > 2:
            fails.append(f"sitemap lists {len(listed)} URLs but {indexable} pages "
                         "are indexable — run seo/sitemaps.py")

    print(f"pages {len(pages)} | indexable {indexable} | JSON-LD blocks {ld_blocks}")
    print(f"failures {len(fails)} | warnings {len(warns)}")
    for w in warns[:15]:
        print("  WARN", w)
    for x in fails[:40]:
        print("  FAIL", x)
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
