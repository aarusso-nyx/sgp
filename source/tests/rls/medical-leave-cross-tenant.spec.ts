export const medicalLeaveCrossTenantSpec = `
-- Exercised by npm run db:smoke in HR-04 medical leave assertions.
-- Assertions:
-- tenant A can create and read medical pericia records with saude.opinion.write.
-- tenant B SELECT on tenant A hr.medical_record returns 0 rows.
-- RLS policies use sgp_tenant_matches(tenant_id) and sgp_has_any_permission(...).
`;
