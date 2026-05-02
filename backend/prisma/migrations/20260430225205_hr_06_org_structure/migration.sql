-- HR-06 organizational structure hardening.
-- Physical schema is hr after the v0.0.1 schema split.

ALTER TABLE hr.work_location
  ADD COLUMN IF NOT EXISTS fpas_code text NOT NULL DEFAULT '000',
  ADD COLUMN IF NOT EXISTS fap_rate numeric(18,6) NOT NULL DEFAULT 0;

ALTER TABLE hr.job_position
  ADD COLUMN IF NOT EXISTS vacancies_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vacancies_filled integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vacancies_open integer NOT NULL DEFAULT 0,
  ADD CONSTRAINT job_position_vacancies_non_negative
    CHECK (vacancies_total >= 0 AND vacancies_filled >= 0 AND vacancies_open >= 0),
  ADD CONSTRAINT job_position_vacancies_consistent
    CHECK (vacancies_total = vacancies_filled + vacancies_open);

CREATE UNIQUE INDEX IF NOT EXISTS cost_center_tenant_code_key
  ON hr.cost_center(tenant_id, code);

CREATE OR REPLACE FUNCTION hr.sgp_audit_hr06_org_structure()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_action text;
BEGIN
  v_action := CASE WHEN TG_OP = 'INSERT' THEN 'CREATE' ELSE 'UPDATE' END;
  PERFORM public.sgp_append_audit_event(
    v_action,
    'gestao.master_data'::text,
    NEW.id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('code', NEW.code, 'operation', TG_OP),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'job_position',
    'job_function',
    'work_location',
    'cost_center',
    'job_structure_employment_link',
    'work_location_structure_assignment'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON hr.%I', 'hr06_org_structure_audit', v_table);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON hr.%I FOR EACH ROW EXECUTE FUNCTION hr.sgp_audit_hr06_org_structure()',
      'hr06_org_structure_audit',
      v_table
    );

    EXECUTE format('ALTER TABLE hr.%I ENABLE ROW LEVEL SECURITY', v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', 'hr06_org_structure_read', v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', 'hr06_org_structure_write', v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', 'hr06_org_structure_update', v_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON hr.%I', 'hr06_org_structure_delete', v_table);
    EXECUTE format(
      'CREATE POLICY %I ON hr.%I FOR SELECT USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''gestao.master_data.read'', ''gestao.master_data.write'']))',
      'hr06_org_structure_read',
      v_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON hr.%I FOR INSERT WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''gestao.master_data.write'']))',
      'hr06_org_structure_write',
      v_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON hr.%I FOR UPDATE USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''gestao.master_data.write''])) WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''gestao.master_data.write'']))',
      'hr06_org_structure_update',
      v_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON hr.%I FOR DELETE USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY[''gestao.master_data.write'']))',
      'hr06_org_structure_delete',
      v_table
    );
  END LOOP;
END $$;

WITH canonical_permissions(key, module_key, resource_key, action_key, route_pattern, description) AS (
  VALUES
  ('gestao.master_data.read', 'gestao', 'master_data', 'read', '/api/v1/master-data/**', 'Read organizational master data.'),
  ('gestao.master_data.write', 'gestao', 'master_data', 'write', '/api/v1/master-data/**', 'Mutate organizational master data.')
)
INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
SELECT key, module_key, resource_key, action_key, route_pattern, description
FROM canonical_permissions
ON CONFLICT (key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description,
    updated_at = now();
