#!/usr/bin/env node

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_ROOT = process.cwd();

const APP_SCHEMAS = [
  'public',
  'hr',
  'payroll',
  'payroll_calc',
  'portal',
  'payment',
  'fiscal',
  'saude',
  'ponto',
  'recrutamento',
  'tce',
  'public_data',
  'avaliacao',
];

const APP_ROLE = 'sgp_app_role';
const PORTAL_ROLE = 'sgp_portal_api';

const REQUIRED_AUDIT_REVOKES = [
  ['public.audit_event', ['UPDATE', 'DELETE']],
  ['hr.employee_status_history', ['UPDATE', 'DELETE']],
  ['ponto.time_record_identity', ['UPDATE', 'DELETE']],
];

export function checkGrantsAlignment(rootDir = DEFAULT_ROOT) {
  const statements = parseGrantFiles(rootDir);
  const expected = buildExpectedGrantKeys();
  const actual = new Map();

  for (const statement of statements) {
    for (const key of statementKeys(statement)) {
      actual.set(key, statement);
    }
  }

  const violations = [];

  for (const [key, statement] of actual.entries()) {
    if (!expected.has(key)) {
      violations.push(`unexpected ${describeKey(key)} at ${statement.source}`);
    }
  }

  for (const key of [...expected].sort((a, b) => a.localeCompare(b))) {
    if (!actual.has(key)) {
      violations.push(`missing ${describeKey(key)}`);
    }
  }

  return {
    ok: violations.length === 0,
    grantCount: statements.filter((statement) => statement.action === 'GRANT').length,
    revokeCount: statements.filter((statement) => statement.action === 'REVOKE').length,
    baselineCount: expected.size,
    violations: violations.sort((a, b) => a.localeCompare(b)),
  };
}

function parseGrantFiles(rootDir) {
  const sqlDir = resolve(rootDir, 'database/sql');
  const files = readdirSync(sqlDir)
    .filter((name) => /^9[01].*grant.*\.sql$/i.test(name))
    .sort((a, b) => a.localeCompare(b));

  return files.flatMap((file) => {
    const path = resolve(sqlDir, file);
    return parseGrantStatements(readFileSync(path, 'utf8'), `database/sql/${file}`);
  });
}

export function parseGrantStatements(content, fileLabel = '<memory>') {
  const statements = [];

  for (const statement of sqlStatements(content)) {
    const match = statement.text.match(
      /\b(GRANT|REVOKE)\s+([\s\S]*?)\s+ON\s+([\s\S]*?)\s+(TO|FROM)\s+([a-z_][a-z0-9_]*)\s*$/i,
    );
    if (!match) continue;

    const [, action, privileges, objectSpec, direction, role] = match;
    const object = normalizeObjectSpec(objectSpec);
    const line = lineNumber(content, statement.index + (match.index ?? 0));
    statements.push({
      action: action.toUpperCase(),
      privileges: normalizePrivileges(privileges),
      objectKind: object.kind,
      objects: object.names,
      direction: direction.toUpperCase(),
      role: role.toLowerCase(),
      source: `${fileLabel}:${line}`,
    });
  }

  return statements;
}

function sqlStatements(content) {
  const statements = [];
  let start = 0;

  for (let index = 0; index < content.length; index += 1) {
    if (content[index] !== ';') continue;
    const text = content.slice(start, index).trim();
    if (/\b(GRANT|REVOKE)\b/i.test(text)) {
      statements.push({ text, index: start + content.slice(start, index).search(/\S/) });
    }
    start = index + 1;
  }

  return statements;
}

function statementKeys(statement) {
  if (!isDirectionValid(statement)) {
    return [`INVALID|${statement.role}|${statement.action}|${statement.direction}`];
  }

  return statement.objects.flatMap((object) =>
    statement.privileges.map((privilege) =>
      grantKey(statement.action, statement.role, statement.objectKind, object, privilege),
    ),
  );
}

function isDirectionValid(statement) {
  return (
    (statement.action === 'GRANT' && statement.direction === 'TO') ||
    (statement.action === 'REVOKE' && statement.direction === 'FROM')
  );
}

function buildExpectedGrantKeys() {
  const expected = new Set();

  for (const schema of APP_SCHEMAS) {
    expected.add(grantKey('GRANT', APP_ROLE, 'SCHEMA', schema, 'USAGE'));
    for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
      expected.add(grantKey('GRANT', APP_ROLE, 'ALL_TABLES_IN_SCHEMA', schema, privilege));
    }
    for (const privilege of ['USAGE', 'SELECT', 'UPDATE']) {
      expected.add(grantKey('GRANT', APP_ROLE, 'ALL_SEQUENCES_IN_SCHEMA', schema, privilege));
    }
    expected.add(grantKey('GRANT', APP_ROLE, 'ALL_FUNCTIONS_IN_SCHEMA', schema, 'EXECUTE'));
  }

  for (const [table, privileges] of REQUIRED_AUDIT_REVOKES) {
    for (const privilege of privileges) {
      expected.add(grantKey('REVOKE', APP_ROLE, 'TABLE', table, privilege));
    }
  }

  expected.add(grantKey('GRANT', PORTAL_ROLE, 'SCHEMA', 'portal', 'USAGE'));
  expected.add(grantKey('GRANT', PORTAL_ROLE, 'ALL_TABLES_IN_SCHEMA', 'portal', 'SELECT'));
  for (const schema of ['hr', 'payroll']) {
    expected.add(grantKey('REVOKE', PORTAL_ROLE, 'SCHEMA', schema, 'ALL'));
    expected.add(grantKey('REVOKE', PORTAL_ROLE, 'ALL_TABLES_IN_SCHEMA', schema, 'ALL'));
  }

  return expected;
}

function grantKey(action, role, objectKind, object, privilege) {
  return [action, role.toLowerCase(), objectKind, object.toLowerCase(), privilege].join('|');
}

function describeKey(key) {
  const [action, role, objectKind, object, privilege] = key.split('|');
  if (action === 'INVALID') {
    return `invalid grant direction for ${role}`;
  }

  const direction = action === 'GRANT' ? 'to' : 'from';
  return `${action.toLowerCase()} ${privilege} on ${objectKind.toLowerCase()} ${object} ${direction} ${role}`;
}

function normalizePrivileges(value) {
  return value
    .split(',')
    .map((part) => part.trim().replace(/\s+/g, ' ').toUpperCase())
    .map((part) => (part === 'ALL PRIVILEGES' ? 'ALL' : part))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function normalizeObjectSpec(value) {
  const normalized = value.trim().replace(/\s+/g, ' ');
  const upper = normalized.toUpperCase();
  const prefixes = [
    ['ALL TABLES IN SCHEMA ', 'ALL_TABLES_IN_SCHEMA'],
    ['ALL SEQUENCES IN SCHEMA ', 'ALL_SEQUENCES_IN_SCHEMA'],
    ['ALL FUNCTIONS IN SCHEMA ', 'ALL_FUNCTIONS_IN_SCHEMA'],
    ['SCHEMA ', 'SCHEMA'],
    ['TABLE ', 'TABLE'],
  ];

  for (const [prefix, kind] of prefixes) {
    if (upper.startsWith(prefix)) {
      return {
        kind,
        names: normalizeObjectNames(normalized.slice(prefix.length)),
      };
    }
  }

  return {
    kind: 'TABLE',
    names: normalizeObjectNames(normalized),
  };
}

function normalizeObjectNames(value) {
  return value
    .split(',')
    .map((part) => part.trim().replace(/\s+/g, ' ').toLowerCase())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function lineNumber(content, index) {
  return content.slice(0, index).split('\n').length;
}

function main() {
  const result = checkGrantsAlignment();
  if (result.ok) {
    console.log(
      `[grants-alignment] OK ${result.grantCount} GRANT and ${result.revokeCount} REVOKE statements match ${result.baselineCount} baseline entries`,
    );
    return;
  }

  for (const violation of result.violations) {
    console.error(`[grants-alignment] ${violation}`);
  }
  process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
