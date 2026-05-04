#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readdir } from 'node:fs/promises';
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
} from '../audit-utils.mjs';

const usage = `
Usage: node scripts/audit.mjs fr [--round <n>] [--dry-run] [--output-root <path>] [--repo-root <path>]

Refresh docs/gov/audit/functional-requisites.md from docs/eng/domains/*.md and emit the round FR delta.
`;

const keywordStopwords = new Set([
  'about',
  'above',
  'admin',
  'after',
  'ainda',
  'antes',
  'api',
  'apis',
  'app',
  'application',
  'assim',
  'authority',
  'backend',
  'cada',
  'caso',
  'como',
  'comum',
  'contra',
  'controller',
  'data',
  'deve',
  'devem',
  'docs',
  'domain',
  'endpoint',
  'endpoints',
  'entity',
  'esse',
  'esta',
  'este',
  'frontend',
  'gestao',
  'http',
  'local',
  'model',
  'modelo',
  'module',
  'modulo',
  'operacional',
  'para',
  'portal',
  'publico',
  'quando',
  'read',
  'regra',
  'regras',
  'request',
  'response',
  'route',
  'schema',
  'service',
  'status',
  'table',
  'tenant',
  'tests',
  'tipo',
  'toda',
  'todo',
  'todos',
  'uses',
  'write',
]);

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
  const currentFacts = await extractDomainFacts(repoRoot);
  const ledgerPath = join(auditRoot, 'functional-requisites.md');
  const existingLedger = await readText(ledgerPath);
  const existingRows = normalizeLedgerRows(firstTableRows(existingLedger));
  const existingBySlug = new Map(existingRows.map((row) => [slug(row.requirement), row]));
  const existingById = new Map(existingRows.map((row) => [row.id, row]));

  const rows = currentFacts.map((fact) => {
    const prior = existingById.get(fact.id) ?? existingBySlug.get(slug(fact.requirement));
    return {
      id: fact.id,
      requirement: fact.requirement,
      status: prior?.status || fact.status,
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

async function extractDomainFacts(repoRoot) {
  const domainsRoot = join(repoRoot, 'docs', 'eng', 'domains');
  let entries;
  try {
    entries = await readdir(domainsRoot, { withFileTypes: true });
  } catch {
    return fallbackStatusFacts(repoRoot);
  }

  const facts = [];
  const usedIds = new Set();
  const domainFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  for (const fileName of domainFiles) {
    const path = join(domainsRoot, fileName);
    const markdown = await readText(path);
    facts.push(...extractDomainHeadingFacts(repoRoot, path, fileName, markdown, usedIds));
  }

  return facts.length > 0 ? facts : fallbackStatusFacts(repoRoot);
}

function extractDomainHeadingFacts(repoRoot, path, fileName, markdown, usedIds) {
  const lines = markdown.split(/\r?\n/);
  const domainTitle = extractDomainTitle(lines, fileName);
  const seenHeadings = new Set();
  const facts = [];

  lines.forEach((line, index) => {
    const match = /^##\s+(.+?)\s*$/.exec(line);
    if (!match) return;

    const heading = stripMarkdown(match[1].replace(/\s+#+$/, '').trim());
    if (!heading || heading === 'Merged Artifact Index') return;

    const headingSlug = slug(heading);
    if (!headingSlug || seenHeadings.has(headingSlug)) return;
    seenHeadings.add(headingSlug);

    const sectionMarkdown = sectionAfterHeading(lines, index, headingSlug);
    const keywords = extractSectionKeywords(sectionMarkdown, `${domainTitle} ${heading}`);
    const keywordSuffix = keywords.length > 0 ? ` (${keywords.join(' ')})` : '';
    facts.push({
      id: stableFrId(fileName, headingSlug, usedIds),
      requirement: `${domainTitle}: ${heading}${keywordSuffix}`,
      status: 'TODO',
      evidence: `${repoRelativePath(repoRoot, path)}:${index + 1}`,
      notes: 'Generated from docs/eng domain heading.',
    });
  });

  return facts;
}

function sectionAfterHeading(lines, headingIndex, headingSlug) {
  const body = [];
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    const headingMatch = /^##\s+(.+?)\s*$/.exec(lines[index]);
    if (headingMatch) {
      const nextHeadingSlug = slug(stripMarkdown(headingMatch[1].replace(/\s+#+$/, '').trim()));
      if (nextHeadingSlug === headingSlug) continue;
      break;
    }
    body.push(lines[index]);
  }
  return body.join('\n');
}

function extractSectionKeywords(markdown, existingText) {
  const existingTerms = new Set(identifierTokens(existingText));
  const candidates = [];

  for (const match of markdown.matchAll(/`([^`]+)`/g)) {
    candidates.push(...identifierTokens(match[1]));
  }
  for (const match of markdown.matchAll(/[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9_.:/#-]{3,}/g)) {
    candidates.push(...identifierTokens(match[0]));
  }

  const keywords = [];
  for (const candidate of candidates) {
    if (
      candidate.length < 4 ||
      existingTerms.has(candidate) ||
      keywordStopwords.has(candidate) ||
      keywords.includes(candidate)
    ) {
      continue;
    }
    keywords.push(candidate);
    if (keywords.length >= 6) break;
  }

  return keywords;
}

function identifierTokens(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

async function fallbackStatusFacts(repoRoot) {
  const statusPath = join(repoRoot, 'docs', 'eng', '99-implementation-status.md');
  return extractStatusFacts(await readText(statusPath));
}

function extractDomainTitle(lines, fileName) {
  const titleLine = lines.find((line) => /^#\s+/.test(line));
  const title = titleLine
    ? stripMarkdown(
        titleLine
          .replace(/^#\s+/, '')
          .replace(/\s+Domain Authority$/i, '')
          .trim(),
      )
    : '';
  if (title) return title;
  return fileName
    .replace(/\.md$/i, '')
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function stableFrId(fileName, headingSlug, usedIds) {
  const domainCode = domainCodeFor(fileName);
  const seed = `${fileName}:${headingSlug}`;
  const digest = createHash('sha1').update(seed).digest('hex').toUpperCase();
  for (const length of [6, 8, 10, 12]) {
    const id = `FR-${domainCode}-${digest.slice(0, length)}`;
    if (!usedIds.has(id)) {
      usedIds.add(id);
      return id;
    }
  }
  throw new Error(`Could not assign a unique FR-ID for ${seed}`);
}

function domainCodeFor(fileName) {
  const words = slug(fileName.replace(/\.md$/i, '')).split('-').filter(Boolean);
  const initials = words.map((word) => word[0]).join('');
  return (initials || 'GEN').toUpperCase().slice(0, 4);
}

function repoRelativePath(repoRoot, path) {
  return path.replace(`${repoRoot}/`, '');
}

function extractStatusFacts(markdown) {
  const facts = [];
  const currentScope = section(markdown, 'Current Scope', 'Current Verification');
  for (const bullet of bullets(currentScope)) {
    facts.push({
      requirement: stripMarkdown(bullet),
      status: 'DONE',
      evidence: 'docs/gov/evidence/implementation-status.md',
    });
  }

  const deferred = section(markdown, 'Deferred Scope', 'Remaining Open Work');
  for (const bullet of bullets(deferred)) {
    facts.push({
      requirement: stripMarkdown(bullet),
      status: 'DEFERRED',
      evidence: 'docs/gov/evidence/deferred-decision-ledger.md',
    });
  }

  if (facts.length === 0) {
    facts.push({
      requirement:
        'Implementation status document is present but no bullet requirements were parsed.',
      status: 'PARTIAL',
      evidence: 'docs/gov/evidence/implementation-status.md',
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
      requirement:
        row.Requirement ||
        row.Description ||
        row.description ||
        row.Requisite ||
        row.requirement ||
        '',
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
    `Last refreshed from \`docs/eng/domains/*.md\` for round ${round}.`,
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
