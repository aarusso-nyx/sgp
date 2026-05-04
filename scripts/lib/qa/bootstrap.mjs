#!/usr/bin/env node

import { setTimeout as sleep } from 'node:timers/promises';

import {
  hasFlag as argvHasFlag,
  optionValue,
  parsePositiveInt as parseIntOption,
} from '../cli.mjs';
import { runNpmScript as runNpmScriptCommand, spawnNpmScript } from '../command-runner.mjs';

const cwd = process.cwd();
const args = process.argv.slice(2);

const defaults = {
  apiBaseUrl: 'http://127.0.0.1:3000',
  adminBaseUrl: 'http://127.0.0.1:4200',
  portalBaseUrl: 'http://127.0.0.1:4300',
  timeoutMs: 120_000,
};

function hasFlag(name) {
  return argvHasFlag(args, name);
}

function option(name) {
  return optionValue(args, name);
}

function parsePositiveInt(name, fallback) {
  try {
    return parseIntOption(args, name, fallback);
  } catch {
    console.error(`[qa-bootstrap] --${name} must be a positive integer`);
    process.exit(1);
  }
}

function ensureUrl(name, value) {
  try {
    return new URL(value).toString().replace(/\/$/, '');
  } catch {
    console.error(`[qa-bootstrap] ${name} must be a valid URL`);
    process.exit(1);
  }
}

function redactDatabaseUrl(value) {
  try {
    const url = new URL(value);
    if (url.password) {
      url.password = '***';
    }
    return url.toString();
  } catch {
    return '<configured>';
  }
}

function runNpmScript(script, extraArgs = [], env) {
  return runNpmScriptCommand(script, extraArgs, { cwd, env, shell: false });
}

async function waitForHttp(target) {
  const startedAt = Date.now();
  let lastError = 'not checked yet';

  while (Date.now() - startedAt < target.timeoutMs) {
    try {
      const response = await fetch(target.url, {
        headers: target.headers,
        redirect: 'manual',
        signal: AbortSignal.timeout(5_000),
      });

      if (target.ok(response)) {
        console.log(`[qa-bootstrap] OK ${target.name}: ${target.url}`);
        return;
      }

      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await sleep(1_000);
  }

  throw new Error(`${target.name} did not become ready at ${target.url}: ${lastError}`);
}

async function waitForTargets(env, timeoutMs) {
  const apiBaseUrl = env.QA_API_BASE_URL;
  const adminBaseUrl = env.QA_ADMIN_FRONTEND_BASE_URL;
  const portalBaseUrl = env.QA_PORTAL_FRONTEND_BASE_URL;

  console.log('[qa-bootstrap] waiting for QA smoke targets');
  await Promise.all([
    waitForHttp({
      name: 'core API',
      url: `${apiBaseUrl}/api/v1/health/ready`,
      timeoutMs,
      ok: (response) => response.status === 200,
    }),
    waitForHttp({
      name: 'sgp-admin',
      url: adminBaseUrl,
      timeoutMs,
      headers: { accept: 'text/html' },
      ok: (response) => response.status === 200,
    }),
    waitForHttp({
      name: 'sgp-portal',
      url: portalBaseUrl,
      timeoutMs,
      headers: { accept: 'text/html' },
      ok: (response) => response.status === 200,
    }),
  ]);
}

function printHelp() {
  console.log('Usage: npm run qa:bootstrap -- [options]');
  console.log('');
  console.log('Starts the local API, admin shell, and portal shell with QA smoke env,');
  console.log('waits for the live base URLs, then runs QA smoke tests.');
  console.log('');
  console.log('Options:');
  console.log('  --database-url <url>   DATABASE_URL for the live backend');
  console.log('  --prepare-db           Run db:migrate and db:seed before starting services');
  console.log('  --evidence             Run evidence:check instead of test:qa');
  console.log('  --keep-alive           Start services and wait, but do not run tests');
  console.log('  --timeout-ms <ms>      Readiness timeout per target, default 120000');
  console.log('  --help                 Show this help');
}

if (hasFlag('help')) {
  printHelp();
  process.exit(0);
}

const databaseUrl = option('database-url') ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error(
    '[qa-bootstrap] DATABASE_URL is required. Set DATABASE_URL or pass --database-url.',
  );
  process.exit(1);
}

const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  AUTH_ALLOW_UNSIGNED_TEST_TOKENS: process.env.AUTH_ALLOW_UNSIGNED_TEST_TOKENS ?? 'true',
  QA_API_BASE_URL: ensureUrl(
    'QA_API_BASE_URL',
    process.env.QA_API_BASE_URL ?? process.env.API_BASE_URL ?? defaults.apiBaseUrl,
  ),
  QA_ADMIN_FRONTEND_BASE_URL: ensureUrl(
    'QA_ADMIN_FRONTEND_BASE_URL',
    process.env.QA_ADMIN_FRONTEND_BASE_URL ??
      process.env.QA_FRONTEND_BASE_URL ??
      process.env.FRONTEND_BASE_URL ??
      defaults.adminBaseUrl,
  ),
  QA_PORTAL_FRONTEND_BASE_URL: ensureUrl(
    'QA_PORTAL_FRONTEND_BASE_URL',
    process.env.QA_PORTAL_FRONTEND_BASE_URL ??
      process.env.PORTAL_FRONTEND_BASE_URL ??
      defaults.portalBaseUrl,
  ),
};
const timeoutMs = parsePositiveInt('timeout-ms', defaults.timeoutMs);
const keepAlive = hasFlag('keep-alive');
const evidence = hasFlag('evidence');

console.log('[qa-bootstrap] configuration');
console.log(`[qa-bootstrap] DATABASE_URL=${redactDatabaseUrl(env.DATABASE_URL)}`);
console.log(`[qa-bootstrap] QA_API_BASE_URL=${env.QA_API_BASE_URL}`);
console.log(`[qa-bootstrap] QA_ADMIN_FRONTEND_BASE_URL=${env.QA_ADMIN_FRONTEND_BASE_URL}`);
console.log(`[qa-bootstrap] QA_PORTAL_FRONTEND_BASE_URL=${env.QA_PORTAL_FRONTEND_BASE_URL}`);
console.log(
  `[qa-bootstrap] AUTH_ALLOW_UNSIGNED_TEST_TOKENS=${env.AUTH_ALLOW_UNSIGNED_TEST_TOKENS}`,
);

if (hasFlag('prepare-db')) {
  console.log('[qa-bootstrap] preparing database');
  let status = runNpmScript('db:migrate', [], env);
  if (status !== 0) {
    process.exit(status);
  }

  status = runNpmScript('db:seed', [], env);
  if (status !== 0) {
    process.exit(status);
  }
}

const serviceProcess = spawnNpmScript('start', [], { cwd, env, shell: false });

let shuttingDown = false;
function stopServices(exitCode) {
  if (shuttingDown) return;
  shuttingDown = true;

  if (!serviceProcess.killed) {
    serviceProcess.kill('SIGTERM');
  }

  process.exitCode = exitCode;
}

process.on('SIGINT', () => stopServices(130));
process.on('SIGTERM', () => stopServices(143));

serviceProcess.on('exit', (code, signal) => {
  if (shuttingDown) return;

  const suffix = signal ? `signal ${signal}` : `exit ${code}`;
  console.error(`[qa-bootstrap] services stopped before QA completed: ${suffix}`);
  process.exit(code ?? 1);
});

try {
  await waitForTargets(env, timeoutMs);

  const urlCheckStatus = runNpmScript('qa:smoke:urls', ['--check'], env);
  if (urlCheckStatus !== 0) {
    stopServices(urlCheckStatus);
  } else if (keepAlive) {
    console.log('[qa-bootstrap] services are ready; press Ctrl-C to stop.');
    await new Promise(() => undefined);
  } else {
    const status = runNpmScript(evidence ? 'evidence:check' : 'test:qa', [], env);
    stopServices(status);
  }
} catch (error) {
  console.error(`[qa-bootstrap] ${error instanceof Error ? error.message : String(error)}`);
  stopServices(1);
}
