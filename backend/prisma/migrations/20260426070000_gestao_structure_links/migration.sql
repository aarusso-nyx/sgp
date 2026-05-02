-- Gestão structure-link canonical runtime tables.
-- tenant coverage markers: ('hr', 'job_structure_reference_link'), ('hr', 'job_structure_employment_link'), ('hr', 'work_location_structure_assignment')

CREATE TABLE "hr"."job_structure_reference_link" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "job_position_id" UUID,
  "job_function_id" UUID,
  "reference_catalog_key" TEXT NOT NULL,
  "reference_entry_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "job_structure_reference_link_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_job_structure_reference_link_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "job_structure_reference_link_job_position_id_fkey"
    FOREIGN KEY ("job_position_id") REFERENCES "hr"."job_position"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "job_structure_reference_link_job_function_id_fkey"
    FOREIGN KEY ("job_function_id") REFERENCES "hr"."job_function"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "job_structure_reference_link_reference_entry_id_fkey"
    FOREIGN KEY ("reference_entry_id") REFERENCES "hr"."reference_catalog_entry"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "job_structure_reference_link_owner_check"
    CHECK (
      (CASE WHEN "job_position_id" IS NULL THEN 0 ELSE 1 END)
      + (CASE WHEN "job_function_id" IS NULL THEN 0 ELSE 1 END)
      = 1
    )
);

CREATE TABLE "hr"."job_structure_employment_link" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "job_position_id" UUID,
  "job_function_id" UUID,
  "employment_link_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "job_structure_employment_link_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_job_structure_employment_link_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "job_structure_employment_link_job_position_id_fkey"
    FOREIGN KEY ("job_position_id") REFERENCES "hr"."job_position"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "job_structure_employment_link_job_function_id_fkey"
    FOREIGN KEY ("job_function_id") REFERENCES "hr"."job_function"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "job_structure_employment_link_employment_link_id_fkey"
    FOREIGN KEY ("employment_link_id") REFERENCES "hr"."employment_link"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "job_structure_employment_link_owner_check"
    CHECK (
      (CASE WHEN "job_position_id" IS NULL THEN 0 ELSE 1 END)
      + (CASE WHEN "job_function_id" IS NULL THEN 0 ELSE 1 END)
      = 1
    )
);

CREATE TABLE "hr"."work_location_structure_assignment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "work_location_id" UUID NOT NULL,
  "job_position_id" UUID,
  "job_function_id" UUID,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "work_location_structure_assignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_work_location_structure_assignment_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "work_location_structure_assignment_work_location_id_fkey"
    FOREIGN KEY ("work_location_id") REFERENCES "hr"."work_location"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "work_location_structure_assignment_job_position_id_fkey"
    FOREIGN KEY ("job_position_id") REFERENCES "hr"."job_position"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "work_location_structure_assignment_job_function_id_fkey"
    FOREIGN KEY ("job_function_id") REFERENCES "hr"."job_function"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "work_location_structure_assignment_structure_check"
    CHECK (
      (CASE WHEN "job_position_id" IS NULL THEN 0 ELSE 1 END)
      + (CASE WHEN "job_function_id" IS NULL THEN 0 ELSE 1 END)
      = 1
    )
);

CREATE UNIQUE INDEX "job_structure_reference_link_position_entry_key"
  ON "hr"."job_structure_reference_link"("tenant_id", "job_position_id", "reference_entry_id");
CREATE UNIQUE INDEX "job_structure_reference_link_function_entry_key"
  ON "hr"."job_structure_reference_link"("tenant_id", "job_function_id", "reference_entry_id");
CREATE INDEX "job_structure_reference_link_position_catalog_idx"
  ON "hr"."job_structure_reference_link"("job_position_id", "reference_catalog_key");
CREATE INDEX "job_structure_reference_link_function_catalog_idx"
  ON "hr"."job_structure_reference_link"("job_function_id", "reference_catalog_key");
CREATE INDEX "job_structure_reference_link_reference_entry_idx"
  ON "hr"."job_structure_reference_link"("reference_entry_id");
CREATE INDEX "job_structure_reference_link_status_idx"
  ON "hr"."job_structure_reference_link"("status");

CREATE UNIQUE INDEX "job_structure_employment_link_position_link_key"
  ON "hr"."job_structure_employment_link"("tenant_id", "job_position_id", "employment_link_id");
CREATE UNIQUE INDEX "job_structure_employment_link_function_link_key"
  ON "hr"."job_structure_employment_link"("tenant_id", "job_function_id", "employment_link_id");
CREATE INDEX "job_structure_employment_link_position_idx"
  ON "hr"."job_structure_employment_link"("job_position_id");
CREATE INDEX "job_structure_employment_link_function_idx"
  ON "hr"."job_structure_employment_link"("job_function_id");
CREATE INDEX "job_structure_employment_link_employment_idx"
  ON "hr"."job_structure_employment_link"("employment_link_id");
CREATE INDEX "job_structure_employment_link_status_idx"
  ON "hr"."job_structure_employment_link"("status");

CREATE UNIQUE INDEX "work_location_structure_assignment_position_key"
  ON "hr"."work_location_structure_assignment"("tenant_id", "work_location_id", "job_position_id");
CREATE UNIQUE INDEX "work_location_structure_assignment_function_key"
  ON "hr"."work_location_structure_assignment"("tenant_id", "work_location_id", "job_function_id");
CREATE INDEX "work_location_structure_assignment_location_idx"
  ON "hr"."work_location_structure_assignment"("work_location_id");
CREATE INDEX "work_location_structure_assignment_position_idx"
  ON "hr"."work_location_structure_assignment"("job_position_id");
CREATE INDEX "work_location_structure_assignment_function_idx"
  ON "hr"."work_location_structure_assignment"("job_function_id");
CREATE INDEX "work_location_structure_assignment_status_idx"
  ON "hr"."work_location_structure_assignment"("status");
