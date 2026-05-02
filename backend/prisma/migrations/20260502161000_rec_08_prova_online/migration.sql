DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'recrutamento' AND t.typname = 'online_exam_session_status'
  ) THEN
    CREATE TYPE recrutamento.online_exam_session_status AS ENUM (
      'SCHEDULED',
      'IN_PROGRESS',
      'SUBMITTED',
      'VOIDED',
      'RESCHEDULED'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'recrutamento' AND t.typname = 'proctoring_event_kind'
  ) THEN
    CREATE TYPE recrutamento.proctoring_event_kind AS ENUM (
      'SNAPSHOT',
      'AUDIO_FLAG',
      'GAZE_OFF_SCREEN',
      'SCREEN_SHARE_LOST',
      'PROHIBITED_APP',
      'LIVENESS_FAIL',
      'VOICE_MISMATCH'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'recrutamento' AND t.typname = 'proctoring_severity'
  ) THEN
    CREATE TYPE recrutamento.proctoring_severity AS ENUM ('INFO', 'WARN', 'SEVERE');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'recrutamento' AND t.typname = 'proctoring_reviewer_decision'
  ) THEN
    CREATE TYPE recrutamento.proctoring_reviewer_decision AS ENUM ('PENDING', 'ACCEPT', 'REJECT');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'recrutamento' AND t.typname = 'proctoring_artifact_kind'
  ) THEN
    CREATE TYPE recrutamento.proctoring_artifact_kind AS ENUM (
      'SNAPSHOT',
      'AUDIO_CHUNK',
      'SCREEN_FRAME'
    );
  END IF;
END
$$;

CREATE TABLE recrutamento.online_exam_session (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL,
  prova_id uuid NOT NULL,
  started_at timestamptz,
  ended_at timestamptz,
  status recrutamento.online_exam_session_status NOT NULL DEFAULT 'SCHEDULED',
  void_reason text,
  browser_fingerprint text NOT NULL,
  ip_address inet NOT NULL,
  user_agent text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT online_exam_session_pkey PRIMARY KEY (tenant_id, id),
  CONSTRAINT online_exam_session_application_fk FOREIGN KEY (tenant_id, application_id)
    REFERENCES recrutamento.inscricao(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT online_exam_session_prova_fk FOREIGN KEY (tenant_id, prova_id)
    REFERENCES recrutamento.prova(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT online_exam_session_status_time_check CHECK (
    (status = 'SCHEDULED' AND started_at IS NULL AND ended_at IS NULL)
    OR (status = 'IN_PROGRESS' AND started_at IS NOT NULL AND ended_at IS NULL)
    OR (status IN ('SUBMITTED', 'VOIDED', 'RESCHEDULED') AND started_at IS NOT NULL AND ended_at IS NOT NULL)
  ),
  CONSTRAINT online_exam_session_void_reason_check CHECK (
    status <> 'VOIDED' OR void_reason IS NOT NULL
  )
);

CREATE TABLE recrutamento.proctoring_event (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  kind recrutamento.proctoring_event_kind NOT NULL,
  severity recrutamento.proctoring_severity NOT NULL,
  evidence_ref text,
  ai_score numeric(18, 6) NOT NULL DEFAULT 0,
  reviewer_decision recrutamento.proctoring_reviewer_decision NOT NULL DEFAULT 'PENDING',
  CONSTRAINT proctoring_event_pkey PRIMARY KEY (tenant_id, id),
  CONSTRAINT proctoring_event_session_fk FOREIGN KEY (tenant_id, session_id)
    REFERENCES recrutamento.online_exam_session(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT proctoring_event_score_check CHECK (ai_score >= 0 AND ai_score <= 1),
  CONSTRAINT proctoring_event_screen_share_severe_check CHECK (
    kind <> 'SCREEN_SHARE_LOST' OR severity = 'SEVERE'
  )
);

CREATE TABLE recrutamento.proctoring_artifact (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  kind recrutamento.proctoring_artifact_kind NOT NULL,
  storage_ref text NOT NULL,
  captured_at timestamptz NOT NULL,
  retention_until timestamptz NOT NULL,
  CONSTRAINT proctoring_artifact_pkey PRIMARY KEY (tenant_id, id),
  CONSTRAINT proctoring_artifact_session_fk FOREIGN KEY (tenant_id, session_id)
    REFERENCES recrutamento.online_exam_session(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT proctoring_artifact_retention_check CHECK (retention_until >= captured_at)
);

CREATE INDEX online_exam_session_application_idx
  ON recrutamento.online_exam_session (tenant_id, application_id, prova_id, status);
CREATE INDEX proctoring_event_session_idx
  ON recrutamento.proctoring_event (tenant_id, session_id, severity, occurred_at);
CREATE INDEX proctoring_artifact_retention_idx
  ON recrutamento.proctoring_artifact (tenant_id, retention_until);

ALTER TABLE recrutamento.biometric_match_attempt
  ADD CONSTRAINT biometric_match_attempt_exam_session_fk FOREIGN KEY (tenant_id, exam_session_id)
    REFERENCES recrutamento.online_exam_session(tenant_id, id) ON DELETE SET NULL (exam_session_id);

CREATE OR REPLACE FUNCTION recrutamento.sgp_proctoring_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  row_after record := NEW;
  row_before record := OLD;
  audit_action text := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  after_json jsonb := to_jsonb(row_after);
  before_json jsonb := to_jsonb(row_before);
  resource_id text;
BEGIN
  resource_id := COALESCE(after_json ->> 'id', before_json ->> 'id');
  PERFORM set_config('app.current_tenant_id', COALESCE(row_after.tenant_id, row_before.tenant_id)::text, true);
  PERFORM public.sgp_append_audit_event(
    audit_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    resource_id,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP, 'before', before_json, 'after', after_json)
  );
  RETURN COALESCE(NEW, OLD);
END
$$;

DO $$
DECLARE
  rel regclass;
  trigger_name text;
BEGIN
  FOREACH rel IN ARRAY ARRAY[
    'recrutamento.online_exam_session'::regclass,
    'recrutamento.proctoring_event'::regclass,
    'recrutamento.proctoring_artifact'::regclass
  ]
  LOOP
    trigger_name := replace(rel::text, '.', '_') || '_audit';
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s', trigger_name, rel);
    EXECUTE format(
      'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON %s FOR EACH ROW EXECUTE FUNCTION recrutamento.sgp_proctoring_audit()',
      trigger_name,
      rel
    );
  END LOOP;
END
$$;

ALTER TABLE recrutamento.online_exam_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.online_exam_session FORCE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.proctoring_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.proctoring_event FORCE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.proctoring_artifact ENABLE ROW LEVEL SECURITY;
ALTER TABLE recrutamento.proctoring_artifact FORCE ROW LEVEL SECURITY;

DO $$
DECLARE
  rel regclass;
  table_name text;
BEGIN
  FOREACH rel IN ARRAY ARRAY[
    'recrutamento.online_exam_session'::regclass,
    'recrutamento.proctoring_event'::regclass,
    'recrutamento.proctoring_artifact'::regclass
  ]
  LOOP
    table_name := split_part(rel::text, '.', 2);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', table_name || '_select', rel);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', table_name || '_write', rel);
    EXECUTE format(
      'CREATE POLICY %I ON %s FOR SELECT USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''recrutamento.exam.read'', ''recrutamento.exam.review'', ''recrutamento.exam.write'', ''recrutamento.read'', ''recrutamento.write''])))',
      table_name || '_select',
      rel
    );
    EXECUTE format(
      'CREATE POLICY %I ON %s FOR ALL USING (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''recrutamento.exam.write'', ''recrutamento.exam.review'', ''recrutamento.write'']))) WITH CHECK (public.sgp_bypass_rls() OR (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''recrutamento.exam.write'', ''recrutamento.exam.review'', ''recrutamento.write''])))',
      table_name || '_write',
      rel
    );
  END LOOP;
END
$$;

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  ('recrutamento.exam.read', 'recrutamento', 'online_exam', 'read', '/api/v1/recrutamento/prova-online/**', 'Read online exam sessions, proctoring flags, and artifacts.'),
  ('recrutamento.exam.write', 'recrutamento', 'online_exam', 'write', '/api/v1/recrutamento/prova-online/**', 'Start, ingest, flag, submit, and erase online proctored exam records.'),
  ('recrutamento.exam.review', 'recrutamento', 'online_exam', 'review', '/api/v1/recrutamento/prova-online/review/**', 'Review proctoring flags, accept sessions, void suspicious sessions, and reschedule.')
ON CONFLICT (key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description;
