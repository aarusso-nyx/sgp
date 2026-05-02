import Decimal from 'decimal.js';

describe('RPPS progressive calculation reference', () => {
  const brackets = [
    ['0.00', '1518.00', '7.500000'],
    ['1518.01', '2793.88', '9.000000'],
    ['2793.89', '4190.83', '12.000000'],
    ['4190.84', '8157.41', '14.000000'],
    ['8157.42', null, '14.500000'],
  ] as const;

  it('matches the statutory low-bracket golden amount', () => {
    expect(computeProgressive('2000.00', '8157.41').toFixed(2)).toBe('157.23');
  });

  it('applies the RPPS ceiling before progressive brackets', () => {
    expect(computeProgressive('10000.00', '8157.41').toFixed(2)).toBe('951.63');
  });

  function computeProgressive(base: string, ceiling: string): Decimal {
    const effectiveBase = Decimal.min(new Decimal(base), new Decimal(ceiling));
    return brackets
      .filter(([min]) => new Decimal(min).lessThanOrEqualTo(effectiveBase))
      .reduce((total, [min, max, rate]) => {
        const upper = max
          ? Decimal.min(effectiveBase, new Decimal(max))
          : effectiveBase;
        const slice = new Decimal(min).equals(0)
          ? upper
          : Decimal.max(upper.minus(min).plus('0.01'), 0);
        return total.plus(slice.times(rate).div(100));
      }, new Decimal(0));
  }
});
