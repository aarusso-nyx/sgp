#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const minimumForbiddenE2eFiles = 80;
const minimumFakeTimerSpecFiles = 50;
const minimumDtoSnapshots = 20;

function walk(dir, predicate) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (path.includes(`${join('node_modules')}${''}`)) return [];
    const stat = statSync(path);
    if (stat.isDirectory()) return walk(path, predicate);
    return predicate(path) ? [path] : [];
  });
}

function read(path) {
  return readFileSync(path, 'utf8');
}

const e2eFiles = walk(join(root, 'tests', 'backend'), (path) => path.endsWith('.e2e-spec.ts'));
const forbiddenE2eFiles = e2eFiles.filter((path) => /\b403\b|Forbidden|forbidden/.test(read(path)));

const specFiles = [
  ...walk(join(root, 'backend', 'src'), (path) => path.endsWith('.spec.ts')),
  ...walk(join(root, 'tests', 'backend'), (path) => path.endsWith('.e2e-spec.ts')),
  ...walk(join(root, 'frontend', 'src'), (path) => path.endsWith('.spec.ts')),
  ...walk(join(root, 'frontend', 'portal', 'src'), (path) => path.endsWith('.spec.ts')),
];
const fakeTimerSpecFiles = specFiles.filter((path) => read(path).includes('useFakeTimers'));
const hardcoded2025Dates = specFiles.flatMap((path) => {
  const content = read(path);
  return [...content.matchAll(/new Date\(['"]2025-[^'"]+['"]\)/g)].map(
    (match) => `${path.replace(`${root}/`, '')}:${match.index ?? 0}:${match[0]}`,
  );
});

const snapshotFiles = walk(root, (path) => path.endsWith('.snap')).filter(
  (path) => !path.includes(`${join('node_modules')}${''}`),
);
const dtoSnapshots = snapshotFiles.reduce(
  (count, path) => count + (read(path).match(/exports\[`DTO serialization/g) ?? []).length,
  0,
);

const failures = [];
if (forbiddenE2eFiles.length < minimumForbiddenE2eFiles) {
  failures.push(`403 negative e2e files: ${forbiddenE2eFiles.length}/${minimumForbiddenE2eFiles}`);
}
if (fakeTimerSpecFiles.length < minimumFakeTimerSpecFiles) {
  failures.push(`useFakeTimers specs: ${fakeTimerSpecFiles.length}/${minimumFakeTimerSpecFiles}`);
}
if (hardcoded2025Dates.length > 0) {
  failures.push(`hard-coded new Date('2025-...') in specs:\n${hardcoded2025Dates.join('\n')}`);
}
if (dtoSnapshots < minimumDtoSnapshots) {
  failures.push(`DTO snapshots: ${dtoSnapshots}/${minimumDtoSnapshots}`);
}

console.log(
  [
    `[test-debt] e2e files with 403 negative path: ${forbiddenE2eFiles.length}/${e2eFiles.length}`,
    `[test-debt] specs using useFakeTimers: ${fakeTimerSpecFiles.length}/${specFiles.length}`,
    `[test-debt] hard-coded new Date('2025-...') in specs: ${hardcoded2025Dates.length}`,
    `[test-debt] stable DTO snapshots: ${dtoSnapshots}`,
  ].join('\n'),
);

if (failures.length > 0) {
  console.error(`[test-debt] failed:\n${failures.join('\n')}`);
  process.exit(1);
}
