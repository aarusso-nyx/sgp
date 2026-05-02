CREATE TYPE payment.consignment_entity_kind AS ENUM (
    'BANK',
    'COOPERATIVE',
    'UNION',
    'ASSOCIATION'
);

CREATE TYPE payment.consignment_loan_kind AS ENUM (
    'PAYROLL_LOAN',
    'CARD',
    'OTHER'
);

CREATE TYPE payment.consignment_loan_status AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'TERMINATED',
    'TRANSFERRED'
);

CREATE TYPE payment.consignment_portability_detail_status AS ENUM (
    'MATCHED',
    'UNMATCHED',
    'REJECTED'
);

CREATE TYPE payment.consignment_portability_file_status AS ENUM (
    'RECEIVED',
    'PROCESSING',
    'PROCESSED',
    'FAILED'
);

CREATE TYPE payment.consignment_status AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'TERMINATED'
);

CREATE TYPE payment.dirf_beneficiary_kind AS ENUM (
    'CPF',
    'CNPJ',
    'EXTERIOR'
);

CREATE TYPE payment.fgts_account_status AS ENUM (
    'ACTIVE',
    'CLOSED'
);

CREATE TYPE payment.fgts_movement_kind AS ENUM (
    'DEPOSIT_8',
    'DEPOSIT_AVISO',
    'RESCISION_FINE_40',
    'ADJUSTMENT'
);

CREATE TYPE payment.fgts_remittance_kind AS ENUM (
    'GRF_MONTHLY',
    'GRRF_TERMINATION'
);

CREATE TYPE payment.fgts_remittance_status AS ENUM (
    'DRAFT',
    'GENERATED',
    'SENT',
    'PAID',
    'REJECTED'
);

CREATE TYPE payment.fgts_source_event AS ENUM (
    'MONTHLY',
    'TERMINATION'
);

CREATE TYPE payment.pis_pasep_program AS ENUM (
    'PIS',
    'PASEP'
);

CREATE TYPE payment.prior_notice_kind AS ENUM (
    'WORKED',
    'INDEMNIFIED',
    'NONE'
);

CREATE TYPE payment.prior_notice_reduction_mode AS ENUM (
    'TWO_HOURS_DAY',
    'SEVEN_FINAL_DAYS',
    'NONE'
);
