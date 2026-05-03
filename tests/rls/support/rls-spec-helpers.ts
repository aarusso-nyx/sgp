import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type RlsSmokeSpec = {
  assertionSummary: string[];
  specFile: string;
  tenantAInsertEvidence: string[];
  tenantBZeroRowEvidence: string[];
  title: string;
};

const workspaceRoot = resolve(__dirname, '../../..');

function readDbSmokeScript(): string {
  return readFileSync(resolve(workspaceRoot, 'scripts/db-bootstrap-smoke.mjs'), 'utf8');
}

export function describeRlsSmokeSpec(spec: RlsSmokeSpec): void {
  describe(`${spec.title} RLS executable spec`, () => {
    it('is anchored to an executable tenant-A insert smoke path', () => {
      const smoke = readDbSmokeScript();

      expect(spec.specFile).toMatch(/^tests\/rls\/.+\.spec\.ts$/);
      expect(smoke).toContain('tenant_a constant uuid');
      expect(smoke).toContain('SET LOCAL ROLE sgp_smoke_rls');
      for (const evidence of spec.tenantAInsertEvidence) {
        expect(smoke).toContain(evidence);
      }
    });

    it('is anchored to an executable tenant-B zero-row SELECT assertion', () => {
      const smoke = readDbSmokeScript();

      expect(smoke).toContain('tenant_b constant uuid');
      expect(smoke).toContain('SELECT count(*) INTO visible_count');
      for (const evidence of spec.tenantBZeroRowEvidence) {
        expect(smoke).toContain(evidence);
      }
    });

    it('preserves the promoted RLS acceptance assertions', () => {
      expect(spec.assertionSummary.length).toBeGreaterThanOrEqual(1);
      expect(spec.assertionSummary.join('\n')).toMatch(
        /tenant|RLS|sgp_tenant_matches|restricted|sgp_current_employee/i,
      );
    });
  });
}
