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

ALTER TABLE ONLY public_data.transparency_access_log
    ADD CONSTRAINT transparency_access_log_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public_data.transparency_payroll_snapshot
    ADD CONSTRAINT transparency_payroll_snapshot_pkey PRIMARY KEY (tenant_id, competence, employee_public_id);

ALTER TABLE ONLY public_data.transparency_publish_event
    ADD CONSTRAINT transparency_publish_event_pkey PRIMARY KEY (id);
