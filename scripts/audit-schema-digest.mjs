#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  createContext,
  exists,
  listFiles,
  markdownTable,
  normalizePath,
  repoRelative,
  writeJson,
  writeText,
} from './lib/audit-utils.mjs';

const usage = `
Usage: node scripts/audit-schema-digest.mjs [--round <n>] [--dry-run] [--output-root <path>] [--repo-root <path>]

Parse database/sql/**/*.sql and emit schema digest artifacts under docs/gov/audit.
`;

const context = await createContext(process.argv.slice(2), usage);
const result = await buildSchemaDigest(context.repoRoot, context.round);
await writeSchemaDigest(context, result);

export async function buildSchemaDigest(repoRoot, round) {
  const sqlRoot = join(repoRoot, 'database', 'sql');
  const sqlFiles = (await listFiles(sqlRoot, { ext: ['.sql'] })).filter(
    (file) => !normalizePath(file).includes('/replay/'),
  );
  const sqlTexts = await Promise.all(
    sqlFiles.map(async (file) => ({
      file,
      relativeFile: repoRelative(repoRoot, file),
      text: await readFile(file, 'utf8'),
    })),
  );
  const joined = sqlTexts
    .map((entry) => `\n-- file: ${entry.relativeFile}\n${entry.text}`)
    .join('\n');

  const tables = parseTables(sqlTexts);
  parseAlterConstraints(joined, tables);
  const indexes = parseIndexes(joined);
  const rls = parseRls(joined);
  const triggers = parseTriggers(joined);
  const classificationComments = parseClassificationComments(joined);
  const prismaPath = join(repoRoot, 'backend', 'prisma', 'schema.prisma');
  const prisma = (await exists(prismaPath))
    ? parsePrisma(await readFile(prismaPath, 'utf8'), repoRelative(repoRoot, prismaPath))
    : { present: false };

  return {
    generated_by: 'scripts/audit-schema-digest.mjs',
    round,
    source_files: sqlTexts.map((entry) => entry.relativeFile),
    counts: {
      classification_comments: classificationComments.length,
      foreign_keys: tables.reduce((sum, table) => sum + table.foreign_keys.length, 0),
      indexes: indexes.length,
      rls_policies: rls.policies.length,
      rls_tables: rls.enabled_tables.length,
      tables: tables.length,
      triggers: triggers.length,
    },
    tables,
    indexes,
    rls,
    triggers,
    classification_comments: classificationComments,
    prisma,
  };
}

function parseTables(sqlTexts) {
  const tables = [];
  for (const entry of sqlTexts) {
    const tableRegex =
      /create\s+table\s+(?:if\s+not\s+exists\s+)?(?<name>(?:"[^"]+"|\w+)(?:\.(?:"[^"]+"|\w+))?)\s*\((?<body>[\s\S]*?)\)\s*;/gi;
    for (const match of entry.text.matchAll(tableRegex)) {
      const name = cleanIdentifier(match.groups.name);
      const body = match.groups.body;
      const table = {
        name,
        file: entry.relativeFile,
        columns: [],
        primary_key: [],
        foreign_keys: [],
        unique_constraints: [],
      };
      for (const item of splitSqlList(body)) {
        parseTableItem(item, table);
      }
      table.columns.sort((a, b) => a.name.localeCompare(b.name));
      table.foreign_keys.sort((a, b) => a.columns.join(',').localeCompare(b.columns.join(',')));
      table.unique_constraints.sort((a, b) =>
        a.columns.join(',').localeCompare(b.columns.join(',')),
      );
      tables.push(table);
    }
  }
  return tables.sort((a, b) => a.name.localeCompare(b.name));
}

function parseTableItem(item, table) {
  const normalized = item.trim().replace(/\s+/g, ' ');
  if (!normalized) return;
  const lower = normalized.toLowerCase();

  const pkMatch = /primary\s+key\s*\((?<columns>[^)]+)\)/i.exec(normalized);
  if (pkMatch) {
    table.primary_key = splitColumns(pkMatch.groups.columns);
  }

  const uniqueMatch =
    /(?:constraint\s+(?<name>"[^"]+"|\w+)\s+)?unique\s*\((?<columns>[^)]+)\)/i.exec(normalized);
  if (uniqueMatch) {
    table.unique_constraints.push({
      name: cleanIdentifier(
        uniqueMatch.groups.name ?? `${table.name}_unique_${table.unique_constraints.length + 1}`,
      ),
      columns: splitColumns(uniqueMatch.groups.columns),
    });
  }

  const fkMatch =
    /(?:constraint\s+(?<name>"[^"]+"|\w+)\s+)?foreign\s+key\s*\((?<columns>[^)]+)\)\s+references\s+(?<target>(?:"[^"]+"|\w+)(?:\.(?:"[^"]+"|\w+))?)(?:\s*\((?<targetColumns>[^)]+)\))?/i.exec(
      normalized,
    );
  if (fkMatch) {
    table.foreign_keys.push({
      name: cleanIdentifier(
        fkMatch.groups.name ?? `${table.name}_fk_${table.foreign_keys.length + 1}`,
      ),
      columns: splitColumns(fkMatch.groups.columns),
      target: cleanIdentifier(fkMatch.groups.target),
      target_columns: splitColumns(fkMatch.groups.targetColumns ?? ''),
    });
  }

  if (
    lower.startsWith('constraint ') ||
    lower.startsWith('primary key') ||
    lower.startsWith('foreign key') ||
    lower.startsWith('unique ') ||
    lower.startsWith('check ')
  ) {
    return;
  }

  const columnMatch = /^(?<name>"[^"]+"|\w+)\s+(?<rest>.+)$/i.exec(normalized);
  if (!columnMatch) return;
  const rest = columnMatch.groups.rest;
  const type = rest
    .split(
      /\s+(?:collate|constraint|default|generated|not\s+null|null|primary\s+key|references|unique)\b/i,
    )[0]
    .trim();
  const defaultMatch =
    /\bdefault\s+(?<value>.*?)(?:\s+constraint\b|\s+not\s+null\b|\s+null\b|\s+references\b|\s+primary\s+key\b|$)/i.exec(
      rest,
    );
  const column = {
    name: cleanIdentifier(columnMatch.groups.name),
    type,
    nullable: !/\bnot\s+null\b/i.test(rest) && !/\bprimary\s+key\b/i.test(rest),
    default: defaultMatch?.groups.value?.trim() ?? null,
  };
  table.columns.push(column);

  if (/\bprimary\s+key\b/i.test(rest) && !table.primary_key.includes(column.name)) {
    table.primary_key.push(column.name);
  }
  const inlineReference =
    /\breferences\s+(?<target>(?:"[^"]+"|\w+)(?:\.(?:"[^"]+"|\w+))?)(?:\s*\((?<columns>[^)]+)\))?/i.exec(
      rest,
    );
  if (inlineReference) {
    table.foreign_keys.push({
      name: `${table.name}_${column.name}_fk`,
      columns: [column.name],
      target: cleanIdentifier(inlineReference.groups.target),
      target_columns: splitColumns(inlineReference.groups.columns ?? ''),
    });
  }
}

function parseIndexes(sql) {
  const indexes = [];
  const regex =
    /create\s+(?<unique>unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?(?<name>"[^"]+"|\w+)\s+on\s+(?<table>(?:"[^"]+"|\w+)(?:\.(?:"[^"]+"|\w+))?)\s*(?:using\s+(?<method>\w+)\s*)?\((?<columns>[^;]+?)\)\s*;/gi;
  for (const match of sql.matchAll(regex)) {
    indexes.push({
      name: cleanIdentifier(match.groups.name),
      table: cleanIdentifier(match.groups.table),
      unique: Boolean(match.groups.unique),
      method: match.groups.method ?? 'btree',
      columns: splitColumns(match.groups.columns),
    });
  }
  return indexes.sort((a, b) => a.name.localeCompare(b.name));
}

function parseAlterConstraints(sql, tables) {
  const byName = new Map(tables.map((table) => [table.name, table]));
  const regex =
    /alter\s+table\s+(?:only\s+)?(?<table>(?:"[^"]+"|\w+)(?:\.(?:"[^"]+"|\w+))?)\s+add\s+constraint\s+(?<name>"[^"]+"|\w+)\s+(?<constraint>[\s\S]*?);/gi;
  for (const match of sql.matchAll(regex)) {
    const tableName = cleanIdentifier(match.groups.table);
    const table = byName.get(tableName);
    if (!table) continue;
    const constraint = match.groups.constraint.trim().replace(/\s+/g, ' ');
    const pkMatch = /primary\s+key\s*\((?<columns>[^)]+)\)/i.exec(constraint);
    if (pkMatch) {
      table.primary_key = splitColumns(pkMatch.groups.columns);
      continue;
    }
    const uniqueMatch = /unique\s*\((?<columns>[^)]+)\)/i.exec(constraint);
    if (uniqueMatch) {
      table.unique_constraints.push({
        name: cleanIdentifier(match.groups.name),
        columns: splitColumns(uniqueMatch.groups.columns),
      });
      continue;
    }
    const fkMatch =
      /foreign\s+key\s*\((?<columns>[^)]+)\)\s+references\s+(?<target>(?:"[^"]+"|\w+)(?:\.(?:"[^"]+"|\w+))?)(?:\s*\((?<targetColumns>[^)]+)\))?/i.exec(
        constraint,
      );
    if (fkMatch) {
      table.foreign_keys.push({
        name: cleanIdentifier(match.groups.name),
        columns: splitColumns(fkMatch.groups.columns),
        target: cleanIdentifier(fkMatch.groups.target),
        target_columns: splitColumns(fkMatch.groups.targetColumns ?? ''),
      });
    }
  }
  for (const table of tables) {
    table.foreign_keys.sort((a, b) => a.name.localeCompare(b.name));
    table.unique_constraints.sort((a, b) => a.name.localeCompare(b.name));
  }
}

function parseRls(sql) {
  const enabledTables = [];
  const enableRegex =
    /alter\s+table\s+(?<table>(?:"[^"]+"|\w+)(?:\.(?:"[^"]+"|\w+))?)\s+enable\s+row\s+level\s+security\s*;/gi;
  for (const match of sql.matchAll(enableRegex)) {
    enabledTables.push(cleanIdentifier(match.groups.table));
  }

  const policies = [];
  const policyRegex =
    /create\s+policy\s+(?<name>"[^"]+"|\w+)\s+on\s+(?<table>(?:"[^"]+"|\w+)(?:\.(?:"[^"]+"|\w+))?)(?<body>[\s\S]*?);/gi;
  for (const match of sql.matchAll(policyRegex)) {
    policies.push({
      name: cleanIdentifier(match.groups.name),
      table: cleanIdentifier(match.groups.table),
      body: match.groups.body.trim().replace(/\s+/g, ' '),
    });
  }
  return {
    enabled_tables: [...new Set(enabledTables)].sort(),
    policies: policies.sort((a, b) => `${a.table}.${a.name}`.localeCompare(`${b.table}.${b.name}`)),
  };
}

function parseTriggers(sql) {
  const triggers = [];
  const regex =
    /create\s+(?:or\s+replace\s+)?trigger\s+(?<name>"[^"]+"|\w+)\s+[\s\S]*?\s+on\s+(?<table>(?:"[^"]+"|\w+)(?:\.(?:"[^"]+"|\w+))?)[\s\S]*?;/gi;
  for (const match of sql.matchAll(regex)) {
    triggers.push({
      name: cleanIdentifier(match.groups.name),
      table: cleanIdentifier(match.groups.table),
    });
  }
  return triggers.sort((a, b) => `${a.table}.${a.name}`.localeCompare(`${b.table}.${b.name}`));
}

function parseClassificationComments(sql) {
  const comments = [];
  const regex =
    /comment\s+on\s+(?<kind>table|column)\s+(?<target>(?:"[^"]+"|\w+)(?:\.(?:"[^"]+"|\w+)){1,2})\s+is\s+'(?<comment>(?:''|[^'])*)'\s*;/gi;
  for (const match of sql.matchAll(regex)) {
    const comment = match.groups.comment.replace(/''/g, "'");
    if (!/(pii\s*=\s*true|classification\s*=|category\s*=)/i.test(comment)) continue;
    comments.push({
      kind: match.groups.kind.toLowerCase(),
      target: cleanIdentifier(match.groups.target),
      comment,
      pii: /pii\s*=\s*true/i.test(comment),
      classification: /classification\s*=\s*([^;,\s]+)/i.exec(comment)?.[1] ?? null,
      category: /category\s*=\s*([^;,\s]+)/i.exec(comment)?.[1] ?? null,
    });
  }
  return comments.sort((a, b) => a.target.localeCompare(b.target));
}

function parsePrisma(text, file) {
  return {
    present: true,
    file,
    models: [...text.matchAll(/^model\s+(\w+)\s*\{/gm)].map((match) => match[1]).sort(),
    enums: [...text.matchAll(/^enum\s+(\w+)\s*\{/gm)].map((match) => match[1]).sort(),
    schemas: [...text.matchAll(/@@schema\("([^"]+)"\)/g)].map((match) => match[1]).sort(),
  };
}

function splitSqlList(body) {
  const parts = [];
  let current = '';
  let depth = 0;
  let quote = null;
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    const next = body[index + 1];
    if (quote === "'") {
      current += char;
      if (char === "'" && next === "'") {
        current += next;
        index += 1;
      } else if (char === "'") {
        quote = null;
      }
      continue;
    }
    if (quote === '"') {
      current += char;
      if (char === '"') quote = null;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      current += char;
      continue;
    }
    if (char === '(') depth += 1;
    if (char === ')') depth = Math.max(0, depth - 1);
    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function splitColumns(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((column) =>
      cleanIdentifier(column.replace(/\b(?:asc|desc|nulls\s+first|nulls\s+last)\b/gi, '').trim()),
    )
    .filter(Boolean);
}

function cleanIdentifier(value) {
  return String(value ?? '')
    .trim()
    .replace(/"/g, '')
    .replace(/\s+/g, ' ');
}

async function writeSchemaDigest(ctx, digest) {
  const jsonPath = join(ctx.auditRoot, 'inv', `round-${ctx.round}`, 'schema-digest.json');
  const markdownPath = join(ctx.auditRoot, 'schema-digest.md');
  await writeJson(jsonPath, digest, { dryRun: ctx.dryRun });
  await writeText(markdownPath, renderMarkdown(digest), { dryRun: ctx.dryRun });
}

function renderMarkdown(digest) {
  const tableRows = digest.tables.map((table) => [
    table.name,
    table.columns.length,
    table.primary_key.join(', ') || '-',
    table.foreign_keys.length,
    digest.rls.enabled_tables.includes(table.name) ? 'yes' : 'no',
    table.file,
  ]);
  const indexRows = digest.indexes
    .slice(0, 80)
    .map((index) => [
      index.name,
      index.table,
      index.unique ? 'yes' : 'no',
      index.columns.join(', '),
    ]);
  return [
    '# Schema Digest',
    '',
    `Round: ${digest.round}`,
    '',
    '## Counts',
    '',
    markdownTable(
      ['Metric', 'Count'],
      Object.entries(digest.counts).map(([key, value]) => [key, value]),
    ),
    '',
    '## Tables',
    '',
    markdownTable(['Table', 'Columns', 'PK', 'FKs', 'RLS', 'Source'], tableRows),
    '',
    '## Indexes',
    '',
    markdownTable(['Index', 'Table', 'Unique', 'Columns'], indexRows),
    '',
    '## Classification Comments',
    '',
    markdownTable(
      ['Target', 'PII', 'Classification', 'Category'],
      digest.classification_comments.map((comment) => [
        comment.target,
        comment.pii ? 'yes' : 'no',
        comment.classification ?? '-',
        comment.category ?? '-',
      ]),
    ),
  ].join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Top-level body already executed.
}
