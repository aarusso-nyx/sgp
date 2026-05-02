-- HR-01 employee admission and termination lifecycle.

ALTER TABLE hr.employee
  ADD COLUMN IF NOT EXISTS pis_pasep text,
  ADD COLUMN IF NOT EXISTS rg text,
  ADD COLUMN IF NOT EXISTS rg_issuer text,
  ADD COLUMN IF NOT EXISTS mother_name text,
  ADD COLUMN IF NOT EXISTS father_name text,
  ADD COLUMN IF NOT EXISTS nationality_code text,
  ADD COLUMN IF NOT EXISTS birth_city_code text,
  ADD COLUMN IF NOT EXISTS address jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS hr.employment_contract (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  employment_link_id uuid NOT NULL,
  contract_type_id uuid NOT NULL,
  appointed_on date,
  possession_on date,
  exercise_on date,
  starts_on date NOT NULL,
  ends_on date,
  legal_basis text NOT NULL DEFAULT '',
  status "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT employment_contract_pkey PRIMARY KEY (id),
  CONSTRAINT employment_contract_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT employment_contract_employment_link_id_fkey
    FOREIGN KEY (employment_link_id) REFERENCES hr.employment_link(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT employment_contract_contract_type_id_fkey
    FOREIGN KEY (contract_type_id) REFERENCES hr.contract_type(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT employment_contract_dates_check CHECK (ends_on IS NULL OR ends_on >= starts_on)
);

CREATE INDEX IF NOT EXISTS employment_contract_tenant_employee_idx
  ON hr.employment_contract(tenant_id, employee_id, starts_on DESC);
CREATE INDEX IF NOT EXISTS employment_contract_employment_link_idx
  ON hr.employment_contract(employment_link_id);
CREATE INDEX IF NOT EXISTS employment_contract_contract_type_idx
  ON hr.employment_contract(contract_type_id);
CREATE UNIQUE INDEX IF NOT EXISTS employment_contract_one_active_employee_idx
  ON hr.employment_contract(tenant_id, employee_id)
  WHERE ends_on IS NULL AND status = 'ACTIVE'::"RecordStatus";

CREATE OR REPLACE FUNCTION hr.sgp_hr01_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hr01_employment_contract_updated_at ON hr.employment_contract;
CREATE TRIGGER hr01_employment_contract_updated_at
  BEFORE UPDATE ON hr.employment_contract
  FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr01_set_updated_at();

CREATE OR REPLACE FUNCTION hr.sgp_hr01_status_history_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'employee_status_history is immutable' USING ERRCODE = '0A000';
END;
$$;

DROP TRIGGER IF EXISTS hr01_status_history_immutable ON hr.employee_status_history;
CREATE TRIGGER hr01_status_history_immutable
  BEFORE UPDATE OR DELETE ON hr.employee_status_history
  FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr01_status_history_immutable();

CREATE OR REPLACE FUNCTION hr.sgp_hr01_employee_timeline()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_previous_tenant_id text;
  v_previous_tenant text;
  v_using_row_tenant boolean := false;
  v_action text;
BEGIN
  IF TG_OP = 'UPDATE'
    AND NEW.functional_status_id IS NOT DISTINCT FROM OLD.functional_status_id
    AND NEW.terminated_on IS NOT DISTINCT FROM OLD.terminated_on
    AND NEW.lifecycle_status IS NOT DISTINCT FROM OLD.lifecycle_status
  THEN
    RETURN NEW;
  END IF;

  v_previous_tenant_id := NULLIF(current_setting('app.current_tenant_id', true), '');
  v_previous_tenant := NULLIF(current_setting('app.current_tenant', true), '');
  IF v_previous_tenant_id IS NULL AND NEW.tenant_id IS NOT NULL THEN
    PERFORM set_config('app.current_tenant_id', NEW.tenant_id::text, true);
    IF v_previous_tenant IS NULL THEN
      PERFORM set_config('app.current_tenant', NEW.tenant_id::text, true);
    END IF;
    v_using_row_tenant := true;
  END IF;

  IF NEW.functional_status_id IS NOT NULL THEN
    INSERT INTO hr.employee_status_history (
      tenant_id,
      employee_id,
      functional_status_id,
      reason_id,
      starts_on,
      ends_on,
      notes
    )
    VALUES (
      NEW.tenant_id,
      NEW.id,
      NEW.functional_status_id,
      NEW.termination_reason_id,
      COALESCE(NEW.terminated_on, NEW.hired_on, CURRENT_DATE),
      NULL,
      CASE WHEN NEW.lifecycle_status = 'TERMINATED'::"EmployeeLifecycleStatus"
        THEN 'Desligamento registrado pelo fluxo HR-01'
        ELSE 'Admissao registrada pelo fluxo HR-01'
      END
    );
  END IF;

  v_action := CASE WHEN TG_OP = 'INSERT' THEN 'CREATE' ELSE 'PROCESS' END;
  PERFORM public.sgp_append_audit_event(
    v_action,
    'rh.employee'::text,
    NEW.id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    'hr.employee',
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object(
      'operation', TG_OP,
      'registration', NEW.registration,
      'lifecycleStatus', NEW.lifecycle_status::text
    ),
    NULL::text,
    NULL::text,
    NULL::text
  );

  IF v_using_row_tenant THEN
    PERFORM set_config('app.current_tenant_id', COALESCE(v_previous_tenant_id, ''), true);
    IF v_previous_tenant IS NULL THEN
      PERFORM set_config('app.current_tenant', '', true);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hr01_employee_timeline ON hr.employee;
CREATE TRIGGER hr01_employee_timeline
  AFTER INSERT OR UPDATE OF functional_status_id, terminated_on, lifecycle_status ON hr.employee
  FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr01_employee_timeline();

DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'employee',
    'employment_link',
    'employment_contract',
    'employee_status_history'
  ]
  LOOP
    EXECUTE format('ALTER TABLE hr.%I ENABLE ROW LEVEL SECURITY', v_table);
    EXECUTE format('ALTER TABLE hr.%I FORCE ROW LEVEL SECURITY', v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', 'hr01_employee_read', v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', 'hr01_employee_write', v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', v_table || '_select', v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', v_table || '_write', v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', 'p_' || v_table || '_rw', v_table);
    EXECUTE format(
      'CREATE POLICY %I ON hr.%I FOR SELECT USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''rh.employee.read'', ''rh.employee.write'', ''rh.employee.admit'', ''rh.employee.terminate'']))',
      'hr01_employee_read',
      v_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON hr.%I FOR ALL USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''rh.employee.write'', ''rh.employee.admit'', ''rh.employee.terminate''])) WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''rh.employee.write'', ''rh.employee.admit'', ''rh.employee.terminate'']))',
      'hr01_employee_write',
      v_table
    );
  END LOOP;
END
$$;

UPDATE public.permission
SET
  resource_key = 'workflow',
  route_pattern = NULL,
  description = CASE key
    WHEN 'rh.read' THEN 'Read broad RH workflow records.'
    WHEN 'rh.write' THEN 'Mutate broad RH workflow records.'
    ELSE description
  END,
  updated_at = now()
WHERE key IN ('rh.read', 'rh.write');

WITH hr01_permissions(key, module_key, resource_key, action_key, route_pattern, description) AS (
  VALUES
    ('rh.employee.read', 'rh', 'employee', 'read', '#!/funcionario/**', 'Read employee admission, dossier, contracts, and lifecycle timeline.'),
    ('rh.employee.write', 'rh', 'employee', 'write', '/api/v1/funcionarios/**', 'Mutate employee lifecycle support records.'),
    ('rh.employee.admit', 'rh', 'employee', 'admit', '/api/v1/funcionarios/**', 'Admit employees through HR-01.'),
    ('rh.employee.terminate', 'rh', 'employee', 'terminate', '/api/v1/funcionarios/**', 'Terminate employees through HR-01.')
), updated_by_key AS (
  UPDATE public.permission p
  SET
    module_key = hp.module_key,
    resource_key = hp.resource_key,
    action_key = hp.action_key,
    route_pattern = hp.route_pattern,
    description = hp.description,
    updated_at = now()
  FROM hr01_permissions hp
  WHERE p.key = hp.key
  RETURNING p.id, p.key
), inserted_or_tuple_matched AS (
  INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
  SELECT key, module_key, resource_key, action_key, route_pattern, description
  FROM hr01_permissions
  WHERE NOT EXISTS (
    SELECT 1
    FROM updated_by_key uk
    WHERE uk.key = hr01_permissions.key
  )
  ON CONFLICT (module_key, resource_key, action_key) DO UPDATE
  SET
    key = EXCLUDED.key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id, key
), upserted AS (
  SELECT id, key FROM updated_by_key
  UNION ALL
  SELECT id, key FROM inserted_or_tuple_matched
), admin_profile AS (
  SELECT id FROM public.access_profile WHERE code = 'ADMIN'
), rh_profile AS (
  SELECT id FROM public.access_profile WHERE code = 'RH_OPERADOR'
)
INSERT INTO public.profile_permission (profile_id, permission_id)
SELECT profile_id, permission_id
FROM (
  SELECT admin_profile.id AS profile_id, upserted.id AS permission_id
  FROM admin_profile CROSS JOIN upserted
  UNION ALL
  SELECT rh_profile.id AS profile_id, upserted.id AS permission_id
  FROM rh_profile CROSS JOIN upserted
) grants
ON CONFLICT DO NOTHING;
