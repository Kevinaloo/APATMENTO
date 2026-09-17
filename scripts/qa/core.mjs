import { requiredJourneys, requiredChecks } from './catalog.mjs';

export function targetURL(value) {
  const url = new URL(value);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((!local && url.protocol !== 'https:') || !['https:', 'http:'].includes(url.protocol)
      || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('QA_BASE_URL must be an HTTPS origin (HTTP is allowed only on loopback).');
  }
  return url.origin;
}

export function assertStaging(config, env = process.env) {
  const origin = targetURL(env.QA_BASE_URL);
  if (env.QA_MODE !== 'staging' || env.QA_ALLOW_MUTATIONS !== 'true') {
    throw new Error('Staging journeys require QA_MODE=staging and QA_ALLOW_MUTATIONS=true.');
  }
  if (!config.stagingOrigins?.includes(origin) || /(^|\.)cabana\.(africa|travel)$/.test(new URL(origin).hostname)
      || /(^|\.)apatmento\.space$/.test(new URL(origin).hostname)) {
    throw new Error('Mutating QA target must be an explicitly listed, isolated staging origin.');
  }
  if (!config.sandboxPayments || !config.syntheticAccountsOnly) {
    throw new Error('Staging configuration must attest sandbox payments and synthetic accounts.');
  }
  return origin;
}

export function redact(text, env = process.env) {
  let result = String(text ?? '');
  for (const [key, value] of Object.entries(env)) {
    if (/(TOKEN|SECRET|PASSWORD|KEY|CREDENTIAL)/.test(key) && value?.length > 5) result = result.split(value).join('[REDACTED]');
  }
  return result.replace(/\x1b\[[0-9;]*m/g, '').replace(/Bearer\s+[^\s"<>]+/gi, 'Bearer [REDACTED]')
    .replace(/([?&](?:token|key|code|access_token|refresh_token)=)[^&\s]+/gi, '$1[REDACTED]');
}

export function compareMigrations(local, remote) {
  const expected = new Set(local), actual = new Set(remote);
  return { missing: [...expected].filter(v => !actual.has(v)), unexpected: [...actual].filter(v => !expected.has(v)),
    duplicateLocal: local.length !== expected.size, duplicateRemote: remote.length !== actual.size };
}

export function summarize(results, meta = {}) {
  const rows = [...results];
  const seen = new Set();
  for (const row of results) {
    if (seen.has(row.id)) rows.push({ id: `duplicate:${row.id}`, kind: 'check', status: 'failed', detail: 'Duplicate evidence id' });
    seen.add(row.id);
    if (!['passed', 'failed', 'blocked', 'warning', 'not-applicable'].includes(row.status)) {
      rows.push({ id: `invalid:${row.id}`, kind: 'check', status: 'failed', detail: 'Invalid evidence status' });
    }
    if (row.status === 'not-applicable' && (row.kind !== 'journey' || !row.detail?.trim())) {
      rows.push({ id: `unjustified:${row.id}`, kind: 'check', status: 'blocked', detail: 'Applicability exclusions require a reason' });
    }
  }
  for (const expected of requiredJourneys) {
    if (!results.some(r => r.id === expected.id && r.kind === 'journey')) rows.push({ ...expected, kind: 'journey', status: 'blocked', detail: 'No executed staging journey or reviewed applicability decision' });
  }
  for (const id of requiredChecks) {
    if (!results.some(r => r.id === id && r.kind === 'check')) rows.push({ id, kind: 'check', status: 'blocked', detail: 'Check did not produce evidence' });
  }
  const critical = rows.filter(r => r.status === 'failed').length;
  const blocked = rows.filter(r => r.status === 'blocked').length;
  const warnings = rows.filter(r => r.status === 'warning').length;
  return { ...meta, status: critical ? 'UNHEALTHY' : blocked ? 'UNVERIFIED' : warnings ? 'DEGRADED' : 'HEALTHY',
    journeysPassed: rows.filter(r => r.kind === 'journey' && r.status === 'passed').length,
    contractTestsPassed: rows.filter(r => r.kind === 'contract' && r.status === 'passed').length,
    warnings, critical, blocked,
    brokenRoutes: rows.some(r => r.id === 'routes' && r.status === 'passed')
      ? rows.filter(r => r.kind === 'route' && r.status === 'failed').length : null,
    results: rows };
}

const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function markdown(report) {
  const check = id => report.results.find(r => r.id === id)?.status || 'blocked';
  return `# CABANA RELEASE HEALTH\n\n${report.environment || 'Target'}: **${report.status}**\n\n`
    + `${report.journeysPassed} journeys passed\n\n${report.contractTestsPassed} regression assertions passed\n\n`
    + `${report.warnings} warnings\n\n${report.critical} critical regressions\n\n${report.blocked} checks / journeys unverified\n\n`
    + `Supabase migrations: ${check('migrations') === 'passed' ? 'synchronized (version history)' : check('migrations')}\n\n`
    + `RLS tests: ${check('rls')}\n\nVercel deployment: ${check('deployment')}\n\n`
    + `Broken routes: ${report.brokenRoutes ?? 'unverified'}\n\n`
    + `Commit: ${report.sha || 'local'} · Run: ${report.runId}\n\n`
    + `Target: ${report.target || 'not configured'}\n\n`
    + `| Check / journey | Result | Detail |\n|---|---|---|\n`
    + report.results.filter(r => r.kind !== 'contract' || r.status !== 'passed').map(r =>
      `| ${r.id} | ${r.status} | ${String(r.detail || '').replace(/[\r\n|]/g, ' ').slice(0, 600)} |`).join('\n') + '\n';
}

export function html(report) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Cabana Release Health</title>
<style>body{font:16px system-ui;margin:40px auto;padding:0 20px;max-width:1200px;background:#111525;color:#e9eaf2}h1{font-size:26px}strong{color:#bfb1ff}table{width:100%;border-collapse:collapse;font-size:13px}td,th{padding:12px;text-align:left;border-bottom:1px solid #35394c;overflow-wrap:anywhere}input{padding:12px;width:90%;margin:20px 0}.failed{color:#ff9b9b}.blocked,.warning{color:#ffda95}.passed{color:#9fdfb3}</style>
<h1>CABANA RELEASE HEALTH</h1><p>${escape(report.environment)}: <strong>${escape(report.status)}</strong></p>
<p>${report.journeysPassed} journeys passed · ${report.warnings} warnings · ${report.critical} critical regressions · ${report.blocked} unverified</p>
<p>${report.contractTestsPassed} regression assertions passed · Broken routes: ${report.brokenRoutes ?? 'unverified'}</p>
<p>${escape(report.target)} · ${escape(report.sha || 'local')} · ${escape(report.runId)}</p>
<label>Filter evidence <input id="filter" placeholder="Service, journey, or status"></label><table><thead><tr><th>Check / journey</th><th>Result</th><th>Evidence</th></tr></thead><tbody>${report.results.map(r => `<tr><td>${escape(r.id)}</td><td class="${escape(r.status)}">${escape(r.status)}</td><td>${escape(r.detail || '')}</td></tr>`).join('')}</tbody></table>
<script>document.getElementById('filter').oninput=e=>document.querySelectorAll('tbody tr').forEach(r=>r.hidden=!r.textContent.toLowerCase().includes(e.target.value.toLowerCase()))</script></html>`;
}
