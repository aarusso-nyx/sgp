export const yearlyIncomeCrossTenantSpec = `
-- FISC-03 yearly income RLS assertions.
-- fiscal.yearly_income_aggregate uses sgp_tenant_matches(tenant_id) for all tenant-scoped access.
-- fiscal.yearly_income.read/write can read tenant-local aggregates only.
-- portal.yearly_income.read can read only rows where employee_id = sgp_current_employee_id().
-- public.generated_report_file has YEARLY_INCOME_REPORT-specific policies for admin and portal download isolation.
`;
