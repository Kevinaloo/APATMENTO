import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const files = new Set();

function walk(path) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'tests') continue;
    const full = join(path, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && /\.(?:js|mjs)$/.test(entry.name)) files.add(full);
  }
}

walk('.');

let failed = false;
for (const file of [...files].sort()) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    failed = true;
    process.stderr.write(`${file}\n${result.stderr || result.stdout}`);
  }
}

if (failed) process.exit(1);
console.log(`Syntax OK: ${files.size} JavaScript modules`);
