import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'System Parameter Cross Tenant',
  specFile: 'tests/rls/system-parameter-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'Exercised by npm run db:smoke in the CALC-06 remuneration ceiling assertions.',
    'Assertions:',
    '1. public.system_parameter keeps TETO_* rows tenant-scoped through sgp_tenant_matches(tenant_id).',
    '2. SELECT policies allow system.parameter.read/write and legacy gestao read/write.',
    '3. Mutating policies allow system.parameter.write or legacy gestao.write and reject tenant rewrites.',
    '4. compute_teto_redutor raises an explicit error when the required TETO_* parameter has no amount.',
  ],
});
