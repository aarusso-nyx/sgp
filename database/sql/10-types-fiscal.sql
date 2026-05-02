CREATE TYPE fiscal.dctfweb_declaration_kind AS ENUM (
    'ORIGINAL',
    'RETIFICADORA'
);

CREATE TYPE fiscal.dctfweb_declaration_status AS ENUM (
    'DRAFT',
    'SIGNED',
    'TRANSMITTED',
    'ACCEPTED',
    'REJECTED'
);

CREATE TYPE fiscal.dctfweb_source_event AS ENUM (
    'S5011',
    'S5012',
    'S5013'
);

CREATE TYPE fiscal.dirf_arquivo_kind AS ENUM (
    'ORIGINAL',
    'RETIFICADORA'
);

CREATE TYPE fiscal.dirf_arquivo_status AS ENUM (
    'DRAFT',
    'GENERATED',
    'VALIDATED',
    'TRANSMITTED'
);

CREATE TYPE fiscal.gps_payment_code_scope AS ENUM (
    'EMPLOYER',
    'EMPLOYEE',
    'BOTH'
);

CREATE TYPE fiscal.gps_remittance_reason AS ENUM (
    'TRANSITION',
    'RETROACTIVE',
    'MALHA_FINA'
);

CREATE TYPE fiscal.gps_remittance_status AS ENUM (
    'DRAFT',
    'GENERATED',
    'PAID',
    'CANCELLED'
);
