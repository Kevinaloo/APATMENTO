import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

test('messenger never writes protected message fields from the browser', () => {
  const chat = read('chat.js');
  const inserts = chat.match(/from\('chat_messages'\)\s*\.insert\(\{[^}]*\}/g) || [];
  assert.ok(inserts.length >= 1);
  for (const i of inserts) assert.doesNotMatch(i, /\b(kind|is_system|payload|visible_to|content_raw|was_scrubbed)\s*:/);
  assert.doesNotMatch(chat, /from\('chat_conversations'\)\s*\.(insert|upsert|update)/, 'conversations change only through RPCs');
  assert.doesNotMatch(chat, /from\('notifications'\)\s*\.insert/, 'notifications are server-written');
});

test('offers, suggestions and escalations go through server functions', () => {
  const chat = read('chat.js');
  for (const fn of ['cabana_chat_start', 'cabana_chat_thread', 'cabana_chat_inbox', 'cabana_chat_mark_read', 'cabana_chat_send_offer',
    'cabana_chat_offer_respond', 'cabana_chat_suggest', 'cabana_chat_suggest_candidates', 'cabana_chat_set_state', 'cabana_chat_set_trip', 'cabana_chat_for_booking'])
    assert.match(chat, new RegExp(`'${fn}'`), fn);
  assert.match(chat, /op: 'chat\.escalate'/);
  assert.match(chat, /\/api\/match-guest/, 'paid bookings are rehomed through the rehoming engine, not a chat card');
  assert.match(read('api/lib/_support.js'), /case 'chat\.escalate'/);
  assert.match(read('api/lib/_support.js'), /case 'agent\.chat_post'/);
});

test('every chat migration defines what the messenger calls', () => {
  const sql = readdirSync(new URL('../supabase/migrations/', import.meta.url)).filter(f => f.includes('chat_v6')).map(f => read('supabase/migrations/' + f)).join('\n');
  for (const fn of ['cabana_chat_start', 'cabana_chat_thread', 'cabana_chat_inbox', 'cabana_chat_send_offer', 'cabana_chat_suggest', 'cabana_chat_service_post', 'chat_guard_row', 'profile_guard'])
    assert.match(sql, new RegExp(`function (public|cabana_private)\\.${fn}\\(`), fn);
  assert.match(sql, /revoke insert, update, delete, truncate, references, trigger on public\.notifications from authenticated/);
  // A SECURITY DEFINER trigger cannot see the caller's role; the gates must be invokers.
  for (const gate of ['chat_before_insert', 'chat_conv_before_insert', 'profile_guard'])
    assert.match(read('supabase/migrations/20260920122000_chat_v6_invoker_gates.sql'), new RegExp(`${gate}\\(\\)\\nreturns trigger language plpgsql security invoker`), gate);
});

test('hosts reach their messages from every Partner Hub page', () => {
  for (const f of readdirSync(new URL('../', import.meta.url)).filter(f => /^partner-.*\.html$/.test(f)))
    assert.match(read(f), /chat\.js\?v=40/, f);
  assert.match(read('partner-bookings.html'), /data-cbx-booking=/);
  assert.match(read('my-bookings.html'), /data-cbx-booking=/);
});
