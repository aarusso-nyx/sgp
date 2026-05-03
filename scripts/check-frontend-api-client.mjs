#!/usr/bin/env node

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const frontendRoot = join(root, 'frontend');
const scanRoots = [join(frontendRoot, 'src'), join(frontendRoot, 'portal', 'src')];
const rawHttpPattern = /this\.http\s*(?:\n\s*)?\.(get|post|put|patch|delete)(?:<[^>]+>)?\(/g;
const allowedFiles = new Set([
  join(frontendRoot, 'src', 'app', 'core', 'api', 'api-client.ts'),
  join(frontendRoot, 'portal', 'src', 'app', 'core', 'api', 'api-client.ts'),
]);

function walk(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(absolutePath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(absolutePath);
    }
  }
  return files;
}

const findings = [];
for (const scanRoot of scanRoots) {
  for (const file of walk(scanRoot)) {
    if (allowedFiles.has(file)) {
      continue;
    }
    const content = readFileSync(file, 'utf8');
    let match;
    while ((match = rawHttpPattern.exec(content)) !== null) {
      const line = content.slice(0, match.index).split(/\r?\n/).length;
      findings.push(`${relative(root, file)}:${line}: raw this.http.${match[1]} call`);
    }
  }
}

if (findings.length > 0) {
  console.error('[frontend-api-client] Raw HttpClient calls must go through ApiClient:');
  for (const finding of findings) {
    console.error(`  ${finding}`);
  }
  process.exit(1);
}

console.log('[frontend-api-client] OK');
