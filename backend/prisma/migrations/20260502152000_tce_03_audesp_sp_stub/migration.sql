CREATE SCHEMA IF NOT EXISTS tce;

DO $$
BEGIN
  IF to_regtype('tce.submission_status') IS NULL THEN
    CREATE TYPE tce.submission_status AS ENUM (
      'DRAFT',
      'VALIDATED',
      'SERIALIZED',
      'SUBMITTED',
      'ACCEPTED',
      'REJECTED',
      'STUB_OK',
      'STUB_FAIL'
    );
  END IF;
END
$$;

CREATE TABLE tce.submission (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  adapter_id text NOT NULL,
  layout_version_id uuid NOT NULL REFERENCES tce.layout_version(id) ON DELETE RESTRICT,
  payroll_run_id uuid NOT NULL REFERENCES payroll.payroll_run(id) ON DELETE RESTRICT,
  competence_year int NOT NULL,
  competence_month int NOT NULL,
  envelope_xml_uri text,
  envelope_hash text,
  request_size_bytes int,
  status tce.submission_status NOT NULL DEFAULT 'DRAFT',
  validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  response_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_hash text,
  submitted_at timestamptz,
  response_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT submission_adapter_chk CHECK (adapter_id ~ '^[a-z0-9][a-z0-9._-]{1,62}$'),
  CONSTRAINT submission_competence_month_chk CHECK (competence_month BETWEEN 1 AND 12),
  CONSTRAINT submission_request_size_chk CHECK (request_size_bytes IS NULL OR request_size_bytes >= 0),
  CONSTRAINT submission_validation_errors_array_chk CHECK (jsonb_typeof(validation_errors) = 'array'),
  CONSTRAINT submission_response_payload_object_chk CHECK (jsonb_typeof(response_payload) = 'object'),
  CONSTRAINT submission_hash_chk CHECK (envelope_hash IS NULL OR envelope_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT submission_response_hash_chk CHECK (response_hash IS NULL OR response_hash ~ '^[a-f0-9]{64}$')
);

CREATE INDEX submission_tenant_competence_idx
  ON tce.submission (tenant_id, competence_year DESC, competence_month DESC);

CREATE INDEX submission_payroll_run_idx
  ON tce.submission (payroll_run_id);

CREATE INDEX submission_adapter_status_idx
  ON tce.submission (adapter_id, status);

CREATE OR REPLACE FUNCTION tce.sgp_tce_submission_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION tce.sgp_tce_submission_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  row_after record;
  row_before record;
  after_json jsonb;
  before_json jsonb;
  audit_action text;
  resource_id text;
  resource_tenant uuid;
BEGIN
  row_after := NEW;
  row_before := OLD;
  after_json := to_jsonb(row_after);
  before_json := to_jsonb(row_before);
  audit_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  resource_id := COALESCE(after_json ->> 'id', before_json ->> 'id');
  resource_tenant := COALESCE((after_json ->> 'tenant_id')::uuid, (before_json ->> 'tenant_id')::uuid);

  PERFORM set_config('app.current_tenant_id', resource_tenant::text, true);

  PERFORM public.sgp_append_audit_event(
    audit_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    resource_id,
    resource_tenant,
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

DROP TRIGGER IF EXISTS submission_touch_updated_at ON tce.submission;
CREATE TRIGGER submission_touch_updated_at
  BEFORE UPDATE ON tce.submission
  FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_submission_touch_updated_at();

DROP TRIGGER IF EXISTS submission_audit ON tce.submission;
CREATE TRIGGER submission_audit
  AFTER INSERT OR UPDATE OR DELETE ON tce.submission
  FOR EACH ROW EXECUTE FUNCTION tce.sgp_tce_submission_audit();

ALTER TABLE tce.submission ENABLE ROW LEVEL SECURITY;
ALTER TABLE tce.submission FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS submission_select ON tce.submission;
CREATE POLICY submission_select ON tce.submission
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['tce.submission.read', 'tce.submission.manage'])
    )
  );

DROP POLICY IF EXISTS submission_write ON tce.submission;
CREATE POLICY submission_write ON tce.submission
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['tce.submission.manage'])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY['tce.submission.manage'])
    )
  );

WITH audesp AS (
  SELECT layout.id
  FROM tce.layout_version layout
  JOIN tce.state state ON state.id = layout.state_id
  WHERE state.code = 'SP'
    AND layout.system_name = 'AUDESP'
    AND layout.version = '0.0.1'
  LIMIT 1
),
fields(field_path, data_type, required, max_length, decimal_precision, decimal_scale, transform_rule, source_hint, ordering) AS (
  VALUES
    ('AudespFolha', 'XML_NODE'::tce.layout_field_data_type, true, NULL::int, NULL::int, NULL::int, 'root', 'AUDESP folha de pagamento placeholder publico', 10),
    ('AudespFolha.Cabecalho', 'XML_NODE', true, NULL, NULL, NULL, 'group', 'cabecalho do lote', 20),
    ('AudespFolha.Cabecalho.OrgaoCodigo', 'STRING', true, 20, NULL, NULL, 'tenant.organization_code', 'identificacao publica do orgao', 30),
    ('AudespFolha.Cabecalho.CompetenciaAno', 'INT', true, NULL, NULL, NULL, 'payroll_run.competence_year', 'ano da competencia', 40),
    ('AudespFolha.Cabecalho.CompetenciaMes', 'INT', true, NULL, NULL, NULL, 'payroll_run.competence_month', 'mes da competencia', 50),
    ('AudespFolha.Cabecalho.TipoRemessa', 'STRING', true, 20, NULL, NULL, 'constant:FOLHA_PAGAMENTO', 'categoria publica do lote', 60),
    ('AudespFolha.Servidores.Servidor', 'XML_NODE', true, NULL, NULL, NULL, 'repeat', 'lista de servidores/empregados', 70),
    ('AudespFolha.Servidores.Servidor.Matricula', 'STRING', true, 30, NULL, NULL, 'hr.employee.registration', 'matricula funcional', 80),
    ('AudespFolha.Servidores.Servidor.Cpf', 'STRING', true, 11, NULL, NULL, 'hr.employee.cpf only digits', 'CPF do servidor', 90),
    ('AudespFolha.Servidores.Servidor.Cargo', 'STRING', true, 120, NULL, NULL, 'hr.job_position.name', 'cargo ou emprego publico', 100),
    ('AudespFolha.Servidores.Servidor.Proventos', 'DECIMAL', true, NULL, 14, 2, 'sum earnings', 'total de proventos', 110),
    ('AudespFolha.Servidores.Servidor.Descontos', 'DECIMAL', true, NULL, 14, 2, 'sum deductions', 'total de descontos', 120),
    ('AudespFolha.Servidores.Servidor.Liquido', 'DECIMAL', true, NULL, 14, 2, 'earnings - deductions', 'valor liquido', 130)
)
INSERT INTO tce.layout_field (
  layout_version_id,
  field_path,
  data_type,
  required,
  max_length,
  decimal_precision,
  decimal_scale,
  transform_rule,
  source_hint,
  ordering
)
SELECT audesp.id, fields.*
FROM audesp
CROSS JOIN fields
ON CONFLICT (layout_version_id, field_path) DO UPDATE
SET data_type = EXCLUDED.data_type,
    required = EXCLUDED.required,
    max_length = EXCLUDED.max_length,
    decimal_precision = EXCLUDED.decimal_precision,
    decimal_scale = EXCLUDED.decimal_scale,
    transform_rule = EXCLUDED.transform_rule,
    source_hint = EXCLUDED.source_hint,
    ordering = EXCLUDED.ordering;

INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
VALUES
  ('tce.submission.read', 'tce', 'submission', 'read', '/api/v1/tce/audesp-sp/submissions/**', 'Read AUDESP/SP TCE submissions.'),
  ('tce.submission.manage', 'tce', 'submission', 'manage', '/api/v1/tce/audesp-sp/submissions/**', 'Create, validate, serialize, and submit AUDESP/SP TCE submissions in stub mode.')
ON CONFLICT (key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description,
    updated_at = now();

WITH profile_permissions(profile_code, permission_key) AS (
  VALUES
    ('ADMIN', 'tce.submission.read'),
    ('ADMIN', 'tce.submission.manage'),
    ('AUDITOR', 'tce.submission.read')
)
INSERT INTO public.profile_permission (profile_id, permission_id, allowed)
SELECT access_profile.id, permission.id, true
FROM profile_permissions
JOIN public.access_profile ON access_profile.code = profile_permissions.profile_code
JOIN public.permission ON permission.key = profile_permissions.permission_key
ON CONFLICT (profile_id, permission_id) DO UPDATE
SET allowed = EXCLUDED.allowed;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app_role') THEN
    GRANT USAGE ON SCHEMA tce TO sgp_app_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON tce.submission TO sgp_app_role;
  END IF;
END
$$;
