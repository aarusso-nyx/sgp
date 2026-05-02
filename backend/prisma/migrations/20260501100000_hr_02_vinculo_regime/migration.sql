ALTER TABLE hr.employment_link
  ADD COLUMN IF NOT EXISTS contract_type text NOT NULL DEFAULT 'statutory',
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS commission_position_id uuid,
  ADD COLUMN IF NOT EXISTS regime_law_reference text NOT NULL DEFAULT 'Lei 8.112/90',
  ADD COLUMN IF NOT EXISTS functional_status_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employment_link_commission_position_fkey'
      AND conrelid = 'hr.employment_link'::regclass
  ) THEN
    ALTER TABLE hr.employment_link
      ADD CONSTRAINT employment_link_commission_position_fkey
      FOREIGN KEY (commission_position_id)
      REFERENCES hr.job_position(id)
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employment_link_functional_status_fkey'
      AND conrelid = 'hr.employment_link'::regclass
  ) THEN
    ALTER TABLE hr.employment_link
      ADD CONSTRAINT employment_link_functional_status_fkey
      FOREIGN KEY (functional_status_id)
      REFERENCES hr.functional_status(id)
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;

ALTER TABLE hr.employment_link
  DROP CONSTRAINT IF EXISTS employment_link_contract_type_check,
  ADD CONSTRAINT employment_link_contract_type_check
    CHECK (contract_type IN ('statutory', 'celetista', 'commissioned', 'temporary'));

ALTER TABLE hr.employment_link
  DROP CONSTRAINT IF EXISTS employment_link_temporary_end_date_check,
  ADD CONSTRAINT employment_link_temporary_end_date_check
    CHECK (contract_type <> 'temporary' OR end_date IS NOT NULL);

ALTER TABLE hr.employment_link
  DROP CONSTRAINT IF EXISTS employment_link_commissioned_position_check,
  ADD CONSTRAINT employment_link_commissioned_position_check
    CHECK (contract_type <> 'commissioned' OR commission_position_id IS NOT NULL);

ALTER TABLE hr.employment_link
  DROP CONSTRAINT IF EXISTS employment_link_statutory_law_check,
  ADD CONSTRAINT employment_link_statutory_law_check
    CHECK (contract_type <> 'statutory' OR length(btrim(regime_law_reference)) > 0);

CREATE INDEX IF NOT EXISTS employment_link_contract_type_idx
  ON hr.employment_link(contract_type);

CREATE INDEX IF NOT EXISTS employment_link_commission_position_idx
  ON hr.employment_link(commission_position_id);

CREATE INDEX IF NOT EXISTS employment_link_functional_status_idx
  ON hr.employment_link(functional_status_id);

CREATE OR REPLACE FUNCTION hr.sgp_hr02_employment_link_timeline()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    AND NEW.contract_type IS NOT DISTINCT FROM OLD.contract_type
    AND NEW.functional_status_id IS NOT DISTINCT FROM OLD.functional_status_id
  THEN
    RETURN NEW;
  END IF;

  INSERT INTO hr.employee_status_history (
    tenant_id,
    employee_id,
    functional_status_id,
    starts_on,
    ends_on,
    notes
  )
  SELECT
    e.tenant_id,
    e.id,
    COALESCE(NEW.functional_status_id, e.functional_status_id),
    CURRENT_DATE,
    NEW.end_date,
    concat('Alteracao de regime juridico: ', NEW.contract_type)
  FROM hr.employee e
  WHERE e.tenant_id = NEW.tenant_id
    AND e.employment_link_id = NEW.id
    AND COALESCE(NEW.functional_status_id, e.functional_status_id) IS NOT NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hr02_employment_link_timeline ON hr.employment_link;
CREATE TRIGGER hr02_employment_link_timeline
  AFTER UPDATE OF contract_type, functional_status_id ON hr.employment_link
  FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr02_employment_link_timeline();

DROP POLICY IF EXISTS hr01_employee_read ON hr.employment_link;
DROP POLICY IF EXISTS hr01_employee_write ON hr.employment_link;
CREATE POLICY hr01_employee_read ON hr.employment_link
  FOR SELECT
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY[
      'rh.employee.read',
      'rh.employee.write',
      'rh.employee.admit',
      'rh.employee.terminate',
      'rh.employment_link.write'
    ])
  );
CREATE POLICY hr01_employee_write ON hr.employment_link
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY[
      'rh.employee.write',
      'rh.employee.admit',
      'rh.employee.terminate',
      'rh.employment_link.write'
    ])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY[
      'rh.employee.write',
      'rh.employee.admit',
      'rh.employee.terminate',
      'rh.employment_link.write'
    ])
  );

WITH hr02_permissions(key, module_key, resource_key, action_key, route_pattern, description) AS (
  VALUES
    ('rh.employment_link.write', 'rh', 'employment_link', 'write', '/api/v1/funcionarios/**/vinculos', 'Change employee employment link and legal regime through HR-02.')
), updated_by_key AS (
  UPDATE public.permission p
  SET
    module_key = hp.module_key,
    resource_key = hp.resource_key,
    action_key = hp.action_key,
    route_pattern = hp.route_pattern,
    description = hp.description,
    updated_at = now()
  FROM hr02_permissions hp
  WHERE p.key = hp.key
  RETURNING p.id, p.key
), inserted_or_tuple_matched AS (
  INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
  SELECT key, module_key, resource_key, action_key, route_pattern, description
  FROM hr02_permissions
  WHERE NOT EXISTS (
    SELECT 1
    FROM updated_by_key uk
    WHERE uk.key = hr02_permissions.key
  )
  ON CONFLICT (module_key, resource_key, action_key) DO UPDATE
  SET
    key = EXCLUDED.key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id, key
), permission_ids AS (
  SELECT id, key FROM updated_by_key
  UNION ALL
  SELECT id, key FROM inserted_or_tuple_matched
), rh_profile AS (
  SELECT id
  FROM public.access_profile
  WHERE tenant_id = public.sgp_current_tenant_uuid()
    AND code IN ('ADMIN', 'RH_OPERADOR')
)
INSERT INTO public.profile_permission (profile_id, permission_id, allowed)
SELECT rh_profile.id, permission_ids.id, true
FROM rh_profile
CROSS JOIN permission_ids
ON CONFLICT (profile_id, permission_id) DO UPDATE
SET allowed = EXCLUDED.allowed;
