COMMENT ON COLUMN payroll.employee_payroll_item.amount IS 'Payroll earning/deduction amount in BRL; numeric(14,2); rounded half-away-from-zero at rubrica boundary.';

COMMENT ON COLUMN payroll.payroll_run.total_earnings IS 'Aggregate payroll earnings in BRL; numeric(16,2).';

COMMENT ON COLUMN payroll.payroll_run.total_deductions IS 'Aggregate payroll deductions in BRL; numeric(16,2).';

COMMENT ON COLUMN payroll.payroll_run.total_net IS 'Aggregate net payroll amount in BRL; numeric(16,2).';

COMMENT ON COLUMN payroll.payroll_earning_deduction.incidences IS 'Payroll incidence flags for IRRF, INSS, FGTS, RPPS, and employer contribution.';

COMMENT ON COLUMN payroll.payroll_earning_deduction.esocial_code IS 'eSocial S-1010 rubric code when applicable.';

COMMENT ON COLUMN payroll.payroll_earning_deduction.official_rubric_code IS 'Official rubric code required by the local legal/payroll catalog when applicable.';

COMMENT ON COLUMN payroll.payroll_earning_deduction.subject_to_ceiling IS 'Whether this earning/deduction participates in the constitutional remuneration ceiling base.';
