import { execFile as execFileCallback } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';

import {
  cleanupFixture,
  makeFixture,
  readMarkdownHeader,
  runAuditScript,
} from './audit-test-helpers';

const execFile = promisify(execFileCallback);

describe('audit-backlog-ledger', () => {
  let fixtureRoot: string;

  afterEach(async () => {
    if (fixtureRoot) await cleanupFixture(fixtureRoot);
  });

  it('updates a known backlog ledger idempotently', async () => {
    fixtureRoot = await makeFixture('audit-backlog-ledger');
    await runAuditScript('audit-backlog-ledger.mjs', fixtureRoot);
    const first = await readMarkdownHeader(join(fixtureRoot, 'out', 'backlog-ledger.md'));
    await runAuditScript('audit-backlog-ledger.mjs', fixtureRoot);
    const second = await readMarkdownHeader(join(fixtureRoot, 'out', 'backlog-ledger.md'));

    expect(second).toEqual(first);
    expect(first.slice(0, 2)).toEqual(['# Backlog Ledger', '']);
    expect(first[2]).toContain('closure.json');
  });

  it('flags unknown closure IDs when a ledger already exists', async () => {
    fixtureRoot = await makeFixture('audit-backlog-ledger');
    await expect(
      execFile(process.execPath, [
        join(__dirname, '..', '..', 'scripts', 'audit-backlog-ledger.mjs'),
        '--repo-root',
        fixtureRoot,
        '--output-root',
        join(fixtureRoot, 'docs', 'gov', 'audit'),
        '--round',
        '7',
        '--closure',
        join(fixtureRoot, 'docs', 'work', 'round-7', 'closure-unknown.json'),
      ]),
    ).rejects.toMatchObject({ code: 1 });
  });
});
