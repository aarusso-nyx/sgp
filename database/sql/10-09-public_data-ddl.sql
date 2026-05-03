CREATE TABLE public_data.transparency_access_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    accessed_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_hash text NOT NULL,
    user_agent_hash text NOT NULL,
    path text NOT NULL,
    query jsonb DEFAULT '{}'::jsonb NOT NULL,
    status_code smallint NOT NULL
);

CREATE TABLE public_data.transparency_payroll_snapshot (
    tenant_id uuid NOT NULL,
    competence date NOT NULL,
    employee_public_id text NOT NULL,
    full_name text NOT NULL,
    registration_number text NOT NULL,
    position_name text NOT NULL,
    organizational_unit text NOT NULL,
    gross_total numeric(14,2) NOT NULL,
    deductions_total numeric(14,2) NOT NULL,
    net_total numeric(14,2) NOT NULL,
    snapshot_taken_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public_data.transparency_publish_event (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    competence date NOT NULL,
    payroll_run_id uuid NOT NULL,
    published_at timestamp with time zone DEFAULT now() NOT NULL,
    published_by uuid,
    snapshot_hash text NOT NULL
);

CREATE TABLE public_data.lai_request (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    protocol text NOT NULL,
    requester_name text NOT NULL,
    requester_email text NOT NULL,
    requester_document_hash text,
    request_text text NOT NULL,
    access_key_hash text NOT NULL,
    status text DEFAULT 'RECEIVED'::text NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    due_at timestamp with time zone NOT NULL,
    extended_due_at timestamp with time zone,
    answered_at timestamp with time zone,
    closed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lai_request_status_check CHECK (status = ANY (ARRAY['RECEIVED'::text, 'IN_REVIEW'::text, 'AWAITING_CLARIFICATION'::text, 'EXTENDED'::text, 'ANSWERED'::text, 'DENIED'::text, 'CLOSED'::text]))
);

CREATE TABLE public_data.lai_request_event (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    request_id uuid NOT NULL,
    from_status text,
    to_status text NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    actor_id uuid,
    reason text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT lai_request_event_from_status_check CHECK ((from_status IS NULL) OR (from_status = ANY (ARRAY['RECEIVED'::text, 'IN_REVIEW'::text, 'AWAITING_CLARIFICATION'::text, 'EXTENDED'::text, 'ANSWERED'::text, 'DENIED'::text, 'CLOSED'::text]))),
    CONSTRAINT lai_request_event_to_status_check CHECK (to_status = ANY (ARRAY['RECEIVED'::text, 'IN_REVIEW'::text, 'AWAITING_CLARIFICATION'::text, 'EXTENDED'::text, 'ANSWERED'::text, 'DENIED'::text, 'CLOSED'::text]))
);

ALTER TABLE ONLY public_data.transparency_access_log
    ADD CONSTRAINT transparency_access_log_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public_data.transparency_payroll_snapshot
    ADD CONSTRAINT transparency_payroll_snapshot_pkey PRIMARY KEY (tenant_id, competence, employee_public_id);

ALTER TABLE ONLY public_data.transparency_publish_event
    ADD CONSTRAINT transparency_publish_event_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public_data.lai_request
    ADD CONSTRAINT lai_request_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public_data.lai_request
    ADD CONSTRAINT lai_request_tenant_protocol_key UNIQUE (tenant_id, protocol);

ALTER TABLE ONLY public_data.lai_request_event
    ADD CONSTRAINT lai_request_event_pkey PRIMARY KEY (id);
