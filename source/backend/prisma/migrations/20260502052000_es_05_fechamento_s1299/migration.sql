-- ES-05 S-1299 competence closure and S-5xxx totalizer ingestion.

ALTER TYPE esocial.s1xxx_event_kind ADD VALUE IF NOT EXISTS 'S-1299';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type type_row
    JOIN pg_namespace namespace_row ON namespace_row.oid = type_row.typnamespace
    WHERE namespace_row.nspname = 'esocial'
      AND type_row.typname = 's1299_emission_status'
  ) THEN
    CREATE TYPE esocial.s1299_emission_status AS ENUM (
      'PENDING',
      'EMITTED',
      'ACCEPTED',
      'REJECTED'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type type_row
    JOIN pg_namespace namespace_row ON namespace_row.oid = type_row.typnamespace
    WHERE namespace_row.nspname = 'esocial'
      AND type_row.typname = 'esocial_totalizer_kind'
  ) THEN
    CREATE TYPE esocial.esocial_totalizer_kind AS ENUM (
      'S-5001',
      'S-5002',
      'S-5003',
      'S-5011',
      'S-5012',
      'S-5013'
    );
  END IF;
END
$$;

ALTER TABLE esocial.s1299_emission_state
  DROP CONSTRAINT IF EXISTS s1299_emission_state_competence_chk,
  DROP CONSTRAINT IF EXISTS s1299_emission_state_status_chk;

ALTER TABLE esocial.s1299_emission_state
  ADD COLUMN IF NOT EXISTS recibo text,
  ADD COLUMN IF NOT EXISTS emitted_at timestamptz;

UPDATE esocial.s1299_emission_state
SET emitted_at = COALESCE(emitted_at, accepted_at),
    recibo = COALESCE(recibo, NULLIF(recibo, ''))
WHERE status IN ('EMITTED', 'ACCEPTED')
  AND emitted_at IS NULL;

ALTER TABLE esocial.s1299_emission_state
  ALTER COLUMN competence TYPE date
    USING CASE
      WHEN pg_typeof(competence)::text = 'date' THEN competence::date
      WHEN competence::text ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
        THEN to_date(competence::text || '-01', 'YYYY-MM-DD')
      ELSE competence::text::date
    END,
  ALTER COLUMN status TYPE esocial.s1299_emission_status
    USING status::text::esocial.s1299_emission_status,
  ALTER COLUMN status SET DEFAULT 'PENDING'::esocial.s1299_emission_status;

CREATE TABLE IF NOT EXISTS esocial.esocial_totalizer (
  tenant_id uuid NOT NULL,
  competence date NOT NULL,
  kind esocial.esocial_totalizer_kind NOT NULL,
  source_event_recibo text NOT NULL,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT esocial_totalizer_pkey PRIMARY KEY (
    tenant_id,
    competence,
    kind,
    source_event_recibo
  ),
  CONSTRAINT esocial_totalizer_tenant_fk FOREIGN KEY (tenant_id) REFERENCES public.tenant(id),
  CONSTRAINT esocial_totalizer_payload_object_chk CHECK (jsonb_typeof(payload) = 'object')
);

CREATE INDEX IF NOT EXISTS esocial_totalizer_lookup_idx
  ON esocial.esocial_totalizer (tenant_id, competence, kind);

CREATE OR REPLACE VIEW esocial.v_competence_periodics_pending
WITH (security_invoker = true) AS
WITH run_workers AS (
  SELECT DISTINCT
    run.tenant_id,
    make_date(run.competence_year, run.competence_month, 1) AS competence,
    run.id AS payroll_run_id,
    item.employee_id
  FROM payroll.payroll_run run
  JOIN payroll.employee_payroll_item item
    ON item.tenant_id = run.tenant_id
   AND item.payroll_run_id = run.id
   AND item.deleted_at IS NULL
  WHERE run.status IN (
    'GENERATED'::public."PayrollRunStatus",
    'APPROVED'::public."PayrollRunStatus",
    'PAID'::public."PayrollRunStatus",
    'CLOSED'::public."PayrollRunStatus"
  )
),
paid_workers AS (
  SELECT DISTINCT
    file.tenant_id,
    make_date(file.competence_year, file.competence_month, 1) AS competence,
    file.payroll_run_id,
    file.id AS payment_batch_id,
    detail.employee_id
  FROM payroll.payment_remittance_file file
  JOIN payroll.payment_remittance_detail detail
    ON detail.tenant_id = file.tenant_id
   AND detail.file_id = file.id
  WHERE file.status = 'PAID'::public."PaymentRemittanceStatus"
    AND COALESCE(NULLIF(detail.occurrence_code, ''), '00') IN ('0', '00', '000')
)
SELECT
  run_workers.tenant_id,
  run_workers.competence,
  'S-1200'::text AS event_kind,
  run_workers.payroll_run_id,
  NULL::uuid AS payment_batch_id,
  run_workers.employee_id,
  'missing_s1200_receipt'::text AS reason
FROM run_workers
WHERE NOT EXISTS (
  SELECT 1
  FROM esocial.s1200_emission_state state
  WHERE state.tenant_id = run_workers.tenant_id
    AND state.payroll_run_id = run_workers.payroll_run_id
    AND state.employee_id = run_workers.employee_id
    AND NULLIF(btrim(state.recibo), '') IS NOT NULL
)
UNION ALL
SELECT
  paid_workers.tenant_id,
  paid_workers.competence,
  'S-1210'::text AS event_kind,
  paid_workers.payroll_run_id,
  paid_workers.payment_batch_id,
  paid_workers.employee_id,
  'missing_s1210_receipt'::text AS reason
FROM paid_workers
WHERE NOT EXISTS (
  SELECT 1
  FROM esocial.s1210_emission_state state
  WHERE state.tenant_id = paid_workers.tenant_id
    AND state.payment_batch_id = paid_workers.payment_batch_id
    AND state.employee_id = paid_workers.employee_id
    AND NULLIF(btrim(state.recibo), '') IS NOT NULL
);

CREATE OR REPLACE FUNCTION esocial.sgp_es05_state_totalizer_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_row record;
  v_action text;
  v_resource_id text;
  v_kind text;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  IF TG_TABLE_NAME = 's1299_emission_state' THEN
    v_resource_id := v_row.competence::text;
    v_kind := 'S-1299';
  ELSE
    v_resource_id := v_row.competence::text || ':' || v_row.kind::text || ':' || v_row.source_event_recibo;
    v_kind := v_row.kind::text;
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
    jsonb_build_object(
      'operation', TG_OP,
      'competence', v_row.competence::text,
      'kind', v_kind
    ),
    NULL::text,
    NULL::text,
    NULL::text
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_s1299_emission_state_audit ON esocial.s1299_emission_state;
CREATE TRIGGER trg_s1299_emission_state_audit
  AFTER INSERT OR UPDATE OR DELETE ON esocial.s1299_emission_state
  FOR EACH ROW EXECUTE FUNCTION esocial.sgp_es05_state_totalizer_audit();

DROP TRIGGER IF EXISTS trg_esocial_totalizer_audit ON esocial.esocial_totalizer;
CREATE TRIGGER trg_esocial_totalizer_audit
  AFTER INSERT OR UPDATE OR DELETE ON esocial.esocial_totalizer
  FOR EACH ROW EXECUTE FUNCTION esocial.sgp_es05_state_totalizer_audit();

CREATE OR REPLACE FUNCTION esocial.sgp_s3000_prepare_request()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_event public.esocial_event;
  v_block_reason text;
BEGIN
  SELECT * INTO v_event
  FROM public.esocial_event
  WHERE id = NEW.target_event_id
    AND tenant_id = NEW.tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'S-3000 target event not found for tenant' USING ERRCODE = '23503';
  END IF;

  IF v_event.receipt_number IS NULL AND NULLIF(btrim(v_event.reference), '') IS NULL THEN
    RAISE EXCEPTION 'S-3000 target event requires accepted receipt' USING ERRCODE = '23514';
  END IF;

  IF v_event.status <> 'PROCESSADO_COM_SUCESSO'::public."ESocialEventStatus" THEN
    RAISE EXCEPTION 'S-3000 target event must be accepted before exclusion' USING ERRCODE = '23514';
  END IF;

  NEW.target_event_kind := COALESCE(NULLIF(btrim(NEW.target_event_kind), ''), v_event.event_type);
  NEW.target_recibo := COALESCE(NULLIF(btrim(NEW.target_recibo), ''), v_event.receipt_number, v_event.reference);
  NEW.updated_at := now();

  IF esocial.sgp_s3000_is_periodic(NEW.target_event_kind) THEN
    SELECT 'periodic_competence_closed_by_s1299'
    INTO v_block_reason
    FROM esocial.s1299_emission_state state
    WHERE state.tenant_id = NEW.tenant_id
      AND state.competence = to_date(v_event.competence || '-01', 'YYYY-MM-DD')
      AND state.status = 'ACCEPTED'::esocial.s1299_emission_status
    LIMIT 1;

    IF v_block_reason IS NOT NULL THEN
      NEW.status := 'BLOCKED';
      NEW.block_reason := v_block_reason;
    END IF;
  END IF;

  RETURN NEW;
END
$$;

ALTER TABLE esocial.s1299_emission_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial.s1299_emission_state FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS s1299_emission_state_select ON esocial.s1299_emission_state;
CREATE POLICY s1299_emission_state_select ON esocial.s1299_emission_state
  FOR SELECT USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['esocial.event.read', 'esocial.event.write'])
  );
DROP POLICY IF EXISTS s1299_emission_state_write ON esocial.s1299_emission_state;
CREATE POLICY s1299_emission_state_write ON esocial.s1299_emission_state
  FOR ALL USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['esocial.event.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['esocial.event.write'])
  );

ALTER TABLE esocial.esocial_totalizer ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial.esocial_totalizer FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS esocial_totalizer_select ON esocial.esocial_totalizer;
CREATE POLICY esocial_totalizer_select ON esocial.esocial_totalizer
  FOR SELECT USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['esocial.event.read', 'esocial.event.write'])
  );
DROP POLICY IF EXISTS esocial_totalizer_write ON esocial.esocial_totalizer;
CREATE POLICY esocial_totalizer_write ON esocial.esocial_totalizer
  FOR ALL USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['esocial.event.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['esocial.event.write'])
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app_role') THEN
    GRANT SELECT ON esocial.v_competence_periodics_pending TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON esocial.s1299_emission_state TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON esocial.esocial_totalizer TO sgp_app_role;
  END IF;
END
$$;
