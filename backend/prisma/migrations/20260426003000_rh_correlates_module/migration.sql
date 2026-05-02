-- RH correlates canonical runtime tables.
-- tenant coverage markers: ('hr', 'employee_benefit_dependent'), ('hr', 'employee_union_contribution'), ('hr', 'employee_exercise'), ('hr', 'employee_alimony'), ('hr', 'employee_transit_benefit'), ('hr', 'administrative_process'), ('hr', 'administrative_process_function')

CREATE TABLE "hr"."employee_benefit_dependent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "employee_id" UUID NOT NULL,
  "dependent_id" UUID,
  "dependent_name" TEXT NOT NULL,
  "dependent_cpf" TEXT,
  "relationship" TEXT NOT NULL DEFAULT '',
  "benefit_code" TEXT NOT NULL,
  "starts_on" DATE NOT NULL,
  "ends_on" DATE,
  "notes" TEXT NOT NULL DEFAULT '',
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "employee_benefit_dependent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_employee_benefit_dependent_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "employee_benefit_dependent_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr"."employee"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "employee_benefit_dependent_dependent_id_fkey" FOREIGN KEY ("dependent_id") REFERENCES "hr"."employee_dependent"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "hr"."employee_union_contribution" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "employee_id" UUID NOT NULL,
  "union_id" UUID,
  "deduction_amount" DECIMAL(14,2),
  "deduction_percent" DECIMAL(7,4),
  "starts_on" DATE NOT NULL,
  "ends_on" DATE,
  "notes" TEXT NOT NULL DEFAULT '',
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "employee_union_contribution_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_employee_union_contribution_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "employee_union_contribution_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr"."employee"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "employee_union_contribution_union_id_fkey" FOREIGN KEY ("union_id") REFERENCES "hr"."union_entity"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "hr"."employee_exercise" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "employee_id" UUID NOT NULL,
  "branch_id" UUID,
  "work_location_id" UUID,
  "job_function_id" UUID,
  "starts_on" DATE NOT NULL,
  "ends_on" DATE,
  "notes" TEXT NOT NULL DEFAULT '',
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "employee_exercise_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_employee_exercise_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "employee_exercise_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr"."employee"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "employee_exercise_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "hr"."branch"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "employee_exercise_work_location_id_fkey" FOREIGN KEY ("work_location_id") REFERENCES "hr"."work_location"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "employee_exercise_job_function_id_fkey" FOREIGN KEY ("job_function_id") REFERENCES "hr"."job_function"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "hr"."employee_alimony" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "employee_id" UUID NOT NULL,
  "beneficiary_name" TEXT NOT NULL,
  "beneficiary_cpf" TEXT,
  "court_process_number" TEXT,
  "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "starts_on" DATE NOT NULL,
  "ends_on" DATE,
  "notes" TEXT NOT NULL DEFAULT '',
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "employee_alimony_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_employee_alimony_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "employee_alimony_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr"."employee"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "hr"."employee_transit_benefit" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "employee_id" UUID NOT NULL,
  "transit_benefit_id" UUID NOT NULL,
  "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
  "starts_on" DATE NOT NULL,
  "ends_on" DATE,
  "notes" TEXT NOT NULL DEFAULT '',
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "employee_transit_benefit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_employee_transit_benefit_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "employee_transit_benefit_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr"."employee"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "employee_transit_benefit_transit_benefit_id_fkey" FOREIGN KEY ("transit_benefit_id") REFERENCES "hr"."transit_benefit"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "hr"."administrative_process" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "process_number" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "filed_on" DATE NOT NULL,
  "closed_on" DATE,
  "notes" TEXT NOT NULL DEFAULT '',
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "administrative_process_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_administrative_process_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id")
);

CREATE TABLE "hr"."administrative_process_function" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "process_id" UUID NOT NULL,
  "job_function_id" UUID NOT NULL,
  "branch_id" UUID,
  "work_location_id" UUID,
  "assigned_on" DATE NOT NULL,
  "released_on" DATE,
  "notes" TEXT NOT NULL DEFAULT '',
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "administrative_process_function_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_administrative_process_function_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "administrative_process_function_process_id_fkey" FOREIGN KEY ("process_id") REFERENCES "hr"."administrative_process"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "administrative_process_function_job_function_id_fkey" FOREIGN KEY ("job_function_id") REFERENCES "hr"."job_function"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "administrative_process_function_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "hr"."branch"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "administrative_process_function_work_location_id_fkey" FOREIGN KEY ("work_location_id") REFERENCES "hr"."work_location"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "employee_benefit_dependent_employee_id_starts_on_idx"
  ON "hr"."employee_benefit_dependent"("employee_id", "starts_on");
CREATE INDEX "employee_benefit_dependent_dependent_id_idx"
  ON "hr"."employee_benefit_dependent"("dependent_id");
CREATE INDEX "employee_benefit_dependent_status_idx"
  ON "hr"."employee_benefit_dependent"("status");

CREATE INDEX "employee_union_contribution_employee_id_starts_on_idx"
  ON "hr"."employee_union_contribution"("employee_id", "starts_on");
CREATE INDEX "employee_union_contribution_union_id_idx"
  ON "hr"."employee_union_contribution"("union_id");
CREATE INDEX "employee_union_contribution_status_idx"
  ON "hr"."employee_union_contribution"("status");

CREATE INDEX "employee_exercise_employee_id_starts_on_idx"
  ON "hr"."employee_exercise"("employee_id", "starts_on");
CREATE INDEX "employee_exercise_branch_id_idx"
  ON "hr"."employee_exercise"("branch_id");
CREATE INDEX "employee_exercise_work_location_id_idx"
  ON "hr"."employee_exercise"("work_location_id");
CREATE INDEX "employee_exercise_job_function_id_idx"
  ON "hr"."employee_exercise"("job_function_id");
CREATE INDEX "employee_exercise_status_idx"
  ON "hr"."employee_exercise"("status");

CREATE INDEX "employee_alimony_employee_id_starts_on_idx"
  ON "hr"."employee_alimony"("employee_id", "starts_on");
CREATE INDEX "employee_alimony_status_idx"
  ON "hr"."employee_alimony"("status");

CREATE INDEX "employee_transit_benefit_employee_id_starts_on_idx"
  ON "hr"."employee_transit_benefit"("employee_id", "starts_on");
CREATE INDEX "employee_transit_benefit_transit_benefit_id_idx"
  ON "hr"."employee_transit_benefit"("transit_benefit_id");
CREATE INDEX "employee_transit_benefit_status_idx"
  ON "hr"."employee_transit_benefit"("status");

CREATE UNIQUE INDEX "administrative_process_tenant_process_number_key"
  ON "hr"."administrative_process"("tenant_id", "process_number");
CREATE INDEX "administrative_process_filed_on_idx"
  ON "hr"."administrative_process"("filed_on");
CREATE INDEX "administrative_process_status_idx"
  ON "hr"."administrative_process"("status");

CREATE INDEX "administrative_process_function_process_id_assigned_on_idx"
  ON "hr"."administrative_process_function"("process_id", "assigned_on");
CREATE INDEX "administrative_process_function_job_function_id_idx"
  ON "hr"."administrative_process_function"("job_function_id");
CREATE INDEX "administrative_process_function_branch_id_idx"
  ON "hr"."administrative_process_function"("branch_id");
CREATE INDEX "administrative_process_function_work_location_id_idx"
  ON "hr"."administrative_process_function"("work_location_id");
CREATE INDEX "administrative_process_function_status_idx"
  ON "hr"."administrative_process_function"("status");
