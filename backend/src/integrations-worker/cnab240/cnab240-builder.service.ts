import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';

import { bbStrategy } from './banks/bb.strategy';
import { bradescoStrategy } from './banks/bradesco.strategy';
import { caixaStrategy } from './banks/caixa.strategy';
import { itauStrategy } from './banks/itau.strategy';
import { santanderStrategy } from './banks/santander.strategy';
import type { BankStrategy } from './banks/bank-strategy';

export interface FileHeader {
  bankCode: string;
  companyName: string;
  companyRegistration: string;
  generatedAt: Date;
  remittanceNumber: number;
}

export interface BatchHeader {
  bankCode: string;
  companyName: string;
  companyRegistration: string;
  paymentDate: string;
}

export interface SegmentA {
  sequence: number;
  employeeId: string;
  alimonyId?: string | null;
  beneficiaryName: string;
  bankCode: string;
  branch: string;
  branchDigit?: string | null;
  account: string;
  accountDigit: string;
  amount: string;
  paymentDate: string;
  purposeCode?: string | null;
}

export interface SegmentB {
  sequence: number;
  employeeId: string;
  beneficiaryDocument: string;
}

export interface BatchTrailer {
  recordCount: number;
  totalAmount: string;
}

export interface FileTrailer {
  batchCount: number;
  recordCount: number;
}

export interface Cnab240PaymentInput {
  employeeId: string;
  alimonyId?: string | null;
  employeeName: string;
  employeeDocument: string;
  bankCode: string;
  branch: string;
  branchDigit?: string | null;
  account: string;
  accountDigit: string;
  amount: string;
  purposeCode?: string | null;
}

export interface Cnab240BuildInput {
  bankCode: string;
  companyName: string;
  companyRegistration: string;
  paymentDate: string;
  generatedAt?: Date;
  remittanceNumber: number;
  payments: Cnab240PaymentInput[];
}

export interface Cnab240BuildResult {
  fileName: string;
  contentType: string;
  format: 'CNAB240';
  content: Buffer;
  recordCount: number;
  totalAmount: string;
  fileHash: string;
  layoutVersion: string;
  details: Array<{
    sequence: number;
    employeeId: string;
    amount: string;
    bankCode: number;
    branch: string;
    account: string;
    purposeCode: string | null;
    alimonyId: string | null;
  }>;
}

const RECORD_SIZE = 240;
const BATCH_NUMBER = 1;

const STRATEGIES = new Map<string, BankStrategy>(
  [
    bbStrategy,
    caixaStrategy,
    itauStrategy,
    bradescoStrategy,
    santanderStrategy,
  ].map((strategy) => [strategy.bankCode, strategy]),
);

@Injectable()
export class Cnab240BuilderService {
  build(input: Cnab240BuildInput): Cnab240BuildResult {
    const bankCode = numeric(input.bankCode, 3);
    const strategy = STRATEGIES.get(bankCode);
    if (!strategy) {
      throw new Error(`Unsupported CNAB 240 bank code: ${bankCode}`);
    }
    if (input.payments.length === 0) {
      throw new Error('CNAB 240 remittance requires at least one payment');
    }

    const generatedAt = input.generatedAt ?? new Date();
    const normalizedPayments = input.payments.map((payment, index) =>
      this.toPayment(payment, index + 1, input.paymentDate),
    );
    const totalAmount = normalizedPayments
      .reduce((total, payment) => total.plus(payment.amount), new Decimal(0))
      .toFixed(2);
    const batchRecordCount = normalizedPayments.length * 2 + 2;
    const fileRecordCount = batchRecordCount + 2;
    const lines = [
      this.fileHeader(strategy, {
        bankCode,
        companyName: input.companyName,
        companyRegistration: input.companyRegistration,
        generatedAt,
        remittanceNumber: input.remittanceNumber,
      }),
      this.batchHeader(strategy, {
        bankCode,
        companyName: input.companyName,
        companyRegistration: input.companyRegistration,
        paymentDate: input.paymentDate,
      }),
      ...normalizedPayments.flatMap((payment) => [
        this.segmentA(strategy, payment),
        this.segmentB(strategy, {
          sequence: payment.sequence + 1,
          employeeId: payment.employeeId,
          beneficiaryDocument: payment.beneficiaryDocument,
        }),
      ]),
      this.batchTrailer(strategy, {
        recordCount: batchRecordCount,
        totalAmount,
      }),
      this.fileTrailer(strategy, {
        batchCount: 1,
        recordCount: fileRecordCount,
      }),
    ];
    const content = Buffer.from(lines.join(''), 'ascii');
    const fileHash = createHash('sha256').update(content).digest('hex');

    return {
      fileName: `remessa_${bankCode}_${String(input.remittanceNumber).padStart(6, '0')}.rem`,
      contentType: 'application/octet-stream',
      format: 'CNAB240',
      content,
      recordCount: lines.length,
      totalAmount,
      fileHash,
      layoutVersion: strategy.layoutVersion,
      details: normalizedPayments.map((payment) => ({
        sequence: payment.sequence,
        employeeId: payment.employeeId,
        amount: payment.amount,
        bankCode: Number(bankCode),
        branch: payment.branch,
        account: `${payment.account}-${payment.accountDigit}`,
        purposeCode: payment.purposeCode ?? null,
        alimonyId: payment.alimonyId ?? null,
      })),
    };
  }

  validateTotals(content: Buffer): boolean {
    if (content.byteLength === 0 || content.byteLength % RECORD_SIZE !== 0) {
      return false;
    }
    const lines = splitRecords(content);
    const detailTotal = lines
      .filter((line) => line.slice(7, 8) === '3' && line.slice(13, 14) === 'A')
      .reduce(
        (total, line) => total.plus(new Decimal(line.slice(119, 134) || '0')),
        new Decimal(0),
      );
    const batchTrailer = lines.find((line) => line.slice(7, 8) === '5');
    const fileTrailer = lines.find((line) => line.slice(7, 8) === '9');
    if (!batchTrailer || !fileTrailer) return false;

    const expectedBatchRecords = Number(batchTrailer.slice(17, 23));
    const expectedFileRecords = Number(fileTrailer.slice(23, 29));
    const expectedTotal = new Decimal(batchTrailer.slice(23, 41) || '0');
    return (
      expectedBatchRecords === lines.length - 2 &&
      expectedFileRecords === lines.length &&
      expectedTotal.equals(detailTotal)
    );
  }

  private fileHeader(strategy: BankStrategy, input: FileHeader): string {
    return line([
      [1, numeric(input.bankCode, 3)],
      [4, '0000'],
      [8, '0'],
      [18, '2'],
      [19, numeric(input.companyRegistration, 14)],
      [33, alpha(strategy.fields.convenio, 20)],
      [53, numeric(strategy.fields.agencyAgreement, 5)],
      [59, numeric(input.remittanceNumber, 12)],
      [73, alpha(input.companyName, 30)],
      [103, alpha(strategy.bankName, 30)],
      [143, '1'],
      [144, date8(input.generatedAt)],
      [152, time6(input.generatedAt)],
      [158, numeric(input.remittanceNumber, 6)],
      [164, '108'],
      [167, numeric(RECORD_SIZE, 5)],
      [172, alpha(strategy.fields.modality, 20)],
    ]);
  }

  private batchHeader(strategy: BankStrategy, input: BatchHeader): string {
    return line([
      [1, numeric(input.bankCode, 3)],
      [4, numeric(BATCH_NUMBER, 4)],
      [8, '1'],
      [9, 'C'],
      [10, '30'],
      [12, '01'],
      [14, '045'],
      [18, '2'],
      [19, numeric(input.companyRegistration, 14)],
      [33, alpha(strategy.fields.convenio, 20)],
      [53, numeric(strategy.fields.agencyAgreement, 5)],
      [73, alpha(input.companyName, 30)],
      [143, alpha('PAGAMENTO DE FOLHA', 30)],
      [193, dateString8(input.paymentDate)],
    ]);
  }

  private segmentA(strategy: BankStrategy, input: SegmentA): string {
    return line([
      [1, numeric(strategy.bankCode, 3)],
      [4, numeric(BATCH_NUMBER, 4)],
      [8, '3'],
      [9, numeric(input.sequence, 5)],
      [14, 'A'],
      [15, '0'],
      [16, '00'],
      [18, numeric(input.bankCode, 3)],
      [21, numeric(input.branch, 5)],
      [26, alpha(input.branchDigit ?? '', 1)],
      [27, numeric(input.account, 12)],
      [39, alpha(input.accountDigit, 1)],
      [44, alpha(input.beneficiaryName, 30)],
      [74, alpha(input.employeeId, 20)],
      [94, dateString8(input.paymentDate)],
      [102, 'BRL'],
      [120, moneyCents(input.amount, 15)],
      [135, alpha(strategy.fields.modality, 20)],
      [231, alpha(input.purposeCode ?? '00000', 5)],
    ]);
  }

  private segmentB(strategy: BankStrategy, input: SegmentB): string {
    return line([
      [1, numeric(strategy.bankCode, 3)],
      [4, numeric(BATCH_NUMBER, 4)],
      [8, '3'],
      [9, numeric(input.sequence, 5)],
      [14, 'B'],
      [15, '0'],
      [18, '1'],
      [19, numeric(input.beneficiaryDocument, 14)],
      [33, alpha(input.employeeId, 30)],
    ]);
  }

  private batchTrailer(strategy: BankStrategy, input: BatchTrailer): string {
    return line([
      [1, numeric(strategy.bankCode, 3)],
      [4, numeric(BATCH_NUMBER, 4)],
      [8, '5'],
      [18, numeric(input.recordCount, 6)],
      [24, moneyCents(input.totalAmount, 18)],
    ]);
  }

  private fileTrailer(strategy: BankStrategy, input: FileTrailer): string {
    return line([
      [1, numeric(strategy.bankCode, 3)],
      [4, '9999'],
      [8, '9'],
      [18, numeric(input.batchCount, 6)],
      [24, numeric(input.recordCount, 6)],
    ]);
  }

  private toPayment(
    payment: Cnab240PaymentInput,
    ordinal: number,
    paymentDate: string,
  ): SegmentA & { beneficiaryDocument: string } {
    return {
      sequence: ordinal * 2 - 1,
      employeeId: payment.employeeId,
      alimonyId: payment.alimonyId ?? null,
      beneficiaryName: payment.employeeName,
      beneficiaryDocument: payment.employeeDocument,
      bankCode: payment.bankCode,
      branch: payment.branch,
      branchDigit: payment.branchDigit,
      account: payment.account,
      accountDigit: payment.accountDigit,
      amount: new Decimal(payment.amount).toFixed(2),
      paymentDate,
      purposeCode: payment.purposeCode ?? null,
    };
  }
}

export function numeric(value: string | number, length: number): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length > length) {
    throw new Error(`CNAB numeric field overflow: ${digits.length}/${length}`);
  }
  return digits.padStart(length, '0');
}

export function alpha(value: string, length: number): string {
  const normalized = String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .toUpperCase();
  if (Buffer.byteLength(normalized, 'ascii') > length) {
    return normalized.slice(0, length);
  }
  return normalized.padEnd(length, ' ');
}

function moneyCents(value: string, length: number): string {
  const cents = new Decimal(value).toDecimalPlaces(2).mul(100).toFixed(0);
  return numeric(cents, length);
}

function line(fields: Array<[number, string]>): string {
  const chars = Array<string>(RECORD_SIZE).fill(' ');
  for (const [start, value] of fields) {
    const offset = start - 1;
    if (offset < 0 || offset + value.length > RECORD_SIZE) {
      throw new Error(`CNAB field out of bounds at ${start}`);
    }
    for (let index = 0; index < value.length; index += 1) {
      chars[offset + index] = value.charAt(index);
    }
  }
  return chars.join('');
}

function date8(value: Date): string {
  const day = String(value.getUTCDate()).padStart(2, '0');
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const year = String(value.getUTCFullYear());
  return `${day}${month}${year}`;
}

function time6(value: Date): string {
  const hour = String(value.getUTCHours()).padStart(2, '0');
  const minute = String(value.getUTCMinutes()).padStart(2, '0');
  const second = String(value.getUTCSeconds()).padStart(2, '0');
  return `${hour}${minute}${second}`;
}

function dateString8(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`CNAB date must use YYYY-MM-DD: ${value}`);
  }
  return `${match[3]}${match[2]}${match[1]}`;
}

function splitRecords(content: Buffer): string[] {
  const lines: string[] = [];
  for (let offset = 0; offset < content.byteLength; offset += RECORD_SIZE) {
    lines.push(
      content.subarray(offset, offset + RECORD_SIZE).toString('ascii'),
    );
  }
  return lines;
}
