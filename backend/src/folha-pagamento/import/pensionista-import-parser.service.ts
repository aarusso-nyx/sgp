import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

import { parseFirstWorksheet, XlsxTableRow } from './xlsx-table.parser';
import type { UploadedXlsxFile } from './servidor-import.service';
import type {
  PensionistaNormalizedImportRow,
  PensionistaParsedImportFile,
} from './pensionista-import.types';

const MAX_XLSX_BYTES = 10 * 1024 * 1024;

@Injectable()
export class PensionistaImportParserService {
  parse(file: UploadedXlsxFile | undefined): PensionistaParsedImportFile {
    this.ensureFile(file);

    const fileName = file.originalname ?? 'pensionista-import.xlsx';
    const fileHash = createHash('sha256').update(file.buffer).digest('hex');
    const tableRows = parseFirstWorksheet(file.buffer);

    return {
      fileName,
      fileHash,
      rows: this.normalizeRows(tableRows),
    };
  }

  private ensureFile(
    file: UploadedXlsxFile | undefined,
  ): asserts file is UploadedXlsxFile {
    if (!file?.buffer?.length) {
      throw new BadRequestException('XLSX file is required');
    }
    if ((file.size ?? file.buffer.length) > MAX_XLSX_BYTES) {
      throw new BadRequestException('XLSX file exceeds the 10 MB limit');
    }
    const name = file.originalname ?? '';
    if (name && !name.toLowerCase().endsWith('.xlsx')) {
      throw new BadRequestException('Only .xlsx files are accepted');
    }
  }

  private normalizeRows(
    rows: XlsxTableRow[],
  ): PensionistaNormalizedImportRow[] {
    return rows.map((row, index) => {
      const rowNumber = index + 2;
      const pensionId = this.requiredUuid(
        this.first(row, ['pensao_id', 'pension_grant_id', 'pension_id']),
        rowNumber,
        'pensao_id',
      );
      const pensionistaRegistration = this.first(row, [
        'matricula_pensionista',
        'pensionista_matricula',
        'beneficiario_matricula',
        'matricula',
        'registro',
        'employee_registration',
      ]);
      const pensionistaEmployeeId = this.uuid(
        this.first(row, [
          'pensionista_id',
          'employee_id',
          'beneficiario_employee_id',
        ]),
        rowNumber,
        'pensionista_id',
      );
      const pensionBeneficiaryId = this.uuid(
        this.first(row, [
          'beneficiario_id',
          'recertification_beneficiary_id',
          'pensionista_beneficiario_id',
        ]),
        rowNumber,
        'beneficiario_id',
      );
      const earningDeductionCode = this.first(row, [
        'verba',
        'rubrica',
        'codigo_verba',
        'verba_codigo',
        'codigo_rubrica',
        'rubrica_codigo',
      ]).toUpperCase();
      const amount = this.money(
        this.first(row, ['valor', 'amount']),
        rowNumber,
        'valor',
      );
      const quantity = this.optionalDecimal(
        this.first(row, ['quantidade', 'qtd', 'quantity']),
        rowNumber,
        'quantidade',
        4,
      );
      const referenceValue = this.optionalDecimal(
        this.first(row, ['referencia', 'valor_referencia', 'reference_value']),
        rowNumber,
        'referencia',
        2,
      );
      const notes = this.first(row, [
        'observacao',
        'observacoes',
        'notes',
        'comentario',
      ]);

      if (
        !pensionistaRegistration &&
        !pensionistaEmployeeId &&
        !pensionBeneficiaryId
      ) {
        throw new BadRequestException(
          `Row ${rowNumber}: pensionista registration, pensionista_id, or beneficiario_id is required`,
        );
      }
      if (!earningDeductionCode) {
        throw new BadRequestException(
          `Row ${rowNumber}: rubrica code is required`,
        );
      }

      return {
        rowNumber,
        pensionId,
        pensionistaRegistration,
        pensionistaEmployeeId,
        pensionBeneficiaryId,
        earningDeductionCode,
        amount,
        quantity,
        referenceValue,
        notes,
      };
    });
  }

  private first(row: XlsxTableRow, keys: string[]): string {
    for (const key of keys) {
      const value = row[key]?.trim();
      if (value) return value;
    }
    return '';
  }

  private money(value: string, rowNumber: number, label: string): string {
    const normalized = this.normalizeDecimal(value);
    const number = Number(normalized);
    if (!normalized || !Number.isFinite(number) || number < 0) {
      throw new BadRequestException(
        `Row ${rowNumber}: ${label} must be non-negative`,
      );
    }
    return number.toFixed(2);
  }

  private optionalDecimal(
    value: string,
    rowNumber: number,
    label: string,
    scale: number,
  ): string | null {
    if (!value) return null;
    const normalized = this.normalizeDecimal(value);
    const number = Number(normalized);
    if (!Number.isFinite(number) || number < 0) {
      throw new BadRequestException(
        `Row ${rowNumber}: ${label} must be non-negative`,
      );
    }
    return number.toFixed(scale);
  }

  private normalizeDecimal(value: string): string {
    const compact = value.trim().replace(/\s+/g, '');
    if (!compact) return '';
    if (compact.includes(',')) {
      return compact.replace(/\./g, '').replace(',', '.');
    }
    return compact;
  }

  private requiredUuid(
    value: string,
    rowNumber: number,
    label: string,
  ): string {
    const id = this.uuid(value, rowNumber, label);
    if (!id) {
      throw new BadRequestException(`Row ${rowNumber}: ${label} is required`);
    }
    return id;
  }

  private uuid(value: string, rowNumber: number, label: string): string | null {
    if (!value) return null;
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
        value,
      )
    ) {
      throw new BadRequestException(`Row ${rowNumber}: ${label} is not a UUID`);
    }
    return value;
  }
}
