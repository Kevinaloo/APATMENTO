# -*- coding: utf-8 -*-
"""
Cabana — sitemap generation.

Rebuilds the full sitemap set from what is actually on disk, so a generated
page can never be missing from discovery and a deleted page can never linger
as a 404 in the index (both waste crawl budget, and crawl budget is the
constraint on a site this size).

Emits:
  sitemap-index.xml   the master index
  sitemap-core.xml    home + service hubs + conversion pages (priority 0.9–1.0)
  sitemap-countries.xml   the 54 country hubs
  sitemap-cities.xml  city × category commercial pages
  sitemap-stays.xml   every location / stay guide
  sitemap-guides.xml  editorial, comparisons, answers
  sitemap-images.xml  image sitemap for Google Images traffic

Hreflang is intentionally omitted until distinct localized URL versions exist.

Usage: python3 seo/sitemaps.py
"""
import os, re, glob, html, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://cabana.africa"
TODAY = datetime.date.today().isoformat()

NOINDEX = {
    "auth", "dashboard", "booking-confirm", "my-bookings", "admin", "admin-photos",
    "profile", "add-listing", "agent-dashboard", "driver", "offline",
    "partner-listings", "partner-bookings", "partner-calendar", "partner-agents",
    "partner-analytics", "partner-earnings", "partner-reviews", "partner-settings",
    "partner-cabana",
}

CORE = {"index": 1.0, "apartments": 0.95, "tours": 0.95, "flights": 0.9, "events": 0.9,
        "carhire": 0.9, "rides": 0.9, "food": 0.85, "shopping": 0.85, "roommates": 0.85,
        "destinations": 0.95, "become-partner": 0.9, "become-agent": 0.85,
        "become-driver": 0.85, "cabana": 0.9, "rewards": 0.7, "guides": 0.8,
        "press": 0.6, "terms": 0.3, "privacy": 0.3, "cookies": 0.3}


def url_for(stem):
    return SITE + "/" if stem == "index" else f"{SITE}/{stem}"


def entry(stem, priority, changefreq):
    u = url_for(stem)
    return (f"  <url>\n    <loc>{u}</loc>\n    <lastmod>{TODAY}</lastmod>\n"
            f"    <changefreq>{changefreq}</changefreq>\n"
            f"    <priority>{priority}</priority>\n  </url>")


HEAD = ('<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
HEAD_IMG = ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
            '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">')


def write(name, body, head=HEAD):
    p = os.path.join(ROOT, name)
    open(p, "w", encoding="utf-8").write(head + "\n" + body + "\n</urlset>\n")
    return p


def is_noindex(path):
    """The page's own robots meta is the single source of truth for
    indexability, so a page gated by seo/index_gate.py (no live inventory
    behind an offer-implying URL) leaves the sitemaps on the next build with
    no second list to keep in sync. seo/indexnow.py reads the same signal."""
    with open(path, encoding="utf-8") as fh:
        return bool(re.search(r'name="robots"\s+content="[^"]*noindex',
                              fh.read(), re.I))


def classify(stem):
    if stem in NOINDEX:
        return None
    if stem in CORE:
        return "core"
    if stem.endswith("-travel"):
        return "countries"
    if re.search(r"-(safaris|car-hire|airport-transfers)$", stem):
        return "cities"
    if re.search(r"-(apartments|stays|cottages)$", stem):
        return "stays"
    return "guides"


def main():
    buckets = {k: [] for k in ("core", "countries", "cities", "stays", "guides")}
    img_entries = []

    for f in sorted(glob.glob(os.path.join(ROOT, "*.html"))):
        stem = os.path.basename(f)[:-5]
        b = classify(stem)
        if not b or is_noindex(f):
            continue
        src = open(f, encoding="utf-8").read()
        if re.search(r'name="robots"\s+content="[^"]*noindex', src):
            continue

        pri = {"core": CORE.get(stem, 0.9), "countries": 0.85,
               "cities": 0.8, "stays": 0.8, "guides": 0.7}[b]
        freq = {"core": "daily", "countries": "weekly", "cities": "weekly",
                "stays": "weekly", "guides": "monthly"}[b]
        buckets[b].append(entry(stem, pri, freq))

        # image sitemap: the OG image is the page's canonical visual
        m = re.search(r'property="og:image"\s+content="([^"]+)"', src)
        t = re.search(r"<title>(.*?)</title>", src, re.S)
        if m:
            cap = html.escape(html.unescape(t.group(1)).strip() if t else "Cabana", quote=True)
            img_entries.append(
                f"  <url>\n    <loc>{url_for(stem)}</loc>\n    <image:image>\n"
                f"      <image:loc>{html.escape(m.group(1), quote=True)}</image:loc>\n"
                f"      <image:title>{cap}</image:title>\n"
                f"    </image:image>\n  </url>")

    files = []
    for b, items in buckets.items():
        path = os.path.join(ROOT, f"sitemap-{b}.xml")
        if items:
            files.append((f"sitemap-{b}.xml", len(items)))
            write(f"sitemap-{b}.xml", "\n".join(items))
        elif os.path.exists(path):
            os.remove(path)
    write("sitemap-images.xml", "\n".join(img_entries), HEAD_IMG)
    files.append(("sitemap-images.xml", len(img_entries)))

    idx = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
           "  <!-- Cabana — master sitemap index. Generated by seo/sitemaps.py -->"]
    for name, _ in files:
        idx.append(f"  <sitemap>\n    <loc>{SITE}/{name}</loc>\n"
                   f"    <lastmod>{TODAY}</lastmod>\n  </sitemap>")
    idx.append("</sitemapindex>")
    open(os.path.join(ROOT, "sitemap-index.xml"), "w", encoding="utf-8").write("\n".join(idx) + "\n")

    # sitemap.xml kept as an alias of the index for any legacy reference.
    open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8").write("\n".join(idx) + "\n")

    total = sum(n for _, n in files if not _.endswith("images.xml"))
    print("Cabana sitemaps rebuilt")
    print("-" * 40)
    for name, n in files:
        print(f"  {name:26} {n:>4} urls")
    print(f"\n  indexable URLs: {total}")

    # Remove superseded sitemaps so the index stays truthful.
    for old in ("sitemap-locations.xml", "sitemap-global.xml", "sitemap-deep.xml",
                "sitemap-blog.xml"):
        p = os.path.join(ROOT, old)
        if os.path.exists(p):
            os.remove(p)
            print(f"  removed stale {old}")


if __name__ == "__main__":
    main()
