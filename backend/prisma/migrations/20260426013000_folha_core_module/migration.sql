-- Folha core canonical runtime tables.
-- tenant coverage markers: ('payroll', 'formula_attribute'), ('payroll', 'job_position_earning'), ('payroll', 'employment_link_earning'), ('payroll', 'payroll_type_earning'), ('payroll', 'payroll_run_work_location'), ('payroll', 'advance_request'), ('payroll', 'advance_payment')

CREATE TYPE "AdvanceRequestStatus" AS ENUM (
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'PROCESSED',
  'CANCELED'
);

CREATE TYPE "AdvancePaymentStatus" AS ENUM (
  'PENDING',
  'GENERATED',
  'PAID',
  'CANCELED'
);

CREATE TABLE "payroll"."formula_attribute" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "code" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "data_type" TEXT NOT NULL,
  "source_scope" TEXT NOT NULL,
  "expression_hint" TEXT NOT NULL DEFAULT '',
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "formula_attribute_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_formula_attribute_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id")
);

CREATE TABLE "payroll"."job_position_earning" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "job_position_id" UUID NOT NULL,
  "earning_deduction_id" UUID NOT NULL,
  "default_amount" DECIMAL(14,2),
  "default_quantity" DECIMAL(12,4),
  "starts_on" DATE,
  "ends_on" DATE,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "job_position_earning_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_job_position_earning_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "job_position_earning_job_position_id_fkey" FOREIGN KEY ("job_position_id") REFERENCES "hr"."job_position"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "job_position_earning_earning_deduction_id_fkey" FOREIGN KEY ("earning_deduction_id") REFERENCES "payroll"."payroll_earning_deduction"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "payroll"."employment_link_earning" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "employment_link_id" UUID NOT NULL,
  "earning_deduction_id" UUID NOT NULL,
  "default_amount" DECIMAL(14,2),
  "default_quantity" DECIMAL(12,4),
  "starts_on" DATE,
  "ends_on" DATE,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "employment_link_earning_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_employment_link_earning_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "employment_link_earning_employment_link_id_fkey" FOREIGN KEY ("employment_link_id") REFERENCES "hr"."employment_link"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "employment_link_earning_earning_deduction_id_fkey" FOREIGN KEY ("earning_deduction_id") REFERENCES "payroll"."payroll_earning_deduction"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "payroll"."payroll_type_earning" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "payroll_type_id" UUID NOT NULL,
  "earning_deduction_id" UUID NOT NULL,
  "default_amount" DECIMAL(14,2),
  "default_quantity" DECIMAL(12,4),
  "starts_on" DATE,
  "ends_on" DATE,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payroll_type_earning_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_payroll_type_earning_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "payroll_type_earning_payroll_type_id_fkey" FOREIGN KEY ("payroll_type_id") REFERENCES "payroll"."payroll_type"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "payroll_type_earning_earning_deduction_id_fkey" FOREIGN KEY ("earning_deduction_id") REFERENCES "payroll"."payroll_earning_deduction"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "payroll"."payroll_run_work_location" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "payroll_run_id" UUID NOT NULL,
  "work_location_id" UUID,
  "employee_count" INTEGER NOT NULL DEFAULT 0,
  "total_earnings" DECIMAL(16,2) NOT NULL DEFAULT 0,
  "total_deductions" DECIMAL(16,2) NOT NULL DEFAULT 0,
  "total_net" DECIMAL(16,2) NOT NULL DEFAULT 0,
  "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB NOT NULL DEFAULT '{}',

  CONSTRAINT "payroll_run_work_location_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_payroll_run_work_location_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "payroll_run_work_location_payroll_run_id_fkey" FOREIGN KEY ("payroll_run_id") REFERENCES "payroll"."payroll_run"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "payroll_run_work_location_work_location_id_fkey" FOREIGN KEY ("work_location_id") REFERENCES "hr"."work_location"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "payroll"."advance_request" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "employee_id" UUID NOT NULL,
  "payroll_run_id" UUID,
  "requested_amount" DECIMAL(14,2) NOT NULL,
  "approved_amount" DECIMAL(14,2),
  "requested_on" DATE NOT NULL,
  "processed_on" DATE,
  "status" "AdvanceRequestStatus" NOT NULL DEFAULT 'REQUESTED',
  "notes" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "advance_request_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_advance_request_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "advance_request_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr"."employee"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "advance_request_payroll_run_id_fkey" FOREIGN KEY ("payroll_run_id") REFERENCES "payroll"."payroll_run"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "payroll"."advance_payment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "request_id" UUID,
  "employee_id" UUID NOT NULL,
  "payroll_run_id" UUID,
  "amount" DECIMAL(14,2) NOT NULL,
  "payment_date" DATE,
  "status" "AdvancePaymentStatus" NOT NULL DEFAULT 'PENDING',
  "notes" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "advance_payment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_advance_payment_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "advance_payment_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "payroll"."advance_request"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "advance_payment_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr"."employee"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "advance_payment_payroll_run_id_fkey" FOREIGN KEY ("payroll_run_id") REFERENCES "payroll"."payroll_run"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "formula_attribute_tenant_code_key"
  ON "payroll"."formula_attribute"("tenant_id", "code");
CREATE INDEX "formula_attribute_status_idx"
  ON "payroll"."formula_attribute"("status");

CREATE UNIQUE INDEX "job_position_earning_tenant_position_earning_key"
  ON "payroll"."job_position_earning"("tenant_id", "job_position_id", "earning_deduction_id");
CREATE INDEX "job_position_earning_status_idx"
  ON "payroll"."job_position_earning"("status");
CREATE INDEX "job_position_earning_job_position_id_idx"
  ON "payroll"."job_position_earning"("job_position_id");
CREATE INDEX "job_position_earning_earning_deduction_id_idx"
  ON "payroll"."job_position_earning"("earning_deduction_id");

CREATE UNIQUE INDEX "employment_link_earning_tenant_link_earning_key"
  ON "payroll"."employment_link_earning"("tenant_id", "employment_link_id", "earning_deduction_id");
CREATE INDEX "employment_link_earning_status_idx"
  ON "payroll"."employment_link_earning"("status");
CREATE INDEX "employment_link_earning_employment_link_id_idx"
  ON "payroll"."employment_link_earning"("employment_link_id");
CREATE INDEX "employment_link_earning_earning_deduction_id_idx"
  ON "payroll"."employment_link_earning"("earning_deduction_id");

CREATE UNIQUE INDEX "payroll_type_earning_tenant_type_earning_key"
  ON "payroll"."payroll_type_earning"("tenant_id", "payroll_type_id", "earning_deduction_id");
CREATE INDEX "payroll_type_earning_status_idx"
  ON "payroll"."payroll_type_earning"("status");
CREATE INDEX "payroll_type_earning_payroll_type_id_idx"
  ON "payroll"."payroll_type_earning"("payroll_type_id");
CREATE INDEX "payroll_type_earning_earning_deduction_id_idx"
  ON "payroll"."payroll_type_earning"("earning_deduction_id");

CREATE UNIQUE INDEX "payroll_run_work_location_run_location_key"
  ON "payroll"."payroll_run_work_location"("payroll_run_id", "work_location_id");
CREATE INDEX "payroll_run_work_location_work_location_id_idx"
  ON "payroll"."payroll_run_work_location"("work_location_id");

CREATE INDEX "advance_request_employee_id_requested_on_idx"
  ON "payroll"."advance_request"("employee_id", "requested_on");
CREATE INDEX "advance_request_payroll_run_id_idx"
  ON "payroll"."advance_request"("payroll_run_id");
CREATE INDEX "advance_request_status_idx"
  ON "payroll"."advance_request"("status");

CREATE INDEX "advance_payment_request_id_idx"
  ON "payroll"."advance_payment"("request_id");
CREATE INDEX "advance_payment_employee_id_payment_date_idx"
  ON "payroll"."advance_payment"("employee_id", "payment_date");
CREATE INDEX "advance_payment_payroll_run_id_idx"
  ON "payroll"."advance_payment"("payroll_run_id");
CREATE INDEX "advance_payment_status_idx"
  ON "payroll"."advance_payment"("status");
