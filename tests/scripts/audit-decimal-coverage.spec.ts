import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { cleanupFixture, makeFixture, runAuditCommand } from './audit-test-helpers';

describe('audit-decimal-coverage', () => {
  let fixtureRoot: string;

  afterEach(async () => {
    if (fixtureRoot) await cleanupFixture(fixtureRoot);
  });

  it('detects money-like declarations typed as number', async () => {
    fixtureRoot = await makeFixture('audit-hotspots');
    await writeFixtureFile(
      fixtureRoot,
      'backend/src/payroll/bad-money.ts',
      ['interface BadMoney {', '  grossAmount: number;', '  rowCount: number;', '}'].join('\n'),
    );

    await expect(runAuditCommand('decimal', fixtureRoot, ['--json'])).rejects.toMatchObject({
      code: 1,
    });
  });

  it('passes Decimal and non-money number declarations', async () => {
    fixtureRoot = await makeFixture('audit-hotspots');
    await writeFixtureFile(
      fixtureRoot,
      'backend/src/payroll/good-money.ts',
      [
        "import Decimal from 'decimal.js';",
        'interface GoodMoney {',
        '  grossAmount: Decimal;',
        '  rowCount: number;',
        '  deductionMinutes: number;',
        '}',
      ].join('\n'),
    );

    const result = await runAuditCommand('decimal', fixtureRoot, ['--json']);
    const report = JSON.parse(result.stdout) as { violations: unknown[] };

    expect(report.violations).toEqual([]);
  });
});

async function writeFixtureFile(
  root: string,
  relativePath: string,
  content: string,
): Promise<void> {
  const path = join(root, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
}
