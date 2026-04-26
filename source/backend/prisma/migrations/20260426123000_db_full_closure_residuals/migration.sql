-- Full-closure residual canonical runtime tables.
-- tenant coverage markers: ('hr', 'shift_day_off'), ('hr', 'job_function_legislation_history'), ('payroll', 'professional_category_earning'), ('hr', 'training_suggestion'), ('hr', 'training_suggestion_complement'), ('hr', 'training_suggestion_employee'), ('hr', 'training_suggestion_cost'), ('hr', 'service_provider'), ('hr', 'service_taker')

CREATE TABLE "hr"."shift_day_off" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "shift_id" UUID NOT NULL,
  "weekday" INTEGER NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "shift_day_off_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_shift_day_off_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "shift_day_off_shift_id_fkey"
    FOREIGN KEY ("shift_id") REFERENCES "hr"."shift"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "shift_day_off_weekday_check"
    CHECK ("weekday" BETWEEN 0 AND 6)
);

CREATE TABLE "hr"."job_function_legislation_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "job_function_id" UUID NOT NULL,
  "legislation_id" UUID,
  "code" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "effective_on" DATE NOT NULL,
  "ends_on" DATE,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "job_function_legislation_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_job_function_legislation_history_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "job_function_legislation_history_function_id_fkey"
    FOREIGN KEY ("job_function_id") REFERENCES "hr"."job_function"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "job_function_legislation_history_legislation_id_fkey"
    FOREIGN KEY ("legislation_id") REFERENCES "hr"."legislation"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "payroll"."professional_category_earning" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "category_entry_id" UUID NOT NULL,
  "earning_deduction_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "default_amount" DECIMAL(14,2),
  "default_quantity" DECIMAL(12,4),
  "starts_on" DATE,
  "ends_on" DATE,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "professional_category_earning_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_professional_category_earning_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "professional_category_earning_category_entry_id_fkey"
    FOREIGN KEY ("category_entry_id") REFERENCES "hr"."reference_catalog_entry"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "professional_category_earning_earning_deduction_id_fkey"
    FOREIGN KEY ("earning_deduction_id") REFERENCES "payroll"."payroll_earning_deduction"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "hr"."training_suggestion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "course_entry_id" UUID,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "suggested_on" DATE,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "training_suggestion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_training_suggestion_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "training_suggestion_course_entry_id_fkey"
    FOREIGN KEY ("course_entry_id") REFERENCES "hr"."reference_catalog_entry"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "hr"."training_suggestion_complement" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "suggestion_id" UUID NOT NULL,
  "city_entry_id" UUID,
  "code" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "scheduled_on" DATE,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "training_suggestion_complement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_training_suggestion_complement_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "training_suggestion_complement_suggestion_id_fkey"
    FOREIGN KEY ("suggestion_id") REFERENCES "hr"."training_suggestion"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "training_suggestion_complement_city_entry_id_fkey"
    FOREIGN KEY ("city_entry_id") REFERENCES "hr"."reference_catalog_entry"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "hr"."training_suggestion_employee" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "suggestion_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "training_suggestion_employee_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_training_suggestion_employee_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "training_suggestion_employee_suggestion_id_fkey"
    FOREIGN KEY ("suggestion_id") REFERENCES "hr"."training_suggestion"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "training_suggestion_employee_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "hr"."employee"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "hr"."training_suggestion_cost" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "suggestion_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "cost_kind" TEXT NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "training_suggestion_cost_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_training_suggestion_cost_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "training_suggestion_cost_suggestion_id_fkey"
    FOREIGN KEY ("suggestion_id") REFERENCES "hr"."training_suggestion"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "hr"."service_provider" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "branch_id" UUID,
  "agreement_id" UUID,
  "category_entry_id" UUID,
  "cbo_entry_id" UUID,
  "earning_deduction_id" UUID,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "cpf_cnpj" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "address" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "service_provider_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_service_provider_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "service_provider_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "hr"."branch"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "service_provider_agreement_id_fkey"
    FOREIGN KEY ("agreement_id") REFERENCES "hr"."agreement"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "service_provider_category_entry_id_fkey"
    FOREIGN KEY ("category_entry_id") REFERENCES "hr"."reference_catalog_entry"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "service_provider_cbo_entry_id_fkey"
    FOREIGN KEY ("cbo_entry_id") REFERENCES "hr"."reference_catalog_entry"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "service_provider_earning_deduction_id_fkey"
    FOREIGN KEY ("earning_deduction_id") REFERENCES "payroll"."payroll_earning_deduction"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "hr"."service_taker" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "gps_payment_code_id" UUID,
  "sefip_code_id" UUID,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "cnpj" TEXT,
  "contact" TEXT NOT NULL DEFAULT '',
  "address" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "service_taker_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_service_taker_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "service_taker_gps_payment_code_id_fkey"
    FOREIGN KEY ("gps_payment_code_id") REFERENCES "payroll"."gps_payment_code"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "service_taker_sefip_code_id_fkey"
    FOREIGN KEY ("sefip_code_id") REFERENCES "payroll"."sefip_code"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "shift_day_off_shift_weekday_key"
  ON "hr"."shift_day_off"("tenant_id", "shift_id", "weekday");
CREATE INDEX "shift_day_off_shift_id_idx"
  ON "hr"."shift_day_off"("shift_id");
CREATE INDEX "shift_day_off_status_idx"
  ON "hr"."shift_day_off"("status");

CREATE UNIQUE INDEX "job_function_legislation_history_key"
  ON "hr"."job_function_legislation_history"("tenant_id", "job_function_id", "code", "effective_on");
CREATE INDEX "job_function_legislation_history_function_idx"
  ON "hr"."job_function_legislation_history"("job_function_id");
CREATE INDEX "job_function_legislation_history_legislation_idx"
  ON "hr"."job_function_legislation_history"("legislation_id");
CREATE INDEX "job_function_legislation_history_status_idx"
  ON "hr"."job_function_legislation_history"("status");

CREATE UNIQUE INDEX "professional_category_earning_key"
  ON "payroll"."professional_category_earning"("tenant_id", "category_entry_id", "earning_deduction_id");
CREATE INDEX "professional_category_earning_status_idx"
  ON "payroll"."professional_category_earning"("status");
CREATE INDEX "professional_category_earning_category_entry_idx"
  ON "payroll"."professional_category_earning"("category_entry_id");
CREATE INDEX "professional_category_earning_earning_deduction_idx"
  ON "payroll"."professional_category_earning"("earning_deduction_id");

CREATE UNIQUE INDEX "training_suggestion_tenant_code_key"
  ON "hr"."training_suggestion"("tenant_id", "code");
CREATE INDEX "training_suggestion_course_entry_idx"
  ON "hr"."training_suggestion"("course_entry_id");
CREATE INDEX "training_suggestion_status_idx"
  ON "hr"."training_suggestion"("status");

CREATE UNIQUE INDEX "training_suggestion_complement_key"
  ON "hr"."training_suggestion_complement"("tenant_id", "suggestion_id", "code");
CREATE INDEX "training_suggestion_complement_suggestion_idx"
  ON "hr"."training_suggestion_complement"("suggestion_id");
CREATE INDEX "training_suggestion_complement_city_entry_idx"
  ON "hr"."training_suggestion_complement"("city_entry_id");
CREATE INDEX "training_suggestion_complement_status_idx"
  ON "hr"."training_suggestion_complement"("status");

CREATE UNIQUE INDEX "training_suggestion_employee_key"
  ON "hr"."training_suggestion_employee"("tenant_id", "suggestion_id", "employee_id");
CREATE INDEX "training_suggestion_employee_suggestion_idx"
  ON "hr"."training_suggestion_employee"("suggestion_id");
CREATE INDEX "training_suggestion_employee_employee_idx"
  ON "hr"."training_suggestion_employee"("employee_id");
CREATE INDEX "training_suggestion_employee_status_idx"
  ON "hr"."training_suggestion_employee"("status");

CREATE UNIQUE INDEX "training_suggestion_cost_key"
  ON "hr"."training_suggestion_cost"("tenant_id", "suggestion_id", "code");
CREATE INDEX "training_suggestion_cost_suggestion_idx"
  ON "hr"."training_suggestion_cost"("suggestion_id");
CREATE INDEX "training_suggestion_cost_status_idx"
  ON "hr"."training_suggestion_cost"("status");

CREATE UNIQUE INDEX "service_provider_tenant_code_key"
  ON "hr"."service_provider"("tenant_id", "code");
CREATE UNIQUE INDEX "service_provider_tenant_cpf_cnpj_key"
  ON "hr"."service_provider"("tenant_id", "cpf_cnpj");
CREATE INDEX "service_provider_branch_idx"
  ON "hr"."service_provider"("branch_id");
CREATE INDEX "service_provider_agreement_idx"
  ON "hr"."service_provider"("agreement_id");
CREATE INDEX "service_provider_category_entry_idx"
  ON "hr"."service_provider"("category_entry_id");
CREATE INDEX "service_provider_cbo_entry_idx"
  ON "hr"."service_provider"("cbo_entry_id");
CREATE INDEX "service_provider_earning_deduction_idx"
  ON "hr"."service_provider"("earning_deduction_id");
CREATE INDEX "service_provider_status_idx"
  ON "hr"."service_provider"("status");

CREATE UNIQUE INDEX "service_taker_tenant_code_key"
  ON "hr"."service_taker"("tenant_id", "code");
CREATE UNIQUE INDEX "service_taker_tenant_cnpj_key"
  ON "hr"."service_taker"("tenant_id", "cnpj");
CREATE INDEX "service_taker_gps_payment_code_idx"
  ON "hr"."service_taker"("gps_payment_code_id");
CREATE INDEX "service_taker_sefip_code_idx"
  ON "hr"."service_taker"("sefip_code_id");
CREATE INDEX "service_taker_status_idx"
  ON "hr"."service_taker"("status");
