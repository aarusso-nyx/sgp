import { UnprocessableEntityException } from '@nestjs/common';

import { MarginCalculatorService } from './margin-calculator.service';

describe('MarginCalculatorService', () => {
  const service = new MarginCalculatorService({
    configured: false,
  } as never);

  it('separates general, credit-card, and benefit-card margin under Lei 14.509/2022 defaults', () => {
    const margin = service.calculate({
      employeeId: 'employee-1',
      competence: '2026-05',
      netBase: '5000.00',
      usedGeneral: '500.00',
      usedCreditCard: '50.00',
      usedBenefitCard: '100.00',
    });

    expect(margin.availableGeneral).toBe('1250.00');
    expect(margin.availableCreditCard).toBe('200.00');
    expect(margin.availableBenefitCard).toBe('150.00');
    expect(margin.usedGeneral).toBe('500.00');
    expect(margin.usedCreditCard).toBe('50.00');
    expect(margin.usedBenefitCard).toBe('100.00');
    expect(
      Number(margin.availableGeneral) +
        Number(margin.availableCreditCard) +
        Number(margin.availableBenefitCard) +
        Number(margin.usedGeneral) +
        Number(margin.usedCreditCard) +
        Number(margin.usedBenefitCard),
    ).toBeLessThanOrEqual(Number(margin.netBase) * 0.45);
  });

  it('supports local overrides for the three legal percentage buckets', () => {
    const margin = service.calculate({
      employeeId: 'employee-1',
      competence: '2026-05',
      netBase: '4000.00',
      generalPercent: '0.30',
      creditCardPercent: '0.04',
      benefitCardPercent: '0.03',
      usedGeneral: '1000.00',
      usedCreditCard: '100.00',
      usedBenefitCard: '20.00',
    });

    expect(margin.availableGeneral).toBe('200.00');
    expect(margin.availableCreditCard).toBe('60.00');
    expect(margin.availableBenefitCard).toBe('100.00');
    expect(margin.generalPercent).toBe('0.300000');
    expect(margin.creditCardPercent).toBe('0.040000');
    expect(margin.benefitCardPercent).toBe('0.030000');
  });

  it('keeps three valid active consignments within the 45 percent net-base cap', () => {
    const margin = service.calculate({
      employeeId: 'employee-1',
      competence: '2026-05',
      netBase: '1000.00',
      usedGeneral: '300.00',
      usedCreditCard: '30.00',
      usedBenefitCard: '20.00',
    });

    expect(margin.availableGeneral).toBe('50.00');
    expect(margin.availableCreditCard).toBe('20.00');
    expect(margin.availableBenefitCard).toBe('30.00');
    expect(() =>
      service.assertAmountFits(margin, 'PAYROLL_LOAN', '50.00'),
    ).not.toThrow();
    expect(() =>
      service.assertAmountFits(margin, 'CARD', '20.00'),
    ).not.toThrow();
    expect(() =>
      service.assertAmountFits(margin, 'OTHER', '30.00'),
    ).not.toThrow();

    const totalUsedAndAvailable =
      Number(margin.usedGeneral) +
      Number(margin.usedCreditCard) +
      Number(margin.usedBenefitCard) +
      Number(margin.availableGeneral) +
      Number(margin.availableCreditCard) +
      Number(margin.availableBenefitCard);
    expect(totalUsedAndAvailable).toBeLessThanOrEqual(450);
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
    expect(() => service.assertAmountFits(margin, 'OTHER', '51.00')).toThrow(
      UnprocessableEntityException,
    );
  });
});
