import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Tax Rate Rpps Cross Tenant',
  specFile: 'tests/rls/tax-rate-rpps-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'Exercised by npm run db:smoke in the CALC-03 RPPS assertions.',
    'Assertions:',
    '1. public.tax_rate keeps RPPS rows tenant-scoped through sgp_tenant_matches(tenant_id).',
    '2. SELECT policies require system.tax-rate.read/write or legacy gestao read/write.',
    '3. Mutating policies require system.tax-rate.write and reject tenant rewrites.',
    '4. compute_rpps returns 0 for non-statutory links and appends a payroll.rpps bypass audit event.',
  ],
});
