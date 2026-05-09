import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import Decimal from 'decimal.js';

import { parseBankX } from './adapters/bank-x';
import { parseBankY } from './adapters/bank-y';
import { domainError } from '../../common/errors/domain-error';

export type PortabilityLayout = 'CANONICAL_CSV' | 'BANK_X' | 'BANK_Y';

export interface ParsedPortabilityDetail {
  sequence: number;
  employeeCpf: string;
  sourceContractNumber: string;
  targetContractNumber: string;
  transferredBalance: string;
  newMonthlyAmount: string;
  newRate: string;
  newInstallmentsTotal: number;
}

@Injectable()
export class PortabilityParserService {
  parse(content: string | Buffer, layout: PortabilityLayout) {
    const text = Buffer.isBuffer(content)
      ? content.toString('utf8')
      : String(content ?? '');
    switch (layout) {
      case 'CANONICAL_CSV':
        return parseCanonicalCsv(text);
      case 'BANK_X':
        return parseBankX(text);
      case 'BANK_Y':
        return parseBankY(text);
      default: {
        const unsupportedLayout: string = layout;
        throw new UnprocessableEntityException(
          `Unsupported portability layout: ${unsupportedLayout}`,
        );
      }
    }
  }
}

export function parseCanonicalCsv(text: string): ParsedPortabilityDetail[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    throw new UnprocessableEntityException(
      'Portability file must contain a header and at least one detail line.',
    );
  }

  const header = splitCsvLine(lines[0]!).map((entry) => normalizeHeader(entry));
  const required = [
    'employee_cpf',
    'source_contract_number',
    'target_contract_number',
    'transferred_balance',
    'new_monthly_amount',
    'new_rate',
    'new_installments_total',
  ];
  for (const column of required) {
    if (!header.includes(column)) {
      throw new UnprocessableEntityException(
        `Portability file is missing required column ${column}.`,
      );
    }
  }

  return lines.slice(1).map((line, index) => {
    const values = splitCsvLine(line);
    const row = new Map(
      header.map((column, columnIndex) => [column, values[columnIndex] ?? '']),
    );
    return normalizeDetail({
      sequence: index + 1,
      employeeCpf: row.get('employee_cpf') ?? '',
      sourceContractNumber: row.get('source_contract_number') ?? '',
      targetContractNumber: row.get('target_contract_number') ?? '',
      transferredBalance: row.get('transferred_balance') ?? '',
      newMonthlyAmount: row.get('new_monthly_amount') ?? '',
      newRate: row.get('new_rate') ?? '',
      newInstallmentsTotal: Number(row.get('new_installments_total') ?? ''),
    });
  });
}

export function normalizeDetail(
  input: ParsedPortabilityDetail,
): ParsedPortabilityDetail {
  const employeeCpf = onlyDigits(input.employeeCpf);
  const sourceContractNumber = input.sourceContractNumber.trim();
  const targetContractNumber = input.targetContractNumber.trim();
  if (!/^\d{11}$/.test(employeeCpf)) {
    throw new UnprocessableEntityException(
      `Invalid CPF on portability sequence ${input.sequence}.`,
    );
  }
  if (!sourceContractNumber || !targetContractNumber) {
    throw new UnprocessableEntityException(
      `Missing contract number on portability sequence ${input.sequence}.`,
    );
  }
  if (
    !Number.isInteger(input.newInstallmentsTotal) ||
    input.newInstallmentsTotal < 1
  ) {
    throw new UnprocessableEntityException(
      `Invalid installment count on portability sequence ${input.sequence}.`,
    );
  }

  return {
    sequence: input.sequence,
    employeeCpf,
    sourceContractNumber,
    targetContractNumber,
    transferredBalance: decimal(input.transferredBalance, 2, input.sequence),
    newMonthlyAmount: decimal(input.newMonthlyAmount, 2, input.sequence),
    newRate: decimal(input.newRate, 6, input.sequence),
    newInstallmentsTotal: input.newInstallmentsTotal,
  };
}

function splitCsvLine(line: string): string[] {
  return line.split(';').map((entry) => entry.trim());
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replaceAll('-', '_');
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function decimal(value: string, scale: number, sequence: number): string {
  try {
    const parsed = new Decimal(value.replace(',', '.'));
    if (!parsed.isFinite() || parsed.isNegative()) {
      throw domainError.internal(
        'INTERNAL_INVARIANT',
        'non-negative finite decimal required',
      );
    }
    return parsed.toDecimalPlaces(scale).toFixed(scale);
  } catch {
    throw new UnprocessableEntityException(
      `Invalid decimal value on portability sequence ${sequence}.`,
    );
  }
}
