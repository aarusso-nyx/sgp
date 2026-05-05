#!/usr/bin/env node

import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  createContext,
  exists,
  markdownTable,
  readText,
  repoRelative,
  writeText,
} from '../audit-utils.mjs';

const usage = `
Usage: node scripts/audit.mjs rls-spec-coverage [--round <n>] [--json] [--dry-run] [--output-root <path>] [--repo-root <path>]

Report RLS-protected table coverage by tests/rls cross-tenant and self-only specs.
`;

const QUALIFIED_TABLE_PATTERN = /\b[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\b/g;
const CROSS_TENANT_SPEC_PATTERN = /(?:^|[-.])cross-tenant\.spec\.ts$/i;
const SELF_ONLY_SPEC_PATTERN = /(?:^|[-.])self-only\.spec\.ts$/i;
const SELF_ONLY_CONTENT_PATTERN =
  /\bSelf Only\b|\bself_read\b|\bsgp_current_employee(?:_id)?\s*\(/i;
const SELF_ONLY_POLICY_PATTERN =
  /\bsgp_current_employee(?:_id)?\s*\(|\b[a-z][a-z0-9_]*\.self_read\b/i;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const context = await createContext(process.argv.slice(2), usage);
  const report = await buildRlsSpecCoverage(context.repoRoot, context.round);

  if (context.options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    await writeText(
      join(context.auditRoot, 'diag', `round-${context.round}`, 'rls-spec-coverage.md'),
      renderMarkdown(report),
      {
        dryRun: context.dryRun,
        repoRoot: context.repoRoot,
      },
    );
    console.log(
      `[audit-rls-spec-coverage] coverage=${report.coveragePercent}% rlsTables=${report.totals.rlsTables} missingCross=${report.missing.crossTenant.length} missingSelf=${report.missing.selfOnly.length} selfExceptions=${report.exceptions.selfOnly.length}`,
    );
  }

  process.exitCode = report.ok ? 0 : 1;
}

export async function buildRlsSpecCoverage(repoRoot, round = '0') {
  const digest = await readSchemaDigest(repoRoot, round);
  const rlsTables = uniqueSorted(digest.content.rls?.enabled_tables ?? []);
  if (rlsTables.length === 0) {
    throw new Error('schema digest does not contain rls.enabled_tables');
  }

  const rlsTableSet = new Set(rlsTables);
  const specs = await readRlsSpecs(repoRoot, rlsTableSet);
  const selfRequiredTables = findSelfRequiredTables(digest.content, rlsTableSet);
  const tableCoverage = rlsTables.map((table) =>
    buildTableCoverage(table, specs, selfRequiredTables),
  );

  const missingCrossTenant = tableCoverage
    .filter((table) => table.crossTenantSpecs.length === 0)
    .map((table) => table.table);
  const missingSelfOnly = tableCoverage
    .filter((table) => table.selfOnlyRequired && table.selfOnlySpecs.length === 0)
    .map((table) => table.table);
  const selfOnlyExceptions = tableCoverage
    .filter((table) => table.selfOnlyException)
    .map((table) => ({
      table: table.table,
      reason: table.selfOnlyException.reason,
      evidence: table.selfOnlyException.evidence,
    }));

  const crossCovered = tableCoverage.length - missingCrossTenant.length;
  const selfCovered = tableCoverage.filter(
    (table) =>
      (table.selfOnlyRequired && table.selfOnlySpecs.length > 0) || table.selfOnlyException,
  ).length;
  const totalCoverageUnits = tableCoverage.length * 2;
  const coveredUnits = crossCovered + selfCovered;

  return {
    generated_by: 'scripts/audit.mjs rls-spec-coverage',
    round: String(round),
    schemaDigest: digest.relativePath,
    ok: missingCrossTenant.length === 0 && missingSelfOnly.length === 0,
    coveragePercent: percent(coveredUnits, totalCoverageUnits),
    totals: {
      rlsTables: tableCoverage.length,
      specFiles: specs.length,
      crossTenantCovered: crossCovered,
      crossTenantRequired: tableCoverage.length,
      crossTenantCoveragePercent: percent(crossCovered, tableCoverage.length),
      selfOnlyCovered: tableCoverage.filter(
        (table) => table.selfOnlyRequired && table.selfOnlySpecs.length > 0,
      ).length,
      selfOnlyRequired: selfRequiredTables.size,
      documentedSelfOnlyExceptions: selfOnlyExceptions.length,
      effectiveSelfOnlyCoveragePercent: percent(selfCovered, tableCoverage.length),
    },
    missing: {
      crossTenant: missingCrossTenant,
      selfOnly: missingSelfOnly,
    },
    exceptions: {
      selfOnly: selfOnlyExceptions,
    },
    specs,
    tables: tableCoverage,
  };
}

function buildTableCoverage(table, specs, selfRequiredTables) {
  const crossTenantSpecs = specs
    .filter((spec) => spec.crossTenant && spec.tables.includes(table))
    .map((spec) => spec.file);
  const selfOnlySpecs = specs
    .filter((spec) => spec.selfOnly && spec.tables.includes(table))
    .map((spec) => spec.file);
  const selfOnlyRequired = selfRequiredTables.has(table);

  return {
    table,
    crossTenantSpecs,
    selfOnlySpecs,
    selfOnlyRequired,
    selfOnlyException: selfOnlyRequired
      ? null
      : {
          reason: 'No accepted self-only RLS policy in schema digest.',
          evidence:
            'No policy body for this table contains sgp_current_employee_id() or a *.self_read permission; tenant/RBAC isolation remains cross-tenant spec coverage.',
        },
  };
}

async function readSchemaDigest(repoRoot, round) {
  const explicit = join(
    repoRoot,
    'docs',
    'gov',
    'audit',
    'inv',
    `round-${round}`,
    'schema-digest.json',
  );
  const candidates = [];
  if (await exists(explicit)) {
    candidates.push(explicit);
  }

  const invRoot = join(repoRoot, 'docs', 'gov', 'audit', 'inv');
  for (const roundDir of await listRoundDirs(invRoot)) {
    const candidate = join(invRoot, roundDir, 'schema-digest.json');
    if (candidate !== explicit && (await exists(candidate))) {
      candidates.push(candidate);
    }
  }

  const first = candidates[0];
  if (!first) {
    throw new Error('could not find docs/gov/audit/inv/round-*/schema-digest.json');
  }

  return {
    content: JSON.parse(await readText(first)),
    relativePath: repoRelative(repoRoot, first),
  };
}

async function listRoundDirs(invRoot) {
  let entries = [];
  try {
    entries = await readdir(invRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => /^round-\d+$/.test(name))
    .sort((left, right) => Number(right.slice(6)) - Number(left.slice(6)));
}

async function readRlsSpecs(repoRoot, rlsTableSet) {
  const rlsDir = join(repoRoot, 'tests', 'rls');
  let entries = [];
  try {
    entries = await readdir(rlsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const specs = [];
  for (const entry of entries
    .filter((item) => item.isFile() && item.name.endsWith('.spec.ts'))
    .sort((left, right) => left.name.localeCompare(right.name))) {
    const filePath = join(rlsDir, entry.name);
    const text = await readText(filePath);
    specs.push({
      file: repoRelative(repoRoot, filePath),
      crossTenant: isCrossTenantSpec(entry.name, text),
      selfOnly: isSelfOnlySpec(entry.name, text),
      tables: extractReferencedTables(text, rlsTableSet),
    });
  }

  return specs;
}

function isCrossTenantSpec(fileName, text) {
  return CROSS_TENANT_SPEC_PATTERN.test(fileName) || /\bCross Tenant\b/.test(text);
}

function isSelfOnlySpec(fileName, text) {
  return SELF_ONLY_SPEC_PATTERN.test(fileName) || SELF_ONLY_CONTENT_PATTERN.test(text);
}

function extractReferencedTables(text, rlsTableSet) {
  const tables = [];
  for (const match of text.matchAll(QUALIFIED_TABLE_PATTERN)) {
    const table = match[0];
    if (rlsTableSet.has(table)) {
      tables.push(table);
    }
  }
  return uniqueSorted(tables);
}

function findSelfRequiredTables(schemaDigest, rlsTableSet) {
  const tables = new Set();
  for (const policy of schemaDigest.rls?.policies ?? []) {
    if (!rlsTableSet.has(policy.table)) continue;
    if (SELF_ONLY_POLICY_PATTERN.test(policy.body ?? '')) {
      tables.add(policy.table);
    }
  }
  return tables;
}

function percent(numerator, denominator) {
  if (denominator === 0) return 100;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function renderMarkdown(report) {
  return [
    '# RLS Spec Coverage',
    '',
    `Round: ${report.round}`,
    `Schema digest: ${report.schemaDigest}`,
    `Coverage: ${report.coveragePercent}%`,
    '',
    markdownTable(
      ['Metric', 'Value'],
      [
        ['RLS tables', report.totals.rlsTables],
        ['Spec files', report.totals.specFiles],
        ['Cross-tenant covered', report.totals.crossTenantCovered],
        ['Cross-tenant required', report.totals.crossTenantRequired],
        ['Cross-tenant coverage', `${report.totals.crossTenantCoveragePercent}%`],
        ['Self-only required by policy digest', report.totals.selfOnlyRequired],
        ['Self-only covered', report.totals.selfOnlyCovered],
        ['Documented self-only exceptions', report.totals.documentedSelfOnlyExceptions],
        ['Effective self-only coverage', `${report.totals.effectiveSelfOnlyCoveragePercent}%`],
      ],
    ),
    '',
    '## Missing Cross-Tenant Coverage',
    '',
    report.missing.crossTenant.length === 0
      ? 'None.'
      : markdownTable(
          ['Table'],
          report.missing.crossTenant.map((table) => [table]),
        ),
    '',
    '## Missing Self-Only Coverage',
    '',
    report.missing.selfOnly.length === 0
      ? 'None.'
      : markdownTable(
          ['Table'],
          report.missing.selfOnly.map((table) => [table]),
        ),
    '',
    '## Documented Self-Only Exceptions',
    '',
    report.exceptions.selfOnly.length === 0
      ? 'None.'
      : markdownTable(
          ['Table', 'Reason', 'Evidence'],
          report.exceptions.selfOnly.map((exception) => [
            exception.table,
            exception.reason,
            exception.evidence,
          ]),
        ),
    '',
    '## Table Coverage',
    '',
    markdownTable(
      ['Table', 'Cross-Tenant Specs', 'Self-Only Specs', 'Self-Only Status'],
      report.tables.map((table) => [
        table.table,
        table.crossTenantSpecs.join('<br>') || 'MISSING',
        table.selfOnlySpecs.join('<br>') || '-',
        table.selfOnlyRequired ? 'required' : 'documented exception',
      ]),
    ),
  ].join('\n');
}
