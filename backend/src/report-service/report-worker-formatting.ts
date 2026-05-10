import type { ReportTable } from './report-artifact.builder';
import type { PayrollSummaryRow, ReportLineRow } from './report-worker.types';

export function table(title: string, rows: ReportLineRow[]): ReportTable {
  return {
    title,
    columns: ['Descricao', 'Servidores', 'Proventos', 'Descontos', 'Liquido'],
    rows: rows.map((row) => [
      row.label,
      row.employee_count,
      row.total_earnings,
      row.total_deductions,
      row.total_net,
    ]),
  };
}

export function summaryLines(row: PayrollSummaryRow): string[] {
  return [
    `Folha: ${row.payroll_run_id ?? 'por competencia'}`,
    `Status: ${row.status}`,
    `Filial: ${row.branch_name ?? 'Todas'}`,
    `Servidores: ${row.employee_count}`,
    `Total proventos: ${row.total_earnings}`,
    `Total descontos: ${row.total_deductions}`,
    `Total liquido: ${row.total_net}`,
  ];
}

export function withTotals(
  summary: PayrollSummaryRow,
  rows: ReportLineRow[],
): ReportLineRow[] {
  return [
    ...rows,
    {
      label: 'Total geral',
      employee_count: summary.employee_count,
      total_earnings: summary.total_earnings,
      total_deductions: summary.total_deductions,
      total_net: summary.total_net,
    },
  ];
}

export function fileName(
  prefix: string,
  summary: PayrollSummaryRow,
  extension: 'csv' | 'json' | 'pdf' | 'txt' | 'xlsx',
): string {
  return `${prefix}-${summary.competence_year}-${String(summary.competence_month).padStart(2, '0')}.${extension}`;
}

export function competenceLabel(summary: PayrollSummaryRow): string {
  return `Competencia ${summary.competence_year}-${String(summary.competence_month).padStart(2, '0')}`;
}
