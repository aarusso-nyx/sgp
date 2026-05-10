import { domainError } from '../../common/errors/domain-error';

export interface SiconfiFiscalStatementInput {
  sourceStatus: 'CALLER_SELECTED_OFFICIAL_LAYOUT';
  declaration: 'RREO' | 'RGF';
  layoutEdition: string;
  sourceUrl: string;
  tenantIbgeCode: string;
  period: string;
  rows: SiconfiFiscalStatementRow[];
}

export interface SiconfiFiscalStatementRow {
  annex: string;
  table: string;
  accountCode: string;
  label: string;
  value: string;
}

export class SiconfiRreoRgfGenerator {
  generateCsv(input: SiconfiFiscalStatementInput): string {
    if (input.sourceStatus !== 'CALLER_SELECTED_OFFICIAL_LAYOUT') {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'Siconfi RREO/RGF generation requires a caller-selected official layout.',
      );
    }
    if (!input.layoutEdition || !input.sourceUrl) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'layoutEdition and sourceUrl are required',
      );
    }

    const rows = input.rows.map((row) => [
      input.declaration,
      input.layoutEdition,
      input.sourceUrl,
      input.tenantIbgeCode,
      input.period,
      row.annex,
      row.table,
      row.accountCode,
      row.label,
      row.value,
    ]);
    return toCsv([
      [
        'declaration',
        'layout_edition',
        'source_url',
        'tenant_ibge_code',
        'period',
        'annex',
        'table',
        'account_code',
        'label',
        'value',
      ],
      ...rows,
    ]);
  }
}

function toCsv(rows: string[][]): string {
  return `${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`;
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}
