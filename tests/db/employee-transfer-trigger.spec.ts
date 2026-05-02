export const employeeTransferTriggerSpec = `
-- Exercised by npm run db:smoke in FOL-06 movimentacao assertions.
-- Assertions:
-- updating hr.employee_transfer.status to efetivada updates hr.employee.work_location_id.
-- the same transition appends audit_event metadata event rh.movimentacao.efetivada.
`;
