#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  createContext,
  exists,
  markdownTable,
  runNodeScript,
  writeJson,
  writeText,
} from '../audit-utils.mjs';

const usage = `
Usage: node scripts/audit.mjs api [--round <n>] [--dry-run] [--output-root <path>] [--repo-root <path>]

Render docs/gov/generated/api/route-alignment.json into an audit API surface digest and run API drift checks when present.
`;

const context = await createContext(process.argv.slice(2), usage);
const surface = await buildApiSurface(context.repoRoot, context.round);
await writeJson(
  join(context.auditRoot, 'inv', `round-${context.round}`, 'api-surface.json'),
  surface,
  {
    dryRun: context.dryRun,
  },
);
await writeText(join(context.auditRoot, 'api-surface.md'), renderApiSurface(surface), {
  dryRun: context.dryRun,
});

export async function buildApiSurface(repoRoot, round) {
  const alignmentPath = join(repoRoot, 'docs', 'gov', 'generated', 'api', 'route-alignment.json');
  const alignment = JSON.parse(await readFile(alignmentPath, 'utf8'));
  const routes = (Array.isArray(alignment.routes) ? alignment.routes : [])
    .map(normalizeRoute)
    .sort((a, b) =>
      `${a.tag} ${a.method} ${a.path}`.localeCompare(`${b.tag} ${b.method} ${b.path}`),
    );
  const byTag = new Map();
  for (const route of routes) {
    const current = byTag.get(route.tag) ?? {
      tag: route.tag,
      total: 0,
      implemented: 0,
      excluded: 0,
    };
    current.total += 1;
    if (route.status === 'implemented') current.implemented += 1;
    if (route.status === 'explicitly_excluded') current.excluded += 1;
    byTag.set(route.tag, current);
  }

  return {
    generated_by: 'scripts/audit.mjs api',
    round,
    source: 'docs/gov/generated/api/route-alignment.json',
    counts: alignment.counts ?? {
      routes: routes.length,
      implemented: routes.filter((route) => route.status === 'implemented').length,
      explicitly_excluded: routes.filter((route) => route.status === 'explicitly_excluded').length,
    },
    checks: await runChecks(repoRoot),
    tags: [...byTag.values()].sort((a, b) => a.tag.localeCompare(b.tag)),
    routes,
  };
}

function normalizeRoute(route) {
  const tags = Array.isArray(route.tags) ? route.tags : [];
  return {
    method: String(route.method ?? '').toUpperCase(),
    path: String(route.path ?? ''),
    status: String(route.status ?? 'unknown'),
    tag: String(route.tag ?? tags[0] ?? route.domain ?? route.menu ?? 'untagged'),
    controller: route.controller ?? null,
    handler: route.handler ?? null,
    authority: route.authority ?? route.doc ?? route.source ?? null,
  };
}

async function runChecks(repoRoot) {
  const checks = [];
  const apiCheckScript = join(repoRoot, 'scripts', 'check-api.mjs');
  if (await exists(apiCheckScript)) {
    const result = await runNodeScript(repoRoot, apiCheckScript, ['alignment', 'check', '--json']);
    checks.push({
      name: 'check-api alignment check',
      ok: result.ok,
      status: result.status,
      stdout: parseJsonOutput(result.stdout),
      stderr: result.stderr.trim(),
    });
  } else {
    checks.push({
      name: 'check-api alignment check',
      ok: null,
      status: null,
      skipped: 'script missing',
    });
  }
  if (await exists(apiCheckScript)) {
    const result = await runNodeScript(repoRoot, apiCheckScript, ['operation', 'check']);
    checks.push({
      name: 'check-api operation check',
      ok: result.ok,
      status: result.status,
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
    });
  } else {
    checks.push({
      name: 'check-api operation check',
      ok: null,
      status: null,
      skipped: 'script missing',
    });
  }
  return checks;
}

function parseJsonOutput(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value.trim();
  }
}

function renderApiSurface(surface) {
  return [
    '# API Surface',
    '',
    `Round: ${surface.round}`,
    '',
    '## Drift Checks',
    '',
    markdownTable(
      ['Check', 'Status', 'Notes'],
      surface.checks.map((check) => [
        check.name,
        check.ok === null ? 'skipped' : check.ok ? 'ok' : 'failed',
        check.stderr || check.skipped || '-',
      ]),
    ),
    '',
    '## Per-Tag Summary',
    '',
    markdownTable(
      ['Tag', 'Total', 'Implemented', 'Excluded'],
      surface.tags.map((tag) => [tag.tag, tag.total, tag.implemented, tag.excluded]),
    ),
    '',
    '## Routes',
    '',
    markdownTable(
      ['Method', 'Path', 'Tag', 'Status', 'Controller', 'Handler', 'Authority'],
      surface.routes.map((route) => [
        route.method,
        route.path,
        route.tag,
        route.status,
        route.controller ?? '-',
        route.handler ?? '-',
        Array.isArray(route.authority) ? route.authority.join(', ') : (route.authority ?? '-'),
      ]),
    ),
  ].join('\n');
}
