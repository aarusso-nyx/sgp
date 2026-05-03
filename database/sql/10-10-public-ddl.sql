CREATE TABLE public.esocial_event (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    event_type text NOT NULL,
    reference text NOT NULL,
    competence text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    xml_payload text,
    schema_version text DEFAULT 'S-1.2'::text NOT NULL,
    status public."ESocialEventStatus" DEFAULT 'PENDENTE'::public."ESocialEventStatus" NOT NULL,
    receipt_number text,
    protocol_number text,
    retry_count integer DEFAULT 0 NOT NULL,
    last_error_code text,
    last_error_message text,
    generated_at timestamp(6) with time zone,
    processed_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    event_kind esocial.s1xxx_event_kind,
    source_entity_kind text,
    source_entity_id text,
    xml_signed bytea,
    xml_hash character(64),
    payroll_run_id uuid,
    payment_batch_id uuid,
    response_code text,
    response_description text,
    response_errors jsonb DEFAULT '[]'::jsonb NOT NULL,
    last_response_at timestamp with time zone
);

CREATE TABLE public.system_parameter (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value jsonb NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    module_key text,
    updated_by_user_id uuid,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE public.tenant (
    id uuid NOT NULL,
    slug text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    transparency_enabled boolean DEFAULT false NOT NULL,
    tenant_timezone text DEFAULT 'America/Sao_Paulo'::text NOT NULL
);

CREATE TABLE public.access_profile (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE public.audit_event (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    occurred_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actor_user_id uuid,
    actor_sub text,
    actor_login text,
    action public."AuditAction" NOT NULL,
    resource_type text NOT NULL,
    resource_id text,
    table_name text,
    request_id text,
    ip_address inet,
    user_agent text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    reason text
) PARTITION BY RANGE (occurred_at);

CREATE TABLE public.audit_event_default PARTITION OF public.audit_event DEFAULT;

CREATE TABLE public.document_attachment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_type_id uuid,
    owner_type text NOT NULL,
    owner_id text,
    storage_kind public."DocumentStorageKind" DEFAULT 'LOCAL'::public."DocumentStorageKind" NOT NULL,
    file_name text NOT NULL,
    content_type text,
    size_bytes integer,
    checksum text,
    storage_key text NOT NULL,
    public boolean DEFAULT false NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    CONSTRAINT document_attachment_size_nonnegative_check CHECK (((size_bytes IS NULL) OR (size_bytes >= 0)))
);

CREATE TABLE public.document_download_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    attachment_id uuid NOT NULL,
    user_id uuid,
    downloaded_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    request_id text,
    ip_address inet,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE public.document_type (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE public.document_upload_session (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    requested_by_sub text,
    requested_by_login text,
    request_id text,
    owner_type text NOT NULL,
    owner_id text,
    file_name text NOT NULL,
    content_type text NOT NULL,
    size_bytes integer,
    storage_bucket text NOT NULL,
    storage_key text NOT NULL,
    required_headers jsonb DEFAULT '{}'::jsonb NOT NULL,
    status public."DocumentUploadStatus" DEFAULT 'PENDING'::public."DocumentUploadStatus" NOT NULL,
    expires_at timestamp(6) with time zone NOT NULL,
    registered_attachment_id uuid,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE public.generated_report_file (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_request_id uuid NOT NULL,
    attachment_id uuid NOT NULL,
    format text NOT NULL,
    generated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    report_kind public."ReportKind",
    competence date,
    employee_id uuid,
    payroll_run_id uuid,
    pdf_a_compliance public."PdfACompliance" DEFAULT 'NONE'::public."PdfACompliance" NOT NULL,
    signature_kind public."SignatureKind" DEFAULT 'NONE'::public."SignatureKind" NOT NULL,
    signed_at timestamp with time zone,
    retention_until date,
    file_hash text
);

CREATE TABLE public.menu_item (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parent_id uuid,
    profile_id uuid,
    code text NOT NULL,
    label text NOT NULL,
    route text,
    module_key text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE public.notification (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    module_key text,
    title text NOT NULL,
    body text NOT NULL,
    read_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE public.payslip_batch (
    batch_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    competence date NOT NULL,
    payroll_run_id uuid NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    requested_by uuid,
    status public."PayslipBatchStatus" DEFAULT 'QUEUED'::public."PayslipBatchStatus" NOT NULL,
    file_count integer DEFAULT 0 NOT NULL,
    error_count integer DEFAULT 0 NOT NULL,
    error_message text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.permission (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    module_key text NOT NULL,
    resource_key text NOT NULL,
    action_key text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    route_pattern text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.profile_assignment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    starts_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ends_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE public.profile_permission (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    allowed boolean DEFAULT true NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.report_definition (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    module_key text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE public.report_request (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    definition_id uuid NOT NULL,
    requested_by_user_id uuid,
    branch_id uuid,
    payroll_run_id uuid,
    processing_type_id uuid,
    competence_year integer,
    competence_month integer,
    status public."ReportRequestStatus" DEFAULT 'REQUESTED'::public."ReportRequestStatus" NOT NULL,
    parameters jsonb DEFAULT '{}'::jsonb NOT NULL,
    requested_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at timestamp(6) with time zone,
    error_message text,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    CONSTRAINT report_request_competence_month_check CHECK (((competence_month IS NULL) OR ((competence_month >= 1) AND (competence_month <= 12))))
);

CREATE TABLE public.tax_rate (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    scope text NOT NULL,
    reference_year integer NOT NULL,
    rate_percent numeric(18,6) NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    kind text DEFAULT 'GENERIC'::text NOT NULL,
    competence_start date,
    competence_end date,
    bracket_min numeric(14,2),
    bracket_max numeric(14,2),
    rate numeric(18,6) DEFAULT 0 NOT NULL,
    deduction_amount numeric(14,2) DEFAULT 0 NOT NULL,
    dependent_deduction numeric(14,2) DEFAULT 0 NOT NULL
);

CREATE TABLE public.user_account (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cognito_sub text,
    login text NOT NULL,
    cpf text,
    name text NOT NULL,
    email text,
    status public."UserStatus" DEFAULT 'ACTIVE'::public."UserStatus" NOT NULL,
    last_login_at timestamp(6) with time zone,
    password_changed_at timestamp(6) with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deactivated_at timestamp(6) with time zone,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

CREATE TABLE public.user_group_snapshot (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    provider text DEFAULT 'cognito'::text NOT NULL,
    group_key text NOT NULL,
    captured_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(6) with time zone,
    raw_claims jsonb DEFAULT '{}'::jsonb NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL
);

ALTER TABLE ONLY public.access_profile
    ADD CONSTRAINT access_profile_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.audit_event
    ADD CONSTRAINT audit_event_pkey PRIMARY KEY (id, occurred_at);

ALTER TABLE ONLY public.document_attachment
    ADD CONSTRAINT document_attachment_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.document_download_audit
    ADD CONSTRAINT document_download_audit_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.document_type
    ADD CONSTRAINT document_type_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.document_upload_session
    ADD CONSTRAINT document_upload_session_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.esocial_event
    ADD CONSTRAINT esocial_event_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.generated_report_file
    ADD CONSTRAINT generated_report_file_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.menu_item
    ADD CONSTRAINT menu_item_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payslip_batch
    ADD CONSTRAINT payslip_batch_pkey PRIMARY KEY (batch_id);

ALTER TABLE ONLY public.permission
    ADD CONSTRAINT permission_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.profile_assignment
    ADD CONSTRAINT profile_assignment_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.profile_permission
    ADD CONSTRAINT profile_permission_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.report_definition
    ADD CONSTRAINT report_definition_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.report_request
    ADD CONSTRAINT report_request_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.system_parameter
    ADD CONSTRAINT system_parameter_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tax_rate
    ADD CONSTRAINT tax_rate_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tenant
    ADD CONSTRAINT tenant_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_account
    ADD CONSTRAINT user_account_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_group_snapshot
    ADD CONSTRAINT user_group_snapshot_pkey PRIMARY KEY (id);
