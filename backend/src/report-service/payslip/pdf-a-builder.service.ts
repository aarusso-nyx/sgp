import { Injectable, Optional } from '@nestjs/common';
import { PdfVerificationEvidenceAppender } from '@stynx/pdf/evidence';
import { PublicPayrollPdfBuilder } from '@stynx/pdf/public-payroll';

import { PayslipDocument } from './payslip-template';
import { YearlyIncomeDocument } from '../yearly-income/yearly-income-template';

export interface PdfAValidationResult {
  valid: boolean;
  reasons: string[];
}

@Injectable()
export class PdfABuilderService {
  private readonly builder: PublicPayrollPdfBuilder;

  constructor(
    @Optional()
    private readonly evidenceAppender: PdfVerificationEvidenceAppender = new PdfVerificationEvidenceAppender(
      { defaultSignerName: 'SGP report-service' },
    ),
  ) {
    this.builder = new PublicPayrollPdfBuilder({
      appendEvidence: (input) =>
        this.evidenceAppender.embedVerificationHint(input),
    });
  }

  async buildPayslip(document: PayslipDocument): Promise<Buffer> {
    return Buffer.from(await this.builder.buildPayslip(document));
  }

  validatePdfA1b(buffer: Buffer): PdfAValidationResult {
    return this.builder.validatePdfAStyle(buffer);
  }

  async buildYearlyIncome(document: YearlyIncomeDocument): Promise<Buffer> {
    return Buffer.from(await this.builder.buildYearlyIncome(document));
  }
}
