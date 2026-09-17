import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { randomUUID } from 'node:crypto';
import { targetURL, summarize, markdown, html, redact } from './core.mjs';
import { probeRoutes, checkDeployment, checkDatabase, checkRLS } from './infrastructure.mjs';
import { publicBrowser, stagingBrowser } from './browser.mjs';

const runId = process.env.QA_RUN_ID || `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`;
if (!/^[a-zA-Z0-9_-]+$/.test(runId)) throw Error('QA_RUN_ID may contain only letters, numbers, hyphens and underscores');
const output = resolve('artifacts/release-health', runId);
if (existsSync(join(output, 'release-health.json'))) throw Error('Run ID already exists; refusing to overwrite prior release evidence');
await mkdir(output, { recursive: true });
const results = [];
const record = row => {
  results.push({ ...row, detail: redact(row.detail), checkedAt: new Date().toISOString() });
  if (row.kind !== 'contract') console.log(`  ${row.status}: ${row.id}`);
};
let origin, server, finalized = false;
let config = {};
const meta = { runId, environment: process.env.QA_MODE === 'staging' ? 'Staging' : process.env.QA_BASE_URL ? 'Production' : 'Local',
  sha: process.env.QA_SHA, startedAt: new Date().toISOString() };

async function persist() {
  const report = summarize(results, { ...meta, target: origin, finishedAt: new Date().toISOString() });
  await writeFile(join(output, 'release-health.json'), JSON.stringify(report, null, 2));
  await writeFile(join(output, 'release-health.md'), markdown(report));
  await writeFile(join(output, 'release-health.html'), html(report));
  return report;
}

async function finalize() {
  if (finalized) return;
  finalized = true;
  const report = await persist();
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown(report));
  console.log(`\nCABANA RELEASE HEALTH\n${meta.environment}: ${report.status}\n${report.journeysPassed} journeys passed\n${report.contractTestsPassed} regression assertions passed\n${report.warnings} warnings\n${report.critical} critical regressions\n${report.blocked} unverified\nReport: ${output}\n`);
  process.exitCode = report.status === 'UNHEALTHY' ? 1 : report.status === 'UNVERIFIED' ? 2 : report.status === 'DEGRADED' ? 3 : 0;
  server?.closeAllConnections();
  if (server) await new Promise(resolveClose => server.close(resolveClose));
}

async function contracts() {
  // Backend unit tests receive no live credentials, including inherited ones.
  const testEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/(^QA_|TOKEN|SECRET|PASSWORD|KEY|CREDENTIAL|^SUPABASE_|^VERCEL_)/.test(key)));
  const child = spawn(process.execPath, ['scripts/qa/contracts.mjs'], { env: testEnv, stdio: ['ignore', 'pipe', 'pipe'], timeout: 10 * 60_000 });
  let parseError = false;
  const done = new Promise((resolveDone, reject) => { child.once('error', reject); child.once('close', (code, signal) => resolveDone({ code, signal })); });
  child.stderr.on('data', () => {}); // failure messages are emitted as structured events
  for await (const line of createInterface({ input: child.stdout })) {
    try { record(JSON.parse(line)); } catch { parseError = true; }
  }
  const { code, signal } = await done;
  if (parseError || signal || (code !== 0 && !results.some(r => r.id === 'contracts' && r.status === 'failed'))) {
    record({ id: 'contract-runner', kind: 'check', status: 'failed', detail: `Regression runner did not complete cleanly (exit ${code}, signal ${signal || 'none'}).` });
  }
}

async function stage(id, fn) {
  console.log(`QA: ${id}`);
  try { await fn(); }
  catch (error) { record({ id, kind: 'check', status: 'failed', detail: error.message }); }
  await persist();
}

await persist(); // A killed run leaves UNVERIFIED evidence, never an old green report.
try {
  if (process.env.QA_CONFIG_PATH) config = JSON.parse(await readFile(process.env.QA_CONFIG_PATH, 'utf8'));
  if (process.argv.includes('--report-only')) {
    record({ id: 'workflow', kind: 'check', status: 'failed', detail: 'Workflow setup failed before the QA runner could execute.' });
  } else {
    if (process.env.QA_BASE_URL) origin = targetURL(process.env.QA_BASE_URL);
    else {
      const { default: app } = await import('../../server.js');
      server = app.listen(0, '127.0.0.1');
      await new Promise((ready, reject) => { server.once('listening', ready); server.once('error', reject); });
      origin = `http://127.0.0.1:${server.address().port}`;
    }
    await stage('contracts-runner', contracts);
    const headers = process.env.QA_VERCEL_BYPASS_SECRET ? { 'x-vercel-protection-bypass': process.env.QA_VERCEL_BYPASS_SECRET } : {};
    await stage('route-runner', () => probeRoutes(origin, record, headers));
    await stage('browser-runner', () => publicBrowser(origin, record, output));
    await stage('deployment-runner', () => checkDeployment(origin, record));
    if (results.some(row => row.id === 'database-target' && row.status === 'passed')) {
      await stage('database-runner', () => checkDatabase(config, record));
      await stage('rls-runner', () => checkRLS(config, record));
    } // Unbound projects remain explicitly unverified in the required-check matrix.
    await stage('staging-runner', async () => {
      if (!process.env.QA_STAGING_BASE_URL) return stagingBrowser(origin, config, record, runId);
      const stagingOrigin = targetURL(process.env.QA_STAGING_BASE_URL);
      const stagingEnv = { ...process.env, QA_BASE_URL: stagingOrigin, QA_MODE: 'staging',
        QA_VERCEL_PROJECT_ID: process.env.QA_STAGING_VERCEL_PROJECT_ID || process.env.QA_VERCEL_PROJECT_ID,
        QA_SUPABASE_PROJECT_REF: process.env.QA_STAGING_SUPABASE_PROJECT_REF };
      const evidence = [];
      await checkDeployment(stagingOrigin, row => evidence.push(row), stagingEnv);
      for (const row of evidence) record({ ...row, id: 'staging-deployment', detail: `${row.detail}; ${stagingOrigin}` });
      if (evidence.some(row => row.status !== 'passed')) return;
      await stagingBrowser(stagingOrigin, config, record, runId, stagingEnv);
    });
    record({ id: 'completion', kind: 'check', status: 'passed', detail: 'Runner reached the end of all configured stages.' });
  }
} catch (error) { record({ id: 'runner', kind: 'check', status: 'failed', detail: error.message }); }
finally { await finalize(); }
