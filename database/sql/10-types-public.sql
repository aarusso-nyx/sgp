CREATE TYPE public."AdvancePaymentStatus" AS ENUM (
    'PENDING',
    'GENERATED',
    'PAID',
    'CANCELED'
);

CREATE TYPE public."AdvanceRequestStatus" AS ENUM (
    'REQUESTED',
    'APPROVED',
    'REJECTED',
    'PROCESSED',
    'CANCELED'
);

CREATE TYPE public."AgreementStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'SUSPENDED',
    'EXPIRED',
    'TERMINATED'
);

CREATE TYPE public."AuditAction" AS ENUM (
    'CREATE',
    'READ',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT',
    'IMPORT',
    'EXPORT',
    'GENERATE',
    'PROCESS',
    'APPROVE',
    'REJECT',
    'DOWNLOAD'
);

CREATE TYPE public."BranchType" AS ENUM (
    'HEADQUARTERS',
    'BRANCH',
    'DEPARTMENT',
    'EXTERNAL'
);

CREATE TYPE public."CadastralChangeStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);

CREATE TYPE public."DocumentStorageKind" AS ENUM (
    'LOCAL',
    'S3',
    'EXTERNAL'
);

CREATE TYPE public."DocumentUploadStatus" AS ENUM (
    'PENDING',
    'REGISTERED',
    'EXPIRED',
    'ABORTED'
);

CREATE TYPE public."ESocialEventStatus" AS ENUM (
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

CREATE TYPE public."EmployeeLifecycleStatus" AS ENUM (
    'ACTIVE',
    'ON_LEAVE',
    'SUSPENDED',
    'TERMINATED',
    'RETIRED',
    'INTERN'
);

CREATE TYPE public."ExternalLifeProofChannel" AS ENUM (
    'PORTAL_COLABORADOR',
    'PREFEITURA_PUBLICA',
    'GOV_BR'
);

CREATE TYPE public."MedicalAppointmentStatus" AS ENUM (
    'SCHEDULED',
    'ATTENDED',
    'NO_SHOW',
    'CANCELED'
);

CREATE TYPE public."MedicalReportStatus" AS ENUM (
    'PENDING_SUBMISSION',
    'APPROVED',
    'REJECTED'
);

CREATE TYPE public."PaymentRemittanceStatus" AS ENUM (
    'DRAFT',
    'GENERATED',
    'SENT',
    'PAID',
    'REJECTED',
    'CANCELED',
    'RETURNED'
);

CREATE TYPE public."PaymentReturnFileStatus" AS ENUM (
    'PROCESSING',
    'PROCESSED',
    'FAILED'
);

CREATE TYPE public."PayrollEntryKind" AS ENUM (
    'EARNING',
    'DEDUCTION',
    'INFORMATION',
    'BASE'
);

CREATE TYPE public."PayrollEntrySource" AS ENUM (
    'MANUAL',
    'IMPORTED',
    'CALCULATED',
    'ADJUSTMENT'
);

CREATE TYPE public."PayrollRunStatus" AS ENUM (
    'DRAFT',
    'QUEUED',
    'PROCESSING',
    'GENERATED',
    'APPROVED',
    'PAID',
    'CANCELED',
    'FAILED',
    'CLOSED'
);

CREATE TYPE public."PayslipBatchStatus" AS ENUM (
    'QUEUED',
    'RUNNING',
    'DONE',
    'FAILED'
);

CREATE TYPE public."PdfACompliance" AS ENUM (
    'PDF_A_1B',
    'PDF_A_2B',
    'NONE'
);

CREATE TYPE public."PensionCompensationStatus" AS ENUM (
    'DRAFT',
    'REQUESTED',
    'APPROVED',
    'REJECTED',
    'SETTLED'
);

CREATE TYPE public."PerformanceEvaluationStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'REJECTED'
);

CREATE TYPE public."PersonGender" AS ENUM (
    'FEMALE',
    'MALE',
    'OTHER',
    'UNDECLARED'
);

CREATE TYPE public."ProgressionKind" AS ENUM (
    'MERIT',
    'TITLE',
    'JUDICIAL',
    'CORRECTION'
);

CREATE TYPE public."RecertificationBeneficiaryType" AS ENUM (
    'RETIREE',
    'PENSIONER',
    'UNIVERSITY_PENSIONER'
);

CREATE TYPE public."RecertificationStatus" AS ENUM (
    'PENDING',
    'RECERTIFIED',
    'NEAR_DUE',
    'OVERDUE',
    'BLOCKED'
);

CREATE TYPE public."RecordStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'ARCHIVED'
);

CREATE TYPE public."RecruitmentCandidateStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);

CREATE TYPE public."RecruitmentHiringType" AS ENUM (
    'EFFECTIVE',
    'COMMISSIONED',
    'CONTRACTOR',
    'INTERN'
);

CREATE TYPE public."RecruitmentRequestStatus" AS ENUM (
    'DRAFT',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELED'
);

CREATE TYPE public."ReportKind" AS ENUM (
    'PAYSLIP',
    'YEARLY_INCOME_REPORT'
);

CREATE TYPE public."ReportRequestStatus" AS ENUM (
    'REQUESTED',
    'RUNNING',
    'COMPLETED',
    'FAILED',
    'EXPIRED'
);

CREATE TYPE public."SignatureKind" AS ENUM (
    'NONE',
    'ICP_BRASIL_A1',
    'ICP_BRASIL_A3',
    'GOV_BR'
);

CREATE TYPE public."UserStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'LOCKED'
);
