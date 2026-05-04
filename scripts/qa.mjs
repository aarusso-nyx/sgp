#!/usr/bin/env node

import { parseArgs } from './lib/cli.mjs';
import { runCommand } from './lib/command-runner.mjs';
import { defaultRepoRoot } from './lib/repo-paths.mjs';

const usage = `
Usage: node scripts/qa.mjs <bootstrap|smoke-urls> [options]

Run QA helper commands.
`;

const options = parseArgs(process.argv.slice(2), { booleanFlags: ['help'] });
const subcommand = options._[0] ?? 'bootstrap';
const passThrough = process.argv.slice(3);

if (options.help || subcommand === 'help') {
  console.log(usage.trim());
  process.exit(0);
}

const handlers = {
  bootstrap: () => runHelper('scripts/lib/qa/bootstrap.mjs', passThrough),
  'smoke-urls': () => runHelper('scripts/lib/qa/smoke-required-urls.mjs', passThrough),
};

if (!handlers[subcommand]) {
  console.error('[qa] valid subcommands: bootstrap, smoke-urls');
  process.exit(1);
}

process.exitCode = handlers[subcommand]();

function runHelper(script, args) {
  return runCommand(process.execPath, [script, ...args], { cwd: defaultRepoRoot });
}
