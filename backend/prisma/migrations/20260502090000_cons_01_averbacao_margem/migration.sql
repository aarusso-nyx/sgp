CREATE SCHEMA IF NOT EXISTS payment;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consignment_entity_kind') THEN
    CREATE TYPE payment.consignment_entity_kind AS ENUM ('BANK', 'COOPERATIVE', 'UNION', 'ASSOCIATION');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consignment_status') THEN
    CREATE TYPE payment.consignment_status AS ENUM ('ACTIVE', 'SUSPENDED', 'TERMINATED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consignment_loan_kind') THEN
    CREATE TYPE payment.consignment_loan_kind AS ENUM ('PAYROLL_LOAN', 'CARD', 'OTHER');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consignment_loan_status') THEN
    CREATE TYPE payment.consignment_loan_status AS ENUM ('ACTIVE', 'SUSPENDED', 'TERMINATED', 'TRANSFERRED');
  END IF;
END
$$;

ALTER TABLE hr.employee
  DROP CONSTRAINT IF EXISTS employee_tenant_id_id_uq,
  ADD CONSTRAINT employee_tenant_id_id_uq UNIQUE (tenant_id, id);

CREATE TABLE payment.consignment_entity (
  tenant_id uuid NOT NULL REFERENCES public.tenant(id),
  consignment_entity_id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  cnpj text,
  kind payment.consignment_entity_kind NOT NULL,
  agreement_number text,
  valid_from date NOT NULL,
  valid_to date,
  status payment.consignment_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consignment_entity_pkey PRIMARY KEY (tenant_id, consignment_entity_id),
  CONSTRAINT consignment_entity_code_uq UNIQUE (tenant_id, code),
  CONSTRAINT consignment_entity_valid_range_check CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE TABLE payment.consignment_loan (
  tenant_id uuid NOT NULL REFERENCES public.tenant(id),
  loan_id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  consignment_entity_id uuid NOT NULL,
  contract_number text NOT NULL,
  kind payment.consignment_loan_kind NOT NULL,
  monthly_amount numeric(14,2) NOT NULL,
  installments_total integer NOT NULL,
  installments_paid integer NOT NULL DEFAULT 0,
  rate numeric(18,6) NOT NULL DEFAULT 0,
  valid_from date NOT NULL,
  valid_to date NOT NULL,
  status payment.consignment_loan_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consignment_loan_pkey PRIMARY KEY (tenant_id, loan_id),
  CONSTRAINT consignment_loan_employee_fk FOREIGN KEY (tenant_id, employee_id)
    REFERENCES hr.employee(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT consignment_loan_entity_fk FOREIGN KEY (tenant_id, consignment_entity_id)
    REFERENCES payment.consignment_entity(tenant_id, consignment_entity_id),
  CONSTRAINT consignment_loan_contract_uq UNIQUE (tenant_id, employee_id, contract_number),
  CONSTRAINT consignment_loan_amount_positive_check CHECK (monthly_amount > 0),
  CONSTRAINT consignment_loan_installments_check CHECK (installments_total > 0 AND installments_paid >= 0 AND installments_paid <= installments_total),
  CONSTRAINT consignment_loan_rate_nonnegative_check CHECK (rate >= 0),
  CONSTRAINT consignment_loan_valid_range_check CHECK (valid_to >= valid_from)
);

CREATE INDEX consignment_entity_status_idx ON payment.consignment_entity (tenant_id, status);
CREATE INDEX consignment_loan_employee_status_idx ON payment.consignment_loan (tenant_id, employee_id, status, valid_from, valid_to);
CREATE INDEX consignment_loan_entity_idx ON payment.consignment_loan (tenant_id, consignment_entity_id);

INSERT INTO public.system_parameter (tenant_id, key, value, description, module_key)
SELECT tenant.id, 'consignment.margin.general_pct', '0.35', 'Percentual geral da margem consignavel.', 'payment'
FROM public.tenant tenant
ON CONFLICT (tenant_id, key) DO NOTHING;

INSERT INTO public.system_parameter (tenant_id, key, value, description, module_key)
SELECT tenant.id, 'consignment.margin.card_pct', '0.05', 'Percentual exclusivo de cartao consignado/saque.', 'payment'
FROM public.tenant tenant
ON CONFLICT (tenant_id, key) DO NOTHING;

CREATE OR REPLACE FUNCTION payment.sgp_consignment_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  row_after record;
  row_before record;
  audit_action text;
  resource_id text;
  after_json jsonb;
  before_json jsonb;
BEGIN
  row_after := NEW;
  row_before := OLD;
  audit_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  after_json := to_jsonb(row_after);
  before_json := to_jsonb(row_before);
  resource_id := COALESCE(
    after_json ->> 'loan_id',
    before_json ->> 'loan_id',
    after_json ->> 'consignment_entity_id',
    before_json ->> 'consignment_entity_id'
  );
  PERFORM set_config('app.current_tenant_id', COALESCE(row_after.tenant_id, row_before.tenant_id)::text, true);
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

DROP TRIGGER IF EXISTS consignment_entity_audit ON payment.consignment_entity;
CREATE TRIGGER consignment_entity_audit
  AFTER INSERT OR UPDATE OR DELETE ON payment.consignment_entity
  FOR EACH ROW EXECUTE FUNCTION payment.sgp_consignment_audit();

DROP TRIGGER IF EXISTS consignment_loan_audit ON payment.consignment_loan;
CREATE TRIGGER consignment_loan_audit
  AFTER INSERT OR UPDATE OR DELETE ON payment.consignment_loan
  FOR EACH ROW EXECUTE FUNCTION payment.sgp_consignment_audit();

ALTER TABLE payment.consignment_entity ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment.consignment_entity FORCE ROW LEVEL SECURITY;
ALTER TABLE payment.consignment_loan ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment.consignment_loan FORCE ROW LEVEL SECURITY;

CREATE POLICY consignment_entity_rw ON payment.consignment_entity
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['payment.consignment.read', 'payment.consignment.write'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['payment.consignment.write'])
    )
  );

CREATE POLICY consignment_loan_rw ON payment.consignment_loan
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['payment.consignment.read', 'payment.consignment.write'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['payment.consignment.write'])
    )
  );

CREATE MATERIALIZED VIEW payment.consignment_margin_view AS
WITH parameters AS (
  SELECT
    tenant_id,
    max(value::numeric) FILTER (WHERE key = 'consignment.margin.general_pct') AS general_pct,
    max(value::numeric) FILTER (WHERE key = 'consignment.margin.card_pct') AS card_pct
  FROM public.system_parameter
  WHERE key IN ('consignment.margin.general_pct', 'consignment.margin.card_pct')
  GROUP BY tenant_id
),
base AS (
  SELECT DISTINCT ON (record.tenant_id, record.employee_id, record.competence_year, record.competence_month)
    record.tenant_id,
    record.employee_id,
    make_date(record.competence_year, record.competence_month, 1) AS reference_competence,
    record.net_amount::numeric(14,2) AS net_base
  FROM payroll.payroll_financial_record record
  ORDER BY record.tenant_id, record.employee_id, record.competence_year, record.competence_month, record.generated_at DESC
),
used AS (
  SELECT
    loan.tenant_id,
    loan.employee_id,
    base.reference_competence,
    sum(CASE WHEN loan.kind IN ('PAYROLL_LOAN', 'OTHER') THEN loan.monthly_amount ELSE 0 END)::numeric(14,2) AS used_general,
    sum(CASE WHEN loan.kind = 'CARD' THEN loan.monthly_amount ELSE 0 END)::numeric(14,2) AS used_card
  FROM payment.consignment_loan loan
  JOIN base
    ON base.tenant_id = loan.tenant_id
   AND base.employee_id = loan.employee_id
   AND base.reference_competence BETWEEN date_trunc('month', loan.valid_from)::date AND date_trunc('month', loan.valid_to)::date
  WHERE loan.status = 'ACTIVE'
  GROUP BY loan.tenant_id, loan.employee_id, base.reference_competence
)
SELECT
  base.tenant_id,
  base.employee_id,
  base.reference_competence,
  base.net_base,
  greatest(round(base.net_base * coalesce(parameters.general_pct, 0.35), 2) - coalesce(used.used_general, 0), 0)::numeric(14,2) AS available_general,
  greatest(round(base.net_base * coalesce(parameters.card_pct, 0.05), 2) - coalesce(used.used_card, 0), 0)::numeric(14,2) AS available_card,
  coalesce(used.used_general, 0)::numeric(14,2) AS used_general,
  coalesce(used.used_card, 0)::numeric(14,2) AS used_card
FROM base
LEFT JOIN parameters ON parameters.tenant_id = base.tenant_id
LEFT JOIN used
  ON used.tenant_id = base.tenant_id
 AND used.employee_id = base.employee_id
 AND used.reference_competence = base.reference_competence;

CREATE UNIQUE INDEX consignment_margin_view_uq
  ON payment.consignment_margin_view (tenant_id, employee_id, reference_competence);

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  ('payment.consignment.read', 'payment', 'consignment', 'read', '/api/v1/employees/*/consignment-*', 'Read employee consignment margin and loans.'),
  ('payment.consignment.write', 'payment', 'consignment', 'write', '/api/v1/employees/*/consignment-loans', 'Create and maintain employee consignment loans.')
ON CONFLICT (key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description;
