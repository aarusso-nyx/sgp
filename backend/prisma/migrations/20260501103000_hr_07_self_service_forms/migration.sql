-- HR-07 self-service cadastral forms and approval workflow.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CadastralChangeStatus') THEN
    CREATE TYPE "CadastralChangeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
END
$$;

ALTER TABLE IF EXISTS hr.employee_dependent ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS hr.employee_dependent FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_employee_dependent_rw ON hr.employee_dependent;
CREATE POLICY p_employee_dependent_rw ON hr.employee_dependent
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['rh.dependent.read', 'rh.dependent.write'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['rh.dependent.write'])
  );

CREATE TABLE IF NOT EXISTS hr.cadastral_change_request (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  employee_id uuid NOT NULL,
  section text NOT NULL CHECK (section IN ('cadastro', 'endereco', 'contato', 'dependentes', 'documentos')),
  status "CadastralChangeStatus" NOT NULL DEFAULT 'PENDING',
  previous_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  requested_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  requested_by_sub text,
  requested_by_login text,
  requested_at timestamptz(6) NOT NULL DEFAULT now(),
  decided_by_sub text,
  decided_by_login text,
  decided_at timestamptz(6),
  decision_notes text,
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  updated_at timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT cadastral_change_request_pkey PRIMARY KEY (id),
  CONSTRAINT cadastral_change_request_employee_id_fkey
    FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT cadastral_change_request_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS cadastral_change_request_tenant_status_idx
  ON hr.cadastral_change_request(tenant_id, status, requested_at);
CREATE INDEX IF NOT EXISTS cadastral_change_request_employee_idx
  ON hr.cadastral_change_request(tenant_id, employee_id, requested_at DESC);

ALTER TABLE hr.cadastral_change_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.cadastral_change_request FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_cadastral_change_request_select ON hr.cadastral_change_request;
CREATE POLICY p_cadastral_change_request_select ON hr.cadastral_change_request
  FOR SELECT
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['portal.profile.read', 'portal.profile.write', 'rh.cadastral_change.approve'])
  );

DROP POLICY IF EXISTS p_cadastral_change_request_write ON hr.cadastral_change_request;
CREATE POLICY p_cadastral_change_request_write ON hr.cadastral_change_request
  FOR INSERT
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['portal.profile.write', 'rh.cadastral_change.approve'])
  );

DROP POLICY IF EXISTS p_cadastral_change_request_update ON hr.cadastral_change_request;
CREATE POLICY p_cadastral_change_request_update ON hr.cadastral_change_request
  FOR UPDATE
  USING (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['rh.cadastral_change.approve'])
  )
  WITH CHECK (
    public.sgp_tenant_matches(tenant_id)
    AND public.sgp_has_any_permission(ARRAY['rh.cadastral_change.approve'])
  );

CREATE OR REPLACE FUNCTION hr.sgp_hr07_cadastral_change_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_action text;
  v_id text;
BEGIN
  v_action := TG_OP;
  v_id := COALESCE(NEW.id, OLD.id)::text;
  PERFORM public.sgp_append_audit_event(
    v_action,
    'hr.cadastral_change_request',
    v_id,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS hr07_cadastral_change_audit ON hr.cadastral_change_request;
CREATE TRIGGER hr07_cadastral_change_audit
  AFTER INSERT OR UPDATE OR DELETE ON hr.cadastral_change_request
  FOR EACH ROW EXECUTE FUNCTION hr.sgp_hr07_cadastral_change_audit();
