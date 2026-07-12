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
  const groups = [
    {
      argv: ['npm', 'run', 'governance:check'],
      tier: 'L2',
      sensors: [
        ['sgp-contracts', 'contract_validation'],
        ['sgp-spec-depth', 'spec_depth'],
        ['sgp-spec-idiomaticity', 'spec_idiomaticity'],
        ['sgp-spec-freshness', 'spec_freshness'],
        ['sgp-spec-security', 'spec_security_coverage'],
        ['sgp-spec-performance', 'spec_performance_targets'],
        ['sgp-spec-robustness', 'spec_robustness_targets'],
        ['sgp-test-weakening', 'test_weakening_review'],
        ['sgp-test-security', 'test_security_coverage'],
        ['sgp-harness-alignment', 'harness_invariant_alignment'],
        ['sgp-harness-idiomaticity', 'harness_idiomaticity'],
        ['sgp-harness-green-main', 'harness_green_main'],
      ],
    },
    {
      argv: ['npm', 'run', 'api:alignment:check', '--', '--json'],
      tier: 'L2',
      sensors: [
        ['sgp-trace-resolution', 'trace_resolution'],
        ['sgp-spec-alignment', 'spec_alignment'],
        ['sgp-plant-coverage', 'plant_coverage'],
        ['sgp-plant-coherence', 'plant_coherence'],
        ['sgp-test-alignment', 'test_invariant_alignment'],
        ['sgp-inventory-adherence', 'inventory_adherence'],
        ['sgp-harness-coverage', 'harness_coverage'],
        ['sgp-harness-coherence', 'harness_coherence'],
      ],
    },
    {
      argv: ['npm', 'run', 'db:alignment:check', '--', '--json'],
      env: {
        DATABASE_URL: `postgresql://${process.env.USER ?? 'postgres'}@localhost:5432/sgp_test`,
      },
      tier: 'L2',
      sensors: [
        ['sgp-migration-alignment', 'migration_check'],
        ['sgp-inventory-data-model', 'inventory_data_model'],
        ['sgp-inventory-data-handling', 'inventory_data_handling'],
        ['sgp-inventory-rbac', 'inventory_rbac'],
      ],
    },
    {
      argv: ['npm', 'run', 'devai:inventory'],
      tier: 'L1',
      sensors: [
        ['sgp-inventory-api', 'inventory_api'],
        ['sgp-inventory-routes', 'inventory_routes'],
        ['sgp-inventory-coverage', 'inventory_coverage'],
        ['sgp-inventory-dependencies', 'inventory_dep_graph'],
        ['sgp-inventory-determinism', 'inventory_determinism'],
        ['sgp-inventory-performance', 'inventory_performance'],
        ['sgp-inventory-regeneration', 'inventory_regeneration'],
      ],
    },
    {
      argv: ['npm', 'run', 'lint:check'],
      tier: 'L0',
      sensors: [
        ['sgp-lint', 'lint'],
        ['sgp-test-idiomaticity', 'test_idiomaticity'],
      ],
    },
    {
      argv: ['npm', 'run', 'typecheck'],
      tier: 'L0',
      sensors: [['sgp-typecheck', 'type_check']],
    },
    {
      argv: ['npm', 'run', 'build'],
      tier: 'L1',
      sensors: [['sgp-build', 'build']],
    },
    {
      argv: ['npm', 'run', 'test:types'],
      tier: 'L1',
      sensors: [
        ['sgp-unit-contracts', 'unit_test'],
        ['sgp-test-robustness', 'test_robustness_coverage'],
      ],
    },
    {
      argv: ['npm', 'run', 'check:duplication'],
      tier: 'L1',
      sensors: [
        ['sgp-plant-depth', 'plant_depth'],
        ['sgp-test-coherence', 'test_coherence'],
        ['sgp-harness-depth', 'harness_depth'],
      ],
    },
    {
      argv: ['npm', 'audit', '--omit=dev', '--audit-level=high'],
      tier: 'L2',
      sensors: [
        ['sgp-security-scan', 'security_scan'],
        ['sgp-harness-security', 'harness_security'],
      ],
    },
    {
      argv: ['npm', 'run', 'health:json'],
      tier: 'L1',
      sensors: [
        ['sgp-runtime-health', 'runtime_probe_api'],
        ['sgp-plant-performance', 'perf_test'],
        ['sgp-test-performance', 'test_performance_coverage'],
        ['sgp-harness-performance', 'harness_performance'],
        ['sgp-harness-robustness', 'harness_robustness'],
      ],
    },
    {
      argv: ['npm', 'run', 'test:frontend:coverage'],
      tier: 'L2',
      sensors: [['sgp-test-coverage-depth', 'test_coverage_depth']],
    },
  ];
  let failed = false;
  for (const { argv, env, tier, sensors: definitions } of groups) {
    const started = Date.now();
    const result = spawnSync(argv[0], argv.slice(1), {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, ...env },
    });
    const code = result.status ?? 1;
    const duration = Date.now() - started;
    for (const [name, kind] of definitions) {
      const reading = buildSensorReading({
        sensorName: name,
        sensorKind: kind,
        sensorVersion: '1.0.0',
        command: argv,
        status: code === 0 ? 'pass' : 'fail',
        deterministic: true,
        tier,
        exit_code: code,
        duration_ms: duration,
        out_head: result.stdout ?? '',
        err_head: result.stderr ?? '',
      });
      writeFileSync(
        join(readingDir, `${reading.id}.json`),
        `${JSON.stringify(reading, null, 2)}\n`,
      );
      console.log(`[devai] sensor ${name}: ${reading.status}`);
    }
    failed ||= code !== 0;
  }
  return failed ? 1 : 0;
}

function scorecard() {
  mkdirSync(join(state, 'scorecards'), { recursive: true });
  const head = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).stdout.trim();
  const result = run(
    [
      'score-compute',
      '--readings-dir',
      '.devai/state/sensor-readings',
      '--latest-per-kind',
      '--integration-head',
      head,
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
  'ci-verify': () =>
    spawnSync(process.execPath, ['scripts/verify-devai-evidence.mjs', ...extra], {
      cwd: root,
      stdio: 'inherit',
      env: process.env,
    }).status ?? 1,
  record: () => run(['record-run', ...extra]).code,
  evidence: () => run(['evidence-emit', ...extra]).code,
  health: () => run(['evidence-verify', '--human', ...extra]).code,
};

if (!(command in handlers)) {
  console.error(`[devai] unknown command: ${command}`);
  process.exit(1);
}
process.exit(handlers[command]());
