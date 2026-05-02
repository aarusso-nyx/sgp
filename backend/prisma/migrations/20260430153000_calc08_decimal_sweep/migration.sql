ALTER TABLE hr.transit_benefit
  ALTER COLUMN unit_amount TYPE numeric(14, 2);

ALTER TABLE hr.employee_union_contribution
  ALTER COLUMN deduction_percent TYPE numeric(18, 6);

ALTER TABLE payroll.accounting_account
  ALTER COLUMN allocation_percent TYPE numeric(18, 6),
  ALTER COLUMN total_allocation_percent TYPE numeric(18, 6);

ALTER TABLE hr.internship_record
  ALTER COLUMN stipend_amount TYPE numeric(14, 2);

ALTER TABLE hr.salary_simulation_adjustment
  ALTER COLUMN percent_adjustment TYPE numeric(18, 6);

ALTER TABLE hr.pension_grant
  ALTER COLUMN share_percent TYPE numeric(18, 6);

ALTER TABLE public.tax_rate
  ALTER COLUMN rate_percent TYPE numeric(18, 6);

COMMENT ON COLUMN hr.salary_reference.amount IS 'Monetary amount in BRL; numeric(14,2); round at payroll earning/deduction boundary.';
COMMENT ON COLUMN payroll.employee_payroll_item.amount IS 'Payroll earning/deduction amount in BRL; numeric(14,2); rounded half-away-from-zero at rubrica boundary.';
COMMENT ON COLUMN payroll.payroll_run.total_earnings IS 'Aggregate payroll earnings in BRL; numeric(16,2).';
COMMENT ON COLUMN payroll.payroll_run.total_deductions IS 'Aggregate payroll deductions in BRL; numeric(16,2).';
COMMENT ON COLUMN payroll.payroll_run.total_net IS 'Aggregate net payroll amount in BRL; numeric(16,2).';
COMMENT ON COLUMN public.tax_rate.rate_percent IS 'Legal rate/factor value; numeric(18,6); rounded half-away-from-zero only at policy boundary.';
COMMENT ON COLUMN payroll_calc.formula_cache.amount IS 'Cached formula amount in BRL; numeric(14,2); matches CALC-08 money boundary policy.';
