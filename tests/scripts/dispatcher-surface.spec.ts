import { execFile as execFileCallback } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { repoRoot } from './audit-test-helpers';

const execFile = promisify(execFileCallback);

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

describe('workspace dispatcher surface', () => {
  it('routes every root npm script through scripts/run.mjs', () => {
    const packageJson = readJson<{ scripts: Record<string, string> }>(
      join(repoRoot, 'package.json'),
    );

    for (const [name, command] of Object.entries(packageJson.scripts)) {
      expect(command).toMatch(/^node scripts\/run\.mjs\b/);
      expect(command).not.toContain('&&');
      expect(command).not.toContain(';');
      expect(name).not.toMatch(/compat|legacy|alias/i);
    }
  });

  it('routes frontend policy checks through the consolidated frontend checker', () => {
    const packageJson = readJson<{ scripts: Record<string, string> }>(
      join(repoRoot, 'frontend', 'package.json'),
    );

    expect(packageJson.scripts['i18n:check']).toBe('node ../scripts/check-frontend.mjs i18n');
    expect(packageJson.scripts.lint).toBe('node ../scripts/check-frontend.mjs all');
    expect(packageJson.scripts['lint:check']).toBe('node ../scripts/check-frontend.mjs all');
    expect(existsSync(join(repoRoot, 'scripts', 'check-frontend-api-client.mjs'))).toBe(false);
    expect(existsSync(join(repoRoot, 'scripts', 'check-frontend-modern-angular.mjs'))).toBe(false);
    expect(existsSync(join(repoRoot, 'scripts', 'check-frontend-i18n.mjs'))).toBe(false);
  });

  it('keeps implementation helpers out of the top-level script surface', () => {
    const removedTopLevelScripts = [
      'audit-api-surface.mjs',
      'audit-backlog-ledger.mjs',
      'audit-fr-ledger.mjs',
      'audit-hotspots.mjs',
      'audit-promise-vs-delivery.mjs',
      'audit-schema-digest.mjs',
      'audit-test-coverage-map.mjs',
      'check-api-operation-decorators.mjs',
      'check-api-route-alignment.mjs',
      'check-db-alignment.mjs',
      'check-db-fk-coverage.mjs',
      'check.mjs',
      'check-openapi-generated.mjs',
      'check-prisma-db-push-guard.mjs',
      'check-rls-specs.mjs',
      'check-test-debt-coverage.mjs',
      'db-apply-sql.mjs',
      'db-bootstrap-smoke.mjs',
      'evidence-check.mjs',
      'gen-permissions.ts',
      'generate-openapi-client.mjs',
      'governance-validate.mjs',
      'qa-bootstrap.mjs',
      'qa-smoke-required-urls.mjs',
      'refresh-live-data-inventory.mjs',
      'start-runtime-stub.mjs',
      'sync-api-route-alignment.mjs',
    ];

    for (const script of removedTopLevelScripts) {
      expect(existsSync(join(repoRoot, 'scripts', script))).toBe(false);
    }
  });

  it('exposes API, DB, and cross-cutting check dispatcher help', async () => {
    const api = await execFile(process.execPath, ['scripts/run.mjs', 'api', 'help'], {
      cwd: repoRoot,
    });
    const db = await execFile(process.execPath, ['scripts/run.mjs', 'db', 'help'], {
      cwd: repoRoot,
    });
    const check = await execFile(process.execPath, ['scripts/run.mjs', 'check'], {
      cwd: repoRoot,
    });

    expect(api.stdout).toContain(
      'api <alignment sync|alignment check|operation check|spec check|client generate>',
    );
    expect(db.stdout).toContain(
      'db <migrate|seed|smoke|alignment check|fk-coverage check|fk-coverage write|push-guard|rls-no-write-guard>',
    );
    expect(check.stdout).toContain('check-evidence.mjs');
  });
});
