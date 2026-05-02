export const leaveRecordCrossTenantSpec = `
-- Exercised by npm run db:smoke in HR-05 general leave assertions.
-- Assertions:
-- tenant A can create and read general hr.leave_record rows with rh.leave.request/read.
-- tenant B SELECT on tenant A hr.leave_record rows returns 0 rows.
-- RLS policies use sgp_tenant_matches(tenant_id) and sgp_has_any_permission(...).
`;
