# -*- coding: utf-8 -*-
"""
Cabana — city × category generator.

Targets the highest commercial-intent query shape in travel search:
"<city> <service>" — safaris, car hire, airport transfers. These are the
queries where a booking decision is already made and only the provider is
undecided, which is where zero commission is most persuasive.

Only generates a page where the dataset actually supports one. A city with no
named attractions gets no safari page rather than a thin one.

Usage: python3 seo/generate_city.py [--dry]
"""
import os, sys, json, html

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import schema as S
from data.africa import COUNTRIES, CITIES
from generate import shell, stock

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DRY = "--dry" in sys.argv
SITE = S.SITE
C_BY_SLUG = {c["slug"]: c for c in COUNTRIES}
E = lambda s: html.escape(str(s), quote=True)

VERTICALS = {
 "safaris": dict(
    label="Safaris & Tours", og="og-tours.jpg", hub="/tours", back="All tours",
    title=lambda c: f"{c} Safaris & Tours: Book Direct | Cabana",
    band=lambda lo, hi: (max(25, lo), hi * 6),
    schema="trip"),
 "car-hire": dict(
    label="Car Hire", og="og-carhire.jpg", hub="/carhire", back="All car hire",
    title=lambda c: f"Car Hire {c}: Self-Drive & Chauffeur | Cabana",
    band=lambda lo, hi: (max(18, int(lo * 0.8)), max(90, int(hi * 1.2))),
    schema="rental"),
 "airport-transfers": dict(
    label="Airport Transfers", og="og-rides.jpg", hub="/rides", back="All rides",
    title=lambda c: f"{c} Airport Transfers & Rides | Cabana",
    band=lambda lo, hi: (max(4, int(lo * 0.2)), max(45, int(hi * 0.5))),
    schema="taxi"),
}


def build(city, vert):
    name, cslug, lat, lng, (lo, hi), positioning, hoods = city
    ctry = C_BY_SLUG[cslug]
    v = VERTICALS[vert]
    svc = {"safaris": "tours", "car-hire": "carhire",
           "airport-transfers": "rides"}[vert]
    n_live, _, _ = stock(name, cslug, service=svc)
    live = n_live > 0
    slug = f"{name.lower().replace(' ', '-').replace('’', '')}-{vert}"
    url = f"{SITE}/{slug}"
    plo, phi = v["band"](lo, hi)
    title = v["title"](name)[:62]
    hl = ctry["highlights"]

    if vert == "safaris":
        desc = (f"Book {name} safaris, game drives and guided tours direct with licensed "
                f"{ctry['name']} operators. Zero commission — operators keep 100%.")[:158]
        sub = (f"Game drives, day trips and guided tours out of {E(name)}, booked direct with "
               f"the operator running them. Cabana takes no commission, so the price the "
               f"operator sets is the price you pay.")
        chips = [(f"US${plo}–{phi}", "typical trip, per person"),
                 (ctry["season"].split(";")[0].strip()[:22], "best season"),
                 (f"{len(hl)}+", "named destinations"), ("0%", "operator commission")]
        sections = [
            (f"What you can reach from {name}",
             f"<p>{E(name)} is {E(positioning)}. From here the practical targets are "
             + ", ".join(f"<b>{E(h)}</b>" for h in hl[:4]) + f". Operators based in {E(name)} "
             f"run these as day trips and multi-day circuits depending on distance.</p>"),
            ("What a trip costs, and why the number differs here",
             f"<p>Expect <b>US${plo}–{phi} per person</b> depending on length, group size and "
             f"whether park fees are bundled. On Cabana that figure is the operator's own "
             f"price. Aggregators typically take 15–25% from the operator, and that margin "
             f"is priced into the rate you are quoted elsewhere — the same guide, the same "
             f"vehicle, a higher number.</p>"),
            ("Booking direct with the operator",
             (f"<p>Operators listed on Cabana are contactable before you pay. You can ask "
              f"about vehicle type, group size, pick-up point and what is included, and get "
              f"an answer from the person who will actually run the trip rather than a call "
              f"centre. Payment settles to them directly by "
              f"{E(ctry['pay'].split(';')[0].split('.')[0].lower())}.</p>")
             if live else
             (f"<p>Cabana has no {E(name)} tour operators listed yet. The model is direct "
              f"booking with zero commission — an operator keeps 100% of what they charge — "
              f"so if you run trips from {E(name)}, listing is free and takes a few minutes. "
              f"The costs and seasons above are independent guidance either way.</p>")),
            ("When to go",
             f"<p>{E(ctry['season'])}. Wildlife density, road condition and price all move "
             f"with that window, so it is worth building the trip around it where you can.</p>"),
        ]
        faqs = [
            (f"How much is a safari from {name}?",
             f"Most trips from {name} run US${plo}–{phi} per person at market rates, depending "
             f"on duration, group size and whether park fees are included. Where Cabana lists "
             f"an operator, no commission is added, so their price is the final price."),
            (f"Which parks can I reach from {name}?",
             "The practical destinations are " + ", ".join(hl[:4]) + "."),
            ("Do I book with Cabana or with the operator?",
             "With the operator. Cabana connects you to them, verifies the listing, and "
             "handles payment — but the trip, the price and the terms are theirs."),
            (f"Does Cabana list safari operators in {name}?",
             ("Yes." if live else
              f"Not yet. Cabana is open to {name} operators and listing is free with zero "
              f"commission. The pricing and season guidance on this page is independent of "
              f"what is currently listed.")),
            (f"When is the best time to go on safari from {name}?",
             ctry["season"] + "."),
            ("Can I pay with mobile money?",
             f"Yes. {ctry['pay']}"),
        ]
        cta = (f"Browse {name} safaris", f"Game drives and guided tours from {E(name)}, "
               f"direct with the operator.", f"/tours?q={name.replace(' ', '+')}")

    elif vert == "car-hire":
        desc = (f"Hire a car in {name}, {ctry['name']} — self-drive or with a driver, direct "
                f"from local operators. Zero commission, no platform markup.")[:158]
        sub = (f"Self-drive and chauffeur-driven vehicles in {E(name)}, rented direct from the "
               f"operators who own them. No platform markup sitting on top of the daily rate.")
        chips = [(f"US${plo}–{phi}", "per day, typical"),
                 (E(ctry["currency"]), "local currency"),
                 ("Self-drive", "or with a driver"), ("0%", "operator commission")]
        sections = [
            (f"Driving in and around {name}",
             f"<p>{E(name)} is {E(positioning)}. A hired vehicle makes sense here when your "
             f"itinerary leaves the centre — {', '.join(E(h) for h in hoods[:4])} and the "
             f"routes out of the city are where ride-hailing gets expensive or unreliable.</p>"),
            ("Rates and what is included",
             f"<p>Daily rates in {E(name)} typically run <b>US${plo}–{phi}</b>, with "
             f"chauffeur-driven options at the upper end. Confirm mileage caps, insurance "
             f"excess and fuel policy with the operator before you commit.</p>"
             + (f"<p>Cabana takes no commission from the operator, so there is no hidden "
                f"margin to recover in the day rate or in the extras.</p>" if live else
                f"<p>Cabana has no {E(name)} car hire operators listed yet. Listing is free "
                f"and commission is zero, so operators keep 100% of the day rate.</p>")),
            ("Self-drive or a driver",
             f"<p>For {E(ctry['name'])}, a driver is often the better value once you price in "
             f"local road knowledge, parking and the time cost of navigating unfamiliar "
             f"traffic. Self-drive wins on longer, rural itineraries where you want the "
             f"vehicle on your own schedule.</p>"),
            ("Paying",
             f"<p>{E(ctry['pay'])} Deposits and balances settle directly to the operator.</p>"),
        ]
        faqs = [
            (f"How much does car hire cost in {name}?",
             f"Typically US${plo}–{phi} per day. Chauffeur-driven sits at the top of that "
             f"range. Cabana adds no commission, so the operator's rate is what you pay."),
            (f"Can I get a car with a driver in {name}?",
             "Yes. Most operators offer both self-drive and chauffeur-driven, and a driver "
             "is often better value once local road knowledge is priced in."),
            ("What should I check before booking?",
             "Mileage cap, insurance excess, fuel policy, and whether cross-border travel is "
             "permitted. Ask the operator directly — they are contactable before you pay."),
            ("How do I pay?", ctry["pay"]),
        ]
        cta = (f"Browse car hire in {name}", f"Self-drive and chauffeur-driven vehicles in "
               f"{E(name)}, direct from the operator.", f"/carhire?q={name.replace(' ', '+')}")

    else:  # airport-transfers
        desc = (f"Book {name} airport transfers and city rides direct with vetted drivers. "
                f"Fixed prices, zero commission, no surge pricing.")[:158]
        sub = (f"Airport pick-ups, city rides and intercity runs in {E(name)}, booked ahead "
               f"with a named driver at a price agreed before you travel.")
        chips = [(f"US${plo}–{phi}", "typical transfer"), ("Fixed", "price, agreed up front"),
                 ("Vetted", "named drivers"), ("0%", "driver commission")]
        sections = [
            (f"Getting into {name} from the airport",
             f"<p>{E(name)} is {E(positioning)}. The arrivals run is the point in a trip where "
             f"unfamiliarity costs the most, so a driver booked in advance at an agreed price "
             f"removes the negotiation entirely.</p>"),
            ("What a transfer costs",
             f"<p>Airport transfers in {E(name)} typically run <b>US${plo}–{phi}</b> depending "
             f"on distance and vehicle. Where a driver is booked through Cabana the figure is "
             f"fixed at booking, there is no surge multiplier, and Cabana takes nothing from "
             f"the driver, so the fare stays with the person driving.</p>"
             + ("" if live else
                f"<p>Cabana has no {E(name)} drivers listed yet. Driver sign-up is free and "
                f"commission is zero.</p>")),
            ("Where drivers will take you",
             f"<p>City coverage includes {', '.join(E(h) for h in hoods)}, plus intercity "
             f"routes on request.</p>"),
            ("Paying", f"<p>{E(ctry['pay'])}</p>"),
        ]
        faqs = [
            (f"How much is an airport transfer in {name}?",
             f"Typically US${plo}–{phi} depending on distance and vehicle size. The price is "
             f"fixed when you book, with no surge applied later."),
            ("Is the price fixed before I travel?",
             "Yes. You agree the fare at booking and it does not change en route."),
            ("Can I book a return leg?",
             "Yes — book both directions with the same driver, which most travellers prefer "
             "for the departure run."),
            ("How do I pay?", ctry["pay"]),
        ]
        cta = (f"Book a ride in {name}", f"Airport transfers and city rides in {E(name)}, "
               f"at a price agreed before you travel.", f"/rides?q={name.replace(' ', '+')}")

    # ── schema ──
    nodes = [
        S.webpage(url, title, desc, url + "#breadcrumb", f"{SITE}/{v['og']}"),
        S.breadcrumbs(url, [("Home", SITE + "/"), (v["label"], SITE + v["hub"]),
                            (ctry["name"], f"{SITE}/{cslug}-travel"), (name, None)]),
        S.faq(url, faqs),
    ]
    if v["schema"] == "trip":
        nodes.insert(2, S.tourist_trip(url, f"Safaris and tours from {name}",
                                       desc, hl[:4], plo, phi,
                                       offer_count=n_live or None))
        nodes.insert(3, S.tourist_destination(url, name, ctry["name"], lat, lng, hl[:4],
                                              positioning))
    else:
        stype = "AutoRental" if v["schema"] == "rental" else "TaxiService"
        nodes.insert(2, {
            "@type": stype, "@id": url + "#provider",
            "name": f"Cabana {v['label']} — {name}", "description": desc, "url": url,
            "parentOrganization": {"@id": S.ORG_ID}, "brand": {"@id": S.BRAND_ID},
            "areaServed": {"@type": "City", "name": name},
            "address": {"@type": "PostalAddress", "addressLocality": name,
                        "addressCountry": ctry["name"]},
            "geo": {"@type": "GeoCoordinates", "latitude": lat, "longitude": lng},
            "paymentAccepted": "M-Pesa, MTN MoMo, Airtel Money, Visa, Mastercard",
            # Offer claim only where real operators are listed.
            **({"priceRange": f"US${plo}\u2013{phi}",
                "makesOffer": {"@type": "AggregateOffer", "priceCurrency": "USD",
                               "lowPrice": str(plo), "highPrice": str(phi),
                               "offerCount": str(n_live),
                               "availability": "https://schema.org/InStock",
                               "seller": {"@id": S.ORG_ID}}} if live else {}),
        })

    others = [k for k in VERTICALS if k != vert]
    xlinks = ([(f"{name} {VERTICALS[o]['label'].lower()}",
                f"/{name.lower().replace(' ', '-')}-{o}") for o in others]
              + [(f"{ctry['name']} travel guide", f"/{cslug}-travel"),
                 (f"Stays in {name}", f"/apartments?q={name.replace(' ', '+')}")])

    doc = shell(slug=slug, title=title, desc=desc, h1=f"{name}.",
                eyebrow=f"{ctry['name']} · {v['label']}", sub=sub, chips=chips,
                sections=sections, faqs=faqs,
                cta_title=cta[0], cta_text=cta[1], cta_href=cta[2],
                cta_label=cta[0], xlinks=xlinks,
                graph_json=json.dumps(S.graph(*nodes), ensure_ascii=False,
                                      separators=(",", ":")),
                back_href=v["hub"], back_label=v["back"], og=v["og"])
    return slug, doc


def main():
    n = 0
    for city in CITIES:
        ctry = C_BY_SLUG[city[1]]
        for vert in VERTICALS:
            # Only build a safari page where the country has named destinations.
            if vert == "safaris" and len(ctry["highlights"]) < 3:
                continue
            slug, doc = build(city, vert)
            if not DRY:
                open(os.path.join(ROOT, slug + ".html"), "w", encoding="utf-8").write(doc)
            n += 1
    print(("DRY — " if DRY else "") + f"generated {n} city × category pages")


if __name__ == "__main__":
    main()
