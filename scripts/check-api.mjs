#!/usr/bin/env node

import { parseArgs } from './lib/cli.mjs';
import { runCommand } from './lib/command-runner.mjs';
import { defaultRepoRoot } from './lib/repo-paths.mjs';

const usage = `
Usage: node scripts/check-api.mjs <alignment sync|alignment check|operation check|spec check> [options]

Run API alignment, decorator, and generated OpenAPI checks.
`;

const options = parseArgs(process.argv.slice(2), { booleanFlags: ['help'] });
const family = options._[0] ?? 'help';
const action = options._[1];
const passThrough = process.argv.slice(2 + options._.slice(0, 2).length);

if (options.help || family === 'help') {
  console.log(usage.trim());
  process.exit(0);
}

const status = runApiCheck(family, action, passThrough);
process.exitCode = status;

function runApiCheck(name, subcommand, args) {
  if (name === 'alignment') {
    const mode = subcommand ?? 'check';
    if (mode === 'sync') {
      return runHelper('scripts/lib/checks/api/sync-route-alignment.mjs', args);
    }
    if (mode === 'check') {
      return runHelper('scripts/lib/checks/api/route-alignment.mjs', args);
    }
    console.error('[api alignment] valid subcommands: sync, check');
    return 1;
  }

  if (name === 'operation') {
    const mode = subcommand ?? 'check';
    if (mode !== 'check') {
      console.error('[api operation] valid subcommands: check');
      return 1;
    }
    return runHelper('scripts/lib/checks/api/operation-decorators.mjs', args);
  }

  if (name === 'spec') {
    const mode = subcommand ?? 'check';
    if (mode !== 'check') {
      console.error('[api spec] valid subcommands: check');
      return 1;
    }
    return runHelper('scripts/lib/checks/api/openapi-generated.mjs', args);
  }

  console.error('[api] valid subcommands: alignment, operation, spec');
  return 1;
}

function runHelper(script, args) {
  return runCommand(process.execPath, [script, ...args], { cwd: defaultRepoRoot });
}
