#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildSensorReading } from '@devai-nyx/sensors';

const root = process.cwd();
const command = process.argv[2] ?? 'help';
const extra = process.argv.slice(3);
const cli = join(root, 'node_modules', '.bin', 'devai');
const state = join(root, '.devai', 'state');

function run(args, options = {}) {
  const result = spawnSync(cli, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    env: process.env,
  });
  return {
    code: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function inventory() {
  mkdirSync(join(state, 'inventory'), { recursive: true });
  const result = run(['inv-regen', '--repo-root', '.'], { capture: true });
  if (result.code !== 0) {
    process.stderr.write(result.stderr);
    return result.code;
  }
  const value = JSON.parse(result.stdout);
  writeFileSync(join(state, 'inventory', 'sgp.json'), `${JSON.stringify(value, null, 2)}\n`);
  console.log(
    `[devai] inventory: ${value.modules.length} modules, ${value.routes.length} routes, ${value.test_inventory.length} tests`,
  );
  return 0;
}

function sensors() {
  const readingDir = join(state, 'sensor-readings');
  mkdirSync(readingDir, { recursive: true });
  const definitions = [
    ['sgp-lint', 'lint', 'L0', ['npm', 'run', 'lint:check']],
    ['sgp-typecheck', 'type_check', 'L0', ['npm', 'run', 'typecheck']],
    ['sgp-registry', 'contract_validation', 'L2', ['npm', 'run', 'check:registry-dependencies']],
    ['sgp-governance', 'contract_validation', 'L2', ['npm', 'run', 'governance:check']],
    ['sgp-health', 'runtime_probe_api', 'L1', ['npm', 'run', 'health:json']],
  ];
  let failed = false;
  for (const [name, kind, tier, argv] of definitions) {
    const started = Date.now();
    const result = spawnSync(argv[0], argv.slice(1), {
      cwd: root,
      encoding: 'utf8',
      env: process.env,
    });
    const code = result.status ?? 1;
    const reading = buildSensorReading({
      sensorName: name,
      sensorKind: kind,
      sensorVersion: '1.0.0',
      command: argv,
      status: code === 0 ? 'pass' : 'fail',
      deterministic: true,
      tier,
      exit_code: code,
      duration_ms: Date.now() - started,
      out_head: result.stdout ?? '',
      err_head: result.stderr ?? '',
    });
    writeFileSync(join(readingDir, `${reading.id}.json`), `${JSON.stringify(reading, null, 2)}\n`);
    console.log(`[devai] sensor ${name}: ${reading.status}`);
    failed ||= code !== 0;
  }
  return failed ? 1 : 0;
}

function scorecard() {
  mkdirSync(join(state, 'scorecards'), { recursive: true });
  const result = run(
    [
      'score-compute',
      '--readings-dir',
      '.devai/state/sensor-readings',
      '--latest-per-kind',
      '--view',
      'json',
    ],
    { capture: true },
  );
  if (result.code !== 0) {
    process.stderr.write(result.stderr);
    return result.code;
  }
  const value = JSON.parse(result.stdout);
  writeFileSync(join(state, 'scorecards', 'current.json'), `${JSON.stringify(value, null, 2)}\n`);
  process.stdout.write(result.stdout);
  return 0;
}

const handlers = {
  help: () => {
    console.log(
      'Usage: node scripts/devai.mjs <doctor|spec|inventory|pack|prepare|sensors|scorecard|record|evidence|health>',
    );
    return 0;
  },
  doctor: () => run(['doctor', '--adopter', '--human', ...extra]).code,
  spec: () => run(['spec-validate-all', ...extra]).code,
  inventory,
  pack: () => run(['pack-resolve', '--repo-root', '.', '--human', ...extra]).code,
  prepare: () => {
    for (const dir of ['inventory', 'sensor-readings', 'scorecards', 'test-results']) {
      mkdirSync(join(state, dir), { recursive: true });
    }
    return 0;
  },
  sensors,
  scorecard,
  record: () => run(['record-run', ...extra]).code,
  evidence: () => run(['evidence-emit', ...extra]).code,
  health: () => run(['evidence-verify', '--human', ...extra]).code,
};

if (!(command in handlers)) {
  console.error(`[devai] unknown command: ${command}`);
  process.exit(1);
}
process.exit(handlers[command]());
