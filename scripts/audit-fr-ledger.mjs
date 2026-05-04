#!/usr/bin/env node

import { join } from 'node:path';

import {
  createContext,
  firstTableRows,
  markdownTable,
  readText,
  runGit,
  slug,
  stripMarkdown,
  writeText,
} from './lib/audit-utils.mjs';

const usage = `
Usage: node scripts/audit-fr-ledger.mjs [--round <n>] [--dry-run] [--output-root <path>] [--repo-root <path>]

Refresh docs/gov/audit/functional-requisites.md from docs/eng/99-implementation-status.md and emit the round FR delta.
`;

const context = await createContext(process.argv.slice(2), usage);
const refresh = await buildFunctionalRequisites(context.repoRoot, context.auditRoot, context.round);
await writeText(
  join(context.auditRoot, 'diag', `round-${context.round}`, 'fr-delta.md'),
  refresh.deltaMarkdown,
  {
    dryRun: context.dryRun,
  },
);
await writeText(join(context.auditRoot, 'functional-requisites.md'), refresh.ledgerMarkdown, {
  dryRun: context.dryRun,
});

export async function buildFunctionalRequisites(repoRoot, auditRoot, round) {
  const statusPath = join(repoRoot, 'docs', 'eng', '99-implementation-status.md');
  const currentStatus = await readText(statusPath);
  const currentFacts = extractStatusFacts(currentStatus);
  const ledgerPath = join(auditRoot, 'functional-requisites.md');
  const existingLedger = await readText(ledgerPath);
  const existingRows = normalizeLedgerRows(firstTableRows(existingLedger));
  const existingBySlug = new Map(existingRows.map((row) => [slug(row.requirement), row]));

  const rows = currentFacts.map((fact, index) => {
    const prior = existingBySlug.get(slug(fact.requirement));
    return {
      id: prior?.id || `FR-${String(index + 1).padStart(3, '0')}`,
      requirement: fact.requirement,
      status: fact.status,
      evidence: fact.evidence,
      notes: prior?.notes || fact.notes || '-',
    };
  });

  const previousCommitted = await readCommittedLedger(repoRoot);
  const previousRows = normalizeLedgerRows(firstTableRows(previousCommitted));
  const previousById = new Map(previousRows.map((row) => [row.id, row]));
  const deltaRows = rows
    .map((row) => ({
      id: row.id,
      prior: previousById.get(row.id)?.status ?? 'NEW',
      next: row.status,
      evidenceDelta:
        previousById.get(row.id)?.evidence === row.evidence ? 'unchanged' : row.evidence || '-',
    }))
    .filter(
      (row) => row.prior !== row.next || row.prior === 'NEW' || row.evidenceDelta !== 'unchanged',
    );

  return {
    rows,
    ledgerMarkdown: renderLedger(round, rows),
    deltaMarkdown: renderDelta(round, deltaRows),
  };
}

function extractStatusFacts(markdown) {
  const facts = [];
  const currentScope = section(markdown, 'Current Scope', 'Current Verification');
  for (const bullet of bullets(currentScope)) {
    facts.push({
      requirement: stripMarkdown(bullet),
      status: 'DONE',
      evidence: 'docs/eng/99-implementation-status.md',
    });
  }

  const deferred = section(markdown, 'Deferred Scope', 'Remaining Open Work');
  for (const bullet of bullets(deferred)) {
    facts.push({
      requirement: stripMarkdown(bullet),
      status: 'DEFERRED',
      evidence: 'docs/eng/103-deferred-decision-ledger.md',
    });
  }

  if (facts.length === 0) {
    facts.push({
      requirement:
        'Implementation status document is present but no bullet requirements were parsed.',
      status: 'PARTIAL',
      evidence: 'docs/eng/99-implementation-status.md',
      notes: 'Parser found no current-scope bullets.',
    });
  }
  return facts;
}

function section(markdown, startHeading, endHeading) {
  const start = markdown.indexOf(`## ${startHeading}`);
  if (start < 0) return '';
  const end = endHeading ? markdown.indexOf(`## ${endHeading}`, start + 1) : -1;
  return markdown.slice(start, end > start ? end : undefined);
}

function bullets(markdown) {
  const items = [];
  let current = null;
  for (const line of markdown.split(/\r?\n/)) {
    if (/^-\s+/.test(line)) {
      if (current) items.push(current.trim());
      current = line.replace(/^-\s+/, '').trim();
      continue;
    }
    if (current && /^\s{2,}\S/.test(line) && !/^\s{2,}-\s+/.test(line)) {
      current = `${current} ${line.trim()}`;
      continue;
    }
    if (current && line.trim() === '') {
      items.push(current.trim());
      current = null;
    }
  }
  if (current) items.push(current.trim());
  return items.filter(Boolean);
}

function normalizeLedgerRows(rows) {
  return rows
    .map((row) => ({
      id: row['FR-ID'] || row.ID || row.id || '',
      requirement: row.Requirement || row.Requisite || row.requirement || '',
      status: (row.Status || row.status || '').toUpperCase(),
      evidence: row.Evidence || row.evidence || '',
      notes: row.Notes || row.notes || '-',
    }))
    .filter((row) => row.id && row.requirement);
}

async function readCommittedLedger(repoRoot) {
  const result = await runGit(repoRoot, ['show', 'HEAD:docs/gov/audit/functional-requisites.md']);
  return result.ok ? result.stdout : '';
}

function renderLedger(round, rows) {
  return [
    '# Functional Requisites',
    '',
    `Last refreshed from \`docs/eng/99-implementation-status.md\` for round ${round}.`,
    '',
    markdownTable(
      ['FR-ID', 'Requirement', 'Status', 'Evidence', 'Notes'],
      rows.map((row) => [row.id, row.requirement, row.status, row.evidence, row.notes]),
    ),
  ].join('\n');
}

function renderDelta(round, rows) {
  return [
    '# Functional Requisites Delta',
    '',
    `Round: ${round}`,
    '',
    markdownTable(
      ['FR-ID', 'Prior status', 'New status', 'Evidence delta'],
      rows.map((row) => [row.id, row.prior, row.next, row.evidenceDelta]),
    ),
  ].join('\n');
}
