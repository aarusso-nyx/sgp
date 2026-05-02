import Decimal from 'decimal.js';

export type MoneyInput = Decimal.Value;
export type MoneyRoundingMode = 'half_up' | 'half_even';

Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -20,
  toExpPos: 40,
});

export function toMoney(value: MoneyInput): Decimal {
  return new Decimal(value ?? 0);
}

const ROUNDING_MODE: Record<MoneyRoundingMode, Decimal.Rounding> = {
  half_up: Decimal.ROUND_HALF_UP,
  half_even: Decimal.ROUND_HALF_EVEN,
};

export function roundMoney(
  value: MoneyInput,
  mode: MoneyRoundingMode = 'half_up',
): Decimal {
  return toMoney(value).toDecimalPlaces(2, ROUNDING_MODE[mode]);
}

export function roundRate(value: MoneyInput): Decimal {
  return toMoney(value).toDecimalPlaces(6, Decimal.ROUND_HALF_UP);
}
