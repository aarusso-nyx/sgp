import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  cleanupFixture,
  makeFixture,
  readMarkdownHeader,
  runAuditCommand,
} from './audit-test-helpers';

describe('audit-fr-ledger', () => {
  let fixtureRoot: string;

  afterEach(async () => {
    if (fixtureRoot) await cleanupFixture(fixtureRoot);
  });

  it('refreshes the functional requisite ledger and delta', async () => {
    fixtureRoot = await makeFixture('audit-fr-ledger');
    await writeDomainFixture(fixtureRoot);

    await runAuditCommand('fr', fixtureRoot);

    await expect(readMarkdownHeader(join(fixtureRoot, 'out', 'functional-requisites.md'))).resolves
      .toMatchInlineSnapshot(`
      [
        "# Functional Requisites",
        "",
        "Last refreshed from \`docs/eng/domains/*.md\` for round 7.",
        "",
      ]
    `);
    await expect(readMarkdownHeader(join(fixtureRoot, 'out', 'diag', 'round-7', 'fr-delta.md')))
      .resolves.toMatchInlineSnapshot(`
      [
        "# Functional Requisites Delta",
        "",
        "Round: 7",
        "",
      ]
    `);

    const ledger = await readFile(join(fixtureRoot, 'out', 'functional-requisites.md'), 'utf8');
    expect(ledger).toMatch(
      rowPattern(
        stableHeadingId('payroll-benefits.md', 'Payroll Monthly Calculation'),
        'Payroll And Benefits: Payroll Monthly Calculation',
        'docs/eng/domains/payroll-benefits.md:5',
      ),
    );
    expect(ledger).toMatch(
      rowPattern(
        stableHeadingId('people-recruitment.md', 'Public Recruitment Appeals'),
        'People And Recruitment: Public Recruitment Appeals',
        'docs/eng/domains/people-recruitment.md:5',
      ),
    );
    expect(ledger).not.toContain('People API route surface with audit evidence.');
    expect(ledger.match(/Payroll And Benefits: Payroll Monthly Calculation/g) ?? []).toHaveLength(
      1,
    );
  });
});

async function writeDomainFixture(root: string): Promise<void> {
  const domainsRoot = join(root, 'docs', 'eng', 'domains');
  await mkdir(domainsRoot, { recursive: true });
  await writeFile(
    join(domainsRoot, 'payroll-benefits.md'),
    [
      '# Payroll And Benefits Domain Authority',
      '',
      '## Merged Artifact Index',
      '',
      '## Payroll Monthly Calculation',
      '',
      '### Calculation Rules',
      '',
      '## Payroll Monthly Calculation',
      '',
      '## Bank Remittance',
      '',
    ].join('\n'),
    'utf8',
  );
  await writeFile(
    join(domainsRoot, 'people-recruitment.md'),
    [
      '# People And Recruitment Domain Authority',
      '',
      '## Merged Artifact Index',
      '',
      '## Public Recruitment Appeals',
      '',
    ].join('\n'),
    'utf8',
  );
}

function rowPattern(id: string, requirement: string, evidence: string): RegExp {
  return new RegExp(
    `\\|\\s+${escapeRegExp(id)}\\s+\\|\\s+${escapeRegExp(
      requirement,
    )}(?: \\([^|]+\\))?\\s+\\|\\s+TODO\\s+\\|\\s+${escapeRegExp(
      evidence,
    )}\\s+\\|\\s+Generated from docs/eng domain heading\\.\\s+\\|`,
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stableHeadingId(fileName: string, heading: string): string {
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
