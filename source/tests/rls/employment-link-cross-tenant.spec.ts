export const employmentLinkCrossTenantSpec = `
-- Exercised by npm run db:smoke in the HR-02 bootstrap assertions.
-- Assertions:
-- 1. tenant A can create and read its own hr.employment_link regime row.
-- 2. tenant B SELECT on tenant A hr.employment_link returns 0 rows.
-- 3. tenant B cannot insert or update hr.employment_link for tenant A because
--    RLS uses sgp_tenant_matches(tenant_id) with permission checks.
`;
