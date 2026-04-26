-- Phase 2: replace retired transitional operational slice with canonical HR tables.

CREATE SCHEMA IF NOT EXISTS "hr";

CREATE TABLE IF NOT EXISTS "hr"."business_day" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "business_date" DATE,
  "is_business_day" BOOLEAN NOT NULL DEFAULT true,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "business_day_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "business_day_code_key" ON "hr"."business_day"("code");
CREATE INDEX IF NOT EXISTS "business_day_business_date_idx" ON "hr"."business_day"("business_date");
CREATE INDEX IF NOT EXISTS "business_day_status_idx" ON "hr"."business_day"("status");

CREATE TABLE IF NOT EXISTS "hr"."file_export_job" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "format" TEXT NOT NULL DEFAULT 'CSV',
  "target_route" TEXT,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "file_export_job_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "file_export_job_code_key" ON "hr"."file_export_job"("code");
CREATE INDEX IF NOT EXISTS "file_export_job_target_route_idx" ON "hr"."file_export_job"("target_route");
CREATE INDEX IF NOT EXISTS "file_export_job_status_idx" ON "hr"."file_export_job"("status");

CREATE TABLE IF NOT EXISTS "hr"."consignment_import_job" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "source_file_name" TEXT,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "consignment_import_job_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "consignment_import_job_code_key" ON "hr"."consignment_import_job"("code");
CREATE INDEX IF NOT EXISTS "consignment_import_job_source_file_name_idx" ON "hr"."consignment_import_job"("source_file_name");
CREATE INDEX IF NOT EXISTS "consignment_import_job_status_idx" ON "hr"."consignment_import_job"("status");

CREATE TABLE IF NOT EXISTS "hr"."employee_payroll_item_import_job" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "competence_year" INTEGER,
  "competence_month" INTEGER,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employee_payroll_item_import_job_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "employee_payroll_item_import_job_code_key" ON "hr"."employee_payroll_item_import_job"("code");
CREATE INDEX IF NOT EXISTS "employee_payroll_item_import_job_competence_idx" ON "hr"."employee_payroll_item_import_job"("competence_year", "competence_month");
CREATE INDEX IF NOT EXISTS "employee_payroll_item_import_job_status_idx" ON "hr"."employee_payroll_item_import_job"("status");

CREATE TABLE IF NOT EXISTS "hr"."competence_period" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "competence_year" INTEGER NOT NULL,
  "competence_month" INTEGER NOT NULL,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "competence_period_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "competence_period_code_key" ON "hr"."competence_period"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "competence_period_competence_year_competence_month_key" ON "hr"."competence_period"("competence_year", "competence_month");
CREATE INDEX IF NOT EXISTS "competence_period_status_idx" ON "hr"."competence_period"("status");

DROP TABLE IF EXISTS "public"."notification_counter";

