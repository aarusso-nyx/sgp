import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Payroll Run Line Cross Tenant',
  specFile: 'tests/rls/payroll-run-line-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'Exercised by npm run db:smoke in the CALC-09 reprocessing assertions.',
    'Assertions:',
    '1. payroll.employee_payroll_item keeps tenant RLS with active-line soft delete columns.',
    '2. payroll.v_payroll_run_line_active exposes only deleted_at IS NULL rows inside the current tenant.',
    '3. payroll.run.execute cannot observe or mutate active calculated lines from another tenant.',
  ],
});
