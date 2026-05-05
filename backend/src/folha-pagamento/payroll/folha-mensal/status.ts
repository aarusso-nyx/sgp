import { ConflictException } from '@nestjs/common';
import { PoolClient } from 'pg';

import { AuditMutationContextStore } from '../../../common/audit/audit-mutation-context.store';
import { CompetenceStatus, PayrollRunStatus } from '../folha-mensal.types';

export function assertMonthlyCompetenceStatus(
  current: CompetenceStatus,
  allowed: CompetenceStatus[],
): void {
  if (!allowed.includes(current)) {
    throw new ConflictException(
      `Monthly competence status ${current} cannot transition from this operation`,
    );
  }
}

export async function updateMonthlyCompetenceStatus(
  client: PoolClient,
  competenceId: string,
  status: CompetenceStatus,
): Promise<void> {
  await client.query(
    `
    UPDATE hr.competence_period
    SET status = $2,
        closed_at = CASE WHEN $2 = 'CLOSED' THEN now() ELSE closed_at END,
        updated_at = now()
    WHERE id = $1::uuid
    `,
    [competenceId, status],
  );
}

export async function reopenMonthlyCompetenceStatus(
  client: PoolClient,
  competenceId: string,
): Promise<void> {
  await client.query(
    `
    UPDATE hr.competence_period
    SET status = 'OPEN',
        closed_at = NULL,
        updated_at = now()
    WHERE id = $1::uuid
    `,
    [competenceId],
  );
}

export async function updateMonthlyRunStatus(
  client: PoolClient,
  payrollRunId: string,
  status: PayrollRunStatus,
): Promise<void> {
  await client.query(
    `
    UPDATE payroll.payroll_run
    SET status = $2::"PayrollRunStatus",
        closed_at = CASE WHEN $2::"PayrollRunStatus" = 'CLOSED'::"PayrollRunStatus" THEN now() ELSE closed_at END,
        updated_at = now()
    WHERE id = $1::uuid
    `,
    [payrollRunId, status],
  );
}

export async function reopenMonthlyRunStatus(
  client: PoolClient,
  payrollRunId: string,
): Promise<void> {
  await client.query(
    `
    UPDATE payroll.payroll_run
    SET status = 'DRAFT'::"PayrollRunStatus",
        closed_at = NULL,
        updated_at = now()
    WHERE id = $1::uuid
    `,
    [payrollRunId],
  );
}

export async function appendMonthlyRunHistory(
  client: PoolClient,
  payrollRunId: string,
  status: PayrollRunStatus,
  note: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  await client.query(
    `
    INSERT INTO payroll.payroll_run_status_history (
      tenant_id,
      payroll_run_id,
      status,
      note,
      metadata
    )
    VALUES (
      public.sgp_current_tenant_uuid(),
      $1::uuid,
      $2::"PayrollRunStatus",
      $3,
      $4::jsonb
    )
    `,
    [payrollRunId, status, note, JSON.stringify(metadata)],
  );
}

export async function appendMonthlyAuditEvent(
  client: PoolClient,
  payrollRunId: string,
  event: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  await client.query(
    `
    SELECT public.sgp_append_audit_event(
      'PROCESS',
      'payroll.monthly',
      $1::text,
      NULL::uuid,
      NULLIF(current_setting('app.current_user_sub', true), ''),
      NULLIF(current_setting('app.current_login', true), ''),
      'payroll.payroll_run',
      NULLIF(current_setting('app.request_id', true), ''),
      $2::jsonb,
      $3,
      NULL::text,
      NULL::text
    )
    `,
    [
      payrollRunId,
      JSON.stringify({
        event,
        ...metadata,
      }),
      event,
    ],
  );
  AuditMutationContextStore.markMutationAudited();
}
