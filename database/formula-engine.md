# Payroll Formula Engine

The payroll formula engine is implemented by the backend compiler in `backend/src/payroll-engine/formula-compiler.service.ts` and SQL runtime helpers under `database/sql/25-payroll-formula-engine.sql`.

## Runtime objects

- Schema: `payroll_calc`
- Cache table: `payroll_calc.formula_cache` stores `(tenant_id, earning_deduction_id, version, compiled_sql, compiled_at)`
- Compile trigger: `trg_compile_formula_expression` on `payroll.payroll_earning_deduction`
- Evaluator function: `payroll_calc.evaluate_earning_deduction(uuid, uuid, int, int)`

## Formula metadata columns

`payroll.payroll_earning_deduction` contains:

- `formula_alias`
- `formula_function_name`
- `formula_expression`
- `formula_function_ddl`
- `formula_dependencies`
- `formula_version`
- `formula_ready`
- `formula_error`

## Built-in helper functions

- `payroll_calc.base_salary(employee_id)`
- `payroll_calc.workload_hours(employee_id)`
- `payroll_calc.dependent_count(employee_id)`
- `payroll_calc.service_years(employee_id, competence_date)`
- `payroll_calc.days_in_month(year, month)`
- `payroll_calc.absence_days(employee_id, month, year)`
- `payroll_calc.worked_days(employee_id, month, year)`
- `payroll_calc.proportional_ratio(employee_id, month, year)`

## Notes

- This implementation ports folia database formula-engine behavior into SGP's English physical model.
- No legacy compatibility schema/shim is required.
