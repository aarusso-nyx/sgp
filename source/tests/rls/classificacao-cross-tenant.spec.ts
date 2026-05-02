export const classificacaoCrossTenantSpec = `
-- REC-04 RLS acceptance probe.
-- Assertions:
-- 1. recrutamento.classificacao_snapshot and recrutamento.classificacao_item are tenant-scoped through sgp_tenant_matches(tenant_id).
-- 2. SELECT requires recrutamento.classificacao.read, recrutamento.classificacao.write, recrutamento.read, or recrutamento.write.
-- 3. INSERT/UPDATE/DELETE require recrutamento.classificacao.write or recrutamento.write.
-- 4. Tenant B cannot observe tenant A classification snapshots or items.
-- 5. Published snapshots and their items are immutable; a new published version supersedes the previous snapshot.
-- 6. Mutations append public.audit_event through sgp_append_audit_event(...).
`;
