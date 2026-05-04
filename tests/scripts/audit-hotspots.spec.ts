import { execFile as execFileCallback } from 'node:child_process';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

import {
  cleanupFixture,
  makeFixture,
  readMarkdownHeader,
  runAuditCommand,
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

    await runAuditCommand('hotspots', fixtureRoot, ['--baseline', baseline]);
    const header = await readMarkdownHeader(
      join(fixtureRoot, 'out', 'diag', 'round-7', 'hotspots.md'),
    );
    expect(header.slice(0, 3)).toEqual(['# Hotspots', '', 'Round: 7']);
    expect(header[3]).toContain(`Baseline: \`${baseline}\``);
  });

  it('excludes cached references and generated JSON from hotspots', async () => {
    fixtureRoot = await makeFixture('audit-hotspots');
    await execFile('git', ['init'], { cwd: fixtureRoot });
    await execFile('git', ['config', 'user.email', 'audit@example.invalid'], { cwd: fixtureRoot });
    await execFile('git', ['config', 'user.name', 'Audit Test'], { cwd: fixtureRoot });
    await execFile('git', ['add', '.'], { cwd: fixtureRoot });
    await execFile('git', ['commit', '-m', 'baseline'], { cwd: fixtureRoot });
    const baseline = (
      await execFile('git', ['rev-parse', 'HEAD'], { cwd: fixtureRoot })
    ).stdout.trim();

    await writeFixtureFile(fixtureRoot, 'docs/refs/legal/law.md', 'cached law text\n'.repeat(80));
    await writeFixtureFile(
      fixtureRoot,
      'frontend/src/app/core/api/generated/openapi-core.json',
      '{"generated":true}\n'.repeat(80),
    );
    await writeFixtureFile(
      fixtureRoot,
      'docs/gov/audit/inv/round-4/schema-digest.json',
      '{"inventory":true}\n'.repeat(80),
    );
    await appendFile(
      join(fixtureRoot, 'backend', 'src', 'people.service.ts'),
      '\nexport const visibleHotspot = true;\n',
    );
    await execFile('git', ['add', '.'], { cwd: fixtureRoot });
    await execFile('git', ['commit', '-m', 'mixed hotspots'], { cwd: fixtureRoot });

    await runAuditCommand('hotspots', fixtureRoot, ['--baseline', baseline]);
    const markdown = await readFile(
      join(fixtureRoot, 'out', 'diag', 'round-7', 'hotspots.md'),
      'utf8',
    );

    expect(markdown).toContain('backend/src/people.service.ts');
    expect(markdown).not.toContain('docs/refs/legal/law.md');
    expect(markdown).not.toContain('frontend/src/app/core/api/generated/openapi-core.json');
    expect(markdown).not.toContain('docs/gov/audit/inv/round-4/schema-digest.json');
  });
});

async function writeFixtureFile(
  root: string,
  relativePath: string,
  content: string,
): Promise<void> {
  const path = join(root, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
}
