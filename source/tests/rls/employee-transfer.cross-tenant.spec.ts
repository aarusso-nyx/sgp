export const employeeTransferCrossTenantSpec = `
-- Exercised by npm run db:smoke in FOL-06 movimentacao assertions.
-- Assertions:
-- tenant A can create and read hr.employee_transfer rows with rh.movimentacao.request/read.
-- tenant B SELECT on tenant A hr.employee_transfer rows returns 0 rows.
-- RLS policies use sgp_tenant_matches(tenant_id) and sgp_has_any_permission(...).
`;
