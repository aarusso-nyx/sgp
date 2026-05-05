CREATE TYPE hr.alimony_calculation_basis AS ENUM (
    'GROSS',
    'NET',
    'BASE_SPECIFIC'
);

CREATE TYPE hr.employee_alimony_status AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'TERMINATED'
);

CREATE TYPE hr.employee_bank_account_holder_kind AS ENUM (
    'SELF',
    'DEPENDENT'
);

CREATE TYPE hr.employee_bank_account_validation_status AS ENUM (
    'PENDING',
    'VALID',
    'REJECTED'
);

CREATE TYPE hr.employee_transfer_status AS ENUM (
    'solicitada',
    'aprovada',
    'efetivada',
    'indeferida',
    'cancelada'
);

CREATE TYPE hr.employee_transfer_type AS ENUM (
    'oficio',
    'pedido_criterio',
    'pedido_localidade',
    'permuta'
);

CREATE TYPE hr.job_position_category AS ENUM (
    'efetivo',
    'comissionado',
    'temporario',
    'eletivo',
    'emprego_publico'
);

CREATE TYPE hr.progression_status AS ENUM (
    'eligible',
    'simulated',
    'applied',
    'revoked'
);

CREATE TYPE hr.progression_type AS ENUM (
    'merit_horizontal',
    'vertical_promotion'
);

CREATE TYPE hr.reintegration_order_kind AS ENUM (
    'JUDICIAL',
    'ADMINISTRATIVE_ANNULMENT',
    'AMNESTY'
);

CREATE TYPE hr.reintegration_order_status AS ENUM (
    'REGISTERED',
    'APPLIED',
    'TRANSMITTED',
    'ACCEPTED',
    'REJECTED'
);

CREATE TYPE hr.salary_history_reason AS ENUM (
    'reajuste_data_base',
    'correcao',
    'reestruturacao'
);

CREATE TYPE hr.cadastral_change_section AS ENUM (
    'cadastro',
    'endereco',
    'contato',
    'dependentes',
    'documentos'
);

CREATE TYPE hr.employee_alimony_history_operation AS ENUM (
    'UPDATE',
    'DELETE'
);

CREATE TYPE hr.cf37_xvi_accumulation_role_kind AS ENUM (
    'TEACHER',
    'TECHNICAL_SCIENTIFIC',
    'HEALTH_PROFESSIONAL',
    'COMMISSIONED',
    'OTHER'
);

CREATE TYPE hr.probation_evaluation_decision AS ENUM (
    'pending',
    'approved',
    'rejected',
    'extended'
);

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
    version integer DEFAULT 0 NOT NULL,
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
    version integer DEFAULT 0 NOT NULL,
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
    -- R4-71: deferred enum conversion; contract_type is still consumed as text by 40-payment-functions.sql and 40-hr-functions.sql.
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
    -- R4-71: closed portal profile section set converted from ANY ARRAY CHECK to enum.
    section hr.cadastral_change_section NOT NULL,
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
    updated_at timestamp(6) with time zone DEFAULT now() NOT NULL
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
    -- R4-71: deferred enum conversion; 70-portal-final.sql compares competence status through text arrays in paystub views.
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
    -- R4-71: closed audit-history operation set converted from ANY ARRAY CHECK to enum.
    operation hr.employee_alimony_history_operation NOT NULL,
    versioned_at timestamp with time zone DEFAULT now() NOT NULL,
    versioned_by text,
    previous_record jsonb NOT NULL
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
    tsv_contract_id uuid,
    intern_name text NOT NULL,
    intern_cpf text,
    supervisor_name text,
    supervisor_employee_id uuid,
    starts_on date NOT NULL,
    ends_on date,
    stipend_amount numeric(14,2),
    term_number text NOT NULL,
    term_signed_on date,
    activity_plan_uri text NOT NULL,
    activity_plan_description text DEFAULT ''::text NOT NULL,
    role text DEFAULT 'Estagiario'::text NOT NULL,
    weekly_hours numeric(18,6) DEFAULT 30.000000 NOT NULL,
    course_name text,
    education_level text,
    insurance_policy text,
    status public."AgreementStatus" DEFAULT 'ACTIVE'::public."AgreementStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    CONSTRAINT internship_record_dates_check CHECK (((ends_on IS NULL) OR (ends_on >= starts_on))),
    CONSTRAINT internship_record_stipend_nonnegative_check CHECK (((stipend_amount IS NULL) OR (stipend_amount >= (0)::numeric))),
    CONSTRAINT internship_record_term_plan_check CHECK (((length(btrim(term_number)) > 0) AND (length(btrim(activity_plan_uri)) > 0))),
    CONSTRAINT internship_record_weekly_hours_check CHECK (((weekly_hours > (0)::numeric) AND (weekly_hours <= (30)::numeric)))
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

CREATE TABLE hr.cf37_xvi_accumulation_compatibility (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    -- R4-71: closed CF art. 37 XVI role-kind set converted from ANY ARRAY CHECK to enum.
    primary_role_kind hr.cf37_xvi_accumulation_role_kind NOT NULL,
    secondary_role_kind hr.cf37_xvi_accumulation_role_kind NOT NULL,
    allowed boolean NOT NULL,
    schedule_compatibility_required boolean DEFAULT true NOT NULL,
    legal_basis text DEFAULT 'CF art. 37 XVI'::text NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT cf37_xvi_accumulation_compatibility_pkey PRIMARY KEY (id),
    CONSTRAINT cf37_xvi_accumulation_compatibility_pair_uq UNIQUE (primary_role_kind, secondary_role_kind),
    CONSTRAINT cf37_xvi_accumulation_compatibility_basis_chk CHECK ((length(btrim(legal_basis)) > 0))
);

CREATE TABLE hr.organic_definition (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    work_location_id uuid NOT NULL,
    job_position_id uuid NOT NULL,
    vacancies_total integer NOT NULL,
    vacancies_filled integer DEFAULT 0 NOT NULL,
    vacancies_open integer NOT NULL,
    effective_from date DEFAULT CURRENT_DATE NOT NULL,
    effective_to date,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT organic_definition_effective_range_check CHECK (((effective_to IS NULL) OR (effective_to >= effective_from))),
    CONSTRAINT organic_definition_vacancies_consistent CHECK ((vacancies_total = (vacancies_filled + vacancies_open))),
    CONSTRAINT organic_definition_vacancies_non_negative CHECK (((vacancies_total >= 0) AND (vacancies_filled >= 0) AND (vacancies_open >= 0)))
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
    -- R4-71: deferred enum conversion; 70-hr-final.sql trigger predicates and HR-04 functions still bind decision as text.
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
    -- R4-71: closed probation decision set converted from ANY ARRAY CHECK to enum.
    decision hr.probation_evaluation_decision NOT NULL,
    evaluator_id uuid,
    notes text DEFAULT ''::text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT probation_evaluation_dates_check CHECK ((period_end >= period_start)),
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
    -- R4-71: deferred enum conversion; 70-hr-final.sql still uses text predicates for vacation status.
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

ALTER TABLE ONLY hr.absence_reason
    ADD CONSTRAINT absence_reason_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.act_classification
    ADD CONSTRAINT act_classification_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.administrative_process_function
    ADD CONSTRAINT administrative_process_function_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.administrative_process
    ADD CONSTRAINT administrative_process_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.agreement
    ADD CONSTRAINT agreement_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.bank
    ADD CONSTRAINT bank_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.beneficiary_contact_history
    ADD CONSTRAINT beneficiary_contact_history_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.branch
    ADD CONSTRAINT branch_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.business_day
    ADD CONSTRAINT business_day_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.cadastral_change_request
    ADD CONSTRAINT cadastral_change_request_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.career_plan
    ADD CONSTRAINT career_plan_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.company
    ADD CONSTRAINT company_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.competence_period
    ADD CONSTRAINT competence_period_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.consignment_entity
    ADD CONSTRAINT consignment_entity_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.consignment_import_job
    ADD CONSTRAINT consignment_import_job_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.contract_type
    ADD CONSTRAINT contract_type_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.contribution_time_certificate
    ADD CONSTRAINT contribution_time_certificate_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.cost_center
    ADD CONSTRAINT cost_center_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.education_institution
    ADD CONSTRAINT education_institution_pkey PRIMARY KEY (id);

ALTER TABLE hr.employee_alimony
    ADD CONSTRAINT employee_alimony_amount_source_check CHECK ((((fixed_amount IS NOT NULL) AND (rate IS NULL)) OR ((fixed_amount IS NULL) AND (rate IS NOT NULL)))) NOT VALID;

ALTER TABLE hr.employee_alimony
    ADD CONSTRAINT employee_alimony_fixed_amount_check CHECK (((fixed_amount IS NULL) OR (fixed_amount >= (0)::numeric))) NOT VALID;

ALTER TABLE ONLY hr.employee_alimony_history
    ADD CONSTRAINT employee_alimony_history_pkey PRIMARY KEY (history_id);

ALTER TABLE ONLY hr.employee_alimony
    ADD CONSTRAINT employee_alimony_pkey PRIMARY KEY (id);

ALTER TABLE hr.employee_alimony
    ADD CONSTRAINT employee_alimony_rate_check CHECK (((rate IS NULL) OR ((rate > (0)::numeric) AND (rate <= (100)::numeric)))) NOT VALID;

ALTER TABLE hr.employee_alimony
    ADD CONSTRAINT employee_alimony_valid_range_check CHECK (((valid_to IS NULL) OR (valid_to >= valid_from))) NOT VALID;

ALTER TABLE ONLY hr.employee_bank_account_history
    ADD CONSTRAINT employee_bank_account_history_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.employee_bank_account
    ADD CONSTRAINT employee_bank_account_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.employee_benefit_dependent
    ADD CONSTRAINT employee_benefit_dependent_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.employee_complement_data
    ADD CONSTRAINT employee_complement_data_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.employee_dependent
    ADD CONSTRAINT employee_dependent_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.employee_exercise
    ADD CONSTRAINT employee_exercise_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.employee_frequency
    ADD CONSTRAINT employee_frequency_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.employee_payroll_item_import_job
    ADD CONSTRAINT employee_payroll_item_import_job_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.employee
    ADD CONSTRAINT employee_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.employee_status_history
    ADD CONSTRAINT employee_status_history_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.employee
    ADD CONSTRAINT employee_tenant_id_id_uq UNIQUE (tenant_id, id);

ALTER TABLE ONLY hr.employee_transfer
    ADD CONSTRAINT employee_transfer_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.employee_transit_benefit
    ADD CONSTRAINT employee_transit_benefit_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.employee_union_contribution
    ADD CONSTRAINT employee_union_contribution_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.employment_contract
    ADD CONSTRAINT employment_contract_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.employment_link
    ADD CONSTRAINT employment_link_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.employment_link
    ADD CONSTRAINT employment_link_tenant_id_id_uq UNIQUE (tenant_id, id);

ALTER TABLE ONLY hr.external_life_proof
    ADD CONSTRAINT external_life_proof_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.file_export_job
    ADD CONSTRAINT file_export_job_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.function_nature
    ADD CONSTRAINT function_nature_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.functional_status
    ADD CONSTRAINT functional_status_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.health_exam_provider_exam_link
    ADD CONSTRAINT health_exam_provider_exam_link_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.health_provider_agreement_link
    ADD CONSTRAINT health_provider_agreement_link_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.internship_program
    ADD CONSTRAINT internship_program_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.internship_record
    ADD CONSTRAINT internship_record_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.job_function_legislation_history
    ADD CONSTRAINT job_function_legislation_history_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.job_function
    ADD CONSTRAINT job_function_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.job_position
    ADD CONSTRAINT job_position_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.job_position
    ADD CONSTRAINT job_position_tenant_id_id_uq UNIQUE (tenant_id, id);

ALTER TABLE ONLY hr.organic_definition
    ADD CONSTRAINT organic_definition_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.job_structure_employment_link
    ADD CONSTRAINT job_structure_employment_link_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.job_structure_reference_link
    ADD CONSTRAINT job_structure_reference_link_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.leave_record
    ADD CONSTRAINT leave_record_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.legal_nature
    ADD CONSTRAINT legal_nature_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.legal_responsible
    ADD CONSTRAINT legal_responsible_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.legislation
    ADD CONSTRAINT legislation_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.medical_appointment
    ADD CONSTRAINT medical_appointment_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.medical_leave
    ADD CONSTRAINT medical_leave_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.medical_record
    ADD CONSTRAINT medical_record_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.merit_progression
    ADD CONSTRAINT merit_progression_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.pension_compensation
    ADD CONSTRAINT pension_compensation_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.pension_grant
    ADD CONSTRAINT pension_grant_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.performance_evaluation
    ADD CONSTRAINT performance_evaluation_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.previdentiary_declaration
    ADD CONSTRAINT previdentiary_declaration_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.probation_evaluation
    ADD CONSTRAINT probation_evaluation_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.professional_experience
    ADD CONSTRAINT professional_experience_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.reason
    ADD CONSTRAINT reason_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.recertification_beneficiary
    ADD CONSTRAINT recertification_beneficiary_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.recertification_campaign
    ADD CONSTRAINT recertification_campaign_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.recertification_record
    ADD CONSTRAINT recertification_record_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.recruitment_candidate
    ADD CONSTRAINT recruitment_candidate_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.recruitment_request_function
    ADD CONSTRAINT recruitment_request_function_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.recruitment_request
    ADD CONSTRAINT recruitment_request_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.reference_catalog_entry
    ADD CONSTRAINT reference_catalog_entry_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.reintegration_order
    ADD CONSTRAINT reintegration_order_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.retirement_grant
    ADD CONSTRAINT retirement_grant_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.retirement_rule
    ADD CONSTRAINT retirement_rule_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.retirement_simulation
    ADD CONSTRAINT retirement_simulation_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.salary_level_history
    ADD CONSTRAINT salary_level_history_level_vigencia_excl EXCLUDE USING gist (tenant_id WITH =, salary_range_level_id WITH =, daterange(vigencia_inicio, COALESCE(vigencia_fim, 'infinity'::date), '[]'::text) WITH &&) WHERE ((salary_range_level_id IS NOT NULL));

ALTER TABLE ONLY hr.salary_level_history
    ADD CONSTRAINT salary_level_history_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.salary_range_level
    ADD CONSTRAINT salary_range_level_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.salary_range
    ADD CONSTRAINT salary_range_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.salary_reference
    ADD CONSTRAINT salary_reference_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.salary_reference
    ADD CONSTRAINT salary_reference_vigencia_excl EXCLUDE USING gist (tenant_id WITH =, code WITH =, daterange(vigencia_inicio, COALESCE(vigencia_fim, 'infinity'::date), '[]'::text) WITH &&);

ALTER TABLE ONLY hr.salary_simulation_adjustment
    ADD CONSTRAINT salary_simulation_adjustment_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.salary_simulation
    ADD CONSTRAINT salary_simulation_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.service_provider
    ADD CONSTRAINT service_provider_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.service_taker
    ADD CONSTRAINT service_taker_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.service_time_record
    ADD CONSTRAINT service_time_record_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.shift_day_off
    ADD CONSTRAINT shift_day_off_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.shift
    ADD CONSTRAINT shift_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.termination_reason
    ADD CONSTRAINT termination_reason_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.training_suggestion_complement
    ADD CONSTRAINT training_suggestion_complement_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.training_suggestion_cost
    ADD CONSTRAINT training_suggestion_cost_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.training_suggestion_employee
    ADD CONSTRAINT training_suggestion_employee_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.training_suggestion
    ADD CONSTRAINT training_suggestion_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.transit_benefit
    ADD CONSTRAINT transit_benefit_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.tsv_contract_change
    ADD CONSTRAINT tsv_contract_change_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.tsv_contract
    ADD CONSTRAINT tsv_contract_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.union_entity
    ADD CONSTRAINT union_entity_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.vacation_record
    ADD CONSTRAINT vacation_record_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.vacation_type
    ADD CONSTRAINT vacation_type_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.work_accident
    ADD CONSTRAINT work_accident_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.work_location
    ADD CONSTRAINT work_location_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.work_location_structure_assignment
    ADD CONSTRAINT work_location_structure_assignment_pkey PRIMARY KEY (id);
