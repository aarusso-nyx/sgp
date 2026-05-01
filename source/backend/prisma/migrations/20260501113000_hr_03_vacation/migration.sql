-- HR-03 vacation balance, scheduling, approval, and audit.

ALTER TABLE hr.vacation_record
  ADD COLUMN IF NOT EXISTS accrual_period_start date,
  ADD COLUMN IF NOT EXISTS accrual_period_end date,
  ADD COLUMN IF NOT EXISTS installment_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pecuniary_bonus_days integer NOT NULL DEFAULT 0;

UPDATE hr.vacation_record
SET
  accrual_period_start = COALESCE(accrual_period_start, accrual_start_on),
  accrual_period_end = COALESCE(accrual_period_end, accrual_end_on);

DROP VIEW IF EXISTS hr.v_employee_career_history;

ALTER TABLE hr.vacation_record
  ALTER COLUMN status TYPE text USING
    CASE status::text
      WHEN 'ACTIVE' THEN 'programado'
      WHEN 'INACTIVE' THEN 'cancelado'
      ELSE lower(status::text)
    END,
  ALTER COLUMN status SET DEFAULT 'programado';

ALTER TABLE hr.vacation_record
  DROP CONSTRAINT IF EXISTS vacation_record_status_check,
  ADD CONSTRAINT vacation_record_status_check
    CHECK (status IN ('programado', 'aprovado', 'gozado', 'cancelado')),
  DROP CONSTRAINT IF EXISTS vacation_record_installment_number_check,
  ADD CONSTRAINT vacation_record_installment_number_check
    CHECK (installment_number BETWEEN 1 AND 3),
  DROP CONSTRAINT IF EXISTS vacation_record_pecuniary_bonus_days_check,
  ADD CONSTRAINT vacation_record_pecuniary_bonus_days_check
    CHECK (pecuniary_bonus_days BETWEEN 0 AND 10),
  DROP CONSTRAINT IF EXISTS vacation_record_accrual_period_dates_check,
  ADD CONSTRAINT vacation_record_accrual_period_dates_check
    CHECK (
      accrual_period_start IS NULL
      OR accrual_period_end IS NULL
      OR accrual_period_end >= accrual_period_start
    );

CREATE INDEX IF NOT EXISTS vacation_record_tenant_accrual_period_idx
  ON hr.vacation_record(tenant_id, employee_id, accrual_period_start, accrual_period_end);
CREATE INDEX IF NOT EXISTS vacation_record_status_text_idx
  ON hr.vacation_record(status);

CREATE OR REPLACE VIEW hr.v_employee_career_history AS
SELECT
  history.tenant_id,
  history.employee_id,
  history.id AS event_id,
  'functional_status'::text AS event_type,
  history.starts_on AS event_date,
  history.ends_on,
  status.description AS title,
  history.notes,
  jsonb_build_object('functionalStatusId', history.functional_status_id, 'reasonId', history.reason_id) AS metadata
FROM hr.employee_status_history history
JOIN hr.functional_status status ON status.id = history.functional_status_id
UNION ALL
SELECT tenant_id, employee_id, id, 'vacation', starts_on, ends_on, 'Ferias', ''::text,
  jsonb_build_object('days', days, 'status', status::text)
FROM hr.vacation_record
UNION ALL
SELECT leave_record.tenant_id, leave_record.employee_id, leave_record.id, 'leave', leave_record.starts_on, leave_record.ends_on,
  COALESCE(reason.description, 'Licenca'), leave_record.notes,
  jsonb_build_object('days', leave_record.days, 'status', leave_record.status::text, 'absenceReasonId', leave_record.absence_reason_id)
FROM hr.leave_record
LEFT JOIN hr.absence_reason reason ON reason.id = leave_record.absence_reason_id
UNION ALL
SELECT tenant_id, employee_id, id, 'medical_leave', starts_on, ends_on, 'Licenca medica', ''::text,
  jsonb_build_object('days', granted_days, 'status', status::text)
FROM hr.medical_leave
UNION ALL
SELECT tenant_id, employee_id, id, 'service_time', starts_on, ends_on, source, notes,
  jsonb_build_object('daysCount', days_count)
FROM hr.service_time_record
ORDER BY event_date DESC, event_id DESC;

CREATE OR REPLACE VIEW hr.v_vacation_balance AS
WITH active_contract AS (
  SELECT DISTINCT ON (contract.employee_id)
    contract.tenant_id,
    contract.employee_id,
    COALESCE(contract.exercise_on, contract.starts_on) AS exercise_on
  FROM hr.employment_contract contract
  WHERE contract.status = 'ACTIVE'::"RecordStatus"
  ORDER BY contract.employee_id, contract.starts_on DESC
),
periods AS (
  SELECT
    contract.tenant_id,
    contract.employee_id,
    (contract.exercise_on + (series.n || ' years')::interval)::date AS accrual_period_start,
    (contract.exercise_on + ((series.n + 1) || ' years')::interval - interval '1 day')::date AS accrual_period_end
  FROM active_contract contract
  CROSS JOIN LATERAL generate_series(
    0,
    GREATEST(0, EXTRACT(year FROM age(CURRENT_DATE, contract.exercise_on))::integer)
  ) AS series(n)
  WHERE contract.exercise_on IS NOT NULL
)
SELECT
  periods.tenant_id,
  periods.employee_id,
  periods.accrual_period_start,
  periods.accrual_period_end,
  CASE WHEN CURRENT_DATE > periods.accrual_period_end THEN 30 ELSE 0 END::integer AS accrued_days,
  COALESCE(SUM(record.days) FILTER (WHERE record.status IN ('aprovado', 'gozado')), 0)::integer AS used_days,
  COALESCE(SUM(record.pecuniary_bonus_days) FILTER (WHERE record.status IN ('aprovado', 'gozado')), 0)::integer AS pecuniary_bonus_days,
  GREATEST(
    CASE WHEN CURRENT_DATE > periods.accrual_period_end THEN 30 ELSE 0 END
      - COALESCE(SUM(record.days) FILTER (WHERE record.status IN ('aprovado', 'gozado')), 0)
      - COALESCE(SUM(record.pecuniary_bonus_days) FILTER (WHERE record.status IN ('aprovado', 'gozado')), 0),
    0
  )::integer AS available_days
FROM periods
LEFT JOIN hr.vacation_record record
  ON record.tenant_id = periods.tenant_id
 AND record.employee_id = periods.employee_id
 AND record.accrual_period_start = periods.accrual_period_start
 AND record.accrual_period_end = periods.accrual_period_end
 AND record.status <> 'cancelado'
GROUP BY
  periods.tenant_id,
  periods.employee_id,
  periods.accrual_period_start,
  periods.accrual_period_end;

CREATE OR REPLACE FUNCTION hr.f_calculate_vacation_balance(
  p_employee_id uuid,
  p_ref_date date DEFAULT CURRENT_DATE
) RETURNS TABLE (
  employee_id uuid,
  accrual_period_start date,
  accrual_period_end date,
  accrued_days integer,
  used_days integer,
  pecuniary_bonus_days integer,
  available_days integer
)
LANGUAGE sql
STABLE
AS $$
WITH active_contract AS (
  SELECT
    contract.tenant_id,
    contract.employee_id,
    COALESCE(contract.exercise_on, contract.starts_on) AS exercise_on
  FROM hr.employment_contract contract
  WHERE contract.employee_id = p_employee_id
    AND contract.status = 'ACTIVE'::"RecordStatus"
  ORDER BY contract.starts_on DESC
  LIMIT 1
),
periods AS (
  SELECT
    contract.tenant_id,
    contract.employee_id,
    (contract.exercise_on + (series.n || ' years')::interval)::date AS accrual_period_start,
    (contract.exercise_on + ((series.n + 1) || ' years')::interval - interval '1 day')::date AS accrual_period_end
  FROM active_contract contract
  CROSS JOIN LATERAL generate_series(
    0,
    GREATEST(0, EXTRACT(year FROM age(p_ref_date, contract.exercise_on))::integer)
  ) AS series(n)
  WHERE contract.exercise_on IS NOT NULL
)
SELECT
  periods.employee_id,
  periods.accrual_period_start,
  periods.accrual_period_end,
  CASE WHEN p_ref_date > periods.accrual_period_end THEN 30 ELSE 0 END::integer AS accrued_days,
  COALESCE(SUM(record.days) FILTER (WHERE record.status IN ('aprovado', 'gozado')), 0)::integer AS used_days,
  COALESCE(SUM(record.pecuniary_bonus_days) FILTER (WHERE record.status IN ('aprovado', 'gozado')), 0)::integer AS pecuniary_bonus_days,
  GREATEST(
    CASE WHEN p_ref_date > periods.accrual_period_end THEN 30 ELSE 0 END
      - COALESCE(SUM(record.days) FILTER (WHERE record.status IN ('aprovado', 'gozado')), 0)
      - COALESCE(SUM(record.pecuniary_bonus_days) FILTER (WHERE record.status IN ('aprovado', 'gozado')), 0),
    0
  )::integer AS available_days
FROM periods
LEFT JOIN hr.vacation_record record
  ON record.tenant_id = periods.tenant_id
 AND record.employee_id = periods.employee_id
 AND record.accrual_period_start = periods.accrual_period_start
 AND record.accrual_period_end = periods.accrual_period_end
 AND record.status <> 'cancelado'
GROUP BY periods.employee_id, periods.accrual_period_start, periods.accrual_period_end
ORDER BY periods.accrual_period_start DESC;
$$;

CREATE OR REPLACE FUNCTION hr.sgp_hr03_vacation_record_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_action text;
  v_row hr.vacation_record%ROWTYPE;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  PERFORM public.sgp_append_audit_event(
    v_action,
    'hr.vacation_record'::text,
    v_row.id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    'hr.vacation_record'::text,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object(
      'operation', TG_OP,
      'old', CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
      'new', CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    ),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END;
$$;

DROP TRIGGER IF EXISTS hr03_vacation_record_audit ON hr.vacation_record;
CREATE TRIGGER hr03_vacation_record_audit
  AFTER INSERT OR UPDATE OR DELETE ON hr.vacation_record
  FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr03_vacation_record_audit();

ALTER TABLE hr.vacation_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.vacation_record FORCE ROW LEVEL SECURITY;
ALTER TABLE hr.vacation_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.vacation_type FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_vacation_record_select ON hr.vacation_record;
DROP POLICY IF EXISTS p_vacation_record_write ON hr.vacation_record;
CREATE POLICY p_vacation_record_select ON hr.vacation_record
  FOR SELECT
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['rh.vacation.read', 'rh.vacation.request', 'rh.vacation.approve'])
  );
CREATE POLICY p_vacation_record_write ON hr.vacation_record
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['rh.vacation.request', 'rh.vacation.approve'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['rh.vacation.request', 'rh.vacation.approve'])
  );

DROP POLICY IF EXISTS p_vacation_type_select ON hr.vacation_type;
DROP POLICY IF EXISTS p_vacation_type_write ON hr.vacation_type;
CREATE POLICY p_vacation_type_select ON hr.vacation_type
  FOR SELECT
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['rh.vacation.read', 'rh.vacation.request', 'rh.vacation.approve', 'gestao.master_data.read'])
  );
CREATE POLICY p_vacation_type_write ON hr.vacation_type
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['gestao.master_data.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['gestao.master_data.write'])
  );

WITH hr03_permissions(key, module_key, resource_key, action_key, route_pattern, description) AS (
  VALUES
    ('rh.vacation.read', 'rh', 'vacation', 'read', '/api/v1/ferias/**', 'Read employee vacation balances and schedules.'),
    ('rh.vacation.request', 'rh', 'vacation', 'request', '/api/v1/ferias/programacao', 'Request an employee vacation schedule.'),
    ('rh.vacation.approve', 'rh', 'vacation', 'approve', '/api/v1/ferias/programacao/**', 'Approve or cancel employee vacation schedules.')
)
INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
SELECT key, module_key, resource_key, action_key, route_pattern, description
FROM hr03_permissions
ON CONFLICT (key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description;

INSERT INTO public.profile_permission (profile_id, permission_id, allowed)
SELECT profile.id, permission.id, true
FROM public.access_profile profile
JOIN public.permission permission ON permission.key IN (
  'rh.vacation.read',
  'rh.vacation.request',
  'rh.vacation.approve'
)
WHERE profile.tenant_id = public.sgp_current_tenant_uuid()
  AND profile.code IN ('ADMIN', 'RH_OPERADOR')
ON CONFLICT (profile_id, permission_id) DO UPDATE SET allowed = true;
