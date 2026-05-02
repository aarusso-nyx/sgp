CREATE TABLE saude.aso_attachment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    aso_record_id uuid NOT NULL,
    file_uri text NOT NULL,
    sha256 text NOT NULL,
    mime text NOT NULL,
    encrypted_at_rest boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT aso_attachment_pdf_mime_chk CHECK ((mime = 'application/pdf'::text)),
    CONSTRAINT aso_attachment_sha256_chk CHECK ((sha256 ~ '^[0-9a-f]{64}$'::text))
);

CREATE TABLE saude.aso_exam_item (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    aso_record_id uuid NOT NULL,
    medical_exam_id uuid NOT NULL,
    result_summary text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE saude.aso_record (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    aso_kind saude.aso_kind NOT NULL,
    scheduled_at timestamp with time zone NOT NULL,
    performed_at timestamp with time zone,
    doctor_crm text,
    doctor_name text,
    conclusion saude.aso_conclusion,
    restriction_text text,
    next_exam_due_at timestamp with time zone,
    status saude.aso_status DEFAULT 'SCHEDULED'::saude.aso_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    s2220_event_id uuid,
    CONSTRAINT aso_record_due_required_chk CHECK (((aso_kind <> ALL (ARRAY['PERIODICO'::saude.aso_kind, 'RETORNO_TRABALHO'::saude.aso_kind])) OR (next_exam_due_at IS NOT NULL))),
    CONSTRAINT aso_record_performed_status_chk CHECK (((status = ANY (ARRAY['SCHEDULED'::saude.aso_status, 'CANCELLED'::saude.aso_status])) OR (performed_at IS NOT NULL)))
);

CREATE TABLE saude.cat_emission (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    work_accident_id uuid NOT NULL,
    cat_kind saude.cat_kind NOT NULL,
    emitted_at timestamp with time zone DEFAULT now() NOT NULL,
    deadline_at timestamp with time zone NOT NULL,
    esocial_event_id uuid,
    doctor_crm text NOT NULL,
    doctor_name text NOT NULL,
    internment boolean DEFAULT false NOT NULL,
    leave_until date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE saude.environmental_exposure (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    risk_management_program_id uuid NOT NULL,
    harmful_agent_code text NOT NULL,
    agent_kind saude.harmful_agent_kind NOT NULL,
    intensity_value numeric(18,6),
    intensity_unit text DEFAULT ''::text NOT NULL,
    exposure_start date NOT NULL,
    exposure_end date,
    mitigated_by_epi boolean DEFAULT false NOT NULL,
    mitigated_by_epc boolean DEFAULT false NOT NULL,
    special_retirement_eligible boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT environmental_exposure_agent_code_chk CHECK ((harmful_agent_code ~ '^\d{2}\.\d{2}\.\d{3}$'::text)),
    CONSTRAINT environmental_exposure_period_chk CHECK (((exposure_end IS NULL) OR (exposure_end >= exposure_start)))
);

CREATE TABLE saude.epi_delivery (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    epi_inventory_id uuid NOT NULL,
    delivered_at timestamp with time zone NOT NULL,
    quantity integer NOT NULL,
    signature_method saude.epi_signature_method NOT NULL,
    signature_evidence_uri text,
    training_done_at date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT epi_delivery_quantity_chk CHECK ((quantity > 0)),
    CONSTRAINT epi_delivery_signature_evidence_chk CHECK (((signature_method = 'FISICA'::saude.epi_signature_method) OR (NULLIF(btrim(COALESCE(signature_evidence_uri, ''::text)), ''::text) IS NOT NULL)))
);

CREATE TABLE saude.epi_inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    ca_number text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    validity_months integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT epi_inventory_ca_number_chk CHECK ((ca_number ~ '^[0-9A-Za-z.-]{3,40}$'::text)),
    CONSTRAINT epi_inventory_validity_months_chk CHECK ((validity_months > 0))
);

CREATE TABLE saude.health_program (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    work_location_id uuid NOT NULL,
    kind saude.health_program_kind DEFAULT 'PCMSO'::saude.health_program_kind NOT NULL,
    valid_from date NOT NULL,
    valid_until date NOT NULL,
    responsible_doctor_crm text NOT NULL,
    responsible_doctor_name text NOT NULL,
    status saude.program_status DEFAULT 'DRAFT'::saude.program_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT health_program_validity_chk CHECK ((valid_until >= valid_from))
);

CREATE TABLE saude.medical_exam (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    exam_type saude.medical_exam_type NOT NULL,
    is_mandatory_admission boolean DEFAULT false NOT NULL,
    is_mandatory_periodic boolean DEFAULT false NOT NULL,
    periodicity_months integer,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT medical_exam_periodicity_positive_chk CHECK (((periodicity_months IS NULL) OR (periodicity_months > 0)))
);

CREATE TABLE saude.pcmso_required_exam (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    health_program_id uuid NOT NULL,
    medical_exam_id uuid NOT NULL,
    applies_to_role_id uuid,
    periodicity_months_override integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pcmso_required_exam_periodicity_chk CHECK (((periodicity_months_override IS NULL) OR (periodicity_months_override > 0)))
);

CREATE TABLE saude.ppp_record (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    snapshot_json jsonb NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ppp_record_period_chk CHECK ((period_end >= period_start))
);

CREATE TABLE saude.program_revision (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    parent_program_id uuid NOT NULL,
    parent_program_kind saude.program_parent_kind NOT NULL,
    revision_number integer NOT NULL,
    revision_reason text NOT NULL,
    snapshot_json jsonb NOT NULL,
    signed_pdf_uri text,
    sha256 text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT program_revision_positive_chk CHECK ((revision_number > 0)),
    CONSTRAINT program_revision_sha256_chk CHECK (((sha256 IS NULL) OR (sha256 ~ '^[0-9a-f]{64}$'::text)))
);

CREATE TABLE saude.risk_management_program (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    work_location_id uuid NOT NULL,
    kind saude.risk_management_program_kind DEFAULT 'PGR'::saude.risk_management_program_kind NOT NULL,
    valid_from date NOT NULL,
    valid_until date NOT NULL,
    responsible_engineer_id uuid,
    status saude.program_status DEFAULT 'DRAFT'::saude.program_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT risk_management_program_validity_chk CHECK ((valid_until >= valid_from))
);

CREATE TABLE saude.work_accident (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    accident_at timestamp with time zone NOT NULL,
    accident_type saude.work_accident_type NOT NULL,
    location_text text NOT NULL,
    body_part_code text NOT NULL,
    agent_cause_code text NOT NULL,
    witness_text text DEFAULT ''::text NOT NULL,
    severity saude.work_accident_severity DEFAULT 'LEVE'::saude.work_accident_severity NOT NULL,
    death_at timestamp with time zone,
    status saude.work_accident_status DEFAULT 'REGISTRADO'::saude.work_accident_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT work_accident_agent_cause_code_chk CHECK ((agent_cause_code ~ '^\d{9}$'::text)),
    CONSTRAINT work_accident_body_part_code_chk CHECK ((body_part_code ~ '^\d{9}$'::text)),
    CONSTRAINT work_accident_fatal_death_required_chk CHECK (((severity <> 'FATAL'::saude.work_accident_severity) OR (death_at IS NOT NULL)))
);
