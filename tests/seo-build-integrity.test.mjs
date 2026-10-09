/* ═══════════════════════════════════════════════════════════════════
   The static SEO build · reproducible, and honest about what it says
   ─────────────────────────────────────────────────────────────────
   CI rebuilds the static pages and fails if the result differs from
   what is committed. That only works if the build depends on nothing
   but the repository: a sitemap that stamps today's date on every URL
   fails the check every morning, and tells search engines every page
   changed when none did. These checks pin the rules that keep the
   build reproducible and the pages it marks private, private.
   ═══════════════════════════════════════════════════════════════════ */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const lastmod = JSON.parse(read('seo/data/lastmod.json'));

test('every sitemap date is the day that page last changed, as recorded', () => {
  for (const f of readdirSync(new URL('../', import.meta.url)).filter(f => /^sitemap-(core|countries|cities|stays|guides)\.xml$/.test(f))) {
    for (const [, loc, date] of read(f).matchAll(/<loc>https:\/\/cabana\.africa\/([^<]*)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)) {
      const stem = loc || 'index';
      assert.ok(lastmod[stem], `${f}: ${stem} has a recorded change date`);
      assert.equal(date, lastmod[stem].date, `${f}: ${stem}`);
    }
  }
  const src = read('seo/sitemaps.py');
  assert.doesNotMatch(src, /<lastmod>\{TODAY\}/, 'no URL is dated by the day the build ran');
});

test('a page that asks not to be indexed is never indexed by the build', () => {
  const sweep = read('seo/fix_existing.py');
  assert.match(sweep, /if cur and "noindex" in cur\.group\(1\)\.lower\(\):\s*\n\s*return src, 0/);
  for (const page of ['404.html', 'rider.html', 'partner-fleet.html', 'partner-orders.html', 'partner-rooms.html', 'order.html', 'person.html', 'tours-studio.html']) {
    assert.match(read(page), /<meta name="robots" content="noindex/, `${page} stays out of search`);
  }
  const core = read('sitemap-core.xml');
  for (const stem of ['404', 'rider', 'partner-fleet', 'order', 'tours-studio']) assert.doesNotMatch(core, new RegExp(`/${stem}</loc>`));
});

test('the index gate records what each page is, not what changed this run', () => {
  const state = JSON.parse(read('seo/data/index_state.json'));
  for (const stem of state.indexed) assert.doesNotMatch(read(`${stem}.html`), /name="robots" content="noindex/, `${stem} is listed as indexed`);
  for (const stem of state.gated) assert.match(read(`${stem}.html`), /name="robots" content="noindex/, `${stem} is listed as gated`);
});

test('generated pages carry the same footer and scripts as the rest of the site', () => {
  const footer = read('seo/data/footer.html');
  assert.doesNotMatch(footer, /sf-newsletter|sf-search-section/, 'no form ships on a page that does not load its script');
  for (const g of ['seo/generate.py', 'seo/link_mesh.py']) assert.match(read(g), /cabana-sos\.js.*cabana-support\.js[\s\S]*cabana-calm\.js/);
});
