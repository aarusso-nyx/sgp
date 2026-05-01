export const taxRateCrossTenantSpec = `
-- Exercised by npm run db:smoke in the CALC-02 IRRF assertions.
-- Assertions:
-- 1. public.tax_rate uses sgp_tenant_matches(tenant_id).
-- 2. SELECT policies require system.tax-rate.read/write or legacy gestao read/write.
-- 3. Mutating policies require system.tax-rate.write and reject tenant rewrites.
`;
