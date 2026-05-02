export const tceAdapterRegistryCrossTenantSpec = `
-- Exercised by npm run db:smoke in 99-tce01-adapter-contract.sql.
-- Assertions:
-- 1. tce.adapter_registry and tce.adapter_lifecycle_event force RLS.
-- 2. Adapter registry rows are global and readable with tce.adapter.read.
-- 3. Regular user sessions cannot mutate the registry even with read permission.
-- 4. Registry and lifecycle mutations append audit_event rows through sgp_append_audit_event triggers.
-- 5. Write policies require backend worker bypass RLS.
`;
