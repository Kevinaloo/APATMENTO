import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const vercel = JSON.parse(read('vercel.json'));
const ignored = new Set(read('.vercelignore').split(/\r?\n/).filter(Boolean));
const utilities = read('api/utilities.js');
const scheduler = read('supabase/migrations/20260908190000_free_tier_match_offer_scheduler.sql');

test('Vercel stays below the 12-function Hobby ceiling', () => {
  const entries = readdirSync(new URL('../api', import.meta.url))
    .filter(file => file.endsWith('.js'))
    .map(file => 'api/' + file);
  assert.equal(entries.filter(file => !ignored.has(file)).length, 11);
});

test('scraping keeps its public route while sharing utilities capacity', () => {
  assert.ok(ignored.has('api/scrape.js'));
  assert.deepEqual(
    vercel.rewrites.find(route => route.source === '/api/scrape'),
    { source: '/api/scrape', destination: '/api/utilities?action=scrape' }
  );
  assert.match(utilities, /import scrapeHandler from '\.\/scrape\.js'/);
  assert.match(utilities, /action === 'scrape'/);
});

test('hourly expiry uses protected Supabase scheduling, not Vercel Hobby cron', () => {
  assert.equal(vercel.crons.length, 2);
  assert.ok(vercel.crons.every(job => !job.path.includes('expire-match-offers')));
  assert.match(scheduler, /'cabana-match-offer-expiry'/);
  assert.match(scheduler, /'7 \* \* \* \*'/);
  assert.match(scheduler, /'Authorization', 'Bearer ' \|\| v_secret/);
  assert.match(utilities, /isCronAuthorized\(req\)/);
});
