import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Employee Transfer Cross Tenant',
  specFile: 'tests/rls/employee-transfer.cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'Exercised by npm run db:smoke in FOL-06 movimentacao assertions.',
    'Assertions:',
    'tenant A can create and read hr.employee_transfer rows with rh.movimentacao.request/read.',
    'tenant B SELECT on tenant A hr.employee_transfer rows returns 0 rows.',
    'RLS policies use sgp_tenant_matches(tenant_id) and sgp_has_any_permission(...).',
  ],
});
