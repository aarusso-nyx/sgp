CREATE OR REPLACE FUNCTION ponto.fn_night_minutes_reduced(
  p_started_at timestamp,
  p_finished_at timestamp
)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_cursor date;
  v_end_date date;
  v_window_start timestamp;
  v_window_end timestamp;
  v_overlap_seconds numeric := 0;
BEGIN
  IF p_finished_at <= p_started_at THEN
    RETURN 0;
  END IF;

  v_cursor := (p_started_at::date - 1);
  v_end_date := p_finished_at::date;

  WHILE v_cursor <= v_end_date LOOP
    v_window_start := v_cursor::timestamp + time '22:00';
    v_window_end := (v_cursor + 1)::timestamp + time '05:00';
    v_overlap_seconds := v_overlap_seconds + GREATEST(
      0,
      EXTRACT(EPOCH FROM LEAST(p_finished_at, v_window_end) - GREATEST(p_started_at, v_window_start))
    );
    v_cursor := v_cursor + 1;
  END LOOP;

  RETURN CEIL((v_overlap_seconds / 60.0) * (60.0 / 52.5))::integer;
END;
$$;

CREATE OR REPLACE FUNCTION ponto.fn_aggregate_timesheet(
  p_tenant_id uuid,
  p_employee_id uuid,
  p_period_start date,
  p_period_end date
)
RETURNS TABLE (
  tenant_id uuid,
  employee_id uuid,
  period_start date,
  period_end date,
  worked_minutes integer,
  expected_minutes integer,
  overtime_50_minutes integer,
  overtime_100_minutes integer,
  night_minutes integer,
  late_minutes integer,
  absence_unpaid_minutes integer,
  absence_paid_minutes integer,
  hour_bank_settlement_minutes integer
)
LANGUAGE sql
STABLE
AS $$
  WITH tenant_context AS (
    SELECT tenant.id AS tenant_id,
           tenant.tenant_timezone
    FROM public.tenant tenant
    WHERE tenant.id = p_tenant_id
  ),
  bounds AS (
    SELECT ctx.tenant_id,
           ctx.tenant_timezone,
           p_employee_id AS employee_id,
           p_period_start AS period_start,
           p_period_end AS period_end,
           (p_period_start::timestamp AT TIME ZONE ctx.tenant_timezone) AS utc_start,
           ((p_period_end + 1)::timestamp AT TIME ZONE ctx.tenant_timezone) AS utc_end
    FROM tenant_context ctx
  ),
  records AS (
    SELECT record.recorded_at,
           record.recorded_at AT TIME ZONE bounds.tenant_timezone AS local_recorded_at,
           (record.recorded_at AT TIME ZONE bounds.tenant_timezone)::date AS local_work_date,
           row_number() OVER (
             PARTITION BY (record.recorded_at AT TIME ZONE bounds.tenant_timezone)::date
             ORDER BY record.recorded_at, record.time_record_id
           ) AS record_index,
           lead(record.recorded_at) OVER (
             PARTITION BY (record.recorded_at AT TIME ZONE bounds.tenant_timezone)::date
             ORDER BY record.recorded_at, record.time_record_id
           ) AS next_recorded_at,
           lead(record.recorded_at AT TIME ZONE bounds.tenant_timezone) OVER (
             PARTITION BY (record.recorded_at AT TIME ZONE bounds.tenant_timezone)::date
             ORDER BY record.recorded_at, record.time_record_id
           ) AS next_local_recorded_at
    FROM ponto.time_record record
    JOIN bounds ON bounds.tenant_id = record.tenant_id
    WHERE record.employee_id = bounds.employee_id
      AND record.recorded_at >= bounds.utc_start
      AND record.recorded_at < bounds.utc_end
  ),
  worked_by_day AS (
    SELECT local_work_date,
           COALESCE(SUM(
             CASE
               WHEN record_index % 2 = 1 AND next_recorded_at IS NOT NULL
                 THEN GREATEST(0, FLOOR(EXTRACT(EPOCH FROM next_recorded_at - recorded_at) / 60))::integer
               ELSE 0
             END
           ), 0)::integer AS worked_minutes,
           COALESCE(SUM(
             CASE
               WHEN record_index % 2 = 1 AND next_local_recorded_at IS NOT NULL
                 THEN ponto.fn_night_minutes_reduced(local_recorded_at, next_local_recorded_at)
               ELSE 0
             END
           ), 0)::integer AS night_minutes
    FROM records
    GROUP BY local_work_date
  ),
  roster_expected AS (
    SELECT entry.work_date,
           COALESCE(MAX(entry.expected_minutes), 0)::integer AS expected_minutes
    FROM ponto.duty_roster_entry entry
    JOIN ponto.duty_roster roster
      ON roster.duty_roster_id = entry.duty_roster_id
     AND roster.tenant_id = entry.tenant_id
    WHERE entry.tenant_id = p_tenant_id
      AND entry.employee_id = p_employee_id
      AND entry.work_date BETWEEN p_period_start AND p_period_end
      AND roster.status IN ('PUBLISHED'::ponto.duty_roster_status, 'LOCKED'::ponto.duty_roster_status)
    GROUP BY entry.work_date
  ),
  expected_by_day AS (
    SELECT day::date AS work_date,
           COALESCE(roster.expected_minutes, 0)::integer AS expected_minutes
    FROM generate_series(p_period_start, p_period_end, interval '1 day') AS day
    LEFT JOIN roster_expected roster ON roster.work_date = day::date
  ),
  paid_justifications AS (
    SELECT day::date AS work_date,
           COALESCE(SUM(
             CASE
               WHEN justification.payroll_treatment = 'PAID'::ponto.absence_payroll_treatment
                 THEN GREATEST(0, EXTRACT(EPOCH FROM (
                   LEAST(justification.absence_end, ((day::date + 1)::timestamp AT TIME ZONE bounds.tenant_timezone))
                   - GREATEST(justification.absence_start, (day::date::timestamp AT TIME ZONE bounds.tenant_timezone))
                 )) / 60)
               ELSE 0
             END
           ), 0)::integer AS paid_minutes,
           COALESCE(SUM(
             CASE
               WHEN justification.payroll_treatment = 'UNPAID'::ponto.absence_payroll_treatment
                 THEN GREATEST(0, EXTRACT(EPOCH FROM (
                   LEAST(justification.absence_end, ((day::date + 1)::timestamp AT TIME ZONE bounds.tenant_timezone))
                   - GREATEST(justification.absence_start, (day::date::timestamp AT TIME ZONE bounds.tenant_timezone))
                 )) / 60)
               ELSE 0
             END
           ), 0)::integer AS unpaid_minutes
    FROM bounds
    CROSS JOIN generate_series(p_period_start, p_period_end, interval '1 day') AS day
    LEFT JOIN ponto.absence_justification justification
      ON justification.tenant_id = bounds.tenant_id
     AND justification.employee_id = bounds.employee_id
     AND justification.status = 'APPROVED'::ponto.absence_justification_status
     AND justification.absence_start < ((day::date + 1)::timestamp AT TIME ZONE bounds.tenant_timezone)
     AND justification.absence_end >= (day::date::timestamp AT TIME ZONE bounds.tenant_timezone)
    GROUP BY day::date
  ),
  hour_bank_settlement AS (
    SELECT COALESCE(SUM(ABS(movement.minutes)), 0)::integer AS minutes
    FROM ponto.hour_bank bank
    JOIN ponto.hour_bank_movement movement
      ON movement.tenant_id = bank.tenant_id
     AND movement.hour_bank_id = bank.hour_bank_id
    WHERE bank.tenant_id = p_tenant_id
      AND bank.employee_id = p_employee_id
      AND movement.work_date BETWEEN p_period_start AND p_period_end
      AND movement.kind IN (
        'SETTLEMENT_OVERTIME'::ponto.hour_bank_movement_kind,
        'SETTLEMENT_DEDUCTION'::ponto.hour_bank_movement_kind
      )
  ),
  daily AS (
    SELECT expected.work_date,
           expected.expected_minutes,
           COALESCE(worked.worked_minutes, 0)::integer AS worked_minutes,
           COALESCE(worked.night_minutes, 0)::integer AS night_minutes,
           COALESCE(justification.paid_minutes, 0)::integer AS paid_minutes,
           COALESCE(justification.unpaid_minutes, 0)::integer AS explicit_unpaid_minutes
    FROM expected_by_day expected
    LEFT JOIN worked_by_day worked ON worked.local_work_date = expected.work_date
    LEFT JOIN paid_justifications justification ON justification.work_date = expected.work_date
  )
  SELECT p_tenant_id,
         p_employee_id,
         p_period_start,
         p_period_end,
         COALESCE(SUM(daily.worked_minutes), 0)::integer AS worked_minutes,
         COALESCE(SUM(daily.expected_minutes), 0)::integer AS expected_minutes,
         COALESCE(SUM(
           CASE
             WHEN EXTRACT(DOW FROM daily.work_date) = 0 THEN 0
             ELSE GREATEST(daily.worked_minutes - daily.expected_minutes, 0)
           END
         ), 0)::integer AS overtime_50_minutes,
         COALESCE(SUM(
           CASE
             WHEN EXTRACT(DOW FROM daily.work_date) = 0 THEN GREATEST(daily.worked_minutes - daily.expected_minutes, 0)
             ELSE 0
           END
         ), 0)::integer AS overtime_100_minutes,
         COALESCE(SUM(daily.night_minutes), 0)::integer AS night_minutes,
         COALESCE(SUM(GREATEST(daily.expected_minutes - daily.worked_minutes - daily.paid_minutes, 0)), 0)::integer AS late_minutes,
         COALESCE(SUM(GREATEST(daily.expected_minutes - daily.worked_minutes - daily.paid_minutes, daily.explicit_unpaid_minutes, 0)), 0)::integer AS absence_unpaid_minutes,
         COALESCE(SUM(daily.paid_minutes), 0)::integer AS absence_paid_minutes,
         (SELECT minutes FROM hour_bank_settlement) AS hour_bank_settlement_minutes
  FROM daily;
$$;

CREATE OR REPLACE VIEW ponto.v_timesheet_payroll_input AS
SELECT aggregate.*
FROM ponto.timesheet_period period
CROSS JOIN LATERAL ponto.fn_aggregate_timesheet(
  period.tenant_id,
  period.employee_id,
  period.period_start,
  period.period_end
) AS aggregate;

CREATE TABLE ponto.payroll_bridge_event (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id) ON DELETE RESTRICT,
  payroll_bridge_event_id uuid NOT NULL DEFAULT gen_random_uuid(),
  payroll_run_id uuid NOT NULL REFERENCES payroll.payroll_run(id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES hr.employee(id) ON DELETE RESTRICT,
  timesheet_period_id uuid NOT NULL REFERENCES ponto.timesheet_period(timesheet_period_id) ON DELETE RESTRICT,
  applied_at timestamptz NOT NULL DEFAULT now(),
  applied_lines jsonb NOT NULL,
  CONSTRAINT payroll_bridge_event_pkey PRIMARY KEY (payroll_bridge_event_id),
  CONSTRAINT payroll_bridge_event_tenant_uq UNIQUE (tenant_id, payroll_bridge_event_id),
  CONSTRAINT payroll_bridge_event_idempotency_uq UNIQUE (tenant_id, payroll_run_id, employee_id, timesheet_period_id),
  CONSTRAINT payroll_bridge_event_lines_array_chk CHECK (jsonb_typeof(applied_lines) = 'array')
);

CREATE INDEX payroll_bridge_event_run_idx
  ON ponto.payroll_bridge_event(tenant_id, payroll_run_id, employee_id);

CREATE OR REPLACE FUNCTION ponto.ponto07_audit_payroll_bridge_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_row record;
  v_action text;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;

  PERFORM set_config('app.current_tenant_id', v_row.tenant_id::text, true);
  PERFORM public.sgp_append_audit_event(
    v_action,
    'ponto.payroll_bridge_event',
    v_row.payroll_bridge_event_id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    'ponto.payroll_bridge_event',
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object(
      'tenantId', v_row.tenant_id::text,
      'payrollRunId', v_row.payroll_run_id::text,
      'employeeId', v_row.employee_id::text,
      'timesheetPeriodId', v_row.timesheet_period_id::text
    ),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END;
$$;

CREATE TRIGGER payroll_bridge_event_audit
  AFTER INSERT OR UPDATE OR DELETE ON ponto.payroll_bridge_event
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto07_audit_payroll_bridge_event();

ALTER TABLE ponto.payroll_bridge_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto.payroll_bridge_event FORCE ROW LEVEL SECURITY;

CREATE POLICY payroll_bridge_event_rw ON ponto.payroll_bridge_event
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['ponto.payroll.read', 'ponto.payroll.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['ponto.payroll.write'])
  );

WITH canonical_permissions(key, module_key, resource_key, action_key, route_pattern, description) AS (
  VALUES
  ('ponto.payroll.read', 'ponto', 'payroll', 'read', '#!/ponto/folha/**', 'Preview payroll bridge aggregates and generated payroll lines.'),
  ('ponto.payroll.write', 'ponto', 'payroll', 'write', '#!/ponto/folha/**', 'Apply closed timesheet periods to payroll runs idempotently.')
)
INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
SELECT key, module_key, resource_key, action_key, route_pattern, description
FROM canonical_permissions
ON CONFLICT (key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description,
    updated_at = now();
