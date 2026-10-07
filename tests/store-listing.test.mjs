/* ═══════════════════════════════════════════════════════════════════
   Store listing and site claims · Google Play Metadata policy
   ─────────────────────────────────────────────────────────────────
   Play rejected 1.1.1 (3) for "Cabana is Africa's #1 zero-commission
   travel super-app". Play bans ranking and performance claims (#1,
   best, top, App of the Year) in the listing, and the app opens the
   site, so the site must not make them about Cabana either. Cabana
   says what it does: zero commission, hosts keep 100%, M-Pesa built
   in, Cabana Match.
   ═══════════════════════════════════════════════════════════════════ */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = f => readFileSync(new URL(f, root), 'utf8');
const listing = read('android/store-listing/en-GB.md');
const block = heading => listing.split(`## ${heading}`)[1].split('```')[1].replace(/^\n|\n$/g, '');

const BANNED = /#\s?1\b|\bno\.?\s?1\b|number one|\bbest\b|\btop\b|leading|largest|fastest|most popular|award|app of the year|\bfirst\b|world-first|\bonly\b|unmatched|unbeatable|guaranteed/i;

test('the Play listing fits Google\'s limits and makes no ranking claims', () => {
  for (const [heading, max] of [['App name', 30], ['Short description', 80], ['Full description', 4000]]) {
    const text = block(heading);
    assert.ok(text.length > 0 && text.length <= max, `${heading} is ${text.length} characters, the limit is ${max}`);
    const hit = text.match(BANNED);
    assert.equal(hit, null, `${heading} says "${hit?.[0]}"`);
  }
  assert.doesNotMatch(block('App name'), /[A-Z]{4,}|!|\p{Extended_Pictographic}/u, 'no caps, exclamation marks or emoji in the title');
});

// Claims Cabana must never make about itself on the site the app opens.
const SELF_CLAIMS = [
  /(Africa|Kenya|Nigeria)(['’]|&#x27;|&#39;)s #1/i,
  /#1 (zero|pick|choice|travel|booking)/i,
  /(world|continent|Africa|Kenya|Nigeria)(['’]|&#x27;|&#39;)s first/i,
  /world-first/i,
  /best travel app/i,
  /(Africa|Kenya)(['’]|&#x27;|&#39;)s (best|top|leading) (airbnb|travel|booking|short)/i,
  /Cabana is the (only|best)/i,
  /the price the guest pays/i,
  /guests? pays? exactly/i,
];

test('no page says Cabana is #1, the best or the first', () => {
  const pages = readdirSync(root).filter(f => /\.(html|js|txt)$/.test(f) && !f.startsWith('vendor-'));
  const found = [];
  for (const f of pages) {
    const text = read(f);
    for (const re of SELF_CLAIMS) {
      const m = text.match(re);
      if (m) found.push(`${f}: "${m[0]}"`);
    }
  }
  assert.deepEqual(found, []);
});
