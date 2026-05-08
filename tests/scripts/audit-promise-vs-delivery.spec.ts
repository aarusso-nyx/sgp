import { join } from 'node:path';
import { readFile } from 'node:fs/promises';

import {
  cleanupFixture,
  makeFixture,
  readMarkdownHeader,
  runAuditCommand,
} from './audit-test-helpers';

describe('audit-promise-vs-delivery', () => {
  let fixtureRoot: string;

  afterEach(async () => {
    if (fixtureRoot) await cleanupFixture(fixtureRoot);
  });

  it('validates evidence paths for DONE rows and reports PARTIAL dimensions', async () => {
    fixtureRoot = await makeFixture('audit-promise-vs-delivery');
    await runAuditCommand('pvd', fixtureRoot);

    await expect(
      readMarkdownHeader(join(fixtureRoot, 'out', 'diag', 'round-7', 'promise-vs-delivery.md')),
    ).resolves.toMatchInlineSnapshot(`
      [
        "# Promise vs Delivery",
        "",
        "Round: 7",
        "",
      ]
    `);

    const report = await readFile(
      join(fixtureRoot, 'out', 'diag', 'round-7', 'promise-vs-delivery.md'),
      'utf8',
    );
    expect(report).toMatch(
      /\|\s+FR-001\s+\|\s+DONE\s+\|\s+ok\s+\|\s+People route source, focused e2e, command, and audit note prove the accepted behavior\.\s+\|/,
    );
    expect(report).toMatch(/\|\s+FR-002\s+\|\s+PARTIAL\s+\|\s+missing-proof-metadata\s+\|/);
    expect(report).toContain('test, command, audit, rationale');
  });
});
