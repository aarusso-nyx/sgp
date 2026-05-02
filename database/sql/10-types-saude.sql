CREATE TYPE saude.aso_conclusion AS ENUM (
    'APTO',
    'INAPTO',
    'APTO_RESTRICAO'
);

CREATE TYPE saude.aso_kind AS ENUM (
    'ADMISSIONAL',
    'PERIODICO',
    'RETORNO_TRABALHO',
    'MUDANCA_FUNCAO',
    'DEMISSIONAL'
);

CREATE TYPE saude.aso_status AS ENUM (
    'SCHEDULED',
    'PERFORMED',
    'ARCHIVED',
    'CANCELLED'
);

CREATE TYPE saude.cat_kind AS ENUM (
    'INICIAL',
    'REABERTURA',
    'OBITO'
);

CREATE TYPE saude.epi_signature_method AS ENUM (
    'FISICA',
    'DIGITAL',
    'GOVBR'
);

CREATE TYPE saude.harmful_agent_kind AS ENUM (
    'FISICO',
    'QUIMICO',
    'BIOLOGICO',
    'ERGONOMICO',
    'ACIDENTE'
);

CREATE TYPE saude.health_program_kind AS ENUM (
    'PCMSO'
);

CREATE TYPE saude.medical_exam_type AS ENUM (
    'CLINICO',
    'LABORATORIAL',
    'COMPLEMENTAR',
    'IMAGEM'
);

CREATE TYPE saude.program_parent_kind AS ENUM (
    'PCMSO',
    'PGR'
);

CREATE TYPE saude.program_status AS ENUM (
    'DRAFT',
    'ACTIVE',
    'SUPERSEDED',
    'ARCHIVED'
);

CREATE TYPE saude.risk_management_program_kind AS ENUM (
    'PGR'
);

CREATE TYPE saude.work_accident_severity AS ENUM (
    'LEVE',
    'GRAVE',
    'FATAL'
);

CREATE TYPE saude.work_accident_status AS ENUM (
    'REGISTRADO',
    'COMUNICADO',
    'REABERTO',
    'COMUNICACAO_OBITO',
    'ENCERRADO'
);

CREATE TYPE saude.work_accident_type AS ENUM (
    'TIPICO',
    'TRAJETO',
    'DOENCA_OCUPACIONAL'
);
