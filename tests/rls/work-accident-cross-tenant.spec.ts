import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Work Accident Cross Tenant',
  specFile: 'tests/rls/work-accident-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    "const sql = ['../../database/sql/70-saude-final.sql', '../../database/sql/16-esocial-events.sql']",
    ".map((file) => readFileSync(resolve(__dirname, file), 'utf8'))",
    ".join('\\n')",
    "expect(sql).toContain('ALTER TABLE saude.work_accident FORCE ROW LEVEL SECURITY')",
    "expect(sql).toContain('ALTER TABLE saude.cat_emission FORCE ROW LEVEL SECURITY')",
    "expect(sql).toContain('ALTER TABLE public.esocial_events FORCE ROW LEVEL SECURITY')",
    "expect(sql).toContain('sgp_tenant_matches(tenant_id)')",
    "expect(sql).toContain('saude.cat.read')",
    "expect(sql).toContain('saude.cat.write')",
    "expect(sql).toContain('esocial_events_tenant_isolation')",
  ],
});
