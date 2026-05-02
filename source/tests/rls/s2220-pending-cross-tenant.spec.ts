export const s2220PendingCrossTenantSpec = `
-- Exercised by npm run db:smoke in the SST-04 S-2220 assertions.
-- Assertions:
-- 1. esocial.s2220_pending forces RLS.
-- 2. Policy uses sgp_tenant_matches(tenant_id) and requires
--    esocial.event.read or esocial.event.write for reads.
-- 3. Mutations require esocial.event.write and reject cross-tenant rows.
-- 4. ARCHIVED saude.aso_record rows enqueue S-2220 automatically.
-- 5. Failed XSD retry keeps the pending row and persists last_error.
`;
