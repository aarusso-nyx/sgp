-- Saude / pericia canonical runtime tables.
-- tenant coverage markers: ('hr', 'medical_appointment'), ('hr', 'medical_record'), ('hr', 'medical_leave'), ('hr', 'work_accident')

CREATE TYPE "MedicalAppointmentStatus" AS ENUM (
  'SCHEDULED',
  'ATTENDED',
  'NO_SHOW',
  'CANCELED'
);

CREATE TYPE "MedicalReportStatus" AS ENUM (
  'PENDING_SUBMISSION',
  'APPROVED',
  'REJECTED'
);

CREATE TABLE "hr"."medical_appointment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "employee_id" UUID NOT NULL,
  "specialty_ref" TEXT,
  "schedule_ref" TEXT,
  "slot_ref" TEXT NOT NULL,
  "scheduled_on" DATE NOT NULL,
  "scheduled_time" TEXT NOT NULL,
  "contact_phone" TEXT,
  "instructor_attachment" JSONB NOT NULL DEFAULT '{}',
  "status" "MedicalAppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
  "attended_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "medical_appointment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_medical_appointment_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "medical_appointment_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr"."employee"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "hr"."medical_record" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "appointment_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "physician_ref" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "current_illness_story" TEXT NOT NULL DEFAULT '',
  "physical_exam" TEXT NOT NULL DEFAULT '',
  "diagnosis" TEXT NOT NULL DEFAULT '',
  "expert_action" TEXT NOT NULL DEFAULT '',
  "report_type" TEXT NOT NULL DEFAULT '',
  "report_status" "MedicalReportStatus" NOT NULL DEFAULT 'PENDING_SUBMISSION',
  "primary_icd_ref" TEXT,
  "multidisciplinary_team" JSONB NOT NULL DEFAULT '[]',
  "approved_by_ref" TEXT,
  "approved_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "medical_record_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_medical_record_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "medical_record_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "hr"."medical_appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "medical_record_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr"."employee"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "hr"."medical_leave" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "medical_record_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "evaluation_type" TEXT NOT NULL,
  "social_security_benefit" TEXT,
  "absence_reason_id" UUID,
  "icd_ref" TEXT,
  "granted_days" INTEGER NOT NULL,
  "starts_on" DATE NOT NULL,
  "ends_on" DATE NOT NULL,
  "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "medical_leave_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_medical_leave_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "medical_leave_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "hr"."medical_record"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "medical_leave_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr"."employee"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "medical_leave_absence_reason_id_fkey" FOREIGN KEY ("absence_reason_id") REFERENCES "hr"."absence_reason"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "hr"."work_accident" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL DEFAULT public.sgp_current_tenant_uuid(),
  "employee_id" UUID NOT NULL,
  "medical_leave_id" UUID,
  "icd_ref" TEXT,
  "occurred_on" DATE,
  "leave_days" INTEGER,
  "notes" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "work_accident_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hr_work_accident_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id"),
  CONSTRAINT "work_accident_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr"."employee"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "work_accident_medical_leave_id_fkey" FOREIGN KEY ("medical_leave_id") REFERENCES "hr"."medical_leave"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "medical_appointment_tenant_slot_ref_key"
  ON "hr"."medical_appointment"("tenant_id", "slot_ref");
CREATE INDEX "medical_appointment_employee_id_scheduled_on_idx"
  ON "hr"."medical_appointment"("employee_id", "scheduled_on");
CREATE INDEX "medical_appointment_status_idx"
  ON "hr"."medical_appointment"("status");

CREATE INDEX "medical_record_appointment_id_idx"
  ON "hr"."medical_record"("appointment_id");
CREATE INDEX "medical_record_employee_id_created_at_idx"
  ON "hr"."medical_record"("employee_id", "created_at" DESC);
CREATE INDEX "medical_record_report_status_idx"
  ON "hr"."medical_record"("report_status");

CREATE INDEX "medical_leave_medical_record_id_idx"
  ON "hr"."medical_leave"("medical_record_id");
CREATE INDEX "medical_leave_employee_id_starts_on_idx"
  ON "hr"."medical_leave"("employee_id", "starts_on");
CREATE INDEX "medical_leave_absence_reason_id_idx"
  ON "hr"."medical_leave"("absence_reason_id");
CREATE INDEX "medical_leave_status_idx"
  ON "hr"."medical_leave"("status");

CREATE INDEX "work_accident_employee_id_occurred_on_idx"
  ON "hr"."work_accident"("employee_id", "occurred_on");
CREATE INDEX "work_accident_medical_leave_id_idx"
  ON "hr"."work_accident"("medical_leave_id");
