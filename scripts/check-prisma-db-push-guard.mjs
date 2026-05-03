#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import process from 'node:process';

const forbiddenCommand = ['prisma', 'db', 'push', '--force-reset'].join(' ');
const gitMaxBufferBytes = 64 * 1024 * 1024;

function runGit(args, options = {}) {
  const result = spawnSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
    maxBuffer: gitMaxBufferBytes,
  });

  return result;
}

function parseOption(name) {
  const prefix = `--${name}=`;
  const explicit = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  if (explicit) {
    return explicit.slice(prefix.length);
  }

  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasCommit(ref) {
  return runGit(['rev-parse', '--verify', '--quiet', ref]).status === 0;
}

function resolveDiffRange() {
  const explicitRange = parseOption('range');
  if (explicitRange) {
    return explicitRange;
  }

  const baseRef = process.env.GITHUB_BASE_REF;
  if (baseRef) {
    runGit(['fetch', '--no-tags', '--depth=1', 'origin', baseRef], { stdio: 'inherit' });
    return `origin/${baseRef}...HEAD`;
  }

  if (hasCommit('HEAD^')) {
    return 'HEAD^...HEAD';
  }

  const emptyTree = runGit(['hash-object', '-t', 'tree', '/dev/null']);
  if (emptyTree.status === 0) {
    return `${emptyTree.stdout.trim()}...HEAD`;
  }

  throw new Error('Unable to resolve a git diff range for the Prisma DB push guard.');
}

function collectAddedLineFindings(diffText) {
  const findings = [];
  let currentFile = '(unknown)';

  for (const line of diffText.split('\n')) {
    if (line.startsWith('+++ b/')) {
      currentFile = line.slice('+++ b/'.length);
      continue;
    }

    if (!line.startsWith('+') || line.startsWith('+++')) {
      continue;
    }

    if (line.includes(forbiddenCommand)) {
      findings.push({ file: currentFile, line: line.slice(1) });
    }
  }

  return findings;
}

function main() {
  const range = resolveDiffRange();
  const diff = runGit([
    'diff',
    '--unified=0',
    '--no-ext-diff',
    '--diff-filter=ACMRTUXB',
    range,
    '--',
    '.',
  ]);

  if (diff.status !== 0) {
    throw new Error(diff.stderr.trim() || `git diff failed with exit code ${diff.status ?? 1}`);
  }

  const findings = collectAddedLineFindings(diff.stdout);
  if (findings.length === 0) {
    console.log(`[db-push-guard] OK ${range}`);
    return;
  }

  for (const finding of findings) {
    console.error(
      `::error file=${finding.file},title=Forbidden Prisma force reset::${finding.line}`,
    );
    console.error(`[db-push-guard] forbidden command added in ${finding.file}`);
  }

  process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(`[db-push-guard] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
