export const afdExportCrossTenantSpec = `
-- Exercised by npm run db:smoke through the PONTO-03 migration and RLS coverage check.
-- Assertions:
-- 1. ponto.afd_export, ponto.afd_import, and ponto.afd_import_line force RLS.
-- 2. Rows are visible only when sgp_tenant_matches(tenant_id) is true.
-- 3. Reads require ponto.afd.read or ponto.afd.write.
-- 4. Mutations require ponto.afd.write.
-- 5. Mutations append public.audit_event through sgp_append_audit_event(...).
`;
