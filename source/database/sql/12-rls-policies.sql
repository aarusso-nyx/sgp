-- Strict runtime row-level security policies for tenant-scoped SGP tables.
-- Policies require both tenant match and the relevant permission/auth predicate.

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'user_account',
    'access_profile',
    'profile_assignment',
    'user_group_snapshot',
    'menu_item',
    'system_parameter',
    'document_type',
    'tax_rate'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_select', table_name);
    EXECUTE format(
      $sql$
        CREATE POLICY %I ON public.%I
          FOR SELECT
          USING (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(ARRAY['gestao.read', 'gestao.write'])
            )
          )
      $sql$,
      table_name || '_select',
      table_name
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_write', table_name);
    EXECUTE format(
      $sql$
        CREATE POLICY %I ON public.%I
          FOR ALL
          USING (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(ARRAY['gestao.write'])
            )
          )
          WITH CHECK (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(ARRAY['gestao.write'])
            )
          )
      $sql$,
      table_name || '_write',
      table_name
    );
  END LOOP;
END
$$;

ALTER TABLE IF EXISTS public.esocial_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.esocial_event FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS esocial_event_select ON public.esocial_event;
CREATE POLICY esocial_event_select ON public.esocial_event
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(
        ARRAY['folha.read', 'folha.write', 'gestao.read', 'gestao.write']
      )
    )
  );
DROP POLICY IF EXISTS esocial_event_write ON public.esocial_event;
CREATE POLICY esocial_event_write ON public.esocial_event
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['folha.write', 'gestao.write'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['folha.write', 'gestao.write'])
    )
  );

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'company',
    'branch',
    'work_location',
    'cost_center',
    'legal_responsible',
    'job_position',
    'job_function',
    'function_nature',
    'salary_range',
    'salary_reference',
    'functional_status',
    'employment_link',
    'contract_type',
    'reason',
    'absence_reason',
    'termination_reason',
    'vacation_type',
    'shift',
    'shift_day_off',
    'union_entity',
    'bank',
    'legal_nature',
    'legislation',
    'job_function_legislation_history',
    'act_classification',
    'transit_benefit',
    'reference_catalog_entry',
    'health_provider_agreement_link',
    'health_exam_provider_exam_link',
    'salary_range_level',
    'consignment_entity',
    'service_provider',
    'service_taker',
    'job_structure_reference_link',
    'job_structure_employment_link',
    'work_location_structure_assignment',
    'training_suggestion',
    'training_suggestion_complement',
    'training_suggestion_employee',
    'training_suggestion_cost',
    'business_day',
    'file_export_job',
    'consignment_import_job',
    'employee_payroll_item_import_job',
    'competence_period'
  ]
  LOOP
    EXECUTE format('ALTER TABLE hr.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE hr.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', table_name || '_select', table_name);
    EXECUTE format(
      $sql$
        CREATE POLICY %I ON hr.%I
          FOR SELECT
          USING (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(
                ARRAY[
                  'gestao.read',
                  'gestao.write',
                  'rh.read',
                  'rh.write',
                  'recrutamento.read',
                  'recrutamento.write',
                  'saude.read',
                  'saude.write',
                  'folha.read',
                  'folha.write',
                  'relatorio.read',
                  'relatorio.generate'
                ]
              )
            )
          )
      $sql$,
      table_name || '_select',
      table_name
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', table_name || '_write', table_name);
    EXECUTE format(
      $sql$
        CREATE POLICY %I ON hr.%I
          FOR ALL
          USING (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(ARRAY['gestao.write'])
            )
          )
          WITH CHECK (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(ARRAY['gestao.write'])
            )
          )
      $sql$,
      table_name || '_write',
      table_name
    );
  END LOOP;
END
$$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['job_position', 'salary_range', 'salary_range_level']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', table_name || '_select', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', table_name || '_write', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', 'fol02_' || table_name || '_select', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', 'fol02_' || table_name || '_write', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON hr.%I FOR SELECT USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''gestao.cargo.read'', ''gestao.cargo.write''])))',
      'fol02_' || table_name || '_select',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON hr.%I FOR ALL USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''gestao.cargo.write'']))) WITH CHECK (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''gestao.cargo.write''])))',
      'fol02_' || table_name || '_write',
      table_name
    );
  END LOOP;
END
$$;

CREATE SCHEMA IF NOT EXISTS avaliacao;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['career_plan', 'career_plan_job_position']
  LOOP
    IF to_regclass(format('avaliacao.%I', table_name)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE avaliacao.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE avaliacao.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON avaliacao.%I', table_name || '_select', table_name);
    EXECUTE format(
      $sql$
        CREATE POLICY %I ON avaliacao.%I
          FOR SELECT
          USING (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(ARRAY['avaliacao.pccs.read', 'avaliacao.pccs.write'])
            )
          )
      $sql$,
      table_name || '_select',
      table_name
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON avaliacao.%I', table_name || '_write', table_name);
    EXECUTE format(
      $sql$
        CREATE POLICY %I ON avaliacao.%I
          FOR ALL
          USING (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(ARRAY['avaliacao.pccs.write'])
            )
          )
          WITH CHECK (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(ARRAY['avaliacao.pccs.write'])
            )
          )
      $sql$,
      table_name || '_write',
      table_name
    );
  END LOOP;
END
$$;

DROP POLICY IF EXISTS vacation_type_select ON hr.vacation_type;
DROP POLICY IF EXISTS vacation_type_write ON hr.vacation_type;
DROP POLICY IF EXISTS p_vacation_type_select ON hr.vacation_type;
DROP POLICY IF EXISTS p_vacation_type_write ON hr.vacation_type;
CREATE POLICY p_vacation_type_select ON hr.vacation_type
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY[
        'rh.vacation.read',
        'rh.vacation.request',
        'rh.vacation.approve',
        'gestao.master_data.read'
      ])
    )
  );
CREATE POLICY p_vacation_type_write ON hr.vacation_type
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['gestao.master_data.write'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['gestao.master_data.write'])
    )
  );

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'payroll_type',
    'processing_type',
    'payroll_earning_deduction',
    'formula_attribute',
    'gps_payment_code',
    'sefip_code',
    'accounting_history',
    'simple_account',
    'job_position_earning',
    'job_function_earning',
    'professional_category_earning',
    'employment_link_earning',
    'payroll_type_earning'
  ]
  LOOP
    EXECUTE format('ALTER TABLE payroll.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE payroll.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON payroll.%I', table_name || '_select', table_name);
    EXECUTE format(
      $sql$
        CREATE POLICY %I ON payroll.%I
          FOR SELECT
          USING (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(
                ARRAY[
                  'gestao.read',
                  'gestao.write',
                  'folha.read',
                  'folha.write',
                  'relatorio.read',
                  'relatorio.generate'
                ]
              )
            )
          )
      $sql$,
      table_name || '_select',
      table_name
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON payroll.%I', table_name || '_write', table_name);
    EXECUTE format(
      $sql$
        CREATE POLICY %I ON payroll.%I
          FOR ALL
          USING (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(ARRAY['gestao.write', 'folha.write'])
            )
          )
          WITH CHECK (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(ARRAY['gestao.write', 'folha.write'])
            )
          )
      $sql$,
      table_name || '_write',
      table_name
    );
  END LOOP;
END
$$;

DROP POLICY IF EXISTS vacation_record_select ON hr.vacation_record;
DROP POLICY IF EXISTS vacation_record_write ON hr.vacation_record;
DROP POLICY IF EXISTS p_vacation_record_select ON hr.vacation_record;
DROP POLICY IF EXISTS p_vacation_record_write ON hr.vacation_record;
CREATE POLICY p_vacation_record_select ON hr.vacation_record
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY[
        'rh.vacation.read',
        'rh.vacation.request',
        'rh.vacation.approve'
      ])
    )
  );
CREATE POLICY p_vacation_record_write ON hr.vacation_record
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['rh.vacation.request', 'rh.vacation.approve'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['rh.vacation.request', 'rh.vacation.approve'])
    )
  );

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'employee',
    'employee_dependent',
    'employee_status_history',
    'professional_experience',
    'employee_transfer',
    'employee_frequency',
    'service_time_record',
    'vacation_record',
    'leave_record',
    'employee_benefit_dependent',
    'employee_union_contribution',
    'employee_exercise',
    'employee_alimony',
    'employee_transit_benefit',
    'administrative_process',
    'administrative_process_function',
    'employee_complement_data',
    'salary_level_history'
  ]
  LOOP
    EXECUTE format('ALTER TABLE hr.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE hr.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', table_name || '_select', table_name);
    EXECUTE format(
      $sql$
        CREATE POLICY %I ON hr.%I
          FOR SELECT
          USING (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(
                ARRAY[
                  'rh.read',
                  'rh.write',
                  'recrutamento.read',
                  'recrutamento.write',
                  'saude.read',
                  'saude.write',
                  'folha.read',
                  'folha.write',
                  'relatorio.read',
                  'relatorio.generate'
                ]
              )
            )
          )
      $sql$,
      table_name || '_select',
      table_name
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', table_name || '_write', table_name);
    EXECUTE format(
      $sql$
        CREATE POLICY %I ON hr.%I
          FOR ALL
          USING (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(ARRAY['rh.write', 'saude.write'])
            )
          )
          WITH CHECK (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(ARRAY['rh.write', 'saude.write'])
            )
          )
      $sql$,
      table_name || '_write',
      table_name
    );
  END LOOP;
END
$$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'work_accident'
  ]
  LOOP
    EXECUTE format('ALTER TABLE hr.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE hr.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', table_name || '_select', table_name);
    EXECUTE format(
      $sql$
        CREATE POLICY %I ON hr.%I
          FOR SELECT
          USING (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(ARRAY['saude.read', 'saude.write'])
            )
          )
      $sql$,
      table_name || '_select',
      table_name
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', table_name || '_write', table_name);
    EXECUTE format(
      $sql$
        CREATE POLICY %I ON hr.%I
          FOR ALL
          USING (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(ARRAY['saude.write'])
            )
          )
          WITH CHECK (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(ARRAY['saude.write'])
            )
          )
      $sql$,
      table_name || '_write',
      table_name
    );
  END LOOP;
END
$$;

DO $$
BEGIN
  ALTER TABLE hr.medical_appointment ENABLE ROW LEVEL SECURITY;
  ALTER TABLE hr.medical_appointment FORCE ROW LEVEL SECURITY;
  ALTER TABLE hr.medical_record ENABLE ROW LEVEL SECURITY;
  ALTER TABLE hr.medical_record FORCE ROW LEVEL SECURITY;
  ALTER TABLE hr.medical_leave ENABLE ROW LEVEL SECURITY;
  ALTER TABLE hr.medical_leave FORCE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS medical_appointment_select ON hr.medical_appointment;
  DROP POLICY IF EXISTS medical_appointment_write ON hr.medical_appointment;
  DROP POLICY IF EXISTS p_medical_appointment_select ON hr.medical_appointment;
  DROP POLICY IF EXISTS p_medical_appointment_write ON hr.medical_appointment;
  CREATE POLICY p_medical_appointment_select ON hr.medical_appointment
    FOR SELECT
    USING (
      public.sgp_bypass_rls()
      OR (
        public.sgp_tenant_matches(tenant_id)
        AND public.sgp_has_any_permission(ARRAY['saude.read', 'saude.appointment.write'])
      )
    );
  CREATE POLICY p_medical_appointment_write ON hr.medical_appointment
    FOR ALL
    USING (
      public.sgp_bypass_rls()
      OR (
        public.sgp_tenant_matches(tenant_id)
        AND public.sgp_has_any_permission(ARRAY['saude.appointment.write'])
      )
    )
    WITH CHECK (
      public.sgp_bypass_rls()
      OR (
        public.sgp_tenant_matches(tenant_id)
        AND public.sgp_has_any_permission(ARRAY['saude.appointment.write'])
      )
    );

  DROP POLICY IF EXISTS medical_record_select ON hr.medical_record;
  DROP POLICY IF EXISTS medical_record_write ON hr.medical_record;
  DROP POLICY IF EXISTS p_medical_record_select ON hr.medical_record;
  DROP POLICY IF EXISTS p_medical_record_write ON hr.medical_record;
  CREATE POLICY p_medical_record_select ON hr.medical_record
    FOR SELECT
    USING (
      public.sgp_bypass_rls()
      OR (
        public.sgp_tenant_matches(tenant_id)
        AND public.sgp_has_any_permission(ARRAY['saude.read', 'saude.opinion.write'])
      )
    );
  CREATE POLICY p_medical_record_write ON hr.medical_record
    FOR ALL
    USING (
      public.sgp_bypass_rls()
      OR (
        public.sgp_tenant_matches(tenant_id)
        AND public.sgp_has_any_permission(ARRAY['saude.opinion.write'])
      )
    )
    WITH CHECK (
      public.sgp_bypass_rls()
      OR (
        public.sgp_tenant_matches(tenant_id)
        AND public.sgp_has_any_permission(ARRAY['saude.opinion.write'])
      )
    );

  DROP POLICY IF EXISTS medical_leave_select ON hr.medical_leave;
  DROP POLICY IF EXISTS medical_leave_write ON hr.medical_leave;
  DROP POLICY IF EXISTS p_medical_leave_select ON hr.medical_leave;
  DROP POLICY IF EXISTS p_medical_leave_write ON hr.medical_leave;
  CREATE POLICY p_medical_leave_select ON hr.medical_leave
    FOR SELECT
    USING (
      public.sgp_bypass_rls()
      OR (
        public.sgp_tenant_matches(tenant_id)
        AND public.sgp_has_any_permission(ARRAY['rh.medical_leave.read', 'saude.read', 'saude.opinion.write'])
      )
    );
  CREATE POLICY p_medical_leave_write ON hr.medical_leave
    FOR ALL
    USING (
      public.sgp_bypass_rls()
      OR (
        public.sgp_tenant_matches(tenant_id)
        AND public.sgp_has_any_permission(ARRAY['saude.opinion.write'])
      )
    )
    WITH CHECK (
      public.sgp_bypass_rls()
      OR (
        public.sgp_tenant_matches(tenant_id)
        AND public.sgp_has_any_permission(ARRAY['saude.opinion.write'])
      )
    );
END
$$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'performance_evaluation',
    'merit_progression',
    'salary_simulation',
    'career_plan',
    'salary_simulation_adjustment'
  ]
  LOOP
    EXECUTE format('ALTER TABLE hr.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE hr.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', table_name || '_select', table_name);
    EXECUTE format(
      $sql$
        CREATE POLICY %I ON hr.%I
          FOR SELECT
          USING (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(ARRAY['avaliacao.read', 'avaliacao.write'])
            )
          )
      $sql$,
      table_name || '_select',
      table_name
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', table_name || '_write', table_name);
    EXECUTE format(
      $sql$
        CREATE POLICY %I ON hr.%I
          FOR ALL
          USING (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(ARRAY['avaliacao.write'])
            )
          )
          WITH CHECK (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(ARRAY['avaliacao.write'])
            )
          )
      $sql$,
      table_name || '_write',
      table_name
    );
  END LOOP;
END
$$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'retirement_rule',
    'retirement_simulation',
    'retirement_grant',
    'pension_grant',
    'contribution_time_certificate',
    'previdentiary_declaration',
    'pension_compensation',
    'recertification_campaign',
    'recertification_beneficiary',
    'recertification_record',
    'external_life_proof',
    'beneficiary_contact_history'
  ]
  LOOP
    EXECUTE format('ALTER TABLE hr.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE hr.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', table_name || '_select', table_name);
    EXECUTE format(
      $sql$
        CREATE POLICY %I ON hr.%I
          FOR SELECT
          USING (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(ARRAY['previdenciario.read', 'previdenciario.write'])
            )
          )
      $sql$,
      table_name || '_select',
      table_name
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', table_name || '_write', table_name);
    EXECUTE format(
      $sql$
        CREATE POLICY %I ON hr.%I
          FOR ALL
          USING (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(ARRAY['previdenciario.write'])
            )
          )
          WITH CHECK (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(ARRAY['previdenciario.write'])
            )
          )
      $sql$,
      table_name || '_write',
      table_name
    );
  END LOOP;
END
$$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'recruitment_request',
    'recruitment_request_function',
    'recruitment_candidate'
  ]
  LOOP
    EXECUTE format('ALTER TABLE hr.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE hr.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', table_name || '_select', table_name);
    EXECUTE format(
      $sql$
        CREATE POLICY %I ON hr.%I
          FOR SELECT
          USING (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(ARRAY['recrutamento.read', 'recrutamento.write'])
            )
          )
      $sql$,
      table_name || '_select',
      table_name
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', table_name || '_write', table_name);
    EXECUTE format(
      $sql$
        CREATE POLICY %I ON hr.%I
          FOR ALL
          USING (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(ARRAY['recrutamento.write'])
            )
          )
          WITH CHECK (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(ARRAY['recrutamento.write'])
            )
          )
      $sql$,
      table_name || '_write',
      table_name
    );
  END LOOP;
END
$$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'education_institution',
    'internship_program',
    'agreement',
    'internship_record'
  ]
  LOOP
    EXECUTE format('ALTER TABLE hr.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE hr.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', table_name || '_select', table_name);
    EXECUTE format(
      $sql$
        CREATE POLICY %I ON hr.%I
          FOR SELECT
          USING (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(ARRAY['convenio.read', 'convenio.write'])
            )
          )
      $sql$,
      table_name || '_select',
      table_name
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', table_name || '_write', table_name);
    EXECUTE format(
      $sql$
        CREATE POLICY %I ON hr.%I
          FOR ALL
          USING (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(ARRAY['convenio.write'])
            )
          )
          WITH CHECK (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(ARRAY['convenio.write'])
            )
          )
      $sql$,
      table_name || '_write',
      table_name
    );
  END LOOP;
END
$$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'payroll_run',
    'payroll_run_status_history',
    'accounting_account',
    'accounting_account_work_location',
    'employee_payroll_item',
    'payroll_financial_record',
    'payroll_run_work_location',
    'advance_request',
    'advance_payment',
    'payment_remittance_file',
    'blocked_payment'
  ]
  LOOP
    EXECUTE format('ALTER TABLE payroll.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE payroll.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON payroll.%I', table_name || '_select', table_name);
    EXECUTE format(
      $sql$
        CREATE POLICY %I ON payroll.%I
          FOR SELECT
          USING (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(
                ARRAY['folha.read', 'folha.write', 'relatorio.read', 'relatorio.generate', 'auditoria.read']
              )
            )
          )
      $sql$,
      table_name || '_select',
      table_name
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON payroll.%I', table_name || '_write', table_name);
    EXECUTE format(
      $sql$
        CREATE POLICY %I ON payroll.%I
          FOR ALL
          USING (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(ARRAY['folha.write'])
            )
          )
          WITH CHECK (
            public.sgp_bypass_rls()
            OR (
              public.sgp_tenant_matches(tenant_id)
              AND public.sgp_has_any_permission(ARRAY['folha.write'])
            )
          )
      $sql$,
      table_name || '_write',
      table_name
    );
  END LOOP;
END
$$;

ALTER TABLE IF EXISTS public.audit_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_event FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_event_select ON public.audit_event;
CREATE POLICY audit_event_select ON public.audit_event
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['auditoria.read'])
    )
  );
DROP POLICY IF EXISTS audit_event_insert ON public.audit_event;
CREATE POLICY audit_event_insert ON public.audit_event
  FOR INSERT
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_is_authenticated()
    )
  );

ALTER TABLE IF EXISTS public.document_attachment ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.document_attachment FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS document_attachment_select ON public.document_attachment;
CREATE POLICY document_attachment_select ON public.document_attachment
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(
        ARRAY['documents.download', 'documents.register', 'auditoria.read']
      )
    )
  );
DROP POLICY IF EXISTS document_attachment_write ON public.document_attachment;
CREATE POLICY document_attachment_write ON public.document_attachment
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['documents.register'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['documents.register'])
    )
  );

ALTER TABLE IF EXISTS public.document_upload_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.document_upload_session FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS document_upload_session_select ON public.document_upload_session;
CREATE POLICY document_upload_session_select ON public.document_upload_session
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(
        ARRAY['documents.upload', 'documents.register', 'auditoria.read']
      )
    )
  );
DROP POLICY IF EXISTS document_upload_session_write ON public.document_upload_session;
CREATE POLICY document_upload_session_write ON public.document_upload_session
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['documents.upload', 'documents.register'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['documents.upload', 'documents.register'])
    )
  );

ALTER TABLE IF EXISTS public.document_download_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.document_download_audit FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS document_download_audit_select ON public.document_download_audit;
CREATE POLICY document_download_audit_select ON public.document_download_audit
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['auditoria.read', 'documents.download'])
    )
  );
DROP POLICY IF EXISTS document_download_audit_insert ON public.document_download_audit;
CREATE POLICY document_download_audit_insert ON public.document_download_audit
  FOR INSERT
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['documents.download'])
    )
  );

ALTER TABLE IF EXISTS public.report_definition ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.report_definition FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS report_definition_select ON public.report_definition;
CREATE POLICY report_definition_select ON public.report_definition
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['relatorio.read', 'relatorio.generate'])
    )
  );
DROP POLICY IF EXISTS report_definition_write ON public.report_definition;
CREATE POLICY report_definition_write ON public.report_definition
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['relatorio.generate'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['relatorio.generate'])
    )
  );

ALTER TABLE IF EXISTS public.report_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.report_request FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS report_request_select ON public.report_request;
CREATE POLICY report_request_select ON public.report_request
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(
        ARRAY['relatorio.read', 'relatorio.generate', 'auditoria.read']
      )
    )
  );
DROP POLICY IF EXISTS report_request_write ON public.report_request;
CREATE POLICY report_request_write ON public.report_request
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['relatorio.generate'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['relatorio.generate'])
    )
  );

ALTER TABLE IF EXISTS public.generated_report_file ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.generated_report_file FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS generated_report_file_select ON public.generated_report_file;
CREATE POLICY generated_report_file_select ON public.generated_report_file
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(
        ARRAY['relatorio.read', 'relatorio.generate', 'auditoria.read', 'documents.download']
      )
    )
  );
DROP POLICY IF EXISTS generated_report_file_write ON public.generated_report_file;
CREATE POLICY generated_report_file_write ON public.generated_report_file
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['relatorio.generate'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['relatorio.generate'])
    )
  );

ALTER TABLE IF EXISTS public.notification ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notification FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notification_select ON public.notification;
CREATE POLICY notification_select ON public.notification
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_is_authenticated()
    )
  );
DROP POLICY IF EXISTS notification_write ON public.notification;
CREATE POLICY notification_write ON public.notification
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_is_authenticated()
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_is_authenticated()
    )
  );
