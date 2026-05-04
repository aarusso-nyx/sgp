import { join } from 'node:path';

import {
  cleanupFixture,
  makeFixture,
  readJson,
  readMarkdownHeader,
  runAuditCommand,
} from './audit-test-helpers';

describe('audit-test-coverage-map', () => {
  let fixtureRoot: string;

  afterEach(async () => {
    if (fixtureRoot) await cleanupFixture(fixtureRoot);
  });

  it('maps spec files to functional requisite IDs', async () => {
    fixtureRoot = await makeFixture('audit-test-coverage-map');
    await runAuditCommand('tests', fixtureRoot);

    const json = await readJson<{ counts: { specs: number; mapped_requisites: number } }>(
      join(fixtureRoot, 'out', 'inv', 'round-7', 'test-coverage-map.json'),
    );
    expect(json.counts.specs).toBeGreaterThanOrEqual(2);
    expect(json.counts.mapped_requisites).toBeGreaterThanOrEqual(1);
    await expect(
      readMarkdownHeader(join(fixtureRoot, 'out', 'inv', 'round-7', 'test-coverage-map.md')),
    ).resolves.toMatchInlineSnapshot(`
      [
        "# Test Coverage Map",
        "",
        "Round: 7",
        "",
      ]
    `);
  });
});
