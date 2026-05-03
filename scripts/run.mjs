#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import {
  evidenceSteps,
  localTestDatabaseUrl,
  workspaceCommandDescriptions,
  workspaceFormatTargets,
} from './lib/workspace-commands.mjs';

const argv = process.argv.slice(2);
const command = argv[0] ?? 'help';
const args = argv.slice(1);
const cwd = process.cwd();
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function loadRuntimeTopology() {
  const path = join(cwd, 'docs', 'gov', 'runtime-topology.json');
  const content = readFileSync(path, 'utf8');
  return JSON.parse(content);
}

function printHelp() {
  console.log('SGP Workspace Dispatcher');
  console.log('');
  console.log('Usage: node scripts/run.mjs <command> [options]');
  console.log('');
  console.log('Commands:');
  for (const [name, description] of Object.entries(workspaceCommandDescriptions)) {
    console.log(`  ${name.padEnd(10)} ${description}`);
  }
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/run.mjs health --json');
  console.log('  node scripts/run.mjs db generate');
  console.log('  node scripts/run.mjs test db');
  console.log('  node scripts/run.mjs deploy --target stage --dry-run');
}

function parseOption(optionName, defaultValue) {
  const explicit = args.find((value) => value.startsWith(`--${optionName}=`));
  if (explicit) {
    return explicit.slice(optionName.length + 3);
  }

  const index = args.indexOf(`--${optionName}`);
  if (index >= 0) {
    return args[index + 1] ?? defaultValue;
  }

  return defaultValue;
}

function hasFlag(flagName) {
  return args.includes(`--${flagName}`);
}

function runCommand(commandName, commandArgs, options = {}) {
  const result = spawnSync(commandName, commandArgs, {
    stdio: options.stdio ?? 'inherit',
    cwd: options.cwd ?? cwd,
    env: options.env ?? process.env,
    encoding: options.encoding,
    shell: process.platform === 'win32',
  });

  if (typeof result.status === 'number') {
    return result.status;
  }

  if (result.error) {
    console.error(`[run] failed to execute ${commandName}: ${result.error.message}`);
  }

  return 1;
}

function localTestDatabaseEnv() {
  return {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL || localTestDatabaseUrl,
  };
}

function runNpm(argsToRun, options = {}) {
  return runCommand(npm, argsToRun, options);
}

function runNpmScript(scriptName, extraArgs = [], options = {}) {
  const commandArgs = ['run', scriptName];
  const passThroughArgs = stripPassThroughSeparator(extraArgs);
  if (passThroughArgs.length > 0) {
    commandArgs.push('--', ...passThroughArgs);
  }
  return runNpm(commandArgs, options);
}

function runSequence(steps) {
  for (const step of steps) {
    const status = step();
    if (status !== 0) {
      return status;
    }
  }
  return 0;
}

function runWorkspaceScript(workspace, scriptName, extraArgs = [], options = {}) {
  const commandArgs = ['--workspace', workspace, 'run', scriptName];
  const passThroughArgs = stripPassThroughSeparator(extraArgs);
  if (passThroughArgs.length > 0) {
    commandArgs.push('--', ...passThroughArgs);
  }
  return runNpm(commandArgs, options);
}

function stripPassThroughSeparator(values) {
  return values[0] === '--' ? values.slice(1) : values;
}

function runWorkspaceExec(workspace, execArgs, options = {}) {
  return runNpm(['--workspace', workspace, 'exec', '--', ...execArgs], options);
}

function handleBuild() {
  const subcommand = args[0] ?? 'all';
  const handlers = {
    all: () =>
      runSequence([
        () => runWorkspaceScript('frontend', 'build:admin'),
        () => runWorkspaceScript('frontend', 'build:portal'),
        () => runWorkspaceScript('backend', 'build'),
      ]),
    admin: () => runWorkspaceScript('frontend', 'build:admin', args.slice(1)),
    portal: () => runWorkspaceScript('frontend', 'build:portal', args.slice(1)),
    backend: () => runWorkspaceScript('backend', 'build', args.slice(1)),
  };

  if (!handlers[subcommand]) {
    console.error('[build] valid subcommands: all, admin, portal, backend');
    return 1;
  }

  return handlers[subcommand]();
}

function spawnNpmScript(scriptName, options = {}) {
  return spawn(npm, ['run', scriptName], {
    stdio: 'inherit',
    cwd,
    env: options.env ?? process.env,
    shell: process.platform === 'win32',
  });
}

function spawnWorkspaceScript(workspace, scriptName, extraArgs = [], options = {}) {
  const commandArgs = ['--workspace', workspace, 'run', scriptName];
  const passThroughArgs = stripPassThroughSeparator(extraArgs);
  if (passThroughArgs.length > 0) {
    commandArgs.push('--', ...passThroughArgs);
  }

  return spawn(npm, commandArgs, {
    stdio: 'inherit',
    cwd,
    env: options.env ?? process.env,
    shell: process.platform === 'win32',
  });
}

function handleStart() {
  const subcommand = args[0] ?? 'all';
  const runtimeEnv = {
    'core-api': { APP_SERVICE_NAME: 'sgp-core-api' },
    'portal-api': { APP_SERVICE_NAME: 'sgp-portal-api' },
    'payroll-engine': { APP_SERVICE_NAME: 'sgp-payroll-engine', PAYROLL_ENGINE_PORT: '3302' },
    'esocial-worker': { APP_SERVICE_NAME: 'sgp-esocial-worker' },
    'integrations-worker': { APP_SERVICE_NAME: 'sgp-integrations-worker' },
    'report-worker': { APP_SERVICE_NAME: 'sgp-report-worker' },
    'report-service': { APP_SERVICE_NAME: 'sgp-report-service', REPORT_SERVICE_PORT: '3305' },
  };
  const targetByRuntime = {
    admin: { workspace: 'frontend', script: 'start:admin' },
    portal: { workspace: 'frontend', script: 'start:portal' },
    'core-api': { workspace: 'backend', script: ['start', 'dev'].join(':') },
    'portal-api': { workspace: 'backend', script: 'start:portal:dev' },
    'payroll-engine': { workspace: 'backend', script: 'start:payroll-engine' },
    'esocial-worker': { workspace: 'backend', script: 'start:esocial-worker' },
    'integrations-worker': { workspace: 'backend', script: 'start:integrations-worker' },
    'report-worker': { workspace: 'backend', script: 'start:report-worker' },
    'report-service': { workspace: 'backend', script: 'start:report-service' },
  };

  if (subcommand !== 'all') {
    const target = targetByRuntime[subcommand];
    if (!target) {
      console.error(
        '[start] valid subcommands: all, admin, portal, core-api, portal-api, payroll-engine, esocial-worker, integrations-worker, report-worker, report-service',
      );
      return 1;
    }
    return runWorkspaceScript(target.workspace, target.script, args.slice(1), {
      env: { ...process.env, ...(runtimeEnv[subcommand] ?? {}) },
    });
  }

  const processes = ['core-api', 'portal-api', 'admin', 'portal'].map((runtime) =>
    spawnWorkspaceScript(targetByRuntime[runtime].workspace, targetByRuntime[runtime].script, [], {
      env: { ...process.env, ...(runtimeEnv[runtime] ?? {}) },
    }),
  );
  let shuttingDown = false;

  function stopAll(exitCode) {
    if (shuttingDown) return;
    shuttingDown = true;

    for (const child of processes) {
      if (!child.killed) {
        child.kill('SIGTERM');
      }
    }

    process.exit(exitCode);
  }

  process.on('SIGINT', () => stopAll(0));
  process.on('SIGTERM', () => stopAll(0));

  for (const child of processes) {
    child.on('exit', (code) => {
      if (!shuttingDown && code !== 0) {
        stopAll(code ?? 1);
      }
    });
  }
}

function handleLint() {
  const check = hasFlag('check') || args[0] === 'check';
  const frontendScript = check ? 'lint:check' : 'lint';
  const steps = [
    () => runNpm(['--workspace', 'frontend', 'run', frontendScript, '--if-present']),
    () => runWorkspaceScript('backend', check ? 'lint:check' : 'lint'),
  ];
  if (check) {
    steps.push(
      () => runCommand(process.execPath, ['scripts/check-test-debt-coverage.mjs']),
      () => runCommand(process.execPath, ['scripts/check-api-operation-decorators.mjs']),
      () => runCommand(process.execPath, ['scripts/check-openapi-generated.mjs']),
    );
  }
  return runSequence(steps);
}

function handleFormat() {
  const check = hasFlag('check') || args[0] === 'check';
  const mode = check ? '--check' : '--write';
  return runSequence([
    () => runWorkspaceScript('frontend', check ? 'format:check' : 'format'),
    () => runWorkspaceScript('backend', check ? 'format:check' : 'format'),
    () =>
      runWorkspaceExec('backend', [
        'prettier',
        mode,
        '--ignore-unknown',
        ...workspaceFormatTargets,
      ]),
  ]);
}

function handleTypecheck() {
  return runSequence([
    () => runWorkspaceScript('frontend', 'typecheck'),
    () => runWorkspaceScript('backend', 'typecheck'),
  ]);
}

function handleTest() {
  const subcommand = args[0] ?? 'unit';
  const handlers = {
    unit: () =>
      runSequence([
        () => runWorkspaceScript('frontend', 'test:admin'),
        () => runWorkspaceScript('frontend', 'test:portal'),
        () => runWorkspaceScript('backend', 'test'),
      ]),
    admin: () => runWorkspaceScript('frontend', 'test:admin', args.slice(1)),
    'admin-e2e': () => runWorkspaceScript('frontend', 'test:admin:e2e', args.slice(1)),
    portal: () => runWorkspaceScript('frontend', 'test:portal', args.slice(1)),
    'portal-e2e': () => runWorkspaceScript('frontend', 'test:portal:e2e', args.slice(1)),
    backend: () => runWorkspaceScript('backend', 'test', args.slice(1)),
    db: () =>
      runCommand(process.execPath, ['scripts/db-bootstrap-smoke.mjs'], {
        env: localTestDatabaseEnv(),
      }),
    e2e: () =>
      runWorkspaceScript('backend', 'test:e2e', args.slice(1), {
        env: localTestDatabaseEnv(),
      }),
    coverage: () =>
      runWorkspaceScript('backend', 'test:cov', args.slice(1), {
        env: localTestDatabaseEnv(),
      }),
    qa: () => runSequence([() => handleTestQaApi(), () => handleTestQaFrontend()]),
    'qa-api': handleTestQaApi,
    'qa-frontend': handleTestQaFrontend,
  };

  if (!handlers[subcommand]) {
    console.error(
      '[test] valid subcommands: unit, admin, admin-e2e, portal, portal-e2e, backend, db, e2e, coverage, qa, qa-api, qa-frontend',
    );
    return 1;
  }

  return handlers[subcommand]();
}

function handleTestQaApi() {
  return runCommand(process.execPath, [
    '--test',
    'tests/backend/api/*.test.mjs',
    'tests/backend/e2e/*.test.mjs',
  ]);
}

function handleTestQaFrontend() {
  return runCommand(process.execPath, ['--test', 'tests/frontend/e2e/*.test.mjs']);
}

function handleDb() {
  const subcommand = args[0] ?? 'help';
  const dbHandlers = {
    help: () => {
      console.log('Usage: node scripts/run.mjs db <generate|migrate|seed|smoke|studio>');
      return 0;
    },
    generate: () => runWorkspaceExec('backend', ['prisma', 'generate']),
    migrate: () => runCommand(process.execPath, ['scripts/db-apply-sql.mjs']),
    seed: () => runWorkspaceScript('backend', 'db:seed'),
    smoke: () =>
      runCommand(process.execPath, ['scripts/db-bootstrap-smoke.mjs'], {
        env: localTestDatabaseEnv(),
      }),
    studio: () => runWorkspaceExec('backend', ['prisma', 'studio']),
  };

  if (!dbHandlers[subcommand]) {
    console.error('[db] valid subcommands: help, generate, migrate, seed, smoke, studio');
    return 1;
  }

  return dbHandlers[subcommand]();
}

function handleQa() {
  const subcommand = args[0] ?? 'bootstrap';
  const handlers = {
    bootstrap: () => runCommand(process.execPath, ['scripts/qa-bootstrap.mjs', ...args.slice(1)]),
    'smoke:urls': () =>
      runCommand(process.execPath, ['scripts/qa-smoke-required-urls.mjs', ...args.slice(1)]),
  };

  if (!handlers[subcommand]) {
    console.error('[qa] valid subcommands: bootstrap, smoke:urls');
    return 1;
  }

  return handlers[subcommand]();
}

function handleEvidence() {
  const subcommand = args[0] ?? 'check';
  if (subcommand !== 'check') {
    console.error('[evidence] valid subcommands: check');
    return 1;
  }
  return runCommand(process.execPath, ['scripts/evidence-check.mjs']);
}

function handleGovernance() {
  const subcommand = args[0] ?? 'check';
  if (subcommand !== 'check') {
    console.error('[governance] valid subcommands: check');
    return 1;
  }
  return runCommand(process.execPath, ['scripts/governance-validate.mjs']);
}

function handleHealth() {
  const topology = loadRuntimeTopology();
  const requiredPaths = [
    'frontend/package.json',
    'frontend/angular.json',
    'frontend/src/main.ts',
    'frontend/portal/src/main.ts',
    'backend/package.json',
    'database/sql/00-extensions.sql',
    'docs/eng/64-alinhamento-banco-fase-1.md',
    'infra/README.md',
    'infra/aws/README.md',
    'scripts/run.mjs',
    'backend/src/main-payroll-engine.ts',
    'backend/src/main-esocial-worker.ts',
    'backend/src/main-report-worker.ts',
    'backend/src/main-report-service.ts',
    'docs/gov/runtime-topology.json',
  ];

  const checks = requiredPaths.map((relativePath) => ({
    path: relativePath,
    ok: existsSync(join(cwd, relativePath)),
  }));

  const runtimeChecks = Array.isArray(topology.runtimes)
    ? topology.runtimes.map((runtime) => ({
        name: runtime.name,
        status: runtime.status,
        ok: Array.isArray(runtime.required_paths)
          ? runtime.required_paths.every((relativePath) => existsSync(join(cwd, relativePath)))
          : false,
      }))
    : [];

  const ok = checks.every((item) => item.ok) && runtimeChecks.every((runtime) => runtime.ok);
  const status = {
    ok,
    workspace: 'sgp',
    node: process.version,
    checks,
    runtimes: runtimeChecks,
  };

  if (hasFlag('json')) {
    console.log(JSON.stringify(status, null, 2));
  } else {
    console.log(`workspace: ${status.workspace}`);
    console.log(`node: ${status.node}`);
    for (const check of checks) {
      console.log(`${check.ok ? '[ok]' : '[missing]'} ${check.path}`);
    }
    for (const runtime of runtimeChecks) {
      console.log(
        `${runtime.ok ? '[ok]' : '[missing]'} runtime ${runtime.name} (${runtime.status})`,
      );
    }
    console.log(`result: ${ok ? 'healthy' : 'unhealthy'}`);
  }

  return ok ? 0 : 1;
}

function handleDeploy() {
  const target = parseOption('target', 'stage');
  const stack = parseOption('stack', 'all');
  const apply = hasFlag('apply');
  const dryRun = hasFlag('dry-run') || !apply;

  const stackTemplateByName = {
    all: 'infra/aws/templates/stack-all.yaml',
    cognito: 'infra/aws/templates/stack-cognito.yaml',
    rds: 'infra/aws/templates/stack-rds.yaml',
    backend: 'infra/aws/templates/stack-backend.yaml',
    frontend: 'infra/aws/templates/stack-frontend.yaml',
  };

  if (!(stack in stackTemplateByName)) {
    console.error(`[deploy] invalid stack: ${stack}`);
    console.error('Valid stacks: all, cognito, rds, backend, frontend');
    return 1;
  }

  const templatePath = stackTemplateByName[stack];
  console.log(`[deploy] target=${target} stack=${stack} template=${templatePath}`);

  if (dryRun) {
    console.log('[deploy] dry-run mode active; no infrastructure changes applied.');
    console.log('[deploy] to apply, run with --apply after filling template placeholders.');
    return 0;
  }

  console.error(
    '[deploy] apply mode is blocked in this repo baseline until templates are parameterized.',
  );
  console.error('[deploy] use --dry-run for planning only.');
  return 1;
}

function runEvidenceStepByName(stepName) {
  const step = evidenceSteps.find((candidate) => candidate.name === stepName);
  if (!step) {
    console.error(`[evidence] unknown step: ${stepName}`);
    return 1;
  }
  const commandName =
    step.command === 'npm' ? npm : step.command === 'node' ? process.execPath : step.command;
  return runCommand(commandName, step.args);
}

const handlers = {
  help: () => {
    printHelp();
    return 0;
  },
  build: handleBuild,
  start: handleStart,
  lint: handleLint,
  format: handleFormat,
  typecheck: handleTypecheck,
  test: handleTest,
  db: handleDb,
  qa: handleQa,
  evidence: handleEvidence,
  governance: handleGovernance,
  health: handleHealth,
  deploy: handleDeploy,
  'evidence-step': () => runEvidenceStepByName(args[0]),
};

if (!handlers[command]) {
  console.error(`[run] unknown command: ${command}`);
  console.error('Run "node scripts/run.mjs help" for available commands.');
  process.exit(1);
}

const exitCode = handlers[command]();
if (typeof exitCode === 'number') {
  process.exit(exitCode);
}
