export const concursoCrossTenantSpec = `
-- REC-01 RLS acceptance probe.
-- Assertions:
-- 1. recrutamento.concurso, recrutamento.edital, and recrutamento.vaga are tenant-scoped through sgp_tenant_matches(tenant_id).
-- 2. SELECT requires recrutamento.concurso.read or recrutamento.concurso.write.
-- 3. INSERT/UPDATE/DELETE require recrutamento.concurso.write.
-- 4. Tenant B cannot observe or mutate tenant A concursos, editais, or vagas.
-- 5. Mutations append public.audit_event through sgp_append_audit_event(...).
`;
