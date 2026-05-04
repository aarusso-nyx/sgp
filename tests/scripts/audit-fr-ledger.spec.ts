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
    await runAuditCommand('fr', fixtureRoot);

    await expect(readMarkdownHeader(join(fixtureRoot, 'out', 'functional-requisites.md'))).resolves
      .toMatchInlineSnapshot(`
      [
        "# Functional Requisites",
        "",
        "Last refreshed from \`docs/gov/evidence/implementation-status.md\` for round 7.",
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
  });
});
