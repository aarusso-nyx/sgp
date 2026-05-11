import {
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import type { UploadedXlsxFile } from './servidor-import.service';
import { PensionistaImportParserService } from './pensionista-import-parser.service';
import { PensionistaImportPersistenceService } from './pensionista-import-persistence.service';
import { PensionistaImportValidationService } from './pensionista-import-validation.service';
import type { PensionistaImportResult } from './pensionista-import.types';

export type {
  PensionistaImportAcceptedRow,
  PensionistaImportRejectedRow,
  PensionistaImportResult,
} from './pensionista-import.types';

@Injectable()
export class PensionistaImportService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Optional()
    private readonly parser: PensionistaImportParserService = new PensionistaImportParserService(),
    @Optional()
    private readonly validator: PensionistaImportValidationService = new PensionistaImportValidationService(),
    @Optional()
    private readonly persistence: PensionistaImportPersistenceService = new PensionistaImportPersistenceService(),
  ) {}

  async importFile(
    payrollRunId: string,
    file: UploadedXlsxFile | undefined,
  ): Promise<PensionistaImportResult> {
    this.ensureDatabase();

    const parsed = this.parser.parse(file);

    return this.databaseService.transaction(async (client) => {
      const validation = await this.validator.validate(
        client,
        payrollRunId,
        parsed.rows,
      );

      return this.persistence.persist(
        client,
        payrollRunId,
        parsed.fileName,
        parsed.fileHash,
        parsed.rows,
        validation,
      );
    });
  }

  private ensureDatabase(): void {
    if (!this.databaseService.configured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is required for payroll imports',
      );
    }
  }
}
