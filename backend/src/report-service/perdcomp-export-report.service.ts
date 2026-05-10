import { Injectable } from '@nestjs/common';

import { buildReportJson, buildReportText } from './report-artifact.builder';
import { ReportWorkerArtifactsService } from './report-worker-artifacts.service';
import { ReportWorkerDataService } from './report-worker-data.service';
import { fileName } from './report-worker-formatting';
import {
  PayrollSummaryRow,
  PerdcompCreditRow,
  ReportJobRow,
  WorkerResult,
} from './report-worker.types';
import { domainError } from '../common/errors/domain-error';

const EXPORTABLE_PAYROLL_STATUSES = new Set(['APPROVED', 'PAID', 'CLOSED']);

interface PerdcompTotals {
  inssPatronal: number;
  inssSegurado: number;
  rat: number;
  outros: number;
  total: number;
}

@Injectable()
export class PerdcompExportReportService {
  constructor(
    private readonly data: ReportWorkerDataService,
    private readonly artifacts: ReportWorkerArtifactsService,
  ) {}

  async generate(job: ReportJobRow): Promise<WorkerResult> {
    const summary = await this.data.loadPayrollSummary(job);
    this.validateSummary(summary);
    const rows = await this.data.loadPerdcompCreditRows(job);
    const totals = this.summarize(rows);
    const lines = this.buildLines(summary, rows, totals);
    const compensationCompetence = this.compensationCompetence(job, summary);
    const txt = await this.artifacts.persistResult(
      job,
      buildReportText({
        fileName: fileName('m-08-perdcomp', summary, 'txt'),
        lines,
        recordCount: rows.length,
      }),
      'perdcomp',
      {
        reportCode: 'M.08',
        operation: 'report.perdcomp.generated',
        format: 'TXT',
      },
    );
    const json = await this.artifacts.persistResult(
      job,
      buildReportJson({
        fileName: fileName('m-08-perdcomp', summary, 'json'),
        payload: {
          reportCode: 'M.08',
          layout: 'PERDCOMP-SGP-V1',
          competenceYear: summary.competence_year,
          competenceMonth: summary.competence_month,
          payrollRunId: summary.payroll_run_id,
          status: summary.status,
          compensationCompetence,
          totals: {
            inssPatronal: totals.inssPatronal.toFixed(2),
            inssSegurado: totals.inssSegurado.toFixed(2),
            rat: totals.rat.toFixed(2),
            outros: totals.outros.toFixed(2),
            total: totals.total.toFixed(2),
          },
          rows,
        },
        recordCount: rows.length,
      }),
      'perdcomp',
      {
        reportCode: 'M.08',
        operation: 'report.perdcomp.generated',
        format: 'JSON',
      },
    );

    return this.artifacts.combineResults([txt, json], {
      reportCode: 'M.08',
      operation: 'report.perdcomp.generated',
      layout: 'PERDCOMP-SGP-V1',
      formats: ['TXT', 'JSON'],
      recordCount: rows.length,
      compensationCompetence,
      totalCredit: totals.total.toFixed(2),
      inssPatronal: totals.inssPatronal.toFixed(2),
      inssSegurado: totals.inssSegurado.toFixed(2),
      rat: totals.rat.toFixed(2),
    });
  }

  private validateSummary(summary: PayrollSummaryRow): void {
    if (!EXPORTABLE_PAYROLL_STATUSES.has(summary.status)) {
      throw domainError.unprocessable(
        'PERDCOMP_PAYROLL_STATUS_NOT_EXPORTABLE',
        'PERDCOMP export requires an approved, paid, or closed payroll run',
      );
    }
  }

  private summarize(rows: PerdcompCreditRow[]): PerdcompTotals {
    const totals: PerdcompTotals = {
      inssPatronal: 0,
      inssSegurado: 0,
      rat: 0,
      outros: 0,
      total: 0,
    };
    for (const row of rows) {
      const amount = Number.parseFloat(row.total_amount);
      if (Number.isNaN(amount)) continue;
      switch (row.category) {
        case 'INSS_PATRONAL':
          totals.inssPatronal += amount;
          break;
        case 'INSS_SEGURADO':
          totals.inssSegurado += amount;
          break;
        case 'RAT':
          totals.rat += amount;
          break;
        default:
          totals.outros += amount;
      }
      totals.total += amount;
    }
    return totals;
  }

  private buildLines(
    summary: PayrollSummaryRow,
    rows: PerdcompCreditRow[],
    totals: PerdcompTotals,
  ): string[] {
    const competence = `${summary.competence_year}-${String(summary.competence_month).padStart(2, '0')}`;
    return [
      [
        'PERDCOMP',
        '0001',
        'PERDCOMP-SGP-V1',
        competence,
        summary.payroll_run_id ?? '',
        summary.status,
      ].join('|'),
      ...rows.map((row, index) =>
        [
          'CREDIT',
          String(index + 1).padStart(6, '0'),
          row.category,
          row.rubric_code,
          row.entry_kind,
          row.employee_count,
          decimal(row.total_amount, 2),
          sanitize(row.rubric_description),
        ].join('|'),
      ),
      [
        'TOTAL',
        String(rows.length),
        totals.inssPatronal.toFixed(2),
        totals.inssSegurado.toFixed(2),
        totals.rat.toFixed(2),
        totals.outros.toFixed(2),
        totals.total.toFixed(2),
      ].join('|'),
    ];
  }

  private compensationCompetence(
    job: ReportJobRow,
    summary: PayrollSummaryRow,
  ): string {
    const explicit = job.parameters?.['compensationCompetence'];
    if (typeof explicit === 'string' && /^\d{4}-\d{2}$/.test(explicit)) {
      return explicit;
    }
    const month =
      summary.competence_month >= 12 ? 1 : summary.competence_month + 1;
    const year =
      summary.competence_month >= 12
        ? summary.competence_year + 1
        : summary.competence_year;
    return `${year}-${String(month).padStart(2, '0')}`;
  }
}

function decimal(value: string, scale: number): string {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) return (0).toFixed(scale);
  return parsed.toFixed(scale);
}

function sanitize(value: string): string {
  return value.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
}
