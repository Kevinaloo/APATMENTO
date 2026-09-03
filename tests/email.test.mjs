/* ══════════════════════════════════════════════════════════════════════
   Cabana · outbound email
   tests/email.test.mjs

   Two things go wrong with a templated email system, and both go wrong
   silently:

     1. An action points at a template that no longer exists, and the
        send 500s in production at the exact moment somebody needed a
        receipt.
     2. A guest's own name, pasted into a subject or a heading, closes
        our markup. Names contain apostrophes and angle brackets; a
        template that concatenates rather than escapes is one hostile
        display name away from an ugly problem.

   And one thing specific to this change: the sender must follow the
   subject. Guest mail leaves connect@, partner mail leaves
   partnership@, and no email may quote a phone number Cabana no longer
   has.
══════════════════════════════════════════════════════════════════════ */
import test from 'node:test';
import assert from 'node:assert/strict';

import { TEMPLATES, esc } from '../api/lib/_mail.js';
import { ACTIONS } from '../api/email.js';
import { MAIL, CONTACT } from '../api/lib/_brand.js';

/* A plausible payload for every template, so each one can be rendered
   for real rather than merely imported. */
const SAMPLE = {
  name: 'Amina Otieno', email: 'amina@example.com', userId: 'u-1',
  device: 'Chrome on Android', when: '2026-08-21T09:00:00Z', place: 'Nairobi',
  resetUrl: 'https://cabana.africa/auth.html?token=abc',
  booking: { reference: 'CB-4471', total: 24000, amountPaid: 6000, checkIn: '2026-09-01',
             checkOut: '2026-09-04', guests: 2, hostPayout: 24000, guestName: 'Amina Otieno' },
  listing: { id: 'l-1', name: 'Riverside Studio, Westlands', title: 'Riverside Studio, Westlands' },
  user: { email: 'amina@example.com', name: 'Amina Otieno' },
  host: { email: 'host@example.com', name: 'Joseph Kamau' },
  refund: 18000, amount: 24000, reference: 'PO-9', businessName: 'Kamau Stays',
  threadId: '11111111-2222-3333-4444-555555555555', subject: 'Where is my code?',
  firstMessage: 'I paid in full but there is no code on the booking.',
  agentName: 'Wanjiru', body: 'Checked it — the code is on the booking now.',
  summary: 'Code released after the balance cleared.',
  callId: 'c-1', title: 'Your payout is on the way', url: '/dashboard.html', label: 'Open',
  headline: 'Two nights in Diani, on us', code: 'DIANI50', expires: '2026-12-01',
  stat: '50%', statLabel: 'off', campaign: 'diani-aug',
  waitingHours: 6, threadUrl: '/dashboard.html',
  period: 'August', stats: { earnings: 82000, bookings: 6, views: 940, enquiries: 22, conversion: 27 },
  category: 'billing', priority: 'high', reason: 'Refund needs a human',
  guest: 'Amina Otieno', lastMessage: 'I want my money back.', apaSummary: 'Paid 6000 of 24000.',
  consoleUrl: '/support-console.html',
  submission: { id: 's-1', title: 'Riverside Studio', serviceLabel: 'Stay',
                location: 'Westlands, Nairobi, Kenya', state: 'live', manageUrl: '/partner-listings.html' },
  recipient: { name: 'Njeri Kamau', contact: 'njeri@example.com' },
  recipientName: 'Njeri Kamau', listingTitle: 'Riverside Studio', fromName: 'Joseph Kamau',
  claimUrl: '/dashboard.html?claim=abc', expiresAt: '2026-09-04',
  status: 'accepted', perspective: 'recipient', otherName: 'Joseph Kamau',
  /* SOS — internal safety alert */
  lifeSafety: true, who: 'Amina Otieno',
  locationLine: '-1.286389, 36.817223 (±18m, GPS-grade)', locationQuality: 'precise',
  mapUrl: 'https://www.google.com/maps?q=-1.286389,36.817223',
  placeLabel: 'Westlands, Nairobi', note: 'Car broke down, area feels unsafe.',
  originPage: '/rides.html', deskUrl: '/support-console.html?thread=abc',
  raisedAt: '2026-09-03T21:14:00Z', alertId: 'a-1',
  /* Flight desk templates */
  ref: 'FD-1001', route: 'NBO → LHR', dates: '1–3 Sep', pax: '2 adults', cabin: 'Economy',
  trackUrl: '/flights.html?ref=FD-1001', dueBy: '2 Sep 17:00',
  count: 2, fromPrice: 'KES 82,000', optionsHtml: '<p>Option A · KES 82,000</p>',
  pnr: 'ABC123', airline: 'Kenya Airways', departDate: '1 Sep 2026',
  etickets: ['ET-0741234567890'], ticketUrl: '/flights.html?ticket=FD-1001',
  /* flightDeskAlert (partner) — the contact phone goes to the operator, not a guest.
     Use a non-Kenyan placeholder so the Kenyan-mobile assertion (which targets
     Cabana's own numbers leaking into consumer emails) does not fire on sample data. */
  contactName: 'Amina Otieno', contactPhone: '+1 202 555 0100',
  contactEmail: 'amina@example.com', channel: 'app', notes: 'Window seat preferred.',
  ceiling: 'KES 90,000', flex: '±1 day',
  /* flightChosen (partner) */
  price: 'KES 82,000', netLine: 'KES 77,000',
};

const rendered = Object.entries(TEMPLATES).map(([key, build]) => [key, build(SAMPLE)]);

test('every action points at a template that exists', () => {
  for (const [action, spec] of Object.entries(ACTIONS)) {
    assert.ok(TEMPLATES[spec.template],
      `action "${action}" points at missing template "${spec.template}"`);
  }
});

test('every template renders a complete document', () => {
  for (const [key, out] of rendered) {
    assert.ok(out.subject && out.subject.length > 3, `${key}: no subject`);
    assert.match(out.html, /^<!DOCTYPE html>/, `${key}: not a document`);
    assert.match(out.html, /<\/html>\s*$/, `${key}: document not closed`);
    assert.ok(out.html.length > 900, `${key}: suspiciously short`);
    assert.ok(['guest', 'partner'].includes(out.audience), `${key}: bad audience`);
    assert.ok(['transactional', 'product', 'promotions', 'partner_updates'].includes(out.category),
      `${key}: bad category "${out.category}"`);
  }
});

test('a hostile display name cannot break out of the markup', () => {
  const hostile = '"><script>alert(1)</script><b x="';
  for (const [key, build] of Object.entries(TEMPLATES)) {
    const out = build({ ...SAMPLE, name: hostile, agentName: hostile, body: hostile,
                        headline: hostile, title: hostile, guest: hostile });
    assert.ok(!out.html.includes('<script>alert(1)</script>'),
      `${key}: an unescaped script tag reached the body`);
  }
});

test('a subject line is escaped too, not just the body', () => {
  assert.equal(esc('Tom & "Jerry" <b>'), 'Tom &amp; &quot;Jerry&quot; &lt;b&gt;');
});

test('no email offers a phone number or WhatsApp', () => {
  for (const [key, out] of rendered) {
    assert.ok(!/wa\.me/i.test(out.html), `${key}: links to WhatsApp`);
    assert.ok(!/(?:tel|sms|callto):\+?\d/i.test(out.html), `${key}: offers a dial link`);
    assert.ok(!/\+254\s?7\d{2}\s?\d{3}\s?\d{3}/.test(out.html), `${key}: quotes a Kenyan mobile`);

    /* Naming WhatsApp is fine — the welcome email explains that Cabana
       deliberately has none, which is worth saying. Offering it is not.
       So the check is on the preposition, not the word. */
    for (const m of out.html.matchAll(/whats\s?app/gi)) {
      const around = out.html.slice(Math.max(0, m.index - 60), m.index + 20);
      assert.match(around, /\b(no|not|never|without|neither|nor)\b/i,
        `${key}: WhatsApp is offered rather than ruled out — …${around.replace(/\s+/g, ' ')}…`);
    }
  }
});

test('guest mail leaves connect@, partner mail leaves partnership@', () => {
  const senderFor = (audience) => audience === 'partner' ? MAIL.partnership : MAIL.connect;
  assert.match(senderFor('guest'), /connect@cabana\.africa/);
  assert.match(senderFor('partner'), /partnership@cabana\.africa/);

  /* The audience each template declares is what picks the sender, so a
     template filed under the wrong audience mails from the wrong inbox. */
  const expected = {
    welcome: 'guest', signinAlert: 'guest', reset: 'guest', bookingReceipt: 'guest',
    bookingCancelled: 'guest', supportOpened: 'guest', supportReply: 'guest',
    supportResolved: 'guest', missedCall: 'guest', notification: 'guest', offer: 'guest',
    partnerWelcome: 'partner', partnerBooking: 'partner', partnerPayout: 'partner',
    partnerListingLive: 'partner', partnerNudge: 'partner', partnerDigest: 'partner',
    partnerUpdate: 'partner', listingClaim: 'partner', listingTransferSent: 'partner',
    listingTransferDecision: 'partner', partnerListingSubmitted: 'partner',
    agentEscalation: 'partner',
    /* Flight desk — added with the Flight Desk feature; five templates, two audiences */
    flightRequested: 'guest', flightQuoted: 'guest', flightTicketed: 'guest',
    flightDeskAlert: 'partner', flightChosen: 'partner',
    /* SOS pages the safety rota, which reads connect@ — the same inbox
       the guest would be writing to. Filing it under 'guest' keeps the
       thread and the alert on one address rather than splitting an
       emergency across two inboxes. */
    sosAlert: 'guest',
  };
  for (const [key, out] of rendered) {
    assert.equal(out.audience, expected[key], `${key} is filed under the wrong audience`);
  }
});

test('every template carries the Cabana logo and a support route', () => {
  for (const [key, out] of rendered) {
    assert.match(out.html, /cabana-(?:wordmark|emblem|icon)/, `${key}: no logo`);
    assert.ok(out.html.includes(CONTACT.support) || out.html.includes(CONTACT.partnership),
      `${key}: no way to reach us`);
  }
});

test('promotional mail is consent-gated and unsubscribable, transactional is not', () => {
  const byKey = Object.fromEntries(rendered);
  assert.equal(byKey.offer.category, 'promotions', 'an offer must be gated by consent');
  assert.equal(byKey.partnerDigest.category, 'product');
  /* A receipt is part of the purchase. Turning it off is not an option
     we offer, so it must never be filed as marketing. */
  for (const key of ['bookingReceipt', 'reset', 'signinAlert', 'supportReply', 'partnerPayout']) {
    assert.equal(byKey[key].category, 'transactional', `${key} must not be consent-gated`);
  }
});

test('money is rendered, never left as a raw number', () => {
  const byKey = Object.fromEntries(rendered);
  assert.match(byKey.bookingReceipt.html, /KES\s?6,000/, 'the amount paid is not formatted');
  assert.match(byKey.bookingReceipt.html, /KES\s?18,000/, 'the balance due is not shown');
  assert.match(byKey.partnerPayout.html, /KES\s?24,000/);
  assert.match(byKey.partnerPayout.html, /KES 0/, 'the zero-commission line is missing');
});

test('a receipt tells a part-paid guest what is still owed', () => {
  const byKey = Object.fromEntries(rendered);
  assert.match(byKey.bookingReceipt.html, /Balance due/i);
  assert.match(byKey.bookingReceipt.html, /check-in code/i);
});

test('dedupe keys make the once-only emails once-only', () => {
  const once = ['welcome', 'partner-welcome', 'support-resolved', 'missed-call', 'host-booking', 'payout'];
  for (const action of once) {
    const key = ACTIONS[action].dedupe(SAMPLE);
    assert.ok(key, `"${action}" has no dedupe key, so a retry sends it twice`);
    assert.equal(ACTIONS[action].dedupe(SAMPLE), key, `"${action}" dedupe key is not stable`);
  }
  /* A password reset must be repeatable: a guest who did not receive the
     first one has to be able to ask again. */
  assert.equal(ACTIONS.reset.dedupe(SAMPLE), null);
});

test('listing and ownership emails are attractive transactional partner mail', () => {
  for (const key of ['partnerListingSubmitted', 'listingClaim', 'listingTransferSent', 'listingTransferDecision']) {
    const out = TEMPLATES[key](SAMPLE);
    assert.equal(out.audience, 'partner');
    assert.equal(out.category, 'transactional');
    assert.match(out.html, /Cabana/i);
    assert.match(out.html, /dashboard|listing/i);
  }
});
