-- HR-04 medical leave, official pericia opinion, RLS, and audit.

ALTER TABLE hr.medical_record
  ADD COLUMN IF NOT EXISTS decision text,
  ADD COLUMN IF NOT EXISTS opinion_notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS evaluation_type text NOT NULL DEFAULT 'official_pericia',
  ADD COLUMN IF NOT EXISTS granted_days integer,
  ADD COLUMN IF NOT EXISTS leave_starts_on date,
  ADD COLUMN IF NOT EXISTS leave_ends_on date,
  ADD COLUMN IF NOT EXISTS cid_code text,
  ADD COLUMN IF NOT EXISTS cid_secondary text;

ALTER TABLE hr.medical_record
  DROP CONSTRAINT IF EXISTS medical_record_decision_check,
  ADD CONSTRAINT medical_record_decision_check
    CHECK (decision IS NULL OR decision IN ('granted', 'denied', 'pending')),
  DROP CONSTRAINT IF EXISTS medical_record_granted_days_check,
  ADD CONSTRAINT medical_record_granted_days_check
    CHECK (granted_days IS NULL OR granted_days > 0),
  DROP CONSTRAINT IF EXISTS medical_record_leave_dates_check,
  ADD CONSTRAINT medical_record_leave_dates_check
    CHECK (
      leave_starts_on IS NULL
      OR leave_ends_on IS NULL
      OR leave_ends_on >= leave_starts_on
    );

ALTER TABLE hr.medical_leave
  ADD COLUMN IF NOT EXISTS cid_code text,
  ADD COLUMN IF NOT EXISTS cid_secondary text,
  ADD COLUMN IF NOT EXISTS expert_opinion_id uuid;

UPDATE hr.medical_leave
SET
  cid_code = COALESCE(cid_code, icd_ref),
  expert_opinion_id = COALESCE(expert_opinion_id, medical_record_id)
WHERE cid_code IS NULL OR expert_opinion_id IS NULL;

ALTER TABLE hr.medical_leave
  DROP CONSTRAINT IF EXISTS medical_leave_expert_opinion_fkey,
  ADD CONSTRAINT medical_leave_expert_opinion_fkey
    FOREIGN KEY (expert_opinion_id) REFERENCES hr.medical_record(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS medical_leave_expert_opinion_idx
  ON hr.medical_leave(expert_opinion_id);
CREATE INDEX IF NOT EXISTS medical_leave_tenant_employee_starts_idx
  ON hr.medical_leave(tenant_id, employee_id, starts_on DESC);
CREATE INDEX IF NOT EXISTS medical_record_decision_idx
  ON hr.medical_record(decision);

CREATE OR REPLACE FUNCTION hr.f_consolidated_medical_days(
  p_employee_id uuid,
  p_year integer
) RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(granted_days), 0)::integer
  FROM hr.medical_leave leave_row
  WHERE leave_row.employee_id = p_employee_id
    AND leave_row.status = 'ACTIVE'::"RecordStatus"
    AND leave_row.starts_on >= make_date(p_year, 1, 1)
    AND leave_row.starts_on < make_date(p_year + 1, 1, 1);
$$;

CREATE OR REPLACE FUNCTION hr.sgp_hr04_medical_record_conclude()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_leave_id uuid;
  v_leave_record_id uuid;
BEGIN
  IF NEW.decision <> 'granted' THEN
    RETURN NEW;
  END IF;

  IF NEW.granted_days IS NULL OR NEW.leave_starts_on IS NULL OR NEW.leave_ends_on IS NULL THEN
    RAISE EXCEPTION 'Granted medical opinion requires granted_days, leave_starts_on, and leave_ends_on'
      USING ERRCODE = '23514';
  END IF;

  INSERT INTO hr.medical_leave (
    tenant_id,
    medical_record_id,
    employee_id,
    evaluation_type,
    social_security_benefit,
    absence_reason_id,
    icd_ref,
    cid_code,
    cid_secondary,
    expert_opinion_id,
    granted_days,
    starts_on,
    ends_on,
    status
  )
  VALUES (
    NEW.tenant_id,
    NEW.id,
    NEW.employee_id,
    NEW.evaluation_type,
    NULL,
    NULL,
    NEW.cid_code,
    NEW.cid_code,
    NEW.cid_secondary,
    NEW.id,
    NEW.granted_days,
    NEW.leave_starts_on,
    NEW.leave_ends_on,
    'ACTIVE'::"RecordStatus"
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_leave_id;

  IF v_leave_id IS NULL THEN
    SELECT id INTO v_leave_id
    FROM hr.medical_leave
    WHERE medical_record_id = NEW.id
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  INSERT INTO hr.leave_record (
    tenant_id,
    employee_id,
    absence_reason_id,
    starts_on,
    ends_on,
    days,
    status,
    notes
  )
  SELECT
    NEW.tenant_id,
    NEW.employee_id,
    NULL,
    NEW.leave_starts_on,
    NEW.leave_ends_on,
    NEW.granted_days,
    'ACTIVE'::"RecordStatus",
    'Medical leave generated from official pericia opinion ' || NEW.id::text
  WHERE NOT EXISTS (
    SELECT 1
    FROM hr.leave_record leave_row
    WHERE leave_row.tenant_id = NEW.tenant_id
      AND leave_row.employee_id = NEW.employee_id
      AND leave_row.starts_on = NEW.leave_starts_on
      AND leave_row.ends_on IS NOT DISTINCT FROM NEW.leave_ends_on
      AND leave_row.notes = 'Medical leave generated from official pericia opinion ' || NEW.id::text
  )
  RETURNING id INTO v_leave_record_id;

  UPDATE hr.employee
  SET lifecycle_status = 'ON_LEAVE'::"EmployeeLifecycleStatus",
      updated_at = now()
  WHERE id = NEW.employee_id
    AND tenant_id = NEW.tenant_id;

  PERFORM public.sgp_append_audit_event(
    'CREATE',
    'hr.medical_leave',
    v_leave_id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    'hr.medical_leave',
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object(
      'medicalRecordId', NEW.id,
      'leaveRecordId', v_leave_record_id,
      'decision', NEW.decision,
      'grantedDays', NEW.granted_days,
      'cidCode', NEW.cid_code,
      'cidSecondary', NEW.cid_secondary
    ),
    NULL::text,
    NULL::text,
    NULL::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hr04_medical_record_conclude ON hr.medical_record;
CREATE TRIGGER hr04_medical_record_conclude
  AFTER INSERT OR UPDATE OF decision ON hr.medical_record
  FOR EACH ROW
  WHEN (NEW.decision = 'granted')
  EXECUTE FUNCTION hr.sgp_hr04_medical_record_conclude();

CREATE OR REPLACE FUNCTION hr.sgp_hr04_row_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_action text;
  v_row record;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  PERFORM public.sgp_append_audit_event(
    v_action,
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
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS hr04_medical_appointment_audit ON hr.medical_appointment;
CREATE TRIGGER hr04_medical_appointment_audit
  AFTER INSERT OR UPDATE OR DELETE ON hr.medical_appointment
  FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr04_row_audit();

DROP TRIGGER IF EXISTS hr04_medical_record_audit ON hr.medical_record;
CREATE TRIGGER hr04_medical_record_audit
  AFTER INSERT OR UPDATE OR DELETE ON hr.medical_record
  FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr04_row_audit();

DROP TRIGGER IF EXISTS hr04_leave_record_audit ON hr.leave_record;
CREATE TRIGGER hr04_leave_record_audit
  AFTER INSERT OR UPDATE OR DELETE ON hr.leave_record
  FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr04_row_audit();

ALTER TABLE hr.medical_appointment ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.medical_appointment FORCE ROW LEVEL SECURITY;
ALTER TABLE hr.medical_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.medical_record FORCE ROW LEVEL SECURITY;
ALTER TABLE hr.medical_leave ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.medical_leave FORCE ROW LEVEL SECURITY;
ALTER TABLE hr.leave_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.leave_record FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_medical_appointment_select ON hr.medical_appointment;
DROP POLICY IF EXISTS p_medical_appointment_write ON hr.medical_appointment;
CREATE POLICY p_medical_appointment_select ON hr.medical_appointment
  FOR SELECT
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.read', 'saude.appointment.write'])
  );
CREATE POLICY p_medical_appointment_write ON hr.medical_appointment
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.appointment.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.appointment.write'])
  );

DROP POLICY IF EXISTS p_medical_record_select ON hr.medical_record;
DROP POLICY IF EXISTS p_medical_record_write ON hr.medical_record;
CREATE POLICY p_medical_record_select ON hr.medical_record
  FOR SELECT
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.read', 'saude.opinion.write'])
  );
CREATE POLICY p_medical_record_write ON hr.medical_record
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.opinion.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.opinion.write'])
  );

DROP POLICY IF EXISTS p_medical_leave_select ON hr.medical_leave;
DROP POLICY IF EXISTS p_medical_leave_write ON hr.medical_leave;
CREATE POLICY p_medical_leave_select ON hr.medical_leave
  FOR SELECT
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['rh.medical_leave.read', 'saude.read', 'saude.opinion.write'])
  );
CREATE POLICY p_medical_leave_write ON hr.medical_leave
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.opinion.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.opinion.write'])
  );

DROP POLICY IF EXISTS p_leave_record_select ON hr.leave_record;
DROP POLICY IF EXISTS p_leave_record_write ON hr.leave_record;
CREATE POLICY p_leave_record_select ON hr.leave_record
  FOR SELECT
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['rh.medical_leave.read', 'rh.read', 'rh.write'])
  );
CREATE POLICY p_leave_record_write ON hr.leave_record
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.opinion.write', 'rh.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.opinion.write', 'rh.write'])
  );

WITH hr04_permissions(key, module_key, resource_key, action_key, route_pattern, description) AS (
  VALUES
    ('saude.appointment.write', 'saude', 'appointment', 'write', '/api/v1/licencas/saude/agendamento', 'Schedule official medical pericia appointments.'),
    ('saude.opinion.write', 'saude', 'opinion', 'write', '/api/v1/pericia/**', 'Record official medical pericia opinions.'),
    ('rh.medical_leave.read', 'rh', 'medical_leave', 'read', '/api/v1/licencas/saude/**', 'Read employee medical leave records.')
)
INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
SELECT key, module_key, resource_key, action_key, route_pattern, description
FROM hr04_permissions
ON CONFLICT (key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description;

INSERT INTO public.profile_permission (profile_id, permission_id, allowed)
SELECT ap.id, p.id, true
FROM public.access_profile ap
CROSS JOIN public.permission p
WHERE ap.tenant_id = public.sgp_current_tenant_uuid()
  AND ap.code IN ('ADMIN', 'RH_OPERADOR')
  AND p.key IN ('saude.appointment.write', 'saude.opinion.write', 'rh.medical_leave.read')
ON CONFLICT (profile_id, permission_id) DO UPDATE
SET allowed = EXCLUDED.allowed;
