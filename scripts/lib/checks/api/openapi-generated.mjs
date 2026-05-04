#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const specPaths = [
  'frontend/src/app/core/api/generated/openapi-core.json',
  'frontend/src/app/core/api/generated/openapi-portal.json',
  'frontend/portal/src/app/core/api/generated/openapi-portal.json',
];

const methods = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options']);
const failures = [];
const standardClientErrorStatuses = ['400', '401', '403', '404', '409', '422', '429'];

function record(ok, detail) {
  if (!ok) {
    failures.push(detail);
  }
}

function responseJsonSchema(response) {
  return response?.content?.['application/json']?.schema;
}

function hasJsonSchema(response) {
  return Boolean(responseJsonSchema(response));
}

function hasProblemDetailsRef(response) {
  const schema = responseJsonSchema(response);
  return schema?.$ref === '#/components/schemas/SgpProblemDetails';
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

      const responses = operation.responses ?? {};
      const twoHundredStatuses = Object.keys(responses).filter((status) => /^2\d\d$/.test(status));
      const schemaBackedSuccess = twoHundredStatuses
        .filter((status) => status !== '204')
        .some((status) => hasJsonSchema(responses[status]));
      if (twoHundredStatuses.some((status) => status !== '204')) {
        record(schemaBackedSuccess, `${label}: missing JSON schema for non-204 2xx response`);
      }

      for (const status of standardClientErrorStatuses) {
        record(
          hasProblemDetailsRef(responses[status]),
          `${label}: missing ${status} SgpProblemDetails response contract`,
        );
      }
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

console.log(
  '[openapi-generated] generated specs are OpenAPI 3.1 and include documented 2xx/4xx contracts',
);
