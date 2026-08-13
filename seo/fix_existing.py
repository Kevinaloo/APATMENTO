# -*- coding: utf-8 -*-
"""
Cabana — site-wide SEO repair sweep.

Runs over every existing .html page and fixes, in order:
  1. Brand normalisation      Apatmento -> Cabana (legal pages keep the legacy
                              name once, for continuity of contract).
  2. Title length             trimmed to <= 60 chars without losing the keyword head.
  3. Meta description length  trimmed to <= 158 chars at a clause boundary.
  4. Canonical                added where missing.
  5. hreflang cluster         added to every indexable page.
  6. Indexation control       noindex,nofollow on private/app pages so crawl
                              budget goes to money pages.
  7. Image performance        loading=lazy + decoding=async + fetchpriority on
                              the LCP image; alt text backfilled.
  8. Preconnect/DNS-prefetch  added where missing.

Idempotent: safe to run repeatedly.
Usage:  python3 seo/fix_existing.py [--dry]
"""
import os, re, sys, glob, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DRY = "--dry" in sys.argv
SITE = "https://cabana.africa"

# Pages that must never be indexed: app surfaces, auth, dashboards, admin.
NOINDEX = {
    "auth.html", "dashboard.html", "booking-confirm.html", "my-bookings.html",
    "admin.html", "admin-photos.html", "profile.html", "add-listing.html",
    "agent-dashboard.html", "driver.html", "offline.html",
    "partner-listings.html", "partner-bookings.html", "partner-calendar.html",
    "partner-agents.html", "partner-analytics.html", "partner-earnings.html",
    "partner-reviews.html", "partner-settings.html", "partner-cabana.html",
}

# Pages where the legacy name is load-bearing and must survive.
KEEP_LEGACY = {"terms.html", "privacy.html", "cookies.html", "cabana.html", "press.html"}

HREFLANG_MARKETS = [
    "en-ke", "en-ng", "en-gh", "en-tz", "en-ug", "en-rw", "en-za", "en-et",
    "en-sn", "en-eg", "en-ma", "en-zm", "en-zw", "en-na", "en-bw", "en-mw",
    "en-mz", "en-ci", "en-cm", "en-gb", "en-us", "en-ca", "en-au", "en-ae",
    "en-in", "en",
]

BRAND_MAP = [
    (r"Apatmento by Cabana", "Cabana"),
    (r"Apatmento \(Cabana\)", "Cabana"),
    (r"Cabana \(Apatmento\)", "Cabana"),
    (r"Apatmento", "Cabana"),
    (r"apatmento\.space", "cabana.africa"),
    (r"apatmento\.vercel\.app", "cabana.africa"),
]

stats = {k: 0 for k in ("brand", "title", "desc", "canonical", "hreflang",
                        "noindex", "img", "preconnect", "files")}


def canonical_url(fname):
    if fname == "index.html":
        return SITE + "/"
    return f"{SITE}/{fname[:-5]}"          # cleanUrls:true in vercel.json


def trim_title(t, limit=62):
    """Trim to <=limit chars, protecting the keyword head, dropping tail parts."""
    t = re.sub(r"\s+", " ", t).strip()
    # Never ship a doubled brand: "Cabana: X | Cabana".
    t = re.sub(r"\s*\|\s*Cabana\s*$", "", t) if t.count("Cabana") > 1 else t
    if len(t) <= limit:
        return t
    # Drop trailing pipe segments one at a time.
    while "|" in t and len(t) > limit:
        t = t.rsplit("|", 1)[0].strip()
    if len(t) <= limit:
        # Re-attach the brand only if it isn't already in the head.
        if "Cabana" not in t and len(t) + 9 <= limit:
            return t + " | Cabana"
        return t
    # Then trailing colon/dash clauses.
    for sep in ("·", " — ", " – ", ": "):
        while sep in t and len(t) > limit:
            head = t.rsplit(sep, 1)[0].strip()
            if len(head) < 20:
                break
            t = head
    if len(t) <= limit:
        return t
    cut = t[:limit]
    return cut[:cut.rfind(" ")].rstrip(" ,;:-–—&") if " " in cut else cut


def trim_desc(d, limit=158):
    d = re.sub(r"\s+", " ", d).strip()
    if len(d) <= limit:
        return d
    # Prefer ending on a full sentence.
    window = d[:limit + 1]
    for stop in (". ", "! ", "? "):
        i = window.rfind(stop)
        if i > limit * 0.6:
            return window[:i + 1].strip()
    i = window.rfind(" ")
    return window[:i].rstrip(" ,;:-–—&") + "."


def fix_brand(src, fname):
    if fname in KEEP_LEGACY:
        return src, 0
    n = 0
    for pat, rep in BRAND_MAP:
        src, c = re.subn(pat, rep, src)
        n += c
    # Collapse any "Cabana by Cabana" / "Cabana Cabana" artefacts.
    src = re.sub(r"Cabana by Cabana", "Cabana", src)
    src = re.sub(r"\bCabana Cabana\b", "Cabana", src)
    return src, n


def fix_title(src):
    m = re.search(r"<title>(.*?)</title>", src, re.S)
    if not m:
        return src, 0
    old = html.unescape(m.group(1)).strip()
    new = trim_title(old)
    if new == old:
        return src, 0
    return src[:m.start(1)] + html.escape(new, quote=False) + src[m.end(1):], 1


def fix_desc(src):
    changed = 0
    for pat in (r'(<meta\s+name="description"\s+content=")(.*?)(")',
                r'(<meta\s+property="og:description"\s+content=")(.*?)(")',
                r'(<meta\s+name="twitter:description"\s+content=")(.*?)(")'):
        def _r(m):
            nonlocal changed
            old = html.unescape(m.group(2))
            lim = 158 if "name=\"description\"" in m.group(1) else 200
            new = trim_desc(old, lim)
            if new != old:
                changed += 1
            return m.group(1) + html.escape(new, quote=True) + m.group(3)
        src = re.sub(pat, _r, src, flags=re.S)
    return src, changed


def ensure_canonical(src, fname):
    if re.search(r'<link[^>]+rel="canonical"', src):
        return src, 0
    tag = f'\n  <link rel="canonical" href="{canonical_url(fname)}"/>'
    return src.replace("</head>", tag + "\n</head>", 1), 1


def ensure_hreflang(src, fname):
    if fname in NOINDEX or 'hreflang=' in src:
        return src, 0
    u = canonical_url(fname)
    tags = "\n  <!-- hreflang: one canonical URL served to every English market -->"
    for m in HREFLANG_MARKETS:
        tags += f'\n  <link rel="alternate" hreflang="{m}" href="{u}"/>'
    tags += f'\n  <link rel="alternate" hreflang="x-default" href="{u}"/>'
    return src.replace("</head>", tags + "\n</head>", 1), 1


def ensure_robots_meta(src, fname):
    private = fname in NOINDEX
    want = ("noindex, nofollow" if private else
            "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1")
    if re.search(r'<meta\s+name="robots"', src):
        cur = re.search(r'<meta\s+name="robots"\s+content="([^"]*)"', src)
        if cur and cur.group(1) == want:
            return src, 0
        src = re.sub(r'<meta\s+name="robots"\s+content="[^"]*"',
                     f'<meta name="robots" content="{want}"', src, count=1)
        return src, 1
    return src.replace("</head>", f'\n  <meta name="robots" content="{want}"/>\n</head>', 1), 1


ALT_FALLBACK = {
    "cabana-wordmark-color.png": "Cabana logo",
    "cabana-wordmark-white.png": "Cabana logo",
    "cabana-emblem.png": "Cabana emblem",
    "cabana-appicon-master.png": "Cabana app icon",
}


def fix_images(src):
    """lazy-load + async decode below the fold; keep the first image eager for LCP."""
    n = 0
    seen_first = [False]

    def _r(m):
        nonlocal n
        tag = m.group(0)
        first = not seen_first[0]
        seen_first[0] = True
        orig = tag
        if "loading=" not in tag:
            tag = tag[:-1].rstrip("/") + (' fetchpriority="high"/>' if first
                                          else ' loading="lazy"/>')
        if "decoding=" not in tag:
            tag = tag[:-2].rstrip() + ' decoding="async"/>'
        if "alt=" not in tag:
            srcm = re.search(r'src="([^"]*)"', tag)
            key = os.path.basename(srcm.group(1)) if srcm else ""
            tag = tag[:-2].rstrip() + f' alt="{ALT_FALLBACK.get(key, "Cabana")}"/>'
        if tag != orig:
            n += 1
        return tag

    src = re.sub(r"<img\b[^>]*?/?>", _r, src)
    return src, n


PRECONNECT = (
    '\n  <link rel="preconnect" href="https://fonts.googleapis.com"/>'
    '\n  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>'
    '\n  <link rel="dns-prefetch" href="//www.googletagmanager.com"/>'
)


def ensure_preconnect(src):
    if 'rel="preconnect"' in src:
        return src, 0
    return src.replace("</head>", PRECONNECT + "\n</head>", 1), 1


def main():
    files = sorted(glob.glob(os.path.join(ROOT, "*.html")))
    report = []
    for path in files:
        fname = os.path.basename(path)
        src = orig = open(path, encoding="utf-8").read()
        src, c = fix_brand(src, fname);       stats["brand"] += c
        src, c = fix_title(src);              stats["title"] += c
        src, c = fix_desc(src);               stats["desc"] += c
        src, c = ensure_canonical(src, fname); stats["canonical"] += c
        src, c = ensure_hreflang(src, fname); stats["hreflang"] += c
        src, c = ensure_robots_meta(src, fname); stats["noindex"] += c
        src, c = fix_images(src);             stats["img"] += c
        src, c = ensure_preconnect(src);      stats["preconnect"] += c
        if src != orig:
            stats["files"] += 1
            report.append(fname)
            if not DRY:
                open(path, "w", encoding="utf-8").write(src)
    print(("DRY RUN — " if DRY else "") + "Cabana SEO repair sweep")
    print("-" * 52)
    for k, v in stats.items():
        print(f"  {k:12} {v}")
    print(f"\n  files touched: {len(report)}")


if __name__ == "__main__":
    main()
