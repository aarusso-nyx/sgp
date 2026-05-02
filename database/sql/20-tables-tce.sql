CREATE TABLE tce.adapter_circuit_state (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    adapter_id text NOT NULL,
    endpoint_url text DEFAULT ''::text NOT NULL,
    state tce.adapter_circuit_state_status DEFAULT 'CLOSED'::tce.adapter_circuit_state_status NOT NULL,
    failure_count integer DEFAULT 0 NOT NULL,
    opened_at timestamp with time zone,
    last_failure_at timestamp with time zone,
    last_success_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT adapter_circuit_state_adapter_chk CHECK ((adapter_id ~ '^[a-z0-9][a-z0-9._-]{1,62}$'::text)),
    CONSTRAINT adapter_circuit_state_failure_count_chk CHECK ((failure_count >= 0))
);

CREATE TABLE tce.adapter_lifecycle_event (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    adapter_id text NOT NULL,
    event tce.adapter_lifecycle_event_kind NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT adapter_lifecycle_event_payload_chk CHECK ((jsonb_typeof(payload) = 'object'::text))
);

CREATE TABLE tce.adapter_registry (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    adapter_id text NOT NULL,
    state_code character(2) NOT NULL,
    municipal_code text,
    organ_kind tce.organ_kind NOT NULL,
    version text NOT NULL,
    status tce.adapter_status DEFAULT 'REGISTERED'::tce.adapter_status NOT NULL,
    capabilities jsonb DEFAULT '{}'::jsonb NOT NULL,
    registered_at timestamp with time zone DEFAULT now() NOT NULL,
    last_health_check_at timestamp with time zone,
    last_health_status text,
    CONSTRAINT adapter_registry_adapter_id_chk CHECK ((adapter_id ~ '^[a-z0-9][a-z0-9._-]{1,62}$'::text)),
    CONSTRAINT adapter_registry_capabilities_chk CHECK ((jsonb_typeof(capabilities) = 'object'::text)),
    CONSTRAINT adapter_registry_municipal_code_chk CHECK (((municipal_code IS NULL) OR (length(TRIM(BOTH FROM municipal_code)) > 0))),
    CONSTRAINT adapter_registry_state_code_chk CHECK ((state_code ~ '^[A-Z]{2}$'::text)),
    CONSTRAINT adapter_registry_version_semver_chk CHECK ((version ~ '^[0-9]+[.][0-9]+[.][0-9]+([+-][0-9A-Za-z.-]+)?$'::text))
);

CREATE TABLE tce.layout_field (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    layout_version_id uuid NOT NULL,
    field_path text NOT NULL,
    data_type tce.layout_field_data_type NOT NULL,
    required boolean DEFAULT false NOT NULL,
    max_length integer,
    decimal_precision integer,
    decimal_scale integer,
    transform_rule text,
    source_hint text,
    ordering integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT layout_field_decimal_chk CHECK ((((data_type = 'DECIMAL'::tce.layout_field_data_type) AND (decimal_precision IS NOT NULL) AND (decimal_scale IS NOT NULL) AND (decimal_precision > 0) AND (decimal_scale >= 0) AND (decimal_scale <= decimal_precision)) OR ((data_type <> 'DECIMAL'::tce.layout_field_data_type) AND (decimal_precision IS NULL) AND (decimal_scale IS NULL)))),
    CONSTRAINT layout_field_length_chk CHECK (((max_length IS NULL) OR (max_length > 0))),
    CONSTRAINT layout_field_ordering_chk CHECK ((ordering >= 0)),
    CONSTRAINT layout_field_path_chk CHECK ((length(TRIM(BOTH FROM field_path)) > 0))
);

CREATE TABLE tce.layout_version (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    state_id uuid NOT NULL,
    system_name text NOT NULL,
    version tce.semver NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    status tce.layout_status DEFAULT 'DRAFT'::tce.layout_status NOT NULL,
    publication_url text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT layout_version_dates_chk CHECK (((effective_to IS NULL) OR (effective_to >= effective_from))),
    CONSTRAINT layout_version_system_chk CHECK ((length(TRIM(BOTH FROM system_name)) > 0))
);

CREATE TABLE tce.state (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character(2) NOT NULL,
    name text NOT NULL,
    sphere tce.state_sphere NOT NULL,
    parent_state_code character(2),
    organ_kind tce.organ_kind NOT NULL,
    organ_name text NOT NULL,
    organ_official_url text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT state_code_chk CHECK ((code ~ '^[A-Z]{2}$'::text)),
    CONSTRAINT state_municipal_parent_chk CHECK ((((sphere = 'MUNICIPAL'::tce.state_sphere) AND (parent_state_code IS NOT NULL)) OR ((sphere <> 'MUNICIPAL'::tce.state_sphere) AND (parent_state_code IS NULL)))),
    CONSTRAINT state_parent_code_chk CHECK (((parent_state_code IS NULL) OR (parent_state_code ~ '^[A-Z]{2}$'::text)))
);

CREATE TABLE tce.submission (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    adapter_id text NOT NULL,
    layout_version_id uuid NOT NULL,
    payroll_run_id uuid NOT NULL,
    competence_year integer NOT NULL,
    competence_month integer NOT NULL,
    envelope_xml_uri text,
    envelope_hash text,
    request_size_bytes integer,
    status tce.submission_status DEFAULT 'DRAFT'::tce.submission_status NOT NULL,
    validation_errors jsonb DEFAULT '[]'::jsonb NOT NULL,
    response_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    response_hash text,
    submitted_at timestamp with time zone,
    response_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT submission_adapter_chk CHECK ((adapter_id ~ '^[a-z0-9][a-z0-9._-]{1,62}$'::text)),
    CONSTRAINT submission_competence_month_chk CHECK (((competence_month >= 1) AND (competence_month <= 12))),
    CONSTRAINT submission_hash_chk CHECK (((envelope_hash IS NULL) OR (envelope_hash ~ '^[a-f0-9]{64}$'::text))),
    CONSTRAINT submission_request_size_chk CHECK (((request_size_bytes IS NULL) OR (request_size_bytes >= 0))),
    CONSTRAINT submission_response_hash_chk CHECK (((response_hash IS NULL) OR (response_hash ~ '^[a-f0-9]{64}$'::text))),
    CONSTRAINT submission_response_payload_object_chk CHECK ((jsonb_typeof(response_payload) = 'object'::text)),
    CONSTRAINT submission_validation_errors_array_chk CHECK ((jsonb_typeof(validation_errors) = 'array'::text))
);

CREATE TABLE tce.submission_attempt (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    queue_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    attempt_number integer NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    outcome tce.submission_attempt_outcome NOT NULL,
    error_payload jsonb,
    CONSTRAINT submission_attempt_error_payload_chk CHECK (((error_payload IS NULL) OR (jsonb_typeof(error_payload) = 'object'::text))),
    CONSTRAINT submission_attempt_number_chk CHECK ((attempt_number > 0))
);

CREATE TABLE tce.submission_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    submission_id uuid NOT NULL,
    adapter_id text NOT NULL,
    endpoint_url text,
    status tce.submission_queue_status DEFAULT 'PENDING'::tce.submission_queue_status NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 8 NOT NULL,
    next_attempt_at timestamp with time zone,
    locked_by text,
    locked_at timestamp with time zone,
    last_error_kind tce.submission_error_kind,
    last_error_payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT submission_queue_adapter_chk CHECK ((adapter_id ~ '^[a-z0-9][a-z0-9._-]{1,62}$'::text)),
    CONSTRAINT submission_queue_attempts_chk CHECK ((attempts >= 0)),
    CONSTRAINT submission_queue_last_error_payload_chk CHECK (((last_error_payload IS NULL) OR (jsonb_typeof(last_error_payload) = 'object'::text))),
    CONSTRAINT submission_queue_max_attempts_chk CHECK ((max_attempts > 0))
);
