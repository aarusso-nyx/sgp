#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = process.cwd();
const scorecardPath = resolve(root, '.devai/state/scorecards/current.json');
const chainPath = resolve(root, '.devai/state/evidence-chain.json');
const readingsPath = resolve(root, '.devai/state/sensor-readings');

function fail(message) {
  console.error(`[devai-ci] FAIL: ${message}`);
  process.exitCode = 1;
}

for (const path of [scorecardPath, chainPath]) {
  if (!existsSync(path)) fail(`required retained evidence is missing: ${path}`);
}

if (process.exitCode) process.exit();

const scorecard = JSON.parse(readFileSync(scorecardPath, 'utf8'));
const chain = JSON.parse(readFileSync(chainPath, 'utf8'));
const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();

if (scorecard.integration_head !== head) {
  fail(`scorecard head ${scorecard.integration_head ?? '<missing>'} does not match ${head}`);
}
if (scorecard.overall?.verdict !== 'PASS') fail('scorecard overall verdict is not PASS');
if (!Array.isArray(scorecard.cells) || scorecard.cells.length !== 45) {
  fail(`scorecard must contain 45 cells, found ${scorecard.cells?.length ?? 0}`);
}

for (const cell of scorecard.cells ?? []) {
  const structuralNa = cell.substrate === 'F4' && cell.property === 'T5' && cell.verdict === 'N/A';
  if (cell.verdict !== 'PASS' && !structuralNa) {
    fail(`${cell.substrate}x${cell.property} has unexplained verdict ${cell.verdict}`);
  }
  for (const reading of cell.sensor_readings ?? []) {
    if (!existsSync(resolve(readingsPath, `${reading}.json`))) {
      fail(`${cell.substrate}x${cell.property} references missing reading ${reading}`);
    }
  }
}

if (!Array.isArray(chain.records) || chain.records.length === 0)
  fail('evidence chain has no records');
if (!chain.head || chain.records?.at(-1)?.manifest_hash !== chain.head) {
  fail('evidence chain head does not match its final record');
}

const health = spawnSync(process.execPath, ['scripts/devai.mjs', 'health'], {
  cwd: root,
  encoding: 'utf8',
});
process.stdout.write(health.stdout ?? '');
process.stderr.write(health.stderr ?? '');
if (health.status !== 0) fail(`DEVAI evidence verification exited ${health.status ?? 1}`);

if (!process.exitCode) {
  console.log(
    `[devai-ci] PASS: current ${head} has a complete scorecard and valid evidence chain.`,
  );
}
