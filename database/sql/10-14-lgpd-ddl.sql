CREATE OR REPLACE FUNCTION lgpd.sgp_lgpd_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

CREATE TYPE lgpd.legal_basis_data_category AS ENUM (
    'PERSONAL',
    'SENSITIVE',
    'MIXED'
);

CREATE TYPE lgpd.legal_basis_rule_status AS ENUM (
    'ACTIVE',
    'RETIRED'
);

CREATE TYPE lgpd.ropa_risk_level AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);

CREATE TYPE lgpd.ropa_entry_status AS ENUM (
    'ACTIVE',
    'UNDER_REVIEW',
    'RETIRED'
);

CREATE TYPE lgpd.public_power_treatment_status AS ENUM (
    'REGISTERED',
    'UNDER_REVIEW',
    'SUSPENDED',
    'RETIRED'
);

CREATE TYPE lgpd.data_subject_right_type AS ENUM (
    'CONFIRMATION',
    'ACCESS',
    'CORRECTION',
    'ANONYMIZATION_BLOCKING_DELETION',
    'PORTABILITY',
    'CONSENT_DELETION'
);

CREATE TYPE lgpd.data_subject_request_status AS ENUM (
    'PENDING_TRIAGE',
    'IN_PROGRESS',
    'WAITING_CONTROLLER',
    'ANSWERED',
    'REJECTED',
    'CANCELLED'
);

CREATE TYPE lgpd.data_subject_triage_outcome AS ENUM (
    'PENDING',
    'EXECUTABLE',
    'RETENTION_RESTRICTED',
    'LEGALLY_BLOCKED'
);

CREATE TYPE lgpd.security_incident_status AS ENUM (
    'DETECTED',
    'TRIAGED',
    'REPORTED',
    'COMPLEMENTED',
    'CLOSED'
);

CREATE TYPE lgpd.security_incident_severity AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);

CREATE TABLE lgpd.legal_basis_rule (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    flow_key text NOT NULL,
    flow_name text NOT NULL,
    controller_role text DEFAULT 'PUBLIC_AUTHORITY'::text NOT NULL,
    -- R4-71: closed legal-basis data category converted from ANY ARRAY CHECK to enum.
    data_category lgpd.legal_basis_data_category NOT NULL,
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
    -- R4-71: closed legal-basis rule lifecycle converted from ANY ARRAY CHECK to enum.
    status lgpd.legal_basis_rule_status DEFAULT 'ACTIVE'::lgpd.legal_basis_rule_status NOT NULL,
    effective_from date DEFAULT DATE '2026-05-02' NOT NULL,
    effective_until date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT legal_basis_rule_pkey PRIMARY KEY (id),
    CONSTRAINT legal_basis_rule_sensitive_check CHECK (
        (data_category = 'PERSONAL'::lgpd.legal_basis_data_category AND sensitive_basis_code IS NULL AND sensitive_basis_article IS NULL)
        OR (data_category <> 'PERSONAL'::lgpd.legal_basis_data_category AND sensitive_basis_code IS NOT NULL AND sensitive_basis_article IS NOT NULL)
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
    -- R4-71: closed ROPA risk scale converted from ANY ARRAY CHECK to enum.
    risk_level lgpd.ropa_risk_level DEFAULT 'MEDIUM'::lgpd.ropa_risk_level NOT NULL,
    -- R4-71: closed ROPA lifecycle converted from ANY ARRAY CHECK to enum.
    status lgpd.ropa_entry_status DEFAULT 'ACTIVE'::lgpd.ropa_entry_status NOT NULL,
    review_due_at date,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ropa_entry_pkey PRIMARY KEY (id)
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
    -- R4-71: closed public-power treatment lifecycle converted from ANY ARRAY CHECK to enum.
    status lgpd.public_power_treatment_status DEFAULT 'REGISTERED'::lgpd.public_power_treatment_status NOT NULL,
    notes text,
    created_by_ref text,
    updated_by_ref text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT public_power_treatment_pkey PRIMARY KEY (id),
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
    -- R4-71: closed LGPD Art. 18 right type converted from ANY ARRAY CHECK to enum.
    right_type lgpd.data_subject_right_type NOT NULL,
    -- R4-71: closed data-subject request lifecycle converted from ANY ARRAY CHECK to enum.
    status lgpd.data_subject_request_status DEFAULT 'PENDING_TRIAGE'::lgpd.data_subject_request_status NOT NULL,
    request_description text NOT NULL,
    requested_by_sub text NOT NULL,
    requested_by_login text NOT NULL,
    data_subject_employee_id uuid,
    sla_started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    sla_due_at timestamp with time zone DEFAULT (CURRENT_TIMESTAMP + interval '90 days') NOT NULL,
    -- R4-71: closed triage outcome set converted from ANY ARRAY CHECK to enum.
    triage_outcome lgpd.data_subject_triage_outcome DEFAULT 'PENDING'::lgpd.data_subject_triage_outcome NOT NULL,
    retention_rule_snapshot text NOT NULL,
    sharing_scope_snapshot text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT data_subject_request_pkey PRIMARY KEY (id)
);

CREATE TABLE lgpd.security_incident (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    ropa_entry_id uuid,
    legal_basis_rule_id uuid,
    flow_key text,
    -- R4-71: closed RCIS lifecycle converted from ANY ARRAY CHECK to enum.
    status lgpd.security_incident_status DEFAULT 'DETECTED'::lgpd.security_incident_status NOT NULL,
    -- R4-71: closed RCIS severity scale converted from ANY ARRAY CHECK to enum.
    severity lgpd.security_incident_severity DEFAULT 'MEDIUM'::lgpd.security_incident_severity NOT NULL,
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
    CONSTRAINT security_incident_estimates_check CHECK (
        (affected_subjects_estimate IS NULL OR affected_subjects_estimate >= 0)
        AND (affected_children_estimate IS NULL OR affected_children_estimate >= 0)
        AND (affected_elderly_estimate IS NULL OR affected_elderly_estimate >= 0)
    ),
    CONSTRAINT security_incident_reported_check CHECK (
        status NOT IN ('REPORTED'::lgpd.security_incident_status, 'COMPLEMENTED'::lgpd.security_incident_status, 'CLOSED'::lgpd.security_incident_status)
        OR (anpd_reported_at IS NOT NULL AND complement_due_at IS NOT NULL)
    ),
    CONSTRAINT security_incident_complemented_check CHECK (
        status NOT IN ('COMPLEMENTED'::lgpd.security_incident_status, 'CLOSED'::lgpd.security_incident_status)
        OR complemented_at IS NOT NULL
    )
);
