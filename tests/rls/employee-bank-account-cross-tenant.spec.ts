import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Employee Bank Account Cross Tenant',
  specFile: 'tests/rls/employee-bank-account-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'BANK-03 RLS acceptance probe.',
    '1. tenant B SELECT on tenant A hr.employee_bank_account returns 0 rows.',
    '2. INSERT/UPDATE require hr.bank_account.write.',
    '3. SELECT requires hr.bank_account.read or hr.bank_account.write.',
    '4. hr.employee_bank_account_history uses the same tenant and permission predicate.',
    '5. Mutation triggers append public.audit_event through sgp_append_audit_event(...).',
  ],
});
