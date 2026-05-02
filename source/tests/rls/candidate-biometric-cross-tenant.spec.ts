export const candidateBiometricCrossTenantSpec = `
-- REC-07 RLS acceptance probe.
-- Assertions:
-- 1. recrutamento.candidate_biometric, recrutamento.biometric_consent, and recrutamento.biometric_match_attempt are tenant-scoped through sgp_tenant_matches(tenant_id).
-- 2. SELECT requires recrutamento.biometric.read or recrutamento.biometric.write.
-- 3. INSERT/UPDATE/DELETE require recrutamento.biometric.write.
-- 4. Tenant B cannot observe Tenant A biometric templates, consent terms, or match attempts.
-- 5. Mutations append public.audit_event through sgp_append_audit_event(...), with candidate_biometric metadata excluding template_cipher.
`;
