import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Transparency Cross Tenant',
  specFile: 'tests/rls/transparency-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'const canonicalSchema = readFileSync(',
    "resolve(__dirname, '../../database/sql/70-public_data-final.sql')",
    "'utf8'",
    'expect(canonicalSchema).toContain(',
    "'ALTER TABLE public_data.transparency_payroll_snapshot ENABLE ROW LEVEL SECURITY'",
    "expect(canonicalSchema).toContain('public.sgp_tenant_matches(tenant_id)')",
    'expect(canonicalSchema).toContain("\'public.read\'::text")',
    'expect(canonicalSchema).toContain("\'transparency.publish\'::text")',
  ],
});
