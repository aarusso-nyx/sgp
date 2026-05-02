CREATE TYPE ponto.shift_pattern_kind AS ENUM (
  'CLT_12X36',
  'CLT_6X1',
  'CLT_5X2',
  'PLANTAO_24X72',
  'CUSTOM'
);

CREATE TYPE ponto.duty_roster_status AS ENUM (
  'DRAFT',
  'PUBLISHED',
  'LOCKED'
);

CREATE TABLE ponto.shift_pattern (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id) ON DELETE RESTRICT,
  shift_pattern_id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  cycle_days integer NOT NULL,
  kind ponto.shift_pattern_kind NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shift_pattern_pkey PRIMARY KEY (shift_pattern_id),
  CONSTRAINT shift_pattern_tenant_code_uq UNIQUE (tenant_id, code),
  CONSTRAINT shift_pattern_cycle_days_chk CHECK (cycle_days > 0)
);

CREATE TABLE ponto.shift_pattern_day (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id) ON DELETE RESTRICT,
  shift_pattern_id uuid NOT NULL REFERENCES ponto.shift_pattern(shift_pattern_id) ON DELETE CASCADE,
  day_index integer NOT NULL,
  is_working boolean NOT NULL,
  entry_time time,
  exit_time time,
  lunch_minutes integer,
  night_shift_flag boolean NOT NULL DEFAULT false,
  hazard_flag boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shift_pattern_day_pkey PRIMARY KEY (shift_pattern_id, day_index),
  CONSTRAINT shift_pattern_day_index_chk CHECK (day_index >= 0),
  CONSTRAINT shift_pattern_day_lunch_chk CHECK (lunch_minutes IS NULL OR lunch_minutes >= 0),
  CONSTRAINT shift_pattern_day_working_times_chk CHECK (
    (is_working AND entry_time IS NOT NULL AND exit_time IS NOT NULL)
    OR (NOT is_working)
  )
);

CREATE TABLE ponto.shift_assignment (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id) ON DELETE RESTRICT,
  shift_assignment_id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES hr.employee(id) ON DELETE RESTRICT,
  shift_pattern_id uuid NOT NULL REFERENCES ponto.shift_pattern(shift_pattern_id) ON DELETE RESTRICT,
  anchor_date date NOT NULL,
  valid_from date NOT NULL,
  valid_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shift_assignment_pkey PRIMARY KEY (shift_assignment_id),
  CONSTRAINT shift_assignment_valid_range_chk CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE TABLE ponto.duty_roster (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id) ON DELETE RESTRICT,
  duty_roster_id uuid NOT NULL DEFAULT gen_random_uuid(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  status ponto.duty_roster_status NOT NULL DEFAULT 'DRAFT',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT duty_roster_pkey PRIMARY KEY (duty_roster_id),
  CONSTRAINT duty_roster_period_chk CHECK (period_end >= period_start)
);

CREATE TABLE ponto.duty_roster_entry (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id) ON DELETE RESTRICT,
  duty_roster_id uuid NOT NULL REFERENCES ponto.duty_roster(duty_roster_id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES hr.employee(id) ON DELETE RESTRICT,
  work_date date NOT NULL,
  expected_entry timestamptz,
  expected_exit timestamptz,
  expected_minutes integer NOT NULL DEFAULT 0,
  night_shift_flag boolean NOT NULL DEFAULT false,
  hazard_flag boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT duty_roster_entry_pkey PRIMARY KEY (duty_roster_id, employee_id, work_date),
  CONSTRAINT duty_roster_entry_minutes_chk CHECK (expected_minutes >= 0)
);

CREATE INDEX shift_pattern_day_pattern_idx ON ponto.shift_pattern_day(tenant_id, shift_pattern_id, day_index);
CREATE INDEX shift_assignment_employee_idx ON ponto.shift_assignment(tenant_id, employee_id, valid_from DESC);
CREATE INDEX duty_roster_period_idx ON ponto.duty_roster(tenant_id, period_start, period_end);
CREATE INDEX duty_roster_entry_employee_idx ON ponto.duty_roster_entry(tenant_id, employee_id, work_date);

CREATE OR REPLACE FUNCTION ponto.ponto04_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION ponto.ponto04_audit_row()
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

CREATE OR REPLACE FUNCTION ponto.ponto04_reject_locked_assignment_change()
RETURNS trigger
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

CREATE TRIGGER shift_pattern_touch_updated_at BEFORE UPDATE ON ponto.shift_pattern FOR EACH ROW EXECUTE FUNCTION ponto.ponto04_touch_updated_at();
CREATE TRIGGER shift_pattern_day_touch_updated_at BEFORE UPDATE ON ponto.shift_pattern_day FOR EACH ROW EXECUTE FUNCTION ponto.ponto04_touch_updated_at();
CREATE TRIGGER shift_assignment_touch_updated_at BEFORE UPDATE ON ponto.shift_assignment FOR EACH ROW EXECUTE FUNCTION ponto.ponto04_touch_updated_at();
CREATE TRIGGER duty_roster_touch_updated_at BEFORE UPDATE ON ponto.duty_roster FOR EACH ROW EXECUTE FUNCTION ponto.ponto04_touch_updated_at();
CREATE TRIGGER duty_roster_entry_touch_updated_at BEFORE UPDATE ON ponto.duty_roster_entry FOR EACH ROW EXECUTE FUNCTION ponto.ponto04_touch_updated_at();

CREATE TRIGGER shift_assignment_locked_guard BEFORE UPDATE OR DELETE ON ponto.shift_assignment FOR EACH ROW EXECUTE FUNCTION ponto.ponto04_reject_locked_assignment_change();

CREATE TRIGGER shift_pattern_audit AFTER INSERT OR UPDATE OR DELETE ON ponto.shift_pattern FOR EACH ROW EXECUTE FUNCTION ponto.ponto04_audit_row();
CREATE TRIGGER shift_pattern_day_audit AFTER INSERT OR UPDATE OR DELETE ON ponto.shift_pattern_day FOR EACH ROW EXECUTE FUNCTION ponto.ponto04_audit_row();
CREATE TRIGGER shift_assignment_audit AFTER INSERT OR UPDATE OR DELETE ON ponto.shift_assignment FOR EACH ROW EXECUTE FUNCTION ponto.ponto04_audit_row();
CREATE TRIGGER duty_roster_audit AFTER INSERT OR UPDATE OR DELETE ON ponto.duty_roster FOR EACH ROW EXECUTE FUNCTION ponto.ponto04_audit_row();
CREATE TRIGGER duty_roster_entry_audit AFTER INSERT OR UPDATE OR DELETE ON ponto.duty_roster_entry FOR EACH ROW EXECUTE FUNCTION ponto.ponto04_audit_row();

ALTER TABLE ponto.shift_pattern ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto.shift_pattern FORCE ROW LEVEL SECURITY;
ALTER TABLE ponto.shift_pattern_day ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto.shift_pattern_day FORCE ROW LEVEL SECURITY;
ALTER TABLE ponto.shift_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto.shift_assignment FORCE ROW LEVEL SECURITY;
ALTER TABLE ponto.duty_roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto.duty_roster FORCE ROW LEVEL SECURITY;
ALTER TABLE ponto.duty_roster_entry ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto.duty_roster_entry FORCE ROW LEVEL SECURITY;

CREATE POLICY shift_pattern_rw ON ponto.shift_pattern
  FOR ALL
  USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.roster.read', 'ponto.roster.write']))
  WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.roster.write']));
CREATE POLICY shift_pattern_day_rw ON ponto.shift_pattern_day
  FOR ALL
  USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.roster.read', 'ponto.roster.write']))
  WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.roster.write']));
CREATE POLICY shift_assignment_rw ON ponto.shift_assignment
  FOR ALL
  USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.roster.read', 'ponto.roster.write']))
  WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.roster.write']));
CREATE POLICY duty_roster_rw ON ponto.duty_roster
  FOR ALL
  USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.roster.read', 'ponto.roster.write']))
  WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.roster.write']));
CREATE POLICY duty_roster_entry_rw ON ponto.duty_roster_entry
  FOR ALL
  USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.roster.read', 'ponto.roster.write']))
  WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.roster.write']));
