/* ══════════════════════════════════════════════════════════════════════
   APA AGENT
   tests/apa-agent.test.mjs

   The agentic half of APA writes real rows and raises real payment
   prompts, so these tests are less about behaviour and more about the
   things that must never happen: a price that came out of a sentence, a
   booking created without a yes, a caller reaching someone else's data,
   an anonymous browser transacting.

   The database work is proven separately against the live schema; what
   is asserted here is the logic that decides whether a write is even
   attempted, and the contract the client depends on.
   ══════════════════════════════════════════════════════════════════════ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

const AGENT  = read('api/lib/_apa-agent.js');
const BRAIN  = read('api/lib/_support.js');
const CLIENT = read('cabana-support.js');

/* ── Money is never the model's to decide ───────────────────────────── */

test('the agent never takes a price from a tool argument', () => {
  /* If a caller could pass price, total or amount into the booking
     flow, a persuasive sentence becomes a discount. The schema must
     not offer those fields at all. */
  const bookingTools = BRAIN.slice(
    BRAIN.indexOf("name: 'set_booking_detail'"),
    BRAIN.indexOf("name: 'review_booking'")
  );
  for (const forbidden of ['price', 'total', 'amount', 'discount', 'fee']) {
    assert.ok(!new RegExp(`\\b${forbidden}\\s*:\\s*\\{`).test(bookingTools),
      `set_booking_detail must not accept "${forbidden}" — the listing decides that`);
  }
});

test('the quote is recomputed from the listing, never carried', () => {
  assert.match(AGENT, /async function priceStay\(listing/,
    'pricing must take the listing row, not a caller-supplied number');
  /* review_booking and confirm_booking must each read the listing again
     rather than trusting the slots they were handed. */
  const confirm = AGENT.slice(AGENT.indexOf('export async function bookingConfirm'));
  assert.match(confirm, /await one\('listings'/,
    'confirm must re-read the listing');
  assert.match(confirm, /priceStay\(/,
    'confirm must reprice rather than reuse the quote');
});

test('a price that moved after the yes invalidates the yes', () => {
  const confirm = AGENT.slice(AGENT.indexOf('export async function bookingConfirm'));
  assert.match(confirm, /freshKey !== slots\.quote_key/,
    'the agreement must be checked against what was actually quoted');
  assert.match(confirm, /price_changed/,
    'a moved price must abort rather than silently repricing');
});

test('the reference matches the shape the database enforces', () => {
  /* cabana_secure_apartment_booking() rejects anything not matching
     ^APT-<listing uuid>-<10..16 digits>$. A generated reference that
     fails this makes every hands-free booking fail at the last step. */
  assert.match(AGENT, /`APT-\$\{listing\.id\}-\$\{Date\.now\(\)\}`/,
    'the reference must name its own listing and end in an epoch');
});

test('what is reported to the guest is what the database charged', () => {
  const confirm = AGENT.slice(AGENT.indexOf('export async function bookingConfirm'));
  assert.match(confirm, /row\.grand_total/,
    'the total read back must come from the inserted row');
  assert.match(confirm, /row\.deposit_required/,
    'the deposit must come from the inserted row, not our arithmetic');
});

/* ── Consent ────────────────────────────────────────────────────────── */

test('nothing irreversible happens without an explicit agreement', () => {
  for (const fn of ['bookingConfirm', 'listingPublish']) {
    const body = AGENT.slice(AGENT.indexOf(`export async function ${fn}`));
    assert.match(body.slice(0, 900), /agreed\s*!==\s*true/,
      `${fn} must refuse without agreed === true`);
  }
});

test('the agreed flag cannot be defaulted on by the dispatcher', () => {
  assert.match(BRAIN, /confirm_booking.*agreed: args\?\.agreed === true/s,
    'a missing agreed argument must read as false, never as true');
  assert.match(BRAIN, /publish_listing.*agreed: args\?\.agreed === true/s,
    'same for publishing');
});

/* ── Who the caller is ──────────────────────────────────────────────── */

test('an anonymous browser can assemble but never transact', () => {
  const confirm = AGENT.slice(AGENT.indexOf('export async function bookingConfirm'));
  assert.match(confirm.slice(0, 500), /caller\.kind !== 'user'/,
    'booking must require an account');
  const publish = AGENT.slice(AGENT.indexOf('export async function listingPublish'));
  assert.match(publish.slice(0, 300), /caller\.kind !== 'user'/,
    'listing must require an account');
});

test('every task query is scoped by the caller, not by an id it was given', () => {
  assert.match(AGENT, /function ownerFilter\(caller\)/);
  /* activeTask is the only way into a task row, and it always applies
     the owner filter. No function may look a task up by bare id. */
  assert.ok(!/select\('apa_tasks',\s*`id=eq\./.test(AGENT),
    'no task may be fetched by id alone — that is someone else\'s draft');
});

test('a draft assembled before signing in is adopted, not abandoned', () => {
  assert.match(BRAIN, /adoptTasks\(caller, guestKey/,
    'signing in must carry the in-flight work across');
  assert.match(AGENT, /export async function adoptTasks/);
});

/* ── Input that came from a language model ──────────────────────────── */

test('dates are validated as real calendar dates', () => {
  assert.match(AGENT, /function parseDate/);
  assert.match(AGENT, /toISOString\(\)\.slice\(0, 10\) !== s/,
    'a date that round-trips differently (2025-02-31) must be rejected');
});

test('a past check-in is refused', () => {
  assert.match(AGENT, /rejected\.checkin = 'that date is in the past'/);
});

test('a mistyped nightly price is caught', () => {
  assert.match(AGENT, /n < 100 \|\| n > 2_000_000/,
    'an absurd price must be rejected rather than listed');
});

test('photo URLs are validated before they reach a row', () => {
  assert.match(AGENT, /const PHOTO_URL = \/\^https:/,
    'only https URLs of a known shape may become listing photos');
  assert.match(AGENT, /PHOTO_URL\.test\(u\)/);
});

test('coordinates outside the earth are rejected', () => {
  assert.match(AGENT, /Math\.abs\(lat\) <= 90 && Math\.abs\(lng\) <= 180/);
});

test('memory only accepts keys it knows', () => {
  assert.match(AGENT, /MEMORY_KEYS\.has\(k\)/,
    'an arbitrary key must not become a remembered fact');
});

/* ── The client contract ────────────────────────────────────────────── */

test('an action can only come from a tool, never from model text', () => {
  assert.match(BRAIN, /if \(result\?\.action && !clientAction\) clientAction = result\.action;/,
    'the action must be read off the tool result');
  /* There must be no directive syntax that lets generated text raise a
     payment prompt — that would be a sentence spending money. */
  assert.ok(!/\[\[\s*(?:pay|action|prompt)/i.test(BRAIN),
    'no double-bracket directive may issue an action');
});

test('the stored transcript does not keep the payer phone number', () => {
  assert.match(BRAIN, /function publicAction\(action\)/);
  assert.match(BRAIN, /const \{ phone, \.\.\.rest \} = action;/,
    'the phone must be stripped before the action is written to a message');
});

test('the client performs exactly the three actions the server can issue', () => {
  assert.match(CLIENT, /action\.type === 'payment_prompt'/);
  assert.match(CLIENT, /action\.type === 'collect_photos'/);
  assert.match(CLIENT, /action\.type === 'collect_location'/);
});

test('a refused payment is reported, not retried', () => {
  const pay = CLIENT.slice(CLIENT.indexOf('function payViaMpesa'));
  assert.match(pay.slice(0, 1600), /did not go through/,
    'the server\'s refusal must reach the guest');
  assert.ok(!/setTimeout\([^)]*payViaMpesa/.test(pay.slice(0, 1600)),
    'a refused amount must never be auto-retried');
});

/* ── Hands-free voice ───────────────────────────────────────────────── */

test('APA does not listen to herself', () => {
  assert.match(CLIENT, /if \(!VOICE_IN \|\| listening \|\| speaking \|\| sending\) return;/,
    'listening must not start while she is speaking or a send is in flight');
});

test('the guest can always cut her off', () => {
  assert.match(CLIENT, /function bargeIn\(\)/);
  assert.match(CLIENT, /bargeIn\(\);\n\s*\}\);/, 'typing must interrupt speech');
  assert.match(CLIENT.slice(CLIENT.indexOf('function submit(')), /bargeIn\(\)/,
    'sending must interrupt speech');
});

test('a speech engine that never reports completion cannot strand the loop', () => {
  assert.match(CLIENT, /setTimeout\(finish, Math\.min\(30000/,
    'there must be a ceiling on waiting for onend');
});

test('a dropped send keeps hands-free alive', () => {
  assert.match(CLIENT, /afterReply\('That did not reach us/,
    'a network failure must be spoken and the loop resumed');
});

test('closing the panel stops both directions of audio', () => {
  assert.match(CLIENT, /function hushVoice\(\)\s*\{\s*stopHandsFree\(true\);/);
});

/* ── The corner ─────────────────────────────────────────────────────── */

test('only one thing may claim the launcher corner', () => {
  const css = read('cabana-support.css');
  assert.match(css, /--cbn-corner-claim/,
    'the launcher must publish its claim');
  assert.match(read('showcase.js'), /var\(--cbn-corner-claim, 0px\)/,
    'the sticky promo must stack above the claim, not on top of it');
});
