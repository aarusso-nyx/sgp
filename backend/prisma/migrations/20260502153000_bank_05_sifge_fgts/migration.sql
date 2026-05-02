CREATE SCHEMA IF NOT EXISTS payment;

DO $$
BEGIN
  IF to_regtype('payment.fgts_remittance_kind') IS NULL THEN
    CREATE TYPE payment.fgts_remittance_kind AS ENUM ('GRF_MONTHLY', 'GRRF_TERMINATION');
  END IF;
  IF to_regtype('payment.fgts_remittance_status') IS NULL THEN
    CREATE TYPE payment.fgts_remittance_status AS ENUM ('DRAFT', 'GENERATED', 'SENT', 'PAID', 'REJECTED');
  END IF;
END
$$;

CREATE TABLE payment.fgts_remittance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id),
  competence date NOT NULL,
  kind payment.fgts_remittance_kind NOT NULL,
  status payment.fgts_remittance_status NOT NULL DEFAULT 'DRAFT',
  generated_at timestamptz,
  paid_at timestamptz,
  total_base numeric(14,2) NOT NULL DEFAULT 0,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  file_uri text,
  dae_barcode text,
  layout_version text NOT NULL DEFAULT 'SIFGE-4.0',
  adapter_key text NOT NULL DEFAULT 'caixa-sifge-v4',
  file_hash text,
  signed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fgts_remittance_amount_check CHECK (total_base >= 0 AND total_amount >= 0),
  CONSTRAINT fgts_remittance_paid_check CHECK (paid_at IS NULL OR status = 'PAID')
);

CREATE TABLE payment.fgts_grf (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id),
  fgts_remittance_id uuid NOT NULL REFERENCES payment.fgts_remittance(id) ON DELETE CASCADE,
  payroll_run_id uuid NOT NULL REFERENCES payroll.payroll_run(id) ON DELETE RESTRICT,
  employee_count integer NOT NULL,
  base_amount numeric(14,2) NOT NULL,
  rate numeric(18,6) NOT NULL,
  amount numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fgts_grf_amount_check CHECK (employee_count >= 0 AND base_amount >= 0 AND rate >= 0 AND amount >= 0),
  CONSTRAINT fgts_grf_remittance_uq UNIQUE (tenant_id, fgts_remittance_id, payroll_run_id)
);

CREATE TABLE payment.fgts_grrf (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id),
  fgts_remittance_id uuid NOT NULL REFERENCES payment.fgts_remittance(id) ON DELETE CASCADE,
  employment_link_id uuid NOT NULL,
  termination_date date NOT NULL,
  base_balance numeric(14,2) NOT NULL,
  fine_rate numeric(18,6) NOT NULL,
  fine_amount numeric(14,2) NOT NULL,
  notice_amount numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fgts_grrf_employment_link_fk FOREIGN KEY (tenant_id, employment_link_id)
    REFERENCES hr.employment_link(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT fgts_grrf_amount_check CHECK (
    base_balance >= 0 AND fine_rate >= 0 AND fine_amount >= 0 AND notice_amount >= 0
  ),
  CONSTRAINT fgts_grrf_remittance_uq UNIQUE (tenant_id, fgts_remittance_id, employment_link_id)
);

CREATE TABLE payment.fgts_caixa_adapter (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenant(id),
  adapter_key text NOT NULL,
  layout_version text NOT NULL,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fgts_caixa_adapter_key_uq UNIQUE (tenant_id, adapter_key),
  CONSTRAINT fgts_caixa_adapter_params_object CHECK (jsonb_typeof(params) = 'object')
);

CREATE UNIQUE INDEX fgts_caixa_adapter_active_uq
  ON payment.fgts_caixa_adapter (tenant_id)
  WHERE active;

CREATE INDEX fgts_remittance_tenant_competence_idx
  ON payment.fgts_remittance (tenant_id, competence, kind, status);

CREATE INDEX fgts_grf_run_idx
  ON payment.fgts_grf (tenant_id, payroll_run_id);

CREATE INDEX fgts_grrf_link_idx
  ON payment.fgts_grrf (tenant_id, employment_link_id, termination_date);

CREATE OR REPLACE FUNCTION payment.sgp_fgts_remittance_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  after_json jsonb;
  before_json jsonb;
  audit_action text;
  resource_id text;
  row_tenant_id uuid;
BEGIN
  before_json := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL::jsonb END;
  after_json := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL::jsonb END;
  audit_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  row_tenant_id := COALESCE(NEW.tenant_id, OLD.tenant_id);
  resource_id := COALESCE(
    after_json ->> 'id',
    before_json ->> 'id',
    after_json ->> 'fgts_remittance_id',
    before_json ->> 'fgts_remittance_id'
  );

  PERFORM set_config('app.current_tenant_id', row_tenant_id::text, true);
  PERFORM public.sgp_append_audit_event(
    audit_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    resource_id,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('operation', TG_OP, 'before', before_json, 'after', after_json),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN COALESCE(NEW, OLD);
END
$$;

CREATE OR REPLACE FUNCTION payment.sgp_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS fgts_remittance_touch_updated_at ON payment.fgts_remittance;
CREATE TRIGGER fgts_remittance_touch_updated_at
  BEFORE UPDATE ON payment.fgts_remittance
  FOR EACH ROW EXECUTE FUNCTION payment.sgp_touch_updated_at();

DROP TRIGGER IF EXISTS fgts_caixa_adapter_touch_updated_at ON payment.fgts_caixa_adapter;
CREATE TRIGGER fgts_caixa_adapter_touch_updated_at
  BEFORE UPDATE ON payment.fgts_caixa_adapter
  FOR EACH ROW EXECUTE FUNCTION payment.sgp_touch_updated_at();

DROP TRIGGER IF EXISTS fgts_remittance_audit ON payment.fgts_remittance;
CREATE TRIGGER fgts_remittance_audit
  AFTER INSERT OR UPDATE OR DELETE ON payment.fgts_remittance
  FOR EACH ROW EXECUTE FUNCTION payment.sgp_fgts_remittance_audit();

DROP TRIGGER IF EXISTS fgts_grf_audit ON payment.fgts_grf;
CREATE TRIGGER fgts_grf_audit
  AFTER INSERT OR UPDATE OR DELETE ON payment.fgts_grf
  FOR EACH ROW EXECUTE FUNCTION payment.sgp_fgts_remittance_audit();

DROP TRIGGER IF EXISTS fgts_grrf_audit ON payment.fgts_grrf;
CREATE TRIGGER fgts_grrf_audit
  AFTER INSERT OR UPDATE OR DELETE ON payment.fgts_grrf
  FOR EACH ROW EXECUTE FUNCTION payment.sgp_fgts_remittance_audit();

DROP TRIGGER IF EXISTS fgts_caixa_adapter_audit ON payment.fgts_caixa_adapter;
CREATE TRIGGER fgts_caixa_adapter_audit
  AFTER INSERT OR UPDATE OR DELETE ON payment.fgts_caixa_adapter
  FOR EACH ROW EXECUTE FUNCTION payment.sgp_fgts_remittance_audit();

ALTER TABLE payment.fgts_remittance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment.fgts_remittance FORCE ROW LEVEL SECURITY;
ALTER TABLE payment.fgts_grf ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment.fgts_grf FORCE ROW LEVEL SECURITY;
ALTER TABLE payment.fgts_grrf ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment.fgts_grrf FORCE ROW LEVEL SECURITY;
ALTER TABLE payment.fgts_caixa_adapter ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment.fgts_caixa_adapter FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fgts_remittance_tenant_policy ON payment.fgts_remittance;
CREATE POLICY fgts_remittance_tenant_policy ON payment.fgts_remittance
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['payroll.fgts.read', 'payroll.fgts.write', 'payment.remittance.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['payroll.fgts.read', 'payroll.fgts.write', 'payment.remittance.write'])
  );

DROP POLICY IF EXISTS fgts_grf_tenant_policy ON payment.fgts_grf;
CREATE POLICY fgts_grf_tenant_policy ON payment.fgts_grf
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['payroll.fgts.read', 'payroll.fgts.write', 'payment.remittance.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['payroll.fgts.read', 'payroll.fgts.write', 'payment.remittance.write'])
  );

DROP POLICY IF EXISTS fgts_grrf_tenant_policy ON payment.fgts_grrf;
CREATE POLICY fgts_grrf_tenant_policy ON payment.fgts_grrf
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['payroll.fgts.read', 'payroll.fgts.write', 'payment.remittance.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['payroll.fgts.read', 'payroll.fgts.write', 'payment.remittance.write'])
  );

DROP POLICY IF EXISTS fgts_caixa_adapter_tenant_policy ON payment.fgts_caixa_adapter;
CREATE POLICY fgts_caixa_adapter_tenant_policy ON payment.fgts_caixa_adapter
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['payroll.fgts.read', 'payroll.fgts.write', 'payment.remittance.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['payroll.fgts.read', 'payroll.fgts.write', 'payment.remittance.write'])
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app_role') THEN
    GRANT USAGE ON SCHEMA payment TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON payment.fgts_remittance TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON payment.fgts_grf TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON payment.fgts_grrf TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON payment.fgts_caixa_adapter TO sgp_app_role;
  END IF;
END
$$;
