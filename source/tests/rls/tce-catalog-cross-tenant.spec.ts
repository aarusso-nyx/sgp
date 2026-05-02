export const tceCatalogCrossTenantSpec = `
-- TCE-02 public catalog RLS acceptance probe.
-- Assertions:
-- 1. tce.state, tce.layout_version, and tce.layout_field are global public catalog tables and are not tenant-scoped.
-- 2. SELECT requires tce.catalog.read or tce.catalog.manage.
-- 3. INSERT/UPDATE/DELETE require tce.catalog.manage.
-- 4. Mutations append public.audit_event through sgp_append_audit_event(...).
-- 5. Layout metadata is placeholder-only until a concrete adapter populates fields.
`;
