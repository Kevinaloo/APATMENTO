#!/usr/bin/env python3
"""
Assert the invariant that makes relocating the Supabase bootstrap safe:
every inline script that consumes the supabase/session globals must be
preceded, in document order, by the library and by apa-session.js.

Blocking <script> tags execute in document order at their position, so if
this holds the relocated page behaves identically to the original.
"""
import re, sys

SRC  = re.compile(r'<script\b[^>]*\bsrc=["\']([^"\']+)["\'][^>]*>')
ANY  = re.compile(r'<script\b([^>]*)>(.*?)</script>', re.S)
# supabase.co inside a REST URL is not a use of the SDK global. index.html
# talks to Supabase over plain fetch() and needs no library at all.
# Excluded: 'supabase.co' inside a REST URL (index.html uses plain fetch),
# and quoted keys like 'supabase.auth' that dashboard.html reads straight
# out of localStorage on purpose, before any library has loaded.
CONS = re.compile(
    r'''(?<!['"])\bsupabase\s*\.(?!co\b|auth['"])'''
    r'''|{\s*createClient\s*}\s*=\s*supabase'''
    r'''|\bApaSession\b''')

# A script that tests for the global before touching it, and keeps trying,
# tolerates the library arriving later. index.html does exactly this: it
# paints guest state at once and polls for the session core.
GUARDED = re.compile(
    r'window\.ApaSession|window\.supabase|typeof\s+supabase|typeof\s+ApaSession')

BLOCK_COMMENT = re.compile(r'/\*.*?\*/', re.S)
LINE_COMMENT  = re.compile(r'(?<![:\w])//[^\n]*')

def strip_comments(js):
    """Prose in a comment is not a consumer. Matching raw text made every
    explanatory comment mentioning ApaSession look like a hard dependency."""
    return LINE_COMMENT.sub('', BLOCK_COMMENT.sub('', js))

def check(path):
    h = open(path, encoding='utf-8').read()
    lib = ses = None
    problems = []
    for m in ANY.finditer(h):
        attrs, body = m.group(1), m.group(2)
        sm = SRC.match(m.group(0))
        if sm:
            src = sm.group(1).split('?')[0]
            deferred = ' defer' in attrs or ' async' in attrs
            if re.search(r'(supabase-js@2|/vendor-supabase-[\d.]+\.js)', src):
                lib = ('deferred' if deferred else 'sync', m.start())
            elif src.endswith('/apa-session.js'):
                ses = ('deferred' if deferred else 'sync', m.start())
            continue
        code = strip_comments(body)
        if CONS.search(code):
            if GUARDED.search(code):
                continue    # defers gracefully; not a binding constraint
            if lib is None:
                problems.append(f'inline consumer at {m.start()} runs before the library')
            elif lib[0] == 'deferred':
                problems.append(f'inline consumer at {m.start()} runs before DEFERRED library')
            if ses is None:
                problems.append(f'inline consumer at {m.start()} runs before apa-session.js')
            elif ses[0] == 'deferred':
                problems.append(f'inline consumer at {m.start()} runs before DEFERRED apa-session.js')
            break   # first consumer is the binding constraint
    return problems

if __name__ == '__main__':
    bad = 0
    for p in sys.argv[1:]:
        pr = check(p)
        if pr:
            bad += 1
            print(f'❌ {p}')
            for x in pr: print('   ' + x)
    print(f'{"❌ "+str(bad)+" page(s) violate the invariant" if bad else "✅ bootstrap order invariant holds on all "+str(len(sys.argv)-1)+" page(s)"}')
    sys.exit(1 if bad else 0)
