CREATE TYPE esocial.certificate_kind AS ENUM (
    'A1',
    'A3'
);

CREATE TYPE esocial.certificate_status AS ENUM (
    'ACTIVE',
    'REVOKED',
    'EXPIRED'
);

CREATE TYPE esocial.endpoint_circuit_state_status AS ENUM (
    'CLOSED',
    'HALF_OPEN',
    'OPEN'
);

CREATE TYPE esocial.es03_pending_status AS ENUM (
    'PENDING',
    'EMITTED'
);

CREATE TYPE esocial.esocial_totalizer_kind AS ENUM (
    'S-5001',
    'S-5002',
    'S-5003',
    'S-5011',
    'S-5012',
    'S-5013'
);

CREATE TYPE esocial.response_classification_class AS ENUM (
    'ACCEPTED',
    'RECOVERABLE',
    'DEFINITIVE'
);

CREATE TYPE esocial.s1299_emission_status AS ENUM (
    'PENDING',
    'EMITTED',
    'ACCEPTED',
    'REJECTED'
);

CREATE TYPE esocial.s2205_pending_alteration_status AS ENUM (
    'PENDING',
    'EMITTED',
    'SKIPPED'
);

CREATE TYPE esocial.s1xxx_event_kind AS ENUM (
    'S-1000',
    'S-1005',
    'S-1010',
    'S-1020',
    'S-1030',
    'S-1040',
    'S-1050',
    'S-1060',
    'S-1070',
    'S-1200',
    'S-1202',
    'S-1207',
    'S-1210',
    'S-1298',
    'S-1299',
    'S-2200',
    'S-2205',
    'S-2206',
    'S-2230',
    'S-2220',
    'S-2210',
    'S-2240',
    'S-2299',
    'S-2300',
    'S-2306',
    'S-2399',
    'S-2400',
    'S-2405',
    'S-2410',
    'S-2416',
    'S-2501',
    'S-3000',
    'S-2298'
);

CREATE TYPE esocial.s2230_pending_kind AS ENUM (
    'LEAVE',
    'VACATION'
);

CREATE TYPE esocial.s2230_trigger_event AS ENUM (
    'START',
    'END',
    'EXTENSION'
);

CREATE TYPE esocial.s2240_trigger_event AS ENUM (
    'START',
    'END',
    'CHANGE'
);

CREATE TYPE esocial.s2298_event_status AS ENUM (
    'DRAFT',
    'TRANSMITTED',
    'ACCEPTED',
    'REJECTED'
);

CREATE TYPE esocial.s2298_reint_type AS ENUM (
    '1',
    '2',
    '9'
);

CREATE TYPE esocial.s2306_event_status AS ENUM (
    'DRAFT',
    'TRANSMITTED',
    'ACCEPTED',
    'REJECTED'
);

CREATE TYPE esocial.s3000_request_status AS ENUM (
    'PENDING',
    'EMITTED',
    'ACCEPTED',
    'REJECTED',
    'BLOCKED'
);

CREATE TYPE esocial.submission_batch_status AS ENUM (
    'PENDING',
    'SENT',
    'ACCEPTED',
    'REJECTED',
    'TIMEOUT',
    'RETRY'
);

CREATE TYPE esocial.submission_environment AS ENUM (
    'PRODUCTION',
    'QUALIFICATION'
);

CREATE TABLE esocial.endpoint_circuit_state (
    endpoint_url text NOT NULL,
    opened_at timestamp with time zone,
    last_failure_at timestamp with time zone,
    failure_count integer DEFAULT 0 NOT NULL,
    state esocial.endpoint_circuit_state_status DEFAULT 'CLOSED'::esocial.endpoint_circuit_state_status NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT endpoint_circuit_failure_count_nonnegative_chk CHECK ((failure_count >= 0)),
    CONSTRAINT endpoint_circuit_opened_at_chk CHECK ((((state = 'OPEN'::esocial.endpoint_circuit_state_status) AND (opened_at IS NOT NULL)) OR (state <> 'OPEN'::esocial.endpoint_circuit_state_status)))
);

CREATE TABLE esocial.esocial_totalizer (
    tenant_id uuid NOT NULL,
    competence date NOT NULL,
    kind esocial.esocial_totalizer_kind NOT NULL,
    source_event_recibo text NOT NULL,
    payload jsonb NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT esocial_totalizer_payload_object_chk CHECK ((jsonb_typeof(payload) = 'object'::text))
);

CREATE TABLE esocial.event_retry_schedule (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    event_id uuid NOT NULL,
    attempt integer DEFAULT 1 NOT NULL,
    next_at timestamp with time zone NOT NULL,
    last_error text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_retry_schedule_attempt_chk CHECK ((attempt >= 1))
);

CREATE TABLE esocial.response_classification (
    response_code text NOT NULL,
    class esocial.response_classification_class NOT NULL,
    description text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT response_classification_code_chk CHECK ((response_code ~ '^[0-9]{3}$'::text))
);

CREATE TABLE esocial.s1200_emission_state (
    tenant_id uuid NOT NULL,
    payroll_run_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    recibo text,
    payload_hash character(64) NOT NULL,
    emitted_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE esocial.s1202_emission_state (
    tenant_id uuid NOT NULL,
    payroll_run_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    recibo text,
    payload_hash character(64) NOT NULL,
    emitted_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE esocial.s1210_emission_state (
    tenant_id uuid NOT NULL,
    payment_batch_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    recibo text,
    payload_hash character(64) NOT NULL,
    emitted_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE esocial.s1299_emission_state (
    tenant_id uuid NOT NULL,
    competence date NOT NULL,
    status esocial.s1299_emission_status DEFAULT 'PENDING'::esocial.s1299_emission_status NOT NULL,
    emitted_event_id uuid,
    accepted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    recibo text,
    emitted_at timestamp with time zone
);

CREATE TABLE esocial.s1xxx_dispatch_state (
    tenant_id uuid NOT NULL,
    event_kind esocial.s1xxx_event_kind NOT NULL,
    source_entity_id text NOT NULL,
    last_emitted_at timestamp with time zone,
    last_payload_hash character(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE esocial.s2200_emission_state (
    tenant_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    emitted_at timestamp with time zone DEFAULT now() NOT NULL,
    recibo text,
    payload_hash character(64) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE esocial.s2205_pending_alteration (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    field_path text NOT NULL,
    source_table text NOT NULL,
    source_row_id uuid NOT NULL,
    previous_payload jsonb,
    current_payload jsonb,
    -- R4-71: closed S-2205 queue lifecycle converted from ANY ARRAY CHECK to enum.
    status esocial.s2205_pending_alteration_status DEFAULT 'PENDING'::esocial.s2205_pending_alteration_status NOT NULL,
    emitted_event_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    consumed_at timestamp with time zone
);

CREATE TABLE esocial.s2205_trigger_field (
    field_path text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE esocial.s2210_pending (
    tenant_id uuid NOT NULL,
    cat_emission_id uuid NOT NULL,
    enqueued_at timestamp with time zone DEFAULT now() NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT s2210_pending_attempts_nonnegative_chk CHECK ((attempts >= 0))
);

CREATE TABLE esocial.s2220_pending (
    tenant_id uuid NOT NULL,
    aso_record_id uuid NOT NULL,
    enqueued_at timestamp with time zone DEFAULT now() NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT s2220_pending_attempts_nonnegative_chk CHECK ((attempts >= 0))
);

CREATE TABLE esocial.s2230_pending (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    leave_or_vacation_id uuid NOT NULL,
    kind esocial.s2230_pending_kind NOT NULL,
    trigger_event esocial.s2230_trigger_event NOT NULL,
    status esocial.es03_pending_status DEFAULT 'PENDING'::esocial.es03_pending_status NOT NULL,
    emitted_event_id uuid,
    enqueued_at timestamp with time zone DEFAULT now() NOT NULL,
    consumed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE esocial.s2240_pending (
    tenant_id uuid NOT NULL,
    environmental_exposure_id uuid NOT NULL,
    trigger_event esocial.s2240_trigger_event NOT NULL,
    enqueued_at timestamp with time zone DEFAULT now() NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT s2240_pending_attempts_nonnegative_chk CHECK ((attempts >= 0))
);

CREATE TABLE esocial.s2298_event (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    reintegration_order_id uuid NOT NULL,
    original_s2299_receipt text NOT NULL,
    -- R4-71: closed eSocial S-2298 reintType code set converted from ANY ARRAY CHECK to enum.
    reint_type esocial.s2298_reint_type NOT NULL,
    payload_xml text NOT NULL,
    receipt text,
    status esocial.s2298_event_status DEFAULT 'DRAFT'::esocial.s2298_event_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE esocial.s2299_pending (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    employment_link_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    calc_run_id uuid NOT NULL,
    status esocial.es03_pending_status DEFAULT 'PENDING'::esocial.es03_pending_status NOT NULL,
    emitted_event_id uuid,
    ready_at timestamp with time zone DEFAULT now() NOT NULL,
    consumed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE esocial.s2306_event (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    tsv_contract_change_id uuid NOT NULL,
    payload_xml text NOT NULL,
    receipt text,
    status esocial.s2306_event_status DEFAULT 'DRAFT'::esocial.s2306_event_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE esocial.s3000_request (
    tenant_id uuid NOT NULL,
    request_id uuid DEFAULT gen_random_uuid() NOT NULL,
    target_event_id uuid NOT NULL,
    target_recibo text NOT NULL,
    target_event_kind text NOT NULL,
    requested_by_user_id uuid,
    justification text NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    status esocial.s3000_request_status DEFAULT 'PENDING'::esocial.s3000_request_status NOT NULL,
    block_reason text,
    emitted_event_id uuid,
    accepted_receipt text,
    accepted_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT s3000_request_block_status_chk CHECK ((((status = 'BLOCKED'::esocial.s3000_request_status) AND (block_reason IS NOT NULL)) OR (status <> 'BLOCKED'::esocial.s3000_request_status))),
    CONSTRAINT s3000_request_justification_min_chk CHECK ((char_length(btrim(justification)) >= 30)),
    CONSTRAINT s3000_request_target_kind_chk CHECK ((target_event_kind ~ '^S-[0-9]{4}$'::text))
);

CREATE TABLE esocial.submission_batch (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    batch_id uuid DEFAULT gen_random_uuid() NOT NULL,
    environment esocial.submission_environment NOT NULL,
    endpoint_url text NOT NULL,
    event_ids uuid[] NOT NULL,
    soap_request_hash character(64),
    soap_response_hash character(64),
    http_status integer,
    status esocial.submission_batch_status DEFAULT 'PENDING'::esocial.submission_batch_status NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    next_attempt_at timestamp with time zone,
    sent_at timestamp with time zone,
    response_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT submission_batch_attempts_nonnegative_chk CHECK ((attempts >= 0)),
    CONSTRAINT submission_batch_event_ids_not_empty_chk CHECK (((cardinality(event_ids) >= 1) AND (cardinality(event_ids) <= 50))),
    CONSTRAINT submission_batch_http_status_chk CHECK (((http_status IS NULL) OR ((http_status >= 100) AND (http_status <= 599))))
);

CREATE TABLE esocial.tenant_certificate (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    certificate_id uuid DEFAULT gen_random_uuid() NOT NULL,
    alias text NOT NULL,
    kind esocial.certificate_kind NOT NULL,
    pkcs12_blob bytea NOT NULL,
    blob_kms_key_id text NOT NULL,
    valid_from timestamp with time zone NOT NULL,
    valid_to timestamp with time zone NOT NULL,
    rotated_at timestamp with time zone,
    rotation_due_at timestamp with time zone NOT NULL,
    status esocial.certificate_status DEFAULT 'ACTIVE'::esocial.certificate_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tenant_certificate_validity_check CHECK ((valid_to > valid_from))
);

CREATE TABLE esocial.xsd_validation_failure (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    attempt_id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_kind text NOT NULL,
    xsd_path text NOT NULL,
    error_xml_pointer text NOT NULL,
    error_message text NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY esocial.endpoint_circuit_state
    ADD CONSTRAINT endpoint_circuit_state_pkey PRIMARY KEY (endpoint_url);

ALTER TABLE ONLY esocial.esocial_totalizer
    ADD CONSTRAINT esocial_totalizer_pkey PRIMARY KEY (tenant_id, competence, kind, source_event_recibo);

ALTER TABLE ONLY esocial.event_retry_schedule
    ADD CONSTRAINT event_retry_schedule_pkey PRIMARY KEY (tenant_id, event_id);

ALTER TABLE ONLY esocial.response_classification
    ADD CONSTRAINT response_classification_pkey PRIMARY KEY (response_code);

ALTER TABLE ONLY esocial.s1200_emission_state
    ADD CONSTRAINT s1200_emission_state_pkey PRIMARY KEY (tenant_id, payroll_run_id, employee_id);

ALTER TABLE ONLY esocial.s1202_emission_state
    ADD CONSTRAINT s1202_emission_state_pkey PRIMARY KEY (tenant_id, payroll_run_id, employee_id);

ALTER TABLE ONLY esocial.s1210_emission_state
    ADD CONSTRAINT s1210_emission_state_pkey PRIMARY KEY (tenant_id, payment_batch_id, employee_id);

ALTER TABLE ONLY esocial.s1299_emission_state
    ADD CONSTRAINT s1299_emission_state_pkey PRIMARY KEY (tenant_id, competence);

ALTER TABLE ONLY esocial.s1xxx_dispatch_state
    ADD CONSTRAINT s1xxx_dispatch_state_pkey PRIMARY KEY (tenant_id, event_kind, source_entity_id);

ALTER TABLE ONLY esocial.s2200_emission_state
    ADD CONSTRAINT s2200_emission_state_pkey PRIMARY KEY (tenant_id, employee_id);

ALTER TABLE ONLY esocial.s2205_pending_alteration
    ADD CONSTRAINT s2205_pending_alteration_pkey PRIMARY KEY (id);

ALTER TABLE ONLY esocial.s2205_trigger_field
    ADD CONSTRAINT s2205_trigger_field_pkey PRIMARY KEY (field_path);

ALTER TABLE ONLY esocial.s2210_pending
    ADD CONSTRAINT s2210_pending_pkey PRIMARY KEY (tenant_id, cat_emission_id);

ALTER TABLE ONLY esocial.s2220_pending
    ADD CONSTRAINT s2220_pending_pkey PRIMARY KEY (tenant_id, aso_record_id);

ALTER TABLE ONLY esocial.s2230_pending
    ADD CONSTRAINT s2230_pending_pkey PRIMARY KEY (id);

ALTER TABLE ONLY esocial.s2230_pending
    ADD CONSTRAINT s2230_pending_tenant_id_leave_or_vacation_id_kind_trigger_e_key UNIQUE (tenant_id, leave_or_vacation_id, kind, trigger_event, status);

ALTER TABLE ONLY esocial.s2240_pending
    ADD CONSTRAINT s2240_pending_pkey PRIMARY KEY (tenant_id, environmental_exposure_id, trigger_event);

ALTER TABLE ONLY esocial.s2298_event
    ADD CONSTRAINT s2298_event_pkey PRIMARY KEY (id);

ALTER TABLE ONLY esocial.s2299_pending
    ADD CONSTRAINT s2299_pending_pkey PRIMARY KEY (id);

ALTER TABLE ONLY esocial.s2299_pending
    ADD CONSTRAINT s2299_pending_tenant_id_employment_link_id_calc_run_id_stat_key UNIQUE (tenant_id, employment_link_id, calc_run_id, status);

ALTER TABLE ONLY esocial.s2306_event
    ADD CONSTRAINT s2306_event_pkey PRIMARY KEY (id);

ALTER TABLE ONLY esocial.s3000_request
    ADD CONSTRAINT s3000_request_pkey PRIMARY KEY (tenant_id, request_id);

ALTER TABLE ONLY esocial.submission_batch
    ADD CONSTRAINT submission_batch_pkey PRIMARY KEY (tenant_id, batch_id);

ALTER TABLE ONLY esocial.tenant_certificate
    ADD CONSTRAINT tenant_certificate_pkey PRIMARY KEY (tenant_id, certificate_id);

ALTER TABLE ONLY esocial.xsd_validation_failure
    ADD CONSTRAINT xsd_validation_failure_pkey PRIMARY KEY (tenant_id, attempt_id);
