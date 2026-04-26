# Payroll Formula Engine

The payroll formula engine is implemented in SQL under `source/database/sql/25-payroll-formula-engine.sql`.

## Runtime objects

- Schema: `payroll_calc`
- Cache table: `payroll_calc.formula_cache`
- Compile trigger: `trg_compile_formula_expression` on `payroll.payroll_earning_deduction`
- Evaluator function: `payroll_calc.evaluate_earning_deduction(uuid, uuid, int, int)`

## Formula metadata columns

`payroll.payroll_earning_deduction` contains:

- `formula_alias`
- `formula_function_name`
- `formula_expression`
- `formula_function_ddl`
- `formula_dependencies`
- `formula_ready`
- `formula_error`

## Built-in helper functions

- `payroll_calc.base_salary(employee_id)`
- `payroll_calc.days_in_month(year, month)`
- `payroll_calc.absence_days(employee_id, month, year)`
- `payroll_calc.worked_days(employee_id, month, year)`
- `payroll_calc.proportional_ratio(employee_id, month, year)`

## Notes

- This implementation ports folia database formula-engine behavior into SGP's English physical model.
- No legacy compatibility schema/shim is required.
