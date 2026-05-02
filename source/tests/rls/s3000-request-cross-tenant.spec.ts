export const s3000RequestCrossTenantSpec = `
-- Exercised by npm run db:smoke in 99-es06-s3000.sql.
-- Assertions:
-- 1. esocial.s3000_request forces RLS.
-- 2. Select/write policies use sgp_tenant_matches(tenant_id).
-- 3. Mutations require esocial.event.exclude.
-- 4. Tenant B cannot see tenant A S-3000 requests.
`;
