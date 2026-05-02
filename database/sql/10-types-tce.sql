CREATE TYPE tce.adapter_circuit_state_status AS ENUM (
    'CLOSED',
    'HALF_OPEN',
    'OPEN'
);

CREATE TYPE tce.adapter_lifecycle_event_kind AS ENUM (
    'REGISTERED',
    'ENABLED',
    'DISABLED',
    'VALIDATION_OK',
    'VALIDATION_FAIL',
    'SUBMISSION_OK',
    'SUBMISSION_FAIL',
    'HEALTH_OK',
    'HEALTH_FAIL'
);

CREATE TYPE tce.adapter_status AS ENUM (
    'REGISTERED',
    'ENABLED',
    'DISABLED',
    'DEPRECATED'
);

CREATE TYPE tce.layout_field_data_type AS ENUM (
    'STRING',
    'INT',
    'DECIMAL',
    'DATE',
    'DATETIME',
    'BOOLEAN',
    'ENUM',
    'XML_NODE'
);

CREATE TYPE tce.layout_status AS ENUM (
    'DRAFT',
    'ACTIVE',
    'SUPERSEDED',
    'RETIRED'
);

CREATE TYPE tce.organ_kind AS ENUM (
    'TCE',
    'TCM',
    'TCU'
);

CREATE DOMAIN tce.semver AS text
	CONSTRAINT semver_check CHECK ((VALUE ~ '^[0-9]+[.][0-9]+[.][0-9]+([+-][0-9A-Za-z.-]+)?$'::text));

CREATE TYPE tce.state_sphere AS ENUM (
    'STATE',
    'FEDERAL_DISTRICT',
    'MUNICIPAL'
);

CREATE TYPE tce.submission_attempt_outcome AS ENUM (
    'SUCCESS',
    'TRANSIENT_FAIL',
    'DEFINITIVE_FAIL',
    'TIMEOUT',
    'CIRCUIT_OPEN'
);

CREATE TYPE tce.submission_error_kind AS ENUM (
    'TRANSIENT',
    'DEFINITIVE',
    'TIMEOUT',
    'VALIDATION'
);

CREATE TYPE tce.submission_queue_status AS ENUM (
    'PENDING',
    'LOCKED',
    'SUCCEEDED',
    'FAILED',
    'RETRY',
    'DEAD_LETTER'
);

CREATE TYPE tce.submission_status AS ENUM (
    'DRAFT',
    'VALIDATED',
    'SERIALIZED',
    'SUBMITTED',
    'ACCEPTED',
    'REJECTED',
    'STUB_OK',
    'STUB_FAIL'
);
