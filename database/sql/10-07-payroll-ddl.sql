CREATE TYPE payroll.formula_attribute_value_type AS ENUM (
    'decimal',
    'int',
    'bool',
    'date',
    'text'
);

CREATE FUNCTION payroll.employee_payroll_item_idempotency_key(p_tenant_id uuid, p_competence_year integer, p_competence_month integer, p_payroll_run_id uuid, p_employee_id uuid, p_earning_deduction_id uuid, p_source public."PayrollEntrySource") RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT CASE
    WHEN p_source = 'CALCULATED'::public."PayrollEntrySource"
      AND p_payroll_run_id IS NOT NULL
    THEN
      p_tenant_id::text || ':' ||
      p_competence_year::text || ':' ||
      lpad(p_competence_month::text, 2, '0') || ':' ||
      p_payroll_run_id::text || ':' ||
      p_employee_id::text || ':' ||
      p_earning_deduction_id::text || ':' ||
      p_source::text
    ELSE NULL
  END
$$;

CREATE TABLE payroll.employee_payroll_item (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    payroll_run_id uuid,
    earning_deduction_id uuid NOT NULL,
    source public."PayrollEntrySource" DEFAULT 'MANUAL'::public."PayrollEntrySource" NOT NULL,
    competence_year integer NOT NULL,
    competence_month integer NOT NULL,
    quantity numeric(12,4),
    reference_value numeric(14,2),
    amount numeric(14,2) NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    deleted_reason text,
    idempotency_key text GENERATED ALWAYS AS (payroll.employee_payroll_item_idempotency_key(tenant_id, competence_year, competence_month, payroll_run_id, employee_id, earning_deduction_id, source)) STORED,
    payment_status text,
    CONSTRAINT employee_payroll_item_amount_nonnegative_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT employee_payroll_item_competence_month_check CHECK (((competence_month >= 1) AND (competence_month <= 12))),
    CONSTRAINT employee_payroll_item_payment_status_check CHECK (((payment_status IS NULL) OR (payment_status = ANY (ARRAY['PROCESSED'::text, 'REJECTED'::text, 'RETURNED'::text]))))
);

CREATE TABLE payroll.payment_remittance_detail (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    file_id uuid NOT NULL,
    sequence integer NOT NULL,
    employee_id uuid NOT NULL,
    amount numeric(14,2) NOT NULL,
    bank_code smallint NOT NULL,
    branch text NOT NULL,
    account text NOT NULL,
    occurrence_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_occurrence_code text,
    last_internal_status text,
    last_settled_at timestamp with time zone,
    purpose_code text,
    alimony_id uuid,
    CONSTRAINT payment_remittance_detail_amount_nonnegative_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT payment_remittance_detail_sequence_positive_check CHECK ((sequence > 0))
);

CREATE TABLE payroll.payment_remittance_file (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payroll_run_id uuid,
    branch_id uuid,
    processing_type_id uuid,
    reason_id uuid,
    status public."PaymentRemittanceStatus" DEFAULT 'DRAFT'::public."PaymentRemittanceStatus" NOT NULL,
    competence_year integer NOT NULL,
    competence_month integer NOT NULL,
    created_by_user_id uuid,
    payment_date date,
    file_name text,
    file_hash text,
    total_amount numeric(14,2) DEFAULT 0 NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    bank_code smallint,
    layout_version text,
    record_count integer,
    generated_at timestamp with time zone,
    generated_by uuid,
    CONSTRAINT payment_remittance_competence_month_check CHECK (((competence_month >= 1) AND (competence_month <= 12))),
    CONSTRAINT payment_remittance_total_nonnegative_check CHECK ((total_amount >= (0)::numeric))
);

CREATE TABLE payroll.payroll_run (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    competence_year integer NOT NULL,
    competence_month integer NOT NULL,
    branch_id uuid,
    payroll_type_id uuid NOT NULL,
    processing_type_id uuid NOT NULL,
    status public."PayrollRunStatus" DEFAULT 'DRAFT'::public."PayrollRunStatus" NOT NULL,
    employee_count integer DEFAULT 0 NOT NULL,
    total_earnings numeric(16,2) DEFAULT 0 NOT NULL,
    total_deductions numeric(16,2) DEFAULT 0 NOT NULL,
    total_net numeric(16,2) DEFAULT 0 NOT NULL,
    created_by_user_id uuid,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    closed_at timestamp(6) with time zone,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    cause text,
    CONSTRAINT payroll_run_competence_month_check CHECK (((competence_month >= 1) AND (competence_month <= 12))),
    CONSTRAINT payroll_run_totals_nonnegative_check CHECK (((total_earnings >= (0)::numeric) AND (total_deductions >= (0)::numeric) AND (total_net >= (0)::numeric) AND (employee_count >= 0)))
);

CREATE TABLE payroll.payroll_financial_record (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    payroll_run_id uuid,
    branch_id uuid,
    work_location_id uuid,
    functional_status_id uuid,
    competence_year integer NOT NULL,
    competence_month integer NOT NULL,
    total_earnings numeric(16,2) DEFAULT 0 NOT NULL,
    total_deductions numeric(16,2) DEFAULT 0 NOT NULL,
    net_amount numeric(16,2) DEFAULT 0 NOT NULL,
    generated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    CONSTRAINT payroll_financial_record_competence_month_check CHECK (((competence_month >= 1) AND (competence_month <= 12))),
    CONSTRAINT payroll_financial_record_totals_nonnegative_check CHECK (((total_earnings >= (0)::numeric) AND (total_deductions >= (0)::numeric) AND (net_amount >= (0)::numeric)))
);

CREATE TABLE payroll.accounting_account (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    branch_id uuid,
    cost_center_id uuid,
    earning_deduction_id uuid,
    accounting_history_id uuid,
    simple_account_id uuid,
    account_type text NOT NULL,
    account_code text NOT NULL,
    allocation_percent numeric(18,6) DEFAULT 0 NOT NULL,
    total_allocation_percent numeric(18,6) DEFAULT 0 NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE payroll.accounting_account_work_location (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    accounting_account_id uuid NOT NULL,
    work_location_id uuid NOT NULL
);

CREATE TABLE payroll.accounting_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE payroll.advance_payment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    request_id uuid,
    employee_id uuid NOT NULL,
    payroll_run_id uuid,
    amount numeric(14,2) NOT NULL,
    payment_date date,
    status public."AdvancePaymentStatus" DEFAULT 'PENDING'::public."AdvancePaymentStatus" NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE payroll.advance_request (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    payroll_run_id uuid,
    requested_amount numeric(14,2) NOT NULL,
    approved_amount numeric(14,2),
    requested_on date NOT NULL,
    processed_on date,
    status public."AdvanceRequestStatus" DEFAULT 'REQUESTED'::public."AdvanceRequestStatus" NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE payroll.blocked_payment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    payroll_run_id uuid,
    branch_id uuid,
    functional_status_id uuid,
    reason_id uuid,
    competence_year integer NOT NULL,
    competence_month integer NOT NULL,
    blocked_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    released_at timestamp(6) with time zone,
    notes text DEFAULT ''::text NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    CONSTRAINT blocked_payment_competence_month_check CHECK (((competence_month >= 1) AND (competence_month <= 12)))
);

CREATE TABLE payroll.employment_link_earning (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    employment_link_id uuid NOT NULL,
    earning_deduction_id uuid NOT NULL,
    default_amount numeric(14,2),
    default_quantity numeric(12,4),
    starts_on date,
    ends_on date,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE payroll.formula_attribute (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    data_type text NOT NULL,
    source_scope text NOT NULL,
    expression_hint text DEFAULT ''::text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    earning_deduction_id uuid,
    name text,
    value_type payroll.formula_attribute_value_type,
    default_value text,
    required boolean DEFAULT false NOT NULL
);

CREATE TABLE payroll.gps_payment_code (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE payroll.job_function_earning (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    job_function_id uuid NOT NULL,
    earning_deduction_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    default_amount numeric(14,2),
    default_quantity numeric(12,4),
    starts_on date,
    ends_on date,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE payroll.job_position_earning (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    job_position_id uuid NOT NULL,
    earning_deduction_id uuid NOT NULL,
    default_amount numeric(14,2),
    default_quantity numeric(12,4),
    starts_on date,
    ends_on date,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    application_condition text DEFAULT ''::text NOT NULL
);

CREATE TABLE payroll.payment_return_detail (
    return_detail_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    return_file_id uuid NOT NULL,
    sequence integer NOT NULL,
    remittance_detail_id uuid NOT NULL,
    occurrence_code text NOT NULL,
    internal_status text NOT NULL,
    message text DEFAULT ''::text NOT NULL,
    employee_id uuid NOT NULL,
    amount numeric(14,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payment_return_detail_amount_nonnegative_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT payment_return_detail_internal_status_check CHECK ((internal_status = ANY (ARRAY['ACCEPTED'::text, 'REJECTED_INVALID_ACCOUNT'::text, 'REJECTED_INSUFFICIENT_FUNDS'::text, 'RETURNED_OTHER'::text]))),
    CONSTRAINT payment_return_detail_sequence_positive_check CHECK ((sequence > 0))
);

CREATE TABLE payroll.payment_return_file (
    return_file_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    remittance_file_id uuid NOT NULL,
    bank_code smallint NOT NULL,
    file_hash text NOT NULL,
    processed_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_by uuid,
    status public."PaymentReturnFileStatus" DEFAULT 'PROCESSING'::public."PaymentReturnFileStatus" NOT NULL,
    message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payment_return_file_hash_check CHECK ((file_hash ~ '^[a-f0-9]{64}$'::text))
);

CREATE TABLE payroll.payroll_earning_deduction (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    kind public."PayrollEntryKind" NOT NULL,
    taxable boolean DEFAULT false NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    formula_alias text,
    formula_function_name text,
    formula_expression text,
    formula_function_ddl text,
    formula_dependencies text[] DEFAULT ARRAY[]::text[] NOT NULL,
    formula_ready boolean DEFAULT false NOT NULL,
    formula_error text,
    incidences jsonb DEFAULT '{}'::jsonb NOT NULL,
    starts_on date DEFAULT '1900-01-01'::date NOT NULL,
    ends_on date,
    esocial_code text,
    official_rubric_code text,
    formula_version integer DEFAULT 1 NOT NULL,
    subject_to_ceiling boolean DEFAULT true NOT NULL
);

CREATE TABLE payroll.payroll_run_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payroll_run_id uuid NOT NULL,
    status public."PayrollRunStatus" NOT NULL,
    changed_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    changed_by_user_id uuid,
    note text DEFAULT ''::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE payroll.payroll_run_work_location (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    payroll_run_id uuid NOT NULL,
    work_location_id uuid,
    employee_count integer DEFAULT 0 NOT NULL,
    total_earnings numeric(16,2) DEFAULT 0 NOT NULL,
    total_deductions numeric(16,2) DEFAULT 0 NOT NULL,
    total_net numeric(16,2) DEFAULT 0 NOT NULL,
    generated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE TABLE payroll.payroll_type (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE payroll.payroll_type_earning (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    payroll_type_id uuid NOT NULL,
    earning_deduction_id uuid NOT NULL,
    default_amount numeric(14,2),
    default_quantity numeric(12,4),
    starts_on date,
    ends_on date,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE payroll.processing_type (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    payroll_type_id uuid,
    employment_link_id uuid,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE payroll.professional_category_earning (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    category_entry_id uuid NOT NULL,
    earning_deduction_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    default_amount numeric(14,2),
    default_quantity numeric(12,4),
    starts_on date,
    ends_on date,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE payroll.sefip_code (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    type text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE payroll.simple_account (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE ONLY payroll.accounting_account
    ADD CONSTRAINT accounting_account_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.accounting_account_work_location
    ADD CONSTRAINT accounting_account_work_location_pkey PRIMARY KEY (accounting_account_id, work_location_id);

ALTER TABLE ONLY payroll.accounting_history
    ADD CONSTRAINT accounting_history_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.advance_payment
    ADD CONSTRAINT advance_payment_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.advance_request
    ADD CONSTRAINT advance_request_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.blocked_payment
    ADD CONSTRAINT blocked_payment_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.employee_payroll_item
    ADD CONSTRAINT employee_payroll_item_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.employment_link_earning
    ADD CONSTRAINT employment_link_earning_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.formula_attribute
    ADD CONSTRAINT formula_attribute_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.gps_payment_code
    ADD CONSTRAINT gps_payment_code_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.job_function_earning
    ADD CONSTRAINT job_function_earning_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.job_position_earning
    ADD CONSTRAINT job_position_earning_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.payment_remittance_detail
    ADD CONSTRAINT payment_remittance_detail_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.payment_remittance_file
    ADD CONSTRAINT payment_remittance_file_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.payment_return_detail
    ADD CONSTRAINT payment_return_detail_pkey PRIMARY KEY (return_detail_id);

ALTER TABLE ONLY payroll.payment_return_file
    ADD CONSTRAINT payment_return_file_pkey PRIMARY KEY (return_file_id);

ALTER TABLE ONLY payroll.payroll_earning_deduction
    ADD CONSTRAINT payroll_earning_deduction_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.payroll_financial_record
    ADD CONSTRAINT payroll_financial_record_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.payroll_run
    ADD CONSTRAINT payroll_run_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.payroll_run_status_history
    ADD CONSTRAINT payroll_run_status_history_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.payroll_run_work_location
    ADD CONSTRAINT payroll_run_work_location_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.payroll_type_earning
    ADD CONSTRAINT payroll_type_earning_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.payroll_type
    ADD CONSTRAINT payroll_type_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.processing_type
    ADD CONSTRAINT processing_type_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.professional_category_earning
    ADD CONSTRAINT professional_category_earning_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.sefip_code
    ADD CONSTRAINT sefip_code_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payroll.simple_account
    ADD CONSTRAINT simple_account_pkey PRIMARY KEY (id);
