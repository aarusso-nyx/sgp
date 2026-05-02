CREATE TYPE ponto.absence_justification_kind AS ENUM (
    'MEDICAL',
    'MARRIAGE',
    'BEREAVEMENT',
    'BLOOD_DONATION',
    'MILITARY',
    'VOTING',
    'PATERNITY',
    'MATERNITY',
    'LEGAL_DUTY',
    'UNION',
    'TRAINING',
    'OTHER'
);

CREATE TYPE ponto.absence_justification_status AS ENUM (
    'REQUESTED',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
);

CREATE TYPE ponto.absence_payroll_treatment AS ENUM (
    'PAID',
    'UNPAID',
    'HOUR_BANK_NEUTRAL'
);

CREATE TYPE ponto.afd_export_status AS ENUM (
    'GENERATING',
    'READY',
    'FAILED'
);

CREATE TYPE ponto.afd_import_status AS ENUM (
    'PENDING',
    'PROCESSED',
    'REJECTED'
);

CREATE TYPE ponto.biometric_kind AS ENUM (
    'FINGERPRINT',
    'PALM_VEIN'
);

CREATE TYPE ponto.biometric_template_status AS ENUM (
    'ACTIVE',
    'REVOKED',
    'EXPIRED'
);

CREATE TYPE ponto.duty_roster_status AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'LOCKED'
);

CREATE TYPE ponto.face_match_decision AS ENUM (
    'ACCEPT',
    'REJECT',
    'MANUAL_REVIEW'
);

CREATE TYPE ponto.face_template_status AS ENUM (
    'ACTIVE',
    'REVOKED',
    'EXPIRED'
);

CREATE TYPE ponto.hour_bank_movement_kind AS ENUM (
    'ACCRUAL_POSITIVE',
    'ACCRUAL_NEGATIVE',
    'COMPENSATION',
    'SETTLEMENT_OVERTIME',
    'SETTLEMENT_DEDUCTION',
    'MANUAL_ADJUSTMENT'
);

CREATE TYPE ponto.hour_bank_regime AS ENUM (
    'CLT_INDIVIDUAL',
    'CLT_COLETIVO',
    'ESTATUTARIO'
);

CREATE TYPE ponto.hour_bank_status AS ENUM (
    'ACTIVE',
    'SETTLED',
    'EXPIRED'
);

CREATE TYPE ponto.mobile_clock_in_result AS ENUM (
    'ACCEPTED',
    'OUT_OF_FENCE',
    'MOCK_DETECTED',
    'IMPOSSIBLE_VELOCITY',
    'LOW_PRECISION',
    'NO_GEOLOCATION_CONSENT'
);

CREATE TYPE ponto.mobile_platform AS ENUM (
    'IOS',
    'ANDROID'
);

CREATE TYPE ponto.rep_device_kind AS ENUM (
    'REP_P',
    'REP_A',
    'REP_C',
    'FINGERPRINT',
    'PALM_VEIN'
);

CREATE TYPE ponto.rep_device_status AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'DECOMMISSIONED'
);

CREATE TYPE ponto.rep_ingestion_status AS ENUM (
    'RECEIVED',
    'VALIDATING',
    'PROCESSED',
    'REJECTED'
);

CREATE TYPE ponto.shift_pattern_kind AS ENUM (
    'CLT_12X36',
    'CLT_6X1',
    'CLT_5X2',
    'PLANTAO_24X72',
    'CUSTOM'
);

CREATE TYPE ponto.time_record_source AS ENUM (
    'REP_P',
    'REP_A',
    'REP_C',
    'MANUAL_ADJUSTMENT',
    'MOBILE'
);

CREATE TYPE ponto.timesheet_period_status AS ENUM (
    'OPEN',
    'CLOSED',
    'LOCKED'
);

CREATE TYPE ponto.work_shift_kind AS ENUM (
    'FIXED',
    'FLEXIBLE',
    'SHIFT_12X36',
    'SHIFT_6X1',
    'OTHER'
);

CREATE TABLE ponto.absence_justification (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    absence_justification_id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    kind ponto.absence_justification_kind NOT NULL,
    absence_start timestamp with time zone NOT NULL,
    absence_end timestamp with time zone NOT NULL,
    status ponto.absence_justification_status DEFAULT 'REQUESTED'::ponto.absence_justification_status NOT NULL,
    reason text NOT NULL,
    attachment_id uuid,
    requested_by_user_id uuid NOT NULL,
    approved_by_user_id uuid,
    decided_at timestamp with time zone,
    payroll_treatment ponto.absence_payroll_treatment DEFAULT 'PAID'::ponto.absence_payroll_treatment NOT NULL,
    medical_leave_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT absence_justification_decision_chk CHECK ((((status = ANY (ARRAY['APPROVED'::ponto.absence_justification_status, 'REJECTED'::ponto.absence_justification_status])) AND (approved_by_user_id IS NOT NULL) AND (decided_at IS NOT NULL)) OR (status = ANY (ARRAY['REQUESTED'::ponto.absence_justification_status, 'CANCELLED'::ponto.absence_justification_status])))),
    CONSTRAINT absence_justification_period_chk CHECK ((absence_end >= absence_start))
);

CREATE TABLE ponto.afd_export (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    afd_export_id uuid DEFAULT gen_random_uuid() NOT NULL,
    rep_device_id uuid NOT NULL,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    file_sha256 bytea,
    line_count integer DEFAULT 0 NOT NULL,
    requested_by_user_id text,
    status ponto.afd_export_status DEFAULT 'GENERATING'::ponto.afd_export_status NOT NULL,
    object_store_key text NOT NULL,
    error_summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT afd_export_line_count_chk CHECK ((line_count >= 0)),
    CONSTRAINT afd_export_period_chk CHECK ((period_end >= period_start)),
    CONSTRAINT afd_export_sha_len_chk CHECK (((file_sha256 IS NULL) OR (length(file_sha256) = 32)))
);

CREATE TABLE ponto.afd_import (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    afd_import_id uuid DEFAULT gen_random_uuid() NOT NULL,
    rep_device_id uuid NOT NULL,
    file_name text NOT NULL,
    file_sha256 bytea NOT NULL,
    imported_at timestamp with time zone DEFAULT now() NOT NULL,
    line_count integer DEFAULT 0 NOT NULL,
    status ponto.afd_import_status DEFAULT 'PENDING'::ponto.afd_import_status NOT NULL,
    error_summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    object_store_key text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT afd_import_line_count_chk CHECK ((line_count >= 0)),
    CONSTRAINT afd_import_sha_len_chk CHECK ((length(file_sha256) = 32))
);

CREATE TABLE ponto.afd_import_line (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    afd_import_id uuid NOT NULL,
    rep_device_id uuid NOT NULL,
    line_no integer NOT NULL,
    nsr bigint NOT NULL,
    record_type character(1) NOT NULL,
    raw_line text NOT NULL,
    parsed jsonb DEFAULT '{}'::jsonb NOT NULL,
    recorded_at timestamp with time zone,
    time_record_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT afd_import_line_no_chk CHECK ((line_no > 0)),
    CONSTRAINT afd_import_line_nsr_chk CHECK ((nsr >= 0)),
    CONSTRAINT afd_import_line_type_chk CHECK ((record_type ~ '^[1-9]$'::text))
);

CREATE TABLE ponto.biometric_consent (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    consent_version text NOT NULL,
    consent_at timestamp with time zone DEFAULT now() NOT NULL,
    withdrawn_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT biometric_consent_version_chk CHECK ((NULLIF(consent_version, ''::text) IS NOT NULL))
);

CREATE TABLE ponto.biometric_match (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    time_record_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    kind ponto.biometric_kind NOT NULL,
    score numeric(18,6) NOT NULL,
    threshold numeric(18,6) NOT NULL,
    device_id uuid,
    matched boolean NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT biometric_match_score_chk CHECK (((score >= (0)::numeric) AND (score <= (1)::numeric))),
    CONSTRAINT biometric_match_threshold_chk CHECK (((threshold >= (0)::numeric) AND (threshold <= (1)::numeric)))
);

CREATE TABLE ponto.day_schedule (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    day_schedule_id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_shift_id uuid NOT NULL,
    weekday smallint NOT NULL,
    entry_time time without time zone,
    lunch_out time without time zone,
    lunch_in time without time zone,
    exit_time time without time zone,
    total_minutes integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT day_schedule_total_minutes_chk CHECK ((total_minutes >= 0)),
    CONSTRAINT day_schedule_weekday_chk CHECK (((weekday >= 0) AND (weekday <= 6)))
);

CREATE TABLE ponto.duty_roster (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    duty_roster_id uuid DEFAULT gen_random_uuid() NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    status ponto.duty_roster_status DEFAULT 'DRAFT'::ponto.duty_roster_status NOT NULL,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT duty_roster_period_chk CHECK ((period_end >= period_start))
);

CREATE TABLE ponto.duty_roster_entry (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    duty_roster_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    work_date date NOT NULL,
    expected_entry timestamp with time zone,
    expected_exit timestamp with time zone,
    expected_minutes integer DEFAULT 0 NOT NULL,
    night_shift_flag boolean DEFAULT false NOT NULL,
    hazard_flag boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT duty_roster_entry_minutes_chk CHECK ((expected_minutes >= 0))
);

CREATE TABLE ponto.employee_biometric_template (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    kind ponto.biometric_kind NOT NULL,
    template_cipher bytea NOT NULL,
    template_kms_key_id text NOT NULL,
    quality_score numeric(18,6) NOT NULL,
    captured_at timestamp with time zone DEFAULT now() NOT NULL,
    status ponto.biometric_template_status DEFAULT 'ACTIVE'::ponto.biometric_template_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT employee_biometric_template_kms_chk CHECK ((NULLIF(template_kms_key_id, ''::text) IS NOT NULL)),
    CONSTRAINT employee_biometric_template_quality_chk CHECK (((quality_score >= (0)::numeric) AND (quality_score <= (1)::numeric)))
);

CREATE TABLE ponto.employee_face_template (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    embedding_cipher bytea NOT NULL,
    embedding_kms_key_id text NOT NULL,
    model_id text NOT NULL,
    model_version text NOT NULL,
    captured_at timestamp with time zone DEFAULT now() NOT NULL,
    status ponto.face_template_status DEFAULT 'ACTIVE'::ponto.face_template_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT employee_face_template_kms_chk CHECK ((NULLIF(embedding_kms_key_id, ''::text) IS NOT NULL)),
    CONSTRAINT employee_face_template_model_chk CHECK (((NULLIF(model_id, ''::text) IS NOT NULL) AND (NULLIF(model_version, ''::text) IS NOT NULL)))
);

CREATE TABLE ponto.employee_schedule_assignment (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    assignment_id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    work_schedule_id uuid NOT NULL,
    valid_from date NOT NULL,
    valid_to date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT employee_schedule_assignment_valid_range_chk CHECK (((valid_to IS NULL) OR (valid_to >= valid_from)))
);

CREATE TABLE ponto.face_consent (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    consent_version text NOT NULL,
    consent_at timestamp with time zone DEFAULT now() NOT NULL,
    withdrawn_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT face_consent_version_chk CHECK ((NULLIF(consent_version, ''::text) IS NOT NULL))
);

CREATE TABLE ponto.face_match (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    time_record_id uuid,
    employee_id uuid NOT NULL,
    score numeric(18,6) NOT NULL,
    threshold numeric(18,6) NOT NULL,
    liveness_passed boolean DEFAULT false NOT NULL,
    decision ponto.face_match_decision NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    device_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT face_match_accept_chk CHECK ((((decision = 'ACCEPT'::ponto.face_match_decision) AND (liveness_passed = true)) OR (decision <> 'ACCEPT'::ponto.face_match_decision))),
    CONSTRAINT face_match_score_chk CHECK (((score >= (0)::numeric) AND (score <= (1)::numeric))),
    CONSTRAINT face_match_threshold_chk CHECK (((threshold >= (0)::numeric) AND (threshold <= (1)::numeric)))
);

CREATE TABLE ponto.face_threshold_config (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    threshold numeric(18,6) DEFAULT 0.700000 NOT NULL,
    liveness_required boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT face_threshold_config_threshold_chk CHECK (((threshold >= (0)::numeric) AND (threshold <= (1)::numeric)))
);

CREATE TABLE ponto.hour_bank (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    hour_bank_id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    regime ponto.hour_bank_regime NOT NULL,
    opened_at date NOT NULL,
    expires_at date NOT NULL,
    balance_minutes integer DEFAULT 0 NOT NULL,
    status ponto.hour_bank_status DEFAULT 'ACTIVE'::ponto.hour_bank_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT hour_bank_period_chk CHECK ((expires_at >= opened_at))
);

CREATE TABLE ponto.hour_bank_movement (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    hour_bank_movement_id uuid DEFAULT gen_random_uuid() NOT NULL,
    hour_bank_id uuid NOT NULL,
    work_date date NOT NULL,
    kind ponto.hour_bank_movement_kind NOT NULL,
    minutes integer NOT NULL,
    source_time_record_ids uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by_user_id uuid,
    payroll_run_id uuid,
    CONSTRAINT hour_bank_movement_minutes_chk CHECK ((minutes <> 0))
);

CREATE TABLE ponto.mobile_clock_in_attempt (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    occurred_at timestamp with time zone NOT NULL,
    lat numeric(18,6) NOT NULL,
    lon numeric(18,6) NOT NULL,
    gps_precision_m numeric(18,6) NOT NULL,
    mock_location boolean DEFAULT false NOT NULL,
    device_id text NOT NULL,
    work_location_id uuid,
    result ponto.mobile_clock_in_result NOT NULL,
    time_record_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mobile_clock_in_attempt_accept_record_chk CHECK ((((result = 'ACCEPTED'::ponto.mobile_clock_in_result) AND (time_record_id IS NOT NULL)) OR ((result <> 'ACCEPTED'::ponto.mobile_clock_in_result) AND (time_record_id IS NULL)))),
    CONSTRAINT mobile_clock_in_attempt_device_chk CHECK ((NULLIF(device_id, ''::text) IS NOT NULL)),
    CONSTRAINT mobile_clock_in_attempt_lat_chk CHECK (((lat >= ('-90'::integer)::numeric) AND (lat <= (90)::numeric))),
    CONSTRAINT mobile_clock_in_attempt_lon_chk CHECK (((lon >= ('-180'::integer)::numeric) AND (lon <= (180)::numeric))),
    CONSTRAINT mobile_clock_in_attempt_precision_chk CHECK ((gps_precision_m >= (0)::numeric))
);

CREATE TABLE ponto.mobile_device_registration (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    device_id text NOT NULL,
    platform ponto.mobile_platform NOT NULL,
    public_key text NOT NULL,
    registered_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mobile_device_registration_device_chk CHECK ((NULLIF(device_id, ''::text) IS NOT NULL)),
    CONSTRAINT mobile_device_registration_public_key_chk CHECK ((NULLIF(public_key, ''::text) IS NOT NULL))
);

CREATE TABLE ponto.mobile_geolocation_consent (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    consent_version text NOT NULL,
    consent_at timestamp with time zone DEFAULT now() NOT NULL,
    withdrawn_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mobile_geolocation_consent_version_chk CHECK ((NULLIF(consent_version, ''::text) IS NOT NULL))
);

CREATE TABLE ponto.payroll_bridge_event (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    payroll_bridge_event_id uuid DEFAULT gen_random_uuid() NOT NULL,
    payroll_run_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    timesheet_period_id uuid NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_lines jsonb NOT NULL,
    CONSTRAINT payroll_bridge_event_lines_array_chk CHECK ((jsonb_typeof(applied_lines) = 'array'::text))
);

CREATE TABLE ponto.rep_device (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    rep_device_id uuid DEFAULT gen_random_uuid() NOT NULL,
    kind ponto.rep_device_kind NOT NULL,
    serial_number text,
    employer_tax_id text NOT NULL,
    manufacturer text,
    model text,
    program_hash text,
    registered_at timestamp with time zone DEFAULT now() NOT NULL,
    status ponto.rep_device_status DEFAULT 'ACTIVE'::ponto.rep_device_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rep_device_employer_tax_id_chk CHECK ((employer_tax_id ~ '^[0-9]{11}([0-9]{3})?$'::text)),
    CONSTRAINT rep_device_program_hash_chk CHECK (((kind <> 'REP_P'::ponto.rep_device_kind) OR (NULLIF(program_hash, ''::text) IS NOT NULL))),
    CONSTRAINT rep_device_serial_chk CHECK (((kind <> 'REP_C'::ponto.rep_device_kind) OR (NULLIF(serial_number, ''::text) IS NOT NULL)))
);

CREATE TABLE ponto.rep_ingestion_batch (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    batch_id uuid DEFAULT gen_random_uuid() NOT NULL,
    rep_device_id uuid NOT NULL,
    kind ponto.rep_device_kind NOT NULL,
    file_name text,
    file_sha256 text NOT NULL,
    raw_file text DEFAULT ''::text NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone,
    status ponto.rep_ingestion_status DEFAULT 'RECEIVED'::ponto.rep_ingestion_status NOT NULL,
    error_summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rep_ingestion_batch_sha_chk CHECK ((file_sha256 ~ '^[a-f0-9]{64}$'::text))
);

CREATE TABLE ponto.rep_ingestion_line (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    batch_id uuid NOT NULL,
    rep_device_id uuid NOT NULL,
    line_no integer NOT NULL,
    nsr bigint NOT NULL,
    raw_line text NOT NULL,
    parsed jsonb DEFAULT '{}'::jsonb NOT NULL,
    time_record_id uuid,
    dedup_key text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rep_ingestion_line_line_no_chk CHECK ((line_no > 0)),
    CONSTRAINT rep_ingestion_line_nsr_chk CHECK ((nsr > 0))
);

CREATE TABLE ponto.shift_assignment (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    shift_assignment_id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    shift_pattern_id uuid NOT NULL,
    anchor_date date NOT NULL,
    valid_from date NOT NULL,
    valid_to date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT shift_assignment_valid_range_chk CHECK (((valid_to IS NULL) OR (valid_to >= valid_from)))
);

CREATE TABLE ponto.shift_pattern (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    shift_pattern_id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    cycle_days integer NOT NULL,
    kind ponto.shift_pattern_kind NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT shift_pattern_cycle_days_chk CHECK ((cycle_days > 0))
);

CREATE TABLE ponto.shift_pattern_day (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    shift_pattern_id uuid NOT NULL,
    day_index integer NOT NULL,
    is_working boolean NOT NULL,
    entry_time time without time zone,
    exit_time time without time zone,
    lunch_minutes integer,
    night_shift_flag boolean DEFAULT false NOT NULL,
    hazard_flag boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT shift_pattern_day_index_chk CHECK ((day_index >= 0)),
    CONSTRAINT shift_pattern_day_lunch_chk CHECK (((lunch_minutes IS NULL) OR (lunch_minutes >= 0))),
    CONSTRAINT shift_pattern_day_working_times_chk CHECK (((is_working AND (entry_time IS NOT NULL) AND (exit_time IS NOT NULL)) OR (NOT is_working)))
);

CREATE TABLE ponto.time_record (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    time_record_id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    recorded_at timestamp with time zone NOT NULL,
    source ponto.time_record_source NOT NULL,
    nsr bigint NOT NULL,
    prev_hash bytea,
    record_hash bytea NOT NULL,
    raw_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT time_record_hash_len_chk CHECK ((length(record_hash) = 32)),
    CONSTRAINT time_record_prev_hash_len_chk CHECK (((prev_hash IS NULL) OR (length(prev_hash) = 32)))
);

CREATE TABLE ponto.time_record_justification_link (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    time_record_id uuid NOT NULL,
    absence_justification_id uuid CONSTRAINT time_record_justification_lin_absence_justification_id_not_null NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE ponto.timesheet_period (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    timesheet_period_id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    status ponto.timesheet_period_status DEFAULT 'OPEN'::ponto.timesheet_period_status NOT NULL,
    worked_minutes integer DEFAULT 0 NOT NULL,
    overtime_50_minutes integer DEFAULT 0 NOT NULL,
    overtime_100_minutes integer DEFAULT 0 NOT NULL,
    night_minutes integer DEFAULT 0 NOT NULL,
    absence_minutes integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT timesheet_period_minutes_chk CHECK (((worked_minutes >= 0) AND (overtime_50_minutes >= 0) AND (overtime_100_minutes >= 0) AND (night_minutes >= 0) AND (absence_minutes >= 0))),
    CONSTRAINT timesheet_period_range_chk CHECK ((period_end >= period_start))
);

CREATE TABLE ponto.work_schedule (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    work_schedule_id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    weekly_hours numeric(5,2) NOT NULL,
    tolerance_minutes integer DEFAULT 0 NOT NULL,
    status public."RecordStatus" DEFAULT 'ACTIVE'::public."RecordStatus" NOT NULL,
    valid_from date NOT NULL,
    valid_to date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT work_schedule_tolerance_chk CHECK ((tolerance_minutes >= 0)),
    CONSTRAINT work_schedule_valid_range_chk CHECK (((valid_to IS NULL) OR (valid_to >= valid_from))),
    CONSTRAINT work_schedule_weekly_hours_chk CHECK ((weekly_hours > (0)::numeric))
);

CREATE TABLE ponto.work_shift (
    tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
    work_shift_id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_schedule_id uuid NOT NULL,
    code text NOT NULL,
    kind ponto.work_shift_kind NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY ponto.absence_justification
    ADD CONSTRAINT absence_justification_pkey PRIMARY KEY (absence_justification_id);

ALTER TABLE ONLY ponto.absence_justification
    ADD CONSTRAINT absence_justification_tenant_uq UNIQUE (tenant_id, absence_justification_id);

ALTER TABLE ONLY ponto.afd_export
    ADD CONSTRAINT afd_export_object_store_key_uq UNIQUE (tenant_id, object_store_key);

ALTER TABLE ONLY ponto.afd_export
    ADD CONSTRAINT afd_export_pkey PRIMARY KEY (afd_export_id);

ALTER TABLE ONLY ponto.afd_import_line
    ADD CONSTRAINT afd_import_line_pkey PRIMARY KEY (afd_import_id, line_no);

ALTER TABLE ONLY ponto.afd_import
    ADD CONSTRAINT afd_import_object_store_key_uq UNIQUE (tenant_id, object_store_key);

ALTER TABLE ONLY ponto.afd_import
    ADD CONSTRAINT afd_import_pkey PRIMARY KEY (afd_import_id);

ALTER TABLE ONLY ponto.biometric_consent
    ADD CONSTRAINT biometric_consent_pkey PRIMARY KEY (id);

ALTER TABLE ONLY ponto.biometric_match
    ADD CONSTRAINT biometric_match_pkey PRIMARY KEY (id);

ALTER TABLE ONLY ponto.day_schedule
    ADD CONSTRAINT day_schedule_pkey PRIMARY KEY (day_schedule_id);

ALTER TABLE ONLY ponto.day_schedule
    ADD CONSTRAINT day_schedule_shift_weekday_uq UNIQUE (tenant_id, work_shift_id, weekday);

ALTER TABLE ONLY ponto.duty_roster_entry
    ADD CONSTRAINT duty_roster_entry_pkey PRIMARY KEY (duty_roster_id, employee_id, work_date);

ALTER TABLE ONLY ponto.duty_roster
    ADD CONSTRAINT duty_roster_pkey PRIMARY KEY (duty_roster_id);

ALTER TABLE ONLY ponto.employee_biometric_template
    ADD CONSTRAINT employee_biometric_template_pkey PRIMARY KEY (id);

ALTER TABLE ONLY ponto.employee_face_template
    ADD CONSTRAINT employee_face_template_pkey PRIMARY KEY (id);

ALTER TABLE ONLY ponto.employee_schedule_assignment
    ADD CONSTRAINT employee_schedule_assignment_pkey PRIMARY KEY (assignment_id);

ALTER TABLE ONLY ponto.face_consent
    ADD CONSTRAINT face_consent_pkey PRIMARY KEY (id);

ALTER TABLE ONLY ponto.face_match
    ADD CONSTRAINT face_match_pkey PRIMARY KEY (id);

ALTER TABLE ONLY ponto.face_threshold_config
    ADD CONSTRAINT face_threshold_config_pkey PRIMARY KEY (tenant_id);

ALTER TABLE ONLY ponto.hour_bank_movement
    ADD CONSTRAINT hour_bank_movement_pkey PRIMARY KEY (hour_bank_movement_id);

ALTER TABLE ONLY ponto.hour_bank
    ADD CONSTRAINT hour_bank_pkey PRIMARY KEY (hour_bank_id);

ALTER TABLE ONLY ponto.hour_bank
    ADD CONSTRAINT hour_bank_tenant_bank_uq UNIQUE (tenant_id, hour_bank_id);

ALTER TABLE ONLY ponto.mobile_clock_in_attempt
    ADD CONSTRAINT mobile_clock_in_attempt_pkey PRIMARY KEY (id);

ALTER TABLE ONLY ponto.mobile_device_registration
    ADD CONSTRAINT mobile_device_registration_employee_device_uq UNIQUE (tenant_id, employee_id, device_id);

ALTER TABLE ONLY ponto.mobile_device_registration
    ADD CONSTRAINT mobile_device_registration_pkey PRIMARY KEY (id);

ALTER TABLE ONLY ponto.mobile_geolocation_consent
    ADD CONSTRAINT mobile_geolocation_consent_pkey PRIMARY KEY (id);

ALTER TABLE ONLY ponto.payroll_bridge_event
    ADD CONSTRAINT payroll_bridge_event_idempotency_uq UNIQUE (tenant_id, payroll_run_id, employee_id, timesheet_period_id);

ALTER TABLE ONLY ponto.payroll_bridge_event
    ADD CONSTRAINT payroll_bridge_event_pkey PRIMARY KEY (payroll_bridge_event_id);

ALTER TABLE ONLY ponto.payroll_bridge_event
    ADD CONSTRAINT payroll_bridge_event_tenant_uq UNIQUE (tenant_id, payroll_bridge_event_id);

ALTER TABLE ONLY ponto.rep_device
    ADD CONSTRAINT rep_device_pkey PRIMARY KEY (rep_device_id);

ALTER TABLE ONLY ponto.rep_ingestion_batch
    ADD CONSTRAINT rep_ingestion_batch_pkey PRIMARY KEY (batch_id);

ALTER TABLE ONLY ponto.rep_ingestion_line
    ADD CONSTRAINT rep_ingestion_line_device_nsr_uq UNIQUE (tenant_id, rep_device_id, nsr);

ALTER TABLE ONLY ponto.rep_ingestion_line
    ADD CONSTRAINT rep_ingestion_line_pkey PRIMARY KEY (batch_id, line_no);

ALTER TABLE ONLY ponto.shift_assignment
    ADD CONSTRAINT shift_assignment_pkey PRIMARY KEY (shift_assignment_id);

ALTER TABLE ONLY ponto.shift_pattern_day
    ADD CONSTRAINT shift_pattern_day_pkey PRIMARY KEY (shift_pattern_id, day_index);

ALTER TABLE ONLY ponto.shift_pattern
    ADD CONSTRAINT shift_pattern_pkey PRIMARY KEY (shift_pattern_id);

ALTER TABLE ONLY ponto.shift_pattern
    ADD CONSTRAINT shift_pattern_tenant_code_uq UNIQUE (tenant_id, code);

ALTER TABLE ONLY ponto.time_record_justification_link
    ADD CONSTRAINT time_record_justification_link_pkey PRIMARY KEY (tenant_id, time_record_id, absence_justification_id);

ALTER TABLE ONLY ponto.time_record
    ADD CONSTRAINT time_record_pkey PRIMARY KEY (time_record_id);

ALTER TABLE ONLY ponto.time_record
    ADD CONSTRAINT time_record_tenant_employee_nsr_uq UNIQUE (tenant_id, employee_id, nsr);

ALTER TABLE ONLY ponto.timesheet_period
    ADD CONSTRAINT timesheet_period_employee_range_uq UNIQUE (tenant_id, employee_id, period_start, period_end);

ALTER TABLE ONLY ponto.timesheet_period
    ADD CONSTRAINT timesheet_period_pkey PRIMARY KEY (timesheet_period_id);

ALTER TABLE ONLY ponto.work_schedule
    ADD CONSTRAINT work_schedule_pkey PRIMARY KEY (work_schedule_id);

ALTER TABLE ONLY ponto.work_schedule
    ADD CONSTRAINT work_schedule_tenant_code_uq UNIQUE (tenant_id, code);

ALTER TABLE ONLY ponto.work_shift
    ADD CONSTRAINT work_shift_pkey PRIMARY KEY (work_shift_id);

ALTER TABLE ONLY ponto.work_shift
    ADD CONSTRAINT work_shift_tenant_code_uq UNIQUE (tenant_id, code);
