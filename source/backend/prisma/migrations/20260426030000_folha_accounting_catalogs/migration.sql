-- Folha accounting catalogs and mapping tables.
-- tenant coverage markers: ('payroll', 'gps_payment_code'), ('payroll', 'sefip_code'), ('payroll', 'accounting_history'), ('payroll', 'simple_account'), ('payroll', 'accounting_account'), ('payroll', 'accounting_account_work_location')

CREATE TABLE "payroll"."gps_payment_code" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "code" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "gps_payment_code_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_gps_payment_code_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id")
);

CREATE TABLE "payroll"."sefip_code" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "code" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "sefip_code_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_sefip_code_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id")
);

CREATE TABLE "payroll"."accounting_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "code" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "accounting_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_accounting_history_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id")
);

CREATE TABLE "payroll"."simple_account" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "code" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "simple_account_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_simple_account_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id")
);

CREATE TABLE "payroll"."accounting_account" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "branch_id" UUID,
  "cost_center_id" UUID,
  "earning_deduction_id" UUID,
  "accounting_history_id" UUID,
  "simple_account_id" UUID,
  "account_type" TEXT NOT NULL,
  "account_code" TEXT NOT NULL,
  "allocation_percent" DECIMAL(8,4) NOT NULL DEFAULT 0,
  "total_allocation_percent" DECIMAL(8,4) NOT NULL DEFAULT 0,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "accounting_account_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_accounting_account_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "accounting_account_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "hr"."branch"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "accounting_account_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "hr"."cost_center"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "accounting_account_earning_deduction_id_fkey" FOREIGN KEY ("earning_deduction_id") REFERENCES "payroll"."payroll_earning_deduction"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "accounting_account_accounting_history_id_fkey" FOREIGN KEY ("accounting_history_id") REFERENCES "payroll"."accounting_history"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "accounting_account_simple_account_id_fkey" FOREIGN KEY ("simple_account_id") REFERENCES "payroll"."simple_account"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "payroll"."accounting_account_work_location" (
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "accounting_account_id" UUID NOT NULL,
  "work_location_id" UUID NOT NULL,

  CONSTRAINT "accounting_account_work_location_pkey" PRIMARY KEY ("accounting_account_id", "work_location_id"),
  CONSTRAINT "payroll_accounting_account_work_location_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "accounting_account_work_location_accounting_account_id_fkey" FOREIGN KEY ("accounting_account_id") REFERENCES "payroll"."accounting_account"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "accounting_account_work_location_work_location_id_fkey" FOREIGN KEY ("work_location_id") REFERENCES "hr"."work_location"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "gps_payment_code_tenant_code_key"
  ON "payroll"."gps_payment_code"("tenant_id", "code");
CREATE INDEX "gps_payment_code_status_idx"
  ON "payroll"."gps_payment_code"("status");

CREATE UNIQUE INDEX "sefip_code_tenant_code_type_key"
  ON "payroll"."sefip_code"("tenant_id", "code", "type");
CREATE INDEX "sefip_code_status_idx"
  ON "payroll"."sefip_code"("status");

CREATE UNIQUE INDEX "accounting_history_tenant_code_key"
  ON "payroll"."accounting_history"("tenant_id", "code");
CREATE INDEX "accounting_history_status_idx"
  ON "payroll"."accounting_history"("status");

CREATE UNIQUE INDEX "simple_account_tenant_code_key"
  ON "payroll"."simple_account"("tenant_id", "code");
CREATE INDEX "simple_account_status_idx"
  ON "payroll"."simple_account"("status");

CREATE INDEX "accounting_account_branch_id_idx"
  ON "payroll"."accounting_account"("branch_id");
CREATE INDEX "accounting_account_cost_center_id_idx"
  ON "payroll"."accounting_account"("cost_center_id");
CREATE INDEX "accounting_account_earning_deduction_id_idx"
  ON "payroll"."accounting_account"("earning_deduction_id");
CREATE INDEX "accounting_account_accounting_history_id_idx"
  ON "payroll"."accounting_account"("accounting_history_id");
CREATE INDEX "accounting_account_simple_account_id_idx"
  ON "payroll"."accounting_account"("simple_account_id");
CREATE INDEX "accounting_account_status_idx"
  ON "payroll"."accounting_account"("status");

CREATE INDEX "accounting_account_work_location_work_location_id_idx"
  ON "payroll"."accounting_account_work_location"("work_location_id");
