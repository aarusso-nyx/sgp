import { describeRlsSmokeSpec } from './support/rls-spec-helpers';

describeRlsSmokeSpec({
  title: 'Yearly Income Cross Tenant',
  specFile: 'tests/rls/yearly-income-cross-tenant.spec.ts',
  tenantAInsertEvidence: ['INSERT INTO '],
  tenantBZeroRowEvidence: ['Expected tenant B to see 0'],
  assertionSummary: [
    'FISC-03 yearly income RLS assertions.',
    'fiscal.yearly_income_aggregate uses sgp_tenant_matches(tenant_id) for all tenant-scoped access.',
    'fiscal.yearly_income.read/write can read tenant-local aggregates only.',
    'portal.yearly_income.read can read only rows where employee_id = sgp_current_employee_id().',
    'public.generated_report_file has YEARLY_INCOME_REPORT-specific policies for admin and portal download isolation.',
  ],
});
