import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Vacation Cross Tenant',
  specFile: 'tests/rls/vacation-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'Exercised by npm run db:smoke in HR-03 vacation assertions.',
    'Assertions:',
    'tenant A can insert and read its own hr.vacation_record rows with rh.vacation.request/read.',
    'tenant B SELECT on tenant A hr.vacation_record returns 0 rows.',
    'RLS policy uses sgp_tenant_matches(tenant_id) and sgp_has_any_permission(...).',
  ],
});
