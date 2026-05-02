export const asoSelfOnlySpec = `
-- Exercised by SST-01 portal ASO assertions.
-- Assertions:
-- saude.aso.self_read can see only rows where aso_record.employee_id = sgp_current_employee_id().
-- portal ASO endpoints expose dates, kind, conclusion, status, and next due date only.
-- clinical restriction text and raw attachment data remain restricted to saude.aso.read/write.
`;
