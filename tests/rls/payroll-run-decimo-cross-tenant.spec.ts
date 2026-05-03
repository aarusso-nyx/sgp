import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Payroll Run Decimo Cross Tenant',
  specFile: 'tests/rls/payroll-run-decimo-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'Exercised by npm run db:smoke in the CALC-04 decimo terceiro assertions.',
    'Assertions:',
    '1. payroll.payroll_run and payroll.employee_payroll_item keep tenant RLS.',
    '2. DECIMO_TERCEIRO_ADIANTAMENTO and DECIMO_TERCEIRO_FECHAMENTO execution',
    'policies require sgp_tenant_matches(tenant_id).',
    '3. payroll.run.execute can run only inside the current tenant context.',
  ],
});
