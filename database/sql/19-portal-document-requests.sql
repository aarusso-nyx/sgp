CREATE TYPE public.document_request_status AS ENUM (
  'REQUESTED',
  'IN_PROGRESS',
  'READY',
  'REJECTED',
  'CANCELLED'
);

CREATE TABLE public.document_request (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
  employee_id uuid NOT NULL,
  document_kind text NOT NULL,
  purpose text DEFAULT ''::text NOT NULL,
  status public.document_request_status DEFAULT 'REQUESTED'::public.document_request_status NOT NULL,
  due_at date,
  fulfilled_attachment_id uuid,
  requested_by_sub text,
  requested_by_login text,
  notes text DEFAULT ''::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT document_request_kind_check CHECK (length(btrim(document_kind)) > 0),
  CONSTRAINT document_request_purpose_check CHECK (length(purpose) <= 1000),
  CONSTRAINT document_request_status_due_check CHECK (
    status <> 'READY'::public.document_request_status
    OR fulfilled_attachment_id IS NOT NULL
  )
);

ALTER TABLE ONLY public.document_request
  ADD CONSTRAINT document_request_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.document_request
  ADD CONSTRAINT document_request_employee_fk
  FOREIGN KEY (employee_id) REFERENCES hr.employee(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public.document_request
  ADD CONSTRAINT document_request_tenant_fk
  FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public.document_request
  ADD CONSTRAINT document_request_attachment_fk
  FOREIGN KEY (fulfilled_attachment_id) REFERENCES public.document_attachment(id)
  ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX document_request_employee_created_idx
  ON public.document_request (tenant_id, employee_id, created_at DESC);

CREATE INDEX document_request_status_due_idx
  ON public.document_request (tenant_id, status, due_at);

ALTER TABLE public.document_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_request FORCE ROW LEVEL SECURITY;

CREATE POLICY document_request_select ON public.document_request
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY[
        'portal.profile.read',
        'portal.profile.write',
        'documents.register',
        'documents.download'
      ])
    )
  );

CREATE POLICY document_request_insert ON public.document_request
  FOR INSERT
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY[
        'portal.profile.write',
        'documents.register'
      ])
    )
  );

CREATE POLICY document_request_update ON public.document_request
  FOR UPDATE
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY[
        'documents.register'
      ])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY[
        'documents.register'
      ])
    )
  );
