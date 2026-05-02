export const formulaCacheCompiledCrossTenantSpec = `
-- Exercised by npm run db:smoke in CALC-01 formula-cache assertions.
-- Assertions:
-- 1. tenant B SELECT on tenant A payroll_calc.formula_cache compiled rows returns 0 rows.
-- 2. payroll_calc.formula_cache RLS requires payroll.formula.read or payroll.formula.write.
-- 3. Cross-tenant writes to compiled cache rows are rejected by WITH CHECK.
`;
