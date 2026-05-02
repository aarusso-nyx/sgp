import { Injectable, UnprocessableEntityException } from '@nestjs/common';

export type Cnab240ReturnInternalStatus =
  | 'ACCEPTED'
  | 'REJECTED_INVALID_ACCOUNT'
  | 'REJECTED_INSUFFICIENT_FUNDS'
  | 'RETURNED_OTHER';

export interface OccurrenceMapping {
  internalStatus: Cnab240ReturnInternalStatus;
  message: string;
}

const DEFAULT_CODES: Record<string, OccurrenceMapping> = {
  '00': {
    internalStatus: 'ACCEPTED',
    message: 'Credito confirmado pelo banco.',
  },
  BD: {
    internalStatus: 'REJECTED_INVALID_ACCOUNT',
    message: 'Conta do favorecido invalida.',
  },
  BE: {
    internalStatus: 'REJECTED_INVALID_ACCOUNT',
    message: 'Agencia ou conta inexistente.',
  },
  BI: {
    internalStatus: 'REJECTED_INSUFFICIENT_FUNDS',
    message: 'Saldo insuficiente para efetivar o pagamento.',
  },
  RJ: {
    internalStatus: 'RETURNED_OTHER',
    message: 'Pagamento devolvido ou rejeitado por ocorrencia bancaria.',
  },
};

const BANK_CODES: Record<string, Record<string, OccurrenceMapping>> = {
  '001': {
    ...DEFAULT_CODES,
    AA: {
      internalStatus: 'ACCEPTED',
      message: 'Arquivo aceito pelo Banco do Brasil.',
    },
  },
  '033': DEFAULT_CODES,
  '104': {
    ...DEFAULT_CODES,
    '01': {
      internalStatus: 'ACCEPTED',
      message: 'Credito confirmado pela Caixa.',
    },
    '03': {
      internalStatus: 'REJECTED_INVALID_ACCOUNT',
      message: 'Conta invalida na Caixa.',
    },
  },
  '237': DEFAULT_CODES,
  '341': DEFAULT_CODES,
};

@Injectable()
export class OccurrenceMapperService {
  map(bankCode: string | number, occurrenceCode: string): OccurrenceMapping {
    const normalizedBank = String(bankCode).padStart(3, '0');
    const normalizedCode = occurrenceCode.trim().toUpperCase();
    const mapping = BANK_CODES[normalizedBank]?.[normalizedCode];
    if (!mapping) {
      throw new UnprocessableEntityException(
        `Unsupported CNAB return occurrence ${normalizedCode} for bank ${normalizedBank}`,
      );
    }
    return mapping;
  }
}
