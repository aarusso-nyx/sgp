import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { PgdTaxDebitRow, SourceItem } from './dctfweb-builder.types';
import { moneyText, scalarText, uuidText } from './dctfweb-builder.util';
import { buildMitDebitId } from './mit-inclusion.service';

@Injectable()
export class DctfwebMitSectionService {
  constructor(private readonly databaseService: DatabaseService) {}

  async loadPendingMitDebits(
    tenantId: string,
    competence: string,
  ): Promise<PgdTaxDebitRow[]> {
    return this.databaseService.query<PgdTaxDebitRow>(
      `
      SELECT
        pgd_declaration_id::text,
        pgd_debit_id::text,
        cnpj_filial,
        tax_code,
        base_amount::text,
        amount::text,
        csll_adicional_amount::text,
        mit_status::text
      FROM fiscal.dctf_pgd_tax_debit
      WHERE tenant_id = $1::uuid
        AND competence = $2::date
        AND COALESCE(mit_status::text, 'PENDING') IN ('PENDING', 'REJECTED')
      ORDER BY cnpj_filial, tax_code, pgd_debit_id
      `,
      [tenantId, competence],
    );
  }

  itemFromMitDebit(
    tenantId: string,
    competence: string,
    row: PgdTaxDebitRow,
  ): SourceItem {
    const cnpjFilial = scalarText(row.cnpj_filial, '').replace(/\D/g, '');
    const debitCode = scalarText(row.tax_code, 'MIT');
    const baseAmount = moneyText(row.base_amount);
    const amount = moneyText(row.amount);
    const csllAdicionalAmount = moneyText(row.csll_adicional_amount ?? 0);
    const pgdDeclarationId = scalarText(row.pgd_declaration_id, '');
    const pgdDebitId = scalarText(row.pgd_debit_id, '');
    return {
      sourceEvent: 'MIT',
      sourceRunId: uuidText(pgdDebitId, `MIT:${pgdDeclarationId}:${debitCode}`),
      debitCode,
      baseAmount,
      amount,
      csllAdicionalAmount,
      mitStatus: row.mit_status ?? 'PENDING',
      mitDebitId: buildMitDebitId({
        tenantId,
        competence,
        cnpjFilial,
        pgdDeclarationId,
        pgdDebitId,
        taxCode: debitCode,
        amount,
      }),
      cnpjFilial,
    };
  }
}
