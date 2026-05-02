CREATE TABLE hr.branch (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    code text NOT NULL,
    acronym text,
    name text NOT NULL,
    cnpj text,
    branch_type public."BranchType" DEFAULT 'BRANCH'::public."BranchType" NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE hr.company (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    legal_name text NOT NULL,
    trade_name text,
    cnpj text,
    legal_nature_id uuid,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE hr.employee (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    registration text NOT NULL,
    name text NOT NULL,
    social_name text,
    cpf text,
    birth_date date,
    gender public."PersonGender" DEFAULT 'UNDECLARED'::public."PersonGender" NOT NULL,
    email text,
    phone text,
    branch_id uuid,
    work_location_id uuid,
    cost_center_id uuid,
    job_position_id uuid,
    job_function_id uuid,
    salary_reference_id uuid,
    functional_status_id uuid,
    employment_link_id uuid,
    contract_type_id uuid,
    shift_id uuid,
    union_id uuid,
    bank_id uuid,
    bank_agency text,
    bank_account text,
    hired_on date,
    terminated_on date,
    termination_reason_id uuid,
    lifecycle_status public."EmployeeLifecycleStatus" DEFAULT 'ACTIVE'::public."EmployeeLifecycleStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    pis_pasep text,
    rg text,
    rg_issuer text,
    mother_name text,
    father_name text,
    nationality_code text,
    birth_city_code text,
    address jsonb DEFAULT '{}'::jsonb NOT NULL,
    salary_range_level_id uuid,
    abono_permanencia_ativo boolean DEFAULT false NOT NULL,
    abono_permanencia_inicio date,
    abono_permanencia_fundamento text,
    marital_status text,
    education_level text,
    recruitment_concurso_id uuid,
    recruitment_nomeacao_id uuid,
    CONSTRAINT employee_hire_termination_dates_check CHECK (((terminated_on IS NULL) OR (hired_on IS NULL) OR (terminated_on >= hired_on)))
);

CREATE TABLE hr.employment_link (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    contract_type text DEFAULT 'statutory'::text NOT NULL,
    end_date date,
    commission_position_id uuid,
    regime_law_reference text DEFAULT 'Lei 8.112/90'::text NOT NULL,
    functional_status_id uuid,
    termination_payroll_run_id uuid,
    CONSTRAINT employment_link_commissioned_position_check CHECK (((contract_type <> 'commissioned'::text) OR (commission_position_id IS NOT NULL))),
    CONSTRAINT employment_link_contract_type_check CHECK ((contract_type = ANY (ARRAY['statutory'::text, 'celetista'::text, 'commissioned'::text, 'temporary'::text]))),
    CONSTRAINT employment_link_statutory_law_check CHECK (((contract_type <> 'statutory'::text) OR (length(btrim(regime_law_reference)) > 0))),
    CONSTRAINT employment_link_temporary_end_date_check CHECK (((contract_type <> 'temporary'::text) OR (end_date IS NOT NULL)))
);

CREATE TABLE hr.absence_reason (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE hr.act_classification (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE hr.administrative_process (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    process_number text NOT NULL,
    subject text NOT NULL,
    filed_on date NOT NULL,
    closed_on date,
    notes text DEFAULT ''::text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.administrative_process_function (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    process_id uuid NOT NULL,
    job_function_id uuid NOT NULL,
    branch_id uuid,
    work_location_id uuid,
    assigned_on date NOT NULL,
    released_on date,
    notes text DEFAULT ''::text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.agreement (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    institution_id uuid,
    program_id uuid,
    description text DEFAULT ''::text NOT NULL,
    starts_on date,
    ends_on date,
    status public."AgreementStatus" DEFAULT 'DRAFT'::public."AgreementStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    CONSTRAINT agreement_dates_check CHECK (((ends_on IS NULL) OR (starts_on IS NULL) OR (ends_on >= starts_on)))
);

CREATE TABLE hr.bank (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    agency_digit text,
    blocked boolean DEFAULT false NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE hr.beneficiary_contact_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    beneficiary_id uuid NOT NULL,
    contacted_on date NOT NULL,
    user_ref text NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.business_day (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    business_date date,
    is_business_day boolean DEFAULT true NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE hr.cadastral_change_request (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    section text NOT NULL,
    status public."CadastralChangeStatus" DEFAULT 'PENDING'::public."CadastralChangeStatus" NOT NULL,
    previous_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    requested_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    requested_by_sub text,
    requested_by_login text,
    requested_at timestamp(6) with time zone DEFAULT now() NOT NULL,
    decided_by_sub text,
    decided_by_login text,
    decided_at timestamp(6) with time zone,
    decision_notes text,
    created_at timestamp(6) with time zone DEFAULT now() NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cadastral_change_request_section_check CHECK ((section = ANY (ARRAY['cadastro'::text, 'endereco'::text, 'contato'::text, 'dependentes'::text, 'documentos'::text])))
);

CREATE TABLE hr.career_plan (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    employee_id uuid,
    name text NOT NULL,
    version text NOT NULL,
    effective_on date NOT NULL,
    levels_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    references_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.competence_period (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    competence_year integer NOT NULL,
    competence_month integer NOT NULL,
    status text DEFAULT 'OPEN'::text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    opened_at timestamp with time zone,
    closed_at timestamp with time zone,
    CONSTRAINT competence_period_status_check CHECK ((status = ANY (ARRAY['OPEN'::text, 'CALCULATING'::text, 'CALCULATED'::text, 'APPROVED'::text, 'GENERATED'::text, 'CLOSED'::text])))
);

CREATE TABLE hr.consignment_entity (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    bank_code text,
    contract_ref text,
    discount_kind text,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.consignment_import_job (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    source_file_name text,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE hr.contract_type (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE hr.contribution_time_certificate (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    issuing_agency text NOT NULL,
    issuance_act text NOT NULL,
    storage_key text,
    issued_at timestamp(6) with time zone NOT NULL,
    issued_by_ref text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.cost_center (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid,
    code text NOT NULL,
    name text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE hr.education_institution (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    cnpj text,
    address jsonb DEFAULT '{}'::jsonb NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE hr.employee_alimony (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    beneficiary_name text NOT NULL,
    beneficiary_cpf text,
    court_process_number text,
    amount numeric(14,2) DEFAULT 0 NOT NULL,
    starts_on date NOT NULL,
    ends_on date,
    notes text DEFAULT ''::text NOT NULL,
    status hr.employee_alimony_status DEFAULT 'ACTIVE'::hr.employee_alimony_status NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    court_order_number text,
    court_id text,
    judge_name text,
    beneficiary_bank_code smallint,
    beneficiary_branch text,
    beneficiary_account text,
    judicial_account boolean DEFAULT true NOT NULL,
    calculation_basis hr.alimony_calculation_basis DEFAULT 'GROSS'::hr.alimony_calculation_basis NOT NULL,
    rate numeric(18,6),
    fixed_amount numeric(14,2),
    valid_from date NOT NULL,
    valid_to date,
    priority smallint DEFAULT 1 NOT NULL,
    base_specific_codes text[] DEFAULT ARRAY[]::text[] NOT NULL
);

CREATE TABLE hr.employee_alimony_history (
    history_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    alimony_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    operation text NOT NULL,
    versioned_at timestamp with time zone DEFAULT now() NOT NULL,
    versioned_by text,
    previous_record jsonb NOT NULL,
    CONSTRAINT employee_alimony_history_operation_check CHECK ((operation = ANY (ARRAY['UPDATE'::text, 'DELETE'::text])))
);

CREATE TABLE hr.employee_bank_account (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    bank_id uuid NOT NULL,
    agency text NOT NULL,
    agency_digit text,
    account_number text NOT NULL,
    account_digit text NOT NULL,
    holder_kind hr.employee_bank_account_holder_kind DEFAULT 'SELF'::hr.employee_bank_account_holder_kind NOT NULL,
    holder_cpf text NOT NULL,
    dependent_id uuid,
    validation_status hr.employee_bank_account_validation_status DEFAULT 'PENDING'::hr.employee_bank_account_validation_status NOT NULL,
    validation_error_code text,
    validated_at timestamp with time zone,
    validated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT employee_bank_account_holder_consistency CHECK ((((holder_kind = 'SELF'::hr.employee_bank_account_holder_kind) AND (dependent_id IS NULL)) OR ((holder_kind = 'DEPENDENT'::hr.employee_bank_account_holder_kind) AND (dependent_id IS NOT NULL))))
);

CREATE TABLE hr.employee_bank_account_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    account_id uuid NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by uuid,
    before_json jsonb,
    after_json jsonb NOT NULL
);

CREATE TABLE hr.employee_benefit_dependent (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    dependent_id uuid,
    dependent_name text NOT NULL,
    dependent_cpf text,
    relationship text DEFAULT ''::text NOT NULL,
    benefit_code text NOT NULL,
    starts_on date NOT NULL,
    ends_on date,
    notes text DEFAULT ''::text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.employee_complement_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    rg text,
    rg_issuer text,
    pis_pasep text,
    voter_registration text,
    address jsonb DEFAULT '{}'::jsonb NOT NULL,
    emergency_contact jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE hr.employee_dependent (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    name text NOT NULL,
    cpf text,
    birth_date date,
    relationship text NOT NULL,
    income_tax_dependent boolean DEFAULT false NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    payroll_credit_authorized boolean DEFAULT false NOT NULL,
    authorization_document_id uuid
);

CREATE TABLE hr.employee_exercise (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    branch_id uuid,
    work_location_id uuid,
    job_function_id uuid,
    starts_on date NOT NULL,
    ends_on date,
    notes text DEFAULT ''::text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.employee_frequency (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    year integer NOT NULL,
    month integer,
    absence_days numeric(8,2) DEFAULT 0 NOT NULL,
    worked_days numeric(8,2),
    notes text DEFAULT ''::text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    CONSTRAINT employee_frequency_month_check CHECK (((month IS NULL) OR ((month >= 1) AND (month <= 12))))
);

CREATE TABLE hr.employee_payroll_item_import_job (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    competence_year integer,
    competence_month integer,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE hr.employee_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    functional_status_id uuid NOT NULL,
    reason_id uuid,
    starts_on date NOT NULL,
    ends_on date,
    notes text DEFAULT ''::text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    cause text DEFAULT ''::text NOT NULL,
    CONSTRAINT employee_status_history_dates_check CHECK (((ends_on IS NULL) OR (ends_on >= starts_on)))
);

CREATE TABLE hr.employee_transfer (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    from_branch_id uuid,
    to_branch_id uuid,
    to_work_location_id uuid,
    reason_id uuid,
    effective_on date NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    origem_work_location_id uuid,
    destino_work_location_id uuid,
    origem_job_position_id uuid,
    destino_job_position_id uuid,
    tipo hr.employee_transfer_type DEFAULT 'oficio'::hr.employee_transfer_type NOT NULL,
    data_solicitacao date DEFAULT CURRENT_DATE NOT NULL,
    data_efeito date NOT NULL,
    processo_administrativo_id uuid,
    status hr.employee_transfer_status DEFAULT 'solicitada'::hr.employee_transfer_status NOT NULL,
    aprovador_user_id uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT employee_transfer_distinct_branch_check CHECK (((from_branch_id IS NULL) OR (to_branch_id IS NULL) OR (from_branch_id <> to_branch_id)))
);

CREATE TABLE hr.employee_transit_benefit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    transit_benefit_id uuid NOT NULL,
    quantity numeric(10,2) DEFAULT 1 NOT NULL,
    starts_on date NOT NULL,
    ends_on date,
    notes text DEFAULT ''::text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.employee_union_contribution (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    union_id uuid,
    deduction_amount numeric(14,2),
    deduction_percent numeric(18,6),
    starts_on date NOT NULL,
    ends_on date,
    notes text DEFAULT ''::text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.employment_contract (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    employment_link_id uuid NOT NULL,
    contract_type_id uuid NOT NULL,
    appointed_on date,
    possession_on date,
    exercise_on date,
    starts_on date NOT NULL,
    ends_on date,
    legal_basis text DEFAULT ''::text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT employment_contract_dates_check CHECK (((ends_on IS NULL) OR (ends_on >= starts_on)))
);

CREATE TABLE hr.external_life_proof (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    beneficiary_id uuid NOT NULL,
    channel public."ExternalLifeProofChannel" NOT NULL,
    authentication_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    proven_at timestamp(6) with time zone NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.file_export_job (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    format text DEFAULT 'CSV'::text NOT NULL,
    target_route text,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE hr.function_nature (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE hr.functional_status (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    modality text,
    kind text,
    enters_payroll boolean DEFAULT false NOT NULL,
    lifecycle_status public."EmployeeLifecycleStatus" DEFAULT 'ACTIVE'::public."EmployeeLifecycleStatus" NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE hr.health_exam_provider_exam_link (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    exam_provider_entry_id uuid NOT NULL,
    exam_entry_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.health_provider_agreement_link (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    provider_entry_id uuid NOT NULL,
    agreement_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.internship_program (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_id uuid,
    code text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    starts_on date,
    ends_on date,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE hr.internship_record (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agreement_id uuid,
    program_id uuid,
    employee_id uuid,
    intern_name text NOT NULL,
    intern_cpf text,
    supervisor_name text,
    starts_on date NOT NULL,
    ends_on date,
    stipend_amount numeric(14,2),
    status public."AgreementStatus" DEFAULT 'ACTIVE'::public."AgreementStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    CONSTRAINT internship_record_dates_check CHECK (((ends_on IS NULL) OR (ends_on >= starts_on))),
    CONSTRAINT internship_record_stipend_nonnegative_check CHECK (((stipend_amount IS NULL) OR (stipend_amount >= (0)::numeric)))
);

CREATE TABLE hr.job_function (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    nature_id uuid,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE hr.job_function_legislation_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    job_function_id uuid NOT NULL,
    legislation_id uuid,
    code text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    effective_on date NOT NULL,
    ends_on date,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE hr.job_position (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    vacancies_total integer DEFAULT 0 NOT NULL,
    vacancies_filled integer DEFAULT 0 NOT NULL,
    vacancies_open integer DEFAULT 0 NOT NULL,
    category hr.job_position_category DEFAULT 'efetivo'::hr.job_position_category NOT NULL,
    legal_regime text DEFAULT 'estatutario'::text NOT NULL,
    creation_law text DEFAULT ''::text NOT NULL,
    vacancies_count integer DEFAULT 0 NOT NULL,
    salary_range_id uuid,
    CONSTRAINT job_position_vacancies_consistent CHECK ((vacancies_total = (vacancies_filled + vacancies_open))),
    CONSTRAINT job_position_vacancies_count_non_negative CHECK ((vacancies_count >= 0)),
    CONSTRAINT job_position_vacancies_non_negative CHECK (((vacancies_total >= 0) AND (vacancies_filled >= 0) AND (vacancies_open >= 0)))
);

CREATE TABLE hr.job_structure_employment_link (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    job_position_id uuid,
    job_function_id uuid,
    employment_link_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT job_structure_employment_link_owner_check CHECK (((
CASE
    WHEN (job_position_id IS NULL) THEN 0
    ELSE 1
END +
CASE
    WHEN (job_function_id IS NULL) THEN 0
    ELSE 1
END) = 1))
);

CREATE TABLE hr.job_structure_reference_link (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    job_position_id uuid,
    job_function_id uuid,
    reference_catalog_key text NOT NULL,
    reference_entry_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT job_structure_reference_link_owner_check CHECK (((
CASE
    WHEN (job_position_id IS NULL) THEN 0
    ELSE 1
END +
CASE
    WHEN (job_function_id IS NULL) THEN 0
    ELSE 1
END) = 1))
);

CREATE TABLE hr.leave_record (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    absence_reason_id uuid,
    starts_on date NOT NULL,
    ends_on date,
    days integer,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    paid boolean DEFAULT true NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    approved_at timestamp with time zone,
    approved_by text,
    supporting_document_ref text,
    CONSTRAINT leave_record_dates_check CHECK (((ends_on IS NULL) OR (ends_on >= starts_on))),
    CONSTRAINT leave_record_days_positive_check CHECK (((days IS NULL) OR (days > 0)))
);

CREATE TABLE hr.legal_nature (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    group_name text,
    name text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);
