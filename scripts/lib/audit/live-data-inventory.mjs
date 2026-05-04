#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

import { createContext, writeText } from '../audit-utils.mjs';

const usage = `
Usage: node scripts/audit.mjs live-data [--round <n>] [--output <path>] [--dry-run]

Generate the live PostgreSQL data inventory scratch report.
`;

const { dryRun, options, repoRoot, round } = await createContext(process.argv.slice(2), usage);
const databaseUrl =
  process.env.DATABASE_URL ?? `postgresql://${process.env.USER}@localhost:5432/sgp_test`;
const outputPath = resolve(
  repoRoot,
  String(
    options.output ?? options['output-path'] ?? `docs/work/round-${round}/live-data-inventory.md`,
  ),
);

function queryJson(sql) {
  const wrapped = `
    SELECT COALESCE(jsonb_agg(to_jsonb(inventory_row)), '[]'::jsonb)::text
    FROM (
      ${sql}
    ) AS inventory_row
  `;
  const output = execFileSync('psql', [databaseUrl, '-X', '-At', '-c', wrapped], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  return JSON.parse(output || '[]');
}

function markdownTable(rows, columns) {
  if (rows.length === 0) return '_None found._\n';
  const header = `| ${columns.map((column) => column.label).join(' |')} |`;
  const separator = `| ${columns.map(() => '---').join(' |')} |`;
  const body = rows.map(
    (row) =>
      `| ${columns
        .map((column) => String(row[column.key] ?? '').replace(/\|/g, '\\|'))
        .join(' |')} |`,
  );
  return `${[header, separator, ...body].join('\n')}\n`;
}

const piiColumns = queryJson(`
  SELECT
    column_ref,
    data_type,
    pii_comment,
    CASE
      WHEN pii_comment LIKE '%classification=national_identifier%' THEN 'high'
      WHEN pii_comment LIKE '%classification=banking%' THEN 'high'
      WHEN pii_comment LIKE '%classification=tax_identifier%' THEN 'high'
      WHEN pii_comment LIKE '%classification=medical%' THEN 'high'
      WHEN pii_comment LIKE '%classification=contact%' THEN 'medium'
      ELSE 'standard'
    END AS encryption_priority,
    has_cipher_column
  FROM (
    SELECT
      format('%I.%I.%I', columns.table_schema, columns.table_name, columns.column_name) AS column_ref,
      columns.data_type,
      description.description AS pii_comment,
      EXISTS (
        SELECT 1
        FROM information_schema.columns cipher
        WHERE cipher.table_schema = columns.table_schema
          AND cipher.table_name = columns.table_name
          AND (
            cipher.column_name = columns.column_name || '_cipher'
            OR cipher.column_name = regexp_replace(columns.column_name, '(_number|_account|_pasep|_cpf)$', '') || '_cipher'
          )
      ) AS has_cipher_column
    FROM information_schema.columns columns
    JOIN pg_namespace namespace
      ON namespace.nspname = columns.table_schema
    JOIN pg_class class
      ON class.relnamespace = namespace.oid
     AND class.relname = columns.table_name
    JOIN pg_attribute attribute
      ON attribute.attrelid = class.oid
     AND attribute.attname = columns.column_name
    JOIN pg_description description
      ON description.objoid = class.oid
     AND description.objsubid = attribute.attnum
    WHERE description.description LIKE 'pii=true;%'
  ) pii
  ORDER BY encryption_priority, column_ref
`);

const encryptionCandidates = piiColumns.filter(
  (row) => !row.has_cipher_column && row.encryption_priority !== 'standard',
);

const auditColumnGaps = queryJson(`
  SELECT
    table_ref,
    has_created_at,
    has_updated_at,
    has_status,
    has_audit_trigger
  FROM (
    SELECT
      format('%I.%I', columns.table_schema, columns.table_name) AS table_ref,
      bool_or(columns.column_name = 'created_at') AS has_created_at,
      bool_or(columns.column_name = 'updated_at') AS has_updated_at,
      bool_or(columns.column_name IN ('status', 'pool_status')) AS has_status,
      EXISTS (
        SELECT 1
        FROM pg_namespace trigger_namespace
        JOIN pg_class trigger_class
          ON trigger_class.relnamespace = trigger_namespace.oid
        JOIN pg_trigger trg
          ON trg.tgrelid = trigger_class.oid
        WHERE trigger_namespace.nspname = columns.table_schema
          AND trigger_class.relname = columns.table_name
          AND NOT trg.tgisinternal
          AND trg.tgname ILIKE '%audit%'
      ) AS has_audit_trigger
    FROM information_schema.columns columns
    JOIN information_schema.tables tables
      ON tables.table_schema = columns.table_schema
     AND tables.table_name = columns.table_name
    WHERE tables.table_type = 'BASE TABLE'
      AND columns.table_schema NOT IN ('information_schema')
      AND columns.table_schema NOT LIKE 'pg_%'
    GROUP BY columns.table_schema, columns.table_name
  ) table_flags
  WHERE NOT has_created_at OR NOT has_updated_at OR NOT has_audit_trigger
  ORDER BY table_ref
`);

const inferredForeignKeys = queryJson(`
  SELECT
    format('%I.%I', namespace.nspname, class.relname) AS table_ref,
    constr.conname AS constraint_name,
    constr.convalidated AS validated,
    pg_get_constraintdef(constr.oid) AS definition
  FROM pg_constraint constr
  JOIN pg_class class
    ON class.oid = constr.conrelid
  JOIN pg_namespace namespace
    ON namespace.oid = class.relnamespace
  WHERE constr.contype = 'f'
    AND NOT constr.convalidated
  ORDER BY table_ref, constraint_name
`);

const arrayChecks = queryJson(`
  SELECT
    format('%I.%I', namespace.nspname, class.relname) AS table_ref,
    constr.conname AS constraint_name,
    pg_get_constraintdef(constr.oid) AS definition
  FROM pg_constraint constr
  JOIN pg_class class
    ON class.oid = constr.conrelid
  JOIN pg_namespace namespace
    ON namespace.oid = class.relnamespace
  WHERE constr.contype = 'c'
    AND pg_get_constraintdef(constr.oid) ILIKE '%ANY (ARRAY%'
  ORDER BY table_ref, constraint_name
`);

const softDeleteCoverage = queryJson(`
  SELECT
    table_ref,
    has_status,
    has_pool_status,
    has_deleted_at,
    has_archived_at
  FROM (
    SELECT
      format('%I.%I', columns.table_schema, columns.table_name) AS table_ref,
      bool_or(columns.column_name = 'status') AS has_status,
      bool_or(columns.column_name = 'pool_status') AS has_pool_status,
      bool_or(columns.column_name = 'deleted_at') AS has_deleted_at,
      bool_or(columns.column_name = 'archived_at') AS has_archived_at
    FROM information_schema.columns columns
    JOIN information_schema.tables tables
      ON tables.table_schema = columns.table_schema
     AND tables.table_name = columns.table_name
    WHERE tables.table_type = 'BASE TABLE'
      AND columns.table_schema NOT IN ('information_schema')
      AND columns.table_schema NOT LIKE 'pg_%'
    GROUP BY columns.table_schema, columns.table_name
  ) table_flags
  WHERE has_status OR has_pool_status OR has_deleted_at OR has_archived_at
  ORDER BY table_ref
`);

const generatedAt = execFileSync('date', ['-u', '+%Y-%m-%dT%H:%M:%SZ'], {
  encoding: 'utf8',
}).trim();

const content = `# Round 3 Live Data Inventory

Status: scratch inventory, not acceptance authority
Generated at: ${generatedAt}
Database: ${databaseUrl.replace(/:[^:@/]+@/, ':***@')}

This artifact is generated from the live PostgreSQL catalog for R3-034. Use it
as implementation planning evidence only; authoritative scope stays in
\`docs/eng\`.

## Summary

| Area | Count |
| --- | ---: |
| PII tagged columns | ${piiColumns.length} |
| Candidate encryption columns | ${encryptionCandidates.length} |
| Audit-column or audit-trigger gaps | ${auditColumnGaps.length} |
| Inferred/NOT VALID foreign keys | ${inferredForeignKeys.length} |
| CHECK constraints using ANY ARRAY | ${arrayChecks.length} |
| Tables with soft-delete/status signals | ${softDeleteCoverage.length} |

## Candidate Encryption Columns

These columns are PII-tagged, priority \`high\` or \`medium\`, and do not have a
detected sibling cipher column in the same table.

${markdownTable(encryptionCandidates, [
  { key: 'column_ref', label: 'Column' },
  { key: 'data_type', label: 'Type' },
  { key: 'encryption_priority', label: 'Priority' },
  { key: 'pii_comment', label: 'PII tag' },
])}

## PII Column Catalog

${markdownTable(piiColumns, [
  { key: 'column_ref', label: 'Column' },
  { key: 'data_type', label: 'Type' },
  { key: 'encryption_priority', label: 'Priority' },
  { key: 'has_cipher_column', label: 'Has cipher' },
])}

## Audit-Column And Audit-Trigger Gaps

${markdownTable(auditColumnGaps, [
  { key: 'table_ref', label: 'Table' },
  { key: 'has_created_at', label: 'created_at' },
  { key: 'has_updated_at', label: 'updated_at' },
  { key: 'has_status', label: 'status' },
  { key: 'has_audit_trigger', label: 'audit trigger' },
])}

## Inferred Foreign-Key Status

${markdownTable(inferredForeignKeys, [
  { key: 'table_ref', label: 'Table' },
  { key: 'constraint_name', label: 'Constraint' },
  { key: 'validated', label: 'Validated' },
  { key: 'definition', label: 'Definition' },
])}

## CHECK ANY ARRAY Cases

${markdownTable(arrayChecks, [
  { key: 'table_ref', label: 'Table' },
  { key: 'constraint_name', label: 'Constraint' },
  { key: 'definition', label: 'Definition' },
])}

## Soft-Delete And Status Signals

${markdownTable(softDeleteCoverage, [
  { key: 'table_ref', label: 'Table' },
  { key: 'has_status', label: 'status' },
  { key: 'has_pool_status', label: 'pool_status' },
  { key: 'has_deleted_at', label: 'deleted_at' },
  { key: 'has_archived_at', label: 'archived_at' },
])}
`;

await writeText(outputPath, content, { dryRun, repoRoot });

console.log(
  JSON.stringify(
    {
      ok: true,
      dryRun,
      outputPath: outputPath.replace(`${repoRoot}/`, ''),
      counts: {
        piiColumns: piiColumns.length,
        encryptionCandidates: encryptionCandidates.length,
        auditColumnGaps: auditColumnGaps.length,
        inferredForeignKeys: inferredForeignKeys.length,
        arrayChecks: arrayChecks.length,
        softDeleteCoverage: softDeleteCoverage.length,
      },
      sampleEncryptionCandidates: encryptionCandidates.slice(0, 10).map((row) => row.column_ref),
    },
    null,
    2,
  ),
);
