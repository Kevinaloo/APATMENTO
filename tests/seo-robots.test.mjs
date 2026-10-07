/* ═══════════════════════════════════════════════════════════════════
   robots.txt · one rulebook for every crawler
   ─────────────────────────────────────────────────────────────────
   A crawler obeys only the most specific group that names it. Give a
   crawler its own "Allow: /" group and it silently skips every
   Disallow, which is how AI crawlers and Bingbot ended up free to
   wander the signed-in app. These checks keep that from coming back.
   ═══════════════════════════════════════════════════════════════════ */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const robots = readFileSync(new URL('../robots.txt', import.meta.url), 'utf8');
const lines = robots.split('\n').map(l => l.replace(/#.*/, '').trim()).filter(Boolean);

/* RFC 9309 groups: consecutive User-agent lines open a group, the rules
   that follow belong to it. */
function groups() {
  const out = []; let cur = null, inAgents = false;
  for (const l of lines) {
    const [k, ...v] = l.split(':'); const key = k.trim().toLowerCase(), val = v.join(':').trim();
    if (key === 'user-agent') {
      if (!inAgents) { cur = { agents: [], rules: [] }; out.push(cur); }
      cur.agents.push(val.toLowerCase()); inAgents = true;
    } else if (key !== 'sitemap') { inAgents = false; if (cur) cur.rules.push(l); }
  }
  return out;
}

test('every crawler shares one set of rules', () => {
  const g = groups();
  assert.equal(g.length, 2, 'only the PWABuilder packager and the shared group');
  assert.deepEqual(g[0].agents, ['pwabuilderhttpagent']);
  const shared = g[1];
  for (const bot of ['*', 'googlebot', 'bingbot', 'gptbot', 'claudebot', 'perplexitybot', 'applebot', 'adsbot-google', 'duckduckbot', 'google-extended'])
    assert.ok(shared.agents.includes(bot), bot + ' is named in the shared group');
  const all = g.flatMap(x => x.agents);
  assert.equal(new Set(all).size, all.length, 'no crawler is named twice');
});

test('the signed-in app is blocked, public pages and shared links are not', () => {
  const rules = groups()[1].rules;
  for (const p of ['/auth', '/dashboard', '/my-bookings', '/profile', '/partner-', '/admin', '/api/'])
    assert.ok(rules.includes('Disallow: ' + p), p);
  assert.ok(rules.includes('Allow: /'));
  assert.ok(!rules.some(r => /utm|ref=/.test(r)), 'tracking links stay crawlable; canonicals fold them into the real page');
  assert.ok(!rules.some(r => /^Disallow: \/(checkout|ambassador-dashboard)/.test(r)), 'pages leaving the index must stay crawlable so noindex is seen');
  assert.ok(rules.some(r => /^Content-Signal: search=yes, ai-input=yes/.test(r)));
});

test('every sitemap it advertises exists', () => {
  const maps = lines.filter(l => /^sitemap:/i.test(l)).map(l => l.split(/:\s*/).slice(1).join(':'));
  assert.ok(maps.length >= 7);
  for (const m of maps) {
    const u = new URL(m);
    assert.equal(u.host, 'cabana.africa');
    assert.ok(existsSync(new URL('..' + u.pathname, import.meta.url)), u.pathname);
  }
});
