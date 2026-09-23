import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const MIGRATION = 'supabase/migrations/20260923010000_chat_v7_redirect_guard.sql';

await import('../cabana-chat-guard.js');
const Guard = globalThis.CabanaChatGuard;

test('the redirect layer needs two halves, so ordinary questions survive', () => {
  const anc = Guard.anchorTokens(['The Jets Nest', 'Obama estate']);
  // A directive with nowhere to go, and a place with no directive: both clean.
  assert.equal(Guard.check('when can I come?', { anchors: anc }).ok, true);
  assert.equal(Guard.check('there is a gate and an office on site', { anchors: anc }).ok, true);
  // Together they are an instruction.
  assert.equal(Guard.check('come to the office', { anchors: anc }).ok, false);
});

test('a redirect is allowed once the booking is paid — that is the whole point', () => {
  const anc = Guard.anchorTokens(['The Jets Nest', 'Obama estate']);
  const arrival = 'come to the gate and ask for jets nest';
  assert.equal(Guard.check(arrival, { anchors: anc }).ok, false);
  assert.equal(Guard.check(arrival, { anchors: anc, contactAllowed: true }).ok, true);
  // A payment detour is never allowed, paid or not.
  assert.deepEqual(Guard.check('pay me directly in cash', { contactAllowed: true }).hard, ['off_platform']);
});

test('@place is an address, not a handle', () => {
  // Five of the eight live listing titles use this form.
  assert.equal(Guard.check('Shikaz Homes 2 Bedroom @JKIA Syokimau').ok, true);
  assert.equal(Guard.check('follow @kevinstays').ok, false);
  assert.equal(Guard.check('find me @kevin_254').ok, false);
});

test('the rival rule does not eat ordinary requests', () => {
  for (const ok of ['can you find me a taxi from the airport?', 'could you find me a good restaurant?'])
    assert.equal(Guard.check(ok).ok, true, ok);
  for (const bad of ['just google us', 'search for me online', 'we are cheaper on airbnb'])
    assert.equal(Guard.check(bad).ok, false, bad);
});

test('anchors are specific to a stay and never generic', () => {
  const anc = Guard.anchorTokens(['Luxury Serviced Apartment', 'Westlands', 'Jane Doe']);
  for (const generic of ['luxury', 'serviced', 'apartment']) assert.ok(!anc.includes(generic), generic);
  assert.ok(anc.includes('westlands'));
});

test('the migration ships the guard the browser was tested against', () => {
  const sql = read(MIGRATION);
  // The two-argument form must be gone, or a stale call silently skips anchors.
  assert.match(sql, /drop function if exists cabana_private\.chat_guard\(text, boolean\)/);
  assert.match(sql, /p_anchors text\[\] default '\{\}'/);
  // The trigger has to actually pass them.
  assert.match(sql, /anchors := cabana_private\.guard_anchor_tokens\(array\[/);
  assert.match(sql, /cabana_private\.chat_guard\(m\.content, allowed, anchors\)/);
  // Every block names the way forward.
  assert.match(sql, /'action', cta/);
  assert.match(read('chat.js'), /data-act="offer"[^>]*>\$\{IC\.tag\}&nbsp;Send a private offer/);
});

test('the browser guard and the migration agree on the category list', () => {
  const sql = read(MIGRATION);
  for (const cat of ['meetup', 'rival']) {
    assert.ok(Guard.REASONS[cat], `browser copy explains ${cat}`);
    assert.match(sql, new RegExp(`'${cat}'`), `migration raises ${cat}`);
  }
});
