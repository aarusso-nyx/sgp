#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hasFlag as argvHasFlag, optionValue } from './lib/cli.mjs';
import {
  runCommand,
  runNpm,
  runSequence,
  runWorkspaceExec,
  runWorkspaceScript,
  spawnWorkspaceScript,
} from './lib/command-runner.mjs';
import { localTestDatabaseEnv } from './lib/repo-paths.mjs';
import {
  evidenceSteps,
  workspaceCommandDescriptions,
  workspaceFormatTargets,
} from './lib/workspace-commands.mjs';

const argv = process.argv.slice(2);
const command = argv[0] ?? 'help';
const args = argv.slice(1);
const cwd = process.cwd();

function loadRuntimeTopology() {
  const path = join(cwd, 'docs', 'gov', 'generated', 'runtime-topology.json');
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
  console.log('  node scripts/run.mjs test db');
  console.log('  node scripts/run.mjs deploy --target stage --dry-run');
}

function parseOption(optionName, defaultValue) {
  return optionValue(args, optionName, defaultValue);
}

function hasFlag(flagName) {
  return argvHasFlag(args, flagName);
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

function handleStart() {
  const subcommand = args[0] ?? 'all';
  const runtimeEnv = {
    'core-api': { APP_SERVICE_NAME: 'sgp-core-api' },
    'portal-api': { APP_SERVICE_NAME: 'sgp-portal-api' },
    'payroll-engine': { APP_SERVICE_NAME: 'sgp-payroll-engine', PAYROLL_ENGINE_PORT: '3302' },
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
    'integrations-worker': { workspace: 'backend', script: 'start:integrations-worker' },
    'report-worker': { workspace: 'backend', script: 'start:report-worker' },
    'report-service': { workspace: 'backend', script: 'start:report-service' },
  };

  if (subcommand !== 'all') {
    const target = targetByRuntime[subcommand];
    if (!target) {
      console.error(
        '[start] valid subcommands: all, admin, portal, core-api, portal-api, payroll-engine, integrations-worker, report-worker, report-service',
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
      () => runCommand(process.execPath, ['scripts/lib/checks/test-debt-coverage.mjs']),
      () => runCommand(process.execPath, ['scripts/check-api.mjs', 'operation', 'check']),
      () => runCommand(process.execPath, ['scripts/check-api.mjs', 'spec', 'check']),
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
  const e2eArgs = args.slice(1);
  const serialE2eArgs =
    e2eArgs.includes('--runInBand') || e2eArgs.some((arg) => arg.startsWith('--maxWorkers'))
      ? e2eArgs
      : ['--runInBand', ...e2eArgs];
  const handlers = {
    unit: () =>
      runSequence([
        () => runWorkspaceScript('frontend', 'test:admin'),
        () => runWorkspaceScript('frontend', 'test:portal'),
        () =>
          runWorkspaceScript('backend', 'test', [], {
            env: localTestDatabaseEnv(),
          }),
      ]),
    admin: () => runWorkspaceScript('frontend', 'test:admin', args.slice(1)),
    'admin-e2e': () => runWorkspaceScript('frontend', 'test:admin:e2e', args.slice(1)),
    portal: () => runWorkspaceScript('frontend', 'test:portal', args.slice(1)),
    'portal-e2e': () => runWorkspaceScript('frontend', 'test:portal:e2e', args.slice(1)),
    'frontend-e2e': () =>
      runSequence([
        () => runWorkspaceScript('frontend', 'test:admin:e2e', args.slice(1)),
        () => runWorkspaceScript('frontend', 'test:portal:e2e', args.slice(1)),
      ]),
    backend: () =>
      runWorkspaceScript('backend', 'test', args.slice(1), {
        env: localTestDatabaseEnv(),
      }),
    types: () => runCommand('npx', ['tsc', '--noEmit', '-p', 'tests/types/tsconfig.json']),
    mutation: () => runCommand('npx', ['stryker', 'run', ...args.slice(1)]),
    'backend-exception-filter': () =>
      runWorkspaceScript('backend', 'test:exception-filter', args.slice(1), {
        env: localTestDatabaseEnv(),
      }),
    db: () =>
      runCommand(process.execPath, ['scripts/db.mjs', 'bootstrap-smoke'], {
        env: localTestDatabaseEnv(),
      }),
    e2e: () =>
      runWorkspaceScript('backend', 'test:e2e', serialE2eArgs, {
        env: localTestDatabaseEnv(),
      }),
    coverage: () =>
      runWorkspaceScript('backend', 'test:cov', args.slice(1), {
        env: localTestDatabaseEnv(),
      }),
    'frontend-coverage': () => runWorkspaceScript('frontend', 'test:coverage', args.slice(1)),
    qa: () => runSequence([() => handleTestQaApi(), () => handleTestQaFrontend()]),
    'qa-api': handleTestQaApi,
    'qa-frontend': handleTestQaFrontend,
  };

  if (!handlers[subcommand]) {
    console.error(
      '[test] valid subcommands: unit, admin, admin-e2e, portal, portal-e2e, frontend-e2e, backend, backend-exception-filter, types, mutation, db, e2e, coverage, frontend-coverage, qa, qa-api, qa-frontend',
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
      console.log(
        'Usage: node scripts/run.mjs db <migrate|seed|smoke|alignment check|fk-coverage check|fk-coverage write|push-guard> [options]',
      );
      return 0;
    },
    migrate: () => runCommand(process.execPath, ['scripts/db.mjs', 'apply-sql']),
    seed: () => runWorkspaceScript('backend', 'db:seed'),
    smoke: () =>
      runCommand(process.execPath, ['scripts/db.mjs', 'bootstrap-smoke'], {
        env: localTestDatabaseEnv(),
      }),
    alignment: () => {
      const action = args[1] ?? 'check';
      if (action !== 'check') {
        console.error('[db alignment] valid subcommands: check');
        return 1;
      }
      return runCommand(process.execPath, [
        'scripts/check-db.mjs',
        'alignment',
        'check',
        ...args.slice(2),
      ]);
    },
    'fk-coverage': () => {
      const action = args[1] ?? 'check';
      if (action === 'check') {
        return runCommand(process.execPath, [
          'scripts/check-db.mjs',
          'fk-coverage',
          'check',
          ...args.slice(2),
        ]);
      }
      if (action === 'write') {
        return runCommand(process.execPath, [
          'scripts/check-db.mjs',
          'fk-coverage',
          'write',
          ...args.slice(2),
        ]);
      }
      console.error('[db fk-coverage] valid subcommands: check, write');
      return 1;
    },
    'push-guard': () =>
      runCommand(process.execPath, ['scripts/check-db.mjs', 'push-guard', ...args.slice(1)]),
  };

  if (!dbHandlers[subcommand]) {
    console.error(
      '[db] valid subcommands: help, migrate, seed, smoke, alignment, fk-coverage, push-guard',
    );
    return 1;
  }

  return dbHandlers[subcommand]();
}

function handleApi() {
  const family = args[0] ?? 'help';
  const handlers = {
    help: () => {
      console.log(
        'Usage: node scripts/run.mjs api <alignment sync|alignment check|operation check|spec check|client generate> [options]',
      );
      return 0;
    },
    alignment: () => {
      const action = args[1] ?? 'check';
      if (action === 'sync') {
        return runCommand(process.execPath, [
          'scripts/check-api.mjs',
          'alignment',
          'sync',
          ...args.slice(2),
        ]);
      }
      if (action === 'check') {
        return runCommand(process.execPath, [
          'scripts/check-api.mjs',
          'alignment',
          'check',
          ...args.slice(2),
        ]);
      }
      console.error('[api alignment] valid subcommands: sync, check');
      return 1;
    },
    operation: () => {
      const action = args[1] ?? 'check';
      if (action !== 'check') {
        console.error('[api operation] valid subcommands: check');
        return 1;
      }
      return runCommand(process.execPath, [
        'scripts/check-api.mjs',
        'operation',
        'check',
        ...args.slice(2),
      ]);
    },
    spec: () => {
      const action = args[1] ?? 'check';
      if (action !== 'check') {
        console.error('[api spec] valid subcommands: check');
        return 1;
      }
      return runCommand(process.execPath, [
        'scripts/check-api.mjs',
        'spec',
        'check',
        ...args.slice(2),
      ]);
    },
    client: () => {
      const action = args[1] ?? 'generate';
      if (action !== 'generate') {
        console.error('[api client] valid subcommands: generate');
        return 1;
      }
      return runSequence([
        () => runWorkspaceScript('backend', 'build'),
        () =>
          runCommand(process.execPath, [
            'scripts/generate.mjs',
            'openapi-client',
            ...args.slice(2),
          ]),
      ]);
    },
  };

  if (!handlers[family]) {
    console.error('[api] valid subcommands: help, alignment, operation, spec, client');
    return 1;
  }

  return handlers[family]();
}

function handleQa() {
  const subcommand = args[0] ?? 'bootstrap';
  const handlers = {
    bootstrap: () =>
      runCommand(process.execPath, ['scripts/qa.mjs', 'bootstrap', ...args.slice(1)]),
    'smoke:urls': () =>
      runCommand(process.execPath, ['scripts/qa.mjs', 'smoke-urls', ...args.slice(1)]),
  };

  if (!handlers[subcommand]) {
    console.error('[qa] valid subcommands: bootstrap, smoke:urls');
    return 1;
  }

  return handlers[subcommand]();
}

function runAuditSubcommand(subcommand, passThrough) {
  if (subcommand === 'help') {
    console.log(
      'Usage: node scripts/run.mjs audit <schema|api|fr|tests|hotspots|backlog|pvd|live-data|rls-spec-coverage|all> [options]',
    );
    return 0;
  }

  if (subcommand === 'all') {
    return runCommand(process.execPath, ['scripts/audit.mjs', 'all', ...passThrough]);
  }

  if (
    ![
      'schema',
      'api',
      'fr',
      'tests',
      'hotspots',
      'backlog',
      'pvd',
      'live-data',
      'rls-spec-coverage',
    ].includes(subcommand)
  ) {
    console.error(
      '[audit] valid subcommands: help, schema, api, fr, tests, hotspots, backlog, pvd, live-data, rls-spec-coverage, all',
    );
    return 1;
  }

  return runCommand(process.execPath, ['scripts/audit.mjs', subcommand, ...passThrough]);
}

function handleAudit() {
  return runAuditSubcommand(args[0] ?? 'help', args.slice(1));
}

function handleAuditAlias(subcommand) {
  return runAuditSubcommand(subcommand, args);
}

function handleGovernance() {
  const subcommand = args[0] ?? 'check';
  if (subcommand !== 'check') {
    console.error('[governance] valid subcommands: check');
    return 1;
  }
  return runCommand(process.execPath, ['scripts/lib/governance/validate.mjs']);
}

function handleCheck() {
  if (args[0] === 'circular') {
    const target = args[1] ?? 'help';
    const handlers = {
      backend: () => runCommand('madge', ['--circular', 'backend/src', ...args.slice(2)]),
      frontend: () => runCommand('madge', ['--circular', 'frontend/src', ...args.slice(2)]),
    };

    if (!handlers[target]) {
      console.error('[check circular] valid targets: backend, frontend');
      return 1;
    }

    return handlers[target]();
  }

  return runCommand(process.execPath, ['scripts/check-evidence.mjs', ...args]);
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
    'docs/gov/evidence/database-alignment-phase-1.md',
    'infra/README.md',
    'infra/aws/README.md',
    'scripts/run.mjs',
    'backend/src/main-payroll-engine.ts',
    'backend/src/main-report-worker.ts',
    'backend/src/main-report-service.ts',
    'docs/gov/generated/runtime-topology.json',
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
  return runCommand(step.command, step.args);
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
  check: handleCheck,
  api: handleApi,
  qa: handleQa,
  audit: handleAudit,
  governance: handleGovernance,
  health: handleHealth,
  deploy: handleDeploy,
  prepare: () => runCommand('husky', args),
  clean: () => runCommand(process.execPath, ['scripts/clean.mjs', ...args]),
  'audit:schema': () => handleAuditAlias('schema'),
  'audit:api': () => handleAuditAlias('api'),
  'audit:fr': () => handleAuditAlias('fr'),
  'audit:tests': () => handleAuditAlias('tests'),
  'audit:hotspots': () => handleAuditAlias('hotspots'),
  'audit:backlog': () => handleAuditAlias('backlog'),
  'audit:pvd': () => handleAuditAlias('pvd'),
  'audit:rls-spec-coverage': () => handleAuditAlias('rls-spec-coverage'),
  'audit:all': () => handleAuditAlias('all'),
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
