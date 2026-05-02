export const leaveEligibilitySpec = `
-- Exercised by npm run db:smoke in HR-05 general leave assertions.
-- Assertions:
-- hr.f_validate_leave_eligibility accepts maternity and paternity within legal day limits.
-- capacitacao and premio require at least five years in hr.service_time_record.
-- conjuge, adotante, and paternidade_empresa_cidada require supporting document references.
-- interesse_particular is stored with hr.leave_record.paid = false.
`;
