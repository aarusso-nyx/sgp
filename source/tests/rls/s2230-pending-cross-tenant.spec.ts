export const s2230PendingCrossTenantSpec = `
-- Exercised by npm run db:smoke in the ES-03 S-2230/S-2299 assertions.
-- Assertions:
-- 1. esocial.s2230_pending and esocial.s2299_pending force RLS.
-- 2. Policies use sgp_tenant_matches(tenant_id) and require
--    esocial.event.read or esocial.event.write for reads.
-- 3. Mutations require esocial.event.write and reject cross-tenant rows.
-- 4. S-2230 queues leave/vacation transitions; S-2299 only queues when
--    payroll.payroll_run.status is GENERATED.
`;
