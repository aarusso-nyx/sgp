#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const cwd = process.cwd();
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const node = process.execPath;

const steps = [
  {
    name: 'api-alignment-sync',
    command: npm,
    args: ['run', 'api:alignment:sync'],
  },
  {
    name: 'api-alignment-check',
    command: npm,
    args: ['run', 'api:alignment:check', '--', '--json'],
  },
  {
    name: 'db-alignment-check',
    command: npm,
    args: ['run', 'db:alignment:check', '--', '--json'],
  },
  {
    name: 'runtime-health',
    command: npm,
    args: ['run', 'health:json'],
  },
  {
    name: 'lint',
    command: npm,
    args: ['run', 'lint'],
  },
  {
    name: 'openapi-client-generate',
    command: npm,
    args: ['run', 'api:client:generate'],
  },
  {
    name: 'build-all',
    command: npm,
    args: ['run', 'build'],
  },
  {
    name: 'frontend-admin-tests',
    command: npm,
    args: ['run', 'test:frontend'],
  },
  {
    name: 'frontend-portal-tests',
    command: npm,
    args: ['run', 'test:portal'],
  },
  {
    name: 'backend-unit-tests',
    command: npm,
    args: ['run', 'test:backend'],
  },
  {
    name: 'backend-e2e',
    command: npm,
    args: ['run', 'test:e2e'],
    requiredEnv: ['DATABASE_URL'],
  },
  {
    name: 'db-smoke',
    command: npm,
    args: ['run', 'db:smoke'],
    requiredEnv: ['DATABASE_URL'],
  },
  {
    name: 'backend-coverage',
    command: npm,
    args: ['--workspace', 'backend', 'run', 'test:cov'],
    requiredEnv: ['DATABASE_URL'],
  },
  {
    name: 'qa-smoke-url-config',
    command: node,
    args: ['scripts/qa-smoke-required-urls.mjs', '--check'],
    capturesOutput: true,
  },
  {
    name: 'qa-smoke-live',
    command: npm,
    args: ['run', 'test:qa'],
    capturesOutput: true,
    blockedPattern: /\[qa-smoke]\s+BLOCKED/,
  },
];

function hasRequiredEnvironment(step) {
  const missing = (step.requiredEnv ?? []).filter((name) => !process.env[name]);
  return {
    ok: missing.length === 0,
    missing,
  };
}

function runStep(step) {
  const required = hasRequiredEnvironment(step);
  if (!required.ok) {
    console.error(
      `[evidence] BLOCKED ${step.name}: missing ${required.missing.join(', ')}`,
    );
    return {
      name: step.name,
      status: 'blocked',
      reason: `missing ${required.missing.join(', ')}`,
    };
  }

  console.log(`[evidence] RUN ${step.name}`);
  const result = spawnSync(step.command, step.args, {
    cwd,
    env: process.env,
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
    console.error(
      `[evidence] BLOCKED ${step.name}: smoke tests reported blocked evidence`,
    );
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
  console.error('[evidence] Run this script from the source workspace root.');
  process.exit(1);
}

const results = steps.map(runStep);
const failures = results.filter((result) => result.status !== 'ok');

console.log('[evidence] summary');
for (const result of results) {
  const suffix = result.reason ? `: ${result.reason}` : '';
  console.log(`[evidence] ${result.status.toUpperCase()} ${result.name}${suffix}`);
}

if (failures.length > 0) {
  process.exitCode = 1;
}
