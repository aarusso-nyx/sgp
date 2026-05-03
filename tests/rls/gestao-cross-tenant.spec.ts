import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Gestao Cross Tenant',
  specFile: 'tests/rls/gestao-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'const canonicalSchema = readFileSync(',
    "resolve(process.cwd(), 'database/sql/70-hr-final.sql')",
    "'utf8'",
    "expect(canonicalSchema).toContain('ALTER TABLE hr.work_location ENABLE ROW LEVEL SECURITY')",
    "expect(canonicalSchema).toContain('public.sgp_tenant_matches(tenant_id)')",
    "expect(canonicalSchema).toContain('gestao.master_data.read')",
    "expect(canonicalSchema).toContain('gestao.master_data.write')",
  ],
});
