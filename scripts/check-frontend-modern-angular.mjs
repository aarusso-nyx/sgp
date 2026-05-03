#!/usr/bin/env node

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const adminSrcRoot = join(root, 'frontend', 'src');
const maxComponentSubscribeSites = 218;

function walk(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(absolutePath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
      files.push(absolutePath);
    }
  }
  return files;
}

const componentFiles = [];
let componentSubscribeSites = 0;
let writableSignalSites = 0;
const missingOnPush = [];

for (const file of walk(adminSrcRoot)) {
  const content = readFileSync(file, 'utf8');
  writableSignalSites += content.match(/\bsignal\s*(?:<[^>]+>)?\s*\(/g)?.length ?? 0;

  if (!content.includes('@Component(')) {
    continue;
  }

  componentFiles.push(file);
  componentSubscribeSites += content.match(/\.subscribe\s*\(/g)?.length ?? 0;

  if (!content.includes('changeDetection: ChangeDetectionStrategy.OnPush')) {
    missingOnPush.push(relative(root, file));
  }
}

const findings = [];
if (missingOnPush.length > 0) {
  findings.push('Components missing ChangeDetectionStrategy.OnPush:');
  findings.push(...missingOnPush.map((file) => `  ${file}`));
}

if (componentSubscribeSites > maxComponentSubscribeSites) {
  findings.push(
    `Component .subscribe( sites increased to ${componentSubscribeSites}; maximum allowed is ${maxComponentSubscribeSites}.`,
  );
}

if (writableSignalSites === 0) {
  findings.push('No writable signal() sites found in frontend/src.');
}

if (findings.length > 0) {
  console.error('[frontend-modern-angular] Modern Angular guard failed:');
  for (const finding of findings) {
    console.error(finding);
  }
  process.exit(1);
}

console.log(
  `[frontend-modern-angular] OK: ${componentFiles.length} components OnPush, ${componentSubscribeSites} component subscribe sites, ${writableSignalSites} writable signal sites`,
);
