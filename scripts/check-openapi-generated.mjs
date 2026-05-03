#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const specPaths = [
  'frontend/src/app/core/api/generated/openapi-core.json',
  'frontend/src/app/core/api/generated/openapi-portal.json',
  'frontend/portal/src/app/core/api/generated/openapi-portal.json',
];

const methods = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options']);
const failures = [];

function record(ok, detail) {
  if (!ok) {
    failures.push(detail);
  }
}

for (const specPath of specPaths) {
  const spec = JSON.parse(readFileSync(specPath, 'utf8'));
  record(spec.openapi === '3.1.0', `${specPath}: expected openapi 3.1.0, found ${spec.openapi}`);
  record(
    spec.jsonSchemaDialect === 'https://json-schema.org/draft/2020-12/schema',
    `${specPath}: missing JSON Schema 2020-12 dialect`,
  );

  for (const path of Object.keys(spec.paths ?? {})) {
    record(
      !path.startsWith('/admin/v1'),
      `${specPath}: route is outside global /api prefix: ${path}`,
    );
  }

  for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem ?? {})) {
      if (!methods.has(method)) {
        continue;
      }
      const label = `${specPath}: ${method.toUpperCase()} ${path}`;
      record(
        typeof operation.summary === 'string' && operation.summary.trim().length > 0,
        `${label}: missing summary`,
      );
      record(Array.isArray(operation.tags) && operation.tags.length > 0, `${label}: missing tags`);
      record(
        operation.responses && Object.keys(operation.responses).length > 0,
        `${label}: missing responses`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error(`[openapi-generated] failed checks: ${failures.length}`);
  for (const failure of failures.slice(0, 80)) {
    console.error(`- ${failure}`);
  }
  if (failures.length > 80) {
    console.error(`... ${failures.length - 80} additional failures omitted`);
  }
  process.exit(1);
}

console.log('[openapi-generated] generated specs are OpenAPI 3.1 and documented');
