export const pontoCrossTenantSpec = `
-- Exercised by npm run db:smoke through the PONTO-01 migration and RLS coverage check.
-- Assertions:
-- 1. ponto tenant-scoped tables force RLS and filter rows with sgp_tenant_matches(tenant_id).
-- 2. Reads require ponto.schedule.read, ponto.schedule.write, ponto.timerecord.read, or ponto.timerecord.write.
-- 3. Mutations require the write permission for the relevant schedule or time-record surface.
`;
