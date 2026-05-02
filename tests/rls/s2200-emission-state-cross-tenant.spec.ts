export const s2200EmissionStateCrossTenantSpec = `
-- Exercised by npm run db:smoke in the ES-02 S-2200/S-2205 assertions.
-- Assertions:
-- 1. esocial.s2200_emission_state and esocial.s2205_pending_alteration force RLS.
-- 2. Policies use sgp_tenant_matches(tenant_id) and require
--    esocial.event.read or esocial.event.write for reads.
-- 3. Mutations require esocial.event.write and reject cross-tenant rows.
-- 4. hr.employee and hr.employee_dependent triggers enqueue only whitelisted
--    S-2205 fields; unrelated employee updates do not enqueue S-2205.
`;
