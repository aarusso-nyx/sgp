import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Payroll Run Rescisao Cross Tenant',
  specFile: 'tests/rls/payroll-run-rescisao-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'Exercised by backend CALC-12 e2e coverage and npm run db:smoke migration checks.',
    'Assertions:',
    '1. payroll.payroll_run and payroll.employee_payroll_item remain tenant-scoped for RESCISAO runs.',
    '2. payroll.run.execute plus rh.employee.terminate can calculate only inside the current tenant context.',
    '3. portal.paystub.read can read generated termination terms only for the authenticated employee tenant.',
  ],
});
