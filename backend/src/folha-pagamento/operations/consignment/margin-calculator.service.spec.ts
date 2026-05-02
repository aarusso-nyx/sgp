import { UnprocessableEntityException } from '@nestjs/common';

import { MarginCalculatorService } from './margin-calculator.service';

describe('MarginCalculatorService', () => {
  const service = new MarginCalculatorService({
    configured: false,
  } as never);

  it('separates general and card margin under Lei 14.131/2021 defaults', () => {
    const margin = service.calculate({
      employeeId: 'employee-1',
      competence: '2026-05',
      netBase: '5000.00',
      usedGeneral: '500.00',
      usedCard: '50.00',
    });

    expect(margin.availableGeneral).toBe('1250.00');
    expect(margin.availableCard).toBe('200.00');
    expect(margin.usedGeneral).toBe('500.00');
    expect(margin.usedCard).toBe('50.00');
  });

  it('supports local 30 percent general and 35 percent card policy variants', () => {
    const margin = service.calculate({
      employeeId: 'employee-1',
      competence: '2026-05',
      netBase: '4000.00',
      generalPercent: '0.30',
      cardPercent: '0.35',
      usedGeneral: '1000.00',
      usedCard: '300.00',
    });

    expect(margin.availableGeneral).toBe('200.00');
    expect(margin.availableCard).toBe('1100.00');
  });

  it('rejects loans above the selected margin bucket with a clear message', () => {
    const margin = service.calculate({
      employeeId: 'employee-1',
      competence: '2026-05',
      netBase: '1000.00',
    });

    expect(() =>
      service.assertAmountFits(margin, 'PAYROLL_LOAN', '351.00'),
    ).toThrow(UnprocessableEntityException);
    expect(() =>
      service.assertAmountFits(margin, 'CARD', '50.00'),
    ).not.toThrow();
  });
});
