DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'hr' AND t.typname = 'employee_transfer_type'
  ) THEN
    CREATE TYPE hr.employee_transfer_type AS ENUM (
      'oficio',
      'pedido_criterio',
      'pedido_localidade',
      'permuta'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'hr' AND t.typname = 'employee_transfer_status'
  ) THEN
    CREATE TYPE hr.employee_transfer_status AS ENUM (
      'solicitada',
      'aprovada',
      'efetivada',
      'indeferida',
      'cancelada'
    );
  END IF;
END
$$;

ALTER TABLE hr.employee_transfer
  ADD COLUMN IF NOT EXISTS origem_work_location_id uuid,
  ADD COLUMN IF NOT EXISTS destino_work_location_id uuid,
  ADD COLUMN IF NOT EXISTS origem_job_position_id uuid,
  ADD COLUMN IF NOT EXISTS destino_job_position_id uuid,
  ADD COLUMN IF NOT EXISTS tipo hr.employee_transfer_type NOT NULL DEFAULT 'oficio',
  ADD COLUMN IF NOT EXISTS data_solicitacao date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS data_efeito date,
  ADD COLUMN IF NOT EXISTS processo_administrativo_id uuid,
  ADD COLUMN IF NOT EXISTS status hr.employee_transfer_status NOT NULL DEFAULT 'solicitada',
  ADD COLUMN IF NOT EXISTS aprovador_user_id uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE hr.employee_transfer
SET
  origem_work_location_id = COALESCE(origem_work_location_id, to_work_location_id),
  destino_work_location_id = COALESCE(destino_work_location_id, to_work_location_id),
  data_efeito = COALESCE(data_efeito, effective_on),
  updated_at = now()
WHERE data_efeito IS NULL
   OR destino_work_location_id IS NULL;

ALTER TABLE hr.employee_transfer
  ALTER COLUMN data_efeito SET NOT NULL;

ALTER TABLE hr.employee_transfer
  ADD CONSTRAINT employee_transfer_origem_work_location_fk
    FOREIGN KEY (origem_work_location_id) REFERENCES hr.work_location(id),
  ADD CONSTRAINT employee_transfer_destino_work_location_fk
    FOREIGN KEY (destino_work_location_id) REFERENCES hr.work_location(id),
  ADD CONSTRAINT employee_transfer_origem_job_position_fk
    FOREIGN KEY (origem_job_position_id) REFERENCES hr.job_position(id),
  ADD CONSTRAINT employee_transfer_destino_job_position_fk
    FOREIGN KEY (destino_job_position_id) REFERENCES hr.job_position(id),
  ADD CONSTRAINT employee_transfer_processo_administrativo_fk
    FOREIGN KEY (processo_administrativo_id) REFERENCES hr.administrative_process(id),
  ADD CONSTRAINT employee_transfer_aprovador_user_fk
    FOREIGN KEY (aprovador_user_id) REFERENCES public.user_account(id);

CREATE INDEX IF NOT EXISTS employee_transfer_tenant_employee_data_efeito_idx
  ON hr.employee_transfer (tenant_id, employee_id, data_efeito DESC);

CREATE OR REPLACE FUNCTION hr.sgp_effect_employee_transfer()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_before jsonb;
  v_after jsonb;
BEGIN
  IF NEW.status = 'efetivada'::hr.employee_transfer_status
     AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT jsonb_build_object(
      'work_location_id', e.work_location_id,
      'job_position_id', e.job_position_id
    )
    INTO v_before
    FROM hr.employee e
    WHERE e.id = NEW.employee_id;

    UPDATE hr.employee
    SET
      work_location_id = NEW.destino_work_location_id,
      job_position_id = COALESCE(NEW.destino_job_position_id, job_position_id),
      updated_at = now()
    WHERE id = NEW.employee_id
      AND tenant_id = NEW.tenant_id;

    SELECT jsonb_build_object(
      'work_location_id', e.work_location_id,
      'job_position_id', e.job_position_id
    )
    INTO v_after
    FROM hr.employee e
    WHERE e.id = NEW.employee_id;

    PERFORM public.sgp_append_audit_event(
      'UPDATE',
      'rh.employee_transfer',
      NEW.id::text,
      NULLIF(current_setting('app.current_user_id', true), '')::uuid,
      NULLIF(current_setting('app.current_user_sub', true), ''),
      NULLIF(current_setting('app.current_login', true), ''),
      'hr.employee_transfer',
      NULLIF(current_setting('app.request_id', true), ''),
      jsonb_build_object(
        'event', 'rh.movimentacao.efetivada',
        'employee_id', NEW.employee_id,
        'diff', jsonb_build_object('before', v_before, 'after', v_after)
      ),
      'employee_transfer_effected',
      NULL,
      NULL
    );
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS employee_transfer_effect_after_update ON hr.employee_transfer;
CREATE TRIGGER employee_transfer_effect_after_update
  AFTER UPDATE ON hr.employee_transfer
  FOR EACH ROW
  EXECUTE FUNCTION hr.sgp_effect_employee_transfer();

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  ('rh.movimentacao.read', 'rh', 'movimentacao', 'read', '/api/v1/rh/employee-transfer/**', 'Read employee transfer requests and history.'),
  ('rh.movimentacao.request', 'rh', 'movimentacao', 'request', '/api/v1/rh/employee-transfer', 'Request employee transfer workflows.'),
  ('rh.movimentacao.approve', 'rh', 'movimentacao', 'approve', '/api/v1/rh/employee-transfer/*/aprovar', 'Approve employee transfer workflows.'),
  ('rh.movimentacao.effect', 'rh', 'movimentacao', 'effect', '/api/v1/rh/employee-transfer/*/efetivar', 'Effect approved employee transfer workflows.')
ON CONFLICT (key) DO UPDATE
SET
  module_key = EXCLUDED.module_key,
  resource_key = EXCLUDED.resource_key,
  action_key = EXCLUDED.action_key,
  route_pattern = EXCLUDED.route_pattern,
  description = EXCLUDED.description;

DROP POLICY IF EXISTS employee_transfer_select ON hr.employee_transfer;
CREATE POLICY employee_transfer_select ON hr.employee_transfer
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY[
        'rh.movimentacao.read',
        'rh.movimentacao.request',
        'rh.movimentacao.approve',
        'rh.movimentacao.effect'
      ])
    )
  );

DROP POLICY IF EXISTS employee_transfer_write ON hr.employee_transfer;
CREATE POLICY employee_transfer_write ON hr.employee_transfer
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY[
        'rh.movimentacao.request',
        'rh.movimentacao.approve',
        'rh.movimentacao.effect'
      ])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY[
        'rh.movimentacao.request',
        'rh.movimentacao.approve',
        'rh.movimentacao.effect'
      ])
    )
  );
