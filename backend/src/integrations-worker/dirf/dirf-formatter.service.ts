import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';

import {
  DirfArquivoKind,
  DirfBeneficiaryKind,
  DirfSourcePayment,
} from './dirf.dto';

export const DIRF_LAYOUT_VERSION_PREFIX = 'DIRF-RFB-2.060';

export interface DirfBeneficiaryBlock {
  cpfCnpj: string;
  kind: DirfBeneficiaryKind;
  name: string;
  totals: {
    amount: string;
    irrf: string;
    byCode: Record<string, { amount: string; irrf: string }>;
  };
  payments: DirfSourcePayment[];
}

export interface FormatDirfInput {
  tenantId: string;
  yearBase: number;
  kind: DirfArquivoKind;
  originalArquivoId: string | null;
  layoutVersion: string;
  beneficiaries: DirfBeneficiaryBlock[];
}

/**
 * @deprecated DIRF formatting is retained only for year-base competences before
 * 2025-01-01. Use EFD-Reinf R-4000 for facts from 2025-01-01 onward.
 */
@Injectable()
export class DirfFormatterService {
  format(input: FormatDirfInput): string {
    const allPayments = input.beneficiaries.flatMap(
      (beneficiary) => beneficiary.payments,
    );
    const totalAmount = sumMoney(allPayments.map((payment) => payment.amount));
    const totalIrrf = sumMoney(allPayments.map((payment) => payment.irrf));
    const records = [
      record('DIRF', input.layoutVersion, input.yearBase, input.kind),
      record('ABERTURA', input.tenantId, input.originalArquivoId ?? ''),
      ...input.beneficiaries.flatMap((beneficiary) =>
        this.formatBeneficiary(beneficiary),
      ),
      record(
        'TOTAL',
        input.beneficiaries.length,
        allPayments.length,
        totalAmount,
        totalIrrf,
      ),
      record('FIMDIRF'),
    ];
    return `${records.join('\r\n')}\r\n`;
  }

  aggregate(payments: DirfSourcePayment[]): DirfBeneficiaryBlock[] {
    const grouped = new Map<string, DirfSourcePayment[]>();
    for (const payment of payments) {
      const key = `${payment.beneficiaryKind}:${payment.beneficiaryDocument}`;
      grouped.set(key, [...(grouped.get(key) ?? []), payment]);
    }

    return [...grouped.values()]
      .map((items) => this.toBeneficiary(items))
      .sort((left, right) => left.cpfCnpj.localeCompare(right.cpfCnpj));
  }

  private toBeneficiary(payments: DirfSourcePayment[]): DirfBeneficiaryBlock {
    const first = payments[0]!;
    const byCode: Record<string, { amount: string; irrf: string }> = {};
    for (const payment of payments) {
      const current = byCode[payment.revenueCode] ?? {
        amount: '0.00',
        irrf: '0.00',
      };
      byCode[payment.revenueCode] = {
        amount: new Decimal(current.amount).plus(payment.amount).toFixed(2),
        irrf: new Decimal(current.irrf).plus(payment.irrf).toFixed(2),
      };
    }
    return {
      cpfCnpj: first.beneficiaryDocument,
      kind: first.beneficiaryKind,
      name: first.beneficiaryName,
      totals: {
        amount: sumMoney(payments.map((payment) => payment.amount)),
        irrf: sumMoney(payments.map((payment) => payment.irrf)),
        byCode,
      },
      payments: [...payments].sort((left, right) => {
        const codeOrder = left.revenueCode.localeCompare(right.revenueCode);
        return codeOrder || left.monthYear.localeCompare(right.monthYear);
      }),
    };
  }

  private formatBeneficiary(beneficiary: DirfBeneficiaryBlock): string[] {
    return [
      record(
        'BENEF',
        beneficiary.kind,
        beneficiary.cpfCnpj,
        beneficiary.name,
        beneficiary.totals.amount,
        beneficiary.totals.irrf,
      ),
      ...beneficiary.payments.map((payment) =>
        record(
          'PAGTO',
          payment.revenueCode,
          payment.monthYear.slice(0, 7),
          payment.amount,
          payment.irrf,
          JSON.stringify(payment.deductions),
        ),
      ),
    ];
  }
}

export function layoutVersionForYear(yearBase: number): string {
  return `${DIRF_LAYOUT_VERSION_PREFIX}/${yearBase}`;
}

export function record(...fields: Array<string | number>): string {
  return `${fields.map((field) => sanitizeField(String(field))).join('|')}|`;
}

function sanitizeField(value: string): string {
  return value.replace(/[|\r\n]/g, ' ').trim();
}

function sumMoney(values: string[]): string {
  return values
    .reduce((total, value) => total.plus(value), new Decimal(0))
    .toFixed(2);
}
