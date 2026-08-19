/* ═══════════════════════════════════════════════════════════════════════════
   RATE CARD CONSISTENCY
   ─────────────────────────────────────────────────────────────────────────
   The same six numbers are written down in four places, because each one
   needs them at a different moment:

     schema-ambassadors.sql   public.referral_rate()  — the authority
     api/rewards.js           RATE_CARD               — stamps the referral
     api/ambassadors.js       RATE_CARD               — echoed for display
     ambassadors.html / dashboard                     — shown to a human

   Four copies is three too many to keep in step by remembering. This test is
   what keeps them in step instead. It reads the actual source files rather
   than importing them, so it works without a database, without env vars, and
   without executing anything.

     node --test tests/rate-card.test.mjs
   ═══════════════════════════════════════════════════════════════════════════ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(join(ROOT, f), 'utf8');

/* The single source of truth for this test. If the business changes a rate,
   this object changes first and everything else is dragged into line. */
const TRUTH = {
  ambassador: { user: 0.15, host: 0.10, service_provider: 0.10 },
  user:       { user: 0.10, host: 0.05, service_provider: 0.05 },
};

test('SQL referral_rate() encodes the rate card', () => {
  const sql = read('schema-ambassadors.sql');
  const fn = sql.slice(sql.indexOf('function public.referral_rate'),
                       sql.indexOf('comment on function public.referral_rate'));

  // ambassador branch: 0.15 traveller / 0.10 host
  assert.match(fn, /'ambassador'[\s\S]*?0\.15[\s\S]*?0\.10/,
    'ambassador branch should read 0.15 traveller, 0.10 host');
  // ordinary branch: 0.10 traveller / 0.05 host
  assert.match(fn, /else[\s\S]*?0\.10[\s\S]*?0\.05/,
    'ordinary branch should read 0.10 traveller, 0.05 host');

  // The retired rate must not appear anywhere in the function.
  assert.ok(!/0\.20/.test(fn), 'the retired 20% rate must not survive in referral_rate()');
});

for (const file of ['api/rewards.js', 'api/ambassadors.js']) {
  test(`${file} mirrors the rate card`, () => {
    const src = read(file);
    const m = src.match(/const RATE_CARD = \{[\s\S]*?\n\};/);
    assert.ok(m, `${file} should declare a RATE_CARD`);

    if (file === 'api/rewards.js') {
      // A real object literal here, so parse and compare it exactly.
      const card = eval('(' + m[0].replace(/^const RATE_CARD = /, '').replace(/;$/, '') + ')');
      assert.deepEqual(card, TRUTH, 'rewards.js RATE_CARD must equal the truth');
    } else {
      // The ambassadors API echoes only the ambassador tier, for display.
      const card = eval('(' + m[0].replace(/^const RATE_CARD = /, '').replace(/;$/, '') + ')');
      assert.equal(card.traveller,        TRUTH.ambassador.user, 'ambassador traveller rate');
      assert.equal(card.host,             TRUTH.ambassador.host, 'ambassador host rate');
      assert.equal(card.service_provider, TRUTH.ambassador.service_provider, 'ambassador provider rate');
      assert.equal(card.days, 365, 'the term is 365 days');
    }
  });
}

test('rewards.js never falls back to a hard-coded rate', () => {
  const src = read('api/rewards.js');
  // The old payout line was `ref.referral_type === 'host' ? 0.10 : 0.20`.
  // Any ternary picking a rate off referral_type means the stamped rate is
  // being second-guessed, which is how a repricing bug gets in.
  assert.ok(!/referral_type\s*===\s*'host'\s*\?\s*0\.\d+\s*:\s*0\.\d+/.test(src),
    'payout must read the stamped rate, not recompute one inline');
  assert.match(src, /ref\.commission_rate != null/,
    'payout should prefer the rate stamped on the referral');
});

test('the ambassador rate is displayed with its basis', () => {
  // 15% of a 10% fee is 1.5% of a booking. A page that shows "15%" without
  // saying what it is 15% OF is a page that will be accused of lying.
  for (const page of ['ambassadors.html', 'ambassador-dashboard.html']) {
    const html = read(page);
    assert.match(html, /15%/, `${page} should show the ambassador traveller rate`);
    assert.match(html, /10%/, `${page} should show the ambassador host rate`);
    assert.match(html, /service fee/i,
      `${page} must state that the percentage is of the service fee`);
    assert.match(html, /365/, `${page} should state the 365-day term`);
  }
});

test('public referral copy shows the reduced ordinary rates', () => {
  const rewards = read('rewards.html');
  assert.match(rewards, /rate-pct">10%/, 'traveller referral is now 10%');
  assert.match(rewards, /rate-pct">5%/,  'host referral is now 5%');
  assert.ok(!/rate-pct">20%/.test(rewards), 'the retired 20% card must be gone');
});
