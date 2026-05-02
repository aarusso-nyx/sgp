CREATE TYPE saude.health_program_kind AS ENUM ('PCMSO');
CREATE TYPE saude.risk_management_program_kind AS ENUM ('PGR');
CREATE TYPE saude.program_parent_kind AS ENUM ('PCMSO', 'PGR');
CREATE TYPE saude.program_status AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'ARCHIVED');

CREATE TABLE saude.health_program (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id),
  work_location_id uuid NOT NULL REFERENCES hr.work_location(id),
  kind saude.health_program_kind NOT NULL DEFAULT 'PCMSO',
  valid_from date NOT NULL,
  valid_until date NOT NULL,
  responsible_doctor_crm text NOT NULL,
  responsible_doctor_name text NOT NULL,
  status saude.program_status NOT NULL DEFAULT 'DRAFT',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT health_program_validity_chk CHECK (valid_until >= valid_from)
);

CREATE TABLE saude.risk_management_program (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id),
  work_location_id uuid NOT NULL REFERENCES hr.work_location(id),
  kind saude.risk_management_program_kind NOT NULL DEFAULT 'PGR',
  valid_from date NOT NULL,
  valid_until date NOT NULL,
  responsible_engineer_id uuid REFERENCES hr.employee(id),
  status saude.program_status NOT NULL DEFAULT 'DRAFT',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT risk_management_program_validity_chk CHECK (valid_until >= valid_from)
);

CREATE TABLE saude.program_revision (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id),
  parent_program_id uuid NOT NULL,
  parent_program_kind saude.program_parent_kind NOT NULL,
  revision_number integer NOT NULL,
  revision_reason text NOT NULL,
  snapshot_json jsonb NOT NULL,
  signed_pdf_uri text,
  sha256 text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT program_revision_positive_chk CHECK (revision_number > 0),
  CONSTRAINT program_revision_sha256_chk CHECK (sha256 IS NULL OR sha256 ~ '^[0-9a-f]{64}$'),
  CONSTRAINT program_revision_parent_uq UNIQUE (tenant_id, parent_program_kind, parent_program_id, revision_number)
);

CREATE TABLE saude.pcmso_required_exam (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.sgp_current_tenant_uuid() REFERENCES public.tenant(id),
  health_program_id uuid NOT NULL REFERENCES saude.health_program(id) ON DELETE CASCADE,
  medical_exam_id uuid NOT NULL REFERENCES saude.medical_exam(id),
  applies_to_role_id uuid REFERENCES hr.job_position(id),
  periodicity_months_override integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pcmso_required_exam_periodicity_chk CHECK (periodicity_months_override IS NULL OR periodicity_months_override > 0),
  CONSTRAINT pcmso_required_exam_unique_uq UNIQUE (health_program_id, medical_exam_id, applies_to_role_id)
);

CREATE UNIQUE INDEX health_program_one_active_idx
  ON saude.health_program(tenant_id, work_location_id, kind)
  WHERE status = 'ACTIVE';
CREATE UNIQUE INDEX risk_management_program_one_active_idx
  ON saude.risk_management_program(tenant_id, work_location_id, kind)
  WHERE status = 'ACTIVE';
CREATE INDEX health_program_location_status_idx ON saude.health_program(tenant_id, work_location_id, status);
CREATE INDEX risk_management_program_location_status_idx ON saude.risk_management_program(tenant_id, work_location_id, status);
CREATE INDEX program_revision_parent_idx ON saude.program_revision(tenant_id, parent_program_kind, parent_program_id, revision_number DESC);
CREATE INDEX pcmso_required_exam_program_idx ON saude.pcmso_required_exam(tenant_id, health_program_id);

CREATE OR REPLACE FUNCTION saude.sst02_block_program_revision_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'program_revision is append-only';
END;
$$;

CREATE TRIGGER program_revision_no_update
  BEFORE UPDATE ON saude.program_revision
  FOR EACH ROW EXECUTE FUNCTION saude.sst02_block_program_revision_mutation();
CREATE TRIGGER program_revision_no_delete
  BEFORE DELETE ON saude.program_revision
  FOR EACH ROW EXECUTE FUNCTION saude.sst02_block_program_revision_mutation();

CREATE TRIGGER health_program_touch_updated_at
  BEFORE UPDATE ON saude.health_program
  FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();
CREATE TRIGGER risk_management_program_touch_updated_at
  BEFORE UPDATE ON saude.risk_management_program
  FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();
CREATE TRIGGER pcmso_required_exam_touch_updated_at
  BEFORE UPDATE ON saude.pcmso_required_exam
  FOR EACH ROW EXECUTE FUNCTION saude.sst01_touch_updated_at();

CREATE TRIGGER health_program_audit
  AFTER INSERT OR UPDATE OR DELETE ON saude.health_program
  FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();
CREATE TRIGGER risk_management_program_audit
  AFTER INSERT OR UPDATE OR DELETE ON saude.risk_management_program
  FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();
CREATE TRIGGER program_revision_audit
  AFTER INSERT OR DELETE ON saude.program_revision
  FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();
CREATE TRIGGER pcmso_required_exam_audit
  AFTER INSERT OR UPDATE OR DELETE ON saude.pcmso_required_exam
  FOR EACH ROW EXECUTE FUNCTION saude.sst01_audit_row();

ALTER TABLE saude.health_program ENABLE ROW LEVEL SECURITY;
ALTER TABLE saude.health_program FORCE ROW LEVEL SECURITY;
ALTER TABLE saude.risk_management_program ENABLE ROW LEVEL SECURITY;
ALTER TABLE saude.risk_management_program FORCE ROW LEVEL SECURITY;
ALTER TABLE saude.program_revision ENABLE ROW LEVEL SECURITY;
ALTER TABLE saude.program_revision FORCE ROW LEVEL SECURITY;
ALTER TABLE saude.pcmso_required_exam ENABLE ROW LEVEL SECURITY;
ALTER TABLE saude.pcmso_required_exam FORCE ROW LEVEL SECURITY;

CREATE POLICY health_program_rw ON saude.health_program
  FOR ALL
  USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.program.read', 'saude.program.write']))
  WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.program.write']));
CREATE POLICY risk_management_program_rw ON saude.risk_management_program
  FOR ALL
  USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.program.read', 'saude.program.write']))
  WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.program.write']));
CREATE POLICY program_revision_rw ON saude.program_revision
  FOR ALL
  USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.program.read', 'saude.program.write']))
  WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.program.write']));
CREATE POLICY pcmso_required_exam_rw ON saude.pcmso_required_exam
  FOR ALL
  USING (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.program.read', 'saude.program.write']))
  WITH CHECK (public.sgp_tenant_matches(tenant_id) AND public.sgp_has_any_permission(ARRAY['saude.program.write']));

WITH sst02_permissions(key, module_key, resource_key, action_key, route_pattern, description) AS (
  VALUES
    ('saude.program.read', 'saude', 'program', 'read', '/api/v1/saude/programas/**', 'Read PCMSO and PGR programs, required exams, and immutable revisions.'),
    ('saude.program.write', 'saude', 'program', 'write', '/api/v1/saude/programas/**', 'Create, revise, activate, archive, and attach PCMSO and PGR program records.')
)
INSERT INTO public.permission (key, module_key, resource_key, action_key, route_pattern, description)
SELECT key, module_key, resource_key, action_key, route_pattern, description
FROM sst02_permissions
ON CONFLICT (key) DO UPDATE
SET module_key = EXCLUDED.module_key,
    resource_key = EXCLUDED.resource_key,
    action_key = EXCLUDED.action_key,
    route_pattern = EXCLUDED.route_pattern,
    description = EXCLUDED.description,
    updated_at = now();
