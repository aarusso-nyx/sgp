#!/usr/bin/env node

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const cwd = process.cwd();
const sqlDir = resolve(cwd, 'database/sql');
const indexSqlPath = resolve(sqlDir, '14-fk-indexes.sql');
const missingFkSqlPath = resolve(sqlDir, '15-missing-fks.sql');
const orphanCheckPath = resolve(sqlDir, 'checks/fk-orphan-sanity.sql');
const argv = new Set(process.argv.slice(2));
const writeMode = argv.has('--write');
const asJson = argv.has('--json');
const minCoverage = 0.95;

const ignoredSqlFiles = new Set([
  '14-fk-indexes.sql',
  '15-missing-fks.sql',
  'checks/fk-orphan-sanity.sql',
]);

const schemaAllowList = new Set([
  'avaliacao',
  'esocial',
  'fiscal',
  'hr',
  'lgpd',
  'payment',
  'payroll',
  'payroll_calc',
  'ponto',
  'public',
  'public_data',
  'recrutamento',
  'saude',
  'tce',
]);

function listSqlFiles() {
  return readdirSync(sqlDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .filter((name) => !ignoredSqlFiles.has(name))
    .sort((a, b) => a.localeCompare(b));
}

function stripSqlComments(sql) {
  return sql.replace(/--.*$/gm, '');
}

function splitColumns(columns) {
  return columns
    .split(',')
    .map((column) =>
      column
        .trim()
        .replace(/\b(DESC|ASC|NULLS|FIRST|LAST)\b.*$/i, '')
        .trim(),
    )
    .filter(Boolean);
}

function constraintName(table, column, suffix) {
  return `${table}_${column}_${suffix}`.replaceAll(/[^a-z0-9_]/g, '_').slice(0, 63);
}

function indexName(schema, table, column) {
  return `idx_${schema}_${table}_${column}_fk`.replaceAll(/[^a-z0-9_]/g, '_').slice(0, 63);
}

function parseCatalog(sql) {
  const tables = new Map();
  const foreignKeys = [];
  const leadingIndexColumns = new Set();

  const tableRe =
    /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?([a-z_][\w]*)\.([a-z_][\w]*)\s*\(([\s\S]*?)\n\)(?:\s+PARTITION BY\s+[^;]+)?;/g;
  let match;
  while ((match = tableRe.exec(sql))) {
    const [, schema, table, body] = match;
    if (!schemaAllowList.has(schema)) continue;
    const columns = [];
    for (const rawLine of body.split('\n')) {
      const line = rawLine.trim();
      const columnMatch = line.match(/^([a-z_][\w]*)\s+([^,]+)/);
      if (!columnMatch) continue;
      const column = columnMatch[1];
      if (['CONSTRAINT', 'PRIMARY', 'UNIQUE', 'FOREIGN', 'CHECK'].includes(column.toUpperCase())) {
        continue;
      }
      columns.push(column);
    }
    tables.set(`${schema}.${table}`, { schema, table, columns, primaryKey: [] });
  }

  const keyConstraintRe =
    /ALTER TABLE(?: ONLY)?\s+([a-z_][\w]*)\.([a-z_][\w]*)\s+ADD CONSTRAINT\s+[a-z_][\w]*\s+(PRIMARY KEY|UNIQUE)\s*\(([^)]+)\)/g;
  while ((match = keyConstraintRe.exec(sql))) {
    const [, schema, table, kind, rawColumns] = match;
    const columns = splitColumns(rawColumns);
    if (columns.length === 0) continue;
    leadingIndexColumns.add(`${schema}.${table}.${columns[0]}`);
    if (kind === 'PRIMARY KEY') {
      const tableEntry = tables.get(`${schema}.${table}`);
      if (tableEntry) tableEntry.primaryKey = columns;
    }
  }

  const indexRe =
    /CREATE\s+(?:UNIQUE\s+)?INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+[a-z_][\w]*\s+ON\s+([a-z_][\w]*)\.([a-z_][\w]*)\s+(?:USING\s+\w+\s+)?\(([^)]+)\)/g;
  while ((match = indexRe.exec(sql))) {
    const [, schema, table, rawColumns] = match;
    const columns = splitColumns(rawColumns);
    if (columns.length > 0) leadingIndexColumns.add(`${schema}.${table}.${columns[0]}`);
  }

  const foreignKeyRe =
    /ALTER TABLE(?: ONLY)?\s+([a-z_][\w]*)\.([a-z_][\w]*)\s+ADD CONSTRAINT\s+([a-z_][\w]*)\s+FOREIGN KEY\s*\(([^)]+)\)\s+REFERENCES\s+([a-z_][\w]*)\.([a-z_][\w]*)\s*\(([^)]+)\)/g;
  while ((match = foreignKeyRe.exec(sql))) {
    const [, schema, table, name, rawColumns, targetSchema, targetTable, rawTargetColumns] = match;
    foreignKeys.push({
      schema,
      table,
      name,
      columns: splitColumns(rawColumns),
      targetSchema,
      targetTable,
      targetColumns: splitColumns(rawTargetColumns),
    });
  }

  return { tables, foreignKeys, leadingIndexColumns };
}

function inferMissingForeignKeys({ tables, foreignKeys }) {
  const declared = new Set();
  for (const foreignKey of foreignKeys) {
    for (const column of foreignKey.columns) {
      declared.add(`${foreignKey.schema}.${foreignKey.table}.${column}`);
    }
  }

  const candidates = [];
  for (const tableEntry of tables.values()) {
    for (const column of tableEntry.columns) {
      if (
        !column.endsWith('_id') ||
        column === 'tenant_id' ||
        tableEntry.primaryKey.includes(column) ||
        declared.has(`${tableEntry.schema}.${tableEntry.table}.${column}`)
      ) {
        continue;
      }

      const baseName = column.slice(0, -3);
      const matches = [...tables.values()].filter((candidate) => candidate.table === baseName);
      if (matches.length !== 1) continue;

      const target = matches[0];
      if (!target.primaryKey.includes('id')) continue;
      candidates.push({
        schema: tableEntry.schema,
        table: tableEntry.table,
        column,
        targetSchema: target.schema,
        targetTable: target.table,
        targetColumn: 'id',
      });
    }
  }

  return candidates.sort((a, b) =>
    `${a.schema}.${a.table}.${a.column}`.localeCompare(`${b.schema}.${b.table}.${b.column}`),
  );
}

function coverageFor({ foreignKeys, leadingIndexColumns }, extraForeignKeys = []) {
  const required = new Set();
  for (const foreignKey of foreignKeys) {
    for (const column of foreignKey.columns) {
      required.add(`${foreignKey.schema}.${foreignKey.table}.${column}`);
    }
  }
  for (const foreignKey of extraForeignKeys) {
    required.add(`${foreignKey.schema}.${foreignKey.table}.${foreignKey.column}`);
  }

  const covered = [...required].filter((columnKey) => leadingIndexColumns.has(columnKey));
  const missing = [...required].filter((columnKey) => !leadingIndexColumns.has(columnKey));
  return {
    required: required.size,
    covered: covered.length,
    missing,
    percent: required.size === 0 ? 1 : covered.length / required.size,
  };
}

function renderIndexSql(missingColumns) {
  const lines = [
    '-- Generated by scripts/check-db-fk-coverage.mjs --write.',
    '-- Leading-column indexes for declared and inferred foreign key columns.',
    '',
  ];
  for (const columnKey of missingColumns.sort((a, b) => a.localeCompare(b))) {
    const [schema, table, column] = columnKey.split('.');
    lines.push(
      `CREATE INDEX IF NOT EXISTS ${indexName(schema, table, column)} ON ${schema}.${table} (${column});`,
    );
  }
  lines.push('');
  return lines.join('\n');
}

function inferredForeignKeyDeleteClause(foreignKey) {
  const key = `${foreignKey.schema}.${foreignKey.table}.${foreignKey.column}->${foreignKey.targetSchema}.${foreignKey.targetTable}.${foreignKey.targetColumn}`;
  const deleteClauses = new Map([
    ['esocial.s2299_pending.employee_id->hr.employee.id', ' ON DELETE CASCADE'],
    ['esocial.s2299_pending.employment_link_id->hr.employment_link.id', ' ON DELETE CASCADE'],
    ['public.esocial_event.payroll_run_id->payroll.payroll_run.id', ' ON DELETE SET NULL'],
  ]);

  return deleteClauses.get(key) ?? '';
}

function renderMissingFkSql(missingForeignKeys) {
  const lines = [
    '-- Generated by scripts/check-db-fk-coverage.mjs --write.',
    '-- Conservative inferred foreign keys are NOT VALID until orphan reports are clean.',
    '',
  ];
  for (const foreignKey of missingForeignKeys) {
    const deleteClause = inferredForeignKeyDeleteClause(foreignKey);
    lines.push(
      `ALTER TABLE ONLY ${foreignKey.schema}.${foreignKey.table}`,
      `    ADD CONSTRAINT ${constraintName(foreignKey.table, foreignKey.column, 'inferred_fkey')}`,
      `    FOREIGN KEY (${foreignKey.column}) REFERENCES ${foreignKey.targetSchema}.${foreignKey.targetTable}(${foreignKey.targetColumn})${deleteClause} NOT VALID;`,
      '',
    );
  }
  return lines.join('\n');
}

function renderOrphanCheckSql(missingForeignKeys) {
  const lines = [
    '-- Generated by scripts/check-db-fk-coverage.mjs --write.',
    '-- Non-destructive orphan report for inferred foreign keys.',
    '',
  ];

  if (missingForeignKeys.length === 0) {
    lines.push("SELECT 'no inferred foreign keys' AS check_name, 0::bigint AS orphan_count;");
    return `${lines.join('\n')}\n`;
  }

  lines.push('WITH orphan_counts AS (');
  missingForeignKeys.forEach((foreignKey, index) => {
    const prefix = index === 0 ? '  ' : '  UNION ALL\n  ';
    lines.push(
      `${prefix}SELECT '${foreignKey.schema}.${foreignKey.table}.${foreignKey.column}' AS check_name, count(*)::bigint AS orphan_count`,
      `  FROM ${foreignKey.schema}.${foreignKey.table} child`,
      `  LEFT JOIN ${foreignKey.targetSchema}.${foreignKey.targetTable} parent ON parent.${foreignKey.targetColumn} = child.${foreignKey.column}`,
      `  WHERE child.${foreignKey.column} IS NOT NULL AND parent.${foreignKey.targetColumn} IS NULL`,
    );
  });
  lines.push(')', 'SELECT * FROM orphan_counts WHERE orphan_count > 0 ORDER BY check_name;');
  lines.push(
    '',
    'DO $$',
    'DECLARE',
    '  orphan_total bigint;',
    'BEGIN',
    '  WITH orphan_counts AS (',
  );
  missingForeignKeys.forEach((foreignKey, index) => {
    const prefix = index === 0 ? '    ' : '    UNION ALL\n    ';
    lines.push(
      `${prefix}SELECT count(*)::bigint AS orphan_count`,
      `    FROM ${foreignKey.schema}.${foreignKey.table} child`,
      `    LEFT JOIN ${foreignKey.targetSchema}.${foreignKey.targetTable} parent ON parent.${foreignKey.targetColumn} = child.${foreignKey.column}`,
      `    WHERE child.${foreignKey.column} IS NOT NULL AND parent.${foreignKey.targetColumn} IS NULL`,
    );
  });
  lines.push(
    '  )',
    '  SELECT coalesce(sum(orphan_count), 0) INTO orphan_total FROM orphan_counts;',
    '',
    '  IF orphan_total > 0 THEN',
    "    RAISE EXCEPTION 'Inferred FK orphan rows detected: %', orphan_total;",
    '  END IF;',
    'END',
    '$$;',
    '',
  );
  return lines.join('\n');
}

function main() {
  const baseSql = stripSqlComments(
    listSqlFiles()
      .map((file) => readFileSync(resolve(sqlDir, file), 'utf8'))
      .join('\n'),
  );
  const baseCatalog = parseCatalog(baseSql);
  const missingForeignKeys = inferMissingForeignKeys(baseCatalog);
  const baseCoverage = coverageFor(baseCatalog, missingForeignKeys);
  const generatedIndexSql = renderIndexSql(baseCoverage.missing);
  const generatedMissingFkSql = renderMissingFkSql(missingForeignKeys);
  const generatedOrphanCheckSql = renderOrphanCheckSql(missingForeignKeys);

  const generatedCatalog = parseCatalog(
    stripSqlComments(`${baseSql}\n${generatedIndexSql}\n${generatedMissingFkSql}`),
  );
  const finalCoverage = coverageFor(generatedCatalog);
  const fkCoverage = {
    declared: baseCatalog.foreignKeys.length,
    inferred: missingForeignKeys.length,
    final: generatedCatalog.foreignKeys.length,
    percent: generatedCatalog.foreignKeys.length / (generatedCatalog.foreignKeys.length || 1),
  };

  if (writeMode) {
    writeFileSync(indexSqlPath, generatedIndexSql);
    writeFileSync(missingFkSqlPath, generatedMissingFkSql);
    writeFileSync(orphanCheckPath, generatedOrphanCheckSql);
  } else {
    const currentIndexSql = readFileSync(indexSqlPath, 'utf8');
    const currentMissingFkSql = readFileSync(missingFkSqlPath, 'utf8');
    const currentOrphanCheckSql = readFileSync(orphanCheckPath, 'utf8');
    if (currentIndexSql !== generatedIndexSql) {
      throw new Error('database/sql/14-fk-indexes.sql is stale; run npm run db:fk-coverage:write');
    }
    if (currentMissingFkSql !== generatedMissingFkSql) {
      throw new Error('database/sql/15-missing-fks.sql is stale; run npm run db:fk-coverage:write');
    }
    if (currentOrphanCheckSql !== generatedOrphanCheckSql) {
      throw new Error(
        'database/sql/checks/fk-orphan-sanity.sql is stale; run npm run db:fk-coverage:write',
      );
    }
  }

  if (finalCoverage.percent < minCoverage) {
    throw new Error(
      `leading-column FK index coverage ${(finalCoverage.percent * 100).toFixed(2)}% is below 95%`,
    );
  }
  if (fkCoverage.percent < minCoverage) {
    throw new Error(
      `FK declaration coverage ${(fkCoverage.percent * 100).toFixed(2)}% is below 95%`,
    );
  }

  const result = {
    leadingColumnIndexCoverage: {
      required: finalCoverage.required,
      covered: finalCoverage.covered,
      missing: finalCoverage.missing.length,
      percent: Number((finalCoverage.percent * 100).toFixed(2)),
    },
    fkCoverage: {
      declared: fkCoverage.declared,
      inferred: fkCoverage.inferred,
      final: fkCoverage.final,
      percent: Number((fkCoverage.percent * 100).toFixed(2)),
    },
  };

  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(
      `Leading-column FK index coverage: ${result.leadingColumnIndexCoverage.covered}/${result.leadingColumnIndexCoverage.required} (${result.leadingColumnIndexCoverage.percent}%)`,
    );
    console.log(
      `FK coverage: ${result.fkCoverage.final}/${result.fkCoverage.final} (${result.fkCoverage.percent}%); inferred ${result.fkCoverage.inferred}`,
    );
  }
}

main();
