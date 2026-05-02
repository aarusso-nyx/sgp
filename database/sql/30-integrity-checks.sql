-- Check constraints Prisma cannot express directly.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_run_competence_month_check') THEN
    ALTER TABLE payroll.payroll_run
      ADD CONSTRAINT payroll_run_competence_month_check
      CHECK (competence_month BETWEEN 1 AND 12);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_run_totals_nonnegative_check') THEN
    ALTER TABLE payroll.payroll_run
      ADD CONSTRAINT payroll_run_totals_nonnegative_check
      CHECK (total_earnings >= 0 AND total_deductions >= 0 AND total_net >= 0 AND employee_count >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_frequency_month_check') THEN
    ALTER TABLE hr.employee_frequency
      ADD CONSTRAINT employee_frequency_month_check
      CHECK (month IS NULL OR month BETWEEN 1 AND 12);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_payroll_item_competence_month_check') THEN
    ALTER TABLE payroll.employee_payroll_item
      ADD CONSTRAINT employee_payroll_item_competence_month_check
      CHECK (competence_month BETWEEN 1 AND 12);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_payroll_item_amount_nonnegative_check') THEN
    ALTER TABLE payroll.employee_payroll_item
      ADD CONSTRAINT employee_payroll_item_amount_nonnegative_check
      CHECK (amount >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_financial_record_competence_month_check') THEN
    ALTER TABLE payroll.payroll_financial_record
      ADD CONSTRAINT payroll_financial_record_competence_month_check
      CHECK (competence_month BETWEEN 1 AND 12);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_remittance_competence_month_check') THEN
    ALTER TABLE payroll.payment_remittance_file
      ADD CONSTRAINT payment_remittance_competence_month_check
      CHECK (competence_month BETWEEN 1 AND 12);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_remittance_total_nonnegative_check') THEN
    ALTER TABLE payroll.payment_remittance_file
      ADD CONSTRAINT payment_remittance_total_nonnegative_check
      CHECK (total_amount >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blocked_payment_competence_month_check') THEN
    ALTER TABLE payroll.blocked_payment
      ADD CONSTRAINT blocked_payment_competence_month_check
      CHECK (competence_month BETWEEN 1 AND 12);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vacation_record_dates_check') THEN
    ALTER TABLE hr.vacation_record
      ADD CONSTRAINT vacation_record_dates_check
      CHECK (ends_on >= starts_on AND days > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_record_dates_check') THEN
    ALTER TABLE hr.leave_record
      ADD CONSTRAINT leave_record_dates_check
      CHECK (ends_on IS NULL OR ends_on >= starts_on);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leave_record_days_positive_check') THEN
    ALTER TABLE hr.leave_record
      ADD CONSTRAINT leave_record_days_positive_check
      CHECK (days IS NULL OR days > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_hire_termination_dates_check') THEN
    ALTER TABLE hr.employee
      ADD CONSTRAINT employee_hire_termination_dates_check
      CHECK (terminated_on IS NULL OR hired_on IS NULL OR terminated_on >= hired_on);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_status_history_dates_check') THEN
    ALTER TABLE hr.employee_status_history
      ADD CONSTRAINT employee_status_history_dates_check
      CHECK (ends_on IS NULL OR ends_on >= starts_on);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_transfer_distinct_branch_check') THEN
    ALTER TABLE hr.employee_transfer
      ADD CONSTRAINT employee_transfer_distinct_branch_check
      CHECK (from_branch_id IS NULL OR to_branch_id IS NULL OR from_branch_id <> to_branch_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'professional_experience_dates_check') THEN
    ALTER TABLE hr.professional_experience
      ADD CONSTRAINT professional_experience_dates_check
      CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_time_record_dates_check') THEN
    ALTER TABLE hr.service_time_record
      ADD CONSTRAINT service_time_record_dates_check
      CHECK (ends_on IS NULL OR ends_on >= starts_on);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vacation_record_accrual_dates_check') THEN
    ALTER TABLE hr.vacation_record
      ADD CONSTRAINT vacation_record_accrual_dates_check
      CHECK (
        accrual_start_on IS NULL
        OR accrual_end_on IS NULL
        OR accrual_end_on >= accrual_start_on
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'report_request_competence_month_check') THEN
    ALTER TABLE public.report_request
      ADD CONSTRAINT report_request_competence_month_check
      CHECK (competence_month IS NULL OR competence_month BETWEEN 1 AND 12);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_financial_record_totals_nonnegative_check') THEN
    ALTER TABLE payroll.payroll_financial_record
      ADD CONSTRAINT payroll_financial_record_totals_nonnegative_check
      CHECK (total_earnings >= 0 AND total_deductions >= 0 AND net_amount >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_attachment_size_nonnegative_check') THEN
    ALTER TABLE public.document_attachment
      ADD CONSTRAINT document_attachment_size_nonnegative_check
      CHECK (size_bytes IS NULL OR size_bytes >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agreement_dates_check') THEN
    ALTER TABLE hr.agreement
      ADD CONSTRAINT agreement_dates_check
      CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'internship_record_dates_check') THEN
    ALTER TABLE hr.internship_record
      ADD CONSTRAINT internship_record_dates_check
      CHECK (ends_on IS NULL OR ends_on >= starts_on);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'internship_record_stipend_nonnegative_check') THEN
    ALTER TABLE hr.internship_record
      ADD CONSTRAINT internship_record_stipend_nonnegative_check
      CHECK (stipend_amount IS NULL OR stipend_amount >= 0);
  END IF;
END;
$$;
