export const formulaCacheCrossTenantSpec = `
-- Exercised by npm run db:smoke in 99-xcut03-rls-hardening.sql.
-- Assertions:
-- 1. tenant B SELECT on tenant A payroll_calc.formula_cache returns 0 rows.
-- 2. payroll_calc.evaluate_earning_deduction(...) cannot return tenant A cache
--    while the session carries tenant B context.
`;
