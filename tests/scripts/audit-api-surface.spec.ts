import { join } from 'node:path';

import {
  cleanupFixture,
  makeFixture,
  readJson,
  readMarkdownHeader,
  runAuditCommand,
} from './audit-test-helpers';

describe('audit-api-surface', () => {
  let fixtureRoot: string;

  afterEach(async () => {
    if (fixtureRoot) await cleanupFixture(fixtureRoot);
  });

  it('renders route summaries and skips missing checker scripts', async () => {
    fixtureRoot = await makeFixture('audit-api-surface');
    await runAuditCommand('api', fixtureRoot);

    const json = await readJson<{
      routes: Array<{ path: string; tag: string }>;
      checks: Array<{ ok: boolean | null }>;
    }>(join(fixtureRoot, 'out', 'inv', 'round-7', 'api-surface.json'));
    expect(json.routes.map((route) => route.path)).toContain('/api/v1/people');
    expect(json.routes).toContainEqual(
      expect.objectContaining({
        path: '/api/v1/spec-tagged',
        tag: 'Spec Tagged',
      }),
    );
    expect(json.checks.every((check) => check.ok === null)).toBe(true);
    await expect(readMarkdownHeader(join(fixtureRoot, 'out', 'api-surface.md'))).resolves
      .toMatchInlineSnapshot(`
      [
        "# API Surface",
        "",
        "Round: 7",
        "",
      ]
    `);
  });
});
