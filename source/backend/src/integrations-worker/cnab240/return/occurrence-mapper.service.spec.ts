import { UnprocessableEntityException } from '@nestjs/common';

import { OccurrenceMapperService } from './occurrence-mapper.service';

describe('OccurrenceMapperService', () => {
  const mapper = new OccurrenceMapperService();

  it.each([
    ['001', '00', 'ACCEPTED'],
    ['104', '03', 'REJECTED_INVALID_ACCOUNT'],
    ['237', 'BI', 'REJECTED_INSUFFICIENT_FUNDS'],
    ['341', 'RJ', 'RETURNED_OTHER'],
  ])('maps bank %s code %s to %s', (bankCode, code, expected) => {
    expect(mapper.map(bankCode, code).internalStatus).toBe(expected);
  });

  it('rejects unknown bank occurrence codes', () => {
    expect(() => mapper.map('001', 'ZZ')).toThrow(UnprocessableEntityException);
  });
});
