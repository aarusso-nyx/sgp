#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultWorkspaceRoot = resolve(scriptDir, '..', '..', '..');

export function inspectRlsSpecs(workspaceRoot = defaultWorkspaceRoot) {
  const rlsDir = resolve(workspaceRoot, 'tests/rls');
  if (!existsSync(rlsDir)) {
    return {
      executableCount: 0,
      files: [],
      ok: false,
      smokeExecutableCount: 0,
      stubOnlyFiles: ['tests/rls'],
    };
  }

  const files = readdirSync(rlsDir)
    .filter((file) => file.endsWith('.spec.ts'))
    .sort();

  const inspected = files.map((file) => {
    const relativePath = `tests/rls/${file}`;
    const content = readFileSync(join(rlsDir, file), 'utf8');
    const usesSmokeHelper = /\bdescribeRlsSmokeSpec\s*\(/.test(content);
    const hasExecutableTest =
      usesSmokeHelper ||
      (/\bdescribe\s*\(/.test(content) &&
        /\b(?:it|test)\s*\(/.test(content) &&
        /\bexpect\s*\(/.test(content));
    const hasTenantAInsertEvidence = /tenantAInsertEvidence\s*:\s*\[/.test(content);
    const hasTenantBZeroRowEvidence = /tenantBZeroRowEvidence\s*:\s*\[/.test(content);

    return {
      file: relativePath,
      hasExecutableTest,
      hasTenantAInsertEvidence,
      hasTenantBZeroRowEvidence,
      usesSmokeHelper,
    };
  });

  const stubOnlyFiles = inspected
    .filter((file) => !file.hasExecutableTest)
    .map((file) => file.file);
  const smokeExecutableCount = inspected.filter(
    (file) =>
      file.usesSmokeHelper && file.hasTenantAInsertEvidence && file.hasTenantBZeroRowEvidence,
  ).length;

  return {
    executableCount: inspected.length - stubOnlyFiles.length,
    files: inspected,
    ok: stubOnlyFiles.length === 0 && smokeExecutableCount >= 50,
    smokeExecutableCount,
    stubOnlyFiles,
  };
}

function main() {
  const result = inspectRlsSpecs();

  if (result.stubOnlyFiles.length > 0) {
    console.error('[rls-specs] stub-only tests/rls files:');
    for (const file of result.stubOnlyFiles) {
      console.error(`[rls-specs] - ${file}`);
    }
  }

  console.log(
    `[rls-specs] executable=${result.executableCount} smokeExecutable=${result.smokeExecutableCount} stubOnly=${result.stubOnlyFiles.length}`,
  );

  if (!result.ok) {
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
