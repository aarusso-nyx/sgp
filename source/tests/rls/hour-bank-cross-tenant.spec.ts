export const hourBankCrossTenantSpec = `
-- Exercised by npm run db:smoke through the PONTO-05 migration and RLS coverage check.
-- Assertions:
-- 1. ponto.hour_bank and ponto.hour_bank_movement force RLS.
-- 2. Tenant filtering uses sgp_tenant_matches(tenant_id).
-- 3. Reads require ponto.hourbank.read or ponto.hourbank.write.
-- 4. Mutations require ponto.hourbank.write and audit through sgp_append_audit_event.
`;
