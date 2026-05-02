-- HR-05 general non-medical leave catalog, eligibility, audit, and RLS.

ALTER TABLE hr.leave_record
  ADD COLUMN IF NOT EXISTS paid boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS requested_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by text,
  ADD COLUMN IF NOT EXISTS supporting_document_ref text;

CREATE INDEX IF NOT EXISTS leave_record_tenant_reason_starts_idx
  ON hr.leave_record(tenant_id, absence_reason_id, starts_on DESC);
CREATE INDEX IF NOT EXISTS leave_record_paid_idx
  ON hr.leave_record(paid);

CREATE OR REPLACE FUNCTION hr.f_leave_reason_max_days(p_reason_code text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_reason_code
    WHEN 'maternidade' THEN 180
    WHEN 'empresa_cidada_extension' THEN 60
    WHEN 'paternidade' THEN 5
    WHEN 'paternidade_empresa_cidada' THEN 20
    WHEN 'adotante' THEN 120
    WHEN 'premio' THEN 90
    WHEN 'capacitacao' THEN 90
    WHEN 'falecimento' THEN 8
    WHEN 'doacao_sangue' THEN 1
    WHEN 'pessoa_familia' THEN 30
    ELSE NULL
  END
$$;

CREATE OR REPLACE FUNCTION hr.f_validate_leave_eligibility(
  p_employee_id uuid,
  p_reason_code text,
  p_start_date date,
  p_days integer,
  p_supporting_document_ref text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_employee hr.employee%ROWTYPE;
  v_service_days integer;
  v_max_days integer;
BEGIN
  IF p_employee_id IS NULL OR p_reason_code IS NULL OR p_start_date IS NULL OR p_days IS NULL THEN
    RAISE EXCEPTION 'employee_id, reason, start_date, and days are required' USING ERRCODE = '23514';
  END IF;
  IF p_days < 1 THEN
    RAISE EXCEPTION 'leave days must be positive' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_employee
  FROM hr.employee
  WHERE id = p_employee_id
    AND tenant_id = public.sgp_current_tenant_uuid()
    AND lifecycle_status <> 'TERMINATED'::"EmployeeLifecycleStatus";
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee not found or inactive for current tenant' USING ERRCODE = '23503';
  END IF;

  v_max_days := hr.f_leave_reason_max_days(p_reason_code);
  IF v_max_days IS NOT NULL AND p_days > v_max_days THEN
    RAISE EXCEPTION 'Leave reason % allows at most % days, received %', p_reason_code, v_max_days, p_days
      USING ERRCODE = '23514';
  END IF;

  IF p_reason_code IN ('capacitacao', 'premio') THEN
    SELECT COALESCE(SUM(COALESCE(days_count, (COALESCE(ends_on, p_start_date) - starts_on + 1))), 0)::integer
    INTO v_service_days
    FROM hr.service_time_record
    WHERE employee_id = p_employee_id
      AND tenant_id = v_employee.tenant_id
      AND starts_on <= p_start_date;

    IF v_service_days < 1825 THEN
      RAISE EXCEPTION 'Leave reason % requires at least five years of service', p_reason_code
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF p_reason_code IN ('conjuge', 'adotante', 'paternidade_empresa_cidada')
     AND NULLIF(trim(COALESCE(p_supporting_document_ref, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Leave reason % requires supporting document', p_reason_code
      USING ERRCODE = '23514';
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION hr.sgp_hr05_leave_record_validate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_reason_code text;
BEGIN
  SELECT code INTO v_reason_code
  FROM hr.absence_reason
  WHERE id = NEW.absence_reason_id
    AND tenant_id = NEW.tenant_id;

  IF NEW.absence_reason_id IS NULL
     AND NEW.notes LIKE 'Medical leave generated from official pericia opinion %' THEN
    RETURN NEW;
  END IF;

  IF v_reason_code IS NULL THEN
    RAISE EXCEPTION 'leave_record requires a tenant-scoped absence reason' USING ERRCODE = '23514';
  END IF;

  PERFORM hr.f_validate_leave_eligibility(
    NEW.employee_id,
    v_reason_code,
    NEW.starts_on,
    COALESCE(NEW.days, NEW.ends_on - NEW.starts_on + 1),
    NEW.supporting_document_ref
  );

  IF v_reason_code = 'interesse_particular' THEN
    NEW.paid := false;
  END IF;
  IF NEW.ends_on IS NULL THEN
    NEW.ends_on := NEW.starts_on + (COALESCE(NEW.days, 1) - 1);
  END IF;
  IF NEW.days IS NULL THEN
    NEW.days := NEW.ends_on - NEW.starts_on + 1;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hr05_leave_record_validate ON hr.leave_record;
CREATE TRIGGER hr05_leave_record_validate
  BEFORE INSERT OR UPDATE OF absence_reason_id, starts_on, ends_on, days, supporting_document_ref, paid
  ON hr.leave_record
  FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr05_leave_record_validate();

CREATE OR REPLACE FUNCTION hr.sgp_hr05_leave_record_approval_history()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_status_id uuid;
BEGIN
  IF NEW.approved_at IS NULL OR OLD.approved_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_status_id
  FROM hr.functional_status
  WHERE tenant_id = NEW.tenant_id
    AND code IN ('ON_LEAVE', 'AFASTADO', 'LICENCA')
    AND status = 'ACTIVE'::"RecordStatus"
  ORDER BY CASE code WHEN 'ON_LEAVE' THEN 1 WHEN 'AFASTADO' THEN 2 ELSE 3 END
  LIMIT 1;

  IF v_status_id IS NOT NULL THEN
    INSERT INTO hr.employee_status_history (
      tenant_id,
      employee_id,
      functional_status_id,
      starts_on,
      ends_on,
      notes
    )
    VALUES (
      NEW.tenant_id,
      NEW.employee_id,
      v_status_id,
      NEW.starts_on,
      NEW.ends_on,
      'Licenca aprovada: ' || NEW.id::text
    );
  END IF;

  PERFORM public.sgp_append_audit_event(
    'UPDATE',
    'hr.leave_record',
    NEW.id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    'hr.leave_record',
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('approvedAt', NEW.approved_at, 'employeeId', NEW.employee_id),
    NULL::text,
    NULL::text,
    NULL::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hr05_leave_record_approval_history ON hr.leave_record;
CREATE TRIGGER hr05_leave_record_approval_history
  AFTER UPDATE OF approved_at ON hr.leave_record
  FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr05_leave_record_approval_history();

ALTER TABLE hr.leave_record
  DROP CONSTRAINT IF EXISTS leave_record_days_positive_check,
  ADD CONSTRAINT leave_record_days_positive_check CHECK (days IS NULL OR days > 0),
  DROP CONSTRAINT IF EXISTS leave_record_dates_check,
  ADD CONSTRAINT leave_record_dates_check CHECK (ends_on IS NULL OR ends_on >= starts_on);

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  ('rh.leave.request', 'rh', 'leave', 'request', '/api/v1/licencas', 'Request general employee leaves.'),
  ('rh.leave.approve', 'rh', 'leave', 'approve', '/api/v1/licencas/*/aprovar', 'Approve or cancel general employee leaves.'),
  ('rh.leave.read', 'rh', 'leave', 'read', '/api/v1/licencas/**', 'Read general employee leaves.')
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
  AND p.key IN ('rh.leave.request', 'rh.leave.approve', 'rh.leave.read')
ON CONFLICT (profile_id, permission_id) DO UPDATE
SET allowed = EXCLUDED.allowed;

ALTER TABLE hr.leave_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.leave_record FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_leave_record_select ON hr.leave_record;
DROP POLICY IF EXISTS p_leave_record_write ON hr.leave_record;
CREATE POLICY p_leave_record_select ON hr.leave_record
  FOR SELECT
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['rh.leave.read', 'rh.leave.request', 'rh.leave.approve', 'rh.medical_leave.read', 'rh.read', 'rh.write'])
  );
CREATE POLICY p_leave_record_write ON hr.leave_record
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['rh.leave.request', 'rh.leave.approve', 'saude.opinion.write', 'rh.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['rh.leave.request', 'rh.leave.approve', 'saude.opinion.write', 'rh.write'])
  );

DROP POLICY IF EXISTS p_leave_status_history_write ON hr.employee_status_history;
CREATE POLICY p_leave_status_history_write ON hr.employee_status_history
  FOR INSERT
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['rh.leave.approve', 'rh.write'])
  );
