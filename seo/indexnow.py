# -*- coding: utf-8 -*-
"""
Cabana — IndexNow ping.

IndexNow tells Bing, Yandex, Seznam and Naver about new or changed URLs
immediately instead of waiting for a crawl. Bing's index feeds ChatGPT search,
so this has direct AI-visibility value beyond classic search.

Google does not participate in IndexNow; for Google, discovery comes from the
sitemaps plus Search Console.

    python3 seo/indexnow.py            # ping every indexable URL
    python3 seo/indexnow.py --changed  # only URLs changed in the last commit
"""
import os, sys, json, glob, subprocess, urllib.request, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HOST = "cabana.africa"
KEY = "cabana2026apatmentoindexnow8f4e9b"
KEY_LOCATION = f"https://{HOST}/{KEY}.txt"
ENDPOINT = "https://api.indexnow.org/IndexNow"
BATCH = 10000


def indexable():
    urls = []
    for f in sorted(glob.glob(os.path.join(ROOT, "*.html"))):
        stem = os.path.basename(f)[:-5]
        src = open(f, encoding="utf-8").read()
        if re.search(r'name="robots"\s+content="[^"]*noindex', src):
            continue
        urls.append(f"https://{HOST}/" if stem == "index" else f"https://{HOST}/{stem}")
    return urls


def changed():
    try:
        out = subprocess.run(["git", "-C", ROOT, "diff", "--name-only", "HEAD~1", "HEAD"],
                             capture_output=True, text=True, check=True).stdout
    except subprocess.CalledProcessError:
        return indexable()
    stems = [os.path.basename(p)[:-5] for p in out.split() if p.endswith(".html")]
    live = set(os.path.basename(f)[:-5] for f in glob.glob(os.path.join(ROOT, "*.html")))
    return [f"https://{HOST}/" if s == "index" else f"https://{HOST}/{s}"
            for s in stems if s in live]


def ping(urls):
    if not urls:
        print("nothing to submit")
        return 0
    sent = 0
    for i in range(0, len(urls), BATCH):
        chunk = urls[i:i + BATCH]
        body = json.dumps({"host": HOST, "key": KEY,
                           "keyLocation": KEY_LOCATION, "urlList": chunk}).encode()
        req = urllib.request.Request(ENDPOINT, data=body,
                                     headers={"Content-Type": "application/json; charset=utf-8"})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                print(f"IndexNow {r.status} for {len(chunk)} URLs")
                sent += len(chunk)
        except Exception as e:
            print(f"IndexNow submission failed: {e}")
            return 1
    print(f"submitted {sent} URLs")
    return 0


if __name__ == "__main__":
    sys.exit(ping(changed() if "--changed" in sys.argv else indexable()))
