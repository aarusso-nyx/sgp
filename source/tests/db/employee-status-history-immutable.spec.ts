export const employeeStatusHistoryImmutableSpec = `
-- Exercised by npm run db:smoke in HR-08 bootstrap assertions.
-- Assertions:
-- UPDATE hr.employee_status_history raises SQLSTATE 0A000 from hr08_status_history_immutable.
-- DELETE hr.employee_status_history raises SQLSTATE 0A000 from hr08_status_history_immutable.
-- Application roles have UPDATE and DELETE revoked on hr.employee_status_history.
`;
