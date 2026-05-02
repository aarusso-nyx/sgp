import { Test } from '@nestjs/testing';

import { BankAccountService } from '../src/folha-pagamento/operations/bank-account/bank-account.service';
import { BankAccountValidatorService } from '../src/folha-pagamento/operations/bank-account/bank-account-validator.service';

describe('BANK-03 bank account create flow', () => {
  it('maps invalid verifier digits to the 422 validation code used by the API', () => {
    const validator = new BankAccountValidatorService();
    expect(
      validator.validate({
        bankCode: '001',
        agency: '0000',
        agencyDigit: '0',
        accountNumber: '00000000',
        accountDigit: '9',
        holderCpf: '52998224725',
      }),
    ).toEqual({ valid: false, validationErrorCode: 'ACCOUNT_DIGIT_INVALID' });
  });

  it('wires the validator and service into the Nest testing module', async () => {
    const module = await Test.createTestingModule({
      providers: [
        BankAccountValidatorService,
        {
          provide: BankAccountService,
          useFactory: (validator: BankAccountValidatorService) =>
            new BankAccountService({ configured: true } as never, validator),
          inject: [BankAccountValidatorService],
        },
      ],
    }).compile();
    expect(module.get(BankAccountService)).toBeDefined();
  });
});
