export const consignmentPortabilityCrossTenantSpec = `
-- CONS-02 RLS acceptance probe.
-- Assertions:
-- 1. payment.consignment_portability_file and payment.consignment_portability_detail are tenant-scoped through sgp_tenant_matches(tenant_id).
-- 2. SELECT requires payment.consignment.read or payment.consignment.write.
-- 3. INSERT/UPDATE/DELETE require payment.consignment.write.
-- 4. Tenant B cannot observe or mutate tenant A portability files or detail rows.
-- 5. Mutations append public.audit_event through sgp_append_audit_event(...).
`;
