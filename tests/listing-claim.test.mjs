import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const read = file => readFileSync(join(ROOT, file), 'utf8');

const FORM = read('add-listing.html');
const OWNERSHIP = read('apa-ownership.js');
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
