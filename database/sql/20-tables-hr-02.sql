CREATE TABLE hr.legal_responsible (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid NOT NULL,
    name text NOT NULL,
    cpf text,
    role_title text NOT NULL,
    starts_on date NOT NULL,
    ends_on date,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE hr.legislation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    norm_number text NOT NULL,
    norm_year integer NOT NULL,
    norm_type text NOT NULL,
    federated_entity text,
    detail text DEFAULT ''::text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE hr.medical_appointment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    specialty_ref text,
    schedule_ref text,
    slot_ref text NOT NULL,
    scheduled_on date NOT NULL,
    scheduled_time text NOT NULL,
    contact_phone text,
    instructor_attachment jsonb DEFAULT '{}'::jsonb NOT NULL,
    status public."MedicalAppointmentStatus" DEFAULT 'SCHEDULED'::public."MedicalAppointmentStatus" NOT NULL,
    attended_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.medical_leave (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    medical_record_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    evaluation_type text NOT NULL,
    social_security_benefit text,
    absence_reason_id uuid,
    icd_ref text,
    granted_days integer NOT NULL,
    starts_on date NOT NULL,
    ends_on date NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    cid_code text,
    cid_secondary text,
    expert_opinion_id uuid
);

CREATE TABLE hr.medical_record (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    appointment_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    physician_ref text NOT NULL,
    reason text NOT NULL,
    current_illness_story text DEFAULT ''::text NOT NULL,
    physical_exam text DEFAULT ''::text NOT NULL,
    diagnosis text DEFAULT ''::text NOT NULL,
    expert_action text DEFAULT ''::text NOT NULL,
    report_type text DEFAULT ''::text NOT NULL,
    report_status public."MedicalReportStatus" DEFAULT 'PENDING_SUBMISSION'::public."MedicalReportStatus" NOT NULL,
    primary_icd_ref text,
    multidisciplinary_team jsonb DEFAULT '[]'::jsonb NOT NULL,
    approved_by_ref text,
    approved_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    decision text,
    opinion_notes text DEFAULT ''::text NOT NULL,
    evaluation_type text DEFAULT 'official_pericia'::text NOT NULL,
    granted_days integer,
    leave_starts_on date,
    leave_ends_on date,
    cid_code text,
    cid_secondary text,
    CONSTRAINT medical_record_decision_check CHECK (((decision IS NULL) OR (decision = ANY (ARRAY['granted'::text, 'denied'::text, 'pending'::text])))),
    CONSTRAINT medical_record_granted_days_check CHECK (((granted_days IS NULL) OR (granted_days > 0))),
    CONSTRAINT medical_record_leave_dates_check CHECK (((leave_starts_on IS NULL) OR (leave_ends_on IS NULL) OR (leave_ends_on >= leave_starts_on)))
);

CREATE TABLE hr.merit_progression (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    performance_evaluation_id uuid,
    source_salary_reference_id uuid,
    target_salary_reference_id uuid,
    effective_on date NOT NULL,
    appointment_act text DEFAULT ''::text NOT NULL,
    kind public."ProgressionKind" DEFAULT 'MERIT'::public."ProgressionKind" NOT NULL,
    justification text DEFAULT ''::text NOT NULL,
    approved_by_ref text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    progression_type hr.progression_type DEFAULT 'merit_horizontal'::hr.progression_type NOT NULL,
    data_efeito date NOT NULL,
    source_salary_range_level_id uuid,
    target_salary_range_level_id uuid,
    administrative_process_id uuid,
    status hr.progression_status DEFAULT 'eligible'::hr.progression_status NOT NULL,
    applied_at timestamp(6) with time zone
);

CREATE TABLE hr.pension_compensation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    employee_id uuid,
    certificate_ref text,
    origin_regime text NOT NULL,
    amount numeric(14,2) NOT NULL,
    status public."PensionCompensationStatus" DEFAULT 'DRAFT'::public."PensionCompensationStatus" NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.pension_grant (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    instituting_employee_id uuid,
    beneficiary_name text NOT NULL,
    beneficiary_cpf text,
    kinship text,
    benefit_type text NOT NULL,
    apportionment_type text NOT NULL,
    share_percent numeric(18,6) NOT NULL,
    adjustment_mode text NOT NULL,
    nature text NOT NULL,
    granted_on date NOT NULL,
    ceased_on date,
    legal_basis text NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.performance_evaluation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    branch_id uuid,
    work_location_id uuid,
    job_position_id uuid,
    job_function_id uuid,
    period_label text NOT NULL,
    score numeric(8,2) DEFAULT 0 NOT NULL,
    criteria jsonb DEFAULT '[]'::jsonb NOT NULL,
    evaluator_ref text NOT NULL,
    evaluated_on date NOT NULL,
    status public."PerformanceEvaluationStatus" DEFAULT 'DRAFT'::public."PerformanceEvaluationStatus" NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.previdentiary_declaration (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    type text NOT NULL,
    issued_at timestamp(6) with time zone NOT NULL,
    storage_key text,
    issued_by_ref text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.probation_evaluation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    score numeric(5,2) NOT NULL,
    decision text NOT NULL,
    evaluator_id uuid,
    notes text DEFAULT ''::text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT probation_evaluation_dates_check CHECK ((period_end >= period_start)),
    CONSTRAINT probation_evaluation_decision_check CHECK ((decision = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'extended'::text]))),
    CONSTRAINT probation_evaluation_score_check CHECK (((score >= (0)::numeric) AND (score <= (10)::numeric)))
);

CREATE TABLE hr.professional_experience (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    employer text NOT NULL,
    role_title text,
    starts_on date,
    ends_on date,
    description text DEFAULT ''::text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    CONSTRAINT professional_experience_dates_check CHECK (((ends_on IS NULL) OR (starts_on IS NULL) OR (ends_on >= starts_on)))
);

CREATE TABLE hr.reason (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    event_key text,
    kind text,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE hr.recertification_beneficiary (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    campaign_id uuid,
    type public."RecertificationBeneficiaryType" NOT NULL,
    next_due_date date NOT NULL,
    status public."RecertificationStatus" DEFAULT 'PENDING'::public."RecertificationStatus" NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.recertification_campaign (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    type public."RecertificationBeneficiaryType" NOT NULL,
    cycle_start date NOT NULL,
    cycle_end date NOT NULL,
    filter_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.recertification_record (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    beneficiary_id uuid NOT NULL,
    recertified_on date NOT NULL,
    operator_ref text NOT NULL,
    snapshot_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    receipt_storage_key text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.recruitment_candidate (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    request_id uuid NOT NULL,
    person_ref text NOT NULL,
    curriculum_s3_key text,
    status public."RecruitmentCandidateStatus" DEFAULT 'PENDING'::public."RecruitmentCandidateStatus" NOT NULL,
    review_comment text DEFAULT ''::text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.recruitment_request (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    requester_ref text NOT NULL,
    branch_id uuid,
    work_location_id uuid,
    reason text NOT NULL,
    justification text NOT NULL,
    request_date date NOT NULL,
    due_date date,
    status public."RecruitmentRequestStatus" DEFAULT 'DRAFT'::public."RecruitmentRequestStatus" NOT NULL,
    completed_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.recruitment_request_function (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    request_id uuid NOT NULL,
    job_function_id uuid,
    hiring_type public."RecruitmentHiringType" NOT NULL,
    vacancy_count integer NOT NULL,
    requirements text DEFAULT ''::text NOT NULL,
    shift_id uuid,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.reference_catalog_entry (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    catalog_key text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.reintegration_order (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    employment_link_id uuid NOT NULL,
    original_termination_event_id uuid NOT NULL,
    reinstatement_date date NOT NULL,
    kind hr.reintegration_order_kind NOT NULL,
    process_number text,
    court text,
    decision_date date NOT NULL,
    attachment_uri text,
    status hr.reintegration_order_status DEFAULT 'REGISTERED'::hr.reintegration_order_status NOT NULL,
    applied_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reintegration_order_judicial_process_required CHECK (((kind <> 'JUDICIAL'::hr.reintegration_order_kind) OR (NULLIF(process_number, ''::text) IS NOT NULL)))
);

CREATE TABLE hr.retirement_grant (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    rule_id uuid NOT NULL,
    granted_on date NOT NULL,
    legal_basis text NOT NULL,
    appointment_act text NOT NULL,
    status text DEFAULT 'CONCEDIDA'::text NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    granted_by_ref text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.retirement_rule (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    name text NOT NULL,
    legal_basis text NOT NULL,
    age_criteria jsonb DEFAULT '{}'::jsonb NOT NULL,
    contribution_time_criteria jsonb DEFAULT '{}'::jsonb NOT NULL,
    grace_period_criteria jsonb DEFAULT '{}'::jsonb NOT NULL,
    applicable_employment_link text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.retirement_simulation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    rule_id uuid NOT NULL,
    result jsonb DEFAULT '{}'::jsonb NOT NULL,
    details_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    simulated_on timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by_ref text
);

CREATE TABLE hr.salary_level_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid,
    salary_reference_id uuid,
    level_code text,
    level_description text,
    adjustment_amount numeric(14,2) DEFAULT 0 NOT NULL,
    effective_on date NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    salary_range_level_id uuid,
    vigencia_inicio date NOT NULL,
    vigencia_fim date,
    vencimento_basico numeric(14,2) NOT NULL,
    motivo hr.salary_history_reason DEFAULT 'reajuste_data_base'::hr.salary_history_reason NOT NULL,
    lei_referencia text DEFAULT ''::text NOT NULL,
    CONSTRAINT salary_level_history_employee_or_level_required CHECK (((employee_id IS NOT NULL) OR (salary_range_level_id IS NOT NULL))),
    CONSTRAINT salary_level_history_vigencia_valid CHECK (((vigencia_fim IS NULL) OR (vigencia_fim >= vigencia_inicio)))
);

CREATE TABLE hr.salary_range (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    group_code text,
    class_code text,
    name text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    starts_on date DEFAULT '1900-01-01'::date NOT NULL,
    ends_on date,
    career_plan_id uuid
);

CREATE TABLE hr.salary_range_level (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    salary_range_id uuid NOT NULL,
    salary_reference_id uuid,
    code text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    level_number integer DEFAULT 1 NOT NULL,
    amount_override numeric(14,2),
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    class_number integer DEFAULT 1 NOT NULL,
    level_number_fol02 integer NOT NULL,
    base_salary numeric(14,2) NOT NULL,
    CONSTRAINT salary_range_level_base_salary_non_negative CHECK ((base_salary >= (0)::numeric)),
    CONSTRAINT salary_range_level_class_positive CHECK ((class_number > 0)),
    CONSTRAINT salary_range_level_level_positive CHECK ((level_number_fol02 > 0))
);

CREATE TABLE hr.salary_reference (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    range_id uuid,
    code text NOT NULL,
    description text NOT NULL,
    amount numeric(14,2) DEFAULT 0 NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    vigencia_inicio date DEFAULT '1900-01-01'::date NOT NULL,
    vigencia_fim date,
    motivo hr.salary_history_reason DEFAULT 'reajuste_data_base'::hr.salary_history_reason NOT NULL,
    lei_referencia text DEFAULT ''::text NOT NULL,
    CONSTRAINT salary_reference_vigencia_valid CHECK (((vigencia_fim IS NULL) OR (vigencia_fim >= vigencia_inicio)))
);

CREATE TABLE hr.salary_simulation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    scenario text NOT NULL,
    result_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by_ref text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    progression_id uuid
);

CREATE TABLE hr.salary_simulation_adjustment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    simulation_id uuid NOT NULL,
    label text NOT NULL,
    percent_adjustment numeric(18,6),
    fixed_adjustment numeric(14,2),
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.service_provider (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    branch_id uuid,
    agreement_id uuid,
    category_entry_id uuid,
    cbo_entry_id uuid,
    earning_deduction_id uuid,
    code text NOT NULL,
    name text NOT NULL,
    cpf_cnpj text,
    email text,
    phone text,
    address jsonb DEFAULT '{}'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.service_taker (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    gps_payment_code_id uuid,
    sefip_code_id uuid,
    code text NOT NULL,
    name text NOT NULL,
    cnpj text,
    contact text DEFAULT ''::text NOT NULL,
    address jsonb DEFAULT '{}'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.service_time_record (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    source text NOT NULL,
    starts_on date NOT NULL,
    ends_on date,
    days_count integer,
    notes text DEFAULT ''::text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    CONSTRAINT service_time_record_dates_check CHECK (((ends_on IS NULL) OR (ends_on >= starts_on)))
);

CREATE TABLE hr.shift (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    schedule text,
    daily_hours numeric(5,2),
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE hr.shift_day_off (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    shift_id uuid NOT NULL,
    weekday integer NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT shift_day_off_weekday_check CHECK (((weekday >= 0) AND (weekday <= 6)))
);

CREATE TABLE hr.termination_reason (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE hr.training_suggestion (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    course_entry_id uuid,
    code text NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    priority text DEFAULT 'NORMAL'::text NOT NULL,
    suggested_on date,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.training_suggestion_complement (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    suggestion_id uuid NOT NULL,
    city_entry_id uuid,
    code text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    scheduled_on date,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.training_suggestion_cost (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    suggestion_id uuid NOT NULL,
    code text NOT NULL,
    cost_kind text NOT NULL,
    amount numeric(14,2) DEFAULT 0 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.training_suggestion_employee (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    suggestion_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.transit_benefit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    unit_amount numeric(14,2) DEFAULT 0 NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE hr.tsv_contract (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    employment_link_id uuid NOT NULL,
    tsv_category character(3) NOT NULL,
    start_date date NOT NULL,
    end_date date,
    role text NOT NULL,
    monthly_amount numeric(14,2) NOT NULL,
    weekly_hours numeric(18,6) NOT NULL,
    workplace_id uuid NOT NULL,
    supervisor_employee_id uuid,
    education_institution text,
    internship_plan_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE hr.tsv_contract_change (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    tsv_contract_id uuid NOT NULL,
    effective_date date NOT NULL,
    fields_changed jsonb NOT NULL,
    previous_values jsonb NOT NULL,
    new_values jsonb NOT NULL,
    reason text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tsv_contract_change_fields_object CHECK ((jsonb_typeof(fields_changed) = 'object'::text)),
    CONSTRAINT tsv_contract_change_new_object CHECK ((jsonb_typeof(new_values) = 'object'::text)),
    CONSTRAINT tsv_contract_change_previous_object CHECK ((jsonb_typeof(previous_values) = 'object'::text))
);

CREATE TABLE hr.union_entity (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    cnpj text,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE hr.vacation_record (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    vacation_type_id uuid,
    accrual_start_on date,
    accrual_end_on date,
    starts_on date NOT NULL,
    ends_on date NOT NULL,
    days integer NOT NULL,
    status text DEFAULT 'programado'::text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    accrual_period_start date,
    accrual_period_end date,
    installment_number integer DEFAULT 1 NOT NULL,
    pecuniary_bonus_days integer DEFAULT 0 NOT NULL,
    payroll_run_id uuid,
    CONSTRAINT vacation_record_accrual_dates_check CHECK (((accrual_start_on IS NULL) OR (accrual_end_on IS NULL) OR (accrual_end_on >= accrual_start_on))),
    CONSTRAINT vacation_record_accrual_period_dates_check CHECK (((accrual_period_start IS NULL) OR (accrual_period_end IS NULL) OR (accrual_period_end >= accrual_period_start))),
    CONSTRAINT vacation_record_dates_check CHECK (((ends_on >= starts_on) AND (days > 0))),
    CONSTRAINT vacation_record_installment_number_check CHECK (((installment_number >= 1) AND (installment_number <= 3))),
    CONSTRAINT vacation_record_pecuniary_bonus_days_check CHECK (((pecuniary_bonus_days >= 0) AND (pecuniary_bonus_days <= 10))),
    CONSTRAINT vacation_record_status_check CHECK ((status = ANY (ARRAY['programado'::text, 'aprovado'::text, 'gozado'::text, 'cancelado'::text, 'paid'::text])))
);

CREATE TABLE hr.vacation_type (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE hr.work_accident (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    medical_leave_id uuid,
    icd_ref text,
    occurred_on date,
    leave_days integer,
    notes text DEFAULT ''::text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.work_location (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid,
    parent_id uuid,
    code text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    fpas_code text DEFAULT '000'::text NOT NULL,
    fap_rate numeric(18,6) DEFAULT 0 NOT NULL,
    geofence_polygon postgis.geometry(Polygon,4326)
);

CREATE TABLE hr.work_location_structure_assignment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    work_location_id uuid NOT NULL,
    job_position_id uuid,
    job_function_id uuid,
    code text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT work_location_structure_assignment_structure_check CHECK (((
CASE
    WHEN (job_position_id IS NULL) THEN 0
    ELSE 1
END +
CASE
    WHEN (job_function_id IS NULL) THEN 0
    ELSE 1
END) = 1))
);
