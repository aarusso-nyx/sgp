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
