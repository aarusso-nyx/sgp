export const probationCrossTenantSpec = `
-- Exercised by npm run db:smoke in HR-08 bootstrap assertions.
-- Assertions:
-- tenant A can insert and read its own hr.probation_evaluation rows with avaliacao.probation.write.
-- tenant B SELECT on tenant A hr.probation_evaluation returns 0 rows.
-- RLS policy uses sgp_tenant_matches(tenant_id) and sgp_has_any_permission(...).
`;
