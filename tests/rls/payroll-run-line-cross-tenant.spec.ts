export const payrollRunLineCrossTenantSpec = `
-- Exercised by npm run db:smoke in the CALC-09 reprocessing assertions.
-- Assertions:
-- 1. payroll.employee_payroll_item keeps tenant RLS with active-line soft delete columns.
-- 2. payroll.v_payroll_run_line_active exposes only deleted_at IS NULL rows inside the current tenant.
-- 3. payroll.run.execute cannot observe or mutate active calculated lines from another tenant.
`;
