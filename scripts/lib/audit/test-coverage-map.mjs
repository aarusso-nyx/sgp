#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  createContext,
  firstTableRows,
  listFiles,
  markdownTable,
  repoRelative,
  slug,
  writeJson,
  writeText,
} from '../audit-utils.mjs';

const usage = `
Usage: node scripts/audit.mjs tests [--round <n>] [--dry-run] [--output-root <path>] [--repo-root <path>]

Static-scan Jest/Playwright spec files and map them to functional requisite IDs.
`;

const context = await createContext(process.argv.slice(2), usage);
const coverageMap = await buildTestCoverageMap(context.repoRoot, context.auditRoot, context.round);
await writeJson(
  join(context.auditRoot, 'inv', `round-${context.round}`, 'test-coverage-map.json'),
  coverageMap,
  {
    dryRun: context.dryRun,
  },
);
await writeText(
  join(context.auditRoot, 'inv', `round-${context.round}`, 'test-coverage-map.md'),
  renderMarkdown(coverageMap),
  {
    dryRun: context.dryRun,
  },
);

export async function buildTestCoverageMap(repoRoot, auditRoot, round) {
  const specFiles = await collectSpecFiles(repoRoot);
  const specs = [];
  for (const file of specFiles) {
    const content = await readFile(file, 'utf8');
    specs.push(inspectSpec(repoRoot, file, content));
  }
  const frRows = parseFunctionalRequisites(
    await readFile(join(auditRoot, 'functional-requisites.md'), 'utf8').catch(() =>
      readFile(join(repoRoot, 'docs', 'gov', 'audit', 'functional-requisites.md'), 'utf8').catch(
        () => '',
      ),
    ),
  );
  const featureMap = frRows.map((fr) => {
    const terms = termsFor(fr.requirement);
    const matches = specs.filter((spec) =>
      terms.some(
        (term) => spec.search_text.includes(term) || spec.file.toLowerCase().includes(term),
      ),
    );
    return {
      fr_id: fr.id,
      requirement: fr.requirement,
      status: fr.status,
      tests: matches.map((spec) => spec.file),
      test_count: matches.length,
    };
  });
  return {
    generated_by: 'scripts/audit.mjs tests',
    round,
    counts: {
      specs: specs.length,
      functional_requisites: frRows.length,
      mapped_requisites: featureMap.filter((item) => item.test_count > 0).length,
    },
    specs: specs.map(({ search_text: _searchText, ...spec }) => spec),
    feature_map: featureMap,
  };
}

async function collectSpecFiles(repoRoot) {
  const roots = ['tests', 'backend', 'frontend'];
  const all = [];
  for (const root of roots) {
    all.push(...(await listFiles(join(repoRoot, root), { ext: ['.ts'] })));
  }
  return [...new Set(all)]
    .filter((file) => /(\.spec\.ts|\.e2e-spec\.ts|\.pw\.ts)$/.test(file.replaceAll('\\', '/')))
    .sort();
}

function inspectSpec(repoRoot, file, content) {
  const describes = [...content.matchAll(/\bdescribe\s*\(\s*['"`]([^'"`]+)['"`]/g)].map(
    (match) => match[1],
  );
  const routeReferences = [
    ...new Set(
      [...content.matchAll(/['"`](\/(?:api|portal|admin)[^'"`\s)]*)['"`]/g)].map(
        (match) => match[1],
      ),
    ),
  ].sort();
  const entityReferences = [
    ...new Set(
      [
        ...content.matchAll(
          /\b([A-Z][A-Za-z0-9]*(?:Entity|Dto|Service|Controller|Module|Repository))\b/g,
        ),
      ].map((match) => match[1]),
    ),
  ].sort();
  const fileRelative = repoRelative(repoRoot, file);
  return {
    file: fileRelative,
    describes,
    route_references: routeReferences,
    entity_references: entityReferences,
    search_text:
      `${fileRelative} ${describes.join(' ')} ${routeReferences.join(' ')} ${entityReferences.join(' ')}`.toLowerCase(),
  };
}

function parseFunctionalRequisites(markdown) {
  return firstTableRows(markdown).map((row) => ({
    id: row['FR-ID'] || row.ID || '',
    requirement: row.Requirement || '',
    status: row.Status || '',
  }));
}

function termsFor(requirement) {
  return slug(requirement)
    .split('-')
    .filter((term) => term.length >= 4)
    .slice(0, 10);
}

function renderMarkdown(map) {
  return [
    '# Test Coverage Map',
    '',
    `Round: ${map.round}`,
    '',
    '## Summary',
    '',
    markdownTable(
      ['Metric', 'Count'],
      Object.entries(map.counts).map(([key, value]) => [key, value]),
    ),
    '',
    '## Functional Requisites',
    '',
    markdownTable(
      ['FR-ID', 'Status', 'Test count', 'Tests'],
      map.feature_map.map((item) => [
        item.fr_id,
        item.status,
        item.test_count,
        item.tests.slice(0, 8).join('<br>') || '-',
      ]),
    ),
    '',
    '## Specs',
    '',
    markdownTable(
      ['Spec', 'Describe blocks', 'Routes', 'Entities'],
      map.specs.map((spec) => [
        spec.file,
        spec.describes.join('<br>') || '-',
        spec.route_references.join('<br>') || '-',
        spec.entity_references.join('<br>') || '-',
      ]),
    ),
  ].join('\n');
}
