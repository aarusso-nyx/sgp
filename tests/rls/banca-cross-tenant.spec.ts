export const bancaCrossTenantSpec = `
-- REC-09 RLS acceptance probe.
-- Assertions:
-- 1. recrutamento.banca_membro, signed_document, and document_signature are tenant-scoped through sgp_tenant_matches(tenant_id).
-- 2. SELECT requires recrutamento.banca.read or recrutamento.banca.write.
-- 3. INSERT/UPDATE/DELETE require recrutamento.banca.write.
-- 4. Tenant B cannot observe tenant A banca members, signed official documents, or sequential signatures.
-- 5. Mutations append public.audit_event through sgp_append_audit_event(...).
-- 6. Public verification exposes only metadata and signer names, never CPF or certificate private material.
`;
