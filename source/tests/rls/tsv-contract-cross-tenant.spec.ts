export const tsvContractCrossTenantSpec = `
-- Exercised by npm run db:smoke after ES-11 migration.
-- Assertions:
-- 1. tenant A can read and mutate its own hr.tsv_contract and hr.tsv_contract_change rows
--    with hr.employment.write.
-- 2. tenant B cannot read tenant A TS-V contracts because RLS uses
--    sgp_tenant_matches(tenant_id).
-- 3. esocial.s2306_event is tenant-scoped and requires eSocial event permissions.
`;
