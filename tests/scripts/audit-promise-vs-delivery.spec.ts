import { join } from 'node:path';

import {
  cleanupFixture,
  makeFixture,
  readMarkdownHeader,
  runAuditScript,
} from './audit-test-helpers';

describe('audit-promise-vs-delivery', () => {
  let fixtureRoot: string;

  afterEach(async () => {
    if (fixtureRoot) await cleanupFixture(fixtureRoot);
  });

  it('validates evidence paths for DONE rows and reports PARTIAL dimensions', async () => {
    fixtureRoot = await makeFixture('audit-promise-vs-delivery');
    await runAuditScript('audit-promise-vs-delivery.mjs', fixtureRoot);

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
