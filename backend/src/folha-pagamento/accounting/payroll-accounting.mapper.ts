import {
  AccountingAccountRow,
  CatalogRow,
  PayrollCatalogRecord,
} from './payroll-accounting.types';

export class PayrollAccountingMapper {
  toRecordStatus(active?: boolean): 'ACTIVE' | 'INACTIVE' {
    return active === false ? 'INACTIVE' : 'ACTIVE';
  }

  toCatalogRecord(
    row: CatalogRow | AccountingAccountRow,
  ): PayrollCatalogRecord {
    return {
      id: row.id,
      code: row.code,
      description: row.description,
      active: row.active,
      metadata: row.metadata ?? {},
      createdAt: this.toIso(row.created_at),
      updatedAt: this.toIso(row.updated_at),
    };
  }

  private toIso(value: Date | string): string {
    return value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();
  }
}
