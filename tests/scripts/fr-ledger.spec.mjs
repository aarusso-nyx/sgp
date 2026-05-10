import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import test from 'node:test';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const auditScript = join(repoRoot, 'scripts', 'audit.mjs');

test('preserves an existing addendum byte-identical when no new FR-IDs are extracted', async () => {
  const fixtureRoot = await makeFixture('fr-ledger-preserve');
  try {
    const existingLedger = ledgerWithAddendum([curatedPayrollRow()]);
    await writeFixture(fixtureRoot, existingLedger, [
      domainFile('payroll-benefits.md', 'Payroll And Benefits', ['Payroll Monthly Calculation']),
    ]);

    const result = await runFrAudit(fixtureRoot);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');

    const refreshedLedger = await readFile(
      join(fixtureRoot, 'out', 'functional-requisites.md'),
      'utf8',
    );
    assert.equal(extractAddendum(refreshedLedger), extractAddendum(existingLedger));
    assert.equal(refreshedLedger.includes('## Newly Extracted (round 15)'), false);
  } finally {
    await rm(fixtureRoot, { force: true, recursive: true });
  }
});

test('emits newly extracted FR-IDs in an advisory subsection', async () => {
  const fixtureRoot = await makeFixture('fr-ledger-new');
  try {
    await writeFixture(fixtureRoot, ledgerWithAddendum([curatedPayrollRow()]), [
      domainFile('payroll-benefits.md', 'Payroll And Benefits', [
        'Payroll Monthly Calculation',
        'Bank Remittance',
      ]),
      domainFile('people-recruitment.md', 'People And Recruitment', ['Public Recruitment Appeals']),
    ]);

    const result = await runFrAudit(fixtureRoot);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /^audit:fr: 2 new FR-IDs need classification\n$/);

    const refreshedLedger = await readFile(
      join(fixtureRoot, 'out', 'functional-requisites.md'),
      'utf8',
    );
    const advisoryIndex = refreshedLedger.indexOf('## Newly Extracted (round 15)');
    const mainTableIndex = lastTableHeaderIndex(refreshedLedger);

    assert.notEqual(advisoryIndex, -1);
    assert.ok(advisoryIndex < mainTableIndex);
    assert.match(
      refreshedLedger,
      rowPattern(stableHeadingId('payroll-benefits.md', 'Bank Remittance'), 'TODO'),
    );
    assert.match(
      refreshedLedger,
      rowPattern(stableHeadingId('people-recruitment.md', 'Public Recruitment Appeals'), 'TODO'),
    );
    assert.match(
      refreshedLedger,
      rowPattern(stableHeadingId('payroll-benefits.md', 'Payroll Monthly Calculation'), 'DONE'),
    );
  } finally {
    await rm(fixtureRoot, { force: true, recursive: true });
  }
});

async function makeFixture(name) {
  return mkdtemp(join(tmpdir(), `sgp-${name}-`));
}

async function writeFixture(root, ledger, domains) {
  const outputRoot = join(root, 'out');
  const domainsRoot = join(root, 'docs', 'eng', 'domains');
  await mkdir(outputRoot, { recursive: true });
  await mkdir(domainsRoot, { recursive: true });
  await writeFile(join(outputRoot, 'functional-requisites.md'), ledger, 'utf8');
  for (const domain of domains) {
    await writeFile(join(domainsRoot, domain.fileName), domain.markdown, 'utf8');
  }
}

function domainFile(fileName, title, headings) {
  const markdown = [
    `# ${title} Domain Authority`,
    '',
    '## Merged Artifact Index',
    '',
    ...headings.flatMap((heading) => [`## ${heading}`, '']),
  ].join('\n');
  return { fileName, markdown };
}

function curatedPayrollRow() {
  return [
    stableHeadingId('payroll-benefits.md', 'Payroll Monthly Calculation'),
    'Payroll And Benefits: Payroll Monthly Calculation',
    'DONE',
    'docs/gov/audit/payroll-proof.md:1',
    'source=backend command=npm-test rationale=curated',
  ];
}

function ledgerWithAddendum(rows) {
  return [
    '# Functional Requisites',
    '',
    'Last refreshed from `docs/eng/domains/*.md` for round 14.',
    '',
    'Assessment addendum:',
    '',
    '- Preserve this curated prose exactly.',
    '- Keep blank lines and punctuation intact.',
    '',
    '| FR-ID | Requirement | Status | Evidence | Notes |',
    '| --- | --- | --- | --- | --- |',
    ...rows.map((row) => `| ${row.join(' | ')} |`),
    '',
  ].join('\n');
}

function extractAddendum(markdown) {
  const titleEnd = markdown.indexOf('\n');
  const tableStart = markdown.search(/\n\|\s*FR-ID\s*\|/);
  assert.notEqual(titleEnd, -1);
  assert.notEqual(tableStart, -1);
  return markdown.slice(titleEnd, tableStart + 1);
}

function lastTableHeaderIndex(markdown) {
  const matches = [...markdown.matchAll(/\n\|\s*FR-ID\s*\|/g)];
  assert.ok(matches.length > 0);
  return matches.at(-1).index;
}

function rowPattern(id, status) {
  return new RegExp(
    `\\|\\s+${escapeRegExp(id)}\\s+\\|\\s+[^|]+\\|\\s+${status}\\s+\\|\\s+[^|]+\\|\\s+[^|]+\\|`,
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stableHeadingId(fileName, heading) {
  const domainCode = fileName
    .replace(/\.md$/i, '')
    .split('-')
    .map((word) => word[0])
    .join('')
    .toUpperCase();
  const headingSlug = heading
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
  const digest = createHash('sha1')
    .update(`${fileName}:${headingSlug}`)
    .digest('hex')
    .toUpperCase()
    .slice(0, 6);
  return `FR-${domainCode}-${digest}`;
}

function runFrAudit(fixtureRoot) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      process.execPath,
      [
        auditScript,
        'fr',
        '--repo-root',
        fixtureRoot,
        '--output-root',
        join(fixtureRoot, 'out'),
        '--round',
        '15',
      ],
      { cwd: repoRoot },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (status) => {
      resolvePromise({ status, stdout, stderr });
    });
  });
}
