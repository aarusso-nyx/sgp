export interface SiopsExportInput {
  sourceStatus: 'CALLER_SELECTED_OFFICIAL_LAYOUT';
  layoutEdition: string;
  sourceUrl: string;
  tenantIbgeCode: string;
  period: string;
  rows: SiopsExportRow[];
}

export interface SiopsExportRow {
  category: 'ASPS' | 'HEALTH_REVENUE' | 'HEALTH_EXPENSE';
  accountCode: string;
  label: string;
  value: string;
}

export class SiopsExportGenerator {
  generateCsv(input: SiopsExportInput): string {
    if (input.sourceStatus !== 'CALLER_SELECTED_OFFICIAL_LAYOUT') {
      throw new Error(
        'SIOPS generation requires a caller-selected official layout.',
      );
    }
    return toCsv([
      [
        'layout_edition',
        'source_url',
        'tenant_ibge_code',
        'period',
        'category',
        'account_code',
        'label',
        'value',
      ],
      ...input.rows.map((row) => [
        input.layoutEdition,
        input.sourceUrl,
        input.tenantIbgeCode,
        input.period,
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
