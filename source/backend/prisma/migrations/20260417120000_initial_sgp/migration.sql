-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LOCKED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'IMPORT', 'EXPORT', 'GENERATE', 'PROCESS', 'APPROVE', 'REJECT', 'DOWNLOAD');

-- CreateEnum
CREATE TYPE "BranchType" AS ENUM ('HEADQUARTERS', 'BRANCH', 'DEPARTMENT', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "PersonGender" AS ENUM ('FEMALE', 'MALE', 'OTHER', 'UNDECLARED');

-- CreateEnum
CREATE TYPE "EmployeeLifecycleStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'RETIRED', 'INTERN');

-- CreateEnum
CREATE TYPE "PayrollRunStatus" AS ENUM ('DRAFT', 'QUEUED', 'PROCESSING', 'GENERATED', 'APPROVED', 'PAID', 'CANCELED', 'FAILED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PayrollEntryKind" AS ENUM ('EARNING', 'DEDUCTION', 'INFORMATION', 'BASE');

-- CreateEnum
CREATE TYPE "PayrollEntrySource" AS ENUM ('MANUAL', 'IMPORTED', 'CALCULATED', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PaymentRemittanceStatus" AS ENUM ('DRAFT', 'GENERATED', 'SENT', 'PAID', 'REJECTED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ReportRequestStatus" AS ENUM ('REQUESTED', 'RUNNING', 'COMPLETED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DocumentStorageKind" AS ENUM ('LOCAL', 'S3', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "AgreementStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'TERMINATED');

-- CreateTable
CREATE TABLE "user_account" (
    "id" UUID NOT NULL,
    "cognito_sub" TEXT,
    "login" TEXT NOT NULL,
    "cpf" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMPTZ(6),
    "password_changed_at" TIMESTAMPTZ(6),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivated_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_profile" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_assignment" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "module_key" TEXT NOT NULL,
    "resource_key" TEXT NOT NULL,
    "action_key" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "route_pattern" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_permission" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_group_snapshot" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'cognito',
    "group_key" TEXT NOT NULL,
    "captured_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "raw_claims" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "user_group_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item" (
    "id" UUID NOT NULL,
    "parent_id" UUID,
    "profile_id" UUID,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "route" TEXT,
    "module_key" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_event" (
    "id" UUID NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_user_id" UUID,
    "actor_sub" TEXT,
    "actor_login" TEXT,
    "action" "AuditAction" NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "table_name" TEXT,
    "request_id" TEXT,
    "ip_address" INET,
    "user_agent" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "audit_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "trade_name" TEXT,
    "cnpj" TEXT,
    "legal_nature_id" UUID,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branch" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "acronym" TEXT,
    "name" TEXT NOT NULL,
    "cnpj" TEXT,
    "branch_type" "BranchType" NOT NULL DEFAULT 'BRANCH',
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_location" (
    "id" UUID NOT NULL,
    "branch_id" UUID,
    "parent_id" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_center" (
    "id" UUID NOT NULL,
    "branch_id" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_center_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_responsible" (
    "id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" TEXT,
    "role_title" TEXT NOT NULL,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_responsible_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_position" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_function" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "nature_id" UUID,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_function_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "function_nature" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "function_nature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_range" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "group_code" TEXT,
    "class_code" TEXT,
    "name" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_range_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_reference" (
    "id" UUID NOT NULL,
    "range_id" UUID,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_reference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "functional_status" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "modality" TEXT,
    "kind" TEXT,
    "enters_payroll" BOOLEAN NOT NULL DEFAULT false,
    "lifecycle_status" "EmployeeLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "functional_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment_link" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employment_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_type" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_type" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_type" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "payroll_type_id" UUID,
    "employment_link_id" UUID,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processing_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reason" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "event_key" TEXT,
    "kind" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absence_reason" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "absence_reason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "termination_reason" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "termination_reason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_type" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacation_type" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vacation_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "schedule" TEXT,
    "daily_hours" DECIMAL(5,2),
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "union_entity" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cnpj" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "union_entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "agency_digit" TEXT,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_nature" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "group_name" TEXT,
    "name" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_nature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legislation" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "norm_number" TEXT NOT NULL,
    "norm_year" INTEGER NOT NULL,
    "norm_type" TEXT NOT NULL,
    "federated_entity" TEXT,
    "detail" TEXT NOT NULL DEFAULT '',
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legislation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "act_classification" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "act_classification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transit_benefit" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unit_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transit_benefit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_parameter" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "module_key" TEXT,
    "updated_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_parameter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee" (
    "id" UUID NOT NULL,
    "registration" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "social_name" TEXT,
    "cpf" TEXT,
    "birth_date" DATE,
    "gender" "PersonGender" NOT NULL DEFAULT 'UNDECLARED',
    "email" TEXT,
    "phone" TEXT,
    "branch_id" UUID,
    "work_location_id" UUID,
    "cost_center_id" UUID,
    "job_position_id" UUID,
    "job_function_id" UUID,
    "salary_reference_id" UUID,
    "functional_status_id" UUID,
    "employment_link_id" UUID,
    "contract_type_id" UUID,
    "shift_id" UUID,
    "union_id" UUID,
    "bank_id" UUID,
    "bank_agency" TEXT,
    "bank_account" TEXT,
    "hired_on" DATE,
    "terminated_on" DATE,
    "termination_reason_id" UUID,
    "lifecycle_status" "EmployeeLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_dependent" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" TEXT,
    "birth_date" DATE,
    "relationship" TEXT NOT NULL,
    "income_tax_dependent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_dependent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_status_history" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "functional_status_id" UUID NOT NULL,
    "reason_id" UUID,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE,
    "notes" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_experience" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "employer" TEXT NOT NULL,
    "role_title" TEXT,
    "starts_on" DATE,
    "ends_on" DATE,
    "description" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professional_experience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_transfer" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "from_branch_id" UUID,
    "to_branch_id" UUID,
    "to_work_location_id" UUID,
    "reason_id" UUID,
    "effective_on" DATE NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_frequency" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER,
    "absence_days" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "worked_days" DECIMAL(8,2),
    "notes" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_frequency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_time_record" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE,
    "days_count" INTEGER,
    "notes" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_time_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacation_record" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "vacation_type_id" UUID,
    "accrual_start_on" DATE,
    "accrual_end_on" DATE,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE NOT NULL,
    "days" INTEGER NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vacation_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_record" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "absence_reason_id" UUID,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE,
    "days" INTEGER,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_complement_data" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "rg" TEXT,
    "rg_issuer" TEXT,
    "pis_pasep" TEXT,
    "voter_registration" TEXT,
    "address" JSONB NOT NULL DEFAULT '{}',
    "emergency_contact" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_complement_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_level_history" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "salary_reference_id" UUID,
    "level_code" TEXT,
    "level_description" TEXT,
    "adjustment_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "effective_on" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_level_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_run" (
    "id" UUID NOT NULL,
    "competence_year" INTEGER NOT NULL,
    "competence_month" INTEGER NOT NULL,
    "branch_id" UUID,
    "payroll_type_id" UUID NOT NULL,
    "processing_type_id" UUID NOT NULL,
    "status" "PayrollRunStatus" NOT NULL DEFAULT 'DRAFT',
    "employee_count" INTEGER NOT NULL DEFAULT 0,
    "total_earnings" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "total_deductions" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "total_net" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ(6),

    CONSTRAINT "payroll_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_run_status_history" (
    "id" UUID NOT NULL,
    "payroll_run_id" UUID NOT NULL,
    "status" "PayrollRunStatus" NOT NULL,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by_user_id" UUID,
    "note" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "payroll_run_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_earning_deduction" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "kind" "PayrollEntryKind" NOT NULL,
    "taxable" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_earning_deduction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_payroll_item" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "payroll_run_id" UUID,
    "earning_deduction_id" UUID NOT NULL,
    "source" "PayrollEntrySource" NOT NULL DEFAULT 'MANUAL',
    "competence_year" INTEGER NOT NULL,
    "competence_month" INTEGER NOT NULL,
    "quantity" DECIMAL(12,4),
    "reference_value" DECIMAL(14,2),
    "amount" DECIMAL(14,2) NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_payroll_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_financial_record" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "payroll_run_id" UUID,
    "branch_id" UUID,
    "work_location_id" UUID,
    "functional_status_id" UUID,
    "competence_year" INTEGER NOT NULL,
    "competence_month" INTEGER NOT NULL,
    "total_earnings" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "total_deductions" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "payroll_financial_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_remittance_file" (
    "id" UUID NOT NULL,
    "payroll_run_id" UUID,
    "branch_id" UUID,
    "processing_type_id" UUID,
    "reason_id" UUID,
    "status" "PaymentRemittanceStatus" NOT NULL DEFAULT 'DRAFT',
    "competence_year" INTEGER NOT NULL,
    "competence_month" INTEGER NOT NULL,
    "created_by_user_id" UUID,
    "payment_date" DATE,
    "file_name" TEXT,
    "file_hash" TEXT,
    "total_amount" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_remittance_file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_payment" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "payroll_run_id" UUID,
    "branch_id" UUID,
    "functional_status_id" UUID,
    "reason_id" UUID,
    "competence_year" INTEGER NOT NULL,
    "competence_month" INTEGER NOT NULL,
    "blocked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMPTZ(6),
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "blocked_payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_attachment" (
    "id" UUID NOT NULL,
    "document_type_id" UUID,
    "owner_type" TEXT NOT NULL,
    "owner_id" TEXT,
    "storage_kind" "DocumentStorageKind" NOT NULL DEFAULT 'LOCAL',
    "file_name" TEXT NOT NULL,
    "content_type" TEXT,
    "size_bytes" INTEGER,
    "checksum" TEXT,
    "storage_key" TEXT NOT NULL,
    "public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_definition" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "module_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_request" (
    "id" UUID NOT NULL,
    "definition_id" UUID NOT NULL,
    "requested_by_user_id" UUID,
    "branch_id" UUID,
    "payroll_run_id" UUID,
    "processing_type_id" UUID,
    "competence_year" INTEGER,
    "competence_month" INTEGER,
    "status" "ReportRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "parameters" JSONB NOT NULL DEFAULT '{}',
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "error_message" TEXT,

    CONSTRAINT "report_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_report_file" (
    "id" UUID NOT NULL,
    "report_request_id" UUID NOT NULL,
    "attachment_id" UUID NOT NULL,
    "format" TEXT NOT NULL,
    "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_report_file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_download_audit" (
    "id" UUID NOT NULL,
    "attachment_id" UUID NOT NULL,
    "user_id" UUID,
    "downloaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "request_id" TEXT,
    "ip_address" INET,

    CONSTRAINT "document_download_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education_institution" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" TEXT,
    "address" JSONB NOT NULL DEFAULT '{}',
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "education_institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internship_program" (
    "id" UUID NOT NULL,
    "institution_id" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "starts_on" DATE,
    "ends_on" DATE,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internship_program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agreement" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "institution_id" UUID,
    "program_id" UUID,
    "description" TEXT NOT NULL DEFAULT '',
    "starts_on" DATE,
    "ends_on" DATE,
    "status" "AgreementStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internship_record" (
    "id" UUID NOT NULL,
    "agreement_id" UUID,
    "program_id" UUID,
    "employee_id" UUID,
    "intern_name" TEXT NOT NULL,
    "intern_cpf" TEXT,
    "supervisor_name" TEXT,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE,
    "stipend_amount" DECIMAL(12,2),
    "status" "AgreementStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internship_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "module_key" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_account_cognito_sub_key" ON "user_account"("cognito_sub");

-- CreateIndex
CREATE UNIQUE INDEX "user_account_login_key" ON "user_account"("login");

-- CreateIndex
CREATE UNIQUE INDEX "user_account_cpf_key" ON "user_account"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "user_account_email_key" ON "user_account"("email");

-- CreateIndex
CREATE INDEX "user_account_status_idx" ON "user_account"("status");

-- CreateIndex
CREATE INDEX "user_account_cpf_idx" ON "user_account"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "access_profile_code_key" ON "access_profile"("code");

-- CreateIndex
CREATE INDEX "access_profile_status_idx" ON "access_profile"("status");

-- CreateIndex
CREATE INDEX "profile_assignment_profile_id_idx" ON "profile_assignment"("profile_id");

-- CreateIndex
CREATE INDEX "profile_assignment_ends_at_idx" ON "profile_assignment"("ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "profile_assignment_user_id_profile_id_starts_at_key" ON "profile_assignment"("user_id", "profile_id", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "permission_key_key" ON "permission"("key");

-- CreateIndex
CREATE INDEX "permission_module_key_idx" ON "permission"("module_key");

-- CreateIndex
CREATE INDEX "permission_resource_key_idx" ON "permission"("resource_key");

-- CreateIndex
CREATE UNIQUE INDEX "permission_module_key_resource_key_action_key_key" ON "permission"("module_key", "resource_key", "action_key");

-- CreateIndex
CREATE INDEX "profile_permission_permission_id_idx" ON "profile_permission"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "profile_permission_profile_id_permission_id_key" ON "profile_permission"("profile_id", "permission_id");

-- CreateIndex
CREATE INDEX "user_group_snapshot_user_id_captured_at_idx" ON "user_group_snapshot"("user_id", "captured_at");

-- CreateIndex
CREATE INDEX "user_group_snapshot_group_key_idx" ON "user_group_snapshot"("group_key");

-- CreateIndex
CREATE UNIQUE INDEX "menu_item_code_key" ON "menu_item"("code");

-- CreateIndex
CREATE INDEX "menu_item_parent_id_idx" ON "menu_item"("parent_id");

-- CreateIndex
CREATE INDEX "menu_item_module_key_status_idx" ON "menu_item"("module_key", "status");

-- CreateIndex
CREATE INDEX "menu_item_profile_id_idx" ON "menu_item"("profile_id");

-- CreateIndex
CREATE INDEX "audit_event_occurred_at_idx" ON "audit_event"("occurred_at");

-- CreateIndex
CREATE INDEX "audit_event_actor_user_id_occurred_at_idx" ON "audit_event"("actor_user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_event_actor_login_idx" ON "audit_event"("actor_login");

-- CreateIndex
CREATE INDEX "audit_event_resource_type_resource_id_idx" ON "audit_event"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "audit_event_request_id_idx" ON "audit_event"("request_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_code_key" ON "company"("code");

-- CreateIndex
CREATE UNIQUE INDEX "company_cnpj_key" ON "company"("cnpj");

-- CreateIndex
CREATE INDEX "company_status_idx" ON "company"("status");

-- CreateIndex
CREATE INDEX "company_legal_nature_id_idx" ON "company"("legal_nature_id");

-- CreateIndex
CREATE UNIQUE INDEX "branch_code_key" ON "branch"("code");

-- CreateIndex
CREATE UNIQUE INDEX "branch_cnpj_key" ON "branch"("cnpj");

-- CreateIndex
CREATE INDEX "branch_company_id_idx" ON "branch"("company_id");

-- CreateIndex
CREATE INDEX "branch_status_idx" ON "branch"("status");

-- CreateIndex
CREATE UNIQUE INDEX "work_location_code_key" ON "work_location"("code");

-- CreateIndex
CREATE INDEX "work_location_branch_id_idx" ON "work_location"("branch_id");

-- CreateIndex
CREATE INDEX "work_location_parent_id_idx" ON "work_location"("parent_id");

-- CreateIndex
CREATE INDEX "work_location_status_idx" ON "work_location"("status");

-- CreateIndex
CREATE UNIQUE INDEX "cost_center_code_key" ON "cost_center"("code");

-- CreateIndex
CREATE INDEX "cost_center_branch_id_idx" ON "cost_center"("branch_id");

-- CreateIndex
CREATE INDEX "cost_center_status_idx" ON "cost_center"("status");

-- CreateIndex
CREATE INDEX "legal_responsible_branch_id_status_idx" ON "legal_responsible"("branch_id", "status");

-- CreateIndex
CREATE INDEX "legal_responsible_cpf_idx" ON "legal_responsible"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "job_position_code_key" ON "job_position"("code");

-- CreateIndex
CREATE INDEX "job_position_status_idx" ON "job_position"("status");

-- CreateIndex
CREATE UNIQUE INDEX "job_function_code_key" ON "job_function"("code");

-- CreateIndex
CREATE INDEX "job_function_nature_id_idx" ON "job_function"("nature_id");

-- CreateIndex
CREATE INDEX "job_function_status_idx" ON "job_function"("status");

-- CreateIndex
CREATE UNIQUE INDEX "function_nature_code_key" ON "function_nature"("code");

-- CreateIndex
CREATE INDEX "function_nature_status_idx" ON "function_nature"("status");

-- CreateIndex
CREATE UNIQUE INDEX "salary_range_code_key" ON "salary_range"("code");

-- CreateIndex
CREATE INDEX "salary_range_group_code_class_code_idx" ON "salary_range"("group_code", "class_code");

-- CreateIndex
CREATE INDEX "salary_range_status_idx" ON "salary_range"("status");

-- CreateIndex
CREATE UNIQUE INDEX "salary_reference_code_key" ON "salary_reference"("code");

-- CreateIndex
CREATE INDEX "salary_reference_range_id_idx" ON "salary_reference"("range_id");

-- CreateIndex
CREATE INDEX "salary_reference_status_idx" ON "salary_reference"("status");

-- CreateIndex
CREATE UNIQUE INDEX "functional_status_code_key" ON "functional_status"("code");

-- CreateIndex
CREATE INDEX "functional_status_enters_payroll_idx" ON "functional_status"("enters_payroll");

-- CreateIndex
CREATE INDEX "functional_status_status_idx" ON "functional_status"("status");

-- CreateIndex
CREATE UNIQUE INDEX "employment_link_code_key" ON "employment_link"("code");

-- CreateIndex
CREATE INDEX "employment_link_status_idx" ON "employment_link"("status");

-- CreateIndex
CREATE UNIQUE INDEX "contract_type_code_key" ON "contract_type"("code");

-- CreateIndex
CREATE INDEX "contract_type_status_idx" ON "contract_type"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_type_code_key" ON "payroll_type"("code");

-- CreateIndex
CREATE INDEX "payroll_type_status_idx" ON "payroll_type"("status");

-- CreateIndex
CREATE UNIQUE INDEX "processing_type_code_key" ON "processing_type"("code");

-- CreateIndex
CREATE INDEX "processing_type_payroll_type_id_idx" ON "processing_type"("payroll_type_id");

-- CreateIndex
CREATE INDEX "processing_type_employment_link_id_idx" ON "processing_type"("employment_link_id");

-- CreateIndex
CREATE INDEX "processing_type_status_idx" ON "processing_type"("status");

-- CreateIndex
CREATE UNIQUE INDEX "reason_code_key" ON "reason"("code");

-- CreateIndex
CREATE INDEX "reason_kind_status_idx" ON "reason"("kind", "status");

-- CreateIndex
CREATE UNIQUE INDEX "absence_reason_code_key" ON "absence_reason"("code");

-- CreateIndex
CREATE INDEX "absence_reason_status_idx" ON "absence_reason"("status");

-- CreateIndex
CREATE UNIQUE INDEX "termination_reason_code_key" ON "termination_reason"("code");

-- CreateIndex
CREATE INDEX "termination_reason_status_idx" ON "termination_reason"("status");

-- CreateIndex
CREATE UNIQUE INDEX "document_type_code_key" ON "document_type"("code");

-- CreateIndex
CREATE INDEX "document_type_status_idx" ON "document_type"("status");

-- CreateIndex
CREATE UNIQUE INDEX "vacation_type_code_key" ON "vacation_type"("code");

-- CreateIndex
CREATE INDEX "vacation_type_status_idx" ON "vacation_type"("status");

-- CreateIndex
CREATE UNIQUE INDEX "shift_code_key" ON "shift"("code");

-- CreateIndex
CREATE INDEX "shift_status_idx" ON "shift"("status");

-- CreateIndex
CREATE UNIQUE INDEX "union_entity_code_key" ON "union_entity"("code");

-- CreateIndex
CREATE UNIQUE INDEX "union_entity_cnpj_key" ON "union_entity"("cnpj");

-- CreateIndex
CREATE INDEX "union_entity_status_idx" ON "union_entity"("status");

-- CreateIndex
CREATE UNIQUE INDEX "bank_code_key" ON "bank"("code");

-- CreateIndex
CREATE INDEX "bank_blocked_idx" ON "bank"("blocked");

-- CreateIndex
CREATE INDEX "bank_status_idx" ON "bank"("status");

-- CreateIndex
CREATE UNIQUE INDEX "legal_nature_code_key" ON "legal_nature"("code");

-- CreateIndex
CREATE INDEX "legal_nature_status_idx" ON "legal_nature"("status");

-- CreateIndex
CREATE UNIQUE INDEX "legislation_code_key" ON "legislation"("code");

-- CreateIndex
CREATE INDEX "legislation_norm_year_idx" ON "legislation"("norm_year");

-- CreateIndex
CREATE INDEX "legislation_norm_type_idx" ON "legislation"("norm_type");

-- CreateIndex
CREATE UNIQUE INDEX "act_classification_code_key" ON "act_classification"("code");

-- CreateIndex
CREATE INDEX "act_classification_status_idx" ON "act_classification"("status");

-- CreateIndex
CREATE UNIQUE INDEX "transit_benefit_code_key" ON "transit_benefit"("code");

-- CreateIndex
CREATE INDEX "transit_benefit_status_idx" ON "transit_benefit"("status");

-- CreateIndex
CREATE UNIQUE INDEX "system_parameter_key_key" ON "system_parameter"("key");

-- CreateIndex
CREATE INDEX "system_parameter_module_key_idx" ON "system_parameter"("module_key");

-- CreateIndex
CREATE INDEX "system_parameter_updated_by_user_id_idx" ON "system_parameter"("updated_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_registration_key" ON "employee"("registration");

-- CreateIndex
CREATE UNIQUE INDEX "employee_cpf_key" ON "employee"("cpf");

-- CreateIndex
CREATE INDEX "employee_name_idx" ON "employee"("name");

-- CreateIndex
CREATE INDEX "employee_branch_id_idx" ON "employee"("branch_id");

-- CreateIndex
CREATE INDEX "employee_work_location_id_idx" ON "employee"("work_location_id");

-- CreateIndex
CREATE INDEX "employee_cost_center_id_idx" ON "employee"("cost_center_id");

-- CreateIndex
CREATE INDEX "employee_job_position_id_idx" ON "employee"("job_position_id");

-- CreateIndex
CREATE INDEX "employee_job_function_id_idx" ON "employee"("job_function_id");

-- CreateIndex
CREATE INDEX "employee_salary_reference_id_idx" ON "employee"("salary_reference_id");

-- CreateIndex
CREATE INDEX "employee_functional_status_id_idx" ON "employee"("functional_status_id");

-- CreateIndex
CREATE INDEX "employee_employment_link_id_idx" ON "employee"("employment_link_id");

-- CreateIndex
CREATE INDEX "employee_contract_type_id_idx" ON "employee"("contract_type_id");

-- CreateIndex
CREATE INDEX "employee_shift_id_idx" ON "employee"("shift_id");

-- CreateIndex
CREATE INDEX "employee_union_id_idx" ON "employee"("union_id");

-- CreateIndex
CREATE INDEX "employee_bank_id_idx" ON "employee"("bank_id");

-- CreateIndex
CREATE INDEX "employee_termination_reason_id_idx" ON "employee"("termination_reason_id");

-- CreateIndex
CREATE INDEX "employee_lifecycle_status_idx" ON "employee"("lifecycle_status");

-- CreateIndex
CREATE INDEX "employee_dependent_employee_id_idx" ON "employee_dependent"("employee_id");

-- CreateIndex
CREATE INDEX "employee_dependent_cpf_idx" ON "employee_dependent"("cpf");

-- CreateIndex
CREATE INDEX "employee_status_history_employee_id_starts_on_idx" ON "employee_status_history"("employee_id", "starts_on");

-- CreateIndex
CREATE INDEX "employee_status_history_functional_status_id_idx" ON "employee_status_history"("functional_status_id");

-- CreateIndex
CREATE INDEX "employee_status_history_reason_id_idx" ON "employee_status_history"("reason_id");

-- CreateIndex
CREATE INDEX "professional_experience_employee_id_idx" ON "professional_experience"("employee_id");

-- CreateIndex
CREATE INDEX "employee_transfer_employee_id_effective_on_idx" ON "employee_transfer"("employee_id", "effective_on");

-- CreateIndex
CREATE INDEX "employee_transfer_from_branch_id_idx" ON "employee_transfer"("from_branch_id");

-- CreateIndex
CREATE INDEX "employee_transfer_to_branch_id_idx" ON "employee_transfer"("to_branch_id");

-- CreateIndex
CREATE INDEX "employee_transfer_to_work_location_id_idx" ON "employee_transfer"("to_work_location_id");

-- CreateIndex
CREATE INDEX "employee_transfer_reason_id_idx" ON "employee_transfer"("reason_id");

-- CreateIndex
CREATE INDEX "employee_frequency_year_month_idx" ON "employee_frequency"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "employee_frequency_employee_id_year_month_key" ON "employee_frequency"("employee_id", "year", "month");

-- CreateIndex
CREATE INDEX "service_time_record_employee_id_starts_on_idx" ON "service_time_record"("employee_id", "starts_on");

-- CreateIndex
CREATE INDEX "vacation_record_employee_id_starts_on_idx" ON "vacation_record"("employee_id", "starts_on");

-- CreateIndex
CREATE INDEX "vacation_record_vacation_type_id_idx" ON "vacation_record"("vacation_type_id");

-- CreateIndex
CREATE INDEX "vacation_record_status_idx" ON "vacation_record"("status");

-- CreateIndex
CREATE INDEX "leave_record_employee_id_starts_on_idx" ON "leave_record"("employee_id", "starts_on");

-- CreateIndex
CREATE INDEX "leave_record_absence_reason_id_idx" ON "leave_record"("absence_reason_id");

-- CreateIndex
CREATE INDEX "leave_record_status_idx" ON "leave_record"("status");

-- CreateIndex
CREATE UNIQUE INDEX "employee_complement_data_employee_id_key" ON "employee_complement_data"("employee_id");

-- CreateIndex
CREATE INDEX "salary_level_history_employee_id_effective_on_idx" ON "salary_level_history"("employee_id", "effective_on");

-- CreateIndex
CREATE INDEX "salary_level_history_salary_reference_id_idx" ON "salary_level_history"("salary_reference_id");

-- CreateIndex
CREATE INDEX "payroll_run_competence_year_competence_month_idx" ON "payroll_run"("competence_year", "competence_month");

-- CreateIndex
CREATE INDEX "payroll_run_branch_id_idx" ON "payroll_run"("branch_id");

-- CreateIndex
CREATE INDEX "payroll_run_status_idx" ON "payroll_run"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_run_competence_year_competence_month_branch_id_payr_key" ON "payroll_run"("competence_year", "competence_month", "branch_id", "payroll_type_id", "processing_type_id");

-- CreateIndex
CREATE INDEX "payroll_run_status_history_payroll_run_id_changed_at_idx" ON "payroll_run_status_history"("payroll_run_id", "changed_at");

-- CreateIndex
CREATE INDEX "payroll_run_status_history_status_idx" ON "payroll_run_status_history"("status");

-- CreateIndex
CREATE INDEX "payroll_run_status_history_changed_by_user_id_idx" ON "payroll_run_status_history"("changed_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_earning_deduction_code_key" ON "payroll_earning_deduction"("code");

-- CreateIndex
CREATE INDEX "payroll_earning_deduction_kind_idx" ON "payroll_earning_deduction"("kind");

-- CreateIndex
CREATE INDEX "payroll_earning_deduction_active_idx" ON "payroll_earning_deduction"("active");

-- CreateIndex
CREATE INDEX "employee_payroll_item_employee_id_competence_year_competenc_idx" ON "employee_payroll_item"("employee_id", "competence_year", "competence_month");

-- CreateIndex
CREATE INDEX "employee_payroll_item_payroll_run_id_idx" ON "employee_payroll_item"("payroll_run_id");

-- CreateIndex
CREATE INDEX "employee_payroll_item_earning_deduction_id_idx" ON "employee_payroll_item"("earning_deduction_id");

-- CreateIndex
CREATE INDEX "payroll_financial_record_competence_year_competence_month_idx" ON "payroll_financial_record"("competence_year", "competence_month");

-- CreateIndex
CREATE INDEX "payroll_financial_record_branch_id_idx" ON "payroll_financial_record"("branch_id");

-- CreateIndex
CREATE INDEX "payroll_financial_record_payroll_run_id_idx" ON "payroll_financial_record"("payroll_run_id");

-- CreateIndex
CREATE INDEX "payroll_financial_record_work_location_id_idx" ON "payroll_financial_record"("work_location_id");

-- CreateIndex
CREATE INDEX "payroll_financial_record_functional_status_id_idx" ON "payroll_financial_record"("functional_status_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_financial_record_employee_id_competence_year_compet_key" ON "payroll_financial_record"("employee_id", "competence_year", "competence_month", "payroll_run_id");

-- CreateIndex
CREATE INDEX "payment_remittance_file_competence_year_competence_month_idx" ON "payment_remittance_file"("competence_year", "competence_month");

-- CreateIndex
CREATE INDEX "payment_remittance_file_status_idx" ON "payment_remittance_file"("status");

-- CreateIndex
CREATE INDEX "payment_remittance_file_branch_id_idx" ON "payment_remittance_file"("branch_id");

-- CreateIndex
CREATE INDEX "payment_remittance_file_payroll_run_id_idx" ON "payment_remittance_file"("payroll_run_id");

-- CreateIndex
CREATE INDEX "payment_remittance_file_processing_type_id_idx" ON "payment_remittance_file"("processing_type_id");

-- CreateIndex
CREATE INDEX "payment_remittance_file_reason_id_idx" ON "payment_remittance_file"("reason_id");

-- CreateIndex
CREATE INDEX "blocked_payment_employee_id_idx" ON "blocked_payment"("employee_id");

-- CreateIndex
CREATE INDEX "blocked_payment_competence_year_competence_month_idx" ON "blocked_payment"("competence_year", "competence_month");

-- CreateIndex
CREATE INDEX "blocked_payment_branch_id_idx" ON "blocked_payment"("branch_id");

-- CreateIndex
CREATE INDEX "blocked_payment_payroll_run_id_idx" ON "blocked_payment"("payroll_run_id");

-- CreateIndex
CREATE INDEX "blocked_payment_functional_status_id_idx" ON "blocked_payment"("functional_status_id");

-- CreateIndex
CREATE INDEX "blocked_payment_reason_id_idx" ON "blocked_payment"("reason_id");

-- CreateIndex
CREATE INDEX "blocked_payment_released_at_idx" ON "blocked_payment"("released_at");

-- CreateIndex
CREATE INDEX "document_attachment_owner_type_owner_id_idx" ON "document_attachment"("owner_type", "owner_id");

-- CreateIndex
CREATE INDEX "document_attachment_document_type_id_idx" ON "document_attachment"("document_type_id");

-- CreateIndex
CREATE INDEX "document_attachment_storage_kind_idx" ON "document_attachment"("storage_kind");

-- CreateIndex
CREATE UNIQUE INDEX "report_definition_code_key" ON "report_definition"("code");

-- CreateIndex
CREATE INDEX "report_definition_module_key_status_idx" ON "report_definition"("module_key", "status");

-- CreateIndex
CREATE INDEX "report_request_definition_id_requested_at_idx" ON "report_request"("definition_id", "requested_at");

-- CreateIndex
CREATE INDEX "report_request_requested_by_user_id_idx" ON "report_request"("requested_by_user_id");

-- CreateIndex
CREATE INDEX "report_request_branch_id_idx" ON "report_request"("branch_id");

-- CreateIndex
CREATE INDEX "report_request_payroll_run_id_idx" ON "report_request"("payroll_run_id");

-- CreateIndex
CREATE INDEX "report_request_processing_type_id_idx" ON "report_request"("processing_type_id");

-- CreateIndex
CREATE INDEX "report_request_status_idx" ON "report_request"("status");

-- CreateIndex
CREATE INDEX "report_request_competence_year_competence_month_idx" ON "report_request"("competence_year", "competence_month");

-- CreateIndex
CREATE INDEX "generated_report_file_report_request_id_idx" ON "generated_report_file"("report_request_id");

-- CreateIndex
CREATE INDEX "generated_report_file_attachment_id_idx" ON "generated_report_file"("attachment_id");

-- CreateIndex
CREATE INDEX "document_download_audit_attachment_id_downloaded_at_idx" ON "document_download_audit"("attachment_id", "downloaded_at");

-- CreateIndex
CREATE INDEX "document_download_audit_user_id_downloaded_at_idx" ON "document_download_audit"("user_id", "downloaded_at");

-- CreateIndex
CREATE UNIQUE INDEX "education_institution_code_key" ON "education_institution"("code");

-- CreateIndex
CREATE UNIQUE INDEX "education_institution_cnpj_key" ON "education_institution"("cnpj");

-- CreateIndex
CREATE INDEX "education_institution_status_idx" ON "education_institution"("status");

-- CreateIndex
CREATE UNIQUE INDEX "internship_program_code_key" ON "internship_program"("code");

-- CreateIndex
CREATE INDEX "internship_program_institution_id_idx" ON "internship_program"("institution_id");

-- CreateIndex
CREATE INDEX "internship_program_status_idx" ON "internship_program"("status");

-- CreateIndex
CREATE UNIQUE INDEX "agreement_code_key" ON "agreement"("code");

-- CreateIndex
CREATE INDEX "agreement_institution_id_idx" ON "agreement"("institution_id");

-- CreateIndex
CREATE INDEX "agreement_program_id_idx" ON "agreement"("program_id");

-- CreateIndex
CREATE INDEX "agreement_status_idx" ON "agreement"("status");

-- CreateIndex
CREATE INDEX "internship_record_agreement_id_idx" ON "internship_record"("agreement_id");

-- CreateIndex
CREATE INDEX "internship_record_program_id_idx" ON "internship_record"("program_id");

-- CreateIndex
CREATE INDEX "internship_record_employee_id_idx" ON "internship_record"("employee_id");

-- CreateIndex
CREATE INDEX "internship_record_intern_cpf_idx" ON "internship_record"("intern_cpf");

-- CreateIndex
CREATE INDEX "internship_record_status_idx" ON "internship_record"("status");

-- CreateIndex
CREATE INDEX "notification_user_id_read_at_idx" ON "notification"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "notification_module_key_idx" ON "notification"("module_key");

-- AddForeignKey
ALTER TABLE "profile_assignment" ADD CONSTRAINT "profile_assignment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_assignment" ADD CONSTRAINT "profile_assignment_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "access_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_permission" ADD CONSTRAINT "profile_permission_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "access_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_permission" ADD CONSTRAINT "profile_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_group_snapshot" ADD CONSTRAINT "user_group_snapshot_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item" ADD CONSTRAINT "menu_item_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "menu_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item" ADD CONSTRAINT "menu_item_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "access_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "user_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company" ADD CONSTRAINT "company_legal_nature_id_fkey" FOREIGN KEY ("legal_nature_id") REFERENCES "legal_nature"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch" ADD CONSTRAINT "branch_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_location" ADD CONSTRAINT "work_location_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_location" ADD CONSTRAINT "work_location_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "work_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_center" ADD CONSTRAINT "cost_center_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_responsible" ADD CONSTRAINT "legal_responsible_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_function" ADD CONSTRAINT "job_function_nature_id_fkey" FOREIGN KEY ("nature_id") REFERENCES "function_nature"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_reference" ADD CONSTRAINT "salary_reference_range_id_fkey" FOREIGN KEY ("range_id") REFERENCES "salary_range"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_type" ADD CONSTRAINT "processing_type_payroll_type_id_fkey" FOREIGN KEY ("payroll_type_id") REFERENCES "payroll_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_type" ADD CONSTRAINT "processing_type_employment_link_id_fkey" FOREIGN KEY ("employment_link_id") REFERENCES "employment_link"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_parameter" ADD CONSTRAINT "system_parameter_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "user_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_work_location_id_fkey" FOREIGN KEY ("work_location_id") REFERENCES "work_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_center"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_job_position_id_fkey" FOREIGN KEY ("job_position_id") REFERENCES "job_position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_job_function_id_fkey" FOREIGN KEY ("job_function_id") REFERENCES "job_function"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_salary_reference_id_fkey" FOREIGN KEY ("salary_reference_id") REFERENCES "salary_reference"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_functional_status_id_fkey" FOREIGN KEY ("functional_status_id") REFERENCES "functional_status"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_employment_link_id_fkey" FOREIGN KEY ("employment_link_id") REFERENCES "employment_link"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_contract_type_id_fkey" FOREIGN KEY ("contract_type_id") REFERENCES "contract_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_union_id_fkey" FOREIGN KEY ("union_id") REFERENCES "union_entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "bank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_termination_reason_id_fkey" FOREIGN KEY ("termination_reason_id") REFERENCES "termination_reason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_dependent" ADD CONSTRAINT "employee_dependent_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_status_history" ADD CONSTRAINT "employee_status_history_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_status_history" ADD CONSTRAINT "employee_status_history_functional_status_id_fkey" FOREIGN KEY ("functional_status_id") REFERENCES "functional_status"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_status_history" ADD CONSTRAINT "employee_status_history_reason_id_fkey" FOREIGN KEY ("reason_id") REFERENCES "reason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_experience" ADD CONSTRAINT "professional_experience_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_transfer" ADD CONSTRAINT "employee_transfer_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_transfer" ADD CONSTRAINT "employee_transfer_from_branch_id_fkey" FOREIGN KEY ("from_branch_id") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_transfer" ADD CONSTRAINT "employee_transfer_to_branch_id_fkey" FOREIGN KEY ("to_branch_id") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_transfer" ADD CONSTRAINT "employee_transfer_to_work_location_id_fkey" FOREIGN KEY ("to_work_location_id") REFERENCES "work_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_transfer" ADD CONSTRAINT "employee_transfer_reason_id_fkey" FOREIGN KEY ("reason_id") REFERENCES "reason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_frequency" ADD CONSTRAINT "employee_frequency_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_time_record" ADD CONSTRAINT "service_time_record_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacation_record" ADD CONSTRAINT "vacation_record_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacation_record" ADD CONSTRAINT "vacation_record_vacation_type_id_fkey" FOREIGN KEY ("vacation_type_id") REFERENCES "vacation_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_record" ADD CONSTRAINT "leave_record_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_record" ADD CONSTRAINT "leave_record_absence_reason_id_fkey" FOREIGN KEY ("absence_reason_id") REFERENCES "absence_reason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_complement_data" ADD CONSTRAINT "employee_complement_data_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_level_history" ADD CONSTRAINT "salary_level_history_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_level_history" ADD CONSTRAINT "salary_level_history_salary_reference_id_fkey" FOREIGN KEY ("salary_reference_id") REFERENCES "salary_reference"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_run" ADD CONSTRAINT "payroll_run_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_run" ADD CONSTRAINT "payroll_run_payroll_type_id_fkey" FOREIGN KEY ("payroll_type_id") REFERENCES "payroll_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_run" ADD CONSTRAINT "payroll_run_processing_type_id_fkey" FOREIGN KEY ("processing_type_id") REFERENCES "processing_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_run" ADD CONSTRAINT "payroll_run_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_run_status_history" ADD CONSTRAINT "payroll_run_status_history_payroll_run_id_fkey" FOREIGN KEY ("payroll_run_id") REFERENCES "payroll_run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_run_status_history" ADD CONSTRAINT "payroll_run_status_history_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "user_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_payroll_item" ADD CONSTRAINT "employee_payroll_item_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_payroll_item" ADD CONSTRAINT "employee_payroll_item_payroll_run_id_fkey" FOREIGN KEY ("payroll_run_id") REFERENCES "payroll_run"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_payroll_item" ADD CONSTRAINT "employee_payroll_item_earning_deduction_id_fkey" FOREIGN KEY ("earning_deduction_id") REFERENCES "payroll_earning_deduction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_financial_record" ADD CONSTRAINT "payroll_financial_record_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_financial_record" ADD CONSTRAINT "payroll_financial_record_payroll_run_id_fkey" FOREIGN KEY ("payroll_run_id") REFERENCES "payroll_run"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_financial_record" ADD CONSTRAINT "payroll_financial_record_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_financial_record" ADD CONSTRAINT "payroll_financial_record_work_location_id_fkey" FOREIGN KEY ("work_location_id") REFERENCES "work_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_financial_record" ADD CONSTRAINT "payroll_financial_record_functional_status_id_fkey" FOREIGN KEY ("functional_status_id") REFERENCES "functional_status"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_remittance_file" ADD CONSTRAINT "payment_remittance_file_payroll_run_id_fkey" FOREIGN KEY ("payroll_run_id") REFERENCES "payroll_run"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_remittance_file" ADD CONSTRAINT "payment_remittance_file_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_remittance_file" ADD CONSTRAINT "payment_remittance_file_processing_type_id_fkey" FOREIGN KEY ("processing_type_id") REFERENCES "processing_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_remittance_file" ADD CONSTRAINT "payment_remittance_file_reason_id_fkey" FOREIGN KEY ("reason_id") REFERENCES "reason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_remittance_file" ADD CONSTRAINT "payment_remittance_file_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_payment" ADD CONSTRAINT "blocked_payment_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_payment" ADD CONSTRAINT "blocked_payment_payroll_run_id_fkey" FOREIGN KEY ("payroll_run_id") REFERENCES "payroll_run"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_payment" ADD CONSTRAINT "blocked_payment_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_payment" ADD CONSTRAINT "blocked_payment_functional_status_id_fkey" FOREIGN KEY ("functional_status_id") REFERENCES "functional_status"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_payment" ADD CONSTRAINT "blocked_payment_reason_id_fkey" FOREIGN KEY ("reason_id") REFERENCES "reason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_attachment" ADD CONSTRAINT "document_attachment_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "document_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_request" ADD CONSTRAINT "report_request_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "report_definition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_request" ADD CONSTRAINT "report_request_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "user_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_request" ADD CONSTRAINT "report_request_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_request" ADD CONSTRAINT "report_request_payroll_run_id_fkey" FOREIGN KEY ("payroll_run_id") REFERENCES "payroll_run"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_request" ADD CONSTRAINT "report_request_processing_type_id_fkey" FOREIGN KEY ("processing_type_id") REFERENCES "processing_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_report_file" ADD CONSTRAINT "generated_report_file_report_request_id_fkey" FOREIGN KEY ("report_request_id") REFERENCES "report_request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_report_file" ADD CONSTRAINT "generated_report_file_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "document_attachment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_download_audit" ADD CONSTRAINT "document_download_audit_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "document_attachment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_download_audit" ADD CONSTRAINT "document_download_audit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internship_program" ADD CONSTRAINT "internship_program_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "education_institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agreement" ADD CONSTRAINT "agreement_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "education_institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agreement" ADD CONSTRAINT "agreement_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "internship_program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internship_record" ADD CONSTRAINT "internship_record_agreement_id_fkey" FOREIGN KEY ("agreement_id") REFERENCES "agreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internship_record" ADD CONSTRAINT "internship_record_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "internship_program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internship_record" ADD CONSTRAINT "internship_record_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
