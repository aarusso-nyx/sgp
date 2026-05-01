import { roundMoney, roundRate, toMoney } from './money';

describe('money decimal policy', () => {
  it.each([
    ['positive half-up cent', '10.005', 'half_up', '10.01'],
    ['negative half-up cent', '-10.005', 'half_up', '-10.01'],
    ['bankers tie to even cent', '10.005', 'half_even', '10.00'],
    ['zero stays at scale', '0', 'half_up', '0.00'],
    [
      'large value rounds at cents',
      '1000000000.005',
      'half_up',
      '1000000000.01',
    ],
  ] as const)('%s', (_caseName, input, mode, expected) => {
    expect(roundMoney(input, mode).toFixed(2)).toBe(expected);
  });

  it('keeps composition at full precision until the boundary', () => {
    const value = toMoney('0.1').plus('0.2');

    expect(roundMoney(value).toFixed(2)).toBe('0.30');
  });

  it('rounds rates at six decimal places', () => {
    expect(roundRate('0.1234565').toFixed(6)).toBe('0.123457');
  });
});
