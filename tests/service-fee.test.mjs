/* ═══════════════════════════════════════════════════════════════════════════
   THE SERVICE FEE LADDER, IN EVERY PLACE IT IS WRITTEN DOWN
   ─────────────────────────────────────────────────────────────────────────
   Cabana's fee is a fixed amount banded by booking value. It is written down
   in three places and Postgres is the only one that decides anything:

     cabana_secure_apartment_booking()  stamps service_fee on the booking
     api/lib/_fees.js                   the payout path's fallback + basis
     apa-fees.js                        the browser mirror, for explaining it

   Four screens once said "our service fee is 10% of the booking value". It
   never was, on any booking, and the payout path believed it — paying an
   ambassador seven and a half times over on a large stay. This test is what
   stops that sentence coming back.

     node --test tests/service-fee.test.mjs
   ═══════════════════════════════════════════════════════════════════════════ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { serviceFee, feeBasis, feeLabel } from '../api/lib/_fees.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(join(ROOT, f), 'utf8');

/* The truth, stated once. If the business changes the fee, it changes here
   first and drags the SQL, the server and the browser into line. */
const LADDER = { threshold: 5000, below: 300, above: 800 };

test('Postgres stamps the ladder onto the booking', () => {
  const sql = read('supabase/migrations/20260818170000_secure_stay_booking_integrity.sql');
  const m = sql.match(/v_service_fee\s*:=\s*case\s+when\s+v_stay_total\s*<\s*(\d+)\s+then\s+(\d+)\s+else\s+(\d+)\s+end/);
  assert.ok(m, 'the stay trigger should compute service_fee from a banded case');
  assert.equal(Number(m[1]), LADDER.threshold, 'band threshold');
  assert.equal(Number(m[2]), LADDER.below,     'fee below the threshold');
  assert.equal(Number(m[3]), LADDER.above,     'fee at or above the threshold');
});

test('the server ladder agrees with Postgres', () => {
  assert.equal(serviceFee('stays', 0),                        LADDER.below);
  assert.equal(serviceFee('stays', LADDER.threshold - 1),     LADDER.below);
  assert.equal(serviceFee('stays', LADDER.threshold),         LADDER.above);
  assert.equal(serviceFee('stays', 400000),                   LADDER.above,
    'the fee must not scale with the booking');

  // Tours and events are face value. A fee here would be a broken promise
  // made on every tour page on the site.
  assert.equal(serviceFee('tours', 90000),  0);
  assert.equal(serviceFee('events', 90000), 0);

  // An unknown service earns nobody anything rather than quietly earning
  // somebody the stays fee.
  assert.equal(serviceFee('typo', 90000), 0);
});

test('the browser mirror agrees with the server', () => {
  const src = read('apa-fees.js');
  const globalStub = {};
  new Function('window', src)(globalStub);
  const ApaFees = globalStub.ApaFees;
  assert.ok(ApaFees, 'apa-fees.js should define ApaFees');

  for (const [service, amount] of [
    ['stays', 1], ['stays', 4999], ['stays', 5000], ['stays', 250000],
    ['tours', 9000], ['events', 9000], ['roommates', 12000], ['nonsense', 9000],
  ]) {
    assert.equal(ApaFees.fee(service, amount), serviceFee(service, amount),
      `${service} at ${amount} must agree between apa-fees.js and _fees.js`);
  }
  assert.equal(ApaFees.label('stays'), feeLabel('stays'));
});

test('the booking\'s own stamped fee always wins', () => {
  // A zero fee is a fee we charged, not a missing value. Reading it as
  // missing is how a face-value tour would start paying a stays commission.
  assert.equal(feeBasis({ stamped: 0,    service: 'stays', subtotal: 90000 }), 0);
  assert.equal(feeBasis({ stamped: '800', service: 'stays', subtotal: 1 }),   800);

  // Only a genuinely absent value falls through to the ladder — that is for
  // rows written before the trigger existed.
  assert.equal(feeBasis({ stamped: null,      service: 'stays', subtotal: 90000 }), LADDER.above);
  assert.equal(feeBasis({ stamped: undefined, service: 'stays', subtotal: 100 }),   LADDER.below);
});

test('nothing claims the fee is a percentage any more', () => {
  const pages = [
    'AMBASSADORS.md', 'schema-ambassadors.sql', 'api/rewards.js',
    'api/ambassadors.js', 'api/lib/_ambassadors.js', 'referral.js',
    'ambassadors.html', 'ambassador-dashboard.html', 'rewards.html',
  ];
  // The exact claim, in the shapes it was actually written in.
  const claim = /(service |platform )?fee (is|of|itself) (about )?\d{1,2}%|\d{1,2}% of (the )?(booking|gross)/i;
  for (const page of pages) {
    const src = read(page);
    // _fees.js and the docs are allowed to describe the bug they fixed, but
    // only inside a comment that says so.
    const withoutPostmortems = src.replace(/used to [\s\S]{0,400}?(?=\n\n)/gi, '')
                                  .replace(/previously written down[\s\S]{0,400}?(?=\n\n)/gi, '');
    assert.ok(!claim.test(withoutPostmortems),
      `${page} still describes the service fee as a percentage`);
  }
});
