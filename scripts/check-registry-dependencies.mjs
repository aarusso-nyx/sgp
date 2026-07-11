#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = process.cwd();
const forbiddenScopes = ['@stynx/', '@stynx-web/', '@devai/'];
const dependencySections = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
];
const findings = [];

for (const manifest of await packageManifests(root)) {
  const source = JSON.parse(await readFile(manifest, 'utf8'));
  for (const section of dependencySections) {
    for (const [name, spec] of Object.entries(source[section] ?? {})) {
      if (isForbiddenName(name) || isLocalSpec(spec)) {
        findings.push({
          file: relative(root, manifest),
          section,
          name,
          spec,
          reason: reasonFor(name, spec),
        });
      }
    }
  }
}

const lockfile = join(root, 'package-lock.json');
const lock = JSON.parse(await readFile(lockfile, 'utf8'));
for (const [packagePath, metadata] of Object.entries(lock.packages ?? {})) {
  if (isLocalSpec(metadata.resolved)) {
    findings.push({
      file: 'package-lock.json',
      section: 'packages',
      name: packagePath,
      spec: metadata.resolved,
      reason: 'local lockfile resolution',
    });
  }
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ findings }, null, 2));
} else if (findings.length === 0) {
  console.log('[registry-dependencies] PASS: no local or legacy STYNX/DEVAI dependencies found.');
} else {
  console.error(
    `[registry-dependencies] FAIL: found ${findings.length} local or legacy dependency reference(s).`,
  );
  for (const finding of findings) {
    console.error(
      `- ${finding.file} ${finding.section} ${finding.name}: ${finding.spec} (${finding.reason})`,
    );
  }
}

process.exitCode = findings.length === 0 ? 0 : 1;

function isForbiddenName(name) {
  return forbiddenScopes.some((scope) => name.startsWith(scope));
}

function isLocalSpec(spec) {
  return typeof spec === 'string' && /^(?:file:|link:)/.test(spec);
}

function reasonFor(name, spec) {
  if (isForbiddenName(name)) return 'legacy package scope';
  if (isLocalSpec(spec)) return 'local dependency specification';
  return 'unsupported registry reference';
}

async function packageManifests(directory) {
  const manifests = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) manifests.push(...(await packageManifests(path)));
    if (entry.isFile() && entry.name === 'package.json') manifests.push(path);
  }
  return manifests;
}
