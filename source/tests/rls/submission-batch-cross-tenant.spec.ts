export const submissionBatchCrossTenantSpec = `
-- Exercised by npm run db:smoke in 99-es08-submission.sql.
-- Assertions:
-- 1. esocial.submission_batch forces RLS and filters rows with sgp_tenant_matches(tenant_id).
-- 2. Reads require esocial.submission.read or esocial.submission.retry.
-- 3. Retry mutations require esocial.submission.retry and append audit_event rows.
-- 4. esocial.endpoint_circuit_state is globally readable to submission operators but mutable only through worker bypass RLS.
`;
