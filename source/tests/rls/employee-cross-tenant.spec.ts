export const employeeCrossTenantSpec = `
-- Exercised by npm run db:smoke in the HR-01 bootstrap assertions.
-- Assertions:
-- 1. tenant A can read its own hr.employee admission row.
-- 2. tenant B SELECT on tenant A hr.employee returns 0 rows.
-- 3. tenant B SELECT on tenant A hr.employment_contract returns 0 rows.
-- 4. tenant B SELECT on tenant A hr.employee_status_history returns 0 rows.
`;
