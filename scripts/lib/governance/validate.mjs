#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { inspectRlsSpecs } from '../checks/rls-specs.mjs';
import { defaultRepoRoot } from '../repo-paths.mjs';
import { hardFailGateCommands } from '../workspace-commands.mjs';

const repoRoot = defaultRepoRoot;

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
  const packages = ['package.json', 'backend/package.json', 'frontend/package.json'];

  for (const packagePath of packages) {
    const packageJson = readJson(packagePath);
    record(`runtime-pin:${packagePath}`, hasPinnedRuntime(packageJson), packagePath);
  }

  assertPath('.nvmrc');
}

function validateSingleLockfile() {
  assertPath('package-lock.json');
  record(
    'lockfile:no-backend-lockfile',
    !pathExists('backend/package-lock.json'),
    'backend/package-lock.json',
  );
  record(
    'lockfile:no-frontend-lockfile',
    !pathExists('frontend/package-lock.json'),
    'frontend/package-lock.json',
  );
}

function validateGovernanceManifest() {
  const manifest = readJson('docs/gov/generated/governance-manifest.json');
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
  const content = readFileSync(resolve(repoRoot, 'docs/leg/rev-eng/deprecation-status.md'), 'utf8');
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
  record('devai:source-root', config.sourceRoot === '.', config.sourceRoot);

  for (const path of config.authoritativeDocs ?? []) {
    assertPath(path, `devai-authoritative:${path}`);
  }

  for (const path of config.generatedSurfaces ?? []) {
    assertPath(path, `devai-generated:${path}`);
  }

  const hardFailCommands = new Set(config.hardFailGates?.map((gate) => gate.command) ?? []);
  for (const command of hardFailGateCommands) {
    record(`devai-hard-fail:${command}`, hardFailCommands.has(command), command);
  }
}

function validateCanonicalRootScripts() {
  const packageJson = readJson('package.json');
  const scripts = packageJson.scripts ?? {};
  const removedScripts = [
    ['start', 'dev'],
    ['start', 'frontend'],
    ['start', 'backend'],
    ['build', 'workspaces'],
    ['build', 'frontend'],
    ['lint', 'workspaces'],
    ['format', 'workspaces'],
    ['test', 'workspaces'],
    ['test', 'unit'],
    ['test', 'int'],
    ['commit', 'check'],
    ['governance', 'runtime-topology'],
  ].map((parts) => parts.join(':'));

  for (const scriptName of removedScripts) {
    record(`root-script:removed:${scriptName}`, !(scriptName in scripts), scriptName);
  }

  for (const scriptName of [
    'build',
    'start',
    'lint',
    'lint:check',
    'format',
    'format:check',
    'typecheck',
    'test',
    'test:db',
    'test:e2e',
    'test:coverage',
    'evidence:check',
    'governance:check',
  ]) {
    record(`root-script:canonical:${scriptName}`, scriptName in scripts, scriptName);
  }
}

function validateRlsSpecsExecutable() {
  const result = inspectRlsSpecs(repoRoot);

  record(
    'rls-specs:no-stub-only-files',
    result.stubOnlyFiles.length === 0,
    result.stubOnlyFiles.length === 0
      ? `${result.executableCount} executable files`
      : result.stubOnlyFiles.join('; '),
  );
  record(
    'rls-specs:tenant-insert-select-promoted',
    result.smokeExecutableCount >= 50,
    `${result.smokeExecutableCount} executable tenant-A insert + tenant-B zero-row specs`,
  );
}

function listMarkdownFiles(relativeDir) {
  const absoluteDir = resolve(repoRoot, relativeDir);
  return readdirSync(absoluteDir, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = `${relativeDir}/${entry.name}`;
    if (entry.isDirectory()) {
      return listMarkdownFiles(relativePath);
    }
    return entry.name.endsWith('.md') ? [relativePath] : [];
  });
}

function validateLiveDocPaths() {
  const liveDocFiles = ['docs/eng', 'docs/gov', 'docs/user']
    .flatMap(listMarkdownFiles)
    .filter(
      (file) => !file.startsWith('docs/gov/audit/diag/') && !file.startsWith('docs/gov/audit/inv/'),
    );
  const pathPattern =
    /`((?:backend|frontend|database|scripts|docs|infra|\.github|tests|package\.json|devai\.config\.json|GOVERNANCE\.md)[^`\s]*)`/g;
  const missing = [];

  for (const file of liveDocFiles) {
    const content = readFileSync(resolve(repoRoot, file), 'utf8');
    for (const match of content.matchAll(pathPattern)) {
      const referencedPath = match[1].replace(/[.,;:)]+$/, '');
      if (
        referencedPath.includes('*') ||
        referencedPath.includes('${') ||
        referencedPath.includes('<') ||
        referencedPath.includes('>') ||
        referencedPath.includes('://') ||
        referencedPath.startsWith('docs/work') ||
        referencedPath.startsWith('docs/leg')
      ) {
        continue;
      }

      if (!pathExists(referencedPath)) {
        missing.push(`${file} -> ${referencedPath}`);
      }
    }
  }

  record(
    'docs:live-backtick-paths',
    missing.length === 0,
    missing.length === 0 ? `${liveDocFiles.length} files` : missing.join('; '),
  );
}

function validateAdr011CurrentState() {
  const content = readFileSync(resolve(repoRoot, 'docs/eng/platform.md'), 'utf8');
  record(
    'adr-011:current-state-marker',
    content.includes('ADR-011-CURRENT-STATE'),
    'docs/eng/platform.md',
  );
  record(
    'adr-011:no-current-nx-tree-claim',
    !content.includes('apps/\n  sgp-core-api') && !content.includes('libs/\n  @sgp/domain'),
    'docs/eng/platform.md',
  );
}

function main() {
  validatePackagePins();
  validateSingleLockfile();
  validateGovernanceManifest();
  validateReverseSuccession();
  validateDevaiConfig();
  validateCanonicalRootScripts();
  validateRlsSpecsExecutable();
  validateLiveDocPaths();
  validateAdr011CurrentState();

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
