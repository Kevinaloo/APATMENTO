# -*- coding: utf-8 -*-
"""
Cabana — full SEO build. Run after any content change, then commit.

    python3 seo/run_all.py

Order matters: repair -> generate -> link -> schema -> sitemaps.
Schema runs after generation so newly created pages get the entity graph;
sitemaps run last so they reflect exactly what exists on disk.
"""
import subprocess, sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
STEPS = [
    ("Repair sweep       ", "fix_existing.py"),
    ("Country hubs       ", "generate.py"),
    ("City x category    ", "generate_city.py"),
    ("Answer pages       ", "generate_answers.py"),
    ("Internal link mesh ", "link_mesh.py"),
    ("Schema injection   ", "inject_schema.py"),
    ("Sitemaps           ", "sitemaps.py"),
    ("Polish pass        ", "polish.py"),
    ("Verify             ", "verify.py"),
]
fail = 0
for label, script in STEPS:
    r = subprocess.run([sys.executable, os.path.join(HERE, script)],
                       capture_output=True, text=True)
    ok = r.returncode == 0
    fail += not ok
    print(f"{'OK  ' if ok else 'FAIL'} {label} {script}")
    if not ok:
        print(r.stderr[-800:])
print("\nBuild complete." if not fail else f"\n{fail} step(s) failed.")
sys.exit(1 if fail else 0)
