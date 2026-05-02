CREATE TYPE esocial.certificate_kind AS ENUM (
    'A1',
    'A3'
);

CREATE TYPE esocial.certificate_status AS ENUM (
    'ACTIVE',
    'REVOKED',
    'EXPIRED'
);

CREATE TYPE esocial.endpoint_circuit_state_status AS ENUM (
    'CLOSED',
    'HALF_OPEN',
    'OPEN'
);

CREATE TYPE esocial.es03_pending_status AS ENUM (
    'PENDING',
    'EMITTED'
);

CREATE TYPE esocial.esocial_totalizer_kind AS ENUM (
    'S-5001',
    'S-5002',
    'S-5003',
    'S-5011',
    'S-5012',
    'S-5013'
);

CREATE TYPE esocial.response_classification_class AS ENUM (
    'ACCEPTED',
    'RECOVERABLE',
    'DEFINITIVE'
);

CREATE TYPE esocial.s1299_emission_status AS ENUM (
    'PENDING',
    'EMITTED',
    'ACCEPTED',
    'REJECTED'
);

CREATE TYPE esocial.s1xxx_event_kind AS ENUM (
    'S-1000',
    'S-1005',
    'S-1010',
    'S-1020',
    'S-1050',
    'S-1070',
    'S-2200',
    'S-2205',
    'S-2230',
    'S-2299',
    'S-3000',
    'S-1200',
    'S-1210',
    'S-1299',
    'S-2220',
    'S-2210',
    'S-2240',
    'S-2306',
    'S-2298'
);

CREATE TYPE esocial.s2230_pending_kind AS ENUM (
    'LEAVE',
    'VACATION'
);

CREATE TYPE esocial.s2230_trigger_event AS ENUM (
    'START',
    'END',
    'EXTENSION'
);

CREATE TYPE esocial.s2240_trigger_event AS ENUM (
    'START',
    'END',
    'CHANGE'
);

CREATE TYPE esocial.s2298_event_status AS ENUM (
    'DRAFT',
    'TRANSMITTED',
    'ACCEPTED',
    'REJECTED'
);

CREATE TYPE esocial.s2306_event_status AS ENUM (
    'DRAFT',
    'TRANSMITTED',
    'ACCEPTED',
    'REJECTED'
);

CREATE TYPE esocial.s3000_request_status AS ENUM (
    'PENDING',
    'EMITTED',
    'ACCEPTED',
    'REJECTED',
    'BLOCKED'
);

CREATE TYPE esocial.submission_batch_status AS ENUM (
    'PENDING',
    'SENT',
    'ACCEPTED',
    'REJECTED',
    'TIMEOUT',
    'RETRY'
);

CREATE TYPE esocial.submission_environment AS ENUM (
    'PRODUCTION',
    'QUALIFICATION'
);
