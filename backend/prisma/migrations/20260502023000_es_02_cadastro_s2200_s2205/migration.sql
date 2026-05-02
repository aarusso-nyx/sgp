CREATE SCHEMA IF NOT EXISTS esocial;

ALTER TYPE esocial.s1xxx_event_kind ADD VALUE IF NOT EXISTS 'S-2200';
ALTER TYPE esocial.s1xxx_event_kind ADD VALUE IF NOT EXISTS 'S-2205';

ALTER TABLE hr.employee
  ADD COLUMN IF NOT EXISTS marital_status text,
  ADD COLUMN IF NOT EXISTS education_level text;

CREATE TABLE IF NOT EXISTS esocial.s2200_emission_state (
  tenant_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  emitted_at timestamptz NOT NULL DEFAULT now(),
  recibo text,
  payload_hash char(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT s2200_emission_state_pkey PRIMARY KEY (tenant_id, employee_id),
  CONSTRAINT s2200_emission_state_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id),
  CONSTRAINT s2200_emission_state_employee_fk FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS esocial.s2205_trigger_field (
  field_path text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO esocial.s2205_trigger_field (field_path)
VALUES
  ('address.zip'),
  ('address.street'),
  ('contact.email'),
  ('contact.phone'),
  ('marital_status'),
  ('education_level'),
  ('dependent.*')
ON CONFLICT (field_path) DO NOTHING;

CREATE TABLE IF NOT EXISTS esocial.s2205_pending_alteration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id),
  employee_id uuid NOT NULL REFERENCES hr.employee(id) ON DELETE CASCADE,
  field_path text NOT NULL REFERENCES esocial.s2205_trigger_field(field_path),
  source_table text NOT NULL,
  source_row_id uuid NOT NULL,
  previous_payload jsonb,
  current_payload jsonb,
  status text NOT NULL DEFAULT 'PENDING',
  emitted_event_id uuid REFERENCES public.esocial_event(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  CONSTRAINT s2205_pending_alteration_status_chk
    CHECK (status IN ('PENDING', 'EMITTED', 'SKIPPED'))
);

CREATE INDEX IF NOT EXISTS s2205_pending_alteration_pending_idx
  ON esocial.s2205_pending_alteration (tenant_id, employee_id, status, created_at);

ALTER TABLE esocial.s2200_emission_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial.s2200_emission_state FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS s2200_emission_state_select ON esocial.s2200_emission_state;
CREATE POLICY s2200_emission_state_select ON esocial.s2200_emission_state
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['esocial.event.read', 'esocial.event.write'])
    )
  );
DROP POLICY IF EXISTS s2200_emission_state_write ON esocial.s2200_emission_state;
CREATE POLICY s2200_emission_state_write ON esocial.s2200_emission_state
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['esocial.event.write'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['esocial.event.write'])
    )
  );

ALTER TABLE esocial.s2205_pending_alteration ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial.s2205_pending_alteration FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS s2205_pending_alteration_select ON esocial.s2205_pending_alteration;
CREATE POLICY s2205_pending_alteration_select ON esocial.s2205_pending_alteration
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['esocial.event.read', 'esocial.event.write'])
    )
  );
DROP POLICY IF EXISTS s2205_pending_alteration_write ON esocial.s2205_pending_alteration;
CREATE POLICY s2205_pending_alteration_write ON esocial.s2205_pending_alteration
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['esocial.event.write'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['esocial.event.write'])
    )
  );

CREATE OR REPLACE FUNCTION esocial.enqueue_s2205_pending_alteration(
  p_tenant_id uuid,
  p_employee_id uuid,
  p_field_path text,
  p_source_table text,
  p_source_row_id uuid,
  p_previous_payload jsonb,
  p_current_payload jsonb
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM esocial.s2205_trigger_field WHERE field_path = p_field_path
  ) THEN
    RETURN;
  END IF;

  INSERT INTO esocial.s2205_pending_alteration (
    tenant_id,
    employee_id,
    field_path,
    source_table,
    source_row_id,
    previous_payload,
    current_payload
  )
  VALUES (
    p_tenant_id,
    p_employee_id,
    p_field_path,
    p_source_table,
    p_source_row_id,
    p_previous_payload,
    p_current_payload
  )
  RETURNING id INTO v_id;

  PERFORM set_config('app.current_tenant_id', p_tenant_id::text, true);
  PERFORM public.sgp_append_audit_event(
    'CREATE',
    'esocial.s2205_pending_alteration',
    v_id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    'esocial.s2205_pending_alteration',
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object(
      'employeeId', p_employee_id::text,
      'fieldPath', p_field_path,
      'sourceTable', p_source_table,
      'sourceRowId', p_source_row_id::text
    ),
    NULL::text,
    NULL::text,
    NULL::text
  );
END
$$;

CREATE OR REPLACE FUNCTION esocial.trg_employee_s2205_pending()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_zip text;
  new_zip text;
  old_street text;
  new_street text;
BEGIN
  old_zip := COALESCE(OLD.address->>'zip', OLD.address->>'cep');
  new_zip := COALESCE(NEW.address->>'zip', NEW.address->>'cep');
  old_street := COALESCE(OLD.address->>'street', OLD.address->>'dscLograd');
  new_street := COALESCE(NEW.address->>'street', NEW.address->>'dscLograd');

  IF old_zip IS DISTINCT FROM new_zip THEN
    PERFORM esocial.enqueue_s2205_pending_alteration(
      NEW.tenant_id, NEW.id, 'address.zip', 'hr.employee', NEW.id,
      jsonb_build_object('zip', old_zip),
      jsonb_build_object('zip', new_zip)
    );
  END IF;
  IF old_street IS DISTINCT FROM new_street THEN
    PERFORM esocial.enqueue_s2205_pending_alteration(
      NEW.tenant_id, NEW.id, 'address.street', 'hr.employee', NEW.id,
      jsonb_build_object('street', old_street),
      jsonb_build_object('street', new_street)
    );
  END IF;
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    PERFORM esocial.enqueue_s2205_pending_alteration(
      NEW.tenant_id, NEW.id, 'contact.email', 'hr.employee', NEW.id,
      jsonb_build_object('email', OLD.email),
      jsonb_build_object('email', NEW.email)
    );
  END IF;
  IF OLD.phone IS DISTINCT FROM NEW.phone THEN
    PERFORM esocial.enqueue_s2205_pending_alteration(
      NEW.tenant_id, NEW.id, 'contact.phone', 'hr.employee', NEW.id,
      jsonb_build_object('phone', OLD.phone),
      jsonb_build_object('phone', NEW.phone)
    );
  END IF;
  IF OLD.marital_status IS DISTINCT FROM NEW.marital_status THEN
    PERFORM esocial.enqueue_s2205_pending_alteration(
      NEW.tenant_id, NEW.id, 'marital_status', 'hr.employee', NEW.id,
      jsonb_build_object('maritalStatus', OLD.marital_status),
      jsonb_build_object('maritalStatus', NEW.marital_status)
    );
  END IF;
  IF OLD.education_level IS DISTINCT FROM NEW.education_level THEN
    PERFORM esocial.enqueue_s2205_pending_alteration(
      NEW.tenant_id, NEW.id, 'education_level', 'hr.employee', NEW.id,
      jsonb_build_object('educationLevel', OLD.education_level),
      jsonb_build_object('educationLevel', NEW.education_level)
    );
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_employee_s2205_pending ON hr.employee;
CREATE TRIGGER trg_employee_s2205_pending
  AFTER UPDATE ON hr.employee
  FOR EACH ROW EXECUTE FUNCTION esocial.trg_employee_s2205_pending();

CREATE OR REPLACE FUNCTION esocial.trg_employee_dependent_s2205_pending()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  row_after hr.employee_dependent;
  row_before hr.employee_dependent;
BEGIN
  row_after := NEW;
  row_before := OLD;
  PERFORM esocial.enqueue_s2205_pending_alteration(
    COALESCE(row_after.tenant_id, row_before.tenant_id),
    COALESCE(row_after.employee_id, row_before.employee_id),
    'dependent.*',
    'hr.employee_dependent',
    COALESCE(row_after.id, row_before.id),
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(row_before) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(row_after) END
  );
  RETURN COALESCE(NEW, OLD);
END
$$;

DROP TRIGGER IF EXISTS trg_employee_dependent_s2205_pending ON hr.employee_dependent;
CREATE TRIGGER trg_employee_dependent_s2205_pending
  AFTER INSERT OR UPDATE OR DELETE ON hr.employee_dependent
  FOR EACH ROW EXECUTE FUNCTION esocial.trg_employee_dependent_s2205_pending();
