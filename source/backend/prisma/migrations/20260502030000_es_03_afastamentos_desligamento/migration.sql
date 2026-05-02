-- ES-03 S-2230 leave/vacation and S-2299 termination dispatch.

ALTER TYPE esocial.s1xxx_event_kind ADD VALUE IF NOT EXISTS 'S-2230';
ALTER TYPE esocial.s1xxx_event_kind ADD VALUE IF NOT EXISTS 'S-2299';

CREATE TYPE esocial.s2230_pending_kind AS ENUM ('LEAVE', 'VACATION');
CREATE TYPE esocial.s2230_trigger_event AS ENUM ('START', 'END', 'EXTENSION');
CREATE TYPE esocial.es03_pending_status AS ENUM ('PENDING', 'EMITTED');

CREATE TABLE esocial.s2230_pending (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  leave_or_vacation_id uuid NOT NULL,
  kind esocial.s2230_pending_kind NOT NULL,
  trigger_event esocial.s2230_trigger_event NOT NULL,
  status esocial.es03_pending_status NOT NULL DEFAULT 'PENDING',
  emitted_event_id uuid REFERENCES public.esocial_event(id),
  enqueued_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  UNIQUE (tenant_id, leave_or_vacation_id, kind, trigger_event, status)
);

CREATE TABLE esocial.s2299_pending (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  employment_link_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  calc_run_id uuid NOT NULL,
  status esocial.es03_pending_status NOT NULL DEFAULT 'PENDING',
  emitted_event_id uuid REFERENCES public.esocial_event(id),
  ready_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  UNIQUE (tenant_id, employment_link_id, calc_run_id, status)
);

CREATE INDEX s2230_pending_tenant_status_idx
  ON esocial.s2230_pending(tenant_id, status, enqueued_at);
CREATE INDEX s2299_pending_tenant_status_idx
  ON esocial.s2299_pending(tenant_id, status, ready_at);

CREATE OR REPLACE FUNCTION esocial.sgp_enqueue_s2230_from_leave()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'ACTIVE'::public."RecordStatus"
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO esocial.s2230_pending (tenant_id, leave_or_vacation_id, kind, trigger_event)
    VALUES (NEW.tenant_id, NEW.id, 'LEAVE', 'START')
    ON CONFLICT DO NOTHING;
  END IF;

  IF NEW.status = 'ACTIVE'::public."RecordStatus"
     AND TG_OP = 'UPDATE'
     AND OLD.ends_on IS DISTINCT FROM NEW.ends_on
     AND NEW.ends_on IS NOT NULL THEN
    INSERT INTO esocial.s2230_pending (tenant_id, leave_or_vacation_id, kind, trigger_event)
    VALUES (NEW.tenant_id, NEW.id, 'LEAVE', 'EXTENSION')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION esocial.sgp_enqueue_s2230_from_vacation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IN ('aprovado', 'gozado')
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO esocial.s2230_pending (tenant_id, leave_or_vacation_id, kind, trigger_event)
    VALUES (NEW.tenant_id, NEW.id, 'VACATION', 'START')
    ON CONFLICT DO NOTHING;
  END IF;

  IF NEW.status IN ('aprovado', 'gozado')
     AND TG_OP = 'UPDATE'
     AND OLD.ends_on IS DISTINCT FROM NEW.ends_on THEN
    INSERT INTO esocial.s2230_pending (tenant_id, leave_or_vacation_id, kind, trigger_event)
    VALUES (NEW.tenant_id, NEW.id, 'VACATION', 'EXTENSION')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION esocial.sgp_enqueue_s2299_from_employment_link()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_employee_id uuid;
  v_run_status public."PayrollRunStatus";
BEGIN
  IF NEW.termination_payroll_run_id IS NULL
     OR (TG_OP = 'UPDATE' AND OLD.termination_payroll_run_id IS NOT DISTINCT FROM NEW.termination_payroll_run_id) THEN
    RETURN NEW;
  END IF;

  SELECT status INTO v_run_status
  FROM payroll.payroll_run
  WHERE id = NEW.termination_payroll_run_id
    AND tenant_id = NEW.tenant_id;

  IF v_run_status <> 'GENERATED'::public."PayrollRunStatus" THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_employee_id
  FROM hr.employee
  WHERE tenant_id = NEW.tenant_id
    AND employment_link_id = NEW.id
  ORDER BY terminated_on DESC NULLS LAST, updated_at DESC
  LIMIT 1;

  IF v_employee_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO esocial.s2299_pending (tenant_id, employment_link_id, employee_id, calc_run_id)
  VALUES (NEW.tenant_id, NEW.id, v_employee_id, NEW.termination_payroll_run_id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS es03_leave_record_s2230 ON hr.leave_record;
CREATE TRIGGER es03_leave_record_s2230
  AFTER INSERT OR UPDATE ON hr.leave_record
  FOR EACH ROW EXECUTE FUNCTION esocial.sgp_enqueue_s2230_from_leave();

DROP TRIGGER IF EXISTS es03_vacation_record_s2230 ON hr.vacation_record;
CREATE TRIGGER es03_vacation_record_s2230
  AFTER INSERT OR UPDATE ON hr.vacation_record
  FOR EACH ROW EXECUTE FUNCTION esocial.sgp_enqueue_s2230_from_vacation();

DROP TRIGGER IF EXISTS es03_employment_link_s2299 ON hr.employment_link;
CREATE TRIGGER es03_employment_link_s2299
  AFTER UPDATE ON hr.employment_link
  FOR EACH ROW EXECUTE FUNCTION esocial.sgp_enqueue_s2299_from_employment_link();

CREATE OR REPLACE FUNCTION esocial.sgp_es03_pending_audit()
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
    v_row.id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END;
$$;

CREATE TRIGGER es03_s2230_pending_audit
  AFTER INSERT OR UPDATE OR DELETE ON esocial.s2230_pending
  FOR EACH ROW EXECUTE FUNCTION esocial.sgp_es03_pending_audit();
CREATE TRIGGER es03_s2299_pending_audit
  AFTER INSERT OR UPDATE OR DELETE ON esocial.s2299_pending
  FOR EACH ROW EXECUTE FUNCTION esocial.sgp_es03_pending_audit();

ALTER TABLE esocial.s2230_pending ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial.s2230_pending FORCE ROW LEVEL SECURITY;
ALTER TABLE esocial.s2299_pending ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial.s2299_pending FORCE ROW LEVEL SECURITY;

CREATE POLICY p_s2230_pending_select ON esocial.s2230_pending
  FOR SELECT USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['esocial.event.read', 'esocial.event.write'])
  );
CREATE POLICY p_s2230_pending_write ON esocial.s2230_pending
  FOR ALL USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['esocial.event.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['esocial.event.write'])
  );

CREATE POLICY p_s2299_pending_select ON esocial.s2299_pending
  FOR SELECT USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['esocial.event.read', 'esocial.event.write'])
  );
CREATE POLICY p_s2299_pending_write ON esocial.s2299_pending
  FOR ALL USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['esocial.event.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['esocial.event.write'])
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app_role') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON esocial.s2230_pending TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON esocial.s2299_pending TO sgp_app_role;
  END IF;
END
$$;
