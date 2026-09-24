/* ═══════════════════════════════════════════════════════════════════
   Operations console · contracts that must not drift
   ─────────────────────────────────────────────────────────────────
   The console is presentation over admin_* RPCs. These tests pin the
   parts that fail silently in production: a nav item with no view, an
   RPC the database does not have, a desk module that cannot find its
   mount point, HTML that stops escaping, or a secret in the page.
   ═══════════════════════════════════════════════════════════════════ */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const read = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const shell = read('admin.html');
const core = read('admin-console.js');
const views = read('admin-views-ops.js') + '\n' + read('admin-views-more.js');
const migrations = readdirSync(new URL('../supabase/migrations/', import.meta.url))
  .filter(f => f.endsWith('.sql')).map(f => read('supabase/migrations/' + f)).join('\n');

function bootConsole() {
  const dom = new JSDOM('<!doctype html><body><div id="toasts"></div></body>', { url: 'https://cabana.africa/admin', runScripts: 'outside-only' });
  const w = dom.window;
  w.matchMedia = () => ({ matches: false, addEventListener() {} });
  w.eval(core);
  return w;
}

test('the shell carries no secrets and no hard-coded operator list', () => {
  assert.doesNotMatch(shell, /PUSH_ADMIN_SECRET|push-admin-secret|x-admin-secret/i);
  assert.doesNotMatch(shell + core + views, /apa_push_secret/);
  assert.doesNotMatch(core + views, /ADMINS\s*=\s*\[/, 'operator access must come from admin_whoami, not a client list');
  assert.match(core, /rpc\('admin_whoami'\)/);
  assert.match(shell, /name="robots" content="noindex, nofollow"/);
});

test('every console script and stylesheet the shell loads exists', () => {
  const refs = [...shell.matchAll(/(?:src|href)="\/([^"?#]+\.(?:js|css))/g)].map(m => m[1]);
  assert.ok(refs.includes('admin-console.js') && refs.includes('admin-views-ops.js') && refs.includes('admin-views-more.js'));
  for (const f of refs) assert.doesNotThrow(() => read(f), `${f} is referenced by admin.html but missing`);
  assert.ok(refs.indexOf('admin-console.js') < refs.indexOf('admin-views-ops.js'), 'core must load before the views');
  assert.ok(refs.indexOf('vendor-supabase-2.112.3.js') < refs.indexOf('admin-console.js'));
});

test('every navigation entry resolves to a view, a desk or an external desk', () => {
  const w = bootConsole();
  const registered = new Set([...views.matchAll(/CX\.view\('([a-z]+)'/g)].map(m => m[1]));
  for (const group of w.CX.NAV) {
    for (const item of group.items) {
      const ok = registered.has(item.id) || item.desk || item.href;
      assert.ok(ok, `nav item "${item.id}" has nothing to render`);
      if (item.desk) assert.match(shell, new RegExp(`id="${item.desk}"`), `desk section #${item.desk} missing from admin.html`);
    }
  }
  w.close();
});

test('desk modules find the mount points they render into', () => {
  for (const id of ['s-tours', 's-events', 's-flights', 's-transport', 'rides-admin-root', 'admin-offers']) {
    assert.match(shell, new RegExp(`id="${id}"`), `#${id} is required by a desk module`);
  }
  assert.match(read('cabana-tours-admin.js'), /\$\('s-tours'\)/);
  assert.match(read('cabana-rides-admin.js'), /rides-admin-root/);
});

test('every admin RPC the console calls exists in a migration', () => {
  const called = new Set([...(core + views).matchAll(/rpc\('(admin_[a-z_]+)'/g)].map(m => m[1]));
  assert.ok(called.size >= 20, 'expected the console to use the admin RPC surface');
  for (const fn of called) {
    assert.match(migrations, new RegExp(`create or replace function public\\.${fn}\\(`), `${fn} is called but never defined`);
  }
});

test('privileged RPCs are guarded and never granted to anon', () => {
  const sql = read('supabase/migrations/20260925090000_admin_console_v2.sql');
  const fns = [...sql.matchAll(/create or replace function public\.(admin_[a-z_]+)\(/g)].map(m => m[1]);
  for (const fn of new Set(fns)) {
    if (fn === 'admin_whoami' || fn === 'admin_role' || fn === 'admin_audit_stamp') continue;
    const body = sql.slice(sql.indexOf(`function public.${fn}(`));
    const end = body.indexOf('$$;');
    assert.match(body.slice(0, end), /cabana_admin\.guard\(\)/, `${fn} must call cabana_admin.guard()`);
  }
  assert.match(sql, /revoke all on function %s from public, anon/);
  assert.doesNotMatch(sql, /grant execute on function public\.admin_[a-z_]+\([^)]*\) to anon/);
});

test('the html helper escapes every interpolation and urls are sanitised', () => {
  const w = bootConsole();
  const { html, raw, safeUrl } = w.CX;
  const evil = '<img src=x onerror=alert(1)>"\'&';
  const out = String(html`<b title="${evil}">${evil}</b>`);
  assert.doesNotMatch(out, /<img/);
  assert.match(out, /&lt;img src=x onerror=alert\(1\)&gt;&quot;&#39;&amp;/);
  assert.equal(String(html`${raw('<i>ok</i>')}`), '<i>ok</i>');
  assert.equal(String(html`${[1, false, null, 'a']}`), '1a');
  assert.equal(safeUrl('javascript:alert(1)'), '');
  assert.equal(safeUrl(' data:text/html,<script>'), '');
  assert.equal(safeUrl('https://cabana.africa/x.jpg'), 'https://cabana.africa/x.jpg');
  assert.equal(safeUrl('/apartments?listing=1'), '/apartments?listing=1');
  w.close();
});

test('money and time formatting are stable', () => {
  const w = bootConsole();
  const { money, compact, delta, human } = w.CX;
  assert.equal(money(12345.6), 'KES 12,346');
  assert.equal(money(null), 'KES 0');
  assert.equal(compact(1500), '1.5k');
  assert.equal(compact(2_400_000), '2.4M');
  assert.match(String(delta(120, 100)), /up/);
  assert.match(String(delta(80, 100)), /dn/);
  assert.equal(human('pending_owner'), 'Pending owner');
  w.close();
});

test('CSV export neutralises spreadsheet formulas', () => {
  const w = bootConsole();
  let captured = '';
  w.URL.createObjectURL = blob => { captured = blob; return 'blob:x'; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = () => {};
  w.CX.csv([{ name: '=HYPERLINK("http://evil")', note: 'a,b' }], null, 'x.csv');
  return captured.text().then(text => {
    assert.match(text, /'=HYPERLINK/);
    assert.match(text, /"a,b"/);
    w.close();
  });
});

test('the console never asks for the push secret; it uses the admin JWT path', () => {
  assert.match(views, /\/api\/push-send\?action=admin-send/);
  assert.match(views, /\/api\/push-send\?action=admin-broadcast/);
  const api = read('api/push-send.js');
  assert.match(api, /action === 'admin-send' \|\| action === 'admin-broadcast'/);
  assert.match(api, /isAdminUser/);
});

test('scheduled push campaigns have a scheduler', () => {
  assert.match(migrations, /cron\.schedule\('cabana-push-campaigns'/);
  assert.match(read('api/push-send.js'), /async function handleCron[\s\S]*broadcast\(/);
});
