import fc from 'fast-check';

import { roundMoney, toMoney } from './money';

describe('money decimal policy properties', () => {
  it('roundMoney(a + b - b) equals roundMoney(a) at scale 2', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000_000, max: 1_000_000_000 }),
        fc.integer({ min: -1_000_000_000, max: 1_000_000_000 }),
        (aCents, bCents) => {
          const a = toMoney(aCents).div(100);
          const b = toMoney(bCents).div(100);

          expect(roundMoney(a.plus(b).minus(b)).toFixed(2)).toBe(
            roundMoney(a).toFixed(2),
          );
        },
      ),
    );
  });
});
