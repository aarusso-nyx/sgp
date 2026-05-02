export const s1200EmissionStateCrossTenantSpec = `
-- ES-04 RLS acceptance probe.
-- Assertions:
-- 1. esocial.s1200_emission_state and esocial.s1210_emission_state force RLS.
-- 2. Policies use sgp_tenant_matches(tenant_id) and require
--    esocial.event.read or esocial.event.write for reads.
-- 3. Mutations require esocial.event.write and reject cross-tenant rows.
-- 4. Mutations append public.audit_event through sgp_append_audit_event(...).
-- 5. public.esocial_event carries payroll_run_id for every S-1200 event.
`;
