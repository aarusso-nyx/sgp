CREATE TABLE lgpd.legal_basis_rule (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    flow_key text NOT NULL,
    flow_name text NOT NULL,
    controller_role text DEFAULT 'PUBLIC_AUTHORITY'::text NOT NULL,
    data_category text NOT NULL,
    legal_basis_code text NOT NULL,
    legal_basis_article text NOT NULL,
    sensitive_basis_code text,
    sensitive_basis_article text,
    purpose text NOT NULL,
    data_subjects text[] DEFAULT ARRAY[]::text[] NOT NULL,
    data_categories text[] DEFAULT ARRAY[]::text[] NOT NULL,
    source_tables text[] DEFAULT ARRAY[]::text[] NOT NULL,
    read_surfaces text[] DEFAULT ARRAY[]::text[] NOT NULL,
    retention_rule text NOT NULL,
    sharing_scope text DEFAULT 'internal'::text NOT NULL,
    requires_consent boolean DEFAULT false NOT NULL,
    requires_dpia boolean DEFAULT false NOT NULL,
    decision_record_anchor text NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    effective_from date DEFAULT DATE '2026-05-02' NOT NULL,
    effective_until date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT legal_basis_rule_pkey PRIMARY KEY (id),
    CONSTRAINT legal_basis_rule_category_check CHECK (data_category = ANY (ARRAY['PERSONAL'::text, 'SENSITIVE'::text, 'MIXED'::text])),
    CONSTRAINT legal_basis_rule_status_check CHECK (status = ANY (ARRAY['ACTIVE'::text, 'RETIRED'::text])),
    CONSTRAINT legal_basis_rule_sensitive_check CHECK (
        (data_category = 'PERSONAL'::text AND sensitive_basis_code IS NULL AND sensitive_basis_article IS NULL)
        OR (data_category <> 'PERSONAL'::text AND sensitive_basis_code IS NOT NULL AND sensitive_basis_article IS NOT NULL)
    ),
    CONSTRAINT legal_basis_rule_validity_check CHECK (effective_until IS NULL OR effective_until >= effective_from)
);

CREATE TABLE lgpd.ropa_entry (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    legal_basis_rule_id uuid NOT NULL,
    flow_key text NOT NULL,
    operation_name text NOT NULL,
    controller_area text NOT NULL,
    processor_name text,
    external_recipients text[] DEFAULT ARRAY[]::text[] NOT NULL,
    international_transfer boolean DEFAULT false NOT NULL,
    security_controls text[] DEFAULT ARRAY[]::text[] NOT NULL,
    lifecycle_evidence text[] DEFAULT ARRAY[]::text[] NOT NULL,
    risk_level text DEFAULT 'MEDIUM'::text NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    review_due_at date,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ropa_entry_pkey PRIMARY KEY (id),
    CONSTRAINT ropa_entry_risk_level_check CHECK (risk_level = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'CRITICAL'::text])),
    CONSTRAINT ropa_entry_status_check CHECK (status = ANY (ARRAY['ACTIVE'::text, 'UNDER_REVIEW'::text, 'RETIRED'::text]))
);

CREATE TABLE lgpd.public_power_treatment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    ropa_entry_id uuid NOT NULL,
    legal_basis_rule_id uuid NOT NULL,
    flow_key text NOT NULL,
    purpose text NOT NULL,
    legal_basis_reference text NOT NULL,
    responsible_area text NOT NULL,
    evidence_refs text[] DEFAULT ARRAY[]::text[] NOT NULL,
    status text DEFAULT 'REGISTERED'::text NOT NULL,
    notes text,
    created_by_ref text,
    updated_by_ref text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT public_power_treatment_pkey PRIMARY KEY (id),
    CONSTRAINT public_power_treatment_status_check CHECK (status = ANY (ARRAY['REGISTERED'::text, 'UNDER_REVIEW'::text, 'SUSPENDED'::text, 'RETIRED'::text])),
    CONSTRAINT public_power_treatment_required_text_check CHECK (
        length(btrim(purpose)) > 0
        AND length(btrim(legal_basis_reference)) > 0
        AND length(btrim(responsible_area)) > 0
    )
);

CREATE TABLE lgpd.data_subject_request (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    ropa_entry_id uuid NOT NULL,
    legal_basis_rule_id uuid NOT NULL,
    flow_key text NOT NULL,
    right_type text NOT NULL,
    status text DEFAULT 'PENDING_TRIAGE'::text NOT NULL,
    request_description text NOT NULL,
    requested_by_sub text NOT NULL,
    requested_by_login text NOT NULL,
    data_subject_employee_id uuid,
    sla_started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    sla_due_at timestamp with time zone DEFAULT (CURRENT_TIMESTAMP + interval '90 days') NOT NULL,
    triage_outcome text DEFAULT 'PENDING'::text NOT NULL,
    retention_rule_snapshot text NOT NULL,
    sharing_scope_snapshot text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT data_subject_request_pkey PRIMARY KEY (id),
    CONSTRAINT data_subject_request_right_type_check CHECK (right_type = ANY (ARRAY['CONFIRMATION'::text, 'ACCESS'::text, 'CORRECTION'::text, 'ANONYMIZATION_BLOCKING_DELETION'::text, 'PORTABILITY'::text, 'CONSENT_DELETION'::text])),
    CONSTRAINT data_subject_request_status_check CHECK (status = ANY (ARRAY['PENDING_TRIAGE'::text, 'IN_PROGRESS'::text, 'WAITING_CONTROLLER'::text, 'ANSWERED'::text, 'REJECTED'::text, 'CANCELLED'::text])),
    CONSTRAINT data_subject_request_triage_outcome_check CHECK (triage_outcome = ANY (ARRAY['PENDING'::text, 'EXECUTABLE'::text, 'RETENTION_RESTRICTED'::text, 'LEGALLY_BLOCKED'::text]))
);

CREATE TABLE lgpd.security_incident (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    ropa_entry_id uuid,
    legal_basis_rule_id uuid,
    flow_key text,
    status text DEFAULT 'DETECTED'::text NOT NULL,
    severity text DEFAULT 'MEDIUM'::text NOT NULL,
    summary text NOT NULL,
    detected_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    personal_data_confirmed_at timestamp with time zone,
    anpd_due_at timestamp with time zone,
    anpd_alert_at timestamp with time zone,
    anpd_reported_at timestamp with time zone,
    complement_due_at timestamp with time zone,
    complemented_at timestamp with time zone,
    closed_at timestamp with time zone,
    affected_data_nature text,
    affected_data_categories text[] DEFAULT ARRAY[]::text[] NOT NULL,
    affected_subjects_estimate integer,
    affected_children_estimate integer,
    affected_elderly_estimate integer,
    risk_relevant boolean DEFAULT false NOT NULL,
    risk_assessment text,
    mitigation_measures text[] DEFAULT ARRAY[]::text[] NOT NULL,
    controller_contact text,
    anpd_protocol text,
    titular_communication_summary text,
    complement_summary text,
    closure_reason text,
    created_by_ref text,
    triaged_by_ref text,
    reported_by_ref text,
    complemented_by_ref text,
    closed_by_ref text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT security_incident_pkey PRIMARY KEY (id),
    CONSTRAINT security_incident_status_check CHECK (status = ANY (ARRAY['DETECTED'::text, 'TRIAGED'::text, 'REPORTED'::text, 'COMPLEMENTED'::text, 'CLOSED'::text])),
    CONSTRAINT security_incident_severity_check CHECK (severity = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'CRITICAL'::text])),
    CONSTRAINT security_incident_estimates_check CHECK (
        (affected_subjects_estimate IS NULL OR affected_subjects_estimate >= 0)
        AND (affected_children_estimate IS NULL OR affected_children_estimate >= 0)
        AND (affected_elderly_estimate IS NULL OR affected_elderly_estimate >= 0)
    ),
    CONSTRAINT security_incident_reported_check CHECK (
        status NOT IN ('REPORTED'::text, 'COMPLEMENTED'::text, 'CLOSED'::text)
        OR (anpd_reported_at IS NOT NULL AND complement_due_at IS NOT NULL)
    ),
    CONSTRAINT security_incident_complemented_check CHECK (
        status NOT IN ('COMPLEMENTED'::text, 'CLOSED'::text)
        OR complemented_at IS NOT NULL
    )
);
