export const esocialEventCrossTenantSpec = `
-- Exercised by npm run db:smoke in 99-es01-tabelas-s1xxx.sql.
-- Assertions:
-- 1. public.esocial_event and esocial.s1xxx_dispatch_state force RLS.
-- 2. Policies use sgp_tenant_matches(tenant_id) and require
--    esocial.event.read or esocial.event.write for reads.
-- 3. Mutations require esocial.event.write and hide tenant A rows from tenant B.
`;
