import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Employee Alimony Cross Tenant',
  specFile: 'tests/rls/employee-alimony-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'BANK-04 RLS acceptance probe.',
    '1. hr.employee_alimony and hr.employee_alimony_history force RLS.',
    '2. SELECT requires hr.alimony.read or hr.alimony.write.',
    '3. INSERT/UPDATE/DELETE require hr.alimony.write.',
    '4. Tenant B cannot observe or mutate Tenant A court orders, judicial accounts, or history rows.',
    '5. Mutations append public.audit_event through sgp_append_audit_event(...) and UPDATE/DELETE preserve the previous version in hr.employee_alimony_history.',
  ],
});
