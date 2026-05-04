#!/usr/bin/env node

import { parseArgs } from './lib/cli.mjs';
import { runCommand } from './lib/command-runner.mjs';
import { defaultRepoRoot } from './lib/repo-paths.mjs';

const usage = `
Usage: node scripts/generate.mjs <openapi-client|permissions> [options]

Run generated artifact builders.
`;

const options = parseArgs(process.argv.slice(2), { booleanFlags: ['help'] });
const subcommand = options._[0] ?? 'help';
const passThrough = process.argv.slice(3);

if (options.help || subcommand === 'help') {
  console.log(usage.trim());
  process.exit(0);
}

const handlers = {
  'openapi-client': () => runHelper('scripts/lib/generate/openapi-client.mjs', passThrough),
  permissions: () => runHelper('scripts/lib/generate/permissions.mjs', passThrough),
};

if (!handlers[subcommand]) {
  console.error('[generate] valid subcommands: openapi-client, permissions');
  process.exit(1);
}

process.exitCode = handlers[subcommand]();

function runHelper(script, args) {
  return runCommand(process.execPath, [script, ...args], { cwd: defaultRepoRoot });
}
