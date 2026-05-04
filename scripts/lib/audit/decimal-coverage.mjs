#!/usr/bin/env node

import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

import {
  createContext,
  listFiles,
  markdownTable,
  readText,
  repoRelative,
  writeText,
} from '../audit-utils.mjs';

const usage = `
Usage: node scripts/audit.mjs decimal [--round <n>] [--json] [--dry-run] [--output-root <path>] [--repo-root <path>]

Report TypeScript money fields typed as number instead of Decimal.
`;

const MONEY_IDENTIFIER_PATTERN =
  /(?:amount|salary|wage|remuneration|earning|deduction|benefit|payment|stipend|allowance|discount|gross|net|liquid|provento|desconto|rubrica)/i;
const SAFE_NUMBER_IDENTIFIER_PATTERN =
  /(?:count|totalRows|rowCount|index|rank|year|month|day|hour|minute|minutes|seconds|cents|percent|percentage|rate|score|points|quantity|version)$/i;
const NUMBER_TYPE_PATTERN = /\b(?<name>[A-Za-z_$][\w$]*)\??\s*:\s*number\b/g;
const EXCLUDED_PATH_PATTERN =
  /(?:\.spec\.ts$|\.e2e-spec\.ts$|\/__fixtures__\/|\/generated\/|\.d\.ts$)/;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const context = await createContext(process.argv.slice(2), usage);
  const report = await buildDecimalCoverage(context.repoRoot, context.round);

  if (context.options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    await writeText(
      join(context.auditRoot, 'diag', `round-${context.round}`, 'decimal-coverage.md'),
      renderMarkdown(report),
      {
        dryRun: context.dryRun,
        repoRoot: context.repoRoot,
      },
    );
    console.log(`[audit-decimal] ${report.violations.length} money-like number declarations found`);
  }

  process.exitCode = report.violations.length === 0 ? 0 : 1;
}

export async function buildDecimalCoverage(repoRoot, round = '0') {
  const sourceRoot = join(repoRoot, 'backend', 'src');
  const files = (await listFiles(sourceRoot, { ext: ['.ts'] })).filter((path) => {
    const relativePath = repoRelative(repoRoot, path);
    return !EXCLUDED_PATH_PATTERN.test(relativePath);
  });
  const violations = [];

  for (const file of files) {
    const relativePath = repoRelative(repoRoot, file);
    const text = await readText(file);
    const lines = text.split(/\r?\n/);
    for (const [lineIndex, line] of lines.entries()) {
      for (const match of line.matchAll(NUMBER_TYPE_PATTERN)) {
        const name = match.groups?.name ?? '';
        if (!MONEY_IDENTIFIER_PATTERN.test(name)) continue;
        if (SAFE_NUMBER_IDENTIFIER_PATTERN.test(name)) continue;

        violations.push({
          file: relativePath,
          line: lineIndex + 1,
          identifier: name,
          snippet: line.trim(),
        });
      }
    }
  }

  return {
    generated_by: 'scripts/audit.mjs decimal',
    round: String(round),
    checkedFiles: files.length,
    violations,
    exceptions: [],
  };
}

function renderMarkdown(report) {
  return [
    '# Decimal Coverage',
    '',
    `Round: ${report.round}`,
    `Checked TypeScript files: ${report.checkedFiles}`,
    `Violations: ${report.violations.length}`,
    '',
    markdownTable(
      ['File', 'Line', 'Identifier', 'Snippet'],
      report.violations.map((row) => [row.file, row.line, row.identifier, row.snippet]),
    ),
  ].join('\n');
}
