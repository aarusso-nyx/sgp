#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defaultRepoRoot } from './repo-paths.mjs';

const repoRoot = defaultRepoRoot;
const ledgerPath = resolve(repoRoot, 'docs/gov/audit/backlog-ledger.md');
const roadmapPath = resolve(repoRoot, 'ROADMAP.md');
const beginMarker = '<!-- begin:auto-deferred-from-ledger -->';
const endMarker = '<!-- end:auto-deferred-from-ledger -->';

const args = process.argv.slice(2);
const checkMode = args.includes('--check');

function parseLedger(markdown) {
  const lines = markdown.split('\n');
  const ledgerStart = lines.findIndex((line) => line.trim() === '## Ledger');
  if (ledgerStart === -1) {
    throw new Error('[roadmap-from-ledger] could not find "## Ledger" section in backlog ledger');
  }

  let headerIndex = -1;
  for (let i = ledgerStart + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith('| backlog-id')) {
      headerIndex = i;
      break;
    }
  }
  if (headerIndex === -1) {
    throw new Error('[roadmap-from-ledger] could not find ledger header row');
  }

  const headers = lines[headerIndex]
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim());
  const idIndex = headers.indexOf('backlog-id');
  const titleIndex = headers.indexOf('title');
  const domainIndex = headers.indexOf('domain');
  const statusIndex = headers.indexOf('current status');
  if ([idIndex, titleIndex, domainIndex, statusIndex].some((index) => index === -1)) {
    throw new Error('[roadmap-from-ledger] expected columns missing from ledger header');
  }

  const rows = [];
  for (let i = headerIndex + 2; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.startsWith('|')) {
      break;
    }
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < headers.length) {
      continue;
    }
    rows.push({
      id: cells[idIndex],
      title: cells[titleIndex],
      domain: cells[domainIndex] || 'Uncategorized',
      status: cells[statusIndex],
    });
  }
  return rows;
}

function renderAutoBlock(rows) {
  const deferred = rows.filter((row) => row.status === 'deferred');
  const grouped = new Map();
  for (const row of deferred) {
    const list = grouped.get(row.domain) ?? [];
    list.push(row);
    grouped.set(row.domain, list);
  }
  const sortedDomains = Array.from(grouped.keys()).sort((left, right) =>
    left.localeCompare(right, 'en'),
  );

  const lines = [];
  lines.push(`Total deferred items in ledger: **${deferred.length}**.`);
  lines.push('');
  lines.push('Auto-generated from `docs/gov/audit/backlog-ledger.md`. Do not edit by hand;');
  lines.push('regenerate with `npm run roadmap` after changing the ledger.');
  lines.push('');
  for (const domain of sortedDomains) {
    const items = grouped.get(domain) ?? [];
    items.sort((left, right) => left.id.localeCompare(right.id, 'en'));
    lines.push(`### ${domain} (${items.length})`);
    lines.push('');
    for (const item of items) {
      lines.push(`- \`${item.id}\` ${item.title}`);
    }
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

function rebuildRoadmap(existing, autoBlock) {
  const begin = existing.indexOf(beginMarker);
  const end = existing.indexOf(endMarker);
  const block = `${beginMarker}\n\n${autoBlock}\n\n${endMarker}`;
  if (begin === -1 || end === -1) {
    const trimmed = existing.trimEnd();
    return `${trimmed}\n\n## Deferred backlog (auto-generated)\n\n${block}\n`;
  }
  return `${existing.slice(0, begin)}${block}${existing.slice(end + endMarker.length)}`;
}

const ledgerMarkdown = readFileSync(ledgerPath, 'utf8');
const rows = parseLedger(ledgerMarkdown);
const autoBlock = renderAutoBlock(rows);
const existing = readFileSync(roadmapPath, 'utf8');
const next = rebuildRoadmap(existing, autoBlock);

if (checkMode) {
  if (existing !== next) {
    console.error(
      '[roadmap-from-ledger] ROADMAP.md auto-block is stale; run `npm run roadmap` to refresh.',
    );
    process.exit(1);
  }
  console.log('[roadmap-from-ledger] ROADMAP.md auto-block is up to date.');
  process.exit(0);
}

if (existing === next) {
  console.log('[roadmap-from-ledger] no changes (ROADMAP.md already current).');
  process.exit(0);
}

writeFileSync(roadmapPath, next, 'utf8');
console.log(
  `[roadmap-from-ledger] rewrote ${roadmapPath} from ${ledgerPath} (${rows.filter((r) => r.status === 'deferred').length} deferred items).`,
);
