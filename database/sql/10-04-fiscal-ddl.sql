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
    'S5013'
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
