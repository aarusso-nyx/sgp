import { BadRequestException } from '@nestjs/common';

import { TaxRateService } from './tax-rate.service';

describe('TaxRateService', () => {
  const service = new TaxRateService({ configured: false } as never);

  it('accepts continuous five-bracket IRRF tables', () => {
    expect(() =>
      service.validateContinuity([
        bracket('1', '0.00', '2259.20'),
        bracket('2', '2259.21', '2826.65'),
        bracket('3', '2826.66', '3751.05'),
        bracket('4', '3751.06', '4664.68'),
        bracket('5', '4664.69', null),
      ]),
    ).not.toThrow();
  });

  it('rejects gaps between IRRF brackets', () => {
    expect(() =>
      service.validateContinuity([
        bracket('1', '0.00', '2259.20'),
        bracket('2', '2259.22', '2826.65'),
        bracket('3', '2826.66', '3751.05'),
        bracket('4', '3751.06', '4664.68'),
        bracket('5', '4664.69', null),
      ]),
    ).toThrow(BadRequestException);
  });
});

function bracket(code: string, min: string, max: string | null) {
  return {
    code,
    bracketMin: min,
    bracketMax: max,
    rate: '0.000000',
    deductionAmount: '0.00',
    dependentDeduction: '189.59',
  };
}
