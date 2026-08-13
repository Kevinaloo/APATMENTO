# -*- coding: utf-8 -*-
"""
Cabana — supplementary place graph.

Neighbourhood, safari-region, global-city and continent-hub records so that
EVERY stay page resolves to a real LodgingBusiness node with coordinates,
a price band and a parent city. Pages without coordinates cannot win local
pack or map placement, so nothing is left generic.

key = page slug fragment (lowercased, spaces)
value = (display name, parent city, country, lat, lng, low USD, high USD, kind)
"""

PLACES = {
 # ── Nairobi neighbourhoods ───────────────────────────────────────────────
 "kilimani":        ("Kilimani", "Nairobi", "Kenya", -1.2921, 36.7833, 22, 90, "Neighborhood"),
 "westlands":       ("Westlands", "Nairobi", "Kenya", -1.2676, 36.8108, 25, 110, "Neighborhood"),
 "karen":           ("Karen", "Nairobi", "Kenya", -1.3197, 36.7076, 35, 180, "Neighborhood"),
 "lavington":       ("Lavington", "Nairobi", "Kenya", -1.2795, 36.7686, 28, 120, "Neighborhood"),
 "kileleshwa":      ("Kileleshwa", "Nairobi", "Kenya", -1.2807, 36.7789, 22, 95, "Neighborhood"),
 "upperhill":       ("Upper Hill", "Nairobi", "Kenya", -1.2996, 36.8148, 25, 110, "Neighborhood"),
 "parklands":       ("Parklands", "Nairobi", "Kenya", -1.2603, 36.8189, 20, 85, "Neighborhood"),
 "gigiri":          ("Gigiri", "Nairobi", "Kenya", -1.2350, 36.8039, 40, 200, "Neighborhood"),
 "runda":           ("Runda", "Nairobi", "Kenya", -1.2170, 36.8100, 45, 220, "Neighborhood"),
 "muthaiga":        ("Muthaiga", "Nairobi", "Kenya", -1.2500, 36.8300, 45, 230, "Neighborhood"),
 "cbd":             ("Nairobi CBD", "Nairobi", "Kenya", -1.2864, 36.8172, 15, 70, "Neighborhood"),
 "south c":         ("South C", "Nairobi", "Kenya", -1.3225, 36.8300, 15, 65, "Neighborhood"),
 "syokimau":        ("Syokimau", "Nairobi", "Kenya", -1.3667, 36.9333, 15, 70, "Neighborhood"),
 "rongai":          ("Ongata Rongai", "Nairobi", "Kenya", -1.3961, 36.7447, 12, 55, "Neighborhood"),
 "ngong road":      ("Ngong Road", "Nairobi", "Kenya", -1.3000, 36.7600, 18, 80, "Neighborhood"),
 "thika road":      ("Thika Road", "Nairobi", "Kenya", -1.2200, 36.8900, 14, 65, "Neighborhood"),
 # ── Kenya coast ──────────────────────────────────────────────────────────
 "nyali":           ("Nyali", "Mombasa", "Kenya", -4.0300, 39.7000, 25, 130, "Neighborhood"),
 "bamburi":         ("Bamburi", "Mombasa", "Kenya", -3.9900, 39.7200, 20, 110, "Neighborhood"),
 "diani beach":     ("Diani Beach", "Diani", "Kenya", -4.2767, 39.5930, 28, 180, "Beach"),
 # ── Lagos / Accra neighbourhoods ─────────────────────────────────────────
 "lekki":           ("Lekki", "Lagos", "Nigeria", 6.4698, 3.5852, 35, 200, "Neighborhood"),
 "ikoyi":           ("Ikoyi", "Lagos", "Nigeria", 6.4550, 3.4350, 45, 250, "Neighborhood"),
 "ikeja":           ("Ikeja", "Lagos", "Nigeria", 6.6018, 3.3515, 30, 150, "Neighborhood"),
 "victoria island": ("Victoria Island", "Lagos", "Nigeria", 6.4281, 3.4219, 45, 260, "Neighborhood"),
 "east legon":      ("East Legon", "Accra", "Ghana", 5.6350, -0.1560, 35, 180, "Neighborhood"),
 "airport residential accra": ("Airport Residential", "Accra", "Ghana", 5.6050, -0.1780, 40, 200, "Neighborhood"),
 # ── Safari regions ───────────────────────────────────────────────────────
 "masai mara":      ("Masai Mara", "Narok", "Kenya", -1.4061, 35.0080, 60, 900, "SafariRegion"),
 "serengeti":       ("Serengeti", "Arusha", "Tanzania", -2.3333, 34.8333, 70, 1100, "SafariRegion"),
 "ngorongoro":      ("Ngorongoro", "Arusha", "Tanzania", -3.2000, 35.5000, 65, 950, "SafariRegion"),
 # ── Continent & region hubs ──────────────────────────────────────────────
 "africa":          ("Africa", "", "Africa", 1.6508, 17.6791, 15, 600, "Continent"),
 "global":          ("Worldwide", "", "Worldwide", 20.0, 0.0, 15, 900, "Continent"),
 "europe":          ("Europe", "", "Europe", 54.5260, 15.2551, 40, 500, "Continent"),
 "asia":            ("Asia", "", "Asia", 34.0479, 100.6197, 20, 400, "Continent"),
 "americas":        ("The Americas", "", "Americas", 14.6, -90.5, 30, 500, "Continent"),
 "oceania":         ("Oceania", "", "Oceania", -22.7359, 140.0188, 50, 500, "Continent"),
 # ── Global cities Cabana already serves ──────────────────────────────────
 "london":          ("London", "London", "United Kingdom", 51.5074, -0.1278, 70, 400, "City"),
 "paris":           ("Paris", "Paris", "France", 48.8566, 2.3522, 70, 400, "City"),
 "amsterdam":       ("Amsterdam", "Amsterdam", "Netherlands", 52.3676, 4.9041, 80, 400, "City"),
 "berlin":          ("Berlin", "Berlin", "Germany", 52.5200, 13.4050, 55, 300, "City"),
 "madrid":          ("Madrid", "Madrid", "Spain", 40.4168, -3.7038, 50, 280, "City"),
 "barcelona":       ("Barcelona", "Barcelona", "Spain", 41.3851, 2.1734, 60, 320, "City"),
 "lisbon":          ("Lisbon", "Lisbon", "Portugal", 38.7223, -9.1393, 50, 280, "City"),
 "lisbon porto":    ("Lisbon & Porto", "Lisbon", "Portugal", 38.7223, -9.1393, 45, 280, "City"),
 "rome":            ("Rome", "Rome", "Italy", 41.9028, 12.4964, 55, 320, "City"),
 "milan":           ("Milan", "Milan", "Italy", 45.4642, 9.1900, 60, 340, "City"),
 "florence":        ("Florence", "Florence", "Italy", 43.7696, 11.2558, 55, 320, "City"),
 "athens":          ("Athens", "Athens", "Greece", 37.9838, 23.7275, 40, 240, "City"),
 "santorini":       ("Santorini", "Santorini", "Greece", 36.3932, 25.4615, 70, 500, "City"),
 "vienna":          ("Vienna", "Vienna", "Austria", 48.2082, 16.3738, 55, 300, "City"),
 "prague":          ("Prague", "Prague", "Czechia", 50.0755, 14.4378, 40, 250, "City"),
 "budapest":        ("Budapest", "Budapest", "Hungary", 47.4979, 19.0402, 35, 220, "City"),
 "copenhagen":      ("Copenhagen", "Copenhagen", "Denmark", 55.6761, 12.5683, 80, 420, "City"),
 "edinburgh":       ("Edinburgh", "Edinburgh", "United Kingdom", 55.9533, -3.1883, 60, 340, "City"),
 "dubrovnik":       ("Dubrovnik", "Dubrovnik", "Croatia", 42.6507, 18.0944, 55, 350, "City"),
 "istanbul":        ("Istanbul", "Istanbul", "Türkiye", 41.0082, 28.9784, 35, 250, "City"),
 "dubai":           ("Dubai", "Dubai", "United Arab Emirates", 25.2048, 55.2708, 60, 500, "City"),
 "tokyo":           ("Tokyo", "Tokyo", "Japan", 35.6762, 139.6503, 55, 350, "City"),
 "kyoto":           ("Kyoto", "Kyoto", "Japan", 35.0116, 135.7681, 55, 340, "City"),
 "seoul":           ("Seoul", "Seoul", "South Korea", 37.5665, 126.9780, 45, 280, "City"),
 "singapore":       ("Singapore", "Singapore", "Singapore", 1.3521, 103.8198, 70, 420, "City"),
 "bangkok":         ("Bangkok", "Bangkok", "Thailand", 13.7563, 100.5018, 25, 220, "City"),
 "chiang mai":      ("Chiang Mai", "Chiang Mai", "Thailand", 18.7883, 98.9853, 18, 150, "City"),
 "phuket":          ("Phuket", "Phuket", "Thailand", 7.8804, 98.3923, 30, 300, "City"),
 "bali":            ("Bali", "Denpasar", "Indonesia", -8.4095, 115.1889, 22, 300, "City"),
 "kuala lumpur":    ("Kuala Lumpur", "Kuala Lumpur", "Malaysia", 3.1390, 101.6869, 25, 200, "City"),
 "new york":        ("New York", "New York", "United States", 40.7128, -74.0060, 90, 600, "City"),
 "los angeles":     ("Los Angeles", "Los Angeles", "United States", 34.0522, -118.2437, 80, 500, "City"),
 "miami":           ("Miami", "Miami", "United States", 25.7617, -80.1918, 80, 500, "City"),
 "mexico city":     ("Mexico City", "Mexico City", "Mexico", 19.4326, -99.1332, 30, 250, "City"),
 "cartagena":       ("Cartagena", "Cartagena", "Colombia", 10.3910, -75.4794, 30, 280, "City"),
 "medellin":        ("Medellín", "Medellín", "Colombia", 6.2442, -75.5812, 25, 200, "City"),
 "buenos aires":    ("Buenos Aires", "Buenos Aires", "Argentina", -34.6037, -58.3816, 25, 200, "City"),
 "rio de janeiro":  ("Rio de Janeiro", "Rio de Janeiro", "Brazil", -22.9068, -43.1729, 30, 280, "City"),
 "sydney":          ("Sydney", "Sydney", "Australia", -33.8688, 151.2093, 80, 450, "City"),
 "melbourne":       ("Melbourne", "Melbourne", "Australia", -37.8136, 144.9631, 70, 400, "City"),
 "zanzibar":        ("Zanzibar", "Zanzibar City", "Tanzania", -6.1659, 39.2026, 30, 220, "City"),
}
