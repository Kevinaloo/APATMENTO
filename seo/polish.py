# -*- coding: utf-8 -*-
"""
Cabana — final polish pass. Fixes issues only visible in the served HTML.

  1. CLEAN URLS. vercel.json sets cleanUrls:true, so every internal
     /page.html link answers with a 308 to /page. Thousands of redirect hops
     waste crawl budget and add a round trip for every user. Rewrites internal
     links to their canonical clean form.

  2. FOOTER SCOPE. The footer still described Cabana as "across Kenya and East
     Africa" on every page, contradicting the continental positioning and the
     54 country pages.

  NOT DONE HERE: the twitter:site handle. It still reads @apatmento because
  that account exists. Pointing the tag at an unregistered @cabanaafrica would
  break card attribution outright, which is worse than an off-brand handle.
  Rename the account first, then update this in one pass.

Usage: python3 seo/polish.py [--dry]
"""
import os, re, sys, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DRY = "--dry" in sys.argv

# Real files on disk are the source of truth for what may be cleaned.
PAGES = {os.path.basename(f)[:-5] for f in glob.glob(os.path.join(ROOT, "*.html"))}

OLD_FOOTER = ("Zero-commission travel across Kenya and East Africa. Stays, flights, "
              "safaris, events, rides, food and car hire. One account, one checkout.")
NEW_FOOTER = ("Zero-commission travel across all 54 African countries. Stays, flights, "
              "safaris, events, rides, food and car hire. Hosts and operators keep 100%.")

stats = dict(cleanurl=0, footer=0, files=0)


def clean_urls(src):
    n = 0

    def _r(m):
        nonlocal n
        stem, tail = m.group(1), m.group(2)
        if stem not in PAGES:
            return m.group(0)
        n += 1
        # group(2) is optional, so it is None when the URL carries no
        # ?query or #fragment. Interpolating that straight into the
        # f-string emitted href="/toursNone" — 8,546 dead links across
        # 358 pages before it was caught.
        return f'href="/{stem}{tail or ""}"'

    src = re.sub(r'href="/([a-z0-9\-]+)\.html([?#][^"]*)?"',
                 lambda m: _r(re.match(r'href="/([a-z0-9\-]+)\.html([?#][^"]*)?"',
                                       m.group(0))) or m.group(0), src)
    return src, n


def main():
    for path in sorted(glob.glob(os.path.join(ROOT, "*.html"))):
        src = orig = open(path, encoding="utf-8").read()

        src, n = clean_urls(src)
        stats["cleanurl"] += n

        if OLD_FOOTER in src:
            src = src.replace(OLD_FOOTER, NEW_FOOTER)
            stats["footer"] += 1

        if src != orig:
            stats["files"] += 1
            if not DRY:
                open(path, "w", encoding="utf-8").write(src)

    print(("DRY — " if DRY else "") + "Cabana polish pass")
    print("-" * 40)
    for k, v in stats.items():
        print(f"  {k:10} {v}")


if __name__ == "__main__":
    main()
