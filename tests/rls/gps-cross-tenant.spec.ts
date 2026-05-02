export const gpsCrossTenantSpec = `
-- FISC-04 GPS residual RLS assertions.
-- fiscal.gps_remittance forces RLS and uses sgp_tenant_matches(tenant_id).
-- Reads require fiscal.gps.read or fiscal.gps.write.
-- Mutations require fiscal.gps.write and append audit_event through sgp_append_audit_event(...).
-- fiscal.assert_no_dctfweb_for_competence blocks GPS when DCTFWeb is TRANSMITTED or ACCEPTED.
`;
