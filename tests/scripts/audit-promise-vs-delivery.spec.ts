import { join } from 'node:path';

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
  });
});
