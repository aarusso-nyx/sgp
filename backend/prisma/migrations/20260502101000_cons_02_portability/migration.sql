DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consignment_portability_file_status') THEN
    CREATE TYPE payment.consignment_portability_file_status AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consignment_portability_detail_status') THEN
    CREATE TYPE payment.consignment_portability_detail_status AS ENUM ('MATCHED', 'UNMATCHED', 'REJECTED');
  END IF;
END
$$;

CREATE TABLE payment.consignment_portability_file (
  tenant_id uuid NOT NULL REFERENCES public.tenant(id),
  file_id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_consignment_entity_id uuid NOT NULL,
  target_consignment_entity_id uuid NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  received_by uuid,
  file_hash text NOT NULL,
  status payment.consignment_portability_file_status NOT NULL DEFAULT 'RECEIVED',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consignment_portability_file_pkey PRIMARY KEY (tenant_id, file_id),
  CONSTRAINT consignment_portability_file_source_fk FOREIGN KEY (tenant_id, source_consignment_entity_id)
    REFERENCES payment.consignment_entity(tenant_id, consignment_entity_id),
  CONSTRAINT consignment_portability_file_target_fk FOREIGN KEY (tenant_id, target_consignment_entity_id)
    REFERENCES payment.consignment_entity(tenant_id, consignment_entity_id),
  CONSTRAINT consignment_portability_file_hash_check CHECK (length(file_hash) > 0),
  CONSTRAINT consignment_portability_file_entities_check CHECK (source_consignment_entity_id <> target_consignment_entity_id)
);

CREATE TABLE payment.consignment_portability_detail (
  tenant_id uuid NOT NULL,
  file_id uuid NOT NULL,
  sequence integer NOT NULL,
  employee_cpf text NOT NULL,
  source_contract_number text NOT NULL,
  target_contract_number text NOT NULL,
  transferred_balance numeric(14,2) NOT NULL,
  new_monthly_amount numeric(14,2) NOT NULL,
  new_rate numeric(18,6) NOT NULL,
  new_installments_total integer NOT NULL,
  internal_status payment.consignment_portability_detail_status NOT NULL DEFAULT 'REJECTED',
  reject_reason text,
  matched_loan_id uuid,
  created_loan_id uuid,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consignment_portability_detail_pkey PRIMARY KEY (tenant_id, file_id, sequence),
  CONSTRAINT consignment_portability_detail_file_fk FOREIGN KEY (tenant_id, file_id)
    REFERENCES payment.consignment_portability_file(tenant_id, file_id) ON DELETE CASCADE,
  CONSTRAINT consignment_portability_detail_matched_fk FOREIGN KEY (tenant_id, matched_loan_id)
    REFERENCES payment.consignment_loan(tenant_id, loan_id),
  CONSTRAINT consignment_portability_detail_created_fk FOREIGN KEY (tenant_id, created_loan_id)
    REFERENCES payment.consignment_loan(tenant_id, loan_id),
  CONSTRAINT consignment_portability_detail_balance_check CHECK (transferred_balance >= 0),
  CONSTRAINT consignment_portability_detail_monthly_check CHECK (new_monthly_amount > 0),
  CONSTRAINT consignment_portability_detail_rate_check CHECK (new_rate >= 0),
  CONSTRAINT consignment_portability_detail_installments_check CHECK (new_installments_total > 0)
);

ALTER TABLE payment.consignment_loan
  ADD COLUMN transferred_to_loan_id uuid,
  ADD COLUMN transferred_from_loan_id uuid;

ALTER TABLE payment.consignment_loan
  ADD CONSTRAINT consignment_loan_transferred_to_fk FOREIGN KEY (tenant_id, transferred_to_loan_id)
    REFERENCES payment.consignment_loan(tenant_id, loan_id),
  ADD CONSTRAINT consignment_loan_transferred_from_fk FOREIGN KEY (tenant_id, transferred_from_loan_id)
    REFERENCES payment.consignment_loan(tenant_id, loan_id),
  ADD CONSTRAINT consignment_loan_transfer_not_self_check CHECK (
    (transferred_to_loan_id IS NULL OR transferred_to_loan_id <> loan_id)
    AND (transferred_from_loan_id IS NULL OR transferred_from_loan_id <> loan_id)
  );

CREATE UNIQUE INDEX consignment_loan_transfer_to_uq
  ON payment.consignment_loan (tenant_id, transferred_to_loan_id)
  WHERE transferred_to_loan_id IS NOT NULL;

CREATE UNIQUE INDEX consignment_loan_transfer_from_uq
  ON payment.consignment_loan (tenant_id, transferred_from_loan_id)
  WHERE transferred_from_loan_id IS NOT NULL;

CREATE INDEX consignment_portability_file_status_idx
  ON payment.consignment_portability_file (tenant_id, status, received_at DESC);

CREATE INDEX consignment_portability_detail_status_idx
  ON payment.consignment_portability_detail (tenant_id, file_id, internal_status);

CREATE OR REPLACE FUNCTION payment.sgp_consignment_portability_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  row_after record;
  row_before record;
  audit_action text;
  resource_id text;
BEGIN
  row_after := NEW;
  row_before := OLD;
  audit_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  resource_id := COALESCE(
    to_jsonb(row_after) ->> 'file_id',
    to_jsonb(row_before) ->> 'file_id'
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
    jsonb_build_object('operation', TG_OP, 'before', to_jsonb(row_before), 'after', to_jsonb(row_after)),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN COALESCE(NEW, OLD);
END
$$;

DROP TRIGGER IF EXISTS consignment_portability_file_audit ON payment.consignment_portability_file;
CREATE TRIGGER consignment_portability_file_audit
  AFTER INSERT OR UPDATE OR DELETE ON payment.consignment_portability_file
  FOR EACH ROW EXECUTE FUNCTION payment.sgp_consignment_portability_audit();

DROP TRIGGER IF EXISTS consignment_portability_detail_audit ON payment.consignment_portability_detail;
CREATE TRIGGER consignment_portability_detail_audit
  AFTER INSERT OR UPDATE OR DELETE ON payment.consignment_portability_detail
  FOR EACH ROW EXECUTE FUNCTION payment.sgp_consignment_portability_audit();

ALTER TABLE payment.consignment_portability_file ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment.consignment_portability_file FORCE ROW LEVEL SECURITY;
ALTER TABLE payment.consignment_portability_detail ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment.consignment_portability_detail FORCE ROW LEVEL SECURITY;

CREATE POLICY consignment_portability_file_rw ON payment.consignment_portability_file
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

CREATE POLICY consignment_portability_detail_rw ON payment.consignment_portability_detail
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

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  ('payment.consignment.read', 'payment', 'consignment', 'read', '/api/v1/payment/consignment-portability*', 'Read employee consignment margin, loans, and portability files.'),
  ('payment.consignment.write', 'payment', 'consignment', 'write', '/api/v1/payment/consignment-portability*', 'Create loans and process consignment portability files.')
ON CONFLICT (key) DO UPDATE
SET description = EXCLUDED.description;
