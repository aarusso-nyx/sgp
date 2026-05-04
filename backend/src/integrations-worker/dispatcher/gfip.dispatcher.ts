import type { QueryResultRow } from 'pg';

import { buildGfipFile } from '../builders/gfip.builder';
import {
  IntegrationDispatchContext,
  IntegrationJobDispatcher,
  IntegrationProcessResult,
  PendingIntegrationJobRow,
} from './integration-job-dispatcher';

interface PayrollRunExecutionRow extends QueryResultRow {
  payroll_run_id: string | null;
  competence_year: number;
  competence_month: number;
  branch_id: string | null;
  total_net: string;
  employee_count: string;
}

export class GfipIntegrationDispatcher implements IntegrationJobDispatcher {
  readonly definitions = ['FOLHA_GFIP_GERAR'] as const;

  async process(
    job: PendingIntegrationJobRow,
    context: IntegrationDispatchContext,
  ): Promise<IntegrationProcessResult> {
    const collectionCode = context.requireString(
      job.parameters,
      'collectionCode',
    );
    const modality = context.requireString(job.parameters, 'modality');
    const branchId = context.readString(job.parameters, 'branchId');
    const payrollRunId = context.readString(job.parameters, 'payrollRunId');

    const row = payrollRunId
      ? await this.loadPayrollRun(payrollRunId, context)
      : {
          payroll_run_id: null,
          competence_year:
            job.competence_year ?? Number(job.parameters?.competenceYear ?? 0),
          competence_month:
            job.competence_month ??
            Number(job.parameters?.competenceMonth ?? 0),
          branch_id: branchId ?? null,
          total_net: '0.00',
          employee_count: '0',
        };

    const artifact = buildGfipFile({
      competenceYear: row.competence_year,
      competenceMonth: row.competence_month,
      branchId: branchId ?? row.branch_id,
      collectionCode,
      modality,
      payrollRunId,
      employeeCount: Number(row.employee_count),
      totalAmount: row.total_net,
    });
    return context.persistDocumentResult(
      job,
      artifact,
      [
        job.tenant_id,
        'outputs',
        'gfip',
        String(row.competence_year),
        String(row.competence_month).padStart(2, '0'),
        artifact.fileName,
      ].join('/'),
      {
        operation: 'gfip.gerada',
        payrollRunId,
        branchId: branchId ?? row.branch_id,
        collectionCode,
        modality,
      },
    );
  }

  private async loadPayrollRun(
    payrollRunId: string,
    context: IntegrationDispatchContext,
  ): Promise<PayrollRunExecutionRow> {
    const rows = await context.databaseService.query<PayrollRunExecutionRow>(
      `
      SELECT
        pr.id::text AS payroll_run_id,
        pr.competence_year,
        pr.competence_month,
        pr.branch_id::text,
        pr.total_net::text,
        count(DISTINCT epi.employee_id)::text AS employee_count
      FROM payroll.payroll_run pr
      LEFT JOIN payroll.employee_payroll_item epi ON epi.payroll_run_id = pr.id
      WHERE pr.id = $1::uuid
      GROUP BY
        pr.id,
        pr.competence_year,
        pr.competence_month,
        pr.branch_id,
        pr.total_net
      `,
      [payrollRunId],
    );
    const row = rows[0];
    if (!row) {
      throw new Error('Payroll run for GFIP request not found');
    }
    return row;
  }
}
