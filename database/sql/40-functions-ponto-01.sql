CREATE FUNCTION ponto.fn_aggregate_timesheet(p_tenant_id uuid, p_employee_id uuid, p_period_start date, p_period_end date) RETURNS TABLE(tenant_id uuid, employee_id uuid, period_start date, period_end date, worked_minutes integer, expected_minutes integer, overtime_50_minutes integer, overtime_100_minutes integer, night_minutes integer, late_minutes integer, absence_unpaid_minutes integer, absence_paid_minutes integer, hour_bank_settlement_minutes integer)
    LANGUAGE sql STABLE
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

CREATE FUNCTION ponto.fn_night_minutes_reduced(p_started_at timestamp without time zone, p_finished_at timestamp without time zone) RETURNS integer
    LANGUAGE plpgsql IMMUTABLE
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

CREATE FUNCTION ponto.ponto01_audit_row() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_row record;
  v_action text;
  v_resource_id text;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;

  IF TG_TABLE_NAME = 'work_schedule' THEN
    v_resource_id := v_row.work_schedule_id::text;
  ELSIF TG_TABLE_NAME = 'work_shift' THEN
    v_resource_id := v_row.work_shift_id::text;
  ELSIF TG_TABLE_NAME = 'day_schedule' THEN
    v_resource_id := v_row.day_schedule_id::text;
  ELSIF TG_TABLE_NAME = 'employee_schedule_assignment' THEN
    v_resource_id := v_row.assignment_id::text;
  ELSIF TG_TABLE_NAME = 'time_record' THEN
    v_resource_id := v_row.time_record_id::text;
  ELSIF TG_TABLE_NAME = 'timesheet_period' THEN
    v_resource_id := v_row.timesheet_period_id::text;
  END IF;

  PERFORM public.sgp_append_audit_event(
    v_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    v_resource_id,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('tenantId', v_row.tenant_id::text),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END;
$$;

CREATE FUNCTION ponto.ponto01_time_record_append_only() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'ponto.time_record is append-only' USING ERRCODE = '0A000';
END;
$$;

CREATE FUNCTION ponto.ponto01_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE FUNCTION ponto.ponto02_audit_row() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_row record;
  v_action text;
  v_resource_id text;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;

  IF TG_TABLE_NAME = 'rep_device' THEN
    v_resource_id := v_row.rep_device_id::text;
  ELSIF TG_TABLE_NAME = 'rep_ingestion_batch' THEN
    v_resource_id := v_row.batch_id::text;
  ELSIF TG_TABLE_NAME = 'rep_ingestion_line' THEN
    v_resource_id := v_row.batch_id::text || ':' || v_row.line_no::text;
  END IF;

  PERFORM public.sgp_append_audit_event(
    v_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    v_resource_id,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('tenantId', v_row.tenant_id::text),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END;
$$;

CREATE FUNCTION ponto.ponto02_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE FUNCTION ponto.ponto03_audit_row() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_row record;
  v_action text;
  v_resource_id text;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;

  IF TG_TABLE_NAME = 'afd_export' THEN
    v_resource_id := v_row.afd_export_id::text;
  ELSIF TG_TABLE_NAME = 'afd_import' THEN
    v_resource_id := v_row.afd_import_id::text;
  ELSIF TG_TABLE_NAME = 'afd_import_line' THEN
    v_resource_id := v_row.afd_import_id::text || ':' || v_row.line_no::text;
  END IF;

  PERFORM set_config('app.current_tenant_id', v_row.tenant_id::text, true);

  PERFORM public.sgp_append_audit_event(
    v_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    v_resource_id,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('tenantId', v_row.tenant_id::text),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END;
$$;

CREATE FUNCTION ponto.ponto03_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE FUNCTION ponto.ponto04_audit_row() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_row record;
  v_action text;
  v_resource_id text;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  v_resource_id := CASE TG_TABLE_NAME
    WHEN 'shift_pattern' THEN v_row.shift_pattern_id::text
    WHEN 'shift_pattern_day' THEN v_row.shift_pattern_id::text || ':' || v_row.day_index::text
    WHEN 'shift_assignment' THEN v_row.shift_assignment_id::text
    WHEN 'duty_roster' THEN v_row.duty_roster_id::text
    WHEN 'duty_roster_entry' THEN v_row.duty_roster_id::text || ':' || v_row.employee_id::text || ':' || v_row.work_date::text
    ELSE NULL
  END;

  PERFORM set_config('app.current_tenant_id', v_row.tenant_id::text, true);
  PERFORM public.sgp_append_audit_event(
    v_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    v_resource_id,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('tenantId', v_row.tenant_id::text),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END;
$$;

CREATE FUNCTION ponto.ponto04_reject_locked_assignment_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_row record;
BEGIN
  v_row := COALESCE(OLD, NEW);
  IF EXISTS (
    SELECT 1
    FROM ponto.duty_roster_entry entry
    JOIN ponto.duty_roster roster
      ON roster.duty_roster_id = entry.duty_roster_id
     AND roster.tenant_id = entry.tenant_id
    WHERE entry.tenant_id = v_row.tenant_id
      AND entry.employee_id = v_row.employee_id
      AND roster.status = 'LOCKED'
      AND entry.work_date BETWEEN v_row.valid_from AND COALESCE(v_row.valid_to, '9999-12-31'::date)
  ) THEN
    PERFORM set_config('app.current_tenant_id', v_row.tenant_id::text, true);
    PERFORM public.sgp_append_audit_event(
      'REJECT',
      'ponto.shift_assignment',
      v_row.shift_assignment_id::text,
      NULL::uuid,
      NULLIF(current_setting('app.current_user_sub', true), ''),
      NULLIF(current_setting('app.current_login', true), ''),
      'ponto.shift_assignment',
      NULLIF(current_setting('app.request_id', true), ''),
      jsonb_build_object('tenantId', v_row.tenant_id::text, 'reason', 'LOCKED_ROSTER'),
      NULL::text,
      NULL::text,
      NULL::text
    );
    RAISE EXCEPTION 'Cannot change shift assignment covered by a LOCKED duty roster' USING ERRCODE = '23514';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE FUNCTION ponto.ponto04_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE FUNCTION ponto.ponto05_audit_row() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_row record;
  v_action text;
  v_resource_id text;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  v_resource_id := CASE TG_TABLE_NAME
    WHEN 'hour_bank' THEN v_row.hour_bank_id::text
    WHEN 'hour_bank_movement' THEN v_row.hour_bank_movement_id::text
    ELSE NULL
  END;

  PERFORM set_config('app.current_tenant_id', v_row.tenant_id::text, true);
  PERFORM public.sgp_append_audit_event(
    v_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    v_resource_id,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('tenantId', v_row.tenant_id::text),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END;
$$;

CREATE FUNCTION ponto.ponto05_recalculate_hour_bank() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_hour_bank_id uuid;
BEGIN
  v_hour_bank_id := COALESCE(NEW.hour_bank_id, OLD.hour_bank_id);
  UPDATE ponto.hour_bank bank
  SET balance_minutes = COALESCE((
        SELECT sum(movement.minutes)::integer
        FROM ponto.hour_bank_movement movement
        WHERE movement.hour_bank_id = v_hour_bank_id
      ), 0),
      updated_at = now()
  WHERE bank.hour_bank_id = v_hour_bank_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE FUNCTION ponto.ponto05_reject_expired_accrual() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_bank ponto.hour_bank%ROWTYPE;
BEGIN
  IF NEW.kind NOT IN ('ACCRUAL_POSITIVE', 'ACCRUAL_NEGATIVE') THEN
    RETURN NEW;
  END IF;

  SELECT *
  INTO v_bank
  FROM ponto.hour_bank
  WHERE hour_bank_id = NEW.hour_bank_id;

  IF v_bank.status <> 'ACTIVE' OR v_bank.expires_at < NEW.work_date THEN
    PERFORM set_config('app.current_tenant_id', v_bank.tenant_id::text, true);
    PERFORM public.sgp_append_audit_event(
      'REJECT',
      'ponto.hour_bank_movement',
      NEW.hour_bank_id::text,
      NULL::uuid,
      NULLIF(current_setting('app.current_user_sub', true), ''),
      NULLIF(current_setting('app.current_login', true), ''),
      'ponto.hour_bank_movement',
      NULLIF(current_setting('app.request_id', true), ''),
      jsonb_build_object('tenantId', v_bank.tenant_id::text, 'reason', 'HOUR_BANK_EXPIRED'),
      NULL::text,
      NULL::text,
      NULL::text
    );
    RAISE EXCEPTION 'Cannot accrue movement into expired or closed hour bank' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION ponto.ponto05_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE FUNCTION ponto.ponto06_audit_row() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_row record;
  v_action text;
  v_resource_id text;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  v_resource_id := CASE TG_TABLE_NAME
    WHEN 'absence_justification' THEN v_row.absence_justification_id::text
    WHEN 'time_record_justification_link' THEN v_row.time_record_id::text || ':' || v_row.absence_justification_id::text
    ELSE NULL
  END;

  PERFORM set_config('app.current_tenant_id', v_row.tenant_id::text, true);
  PERFORM public.sgp_append_audit_event(
    v_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    v_resource_id,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('tenantId', v_row.tenant_id::text, 'status', COALESCE(v_row.status::text, 'LINK')),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END;
$$;

CREATE FUNCTION ponto.ponto06_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE FUNCTION ponto.ponto07_audit_payroll_bridge_event() RETURNS trigger
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

CREATE FUNCTION ponto.ponto08_audit_row() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_row record;
  v_action text;
  v_resource_id text;
  v_metadata jsonb;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  v_resource_id := v_row.id::text;
  v_metadata := jsonb_build_object(
    'tenantId', v_row.tenant_id::text,
    'operation', TG_OP,
    'employeeId', v_row.employee_id::text
  );

  IF TG_TABLE_NAME = 'employee_biometric_template' THEN
    v_metadata := v_metadata || jsonb_build_object(
      'kind', v_row.kind::text,
      'status', v_row.status::text,
      'qualityScore', v_row.quality_score::text,
      'templateEncrypted', true,
      'kmsKeyIdPresent', NULLIF(v_row.template_kms_key_id, '') IS NOT NULL
    );
  ELSIF TG_TABLE_NAME = 'biometric_match' THEN
    v_metadata := v_metadata || jsonb_build_object(
      'timeRecordId', v_row.time_record_id::text,
      'kind', v_row.kind::text,
      'score', v_row.score::text,
      'threshold', v_row.threshold::text,
      'matched', v_row.matched
    );
  ELSIF TG_TABLE_NAME = 'biometric_consent' THEN
    v_metadata := v_metadata || jsonb_build_object(
      'consentVersion', v_row.consent_version,
      'withdrawn', v_row.withdrawn_at IS NOT NULL
    );
  END IF;

  PERFORM public.sgp_append_audit_event(
    v_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    v_resource_id,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    v_metadata,
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END;
$$;

CREATE FUNCTION ponto.ponto08_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE FUNCTION ponto.ponto09_audit_row() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_row record;
  v_action text;
  v_metadata jsonb;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  v_metadata := jsonb_build_object(
    'tenantId', v_row.tenant_id::text,
    'operation', TG_OP,
    'employeeId', v_row.employee_id::text
  );

  IF TG_TABLE_NAME = 'mobile_clock_in_attempt' THEN
    v_metadata := v_metadata || jsonb_build_object(
      'result', v_row.result::text,
      'mockLocation', v_row.mock_location,
      'deviceIdPresent', NULLIF(v_row.device_id, '') IS NOT NULL,
      'workLocationId', v_row.work_location_id::text,
      'timeRecordId', v_row.time_record_id::text,
      'gpsPrecisionM', v_row.gps_precision_m::text
    );
  ELSIF TG_TABLE_NAME = 'mobile_device_registration' THEN
    v_metadata := v_metadata || jsonb_build_object(
      'platform', v_row.platform::text,
      'deviceIdPresent', NULLIF(v_row.device_id, '') IS NOT NULL,
      'publicKeyPresent', NULLIF(v_row.public_key, '') IS NOT NULL,
      'revoked', v_row.revoked_at IS NOT NULL
    );
  ELSIF TG_TABLE_NAME = 'mobile_geolocation_consent' THEN
    v_metadata := v_metadata || jsonb_build_object(
      'consentVersion', v_row.consent_version,
      'withdrawn', v_row.withdrawn_at IS NOT NULL
    );
  END IF;

  PERFORM public.sgp_append_audit_event(
    v_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    v_row.id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    v_metadata,
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END;
$$;

CREATE FUNCTION ponto.ponto09_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
