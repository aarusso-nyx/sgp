import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Health Program Cross Tenant',
  specFile: 'tests/rls/health-program-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    "const sql = readFileSync(resolve(__dirname, '../../database/sql/70-saude-final.sql'), 'utf8')",
    "expect(sql).toContain('ALTER TABLE saude.health_program FORCE ROW LEVEL SECURITY')",
    "expect(sql).toContain('ALTER TABLE saude.program_revision FORCE ROW LEVEL SECURITY')",
    'expect(sql).toContain("\'saude.program.read\'::text")',
    'expect(sql).toContain("\'saude.program.write\'::text")',
    "expect(sql).toContain('sgp_tenant_matches(tenant_id)')",
  ],
});
