# -*- coding: utf-8 -*-
"""
Cabana — internal link architecture.

Two jobs:

  1. Build /destinations — the master index linking every country hub and every
     city × category page. A generated page with no inbound internal link is an
     orphan: Google will discover it from the sitemap, crawl it once, and rank
     it nowhere, because no PageRank flows to it. This hub is what turns 200+
     generated URLs into a connected site.

  2. Inject a contextual link block into the existing service hubs so authority
     flows from the pages that already have it (apartments, tours, carhire,
     rides, index) down into the new layer, and back up via the generated
     pages' own cross-links.

The resulting shape is a three-tier hub-and-spoke: home → service hub →
destinations → country → city × category, with lateral links at every tier.

Usage: python3 seo/link_mesh.py [--dry]
"""
import os, sys, re, json, html, glob

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import schema as S
from data.africa import COUNTRIES, CITIES

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DRY = "--dry" in sys.argv
SITE = S.SITE
E = lambda s: html.escape(str(s), quote=True)

REGIONS = ["East Africa", "West Africa", "Southern Africa", "North Africa", "Central Africa"]
VERTS = [("safaris", "Safaris"), ("car-hire", "Car hire"), ("airport-transfers", "Transfers")]

HUB_CSS = """
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,sans-serif;background:#fff;color:#0A0A14;-webkit-font-smoothing:antialiased;}
.gnav{position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 24px;background:rgba(255,255,255,.92);backdrop-filter:blur(14px);border-bottom:1px solid rgba(10,10,20,.07);}
.gnav-back,.gnav-cta{display:inline-flex;align-items:center;gap:6px;font-size:13.5px;font-weight:600;text-decoration:none;color:#0A0A14;}
.gnav-cta{background:#0A0A14;color:#fff;padding:9px 16px;border-radius:999px;}
.gnav-logo{height:22px;width:auto;}
.hero{max-width:1100px;margin:0 auto;padding:56px 32px 28px;}
.eyebrow{font-size:11.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#92720A;margin-bottom:14px;}
h1{font-size:clamp(34px,6vw,58px);line-height:1.04;letter-spacing:-.03em;font-weight:800;margin-bottom:18px;}
.sub{font-size:17px;line-height:1.65;color:rgba(10,10,20,.62);max-width:660px;}
.wrap{max-width:1100px;margin:0 auto;padding:16px 32px 64px;}
.region{margin:44px 0 0;}
.region h2{font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(10,10,20,.4);padding-bottom:12px;border-bottom:1px solid rgba(10,10,20,.09);margin-bottom:20px;}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(232px,1fr));gap:12px;}
.ccard{display:block;padding:16px 18px;border:1px solid rgba(10,10,20,.1);border-radius:14px;text-decoration:none;color:#0A0A14;transition:border-color .18s,transform .18s;}
.ccard:hover{border-color:#0A0A14;transform:translateY(-2px);}
.ccard b{display:block;font-size:15.5px;font-weight:700;letter-spacing:-.01em;margin-bottom:5px;}
.ccard span{display:block;font-size:12.5px;line-height:1.5;color:rgba(10,10,20,.5);}
.ccard em{display:block;font-style:normal;font-size:11.5px;font-weight:600;color:#92720A;margin-top:8px;}
.cityrow{margin-top:12px;display:flex;flex-wrap:wrap;gap:7px;}
.pill{font-size:12.5px;font-weight:600;text-decoration:none;color:rgba(10,10,20,.66);border:1px solid rgba(10,10,20,.11);border-radius:999px;padding:6px 12px;transition:.18s;}
.pill:hover{color:#0A0A14;border-color:#0A0A14;}
@media(max-width:620px){.hero{padding:36px 20px 20px;}.wrap{padding:12px 20px 48px;}.grid{grid-template-columns:1fr;}}
"""


def destinations_page():
    url = f"{SITE}/destinations"
    title = "Destinations: Every African Country on Cabana"
    desc = ("Browse Cabana by destination — travel guides, stays, safaris, car hire and "
            "airport transfers for all 54 African countries. Zero commission on every booking.")[:158]

    body = []
    for reg in REGIONS:
        cs = [c for c in COUNTRIES if c["region"] == reg]
        cards = []
        for c in cs:
            cities = [ct for ct in CITIES if ct[1] == c["slug"]]
            pills = "".join(
                f'<a class="pill" href="/{ct[0].lower().replace(" ", "-")}-{v}">'
                f'{E(ct[0])} {E(lbl.lower())}</a>'
                for ct in cities[:2] for v, lbl in VERTS)
            cards.append(
                f'<div><a class="ccard" href="/{c["slug"]}-travel">'
                f'<b>{E(c["name"])}</b>'
                f'<span>{E(c["capital"])} · {E(c["currency"])} · US${c["band"][0]}–{c["band"][1]} a night</span>'
                f'<em>{E(c["highlights"][0])}</em></a>'
                + (f'<div class="cityrow">{pills}</div>' if pills else "") + "</div>")
        body.append(f'<section class="region"><h2>{E(reg)} · {len(cs)} countries</h2>'
                    f'<div class="grid">{"".join(cards)}</div></section>')

    # Every stay guide on the site, so no location page is ever an orphan.
    guides = sorted(os.path.basename(f)[:-5] for f in glob.glob(os.path.join(ROOT, "*.html"))
                    if re.search(r"-(apartments|stays|cottages)$", os.path.basename(f)[:-5]))
    pills = "".join(f'<a class="pill" href="/{g}">'
                    f'{E(g.rsplit("-", 1)[0].replace("-", " ").title())}</a>' for g in guides)
    body.append(f'<section class="region"><h2>Stay guides · {len(guides)} places</h2>'
                f'<div class="cityrow">{pills}</div></section>')

    all_links = ([(c["name"], f"{SITE}/{c['slug']}-travel") for c in COUNTRIES]
                 + [(f"{ct[0]} {lbl.lower()}",
                     f"{SITE}/{ct[0].lower().replace(' ', '-')}-{v}")
                    for ct in CITIES for v, lbl in VERTS])
    g = S.graph(
        S.webpage(url, title, desc, url + "#breadcrumb", f"{SITE}/og-stays.jpg",
                  page_type="CollectionPage"),
        S.breadcrumbs(url, [("Home", SITE + "/"), ("Destinations", None)]),
        S.itemlist(url, "Cabana destinations", all_links),
    )
    hl = "\n".join(f'<link rel="alternate" hreflang="{m}" href="{url}"/>'
                   for m in ["en-ke", "en-ng", "en-gh", "en-za", "en-gb", "en-us", "en"])
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{E(title)}</title>
<meta name="description" content="{E(desc)}"/>
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large"/>
<link rel="canonical" href="{url}"/>
{hl}
<link rel="alternate" hreflang="x-default" href="{url}"/>
<meta property="og:site_name" content="Cabana"/>
<meta property="og:title" content="{E(title)}"/>
<meta property="og:description" content="{E(desc)}"/>
<meta property="og:url" content="{url}"/>
<meta property="og:type" content="website"/>
<meta property="og:image" content="{SITE}/og-stays.jpg"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="{E(title)}"/>
<meta name="twitter:description" content="{E(desc)}"/>
<meta name="twitter:image" content="{SITE}/og-stays.jpg"/>
<link rel="manifest" href="/manifest.json"/>
<link rel="icon" href="/favicon.ico" sizes="any"/>
<meta name="theme-color" content="#ffffff">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-5NQGLLEE02"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','G-5NQGLLEE02');</script>
<!-- CABANA-SEO-GRAPH --><!-- CABANA-GENERATED -->
<script type="application/ld+json">{json.dumps(g, ensure_ascii=False, separators=(",", ":"))}</script>
<!-- /CABANA-SEO-GRAPH -->
<style>{HUB_CSS}</style>
</head>
<body>
<nav class="gnav">
  <a href="/" class="gnav-back">Home</a>
  <a href="/" aria-label="Cabana home"><img class="gnav-logo" src="/cabana-wordmark-color.png" alt="Cabana" fetchpriority="high" decoding="async"/></a>
  <a href="/apartments" class="gnav-cta">Browse stays</a>
</nav>
<header class="hero">
  <div class="eyebrow">Africa · 54 countries</div>
  <h1>Every destination on Cabana.</h1>
  <p class="sub">Guides, stays, safaris, car hire and airport transfers for all 54 African
  countries — plus the cities travellers actually fly into. Every booking below is direct
  with the host or operator, at their price, with zero commission taken by Cabana.</p>
</header>
<main class="wrap">
{''.join(body)}
</main>
</body>
</html>"""


# ── link injection into existing hubs ────────────────────────────────────
MARK = "<!-- CABANA-LINKMESH -->"
END = "<!-- /CABANA-LINKMESH -->"

MESH_CSS = ("<style>.cbm{max-width:1100px;margin:56px auto 0;padding:0 24px 8px;}"
            ".cbm h2{font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;"
            "color:rgba(10,10,20,.4);padding-bottom:12px;border-bottom:1px solid rgba(10,10,20,.09);"
            "margin-bottom:16px;font-family:inherit;}"
            ".cbm-l{display:flex;flex-wrap:wrap;gap:7px;}"
            ".cbm-l a{font-size:12.5px;font-weight:600;text-decoration:none;color:rgba(10,10,20,.66);"
            "border:1px solid rgba(10,10,20,.11);border-radius:999px;padding:6px 12px;transition:.18s;}"
            ".cbm-l a:hover{color:#0A0A14;border-color:#0A0A14;}"
            ".cbm-more{display:inline-block;margin-top:14px;font-size:13px;font-weight:700;"
            "color:#0A0A14;text-decoration:none;border-bottom:2px solid #92720A;padding-bottom:1px;}</style>")


def mesh_block(heading, links, more=("All 54 destinations", "/destinations")):
    ls = "".join(f'<a href="{h}">{E(t)}</a>' for t, h in links)
    return (f'{MARK}{MESH_CSS}<nav class="cbm" aria-label="{E(heading)}">'
            f'<h2>{E(heading)}</h2><div class="cbm-l">{ls}</div>'
            f'<a class="cbm-more" href="{more[1]}">{E(more[0])} →</a></nav>{END}')


def links_for(page):
    tier1 = [c for c in COUNTRIES if c["tier"] == 1]
    if page == "tours.html":
        return ("Safaris and tours by city",
                [(f"{c[0]} safaris", f"/{c[0].lower().replace(' ', '-')}-safaris")
                 for c in CITIES[:26]])
    if page == "carhire.html":
        return ("Car hire by city",
                [(f"Car hire {c[0]}", f"/{c[0].lower().replace(' ', '-')}-car-hire")
                 for c in CITIES[:26]])
    if page == "rides.html":
        return ("Airport transfers by city",
                [(f"{c[0]} transfers", f"/{c[0].lower().replace(' ', '-')}-airport-transfers")
                 for c in CITIES[:26]])
    if page in ("apartments.html", "africa-apartments.html", "index.html"):
        return ("Travel guides by country",
                [(c["name"], f"/{c['slug']}-travel") for c in COUNTRIES[:30]])
    return ("Explore Africa by country",
            [(c["name"], f"/{c['slug']}-travel") for c in tier1])


TARGETS = ["index.html", "apartments.html", "tours.html", "carhire.html", "rides.html",
           "africa-apartments.html", "flights.html", "events.html", "guides.html",
           "kenya-apartments.html", "nigeria-apartments.html", "ghana-apartments.html",
           "south-africa-apartments.html", "tanzania-apartments.html", "morocco-apartments.html"]


def prune_broken_links():
    """
    Remove internal links pointing at pages that do not exist.

    Broken internal links waste crawl budget on soft-404s and dilute the link
    graph. Cheaper to prune than to generate filler pages nobody searches for.
    Returns the set of removed targets.
    """
    have = {os.path.basename(f)[:-5] for f in glob.glob(os.path.join(ROOT, "*.html"))}
    removed, touched = set(), 0
    for f in sorted(glob.glob(os.path.join(ROOT, "*.html"))):
        src = open(f, encoding="utf-8").read()
        out = src
        for target in set(re.findall(r'href="/([a-z0-9\-]+)(?:\.html)?"', src)):
            if target in have:
                continue
            removed.add(target)
            # drop the whole anchor element, whatever wrapper class it uses
            out = re.sub(r'<a\b[^>]*href="/' + re.escape(target) + r'(?:\.html)?"[^>]*>.*?</a>',
                         "", out, flags=re.S)
        if out != src:
            touched += 1
            if not DRY:
                open(f, "w", encoding="utf-8").write(out)
    print(f"pruned {len(removed)} broken link targets across {touched} pages")
    return removed


def main():
    # 1. destinations hub
    if not DRY:
        open(os.path.join(ROOT, "destinations.html"), "w", encoding="utf-8").write(
            destinations_page())
    print("built destinations.html")

    # 2. inject mesh into existing hubs
    n = 0
    for page in TARGETS:
        p = os.path.join(ROOT, page)
        if not os.path.exists(p):
            continue
        src = open(p, encoding="utf-8").read()
        heading, links = links_for(page)
        block = mesh_block(heading, links)
        if MARK in src:
            out = re.sub(re.escape(MARK) + r".*?" + re.escape(END), lambda _: block,
                         src, flags=re.S)
        else:
            # place immediately before the footer, or before </body>
            i = src.rfind("<footer")
            out = (src[:i] + block + "\n" + src[i:]) if i > 0 else \
                  src.replace("</body>", block + "\n</body>", 1)
        if out != src:
            n += 1
            if not DRY:
                open(p, "w", encoding="utf-8").write(out)
    print(f"link mesh injected into {n} hub pages")

    # 3. footer link to /destinations across the whole site
    f = 0
    for p in sorted(glob.glob(os.path.join(ROOT, "*.html"))):
        src = open(p, encoding="utf-8").read()
        if 'href="/destinations"' in src or "<footer" not in src:
            continue
        out = src.replace('<a href="/apartments.html">',
                          '<a href="/destinations">Destinations</a><a href="/apartments.html">', 1)
        if out == src:
            continue
        f += 1
        if not DRY:
            open(p, "w", encoding="utf-8").write(out)
    print(f"footer destination link added to {f} pages")

    # 4. prune links to pages that do not exist
    prune_broken_links()


if __name__ == "__main__":
    main()
