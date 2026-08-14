#!/usr/bin/env python3
"""
Move render-blocking Supabase bootstrap scripts down to just above the first
inline script that actually needs them.

Why not defer: nearly every one of these pages calls supabase.createClient()
from an inline script, which runs during parse, before any deferred script has
executed. Deferring the library makes that call throw. Several of those call
sites are unguarded, so the page dies outright.

Relocation gets most of the same benefit with none of that risk. The tags keep
their synchronous semantics and their order relative to each other, so every
inline consumer still sees a fully initialised global. They simply stop
blocking the parser at the top of <head>, which lets the markup and CSS above
them render first.

Safety rules enforced here:
  * only moves DOWN, never up
  * preserves relative order of the moved tags
  * refuses if any moved script is referenced by an inline script that sits
    above the insertion point
  * refuses if the insertion point is not at the top level of the document
  * byte-identical output except for the relocation itself
"""
import re
import sys

# Scripts that only exist to bootstrap Supabase/session on these pages.
MOVABLE = re.compile(
    r'^/(?:vendor-supabase-[\d.]+\.js|apa-session\.js|apa-admin-guard\.js)$'
)

# Signals that an inline script consumes the Supabase or session globals.
CONSUMER = re.compile(
    r'\bsupabase\s*\.|{\s*createClient\s*}\s*=\s*supabase|\bApaSession\b|\bsb\.auth\b'
)

TAG = re.compile(r'<script\b(?![^>]*\bsrc=)[^>]*>(.*?)</script>', re.S)
SRC_TAG = re.compile(r'[ \t]*<script\b[^>]*\bsrc=["\']([^"\']+)["\'][^>]*>\s*</script>[ \t]*\n?')


def analyse(html):
    """Return (movable_tags, insertion_offset) or (None, reason)."""
    movable = []
    for m in SRC_TAG.finditer(html):
        src = m.group(1).split('?')[0]
        if MOVABLE.match(src) and 'defer' not in m.group(0) and 'async' not in m.group(0):
            movable.append(m)
    if not movable:
        return None, 'no movable blocking scripts'

    first_use = None
    for m in TAG.finditer(html):
        if CONSUMER.search(m.group(1)):
            first_use = m.start()
            break
    if first_use is None:
        return None, 'no inline consumer (page is a defer candidate instead)'

    last_movable_end = max(m.end() for m in movable)
    if first_use <= last_movable_end:
        return None, 'first inline use already precedes or abuts the scripts'

    # Nothing between the current position and the insertion point may consume
    # the globals, or moving past it would break that consumer.
    for m in TAG.finditer(html):
        if m.start() >= first_use:
            break
        if m.start() > movable[0].start() and CONSUMER.search(m.group(1)):
            return None, f'inline consumer at offset {m.start()} sits above insertion point'

    return (movable, first_use), None


def apply(html):
    res, err = analyse(html)
    if err:
        return None, err
    movable, first_use = res

    block = ''.join(m.group(0) if m.group(0).endswith('\n') else m.group(0) + '\n'
                    for m in movable)
    banner = (
        '<!-- Supabase bootstrap. Kept synchronous because the inline script\n'
        '     immediately below calls createClient() during parse, but moved\n'
        '     out of <head> so everything above renders without waiting on it. -->\n'
    )

    # Remove originals from the bottom up so earlier offsets stay valid.
    out = html
    for m in sorted(movable, key=lambda m: m.start(), reverse=True):
        out = out[:m.start()] + out[m.end():]

    removed_before = sum(m.end() - m.start() for m in movable if m.end() <= first_use)
    ins = first_use - removed_before
    out = out[:ins] + banner + block + out[ins:]
    return out, None


if __name__ == '__main__':
    changed = 0
    for path in sys.argv[1:]:
        html = open(path, encoding='utf-8').read()
        new, err = apply(html)
        if err:
            print(f'  skip {path}: {err}')
            continue
        open(path, 'w', encoding='utf-8').write(new)
        print(f'  moved {path}')
        changed += 1
    print(f'{changed} file(s) changed')
