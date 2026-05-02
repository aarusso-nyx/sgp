export const eventRetryScheduleCrossTenantSpec = `
-- Exercised by npm run db:smoke through the ES-09 migration.
-- Assertions:
-- 1. esocial.event_retry_schedule forces RLS and filters rows with sgp_tenant_matches(tenant_id).
-- 2. Reads require esocial.event.read or esocial.event.retry.
-- 3. Mutations require esocial.event.retry and append audit_event rows.
-- 4. Recoverable returns are queued only for the current tenant event.
`;
