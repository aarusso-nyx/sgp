#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const sourceRoot = process.cwd();
const backendRoot = resolve(sourceRoot, 'backend');
const nodePath = [
  resolve(backendRoot, 'node_modules'),
  resolve(sourceRoot, 'node_modules'),
  process.env.NODE_PATH,
]
  .filter(Boolean)
  .join(':');
const backendDistMain = resolve(sourceRoot, 'backend/dist/src/main.js');
const backendDistPortalMain = resolve(sourceRoot, 'backend/dist/src/main-portal.js');

const adminOutDir = resolve(sourceRoot, 'frontend/src/app/core/api/generated');
const portalOutDir = resolve(sourceRoot, 'frontend/portal/src/app/core/api/generated');
const coreSpecPath = resolve(adminOutDir, 'openapi-core.json');
const portalSpecPath = resolve(adminOutDir, 'openapi-portal.json');
const adminClientPath = resolve(adminOutDir, 'openapi-client.ts');
const portalClientPath = resolve(portalOutDir, 'openapi-client.ts');
const portalClientSpecPath = resolve(portalOutDir, 'openapi-portal.json');

const corePort = Number(process.env.OPENAPI_CORE_PORT ?? 3300);
const portalPort = Number(process.env.OPENAPI_PORTAL_PORT ?? 3301);
const waitTimeoutMs = Number(process.env.OPENAPI_WAIT_TIMEOUT_MS ?? 30_000);

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function waitForJson(url) {
  const start = Date.now();
  while (Date.now() - start < waitTimeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Retry until timeout.
    }
    await sleep(400);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function normalizeOpenApi31(spec, label) {
  if (!spec || typeof spec !== 'object') {
    throw new Error(`[openapi-client] ${label} did not return an OpenAPI document`);
  }
  if (!spec.paths || typeof spec.paths !== 'object') {
    throw new Error(`[openapi-client] ${label} OpenAPI document is missing paths`);
  }
  return {
    ...spec,
    openapi: '3.1.0',
    jsonSchemaDialect: 'https://json-schema.org/draft/2020-12/schema',
  };
}

function toPascal(value) {
  return value
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function toCamel(value) {
  const pascal = toPascal(value);
  return pascal ? pascal.charAt(0).toLowerCase() + pascal.slice(1) : value;
}

function normalizeClientPath(pathname) {
  const normalized = pathname.startsWith('/api/') ? pathname.slice(4) : pathname;
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function extractOperations(spec) {
  const paths = spec.paths ?? {};
  const operations = [];

  for (const [rawPath, methods] of Object.entries(paths)) {
    if (!methods || typeof methods !== 'object') {
      continue;
    }

    for (const [httpMethod, operation] of Object.entries(methods)) {
      const method = httpMethod.toLowerCase();
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
        continue;
      }
      if (!operation || typeof operation !== 'object') {
        continue;
      }

      const pathParamNames = Array.from(rawPath.matchAll(/\{([^}]+)\}/g)).map((match) => match[1]);

      const queryParamNames = (Array.isArray(operation.parameters) ? operation.parameters : [])
        .filter((parameter) => parameter?.in === 'query' && parameter?.name)
        .map((parameter) => String(parameter.name));

      const hasBody = Boolean(operation.requestBody);
      const pathSegments = rawPath.split('/').filter(Boolean);
      const staticSegments = pathSegments
        .filter((segment) => !segment.startsWith('{'))
        .map((segment) => toPascal(segment));
      const paramSegments = pathParamNames.map((segment) => toPascal(segment));

      const methodName = toCamel(
        [
          method,
          ...staticSegments,
          paramSegments.length > 0 ? `By${paramSegments.join('And')}` : '',
        ]
          .join('')
          .replace(/^([a-z])/, (char) => char.toLowerCase()),
      );

      operations.push({
        method,
        rawPath,
        clientPath: normalizeClientPath(rawPath),
        methodName,
        pathParamNames,
        queryParamNames,
        hasBody,
      });
    }
  }

  operations.sort((left, right) => {
    const byMethod = left.method.localeCompare(right.method);
    if (byMethod !== 0) {
      return byMethod;
    }
    return left.rawPath.localeCompare(right.rawPath);
  });

  return operations;
}

function dedupeOperations(operations) {
  const byRoute = new Map();
  for (const operation of operations) {
    const key = `${operation.method.toUpperCase()} ${operation.clientPath}`;
    if (!byRoute.has(key)) {
      byRoute.set(key, operation);
    }
  }

  const seen = new Set();
  const deduped = [];

  for (const operation of byRoute.values()) {
    let methodName = operation.methodName;
    let index = 2;
    while (seen.has(methodName)) {
      methodName = `${operation.methodName}${index}`;
      index += 1;
    }
    seen.add(methodName);
    deduped.push({ ...operation, methodName });
  }

  return deduped;
}

function renderPathTemplate(clientPath, pathParamNames) {
  if (pathParamNames.length === 0) {
    return `'${clientPath}'`;
  }

  let template = clientPath;
  for (const paramName of pathParamNames) {
    template = template.replace(`{${paramName}}`, `\${encodeURIComponent(params.${paramName})}`);
  }
  return `\`${template}\``;
}

function renderOperationMethod(operation) {
  const pathParamsType =
    operation.pathParamNames.length === 0
      ? ''
      : `params: { ${operation.pathParamNames.map((name) => `${name}: string`).join('; ')} }, `;

  const querySignature = operation.queryParamNames.length > 0 ? ', query: ApiQuery = {}' : '';

  const pathExpr = renderPathTemplate(operation.clientPath, operation.pathParamNames);

  if (operation.method === 'get') {
    if (operation.queryParamNames.length > 0) {
      return `  ${operation.methodName}(${pathParamsType}query: ApiQuery = {}): Observable<unknown> {\n    return this.api.get<unknown>(${pathExpr}, query);\n  }`;
    }
    return `  ${operation.methodName}(${pathParamsType.slice(0, -2)}): Observable<unknown> {\n    return this.api.get<unknown>(${pathExpr});\n  }`;
  }

  if (operation.method === 'delete') {
    return `  ${operation.methodName}(${pathParamsType.slice(0, -2)}): Observable<unknown> {\n    return this.api.delete<unknown>(${pathExpr});\n  }`;
  }

  if (operation.method === 'post') {
    return `  ${operation.methodName}(${pathParamsType}body: ApiBody = {}): Observable<unknown> {\n    return this.api.post<unknown, ApiBody>(${pathExpr}, body);\n  }`;
  }

  if (operation.method === 'put') {
    return `  ${operation.methodName}(${pathParamsType}body: ApiBody = {}): Observable<unknown> {\n    return this.api.put<unknown, ApiBody>(${pathExpr}, body);\n  }`;
  }

  return `  ${operation.methodName}(${pathParamsType}body: ApiBody = {}): Observable<unknown> {\n    return this.api.patch<unknown, ApiBody>(${pathExpr}, body);\n  }`;
}

function renderClient(operations) {
  const methods = operations.map((operation) => renderOperationMethod(operation)).join('\n\n');

  return `/* eslint-disable */
/* auto-generated by scripts/generate.mjs openapi-client */

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../api-client';

export type ApiQueryValue = string | number | boolean | undefined;
export type ApiQuery = Record<string, ApiQueryValue>;
export type ApiBody = Record<string, unknown>;

@Injectable({
  providedIn: 'root',
})
export class OpenApiClient {
  constructor(private readonly api: ApiClient) {}

${methods}
}
`;
}

function killProcess(child) {
  if (!child || child.killed) {
    return;
  }
  child.kill('SIGTERM');
}

async function main() {
  mkdirSync(adminOutDir, { recursive: true });
  mkdirSync(portalOutDir, { recursive: true });

  const coreProcess = spawn(process.execPath, [backendDistMain], {
    cwd: backendRoot,
    env: {
      ...process.env,
      NODE_PATH: nodePath,
      PORT: String(corePort),
      APP_SERVICE_NAME: 'sgp-core-api',
    },
    stdio: 'inherit',
  });

  const portalProcess = spawn(process.execPath, [backendDistPortalMain], {
    cwd: backendRoot,
    env: {
      ...process.env,
      NODE_PATH: nodePath,
      PORTAL_API_PORT: String(portalPort),
      APP_SERVICE_NAME: 'sgp-portal-api',
    },
    stdio: 'inherit',
  });

  try {
    const [rawCoreSpec, rawPortalSpec] = await Promise.all([
      waitForJson(`http://127.0.0.1:${corePort}/api/docs-json`),
      waitForJson(`http://127.0.0.1:${portalPort}/api/portal-docs-json`),
    ]);
    const coreSpec = normalizeOpenApi31(rawCoreSpec, 'core');
    const portalSpec = normalizeOpenApi31(rawPortalSpec, 'portal');

    writeFileSync(coreSpecPath, `${JSON.stringify(coreSpec, null, 2)}\n`, 'utf8');
    writeFileSync(portalSpecPath, `${JSON.stringify(portalSpec, null, 2)}\n`, 'utf8');

    const mergedOperations = dedupeOperations([
      ...extractOperations(coreSpec),
      ...extractOperations(portalSpec),
    ]);

    const adminClientSource = renderClient(mergedOperations);
    const portalClientSource = renderClient(dedupeOperations(extractOperations(portalSpec)));
    mkdirSync(dirname(adminClientPath), { recursive: true });
    mkdirSync(dirname(portalClientPath), { recursive: true });
    writeFileSync(adminClientPath, adminClientSource, 'utf8');
    writeFileSync(portalClientSpecPath, `${JSON.stringify(portalSpec, null, 2)}\n`, 'utf8');
    writeFileSync(portalClientPath, portalClientSource, 'utf8');

    console.log(
      `[openapi-client] generated ${adminClientPath} with ${mergedOperations.length} operations`,
    );
    console.log(`[openapi-client] generated ${portalClientPath}`);
    console.log(`[openapi-client] wrote ${coreSpecPath}`);
    console.log(`[openapi-client] wrote ${portalSpecPath}`);
    console.log(`[openapi-client] wrote ${portalClientSpecPath}`);
  } finally {
    killProcess(coreProcess);
    killProcess(portalProcess);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
