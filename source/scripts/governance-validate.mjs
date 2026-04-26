#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const sourceRoot = resolve(scriptDir, '..');
const repoRoot = resolve(sourceRoot, '..');

const checks = [];

function record(name, ok, detail) {
  checks.push({ name, ok, detail });
}

function readJson(relativePath) {
  const absolutePath = resolve(repoRoot, relativePath);
  return JSON.parse(readFileSync(absolutePath, 'utf8'));
}

function pathExists(relativePath) {
  return existsSync(resolve(repoRoot, relativePath));
}

function assertPath(relativePath, name = relativePath) {
  record(`path:${name}`, pathExists(relativePath), relativePath);
}

function hasPinnedRuntime(packageJson) {
  return (
    packageJson.packageManager === 'npm@11.12.1' &&
    packageJson.engines?.node === '>=24.0.0 <25' &&
    packageJson.engines?.npm === '>=11.12.1 <12'
  );
}

function validatePackagePins() {
  const packages = [
    'source/package.json',
    'source/backend/package.json',
    'source/frontend/package.json',
  ];

  for (const packagePath of packages) {
    const packageJson = readJson(packagePath);
    record(`runtime-pin:${packagePath}`, hasPinnedRuntime(packageJson), packagePath);
  }

  assertPath('source/.nvmrc');
  assertPath('source/.node-version');
}

function validateSingleLockfile() {
  assertPath('source/package-lock.json');
  record(
    'lockfile:no-backend-lockfile',
    !pathExists('source/backend/package-lock.json'),
    'source/backend/package-lock.json',
  );
  record(
    'lockfile:no-frontend-lockfile',
    !pathExists('source/frontend/package-lock.json'),
    'source/frontend/package-lock.json',
  );
}

function validateGovernanceManifest() {
  const manifest = readJson('docs/governance/governance-manifest.json');
  record('governance-manifest:implemented', manifest.status === 'implemented', manifest.status);
  for (const control of manifest.controls ?? []) {
    record(
      `governance-control:${control.id}`,
      typeof control.evidence === 'string' && pathExists(control.evidence),
      control.evidence,
    );
  }
}

function validateReverseSuccession() {
  const content = readFileSync(
    resolve(repoRoot, 'docs/legacy-reverse/deprecation-status.md'),
    'utf8',
  );
  const rows = content
    .split('\n')
    .filter((line) => line.includes('|') && line.includes('2026-04-26'));
  const uncovered = rows.filter((line) => {
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    return cells[2] === '—' || cells[4] === 'not_covered';
  });

  record('reverse-succession:rows-present', rows.length > 0, `${rows.length} rows`);
  record(
    'reverse-succession:no-uncovered-2026-04-26',
    uncovered.length === 0,
    `${uncovered.length} uncovered rows`,
  );
}

function validateDevaiConfig() {
  const config = readJson('devai.config.json');
  record('devai:project', config.project === 'sgp', config.project);
  record('devai:source-root', config.sourceRoot === 'source', config.sourceRoot);

  for (const path of config.authoritativeDocs ?? []) {
    assertPath(path, `devai-authoritative:${path}`);
  }

  for (const path of config.generatedSurfaces ?? []) {
    assertPath(path, `devai-generated:${path}`);
  }

  const hardFailCommands = new Set(config.hardFailGates?.map((gate) => gate.command) ?? []);
  const requiredCommands = [
    'npm --prefix source run lint:check',
    'npm --prefix source run format:check',
    'npm --prefix source run typecheck',
    'npm --prefix source run api:alignment:check -- --json',
    'npm --prefix source run db:alignment:check -- --json',
    'npm --prefix source run health:json',
  ];

  for (const command of requiredCommands) {
    record(`devai-hard-fail:${command}`, hardFailCommands.has(command), command);
  }
}

function main() {
  validatePackagePins();
  validateSingleLockfile();
  validateGovernanceManifest();
  validateReverseSuccession();
  validateDevaiConfig();

  const failures = checks.filter((check) => !check.ok);
  for (const check of checks) {
    console.log(`[governance] ${check.ok ? 'OK' : 'FAIL'} ${check.name}: ${check.detail}`);
  }

  if (failures.length > 0) {
    console.error(`[governance] failed checks: ${failures.length}`);
    process.exitCode = 1;
  }
}

main();
