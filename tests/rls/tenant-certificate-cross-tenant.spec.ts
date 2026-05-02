export const tenantCertificateCrossTenantSpec = `
-- Exercised by npm run db:smoke in 99-es07-xsd-signature.sql.
-- Assertions:
-- 1. esocial.tenant_certificate and esocial.xsd_validation_failure force RLS.
-- 2. Policies use sgp_tenant_matches(tenant_id) and require
--    esocial.certificate.read or esocial.certificate.write for reads.
-- 3. Mutations require esocial.certificate.write and append audit_event rows
--    through sgp_append_audit_event triggers.
`;
