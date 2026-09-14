import { test } from 'node:test';
import assert from 'node:assert/strict';
import { insert, one, update } from '../api/lib/_db.js';
import { hostTool, applyHostProposal, reviewListing } from '../api/lib/_host-copilot.js';
import { evaluatePhotos, validatePhotoReview, publicPhotoUrl, diagnosePerformance } from '../api/lib/_host-insights.js';
import { priceStay } from '../api/lib/_apa-agent.js';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const caller = { kind: 'user', userId: 'host-test' };
async function fixture(name) {
  return insert('listings', { id: name, host_id: caller.userId, partner_id: caller.userId, title: 'Garden studio', description: 'A studio in Karen.', photos: ['a', 'b', 'c', 'd'], currency: 'KES' });
}
test('review covers all ten areas without inventing image or funnel evidence', () => {
  const review = reviewListing({ photos: ['a'] });
  assert.equal(review.length, 10);
  assert.match(review[0].limitation, /not been visually evaluated/);
  assert.equal(review.find(r => r.area === 'conversion').evidence, 'Unavailable');
});
test('anonymous and other hosts cannot inspect or mutate a listing', async () => {
  await fixture('host-private');
  assert.equal((await hostTool({ kind: 'guest' }, { operation: 'list' })).error, 'sign_in_required');
  await assert.rejects(hostTool({ kind: 'user', userId: 'other-host' }, { operation: 'review', listing_id: 'host-private' }, { rpc: async () => ({}) }), /not found/);
  await assert.rejects(hostTool(caller, { operation: 'review', listing_id: 'host-private&host_id=neq.x' }), /Choose/);
});
test('cover changes are reviewed, signed, owner-scoped and applied only on request', async () => {
  await fixture('cover-review');
  const result = await hostTool(caller, { operation: 'propose', listing_id: 'cover-review', photo_number: 4 });
  assert.equal((await one('listings', 'id=eq.cover-review')).photos[0], 'a');
  await assert.rejects(applyHostProposal({ kind: 'user', userId: 'other-host' }, result.action.token), /another account/);
  await assert.rejects(applyHostProposal(caller, result.action.token + 'x'), /Invalid/);
  await applyHostProposal(caller, result.action.token);
  assert.deepEqual((await one('listings', 'id=eq.cover-review')).photos, ['d', 'a', 'b', 'c']);
  await assert.rejects(applyHostProposal(caller, result.action.token), /changed/);
});
test('stale recommendations cannot overwrite intervening edits', async () => {
  await fixture('stale-review');
  const result = await hostTool(caller, { operation: 'propose', listing_id: 'stale-review', title: 'Studio in Karen' });
  await update('listings', 'id=eq.stale-review', { title: 'Host revised title' });
  await assert.rejects(applyHostProposal(caller, result.action.token), /changed/);
});
test('date blocks validate dates and include the last requested night', async () => {
  await fixture('block-review');
  await assert.rejects(hostTool(caller, { operation: 'block', listing_id: 'block-review', start: '2099-02-31', end: '2099-03-02' }), /valid future/);
  const result = await hostTool(caller, { operation: 'block', listing_id: 'block-review', start: '2099-12-17', end: '2099-12-20' });
  let called = false;
  await applyHostProposal(caller, result.action.token, async args => {
    called = true;
    assert.equal(args.p_start, '2099-12-17');
    assert.equal(args.p_end, '2099-12-21');
    return { id: 'block' };
  });
  assert.equal(called, true);
  await assert.rejects(applyHostProposal(caller, result.action.token, async () => null), /did not confirm/);
  await assert.rejects(applyHostProposal(caller, result.action.token, async () => ({ ok: false, error: 'booked' })), /overlap an existing booking/);
});
test('monthly earnings use the owner-scoped database report without estimating', async () => {
  await fixture('earnings-review');
  let called;
  const earnings = { earned_stay_entitlement: 1000, bank_payouts: null, basis: 'Verified check-in; no bank ledger.' };
  const result = await hostTool(caller, { operation: 'earnings', listing_id: 'earnings-review', month: '2026-09' }, { rpc: async (name, args) => {
    called = { name, args }; return { earnings, performance: {} };
  } });
  assert.deepEqual(result, earnings);
  assert.equal(called.name, 'cabana_host_report');
  assert.equal(called.args.p_month, '2026-09-01');
});
test('promotions do not silently reduce the base price', async () => {
  await fixture('promotion-review');
  const result = await hostTool(caller, { operation: 'promotion', listing_id: 'promotion-review' });
  assert.equal(result.needs_details, true);
  assert.equal(result.action, undefined);
  const proposal = await hostTool(caller, { operation: 'promotion', listing_id: 'promotion-review', start: '2099-12-17', end: '2099-12-27', discount_pct: 10, floor_nightly: 1000 }, { rpc: async () => ({ reference_nightly: 2000 }) });
  let saved;
  await applyHostProposal(caller, proposal.action.token, null, async offer => { saved = offer; return offer; });
  assert.equal(saved.status, 'active');
  assert.equal(saved.discount_pct, 10);
  assert.equal(saved.floor_nightly, 1000);
  assert.equal(saved.host_id, caller.userId);
});

test('dashboard offers all six prompts and sends them to the shared APA conversation', () => {
  const source = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');
  const functions = source.slice(source.indexOf('function hostCopilotHTML(){'), source.indexOf('function statCard('));
  const dom = new JSDOM('<main></main>');
  let sent;
  const support = { open: text => { sent = text; } };
  const context = vm.createContext({ window: { CabanaSupport: support }, CabanaSupport: support, document: dom.window.document });
  vm.runInContext(functions, context);
  dom.window.document.querySelector('main').innerHTML = context.hostCopilotHTML();
  assert.equal(dom.window.document.querySelectorAll('button[type="button"]').length, 6);
  assert.ok(dom.window.document.querySelector('input[aria-label]'));
  context.askHostCopilot('Improve my listing');
  assert.equal(sent, 'As a host: Improve my listing');
  dom.window.close();
});

test('partner analytics uses authenticated reports without fabricated traffic', () => {
  const html = readFileSync(new URL('../partner-analytics.html', import.meta.url), 'utf8');
  assert.match(html, /cabana_host_report/);
  assert.match(html, /Measured impressions/);
  assert.match(html, /Booking funnel/);
  assert.doesNotMatch(html, /booking_count\|\|0\)\*12/);
  assert.doesNotMatch(html, /\*0\.18/);
  assert.doesNotMatch(html, /simulated from booking count/i);
});

test('recommendation card escapes listing text and writes only after a click', async () => {
  const source = readFileSync(new URL('../cabana-support.js', import.meta.url), 'utf8');
  const code = source.slice(source.indexOf('  function hostProposal(action)'), source.indexOf('  function payViaMpesa(a)'));
  const dom = new JSDOM('<main></main>');
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  const calls = [];
  const context = vm.createContext({ doc: dom.window.document, el: { body: dom.window.document.querySelector('main') },
    api: async (op, payload) => { calls.push({ op, payload }); return { ok: true, message: 'Applied safely.' }; }, appendLocal: () => {} });
  vm.runInContext(code, context);
  context.hostProposal({ title: '<img src=x onerror=alert(1)>', summary: ['<script>bad()</script>'], token: 'signed-plan' });
  assert.equal(calls.length, 0);
  assert.equal(dom.window.document.querySelector('img,script'), null);
  const button = dom.window.document.querySelector('button');
  await button.onclick();
  assert.equal(calls[0].op, 'host.apply');
  assert.equal(calls[0].payload.token, 'signed-plan');
  assert.equal(button.disabled, true);
  assert.match(dom.window.document.querySelector('[role="status"]').textContent, /Applied safely/);
  dom.window.close();
});

test('photo assessment accepts only public project images and validates its ranking', async () => {
  assert.equal(publicPhotoUrl('https://evil.example/photo.jpg', 'https://project.supabase.co'), null);
  assert.equal(publicPhotoUrl('https://project.supabase.co/storage/v1/object/sign/photos/private.jpg', 'https://project.supabase.co'), null);
  const publicUrl = 'https://project.supabase.co/storage/v1/object/public/photos/room.jpg';
  assert.equal(publicPhotoUrl(publicUrl, 'https://project.supabase.co'), publicUrl);
  const result = await evaluatePhotos({ id: 'photo-listing', photos: [publicUrl, publicUrl + '?two'] }, {
    storageUrl: 'https://project.supabase.co',
    load: async () => ({ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,/9j/2Q==' } }),
    ai: async messages => {
      assert.equal(messages[1].content.filter(part => part.type === 'image_url').length, 2);
      return { model: 'vision-test', choices: [{ message: { content: JSON.stringify({ photos: [
        { number: 1, score: 60, reason: 'Dim but clear room.' },
        { number: 2, score: 88, reason: 'Bright, wide and uncluttered room.' },
      ], recommended_photo: 2 }) } }] };
    },
  });
  assert.equal(result.recommended_photo, 2);
  assert.match(result.basis, /not measured engagement/);
  assert.throws(() => validatePhotoReview({ photos: [{ number: 1, score: 90, reason: 'x' }], recommended_photo: 2 }, [1, 2]));
});

test('performance diagnosis uses measured stages and labels causal suggestions as hypotheses', () => {
  const result = diagnosePerformance({ tracking_active: true, impressions: 200, views: 4, checkout_starts: 0, paid_bookings: 0, active: true, open_nights_next_30: 20 });
  assert.equal(result.booking_to_view_pct, 0);
  assert.match(result.findings.join(' '), /hypothesis/);
  assert.match(result.basis, /not an attributed cohort/);
});

test('APA booking uses the protected offer quote and refuses a missing quote', async () => {
  const listing = { id: 'stay-quote', price_night: 3000, max_guests: 4, min_nights: 1 };
  const priced = await priceStay(listing, '2099-12-17', '2099-12-20', 2, async (fn, args) => {
    assert.equal(fn, 'cabana_stay_quote');
    return { listing_id: listing.id, checkin: args.p_checkin, checkout: args.p_checkout, guests: 2,
      nightly: 2400, stay_total: 7200, service_fee: 800, grand_total: 8000,
      fingerprint: 'offer-fingerprint', offer: { id: 'offer' } };
  });
  assert.equal(priced.per_night, 2400);
  assert.equal(priced.offer.id, 'offer');
  assert.equal(priced.quote_fingerprint, 'offer-fingerprint');
  assert.equal((await priceStay(listing, '2099-12-17', '2099-12-20', 2, async () => null)).error, 'quote_unavailable');
});
