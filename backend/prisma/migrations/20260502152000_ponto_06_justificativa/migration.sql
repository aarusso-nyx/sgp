CREATE TYPE ponto.absence_justification_kind AS ENUM (
  'MEDICAL',
  'MARRIAGE',
  'BEREAVEMENT',
  'BLOOD_DONATION',
  'MILITARY',
  'VOTING',
  'PATERNITY',
  'MATERNITY',
  'LEGAL_DUTY',
  'UNION',
  'TRAINING',
  'OTHER'
);

CREATE TYPE ponto.absence_justification_status AS ENUM (
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'CANCELLED'
);

CREATE TYPE ponto.absence_payroll_treatment AS ENUM (
  'PAID',
  'UNPAID',
  'HOUR_BANK_NEUTRAL'
);

CREATE TABLE ponto.absence_justification (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id) ON DELETE RESTRICT,
  absence_justification_id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES hr.employee(id) ON DELETE RESTRICT,
  kind ponto.absence_justification_kind NOT NULL,
  absence_start timestamptz NOT NULL,
  absence_end timestamptz NOT NULL,
  status ponto.absence_justification_status NOT NULL DEFAULT 'REQUESTED',
  reason text NOT NULL,
  attachment_id uuid REFERENCES public.document_attachment(id) ON DELETE SET NULL,
  requested_by_user_id uuid NOT NULL REFERENCES public.user_account(id) ON DELETE RESTRICT,
  approved_by_user_id uuid REFERENCES public.user_account(id) ON DELETE SET NULL,
  decided_at timestamptz,
  payroll_treatment ponto.absence_payroll_treatment NOT NULL DEFAULT 'PAID',
  medical_leave_id uuid REFERENCES hr.medical_leave(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT absence_justification_pkey PRIMARY KEY (absence_justification_id),
  CONSTRAINT absence_justification_tenant_uq UNIQUE (tenant_id, absence_justification_id),
  CONSTRAINT absence_justification_period_chk CHECK (absence_end >= absence_start),
  CONSTRAINT absence_justification_decision_chk CHECK (
    (status IN ('APPROVED', 'REJECTED') AND approved_by_user_id IS NOT NULL AND decided_at IS NOT NULL)
    OR (status IN ('REQUESTED', 'CANCELLED'))
  )
);

CREATE TABLE ponto.time_record_justification_link (
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id) ON DELETE RESTRICT,
  time_record_id uuid NOT NULL REFERENCES ponto.time_record(time_record_id) ON DELETE CASCADE,
  absence_justification_id uuid NOT NULL REFERENCES ponto.absence_justification(absence_justification_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT time_record_justification_link_pkey PRIMARY KEY (tenant_id, time_record_id, absence_justification_id),
  CONSTRAINT time_record_justification_link_justification_fk FOREIGN KEY (tenant_id, absence_justification_id)
    REFERENCES ponto.absence_justification(tenant_id, absence_justification_id) ON DELETE CASCADE
);

CREATE INDEX absence_justification_employee_idx
  ON ponto.absence_justification(tenant_id, employee_id, absence_start DESC);
CREATE INDEX absence_justification_status_idx
  ON ponto.absence_justification(tenant_id, status, absence_start DESC);
CREATE INDEX time_record_justification_link_record_idx
  ON ponto.time_record_justification_link(tenant_id, time_record_id);

CREATE OR REPLACE FUNCTION ponto.ponto06_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION ponto.ponto06_audit_row()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_row record;
  v_action text;
  v_resource_id text;
BEGIN
  v_row := COALESCE(NEW, OLD);
  v_action := CASE TG_OP WHEN 'INSERT' THEN 'CREATE' WHEN 'UPDATE' THEN 'UPDATE' ELSE 'DELETE' END;
  v_resource_id := CASE TG_TABLE_NAME
    WHEN 'absence_justification' THEN v_row.absence_justification_id::text
    WHEN 'time_record_justification_link' THEN v_row.time_record_id::text || ':' || v_row.absence_justification_id::text
    ELSE NULL
  END;

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
    jsonb_build_object('tenantId', v_row.tenant_id::text, 'status', COALESCE(v_row.status::text, 'LINK')),
    NULL::text,
    NULL::text,
    NULL::text
  );
  RETURN v_row;
END;
$$;

CREATE TRIGGER absence_justification_touch_updated_at
  BEFORE UPDATE ON ponto.absence_justification
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto06_touch_updated_at();
CREATE TRIGGER absence_justification_audit
  AFTER INSERT OR UPDATE OR DELETE ON ponto.absence_justification
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto06_audit_row();
CREATE TRIGGER time_record_justification_link_audit
  AFTER INSERT OR UPDATE OR DELETE ON ponto.time_record_justification_link
  FOR EACH ROW EXECUTE FUNCTION ponto.ponto06_audit_row();

ALTER TABLE ponto.absence_justification ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto.absence_justification FORCE ROW LEVEL SECURITY;
ALTER TABLE ponto.time_record_justification_link ENABLE ROW LEVEL SECURITY;
ALTER TABLE ponto.time_record_justification_link FORCE ROW LEVEL SECURITY;

CREATE POLICY absence_justification_rw ON ponto.absence_justification
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['ponto.justification.read', 'ponto.justification.write', 'ponto.justification.approve'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['ponto.justification.write', 'ponto.justification.approve'])
  );

CREATE POLICY time_record_justification_link_rw ON ponto.time_record_justification_link
  FOR ALL
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['ponto.justification.read', 'ponto.justification.write', 'ponto.justification.approve'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['ponto.justification.write', 'ponto.justification.approve'])
  );

WITH canonical_permissions(key, module_key, resource_key, action_key, route_pattern, description) AS (
  VALUES
  ('ponto.justification.read', 'ponto', 'justification', 'read', '/api/v1/ponto/justifications/**', 'Read absence justification and allowance requests.'),
  ('ponto.justification.write', 'ponto', 'justification', 'write', '/api/v1/ponto/justifications/**', 'Request, cancel, and maintain absence justifications.'),
  ('ponto.justification.approve', 'ponto', 'justification', 'approve', '/api/v1/ponto/justifications/**', 'Approve or reject absence justifications.')
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
