export const abonoPermanenciaCrossTenantSpec = `
-- Exercised by npm run db:smoke through hr.employee RLS coverage and CALC-07 e2e assertions.
-- Assertions:
-- 1. hr.employee abono_permanencia_* columns remain tenant-scoped through sgp_tenant_matches(tenant_id).
-- 2. Mutations require rh.employee.abono.write at the controller and use sgp_append_audit_event.
-- 3. payroll_calc.compute_abono_permanencia resolves only the tenant employee behind the employment link.
-- 4. payroll_calc.compute_ats and related variants read hr.service_time_record only through tenant-qualified employee records.
`;
