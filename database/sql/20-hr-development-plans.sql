-- I.10 Plano de Desenvolvimento Individual (PDI).
-- Tracks employee/manager-agreed development plans for a defined period with
-- structured goals. Audit + touch_updated_at triggers are attached by
-- 92-audit-final.sql via the generic R4-70 closure.

CREATE TYPE hr.development_plan_status AS ENUM (
  'DRAFT',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE hr.development_plan_goal_status AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'DONE',
  'BLOCKED',
  'CANCELLED'
);

CREATE TABLE hr.development_plan (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
  employee_id uuid NOT NULL,
  manager_employee_id uuid,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status hr.development_plan_status DEFAULT 'DRAFT'::hr.development_plan_status NOT NULL,
  objective text DEFAULT ''::text NOT NULL,
  manager_review text DEFAULT ''::text NOT NULL,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT development_plan_period_chk CHECK (period_end > period_start),
  CONSTRAINT development_plan_objective_chk CHECK (length(objective) <= 4000),
  CONSTRAINT development_plan_review_chk CHECK (length(manager_review) <= 4000)
);

ALTER TABLE ONLY hr.development_plan
  ADD CONSTRAINT development_plan_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.development_plan
  ADD CONSTRAINT development_plan_tenant_fk
  FOREIGN KEY (tenant_id) REFERENCES public.tenant(id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY hr.development_plan
  ADD CONSTRAINT development_plan_employee_fk
  FOREIGN KEY (employee_id) REFERENCES hr.employee(id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY hr.development_plan
  ADD CONSTRAINT development_plan_manager_fk
  FOREIGN KEY (manager_employee_id) REFERENCES hr.employee(id)
  ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX development_plan_employee_period_idx
  ON hr.development_plan (tenant_id, employee_id, period_end DESC);

CREATE INDEX development_plan_manager_status_idx
  ON hr.development_plan (tenant_id, manager_employee_id, status)
  WHERE manager_employee_id IS NOT NULL;

-- Only one ACTIVE PDI per employee at a time.
CREATE UNIQUE INDEX development_plan_one_active_idx
  ON hr.development_plan (tenant_id, employee_id)
  WHERE status = 'ACTIVE'::hr.development_plan_status;

CREATE TABLE hr.development_plan_goal (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid DEFAULT public.sgp_current_tenant_uuid() NOT NULL,
  development_plan_id uuid NOT NULL,
  description text NOT NULL,
  status hr.development_plan_goal_status DEFAULT 'PENDING'::hr.development_plan_goal_status NOT NULL,
  due_at date,
  completed_at date,
  notes text DEFAULT ''::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT development_plan_goal_description_chk
    CHECK (length(btrim(description)) > 0 AND length(description) <= 1000),
  CONSTRAINT development_plan_goal_notes_chk CHECK (length(notes) <= 2000),
  CONSTRAINT development_plan_goal_completed_consistency_chk
    CHECK (
      (status = 'DONE'::hr.development_plan_goal_status AND completed_at IS NOT NULL)
      OR
      (status <> 'DONE'::hr.development_plan_goal_status)
    )
);

ALTER TABLE ONLY hr.development_plan_goal
  ADD CONSTRAINT development_plan_goal_pkey PRIMARY KEY (id);

ALTER TABLE ONLY hr.development_plan_goal
  ADD CONSTRAINT development_plan_goal_tenant_fk
  FOREIGN KEY (tenant_id) REFERENCES public.tenant(id)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY hr.development_plan_goal
  ADD CONSTRAINT development_plan_goal_plan_fk
  FOREIGN KEY (development_plan_id) REFERENCES hr.development_plan(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

CREATE INDEX development_plan_goal_plan_idx
  ON hr.development_plan_goal (tenant_id, development_plan_id, status);

ALTER TABLE hr.development_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.development_plan FORCE ROW LEVEL SECURITY;
ALTER TABLE hr.development_plan_goal ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr.development_plan_goal FORCE ROW LEVEL SECURITY;

CREATE POLICY development_plan_select ON hr.development_plan
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY[
        'rh.development_plan.read',
        'rh.development_plan.write',
        'rh.development_plan.approve',
        'rh.employee.read',
        'rh.employee.write',
        'portal.profile.read',
        'portal.profile.write'
      ])
    )
  );

CREATE POLICY development_plan_insert ON hr.development_plan
  FOR INSERT
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY[
        'rh.development_plan.write',
        'rh.employee.write',
        'portal.profile.write'
      ])
    )
  );

CREATE POLICY development_plan_update ON hr.development_plan
  FOR UPDATE
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY[
        'rh.development_plan.write',
        'rh.development_plan.approve',
        'rh.employee.write'
      ])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY[
        'rh.development_plan.write',
        'rh.development_plan.approve',
        'rh.employee.write'
      ])
    )
  );

CREATE POLICY development_plan_goal_select ON hr.development_plan_goal
  FOR SELECT
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY[
        'rh.development_plan.read',
        'rh.development_plan.write',
        'rh.development_plan.approve',
        'portal.profile.read',
        'portal.profile.write'
      ])
    )
  );

CREATE POLICY development_plan_goal_write ON hr.development_plan_goal
  FOR ALL
  USING (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY[
        'rh.development_plan.write',
        'rh.development_plan.approve'
      ])
    )
  )
  WITH CHECK (
    public.sgp_bypass_rls()
    OR (
      public.sgp_tenant_matches(tenant_id)
      AND public.sgp_has_any_permission(ARRAY[
        'rh.development_plan.write',
        'rh.development_plan.approve'
      ])
    )
  );
