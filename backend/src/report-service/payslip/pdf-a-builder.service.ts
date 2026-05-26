import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type {
  PdfAValidateOptions,
  PdfAValidationResult,
  PdfAValidator,
} from '@stynx/pdf-a';
import { PdfVerificationEvidenceAppender } from '@stynx/pdf/evidence';
import { PublicPayrollPdfBuilder } from '@stynx/pdf/public-payroll';

import { PayslipDocument } from './payslip-template';
import { YearlyIncomeDocument } from '../yearly-income/yearly-income-template';
import {
  NoopPdfAValidator,
  PDF_A_VALIDATOR,
} from '../pdf-a/pdf-a-validator.provider';

export interface PdfAStyleValidationResult {
  valid: boolean;
  reasons: string[];
}

/**
 * Audit record returned by build+validate helpers. The `pdfAValidation` field
 * is the structured veraPDF result captured per phased adoption policy: at
 * runtime we log warn-only (do not throw) when `valid` is false; build-time
 * gates (W05) and telemetry (W04) consume this same shape.
 */
export interface PdfABuildAuditRecord {
  buffer: Buffer;
  pdfAValidation: PdfAValidationResult;
}

const DEFAULT_PDF_A_OPTS: PdfAValidateOptions = {
  version: 'A-2',
  conformance: 'b',
};

@Injectable()
export class PdfABuilderService {
  private readonly builder: PublicPayrollPdfBuilder;
  private readonly logger = new Logger(PdfABuilderService.name);
  private readonly validator: PdfAValidator;

  constructor(
    @Optional()
    private readonly evidenceAppender: PdfVerificationEvidenceAppender = new PdfVerificationEvidenceAppender(
      { defaultSignerName: 'SGP report-service' },
    ),
    @Optional()
    @Inject(PDF_A_VALIDATOR)
    validator?: PdfAValidator,
  ) {
    this.builder = new PublicPayrollPdfBuilder({
      appendEvidence: (input) =>
        this.evidenceAppender.embedVerificationHint(input),
    });
    this.validator = validator ?? new NoopPdfAValidator();
  }

  async buildPayslip(document: PayslipDocument): Promise<Buffer> {
    const { buffer } = await this.buildPayslipWithAudit(document);
    return buffer;
  }

  async buildPayslipWithAudit(
    document: PayslipDocument,
  ): Promise<PdfABuildAuditRecord> {
    const bytes = await this.builder.buildPayslip(document);
    const buffer = Buffer.from(bytes);
    const pdfAValidation = await this.runValidation(bytes, 'payslip');
    return { buffer, pdfAValidation };
  }

  validatePdfA1b(buffer: Buffer): PdfAStyleValidationResult {
    return this.builder.validatePdfAStyle(buffer);
  }

  async buildYearlyIncome(document: YearlyIncomeDocument): Promise<Buffer> {
    return Buffer.from(await this.builder.buildYearlyIncome(document));
  }

  private async runValidation(
    pdf: Uint8Array,
    label: string,
  ): Promise<PdfAValidationResult> {
    const result = await this.validator.validate(pdf, DEFAULT_PDF_A_OPTS);
    if (!result.valid) {
      // Phased adoption policy (SGP R11): runtime warn-only, document persists.
      // W04 will wire telemetry counters from this same path.
      const ruleIds = result.errors.map((err) => err.ruleId).join(',');
      this.logger.warn(
        `PDF/A validation reported non-conformance for ${label}; ` +
          `rulesetVersion=${result.rulesetVersion} ` +
          `errorCount=${result.errors.length} ` +
          `ruleIds=${ruleIds || '(none)'}`,
      );
    }
    return result;
  }
}
