#!/usr/bin/env node

import { join } from 'node:path';

import {
  createContext,
  firstTableRows,
  markdownTable,
  readText,
  writeText,
} from '../audit-utils.mjs';

const usage = `
Usage: node scripts/audit.mjs backlog [--round <n>] [--closure <path>] [--dry-run] [--output-root <path>] [--repo-root <path>]

Apply docs/work/round-N/closure.json to docs/gov/audit/backlog-ledger.md. Not included in audit:all.
`;

const context = await createContext(process.argv.slice(2), usage);
const closurePath =
  context.options.closure ??
  join(context.repoRoot, 'docs', 'work', `round-${context.round}`, 'closure.json');
const update = await buildBacklogLedger(
  context.repoRoot,
  context.auditRoot,
  context.round,
  closurePath,
);
if (update.errors.length > 0) {
  console.error(update.errors.join('\n'));
  process.exit(1);
}
await writeText(join(context.auditRoot, 'backlog-ledger.md'), update.markdown, {
  dryRun: context.dryRun,
});

export async function buildBacklogLedger(_repoRoot, auditRoot, round, closurePath) {
  const closure = parseClosure(await readText(closurePath));
  const ledgerPath = join(auditRoot, 'backlog-ledger.md');
  const existing = await readText(ledgerPath);
  const rows = parseLedger(existing);
  const statusColumn = `Round ${Number(round) + 1}`;
  const errors = [];

  if (rows.length === 0) {
    for (const item of closure) {
      rows.push({ ID: item.id, Title: item.title || item.id, [statusColumn]: item.status });
    }
  } else {
    const existingIds = new Set(rows.map((row) => row.ID));
    const unknown = closure.filter((item) => !existingIds.has(item.id));
    if (unknown.length > 0) {
      errors.push(
        `[audit-backlog] unknown backlog IDs: ${unknown.map((item) => item.id).join(', ')}`,
      );
      return { errors, markdown: existing };
    }
    const statusById = new Map(closure.map((item) => [item.id, item.status]));
    for (const row of rows) {
      row[statusColumn] = statusById.get(row.ID) ?? row[statusColumn] ?? '-';
    }
  }

  const headers = stableHeaders(rows, statusColumn);
  return {
    errors,
    markdown: [
      '# Backlog Ledger',
      '',
      `Last updated from \`${closurePath}\`.`,
      '',
      markdownTable(
        headers,
        rows
          .sort((a, b) => a.ID.localeCompare(b.ID))
          .map((row) => headers.map((header) => row[header] ?? '-')),
      ),
    ].join('\n'),
  };
}

function parseClosure(text) {
  if (!text.trim()) {
    throw new Error('[audit-backlog] closure.json is empty or missing');
  }
  const parsed = JSON.parse(text);
  const rawItems = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.items)
      ? parsed.items
      : Object.values(parsed);
  return rawItems
    .map((item) => ({
      id: String(item.id ?? item.backlog_id ?? item.r3_id ?? item.ID ?? ''),
      title: item.title ?? item.name ?? '',
      status: String(item.status ?? item.outcome ?? 'unknown').toUpperCase(),
    }))
    .filter((item) => item.id);
}

function parseLedger(markdown) {
  return firstTableRows(markdown).map((row) => ({
    ID: row.ID || row['Backlog ID'] || row['R3 ID'] || '',
    Title: row.Title || row.Item || '',
    ...row,
  }));
}

function stableHeaders(rows, statusColumn) {
  const base = ['ID', 'Title'];
  const roundColumns = [
    ...new Set(rows.flatMap((row) => Object.keys(row).filter((key) => /^Round \d+$/.test(key)))),
  ].sort((a, b) => Number(a.replace('Round ', '')) - Number(b.replace('Round ', '')));
  if (!roundColumns.includes(statusColumn)) roundColumns.push(statusColumn);
  return [...base, ...roundColumns];
}
