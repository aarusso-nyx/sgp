export const BANKING_RELAY_KIND = 'banking' as const;

export const BANKING_RELAY_BANKS = {
  '001': 'bb',
  '033': 'santander',
  '104': 'caixa',
  '237': 'bradesco',
  '341': 'itau',
} as const;

export type BankingRelayBankCode = keyof typeof BANKING_RELAY_BANKS;

export type BankingRelayFormat = 'CNAB240';

export type BankingRelayRemittanceDetail = Readonly<{
  sequence: number;
  employeeId: string;
  amount: string;
  bankCode: number;
  branch: string;
  account: string;
  purposeCode: string | null;
  alimonyId: string | null;
}>;

export type BankingRelayRequestPayload = Readonly<{
  format: BankingRelayFormat;
  remittanceFileId: string;
  remittanceFileName: string;
  remittanceFileHash: string;
  bankCode: BankingRelayBankCode;
  contentBase64: string;
  details: readonly BankingRelayRemittanceDetail[];
}>;

export type BankingRelayResponsePayload = Readonly<{
  format: BankingRelayFormat;
  bankCode: BankingRelayBankCode;
  remittanceFileId: string;
  remittanceFileName: string;
  remittanceFileHash: string;
  returnFileName: string;
  returnFileHash: string;
  retornoContentBase64: string;
  recordCount: number;
  handledBy: 'banking-relay-mock';
}>;

export function normalizeBankingRelayBankCode(
  value: string | number,
): BankingRelayBankCode {
  const normalized = String(value ?? '')
    .replace(/\D/g, '')
    .padStart(3, '0');
  if (Object.prototype.hasOwnProperty.call(BANKING_RELAY_BANKS, normalized)) {
    return normalized as BankingRelayBankCode;
  }
  throw new Error(`Unsupported mock banking relay bank code: ${normalized}`);
}
