export const medicalLeaveTriggerSpec = `
-- Exercised by npm run db:smoke in HR-04 medical leave assertions.
-- Assertions:
-- concluding hr.medical_record with decision = 'granted' creates hr.medical_leave.
-- the same trigger creates hr.leave_record for the employee absence timeline.
-- hr.f_consolidated_medical_days(employee_id, year) returns the granted-day sum for that calendar year.
-- public.audit_event receives the generated medical leave mutation through sgp_append_audit_event(...).
`;
