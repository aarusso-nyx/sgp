export const onlineExamSessionCrossTenantSpec = `
-- REC-08 RLS acceptance probe.
-- Assertions:
-- 1. recrutamento.online_exam_session, proctoring_event, and proctoring_artifact are tenant-scoped through sgp_tenant_matches(tenant_id).
-- 2. SELECT requires recrutamento.exam.read, recrutamento.exam.review, recrutamento.exam.write, recrutamento.read, or recrutamento.write.
-- 3. INSERT/UPDATE/DELETE require recrutamento.exam.write, recrutamento.exam.review, or recrutamento.write.
-- 4. Tenant B cannot observe Tenant A sessions, proctoring flags, snapshots, audio chunks, or screen frames.
-- 5. Mutations append public.audit_event through sgp_append_audit_event(...).
`;
