#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const argv = process.argv.slice(2);
const command = argv[0] ?? 'help';
const args = argv.slice(1);
const cwd = process.cwd();

const COMMANDS = {
  help: 'Show workspace orchestration help.',
  build: 'Build sgp-admin, sgp-portal, and the Nest API runtime.',
  start: 'Start sgp-admin, sgp-portal, sgp-core-api, and sgp-portal-api.',
  lint: 'Run lint across the Angular and Nest workspaces.',
  format: 'Format workspace files and code.',
  test: 'Run unit/integration tests in workspaces.',
  db: 'Run database helper commands (generate, migrate, seed, studio).',
  health: 'Run non-destructive runtime topology and workspace health checks.',
  deploy: 'Run AWS deployment plan checks (dry-run by default).',
};

function loadRuntimeTopology() {
  const path = join(cwd, 'docs', 'governance', 'runtime-topology.json');
  const content = readFileSync(path, 'utf8');
  return JSON.parse(content);
}

function printHelp() {
  console.log('SGP Workspace Dispatcher');
  console.log('');
  console.log('Usage: node scripts/run.mjs <command> [options]');
  console.log('');
  console.log('Commands:');
  for (const [name, description] of Object.entries(COMMANDS)) {
    console.log(`  ${name.padEnd(8)} ${description}`);
  }
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/run.mjs health');
  console.log('  node scripts/run.mjs db generate');
  console.log('  node scripts/run.mjs deploy --target stage --dry-run');
}

function runNpmScript(scriptName, extraArgs = []) {
  const commandArgs = ['run', scriptName];
  if (extraArgs.length > 0) {
    commandArgs.push('--', ...extraArgs);
  }

  const result = spawnSync('npm', commandArgs, {
    stdio: 'inherit',
    cwd,
    shell: process.platform === 'win32',
  });

  if (typeof result.status === 'number') {
    return result.status;
  }

  if (result.error) {
    console.error(`[run] failed to execute npm script \"${scriptName}\": ${result.error.message}`);
  }

  return 1;
}

function spawnNpmScript(scriptName, extraArgs = []) {
  const commandArgs = ['run', scriptName];
  if (extraArgs.length > 0) {
    commandArgs.push('--', ...extraArgs);
  }

  return spawn('npm', commandArgs, {
    stdio: 'inherit',
    cwd,
    shell: process.platform === 'win32',
  });
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

function handleHealth() {
  const topology = loadRuntimeTopology();
  const requiredPaths = [
    'frontend/package.json',
    'frontend/angular.json',
    'frontend/src/main.ts',
    'frontend/portal/src/main.ts',
    'backend/package.json',
    'database/README.md',
    'infra/README.md',
    'infra/aws/README.md',
    'scripts/run.mjs',
    'backend/src/main-payroll-engine.ts',
    'backend/src/main-esocial-worker.ts',
    'backend/src/main-report-service.ts',
    'docs/governance/runtime-topology.json',
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

function handleDb() {
  const subcommand = args[0] ?? 'help';
  const dbScriptBySubcommand = {
    help: null,
    generate: 'db:generate',
    migrate: 'db:migrate',
    seed: 'db:seed',
    studio: 'db:studio',
  };

  if (!(subcommand in dbScriptBySubcommand)) {
    console.error(`[db] unknown subcommand: ${subcommand}`);
    console.error('Valid subcommands: help, generate, migrate, seed, studio');
    return 1;
  }

  if (subcommand === 'help') {
    console.log('Usage: node scripts/run.mjs db <generate|migrate|seed|studio>');
    return 0;
  }

  return runNpmScript(dbScriptBySubcommand[subcommand], args.slice(1));
}

function handleStart() {
  const processes = [
    spawnNpmScript('start:core-api'),
    spawnNpmScript('start:portal-api'),
    spawnNpmScript('start:admin'),
    spawnNpmScript('start:portal'),
  ];
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

const handlers = {
  help: () => {
    printHelp();
    return 0;
  },
  build: () => runNpmScript('build:workspaces', args),
  start: handleStart,
  lint: () => runNpmScript('lint:workspaces', args),
  format: () => runNpmScript('format:workspaces', args),
  test: () => runNpmScript('test:workspaces', args),
  db: handleDb,
  health: handleHealth,
  deploy: handleDeploy,
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
