#!/usr/bin/env node

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_ROOT = process.cwd();

export function checkDefinerSearchPaths(rootDir = DEFAULT_ROOT) {
  const sqlDir = resolve(rootDir, 'database/sql');
  const files = readdirSync(sqlDir)
    .filter((name) => /^40-.*-functions\.sql$/.test(name))
    .sort((a, b) => a.localeCompare(b));
  const violations = [];
  let definerCount = 0;

  for (const file of files) {
    const path = resolve(sqlDir, file);
    const lines = readFileSync(path, 'utf8').split('\n');
    for (const [index, line] of lines.entries()) {
      if (!/\bSECURITY\s+DEFINER\b/i.test(line)) continue;
      definerCount += 1;
      const searchPath = findSearchPath(lines, index);
      if (!searchPath) {
        violations.push(`${relativeSqlPath(file, index)} missing SET search_path`);
        continue;
      }
      if (!/\bpg_catalog\b/i.test(searchPath) || !/\bpublic\b/i.test(searchPath)) {
        violations.push(
          `${relativeSqlPath(file, index)} search_path must include pg_catalog and public`,
        );
      }
    }
  }

  return {
    ok: violations.length === 0,
    definerCount,
    violations,
  };
}

function relativeSqlPath(file, index) {
  return `database/sql/${file}:${index + 1}`;
}

function findSearchPath(lines, securityDefinerIndex) {
  for (
    let cursor = securityDefinerIndex + 1;
    cursor < Math.min(lines.length, securityDefinerIndex + 12);
    cursor += 1
  ) {
    const candidate = lines[cursor].trim();
    if (!candidate || candidate.startsWith('--')) continue;
    if (/\bSET\s+search_path\b/i.test(candidate)) {
      return candidate;
    }
    if (/^\s*AS\s+(?:\$|'|")/i.test(candidate) || candidate.endsWith(';')) {
      return null;
    }
  }
  return null;
}

function main() {
  const result = checkDefinerSearchPaths();
  if (result.ok) {
    console.log(`[definer-search-path] OK ${result.definerCount} SECURITY DEFINER functions`);
    return;
  }

  for (const violation of result.violations) {
    console.error(`[definer-search-path] ${violation}`);
  }
  process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
