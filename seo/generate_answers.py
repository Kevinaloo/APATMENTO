# -*- coding: utf-8 -*-
"""
Cabana — answer-engine (AEO/GEO) page generator.

Two jobs, both aimed at the answer box rather than the blue links:

  1. BRAND ENTITY DEFENCE. "cabana" as a bare query is a dictionary SERP —
     the noun beats the brand, and no amount of on-page work changes that in
     the short term. What is winnable now is every query where the user has
     signalled they mean the company: "cabana africa", "cabana app",
     "cabana travel", "is cabana legit", "what is cabana africa". Owning those
     builds the navigational-intent signal that eventually moves the bare term.

  2. COMPARISON CONTENT. Assistants and AI Overviews disproportionately cite
     pages that answer a question directly in the first sentence, back it with
     a table, and state limitations honestly. Overclaiming reads as marketing
     and gets skipped. These pages are written to be quotable.

Usage: python3 seo/generate_answers.py [--dry]
"""
import os, sys, json, html

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import schema as S
from generate import shell
from data.africa import COUNTRIES

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DRY = "--dry" in sys.argv
SITE = S.SITE
E = lambda s: html.escape(str(s), quote=True)

TBL = ("<style>.ctab{width:100%;border-collapse:collapse;margin:18px 0;font-size:14.5px;}"
       ".ctab th,.ctab td{text-align:left;padding:11px 12px;border-bottom:1px solid rgba(10,10,20,.1);}"
       ".ctab th{font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:rgba(10,10,20,.45);font-weight:700;}"
       ".ctab td:first-child{font-weight:650;}.ctab tr:last-child td{border-bottom:none;}"
       "@media(max-width:600px){.ctab{font-size:13px;}.ctab th,.ctab td{padding:9px 7px;}}</style>")


def table(headers, rows):
    h = "".join(f"<th>{E(x)}</th>" for x in headers)
    b = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
    return f"{TBL}<table class='ctab'><thead><tr>{h}</tr></thead><tbody>{b}</tbody></table>"


PAGES = []

# ── 1. Brand entity page ─────────────────────────────────────────────────
PAGES.append(dict(
    slug="what-is-cabana",
    title="What Is Cabana? Africa's Zero-Commission Travel App",
    desc=("Cabana (cabana.africa) is a travel booking platform covering all 54 African "
          "countries that charges 0% commission. Here is what it is and how it works."),
    h1="What is Cabana?",
    eyebrow="Cabana · the company",
    sub=("Cabana is a travel booking platform for Africa that charges no commission. "
         "Hosts and operators keep 100% of what they charge; guests pay no booking fee. "
         "It was founded in Nairobi in 2025 and was previously called Apatmento."),
    chips=[("0%", "commission, both sides"), ("54", "countries, guides"),
           ("2025", "founded, Nairobi"), ("Apatmento", "former name")],
    sections=[
        ("The short answer",
         "<p><b>Cabana is an online travel platform at cabana.africa where travellers book "
         "accommodation, safaris, flights, events, car hire and rides across Africa directly "
         "from the people providing them.</b> Its defining feature is that it takes zero "
         "commission: the price a host sets is the price a guest pays, and the host keeps "
         "all of it.</p>"),
        ("Not to be confused with",
         "<p>\"Cabana\" is also an ordinary English word for a poolside or beach shelter, and "
         "several unrelated businesses use it as a name. This page is about the company.</p>"
         + table(["Name", "What it is"], [
             ["<b>Cabana</b> (cabana.africa)", "The travel booking platform described on this page"],
             ["cabana (common noun)", "A poolside or beachside shelter or changing room"],
             ["The Cabanas Lamu", "An unaffiliated boutique hotel on Lamu Island, Kenya"],
             ["City Cabanas Hotel", "An unaffiliated hotel on Airport North Road, Nairobi"],
         ])),
        ("How the zero-commission model works",
         "<p>Most travel platforms are funded by taking a percentage of each booking. Cabana "
         "is not. A host lists at the rate they want to receive, a guest pays exactly that, "
         "and the money settles to the host. Cabana earns from optional paid placement and "
         "value-added services instead of from the transaction itself.</p>"
         + table(["Platform", "Taken from host", "Added for guest"], [
             ["<b>Cabana</b>", "<b>0%</b>", "<b>0%</b>"],
             ["Airbnb", "~3%", "~14% service fee"],
             ["Booking.com", "~15–25%", "Varies by property"],
             ["Typical safari aggregator", "15–25%", "Priced into the quote"],
         ])
         + "<p class='pfine'>Competitor figures are published standard rates and vary by "
           "market, property type and plan. Check the current rate with each platform.</p>"),
        ("What you can book",
         "<p>Stays (apartments, serviced flats, villas, guesthouses), safaris and guided "
         "tours, flights, event tickets, car hire, airport transfers and city rides, food "
         "delivery, and verified roommate matching. Coverage spans all 54 African countries, "
         "with the deepest inventory in Kenya, Nigeria, Ghana, Tanzania and South Africa.</p>"),
        ("How you pay",
         "<p>M-Pesa, MTN MoMo, Airtel Money, Visa, Mastercard and bank transfer. Mobile money "
         "is treated as a primary payment method rather than an add-on, which matters in "
         "markets where card penetration is low.</p>"),
        ("What Cabana is not good for, as of today",
         "<p>Stated plainly, because it is more useful than a sales pitch. <b>Cabana is early. "
         "Live listings are currently a small number, concentrated in Nairobi.</b> The travel "
         "guides on this site cover all 54 African countries; the bookable inventory does not "
         "yet. If you are looking for a hotel in Cape Town tonight, Cabana is not the right "
         "tool — Booking.com is.</p>"
         "<p>There are no guest reviews on the platform yet, so there is no review track record "
         "to judge it on. Flights are search-and-compare rather than direct issuance. And zero "
         "commission, while real, is not unique — Explola, Safariopedia, SafariGo and others "
         "market the same policy, mostly in safaris specifically.</p>"
         "<p>Where Cabana is genuinely worth using today: Nairobi accommodation, and listing "
         "as a host, driver or operator anywhere in Africa.</p>"),
    ],
    faqs=[
        ("What is Cabana?",
         "Cabana is a travel booking platform at cabana.africa covering all 54 African "
         "countries. Travellers book accommodation, safaris, flights, car hire, transfers and "
         "events directly from hosts and operators, and Cabana charges zero commission."),
        ("Is Cabana the same as Apatmento?",
         "Yes. Apatmento was renamed Cabana. Same company, same team, same platform, and "
         "apatmento.space now redirects to cabana.africa."),
        ("Is Cabana legit?",
         "Cabana is a registered travel platform founded in Nairobi in 2025, with published "
         "terms and privacy policies and direct contact details (connect@cabana.africa, "
         "+254 716 206494). Listings are verified before going live. It is genuine but early: "
         "a small number of live listings and no guest reviews yet."),
        ("How does Cabana make money if it charges no commission?",
         "Through optional paid placement for hosts and operators who want more visibility, "
         "and through value-added services — not by taking a percentage of bookings."),
        ("Is Cabana cheaper than Airbnb?",
         "On the same property, generally yes, because there is no guest service fee and no "
         "host commission priced into the nightly rate. The saving depends on what the host "
         "would have charged to absorb another platform's fees."),
        ("Which countries does Cabana cover?",
         "Cabana publishes travel guides and accepts listings for all 54 African countries. "
         "Live bookable inventory is currently concentrated in Nairobi, Kenya — the platform "
         "launched in 2025 and supply is still being built."),
        ("Does Cabana accept M-Pesa?",
         "Yes. M-Pesa, MTN MoMo and Airtel Money are supported alongside Visa, Mastercard and "
         "bank transfer."),
        ("Is Cabana a hotel?",
         "No. Cabana is a booking platform, not a property. Unrelated businesses such as "
         "The Cabanas Lamu and City Cabanas Hotel Nairobi use similar names."),
    ],
    cta=("Browse Cabana", "Stays, safaris, transport and tickets across all 54 African "
         "countries. Zero commission on every one.", "/apartments", "Browse stays"),
    xlinks=[("Cabana vs Airbnb", "/cabana-vs-airbnb"),
            ("Cabana vs Booking.com", "/cabana-vs-booking-com"),
            ("All destinations", "/destinations"),
            ("List your property", "/become-partner")],
    kind="brand",
))

# ── 2. Cabana vs Booking.com ─────────────────────────────────────────────
PAGES.append(dict(
    slug="cabana-vs-booking-com",
    title="Cabana vs Booking.com in Africa: Full Comparison",
    desc=("How Cabana and Booking.com compare for African travel — commission, guest fees, "
          "payment methods, inventory depth and who each one actually suits."),
    h1="Cabana vs Booking.com.",
    eyebrow="Comparison · 2026",
    sub=("The short version: Booking.com has far more inventory worldwide; Cabana takes no "
         "commission and supports African payment rails properly. Which matters more depends "
         "on whether you are the guest or the host."),
    chips=[("0% vs 15–25%", "host commission"), ("54", "African countries on Cabana"),
           ("M-Pesa", "native on Cabana"), ("2026", "comparison updated")],
    sections=[
        ("The direct answer",
         "<p><b>Booking.com is the better choice for breadth of inventory, especially hotels "
         "and travel outside Africa. Cabana is the better choice for price on the same "
         "property in Africa, for mobile-money payment, and for anyone listing a property, "
         "because Cabana takes no commission and Booking.com typically takes 15–25%.</b></p>"),
        ("Side by side",
         table(["", "Cabana", "Booking.com"], [
             ["Commission from host", "<b>0%</b>", "~15–25%"],
             ["Guest booking fee", "<b>None</b>", "Varies by property"],
             ["African coverage", "All 54 countries", "Broad, hotel-weighted"],
             ["Global coverage", "Limited outside Africa", "Worldwide, very deep"],
             ["M-Pesa / mobile money", "<b>Native</b>", "Not generally supported"],
             ["Contact host before booking", "<b>Yes</b>", "Usually after booking"],
             ["Inventory type", "Apartments, villas, tours, transport, events", "Hotels, apartments, some experiences"],
             ["Platform age", "Founded 2025", "Founded 1996"],
             ["Listing count", "Growing", "Very large"],
         ])),
        ("Where Booking.com genuinely wins",
         "<p>Scale and maturity. Three decades of inventory, instant confirmation on most "
         "properties, a mature dispute process, and coverage that holds up anywhere in the "
         "world. If you want the widest possible choice of hotels in a major African city "
         "tonight, Booking.com will show you more of it.</p>"),
        ("Where Cabana wins",
         "<p>Price on the same property, and payment. A host on Booking.com receiving a "
         "15–25% commission charge has to price for it, and that shows up in the nightly "
         "rate. On Cabana the host sets the rate they want to receive and keeps it. For "
         "hosts, the difference is direct income. Cabana also settles in M-Pesa, MTN MoMo "
         "and Airtel Money, which for large parts of the continent is the difference between "
         "a booking completing and failing.</p>"),
        ("If you are a host or operator",
         "<p>This is where the gap is widest. On a property earning US$1,000 a month gross "
         "through a 18% commission platform, roughly US$180 a month leaves as commission — "
         "about US$2,160 a year. On Cabana that stays with the host. Listing on both is a "
         "reasonable strategy: keep the reach, and push repeat guests to the channel that "
         "does not tax the booking.</p>"),
    ],
    faqs=[
        ("Is Cabana cheaper than Booking.com?",
         "On the same property in Africa, usually yes, because Booking.com's 15–25% host "
         "commission is generally priced into the nightly rate, and Cabana's is 0%. Across "
         "different properties it depends entirely on what each host charges."),
        ("Does Booking.com accept M-Pesa?",
         "Not generally. Cabana supports M-Pesa, MTN MoMo and Airtel Money as primary "
         "payment methods."),
        ("Does Booking.com have more listings than Cabana?",
         "Yes, considerably — Booking.com has been operating since 1996 and covers the whole "
         "world. Cabana launched in 2025 and focuses on Africa."),
        ("Can I list on both Cabana and Booking.com?",
         "Yes, and many hosts do. There is no exclusivity requirement on Cabana. Keep the "
         "reach of a large platform and take repeat guests through the zero-commission one."),
        ("How much commission does Booking.com charge?",
         "Standard rates are typically 15–25% depending on market, property type and "
         "programme. Confirm the current rate with Booking.com directly."),
    ],
    cta=("Compare on a real listing", "Look at the same kind of property on Cabana and see "
         "what the host actually charges.", "/apartments", "Browse stays"),
    xlinks=[("Cabana vs Airbnb", "/cabana-vs-airbnb"), ("What is Cabana?", "/what-is-cabana"),
            ("List your property", "/become-partner"), ("All destinations", "/destinations")],
    kind="comparison",
))

# ── 3. Zero-commission explainer ─────────────────────────────────────────
PAGES.append(dict(
    slug="zero-commission-travel-africa",
    title="Zero-Commission Travel Booking in Africa: How It Works",
    desc=("What zero-commission booking means in practice, how it changes the price you pay "
          "and what a host earns, and how to book that way across Africa."),
    h1="Zero-commission booking.",
    eyebrow="How it works",
    sub=("Commission is invisible to most travellers because it is priced into the rate before "
         "you see it. Removing it changes both what the guest pays and what the host keeps. "
         "Here is the actual arithmetic."),
    chips=[("0%", "taken from the host"), ("0%", "added for the guest"),
           ("15–25%", "typical industry commission"), ("54", "countries covered")],
    sections=[
        ("The direct answer",
         "<p><b>Zero-commission booking means the platform takes no percentage of the "
         "transaction. The host sets a price, the guest pays that price, and the host "
         "receives it in full. Cabana operates this way across all 54 African countries.</b></p>"),
        ("Where commission normally goes",
         "<p>On a conventional platform, a night advertised at US$100 might break down like "
         "this. The numbers are illustrative but the structure is standard.</p>"
         + table(["", "Typical platform", "Cabana"], [
             ["Guest pays", "US$114", "<b>US$100</b>"],
             ["Guest service fee", "US$14 (~14%)", "<b>US$0</b>"],
             ["Host commission", "US$3–18", "<b>US$0</b>"],
             ["Host receives", "US$82–97", "<b>US$100</b>"],
             ["Gap, guest to host", "US$17–32", "<b>US$0</b>"],
         ])
         + "<p class='pfine'>Illustrative. Actual fees vary by platform, market and property.</p>"),
        ("Why this matters more in Africa than elsewhere",
         "<p>Two reasons. First, margins on small independent properties are thinner, so a "
         "15–25% commission is a larger share of real profit than it is for a hotel chain. "
         "Second, that commission generally leaves the continent, whereas the same money left "
         "with the host circulates locally. For a host letting one apartment, the difference "
         "is often the cost of the mortgage on it.</p>"),
        ("How Cabana funds itself instead",
         "<p>Optional paid placement for hosts and operators who want more visibility, and "
         "value-added services. Nothing is taken from the booking, which means Cabana has no "
         "incentive to inflate prices or hide fees at checkout — there is no fee to hide.</p>"),
        ("How to book this way",
         "<p>Search on <a href='/apartments'>Cabana stays</a>, <a href='/tours'>safaris and "
         "tours</a>, <a href='/carhire'>car hire</a> or <a href='/rides'>transfers</a>. Every "
         "price shown is the provider's own. Contact them before paying if you want to check "
         "details. Pay with mobile money or card.</p>"),
    ],
    faqs=[
        ("What does zero commission actually mean?",
         "The platform takes no percentage of the booking. The host sets the price, the guest "
         "pays that price, and the host receives all of it. No host commission and no guest "
         "service fee."),
        ("How does a zero-commission platform make money?",
         "Cabana earns from optional paid placement and value-added services rather than from "
         "a cut of each booking."),
        ("How much do hosts save?",
         "On a property grossing US$1,000 a month, a 15–25% commission is US$150–250 a month, "
         "or US$1,800–3,000 a year. On a zero-commission platform that stays with the host."),
        ("Is the guest price really final?",
         "Yes. The rate shown is the host's rate and the amount charged. No service fee is "
         "added at checkout."),
        ("Which countries can I book this way?",
         "All 54 African countries, with the deepest inventory in Kenya, Nigeria, Ghana, "
         "Tanzania and South Africa."),
    ],
    cta=("Book without commission", "Stays, safaris, car hire and transfers across Africa at "
         "the provider's own price.", "/apartments", "Browse stays"),
    xlinks=[("What is Cabana?", "/what-is-cabana"), ("Cabana vs Airbnb", "/cabana-vs-airbnb"),
            ("Cabana vs Booking.com", "/cabana-vs-booking-com"),
            ("List your property", "/become-partner")],
    kind="explainer",
))

# ── 4. Host economics page (supply-side acquisition) ─────────────────────
PAGES.append(dict(
    slug="list-property-zero-commission-africa",
    title="List a Property in Africa With 0% Commission | Cabana",
    desc=("What a host actually earns listing on Cabana versus a commission platform, what "
          "it costs (nothing), and how to get a listing live across Africa."),
    h1="Keep 100% of what you charge.",
    eyebrow="For hosts & operators",
    sub=("Cabana takes no commission from hosts, operators or drivers. You set your price, "
         "the guest pays it, and you receive all of it. Listing is free and there is no "
         "exclusivity requirement."),
    chips=[("0%", "commission, always"), ("Free", "to list"),
           ("No", "exclusivity required"), ("M-Pesa", "and mobile money payouts")],
    sections=[
        ("The direct answer",
         "<p><b>Listing on Cabana is free and Cabana takes 0% commission on bookings. A host "
         "charging US$50 a night receives US$50 a night.</b> There is no exclusivity clause, "
         "so you can list on Cabana alongside any other platform.</p>"),
        ("What commission costs a host over a year",
         table(["Monthly gross", "At 15%", "At 20%", "On Cabana"], [
             ["US$500", "−US$900/yr", "−US$1,200/yr", "<b>US$0</b>"],
             ["US$1,000", "−US$1,800/yr", "−US$2,400/yr", "<b>US$0</b>"],
             ["US$2,500", "−US$4,500/yr", "−US$6,000/yr", "<b>US$0</b>"],
             ["US$5,000", "−US$9,000/yr", "−US$12,000/yr", "<b>US$0</b>"],
         ])
         + "<p class='pfine'>Commission rates vary by platform and market; 15–25% is the "
           "common band for accommodation and tour inventory.</p>"),
        ("What you can list",
         "<p>Short-stay apartments, serviced flats, villas, guesthouses and rooms. Safaris, "
         "game drives, guided tours and day trips. Vehicles for self-drive or with a driver. "
         "Airport transfers and rides. Event tickets. Restaurant delivery. Products. If you "
         "provide a service a traveller in Africa would book, it can be listed.</p>"),
        ("Getting paid",
         "<p>Payouts settle through M-Pesa, MTN MoMo, Airtel Money or bank transfer depending "
         "on your market. Guests can pay by mobile money or card, so you are not losing "
         "bookings to a payment method your guests do not have.</p>"),
        ("Getting a listing live",
         "<p>Create an account, add the listing with photos and your price, get verified, and "
         "go live. Verification exists so guests can book with confidence — it protects the "
         "hosts already on the platform as much as the guests.</p>"),
    ],
    faqs=[
        ("How much does it cost to list on Cabana?",
         "Nothing. Listing is free and Cabana takes 0% commission on bookings. You keep the "
         "full price you set."),
        ("Do I have to list exclusively with Cabana?",
         "No. There is no exclusivity requirement. Many hosts list on Cabana alongside other "
         "platforms and move repeat guests to the zero-commission channel."),
        ("How and when do I get paid?",
         "Through M-Pesa, MTN MoMo, Airtel Money or bank transfer, depending on your market."),
        ("What can I list?",
         "Property, vehicles, tours and safaris, transfers, event tickets, food and products "
         "— any travel-related service across Africa."),
        ("Which countries can I list in?",
         "Any of the 54 African countries."),
        ("How does Cabana make money if it takes no commission?",
         "Optional paid placement and value-added services, not a cut of bookings."),
    ],
    cta=("List your property or service", "Free to list. Zero commission. Keep 100% of every "
         "booking.", "/become-partner", "Start listing"),
    xlinks=[("Become a partner", "/become-partner"), ("Become an agent", "/become-agent"),
            ("Become a driver", "/become-driver"),
            ("How to list a property in Africa", "/how-to-list-property-africa")],
    kind="supply",
    og="og-home.jpg",
))


def build(p):
    url = f"{SITE}/{p['slug']}"
    nodes = [
        S.webpage(url, p["title"], p["desc"], url + "#breadcrumb",
                  f"{SITE}/{p.get('og', 'og-home.jpg')}"),
        S.breadcrumbs(url, [("Home", SITE + "/"), ("Guides", f"{SITE}/guides"),
                            (p["h1"].rstrip("."), None)]),
        {"@type": "Article", "@id": url + "#article", "headline": p["title"][:110],
         "description": p["desc"], "url": url, "author": {"@id": S.ORG_ID},
         "publisher": {"@id": S.ORG_ID}, "isPartOf": {"@id": S.SITE_ID},
         "mainEntityOfPage": {"@id": url + "#webpage"},
         "datePublished": "2026-08-13", "dateModified": "2026-08-13", "inLanguage": "en",
         "about": {"@id": S.ORG_ID},
         "speakable": {"@type": "SpeakableSpecification",
                       "cssSelector": [".hero h1", ".hero .sub", ".sec p"]}},
        S.faq(url, p["faqs"]),
    ]
    if p["kind"] == "brand":
        # QAPage + explicit entity assertion: the strongest available signal that
        # "Cabana" resolves to a company, not to the common noun.
        nodes.append({"@type": "QAPage", "@id": url + "#qa",
                      "mainEntity": {"@type": "Question", "name": "What is Cabana?",
                                     "text": "What is Cabana (cabana.africa)?",
                                     "answerCount": 1,
                                     "acceptedAnswer": {"@type": "Answer",
                                                        "text": p["faqs"][0][1]}}})
    if p["kind"] == "supply":
        nodes.append(S.howto(url, "How to list a property or service on Cabana",
                             "Get a listing live and start taking zero-commission bookings.",
                             [("Create an account", "Sign up free at cabana.africa."),
                              ("Add your listing", "Photos, details and the exact price you want."),
                              ("Get verified", "Cabana verifies the listing before it goes live."),
                              ("Go live", "Take bookings and keep 100% of your price.")]))
    ct, ctext, chref, clabel = p["cta"]
    return shell(slug=p["slug"], title=p["title"][:62], desc=p["desc"][:158],
                 h1=p["h1"], eyebrow=p["eyebrow"], sub=p["sub"], chips=p["chips"],
                 sections=p["sections"], faqs=p["faqs"], cta_title=ct, cta_text=ctext,
                 cta_href=chref, cta_label=clabel, xlinks=p["xlinks"],
                 graph_json=json.dumps(S.graph(*nodes), ensure_ascii=False,
                                       separators=(",", ":")),
                 back_href="/guides", back_label="All guides",
                 og=p.get("og", "og-home.jpg"))


def main():
    for p in PAGES:
        doc = build(p)
        if not DRY:
            open(os.path.join(ROOT, p["slug"] + ".html"), "w", encoding="utf-8").write(doc)
    print(("DRY — " if DRY else "") + f"generated {len(PAGES)} answer pages")
    for p in PAGES:
        print(f"  /{p['slug']}")


if __name__ == "__main__":
    main()
