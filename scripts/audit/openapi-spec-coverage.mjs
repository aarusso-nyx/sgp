#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const specPaths = ['docs/eng/api/openapi.json', 'docs/eng/api/openapi-portal.json'];
const testRoots = ['tests/backend', 'tests/e2e'];
const httpMethods = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options']);
const failOnGap = process.argv.includes('--fail-on-gap');
const jsonOutput = process.argv.includes('--json');

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path);
    return /\.(?:e2e-)?spec\.ts$|\.test\.mjs$/.test(entry.name) ? [path] : [];
  });
}

function operationEntries(specPath) {
  const spec = JSON.parse(readFileSync(join(root, specPath), 'utf8'));
  const entries = [];
  for (const [routePath, operations] of Object.entries(spec.paths ?? {})) {
    for (const [method, operation] of Object.entries(operations ?? {})) {
      if (!httpMethods.has(method)) continue;
      entries.push({
        spec: specPath,
        method: method.toUpperCase(),
        path: routePath,
        operationId: operation.operationId ?? null,
      });
    }
  }
  return entries;
}

function pathMatcher(routePath) {
  const escaped = routePath
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\{[^}]+\\\}/g, '[^/]+');
  return new RegExp(`['"\`]${escaped}['"\`]|request\\([^)]*['"\`]${escaped}['"\`]`, 'i');
}

function methodMatcher(method) {
  return new RegExp(`\\b${method.toLowerCase()}\\s*\\(|\\.${method.toLowerCase()}\\s*\\(`, 'i');
}

const tests = testRoots.flatMap((testRoot) => walk(join(root, testRoot)));
const testCorpus = tests.map((path) => ({
  path,
  relativePath: relative(root, path),
  content: readFileSync(path, 'utf8'),
}));

const operations = specPaths.flatMap(operationEntries);
const covered = [];
const missing = [];

for (const operation of operations) {
  const matchesPath = pathMatcher(operation.path);
  const matchesMethod = methodMatcher(operation.method);
  const evidence = testCorpus
    .filter((test) => matchesPath.test(test.content) && matchesMethod.test(test.content))
    .map((test) => test.relativePath);

  if (evidence.length > 0) {
    covered.push({ ...operation, evidence });
  } else {
    missing.push(operation);
  }
}

const summary = {
  mode: failOnGap ? 'gate' : 'report-only',
  specs: specPaths,
  tests: testCorpus.length,
  operations: operations.length,
  covered: covered.length,
  missing: missing.length,
  missingOperations: missing,
};

if (jsonOutput) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(
    `[openapi-coverage] mode=${summary.mode} covered=${summary.covered}/${summary.operations} missing=${summary.missing}`,
  );
  for (const operation of missing.slice(0, 200)) {
    console.log(
      `[openapi-coverage] missing ${operation.method} ${operation.path} (${operation.spec})`,
    );
  }
  if (missing.length > 200) {
    console.log(`[openapi-coverage] ... ${missing.length - 200} additional missing operations`);
  }
}

if (failOnGap && missing.length > 0) {
  process.exit(1);
}
