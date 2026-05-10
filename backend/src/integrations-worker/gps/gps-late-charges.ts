import Decimal from 'decimal.js';

export interface GpsLateChargesInput {
  competence: string;
  amount: string;
  paidAt?: Date | undefined;
}

export interface GpsLateCharges {
  interestAmount: string;
  fineAmount: string;
  totalAmount: string;
}

export function calculateGpsLateCharges(
  input: GpsLateChargesInput,
): GpsLateCharges {
  const amount = new Decimal(input.amount);
  const dueDate = gpsDueDate(input.competence);
  const paidAt = input.paidAt ?? new Date();
  const daysLate = daysBetween(dueDate, paidAt);
  if (daysLate <= 0) {
    return {
      interestAmount: '0.00',
      fineAmount: '0.00',
      totalAmount: amount.toFixed(2),
    };
  }

  const interestRate = new Decimal(daysLate).times('0.000333');
  const fineRate = Decimal.min(
    new Decimal(daysLate).times('0.0033'),
    new Decimal('0.20'),
  );
  const interestAmount = amount.times(interestRate).toDecimalPlaces(2);
  const fineAmount = amount.times(fineRate).toDecimalPlaces(2);

  return {
    interestAmount: interestAmount.toFixed(2),
    fineAmount: fineAmount.toFixed(2),
    totalAmount: amount
      .plus(interestAmount)
      .plus(fineAmount)
      .toDecimalPlaces(2)
      .toFixed(2),
  };
}

function gpsDueDate(competence: string): Date {
  const [year = 0, month = 1] = competence.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(year, month, 20));
}

function daysBetween(left: Date, right: Date): number {
  const msPerDay = 86_400_000;
  const start = Date.UTC(
    left.getUTCFullYear(),
    left.getUTCMonth(),
    left.getUTCDate(),
  );
  const end = Date.UTC(
    right.getUTCFullYear(),
    right.getUTCMonth(),
    right.getUTCDate(),
  );
  return Math.max(0, Math.floor((end - start) / msPerDay));
}
