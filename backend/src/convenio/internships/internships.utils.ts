import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { domainError } from '../../common/errors/domain-error';
import { RequestContextStore } from '../../common/request-context/request-context.store';
import { DatabaseService } from '../../database/database.service';
import {
  InternshipProgramSummary,
  InternshipRow,
  InternshipSummary,
  ProgramRow,
} from './internships.types';

export function ensureDatabase(databaseService: DatabaseService): void {
  if (!databaseService.configured) {
    throw new ServiceUnavailableException(
      'DATABASE_URL is required for internship operations',
    );
  }
}

export function currentTenantId(): string {
  const context = RequestContextStore.get();
  const tenantId = context?.actor?.tenantId ?? context?.tenantId;
  if (!tenantId) {
    throw domainError.internal(
      'INTERNAL_INVARIANT',
      'Tenant context is required',
    );
  }
  return tenantId;
}

export function runWithOperationalPermissions<T>(
  tenantId: string,
  callback: () => Promise<T>,
): Promise<T> {
  const context = RequestContextStore.get();
  const permissions = new Set([
    ...(context?.actor?.permissions ?? context?.permissions ?? []),
    'convenio.write',
    'rh.employee.write',
    'rh.employee.terminate',
    'hr.employment.read',
    'hr.employment.write',
    'esocial.event.read',
    'esocial.event.write',
    'gestao.write',
  ]);
  return RequestContextStore.run(
    {
      ...context,
      tenantId,
      permissions: [...permissions],
      actor: context?.actor
        ? { ...context.actor, permissions: [...permissions] }
        : context?.actor,
    },
    callback,
  );
}

export function assertInternshipDates(startsOn: string, endsOn: string): void {
  assertDateRange(startsOn, endsOn, 'Internship');
  const start = parseDate(startsOn);
  const end = parseDate(endsOn);
  const max = new Date(start);
  max.setUTCMonth(max.getUTCMonth() + 24);
  if (end > max) {
    throw new BadRequestException(
      'Internship duration cannot exceed 24 months',
    );
  }
}

export function assertDateRange(
  startsOn: string | undefined,
  endsOn: string | undefined,
  label: string,
): void {
  if (!startsOn || !endsOn) return;
  if (parseDate(endsOn) < parseDate(startsOn)) {
    throw new BadRequestException(
      `${label} end date cannot be before start date`,
    );
  }
}

export function assertWeeklyHours(value: string): void {
  const hours = Number(value.replace(',', '.'));
  if (!Number.isFinite(hours) || hours <= 0 || hours > 30) {
    throw new BadRequestException(
      'Ordinary internship weeklyHours must be greater than 0 and at most 30',
    );
  }
}

export function toProgramSummary(row: ProgramRow): InternshipProgramSummary {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    institution: row.institution_name,
    startsOn: row.starts_on ? toDateOnly(row.starts_on) : null,
    endsOn: row.ends_on ? toDateOnly(row.ends_on) : null,
    status: row.status,
  };
}

export function toInternshipSummary(row: InternshipRow): InternshipSummary {
  return {
    id: row.id,
    programId: row.program_id,
    agreementId: row.agreement_id,
    employeeId: row.employee_id,
    tsvContractId: row.tsv_contract_id,
    internName: row.intern_name,
    internCpf: row.intern_cpf,
    supervisorName: row.supervisor_name,
    startsOn: toDateOnly(row.starts_on),
    endsOn: row.ends_on ? toDateOnly(row.ends_on) : null,
    status: row.status,
    termNumber: row.term_number,
    termSignedOn: row.term_signed_on ? toDateOnly(row.term_signed_on) : null,
    activityPlanUri: row.activity_plan_uri,
    activityPlanDescription: row.activity_plan_description,
    weeklyHours: normalizeDecimal(row.weekly_hours, 6),
    stipendAmount:
      row.stipend_amount === null
        ? null
        : normalizeDecimal(row.stipend_amount, 2),
    esocialStartEvent: row.tsv_contract_id
      ? { eventKind: 'S-2300', tsvContractId: row.tsv_contract_id }
      : null,
  };
}

export function toDateOnly(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : new Date(value).toISOString().slice(0, 10);
}

function parseDate(value: string): Date {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException('Invalid date');
  }
  return parsed;
}

function normalizeDecimal(value: string, scale: number): string {
  const numeric = Number(value.replace(',', '.'));
  if (!Number.isFinite(numeric)) return Number(0).toFixed(scale);
  return numeric.toFixed(scale);
}
