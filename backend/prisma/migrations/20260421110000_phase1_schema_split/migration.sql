-- Phase 1 core-first schema split for SGP v0.0.1.
-- Moves HR and payroll canonical tables out of public, preserving object names.

CREATE SCHEMA IF NOT EXISTS "hr";
CREATE SCHEMA IF NOT EXISTS "payroll";
CREATE SCHEMA IF NOT EXISTS "portal";

DO $$
BEGIN
  IF to_regclass('public.company') IS NOT NULL THEN
    ALTER TABLE public.company SET SCHEMA hr;
  END IF;
  IF to_regclass('public.branch') IS NOT NULL THEN
    ALTER TABLE public.branch SET SCHEMA hr;
  END IF;
  IF to_regclass('public.work_location') IS NOT NULL THEN
    ALTER TABLE public.work_location SET SCHEMA hr;
  END IF;
  IF to_regclass('public.cost_center') IS NOT NULL THEN
    ALTER TABLE public.cost_center SET SCHEMA hr;
  END IF;
  IF to_regclass('public.legal_responsible') IS NOT NULL THEN
    ALTER TABLE public.legal_responsible SET SCHEMA hr;
  END IF;
  IF to_regclass('public.job_position') IS NOT NULL THEN
    ALTER TABLE public.job_position SET SCHEMA hr;
  END IF;
  IF to_regclass('public.job_function') IS NOT NULL THEN
    ALTER TABLE public.job_function SET SCHEMA hr;
  END IF;
  IF to_regclass('public.function_nature') IS NOT NULL THEN
    ALTER TABLE public.function_nature SET SCHEMA hr;
  END IF;
  IF to_regclass('public.salary_range') IS NOT NULL THEN
    ALTER TABLE public.salary_range SET SCHEMA hr;
  END IF;
  IF to_regclass('public.salary_reference') IS NOT NULL THEN
    ALTER TABLE public.salary_reference SET SCHEMA hr;
  END IF;
  IF to_regclass('public.functional_status') IS NOT NULL THEN
    ALTER TABLE public.functional_status SET SCHEMA hr;
  END IF;
  IF to_regclass('public.employment_link') IS NOT NULL THEN
    ALTER TABLE public.employment_link SET SCHEMA hr;
  END IF;
  IF to_regclass('public.contract_type') IS NOT NULL THEN
    ALTER TABLE public.contract_type SET SCHEMA hr;
  END IF;
  IF to_regclass('public.reason') IS NOT NULL THEN
    ALTER TABLE public.reason SET SCHEMA hr;
  END IF;
  IF to_regclass('public.absence_reason') IS NOT NULL THEN
    ALTER TABLE public.absence_reason SET SCHEMA hr;
  END IF;
  IF to_regclass('public.termination_reason') IS NOT NULL THEN
    ALTER TABLE public.termination_reason SET SCHEMA hr;
  END IF;
  IF to_regclass('public.vacation_type') IS NOT NULL THEN
    ALTER TABLE public.vacation_type SET SCHEMA hr;
  END IF;
  IF to_regclass('public.shift') IS NOT NULL THEN
    ALTER TABLE public.shift SET SCHEMA hr;
  END IF;
  IF to_regclass('public.union_entity') IS NOT NULL THEN
    ALTER TABLE public.union_entity SET SCHEMA hr;
  END IF;
  IF to_regclass('public.bank') IS NOT NULL THEN
    ALTER TABLE public.bank SET SCHEMA hr;
  END IF;
  IF to_regclass('public.legal_nature') IS NOT NULL THEN
    ALTER TABLE public.legal_nature SET SCHEMA hr;
  END IF;
  IF to_regclass('public.legislation') IS NOT NULL THEN
    ALTER TABLE public.legislation SET SCHEMA hr;
  END IF;
  IF to_regclass('public.act_classification') IS NOT NULL THEN
    ALTER TABLE public.act_classification SET SCHEMA hr;
  END IF;
  IF to_regclass('public.transit_benefit') IS NOT NULL THEN
    ALTER TABLE public.transit_benefit SET SCHEMA hr;
  END IF;
  IF to_regclass('public.employee') IS NOT NULL THEN
    ALTER TABLE public.employee SET SCHEMA hr;
  END IF;
  IF to_regclass('public.employee_dependent') IS NOT NULL THEN
    ALTER TABLE public.employee_dependent SET SCHEMA hr;
  END IF;
  IF to_regclass('public.employee_status_history') IS NOT NULL THEN
    ALTER TABLE public.employee_status_history SET SCHEMA hr;
  END IF;
  IF to_regclass('public.professional_experience') IS NOT NULL THEN
    ALTER TABLE public.professional_experience SET SCHEMA hr;
  END IF;
  IF to_regclass('public.employee_transfer') IS NOT NULL THEN
    ALTER TABLE public.employee_transfer SET SCHEMA hr;
  END IF;
  IF to_regclass('public.employee_frequency') IS NOT NULL THEN
    ALTER TABLE public.employee_frequency SET SCHEMA hr;
  END IF;
  IF to_regclass('public.service_time_record') IS NOT NULL THEN
    ALTER TABLE public.service_time_record SET SCHEMA hr;
  END IF;
  IF to_regclass('public.vacation_record') IS NOT NULL THEN
    ALTER TABLE public.vacation_record SET SCHEMA hr;
  END IF;
  IF to_regclass('public.leave_record') IS NOT NULL THEN
    ALTER TABLE public.leave_record SET SCHEMA hr;
  END IF;
  IF to_regclass('public.employee_complement_data') IS NOT NULL THEN
    ALTER TABLE public.employee_complement_data SET SCHEMA hr;
  END IF;
  IF to_regclass('public.salary_level_history') IS NOT NULL THEN
    ALTER TABLE public.salary_level_history SET SCHEMA hr;
  END IF;
  IF to_regclass('public.education_institution') IS NOT NULL THEN
    ALTER TABLE public.education_institution SET SCHEMA hr;
  END IF;
  IF to_regclass('public.internship_program') IS NOT NULL THEN
    ALTER TABLE public.internship_program SET SCHEMA hr;
  END IF;
  IF to_regclass('public.agreement') IS NOT NULL THEN
    ALTER TABLE public.agreement SET SCHEMA hr;
  END IF;
  IF to_regclass('public.internship_record') IS NOT NULL THEN
    ALTER TABLE public.internship_record SET SCHEMA hr;
  END IF;
  IF to_regclass('public.business_day') IS NOT NULL THEN
    ALTER TABLE public.business_day SET SCHEMA hr;
  END IF;
  IF to_regclass('public.file_export_job') IS NOT NULL THEN
    ALTER TABLE public.file_export_job SET SCHEMA hr;
  END IF;
  IF to_regclass('public.consignment_import_job') IS NOT NULL THEN
    ALTER TABLE public.consignment_import_job SET SCHEMA hr;
  END IF;
  IF to_regclass('public.employee_payroll_item_import_job') IS NOT NULL THEN
    ALTER TABLE public.employee_payroll_item_import_job SET SCHEMA hr;
  END IF;
  IF to_regclass('public.competence_period') IS NOT NULL THEN
    ALTER TABLE public.competence_period SET SCHEMA hr;
  END IF;

  IF to_regclass('public.payroll_type') IS NOT NULL THEN
    ALTER TABLE public.payroll_type SET SCHEMA payroll;
  END IF;
  IF to_regclass('public.processing_type') IS NOT NULL THEN
    ALTER TABLE public.processing_type SET SCHEMA payroll;
  END IF;
  IF to_regclass('public.payroll_run') IS NOT NULL THEN
    ALTER TABLE public.payroll_run SET SCHEMA payroll;
  END IF;
  IF to_regclass('public.payroll_run_status_history') IS NOT NULL THEN
    ALTER TABLE public.payroll_run_status_history SET SCHEMA payroll;
  END IF;
  IF to_regclass('public.payroll_earning_deduction') IS NOT NULL THEN
    ALTER TABLE public.payroll_earning_deduction SET SCHEMA payroll;
  END IF;
  IF to_regclass('public.employee_payroll_item') IS NOT NULL THEN
    ALTER TABLE public.employee_payroll_item SET SCHEMA payroll;
  END IF;
  IF to_regclass('public.payroll_financial_record') IS NOT NULL THEN
    ALTER TABLE public.payroll_financial_record SET SCHEMA payroll;
  END IF;
  IF to_regclass('public.payment_remittance_file') IS NOT NULL THEN
    ALTER TABLE public.payment_remittance_file SET SCHEMA payroll;
  END IF;
  IF to_regclass('public.blocked_payment') IS NOT NULL THEN
    ALTER TABLE public.blocked_payment SET SCHEMA payroll;
  END IF;
END
$$;

