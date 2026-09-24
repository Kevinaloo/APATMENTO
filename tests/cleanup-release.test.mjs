import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('dashboard initializes the chat API that CabanaChat actually exposes', () => {
  const dashboard = read('dashboard.html');
  const chat = read('chat.js');
  assert.match(dashboard, /_try\(CabanaChat\.initBell,\s*'chat'\)/);
  assert.match(chat, /initFAB:\s*initBell/);
  assert.doesNotMatch(dashboard, /_try\(CabanaChat\.initFAB,\s*'chat'\)/);
});

test('admin transport snapshot uses the live ride_requests schema', () => {
  const core = read('apa-admin-core.js');
  const consoleSources = ['admin.html', 'admin-console.js', 'admin-views-ops.js', 'admin-views-more.js'].map(read).join('\n');
  const ledger = read('supabase/migrations/20260925090000_admin_console_v2.sql');
  assert.match(core, /rows\('ride_requests'/);
  assert.doesNotMatch(core, /rows\('transport_requests'/);
  /* Rides are cancelled through the unified booking ledger, which reads
     and writes the live ride_requests table. */
  assert.match(ledger, /from public\.ride_requests/);
  assert.match(ledger, /update public\.ride_requests set status = 'cancelled'/);
  assert.doesNotMatch(consoleSources, /transport_requests/);
});

test('local Express 5 rewrites do not assign to the read-only query getter', () => {
  const server = read('server.js');
  assert.doesNotMatch(server, /req\.query\s*=/);
  assert.match(server, /rewritten\.searchParams\.set\(key, value\)/);
  assert.match(server, /req\.url\s*=/);
});

test('newsletter migration is server-only and its views invoke RLS', () => {
  const sql = read('supabase/migrations/20260901130708_newsletter_integrity_and_security_hardening.sql');
  assert.match(sql, /alter table public\.newsletter_subscribers enable row level security/i);
  assert.match(sql, /revoke all privileges on table public\.newsletter_subscribers from public, anon, authenticated/i);
  assert.match(sql, /alter view public\.v_agent_portfolio set \(security_invoker = true\)/i);
  assert.match(sql, /alter view public\.v_host_agents set \(security_invoker = true\)/i);
});

test('IndexNow credentials are server-configured, never committed', () => {
  const utilities = read('api/utilities.js');
  assert.match(utilities, /process\.env\.INDEXNOW_KEY/);
  assert.doesNotMatch(utilities, /const\s+INDEXNOW_KEY\s*=\s*['"][^'"]+['"]/);
  assert.doesNotMatch(utilities, /covers Google/i);
});
