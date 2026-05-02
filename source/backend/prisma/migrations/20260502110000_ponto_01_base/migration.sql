CREATE SCHEMA IF NOT EXISTS ponto;

CREATE TYPE ponto.work_shift_kind AS ENUM (
  'FIXED',
  'FLEXIBLE',
  'SHIFT_12X36',
  'SHIFT_6X1',
  'OTHER'
);

CREATE TYPE ponto.time_record_source AS ENUM (
  'REP_P',
  'REP_A',
  'REP_C',
  'MANUAL_ADJUSTMENT'
);

CREATE TYPE ponto.timesheet_period_status AS ENUM (
  'OPEN',
  'CLOSED',
  'LOCKED'
);

ALTER TABLE public.tenant
  ADD COLUMN IF NOT EXISTS tenant_timezone text NOT NULL DEFAULT 'America/Sao_Paulo';

CREATE TABLE ponto.work_schedule (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id) ON DELETE RESTRICT,
  work_schedule_id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  weekly_hours numeric(5,2) NOT NULL,
  tolerance_minutes integer NOT NULL DEFAULT 0,
  status public."RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  valid_from date NOT NULL,
  valid_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_schedule_pkey PRIMARY KEY (work_schedule_id),
  CONSTRAINT work_schedule_tenant_code_uq UNIQUE (tenant_id, code),
  CONSTRAINT work_schedule_weekly_hours_chk CHECK (weekly_hours > 0),
  CONSTRAINT work_schedule_tolerance_chk CHECK (tolerance_minutes >= 0),
  CONSTRAINT work_schedule_valid_range_chk CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE TABLE ponto.work_shift (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id) ON DELETE RESTRICT,
  work_shift_id uuid NOT NULL DEFAULT gen_random_uuid(),
  work_schedule_id uuid NOT NULL REFERENCES ponto.work_schedule(work_schedule_id) ON DELETE CASCADE,
  code text NOT NULL,
  kind ponto.work_shift_kind NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_shift_pkey PRIMARY KEY (work_shift_id),
  CONSTRAINT work_shift_tenant_code_uq UNIQUE (tenant_id, code)
);

CREATE TABLE ponto.day_schedule (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id) ON DELETE RESTRICT,
  day_schedule_id uuid NOT NULL DEFAULT gen_random_uuid(),
  work_shift_id uuid NOT NULL REFERENCES ponto.work_shift(work_shift_id) ON DELETE CASCADE,
  weekday smallint NOT NULL,
  entry_time time,
  lunch_out time,
  lunch_in time,
  exit_time time,
  total_minutes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT day_schedule_pkey PRIMARY KEY (day_schedule_id),
  CONSTRAINT day_schedule_weekday_chk CHECK (weekday BETWEEN 0 AND 6),
  CONSTRAINT day_schedule_total_minutes_chk CHECK (total_minutes >= 0),
  CONSTRAINT day_schedule_shift_weekday_uq UNIQUE (tenant_id, work_shift_id, weekday)
);

CREATE TABLE ponto.employee_schedule_assignment (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id) ON DELETE RESTRICT,
  assignment_id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES hr.employee(id) ON DELETE RESTRICT,
  work_schedule_id uuid NOT NULL REFERENCES ponto.work_schedule(work_schedule_id) ON DELETE RESTRICT,
  valid_from date NOT NULL,
  valid_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employee_schedule_assignment_pkey PRIMARY KEY (assignment_id),
  CONSTRAINT employee_schedule_assignment_valid_range_chk CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE TABLE ponto.time_record (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id) ON DELETE RESTRICT,
  time_record_id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES hr.employee(id) ON DELETE RESTRICT,
  recorded_at timestamptz NOT NULL,
  source ponto.time_record_source NOT NULL,
  nsr bigint NOT NULL,
  prev_hash bytea,
  record_hash bytea NOT NULL,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT time_record_pkey PRIMARY KEY (time_record_id),
  CONSTRAINT time_record_hash_len_chk CHECK (length(record_hash) = 32),
  CONSTRAINT time_record_prev_hash_len_chk CHECK (prev_hash IS NULL OR length(prev_hash) = 32),
  CONSTRAINT time_record_tenant_employee_nsr_uq UNIQUE (tenant_id, employee_id, nsr)
);

CREATE TABLE ponto.timesheet_period (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id) ON DELETE RESTRICT,
  timesheet_period_id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES hr.employee(id) ON DELETE RESTRICT,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status ponto.timesheet_period_status NOT NULL DEFAULT 'OPEN',
  worked_minutes integer NOT NULL DEFAULT 0,
  overtime_50_minutes integer NOT NULL DEFAULT 0,
  overtime_100_minutes integer NOT NULL DEFAULT 0,
  night_minutes integer NOT NULL DEFAULT 0,
  absence_minutes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT timesheet_period_pkey PRIMARY KEY (timesheet_period_id),
  CONSTRAINT timesheet_period_employee_range_uq UNIQUE (tenant_id, employee_id, period_start, period_end),
  CONSTRAINT timesheet_period_range_chk CHECK (period_end >= period_start),
  CONSTRAINT timesheet_period_minutes_chk CHECK (
    worked_minutes >= 0
    AND overtime_50_minutes >= 0
    AND overtime_100_minutes >= 0
    AND night_minutes >= 0
    AND absence_minutes >= 0
  )
);

CREATE INDEX work_shift_schedule_idx ON ponto.work_shift(tenant_id, work_schedule_id);
CREATE INDEX day_schedule_shift_idx ON ponto.day_schedule(tenant_id, work_shift_id);
CREATE INDEX employee_schedule_assignment_employee_idx ON ponto.employee_schedule_assignment(tenant_id, employee_id, valid_from DESC);
CREATE INDEX time_record_employee_recorded_idx ON ponto.time_record(tenant_id, employee_id, recorded_at DESC);
CREATE INDEX timesheet_period_employee_idx ON ponto.timesheet_period(tenant_id, employee_id, period_start DESC);

CREATE OR REPLACE FUNCTION ponto.ponto01_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

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
  v_resource_id := CASE TG_TABLE_NAME
    WHEN 'work_schedule' THEN v_row.work_schedule_id::text
    WHEN 'work_shift' THEN v_row.work_shift_id::text
    WHEN 'day_schedule' THEN v_row.day_schedule_id::text
    WHEN 'employee_schedule_assignment' THEN v_row.assignment_id::text
    WHEN 'time_record' THEN v_row.time_record_id::text
    WHEN 'timesheet_period' THEN v_row.timesheet_period_id::text
    ELSE NULL
  END;

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

CREATE OR REPLACE FUNCTION ponto.ponto01_time_record_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'ponto.time_record is append-only' USING ERRCODE = '0A000';
END;
$$;

CREATE TRIGGER work_schedule_touch_updated_at
  BEFORE UPDATE ON ponto.work_schedule
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto01_touch_updated_at();
CREATE TRIGGER work_shift_touch_updated_at
  BEFORE UPDATE ON ponto.work_shift
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto01_touch_updated_at();
CREATE TRIGGER day_schedule_touch_updated_at
  BEFORE UPDATE ON ponto.day_schedule
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto01_touch_updated_at();
CREATE TRIGGER employee_schedule_assignment_touch_updated_at
  BEFORE UPDATE ON ponto.employee_schedule_assignment
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto01_touch_updated_at();
CREATE TRIGGER timesheet_period_touch_updated_at
  BEFORE UPDATE ON ponto.timesheet_period
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto01_touch_updated_at();

CREATE TRIGGER work_schedule_audit
  AFTER INSERT OR UPDATE OR DELETE ON ponto.work_schedule
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto01_audit_row();
CREATE TRIGGER work_shift_audit
  AFTER INSERT OR UPDATE OR DELETE ON ponto.work_shift
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto01_audit_row();
CREATE TRIGGER day_schedule_audit
  AFTER INSERT OR UPDATE OR DELETE ON ponto.day_schedule
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto01_audit_row();
CREATE TRIGGER employee_schedule_assignment_audit
  AFTER INSERT OR UPDATE OR DELETE ON ponto.employee_schedule_assignment
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto01_audit_row();
CREATE TRIGGER time_record_audit
  AFTER INSERT ON ponto.time_record
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto01_audit_row();
CREATE TRIGGER time_record_append_only
  BEFORE UPDATE OR DELETE ON ponto.time_record
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto01_time_record_append_only();
CREATE TRIGGER timesheet_period_audit
  AFTER INSERT OR UPDATE OR DELETE ON ponto.timesheet_period
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto01_audit_row();

ALTER TABLE ponto.work_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto.work_schedule FORCE ROW LEVEL SECURITY;
ALTER TABLE ponto.work_shift ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto.work_shift FORCE ROW LEVEL SECURITY;
ALTER TABLE ponto.day_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto.day_schedule FORCE ROW LEVEL SECURITY;
ALTER TABLE ponto.employee_schedule_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto.employee_schedule_assignment FORCE ROW LEVEL SECURITY;
ALTER TABLE ponto.time_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto.time_record FORCE ROW LEVEL SECURITY;
ALTER TABLE ponto.timesheet_period ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto.timesheet_period FORCE ROW LEVEL SECURITY;

CREATE POLICY work_schedule_rw ON ponto.work_schedule
  FOR ALL
  USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.schedule.read', 'ponto.schedule.write', 'ponto.timerecord.read', 'ponto.timerecord.write']))
  WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.schedule.write']));
CREATE POLICY work_shift_rw ON ponto.work_shift
  FOR ALL
  USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.schedule.read', 'ponto.schedule.write', 'ponto.timerecord.read', 'ponto.timerecord.write']))
  WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.schedule.write']));
CREATE POLICY day_schedule_rw ON ponto.day_schedule
  FOR ALL
  USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.schedule.read', 'ponto.schedule.write', 'ponto.timerecord.read', 'ponto.timerecord.write']))
  WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.schedule.write']));
CREATE POLICY employee_schedule_assignment_rw ON ponto.employee_schedule_assignment
  FOR ALL
  USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.schedule.read', 'ponto.schedule.write', 'ponto.timerecord.read', 'ponto.timerecord.write']))
  WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.schedule.write']));
CREATE POLICY time_record_rw ON ponto.time_record
  FOR ALL
  USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.schedule.read', 'ponto.schedule.write', 'ponto.timerecord.read', 'ponto.timerecord.write']))
  WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.timerecord.write']));
CREATE POLICY timesheet_period_rw ON ponto.timesheet_period
  FOR ALL
  USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.schedule.read', 'ponto.schedule.write', 'ponto.timerecord.read', 'ponto.timerecord.write']))
  WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.schedule.write']));
