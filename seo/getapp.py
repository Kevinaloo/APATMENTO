# -*- coding: utf-8 -*-
"""
Cabana — "Get it on Google Play" in every site footer.

The Android app is on Google Play (africa.cabana.app). This puts Google's
badge under the contact links in the footer of every page that has the
standard footer, so a visitor on any page is one tap from the app.

Idempotent: the block lives between markers and is replaced, never
duplicated, so it is safe to run after every other step (run_all.py does)
and after the generators rewrite pages.

Usage:  python3 seo/getapp.py [--dry]
"""
import os, re, sys, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DRY = "--dry" in sys.argv

PLAY = "https://play.google.com/store/apps/details?id=africa.cabana.app"
MARK = "<!-- CABANA-GETAPP -->"
END = "<!-- /CABANA-GETAPP -->"

# Pages that are not for visitors choosing an app: back-office consoles.
SKIP = {"admin.html", "support-console.html", "offline.html"}


def play_link(source, extra_class="cbn-play"):
    href = f"{PLAY}&amp;referrer=utm_source%3D{source}%26utm_medium%3Dweb"
    return (f'<a class="{extra_class}" href="{href}" target="_blank" rel="noopener" '
            f'data-cbn-play="{source}" aria-label="Get Cabana on Google Play" '
            f"onclick=\"window.gtag&amp;&amp;gtag('event','get_play_app',{{source:'{source}'}})\">"
            f'<img src="/assets/app/google-play-badge.svg" width="162" height="48" '
            f'alt="Get it on Google Play" loading="lazy" decoding="async"></a>')


def footer_block():
    return (f'{MARK}<link rel="stylesheet" href="/cabana-getapp.css">'
            f'<div class="cbn-getapp"><span class="cbn-getapp-label">Get the app</span>'
            f'{play_link("footer")}</div>{END}')


BLOCK_RE = re.compile(re.escape(MARK) + r".*?" + re.escape(END), re.S)
# The brand column ends right after the contact list.
CONTACT_RE = re.compile(r'(<div class="sf-contact">.*?</div>)(\s*</div>)', re.S)
# Guides and articles carry a plainer footer: link columns, then the legal line.
COLUMNS_RE = re.compile(r'(\s*)(</div>)(\s*</div>\s*<div class="sf-bottom")')


def inject(html):
    block = footer_block()
    if MARK in html:
        return BLOCK_RE.sub(lambda m: block, html, count=1)
    if '<footer class="site-footer"' not in html:
        return None
    m = CONTACT_RE.search(html)
    if m:
        return html[:m.end(1)] + "\n      " + block + html[m.end(1):]
    m = COLUMNS_RE.search(html)
    if m:
        return html[:m.start(2)] + "  " + block + "\n    " + html[m.start(2):]
    return None


def main():
    done = skipped = 0
    for path in sorted(glob.glob(os.path.join(ROOT, "*.html"))):
        name = os.path.basename(path)
        if name in SKIP:
            continue
        with open(path, encoding="utf-8") as f:
            html = f.read()
        out = inject(html)
        if out is None:
            skipped += 1
            continue
        if out != html:
            done += 1
            if not DRY:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(out)
    print(f"getapp: {done} footers updated, {skipped} pages without the standard footer")


if __name__ == "__main__":
    main()
