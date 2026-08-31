/* ══════════════════════════════════════════════════════════════════════
   CABANA · BUILD PREFLIGHT
   scripts/check-syntax.mjs   (run as the Vercel buildCommand)
   ──────────────────────────────────────────────────────────────────────
   This file used to run `node --check` and nothing else. `node --check`
   parses a file in isolation: it never resolves an import, never loads a
   dependency, and never looks at routing config. Two production outages
   walked straight through it.

     1. api/lib/_flight-desk.js imported './lib/_mail.js' instead of
        './_mail.js'. Syntactically perfect. At runtime Node could not
        resolve it and the whole /api/trust function died at module load,
        taking nine routes with it — support desk, Ask APA, calls,
        check-in, payment status. Every request returned 500.

     2. /api/ambassadors was dropped from the deployed function set (the
        Hobby 12-function ceiling) and replaced by a vercel.json rewrite.
        The rewrite was documented in three files and added to none. Every
        ambassador call 404'd and the console showed "Request failed".

   Both are cheap to catch before a deploy. So now we catch them.

     GATE 1  syntax        every .js/.mjs parses
     GATE 2  resolution    every relative import points at a real file
     GATE 3  load          every api/*.js entrypoint actually imports
     GATE 4  routing       every /api/* URL the client calls is reachable

   A gate that only catches what already broke gets walked through again
   next week. These four check the shape of the system, not the specific
   mistakes of one August afternoon.
══════════════════════════════════════════════════════════════════════ */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const SKIP_DIRS = new Set(['node_modules', '.git', '.vercel', 'tests', 'seo']);

/* Bundled third-party code. We did not write it and cannot fix it; a
   failure here is noise, and noise trains people to ignore the build. */
const VENDOR = /(?:^|\/)vendor-|\.min\.js$/;

const failures = [];
const fail = (gate, file, msg) => failures.push({ gate, file, msg });

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && /\.(?:js|mjs|cjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const allJs = walk('.').map(f => f.replace(/^\.[\\/]/, '')).sort();
const ourJs = allJs.filter(f => !VENDOR.test(f));

/* ══ GATE 1 · SYNTAX ══════════════════════════════════════════════════ */
for (const file of ourJs) {
  const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (r.status !== 0) {
    fail('syntax', file, (r.stderr || r.stdout || '').trim().split('\n')[0]);
  }
}

/* ══ GATE 2 · IMPORT RESOLUTION ═══════════════════════════════════════
   Static `import/export ... from './x.js'` and bare side-effect imports.
   Package specifiers are Vercel's problem. Dynamic import() with a
   variable is unknowable, so it is skipped rather than guessed at. */
const FROM_IMPORT  = /(?:^|\n)\s*(?:import|export)\b[\s\S]{0,400}?\bfrom\s*['"](\.[^'"]+)['"]/g;
const SIDE_EFFECT  = /(?:^|\n)\s*import\s*['"](\.[^'"]+)['"]/g;

function resolvesOnDisk(fromFile, spec) {
  const base = resolve(dirname(fromFile), spec);
  return [base, base + '.js', base + '.mjs', join(base, 'index.js')]
    .some(c => existsSync(c) && statSync(c).isFile());
}

for (const file of ourJs) {
  const src = readFileSync(file, 'utf8');
  for (const re of [FROM_IMPORT, SIDE_EFFECT]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src)) !== null) {
      if (!resolvesOnDisk(file, m[1])) {
        const guess = './' + m[1].split('/').pop();
        fail('resolve', file, `imports '${m[1]}' — no such file on disk (did you mean '${guess}'?)`);
      }
    }
  }
}

/* ══ GATE 3 · SERVERLESS ENTRYPOINTS ACTUALLY LOAD ════════════════════
   The decisive check. Importing the module executes every transitive
   import exactly as a Lambda cold start does. If this passes, the
   function cannot die at module load in production.

   Ignored files are loaded too: they are not deployed, but a broken one
   is a landmine for whoever un-ignores it later. */
const IGNORED = existsSync('.vercelignore')
  ? new Set(readFileSync('.vercelignore', 'utf8').split('\n').map(l => l.trim()).filter(Boolean))
  : new Set();

const apiEntrypoints = existsSync('api')
  ? readdirSync('api', { withFileTypes: true })
      .filter(e => e.isFile() && /\.(?:js|mjs)$/.test(e.name))
      .map(e => 'api/' + e.name)
      .sort()
  : [];

for (const file of apiEntrypoints) {
  try {
    const mod = await import(pathToFileURL(resolve(file)).href);
    if (typeof mod.default !== 'function') {
      fail('load', file, 'exports no default handler — every request to it would 500');
    }
  } catch (e) {
    fail('load', file, `${e.code || 'ERROR'}: ${e.message}`);
  }
}

/* Hobby ceiling. Crossing it fails the deploy with a message that does
   not name the file you just added, so name it here instead. */
const FUNCTION_LIMIT = 12;
const deployedCount = apiEntrypoints.filter(f => !IGNORED.has(f)).length;
if (deployedCount > FUNCTION_LIMIT) {
  fail('routing', 'api/',
    `${deployedCount} serverless functions, ceiling is ${FUNCTION_LIMIT} on Hobby. ` +
    `Fold one into another and add a vercel.json rewrite, or add it to .vercelignore.`);
}

/* ══ GATE 4 · CLIENT /api/* CALLS ARE ROUTABLE ════════════════════════
   Scrape every '/api/...' literal out of the client surface and prove it
   resolves to a deployed function or a vercel.json rewrite. This is the
   check that would have caught the ambassador 404. */
let routesChecked = 0;

if (existsSync('vercel.json')) {
  const vc = JSON.parse(readFileSync('vercel.json', 'utf8'));
  const rewrites = new Set((vc.rewrites || []).map(r => String(r.source).split('?')[0].toLowerCase()));
  const deployed = new Set(
    apiEntrypoints.filter(f => !IGNORED.has(f))
                  .map(f => '/' + f.replace(/\.(?:js|mjs)$/, '').toLowerCase())
  );

  /* Client-side surfaces only. Server code calling its siblings is gate 2. */
  const clientFiles = [
    ...ourJs.filter(f => !f.startsWith('api/') && !f.startsWith('scripts/') && !f.startsWith('tools/')),
    ...readdirSync('.', { withFileTypes: true })
        .filter(e => e.isFile() && e.name.endsWith('.html'))
        .map(e => e.name),
  ];

  const API_LITERAL = /['"`](\/api\/[a-z0-9-]+)/gi;
  const seen = new Map();                   // route -> first file that calls it

  for (const file of clientFiles) {
    let src;
    try { src = readFileSync(file, 'utf8'); } catch { continue; }
    API_LITERAL.lastIndex = 0;
    let m;
    while ((m = API_LITERAL.exec(src)) !== null) {
      const route = m[1].toLowerCase();
      if (!seen.has(route)) seen.set(route, file);
    }
  }

  for (const [route, file] of seen) {
    routesChecked++;
    if (deployed.has(route) || rewrites.has(route)) continue;
    fail('routing', file, `calls ${route} — not a deployed function and not in vercel.json rewrites, so it will 404`);
  }
}

/* ══ REPORT ══════════════════════════════════════════════════════════ */
if (failures.length) {
  const HELP = {
    syntax:  'The file does not parse.',
    resolve: 'A relative import points at a path that does not exist. This is the class of bug that killed /api/trust: it passes `node --check` and dies at runtime.',
    load:    'A serverless entrypoint throws while loading. Every request to it 500s before your code runs.',
    routing: 'The browser calls an /api/ path with nothing behind it. Add the function, or add a rewrite to vercel.json.',
  };

  process.stderr.write('\n  BUILD PREFLIGHT FAILED\n');
  for (const gate of ['syntax', 'resolve', 'load', 'routing']) {
    const rows = failures.filter(f => f.gate === gate);
    if (!rows.length) continue;
    process.stderr.write(`\n  ── ${gate.toUpperCase()} ──\n  ${HELP[gate]}\n\n`);
    for (const r of rows) process.stderr.write(`    ${r.file}\n      ${r.msg}\n`);
  }
  process.stderr.write(`\n  ${failures.length} problem${failures.length === 1 ? '' : 's'}. Nothing deployed.\n\n`);
  process.exit(1);
}

console.log(
  `Preflight OK — ${ourJs.length} modules parsed, imports resolved, ` +
  `${apiEntrypoints.length} API entrypoints loaded (${deployedCount}/${FUNCTION_LIMIT} deployed), ` +
  `${routesChecked} client API routes reachable.`
);
