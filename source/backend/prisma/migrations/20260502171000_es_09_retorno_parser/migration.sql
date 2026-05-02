-- ES-09 eSocial return parser status synchronization and retry schedule.

CREATE SCHEMA IF NOT EXISTS esocial;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type type_row
    JOIN pg_namespace namespace_row ON namespace_row.oid = type_row.typnamespace
    WHERE namespace_row.nspname = 'esocial'
      AND type_row.typname = 'response_classification_class'
  ) THEN
    CREATE TYPE esocial.response_classification_class AS ENUM (
      'ACCEPTED',
      'RECOVERABLE',
      'DEFINITIVE'
    );
  END IF;
END
$$;

ALTER TABLE public.esocial_event
  ADD COLUMN IF NOT EXISTS response_code text,
  ADD COLUMN IF NOT EXISTS response_description text,
  ADD COLUMN IF NOT EXISTS response_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_response_at timestamptz;

CREATE INDEX IF NOT EXISTS esocial_event_response_code_idx
  ON public.esocial_event (tenant_id, response_code)
  WHERE response_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS esocial_event_last_response_idx
  ON public.esocial_event (tenant_id, last_response_at DESC)
  WHERE last_response_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS esocial.response_classification (
  response_code text PRIMARY KEY,
  class esocial.response_classification_class NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT response_classification_code_chk CHECK (response_code ~ '^[0-9]{3}$')
);

INSERT INTO esocial.response_classification (response_code, class, description)
VALUES
  ('101', 'RECOVERABLE', 'Lote Aguardando Processamento.'),
  ('201', 'ACCEPTED', 'Sucesso.'),
  ('202', 'ACCEPTED', 'Sucesso com advertencia.'),
  ('301', 'RECOVERABLE', 'Erro servidor.'),
  ('401', 'DEFINITIVE', 'Erro no conteudo do evento.'),
  ('402', 'DEFINITIVE', 'Schema invalido.'),
  ('403', 'DEFINITIVE', 'Leiaute invalido.'),
  ('404', 'DEFINITIVE', 'Erro do certificado digital da assinatura do evento.'),
  ('405', 'DEFINITIVE', 'Erro na assinatura evento.'),
  ('406', 'DEFINITIVE', 'Evento nao pertence ao grupo especificado no lote de eventos.'),
  ('407', 'RECOVERABLE', 'Regra de precedencia na transmissao de eventos nao seguida.'),
  ('408', 'RECOVERABLE', 'Erro na integracao com o sistema CNPJ / CPF.'),
  ('409', 'RECOVERABLE', 'Erro na integracao com o sistema Procuracao Eletronica RFB.'),
  ('410', 'RECOVERABLE', 'Erro na integracao com o sistema Procuracao Eletronica Caixa.'),
  ('411', 'DEFINITIVE', 'Assinante invalido ou sem perfil de procuracao eletronica.'),
  ('501', 'DEFINITIVE', 'Solicitacao de Consulta Incorreta - Erro Preenchimento.'),
  ('502', 'DEFINITIVE', 'Solicitacao de Consulta Incorreta - Schema Invalido.'),
  ('503', 'DEFINITIVE', 'Solicitacao de Consulta Incorreta - Versao do Schema Nao Permitida.'),
  ('504', 'DEFINITIVE', 'Solicitacao de Consulta Incorreta - Erro Certificado.'),
  ('505', 'DEFINITIVE', 'Solicitacao de Consulta Incorreta - Consulta nula ou vazia.')
ON CONFLICT (response_code) DO UPDATE
SET class = EXCLUDED.class,
    description = EXCLUDED.description,
    updated_at = now();

CREATE TABLE IF NOT EXISTS esocial.event_retry_schedule (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  event_id uuid NOT NULL,
  attempt integer NOT NULL DEFAULT 1,
  next_at timestamptz NOT NULL,
  last_error text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_retry_schedule_pkey PRIMARY KEY (tenant_id, event_id),
  CONSTRAINT event_retry_schedule_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id),
  CONSTRAINT event_retry_schedule_event_fk FOREIGN KEY (event_id) REFERENCES public.esocial_event(id) ON DELETE CASCADE,
  CONSTRAINT event_retry_schedule_attempt_chk CHECK (attempt >= 1)
);

CREATE INDEX IF NOT EXISTS event_retry_schedule_due_idx
  ON esocial.event_retry_schedule (tenant_id, next_at, attempt);

ALTER TABLE esocial.event_retry_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial.event_retry_schedule FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_retry_schedule_select ON esocial.event_retry_schedule;
CREATE POLICY event_retry_schedule_select ON esocial.event_retry_schedule
  FOR SELECT USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['esocial.event.read', 'esocial.event.retry'])
    )
  );

DROP POLICY IF EXISTS event_retry_schedule_write ON esocial.event_retry_schedule;
CREATE POLICY event_retry_schedule_write ON esocial.event_retry_schedule
  FOR ALL USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['esocial.event.retry'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['esocial.event.retry'])
    )
  );

CREATE OR REPLACE VIEW esocial.v_event_failures AS
SELECT
  event.tenant_id,
  event.id AS event_id,
  event.event_type,
  event.reference,
  event.competence,
  event.status,
  event.response_code,
  COALESCE(classification.description, event.response_description, event.last_error_message) AS translated_message,
  event.response_description,
  event.response_errors,
  event.last_response_at,
  event.retry_count,
  retry.attempt,
  retry.next_at,
  retry.last_error,
  event.created_at,
  event.updated_at
FROM public.esocial_event event
LEFT JOIN esocial.response_classification classification
  ON classification.response_code = event.response_code
LEFT JOIN esocial.event_retry_schedule retry
  ON retry.tenant_id = event.tenant_id
 AND retry.event_id = event.id
WHERE event.status IN (
  'PROCESSADO_COM_ERROS'::public."ESocialEventStatus",
  'ERRO_TECNICO_RETENTAVEL'::public."ESocialEventStatus",
  'ERRO_DEFINITIVO'::public."ESocialEventStatus"
);

CREATE OR REPLACE FUNCTION esocial.audit_event_retry_schedule_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  row_value esocial.event_retry_schedule;
  audit_action text;
BEGIN
  row_value := COALESCE(NEW, OLD);
  audit_action := CASE TG_OP
    WHEN 'INSERT' THEN 'CREATE'
    WHEN 'UPDATE' THEN 'UPDATE'
    ELSE 'DELETE'
  END;

  PERFORM set_config('app.current_tenant_id', row_value.tenant_id::text, true);
  PERFORM public.sgp_append_audit_event(
    audit_action,
    'esocial.event_retry_schedule',
    row_value.event_id::text,
    NULL,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    'esocial.event_retry_schedule',
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object(
      'attempt', row_value.attempt,
      'nextAt', row_value.next_at,
      'lastError', row_value.last_error
    ),
    NULL,
    NULL,
    NULL
  );
  RETURN row_value;
END
$$;

DROP TRIGGER IF EXISTS trg_event_retry_schedule_audit ON esocial.event_retry_schedule;
CREATE TRIGGER trg_event_retry_schedule_audit
  AFTER INSERT OR UPDATE OR DELETE ON esocial.event_retry_schedule
  FOR EACH ROW EXECUTE FUNCTION esocial.audit_event_retry_schedule_mutation();

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  ('esocial.event.retry', 'esocial', 'event', 'retry', '#!/esocial/**', 'Force retry and clear handled eSocial return failures.')
ON CONFLICT (key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description;

WITH profile_permissions(profile_code, permission_key) AS (
  VALUES
    ('ADMIN', 'esocial.event.retry'),
    ('FOLHA_OPERADOR', 'esocial.event.retry')
)
INSERT INTO public.profile_permission (profile_id, permission_id, allowed)
SELECT access_profile.id, permission.id, true
FROM profile_permissions
JOIN public.access_profile
  ON access_profile.code = profile_permissions.profile_code
 AND access_profile.tenant_id = public.sgp_current_tenant_uuid()
JOIN public.permission
  ON permission.key = profile_permissions.permission_key
ON CONFLICT (profile_id, permission_id) DO UPDATE
SET allowed = EXCLUDED.allowed;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app_role') THEN
    GRANT SELECT ON esocial.response_classification TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON esocial.event_retry_schedule TO sgp_app_role;
    GRANT SELECT ON esocial.v_event_failures TO sgp_app_role;
  END IF;
END
$$;
