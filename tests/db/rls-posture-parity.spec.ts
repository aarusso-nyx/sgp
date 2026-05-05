export const rlsPostureParitySpec = `
-- Exercised by npm run db:smoke in R4-72 bootstrap assertions.
-- Assertions:
-- The exact non-RLS table set is:
--   fiscal.gps_payment_code
--   hr.cf37_xvi_accumulation_compatibility
--   lgpd.legal_basis_rule
--   public.permission
--   public.profile_permission
--   public.tenant
-- Each table has a COMMENT ON TABLE explaining its global/non-tenant-scoped status.
-- Any new unprotected table fails the smoke gate until reviewed and documented.
-- Extension-managed tables such as postgis.spatial_ref_sys are excluded.
`;
