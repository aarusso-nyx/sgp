import { domainError } from '../../common/errors/domain-error';

export interface SiopeExportInput {
  sourceStatus: 'CALLER_SELECTED_OFFICIAL_LAYOUT';
  layoutEdition: string;
  sourceUrl: string;
  tenantIbgeCode: string;
  year: number;
  rows: SiopeExportRow[];
}

export interface SiopeExportRow {
  category: 'MDE' | 'FUNDEB' | 'SALARIO_EDUCACAO' | 'REMUNERACAO_PROFISSIONAIS';
  accountCode: string;
  label: string;
  value: string;
}

export class SiopeExportGenerator {
  generateCsv(input: SiopeExportInput): string {
    if (input.sourceStatus !== 'CALLER_SELECTED_OFFICIAL_LAYOUT') {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'SIOPE generation requires a caller-selected official layout.',
      );
    }
    return toCsv([
      [
        'layout_edition',
        'source_url',
        'tenant_ibge_code',
        'year',
        'category',
        'account_code',
        'label',
        'value',
      ],
      ...input.rows.map((row) => [
        input.layoutEdition,
        input.sourceUrl,
        input.tenantIbgeCode,
        String(input.year),
        row.category,
        row.accountCode,
        row.label,
        row.value,
      ]),
    ]);
  }
}

function toCsv(rows: string[][]): string {
  return `${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`;
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}
