-- Residue-cluster canonical runtime tables.
-- tenant coverage markers: ('public', 'esocial_event'), ('public', 'tax_rate'), ('hr', 'health_provider_agreement_link'), ('hr', 'health_exam_provider_exam_link'), ('hr', 'salary_range_level'), ('hr', 'consignment_entity'), ('payroll', 'job_function_earning')

CREATE TYPE "ESocialEventStatus" AS ENUM (
  'PENDENTE',
  'GERANDO_XML',
  'ASSINANDO',
  'ENVIANDO',
  'AGUARDANDO_RETORNO',
  'PROCESSADO_COM_SUCESSO',
  'PROCESSADO_COM_ERROS',
  'ERRO_TECNICO_RETENTAVEL',
  'ERRO_DEFINITIVO',
  'EXCLUIDO'
);

CREATE TABLE "public"."esocial_event" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "event_type" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "competence" TEXT NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "xml_payload" TEXT,
  "schema_version" TEXT NOT NULL DEFAULT 'S-1.2',
  "status" "ESocialEventStatus" NOT NULL DEFAULT 'PENDENTE',
  "receipt_number" TEXT,
  "protocol_number" TEXT,
  "retry_count" INTEGER NOT NULL DEFAULT 0,
  "last_error_code" TEXT,
  "last_error_message" TEXT,
  "generated_at" TIMESTAMPTZ(6),
  "processed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "esocial_event_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "public_esocial_event_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id")
);

CREATE TABLE "public"."tax_rate" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "scope" TEXT NOT NULL,
  "reference_year" INTEGER NOT NULL,
  "rate_percent" DECIMAL(8,4) NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "tax_rate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "public_tax_rate_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id")
);

CREATE TABLE "hr"."health_provider_agreement_link" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "provider_entry_id" UUID NOT NULL,
  "agreement_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "health_provider_agreement_link_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_health_provider_agreement_link_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "health_provider_agreement_link_provider_entry_id_fkey"
    FOREIGN KEY ("provider_entry_id") REFERENCES "hr"."reference_catalog_entry"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "health_provider_agreement_link_agreement_id_fkey"
    FOREIGN KEY ("agreement_id") REFERENCES "hr"."agreement"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "hr"."health_exam_provider_exam_link" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "exam_provider_entry_id" UUID NOT NULL,
  "exam_entry_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "health_exam_provider_exam_link_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_health_exam_provider_exam_link_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "health_exam_provider_exam_link_provider_entry_id_fkey"
    FOREIGN KEY ("exam_provider_entry_id") REFERENCES "hr"."reference_catalog_entry"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "health_exam_provider_exam_link_exam_entry_id_fkey"
    FOREIGN KEY ("exam_entry_id") REFERENCES "hr"."reference_catalog_entry"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "hr"."salary_range_level" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "salary_range_id" UUID NOT NULL,
  "salary_reference_id" UUID,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "level_number" INTEGER NOT NULL DEFAULT 1,
  "amount_override" DECIMAL(14,2),
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "salary_range_level_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_salary_range_level_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "salary_range_level_salary_range_id_fkey"
    FOREIGN KEY ("salary_range_id") REFERENCES "hr"."salary_range"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "salary_range_level_salary_reference_id_fkey"
    FOREIGN KEY ("salary_reference_id") REFERENCES "hr"."salary_reference"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "hr"."consignment_entity" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "bank_code" TEXT,
  "contract_ref" TEXT,
  "discount_kind" TEXT,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "consignment_entity_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_consignment_entity_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id")
);

CREATE TABLE "payroll"."job_function_earning" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "job_function_id" UUID NOT NULL,
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

  CONSTRAINT "job_function_earning_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_job_function_earning_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "job_function_earning_job_function_id_fkey"
    FOREIGN KEY ("job_function_id") REFERENCES "hr"."job_function"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "job_function_earning_earning_deduction_id_fkey"
    FOREIGN KEY ("earning_deduction_id") REFERENCES "payroll"."payroll_earning_deduction"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "esocial_event_type_competence_idx"
  ON "public"."esocial_event"("event_type", "competence");
CREATE INDEX "esocial_event_status_created_at_idx"
  ON "public"."esocial_event"("status", "created_at");

CREATE UNIQUE INDEX "tax_rate_tenant_code_key"
  ON "public"."tax_rate"("tenant_id", "code");
CREATE INDEX "tax_rate_scope_reference_year_idx"
  ON "public"."tax_rate"("scope", "reference_year");
CREATE INDEX "tax_rate_status_idx"
  ON "public"."tax_rate"("status");

CREATE UNIQUE INDEX "health_provider_agreement_link_unique_key"
  ON "hr"."health_provider_agreement_link"("tenant_id", "provider_entry_id", "agreement_id");
CREATE INDEX "health_provider_agreement_link_agreement_idx"
  ON "hr"."health_provider_agreement_link"("agreement_id");
CREATE INDEX "health_provider_agreement_link_status_idx"
  ON "hr"."health_provider_agreement_link"("status");

CREATE UNIQUE INDEX "health_exam_provider_exam_link_unique_key"
  ON "hr"."health_exam_provider_exam_link"("tenant_id", "exam_provider_entry_id", "exam_entry_id");
CREATE INDEX "health_exam_provider_exam_link_exam_idx"
  ON "hr"."health_exam_provider_exam_link"("exam_entry_id");
CREATE INDEX "health_exam_provider_exam_link_status_idx"
  ON "hr"."health_exam_provider_exam_link"("status");

CREATE UNIQUE INDEX "salary_range_level_tenant_range_code_key"
  ON "hr"."salary_range_level"("tenant_id", "salary_range_id", "code");
CREATE INDEX "salary_range_level_salary_reference_idx"
  ON "hr"."salary_range_level"("salary_reference_id");
CREATE INDEX "salary_range_level_status_idx"
  ON "hr"."salary_range_level"("status");

CREATE UNIQUE INDEX "consignment_entity_tenant_code_key"
  ON "hr"."consignment_entity"("tenant_id", "code");
CREATE INDEX "consignment_entity_bank_code_idx"
  ON "hr"."consignment_entity"("bank_code");
CREATE INDEX "consignment_entity_status_idx"
  ON "hr"."consignment_entity"("status");

CREATE UNIQUE INDEX "job_function_earning_tenant_function_earning_key"
  ON "payroll"."job_function_earning"("tenant_id", "job_function_id", "earning_deduction_id");
CREATE INDEX "job_function_earning_status_idx"
  ON "payroll"."job_function_earning"("status");
CREATE INDEX "job_function_earning_job_function_id_idx"
  ON "payroll"."job_function_earning"("job_function_id");
CREATE INDEX "job_function_earning_earning_deduction_id_idx"
  ON "payroll"."job_function_earning"("earning_deduction_id");
