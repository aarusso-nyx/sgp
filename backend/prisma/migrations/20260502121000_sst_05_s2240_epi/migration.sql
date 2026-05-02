ALTER TYPE esocial.s1xxx_event_kind ADD VALUE IF NOT EXISTS 'S-2240';

CREATE TYPE saude.harmful_agent_kind AS ENUM (
  'FISICO',
  'QUIMICO',
  'BIOLOGICO',
  'ERGONOMICO',
  'ACIDENTE'
);

CREATE TYPE saude.epi_signature_method AS ENUM (
  'FISICA',
  'DIGITAL',
  'GOVBR'
);

CREATE TYPE esocial.s2240_trigger_event AS ENUM (
  'START',
  'END',
  'CHANGE'
);

CREATE TABLE saude.environmental_exposure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id),
  employee_id uuid NOT NULL REFERENCES hr.employee(id) ON DELETE RESTRICT,
  risk_management_program_id uuid NOT NULL REFERENCES saude.risk_management_program(id) ON DELETE RESTRICT,
  harmful_agent_code text NOT NULL,
  agent_kind saude.harmful_agent_kind NOT NULL,
  intensity_value numeric(18, 6),
  intensity_unit text NOT NULL DEFAULT '',
  exposure_start date NOT NULL,
  exposure_end date,
  mitigated_by_epi boolean NOT NULL DEFAULT false,
  mitigated_by_epc boolean NOT NULL DEFAULT false,
  special_retirement_eligible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT environmental_exposure_agent_code_chk CHECK (harmful_agent_code ~ '^\d{2}\.\d{2}\.\d{3}$'),
  CONSTRAINT environmental_exposure_period_chk CHECK (exposure_end IS NULL OR exposure_end >= exposure_start)
);

CREATE TABLE saude.epi_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id),
  ca_number text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  validity_months integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT epi_inventory_ca_number_chk CHECK (ca_number ~ '^[0-9A-Za-z.-]{3,40}$'),
  CONSTRAINT epi_inventory_validity_months_chk CHECK (validity_months > 0),
  CONSTRAINT epi_inventory_tenant_ca_uq UNIQUE (tenant_id, ca_number)
);

CREATE TABLE saude.epi_delivery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id),
  employee_id uuid NOT NULL REFERENCES hr.employee(id) ON DELETE RESTRICT,
  epi_inventory_id uuid NOT NULL REFERENCES saude.epi_inventory(id) ON DELETE RESTRICT,
  delivered_at timestamptz NOT NULL,
  quantity integer NOT NULL,
  signature_method saude.epi_signature_method NOT NULL,
  signature_evidence_uri text,
  training_done_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT epi_delivery_quantity_chk CHECK (quantity > 0),
  CONSTRAINT epi_delivery_signature_evidence_chk CHECK (
    signature_method = 'FISICA'::saude.epi_signature_method
    OR NULLIF(btrim(COALESCE(signature_evidence_uri, '')), '') IS NOT NULL
  )
);

CREATE TABLE saude.ppp_record (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id),
  employee_id uuid NOT NULL REFERENCES hr.employee(id) ON DELETE RESTRICT,
  period_start date NOT NULL,
  period_end date NOT NULL,
  snapshot_json jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ppp_record_period_chk CHECK (period_end >= period_start)
);

CREATE TABLE esocial.s2240_pending (
  tenant_id uuid NOT NULL REFERENCES public.tenant(id),
  environmental_exposure_id uuid NOT NULL REFERENCES saude.environmental_exposure(id) ON DELETE CASCADE,
  trigger_event esocial.s2240_trigger_event NOT NULL,
  enqueued_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT s2240_pending_pkey PRIMARY KEY (tenant_id, environmental_exposure_id, trigger_event),
  CONSTRAINT s2240_pending_attempts_nonnegative_chk CHECK (attempts >= 0)
);

CREATE INDEX environmental_exposure_employee_period_idx
  ON saude.environmental_exposure(tenant_id, employee_id, exposure_start, exposure_end);
CREATE INDEX environmental_exposure_pgr_idx
  ON saude.environmental_exposure(tenant_id, risk_management_program_id);
CREATE INDEX epi_delivery_employee_idx
  ON saude.epi_delivery(tenant_id, employee_id, delivered_at DESC);
CREATE INDEX ppp_record_employee_period_idx
  ON saude.ppp_record(tenant_id, employee_id, period_start, period_end);
CREATE INDEX s2240_pending_tenant_enqueued_idx
  ON esocial.s2240_pending(tenant_id, enqueued_at);

CREATE OR REPLACE FUNCTION saude.sst05_validate_environmental_exposure()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_pgr saude.risk_management_program%ROWTYPE;
  v_employee_tenant uuid;
BEGIN
  SELECT * INTO v_pgr
  FROM saude.risk_management_program
  WHERE id = NEW.risk_management_program_id
    AND tenant_id = NEW.tenant_id
    AND kind = 'PGR'::saude.risk_management_program_kind;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'environmental_exposure requires a same-tenant PGR';
  END IF;

  IF v_pgr.status <> 'ACTIVE'::saude.program_status
     OR NEW.exposure_start < v_pgr.valid_from
     OR NEW.exposure_start > v_pgr.valid_until THEN
    RAISE EXCEPTION 'environmental_exposure requires an ACTIVE PGR covering exposure_start';
  END IF;

  SELECT tenant_id INTO v_employee_tenant
  FROM hr.employee
  WHERE id = NEW.employee_id;

  IF v_employee_tenant IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION 'environmental_exposure requires a same-tenant employee';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER environmental_exposure_validate
  BEFORE INSERT OR UPDATE ON saude.environmental_exposure
  FOR EACH ROW EXECUTE FUNCTION saude.sst05_validate_environmental_exposure();

CREATE OR REPLACE FUNCTION saude.sst05_validate_epi_delivery()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_employee_tenant uuid;
  v_inventory_tenant uuid;
BEGIN
  SELECT tenant_id INTO v_employee_tenant FROM hr.employee WHERE id = NEW.employee_id;
  SELECT tenant_id INTO v_inventory_tenant FROM saude.epi_inventory WHERE id = NEW.epi_inventory_id;

  IF v_employee_tenant IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION 'epi_delivery requires a same-tenant employee';
  END IF;

  IF v_inventory_tenant IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION 'epi_delivery requires a same-tenant EPI inventory item';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER epi_delivery_validate
  BEFORE INSERT OR UPDATE ON saude.epi_delivery
  FOR EACH ROW EXECUTE FUNCTION saude.sst05_validate_epi_delivery();

CREATE OR REPLACE FUNCTION esocial.sgp_enqueue_s2240_from_exposure()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_trigger esocial.s2240_trigger_event;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_trigger := 'START'::esocial.s2240_trigger_event;
  ELSIF OLD.exposure_end IS DISTINCT FROM NEW.exposure_end
        AND NEW.exposure_end IS NOT NULL THEN
    v_trigger := 'END'::esocial.s2240_trigger_event;
  ELSIF OLD.harmful_agent_code IS DISTINCT FROM NEW.harmful_agent_code
        OR OLD.agent_kind IS DISTINCT FROM NEW.agent_kind
        OR OLD.intensity_value IS DISTINCT FROM NEW.intensity_value
        OR OLD.intensity_unit IS DISTINCT FROM NEW.intensity_unit
        OR OLD.exposure_start IS DISTINCT FROM NEW.exposure_start
        OR OLD.mitigated_by_epi IS DISTINCT FROM NEW.mitigated_by_epi
        OR OLD.mitigated_by_epc IS DISTINCT FROM NEW.mitigated_by_epc
        OR OLD.special_retirement_eligible IS DISTINCT FROM NEW.special_retirement_eligible THEN
    v_trigger := 'CHANGE'::esocial.s2240_trigger_event;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO esocial.s2240_pending (tenant_id, environmental_exposure_id, trigger_event)
  VALUES (NEW.tenant_id, NEW.id, v_trigger)
  ON CONFLICT (tenant_id, environmental_exposure_id, trigger_event)
  DO UPDATE
  SET enqueued_at = EXCLUDED.enqueued_at,
      updated_at = now(),
      last_error = NULL;

  RETURN NEW;
END;
$$;

CREATE TRIGGER sst05_environmental_exposure_s2240
  AFTER INSERT OR UPDATE ON saude.environmental_exposure
  FOR EACH ROW EXECUTE FUNCTION esocial.sgp_enqueue_s2240_from_exposure();

CREATE OR REPLACE FUNCTION saude.sst05_block_ppp_record_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'ppp_record is append-only';
END;
$$;

CREATE TRIGGER ppp_record_no_update
  BEFORE UPDATE ON saude.ppp_record
  FOR EACH ROW EXECUTE FUNCTION saude.sst05_block_ppp_record_mutation();
CREATE TRIGGER ppp_record_no_delete
  BEFORE DELETE ON saude.ppp_record
  FOR EACH ROW EXECUTE FUNCTION saude.sst05_block_ppp_record_mutation();

CREATE OR REPLACE FUNCTION esocial.sgp_s2240_pending_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_row record;
BEGIN
  v_row := COALESCE(NEW, OLD);
  PERFORM public.sgp_append_audit_event(
    CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    v_row.environmental_exposure_id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object(
      'operation', TG_OP,
      'tenantId', v_row.tenant_id::text,
      'triggerEvent', v_row.trigger_event::text,
      'attempts', COALESCE(v_row.attempts, 0)
    ),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END;
$$;

CREATE TRIGGER environmental_exposure_touch_updated_at
  BEFORE UPDATE ON saude.environmental_exposure
  FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();
CREATE TRIGGER epi_inventory_touch_updated_at
  BEFORE UPDATE ON saude.epi_inventory
  FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();
CREATE TRIGGER epi_delivery_touch_updated_at
  BEFORE UPDATE ON saude.epi_delivery
  FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();
CREATE TRIGGER s2240_pending_touch_updated_at
  BEFORE UPDATE ON esocial.s2240_pending
  FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();

CREATE TRIGGER environmental_exposure_audit
  AFTER INSERT OR UPDATE OR DELETE ON saude.environmental_exposure
  FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();
CREATE TRIGGER epi_inventory_audit
  AFTER INSERT OR UPDATE OR DELETE ON saude.epi_inventory
  FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();
CREATE TRIGGER epi_delivery_audit
  AFTER INSERT OR UPDATE OR DELETE ON saude.epi_delivery
  FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();
CREATE TRIGGER ppp_record_audit
  AFTER INSERT OR DELETE ON saude.ppp_record
  FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();
CREATE TRIGGER s2240_pending_audit
  AFTER INSERT OR UPDATE OR DELETE ON esocial.s2240_pending
  FOR EACH ROW EXECUTE FUNCTION esocial.sgp_s2240_pending_audit();

CREATE OR REPLACE FUNCTION saude.exposure_read_for_payroll(
  p_employee_id uuid,
  p_ref_date date
)
RETURNS TABLE (
  environmental_exposure_id uuid,
  harmful_agent_code text,
  agent_kind saude.harmful_agent_kind,
  intensity_value numeric(18, 6),
  intensity_unit text,
  mitigated_by_epi boolean,
  mitigated_by_epc boolean,
  special_retirement_eligible boolean,
  insalubrity_due boolean,
  danger_pay_due boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = saude, public, pg_catalog
AS $$
  SELECT
    exposure.id,
    exposure.harmful_agent_code,
    exposure.agent_kind,
    exposure.intensity_value,
    exposure.intensity_unit,
    exposure.mitigated_by_epi,
    exposure.mitigated_by_epc,
    exposure.special_retirement_eligible,
    (
      exposure.harmful_agent_code = '01.01.001'
      AND COALESCE(exposure.intensity_value, 0) > 85
      AND exposure.mitigated_by_epi = false
    ) AS insalubrity_due,
    (
      exposure.agent_kind = 'ACIDENTE'::saude.harmful_agent_kind
      AND exposure.special_retirement_eligible = true
    ) AS danger_pay_due
  FROM saude.environmental_exposure exposure
  WHERE exposure.employee_id = p_employee_id
    AND exposure.exposure_start <= p_ref_date
    AND (exposure.exposure_end IS NULL OR exposure.exposure_end >= p_ref_date)
    AND public.sgp_tenant_matches(exposure.tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.exposure.read', 'saude.exposure.write', 'payroll.run.execute', 'folha.write']);
$$;

CREATE OR REPLACE FUNCTION payroll_calc.f_sst_insalubridade(
  p_employee_id uuid,
  p_month integer,
  p_year integer
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = payroll_calc, saude, hr, payroll, public, pg_catalog
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1
      FROM saude.exposure_read_for_payroll(p_employee_id, make_date(p_year, p_month, 1)) exposure
      WHERE exposure.insalubrity_due = true
    )
    THEN payroll_calc.base_salary(p_employee_id, make_date(p_year, p_month, 1)) * 0.20
    ELSE 0
  END;
$$;

INSERT INTO payroll.payroll_earning_deduction (
  tenant_id,
  code,
  description,
  kind,
  taxable,
  active,
  incidences,
  starts_on,
  subject_to_ceiling,
  formula_alias,
  formula_function_name,
  formula_expression,
  formula_function_ddl,
  formula_dependencies,
  formula_ready
)
SELECT
  tenant.id,
  'SST_INSALUBRIDADE',
  'Adicional de insalubridade por exposicao ambiental SST',
  'EARNING'::public."PayrollEntryKind",
  true,
  true,
  '{"sst":true,"insalubridade":true}'::jsonb,
  DATE '2025-01-01',
  true,
  'sst_insalubridade',
  'f_sst_insalubridade',
  NULL,
  'CREATE OR REPLACE FUNCTION payroll_calc.f_sst_insalubridade(uuid, integer, integer) RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = payroll_calc, saude, hr, payroll, public, pg_catalog AS $function$ SELECT CASE WHEN EXISTS (SELECT 1 FROM saude.exposure_read_for_payroll($1, make_date($3, $2, 1)) exposure WHERE exposure.insalubrity_due = true) THEN payroll_calc.base_salary($1, make_date($3, $2, 1)) * 0.20 ELSE 0 END; $function$;',
  ARRAY['BASE_SALARY', 'SST_EXPOSURE'],
  true
FROM public.tenant tenant
ON CONFLICT (tenant_id, code) DO UPDATE
SET formula_alias = EXCLUDED.formula_alias,
    formula_function_name = EXCLUDED.formula_function_name,
    formula_expression = EXCLUDED.formula_expression,
    formula_function_ddl = EXCLUDED.formula_function_ddl,
    formula_dependencies = EXCLUDED.formula_dependencies,
    incidences = EXCLUDED.incidences,
    subject_to_ceiling = EXCLUDED.subject_to_ceiling,
    formula_ready = true,
    formula_error = NULL,
    updated_at = now();

ALTER TABLE saude.environmental_exposure ENABLE ROW LEVEL SECURITY;
ALTER TABLE saude.environmental_exposure FORCE ROW LEVEL SECURITY;
ALTER TABLE saude.epi_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE saude.epi_inventory FORCE ROW LEVEL SECURITY;
ALTER TABLE saude.epi_delivery ENABLE ROW LEVEL SECURITY;
ALTER TABLE saude.epi_delivery FORCE ROW LEVEL SECURITY;
ALTER TABLE saude.ppp_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE saude.ppp_record FORCE ROW LEVEL SECURITY;
ALTER TABLE esocial.s2240_pending ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial.s2240_pending FORCE ROW LEVEL SECURITY;

CREATE POLICY environmental_exposure_rw ON saude.environmental_exposure
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.exposure.read', 'saude.exposure.write', 'saude.epi.read', 'saude.epi.write', 'esocial.event.read', 'esocial.event.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.exposure.write', 'esocial.event.write'])
  );

CREATE POLICY epi_inventory_rw ON saude.epi_inventory
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.exposure.read', 'saude.exposure.write', 'saude.epi.read', 'saude.epi.write', 'esocial.event.read', 'esocial.event.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.epi.write'])
  );

CREATE POLICY epi_delivery_rw ON saude.epi_delivery
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.exposure.read', 'saude.exposure.write', 'saude.epi.read', 'saude.epi.write', 'esocial.event.read', 'esocial.event.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.epi.write'])
  );

CREATE POLICY ppp_record_rw ON saude.ppp_record
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.exposure.read', 'saude.exposure.write', 'saude.epi.read', 'saude.epi.write', 'esocial.event.read', 'esocial.event.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.exposure.write'])
  );

CREATE POLICY s2240_pending_rw ON esocial.s2240_pending
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.exposure.read', 'saude.exposure.write', 'saude.epi.read', 'saude.epi.write', 'esocial.event.read', 'esocial.event.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['saude.exposure.write', 'esocial.event.write'])
  );

WITH sst05_permissions(key, module_key, resource_key, action_key, route_pattern, description) AS (
  VALUES
    ('saude.exposure.read', 'saude', 'exposure', 'read', '/api/v1/saude/exposicoes/**', 'Read environmental exposure, PPP, and S-2240 source records.'),
    ('saude.exposure.write', 'saude', 'exposure', 'write', '/api/v1/saude/exposicoes/**', 'Create and update environmental exposure records and PPP snapshots.'),
    ('saude.epi.read', 'saude', 'epi', 'read', '/api/v1/saude/epi/**', 'Read EPI inventory and delivery records.'),
    ('saude.epi.write', 'saude', 'epi', 'write', '/api/v1/saude/epi/**', 'Create EPI inventory and signed delivery records.')
)
INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
SELECT key, module_key, resource_key, action_key, route_pattern, description
FROM sst05_permissions
ON CONFLICT (key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description,
    updated_at = now();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app_role') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON saude.environmental_exposure TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON saude.epi_inventory TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON saude.epi_delivery TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON saude.ppp_record TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON esocial.s2240_pending TO sgp_app_role;
    GRANT EXECUTE ON FUNCTION saude.exposure_read_for_payroll(uuid, date) TO sgp_app_role;
    GRANT EXECUTE ON FUNCTION payroll_calc.f_sst_insalubridade(uuid, integer, integer) TO sgp_app_role;
  END IF;
END
$$;
