#!/usr/bin/env node
import { rm } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import process from 'node:process';

import { parseArgs } from './lib/cli.mjs';

const workspaceRoot = process.cwd();

const targetGroups = {
  root: [
    'node_modules',
    'coverage',
    'dist',
    'generated',
    '.angular',
    '.cache',
    '.vite',
    '.eslintcache',
    'tsconfig.tsbuildinfo',
  ],
  backend: [
    'backend/node_modules',
    'backend/dist',
    'backend/generated',
    'backend/coverage',
    'backend/.cache',
    'backend/.eslintcache',
    'backend/tsconfig.tsbuildinfo',
    'backend/tsconfig.build.tsbuildinfo',
  ],
  frontend: [
    'frontend/node_modules',
    'frontend/dist',
    'frontend/.angular',
    'frontend/coverage',
    'frontend/.cache',
    'frontend/.vite',
    'frontend/.eslintcache',
    'frontend/tsconfig.tsbuildinfo',
    'frontend/tsconfig.app.tsbuildinfo',
    'frontend/tsconfig.spec.tsbuildinfo',
    'frontend/tsconfig.portal.app.tsbuildinfo',
    'frontend/tsconfig.portal.spec.tsbuildinfo',
  ],
};

const aliases = {
  all: ['root', 'backend', 'frontend'],
  root: ['root'],
  backend: ['backend'],
  frontend: ['frontend'],
};

const options = parseArgs(process.argv.slice(2), { booleanFlags: ['dry-run'] });
const dryRun = Boolean(options['dry-run']);
const requestedTargets = options._;
const selectedTargets = requestedTargets.length === 0 ? ['all'] : requestedTargets;
const selectedGroups = new Set();

for (const target of selectedTargets) {
  const groups = aliases[target];

  if (!groups) {
    console.error(`Unknown clean target: ${target}`);
    console.error(
      'Usage: npm run clean [-- --dry-run] | npm run clean:backend | npm run clean:frontend',
    );
    process.exitCode = 1;
    continue;
  }

  for (const group of groups) {
    selectedGroups.add(group);
  }
}

if (process.exitCode) {
  process.exit();
}

const paths = [...new Set([...selectedGroups].flatMap((group) => targetGroups[group]))];

for (const path of paths) {
  const absolutePath = resolve(workspaceRoot, path);
  const displayPath = relative(workspaceRoot, absolutePath) || '.';

  if (dryRun) {
    console.log(`would remove ${displayPath}`);
    continue;
  }

  await rm(absolutePath, { recursive: true, force: true });
  console.log(`removed ${displayPath}`);
}
