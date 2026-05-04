import {
  AbonoPermanenciaRow,
  CadastralChangeRow,
  EmployeeListRow,
  EmployeeSummary,
} from './employees.types';

export function toIso(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

export function toSummary(row: EmployeeListRow): EmployeeSummary {
  return {
    id: row.id,
    registration: row.registration,
    name: row.name,
    cpf: row.cpf,
    email: row.email,
    lifecycleStatus: row.lifecycle_status,
    functionalStatus: row.functional_status,
    branch: row.branch_name,
    active: row.active,
    abonoPermanenciaAtivo: row.abono_permanencia_ativo ?? false,
    abonoPermanenciaInicio: row.abono_permanencia_inicio
      ? toIso(row.abono_permanencia_inicio).slice(0, 10)
      : null,
    abonoPermanenciaFundamento: row.abono_permanencia_fundamento ?? null,
    recruitmentOrigin: row.recruitment_origin ?? null,
    version: Number(row.version ?? 0),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export function toAbonoPermanencia(
  row: AbonoPermanenciaRow,
): Record<string, unknown> {
  return {
    employeeId: row.id,
    active: row.active,
    startsOn: row.starts_on ? toIso(row.starts_on).slice(0, 10) : null,
    legalBasis: row.legal_basis,
    auditEventId: row.audit_event_id ?? null,
    version: Number(row.version ?? 0),
    updatedAt: toIso(row.updated_at),
  };
}

export function toCadastralChange(
  row: CadastralChangeRow,
): Record<string, unknown> {
  return {
    id: row.id,
    employeeId: row.employee_id,
    registration: row.registration,
    employeeName: row.employee_name,
    section: row.section,
    status: row.status,
    previousPayload: row.previous_payload,
    requestedPayload: row.requested_payload,
    decisionNotes: row.decision_notes,
    requestedBySub: row.requested_by_sub,
    requestedByLogin: row.requested_by_login,
    decidedBySub: row.decided_by_sub,
    decidedByLogin: row.decided_by_login,
    requestedAt: toIso(row.requested_at),
    decidedAt: row.decided_at ? toIso(row.decided_at) : null,
  };
}

export function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
