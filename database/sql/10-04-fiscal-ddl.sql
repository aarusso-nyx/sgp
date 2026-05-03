CREATE TYPE fiscal.dctfweb_declaration_kind AS ENUM (
    'ORIGINAL',
    'RETIFICADORA'
);

CREATE TYPE fiscal.dctfweb_declaration_status AS ENUM (
    'DRAFT',
    'SIGNED',
    'TRANSMITTED',
    'ACCEPTED',
    'REJECTED'
);

CREATE TYPE fiscal.dctfweb_source_event AS ENUM (
    'S5011',
    'S5012',
    'S5013',
    'R9015',
    'MIT'
);

CREATE TYPE fiscal.dctfweb_mit_status AS ENUM (
    'PENDING',
    'INCLUDED',
    'ACCEPTED',
    'REJECTED'
);

CREATE TYPE fiscal.efd_reinf_event_type AS ENUM (
    'R4010',
    'R4020',
    'R4040',
    'R4080',
    'R4099'
);

CREATE TYPE fiscal.efd_reinf_event_kind AS ENUM (
    'ORIGINAL',
    'RETIFICADORA'
);

CREATE TYPE fiscal.efd_reinf_event_status AS ENUM (
    'DRAFT',
    'SIGNED',
    'TRANSMITTED',
    'ACCEPTED',
    'REJECTED'
);

CREATE TYPE fiscal.efd_reinf_totalizer_kind AS ENUM (
    'R-9015'
);

CREATE TYPE fiscal.siafic_sync_stage AS ENUM (
    'EMPENHO',
    'LIQUIDACAO',
    'PAGAMENTO'
);

CREATE TYPE fiscal.siafic_sync_status AS ENUM (
    'PENDING',
    'SENT',
    'ACCEPTED',
    'REJECTED',
    'FAILED'
);

CREATE TYPE fiscal.siafic_circuit_state AS ENUM (
    'CLOSED',
    'HALF_OPEN',
    'OPEN'
);

CREATE TYPE fiscal.dirf_arquivo_kind AS ENUM (
    'ORIGINAL',
    'RETIFICADORA'
);

CREATE TYPE fiscal.dirf_arquivo_status AS ENUM (
    'DRAFT',
    'GENERATED',
    'VALIDATED',
    'TRANSMITTED'
);

CREATE TYPE fiscal.gps_payment_code_scope AS ENUM (
    'EMPLOYER',
    'EMPLOYEE',
    'BOTH'
);

CREATE TYPE fiscal.gps_remittance_reason AS ENUM (
    'TRANSITION',
    'RETROACTIVE',
    'MALHA_FINA'
);

CREATE TYPE fiscal.gps_remittance_status AS ENUM (
    'DRAFT',
    'GENERATED',
    'PAID',
    'CANCELLED'
);

CREATE TABLE fiscal.yearly_income_aggregate (
    tenant_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    year_base integer NOT NULL,
    taxable_total numeric(14,2) DEFAULT 0 NOT NULL,
    thirteenth_salary numeric(14,2) DEFAULT 0 NOT NULL,
    vacation_total numeric(14,2) DEFAULT 0 NOT NULL,
    severance_total numeric(14,2) DEFAULT 0 NOT NULL,
    exempt_total numeric(14,2) DEFAULT 0 NOT NULL,
    inss_rpps_total numeric(14,2) DEFAULT 0 NOT NULL,
    irrf_total numeric(14,2) DEFAULT 0 NOT NULL,
    dependents_count integer DEFAULT 0 NOT NULL,
    recomputed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT yearly_income_aggregate_money_chk CHECK (((taxable_total >= (0)::numeric) AND (thirteenth_salary >= (0)::numeric) AND (vacation_total >= (0)::numeric) AND (severance_total >= (0)::numeric) AND (exempt_total >= (0)::numeric) AND (inss_rpps_total >= (0)::numeric) AND (irrf_total >= (0)::numeric) AND (dependents_count >= 0))),
    CONSTRAINT yearly_income_aggregate_year_chk CHECK (((year_base >= 2000) AND (year_base <= 2100)))
);

CREATE TABLE fiscal.dctfweb_declaration (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    competence date NOT NULL,
    kind fiscal.dctfweb_declaration_kind DEFAULT 'ORIGINAL'::fiscal.dctfweb_declaration_kind NOT NULL,
    status fiscal.dctfweb_declaration_status DEFAULT 'DRAFT'::fiscal.dctfweb_declaration_status NOT NULL,
    original_declaration_id uuid,
    payload_xml_ref text NOT NULL,
    payload_xml text NOT NULL,
    payload_xml_hash text NOT NULL,
    signed_xml_ref text,
    signed_xml text,
    signed_xml_hash text,
    transmitted_xml_hash text,
    receipt_number text,
    receipt_at timestamp with time zone,
    receipt_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dctfweb_declaration_original_kind_chk CHECK ((((kind = 'ORIGINAL'::fiscal.dctfweb_declaration_kind) AND (original_declaration_id IS NULL)) OR ((kind = 'RETIFICADORA'::fiscal.dctfweb_declaration_kind) AND (original_declaration_id IS NOT NULL)))),
    CONSTRAINT dctfweb_declaration_payload_hash_chk CHECK ((payload_xml_hash ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT dctfweb_declaration_signed_hash_chk CHECK (((signed_xml_hash IS NULL) OR (signed_xml_hash ~ '^[0-9a-f]{64}$'::text))),
    CONSTRAINT dctfweb_declaration_transmitted_hash_chk CHECK (((transmitted_xml_hash IS NULL) OR (transmitted_xml_hash ~ '^[0-9a-f]{64}$'::text)))
);

CREATE TABLE fiscal.dctfweb_item (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    declaracao_id uuid NOT NULL,
    source_event fiscal.dctfweb_source_event NOT NULL,
    source_run_id uuid NOT NULL,
    debit_code text NOT NULL,
    base_amount numeric(14,2) NOT NULL,
    amount numeric(14,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dctfweb_item_amount_chk CHECK (((base_amount >= (0)::numeric) AND (amount >= (0)::numeric)))
);

CREATE TABLE fiscal.dctf_pgd_tax_debit (
    tenant_id uuid NOT NULL,
    pgd_declaration_id uuid NOT NULL,
    pgd_debit_id uuid DEFAULT gen_random_uuid() NOT NULL,
    competence date NOT NULL,
    cnpj_filial text NOT NULL,
    tax_code text NOT NULL,
    period date NOT NULL,
    base_amount numeric(14,2) DEFAULT 0 NOT NULL,
    amount numeric(14,2) NOT NULL,
    due_date date,
    mit_status fiscal.dctfweb_mit_status DEFAULT 'PENDING'::fiscal.dctfweb_mit_status,
    source_ref text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dctf_pgd_tax_debit_amount_chk CHECK (((base_amount >= (0)::numeric) AND (amount >= (0)::numeric))),
    CONSTRAINT dctf_pgd_tax_debit_branch_chk CHECK ((cnpj_filial ~ '^[0-9]{14}$'::text)),
    CONSTRAINT dctf_pgd_tax_debit_competence_chk CHECK ((competence = (date_trunc('month'::text, (competence)::timestamp with time zone))::date)),
    CONSTRAINT dctf_pgd_tax_debit_tax_code_chk CHECK ((length(TRIM(BOTH FROM tax_code)) > 0))
);

CREATE TABLE fiscal.efd_reinf_event (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    competence date NOT NULL,
    event_type fiscal.efd_reinf_event_type NOT NULL,
    kind fiscal.efd_reinf_event_kind DEFAULT 'ORIGINAL'::fiscal.efd_reinf_event_kind NOT NULL,
    status fiscal.efd_reinf_event_status DEFAULT 'DRAFT'::fiscal.efd_reinf_event_status NOT NULL,
    original_event_id uuid,
    payload_xml_ref text NOT NULL,
    payload_xml text NOT NULL,
    payload_xml_hash text NOT NULL,
    signed_xml_ref text,
    signed_xml text,
    signed_xml_hash text,
    transmitted_xml_hash text,
    receipt_number text,
    receipt_at timestamp with time zone,
    receipt_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT efd_reinf_event_month_chk CHECK ((competence = (date_trunc('month'::text, (competence)::timestamp with time zone))::date)),
    CONSTRAINT efd_reinf_event_original_kind_chk CHECK ((((kind = 'ORIGINAL'::fiscal.efd_reinf_event_kind) AND (original_event_id IS NULL)) OR ((kind = 'RETIFICADORA'::fiscal.efd_reinf_event_kind) AND (original_event_id IS NOT NULL)))),
    CONSTRAINT efd_reinf_event_payload_hash_chk CHECK ((payload_xml_hash ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT efd_reinf_event_signed_hash_chk CHECK (((signed_xml_hash IS NULL) OR (signed_xml_hash ~ '^[0-9a-f]{64}$'::text))),
    CONSTRAINT efd_reinf_event_transmitted_hash_chk CHECK (((transmitted_xml_hash IS NULL) OR (transmitted_xml_hash ~ '^[0-9a-f]{64}$'::text)))
);

CREATE TABLE fiscal.efd_reinf_item (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    source_run_id uuid NOT NULL,
    beneficiary_kind payment.dirf_beneficiary_kind NOT NULL,
    beneficiary_document text NOT NULL,
    beneficiary_name text NOT NULL,
    revenue_code text NOT NULL,
    gross_amount numeric(14,2) NOT NULL,
    retained_amount numeric(14,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT efd_reinf_item_amount_chk CHECK (((gross_amount >= (0)::numeric) AND (retained_amount >= (0)::numeric))),
    CONSTRAINT efd_reinf_item_document_chk CHECK ((length(TRIM(BOTH FROM beneficiary_document)) > 0)),
    CONSTRAINT efd_reinf_item_name_chk CHECK ((length(TRIM(BOTH FROM beneficiary_name)) > 0)),
    CONSTRAINT efd_reinf_item_revenue_code_chk CHECK ((length(TRIM(BOTH FROM revenue_code)) > 0))
);

CREATE TABLE fiscal.efd_reinf_totalizer (
    tenant_id uuid NOT NULL,
    competence date NOT NULL,
    kind fiscal.efd_reinf_totalizer_kind NOT NULL,
    source_event_id uuid NOT NULL,
    receipt_number text NOT NULL,
    payload jsonb NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT efd_reinf_totalizer_month_chk CHECK ((competence = (date_trunc('month'::text, (competence)::timestamp with time zone))::date)),
    CONSTRAINT efd_reinf_totalizer_payload_object_chk CHECK ((jsonb_typeof(payload) = 'object'::text))
);

CREATE TABLE fiscal.siafic_sync_batch (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payroll_run_id uuid NOT NULL,
    competence date NOT NULL,
    ente_code text NOT NULL,
    status fiscal.siafic_sync_status DEFAULT 'PENDING'::fiscal.siafic_sync_status NOT NULL,
    circuit_state fiscal.siafic_circuit_state DEFAULT 'CLOSED'::fiscal.siafic_circuit_state NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    receipt_number text,
    last_error text,
    response_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    stage_status jsonb DEFAULT '{}'::jsonb NOT NULL,
    item_count integer DEFAULT 0 NOT NULL,
    total_amount numeric(14,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT siafic_sync_batch_amount_chk CHECK ((total_amount >= (0)::numeric)),
    CONSTRAINT siafic_sync_batch_competence_chk CHECK ((competence = (date_trunc('month'::text, (competence)::timestamp with time zone))::date)),
    CONSTRAINT siafic_sync_batch_ente_code_chk CHECK ((length(TRIM(BOTH FROM ente_code)) > 0)),
    CONSTRAINT siafic_sync_batch_item_count_chk CHECK ((item_count >= 0)),
    CONSTRAINT siafic_sync_batch_response_payload_chk CHECK ((jsonb_typeof(response_payload) = 'object'::text)),
    CONSTRAINT siafic_sync_batch_stage_status_chk CHECK ((jsonb_typeof(stage_status) = 'object'::text))
);

CREATE TABLE fiscal.siafic_sync_item (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_id uuid NOT NULL,
    stage fiscal.siafic_sync_stage NOT NULL,
    source_line_id uuid NOT NULL,
    accounting_account_id uuid NOT NULL,
    account_code text NOT NULL,
    account_type text NOT NULL,
    amount numeric(14,2) NOT NULL,
    status fiscal.siafic_sync_status DEFAULT 'PENDING'::fiscal.siafic_sync_status NOT NULL,
    receipt_number text,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT siafic_sync_item_account_chk CHECK (((length(TRIM(BOTH FROM account_code)) > 0) AND (length(TRIM(BOTH FROM account_type)) > 0))),
    CONSTRAINT siafic_sync_item_amount_chk CHECK ((amount <> (0)::numeric)),
    CONSTRAINT siafic_sync_item_payload_chk CHECK ((jsonb_typeof(payload) = 'object'::text))
);

CREATE TABLE fiscal.dirf_arquivo (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    year_base integer NOT NULL,
    kind fiscal.dirf_arquivo_kind DEFAULT 'ORIGINAL'::fiscal.dirf_arquivo_kind NOT NULL,
    status fiscal.dirf_arquivo_status DEFAULT 'DRAFT'::fiscal.dirf_arquivo_status NOT NULL,
    original_arquivo_id uuid,
    txt_ref text NOT NULL,
    txt_content text NOT NULL,
    txt_hash text NOT NULL,
    layout_version text NOT NULL,
    generated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dirf_arquivo_layout_version_chk CHECK ((length(TRIM(BOTH FROM layout_version)) > 0)),
    CONSTRAINT dirf_arquivo_original_kind_chk CHECK ((((kind = 'ORIGINAL'::fiscal.dirf_arquivo_kind) AND (original_arquivo_id IS NULL)) OR ((kind = 'RETIFICADORA'::fiscal.dirf_arquivo_kind) AND (original_arquivo_id IS NOT NULL)))),
    CONSTRAINT dirf_arquivo_txt_hash_chk CHECK ((txt_hash ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT dirf_arquivo_year_chk CHECK (((year_base >= 2000) AND (year_base <= 2100)))
);

CREATE TABLE fiscal.dirf_beneficiario (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dirf_arquivo_id uuid NOT NULL,
    cpf_cnpj text NOT NULL,
    kind payment.dirf_beneficiary_kind NOT NULL,
    name text NOT NULL,
    totals jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dirf_beneficiario_document_chk CHECK ((length(TRIM(BOTH FROM cpf_cnpj)) > 0)),
    CONSTRAINT dirf_beneficiario_name_chk CHECK ((length(TRIM(BOTH FROM name)) > 0)),
    CONSTRAINT dirf_beneficiario_totals_chk CHECK ((jsonb_typeof(totals) = 'object'::text))
);

CREATE TABLE fiscal.dirf_pagamento (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dirf_beneficiario_id uuid NOT NULL,
    code text NOT NULL,
    month_year date NOT NULL,
    amount numeric(14,2) NOT NULL,
    irrf numeric(14,2) DEFAULT 0 NOT NULL,
    deductions jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT dirf_pagamento_amount_chk CHECK (((amount >= (0)::numeric) AND (irrf >= (0)::numeric))),
    CONSTRAINT dirf_pagamento_deductions_chk CHECK ((jsonb_typeof(deductions) = 'object'::text)),
    CONSTRAINT dirf_pagamento_month_chk CHECK ((month_year = (date_trunc('month'::text, (month_year)::timestamp with time zone))::date))
);

CREATE TABLE fiscal.gps_payment_code (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    applies_to fiscal.gps_payment_code_scope NOT NULL,
    active boolean DEFAULT true NOT NULL,
    valid_from date NOT NULL,
    valid_to date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT gps_payment_code_code_chk CHECK ((code ~ '^[0-9]{4}$'::text)),
    CONSTRAINT gps_payment_code_validity_chk CHECK (((valid_to IS NULL) OR (valid_to >= valid_from)))
);

CREATE TABLE fiscal.gps_remittance (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    competence date NOT NULL,
    payment_code_id uuid NOT NULL,
    reason fiscal.gps_remittance_reason NOT NULL,
    reason_detail text NOT NULL,
    base_amount numeric(14,2) NOT NULL,
    amount numeric(14,2) NOT NULL,
    interest_amount numeric(14,2) DEFAULT 0 NOT NULL,
    fine_amount numeric(14,2) DEFAULT 0 NOT NULL,
    total_amount numeric(14,2) NOT NULL,
    status fiscal.gps_remittance_status DEFAULT 'DRAFT'::fiscal.gps_remittance_status NOT NULL,
    file_uri text,
    txt_content text NOT NULL,
    txt_hash text NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT gps_remittance_money_chk CHECK (((base_amount >= (0)::numeric) AND (amount >= (0)::numeric) AND (interest_amount >= (0)::numeric) AND (fine_amount >= (0)::numeric) AND (total_amount = (((amount + interest_amount) + fine_amount))::numeric(14,2)))),
    CONSTRAINT gps_remittance_month_chk CHECK ((competence = (date_trunc('month'::text, (competence)::timestamp with time zone))::date)),
    CONSTRAINT gps_remittance_paid_status_chk CHECK ((((status = 'PAID'::fiscal.gps_remittance_status) AND (paid_at IS NOT NULL)) OR ((status <> 'PAID'::fiscal.gps_remittance_status) AND (paid_at IS NULL)))),
    CONSTRAINT gps_remittance_txt_hash_chk CHECK ((txt_hash ~ '^[0-9a-f]{64}$'::text))
);

ALTER TABLE ONLY fiscal.dctfweb_declaration
    ADD CONSTRAINT dctfweb_declaration_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY fiscal.dctfweb_item
    ADD CONSTRAINT dctfweb_item_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY fiscal.dctfweb_item
    ADD CONSTRAINT dctfweb_item_source_uq UNIQUE (tenant_id, declaracao_id, source_event, source_run_id, debit_code);

ALTER TABLE ONLY fiscal.dctf_pgd_tax_debit
    ADD CONSTRAINT dctf_pgd_tax_debit_pkey PRIMARY KEY (tenant_id, pgd_debit_id);

ALTER TABLE ONLY fiscal.dctf_pgd_tax_debit
    ADD CONSTRAINT dctf_pgd_tax_debit_source_uq UNIQUE (tenant_id, pgd_declaration_id, pgd_debit_id);

ALTER TABLE ONLY fiscal.efd_reinf_event
    ADD CONSTRAINT efd_reinf_event_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY fiscal.efd_reinf_item
    ADD CONSTRAINT efd_reinf_item_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY fiscal.efd_reinf_item
    ADD CONSTRAINT efd_reinf_item_source_uq UNIQUE (tenant_id, event_id, source_run_id, revenue_code);

ALTER TABLE ONLY fiscal.efd_reinf_totalizer
    ADD CONSTRAINT efd_reinf_totalizer_pkey PRIMARY KEY (tenant_id, competence, kind, source_event_id);

ALTER TABLE ONLY fiscal.siafic_sync_batch
    ADD CONSTRAINT siafic_sync_batch_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY fiscal.siafic_sync_item
    ADD CONSTRAINT siafic_sync_item_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY fiscal.siafic_sync_item
    ADD CONSTRAINT siafic_sync_item_source_uq UNIQUE (tenant_id, batch_id, stage, source_line_id, accounting_account_id);

ALTER TABLE ONLY fiscal.dirf_arquivo
    ADD CONSTRAINT dirf_arquivo_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY fiscal.dirf_beneficiario
    ADD CONSTRAINT dirf_beneficiario_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY fiscal.dirf_pagamento
    ADD CONSTRAINT dirf_pagamento_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY fiscal.gps_payment_code
    ADD CONSTRAINT gps_payment_code_code_uq UNIQUE (code);

ALTER TABLE ONLY fiscal.gps_payment_code
    ADD CONSTRAINT gps_payment_code_pkey PRIMARY KEY (id);

ALTER TABLE ONLY fiscal.gps_remittance
    ADD CONSTRAINT gps_remittance_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY fiscal.yearly_income_aggregate
    ADD CONSTRAINT yearly_income_aggregate_pkey PRIMARY KEY (tenant_id, employee_id, year_base);
