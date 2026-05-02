import { BadRequestException } from '@nestjs/common';

import { HourBankAccrualService } from './hour-bank-accrual.service';

describe('HourBankAccrualService', () => {
  const service = new HourBankAccrualService({ configured: true } as never);

  it('calculates positive and negative daily deltas', () => {
    expect(service.dailyDelta(600, 480)).toBe(120);
    expect(service.movementKind(120)).toBe('ACCRUAL_POSITIVE');
    expect(service.dailyDelta(360, 480)).toBe(-120);
    expect(service.movementKind(-120)).toBe('ACCRUAL_NEGATIVE');
  });

  it('rejects zero-minute accrual movement kind', () => {
    expect(() => service.movementKind(0)).toThrow(BadRequestException);
  });
});
