import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Posse Cross Tenant',
  specFile: 'tests/rls/posse-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'const canonicalSchema = readFileSync(',
    "resolve(__dirname, '../../database/sql/70-recrutamento-final.sql')",
    "'utf8'",
    'expect(canonicalSchema).toContain(',
    "'ALTER TABLE ONLY recrutamento.posse FORCE ROW LEVEL SECURITY'",
    "expect(canonicalSchema).toContain('public.sgp_tenant_matches(tenant_id)')",
    'expect(canonicalSchema).toContain("\'recrutamento:read\'::text")',
    'expect(canonicalSchema).toContain("\'recrutamento:write\'::text")',
    'expect(canonicalSchema).toContain("\'rh:write\'::text")',
  ],
});
