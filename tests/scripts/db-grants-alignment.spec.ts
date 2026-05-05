import { execFile as execFileCallback } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

import { repoRoot } from './audit-test-helpers';

const execFile = promisify(execFileCallback);

describe('db grants alignment check', () => {
  let fixtureRoot: string;

  afterEach(async () => {
    if (fixtureRoot) await rm(fixtureRoot, { force: true, recursive: true });
  });

  it('accepts the current runtime grants baseline', async () => {
    fixtureRoot = await makeFixture(await currentGrantsSql());

    const result = await runGrantsAlignment(fixtureRoot);

    expect(result.stdout).toContain('[grants-alignment] OK');
  });

  it('rejects unexpected portal grants outside the portal schema', async () => {
    fixtureRoot = await makeFixture(
      `${await currentGrantsSql()}\nGRANT SELECT ON ALL TABLES IN SCHEMA hr TO sgp_portal_api;\n`,
    );

    await expect(runGrantsAlignment(fixtureRoot)).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining(
        'unexpected grant SELECT on all_tables_in_schema hr to sgp_portal_api',
      ),
    });
  });

  it('requires high-risk immutable-table revokes', async () => {
    fixtureRoot = await makeFixture(
      (await currentGrantsSql()).replace(
        '    REVOKE UPDATE, DELETE ON public.audit_event FROM sgp_app_role;\n',
        '',
      ),
    );

    await expect(runGrantsAlignment(fixtureRoot)).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('missing revoke DELETE on table public.audit_event'),
    });
  });
});

async function currentGrantsSql(): Promise<string> {
  return readFile(join(repoRoot, 'database/sql/90-runtime-grants.sql'), 'utf8');
}

async function makeFixture(grantsSql: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'sgp-grants-alignment-'));
  const path = join(root, 'database/sql/90-runtime-grants.sql');
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, grantsSql, 'utf8');
  return root;
}

async function runGrantsAlignment(cwd: string): Promise<{ stdout: string; stderr: string }> {
  return execFile(
    process.execPath,
    [join(repoRoot, 'scripts/lib/checks/db/grants-alignment.mjs')],
    {
      cwd,
    },
  );
}
