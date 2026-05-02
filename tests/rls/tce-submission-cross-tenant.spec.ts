export const tceSubmissionCrossTenantSpec = `
-- TCE-03 tenant-scoped submission RLS acceptance probe.
-- Assertions:
-- 1. tce.submission force-enables RLS.
-- 2. SELECT requires sgp_tenant_matches(tenant_id) and tce.submission.read or tce.submission.manage.
-- 3. INSERT/UPDATE/DELETE require sgp_tenant_matches(tenant_id) and tce.submission.manage.
-- 4. Cross-tenant reads and writes are denied without app.bypass_rls.
-- 5. Mutations append public.audit_event through sgp_append_audit_event(...).
`;
