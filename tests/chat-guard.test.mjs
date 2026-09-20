import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

await import('../cabana-chat-guard.js');
const Guard = globalThis.CabanaChatGuard;
const vectors = JSON.parse(readFileSync(new URL('./chat-guard.vectors.json', import.meta.url), 'utf8'));

test('chat guard: every single-message vector', () => {
  const failures = [];
  for (const v of vectors.single) {
    const r = Guard.check(v.text);
    const want = [...v.hard].sort().join(','), got = [...r.hard].sort().join(',');
    if (v.hard.length ? !v.hard.every(t => r.hard.includes(t)) : got !== '') failures.push(`${JSON.stringify(v.text)} want [${want}] got [${got}]`);
  }
  assert.deepEqual(failures, []);
});

test('chat guard: numbers spelled across several messages', () => {
  for (const s of vectors.sequences) {
    const last = s.messages[s.messages.length - 1];
    assert.equal(Guard.spansMessages(s.messages.slice(0, -1), last), s.spans, JSON.stringify(s.messages));
  }
});

test('chat guard: a paid booking allows a phone number but never a payment detour', () => {
  assert.equal(Guard.check('call me on 0716206494 when you land', { contactAllowed: true }).ok, true);
  assert.deepEqual(Guard.check('pay to till 523412', { contactAllowed: true }).hard, ['payment']);
  assert.equal(Guard.spansMessages(['0716', '206'], '494', { contactAllowed: true }), false);
});

test('chat guard: soft signals are recorded, never block', () => {
  const r = Guard.check('Can you call me when you arrive?');
  assert.equal(r.ok, true);
  assert.deepEqual(r.soft, ['contact_request']);
});
