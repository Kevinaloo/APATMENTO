import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const read = file => readFileSync(join(ROOT, file), 'utf8');

const FORM = read('add-listing.html');
const OWNERSHIP = read('apa-ownership.js');
const LIFECYCLE = read('cabana-lifecycle.js');
const EMAIL = read('api/email.js');
const CLAIM_SQL = read('supabase/migrations/20260824090000_secure_listing_claim_pipeline.sql');
const PIPE_SQL = read('supabase/migrations/20260824091000_atomic_driver_and_fleet_applications.sql');
const HARDEN_SQL = read('supabase/migrations/20260824092000_verified_claim_identity_and_indexes.sql');

test('every on-behalf form path saves private, not only ambassador links', () => {
  assert.match(FORM, /if\(F\.own==='on_behalf'&&!window\._eid\)\s*\{/);
  assert.match(FORM, /payload\.is_active=false/);
  assert.match(FORM, /payload\.status='pending_owner'/);
  assert.ok(!/if\(ON_BEHALF_OF&&!window\._eid\)\s*\{\s*payload\.is_active=false/.test(FORM));
});

test('claim email derives its recipient and listing behind authenticated ownership', () => {
  assert.match(EMAIL, /transfer\.from_user !== caller\.id/);
  assert.match(EMAIL, /String\(transfer\.to_contact/);
  assert.match(EMAIL, /listing-claim:\$\{transfer\.id\}/);
  assert.ok(!/const email\s*=\s*String\(body\.email/.test(EMAIL));
});

test('a transfer emails both sides and decisions notify both accounts', () => {
  assert.match(EMAIL, /template: 'listingClaim'/);
  assert.match(EMAIL, /template: 'listingTransferSent'/);
  assert.match(EMAIL, /Promise\.all\(\[recipientSend, senderSend\]\)/);
  assert.match(EMAIL, /action === 'listing-transfer-decision'/);
  assert.match(EMAIL, /template: 'listingTransferDecision'/);
  assert.match(OWNERSHIP, /return sendInvite\(r\.transfer_id\)/);
  assert.match(OWNERSHIP, /notifyDecision\(id\)/);
});

test('every public listing pipeline requests one authenticated confirmation', () => {
  assert.match(EMAIL, /action === 'listing-submitted'/);
  assert.match(EMAIL, /submission_not_found/);
  assert.match(LIFECYCLE, /listingSubmitted: function \(source, id\)/);
  for (const [file, source] of Object.entries({
    'add-listing.html': 'listing', 'cabana-list-tour.js': 'tour',
    'cabana-list-event.js': 'event', 'list-your-fleet.html': 'fleet',
    'become-driver.html': 'driver'
  })) {
    assert.match(read(file), new RegExp(`listingSubmitted\\('${source}'`), `${file} does not request its confirmation`);
  }
  for (const page of ['add-listing.html', 'list-your-tour.html', 'list-your-event.html',
                      'list-your-fleet.html', 'become-driver.html']) {
    assert.match(read(page), /cabana-lifecycle\.js/, `${page} does not load the shared email lifecycle`);
  }
});

test('claim deep links preserve sign-in return and still verify the inbox identity', () => {
  assert.match(OWNERSHIP, /sessionStorage\.setItem\('auth_next', next\)/);
  assert.match(OWNERSHIP, /listing_transfers_for_me/);
  assert.match(OWNERSHIP, /This invitation belongs to another account/);
  assert.match(OWNERSHIP, /Decide later/);
});

test('database privacy guard blocks public inventory and the ownership view invokes RLS', () => {
  assert.match(CLAIM_SQL, /before insert or update[\s\S]*on public\.listings/);
  assert.match(CLAIM_SQL, /new\.is_active := false/);
  assert.match(CLAIM_SQL, /new\.status := 'pending_owner'/);
  assert.match(CLAIM_SQL, /with \(security_invoker = true\)/);
  assert.ok(!/coalesce\(u\.phone, u\.raw_user_meta_data/.test(HARDEN_SQL));
  assert.match(HARDEN_SQL, /unique index if not exists car_operators_owner_id_uidx/);
});

test('specialised services cannot collide with the generic listings table', () => {
  for (const [service, page] of Object.entries({
    tours: 'list-your-tour.html', events: 'list-your-event.html',
    carhire: 'list-your-fleet.html', rides: 'become-driver.html'
  })) {
    assert.match(FORM, new RegExp(`${service}:'/${page.replace('.', '\\.')}'`));
  }
  assert.match(FORM, /if\(!window\._eid&&DEDICATED_PIPELINES\[F\.svc\]\)/);
});

test('driver and fleet applications are atomic and private until review', () => {
  assert.match(PIPE_SQL, /function public\.driver_application_submit/);
  assert.match(read('become-driver.html'), /sb\.rpc\('driver_application_submit'/);
  assert.match(PIPE_SQL, /function public\.car_operator_apply/);
  assert.match(PIPE_SQL, /'review'/);
  assert.match(read('list-your-fleet.html'), /Nothing submitted here is public/);
});
