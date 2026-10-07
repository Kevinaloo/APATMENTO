/* ═══════════════════════════════════════════════════════════════════
   Private review requests · who is asked, when, and only once
   ═══════════════════════════════════════════════════════════════════ */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sendReviewRequests, stageFor } from '../api/lib/_review-requests.js';

const read = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const TODAY = Math.floor(Date.parse('2026-10-20T00:00:00Z') / 864e5);
const day = n => new Date((TODAY - n) * 864e5).toISOString().slice(0, 10);

function harness({ bookings, reviews = [], sent = [], listings = [] }) {
  const calls = [], notes = [];
  const db = async path => {
    calls.push(path);
    if (path.startsWith('apartment_bookings')) return bookings;
    if (path.startsWith('private_reviews')) return reviews;
    if (path.startsWith('notifications')) return sent;
    if (path.startsWith('listings')) return listings;
    throw new Error('unexpected ' + path);
  };
  const notify = async n => { notes.push(n); return { ok: true }; };
  return { calls, notes, run: () => sendReviewRequests({ db, notify, today: TODAY }) };
}
const stay = (id, checkoutAgo, extra = {}) => ({
  id, guest_id: 'g-' + id, host_id: 'h-' + id, apartment_name: 'Kilimani Loft', guest_name: 'Amani Otieno',
  checkout_date: day(checkoutAgo), ...extra,
});

test('stages: ask on checkout evening, a reminder, a last call, silence in between', () => {
  assert.deepEqual([0, 1, 3, 4, 5, 9, 10, 24, 25, 29, 30].map(stageFor),
    ['ask', 'ask', 'ask', null, 'reminder', 'reminder', null, null, 'last', 'last', null]);
});

test('both sides are asked, each with a link straight to their own form', async () => {
  const h = harness({ bookings: [stay('b1', 0)] });
  const out = await h.run();
  assert.equal(out.sent, 2);
  const [guest, host] = h.notes;
  assert.equal(guest.user_id, 'g-b1'); assert.equal(guest.kind, 'review');
  assert.equal(guest.url, '/my-bookings.html?review=b1');
  assert.match(guest.title, /How was Kilimani Loft\?/);
  assert.equal(host.user_id, 'h-b1'); assert.equal(host.url, '/partner-bookings.html?review=b1');
  assert.match(host.title, /How was Amani\?/, 'hosts see the guest first name only');
  assert.deepEqual(guest.meta, { booking_id: 'b1', stage: 'ask', role: 'guest' });
  assert.match(h.calls[0], /checkout_date=gte\.2026-09-21&checkout_date=lte\.2026-10-20/);
  assert.match(h.calls[0], /cancelled_at=is\.null/);
});

test('nobody is asked twice for a stage, or at all once they have written', async () => {
  const h = harness({
    bookings: [stay('b1', 6), stay('b2', 6), stay('b3', 12)],
    reviews: [{ booking_id: 'b1', direction: 'guest_to_host' }],
    sent: [{ user_id: 'h-b1', meta: { booking_id: 'b1', stage: 'reminder' } }],
  });
  const out = await h.run();
  assert.deepEqual(h.notes.map(n => n.user_id), ['g-b2', 'h-b2'], 'b1 guest wrote, b1 host already reminded, b3 is between stages');
  assert.equal(out.skipped_reviewed, 1);
  assert.equal(out.skipped_sent, 1);
  assert.match(h.notes[0].title, /Still time/);
});

test('a host without host_id is found through the listing; a self-booking asks nobody to rate themselves', async () => {
  const h = harness({
    bookings: [stay('b1', 26, { host_id: null, listing_id: 'L1' }), stay('b2', 1, { host_id: 'same', guest_id: 'same' })],
    listings: [{ id: 'L1', partner_id: 'owner-1' }],
  });
  await h.run();
  assert.deepEqual(h.notes.map(n => n.user_id), ['g-b1', 'owner-1']);
  assert.match(h.notes[0].title, /Last chance/);
});

test('the route is cron-gated and scheduled at 18:00 Nairobi', () => {
  const util = read('api/utilities.js');
  assert.match(util, /action === 'review-requests'/);
  assert.match(util, /async function handleReviewRequests[\s\S]{0,400}maintenanceAuthorized\(req\)/);
  const sql = read('supabase/migrations/20261007120000_review_requests.sql');
  assert.match(sql, /cron\.schedule\('cabana-review-requests', '0 15 \* \* \*'/);
  assert.match(sql, /action=review-requests/);
  assert.match(read('api/lib/_notify.js'), /persist, meta \}\)/, 'meta must reach the notification row the dedupe reads');
  assert.match(read('api/push-send.js'), /'match', 'review'\]\)/, 'people without push get the request by email');
});

test('the review forms stay open as long as the database accepts a review', () => {
  const guest = read('my-bookings.html');
  assert.match(guest, /if \(canReview\(b\)\)/);
  assert.match(guest, /b\.status === 'checked_in' \|\| b\.status === 'completed' \|\| b\.checked_in_at/);
  assert.match(guest, /CB\.today\(\) <= end \+ 30/);
  assert.match(guest, /openReviewFromLink\(\)/);
  const host = read('partner-bookings.html');
  assert.match(host, /id="rate-panel"/);
  assert.match(host, /ApaTrust\.review\.submit\(b, 'host_to_guest'/);
  assert.match(host, /loadGuestReviews\(uid\)/);
  assert.doesNotMatch(read('apa-trust.js'), /\.eq\('status', 'checked_in'\)\s*\n\s*\.gte\('checkout_date'/);
});
