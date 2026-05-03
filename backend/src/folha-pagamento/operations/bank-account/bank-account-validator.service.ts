import { Injectable } from '@nestjs/common';

export type BankAccountErrorCode =
  | 'BANK_NOT_SUPPORTED'
  | 'AGENCY_LENGTH_INVALID'
  | 'AGENCY_DIGIT_INVALID'
  | 'ACCOUNT_LENGTH_INVALID'
  | 'ACCOUNT_DIGIT_INVALID'
  | 'CPF_INVALID';

export interface BankAccountValidationInput {
  bankCode: string;
  agency: string;
  agencyDigit?: string | null;
  accountNumber: string;
  accountDigit: string;
  holderCpf: string;
}

export interface BankAccountValidationResult {
  valid: boolean;
  validationErrorCode: BankAccountErrorCode | null;
}

interface BankRule {
  bankCode: string;
  agencyLength: number;
  accountLength: number;
  agencyDigit?: boolean;
  accountWeights: number[];
  modulus: 10 | 11;
}

const BANK_RULES: Record<string, BankRule> = {
  '001': {
    bankCode: '001',
    agencyLength: 4,
    accountLength: 8,
    agencyDigit: true,
    accountWeights: [9, 8, 7, 6, 5, 4, 3, 2],
    modulus: 11,
  },
  '033': {
    bankCode: '033',
    agencyLength: 4,
    accountLength: 8,
    accountWeights: [9, 7, 3, 1, 9, 7, 3, 1],
    modulus: 10,
  },
  '041': {
    bankCode: '041',
    agencyLength: 4,
    accountLength: 9,
    accountWeights: [3, 2, 9, 8, 7, 6, 5, 4, 3],
    modulus: 11,
  },
  '104': {
    bankCode: '104',
    agencyLength: 4,
    accountLength: 11,
    accountWeights: [8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6],
    modulus: 11,
  },
  '237': {
    bankCode: '237',
    agencyLength: 4,
    accountLength: 7,
    agencyDigit: true,
    accountWeights: [2, 7, 6, 5, 4, 3, 2],
    modulus: 11,
  },
  '341': {
    bankCode: '341',
    agencyLength: 4,
    accountLength: 5,
    accountWeights: [2, 1, 2, 1, 2],
    modulus: 10,
  },
  '748': {
    bankCode: '748',
    agencyLength: 4,
    accountLength: 6,
    accountWeights: [9, 8, 7, 6, 5, 4],
    modulus: 11,
  },
  '756': {
    bankCode: '756',
    agencyLength: 4,
    accountLength: 8,
    accountWeights: [9, 8, 7, 6, 5, 4, 3, 2],
    modulus: 11,
  },
};

@Injectable()
export class BankAccountValidatorService {
  validate(input: BankAccountValidationInput): BankAccountValidationResult {
    const bankCode = this.onlyDigits(input.bankCode).padStart(3, '0');
    const rule = BANK_RULES[bankCode];
    if (!rule) return this.reject('BANK_NOT_SUPPORTED');

    const agency = this.onlyDigits(input.agency);
    if (agency.length !== rule.agencyLength) {
      return this.reject('AGENCY_LENGTH_INVALID');
    }

    if (rule.agencyDigit) {
      const expected = this.calculateMod11Digit(agency, [5, 4, 3, 2]);
      if (this.normalizeDigit(input.agencyDigit) !== expected) {
        return this.reject('AGENCY_DIGIT_INVALID');
      }
    }

    const accountNumber = this.onlyDigits(input.accountNumber);
    if (accountNumber.length !== rule.accountLength) {
      return this.reject('ACCOUNT_LENGTH_INVALID');
    }

    const expectedAccountDigit =
      rule.modulus === 10
        ? this.calculateMod10Digit(accountNumber, rule.accountWeights)
        : this.calculateMod11Digit(accountNumber, rule.accountWeights);
    if (this.normalizeDigit(input.accountDigit) !== expectedAccountDigit) {
      return this.reject('ACCOUNT_DIGIT_INVALID');
    }

    if (!this.isValidCpf(input.holderCpf)) return this.reject('CPF_INVALID');

    return { valid: true, validationErrorCode: null };
  }

  supportedBanks(): string[] {
    return Object.keys(BANK_RULES).sort();
  }

  private reject(
    validationErrorCode: BankAccountErrorCode,
  ): BankAccountValidationResult {
    return { valid: false, validationErrorCode };
  }

  private calculateMod11Digit(value: string, weights: number[]): string {
    const sum = value
      .split('')
      .reduce((acc, digit, index) => acc + Number(digit) * weights[index]!, 0);
    const remainder = sum % 11;
    const digit = 11 - remainder;
    return digit === 10 ? 'X' : digit === 11 ? '0' : String(digit);
  }

  private calculateMod10Digit(value: string, weights: number[]): string {
    const sum = value.split('').reduce((acc, digit, index) => {
      const product = Number(digit) * weights[index]!;
      return acc + Math.floor(product / 10) + (product % 10);
    }, 0);
    return String((10 - (sum % 10)) % 10);
  }

  private isValidCpf(value: string): boolean {
    const cpf = this.onlyDigits(value);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    const check = (length: number): number => {
      const sum = cpf
        .slice(0, length)
        .split('')
        .reduce(
          (acc, digit, index) => acc + Number(digit) * (length + 1 - index),
          0,
        );
      const result = 11 - (sum % 11);
      return result >= 10 ? 0 : result;
    };
    return check(9) === Number(cpf[9]) && check(10) === Number(cpf[10]);
  }

  private normalizeDigit(value?: string | null): string {
    return String(value ?? '')
      .trim()
      .toUpperCase();
  }

  private onlyDigits(value: string): string {
    return String(value ?? '').replace(/\D/g, '');
  }
}
