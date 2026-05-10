#!/usr/bin/env node

import { parseArgs } from './lib/cli.mjs';
import { runCommand, runSequence } from './lib/command-runner.mjs';
import { defaultRepoRoot } from './lib/repo-paths.mjs';

const usage = `
Usage: node scripts/audit.mjs <schema|api|fr|tests|hotspots|backlog|pvd|live-data|idempotency|decimal|fe-i18n|rls-spec-coverage|openapi-coverage|all> [options]

Run deterministic audit helpers through one stable entrypoint.
`;

const scriptBySubcommand = {
  schema: 'scripts/lib/audit/schema-digest.mjs',
  api: 'scripts/lib/audit/api-surface.mjs',
  fr: 'scripts/lib/audit/fr-ledger.mjs',
  tests: 'scripts/lib/audit/test-coverage-map.mjs',
  hotspots: 'scripts/lib/audit/hotspots.mjs',
  backlog: 'scripts/lib/audit/backlog-ledger.mjs',
  pvd: 'scripts/lib/audit/promise-vs-delivery.mjs',
  'live-data': 'scripts/lib/audit/live-data-inventory.mjs',
  idempotency: 'scripts/lib/audit/idempotency-coverage.mjs',
  decimal: 'scripts/lib/audit/decimal-coverage.mjs',
  'fe-i18n': 'scripts/lib/audit/fe-i18n-coverage.mjs',
  'rls-spec-coverage': 'scripts/lib/audit/rls-spec-coverage.mjs',
  'openapi-coverage': 'scripts/audit/openapi-spec-coverage.mjs',
};

const options = parseArgs(process.argv.slice(2), { booleanFlags: ['help'] });
const subcommand = options._[0] ?? 'help';
const passThrough = process.argv.slice(3);

if (subcommand === 'help' || (options.help && (options._.length === 0 || subcommand === 'all'))) {
  console.log(usage.trim());
  process.exit(0);
}

if (subcommand === 'all') {
  const hasBaseline = passThrough.some(
    (value, index) =>
      value === '--prev-round' ||
      value.startsWith('--baseline=') ||
      (value === '--baseline' && passThrough[index + 1]),
  );

  process.exitCode = runSequence([
    () => runAuditScript('schema', passThrough),
    () => runAuditScript('api', passThrough),
    () => runAuditScript('fr', passThrough),
    () => runAuditScript('tests', passThrough),
    () => runAuditScript('hotspots', hasBaseline ? passThrough : [...passThrough, '--prev-round']),
    () => runAuditScript('pvd', passThrough),
  ]);
} else {
  process.exitCode = runAuditScript(subcommand, passThrough);
}

function runAuditScript(name, args) {
  const script = scriptBySubcommand[name];
  if (!script) {
    console.error(
      '[audit] valid subcommands: schema, api, fr, tests, hotspots, backlog, pvd, live-data, idempotency, decimal, fe-i18n, rls-spec-coverage, openapi-coverage, all',
    );
    return 1;
  }

  return runCommand(process.execPath, [script, ...args], { cwd: defaultRepoRoot });
}
