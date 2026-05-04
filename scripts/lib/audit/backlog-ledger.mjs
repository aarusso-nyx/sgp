#!/usr/bin/env node

import { join } from 'node:path';

import { createContext, markdownTable, readText, writeText } from '../audit-utils.mjs';

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
  const ledger = parseLedger(existing);
  const rows = ledger.rows;
  const targetRound = closure.round ?? inferClosureRound(closure.items, round);
  const statusColumn = selectStatusColumn(ledger.headers, targetRound);
  const errors = [];

  if (rows.length === 0) {
    for (const item of closure.items) {
      rows.push({ ID: item.id, Title: item.title || item.id, [statusColumn]: item.status });
    }
  } else {
    const existingIds = new Set(rows.map((row) => row.ID));
    const unknown = closure.items.filter((item) => !existingIds.has(item.id));
    if (unknown.length > 0) {
      errors.push(
        `[audit-backlog] unknown backlog IDs: ${unknown.map((item) => item.id).join(', ')}`,
      );
      return { errors, markdown: existing };
    }
    const statusById = new Map(closure.items.map((item) => [item.id, item.status]));
    for (const row of rows) {
      const status = statusById.get(row.ID);
      if (!status) {
        row[statusColumn] = row[statusColumn] ?? '-';
        continue;
      }
      const formattedStatus = formatStatusForColumn(status, rows, statusColumn);
      row[statusColumn] = formattedStatus;
      if ('current status' in row) row['current status'] = formattedStatus;
      if ('Current Status' in row) row['Current Status'] = formattedStatus;
    }
  }

  const headers = stableHeaders(rows, statusColumn, ledger.headers);
  const table = markdownTable(
    headers,
    rows.sort(compareBacklogRows).map((row) => headers.map((header) => row[header] ?? '-')),
  );

  return {
    errors,
    markdown: ledger.tableRange
      ? replaceTable(existing, ledger.tableRange, table)
      : newLedgerMarkdown(closurePath, table),
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
  return {
    round: Number.isFinite(Number(parsed.round)) ? Number(parsed.round) : undefined,
    items: rawItems
      .map((item) => ({
        id: String(item.id ?? item.backlog_id ?? item.r3_id ?? item.ID ?? ''),
        title: item.title ?? item.name ?? '',
        status: normalizeStatus(item.status ?? item.outcome ?? 'unknown'),
      }))
      .filter((item) => item.id),
  };
}

function normalizeStatus(value) {
  const status = String(value).trim().toUpperCase();
  if (status === 'COMPLETE' || status === 'SUCCESS') return 'DONE';
  return status;
}

function compareBacklogRows(a, b) {
  const left = parseBacklogId(a.ID);
  const right = parseBacklogId(b.ID);
  if (left && right) {
    return left.round - right.round || left.item - right.item || a.ID.localeCompare(b.ID);
  }
  return a.ID.localeCompare(b.ID);
}

function parseBacklogId(id) {
  const match = /^R(\d+)-(\d+)/.exec(id);
  if (!match) return null;
  return { item: Number(match[2]), round: Number(match[1]) };
}

function parseLedger(markdown) {
  const table = findBacklogTable(markdown);
  const rows =
    table?.rows.map((row) => ({
      ID: row.ID || row['Backlog ID'] || row['R3 ID'] || row['backlog-id'] || '',
      Title: row.Title || row.Item || row.title || '',
      ...row,
    })) ?? [];
  return { headers: table?.headers ?? [], rows, tableRange: table?.range };
}

function stableHeaders(rows, statusColumn, existingHeaders = []) {
  if (existingHeaders.length > 0) {
    return existingHeaders.includes(statusColumn)
      ? existingHeaders
      : [...existingHeaders, statusColumn];
  }
  const base = ['ID', 'Title'];
  const roundColumns = [
    ...new Set(rows.flatMap((row) => Object.keys(row).filter((key) => /^Round \d+$/.test(key)))),
  ].sort((a, b) => Number(a.replace('Round ', '')) - Number(b.replace('Round ', '')));
  if (!roundColumns.includes(statusColumn)) roundColumns.push(statusColumn);
  return [...base, ...roundColumns];
}

function inferClosureRound(items, round) {
  const idRounds = new Set(
    items
      .map((item) => /^R(\d+)-/.exec(item.id)?.[1])
      .filter(Boolean)
      .map(Number),
  );
  if (idRounds.size === 1) return [...idRounds][0];
  return Number(round) + 1;
}

function selectStatusColumn(headers, round) {
  const candidates = [`R${round}`, `Round ${round}`];
  const existing = candidates.find((candidate) => headers.includes(candidate));
  if (existing) return existing;
  return headers.some((header) => /^R\d+$/.test(header)) ? `R${round}` : `Round ${round}`;
}

function formatStatusForColumn(status, rows, statusColumn) {
  const existingValues = rows.map((row) => row[statusColumn]).filter(Boolean);
  const usesLowercase = existingValues.some((value) => /^[a-z][a-z_-]*$/.test(String(value)));
  return usesLowercase ? status.toLowerCase() : status;
}

function findBacklogTable(markdown) {
  const lines = markdown.split(/\r?\n/);
  for (let index = 0; index < lines.length - 1; index += 1) {
    if (!lines[index].trim().startsWith('|') || !isMarkdownSeparator(lines[index + 1])) {
      continue;
    }
    const headers = splitMarkdownRow(lines[index]);
    const normalizedHeaders = new Set(headers.map((header) => header.toLowerCase()));
    const isBacklogTable =
      normalizedHeaders.has('id') ||
      normalizedHeaders.has('backlog id') ||
      normalizedHeaders.has('backlog-id') ||
      normalizedHeaders.has('r3 id');
    if (!isBacklogTable) continue;

    const rows = [];
    let rowIndex = index + 2;
    while (rowIndex < lines.length && lines[rowIndex].trim().startsWith('|')) {
      const cells = splitMarkdownRow(lines[rowIndex]);
      rows.push(
        Object.fromEntries(headers.map((header, cellIndex) => [header, cells[cellIndex] ?? ''])),
      );
      rowIndex += 1;
    }
    return {
      headers,
      range: { start: index, end: rowIndex },
      rows,
    };
  }
  return null;
}

function replaceTable(markdown, range, table) {
  const lines = markdown.split(/\r?\n/);
  lines.splice(range.start, range.end - range.start, ...table.split('\n'));
  return lines.join('\n');
}

function newLedgerMarkdown(closurePath, table) {
  return ['# Backlog Ledger', '', `Last updated from \`${closurePath}\`.`, '', table].join('\n');
}

function isMarkdownSeparator(line) {
  if (!line.trim().startsWith('|')) return false;
  const cells = splitMarkdownRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function splitMarkdownRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.replace(/\\\|/g, '|').trim());
}
