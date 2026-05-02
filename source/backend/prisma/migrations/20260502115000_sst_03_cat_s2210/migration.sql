ALTER TYPE esocial.s1xxx_event_kind ADD VALUE IF NOT EXISTS 'S-2210';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'saude' AND t.typname = 'work_accident_type'
  ) THEN
    CREATE TYPE saude.work_accident_type AS ENUM ('TIPICO', 'TRAJETO', 'DOENCA_OCUPACIONAL');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'saude' AND t.typname = 'work_accident_severity'
  ) THEN
    CREATE TYPE saude.work_accident_severity AS ENUM ('LEVE', 'GRAVE', 'FATAL');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'saude' AND t.typname = 'work_accident_status'
  ) THEN
    CREATE TYPE saude.work_accident_status AS ENUM (
      'REGISTRADO',
      'COMUNICADO',
      'REABERTO',
      'COMUNICACAO_OBITO',
      'ENCERRADO'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'saude' AND t.typname = 'cat_kind'
  ) THEN
    CREATE TYPE saude.cat_kind AS ENUM ('INICIAL', 'REABERTURA', 'OBITO');
  END IF;
END
$$;

CREATE TABLE saude.work_accident (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id),
  employee_id uuid NOT NULL REFERENCES hr.employee(id) ON DELETE RESTRICT,
  accident_at timestamptz NOT NULL,
  accident_type saude.work_accident_type NOT NULL,
  location_text text NOT NULL,
  body_part_code text NOT NULL,
  agent_cause_code text NOT NULL,
  witness_text text NOT NULL DEFAULT '',
  severity saude.work_accident_severity NOT NULL DEFAULT 'LEVE',
  death_at timestamptz,
  status saude.work_accident_status NOT NULL DEFAULT 'REGISTRADO',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_accident_fatal_death_required_chk CHECK (severity <> 'FATAL' OR death_at IS NOT NULL),
  CONSTRAINT work_accident_body_part_code_chk CHECK (body_part_code ~ '^\d{9}$'),
  CONSTRAINT work_accident_agent_cause_code_chk CHECK (agent_cause_code ~ '^\d{9}$')
);

CREATE TABLE saude.cat_emission (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id),
  work_accident_id uuid NOT NULL REFERENCES saude.work_accident(id) ON DELETE CASCADE,
  cat_kind saude.cat_kind NOT NULL,
  emitted_at timestamptz NOT NULL DEFAULT now(),
  deadline_at timestamptz NOT NULL,
  esocial_event_id uuid REFERENCES public.esocial_event(id),
  doctor_crm text NOT NULL,
  doctor_name text NOT NULL,
  internment boolean NOT NULL DEFAULT false,
  leave_until date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cat_emission_kind_accident_uq UNIQUE (tenant_id, work_accident_id, cat_kind)
);

CREATE TABLE esocial.s2210_pending (
  tenant_id uuid NOT NULL REFERENCES public.tenant(id),
  cat_emission_id uuid NOT NULL REFERENCES saude.cat_emission(id) ON DELETE CASCADE,
  enqueued_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT s2210_pending_pkey PRIMARY KEY (tenant_id, cat_emission_id),
  CONSTRAINT s2210_pending_attempts_nonnegative_chk CHECK (attempts >= 0)
);

CREATE INDEX work_accident_employee_status_idx
  ON saude.work_accident(tenant_id, employee_id, status, accident_at DESC);
CREATE INDEX cat_emission_deadline_idx
  ON saude.cat_emission(tenant_id, deadline_at, esocial_event_id);
CREATE INDEX s2210_pending_tenant_enqueued_idx
  ON esocial.s2210_pending(tenant_id, enqueued_at);

CREATE TRIGGER work_accident_touch_updated_at
  BEFORE UPDATE ON saude.work_accident
  FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();
CREATE TRIGGER cat_emission_touch_updated_at
  BEFORE UPDATE ON saude.cat_emission
  FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();

CREATE OR REPLACE FUNCTION saude.sst03_validate_work_accident_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status <> OLD.status THEN
    IF NOT (
      (OLD.status = 'REGISTRADO'::saude.work_accident_status AND NEW.status = 'COMUNICADO'::saude.work_accident_status)
      OR (OLD.status = 'COMUNICADO'::saude.work_accident_status AND NEW.status IN ('REABERTO'::saude.work_accident_status, 'COMUNICACAO_OBITO'::saude.work_accident_status, 'ENCERRADO'::saude.work_accident_status))
      OR (OLD.status = 'REABERTO'::saude.work_accident_status AND NEW.status IN ('COMUNICACAO_OBITO'::saude.work_accident_status, 'ENCERRADO'::saude.work_accident_status))
      OR (OLD.status = 'COMUNICACAO_OBITO'::saude.work_accident_status AND NEW.status = 'ENCERRADO'::saude.work_accident_status)
    ) THEN
      RAISE EXCEPTION 'invalid work_accident status transition: % -> %', OLD.status, NEW.status;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.status = 'ENCERRADO'::saude.work_accident_status
     AND NEW.severity = 'FATAL'::saude.work_accident_severity
     AND NOT EXISTS (
       SELECT 1
       FROM saude.cat_emission cat
       WHERE cat.tenant_id = NEW.tenant_id
         AND cat.work_accident_id = NEW.id
         AND cat.cat_kind = 'OBITO'::saude.cat_kind
     ) THEN
    RAISE EXCEPTION 'fatal work_accident requires OBITO CAT before closing';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER work_accident_state_machine
  BEFORE UPDATE ON saude.work_accident
  FOR EACH ROW EXECUTE FUNCTION saude.sst03_validate_work_accident_state();

CREATE OR REPLACE FUNCTION saude.sst03_validate_cat_emission()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_accident saude.work_accident%ROWTYPE;
BEGIN
  SELECT * INTO v_accident
  FROM saude.work_accident
  WHERE id = NEW.work_accident_id
    AND tenant_id = NEW.tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CAT emission requires a same-tenant work_accident';
  END IF;

  IF NEW.cat_kind = 'OBITO'::saude.cat_kind AND v_accident.death_at IS NULL THEN
    RAISE EXCEPTION 'OBITO CAT requires work_accident.death_at';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER cat_emission_validate
  BEFORE INSERT OR UPDATE ON saude.cat_emission
  FOR EACH ROW EXECUTE FUNCTION saude.sst03_validate_cat_emission();

CREATE OR REPLACE FUNCTION esocial.sgp_enqueue_s2210_from_cat()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO esocial.s2210_pending (tenant_id, cat_emission_id)
  VALUES (NEW.tenant_id, NEW.id)
  ON CONFLICT (tenant_id, cat_emission_id)
  DO UPDATE
  SET enqueued_at = EXCLUDED.enqueued_at,
      updated_at = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER sst03_cat_emission_s2210
  AFTER INSERT ON saude.cat_emission
  FOR EACH ROW EXECUTE FUNCTION esocial.sgp_enqueue_s2210_from_cat();

CREATE TRIGGER work_accident_audit
  AFTER INSERT OR UPDATE OR DELETE ON saude.work_accident
  FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();
CREATE TRIGGER cat_emission_audit
  AFTER INSERT OR UPDATE OR DELETE ON saude.cat_emission
  FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

CREATE OR REPLACE FUNCTION esocial.sgp_s2210_pending_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_row record;
BEGIN
  v_row := COALESCE(NEW, OLD);
  PERFORM public.sgp_append_audit_event(
    CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    v_row.cat_emission_id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object(
      'operation', TG_OP,
      'tenantId', v_row.tenant_id::text,
      'attempts', COALESCE(v_row.attempts, 0)
    ),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END;
$$;

CREATE TRIGGER s2210_pending_audit
  AFTER INSERT OR UPDATE OR DELETE ON esocial.s2210_pending
  FOR EACH ROW EXECUTE FUNCTION esocial.sgp_s2210_pending_audit();

ALTER TABLE saude.work_accident ENABLE ROW LEVEL SECURITY;
ALTER TABLE saude.work_accident FORCE ROW LEVEL SECURITY;
ALTER TABLE saude.cat_emission ENABLE ROW LEVEL SECURITY;
ALTER TABLE saude.cat_emission FORCE ROW LEVEL SECURITY;
ALTER TABLE esocial.s2210_pending ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial.s2210_pending FORCE ROW LEVEL SECURITY;

CREATE POLICY work_accident_rw ON saude.work_accident
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.cat.read', 'saude.cat.write', 'esocial.event.read', 'esocial.event.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.cat.write', 'esocial.event.write'])
  );

CREATE POLICY cat_emission_rw ON saude.cat_emission
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.cat.read', 'saude.cat.write', 'esocial.event.read', 'esocial.event.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.cat.write', 'esocial.event.write'])
  );

CREATE POLICY s2210_pending_select ON esocial.s2210_pending
  FOR SELECT USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.cat.read', 'saude.cat.write', 'esocial.event.read', 'esocial.event.write'])
  );
CREATE POLICY s2210_pending_write ON esocial.s2210_pending
  FOR ALL USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.cat.write', 'esocial.event.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.cat.write', 'esocial.event.write'])
  );

WITH sst03_permissions(key, module_key, resource_key, action_key, route_pattern, description) AS (
  VALUES
    ('saude.cat.read', 'saude', 'cat', 'read', '/api/v1/saude/acidentes/**', 'Read work accident, CAT deadlines, and S-2210 emission state.'),
    ('saude.cat.write', 'saude', 'cat', 'write', '/api/v1/saude/acidentes/**', 'Register work accidents and emit initial, reopening, and death CAT records.')
)
INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
SELECT key, module_key, resource_key, action_key, route_pattern, description
FROM sst03_permissions
ON CONFLICT (key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description,
    updated_at = now();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app_role') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON saude.work_accident TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON saude.cat_emission TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON esocial.s2210_pending TO sgp_app_role;
  END IF;
END
$$;
