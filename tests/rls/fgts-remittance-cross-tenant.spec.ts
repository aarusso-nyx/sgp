export const fgtsRemittanceCrossTenantSpec = `
-- BANK-05 RLS acceptance probe.
-- Assertions:
-- 1. payment.fgts_remittance, payment.fgts_grf, payment.fgts_grrf, and payment.fgts_caixa_adapter are tenant-scoped through sgp_tenant_matches(tenant_id).
-- 2. SELECT/INSERT/UPDATE/DELETE require payroll.fgts.read, payroll.fgts.write, or payment.remittance.write.
-- 3. Tenant B cannot observe Tenant A GRF/GRRF remittances, DAE barcodes, SIFGE hashes, GRF rows, GRRF rows, or adapter configuration.
-- 4. Mutations append public.audit_event through sgp_append_audit_event(...).
`;
