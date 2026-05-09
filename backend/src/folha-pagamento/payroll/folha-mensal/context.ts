import { ConflictException, NotFoundException } from '@nestjs/common';
import { PoolClient } from 'pg';

import { FolhaMensalCompetenceDto } from '../payroll.dto';
import {
  CatalogRow,
  CompetenceRow,
  CompetenceStatus,
  PayrollRunStatus,
  RunRow,
} from '../folha-mensal.types';
import { ensureMonthlyCatalog } from './catalog';
import { domainError } from '../../../common/errors/domain-error';

export async function ensureMonthlyCompetence(
  client: PoolClient,
  input: FolhaMensalCompetenceDto,
  status: CompetenceStatus,
): Promise<CompetenceRow> {
  const code = competenceCode(input);
  const rows = await client.query<CompetenceRow>(
    `
    INSERT INTO hr.competence_period (
      tenant_id,
      code,
      name,
      description,
      competence_year,
      competence_month,
      status,
      opened_at
    )
    VALUES (
      public.sgp_current_tenant_uuid(),
      $1,
      $2,
      'Monthly payroll competence',
      $3,
      $4,
      $5,
      now()
    )
    ON CONFLICT (tenant_id, competence_year, competence_month) DO UPDATE
    SET status = CASE
          WHEN hr.competence_period.status = 'CLOSED' THEN hr.competence_period.status
          ELSE EXCLUDED.status
        END,
        opened_at = COALESCE(hr.competence_period.opened_at, EXCLUDED.opened_at),
        updated_at = now()
    RETURNING
      id::text,
      competence_year,
      competence_month,
      status,
      opened_at,
      closed_at
    `,
    [code, `Competence ${code}`, input.year, input.month, status],
  );
  const row = rows.rows[0];
  if (!row) {
    throw domainError.internal(
      'INTERNAL_INVARIANT',
      'Monthly competence could not be ensured',
    );
  }
  if (row.status === 'CLOSED') {
    throw new ConflictException('Monthly competence is already closed');
  }
  return row;
}

export async function ensureMonthlyRun(
  client: PoolClient,
  catalog: CatalogRow,
  input: FolhaMensalCompetenceDto,
  status: PayrollRunStatus,
): Promise<RunRow> {
  const existing = await client.query<RunRow>(
    `
    SELECT
      id::text,
      competence_year,
      competence_month,
      status::text,
      employee_count,
      total_earnings::text,
      total_deductions::text,
      total_net::text
    FROM payroll.payroll_run
    WHERE tenant_id = public.sgp_current_tenant_uuid()
      AND competence_year = $1
      AND competence_month = $2
      AND branch_id IS NULL
      AND payroll_type_id = $3::uuid
      AND processing_type_id = $4::uuid
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [
      input.year,
      input.month,
      catalog.payroll_type_id,
      catalog.processing_type_id,
    ],
  );
  if (existing.rows[0]) return existing.rows[0];

  const inserted = await client.query<RunRow>(
    `
    INSERT INTO payroll.payroll_run (
      tenant_id,
      competence_year,
      competence_month,
      payroll_type_id,
      processing_type_id,
      branch_id,
      status
    )
    VALUES (
      public.sgp_current_tenant_uuid(),
      $1,
      $2,
      $3::uuid,
      $4::uuid,
      NULL,
      $5::"PayrollRunStatus"
    )
    RETURNING
      id::text,
      competence_year,
      competence_month,
      status::text,
      employee_count,
      total_earnings::text,
      total_deductions::text,
      total_net::text
    `,
    [
      input.year,
      input.month,
      catalog.payroll_type_id,
      catalog.processing_type_id,
      status,
    ],
  );
  return inserted.rows[0]!;
}

export async function loadMonthlyContext(
  client: PoolClient,
  input: FolhaMensalCompetenceDto,
) {
  const catalog = await ensureMonthlyCatalog(client);
  const competenceRows = await client.query<CompetenceRow>(
    `
    SELECT
      id::text,
      competence_year,
      competence_month,
      status,
      opened_at,
      closed_at
    FROM hr.competence_period
    WHERE tenant_id = public.sgp_current_tenant_uuid()
      AND competence_year = $1
      AND competence_month = $2
    LIMIT 1
    `,
    [input.year, input.month],
  );
  const competence = competenceRows.rows[0];
  if (!competence) {
    throw new NotFoundException('Monthly competence is not open');
  }
  const run = await ensureMonthlyRun(client, catalog, input, 'DRAFT');
  return { catalog, competence, run };
}

export function competenceCode(input: FolhaMensalCompetenceDto): string {
  return `${input.year}-${String(input.month).padStart(2, '0')}`;
}
