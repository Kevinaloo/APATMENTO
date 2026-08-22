/* ══════════════════════════════════════════════════════════════════════
   ONE APA
   tests/one-apa.test.mjs

   Cabana used to run two assistants — a concierge with the personality
   and a support desk with the facts — and a guest could be handed a
   different one depending on which button they happened to press. These
   tests hold the merge in place: one brain, one launcher, one voice, and
   no path back to the second assistant.
   ══════════════════════════════════════════════════════════════════════ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { __test } from '../api/lib/_support.js';
const { readMode, areaFrom, parseDirectives, systemPrompt, timeContext } = __test;

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(join(ROOT, f), 'utf8');
const pages = () => readdirSync(ROOT).filter(f => f.endsWith('.html'));

/* ── One assistant on the page ──────────────────────────────────────── */

test('no page loads the retired second assistant', () => {
  const offenders = pages().filter(p => /<script[^>]+apa-ask\.js/.test(read(p)));
  assert.deepEqual(offenders, [],
    `these pages still load the old duplicate assistant: ${offenders.join(', ')}`);
});

test('the retired file renders nothing and answers nothing', () => {
  const s = read('apa-ask.js');
  /* It may only ensure the survivor is present. If it ever grows a
     panel, a fetch or a prompt again, we are back to two APAs. */
  assert.ok(!/innerHTML|createTextNode|appendChild\s*\(\s*panel/i.test(s),
    'the retired stub must not paint any UI');
  assert.ok(!/fetch\s*\(|XMLHttpRequest/i.test(s),
    'the retired stub must not talk to any API');
  assert.ok(/cabana-support\.js/.test(s),
    'the retired stub should hand cached pages to the surviving console');
});

test('every page carrying an assistant carries the same one', () => {
  const withConsole = pages().filter(p => /cabana-support\.js/.test(read(p)));
  assert.ok(withConsole.length > 300,
    `expected the one console site-wide, found it on ${withConsole.length} pages`);
});

/* ── One mind: it plans and it fixes ────────────────────────────────── */

test('a broken booking is read as a problem, not as chit-chat', () => {
  for (const line of [
    'you took my money and I got nothing',
    'I paid but the booking is still pending',
    'I want a refund',
    'the place was filthy and not as advertised',
    'I am locked out and nobody is answering',
  ]) {
    assert.equal(readMode(line), 'problem', `"${line}" must be handled as a problem`);
  }
});

test('a greeting is read as social so APA does not run a support script at it', () => {
  for (const line of ['hey', 'hi there', 'sasa', 'mambo', 'thanks!', 'how are you']) {
    assert.equal(readMode(line), 'social', `"${line}" must be handled socially`);
  }
});

test('planning is neither a complaint nor small talk', () => {
  for (const line of [
    'find me a 2 bed in Westlands under 5000',
    'what is there to do in Diani this weekend',
    'I need a safari for Friday',
  ]) {
    assert.equal(readMode(line), 'task', `"${line}" should be treated as planning`);
  }
});

test('a problem wins over a greeting in the same sentence', () => {
  /* "hi, you charged me twice" is not a greeting, and a joke in reply
     to it would be the single worst thing APA could do. */
  assert.equal(readMode('hi there, you charged me twice'), 'problem');
});

/* ── The concierge half survived the merge ──────────────────────────── */

test('the prompt carries the personality, not just the rules', () => {
  const p = systemPrompt({
    grounding: 'GROUNDING', page: 'tours', caller: {}, threadAge: 'brand new',
    apaTurns: 0, ads: [], mode: 'task',
  });
  assert.match(p, /well-travelled friend/i, 'the concierge voice must survive');
  assert.match(p, /Swahili|Sheng|Pidgin/i, 'language matching must survive');
  assert.match(p, /\[\[go:/, 'navigation must survive');
  assert.match(p, /\[\[escalate:/, 'escalation must survive');
  assert.match(p, /GROUNDING/, 'grounding must survive');
});

test('the register hardens on a problem and loosens on banter', () => {
  const base = { grounding: 'G', page: 'index', caller: {}, threadAge: 'new', apaTurns: 0, ads: [] };
  assert.match(systemPrompt({ ...base, mode: 'problem' }), /no jokes|no emoji/i);
  assert.match(systemPrompt({ ...base, mode: 'social' }), /do NOT navigate/i);
});

test('nothing is advertised into a complaint', () => {
  const ads = [{ id: 'A1', advertiser: 'X', headline: 'Y', apa_message: 'try X' }];
  /* The pipeline withholds ads on a problem turn, so the block is empty
     even when live ads exist. This asserts the prompt shape; the
     withholding itself is asserted by the pipeline passing ads: []. */
  const withNone = systemPrompt({
    grounding: 'G', page: 'index', caller: {}, threadAge: 'new', apaTurns: 0, ads: [], mode: 'problem',
  });
  assert.ok(!/SPONSORED/.test(withNone), 'a complaint must never carry a sponsored block');

  const withSome = systemPrompt({
    grounding: 'G', page: 'index', caller: {}, threadAge: 'new', apaTurns: 0, ads, mode: 'task',
  });
  assert.match(withSome, /SPONSORED/, 'a planning turn may carry one');
});

test('time and season reach the model', () => {
  const t = timeContext();
  assert.match(t, /RIGHT NOW:/);
  assert.match(t, /EAT \(UTC\+3\)/);
  assert.match(t, /season/i);
});

test('an area mentioned earlier is still in play', () => {
  assert.equal(areaFrom('somewhere in Westlands please'), 'Westlands');
  assert.equal(areaFrom('what about Diani'), 'Diani');
  assert.equal(areaFrom('I want to go to Zanzibar'), 'Zanzibar');
  assert.equal(areaFrom('no place named here'), null);
});

/* ── Directives from either lineage are understood ──────────────────── */

test('the old nextsteps directive is accepted as chips', () => {
  const r = parseDirectives('Here you go. [[nextsteps:Safaris near Naivasha|tours,Stays in Diani|stays]]');
  assert.deepEqual(r.chips, ['Safaris near Naivasha', 'Stays in Diani']);
  assert.ok(!/nextsteps/.test(r.text), 'the directive must not reach the guest');
});

test('a sponsored marker is captured and stripped', () => {
  const r = parseDirectives('Good call. [[ad:A1]]');
  assert.equal(r.adId, 'A1');
  assert.equal(r.text, 'Good call.');
});

test('an unknown directive never reaches the bubble', () => {
  const r = parseDirectives('All set. [[somethingnew:whatever]]');
  assert.equal(r.text, 'All set.');
});

test('navigation with parameters survives parsing', () => {
  const r = parseDirectives('Pulling those up. [[go:stays?area=Westlands&beds=2&max_price=5000]]');
  assert.equal(r.route, 'stays');
  assert.match(r.routeParams, /area=Westlands/);
  assert.match(r.routeParams, /beds=2/);
});

/* ── The client is one console ──────────────────────────────────────── */

test('the console speaks into the same thread rather than forking a voice mode', () => {
  const s = read('cabana-support.js');
  assert.match(s, /SpeechRecognition/, 'listening must live in the one console');
  assert.match(s, /speechSynthesis/, 'spoken replies must live in the one console');
  /* Speech must end in submit() — the same path typing uses — so a
     spoken message lands in the transcript a human later inherits, and
     a voice booking is the same booking as a typed one. */
  assert.match(s, /spokeLast = true;[\s\S]{0,120}submit\(said\)/,
    'a spoken line must go through the normal send path');
});

test('APA speaks when spoken to, or when hands-free is running — never at a silent typist', () => {
  const s = read('cabana-support.js');
  assert.match(s, /var wanted = spokeLast \|\| handsFree;/,
    'audio is volunteered only to someone who chose voice');
  assert.match(s, /if \(!VOICE_OUT \|\| !wanted\)/,
    'someone who typed, outside hands-free, must not be read aloud to');
});

test('closing the panel stops the microphone and the voice', () => {
  const s = read('cabana-support.js');
  assert.match(s, /function closePanel\(\)[\s\S]{0,240}hushVoice\(\)/,
    'closing must hush both directions of audio');
});
