/* Where a tour's verify.mjs finds the old React viewer it is checked against.

   The old sources (tools/jets-nest-source, tools/shikaz-source,
   tools/kileleshwa-source) left the working tree once their scenes lived in
   src/tours; they remain in git history. If the folder is still on disk it
   is used as is; otherwise the last commit that had it is unpacked into a
   temporary folder (removed when the process exits). Returns null when
   neither is possible (no git, a shallow clone without that history), and
   the faithfulness checks are then skipped. */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function oldSource(repo, folder) {
  const live = join(repo, 'tools', folder);
  if (existsSync(join(live, 'lib', 'scene-model.ts'))) return live;
  try {
    const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    // The newest commit that added or changed the folder still contains it.
    const rev = git('log', '-1', '--format=%H', '--diff-filter=AM', '--', `tools/${folder}`).trim();
    if (!rev) return null;
    const out = mkdtempSync(join(tmpdir(), folder + '-'));
    process.on('exit', () => rmSync(out, { recursive: true, force: true }));
    execFileSync('sh', ['-c', `git archive "${rev}" "tools/${folder}" | tar -x -C "${out}"`], { cwd: repo, stdio: ['ignore', 'ignore', 'ignore'] });
    const restored = join(out, 'tools', folder);
    return existsSync(join(restored, 'lib', 'scene-model.ts')) ? restored : null;
  } catch {
    return null;
  }
}
