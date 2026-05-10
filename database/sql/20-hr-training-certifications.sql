-- I.09 Cadastro de certificações de treinamento (training credentials).
-- Audit + touch_updated_at triggers are attached by 92-audit-final.sql via the
-- generic R4-70 closure. Tenant-scoped RLS is declared explicitly here.

CREATE TABLE hr.training_certificate (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
  employee_id uuid NOT NULL,
  course_name text NOT NULL,
  issuer text NOT NULL,
  issued_at date NOT NULL,
  expires_at date,
  hours_workload integer,
  attachment_id uuid,
  notes text DEFAULT ''::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT training_certificate_course_name_chk
    CHECK (length(btrim(course_name)) > 0 AND length(course_name) <= 240),
  CONSTRAINT training_certificate_issuer_chk
    CHECK (length(btrim(issuer)) > 0 AND length(issuer) <= 240),
  CONSTRAINT training_certificate_validity_chk
    CHECK (expires_at IS NULL OR expires_at >= issued_at),
  CONSTRAINT training_certificate_hours_chk
    CHECK (hours_workload IS NULL OR hours_workload BETWEEN 0 AND 10000),
  CONSTRAINT training_certificate_notes_chk
    CHECK (length(notes) <= 2000)
);

ALTER TABLE ONLY hr.training_certificate
  ADD CONSTRAINT training_certificate_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.training_certificate
  ADD CONSTRAINT training_certificate_tenant_fk
  FOREIGN KEY (tenant_id) REFERENCES public.tenant(id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY hr.training_certificate
  ADD CONSTRAINT training_certificate_employee_fk
  FOREIGN KEY (employee_id) REFERENCES hr.employee(id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY hr.training_certificate
  ADD CONSTRAINT training_certificate_attachment_fk
  FOREIGN KEY (attachment_id) REFERENCES public.document_attachment(id)
  ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX training_certificate_employee_issued_idx
  ON hr.training_certificate (tenant_id, employee_id, issued_at DESC);

CREATE INDEX training_certificate_expiry_idx
  ON hr.training_certificate (tenant_id, expires_at)
  WHERE expires_at IS NOT NULL;

ALTER TABLE hr.training_certificate ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.training_certificate FORCE ROW LEVEL SECURITY;

CREATE POLICY training_certificate_select ON hr.training_certificate
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY[
        'rh.certification.read',
        'rh.certification.write',
        'rh.employee.read',
        'rh.employee.write',
        'portal.profile.read',
        'portal.profile.write'
      ])
    )
  );

CREATE POLICY training_certificate_insert ON hr.training_certificate
  FOR INSERT
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY[
        'rh.certification.write',
        'rh.employee.write',
        'portal.profile.write'
      ])
    )
  );

CREATE POLICY training_certificate_update ON hr.training_certificate
  FOR UPDATE
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY[
        'rh.certification.write',
        'rh.employee.write'
      ])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY[
        'rh.certification.write',
        'rh.employee.write'
      ])
    )
  );

CREATE POLICY training_certificate_delete ON hr.training_certificate
  FOR DELETE
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY[
        'rh.certification.write',
        'rh.employee.write'
      ])
    )
  );
