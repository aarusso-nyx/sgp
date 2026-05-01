-- HR-08 functional history and statutory probation.

CREATE OR REPLACE FUNCTION hr.sgp_hr08_status_history_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'employee_status_history is append-only' USING ERRCODE = '0A000';
END;
$$;

DROP TRIGGER IF EXISTS hr08_status_history_immutable ON hr.employee_status_history;
CREATE TRIGGER hr08_status_history_immutable
  BEFORE UPDATE OR DELETE ON hr.employee_status_history
  FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr08_status_history_immutable();

REVOKE UPDATE, DELETE ON hr.employee_status_history FROM PUBLIC;
REVOKE UPDATE, DELETE ON hr.employee_status_history FROM sgp_app_role;

CREATE TABLE IF NOT EXISTS hr.probation_evaluation (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  score numeric(5,2) NOT NULL,
  decision text NOT NULL,
  evaluator_id uuid,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT probation_evaluation_pkey PRIMARY KEY (id),
  CONSTRAINT probation_evaluation_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id),
  CONSTRAINT probation_evaluation_employee_fkey FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT probation_evaluation_dates_check CHECK (period_end >= period_start),
  CONSTRAINT probation_evaluation_score_check CHECK (score >= 0 AND score <= 10),
  CONSTRAINT probation_evaluation_decision_check CHECK (decision IN ('pending', 'approved', 'rejected', 'extended'))
);

CREATE INDEX IF NOT EXISTS probation_evaluation_tenant_employee_idx
  ON hr.probation_evaluation(tenant_id, employee_id, period_end DESC);
CREATE INDEX IF NOT EXISTS probation_evaluation_decision_idx
  ON hr.probation_evaluation(decision);

CREATE OR REPLACE FUNCTION hr.sgp_hr08_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hr08_probation_evaluation_updated_at ON hr.probation_evaluation;
CREATE TRIGGER hr08_probation_evaluation_updated_at
  BEFORE UPDATE ON hr.probation_evaluation
  FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr08_set_updated_at();

CREATE OR REPLACE FUNCTION hr.sgp_hr08_probation_statutory_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM hr.employee employee
    LEFT JOIN hr.employment_link link ON link.id = employee.employment_link_id
    WHERE employee.id = NEW.employee_id
      AND employee.tenant_id = NEW.tenant_id
      AND COALESCE(link.contract_type, 'statutory') = 'statutory'
  ) THEN
    RAISE EXCEPTION 'probation_evaluation requires a statutory employee' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hr08_probation_statutory_only ON hr.probation_evaluation;
CREATE TRIGGER hr08_probation_statutory_only
  BEFORE INSERT OR UPDATE ON hr.probation_evaluation
  FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr08_probation_statutory_only();

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

ALTER TABLE hr.probation_evaluation ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.probation_evaluation FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_probation_evaluation_select ON hr.probation_evaluation;
DROP POLICY IF EXISTS p_probation_evaluation_write ON hr.probation_evaluation;
CREATE POLICY p_probation_evaluation_select ON hr.probation_evaluation
  FOR SELECT
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['avaliacao.read', 'avaliacao.probation.write'])
  );
CREATE POLICY p_probation_evaluation_write ON hr.probation_evaluation
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['avaliacao.probation.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['avaliacao.probation.write'])
  );

DROP POLICY IF EXISTS hr08_service_time_select ON hr.service_time_record;
DROP POLICY IF EXISTS hr08_service_time_write ON hr.service_time_record;
CREATE POLICY hr08_service_time_select ON hr.service_time_record
  FOR SELECT
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['rh.history.read', 'rh.employee.read'])
  );
CREATE POLICY hr08_service_time_write ON hr.service_time_record
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['rh.employee.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['rh.employee.write'])
  );

WITH hr08_permissions(key, module_key, resource_key, action_key, route_pattern, description) AS (
  VALUES
    ('rh.history.read', 'rh', 'history', 'read', '/api/v1/funcionarios/**/historico', 'Read immutable functional history timeline.'),
    ('avaliacao.probation.write', 'avaliacao', 'probation', 'write', '/api/v1/avaliacao/estagio-probatorio/**', 'Create statutory probation evaluations.')
), updated_by_key AS (
  UPDATE public.permission p
  SET module_key = hp.module_key,
      resource_key = hp.resource_key,
      action_key = hp.action_key,
      route_pattern = hp.route_pattern,
      description = hp.description,
      updated_at = now()
  FROM hr08_permissions hp
  WHERE p.key = hp.key
  RETURNING p.key
)
INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
SELECT key, module_key, resource_key, action_key, route_pattern, description
FROM hr08_permissions hp
WHERE NOT EXISTS (SELECT 1 FROM updated_by_key updated WHERE updated.key = hp.key);
