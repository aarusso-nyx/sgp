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

CREATE TABLE recrutamento.banca_membro (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    concurso_id uuid NOT NULL,
    full_name text NOT NULL,
    cpf text NOT NULL,
    role recrutamento.banca_membro_role NOT NULL,
    cert_kind recrutamento.banca_cert_kind NOT NULL,
    cert_subject_dn text,
    cert_serial text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT banca_membro_cpf_digits_check CHECK ((cpf ~ '^[0-9]{11}$'::text))
);

CREATE TABLE recrutamento.biometric_consent (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    candidato_id uuid NOT NULL,
    consent_version text NOT NULL,
    consent_at timestamp with time zone DEFAULT now() NOT NULL,
    signed_doc_ref text NOT NULL,
    withdrawn_at timestamp with time zone
);

CREATE TABLE recrutamento.biometric_match_attempt (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    candidato_id uuid NOT NULL,
    exam_session_id uuid,
    matched boolean NOT NULL,
    score numeric(18,6) NOT NULL,
    threshold numeric(18,6) NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    decision recrutamento.biometric_match_decision NOT NULL,
    CONSTRAINT biometric_match_attempt_score_check CHECK (((score >= (0)::numeric) AND (score <= (1)::numeric))),
    CONSTRAINT biometric_match_attempt_threshold_check CHECK (((threshold >= (0)::numeric) AND (threshold <= (1)::numeric)))
);

CREATE TABLE recrutamento.candidate_biometric (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    candidato_id uuid NOT NULL,
    kind recrutamento.biometric_kind NOT NULL,
    template_cipher bytea NOT NULL,
    template_kms_key_id text NOT NULL,
    quality_score numeric(18,6) NOT NULL,
    captured_at timestamp with time zone DEFAULT now() NOT NULL,
    capture_device_ref text NOT NULL,
    retention_until timestamp with time zone NOT NULL,
    status recrutamento.biometric_status DEFAULT 'ACTIVE'::recrutamento.biometric_status NOT NULL,
    CONSTRAINT candidate_biometric_quality_check CHECK (((quality_score >= (0)::numeric) AND (quality_score <= (1)::numeric)))
);

CREATE TABLE recrutamento.candidato (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cpf text NOT NULL,
    full_name text NOT NULL,
    birth_date date NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    address jsonb DEFAULT '{}'::jsonb NOT NULL,
    lgpd_consent_at timestamp with time zone NOT NULL,
    lgpd_consent_version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT candidato_cpf_digits_check CHECK ((cpf ~ '^[0-9]{11}$'::text))
);

CREATE TABLE recrutamento.classificacao_item (
    tenant_id uuid NOT NULL,
    snapshot_id uuid NOT NULL,
    vaga_id uuid NOT NULL,
    inscricao_id uuid NOT NULL,
    total_score numeric(18,6) NOT NULL,
    rank_general integer,
    rank_pcd integer,
    rank_racial integer,
    call_order integer,
    allocation_bucket text DEFAULT 'GENERAL'::text NOT NULL,
    eliminated_reason text,
    CONSTRAINT classificacao_item_allocation_bucket_check CHECK ((allocation_bucket = ANY (ARRAY['GENERAL'::text, 'PCD'::text, 'RACIAL'::text, 'INDIGENOUS'::text]))),
    CONSTRAINT classificacao_item_rank_check CHECK ((((eliminated_reason IS NULL) AND (rank_general IS NOT NULL)) OR ((eliminated_reason IS NOT NULL) AND (call_order IS NULL))))
);

CREATE TABLE recrutamento.classificacao_snapshot (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    concurso_id uuid NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    status recrutamento.classificacao_snapshot_status DEFAULT 'DRAFT'::recrutamento.classificacao_snapshot_status NOT NULL,
    tiebreak_rules jsonb DEFAULT jsonb_build_array(jsonb_build_object('kind', 'ELDERLY_PRIORITY', 'legalBasis', 'Lei 10.741/2003 art. 27 paragrafo unico'), jsonb_build_object('kind', 'OLDER_AGE'), jsonb_build_object('kind', 'INSCRICAO_ID')) NOT NULL
);

CREATE TABLE recrutamento.concurso (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    status recrutamento.concurso_status DEFAULT 'DRAFT'::recrutamento.concurso_status NOT NULL,
    valid_until date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by_user_id uuid
);

CREATE TABLE recrutamento.convocacao (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nomeacao_id uuid NOT NULL,
    channel recrutamento.convocacao_channel NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    evidence_ref text NOT NULL,
    CONSTRAINT convocacao_evidence_ref_check CHECK ((length(TRIM(BOTH FROM evidence_ref)) > 0))
);

CREATE TABLE recrutamento.document_signature (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    banca_membro_id uuid NOT NULL,
    signed_at timestamp with time zone DEFAULT now() NOT NULL,
    signature_value bytea NOT NULL,
    cert_chain bytea NOT NULL,
    ts_token bytea,
    signature_order integer NOT NULL,
    CONSTRAINT document_signature_order_positive CHECK ((signature_order > 0))
);

CREATE TABLE recrutamento.edital (
    tenant_id uuid NOT NULL,
    concurso_id uuid NOT NULL,
    version integer NOT NULL,
    document_ref text NOT NULL,
    administrative_act text NOT NULL,
    administrative_act_date date NOT NULL,
    published_at timestamp with time zone,
    public_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resource_deadline_at timestamp with time zone,
    CONSTRAINT edital_public_url_required_check CHECK (((published_at IS NULL) OR (public_url IS NOT NULL))),
    CONSTRAINT edital_version_positive_check CHECK ((version > 0))
);

CREATE TABLE recrutamento.gabarito (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prova_id uuid NOT NULL,
    version integer NOT NULL,
    status recrutamento.gabarito_status NOT NULL,
    published_at timestamp with time zone DEFAULT now() NOT NULL,
    answers jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT gabarito_version_positive_check CHECK ((version > 0))
);

CREATE TABLE recrutamento.inscricao (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    concurso_id uuid NOT NULL,
    vaga_id uuid NOT NULL,
    candidato_id uuid NOT NULL,
    status recrutamento.inscricao_status DEFAULT 'DRAFT'::recrutamento.inscricao_status NOT NULL,
    exemption_kind recrutamento.exemption_kind DEFAULT 'NONE'::recrutamento.exemption_kind NOT NULL,
    exemption_evidence_ref text,
    payment_charge_id text,
    access_token_hash text NOT NULL,
    quota_self_declaration jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE recrutamento.nomeacao (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    concurso_id uuid NOT NULL,
    vaga_id uuid NOT NULL,
    inscricao_id uuid NOT NULL,
    ato_administrativo text NOT NULL,
    act_classification_id uuid NOT NULL,
    published_at timestamp with time zone NOT NULL,
    comparecimento_until date NOT NULL,
    status recrutamento.nomeacao_status DEFAULT 'NOMEADO'::recrutamento.nomeacao_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT nomeacao_comparecimento_until_check CHECK ((comparecimento_until >= (published_at)::date))
);

CREATE TABLE recrutamento.nota (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inscricao_id uuid NOT NULL,
    prova_id uuid NOT NULL,
    raw_score numeric(18,6) DEFAULT 0 NOT NULL,
    weighted_score numeric(18,6) DEFAULT 0 NOT NULL,
    recomputed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT nota_score_nonnegative_check CHECK (((raw_score >= (0)::numeric) AND (weighted_score >= (0)::numeric)))
);

CREATE TABLE recrutamento.online_exam_session (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    prova_id uuid NOT NULL,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    status recrutamento.online_exam_session_status DEFAULT 'SCHEDULED'::recrutamento.online_exam_session_status NOT NULL,
    void_reason text,
    browser_fingerprint text NOT NULL,
    ip_address inet NOT NULL,
    user_agent text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT online_exam_session_status_time_check CHECK ((((status = 'SCHEDULED'::recrutamento.online_exam_session_status) AND (started_at IS NULL) AND (ended_at IS NULL)) OR ((status = 'IN_PROGRESS'::recrutamento.online_exam_session_status) AND (started_at IS NOT NULL) AND (ended_at IS NULL)) OR ((status = ANY (ARRAY['SUBMITTED'::recrutamento.online_exam_session_status, 'VOIDED'::recrutamento.online_exam_session_status, 'RESCHEDULED'::recrutamento.online_exam_session_status])) AND (started_at IS NOT NULL) AND (ended_at IS NOT NULL)))),
    CONSTRAINT online_exam_session_void_reason_check CHECK (((status <> 'VOIDED'::recrutamento.online_exam_session_status) OR (void_reason IS NOT NULL)))
);

CREATE TABLE recrutamento.payment_charge (
    tenant_id uuid NOT NULL,
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    inscricao_id uuid NOT NULL,
    gateway recrutamento.payment_gateway_kind NOT NULL,
    amount numeric(14,2) NOT NULL,
    external_id text NOT NULL,
    status recrutamento.payment_charge_status DEFAULT 'OPEN'::recrutamento.payment_charge_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payment_charge_amount_nonnegative_check CHECK ((amount >= (0)::numeric))
);

CREATE TABLE recrutamento.posse (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nomeacao_id uuid NOT NULL,
    posse_at timestamp with time zone NOT NULL,
    exercicio_at timestamp with time zone,
    exercicio_due_at date NOT NULL,
    lotacao_id uuid NOT NULL,
    employee_id uuid,
    status recrutamento.posse_status DEFAULT 'AGENDADA'::recrutamento.posse_status NOT NULL,
    cancellation_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT posse_cancel_reason_check CHECK (((status <> 'CANCELADA'::recrutamento.posse_status) OR (length(TRIM(BOTH FROM COALESCE(cancellation_reason, ''::text))) > 0))),
    CONSTRAINT posse_exercicio_after_posse_check CHECK (((exercicio_at IS NULL) OR (exercicio_at >= posse_at)))
);

CREATE TABLE recrutamento.proctoring_artifact (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    kind recrutamento.proctoring_artifact_kind NOT NULL,
    storage_ref text NOT NULL,
    captured_at timestamp with time zone NOT NULL,
    retention_until timestamp with time zone NOT NULL,
    CONSTRAINT proctoring_artifact_retention_check CHECK ((retention_until >= captured_at))
);

CREATE TABLE recrutamento.proctoring_event (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    kind recrutamento.proctoring_event_kind NOT NULL,
    severity recrutamento.proctoring_severity NOT NULL,
    evidence_ref text,
    ai_score numeric(18,6) DEFAULT 0 NOT NULL,
    reviewer_decision recrutamento.proctoring_reviewer_decision DEFAULT 'PENDING'::recrutamento.proctoring_reviewer_decision NOT NULL,
    CONSTRAINT proctoring_event_score_check CHECK (((ai_score >= (0)::numeric) AND (ai_score <= (1)::numeric))),
    CONSTRAINT proctoring_event_screen_share_severe_check CHECK (((kind <> 'SCREEN_SHARE_LOST'::recrutamento.proctoring_event_kind) OR (severity = 'SEVERE'::recrutamento.proctoring_severity)))
);

CREATE TABLE recrutamento.prova (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    concurso_id uuid NOT NULL,
    kind recrutamento.prova_kind NOT NULL,
    applied_at timestamp with time zone NOT NULL,
    weight numeric(18,6) DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    required_for_classification boolean DEFAULT true NOT NULL,
    minimum_raw_score numeric(18,6) DEFAULT 0 NOT NULL,
    minimum_weighted_score numeric(18,6) DEFAULT 0 NOT NULL,
    CONSTRAINT prova_weight_nonnegative_check CHECK ((weight >= (0)::numeric))
);

CREATE TABLE recrutamento.questao (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prova_id uuid NOT NULL,
    number integer NOT NULL,
    statement text NOT NULL,
    options jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT questao_number_positive_check CHECK ((number > 0))
);

CREATE TABLE recrutamento.recurso (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inscricao_id uuid NOT NULL,
    prova_id uuid NOT NULL,
    questao_id uuid NOT NULL,
    reason text NOT NULL,
    status recrutamento.recurso_status DEFAULT 'OPEN'::recrutamento.recurso_status NOT NULL,
    parecer text,
    decided_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT recurso_decision_check CHECK ((((status = 'OPEN'::recrutamento.recurso_status) AND (parecer IS NULL) AND (decided_at IS NULL)) OR ((status = ANY (ARRAY['UPHELD'::recrutamento.recurso_status, 'REJECTED'::recrutamento.recurso_status])) AND (parecer IS NOT NULL) AND (decided_at IS NOT NULL))))
);

CREATE TABLE recrutamento.resposta_candidato (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inscricao_id uuid NOT NULL,
    prova_id uuid NOT NULL,
    questao_id uuid NOT NULL,
    answer text NOT NULL,
    is_correct boolean,
    score numeric(18,6) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT resposta_candidato_score_nonnegative_check CHECK ((score >= (0)::numeric))
);

CREATE TABLE recrutamento.signed_document (
    tenant_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    concurso_id uuid NOT NULL,
    kind recrutamento.signed_document_kind NOT NULL,
    source_ref text NOT NULL,
    content_hash text NOT NULL,
    format recrutamento.signed_document_format NOT NULL,
    signed_payload bytea NOT NULL,
    status recrutamento.signed_document_status DEFAULT 'DRAFT'::recrutamento.signed_document_status NOT NULL,
    published_at timestamp with time zone,
    public_verify_token text DEFAULT encode(public.gen_random_bytes(24), 'hex'::text) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT signed_document_hash_check CHECK ((content_hash ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT signed_document_published_check CHECK ((((status = 'PUBLISHED'::recrutamento.signed_document_status) AND (published_at IS NOT NULL)) OR ((status <> 'PUBLISHED'::recrutamento.signed_document_status) AND (published_at IS NULL))))
);

CREATE TABLE recrutamento.vaga (
    tenant_id uuid NOT NULL,
    concurso_id uuid NOT NULL,
    position_id uuid NOT NULL,
    organic_definition_id uuid,
    total_seats integer NOT NULL,
    pcd_seats integer DEFAULT 0 NOT NULL,
    racial_seats integer DEFAULT 0 NOT NULL,
    indigenous_seats integer DEFAULT 0 NOT NULL,
    requirement jsonb DEFAULT '{}'::jsonb NOT NULL,
    base_salary numeric(14,2) NOT NULL,
    CONSTRAINT vaga_base_salary_positive_check CHECK ((base_salary >= (0)::numeric)),
    CONSTRAINT vaga_reserve_nonnegative_check CHECK (((pcd_seats >= 0) AND (racial_seats >= 0) AND (indigenous_seats >= 0))),
    CONSTRAINT vaga_reserve_total_check CHECK ((((pcd_seats + racial_seats) + indigenous_seats) <= total_seats)),
    CONSTRAINT vaga_total_seats_positive_check CHECK ((total_seats > 0))
);

ALTER TABLE ONLY recrutamento.banca_membro
    ADD CONSTRAINT banca_membro_cpf_uq UNIQUE (tenant_id, concurso_id, cpf);

ALTER TABLE ONLY recrutamento.banca_membro
    ADD CONSTRAINT banca_membro_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.biometric_consent
    ADD CONSTRAINT biometric_consent_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.biometric_match_attempt
    ADD CONSTRAINT biometric_match_attempt_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.candidate_biometric
    ADD CONSTRAINT candidate_biometric_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.candidato
    ADD CONSTRAINT candidato_cpf_uq UNIQUE (tenant_id, cpf);

ALTER TABLE ONLY recrutamento.candidato
    ADD CONSTRAINT candidato_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.classificacao_item
    ADD CONSTRAINT classificacao_item_pkey PRIMARY KEY (tenant_id, snapshot_id, vaga_id, inscricao_id);

ALTER TABLE ONLY recrutamento.classificacao_snapshot
    ADD CONSTRAINT classificacao_snapshot_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.classificacao_snapshot
    ADD CONSTRAINT classificacao_snapshot_tenant_id_id_concurso_id_uq UNIQUE (tenant_id, id, concurso_id);

ALTER TABLE ONLY recrutamento.concurso
    ADD CONSTRAINT concurso_code_uq UNIQUE (tenant_id, code);

ALTER TABLE ONLY recrutamento.concurso
    ADD CONSTRAINT concurso_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.convocacao
    ADD CONSTRAINT convocacao_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.document_signature
    ADD CONSTRAINT document_signature_membro_uq UNIQUE (tenant_id, document_id, banca_membro_id);

ALTER TABLE ONLY recrutamento.document_signature
    ADD CONSTRAINT document_signature_order_uq UNIQUE (tenant_id, document_id, signature_order);

ALTER TABLE ONLY recrutamento.document_signature
    ADD CONSTRAINT document_signature_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.edital
    ADD CONSTRAINT edital_pkey PRIMARY KEY (tenant_id, concurso_id, version);

ALTER TABLE ONLY recrutamento.gabarito
    ADD CONSTRAINT gabarito_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.gabarito
    ADD CONSTRAINT gabarito_version_uq UNIQUE (tenant_id, prova_id, version);

ALTER TABLE ONLY recrutamento.inscricao
    ADD CONSTRAINT inscricao_candidate_vaga_uq UNIQUE (tenant_id, concurso_id, vaga_id, candidato_id);

ALTER TABLE ONLY recrutamento.inscricao
    ADD CONSTRAINT inscricao_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.nomeacao
    ADD CONSTRAINT nomeacao_inscricao_uq UNIQUE (tenant_id, inscricao_id);

ALTER TABLE ONLY recrutamento.nomeacao
    ADD CONSTRAINT nomeacao_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.nota
    ADD CONSTRAINT nota_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.nota
    ADD CONSTRAINT nota_uq UNIQUE (tenant_id, inscricao_id, prova_id);

ALTER TABLE ONLY recrutamento.online_exam_session
    ADD CONSTRAINT online_exam_session_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.payment_charge
    ADD CONSTRAINT payment_charge_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.posse
    ADD CONSTRAINT posse_employee_uq UNIQUE (tenant_id, employee_id);

ALTER TABLE ONLY recrutamento.posse
    ADD CONSTRAINT posse_nomeacao_uq UNIQUE (tenant_id, nomeacao_id);

ALTER TABLE ONLY recrutamento.posse
    ADD CONSTRAINT posse_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.proctoring_artifact
    ADD CONSTRAINT proctoring_artifact_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.proctoring_event
    ADD CONSTRAINT proctoring_event_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.prova
    ADD CONSTRAINT prova_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.questao
    ADD CONSTRAINT questao_number_uq UNIQUE (tenant_id, prova_id, number);

ALTER TABLE ONLY recrutamento.questao
    ADD CONSTRAINT questao_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.recurso
    ADD CONSTRAINT recurso_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.resposta_candidato
    ADD CONSTRAINT resposta_candidato_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.resposta_candidato
    ADD CONSTRAINT resposta_candidato_uq UNIQUE (tenant_id, inscricao_id, prova_id, questao_id);

ALTER TABLE ONLY recrutamento.signed_document
    ADD CONSTRAINT signed_document_pkey PRIMARY KEY (tenant_id, id);

ALTER TABLE ONLY recrutamento.signed_document
    ADD CONSTRAINT signed_document_token_uq UNIQUE (public_verify_token);

ALTER TABLE ONLY recrutamento.vaga
    ADD CONSTRAINT vaga_pkey PRIMARY KEY (tenant_id, concurso_id, position_id);
