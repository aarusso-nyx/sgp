import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Environmental Exposure Cross Tenant',
  specFile: 'tests/rls/environmental-exposure-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    "const sql = ['../../database/sql/70-saude-final.sql', '../../database/sql/16-esocial-spool.sql']",
    ".map((file) => readFileSync(resolve(__dirname, file), 'utf8'))",
    ".join('\\n')",
    "expect(sql).toContain('ALTER TABLE saude.environmental_exposure FORCE ROW LEVEL SECURITY')",
    "expect(sql).toContain('ALTER TABLE saude.epi_inventory FORCE ROW LEVEL SECURITY')",
    "expect(sql).toContain('ALTER TABLE saude.epi_delivery FORCE ROW LEVEL SECURITY')",
    "expect(sql).toContain('ALTER TABLE saude.ppp_record FORCE ROW LEVEL SECURITY')",
    "expect(sql).toContain('ALTER TABLE public.esocial_spool FORCE ROW LEVEL SECURITY')",
    "expect(sql).toContain('sgp_tenant_matches(tenant_id)')",
    "expect(sql).toContain('saude.exposure.read')",
    "expect(sql).toContain('saude.exposure.write')",
    "expect(sql).toContain('saude.epi.read')",
  ],
});
