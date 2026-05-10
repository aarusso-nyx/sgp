#!/usr/bin/env node

import { join } from 'node:path';

import {
  createContext,
  exists,
  firstTableRows,
  fileStat,
  markdownTable,
  readText,
  writeText,
} from '../audit-utils.mjs';

const usage = `
Usage: node scripts/audit.mjs pvd [--round <n>] [--dry-run] [--output-root <path>] [--repo-root <path>]

Validate DONE/PARTIAL functional requisite evidence paths and emit a promise-vs-delivery diagnostic.
`;

const context = await createContext(process.argv.slice(2), usage);
const pvd = await buildPromiseVsDelivery(context.repoRoot, context.auditRoot, context.round);
await writeText(
  join(context.auditRoot, 'diag', `round-${context.round}`, 'promise-vs-delivery.md'),
  renderMarkdown(pvd),
  {
    dryRun: context.dryRun,
  },
);

export async function buildPromiseVsDelivery(repoRoot, auditRoot, round) {
  const rows = parseFrRows(await readFunctionalRequisites(repoRoot, auditRoot));
  const findings = [];
  for (const row of rows) {
    if (row.status === 'DONE') {
      findings.push(await validatePromoted(repoRoot, row));
    } else if (row.status === 'PARTIAL') {
      findings.push(await validatePromoted(repoRoot, row));
    }
  }
  return {
    generated_by: 'scripts/audit.mjs pvd',
    round,
    counts: {
      checked: findings.length,
      failed: findings.filter((finding) => finding.result !== 'ok').length,
    },
    findings,
  };
}

async function readFunctionalRequisites(repoRoot, auditRoot) {
  const auditLedger = await readText(join(auditRoot, 'functional-requisites.md'));
  if (auditLedger.trim()) return auditLedger;
  return readText(join(repoRoot, 'docs', 'gov', 'audit', 'functional-requisites.md'));
}

function parseFrRows(markdown) {
  return firstTableRows(markdown).map((row) => ({
    id: row['FR-ID'] || row.ID || '',
    requirement: row.Requirement || '',
    status: String(row.Status || '').toUpperCase(),
    evidence: row.Evidence || '',
    notes: row.Notes || '',
  }));
}

async function validatePromoted(repoRoot, row) {
  const proof = parseProof(row);
  const proofFailures = requiredProofFailures(proof, row.status);
  if (proofFailures.length > 0) {
    return {
      fr_id: row.id,
      status: row.status,
      result: 'missing-proof-metadata',
      notes: proofFailures.join(', '),
    };
  }

  const refs = evidenceRefs(proof.text);
  if (refs.length === 0) {
    return {
      fr_id: row.id,
      status: row.status,
      result: 'missing-evidence',
      notes: 'No evidence path found.',
    };
  }
  const failures = [];
  for (const ref of refs) {
    const path = join(repoRoot, ref.path);
    if (!(await exists(path))) {
      failures.push(`${ref.raw}: file missing`);
      continue;
    }
    if (ref.line !== null) {
      const stat = await fileStat(path);
      if (!stat?.isFile()) {
        failures.push(`${ref.raw}: not a file`);
        continue;
      }
      const lineTotal = (await readText(path)).split(/\r?\n/).length;
      if (ref.line > lineTotal) {
        failures.push(`${ref.raw}: line ${ref.line} > ${lineTotal}`);
      }
    }
  }
  return {
    fr_id: row.id,
    status: row.status,
    result: failures.length === 0 ? 'ok' : 'invalid-evidence',
    notes: failures.join('; ') || proof.rationale || refs.map((ref) => ref.raw).join(', '),
  };
}

function evidenceRefs(evidence) {
  const refs = [];
  const regex =
    /(?:`)?(?<path>(?:backend|frontend|database|docs|scripts|tests|infra)\/[^`:\s,;|]+)(?::(?<line>\d+))?(?:`)?/g;
  for (const match of evidence.matchAll(regex)) {
    refs.push({
      raw: match[0].replace(/`/g, ''),
      path: match.groups.path,
      line: match.groups.line ? Number(match.groups.line) : null,
    });
  }
  return refs;
}

function parseProof(row) {
  const text = `${row.evidence || ''}; ${row.notes || ''}`;
  return {
    text,
    source: proofField(text, 'source'),
    test: proofField(text, 'test'),
    command: proofField(text, 'command'),
    audit: proofField(text, 'audit'),
    rationale: proofField(text, 'rationale'),
  };
}

function proofField(text, field) {
  const match = new RegExp(`${field}\\s*=\\s*([^;]+)`, 'i').exec(text);
  return match?.[1]?.trim() ?? '';
}

function requiredProofFailures(proof, status) {
  const failures = [];
  if (!isSourcePath(proof.source)) failures.push('source');
  if (!isTestPath(proof.test)) failures.push('test');
  if (!isCommand(proof.command)) failures.push('command');
  if (!isAuditNotePath(proof.audit)) failures.push('audit');
  if (!proof.rationale || proof.rationale.length < 10) failures.push('rationale');
  if (status === 'DONE' && /partial|todo|blocked/i.test(proof.rationale)) {
    failures.push('rationale-status-mismatch');
  }
  return failures;
}

function isSourcePath(value) {
  return /^(backend|frontend|database|scripts|infra)\/\S+/.test(value);
}

function isTestPath(value) {
  return (
    /^(tests|backend|frontend)\/\S+/.test(value) && /(?:\.spec|\.test|-spec|\/golden\/)/.test(value)
  );
}

function isCommand(value) {
  return /^(npm run|npm -w|node scripts\/|npx )\b/.test(value);
}

function isAuditNotePath(value) {
  return /^docs\/gov\/audit\/\S+/.test(value);
}

function renderMarkdown(pvd) {
  return [
    '# Promise vs Delivery',
    '',
    `Round: ${pvd.round}`,
    '',
    markdownTable(
      ['Metric', 'Count'],
      Object.entries(pvd.counts).map(([key, value]) => [key, value]),
    ),
    '',
    markdownTable(
      ['FR-ID', 'Status', 'Result', 'Notes'],
      pvd.findings.map((finding) => [finding.fr_id, finding.status, finding.result, finding.notes]),
    ),
  ].join('\n');
}
