// Run in a separate process so test files cannot mutate the release runner's env.
import { run } from 'node:test';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const files = (await readdir('tests')).filter(f => f.endsWith('.test.mjs')).map(f => resolve('tests', f));
let failed = 0, passed = 0;
for await (const event of run({ files, concurrency: 4, timeout: 120_000 })) {
  if (!['test:pass', 'test:fail'].includes(event.type) || event.data.details?.type === 'suite') continue;
  const d = event.data;
  // Node emits file-container failures in addition to individual assertions.
  // Keep the failures, but don't count successful file containers as assertions.
  if (files.includes(d.name) && event.type === 'test:pass') continue;
  const status = d.skip || d.todo ? 'blocked' : event.type === 'test:pass' ? 'passed' : 'failed';
  if (status === 'passed') passed++;
  if (status === 'failed') failed++;
  console.log(JSON.stringify({ id: `contract:${(d.file || '').replaceAll('\\', '/').split('/tests/').pop()}:${d.line}:${d.name}`, kind: 'contract', status,
    detail: status === 'failed' ? String(d.details?.error?.message || 'Regression assertion failed') : d.name }));
}
console.log(JSON.stringify({ id: 'contracts', kind: 'check', status: failed || !passed ? 'failed' : 'passed', detail: `${passed} assertions passed; ${failed} failures` }));
process.exitCode = failed || !passed ? 1 : 0;
