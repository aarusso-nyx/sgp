import { UnprocessableEntityException } from '@nestjs/common';

import { OccurrenceMapperService } from './occurrence-mapper.service';

interface ExpectedOccurrenceMapping {
  bankCode: string;
  code: string;
  internalStatus:
    | 'ACCEPTED'
    | 'REJECTED_INVALID_ACCOUNT'
    | 'REJECTED_INSUFFICIENT_FUNDS'
    | 'RETURNED_OTHER';
  message: string;
}

const COMMON_CODES: ExpectedOccurrenceMapping[] = [
  {
    bankCode: '',
    code: '00',
    internalStatus: 'ACCEPTED',
    message: 'Credito confirmado pelo banco.',
  },
  {
    bankCode: '',
    code: 'BD',
    internalStatus: 'REJECTED_INVALID_ACCOUNT',
    message: 'Conta do favorecido invalida.',
  },
  {
    bankCode: '',
    code: 'BE',
    internalStatus: 'REJECTED_INVALID_ACCOUNT',
    message: 'Agencia ou conta inexistente.',
  },
  {
    bankCode: '',
    code: 'BI',
    internalStatus: 'REJECTED_INSUFFICIENT_FUNDS',
    message: 'Saldo insuficiente para efetivar o pagamento.',
  },
  {
    bankCode: '',
    code: 'RJ',
    internalStatus: 'RETURNED_OTHER',
    message: 'Pagamento devolvido ou rejeitado por ocorrencia bancaria.',
  },
];

const EXPECTED_MAPPINGS: ExpectedOccurrenceMapping[] = [
  ...withBank('001', COMMON_CODES),
  {
    bankCode: '001',
    code: 'AA',
    internalStatus: 'ACCEPTED',
    message: 'Arquivo aceito pelo Banco do Brasil.',
  },
  ...withBank('033', COMMON_CODES),
  ...withBank('104', COMMON_CODES),
  {
    bankCode: '104',
    code: '01',
    internalStatus: 'ACCEPTED',
    message: 'Credito confirmado pela Caixa.',
  },
  {
    bankCode: '104',
    code: '03',
    internalStatus: 'REJECTED_INVALID_ACCOUNT',
    message: 'Conta invalida na Caixa.',
  },
  ...withBank('237', COMMON_CODES),
  ...withBank('341', COMMON_CODES),
].sort((left, right) =>
  `${left.bankCode}:${left.code}`.localeCompare(
    `${right.bankCode}:${right.code}`,
  ),
);

describe('OccurrenceMapperService', () => {
  const mapper = new OccurrenceMapperService();

  it.each(EXPECTED_MAPPINGS)(
    'maps bank $bankCode code $code to $internalStatus',
    ({ bankCode, code, internalStatus, message }) => {
      expect(mapper.map(bankCode, code)).toEqual({
        internalStatus,
        message,
      });
    },
  );

  it('rejects unknown bank occurrence codes', () => {
    expect(() => mapper.map('001', 'ZZ')).toThrow(UnprocessableEntityException);
  });
});

function withBank(
  bankCode: string,
  mappings: ExpectedOccurrenceMapping[],
): ExpectedOccurrenceMapping[] {
  return mappings.map((mapping) => ({ ...mapping, bankCode }));
}
