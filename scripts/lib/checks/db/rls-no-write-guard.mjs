#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_ROOT = process.cwd();
const ALLOW_MARKER = 'rls-allow-write:';
const WRITE_PATTERN =
  /\b(?<operation>INSERT\s+INTO|UPDATE|DELETE\s+FROM|MERGE\s+INTO|UPSERT\s+INTO)\s+(?:ONLY\s+)?(?<table>[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*)\b/giu;

export function checkRlsNoWriteGuard(rootDir = DEFAULT_ROOT) {
  const root = resolve(rootDir);
  const rlsNoTables = findRlsNoTables(root);
  const rlsNoTableSet = new Set(rlsNoTables);
  const files = listScanFiles(root);
  const violations = [];

  for (const file of files) {
    const relativePath = toRepoPath(root, file);
    const content = readFileSync(file, 'utf8');
    for (const write of findWrites(content)) {
      if (!rlsNoTableSet.has(write.table)) continue;
      if (hasAllowMarker(content, write.index)) continue;
      if (isReferenceDataBootstrapWrite(relativePath, content, write)) continue;

      violations.push({
        file: relativePath,
        line: lineNumber(content, write.index),
        operation: write.operation,
        table: write.table,
      });
    }
  }

  return {
    ok: violations.length === 0,
    scannedFiles: files.length,
    rlsNoTables,
    violations,
  };
}

export function findRlsNoTables(rootDir = DEFAULT_ROOT) {
  const digestPath = resolve(rootDir, 'docs/gov/audit/schema-digest.md');
  if (existsSync(digestPath)) {
    const fromDigest = parseRlsNoTablesFromDigest(readFileSync(digestPath, 'utf8'));
    if (fromDigest.length > 0) return fromDigest;
  }

  return parseRlsNoTablesFromSql(rootDir);
}

export function parseRlsNoTablesFromDigest(content) {
  const tables = [];
  for (const line of content.split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 6 || cells[0] === 'Table' || cells[4] !== 'no') continue;
    if (/^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/i.test(cells[0])) {
      tables.push(cells[0].toLowerCase());
    }
  }
  return uniqueSorted(tables);
}

export function parseRlsNoTablesFromSql(rootDir = DEFAULT_ROOT) {
  const sqlDir = resolve(rootDir, 'database/sql');
  if (!existsSync(sqlDir)) return [];

  const sql = listFiles(sqlDir, (path) => extname(path) === '.sql')
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
  const createdTables = [];
  const enabledTables = new Set();
  const createPattern =
    /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?<table>[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*)\b/giu;
  const enablePattern =
    /\bALTER\s+TABLE\s+(?:ONLY\s+)?(?<table>[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY\b/giu;

  for (const match of sql.matchAll(createPattern)) {
    createdTables.push(match.groups.table.toLowerCase());
  }
  for (const match of sql.matchAll(enablePattern)) {
    enabledTables.add(match.groups.table.toLowerCase());
  }

  return uniqueSorted(createdTables.filter((table) => !enabledTables.has(table)));
}

export function findWrites(content) {
  const writes = [];
  for (const match of content.matchAll(WRITE_PATTERN)) {
    writes.push({
      index: match.index ?? 0,
      operation: match.groups.operation.replace(/\s+/g, ' ').toUpperCase(),
      table: match.groups.table.toLowerCase(),
    });
  }
  return writes;
}

function listScanFiles(root) {
  return [
    ...listFiles(resolve(root, 'backend/src'), (path) => {
      if (!path.endsWith('.ts')) return false;
      if (path.endsWith('.spec.ts')) return false;
      return !path.split(sep).includes('__fixtures__');
    }),
    ...listFiles(resolve(root, 'database/sql'), (path) => path.endsWith('.sql')),
  ].sort((a, b) => a.localeCompare(b));
}

function listFiles(dir, predicate) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(path, predicate);
    if (!entry.isFile()) return [];
    return predicate(path) ? [path] : [];
  });
}

function hasAllowMarker(content, index) {
  let windowStart = content.lastIndexOf('\n', index) + 1;
  for (let line = 0; line < 6; line += 1) {
    const previousBreak = content.lastIndexOf('\n', Math.max(0, windowStart - 2));
    if (previousBreak === -1) {
      windowStart = 0;
      break;
    }
    windowStart = previousBreak + 1;
  }
  const nextLineEnd = content.indexOf('\n', index);
  const windowEnd = nextLineEnd === -1 ? content.length : nextLineEnd;
  const localWindow = content.slice(windowStart, windowEnd);
  return localWindow.includes(ALLOW_MARKER);
}

function isReferenceDataBootstrapWrite(relativePath, content, write) {
  if (!relativePath.startsWith('database/sql/')) return false;
  if (relativePath === 'database/sql/91-reference-data.sql') return true;

  const beforeWrite = content.slice(0, write.index);
  const createTablePattern = new RegExp(
    `\\bCREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${escapeRegExp(write.table)}\\b`,
    'iu',
  );
  return createTablePattern.test(beforeWrite);
}

function lineNumber(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

function toRepoPath(root, file) {
  return relative(root, file).split(sep).join('/');
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function main() {
  const result = checkRlsNoWriteGuard();
  const tableSummary = result.rlsNoTables.join(', ') || '<none>';
  if (result.ok) {
    console.log(
      `[rls-no-write-guard] OK tables=${result.rlsNoTables.length} files=${result.scannedFiles} (${tableSummary})`,
    );
    return;
  }

  console.error(
    `[rls-no-write-guard] found ${result.violations.length} write(s) to RLS=no tables (${tableSummary})`,
  );
  for (const violation of result.violations) {
    console.error(
      `[rls-no-write-guard] ${violation.file}:${violation.line} ${violation.operation} ${violation.table}`,
    );
  }
  process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
