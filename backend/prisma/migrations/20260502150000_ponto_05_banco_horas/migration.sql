CREATE TYPE ponto.hour_bank_regime AS ENUM (
  'CLT_INDIVIDUAL',
  'CLT_COLETIVO',
  'ESTATUTARIO'
);

CREATE TYPE ponto.hour_bank_status AS ENUM (
  'ACTIVE',
  'SETTLED',
  'EXPIRED'
);

CREATE TYPE ponto.hour_bank_movement_kind AS ENUM (
  'ACCRUAL_POSITIVE',
  'ACCRUAL_NEGATIVE',
  'COMPENSATION',
  'SETTLEMENT_OVERTIME',
  'SETTLEMENT_DEDUCTION',
  'MANUAL_ADJUSTMENT'
);

CREATE TABLE ponto.hour_bank (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id) ON DELETE RESTRICT,
  hour_bank_id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES hr.employee(id) ON DELETE RESTRICT,
  regime ponto.hour_bank_regime NOT NULL,
  opened_at date NOT NULL,
  expires_at date NOT NULL,
  balance_minutes integer NOT NULL DEFAULT 0,
  status ponto.hour_bank_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hour_bank_pkey PRIMARY KEY (hour_bank_id),
  CONSTRAINT hour_bank_tenant_bank_uq UNIQUE (tenant_id, hour_bank_id),
  CONSTRAINT hour_bank_period_chk CHECK (expires_at >= opened_at)
);

CREATE TABLE ponto.hour_bank_movement (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id) ON DELETE RESTRICT,
  hour_bank_movement_id uuid NOT NULL DEFAULT gen_random_uuid(),
  hour_bank_id uuid NOT NULL REFERENCES ponto.hour_bank(hour_bank_id) ON DELETE RESTRICT,
  work_date date NOT NULL,
  kind ponto.hour_bank_movement_kind NOT NULL,
  minutes integer NOT NULL,
  source_time_record_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by_user_id uuid REFERENCES public.user_account(id) ON DELETE SET NULL,
  payroll_run_id uuid REFERENCES payroll.payroll_run(id) ON DELETE SET NULL,
  CONSTRAINT hour_bank_movement_pkey PRIMARY KEY (hour_bank_movement_id),
  CONSTRAINT hour_bank_movement_minutes_chk CHECK (minutes <> 0),
  CONSTRAINT hour_bank_movement_tenant_bank_fk FOREIGN KEY (tenant_id, hour_bank_id)
    REFERENCES ponto.hour_bank(tenant_id, hour_bank_id) ON DELETE RESTRICT
);

CREATE INDEX hour_bank_employee_idx ON ponto.hour_bank(tenant_id, employee_id, status, expires_at);
CREATE INDEX hour_bank_movement_bank_idx ON ponto.hour_bank_movement(tenant_id, hour_bank_id, work_date);
CREATE UNIQUE INDEX hour_bank_settlement_payroll_uq
  ON ponto.hour_bank_movement(hour_bank_id, payroll_run_id, kind)
  WHERE payroll_run_id IS NOT NULL
    AND kind IN ('SETTLEMENT_OVERTIME', 'SETTLEMENT_DEDUCTION');

CREATE OR REPLACE FUNCTION ponto.ponto05_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION ponto.ponto05_audit_row()
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

CREATE OR REPLACE FUNCTION ponto.ponto05_recalculate_hour_bank()
RETURNS trigger
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

CREATE OR REPLACE FUNCTION ponto.ponto05_reject_expired_accrual()
RETURNS trigger
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

CREATE TRIGGER hour_bank_touch_updated_at
  BEFORE UPDATE ON ponto.hour_bank
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto05_touch_updated_at();
CREATE TRIGGER hour_bank_audit
  AFTER INSERT OR UPDATE OR DELETE ON ponto.hour_bank
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto05_audit_row();
CREATE TRIGGER hour_bank_movement_audit
  AFTER INSERT OR UPDATE OR DELETE ON ponto.hour_bank_movement
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto05_audit_row();
CREATE TRIGGER hour_bank_movement_expired_guard
  BEFORE INSERT ON ponto.hour_bank_movement
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto05_reject_expired_accrual();
CREATE TRIGGER hour_bank_movement_recalculate
  AFTER INSERT OR UPDATE OR DELETE ON ponto.hour_bank_movement
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto05_recalculate_hour_bank();

ALTER TABLE ponto.hour_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto.hour_bank FORCE ROW LEVEL SECURITY;
ALTER TABLE ponto.hour_bank_movement ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto.hour_bank_movement FORCE ROW LEVEL SECURITY;

CREATE POLICY hour_bank_rw ON ponto.hour_bank
  FOR ALL
  USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.hourbank.read', 'ponto.hourbank.write']))
  WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.hourbank.write']));

CREATE POLICY hour_bank_movement_rw ON ponto.hour_bank_movement
  FOR ALL
  USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.hourbank.read', 'ponto.hourbank.write']))
  WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['ponto.hourbank.write']));
