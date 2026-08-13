# -*- coding: utf-8 -*-
"""
Cabana — Schema.org rich-result engine.

Produces the JSON-LD @graph that makes Cabana eligible for the SERP features
Booking.com and Airbnb currently monopolise: star ratings, price ranges,
sitelinks searchbox, FAQ accordions, breadcrumbs, merchant listings and
voice/AI answer extraction.

Every node is @id-linked so Google resolves one coherent entity graph
rather than a pile of disconnected objects. That entity coherence is what
gets a brand into the Knowledge Graph.
"""
import json

SITE = "https://cabana.africa"
ORG_ID = f"{SITE}/#organization"
SITE_ID = f"{SITE}/#website"
BRAND_ID = f"{SITE}/#brand"

# Every profile Cabana controls. sameAs is the single strongest entity
# disambiguation signal — it tells Google "cabana" here is a company,
# not a poolside shelter.
SAME_AS = [
    "https://twitter.com/apatmento",
    "https://x.com/apatmento",
    "https://www.instagram.com/cabana.africa",
    "https://www.facebook.com/cabana.africa",
    "https://www.linkedin.com/company/cabana-africa",
    "https://www.tiktok.com/@cabana.africa",
    "https://www.youtube.com/@cabanaafrica",
    "https://www.crunchbase.com/organization/cabana-africa",
    "https://github.com/kevinaloo",
]


def org():
    """The master Organization node. Emitted on every single page."""
    return {
        "@type": ["Organization", "TravelAgency", "OnlineBusiness"],
        "@id": ORG_ID,
        "name": "Cabana",
        "alternateName": ["Cabana Africa", "Cabana Travel", "Cabana App",
                          "cabana.africa", "Apatmento", "Apatmento by Cabana"],
        "legalName": "Cabana",
        "url": SITE + "/",
        "logo": {"@type": "ImageObject", "@id": f"{SITE}/#logo",
                 "url": f"{SITE}/cabana-icon-512.png",
                 "contentUrl": f"{SITE}/cabana-icon-512.png",
                 "width": 512, "height": 512, "caption": "Cabana"},
        "image": {"@id": f"{SITE}/#logo"},
        "description": ("Cabana is Africa's zero-commission travel platform. Book short-stay "
                        "apartments, safaris, flights, events, car hire and rides across all 54 "
                        "African countries, direct from the host or operator. Hosts keep 100% of "
                        "what they charge and guests pay no booking fee."),
        "slogan": "Zero commission. Africa's own travel platform.",
        "foundingDate": "2025",
        "foundingLocation": {"@type": "Place", "name": "Nairobi, Kenya"},
        "brand": {"@id": BRAND_ID},
        "knowsAbout": [
            "Travel in Africa", "Safari booking", "Short-stay apartments",
            "Zero-commission booking", "M-Pesa payments", "African tourism",
            "Vacation rentals", "Airport transfers", "Car hire", "Event ticketing",
        ],
        "areaServed": [{"@type": "Continent", "name": "Africa"},
                       {"@type": "Place", "name": "Worldwide"}],
        "currenciesAccepted": "KES, NGN, GHS, ZAR, TZS, UGX, RWF, USD, EUR, GBP",
        "paymentAccepted": "M-Pesa, MTN MoMo, Airtel Money, Visa, Mastercard, Bank transfer",
        "telephone": "+254716206494",
        "email": "connect@cabana.africa",
        "contactPoint": [
            {"@type": "ContactPoint", "telephone": "+254716206494",
             "email": "connect@cabana.africa", "contactType": "customer support",
             "availableLanguage": ["English", "Swahili", "French", "Arabic", "Portuguese"],
             "areaServed": "Africa"},
            {"@type": "ContactPoint", "email": "partners@cabana.africa",
             "contactType": "sales", "name": "Host & operator onboarding",
             "availableLanguage": ["English", "Swahili", "French"], "areaServed": "Africa"},
        ],
        "sameAs": SAME_AS,
    }


def brand():
    return {"@type": "Brand", "@id": BRAND_ID, "name": "Cabana",
            "logo": f"{SITE}/cabana-icon-512.png", "slogan": "Zero commission. Always."}


def website():
    """WebSite + SearchAction wins the sitelinks searchbox in Google."""
    return {
        "@type": "WebSite", "@id": SITE_ID, "url": SITE + "/", "name": "Cabana",
        "alternateName": "Cabana Africa",
        "description": "Africa's zero-commission travel platform.",
        "publisher": {"@id": ORG_ID},
        "inLanguage": "en",
        "potentialAction": [{
            "@type": "SearchAction",
            "target": {"@type": "EntryPoint",
                       "urlTemplate": f"{SITE}/apartments.html?q={{search_term_string}}"},
            "query-input": "required name=search_term_string",
        }],
    }


def webpage(url, name, description, breadcrumb_id=None, primary_image=None,
            page_type="WebPage", date_modified="2026-08-13", speakable_css=None):
    node = {
        "@type": page_type, "@id": url + "#webpage", "url": url, "name": name,
        "description": description, "isPartOf": {"@id": SITE_ID},
        "about": {"@id": ORG_ID}, "publisher": {"@id": ORG_ID},
        "inLanguage": "en", "dateModified": date_modified,
    }
    if breadcrumb_id:
        node["breadcrumb"] = {"@id": breadcrumb_id}
    if primary_image:
        node["primaryImageOfPage"] = {"@type": "ImageObject", "url": primary_image}
    # Speakable = eligibility for voice assistants and AI answer readback.
    node["speakable"] = {"@type": "SpeakableSpecification",
                         "cssSelector": speakable_css or [".hero h1", ".hero .sub", ".sec p"]}
    return node


def breadcrumbs(url, trail):
    """trail = [(name, url), ...]"""
    return {
        "@type": "BreadcrumbList", "@id": url + "#breadcrumb",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": n,
             **({"item": u} if u else {})}
            for i, (n, u) in enumerate(trail)
        ],
    }


def faq(url, pairs):
    return {
        "@type": "FAQPage", "@id": url + "#faq",
        "mainEntity": [
            {"@type": "Question", "name": q,
             "acceptedAnswer": {"@type": "Answer", "text": a}}
            for q, a in pairs
        ],
    }


def aggregate_rating(value=4.8, count=1240):
    return {"@type": "AggregateRating", "ratingValue": str(value),
            "reviewCount": str(count), "bestRating": "5", "worstRating": "1"}


def lodging(url, city, country, lat, lng, low, high, currency="USD",
            rating=None, count=None, amenities=None, image=None):
    """
    LodgingBusiness with AggregateOffer is what puts a price range and star
    rating into the search result. This is the node Booking.com wins on.
    """
    node = {
        "@type": "LodgingBusiness", "@id": url + "#lodging",
        "name": f"Cabana {city} — Short-Stay Apartments",
        "description": (f"Verified short-stay apartments, serviced flats and villas in {city}, "
                        f"{country}, booked direct from the host with zero commission."),
        "url": url,
        "parentOrganization": {"@id": ORG_ID},
        "brand": {"@id": BRAND_ID},
        "priceRange": f"{currency} {low}–{high} per night",
        "currenciesAccepted": currency,
        "paymentAccepted": "M-Pesa, MTN MoMo, Airtel Money, Visa, Mastercard",
        "address": {"@type": "PostalAddress", "addressLocality": city,
                    "addressCountry": country},
        "geo": {"@type": "GeoCoordinates", "latitude": lat, "longitude": lng},
        "areaServed": {"@type": "City", "name": city},
        "makesOffer": {
            "@type": "AggregateOffer", "priceCurrency": currency,
            "lowPrice": str(low), "highPrice": str(high),
            "offerCount": "50",
            "availability": "https://schema.org/InStock",
            "priceSpecification": {
                "@type": "UnitPriceSpecification", "priceCurrency": currency,
                "minPrice": low, "maxPrice": high,
                "unitCode": "DAY", "referenceQuantity": {
                    "@type": "QuantitativeValue", "value": 1, "unitCode": "DAY"},
            },
        },
    }
    if image:
        node["image"] = image
    if amenities:
        node["amenityFeature"] = [
            {"@type": "LocationFeatureSpecification", "name": a, "value": True}
            for a in amenities
        ]
    if rating and count:
        node["aggregateRating"] = aggregate_rating(rating, count)
    return node


def tourist_destination(url, name, country, lat, lng, attractions, description):
    return {
        "@type": "TouristDestination", "@id": url + "#destination",
        "name": name, "description": description, "url": url,
        "geo": {"@type": "GeoCoordinates", "latitude": lat, "longitude": lng},
        "address": {"@type": "PostalAddress", "addressLocality": name,
                    "addressCountry": country},
        "touristType": ["Leisure travellers", "Business travellers", "Digital nomads",
                        "Safari travellers", "Diaspora travellers"],
        "includesAttraction": [
            {"@type": "TouristAttraction", "name": a} for a in attractions
        ],
    }


def tourist_trip(url, name, description, dest_names, low, high, currency="USD",
                 rating=None, count=None):
    return {
        "@type": "TouristTrip", "@id": url + "#trip",
        "name": name, "description": description, "url": url,
        "provider": {"@id": ORG_ID},
        "itinerary": {"@type": "ItemList", "itemListElement": [
            {"@type": "ListItem", "position": i + 1,
             "item": {"@type": "TouristDestination", "name": d}}
            for i, d in enumerate(dest_names)]},
        "offers": {"@type": "AggregateOffer", "priceCurrency": currency,
                   "lowPrice": str(low), "highPrice": str(high),
                   "availability": "https://schema.org/InStock",
                   "seller": {"@id": ORG_ID}},
        **({"aggregateRating": aggregate_rating(rating, count)} if rating else {}),
    }


def product_service(url, name, description, low, high, currency="USD",
                    category="Travel", rating=None, count=None):
    """Generic Product+Offer node — drives merchant-style rich results."""
    return {
        "@type": "Product", "@id": url + "#product",
        "name": name, "description": description, "url": url,
        "category": category, "brand": {"@id": BRAND_ID},
        "offers": {"@type": "AggregateOffer", "priceCurrency": currency,
                   "lowPrice": str(low), "highPrice": str(high),
                   "offerCount": "50",
                   "availability": "https://schema.org/InStock",
                   "seller": {"@id": ORG_ID}},
        **({"aggregateRating": aggregate_rating(rating, count)} if rating and count else {}),
    }


def itemlist(url, name, items):
    """items = [(name, url), ...] — drives carousel eligibility."""
    return {
        "@type": "ItemList", "@id": url + "#itemlist", "name": name,
        "numberOfItems": len(items),
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": n, "url": u}
            for i, (n, u) in enumerate(items)
        ],
    }


def howto(url, name, description, steps):
    return {
        "@type": "HowTo", "@id": url + "#howto", "name": name,
        "description": description,
        "totalTime": "PT5M",
        "step": [{"@type": "HowToStep", "position": i + 1, "name": s[0], "text": s[1]}
                 for i, s in enumerate(steps)],
    }


def graph(*nodes):
    """Assemble the final @graph, always anchored by Organization + WebSite."""
    base = [org(), brand(), website()]
    seen = {n.get("@id") for n in base}
    out = list(base)
    for n in nodes:
        if not n:
            continue
        if n.get("@id") in seen:
            continue
        seen.add(n.get("@id"))
        out.append(n)
    return {"@context": "https://schema.org", "@graph": out}


def render(*nodes, indent=None):
    d = graph(*nodes)
    return ('<script type="application/ld+json">\n'
            + json.dumps(d, ensure_ascii=False, indent=indent, separators=(",", ":") if indent is None else None)
            + '\n</script>')
