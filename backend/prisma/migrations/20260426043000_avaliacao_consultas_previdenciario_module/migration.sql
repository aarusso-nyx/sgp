-- Avaliacao, consultas-gerenciais support, and previdenciario canonical runtime tables.
-- tenant coverage markers: ('hr', 'performance_evaluation'), ('hr', 'merit_progression'), ('hr', 'salary_simulation'), ('hr', 'career_plan'), ('hr', 'salary_simulation_adjustment'), ('hr', 'retirement_rule'), ('hr', 'retirement_simulation'), ('hr', 'retirement_grant'), ('hr', 'pension_grant'), ('hr', 'contribution_time_certificate'), ('hr', 'previdentiary_declaration'), ('hr', 'pension_compensation'), ('hr', 'recertification_campaign'), ('hr', 'recertification_beneficiary'), ('hr', 'recertification_record'), ('hr', 'external_life_proof'), ('hr', 'beneficiary_contact_history')

CREATE TYPE "PerformanceEvaluationStatus" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'REJECTED'
);

CREATE TYPE "ProgressionKind" AS ENUM (
  'MERIT',
  'TITLE',
  'JUDICIAL',
  'CORRECTION'
);

CREATE TYPE "PensionCompensationStatus" AS ENUM (
  'DRAFT',
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'SETTLED'
);

CREATE TYPE "RecertificationBeneficiaryType" AS ENUM (
  'RETIREE',
  'PENSIONER',
  'UNIVERSITY_PENSIONER'
);

CREATE TYPE "RecertificationStatus" AS ENUM (
  'PENDING',
  'RECERTIFIED',
  'NEAR_DUE',
  'OVERDUE',
  'BLOCKED'
);

CREATE TYPE "ExternalLifeProofChannel" AS ENUM (
  'PORTAL_COLABORADOR',
  'PREFEITURA_PUBLICA',
  'GOV_BR'
);

CREATE TABLE "hr"."performance_evaluation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "employee_id" UUID NOT NULL,
  "branch_id" UUID,
  "work_location_id" UUID,
  "job_position_id" UUID,
  "job_function_id" UUID,
  "period_label" TEXT NOT NULL,
  "score" DECIMAL(8,2) NOT NULL DEFAULT 0,
  "criteria" JSONB NOT NULL DEFAULT '[]',
  "evaluator_ref" TEXT NOT NULL,
  "evaluated_on" DATE NOT NULL,
  "status" "PerformanceEvaluationStatus" NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "performance_evaluation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_performance_evaluation_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "performance_evaluation_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr"."employee"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "performance_evaluation_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "hr"."branch"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "performance_evaluation_work_location_id_fkey" FOREIGN KEY ("work_location_id") REFERENCES "hr"."work_location"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "performance_evaluation_job_position_id_fkey" FOREIGN KEY ("job_position_id") REFERENCES "hr"."job_position"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "performance_evaluation_job_function_id_fkey" FOREIGN KEY ("job_function_id") REFERENCES "hr"."job_function"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "hr"."merit_progression" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "employee_id" UUID NOT NULL,
  "performance_evaluation_id" UUID,
  "source_salary_reference_id" UUID,
  "target_salary_reference_id" UUID,
  "effective_on" DATE NOT NULL,
  "appointment_act" TEXT NOT NULL DEFAULT '',
  "kind" "ProgressionKind" NOT NULL DEFAULT 'MERIT',
  "justification" TEXT NOT NULL DEFAULT '',
  "approved_by_ref" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "merit_progression_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_merit_progression_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "merit_progression_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr"."employee"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "merit_progression_performance_evaluation_id_fkey" FOREIGN KEY ("performance_evaluation_id") REFERENCES "hr"."performance_evaluation"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "merit_progression_source_salary_reference_id_fkey" FOREIGN KEY ("source_salary_reference_id") REFERENCES "hr"."salary_reference"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "merit_progression_target_salary_reference_id_fkey" FOREIGN KEY ("target_salary_reference_id") REFERENCES "hr"."salary_reference"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "hr"."salary_simulation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "employee_id" UUID NOT NULL,
  "scenario" TEXT NOT NULL,
  "result_json" JSONB NOT NULL DEFAULT '{}',
  "created_by_ref" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "salary_simulation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_salary_simulation_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "salary_simulation_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr"."employee"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "hr"."career_plan" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "employee_id" UUID,
  "name" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "effective_on" DATE NOT NULL,
  "levels_json" JSONB NOT NULL DEFAULT '{}',
  "references_json" JSONB NOT NULL DEFAULT '{}',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "career_plan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_career_plan_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "career_plan_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr"."employee"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "hr"."salary_simulation_adjustment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "simulation_id" UUID NOT NULL,
  "label" TEXT NOT NULL,
  "percent_adjustment" DECIMAL(8,4),
  "fixed_adjustment" DECIMAL(14,2),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "salary_simulation_adjustment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_salary_simulation_adjustment_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "salary_simulation_adjustment_simulation_id_fkey" FOREIGN KEY ("simulation_id") REFERENCES "hr"."salary_simulation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "hr"."retirement_rule" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "name" TEXT NOT NULL,
  "legal_basis" TEXT NOT NULL,
  "age_criteria" JSONB NOT NULL DEFAULT '{}',
  "contribution_time_criteria" JSONB NOT NULL DEFAULT '{}',
  "grace_period_criteria" JSONB NOT NULL DEFAULT '{}',
  "applicable_employment_link" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "retirement_rule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_retirement_rule_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id")
);

CREATE TABLE "hr"."retirement_simulation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "employee_id" UUID NOT NULL,
  "rule_id" UUID NOT NULL,
  "result" JSONB NOT NULL DEFAULT '{}',
  "details_json" JSONB NOT NULL DEFAULT '{}',
  "simulated_on" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_ref" TEXT,

  CONSTRAINT "retirement_simulation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_retirement_simulation_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "retirement_simulation_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr"."employee"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "retirement_simulation_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "hr"."retirement_rule"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "hr"."retirement_grant" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "employee_id" UUID NOT NULL,
  "rule_id" UUID NOT NULL,
  "granted_on" DATE NOT NULL,
  "legal_basis" TEXT NOT NULL,
  "appointment_act" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'CONCEDIDA',
  "notes" TEXT NOT NULL DEFAULT '',
  "granted_by_ref" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "retirement_grant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_retirement_grant_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "retirement_grant_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr"."employee"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "retirement_grant_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "hr"."retirement_rule"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "hr"."pension_grant" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "instituting_employee_id" UUID,
  "beneficiary_name" TEXT NOT NULL,
  "beneficiary_cpf" TEXT,
  "kinship" TEXT,
  "benefit_type" TEXT NOT NULL,
  "apportionment_type" TEXT NOT NULL,
  "share_percent" DECIMAL(8,4) NOT NULL,
  "adjustment_mode" TEXT NOT NULL,
  "nature" TEXT NOT NULL,
  "granted_on" DATE NOT NULL,
  "ceased_on" DATE,
  "legal_basis" TEXT NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "pension_grant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_pension_grant_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "pension_grant_instituting_employee_id_fkey" FOREIGN KEY ("instituting_employee_id") REFERENCES "hr"."employee"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "hr"."contribution_time_certificate" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "employee_id" UUID NOT NULL,
  "period_start" DATE NOT NULL,
  "period_end" DATE NOT NULL,
  "issuing_agency" TEXT NOT NULL,
  "issuance_act" TEXT NOT NULL,
  "storage_key" TEXT,
  "issued_at" TIMESTAMPTZ(6) NOT NULL,
  "issued_by_ref" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "contribution_time_certificate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_contribution_time_certificate_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "contribution_time_certificate_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr"."employee"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "hr"."previdentiary_declaration" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "employee_id" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "issued_at" TIMESTAMPTZ(6) NOT NULL,
  "storage_key" TEXT,
  "issued_by_ref" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "previdentiary_declaration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_previdentiary_declaration_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "previdentiary_declaration_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr"."employee"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "hr"."pension_compensation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "employee_id" UUID,
  "certificate_ref" TEXT,
  "origin_regime" TEXT NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "status" "PensionCompensationStatus" NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "pension_compensation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_pension_compensation_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "pension_compensation_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr"."employee"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "hr"."recertification_campaign" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "type" "RecertificationBeneficiaryType" NOT NULL,
  "cycle_start" DATE NOT NULL,
  "cycle_end" DATE NOT NULL,
  "filter_json" JSONB NOT NULL DEFAULT '{}',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "recertification_campaign_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_recertification_campaign_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id")
);

CREATE TABLE "hr"."recertification_beneficiary" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "employee_id" UUID NOT NULL,
  "campaign_id" UUID,
  "type" "RecertificationBeneficiaryType" NOT NULL,
  "next_due_date" DATE NOT NULL,
  "status" "RecertificationStatus" NOT NULL DEFAULT 'PENDING',
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "recertification_beneficiary_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_recertification_beneficiary_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "recertification_beneficiary_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr"."employee"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "recertification_beneficiary_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "hr"."recertification_campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "hr"."recertification_record" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "beneficiary_id" UUID NOT NULL,
  "recertified_on" DATE NOT NULL,
  "operator_ref" TEXT NOT NULL,
  "snapshot_json" JSONB NOT NULL DEFAULT '{}',
  "receipt_storage_key" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "recertification_record_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_recertification_record_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "recertification_record_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "hr"."recertification_beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "hr"."external_life_proof" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "beneficiary_id" UUID NOT NULL,
  "channel" "ExternalLifeProofChannel" NOT NULL,
  "authentication_json" JSONB NOT NULL DEFAULT '{}',
  "proven_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "external_life_proof_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_external_life_proof_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "external_life_proof_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "hr"."recertification_beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "hr"."beneficiary_contact_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "beneficiary_id" UUID NOT NULL,
  "contacted_on" DATE NOT NULL,
  "user_ref" TEXT NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "beneficiary_contact_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_beneficiary_contact_history_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "beneficiary_contact_history_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "hr"."recertification_beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "performance_evaluation_tenant_employee_idx"
  ON "hr"."performance_evaluation"("tenant_id", "employee_id");
CREATE INDEX "performance_evaluation_branch_id_idx"
  ON "hr"."performance_evaluation"("branch_id");
CREATE INDEX "performance_evaluation_work_location_id_idx"
  ON "hr"."performance_evaluation"("work_location_id");
CREATE INDEX "performance_evaluation_job_position_id_idx"
  ON "hr"."performance_evaluation"("job_position_id");
CREATE INDEX "performance_evaluation_job_function_id_idx"
  ON "hr"."performance_evaluation"("job_function_id");
CREATE INDEX "performance_evaluation_status_idx"
  ON "hr"."performance_evaluation"("status");

CREATE INDEX "merit_progression_tenant_employee_idx"
  ON "hr"."merit_progression"("tenant_id", "employee_id");
CREATE INDEX "merit_progression_evaluation_id_idx"
  ON "hr"."merit_progression"("performance_evaluation_id");
CREATE INDEX "merit_progression_source_reference_idx"
  ON "hr"."merit_progression"("source_salary_reference_id");
CREATE INDEX "merit_progression_target_reference_idx"
  ON "hr"."merit_progression"("target_salary_reference_id");

CREATE INDEX "salary_simulation_tenant_employee_idx"
  ON "hr"."salary_simulation"("tenant_id", "employee_id");
CREATE INDEX "career_plan_tenant_active_effective_idx"
  ON "hr"."career_plan"("tenant_id", "active", "effective_on");
CREATE INDEX "career_plan_employee_id_idx"
  ON "hr"."career_plan"("employee_id");
CREATE INDEX "salary_simulation_adjustment_tenant_simulation_idx"
  ON "hr"."salary_simulation_adjustment"("tenant_id", "simulation_id");

CREATE INDEX "retirement_rule_tenant_active_idx"
  ON "hr"."retirement_rule"("tenant_id", "active");
CREATE INDEX "retirement_simulation_tenant_employee_idx"
  ON "hr"."retirement_simulation"("tenant_id", "employee_id");
CREATE INDEX "retirement_simulation_rule_id_idx"
  ON "hr"."retirement_simulation"("rule_id");
CREATE INDEX "retirement_grant_tenant_employee_idx"
  ON "hr"."retirement_grant"("tenant_id", "employee_id", "granted_on");
CREATE INDEX "retirement_grant_rule_id_idx"
  ON "hr"."retirement_grant"("rule_id");
CREATE INDEX "pension_grant_tenant_granted_idx"
  ON "hr"."pension_grant"("tenant_id", "granted_on");
CREATE INDEX "pension_grant_instituting_employee_id_idx"
  ON "hr"."pension_grant"("instituting_employee_id");
CREATE INDEX "pension_grant_benefit_type_idx"
  ON "hr"."pension_grant"("benefit_type");
CREATE INDEX "contribution_time_certificate_tenant_employee_idx"
  ON "hr"."contribution_time_certificate"("tenant_id", "employee_id", "issued_at");
CREATE INDEX "previdentiary_declaration_tenant_employee_type_idx"
  ON "hr"."previdentiary_declaration"("tenant_id", "employee_id", "type");
CREATE INDEX "pension_compensation_tenant_status_idx"
  ON "hr"."pension_compensation"("tenant_id", "status");
CREATE INDEX "pension_compensation_employee_id_idx"
  ON "hr"."pension_compensation"("employee_id");

CREATE INDEX "recertification_campaign_tenant_type_active_idx"
  ON "hr"."recertification_campaign"("tenant_id", "type", "active");
CREATE UNIQUE INDEX "recertification_beneficiary_employee_id_key"
  ON "hr"."recertification_beneficiary"("employee_id");
CREATE INDEX "recertification_beneficiary_tenant_status_due_idx"
  ON "hr"."recertification_beneficiary"("tenant_id", "status", "next_due_date");
CREATE INDEX "recertification_beneficiary_campaign_id_idx"
  ON "hr"."recertification_beneficiary"("campaign_id");
CREATE INDEX "recertification_record_tenant_beneficiary_date_idx"
  ON "hr"."recertification_record"("tenant_id", "beneficiary_id", "recertified_on");
CREATE INDEX "external_life_proof_tenant_beneficiary_proven_idx"
  ON "hr"."external_life_proof"("tenant_id", "beneficiary_id", "proven_at");
CREATE INDEX "external_life_proof_channel_idx"
  ON "hr"."external_life_proof"("channel");
CREATE INDEX "beneficiary_contact_history_tenant_beneficiary_idx"
  ON "hr"."beneficiary_contact_history"("tenant_id", "beneficiary_id", "contacted_on");
