import { execFile as execFileCallback } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const repoRoot = resolve(new URL('../..', import.meta.url).pathname);

describe('rls-no-write-guard', () => {
  let fixtureRoot;

  afterEach(async () => {
    if (fixtureRoot) await rm(fixtureRoot, { force: true, recursive: true });
  });

  test('passes when the fixture only has SELECT reads', async () => {
    fixtureRoot = await makeFixture(`
      export const sql = \`
        SELECT id, code
        FROM fiscal.gps_payment_code
        WHERE active = true
      \`;
    `);

    const result = await runGuard(fixtureRoot);

    assert.match(result.stdout, /\[rls-no-write-guard\] OK/);
  });

  test('fails when a fixture inserts into fiscal.gps_payment_code', async () => {
    fixtureRoot = await makeFixture(`
      export const sql = \`
        INSERT INTO fiscal.gps_payment_code (id, code)
        VALUES ($1::uuid, $2::text)
      \`;
    `);

    await assert.rejects(runGuard(fixtureRoot), {
      code: 1,
      stderr: /INSERT INTO fiscal\.gps_payment_code/,
    });
  });

  test('passes when a write has an explicit allow annotation', async () => {
    fixtureRoot = await makeFixture(`
      // rls-allow-write: fixture exercises the explicit override path.
      export const sql = \`
        INSERT INTO fiscal.gps_payment_code (id, code)
        VALUES ($1::uuid, $2::text)
      \`;
    `);

    const result = await runGuard(fixtureRoot);

    assert.match(result.stdout, /\[rls-no-write-guard\] OK/);
  });

  test('ignores framework-owned shared public catalogs', async () => {
    fixtureRoot = await makeFixture(
      `
      export const sql = \`
        DELETE FROM public.profile_permission
        WHERE profile_id = $1::uuid
      \`;
    `,
      [
        '| fiscal.gps_payment_code | 9 | id | 0 | no | database/sql/10-04-fiscal-ddl.sql |',
        '| public.permission | 9 | id | 0 | no | database/sql/10-10-public-ddl.sql |',
        '| public.profile_permission | 5 | id | 2 | no | database/sql/10-10-public-ddl.sql |',
        '| public.tenant | 9 | id | 0 | no | database/sql/10-10-public-ddl.sql |',
      ],
    );

    const result = await runGuard(fixtureRoot);

    assert.match(result.stdout, /\[rls-no-write-guard\] OK/);
    assert.match(result.stdout, /fiscal\.gps_payment_code/);
    assert.doesNotMatch(result.stdout, /public\.profile_permission/);
  });
});

async function makeFixture(
  source,
  digestRows = [
    '| fiscal.gps_payment_code | 9 | id | 0 | no | database/sql/10-04-fiscal-ddl.sql |',
  ],
) {
  const root = await mkdtemp(join(tmpdir(), 'sgp-rls-no-write-guard-'));
  await writeFixtureFile(
    root,
    'docs/gov/audit/schema-digest.md',
    [
      '# Schema Digest',
      '',
      '| Table | Columns | PK | FKs | RLS | Source |',
      '| --- | ---: | --- | ---: | --- | --- |',
      ...digestRows,
      '',
    ].join('\n'),
  );
  await writeFixtureFile(root, 'backend/src/fixture.service.ts', source);
  await writeFixtureFile(
    root,
    'database/sql/10-04-fiscal-ddl.sql',
    [
      'CREATE SCHEMA fiscal;',
      'CREATE TABLE fiscal.gps_payment_code (id uuid PRIMARY KEY, code text NOT NULL);',
    ].join('\n'),
  );
  return root;
}

async function writeFixtureFile(root, relativePath, content) {
  const path = join(root, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
}

async function runGuard(cwd) {
  return execFile(
    process.execPath,
    [join(repoRoot, 'scripts/lib/checks/db/rls-no-write-guard.mjs')],
    {
      cwd,
    },
  );
}
