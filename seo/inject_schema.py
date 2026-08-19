# -*- coding: utf-8 -*-
"""
Cabana — rich-result schema injection.

Classifies every public page, then writes a single coherent @graph into it.
The graph always carries Organization + Brand + WebSite so Google resolves
one entity for "Cabana" across the whole site — the prerequisite for a
Knowledge Panel and for winning the brand SERP.

Page-type specific nodes are what unlock the actual rich results:
  city stay page  -> LodgingBusiness + AggregateOffer + AggregateRating
                     (price range + stars in the SERP, the Booking.com feature)
  safari / tour   -> TouristTrip + AggregateOffer
  destination     -> TouristDestination + TouristAttraction
  guide / article -> Article + speakable
  comparison      -> Article + FAQPage (AI/LLM extraction target)
  service hub     -> Service + Product + AggregateOffer
  partner pages   -> Offer + HowTo (supply-side acquisition)

FAQ nodes are rebuilt FROM THE VISIBLE <details> MARKUP, so structured data
can never drift out of sync with on-page content — the most common cause of
FAQ rich-result penalties.

Usage: python3 seo/inject_schema.py [--dry]
"""
import os, re, sys, glob, json, html

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import schema as S
from data.africa import COUNTRIES, CITIES, CATEGORIES
from data.places import PLACES

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ── Ratings: REAL DATA ONLY ──────────────────────────────────────────────
# Google requires aggregateRating to reflect genuine, on-page reviews.
# Fabricated ratings are the fastest route to a manual action, so a slug
# absent from ratings.json simply gets no rating node. Populate the file with
# seo/build_ratings.py (reads Supabase) to switch star rich-results on.
try:
    _R = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                     "data", "ratings.json")))
    RATINGS = {k: v for k, v in _R.items() if not k.startswith("_")}
except Exception:
    RATINGS = {}


def rating_for(slug):
    r = RATINGS.get(slug)
    return (r["ratingValue"], r["reviewCount"]) if r else (None, None)


# ── Inventory: REAL DATA ONLY ────────────────────────────────────────────
# AggregateOffer asserts that N bookable offers exist. Claiming offers for a
# place with no listings is fabricated markup. Built by seo/build_inventory.py
# from Supabase; a place absent here simply gets no offer node.
try:
    _I = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                     "data", "inventory.json")))
    INVENTORY = {k: v for k, v in _I.items() if not k.startswith("_")}
except Exception:
    INVENTORY = {}


def inventory_for(*keys, service="stays"):
    """Return (count, lowUSD, highUSD) for the first key with real stock."""
    for k in keys:
        if not k:
            continue
        rec = INVENTORY.get(str(k).strip().lower().replace(" ", "-"), {}).get(service)
        if rec and rec.get("count"):
            return rec["count"], rec["lowUSD"], rec["highUSD"]
    return (None, None, None)
DRY = "--dry" in sys.argv
SITE = S.SITE

CITY_BY_NAME = {c[0].lower(): c for c in CITIES}
COUNTRY_BY_SLUG = {c["slug"]: c for c in COUNTRIES}
COUNTRY_BY_NAME = {c["name"].lower(): c for c in COUNTRIES}

NOINDEX = {
    "auth.html", "dashboard.html", "booking-confirm.html", "my-bookings.html",
    "admin.html", "admin-photos.html", "profile.html", "add-listing.html",
    "agent-dashboard.html", "driver.html", "offline.html",
    "partner-listings.html", "partner-bookings.html", "partner-calendar.html",
    "partner-agents.html", "partner-analytics.html", "partner-earnings.html",
    "partner-reviews.html", "partner-settings.html", "partner-cabana.html",
}

SERVICE_HUBS = {
    "apartments.html": ("Stays & Apartments", "LodgingBusiness", (18, 400),
                        "Short-stay apartments, serviced flats, villas and guesthouses across Africa."),
    "tours.html": ("Safaris & Tours", "TouristTrip", (25, 900),
                   "Game drives, guided safaris, day trips and cultural tours booked direct with local operators."),
    "flights.html": ("Flights", "Flight", (45, 1200),
                     "Search and compare flights into and across Africa."),
    "events.html": ("Events & Tickets", "Event", (5, 300),
                    "Concerts, festivals, sport and cultural events with tickets at the organiser's price."),
    "carhire.html": ("Car Hire", "AutoRental", (20, 250),
                     "Self-drive and chauffeur-driven car hire from local operators."),
    "rides.html": ("Rides & Airport Transfers", "TaxiService", (3, 90),
                   "Airport transfers, city rides and intercity transport booked direct with vetted drivers."),
    "food.html": ("Food Delivery", "FoodEstablishment", (2, 40),
                  "Restaurant delivery and takeaway with no platform markup on the menu price."),
    "shopping.html": ("Shopping", "OnlineStore", (1, 500),
                      "Buy direct from African sellers and makers with zero seller commission."),
    "roommates.html": ("Roommates & Flatshares", "Service", (60, 600),
                       "Verified roommate and flatshare matching in African cities."),
    "rewards.html": ("Cabana Rewards", "Service", (0, 0),
                     "Earn and redeem rewards on every Cabana booking."),
}

# Must match the `service` values written by build_inventory.py. A hub may
# describe a service without stock, but it must not claim an in-stock offer.
HUB_SERVICES = {
    "apartments.html": "stays",
    "tours.html": "tours",
    "flights.html": "flights",
    "events.html": "events",
    "carhire.html": "carhire",
    "rides.html": "rides",
    "food.html": "food",
    "shopping.html": "shopping",
    "roommates.html": "roommates",
    "rewards.html": "rewards",
}

AMENITIES = ["Wi-Fi", "Backup power", "Secure parking", "Kitchen", "Air conditioning",
             "Washing machine", "24/7 security", "Workspace"]

stats = {"injected": 0, "faq": 0, "lodging": 0, "trip": 0, "article": 0,
         "skipped": 0, "generated": 0}


# ── helpers ──────────────────────────────────────────────────────────────
def canonical_url(fname):
    return SITE + "/" if fname == "index.html" else f"{SITE}/{fname[:-5]}"


def text_of(frag):
    frag = re.sub(r"<svg\b.*?</svg>", " ", frag, flags=re.S | re.I)
    frag = re.sub(r"<[^>]+>", " ", frag)
    return re.sub(r"\s+", " ", html.unescape(frag)).strip()


def extract_faq(src):
    """Pull Q/A straight from the visible <details> blocks."""
    out = []
    for m in re.finditer(r"<details\b([^>]*)>(.*?)</details>", src, re.S | re.I):
        attrs, block = m.group(1), m.group(2)
        qm = re.search(r"<summary\b[^>]*>(.*?)</summary>", block, re.S | re.I)
        if not qm:
            continue
        q = text_of(qm.group(1))
        # Many pages use <details> for filters and controls. Only visible FAQ
        # components, or a summary that is plainly a question, become FAQPage.
        if "faq" not in attrs.lower() and not q.endswith("?"):
            continue
        a = text_of(block[qm.end():])
        if q and a and len(a) > 15:
            out.append((q, a))
    return out[:12]


def meta(src, name=None, prop=None):
    pat = (rf'<meta\s+name="{name}"\s+content="(.*?)"' if name
           else rf'<meta\s+property="{prop}"\s+content="(.*?)"')
    m = re.search(pat, src, re.S)
    return html.unescape(m.group(1)) if m else ""


def title_of(src):
    m = re.search(r"<title>(.*?)</title>", src, re.S)
    return html.unescape(m.group(1)).strip() if m else "Cabana"


def h1_of(src):
    m = re.search(r"<h1\b[^>]*>(.*?)</h1>", src, re.S | re.I)
    return text_of(m.group(1)) if m else ""


def og_image(src):
    v = meta(src, prop="og:image")
    return v or f"{SITE}/og-home.jpg"


# ── classification ───────────────────────────────────────────────────────
def classify(fname, src):
    stem = fname[:-5]
    if fname in NOINDEX:
        return "private", {}
    if fname == "index.html":
        return "home", {}
    if fname in SERVICE_HUBS:
        return "hub", {"cfg": SERVICE_HUBS[fname]}
    if stem.endswith("-apartments"):
        place = stem[:-11].replace("-", " ")
        return "stay", {"place": place}
    if stem.endswith(("-stays", "-cottages")):
        place = re.sub(r"-(stays|cottages)$", "", stem).replace("-", " ")
        return "stay", {"place": place}
    if "-vs-" in stem:
        return "comparison", {}
    if stem.endswith(("-guide", "-guides")) or "guide" in stem or stem in {
            "best-beaches-kenya", "cheapest-places-africa", "best-apartments-lagos",
            "where-to-stay-mombasa", "digital-nomad-africa-guide"}:
        return "guide", {}
    if stem in {"become-partner", "become-agent", "become-driver", "how-to-list-property-africa"}:
        return "supply", {}
    if stem in {"terms", "privacy", "cookies", "press", "cabana", "guides",
                "m-pesa-travel-booking", "zero-commission-vacation-rentals-africa",
                "airbnb-alternatives-africa", "cabana-match-guide"}:
        return "editorial", {}
    return "editorial", {}


def resolve_place(place):
    """Map a page's place slug onto the dataset (place graph, city, then country)."""
    p = place.lower().strip()
    if p in PLACES:
        n, parent, ctry, lat, lng, lo, hi, kind = PLACES[p]
        ref = COUNTRY_BY_NAME.get(ctry.lower(), {})
        return dict(kind=kind.lower(), name=n, country=ctry, lat=lat, lng=lng,
                    low=lo, high=hi, parent=parent,
                    attractions=ref.get("highlights", [])[:4] or
                    [f"{n} city centre", f"{n} restaurants", f"{n} nightlife"])
    if p in CITY_BY_NAME:
        c = CITY_BY_NAME[p]
        ctry = COUNTRY_BY_SLUG.get(c[1], {})
        return dict(kind="city", name=c[0], country=ctry.get("name", "Kenya"),
                    lat=c[2], lng=c[3], low=c[4][0], high=c[4][1],
                    attractions=ctry.get("highlights", [])[:4])
    if p in COUNTRY_BY_NAME:
        c = COUNTRY_BY_NAME[p]
        return dict(kind="country", name=c["name"], country=c["name"],
                    lat=c["lat"], lng=c["lng"], low=c["band"][0], high=c["band"][1],
                    attractions=c["highlights"][:4])
    return None


# ── graph builders ───────────────────────────────────────────────────────
def build_graph(kind, info, fname, src):
    url = canonical_url(fname)
    t, d = title_of(src), meta(src, name="description")
    h1 = h1_of(src) or t
    img = og_image(src)
    published = (meta(src, prop="article:published_time") or "2026-02-01")[:10]
    modified = (meta(src, prop="article:modified_time") or "2026-08-19")[:10]
    faqs = extract_faq(src)
    nodes = []

    crumbs = [("Home", SITE + "/")]

    if kind == "home":
        nodes.append(S.webpage(url, t, d, url + "#breadcrumb", img))
        nodes.append(S.breadcrumbs(url, [("Home", None)]))
        nodes.append(S.itemlist(url, "Cabana services",
                                [(c["label"], SITE + c["hub"]) for c in CATEGORIES]))
        rv, rc = rating_for("index")
        oc, olo, ohi = inventory_for("kenya")
        nodes.append(S.product_service(
            url, "Cabana — Africa's zero-commission travel platform", d,
            olo or 3, ohi or 900, category="Travel booking",
            rating=rv, count=rc, offer_count=oc))

    elif kind == "hub":
        label, stype, (lo, hi), blurb = info["cfg"]
        crumbs += [(label, None)]
        nodes.append(S.webpage(url, t, d, url + "#breadcrumb", img, page_type="CollectionPage"))
        nodes.append(S.breadcrumbs(url, crumbs))
        service = HUB_SERVICES[fname]
        oc, olo, ohi = inventory_for("kenya", "nairobi", service=service)
        if lo or hi:
            rv, rc = rating_for(fname[:-5])
            nodes.append(S.product_service(url, f"Cabana {label}", blurb,
                                           olo or lo, ohi or hi, category=label,
                                           rating=rv, count=rc, offer_count=oc))
        service_node = {
            "@type": "Service", "@id": url + "#service", "name": f"Cabana {label}",
            "description": blurb, "serviceType": label, "provider": {"@id": S.ORG_ID},
            "areaServed": {"@type": "Continent", "name": "Africa"},
            "audience": {"@type": "Audience", "audienceType": "Travellers to Africa"},
        }
        if oc:
            service_node["offers"] = {
                "@type": "AggregateOffer", "priceCurrency": "USD",
                "lowPrice": str(olo), "highPrice": str(ohi),
                "offerCount": str(oc),
                "availability": "https://schema.org/InStock",
                "seller": {"@id": S.ORG_ID},
            }
        nodes.append(service_node)
        # Continental coverage list — feeds sitelink/carousel eligibility.
        nodes.append(S.itemlist(url, f"{label} by country",
                                [(c["name"], f"{SITE}/{c['slug']}-travel")
                                 for c in COUNTRIES if c["tier"] <= 2][:24]))

    elif kind == "stay":
        p = resolve_place(info["place"])
        name = info["place"].title()
        if p:
            crumbs += [("Stays", f"{SITE}/apartments"), (p["name"], None)]
            nodes.append(S.webpage(url, t, d, url + "#breadcrumb", img))
            nodes.append(S.breadcrumbs(url, crumbs))
            rv, rc = rating_for(fname[:-5])
            oc, olo, ohi = inventory_for(p["name"], p.get("parent"), p["country"])
            nodes.append(S.lodging(url, p["name"], p["country"], p["lat"], p["lng"],
                                   olo if oc else p["low"], ohi if oc else p["high"],
                                   "USD", rating=rv, count=rc,
                                   amenities=AMENITIES, image=img, offer_count=oc))
            nodes.append(S.tourist_destination(
                url, p["name"], p["country"], p["lat"], p["lng"], p["attractions"],
                d or f"Where to stay in {p['name']}, {p['country']}."))
            stats["lodging"] += 1
        else:
            crumbs += [("Stays", f"{SITE}/apartments"), (name, None)]
            nodes.append(S.webpage(url, t, d, url + "#breadcrumb", img))
            nodes.append(S.breadcrumbs(url, crumbs))
            rv, rc = rating_for(fname[:-5])
            oc, olo, ohi = inventory_for(name)
            nodes.append(S.product_service(url, f"Short-stay apartments in {name}",
                                           d, olo or 20, ohi or 200,
                                           category="Accommodation",
                                           rating=rv, count=rc, offer_count=oc))

    elif kind in ("guide", "comparison", "editorial", "supply"):
        crumbs += [("Guides", f"{SITE}/guides"), (h1[:60], None)]
        nodes.append(S.webpage(url, t, d, url + "#breadcrumb", img,
                               date_modified=modified))
        nodes.append(S.breadcrumbs(url, crumbs))
        nodes.append({
            "@type": "Article", "@id": url + "#article",
            "headline": t[:110], "description": d, "url": url,
            "image": [img], "author": {"@id": S.ORG_ID},
            "publisher": {"@id": S.ORG_ID}, "isPartOf": {"@id": S.SITE_ID},
            "mainEntityOfPage": {"@id": url + "#webpage"},
            "datePublished": published, "dateModified": modified,
            "inLanguage": "en", "articleSection": "Africa travel",
            "speakable": {"@type": "SpeakableSpecification",
                          "cssSelector": [".hero h1", ".hero .sub", ".sec p"]},
        })
        stats["article"] += 1
        if kind == "supply":
            nodes.append({
                "@type": "Offer", "@id": url + "#offer",
                "name": "List on Cabana — 0% commission",
                "description": ("List a property, vehicle, tour or service on Cabana. "
                                "Cabana takes 0% commission. Hosts and operators keep 100% "
                                "of the price they set."),
                "price": "0", "priceCurrency": "USD",
                "eligibleCustomerType": "Business",
                "availability": "https://schema.org/InStock",
                "seller": {"@id": S.ORG_ID}, "url": url,
            })
            nodes.append(S.howto(
                url, "How to list your property or service on Cabana",
                "Get a listing live on Cabana and start taking direct bookings.",
                [("Create your account", "Sign up free at cabana.africa with a phone number or email."),
                 ("Add your listing", "Enter the details, photos and the exact price you want to charge."),
                 ("Get verified", "Cabana verifies the listing so guests can book with confidence."),
                 ("Go live and get paid", "Take bookings and receive 100% of your price by M-Pesa, mobile money or bank transfer.")]))

    if faqs:
        nodes.append(S.faq(url, faqs))
        stats["faq"] += 1

    return S.graph(*nodes)


# ── injection ────────────────────────────────────────────────────────────
MARK_OPEN = "<!-- CABANA-SEO-GRAPH -->"
MARK_CLOSE = "<!-- /CABANA-SEO-GRAPH -->"


def inject(src, g):
    # Older builds wrote the generated entity graph without ownership markers,
    # and car hire kept a separate FAQ block that duplicated the graph. Remove
    # only those known legacy blocks before writing one source of truth.
    def _drop_legacy(m):
        raw = m.group(1)
        compact = re.sub(r"\s+", "", raw)
        if '"@graph"' in compact and '"https://cabana.africa/#organization"' in compact:
            return ""
        if '"@id":"https://cabana.africa/carhire#faq2"' in compact:
            return ""
        try:
            if json.loads(raw).get("@type") == "Article":
                return ""
        except (ValueError, AttributeError):
            pass
        return m.group(0)

    src = re.sub(r'<script\s+type="application/ld\+json"[^>]*>(.*?)</script>',
                 _drop_legacy, src, flags=re.S | re.I)
    payload = (MARK_OPEN + '\n<script type="application/ld+json">'
               + json.dumps(g, ensure_ascii=False, separators=(",", ":"))
               + "</script>\n" + MARK_CLOSE)
    if MARK_OPEN in src:
        return re.sub(re.escape(MARK_OPEN) + r".*?" + re.escape(MARK_CLOSE),
                      lambda _: payload, src, flags=re.S)
    return src.replace("</head>", payload + "\n</head>", 1)


def main():
    for path in sorted(glob.glob(os.path.join(ROOT, "*.html"))):
        fname = os.path.basename(path)
        src = open(path, encoding="utf-8").read()
        # Generator-authored pages already carry a purpose-built graph that is
        # richer than anything classify() can infer. Never overwrite it.
        if "<!-- CABANA-GENERATED -->" in src:
            stats["generated"] += 1
            continue
        kind, info = classify(fname, src)
        if kind == "private":
            stats["skipped"] += 1
            continue
        g = build_graph(kind, info, fname, src)
        out = inject(src, g)
        if out != src:
            stats["injected"] += 1
            if not DRY:
                open(path, "w", encoding="utf-8").write(out)
    print(("DRY — " if DRY else "") + "Cabana schema injection")
    print("-" * 44)
    for k, v in stats.items():
        print(f"  {k:10} {v}")


if __name__ == "__main__":
    main()
