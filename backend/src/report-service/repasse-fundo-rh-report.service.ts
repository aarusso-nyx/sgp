import { Injectable } from '@nestjs/common';

import {
  buildReportCsv,
  buildReportJson,
  buildReportPdf,
  ReportTable,
} from './report-artifact.builder';
import { ReportWorkerArtifactsService } from './report-worker-artifacts.service';
import { ReportWorkerDataService } from './report-worker-data.service';
import {
  competenceLabel,
  fileName,
  summaryLines,
} from './report-worker-formatting';
import { ReportJobRow, WorkerResult } from './report-worker.types';

@Injectable()
export class RepasseFundoRhReportService {
  constructor(
    private readonly data: ReportWorkerDataService,
    private readonly artifacts: ReportWorkerArtifactsService,
  ) {}

  async generate(job: ReportJobRow): Promise<WorkerResult> {
    const summary = await this.data.loadPayrollSummary(job);
    const rows = await this.data.loadRepasseFundoRh(job);
    const table: ReportTable = {
      title: 'Repasse Fundo RH',
      columns: [
        'Fonte',
        'Rubrica',
        'Classificacao',
        'Servidores',
        'Base',
        'Repasse',
      ],
      rows: rows.map((row) => [
        row.fund_source,
        row.rubric_code,
        row.rubric_description,
        row.employee_count,
        row.basis_total,
        row.transfer_total,
      ]),
    };
    const totals = rows.reduce(
      (accumulator, row) => ({
        basis: accumulator.basis + Number(row.basis_total),
        transfer: accumulator.transfer + Number(row.transfer_total),
      }),
      { basis: 0, transfer: 0 },
    );
    const pdf = await this.artifacts.persistResult(
      job,
      buildReportPdf({
        fileName: fileName('relatorio-repasse-fundo-rh', summary, 'pdf'),
        title: 'Relatorio Repasse Fundo RH',
        subtitle: competenceLabel(summary),
        lines: [
          ...summaryLines(summary),
          `Base elegivel: ${totals.basis.toFixed(2)}`,
          `Total repasse: ${totals.transfer.toFixed(2)}`,
        ],
        tables: [table],
        recordCount: rows.length,
      }),
      'repasse-fundo-rh',
      {
        reportCode: 'RELATORIO_REPASSE_FUNDO_RH',
        operation: 'report.repasse_fundo_rh.generated',
        format: 'PDF',
      },
    );
    const csv = await this.artifacts.persistResult(
      job,
      buildReportCsv({
        fileName: fileName('relatorio-repasse-fundo-rh', summary, 'csv'),
        table,
        recordCount: rows.length,
      }),
      'repasse-fundo-rh',
      {
        reportCode: 'RELATORIO_REPASSE_FUNDO_RH',
        operation: 'report.repasse_fundo_rh.generated',
        format: 'CSV',
      },
    );
    const json = await this.artifacts.persistResult(
      job,
      buildReportJson({
        fileName: fileName('relatorio-repasse-fundo-rh', summary, 'json'),
        payload: {
          reportCode: 'RELATORIO_REPASSE_FUNDO_RH',
          competenceYear: summary.competence_year,
          competenceMonth: summary.competence_month,
          payrollRunId: summary.payroll_run_id,
          status: summary.status,
          totals,
          rows,
        },
        recordCount: rows.length,
      }),
      'repasse-fundo-rh',
      {
        reportCode: 'RELATORIO_REPASSE_FUNDO_RH',
        operation: 'report.repasse_fundo_rh.generated',
        format: 'JSON',
      },
    );

    return this.artifacts.combineResults([pdf, csv, json], {
      reportCode: 'RELATORIO_REPASSE_FUNDO_RH',
      operation: 'report.repasse_fundo_rh.generated',
      formats: ['PDF', 'CSV', 'JSON'],
      basisTotal: totals.basis.toFixed(2),
      transferTotal: totals.transfer.toFixed(2),
    });
  }
}
