#!/usr/bin/env node

import { parseArgs } from './lib/cli.mjs';
import { runCommand } from './lib/command-runner.mjs';
import { defaultRepoRoot, localTestDatabaseEnv } from './lib/repo-paths.mjs';

const usage = `
Usage: node scripts/db.mjs <apply-sql|bootstrap-smoke> [options]

Run database lifecycle implementation helpers.
`;

const options = parseArgs(process.argv.slice(2), { booleanFlags: ['help'] });
const subcommand = options._[0] ?? 'help';
const passThrough = process.argv.slice(3);

if (options.help || subcommand === 'help') {
  console.log(usage.trim());
  process.exit(0);
}

const handlers = {
  'apply-sql': () => runHelper('scripts/lib/db/apply-sql.mjs', passThrough),
  'bootstrap-smoke': () =>
    runCommand(process.execPath, ['scripts/lib/db/bootstrap-smoke.mjs', ...passThrough], {
      cwd: defaultRepoRoot,
      env: localTestDatabaseEnv(),
    }),
};

if (!handlers[subcommand]) {
  console.error('[db] valid implementation helpers: apply-sql, bootstrap-smoke');
  process.exit(1);
}

process.exitCode = handlers[subcommand]();

function runHelper(script, args) {
  return runCommand(process.execPath, [script, ...args], { cwd: defaultRepoRoot });
}
