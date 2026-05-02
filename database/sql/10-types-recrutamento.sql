CREATE TYPE recrutamento.banca_cert_kind AS ENUM (
    'ICP_A1',
    'ICP_A3',
    'GOVBR_OURO',
    'GOVBR_PRATA'
);

CREATE TYPE recrutamento.banca_membro_role AS ENUM (
    'PRESIDENTE',
    'MEMBRO',
    'SECRETARIO'
);

CREATE TYPE recrutamento.biometric_kind AS ENUM (
    'FINGERPRINT',
    'FACE'
);

CREATE TYPE recrutamento.biometric_match_decision AS ENUM (
    'ACCEPT',
    'REJECT',
    'MANUAL_REVIEW'
);

CREATE TYPE recrutamento.biometric_status AS ENUM (
    'ACTIVE',
    'REVOKED',
    'EXPIRED'
);

CREATE TYPE recrutamento.classificacao_snapshot_status AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'SUPERSEDED'
);

CREATE TYPE recrutamento.concurso_status AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'OPEN',
    'CLOSED',
    'CANCELLED',
    'HOMOLOGATED'
);

CREATE TYPE recrutamento.convocacao_channel AS ENUM (
    'PUBLICACAO_OFICIAL',
    'EMAIL',
    'POSTAL'
);

CREATE TYPE recrutamento.exemption_kind AS ENUM (
    'NONE',
    'CADUNICO',
    'BONE_MARROW_DONOR'
);

CREATE TYPE recrutamento.gabarito_status AS ENUM (
    'PRELIMINARY',
    'FINAL',
    'SUPERSEDED'
);

CREATE TYPE recrutamento.inscricao_status AS ENUM (
    'DRAFT',
    'PENDING_PAYMENT',
    'EXEMPT',
    'CONFIRMED',
    'CANCELLED'
);

CREATE TYPE recrutamento.nomeacao_status AS ENUM (
    'NOMEADO',
    'CONVOCADO',
    'POSSE_EM_ANDAMENTO',
    'POSSE',
    'EXERCICIO',
    'DESISTENTE',
    'EXONERADO_POR_NAO_POSSE'
);

CREATE TYPE recrutamento.online_exam_session_status AS ENUM (
    'SCHEDULED',
    'IN_PROGRESS',
    'SUBMITTED',
    'VOIDED',
    'RESCHEDULED'
);

CREATE TYPE recrutamento.payment_charge_status AS ENUM (
    'OPEN',
    'PAID',
    'EXPIRED',
    'CANCELLED'
);

CREATE TYPE recrutamento.payment_gateway_kind AS ENUM (
    'BOLETO',
    'PIX',
    'OTHER'
);

CREATE TYPE recrutamento.posse_status AS ENUM (
    'AGENDADA',
    'POSSE_REALIZADA',
    'EXERCICIO',
    'PRORROGADA',
    'CANCELADA'
);

CREATE TYPE recrutamento.proctoring_artifact_kind AS ENUM (
    'SNAPSHOT',
    'AUDIO_CHUNK',
    'SCREEN_FRAME'
);

CREATE TYPE recrutamento.proctoring_event_kind AS ENUM (
    'SNAPSHOT',
    'AUDIO_FLAG',
    'GAZE_OFF_SCREEN',
    'SCREEN_SHARE_LOST',
    'PROHIBITED_APP',
    'LIVENESS_FAIL',
    'VOICE_MISMATCH'
);

CREATE TYPE recrutamento.proctoring_reviewer_decision AS ENUM (
    'PENDING',
    'ACCEPT',
    'REJECT'
);

CREATE TYPE recrutamento.proctoring_severity AS ENUM (
    'INFO',
    'WARN',
    'SEVERE'
);

CREATE TYPE recrutamento.prova_kind AS ENUM (
    'OBJETIVA',
    'DISCURSIVA',
    'PRATICA',
    'TITULOS'
);

CREATE TYPE recrutamento.recurso_status AS ENUM (
    'OPEN',
    'UPHELD',
    'REJECTED'
);

CREATE TYPE recrutamento.signed_document_format AS ENUM (
    'XADES',
    'PADES'
);

CREATE TYPE recrutamento.signed_document_kind AS ENUM (
    'GABARITO',
    'ATA_BANCA',
    'LISTA_APROVADOS',
    'OUTRO'
);

CREATE TYPE recrutamento.signed_document_status AS ENUM (
    'DRAFT',
    'PARTIALLY_SIGNED',
    'SIGNED',
    'PUBLISHED'
);
