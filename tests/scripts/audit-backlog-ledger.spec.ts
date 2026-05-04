import { execFile as execFileCallback } from 'node:child_process';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

import { cleanupFixture, makeFixture, runAuditCommand } from './audit-test-helpers';

const execFile = promisify(execFileCallback);

describe('audit-backlog-ledger', () => {
  let fixtureRoot: string;

  afterEach(async () => {
    if (fixtureRoot) await cleanupFixture(fixtureRoot);
  });

  it('updates a known backlog ledger idempotently', async () => {
    fixtureRoot = await makeFixture('audit-backlog-ledger');
    await runExistingLedgerCommand(fixtureRoot);
    const ledgerPath = join(fixtureRoot, 'docs', 'gov', 'audit', 'backlog-ledger.md');
    const first = await readFile(ledgerPath, 'utf8');
    await runExistingLedgerCommand(fixtureRoot);
    const second = await readFile(ledgerPath, 'utf8');

    expect(second).toEqual(first);
    expect(first).toContain('## Summary');
    expect(first).toContain('| total rows | 1     |');
    expect(first).toContain('| R3-001     | People route | done | done           |');
    expect(first).not.toContain('Round 8');
  });

  it('flags unknown closure IDs when a ledger already exists', async () => {
    fixtureRoot = await makeFixture('audit-backlog-ledger');
    await expect(
      execFile(process.execPath, [
        join(__dirname, '..', '..', 'scripts', 'audit.mjs'),
        'backlog',
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

function runExistingLedgerCommand(
  fixtureRoot: string,
): Promise<{ stdout: string; stderr: string }> {
  return execFile(process.execPath, [
    join(__dirname, '..', '..', 'scripts', 'audit.mjs'),
    'backlog',
    '--repo-root',
    fixtureRoot,
    '--output-root',
    join(fixtureRoot, 'docs', 'gov', 'audit'),
    '--round',
    '7',
  ]);
}
