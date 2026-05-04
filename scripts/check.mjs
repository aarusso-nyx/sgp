#!/usr/bin/env node

import { parseArgs } from './lib/cli.mjs';
import { runCommand } from './lib/command-runner.mjs';
import { defaultRepoRoot } from './lib/repo-paths.mjs';

const usage = `
Usage: node scripts/check.mjs <evidence> [options]

Run cross-cutting check helpers that do not belong to a narrower API, DB, or frontend family.
`;

const options = parseArgs(process.argv.slice(2), { booleanFlags: ['help'] });
const subcommand = options._[0] ?? 'help';
const passThrough = process.argv.slice(3);

if (options.help || subcommand === 'help') {
  console.log(usage.trim());
  process.exit(0);
}

const handlers = {
  evidence: () => runHelper('scripts/lib/checks/evidence.mjs', passThrough),
};

if (!handlers[subcommand]) {
  console.error('[check] valid subcommands: evidence');
  process.exit(1);
}

process.exitCode = handlers[subcommand]();

function runHelper(script, args) {
  return runCommand(process.execPath, [script, ...args], { cwd: defaultRepoRoot });
}
