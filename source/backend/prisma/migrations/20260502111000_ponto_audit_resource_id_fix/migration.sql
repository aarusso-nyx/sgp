CREATE OR REPLACE FUNCTION ponto.ponto01_audit_row()
RETURNS trigger
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
