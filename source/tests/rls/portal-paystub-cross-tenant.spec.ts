export const portalPaystubCrossTenantSpec = `
-- Exercised by backend CALC-11 e2e coverage.
-- Assertions:
-- 1. portal.v_employee_paystub is hidden until competence_period reaches GENERATED.
-- 2. portal.paystub.read can read only the current tenant through sgp_tenant_matches.
-- 3. tenant B receives 0 rows when querying tenant A paystub rows through the portal projection.
`;
