#!/usr/bin/env node

import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { parseTemplate } from '@angular/compiler';

import {
  createContext,
  listFiles,
  markdownTable,
  readText,
  repoRelative,
  writeJson,
  writeText,
} from '../audit-utils.mjs';

const usage = `
Usage: node scripts/audit.mjs fe-i18n [--round <n>] [--json] [--dry-run] [--output-root <path>] [--repo-root <path>]

Baseline hard-coded frontend feature strings that should be moved into i18n coverage.
`;

const TRANSLATABLE_ATTRIBUTES = new Set([
  'aria-label',
  'placeholder',
  'title',
  'alt',
  'matTooltip',
]);
const IGNORED_TEXT_HOSTS = new Set(['mat-icon', 'code', 'pre', 'script', 'style']);
const TS_UI_CONTEXT_PATTERN =
  /\b(?:label|title|subtitle|description|placeholder|tooltip|ariaLabel|button|action|message|empty|error|success|warning|header|breadcrumb|tab|caption|summary)\b\s*[:=]/i;
const TS_STRING_PATTERN =
  /(?<![A-Za-z0-9_$])(?<quote>['"`])(?<value>(?:\\.|(?!\k<quote>)[\s\S])*?)\k<quote>/g;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const context = await createContext(process.argv.slice(2), usage);
  const report = await buildFrontendI18nCoverage(context.repoRoot, context.round);

  if (context.options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    await writeJson(
      join(context.auditRoot, 'inv', `round-${context.round}`, 'fe-i18n-coverage.json'),
      report,
      {
        dryRun: context.dryRun,
        repoRoot: context.repoRoot,
      },
    );
    await writeText(
      join(context.auditRoot, 'diag', `round-${context.round}`, 'fe-i18n-coverage.md'),
      renderMarkdown(report),
      {
        dryRun: context.dryRun,
        repoRoot: context.repoRoot,
      },
    );
    console.log(
      `[audit-fe-i18n] ${report.totalFindings} hard-coded feature string candidates across ${report.featureCount} features`,
    );
  }

  process.exitCode = 0;
}

export async function buildFrontendI18nCoverage(repoRoot, round = '0') {
  const featuresRoot = join(repoRoot, 'frontend', 'src', 'app', 'features');
  const files = await listFiles(featuresRoot, { ext: ['.html', '.ts'] });
  const scanFiles = files.filter((file) => !file.endsWith('.spec.ts'));
  const findings = [];

  for (const file of scanFiles) {
    if (file.endsWith('.html')) {
      findings.push(...(await collectTemplateFindings(repoRoot, file)));
    } else if (file.endsWith('.ts')) {
      findings.push(...(await collectTypescriptFindings(repoRoot, file)));
    }
  }

  const byFeature = summarizeByFeature(findings);
  const byKind = summarizeByKey(findings, 'kind');
  const topFiles = summarizeByFile(findings).slice(0, 20);

  return {
    generated_by: 'scripts/audit.mjs fe-i18n',
    round: String(round),
    featuresRoot: 'frontend/src/app/features',
    featureCount: byFeature.length,
    checkedFiles: scanFiles.length,
    totalFindings: findings.length,
    byKind,
    byFeature,
    topFiles,
    sampleFindings: findings.slice(0, 100),
    exceptions: [
      'Spec files are excluded.',
      'mat-icon/code/pre/script/style text is excluded.',
      'TypeScript findings are limited to literal strings in likely UI metadata contexts.',
      'Dynamic backend/business messages are reported only when they appear in frontend UI metadata.',
    ],
  };
}

async function collectTemplateFindings(repoRoot, file) {
  const relativeFile = repoRelative(repoRoot, file);
  const content = await readText(file);
  const parsed = parseTemplate(content, relativeFile, { preserveWhitespaces: true });
  const findings = [];

  if (parsed.errors?.length) {
    return parsed.errors.map((error) => ({
      feature: featureName(relativeFile),
      file: relativeFile,
      line: error.span?.start?.line ? error.span.start.line + 1 : 1,
      kind: 'template-parse-error',
      text: error.msg,
    }));
  }

  for (const node of parsed.nodes) {
    checkTemplateNode(
      node,
      {
        feature: featureName(relativeFile),
        file: relativeFile,
        hostName: undefined,
        inI18n: false,
      },
      findings,
    );
  }

  return findings;
}

function checkTemplateNode(node, context, findings) {
  const nodeName = node.name ?? context.hostName;
  const inI18n = context.inI18n || Boolean(node.i18n);
  const ignoreHost = IGNORED_TEXT_HOSTS.has(nodeName);

  if (node.constructor?.name === 'Text' && !ignoreHost && !inI18n && hasLiteralText(node.value)) {
    findings.push({
      feature: context.feature,
      file: context.file,
      line: lineFromSourceSpan(node.sourceSpan),
      kind: 'template-text',
      text: normalizeSnippet(node.value),
    });
  }

  if (
    node.constructor?.name === 'BoundText' &&
    !ignoreHost &&
    !inI18n &&
    typeof node.value?.source === 'string' &&
    hasLiteralText(node.value.source)
  ) {
    findings.push({
      feature: context.feature,
      file: context.file,
      line: lineFromSourceSpan(node.sourceSpan),
      kind: 'template-bound-text',
      text: normalizeSnippet(node.value.source),
    });
  }

  for (const attribute of node.attributes ?? []) {
    if (
      TRANSLATABLE_ATTRIBUTES.has(attribute.name) &&
      !attribute.i18n &&
      hasLiteralText(attribute.value ?? '')
    ) {
      findings.push({
        feature: context.feature,
        file: context.file,
        line: lineFromSourceSpan(attribute.sourceSpan ?? node.sourceSpan),
        kind: 'template-attribute',
        text: `${attribute.name}="${normalizeSnippet(attribute.value)}"`,
      });
    }
  }

  for (const child of node.children ?? []) {
    checkTemplateNode(
      child,
      {
        feature: context.feature,
        file: context.file,
        hostName: nodeName,
        inI18n,
      },
      findings,
    );
  }
}

async function collectTypescriptFindings(repoRoot, file) {
  const relativeFile = repoRelative(repoRoot, file);
  const content = await readText(file);
  const findings = [];
  const lines = content.split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    if (!TS_UI_CONTEXT_PATTERN.test(line) || isIgnoredTypescriptLine(line)) continue;

    for (const match of line.matchAll(TS_STRING_PATTERN)) {
      const value = unescapeSnippet(match.groups?.value ?? '');
      if (!hasLiteralText(value) || isLikelyNonUiString(value)) continue;
      findings.push({
        feature: featureName(relativeFile),
        file: relativeFile,
        line: index + 1,
        kind: 'typescript-ui-literal',
        text: normalizeSnippet(value),
      });
    }
  }

  return findings;
}

function isIgnoredTypescriptLine(line) {
  return (
    /^\s*import\b/.test(line) ||
    /\b(?:templateUrl|styleUrls?|selector|standalone|imports|providers|path|redirectTo)\s*:/.test(
      line,
    )
  );
}

function isLikelyNonUiString(value) {
  const normalized = value.trim();
  return (
    normalized.length < 2 ||
    normalized.startsWith('/') ||
    normalized.startsWith('./') ||
    normalized.startsWith('../') ||
    /^[A-Za-z0-9_.-]+$/.test(normalized) ||
    /^https?:\/\//.test(normalized) ||
    /^@@/.test(normalized)
  );
}

function hasLiteralText(value) {
  const literal = String(value ?? '')
    .replace(/{{[^}]*}}/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(literal);
}

function unescapeSnippet(value) {
  return value.replace(/\\n/g, ' ').replace(/\\r/g, ' ').replace(/\\t/g, ' ');
}

function normalizeSnippet(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);
}

function lineFromSourceSpan(span) {
  return typeof span?.start?.line === 'number' ? span.start.line + 1 : 1;
}

function featureName(relativeFile) {
  return relativeFile.split('/')[4] ?? 'unknown';
}

function summarizeByFeature(findings) {
  return summarizeByKey(findings, 'feature').map((row) => ({
    feature: row.key,
    findings: row.count,
  }));
}

function summarizeByKey(findings, key) {
  const counts = new Map();
  for (const finding of findings) {
    const value = finding[key] ?? 'unknown';
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ key: value, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

function summarizeByFile(findings) {
  const counts = new Map();
  for (const finding of findings) {
    counts.set(finding.file, (counts.get(finding.file) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([file, count]) => ({ file, count }))
    .sort((a, b) => b.count - a.count || a.file.localeCompare(b.file));
}

function renderMarkdown(report) {
  return [
    '# Frontend i18n Coverage Baseline',
    '',
    `Round: ${report.round}`,
    `Checked files: ${report.checkedFiles}`,
    `Feature roots with findings: ${report.featureCount}`,
    `Hard-coded string candidates: ${report.totalFindings}`,
    '',
    '## Findings By Feature',
    '',
    markdownTable(
      ['Feature', 'Findings'],
      report.byFeature.map((row) => [row.feature, row.findings]),
    ),
    '',
    '## Findings By Kind',
    '',
    markdownTable(
      ['Kind', 'Findings'],
      report.byKind.map((row) => [row.key, row.count]),
    ),
    '',
    '## Top Files',
    '',
    markdownTable(
      ['File', 'Findings'],
      report.topFiles.map((row) => [row.file, row.count]),
    ),
    '',
    '## Sample Findings',
    '',
    markdownTable(
      ['File', 'Line', 'Kind', 'Text'],
      report.sampleFindings.slice(0, 50).map((row) => [row.file, row.line, row.kind, row.text]),
    ),
    '',
    '## Exceptions',
    '',
    ...report.exceptions.map((item) => `- ${item}`),
  ].join('\n');
}
