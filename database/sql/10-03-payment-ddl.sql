CREATE TYPE payment.consignment_entity_kind AS ENUM (
    'BANK',
    'COOPERATIVE',
    'UNION',
    'ASSOCIATION'
);

CREATE TYPE payment.consignment_loan_kind AS ENUM (
    'PAYROLL_LOAN',
    'CARD',
    'OTHER'
);

CREATE TYPE payment.consignment_loan_status AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'TERMINATED',
    'TRANSFERRED'
);

CREATE TYPE payment.consignment_portability_detail_status AS ENUM (
    'MATCHED',
    'UNMATCHED',
    'REJECTED'
);

CREATE TYPE payment.consignment_portability_file_status AS ENUM (
    'RECEIVED',
    'PROCESSING',
    'PROCESSED',
    'FAILED'
);

CREATE TYPE payment.consignment_status AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'TERMINATED'
);

CREATE TYPE payment.dirf_beneficiary_kind AS ENUM (
    'CPF',
    'CNPJ',
    'EXTERIOR'
);

CREATE TYPE payment.fgts_account_status AS ENUM (
    'ACTIVE',
    'CLOSED'
);

CREATE TYPE payment.fgts_movement_kind AS ENUM (
    'DEPOSIT_8',
    'DEPOSIT_AVISO',
    'RESCISION_FINE_40',
    'ADJUSTMENT'
);

CREATE TYPE payment.fgts_remittance_kind AS ENUM (
    'GRF_MONTHLY',
    'GRRF_TERMINATION'
);

CREATE TYPE payment.fgts_remittance_status AS ENUM (
    'DRAFT',
    'GENERATED',
    'SENT',
    'PAID',
    'REJECTED'
);

CREATE TYPE payment.fgts_source_event AS ENUM (
    'MONTHLY',
    'TERMINATION'
);

CREATE TYPE payment.pis_pasep_program AS ENUM (
    'PIS',
    'PASEP'
);

CREATE TYPE payment.prior_notice_kind AS ENUM (
    'WORKED',
    'INDEMNIFIED',
    'NONE'
);

CREATE TYPE payment.prior_notice_reduction_mode AS ENUM (
    'TWO_HOURS_DAY',
    'SEVEN_FINAL_DAYS',
    'NONE'
);

CREATE TABLE payment.pis_pasep_base_year (
    tenant_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    year_base integer NOT NULL,
    program payment.pis_pasep_program NOT NULL,
    monthly_base jsonb NOT NULL,
    total_base numeric(14,2) NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pis_pasep_base_year_monthly_object_chk CHECK ((jsonb_typeof(monthly_base) = 'object'::text)),
    CONSTRAINT pis_pasep_base_year_total_chk CHECK ((total_base >= (0)::numeric)),
    CONSTRAINT pis_pasep_base_year_year_chk CHECK (((year_base >= 2000) AND (year_base <= 2100)))
);

CREATE TABLE payment.consignment_entity (
    tenant_id uuid NOT NULL,
    consignment_entity_id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    cnpj text,
    kind payment.consignment_entity_kind NOT NULL,
    agreement_number text,
    valid_from date NOT NULL,
    valid_to date,
    status payment.consignment_status DEFAULT 'ACTIVE'::payment.consignment_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT consignment_entity_valid_range_check CHECK (((valid_to IS NULL) OR (valid_to >= valid_from)))
);

CREATE TABLE payment.consignment_loan (
    tenant_id uuid NOT NULL,
    loan_id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    consignment_entity_id uuid NOT NULL,
    contract_number text NOT NULL,
    kind payment.consignment_loan_kind NOT NULL,
    monthly_amount numeric(14,2) NOT NULL,
    installments_total integer NOT NULL,
    installments_paid integer DEFAULT 0 NOT NULL,
    rate numeric(18,6) DEFAULT 0 NOT NULL,
    valid_from date NOT NULL,
    valid_to date NOT NULL,
    status payment.consignment_loan_status DEFAULT 'ACTIVE'::payment.consignment_loan_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    transferred_to_loan_id uuid,
    transferred_from_loan_id uuid,
    CONSTRAINT consignment_loan_amount_positive_check CHECK ((monthly_amount > (0)::numeric)),
    CONSTRAINT consignment_loan_installments_check CHECK (((installments_total > 0) AND (installments_paid >= 0) AND (installments_paid <= installments_total))),
    CONSTRAINT consignment_loan_rate_nonnegative_check CHECK ((rate >= (0)::numeric)),
    CONSTRAINT consignment_loan_transfer_not_self_check CHECK ((((transferred_to_loan_id IS NULL) OR (transferred_to_loan_id <> loan_id)) AND ((transferred_from_loan_id IS NULL) OR (transferred_from_loan_id <> loan_id)))),
    CONSTRAINT consignment_loan_valid_range_check CHECK ((valid_to >= valid_from))
);

CREATE TABLE payment.consignment_portability_detail (
    tenant_id uuid NOT NULL,
    file_id uuid NOT NULL,
    sequence integer NOT NULL,
    employee_cpf text NOT NULL,
    source_contract_number text NOT NULL,
    target_contract_number text NOT NULL,
    transferred_balance numeric(14,2) NOT NULL,
    new_monthly_amount numeric(14,2) NOT NULL,
    new_rate numeric(18,6) NOT NULL,
    new_installments_total integer NOT NULL,
    internal_status payment.consignment_portability_detail_status DEFAULT 'REJECTED'::payment.consignment_portability_detail_status NOT NULL,
    reject_reason text,
    matched_loan_id uuid,
    created_loan_id uuid,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT consignment_portability_detail_balance_check CHECK ((transferred_balance >= (0)::numeric)),
    CONSTRAINT consignment_portability_detail_installments_check CHECK ((new_installments_total > 0)),
    CONSTRAINT consignment_portability_detail_monthly_check CHECK ((new_monthly_amount > (0)::numeric)),
    CONSTRAINT consignment_portability_detail_rate_check CHECK ((new_rate >= (0)::numeric))
);

CREATE TABLE payment.consignment_portability_file (
    tenant_id uuid NOT NULL,
    file_id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_consignment_entity_id uuid CONSTRAINT consignment_portability_fil_source_consignment_entity__not_null NOT NULL,
    target_consignment_entity_id uuid CONSTRAINT consignment_portability_fil_target_consignment_entity__not_null NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    received_by uuid,
    file_hash text NOT NULL,
    status payment.consignment_portability_file_status DEFAULT 'RECEIVED'::payment.consignment_portability_file_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT consignment_portability_file_entities_check CHECK ((source_consignment_entity_id <> target_consignment_entity_id)),
    CONSTRAINT consignment_portability_file_hash_check CHECK ((length(file_hash) > 0))
);

CREATE TABLE payment.dirf_payment_source (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    year_base integer NOT NULL,
    beneficiary_kind payment.dirf_beneficiary_kind NOT NULL,
    beneficiary_document text NOT NULL,
    beneficiary_name text NOT NULL,
    revenue_code text NOT NULL,
    month_year date NOT NULL,
    amount numeric(14,2) NOT NULL,
    irrf numeric(14,2) DEFAULT 0 NOT NULL,
    deductions jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_ref text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dirf_payment_source_amount_chk CHECK (((amount >= (0)::numeric) AND (irrf >= (0)::numeric))),
    CONSTRAINT dirf_payment_source_deductions_chk CHECK ((jsonb_typeof(deductions) = 'object'::text)),
    CONSTRAINT dirf_payment_source_document_chk CHECK ((length(TRIM(BOTH FROM beneficiary_document)) > 0)),
    CONSTRAINT dirf_payment_source_month_chk CHECK (((month_year = (date_trunc('month'::text, (month_year)::timestamp with time zone))::date) AND ((EXTRACT(year FROM month_year))::integer = year_base))),
    CONSTRAINT dirf_payment_source_name_chk CHECK ((length(TRIM(BOTH FROM beneficiary_name)) > 0)),
    CONSTRAINT dirf_payment_source_revenue_code_chk CHECK ((length(TRIM(BOTH FROM revenue_code)) > 0)),
    CONSTRAINT dirf_payment_source_year_chk CHECK (((year_base >= 2000) AND (year_base <= 2100)))
);

CREATE TABLE payment.fgts_account (
    tenant_id uuid NOT NULL,
    fgts_account_id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    employment_link_id uuid NOT NULL,
    opened_at date NOT NULL,
    status payment.fgts_account_status DEFAULT 'ACTIVE'::payment.fgts_account_status NOT NULL,
    closed_at date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fgts_account_closed_check CHECK ((((status = 'ACTIVE'::payment.fgts_account_status) AND (closed_at IS NULL)) OR ((status = 'CLOSED'::payment.fgts_account_status) AND (closed_at IS NOT NULL) AND (closed_at >= opened_at))))
);

CREATE TABLE payment.fgts_caixa_adapter (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    adapter_key text NOT NULL,
    layout_version text NOT NULL,
    params jsonb DEFAULT '{}'::jsonb NOT NULL,
    active boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fgts_caixa_adapter_params_object CHECK ((jsonb_typeof(params) = 'object'::text))
);

CREATE TABLE payment.fgts_grf (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    fgts_remittance_id uuid NOT NULL,
    payroll_run_id uuid NOT NULL,
    employee_count integer NOT NULL,
    base_amount numeric(14,2) NOT NULL,
    rate numeric(18,6) NOT NULL,
    amount numeric(14,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fgts_grf_amount_check CHECK (((employee_count >= 0) AND (base_amount >= (0)::numeric) AND (rate >= (0)::numeric) AND (amount >= (0)::numeric)))
);

CREATE TABLE payment.fgts_grrf (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    fgts_remittance_id uuid NOT NULL,
    employment_link_id uuid NOT NULL,
    termination_date date NOT NULL,
    base_balance numeric(14,2) NOT NULL,
    fine_rate numeric(18,6) NOT NULL,
    fine_amount numeric(14,2) NOT NULL,
    notice_amount numeric(14,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fgts_grrf_amount_check CHECK (((base_balance >= (0)::numeric) AND (fine_rate >= (0)::numeric) AND (fine_amount >= (0)::numeric) AND (notice_amount >= (0)::numeric)))
);

CREATE TABLE payment.fgts_movement (
    tenant_id uuid NOT NULL,
    fgts_movement_id uuid DEFAULT gen_random_uuid() NOT NULL,
    fgts_account_id uuid NOT NULL,
    competence date NOT NULL,
    kind payment.fgts_movement_kind NOT NULL,
    base_amount numeric(14,2) NOT NULL,
    rate numeric(18,6) NOT NULL,
    amount numeric(14,2) NOT NULL,
    payroll_run_id uuid,
    source_event payment.fgts_source_event NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fgts_movement_amount_check CHECK (((base_amount >= (0)::numeric) AND (rate >= (0)::numeric) AND (amount >= (0)::numeric)))
);

CREATE TABLE payment.fgts_remittance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    competence date NOT NULL,
    kind payment.fgts_remittance_kind NOT NULL,
    status payment.fgts_remittance_status DEFAULT 'DRAFT'::payment.fgts_remittance_status NOT NULL,
    generated_at timestamp with time zone,
    paid_at timestamp with time zone,
    total_base numeric(14,2) DEFAULT 0 NOT NULL,
    total_amount numeric(14,2) DEFAULT 0 NOT NULL,
    file_uri text,
    dae_barcode text,
    layout_version text DEFAULT 'SIFGE-4.0'::text NOT NULL,
    adapter_key text DEFAULT 'caixa-sifge-v4'::text NOT NULL,
    file_hash text,
    signed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fgts_remittance_amount_check CHECK (((total_base >= (0)::numeric) AND (total_amount >= (0)::numeric))),
    CONSTRAINT fgts_remittance_paid_check CHECK (((paid_at IS NULL) OR (status = 'PAID'::payment.fgts_remittance_status)))
);

CREATE TABLE payment.prior_notice (
    tenant_id uuid NOT NULL,
    employment_link_id uuid NOT NULL,
    kind payment.prior_notice_kind NOT NULL,
    notice_days integer NOT NULL,
    projected_end_date date NOT NULL,
    base_amount numeric(14,2) NOT NULL,
    reduction_mode payment.prior_notice_reduction_mode DEFAULT 'NONE'::payment.prior_notice_reduction_mode NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT prior_notice_base_amount_check CHECK ((base_amount >= (0)::numeric)),
    CONSTRAINT prior_notice_notice_days_check CHECK (((notice_days >= 0) AND (notice_days <= 90)))
);

ALTER TABLE ONLY payment.consignment_entity
    ADD CONSTRAINT consignment_entity_code_uq UNIQUE (tenant_id, code);

ALTER TABLE ONLY payment.consignment_entity
    ADD CONSTRAINT consignment_entity_pkey PRIMARY KEY (tenant_id, consignment_entity_id);

ALTER TABLE ONLY payment.consignment_loan
    ADD CONSTRAINT consignment_loan_contract_uq UNIQUE (tenant_id, employee_id, contract_number);

ALTER TABLE ONLY payment.consignment_loan
    ADD CONSTRAINT consignment_loan_pkey PRIMARY KEY (tenant_id, loan_id);

ALTER TABLE ONLY payment.consignment_portability_detail
    ADD CONSTRAINT consignment_portability_detail_pkey PRIMARY KEY (tenant_id, file_id, sequence);

ALTER TABLE ONLY payment.consignment_portability_file
    ADD CONSTRAINT consignment_portability_file_pkey PRIMARY KEY (tenant_id, file_id);

ALTER TABLE ONLY payment.dirf_payment_source
    ADD CONSTRAINT dirf_payment_source_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY payment.fgts_account
    ADD CONSTRAINT fgts_account_employee_link_uq UNIQUE (tenant_id, employee_id, employment_link_id);

ALTER TABLE ONLY payment.fgts_account
    ADD CONSTRAINT fgts_account_pkey PRIMARY KEY (tenant_id, fgts_account_id);

ALTER TABLE ONLY payment.fgts_caixa_adapter
    ADD CONSTRAINT fgts_caixa_adapter_key_uq UNIQUE (tenant_id, adapter_key);

ALTER TABLE ONLY payment.fgts_caixa_adapter
    ADD CONSTRAINT fgts_caixa_adapter_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payment.fgts_grf
    ADD CONSTRAINT fgts_grf_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payment.fgts_grf
    ADD CONSTRAINT fgts_grf_remittance_uq UNIQUE (tenant_id, fgts_remittance_id, payroll_run_id);

ALTER TABLE ONLY payment.fgts_grrf
    ADD CONSTRAINT fgts_grrf_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payment.fgts_grrf
    ADD CONSTRAINT fgts_grrf_remittance_uq UNIQUE (tenant_id, fgts_remittance_id, employment_link_id);

ALTER TABLE ONLY payment.fgts_movement
    ADD CONSTRAINT fgts_movement_pkey PRIMARY KEY (tenant_id, fgts_movement_id);

ALTER TABLE ONLY payment.fgts_remittance
    ADD CONSTRAINT fgts_remittance_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payment.pis_pasep_base_year
    ADD CONSTRAINT pis_pasep_base_year_pkey PRIMARY KEY (tenant_id, employee_id, year_base);

ALTER TABLE ONLY payment.prior_notice
    ADD CONSTRAINT prior_notice_pkey PRIMARY KEY (tenant_id, employment_link_id);
