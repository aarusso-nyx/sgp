#!/usr/bin/env node

import { parseArgs } from './lib/cli.mjs';
import { runCommand } from './lib/command-runner.mjs';
import { defaultRepoRoot } from './lib/repo-paths.mjs';

const usage = `
Usage: node scripts/check-db.mjs <alignment check|fk-coverage check|fk-coverage write|push-guard> [options]

Run database alignment, FK coverage, and retired Prisma force-reset checks.
`;

const options = parseArgs(process.argv.slice(2), { booleanFlags: ['help'] });
const family = options._[0] ?? 'help';
const action = options._[1];
const passThrough = process.argv.slice(2 + options._.slice(0, 2).length);

if (options.help || family === 'help') {
  console.log(usage.trim());
  process.exit(0);
}

process.exitCode = runDbCheck(family, action, passThrough);

function runDbCheck(name, subcommand, args) {
  if (name === 'alignment') {
    const mode = subcommand ?? 'check';
    if (mode !== 'check') {
      console.error('[db alignment] valid subcommands: check');
      return 1;
    }
    return runHelper('scripts/lib/checks/db/alignment.mjs', args);
  }

  if (name === 'fk-coverage') {
    const mode = subcommand ?? 'check';
    if (mode === 'check') {
      return runHelper('scripts/lib/checks/db/fk-coverage.mjs', args);
    }
    if (mode === 'write') {
      return runHelper('scripts/lib/checks/db/fk-coverage.mjs', ['--write', ...args]);
    }
    console.error('[db fk-coverage] valid subcommands: check, write');
    return 1;
  }

  if (name === 'push-guard') {
    return runHelper('scripts/lib/checks/db/prisma-push-guard.mjs', args);
  }

  console.error('[db] valid subcommands: alignment, fk-coverage, push-guard');
  return 1;
}

function runHelper(script, args) {
  return runCommand(process.execPath, [script, ...args], { cwd: defaultRepoRoot });
}
