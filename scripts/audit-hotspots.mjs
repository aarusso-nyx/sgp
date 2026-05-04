#!/usr/bin/env node

import { join } from 'node:path';

import {
  createContext,
  lineCount,
  markdownTable,
  ownerModule,
  readText,
  repoRelative,
  runGit,
  writeText,
} from './lib/audit-utils.mjs';

const usage = `
Usage: node scripts/audit-hotspots.mjs (--baseline <sha> | --prev-round) [--round <n>] [--dry-run] [--output-root <path>] [--repo-root <path>]

Aggregate git churn since a baseline and emit docs/gov/audit/diag/round-N/hotspots.md.
`;

const context = await createContext(process.argv.slice(2), usage);
const baseline = await resolveBaseline(context);
if (!baseline) {
  console.error('[audit-hotspots] --baseline <sha> or resolvable --prev-round is required');
  process.exit(1);
}
const hotspots = await buildHotspots(context.repoRoot, context.round, baseline);
await writeText(
  join(context.auditRoot, 'diag', `round-${context.round}`, 'hotspots.md'),
  renderMarkdown(hotspots),
  {
    dryRun: context.dryRun,
  },
);

export async function buildHotspots(repoRoot, round, baseline) {
  const range = `${baseline}..HEAD`;
  const names = await runGit(repoRoot, [
    'log',
    '--no-merges',
    '--format=--commit--%H',
    '--numstat',
    range,
  ]);
  const stats = new Map();
  if (names.ok) {
    let currentCommit = null;
    for (const line of names.stdout.split(/\r?\n/)) {
      if (line.startsWith('--commit--')) {
        currentCommit = line.slice('--commit--'.length);
        continue;
      }
      const match = /^(?<added>-|\d+)\s+(?<deleted>-|\d+)\s+(?<file>.+)$/.exec(line);
      if (!match) continue;
      const file = match.groups.file;
      const entry = stats.get(file) ?? { file, commits: new Set(), added: 0, deleted: 0 };
      if (currentCommit) entry.commits.add(currentCommit);
      entry.added += match.groups.added === '-' ? 0 : Number(match.groups.added);
      entry.deleted += match.groups.deleted === '-' ? 0 : Number(match.groups.deleted);
      stats.set(file, entry);
    }
  }

  const rows = await Promise.all(
    [...stats.values()].map(async (entry) => ({
      file: entry.file,
      commits: entry.commits.size,
      added: entry.added,
      deleted: entry.deleted,
      current_loc: await lineCount(join(repoRoot, entry.file)),
      owner_module: ownerModule(entry.file),
    })),
  );

  rows.sort((a, b) => b.added + b.deleted - (a.added + a.deleted) || a.file.localeCompare(b.file));
  return {
    generated_by: 'scripts/audit-hotspots.mjs',
    round,
    baseline,
    range,
    top: rows.slice(0, 30),
  };
}

async function resolveBaseline(ctx) {
  if (ctx.options.baseline) return String(ctx.options.baseline);
  if (!ctx.options['prev-round']) return null;

  const previousRound = Math.max(0, Number(ctx.round) - 1);
  const snapshot = await readText(
    join(ctx.repoRoot, 'docs', 'work', `round-${previousRound}`, '00-snapshot.md'),
  );
  const snapshotSha =
    /\b(?:HEAD|head|sha|commit)\b[^0-9a-f]*(?<sha>[0-9a-f]{7,40})/i.exec(snapshot)?.groups.sha ??
    null;
  if (snapshotSha) return snapshotSha;

  const previous = await runGit(ctx.repoRoot, ['rev-parse', 'HEAD~1']);
  if (previous.ok) return previous.stdout.trim();

  const head = await runGit(ctx.repoRoot, ['rev-parse', 'HEAD']);
  return head.ok ? head.stdout.trim() : null;
}

function renderMarkdown(hotspots) {
  return [
    '# Hotspots',
    '',
    `Round: ${hotspots.round}`,
    `Baseline: \`${hotspots.baseline}\``,
    '',
    markdownTable(
      ['File', 'Commits', '+LOC', '-LOC', 'Current LOC', 'Owner module'],
      hotspots.top.map((row) => [
        row.file,
        row.commits,
        row.added,
        row.deleted,
        row.current_loc,
        row.owner_module,
      ]),
    ),
  ].join('\n');
}
