import Decimal from 'decimal.js';
import fc from 'fast-check';

import { roundMoney } from '../common/money/money';

type Bracket = {
  min: string;
  max: string | null;
  rate: string;
  deduction?: string | undefined;
};

const irrfBrackets: Bracket[] = [
  { min: '0.00', max: '2259.20', rate: '0.000000', deduction: '0.00' },
  { min: '2259.21', max: '2826.65', rate: '7.500000', deduction: '169.44' },
  { min: '2826.66', max: '3751.05', rate: '15.000000', deduction: '381.44' },
  { min: '3751.06', max: '4664.68', rate: '22.500000', deduction: '662.77' },
  { min: '4664.69', max: null, rate: '27.500000', deduction: '896.00' },
];

const rppsBrackets: Bracket[] = [
  { min: '0.00', max: '1518.00', rate: '7.500000' },
  { min: '1518.01', max: '2793.88', rate: '9.000000' },
  { min: '2793.89', max: '4190.83', rate: '12.000000' },
  { min: '4190.84', max: '8157.41', rate: '14.000000' },
  { min: '8157.42', max: null, rate: '14.500000' },
];

describe('payroll calculation properties', () => {
  it('folha mensal net total is linear over independent employee lines', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2_000_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 1, max: 12 }),
        (earningCents, deductionCents, employees) => {
          fc.pre(earningCents >= deductionCents);

          const singleNet = netAmount(earningCents, deductionCents);
          const aggregateNet = netAmount(
            earningCents * employees,
            deductionCents * employees,
          );

          expect(aggregateNet.toFixed(2)).toBe(
            singleNet.times(employees).toFixed(2),
          );
        },
      ),
    );
  });

  it('INSS linear contribution is proportional for celetista salaries', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 80_000 }),
        fc.integer({ min: 1, max: 4 }),
        (salaryReais, multiplier) => {
          const salary = new Decimal(salaryReais);
          const contribution = inssLinear(salary);
          const scaled = inssLinear(salary.times(multiplier));

          expect(scaled.toFixed(2)).toBe(
            contribution.times(multiplier).toFixed(2),
          );
        },
      ),
    );
  });

  it('IRRF progressive contribution is monotonic for a fixed dependent count', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 12_000_00 }),
        fc.integer({ min: 0, max: 12_000_00 }),
        fc.integer({ min: 0, max: 4 }),
        (leftCents, rightCents, dependents) => {
          const lower = moneyFromCents(Math.min(leftCents, rightCents));
          const higher = moneyFromCents(Math.max(leftCents, rightCents));

          expect(
            irrfProgressive(higher, dependents).greaterThanOrEqualTo(
              irrfProgressive(lower, dependents),
            ),
          ).toBe(true);
        },
      ),
    );
  });

  it('IRRF bracket boundaries do not create negative withholding', () => {
    fc.assert(
      fc.property(fc.constantFrom(...irrfBrackets), (bracket) => {
        const values = [
          new Decimal(bracket.min),
          bracket.max ? new Decimal(bracket.max) : new Decimal('9000.00'),
        ];

        for (const value of values) {
          expect(irrfProgressive(value, 0).greaterThanOrEqualTo(0)).toBe(true);
        }
      }),
    );
  });

  it('RPPS progressive contribution is monotonic until the ceiling and capped after it', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 12_000_00 }),
        fc.integer({ min: 0, max: 12_000_00 }),
        (leftCents, rightCents) => {
          const ceiling = new Decimal('8157.41');
          const lower = moneyFromCents(Math.min(leftCents, rightCents));
          const higher = moneyFromCents(Math.max(leftCents, rightCents));

          expect(
            rppsProgressive(higher, ceiling).greaterThanOrEqualTo(
              rppsProgressive(lower, ceiling),
            ),
          ).toBe(true);
          expect(rppsProgressive(ceiling.plus(1000), ceiling).toFixed(2)).toBe(
            rppsProgressive(ceiling, ceiling).toFixed(2),
          );
        },
      ),
    );
  });

  it('ATS grows monotonically by completed service year and is zero at admission', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 40 }),
        fc.integer({ min: 0, max: 40 }),
        fc.integer({ min: 100_00, max: 50_000_00 }),
        (leftYears, rightYears, salaryCents) => {
          const salary = moneyFromCents(salaryCents);
          const lowerYears = Math.min(leftYears, rightYears);
          const higherYears = Math.max(leftYears, rightYears);

          expect(ats(salary, higherYears).gte(ats(salary, lowerYears))).toBe(
            true,
          );
          expect(ats(salary, 0).toFixed(2)).toBe('0.00');
        },
      ),
    );
  });
});

function netAmount(earningCents: number, deductionCents: number): Decimal {
  return roundMoney(moneyFromCents(earningCents - deductionCents));
}

function moneyFromCents(cents: number): Decimal {
  return new Decimal(cents).div(100);
}

function inssLinear(base: Decimal): Decimal {
  return roundMoney(base.times('0.11'));
}

function irrfProgressive(base: Decimal, dependents: number): Decimal {
  const dependentDeduction = new Decimal('189.59').times(dependents);
  const taxableBase = Decimal.max(base.minus(dependentDeduction), 0);
  const bracket = irrfBrackets.find(
    (candidate) =>
      taxableBase.gte(candidate.min) &&
      (candidate.max === null || taxableBase.lte(candidate.max)),
  );
  if (!bracket) return new Decimal(0);
  return Decimal.max(
    taxableBase
      .times(bracket.rate)
      .div(100)
      .minus(bracket.deduction ?? '0'),
    0,
  ).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

function rppsProgressive(base: Decimal, ceiling: Decimal): Decimal {
  const effectiveBase = Decimal.min(base, ceiling);
  return rppsBrackets
    .reduce((total, bracket) => {
      if (effectiveBase.lt(bracket.min)) return total;
      const upper = bracket.max
        ? Decimal.min(effectiveBase, new Decimal(bracket.max))
        : effectiveBase;
      const slice = new Decimal(bracket.min).eq(0)
        ? upper
        : Decimal.max(upper.minus(bracket.min).plus('0.01'), 0);
      return total.plus(slice.times(bracket.rate).div(100));
    }, new Decimal(0))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

function ats(base: Decimal, completedYears: number): Decimal {
  return roundMoney(base.times(completedYears).times('0.015'));
}
