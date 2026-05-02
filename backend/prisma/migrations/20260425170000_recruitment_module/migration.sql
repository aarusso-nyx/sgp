-- Recruitment module canonical runtime tables.
-- tenant coverage markers: ('hr', 'recruitment_request'), ('hr', 'recruitment_request_function'), ('hr', 'recruitment_candidate')

CREATE TYPE "RecruitmentRequestStatus" AS ENUM (
  'DRAFT',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELED'
);

CREATE TYPE "RecruitmentCandidateStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED'
);

CREATE TYPE "RecruitmentHiringType" AS ENUM (
  'EFFECTIVE',
  'COMMISSIONED',
  'CONTRACTOR',
  'INTERN'
);

CREATE TABLE "hr"."recruitment_request" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "requester_ref" TEXT NOT NULL,
  "branch_id" UUID,
  "work_location_id" UUID,
  "reason" TEXT NOT NULL,
  "justification" TEXT NOT NULL,
  "request_date" DATE NOT NULL,
  "due_date" DATE,
  "status" "RecruitmentRequestStatus" NOT NULL DEFAULT 'DRAFT',
  "completed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "recruitment_request_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_recruitment_request_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "recruitment_request_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "hr"."branch"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "recruitment_request_work_location_id_fkey" FOREIGN KEY ("work_location_id") REFERENCES "hr"."work_location"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "hr"."recruitment_request_function" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "request_id" UUID NOT NULL,
  "job_function_id" UUID,
  "hiring_type" "RecruitmentHiringType" NOT NULL,
  "vacancy_count" INTEGER NOT NULL,
  "requirements" TEXT NOT NULL DEFAULT '',
  "shift_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "recruitment_request_function_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_recruitment_request_function_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "recruitment_request_function_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "hr"."recruitment_request"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "recruitment_request_function_job_function_id_fkey" FOREIGN KEY ("job_function_id") REFERENCES "hr"."job_function"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "recruitment_request_function_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "hr"."shift"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "hr"."recruitment_candidate" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "request_id" UUID NOT NULL,
  "person_ref" TEXT NOT NULL,
  "curriculum_s3_key" TEXT,
  "status" "RecruitmentCandidateStatus" NOT NULL DEFAULT 'PENDING',
  "review_comment" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "recruitment_candidate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_recruitment_candidate_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "recruitment_candidate_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "hr"."recruitment_request"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "recruitment_request_tenant_status_idx"
  ON "hr"."recruitment_request"("tenant_id", "status");
CREATE INDEX "recruitment_request_branch_id_idx"
  ON "hr"."recruitment_request"("branch_id");
CREATE INDEX "recruitment_request_work_location_id_idx"
  ON "hr"."recruitment_request"("work_location_id");

CREATE INDEX "recruitment_request_function_tenant_request_idx"
  ON "hr"."recruitment_request_function"("tenant_id", "request_id");
CREATE INDEX "recruitment_request_function_job_function_id_idx"
  ON "hr"."recruitment_request_function"("job_function_id");
CREATE INDEX "recruitment_request_function_shift_id_idx"
  ON "hr"."recruitment_request_function"("shift_id");

CREATE UNIQUE INDEX "recruitment_candidate_request_id_person_ref_key"
  ON "hr"."recruitment_candidate"("request_id", "person_ref");
CREATE INDEX "recruitment_candidate_tenant_request_idx"
  ON "hr"."recruitment_candidate"("tenant_id", "request_id");
CREATE INDEX "recruitment_candidate_status_idx"
  ON "hr"."recruitment_candidate"("status");
