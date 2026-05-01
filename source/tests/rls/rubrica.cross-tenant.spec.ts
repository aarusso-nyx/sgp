export const rubricaCrossTenantSpec = `
-- Exercised by npm run db:smoke in the FOL-01 rubrica assertions.
-- Assertions:
-- 1. payroll.payroll_earning_deduction, payroll.formula_attribute, and
--    payroll.job_position_earning use sgp_tenant_matches(tenant_id).
-- 2. SELECT policies require folha.rubrica.read, folha.rubrica.write, or
--    folha.rubrica.preview.
-- 3. Mutating policies require folha.rubrica.write and reject tenant rewrites.
`;
