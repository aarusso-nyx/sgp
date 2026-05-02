export const inscricaoCrossTenantSpec = `
-- REC-02 RLS acceptance probe.
-- Assertions:
-- 1. recrutamento.candidato, recrutamento.inscricao, and recrutamento.payment_charge are tenant-scoped through sgp_tenant_matches(tenant_id).
-- 2. SELECT requires recrutamento.read or recrutamento.write.
-- 3. INSERT/UPDATE/DELETE require recrutamento.write.
-- 4. Tenant B cannot observe tenant A candidates, applications, or charges.
-- 5. Public lookup is controller-token scoped and not exposed as a database policy.
-- 6. Mutations append public.audit_event through sgp_append_audit_event(...).
`;
