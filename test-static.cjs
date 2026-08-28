/* ═══════════════════════════════════════════════════════════════════
   STATIC GUARDS — cheap checks that run over every page and catch the
   exact bug classes that took the dashboard down. Run: node test-static.cjs
   ═══════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const pages = fs.readdirSync('.').filter(f => f.endsWith('.html'));
const scripts = ['apa-session.js', 'apa-chrome.js', 'apa-rail.js', 'brand.js'];

let fails = [];
function fail(f, msg) { fails.push(`${f}: ${msg}`); }
function ok(msg) { console.log('  ✓ ' + msg); }

/* ── 1. Every standalone script parses ─────────────────────────── */
console.log('\n[1] Script syntax');
for (const s of scripts) {
  try { new vm.Script(fs.readFileSync(s, 'utf8'), { filename: s }); ok(s); }
  catch (e) { fail(s, 'syntax: ' + e.message); }
}

/* ── 2. Inline page scripts parse ──────────────────────────────── */
console.log('\n[2] Inline script syntax');
for (const p of pages) {
  const html = fs.readFileSync(p, 'utf8');
  const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/g)]
    .map(m => m[1]);
  let bad = 0;
  blocks.forEach((b, i) => {
    if (!b.trim()) return;
    try { new vm.Script(b, { filename: `${p}#${i}` }); }
    catch (e) { bad++; fail(p, `inline #${i}: ${e.message}`); }
  });
  if (!bad) ok(`${p} (${blocks.length} blocks)`);
}

/* ── 3. TDZ ────────────────────────────────────────────────────────
   Deliberately NOT checked here.

   A regex cannot do lexical scope analysis. Two attempts at a static
   heuristic both (a) missed the real dashboard bug and (b) fired on
   correct code (`Promise.all`, `let overlay = null`). A guard that is
   simultaneously unsound and incomplete is worse than none — it trains
   you to ignore it.

   TDZ is instead caught soundly at runtime by test-boot.cjs, which
   boots the real page in jsdom. That harness DID reproduce the original
   `ReferenceError: Cannot access 'params' before initialization`, and
   passes now. Runtime is the right tool for a runtime error.
   ─────────────────────────────────────────────────────────────────── */
console.log('\n[3] TDZ → covered by test-boot.cjs (runtime, sound)');

/* ── 4. Session core present wherever supabase is used ─────────── */
console.log('\n[4] Session core coverage');
for (const p of pages) {
  const h = fs.readFileSync(p, 'utf8');
  // Matches the old jsdelivr tag and the self-hosted, version-pinned
  // bundle. Detecting only 'supabase-js@2' meant this whole check went
  // silently blind the moment the library moved to a local file.
  // Match real <script src> tags only. Searching the raw text meant a
  // code comment mentioning a filename counted as a load, which produced
  // a phantom ordering failure.
  const tagRe = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let m, iLib = -1, iSes = -1;
  while ((m = tagRe.exec(h)) !== null) {
    const src = m[1];
    if (iLib < 0 && /(?:supabase-js@2|\/vendor-supabase-[\d.]+\.js)/.test(src)) iLib = m.index;
    if (iSes < 0 && /(?:^|\/)apa-session\.js(?:$|[?#])/.test(src)) iSes = m.index;
  }
  if (iLib < 0) continue;
  if (iSes < 0) { fail(p, 'uses supabase but lacks apa-session.js'); continue; }
  if (iSes < iLib) fail(p, 'apa-session.js loads BEFORE supabase lib');
}
if (!fails.some(f => f.includes('session') || f.includes('supabase'))) ok('all supabase pages load session core, in order');

/* ── 5. No page defines a rival switchRole/openSOS ─────────────── */
console.log('\n[5] No duplicate chrome definitions');
for (const p of pages) {
  const h = fs.readFileSync(p, 'utf8');
  for (const fn of ['function switchRole', 'function openSOS', 'function updateModeUI']) {
    if (h.includes(fn)) fail(p, `redefines ${fn} (apa-chrome.js owns it)`);
  }
}
if (!fails.some(f => f.includes('redefines'))) ok('chrome functions defined once, in apa-chrome.js');

/* ── 5b. No control points at an element that doesn't exist ────────
   The global search button called openSearch(), which did
   document.getElementById('gsearch-overlay').classList.add(...) — but
   that overlay was never in any page's markup. Every click threw. A
   toolbar control that reaches for a missing element is always a bug. */
console.log('\n[5b] No handlers pointing at missing elements');
{
  let dead = 0;
  for (const p of pages) {
    const h = fs.readFileSync(p, 'utf8');
    // ids that JS resolves then immediately dereferences
    const used = [...h.matchAll(/getElementById\(\s*['"]([\w-]+)['"]\s*\)\s*\./g)].map(m => m[1]);
    for (const id of new Set(used)) {
      // In the static markup?
      if (new RegExp(`id=["']${id}["']`).test(h)) continue;
      // Or built at runtime? (e.g. `modal.id = 'tenant-verify-modal'`)
      if (new RegExp(`\\.id\\s*=\\s*['"]${id}['"]`).test(h)) continue;
      if (new RegExp(`id=\\\\?["']${id}\\\\?["']`).test(h)) continue;  // inside a template string
      // Or injected via innerHTML with an escaped quote (e.g. `+'<input id="pf-avg"...'`)
      if (new RegExp(`id=\\\\?"${id}\\\\?"`).test(h)) continue;
      if (h.includes(`id=\\"${id}\\"`)) continue;
      // Or built by a field-factory call: field('pf-avg', ...)
      if (new RegExp(`field\\(\\s*['"]${id}['"]\\s*,`).test(h)) continue;
      // Or id set inside a JS string used with innerHTML: +"<... id=\"pf-avg\"..."
      if (h.includes(`'<input id="\'+id+\'"`) || h.includes(`"<input id='"+id+"'"`)) continue;
      fail(p, `JS dereferences #${id}, which is never created or in the markup`);
      dead++;
    }
  }
  if (!dead) ok('every dereferenced element id exists in its page');
}

/* ── 6. Viewport meta on every page ────────────────────────────── */
console.log('\n[6] Responsive viewport');
for (const p of pages) {
  const h = fs.readFileSync(p, 'utf8');
  if (!/name="viewport"[^>]*width=device-width/.test(h)) fail(p, 'missing/!responsive viewport meta');
}
if (!fails.some(f => f.includes('viewport'))) ok('all pages have a responsive viewport');

/* ── report ────────────────────────────────────────────────────── */
console.log('\n' + '─'.repeat(58));
if (fails.length) {
  console.log(`❌ ${fails.length} issue(s):`);
  fails.forEach(f => console.log('   • ' + f));
  process.exit(1);
}
console.log('✅ ALL STATIC GUARDS PASS');
