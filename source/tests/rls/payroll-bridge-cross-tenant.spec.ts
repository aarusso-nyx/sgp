export const payrollBridgeCrossTenantSpec = `
-- PONTO-07 cross-tenant RLS contract.
-- 1. ponto.payroll_bridge_event is tenant-scoped by tenant_id and force-RLS protected.
-- 2. Policies use sgp_tenant_matches(tenant_id).
-- 3. Reads require ponto.payroll.read or ponto.payroll.write.
-- 4. Mutations require ponto.payroll.write and audit through sgp_append_audit_event.
`;
