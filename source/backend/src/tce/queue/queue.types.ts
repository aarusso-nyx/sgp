import { QueryResultRow } from 'pg';

export interface TceQueueJobDto {
  id: string;
  tenantId: string;
  submissionId: string;
  adapterId: string;
  endpointUrl: string | null;
  stateCode: string | null;
  competenceYear: number | null;
  competenceMonth: number | null;
  status: string;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: string | null;
  lockedBy: string | null;
  lockedAt: string | null;
  lastErrorKind: string | null;
  lastErrorPayload: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface TceAttemptDto {
  id: string;
  queueId: string;
  tenantId: string;
  attemptNumber: number;
  startedAt: string;
  finishedAt: string | null;
  outcome: string;
  errorPayload: Record<string, unknown> | null;
}

export interface QueueJobRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  submission_id: string;
  adapter_id: string;
  endpoint_url: string | null;
  state_code: string | null;
  competence_year: number | null;
  competence_month: number | null;
  status: string;
  attempts: number;
  max_attempts: number;
  next_attempt_at: Date | string | null;
  locked_by: string | null;
  locked_at: Date | string | null;
  last_error_kind: string | null;
  last_error_payload: Record<string, unknown> | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface AttemptRow extends QueryResultRow {
  id: string;
  queue_id: string;
  tenant_id: string;
  attempt_number: number;
  started_at: Date | string;
  finished_at: Date | string | null;
  outcome: string;
  error_payload: Record<string, unknown> | string | null;
}

export function queueJobColumns(prefix = 'queue'): string {
  return `
    ${prefix}.id::text,
    ${prefix}.tenant_id::text,
    ${prefix}.submission_id::text,
    ${prefix}.adapter_id,
    ${prefix}.endpoint_url,
    state.code::text AS state_code,
    submission.competence_year,
    submission.competence_month,
    ${prefix}.status::text AS status,
    ${prefix}.attempts,
    ${prefix}.max_attempts,
    ${prefix}.next_attempt_at,
    ${prefix}.locked_by,
    ${prefix}.locked_at,
    ${prefix}.last_error_kind::text AS last_error_kind,
    ${prefix}.last_error_payload,
    ${prefix}.created_at,
    ${prefix}.updated_at
  `;
}

export function queueJobFromClause(): string {
  return `
    tce.submission_queue queue
    JOIN tce.submission submission ON submission.id = queue.submission_id
    LEFT JOIN tce.layout_version layout ON layout.id = submission.layout_version_id
    LEFT JOIN tce.state state ON state.id = layout.state_id
  `;
}

export function mapQueueJob(row: QueryResultRow): TceQueueJobDto {
  const typed = row as QueueJobRow;
  return {
    id: typed.id,
    tenantId: typed.tenant_id,
    submissionId: typed.submission_id,
    adapterId: typed.adapter_id,
    endpointUrl: typed.endpoint_url,
    stateCode: typed.state_code,
    competenceYear: typed.competence_year,
    competenceMonth: typed.competence_month,
    status: typed.status,
    attempts: typed.attempts,
    maxAttempts: typed.max_attempts,
    nextAttemptAt: dateTimeOrNull(typed.next_attempt_at),
    lockedBy: typed.locked_by,
    lockedAt: dateTimeOrNull(typed.locked_at),
    lastErrorKind: typed.last_error_kind,
    lastErrorPayload: parseJson(typed.last_error_payload, null),
    createdAt: new Date(typed.created_at).toISOString(),
    updatedAt: new Date(typed.updated_at).toISOString(),
  };
}

export function mapAttempt(row: AttemptRow): TceAttemptDto {
  return {
    id: row.id,
    queueId: row.queue_id,
    tenantId: row.tenant_id,
    attemptNumber: row.attempt_number,
    startedAt: new Date(row.started_at).toISOString(),
    finishedAt: dateTimeOrNull(row.finished_at),
    outcome: row.outcome,
    errorPayload: parseJson(row.error_payload, null),
  };
}

function parseJson<T>(
  value: Record<string, unknown> | string | null,
  fallback: T,
): T {
  if (!value) return fallback;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function dateTimeOrNull(value: Date | string | null): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}
