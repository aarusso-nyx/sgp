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

    const json = await readJson<{
      counts: { specs: number; mapped_requisites: number };
      feature_map: Array<{ fr_id: string; test_count: number; tests: string[] }>;
    }>(join(fixtureRoot, 'out', 'inv', 'round-7', 'test-coverage-map.json'));
    expect(json.counts.specs).toBeGreaterThanOrEqual(2);
    expect(json.counts.mapped_requisites).toBeGreaterThanOrEqual(2);
    expect(json.feature_map).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fr_id: 'FR-003',
          test_count: 1,
          tests: ['tests/backend/tagged-transparency.spec.ts'],
        }),
      ]),
    );
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
