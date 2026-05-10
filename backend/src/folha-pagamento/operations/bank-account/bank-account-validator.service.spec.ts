import { BankAccountValidatorService } from './bank-account-validator.service';

describe('BankAccountValidatorService', () => {
  const service = new BankAccountValidatorService();

  it.each([
    ['001', '0000', '0', '00000000', '0'],
    ['033', '0000', undefined, '00000000', '0'],
    ['041', '0000', undefined, '000000000', '0'],
    ['104', '0000', undefined, '00000000000', '0'],
    ['237', '0000', '0', '0000000', '0'],
    ['341', '0000', undefined, '00000', '0'],
    ['748', '0000', undefined, '000000', '0'],
    ['756', '0000', undefined, '00000000', '0'],
  ])(
    'accepts a golden valid account for bank %s',
    (bankCode, agency, agencyDigit, accountNumber, accountDigit) => {
      expect(
        service.validate({
          bankCode,
          agency,
          agencyDigit,
          accountNumber,
          accountDigit,
          holderCpf: '529.982.247-25',
        }),
      ).toEqual({ valid: true, validationErrorCode: null });
    },
  );

  it('rejects an invalid account verifier digit with a mapped code', () => {
    expect(
      service.validate({
        bankCode: '001',
        agency: '0000',
        agencyDigit: '0',
        accountNumber: '00000000',
        accountDigit: '9',
        holderCpf: '52998224725',
      }),
    ).toEqual({ valid: false, validationErrorCode: 'ACCOUNT_DIGIT_INVALID' });
  });

  it('normalizes bank code, agency digit, and holder CPF formatting', () => {
    expect(
      service.validate({
        bankCode: '1',
        agency: ' 0000 ',
        agencyDigit: ' 0 ',
        accountNumber: '0000-0000',
        accountDigit: '0',
        holderCpf: '529.982.247-25',
      }),
    ).toEqual({ valid: true, validationErrorCode: null });
  });

  it.each([
    [
      'unsupported bank',
      {
        bankCode: '999',
        agency: '0000',
        accountNumber: '00000000',
        accountDigit: '0',
        holderCpf: '52998224725',
      },
      'BANK_NOT_SUPPORTED',
    ],
    [
      'invalid agency length',
      {
        bankCode: '001',
        agency: '000',
        agencyDigit: '0',
        accountNumber: '00000000',
        accountDigit: '0',
        holderCpf: '52998224725',
      },
      'AGENCY_LENGTH_INVALID',
    ],
    [
      'invalid agency digit',
      {
        bankCode: '001',
        agency: '0000',
        agencyDigit: '9',
        accountNumber: '00000000',
        accountDigit: '0',
        holderCpf: '52998224725',
      },
      'AGENCY_DIGIT_INVALID',
    ],
    [
      'invalid account length',
      {
        bankCode: '104',
        agency: '0000',
        accountNumber: '0000000000',
        accountDigit: '0',
        holderCpf: '52998224725',
      },
      'ACCOUNT_LENGTH_INVALID',
    ],
  ] as const)('rejects %s with a mapped code', (_case, input, code) => {
    expect(service.validate(input)).toEqual({
      valid: false,
      validationErrorCode: code,
    });
  });

  it('rejects an invalid CPF with a mapped code', () => {
    expect(
      service.validate({
        bankCode: '104',
        agency: '0000',
        accountNumber: '00000000000',
        accountDigit: '0',
        holderCpf: '11111111111',
      }),
    ).toEqual({ valid: false, validationErrorCode: 'CPF_INVALID' });
  });

  it.each(['123', '52998224724'])(
    'rejects malformed CPF %s with a mapped code',
    (holderCpf) => {
      expect(
        service.validate({
          bankCode: '104',
          agency: '0000',
          accountNumber: '00000000000',
          accountDigit: '0',
          holderCpf,
        }),
      ).toEqual({ valid: false, validationErrorCode: 'CPF_INVALID' });
    },
  );

  it('lists supported banks in deterministic order', () => {
    expect(service.supportedBanks()).toEqual([
      '001',
      '033',
      '041',
      '104',
      '237',
      '341',
      '748',
      '756',
    ]);
  });
});
