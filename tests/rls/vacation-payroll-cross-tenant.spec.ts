import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Vacation Payroll Cross Tenant',
  specFile: 'tests/rls/vacation-payroll-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'Exercised by npm run db:smoke in the CALC-05 vacation payroll assertions.',
    'Assertions:',
    '1. hr.vacation_record.payroll_run_id is tenant-scoped and protected by RLS.',
    '2. payroll.run.execute plus rh.vacation.payout can calculate only inside the current tenant.',
    '3. tenant B cannot observe tenant A vacation payroll links or generated payroll rows.',
  ],
});
