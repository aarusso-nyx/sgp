import { roundMoney, roundRate, toMoney } from './money';

describe('money decimal policy', () => {
  it.each([
    ['positive half cent rounds away from zero', '10.005', '10.01'],
    ['negative half cent rounds away from zero', '-10.005', '-10.01'],
    ['below half cent rounds down by magnitude', '10.004', '10.00'],
    ['above half cent rounds up by magnitude', '10.006', '10.01'],
    ['composition keeps full precision until boundary', '0.1', '0.30'],
  ])('%s', (_caseName, input, expected) => {
    const value = input === '0.1' ? toMoney(input).plus('0.2') : toMoney(input);

    expect(roundMoney(value).toFixed(2)).toBe(expected);
  });

  it('rounds rates at six decimal places', () => {
    expect(roundRate('0.1234565').toFixed(6)).toBe('0.123457');
  });
});
