import test from 'node:test';
import assert from 'node:assert/strict';
import { services, serviceJourneys, requiredJourneys, requiredChecks } from '../scripts/qa/catalog.mjs';
import { summarize, compareMigrations, assertStaging, targetURL, redact, html, markdown } from '../scripts/qa/core.mjs';
import { validatePlan, protectContext } from '../scripts/qa/browser.mjs';
import { checkRLS, probeRoutes } from '../scripts/qa/infrastructure.mjs';
import http from 'node:http';

const complete = () => [
  ...requiredJourneys.map(r => ({ ...r, kind: 'journey', status: 'passed' })),
  ...requiredChecks.map(id => ({ id, kind: 'check', status: 'passed' })),
];

test('matrix includes all nine services and every requested journey without duplicate IDs', () => {
  assert.equal(services.length, 9);
  assert.equal(new Set(requiredJourneys.map(r => r.id)).size, requiredJourneys.length);
  assert.equal(serviceJourneys.length, 15);
  for (const service of services) assert.equal(requiredJourneys.filter(r => r.service === service.id).length, 15);
});
test('empty, partial, skipped and invalid evidence cannot become healthy', () => {
  assert.equal(summarize([]).status, 'UNVERIFIED');
  assert.equal(summarize(complete().slice(1)).status, 'UNVERIFIED');
  assert.equal(summarize(complete().map(r => r.id === 'migrations' ? { ...r, status: 'skipped' } : r)).status, 'UNHEALTHY');
  assert.equal(summarize(complete()).status, 'HEALTHY');
});
test('contract assertions never masquerade as live journeys', () => {
  const report = summarize([{ id: 'shared.login', kind: 'contract', status: 'passed' }]);
  assert.equal(report.journeysPassed, 0);
  assert.equal(report.contractTestsPassed, 1);
  assert.ok(report.results.some(r => r.id === 'shared.login' && r.kind === 'journey' && r.status === 'blocked'));
});
test('critical failure, warning and duplicate evidence change the release result', () => {
  assert.equal(summarize([...complete(), { id: 'crash', status: 'failed' }]).status, 'UNHEALTHY');
  assert.equal(summarize([...complete(), { id: 'slow', status: 'warning' }]).status, 'DEGRADED');
  assert.equal(summarize([...complete(), complete()[0]]).status, 'UNHEALTHY');
});
test('not-applicable needs an explicit reason and is excluded from pass counts', () => {
  const rows = complete(); rows[0] = { ...rows[0], status: 'not-applicable' };
  assert.equal(summarize(rows).status, 'UNVERIFIED');
  rows[0].detail = 'Reviewed product applicability decision';
  assert.equal(summarize(rows).status, 'HEALTHY');
  assert.equal(summarize(rows).journeysPassed, requiredJourneys.length - 1);
});
test('migration comparison detects both directions of drift and duplicates', () => {
  assert.deepEqual(compareMigrations(['1', '2'], ['2', '3']), { missing: ['1'], unexpected: ['3'], duplicateLocal: false, duplicateRemote: false });
  assert.equal(compareMigrations(['1', '1'], ['1']).duplicateLocal, true);
});
test('origin parsing and the mutation gate reject production and implicit opt-in', () => {
  for (const url of ['http://cabana.africa', 'https://a.test/path', 'https://user:pw@a.test', 'https://a.test?token=x']) assert.throws(() => targetURL(url));
  const config = { stagingOrigins: ['https://stage.test', 'https://cabana.africa'], sandboxPayments: true, syntheticAccountsOnly: true };
  assert.throws(() => assertStaging(config, { QA_BASE_URL: 'https://stage.test', QA_MODE: 'staging' }));
  assert.throws(() => assertStaging(config, { QA_BASE_URL: 'https://cabana.africa', QA_MODE: 'staging', QA_ALLOW_MUTATIONS: 'true' }));
  assert.equal(assertStaging(config, { QA_BASE_URL: 'https://stage.test', QA_MODE: 'staging', QA_ALLOW_MUTATIONS: 'true' }), 'https://stage.test');
});
test('missing fixtures cannot pass RLS by observing empty data', async () => {
  const rows = []; await checkRLS({}, r => rows.push(r), {});
  assert.equal(rows[0].status, 'blocked');
});
for (const scenario of ['isolated', 'empty-owner', 'leaked-row']) {
  test(`behavioral RLS detects ${scenario} with a positive owner control`, async t => {
    t.mock.method(globalThis, 'fetch', async (input, options) => {
      const url = new URL(input), owner = options.headers.Authorization === 'Bearer owner-token';
      const body = url.pathname === '/auth/v1/user' ? { id: owner ? 'owner-id' : 'outsider-id' }
        : owner ? (scenario === 'empty-owner' ? [] : [{ id: 'private-row' }])
          : scenario === 'leaked-row' ? [{ id: 'private-row' }] : [];
      return new Response(JSON.stringify(body), { status: 200 });
    });
    const rows = [];
    await checkRLS({ rls: [{ table: 'bookings', rowId: 'private-row', ownerTokenEnv: 'OWNER_TOKEN', outsiderTokenEnv: 'OTHER_TOKEN' }] }, r => rows.push(r),
      { QA_SUPABASE_PROJECT_REF: 'testproject', QA_SUPABASE_ANON_KEY: 'anon', OWNER_TOKEN: 'owner-token', OTHER_TOKEN: 'outsider-token' });
    assert.equal(rows.find(r => r.id === 'rls').status, scenario === 'isolated' ? 'passed' : 'failed');
  });
}
test('RLS refreshes synthetic sessions and revokes both after an assertion fails', async t => {
  const revoked = [];
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    const url = new URL(input);
    if (url.pathname === '/auth/v1/token') return new Response(JSON.stringify({ access_token: JSON.parse(options.body).email }));
    if (url.pathname === '/auth/v1/logout') { revoked.push(options.headers.Authorization); return new Response(null, { status: 204 }); }
    if (url.pathname === '/auth/v1/user') return new Response(JSON.stringify({ id: options.headers.Authorization }));
    return new Response('[]'); // positive-control failure must still clean up
  });
  const rows = [];
  await checkRLS({ accounts: { owner: { emailEnv: 'OWNER_EMAIL', passwordEnv: 'PW' }, outsider: { emailEnv: 'OTHER_EMAIL', passwordEnv: 'PW' } }, rls: [{ table: 'bookings', rowId: 'seed' }] }, r => rows.push(r),
    { QA_SUPABASE_PROJECT_REF: 'testproject', QA_SUPABASE_ANON_KEY: 'anon', OWNER_EMAIL: 'owner@example.test', OTHER_EMAIL: 'other@example.test', PW: 'synthetic' });
  assert.equal(rows.find(r => r.id === 'rls').status, 'failed');
  assert.equal(revoked.length, 2);
});
test('a staging plan must exercise an interaction, assert a result and clean up', () => {
  assert.throws(() => validatePlan({ steps: [{ action: 'goto' }], cleanup: [] }));
  assert.throws(() => validatePlan({ steps: [{ action: 'click' }], cleanup: [{ action: 'goto' }] }));
  validatePlan({ steps: [{ action: 'click' }, { action: 'expect-visible' }], cleanup: [{ action: 'goto' }] });
});
test('network guard blocks writes in production and never forwards bypass to third parties', async () => {
  let handler;
  await protectContext({ route: async (_, fn) => { handler = fn; } }, 'https://stage.test', { bypass: 'private-bypass' });
  async function probe(url, method) {
    let result;
    await handler({ request: () => ({ url: () => url, method: () => method, headers: () => ({ 'x-vercel-protection-bypass': 'old' }) }), abort: async () => { result = 'aborted'; }, continue: async opts => { result = opts; } });
    return result;
  }
  assert.equal(await probe('https://stage.test/api/pay', 'POST'), 'aborted');
  assert.equal((await probe('https://stage.test/app.js', 'GET')).headers['x-vercel-protection-bypass'], 'private-bypass');
  assert.equal((await probe('https://third.test/app.js', 'GET')).headers['x-vercel-protection-bypass'], undefined);
});
test('route probe catches missing pages, redirect loops, soft 404s and cross-origin redirects', async () => {
  const server = http.createServer((req, res) => {
    if (req.url === '/cross') { res.writeHead(302, { location: 'https://other.test' }); return res.end(); }
    if (req.url === '/loop') { res.writeHead(302, { location: '/loop' }); return res.end(); }
    if (req.url === '/missing') { res.writeHead(404); return res.end('missing'); }
    res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html><title>Cabana</title>');
  }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const rows = [];
    await probeRoutes(`http://127.0.0.1:${server.address().port}`, r => rows.push(r), {}, ['/ok', '/missing', '/cross', '/loop']);
    assert.equal(rows.find(r => r.id === 'route:/ok').status, 'passed');
    for (const id of ['route:/missing', 'route:/cross', 'route:/loop', 'route:404']) assert.equal(rows.find(r => r.id === id).status, 'failed');
    assert.equal(summarize(rows).brokenRoutes, 4);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
test('reports escape HTML, redact credentials and show unknown route counts honestly', () => {
  const report = summarize([{ id: '<script>bad</script>', status: 'failed', detail: '<img onerror=bad>' }], { environment: 'Local', runId: 'test' });
  assert.ok(!html(report).includes('<img onerror=bad>'));
  assert.ok(markdown(report).includes('Broken routes: unverified'));
  assert.equal(redact('Bearer abc my-password', { QA_PASSWORD: 'my-password' }), 'Bearer [REDACTED] [REDACTED]');
});
