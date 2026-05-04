import { execFile as execFileCallback } from 'node:child_process';
import { appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import {
  cleanupFixture,
  makeFixture,
  readMarkdownHeader,
  runAuditScript,
} from './audit-test-helpers';

const execFile = promisify(execFileCallback);

describe('audit-hotspots', () => {
  let fixtureRoot: string;

  afterEach(async () => {
    if (fixtureRoot) await cleanupFixture(fixtureRoot);
  });

  it('aggregates git churn since a baseline commit', async () => {
    fixtureRoot = await makeFixture('audit-hotspots');
    await execFile('git', ['init'], { cwd: fixtureRoot });
    await execFile('git', ['config', 'user.email', 'audit@example.invalid'], { cwd: fixtureRoot });
    await execFile('git', ['config', 'user.name', 'Audit Test'], { cwd: fixtureRoot });
    await execFile('git', ['add', '.'], { cwd: fixtureRoot });
    await execFile('git', ['commit', '-m', 'baseline'], { cwd: fixtureRoot });
    const baseline = (
      await execFile('git', ['rev-parse', 'HEAD'], { cwd: fixtureRoot })
    ).stdout.trim();
    await appendFile(
      join(fixtureRoot, 'backend', 'src', 'people.service.ts'),
      '\nexport const changed = true;\n',
    );
    await execFile('git', ['add', '.'], { cwd: fixtureRoot });
    await execFile('git', ['commit', '-m', 'change'], { cwd: fixtureRoot });

    await runAuditScript('audit-hotspots.mjs', fixtureRoot, ['--baseline', baseline]);
    const header = await readMarkdownHeader(
      join(fixtureRoot, 'out', 'diag', 'round-7', 'hotspots.md'),
    );
    expect(header.slice(0, 3)).toEqual(['# Hotspots', '', 'Round: 7']);
    expect(header[3]).toContain(`Baseline: \`${baseline}\``);
  });
});
