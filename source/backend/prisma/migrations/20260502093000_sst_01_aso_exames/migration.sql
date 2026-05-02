CREATE SCHEMA IF NOT EXISTS saude;

CREATE TYPE saude.medical_exam_type AS ENUM (
  'CLINICO',
  'LABORATORIAL',
  'COMPLEMENTAR',
  'IMAGEM'
);

CREATE TYPE saude.aso_kind AS ENUM (
  'ADMISSIONAL',
  'PERIODICO',
  'RETORNO_TRABALHO',
  'MUDANCA_FUNCAO',
  'DEMISSIONAL'
);

CREATE TYPE saude.aso_conclusion AS ENUM (
  'APTO',
  'INAPTO',
  'APTO_RESTRICAO'
);

CREATE TYPE saude.aso_status AS ENUM (
  'SCHEDULED',
  'PERFORMED',
  'ARCHIVED',
  'CANCELLED'
);

CREATE TABLE saude.medical_exam (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id),
  code text NOT NULL,
  name text NOT NULL,
  exam_type saude.medical_exam_type NOT NULL,
  is_mandatory_admission boolean NOT NULL DEFAULT false,
  is_mandatory_periodic boolean NOT NULL DEFAULT false,
  periodicity_months integer,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT medical_exam_code_tenant_uq UNIQUE (tenant_id, code),
  CONSTRAINT medical_exam_periodicity_positive_chk CHECK (periodicity_months IS NULL OR periodicity_months > 0)
);

CREATE TABLE saude.aso_record (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id),
  employee_id uuid NOT NULL REFERENCES hr.employee(id) ON DELETE CASCADE,
  aso_kind saude.aso_kind NOT NULL,
  scheduled_at timestamptz NOT NULL,
  performed_at timestamptz,
  doctor_crm text,
  doctor_name text,
  conclusion saude.aso_conclusion,
  restriction_text text,
  next_exam_due_at timestamptz,
  status saude.aso_status NOT NULL DEFAULT 'SCHEDULED',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aso_record_due_required_chk CHECK (
    aso_kind NOT IN ('PERIODICO', 'RETORNO_TRABALHO')
    OR next_exam_due_at IS NOT NULL
  ),
  CONSTRAINT aso_record_performed_status_chk CHECK (
    status IN ('SCHEDULED', 'CANCELLED')
    OR performed_at IS NOT NULL
  )
);

CREATE TABLE saude.aso_exam_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id),
  aso_record_id uuid NOT NULL REFERENCES saude.aso_record(id) ON DELETE CASCADE,
  medical_exam_id uuid NOT NULL REFERENCES saude.medical_exam(id),
  result_summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aso_exam_item_record_exam_uq UNIQUE (aso_record_id, medical_exam_id)
);

CREATE TABLE saude.aso_attachment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id),
  aso_record_id uuid NOT NULL REFERENCES saude.aso_record(id) ON DELETE CASCADE,
  file_uri text NOT NULL,
  sha256 text NOT NULL,
  mime text NOT NULL,
  encrypted_at_rest boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aso_attachment_sha256_chk CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  CONSTRAINT aso_attachment_pdf_mime_chk CHECK (mime = 'application/pdf')
);

CREATE INDEX medical_exam_active_idx ON saude.medical_exam(tenant_id, active);
CREATE INDEX aso_record_employee_due_idx ON saude.aso_record(tenant_id, employee_id, next_exam_due_at);
CREATE INDEX aso_record_status_due_idx ON saude.aso_record(tenant_id, status, next_exam_due_at);
CREATE INDEX aso_exam_item_record_idx ON saude.aso_exam_item(tenant_id, aso_record_id);
CREATE INDEX aso_attachment_record_idx ON saude.aso_attachment(tenant_id, aso_record_id);

CREATE OR REPLACE FUNCTION saude.sst01_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION saude.sst01_audit_row()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_row record;
  v_action text;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  PERFORM public.sgp_append_audit_event(
    v_action,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    v_row.id::text,
    NULL::uuid,
    NULLIF(current_setting('app.current_user_sub', true), ''),
    NULLIF(current_setting('app.current_login', true), ''),
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    NULLIF(current_setting('app.request_id', true), ''),
    jsonb_build_object('tenantId', v_row.tenant_id::text),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END;
$$;

CREATE TRIGGER medical_exam_touch_updated_at
  BEFORE UPDATE ON saude.medical_exam
  FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();
CREATE TRIGGER aso_record_touch_updated_at
  BEFORE UPDATE ON saude.aso_record
  FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();
CREATE TRIGGER aso_exam_item_touch_updated_at
  BEFORE UPDATE ON saude.aso_exam_item
  FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();
CREATE TRIGGER aso_attachment_touch_updated_at
  BEFORE UPDATE ON saude.aso_attachment
  FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();

CREATE TRIGGER medical_exam_audit
  AFTER INSERT OR UPDATE OR DELETE ON saude.medical_exam
  FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();
CREATE TRIGGER aso_record_audit
  AFTER INSERT OR UPDATE OR DELETE ON saude.aso_record
  FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();
CREATE TRIGGER aso_exam_item_audit
  AFTER INSERT OR UPDATE OR DELETE ON saude.aso_exam_item
  FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();
CREATE TRIGGER aso_attachment_audit
  AFTER INSERT OR UPDATE OR DELETE ON saude.aso_attachment
  FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

ALTER TABLE saude.medical_exam ENABLE ROW LEVEL SECURITY;
ALTER TABLE saude.medical_exam FORCE ROW LEVEL SECURITY;
ALTER TABLE saude.aso_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE saude.aso_record FORCE ROW LEVEL SECURITY;
ALTER TABLE saude.aso_exam_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE saude.aso_exam_item FORCE ROW LEVEL SECURITY;
ALTER TABLE saude.aso_attachment ENABLE ROW LEVEL SECURITY;
ALTER TABLE saude.aso_attachment FORCE ROW LEVEL SECURITY;

CREATE POLICY medical_exam_rw ON saude.medical_exam
  FOR ALL
  USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.aso.read', 'saude.aso.write']))
  WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.aso.write']));

CREATE POLICY aso_record_select ON saude.aso_record
  FOR SELECT
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND (
      public.sgp_has_any_permission(ARRAY['saude.aso.read', 'saude.aso.write'])
      OR (public.sgp_has_any_permission(ARRAY['saude.aso.self_read']) AND employee_id = public.sgp_current_employee_id())
    )
  );
CREATE POLICY aso_record_write ON saude.aso_record
  FOR ALL
  USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.aso.write']))
  WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.aso.write']));

CREATE POLICY aso_exam_item_select ON saude.aso_exam_item
  FOR SELECT
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND (
      public.sgp_has_any_permission(ARRAY['saude.aso.read', 'saude.aso.write'])
      OR (
        public.sgp_has_any_permission(ARRAY['saude.aso.self_read'])
        AND EXISTS (
          SELECT 1 FROM saude.aso_record ar
          WHERE ar.id = aso_record_id
            AND ar.tenant_id = tenant_id
            AND ar.employee_id = public.sgp_current_employee_id()
        )
      )
    )
  );
CREATE POLICY aso_exam_item_write ON saude.aso_exam_item
  FOR ALL
  USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.aso.write']))
  WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.aso.write']));

CREATE POLICY aso_attachment_select ON saude.aso_attachment
  FOR SELECT
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND (
      public.sgp_has_any_permission(ARRAY['saude.aso.read', 'saude.aso.write'])
      OR (
        public.sgp_has_any_permission(ARRAY['saude.aso.self_read'])
        AND EXISTS (
          SELECT 1 FROM saude.aso_record ar
          WHERE ar.id = aso_record_id
            AND ar.tenant_id = tenant_id
            AND ar.employee_id = public.sgp_current_employee_id()
        )
      )
    )
  );
CREATE POLICY aso_attachment_write ON saude.aso_attachment
  FOR ALL
  USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.aso.write']))
  WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.aso.write']));

WITH sst01_permissions(key, module_key, resource_key, action_key, route_pattern, description) AS (
  VALUES
    ('saude.aso.read', 'saude', 'aso', 'read', '/api/v1/saude/aso/**', 'Read occupational ASO records and clinical summaries.'),
    ('saude.aso.write', 'saude', 'aso', 'write', '/api/v1/saude/aso/**', 'Create, perform, attach, and archive occupational ASO records.'),
    ('saude.aso.self_read', 'saude', 'aso', 'self_read', '/api/v1/portal/aso/**', 'Read own occupational ASO dates, conclusions, and due dates.')
)
INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
SELECT key, module_key, resource_key, action_key, route_pattern, description
FROM sst01_permissions
ON CONFLICT (key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description,
    updated_at = now();
