#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveCommand, runCommandResult } from '../command-runner.mjs';
import { defaultRepoRoot, localTestDatabaseEnv } from '../repo-paths.mjs';
import { evidenceSteps } from '../workspace-commands.mjs';

const cwd = defaultRepoRoot;
const evidenceEnv = localTestDatabaseEnv();

function hasRequiredEnvironment(step) {
  const missing = (step.requiredEnv ?? []).filter((name) => !evidenceEnv[name]);
  return {
    ok: missing.length === 0,
    missing,
  };
}

function runStep(step) {
  const required = hasRequiredEnvironment(step);
  if (!required.ok) {
    console.error(`[evidence] BLOCKED ${step.name}: missing ${required.missing.join(', ')}`);
    return {
      name: step.name,
      status: 'blocked',
      reason: `missing ${required.missing.join(', ')}`,
    };
  }

  console.log(`[evidence] RUN ${step.name}`);
  const result = runCommandResult(resolveCommand(step.command), step.args, {
    cwd,
    env: evidenceEnv,
    encoding: 'utf8',
    stdio: step.capturesOutput ? 'pipe' : 'inherit',
    shell: false,
  });

  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (step.capturesOutput && output) {
    process.stdout.write(output);
  }

  if (result.error) {
    console.error(`[evidence] ERROR ${step.name}: ${result.error.message}`);
    return { name: step.name, status: 'failed', reason: result.error.message };
  }

  if (step.blockedPattern?.test(output)) {
    console.error(`[evidence] BLOCKED ${step.name}: smoke tests reported blocked evidence`);
    return {
      name: step.name,
      status: 'blocked',
      reason: 'smoke tests reported blocked evidence',
    };
  }

  if (result.status !== 0) {
    console.error(`[evidence] FAIL ${step.name}: exit ${result.status}`);
    return { name: step.name, status: 'failed', reason: `exit ${result.status}` };
  }

  console.log(`[evidence] OK ${step.name}`);
  return { name: step.name, status: 'ok' };
}

if (!existsSync(resolve(cwd, 'package.json'))) {
  console.error('[evidence] Run this script from the workspace root.');
  process.exit(1);
}

const results = evidenceSteps.map(runStep);
const failures = results.filter((result) => result.status !== 'ok');

console.log('[evidence] summary');
for (const result of results) {
  const suffix = result.reason ? `: ${result.reason}` : '';
  console.log(`[evidence] ${result.status.toUpperCase()} ${result.name}${suffix}`);
}

if (failures.length > 0) {
  process.exitCode = 1;
}
