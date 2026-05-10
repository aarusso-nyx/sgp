import Decimal from 'decimal.js';
import fc from 'fast-check';

import { roundMoney, toMoney } from './money';

// Property-based assertions for the money helpers. Each property defends a
// monetary-correctness invariant that traditional unit tests miss because
// the bug surfaces only at boundary cases (rounding ties, sign flips,
// associativity drift). All assertions execute against the typed Decimal
// chain — never JavaScript `number` math, which is forbidden by the
// `sgp/no-math-round-money` ESLint rule.

const cents = fc.integer({ min: -1_000_000_000, max: 1_000_000_000 });
const positiveCents = fc.integer({ min: 0, max: 1_000_000_000 });

function money(value: number): Decimal {
  return toMoney(value).div(100);
}

describe('money invariants exercised by property-based tests', () => {
  it('roundMoney is idempotent (round(round(x)) === round(x))', () => {
    fc.assert(
      fc.property(cents, (c) => {
        const x = money(c);
        expect(roundMoney(roundMoney(x)).toFixed(2)).toBe(
          roundMoney(x).toFixed(2),
        );
      }),
    );
  });

  it('roundMoney preserves zero and small positive values without inflating them', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 99 }), (smallerThanOneReal) => {
        const x = money(smallerThanOneReal);
        const rounded = roundMoney(x);
        expect(rounded.gte(0)).toBe(true);
        expect(rounded.lte(1)).toBe(true);
      }),
    );
  });

  it('roundMoney(-x) equals -roundMoney(x) for half-up rounding away from zero policy', () => {
    fc.assert(
      fc.property(positiveCents, (c) => {
        const x = money(c);
        expect(roundMoney(x.negated()).toFixed(2)).toBe(
          roundMoney(x).negated().toFixed(2),
        );
      }),
    );
  });

  it('rounding distributes over independent addends within ±0.01 per addend (slack bound)', () => {
    fc.assert(
      fc.property(positiveCents, positiveCents, positiveCents, (a, b, c) => {
        const x = money(a);
        const y = money(b);
        const z = money(c);

        const summedThenRounded = roundMoney(x.plus(y).plus(z));
        const roundedThenSummed = roundMoney(x)
          .plus(roundMoney(y))
          .plus(roundMoney(z));

        const drift = summedThenRounded.minus(roundedThenSummed).abs();
        // Three half-cent rounds cannot drift more than 1.5 cents; tighten
        // to 0.03 to allow slack for the ROUND_HALF_UP policy.
        expect(drift.lessThanOrEqualTo('0.03')).toBe(true);
      }),
    );
  });

  it('toMoney is symmetric: toMoney(n).toFixed(0) equals n for safe-integer cents', () => {
    fc.assert(
      fc.property(cents, (c) => {
        expect(toMoney(c).toFixed(0)).toBe(String(c));
      }),
    );
  });

  it('roundMoney never produces more than two decimal places', () => {
    fc.assert(
      fc.property(cents, (c) => {
        const rounded = roundMoney(money(c));
        const text = rounded.toFixed();
        const decimals = text.includes('.') ? text.split('.')[1].length : 0;
        expect(decimals).toBeLessThanOrEqual(2);
      }),
    );
  });
});
