/* ══════════════════════════════════════════════════════════════════════
   Cabana · the contact surface
   tests/contact-surface.test.mjs

   Cabana withdrew its phone number and its WhatsApp link. That decision
   was applied across 370 files at once, which means the only thing
   stopping it coming back is a test that walks the tree and looks.

   A single page that still says "+254 716 206 494" is a guest who calls
   a number nobody answers, and does not call back.
══════════════════════════════════════════════════════════════════════ */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

/* Directories with nothing user-facing in them. seo/ IS walked: it
   generates the footers on hundreds of pages, so a number left in a
   template there is a number that comes back on the next build. */
const SKIP_DIRS = new Set(['node_modules', '.git', 'tests', '.github', '.well-known']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(html|js|css|py|json)$/.test(name)) out.push(full);
  }
  return out;
}

const FILES = walk(ROOT);
const rel = (f) => f.slice(ROOT.length);

/* This file necessarily contains the strings it is looking for. */
const SELF = /tests\//;

function scan(pattern, { allow = () => false } = {}) {
  const hits = [];
  for (const f of FILES) {
    if (SELF.test(rel(f))) continue;
    const text = readFileSync(f, 'utf8');
    for (const m of text.matchAll(pattern)) {
      const line = text.slice(0, m.index).split('\n').length;
      const context = text.slice(Math.max(0, m.index - 90), m.index + 90).replace(/\s+/g, ' ');
      if (allow(rel(f), context)) continue;
      hits.push(`${rel(f)}:${line} — …${context}…`);
    }
  }
  return hits;
}

test('the retired Cabana phone number appears nowhere', () => {
  const hits = scan(/254\s?716\s?206\s?494|254716206494/g, {
    /* An explanatory comment naming the retired number is how a future
       contributor knows not to put it back. */
    allow: (_file, ctx) => /retired|no longer|used to publish|RETIRED/i.test(ctx),
  });
  assert.deepEqual(hits, [], `the retired number is still published:\n${hits.join('\n')}`);
});

test('no page dials or texts a Cabana number', () => {
  const hits = scan(/href=["']?(?:tel|sms|callto):\+?2547?\d{6,}/gi);
  assert.deepEqual(hits, [], `a dial link survived:\n${hits.join('\n')}`);
});

test('no page links to a Cabana WhatsApp thread', () => {
  /* A host's own number, rendered from listing data, is theirs and
     stays. A LITERAL number in our source was ours. */
  const hits = scan(/wa\.me\/\d{6,}/g);
  assert.deepEqual(hits, [], `a hard-coded WhatsApp link survived:\n${hits.join('\n')}`);
});

test('structured data publishes no telephone', () => {
  const hits = scan(/"telephone"\s*:\s*"[^"]+"/g, {
    allow: (_f, ctx) => /No "telephone"|does not run a public phone/i.test(ctx),
  });
  assert.deepEqual(hits, [], `a phone number is still in JSON-LD:\n${hits.join('\n')}`);
});

test('the partnerships address is partnership@, not partners@', () => {
  const hits = scan(/\bpartners@cabana\.africa\b/g);
  assert.deepEqual(hits, [], `the old address survived:\n${hits.join('\n')}`);
});

test('both Cabana addresses are actually reachable in the product', () => {
  const brand = readFileSync(join(ROOT, 'api/lib/_brand.js'), 'utf8');
  assert.match(brand, /connect@cabana\.africa/);
  assert.match(brand, /partnership@cabana\.africa/);
  assert.match(brand, /phone:\s*null/, 'the brand module should record that there is no phone, explicitly');
  assert.match(brand, /whatsapp:\s*null/);
});

test('every page carries the support console', () => {
  const missing = [];
  /* The desk, the admin console and the offline fallback are the three
     surfaces where a guest support widget would be wrong. */
  const exempt = new Set(['support-console.html', 'admin.html', 'offline.html']);
  for (const f of FILES) {
    if (!f.endsWith('.html')) continue;
    const name = rel(f);
    if (name.includes('/')) continue;                 // page fragments under seo/ are not pages
    if (exempt.has(name)) continue;
    const text = readFileSync(f, 'utf8');
    if (!text.includes('cabana-support.js')) missing.push(name);
  }
  assert.deepEqual(missing, [], `pages with no way to reach support:\n${missing.join('\n')}`);
});

test('the pages every support link points at exist', () => {
  for (const page of ['help.html', 'unsubscribe.html', 'support-console.html']) {
    assert.doesNotThrow(() => statSync(join(ROOT, page)), `${page} is linked to but missing`);
  }
});
