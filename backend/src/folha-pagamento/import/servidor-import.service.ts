import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import {
  PayrollItemImportAcceptedRow,
  PayrollItemImportRejectedRow,
  PayrollItemImportResult,
  PayrollItemXlsxImportService,
  UploadedPayrollItemXlsxFile,
} from './payroll-item-xlsx-import.pipeline';

export type UploadedXlsxFile = UploadedPayrollItemXlsxFile;
export type ServidorImportAcceptedRow = PayrollItemImportAcceptedRow;
export type ServidorImportRejectedRow = PayrollItemImportRejectedRow;
export type ServidorImportResult = PayrollItemImportResult;

@Injectable()
export class ServidorImportService {
  private readonly importer: PayrollItemXlsxImportService;

  constructor(databaseService: DatabaseService) {
    this.importer = new PayrollItemXlsxImportService(databaseService);
  }

  importFile(
    payrollRunId: string,
    file: UploadedXlsxFile | undefined,
  ): Promise<ServidorImportResult> {
    return this.importer.importFile(payrollRunId, file, {
      defaultFileName: 'servidor-import.xlsx',
      databaseRequiredMessage: 'DATABASE_URL is required for payroll imports',
      closedStatusMessage: 'cannot receive imported items',
      missingRubricaMessage: 'rubrica code is required',
      historyNote: 'Servidor XLSX import',
      historyKind: 'SERVIDOR_XLSX_IMPORT',
      defaultRowNote: (rowNumber) => `Servidor XLSX import row ${rowNumber}`,
      amountValidation: 'non-negative',
    });
  }
}
