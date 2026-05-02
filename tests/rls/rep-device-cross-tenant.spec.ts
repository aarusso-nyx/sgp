export const repDeviceCrossTenantSpec = `
-- Exercised by npm run db:smoke through the PONTO-02 migration and RLS coverage check.
-- Assertions:
-- 1. ponto.rep_device, ponto.rep_ingestion_batch, and ponto.rep_ingestion_line force RLS.
-- 2. Rows are visible only when sgp_tenant_matches(tenant_id) is true.
-- 3. Reads require ponto.rep.read, ponto.rep.write, or ponto.timerecord.write.
-- 4. Mutations require ponto.rep.write and, for ingestion tables, ponto.timerecord.write is accepted for the time-record injection path.
`;
