import { execFile as execFileCallback } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

import {
  cleanupFixture,
  makeFixture,
  readJson,
  repoRoot,
  runAuditCommand,
} from './audit-test-helpers';

const execFile = promisify(execFileCallback);

describe('audit-fe-i18n-coverage', () => {
  let fixtureRoot: string;

  afterEach(async () => {
    if (fixtureRoot) await cleanupFixture(fixtureRoot);
  });

  it('quantifies hard-coded feature template and TypeScript UI strings', async () => {
    fixtureRoot = await makeFixture('audit-hotspots');
    await writeFixtureFile(
      fixtureRoot,
      'frontend/src/app/features/recrutamento/list/list.html',
      [
        '<section>',
        '  <h1 i18n>Concursos</h1>',
        '  <button>Publicar edital</button>',
        '  <input placeholder="Buscar candidato" />',
        '  <mat-icon>search</mat-icon>',
        '</section>',
      ].join('\n'),
    );
    await writeFixtureFile(
      fixtureRoot,
      'frontend/src/app/features/recrutamento/list/list.ts',
      [
        'export const recruitmentList = {',
        "  title: 'Concursos abertos',",
        "  apiPath: '/api/v1/recrutamento/concursos',",
        '};',
      ].join('\n'),
    );

    const result = await runAuditCommand('fe-i18n', fixtureRoot, ['--json']);
    const report = JSON.parse(result.stdout) as {
      totalFindings: number;
      byFeature: Array<{ feature: string; findings: number }>;
      byKind: Array<{ key: string; count: number }>;
    };

    expect(report.totalFindings).toBe(3);
    expect(report.byFeature).toEqual([{ feature: 'recrutamento', findings: 3 }]);
    expect(report.byKind.map((row) => row.key).sort()).toEqual([
      'template-attribute',
      'template-text',
      'typescript-ui-literal',
    ]);
  });

  it('writes markdown and json artifacts for round tracking', async () => {
    fixtureRoot = await makeFixture('audit-hotspots');
    await writeFixtureFile(
      fixtureRoot,
      'frontend/src/app/features/portal/home/home.html',
      '<p>Area do servidor</p>',
    );

    const result = await runAuditCommand('fe-i18n', fixtureRoot);
    expect(result.stdout).toContain('[audit-fe-i18n] 1 hard-coded feature string candidates');

    const jsonReport = await readJson<{ totalFindings: number }>(
      join(fixtureRoot, 'out/inv/round-7/fe-i18n-coverage.json'),
    );
    const markdown = await readFile(
      join(fixtureRoot, 'out/diag/round-7/fe-i18n-coverage.md'),
      'utf8',
    );

    expect(jsonReport.totalFindings).toBe(1);
    expect(markdown).toContain('# Frontend i18n Coverage Baseline');
    expect(markdown).toContain('frontend/src/app/features/portal/home/home.html');
  });

  it('keeps the live feature i18n hard-coded string ratchet at or below R5 target', async () => {
    const result = await execFile(
      process.execPath,
      [join(repoRoot, 'scripts/audit.mjs'), 'fe-i18n', '--round', '5', '--json'],
      { cwd: repoRoot, maxBuffer: 10 * 1024 * 1024 },
    );
    const report = JSON.parse(result.stdout) as { totalFindings: number };

    expect(report.totalFindings).toBeLessThanOrEqual(100);
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
