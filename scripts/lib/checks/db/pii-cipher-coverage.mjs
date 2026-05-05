#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HIGH_RISK_CLASSIFICATIONS = new Set([
  'banking',
  'contact',
  'national_identifier',
  'social_program_identifier',
  'tax_identifier',
]);

const DEFAULT_ROOT = process.cwd();

export function checkPiiCipherCoverage(rootDir = DEFAULT_ROOT) {
  const comments = parsePiiComments(
    readFileSync(resolve(rootDir, 'database/sql/13-pii-comments.sql'), 'utf8'),
  );
  const cipherColumns = parseCipherColumns(
    readFileSync(resolve(rootDir, 'database/sql/15-pii-encryption.sql'), 'utf8'),
  );
  const highRisk = comments.filter((entry) => HIGH_RISK_CLASSIFICATIONS.has(entry.classification));
  const violations = highRisk.flatMap((entry) => {
    const key = `${entry.schema}.${entry.table}`;
    const columns = cipherColumns.get(key) ?? new Set();
    const requiredCipher = `${entry.column}_cipher`;
    const requiredKey = `${entry.column}_cipher_key_id`;
    const missing = [];
    if (!columns.has(requiredCipher)) missing.push(requiredCipher);
    if (!columns.has(requiredKey)) missing.push(requiredKey);
    return missing.length
      ? [`${entry.schema}.${entry.table}.${entry.column} missing ${missing.join(', ')}`]
      : [];
  });

  return {
    ok: violations.length === 0,
    highRiskCount: highRisk.length,
    classifications: [...HIGH_RISK_CLASSIFICATIONS].sort(),
    violations,
  };
}

function parsePiiComments(content) {
  const entries = [];
  const pattern =
    /COMMENT\s+ON\s+COLUMN\s+([a-z_][a-z0-9_]*)\.([a-z_][a-z0-9_]*)\.([a-z_][a-z0-9_]*)\s+IS\s+'([^']*)';/gi;

  for (const match of content.matchAll(pattern)) {
    const [, schema, table, column, comment] = match;
    if (!comment.includes('pii=true')) continue;
    const classification = comment.match(/(?:^|;)classification=([^;]+)/)?.[1];
    if (!classification) continue;
    entries.push({ schema, table, column, classification });
  }

  return entries;
}

function parseCipherColumns(content) {
  const tables = new Map();
  const alterPattern = /ALTER\s+TABLE\s+([a-z_][a-z0-9_]*)\.([a-z_][a-z0-9_]*)\s+([\s\S]*?);/gi;

  for (const alter of content.matchAll(alterPattern)) {
    const [, schema, table, body] = alter;
    const key = `${schema}.${table}`;
    const columns = tables.get(key) ?? new Set();
    for (const column of body.matchAll(/\bADD\s+COLUMN\s+([a-z_][a-z0-9_]*)\b/gi)) {
      columns.add(column[1]);
    }
    tables.set(key, columns);
  }

  return tables;
}

function main() {
  const result = checkPiiCipherCoverage();
  if (result.ok) {
    console.log(`[pii-cipher-coverage] OK ${result.highRiskCount} high-risk PII columns`);
    return;
  }

  for (const violation of result.violations) {
    console.error(`[pii-cipher-coverage] ${violation}`);
  }
  process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
