import { QueryResultRow } from 'pg';

import { domainError } from '../common/errors/domain-error';
import { DatabaseService } from '../database/database.service';

export interface EmployeeStateRow extends QueryResultRow {
  id: string;
  lifecycle_status: string;
}

export interface AppointmentRow extends QueryResultRow {
  id: string;
  employee_id: string;
  slot_ref: string;
  scheduled_on: Date | string;
  scheduled_time: string;
  contact_phone: string | null;
  status: string;
}

export interface MedicalRecordRow extends QueryResultRow {
  id: string;
  appointment_id: string;
  employee_id: string;
  report_status: string;
  approved_by_ref: string | null;
  approved_at: Date | string | null;
}

export interface MedicalLeaveRow extends QueryResultRow {
  id: string;
  employee_id: string;
  granted_days: number;
  starts_on: Date | string;
  ends_on: Date | string;
}

export interface ReplicationRow extends QueryResultRow {
  employee_id: string;
}

export const PERICIA_ERRORS = {
  appointmentNotFound: () =>
    domainError.notFound(
      'SAUDE.PERICIA.APPOINTMENT_NOT_FOUND',
      'Medical appointment not found',
    ),
  appointmentRecordCreationUnavailable: () =>
    domainError.badRequest(
      'SAUDE.PERICIA.APPOINTMENT_RECORD_CREATION_UNAVAILABLE',
      'Medical appointment is not available for record creation',
    ),
  appointmentSlotOccupied: () =>
    domainError.conflict(
      'SAUDE.PERICIA.APPOINTMENT_SLOT_OCCUPIED',
      'Appointment slot already occupied',
    ),
  databaseUnavailable: () =>
    domainError.serviceUnavailable(
      'SAUDE.PERICIA.DATABASE_UNAVAILABLE',
      'DATABASE_URL is required for pericia operations',
    ),
  employeeNotActive: () =>
    domainError.unprocessable(
      'SAUDE.PERICIA.EMPLOYEE_NOT_ACTIVE',
      'Funcionário não se encontra em exercício',
    ),
  employeeNotFound: () =>
    domainError.notFound(
      'SAUDE.PERICIA.EMPLOYEE_NOT_FOUND',
      'Employee not found',
    ),
  grantedOpinionIncomplete: () =>
    domainError.badRequest(
      'SAUDE.PERICIA.GRANTED_OPINION_INCOMPLETE',
      'Granted opinion requires grantedDays, startsOn, and endsOn',
    ),
  leaveNotFound: () =>
    domainError.notFound(
      'SAUDE.PERICIA.LEAVE_NOT_FOUND',
      'Medical leave not found',
    ),
  leaveReplicationSourceNotFound: () =>
    domainError.notFound(
      'SAUDE.PERICIA.LEAVE_REPLICATION_SOURCE_NOT_FOUND',
      'Medical leave not found for record replication',
    ),
  recordCreationFailed: () =>
    domainError.notFound(
      'SAUDE.PERICIA.RECORD_CREATION_FAILED',
      'Medical record could not be created',
    ),
  recordNotFound: () =>
    domainError.notFound(
      'SAUDE.PERICIA.RECORD_NOT_FOUND',
      'Medical record not found',
    ),
} as const;

export interface PericiaAppointmentSummary {
  id: string;
  funcionarioId: string;
  janelaId: string;
  data: string;
  hora: string;
  telefoneContato: string | null;
  status: string;
}

export interface MedicalLeaveSummary {
  id: string;
  funcionarioId: string;
  diasConcedidos: number;
  dataInicio: string;
  dataFim: string;
}

export interface MedicalRecordSummary {
  id: string;
  agendamentoId: string;
  funcionarioId: string;
  situacaoLaudo: string;
  licenca: MedicalLeaveSummary | null;
  validadoPor: string | null;
  validadoEm: string | null;
}

export function ensurePericiaDatabase(databaseService: DatabaseService): void {
  if (!databaseService.configured) {
    throw PERICIA_ERRORS.databaseUnavailable();
  }
}

export function toAppointmentSummary(
  row: AppointmentRow | undefined,
): PericiaAppointmentSummary {
  if (!row) {
    throw PERICIA_ERRORS.appointmentNotFound();
  }

  return {
    id: row.id,
    funcionarioId: row.employee_id,
    janelaId: row.slot_ref,
    data: toDateOnly(row.scheduled_on),
    hora: row.scheduled_time,
    telefoneContato: row.contact_phone,
    status: toApiAppointmentStatus(row.status),
  };
}

export function toMedicalRecordSummary(
  row: MedicalRecordRow | undefined,
  leave: MedicalLeaveSummary | null,
): MedicalRecordSummary {
  if (!row) {
    throw PERICIA_ERRORS.recordNotFound();
  }

  return {
    id: row.id,
    agendamentoId: row.appointment_id,
    funcionarioId: row.employee_id,
    situacaoLaudo: toApiReportStatus(row.report_status),
    licenca: leave,
    validadoPor: row.approved_by_ref,
    validadoEm: row.approved_at ? toIso(row.approved_at) : null,
  };
}

export function toLeaveSummary(
  row: MedicalLeaveRow | undefined,
): MedicalLeaveSummary {
  if (!row) {
    throw PERICIA_ERRORS.leaveNotFound();
  }
  return {
    id: row.id,
    funcionarioId: row.employee_id,
    diasConcedidos: row.granted_days,
    dataInicio: toDateOnly(row.starts_on),
    dataFim: toDateOnly(row.ends_on),
  };
}

export function toOptionalLeave(
  row: MedicalLeaveRow | undefined,
): MedicalLeaveSummary | null {
  return row ? toLeaveSummary(row) : null;
}

function toApiAppointmentStatus(status: string): string {
  switch (status) {
    case 'SCHEDULED':
      return 'AGENDADO';
    case 'ATTENDED':
      return 'COMPARECEU';
    case 'NO_SHOW':
      return 'NAO_COMPARECEU';
    case 'CANCELED':
      return 'CANCELADO';
    default:
      return status;
  }
}

function toApiReportStatus(status: string): string {
  switch (status) {
    case 'PENDING_SUBMISSION':
      return 'PENDENTE_ENVIO';
    case 'APPROVED':
      return 'APROVADO';
    case 'REJECTED':
      return 'REPROVADO';
    default:
      return status;
  }
}

function toDateOnly(value: Date | string): string {
  const normalized =
    value instanceof Date ? value.toISOString() : String(value);
  return normalized.slice(0, 10);
}

function toIso(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}
