import { Injectable } from '@nestjs/common';

import { buildReportJson, buildReportText } from './report-artifact.builder';
import { ReportWorkerArtifactsService } from './report-worker-artifacts.service';
import { ReportWorkerDataService } from './report-worker-data.service';
import { fileName } from './report-worker-formatting';
import {
  ManadPayrollRow,
  PayrollSummaryRow,
  ReportJobRow,
  WorkerResult,
} from './report-worker.types';
import { domainError } from '../common/errors/domain-error';

const EXPORTABLE_PAYROLL_STATUSES = new Set(['APPROVED', 'PAID', 'CLOSED']);

@Injectable()
export class ManadExportReportService {
  constructor(
    private readonly data: ReportWorkerDataService,
    private readonly artifacts: ReportWorkerArtifactsService,
  ) {}

  async generate(job: ReportJobRow): Promise<WorkerResult> {
    const summary = await this.data.loadPayrollSummary(job);
    this.validateSummary(summary);
    const rows = await this.data.loadManadPayrollRows(job);
    const totals = summarize(rows);
    const lines = manadLines(summary, rows, totals);
    const txt = await this.artifacts.persistResult(
      job,
      buildReportText({
        fileName: fileName('m-06-manad', summary, 'txt'),
        lines,
        recordCount: rows.length,
      }),
      'manad',
      {
        reportCode: 'M.06',
        operation: 'report.manad.generated',
        format: 'TXT',
      },
    );
    const json = await this.artifacts.persistResult(
      job,
      buildReportJson({
        fileName: fileName('m-06-manad', summary, 'json'),
        payload: {
          reportCode: 'M.06',
          layout: 'MANAD-SGP-V1',
          competenceYear: summary.competence_year,
          competenceMonth: summary.competence_month,
          payrollRunId: summary.payroll_run_id,
          status: summary.status,
          totals,
          rows,
        },
        recordCount: rows.length,
      }),
      'manad',
      {
        reportCode: 'M.06',
        operation: 'report.manad.generated',
        format: 'JSON',
      },
    );

    return this.artifacts.combineResults([txt, json], {
      reportCode: 'M.06',
      operation: 'report.manad.generated',
      layout: 'MANAD-SGP-V1',
      formats: ['TXT', 'JSON'],
      recordCount: rows.length,
      totalEarnings: totals.earnings.toFixed(2),
      totalDeductions: totals.deductions.toFixed(2),
      netTotal: totals.net.toFixed(2),
    });
  }

  private validateSummary(summary: PayrollSummaryRow): void {
    if (!EXPORTABLE_PAYROLL_STATUSES.has(summary.status)) {
      throw domainError.unprocessable(
        'MANAD_PAYROLL_STATUS_NOT_EXPORTABLE',
        'MANAD export requires an approved, paid, or closed payroll run',
      );
    }
  }
}

function manadLines(
  summary: PayrollSummaryRow,
  rows: ManadPayrollRow[],
  totals: ReturnType<typeof summarize>,
): string[] {
  const competence = `${summary.competence_year}-${String(summary.competence_month).padStart(2, '0')}`;
  return [
    [
      'MANAD',
      '0001',
      'MANAD-SGP-V1',
      competence,
      summary.payroll_run_id ?? '',
      summary.status,
    ].join('|'),
    ...rows.map((row, index) =>
      [
        'ITEM',
        String(index + 1).padStart(6, '0'),
        row.employee_registration,
        digits(row.employee_cpf),
        row.rubric_code,
        row.entry_kind,
        decimal(row.quantity, 4),
        decimal(row.reference_value, 2),
        decimal(row.amount, 2),
        sanitize(row.rubric_description),
      ].join('|'),
    ),
    [
      'TOTAL',
      rows.length,
      totals.earnings.toFixed(2),
      totals.deductions.toFixed(2),
      totals.net.toFixed(2),
    ].join('|'),
  ];
}

function summarize(rows: ManadPayrollRow[]): {
  earnings: number;
  deductions: number;
  net: number;
} {
  return rows.reduce(
    (accumulator, row) => {
      const amount = Number(row.amount);
      if (row.entry_kind === 'DEDUCTION') {
        accumulator.deductions += amount;
      } else if (row.entry_kind === 'EARNING') {
        accumulator.earnings += amount;
      }
      accumulator.net = accumulator.earnings - accumulator.deductions;
      return accumulator;
    },
    { earnings: 0, deductions: 0, net: 0 },
  );
}

function digits(value: string): string {
  return value.replace(/\D/g, '');
}

function decimal(value: string, scale: number): string {
  return Number(value).toFixed(scale);
}

function sanitize(value: string): string {
  return value.replace(/[|\r\n]/g, ' ').trim();
}
