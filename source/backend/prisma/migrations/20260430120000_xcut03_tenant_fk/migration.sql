-- XCUT-03: every tenant-scoped table must reject orphan tenant_id values.
-- Global catalogs remain excluded: public.permission and public.profile_permission.

DO $$
DECLARE
  rec record;
  constraint_name text;
BEGIN
  FOR rec IN
    SELECT *
    FROM (
      VALUES
        ('public', 'user_account'),
        ('public', 'access_profile'),
        ('public', 'profile_assignment'),
        ('public', 'user_group_snapshot'),
        ('public', 'menu_item'),
        ('public', 'audit_event'),
        ('hr', 'company'),
        ('hr', 'branch'),
        ('hr', 'work_location'),
        ('hr', 'cost_center'),
        ('hr', 'legal_responsible'),
        ('hr', 'job_position'),
        ('hr', 'job_function'),
        ('hr', 'function_nature'),
        ('hr', 'salary_range'),
        ('hr', 'salary_reference'),
        ('hr', 'functional_status'),
        ('hr', 'employment_link'),
        ('hr', 'contract_type'),
        ('payroll', 'payroll_type'),
        ('payroll', 'processing_type'),
        ('hr', 'reason'),
        ('hr', 'absence_reason'),
        ('hr', 'termination_reason'),
        ('public', 'document_type'),
        ('hr', 'vacation_type'),
        ('hr', 'shift'),
        ('hr', 'shift_day_off'),
        ('hr', 'union_entity'),
        ('hr', 'bank'),
        ('hr', 'legal_nature'),
        ('hr', 'legislation'),
        ('hr', 'job_function_legislation_history'),
        ('hr', 'act_classification'),
        ('hr', 'transit_benefit'),
        ('hr', 'reference_catalog_entry'),
        ('hr', 'job_structure_reference_link'),
        ('hr', 'job_structure_employment_link'),
        ('hr', 'work_location_structure_assignment'),
        ('public', 'system_parameter'),
        ('hr', 'employee'),
        ('hr', 'employee_dependent'),
        ('hr', 'employee_status_history'),
        ('hr', 'professional_experience'),
        ('hr', 'employee_transfer'),
        ('hr', 'employee_frequency'),
        ('hr', 'service_time_record'),
        ('hr', 'vacation_record'),
        ('hr', 'leave_record'),
        ('hr', 'employee_benefit_dependent'),
        ('hr', 'employee_union_contribution'),
        ('hr', 'employee_exercise'),
        ('hr', 'employee_alimony'),
        ('hr', 'employee_transit_benefit'),
        ('hr', 'administrative_process'),
        ('hr', 'administrative_process_function'),
        ('hr', 'medical_appointment'),
        ('hr', 'medical_record'),
        ('hr', 'medical_leave'),
        ('hr', 'work_accident'),
        ('hr', 'employee_complement_data'),
        ('hr', 'salary_level_history'),
        ('hr', 'salary_range_level'),
        ('payroll', 'payroll_run'),
        ('payroll', 'payroll_run_status_history'),
        ('payroll', 'payroll_earning_deduction'),
        ('payroll', 'formula_attribute'),
        ('payroll', 'job_position_earning'),
        ('payroll', 'employment_link_earning'),
        ('payroll', 'payroll_type_earning'),
        ('payroll', 'job_function_earning'),
        ('payroll', 'professional_category_earning'),
        ('payroll', 'employee_payroll_item'),
        ('payroll', 'payroll_financial_record'),
        ('payroll', 'payroll_run_work_location'),
        ('payroll', 'advance_request'),
        ('payroll', 'advance_payment'),
        ('payroll', 'gps_payment_code'),
        ('payroll', 'sefip_code'),
        ('payroll', 'accounting_history'),
        ('payroll', 'simple_account'),
        ('payroll', 'accounting_account'),
        ('payroll', 'accounting_account_work_location'),
        ('payroll', 'payment_remittance_file'),
        ('payroll', 'blocked_payment'),
        ('public', 'document_attachment'),
        ('public', 'document_upload_session'),
        ('public', 'esocial_event'),
        ('public', 'report_definition'),
        ('public', 'report_request'),
        ('public', 'generated_report_file'),
        ('public', 'document_download_audit'),
        ('hr', 'education_institution'),
        ('hr', 'internship_program'),
        ('hr', 'agreement'),
        ('hr', 'health_provider_agreement_link'),
        ('hr', 'health_exam_provider_exam_link'),
        ('hr', 'internship_record'),
        ('hr', 'recruitment_request'),
        ('hr', 'recruitment_request_function'),
        ('hr', 'recruitment_candidate'),
        ('hr', 'training_suggestion'),
        ('hr', 'training_suggestion_complement'),
        ('hr', 'training_suggestion_employee'),
        ('hr', 'training_suggestion_cost'),
        ('hr', 'performance_evaluation'),
        ('hr', 'merit_progression'),
        ('hr', 'salary_simulation'),
        ('hr', 'career_plan'),
        ('hr', 'salary_simulation_adjustment'),
        ('hr', 'retirement_rule'),
        ('hr', 'retirement_simulation'),
        ('hr', 'retirement_grant'),
        ('hr', 'pension_grant'),
        ('hr', 'contribution_time_certificate'),
        ('hr', 'previdentiary_declaration'),
        ('hr', 'pension_compensation'),
        ('hr', 'recertification_campaign'),
        ('hr', 'recertification_beneficiary'),
        ('hr', 'recertification_record'),
        ('hr', 'external_life_proof'),
        ('hr', 'beneficiary_contact_history'),
        ('public', 'notification'),
        ('hr', 'business_day'),
        ('hr', 'consignment_entity'),
        ('hr', 'service_provider'),
        ('hr', 'service_taker'),
        ('hr', 'file_export_job'),
        ('hr', 'consignment_import_job'),
        ('hr', 'employee_payroll_item_import_job'),
        ('hr', 'competence_period'),
        ('public', 'tax_rate')
    ) AS tenant_table(schema_name, table_name)
  LOOP
    IF to_regclass(format('%I.%I', rec.schema_name, rec.table_name)) IS NULL THEN
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = rec.schema_name
        AND table_name = rec.table_name
        AND column_name = 'tenant_id'
    ) THEN
      RAISE EXCEPTION 'Tenant-scoped table %.% is missing tenant_id', rec.schema_name, rec.table_name;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_constraint constraint_row
      WHERE constraint_row.conrelid = format('%I.%I', rec.schema_name, rec.table_name)::regclass
        AND constraint_row.contype = 'f'
        AND constraint_row.confrelid = 'public.tenant'::regclass
    ) THEN
      CONTINUE;
    END IF;

    constraint_name := format('fk_%s_tenant', rec.table_name);
    EXECUTE format(
      'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT',
      rec.schema_name,
      rec.table_name,
      constraint_name
    );
  END LOOP;
END
$$;
