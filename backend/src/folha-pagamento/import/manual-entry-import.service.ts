import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import {
  PayrollItemImportAcceptedRow,
  PayrollItemImportRejectedRow,
  PayrollItemImportResult,
  PayrollItemXlsxImportService,
  UploadedPayrollItemXlsxFile,
} from './payroll-item-xlsx-import.pipeline';

export type UploadedManualEntryXlsxFile = UploadedPayrollItemXlsxFile;
export type ManualEntryImportAcceptedRow = PayrollItemImportAcceptedRow;
export type ManualEntryImportRejectedRow = PayrollItemImportRejectedRow;

export interface ManualEntryImportResult extends PayrollItemImportResult {
  folhaPagamentoId: string;
}

@Injectable()
export class ManualEntryImportService {
  private readonly importer: PayrollItemXlsxImportService;

  constructor(databaseService: DatabaseService) {
    this.importer = new PayrollItemXlsxImportService(databaseService);
  }

  async importFile(
    payrollRunId: string,
    file: UploadedManualEntryXlsxFile | undefined,
  ): Promise<ManualEntryImportResult> {
    const result = await this.importer.importFile(payrollRunId, file, {
      defaultFileName: 'manual-entry-import.xlsx',
      databaseRequiredMessage:
        'DATABASE_URL is required for manual entry imports',
      closedStatusMessage: 'cannot receive manual entry imports',
      missingRubricaMessage: 'payroll item code is required',
      historyNote: 'Manual entry XLSX import',
      historyKind: 'MANUAL_ENTRY_XLSX_IMPORT',
      defaultRowNote: (rowNumber) =>
        `Manual entry XLSX import row ${rowNumber}`,
      amountValidation: 'positive',
    });
    return { ...result, folhaPagamentoId: result.payrollRunId };
  }
}
