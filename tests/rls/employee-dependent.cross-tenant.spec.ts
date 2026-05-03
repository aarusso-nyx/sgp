import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Employee Dependent Cross Tenant',
  specFile: 'tests/rls/employee-dependent.cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'Exercised by npm run db:smoke in 99-xcut03-rls-hardening.sql.',
    'Assertions:',
    '1. tenant B SELECT on tenant A hr.employee_dependent returns 0 rows.',
    '2. tenant A can read its row before attempting a tenant rewrite.',
    '3. tenant A cannot rewrite hr.employee_dependent.tenant_id to tenant B',
    'RLS WITH CHECK rejects the new row tenant.',
    '4. the row remains tenant A after the rejected rewrite.',
    '5. tenant B DELETE on tenant A hr.employee_dependent affects 0 rows.',
  ],
});
