import Decimal from 'decimal.js';

export type MoneyInput = Decimal.Value;

Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -20,
  toExpPos: 40,
});

export function toMoney(value: MoneyInput): Decimal {
  return new Decimal(value ?? 0);
}

export function roundMoney(value: MoneyInput): Decimal {
  return toMoney(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function roundRate(value: MoneyInput): Decimal {
  return toMoney(value).toDecimalPlaces(6, Decimal.ROUND_HALF_UP);
}
