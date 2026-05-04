import { join } from 'node:path';

import {
  cleanupFixture,
  makeFixture,
  readJson,
  readMarkdownHeader,
  runAuditCommand,
} from './audit-test-helpers';

describe('audit-schema-digest', () => {
  let fixtureRoot: string;

  afterEach(async () => {
    if (fixtureRoot) await cleanupFixture(fixtureRoot);
  });

  it('writes schema markdown and JSON from SQL fixtures', async () => {
    fixtureRoot = await makeFixture('audit-schema-digest');
    await runAuditCommand('schema', fixtureRoot);

    const json = await readJson<{ counts: { tables: number; foreign_keys: number } }>(
      join(fixtureRoot, 'out', 'inv', 'round-7', 'schema-digest.json'),
    );
    expect(json.counts.tables).toBe(2);
    expect(json.counts.foreign_keys).toBe(1);
    await expect(readMarkdownHeader(join(fixtureRoot, 'out', 'schema-digest.md'))).resolves
      .toMatchInlineSnapshot(`
      [
        "# Schema Digest",
        "",
        "Round: 7",
        "",
      ]
    `);
  });
});
