# -*- coding: utf-8 -*-
"""
Cabana — programmatic page generator.

Builds the continental coverage layer: one authoritative travel hub for every
sovereign African state, wired into the existing design system and the
Cabana entity graph.

Design principle: no thin pages. Every generated page carries country-specific
facts that exist nowhere else on the site — season windows, the actual payment
rails travellers will use on the ground, visa mechanics, real price bands,
named attractions and named cities. Thin doorway pages get filtered; specific
pages get cited by both Google and LLMs.

Usage: python3 seo/generate.py [--dry]
"""
import os, sys, re, html, json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import schema as S
from data.africa import COUNTRIES, CITIES, CATEGORIES

# Real inventory, built from Supabase by seo/build_inventory.py. Used to decide
# whether a page may make an offer claim and whether it may say "book now"
# rather than "be the first to list". Absent key = no inventory = say so.
try:
    _I = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                     "data", "inventory.json")))
    INVENTORY = {k: v for k, v in _I.items() if not k.startswith("_")}
except Exception:
    INVENTORY = {}


def stock(*keys, service="stays"):
    for k in keys:
        rec = INVENTORY.get(str(k).strip().lower().replace(" ", "-"), {}).get(service)
        if rec and rec.get("count"):
            return rec["count"], rec["lowUSD"], rec["highUSD"]
    return (0, None, None)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DRY = "--dry" in sys.argv
SITE = S.SITE
CSS = open(os.path.join(ROOT, "seo/data/page.css")).read()
FOOTER_CSS = open(os.path.join(ROOT, "seo/data/footer.css")).read()
FOOTER_HTML = open(os.path.join(ROOT, "seo/data/footer.html")).read()

HREFLANG = ["en-ke","en-ng","en-gh","en-tz","en-ug","en-rw","en-za","en-et","en-sn",
            "en-eg","en-ma","en-zm","en-zw","en-na","en-bw","en-mw","en-mz","en-ci",
            "en-cm","en-gb","en-us","en-ca","en-au","en-ae","en-in","en"]

CHEV = ('<span class="fchev" aria-hidden="true"><svg width="13" height="13" viewBox="0 0 24 24" '
        'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" '
        'stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span>')
ARROW = ('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
         'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'
         '<path d="M5 12h14M13 6l6 6-6 6"/></svg>')
BACK = ('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'
        '<path d="m15 18-6-6 6-6"/></svg>')

E = lambda s: html.escape(str(s), quote=True)


def shell(*, slug, title, desc, h1, eyebrow, sub, chips, sections, faqs,
          cta_title, cta_text, cta_href, cta_label, xlinks, graph_json,
          back_href="/apartments", back_label="All stays", og="og-stays.jpg"):
    url = f"{SITE}/{slug}"
    hl = "\n  ".join(f'<link rel="alternate" hreflang="{m}" href="{url}"/>' for m in HREFLANG)
    chip_html = "".join(f'<div class="chip"><b>{E(a)}</b><span>{E(b)}</span></div>' for a, b in chips)
    sec_html = "".join(f'<section class="sec"><h2>{E(t)}</h2>{b}</section>' for t, b in sections)
    faq_html = "".join(
        f'<details class="fitem"{" open" if i == 0 else ""}><summary>{E(q)}{CHEV}</summary>'
        f'<div class="fa">{a}</div></details>' for i, (q, a) in enumerate(faqs))
    x_html = "".join(f'<a class="xlink" href="{h}">{E(l)} <span aria-hidden="true">→</span></a>'
                     for l, h in xlinks)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{E(title)}</title>
<meta name="description" content="{E(desc)}"/>
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"/>
<link rel="canonical" href="{url}"/>
  {hl}
<link rel="alternate" hreflang="x-default" href="{url}"/>
<meta property="og:site_name" content="Cabana"/>
<meta property="og:title" content="{E(title)}"/>
<meta property="og:description" content="{E(desc)}"/>
<meta property="og:url" content="{url}"/>
<meta property="og:type" content="website"/>
<meta property="og:image" content="{SITE}/{og}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:locale" content="en_KE"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:site" content="@apatmento"/>
<meta name="twitter:title" content="{E(title)}"/>
<meta name="twitter:description" content="{E(desc)}"/>
<meta name="twitter:image" content="{SITE}/{og}"/>
<link rel="manifest" href="/manifest.json"/>
<link rel="icon" href="/favicon.ico" sizes="any"/>
<link rel="apple-touch-icon" href="/cabana-apple-touch-icon.png"/>
<meta name="theme-color" content="#ffffff">
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link rel="dns-prefetch" href="//www.googletagmanager.com"/>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-5NQGLLEE02"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','G-5NQGLLEE02');</script>
<!-- CABANA-SEO-GRAPH --><!-- CABANA-GENERATED -->
<script type="application/ld+json">{graph_json}</script>
<!-- /CABANA-SEO-GRAPH -->
<style>{CSS}</style>
<style>{FOOTER_CSS}</style>
</head>
<body>

<nav class="gnav">
  <a href="{back_href}" class="gnav-back">{BACK}{E(back_label)}</a>
  <a href="/" aria-label="Cabana home"><img class="gnav-logo" src="/cabana-wordmark-color.png" alt="Cabana" fetchpriority="high" decoding="async" onerror="this.style.display='none'"/></a>
  <a href="{cta_href}" class="gnav-cta">{E(cta_label)}</a>
</nav>

<header class="hero">
  <div class="eyebrow">{E(eyebrow)}</div>
  <h1>{E(h1)}</h1>
  <p class="sub">{sub}</p>
</header>

<div class="chips">{chip_html}</div>

<main class="wrap">
  {sec_html}

  <section class="faq" aria-label="Frequently asked questions">
    <h2>{E(h1.rstrip('.'))}: frequently asked</h2>
    {faq_html}
  </section>

  <div class="cta">
    <h2>{E(cta_title)}</h2>
    <p>{cta_text}</p>
    <a class="cta-btn" href="{cta_href}">{E(cta_label)} {ARROW}</a>
  </div>

  <nav class="xlinks" aria-label="Related pages">{x_html}</nav>
</main>

{FOOTER_HTML}
</body>
</html>"""


# ── country hub ──────────────────────────────────────────────────────────
def country_page(c):
    slug = f"{c['slug']}-travel"
    url = f"{SITE}/{slug}"
    name, cap, lo, hi = c["name"], c["capital"], c["band"][0], c["band"][1]
    cities = c["cities"]
    hi_list = c["highlights"]
    langs = ", ".join(c["langs"])

    n_live, ilo, ihi = stock(c["slug"], name, *cities[:1])
    live = n_live > 0

    title = f"{name} Travel Guide: Stays, Safaris & Costs"[:62]
    desc = (f"Plan {name}: where to stay, what a night costs, when to go, how to pay and "
            f"what to see. Book direct with zero commission on Cabana.")[:158]

    sub = ((f"Everything you need to plan {E(name)} — where to stay, what it costs, when to "
            f"go and how to pay. Anything booked through Cabana is paid straight to the "
            f"host or operator, with no commission taken.")
           if live else
           (f"A practical planning guide to {E(name)} — costs, seasons, payment and entry. "
            f"Cabana's booking inventory here is still being built, so this page is the "
            f"guide; if you run a property or tour in {E(name)}, listing is free."))

    # Season label must not truncate mid-word.
    season_short = c["season"].split(";")[0].split("(")[0].strip()

    chips = [(f"US${lo}–{hi}", "typical night, market rate"),
             (season_short, "best window to travel"),
             (c["currency"], "local currency"),
             ((f"{n_live} live", "listings on Cabana") if live
              else ("0%", "commission to list"))]

    top = ", ".join(cities[:5])
    sections = [
        (f"Why {name} is worth the trip",
         f"<p>{name} is built around {c['draw']}. The country runs on {E(langs)}, "
         f"prices in {c['currency']}, and centres on {E(cap)} with "
         f"{'major hubs at ' + E(top) if len(cities) > 1 else ''}. "
         f"Flights route through {c['airport']}.</p>"),
        ("Where to stay and what it costs",
         f"<p>Across {name}, a night runs roughly <b>US${lo}–{hi}</b> at market rates, from "
         f"simple self-catering apartments at the lower end to lodges and beachfront villas "
         f"at the top. Those are guide figures for the country, not Cabana quotes.</p>"
         + (f"<p>Cabana currently has <b>{n_live} live {'listing' if n_live == 1 else 'listings'}</b> "
            f"in {name}, priced by the host. Cabana takes no commission from the host and adds "
            f"no booking fee to the guest, so the number shown is the number paid — typically "
            f"15–25% below the same property on a commission platform.</p>"
            if live else
            f"<p>Cabana does not yet have live listings in {name}. The platform is open to "
            f"hosts here and listing is free with zero commission, so if you have a property, "
            f"vehicle or tour in {name} you can be the first on it. Meanwhile the guidance "
            f"below is genuine and independent of what Cabana has in stock.</p>")
         + f"<p>The main demand centres are {E(top)}.</p>"),
        ("When to go",
         f"<p>The window most travellers want is <b>{E(c['season'])}</b>. Rates and "
         f"availability tighten inside it, so booking direct matters more — you are "
         f"competing for the same rooms without a platform markup on top.</p>"),
        ("What to actually see",
         "<ul>" + "".join(f"<li><b>{E(h)}</b></li>" for h in hi_list) + "</ul>"),
        ("Paying for things on the ground",
         f"<p>{E(c['pay'])} Cabana settles bookings through the rails people actually "
         f"use — M-Pesa, MTN MoMo, Airtel Money and cards — rather than forcing every "
         f"transaction through a card processor priced for another continent.</p>"),
        ("Entry requirements",
         f"<p>{E(c['visa'])} Check the current position with the {name} immigration "
         f"authority before you travel; entry rules change more often than guidebooks do.</p>"),
    ]

    faqs = [
        (f"How much does a night in {name} cost?",
         f"Market rates in {name} run roughly US${lo}–US${hi} per night. Where Cabana has a "
         f"listing, that price is the host's own rate: Cabana charges no commission and adds "
         f"no booking fee, so it is also the final amount you pay."),
        (f"When is the best time to visit {name}?",
         f"{c['season']}. Outside that window you will find lower rates and fewer people, "
         f"which suits some trips better than others."),
        (f"How do I pay for a booking in {name}?",
         f"{c['pay']} Cabana accepts mobile money and cards, and settles the host directly."),
        (f"Do I need a visa for {name}?",
         f"{c['visa']} Requirements vary by nationality, so confirm before booking flights."),
        (f"Does Cabana have listings in {name}?",
         (f"Yes — {n_live} live {'listing' if n_live == 1 else 'listings'} at the moment, and "
          f"growing." if live else
          f"Not yet. Cabana is open to hosts and operators in {name}, and listing is free "
          f"with zero commission. Demand centres are {', '.join(cities)}.")),
        (f"Is Cabana cheaper than Airbnb or Booking.com in {name}?",
         f"On the same property, usually yes. Cabana takes 0% from the host and charges "
         f"the guest no service fee. Airbnb and Booking.com take a cut from one or both "
         f"sides, which is priced into what you see."),
    ]

    peers = [x for x in COUNTRIES if x["region"] == c["region"] and x["slug"] != c["slug"]][:4]
    xlinks = ([(f"{p['name']} travel", f"/{p['slug']}-travel") for p in peers]
              + [("All Africa stays", "/africa-apartments"), ("Safaris & tours", "/tours")])

    g = S.graph(
        S.webpage(url, title, desc, url + "#breadcrumb", f"{SITE}/og-stays.jpg"),
        S.breadcrumbs(url, [("Home", SITE + "/"), ("Africa", f"{SITE}/africa-apartments"),
                            (c["region"], None), (name, None)]),
        S.tourist_destination(url, name, name, c["lat"], c["lng"], hi_list,
                              f"Travel guide and direct booking for {name}."),
        S.lodging(url, name, name, c["lat"], c["lng"],
                  ilo if live else lo, ihi if live else hi, "USD",
                  amenities=["Wi-Fi", "Kitchen", "Secure parking", "Backup power"],
                  offer_count=n_live or None),
        S.tourist_trip(url, f"{name} trips with Cabana",
                       f"Safaris, tours and guided trips across {name}, booked direct.",
                       hi_list[:4], lo, hi * 4),
        S.itemlist(url, f"Cities in {name}",
                   [(ct, f"{SITE}/apartments?q={ct.replace(' ', '+')}") for ct in cities]),
        S.faq(url, faqs),
    )
    import json as _j
    return slug, shell(
        slug=slug, title=title, desc=desc,
        h1=f"{name}.", eyebrow=f"{c['region']} · {name}", sub=sub, chips=chips,
        sections=sections, faqs=faqs,
        cta_title=(f"Browse {name} on Cabana" if live
                   else f"List your {name} property or tour"),
        cta_text=(f"Stays, safaris and transport in {name}. Zero commission on every booking."
                  if live else
                  f"Cabana has no listings in {name} yet. Listing is free, commission is zero, "
                  f"and you keep 100% of what you charge."),
        cta_href=(f"/apartments?q={name.replace(' ', '+')}" if live else "/become-partner"),
        cta_label=(f"Browse {name}" if live else "List for free"), xlinks=xlinks,
        graph_json=_j.dumps(g, ensure_ascii=False, separators=(",", ":")))


def main():
    written = []
    for c in COUNTRIES:
        slug, doc = country_page(c)
        path = os.path.join(ROOT, slug + ".html")
        if not DRY:
            open(path, "w", encoding="utf-8").write(doc)
        written.append(slug)
    print(("DRY — " if DRY else "") + f"generated {len(written)} country hubs")
    wc = len(re.sub(r"<[^>]+>", " ", country_page(COUNTRIES[0])[1]).split())
    print(f"sample page word count (incl. chrome): ~{wc}")


if __name__ == "__main__":
    main()
