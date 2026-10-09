/* ═══════════════════════════════════════════════════════════════════
   APA · conversations end, the relationship does not
   ─────────────────────────────────────────────────────────────────
   A thread is the whole relationship with a guest; an episode is one
   conversation in it. These tests pin the rules that make a new question
   feel like a new conversation without APA forgetting who she is talking
   to, and the escalation rules that stop ordinary questions paging the
   desk.
   ═══════════════════════════════════════════════════════════════════ */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as S from '../api/lib/_support.js';
import { normalise } from '../api/lib/_catalogue.js';

const NOW = Date.parse('2026-10-09T12:00:00Z');
const at = mins => new Date(NOW - mins * 60000).toISOString();
const msg = (role, body, minsAgo, meta = {}) => ({ sender_role: role, body, created_at: at(minsAgo), meta });

test('the current conversation starts after the last divider', () => {
  const thread = { episode_n: 1 };
  const m = [
    msg('user', 'refund for my booking?', 3000), msg('apa', 'Sorted.', 2999),
    msg('system', 'New conversation', 60, { episode_start: 2 }),
    msg('user', 'safaris near Naivasha?', 59), msg('apa', 'Two live this week.', 58),
  ];
  const ep = S.episodeOf(m, thread, NOW);
  assert.equal(ep.n, 2);
  assert.deepEqual(ep.messages.map(x => x.body), ['safaris near Naivasha?', 'Two live this week.']);
  assert.equal(ep.userTurns, 1);
  assert.equal(ep.apaTurns, 1);
  assert.equal(ep.startedAt, at(59));
});

test('a long silence is measured from the last thing said', () => {
  const ep = S.episodeOf([msg('user', 'hi', 120), msg('apa', 'hey', 119)], {}, NOW);
  assert.ok(ep.idleMs > 45 * 60000);
  const busy = S.episodeOf([msg('user', 'hi', 3), msg('apa', 'hey', 2)], {}, NOW);
  assert.ok(busy.idleMs < 45 * 60000);
});

test('a thread with no divider is one conversation', () => {
  const ep = S.episodeOf([msg('user', 'a', 5), msg('system', 'Handed to the team', 4), msg('apa', 'b', 3)], { episode_n: 1 }, NOW);
  assert.equal(ep.n, 1);
  assert.equal(ep.messages.length, 2, 'system lines are not conversation');
});

test('without the model, the note still says what was asked and how it ended', () => {
  const note = S.fallbackSummary([msg('user', 'Is there parking at the Jets Nest?', 10), msg('apa', 'Yes, the host lists parking.', 9)], { apa_resolved: true });
  assert.match(note.summary, /parking at the Jets Nest/);
  assert.match(note.summary, /host lists parking/);
  assert.equal(note.outcome, 'resolved');
  assert.equal(S.fallbackSummary([msg('user', 'x', 1)], { escalated_at: at(1) }).outcome, 'escalated');
});

test('APA is grounded in the live catalogue, with pages and ids she can book', () => {
  const rows = JSON.parse(readFileSync(new URL('./fixtures/growth-catalogue.json', import.meta.url), 'utf8'));
  const items = rows.map(normalise).filter(Boolean);
  items.forEach(i => { i.price = i.base_price; });
  const g = S.catalogueGrounding(items, Date.parse('2026-10-02T00:00:00Z'));
  assert.equal(g.total, items.length);
  assert.match(g.text, /stays: 5 live/);
  assert.match(g.text, /page \/stay\/the-jets-nest-obama-estate-65ef1d11 — id 65ef1d11-a4e3-4250-bbac-f826c0cd10d2/);
  assert.match(g.text, /car hire: 1 live/);
  assert.match(g.text, /NEW IN THE LAST 48 HOURS: .*Fully furnished Elegant/);
  assert.match(S.catalogueGrounding([]).text, /nothing is published right now/);
});

test('ordinary questions stay with APA; real requests reach a person', () => {
  const stays = [
    'how do I become an agent?', 'agent commission rates', 'travel agents in Nairobi',
    'press the button and nothing happens', 'basketball court near Karen?', 'is the rain a threat to my safari?',
    'police clearance for drivers', 'is it legal to drive with a foreign licence?', 'what is the dispute window for a review?',
  ];
  for (const t of stays) assert.equal(S.__test.hardEscalation(t), null, `"${t}" should stay with APA`);
  const people = {
    'can I talk to a human': 'human_request', 'I want to speak to someone': 'human_request', 'agent': 'human_request',
    'my host threatened me': 'safety', 'I feel unsafe here': 'safety', 'I will sue Cabana': 'legal',
    'delete my account': 'legal', 'I was charged twice': 'billing', 'this is a scam': 'fraud',
  };
  for (const [t, cat] of Object.entries(people)) assert.equal((S.__test.hardEscalation(t) || {}).category, cat, t);
});

test('the prompt tells APA a new conversation is new', () => {
  const p = S.__test.systemPrompt({ grounding: '', page: 'tours', caller: {}, threadAge: 'brand new', apaTurns: 0, ads: [], mode: 'task', fresh: true });
  assert.match(p, /THIS IS A NEW CONVERSATION/);
  assert.match(p, /do not resume an old topic/);
  const mid = S.__test.systemPrompt({ grounding: '', page: 'tours', caller: {}, threadAge: '3 minutes', apaTurns: 2, ads: [], mode: 'task' });
  assert.doesNotMatch(mid, /THIS IS A NEW CONVERSATION/);
});

test('get_listing is offered when someone asks about a specific place', () => {
  const names = S.__test.selectApaTools({ mode: 'task', text: 'does it have parking?', history: [], agent: '' }).map(t => t.function.name);
  assert.ok(names.includes('get_listing'));
  const search = S.__test.selectApaTools({ mode: 'task', text: 'find me a stay in Diani', history: [], agent: '' }).map(t => t.function.name);
  assert.ok(search.includes('search_stays') && search.includes('get_listing'));
  assert.deepEqual(S.__test.selectApaTools({ mode: 'social', text: 'hey', history: [], agent: '' }), []);
});

test('the widget folds earlier conversations and opens fresh after a while away', () => {
  const src = readFileSync(new URL('../cabana-support.js', import.meta.url), 'utf8');
  assert.match(src, /var EPISODE_IDLE_MS = 45 \* 60 \* 1000;/);
  assert.match(readFileSync(new URL('../api/lib/_support.js', import.meta.url), 'utf8'), /const EPISODE_IDLE_MS = 45 \* 60 \* 1000;/,
    'the widget and the server agree on when a conversation has ended');
  assert.match(src, /id="cbn-sup-new"/);
  assert.match(src, /api\('new', \{ threadId: thread\.id \}\)/);
  assert.match(src, /visitorId: ls\('apt_vid'\)/);
});
