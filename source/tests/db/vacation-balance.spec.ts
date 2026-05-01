export const vacationBalanceSpec = `
-- Exercised by npm run db:smoke in HR-03 vacation assertions.
-- Assertions:
-- hr.f_calculate_vacation_balance(employee_id, ref_date) returns 30 accrued and available days after 12 complete months.
-- hr.v_vacation_balance exposes the same tenant-scoped accrual-period balance shape.
-- Approved vacation records reduce available balance and remain audit-visible through public.audit_event.
`;
